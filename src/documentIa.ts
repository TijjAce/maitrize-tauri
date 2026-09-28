// L'assistant fabrique des documents : une fiche, un mot aux familles, une
// affiche, une grille — écrits en Markdown par le modèle, mis en page ici,
// puis imprimés ou déposés sur le bureau en PDF.
//
// Le Markdown est le bon contrat avec le modèle : il l'écrit bien, il se lit
// dans la conversation, et il se transforme sans surprise. On y ajoute trois
// conventions pour la classe : `______` pour une ligne où l'élève écrit,
// `[ ]` pour une case à cocher, `[page]` pour changer de page.
//
// Le rendu sert aussi à la conversation (composant Markdown) : ce qu'on lit
// dans la bulle est ce qui sort sur le papier, aux titres près.

import { escapeHtml } from "./print";

export interface OptionsMarkdown {
  /** Dans la conversation, « # » devient un h2 ; sur le papier, un h1. */
  titres?: "chat" | "impression";
}

/** Gras, italique, code, liens ; puis les lignes à écrire et les cases à cocher. */
function enLigne(s: string): string {
  return s
    .replace(/`([^`]+)`/g, (_m, c) => `<code>${c}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
    // Le texte est déjà échappé : un guillemet dans l'adresse est « &quot; », il ne sort pas de l'attribut.
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/_{3,}/g, `<span class="ligne"></span>`)
    .replace(/\[ \]/g, `<span class="case"></span>`)
    .replace(/\[[xX]\]/g, `<span class="case cochee"></span>`);
}

/** Une ligne de tableau Markdown : ses cellules, sans les barres du bord. */
const cellules = (ligne: string) => ligne.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
const estSeparateur = (ligne: string) => /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?$/.test(ligne.trim());

/** Le HTML d'un texte Markdown, échappé d'abord : rien de ce que le modèle écrit n'est du code. */
export function markdownVersHtml(texte: string, options: OptionsMarkdown = {}): string {
  const base = options.titres === "impression" ? 1 : 2;
  const titre = (niveau: number, contenu: string) => { const n = Math.min(6, base + niveau - 1); return `<h${n}>${enLigne(contenu)}</h${n}>`; };
  const html: string[] = [];
  let liste: "ul" | "ol" | null = null;
  let tableau: string[][] | null = null;
  const fermerListe = () => { if (liste) { html.push(`</${liste}>`); liste = null; } };
  const fermerTableau = () => {
    if (!tableau) return;
    const [tete, ...corps] = tableau;
    const rang = (cases: string[], balise: "th" | "td") => `<tr>${cases.map((c) => `<${balise}>${enLigne(c)}</${balise}>`).join("")}</tr>`;
    html.push(`<table>${tete ? `<thead>${rang(tete, "th")}</thead>` : ""}${corps.length ? `<tbody>${corps.map((r) => rang(r, "td")).join("")}</tbody>` : ""}</table>`);
    tableau = null;
  };
  const fermer = () => { fermerListe(); fermerTableau(); };

  for (const brut of escapeHtml(texte).split("\n")) {
    const ligne = brut.replace(/\s+$/, "");
    let m: RegExpMatchArray | null;
    if (/^\s*\|/.test(ligne)) {
      fermerListe();
      if (estSeparateur(ligne)) continue;
      (tableau ??= []).push(cellules(ligne));
      continue;
    }
    fermerTableau();
    if (/^\s*\[page\]\s*$/i.test(ligne)) { fermerListe(); html.push(`<div class="saut"></div>`); }
    else if (/^\s*(-{3,}|\*{3,})\s*$/.test(ligne)) { fermerListe(); html.push("<hr>"); }
    else if ((m = ligne.match(/^###\s+(.*)/))) { fermerListe(); html.push(titre(3, m[1])); }
    else if ((m = ligne.match(/^##\s+(.*)/))) { fermerListe(); html.push(titre(2, m[1])); }
    else if ((m = ligne.match(/^#\s+(.*)/))) { fermerListe(); html.push(titre(1, m[1])); }
    else if ((m = ligne.match(/^\s*[-*]\s+(.*)/))) { if (liste !== "ul") { fermerListe(); html.push("<ul>"); liste = "ul"; } html.push(`<li>${enLigne(m[1])}</li>`); }
    else if ((m = ligne.match(/^\s*(\d+)[.)]\s+(.*)/))) {
      // Une liste qui reprend à 2 après un paragraphe garde sa numérotation.
      if (liste !== "ol") { fermerListe(); html.push(m[1] === "1" ? "<ol>" : `<ol start="${Number(m[1])}">`); liste = "ol"; }
      html.push(`<li>${enLigne(m[2])}</li>`);
    }
    // Une ligne en retrait sous un point de liste en fait partie : « Calcul : ______ » reste dans l'exercice.
    else if (liste && /^\s{2,}\S/.test(ligne) && html[html.length - 1]?.endsWith("</li>")) {
      html[html.length - 1] = html[html.length - 1].replace(/<\/li>$/, `<br>${enLigne(ligne.trim())}</li>`);
    }
    else if ((m = ligne.match(/^&gt;\s?(.*)/))) { fermerListe(); html.push(`<blockquote>${enLigne(m[1])}</blockquote>`); }
    else if (ligne.trim() === "") { fermerListe(); }
    else { fermerListe(); html.push(`<p>${enLigne(ligne)}</p>`); }
  }
  fermer();
  return html.join("");
}

/** Le titre d'un document : son premier « # », sinon sa première ligne. */
export function titreDuDocument(markdown: string): string {
  const lignes = markdown.split("\n").map((l) => l.trim()).filter(Boolean);
  const brut = lignes.find((l) => /^#\s+/.test(l))?.replace(/^#\s+/, "") ?? lignes[0] ?? "";
  const propre = brut.replace(/^#+\s*/, "").replace(/[*_`]/g, "").trim();
  return (propre || "Document").slice(0, 80);
}

/** Un texte qui a la forme d'un document : un titre, ou plusieurs parties. */
export const estUnDocument = (markdown: string) =>
  /^#\s+\S/m.test(markdown) || (markdown.match(/^##\s+\S/gm)?.length ?? 0) >= 2;

/** Ce qu'on dit au modèle pour qu'il écrive un document, et rien d'autre. */
export function consigneDocument(): string {
  return [
    "Tu fabriques un document imprimable pour une classe de primaire ou d'IME. Tu réponds par le document seul, en Markdown :",
    "pas de phrase d'introduction ni de conclusion, pas de commentaire pour l'enseignant — sauf, si c'est utile, une dernière partie « ## Pour l'adulte ».",
    "Règles de forme : un titre en « # » ; des parties en « ## » ; si le document est pour un élève, la ligne « Prénom : ______ Date : ______ » juste sous le titre ;",
    "des consignes courtes, une action par phrase, un verbe d'action, des mots connus ; des exercices numérotés ;",
    "« ______ » (six tirets bas) pour chaque ligne où l'élève écrit, une par réponse attendue ; « [ ] » pour une case à cocher ;",
    "un tableau Markdown quand il faut aligner ; « [page] » seul sur une ligne pour changer de page ; ni image ni lien.",
    "Pense aux élèves qui lisent peu : phrases courtes, un exercice par idée, de la place pour répondre.",
  ].join(" ");
}

/** Des départs, pour apprendre le geste. */
export const SUGGESTIONS_DOCUMENT = [
  "Une fiche de 6 problèmes de partage pour des CE1, en gros caractères, une ligne pour chaque réponse.",
  "Un mot aux familles pour annoncer la sortie au marché de vendredi, avec un coupon à découper.",
  "Une affiche des règles de la classe en cinq phrases courtes, une case à cocher devant chacune.",
  "Une grille d'observation d'un élève sur la semaine : autonomie, entrée dans l'activité, relations aux autres.",
];

/** Le style du document sur le papier. */
export const STYLE_DOCUMENT_IA = `
  .doc-ia { font-size: 15px; line-height: 1.6; }
  .doc-ia h1 { font-size: 24px; margin: 0 0 8px; }
  .doc-ia h2 { font-size: 18px; margin: 18px 0 6px; border: 0; padding: 0; }
  .doc-ia h3 { font-size: 16px; margin: 14px 0 4px; }
  .doc-ia p { margin: 6px 0; }
  .doc-ia ul, .doc-ia ol { margin: 6px 0; padding-left: 24px; }
  .doc-ia li { margin: 5px 0; }
  .doc-ia .ligne { display: inline-block; min-width: 60mm; border-bottom: 1.2px solid #444; height: 1.1em; vertical-align: baseline; margin: 0 3px; }
  .doc-ia .case { display: inline-block; width: 6mm; height: 6mm; border: 1.5px solid #333; border-radius: 1.5px; vertical-align: middle; margin-right: 6px; background: #fff; }
  .doc-ia .case.cochee { background: #333; }
  .doc-ia table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  .doc-ia th, .doc-ia td { border: 1px solid #555; padding: 6px 8px; font-size: 14px; vertical-align: top; }
  .doc-ia th { background: #f0f2f8; }
  .doc-ia hr { border: 0; border-top: 1px solid #999; margin: 12px 0; }
  .doc-ia .saut { break-before: page; page-break-before: always; }
  .doc-ia blockquote { border-left: 3px solid #6366f1; background: #eef0fe; margin: 8px 0; padding: 6px 12px; font-style: normal; }
  .doc-ia code { font-family: inherit; background: none; }
`;

/** La feuille d'un document : son titre, son corps et son style, prêts pour `printHTML`. */
export function feuilleDuDocument(markdown: string): { titre: string; corps: string; style: string } {
  return {
    titre: titreDuDocument(markdown),
    corps: `<div class="doc-ia">${markdownVersHtml(markdown, { titres: "impression" })}</div>`,
    style: STYLE_DOCUMENT_IA,
  };
}
