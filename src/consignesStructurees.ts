// ── Des consignes qu'on reconnaît d'un coup d'œil ─────────────────────────
//
// Une consigne écrite d'un seul tenant — « 1. Je lis le texte en silence,
// puis à voix haute. 2. Je compte. 3. Je le copie… » — se lit mal, et plus
// mal encore pour l'élève qui déchiffre. Chaque consigne de chaque feuille
// se présente donc de la même façon, dans tout Fabriquer : un cadre qu'on
// reconnaît, une action par ligne, numérotée, le verbe d'action en tête et
// mis en valeur ; à part, ce qui aide, ce qui montre un exemple, et ce qui
// dit qu'on a réussi.
//
// On travaille sur le HTML des feuilles telles que l'application les écrit,
// comme la consigne réécrite et les pictos des verbes : la consigne est un
// élément qui porte l'une des classes des consignes. La numérotation qu'elle
// porte déjà, ses retours à la ligne et ses phrases font les étapes ; rien
// n'est réécrit, seulement découpé et mis en forme.

import { CLASSES_CONSIGNE, verbeDeLaForme } from "./caa";
import { referencesDe, sansReferences } from "./references";

/** Ce qu'est une ligne de consigne : une action à faire, une information, une aide, un exemple, ce qui dit qu'on a réussi. */
export type SorteEtape = "action" | "info" | "aide" | "exemple" | "critere";

export interface Etape { sorte: SorteEtape; html: string }

/** Ce qui ouvre une aide, un exemple, un critère de réussite. */
const OUVERTURES: [SorteEtape, RegExp][] = [
  ["critere", /^(j'ai réussi si|j’ai réussi si|tu as réussi si|c'est réussi|c’est réussi|pour vérifier|je vérifie que)/i],
  ["aide", /^(aide|astuce|attention|rappel|pour t'aider|pour t’aider|si tu (bloques|hésites|ne sais pas))\b/i],
  ["exemple", /^(exemple|par exemple)\b/i],
];

/** Le texte d'un morceau de HTML, sans balises, les espaces resserrés. */
const texteDe = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

/** Les balises qui n'ont pas de fermante. */
const VIDES = /^(br|img|input|hr|wbr|col|source)$/i;

/** La profondeur d'imbrication des balises à cette position : on ne coupe qu'au niveau 0. */
function profondeurA(html: string, position: number): number {
  let n = 0;
  const re = /<(\/?)([a-z0-9]+)\b[^>]*?(\/?)>/gi;
  for (let m = re.exec(html); m && m.index < position; m = re.exec(html)) {
    if (m[3] || VIDES.test(m[2])) continue;
    n += m[1] ? -1 : 1;
  }
  return n;
}

/** Le HTML coupé aux endroits où le motif répond dans le texte, hors des balises et à leur niveau 0 ; le motif lui-même disparaît. */
function couperHorsBalises(html: string, motif: RegExp, garder = (_m: RegExpExecArray) => true): string[] {
  const masque = html.replace(/<[^>]*>/g, (t) => "\u0001".repeat(t.length));
  const re = new RegExp(motif.source, motif.flags.includes("g") ? motif.flags : `${motif.flags}g`);
  const morceaux: string[] = [];
  let depuis = 0;
  for (let m = re.exec(masque); m; m = re.exec(masque)) {
    if (m[0].length === 0) { re.lastIndex += 1; continue; }
    if (profondeurA(html, m.index) !== 0 || !garder(m)) continue;
    morceaux.push(html.slice(depuis, m.index));
    depuis = m.index + m[0].length;
  }
  morceaux.push(html.slice(depuis));
  return morceaux.map((x) => x.trim()).filter((x) => texteDe(x) !== "");
}

/**
 * La numérotation qu'une ligne porte déjà — « 1. … 2. … 3. … » —, si elle
 * commence à 1 et se suit : sans quoi « page 3. Puis » passerait pour une
 * étape.
 */
function numerotee(ligne: string): string[] | null {
  const masque = ligne.replace(/<[^>]*>/g, (t) => "\u0001".repeat(t.length));
  const re = /(^|\s)(\d{1,2})[.)]\s+(?=\S)/g;
  const reperes: { index: number; fin: number }[] = [];
  let attendu = 1;
  for (let m = re.exec(masque); m; m = re.exec(masque)) {
    if (Number(m[2]) !== attendu || profondeurA(ligne, m.index) !== 0) continue;
    reperes.push({ index: m.index + m[1].length, fin: m.index + m[0].length });
    attendu += 1;
  }
  if (reperes.length < 2) return null;
  const avant = ligne.slice(0, reperes[0].index).trim();
  const etapes = reperes.map((r, i) => ligne.slice(r.fin, i + 1 < reperes.length ? reperes[i + 1].index : ligne.length).trim());
  return [...(texteDe(avant) ? [avant] : []), ...etapes].filter((x) => texteDe(x) !== "");
}

/** Une ligne coupée en phrases : après un point, un point d'exclamation ou d'interrogation, devant une majuscule. */
const enPhrases = (ligne: string) => couperHorsBalises(ligne, /(?<=[.!?…])\s+(?=[A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ«])/);

/** Les mots d'un texte, dans l'ordre. */
const mots = (t: string) => t.split(/[^\p{L}'’-]+/u).filter(Boolean);

/**
 * D'autres impératifs des consignes, que le lexique des pictos n'a pas. Ils
 * ne comptent qu'en tête de ligne — « Suis le chemin » —, là où ils ne
 * peuvent pas être autre chose : « je suis » n'est pas une consigne.
 */
const IMPERATIFS = new Set([
  "code", "pense", "paie", "imagine", "reproduis", "termine", "suis", "récris", "réécris", "fais", "prends", "construis", "repère", "transforme",
  "mets", "rappelle", "pique", "ferme", "garde", "prépare", "entraîne", "ouvre", "tourne", "avance", "recule", "pivote", "aligne", "commence",
  "continue", "recommence", "réponds", "explique", "invente", "cache", "donne", "fabrique", "lève", "présente", "propose", "rassemble", "regroupe",
  "remplis", "remplace", "résous", "retiens", "utilise", "vise", "mime", "chante", "récite", "épelle", "frappe", "marche", "saute", "attrape",
  "verse", "transvase", "pèse", "soupèse", "vide", "estime", "range", "dispose", "assemble", "partage", "distribue", "écoute",
]);

/** Ce qui peut précéder le verbe d'une ligne sans en être : « Puis écris… », « Ensuite, colle… ». */
const LIENS = new Set(["puis", "ensuite", "enfin", "d'abord", "après", "alors", "maintenant", "et"]);

/** Un impératif suivi de son pronom — « Écris-le », « Relis-toi » — ramené au verbe. */
const sansPronom = (mot: string) => mot.replace(/-(le|la|les|toi|moi|lui|leur|en|y|nous|vous)$/i, "");

/** Le verbe d'action d'une étape, s'il vient dans ses premiers mots : c'est lui qu'on met en valeur. */
export function verbeEnTete(html: string, portee = 6): string | null {
  const liste = mots(texteDe(html)).slice(0, portee);
  // En tête de ligne, après un mot de liaison au plus : les impératifs que le lexique n'a pas.
  const premier = liste.findIndex((m) => !LIENS.has(m.toLowerCase().replace(/’/g, "'")));
  if (premier >= 0 && premier <= 1) {
    const mot = sansPronom(liste[premier]);
    if (IMPERATIFS.has(mot.toLowerCase())) return mot;
  }
  for (const m of liste) {
    // « j'écris », « l'entoure » : le verbe suit l'apostrophe.
    const mot = sansPronom(m.replace(/^[a-zà-ÿ]+['’]/i, ""));
    if (verbeDeLaForme(mot)) return mot;
  }
  return null;
}

/** La sorte d'une étape : ce qu'annoncent ses premiers mots, une action si elle commence par un verbe, une information sinon. */
export function sorteDe(html: string): SorteEtape {
  const t = texteDe(html);
  for (const [sorte, motif] of OUVERTURES) if (motif.test(t)) return sorte;
  return verbeEnTete(html) ? "action" : "info";
}

/**
 * Les étapes d'une consigne : ses lignes, puis la numérotation qu'elle porte
 * déjà, sinon ses phrases. Les références ont été retirées avant.
 */
export function etapesDe(interieur: string): Etape[] {
  const lignes = interieur.split(/<br\s*\/?>/i).map((l) => l.trim()).filter((l) => texteDe(l) !== "");
  const morceaux = lignes.flatMap((l) => numerotee(l) ?? enPhrases(l));
  return morceaux.map((html) => ({ sorte: sorteDe(html), html }));
}

/** Le verbe d'action mis en valeur : le premier mot qui en est un, parmi les premiers de l'étape. */
function verbeEnValeur(html: string): string {
  const verbe = verbeEnTete(html);
  if (!verbe) return html;
  const echappe = verbe.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Le mot entier, hors des balises : la première fois qu'il apparaît dans le texte.
  const masque = html.replace(/<[^>]*>/g, (t) => "\u0001".repeat(t.length));
  const m = new RegExp(`(^|[^\\p{L}])(${echappe})(?![\\p{L}])`, "u").exec(masque);
  if (!m) return html;
  const debut = m.index + m[1].length;
  return `${html.slice(0, debut)}<b class="cs-verbe">${html.slice(debut, debut + verbe.length)}</b>${html.slice(debut + verbe.length)}`;
}

/** Le mot qui ouvre une aide, un exemple, un critère — « Attention », « Exemple », « J'ai réussi si » — mis en gras : il dit ce qu'est la ligne. */
function ouvertureEnValeur(html: string, sorte: SorteEtape): string {
  const motif = OUVERTURES.find(([s]) => s === sorte)?.[1];
  if (!motif || /^\s*</.test(html)) return html;
  const m = motif.exec(html.trimStart());
  if (!m) return html;
  const debut = html.length - html.trimStart().length;
  return `${html.slice(0, debut)}<b class="cs-libelle">${m[0]}</b>${html.slice(debut + m[0].length)}`;
}

/** Les étapes en liste : les actions numérotées, le reste à part, chacun sa marque. */
export function htmlDesEtapes(etapes: Etape[]): string {
  const actions = etapes.filter((e) => e.sorte === "action").length;
  let n = 0;
  const lignes = etapes.map((e) => {
    if (e.sorte === "action") {
      n += 1;
      // Une seule action : pas de numéro, le verbe suffit.
      const num = actions > 1 ? `<span class="cs-num">${n}</span>` : `<span class="cs-num cs-seule" aria-hidden="true">▸</span>`;
      return `<li class="cs-etape cs-action">${num}<span class="cs-texte">${verbeEnValeur(e.html)}</span></li>`;
    }
    return `<li class="cs-etape cs-${e.sorte}"><span class="cs-texte">${ouvertureEnValeur(e.html, e.sorte)}</span></li>`;
  });
  return `<ol class="cs-etapes">${lignes.join("")}</ol>`;
}

/**
 * L'intérieur d'une consigne, structuré : un titre en gras en tête (une
 * règle encadrée en a souvent — « Fabrication », « Règle du jeu ») reste
 * titre, chaque section ses étapes ; les références suivent, à la fin.
 */
export function structurerInterieur(interieur: string): string {
  const references = referencesDe(interieur);
  const propre = sansReferences(interieur);
  // Un gras qui ouvre une ligne et que le texte suit sans deux-points est un
  // titre de section ; au milieu d'une phrase, ou suivi de « : », il reste
  // une mise en valeur.
  const gras = /<b\b[^>]*>([\s\S]*?)<\/b>/g;
  const sections: { titre: string; corps: string }[] = [];
  let titre = "";
  let debutCorps = 0;
  for (let m = gras.exec(propre); m; m = gras.exec(propre)) {
    const avant = propre.slice(debutCorps, m.index);
    const enDebutDeLigne = texteDe(avant) === "" || /<br\s*\/?>\s*$/i.test(avant);
    const apres = propre.slice(m.index + m[0].length).replace(/^\s+/, "");
    if (!enDebutDeLigne || /^[:,;.]/.test(apres) || texteDe(m[1]) === "") continue;
    if (titre || texteDe(avant)) sections.push({ titre, corps: avant });
    titre = m[1];
    debutCorps = m.index + m[0].length;
  }
  sections.push({ titre, corps: propre.slice(debutCorps) });
  const html = sections.map((s) => {
    const etapes = etapesDe(s.corps);
    return (s.titre ? `<div class="cs-titre">${s.titre}</div>` : "") + (etapes.length ? htmlDesEtapes(etapes) : "");
  }).join("");
  return html + (references.length ? ` ${references.join(" ")}` : "");
}

const OUVERTURE = /<(p|div)\b([^>]*\bclass="([^"]*)"[^>]*)>/g;

/** La fin de l'élément ouvert juste avant `debut` : après sa balise fermante, celles de même nom imbriquées comptées. */
function finDeLElement(html: string, balise: string, debut: number): number {
  const re = new RegExp(`<(/?)${balise}\\b[^>]*>`, "gi");
  re.lastIndex = debut;
  let profondeur = 1;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    if (m[0].endsWith("/>")) continue;
    profondeur += m[1] ? -1 : 1;
    if (profondeur === 0) return m.index;
  }
  return -1;
}

/**
 * Les consignes d'une feuille, structurées. Un paragraphe devient un bloc :
 * une liste ne vit pas dans un paragraphe. Une consigne déjà structurée, ou
 * qui porte déjà ses pictos, ne bouge pas.
 */
export function structurerConsignesHtml(html: string): string {
  let sortie = "";
  let position = 0;
  OUVERTURE.lastIndex = 0;
  for (let m = OUVERTURE.exec(html); m; m = OUVERTURE.exec(html)) {
    const classes = m[3].split(/\s+/);
    if (!classes.some((c) => CLASSES_CONSIGNE.includes(c)) || classes.includes("cs")) continue;
    const debut = m.index + m[0].length;
    const fin = finDeLElement(html, m[1], debut);
    if (fin < 0) continue;
    const interieur = html.slice(debut, fin);
    if (/consigne-pictos|cs-etapes|<(ol|ul|table|div|p)\b/i.test(interieur)) continue;
    const attributs = m[2].replace(/\bclass="([^"]*)"/, (_, c: string) => `class="${c} cs"`);
    sortie += `${html.slice(position, m.index)}<div${attributs}>${structurerInterieur(interieur)}</div>`;
    position = fin + `</${m[1]}>`.length;
    OUVERTURE.lastIndex = position;
  }
  return sortie + html.slice(position);
}

/**
 * Le style des consignes structurées, à l'écran comme sur le papier. La
 * couleur double toujours une autre marque — le numéro, le gras, le libellé :
 * une feuille photocopiée en noir et blanc se lit encore.
 */
export const STYLE_CONSIGNES_STRUCTUREES = `
  .cs { --cs-couleur: #1d4ed8; border-left: 1.6mm solid var(--cs-couleur) !important; padding-left: 3mm !important; }
  /* La règle encadrée perd un peu de son blanc : les étapes, une par ligne, en prennent la place. */
  .regle.cs { padding-top: 1.6mm !important; padding-bottom: 1.6mm !important; }
  .cs .cs-titre { font-weight: 700; margin: 0 0 1mm; }
  .cs .cs-titre:not(:first-child) { margin-top: 2mm; }
  .cs .cs-etapes { list-style: none; margin: 0; padding: 0; }
  .cs .cs-etape { display: flex; align-items: baseline; gap: 1.6mm; margin: 0; line-height: 1.35; }
  .cs .cs-etape:last-child { margin-bottom: 0; }
  .cs .cs-texte { flex: 1; min-width: 0; }
  .cs .cs-num { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 1.25em; height: 1.25em;
    border-radius: 50%; background: var(--cs-couleur); color: #fff; font-weight: 800; font-size: 0.85em; line-height: 1; }
  .cs .cs-num.cs-seule { background: none; color: var(--cs-couleur); width: auto; font-size: 1em; }
  .cs .cs-verbe { color: var(--cs-couleur); font-weight: 800; }
  /* Dans une règle encadrée, un gras était un titre, sur sa ligne : dans une étape, il reste dans la phrase. */
  .cs .cs-etape .cs-texte b { display: inline; margin: 0; }
  .cs .cs-info, .cs .cs-aide, .cs .cs-exemple, .cs .cs-critere { padding-left: calc(1.06em + 1.6mm); }
  .cs .cs-info { color: #374151; }
  .cs .cs-aide { color: #92400e; }
  .cs .cs-exemple { color: #374151; }
  .cs .cs-critere { color: #166534; }
  .cs .cs-libelle { font-weight: 800; }
  .cs .consigne-pictos { margin: 0 1mm 0 0; }
`;
