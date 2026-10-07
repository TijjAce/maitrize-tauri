// Les vacances scolaires, demandées une fois par jour.
//
// La liste vient d'une API du ministère. Le planning la redemandait à chaque
// ouverture : hors réseau, cela faisait quatre-vingt-quatre échecs dans le
// journal d'incidents en quelques jours, pour une information qui ne change
// pas d'une heure à l'autre — le calendrier d'une année scolaire est publié
// une fois.
//
// On lit donc d'abord ce qu'on a, et l'on ne redemande qu'au premier usage du
// jour, ou si la zone a changé.

import { api } from "./api";

export interface Periode { description: string; debut: string; fin: string }

/** Le repère rangé avec le cache : le jour de la dernière réponse, et la zone. */
export const repereDuCache = (jour: string, zone: string) => `${jour}|${zone}`;

/** Faut-il redemander la liste ? */
export function aRafraichir(repere: string, jour: string, zone: string): boolean {
  return repere !== repereDuCache(jour, zone);
}

/** Les périodes rangées, ou rien si le cache est vide ou illisible. */
export function lireCache(brut: string | null | undefined): Periode[] {
  if (!brut) return [];
  try {
    const v = JSON.parse(brut);
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}

/** La période qui contient ce jour, s'il y en a une. */
export const vacanceDuJour = (periodes: Periode[], jour: string) =>
  periodes.find((v) => jour >= v.debut && jour < v.fin)?.description;

/** Les vacances qui ferment une période : après elles, on passe à la suivante. */
const ENTRE_DEUX_PERIODES = /toussaint|no[eë]l|hiver|printemps/i;

/**
 * La période scolaire d'un jour, de 1 à 5 : on compte les vacances déjà
 * commencées depuis la rentrée — Toussaint, Noël, hiver, printemps.
 *
 * Sans le calendrier de cette année-là (hors réseau, ou pas encore publié),
 * les mois en donnent une approximation : septembre-octobre, novembre-
 * décembre, janvier-février, mars-avril, puis mai jusqu'à l'été.
 */
export function periodeDuJour(jour: string, vacances: Periode[]): number {
  const annee = Number(jour.slice(0, 4));
  const mois = Number(jour.slice(5, 7));
  const rentree = `${mois >= 8 ? annee : annee - 1}-08-01`;
  const ete = `${mois >= 8 ? annee + 1 : annee}-08-01`;
  const siennes = vacances.filter((v) => ENTRE_DEUX_PERIODES.test(v.description) && v.debut >= rentree && v.debut < ete);
  if (siennes.length >= 4) return Math.min(5, 1 + siennes.filter((v) => v.debut <= jour).length);
  if (mois === 9 || mois === 10) return 1;
  if (mois >= 11) return 2;
  if (mois <= 2) return 3;
  return mois <= 4 ? 4 : 5;
}

/** La prochaine période à venir, s'il y en a une. */
export const prochaineVacance = (periodes: Periode[], jour: string) =>
  periodes.filter((v) => v.fin > jour).sort((a, b) => a.debut.localeCompare(b.debut))[0];

/**
 * Les vacances : celles qu'on a déjà, rafraîchies au plus une fois par jour.
 *
 * Une panne de réseau ne coûte rien — on garde ce qu'on avait, sans même
 * appeler.
 */
export async function chargerVacances(jour: string): Promise<Periode[]> {
  const [brut, repere, zoneLue] = await Promise.all([
    api.settingGet("vacancesCache").catch(() => ""),
    api.settingGet("vacancesCacheRepere").catch(() => ""),
    api.settingGet("zoneVacances").catch(() => ""),
  ]);
  const zone = zoneLue || "A";
  const cache = lireCache(brut);
  if (cache.length && !aRafraichir(repere ?? "", jour, zone)) return cache;
  try {
    const v = await api.vacancesScolaires(zone);
    await api.settingSet("vacancesCache", JSON.stringify(v));
    await api.settingSet("vacancesCacheRepere", repereDuCache(jour, zone));
    return v;
  } catch {
    return cache;
  }
}

// ── Les cinq périodes d'une année scolaire ────────────────────────────────

/** Une période de classe : du jour de la reprise au dernier jour avant les vacances, compris. */
export interface PeriodeDeClasse { numero: number; debut: string; fin: string }

/** Le jour d'avant, en AAAA-MM-JJ : la veille des vacances est le dernier jour de classe. */
export function veille(jour: string): string {
  const d = new Date(`${jour}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Les cinq périodes de l'année qui commence en `anneeDebut` : de la rentrée
 * aux vacances de la Toussaint, puis d'une vacance à l'autre, jusqu'à l'été.
 * Rien quand le calendrier de cette année manque — hors réseau, ou pas encore
 * publié : on n'invente pas de dates.
 */
export function periodesDeLAnnee(vacances: Periode[], anneeDebut: number): PeriodeDeClasse[] {
  const dans = (v: Periode, de: string, a: string) => v.debut.slice(0, 10) >= de && v.debut.slice(0, 10) < a;
  const annee = vacances.filter((v) => dans(v, `${anneeDebut}-08-15`, `${anneeDebut + 1}-08-15`));
  const trouve = (motif: RegExp, liste = annee) => liste.find((v) => motif.test(v.description));
  const toussaint = trouve(/toussaint/i), noel = trouve(/no[eë]l/i), hiver = trouve(/hiver/i), printemps = trouve(/printemps/i);
  const ete = trouve(/[ée]t[ée]/i);
  // La rentrée : la fin des vacances d'été qui la précèdent.
  const etePrecedent = vacances.find((v) => /[ée]t[ée]/i.test(v.description) && v.fin.slice(0, 10) >= `${anneeDebut}-08-15` && v.fin.slice(0, 10) < `${anneeDebut}-10-01`);
  if (!etePrecedent || !toussaint || !noel || !hiver || !printemps || !ete) return [];
  const bornes: [string, string][] = [
    [etePrecedent.fin, toussaint.debut], [toussaint.fin, noel.debut], [noel.fin, hiver.debut], [hiver.fin, printemps.debut], [printemps.fin, ete.debut],
  ];
  return bornes.map(([reprise, depart], i) => ({ numero: i + 1, debut: reprise.slice(0, 10), fin: veille(depart.slice(0, 10)) }));
}

/** Le numéro d'un jour, pour compter les jours entre deux dates. */
const numeroDuJour = (jour: string) => Math.round(Date.parse(`${jour}T12:00:00Z`) / 86400000);

/**
 * Les semaines de classe de l'année : les semaines du calendrier, du lundi au
 * dimanche, que touche chaque période — une rentrée un mardi compte sa
 * semaine. On retrouve les trente-six semaines de l'année scolaire.
 */
export function semainesDeClasse(periodes: PeriodeDeClasse[]): number {
  return periodes.reduce((t, p) => {
    const jourSemaine = (new Date(`${p.debut}T12:00:00Z`).getUTCDay() + 6) % 7;
    return t + Math.floor((numeroDuJour(p.fin) - (numeroDuJour(p.debut) - jourSemaine)) / 7) + 1;
  }, 0);
}
