import React from "react";
import { createPortal } from "react-dom";
import { api, DocumentCoffre } from "../api";
import { fichierToBlobUrl } from "./PdfViewer";

// Une citation d'un document du coffre, dans le déroulement : « [cite:<base64(JSON)>] » (voir documentSeance.ts).
export interface Citation { texte: string; source: string; page: string }
export const marqueurCite = (c: Citation) =>
  `[cite:${btoa(unescape(encodeURIComponent(JSON.stringify(c))))}]`;
/** Image chargée depuis le backend (base64). */
export function FichierImg({ nom, style, alt }: { nom: string; style?: React.CSSProperties; alt?: string }) {
  const [src, setSrc] = React.useState("");
  React.useEffect(() => { api.fichierRead(nom).then((b) => setSrc(`data:image;base64,${b}`)).catch(() => {}); }, [nom]);
  if (!src) return <div style={{ background: "var(--panel-2)", borderRadius: 8, ...style }} />;
  return <img src={src} alt={alt ?? "Illustration"} style={{ borderRadius: 8, ...style }} />;
}

/** Bouton + panneau « Citer un passage » : depuis un PDF du coffre + source pré-remplie. */
export function CitationButton({ onInsert, label = "❝ Citer un passage", className = "btn sm" }: { onInsert: (marqueur: string) => void; label?: React.ReactNode; className?: string }) {
  const [open, setOpen] = React.useState(false);
  const [c, setC] = React.useState<Citation>({ texte: "", source: "", page: "" });
  const [docs, setDocs] = React.useState<DocumentCoffre[]>([]);
  const [docId, setDocId] = React.useState("");
  const [pdfUrl, setPdfUrl] = React.useState("");

  React.useEffect(() => { if (open) api.coffreList().then(setDocs); }, [open]);
  React.useEffect(() => {
    const d = docs.find((x) => x.id === docId);
    if (!d) { setPdfUrl(""); return; }
    let u = ""; fichierToBlobUrl(d.nomFichier).then((x) => { u = x; setPdfUrl(x); });
    setC((cur) => ({ ...cur, source: cur.source || d.nom }));
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [docId, docs]);

  const reset = () => { setC({ texte: "", source: "", page: "" }); setDocId(""); setPdfUrl(""); };
  const titreId = React.useId();
  const choisi = docs.find((x) => x.id === docId);

  return (
    <>
      <button type="button" className={className} title="Citer un passage d'un document du coffre-fort" onClick={() => setOpen(true)}>{label}</button>
      {/* Posée sur le corps de la page, comme les fenêtres de ui.tsx : dans la barre d'outils du déroulement, qui reste collée
          en haut (sticky, z-index 3), la barre du haut et la colonne de gauche passaient par-dessus et la coupaient. */}
      {open && createPortal(
        <div className="overlay" style={{ zIndex: 150 }} onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titreId}
            onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } }}
            style={{ maxWidth: pdfUrl ? "92vw" : 520, width: pdfUrl ? 1000 : undefined, height: pdfUrl ? "90vh" : undefined, display: "flex", flexDirection: "column" }}>
            <div className="modal-head"><h2 id={titreId}>Citer un passage</h2><div className="spacer" /><button className="btn ghost sm" onClick={() => setOpen(false)} aria-label="Fermer">✕</button></div>
            <div className="modal-body" style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="field" style={{ margin: 0 }}>
                <label>Document du coffre-fort (optionnel)</label>
                <select className="select" value={docId} onChange={(e) => setDocId(e.target.value)}>
                  <option value="">— Aucun (citation manuelle) —</option>
                  {docs.map((d) => <option key={d.id} value={d.id}>{d.nom}</option>)}
                </select>
              </div>
              {pdfUrl && (
                // L'aperçu prend la place qui reste : les champs restent en vue sans faire défiler la fenêtre. Pas de « title » :
                // WebKit l'affiche en bulle au milieu du document.
                <div style={{ flex: 1, minHeight: 200, background: "#525659", borderRadius: 8, overflow: "hidden" }}>
                  <iframe src={pdfUrl} aria-label={`Aperçu de ${choisi?.nom ?? "ce document"}`} style={{ width: "100%", height: "100%", border: "none", display: "block" }} />
                </div>
              )}
              <div className="field" style={{ margin: 0 }}><label>Passage cité</label>
                <textarea className="textarea" value={c.texte} autoFocus onChange={(e) => setC({ ...c, texte: e.target.value })}
                  placeholder="Recopiez ou résumez le passage du document…" /></div>
              <div className="row">
                <div className="field" style={{ margin: 0 }}><label>Source</label><input className="input" value={c.source} placeholder="Titre, auteur…" onChange={(e) => setC({ ...c, source: e.target.value })} /></div>
                <div className="field" style={{ margin: 0 }}><label>Page</label><input className="input" value={c.page} onChange={(e) => setC({ ...c, page: e.target.value })} /></div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setOpen(false)}>Annuler</button>
              <button className="btn primary" disabled={!c.texte.trim()} onClick={() => { onInsert(marqueurCite(c)); setOpen(false); reset(); }}>Insérer</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
