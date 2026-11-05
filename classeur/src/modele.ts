// ── Le classeur de communication ──────────────────────────────────────────
//
// Des pages liées, sur les principes du PODD de Gayle Porter : une page
// d'accueil, des cases qui disent un mot, et des cases qui ouvrent une autre
// page — « je veux », puis ce qu'on veut. Le PODD lui-même est protégé : ses
// pages ne sont pas reproduites ici ; l'enseignant fait les siennes, ou les
// reprend de Maitrize (format ouvert .obz).
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
}

export interface Page {
  id: string;
  nom: string;
  lignes: number;
  colonnes: number;
  /** De gauche à droite, de haut en bas : `lignes × colonnes` places, vides ou non. */
  cases: (Case | null)[];
}

export interface Classeur {
  id: string;
  nom: string;
  accueil: string;
  pages: Page[];
  /** La voix de l'élève : une voix de l'appareil, et son débit (1 = normal). */
  voix?: { id?: string; debit?: number };
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

export const fairePageDAccueil = (c: Classeur, pageId: string): Classeur =>
  pageDe(c, pageId) ? touche(c, c.pages, { accueil: pageId }) : c;

/** Retire une page, et les liens qui y menaient ; l'accueil passe à la première qui reste. La dernière page reste. */
export function supprimerPage(c: Classeur, pageId: string): Classeur {
  if (c.pages.length <= 1 || !pageDe(c, pageId)) return c;
  const pages = c.pages.filter((p) => p.id !== pageId).map((p) => ({
    ...p, cases: p.cases.map((k) => (k?.lien === pageId ? { ...k, lien: undefined } : k)),
  }));
  return touche(c, pages, { accueil: c.accueil === pageId ? pages[0].id : c.accueil });
}

/** Les images dont le classeur se sert. */
export const imagesDuClasseur = (c: Classeur): string[] =>
  [...new Set(c.pages.flatMap((p) => p.cases.flatMap((k) => (k?.image ? [k.image] : []))))];

export function dupliquer(c: Classeur, nom: string, maintenant = new Date().toISOString()): Classeur {
  return { ...structuredClone(c), id: nouvelId(), nom, creeLe: maintenant, modifieLe: maintenant };
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
    return { id: p.id, nom: typeof p.nom === "string" ? p.nom : "Page", lignes, colonnes, cases };
  });
  if (!pages.length) return null;
  return {
    id: o.id, nom: typeof o.nom === "string" && o.nom.trim() ? o.nom : "Classeur",
    accueil: pages.some((p) => p.id === o.accueil) ? (o.accueil as string) : pages[0].id,
    pages, ...(o.voix && typeof o.voix === "object" ? { voix: o.voix } : {}),
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

export interface MotDit { mot: string; dire: string; image?: string }

export const texteDeLaPhrase = (phrase: MotDit[]): string => phrase.map((m) => m.dire).join(" ").replace(/\s+/g, " ").trim();
