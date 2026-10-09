import React from "react";
import { listen } from "@tauri-apps/api/event";
import { api, type BanqueAppoint, type EtatAppoint, type PictoAppoint, type PictoArasaac } from "../api";
import { Field, Input, Modal } from "./ui";
import { toast } from "./Toaster";
import { usePictoImage } from "./ChoixPicto";
import { BANQUES_APPOINT, garderImageAppoint, infoBanque, type RefPicto } from "../pictosAppoint";

// ── Le picto d'un verbe de consigne, dans les trois banques ───────────────
//
// ARASAAC d'abord ; puis les consignes de F. Bajard, toutes à l'impératif ;
// puis Sclera. Une banque d'appoint qui n'est pas encore sur cet ordinateur
// se télécharge d'ici.

/** Où en est le téléchargement d'une banque d'appoint. */
export interface Telechargement { banque: BanqueAppoint; recus: number; total: number }

/** « Sclera : 23 / 77 Mo ». */
export function texteTelechargement(t: Telechargement): string {
  // En millions d'octets, comme la taille annoncée sur le bouton (« 77 Mo »).
  const mo = (o: number) => (o / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: o < 1e7 ? 1 : 0 });
  return `${infoBanque(t.banque).nom} : ${t.total ? `${mo(t.recus)} / ${mo(t.total)} Mo` : "démarrage…"}`;
}

/** Les banques d'appoint de cet ordinateur, et de quoi les télécharger. */
export function useBanquesAppoint() {
  const [etats, setEtats] = React.useState<EtatAppoint[]>([]);
  const [enCours, setEnCours] = React.useState<Telechargement | null>(null);
  React.useEffect(() => { api.pictosAppointEtat().then(setEtats).catch(() => {}); }, []);
  React.useEffect(() => {
    const p = listen<Telechargement>("pictos-appoint://avancement", (e) => setEnCours(e.payload));
    return () => { p.then((off) => off()); };
  }, []);
  const installee = React.useCallback((b: BanqueAppoint) => etats.some((e) => e.banque === b && e.installee), [etats]);
  const nombre = React.useCallback((b: BanqueAppoint) => etats.find((e) => e.banque === b)?.nombre ?? 0, [etats]);
  /** Télécharge une banque ; vrai si elle est là ensuite. Un échec se dit, et laisse la suite se faire sans elle. */
  const telecharger = React.useCallback(async (b: BanqueAppoint): Promise<boolean> => {
    setEnCours({ banque: b, recus: 0, total: 0 });
    try {
      const etat = await api.pictosAppointTelecharger(b);
      setEtats((avant) => [...avant.filter((e) => e.banque !== b), etat]);
      return etat.installee;
    } catch (e) {
      toast(`${infoBanque(b).nom} : ${String(e)}`, { icone: "⚠️", duree: 8000 });
      return false;
    } finally {
      setEnCours(null);
    }
  }, []);
  return { installee, nombre, telecharger, enCours };
}

function Resultat({ refPicto, mot, actif, onClick }: { refPicto: RefPicto; mot: string; actif: boolean; onClick: () => void }) {
  const src = usePictoImage(refPicto);
  return (
    <button type="button" onClick={onClick} title={mot}
      style={{ border: actif ? "3px solid var(--accent)" : "1px solid var(--border)", borderRadius: 8, background: "#fff",
        padding: 4, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      {src ? <img src={src} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "contain" }} />
        : <div style={{ width: "100%", aspectRatio: "1" }} />}
      <span style={{ fontSize: 11, color: "#444", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mot}</span>
    </button>
  );
}

const GRILLE: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))", gap: 6, marginBottom: 12 };

export function ChoixPictoConsigne({ verbe, actuel, onClose, onValider, recherche, onAutomatique }: {
  verbe: string; actuel: RefPicto | null;
  /** Ce qu'on cherche d'abord, quand ce n'est pas le mot lui-même : « anglais » pour « LVE / Anglais ». */
  recherche?: string;
  onClose: () => void;
  /** Le picto retenu ; `null` pour que le verbe n'en ait plus. */
  onValider: (ref: RefPicto | null) => void;
  /** Rendre le mot au picto trouvé tout seul, quand on l'avait choisi à la main. */
  onAutomatique?: () => void;
}) {
  const [q, setQ] = React.useState(recherche ?? verbe);
  const [choisi, setChoisi] = React.useState<RefPicto | null>(actuel);
  const [arasaacLa, setArasaacLa] = React.useState(false);
  const [arasaac, setArasaac] = React.useState<PictoArasaac[]>([]);
  const [appoint, setAppoint] = React.useState<Record<BanqueAppoint, PictoAppoint[]>>({ bajard: [], sclera: [] });
  const [pose, setPose] = React.useState(false);
  const banques = useBanquesAppoint();
  React.useEffect(() => { api.arasaacEtat().then((e) => setArasaacLa(Boolean(e.installee))).catch(() => {}); }, []);
  const bajardLa = banques.installee("bajard"), scleraLa = banques.installee("sclera");

  React.useEffect(() => {
    const cherche = q.trim();
    const t = setTimeout(() => {
      if (arasaacLa && cherche.length >= 2) api.arasaacChercher(cherche, 24).then(setArasaac).catch(() => setArasaac([]));
      else setArasaac([]);
      // Les consignes de F. Bajard tiennent sur un écran : celles qui répondent d'abord, puis toutes les autres.
      if (bajardLa) {
        Promise.all([api.pictosAppointChercher("bajard", cherche, 48), api.pictosAppointChercher("bajard", "", 48)])
          .then(([trouves, toutes]) => setAppoint((a) => ({ ...a, bajard: [...trouves, ...toutes.filter((p) => !trouves.some((x) => x.reference === p.reference))] })))
          .catch(() => {});
      }
      if (scleraLa && cherche.length >= 2) {
        api.pictosAppointChercher("sclera", cherche, 36).then((s) => setAppoint((a) => ({ ...a, sclera: s }))).catch(() => {});
      } else setAppoint((a) => ({ ...a, sclera: [] }));
    }, 200);
    return () => clearTimeout(t);
  }, [q, arasaacLa, bajardLa, scleraLa]);

  const poser = async () => {
    if (choisi == null) return;
    setPose(true);
    // La copie de l'image part avec le lexique : l'autre ordinateur l'imprimera sans la banque.
    try { await garderImageAppoint(choisi); } catch (e) { toast("Image non gardée : " + String(e), { icone: "⚠️" }); }
    onValider(choisi);
  };

  const section = (titre: string, contenu: React.ReactNode) => (
    <div style={{ marginBottom: 4 }}>
      <div className="meta" style={{ fontSize: 12, fontWeight: 600, margin: "0 0 6px" }}>{titre}</div>
      {contenu}
    </div>
  );
  const vide = (texte: string) => <p className="meta" style={{ fontSize: 12.5, margin: "0 0 12px" }}>{texte}</p>;
  const aTelecharger = (b: BanqueAppoint) => {
    const info = infoBanque(b);
    const enCours = banques.enCours?.banque === b ? banques.enCours : null;
    return (
      <p className="meta" style={{ fontSize: 12.5, margin: "0 0 12px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span>Pas encore sur cet ordinateur.</span>
        <button type="button" className="btn sm" disabled={!!banques.enCours} onClick={() => { void banques.telecharger(b); }}>
          {enCours ? `⏳ ${texteTelechargement(enCours)}` : `⬇️ Télécharger (${info.taille})`}
        </button>
      </p>
    );
  };
  const grille = (liste: { ref: RefPicto; mot: string }[]) => (
    <div style={GRILLE}>
      {liste.map((p) => <Resultat key={String(p.ref)} refPicto={p.ref} mot={p.mot} actif={choisi === p.ref} onClick={() => setChoisi(p.ref)} />)}
    </div>
  );

  return (
    <Modal titre={`Le pictogramme de « ${verbe} »`} onClose={onClose} large
      footer={<>
        {actuel != null && <button className="btn" onClick={() => onValider(null)}>Vider</button>}
        {onAutomatique && <button className="btn" onClick={onAutomatique} title="Reprendre le picto que l'application trouve toute seule">↺ Automatique</button>}
        <div className="spacer" />
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={choisi == null || pose} onClick={() => { void poser(); }}>Poser</button>
      </>}>
      <Field label="Chercher un pictogramme">
        <Input autoFocus placeholder="colorier, entourer, découper…" value={q} onChange={(e) => setQ(e.target.value)} />
      </Field>
      <div style={{ maxHeight: 420, overflowY: "auto" }}>
        {section("ARASAAC", !arasaacLa ? vide("La banque ARASAAC n'est pas téléchargée : l'onglet CAA la télécharge.")
          : arasaac.length ? grille(arasaac.map((p) => ({ ref: p.id, mot: p.mot })))
          : vide(q.trim().length >= 2 ? `Rien pour « ${q.trim()} ».` : "Tapez au moins deux lettres."))}
        {BANQUES_APPOINT.map((b) => (
          <React.Fragment key={b.cle}>
            {section(b.nom, !banques.installee(b.cle) ? aTelecharger(b.cle)
              : appoint[b.cle].length ? grille(appoint[b.cle].map((p) => ({ ref: p.reference, mot: p.mot })))
              : vide(q.trim().length >= 2 ? `Rien pour « ${q.trim()} ».` : "Tapez au moins deux lettres."))}
          </React.Fragment>
        ))}
      </div>
    </Modal>
  );
}
