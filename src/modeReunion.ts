// ── Ce qui part en ligne pendant une réunion ──────────────────────────────
//
// Trois travaux, pas un : la parole se transcrit, le compte rendu se range,
// et il se relit toutes les cinq minutes. Une seule case « Relecture » ne
// pouvait pas dire tout cela — et elle promettait que rien ne sortait, alors
// que le rangement partait quand même chez Mistral toutes les deux phrases.
//
// Trois positions, donc, et ce qu'elles disent est vrai :
//   — « rien »    : le texte s'écrit tel quel, rien ne quitte l'ordinateur ;
//   — « ranger »  : l'IA en ligne classe en points abordés, décisions, à faire ;
//   — « relire »  : et resserre tout le document régulièrement.

export type ModeIA = "rien" | "ranger" | "relire";

export const CLE_MODE = "reunionsModeIA";
/** L'ancienne case, qu'on relit une dernière fois pour ne pas changer d'avis à la place de l'enseignant. */
export const CLE_RELECTURE = "reunionsRelecture";

export const MODES: { id: ModeIA; label: string; aide: string }[] = [
  { id: "rien", label: "Rien en ligne",
    aide: "La parole s'écrit telle quelle. Aucun texte ne quitte cet ordinateur — à condition que la transcription soit locale, elle aussi." },
  { id: "ranger", label: "Ranger",
    aide: "L'IA en ligne classe le compte rendu en points abordés, décisions et choses à faire. Les prénoms d'élèves sont masqués avant l'envoi." },
  { id: "relire", label: "Ranger + relire",
    aide: "Et toutes les cinq minutes, une relecture de l'ensemble resserre le document et retire les redites." },
];

/**
 * Le mode de cette machine, en tenant compte de l'ancienne case.
 *
 * Qui avait décoché « Relecture » voulait moins d'appels, pas moins de
 * rangement : il retrouve « Ranger », et non « Rien en ligne ».
 */
export function lireMode(mode: string | null, ancienneRelecture: string | null): ModeIA {
  if (mode === "rien" || mode === "ranger" || mode === "relire") return mode;
  return ancienneRelecture === "0" ? "ranger" : "relire";
}

/** Le rangement du compte rendu passe-t-il par l'IA en ligne ? */
export const rangeEnLigne = (m: ModeIA) => m !== "rien";

/** Et la relecture de fond ? */
export const relitEnLigne = (m: ModeIA) => m === "relire";

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
