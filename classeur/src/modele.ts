// ── Le classeur de communication ──────────────────────────────────────────
//
// Des pages liées, sur les principes du PODD de Gayle Porter : une page 1,
// des cases qui disent un mot, et des cases qui ouvrent une autre page — « je
// veux », puis ce qu'on veut. Les pages se suivent comme dans un livre et se
// rangent en sections numérotées (« 5a », « 5b ») que l'on parcourt en
// tournant la page ; une page d'index, les catégories, mène à toutes. Le PODD
// lui-même est protégé : ses pages ne sont pas reproduites ici ; l'enseignant
// fait les siennes, ou les reprend de Maitrize (format ouvert .obz).
//
// Tout ce qui suit est sans effet de bord : un changement rend un nouveau
// classeur, que l'écran garde (et peut annuler).

export interface Case {
  id: string;
  /** Ce qui s'écrit sous l'image. */
  mot: string;
  /** Ce qui se dit, s'il diffère du mot (« J'ai mal » pour « mal »). */
  dire?: string;
  /** L'image : « arasaac-2486 », « photo-… », « image-… ». */
  image?: string;
  fond?: string;
  bord?: string;
  /** La page qu'elle ouvre. */
  lien?: string;
  /** Cachée à l'élève : la place reste, vide. */
  masquee?: boolean;
  /** Son poids dans son thème (0 à 1), calculé à l'avance : les plus lourdes sont proposées d'abord. */
  poids?: number;
  /** Après elle, les thèmes à proposer (une page, son poids, et parfois ses pictos, choisis pour cette case), calculés à l'avance. */
  suites?: Suite[];
}

/** Un thème qui vient après une case : sa page, son poids ; les cases à montrer, quand elles ont été choisies. */
export interface Suite { page: string; poids: number; cases?: string[] }

export interface Page {
  id: string;
  nom: string;
  lignes: number;
  colonnes: number;
  /** De gauche à droite, de haut en bas : `lignes × colonnes` places, vides ou non. */
  cases: (Case | null)[];
  /** La suite de la page d'avant : la même section (« 5b » après « 5a »), où l'on arrive en tournant la page. */
  suite?: boolean;
}

export interface Classeur {
  id: string;
  nom: string;
  accueil: string;
  /** La page des catégories : l'index d'où l'on va partout (le bouton « Catégories » de chaque page y mène). */
  categories?: string;
  pages: Page[];
  /** La voix de l'élève : une voix de l'appareil, et son débit (1 = normal). */
  voix?: { id?: string; debit?: number };
  /** Faux : balayer la grille ne tourne pas les pages (un élève qui pointe en glissant la main) ; ◀ ▶ restent. */
  balayer?: boolean;
  /** Faux : pas de bande d'ensembles par thème au-dessus de la grille. */
  suggestions?: boolean;
  /** La version des poids calculés à l'avance qu'il porte (celle du classeur complet livré). */
  versionDesPoids?: string;
  creeLe: string;
  modifieLe: string;
}

export const LIGNES_MAX = 8;
export const COLONNES_MAX = 10;

export const nouvelId = (): string => {
  const brut = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return brut.replace(/[^a-zA-Z0-9-]/g, "");
};

const borne = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number.isFinite(n) ? n : min)));

export function nouvellePage(nom: string, lignes = 4, colonnes = 6): Page {
  const l = borne(lignes, 1, LIGNES_MAX), c = borne(colonnes, 1, COLONNES_MAX);
  return { id: nouvelId(), nom: nom.trim() || "Page", lignes: l, colonnes: c, cases: Array(l * c).fill(null) };
}

export function nouveauClasseur(nom: string, lignes = 4, colonnes = 6, maintenant = new Date().toISOString()): Classeur {
  const accueil = nouvellePage("Accueil", lignes, colonnes);
  return { id: nouvelId(), nom: nom.trim() || "Mon classeur", accueil: accueil.id, pages: [accueil], creeLe: maintenant, modifieLe: maintenant };
}

export const pageDe = (c: Classeur, id: string | undefined): Page | undefined => c.pages.find((p) => p.id === id);

/** Ce que dit une case : sa phrase à dire, sinon son mot. */
export const ditDeLaCase = (k: Pick<Case, "mot" | "dire">): string => (k.dire?.trim() || k.mot.trim());

const touche = (c: Classeur, pages: Page[], autre: Partial<Classeur> = {}): Classeur =>
  ({ ...c, ...autre, pages, modifieLe: new Date().toISOString() });

/** Les cases non vides qu'une nouvelle taille ferait disparaître. */
export function casesPerdues(p: Page, lignes: number, colonnes: number): number {
  let n = 0;
  p.cases.forEach((k, i) => {
    if (k && (Math.floor(i / p.colonnes) >= lignes || i % p.colonnes >= colonnes)) n++;
  });
  return n;
}

/** Une autre taille : chaque case garde sa ligne et sa colonne ; ce qui dépasse s'en va. */
export function redimensionner(p: Page, lignes: number, colonnes: number): Page {
  const l = borne(lignes, 1, LIGNES_MAX), c = borne(colonnes, 1, COLONNES_MAX);
  const cases: (Case | null)[] = Array(l * c).fill(null);
  p.cases.forEach((k, i) => {
    const r = Math.floor(i / p.colonnes), col = i % p.colonnes;
    if (k && r < l && col < c) cases[r * c + col] = k;
  });
  return { ...p, lignes: l, colonnes: c, cases };
}

const avecPage = (c: Classeur, pageId: string, f: (p: Page) => Page): Classeur =>
  touche(c, c.pages.map((p) => (p.id === pageId ? f(p) : p)));

export function poserCase(c: Classeur, pageId: string, index: number, valeur: Case | null): Classeur {
  return avecPage(c, pageId, (p) => {
    if (index < 0 || index >= p.cases.length) return p;
    const cases = [...p.cases];
    cases[index] = valeur;
    return { ...p, cases };
  });
}

export const ajouterPage = (c: Classeur, page: Page): Classeur => touche(c, [...c.pages, page]);

export const renommerPage = (c: Classeur, pageId: string, nom: string): Classeur => avecPage(c, pageId, (p) => ({ ...p, nom }));

export const changerTaille = (c: Classeur, pageId: string, lignes: number, colonnes: number): Classeur =>
  avecPage(c, pageId, (p) => redimensionner(p, lignes, colonnes));

/** Retire une page de sa place : si elle ouvrait sa section, la page qui la suivait ouvre ce qu'il en reste. */
function sansLaPage(ordre: Page[], pageId: string): Page[] {
  const i = ordre.findIndex((p) => p.id === pageId);
  if (i < 0) return ordre;
  return ordre.flatMap((p, j) => {
    if (j === i) return [];
    if (j === i + 1 && p.suite && !ordre[i].suite) return [{ ...p, suite: undefined }];
    return [p];
  });
}

/** La page devient la page 1 : elle passe en tête du classeur. */
export function fairePageDAccueil(c: Classeur, pageId: string): Classeur {
  const p = pageDe(c, pageId);
  if (!p) return c;
  return touche(c, [{ ...p, suite: undefined }, ...sansLaPage(ordreDesPages(c), pageId)], { accueil: pageId });
}

/** La page devient l'index des catégories (une seule par classeur). */
export const fairePageDesCategories = (c: Classeur, pageId: string): Classeur =>
  pageDe(c, pageId) ? touche(c, c.pages, { categories: pageId }) : c;

/** Retire une page, et les liens qui y menaient ; l'accueil passe à la première qui reste. La dernière page reste. */
export function supprimerPage(c: Classeur, pageId: string): Classeur {
  if (c.pages.length <= 1 || !pageDe(c, pageId)) return c;
  const pages = sansLaPage(ordreDesPages(c), pageId).map((p) => ({
    ...p,
    cases: p.cases.map((k) => {
      if (!k || (k.lien !== pageId && !k.suites?.some((s) => s.page === pageId))) return k;
      const suites = k.suites?.filter((s) => s.page !== pageId);
      return { ...k, lien: k.lien === pageId ? undefined : k.lien, suites: suites?.length ? suites : undefined };
    }),
  }));
  return touche(c, pages, {
    accueil: c.accueil === pageId ? pages[0].id : c.accueil,
    categories: c.categories === pageId ? undefined : c.categories,
  });
}

// ── L'ordre des pages et les sections ──────────────────────────────────────

/** Les pages dans l'ordre du classeur, comme dans un livre : la page 1 (l'accueil) d'abord, les autres à la suite. */
export function ordreDesPages(c: Classeur): Page[] {
  const accueil = pageDe(c, c.accueil);
  return accueil ? [accueil, ...c.pages.filter((p) => p.id !== accueil.id)] : c.pages;
}

export interface Section { numero: number; pages: Page[] }

/** Les sections : chaque page qui n'est pas la suite de la précédente en ouvre une ; la page 1 ouvre la première. */
export function sectionsDe(c: Classeur): Section[] {
  const sections: Section[] = [];
  ordreDesPages(c).forEach((p, i) => {
    if (i === 0 || !p.suite) sections.push({ numero: sections.length + 1, pages: [p] });
    else sections[sections.length - 1].pages.push(p);
  });
  return sections;
}

export const sectionDe = (c: Classeur, pageId: string): Section | undefined => sectionsDe(c).find((s) => s.pages.some((p) => p.id === pageId));

/** Le numéro d'une page : « 5 », ou « 5a », « 5b »… quand sa section en a plusieurs. */
export function numeroDePage(c: Classeur, pageId: string): string {
  const s = sectionDe(c, pageId);
  if (!s) return "";
  const i = s.pages.findIndex((p) => p.id === pageId);
  return s.pages.length > 1 ? `${s.numero}${String.fromCharCode(97 + Math.min(i, 25))}` : String(s.numero);
}

/** La page d'après (1) ou d'avant (−1) : tourner la page, dans l'ordre du classeur. */
export function pageVoisine(c: Classeur, pageId: string, sens: 1 | -1): Page | undefined {
  const ordre = ordreDesPages(c);
  const i = ordre.findIndex((p) => p.id === pageId);
  return i < 0 ? undefined : ordre[i + sens];
}

/** Une nouvelle page juste après une autre, dans sa section : la page d'après, en tournant la page. */
export function ajouterPageSuivante(c: Classeur, apresId: string, page: Page): Classeur {
  const ordre = ordreDesPages(c);
  const i = ordre.findIndex((p) => p.id === apresId);
  if (i < 0) return ajouterPage(c, page);
  return touche(c, [...ordre.slice(0, i + 1), { ...page, suite: true }, ...ordre.slice(i + 1)]);
}

/** Une nouvelle section, juste après celle de la page. */
export function ajouterSectionApres(c: Classeur, pageId: string, page: Page): Classeur {
  const ordre = ordreDesPages(c);
  const pages = sectionDe(c, pageId)?.pages;
  const derniere = pages?.[pages.length - 1]?.id;
  const i = ordre.findIndex((p) => p.id === derniere);
  if (i < 0) return ajouterPage(c, page);
  return touche(c, [...ordre.slice(0, i + 1), { ...page, suite: undefined }, ...ordre.slice(i + 1)]);
}

/** La page est-elle la suite de la page d'avant ? (La page 1 ne l'est jamais.) */
export function changerSuite(c: Classeur, pageId: string, suite: boolean): Classeur {
  if (pageId === c.accueil) return c;
  return avecPage(c, pageId, (p) => ({ ...p, suite: suite || undefined }));
}

/** Déplace toute la section de la page d'un cran (−1 : plus tôt, 1 : plus tard) ; la section de la page 1 reste en tête. */
export function deplacerSection(c: Classeur, pageId: string, sens: 1 | -1): Classeur {
  const sections = sectionsDe(c);
  const i = sections.findIndex((s) => s.pages.some((p) => p.id === pageId));
  const j = i + sens;
  if (i <= 0 || j <= 0 || j >= sections.length) return c;
  const rangees = [...sections];
  [rangees[i], rangees[j]] = [rangees[j], rangees[i]];
  return touche(c, rangees.flatMap((s) => s.pages));
}

/** Les images dont le classeur se sert. */
export const imagesDuClasseur = (c: Classeur): string[] =>
  [...new Set(c.pages.flatMap((p) => p.cases.flatMap((k) => (k?.image ? [k.image] : []))))];

export function dupliquer(c: Classeur, nom: string, maintenant = new Date().toISOString()): Classeur {
  const copie = JSON.parse(JSON.stringify(c)) as Classeur; // structuredClone n'arrive qu'avec iOS 15.4
  return { ...copie, id: nouvelId(), nom, creeLe: maintenant, modifieLe: maintenant };
}

/** Relit un classeur gardé : ce qui manque ou déborde est remis d'aplomb ; rien s'il est illisible. */
export function lireClasseur(brut: unknown): Classeur | null {
  let v: unknown = brut;
  if (typeof brut === "string") {
    try { v = JSON.parse(brut); } catch { return null; }
  }
  const o = v as Partial<Classeur> | null;
  if (!o || typeof o !== "object" || typeof o.id !== "string" || !Array.isArray(o.pages) || !o.pages.length) return null;
  const pages: Page[] = o.pages.filter((p) => p && typeof p.id === "string").map((p) => {
    const lignes = borne(p.lignes, 1, LIGNES_MAX), colonnes = borne(p.colonnes, 1, COLONNES_MAX);
    const cases: (Case | null)[] = Array(lignes * colonnes).fill(null);
    (Array.isArray(p.cases) ? p.cases : []).slice(0, lignes * colonnes).forEach((k, i) => {
      if (k && typeof k === "object" && typeof k.mot === "string") cases[i] = { ...k, id: typeof k.id === "string" ? k.id : nouvelId() };
    });
    return { id: p.id, nom: typeof p.nom === "string" ? p.nom : "Page", lignes, colonnes, cases, ...(p.suite === true ? { suite: true } : {}) };
  });
  if (!pages.length) return null;
  return {
    id: o.id, nom: typeof o.nom === "string" && o.nom.trim() ? o.nom : "Classeur",
    accueil: pages.some((p) => p.id === o.accueil) ? (o.accueil as string) : pages[0].id,
    ...(typeof o.categories === "string" && pages.some((p) => p.id === o.categories) ? { categories: o.categories } : {}),
    pages, ...(o.voix && typeof o.voix === "object" ? { voix: o.voix } : {}), ...(o.balayer === false ? { balayer: false } : {}),
    ...(o.suggestions === false ? { suggestions: false } : {}),
    ...(typeof o.versionDesPoids === "string" ? { versionDesPoids: o.versionDesPoids } : {}),
    creeLe: typeof o.creeLe === "string" ? o.creeLe : "", modifieLe: typeof o.modifieLe === "string" ? o.modifieLe : "",
  };
}

// ── Les couleurs ───────────────────────────────────────────────────────────

/** Les couleurs des mots, celles des tableaux de langage de Maitrize : un fond pâle, un cadre vif. */
export const COULEURS: { id: string; nom: string; fond: string; bord: string }[] = [
  { id: "personne", nom: "Personnes", fond: "#fff2b8", bord: "#e3b800" },
  { id: "verbe", nom: "Actions", fond: "#d9f0d4", bord: "#2e9b3e" },
  { id: "nom", nom: "Choses", fond: "#fce6ca", bord: "#e07b12" },
  { id: "adjectif", nom: "Descriptifs", fond: "#d6e6f7", bord: "#2f6fd0" },
  { id: "social", nom: "Social", fond: "#fadeeb", bord: "#d6408f" },
  { id: "question", nom: "Questions", fond: "#e9ddf6", bord: "#8a4fd8" },
  { id: "petit mot", nom: "Petits mots", fond: "#f0f0f0", bord: "#8a8f98" },
];

// ── La phrase de l'élève ───────────────────────────────────────────────────

export interface MotDit { mot: string; dire: string; image?: string; caseId?: string }

export const texteDeLaPhrase = (phrase: MotDit[]): string => phrase.map((m) => m.dire).join(" ").replace(/\s+/g, " ").trim();
