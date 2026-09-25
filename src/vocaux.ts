// ── Les vocaux déposés par le téléphone ───────────────────────────────────
//
// Le téléphone n'emporte rien de la classe : ni les élèves, ni le planning,
// ni les séances. Il enregistre du son et l'heure, et c'est tout. Perdu dans
// un couloir, il ne trahit personne.
//
// C'est l'ordinateur qui sait ce qui se passait à 10 h 12, parce qu'il a le
// cahier journal. Il rapproche donc chaque vocal de son créneau, le transcrit
// sur place avec Whisper, et le propose — jamais il ne l'écrit tout seul dans
// un bilan : une transcription se relit avant d'entrer dans le dossier d'un
// élève.

import type { Creneau } from "./api";

/** Un vocal tel qu'il arrive du téléphone. */
export interface Vocal {
  id: string;
  fichier: string;
  /** Quand l'enregistrement a commencé, en ISO local. */
  debut: string;
  dureeS: number;
  texte: string;
  /** « recu », « transcrit » ou « echec ». */
  etat: string;
  erreur: string;
  dateCreation: string;
}

/** Le jour d'un vocal, au format du planning. */
export const jourDuVocal = (v: { debut: string }) => (v.debut || "").slice(0, 10);

/** L'heure d'un vocal, en minutes depuis minuit — -1 si on ne sait pas. */
export function minutesDuVocal(debut: string): number {
  const m = /T(\d{2}):(\d{2})/.exec(debut || "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : -1;
}

const enMinutes = (hhmm: string) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm || "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : -1;
};

/**
 * Le créneau où ce vocal a été dit, s'il y en a un.
 *
 * D'abord celui qui contient l'heure. À défaut — on enregistre souvent juste
 * après, en sortant de la salle — le dernier créneau terminé dans la
 * demi-heure précédente. Au-delà, on ne devine pas : l'enseignant choisira.
 */
export function creneauDuVocal(
  debut: string, creneaux: Creneau[], toleranceMin = 30,
): Creneau | null {
  const jour = debut.slice(0, 10);
  const minute = minutesDuVocal(debut);
  if (!jour || minute < 0) return null;
  const duJour = creneaux
    .filter((c) => (c.date ?? "").slice(0, 10) === jour)
    .sort((a, b) => enMinutes(a.heureDebut) - enMinutes(b.heureDebut));

  const dedans = duJour.find((c) =>
    enMinutes(c.heureDebut) <= minute && minute < enMinutes(c.heureFin));
  if (dedans) return dedans;

  // Juste après la sortie : le dernier créneau fini, s'il vient de finir.
  const finis = duJour.filter((c) => enMinutes(c.heureFin) <= minute);
  const dernier = finis[finis.length - 1];
  if (dernier && minute - enMinutes(dernier.heureFin) <= toleranceMin) return dernier;
  return null;
}

/**
 * Ce que devient le bilan d'un créneau quand on y verse un vocal.
 *
 * On ajoute à la suite, à la ligne, sans jamais écraser : le bilan déjà
 * écrit à la main est le travail de l'enseignant, le vocal n'est qu'un
 * renfort.
 */
export function verserDansLeBilan(bilan: string, texte: string): string {
  const propre = texte.trim();
  if (!propre) return bilan;
  const avant = (bilan || "").trimEnd();
  return avant ? `${avant}\n${propre}` : propre;
}

/** Ce qu'on affiche d'un vocal en attente : l'heure, et la durée. */
export function repereDuVocal(v: { debut: string; dureeS: number }): string {
  const m = /T(\d{2}):(\d{2})/.exec(v.debut || "");
  const heure = m ? `${m[1]}h${m[2]}` : "heure inconnue";
  const s = Math.round(v.dureeS || 0);
  const duree = s >= 60 ? `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")}` : `${s} s`;
  return `${heure} · ${duree}`;
}

/** Les vocaux d'un jour donné, les plus anciens d'abord. */
export const vocauxDuJour = (vocaux: Vocal[], jour: string) =>
  vocaux.filter((v) => jourDuVocal(v) === jour).sort((a, b) => a.debut.localeCompare(b.debut));
