// Le matériel des séances, à la suite du cahier journal.
//
// Une séance a ses PDF (voir `materielSeance`). Quand le journal du jour ou
// de la semaine s'imprime, ces feuilles viennent après lui, dans l'ordre des
// créneaux, prêtes à sortir de l'imprimante d'un seul geste. Un même fichier
// ne sort qu'une fois, même si sa séance revient dans la semaine.
//
// Deux chemins d'impression, une même liste : le journal du jour est une page
// HTML, où chaque page de PDF devient une image ; celui de la semaine est un
// PDF fabriqué côté Rust, qui joint les fichiers eux-mêmes.

import type { Creneau, MaterielItem, Seance } from "./api";
import { escapeHtml } from "./print";
import { lirePdfs } from "./materielSeance";
import type { PageRendue } from "./pdfRendu";

export interface AnnexeAImprimer {
  seanceId: string;
  /** « lundi 28 septembre · 09:00 · Lecture » : d'où vient la feuille. */
  quand: string;
  titre: string;
  fichier: string;
}

type CreneauMinimal = Pick<Creneau, "seanceId" | "heureDebut" | "matiere" | "date">;

/** Les matériels PDF d'une séance, tels qu'enregistrés. */
export const materielDeLaSeance = (seanceId: string | null, materiels: MaterielItem[]): MaterielItem[] =>
  seanceId ? materiels.filter((m) => m.seanceId === seanceId && lirePdfs(m.pdfsJson).length > 0) : [];

/** Les titres du matériel d'un créneau, pour l'annoncer dans le journal. */
export const titresDuMateriel = (c: Pick<Creneau, "seanceId">, materiels: MaterielItem[]): string[] =>
  materielDeLaSeance(c.seanceId, materiels).map((m) => m.titre.trim() || "Matériel");

const hhmm = (h: string) => h.slice(0, 5);

/**
 * Les PDF à joindre, dans l'ordre des créneaux (jour puis heure), chaque
 * fichier une seule fois. `jour` donne le libellé du jour, vide pour le
 * journal d'un seul jour.
 */
export function annexesDesCreneaux(
  creneaux: CreneauMinimal[], seances: Pick<Seance, "id" | "titre">[], materiels: MaterielItem[],
  jour: (c: CreneauMinimal) => string = () => "",
): AnnexeAImprimer[] {
  const ordre = [...creneaux].sort((a, b) => a.date.localeCompare(b.date) || a.heureDebut.localeCompare(b.heureDebut));
  const vus = new Set<string>();
  const sortie: AnnexeAImprimer[] = [];
  for (const c of ordre) {
    if (!c.seanceId) continue;
    const seance = seances.find((s) => s.id === c.seanceId)?.titre.trim();
    const quand = [jour(c).trim(), hhmm(c.heureDebut), seance || c.matiere.trim()].filter(Boolean).join(" · ");
    for (const m of materielDeLaSeance(c.seanceId, materiels)) {
      for (const fichier of lirePdfs(m.pdfsJson)) {
        if (vus.has(fichier)) continue;
        vus.add(fichier);
        sortie.push({ seanceId: c.seanceId, quand, titre: m.titre.trim() || "Matériel", fichier });
      }
    }
  }
  return sortie;
}

/** Les octets d'un fichier lu en base64. */
export function octetsDeBase64(b64: string): Uint8Array {
  const binaire = atob(b64);
  const octets = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
  return octets;
}

export interface AnnexeRendue { annexe: AnnexeAImprimer; pages: PageRendue[] }

/**
 * Les pages jointes du journal HTML : une page imprimée par page de PDF,
 * son image seule, et sur la première un bandeau qui dit d'où elle vient.
 */
export function annexesHtml(rendues: AnnexeRendue[]): string {
  return rendues.flatMap(({ annexe, pages }) => pages.map((p, i) => {
    const bandeau = i === 0
      ? `<div class="annexe-bandeau">📎 Matériel à imprimer · ${escapeHtml([annexe.quand, annexe.titre].filter(Boolean).join(" · "))}`
        + (pages.length > 1 ? ` · ${pages.length} pages` : "") + `</div>`
      : "";
    return `<section class="annexe">${bandeau}<img src="data:image/png;base64,${p.image}" alt="${escapeHtml(annexe.titre)} — page ${i + 1}"></section>`;
  })).join("");
}

/**
 * Chaque page jointe sur sa feuille, l'image plafonnée en hauteur pour
 * laisser sa place au pied de page fixe du journal : une A4 sort à 84 %.
 */
export const STYLE_ANNEXES = `
  .annexe { break-before: page; page-break-before: always; }
  .annexe-bandeau { font-size: 9px; color: #687087; margin: 0 0 2mm; }
  .annexe img { display: block; margin: 0 auto; width: auto; height: auto; max-width: 100%; max-height: 250mm; border-radius: 0; }
`;
