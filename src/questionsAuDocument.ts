// ── Demander à un document du coffre-fort ─────────────────────────────────
//
// « Ajoute un bouton qui fait tourner Mistral Large sur le document de mon
// choix dans le coffre-fort. Il ne fait pas d'hallucination, et il est
// capable d'aller chercher sur internet » (l'enseignant, 3 novembre 2026).
//
// Le document est lu sur l'ordinateur (voir textesDesPdf.ts) et découpé en
// passages ; ceux qui parlent de la question partent avec elle, chacun sous
// le numéro de sa page. Mistral Large ne répond que d'après eux : chaque
// affirmation s'appuie sur une citation mot pour mot, suivie de sa page. Puis
// Maitrize retrouve chaque citation dans le document — comme pour le quiz des
// guides — et signale celle qu'il ne retrouve pas. Si les passages ne disent
// rien de la question, la réponse le dit, et l'Assistant propose de chercher
// sur internet : « demande avant chaque recherche sur internet » (même jour).

import { citationDansLaPage, racinesDe, type PageLue } from "./quizDesGuides";
import { aplatir } from "./rechercheDansPdf";

/** Un passage du document : son texte, sa page dans le PDF, et le numéro que la page imprime. */
export interface Passage { page: number; affiche: string; texte: string }

/** Ce qu'un passage fait au plus : quelques paragraphes, assez pour une citation et son contexte. */
const TAILLE_DU_PASSAGE = 1400;
/** Les passages qui partent avec une question : assez pour répondre, sans noyer le modèle. */
export const PASSAGES_PAR_QUESTION = 8;

/** Le document en passages, page après page, coupés aux fins de phrase. */
export function passagesDuDocument(pages: readonly PageLue[], taille = TAILLE_DU_PASSAGE): Passage[] {
  return pages.flatMap((p) => {
    const affiche = p.etiquette ?? String(p.numero);
    const phrases = p.texte.match(/[^.!?…]+(?:[.!?…]+|$)/g)?.map((x) => x.trim()).filter(Boolean) ?? [];
    const sortie: Passage[] = [];
    let courant = "";
    for (const phrase of phrases) {
      if (courant && courant.length + 1 + phrase.length > taille) { sortie.push({ page: p.numero, affiche, texte: courant }); courant = phrase; }
      else courant = courant ? `${courant} ${phrase}` : phrase;
    }
    if (courant.trim()) sortie.push({ page: p.numero, affiche, texte: courant });
    return sortie;
  });
}

/**
 * Les passages qui parlent de la question, dans l'ordre du document : ceux
 * où l'on retrouve le plus de ses mots. Une question qui n'en partage aucun
 * — « résume ce document » — prend des passages répartis dans tout le
 * document.
 */
export function passagesPourLaQuestion(passages: readonly Passage[], question: string, max = PASSAGES_PAR_QUESTION): Passage[] {
  if (!passages.length) return [];
  const racines = racinesDe(question);
  const notes = passages.map((p, i) => {
    const mots = aplatir([p.texte]).texte.split(/[^a-z0-9]+/);
    const trouvees = racines.filter((r) => mots.some((m) => m.startsWith(r)));
    const occurrences = mots.filter((m) => racines.some((r) => m.startsWith(r))).length;
    return { i, note: trouvees.length * 100 + occurrences };
  }).filter((x) => x.note > 0).sort((a, b) => b.note - a.note).slice(0, max);
  if (notes.length) return notes.map((x) => x.i).sort((a, b) => a - b).map((i) => passages[i]);
  const pas = passages.length / Math.min(max, passages.length);
  return Array.from({ length: Math.min(max, passages.length) }, (_, k) => passages[Math.floor(k * pas)]);
}

/** Le modèle qui répond sur un document : Mistral Large, à la demande de l'enseignant. */
export const MODELE_GRAND = "mistral-large-latest";

/** Ce que dit la réponse quand le document ne répond pas : l'Assistant propose alors de chercher sur internet. */
export const NE_LE_DIT_PAS = "Le document ne le dit pas.";

/** La consigne : les seuls passages, des citations mot pour mot avec leur page, rien d'inventé. */
export const consigneDuDocument = (titre: string): string =>
  `Tu réponds aux questions d'un enseignant sur le document « ${titre} », d'après les seuls extraits qu'on te donne, chacun précédé de sa page.
- N'utilise aucune autre connaissance, et n'invente rien : ni chiffre, ni exemple, ni recommandation que les extraits ne contiennent pas.
- Appuie chaque affirmation sur une citation exacte d'un extrait, recopiée mot pour mot entre guillemets français, suivie de sa page : « … » (p. 12).
- Si les extraits ne permettent pas de répondre, réponds seulement : « ${NE_LE_DIT_PAS} »
- Réponds en français, clairement, en vouvoyant l'enseignant.`;

/** Les extraits, chacun sous sa page, puis la question. */
export const demandeDuDocument = (passages: readonly Passage[], question: string): string =>
  `${passages.map((p) => `[p. ${p.affiche}]\n${p.texte}`).join("\n\n")}\n\nQuestion : ${question.trim()}`;

/** La réponse dit-elle que le document ne répond pas ? */
export const neLeDitPas = (reponse: string): boolean => aplatir([reponse]).texte.includes(aplatir([NE_LE_DIT_PAS.slice(0, -1)]).texte);

/**
 * Chaque citation de la réponse — « … » (p. 12) —, cherchée dans les pages
 * du document : retrouvée, elle reste ; introuvable, un avertissement la
 * suit. La page dite d'abord, puis les autres pages envoyées : un modèle se
 * trompe parfois de page, pas de phrase.
 */
export function verifierLesCitations(reponse: string, pages: readonly PageLue[]): { texte: string; verifiees: number; introuvables: number } {
  let verifiees = 0;
  let introuvables = 0;
  const texte = (reponse ?? "").replace(/«\s*([^»]{4,}?)\s*»(\s*\(p(?:age)?\.?\s*([^)]+)\))?/g, (tout, citation: string, _p: string | undefined, dite: string | undefined) => {
    const page = dite?.trim();
    const ordre = [...pages.filter((p) => (p.etiquette ?? String(p.numero)) === page), ...pages.filter((p) => (p.etiquette ?? String(p.numero)) !== page)];
    const retrouvee = ordre.some((p) => citationDansLaPage(citation, p.texte));
    if (retrouvee) { verifiees++; return tout; }
    // Une citation de deux ou trois mots — un titre, un terme — ne prouve rien : on la laisse sans la compter.
    if (citation.trim().split(/\s+/).length < 4) return tout;
    introuvables++;
    return `${tout} ⚠️ *(citation introuvable dans le document)*`;
  });
  return { texte, verifiees, introuvables };
}

/**
 * La ligne qui suit la réponse : ce que Maitrize a retrouvé dans le document,
 * ce qu'il n'y a pas retrouvé — et, si la réponse ne cite rien, que rien ne la
 * vérifie.
 */
export function bilanDesCitations(v: { verifiees: number; introuvables: number }, titre: string): string {
  const s = (n: number) => (n > 1 ? "s" : "");
  const retrouvees = `${v.verifiees} citation${s(v.verifiees)} retrouvée${s(v.verifiees)} dans « ${titre} »`;
  if (!v.verifiees && !v.introuvables) return `⚠️ Cette réponse ne cite pas « ${titre} » : rien ne la vérifie.`;
  if (!v.introuvables) return `📖 ${retrouvees}.`;
  if (!v.verifiees) return `⚠️ ${v.introuvables} citation${s(v.introuvables)} introuvable${s(v.introuvables)} dans « ${titre} » : à vérifier.`;
  return `📖 ${retrouvees} ; ⚠️ ${v.introuvables} introuvable${s(v.introuvables)} : à vérifier.`;
}

/** Ce qu'on propose de demander à un document. */
export const SUGGESTIONS_DU_DOCUMENT = [
  "Résume ce document en cinq points.",
  "Que dit ce document sur l'évaluation des élèves ?",
  "Quelles activités ce document propose-t-il pour la classe ?",
  "Qu'est-ce que ce document recommande d'éviter ?",
];
