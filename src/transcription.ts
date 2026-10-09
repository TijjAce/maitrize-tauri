// ── Où la parole est transcrite ───────────────────────────────────────────
//
// Deux moteurs. En ligne, c'est Voxtral chez Mistral : de très bons
// résultats, mais il faut du réseau. Sur cet ordinateur, c'est Whisper, qui
// tourne **dans** l'application : l'audio ne sort pas, et une réunion en zone
// blanche s'écrit quand même — en ESS, c'est ce qui compte le plus.
//
// Trois usages, réglés chacun pour soi, avec le modèle de son choix : les
// réunions, les observations d'élève (le Dictaphone du téléphone, la dictée
// d'atelier) et les dictées au micro. Le choix se fait côté Rust, qui sait
// quels modèles sont là (voir `whisper_embarque::choix_de`).
//
// Le reste de l'intelligence (le rangement du compte rendu, la relecture)
// passe par le service en ligne dans les deux cas : un modèle local de la
// taille qu'accepte un portable d'école tient mal une consigne structurée,
// et ce document finit dans le dossier d'un élève.

import { api, texteErreur } from "./api";

export type Moteur = "ligne" | "local";

export type Usage = "reunions" | "observations" | "dictees";

export const USAGES: { id: Usage; label: string }[] = [
  { id: "reunions", label: "Réunions" },
  { id: "observations", label: "Observations d'élève" },
  { id: "dictees", label: "Dictées" },
];

/** Le réglage d'un usage : un modèle (« small »…) ou « ligne ». Il reste sur cet ordinateur, comme les modèles. */
export const cleUsage = (u: Usage) => `transcription:${u}`;

export type Choix = { moteur: "local"; modele: string } | { moteur: "ligne" };

/** Où transcrire cet usage, sur ce poste, maintenant ; ce qu'il faut dire s'il veut un modèle absent. */
export async function choixIci(usage: Usage): Promise<Choix | { erreur: string }> {
  try {
    const c = await api.transcriptionChoix(usage);
    return c.moteur === "local" ? { moteur: "local", modele: c.modele } : { moteur: "ligne" };
  } catch (e) {
    return { erreur: texteErreur(e) };
  }
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
    ? "L'audio est transcrit sur cet ordinateur et n'en sort pas — il n'est même pas écrit sur le disque."
    : "L'audio part chez Mistral AI, entreprise française, pour être transcrit, puis le texte pour être rangé.";

/** Transcrit un enregistrement, par le moteur choisi. */
export async function transcrire(audioB64: string, choix: Choix): Promise<string> {
  return choix.moteur === "local"
    ? api.transcrireLocal(audioB64, choix.modele)
    : api.transcrireAudio(audioB64, "reunion.wav");
}
