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
// boîtes de tri. Ni « Trouve l'intrus » : il se fait en disant pourquoi, à
// quelqu'un qui écoute, et une ligne tirée au hasard a souvent plusieurs
// intrus possibles — les tongs avec les gants, la ceinture ou le bonnet ?

import type { Creneau, Eleve } from "./api";
import { STYLE_FEUILLE, feuille } from "./cartesImprimables";
import type { MonPicto } from "./mesPictos";
import { escapeHtml } from "./print";
import { TOUS_LES_NIVEAUX } from "./supportsDeTravail";
import { FAMILLES } from "./catalogueAteliers";
import { hasard, melanger, piocher } from "./hasard";
import { ligneDuPdf } from "./materielAImprimer";
import { reglagesLaisses } from "./reglagesLaisses";
// Maternelle
import { ETAPES_CONSEILLEES, REGLAGES_SUITES, STYLE_SUITES, htmlSuites, suitesPour } from "./suitesImages";
import { MOTIFS, REGLAGES_PAR_DEFAUT as REGLAGES_COLORIAGE, couleursDuMotif, fabriquerColoriage, feuilleDuColoriage, type Graphie, type ReglagesColoriage } from "./coloriageMagique";
import { REGLAGES_CURSIVE, STYLE_CURSIVE, htmlEcritureCursive, modelesDeLEtape, type ReglagesCursive } from "./ecritureCursive";
// Mathématiques
import { PART_A_REGROUPER, REGLAGES_CUBES, exercicesCubes, htmlCubes, reglagesCubesSurs, type IdNiveauCubes, type ReglagesCubes } from "./cubesNumeration";
import { STYLE_SEQUENCE_CUBES, reglagesDeLaFeuille as feuilleDeCubes } from "./sequenceCubes";
import { ATELIER_SUPPORT, memesReglages } from "./modifierFeuille";
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
import { ETAPES, motsDe } from "./progressionCgp";

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
  /** Un support de travail : la photo de Mes pictos et sa matière (voir recettesDesSupports). */
  support?: { photo: number; matiere: string };
  fabriquer: (c: ContexteFiche, graine: number, outils: OutilsFiche) => FicheFabriquee | Promise<FicheFabriquee>;
}

export const nomDeLaRecette = (r: RecetteDeFiche, c: ContexteFiche) => (typeof r.nom === "function" ? r.nom(c) : r.nom);

/** L'icône de l'atelier qui fait la fiche. */
export const iconeDeLaRecette = (r: RecetteDeFiche) =>
  r.atelier === ATELIER_SUPPORT ? "📷" : FAMILLES.flatMap((f) => f.outils).find((o) => o.id === r.atelier)?.icone ?? "📄";

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

/** Le prénom à la façon d'un prénom : « ELIOT » s'écrit Eliot en cursive. */
export const prenomEcrit = (prenom: string) =>
  prenom.trim().toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, avant: string, l: string) => avant + l.toUpperCase());

function cursive(r: Partial<ReglagesCursive>): FicheFabriquee {
  const reglages = { ...REGLAGES_CURSIVE, ...r };
  return commeLAtelier(htmlEcritureCursive(reglages), STYLE_FEUILLE + STYLE_CURSIVE, "cursive", reglages);
}

// Le CP, le CE1, le CE2.

const niveauDesCubes = (c: ContexteFiche): IdNiveauCubes =>
  c.niveau === "CE1" ? "ce1" : c.niveau === "CE2" ? "ce2" : c.periode <= 1 ? "cp-19" : c.periode === 2 ? "cp-59" : "cp-100";

// Chaque groupement dans sa couleur, comme à l'écran, même si l'atelier a été laissé sur « une seule couleur » (demande de l'enseignant, octobre 2026).
const cubes = (c: ContexteFiche): ReglagesCubes =>
  reglagesCubesSurs({ ...REGLAGES_CUBES, ...reglagesLaisses<ReglagesCubes>("cubes"), niveau: niveauDesCubes(c), memeCouleur: false });

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
function heure(c: ContexteFiche, graine: number): ReglagesHeure {
  const laisses = reglagesLaisses<ReglagesHeure>("heure");
  const precision = c.niveau === "CE1" ? (c.periode <= 2 ? "heures" : "demies") : c.periode <= 2 ? "quarts" : "cinq";
  // Lire l'heure, ou dessiner les aiguilles : l'un ou l'autre, d'une fiche à l'autre, jamais les deux sur la même
  // (demande de l'enseignant, octobre 2026). L'élève seul colorie les aiguilles, la rouge des heures et la bleue des minutes.
  return { ...REGLAGES_HEURE, ...laisses, exercice: "horloges", precision, sens: graine % 2 === 0 ? "lire" : "dessiner", combien: 9, apresMidi: false,
    colorier: true, couleurs: false };
}

/**
 * Les mots qu'on sait déjà lire, au CP : ceux de toutes les étapes vues,
 * jusqu'à celle de la fluence ou à la première de la période ; et, quand
 * c'est trop tôt pour en avoir assez, ceux de toute la période. La première
 * étape du CP n'a que des voyelles : prise seule, elle ne donnait aucun mot,
 * et les mots mêlés sortaient sans mots à chercher (signalé par l'enseignant,
 * octobre 2026).
 */
export function motsDuSon(c: Pick<ContexteFiche, "periode">, graine: number, combien: number): string[] {
  const jusqua = ETAPES.findIndex((e) => e.id === etapeDeLaSequence("CP", c.periode));
  const periode = Math.min(5, Math.max(1, c.periode));
  const finDeLaPeriode = ETAPES.reduce((fin, e, i) => (e.periode === periode ? i : fin), jusqua);
  const lisibles = (fin: number) =>
    [...new Set(ETAPES.slice(0, fin + 1).flatMap((e) => motsDe(e, []).corpus))].filter((m) => /^\p{L}{3,7}$/u.test(m));
  const vus = lisibles(jusqua);
  return piocher(hasard(graine), vus.length >= combien ? vus : lisibles(Math.max(jusqua, finDeLaPeriode)), combien);
}

/** Des mots fréquents de la classe, d'un seul tenant. */
const motsFrequents = (classe: Elementaire, graine: number, combien: number) =>
  piocher(hasard(graine), MOTS_FREQUENTS[classe].filter((m) => /^\p{L}+$/u.test(m) && m.length <= 10), combien);

function motsMeles(c: ContexteFiche, graine: number): FicheFabriquee {
  const lus = c.niveau === "CP" ? motsDuSon(c, graine, 8) : motsFrequents(elementaire(c.niveau), graine, 8);
  // Jamais une grille sans mots à chercher : s'il en manque, des mots fréquents de la classe complètent.
  const mots = lus.length >= 6 ? lus : [...lus, ...motsFrequents(elementaire(c.niveau), graine, 8).filter((m) => !lus.includes(m))].slice(0, 8);
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
      // Sans la règle écrite : il connaît le jeu, la consigne dit ce qu'il fait (demande de l'enseignant, octobre 2026).
      const reglages = { ...REGLAGES_PYRAMIDES, forme: "pyramide" as const, combien: 6, trous: "bas" as const, regle: false, ...r };
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
  { id: "fusee", atelier: "deplacements", nom: "Le chemin de la bille", domaine: "maths", niveaux: C2,
    fabriquer: (c, g) => {
      const reglages = { ...REGLAGES_DEPLACEMENTS, exercice: "fusee" as const, classe: c.niveau === "CP" ? "CP" as const : "CE1" as const, mode: "decoder" as const, combien: 4 };
      return commeLAtelier(htmlDeplacements(reglages, g), STYLE_FEUILLE + STYLE_DEPLACEMENTS, "deplacements", reglages);
    } },
  { id: "heure", atelier: "heure", nom: "Lire l'heure", domaine: "maths", niveaux: ["CE1", "CE2"],
    fabriquer: (c, g) => commeLAtelier(htmlAtelierHeure(heure(c, g), g), STYLE_FEUILLE + STYLE_HEURE + STYLE_DUREES, "heure", heure(c, g)) },
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

/** La recette d'une fiche : l'une de la liste, ou l'un des supports de travail du jour. */
export const recetteDe = (id: string, supports: readonly RecetteDeFiche[] = []) =>
  RECETTES.find((r) => r.id === id) ?? supports.find((r) => r.id === id);

// ── Les supports de travail ────────────────────────────────────────────────
//
// Les photos de la classe que l'enseignant a réglées comme supports — une
// matière, un niveau (voir supportsDeTravail) — se donnent comme des fiches,
// à tout élève de leur niveau (demande de l'enseignant, octobre 2026) : la
// photo en grand, et les règles du jeu qu'elle prend, en étapes. La photo est
// un bloc de consigne : la tablette la montre avec les règles. Il n'y a rien
// à lire pour s'y mettre.

/** Une photo réglée comme support, et le jeu dont elle prend les règles. */
export interface SupportDonne { photo: MonPicto; jeu: string; regles: string }

/** Le domaine d'« En retard » d'une matière : l'ordre des fiches d'un élève le suit. */
const DOMAINE_DU_SUPPORT: Record<string, Domaine> = {
  "Mathématiques": "maths", "Structurer sa pensée": "nombres", "Français": "francais", "Mobiliser le langage": "langage", "Explorer le monde": "temps",
};

/**
 * Une recette par support, pour les niveaux d'« En retard » qu'il vise —
 * tous, ou le sien. `image` donne la photo, en data URL.
 */
export function recettesDesSupports(supports: SupportDonne[], image: (id: number) => Promise<string>): RecetteDeFiche[] {
  return supports.flatMap(({ photo, jeu, regles }): RecetteDeFiche[] => {
    const niveaux = NIVEAUX_FICHES.filter((n) => photo.niveau === TOUS_LES_NIVEAUX || photo.niveau === n);
    if (!niveaux.length || !photo.matiere) return [];
    return [{
      id: `${ATELIER_SUPPORT}:${photo.id}`, atelier: ATELIER_SUPPORT, nom: photo.mot,
      domaine: DOMAINE_DU_SUPPORT[photo.matiere] ?? "francais", niveaux, support: { photo: photo.id, matiere: photo.matiere },
      fabriquer: async () => ({ html: pageDuSupport(photo.mot, await image(photo.id).catch(() => ""), jeu, regles), style: STYLE_FEUILLE + STYLE_SUPPORT }),
    }];
  });
}

/** La page d'un support : son nom, sa photo en grand, et les règles du jeu qu'il prend, s'il en prend. */
export function pageDuSupport(nom: string, image: string, jeu: string, regles: string): string {
  // Un bloc de consigne, autour d'un bloc : la photo part aux tablettes, et rien ne la découpe en étapes.
  const photo = image
    ? `<div class="consigne sp-support"><div class="sp-photo"><img src="${image}" alt="" style="max-width:100%;max-height:70vh;object-fit:contain"></div></div>` : "";
  const lesRegles = regles.trim()
    ? `<div class="regle"><b>Les règles${jeu.trim() ? ` du jeu « ${escapeHtml(jeu.trim())} »` : ""}</b>${escapeHtml(regles.trim()).replace(/\n+/g, "<br>")}</div>` : "";
  return feuille(`<div class="page"><div class="titre">${escapeHtml(nom)}</div>${photo}${lesRegles}</div>`, "sp");
}

export const STYLE_SUPPORT = `
  .feuille.sp .sp-support { border: none !important; background: none !important; padding: 0 !important; margin: 4mm 0; text-align: center; }
  .feuille.sp .sp-photo img { max-height: 150mm !important; border-radius: 3mm; }
`;

// ── Le minuteur de chaque fiche ────────────────────────────────────────────
//
// Chaque sorte de fiche a son temps. « En retard » le donne à la fiche quand
// il la fabrique ; il part ensuite aux tablettes avec sa consigne, depuis le
// créneau qui la cite (voir journalTelephone). Réglages › En retard le change
// pour les fiches à venir ; celles déjà faites gardent le leur.

/** Le temps de base de chaque fiche, en minutes : à peu près ce qu'un élève y passe seul. */
export const MINUTEURS_DE_BASE: Record<string, number> = {
  suite: 15, "coloriage-chiffres": 15, "coloriage-lettres": 15, prenom: 10,
  "cubes-ecrire": 10, "cubes-dessiner": 10, comparer: 10, pyramides: 10, "coloriage-calcul": 20, posees: 15,
  reproduire: 15, fusee: 10, heure: 10, monnaie: 10, mesurer: 10,
  cursive: 10, "mots-meles": 15, comprendre: 15, grammaire: 10, listes: 10, "mots-imposes": 15,
};

/** Où Réglages › En retard garde les temps changés : un réglage partagé avec l'autre ordinateur (préfixe « fabriquer: »). */
export const CLE_MINUTEURS_RETARD = "fabriquer:retard-minuteurs";

/** Le plus long minuteur, en minutes : celui que le portail du téléphone accepte. */
const MINUTEUR_LE_PLUS_LONG = 120;

/** Les temps changés, par fiche ; 0 : sans minuteur. Ce qui n'est ni une fiche ni un temps possible ne compte pas. */
export function lireMinuteursRetard(brut: string | null | undefined): Record<string, number> {
  let o: unknown;
  try { o = JSON.parse(brut || "{}"); } catch { return {}; }
  if (!o || typeof o !== "object" || Array.isArray(o)) return {};
  return Object.fromEntries(Object.entries(o as Record<string, unknown>).filter(([id, m]) =>
    !!recetteDe(id) && typeof m === "number" && Number.isInteger(m) && m >= 0 && m <= MINUTEUR_LE_PLUS_LONG)) as Record<string, number>;
}

/** Le minuteur d'une fiche quand on la fabrique : celui des réglages, sinon son temps de base. */
export const minuteurDeLaRecette = (id: string, regles: Record<string, number>): number =>
  id in regles ? regles[id] : MINUTEURS_DE_BASE[id] ?? 10;

/** Le nom d'une fiche, tous niveaux confondus : « Des additions posées / Des soustractions posées ». */
export function nomDeToutesLesFiches(r: RecetteDeFiche): string {
  if (typeof r.nom === "string") return r.nom;
  return [...new Set(r.niveaux.map((niveau) => nomDeLaRecette(r, { niveau, periode: 1, prenom: "" })))].join(" / ");
}

// ── Le déroulement d'un créneau, sur les tablettes ─────────────────────────
//
// Les fiches d'un créneau se suivent : les tablettes les montrent dans
// l'ordre, chacune dans son cadre, reliées par des flèches — ce qui va se
// passer (voir journalTelephone). Chaque cadre porte le picto de son domaine,
// et lui seul (demande de l'enseignant, octobre 2026) : Réglages ›
// Personnalisation, ou la page CAA.

/**
 * La matière et le domaine de chaque fiche : ceux de la liste des matières et
 * des référentiels de la classe — programmes 2026 au cycle 2, domaines du
 * cycle 1 en maternelle.
 */
export const DOMAINE_DES_FICHES: Record<string, { matiere: string; domaine: string }> = {
  suite: { matiere: "Explorer le monde", domaine: "Se repérer dans le temps et l'espace" },
  "coloriage-chiffres": { matiere: "Structurer sa pensée", domaine: "Acquérir les premiers outils mathématiques" },
  "coloriage-lettres": { matiere: "Mobiliser le langage", domaine: "Mobiliser le langage dans toutes ses dimensions" },
  prenom: { matiere: "Mobiliser le langage", domaine: "Mobiliser le langage dans toutes ses dimensions" },
  "cubes-ecrire": { matiere: "Mathématiques", domaine: "Nombres, calcul et résolution de problèmes" },
  "cubes-dessiner": { matiere: "Mathématiques", domaine: "Nombres, calcul et résolution de problèmes" },
  comparer: { matiere: "Mathématiques", domaine: "Nombres, calcul et résolution de problèmes" },
  pyramides: { matiere: "Mathématiques", domaine: "Nombres, calcul et résolution de problèmes" },
  "coloriage-calcul": { matiere: "Mathématiques", domaine: "Nombres, calcul et résolution de problèmes" },
  posees: { matiere: "Mathématiques", domaine: "Nombres, calcul et résolution de problèmes" },
  reproduire: { matiere: "Mathématiques", domaine: "Espace et géométrie" },
  fusee: { matiere: "Mathématiques", domaine: "Espace et géométrie" },
  heure: { matiere: "Mathématiques", domaine: "Grandeurs et mesures" },
  monnaie: { matiere: "Mathématiques", domaine: "Grandeurs et mesures" },
  mesurer: { matiere: "Mathématiques", domaine: "Grandeurs et mesures" },
  cursive: { matiere: "Français", domaine: "Écriture" },
  "mots-meles": { matiere: "Français", domaine: "Lecture" },
  comprendre: { matiere: "Français", domaine: "Lecture" },
  grammaire: { matiere: "Français", domaine: "Grammaire et orthographe" },
  listes: { matiere: "Français", domaine: "Grammaire et orthographe" },
  "mots-imposes": { matiere: "Français", domaine: "Écriture" },
};

/** La matière d'une fiche, écrite au-dessus de son nom dans le déroulement. */
export const matiereDeLaRecette = (r: RecetteDeFiche): string => DOMAINE_DES_FICHES[r.id]?.matiere ?? "";

/** Le domaine d'une fiche : c'est son picto que le déroulement montre. */
export const domaineDeLaRecette = (r: RecetteDeFiche): string => DOMAINE_DES_FICHES[r.id]?.domaine ?? "";

/**
 * La recette d'une fiche déjà faite, d'après son titre sans l'élève : « Les
 * pyramides de nombres ». Un titre doublé — « Mots mêlés (2) » — la retrouve
 * aussi ; rien pour une fiche qu'aucune recette ne nomme plus.
 */
export function recetteDuTitre(base: string): RecetteDeFiche | undefined {
  const t = base.replace(/\s+\(\d+\)$/, "").trim().toLowerCase();
  return RECETTES.find((r) => r.niveaux.some((niveau) => nomDeLaRecette(r, { niveau, periode: 1, prenom: "" }).toLowerCase() === t));
}

/** La rubrique d'une fiche dans les réglages : la maternelle, puis les mathématiques et le français de l'élémentaire. */
export const rubriqueDeLaRecette = (r: RecetteDeFiche): "Maternelle" | "Mathématiques" | "Français" =>
  r.niveaux.every(enMaternelle) ? "Maternelle" : r.domaine === "maths" ? "Mathématiques" : "Français";

/**
 * Les fabrications que « En retard » sait donner à ce niveau — à tous, sans
 * niveau —, une par atelier, sous leur nom de Fabriquer : ce que la fiche d'un
 * élève peut écarter.
 */
export function fabricationsDesFiches(n: NiveauFiches | null): { atelier: string; nom: string }[] {
  const vus = new Map<string, string>();
  for (const r of RECETTES) {
    if (n && !r.niveaux.includes(n)) continue;
    if (vus.has(r.atelier)) continue;
    const outil = FAMILLES.flatMap((f) => f.outils).find((o) => o.id === r.atelier);
    vus.set(r.atelier, outil?.nom ?? (typeof r.nom === "string" ? r.nom : r.atelier));
  }
  return [...vus].map(([atelier, nom]) => ({ atelier, nom })).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
}

/**
 * Les fiches qu'on peut donner à cet élève, à cette période — sans celles des
 * fabrications que sa fiche écarte (`exclues` : des ateliers, comme le
 * coloriage magique pour qui ne sait pas encore le faire).
 */
export function recettesPour(
  n: NiveauFiches, periode: number, nonVerbal: boolean, exclues: readonly string[] = [], supports: readonly RecetteDeFiche[] = [],
): RecetteDeFiche[] {
  return [...RECETTES, ...supports].filter((r) => r.niveaux.includes(n)
    && !(nonVerbal && r.lecture)
    && !exclues.includes(r.atelier)
    && !(n === "CP" && PERIODES_DU_CP[r.id] && !PERIODES_DU_CP[r.id].includes(periode))
    && (!r.periodes || r.periodes.includes(periode)));
}

/**
 * L'ordre des domaines, d'une fiche à la suivante : en maternelle, les
 * nombres, les lettres en grande section, le temps ; ensuite, le français et
 * les maths tour à tour. Le langage n'a plus de fiche à faire seul : il se
 * travaille en parlant.
 */
export function ordreDesDomaines(n: NiveauFiches): Domaine[] {
  if (n === "PS") return ["temps"];
  if (n === "MS") return ["nombres", "temps"];
  if (n === "GS") return ["nombres", "lettres", "temps"];
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
export function proposer(
  n: NiveauFiches, periode: number, nonVerbal: boolean, combien: number, graine: number, exclues: readonly string[] = [], supports: readonly RecetteDeFiche[] = [],
): FicheProposee[] {
  const alea = hasard(graine);
  const possibles = melanger(alea, recettesPour(n, periode, nonVerbal, exclues, supports));
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
export function uneAutre(
  courante: FicheProposee, choisies: FicheProposee[], n: NiveauFiches, periode: number, nonVerbal: boolean, graine: number, exclues: readonly string[] = [],
  supports: readonly RecetteDeFiche[] = [],
): FicheProposee {
  const possibles = melanger(hasard(graine), recettesPour(n, periode, nonVerbal, exclues, supports));
  const prises = new Set(choisies.map((f) => f.recette));
  const domaine = recetteDe(courante.recette, supports)?.domaine;
  const libres = possibles.filter((r) => !prises.has(r.id));
  const r = libres.find((x) => x.domaine === domaine) ?? libres[0];
  return { recette: r?.id ?? courante.recette, graine: (graine + 104729) % 1_000_000_007 };
}

/** Une fiche de plus : celle du domaine qui vient, parmi celles qu'il n'a pas. */
export function uneDePlus(
  choisies: FicheProposee[], n: NiveauFiches, periode: number, nonVerbal: boolean, graine: number, exclues: readonly string[] = [],
  supports: readonly RecetteDeFiche[] = [],
): FicheProposee | null {
  const possibles = melanger(hasard(graine), recettesPour(n, periode, nonVerbal, exclues, supports));
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
