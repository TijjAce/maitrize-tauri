// Les pictos des consignes, en cartes à découper.
//
// Le lexique des verbes ne sert pas qu'aux feuilles. Imprimés en petit, ses
// pictos se manipulent — sur un plan de travail, une bande velcro, la table
// de l'élève — ; en grand, ils s'affichent au tableau. Les pointillés des
// cartes se touchent : un coup de massicot par rangée suffit.

import { VERBES_CONSIGNE, type Lexique } from "./caa";
import { feuille } from "./cartesImprimables";
import { mentionDesPictos } from "./pictosAppoint";
import { escapeHtml } from "./print";

export type TaillePictos = "unePage" | "mini" | "tresPetit" | "petit" | "moyen" | "grand";

/**
 * La place des cartes sur une feuille A4, en mm. Un peu moins que la page
 * utile : un navigateur qui imprime avec ses propres marges ne doit pas
 * envoyer la dernière rangée seule sur une feuille de plus.
 */
export const LARGEUR_DES_PLANCHES_MM = 180;
export const HAUTEUR_DES_PLANCHES_MM = 246;

/** Combien de cartes carrées de ce côté tiennent sur une feuille. */
export const cartesParPage = (coteMm: number) =>
  Math.floor(LARGEUR_DES_PLANCHES_MM / coteMm) * Math.floor(HAUTEUR_DES_PLANCHES_MM / coteMm);

/** Les tailles : le côté d'une carte carrée, en mm — « tout sur une feuille » le calcule. */
export const TAILLES_PICTOS: Record<TaillePictos, { nom: string; coteMm: number }> = {
  unePage: { nom: "Tout sur une feuille", coteMm: 0 },
  mini: { nom: "Mini", coteMm: 20 },
  tresPetit: { nom: "Très petits", coteMm: 25 },
  petit: { nom: "Petits", coteMm: 30 },
  moyen: { nom: "Moyens", coteMm: 45 },
  grand: { nom: "Grands, pour le tableau", coteMm: 90 },
};

/** Ce que le choix d'une taille dit : « Petits — 3 cm, 48 par page ». */
export function libelleTaille(t: TaillePictos): string {
  const { nom, coteMm } = TAILLES_PICTOS[t];
  return coteMm ? `${nom} — ${(coteMm / 10).toLocaleString("fr-FR")} cm, ${cartesParPage(coteMm)} par page` : `${nom} — le plus grand carré qui tient`;
}

/** Le plus grand côté, au millimètre, qui met `combien` cartes sur une seule feuille ; 15 mm au moins. */
export function coteSurUneFeuille(combien: number): number {
  for (let c = 90; c > 15; c--) if (cartesParPage(c) >= combien) return c;
  return 15;
}

/** Le côté des cartes, pour tant de cartes et cette taille. */
export function coteDesCartes(combien: number, r: { taille: TaillePictos }): number {
  return (TAILLES_PICTOS[r.taille] ?? TAILLES_PICTOS.unePage).coteMm || coteSurUneFeuille(combien);
}

export interface ReglagesCartesPictos {
  taille: TaillePictos;
  /** Écrire le verbe sous le picto. */
  verbe: boolean;
  /** Combien de jeux de cartes : un par élève, un par groupe. */
  exemplaires: number;
  /** Les verbes retenus ; vide : tous ceux qui ont un picto. */
  choisis: string[];
}

export const REGLAGES_CARTES_PICTOS: ReglagesCartesPictos = { taille: "unePage", verbe: true, exemplaires: 1, choisis: [] };

/** Les verbes qui ont un picto, dans l'ordre de la liste. */
export const verbesAvecPicto = (lexique: Lexique): string[] => VERBES_CONSIGNE.map((v) => v.verbe).filter((v) => lexique[v] != null);

/** Les verbes à imprimer : ceux qu'on a choisis, ou tous ceux qui ont un picto. */
export function verbesAImprimer(lexique: Lexique, r: ReglagesCartesPictos): string[] {
  const choisis = new Set(r.choisis);
  const tous = verbesAvecPicto(lexique);
  return choisis.size ? tous.filter((v) => choisis.has(v)) : tous;
}

/** Combien de cartes en tout : un jeu par exemplaire. */
const nombreDeCartes = (verbes: number, r: ReglagesCartesPictos) => verbes * Math.max(1, r.exemplaires);

/** Combien de pages feront les cartes. */
export function pagesDesCartesPictos(verbes: number, r: ReglagesCartesPictos): number {
  const n = nombreDeCartes(verbes, r);
  return Math.ceil(n / cartesParPage(coteDesCartes(n, r)));
}

/** Les cartes des verbes, sur des planches prêtes à découper, et la mention des banques de leurs pictos. */
export function htmlCartesPictos(verbes: string[], lexique: Lexique, images: Record<string, string>, r: ReglagesCartesPictos): string {
  if (!verbes.length) return feuille(`<div class="page"><div class="sous">Donnez d'abord un picto aux verbes : ils se rangent en cartes ici.</div></div>`, "cp");
  const cote = coteDesCartes(nombreDeCartes(verbes.length, r), r);
  const colonnes = Math.floor(LARGEUR_DES_PLANCHES_MM / cote);
  const parPage = cartesParPage(cote);
  // Des colonnes et des rangées du même côté : des carrés. Le texte et la marge suivent la taille.
  const grille = `grid-template-columns: repeat(${colonnes}, ${cote}mm); grid-auto-rows: ${cote}mm; `
    + `font-size: ${Math.round(Math.max(7, Math.min(30, cote / 3)))}px; --cp-marge: ${Math.max(1, Math.round(cote * 0.6) / 10)}mm`;
  // Un jeu après l'autre : chaque élève reçoit ses cartes dans l'ordre de la liste.
  const cartes = Array.from({ length: Math.max(1, r.exemplaires) }, () => verbes).flat().map((v) => {
    const src = images[lexique[v]];
    const image = src ? `<img src="${src}" alt="${escapeHtml(v)}">` : `<span class="cp-manque">${escapeHtml(v)}</span>`;
    return `<div class="cp-carte">${image}${r.verbe ? `<div class="cp-verbe">${escapeHtml(v)}</div>` : ""}</div>`;
  });
  const pages: string[] = [];
  for (let i = 0; i < cartes.length; i += parPage) {
    pages.push(`<div class="page"><div class="cp-grille" style="${grille}">`
      + cartes.slice(i, i + parPage).join("") + `</div></div>`);
  }
  // Seuls les pictos imprimés appellent la mention de leur banque.
  const imprimes = verbes.filter((v) => images[lexique[v]]).map((v) => lexique[v]);
  return feuille(pages.join("") + mentionDesPictos(imprimes, "", "attribution"), "cp");
}

export const STYLE_CARTES_PICTOS = `
  /* La page entière aux cartes : la marge de la feuille suffit. */
  @media print { body { padding: 0; } }
  .feuille.cp .cp-grille { display: grid; gap: 0; justify-content: center; }
  .feuille.cp .cp-carte { box-sizing: border-box; border: 1px dashed #9aa0b4; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: calc(var(--cp-marge) / 2); padding: var(--cp-marge); overflow: hidden; min-width: 0;
    break-inside: avoid; page-break-inside: avoid; }
  .feuille.cp .cp-carte img { flex: 1 1 0; min-height: 0; max-width: 100%; object-fit: contain; margin: 0; max-height: none; }
  .feuille.cp .cp-verbe { flex: none; font-weight: 700; line-height: 1.05; text-align: center; max-width: 100%; overflow-wrap: anywhere; }
  .feuille.cp .cp-manque { flex: 1 1 0; align-self: stretch; display: flex; align-items: center; justify-content: center; border: 1.5px dashed #c4c9d6;
    border-radius: 3mm; color: #9aa0b4; font-weight: 700; font-size: 12px; min-height: 8mm; }
`;
