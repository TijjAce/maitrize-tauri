// ── Les séquences toutes faites de la maternelle ───────────────────────────
//
// L'enseignant l'a demandé (31 octobre 2026) : plus de séquence de
// maternelle en carte à part dans Fabriquer — chacune va dans le dossier de
// sa section, PS, MS ou GS, en tableau comme celles de l'école : les domaines
// du programme en lignes, les périodes en colonnes. Le programme de l'école
// maternelle (BO n° 41 du 31 octobre 2024, BO n° 19 du 7 mai 2026) n'a pas
// de repères par période comme ceux des cycles 2 et 3 : sa progressivité
// « est organisée selon l'âge des enfants (avant quatre ans, à partir de
// quatre ans et à partir de cinq ans) ». La période vient du manuel quand il
// la donne (voir programmation.ts) ; sinon Maitrize la suggère, d'après ce
// que le programme dit de l'ordre des apprentissages (voir
// periodesProposees.ts).
//
// Les séquences faites de pictogrammes — le Vilain Petit Canard, le problème
// du jour, les collections — ont leurs feuilles dès que leurs images sont
// chargées, comme dans la fiche d'une séquence. Chacune ouvre aussi les
// ateliers où ses feuilles se font une à une, réglés à sa section : leurs
// cartes ne sont plus dans le catalogue.

import type { Referentiel } from "./api";
import type { Niveau } from "./categoriser";
import { idsDesImages } from "./collections";
import type { CompetenceSelectionnee } from "./components/CompetenceTree";
import type { Demarche } from "./demarches";
import { DEMARCHE_VPC } from "./demarchesVilainPetitCanard";
import type { PlanDesFeuilles } from "./feuillesDesSequences";
import { DEMARCHE_DECOMPOSITION_GS, planDecompositionGs } from "./manuelDecompositionGs";
import { DEMARCHE_FORMES_GRANDEURS_GS, planFormesGrandeursGs } from "./manuelFormesGrandeursGs";
import { competenceDuProgramme as competenceDuReferentiel } from "./sequenceCategoriser";
import { DEMARCHE_COLLECTIONS, competenceDuProgramme as competenceDesCollections, planDesCollections, reglagesDeLaSection } from "./sequenceCollections";
import {
  ATELIER_PROBLEME_DU_JOUR, DEMARCHE_PROBLEME, competenceDuProgramme as competenceDuProblemeDuJour, idsDeLaPeriode, planDuProblemeDuJour,
  reglagesPourLaCompetence,
} from "./sequenceProblemeDuJour";
import { DEMARCHE_SUITES, competenceDuProgramme as competenceDesSuites } from "./sequenceSuites";
import { niveauDeLaDemarche, planDuVilainPetitCanard } from "./sequenceVilainPetitCanard";
import type { Domaine } from "./sequencesToutesFaites";
import type { Images } from "./supportsVisuels";
import { IDS_VPC } from "./vilainPetitCanard";

/** Les sections de la maternelle : un dossier chacune. */
export type Section = Niveau;
export const SECTIONS: Section[] = ["PS", "MS", "GS"];
export const estUneSection = (c: string): c is Section => (SECTIONS as string[]).includes(c);

// ── Les domaines du programme, comme les disciplines de l'école ────────────

export type DisciplineDeMaternelle = "Le langage oral et écrit" | "Les premiers outils mathématiques" | "Se repérer dans le temps et l'espace";

/** Les domaines du programme qui ont des séquences ; la matière de l'emploi du temps que prend la séquence créée, comme dans ses ateliers. */
export const DISCIPLINES_DE_MATERNELLE: { nom: DisciplineDeMaternelle; icone: string; court: string; matiere: string }[] = [
  { nom: "Le langage oral et écrit", icone: "🗣️", court: "Langage", matiere: "Mobiliser le langage dans toutes ses dimensions" },
  { nom: "Les premiers outils mathématiques", icone: "🔢", court: "Maths", matiere: "Acquérir les premiers outils mathématiques" },
  { nom: "Se repérer dans le temps et l'espace", icone: "⏳", court: "Temps et espace", matiere: "Se repérer dans le temps et l'espace" },
];

/** Leurs parties, dans l'ordre du programme : les lignes du tableau. */
export const DOMAINES_DE_MATERNELLE: Domaine[] = [
  { id: "langage-oral", discipline: "Le langage oral et écrit", nom: "Acquérir le langage oral" },
  { id: "apprendre-a-lire", discipline: "Le langage oral et écrit", nom: "Se préparer à apprendre à lire" },
  { id: "decouvrir-nombres", discipline: "Les premiers outils mathématiques", nom: "Découvrir les nombres" },
  { id: "problemes-maternelle", discipline: "Les premiers outils mathématiques", nom: "Utiliser les nombres pour résoudre des problèmes" },
  { id: "solides-formes", discipline: "Les premiers outils mathématiques", nom: "Explorer les solides et les formes planes" },
  { id: "reperer-temps", discipline: "Se repérer dans le temps et l'espace", nom: "Se repérer dans le temps" },
];

// ── Les séquences, leur ligne et leurs sections ────────────────────────────

/** Un atelier où se font les feuilles de la séquence ; `reglages` : ce qu'on lui donne pour qu'il s'ouvre à la section. */
export interface AtelierDesFeuilles { id: string; reglages?: (section: Section, competence: string) => Record<string, unknown> }

interface Rangee { domaine: string; sections: Section[]; ateliers: AtelierDesFeuilles[] }

const aLaSection = (section: Section) => ({ niveau: section });

/**
 * Les séquences de la maternelle : leur ligne, leurs sections, leurs
 * ateliers. Ses autres démarches — apprendre en jouant, catégoriser les
 * mots — sont des méthodologies (voir bibliothequeDemarches.ts).
 */
const RANGEES: Record<string, Rangee> = {
  [DEMARCHE_VPC.MS]: { domaine: "langage-oral", sections: ["MS"], ateliers: [{ id: "vilainPetitCanard", reglages: aLaSection }] },
  [DEMARCHE_VPC.GS]: { domaine: "langage-oral", sections: ["GS"], ateliers: [{ id: "vilainPetitCanard", reglages: aLaSection }] },
  // Scander les syllabes « à partir de 4 ans », les rimes et les phonèmes « à partir de 5 ans » : la séquence va de l'un à
  // l'autre. Ses séances nomment le loto et le domino des syllabes.
  phonologie: { domaine: "apprendre-a-lire", sections: ["MS", "GS"], ateliers: [{ id: "lotoSyllabes" }, { id: "dominos" }] },
  [DEMARCHE_COLLECTIONS]: { domaine: "decouvrir-nombres", sections: SECTIONS, ateliers: [{ id: "collections", reglages: (s) => ({ ...reglagesDeLaSection(s) }) }] },
  [DEMARCHE_DECOMPOSITION_GS.id]: { domaine: "decouvrir-nombres", sections: ["GS"], ateliers: [{ id: "albumCalcul" }] },
  [DEMARCHE_PROBLEME]: {
    domaine: "problemes-maternelle", sections: SECTIONS,
    ateliers: [{ id: ATELIER_PROBLEME_DU_JOUR, reglages: (s, competence) => ({ ...reglagesPourLaCompetence(competence, s) }) }],
  },
  [DEMARCHE_FORMES_GRANDEURS_GS.id]: { domaine: "solides-formes", sections: ["GS"], ateliers: [{ id: "tangram" }] },
  // Ses feuilles se font avec les images de la suite que l'enseignant choisit : dans l'atelier seulement.
  [DEMARCHE_SUITES]: { domaine: "reperer-temps", sections: SECTIONS, ateliers: [{ id: "suites", reglages: aLaSection }] },
};

/** Les sections d'une démarche de maternelle ; aucune pour une autre. */
export const sectionsDeLaDemarche = (id: string): Section[] => RANGEES[id]?.sections ?? [];

/** Sa ligne dans le tableau ; rien pour une démarche qui n'est pas une séquence de maternelle. */
export const domaineDeMaternelle = (id: string): Domaine | null => DOMAINES_DE_MATERNELLE.find((x) => x.id === RANGEES[id]?.domaine) ?? null;

/** Les ateliers où se font ses feuilles. */
export const ateliersDesFeuilles = (id: string): AtelierDesFeuilles[] => RANGEES[id]?.ateliers ?? [];

/** La matière de l'emploi du temps de la séquence créée, faute de compétence. */
export const matiereDeMaternelle = (id: string): string | null =>
  DISCIPLINES_DE_MATERNELLE.find((x) => x.nom === domaineDeMaternelle(id)?.discipline)?.matiere ?? null;

// ── Les feuilles ───────────────────────────────────────────────────────────

/** Le matériel des séquences du manuel de grande section : leurs feuilles se font dans les ateliers que leurs séances nomment. */
const DU_MANUEL: Record<string, () => PlanDesFeuilles> = {
  [DEMARCHE_FORMES_GRANDEURS_GS.id]: planFormesGrandeursGs, [DEMARCHE_DECOMPOSITION_GS.id]: planDecompositionGs,
};

/** Les feuilles d'une séquence faite de pictogrammes : les images à charger, et le plan qu'elles permettent ; rien pour une autre. */
export function feuillesEnPictos(demarcheId: string, section: Section, competence = ""): { ids: (number | string)[]; plan: (images: Images) => PlanDesFeuilles } | null {
  const canard = niveauDeLaDemarche(demarcheId);
  if (canard) return { ids: IDS_VPC, plan: (images) => planDuVilainPetitCanard(canard, images) };
  if (demarcheId === DEMARCHE_PROBLEME) {
    // La sorte de problème que la compétence appelle, à cet âge — l'ajout, sans compétence —, comme dans la fiche d'une séquence.
    const r = reglagesPourLaCompetence(competence, section);
    return { ids: idsDeLaPeriode(r), plan: (images) => planDuProblemeDuJour(r, images) };
  }
  if (demarcheId === DEMARCHE_COLLECTIONS) {
    const r = reglagesDeLaSection(section);
    return { ids: idsDesImages(r), plan: (images) => planDesCollections(r, images) };
  }
  return null;
}

/** Les feuilles et le matériel d'une séquence de maternelle : en pictogrammes une fois les images chargées, le matériel du manuel, sinon rien. */
export function planDeMaternelle(demarcheId: string, section: Section, competence: string, images?: Images): PlanDesFeuilles {
  const enPictos = feuillesEnPictos(demarcheId, section, competence);
  if (enPictos) return images ? enPictos.plan(images) : { feuilles: [], materiel: [] };
  return DU_MANUEL[demarcheId]?.() ?? { feuilles: [], materiel: [] };
}

// ── La compétence visée ────────────────────────────────────────────────────

/**
 * La compétence que vise une séquence de maternelle, à sa section : celle
 * que sa démarche ou son atelier nomme. Rien sinon : on la cherche alors
 * comme pour l'école (voir sequencesToutesFaites.ts).
 */
export function competenceDeMaternelle(referentiels: Referentiel[], d: Demarche, section: Section): CompetenceSelectionnee | null {
  if (d.visee && (!d.visee.niveaux || d.visee.niveaux.includes(section))) return competenceDuReferentiel(referentiels, section, d.visee.intitule);
  if (d.id === DEMARCHE_PROBLEME) return competenceDuProblemeDuJour(referentiels, reglagesPourLaCompetence("", section));
  if (d.id === DEMARCHE_COLLECTIONS) return competenceDesCollections(referentiels, section);
  if (d.id === DEMARCHE_SUITES) return competenceDesSuites(referentiels, section);
  return null;
}
