// La journée sur une seule page, en bandes (demande de l'enseignant, 31 octobre 2026).
//
// Chaque créneau qu'on imprime y est une bande : son déroulement tel que les
// tablettes le montrent — le rituel d'abord, puis les phases de sa séance et
// les fiches de ses élèves, chacun dans son cadre avec son picto et sa
// matière, reliés par des flèches (voir journalTelephone.ts) —, l'heure en
// tête. Toutes les bandes ont la même largeur, côte à côte, sur une feuille
// A4 en paysage. Un créneau coché « ne pas imprimer » n'y est pas ; une pause
// où rien n'est écrit non plus.
//
// Les cadres sont ceux des tablettes, à leur taille ; un script de la page
// les réduit tous d'autant, juste ce qu'il faut pour que la bande la plus
// longue tienne dans la hauteur — à l'ouverture, une fois les images
// chargées, et avant d'imprimer.

import type { Creneau, MaterielItem, Seance, Sequence } from "./api";
import {
  aFaireDuCreneau, cadresDuDeroulement, domaineDeLaSeance, elevesDuCreneau, estUneFicheDEleve, pasDuDeroulement, pictosDuDeroulement,
  STYLE_DU_DEROULEMENT, type EtapesDeLaSeance, type PasDuDeroulement,
} from "./journalTelephone";
import { mentionDesPictos, type RefPicto } from "./pictosAppoint";
import { STYLE_PIED, documentImprimable, escapeHtml, logoImprimable, piedMaitrize } from "./print";
import { titresDesRituels } from "./rituels";

/** Les temps sans enseignement : la récréation, le repas, la sieste… */
export const estUnePause = (matiere: string): boolean => /r[ée]cr[ée]|pause|accueil|repas|cantine|sieste/i.test(matiere ?? "");

/**
 * Les créneaux qui ont leur bande, dans l'ordre des heures : tous ceux qu'on
 * imprime, sauf une pause où rien n'est écrit — ni séance, ni prévu, ni
 * bilan. Ceux qu'on a cochés « ne pas imprimer » sont déjà partis.
 */
export function creneauxEnBandes(creneaux: Creneau[]): Creneau[] {
  return [...creneaux]
    .filter((c) => !(estUnePause(c.matiere) && !c.seanceId && !c.prevu?.trim() && !c.bilan?.trim()))
    .sort((a, b) => a.heureDebut.localeCompare(b.heureDebut));
}

/** « 8h30 – 9h15 » : la bande est étroite, l'heure n'y prend pas de zéro. */
const heure = (h: string) => h.replace(/^0(\d)/, "$1").replace(":", "h");
export const heuresDeLaBande = (c: Pick<Creneau, "heureDebut" | "heureFin">): string => `${heure(c.heureDebut)} – ${heure(c.heureFin)}`;

/**
 * Le déroulement d'un créneau sur sa bande : celui des tablettes — le rituel
 * d'abord, puis les phases de sa séance —, puis les fiches et les séances de
 * chacun de ses élèves, son prénom avec la matière (une tablette ne montre
 * que les siennes ; la page, toutes). Sans séance ni fiche, une seule carte :
 * ses rituels s'il en cite, sinon sa matière.
 */
export function pasDeLaBande(
  c: Pick<Creneau, "prevu" | "matiere">, seance: Seance | undefined, etapesDe: EtapesDeLaSeance, fiches: MaterielItem[], domaineDeSeance = "",
  sequences: Sequence[] = [], seances: Seance[] = [],
): PasDuDeroulement[] {
  const eleves = elevesDuCreneau(aFaireDuCreneau(c, fiches, sequences, seances));
  const deroulementDe = (eleve?: string) => pasDuDeroulement(c, seance, etapesDe, fiches, domaineDeSeance, eleve, sequences, seances);
  // Le début, commun à tous : celui de la classe ; sans séance, le rituel par lequel commence celui de chaque élève.
  const debut = (eleves.length ? deroulementDe(eleves[0]) : deroulementDe()).filter((p) => !p.fiche);
  const leurs = eleves.flatMap((eleve) => deroulementDe(eleve).filter((p) => p.fiche).map((p) => ({ ...p, eleve })));
  if (debut.length || leurs.length) return [...debut, ...leurs];
  const rituels = titresDesRituels(c.prevu ?? "");
  if (rituels.length) return [{ texte: rituels.join(" · "), matiere: "Rituel", rituel: true }];
  const matiere = (c.matiere ?? "").trim();
  return [{ texte: matiere || "Créneau", matiere: "", ...(matiere ? { domaine: matiere } : {}) }];
}

/** La feuille, en millimètres : un peu moins que les 281 × 194 mm qu'une page A4 en paysage laisse entre ses marges. */
export const FEUILLE_BANDES_MM = { largeur: 279, hauteur: 190 };

/** Après le style des cadres des tablettes (`STYLE_DU_DEROULEMENT`), qu'il met en bandes. */
export const STYLE_BANDES = `
  @page { size: A4 landscape; margin: 8mm; }
  body { margin: 0; padding: 0; max-width: none; }
  @media screen {
    body { background: #e9ecf2; padding: 8mm 0; max-width: none; }
    .feuille-bandes { margin: 0 auto; background: #fff; box-shadow: 0 2px 14px rgba(20, 30, 60, .18); }
  }
  @media print { body { padding: 0 !important; } }
  .feuille-bandes { width: ${FEUILLE_BANDES_MM.largeur}mm; height: ${FEUILLE_BANDES_MM.hauteur}mm; display: flex; flex-direction: column;
    overflow: hidden; break-inside: avoid; page-break-inside: avoid; }
  .bandes-tete { flex: none; display: flex; align-items: baseline; gap: 12px; padding: 0 1mm 2mm; }
  .bandes-tete h1 { font-size: 18px; margin: 0; color: #23527c; }
  .bandes-tete span { color: #687087; font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 600; }
  /* Les filets entre les bandes sont le fond du cadre, vu entre elles : aucune bande n'a de bord, toutes ont la même largeur. */
  .bandes { flex: 1; min-height: 0; display: flex; gap: 1px; background: #cfd6e4; border: 1px solid #cfd6e4; border-radius: 6px; overflow: hidden; }
  .bande { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; background: #fff; }
  .bande-tete { flex: none; padding: 2mm 2.5mm 1.6mm; border-bottom: 1px solid #e3e7ef; background: #f6f8fb; }
  .bande-heure { display: block; font-weight: 800; font-size: 13px; color: #23527c; font-variant-numeric: tabular-nums; }
  .bande-matiere { display: block; font-size: 11px; color: #5a6072; overflow-wrap: anywhere; }
  .bande-corps { flex: 1; min-height: 0; overflow: hidden; padding: 3mm 2mm; }
  /* Une bande étroite coupe un mot trop long plutôt que de le laisser sortir de sa carte. */
  .bande .dr-mots { min-width: 0; hyphens: auto; -webkit-hyphens: auto; overflow-wrap: anywhere; }
  .bandes-vide { padding: 20px; color: #687087; }
  .bandes-fin { flex: none; display: flex; justify-content: space-between; align-items: flex-end; gap: 8px; }
  .bandes-attribution { font-size: 8.5px; color: #8a8f9c; padding-top: 1.5mm; }
  .feuille-bandes .pied-maitrize { position: static; padding: 1.5mm 0 0; margin-left: auto; }
  .bandes-alerte { max-width: ${FEUILLE_BANDES_MM.largeur}mm; margin: 0 auto 4mm; padding: 6px 10px; border-radius: 8px;
    background: #fdecea; color: #8a1f17; font-size: 12px; }
  @media print { .bandes-alerte { display: none; } }
`;

/**
 * Le script de la page : les cadres de toutes les bandes se réduisent
 * ensemble — le même zoom partout, les cartes gardent la même taille d'une
 * bande à l'autre — jusqu'à ce que la plus longue tienne dans sa hauteur,
 * sans descendre sous le quart. Une bande qui ne tient toujours pas est
 * coupée en bas, et un bandeau le dit à l'écran ; il ne s'imprime pas.
 */
const CORPS_BANDES = `
(function () {
  var MIN = 0.25;
  var ajuster = function () {
    var corps = Array.prototype.slice.call(document.querySelectorAll(".bande-corps"));
    var poser = function (z) {
      corps.forEach(function (c) { var x = c.querySelector(".bande-contenu"); if (x) x.style.zoom = z === 1 ? "" : String(z); });
    };
    var deborde = function () { return corps.some(function (c) { return c.scrollHeight > c.clientHeight + 1; }); };
    var coupe = false;
    poser(1);
    if (deborde()) {
      poser(MIN);
      if (deborde()) coupe = true;
      else {
        var bas = MIN, haut = 1;
        for (var k = 0; k < 12; k++) { var m = (bas + haut) / 2; poser(m); if (deborde()) haut = m; else bas = m; }
        poser(bas);
      }
    }
    var alerte = document.querySelector(".bandes-alerte");
    if (alerte) alerte.hidden = !coupe;
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ajuster); else ajuster();
  window.addEventListener("load", ajuster);
  window.addEventListener("beforeprint", ajuster);
})();
`;

/** Les seuls scripts que la page a le droit d'exécuter : elle les reconnaît à leur empreinte (voir `avec_politique`, commands.rs). */
export const SCRIPTS_DES_BANDES = [CORPS_BANDES];

/** Une bande : l'heure et la matière du créneau, puis les cadres de son déroulement. */
export interface Bande { heures: string; matiere: string; cadres: string }

/** Le corps de la page : le jour en titre, les bandes côte à côte, et ce qui finit la feuille (la mention des pictos, le pied). */
export function corpsDesBandes(titre: string, bandes: Bande[], fin = ""): string {
  const colonnes = bandes.length
    ? bandes.map((b) => `<div class="bande"><div class="bande-tete"><span class="bande-heure">${escapeHtml(b.heures)}</span>`
      + (b.matiere.trim() ? `<span class="bande-matiere">${escapeHtml(b.matiere.trim())}</span>` : "")
      + `</div><div class="bande-corps"><div class="bande-contenu"><div class="dr">${b.cadres}</div></div></div></div>`).join("")
    : `<div class="bandes-vide">Aucun créneau à imprimer ce jour-là.</div>`;
  return `<div class="bandes-alerte" hidden>La journée est trop longue pour la page, même réduite : le bas d'une bande est coupé. `
    + `Cochez « ne pas imprimer » sur un créneau, ou raccourcissez une séance.</div>`
    + `<div class="feuille-bandes" lang="fr"><div class="bandes-tete"><h1>${escapeHtml(titre)}</h1><span>La journée</span></div>`
    + `<div class="bandes">${colonnes}</div><div class="bandes-fin">${fin}</div></div>`
    + `<script>${CORPS_BANDES}</script>`;
}

/**
 * La page de la journée en bandes : le déroulement de chaque créneau qui en a
 * une, dessiné comme pour les tablettes, avec les pictos que l'enseignant a
 * choisis — et la mention de leur banque.
 */
export async function pageDeLaJourneeEnBandes(titre: string, creneaux: Creneau[], seances: Seance[], sequences: Sequence[], materiel: MaterielItem[]): Promise<string> {
  const { etapesDeLaSeance } = await import("./aidesALaTache");
  const pictos = await pictosDuDeroulement();
  const fiches = materiel.filter(estUneFicheDEleve);
  const bandes: Bande[] = [];
  const montres: RefPicto[] = [];
  for (const c of creneauxEnBandes(creneaux)) {
    const seance = c.seanceId ? seances.find((s) => s.id === c.seanceId) : undefined;
    const domaine = seance ? domaineDeLaSeance(seance, sequences.find((q) => q.id === seance.sequenceId)) : "";
    const { html, refs } = await cadresDuDeroulement(pasDeLaBande(c, seance, etapesDeLaSeance, fiches, domaine, sequences, seances), pictos);
    bandes.push({ heures: heuresDeLaBande(c), matiere: c.matiere ?? "", cadres: html });
    montres.push(...refs);
  }
  const logo = await logoImprimable().catch(() => "");
  const fin = mentionDesPictos([...new Set(montres)], "", "bandes-attribution") + piedMaitrize(logo);
  return documentImprimable(`La journée — ${titre}`, corpsDesBandes(titre, bandes, fin), STYLE_DU_DEROULEMENT + STYLE_PIED + STYLE_BANDES);
}
