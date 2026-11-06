// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// Les pages de mes manuels, attachées à un créneau du cahier journal.
//
// Depuis un créneau, on choisit l'un de ses manuels (Adapter une fiche ›
// Manuels), puis une page ou plusieurs — d'un clic, et toute une plage avec
// Maj (demande de l'enseignant, novembre 2026). Le prévu les cite en une
// ligne, comme on cite un manuel du coffre-fort : « 📖 Mon fichier de maths ·
// p. 12–14, 16 ». Sous le prévu, le créneau en montre les vignettes : elles
// s'ouvrent en grand, se retirent, s'impriment, et suivent le cahier journal
// quand on imprime le jour.
//
// Le manuel se reconnaît à son titre, sans accents ni majuscules ; une page, à
// son numéro dans le manuel — celui que montre l'écran des manuels. La ligne
// s'écrit aussi à la main (« 📖 mon fichier de maths p 12 à 14 et 16 ») : on
// la lit avec indulgence, et on la récrit propre dès qu'on y touche. Une ligne
// qui cite un passage (« — « … » ») ou porte une image découpée cite autre
// chose que des pages : on n'y touche pas. Une page qui n'existe pas, ou plus,
// est passée.
//
// Le manuel reste sur son ordinateur, le créneau voyage : ailleurs, la ligne
// reste du texte, et rien ne se perd.

import type { Manuel, PageManuel } from "./manuels";
import { escapeHtml } from "./print";
import { forme, insererLigne } from "./sequencesCitees";

/** Des pages d'un manuel, attachées à un créneau : celles qui existent, dans l'ordre du manuel. */
export interface PagesAttachees { manuel: Manuel; pages: PageManuel[] }

/** Au-delà, une plage tapée de travers (« 1-9999 ») s'arrête : aucun manuel n'a tant de pages d'affilée à joindre. */
const PLAGE_MAX = 500;

/** Un numéro de page, ou une plage : « 12 », « 12-14 », « 12–14 », « 12 à 14 ». */
const RE_NUMERO = /(\d{1,4})(?:\s*(?:-|–|à|au)\s*(\d{1,4}))?/g;

/** Les numéros d'une liste de pages : « 12–14, 16 » donne 12, 13, 14, 16 — triés, sans doublon, sans zéro. */
export function numerosDePages(texte: string): number[] {
  const vus = new Set<number>();
  for (const m of (texte ?? "").matchAll(RE_NUMERO)) {
    const a = Number(m[1]);
    const b = m[2] === undefined ? a : Number(m[2]);
    const debut = Math.max(1, Math.min(a, b));
    const fin = Math.min(Math.max(a, b), debut + PLAGE_MAX);
    for (let n = debut; n <= fin; n++) vus.add(n);
  }
  return [...vus].sort((x, y) => x - y);
}

/** Une liste de pages, resserrée en plages : 12, 13, 14, 16 donnent « 12–14, 16 ». */
export function pagesEnTexte(numeros: readonly number[]): string {
  const tries = [...new Set(numeros.filter((n) => Number.isInteger(n) && n > 0))].sort((a, b) => a - b);
  const plages: string[] = [];
  for (let i = 0; i < tries.length;) {
    let j = i;
    while (j + 1 < tries.length && tries[j + 1] === tries[j] + 1) j++;
    plages.push(j > i ? `${tries[i]}–${tries[j]}` : String(tries[i]));
    i = j + 1;
  }
  return plages.join(", ");
}

/** La ligne du prévu : « 📖 Mon fichier de maths · p. 12–14, 16 ». */
export function ligneDesPages(titre: string, numeros: readonly number[]): string {
  const nom = (titre ?? "").replace(/\s+/g, " ").trim() || "Manuel";
  const pages = pagesEnTexte(numeros);
  return `📖 ${nom}${pages ? ` · p. ${pages}` : ""}`;
}

/** Ce que les pages disent d'elles, au créneau comme sur le papier : « Mon fichier de maths · p. 12–14, 16 ». */
export const titreDesPages = (x: PagesAttachees): string =>
  `${x.manuel.titre.trim() || "Manuel"} · p. ${pagesEnTexte(x.pages.map((p) => p.numero))}`;

const NOMBRE_OU_PLAGE = String.raw`\d{1,4}(?:\s*(?:-|–|à|au)\s*\d{1,4})?`;
const SEPARATEUR = String.raw`\s*(?:,|;|&|\bet\b|\s)\s*`;
/** Les pages, au bout de la ligne : « · p. 12–14, 16 », « p12 », « pages 12 et 13 », « (p. 4) ». */
const RE_PAGES = new RegExp(
  String.raw`(?:^|[\s·,:;(])(?:pp?|pages?)\.?\s*(${NOMBRE_OU_PLAGE}(?:${SEPARATEUR}${NOMBRE_OU_PLAGE})*)\s*\)?\s*\.?\s*$`, "iu");

/**
 * Une ligne 📖 qui cite des pages : le titre du manuel, et les numéros — aucun
 * pour « 📖 Mon manuel » seul. Rien pour une autre ligne, ni pour une ligne
 * qui cite un passage ou porte une image : celles-là citent autre chose.
 */
export function lireLigneDePages(ligne: string): { titre: string; numeros: number[] } | null {
  const l = (ligne ?? "").trim();
  if (!l.startsWith("📖") || /[«»]|\[img:/.test(l)) return null;
  const reste = l.slice("📖".length);
  const m = RE_PAGES.exec(reste);
  const titre = (m ? reste.slice(0, m.index) : reste).replace(/[\s·,:;(–-]+$/u, "").trim();
  return titre ? { titre, numeros: m ? numerosDePages(m[1]) : [] } : null;
}

/** Ce qui fait reconnaître un manuel : son titre, sans accents, ni majuscules, ni ponctuation. */
export const cleDuManuel = (titre: string): string => forme(titre).trim();

/** Le manuel qui porte ce titre, sans accents ni majuscules ; le premier, à titre égal. */
export function manuelDuTitre<M extends Pick<Manuel, "titre">>(manuels: readonly M[], titre: string): M | undefined {
  const cherche = forme(titre);
  return cherche.trim() ? manuels.find((m) => forme(m.titre) === cherche) : undefined;
}

/**
 * Les pages de mes manuels que cite un texte, manuel par manuel, dans l'ordre
 * du texte. Deux lignes du même manuel n'en font qu'une ; une page qui
 * n'existe pas est passée, et un manuel sans page qui existe aussi.
 */
export function pagesAttachees(texte: string, manuels: readonly Manuel[]): PagesAttachees[] {
  const sortie: PagesAttachees[] = [];
  for (const ligne of (texte ?? "").split("\n")) {
    const lue = lireLigneDePages(ligne);
    if (!lue?.numeros.length) continue;
    const manuel = manuelDuTitre(manuels, lue.titre);
    if (!manuel) continue;
    const deja = sortie.find((x) => x.manuel.id === manuel.id);
    const voulues = new Set([...(deja?.pages.map((p) => p.numero) ?? []), ...lue.numeros]);
    const pages = manuel.pages.filter((p) => voulues.has(p.numero));
    if (deja) deja.pages = pages;
    else if (pages.length) sortie.push({ manuel, pages });
  }
  return sortie;
}

/** Les lignes d'un texte qui citent des pages de ce manuel, et leurs numéros, tels qu'écrits. */
function lignesDuManuel(lignes: string[], titre: string): { indices: number[]; numeros: number[] } {
  const cherche = forme(titre);
  const indices: number[] = [];
  const numeros = new Set<number>();
  lignes.forEach((l, i) => {
    const lue = lireLigneDePages(l);
    if (!lue?.numeros.length || forme(lue.titre) !== cherche) return;
    indices.push(i);
    for (const n of lue.numeros) numeros.add(n);
  });
  return { indices, numeros: [...numeros].sort((a, b) => a - b) };
}

/**
 * Le texte où ce manuel cite exactement ces pages : sa ligne récrite à sa
 * place — les autres lignes du même manuel s'y fondent —, ou posée après le
 * curseur, ou à la fin. Sans page, ses lignes s'en vont.
 */
export function avecLesPages(texte: string, titre: string, numeros: readonly number[], curseur: number | null = null): string {
  const lignes = (texte ?? "").split("\n");
  const { indices } = lignesDuManuel(lignes, titre);
  if (!numeros.length) return lignes.filter((_, i) => !indices.includes(i)).join("\n");
  const ligne = ligneDesPages(titre, numeros);
  if (!indices.length) return insererLigne(texte ?? "", ligne, curseur);
  return lignes.flatMap((l, i) => (i === indices[0] ? [ligne] : indices.includes(i) ? [] : [l])).join("\n");
}

/** Les numéros des pages de ce manuel que cite le texte, tels qu'écrits — ceux qu'on récrira. */
export const numerosCites = (texte: string, titre: string): number[] => lignesDuManuel((texte ?? "").split("\n"), titre).numeros;

/**
 * Le choix de plusieurs manuels à la fois : chacun cite exactement ses pages.
 * Une ligne déjà là se récrit à sa place ; les nouvelles se posent ensemble,
 * dans l'ordre du choix, après le curseur ou à la fin.
 */
export function avecLesChoix(texte: string, choix: readonly { titre: string; numeros: readonly number[] }[], curseur: number | null = null): string {
  let suite = texte ?? "";
  const nouvelles: string[] = [];
  for (const { titre, numeros } of choix) {
    if (numeros.length && !numerosCites(suite, titre).length) nouvelles.push(ligneDesPages(titre, numeros));
    else suite = avecLesPages(suite, titre, numeros);
  }
  return nouvelles.length ? insererLigne(suite, nouvelles.join("\n"), curseur) : suite;
}

/**
 * Retire ces pages du créneau. Rend le texte, et le rang de la ligne du
 * manuel : c'est là que « Annuler » la remet, si elle est partie.
 */
export function retirerLesPages(texte: string, titre: string, numeros: readonly number[]): { texte: string; ligne: number } {
  const lignes = (texte ?? "").split("\n");
  const siennes = lignesDuManuel(lignes, titre);
  const reste = siennes.numeros.filter((n) => !numeros.includes(n));
  return { texte: avecLesPages(texte, titre, reste), ligne: siennes.indices[0] ?? lignes.length };
}

/**
 * Remet des pages retirées, avec celles que le créneau a gardées ou reçues
 * entre-temps : dans la ligne du manuel si elle est là, sinon à son ancien rang.
 */
export function remettreLesPages(texte: string, titre: string, numeros: readonly number[], ligne: number): string {
  const lignes = (texte ?? "").split("\n");
  const siennes = lignesDuManuel(lignes, titre);
  const toutes = [...new Set([...siennes.numeros, ...numeros])];
  if (siennes.indices.length) return avecLesPages(texte, titre, toutes);
  if (!(texte ?? "").trim()) return ligneDesPages(titre, toutes);
  lignes.splice(Math.max(0, Math.min(lignes.length, ligne)), 0, ligneDesPages(titre, toutes));
  return lignes.join("\n");
}

/**
 * Un clic sur une page, dans le choix des pages : elle entre dans la
 * sélection, ou en sort. Avec Maj, toute la plage depuis la page cliquée
 * avant suit le même sort — comme on coche des messages d'un trait.
 * `numeros` : les pages du manuel, dans leur ordre.
 */
export function cliquerUnePage(selection: readonly number[], numero: number, numeros: readonly number[], derniere: number | null, plage: boolean): number[] {
  const choisies = new Set(selection);
  const ajouter = !choisies.has(numero);
  const i = numeros.indexOf(numero);
  const j = derniere === null ? -1 : numeros.indexOf(derniere);
  const touchees = plage && i >= 0 && j >= 0 ? numeros.slice(Math.min(i, j), Math.max(i, j) + 1) : [numero];
  for (const n of touchees) {
    if (ajouter) choisies.add(n); else choisies.delete(n);
  }
  return [...choisies].sort((a, b) => a - b);
}

/** Deux listes de pages, les mêmes ? L'ordre n'y fait rien. */
export const memesPages = (a: readonly number[], b: readonly number[]): boolean =>
  pagesEnTexte(a) === pagesEnTexte(b);

/**
 * Les pages à imprimer, l'une après l'autre : chacune remplit la largeur de la
 * feuille, sans dépasser sa hauteur ; deux pages courtes se partagent une
 * feuille, une page ne se coupe jamais. Les images sont en base64 (PNG, ou
 * JPEG pour une photo).
 */
export function htmlDesPages(pages: readonly { image: string; numero: number }[], titre: string): string {
  return pages.map((p) => {
    const type = p.image.startsWith("/9j/") ? "image/jpeg" : "image/png";
    return `<img class="page-de-manuel" src="data:${type};base64,${p.image}" alt="${escapeHtml(titre)} — page ${p.numero}">`;
  }).join("");
}

/** Une page de manuel par feuille au plus, en A4 portrait : les marges de l'écran des manuels. */
export const STYLE_PAGES_DE_MANUEL = `
  @page { size: A4 portrait; margin: 8mm; }
  body { padding: 0; }
  img.page-de-manuel { display: block; margin: 0 auto 4mm; width: auto; height: auto; max-width: 100%; max-height: 277mm;
    border-radius: 0; break-inside: avoid; page-break-inside: avoid; }
`;
