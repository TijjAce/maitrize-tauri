// Impression / export PDF : écrit un document HTML autonome dans un iframe
// caché puis déclenche l'impression système (→ « Enregistrer en PDF »).

/** Une image lue en base64, prête pour `<img src>` : le type vient de l'extension du fichier. */
export function dataUrlImage(nom: string, base64: string): string {
  const ext = /\.([a-z0-9]+)$/i.exec(nom)?.[1].toLowerCase() ?? "png";
  const type = ext === "jpg" ? "jpeg" : ext === "svg" ? "svg+xml" : ext;
  return `data:image/${type};base64,${base64}`;
}

// ── Pied de page : le logo et l'adresse, en bas de chaque page ────────────
//
// Un cahier journal imprimé circule : il passe à un remplaçant, à un
// collègue, à l'inspection. Le logo et l'adresse disent d'où il vient, sans
// prendre la place du contenu.

import logoUrl from "./assets/logo.png";

/** Le logo réduit, en data URL : l'impression part sans dépendre de l'application. */
let logoPret: Promise<string> | null = null;
export function logoImprimable(hauteur = 48): Promise<string> {
  if (!logoPret) {
    logoPret = (async () => {
      const blob = await fetch(logoUrl).then((r) => r.blob());
      const bitmap = await createImageBitmap(blob);
      const echelle = hauteur / bitmap.height;
      const toile = document.createElement("canvas");
      toile.width = Math.max(1, Math.round(bitmap.width * echelle));
      toile.height = hauteur;
      const ctx = toile.getContext("2d");
      if (!ctx) throw new Error("rendu impossible");
      ctx.drawImage(bitmap, 0, 0, toile.width, toile.height);
      return toile.toDataURL("image/png");
    })();
    // Un échec ne doit pas empêcher d'imprimer : on réessaiera la fois d'après.
    logoPret.catch(() => { logoPret = null; });
  }
  return logoPret;
}

/** Le style du pied de page, à ajouter à celui du document. */
export const STYLE_PIED = `
  .pied-maitrize { display: flex; align-items: center; justify-content: center; gap: 7px;
    color: #8a8f9c; font-size: 10px; padding: 8px 0 2px; }
  .pied-maitrize img { height: 13px; width: auto; }
  @media print {
    /* Fixe : les navigateurs le répètent en bas de chaque page imprimée. */
    .pied-maitrize { position: fixed; left: 0; right: 0; bottom: 3mm; margin: 0; }
    body { padding-bottom: 12mm; }
  }
`;

/** Le pied lui-même. Sans logo lisible, l'adresse suffit. */
export function piedMaitrize(logo: string): string {
  return `<div class="pied-maitrize">${logo ? `<img alt="" src="${logo}">` : ""}<span>Maitrize · https://maitrize.com</span></div>`;
}

/**
 * La largeur des colonnes d'un tableau de déroulement, d'après leur intitulé.
 *
 * « Durée » tient en trois chiffres, « Description » porte tout le texte :
 * les répartir également donne un tableau illisible, où la description
 * s'entasse sur dix lignes pendant que la durée occupe un quart de la page.
 */
const PARTS: [RegExp, number][] = [
  [/duree|temps|minute|horaire/, 1],
  [/phase|etape|moment|numero|n°/, 1.5],
  [/description|deroulement|activite|consigne|tache|contenu|demarche/, 4.5],
  [/posture|role|enseignant|maitre|adulte|materiel|organisation|modalite|remarque|observation/, 2],
];

/** La part d'une colonne, d'après son intitulé. */
export function partDeColonne(entete: string): number {
  const propre = (entete ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return PARTS.find(([quoi]) => quoi.test(propre))?.[1] ?? 2;
}

/** Le `<colgroup>` d'un tableau, pour donner sa place à chaque colonne. */
export function colonnesDuTableau(entetes: string[]): string {
  if (!entetes.length) return "";
  const parts = entetes.map(partDeColonne);
  const total = parts.reduce((a, b) => a + b, 0) || 1;
  return `<colgroup>${parts.map((p) => `<col style="width:${((p / total) * 100).toFixed(1)}%">`).join("")}</colgroup>`;
}

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
  /* Un tableau qui annonce la largeur de ses colonnes veut qu'elle soit tenue :
     sans « fixed », le contenu reprend la main et la durée s'étale. */
  table.colonnes { table-layout: fixed; }
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
