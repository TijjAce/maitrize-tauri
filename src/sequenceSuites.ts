// Une séquence pour ordonner et raconter une suite d'images, avec ses feuilles.
//
// Comme pour la catégorisation et les collections : l'atelier fabrique le
// matériel, la séquence l'installe dans la durée. La démarche
// « chronologie-maternelle » (voir demarches.ts) en donne les séances ;
// chacune reçoit les feuilles qui la servent, toutes tirées des mêmes
// images — les grandes images pour ordonner ensemble au tableau, la bande
// fléchée et ses cartes en petit groupe, la fiche en colonnes pour ordonner
// seul, la bande sans les mots pour se passer d'aide, la grille pour
// observer — et la note du matériel à préparer.

import { api, anneeScolaireActuelle, couleurPourMatiere, newId, nowIso, type Referentiel, type Sequence } from "./api";
import type { CompetenceSelectionnee } from "./components/CompetenceTree";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { NIVEAUX, type Niveau } from "./categoriser";
import { REPERES, STYLE_SUITES, cequiManque, etapesPleines, htmlSuites, motsDuTemps, nomDeLaForme, type Forme, type ReglagesSuites } from "./suitesImages";
import type { Images } from "./supportsVisuels";
import { demarcheDe, seancesDuCadre } from "./demarches";
import { graineAuHasard, hasard } from "./hasard";
import { poserDansUneSeance } from "./impressionAtelier";
import { competenceDuProgramme as competenceDuReferentiel } from "./sequenceCategoriser";
import { chargerVacances, periodeDuJour } from "./vacances";

export const DEMARCHE_SUITES = "chronologie-maternelle";

/** Une feuille de la séquence : la séance qui la reçoit, sa forme, ce qui change pour elle. */
export interface FeuilleDeSequence { seance: number; forme: Forme; reglages?: Partial<ReglagesSuites>; precision?: string }

export const FEUILLES_DE_LA_SEQUENCE: FeuilleDeSequence[] = [
  { seance: 1, forme: "affichage" },
  { seance: 2, forme: "bande" },
  { seance: 4, forme: "colonnes" },
  { seance: 5, forme: "bande", reglages: { reperes: "aucun" }, precision: "sans les mots" },
  { seance: 6, forme: "evaluation" },
];

/** Les réglages d'une feuille de la séquence : ceux de l'atelier, et ce que la séance change. */
export const reglagesDeLaFeuille = (r: ReglagesSuites, f: FeuilleDeSequence): ReglagesSuites => ({ ...r, ...f.reglages, forme: f.forme });

export const titreDeLaFeuille = (f: FeuilleDeSequence) => `${nomDeLaForme(f.forme)}${f.precision ? ` — ${f.precision}` : ""}`;

/** Les feuilles qui se feront vraiment : toutes, dès qu'il y a deux images. */
export const feuillesPour = (r: ReglagesSuites): FeuilleDeSequence[] =>
  FEUILLES_DE_LA_SEQUENCE.filter((f) => cequiManque(reglagesDeLaFeuille(r, f)) === null);

/** Ce qu'il faut préparer, séance par séance : la note « matériel » de chacune. */
export function materielDesSeances(r: ReglagesSuites): string[] {
  return [
    "Selon la suite : l'activité à vivre — recette, plantation, fabrication — et de quoi la photographier ; ou l'album, ses personnages, des marottes ; ou le matériel du geste.",
    "Les grandes images, à afficher en désordre ; les mots du temps en étiquettes ; de la pâte adhésive ou des aimants.",
    "Une bande fléchée et ses cartes découpées par groupe de deux ou trois ; l'affiche de la dernière fois.",
    r.niveau === "GS" ? "L'affiche ordonnée et ses mots du temps ; une grande feuille pour la dictée à l'adulte." : "L'affiche ordonnée et ses mots du temps.",
    "Une fiche par élève, des ciseaux, de la colle ; l'affiche, visible ou retournée selon les besoins.",
    "Une bande sans les mots par élève, ses cartes découpées ; l'affiche cachée. Une autre suite du même genre, pour transférer.",
    "La grille d'observation ; pour chaque élève observé, les cartes de la suite, mêlées.",
  ];
}

const minuscule = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

/** Le titre proposé : « Ordonner et raconter : le bonhomme de neige (MS) ». */
export const titreDeLaSequence = (r: ReglagesSuites) =>
  `Ordonner et raconter : ${r.titre.trim() ? minuscule(r.titre.trim()) : "une suite d'images"} (${r.niveau})`;

/** Ce que la séquence vise : la notion de chronologie, la suite, les mots du temps de l'âge. */
export function objectifsDeLaSequence(r: ReglagesSuites): string {
  const age = NIVEAUX.find((n) => n.id === r.niveau)?.age ?? "";
  const mots = [...new Set(motsDuTemps(r.niveau, Math.max(3, etapesPleines(r).length)))].join(", ");
  const suite = r.titre.trim() ? `« ${r.titre.trim()} »` : "la suite d'images";
  return `S'approprier la notion de chronologie : remettre dans l'ordre ${suite} et la raconter avec les mots du temps — ${mots}. ${r.niveau}, ${age} : ${REPERES[r.niveau]}`;
}

/**
 * La compétence de chronologie du programme, à cet âge, dans les
 * référentiels actifs — 2025 d'abord : le déroulement d'une histoire simple
 * avant 4 ans, sa chronologie à partir de 4 ans, les étapes d'un processus
 * à partir de 5 ans.
 */
export const competenceDuProgramme = (referentiels: Referentiel[], niveau: Niveau) =>
  competenceDuReferentiel(referentiels, niveau, /restituer la chronologie|déroulement d.évènements quotidiens|étapes d.un processus/i);

/**
 * Crée la séquence : la fiche, les séances de la démarche avec leur
 * matériel, puis les feuilles dans leurs séances. Les images sont celles de
 * la suite, déjà chargées. Rend la séquence créée, et combien de feuilles y
 * sont.
 */
export async function creerLaSequenceDeSuites(
  r: ReglagesSuites, titre: string, competences: CompetenceSelectionnee[], images: Images,
): Promise<{ sequence: Sequence; feuilles: number }> {
  const demarche = demarcheDe(DEMARCHE_SUITES);
  if (!demarche) throw new Error("La démarche de chronologie est introuvable.");
  const vise = competences[0];
  const matiere = vise?.domaineTitre || "Se repérer dans le temps et l'espace";
  const aujourdHui = nowIso().slice(0, 10);
  const vacances = await chargerVacances(aujourdHui).catch(() => []);
  const periode = periodeDuJour(aujourdHui, Array.isArray(vacances) ? vacances : []);
  const sequence: Sequence = {
    id: newId(), titre: titre.trim() || titreDeLaSequence(r), matiere, cycle: "Cycle 1",
    objectifs: objectifsDeLaSequence(r), competences: JSON.stringify(competences), competenceVisee: vise ? JSON.stringify(vise) : "",
    imageNom: null, couleur: couleurPourMatiere(matiere), dateCreation: nowIso(), periode, annee: anneeScolaireActuelle(), niveau: r.niveau,
    ratingEngagement: 0, ratingFacilite: 0, ratingApprentissage: 0, ratingDateMaj: null, projetId: null, video: "",
    dossier: "", nbSeancesPrevu: demarche.seances.length, etat: "", dateMaj: "",
  };
  await api.sequenceSave(sequence);
  const materiel = materielDesSeances(r);
  const seances = seancesDuCadre(demarche, sequence.id, 1).map((s, i) => ({ ...s, competences: JSON.stringify(competences), materiel: materiel[i] ?? "" }));
  for (const s of seances) await api.seanceSave(s);
  let posees = 0;
  for (const f of feuillesPour(r)) {
    const seance = seances[f.seance];
    if (!seance) continue;
    const html = htmlSuites(reglagesDeLaFeuille(r, f), images, hasard(graineAuHasard()));
    await poserDansUneSeance("suites", titreDeLaFeuille(f), html, STYLE_FEUILLE + STYLE_SUITES, seance.id, sequence.id);
    posees++;
  }
  return { sequence, feuilles: posees };
}
