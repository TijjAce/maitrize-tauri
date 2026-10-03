// ── Programmer en IME : par élève, pas par matière ────────────────────────
//
// Une programmation de classe se lit en colonnes : un domaine, cinq périodes,
// et tout le monde suit. En IME, il n'y a pas de « tout le monde » — chaque
// élève a ses objectifs, tirés de son projet, et l'on en vise une dizaine sur
// l'année. Programmer, c'est décider ce qu'on travaille avec qui, et quand.
//
// Les groupes évitent la copie : « demander de l'aide » se travaille avec
// quatre élèves, on l'écrit une fois. Un objectif vise donc des élèves, des
// groupes, ou les deux — et l'on sait toujours, pour un élève donné, ce qui
// le concerne.

import { newId } from "./api";

/** Ce qu'on vise pour un élève ou un groupe, sur une ou plusieurs périodes. */
/**
 * De quoi retrouver une compétence cochée dans l'arbre des référentiels.
 *
 * L'intitulé seul ne suffit pas : deux référentiels peuvent employer les
 * mêmes mots, et c'est le trio qui identifie la ligne.
 */
export interface SourceCompetence {
  referentielNom: string;
  sousDomaineTitre: string;
  competenceRefId: string;
}

export interface Objectif {
  id: string;
  /** L'intitulé, libre ou recopié d'un référentiel. */
  competence: string;
  /** D'où il vient : « BO · Cycle 1 › Langage », un PPI, une évaluation… */
  origine: string;
  /** « eleve:<id> » et « groupe:<id> ». */
  pour: string[];
  /** Périodes travaillées, 1 à 5. */
  periodes: number[];
  /** Périodes où l'objectif a été atteint. */
  atteintes: number[];
  /**
   * Les créneaux de la semaine type où on le travaille.
   *
   * En IME, un créneau est déjà un groupe : « Lecture Compréhension, lundi
   * 14 h 10 » désigne deux élèves et une matière. Programmer par créneau dit
   * donc d'un coup qui travaille quoi, et quand dans la semaine.
   */
  creneaux: string[];
  /** Renseignée quand la compétence vient d'un référentiel. */
  source?: SourceCompetence;
  /** Les séquences citées au cahier journal qui l'ont fait travailler. */
  sequences?: string[];
  notes: string;
}

/** Des élèves qui partagent des objectifs : on les écrit une fois. */
export interface Groupe {
  id: string;
  nom: string;
  eleveIds: string[];
}

export interface ProgrammationIme {
  groupes: Groupe[];
  objectifs: Objectif[];
  /**
   * Ce que le cahier journal a déjà apporté, « <créneau>|<compétence> » : une
   * citation n'est reprise qu'une fois — un objectif qu'on retire ne revient
   * pas tant qu'une autre séance ne le fait pas travailler.
   */
  journal?: string[];
}

/** Ce qu'on vise par élève sur l'année : assez pour tenir, assez peu pour suivre. */
export const CIBLE_MIN = 10;
export const CIBLE_MAX = 15;

export const PERIODES = [1, 2, 3, 4, 5] as const;

export const vide = (): ProgrammationIme => ({ groupes: [], objectifs: [] });

/** Relit la programmation enregistrée ; une valeur abîmée n'en perd pas le reste. */
export function lire(json: string): ProgrammationIme {
  let brut: unknown;
  try { brut = JSON.parse(json || "{}"); } catch { return vide(); }
  if (!brut || typeof brut !== "object") return vide();
  const o = brut as Record<string, unknown>;
  const chaine = (v: unknown) => (typeof v === "string" ? v : "");
  const nombres = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is number => typeof x === "number" && x >= 1 && x <= 5) : [];
  const chaines = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x) : [];
  return {
    groupes: Array.isArray(o.groupes) ? o.groupes.flatMap((g): Groupe[] => {
      if (!g || typeof g !== "object") return [];
      const x = g as Record<string, unknown>;
      return [{ id: chaine(x.id) || newId(), nom: chaine(x.nom), eleveIds: chaines(x.eleveIds) }];
    }) : [],
    objectifs: Array.isArray(o.objectifs) ? o.objectifs.flatMap((ob): Objectif[] => {
      if (!ob || typeof ob !== "object") return [];
      const x = ob as Record<string, unknown>;
      return [{
        id: chaine(x.id) || newId(),
        competence: chaine(x.competence),
        origine: chaine(x.origine),
        pour: chaines(x.pour),
        periodes: nombres(x.periodes),
        atteintes: nombres(x.atteintes),
        creneaux: chaines(x.creneaux),
        ...(x.source && typeof x.source === "object" ? { source: {
          referentielNom: chaine((x.source as Record<string, unknown>).referentielNom),
          sousDomaineTitre: chaine((x.source as Record<string, unknown>).sousDomaineTitre),
          competenceRefId: chaine((x.source as Record<string, unknown>).competenceRefId),
        } } : {}),
        ...(Array.isArray(x.sequences) ? { sequences: chaines(x.sequences) } : {}),
        notes: chaine(x.notes),
      }];
    }) : [],
    ...(Array.isArray(o.journal) ? { journal: chaines(o.journal) } : {}),
  };
}

export const ecrire = (p: ProgrammationIme) => JSON.stringify(p);

// ── Qui est concerné ──────────────────────────────────────────────────────

export const marqueEleve = (id: string) => `eleve:${id}`;
export const marqueGroupe = (id: string) => `groupe:${id}`;

/**
 * Les élèves que cet objectif concerne, groupes dépliés.
 *
 * Un élève visé à la fois en direct et par un groupe ne compte qu'une fois :
 * sans cela, son tableau de bord annoncerait seize objectifs pour douze.
 */
export function elevesConcernes(o: Objectif, groupes: Groupe[]): string[] {
  const parId = new Map(groupes.map((g) => [g.id, g]));
  const vus = new Set<string>();
  for (const cible of o.pour) {
    if (cible.startsWith("eleve:")) vus.add(cible.slice(6));
    else if (cible.startsWith("groupe:")) {
      for (const e of parId.get(cible.slice(7))?.eleveIds ?? []) vus.add(e);
    }
  }
  return [...vus];
}

/** Les objectifs d'un élève, dans l'ordre de la programmation. */
export const objectifsDe = (p: ProgrammationIme, eleveId: string): Objectif[] =>
  p.objectifs.filter((o) => elevesConcernes(o, p.groupes).includes(eleveId));

/** Combien d'objectifs par élève : c'est ce nombre qu'on surveille. */
export function comptes(p: ProgrammationIme, eleveIds: string[]): Record<string, number> {
  const n: Record<string, number> = {};
  for (const id of eleveIds) n[id] = 0;
  for (const o of p.objectifs) {
    for (const id of elevesConcernes(o, p.groupes)) {
      if (id in n) n[id] += 1;
    }
  }
  return n;
}

/** Où en est un élève : trop peu, dans la cible, ou trop. */
export type Etat = "vide" | "peu" | "bon" | "trop";

export function etatDuCompte(n: number): Etat {
  if (n === 0) return "vide";
  if (n < CIBLE_MIN) return "peu";
  return n <= CIBLE_MAX ? "bon" : "trop";
}

/** Ce qu'on dit à l'enseignant du compte d'un élève. */
export function motDuCompte(n: number): string {
  switch (etatDuCompte(n)) {
    case "vide": return `Aucun objectif — on en vise ${CIBLE_MIN} à ${CIBLE_MAX} sur l'année.`;
    case "peu": return `${n} objectif${n > 1 ? "s" : ""} — il en manque ${CIBLE_MIN - n} pour tenir l'année.`;
    case "bon": return `${n} objectifs — dans la cible (${CIBLE_MIN} à ${CIBLE_MAX}).`;
    default: return `${n} objectifs — au-delà de ${CIBLE_MAX}, on ne suit plus.`;
  }
}

// ── Modifier ──────────────────────────────────────────────────────────────

export const nouvelObjectif = (pour: string[] = []): Objectif => ({
  id: newId(), competence: "", origine: "", pour, periodes: [], atteintes: [], creneaux: [], notes: "",
});

// ── Programmer par créneau ────────────────────────────────────────────────
//
// Un créneau de la semaine type porte déjà ses élèves : « Mathématiques
// cycle 2, mardi 9 h, un élève ». Poser une compétence dessus revient donc à
// la donner à ce groupe-là, sans le redire.
//
// Une compétence se reconnaît à son intitulé et à sa source : la reprendre
// sur un second créneau ne la duplique pas, elle s'y ajoute.

/** Ce qui identifie une compétence déjà posée : son intitulé et sa provenance. */
export const cleCompetence = (competence: string, origine: string) =>
  `${competence.trim().toLowerCase()}|${origine.trim().toLowerCase()}`;

export const cleDeLObjectif = (o: Objectif) => cleCompetence(o.competence, o.origine);

/** Les objectifs travaillés sur ce créneau. */
export const objectifsDuCreneau = (p: ProgrammationIme, creneauId: string): Objectif[] =>
  p.objectifs.filter((o) => o.creneaux.includes(creneauId));

/**
 * Pose une compétence sur un créneau, et l'attribue à ses élèves.
 *
 * Si elle y est déjà, rien ne bouge. Si elle existe ailleurs, on l'étend :
 * une même compétence travaillée le lundi et le jeudi reste un seul objectif,
 * sans quoi le compte par élève la verrait deux fois.
 */
export function poserSurCreneau(
  p: ProgrammationIme, creneauId: string, eleveIds: string[], competence: string, origine: string,
  source?: SourceCompetence,
): ProgrammationIme {
  const cle = cleCompetence(competence, origine);
  const existant = p.objectifs.find((o) => cleDeLObjectif(o) === cle);
  const avecEleves = (pour: string[]) => {
    const suite = [...pour];
    for (const id of eleveIds) if (!suite.includes(marqueEleve(id))) suite.push(marqueEleve(id));
    return suite;
  };
  if (!existant) {
    return {
      ...p,
      objectifs: [...p.objectifs, {
        ...nouvelObjectif(avecEleves([])), competence: competence.trim(), origine: origine.trim(),
        creneaux: [creneauId], ...(source ? { source } : {}),
      }],
    };
  }
  return {
    ...p,
    objectifs: p.objectifs.map((o) => (o.id === existant.id ? {
      ...o,
      creneaux: o.creneaux.includes(creneauId) ? o.creneaux : [...o.creneaux, creneauId],
      pour: avecEleves(o.pour),
    } : o)),
  };
}

/**
 * Retire une compétence d'un créneau.
 *
 * Les élèves qui la travaillent encore ailleurs la gardent : c'est tout
 * l'intérêt d'une compétence partagée entre deux créneaux. L'objectif qui ne
 * sert plus nulle part et ne vise plus personne s'en va.
 */
export function retirerDuCreneau(
  p: ProgrammationIme, creneauId: string, competence: string, origine: string,
  elevesParCreneau: Record<string, string[]>,
): ProgrammationIme {
  const cle = cleCompetence(competence, origine);
  const objectifs = p.objectifs.flatMap((o): Objectif[] => {
    if (cleDeLObjectif(o) !== cle || !o.creneaux.includes(creneauId)) return [o];
    const restants = o.creneaux.filter((c) => c !== creneauId);
    // Ceux que les créneaux restants couvrent encore.
    const gardes = new Set(restants.flatMap((c) => elevesParCreneau[c] ?? []));
    const partants = new Set((elevesParCreneau[creneauId] ?? []).filter((e) => !gardes.has(e)));
    const pour = o.pour.filter((m) => !partants.has(m.replace(/^eleve:/, "")) || !m.startsWith("eleve:"));
    if (!restants.length && !pour.length) return [];
    return [{ ...o, creneaux: restants, pour }];
  });
  return { ...p, objectifs };
}

export const nouveauGroupe = (nom: string, eleveIds: string[] = []): Groupe =>
  ({ id: newId(), nom: nom.trim() || "Groupe", eleveIds });

/** Ajoute ou retire une cible (élève ou groupe) d'un objectif. */
export function basculerCible(o: Objectif, cible: string): Objectif {
  return {
    ...o,
    pour: o.pour.includes(cible) ? o.pour.filter((x) => x !== cible) : [...o.pour, cible],
  };
}

/** Ajoute ou retire une période d'un objectif. */
export function basculerPeriode(o: Objectif, p: number): Objectif {
  const set = new Set(o.periodes);
  if (set.has(p)) { set.delete(p); } else { set.add(p); }
  const periodes = [...set].sort((a, b) => a - b);
  // Une période qu'on ne travaille plus ne peut pas rester « atteinte ».
  return { ...o, periodes, atteintes: o.atteintes.filter((x) => periodes.includes(x)) };
}

/**
 * Retire un groupe, sans perdre ce qui le visait.
 *
 * Les objectifs qui s'appuyaient dessus reprennent ses élèves un par un :
 * supprimer un groupe ne doit pas vider une année de programmation.
 */
export function retirerGroupe(p: ProgrammationIme, groupeId: string): ProgrammationIme {
  const groupe = p.groupes.find((g) => g.id === groupeId);
  if (!groupe) return p;
  const marque = marqueGroupe(groupeId);
  return {
    ...p,
    groupes: p.groupes.filter((g) => g.id !== groupeId),
    objectifs: p.objectifs.map((o) => {
      if (!o.pour.includes(marque)) return o;
      const sans = o.pour.filter((x) => x !== marque);
      const repris = groupe.eleveIds.map(marqueEleve).filter((m) => !sans.includes(m));
      return { ...o, pour: [...sans, ...repris] };
    }),
  };
}
