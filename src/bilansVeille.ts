// ── Les bilans de la veille, sur le cahier journal du jour ────────────────
//
// Le bilan s'écrit le soir ; le journal du lendemain s'imprime le matin, et
// c'est là qu'on a besoin de relire ce qui s'est passé et ce qui reste à
// reprendre. La « veille » est le dernier jour de classe avant celui qu'on
// imprime — le vendredi pour un lundi, le dernier jour avant les vacances
// pour la rentrée. Les réunions n'y figurent pas : un cahier journal circule,
// et ce qui s'y est dit n'est pas pour la classe.

import type { Creneau } from "./api";
import { escapeHtml } from "./print";

export interface BilanDeLaVeille { heure: string; matiere: string; bilan: string }
export interface Veille { date: string; bilans: BilanDeLaVeille[] }

/** Jusqu'où l'on remonte pour trouver la veille : de quoi enjamber des vacances. */
export const JOURS_DE_RECUL = 21;

/** Le bilan tel qu'il s'imprime : sans les marqueurs d'image ou de citation qu'un collage aurait laissés. */
const propre = (texte: string) => (texte ?? "").replace(/\[(img|cite):[^\]]+\]/g, "").replace(/\n{3,}/g, "\n\n").trim();

/**
 * Les bilans du dernier jour de classe avant `jour` (« AAAA-MM-JJ »), par
 * ordre d'heure. Rien si ce jour-là n'a laissé aucun bilan : on ne remonte
 * pas plus loin, ce ne serait plus la veille.
 */
export function veilleDe(creneaux: Creneau[], jour: string): Veille | null {
  const classe = creneaux.filter((c) => c.nature !== "reunion" && (c.date ?? "").slice(0, 10) < jour && (c.date ?? "").slice(0, 10));
  if (!classe.length) return null;
  const date = classe.map((c) => c.date.slice(0, 10)).sort().pop()!;
  const bilans = classe
    .filter((c) => c.date.slice(0, 10) === date && propre(c.bilan))
    .sort((a, b) => a.heureDebut.localeCompare(b.heureDebut))
    .map((c) => ({ heure: c.heureDebut, matiere: c.matiere || "Créneau", bilan: propre(c.bilan) }));
  return bilans.length ? { date, bilans } : null;
}

/** « vendredi 2 octobre ». */
export function jourEnToutesLettres(iso: string): string {
  const d = new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

/** Le bloc imprimé en tête du journal : les bilans de la veille, créneau par créneau. */
export function bilansDeLaVeilleHtml(v: Veille | null): string {
  if (!v) return "";
  return `<div class="veille"><div class="veille-titre">📓 Bilans de la veille — ${escapeHtml(jourEnToutesLettres(v.date))}</div>`
    + v.bilans.map((b) => `<div class="veille-ligne"><span class="veille-quoi">${escapeHtml(b.heure.replace(":", "h"))} · ${escapeHtml(b.matiere)}</span>`
      + `<span class="veille-texte">${escapeHtml(b.bilan)}</span></div>`).join("")
    + `</div>`;
}

export const STYLE_VEILLE = `
  .veille{border:1px solid #cfd6e4;border-left:4px solid #23527c;border-radius:8px;background:#f6f8fc;padding:8px 12px;margin:0 0 14px;page-break-inside:avoid}
  .veille-titre{font-weight:700;color:#23527c;font-size:12px;margin-bottom:4px}
  .veille-ligne{display:flex;gap:10px;font-size:11px;line-height:1.45;padding:3px 0;border-top:1px solid #e6eaf2}
  .veille-ligne:first-of-type{border-top:none}
  .veille-quoi{flex:none;width:150px;font-weight:600;color:#3a4256}
  .veille-texte{flex:1;min-width:0;white-space:pre-wrap;overflow-wrap:anywhere}
`;
