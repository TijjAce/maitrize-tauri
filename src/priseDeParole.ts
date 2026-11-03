// ── La voix se tait quand on prend la parole ──────────────────────────────
//
// « Il faut que quand je prenne la parole, la voix de synthèse se coupe et me
// laisse parler » (l'enseignant, 3 novembre 2026), dans la conversation à
// voix haute de l'Assistant IA (voir conversationVocale.ts).
//
// Le micro entend aussi la voix de l'Assistant, qui sort des haut-parleurs :
// guetter un son ne suffit pas, la voix en est un. Mais on sait ce qu'elle
// joue, et à quel instant : son niveau, toutes les 20 ms (`enveloppe`). Ce
// que le micro en entend — son écho — en est une part à peu près fixe pour une
// pièce, un micro et un volume donnés : on la mesure pendant qu'elle parle
// seule, et on la garde d'une réponse à l'autre — qui continue sa phrase quand
// la réponse commence la coupe dès ses premiers mots. La toute première réponse
// mesure son écho avant de se laisser couper. L'enseignant prend la parole
// quand le micro entend nettement plus que cet écho — deux fois plus —, un
// quart de seconde durant : une toux, un claquement ne coupent rien. Avec un
// casque, l'écho est nul et un murmure suffit ; avec des haut-parleurs, il faut
// parler un peu plus fort que la voix n'arrive au micro. Si le volume monte
// d'un coup, la voix peut se couper une fois d'elle-même ; la réponse suivante
// repart alors de ce que le micro entendait, et ne recommence pas.

/** Le pas de l'enveloppe de la voix : 20 ms. */
export const PAS_ENVELOPPE_S = 0.02;
/** La fenêtre où l'on prend le niveau de la voix : son écho arrive au micro un peu après, et traîne un peu. */
export const FENETRE_ECHO_S = 0.3;
/** Combien la parole doit dépasser l'écho attendu : deux fois (+6 dB). Essayé en simulation : aucune voix ne s'y coupe
 *  d'elle-même, même un écho qui varie de 40 % d'une trame à l'autre (priseDeParole.test.ts). */
const AU_DESSUS_DE_L_ECHO = 2;
/** Combien elle doit dépasser le bruit de fond, comme ailleurs (voir priseDeSon.ts). */
const AU_DESSUS_DU_FOND = 2;
/** Le plus bas qu'on prenne pour de la parole (voir priseDeSon.ts). */
const SEUIL_PAROLE = 0.0012;
/** Le temps de parole par-dessus la voix qui la coupe : un quart de seconde. */
export const DUREE_PRISE_DE_PAROLE_S = 0.25;
/** Seules les trames où la voix porte apprennent l'écho : dans un passage faible, le souffle de la pièce le fausserait. */
const VOIX_QUI_PORTE = 0.03;
/** L'écho se mesure sur les trois dernières secondes ; il en faut une demi pour s'y fier. */
const MEMOIRE_S = 3;
export const MESURE_MIN_S = 0.5;
/** Le souffle de la pièce, ôté du micro avant de comparer : une fois et demie le plus calme. */
const SOUFFLE = 1.5;

/** Le niveau d'un son, toutes les `pas` secondes : sa valeur efficace sur chaque pas. */
export function enveloppe(echantillons: Float32Array, taux: number, pas = PAS_ENVELOPPE_S): Float32Array {
  const n = Math.max(1, Math.round(taux * pas));
  const sortie = new Float32Array(Math.ceil(echantillons.length / n));
  for (let k = 0; k < sortie.length; k++) {
    let somme = 0;
    const fin = Math.min(echantillons.length, (k + 1) * n);
    for (let i = k * n; i < fin; i++) somme += echantillons[i] * echantillons[i];
    sortie[k] = Math.sqrt(somme / Math.max(1, fin - k * n));
  }
  return sortie;
}

/** Le niveau le plus fort de la voix dans la fenêtre qui précède l'instant `t` de sa lecture : son écho, au plus. */
export function niveauJoue(env: Float32Array, t: number, pas = PAS_ENVELOPPE_S, fenetre = FENETRE_ECHO_S): number {
  if (!env.length || !Number.isFinite(t)) return 0;
  const fin = Math.min(env.length - 1, Math.floor(t / pas));
  let max = 0;
  for (let k = Math.max(0, Math.floor((t - fenetre) / pas)); k <= fin; k++) if (env[k] > max) max = env[k];
  return max;
}

/** Une trame du micro, et ce que jouait la voix au même moment. */
export interface TrameEntendue {
  /** Le niveau du micro, avant le gain automatique, et le bruit de fond de la pièce (voir priseDeSon.ts). */
  micro: number;
  fond: number;
  /** Le niveau de la voix (voir `niveauJoue`) ; `null` : on ne le sait pas encore, rien ne coupe. */
  voix: number | null;
  /** La durée de la trame, en secondes. */
  duree: number;
}

export interface DetecteurDePriseDeParole {
  /** Une trame de plus ; vrai quand l'enseignant parle par-dessus la voix depuis un quart de seconde. */
  entendre: (t: TrameEntendue) => boolean;
  /** L'écho mesuré : la part de la voix que le micro entend ; null tant qu'il n'est pas mesuré. */
  couplage: () => number | null;
  /** Depuis combien de secondes on parle par-dessus la voix : ce qu'il faut rendre au direct (voir dicteeEnDirect.ts). */
  depuis: () => number;
  /**
   * L'écho à garder pour la réponse suivante. Après une coupure, au moins ce que le micro entendait alors : si ce
   * n'était pas l'enseignant mais la voix — le volume monté d'un coup —, la réponse suivante ne se coupe pas d'elle-même,
   * le temps de remesurer son écho.
   */
  aRetenir: () => number | null;
}

/** Guette la prise de parole pendant qu'une réponse se lit ; `couplageConnu` : l'écho gardé de la réponse d'avant. */
export function detecteurDePriseDeParole(couplageConnu: number | null = null): DetecteurDePriseDeParole {
  let couplage = couplageConnu;
  const mesures: { rapport: number; duree: number }[] = [];
  let mesuree = 0;
  let parle = 0;
  let depuis = 0;
  let pic = 0;
  return {
    entendre({ micro, fond, voix, duree }) {
      if (voix === null || !Number.isFinite(micro)) { parle = 0; depuis = 0; pic = 0; return false; }
      // Tant que l'écho n'est pas mesuré, rien ne coupe.
      const auDessus = couplage !== null
        && micro > Math.max(SEUIL_PAROLE, fond * AU_DESSUS_DU_FOND, fond + couplage * voix * AU_DESSUS_DE_L_ECHO);
      // La voix parle seule : ce que le micro en entend dit son écho. Le plus fort des rapports récents — celui où la
      // voix et son écho coïncident — : mieux vaut un écho supposé trop fort, qui coupe moins, que trop faible.
      if (!auDessus && voix >= VOIX_QUI_PORTE) {
        mesures.push({ rapport: Math.max(0, micro - fond * SOUFFLE) / voix, duree });
        mesuree += duree;
        while (mesures.length > 1 && mesuree - mesures[0].duree >= MEMOIRE_S) mesuree -= mesures.shift()!.duree;
        if (mesuree >= MESURE_MIN_S - 1e-9) couplage = Math.max(...mesures.map((m) => m.rapport));
      }
      // Un quart de seconde au-dessus ; une trame plus calme au milieu d'un mot n'efface que la moitié de son temps.
      if (auDessus) {
        parle += duree;
        depuis += duree;
        if (voix >= VOIX_QUI_PORTE) pic = Math.max(pic, Math.max(0, micro - fond * SOUFFLE) / voix);
      } else {
        parle = Math.max(0, parle - duree / 2);
        depuis = parle > 0 ? depuis + duree : 0;
        if (!parle) pic = 0;
      }
      return parle >= DUREE_PRISE_DE_PAROLE_S - 1e-9;
    },
    couplage: () => couplage,
    depuis: () => depuis,
    aRetenir: () => (couplage === null && !pic ? null : Math.max(couplage ?? 0, pic)),
  };
}

/** La voix, en mp3 base64, décodée sur l'ordinateur : son enveloppe. Un seul décodeur pour toutes. */
let decodeur: BaseAudioContext | null = null;
export async function enveloppeDuMp3(base64: string): Promise<Float32Array> {
  decodeur ??= new OfflineAudioContext(1, 1, 24_000);
  const octets = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const son = await decodeur.decodeAudioData(octets.buffer);
  return enveloppe(son.getChannelData(0), son.sampleRate);
}
