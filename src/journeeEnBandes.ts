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
//
// « Oulah ça fait tout écrasé là » (l'enseignant, 4 novembre 2026, sur une
// journée de dix créneaux) : dix bandes côte à côte n'avaient plus que 16 mm
// chacune, et les mots se coupaient lettre à lettre. Les bandes ne descendent
// plus sous 30 mm : au-delà de cinq, elles passent sur deux rangs — ou plus —,
// toujours de la même largeur et regroupées au milieu, et les cartes se
// réduisent ensemble pour tenir. Et « réunion formation c'est pas un élève,
// donc pas besoin de leur faire une bande » : un créneau de réunion ou de
// formation n'en a plus.
//
// « Essaye de garder les pictos carrés » (5 novembre 2026) : une carte
// prenait toute la largeur de sa bande, et la page, en la réduisant, n'en
// raccourcissait que la hauteur — 40 mm sur 24. Les cartes sont carrées ; la
// bande a leur largeur, et non plus une largeur à elle : réduites, elles
// restent carrées, et leurs bandes, toujours de la même largeur entre elles,
// se resserrent avec elles.

import type { Creneau, Jeu, MaterielItem, Seance, Sequence } from "./api";
import {
  aFaireDuCreneau, cadresDuDeroulement, carteSeule, domaineDeLaSeance, elevesDuCreneau, estUneFicheDEleve, pasDeLEleve, pasDuDeroulement,
  pictosDuDeroulement, STYLE_DU_DEROULEMENT, type ManuelDuDeroulement, type PasDuDeroulement,
} from "./journalTelephone";
import type { RefPicto } from "./pictosAppoint";
import { escapeHtml } from "./print";
import type { PhotoDeJeu } from "./supportsDeTravail";
import { elevesDesParties } from "./prevuParEleve";

/** Les temps sans enseignement : la récréation, le repas, la sieste… */
export const estUnePause = (matiere: string): boolean => /r[ée]cr[ée]|pause|accueil|repas|cantine|sieste/i.test(matiere ?? "");

/**
 * Les créneaux qui ont leur bande, dans l'ordre des heures : tous ceux qu'on
 * imprime, sauf une pause où rien n'est écrit — ni séance, ni prévu, ni
 * bilan — et sauf les réunions et les formations, qui ne sont pas des temps
 * d'élèves. Ceux qu'on a cochés « ne pas imprimer » sont déjà partis.
 */
export function creneauxEnBandes(creneaux: Creneau[]): Creneau[] {
  return [...creneaux]
    .filter((c) => c.nature !== "reunion")
    .filter((c) => !(estUnePause(c.matiere) && !c.seanceId && !c.prevu?.trim() && !c.bilan?.trim()))
    .sort((a, b) => a.heureDebut.localeCompare(b.heureDebut));
}

/** « 8h30 – 9h15 » : la bande est étroite, l'heure n'y prend pas de zéro. */
const heure = (h: string) => h.replace(/^0(\d)/, "$1").replace(":", "h");
export const heuresDeLaBande = (c: Pick<Creneau, "heureDebut" | "heureFin">): string => `${heure(c.heureDebut)} – ${heure(c.heureFin)}`;

/**
 * Le déroulement d'un créneau sur sa bande : celui des tablettes — le rituel
 * d'abord, puis ses séances, posée ou citées au prévu, ses jeux et les pages
 * de mes manuels, une carte chacun —, puis les fiches et les séances de chacun de ses élèves, son
 * prénom avec la matière (une tablette ne montre que les siennes ; la page,
 * toutes). Sans séance, ni jeu, ni fiche, une seule carte : ses rituels s'il
 * en cite, sinon sa matière.
 */
export function pasDeLaBande(
  c: Pick<Creneau, "prevu" | "matiere">, seance: Seance | undefined, fiches: MaterielItem[], domaineDeSeance = "",
  sequences: Sequence[] = [], seances: Seance[] = [], jeux: Jeu[] = [], photos: PhotoDeJeu[] = [], manuels: readonly ManuelDuDeroulement[] = [],
): PasDuDeroulement[] {
  const eleves = elevesDuCreneau(aFaireDuCreneau(c, fiches, sequences, seances));
  const deroulementDe = (eleve?: string) => pasDuDeroulement(c, seance, fiches, domaineDeSeance, eleve, sequences, seances, jeux, photos, manuels);
  // Le début, commun à tous : celui de la classe ; sans séance, le rituel par lequel commence celui de chaque élève.
  const debut = (eleves.length ? deroulementDe(eleves[0]) : deroulementDe()).filter((p) => !p.fiche);
  const leurs = eleves.flatMap((eleve) => deroulementDe(eleve).filter((p) => p.fiche).map((p) => ({ ...p, eleve })));
  if (debut.length || leurs.length) return [...debut, ...leurs];
  return carteSeule(c);
}


/** La feuille, en millimètres : celle qui suit le cahier journal, en portrait, dans ses marges de 11 mm. */
export const FEUILLE_BANDES_MM = { largeur: 186, hauteur: 262 };

/**
 * Le côté d'une carte, avant que la page ne la réduise : les cartes sont carrées, comme des pictos, et toutes de la
 * même taille.
 */
export const CARTE_MM = 32;
/** Ce que la bande laisse de chaque côté de ses cartes : elle a leur largeur, et pas plus. */
export const MARGE_BANDE_MM = 1.3;
export const ECART_BANDES_MM = 3;
/** Une bande ne descend pas sous 30 mm, où son heure tient sur une ligne et ses mots ne se coupent pas. */
export const LARGEUR_MIN_BANDE_MM = 30;
/** Les bandes d'un rang, au plus : cinq — à leur plus large, cartes entières, elles font juste la page. */
export const BANDES_PAR_RANG_MAX = Math.floor((FEUILLE_BANDES_MM.largeur + ECART_BANDES_MM) / (LARGEUR_MIN_BANDE_MM + ECART_BANDES_MM));
/** La largeur d'une bande quand rien n'est réduit : ses cartes et ses marges. */
export const LARGEUR_MAX_BANDE_MM = CARTE_MM + 2 * MARGE_BANDE_MM;

/** Combien de bandes dans chaque rang : un seul rang tant qu'elles tiennent, sinon des rangs égaux, à une près — dix font deux rangs de cinq. */
export function rangsDesBandes(combien: number): number[] {
  if (combien <= 0) return [];
  const rangs = Math.ceil(combien / BANDES_PAR_RANG_MAX);
  const base = Math.floor(combien / rangs), enPlus = combien % rangs;
  return Array.from({ length: rangs }, (_, i) => base + (i < enPlus ? 1 : 0));
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
  /* Les bandes ensemble, au milieu de la page ; sur plusieurs rangs quand elles ne tiennent pas sur un. */
  .bandes { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: ${ECART_BANDES_MM}mm; }
  .bandes-rang { flex: 1; min-height: 0; display: flex; justify-content: center; gap: ${ECART_BANDES_MM}mm; }
  /* Une bande a la largeur de ses cartes, réduites ou non, sans descendre sous le minimum : toutes la même, puisque les cartes ont la même. */
  .bande { flex: none; min-width: ${LARGEUR_MIN_BANDE_MM}mm; display: flex; flex-direction: column; background: #f2f2f7; border-radius: 3mm; overflow: hidden; }
  /* Son en-tête la suit sans l'élargir : un long nom passe à la ligne. */
  .bande-tete { flex: none; box-sizing: border-box; width: 0; min-width: 100%; padding: 2mm 1.5mm 1.6mm; text-align: center; }
  .bande-heure { display: block; font-weight: 800; font-size: 12px; color: #23527c; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .bande-matiere { display: block; font-size: 10px; color: #5a6072; overflow-wrap: anywhere; }
  .bande-corps { flex: 1; min-height: 0; overflow: hidden; padding: 1mm ${MARGE_BANDE_MM}mm 2.5mm; }
  /* Les cartes de la colonne des tablettes, carrées comme des pictos : le picto au-dessus, la matière, puis le titre ; toutes de la même taille. */
  .bande .dr-etape { flex: none; flex-direction: column; justify-content: center; gap: 1.2mm; width: ${CARTE_MM}mm; max-width: none; height: ${CARTE_MM}mm;
    padding: 1.6mm 1.2mm; border: .6mm solid #3a3a3a; border-radius: 3mm; text-align: center; overflow: hidden; }
  .bande .dr-etape img, .bande .dr-vide { width: 14mm; height: 14mm; }
  /* Un mot passe entier à la ligne, sans tiret : « mé-téo » se lit mal ; seul un mot plus long que la carte se coupe. */
  .bande .dr-mots { align-items: center; gap: .4mm; min-width: 0; max-width: 100%; hyphens: manual; -webkit-hyphens: manual; overflow-wrap: anywhere; }
  .bande .dr-matiere { font-size: 7.5px; letter-spacing: .04em; line-height: 1.15;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
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
  const colonne = (b: Bande) => `<div class="bande"><div class="bande-tete"><span class="bande-heure">${escapeHtml(b.heures)}</span>`
    + (b.matiere.trim() ? `<span class="bande-matiere">${escapeHtml(b.matiere.trim())}</span>` : "")
    + `</div><div class="bande-corps"><div class="bande-contenu"><div class="dr">${b.cadres}</div></div></div></div>`;
  let debut = 0;
  const colonnes = bandes.length
    ? rangsDesBandes(bandes.length).map((n) => {
      const rang = bandes.slice(debut, debut + n);
      debut += n;
      return `<div class="bandes-rang">${rang.map(colonne).join("")}</div>`;
    }).join("")
    : `<div class="bandes-vide">Aucun créneau à imprimer ce jour-là.</div>`;
  return `<div class="bandes-alerte" hidden>La journée est trop longue pour la page, même réduite : le bas d'une bande est coupé. `
    + `Cochez « ne pas imprimer » sur un créneau, ou raccourcissez une séance.</div>`
    + `<div class="feuille-bandes" lang="fr"><div class="bandes-tete"><h1>${escapeHtml(titre)}</h1><span>La journée</span></div>`
    + `<div class="bandes">${colonnes}</div><div class="bandes-fin">${fin}</div></div>`
    + `<script>${CORPS_BANDES}</script>`;
}

/**
 * Les bandes du jour : le déroulement de chaque créneau qui en a une, dessiné comme pour les tablettes, avec les pictos
 * que l'enseignant a choisis.
 *
 * « Il faudrait sur le planning pouvoir distinguer les élèves pour que chaque élève ait son picto », puis : « un bouton
 * qui permet de surligner l'élève et ce qu'il doit faire, et après ça suit dans l'ordre chronologique » (demandes de
 * l'enseignant, 2026-11-02). Un créneau de groupe dont le prévu donne une partie à l'un de ses élèves (« Lina : … »,
 * voir prevuParEleve.ts) a une bande par élève du groupe, son prénom en tête : le déroulement de sa tablette
 * (`pasDeLEleve`), avec les séances et les jeux de ce qui est à tous et de ses parties, dans l'ordre où ils sont écrits.
 */
export async function bandesDuJour(
  creneaux: Creneau[], seances: Seance[], sequences: Sequence[], materiel: MaterielItem[], jeux: Jeu[] = [], photos: PhotoDeJeu[] = [],
  eleves: { id: string; prenom: string }[] = [], manuels: readonly ManuelDuDeroulement[] = [],
): Promise<{ bandes: Bande[]; refs: RefPicto[] }> {
  const pictos = await pictosDuDeroulement();
  const fiches = materiel.filter(estUneFicheDEleve);
  const bandes: Bande[] = [];
  const montres: RefPicto[] = [];
  for (const c of creneauxEnBandes(creneaux)) {
    const seance = c.seanceId ? seances.find((s) => s.id === c.seanceId) : undefined;
    const domaine = seance ? domaineDeLaSeance(seance, sequences.find((q) => q.id === seance.sequenceId)) : "";
    const parEleve = elevesDesParties(c, eleves);
    if (parEleve.length) {
      for (const prenom of parEleve) {
        const { html, refs } = await cadresDuDeroulement(pasDeLEleve(c, prenom, parEleve, seance, fiches, domaine, sequences, seances, jeux, photos, manuels), pictos);
        bandes.push({ heures: heuresDeLaBande(c), matiere: prenom, cadres: html });
        montres.push(...refs);
      }
      continue;
    }
    const { html, refs } = await cadresDuDeroulement(pasDeLaBande(c, seance, fiches, domaine, sequences, seances, jeux, photos, manuels), pictos);
    bandes.push({ heures: heuresDeLaBande(c), matiere: c.matiere ?? "", cadres: html });
    montres.push(...refs);
  }
  return { bandes, refs: [...new Set(montres)] };
}

/** Les styles des bandes pour le cahier journal : les cartes des tablettes, sans ce qui ne vaut que pour leur page. */
export const STYLE_BANDES_DU_JOURNAL = STYLE_DU_DEROULEMENT.replace(/\.page > \.titre \{[^}]*\}/, "") + STYLE_BANDES;
