// ── Reporter depuis le téléphone ──────────────────────────────────────────
//
// « Depuis le téléphone, sur chaque créneau, il faudrait la possibilité de
// reporter automatiquement les temps de la séance, voire carrément la séance
// entière au lendemain si elle n'a pas été faite, et du coup que ça
// apparaisse correctement dans le cahier journal au lendemain » (l'enseignant,
// 4 novembre 2026).
//
// Le téléphone dépose la demande : le créneau, et ceux des temps de sa séance
// qui n'ont pas été faits — aucun : toute la séance. L'ordinateur la relève
// (voir telephone.rs) et l'applique ici, lui qui sait l'emploi du temps, les
// vacances et les temps des séances :
// - le créneau d'arrivée est le prochain de la même matière, dès le
//   lendemain, un jour de classe — ni week-end, ni férié, ni vacances — ; un
//   jour que le planning n'a pas encore rempli reçoit le créneau que son
//   emploi du temps type y mettrait, comme « Remplir » ;
// - toute la séance quitte son créneau, qui garde à son bilan où elle est
//   partie : le suivi des séquences ne la compte pas faite ce jour-là ;
// - quelques temps seulement : la séance reste à son créneau, faite en
//   partie, et va aussi au créneau d'arrivée, sous une ligne qui dit les temps
//   à reprendre ;
// - sans séance, c'est le prévu qui part.
// Au créneau d'arrivée, la séance se pose si la place est libre ; sinon elle
// s'y cite par la ligne du bouton 📚, comme une tâche de plus.

import { api, couleurPourMatiere, joursFeriesFR, newId, texteErreur, type Creneau, type EdtTypique, type ReportRecu, type Seance, type Sequence } from "./api";
import { isoJour, plusJours } from "./dates";
import { tempsDeLaSeance } from "./documentSeance";
import { JOURS_EDT, natureDuSlot, organisationPour, type SlotEdt } from "./organisation";
import { forme, ligneDeSequence, sequencesCitees, totalDesSeances } from "./sequencesCitees";
import { lireCache, vacanceDuJour, type Periode } from "./vacances";

/** Ce que le téléphone demande (voir `relais::Report`). */
export interface DemandeDeReport {
  /** Le jour du créneau, tel que le téléphone l'a vu. */
  jour: string;
  /** La séance, par son titre, telle que le téléphone l'a vue. */
  seance?: string;
  /** Les temps à reporter, par leur rang et leur titre publiés ; aucun : toute la séance. */
  temps?: { rang: number; titre: string }[];
}

/** La demande ; null si elle ne se lit pas. */
export function lireDemande(json: string): DemandeDeReport | null {
  try {
    const d = JSON.parse(json) as Partial<DemandeDeReport> | null;
    if (!d || typeof d.jour !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(d.jour)) return null;
    const temps = Array.isArray(d.temps)
      ? d.temps.filter((t) => t && typeof t.rang === "number" && typeof t.titre === "string").map((t) => ({ rang: t.rang, titre: t.titre }))
      : [];
    return { jour: d.jour.slice(0, 10), seance: typeof d.seance === "string" ? d.seance : "", temps };
  } catch {
    return null;
  }
}

// ── Le créneau d'arrivée ──────────────────────────────────────────────────

/** Les jours sans classe, en plus du week-end : les jours fériés, les vacances. */
export interface Calendrier { feries: Record<string, string>; vacances: Periode[] }

/** Combien de jours on cherche, à partir du lendemain : trois semaines, vacances courtes comprises. */
export const HORIZON_JOURS = 21;

const midi = (jour: string) => new Date(`${jour.slice(0, 10)}T12:00:00`);

const sansClasse = (jour: string, cal: Calendrier) => {
  const j = midi(jour).getDay();
  return j === 0 || j === 6 || !!cal.feries[jour] || !!vacanceDuJour(cal.vacances, jour);
};

/** Deux matières pareilles, sans accents ni majuscules. */
export const memeMatiere = (a: string, b: string) => !!forme(a).trim() && forme(a) === forme(b);

/** Un créneau tiré de l'emploi du temps type, comme le pose « Remplir » au planning. */
export function creneauDuSlot(s: SlotEdt, jour: string): Creneau {
  return {
    id: newId(), date: jour, heureDebut: s.heureDebut, heureFin: s.heureFin, matiere: s.titre, couleur: couleurPourMatiere(s.titre),
    seanceId: null, atelierId: null, espaceId: null, elevesJson: JSON.stringify(s.eleves ?? []), nature: natureDuSlot(s), prevu: "", bilan: "",
  };
}

/** Le créneau d'arrivée ; `nouveau` : tiré de l'emploi du temps type, pour un jour que le planning n'a pas encore rempli. */
export interface Arrivee { creneau: Creneau; nouveau: boolean }

/**
 * Le prochain créneau de la même matière, à partir du lendemain : parmi ceux
 * du planning ; un jour de classe sans aucun créneau prend celui de son
 * emploi du temps type. Un jour rempli sans cette matière passe son tour.
 * Rien sur `horizon` jours : null.
 */
export function creneauDArrivee(
  source: Pick<Creneau, "date" | "matiere">, creneaux: readonly Creneau[], emploiDuTemps: (jour: string) => SlotEdt[],
  cal: Calendrier, horizon = HORIZON_JOURS,
): Arrivee | null {
  const parHeure = <T extends { heureDebut: string }>(a: T, b: T) => a.heureDebut.localeCompare(b.heureDebut);
  for (let k = 1; k <= horizon; k++) {
    const jour = isoJour(plusJours(midi(source.date), k));
    if (sansClasse(jour, cal)) continue;
    const ceJour = creneaux.filter((c) => (c.date ?? "").slice(0, 10) === jour);
    if (ceJour.length) {
      const pareil = ceJour.filter((c) => memeMatiere(c.matiere, source.matiere)).sort(parHeure)[0];
      if (pareil) return { creneau: pareil, nouveau: false };
      continue;
    }
    const nom = JOURS_EDT[midi(jour).getDay() - 1];
    const slot = emploiDuTemps(jour).filter((s) => s.jour === nom && memeMatiere(s.titre, source.matiere)).sort(parHeure)[0];
    if (slot) return { creneau: creneauDuSlot(slot, jour), nouveau: true };
  }
  return null;
}

// ── Ce que devient chaque créneau ─────────────────────────────────────────

/** Un jour en toutes lettres : « mardi 5 novembre ». */
export const jourEnLettres = (jour: string) => midi(jour).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

/** Une heure comme on la dit : « 9 h », « 13 h 30 ». */
export function heureEnLettres(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm ?? "");
  if (!m) return "";
  return m[2] === "00" ? `${Number(m[1])} h` : `${Number(m[1])} h ${m[2]}`;
}

/** Le moment d'un créneau : « mardi 5 novembre, 9 h ». */
export const momentDuCreneau = (c: Pick<Creneau, "date" | "heureDebut">) =>
  [jourEnLettres(c.date), heureEnLettres(c.heureDebut)].filter(Boolean).join(", ");

const avant = (texte: string | null | undefined, ligne: string) => ((texte ?? "").trim() ? `${ligne}\n${(texte ?? "").replace(/^\s+/, "")}` : ligne);
const apres = (texte: string | null | undefined, ligne: string) => ((texte ?? "").trim() ? `${(texte ?? "").replace(/\s+$/, "")}\n${ligne}` : ligne);

/** La première séance citée par le prévu — par la ligne du bouton 📚, ou par son titre —, et la ligne qui la cite. */
function seanceCitee(prevu: string, sequences: Sequence[], seances: Seance[]): { seance: Seance; ligne: number } | null {
  const lignes = (prevu ?? "").split("\n");
  for (let i = 0; i < lignes.length; i++) {
    const cite = sequencesCitees(lignes[i], sequences, seances).find((x) => x.seance);
    if (cite?.seance) return { seance: cite.seance, ligne: i };
  }
  return null;
}

/**
 * La séance posée au créneau d'arrivée : à sa place si elle est libre ; sinon citée en tête du prévu par la ligne du
 * bouton 📚 — sans séquence, par son titre. Déjà là, rien ne change.
 */
function poserLaSeance(c: Creneau, seance: Seance, sequences: Sequence[], seances: Seance[]): Creneau {
  if (c.seanceId === seance.id) return c;
  if (!c.seanceId) return { ...c, seanceId: seance.id };
  const sequence = sequences.find((q) => q.id === seance.sequenceId);
  const ligne = sequence ? ligneDeSequence(sequence, seance, totalDesSeances(sequence, seances)) : `Séance : ${seance.titre.trim() || "sans titre"}`;
  if ((c.prevu ?? "").split("\n").some((l) => l.trim() === ligne)) return c;
  return { ...c, prevu: avant(c.prevu, ligne) };
}

/** Les temps à reporter, tels que la séance les nomme maintenant : par leur titre, sinon par leur rang. */
function tempsAReporter(demandes: { rang: number; titre: string }[], tous: string[]): string[] {
  const rangs = new Set<number>();
  for (const d of demandes) {
    const parTitre = tous.findIndex((t) => forme(t) === forme(d.titre));
    if (parTitre >= 0) rangs.add(parTitre);
    else if (d.rang >= 0 && d.rang < tous.length) rangs.add(d.rang);
  }
  return [...rangs].sort((a, b) => a - b).map((i) => tous[i]);
}

/** Ce que deviennent les deux créneaux, et ce qu'on en dit à l'enseignant. */
export interface PlanDuReport { source: Creneau; arrivee: Creneau; nouveau: boolean; resume: string }

/** Le report d'un créneau vers son créneau d'arrivée ; une erreur à dire s'il n'y a rien à reporter. */
export function planDuReport(
  demande: DemandeDeReport, source: Creneau, arrivee: Arrivee, seances: Seance[], sequences: Sequence[],
): PlanDuReport | { erreur: string } {
  const quand = momentDuCreneau(arrivee.creneau);
  const depuis = jourEnLettres(source.date);
  const ajoute = arrivee.nouveau ? " (créneau ajouté d'après l'emploi du temps)" : "";
  const posee = source.seanceId ? seances.find((s) => s.id === source.seanceId) : undefined;
  const citee = posee ? null : seanceCitee(source.prevu ?? "", sequences, seances);
  const seance = posee ?? citee?.seance;

  // Sans séance : le prévu part tout entier.
  if (!seance) {
    const prevu = (source.prevu ?? "").trim();
    if (!prevu) return { erreur: "Rien à reporter : le créneau n'avait ni séance ni prévu." };
    return {
      source: { ...source, prevu: "", bilan: apres(source.bilan, `↪ Prévu reporté au ${quand}.`) },
      arrivee: { ...arrivee.creneau, prevu: avant(arrivee.creneau.prevu, `↪ Reporté du ${depuis} :\n${prevu}`) },
      nouveau: arrivee.nouveau,
      resume: `Le prévu de ${source.matiere || "ce créneau"} du ${depuis} est reporté au ${quand}${ajoute}.`,
    };
  }

  const titre = seance.titre.trim() || "la séance";
  const tous = tempsDeLaSeance(seance);
  const demandes = demande.temps ?? [];
  const retrouves = tempsAReporter(demandes, tous);
  // Quelques temps seulement : ceux qu'on retrouve dans la séance, sinon ceux que le téléphone a nommés.
  const partiel = demandes.length > 0 && !(tous.length > 0 && retrouves.length >= tous.length);
  let arrive = poserLaSeance(arrivee.creneau, seance, sequences, seances);

  if (partiel) {
    const temps = retrouves.length ? retrouves : demandes.map((d) => d.titre.trim()).filter(Boolean);
    const liste = temps.join(" ; ");
    arrive = { ...arrive, prevu: avant(arrive.prevu, `↪ Suite de la séance du ${depuis} : ${liste}.`) };
    return {
      source: { ...source, bilan: apres(source.bilan, `↪ Reporté au ${quand} : ${liste}.`) },
      arrivee: arrive,
      nouveau: arrivee.nouveau,
      resume: `${temps.length > 1 ? `${temps.length} temps` : "Un temps"} de « ${titre} » reporté${temps.length > 1 ? "s" : ""} au ${quand}${ajoute}.`,
    };
  }

  // Toute la séance quitte son créneau : posée, elle s'en détache ; citée, sa ligne s'en va.
  arrive = { ...arrive, prevu: avant(arrive.prevu, `↪ Séance reportée du ${depuis}.`) };
  const lignes = (source.prevu ?? "").split("\n");
  return {
    source: {
      ...source,
      seanceId: posee ? null : source.seanceId,
      prevu: citee ? lignes.filter((_, i) => i !== citee.ligne).join("\n").trim() : source.prevu,
      bilan: apres(source.bilan, `↪ « ${titre} » reportée au ${quand}.`),
    },
    arrivee: arrive,
    nouveau: arrivee.nouveau,
    resume: `« ${titre} » reportée au ${quand}${ajoute}.`,
  };
}

// ── Appliquer les reports relevés ─────────────────────────────────────────

/** Émis quand des reports ont été appliqués : le planning ouvert se relit. */
export const EVT_REPORT_APPLIQUE = "maitrize:report-applique";

/** Ce qu'un report a donné : la phrase à dire, et si c'est une réussite. */
export interface IssueDuReport { ok: boolean; message: string }

/** Les créneaux de quelques jours avant le report jusqu'au bout de l'horizon : de quoi trouver la source et l'arrivée. */
async function creneauxAutourDe(jour: string): Promise<Creneau[]> {
  const debut = isoJour(plusJours(midi(jour), -14));
  const fin = isoJour(plusJours(midi(jour), HORIZON_JOURS + 30));
  return api.creneauxList(debut, `${fin}T23:59:59`);
}

/** Applique un report pris ; rend ce qu'il a donné. */
export async function appliquerUnReport(
  r: ReportRecu, seances: Seance[], sequences: Sequence[], edts: EdtTypique[], vacances: Periode[],
): Promise<IssueDuReport> {
  const demande = lireDemande(r.demande);
  if (!demande) return { ok: false, message: "Report illisible : rien n'a été reporté." };
  let creneaux = await creneauxAutourDe(demande.jour);
  let source = creneaux.find((c) => c.id === r.creneau);
  // Le créneau a pu changer de jour depuis : on le cherche partout, et l'on regarde autour de sa date.
  if (!source) {
    source = (await api.creneauxList()).find((c) => c.id === r.creneau);
    if (source) creneaux = await creneauxAutourDe(source.date);
  }
  if (!source) return { ok: false, message: "Le créneau n'est plus au cahier journal : rien n'a été reporté." };
  const annee = Number(source.date.slice(0, 4));
  const cal: Calendrier = { feries: { ...joursFeriesFR(annee), ...joursFeriesFR(annee + 1) }, vacances };
  const emploiDuTemps = (jour: string): SlotEdt[] => {
    const e = organisationPour(edts, midi(jour));
    try { return e ? (JSON.parse(e.slotsJson) as SlotEdt[]) : []; } catch { return []; }
  };
  const arrivee = creneauDArrivee(source, creneaux, emploiDuTemps, cal);
  if (!arrivee) {
    const message = `Aucun créneau de ${source.matiere || "cette matière"} dans les trois semaines qui suivent le ${jourEnLettres(source.date)} : rien n'a été reporté.`;
    await api.creneauSave({ ...source, bilan: apres(source.bilan, `⚠️ ${message}`) });
    return { ok: false, message };
  }
  const plan = planDuReport(demande, source, arrivee, seances, sequences);
  if ("erreur" in plan) return { ok: false, message: plan.erreur };
  await api.creneauSave(plan.arrivee);
  await api.creneauSave(plan.source);
  return { ok: true, message: plan.resume };
}

let enCours: Promise<IssueDuReport[]> | null = null;

/**
 * Applique les reports relevés et pas encore appliqués, du plus ancien au plus
 * récent ; rend ce que chacun a donné. Un seul passage à la fois ; chaque
 * report se prend avant de s'appliquer : il ne s'applique jamais deux fois.
 */
export function appliquerLesReports(): Promise<IssueDuReport[]> {
  enCours ??= (async () => {
    try {
      const attente = await api.reportsEnAttente();
      if (!attente.length) return [];
      const [seances, sequences, edts, cache] = await Promise.all([
        api.seancesList(), api.sequencesList().catch((): Sequence[] => []), api.edtTypiqueList().catch((): EdtTypique[] => []),
        api.settingGet("vacancesCache").catch(() => null),
      ]);
      const vacances = lireCache(cache);
      const issues: IssueDuReport[] = [];
      for (const r of attente) {
        if (!(await api.reportPrendre(r.id).catch(() => false))) continue;
        const issue = await appliquerUnReport(r, seances, sequences, edts, vacances)
          .catch((e): IssueDuReport => ({ ok: false, message: `Le report n'a pas pu s'appliquer : ${texteErreur(e)}` }));
        await api.reportFini(r.id, issue.ok ? issue.message : `⚠️ ${issue.message}`).catch(() => {});
        issues.push(issue);
      }
      if (issues.some((x) => x.ok)) window.dispatchEvent(new Event(EVT_REPORT_APPLIQUE));
      return issues;
    } finally {
      enCours = null;
    }
  })();
  return enCours;
}
