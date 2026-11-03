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
//
// Puis, « améliore encore » : chaque proposition fausse dit pourquoi elle
// l'est ; des questions partent d'une situation de classe ; « Je ne sais
// pas » vaut mieux qu'une réponse au hasard ; et une question manquée
// revient — tout de suite, puis trois jours, puis sept jours après chaque
// bonne réponse —, jusqu'à ce qu'elle soit sue.
//
// Puis, « continue l'amélioration » : un thème à réviser dans un guide — ses
// pages qui en parlent d'abord, et des questions sur lui ; une question mal
// posée s'écarte — elle ne compte pas et ne revient pas ; et une ligne dit
// où l'on en est, toutes séries confondues.
//
// Puis, une question sur un vrai guide : « un élève de 3 ans dessine
// librement et montre son dessin à la classe… » — la page parlait bien de
// dater et légender ses dessins, mais ni de 3 ans, ni de montrer à la classe.
// « Il faut pas qu'il hallucine » (l'enseignant, 3 novembre 2026). Plus de
// situation inventée : Mistral reprend les mots de la page. Maitrize vérifie
// que chaque chiffre de la question et de la bonne réponse est dans la page,
// que les mots de la question en viennent, et ceux de la bonne réponse de la
// phrase citée ; puis Mistral relit le test, page en main, et écarte toute
// question qui invente un détail. La correction ne montre que la phrase qui
// porte la réponse.

import { aplatir, occurrences } from "./rechercheDansPdf";
import { hasard, melanger } from "./hasard";
import { isoJour } from "./dates";

/** Les questions d'une série : quatre à choix, puis une ouverte. */
export const QUESTIONS_PAR_SERIE = 5;
/** Les pages qu'une série donne à lire à Mistral. */
export const PAGES_PAR_SERIE = 3;
/** Au-delà, on cesse de chercher des pages de texte : un guide scanné n'en a aucune. */
export const PAGES_ESSAYEES_MAX = 40;
/** Ce qu'une page donne à lire, au plus : assez pour deux questions, sans noyer le modèle. */
const PAGE_MAX = 3500;

/** Une page du guide, lue sur l'ordinateur : son numéro dans le PDF, et son texte. */
export interface PageLue {
  numero: number; texte: string;
  /** Le texte tel que la recherche du lecteur le voit (voir textesDeLaPage) : pour y retrouver la phrase citée. */
  brut?: string;
  /** Le numéro imprimé sur la page, quand le PDF le donne et qu'il diffère de son rang. */
  etiquette?: string;
}

interface Commune {
  question: string; citation: string;
  /** Le rang de la page dans le PDF. */
  page: number;
  /** Le numéro imprimé de cette page, s'il diffère de son rang. */
  etiquette?: string;
  /** Les mots que le lecteur du guide cherche pour montrer la phrase citée. */
  cherche?: string;
}
export interface QuestionAChoix extends Commune {
  sorte: "choix"; propositions: string[]; bonne: number; explication: string;
  /** Pour chaque proposition, dans le même ordre : pourquoi elle est juste ou fausse, d'après la page. */
  pourquoi: string[];
}
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
 * Le numéro qu'une page imprime, lu dans son texte : un nombre seul en tête
 * ou en pied de page, un peu en deçà de son rang dans le PDF — la couverture
 * ne se numérote pas. Le programme de maternelle imprime « 27 » sur sa
 * 28e page : chercher la page 28 du guide menait à la suivante.
 */
export function numeroEnTete(texte: string, rang: number): number | undefined {
  const jetons = (texte ?? "").trim().split(/\s+/);
  for (const j of [jetons[0], jetons[jetons.length - 1]]) {
    const n = j && /^\d{1,4}$/.test(j) ? Number(j) : NaN;
    if (n >= 1 && n >= rang - 20 && n <= rang + 5) return n;
  }
  return undefined;
}

/**
 * L'écart entre le rang des pages et leur numéro imprimé, s'il est sûr : le
 * même pour au moins deux pages, et pour la plupart de celles qui en ont un.
 * Rien sinon — un chiffre isolé en tête de page n'est pas toujours un numéro.
 */
export function decalageImprime(pages: readonly Pick<PageLue, "numero" | "texte">[]): number | null {
  const comptes = new Map<number, number>();
  let lus = 0;
  for (const p of pages) {
    const n = numeroEnTete(p.texte, p.numero);
    if (n === undefined) continue;
    lus++;
    comptes.set(p.numero - n, (comptes.get(p.numero - n) ?? 0) + 1);
  }
  const [decalage, combien] = [...comptes].sort((a, b) => b[1] - a[1])[0] ?? [0, 0];
  return combien >= 2 && combien * 2 > lus ? decalage : null;
}

/** Les pages, chacune avec le numéro qu'elle imprime quand il diffère de son rang — sauf si le PDF les numérote lui-même. */
export function avecLeursNumeros<P extends PageLue>(pages: readonly P[], decalage: number | null): P[] {
  if (!decalage) return [...pages];
  return pages.map((p) => (p.etiquette || p.numero - decalage < 1 ? p : { ...p, etiquette: String(p.numero - decalage) }));
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
export function consigneDuQuiz(titre: string, combien = QUESTIONS_PAR_SERIE, theme = ""): string {
  const sujet = theme.replace(/\s+/g, " ").trim();
  return `Vous préparez un petit test pour un enseignant de l'école primaire, sur le guide d'Éduscol « ${titre} ». \
Vous recevez quelques pages de ce guide, chacune précédée de son numéro.

Écrivez ${combien} questions qui vérifient qu'il en connaît l'essentiel : ce que le guide recommande, pourquoi, et comment le faire en classe.
${sujet ? `- L'enseignant veut réviser ce thème : « ${sujet} ». Les questions portent sur ce que les pages en disent.\n` : ""}- Chaque question porte sur une seule page, et sa réponse se lit dans le texte de cette page : n'ajoutez rien que la page ne dise.
- Pas de question sur la mise en page, les numéros, les dates, les auteurs, les sigles seuls, ni sur ce que la page ne fait que nommer.
- N'inventez rien : ni situation de classe, ni âge, ni chiffre, ni personnage, ni détail que la page ne contient pas. La question et la bonne réponse reprennent les mots de la page.
- ${combien - 1} questions à choix : quatre propositions courtes, une seule juste d'après la page, les autres plausibles mais fausses d'après elle. Jamais « toutes les réponses » ni « aucune ». Pour chaque proposition, « pourquoi » dit en une phrase pourquoi elle est juste ou fausse : seulement ce que dit la page, ou qu'elle n'en parle pas.
- 1 question ouverte, à laquelle on répond en une ou deux phrases.
- « citation » : la phrase de la page qui contient la bonne réponse, recopiée mot pour mot, de 8 à 40 mots.
- « explication » : une ou deux phrases qui disent, d'après la page seulement, pourquoi c'est la bonne réponse.
- En français, en vouvoyant l'enseignant.

Répondez seulement en JSON :
{"questions": [
  {"sorte": "choix", "page": 12, "question": "…", "propositions": [{"texte": "…", "juste": true, "pourquoi": "…"}, {"texte": "…", "juste": false, "pourquoi": "…"}, {"texte": "…", "juste": false, "pourquoi": "…"}, {"texte": "…", "juste": false, "pourquoi": "…"}], "explication": "…", "citation": "…"},
  {"sorte": "ouverte", "page": 14, "question": "…", "attendu": "la réponse attendue, en une ou deux phrases", "citation": "…"}
]}`;
}

/** Les pages, chacune sous son numéro. */
export const demandeDuQuiz = (pages: readonly PageLue[]): string =>
  pages.map((p) => `[Page ${p.numero}]\n${pageTronquee(p.texte)}`).join("\n\n");

// ── Ce qui revient : les questions, vérifiées ────────────────────────────

const texte = (x: unknown): string => (typeof x === "string" ? x.replace(/\s+/g, " ").trim() : "");

/**
 * Les morceaux d'un texte séparés par les blancs, tels qu'écrits — un « : »
 * ou un « ? » isolé compris, la typographie française les détache —, et ses
 * mots : leur forme comparable, sans accents, sans casse, sans la
 * ponctuation qui les entoure, et leur rang parmi les morceaux.
 */
function jetonsDe(t: string): { bruts: string[]; mots: { brut: string; plat: string; i: number }[] } {
  const bruts = (t ?? "").split(/\s+/).filter(Boolean);
  const mots = bruts.map((brut, i) => ({ brut, i, plat: aplatir([brut]).texte.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "") }))
    .filter((m) => m.plat);
  return { bruts, mots };
}
const motsDe = (t: string) => jetonsDe(t).mots;

/**
 * La phrase du guide qu'une citation reprend, telle que la page l'écrit — ou
 * rien, si la page ne la contient pas. Le modèle recopie à peu près : un mot
 * changé, une ponctuation, une apostrophe. On cherche la plus longue suite de
 * mots communs, puis la fenêtre de la page qui lui répond ; trois quarts des
 * mots de la citation doivent s'y trouver.
 */
export function citationDansLaPage(citation: string, page: string): string | null {
  const c = motsDe(citation);
  const { bruts, mots: p } = jetonsDe(page);
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
  let debut = Math.max(0, meilleur.finP - meilleur.longueur - avant);
  let fin = Math.min(p.length, debut + c.length);
  const reste = new Map<string, number>();
  for (const m of p.slice(debut, fin)) reste.set(m.plat, (reste.get(m.plat) ?? 0) + 1);
  let communs = 0;
  for (const m of c) {
    const n = reste.get(m.plat) ?? 0;
    if (n > 0) { communs++; reste.set(m.plat, n - 1); }
  }
  if (communs / c.length < 0.75) return null;
  // Une phrase entière se lit mieux qu'un morceau : la fenêtre qui commence en minuscule remonte au début de sa
  // phrase, celle qui ne finit pas sur un point va jusqu'au bout — de quelques mots au plus. Ce qui sépare deux mots,
  // ce sont les morceaux d'entre eux : « fin. », ou « fin ? » à la française.
  // Un point, un point-virgule ou le tiret d'une énumération ferment une phrase : on ne les franchit pas.
  const entre = (k: number) => [p[k - 1].brut, ...bruts.slice(p[k - 1].i + 1, p[k].i)];
  const apres = (k: number) => [p[k].brut, ...bruts.slice(p[k].i + 1, p[k + 1]?.i ?? bruts.length)];
  const ferme = (b: string) => /[.!?…;»]$/u.test(b) || TIRET.test(b);
  for (let n = 0; n < ETENDUE_MAX && debut > 0 && /^\p{Ll}/u.test(p[debut].brut) && !entre(debut).some((b) => ferme(b) || /:$/.test(b)); n++) debut--;
  for (let n = 0; n < ETENDUE_MAX && fin < p.length && !apres(fin - 1).some(ferme); n++) fin++;
  // Les signes isolés qui suivent le dernier mot finissent la phrase avec lui ; une virgule ou un deux-points, non.
  let dernier = p[fin - 1].i;
  while (dernier + 1 < bruts.length && /^[.!?…»)]+$/u.test(bruts[dernier + 1])) dernier++;
  return bruts.slice(p[debut].i, dernier + 1).join(" ").replace(/[\s,;:–-]+$/u, "");
}

/** Ce qu'une citation gagne, au plus, de chaque côté pour finir sa phrase : au-delà, on garde le morceau. */
const ETENDUE_MAX = 25;
/** Le tiret seul qui ouvre l'élément d'une énumération : trait d'union, tirets, signe moins (U+2212), puces. */
const TIRET = /^[-‐‑‒–—−•·◦▪■►]$/u;

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
    const lue = pages.find((p) => p.numero === page)!;
    // Ce qui situe la phrase : le numéro imprimé de sa page, et les mots qui la retrouvent dans le lecteur.
    const situer = (phrase: string) => {
      const cherche = lue.brut ? phraseCherchable(phrase, lue.brut) : "";
      return { ...(lue.etiquette ? { etiquette: lue.etiquette } : {}), ...(cherche ? { cherche } : {}) };
    };
    if (o.sorte === "ouverte") {
      const attendu = texte(o.attendu);
      if (!attendu) continue;
      const extrait = extraitUtile(citation, attendu);
      if (!fidele(question, attendu, extrait, lue.texte)) continue;
      vues.add(question);
      ouvertes.push({ sorte: "ouverte", question, attendu, citation: extrait, page, ...situer(extrait) });
      continue;
    }
    // Chaque proposition avec son « pourquoi » ; la bonne est celle que le modèle marque juste — une seule —,
    // ou, à défaut de marque, celle qu'il recopie dans « bonne ».
    const lues = (Array.isArray(o.propositions) ? o.propositions : []).map((x) => {
      const p = x && typeof x === "object" ? x as Record<string, unknown> : null;
      return p ? { a: texte(p.texte), juste: p.juste === true, pourquoi: texte(p.pourquoi) } : { a: texte(x), juste: false, pourquoi: "" };
    }).filter((p) => p.a);
    const marquees = lues.filter((p) => p.juste);
    const bonne = texte(o.bonne);
    const juste = marquees.length === 1 ? lues.indexOf(marquees[0]) : !marquees.length && bonne ? lues.findIndex((p) => memeTexte(p.a, bonne)) : -1;
    const distinctes = lues.every((p, i) => lues.findIndex((q) => memeTexte(p.a, q.a)) === i);
    if (lues.length < 3 || lues.length > 5 || !distinctes || juste < 0) continue;
    if (lues.some((p) => /^(?:toutes|aucune) (?:les|des) (?:réponses|propositions)/iu.test(p.a))) continue;
    const extrait = extraitUtile(citation, lues[juste].a);
    if (!fidele(question, lues[juste].a, extrait, lue.texte)) continue;
    // Une explication qui avance un chiffre que la page n'a pas se tait ; la question reste.
    const sansInvention = (t: string) => (chiffresAbsents(t, lue.texte) ? "" : t);
    vues.add(question);
    choix.push(melangee({
      sorte: "choix", question, propositions: lues.map((p) => p.a), bonne: juste, pourquoi: lues.map((p) => sansInvention(p.pourquoi)),
      explication: sansInvention(texte(o.explication)), citation: extrait, page, ...situer(extrait),
    }, r));
  }
  return [...choix.slice(0, combien - Math.min(1, ouvertes.length)), ...ouvertes.slice(0, 1)].slice(0, combien);
}

/** Une question à choix, ses propositions dans un autre ordre — et leurs « pourquoi » avec elles. */
export function melangee(q: QuestionAChoix, r: () => number): QuestionAChoix {
  const ordre = melanger(r, q.propositions.map((_, i) => i));
  return { ...q, propositions: ordre.map((i) => q.propositions[i]), pourquoi: ordre.map((i) => q.pourquoi[i] ?? ""), bonne: ordre.indexOf(q.bonne) };
}

/** De quoi retrouver la citation dans le guide ouvert : ses premiers mots, tels qu'écrits. */
export const debutDeLaCitation = (citation: string, mots = 6): string => citation.split(/\s+/).filter(Boolean).slice(0, mots).join(" ");

// ── Rien d'inventé ────────────────────────────────────────────────────────

/** Les mots que toute question emploie, et qui ne disent rien du guide : « préconise », « enseignant », « selon »… */
const MOTS_DE_QUESTION = new Set(["guide", "preconise", "preconiser", "preconisent", "recommande", "recommander", "recommandent", "propose",
  "proposer", "proposent", "selon", "enseignant", "enseignante", "enseignants", "maitre", "maitresse", "faut", "doit", "doivent", "permet",
  "permettre", "permettent", "pourquoi", "peut", "peuvent", "etre", "avoir", "cette", "cela", "dont", "plus", "moins", "tres", "ainsi",
  "comme", "mais", "donc", "aussi", "tout", "tous", "toute", "toutes", "elle", "elles", "ils", "lui", "nous", "vous", "chaque", "afin",
  "lors", "quand", "entre", "sans", "sous", "vers", "chez", "page", "texte", "dit", "dire", "agit", "important", "importance", "souligne",
  "rappelle", "indique", "insiste", "role", "objectif", "but", "faire", "fait", "font", "votre", "vos", "notre", "nos", "qu", "lorsqu"]);

/** Les mots qui portent le sens d'un texte, par leur début : ni les mots outils, ni ceux de toute question. */
export function racinesDe(t: string): string[] {
  const mots = aplatir([t ?? ""]).texte.split(/[^a-z0-9]+/).filter((m) => m.length >= 3 && !MOTS_VIDES.has(m) && !MOTS_DE_QUESTION.has(m) && !/^\d+$/.test(m));
  return [...new Set(mots.map((m) => m.slice(0, Math.max(3, Math.min(6, m.length - 1)))))];
}

/** La part des mots d'un texte qu'on retrouve dans un autre, par leur début ; tout, s'il n'en a pas. */
export function partRetrouvee(t: string, dans: string): number {
  const racines = racinesDe(t);
  if (!racines.length) return 1;
  const mots = aplatir([dans ?? ""]).texte.split(/[^a-z0-9]+/);
  return racines.filter((r) => mots.some((m) => m.startsWith(r))).length / racines.length;
}

/** Les chiffres d'un texte, et les âges écrits en lettres (« trois ans ») : ce qu'un modèle invente le plus volontiers. */
const AGES = /\b(?:un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze) ans\b/g;
function chiffresDe(t: string): string[] {
  const plat = aplatir([t ?? ""]).texte;
  return [...(plat.match(/\d+(?:[.,]\d+)?/g) ?? []), ...(plat.match(AGES) ?? [])];
}

/** Vrai si le texte avance un chiffre, ou un âge, que la page n'a pas. */
export function chiffresAbsents(t: string, page: string): boolean {
  // La page en mots et en nombres, séparés d'un espace : « CE1 » y donne « ce 1 », « 3 ans, » donne « 3 ans ».
  const jetons = ` ${(aplatir([page ?? ""]).texte.match(/\d+(?:[.,]\d+)?|[a-z]+/g) ?? []).join(" ")} `;
  return chiffresDe(t).some((c) => !jetons.includes(` ${c} `));
}

/**
 * Une question fidèle à sa page : ni chiffre ni âge que la page n'a pas, dans
 * la question comme dans la bonne réponse ; la plupart des mots de la
 * question viennent de la page ; ceux de la bonne réponse, de la phrase
 * citée. Une situation inventée — « un élève de 3 ans montre son dessin à la
 * classe » — n'y passe pas.
 */
export function fidele(question: string, reponse: string, citation: string, page: string): boolean {
  if (chiffresAbsents(question, page) || chiffresAbsents(reponse, page)) return false;
  return partRetrouvee(question, page) >= 0.6 && partRetrouvee(reponse, citation) >= 0.6;
}

/**
 * Le morceau de la citation qui porte la réponse : une phrase, ou un tiret
 * d'énumération — celui où l'on retrouve le plus de ses mots. Une citation
 * d'un seul morceau, ou dont aucun ne la porte mieux, reste entière.
 */
export function extraitUtile(citation: string, reponse: string): string {
  const morceaux: string[][] = [[]];
  for (const b of citation.split(/\s+/).filter(Boolean)) {
    if (b === ";" || TIRET.test(b)) { if (morceaux[morceaux.length - 1].length) morceaux.push([]); continue; }
    morceaux[morceaux.length - 1].push(b);
    if (/[.!?…;]$/.test(b)) morceaux.push([]);
  }
  const phrases = morceaux.filter((m) => m.length).map((m) => m.join(" ").replace(/[\s,;:–-]+$/u, ""));
  if (phrases.length < 2) return citation;
  const racines = racinesDe(reponse);
  const compte = (phrase: string) => {
    const mots = aplatir([phrase]).texte.split(/[^a-z0-9]+/);
    return racines.filter((r) => mots.some((m) => m.startsWith(r))).length;
  };
  const meilleure = phrases.reduce((a, b) => (compte(b) > compte(a) ? b : a));
  return compte(meilleure) >= 2 ? meilleure : citation;
}

/**
 * Des mots de la phrase que la recherche du lecteur retrouve dans la page :
 * il cherche dans le texte tel que pdf.js le donne, où un mot peut être
 * coupé (« peu ven t »). Les plus longues suites d'abord ; rien si aucune.
 */
export function phraseCherchable(phrase: string, brut: string): string {
  const mots = phrase.split(/\s+/).filter(Boolean);
  const plat = aplatir([brut]).texte;
  for (const n of [6, 5, 4, 3]) {
    for (let i = 0; i + n <= mots.length; i++) {
      const essai = mots.slice(i, i + n).join(" ");
      if (essai.replace(/[^\p{L}]/gu, "").length >= 12 && occurrences(plat, essai).length) return essai;
    }
  }
  return "";
}

// ── La relecture par Mistral ──────────────────────────────────────────────

/** La consigne de la relecture : chaque question, la page en main ; au moindre doute, elle n'est pas fidèle. */
export const consigneDeVerification = (titre: string): string =>
  `Vous relisez un test écrit d'après quelques pages du guide d'Éduscol « ${titre} ». Pour chaque question, vérifiez, d'après sa page seulement :
- la question n'invente rien : ni situation, ni âge, ni chiffre, ni personnage, ni détail que la page ne contient pas ;
- la bonne réponse est dite par la page elle-même, sans être déduite ni interprétée ;
- les autres propositions sont fausses d'après la page.
Soyez sévère : au moindre doute, la question n'est pas fidèle.
Répondez seulement en JSON : {"questions": [{"numero": 1, "fidele": true, "raison": "…"}]}`;

/** Les pages, puis le test : chaque question, sa bonne réponse, les autres propositions, la phrase citée. */
export function demandeDeVerification(pages: readonly PageLue[], questions: readonly QuestionDuQuiz[]): string {
  const test = questions.map((q, i) => (q.sorte === "choix"
    ? `Question ${i + 1} (page ${q.page}) : ${q.question}\nBonne réponse : ${q.propositions[q.bonne]}\n`
      + `Autres propositions : ${q.propositions.filter((_, j) => j !== q.bonne).join(" / ")}\nPhrase du guide : « ${q.citation} »`
    : `Question ${i + 1} (page ${q.page}, ouverte) : ${q.question}\nRéponse attendue : ${q.attendu}\nPhrase du guide : « ${q.citation} »`)).join("\n\n");
  return `${demandeDuQuiz(pages)}\n\n— Le test à relire —\n\n${test}`;
}

/**
 * Les questions que la relecture tient pour fidèles. Celles qu'elle ne
 * nomme pas, ou qu'une réponse illisible laisse dans le doute, ne le sont
 * pas : mieux vaut une question de moins qu'une question inventée.
 */
export function questionsFideles(brut: string, questions: readonly QuestionDuQuiz[]): QuestionDuQuiz[] {
  let v: unknown;
  try { v = JSON.parse(brut); } catch {
    const m = /\{[\s\S]*\}/.exec(brut ?? "");
    try { v = m ? JSON.parse(m[0]) : null; } catch { v = null; }
  }
  const liste = v && typeof v === "object" ? (v as { questions?: unknown }).questions : null;
  if (!Array.isArray(liste)) return [];
  const sures = new Set(liste.flatMap((x) => {
    const o = x && typeof x === "object" ? x as Record<string, unknown> : {};
    return o.fidele === true && Number.isInteger(Number(o.numero)) ? [Number(o.numero) - 1] : [];
  }));
  return questions.filter((_, i) => sures.has(i));
}

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

export interface SerieFaite {
  url: string; titre: string; date: string; points: number; sur: number; pages: number[];
  /** Les pages du guide : de quoi dire où l'on en est (« 9 pages travaillées sur 48 »). */
  total?: number;
}

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
      const total = Number(o.total);
      return [{
        url, titre: texte(o.titre), date: texte(o.date), points: Math.max(0, Math.min(points, sur)), sur, pages,
        ...(Number.isInteger(total) && total > 0 ? { total } : {}),
      }];
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

/** Où l'on en est dans un guide : les pages déjà travaillées, sur combien ; rien tant qu'on ne sait pas combien il en a. */
export function couvertureDuGuide(historique: readonly SerieFaite[], url: string): { vues: number; total: number } | null {
  let total = 0;
  for (const s of historique) if (s.url === url && s.total) total = s.total;
  return total ? { vues: Math.min(total, pagesDejaVues(historique, url).length), total } : null;
}

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

// ── Les questions à revoir ────────────────────────────────────────────────

/**
 * Une question manquée, gardée pour revenir : le guide d'où elle vient, la
 * question entière, sa boîte et son échéance. Elle revient le jour même, puis
 * — chaque fois qu'elle est réussie — trois jours, puis sept jours après ; une
 * troisième réussite la tient pour sue. Une erreur la remet au début.
 */
export interface FicheARevoir { guide: { titre: string; url: string }; question: QuestionDuQuiz; boite: number; echeance: string }

export const CLE_A_REVOIR = "quizGuides:aRevoir";
/** Les jours avant de revoir une question réussie, selon la boîte où elle entre : la 1 après une erreur, puis la 2, la 3. */
export const INTERVALLES = [0, 3, 7];
const A_REVOIR_MAX = 300;

/** Un jour plus tard : « 2026-11-03 » et 3 donnent « 2026-11-06 ». Midi, pour que l'heure d'été n'y change rien. */
export function plusJours(iso: string, jours: number): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  d.setDate(d.getDate() + jours);
  return isoJour(d);
}

/** Ce qui fait reconnaître une question : son guide et ses mots, sans accents ni casse. */
export const cleDeLaQuestion = (url: string, question: string): string => `${url}|${aplatir([question]).texte}`;

/** Une question relue : rien de ce qui ne se poserait pas. */
function questionRelue(v: unknown): QuestionDuQuiz | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const question = texte(o.question);
  const citation = texte(o.citation);
  const page = Number(o.page);
  if (!question || !citation || !Number.isInteger(page) || page <= 0) return null;
  const situe = { ...(texte(o.etiquette) ? { etiquette: texte(o.etiquette) } : {}), ...(texte(o.cherche) ? { cherche: texte(o.cherche) } : {}) };
  if (o.sorte === "ouverte") {
    const attendu = texte(o.attendu);
    return attendu ? { sorte: "ouverte", question, attendu, citation, page, ...situe } : null;
  }
  const propositions = Array.isArray(o.propositions) ? o.propositions.map(texte) : [];
  const bonne = Number(o.bonne);
  if (o.sorte !== "choix" || propositions.length < 3 || propositions.some((p) => !p) || !Number.isInteger(bonne) || bonne < 0 || bonne >= propositions.length) return null;
  const pourquoi = Array.isArray(o.pourquoi) ? o.pourquoi.map(texte) : [];
  return {
    sorte: "choix", question, propositions, bonne, explication: texte(o.explication), citation, page,
    pourquoi: propositions.map((_, i) => pourquoi[i] ?? ""), ...situe,
  };
}

export function lireARevoir(brut: string | null | undefined): FicheARevoir[] {
  try {
    const v: unknown = JSON.parse(brut || "[]");
    if (!Array.isArray(v)) return [];
    return v.flatMap((x): FicheARevoir[] => {
      if (!x || typeof x !== "object") return [];
      const o = x as Record<string, unknown>;
      const g = o.guide && typeof o.guide === "object" ? o.guide as Record<string, unknown> : {};
      const url = texte(g.url);
      const question = questionRelue(o.question);
      const boite = Number(o.boite);
      const echeance = texte(o.echeance);
      if (!url || !question || !/^\d{4}-\d{2}-\d{2}$/.test(echeance)) return [];
      return [{ guide: { titre: texte(g.titre), url }, question, boite: Number.isInteger(boite) ? Math.max(1, Math.min(INTERVALLES.length, boite)) : 1, echeance }];
    });
  } catch { return []; }
}

/**
 * Les questions à revoir après une réponse. Manquée — ou à moitié, ou
 * passée —, elle entre, ou revient, dans la première boîte, pour le jour
 * même. Réussie, une question à revoir passe dans la boîte suivante, à
 * l'échéance qui lui répond ; réussie dans la dernière, elle s'en va. Une
 * question réussie du premier coup n'y entre pas.
 */
export function apresLaReponse(
  fiches: readonly FicheARevoir[], guide: { titre: string; url: string }, question: QuestionDuQuiz, points: number, aujourdhui: string,
): FicheARevoir[] {
  const cle = cleDeLaQuestion(guide.url, question.question);
  const i = fiches.findIndex((f) => cleDeLaQuestion(f.guide.url, f.question.question) === cle);
  const autres = fiches.filter((_, j) => j !== i);
  if (points < 1) return [...autres, { guide, question, boite: 1, echeance: aujourdhui }].slice(-A_REVOIR_MAX);
  if (i < 0) return [...fiches];
  const boite = fiches[i].boite + 1;
  if (boite > INTERVALLES.length) return autres;
  const suite = [...fiches];
  suite[i] = { ...fiches[i], question, boite, echeance: plusJours(aujourdhui, INTERVALLES[boite - 1]) };
  return suite;
}

/** Les questions dont c'est le jour, les plus en retard d'abord. */
export const fichesDues = (fiches: readonly FicheARevoir[], aujourdhui: string): FicheARevoir[] =>
  fiches.filter((f) => f.echeance <= aujourdhui).sort((a, b) => a.echeance.localeCompare(b.echeance));

/** Une question écartée par l'enseignant — mal posée — : elle ne reviendra pas. */
export const sansLaQuestion = (fiches: readonly FicheARevoir[], url: string, question: string): FicheARevoir[] =>
  fiches.filter((f) => cleDeLaQuestion(f.guide.url, f.question.question) !== cleDeLaQuestion(url, question));

// ── Où l'on en est ────────────────────────────────────────────────────────

/** Toutes séries confondues : combien, la part de bonnes réponses, les questions en révision ; rien avant la première série. */
export function progresDuQuiz(historique: readonly SerieFaite[], fiches: readonly FicheARevoir[]): { series: number; pourcentage: number; enRevision: number } | null {
  if (!historique.length) return null;
  const points = historique.reduce((n, s) => n + s.points, 0);
  const sur = historique.reduce((n, s) => n + s.sur, 0);
  return { series: historique.length, pourcentage: sur ? Math.round((points / sur) * 100) : 0, enRevision: fiches.length };
}

// ── Un thème à réviser ────────────────────────────────────────────────────

/** Les mots qu'un thème n'apporte pas : « le », « de », « comment »… */
const MOTS_VIDES = new Set([...LIAISONS, "de", "en", "au", "aux", "sur", "avec", "ce", "ces", "se", "sa", "son", "ses", "leur", "leurs",
  "comment", "quoi", "quel", "quelle", "quels", "quelles", "faire", "eleve", "eleves", "classe"]);

/**
 * Ce qu'on cherche d'un thème, dans les pages : le début de chacun de ses
 * mots, sans accents ni casse — « fluence » cherche « fluenc », qui trouve
 * « fluence » et « fluences » ; « compréhension », « compre », qui trouve aussi
 * « comprendre ».
 */
export function racinesDuTheme(theme: string): string[] {
  const mots = aplatir([theme ?? ""]).texte.split(/[^a-z0-9]+/).filter((m) => m.length >= 3 && !MOTS_VIDES.has(m));
  return [...new Set(mots.map((m) => m.slice(0, Math.max(3, Math.min(6, m.length - 1)))))];
}

/** Ce qu'une page dit d'un thème : chaque mot du thème qu'elle porte compte beaucoup, chaque occurrence un peu. */
export function scoreDuTheme(texte: string, racines: readonly string[]): number {
  if (!racines.length) return 0;
  const trouvees = new Set<string>();
  let occurrences = 0;
  for (const m of aplatir([texte ?? ""]).texte.split(/[^a-z0-9]+/)) {
    const r = racines.find((x) => m.startsWith(x));
    if (r) { trouvees.add(r); occurrences++; }
  }
  return trouvees.size * 100 + occurrences;
}

/**
 * Les pages de texte qui parlent du thème, dans l'ordre où les prendre :
 * celles que les séries d'avant n'ont pas prises d'abord, puis les plus
 * riches en premier. Aucune si le guide n'en dit rien.
 */
export function pagesDuTheme(pages: readonly PageLue[], theme: string, dejaVues: readonly number[]): number[] {
  const racines = racinesDuTheme(theme);
  const vues = new Set(dejaVues);
  return pages.filter((p) => pageInterrogeable(p.texte))
    .map((p) => ({ numero: p.numero, score: scoreDuTheme(p.texte, racines), vue: vues.has(p.numero) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => Number(a.vue) - Number(b.vue) || b.score - a.score || a.numero - b.numero)
    .map((x) => x.numero);
}
