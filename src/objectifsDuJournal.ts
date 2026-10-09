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

/** Une compétence telle que la programmation l'écrit : son intitulé, sa provenance, sa ligne de référentiel s'il y en a une. */
export interface CompetenceProgrammee { competence: string; origine: string; source?: SourceCompetence }

/** La même compétence : même intitulé et même provenance, ou la même ligne d'un référentiel. */
function memeCompetence(o: Objectif, t: CompetenceProgrammee): boolean {
  if (cleDeLObjectif(o) === cleCompetence(t.competence, t.origine)) return true;
  const a = o.source;
  // L'identifiant suffit : le titre de la partie a pu être corrigé depuis.
  return !!(a && t.source && a.competenceRefId && a.competenceRefId === t.source.competenceRefId && a.referentielNom === t.source.referentielNom);
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

// ── Une séquence posée à la main ──────────────────────────────────────────
//
// À côté de « ＋ Objectif », « ＋ Séquence » : on programme une séquence
// qu'on a déjà, plutôt que de recopier ce qu'elle vise. Sa compétence visée
// devient l'objectif — sans compétence visée, chacune de ses compétences ;
// sans compétence du tout, son titre. Un objectif qui porte déjà la
// compétence cite la séquence, et gagne ces élèves et sa période.

/** Ce qu'une séquence fait travailler, écrit comme la programmation l'écrit. */
export function competencesDeLaSequence(s: Sequence): CompetenceProgrammee[] {
  const visee = competenceDeLaSequence(s);
  if (visee) return [visee];
  let brut: unknown;
  try { brut = s.competences ? JSON.parse(s.competences) : []; } catch { brut = []; }
  const chaine = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const vues = new Set<string>();
  const lues = (Array.isArray(brut) ? brut : []).flatMap((c): CompetenceProgrammee[] => {
    if (!c || typeof c !== "object") return [];
    const o = c as Record<string, unknown>;
    const competence = chaine(o.competenceTitre);
    const origine = [chaine(o.referentielNom), chaine(o.domaineTitre), chaine(o.niveau)].filter(Boolean).join(" › ");
    const cle = cleCompetence(competence, origine);
    if (!competence || vues.has(cle)) return [];
    vues.add(cle);
    return [{
      competence, origine,
      source: { referentielNom: chaine(o.referentielNom), sousDomaineTitre: chaine(o.sousDomaineTitre), competenceRefId: chaine(o.competenceRefId) },
    }];
  });
  if (lues.length) return lues;
  const titre = s.titre.trim();
  return titre ? [{ competence: titre, origine: "" }] : [];
}

/**
 * Programme une séquence pour ces élèves : ses compétences deviennent des
 * objectifs, ou s'ajoutent à ceux qui les portent déjà. La séquence y est
 * citée, et sa période — si elle en a une — prévue.
 */
export function poserUneSequence(p: ProgrammationIme, s: Sequence, eleveIds: string[]): {
  prog: ProgrammationIme; ajoutes: number; completes: number;
} {
  const periode = s.periode >= 1 && s.periode <= 5 ? s.periode : 0;
  const objectifs = [...p.objectifs];
  let ajoutes = 0;
  let completes = 0;
  for (const c of competencesDeLaSequence(s)) {
    const i = objectifs.findIndex((o) => memeCompetence(o, c));
    if (i < 0) {
      objectifs.push({
        ...nouvelObjectif(eleveIds.map(marqueEleve)), competence: c.competence, origine: c.origine,
        periodes: periode ? [periode] : [], sequences: [s.id], ...(c.source ? { source: c.source } : {}),
      });
      ajoutes += 1;
      continue;
    }
    const o = objectifs[i];
    const deja = new Set(elevesConcernes(o, p.groupes));
    const pour = [...o.pour, ...eleveIds.filter((id) => !deja.has(id)).map(marqueEleve)];
    const periodes = !periode || o.periodes.includes(periode) ? o.periodes : [...o.periodes, periode].sort((a, b) => a - b);
    const siennes = o.sequences ?? [];
    const sequences = siennes.includes(s.id) ? siennes : [...siennes, s.id];
    if (pour.length !== o.pour.length || periodes !== o.periodes || sequences !== siennes) completes += 1;
    objectifs[i] = { ...o, pour, periodes, sequences };
  }
  return { prog: { ...p, objectifs }, ajoutes, completes };
}
