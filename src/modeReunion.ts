// ── Ce qui part en ligne pendant une réunion ──────────────────────────────
//
// Le choix se fait **avant** de commencer, une fois, sur la fiche : ensuite
// l'écran ne montre plus que le texte. Pendant une réunion on écoute, on ne
// règle pas.
//
// Deux positions, et ce qu'elles disent est vrai :
//   — « local » : la conversation reste telle quelle, aucun texte ne part ;
//   — « ligne » : après la réunion, à la demande, l'IA en fait un compte rendu
//     et reformule un passage. Plus rien ne se range pendant la réunion (« ne
//     reformule rien, juste tu transcris », 2026-11-02).
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
    aide: "La conversation reste telle qu'elle a été dite : ni compte rendu par l'IA, ni reformulation. Aucun texte ne part chez l'IA." },
  { id: "ligne", label: "☁️ Avec l'IA en ligne",
    aide: "Après la réunion, à la demande : un compte rendu rangé par l'IA, à côté de la conversation, et la reformulation d'un passage. Il part chez Mistral, les noms des élèves et des participants masqués." },
];

/**
 * Le mode de cette machine, en tenant compte des réglages d'avant.
 *
 * « ranger » et « relire » valaient tous deux l'IA en ligne ; « rien » valait
 * le local. Qui avait l'ancienne case « Relecture », cochée ou non, se servait
 * de l'IA : il reste en ligne. Qui n'a jamais choisi commence sans rien
 * envoyer — une ESS parle de santé et de handicap : c'est à l'enseignant de
 * décider que son compte rendu part, sur la fiche, avant de commencer.
 */
export function lireMode(mode: string | null, ancienneRelecture: string | null): ModeIA {
  if (mode === "local" || mode === "rien") return "local";
  if (mode === "ligne" || mode === "ranger" || mode === "relire") return "ligne";
  return ancienneRelecture === null ? "local" : "ligne";
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
