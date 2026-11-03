// ── L'IA me teste sur les guides d'Éduscol ────────────────────────────────
//
// « À côté de ça, j'aimerais pouvoir avoir une IA qui me teste sur ma
// connaissance des guides Éduscol » (l'enseignant, 3 novembre 2026). Un
// onglet de Ressources : on choisit un guide de la liste d'Éduscol ; il se
// range au coffre-fort, une fois, et Maitrize en lit le texte sur
// l'ordinateur. Elle en prend quelques pages au hasard — des pages de texte,
// pas le sommaire, et d'abord celles que les séries d'avant n'ont pas prises.
//
// Mistral n'écrit ses questions que d'après ces pages. Chacune cite la phrase
// du guide qui la justifie, avec sa page ; Maitrize vérifie que la phrase est
// bien dans la page, et montre celle du guide, mot pour mot : une question
// dont la citation n'y est pas est écartée. Un modèle qui cite de mémoire
// n'est pas un guide. Quatre questions à choix, corrigées sur place, et une
// question ouverte, que Mistral corrige d'après la réponse attendue.
//
// Le guide est un texte public : il part tel quel. La réponse de
// l'enseignant passe par le masque des prénoms (voir confidentialite.ts).

import { aplatir } from "./rechercheDansPdf";
import { hasard, melanger } from "./hasard";

/** Les questions d'une série : quatre à choix, puis une ouverte. */
export const QUESTIONS_PAR_SERIE = 5;
/** Les pages qu'une série donne à lire à Mistral. */
export const PAGES_PAR_SERIE = 3;
/** Au-delà, on cesse de chercher des pages de texte : un guide scanné n'en a aucune. */
export const PAGES_ESSAYEES_MAX = 40;
/** Ce qu'une page donne à lire, au plus : assez pour deux questions, sans noyer le modèle. */
const PAGE_MAX = 3500;

/** Une page du guide, lue sur l'ordinateur : son numéro dans le PDF, et son texte. */
export interface PageLue { numero: number; texte: string }

interface Commune { question: string; citation: string; page: number }
export interface QuestionAChoix extends Commune { sorte: "choix"; propositions: string[]; bonne: number; explication: string }
export interface QuestionOuverte extends Commune { sorte: "ouverte"; attendu: string }
export type QuestionDuQuiz = QuestionAChoix | QuestionOuverte;

// ── Les pages à lire ──────────────────────────────────────────────────────

/** Le texte d'une page tel que pdf.js le donne, remis d'aplomb : les mots coupés en fin de ligne recollés, les blancs réduits. */
export function nettoyerLaPage(brut: string): string {
  return (brut ?? "")
    .replace(/(\p{Ll})-[ \t]*\n[ \t]*(\p{Ll})/gu, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

/** Des mots de liaison : une page de phrases en compte beaucoup, une liste de titres très peu. */
const LIAISONS = new Set(["le", "les", "la", "des", "du", "et", "à", "pour", "qui", "que", "est", "sont", "dans", "une", "un", "ou", "par"]);

/**
 * Une page dont on peut tirer une question : assez de texte, et du texte
 * suivi — pas le sommaire, ses pointillés et ses numéros, ni une page de
 * tableaux ou de chiffres.
 */
export function pageInterrogeable(texte: string): boolean {
  const t = texte ?? "";
  if (t.length < 600) return false;
  if ((t.match(/\.{4,}|…{2,}|(?:\. ){4,}/g) ?? []).length >= 3) return false;
  const lettres = (t.match(/\p{L}/gu) ?? []).length;
  if (lettres / t.length < 0.65) return false;
  // Des phrases : assez de mots de liaison, que n'a pas une liste de titres.
  return t.toLowerCase().split(/[^\p{L}]+/u).filter((m) => LIAISONS.has(m)).length >= 20;
}

/** Ce qu'on lit d'une page : son début, jusqu'à la fin de la phrase qui passe la limite. */
export function pageTronquee(texte: string, max = PAGE_MAX): string {
  if (texte.length <= max) return texte;
  const fin = texte.slice(0, max).search(/[.!?»](?=[^.!?»]*$)/u);
  return fin > max / 2 ? texte.slice(0, fin + 1) : texte.slice(0, max);
}

/**
 * Les pages à essayer, dans l'ordre : au hasard de la graine, celles que les
 * séries d'avant n'ont pas prises d'abord, puis les autres.
 */
export function pagesAEssayer(nombre: number, dejaVues: readonly number[], graine: number): number[] {
  const r = hasard(graine);
  const toutes = Array.from({ length: Math.max(0, Math.floor(nombre)) }, (_, i) => i + 1);
  const vues = new Set(dejaVues);
  return [...melanger(r, toutes.filter((n) => !vues.has(n))), ...melanger(r, toutes.filter((n) => vues.has(n)))];
}

// ── Ce qui part chez Mistral ──────────────────────────────────────────────

/** La consigne : des questions sur ces pages seulement, chacune avec la phrase qui la justifie. */
export function consigneDuQuiz(titre: string, combien = QUESTIONS_PAR_SERIE): string {
  return `Vous préparez un petit test pour un enseignant de l'école primaire, sur le guide d'Éduscol « ${titre} ». \
Vous recevez quelques pages de ce guide, chacune précédée de son numéro.

Écrivez ${combien} questions qui vérifient qu'il en connaît l'essentiel : ce que le guide recommande, pourquoi, et comment le faire en classe.
- Chaque question porte sur une seule page, et sa réponse se lit dans le texte de cette page : n'ajoutez rien que la page ne dise.
- Pas de question sur la mise en page, les numéros, les dates, les auteurs, les sigles seuls, ni sur ce que la page ne fait que nommer.
- ${combien - 1} questions à choix : quatre propositions courtes, une seule juste d'après la page, les autres plausibles mais fausses d'après elle. Jamais « toutes les réponses » ni « aucune ».
- 1 question ouverte, à laquelle on répond en une ou deux phrases.
- « citation » : la phrase de la page qui justifie la réponse, recopiée mot pour mot, de 8 à 40 mots.
- « explication » : une ou deux phrases qui disent pourquoi c'est la bonne réponse.
- En français, en vouvoyant l'enseignant.

Répondez seulement en JSON :
{"questions": [
  {"sorte": "choix", "page": 12, "question": "…", "propositions": ["…", "…", "…", "…"], "bonne": "la proposition juste, recopiée telle quelle", "explication": "…", "citation": "…"},
  {"sorte": "ouverte", "page": 14, "question": "…", "attendu": "la réponse attendue, en une ou deux phrases", "citation": "…"}
]}`;
}

/** Les pages, chacune sous son numéro. */
export const demandeDuQuiz = (pages: readonly PageLue[]): string =>
  pages.map((p) => `[Page ${p.numero}]\n${pageTronquee(p.texte)}`).join("\n\n");

// ── Ce qui revient : les questions, vérifiées ────────────────────────────

const texte = (x: unknown): string => (typeof x === "string" ? x.replace(/\s+/g, " ").trim() : "");

/** Les mots d'un texte, tels qu'écrits, et leur forme comparable : sans accents, sans casse, sans la ponctuation qui les entoure. */
function motsDe(t: string): { brut: string; plat: string }[] {
  return t.split(/\s+/).filter(Boolean)
    .map((brut) => ({ brut, plat: aplatir([brut]).texte.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "") }))
    .filter((m) => m.plat);
}

/**
 * La phrase du guide qu'une citation reprend, telle que la page l'écrit — ou
 * rien, si la page ne la contient pas. Le modèle recopie à peu près : un mot
 * changé, une ponctuation, une apostrophe. On cherche la plus longue suite de
 * mots communs, puis la fenêtre de la page qui lui répond ; trois quarts des
 * mots de la citation doivent s'y trouver.
 */
export function citationDansLaPage(citation: string, page: string): string | null {
  const c = motsDe(citation);
  const p = motsDe(page);
  if (c.length < 4 || !p.length) return null;
  let meilleur = { longueur: 0, finC: 0, finP: 0 };
  let precedente = new Array<number>(p.length + 1).fill(0);
  for (let i = 1; i <= c.length; i++) {
    const ligne = new Array<number>(p.length + 1).fill(0);
    for (let j = 1; j <= p.length; j++) {
      if (c[i - 1].plat !== p[j - 1].plat) continue;
      ligne[j] = precedente[j - 1] + 1;
      if (ligne[j] > meilleur.longueur) meilleur = { longueur: ligne[j], finC: i, finP: j };
    }
    precedente = ligne;
  }
  if (meilleur.longueur < Math.min(4, c.length)) return null;
  // La fenêtre de la page alignée sur cette suite, de la longueur de la citation.
  const avant = meilleur.finC - meilleur.longueur;
  const debut = Math.max(0, meilleur.finP - meilleur.longueur - avant);
  const fenetre = p.slice(debut, Math.min(p.length, debut + c.length));
  const reste = new Map<string, number>();
  for (const m of fenetre) reste.set(m.plat, (reste.get(m.plat) ?? 0) + 1);
  let communs = 0;
  for (const m of c) {
    const n = reste.get(m.plat) ?? 0;
    if (n > 0) { communs++; reste.set(m.plat, n - 1); }
  }
  // Une virgule ou un deux-points de bout de fenêtre ne finit pas une citation.
  return communs / c.length >= 0.75 ? fenetre.map((m) => m.brut).join(" ").replace(/[\s,;:–-]+$/u, "") : null;
}

/** Deux propositions, les mêmes au mot près ? Les accents, la casse et la ponctuation n'y font rien. */
const memeTexte = (a: string, b: string) => motsDe(a).map((m) => m.plat).join(" ") === motsDe(b).map((m) => m.plat).join(" ");

/**
 * Les questions de la réponse de Mistral, vérifiées : chacune sur une page
 * de la série, sa citation retrouvée dans cette page (ou dans une autre de
 * la série : la page prend alors son vrai numéro) et remplacée par le texte
 * du guide. Une question à choix a de trois à cinq propositions distinctes,
 * dont la bonne, et ses propositions se mélangent — le modèle met volontiers
 * la bonne en premier. Les questions à choix d'abord, une seule ouverte à la
 * fin. Rien de ce qui ne se vérifie pas.
 */
export function lireLesQuestions(brut: string, pages: readonly PageLue[], graine: number, combien = QUESTIONS_PAR_SERIE): QuestionDuQuiz[] {
  let v: unknown;
  try { v = JSON.parse(brut); } catch {
    const m = /\{[\s\S]*\}/.exec(brut ?? "");
    try { v = m ? JSON.parse(m[0]) : null; } catch { v = null; }
  }
  const liste = v && typeof v === "object" ? (v as { questions?: unknown }).questions : null;
  if (!Array.isArray(liste)) return [];
  const r = hasard(graine);
  const choix: QuestionAChoix[] = [];
  const ouvertes: QuestionOuverte[] = [];
  const vues = new Set<string>();
  for (const x of liste) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const question = texte(o.question);
    if (!question || vues.has(question)) continue;
    // La page dite d'abord, puis les autres de la série.
    const dite = Number(o.page);
    const ordre = [...pages.filter((p) => p.numero === dite), ...pages.filter((p) => p.numero !== dite)];
    let citation: string | null = null;
    let page = 0;
    for (const p of ordre) {
      citation = citationDansLaPage(texte(o.citation), p.texte);
      if (citation) { page = p.numero; break; }
    }
    if (!citation) continue;
    if (o.sorte === "ouverte") {
      const attendu = texte(o.attendu);
      if (!attendu) continue;
      vues.add(question);
      ouvertes.push({ sorte: "ouverte", question, attendu, citation, page });
      continue;
    }
    const propositions = Array.isArray(o.propositions) ? o.propositions.map(texte).filter(Boolean) : [];
    const distinctes = propositions.every((a, i) => propositions.findIndex((b) => memeTexte(a, b)) === i);
    const bonne = texte(o.bonne);
    const juste = bonne ? propositions.findIndex((a) => memeTexte(a, bonne)) : -1;
    if (propositions.length < 3 || propositions.length > 5 || !distinctes || juste < 0) continue;
    if (propositions.some((a) => /^(?:toutes|aucune) (?:les|des) (?:réponses|propositions)/iu.test(a))) continue;
    const melangees = melanger(r, propositions.map((a, i) => ({ a, juste: i === juste })));
    vues.add(question);
    choix.push({
      sorte: "choix", question, propositions: melangees.map((m) => m.a), bonne: melangees.findIndex((m) => m.juste),
      explication: texte(o.explication), citation, page,
    });
  }
  return [...choix.slice(0, combien - Math.min(1, ouvertes.length)), ...ouvertes.slice(0, 1)].slice(0, combien);
}

/** De quoi retrouver la citation dans le guide ouvert : ses premiers mots, tels qu'écrits. */
export const debutDeLaCitation = (citation: string, mots = 6): string => citation.split(/\s+/).filter(Boolean).slice(0, mots).join(" ");

// ── La question ouverte, corrigée ────────────────────────────────────────

export type Verdict = "juste" | "en partie" | "à revoir";
export interface Correction { verdict: Verdict; retour: string }

/** La consigne de la correction : le sens, pas les mots. */
export const consigneDeCorrection = (titre: string): string =>
  `Vous corrigez la réponse d'un enseignant à une question sur le guide d'Éduscol « ${titre} ». \
On vous donne la réponse attendue et la phrase du guide qui la justifie. Jugez le sens, pas les mots : une réponse juste dite autrement est juste ; \
une réponse incomplète est « en partie » ; une réponse fausse ou hors sujet est « à revoir ».
Répondez seulement en JSON : {"verdict": "juste" | "en partie" | "à revoir", "retour": "deux phrases au plus, en vouvoyant l'enseignant : ce qui est juste, ce qui manque"}`;

/** Ce qui part pour la corriger : la question, l'attendu, la phrase du guide, et la réponse — déjà masquée. */
export const demandeDeCorrection = (q: QuestionOuverte, reponse: string): string =>
  `Question : ${q.question}\nRéponse attendue : ${q.attendu}\nPhrase du guide (p. ${q.page}) : « ${q.citation} »\n\nRéponse de l'enseignant : ${reponse.trim()}`;

/** La correction relue ; rien si elle ne se lit pas. */
export function lireLaCorrection(brut: string): Correction | null {
  let v: unknown;
  try { v = JSON.parse(brut); } catch {
    const m = /\{[\s\S]*\}/.exec(brut ?? "");
    try { v = m ? JSON.parse(m[0]) : null; } catch { v = null; }
  }
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const plat = aplatir([texte(o.verdict)]).texte;
  const verdict: Verdict | null = plat === "juste" ? "juste" : plat === "en partie" ? "en partie" : plat === "a revoir" ? "à revoir" : null;
  return verdict ? { verdict, retour: texte(o.retour) } : null;
}

/** Ce qu'une réponse rapporte : un point juste, un demi en partie. */
export const pointsDuVerdict = (v: Verdict): number => (v === "juste" ? 1 : v === "en partie" ? 0.5 : 0);

// ── Les séries faites ─────────────────────────────────────────────────────

/** Les séries faites, gardées dans les réglages : le dernier score de chaque guide, et les pages déjà prises. */
export const CLE_QUIZ_DES_GUIDES = "quizGuides:historique";
const HISTORIQUE_MAX = 300;

export interface SerieFaite { url: string; titre: string; date: string; points: number; sur: number; pages: number[] }

export function lireHistorique(brut: string | null | undefined): SerieFaite[] {
  try {
    const v: unknown = JSON.parse(brut || "[]");
    if (!Array.isArray(v)) return [];
    return v.flatMap((x): SerieFaite[] => {
      if (!x || typeof x !== "object") return [];
      const o = x as Record<string, unknown>;
      const url = texte(o.url);
      const points = Number(o.points);
      const sur = Number(o.sur);
      if (!url || !Number.isFinite(points) || !Number.isFinite(sur) || sur <= 0) return [];
      const pages = Array.isArray(o.pages) ? o.pages.filter((n): n is number => Number.isInteger(n) && (n as number) > 0) : [];
      return [{ url, titre: texte(o.titre), date: texte(o.date), points: Math.max(0, Math.min(points, sur)), sur, pages }];
    });
  } catch { return []; }
}

/** L'historique avec cette série, la plus récente à la fin ; les plus anciennes s'en vont. */
export const avecLaSerie = (historique: readonly SerieFaite[], serie: SerieFaite): SerieFaite[] =>
  [...historique, serie].slice(-HISTORIQUE_MAX);

/** La dernière série faite sur un guide. */
export function derniereSerie(historique: readonly SerieFaite[], url: string): SerieFaite | undefined {
  for (let i = historique.length - 1; i >= 0; i--) if (historique[i].url === url) return historique[i];
  return undefined;
}

/** Les pages qu'ont déjà prises les séries sur ce guide. */
export const pagesDejaVues = (historique: readonly SerieFaite[], url: string): number[] =>
  [...new Set(historique.filter((s) => s.url === url).flatMap((s) => s.pages))];

/** Un score à la française : « 3,5 / 5 ». */
export const scoreEnClair = (points: number, sur: number): string =>
  `${points.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} / ${sur}`;

// ── Les guides ────────────────────────────────────────────────────────────

/** Le cycle d'une classe, pour proposer d'abord ses guides ; rien si la classe en mêle deux. */
export function cycleDeLaClasse(niveaux: readonly string[]): string {
  const cycles = new Set(niveaux.map((n) => (["TPS", "PS", "MS", "GS"].includes(n) ? "Cycle 1"
    : ["CP", "CE1", "CE2"].includes(n) ? "Cycle 2" : ["CM1", "CM2", "6e"].includes(n) ? "Cycle 3" : "")));
  return cycles.size === 1 ? [...cycles][0] : "";
}

/** Un document d'Éduscol est un guide à tester s'il est un PDF : une page web ne se lit pas ici. */
export const estUnGuideEnPdf = (url: string): boolean => /\.pdf($|\?)/i.test(url) || /\/download($|\?)/i.test(url);
