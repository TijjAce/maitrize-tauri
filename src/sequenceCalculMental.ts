// Une séquence de calcul mental, avec ses feuilles.
//
// L'atelier « Calcul mental » fabrique la feuille d'un fait numérique ou
// d'une procédure ; la séquence l'installe dans la durée, comme le demandent
// les guides Éduscol (démarche « calcul-mental-martiniere ») : une
// découverte en séance longue, des séances courtes au procédé La Martinière,
// un réinvestissement, un test de fluence. Chaque séance d'entraînement reçoit
// sa feuille — la première est celle qu'on vient de régler, les suivantes un
// autre tirage du même objectif. La découverte reçoit sa fiche de recherche,
// le réinvestissement une série écrite courte et des problèmes qui
// réinvestissent le calcul (voir problemesAssocies), l'évaluation finale sa
// feuille et son corrigé.

import { api, anneeScolaireActuelle, couleurPourMatiere, newId, nowIso, type Sequence } from "./api";
import type { CompetenceSelectionnee } from "./components/CompetenceTree";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { problemesAssocies, problemesDe } from "./problemesAssocies";
import { PRESENTATION_COMPLETE, STYLE_FEUILLE as STYLE_PROBLEMES, feuilleProblemes } from "./problemesBarres";
import { demarcheDe, seancesDuCadre } from "./demarches";
import { NIVEAUX, RUBRIQUES } from "./faitsNumeriques";
import { graineAuHasard } from "./hasard";
import { poserDansUneSeance } from "./impressionAtelier";
import {
  STYLE_MARTINIERE, calculsMartiniere, fluenceAttendue, htmlMartiniere, libelleTravaille, objectifsRetenus,
  type FormeEntrainement, type ReglagesMartiniere,
} from "./martiniere";
import { chargerVacances, periodeDuJour } from "./vacances";

export const DEMARCHE_CALCUL_MENTAL = "calcul-mental-martiniere";

/** Une feuille de la séquence : la séance qui la reçoit (dans l'ordre de la démarche), sa forme, combien de séries. */
export interface FeuilleDeSequence {
  seance: number;
  forme: FormeEntrainement;
  /** La feuille réglée à l'écran : son tirage est gardé. */
  celleDeLEcran?: boolean;
  /** Une seule série : la fluence du jour, en échauffement. */
  uneSerie?: boolean;
}

/** Les feuilles de la séquence, séance par séance. */
export const FEUILLES_DE_LA_SEQUENCE: FeuilleDeSequence[] = [
  { seance: 0, forme: "decouverte" },
  { seance: 0, forme: "materiel" },
  { seance: 1, forme: "oral", celleDeLEcran: true },
  { seance: 2, forme: "oral" },
  { seance: 3, forme: "oral" },
  { seance: 4, forme: "ecrit", uneSerie: true },
  { seance: 5, forme: "evaluation" },
];

/** La séance où vont les problèmes qui réinvestissent le calcul : celle du réinvestissement. */
export const SEANCE_DES_PROBLEMES = 4;
/** Combien de problèmes : de quoi remplir les dix minutes de la séance. */
const NOMBRE_DE_PROBLEMES = 4;

/** Le titre proposé : « Calcul mental — Ajouter 9 (CP) ». */
export function titreDeLaSequence(r: ReglagesMartiniere): string {
  const o = objectifsRetenus(r)[0];
  return o ? `Calcul mental — ${libelleTravaille(o, r.tables ?? [])} (${r.niveau})` : "Calcul mental";
}

/** Ce que la séquence vise, en une ou deux phrases : la rubrique, l'objectif, l'attendu de fin d'année s'il est chiffré. */
export function objectifsDeLaSequence(r: ReglagesMartiniere): string {
  const o = objectifsRetenus(r)[0];
  if (!o) return "";
  const rubrique = RUBRIQUES.find((x) => x.id === o.rubrique)?.libelle ?? "";
  const attendu = fluenceAttendue(o);
  return `${rubrique ? `${rubrique} : ` : ""}${libelleTravaille(o, r.tables ?? [])}.${attendu ? ` Attendu en fin de ${r.niveau} : ${attendu}.` : ""}`;
}

/** Les réglages d'une feuille de la séquence : ceux de l'écran, dans sa forme, sans révision. */
export function reglagesDeLaFeuille(r: ReglagesMartiniere, f: FeuilleDeSequence): ReglagesMartiniere {
  // L'évaluation a deux parties — en temps limité, puis sans limite — : deux séries au moins.
  const series = f.uneSerie ? 1 : f.forme === "evaluation" ? Math.max(2, r.series) : r.series;
  return { ...r, revision: false, objectifs: objectifsRetenus(r).slice(0, 1).map((o) => o.id), forme: f.forme, series };
}

/** Le titre d'une feuille, comme l'atelier la nomme. */
export const titreDeLaFeuille = (f: FeuilleDeSequence) => ({
  oral: "Calcul mental — La Martinière", ecrit: "Calcul mental — test de fluence",
  decouverte: "Calcul mental — découverte", materiel: "Calcul mental — matériel de manipulation",
  evaluation: "Calcul mental — évaluation finale",
}[f.forme]);

/**
 * Crée la séquence : la fiche, les séances de la démarche, puis les feuilles
 * dans leurs séances. Rend la séquence créée, et combien de feuilles y sont.
 */
export async function creerLaSequenceDeCalcul(
  r: ReglagesMartiniere, graineDeLEcran: number, titre: string, competences: CompetenceSelectionnee[],
): Promise<{ sequence: Sequence; feuilles: number }> {
  const demarche = demarcheDe(DEMARCHE_CALCUL_MENTAL);
  if (!demarche) throw new Error("La démarche du calcul mental est introuvable.");
  const vise = competences[0];
  const matiere = vise?.domaineTitre || "Mathématiques";
  const aujourdHui = nowIso().slice(0, 10);
  // La période du jour ; sans calendrier des vacances, les mois en donnent une.
  const vacances = await chargerVacances(aujourdHui).catch(() => []);
  const periode = periodeDuJour(aujourdHui, Array.isArray(vacances) ? vacances : []);
  const sequence: Sequence = {
    id: newId(), titre: titre.trim() || titreDeLaSequence(r), matiere,
    cycle: `Cycle ${NIVEAUX.find((n) => n.id === r.niveau)?.cycle ?? 3}`,
    objectifs: objectifsDeLaSequence(r), competences: JSON.stringify(competences), competenceVisee: vise ? JSON.stringify(vise) : "",
    imageNom: null, couleur: couleurPourMatiere(matiere), dateCreation: nowIso(), periode, annee: anneeScolaireActuelle(),
    ratingEngagement: 0, ratingFacilite: 0, ratingApprentissage: 0, ratingDateMaj: null, projetId: null, video: "",
    dossier: "", nbSeancesPrevu: demarche.seances.length, etat: "", dateMaj: "",
  };
  await api.sequenceSave(sequence);
  const seances = seancesDuCadre(demarche, sequence.id, 1).map((s) => ({ ...s, competences: JSON.stringify(competences) }));
  for (const s of seances) await api.seanceSave(s);
  let feuilles = 0;
  for (const f of FEUILLES_DE_LA_SEQUENCE) {
    const seance = seances[f.seance];
    if (!seance) continue;
    const reglages = reglagesDeLaFeuille(r, f);
    const html = htmlMartiniere(calculsMartiniere(reglages, f.celleDeLEcran ? graineDeLEcran : graineAuHasard()), reglages);
    await poserDansUneSeance("martiniere", titreDeLaFeuille(f), html, STYLE_FEUILLE + STYLE_MARTINIERE, seance.id, sequence.id);
    feuilles++;
  }
  // Les problèmes du réinvestissement, quand le calcul en a.
  const o = objectifsRetenus(r)[0];
  const associes = o ? problemesAssocies(o, r.tables ?? []) : null;
  const seance = seances[SEANCE_DES_PROBLEMES];
  if (associes && seance) {
    const titreProblemes = `Problèmes — ${libelleTravaille(o, r.tables ?? [])}`;
    const html = feuilleProblemes(problemesDe(associes, NOMBRE_DE_PROBLEMES, graineAuHasard()), titreProblemes, PRESENTATION_COMPLETE);
    await poserDansUneSeance(associes.atelier, titreProblemes, html, STYLE_PROBLEMES, seance.id, sequence.id);
    feuilles++;
  }
  return { sequence, feuilles };
}
