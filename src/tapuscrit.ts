// ── Le tapuscrit d'une séance : ses consignes en pictogrammes ─────────────
//
// Les consignes d'une séance s'écrivent à part du déroulement, une par ligne,
// courtes : c'est ce qui se dit aux élèves, et rien d'autre ne se traduit.
// Chaque mot qui porte le sens — le geste, l'objet, le lieu, la négation —
// prend son pictogramme ; les petits mots restent écrits, pour que la phrase
// se lise encore. Un picto qui se trompe de sens se change d'un clic, et le
// choix vaut ensuite pour ce mot partout (réglage partagé « caa:tapuscrit »).
//
// L'enseignant l'a voulu en octobre 2026 : simplifier l'entrée dans la tâche,
// avoir une sorte de tapuscrit de la séance. Il s'imprime, à la demande, dans
// le cahier journal (voir journalTapuscrit.ts).

import type { MotATraduire } from "./api";
import { VERBES_CONSIGNE, verbeDeLaForme, type Lexique } from "./caa";
import { banqueDe, type RefPicto } from "./pictosAppoint";
import { escapeHtml } from "./print";

/** Une consigne tient en une phrase ou deux : au-delà, elle ne s'entend plus d'un coup. */
export const CONSIGNE_MAX = 140;
/** Et une séance en donne quelques-unes, pas un déroulement. */
export const CONSIGNES_MAX = 8;

/** Les consignes d'une séance, telles qu'elles sont gardées : une par ligne. */
export function lireConsignes(texte: string | null | undefined): string[] {
  return (texte ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

/** La forme gardée : une consigne par ligne, chacune bornée, sans ligne vide. */
export function ecrireConsignes(consignes: string[]): string {
  return consignes
    .map((c) => c.replace(/\s+/g, " ").trim().slice(0, CONSIGNE_MAX).trim())
    .filter(Boolean)
    .slice(0, CONSIGNES_MAX)
    .join("\n");
}

// ── Les mots d'une consigne ───────────────────────────────────────────────

/** Un mot de la consigne, tel qu'il se montre et tel qu'il se cherche. */
export interface MotDeConsigne {
  /** Tel qu'il est écrit, sans la ponctuation qui l'entoure. */
  texte: string;
  /**
   * Sous quoi se garde le choix de l'enseignant : l'infinitif d'un verbe de
   * consigne, « non » pour une négation, sinon le mot en minuscules. Vide :
   * un petit mot, qui reste écrit sans picto.
   */
  cle: string;
  /** Ce qu'on demande à la banque. */
  demande: MotATraduire;
  /** Le verbe de consigne qu'il dit : son picto peut venir du lexique de CAA. */
  verbe?: string;
}

const plat = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Les petits mots : ils tiennent la phrase, ils ne se dessinent pas. « est »
 * aurait le dessin de l'est, « son » celui du bruit, « pas » celui du pied.
 */
const PETITS_MOTS = new Set([
  "le", "la", "les", "l", "un", "une", "des", "du", "de", "d", "au", "aux", "ce", "cet", "cette", "ces",
  "mon", "ma", "mes", "ton", "ta", "tes", "son", "sa", "ses", "notre", "nos", "votre", "vos", "leur", "leurs",
  "je", "j", "tu", "il", "elle", "on", "nous", "vous", "ils", "elles", "me", "m", "te", "t", "se", "s", "lui", "y", "en",
  "moi", "toi", "eux", "qui", "que", "qu", "quoi", "dont", "ça", "cela", "ceci", "c", "celui", "celle", "ceux", "celles",
  "et", "ou", "mais", "donc", "or", "ni", "car", "puis", "ensuite", "alors", "aussi", "si", "comme", "quand",
  "lorsque", "lorsqu", "puisque", "puisqu", "jusqu", "à", "a", "par", "pour", "avec", "sans", "chez", "vers", "pendant", "depuis",
  "est", "es", "suis", "sommes", "êtes", "sont", "était", "ai", "as", "avons", "avez", "ont",
  "ne", "n", "très", "bien", "tout", "toute", "tous", "toutes", "chaque", "pas",
]);

/** Ce qui annonce un verbe : le début de la consigne, une ponctuation, « et », « puis », un sujet, « pour »… */
const AVANT_UN_VERBE = new Set([
  "et", "puis", "ensuite", "alors", "ou", "ne", "n", "pour", "de", "d", "à", "a", "sans",
  "je", "j", "tu", "il", "elle", "on", "nous", "vous", "ils", "elles",
  "va", "vas", "allez", "peux", "pouvez", "dois", "devez", "faut", "essaie", "essayez",
  "me", "m", "te", "t", "se", "s",
]);

/** Après eux, le verbe est pronominal : « je me rappelle », c'est « se rappeler ». */
const PRONOMS_REFLECHIS = new Set(["me", "m", "te", "t", "se", "s"]);

/** Ce qui termine un morceau de phrase : le mot suivant commence une nouvelle action. */
const FIN_DE_MORCEAU = /[.,;:!?]/;

/** La négation se dit par son second mot : « ne colorie pas » montre le « non ». */
const NEGATIONS = new Set(["pas", "jamais", "rien", "plus", "personne"]);

/** Les impératifs qu'aucune règle ne ramène à leur infinitif. */
const IRREGULIERS: Record<string, string> = {
  va: "aller", allez: "aller", viens: "venir", venez: "venir", reviens: "revenir", revenez: "revenir",
  fais: "faire", faites: "faire", mets: "mettre", mettez: "mettre", remets: "remettre", remettez: "remettre",
  prends: "prendre", prenez: "prendre", apprends: "apprendre", apprenez: "apprendre", comprends: "comprendre", comprenez: "comprendre",
  dis: "dire", dites: "dire", lis: "lire", lisez: "lire", relis: "relire", relisez: "relire", écris: "écrire", écrivez: "écrire",
  sois: "être", soyez: "être", aie: "avoir", ayez: "avoir", assieds: "asseoir", asseyez: "asseoir", tais: "taire", taisez: "taire",
  sors: "sortir", sortez: "sortir", pars: "partir", partez: "partir", cours: "courir", courez: "courir",
  ouvre: "ouvrir", ouvrez: "ouvrir", bois: "boire", buvez: "boire", vois: "voir", voyez: "voir",
  peins: "peindre", peignez: "peindre", rejoins: "rejoindre", rejoignez: "rejoindre", suis: "suivre", suivez: "suivre",
  tiens: "tenir", tenez: "tenir", retiens: "retenir", retenez: "retenir", lève: "lever", levez: "lever",
};

/** Les infinitifs qu'un mot peut cacher, dans l'ordre où les essayer : « Trace » → « tracer », « prends » → « prendre ». */
export function infinitifsPossibles(mot: string): string[] {
  const m = mot.toLowerCase();
  if (IRREGULIERS[m]) return [IRREGULIERS[m]];
  const sortie: string[] = [];
  const ajouter = (x: string) => { if (x.length > 2 && !sortie.includes(x)) sortie.push(x); };
  if (/(?:er|ir|re)$/.test(m)) ajouter(m);
  if (m.endsWith("ez")) {
    const r = m.slice(0, -2);
    if (r.endsWith("iss")) ajouter(`${r.slice(0, -3)}ir`);
    ajouter(`${r}er`); ajouter(`${r}re`); ajouter(`${r}ir`);
  }
  if (m.endsWith("e")) {
    // Rappelle → rappeler, jette → jeter : la consonne se double au présent, pas à l'infinitif.
    if (/(?:ll|tt)e$/.test(m)) ajouter(`${m.slice(0, -3)}${m.slice(-2, -1)}er`);
    ajouter(`${m}r`);
    // Lève → lever, répète → répéter : l'accent du radical change à l'infinitif.
    const i = m.lastIndexOf("è");
    if (i >= 0) { ajouter(`${m.slice(0, i)}e${m.slice(i + 1)}r`); ajouter(`${m.slice(0, i)}é${m.slice(i + 1)}r`); }
    // Essaie → essayer, nettoie → nettoyer.
    if (m.endsWith("ie")) ajouter(`${m.slice(0, -2)}yer`);
  }
  if (m.endsWith("is")) { ajouter(`${m.slice(0, -1)}r`); ajouter(`${m.slice(0, -1)}re`); }
  if (m.endsWith("ds")) ajouter(`${m.slice(0, -1)}re`);
  return sortie;
}

/** Les mots qui finissent par s ou x au singulier : « fois » ne se cherche pas sous « foi ». */
const INVARIABLES = new Set([
  "dans", "sous", "vers", "plus", "moins", "après", "fois", "dos", "bras", "temps", "corps", "pays", "souris", "gris", "avis", "repas",
  "bois", "mois", "jus", "os", "ours", "puits", "fils", "tapis", "colis", "radis", "riz", "nez", "voix", "prix", "croix", "noix", "paix",
]);

/** Le mot, puis ses singuliers possibles : « étiquettes » → « étiquette », « chevaux » → « cheval ». */
export function singuliers(mot: string): string[] {
  const m = mot.toLowerCase();
  const sortie = [m];
  if (INVARIABLES.has(m)) return sortie;
  if (m.length > 4 && m.endsWith("aux")) sortie.push(`${m.slice(0, -3)}al`, `${m.slice(0, -3)}ail`);
  if (m.length > 3 && /[sx]$/.test(m)) sortie.push(m.slice(0, -1));
  return [...new Set(sortie)];
}

/** Des mots de la classe que la banque dessine sous un autre nom : « dans l'ordre », c'est ranger, pas commander. */
const SENS_DE_CLASSE: Record<string, string[]> = {
  ordre: ["mettre dans l'ordre"],
  image: ["dessin", "photo"], images: ["dessin", "photo"],
  case: ["carré"], cases: ["carré"],
};

/** Après eux, « son » est un nom : le son qu'on entend. */
const ARTICLES = new Set(["le", "les", "un", "des", "ce", "ces", "du", "au", "aux", "chaque"]);

/** Une élision : « l'histoire », « qu'il », « d'abord ». */
const ELISION = /^(l|d|j|m|t|s|n|c|qu|jusqu|lorsqu|puisqu)['’](.+)$/i;
/** Le pronom qui suit un impératif : « colle-les », « lève-toi ». */
const PRONOM_APRES_TRAIT = /^(.+)-(les|le|la|moi|toi|lui|leur|nous|vous|en|y)$/i;
const est_un_infinitif_connu = (mot: string) => VERBES_CONSIGNE.some((v) => plat(v.verbe) === plat(mot));

/** Les morceaux écrits d'une consigne : les mots, et où commence chaque action. */
function morceaux(consigne: string): { texte: string; debut: boolean; avantPronom: boolean }[] {
  const sortie: { texte: string; debut: boolean; avantPronom: boolean }[] = [];
  let debut = true;
  for (const brut of consigne.split(/\s+/).filter(Boolean)) {
    const m = /^([«“"(\[]*)(.*?)([»”")\].,;:!?…]*)$/.exec(brut);
    const coeur = m?.[2] ?? brut;
    const fin = m?.[3] ?? "";
    if (coeur) {
      const elision = ELISION.exec(coeur);
      const parties = elision ? [`${elision[1]}’`, elision[2]] : [coeur];
      for (const partie of parties) {
        const pronom = PRONOM_APRES_TRAIT.exec(partie);
        if (pronom) {
          sortie.push({ texte: pronom[1], debut, avantPronom: true });
          sortie.push({ texte: pronom[2], debut: false, avantPronom: false });
        } else {
          sortie.push({ texte: partie, debut, avantPronom: false });
        }
        debut = false;
      }
    }
    if (FIN_DE_MORCEAU.test(fin)) debut = true;
  }
  return sortie;
}

/**
 * Les mots d'une consigne, prêts à se traduire. Un verbe se reconnaît à sa
 * place : en tête d'une action, la forme d'un verbe de consigne est un verbe
 * (« Range ta classe » : ranger, puis la classe) ; un infinitif connu l'est
 * partout. Un mot inconnu en tête d'action essaie d'abord ses infinitifs.
 */
export function motsDeLaConsigne(consigne: string): MotDeConsigne[] {
  const sortie: MotDeConsigne[] = [];
  const parts = morceaux(consigne);
  let negation = false;
  parts.forEach((p, i) => {
    const bas = p.texte.toLowerCase().replace(/’$/, "");
    const precedent = i > 0 ? parts[i - 1].texte.toLowerCase().replace(/’$/, "") : "";
    const avantVerbe = p.debut || p.avantPronom || AVANT_UN_VERBE.has(precedent);
    if (p.debut) negation = false;
    if (bas === "ne" || bas === "n") negation = true;
    // La négation : le « non », sous « pas ».
    if (negation && NEGATIONS.has(bas)) {
      sortie.push({ texte: p.texte, cle: "non", demande: { verbes: [], noms: ["non"] } });
      return;
    }
    const nomApresArticle = bas === "son" && ARTICLES.has(precedent);
    if ((PETITS_MOTS.has(bas) && !nomApresArticle) || !/[\p{L}\d]/u.test(bas)) {
      sortie.push({ texte: p.texte, cle: "", demande: { verbes: [], noms: [] } });
      return;
    }
    const verbe = verbeDeLaForme(bas);
    if (verbe && (avantVerbe || est_un_infinitif_connu(bas))) {
      sortie.push({ texte: p.texte, cle: verbe, verbe, demande: { verbes: [verbe], noms: [] } });
      return;
    }
    const infinitifs = avantVerbe && !/^\d+$/.test(bas) ? infinitifsPossibles(bas) : [];
    // « Je me rappelle » : la banque dessine « se rappeler », pas « rappeler » (au téléphone).
    const verbes = PRONOMS_REFLECHIS.has(precedent)
      ? [...infinitifs.flatMap((v) => (/^[aeiouyhéèêâîô]/.test(v) ? [`s'${v}`, `se ${v}`] : [`se ${v}`])), ...infinitifs]
      : infinitifs;
    sortie.push({ texte: p.texte, cle: bas, demande: { verbes, noms: [...(SENS_DE_CLASSE[bas] ?? []), ...singuliers(bas)] } });
  });
  return sortie;
}

/**
 * Le mot qui dit une étape d'un coup d'œil : son verbe — le geste à faire —,
 * sinon son premier mot de sens. Rien pour une étape faite de petits mots.
 */
export function motPrincipal(etape: string): MotDeConsigne | null {
  const mots = motsDeLaConsigne(etape);
  return mots.find((m) => m.verbe || m.demande.verbes.length) ?? mots.find((m) => m.cle) ?? null;
}

// ── Les pictos choisis ────────────────────────────────────────────────────

export const CLE_CHOIX_TAPUSCRIT = "caa:tapuscrit";
/** Émis quand un choix change : les tapuscrits ouverts se mettent à jour. */
export const EVT_CHOIX_TAPUSCRIT = "maitrize:tapuscrit-choix";

/** Ce que l'enseignant a choisi pour un mot : un picto, ou 0 pour qu'il n'en ait aucun. */
export type ChoixDesMots = Record<string, RefPicto | 0>;

/** Les choix enregistrés, tels qu'on peut s'y fier. */
export function lireChoix(brut: string | null | undefined): ChoixDesMots {
  if (!brut) return {};
  try {
    const lu = JSON.parse(brut);
    if (!lu || typeof lu !== "object" || Array.isArray(lu)) return {};
    const sortie: ChoixDesMots = {};
    for (const [mot, ref] of Object.entries(lu as Record<string, unknown>)) {
      const cle = mot.trim().toLowerCase();
      if (!cle) continue;
      if (ref === 0) sortie[cle] = 0;
      else if (typeof ref === "number" && Number.isInteger(ref) && ref > 0) sortie[cle] = ref;
      else if (typeof ref === "string" && banqueDe(ref)) sortie[cle] = ref;
    }
    return sortie;
  } catch {
    return {};
  }
}

export const ecrireChoix = (choix: ChoixDesMots) => JSON.stringify(choix);

/** Le choix d'un mot posé, retiré (`undefined` : le picto redevient automatique), ou vidé (0). */
export function avecChoix(choix: ChoixDesMots, cle: string, ref: RefPicto | 0 | undefined): ChoixDesMots {
  const suite = { ...choix };
  if (ref === undefined) delete suite[cle]; else suite[cle] = ref;
  return suite;
}

/**
 * Le picto d'un mot : le choix de l'enseignant pour ce mot, sinon — pour un
 * verbe de consigne — celui du lexique de CAA, sinon celui que la banque a
 * trouvé. Rien pour un petit mot, ou pour un mot qu'on a vidé.
 */
export function pictoDuMot(mot: MotDeConsigne, choix: ChoixDesMots, lexique: Lexique, banque: Record<string, RefPicto>): RefPicto | null {
  if (!mot.cle) return null;
  if (mot.cle in choix) return choix[mot.cle] || null;
  if (mot.verbe && lexique[mot.verbe]) return lexique[mot.verbe];
  return banque[mot.cle] ?? null;
}

/** Ce qu'il faut demander à la banque pour ces mots : une fois chaque clé. */
export function demandesDe(mots: MotDeConsigne[]): { cles: string[]; demandes: MotATraduire[] } {
  const cles: string[] = [];
  const demandes: MotATraduire[] = [];
  for (const m of mots) {
    if (!m.cle || cles.includes(m.cle)) continue;
    cles.push(m.cle);
    demandes.push(m.demande);
  }
  return { cles, demandes };
}

// ── Le rendu ──────────────────────────────────────────────────────────────

/** Une consigne en pictos : chaque mot sous son dessin, les petits mots écrits entre eux. */
export function htmlDeLaConsigne(mots: MotDeConsigne[], pictoDe: (m: MotDeConsigne) => RefPicto | null, images: Record<string, string>): string {
  return `<div class="tp-consigne">${mots.map((m) => {
    const ref = pictoDe(m);
    const src = ref != null ? images[String(ref)] : "";
    return src
      ? `<span class="tp-mot"><img src="${src}" alt=""><span>${escapeHtml(m.texte)}</span></span>`
      : `<span class="tp-mot${m.cle ? "" : " tp-petit"}"><span>${escapeHtml(m.texte)}</span></span>`;
  }).join("")}</div>`;
}

/** Le tapuscrit d'une séance : ses consignes numérotées, chacune en pictos. */
export function htmlDuTapuscrit(consignes: MotDeConsigne[][], pictoDe: (m: MotDeConsigne) => RefPicto | null, images: Record<string, string>): string {
  if (!consignes.length) return "";
  return `<div class="tapuscrit">${consignes.map((mots, i) =>
    `<div class="tp-ligne"><span class="tp-num">${i + 1}</span>${htmlDeLaConsigne(mots, pictoDe, images)}</div>`).join("")}</div>`;
}

/** Le style du tapuscrit, sur le papier comme à l'écran. */
export const STYLE_TAPUSCRIT = `
  .tapuscrit { display: flex; flex-direction: column; gap: 6px; margin: 4px 0 2px; }
  .tp-ligne { display: flex; align-items: flex-start; gap: 6px; page-break-inside: avoid; break-inside: avoid; }
  .tp-num { flex: none; width: 16px; height: 16px; border-radius: 50%; background: #23527c; color: #fff; font-size: 9.5px;
    font-weight: 700; display: inline-flex; align-items: center; justify-content: center; margin-top: 10px; }
  .tp-consigne { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 2px 5px; min-width: 0; }
  .tp-mot { display: inline-flex; flex-direction: column; align-items: center; gap: 1px; }
  .tp-mot img { width: 34px; height: 34px; object-fit: contain; border-radius: 4px; }
  .tp-mot span { font-size: 10px; line-height: 1.2; color: #1c2233; }
  .tp-mot.tp-petit span { color: #687087; }
  .tp-attribution { font-size: 8px; color: #888; margin-top: 8px; }
`;
