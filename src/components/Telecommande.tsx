import React from "react";
import { listen } from "@tauri-apps/api/event";
import { useNavigate } from "react-router-dom";
import { api, newId, nowIso, texteErreur, type InfoTelecommande, type ReponseTelecommande } from "../api";
import { allerVers, NAV, SOUS_ONGLETS } from "./CommandPalette";
import { Aide } from "./Aide";
import { toast } from "./Toaster";
import { ouvrirOnglet } from "./ui";
import { demanderMinuteur, EVT_FERMER_AFFICHAGE } from "../demandeMinuteur";
import { preparerSon } from "../pages/SupportsVisuels";
import {
  CLE_SECOURS, MODELE_DE_SECOURS, ceQuIlComprend, comprendre, consigneDuSecours, destinationsDe, dureeEnClair, inviteDeLaVoix,
  lireLeSecours, nomDeLaPage, TROUVAILLES_DE_LA_CLASSE, type Compris, type ContexteTelecommande, type Destination,
} from "../telecommande";

// La télécommande du téléphone, côté fenêtre : ce que dit l'enseignant devient un geste à l'écran — donc au
// tableau, quand le Mac est projeté (voir telecommande.ts pour ce qui est compris, telecommande.rs pour le réseau).

/**
 * Les pages de ⌘K, telles que la voix les nomme. Lues au moment de servir : la palette importe ce module, et une
 * liste faite au chargement lirait la sienne avant qu'elle existe.
 */
const destinations = (): Destination[] => destinationsDe(NAV, SOUS_ONGLETS);

/** Ce que dit le téléphone à « que dire ? » — la liste entière s'ouvre dessous. */
const QUE_DIRE_EN_BREF =
  "Par exemple : « minuteur cinq minutes », « affiche les supports visuels », « plein écran », « ferme », « note pour [prénom] : … ».";

/** Les notes qui attendent le « oui » du téléphone, par question. */
const notesEnAttente = new Map<string, { eleveId: string; prenom: string; texte: string }>();

async function pleinEcran(actif: boolean) {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().setFullscreen(actif);
  } catch { /* hors de l'application */ }
}

/** Le temps qu'on laisse à Mistral : au-delà, la télécommande répond sans lui (le téléphone attend). */
const DELAI_DU_SECOURS = 8000;

/**
 * Mistral, en secours : il lit la phrase que la télécommande n'a pas comprise — le texte seul, le son reste sur ce
 * Mac — et sa réponse ne passe que relue (`lireLeSecours`). Rien s'il n'est pas voulu, pas joignable, ou trop lent.
 */
async function secours(texte: string, ctx: ContexteTelecommande): Promise<Compris | null> {
  if ((await api.settingGet(CLE_SECOURS).catch(() => null)) !== "oui") return null;
  try {
    const reponse = await Promise.race([
      api.mistralChat([{ role: "system", content: consigneDuSecours(ctx.destinations) }, { role: "user", content: texte }], MODELE_DE_SECOURS, true),
      new Promise<never>((_, refuser) => setTimeout(() => refuser(new Error("délai")), DELAI_DU_SECOURS)),
    ]);
    return lireLeSecours(reponse, ctx);
  } catch {
    return null;
  }
}

/** Fait ce que la phrase demande, et dit au téléphone ce qui a été fait. */
async function executer(texte: string, nav: (to: string) => void): Promise<ReponseTelecommande> {
  const eleves = (await api.elevesList().catch(() => [])).map((e) => ({ id: e.id, nom: e.nom }));
  const ctx = { destinations: destinations(), eleves };
  const c = comprendre(texte, ctx);
  const fait = await agir(c, nav);
  // Pas compris, ou rien trouvé : Mistral lit la phrase, si l'enseignant l'a voulu.
  if ((c.genre === "rien" || !fait.ok) && texte.trim()) {
    const lu = await secours(texte, ctx);
    const refait = lu ? await agir(lu, nav) : null;
    if (refait?.ok) return refait.fait ? { ...refait, fait: `${refait.fait} (Mistral)` } : refait;
  }
  return fait;
}

/** Le geste de ce qui a été compris, et ce qu'on en dit au téléphone. */
async function agir(c: Compris, nav: (to: string) => void): Promise<ReponseTelecommande> {
  switch (c.genre) {
    case "minuteur":
      nav("/caa");
      setTimeout(() => ouvrirOnglet("caa", "minuteur"), 140);
      demanderMinuteur(c.secondes);
      return { ok: true, fait: `Minuteur de ${dureeEnClair(c.secondes)} lancé.` };
    case "pleinEcran":
      await pleinEcran(c.actif);
      return { ok: true, fait: c.actif ? "Plein écran." : "Plein écran quitté." };
    case "fermer":
      window.dispatchEvent(new Event(EVT_FERMER_AFFICHAGE));
      await pleinEcran(false);
      return { ok: true, fait: "Fermé." };
    case "aller": {
      const d = c.destination;
      nav(d.to);
      if (d.page && d.onglet) setTimeout(() => ouvrirOnglet(d.page!, d.onglet!), 140);
      return { ok: true, fait: `${nomDeLaPage(d.label)} : affiché.` };
    }
    case "chercher": {
      const trouves = (await api.recherche(c.quoi).catch(() => [])).filter((r) => TROUVAILLES_DE_LA_CLASSE.has(r.kind));
      const r = (c.sorte ? trouves.find((x) => x.kind === c.sorte) : undefined) ?? trouves[0];
      if (!r) return { ok: false, fait: `Rien à montrer pour « ${c.quoi} ».` };
      allerVers(r, nav);
      return { ok: true, fait: `« ${r.titre} » : affiché.` };
    }
    case "note": {
      const id = newId();
      const prenom = c.eleve.nom.split(" ")[0];
      notesEnAttente.set(id, { eleveId: c.eleve.id, prenom, texte: c.texte });
      return { ok: true, aConfirmer: `Noter pour ${prenom} : « ${c.texte} » ?`, id };
    }
    case "aide":
      // La liste entière part avec : le téléphone l'ouvre.
      return { ok: true, fait: QUE_DIRE_EN_BREF, comprend: ceQuIlComprend(destinations()) };
    case "rien":
      return { ok: false, fait: c.pourquoi };
  }
}

/** Le « oui » ou le « non » du téléphone à une note. */
async function decider(id: string, oui: boolean): Promise<ReponseTelecommande> {
  const note = notesEnAttente.get(id);
  notesEnAttente.delete(id);
  if (!note) return { ok: false, fait: "Cette question n'attend plus de réponse." };
  if (!oui) return { ok: true, fait: "Rien n'est noté." };
  await api.commentaireSave({ id: newId(), date: nowIso(), texte: note.texte, type: "divers", eleveId: note.eleveId });
  return { ok: true, fait: `Noté pour ${note.prenom}.` };
}

/** Écoute ce que la télécommande transmet, et répond. Monté une fois dans l'application. */
export function useTelecommande() {
  const navigate = useNavigate();
  const nav = React.useRef(navigate);
  nav.current = navigate;
  React.useEffect(() => {
    const repondre = async (attente: string, faire: () => Promise<ReponseTelecommande>) => {
      let reponse: ReponseTelecommande;
      try { reponse = await faire(); } catch (e) { reponse = { ok: false, fait: texteErreur(e) }; }
      await api.telecommandeRepondre(attente, reponse).catch(() => {});
    };
    const phrase = listen<{ attente: string; texte: string }>("telecommande:phrase", (e) => {
      void repondre(e.payload.attente, () => executer(e.payload.texte, (to) => nav.current(to)));
    });
    const decision = listen<{ attente: string; id: string; oui: boolean }>("telecommande:decision", (e) => {
      void repondre(e.payload.attente, () => decider(e.payload.id, e.payload.oui));
    });
    // « Que dire ? » sur le téléphone : ce que cette fenêtre comprend, du même vocabulaire que ce qu'elle exécute.
    const aide = listen<{ attente: string }>("telecommande:aide", (e) => {
      void repondre(e.payload.attente, async () => ({ ok: true, comprend: ceQuIlComprend(destinations()) }));
    });
    return () => {
      void phrase.then((f) => f());
      void decision.then((f) => f());
      void aide.then((f) => f());
    };
  }, []);
}

/** L'état de la télécommande, suivi de partout : ouverte, fermée, reliée au téléphone. */
export function useEtatTelecommande(): InfoTelecommande | null {
  const [info, setInfo] = React.useState<InfoTelecommande | null>(null);
  React.useEffect(() => {
    api.telecommandeEtat().then(setInfo).catch(() => {});
    const p = listen<InfoTelecommande | null>("telecommande:etat", (e) => setInfo(e.payload));
    return () => { void p.then((f) => f()); };
  }, []);
  return info;
}

/** Ouvre la télécommande — ou la ferme si elle l'est —, et le dit. */
export async function basculerLaTelecommande(ouverte: boolean) {
  try {
    if (ouverte) {
      await api.telecommandeFermer();
      toast("Télécommande fermée.", { icone: "📽" });
    } else {
      // Le clic prépare le son : le minuteur lancé de loin sonnera.
      preparerSon();
      // Ce que Whisper lira avant chaque phrase : les commandes, et les prénoms pour « note pour… ».
      await api.telecommandeOuvrir(inviteDeLaVoix(await api.elevesList().catch(() => [])));
      toast("Télécommande ouverte : sur l'iPhone, compagnon › WiFi › « Piloter le Mac ».", { icone: "📽", duree: 8000 });
    }
  } catch (e) {
    toast("Télécommande impossible : " + texteErreur(e), { icone: "⚠️", duree: 8000 });
  }
}

/** La carte des Réglages › Téléphone. */
export function CarteTelecommande() {
  const info = useEtatTelecommande();
  const [occupe, setOccupe] = React.useState(false);
  const [secoursVoulu, setSecoursVoulu] = React.useState(false);
  React.useEffect(() => { api.settingGet(CLE_SECOURS).then((v) => setSecoursVoulu(v === "oui")).catch(() => {}); }, []);
  const basculerLeSecours = (oui: boolean) => {
    setSecoursVoulu(oui);
    api.settingSet(CLE_SECOURS, oui ? "oui" : "").catch((e) => { setSecoursVoulu(!oui); toast(texteErreur(e), { icone: "⚠️" }); });
  };
  return (
    <div className="card" style={{ marginBottom: 18, maxWidth: 620 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>📽 Télécommande du tableau</h3>
        <Aide titre="Télécommande du tableau" vers="droite">
          <p>Vous parlez à l'iPhone, et ce Mac — projeté au tableau — affiche : « minuteur cinq minutes », « affiche les
            supports visuels », « montre la carte mentale », « plein écran », « ferme ». « Note pour [prénom] : … »
            s'écrit dans ses observations après un « oui » sur le téléphone, sans s'afficher au tableau.</p>
          <p>Sur l'iPhone, « Que dire ? » montre tout ce que la télécommande comprend, et chaque page par son nom :
            toucher une phrase l'envoie, comme si on l'avait dite.</p>
          <p>Mistral en secours : quand la télécommande ne comprend pas une phrase, Mistral la lit (en ligne, le texte
            seul : le son reste sur ce Mac) et choisit parmi les pages de la classe ; Maitrize vérifie sa réponse avant
            d'agir. Le téléphone le signale par « (Mistral) ».</p>
          <p>La voix ne montre que ce qu'on peut montrer à la classe : ni les élèves, ni le cahier journal, ni les
            réglages. Elle est transcrite sur ce Mac, comme les dictées ; chaque phrase arrive scellée, même sur le WiFi
            de l'école.</p>
          <p>Le téléphone trouve le Mac par Nuage, sans QR code. Ils doivent ensuite se joindre sur le même réseau :
            le WiFi de la classe, ou le partage de connexion de l'iPhone. La télécommande se ferme toute seule deux
            heures après la dernière phrase.</p>
        </Aide>
        <div className="spacer" style={{ flex: 1 }} />
        <button className={`btn${info ? " danger" : " primary"}`} disabled={occupe}
          onClick={() => { setOccupe(true); void basculerLaTelecommande(!!info).finally(() => setOccupe(false)); }}>
          {info ? "Fermer" : "Ouvrir la télécommande"}
        </button>
      </div>
      <label className="pb-coche" style={{ marginTop: 10 }}>
        <input type="checkbox" checked={secoursVoulu} onChange={(e) => basculerLeSecours(e.target.checked)} />
        <span>Mistral en secours, quand la télécommande ne comprend pas</span>
      </label>
      {info && (
        <p className="meta" style={{ margin: "10px 0 0", fontSize: 13 }}>
          {info.reliee ? "✓ L'iPhone pilote ce Mac." : "Ouverte : en attente de l'iPhone."}
        </p>
      )}
    </div>
  );
}
