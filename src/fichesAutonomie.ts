// En retard : des fiches à faire seul, pour chaque élève de la journée.
//
// Le matin où rien n'est prêt, « En retard » (dans ⌘K) regarde les créneaux
// du jour et les élèves qui y sont, prend le niveau de chacun et pioche dans
// les ateliers de Fabriquer de quoi travailler sans l'enseignant : trois
// fiches au moins de la petite à la grande section, quatre du CP au CE2 —
// et une au moins pour chacun de ses créneaux. Un élève non verbal ne
// reçoit pas de fiche de lecture. Chaque fiche porte son prénom, se range
// sur le bureau et s'écrit au cahier journal de ses créneaux, à la suite de
// ce qui était prévu : le journal imprimé la joint.
//
// On ne pioche que ce qu'un élève fait seul, la consigne une fois comprise :
// des fiches qui se corrigent d'elles-mêmes (le coloriage magique), qui se
// vérifient (les pyramides, les cubes), qui s'exercent (la cursive). Pas de
// jeu à plusieurs, pas de dictée, pas d'affiche ; pas non plus de matériel
// qui sort en plusieurs pages à découper, comme les fiches de places ou les
// boîtes de tri.

import type { Creneau, Eleve } from "./api";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { FAMILLES } from "./catalogueAteliers";
import { hasard, melanger, piocher } from "./hasard";
import { ligneDuPdf } from "./materielAImprimer";
import { reglagesLaisses } from "./reglagesLaisses";
// Maternelle
import {
  REGLAGES_CATEGORISER, STYLE_CATEGORISER, categoriesDuJeu, cequiManque as cequiManqueCategoriser, htmlCategoriser,
  idsDesImages as idsDesCategories, jeuxPour, motsDuJeu, reglagesDuNiveau as categoriserDuNiveau, type Forme as FormeCategoriser,
} from "./categoriser";
import { ETAPES_CONSEILLEES, REGLAGES_SUITES, STYLE_SUITES, htmlSuites, suitesPour } from "./suitesImages";
import { MOTIFS, REGLAGES_PAR_DEFAUT as REGLAGES_COLORIAGE, couleursDuMotif, fabriquerColoriage, feuilleDuColoriage, type Graphie, type ReglagesColoriage } from "./coloriageMagique";
import { REGLAGES_CURSIVE, STYLE_CURSIVE, htmlEcritureCursive, modelesDeLEtape, type ReglagesCursive } from "./ecritureCursive";
// Mathématiques
import { PART_A_REGROUPER, REGLAGES_CUBES, exercicesCubes, htmlCubes, reglagesCubesSurs, type IdNiveauCubes, type ReglagesCubes } from "./cubesNumeration";
import { STYLE_SEQUENCE_CUBES, reglagesDeLaFeuille as feuilleDeCubes } from "./sequenceCubes";
import { memesReglages } from "./modifierFeuille";
import { REGLAGES_COMPARER, reglagesComparerSurs, type IdNiveau as IdNiveauComparer, type ReglagesComparer } from "./comparerNombres";
import { STYLE_SEQUENCE_COMPARER, htmlDeLaFeuille as htmlDeLaFeuilleComparer } from "./sequenceComparer";
import { REGLAGES_PYRAMIDES, STYLE_PYRAMIDES, htmlPyramides } from "./pyramides";
import { REGLAGES_POSEES, STYLE_POSEES, htmlOperationsPosees, type ReglagesPosees } from "./operationsPosees";
import { REGLAGES_GEOMETRIE, STYLE_GEOMETRIE, htmlGeometrie } from "./geometrie";
import { REGLAGES_DEPLACEMENTS, STYLE_DEPLACEMENTS, htmlDeplacements } from "./deplacements";
import { REGLAGES_HEURE, STYLE_DUREES, STYLE_HEURE, htmlAtelierHeure, type ReglagesHeure } from "./heure";
import { REGLAGES_MONNAIE, STYLE_MONNAIE, htmlMonnaie } from "./monnaie";
import { REGLAGES_MESURES, STYLE_MESURES, htmlMesures } from "./mesures";
// Français
import { REGLAGES_MOTS_MELES, STYLE_MOTS_MELES, grilleMotsMeles, htmlMotsMeles } from "./motsMeles";
import { REGLAGES_COMPREHENSION, STYLE_COMPREHENSION, htmlComprehension } from "./comprehension";
import { REGLAGES_GRAMMAIRE, STYLE_GRAMMAIRE, htmlGrammaire, type ExerciceGrammaire } from "./grammaire";
import { MOTS_FREQUENTS, PHRASES_DU_JOUR, REGLAGES_ORTHOGRAPHE, STYLE_ORTHOGRAPHE, htmlOrthographe } from "./orthographe";
import { REGLAGES_ECRIRE, STYLE_ECRIRE, htmlEcrire } from "./ecrire";
import { etapeDeLaSequence, reglureDe } from "./feuillesDuFrancais";
import { etapeDe, motsDe } from "./progressionCgp";

/** Demande au planning d'ouvrir « En retard » au jour qu'il montre. */
export const EVT_EN_RETARD = "maitrize:en-retard";

// ── Les niveaux ───────────────────────────────────────────────────────────

export type NiveauFiches = "PS" | "MS" | "GS" | "CP" | "CE1" | "CE2";
export const NIVEAUX_FICHES: NiveauFiches[] = ["PS", "MS", "GS", "CP", "CE1", "CE2"];
type Maternelle = "PS" | "MS" | "GS";
type Elementaire = "CP" | "CE1" | "CE2";

export const enMaternelle = (n: NiveauFiches): n is Maternelle => n === "PS" || n === "MS" || n === "GS";

/**
 * Le niveau des fiches d'un élève : celui de sa fiche, la toute petite
 * section avec la petite, et au-delà du CE2 les fiches du CE2 — les plus
 * avancées qu'on sache faire. Rien si le niveau n'est pas dit.
 */
export function niveauDesFiches(niveau: string | null | undefined): NiveauFiches | null {
  const n = (niveau ?? "").trim().toUpperCase();
  if (n === "TPS") return "PS";
  if ((NIVEAUX_FICHES as string[]).includes(n)) return n as NiveauFiches;
  if (n === "CM1" || n === "CM2") return "CE2";
  return null;
}

/** Au-delà, la journée déborde : huit fiches au plus. */
export const FICHES_MAX = 8;

/** Combien de fiches pour la journée : trois en maternelle, quatre du CP au CE2 — et une au moins par créneau. */
export const combienDeFiches = (n: NiveauFiches, creneaux = 0) =>
  Math.min(FICHES_MAX, Math.max(enMaternelle(n) ? 3 : 4, creneaux));

// ── Les fiches ────────────────────────────────────────────────────────────

export type Domaine = "langage" | "temps" | "nombres" | "lettres" | "francais" | "maths";

/** Ce qu'une fiche sait de l'élève qui la reçoit. */
export interface ContexteFiche { niveau: NiveauFiches; periode: number; prenom: string }

/** De quoi trouver les pictogrammes de la banque, installée sur l'ordinateur. */
export interface OutilsFiche {
  /** L'image d'un pictogramme, en data URL ; rien s'il manque. */
  image: (id: number) => Promise<string | null>;
  /** Le numéro du pictogramme de chaque mot trouvé, par mot en minuscules. */
  pictos: (mots: string[]) => Promise<Record<string, number>>;
}

export interface FicheFabriquee {
  html: string;
  style: string;
  /** Ce que l'atelier garde (`fabriquer:<clé>`) pour refaire la fiche dans Fabriquer ; absent s'il ne la refait pas à l'identique. */
  refaire?: Record<string, unknown>;
}

export interface RecetteDeFiche {
  id: string;
  /** L'atelier de Fabriquer qui la fait : sa consigne réécrite et ses compétences la suivent. */
  atelier: string;
  /** Ce que l'élève fait, tel qu'on le lit dans le journal. */
  nom: string | ((c: ContexteFiche) => string);
  domaine: Domaine;
  niveaux: NiveauFiches[];
  /** Les périodes où elle se donne ; toutes, sans rien dire. */
  periodes?: number[];
  /** Il faut lire pour la faire : un élève non verbal ne la reçoit pas. */
  lecture?: boolean;
  fabriquer: (c: ContexteFiche, graine: number, outils: OutilsFiche) => FicheFabriquee | Promise<FicheFabriquee>;
}

export const nomDeLaRecette = (r: RecetteDeFiche, c: ContexteFiche) => (typeof r.nom === "function" ? r.nom(c) : r.nom);

/** L'icône de l'atelier qui fait la fiche. */
export const iconeDeLaRecette = (r: RecetteDeFiche) =>
  FAMILLES.flatMap((f) => f.outils).find((o) => o.id === r.atelier)?.icone ?? "📄";

const elementaire = (n: NiveauFiches): Elementaire => (enMaternelle(n) ? "CP" : n);

/** Une fiche que son atelier refait telle quelle : ses réglages, sous la clé où il les garde (voir `modifierFeuille`). */
const commeLAtelier = (html: string, style: string, cle: string, reglages: object): FicheFabriquee => ({ html, style, refaire: { [cle]: reglages } });

/** Les images de ces pictogrammes, par numéro ; une image qui manque ne bloque pas les autres. */
async function imagesDe(ids: (number | null)[], outils: OutilsFiche): Promise<Record<number, string>> {
  const uniques = [...new Set(ids.filter((id): id is number => id !== null))];
  const paires = await Promise.all(uniques.map(async (id) => [id, await outils.image(id).catch(() => null)] as const));
  return Object.fromEntries(paires.filter((p): p is readonly [number, string] => Boolean(p[1])));
}

// La maternelle : nommer et catégoriser, ordonner, reconnaître chiffres et lettres.

/**
 * Une fiche de catégorisation sur un exemple d'Éduscol à l'âge de l'élève.
 * Une image qui manque à la banque laisse son mot seul, ce qui ne dit rien
 * à qui ne lit pas : on l'écarte, et l'on passe à l'exemple suivant si
 * celui-ci n'y suffit plus.
 */
async function categoriser(forme: FormeCategoriser, c: ContexteFiche, graine: number, outils: OutilsFiche): Promise<FicheFabriquee> {
  const niveau = c.niveau as Maternelle;
  const alea = hasard(graine);
  const jeux = jeuxPour(niveau);
  const aCetAge = jeux.filter((j) => j.niveaux.includes(niveau));
  for (const jeu of [...melanger(alea, aCetAge), ...melanger(alea, jeux.filter((j) => !aCetAge.includes(j)))]) {
    const categories = categoriesDuJeu(jeu, await outils.pictos(motsDuJeu(jeu)))
      .map((cat) => ({ ...cat, mots: cat.mots.filter((m) => m.id !== null) }));
    const r = { ...REGLAGES_CATEGORISER, ...categoriserDuNiveau(niveau), niveau, forme, categories, legendes: false, maisons: false };
    if (cequiManqueCategoriser(r)) continue;
    const images = await imagesDe(idsDesCategories(categories), outils);
    // La feuille tire à partir de la graine, comme l'atelier : il la refait à l'identique.
    return commeLAtelier(htmlCategoriser(r, images, hasard(graine)), STYLE_FEUILLE + STYLE_CATEGORISER, "categoriser", r);
  }
  throw new Error("Les pictogrammes de ces catégories manquent à la banque.");
}

/** Une histoire en images à remettre dans l'ordre, du nombre d'étapes de l'âge — une de plus au plus. */
async function suiteDImages(c: ContexteFiche, graine: number, outils: OutilsFiche): Promise<FicheFabriquee> {
  const niveau = c.niveau as Maternelle;
  const alea = hasard(graine);
  const possibles = suitesPour(niveau).filter((s) => s.niveaux.includes(niveau) && s.etapes.length <= ETAPES_CONSEILLEES[niveau] + 1);
  const suite = melanger(alea, possibles.length ? possibles : suitesPour(niveau))[0];
  const r = { ...REGLAGES_SUITES, niveau, forme: "colonnes" as const, titre: suite.libelle, etapes: suite.etapes.map((e) => ({ id: e.id, mot: e.mot })), legendes: false };
  const images = await imagesDe(suite.etapes.map((e) => e.id), outils);
  // La feuille tire à partir de la graine, comme l'atelier : il la refait à l'identique.
  return commeLAtelier(htmlSuites(r, images, hasard(graine)), STYLE_FEUILLE + STYLE_SUITES, "suites", r);
}

/**
 * Un dessin de la galerie, de trois couleurs au moins — d'une seule, toutes
 * les cases se ressemblent et il n'y a rien à chercher ; en maternelle, les
 * plus petits, dix cases de côté au plus.
 */
function motifAuHasard(graine: number, maternelle: boolean): string {
  const possibles = MOTIFS.filter((m) => couleursDuMotif(m).length >= 3
    && (!maternelle || (m.grille.length <= 10 && (m.grille[0]?.length ?? 0) <= 10)));
  return melanger(hasard(graine + 1), possibles.length ? possibles : MOTIFS)[0].id;
}

/** Le coloriage magique : `consigneAutre` pour les chiffres, qui ne sont pas des lettres. */
function coloriage(r: Partial<ReglagesColoriage>, graine: number, maternelle: boolean, consigneAutre?: string): FicheFabriquee {
  const reglages: ReglagesColoriage = {
    ...REGLAGES_COLORIAGE, ...reglagesLaisses<ReglagesColoriage>("coloriage"), polices: false, titre: "Coloriage magique",
    motif: motifAuHasard(graine, maternelle), ...r,
  };
  const f = feuilleDuColoriage(fabriquerColoriage(reglages, graine), reglages, false, consigneAutre);
  // Une consigne à part — celle des chiffres —, l'atelier ne l'écrit pas : il ne refait que les autres.
  return { html: f.corps, style: STYLE_FEUILLE + f.style, refaire: consigneAutre ? undefined : { coloriage: reglages } };
}

/** Les chiffres d'un coloriage de maternelle : jusqu'à 6 en moyenne section, jusqu'à 9 en grande. */
function coloriageDesChiffres(c: ContexteFiche, graine: number): FicheFabriquee {
  const jusqua = c.niveau === "MS" ? 6 : 9;
  const chiffres = melanger(hasard(graine), Array.from({ length: jusqua }, (_, i) => String(i + 1)));
  return coloriage({ matiere: "graphies", lettres: chiffres, graphies: ["script"], titre: "Coloriage magique des chiffres" }, graine, true,
    "Regarde bien le chiffre écrit dans chaque case, puis colorie la case de la couleur de ce chiffre. Une case vide reste blanche.");
}

/** Les lettres en grande section : les capitales d'abord, le script ensuite, la cursive en fin d'année. */
function coloriageDesLettres(c: ContexteFiche, graine: number): FicheFabriquee {
  const graphies: Graphie[] = c.periode <= 2 ? ["majuscule"] : c.periode <= 4 ? ["majuscule", "script"] : ["majuscule", "script", "cursive"];
  const lettres = piocher(hasard(graine), ["a", "e", "i", "o", "u", "l", "m", "r", "s", "t"], 6);
  return coloriage({ matiere: "graphies", lettres, graphies, titre: "Coloriage magique des lettres" }, graine, true);
}

/** Le prénom à la façon d'un prénom : « ETHAN » s'écrit Ethan en cursive. */
export const prenomEcrit = (prenom: string) =>
  prenom.trim().toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, avant: string, l: string) => avant + l.toUpperCase());

function cursive(r: Partial<ReglagesCursive>): FicheFabriquee {
  const reglages = { ...REGLAGES_CURSIVE, ...r };
  return commeLAtelier(htmlEcritureCursive(reglages), STYLE_FEUILLE + STYLE_CURSIVE, "cursive", reglages);
}

// Le CP, le CE1, le CE2.

const niveauDesCubes = (c: ContexteFiche): IdNiveauCubes =>
  c.niveau === "CE1" ? "ce1" : c.niveau === "CE2" ? "ce2" : c.periode <= 1 ? "cp-19" : c.periode === 2 ? "cp-59" : "cp-100";

const cubes = (c: ContexteFiche): ReglagesCubes =>
  reglagesCubesSurs({ ...REGLAGES_CUBES, ...reglagesLaisses<ReglagesCubes>("cubes"), niveau: niveauDesCubes(c) });

/** La feuille de cubes de la séquence, en moins long : au CE2, les milliers prennent une demi-page chacun. */
function feuilleCubes(quoi: "ecrire" | "dessiner", c: ContexteFiche, graine: number): FicheFabriquee {
  const { reglages, part } = feuilleDeCubes(quoi, cubes(c));
  const r = { ...reglages, nombre: c.niveau === "CE2" ? 4 : 6 };
  // L'atelier la refait quand il garde ces réglages tels quels et regroupe la même part des collections.
  const fidele = (!r.aRegrouper || part === PART_A_REGROUPER) && memesReglages(reglagesCubesSurs(r), r);
  return { html: htmlCubes(exercicesCubes(r, graine, part), r, graine), style: STYLE_SEQUENCE_CUBES, refaire: fidele ? { cubes: r } : undefined };
}

const niveauDeComparer = (c: ContexteFiche): IdNiveauComparer =>
  c.niveau === "CE1" ? "ce1" : c.niveau === "CE2" ? "ce2" : c.periode <= 1 ? "cp-30" : c.periode === 2 ? "cp-59" : "cp-100";

const comparer = (c: ContexteFiche): ReglagesComparer =>
  reglagesComparerSurs({ ...REGLAGES_COMPARER, ...reglagesLaisses<ReglagesComparer>("comparer"), niveau: niveauDeComparer(c) });

/** Les opérations posées de la classe : l'addition au CE1, la soustraction au CE2. */
function posees(c: ContexteFiche): ReglagesPosees {
  return c.niveau === "CE1"
    ? { ...REGLAGES_POSEES, operation: "+", chiffres: 2, retenue: c.periode <= 2 ? "sans" : "melange", combien: 6, posees: true }
    : { ...REGLAGES_POSEES, operation: "−", chiffres: c.periode <= 2 ? 2 : 3, retenue: "melange", combien: 6, posees: true };
}

/** L'heure : les heures pile puis les demies au CE1 ; les quarts puis les cinq minutes au CE2. */
function heure(c: ContexteFiche): ReglagesHeure {
  const laisses = reglagesLaisses<ReglagesHeure>("heure");
  const precision = c.niveau === "CE1" ? (c.periode <= 2 ? "heures" : "demies") : c.periode <= 2 ? "quarts" : "cinq";
  return { ...REGLAGES_HEURE, ...laisses, exercice: "horloges", precision, sens: c.niveau === "CE1" ? "lire" : "mixte", combien: 9, apresMidi: false };
}

/** Les mots du son de la période, au CP : ceux qu'on sait déjà lire. */
function motsDuSon(c: ContexteFiche, graine: number, combien: number): string[] {
  const mots = motsDe(etapeDe(etapeDeLaSequence("CP", c.periode)), []).corpus.filter((m) => /^\p{L}{3,7}$/u.test(m));
  return piocher(hasard(graine), mots, combien);
}

/** Des mots fréquents de la classe, d'un seul tenant. */
const motsFrequents = (classe: Elementaire, graine: number, combien: number) =>
  piocher(hasard(graine), MOTS_FREQUENTS[classe].filter((m) => /^\p{L}+$/u.test(m) && m.length <= 10), combien);

function motsMeles(c: ContexteFiche, graine: number): FicheFabriquee {
  const mots = c.niveau === "CP" ? motsDuSon(c, graine, 8) : motsFrequents(elementaire(c.niveau), graine, 8);
  const r = { ...REGLAGES_MOTS_MELES, mots: mots.join("\n"), taille: c.niveau === "CP" ? 9 : 10, diagonales: false, inverses: false, liste: true, grilles: 1 };
  return commeLAtelier(htmlMotsMeles([grilleMotsMeles(mots, r, graine)], r), STYLE_FEUILLE + STYLE_MOTS_MELES, "motsMeles", r);
}

/** La grammaire de la classe : genre et nombre au CP, le sujet et le verbe au CE1, les classes de mots au CE2. */
const GRAMMAIRE: Record<Elementaire, { exercice: ExerciceGrammaire; nom: string }> = {
  CP: { exercice: "genreNombre", nom: "Masculin, féminin, singulier, pluriel" },
  CE1: { exercice: "sujetVerbe", nom: "Le sujet et le verbe" },
  CE2: { exercice: "classes", nom: "Les classes de mots" },
};

const C2: NiveauFiches[] = ["CP", "CE1", "CE2"];
const DES_PERIODES = (de: number) => [1, 2, 3, 4, 5].filter((p) => p >= de);

export const RECETTES: RecetteDeFiche[] = [
  // ── Maternelle
  { id: "intrus", atelier: "categoriser", nom: "Trouve l'intrus", domaine: "langage", niveaux: ["PS", "MS", "GS"],
    fabriquer: (c, g, o) => categoriser("intrus", c, g, o) },
  { id: "suite", atelier: "suites", nom: "Remets les images dans l'ordre", domaine: "temps", niveaux: ["PS", "MS", "GS"],
    fabriquer: (c, g, o) => suiteDImages(c, g, o) },
  { id: "coloriage-chiffres", atelier: "coloriage", nom: "Coloriage magique des chiffres", domaine: "nombres", niveaux: ["MS", "GS"],
    fabriquer: (c, g) => coloriageDesChiffres(c, g) },
  { id: "coloriage-lettres", atelier: "coloriage", nom: "Coloriage magique des lettres", domaine: "lettres", niveaux: ["GS"],
    fabriquer: (c, g) => coloriageDesLettres(c, g) },
  { id: "prenom", atelier: "cursive", nom: "J'écris mon prénom", domaine: "lettres", niveaux: ["GS"],
    fabriquer: (c) => cursive({ modeles: Array.from({ length: 3 }, () => prenomEcrit(c.prenom) || "Prénom").join("\n"), reglure: 3, lignes: 3 }) },
  // ── Mathématiques
  { id: "cubes-ecrire", atelier: "cubes", nom: "Lire les cubes, écrire le nombre", domaine: "maths", niveaux: C2,
    fabriquer: (c, g) => feuilleCubes("ecrire", c, g) },
  { id: "cubes-dessiner", atelier: "cubes", nom: "Lire le nombre, dessiner les cubes", domaine: "maths", niveaux: C2,
    fabriquer: (c, g) => feuilleCubes("dessiner", c, g) },
  { id: "comparer", atelier: "comparer", nom: "Comparer des nombres", domaine: "maths", niveaux: C2,
    fabriquer: (c, g) => ({ html: htmlDeLaFeuilleComparer("ecritures", comparer(c), g), style: STYLE_SEQUENCE_COMPARER }) },
  { id: "pyramides", atelier: "pyramides", nom: "Les pyramides de nombres", domaine: "maths", niveaux: C2,
    fabriquer: (c, g) => {
      const r = c.niveau === "CP" ? { etages: 3, jusqua: c.periode <= 2 ? 3 : 6 } : c.niveau === "CE1" ? { etages: 4, jusqua: 10 } : { etages: 4, jusqua: 25 };
      const reglages = { ...REGLAGES_PYRAMIDES, forme: "pyramide" as const, combien: 6, trous: "bas" as const, ...r };
      return commeLAtelier(htmlPyramides(reglages, g), STYLE_FEUILLE + STYLE_PYRAMIDES, "pyramides", reglages);
    } },
  { id: "coloriage-calcul", atelier: "coloriage", nom: "Coloriage magique : calculer", domaine: "maths", niveaux: C2,
    fabriquer: (c, g) => coloriage(c.niveau === "CP" ? { matiere: "calcul", operation: "addition", plafond: 10 }
      : c.niveau === "CE1" ? { matiere: "calcul", operation: "melange", plafond: 20 }
        : { matiere: "calcul", operation: "multiplication", table: [2, 3, 4, 5][g % 4] }, g, false) },
  { id: "posees", atelier: "posees", nom: (c) => (c.niveau === "CE1" ? "Des additions posées" : "Des soustractions posées"), domaine: "maths", niveaux: ["CE1", "CE2"],
    fabriquer: (c, g) => commeLAtelier(htmlOperationsPosees(posees(c), g), STYLE_FEUILLE + STYLE_POSEES, "operationsPosees", posees(c)) },
  { id: "reproduire", atelier: "geometrie", nom: "Reproduire sur quadrillage", domaine: "maths", niveaux: C2,
    fabriquer: (c, g) => {
      const reglages = { ...REGLAGES_GEOMETRIE, exercice: "reproduire" as const, classe: elementaire(c.niveau), support: "quadrille" as const,
        niveau: c.niveau === "CP" ? "lignes" as const : c.niveau === "CE1" ? "diagonales" as const : "obliques" as const };
      return commeLAtelier(htmlGeometrie(reglages, g), STYLE_FEUILLE + STYLE_GEOMETRIE, "geometrie", reglages);
    } },
  { id: "fusee", atelier: "deplacements", nom: "Le chemin de la fusée", domaine: "maths", niveaux: C2,
    fabriquer: (c, g) => {
      const reglages = { ...REGLAGES_DEPLACEMENTS, exercice: "fusee" as const, classe: c.niveau === "CP" ? "CP" as const : "CE1" as const, mode: "decoder" as const, combien: 4 };
      return commeLAtelier(htmlDeplacements(reglages, g), STYLE_FEUILLE + STYLE_DEPLACEMENTS, "deplacements", reglages);
    } },
  { id: "heure", atelier: "heure", nom: "Lire l'heure", domaine: "maths", niveaux: ["CE1", "CE2"],
    fabriquer: (c, g) => commeLAtelier(htmlAtelierHeure(heure(c), g), STYLE_FEUILLE + STYLE_HEURE + STYLE_DUREES, "heure", heure(c)) },
  { id: "monnaie", atelier: "monnaie", nom: "Combien d'argent ?", domaine: "maths", niveaux: C2,
    fabriquer: (c, g) => {
      const reglages = { ...REGLAGES_MONNAIE, exercice: "valeur" as const, jusqua: c.niveau === "CP" ? 20 : c.niveau === "CE1" ? 50 : 100, combien: 6 };
      return commeLAtelier(htmlMonnaie(reglages, g), STYLE_FEUILLE + STYLE_MONNAIE, "monnaie", reglages);
    } },
  { id: "mesurer", atelier: "mesures", nom: "Mesurer des segments", domaine: "maths", niveaux: ["CE1", "CE2"],
    fabriquer: (c, g) => {
      const reglages = { ...REGLAGES_MESURES, exercice: "mesurer" as const, grandeur: "longueur" as const, classe: elementaire(c.niveau), combien: 6 };
      return commeLAtelier(htmlMesures(reglages, g), STYLE_FEUILLE + STYLE_MESURES, "mesures", reglages);
    } },
  // ── Français
  { id: "cursive", atelier: "cursive", nom: "Écriture cursive", domaine: "francais", niveaux: C2,
    fabriquer: (c, g) => c.niveau === "CP"
      ? cursive({ modeles: modelesDeLEtape(etapeDeLaSequence("CP", c.periode), "mots", g).join("\n"), reglure: reglureDe("CP", c.periode), lignes: 2 })
      : c.niveau === "CE1"
        ? cursive({ modeles: motsFrequents("CE1", g, 5).join("\n"), reglure: reglureDe("CE1", c.periode), lignes: 2 })
        : cursive({ modeles: piocher(hasard(g), PHRASES_DU_JOUR.CE2, 2).join("\n"), reglure: reglureDe("CE2", c.periode), lignes: 2, transcrire: true }) },
  { id: "mots-meles", atelier: "motsMeles", nom: "Mots mêlés", domaine: "francais", niveaux: C2,
    fabriquer: (c, g) => motsMeles(c, g) },
  { id: "comprendre", atelier: "comprehension", nom: "Lire et comprendre un texte", domaine: "francais", niveaux: C2, lecture: true,
    fabriquer: (c, g) => {
      const reglages = { ...REGLAGES_COMPREHENSION, exercice: c.niveau === "CP" ? "vraiFaux" as const : "questions" as const, classe: elementaire(c.niveau), texte: "", questions: "toutes" as const };
      return commeLAtelier(htmlComprehension(reglages, g), STYLE_FEUILLE + STYLE_COMPREHENSION, "comprehension", reglages);
    } },
  { id: "grammaire", atelier: "grammaire", nom: (c) => GRAMMAIRE[elementaire(c.niveau)].nom, domaine: "francais", niveaux: C2, lecture: true,
    fabriquer: (c, g) => {
      const reglages = { ...REGLAGES_GRAMMAIRE, exercice: GRAMMAIRE[elementaire(c.niveau)].exercice, classe: elementaire(c.niveau) };
      return commeLAtelier(htmlGrammaire(reglages, g), STYLE_FEUILLE + STYLE_GRAMMAIRE, "grammaire", reglages);
    } },
  { id: "listes", atelier: "orthographe", nom: "Les listes de mots qui se ressemblent", domaine: "francais", niveaux: ["CE1", "CE2"], lecture: true,
    fabriquer: (c, g) => {
      const reglages = { ...REGLAGES_ORTHOGRAPHE, exercice: "listes" as const, classe: elementaire(c.niveau) };
      return commeLAtelier(htmlOrthographe(reglages, g), STYLE_FEUILLE + STYLE_ORTHOGRAPHE, "orthographe", reglages);
    } },
  { id: "mots-imposes", atelier: "ecrire", nom: "Écrire avec des mots imposés", domaine: "francais", niveaux: ["CE1", "CE2"], lecture: true,
    fabriquer: (c, g) => {
      const reglages = { ...REGLAGES_ECRIRE, exercice: "motsImposes" as const, classe: elementaire(c.niveau) };
      return commeLAtelier(htmlEcrire(reglages, g), STYLE_FEUILLE + STYLE_ECRIRE, "ecrire", reglages);
    } },
];

// Au CP, ce qui attend que le code soit bien avancé : un texte se lit seul à
// partir de la troisième période, la grammaire de la quatrième ; la monnaie
// vient en fin d'année.
const PERIODES_DU_CP: Record<string, number[]> = { comprendre: DES_PERIODES(3), grammaire: DES_PERIODES(4), monnaie: DES_PERIODES(4) };

export const recetteDe = (id: string) => RECETTES.find((r) => r.id === id);

/** Les fiches qu'on peut donner à cet élève, à cette période. */
export function recettesPour(n: NiveauFiches, periode: number, nonVerbal: boolean): RecetteDeFiche[] {
  return RECETTES.filter((r) => r.niveaux.includes(n)
    && !(nonVerbal && r.lecture)
    && !(n === "CP" && PERIODES_DU_CP[r.id] && !PERIODES_DU_CP[r.id].includes(periode))
    && (!r.periodes || r.periodes.includes(periode)));
}

/**
 * L'ordre des domaines, d'une fiche à la suivante : en maternelle, les
 * nombres, les lettres en grande section, le langage, le temps ; ensuite,
 * le français et les maths tour à tour.
 */
export function ordreDesDomaines(n: NiveauFiches): Domaine[] {
  if (n === "PS") return ["langage", "temps"];
  if (n === "MS") return ["nombres", "langage", "temps"];
  if (n === "GS") return ["nombres", "lettres", "langage", "temps"];
  return ["francais", "maths"];
}

/** Une graine tirée d'un texte : le même élève, le même jour, le même tirage. */
export function graineDe(texte: string): number {
  let h = 2166136261;
  for (let i = 0; i < texte.length; i++) { h ^= texte.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) % 1_000_000_007;
}

/** Une fiche proposée : sa recette, et la graine de son tirage. */
export interface FicheProposee { recette: string; graine: number }

/**
 * Les fiches proposées à un élève : chaque domaine à son tour, une recette
 * différente à chaque fois tant qu'il en reste — puis les mêmes, autrement
 * tirées.
 */
export function proposer(n: NiveauFiches, periode: number, nonVerbal: boolean, combien: number, graine: number): FicheProposee[] {
  const alea = hasard(graine);
  const possibles = melanger(alea, recettesPour(n, periode, nonVerbal));
  if (!possibles.length) return [];
  const ordre = ordreDesDomaines(n);
  const pris: RecetteDeFiche[] = [];
  for (let i = 0; pris.length < combien; i++) {
    const restantes = possibles.filter((r) => !pris.includes(r));
    const vivier = restantes.length ? restantes : possibles;
    const domaine = ordre[i % ordre.length];
    pris.push(vivier.find((r) => r.domaine === domaine) ?? vivier[0]);
  }
  return pris.map((r, i) => ({ recette: r.id, graine: (graine + 7919 * (i + 1)) % 1_000_000_007 }));
}

/**
 * Une autre fiche à la place de celle-ci : du même domaine si l'on peut,
 * d'un autre sinon, jamais une déjà choisie — et, s'il n'y en a plus, la
 * même autrement tirée.
 */
export function uneAutre(courante: FicheProposee, choisies: FicheProposee[], n: NiveauFiches, periode: number, nonVerbal: boolean, graine: number): FicheProposee {
  const possibles = melanger(hasard(graine), recettesPour(n, periode, nonVerbal));
  const prises = new Set(choisies.map((f) => f.recette));
  const domaine = recetteDe(courante.recette)?.domaine;
  const libres = possibles.filter((r) => !prises.has(r.id));
  const r = libres.find((x) => x.domaine === domaine) ?? libres[0];
  return { recette: r?.id ?? courante.recette, graine: (graine + 104729) % 1_000_000_007 };
}

/** Une fiche de plus : celle du domaine qui vient, parmi celles qu'il n'a pas. */
export function uneDePlus(choisies: FicheProposee[], n: NiveauFiches, periode: number, nonVerbal: boolean, graine: number): FicheProposee | null {
  const possibles = melanger(hasard(graine), recettesPour(n, periode, nonVerbal));
  if (!possibles.length) return null;
  const ordre = ordreDesDomaines(n);
  const domaine = ordre[choisies.length % ordre.length];
  const prises = new Set(choisies.map((f) => f.recette));
  const libres = possibles.filter((r) => !prises.has(r.id));
  const vivier = libres.length ? libres : possibles;
  return { recette: (vivier.find((r) => r.domaine === domaine) ?? vivier[0]).id, graine: (graine + 15485863) % 1_000_000_007 };
}

// ── La journée ────────────────────────────────────────────────────────────

/** Les élèves d'un créneau, par leur identifiant. */
export function elevesDuCreneau(c: Pick<Creneau, "elevesJson">): string[] {
  try {
    const ids = JSON.parse(c.elevesJson || "[]");
    return Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string") : [];
  } catch { return []; }
}

export interface EleveDuJour {
  eleve: Eleve;
  /** Ses créneaux de classe ce jour-là, dans l'ordre de l'heure. */
  creneaux: Creneau[];
}

/**
 * Les élèves de la journée et leurs créneaux. Les créneaux d'une classe
 * d'IME disent qui y est ; quand aucun ne le dit — une classe ordinaire —,
 * toute la classe est là à chaque créneau. Les réunions ne comptent pas.
 */
export function elevesDuJour(creneaux: Creneau[], eleves: Eleve[]): { presents: EleveDuJour[]; sansCreneau: Eleve[] } {
  const deClasse = creneaux.filter((c) => c.nature !== "reunion").sort((a, b) => a.heureDebut.localeCompare(b.heureDebut));
  const actifs = eleves.filter((e) => e.present !== false);
  const nommes = deClasse.some((c) => elevesDuCreneau(c).length > 0);
  const presents = actifs
    .map((eleve) => ({ eleve, creneaux: nommes ? deClasse.filter((c) => elevesDuCreneau(c).includes(eleve.id)) : deClasse }))
    .filter((x) => x.creneaux.length > 0)
    .sort((a, b) => a.creneaux[0].heureDebut.localeCompare(b.creneaux[0].heureDebut) || a.eleve.nom.localeCompare(b.eleve.nom, "fr"));
  const sansCreneau = deClasse.length ? actifs.filter((e) => !presents.some((p) => p.eleve.id === e.id)) : [];
  return { presents, sansCreneau };
}

/** Le créneau de chaque fiche : l'une après l'autre, d'un créneau au suivant. */
export const repartir = (fiches: number, creneaux: number): number[] =>
  Array.from({ length: fiches }, (_, i) => (creneaux > 0 ? i % creneaux : -1));

/** Le prénom d'un élève : le premier mot de son nom, comme dans le planning. */
export const prenomDe = (e: Pick<Eleve, "nom">) => e.nom.trim().split(/\s+/)[0] || "Élève";

/** « 7 oct. » */
export const jourCourt = (jour: string) =>
  new Date(`${jour}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

/** « mercredi 7 octobre » */
export const jourEnLettres = (jour: string) =>
  new Date(`${jour}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

/** Le nom de la fiche sur le bureau et dans le journal : ce qu'on y fait, pour qui, quel jour. */
export const titreDeLaFiche = (nom: string, prenom: string, jour: string) => `${nom} — ${prenom}, ${jourCourt(jour)}`;

/** Un titre que personne n'a encore : le journal cite un PDF par son titre, deux pareils se confondraient. */
export function titreLibre(titre: string, pris: Set<string>): string {
  const cle = (t: string) => t.trim().toLowerCase();
  let t = titre;
  for (let n = 2; pris.has(cle(t)); n++) t = `${titre} (${n})`;
  pris.add(cle(t));
  return t;
}

/** Le dossier du bureau où se rangent les fiches du jour. */
export const dossierDuJour = (jour: string) => `Fiches d'autonomie/${jour}`;

export const TETE_DU_JOURNAL = "⏰ En autonomie :";

/** Le prévu d'un créneau, les fiches à la suite : une ligne 📄 par fiche, que le journal imprimé joint. */
export function prevuAvecLesFiches(prevu: string, titres: string[]): string {
  if (!titres.length) return prevu;
  const bloc = [TETE_DU_JOURNAL, ...titres.map((titre) => ligneDuPdf({ titre }))].join("\n");
  const avant = (prevu ?? "").replace(/\s+$/, "");
  return avant ? `${avant}\n\n${bloc}` : bloc;
}
