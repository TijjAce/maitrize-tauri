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
