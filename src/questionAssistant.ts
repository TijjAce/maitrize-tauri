// ── Une question préparée ailleurs, pour l'assistant ──────────────────────
//
// Un livre des listes de référence, dans les Ressources : « Présenter ce
// livre » mène à l'assistant, la question déjà écrite dans la zone de saisie.
// Elle n'y part pas toute seule : on la relit, on la complète, on l'envoie.
//
// L'assistant n'est peut-être pas encore monté quand on la prépare (les
// pages ne le sont qu'à leur première visite) : la question l'attend ici, et
// il la prend en arrivant ; déjà monté, l'événement le prévient.

export const EVT_QUESTION_ASSISTANT = "maitrize:question-assistant";

let enAttente = "";

export function preparerQuestion(texte: string) {
  enAttente = texte;
  window.dispatchEvent(new CustomEvent(EVT_QUESTION_ASSISTANT));
}

/** La question qui attend, une seule fois. */
export function prendreQuestion(): string {
  const t = enAttente;
  enAttente = "";
  return t;
}
