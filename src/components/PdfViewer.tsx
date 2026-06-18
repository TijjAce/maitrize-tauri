import React from "react";
import { api } from "../api";

/** Lit un fichier (base64) et renvoie une URL blob pour l'affichage PDF. */
export async function fichierToBlobUrl(nomFichier: string, mime = "application/pdf"): Promise<string> {
  const b64 = await api.fichierRead(nomFichier);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

/** Visionneuse PDF plein écran (modale) depuis un fichier du coffre. */
export function PdfViewer({ nomFichier, titre, onClose }: { nomFichier: string; titre: string; onClose: () => void }) {
  const [url, setUrl] = React.useState("");
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  React.useEffect(() => {
    let u = ""; fichierToBlobUrl(nomFichier).then((x) => { u = x; setUrl(x); });
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [nomFichier]);
  const imprimer = async () => {
    // macOS : impression système (AirPrint) via Aperçu. Sinon, impression webview.
    try { await api.imprimerPdf(nomFichier); return; } catch { /* fallback */ }
    const w = iframeRef.current?.contentWindow;
    try { w?.focus(); w?.print(); } catch { /* barre d'outils PDF / Cmd+P */ }
  };
  return (
    <div className="overlay" style={{ zIndex: 160 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: "92vw", width: 980, height: "90vh", display: "flex", flexDirection: "column" }}>
        <div className="modal-head"><h2>{titre}</h2><div className="spacer" />
          <button className="btn sm" onClick={imprimer} disabled={!url}>🖨 Imprimer</button>
          <button className="btn ghost sm" onClick={onClose} aria-label="Fermer">✕</button></div>
        <div style={{ flex: 1, background: "#525659" }}>
          {url ? <iframe ref={iframeRef} src={url} title={titre} style={{ width: "100%", height: "100%", border: "none" }} />
            : <div style={{ color: "#fff", padding: 20 }}>Chargement…</div>}
        </div>
      </div>
    </div>
  );
}
