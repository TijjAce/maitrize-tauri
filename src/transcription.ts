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

export type Moteur = "ligne" | "local";

export const CLE_MOTEUR = "moteurTranscription";

/** Le moteur choisi sur ce poste. En ligne par défaut : rien à installer. */
export async function moteurActif(): Promise<Moteur> {
  const v = await api.settingGet(CLE_MOTEUR).catch(() => null);
  return v === "local" ? "local" : "ligne";
}

/**
 * Combien de parole il faut avant de couper sur un silence.
 *
 * La coupe suit les phrases (voir `audioWav.fautIlCouper`) : ce seuil dit
 * seulement à partir de quand une phrase vaut un envoi. En local, il n'y a ni
 * quota ni réseau à ménager, donc on écrit presque en suivant la parole ; en
 * ligne, on regroupe un peu plus pour ne pas multiplier les appels.
 */
export const paroleMinimale = (m: Moteur): number => (m === "local" ? 1.5 : 5);

/**
 * Au-delà, on coupe même si personne ne s'arrête de parler.
 *
 * Sans ce plafond, un intervenant qui enchaîne sans respirer ferait attendre
 * le texte indéfiniment.
 */
export const plafondDuMorceau = (m: Moteur): number => (m === "local" ? 12 : 20);

/** Ce qu'il faut dire à l'enseignant sur ce que devient son audio. */
export const sortieDeLAudio = (m: Moteur): string =>
  m === "local"
    ? "L'audio est transcrit sur cet ordinateur et n'en sort pas. Il passe par un fichier temporaire, effacé aussitôt après."
    : "L'audio part chez Mistral (serveurs en Europe) pour être transcrit, puis le texte pour être rangé.";

/** Transcrit un enregistrement, par le moteur choisi. */
export async function transcrire(audioB64: string, moteur: Moteur): Promise<string> {
  return moteur === "local"
    ? api.transcrireLocal(audioB64)
    : api.transcrireAudio(audioB64, "reunion.wav");
}
