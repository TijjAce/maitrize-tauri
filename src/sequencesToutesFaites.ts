// ── Les séquences toutes faites de Fabriquer, d'après les déroulements ─────
//
// L'enseignant l'a demandé (octobre 2026) : les déroulements qu'on choisit en
// créant une séquence — les séquences des livrets, ou bâties sur le programme
// et les guides — se prennent aussi tout faits dans Fabriquer, en cartes
// bleues comme la soustraction posée : leurs séances, et toutes les feuilles
// que les ateliers savent en fabriquer, à la classe que leur nom donne quand
// il la donne. Une carte par domaine des mathématiques ; dedans, les
// séquences de chaque classe.
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
import { DEMARCHES_GEOMETRIE } from "./demarchesGeometrie";
import { DEMARCHES_GRANDEURS } from "./demarchesGrandeurs";
import { CLASSE_DES_DEMARCHES, DEMARCHES_NUMERATION } from "./demarchesNumeration";
import { DEMARCHES_OPERATIONS } from "./demarchesOperations";
import { DEMARCHES_PROBLEMES } from "./demarchesProblemes";
import { objectifParId, type Objectif } from "./faitsNumeriques";
import { planDesFeuilles, type ClasseC2, type FeuilleAFabriquer, type PlanDesFeuilles } from "./feuillesDesSequences";
import { DEMARCHES_FRACTIONS_PROLONGEES } from "./fractionsProlongees";
import { REGLAGES_MARTINIERE, STYLE_MARTINIERE, calculsMartiniere, htmlMartiniere, libelleTravaille, type ReglagesMartiniere } from "./martiniere";
import { noteDuMaterielDesCompetences } from "./materielDeClasse";
import { avecLesMotsDesProblemes, estLaSeanceDesMots } from "./motsDesProblemes";
import { poserLeDeroulement } from "./poserLeDeroulement";
import { DEMARCHES_PROBLEMES_PROLONGES } from "./problemesProlonges";
import { programmationProposee } from "./programmation";
import { graineDeLaFeuille } from "./sequenceSoustractionPosee";

export const CLASSES: ClasseC2[] = ["CP", "CE1", "CE2"];

// ── Les domaines ───────────────────────────────────────────────────────────

export type ThemeToutFait = "nombres" | "calcul" | "problemes" | "fractions" | "grandeurs" | "geometrie" | "donnees";

/** L'onglet de Fabriquer de chaque domaine : sa carte est au catalogue (voir catalogueAteliers.ts). */
export const ONGLET_DU_THEME: Record<ThemeToutFait, string> = {
  nombres: "sequencesNombres", calcul: "sequencesCalcul", problemes: "sequencesProblemes", fractions: "sequencesFractions",
  grandeurs: "sequencesGrandeurs", geometrie: "sequencesGeometrie", donnees: "sequencesDonnees",
};

export const themeDeLOnglet = (onglet: string): ThemeToutFait | null =>
  (Object.entries(ONGLET_DU_THEME) as [ThemeToutFait, string][]).find(([, o]) => o === onglet)?.[0] ?? null;

/** Le domaine d'une démarche de mathématiques, d'après le module qui la bâtit ; rien pour les démarches des guides, sans classe. */
export function themeDeLaDemarche(d: Pick<Demarche, "id">): ThemeToutFait | null {
  const dans = (liste: Demarche[]) => liste.some((x) => x.id === d.id);
  if (/fraction/.test(d.id)) return "fractions";
  if (d.id === "numeration-dizaine-cp" || d.id === "comparer-nombres-cp" || dans(DEMARCHES_NUMERATION)) return "nombres";
  if (dans(DEMARCHES_CALCUL) || dans(DEMARCHES_OPERATIONS)) return "calcul";
  if (dans(DEMARCHES_PROBLEMES) || dans(DEMARCHES_PROBLEMES_PROLONGES)) return "problemes";
  if (dans(DEMARCHES_FRACTIONS_PROLONGEES)) return "fractions";
  if (dans(DEMARCHES_GRANDEURS)) return "grandeurs";
  if (dans(DEMARCHES_GEOMETRIE)) return "geometrie";
  if (dans(DEMARCHES_DONNEES)) return "donnees";
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

/** Le nom sans la classe qui le termine : la classe est déjà choisie. */
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

// ── Les séquences d'un domaine ─────────────────────────────────────────────

export interface SequenceToutefaite { demarche: Demarche; classes: ClasseC2[] }

const lesFeuilles = (d: Demarche, classe: ClasseC2) => planDesFeuilles(d.id, { classe, periode: periodeDeLaDemarche(d.id, classe) ?? 3, competence: "" })?.feuilles.length ?? 0;

/**
 * Les séquences toutes faites d'un domaine : les démarches de mathématiques
 * d'une classe connue dont les ateliers fabriquent au moins une feuille, à
 * cette classe ; dans l'ordre de l'année — la période du programme d'abord —,
 * puis dans celui du menu des déroulements.
 */
export function sequencesDuTheme(theme: ThemeToutFait): SequenceToutefaite[] {
  const sortie: SequenceToutefaite[] = [];
  for (const demarche of DEMARCHES) {
    if (demarche.famille !== "Mathématiques" || themeDeLaDemarche(demarche) !== theme) continue;
    const classes = classesDeLaDemarche(demarche).filter((c) => lesFeuilles(demarche, c) > 0);
    if (classes.length) sortie.push({ demarche, classes });
  }
  const periode = (s: SequenceToutefaite) => periodeDeLaDemarche(s.demarche.id, s.classes[0]) ?? 6;
  return sortie.map((s, i) => ({ s, i })).sort((a, b) => periode(a.s) - periode(b.s) || a.i - b.i).map(({ s }) => s);
}

// ── Le calcul mental en tête de séance ─────────────────────────────────────

export const PHASE_LA_MARTINIERE = "Calcul mental — procédé La Martinière";

/** Les séquences dont chaque séance s'ouvre sur le calcul mental : la numération et le calcul, hors séquences de calcul mental des livrets. */
export const ouvreSurLeCalculMental = (d: Pick<Demarche, "id">): boolean => {
  const theme = themeDeLaDemarche(d);
  return (theme === "nombres" || theme === "calcul") && !DEMARCHES_CALCUL.some((x) => x.id === d.id);
};

/** Ce qu'une séquence de calcul travaille : les nombres, l'addition et la soustraction, ou la multiplication et la division. */
type Genre = "nombres" | "additif" | "multiplicatif";
const MULTIPLICATIVES = new Set(["sens-multiplication-cp", "multiplication-ce1", "parite-ce1", "multiplication-posee-ce2", "division-ce2"]);
const genreDe = (d: Pick<Demarche, "id">): Genre => (themeDeLaDemarche(d) === "nombres" ? "nombres" : MULTIPLICATIVES.has(d.id) ? "multiplicatif" : "additif");

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

// ── La séquence et ses feuilles ────────────────────────────────────────────

export interface PlanToutFait {
  demarche: Demarche;
  plan: PlanDesFeuilles;
  /** Chaque séance s'ouvre-t-elle sur le calcul mental ? */
  calculMental: boolean;
}

/**
 * Les séances et les feuilles d'une séquence toute faite, à une classe et une
 * période : celles que la fiche d'une séquence fabrique pour ce déroulement,
 * la séance des mots en tête d'une séquence de problèmes, et le calcul mental
 * en tête de chaque séance de numération et de calcul — sauf si l'on n'en
 * veut pas.
 */
export function planToutFait(d: Demarche, classe: ClasseC2, periode: number, options: { calculMental?: boolean; competence?: string } = {}): PlanToutFait {
  const brut = planDesFeuilles(d.id, { classe, periode, competence: options.competence ?? "" }) ?? { feuilles: [], materiel: [] };
  const { demarche, plan } = avecLesMotsDesProblemes(d, brut);
  const base = { demarche: demarche ?? d, plan: plan ?? brut };
  if (options.calculMental === false || !ouvreSurLeCalculMental(d)) return { ...base, calculMental: false };
  const ouvert = avecLeCalculMental(base.demarche, base.plan, classe, periode);
  return { ...ouvert, calculMental: ouvert.demarche !== base.demarche };
}

// ── La compétence visée ────────────────────────────────────────────────────

interface RefComp { id?: string; texte: string; niveau?: string | null }
interface RefCG { titre: string; competences?: RefComp[] }
interface RefSous { titre: string; competences?: RefComp[]; competencesGenerales?: RefCG[] }
interface RefDom { id: string; titre: string; sousDomaines?: RefSous[] }

/**
 * La compétence du programme qu'une séquence toute faite vise : la première,
 * à sa classe, pour laquelle la fiche d'une séquence propose ce déroulement —
 * à la période choisie d'abord, puis aux autres (au CP, les nombres jusqu'à 59
 * ou jusqu'à 100 suivent la période). Rien si les référentiels actifs n'en ont
 * pas.
 */
export function competenceDeLaDemarche(referentiels: Referentiel[], demarcheId: string, classe: ClasseC2, periode: number): CompetenceSelectionnee | null {
  const demarche = demarcheDe(demarcheId);
  if (!demarche) return null;
  const actifs = referentiels.filter((r) => r.actif).sort((a, b) => Number(/2025|2026/.test(b.nom)) - Number(/2025|2026/.test(a.nom)));
  const candidates: { c: CompetenceSelectionnee; ref: string }[] = [];
  for (const ref of actifs) {
    let donnees: { domaines?: RefDom[] } | null = null;
    try { donnees = JSON.parse(ref.donnees); } catch { continue; }
    for (const dom of donnees?.domaines ?? []) {
      // Une démarche de mathématiques sert une compétence de mathématiques.
      if (demarche.famille === "Mathématiques" && !/math/i.test(dom.titre)) continue;
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
  const matiere = competence?.domaineTitre || "Mathématiques";
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
