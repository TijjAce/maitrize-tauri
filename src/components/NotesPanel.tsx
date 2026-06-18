import React from "react";
import { api } from "../api";

/// Panneau de notes rapides flottant, accessible depuis toute l'app.
/// Contenu persisté dans settings (clé `notesRapides`), sauvegarde différée.
export function NotesPanel() {
  const [open, setOpen] = React.useState(false);
  const [texte, setTexte] = React.useState("");
  const [charge, setCharge] = React.useState(false);
  const timer = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (open && !charge) api.settingGet("notesRapides").then((v) => { setTexte(v ?? ""); setCharge(true); });
  }, [open, charge]);

  const onChange = (v: string) => {
    setTexte(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { api.settingSet("notesRapides", v); }, 400);
  };

  return (
    <>
      <button className="notes-fab" title="Notes rapides" onClick={() => setOpen((o) => !o)}>📝</button>
      {open && (
        <div className="notes-panel">
          <div className="notes-head">
            <strong>Notes rapides</strong>
            <span style={{ flex: 1 }} />
            <button className="btn ghost sm" onClick={() => setOpen(false)} aria-label="Fermer">✕</button>
          </div>
          <textarea className="textarea" style={{ flex: 1, border: "none", borderRadius: 0, resize: "none" }}
            placeholder="Vos notes, pense-bêtes, idées…" value={texte} onChange={(e) => onChange(e.target.value)} />
        </div>
      )}
    </>
  );
}
