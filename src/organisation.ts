// Quelle organisation remplit le planning d'un jour donné.
//
// L'organisation IME est fixe sur l'année et s'enregistre sous « 2026-2027·IME ».
// La génération cherchait encore l'ancienne clé semaine par semaine
// (« IME:2026-09-14 ») et ne la trouvait donc jamais.
import type { EdtTypique } from "./api";
import { anneeDe, isoJour, lundiDe } from "./dates";
import { natureDepuisTitre, minutesParNature, type Nature } from "./heures";

export interface SlotEdt {
  id: string; jour: string; heureDebut: string; heureFin: string; titre: string; couleur: string;
  eleves?: string[];
  /** Classe, ou réunion / formation. Absent : deviné d'après l'intitulé. */
  nature?: Nature;
}

/** L'organisation à utiliser pour cette date, ou null s'il n'y en a aucune. */
export function organisationPour(edts: EdtTypique[], date: Date, imeActive: boolean):
  { edt: EdtTypique; source: "ime" | "classe" } | null {
  const annee = anneeDe(isoJour(date));
  const avecCreneaux = (e?: EdtTypique) => {
    if (!e) return false;
    try { return (JSON.parse(e.slotsJson) as unknown[]).length > 0; } catch { return false; }
  };
  const ime = edts.find((e) => e.annee === `${annee}·IME`);
  const imeAncienne = edts.find((e) => e.annee === `IME:${isoJour(lundiDe(date))}`);
  const classe = edts.find((e) => e.annee === annee);
  const ordre: [EdtTypique | undefined, "ime" | "classe"][] = imeActive
    ? [[ime, "ime"], [imeAncienne, "ime"], [classe, "classe"]]
    : [[classe, "classe"], [ime, "ime"], [imeAncienne, "ime"]];
  for (const [e, source] of ordre) if (avecCreneaux(e)) return { edt: e!, source };
  return null;
}

/** Nature d'un créneau d'emploi du temps : choisie, sinon devinée. */
export const natureDuSlot = (s: SlotEdt): Nature => s.nature ?? natureDepuisTitre(s.titre);

export const JOURS_EDT = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];

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
