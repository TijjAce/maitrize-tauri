import React from "react";
import { api, DocumentCoffre } from "../api";
import { fichierToBlobUrl } from "./PdfViewer";

// Marqueurs insérés dans le texte du déroulement :
//   [img:<nomFichier>]            → image
//   [cite:<base64(JSON)>]         → citation { texte, source, page }
const RE_TOKEN = /\[(img|cite):([^\]]+)\]/g;
export const marqueurImg = (nom: string) => `[img:${nom}]`;
export const contientMarqueur = (texte: string, nom: string) => texte.includes(marqueurImg(nom));

export interface Citation { texte: string; source: string; page: string }
export const marqueurCite = (c: Citation) =>
  `[cite:${btoa(unescape(encodeURIComponent(JSON.stringify(c))))}]`;
function decodeCite(b64: string): Citation | null {
  try { return JSON.parse(decodeURIComponent(escape(atob(b64)))); } catch { return null; }
}

/** Image chargée depuis le backend (base64). */
export function FichierImg({ nom, style, alt }: { nom: string; style?: React.CSSProperties; alt?: string }) {
  const [src, setSrc] = React.useState("");
  React.useEffect(() => { api.fichierRead(nom).then((b) => setSrc(`data:image;base64,${b}`)).catch(() => {}); }, [nom]);
  if (!src) return <div style={{ background: "var(--panel-2)", borderRadius: 8, ...style }} />;
  return <img src={src} alt={alt ?? "Illustration"} style={{ borderRadius: 8, ...style }} />;
}

/** Éditeur d'illustrations : upload + insertion d'un marqueur dans le texte. */
export function IllustrationsEditor({ texte, fichiers, onChange, onInsert }: {
  texte: string; fichiers: string[]; onChange: (f: string[]) => void; onInsert: (nom: string) => void;
}) {
  const input = React.useRef<HTMLInputElement>(null);
  const ajouter = async (file: File) => {
    const b64 = await new Promise<string>((res, rej) => {
      const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1] ?? ""); r.onerror = rej; r.readAsDataURL(file);
    });
    const nom = await api.fichierSave(file.name, b64);
    onChange([...fichiers, nom]);
  };
  const supprimer = async (nom: string) => { await api.fichierDelete(nom); onChange(fichiers.filter((f) => f !== nom)); };

  return (
    <div>
      <input ref={input} type="file" accept="image/*" multiple style={{ display: "none" }}
        onChange={(e) => { Array.from(e.target.files ?? []).forEach((f) => ajouter(f)); e.target.value = ""; }} />
      <button className="btn sm" onClick={() => input.current?.click()}>📷 Ajouter une illustration</button>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
        {fichiers.map((f) => {
          const dansTexte = contientMarqueur(texte, f);
          return (
            <div key={f} style={{ width: 110 }}>
              <div style={{ position: "relative" }}>
                <FichierImg nom={f} style={{ width: 110, height: 80, objectFit: "cover", border: "1px solid var(--border)" }} />
                <button className="btn ghost sm" style={{ position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,.55)", color: "#fff" }} onClick={() => supprimer(f)} aria-label="Retirer l'image">✕</button>
              </div>
              <button className="btn ghost sm" style={{ width: "100%", marginTop: 2, fontSize: 11, color: dansTexte ? "var(--accent)" : "var(--text-2)" }}
                disabled={dansTexte} onClick={() => onInsert(f)}>{dansTexte ? "✓ dans le texte" : "↳ insérer"}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Case de tableau : marqueur fichier [img:…] OU data-URL image collé directement
// (sous-type optionnel : l'app rend ses images en "data:image;base64,…").
const RE_CELL = /\[img:([^\]]+)\]|data:image[^;,\s]*;base64,[A-Za-z0-9+/=]+/g;
/** Rendu d'une case de tableau : texte + images inline. */
export function CelluleContenu({ texte }: { texte: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0, m: RegExpExecArray | null, i = 0;
  RE_CELL.lastIndex = 0;
  while ((m = RE_CELL.exec(texte)) !== null) {
    if (m.index > last) parts.push(<span key={i++}>{texte.slice(last, m.index)}</span>);
    parts.push(
      <div key={i++} style={{ margin: "4px 0" }}>
        {m[1]
          ? <FichierImg nom={m[1]} style={{ maxWidth: "100%", maxHeight: 140, objectFit: "contain" }} />
          : <img alt="Illustration" src={m[0]} style={{ maxWidth: "100%", maxHeight: 140, objectFit: "contain", borderRadius: 8 }} />}
      </div>);
    last = m.index + m[0].length;
  }
  if (last < texte.length) parts.push(<span key={i++}>{texte.slice(last)}</span>);
  return <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word" }}>{parts}</div>;
}

/** Rendu lecture du déroulement : texte + images + citations inline. */
export function DeroulementRead({ texte }: { texte: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0, m: RegExpExecArray | null, i = 0;
  RE_TOKEN.lastIndex = 0;
  while ((m = RE_TOKEN.exec(texte)) !== null) {
    if (m.index > last) parts.push(<span key={i++}>{texte.slice(last, m.index)}</span>);
    if (m[1] === "img") {
      parts.push(<div key={i++} style={{ margin: "8px 0" }}><FichierImg nom={m[2]} style={{ maxWidth: "100%", maxHeight: 320, objectFit: "contain" }} /></div>);
    } else {
      const c = decodeCite(m[2]);
      if (c) parts.push(
        <blockquote key={i++} style={{ margin: "10px 0", padding: "8px 14px", borderLeft: "3px solid var(--accent)",
          background: "var(--accent-soft)", borderRadius: "0 8px 8px 0", fontStyle: "italic" }}>
          « {c.texte} »
          {(c.source || c.page) && <div style={{ fontStyle: "normal", fontSize: 12, color: "var(--text-2)", marginTop: 4 }}>
            — {c.source}{c.page ? `, p. ${c.page}` : ""}</div>}
        </blockquote>);
    }
    last = m.index + m[0].length;
  }
  if (last < texte.length) parts.push(<span key={i++}>{texte.slice(last)}</span>);
  return <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, overflowWrap: "anywhere", wordBreak: "break-word" }}>{parts}</div>;
}

/** Bouton + panneau « Citer un passage » : depuis un PDF du coffre + source pré-remplie. */
export function CitationButton({ onInsert }: { onInsert: (marqueur: string) => void }) {
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

  return (
    <>
      <button className="btn sm" onClick={() => setOpen(true)}>❝ Citer un passage</button>
      {open && (
        <div className="overlay" style={{ zIndex: 150 }} onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal" style={{ maxWidth: pdfUrl ? "92vw" : 520, width: pdfUrl ? 1000 : undefined, height: pdfUrl ? "90vh" : undefined, display: "flex", flexDirection: "column" }}>
            <div className="modal-head"><h2>Citer un passage</h2><div className="spacer" /><button className="btn ghost sm" onClick={() => setOpen(false)} aria-label="Fermer">✕</button></div>
            <div className="modal-body" style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="field" style={{ margin: 0 }}>
                <label>Document du coffre-fort (optionnel)</label>
                <select className="select" value={docId} onChange={(e) => setDocId(e.target.value)}>
                  <option value="">— Aucun (citation manuelle) —</option>
                  {docs.map((d) => <option key={d.id} value={d.id}>{d.nom}</option>)}
                </select>
              </div>
              {pdfUrl && (
                <div style={{ flex: 1, minHeight: 320, background: "#525659", borderRadius: 8, overflow: "hidden" }}>
                  <iframe src={pdfUrl} title="PDF" style={{ width: "100%", height: "100%", border: "none" }} />
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
        </div>
      )}
    </>
  );
}
