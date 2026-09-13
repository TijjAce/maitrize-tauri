// Impression / export PDF : écrit un document HTML autonome dans un iframe
// caché puis déclenche l'impression système (→ « Enregistrer en PDF »).

export function escapeHtml(s: string): string {
  return (s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

const STYLE = `
  * { box-sizing: border-box; }
  /* Document destiné au papier : il s'affiche sur fond blanc, quel que soit
     le thème du système. Sans ces deux lignes, l'aperçu d'un navigateur en
     mode sombre montre du texte foncé sur fond foncé. */
  :root { color-scheme: light; }
  /* Couleurs gardées à l'impression et dans le PDF : sans cette consigne, les
     navigateurs retirent les fonds (blocs de l'emploi du temps, étiquettes,
     surlignages) pour économiser l'encre. */
  html, body, * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1c2233; background: #fff; margin: 0; padding: 28px 32px; font-size: 13px; line-height: 1.5; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 16px; margin: 22px 0 6px; border-bottom: 2px solid #e3e6ef; padding-bottom: 4px; }
  h3 { font-size: 14px; margin: 14px 0 4px; }
  .meta { color: #687087; font-size: 12px; margin-bottom: 10px; }
  .chip { display: inline-block; background: #eef0fe; color: #4338ca; border-radius: 100px;
    padding: 2px 9px; font-size: 11px; font-weight: 600; margin: 0 4px 4px 0; }
  .label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: #687087; margin-top: 10px; }
  .seance { page-break-inside: avoid; border: 1px solid #e3e6ef; border-radius: 10px; padding: 14px; margin: 12px 0; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0; }
  th, td { border: 1px solid #cfd4e2; padding: 6px 8px; text-align: left; vertical-align: top;
    font-size: 11.5px; word-break: break-word; }
  th { background: #f0f2f8; }
  img { max-width: 100%; max-height: 280px; object-fit: contain; margin: 6px 0; }
  blockquote { border-left: 3px solid #6366f1; background: #eef0fe; margin: 8px 0; padding: 6px 12px; font-style: italic; }
  .pre { white-space: pre-wrap; }
  @page { margin: 14mm; }
`;

// Ouvre le document dans le navigateur (via la commande native ouvrir_html),
// d'où l'utilisateur imprime / enregistre en PDF (⌘P). L'impression directe
// dans la webview Tauri n'étant pas fiable, on passe par le système.
/**
 * `styleExtra` est ajouté après la feuille commune, donc il la surcharge :
 * de quoi resserrer un document dense sans toucher aux autres impressions.
 */
/** Le document autonome qu'on ouvre pour l'imprimer ou l'enregistrer en PDF. */
export function documentImprimable(title: string, bodyHtml: string, styleExtra = ""): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${STYLE}
    @media screen { body { max-width: 820px; margin: 0 auto; } }
    ${styleExtra}</style></head><body>${bodyHtml}</body></html>`;
}

export function printHTML(title: string, bodyHtml: string, styleExtra = "") {
  const html = documentImprimable(title, bodyHtml, styleExtra);
  // Import dynamique pour éviter tout cycle d'import au chargement.
  import("./api").then(({ api }) => { void api.ouvrirHtml(html); });
}
