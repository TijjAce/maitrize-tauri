import React from "react";
import { createPortal } from "react-dom";
import { api, DocumentCoffre } from "../api";
import { fichierToBlobUrl } from "./PdfViewer";
import { VignettePdf } from "./VignettePdf";

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

/** Sans accents ni majuscules : pour chercher un document par son nom. */
const pourChercher = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/**
 * Bouton + panneau « Citer un passage ». D'abord la bibliothèque du coffre-fort — la couverture de chaque PDF, comme
 * des livres sur une étagère (demande de l'enseignant, octobre 2026) ; puis le passage, à côté de l'aperçu du document
 * choisi, et sa source, pré-remplie. Sans document, la citation s'écrit à la main.
 */
export function CitationButton({ onInsert, label = "❝ Citer un passage", className = "btn sm" }: { onInsert: (marqueur: string) => void; label?: React.ReactNode; className?: string }) {
  const [open, setOpen] = React.useState(false);
  const [c, setC] = React.useState<Citation>({ texte: "", source: "", page: "" });
  const [docs, setDocs] = React.useState<DocumentCoffre[] | null>(null);
  const [docId, setDocId] = React.useState("");
  const [pdfUrl, setPdfUrl] = React.useState("");
  const [enBibliotheque, setEnBibliotheque] = React.useState(true);
  const [recherche, setRecherche] = React.useState("");

  React.useEffect(() => { if (open) api.coffreList().then(setDocs).catch(() => setDocs([])); }, [open]);
  React.useEffect(() => {
    const d = docs?.find((x) => x.id === docId);
    if (!d) { setPdfUrl(""); return; }
    let u = ""; fichierToBlobUrl(d.nomFichier).then((x) => { u = x; setPdfUrl(x); });
    // La source suit le document choisi, tant qu'on ne l'a pas écrite soi-même.
    setC((cur) => ({ ...cur, source: !cur.source || docs!.some((x) => x.nom === cur.source) ? d.nom : cur.source }));
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [docId, docs]);

  const reset = () => { setC({ texte: "", source: "", page: "" }); setDocId(""); setPdfUrl(""); setEnBibliotheque(true); setRecherche(""); };
  const titreId = React.useId();
  const choisi = docs?.find((x) => x.id === docId);
  // Un coffre vide n'a rien à montrer : on écrit la citation à la main.
  const bibliotheque = enBibliotheque && (docs?.length ?? 0) > 0;
  const choisir = (id: string) => { setDocId(id); setEnBibliotheque(false); };
  const cherche = pourChercher(recherche.trim());
  const livres = (docs ?? []).filter((d) => pourChercher(d.nom).includes(cherche));
  const taille: React.CSSProperties = bibliotheque ? { width: 860, maxWidth: "92vw" }
    : pdfUrl ? { width: 1000, maxWidth: "92vw", height: "90vh" } : { maxWidth: 560 };

  return (
    <>
      <button type="button" className={className} title="Citer un passage d'un document du coffre-fort" onClick={() => setOpen(true)}>{label}</button>
      {/* Posée sur le corps de la page, comme les fenêtres de ui.tsx : dans la barre d'outils du déroulement, qui reste collée
          en haut (sticky, z-index 3), la barre du haut et la colonne de gauche passaient par-dessus et la coupaient. */}
      {open && createPortal(
        <div className="overlay" style={{ zIndex: 150 }} onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titreId}
            onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } }}
            style={{ ...taille, display: "flex", flexDirection: "column" }}>
            <div className="modal-head"><h2 id={titreId}>Citer un passage</h2><div className="spacer" /><button className="btn ghost sm" onClick={() => setOpen(false)} aria-label="Fermer">✕</button></div>
            {bibliotheque ? (
              <div className="modal-body" style={{ flex: 1, overflow: "auto" }}>
                {docs!.length > 6 && (
                  <input className="input search biblio-recherche" value={recherche} autoFocus placeholder="Chercher dans la bibliothèque…"
                    aria-label="Chercher un document du coffre-fort" onChange={(e) => setRecherche(e.target.value)} />
                )}
                <div className="biblio" role="list" aria-label="La bibliothèque du coffre-fort">
                  {!cherche && (
                    <button type="button" role="listitem" className="biblio-livre" onClick={() => choisir("")}>
                      <span className="biblio-couverture">✍️</span>
                      <span className="biblio-titre">Sans document</span>
                    </button>
                  )}
                  {livres.map((d) => (
                    <button key={d.id} type="button" role="listitem" className={`biblio-livre${d.id === docId ? " choisi" : ""}`} onClick={() => choisir(d.id)} title={d.nom}>
                      <span className="biblio-couverture"><VignettePdf nom={d.nomFichier} /></span>
                      <span className="biblio-titre">{d.nom}</span>
                    </button>
                  ))}
                </div>
                {cherche && livres.length === 0 && <div className="choix-support-vide">Aucun document ne correspond.</div>}
              </div>
            ) : (
              <div className="modal-body" style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
                {(docs?.length ?? 0) > 0 && (
                  <div className="biblio-choisi">
                    <span className="choix-support-vignette">{choisi ? <VignettePdf nom={choisi.nomFichier} /> : "✍️"}</span>
                    <span className="biblio-choisi-titre">{choisi ? choisi.nom : "Sans document"}</span>
                    <button type="button" className="btn sm" onClick={() => setEnBibliotheque(true)}>📚 Changer de document</button>
                  </div>
                )}
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
            )}
            <div className="modal-foot">
              <button className="btn" onClick={() => setOpen(false)}>Annuler</button>
              {!bibliotheque && (
                <button className="btn primary" disabled={!c.texte.trim()} onClick={() => { onInsert(marqueurCite(c)); setOpen(false); reset(); }}>Insérer</button>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
