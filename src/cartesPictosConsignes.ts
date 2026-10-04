// Les pictos des consignes, en cartes à découper.
//
// Le lexique des verbes ne sert pas qu'aux feuilles. Imprimés en petit, ses
// pictos se manipulent — sur un plan de travail, une bande velcro, la table
// de l'élève — ; en grand, ils s'affichent au tableau. Les pointillés des
// cartes se touchent : un coup de massicot par rangée suffit.

import { VERBES_CONSIGNE, type Lexique } from "./caa";
import { HAUTEUR_UTILE_MM, feuille } from "./cartesImprimables";
import { mentionDesPictos } from "./pictosAppoint";
import { escapeHtml } from "./print";

export type TaillePictos = "tresPetit" | "petit" | "moyen" | "grand";

/** Les tailles : colonnes et lignes par page, et à quoi elles servent. */
export const TAILLES_PICTOS: Record<TaillePictos, { colonnes: number; lignes: number; libelle: string }> = {
  tresPetit: { colonnes: 6, lignes: 8, libelle: "Très petits — 48 par page, à coller" },
  petit: { colonnes: 5, lignes: 5, libelle: "Petits — 25 par page, à manipuler" },
  moyen: { colonnes: 3, lignes: 3, libelle: "Moyens — 9 par page" },
  grand: { colonnes: 2, lignes: 2, libelle: "Grands — 4 par page, pour le tableau" },
};

export interface ReglagesCartesPictos {
  taille: TaillePictos;
  /** Écrire le verbe sous le picto. */
  verbe: boolean;
  /** Combien de jeux de cartes : un par élève, un par groupe. */
  exemplaires: number;
  /** Les verbes retenus ; vide : tous ceux qui ont un picto. */
  choisis: string[];
}

export const REGLAGES_CARTES_PICTOS: ReglagesCartesPictos = { taille: "petit", verbe: true, exemplaires: 1, choisis: [] };

/** Les verbes qui ont un picto, dans l'ordre de la liste. */
export const verbesAvecPicto = (lexique: Lexique): string[] => VERBES_CONSIGNE.map((v) => v.verbe).filter((v) => lexique[v] != null);

/** Les verbes à imprimer : ceux qu'on a choisis, ou tous ceux qui ont un picto. */
export function verbesAImprimer(lexique: Lexique, r: ReglagesCartesPictos): string[] {
  const choisis = new Set(r.choisis);
  const tous = verbesAvecPicto(lexique);
  return choisis.size ? tous.filter((v) => choisis.has(v)) : tous;
}

/** Combien de pages feront les cartes. */
export function pagesDesCartesPictos(combien: number, r: ReglagesCartesPictos): number {
  const t = TAILLES_PICTOS[r.taille] ?? TAILLES_PICTOS.petit;
  return Math.ceil((combien * Math.max(1, r.exemplaires)) / (t.colonnes * t.lignes));
}

/**
 * La hauteur qu'une planche peut occuper : moins que la page, car le document
 * imprimé garde une marge en tête de sa première page. Une rangée qui déborde
 * d'un millimètre partirait seule sur la feuille suivante.
 */
const HAUTEUR_DES_PLANCHES_MM = HAUTEUR_UTILE_MM - 12;

/** Les cartes des verbes, sur des planches prêtes à découper, et la mention des banques de leurs pictos. */
export function htmlCartesPictos(verbes: string[], lexique: Lexique, images: Record<string, string>, r: ReglagesCartesPictos): string {
  if (!verbes.length) return feuille(`<div class="page"><div class="sous">Donnez d'abord un picto aux verbes : ils se rangent en cartes ici.</div></div>`, "cp");
  const taille = TAILLES_PICTOS[r.taille] ? r.taille : "petit";
  const t = TAILLES_PICTOS[taille];
  const parPage = t.colonnes * t.lignes;
  const hauteur = Math.floor(HAUTEUR_DES_PLANCHES_MM / t.lignes);
  // Un jeu après l'autre : chaque élève reçoit ses cartes dans l'ordre de la liste.
  const cartes = Array.from({ length: Math.max(1, r.exemplaires) }, () => verbes).flat().map((v) => {
    const src = images[lexique[v]];
    const image = src ? `<img src="${src}" alt="${escapeHtml(v)}">` : `<span class="cp-manque">${escapeHtml(v)}</span>`;
    return `<div class="cp-carte">${image}${r.verbe ? `<div class="cp-verbe">${escapeHtml(v)}</div>` : ""}</div>`;
  });
  const pages: string[] = [];
  for (let i = 0; i < cartes.length; i += parPage) {
    pages.push(`<div class="page"><div class="cp-grille cp-${taille}" style="grid-template-columns: repeat(${t.colonnes}, 1fr); grid-auto-rows: ${hauteur}mm">`
      + cartes.slice(i, i + parPage).join("") + `</div></div>`);
  }
  // Seuls les pictos imprimés appellent la mention de leur banque.
  const imprimes = verbes.filter((v) => images[lexique[v]]).map((v) => lexique[v]);
  return feuille(pages.join("") + mentionDesPictos(imprimes, "", "attribution"), "cp");
}

export const STYLE_CARTES_PICTOS = `
  .feuille.cp .cp-grille { display: grid; gap: 0; width: 100%; }
  .feuille.cp .cp-carte { border: 1px dashed #9aa0b4; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 1.5mm; padding: 2mm; overflow: hidden; min-width: 0; break-inside: avoid; page-break-inside: avoid; }
  .feuille.cp .cp-carte img { flex: 1 1 0; min-height: 0; max-width: 100%; object-fit: contain; margin: 0; max-height: none; }
  .feuille.cp .cp-verbe { flex: none; font-weight: 700; line-height: 1.1; text-align: center; }
  .feuille.cp .cp-tresPetit .cp-verbe { font-size: 10px; }
  .feuille.cp .cp-petit .cp-verbe { font-size: 13px; }
  .feuille.cp .cp-moyen .cp-verbe { font-size: 22px; }
  .feuille.cp .cp-grand .cp-verbe { font-size: 34px; }
  .feuille.cp .cp-tresPetit .cp-carte { padding: 1.5mm; gap: 1mm; }
  .feuille.cp .cp-manque { flex: 1 1 0; align-self: stretch; display: flex; align-items: center; justify-content: center; border: 1.5px dashed #c4c9d6;
    border-radius: 3mm; color: #9aa0b4; font-weight: 700; font-size: 12px; min-height: 8mm; }
`;
