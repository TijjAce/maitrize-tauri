// ── Où la parole est transcrite ───────────────────────────────────────────
//
// Deux moteurs, un choix. En ligne, c'est Voxtral chez Mistral : rien à
// installer, et de très bons résultats. En local, c'est Whisper sur la
// machine de l'enseignant : l'audio ne sort pas — et en réunion, c'est ce
// qui compte le plus.
//
// Le reste de l'intelligence (le rangement du compte rendu, la relecture)
// passe par le service en ligne dans les deux cas : un modèle local de la
// taille qu'accepte un portable d'école tient mal une consigne structurée,
// et ce document finit dans le dossier d'un élève.

import { api } from "./api";
import type { Format } from "./ecoute";
import { MORCEAU_S } from "./reunion";

export type Moteur = "ligne" | "local";

export const CLE_MOTEUR = "moteurTranscription";

/** Le moteur choisi sur ce poste. En ligne par défaut : rien à installer. */
export async function moteurActif(): Promise<Moteur> {
  const v = await api.settingGet(CLE_MOTEUR).catch(() => null);
  return v === "local" ? "local" : "ligne";
}

/**
 * Le format d'enregistrement qu'attend ce moteur.
 *
 * Whisper lit un WAV 16 kHz ; Voxtral prend ce que le navigateur produit, et
 * autant lui envoyer de l'audio compressé — le réseau d'une école n'est pas
 * celui d'un bureau.
 */
export const formatDe = (m: Moteur): Format => (m === "local" ? "wav" : "compresse");

/**
 * Tous les combien la parole part se faire transcrire.
 *
 * En local, il n'y a ni quota ni réseau à ménager : on coupe court pour que
 * le texte arrive presque tout de suite. En ligne, on espace — chaque envoi
 * coûte, et une école a rarement du débit.
 */
export const secondesParMorceau = (m: Moteur): number => (m === "local" ? 12 : MORCEAU_S);

/** Ce qu'il faut dire à l'enseignant sur ce que devient son audio. */
export const sortieDeLAudio = (m: Moteur): string =>
  m === "local"
    ? "L'audio est transcrit sur cet ordinateur et n'en sort pas. Il passe par un fichier temporaire, effacé aussitôt après."
    : "L'audio part chez Mistral (serveurs en Europe) pour être transcrit, puis le texte pour être rangé.";

/** Transcrit un enregistrement, par le moteur choisi. */
export async function transcrire(audioB64: string, moteur: Moteur): Promise<string> {
  return moteur === "local"
    ? api.transcrireLocal(audioB64)
    : api.transcrireAudio(audioB64, "reunion.webm");
}
