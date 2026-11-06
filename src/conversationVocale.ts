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
//
// Puis : « on peut pas déclencher la voix réponse plus rapidement ? […] comme
// GPT live. » La question part dès que la phrase est finie — 0,8 s de silence
// quand Voxtral l'a ponctuée, 1,3 s sinon ; le micro et le direct restent
// ouverts d'une question à l'autre ; et la voix lit chaque phrase de la
// réponse dès qu'elle est écrite, la suivante préparée pendant la lecture
// (`lecteurAuFil`).
//
// Enfin : « quand je prends la parole, la voix de synthèse se coupe et me
// laisse parler » — on parle par-dessus la voix, elle se tait et l'écoute
// reprend, les premiers mots compris (voir priseDeParole.ts).
//
// « Laisse quelques millisecondes de plus là pour la réponse de l'IA »
// (l'enseignant, 5 novembre 2026, sur le 🗣) : la question partait pendant
// qu'il cherchait ses mots. Trois dixièmes de plus partout — 1,1 s après
// une phrase ponctuée, 1,6 s sinon —, entre ces délais et le 1,5 s du début.

/** Ce qu'on ajoute à la consigne quand la conversation se fait à voix haute : une réponse qui s'écoute. */
export const CONSIGNE_ORALE = "La conversation se fait à voix haute : l'enseignant t'entend, il ne te lit pas. Réponds comme à l'oral, "
  + "en deux à quatre phrases courtes, sans titre, sans liste, sans tableau, sans emoji, sauf s'il te demande une autre longueur : "
  + "sa demande passe avant. S'il demande un document long, propose-lui de le préparer à l'écran. Cette manière de répondre vient de "
  + "l'application, pas de lui : ne la lui attribue pas.";

/** Le silence qui clôt une question que Voxtral a ponctuée — « ? », « . » —, et celui d'une phrase en suspens. */
export const SILENCE_APRES_LA_PHRASE_S = 1.1;
export const SILENCE_EN_SUSPENS_S = 1.6;
/** À défaut de prise de son : plus aucun mot depuis tant de millisecondes, phrase ponctuée ou en suspens. */
export const SANS_MOT_NOUVEAU_MS = { ponctuee: 1500, enSuspens: 2100 };
const PAROLE_MIN_S = 0.4;

/**
 * La question est-elle finie ? On a parlé, puis on s'est tu : peu de temps si
 * la phrase est ponctuée, un peu plus si elle reste en suspens. À défaut —
 * la prise de son n'a rien vu —, plus aucun mot depuis 1,5 s ou 2,1 s.
 */
export function questionFinie(a: { parole: number; silence: number }, texte: string, msDepuisLeDernierMot: number): boolean {
  const t = (texte ?? "").trim();
  if (!t) return false;
  const ponctuee = /[.?!…]$/.test(t);
  if (a.parole >= PAROLE_MIN_S && a.silence >= (ponctuee ? SILENCE_APRES_LA_PHRASE_S : SILENCE_EN_SUSPENS_S)) return true;
  return msDepuisLeDernierMot >= (ponctuee ? SANS_MOT_NOUVEAU_MS.ponctuee : SANS_MOT_NOUVEAU_MS.enSuspens);
}

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

// ── Lire la réponse au fil de son écriture ────────────────────────────────

export interface LecteurAuFil {
  /** Le texte de la réponse tel qu'il est maintenant ; `fini` quand elle est complète. */
  suivre: (contenu: string, fini: boolean) => void;
  /** Tout se tait : la lecture en cours s'arrête, la suite ne vient pas. */
  arreter: () => void;
  /** Se résout quand toute la réponse a été lue, ou la lecture arrêtée. */
  fin: Promise<void>;
}

/** Ce qui est prêt à lire d'un texte qui s'écrit : jusqu'à la dernière fin de phrase suivie d'un blanc — tout, s'il est fini. */
export function pretALire(contenu: string, fini: boolean): number {
  if (fini) return contenu.length;
  let fin = 0;
  for (const m of contenu.matchAll(/[.!?…:](?=\s)|\n\n/g)) fin = (m.index ?? 0) + m[0].length;
  return fin;
}

/**
 * Une réponse lue pendant qu'elle s'écrit : chaque phrase finie part à la voix
 * aussitôt — sa voix se prépare pendant que la précédente se lit —, et se
 * joue à son tour. La première phrase s'entend avant que la réponse soit
 * finie.
 */
export function lecteurAuFil(o: {
  /** La voix d'un morceau de texte : son audio, en base64. */
  voix: (texte: string) => Promise<string>;
  /** Joue un audio jusqu'au bout ; se résout à la fin, ou quand on l'arrête. */
  jouer: (audio: string) => Promise<void>;
  /** La première voix commence. */
  surDebut?: () => void;
  surErreur?: (e: unknown) => void;
}): LecteurAuFil {
  let lu = 0;
  let fini = false;
  let arrete = false;
  let enCours = false;
  let commence = false;
  const file: Promise<string>[] = [];
  let resoudre: () => void = () => {};
  const fin = new Promise<void>((r) => { resoudre = r; });
  const conclure = () => { if ((fini && !file.length && !enCours) || arrete) resoudre(); };

  const boucle = async () => {
    if (enCours) return;
    enCours = true;
    while (file.length && !arrete) {
      const audio = await file.shift()!.catch((e) => { o.surErreur?.(e); return null; });
      if (arrete) break;
      if (!audio) continue;
      if (!commence) { commence = true; o.surDebut?.(); }
      await o.jouer(audio);
    }
    enCours = false;
    conclure();
  };

  return {
    suivre(contenu, estFini) {
      if (arrete || fini) return;
      const jusque = pretALire(contenu, estFini);
      if (jusque > lu) {
        // La toute première phrase part seule : c'est elle qu'on attend pour entendre la voix.
        const texte = texteALire(contenu.slice(lu, jusque));
        const premiere = lu === 0 ? /^.*?[.!?…:](?=\s|$)/.exec(texte)?.[0] ?? "" : "";
        const morceaux = premiere ? [premiere, ...morceauxALire(texte.slice(premiere.length), 300)] : morceauxALire(texte, 300);
        for (const morceau of morceaux) {
          const p = o.voix(morceau);
          p.catch(() => {});
          file.push(p);
        }
        lu = jusque;
      }
      if (estFini) fini = true;
      void boucle();
      conclure();
    },
    arreter() { arrete = true; file.length = 0; resoudre(); },
    fin,
  };
}
