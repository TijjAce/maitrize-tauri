import React from "react";
import { listen } from "@tauri-apps/api/event";
import { useNavigate } from "react-router-dom";
import { api, newId, nowIso, texteErreur, type InfoTelecommande, type ReponseTelecommande } from "../api";
import { allerVers, NAV, SOUS_ONGLETS } from "./CommandPalette";
import { Aide } from "./Aide";
import { toast } from "./Toaster";
import { ouvrirOnglet } from "./ui";
import { demanderMinuteur, EVT_FERMER_AFFICHAGE } from "../demandeMinuteur";
import { etatDuMinuteur, piloterLeMinuteur, preparerSon } from "../pages/SupportsVisuels";
import { zoomerDeLoin } from "../theme";
import { EVT_CHERCHER_BUREAU } from "../bureauAteliers";
import {
  CLE_SECOURS, CLE_TEMPS_REEL, MODELE_DE_SECOURS, catalogue, ceQuIlComprend, comprendre, consigneDeMistral, destinationsDe,
  dureeEnClair, estComplexe, inviteDeLaVoix, lireLesActions, nomDeLaPage, pageAConfirmer, trouvailleAConfirmer, type Compris,
  type ContexteTelecommande, type Destination,
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

/**
 * Ce qui attend le « oui » du téléphone, par question : une note à écrire, ou une page qui montre les élèves. `suite` :
 * les actions de la même phrase venues après — elles se font après le « oui », et tombent avec le « non ».
 */
type EnAttente = (
  | { genre: "note"; eleveId: string; prenom: string; texte: string }
  | { genre: "afficher"; faire: () => ReponseTelecommande }
) & { suite?: Compris[] };
const enAttente = new Map<string, EnAttente>();

/** Au tableau, une page qui montre les élèves ne s'affiche qu'après un « oui » sur le téléphone. */
function apresUnOui(nom: string, faire: () => ReponseTelecommande): ReponseTelecommande {
  const id = newId();
  enAttente.set(id, { genre: "afficher", faire });
  return { ok: true, aConfirmer: `Afficher « ${nom} » au tableau ?`, id };
}

async function pleinEcran(actif: boolean) {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().setFullscreen(actif);
  } catch { /* hors de l'application */ }
}

/** Les tailles de « plus grand » et « plus petit », au tableau, par-dessus celle des réglages. */
const ZOOMS = [0.8, 1, 1.25, 1.5, 1.75, 2];
let zoom = 1;

/** Le temps qu'on laisse à Mistral : au-delà, la télécommande répond sans lui (le téléphone attend). */
const DELAI_DE_MISTRAL = 8000;
/** Entre deux actions d'une même phrase : la page demandée a le temps de s'ouvrir. */
const ENTRE_DEUX_ACTIONS = 450;

/** Où en sont le minuteur et l'affichage : Mistral en a besoin pour « encore deux minutes », « plus grand ». */
function ceQuiEstEnCours(): string {
  const m = etatDuMinuteur();
  const minuteur = !m ? "aucun minuteur" : m.fini ? "le minuteur a sonné"
    : `minuteur ${m.enMarche ? "en marche" : "arrêté"}, ${dureeEnClair(Math.round(m.restant / 1000))} restantes`;
  return `${minuteur} ; page affichée : ${window.location.hash.replace(/^#/, "") || "/"} ; taille ${Math.round(ZOOMS[zoom] * 100)} %.`;
}

/** Ce que la voix peut ouvrir — séquences, séances, jeux, outils, textes, dossiers —, lu à chaque phrase : il change. */
async function ceQuOnPeutOuvrir(eleves: { nom: string }[]) {
  const [sequences, seances, jeux, outils, textes, dossiers] = await Promise.all([
    api.sequencesList().catch(() => []), api.seancesList().catch(() => []), api.jeuxList().catch(() => []),
    api.outilsClasseList().catch(() => []), api.textesList().catch(() => []), api.dossiersBureau().catch(() => []),
  ]);
  return catalogue({ sequences, seances, jeux, outils, textes, dossiers }, eleves, nowIso().slice(0, 10));
}

/**
 * Mistral lit la phrase — le texte seul, le son reste sur ce Mac — avec tout ce qu'il peut faire : les actions, les
 * pages de la classe, ce que la voix peut ouvrir, et ce qui est en cours. Ses actions ne passent que relues
 * (`lireLesActions`), puis se font dans l'ordre. Rien s'il n'est pas voulu, pas joignable, ou trop lent.
 */
async function parMistral(texte: string, ctx: ContexteTelecommande, nav: (to: string) => void): Promise<ReponseTelecommande | null> {
  const elements = await ceQuOnPeutOuvrir(ctx.eleves);
  let actions: Compris[] | null;
  try {
    const reponse = await Promise.race([
      api.mistralChat([
        { role: "system", content: consigneDeMistral(ctx.destinations, elements, ceQuiEstEnCours()) },
        { role: "user", content: texte },
      ], MODELE_DE_SECOURS, true),
      new Promise<never>((_, refuser) => setTimeout(() => refuser(new Error("délai")), DELAI_DE_MISTRAL)),
    ]);
    actions = lireLesActions(reponse, ctx, elements, texte);
  } catch {
    return null;
  }
  if (!actions) return null;
  const r = await enSuite(actions, nav);
  return r.ok ? { ...r, fait: `${r.fait ?? ""} (Mistral)`.trim() } : null;
}

/**
 * Des actions, l'une après l'autre, le temps que chaque page s'ouvre. Une question — une note, une page des élèves —
 * arrête la suite : elle attend le « oui » avec la question.
 */
async function enSuite(actions: Compris[], nav: (to: string) => void): Promise<ReponseTelecommande> {
  const faits: ReponseTelecommande[] = [];
  for (const [i, a] of actions.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, ENTRE_DEUX_ACTIONS));
    const f = await agir(a, nav);
    faits.push(f);
    const q = f.id ? enAttente.get(f.id) : undefined;
    if (f.aConfirmer && q) {
      q.suite = actions.slice(i + 1);
      break;
    }
  }
  const question = faits.find((f) => f.aConfirmer);
  return {
    ...question,
    ok: faits.some((f) => f.ok),
    fait: faits.map((f) => f.fait).filter(Boolean).join(" "),
    comprend: faits.find((f) => f.comprend)?.comprend,
  };
}

/**
 * Fait ce que la phrase demande, et dit au téléphone ce qui a été fait. Une phrase simple — une commande, ce qu'on
 * dit le plus — se comprend ici, sans attendre. Une phrase complexe, ou incomprise, va à Mistral si l'enseignant
 * l'a voulu (Réglages › Téléphone).
 */
export async function executer(texte: string, nav: (to: string) => void): Promise<ReponseTelecommande> {
  const eleves = (await api.elevesList().catch(() => [])).map((e) => ({ id: e.id, nom: e.nom }));
  const ctx = { destinations: destinations(), eleves };
  const mistral = texte.trim() !== "" && (await api.settingGet(CLE_SECOURS).catch(() => null)) === "oui";
  const complexe = mistral && estComplexe(texte, ctx.destinations);
  if (complexe) {
    const r = await parMistral(texte, ctx, nav);
    if (r) return r;
  }
  const c = comprendre(texte, ctx);
  const fait = await agir(c, nav);
  if (mistral && !complexe && (c.genre === "rien" || !fait.ok)) {
    const r = await parMistral(texte, ctx, nav);
    if (r) return r;
  }
  return fait;
}

/** Le minuteur en cours, piloté : ce qu'on en dit au téléphone. */
function minuteurPilote(ordre: "pause" | "reprendre" | "arreter" | "ajouter", secondes = 0): ReponseTelecommande {
  const restant = piloterLeMinuteur(ordre, secondes * 1000);
  if (restant === null) return { ok: false, fait: "Pas de minuteur en cours." };
  const reste = `${dureeEnClair(Math.round(restant / 1000))} restantes`;
  switch (ordre) {
    case "pause": return { ok: true, fait: `Minuteur en pause : ${reste}.` };
    case "reprendre": return { ok: true, fait: `Minuteur repris : ${reste}.` };
    case "arreter": return { ok: true, fait: "Minuteur arrêté." };
    case "ajouter": return { ok: true, fait: `${secondes > 0 ? "Plus" : "Moins"} ${dureeEnClair(Math.abs(secondes))} : ${reste}.` };
  }
}

/** Le geste de ce qui a été compris, et ce qu'on en dit au téléphone. */
async function agir(c: Compris, nav: (to: string) => void): Promise<ReponseTelecommande> {
  switch (c.genre) {
    case "minuteur":
      nav("/caa");
      setTimeout(() => ouvrirOnglet("caa", "minuteur"), 140);
      demanderMinuteur(c.secondes);
      return { ok: true, fait: `Minuteur de ${dureeEnClair(c.secondes)} lancé.` };
    case "minuteurPause": return minuteurPilote("pause");
    case "minuteurReprendre": return minuteurPilote("reprendre");
    case "minuteurArreter": return minuteurPilote("arreter");
    case "minuteurAjouter": return minuteurPilote("ajouter", c.secondes);
    case "pleinEcran":
      await pleinEcran(c.actif);
      return { ok: true, fait: c.actif ? "Plein écran." : "Plein écran quitté." };
    case "fermer":
      window.dispatchEvent(new Event(EVT_FERMER_AFFICHAGE));
      await pleinEcran(false);
      return { ok: true, fait: "Fermé." };
    case "zoom":
      zoom = c.sens === "normal" ? 1 : Math.max(0, Math.min(ZOOMS.length - 1, zoom + (c.sens === "plus" ? 1 : -1)));
      zoomerDeLoin(ZOOMS[zoom]);
      return { ok: true, fait: ZOOMS[zoom] === 1 ? "Taille normale." : `Affiché à ${Math.round(ZOOMS[zoom] * 100)} %.` };
    case "defiler": {
      const zone = document.querySelector(".page-scroll") ?? document.scrollingElement;
      zone?.scrollBy({ top: (c.sens === "bas" ? 1 : -1) * Math.round((zone.clientHeight || window.innerHeight) * 0.7), behavior: "smooth" });
      return { ok: true, fait: c.sens === "bas" ? "Plus bas." : "Plus haut." };
    }
    case "retour":
      window.history.back();
      return { ok: true, fait: "Page d'avant." };
    case "aller": {
      const d = c.destination;
      const montrer = (): ReponseTelecommande => {
        nav(d.to);
        if (d.page && d.onglet) setTimeout(() => ouvrirOnglet(d.page!, d.onglet!), 140);
        return { ok: true, fait: `${nomDeLaPage(d.label)} : affiché.` };
      };
      return pageAConfirmer(d) ? apresUnOui(nomDeLaPage(d.label), montrer) : montrer();
    }
    case "ouvrir": {
      const e = c.element;
      if (e.sorte === "dossier") {
        // Un dossier du bureau : comme ⌘K, le plan de travail, le dossier surligné.
        nav("/plan");
        setTimeout(() => window.dispatchEvent(new CustomEvent(EVT_CHERCHER_BUREAU, { detail: { dossier: e.id, titre: e.id } })), 140);
        return { ok: true, fait: `Dossier « ${e.titre.split("/").join(" › ")} » : affiché.` };
      }
      allerVers({ kind: e.sorte, id: e.id, titre: e.titre, sousTitre: "", extrait: "", date: "", parent: "" }, nav);
      return { ok: true, fait: `« ${e.titre} » : affiché.` };
    }
    case "chercher": {
      const trouves = await api.recherche(c.quoi).catch(() => []);
      const r = (c.sorte ? trouves.find((x) => x.kind === c.sorte) : undefined) ?? trouves[0];
      if (!r) return { ok: false, fait: `Rien à montrer pour « ${c.quoi} ».` };
      const montrer = (): ReponseTelecommande => {
        allerVers(r, nav);
        return { ok: true, fait: `« ${r.titre} » : affiché.` };
      };
      return trouvailleAConfirmer(r.kind) ? apresUnOui(r.titre, montrer) : montrer();
    }
    case "note": {
      const id = newId();
      const prenom = c.eleve.nom.split(" ")[0];
      enAttente.set(id, { genre: "note", eleveId: c.eleve.id, prenom, texte: c.texte });
      return { ok: true, aConfirmer: `Noter pour ${prenom} : « ${c.texte} » ?`, id };
    }
    case "aide":
      // La liste entière part avec : le téléphone l'ouvre.
      return { ok: true, fait: QUE_DIRE_EN_BREF, comprend: ceQuIlComprend(destinations()) };
    case "rien":
      return { ok: false, fait: c.pourquoi };
  }
}

/**
 * Le « oui » ou le « non » du téléphone à une question : une note, ou une page qui montre les élèves. Après le
 * « oui », la suite de la phrase se fait — jusqu'à la question suivante, s'il y en a une.
 */
export async function decider(id: string, oui: boolean, nav: (to: string) => void): Promise<ReponseTelecommande> {
  const q = enAttente.get(id);
  enAttente.delete(id);
  if (!q) return { ok: false, fait: "Cette question n'attend plus de réponse." };
  if (!oui) return { ok: true, fait: q.genre === "note" ? "Rien n'est noté." : "Rien n'est affiché." };
  let fait: ReponseTelecommande;
  if (q.genre === "afficher") fait = q.faire();
  else {
    await api.commentaireSave({ id: newId(), date: nowIso(), texte: q.texte, type: "divers", eleveId: q.eleveId });
    fait = { ok: true, fait: `Noté pour ${q.prenom}.` };
  }
  if (!q.suite?.length) return fait;
  await new Promise((r) => setTimeout(r, ENTRE_DEUX_ACTIONS));
  const suite = await enSuite(q.suite, nav);
  return { ...suite, ok: true, fait: [fait.fait, suite.fait].filter(Boolean).join(" ") };
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
      void repondre(e.payload.attente, () => decider(e.payload.id, e.payload.oui, (to) => nav.current(to)));
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
  const [direct, setDirect] = React.useState(false);
  const [verifie, setVerifie] = React.useState(false);
  React.useEffect(() => { api.settingGet(CLE_TEMPS_REEL).then((v) => setDirect(v === "oui")).catch(() => {}); }, []);
  // Cochée : on vérifie tout de suite que la clé Mistral ouvre Voxtral Realtime, plutôt qu'en classe.
  const basculerLeDirect = async (oui: boolean) => {
    setDirect(oui);
    try {
      if (oui) {
        setVerifie(true);
        await api.mistralJetonTempsReel();
      }
      await api.settingSet(CLE_TEMPS_REEL, oui ? "oui" : "");
    } catch (e) {
      setDirect(false);
      toast("Écoute en direct impossible : " + texteErreur(e), { icone: "⚠️", duree: 8000 });
    } finally {
      setVerifie(false);
    }
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
          <p>Écoute en direct : pendant qu'on parle, l'iPhone envoie la voix à Voxtral Realtime (Mistral, en ligne) et
            montre le texte sous le bouton ; la phrase est prête dès qu'on lâche. Ce Mac donne à l'iPhone un jeton
            d'une phrase, jamais la clé. Si ce texte n'est pas compris — ou sans réseau —, ce Mac transcrit le même son,
            comme avant.</p>
          <p>Mistral pour les phrases complexes : « lance dix minutes et affiche la carte mentale », « ouvre la séance
            d'aujourd'hui en plein écran »… et pour celles que la télécommande ne comprend pas. Mistral reçoit la phrase
            (en ligne, le texte seul), tout ce que la télécommande sait faire, les pages de la classe et les titres de
            vos séquences, séances, jeux, outils et textes — les prénoms masqués. Il rend une liste d'actions, que
            Maitrize vérifie une à une avant de les faire dans l'ordre. Le téléphone le signale par « (Mistral) ».</p>
          <p>La voix va dans tous les menus. Ce Mac étant projeté, les pages qui montrent les élèves — Élèves, Tableau
            de bord, Planning, Organisation, Assistant IA, Réglages — ne s'affichent qu'après un « oui » sur le
            téléphone. Chaque phrase arrive scellée, même sur le WiFi de l'école.</p>
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
        <input type="checkbox" checked={direct} disabled={verifie} onChange={(e) => void basculerLeDirect(e.target.checked)} />
        <span>Écoute en direct par Voxtral Realtime (en ligne, plus rapide){verifie ? " — vérification…" : ""}</span>
      </label>
      <label className="pb-coche">
        <input type="checkbox" checked={secoursVoulu} onChange={(e) => basculerLeSecours(e.target.checked)} />
        <span>Mistral pour les phrases complexes, et celles qui ne sont pas comprises (en ligne)</span>
      </label>
      {info && (
        <p className="meta" style={{ margin: "10px 0 0", fontSize: 13 }}>
          {info.reliee ? "✓ L'iPhone pilote ce Mac." : "Ouverte : en attente de l'iPhone."}
        </p>
      )}
    </div>
  );
}
