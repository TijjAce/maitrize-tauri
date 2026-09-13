// Textes mis en forme (gras, titres, listes…) des fichiers texte et des feuilles
// d'informations.
//
// Le contenu est enregistré en HTML. Il est réinjecté dans la page : on n'y
// garde donc qu'une courte liste de balises, sans attribut — ni script, ni
// lien, ni gestionnaire d'événement — quelle que soit sa provenance (copie de
// sauvegarde, autre ordinateur synchronisé).
//
// Pas de DOM ici : ces fonctions tournent aussi dans les tests.

const BALISES = new Set([
  "p", "br", "div", "b", "strong", "i", "em", "u", "s", "strike", "h1", "h2", "h3",
  "ul", "ol", "li", "blockquote", "span", "mark", "hr", "table", "thead", "tbody", "tr", "th", "td",
]);
const ALIGNEMENT = /^\s*text-align:\s*(left|center|right|justify);?\s*$/i;
const SURLIGNAGE = /^\s*background-color:\s*(#[0-9a-f]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*[\d.]+\s*)?\)|[a-z]+);?\s*$/i;
const ENTITES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: "\"", "#39": "'", apos: "'", nbsp: " " };

/** Échappe un texte pour l'insérer dans du HTML. */
export const echapper = (t: string) =>
  t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]!));

/** Vrai si le contenu est déjà du HTML mis en forme (et non un ancien texte brut). */
export function estHtml(contenu: string): boolean {
  return /<(p|br|div|h[1-3]|ul|ol|li|b|strong|i|em|u|s|span|mark|blockquote|table)\b[^>]*>/i.test(contenu);
}

/** Ne garde que les balises autorisées, sans leurs attributs (sauf alignement et surlignage). */
export function nettoyerHtml(html: string): string {
  const sans = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed|noscript|template|svg|math)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|style|iframe|object|embed|noscript|template|svg|math)\b[^>]*\/?>/gi, "");
  return sans.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^<>]*)>|<|>/g, (tout, nom?: string, attributs?: string) => {
    if (!nom) return tout === "<" ? "&lt;" : "&gt;";
    const n = nom.toLowerCase();
    if (!BALISES.has(n)) return "";
    if (tout.startsWith("</")) return n === "br" || n === "hr" ? "" : `</${n}>`;
    const style = /\bstyle\s*=\s*"([^"]*)"/i.exec(attributs ?? "")?.[1] ?? /\bstyle\s*=\s*'([^']*)'/i.exec(attributs ?? "")?.[1];
    let garde = "";
    if (style && ALIGNEMENT.test(style) && /^(p|div|h[1-3]|li|td|th)$/.test(n)) garde = ` style="${style.trim()}"`;
    else if (style && SURLIGNAGE.test(style) && (n === "span" || n === "mark")) garde = ` style="${style.trim()}"`;
    return `<${n}${garde}>`;
  });
}

/** Un contenu à afficher dans l'éditeur : l'ancien texte brut devient des paragraphes. */
export function versHtml(contenu: string): string {
  if (!contenu.trim()) return "";
  if (estHtml(contenu)) return nettoyerHtml(contenu);
  return contenu
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((paragraphe) => `<p>${echapper(paragraphe).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** Le texte lisible d'un contenu, pour un aperçu ou une recherche. */
export function texteBrut(contenu: string): string {
  if (!estHtml(contenu)) return contenu;
  return contenu
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "• ")
    .replace(/<\/(p|div|h[1-3]|li|blockquote|tr)>/gi, "\n")
    .replace(/<\/t[dh]>/gi, "\t")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#39|[a-z]+);/gi, (m, e: string) => ENTITES[e.toLowerCase()] ?? m)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Un texte proposé (par l'IA) à insérer dans le HTML, retours à la ligne compris. */
export const texteVersHtmlEnLigne = (t: string) => echapper(t.trim()).replace(/\n/g, "<br>");
