// Une séquence pour construire des collections de cardinal donné, avec ses feuilles.
//
// Comme pour le calcul mental et la catégorisation : l'atelier fabrique le
// matériel, la séquence l'installe dans la durée. La démarche
// « collections-maternelle » (voir demarches.ts) en donne les séances ;
// chacune reçoit les feuilles qui la servent — des fiches de places en
// rangée pour découvrir, en constellation quand la réserve s'éloigne, en
// vrac et en deux groupes pour un seul trajet ; les cartes-nombres de
// « Donne-moi… » ; les bons de commande et la bande numérique pour écrire le
// nombre, à partir de 4 ans ; le bon panier en grande section ; la grille
// pour observer — et la note du matériel à préparer.

import { api, anneeScolaireActuelle, couleurPourMatiere, newId, nowIso, type Referentiel, type Sequence } from "./api";
import type { CompetenceSelectionnee } from "./components/CompetenceTree";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { NIVEAUX, type Niveau } from "./categoriser";
import {
  JUSQUA, REPERES, STYLE_COLLECTIONS, cequiManque, htmlCollections, nomDeLaForme, situationDe,
  type Forme, type Images, type ReglagesCollections,
} from "./collections";
import { demarcheDe, seancesDuCadre } from "./demarches";
import { graineAuHasard, hasard } from "./hasard";
import { poserDansUneSeance } from "./impressionAtelier";
import { competenceDuProgramme as competenceDuReferentiel } from "./sequenceCategoriser";
import { chargerVacances, periodeDuJour } from "./vacances";

export const DEMARCHE_COLLECTIONS = "collections-maternelle";

/** Une feuille de la séquence : la séance qui la reçoit, son matériel, ce qui change pour elle, les âges qu'elle sert. */
export interface FeuilleDeSequence {
  seance: number;
  forme: Forme;
  reglages?: Partial<ReglagesCollections>;
  niveaux?: Niveau[];
  /** Ce qui la distingue dans la séance : « en rangée ». */
  precision?: string;
}

export const FEUILLES_DE_LA_SEQUENCE: FeuilleDeSequence[] = [
  { seance: 0, forme: "fiches", reglages: { dispositions: ["rangee"] }, precision: "en rangée" },
  { seance: 1, forme: "fiches", reglages: { dispositions: ["constellation"] }, precision: "en constellation" },
  { seance: 2, forme: "fiches", reglages: { dispositions: ["vrac", "groupes"] }, precision: "en vrac et en deux groupes" },
  { seance: 3, forme: "cartes" },
  { seance: 4, forme: "bons", niveaux: ["MS", "GS"] },
  { seance: 4, forme: "bande", niveaux: ["MS", "GS"] },
  // Vers l'abstraction : des ronds plutôt que des lits, des jetons plutôt que des oursons.
  { seance: 5, forme: "fiches", niveaux: ["PS", "MS"], reglages: { places: "ronds", dispositions: ["vrac"] }, precision: "des ronds, pour des jetons" },
  { seance: 5, forme: "panier", niveaux: ["GS"] },
  { seance: 6, forme: "evaluation" },
];

/** Les réglages d'une feuille de la séquence : ceux de l'atelier, et ce que la séance change. */
export const reglagesDeLaFeuille = (r: ReglagesCollections, f: FeuilleDeSequence): ReglagesCollections =>
  ({ ...r, ...f.reglages, forme: f.forme });

/** Le titre de la feuille dans sa séance : « Les fiches de places — en rangée ». */
export const titreDeLaFeuille = (f: FeuilleDeSequence) => `${nomDeLaForme(f.forme)}${f.precision ? ` — ${f.precision}` : ""}`;

/** Les feuilles qui se feront vraiment, à cet âge et avec ces quantités. */
export const feuillesPour = (r: ReglagesCollections): FeuilleDeSequence[] =>
  FEUILLES_DE_LA_SEQUENCE.filter((f) => (!f.niveaux || f.niveaux.includes(r.niveau)) && cequiManque(reglagesDeLaFeuille(r, f)) === null);

/** Ce qu'il faut préparer, séance par séance : la note « matériel » de chacune. */
export function materielDesSeances(r: ReglagesCollections): string[] {
  const s = situationDe(r.situation);
  const ecrit = r.niveau !== "PS";
  return [
    `Une boîte par élève, une fiche de places au fond ; la réserve ${s.partitif}, en nombre ; ${r.niveau === "PS" ? "le coin repas, des poupées et leurs assiettes pour commencer." : "les fiches en rangée, découpées."}`,
    `La réserve loin des boîtes, hors de vue ; un panier par élève ; une bande devant chaque boîte où poser ce qu'on rapporte avant de vérifier ; les fiches en constellation.`,
    "Les fiches en vrac et en deux groupes, à distribuer selon ce que chacun sait déjà ; de quoi photographier ; l'affichage des fiches réussies.",
    "Les cartes-nombres découpées — et collées sur des boîtes pour « Mets autant de jetons… » ; des objets variés : voitures, cubes, jetons.",
    ecrit
      ? "La mascotte de la classe ; les bons de commande et des feutres noirs ; la bande numérique de chacun et une pince à linge ; la bande collective au mur."
      : "La mascotte de la classe ; les fiches de places ; la réserve, auprès de la mascotte.",
    r.niveau === "GS"
      ? "Les messages et les paniers du bon panier, posés loin des tables ; des feutres des couleurs des messages."
      : "Des jetons ou des cubes à la place des figurines ; les fiches à ronds ; un autre contexte : mettre la table, distribuer les pinceaux.",
    "La grille d'observation ; pour chaque élève observé, une boîte, une fiche et la réserve éloignée.",
  ];
}

/** Le titre proposé : « Construire des collections : le dortoir des oursons (MS) ». */
export const titreDeLaSequence = (r: ReglagesCollections) =>
  `Construire des collections : ${situationDe(r.situation).nom.charAt(0).toLowerCase()}${situationDe(r.situation).nom.slice(1)} (${r.niveau})`;

/** Ce que la séquence vise : la compétence du programme, la situation, ce qu'on attend à cet âge. */
export function objectifsDeLaSequence(r: ReglagesCollections): string {
  const s = situationDe(r.situation);
  const age = NIVEAUX.find((n) => n.id === r.niveau)?.age ?? "";
  return `Constituer une collection d'un cardinal donné, jusqu'à ${JUSQUA[r.niveau]} : aller chercher en un seul trajet juste ce qu'il faut ${s.partitif}, `
    + `puis le commander. ${r.niveau}, ${age} : ${REPERES[r.niveau]}`;
}

/** « Constituer une collection d'un cardinal donné », à cet âge, dans les référentiels actifs — le programme 2025 d'abord. */
export const competenceDuProgramme = (referentiels: Referentiel[], niveau: Niveau) =>
  competenceDuReferentiel(referentiels, niveau, /cardinal donn/i);

/**
 * Crée la séquence : la fiche, les séances de la démarche avec leur
 * matériel, puis les feuilles dans leurs séances. Les images sont celles de
 * la situation, déjà chargées. Rend la séquence créée, et combien de
 * feuilles y sont.
 */
export async function creerLaSequenceDeCollections(
  r: ReglagesCollections, titre: string, competences: CompetenceSelectionnee[], images: Images,
): Promise<{ sequence: Sequence; feuilles: number }> {
  const demarche = demarcheDe(DEMARCHE_COLLECTIONS);
  if (!demarche) throw new Error("La démarche des collections est introuvable.");
  const vise = competences[0];
  const matiere = vise?.domaineTitre || "Acquérir les premiers outils mathématiques";
  const aujourdHui = nowIso().slice(0, 10);
  const vacances = await chargerVacances(aujourdHui).catch(() => []);
  const periode = periodeDuJour(aujourdHui, Array.isArray(vacances) ? vacances : []);
  const sequence: Sequence = {
    id: newId(), titre: titre.trim() || titreDeLaSequence(r), matiere, cycle: "Cycle 1",
    objectifs: objectifsDeLaSequence(r), competences: JSON.stringify(competences), competenceVisee: vise ? JSON.stringify(vise) : "",
    imageNom: null, couleur: couleurPourMatiere(matiere), dateCreation: nowIso(), periode, annee: anneeScolaireActuelle(),
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
    const html = htmlCollections(reglagesDeLaFeuille(r, f), images, hasard(graineAuHasard()));
    await poserDansUneSeance("collections", titreDeLaFeuille(f), html, STYLE_FEUILLE + STYLE_COLLECTIONS, seance.id, sequence.id);
    posees++;
  }
  return { sequence, feuilles: posees };
}
