// Ce que le journal d'incidents retient d'un échec qui se répète.
//
// Une matinée hors réseau écrivait une ligne par tentative : cinq cent
// cinquante-quatre « ÉCHEC sync_deltas » en quatre jours chez son auteur, la
// même phrase recopiée, qui noyait les rares lignes intéressantes. Le journal
// sert à comprendre après coup ; il n'a pas besoin de la millième preuve que
// le stockage ne répond pas.
//
// On écrit donc le premier échec, on compte les suivants en silence, et l'on
// referme par un résumé — quand l'erreur change, ou quand ça remarche.
//
// La comparaison se fait sur la forme du message, chiffres mis à part : « HTTP
// connect timeout occurred after 4.02s » et « après 4.11s » sont le même
// incident.

/** Un échec en cours de répétition. */
export interface Repetition {
  /** Le message tel qu'il a été écrit la première fois. */
  message: string;
  /** Sa forme, chiffres neutralisés, qui sert à reconnaître le même incident. */
  forme: string;
  /** Quand la série a commencé, et sa dernière occurrence. */
  depuis: number;
  dernier: number;
  fois: number;
}

export type EtatIncidents = Map<string, Repetition>;

/** La forme d'un message : deux échecs identiques à un chiffre près se valent. */
export const forme = (message: string) => message.replace(/\d+([.,]\d+)?/g, "N");

/** « 3 min », « 1 h 20 » — de quoi situer une panne sans compter les secondes. */
export function dureeLisible(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} s`;
  const min = Math.round(s / 60);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
}

const resume = (cmd: string, r: Repetition) =>
  `ÉCHEC ${cmd} : la même erreur ${r.fois} fois de suite, sur ${dureeLisible(r.dernier - r.depuis)}`;

/**
 * Note un échec, et rend les lignes à écrire — souvent aucune.
 *
 * L'état est modifié au passage : c'est lui qui porte le décompte.
 */
export function noterEchec(
  etat: EtatIncidents, cmd: string, message: string, maintenant: number,
): string[] {
  const f = forme(message);
  const serie = etat.get(cmd);
  if (serie && serie.forme === f) {
    serie.fois += 1;
    serie.dernier = maintenant;
    return [];
  }
  // Une autre erreur : on referme la série précédente avant d'ouvrir celle-ci.
  const avant = serie && serie.fois > 1 ? [resume(cmd, serie)] : [];
  etat.set(cmd, { message, forme: f, depuis: maintenant, dernier: maintenant, fois: 1 });
  return [...avant, `ÉCHEC ${cmd} : ${message}`];
}

/** Note une réussite : referme la série en cours, s'il y en avait une. */
export function noterSucces(etat: EtatIncidents, cmd: string): string[] {
  const serie = etat.get(cmd);
  if (!serie) return [];
  etat.delete(cmd);
  return serie.fois > 1 ? [resume(cmd, serie)] : [];
}
