// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// ── La police cursive des feuilles ────────────────────────────────────────
//
// « Cherche sur internet les polices officielles de l'Éducation nationale ;
// sur les supports d'écriture, je veux ces polices — et pouvoir les changer »
// (l'enseignant, 4 novembre 2026).
//
// La police cursive du ministère est Marelle (Éduscol, mai 2026) : faite pour
// enseigner l'écriture cursive à l'école élémentaire, par des enseignants et
// des typographes, dans la Forge des communs numériques éducatifs, sous
// licence libre OFL — on peut l'embarquer dans l'application et dans les
// feuilles qu'elle imprime (voir assets/polices/marelle/OFL.txt). Elle a pris
// la place d'Écriture A et d'Écriture B (DGESCO, 2013), dont la page d'Éduscol
// mène désormais à Marelle, et qui n'étaient « distribuées librement » qu'« à
// des fins pédagogiques » : celles-là ne s'embarquent pas, mais une fois
// installées sur l'ordinateur, elles se choisissent, comme toute autre police.
//
// Marelle pose ses petites lettres sur 0,48 de sa taille — 18 pt pour une
// réglure de 3 mm —, ses boucles et ses majuscules à trois hauteurs de petite
// lettre, ses jambages à deux : les lignes Seyès, et le ciel, l'herbe et la
// terre de l'atelier d'écriture. Marelle 2 a ses boucles sur deux hauteurs et
// ses jambages sur une, comme on écrit à la fin de l'école élémentaire ; les
// variantes « bâton » ont des majuscules d'imprimerie, pour la maternelle et
// le CP. Les variantes « LIGNES » tracent elles-mêmes, sous chaque lettre et
// chaque espace, les six lignes de la réglure Seyès en couleur — la ligne
// d'écriture en violet, les autres en lilas — : l'atelier d'écriture cursive
// en fait ses « lignes Seyès de Marelle » (`--police-lignes`). Elles pèsent
// plus d'un mégaoctet à elles quatre : elles se chargent à part, après le
// démarrage (voir policesLignes.ts).
//
// Les feuilles n'écrivent pas le nom de la police mais `var(--police-cursive)` :
// l'application pose la police choisie sur sa page, pour l'aperçu, et
// `documentImprimable` la pose dans chaque document, avec le fichier de la
// police quand elle est embarquée. Changer de police change donc toutes les
// feuilles, même celles qu'on refait plus tard.

import marelle from "./assets/polices/marelle/Marelle-Regular.woff2?inline";
import marelle2 from "./assets/polices/marelle/Marelle2-Regular.woff2?inline";
import marelleBaton from "./assets/polices/marelle/MarelleBaton-Regular.woff2?inline";
import marelleBaton2 from "./assets/polices/marelle/MarelleBaton2-Regular.woff2?inline";

export type IdPoliceCursive =
  | "marelle" | "marelle-baton" | "marelle-2" | "marelle-baton-2"
  | "ecriture-a" | "ecriture-b" | "belle-allure" | "cursive-standard" | "systeme" | "autre";

export interface PoliceCursive {
  id: IdPoliceCursive;
  nom: string;
  /** Les familles, la première trouvée l'emporte. */
  familles: string[];
  /** La hauteur des petites lettres, en part de la taille : pour poser une lettre sur une réglure. */
  x: number;
  /** Le fichier de la police, quand l'application l'embarque. */
  fichier?: string;
}

/** Celles que l'application embarque d'abord, puis celles qu'on trouve installées sur l'ordinateur. */
export const POLICES_CURSIVES: PoliceCursive[] = [
  { id: "marelle", nom: "Marelle", familles: ["Marelle"], x: 0.48, fichier: marelle },
  { id: "marelle-baton", nom: "Marelle, majuscules bâtons", familles: ["Marelle Bâton"], x: 0.48, fichier: marelleBaton },
  { id: "marelle-2", nom: "Marelle 2, boucles sur deux interlignes", familles: ["Marelle 2"], x: 0.48, fichier: marelle2 },
  { id: "marelle-baton-2", nom: "Marelle 2, majuscules bâtons", familles: ["Marelle Bâton 2"], x: 0.48, fichier: marelleBaton2 },
  // Les polices d'école qu'on installe soi-même : leurs proportions ne sont pas connues ici, 0,4 est celle d'une cursive ordinaire.
  { id: "ecriture-a", nom: "Écriture A", familles: ["Écriture A", "Ecriture A"], x: 0.4 },
  { id: "ecriture-b", nom: "Écriture B", familles: ["Écriture B", "Ecriture B"], x: 0.4 },
  { id: "belle-allure", nom: "Belle Allure", familles: ["Belle Allure CE", "Belle Allure GS", "Belle Allure CM"], x: 0.4 },
  { id: "cursive-standard", nom: "Cursive standard", familles: ["Cursive standard"], x: 0.4 },
  { id: "systeme", nom: "La cursive du Mac", familles: ["Snell Roundhand"], x: 0.4 },
  { id: "autre", nom: "Une autre police installée…", familles: [], x: 0.4 },
];

export const policeCursive = (id: IdPoliceCursive) => POLICES_CURSIVES.find((p) => p.id === id) ?? POLICES_CURSIVES[0];
export const estEmbarquee = (id: IdPoliceCursive) => !!policeCursive(id).fichier;

/** Le choix de l'enseignant : une police de la liste, ou le nom d'une autre qu'il a installée. */
export interface ChoixPoliceCursive { id: IdPoliceCursive; autre: string }

export const CHOIX_PAR_DEFAUT: ChoixPoliceCursive = { id: "marelle", autre: "" };

/** Gardé avec les réglages de Fabriquer (voir components/useMemoire.ts). */
export const CLE_POLICE_CURSIVE = "fabriquer:policeCursive";

export function choixSur(brut: unknown): ChoixPoliceCursive {
  const o = (brut && typeof brut === "object" ? brut : {}) as Partial<ChoixPoliceCursive>;
  const id = POLICES_CURSIVES.some((p) => p.id === o.id) ? o.id! : CHOIX_PAR_DEFAUT.id;
  const autre = typeof o.autre === "string" ? o.autre.replace(/["\\;{}<>]/g, "").slice(0, 60) : "";
  return { id, autre };
}

/** Les polices de secours, quand rien n'est posé : les polices d'école installées, puis la cursive du système. */
export const CURSIVE_DE_SECOURS = `"Écriture A", "Ecriture A", "Écriture B", "Ecriture B", "Belle Allure GS", "Belle Allure CE", "Belle Allure CM", "Cursive standard", "Ecolier", "ScolaCursive", "Snell Roundhand", cursive`;

/** La police cursive d'une feuille, en CSS : celle que l'application ou le document posent. */
export const POLICE_CURSIVE = `var(--police-cursive, ${CURSIVE_DE_SECOURS})`;

/** La taille d'une cursive dont les petites lettres mesurent `hauteur` : 3 mm de petites lettres, Marelle à 6,25 mm. */
export const tailleCursive = (hauteur: number, unite = "px") => `calc(${hauteur}${unite} / var(--police-cursive-x, 0.4))`;

/** Une autre police, tant qu'on n'a pas écrit son nom : Marelle. */
const enVigueur = (c: ChoixPoliceCursive): ChoixPoliceCursive => (c.id === "autre" && !c.autre.trim() ? CHOIX_PAR_DEFAUT : c);

/** La police à lignes qui va avec le choix : la même variante de Marelle ; Marelle pour toute autre police. */
const LIGNES_DU_CHOIX: Partial<Record<IdPoliceCursive, string>> = {
  "marelle": "Marelle LIGNES", "marelle-baton": "Marelle LIGNES Bâton", "marelle-2": "Marelle LIGNES 2", "marelle-baton-2": "Marelle LIGNES Bâton 2",
};
export const lignesDuChoix = (c: ChoixPoliceCursive) => LIGNES_DU_CHOIX[enVigueur(c).id] ?? "Marelle LIGNES";

/** La police des lignes Seyès de Marelle, en CSS : ses petites lettres font 0,48 de sa taille, comme Marelle. */
export const POLICE_LIGNES = `var(--police-lignes, "Marelle LIGNES"), "Marelle", cursive`;

// Les polices à lignes, une fois chargées : leur fichier par famille.
const fichiersDesLignes: Record<string, string> = {};
let chargementDesLignes: Promise<void> | null = null;

/** Charge les polices à lignes, une fois ; la page les prend dès qu'elles sont là. */
export function chargerLesLignes(): Promise<void> {
  chargementDesLignes ??= import("./policesLignes").then((m) => {
    Object.assign(fichiersDesLignes, m.FICHIERS_DES_LIGNES);
    poserSurLaPage();
  });
  return chargementDesLignes;
}

export const lignesChargees = () => Object.keys(fichiersDesLignes).length > 0;

/** Avant d'imprimer une feuille qui écrit sur les lignes de Marelle : leur police doit être là pour partir avec elle. */
export async function policesPretes(contenu: string): Promise<void> {
  if (contenu.includes("--police-lignes")) await chargerLesLignes();
}

/** Les familles du choix, en CSS, la cursive du système en dernier recours. */
export function famillesDuChoix(choix: ChoixPoliceCursive): string {
  const c = enVigueur(choix);
  const familles = c.id === "autre" ? [c.autre.trim()] : policeCursive(c.id).familles;
  return [...familles.map((f) => `"${f}"`), "\"Snell Roundhand\"", "cursive"].filter((f, i, l) => l.indexOf(f) === i).join(", ");
}

const face = (famille: string, fichier: string) => `@font-face { font-family: "${famille}"; src: url(${fichier}) format("woff2"); font-display: block; }\n`;

/**
 * Ce que pose une page ou un document : la police et ses proportions, le
 * fichier de la police quand elle est embarquée (sauf `cursive` faux) ; avec
 * `lignes`, aussi la police à lignes du choix, quand elle est chargée.
 */
export function cssDuChoix(choix: ChoixPoliceCursive, selecteur = ":root", lignes = false, cursive = true): string {
  const c = enVigueur(choix);
  const p = policeCursive(c.id);
  const famille = lignesDuChoix(c);
  const faces = (cursive && p.fichier ? face(p.familles[0], p.fichier) : "") + (lignes && fichiersDesLignes[famille] ? face(famille, fichiersDesLignes[famille]) : "");
  return `${faces}${selecteur} { --police-cursive: ${famillesDuChoix(c)}; --police-cursive-x: ${p.x}; --police-lignes: "${famille}"; }`;
}

// ── Le choix, gardé et partagé ──

/** Le stockage de la page ; hors d'une page (les essais), aucun. */
const stockage = (): Storage | null => (typeof window === "undefined" ? null : window.localStorage);

const lire = (): ChoixPoliceCursive => {
  try {
    const brut = stockage()?.getItem(CLE_POLICE_CURSIVE);
    return choixSur(brut ? JSON.parse(brut) : null);
  } catch { return CHOIX_PAR_DEFAUT; }
};

let actuel: ChoixPoliceCursive = lire();
const abonnes = new Set<() => void>();

export const choixActuel = () => actuel;

export function choisirPoliceCursive(maj: Partial<ChoixPoliceCursive>): void {
  actuel = choixSur({ ...actuel, ...maj });
  try { stockage()?.setItem(CLE_POLICE_CURSIVE, JSON.stringify(actuel)); } catch { /* stockage indisponible */ }
  poserSurLaPage();
  abonnes.forEach((f) => f());
}

export function abonnerPoliceCursive(f: () => void): () => void {
  abonnes.add(f);
  return () => { abonnes.delete(f); };
}

/** Pose la police choisie sur la page de l'application : les aperçus des feuilles la prennent. */
export function poserSurLaPage(): void {
  if (typeof document === "undefined") return;
  let style = document.getElementById("maitrize-police-cursive");
  if (!style) {
    style = document.createElement("style");
    style.id = "maitrize-police-cursive";
    document.head.appendChild(style);
  }
  style.textContent = cssDuChoix(actuel, ":root", true);
}

/**
 * Ce qu'ajoute `documentImprimable` à un document qui écrit en cursive : la
 * police choisie, et son fichier quand elle est embarquée — le document
 * s'imprime ainsi sur n'importe quel ordinateur, et sur les tablettes.
 */
export function policeDuDocument(contenu: string, c: ChoixPoliceCursive = actuel): string {
  const cursive = contenu.includes("--police-cursive"), lignes = contenu.includes("--police-lignes");
  return cursive || lignes ? cssDuChoix(c, ":root", lignes, cursive) : "";
}

/** Une police installée sur l'ordinateur : le texte change de largeur quand on la demande. */
export function estInstallee(famille: string): boolean {
  if (typeof document === "undefined" || !famille) return false;
  try {
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return false;
    const texte = "abcdefghijklmnopqrstuvwxyz ABCDEFGHIJ 0123456789";
    return ["monospace", "serif", "sans-serif"].some((base) => {
      ctx.font = `40px ${base}`;
      const sans = ctx.measureText(texte).width;
      ctx.font = `40px "${famille}", ${base}`;
      return ctx.measureText(texte).width !== sans;
    });
  } catch { return false; }
}

/** Les polices qu'on peut choisir : celles qu'on embarque, celles qu'on trouve installées, et la police déjà choisie. */
export function policesAuChoix(choisie: IdPoliceCursive = actuel.id): PoliceCursive[] {
  return POLICES_CURSIVES.filter((p) => p.fichier || p.id === "autre" || p.id === choisie || p.familles.some(estInstallee));
}
