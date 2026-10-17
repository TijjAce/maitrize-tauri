// ── Les séquences toutes faites de Fabriquer, d'après les déroulements ─────
//
// L'enseignant l'a demandé (octobre 2026) : les déroulements qu'on choisit en
// créant une séquence — les séquences des livrets, ou bâties sur le programme
// et les guides — se prennent aussi tout faits dans Fabriquer : leurs
// séances, et toutes les feuilles que les ateliers savent en fabriquer, à la
// classe que leur nom donne. Puis, dans un seul onglet, « par famille,
// niveaux, moment de l'année » : les mathématiques, le français et
// l'histoire-géographie du CP au CE2, rangés par discipline et domaine, par
// classe, ou par période — celle du programme ou du livret, sinon celle que
// l'enseignant leur donne. La soustraction posée du CE1 y est aussi.
//
// En numération et en calcul, chaque séance s'ouvre sur le calcul mental, au
// procédé La Martinière (demande de l'enseignant) — sauf les séquences de
// calcul mental des livrets, qui en sont déjà, et la séance des mots des
// problèmes, qui n'est ni l'un ni l'autre.

import { api, anneeScolaireActuelle, couleurPourMatiere, newId, nowIso, type Referentiel, type Sequence } from "./api";
import { STYLE_FEUILLE } from "./cartesImprimables";
import type { CompetenceSelectionnee } from "./components/CompetenceTree";
import { DEMARCHES, demarcheDe, demarchesPour, type Demarche, type PhaseCadre, type SeanceCadre } from "./demarches";
import { DEMARCHES_CALCUL } from "./demarchesCalcul";
import { DEMARCHES_DONNEES } from "./demarchesDonnees";
import { DEMARCHES_ECRITURE } from "./demarchesEcriture";
import { DEMARCHES_FRANCAIS } from "./demarchesFrancais";
import { DEMARCHES_GEOMETRIE } from "./demarchesGeometrie";
import { DEMARCHES_GRANDEURS } from "./demarchesGrandeurs";
import { DEMARCHES_HISTOIRE_GEO } from "./demarchesHistoireGeo";
import { DEMARCHES_LANGUE } from "./demarchesLangue";
import { DEMARCHES_LECTURE } from "./demarchesLecture";
import { CLASSE_DES_DEMARCHES, DEMARCHES_NUMERATION } from "./demarchesNumeration";
import { DEMARCHES_OPERATIONS } from "./demarchesOperations";
import { DEMARCHES_ORAL } from "./demarchesOral";
import { DEMARCHES_ORTHOGRAPHE } from "./demarchesOrthographe";
import { DEMARCHES_PROBLEMES } from "./demarchesProblemes";
import { objectifParId, type Objectif } from "./faitsNumeriques";
import { planDesFeuilles, type ClasseC2, type FeuilleAFabriquer, type PlanDesFeuilles } from "./feuillesDesSequences";
import { DEMARCHES_FRACTIONS_PROLONGEES } from "./fractionsProlongees";
import { REGLAGES_MARTINIERE, STYLE_MARTINIERE, calculsMartiniere, htmlMartiniere, libelleTravaille, type ReglagesMartiniere } from "./martiniere";
import { noteDuMaterielDesCompetences } from "./materielDeClasse";
import { avecLesMotsDesProblemes, estLaSeanceDesMots } from "./motsDesProblemes";
import type { ElemSalle } from "./planDeLaClasse";
import { poserLeDeroulement } from "./poserLeDeroulement";
import { DEMARCHES_PROBLEMES_PROLONGES } from "./problemesProlonges";
import { programmationProposee } from "./programmation";
import {
  DEMARCHE_SOUSTRACTION_POSEE, FEUILLES_SOUSTRACTION_POSEE, MATERIEL_SOUSTRACTION_POSEE, competenceDeLaSoustraction, graineDeLaFeuille,
} from "./sequenceSoustractionPosee";

export const CLASSES: ClasseC2[] = ["CP", "CE1", "CE2"];

// ── Les familles : les disciplines et leurs domaines ───────────────────────

export type Discipline = "Mathématiques" | "Français" | "Histoire-géographie";

export const DISCIPLINES: { nom: Discipline; icone: string; court: string }[] = [
  { nom: "Mathématiques", icone: "🔢", court: "Maths" },
  { nom: "Français", icone: "📖", court: "Français" },
  { nom: "Histoire-géographie", icone: "🌍", court: "Histoire-géo" },
];

export interface Domaine { id: string; discipline: Discipline; nom: string }

export const DOMAINES: Domaine[] = [
  { id: "nombres", discipline: "Mathématiques", nom: "Les nombres" },
  { id: "calcul", discipline: "Mathématiques", nom: "Le calcul" },
  { id: "problemes", discipline: "Mathématiques", nom: "Les problèmes" },
  { id: "fractions", discipline: "Mathématiques", nom: "Les fractions" },
  { id: "grandeurs", discipline: "Mathématiques", nom: "Grandeurs et mesures" },
  { id: "geometrie", discipline: "Mathématiques", nom: "Espace et géométrie" },
  { id: "donnees", discipline: "Mathématiques", nom: "Données" },
  { id: "code", discipline: "Français", nom: "Lire : le code et la fluence" },
  { id: "comprendre", discipline: "Français", nom: "Comprendre des textes" },
  { id: "geste", discipline: "Français", nom: "Écrire : le geste et la copie" },
  { id: "ecrire", discipline: "Français", nom: "Écrire des textes" },
  { id: "orthographe", discipline: "Français", nom: "Orthographe et dictées" },
  { id: "langue", discipline: "Français", nom: "Grammaire et conjugaison" },
  { id: "vocabulaire", discipline: "Français", nom: "Le vocabulaire" },
  { id: "oral", discipline: "Français", nom: "L'oral" },
  { id: "temps", discipline: "Histoire-géographie", nom: "Se situer dans le temps : l'histoire" },
  { id: "espace", discipline: "Histoire-géographie", nom: "Se situer dans l'espace : la géographie" },
];

const domaine = (id: string) => DOMAINES.find((d) => d.id === id)!;

/** Les séquences d'histoire, parmi celles d'histoire-géographie ; les autres sont de géographie. */
const HISTOIRE = new Set([
  "temps-naturel-cp", "temps-represente-cp", "situer-evenements-cp", "petite-sirene-cp", "passe-proche-lointain-ce1", "grandes-periodes-ce1",
  "traces-passe-ce1", "prehistoire-ce2", "rome-gaule-ce2", "royaume-france-ce2",
]);

/** Le domaine d'une démarche, d'après le module qui la bâtit ; rien pour les démarches des guides, qui valent pour toutes les classes. */
export function domaineDeLaDemarche(d: Pick<Demarche, "id" | "famille">): Domaine | null {
  const dans = (liste: Demarche[]) => liste.some((x) => x.id === d.id);
  if (d.famille === "Mathématiques") {
    if (d.id === DEMARCHE_SOUSTRACTION_POSEE.id) return domaine("calcul");
    if (/fraction/.test(d.id)) return domaine("fractions");
    if (d.id === "numeration-dizaine-cp" || d.id === "comparer-nombres-cp" || dans(DEMARCHES_NUMERATION)) return domaine("nombres");
    if (dans(DEMARCHES_CALCUL) || dans(DEMARCHES_OPERATIONS)) return domaine("calcul");
    if (dans(DEMARCHES_PROBLEMES) || dans(DEMARCHES_PROBLEMES_PROLONGES)) return domaine("problemes");
    if (dans(DEMARCHES_FRACTIONS_PROLONGEES)) return domaine("fractions");
    if (dans(DEMARCHES_GRANDEURS)) return domaine("grandeurs");
    if (dans(DEMARCHES_GEOMETRIE)) return domaine("geometrie");
    if (dans(DEMARCHES_DONNEES)) return domaine("donnees");
    return null;
  }
  if (dans(DEMARCHES_FRANCAIS)) return domaine(/^vocabulaire-/.test(d.id) ? "vocabulaire" : /cursive|copie/.test(d.id) ? "geste" : "code");
  if (dans(DEMARCHES_LECTURE)) return domaine("comprendre");
  if (dans(DEMARCHES_ORTHOGRAPHE)) return domaine("orthographe");
  if (dans(DEMARCHES_ECRITURE)) return domaine("ecrire");
  if (dans(DEMARCHES_LANGUE)) return domaine("langue");
  if (dans(DEMARCHES_ORAL)) return domaine("oral");
  if (dans(DEMARCHES_HISTOIRE_GEO)) return domaine(HISTOIRE.has(d.id) ? "temps" : "espace");
  return null;
}

// ── La classe ──────────────────────────────────────────────────────────────

/**
 * Les classes d'une démarche : celle que la numération lui donne, sinon celles
 * que son nom dit — « (CE1) », « (CE1-CE2) », « (CP, CE1, CE2) » —, sinon
 * celle de son identifiant ; aucune pour une démarche des guides, qui vaut
 * pour toutes.
 */
export function classesDeLaDemarche(d: Pick<Demarche, "id" | "nom">): ClasseC2[] {
  const fixee = CLASSE_DES_DEMARCHES[d.id];
  if (fixee) return [fixee];
  const parentheses = d.nom.match(/\(([^()]*)\)\s*$/)?.[1] ?? "";
  const intervalle = parentheses.replace(/\s/g, "").match(/^(CP|CE1|CE2)-(CP|CE1|CE2)$/);
  if (intervalle) return CLASSES.slice(CLASSES.indexOf(intervalle[1] as ClasseC2), CLASSES.indexOf(intervalle[2] as ClasseC2) + 1);
  const nommees = CLASSES.filter((c) => new RegExp(`\\b${c}\\b`).test(parentheses));
  if (nommees.length) return nommees;
  const suffixe = d.id.match(/-(cp|ce1|ce2)(?:-|$)/)?.[1];
  return suffixe ? [suffixe.toUpperCase() as ClasseC2] : [];
}

/** Le nom sans la classe qui le termine : la classe est déjà dite. */
export const nomSansClasse = (nom: string) => nom.replace(/\s*\((?:CP|CE1|CE2)(?:\s*[-,]\s*(?:CP|CE1|CE2))*\)\s*$/, "");

/** La classe des élèves, quand c'est l'une de celles-là : la plus nombreuse — la première à égalité — ; rien sinon. */
export function classeDesEleves(eleves: { niveau?: string | null }[], possibles: ClasseC2[]): ClasseC2 | null {
  const compte = new Map<ClasseC2, number>();
  for (const e of eleves) {
    const n = (e.niveau ?? "").trim().toUpperCase() as ClasseC2;
    if (possibles.includes(n)) compte.set(n, (compte.get(n) ?? 0) + 1);
  }
  let meilleure: ClasseC2 | null = null;
  for (const c of possibles) if ((compte.get(c) ?? 0) > (meilleure ? compte.get(meilleure) ?? 0 : 0)) meilleure = c;
  return meilleure;
}

/** La période que le programme ou le livret fixe pour la démarche, à cette classe ; rien quand ils n'en disent pas. */
export const periodeDeLaDemarche = (demarcheId: string, classe: ClasseC2, competence = ""): number | null =>
  programmationProposee({ niveau: classe, competenceTitre: competence }, demarcheId)?.periode ?? null;

// ── Les séquences ──────────────────────────────────────────────────────────

/** Une séquence toute faite : une démarche, à une classe. */
export interface SequenceToutefaite { cle: string; demarche: Demarche; classe: ClasseC2; domaine: Domaine }

/** Les séquences toutes faites qui ne sont pas un déroulement de la fiche d'une séquence : leurs séances et leurs feuilles sont à elles. */
interface Propre { demarche: Demarche; classe: ClasseC2; plan: () => PlanDesFeuilles; competence: (refs: Referentiel[]) => CompetenceSelectionnee | null }
const PROPRES: Propre[] = [{
  demarche: DEMARCHE_SOUSTRACTION_POSEE, classe: "CE1", competence: competenceDeLaSoustraction,
  plan: () => ({ feuilles: FEUILLES_SOUSTRACTION_POSEE, materiel: MATERIEL_SOUSTRACTION_POSEE }),
}];
const propreDe = (id: string) => PROPRES.find((p) => p.demarche.id === id);

const lesFeuilles = (d: Demarche, classe: ClasseC2) => planDesFeuilles(d.id, { classe, periode: periodeDeLaDemarche(d.id, classe) ?? 3, competence: "" })?.feuilles.length ?? 0;

let toutes: SequenceToutefaite[] | null = null;

/**
 * Toutes les séquences toutes faites : chaque démarche de mathématiques, de
 * français ou d'histoire-géographie d'une classe connue, à chacune de ses
 * classes où les ateliers fabriquent au moins une feuille ; puis celles qui
 * sont à elles. Dans l'ordre des domaines, des classes, puis du menu des
 * déroulements.
 */
export function sequencesToutesFaites(): SequenceToutefaite[] {
  if (toutes) return toutes;
  const sortie: SequenceToutefaite[] = [];
  const ajouter = (demarche: Demarche, classe: ClasseC2) => {
    const d = domaineDeLaDemarche(demarche);
    if (d) sortie.push({ cle: `${demarche.id}:${classe}`, demarche, classe, domaine: d });
  };
  for (const demarche of DEMARCHES) {
    if (!domaineDeLaDemarche(demarche)) continue;
    for (const c of classesDeLaDemarche(demarche)) if (lesFeuilles(demarche, c) > 0) ajouter(demarche, c);
  }
  for (const p of PROPRES) ajouter(p.demarche, p.classe);
  const rang = new Map(sortie.map((s, i) => [s.cle, i]));
  toutes = sortie.sort((a, b) => DOMAINES.indexOf(a.domaine) - DOMAINES.indexOf(b.domaine)
    || CLASSES.indexOf(a.classe) - CLASSES.indexOf(b.classe) || rang.get(a.cle)! - rang.get(b.cle)!);
  return toutes;
}

// ── Ranger : par famille, par niveau, par moment de l'année ───────────────

export type Rangement = "famille" | "niveau" | "moment";

export interface GroupeDeSequences { titre: string; sequences: SequenceToutefaite[] }
export interface SectionDeSequences { cle: string; icone: string; titre: string; aide: string; nombre: number; groupes: GroupeDeSequences[] }

export const PERIODES_DE_L_ANNEE: { periode: number; aide: string }[] = [
  { periode: 1, aide: "De la rentrée à la Toussaint" },
  { periode: 2, aide: "De la Toussaint à Noël" },
  { periode: 3, aide: "De Noël aux vacances d'hiver" },
  { periode: 4, aide: "Des vacances d'hiver à celles de printemps" },
  { periode: 5, aide: "Des vacances de printemps à l'été" },
];

const minuscule = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/**
 * Les séquences rangées : par famille — une section par discipline, un
 * groupe par domaine —, par niveau — une section par classe —, ou par moment
 * de l'année — une section par période, et celles dont la période n'est pas
 * fixée. Dans chaque groupe, par classe, puis par période.
 */
export function rangerLesSequences(liste: SequenceToutefaite[], rangement: Rangement, periodeDe: (s: SequenceToutefaite) => number | null): SectionDeSequences[] {
  const rang = new Map(liste.map((s, i) => [s, i]));
  const ordre = (a: SequenceToutefaite, b: SequenceToutefaite) => CLASSES.indexOf(a.classe) - CLASSES.indexOf(b.classe)
    || (periodeDe(a) ?? 6) - (periodeDe(b) ?? 6) || rang.get(a)! - rang.get(b)!;
  const parDomaine = (ss: SequenceToutefaite[], avecLaDiscipline: boolean): GroupeDeSequences[] => DOMAINES
    .map((d) => ({ titre: avecLaDiscipline ? `${d.discipline} — ${minuscule(d.nom)}` : d.nom, sequences: ss.filter((s) => s.domaine === d).sort(ordre) }))
    .filter((g) => g.sequences.length > 0);
  const section = (cle: string, icone: string, titre: string, aide: string, ss: SequenceToutefaite[], avecLaDiscipline = true): SectionDeSequences =>
    ({ cle, icone, titre, aide, nombre: ss.length, groupes: parDomaine(ss, avecLaDiscipline) });
  const sections = rangement === "famille"
    ? DISCIPLINES.map((d) => section(`famille:${d.nom}`, d.icone, d.nom,
      DOMAINES.filter((x) => x.discipline === d.nom).map((x, i) => (i ? minuscule(x.nom) : x.nom)).join(", "),
      liste.filter((s) => s.domaine.discipline === d.nom), false))
    : rangement === "niveau"
      ? CLASSES.map((c) => section(`niveau:${c}`, "🎒", c, "", liste.filter((s) => s.classe === c)))
      : [
        ...PERIODES_DE_L_ANNEE.map(({ periode, aide }) => section(`moment:${periode}`, "🗓", `Période ${periode}`, aide, liste.filter((s) => periodeDe(s) === periode))),
        section("moment:sans", "🗓", "Sans période fixée", "Le programme n'en fixe pas : choisissez-la dans la séquence", liste.filter((s) => periodeDe(s) === null)),
      ];
  return sections.filter((s) => s.nombre > 0);
}

// ── Le calcul mental en tête de séance ─────────────────────────────────────

export const PHASE_LA_MARTINIERE = "Calcul mental — procédé La Martinière";

/** Les séquences dont chaque séance s'ouvre sur le calcul mental : la numération et le calcul, hors séquences de calcul mental des livrets. */
export const ouvreSurLeCalculMental = (d: Pick<Demarche, "id" | "famille">): boolean => {
  const id = domaineDeLaDemarche(d)?.id;
  return (id === "nombres" || id === "calcul") && !DEMARCHES_CALCUL.some((x) => x.id === d.id);
};

/** Ce qu'une séquence de calcul travaille : les nombres, l'addition et la soustraction, ou la multiplication et la division. */
type Genre = "nombres" | "additif" | "multiplicatif";
const MULTIPLICATIVES = new Set(["sens-multiplication-cp", "multiplication-ce1", "parite-ce1", "multiplication-posee-ce2", "division-ce2"]);
const genreDe = (d: Pick<Demarche, "id" | "famille">): Genre =>
  (domaineDeLaDemarche(d)?.id === "nombres" ? "nombres" : MULTIPLICATIVES.has(d.id) ? "multiplicatif" : "additif");

const TOUTES_LES_TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * Le calcul mental qui ouvre les séances, un objectif par séance, à tour de
 * rôle : les objectifs de l'atelier « Calcul mental » de la classe, qui
 * entretiennent ce que la séquence demande. Au CP, les sommes jusqu'à dix
 * pendant les deux premières périodes, que le programme y réintroduit, et
 * des nombres qui ne dépassent pas ceux de la période ; au CE1, les tables de
 * multiplication déjà apprises — celle de 7 en période 3, de 8 en période 4.
 */
export function calculMentalDOuverture(classe: ClasseC2, periode: number, genre: Genre): { objectifs: string[]; tables: number[] } {
  if (classe === "CP") {
    if (periode <= 2) return { objectifs: periode <= 1 ? ["cp-sommes-10", "cp-complements-10"] : ["cp-sommes-10", "cp-complements-10", "cp-doubles"], tables: [] };
    return {
      objectifs: genre === "nombres" ? ["cp-dix", "cp-un-ou-deux", "cp-complements-10", "cp-dizaines", "cp-dizaine-superieure"]
        : genre === "multiplicatif" ? ["cp-doubles", "cp-moities", "cp-doubles-dizaines", "cp-moities-dizaines"]
          : ["cp-tables-addition", "cp-complements-10", "cp-doubles", "cp-ajouter-unites", "cp-dizaine-superieure"],
      tables: [],
    };
  }
  if (classe === "CE1") {
    const apprises = periode <= 2 ? [2, 3, 4, 5, 6, 10] : periode === 3 ? [2, 3, 4, 5, 6, 7, 10] : periode === 4 ? [2, 3, 4, 5, 6, 7, 8, 10] : TOUTES_LES_TABLES;
    return {
      objectifs: genre === "nombres" ? ["ce1-dizaines-centaines", "ce1-tables-addition", "ce1-fois-10", "ce1-doubles", "ce1-moities"]
        : genre === "multiplicatif" ? [...(periode >= 3 ? ["ce1-table-multiplication"] : []), "ce1-doubles", "ce1-moities", "ce1-multiples-25", "ce1-fois-10"]
          : ["ce1-tables-addition", "ce1-soustraire-unites", "ce1-dizaines-centaines", "ce1-doubles", "ce1-moities"],
      tables: apprises,
    };
  }
  return {
    objectifs: genre === "nombres" ? ["ce2-fois-10-100", "ce2-tables-addition", "ce2-doubles", "ce2-moities", "ce2-multiples-25"]
      : genre === "multiplicatif" ? ["ce2-table-multiplication", "ce2-fois-dizaines", "ce2-fois-4-8", "ce2-produits-60", "ce2-fois-10-100"]
        : ["ce2-tables-addition", "ce2-ajouter-8-9", "ce2-soustraire-9", "ce2-doubles", "ce2-moities"],
    tables: TOUTES_LES_TABLES,
  };
}

const sansPoint = (s: string) => s.replace(/[.\s]+$/, "");

/** La phase qui ouvre la séance : comme dans la séquence de la soustraction posée. */
const phaseDuCalculMental = (o: Objectif, tables: number[]): PhaseCadre => ({
  phase: PHASE_LA_MARTINIERE, duree: "10 min",
  description: `${sansPoint(libelleTravaille(o, tables))}. L'enseignant dit le calcul ; chacun écrit le résultat sur son ardoise et la lève au signal.`,
  posture: "En début de séance de numération et de calcul, chaque jour.",
});

/** La fiche du maître, et les ardoises papier : celle de l'atelier « Calcul mental ». */
function feuilleDuCalculMental(seance: number, o: Objectif, classe: ClasseC2, tables: number[]): FeuilleAFabriquer {
  const r: ReglagesMartiniere = { ...REGLAGES_MARTINIERE, niveau: classe, objectifs: [o.id], revision: false, tables, forme: "oral", ardoises: true };
  return {
    seance, atelier: "martiniere", titre: `Calcul mental — ${libelleTravaille(o, tables)}`,
    fabriquer: (graine) => ({ html: htmlMartiniere(calculsMartiniere(r, graine), r), style: STYLE_FEUILLE + STYLE_MARTINIERE, refaire: { martiniere: r } }),
  };
}

const CONSIGNE_DU_CALCUL_MENTAL = "Calcul mental : j'écoute le calcul, j'écris le résultat sur mon ardoise, je la lève au signal.";
const ARDOISES = "Les ardoises, pour le calcul mental du début de séance.";

/**
 * Chaque séance ouverte sur le calcul mental : la phase, dix minutes de plus,
 * la consigne pour les tablettes quand la séance en a, les ardoises dans le
 * matériel, et la fiche du maître en tête de ses feuilles. La séance des mots
 * des problèmes reste telle quelle.
 */
export function avecLeCalculMental(d: Demarche, plan: PlanDesFeuilles, classe: ClasseC2, periode: number): { demarche: Demarche; plan: PlanDesFeuilles } {
  const { objectifs, tables } = calculMentalDOuverture(classe, periode, genreDe(d));
  const connus = objectifs.map(objectifParId).filter((o): o is Objectif => !!o && o.niveau === classe);
  if (!connus.length) return { demarche: d, plan };
  const ouvertes = d.seances.map((s) => !estLaSeanceDesMots(s));
  let rang = 0;
  const objectifDe = ouvertes.map((ouverte) => (ouverte ? connus[rang++ % connus.length] : null));
  const seances: SeanceCadre[] = d.seances.map((s, i) => {
    const o = objectifDe[i];
    return o ? {
      ...s, duree: s.duree + 10, phases: [phaseDuCalculMental(o, tables), ...s.phases],
      ...(s.consignes?.length ? { consignes: [CONSIGNE_DU_CALCUL_MENTAL, ...s.consignes] } : {}),
    } : s;
  });
  const fiches = objectifDe.flatMap((o, i) => (o ? [feuilleDuCalculMental(i, o, classe, tables)] : []));
  return {
    demarche: { ...d, seances },
    plan: {
      ...plan,
      feuilles: [...fiches, ...plan.feuilles],
      materiel: d.seances.map((_, i) => [plan.materiel[i] ?? "", objectifDe[i] ? ARDOISES : ""].filter(Boolean).join("\n")),
    },
  };
}

/** Une séquence qui s'ouvre déjà sur le calcul mental, chaque séance — la soustraction posée. */
const ouverteSurLeCalculMental = (d: Demarche) => {
  const seances = d.seances.filter((s) => !estLaSeanceDesMots(s));
  return seances.length > 0 && seances.every((s) => s.phases[0]?.phase === PHASE_LA_MARTINIERE);
};

/** La même, sans le calcul mental : ni sa phase, ni ses minutes, ni sa fiche. */
function sansLeCalculMental(d: Demarche, plan: PlanDesFeuilles): { demarche: Demarche; plan: PlanDesFeuilles } {
  const ouvertes = d.seances.map((s) => s.phases[0]?.phase === PHASE_LA_MARTINIERE);
  return {
    demarche: {
      ...d,
      seances: d.seances.map((s, i) => (ouvertes[i] ? {
        ...s, duree: Math.max(5, s.duree - (parseInt(s.phases[0].duree, 10) || 0)), phases: s.phases.slice(1),
        ...(s.consignes ? { consignes: s.consignes.filter((c) => c !== CONSIGNE_DU_CALCUL_MENTAL) } : {}),
      } : s)),
    },
    plan: { ...plan, feuilles: plan.feuilles.filter((f) => !(f.atelier === "martiniere" && ouvertes[f.seance])) },
  };
}

// ── La séquence et ses feuilles ────────────────────────────────────────────

export interface PlanToutFait {
  demarche: Demarche;
  plan: PlanDesFeuilles;
  /** Chaque séance s'ouvre-t-elle sur le calcul mental ? */
  calculMental: boolean;
}

/** Ce que la classe dit d'elle-même, pour les feuilles qui en ont besoin : le plan de la classe de la géographie, les étiquettes des maquettes. */
export interface ContexteDeLaClasse { salle?: { elements: ElemSalle[]; agencement: string }; prenoms?: string[] }

/**
 * Les séances et les feuilles d'une séquence toute faite, à une classe et une
 * période : celles que la fiche d'une séquence fabrique pour ce déroulement,
 * la séance des mots en tête d'une séquence de problèmes, et le calcul mental
 * en tête de chaque séance de numération et de calcul — sauf si l'on n'en
 * veut pas.
 */
export function planToutFait(
  d: Demarche, classe: ClasseC2, periode: number, options: { calculMental?: boolean; competence?: string } & ContexteDeLaClasse = {},
): PlanToutFait {
  const propre = propreDe(d.id);
  let base: { demarche: Demarche; plan: PlanDesFeuilles };
  if (propre) {
    base = { demarche: d, plan: propre.plan() };
  } else {
    const brut = planDesFeuilles(d.id, { classe, periode, competence: options.competence ?? "", salle: options.salle, prenoms: options.prenoms })
      ?? { feuilles: [], materiel: [] };
    const { demarche, plan } = avecLesMotsDesProblemes(d, brut);
    base = { demarche: demarche ?? d, plan: plan ?? brut };
  }
  if (ouverteSurLeCalculMental(base.demarche)) {
    return options.calculMental === false ? { ...sansLeCalculMental(base.demarche, base.plan), calculMental: false } : { ...base, calculMental: true };
  }
  if (options.calculMental === false || !ouvreSurLeCalculMental(d)) return { ...base, calculMental: false };
  const ouvert = avecLeCalculMental(base.demarche, base.plan, classe, periode);
  return { ...ouvert, calculMental: ouvert.demarche !== base.demarche };
}

// ── La compétence visée ────────────────────────────────────────────────────

interface RefComp { id?: string; texte: string; niveau?: string | null }
interface RefCG { titre: string; competences?: RefComp[] }
interface RefSous { titre: string; competences?: RefComp[]; competencesGenerales?: RefCG[] }
interface RefDom { id: string; titre: string; sousDomaines?: RefSous[] }

/** Les domaines du programme où chercher la compétence d'une discipline. */
const DOMAINE_DU_PROGRAMME: Record<Discipline, RegExp> = {
  "Mathématiques": /math/i, "Français": /fran/i, "Histoire-géographie": /histoire|g[ée]ographie|questionner/i,
};

/**
 * La compétence du programme qu'une séquence toute faite vise : la première,
 * à sa classe, pour laquelle la fiche d'une séquence propose ce déroulement —
 * à la période choisie d'abord, puis aux autres (au CP, les nombres jusqu'à 59
 * ou jusqu'à 100 suivent la période). Rien si aucune ne le propose.
 */
export function competenceDeLaDemarche(referentiels: Referentiel[], demarcheId: string, classe: ClasseC2, periode: number): CompetenceSelectionnee | null {
  const propre = propreDe(demarcheId);
  if (propre) return propre.competence(referentiels);
  const demarche = demarcheDe(demarcheId);
  if (!demarche) return null;
  const discipline = domaineDeLaDemarche(demarche)?.discipline;
  const actifs = referentiels.filter((r) => r.actif).sort((a, b) => Number(/2025|2026/.test(b.nom)) - Number(/2025|2026/.test(a.nom)));
  const candidates: { c: CompetenceSelectionnee; ref: string }[] = [];
  for (const ref of actifs) {
    let donnees: { domaines?: RefDom[] } | null = null;
    try { donnees = JSON.parse(ref.donnees); } catch { continue; }
    for (const dom of donnees?.domaines ?? []) {
      // Une démarche de mathématiques sert une compétence de mathématiques.
      if (discipline && !DOMAINE_DU_PROGRAMME[discipline].test(dom.titre)) continue;
      for (const sd of dom.sousDomaines ?? []) {
        const groupes = [{ cg: null as RefCG | null, comps: sd.competences ?? [] }, ...(sd.competencesGenerales ?? []).map((cg) => ({ cg, comps: cg.competences ?? [] }))];
        for (const { cg, comps } of groupes) for (const c of comps) {
          if (c.niveau && c.niveau !== classe) continue;
          candidates.push({
            ref: ref.nom,
            c: {
              id: newId(), referentielNom: ref.nom, domaineId: dom.id, domaineTitre: dom.titre, sousDomaineTitre: sd.titre,
              competenceGeneraleTitre: cg?.titre ?? null, competenceTitre: c.texte, niveau: c.niveau ?? null, competenceRefId: c.id ?? null,
            },
          });
        }
      }
    }
  }
  for (const p of [periode, 1, 2, 3, 4, 5].filter((x, i, t) => t.indexOf(x) === i)) {
    const trouvee = candidates.find(({ c, ref }) => demarchesPour(c, ref, p).some((x) => x.id === demarcheId));
    if (trouvee) return trouvee.c;
  }
  return null;
}

// ── La création ────────────────────────────────────────────────────────────

/**
 * Crée la séquence : la fiche, à sa classe et sa période, puis ses séances,
 * ses feuilles — du même tirage que l'aperçu —, les mots des problèmes et les
 * aides à la tâche, comme la fiche d'une séquence quand on suit ce
 * déroulement (voir poserLeDeroulement.ts).
 */
export async function creerLaSequenceToutefaite(choix: {
  tout: PlanToutFait; classe: ClasseC2; periode: number; titre: string; competence: CompetenceSelectionnee | null; graine: number;
  aides: { sequentiel: boolean; parole: number };
  onProgres?: (texte: string) => void; onEchec?: (titre: string, erreur: unknown) => void;
}): Promise<{ sequence: Sequence; seances: number; feuilles: number; aides: number }> {
  const { tout: { demarche, plan }, competence } = choix;
  const matiere = competence?.domaineTitre || domaineDeLaDemarche(demarche)?.discipline || "Mathématiques";
  const sequence: Sequence = {
    id: newId(), titre: choix.titre.trim() || demarche.nom, matiere, cycle: "Cycle 2",
    objectifs: demarche.resume, competences: JSON.stringify(competence ? [competence] : []), competenceVisee: competence ? JSON.stringify(competence) : "",
    imageNom: null, couleur: couleurPourMatiere(matiere), dateCreation: nowIso(), periode: choix.periode, annee: anneeScolaireActuelle(), niveau: choix.classe,
    ratingEngagement: 0, ratingFacilite: 0, ratingApprentissage: 0, ratingDateMaj: null, projetId: null, video: "",
    dossier: "", nbSeancesPrevu: demarche.seances.length, etat: "", dateMaj: "",
  };
  await api.sequenceSave(sequence);
  // Le matériel de la classe que la compétence appelle : chaque séance le rappelle, après le sien.
  const noteReelle = competence ? await noteDuMaterielDesCompetences([competence], (cle) => api.settingGet(cle)) : "";
  const pose = await poserLeDeroulement({
    sequence, demarche, plan, feuilles: plan.feuilles, competence, depuis: 1, noteReelle, aides: choix.aides,
    graine: (rang) => graineDeLaFeuille(choix.graine, rang), onProgres: choix.onProgres, onEchec: choix.onEchec,
  });
  return { sequence, seances: pose.seances.length, feuilles: pose.feuilles, aides: pose.aides };
}

// ── Les périodes que l'enseignant choisit ──────────────────────────────────

/** Le réglage qui garde la période choisie pour chaque séquence : il suit d'un ordinateur à l'autre. */
export const CLE_PERIODES = "sequencesToutesFaites:periodes";

/** Les périodes enregistrées, telles qu'on peut s'y fier : de 1 à 5, par séquence. */
export function lirePeriodes(brut: string | null | undefined): Record<string, number> {
  if (!brut) return {};
  let lu: unknown;
  try { lu = JSON.parse(brut); } catch { return {}; }
  if (!lu || typeof lu !== "object" || Array.isArray(lu)) return {};
  const sortie: Record<string, number> = {};
  for (const [cle, p] of Object.entries(lu as Record<string, unknown>)) if (typeof p === "number" && Number.isInteger(p) && p >= 1 && p <= 5) sortie[cle] = p;
  return sortie;
}
