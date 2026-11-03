// ── Parler avec l'Assistant, à voix haute ─────────────────────────────────
//
// « Je veux qu'il puisse me répondre également, et je veux bien pouvoir
// chuchoter » (l'enseignant, 3 novembre 2026), après la dictée en direct de
// l'Assistant : une conversation comme avec ChatGPT en direct. On parle — même
// tout bas : la prise de son ramène la voix, et c'est elle qui dit qu'on
// parle (voir priseDeSon.ts) — ; un silence d'une seconde et demie après la
// parole envoie la question ; la réponse s'écrit, puis la voix de Mistral la
// lit (adresse européenne, voir `voix_lire`), et l'écoute reprend. Pendant
// qu'elle lit, le micro se tait : il s'entendrait lui-même.

/** Ce qu'on ajoute à la consigne quand la conversation se fait à voix haute : une réponse qui s'écoute. */
export const CONSIGNE_ORALE = "La conversation se fait à voix haute : l'enseignant t'entend, il ne te lit pas. Réponds comme à l'oral, "
  + "en deux à quatre phrases courtes, sans titre, sans liste, sans tableau, sans emoji. S'il demande un document long — une séquence, "
  + "une fiche —, propose-lui de le préparer par écrit.";

/** Le silence qui clôt une question : une seconde et demie, après au moins quatre dixièmes de seconde de parole. */
export const SILENCE_DE_FIN_S = 1.5;
const PAROLE_MIN_S = 0.4;

/** La question est-elle finie ? On a parlé, puis on s'est tu assez longtemps. */
export const questionFinie = (a: { parole: number; silence: number }): boolean =>
  a.parole >= PAROLE_MIN_S && a.silence >= SILENCE_DE_FIN_S;

/**
 * Une réponse écrite, telle qu'on la lit à voix haute : sans la mise en
 * forme — titres, gras, liens, tableaux, code —, sans emoji, ses listes en
 * phrases. La voix lirait « astérisque » ou « dièse ».
 */
export function texteALire(markdown: string): string {
  return (markdown ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    // Un tableau : sa ligne de séparation s'en va, ses cases se lisent à la suite.
    // (En début et en fin de ligne, seulement des espaces : `\s` mangerait le retour à la ligne d'à côté.)
    .replace(/^[ \t]*\|?[ \t]*:?-{3,}:?[ \t]*(\|[ \t]*:?-{3,}:?[ \t]*)*\|?[ \t]*$/gm, "")
    .replace(/^[ \t]*\|(.*)\|[ \t]*$/gm, (_l, cases: string) => `${cases.split("|").map((c) => c.trim()).filter(Boolean).join(", ")}.`)
    .replace(/^[ \t]{0,3}#{1,6}[ \t]+(.*)$/gm, "$1.")
    .replace(/^[ \t]*(?:[-*+•]|\d+[.)])[ \t]+(.*)$/gm, "$1.")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(^|[^\p{L}\d])[*_]([^*_\n]+)[*_](?=[^\p{L}\d]|$)/gu, "$1$2")
    .replace(/[*_~>#]/g, " ")
    .replace(/\p{Extended_Pictographic}\uFE0F?/gu, " ")
    .replace(/\.(\s*\.)+/g, ".")
    .replace(/([.!?:;,])\./g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Le texte en morceaux que la voix lit d'une traite : jamais plus de `max`
 * caractères (la voix en refuse au-delà de mille), coupés aux fins de
 * phrase — ou, pour une phrase trop longue, aux virgules, puis aux espaces.
 */
export function morceauxALire(texte: string, max = 900): string[] {
  const phrases = (texte ?? "").match(/[^.!?…]+(?:[.!?…]+|$)/g)?.map((p) => p.trim()).filter(Boolean) ?? [];
  const morceaux: string[] = [];
  let courant = "";
  const poser = (p: string) => {
    if (!courant) courant = p;
    else if (courant.length + 1 + p.length <= max) courant += ` ${p}`;
    else { morceaux.push(courant); courant = p; }
  };
  for (const phrase of phrases) {
    if (phrase.length <= max) { poser(phrase); continue; }
    // Une phrase trop longue : par virgules, puis par mots.
    let reste = phrase;
    while (reste.length > max) {
      const virgule = reste.lastIndexOf(",", max - 1);
      const espace = reste.lastIndexOf(" ", max);
      const coupe = virgule > max / 2 ? virgule + 1 : espace > 0 ? espace : max;
      poser(reste.slice(0, coupe).trim());
      reste = reste.slice(coupe).trim();
    }
    if (reste) poser(reste);
  }
  if (courant) morceaux.push(courant);
  return morceaux;
}
