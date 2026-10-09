// Les cartes à tâches : ce que partagent tous les types de cartes.
//
// Une carte pose une question, une seule, sans rien autour : un dessin ou
// quelques mots, puis la réponse. À pinces, trois propositions sur le bord —
// l'élève pince la bonne ; à écrire, une ligne où il la note, sur la carte
// plastifiée ou sur sa fiche réponse. Chaque type de carte sait tirer une
// carte ; la série, la mise en page et le corrigé se font ailleurs (voir
// `cartesATaches`).

import { escapeHtml } from "./print";
import { melanger } from "./hasard";

export type Classe = "GS" | "CP" | "CE1" | "CE2" | "CM1" | "CM2";
export const CLASSES: Classe[] = ["GS", "CP", "CE1", "CE2", "CM1", "CM2"];

export const rang = (c: Classe) => CLASSES.indexOf(c);
/** Les classes de `depuis` à `jusqua`, comprises. */
export const classesDe = (depuis: Classe, jusqua: Classe = "CM2"): Classe[] => CLASSES.slice(rang(depuis), rang(jusqua) + 1);
/** La classe de cycle 2 la plus proche, pour les banques qui s'arrêtent au CE2. */
export const auPlusCE2 = (c: Classe): "CP" | "CE1" | "CE2" => (c === "GS" || c === "CP" ? "CP" : c === "CE1" ? "CE1" : "CE2");

export type Format = "pinces" | "tache";

export type Domaine = "Nombres" | "Calcul" | "Grandeurs et mesures" | "Espace et géométrie" | "Lire et écrire" | "Étude de la langue";
export const DOMAINES: Domaine[] = ["Nombres", "Calcul", "Grandeurs et mesures", "Espace et géométrie", "Lire et écrire", "Étude de la langue"];

/** Une carte : ce que l'élève voit, et la réponse attendue. Tout ce qui est HTML est déjà échappé. */
export interface Carte {
  /** La question, en clair : « Quel est ce solide ? ». */
  question: string;
  /** Ce que la carte montre : un dessin, ou un texte en grand (HTML). */
  visuel: string;
  /** Les propositions d'une carte à pinces (HTML) ; vide si la carte ne se joue qu'à l'écrit. */
  choix: string[];
  /** La bonne proposition ; -1 sans propositions. */
  juste: number;
  /** La réponse, telle que le corrigé l'écrit (HTML). */
  reponse: string;
  /** La ligne où l'élève écrit, sur une carte à écrire (HTML) ; par défaut, des pointillés. */
  ligne?: string;
  /** La réponse sur une étiquette à découper, pour les devinettes (texte). */
  etiquette?: string;
  /** Des réponses presque justes, pour les étiquettes en plus (texte). */
  leurres?: string[];
  /** Ce qui distingue deux cartes : deux cartes pareilles ne sortent pas dans la même série. */
  cle: string;
}

/** Une option propre à un type de cartes : un choix dans une liste. */
export interface OptionType {
  cle: string;
  libelle: string;
  valeurs: (c: Classe) => [string, string][];
  defaut: (c: Classe) => string;
}

export interface Contexte {
  alea: () => number;
  classe: Classe;
  format: Format;
  /** La place du dessin sur la carte, en millimètres. */
  place: { l: number; h: number };
  /** Les options du type, réglées. */
  options: Record<string, string>;
  /** Un élément de la liste, sans remise tant qu'elle n'est pas épuisée : une banque ne redonne pas deux fois la même phrase. */
  pioche: <T>(cle: string, liste: readonly T[]) => T;
}

export interface TypeDeCarte {
  id: string;
  /** Ce que la carte demande, comme on la nomme : « Quel est ce solide ? ». */
  nom: string;
  domaine: Domaine;
  classes: Classe[];
  formats: Format[];
  /** D'où vient ce qu'elle demande. */
  source: string;
  options?: OptionType[];
  /** Ce qu'il faut savoir pour imprimer, dit dans la règle : « imprimez à 100 % ». */
  note?: string;
  /** Une carte, ou rien si ce tirage ne convient pas : on retire. */
  tirer: (ctx: Contexte) => Carte | null;
}

// ── Petits outils ──────────────────────────────────────────────────────────

export const texte = (t: string) => escapeHtml(t);
export const entre = (alea: () => number, a: number, b: number) => a + Math.floor(alea() * (b - a + 1));
export const parmi = <T,>(alea: () => number, liste: readonly T[]): T => liste[Math.floor(alea() * liste.length)];

/** Un texte en grand, au milieu de la carte. */
export const enGrand = (html: string, classe = "") => `<div class="ct-texte${classe ? ` ${classe}` : ""}">${html}</div>`;

/** Un dessin à la taille de la carte : le SVG remplit la place qu'elle lui laisse et garde ses proportions. */
export const dessin = (svg: string) => `<div class="ct-dessin">${svg}</div>`;

/** Un dessin à sa taille réelle, qu'on ne réduit pas : un segment à mesurer. */
export const aTailleReelle = (svg: string) => `<div class="ct-reel">${svg}</div>`;

/** La case vide où va la réponse, dans une écriture : 8 + 7 = □. */
export const BLANC = `<span class="ct-blanc"></span>`;
/** La case d'une lettre qui manque, dans un mot : f□te. */
export const BLANC_LETTRE = `<span class="ct-blanc ct-blanc-lettre"></span>`;

/** Une fraction écrite comme au tableau : le numérateur sur le dénominateur. */
export const fractionHtml = (n: number | string, d: number | string) =>
  `<span class="ct-frac"><span>${n}</span><span>${d}</span></span>`;

/** Ce qu'une proposition dit, sans ses balises : deux propositions qui disent pareil n'en font qu'une. */
const sens = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();

/**
 * Les propositions d'une carte à pinces : la bonne et `n − 1` fausses, sans
 * doublon, mélangées. Les fausses viennent dans l'ordre où on les donne — les
 * plus plausibles d'abord. Moins de deux propositions : pas de carte à pinces.
 */
export function propositions(alea: () => number, juste: string, faux: readonly string[], n = 3): { choix: string[]; juste: number } {
  const vus = new Set([sens(juste)]);
  const retenues: string[] = [];
  for (const f of faux) {
    if (retenues.length >= n - 1) break;
    const s = sens(f);
    if (!s || vus.has(s)) continue;
    vus.add(s);
    retenues.push(f);
  }
  const choix = melanger(alea, [juste, ...retenues]);
  return { choix, juste: choix.indexOf(juste) };
}

/** Les propositions dans un ordre fixe — les signes <, >, = ; oui et non. */
export function dansLOrdre(liste: readonly string[], juste: string): { choix: string[]; juste: number } {
  return { choix: [...liste], juste: liste.indexOf(juste) };
}

/** Des nombres faux mais plausibles, dans [min, max], différents de `n` : on prend ceux qu'on donne, dans l'ordre. */
export function nombresFaux(n: number, candidats: readonly number[], min = 0, max = Number.MAX_SAFE_INTEGER): number[] {
  const sortie: number[] = [];
  for (const c of candidats) {
    if (!Number.isFinite(c) || c === n || c < min || c > max || sortie.includes(c)) continue;
    sortie.push(c);
  }
  return sortie;
}

/** Une carte sans propositions : elle ne se joue qu'à l'écrit. */
export const sansChoix = { choix: [] as string[], juste: -1 };
