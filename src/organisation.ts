// Quel emploi du temps remplit le planning d'un jour donné.
//
// Un seul emploi du temps par année, sous la clé de l'année (« 2026-2027 ») :
// l'EDT de classe et l'organisation IME ne font plus qu'un (voir
// `fusionner_emplois_du_temps`, côté Rust). Les anciennes clés — « ·IME », et
// avant elle la semaine (« IME:2026-09-14 ») — se lisent encore, pour ce
// qu'enverrait un ordinateur resté à une version d'avant.
import type { EdtTypique } from "./api";
import { anneeDe, isoJour, lundiDe } from "./dates";
import { natureDepuisTitre, minutesParNature, type Nature } from "./heures";

export interface SlotEdt {
  id: string; jour: string; heureDebut: string; heureFin: string; titre: string; couleur: string;
  eleves?: string[];
  /** Classe, ou réunion / formation. Absent : deviné d'après l'intitulé. */
  nature?: Nature;
}

/** L'emploi du temps à utiliser pour cette date, ou null s'il n'y en a aucun. */
export function organisationPour(edts: EdtTypique[], date: Date): EdtTypique | null {
  const annee = anneeDe(isoJour(date));
  const avecCreneaux = (e?: EdtTypique) => {
    if (!e) return false;
    try { return (JSON.parse(e.slotsJson) as unknown[]).length > 0; } catch { return false; }
  };
  for (const cle of [annee, `${annee}·IME`, `IME:${isoJour(lundiDe(date))}`]) {
    const e = edts.find((x) => x.annee === cle);
    if (avecCreneaux(e)) return e!;
  }
  return null;
}

/** Nature d'un créneau d'emploi du temps : choisie, sinon devinée. */
export const natureDuSlot = (s: SlotEdt): Nature => s.nature ?? natureDepuisTitre(s.titre);

export const JOURS_EDT = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];

const HEURE = /^\d{1,2}:\d{2}$/;

/**
 * Les créneaux d'un fichier d'emploi du temps exporté (`{ annee, slots }`, ou la liste seule) ; rien pour un autre
 * fichier — une progression, une programmation prise par erreur ne doivent pas vider l'année.
 */
export function creneauxDuFichier(contenu: unknown): Omit<SlotEdt, "id">[] | null {
  const liste = Array.isArray(contenu) ? contenu : (contenu as { slots?: unknown } | null)?.slots;
  if (!Array.isArray(liste) || !liste.length) return null;
  const creneau = (x: unknown): x is SlotEdt => {
    const s = x as Partial<SlotEdt> | null;
    return !!s && typeof s === "object" && typeof s.jour === "string" && typeof s.titre === "string"
      && typeof s.heureDebut === "string" && HEURE.test(s.heureDebut) && typeof s.heureFin === "string" && HEURE.test(s.heureFin);
  };
  return liste.every(creneau) ? liste.map((s) => ({ ...s, couleur: typeof s.couleur === "string" ? s.couleur : "" })) : null;
}

export interface Temps { classe: number; reunion: number; total: number }

/**
 * Temps de travail de la semaine type, en minutes : classe, réunions et
 * formations, et total, pour la semaine et pour chaque jour.
 *
 * Deux groupes pris en même temps ne comptent qu'une fois ; le total fusionne
 * aussi une réunion qui déborde sur un temps de classe.
 */
export function tempsDeLaSemaineType(slots: SlotEdt[]): { semaine: Temps; jours: Record<string, Temps> } {
  const plages = (liste: SlotEdt[], toutEnClasse = false) => liste.map((s) => ({
    date: s.jour, heureDebut: s.heureDebut, heureFin: s.heureFin,
    nature: toutEnClasse ? "classe" : natureDuSlot(s),
  }));
  const mesurer = (liste: SlotEdt[]): Temps => {
    const n = minutesParNature(plages(liste));
    return { ...n, total: minutesParNature(plages(liste, true)).classe };
  };
  const jours: Record<string, Temps> = {};
  for (const j of JOURS_EDT) jours[j] = mesurer(slots.filter((s) => s.jour === j));
  const semaine = Object.values(jours).reduce(
    (a, t) => ({ classe: a.classe + t.classe, reunion: a.reunion + t.reunion, total: a.total + t.total }),
    { classe: 0, reunion: 0, total: 0 });
  return { semaine, jours };
}
