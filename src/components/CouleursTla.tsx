import React from "react";
import { api, type CaseTla, type PaletteTla } from "../api";
import { Modal } from "./ui";
import {
  CLE_COULEURS_TLA, MODES_COULEUR, NATURES, PALETTES, PALETTE_DEFAUT, apparence, lirePalette,
} from "../tla";

// ── Les couleurs des tableaux de langage ───────────────────────────────────
//
// Les réglages donnent les couleurs par défaut ; un tableau peut avoir les
// siennes. La même fenêtre sert aux deux : où va la couleur (le fond, le
// cadre, nulle part), une couleur par nature, et un aperçu pour en juger.

/** Émis quand les couleurs par défaut changent : les tableaux ouverts les reprennent. */
const EVT_COULEURS_TLA = "maitrize:couleurs-tla";

/** Les couleurs par défaut des tableaux, gardées dans les réglages. */
export function usePaletteParDefaut(): PaletteTla {
  const [palette, setPalette] = React.useState<PaletteTla>(PALETTE_DEFAUT);
  React.useEffect(() => {
    let vivant = true;
    const relire = () => {
      api.settingGet(CLE_COULEURS_TLA)
        .then((s) => { if (vivant) setPalette(lirePalette(s ? JSON.parse(s) : null)); })
        .catch(() => { if (vivant) setPalette(PALETTE_DEFAUT); });
    };
    relire();
    window.addEventListener(EVT_COULEURS_TLA, relire);
    return () => { vivant = false; window.removeEventListener(EVT_COULEURS_TLA, relire); };
  }, []);
  return palette;
}

export async function garderPaletteParDefaut(p: PaletteTla): Promise<void> {
  await api.settingSet(CLE_COULEURS_TLA, JSON.stringify(p));
  window.dispatchEvent(new Event(EVT_COULEURS_TLA));
}

/** Un mot par nature, pour juger des couleurs avant de les garder. */
const EXEMPLES: CaseTla[] = [
  { pictoId: 1, fichier: "", mot: "où", nature: "question" },
  { pictoId: 1, fichier: "", mot: "je", nature: "personne" },
  { pictoId: 1, fichier: "", mot: "vouloir", nature: "verbe" },
  { pictoId: 1, fichier: "", mot: "encore", nature: "petit mot" },
  { pictoId: 1, fichier: "", mot: "gâteau", nature: "nom" },
  { pictoId: 1, fichier: "", mot: "grand", nature: "adjectif" },
  { pictoId: 1, fichier: "", mot: "merci", nature: "social" },
];

/** Une case telle qu'elle s'imprimera : son fond, son cadre, son mot. */
export function CaseApercu({ c, palette, taille = 64 }: { c: CaseTla; palette: PaletteTla; taille?: number }) {
  const { fond, bord } = apparence(c, palette);
  return (
    <div style={{
      width: taille, height: taille, borderRadius: 4, background: fond, color: "#222",
      boxShadow: bord ? `inset 0 0 0 4px ${bord}` : "inset 0 0 0 1px #9a9aa6",
      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, textAlign: "center", padding: 4,
    }}>{c.mot}</div>
  );
}

/** La légende d'un tableau : les natures et leur couleur, ou rien sans couleur. */
export function LegendeTla({ palette }: { palette: PaletteTla }) {
  if (palette.mode === "aucune") return <span style={{ color: "var(--text-2)" }}>Sans couleur</span>;
  return (
    <>
      {NATURES.map((n) => {
        const c = palette.couleurs[n.id];
        return (
          <span key={n.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{
              width: 12, height: 12, borderRadius: 3,
              background: palette.mode === "bordure" ? "#fff" : c,
              border: palette.mode === "bordure" ? `3px solid ${c}` : "1px solid #bbb",
            }} />
            {n.label}
          </span>
        );
      })}
    </>
  );
}

/** Où va la couleur, des couleurs prêtes, une couleur par nature, et l'aperçu. */
export function EditeurPalette({ palette, onChange }: { palette: PaletteTla; onChange: (p: PaletteTla) => void }) {
  const sansCouleur = palette.mode === "aucune";
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Où va la couleur</div>
      <div className="seg" style={{ flexWrap: "wrap", marginBottom: 14 }}>
        {MODES_COULEUR.map((m) => (
          <button key={m.id} type="button" className={palette.mode === m.id ? "active" : ""}
            onClick={() => onChange({ ...palette, mode: m.id })}>{m.label}</button>
        ))}
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Des couleurs prêtes</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {PALETTES.map((p) => (
          <button key={p.id} type="button" className="btn sm"
            onClick={() => onChange({ mode: p.palette.mode, couleurs: { ...p.palette.couleurs } })}>{p.label}</button>
        ))}
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Une couleur par nature</div>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8, marginBottom: 14,
        opacity: sansCouleur ? 0.45 : 1,
      }}>
        {NATURES.map((n) => (
          <label key={n.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: sansCouleur ? "default" : "pointer" }}>
            <input type="color" value={palette.couleurs[n.id]} disabled={sansCouleur}
              aria-label={`Couleur des mots « ${n.label} »`}
              style={{ width: 34, height: 26, padding: 0, border: "1px solid var(--border)", borderRadius: 6, background: "none" }}
              onChange={(e) => onChange({ ...palette, couleurs: { ...palette.couleurs, [n.id]: e.target.value } })} />
            {n.label}
          </label>
        ))}
      </div>
      {sansCouleur && (
        <p style={{ fontSize: 12.5, color: "var(--text-2)", margin: "-6px 0 14px" }}>
          Toutes les cases restent blanches. Une case à qui l'on donne sa propre couleur la garde : c'est qu'on veut faire ressortir ce mot.
        </p>
      )}

      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Aperçu</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: 6, background: "#c9ccd6", borderRadius: 6, width: "fit-content" }}>
        {EXEMPLES.map((c) => <CaseApercu key={c.mot} c={c} palette={palette} />)}
      </div>
    </div>
  );
}

/** La fenêtre des couleurs : celles des réglages, ou celles d'un tableau. */
export function FenetreCouleurs({ titre, explication, palette, onChange, onClose }: {
  titre: string; explication?: React.ReactNode; palette: PaletteTla;
  onChange: (p: PaletteTla) => void; onClose: () => void;
}) {
  const [brouillon, setBrouillon] = React.useState<PaletteTla>(palette);
  return (
    <Modal titre={titre} onClose={onClose} large
      footer={<>
        <button className="btn" onClick={() => setBrouillon({ mode: PALETTE_DEFAUT.mode, couleurs: { ...PALETTE_DEFAUT.couleurs } })}>
          Couleurs d'origine
        </button>
        <div className="spacer" />
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" onClick={() => { onChange(brouillon); onClose(); }}>Garder</button>
      </>}>
      {explication && <p style={{ marginTop: 0, fontSize: 13, color: "var(--text-2)" }}>{explication}</p>}
      <EditeurPalette palette={brouillon} onChange={setBrouillon} />
    </Modal>
  );
}
