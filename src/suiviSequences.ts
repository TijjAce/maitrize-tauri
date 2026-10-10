// ── Le suivi des séquences : ce que le cahier journal en dit ──────────────
//
// Une séquence démarrée, c'est une séquence dont une séance est passée en
// classe — posée sur un créneau du cahier journal, ou citée dans son prévu.
// Rien à saisir : le journal se remplit chaque jour, l'état suit. Aucune
// séance passée, la séquence est en préparation ; toutes ses séances faites,
// elle est terminée ; démarrée mais laissée trois semaines sans suite ni
// séance posée, elle est en pause. L'enseignant tranche lui-même — pause,
// terminée — quand le journal ne peut pas savoir : une séquence abandonnée,
// ou reprise l'an prochain.

import type { Creneau, Seance, Sequence } from "./api";
import { sequencesCitees } from "./sequencesCitees";

export type EtatSequence = "preparation" | "classe" | "pause" | "terminee";

/** Au-delà, une séquence démarrée sans suite ni séance posée est en pause. */
export const SEMAINES_AVANT_PAUSE = 3;

export const ETATS_SEQUENCE: { id: EtatSequence; nom: string; pluriel: string; ico: string }[] = [
  { id: "classe", nom: "En classe", pluriel: "En classe", ico: "🟢" },
  { id: "preparation", nom: "En préparation", pluriel: "En préparation", ico: "✏️" },
  { id: "pause", nom: "En pause", pluriel: "En pause", ico: "⏸" },
  { id: "terminee", nom: "Terminée", pluriel: "Terminées", ico: "✅" },
];

export const descriptionEtat = (e: EtatSequence) => ETATS_SEQUENCE.find((x) => x.id === e) ?? ETATS_SEQUENCE[0];

/** Un passage en classe : le créneau, sa date, la séance si elle est précisée, et le bilan écrit ce jour-là. */
export interface Passage { creneauId: string; date: string; heure: string; seance: Seance | null; bilan: string }

/** Du 1er août au 31 juillet : les créneaux d'une année scolaire, « 2026-2027 ». */
export function bornesDeLAnnee(annee: string): [string, string] {
  const [debut, fin] = (annee ?? "").split("-").map(Number);
  const y = Number.isFinite(debut) && debut > 0 ? debut : new Date().getFullYear();
  const z = Number.isFinite(fin) && fin > 0 ? fin : y + 1;
  return [`${y}-08-01`, `${z}-07-31`];
}

/**
 * Les passages en classe de chaque séquence, lus dans les créneaux : la
 * séance posée sur le créneau, ou la séquence citée dans le prévu. Un créneau
 * ne compte qu'une fois par séquence — avec sa séance quand on la connaît.
 */
export function passagesParSequence(creneaux: Creneau[], sequences: Sequence[], seances: Seance[]): Map<string, Passage[]> {
  const parSeance = new Map(seances.map((s) => [s.id, s]));
  const sortie = new Map<string, Passage[]>();
  const poser = (sequenceId: string, p: Passage) => {
    const liste = sortie.get(sequenceId) ?? [];
    const deja = liste.findIndex((x) => x.creneauId === p.creneauId);
    if (deja < 0) liste.push(p);
    else if (!liste[deja].seance && p.seance) liste[deja] = p;
    sortie.set(sequenceId, liste);
  };
  for (const c of creneaux) {
    if (c.nature === "reunion") continue;
    const date = (c.date ?? "").slice(0, 10);
    if (!date) continue;
    const passage = (seance: Seance | null): Passage => ({ creneauId: c.id, date, heure: c.heureDebut ?? "", seance, bilan: c.bilan ?? "" });
    const posee = c.seanceId ? parSeance.get(c.seanceId) : undefined;
    if (posee?.sequenceId) poser(posee.sequenceId, passage(posee));
    if ((c.prevu ?? "").trim()) {
      for (const cit of sequencesCitees(c.prevu, sequences, seances)) poser(cit.sequence.id, passage(cit.seance));
    }
  }
  for (const liste of sortie.values()) liste.sort((a, b) => a.date.localeCompare(b.date) || a.heure.localeCompare(b.heure));
  return sortie;
}

export interface SuiviSequence {
  sequence: Sequence;
  etat: EtatSequence;
  /** Ce que l'enseignant a tranché : « pause », « terminee », ou rien. */
  manuel: "" | "pause" | "terminee";
  /** Les passages en classe déjà faits, du plus ancien au plus récent (jusqu'à aujourd'hui compris). */
  passages: Passage[];
  /** Les séances distinctes déjà faites, par numéro. */
  faites: Seance[];
  /** Combien de séances la séquence compte : celles prévues, sinon celles écrites. */
  prevues: number;
  demarreeLe: string | null;
  derniereLe: string | null;
  /** Le prochain passage posé après aujourd'hui, s'il y en a un. */
  prochain: Passage | null;
  /** Tous les passages posés après aujourd'hui, du plus proche au plus lointain. */
  aVenir: Passage[];
  /** La séance qui vient : la première, par numéro, qui n'a pas été faite. */
  suivante: Seance | null;
}

/** Le nombre de jours de `a` à `b` (dates ISO « AAAA-MM-JJ ») ; négatif si `b` est avant. */
export function joursEntre(a: string, b: string): number {
  const d = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
  return Math.round((d(b) - d(a)) / 86_400_000);
}

const parNumero = (a: Seance, b: Seance) => a.numero - b.numero || a.titre.localeCompare(b.titre, "fr");

/** L'état d'une séquence et ce qui l'explique, d'après ses séances et ses passages en classe. */
export function suiviDeLaSequence(sequence: Sequence, siennes: Seance[], passages: Passage[], aujourdHui: string): SuiviSequence {
  const passes = passages.filter((p) => p.date <= aujourdHui);
  const aVenir = passages.filter((p) => p.date > aujourdHui);
  const prochain = aVenir[0] ?? null;
  const faites = [...new Map(passes.filter((p) => p.seance).map((p) => [p.seance!.id, p.seance!])).values()].sort(parNumero);
  const prevues = sequence.nbSeancesPrevu > 0 ? sequence.nbSeancesPrevu : siennes.length;
  const derniereLe = passes.length ? passes[passes.length - 1].date : null;
  const manuel = sequence.etat === "pause" || sequence.etat === "terminee" ? sequence.etat : "";
  const etat: EtatSequence = manuel ? manuel
    : !passes.length ? "preparation"
    : prevues > 0 && faites.length >= prevues ? "terminee"
    : !prochain && derniereLe && joursEntre(derniereLe, aujourdHui) > 7 * SEMAINES_AVANT_PAUSE ? "pause"
    : "classe";
  const suivante = [...siennes].sort(parNumero).find((s) => !faites.some((f) => f.id === s.id)) ?? null;
  return { sequence, etat, manuel, passages: passes, faites, prevues, demarreeLe: passes[0]?.date ?? null, derniereLe, prochain, aVenir, suivante };
}

/** Le suivi de toutes les séquences, en une passe sur les créneaux. */
export function suivisDesSequences(sequences: Sequence[], seances: Seance[], creneaux: Creneau[], aujourdHui: string): Map<string, SuiviSequence> {
  const passages = passagesParSequence(creneaux, sequences, seances);
  const sortie = new Map<string, SuiviSequence>();
  for (const s of sequences) {
    sortie.set(s.id, suiviDeLaSequence(s, seances.filter((x) => x.sequenceId === s.id), passages.get(s.id) ?? [], aujourdHui));
  }
  return sortie;
}

/** La part des séances faites, entre 0 et 1. */
export const avancement = (s: SuiviSequence) => (s.prevues > 0 ? Math.min(1, s.faites.length / s.prevues) : 0);

/** « 12/09 ». */
export const dateCourte = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** « aujourd'hui », « hier », « il y a 3 jours », « il y a 2 semaines », « il y a 3 mois » — ou « demain », « dans 4 jours ». */
export function ilYA(iso: string, aujourdHui: string): string {
  const jours = joursEntre(iso.slice(0, 10), aujourdHui);
  if (jours === 0) return "aujourd'hui";
  if (jours === 1) return "hier";
  if (jours === -1) return "demain";
  if (jours < 0) return `dans ${-jours} jours`;
  if (jours < 7) return `il y a ${jours} jours`;
  if (jours < 30) { const s = Math.round(jours / 7); return `il y a ${s} semaine${s > 1 ? "s" : ""}`; }
  if (jours < 365) return `il y a ${Math.round(jours / 30)} mois`;
  const a = Math.round(jours / 365);
  return `il y a ${a} an${a > 1 ? "s" : ""}`;
}

const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

/** Un jour à venir : « aujourd'hui », « demain », « jeudi 3 » dans la semaine, « 12/10 » au-delà. */
export function jourProche(iso: string, aujourdHui: string): string {
  const jours = joursEntre(aujourdHui, iso);
  if (jours === 0) return "aujourd'hui";
  if (jours === 1) return "demain";
  if (jours > 1 && jours < 7) {
    const d = new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
    return `${JOURS[d.getDay()]} ${d.getDate()}`;
  }
  return dateCourte(iso);
}

const JOURS_COURTS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];

/**
 * Un passage dans le cahier journal, en une étiquette : « lun. 06/10 · 9h00 ·
 * séance 2 ». C'est la liste de ces étiquettes, sous l'état de la séquence,
 * qui dit quand la séquence a été posée — et quand elle le sera.
 */
export function libelleDuPassage(p: Passage): string {
  const d = new Date(Number(p.date.slice(0, 4)), Number(p.date.slice(5, 7)) - 1, Number(p.date.slice(8, 10)));
  const heure = p.heure ? p.heure.slice(0, 5).replace(":", "h").replace(/^0(\d)/, "$1") : "";
  return [`${JOURS_COURTS[d.getDay()]} ${dateCourte(p.date)}`, heure, p.seance ? `séance ${p.seance.numero}` : ""].filter(Boolean).join(" · ");
}

/** Ce qu'on lit sous le titre d'une séquence : son état, et ce qui l'explique. */
export function libelleDuSuivi(s: SuiviSequence, aujourdHui: string): string {
  const compte = s.prevues > 0 ? `séance ${s.faites.length}/${s.prevues}` : `${s.faites.length} séance${s.faites.length > 1 ? "s" : ""} faite${s.faites.length > 1 ? "s" : ""}`;
  switch (s.etat) {
    case "preparation":
      return `En préparation${s.sequence.dateMaj ? ` · modifiée ${ilYA(s.sequence.dateMaj, aujourdHui)}` : ""}`;
    case "classe":
      return `En classe depuis le ${dateCourte(s.demarreeLe!)} · ${compte}${s.prochain ? ` · prochaine ${jourProche(s.prochain.date, aujourdHui)}` : " · aucune séance posée"}`;
    case "pause":
      return s.derniereLe ? `En pause · dernière séance ${ilYA(s.derniereLe, aujourdHui)} · ${compte}` : "En pause";
    case "terminee":
      return `Terminée${s.derniereLe ? ` le ${dateCourte(s.derniereLe)}` : ""}${s.prevues > 0 ? ` · ${s.prevues} séance${s.prevues > 1 ? "s" : ""}` : ""}`;
  }
}

/** Les suivis par activité : la dernière séance faite d'abord, puis la dernière modification, puis le titre. */
export function rangerParActivite(suivis: SuiviSequence[]): SuiviSequence[] {
  return [...suivis].sort((a, b) =>
    (b.derniereLe ?? "").localeCompare(a.derniereLe ?? "")
    || (b.sequence.dateMaj ?? "").localeCompare(a.sequence.dateMaj ?? "")
    || a.sequence.titre.localeCompare(b.sequence.titre, "fr"));
}
