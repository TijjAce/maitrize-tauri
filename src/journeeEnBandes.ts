// La journée sur une seule page, en bandes (demande de l'enseignant, 31 octobre 2026).
//
// Chaque créneau qu'on imprime y est une bande : son déroulement tel que les
// tablettes le montrent — le rituel d'abord, puis ses séances, ses jeux et
// les fiches de ses élèves, chacun dans sa carte avec son picto et sa matière,
// reliés par des flèches (voir journalTelephone.ts) —, l'heure en tête. Un créneau coché « ne pas imprimer » n'y est pas ; une pause où rien
// n'est écrit non plus.
//
// Puis, à sa demande : « les bandes comme ça » — les cartes de la colonne des
// tablettes, le picto au-dessus, la matière, le titre —, « elles font
// toujours la même taille », « doivent tenir sur une page », « regroupées au
// même endroit ». Les bandes ont donc une largeur fixe et se tiennent
// ensemble au milieu de la page ; toutes les cartes ont la même taille. La
// page suit le cahier journal du jour, en portrait — et seulement là : « ça
// se met tout seul dans le cahier journal, pas besoin de faire la
// distinction » (plus de page à part, en paysage).
//
// Un script de la page réduit toutes les cartes d'autant, juste ce qu'il faut
// pour que la bande la plus longue tienne dans la hauteur — à l'ouverture,
// une fois les images chargées, et avant d'imprimer.

import type { Creneau, Jeu, MaterielItem, Seance, Sequence } from "./api";
import {
  aFaireDuCreneau, cadresDuDeroulement, domaineDeLaSeance, elevesDuCreneau, estUneFicheDEleve, pasDuDeroulement, pictosDuDeroulement,
  STYLE_DU_DEROULEMENT, type PasDuDeroulement,
} from "./journalTelephone";
import type { RefPicto } from "./pictosAppoint";
import { escapeHtml } from "./print";
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
 * d'abord, puis ses séances, posée ou citées au prévu, et ses jeux, une carte
 * chacun —, puis les fiches et les séances de chacun de ses élèves, son
 * prénom avec la matière (une tablette ne montre que les siennes ; la page,
 * toutes). Sans séance, ni jeu, ni fiche, une seule carte : ses rituels s'il
 * en cite, sinon sa matière.
 */
export function pasDeLaBande(
  c: Pick<Creneau, "prevu" | "matiere">, seance: Seance | undefined, fiches: MaterielItem[], domaineDeSeance = "",
  sequences: Sequence[] = [], seances: Seance[] = [], jeux: Jeu[] = [],
): PasDuDeroulement[] {
  const eleves = elevesDuCreneau(aFaireDuCreneau(c, fiches, sequences, seances));
  const deroulementDe = (eleve?: string) => pasDuDeroulement(c, seance, fiches, domaineDeSeance, eleve, sequences, seances, jeux);
  // Le début, commun à tous : celui de la classe ; sans séance, le rituel par lequel commence celui de chaque élève.
  const debut = (eleves.length ? deroulementDe(eleves[0]) : deroulementDe()).filter((p) => !p.fiche);
  const leurs = eleves.flatMap((eleve) => deroulementDe(eleve).filter((p) => p.fiche).map((p) => ({ ...p, eleve })));
  if (debut.length || leurs.length) return [...debut, ...leurs];
  const rituels = titresDesRituels(c.prevu ?? "");
  if (rituels.length) return [{ texte: rituels.join(" · "), matiere: "Rituel", rituel: true }];
  const matiere = (c.matiere ?? "").trim();
  return [{ texte: matiere || "Créneau", matiere: "", ...(matiere ? { domaine: matiere } : {}) }];
}

/** La feuille, en millimètres : celle qui suit le cahier journal, en portrait, dans ses marges de 11 mm. */
export const FEUILLE_BANDES_MM = { largeur: 186, hauteur: 262 };

/** La largeur d'une bande, toujours la même — celle de la colonne des tablettes — tant que les bandes tiennent toutes ; sinon elles se partagent la page. */
export const LARGEUR_BANDE_MM = 44;
export const ECART_BANDES_MM = 3;
export function largeurDesBandes(combien: number): number {
  const partagee = (FEUILLE_BANDES_MM.largeur - ECART_BANDES_MM * Math.max(0, combien - 1)) / Math.max(1, combien);
  return Math.round(Math.min(LARGEUR_BANDE_MM, partagee) * 10) / 10;
}

/**
 * Les bandes, après le style des cadres des tablettes (`STYLE_DU_DEROULEMENT`) : rien ici ne touche à la page, qui est
 * celle du cahier journal ; la feuille des bandes en commence une.
 */
export const STYLE_BANDES = `
  .feuille-bandes { width: ${FEUILLE_BANDES_MM.largeur}mm; height: ${FEUILLE_BANDES_MM.hauteur}mm; display: flex; flex-direction: column;
    overflow: hidden; break-inside: avoid; page-break-inside: avoid; break-before: page; page-break-before: always; }
  .bandes-tete { flex: none; display: flex; align-items: baseline; gap: 12px; padding: 0 1mm 2mm; }
  .bandes-tete h1 { font-size: 18px; margin: 0; color: #23527c; }
  .bandes-tete span { color: #687087; font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 600; }
  /* Les bandes ensemble, au milieu de la page, chacune de la même largeur. */
  .bandes { flex: 1; min-height: 0; display: flex; justify-content: center; gap: ${ECART_BANDES_MM}mm; }
  .bande { flex: none; min-width: 0; display: flex; flex-direction: column; background: #f2f2f7; border-radius: 3mm; overflow: hidden; }
  .bande-tete { flex: none; padding: 2mm 2.2mm 1.6mm; text-align: center; }
  .bande-heure { display: block; font-weight: 800; font-size: 12px; color: #23527c; font-variant-numeric: tabular-nums; }
  .bande-matiere { display: block; font-size: 10px; color: #5a6072; overflow-wrap: anywhere; }
  .bande-corps { flex: 1; min-height: 0; overflow: hidden; padding: 1mm 2mm 2.5mm; }
  /* Les cartes de la colonne des tablettes : le picto au-dessus, la matière, puis le titre ; toutes de la même taille. */
  .bande .dr-etape { flex-direction: column; justify-content: center; gap: 1.2mm; width: 100%; max-width: none; height: 32mm; padding: 2mm 1.6mm;
    border: .6mm solid #3a3a3a; border-radius: 3mm; text-align: center; overflow: hidden; }
  .bande .dr-etape img, .bande .dr-vide { width: 14mm; height: 14mm; }
  .bande .dr-mots { align-items: center; gap: .4mm; min-width: 0; max-width: 100%; hyphens: auto; -webkit-hyphens: auto; overflow-wrap: anywhere; }
  .bande .dr-matiere { font-size: 7.5px; letter-spacing: .04em; }
  .bande .at-texte { font-size: 11px; line-height: 1.15; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .bande .dr-fleche { width: 3.6mm; height: 5.6mm; margin: .6mm auto; }
  .bandes-vide { padding: 20px; color: #687087; }
  .bandes-fin { flex: none; display: flex; justify-content: space-between; align-items: flex-end; gap: 8px; }
  .bandes-attribution { font-size: 8.5px; color: #8a8f9c; padding-top: 1.5mm; }
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

/**
 * Le corps de la page : le jour en titre, les bandes côte à côte — de la
 * même largeur, regroupées —, et ce qui finit la feuille (la mention des
 * pictos). La feuille commence une page : celle qui suit le cahier journal.
 */
export function corpsDesBandes(titre: string, bandes: Bande[], fin = ""): string {
  const largeur = largeurDesBandes(bandes.length);
  const colonnes = bandes.length
    ? bandes.map((b) => `<div class="bande" style="width:${largeur}mm"><div class="bande-tete"><span class="bande-heure">${escapeHtml(b.heures)}</span>`
      + (b.matiere.trim() ? `<span class="bande-matiere">${escapeHtml(b.matiere.trim())}</span>` : "")
      + `</div><div class="bande-corps"><div class="bande-contenu"><div class="dr">${b.cadres}</div></div></div></div>`).join("")
    : `<div class="bandes-vide">Aucun créneau à imprimer ce jour-là.</div>`;
  return `<div class="bandes-alerte" hidden>La journée est trop longue pour la page, même réduite : le bas d'une bande est coupé. `
    + `Cochez « ne pas imprimer » sur un créneau, ou raccourcissez une séance.</div>`
    + `<div class="feuille-bandes" lang="fr"><div class="bandes-tete"><h1>${escapeHtml(titre)}</h1><span>La journée</span></div>`
    + `<div class="bandes">${colonnes}</div><div class="bandes-fin">${fin}</div></div>`
    + `<script>${CORPS_BANDES}</script>`;
}

/** Les bandes du jour : le déroulement de chaque créneau qui en a une, dessiné comme pour les tablettes, avec les pictos que l'enseignant a choisis. */
export async function bandesDuJour(
  creneaux: Creneau[], seances: Seance[], sequences: Sequence[], materiel: MaterielItem[], jeux: Jeu[] = [],
): Promise<{ bandes: Bande[]; refs: RefPicto[] }> {
  const pictos = await pictosDuDeroulement();
  const fiches = materiel.filter(estUneFicheDEleve);
  const bandes: Bande[] = [];
  const montres: RefPicto[] = [];
  for (const c of creneauxEnBandes(creneaux)) {
    const seance = c.seanceId ? seances.find((s) => s.id === c.seanceId) : undefined;
    const domaine = seance ? domaineDeLaSeance(seance, sequences.find((q) => q.id === seance.sequenceId)) : "";
    const { html, refs } = await cadresDuDeroulement(pasDeLaBande(c, seance, fiches, domaine, sequences, seances, jeux), pictos);
    bandes.push({ heures: heuresDeLaBande(c), matiere: c.matiere ?? "", cadres: html });
    montres.push(...refs);
  }
  return { bandes, refs: [...new Set(montres)] };
}

/** Les styles des bandes pour le cahier journal : les cartes des tablettes, sans ce qui ne vaut que pour leur page. */
export const STYLE_BANDES_DU_JOURNAL = STYLE_DU_DEROULEMENT.replace(/\.page > \.titre \{[^}]*\}/, "") + STYLE_BANDES;
