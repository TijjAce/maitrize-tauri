// ── Ce que le cahier journal apporte aux objectifs par élève ──────────────
//
// Une séquence citée sur un créneau du cahier journal — la ligne 📚, son
// titre dans le prévu, ou la séance posée sur le créneau — fait travailler sa
// compétence visée aux élèves de ce créneau. L'écran des objectifs la reprend :
// l'objectif naît, ou s'étend à ces élèves et à la période de ce jour-là.
//
// Chaque citation n'est reprise qu'une fois (« <créneau>|<compétence> ») : un
// objectif qu'on retire de la programmation ne revient pas tant qu'une autre
// séance ne le fait pas travailler.

import type { Creneau, Seance, Sequence } from "./api";
import { natureDe } from "./heures";
import { sequencesCitees } from "./sequencesCitees";
import {
  cleCompetence, cleDeLObjectif, elevesConcernes, marqueEleve, nouvelObjectif,
  type Objectif, type ProgrammationIme, type SourceCompetence,
} from "./programmationIme";

/** Une compétence travaillée sur un créneau, par une séquence, avec ces élèves. */
export interface TravailDuJournal {
  /** « <créneau>|<compétence> » : ce qui identifie une reprise. */
  marque: string;
  competence: string;
  origine: string;
  source: SourceCompetence;
  eleveIds: string[];
  periode: number;
  sequenceId: string;
}

/** La compétence visée d'une séquence, écrite comme la programmation l'écrit. */
export function competenceDeLaSequence(s: Sequence): { competence: string; origine: string; source: SourceCompetence } | null {
  let c: unknown;
  try { c = s.competenceVisee ? JSON.parse(s.competenceVisee) : null; } catch { return null; }
  if (!c || typeof c !== "object") return null;
  const o = c as Record<string, unknown>;
  const chaine = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const competence = chaine(o.competenceTitre);
  if (!competence) return null;
  return {
    competence,
    origine: [chaine(o.referentielNom), chaine(o.domaineTitre), chaine(o.niveau)].filter(Boolean).join(" › "),
    source: { referentielNom: chaine(o.referentielNom), sousDomaineTitre: chaine(o.sousDomaineTitre), competenceRefId: chaine(o.competenceRefId) },
  };
}

/**
 * Ce que le cahier journal fait travailler, créneau par créneau.
 *
 * Les élèves d'un créneau sont ceux qu'il nomme ; un créneau qui n'en nomme
 * aucun est celui de toute la classe, comme dans la vue par créneau. Une
 * réunion ne fait rien travailler.
 */
export function travauxDuJournal(
  creneaux: Creneau[], sequences: Sequence[], seances: Seance[], eleveIds: string[],
  periodeDe: (jour: string) => number,
): TravailDuJournal[] {
  const connus = new Set(eleveIds);
  const parId = new Map(sequences.map((s) => [s.id, s]));
  const sortie: TravailDuJournal[] = [];
  for (const c of creneaux) {
    if (natureDe(c) === "reunion") continue;
    const citees = new Map<string, Sequence>();
    for (const { sequence } of sequencesCitees(c.prevu ?? "", sequences, seances)) citees.set(sequence.id, sequence);
    const posee = parId.get(seances.find((s) => s.id === c.seanceId)?.sequenceId ?? "");
    if (posee) citees.set(posee.id, posee);
    if (!citees.size) continue;
    let nommes: unknown;
    try { nommes = JSON.parse(c.elevesJson || "[]"); } catch { nommes = []; }
    const liste = Array.isArray(nommes) ? nommes.filter((id): id is string => typeof id === "string") : [];
    const siens = liste.length ? liste.filter((id) => connus.has(id)) : eleveIds;
    if (!siens.length) continue;
    const periode = periodeDe(c.date.slice(0, 10));
    for (const s of citees.values()) {
      const comp = competenceDeLaSequence(s);
      if (!comp) continue;
      sortie.push({ marque: `${c.id}|${cleCompetence(comp.competence, comp.origine)}`, ...comp, eleveIds: siens, periode, sequenceId: s.id });
    }
  }
  return sortie;
}

/** La même compétence : même intitulé et même provenance, ou la même ligne d'un référentiel. */
function memeCompetence(o: Objectif, t: TravailDuJournal): boolean {
  if (cleDeLObjectif(o) === cleCompetence(t.competence, t.origine)) return true;
  const a = o.source;
  return !!(a && a.competenceRefId && a.competenceRefId === t.source.competenceRefId
    && a.referentielNom === t.source.referentielNom && a.sousDomaineTitre === t.source.sousDomaineTitre);
}

/**
 * Reprend dans la programmation ce que le cahier journal a fait travailler
 * depuis la dernière fois : l'objectif naît, ou gagne ces élèves et cette
 * période. Un élève déjà visé par un groupe n'est pas ajouté une seconde fois.
 */
export function reprendreDuJournal(p: ProgrammationIme, travaux: TravailDuJournal[]): {
  prog: ProgrammationIme; ajoutes: number; completes: number;
} {
  const vus = new Set(p.journal ?? []);
  if (travaux.every((t) => vus.has(t.marque))) return { prog: p, ajoutes: 0, completes: 0 };
  const objectifs = [...p.objectifs];
  const crees = new Set<string>();
  const completes = new Set<string>();
  for (const t of travaux) {
    if (vus.has(t.marque)) continue;
    vus.add(t.marque);
    const i = objectifs.findIndex((o) => memeCompetence(o, t));
    if (i < 0) {
      const neuf: Objectif = {
        ...nouvelObjectif(t.eleveIds.map(marqueEleve)), competence: t.competence, origine: t.origine,
        periodes: [t.periode], sequences: [t.sequenceId], source: t.source,
      };
      objectifs.push(neuf);
      crees.add(neuf.id);
      continue;
    }
    const o = objectifs[i];
    const deja = new Set(elevesConcernes(o, p.groupes));
    const pour = [...o.pour, ...t.eleveIds.filter((id) => !deja.has(id)).map(marqueEleve)];
    const periodes = o.periodes.includes(t.periode) ? o.periodes : [...o.periodes, t.periode].sort((a, b) => a - b);
    const siennes = o.sequences ?? [];
    const sequences = siennes.includes(t.sequenceId) ? siennes : [...siennes, t.sequenceId];
    if ((pour.length !== o.pour.length || periodes !== o.periodes) && !crees.has(o.id)) completes.add(o.id);
    objectifs[i] = { ...o, pour, periodes, sequences };
  }
  return { prog: { ...p, objectifs, journal: [...vus] }, ajoutes: crees.size, completes: completes.size };
}
