// Les étiquettes de mots à trier, et la corolle lexicale.
//
// Livrets Français CP (2025) et CE1 (2026), séquence « vocabulaire » : les
// mots collectés sont donnés sur des étiquettes — grand format aimantées au
// tableau pour la mise en réussite, puis une enveloppe du même jeu par
// trinôme — à regrouper, classer, trier, en donnant un titre à chaque
// catégorie. Les mots doivent être déchiffrables, sinon illustrés.

import { escapeHtml } from "./print";
import { attributionPour, feuille, imgPicto, pagesDeCartes } from "./cartesImprimables";
import type { Images, MotImage } from "./jeuxSons";

export interface ReglagesEtiquettes {
  grandes: boolean;
  petites: boolean;
  /** Une enveloppe par trinôme : autant de jeux de petites étiquettes. */
  enveloppes: number;
  pictos: boolean;
  corolle: boolean;
  titreCorolle: string;
}

export const REGLAGES_ETIQUETTES: ReglagesEtiquettes = { grandes: true, petites: true, enveloppes: 4, pictos: true, corolle: true, titreCorolle: "" };

/** La corolle lexicale : le mot au centre, ses voisins autour. */
export function corolleSvg(titre: string, petales = 8): string {
  const cx = 300, cy = 300, R = 190, rx = 78, ry = 48;
  const pet = Array.from({ length: petales }, (_, i) => {
    const a = (i / petales) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
    return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx}" ry="${ry}" fill="#fff" stroke="#1c2233" stroke-width="2"/>
      <line x1="${(cx + Math.cos(a) * 92).toFixed(1)}" y1="${(cy + Math.sin(a) * 92).toFixed(1)}" x2="${(cx + Math.cos(a) * (R - rx + 6)).toFixed(1)}" y2="${(cy + Math.sin(a) * (R - ry + 6)).toFixed(1)}" stroke="#9aa0b4" stroke-width="1.5"/>`;
  }).join("");
  return `<svg viewBox="0 0 600 600" width="170mm" height="170mm">${pet}
    <circle cx="${cx}" cy="${cy}" r="90" fill="#eef0fe" stroke="#1c2233" stroke-width="2.5"/>
    <text x="${cx}" y="${cy + 8}" text-anchor="middle" font-size="26" font-weight="700" font-family="Helvetica, Arial, sans-serif">${escapeHtml(titre)}</text></svg>`;
}

export function htmlEtiquettes(mots: MotImage[], images: Images, r: ReglagesEtiquettes): string {
  const src = (m: MotImage) => (m.id != null ? images[m.id] : undefined);
  const parties: string[] = [];
  if (r.grandes) {
    const cellules = mots.map((m) => `<div class="carte et-grande">${r.pictos && m.id != null ? imgPicto(src(m), m.mot) : ""}<div class="et-mot">${escapeHtml(m.mot)}</div></div>`);
    parties.push(pagesDeCartes(cellules, { colonnes: 2, lignes: 6, hauteurMm: 40 },
      `<div class="sous">Étiquettes pour le tableau — à aimanter. Les mots collectés : ${mots.length}.
       <span class="reference">Livrets Français CP (2025) et CE1 (2026), Éduscol.</span></div>`));
  }
  if (r.petites) {
    for (let e = 0; e < Math.max(1, r.enveloppes); e++) {
      const cellules = mots.map((m) => `<div class="carte et-petite">${r.pictos && m.id != null ? imgPicto(src(m), m.mot) : ""}<div class="et-mot">${escapeHtml(m.mot)}</div></div>`);
      parties.push(pagesDeCartes(cellules, { colonnes: 4, lignes: 8, hauteurMm: 24 },
        `<div class="sous">Enveloppe ${e + 1} — les mêmes mots, à trier en trinôme.</div>`));
    }
  }
  if (r.corolle) {
    parties.push(`<div class="page"><div class="titre">Corolle lexicale</div>
      <div class="sous">Le mot au centre ; autour, ceux qui vont avec — même famille, contraires, ce qu'on peut faire avec. À compléter au fil de la séquence.</div>
      <div style="text-align:center">${corolleSvg(r.titreCorolle || "")}</div></div>`);
  }
  return feuille(`${parties.join("")}${r.pictos ? attributionPour(mots.map((m) => m.id)) : ""}`, "et");
}

export const STYLE_ETIQUETTES = `
  .feuille.et .et-grande { flex-direction: row; gap: 5mm; justify-content: flex-start; padding: 3mm 6mm; }
  .feuille.et .et-grande img { max-width: 26mm; width: 26mm; }
  .feuille.et .et-grande .et-mot { font-size: 30px; font-weight: 700; }
  .feuille.et .et-petite { flex-direction: row; gap: 3mm; padding: 2mm 3mm; }
  .feuille.et .et-petite img { max-width: 14mm; width: 14mm; }
  .feuille.et .et-petite .et-mot { font-size: 15px; font-weight: 600; }
`;
