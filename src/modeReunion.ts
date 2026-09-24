// ── Ce qui part en ligne pendant une réunion ──────────────────────────────
//
// Le choix se fait **avant** de commencer, une fois, sur la fiche : ensuite
// l'écran ne montre plus que le texte. Pendant une réunion on écoute, on ne
// règle pas.
//
// Deux positions, et ce qu'elles disent est vrai :
//   — « local » : la parole s'écrit telle quelle, rien ne quitte l'ordinateur ;
//   — « ligne » : l'IA range le compte rendu et le relit régulièrement.
//
// La transcription, elle, tourne dans les deux cas : c'est le réglage du
// moteur (Réglages · IA) qui dit où, et une réunion locale se passe de réseau
// de bout en bout.

export type ModeIA = "local" | "ligne";

export const CLE_MODE = "reunionsModeIA";
/** L'ancienne case, relue une dernière fois pour ne pas choisir à la place de l'enseignant. */
export const CLE_RELECTURE = "reunionsRelecture";

export const MODES: { id: ModeIA; label: string; aide: string }[] = [
  { id: "local", label: "🔒 Rien ne sort d'ici",
    aide: "La parole s'écrit telle quelle. Aucun texte ne quitte cet ordinateur — à condition que la transcription soit locale elle aussi (Réglages · IA)." },
  { id: "ligne", label: "☁️ Avec l'IA en ligne",
    aide: "Le compte rendu est rangé en points abordés, décisions et choses à faire, puis relu toutes les cinq minutes. Il part chez Mistral, prénoms d'élèves masqués." },
];

/**
 * Le mode de cette machine, en tenant compte des réglages d'avant.
 *
 * « ranger » et « relire » valaient tous deux l'IA en ligne ; « rien » valait
 * le local. Qui avait décoché l'ancienne case « Relecture » voulait moins
 * d'appels, pas moins de rangement : il reste en ligne.
 */
export function lireMode(mode: string | null, ancienneRelecture: string | null): ModeIA {
  if (mode === "local" || mode === "rien") return "local";
  if (mode === "ligne" || mode === "ranger" || mode === "relire") return "ligne";
  return ancienneRelecture === "0" ? "ligne" : "ligne";
}

/** Le rangement du compte rendu passe-t-il par l'IA en ligne ? */
export const rangeEnLigne = (m: ModeIA) => m === "ligne";

/** Et la relecture de fond ? */
export const relitEnLigne = (m: ModeIA) => m === "ligne";

/**
 * Cette erreur dit-elle que la machine n'a pas de réseau ?
 *
 * On ne s'en sert pas pour deviner : on s'en sert pour cesser d'essayer, et
 * pour le dire une fois au lieu d'une fois par phrase. Les libellés viennent
 * du journal d'incidents, tels qu'ils y sont écrits.
 */
export function estUnePanneDeReseau(message: string): boolean {
  const m = message.toLowerCase();
  return [
    "envoi impossible",
    "error sending request",
    "network is unreachable",
    "dispatch failure",
    "connect timeout",
    "tcp connect error",
    "réseau :",
    "sans réponse",
    "failed to fetch",
  ].some((signe) => m.includes(signe));
}
