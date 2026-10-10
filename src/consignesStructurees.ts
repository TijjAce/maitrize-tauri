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
// porte déjà, ses retours à la ligne et ses phrases font les étapes, et une
// phrase qui enchaîne plusieurs actions en fait autant ; rien n'est réécrit,
// seulement découpé et mis en forme.

import { CLASSES_CONSIGNE, verbeDeLaForme } from "./caa";
import { referencesDe, sansReferences } from "./references";

/** Ce qu'est une ligne de consigne : une action à faire, une information, une aide, un exemple, ce qui dit qu'on a réussi. */
export type SorteEtape = "action" | "info" | "aide" | "exemple" | "critere";

export interface Etape { sorte: SorteEtape; html: string }

/** Ce qui ouvre une aide, un exemple, un critère de réussite. */
const OUVERTURES: [SorteEtape, RegExp][] = [
  ["critere", /^(j'ai réussi si|j’ai réussi si|tu as réussi si|c'est réussi|c’est réussi|pour vérifier|je vérifie que)/i],
  // « Tu peux » n'oblige pas, « tu dois » oblige (Meirieu) : ce qui est permis est une aide.
  ["aide", /^(aide|astuce|attention|rappel|pour t'aider|pour t’aider|si tu (bloques|hésites|ne sais pas)|(je|tu|on) peu[xt]|tu n['’]es pas obligée?|je ne suis pas obligée?)(?![\p{L}])/iu],
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
  "répète", "redis", "marque", "passe", "recompose",
]);

/** Ce qui peut précéder le verbe d'une ligne sans en être : « Puis écris… », « Ensuite, colle… ». */
const LIENS = new Set(["puis", "ensuite", "enfin", "d'abord", "après", "alors", "maintenant", "et"]);

/**
 * Les auxiliaires : un verbe qui en suit un décrit un état ou ce qui est
 * fait — « Le chemin est tracé », « Tu as colorié » —, pas une action à faire.
 */
const AUXILIAIRES = new Set(["suis", "est", "sont", "était", "étaient", "sera", "seront", "été", "es", "sommes", "êtes", "a", "ai", "as", "avons", "avez", "ont", "avait", "avaient"]);

/** Un impératif suivi de son pronom — « Écris-le », « Relis-toi » — ramené au verbe. */
const sansPronom = (mot: string) => mot.replace(/-(le|la|les|toi|moi|lui|leur|en|y|nous|vous)$/i, "");

/** Les sujets d'une consigne : « je », « tu », « on »… */
const SUJETS = new Set(["je", "j'", "tu", "on", "nous", "vous"]);
/** … et ceux qui désignent l'élève : après eux vient forcément ce qu'il fait. « On » dit aussi une vérité générale — « on ne parle pas pareil en classe ». */
const SUJETS_ELEVE = new Set(["je", "j'", "tu"]);

/** Ce qui vient entre le sujet et son verbe : la négation, les pronoms compléments — « je ne raye pas », « je le copie ». */
const PRONOMS_COMPLEMENTS = new Set(["ne", "n'", "le", "la", "les", "l'", "me", "m'", "te", "t'", "se", "s'", "lui", "leur", "y", "en", "nous", "vous"]);

/** Ce qui n'est jamais le verbe qu'on cherche, même après un sujet : « nous, vous, ils », « c'est ». */
const PAS_UN_VERBE = new Set(["il", "ils", "elle", "elles", "ce", "c'", "ça", "cela", "qui", "que", "qu'"]);

/** Les premiers mots d'un texte, la ponctuation ôtée, l'élision à part : « J'écris » donne « J' » puis « écris ». */
function motsDeTete(texte: string): { brut: string; m: string }[] {
  return texte.trim().split(/\s+/).slice(0, 8).flatMap((t) => {
    const nu = t.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
    const elision = /^(\p{L}+['’])(.+)$/u.exec(nu);
    return (elision ? [elision[1], elision[2]] : [nu]).map((brut) => ({ brut, m: brut.toLowerCase().replace(/’/g, "'") }));
  });
}

/**
 * Le verbe qui ouvre une proposition, s'il y en a un : un impératif ou un
 * verbe du lexique en tête, après un mot de liaison, un sujet et ses pronoms ;
 * ou, après « je » et « tu », le mot qui suit — c'est forcément un verbe —,
 * sauf être et avoir, qui disent un état. Sans sujet, seule la négation
 * précède le verbe : un « la » en tête est un article.
 */
function verbeDeTete(texte: string): string | null {
  const liste = motsDeTete(texte);
  let enTete = true;
  let sujet = "";
  for (const [i, { brut, m }] of liste.entries()) {
    if (!m) return null;
    if (enTete && LIENS.has(m)) continue;
    const mot = sansPronom(m);
    // « en sautant une ligne » : un gérondif dit comment faire, ce n'est pas une action de plus.
    if (i > 0 && liste[i - 1].m === "en" && mot.endsWith("ant")) return null;
    if (verbeDeLaForme(mot) || (enTete && IMPERATIFS.has(mot))) return sansPronom(brut);
    enTete = false;
    if (!sujet && SUJETS.has(m)) { sujet = m; continue; }
    if (PRONOMS_COMPLEMENTS.has(m) && (sujet || m === "ne" || m === "n'")) continue;
    return SUJETS_ELEVE.has(sujet) && !AUXILIAIRES.has(mot) && !PAS_UN_VERBE.has(mot) && !SUJETS.has(mot) ? sansPronom(brut) : null;
  }
  return null;
}

/**
 * Le verbe d'action d'une étape, c'est lui qu'on met en valeur : celui qui
 * l'ouvre, sinon un verbe du lexique dans ses premiers mots — « Chaque
 * joueur lit une carte » —, s'il ne suit pas un auxiliaire.
 */
export function verbeEnTete(html: string, portee = 6): string | null {
  const texte = texteDe(html);
  const tete = verbeDeTete(texte);
  if (tete) return tete;
  const liste = mots(texte).slice(0, portee);
  for (const [i, m] of liste.entries()) {
    // « l'entoure » : le verbe suit l'apostrophe.
    const mot = sansPronom(m.replace(/^[a-zà-ÿ]+['’]/i, ""));
    if (verbeDeLaForme(mot) && !(i > 0 && AUXILIAIRES.has(liste[i - 1].toLowerCase()))) return mot;
  }
  return null;
}

/** La sorte d'une étape : ce qu'annoncent ses premiers mots, une action si elle commence par un verbe, une information sinon. */
export function sorteDe(html: string): SorteEtape {
  const t = texteDe(html);
  for (const [sorte, motif] of OUVERTURES) if (motif.test(t)) return sorte;
  return verbeEnTete(html) ? "action" : "info";
}

/** Une proposition qui commence par une action : son verbe en tête (voir verbeDeTete). */
const commenceParUneAction = (texte: string) => verbeDeTete(texte) !== null;

/**
 * Ce qui, dans une phrase, pose une condition, un moment ou un but dont
 * dépend la suite : « Si je me suis trompé, je… », « Quand tu as fini, … ».
 * Une telle phrase ne se coupe pas.
 */
const SUBORDONNANTS = /(^|[^\p{L}'’])(si|s['’]ils?|quand|lorsque|lorsqu['’]|dès que|pour|avant de|avant d['’]|après avoir|une fois que|tant que|pendant que|jusqu['’]à ce)(?![\p{L}])/iu;

/**
 * Une étape qui enchaîne plusieurs actions — « J'écoute, je répète,
 * j'écris… », « Compte les cubes et écris le nombre » — coupée en autant
 * d'étapes : une phrase, une action (Cap école inclusive, « Lecture et
 * compréhension des consignes » ; règles du FALC). On ne coupe qu'entre deux
 * propositions qui commencent chacune par leur verbe ; jamais une phrase qui
 * pose une condition ou un but, ni entre parenthèses ou guillemets. Rien n'est
 * réécrit : la coupure reçoit son point, la suite sa majuscule.
 */
export function enActions(html: string): string[] {
  if (sorteDe(html) !== "action") return [html];
  const masque = html.replace(/<[^>]*>/g, (t) => "\u0001".repeat(t.length));
  const separateur = /,\s+|\s+et\s+|\s*;\s+|\s+(?=puis\s)/g;
  const coupures: { debut: number; fin: number }[] = [];
  let depuis = 0;
  for (let m = separateur.exec(masque); m; m = separateur.exec(masque)) {
    if (profondeurA(html, m.index) !== 0) continue;
    const avant = masque.slice(depuis, m.index);
    // Entre parenthèses ou guillemets, on est dans une citation : on n'y coupe pas.
    if ((avant.match(/[(«“]/g) ?? []).length > (avant.match(/[)»”]/g) ?? []).length) continue;
    const suite = texteDe(html.slice(m.index + m[0].length)).replace(/^et\s+/i, "");
    // Après deux-points, la phrase explique ou énumère — « un pronom : il, elle, nous… » — : on ne la coupe plus.
    if (/:/.test(avant) || SUBORDONNANTS.test(texteDe(html.slice(depuis, m.index)))) continue;
    if (!commenceParUneAction(texteDe(html.slice(depuis, m.index))) || !commenceParUneAction(suite)) continue;
    coupures.push({ debut: m.index, fin: m.index + m[0].length });
    depuis = m.index + m[0].length;
  }
  if (!coupures.length) return [html];
  const bornes = [0, ...coupures.flatMap((c) => [c.debut, c.fin]), html.length];
  const morceaux: string[] = [];
  for (let i = 0; i < bornes.length; i += 2) morceaux.push(html.slice(bornes[i], bornes[i + 1]).trim());
  return morceaux.map((m, i) => {
    let x = i > 0 ? m.replace(/^((?:<[^>]*>)*)et\s+/i, "$1") : m;
    // La majuscule à la première lettre du texte, hors des balises.
    if (i > 0) x = x.replace(/^((?:<[^>]*>|\s)*)(\p{Ll})/u, (_t, balises: string, l: string) => balises + l.toUpperCase());
    // Le point à la fin d'une coupure — sans le tiret qui fermait une incise ; la phrase d'origine garde le sien.
    if (i < morceaux.length - 1) x = x.replace(/\s+[—–]\s*((?:<\/[^>]+>\s*)*)$/, "$1");
    if (i < morceaux.length - 1 && !/[.!?…:]\s*((?:<\/[^>]+>)\s*)*$/.test(x)) x = x.replace(/((?:<\/[^>]+>\s*)*)$/, ".$1");
    return x;
  });
}

/**
 * Les étapes d'une consigne : ses lignes, puis la numérotation qu'elle porte
 * déjà, sinon ses phrases ; une étape qui enchaîne plusieurs actions en fait
 * autant. Les références ont été retirées avant.
 */
export function etapesDe(interieur: string): Etape[] {
  const lignes = interieur.split(/<br\s*\/?>/i).map((l) => l.trim()).filter((l) => texteDe(l) !== "");
  const morceaux = lignes.flatMap((l) => numerotee(l) ?? enPhrases(l)).flatMap(enActions);
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

/**
 * Les étapes en liste : les actions numérotées, le reste à part, chacun sa
 * marque. Une aide, un exemple, ce qui dit qu'on a réussi portent, à la place
 * du numéro, un dessin qu'on reconnaît sans lire — un triangle « ! », un œil,
 * une case à cocher — et qui reste lisible photocopié en noir et blanc : la
 * couleur n'est jamais le seul indice (Cap école inclusive, « Soutenir la
 * prise d'indices visuels » ; WCAG 1.4.1). Un caractère invisible donne à
 * la marque la ligne de base du texte, comme le chiffre à un numéro.
 */
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
    const marque = e.sorte === "info" ? "" : `<span class="cs-num cs-marque cs-marque-${e.sorte}" aria-hidden="true">&#8203;</span>`;
    return `<li class="cs-etape cs-${e.sorte}">${marque}<span class="cs-texte">${ouvertureEnValeur(e.html, e.sorte)}</span></li>`;
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
    // Un gras collé au mot qui le suit, après une phrase finie — « … à la maison. <b>Bataille</b>Chacun… » —
    // était un titre posé sur sa ligne par la règle encadrée : il le reste.
    const colle = /[.!?…]$/.test(texteDe(avant)) && /^\p{L}/u.test(propre.slice(m.index + m[0].length));
    const enDebutDeLigne = texteDe(avant) === "" || /<br\s*\/?>\s*$/i.test(avant) || colle;
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
  .cs .cs-info { padding-left: calc(1.06em + 1.6mm); color: #374151; }
  /* Sur une planche — des cartes, un gabarit à découper —, tout est compté au millimètre : la règle garde sa hauteur,
     chaque titre à gauche, ses étapes, toujours numérotées, à la suite sur la ligne. */
  .page > .regle.cs { display: grid; grid-template-columns: auto 1fr; column-gap: 3mm; align-items: baseline; }
  .page > .regle.cs .cs-titre { grid-column: 1; margin: 0; }
  .page > .regle.cs .cs-etapes { grid-column: 2; display: flex; flex-wrap: wrap; column-gap: 3mm; }
  .page > .regle.cs .cs-etapes:first-child, .page > .regle.cs > .reference { grid-column: 1 / -1; }
  .page > .regle.cs .cs-etape { flex: 0 1 auto; }
  /* Les marques d'une aide, d'un exemple, d'une réussite : à la place du numéro, à sa taille. */
  .cs .cs-num.cs-marque { background: none center / contain no-repeat; border-radius: 0; color: transparent; }
  .cs .cs-num.cs-marque-aide { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cpath d='M10 2.4 18.4 17.2H1.6z' fill='%23b45309' stroke='%23b45309' stroke-width='1.8' stroke-linejoin='round'/%3E%3Cpath d='M10 7.2v4.9' stroke='%23fff' stroke-width='2.3' stroke-linecap='round'/%3E%3Ccircle cx='10' cy='14.9' r='1.25' fill='%23fff'/%3E%3C/svg%3E"); }
  .cs .cs-num.cs-marque-exemple { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cpath d='M1.3 10Q10 1.6 18.7 10Q10 18.4 1.3 10Z' fill='%23fff' stroke='%23374151' stroke-width='1.8' stroke-linejoin='round'/%3E%3Ccircle cx='10' cy='10' r='3' fill='%23374151'/%3E%3C/svg%3E"); }
  .cs .cs-num.cs-marque-critere { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Crect x='2.2' y='2.2' width='15.6' height='15.6' rx='2.4' fill='%23fff' stroke='%23166534' stroke-width='2.2'/%3E%3C/svg%3E"); }
  .cs .cs-aide { color: #92400e; }
  .cs .cs-exemple { color: #374151; }
  .cs .cs-critere { color: #166534; }
  .cs .cs-libelle { font-weight: 800; }
  .cs .consigne-pictos { margin: 0 1mm 0 0; }
`;
