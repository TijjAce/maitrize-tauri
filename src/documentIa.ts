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
// dans la bulle est ce qui sort sur le papier, aux titres près. Et aux
// fichiers « .md » ouverts dans l'application, écrits à la main ou ailleurs :
// d'où les blocs de code, les listes imbriquées, les titres jusqu'à « ###### ».

import { escapeHtml } from "./print";

export interface OptionsMarkdown {
  /** Dans la conversation, « # » devient un h2 ; sur le papier, un h1. */
  titres?: "chat" | "impression";
}

/** Ni lettre, ni chiffre, ni « _ » : ce qui borde un mot souligné, « _ainsi_ ». */
const HORS_MOT = "[^\\p{L}\\p{N}_]";
const SOULIGNE_GRAS = new RegExp(`(^|${HORS_MOT})__([^_\\n]+)__(?!\\p{L}|\\p{N}|_)`, "gu");
const SOULIGNE_PENCHE = new RegExp(`(^|${HORS_MOT})_([^_\\n]+)_(?!\\p{L}|\\p{N}|_)`, "gu");

/** Gras, italique, barré, code, liens ; puis les lignes à écrire et les cases à cocher. */
function enLigne(s: string): string {
  // Le code et les liens sont mis de côté : rien ne se met en forme dedans.
  const aPart: string[] = [];
  const mettreDeCote = (html: string) => `\u0000${aPart.push(html) - 1}\u0000`;
  return s
    // « `code` », ou « ``code avec un ` dedans`` » : la clôture a autant d'accents que l'ouverture.
    .replace(/(`{1,3})(?!`)((?:(?!\1)[^\n])+?)\1(?!`)/g, (_m, _a, c: string) =>
      mettreDeCote(`<code>${/^ .*\S.* $/.test(c) ? c.slice(1, -1) : c}</code>`))
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
    .replace(/~~([^~\n]+)~~/g, "<del>$1</del>")
    // Le texte est déjà échappé : un guillemet dans l'adresse est « &quot; », il ne sort pas de l'attribut.
    // Une image ne se charge pas depuis Internet : son lien suffit.
    .replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, (_m, alt: string, url: string) =>
      mettreDeCote(`<a href="${url}" target="_blank" rel="noreferrer">🖼 ${alt || "image"}</a>`))
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, mots: string, url: string) =>
      mettreDeCote(`<a href="${url}" target="_blank" rel="noreferrer">${mots}</a>`))
    // Un lien vers un fichier voisin ne mène nulle part ici : ses mots restent.
    .replace(/!?\[(\s*[^\]\s][^\]]*)\]\([^)\s]+\)/g, "$1")
    .replace(/_{3,}/g, `<span class="ligne"></span>`)
    .replace(SOULIGNE_GRAS, "$1<strong>$2</strong>")
    .replace(SOULIGNE_PENCHE, "$1<em>$2</em>")
    .replace(/\[ \]/g, `<span class="case"></span>`)
    .replace(/\[[xX]\]/g, `<span class="case cochee"></span>`)
    .replace(/\u0000(\d+)\u0000/g, (_m, i: string) => aPart[Number(i)]);
}

/** Une ligne de tableau Markdown : ses cellules, sans les barres du bord. */
const cellules = (ligne: string) => ligne.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
const estSeparateur = (ligne: string) => /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?$/.test(ligne.trim());

/** Le HTML d'un texte Markdown, échappé d'abord : rien de ce que le modèle — ou le fichier — écrit n'est du code. */
export function markdownVersHtml(texte: string, options: OptionsMarkdown = {}): string {
  const base = options.titres === "impression" ? 1 : 2;
  const titre = (niveau: number, contenu: string) => { const n = Math.min(6, base + niveau - 1); return `<h${n}>${enLigne(contenu)}</h${n}>`; };
  const html: string[] = [];
  // Les listes ouvertes, de la plus large à la plus imbriquée, avec le retrait de leurs points.
  const listes: { balise: "ul" | "ol"; retrait: number }[] = [];
  let tableau: string[][] | null = null;
  // Un bloc de code ouvert par « ``` » : ses lignes telles quelles, jusqu'à sa clôture.
  let code: { lignes: string[]; cloture: RegExp } | null = null;
  let citation = false;
  const fermerUneListe = () => {
    html.push(`</${listes.pop()!.balise}>`);
    // Une liste imbriquée vit dans le point qui la précède : il se referme avec elle.
    if (listes.length) html.push("</li>");
  };
  const fermerListe = () => { while (listes.length) fermerUneListe(); };
  const fermerTableau = () => {
    if (!tableau) return;
    const [tete, ...corps] = tableau;
    const rang = (cases: string[], balise: "th" | "td") => `<tr>${cases.map((c) => `<${balise}>${enLigne(c)}</${balise}>`).join("")}</tr>`;
    html.push(`<table>${tete ? `<thead>${rang(tete, "th")}</thead>` : ""}${corps.length ? `<tbody>${corps.map((r) => rang(r, "td")).join("")}</tbody>` : ""}</table>`);
    tableau = null;
  };
  const fermerCode = () => { if (code) { html.push(`<pre><code>${code.lignes.join("\n")}</code></pre>`); code = null; } };
  const fermer = () => { fermerListe(); fermerTableau(); fermerCode(); };
  /** Un point de liste : selon son retrait, il continue sa liste, en ouvre une dans le point d'avant, ou remonte. */
  const point = (retrait: number, balise: "ul" | "ol", numero: string, contenu: string) => {
    while (listes.length && listes[listes.length - 1].retrait > retrait + 1) fermerUneListe();
    let haut = listes[listes.length - 1];
    // Au même niveau, une autre sorte de liste : la précédente se referme.
    if (haut && retrait <= haut.retrait + 1 && haut.balise !== balise) { fermerUneListe(); haut = listes[listes.length - 1]; }
    if (!haut || retrait > haut.retrait + 1) {
      if (haut) {
        // Plus en retrait que le point d'avant : la nouvelle liste entre dedans.
        const dernier = html.length - 1;
        if (html[dernier]?.endsWith("</li>")) html[dernier] = html[dernier].slice(0, -"</li>".length);
        else html.push("<li>");
      }
      // Une liste qui reprend à 2 après un paragraphe garde sa numérotation.
      html.push(balise === "ol" && numero !== "1" ? `<ol start="${Number(numero)}">` : `<${balise}>`);
      listes.push({ balise, retrait });
    }
    // Une tâche « [ ] » a sa case pour puce.
    html.push(`<li${/^\[[ xX]\]/.test(contenu) ? ' class="tache"' : ""}>${enLigne(contenu)}</li>`);
  };

  for (const brut of escapeHtml(texte.replace(/\u0000/g, "")).split(/\r?\n/)) {
    if (code) {
      if (code.cloture.test(brut)) fermerCode(); else code.lignes.push(brut);
      continue;
    }
    const ligne = brut.replace(/\s+$/, "");
    const dansCitation = citation;
    citation = false;
    let m: RegExpMatchArray | null;
    // « ```js », « ~~~ » : un bloc de code ; « ```mot``` » sur une ligne n'en est pas un.
    if ((m = ligne.match(/^\s{0,3}(`{3,}(?=[^`]*$)|~{3,})/))) {
      fermer();
      code = { lignes: [], cloture: new RegExp(`^\\s{0,3}${m[1][0]}{${m[1].length},}\\s*$`) };
      continue;
    }
    if (/^\s*\|/.test(ligne)) {
      fermerListe();
      if (estSeparateur(ligne)) continue;
      (tableau ??= []).push(cellules(ligne));
      continue;
    }
    fermerTableau();
    if (/^\s*\[page\]\s*$/i.test(ligne)) { fermerListe(); html.push(`<div class="saut"></div>`); }
    // « --- », « *** », « * * * » : un filet. « ______ » reste une ligne où l'on écrit.
    else if (/^\s*([-*])(\s*\1){2,}\s*$/.test(ligne)) { fermerListe(); html.push("<hr>"); }
    else if ((m = ligne.match(/^(#{1,6})\s+(.*?)(?:\s+#+)?$/))) { fermerListe(); html.push(titre(m[1].length, m[2])); }
    else if ((m = ligne.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)/))) {
      const numero = m[2].match(/^\d+/)?.[0];
      point(m[1].replace(/\t/g, "    ").length, numero ? "ol" : "ul", numero ?? "", m[3]);
    }
    // Une ligne en retrait sous un point de liste en fait partie : « Calcul : ______ » reste dans l'exercice.
    else if (listes.length && /^\s{2,}\S/.test(ligne) && html[html.length - 1]?.endsWith("</li>")) {
      html[html.length - 1] = html[html.length - 1].replace(/<\/li>$/, `<br>${enLigne(ligne.trim())}</li>`);
    }
    else if ((m = ligne.match(/^\s{0,3}&gt;\s?(.*)/))) {
      fermerListe();
      const dernier = html.length - 1;
      // Les lignes qui se suivent font une seule citation.
      if (dansCitation && html[dernier]?.startsWith("<blockquote>")) {
        const avant = html[dernier].slice("<blockquote>".length, -"</blockquote>".length);
        html[dernier] = `<blockquote>${[avant, enLigne(m[1])].filter(Boolean).join("<br>")}</blockquote>`;
      }
      else html.push(`<blockquote>${enLigne(m[1])}</blockquote>`);
      citation = true;
    }
    // Une ligne vide ne referme pas la liste : ses points peuvent s'espacer.
    else if (ligne.trim() === "") { /* rien */ }
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
/**
 * Plus un document en dit, plus son texte se resserre : une fiche courte
 * s'imprime aérée, un long tableau tient sur sa feuille au lieu d'en
 * déborder. On estime les lignes qu'il prend sur une page A4 au texte
 * normal — une cinquantaine y tiennent — : une ligne de texte pour cent
 * caractères, deux pour un titre, une ligne et demie au moins pour une ligne
 * de tableau, qui s'allonge quand ses cases se remplissent.
 */
export type DensiteDocument = "aere" | "normal" | "serre" | "dense";
export function lignesDuDocument(markdown: string): number {
  let lignes = 0;
  for (const brute of markdown.split("\n")) {
    const l = brute.trim();
    if (!l) { lignes += 0.4; continue; }
    // Le filet sous l'en-tête d'un tableau ne s'imprime pas.
    if (/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?$/.test(l)) continue;
    const texte = l.replace(/[#*_`>|]/g, "").replace(/\s+/g, " ").trim();
    if (/^\|.*\|$/.test(l)) lignes += 1.6 + texte.length / 90;
    else if (/^#{1,6}\s/.test(l)) lignes += 2;
    else lignes += Math.max(1, Math.ceil(texte.length / 100));
  }
  return Math.round(lignes * 10) / 10;
}
export function densiteDuDocument(markdown: string): DensiteDocument {
  const lignes = lignesDuDocument(markdown);
  return lignes < 25 ? "aere" : lignes < 50 ? "normal" : lignes < 70 ? "serre" : "dense";
}

/** Tout se mesure depuis la taille du texte (em) : la densité la change, le reste suit. */
export const STYLE_DOCUMENT_IA = `
  .doc-ia { font-size: 13px; line-height: 1.5; color: #1c2233; }
  .doc-ia.doc-aere { font-size: 14px; line-height: 1.55; }
  .doc-ia.doc-serre { font-size: 12px; line-height: 1.45; }
  .doc-ia.doc-dense { font-size: 11px; line-height: 1.4; }
  .doc-ia h1 { font-size: 1.6em; line-height: 1.25; margin: 0 0 .6em; padding-bottom: .25em; border-bottom: 3px solid #6366f1; }
  .doc-ia h2 { font-size: 1.25em; line-height: 1.3; margin: 1.2em 0 .45em; padding: 0 0 .15em; border: 0; border-bottom: 1px solid #d9dcea; color: #2b2f6b; }
  .doc-ia h3 { font-size: 1.08em; margin: 1em 0 .3em; color: #2b2f6b; }
  .doc-ia h4, .doc-ia h5, .doc-ia h6 { font-size: 1em; margin: .9em 0 .3em; }
  .doc-ia h1, .doc-ia h2, .doc-ia h3, .doc-ia h4 { break-after: avoid; page-break-after: avoid; }
  .doc-ia p { margin: .45em 0; }
  .doc-ia ul, .doc-ia ol { margin: .45em 0; padding-left: 1.6em; }
  .doc-ia li { margin: .3em 0; }
  .doc-ia li > ul, .doc-ia li > ol { margin: .2em 0; }
  .doc-ia li.tache { list-style: none; }
  .doc-ia .ligne { display: inline-block; min-width: 60mm; border-bottom: 1.2px solid #444; height: 1.1em; vertical-align: baseline; margin: 0 3px; }
  .doc-ia .case { display: inline-block; width: 1.25em; height: 1.25em; border: 1.5px solid #333; border-radius: 1.5px; vertical-align: middle; margin-right: .4em; background: #fff; }
  .doc-ia .case.cochee { background: #333; }
  /* Les tableaux : un mot ne se coupe jamais au milieu — la feuille commune le permet, et « Étape » devenait « Étap / e »
     dans une colonne étroite. La césure, en français, découpe les mots trop longs aux bons endroits ; jamais dans un en-tête,
     qui donne sa largeur à sa colonne. */
  .doc-ia table { width: 100%; border-collapse: collapse; margin: .7em 0; font-size: .95em; }
  .doc-ia th, .doc-ia td { border: 1px solid #c9cee0; padding: .4em .6em; vertical-align: top; text-align: left;
    word-break: normal; overflow-wrap: break-word; hyphens: auto; }
  .doc-ia th { background: #eef0fe; color: #2b2f6b; font-weight: 700; hyphens: manual; }
  .doc-ia tbody tr:nth-child(even) td { background: #f8f9fd; }
  .doc-ia tr { break-inside: avoid; page-break-inside: avoid; }
  .doc-ia td p, .doc-ia th p { margin: 0; }
  .doc-ia hr { border: 0; border-top: 1px solid #c9cee0; margin: 1em 0; }
  .doc-ia .saut { break-before: page; page-break-before: always; }
  .doc-ia blockquote { border-left: 3px solid #6366f1; background: #eef0fe; margin: .6em 0; padding: .45em .9em; font-style: normal; border-radius: 0 6px 6px 0; }
  .doc-ia code { font-family: inherit; background: none; }
  .doc-ia del { color: #666; }
  .doc-ia pre { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: .9em; line-height: 1.45; background: #f5f6fa;
    border: 1px solid #ddd; border-radius: 4px; padding: .6em .8em; margin: .6em 0; white-space: pre-wrap; break-inside: avoid; }
`;

/** La feuille d'un document : son titre, son corps et son style, prêts pour `printHTML`. */
export function feuilleDuDocument(markdown: string): { titre: string; corps: string; style: string } {
  return {
    titre: titreDuDocument(markdown),
    // En français, pour que la césure découpe les mots trop longs aux bons endroits ; resserré selon ce qu'il dit.
    corps: `<div class="doc-ia doc-${densiteDuDocument(markdown)}" lang="fr">${markdownVersHtml(markdown, { titres: "impression" })}</div>`,
    style: STYLE_DOCUMENT_IA,
  };
}
