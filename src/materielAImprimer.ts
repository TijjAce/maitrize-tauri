// Le matériel des séances, à la suite du cahier journal.
//
// Une séance a ses PDF (voir `materielSeance`). Quand le journal du jour ou
// de la semaine s'imprime, ces feuilles viennent après lui, dans l'ordre des
// créneaux, prêtes à sortir de l'imprimante d'un seul geste. Un même fichier
// ne sort qu'une fois, même si sa séance revient dans la semaine.
//
// Un créneau désigne sa séance de deux façons : par le lien posé dans le
// planning, ou en la citant dans son prévu — la ligne du bouton 📚, ou le
// titre de la séquence écrit à la main. Les deux comptent. Une séquence citée
// sans préciser la séance apporte son matériel à elle.
//
// Deux chemins d'impression, une même liste : le journal du jour est une page
// HTML, où chaque page de PDF devient une image ; celui de la semaine est un
// PDF fabriqué côté Rust, qui joint les fichiers eux-mêmes.

import type { Creneau, MaterielItem, Seance, Sequence } from "./api";
import { escapeHtml } from "./print";
import { lirePdfs } from "./materielSeance";
import { sequencesCitees } from "./sequencesCitees";
import type { PageRendue } from "./pdfRendu";

export interface AnnexeAImprimer {
  seanceId: string;
  /** « lundi 28 septembre · 09:00 · Lecture » : d'où vient la feuille. */
  quand: string;
  titre: string;
  fichier: string;
  /** L'échelle à l'impression : 1 telle quelle, 0,8 réduite, 1,2 agrandie. */
  echelle: number;
}

// ── L'échelle d'une feuille à l'impression ──────────────────────────────────
//
// Une feuille scannée trop grande sort rognée, une fiche trop petite ne se
// lit pas : chaque matériel garde son échelle, en pourcentage, dans un
// réglage — et le journal l'applique, à l'écran comme sur le PDF.

export const ECHELLE_MIN = 50;
export const ECHELLE_MAX = 150;
export const ECHELLE_PAS = 5;
export const cleEchelle = (materielId: string) => `impression:echelle:${materielId}`;

/** Le facteur d'échelle d'un réglage : 1 s'il est absent ou illisible. */
export function lireEchelle(brut: string | null | undefined): number {
  const n = Number(brut);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(ECHELLE_MAX, Math.max(ECHELLE_MIN, Math.round(n))) / 100;
}

/** Les échelles de tous les matériels, d'après l'ensemble des réglages. */
export function echellesDesReglages(reglages: Record<string, string>): Record<string, number> {
  const prefixe = cleEchelle("");
  const sortie: Record<string, number> = {};
  for (const [cle, valeur] of Object.entries(reglages)) {
    if (cle.startsWith(prefixe) && cle.length > prefixe.length) sortie[cle.slice(prefixe.length)] = lireEchelle(valeur);
  }
  return sortie;
}

type CreneauMinimal = Pick<Creneau, "seanceId" | "heureDebut" | "matiere" | "date" | "prevu">;
type Liens = { seances: Set<string>; sequences: Set<string> };

/** Les séances et les séquences qu'un créneau désigne : son lien, et ce que son prévu cite. */
export function liensDuCreneau(c: Pick<Creneau, "seanceId" | "prevu">, sequences: Sequence[], seances: Seance[]): Liens {
  const liens: Liens = { seances: new Set(), sequences: new Set() };
  if (c.seanceId) liens.seances.add(c.seanceId);
  for (const { sequence, seance } of sequencesCitees(c.prevu ?? "", sequences, seances)) {
    if (seance) liens.seances.add(seance.id);
    else liens.sequences.add(sequence.id);
  }
  return liens;
}

/** Les matériels PDF d'un créneau : ceux de ses séances, puis ceux des séquences citées sans séance. */
export function materielDuCreneau(
  c: Pick<Creneau, "seanceId" | "prevu">, sequences: Sequence[], seances: Seance[], materiels: MaterielItem[],
): MaterielItem[] {
  const liens = liensDuCreneau(c, sequences, seances);
  const avecPdf = materiels.filter((m) => lirePdfs(m.pdfsJson).length > 0);
  return [
    ...avecPdf.filter((m) => m.seanceId && liens.seances.has(m.seanceId)),
    ...avecPdf.filter((m) => !m.seanceId && m.sequenceId && liens.sequences.has(m.sequenceId)),
  ];
}

/** Les titres du matériel d'un créneau, pour l'annoncer dans le journal. */
export const titresDuMateriel = (
  c: Pick<Creneau, "seanceId" | "prevu">, sequences: Sequence[], seances: Seance[], materiels: MaterielItem[],
): string[] => materielDuCreneau(c, sequences, seances, materiels).map((m) => m.titre.trim() || "Matériel");

const hhmm = (h: string) => h.slice(0, 5);

/**
 * Les PDF à joindre, dans l'ordre des créneaux (jour puis heure), chaque
 * fichier une seule fois. `jour` donne le libellé du jour, vide pour le
 * journal d'un seul jour.
 */
export function annexesDesCreneaux(
  creneaux: CreneauMinimal[], sequences: Sequence[], seances: Seance[], materiels: MaterielItem[],
  jour: (c: CreneauMinimal) => string = () => "",
  echelles: Record<string, number> = {},
): AnnexeAImprimer[] {
  const ordre = [...creneaux].sort((a, b) => a.date.localeCompare(b.date) || a.heureDebut.localeCompare(b.heureDebut));
  const vus = new Set<string>();
  const sortie: AnnexeAImprimer[] = [];
  for (const c of ordre) {
    const seance = seances.find((s) => s.id === c.seanceId)?.titre.trim();
    const quand = [jour(c).trim(), hhmm(c.heureDebut), seance || c.matiere.trim()].filter(Boolean).join(" · ");
    for (const m of materielDuCreneau(c, sequences, seances, materiels)) {
      for (const fichier of lirePdfs(m.pdfsJson)) {
        if (vus.has(fichier)) continue;
        vus.add(fichier);
        sortie.push({ seanceId: m.seanceId ?? c.seanceId ?? "", quand, titre: m.titre.trim() || "Matériel", fichier, echelle: echelles[m.id] ?? 1 });
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
 *
 * À l'écran, avant d'imprimer, chaque feuille a sa molette : elle change
 * l'échelle de ses pages sous les yeux, et disparaît à l'impression. Ce
 * qu'on règle là ne vaut que pour cette impression ; la molette de la
 * séance ou du journal, elle, se garde.
 */
export function annexesHtml(rendues: AnnexeRendue[]): string {
  const sections = rendues.flatMap(({ annexe, pages }, k) => pages.map((p, i) => {
    const pourcent = Math.round((annexe.echelle || 1) * 100);
    const bandeau = i === 0
      ? `<div class="annexe-bandeau">📎 Matériel à imprimer · ${escapeHtml([annexe.quand, annexe.titre].filter(Boolean).join(" · "))}`
        + (pages.length > 1 ? ` · ${pages.length} pages` : "") + `</div>`
        + `<div class="annexe-outils" data-annexe="${k}">🔍 Échelle à l'impression <button type="button" data-pas="-${ECHELLE_PAS}" aria-label="Réduire">−</button>`
        + `<input type="range" min="${ECHELLE_MIN}" max="${ECHELLE_MAX}" step="${ECHELLE_PAS}" value="${pourcent}" aria-label="Échelle">`
        + `<button type="button" data-pas="${ECHELLE_PAS}" aria-label="Agrandir">+</button><output>${pourcent} %</output></div>`
      : "";
    // L'échelle se pose sur l'image, autour de son centre ; le cadre rogne ce qui dépasse. La page garde
    // sa place : agrandie, l'image perd ses marges au lieu d'empiéter sur le bandeau ou la page suivante.
    const echelle = annexe.echelle && Math.abs(annexe.echelle - 1) > 0.001 ? ` style="transform: scale(${annexe.echelle}); transform-origin: center"` : "";
    return `<section class="annexe" data-annexe="${k}">${bandeau}<div class="annexe-cadre"><img src="data:image/png;base64,${p.image}" alt="${escapeHtml(annexe.titre)} — page ${i + 1}"${echelle}></div></section>`;
  }));
  return sections.length ? sections.join("") + SCRIPT_ANNEXES : "";
}

/**
 * La molette du cahier journal lui-même, en haut de la page imprimée.
 *
 * Elle agit par `zoom` sur le bloc `.journal` : le texte se remet en page et
 * la pagination suit — ce n'est pas un agrandissement d'image. Elle
 * disparaît à l'impression, et le navigateur retient la dernière valeur.
 */
export function moletteDuJournalHtml(): string {
  return `<div class="annexe-outils journal-outils">🔍 Échelle du cahier journal à l'impression <button type="button" data-pas="-${ECHELLE_PAS}" aria-label="Réduire">−</button>`
    + `<input type="range" min="${ECHELLE_MIN}" max="${ECHELLE_MAX}" step="${ECHELLE_PAS}" value="100" aria-label="Échelle du journal">`
    + `<button type="button" data-pas="${ECHELLE_PAS}" aria-label="Agrandir">+</button><output>100 %</output>`
    + `<span class="journal-outils-aide">Les feuilles jointes ont chacune la leur, plus bas.</span></div>`
    + SCRIPT_JOURNAL;
}

const SCRIPT_JOURNAL = `<script>
(function () {
  // La molette est écrite avant le journal : on attend que la page soit entière.
  var demarrer = function () {
  var outils = document.querySelector(".journal-outils");
  var journal = document.querySelector(".journal");
  if (!outils || !journal) return;
  var curseur = outils.querySelector("input");
  var sortie = outils.querySelector("output");
  var CLE = "maitrize:echelle-journal";
  var appliquer = function (v, retenir) {
    v = Math.max(${ECHELLE_MIN}, Math.min(${ECHELLE_MAX}, Number(v) || 100));
    curseur.value = String(v); sortie.textContent = v + " %";
    journal.style.zoom = v === 100 ? "" : String(v / 100);
    if (retenir) { try { localStorage.setItem(CLE, String(v)); } catch (e) {} }
  };
  try { var gardee = localStorage.getItem(CLE); if (gardee) appliquer(gardee, false); } catch (e) {}
  curseur.addEventListener("input", function () { appliquer(curseur.value, true); });
  outils.querySelectorAll("button").forEach(function (b) {
    b.addEventListener("click", function () { appliquer(Number(curseur.value) + Number(b.getAttribute("data-pas")), true); });
  });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", demarrer); else demarrer();
})();
</script>`;

/** La molette des feuilles jointes, à l'écran : elle règle les images de sa feuille. */
const SCRIPT_ANNEXES = `<script>
(function () {
  document.querySelectorAll(".annexe-outils[data-annexe]").forEach(function (outils) {
    var k = outils.getAttribute("data-annexe");
    var curseur = outils.querySelector("input");
    var sortie = outils.querySelector("output");
    var images = document.querySelectorAll('.annexe[data-annexe="' + k + '"] img');
    var appliquer = function (v) {
      v = Math.max(${ECHELLE_MIN}, Math.min(${ECHELLE_MAX}, Number(v) || 100));
      curseur.value = String(v); sortie.textContent = v + " %";
      images.forEach(function (img) { img.style.transform = v === 100 ? "" : "scale(" + (v / 100) + ")"; img.style.transformOrigin = "center"; });
    };
    curseur.addEventListener("input", function () { appliquer(curseur.value); });
    outils.querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function () { appliquer(Number(curseur.value) + Number(b.getAttribute("data-pas"))); });
    });
  });
})();
</script>`;

/**
 * Chaque page jointe sur sa feuille, l'image plafonnée en hauteur pour
 * laisser sa place au pied de page fixe du journal : une A4 sort à 84 %.
 */
export const STYLE_ANNEXES = `
  .annexe { break-before: page; page-break-before: always; }
  .annexe-bandeau { font-size: 9px; color: #687087; margin: 0 0 2mm; }
  .annexe-outils { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #3b4256; margin: 0 0 8px;
    padding: 6px 10px; border: 1px dashed #9aa0b4; border-radius: 8px; background: #f7f8fc; }
  .annexe-outils input[type="range"] { width: 140px; }
  .annexe-outils button { font: inherit; width: 26px; height: 26px; border: 1px solid #9aa0b4; border-radius: 6px; background: #fff; cursor: pointer; }
  .annexe-outils output { min-width: 40px; text-align: right; font-variant-numeric: tabular-nums; }
  .journal-outils { margin: 0 0 14px; flex-wrap: wrap; }
  .journal-outils-aide { color: #687087; font-size: 11px; }
  @media print { .annexe-outils { display: none; } }
  .annexe-cadre { overflow: hidden; break-inside: avoid; page-break-inside: avoid; }
  .annexe img { display: block; margin: 0 auto; width: auto; height: auto; max-width: 100%; max-height: 250mm; border-radius: 0; }
`;
