// Manipulation des dates et des horaires, partagée par le planning,
// l'organisation et le plan de salle.
//
// Ces fonctions étaient recopiées dans trois pages : une correction dans
// l'une ne suivait pas dans les autres. Elles sont pures, donc testées
// (voir dates.test.ts) — c'est le socle horaire de toute l'app.

/** Date locale au format AAAA-MM-JJ (jamais UTC : `toISOString` décale d'un jour le soir). */
export const isoJour = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Lundi de la semaine contenant `d`, à minuit. */
export function lundiDe(d: Date): Date {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Même date décalée de `n` jours (sans modifier l'originale). */
export function plusJours(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/**
 * Jour ouvert à l'arrivée sur le planning : aujourd'hui, le lendemain s'il
 * est passé 18 h, puis le lundi suivant si on tombe un week-end.
 */
export function jourPlanningInitial(maintenant = new Date()): Date {
  const d = new Date(maintenant);
  d.setHours(0, 0, 0, 0);
  if (maintenant.getHours() >= 18) d.setDate(d.getDate() + 1);
  const jour = d.getDay(); // 0 = dimanche, 6 = samedi
  if (jour === 6) d.setDate(d.getDate() + 2);
  else if (jour === 0) d.setDate(d.getDate() + 1);
  return d;
}

/**
 * Année scolaire contenant une date ISO. La bascule est au **1er août**, pas
 * en septembre : en août l'enseignant prépare déjà la rentrée, ses documents
 * doivent atterrir dans la nouvelle année.
 */
export const anneeDe = (dateIso: string) => {
  const d = new Date(dateIso);
  const y = d.getFullYear();
  return d.getMonth() >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
};

/** « 09:30 » → 570 minutes. Tolère une valeur vide ou mal formée. */
export const toMin = (hhmm: string) => {
  const [h, m] = (hhmm || "").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** 570 → « 09:30 ». */
export const minToHHMM = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** « 09:30:00 » → « 9h30 », pour l'affichage. */
export const hhmm = (h: string) => h.slice(0, 5).replace(":", "h");

/** Deux créneaux se chevauchent-ils ? Se toucher bout à bout ne compte pas. */
export const seChevauchent = (a: { debut: string; fin: string }, b: { debut: string; fin: string }) =>
  toMin(a.debut) < toMin(b.fin) && toMin(b.debut) < toMin(a.fin);
