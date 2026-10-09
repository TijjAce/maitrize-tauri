// Des cartes à découper, en pages : ce que la plupart des jeux impriment.
//
// Un mémory, des dominos, des étiquettes : ce sont des cases sur une grille,
// avec des pointillés pour couper. Le même moule sert à tous, et la page qu'on
// voit à l'écran est celle qui sort de l'imprimante — même HTML, même feuille
// de style, sous une racine `.feuille` qui ne déborde pas sur l'application.

import { estPerso } from "./imagesPerso";
import { mentionDeMesPictos } from "./mesPictos";
import { escapeHtml } from "./print";

/** Largeur utile d'une page A4 avec les marges de `@page` (14 mm). */
export const LARGEUR_UTILE_MM = 182;
export const HAUTEUR_UTILE_MM = 269;
/**
 * La largeur que la feuille occupe vraiment : le document imprimable garde
 * 32 px de marge intérieure de chaque côté (voir print.ts), 17 mm en tout.
 */
export const LARGEUR_CONTENU_MM = 165;

// La mention des pictogrammes suit la dernière page : sans la règle `:has`,
// le saut de page l'enverrait seule sur une feuille de plus. Dans une petite
// carte, l'image rapetisse pour laisser sa place au mot plutôt que de déborder.
export const STYLE_FEUILLE = `
  .feuille { color: #1c2233; background: #fff; font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  .feuille .page { page-break-after: always; break-after: page; }
  .feuille .page:last-child, .feuille .page:has(+ .attribution) { page-break-after: auto; break-after: auto; }
  .feuille .titre { font-size: 18px; font-weight: 800; margin: 0 0 6px; }
  .feuille .sous { font-size: 12px; color: #687087; margin: 0 0 10px; line-height: 1.45; }
  .feuille .grille { display: grid; gap: 0; width: 100%; }
  .feuille .carte { border: 1px dashed #9aa0b4; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 3mm; padding: 3mm; text-align: center; overflow: hidden; }
  .feuille .carte img { width: 100%; max-width: 30mm; aspect-ratio: 1; object-fit: contain; margin: 0; max-height: none; flex: 0 1 auto; min-height: 0; }
  .feuille .carte .vide { width: 100%; max-width: 30mm; aspect-ratio: 1; border: 1.5px dashed #c4c9d6; border-radius: 4mm; flex: 0 1 auto; min-height: 0; }
  .feuille .mot { font-size: 16px; font-weight: 700; line-height: 1.15; }
  .feuille .regle { border: 1px solid #cfd4e2; border-radius: 8px; padding: 8px 12px; font-size: 12px; line-height: 1.5;
    margin: 0 0 10px; background: #f7f8fc; }
  .feuille .regle b { display: block; margin-bottom: 2px; }
  .feuille .attribution { font-size: 8px; color: #888; margin-top: 8px; text-align: center; }
`;

/** Le crédit que demande la licence des pictogrammes ARASAAC : l'auteur, l'origine, la licence, le propriétaire. */
export const CREDIT_ARASAAC =
  "Pictogrammes : Sergio Palao, ARASAAC (arasaac.org), licence CC BY-NC-SA 4.0, propriété du Gouvernement d'Aragon. Usage non commercial.";

/** Mention exigée par la licence des pictogrammes (CC BY-NC-SA). */
export const ATTRIBUTION_ARASAAC = `<div class="attribution">${CREDIT_ARASAAC}</div>`;

/**
 * La mention, quand la feuille porte au moins un pictogramme de la banque.
 * Les images de l'enseignant — une photo, un dessin — n'ont rien à lui
 * attribuer : une feuille qui n'a qu'elles sort sans mention. Les pictos de
 * « Mes pictos » ont la leur : un dessin de l'IA n'est pas d'ARASAAC.
 */
export function attributionPour(ids: Iterable<number | null | undefined>, mention = ATTRIBUTION_ARASAAC): string {
  const liste = [...ids];
  const miens = mentionDeMesPictos(liste);
  return (liste.some((id) => id != null && !estPerso(id)) ? mention : "")
    + (miens ? `<div class="attribution">${escapeHtml(miens)}</div>` : "");
}

/** Une image de pictogramme, ou une case vide si elle manque. */
export const imgPicto = (src: string | undefined, mot: string) =>
  src ? `<img src="${src}" alt="${escapeHtml(mot)}">` : `<div class="vide" title="${escapeHtml(mot)}"></div>`;

/** Le mot sous l'image, quand on le veut. */
export const legende = (mot: string, montre: boolean) => (montre ? `<div class="mot">${escapeHtml(mot)}</div>` : "");

export interface FormatGrille {
  colonnes: number;
  lignes: number;
  /** Hauteur d'une carte, en mm ; par défaut la page se partage. */
  hauteurMm?: number;
  /** Des cartes carrées — celles des pictos : le côté est la hauteur, si la largeur de la page le permet. */
  carre?: boolean;
  /** La largeur d'une carte, en mm, quand elle n'est pas un partage de la page : un domino fait deux carrés. */
  largeurMm?: number;
}

/** La hauteur d'une rangée de cartes, en mm : celle qu'on a donnée, ou la page partagée ; un carré ne dépasse pas sa part de largeur. */
export function hauteurDesCartes(format: FormatGrille, entete: boolean): number {
  const hauteur = format.hauteurMm ?? Math.floor((HAUTEUR_UTILE_MM - (entete ? 30 : 0)) / format.lignes);
  return format.carre ? Math.min(hauteur, Math.floor(LARGEUR_CONTENU_MM / format.colonnes)) : hauteur;
}

/** Les colonnes et les rangées d'une grille de cartes : partagées dans la largeur, ou carrées et centrées. */
export function gabaritGrille(format: FormatGrille, entete: boolean): string {
  const hauteur = hauteurDesCartes(format, entete);
  if (!format.carre && !format.largeurMm) return `grid-template-columns: repeat(${format.colonnes}, 1fr); grid-auto-rows: ${hauteur}mm`;
  return `grid-template-columns: repeat(${format.colonnes}, ${format.largeurMm ?? hauteur}mm); grid-auto-rows: ${hauteur}mm; justify-content: center`;
}

/**
 * Des cellules réparties en pages de `colonnes × lignes`.
 *
 * `entete` s'imprime en haut de chaque page (titre, règle) ; les cellules
 * sont du HTML déjà prêt.
 */
export function pagesDeCartes(cellules: string[], format: FormatGrille, entete = ""): string {
  const parPage = format.colonnes * format.lignes;
  const gabarit = gabaritGrille(format, Boolean(entete));
  const pages: string[] = [];
  for (let i = 0; i < Math.max(1, cellules.length); i += parPage) {
    const tranche = cellules.slice(i, i + parPage);
    pages.push(`<div class="page">${entete}<div class="grille" style="${gabarit}">${tranche.join("")}</div></div>`);
  }
  return pages.join("");
}

/**
 * Des cartes en pages, quand la première porte aussi le titre et la règle
 * du jeu : elle a une rangée de moins, pour que la dernière ne passe pas
 * seule sur la page suivante.
 */
export function pagesAvecRegle(cellules: string[], format: FormatGrille, entete: string): string {
  // Le titre, la règle et l'en-tête des compétences prennent 55 mm au plus ; les cartes gardent leur taille.
  const hauteur = hauteurDesCartes(format, true);
  const premiere = { ...format, lignes: Math.max(1, Math.min(format.lignes, Math.floor((HAUTEUR_UTILE_MM - 55) / hauteur))) };
  const n = premiere.colonnes * premiere.lignes;
  return pagesDeCartes(cellules.slice(0, n), premiere, entete) + (cellules.length > n ? pagesDeCartes(cellules.slice(n), format) : "");
}

/**
 * Recto et verso : la page des dos suit celle des faces, chaque ligne
 * inversée, pour qu'une impression recto-verso sur le bord long tombe juste.
 */
export function pagesRectoVerso(rectos: string[], versos: string[], format: FormatGrille, entete = ""): string {
  const parPage = format.colonnes * format.lignes;
  // Toutes les rangées tiennent sous le titre, la règle et l'en-tête des compétences — 55 mm au plus, comme pour
  // pagesAvecRegle — : une rangée qui déborderait décalerait d'une page le verso, qui ne tomberait plus au dos.
  const hauteurMm = format.hauteurMm ?? Math.floor((HAUTEUR_UTILE_MM - (entete ? 55 : 0)) / format.lignes);
  const gabarit = gabaritGrille({ ...format, hauteurMm }, Boolean(entete));
  const page = (cellules: string[], tete: string) =>
    `<div class="page">${tete}<div class="grille" style="${gabarit}">${cellules.join("")}</div></div>`;
  const pages: string[] = [];
  for (let i = 0; i < Math.max(1, rectos.length); i += parPage) {
    const faces = rectos.slice(i, i + parPage);
    const dos = versos.slice(i, i + parPage);
    // Chaque ligne du verso se lit de droite à gauche.
    const dosMiroir: string[] = [];
    for (let l = 0; l < format.lignes; l++) {
      const ligne = dos.slice(l * format.colonnes, (l + 1) * format.colonnes);
      while (ligne.length < format.colonnes && ligne.length > 0) ligne.push(`<div class="carte"></div>`);
      dosMiroir.push(...ligne.reverse());
    }
    pages.push(page(faces, entete), page(dosMiroir, `<div class="sous">Verso — imprimer au dos de la page précédente (recto-verso, bord long).</div>`));
  }
  return pages.join("");
}

/** Une carte : image (facultative) et mot (facultatif). */
export const carte = (contenu: string, classe = "") => `<div class="carte ${classe}">${contenu}</div>`;

/** Le document entier, sous sa racine. */
export const feuille = (corps: string, classe = "") => `<div class="feuille ${classe}">${corps}</div>`;
