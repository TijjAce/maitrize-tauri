// Cahier journal : ce qui se reprend d'une semaine à l'autre, et ce qui part
// au dossier d'un élève.
//
// Les emplois du temps reviennent chaque semaine : le « prévu » d'un créneau
// ressemble souvent à celui de la semaine d'avant. Et le bilan d'un créneau
// parle d'élèves : ce qui y est écrit a sa place dans leur dossier, sans le
// retaper.

import type { Creneau, Eleve } from "./api";

/** Pour comparer deux intitulés ou prénoms : sans accents ni majuscules. */
const cle = (s: string) => (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/**
 * Le même créneau la semaine précédente, parmi ceux de ce jour-là : même
 * intitulé à la même heure d'abord, puis même intitulé, puis même heure. Seuls
 * comptent ceux où quelque chose était prévu.
 */
export function creneauDeLaSemainePrecedente(
  c: Pick<Creneau, "id" | "heureDebut" | "matiere">, candidats: Creneau[],
): Creneau | null {
  const avecPrevu = candidats.filter((x) => x.id !== c.id && (x.prevu ?? "").trim());
  const memeIntitule = (x: Creneau) => cle(c.matiere) !== "" && cle(x.matiere) === cle(c.matiere);
  return avecPrevu.find((x) => memeIntitule(x) && x.heureDebut === c.heureDebut)
    ?? avecPrevu.find(memeIntitule)
    ?? avecPrevu.find((x) => x.heureDebut === c.heureDebut)
    ?? null;
}

/** Le prévu repris vient à la suite de ce qui est déjà écrit, jamais à sa place. */
export function reprendrePrevu(actuel: string, repris: string): string {
  const r = repris.trim();
  if (!actuel.trim()) return r;
  if (actuel.includes(r)) return actuel;
  return `${actuel.replace(/\s+$/, "")}\n${r}`;
}

/**
 * Les élèves cochés d'office : le seul présent sur le créneau, sinon ceux dont
 * le prénom figure dans le texte.
 */
export function elevesCites(texte: string, eleves: Eleve[], presents: string[]): string[] {
  const parmi = presents.length ? eleves.filter((e) => presents.includes(e.id)) : eleves;
  if (presents.length === 1 && parmi.length === 1) return [parmi[0].id];
  const mots = ` ${cle(texte).replace(/[^a-z0-9]+/g, " ")} `;
  return parmi
    .filter((e) => {
      const prenom = cle(e.nom.split(/\s+/)[0] ?? "").replace(/[^a-z0-9]+/g, " ").trim();
      return prenom.length > 1 && mots.includes(` ${prenom} `);
    })
    .map((e) => e.id);
}

/** Date d'une observation tirée d'un créneau : la fin du créneau, ce jour-là. */
export function dateObservation(c: Pick<Creneau, "date" | "heureFin">): string {
  const heure = /^\d\d:\d\d$/.test(c.heureFin) ? c.heureFin : "12:00";
  const d = new Date(`${c.date.slice(0, 10)}T${heure}:00`);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}
