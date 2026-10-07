// Les feuilles que les ateliers fabriquent pour une séquence.
//
// Une séquence part de la compétence qu'on choisit en la créant. La
// compétence appelle une démarche ; la démarche, séance par séance, va
// piocher dans les ateliers de Fabriquer les feuilles qui la servent, aux
// nombres de la classe — et la note du matériel à préparer. Les jeux qu'on a
// rattachés soi-même à la compétence, dans « Ce que cela travaille », sont
// proposés en plus, tels qu'on les a réglés.

import type { CompetenceSelectionnee } from "./components/CompetenceTree";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { REGLAGES_CUBES, STYLE_CUBES, exercicesCubes, htmlCubes, reglagesCubesSurs, type IdNiveauCubes, type ReglagesCubes } from "./cubesNumeration";
import { FEUILLES_DE_LA_SEQUENCE_CUBES, STYLE_SEQUENCE_CUBES, htmlDeLaFeuilleCubes, materielDesSeancesCubes, reglagesDeLaFeuille, type FeuilleCubes } from "./sequenceCubes";
import { REGLAGES_COMPARER, STYLE_COMPARER, htmlComparer, paquet, reglagesComparerSurs, type IdNiveau, type ReglagesComparer } from "./comparerNombres";
import { FEUILLES_DE_LA_SEQUENCE, STYLE_SEQUENCE_COMPARER, htmlDeLaFeuille as htmlDeLaFeuilleComparer, materielDesSeances as materielDesSeancesComparer } from "./sequenceComparer";
import { REGLAGES_NOMBRES, REGLAGES_OIE, STYLE_JEUX_MATHS, cartesNombres, htmlCartesNombres, htmlJeuDeLOie, type ReglagesNombres, type ReglagesOie } from "./jeuxMaths";
import { CLASSE_DES_DEMARCHES } from "./demarchesNumeration";
import { PREFIXE_COMPETENCES, lireCompetencesAtelier, memeCompetence } from "./ateliersCompetences";
import { estUneDemarcheDeCalcul, planDuCalcul } from "./feuillesDuCalcul";
import { estUneDemarcheDeProblemes, planDesProblemes } from "./problemesDesLivrets";
import { estUneDemarcheProlongee, planDesProblemesProlonges } from "./problemesProlonges";
import { estUneDemarcheDeFractions, planDesFractions } from "./fractionsDesLivrets";
import { estUneDemarcheDeFrancais, planDuFrancais } from "./feuillesDuFrancais";
import { reglagesLaisses } from "./reglagesLaisses";

export type ClasseC2 = "CP" | "CE1" | "CE2";

/** Ce que la séquence dit d'elle-même : la classe de sa compétence, et la période où elle se fait. */
export interface ContexteFeuilles {
  classe: ClasseC2;
  periode: number;
  /** L'intitulé de la compétence : il dit ce qu'une séquence de calcul mental travaille. */
  competence?: string;
  /** L'objectif de l'atelier « Calcul mental » qu'on a rattaché soi-même à la compétence, s'il y en a un. */
  objectifRattache?: string;
}

/** Une feuille qu'un atelier fabrique pour une séance. */
export interface FeuilleAFabriquer {
  /** La séance qui la reçoit, dans l'ordre de la démarche. */
  seance: number;
  /** L'atelier qui la fabrique. */
  atelier: string;
  /** Son nom, dans la séance et sur le bureau. */
  titre: string;
  fabriquer: (graine: number) => { html: string; style: string };
}

export interface PlanDesFeuilles {
  feuilles: FeuilleAFabriquer[];
  /** La note « matériel » de chaque séance, dans l'ordre ; vide quand il n'y a rien à dire. */
  materiel: string[];
}

/** La classe d'une compétence, d'après son niveau : CP, CE1 ou CE2 ; rien hors du cycle 2. */
export function classeDe(niveau: string | null | undefined): ClasseC2 | null {
  const n = (niveau ?? "").toUpperCase();
  return n === "CP" || n === "CE1" || n === "CE2" ? n : null;
}

/** Le niveau de l'atelier des cubes pour une séquence : les nombres du livret, ou ceux de la période au CP. */
export function niveauDesCubes(demarcheId: string, ctx: ContexteFeuilles): IdNiveauCubes {
  if (demarcheId === "nombres-livret-cp-59") return "cp-59";
  if (demarcheId === "nombres-livret-cp-100") return "cp-100";
  if (ctx.classe === "CE1") return "ce1";
  if (ctx.classe === "CE2") return "ce2";
  // La progression du livret CP : de 1 à 20 en période 1, jusqu'à 59 en période 2, jusqu'à 100 ensuite.
  return ctx.periode <= 1 ? "cp-19" : ctx.periode === 2 ? "cp-59" : "cp-100";
}

/** Le niveau de l'atelier « Comparer les nombres » : la classe, et au CP la période. */
export function niveauDeComparer(ctx: ContexteFeuilles): IdNiveau {
  if (ctx.classe === "CE1") return "ce1";
  if (ctx.classe === "CE2") return "ce2";
  return ctx.periode <= 1 ? "cp-30" : ctx.periode === 2 ? "cp-59" : "cp-100";
}

const cubesPour = (demarcheId: string, ctx: ContexteFeuilles): ReglagesCubes =>
  reglagesCubesSurs({ ...REGLAGES_CUBES, ...reglagesLaisses<ReglagesCubes>("cubes"), niveau: niveauDesCubes(demarcheId, ctx) });

const comparerPour = (ctx: ContexteFeuilles): ReglagesComparer =>
  reglagesComparerSurs({ ...REGLAGES_COMPARER, ...reglagesLaisses<ReglagesComparer>("comparer"), niveau: niveauDeComparer(ctx) });

/** Une feuille de cubes : son titre est celui que la feuille imprime, à la classe de la séquence. */
function feuilleDeCubes(seance: number, quoi: FeuilleCubes, r: ReglagesCubes): FeuilleAFabriquer {
  const titre = quoi === "affiche" ? "Ce qu'on retient — l'affiche" : reglagesDeLaFeuille(quoi, r).reglages.titre;
  return { seance, atelier: "cubes", titre, fabriquer: (graine) => ({ html: htmlDeLaFeuilleCubes(quoi, r, graine), style: STYLE_SEQUENCE_CUBES }) };
}

/** Les séances de la séquence du livret, et les feuilles de cubes qui les servent ; la première, orale, n'en a pas. */
const FEUILLES_DU_LIVRET: [number, FeuilleCubes][] = [
  [1, "grouper"], [2, "regrouper"], [3, "dessiner"], [4, "unites"], [5, "additive"], [6, "facons"], [7, "relier"], [7, "affiche"],
];

/** Ce qu'il faut préparer pour chaque séance de la séquence du livret ; les feuilles y sont nommées comme elles s'impriment. */
function materielDuLivret(ctx: ContexteFeuilles, feuilles: FeuilleAFabriquer[]): string[] {
  const materiel = ctx.classe === "CP" ? "des cubes emboîtables d'une même couleur, de quoi faire plusieurs barres de dix par élève"
    : ctx.classe === "CE1" ? "du matériel multibase — plaques de cent, barres de dix et cubes — ou des bûchettes en paquets"
      : "du matériel multibase — gros cubes de mille, plaques, barres et cubes";
  const lesFeuilles = (s: number) => feuilles.filter((f) => f.seance === s).map((f) => `« ${f.titre} »`);
  const avec = (s: number, debut: string) => {
    const f = lesFeuilles(s);
    return f.length ? `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${f.join(" et ")}.` : `${debut}.`;
  };
  return [
    avec(0, `Pour montrer les nombres, ${materiel} ; les ardoises pour la dictée de nombres`),
    avec(1, `Une collection différente par groupe, à organiser : ${materiel} ; les ardoises`),
    avec(2, "Des collections dessinées, non déplaçables, à entourer"),
    avec(3, "Le matériel pour valider"),
    avec(4, "Le matériel pour construire"),
    avec(5, "Le matériel pour relier chaque terme à sa valeur"),
    avec(6, "Le matériel pour vérifier"),
    avec(7, "Une fiche avec une collection non déplaçable ; un cahier pour le livret des nombres"),
  ];
}

/**
 * Les feuilles et le matériel d'une démarche, à la classe et à la période de
 * la séquence. Rien pour une démarche qui ne pioche pas encore dans les
 * ateliers.
 */
export function planDesFeuilles(demarcheId: string, ctx: ContexteFeuilles): PlanDesFeuilles | null {
  // Le calcul mental : les séquences des livrets, ou le procédé La Martinière (voir feuillesDuCalcul.ts).
  if (estUneDemarcheDeCalcul(demarcheId)) return planDuCalcul(demarcheId, ctx);
  // Les problèmes et les fractions des livrets (voir problemesDesLivrets.ts et fractionsDesLivrets.ts).
  if (estUneDemarcheDeProblemes(demarcheId)) return planDesProblemes(demarcheId);
  if (estUneDemarcheProlongee(demarcheId)) return planDesProblemesProlonges(demarcheId);
  if (estUneDemarcheDeFractions(demarcheId)) return planDesFractions(demarcheId);
  // Le français des livrets : la grille de fluence, le syllabaire, les étiquettes du vocabulaire (voir feuillesDuFrancais.ts).
  if (estUneDemarcheDeFrancais(demarcheId)) return planDuFrancais(demarcheId, ctx);
  if (!CLASSE_DES_DEMARCHES[demarcheId]) return null;
  // Grouper par dix, la centaine, le millier : les huit feuilles des cubes, de la grande collection à l'évaluation.
  if (demarcheId === "numeration-dizaine-cp" || demarcheId.startsWith("groupements-")) {
    const r = cubesPour(demarcheId, ctx);
    return { feuilles: FEUILLES_DE_LA_SEQUENCE_CUBES.map((f) => feuilleDeCubes(f.seance, f.quoi, r)), materiel: materielDesSeancesCubes(r) };
  }
  // La suite orale, l'écriture chiffrée, les représentations : la séquence du livret, une feuille par étape.
  if (demarcheId.startsWith("nombres-livret-")) {
    const r = cubesPour(demarcheId, ctx);
    const feuilles = FEUILLES_DU_LIVRET.map(([s, quoi]) => feuilleDeCubes(s, quoi, r));
    return { feuilles, materiel: materielDuLivret(ctx, feuilles) };
  }
  // Comparer, ranger, encadrer : les feuilles et les jeux de « Comparer les nombres ».
  if (demarcheId.startsWith("comparer-nombres-")) {
    const r = comparerPour(ctx);
    return {
      feuilles: FEUILLES_DE_LA_SEQUENCE.map((f) => ({
        seance: f.seance, atelier: "comparer", titre: f.titre,
        fabriquer: (graine: number) => ({ html: htmlDeLaFeuilleComparer(f.quoi, r, graine), style: STYLE_SEQUENCE_COMPARER }),
      })),
      materiel: materielDesSeancesComparer(r),
    };
  }
  return null;
}

// ── Les jeux qu'on a rattachés soi-même à la compétence ───────────────────

/** Un atelier dont on sait fabriquer la feuille, tel qu'on l'a réglé — à la classe de la séquence quand il en a une. */
interface Producteur { nom: string; fabriquer: (ctx: ContexteFeuilles | null, graine: number) => { html: string; style: string } }

const PRODUCTEURS: Record<string, Producteur> = {
  cubes: {
    nom: "Nombres en cubes",
    fabriquer: (ctx, graine) => {
      const laisses = reglagesCubesSurs({ ...REGLAGES_CUBES, ...reglagesLaisses<ReglagesCubes>("cubes") });
      const r = ctx ? { ...laisses, niveau: niveauDesCubes("", ctx) } : laisses;
      return { html: htmlCubes(exercicesCubes(r, graine), r, graine), style: STYLE_FEUILLE + STYLE_JEUX_MATHS + STYLE_CUBES };
    },
  },
  comparer: {
    nom: "Comparer les nombres",
    fabriquer: (ctx, graine) => {
      const laisses = reglagesComparerSurs({ ...REGLAGES_COMPARER, ...reglagesLaisses<ReglagesComparer>("comparer") });
      const r = ctx ? { ...laisses, niveau: niveauDeComparer(ctx) } : laisses;
      return { html: htmlComparer(paquet(r, graine), r), style: STYLE_FEUILLE + STYLE_COMPARER };
    },
  },
  nombres: {
    nom: "Cartes des nombres",
    fabriquer: () => {
      const r: ReglagesNombres = { ...REGLAGES_NOMBRES, ...reglagesLaisses<ReglagesNombres>("cartesNombres") };
      return { html: htmlCartesNombres(cartesNombres(r), r), style: STYLE_FEUILLE + STYLE_JEUX_MATHS };
    },
  },
  oie: {
    nom: "Jeu de l'oie",
    fabriquer: (_ctx, graine) => {
      const r: ReglagesOie = { ...REGLAGES_OIE, ...reglagesLaisses<ReglagesOie>("jeuDeLOie") };
      return { html: htmlJeuDeLOie(r, graine), style: STYLE_FEUILLE + STYLE_JEUX_MATHS };
    },
  },
};

/** Un atelier rattaché à la compétence : par quelle liste, et si l'on sait fabriquer sa feuille d'ici. */
export interface AtelierRattache { atelier: string; nom?: string; objectif: string; fabricable: boolean }

/**
 * Les ateliers dont « Ce que cela travaille » contient la compétence — pour
 * tous les niveaux, ou pour la classe de la séquence —, lus dans les
 * réglages. Une liste rattachée à une autre classe ne compte pas : au CP, on
 * ne pioche pas ce qu'on a rattaché au CE2.
 */
export function ateliersRattaches(reglages: Record<string, string>, c: CompetenceSelectionnee): AtelierRattache[] {
  const classe = classeDe(c.niveau);
  const sortie: AtelierRattache[] = [];
  for (const [cle, valeur] of Object.entries(reglages)) {
    if (!cle.startsWith(PREFIXE_COMPETENCES)) continue;
    const [atelier, ...reste] = cle.slice(PREFIXE_COMPETENCES.length).split(":");
    const objectif = reste.join(":");
    // Une liste par classe vaut pour sa classe ; une liste par objectif — une procédure de calcul mental — vaut partout.
    const autreClasse = /^(PS|MS|GS|CP|CE1|CE2|CM1|CM2)$/.test(objectif) && objectif !== classe;
    if (!atelier || autreClasse) continue;
    if (!lireCompetencesAtelier(valeur).some((x) => memeCompetence(x, c))) continue;
    if (sortie.some((a) => a.atelier === atelier)) continue;
    sortie.push({ atelier, nom: PRODUCTEURS[atelier]?.nom, objectif, fabricable: Boolean(PRODUCTEURS[atelier]) });
  }
  return sortie;
}

/** La feuille d'un atelier rattaché, telle qu'on l'a réglée — à la classe de la séquence pour les cubes et la comparaison. */
export function feuilleRattachee(atelier: string, seance: number, ctx: ContexteFeuilles | null): FeuilleAFabriquer | null {
  const p = PRODUCTEURS[atelier];
  return p ? { seance, atelier, titre: p.nom, fabriquer: (graine) => p.fabriquer(ctx, graine) } : null;
}
