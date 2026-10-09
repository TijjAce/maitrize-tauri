// La fin de l'année scolaire : laisser place à la classe suivante.
//
// Les élèves d'une année n'ont pas à rester dans Maitrize une fois partis :
// leurs dossiers parlent de santé, de handicap, de familles. Dès le premier
// jour des vacances d'été, une fenêtre le dit, propose d'exporter leurs
// données, et de supprimer ceux qui partent. Rien ne part sans que
// l'enseignant le confirme : en IME ou en ULIS, des élèves restent plusieurs
// années, et ceux-là se cochent pour être gardés.
//
// Un élève est « de l'année finie » s'il n'a pas été gardé pour la suivante
// et qu'il n'est pas arrivé depuis l'été — un élève créé en août pour la
// rentrée ne doit pas passer pour un partant.

import type { Eleve } from "./api";
import type { Periode } from "./vacances";

export interface FinDAnnee {
  /** L'année qui se termine, « 2026-2027 ». */
  annee: string;
  /** L'année qui vient. */
  suivante: string;
  /** Le premier jour des vacances d'été : à partir de lui, l'année est finie. */
  debutEte: string;
}

/** Le premier jour des vacances d'été de cette année civile, d'après le calendrier ; le 4 juillet sans lui. */
export function debutDeLEte(vacances: Periode[], annee: number): string {
  const ete = vacances.find((v) => /[ée]t[ée]/i.test(v.description) && v.debut.slice(0, 4) === String(annee));
  return ete ? ete.debut.slice(0, 10) : `${annee}-07-04`;
}

/** La dernière fin d'année à cette date : celle de cet été s'il a commencé, sinon celle de l'été d'avant. */
export function derniereFinDAnnee(jour: string, vacances: Periode[]): FinDAnnee {
  const a = Number(jour.slice(0, 4));
  const cetEte = debutDeLEte(vacances, a);
  const fin = jour >= cetEte ? a : a - 1;
  return { annee: `${fin - 1}-${fin}`, suivante: `${fin}-${fin + 1}`, debutEte: fin === a ? cetEte : debutDeLEte(vacances, fin) };
}

/** Un élève de l'année finie : ni gardé pour la suivante, ni arrivé depuis l'été. */
export function estDeLAnneeFinie(e: Eleve, fin: FinDAnnee): boolean {
  if (e.anneeScolaire) return e.anneeScolaire <= fin.annee;
  return !e.dateCreation || e.dateCreation.slice(0, 10) < fin.debutEte;
}

export const elevesDeLAnneeFinie = (eleves: Eleve[], fin: FinDAnnee) => eleves.filter((e) => estDeLAnneeFinie(e, fin));

/** Faut-il ouvrir la fenêtre ? Des élèves à traiter, et pas de rappel remis à un jour à venir. */
export function aMontrer(eleves: Eleve[], fin: FinDAnnee, rappel: string | null | undefined, jour: string): boolean {
  if (rappel && jour < rappel) return false;
  return elevesDeLAnneeFinie(eleves, fin).length > 0;
}

/** Le lendemain d'un jour, en AAAA-MM-JJ : « Plus tard » y remet la fenêtre. */
export function lendemain(jour: string): string {
  const d = new Date(`${jour}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Le réglage, propre à cet ordinateur, du jour où la fenêtre revient. */
export const CLE_RAPPEL = "finAnneeRappel";
