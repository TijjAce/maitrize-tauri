// ── Entendre une voix basse ───────────────────────────────────────────────
//
// « Dans les réunions, j'aimerais que les audios entendent mieux : j'ai un
// petit micro, et j'aimerais que ça entende mieux malgré mes chuchotements »
// (l'enseignant, 3 novembre 2026). Trois choses perdaient une voix basse :
// - le micro s'ouvrait avec le traitement d'un appel vidéo, dont la réduction
//   de bruit prend un chuchotement — tout en souffle, sans voix — pour du
//   bruit : il s'ouvre maintenant sans lui (voir ecoute.ts), et c'est ici
//   qu'on traite le son ;
// - le seuil de silence était fixe : un murmure dans un petit micro passait
//   dessous, et le passage était jeté sans être transcrit. Le seuil suit
//   maintenant le bruit de fond de la pièce — le plus calme des huit
//   dernières secondes : une phrase a toujours ses respirations — et est
//   parole ce qui le dépasse nettement, même tout bas ;
// - le moteur recevait un son très faible. Un gain automatique ramène la voix
//   à un niveau normal — jusqu'à +30 dB —, sans à-coups ; entre deux phrases,
//   il baisse de moitié, pour ne pas gonfler le souffle de la pièce ; un
//   limiteur garde les pics d'une voix forte.
// Un filtre coupe d'abord le grondement sous 80 Hz : les chocs sur la table,
// la main qui tient un petit micro.

/** Le niveau où l'on ramène la voix : une parole normale, bien enregistrée (environ −22 dB). */
export const CIBLE_VOIX = 0.08;
/** Le gain le plus fort : +30 dB, de quoi rendre un murmure à un micro de cravate. */
export const GAIN_MAX = 31.6;
/** Le plus bas qu'on prenne pour de la parole, même dans une pièce parfaitement calme. */
export const SEUIL_MIN = 0.0012;
/** Combien la parole doit dépasser le bruit de fond : deux fois (+6 dB). */
const AU_DESSUS_DU_FOND = 2;
/** Entre deux phrases, le gain baisse de moitié : le souffle de la pièce ne monte pas avec la voix. */
const ENTRE_DEUX = 0.5;
const COUPURE_HZ = 80;

/** Le bruit de fond se lit sur les huit dernières secondes. */
const FENETRE_FOND_S = 8;

/** Ce que la prise de son retient d'une trame à l'autre. */
export interface PriseDeSon {
  /** Le dernier échantillon reçu et le dernier rendu, pour le filtre. */
  avant: number; apres: number;
  /** Le bruit de fond de la pièce : le plus calme des dernières secondes. */
  fond: number;
  /** Le niveau des trames de ces dernières secondes, la plus ancienne d'abord. */
  recents: number[];
  /** Le niveau de la voix, lissé sur les dernières trames de parole. */
  voix: number;
  /** Le gain appliqué à la fin de la trame précédente. */
  gain: number;
}

export const nouvellePriseDeSon = (): PriseDeSon => ({ avant: 0, apres: 0, fond: 0.001, recents: [], voix: CIBLE_VOIX / 4, gain: 1 });

const rms = (t: Float32Array): number => {
  if (!t.length) return 0;
  let somme = 0;
  for (let i = 0; i < t.length; i++) somme += t[i] * t[i];
  return Math.sqrt(somme / t.length);
};

/** Un pic au-delà de 0,8 s'arrondit au lieu d'écrêter : le son reste sous 1. */
const limiter = (v: number): number => {
  const a = Math.abs(v);
  return a <= 0.8 ? v : Math.sign(v) * (0.8 + 0.2 * Math.tanh((a - 0.8) / 0.2));
};

/** Le niveau d'un son pour l'œil : de −50 dB (rien) à −6 dB (fort), ramené entre 0 et 1. */
export function niveauAffiche(r: number): number {
  if (r <= 0) return 0;
  const db = 20 * Math.log10(r);
  return Math.max(0, Math.min(1, (db + 50) / 44));
}

/**
 * Une trame du micro, traitée : filtrée, ramenée au niveau d'une voix,
 * limitée. Dit aussi si l'on y parle — c'est elle qui décide des coupes (voir
 * ecoute.ts) — et le niveau à montrer. `etat` se met à jour en place.
 */
export function traiterLaTrame(etat: PriseDeSon, trame: Float32Array, taux: number): { sortie: Float32Array; parole: boolean; niveau: number } {
  const n = trame.length;
  const sortie = new Float32Array(n);
  if (!n) return { sortie, parole: false, niveau: 0 };
  // Le filtre passe-haut, d'un échantillon à l'autre.
  const rc = 1 / (2 * Math.PI * COUPURE_HZ);
  const a = rc / (rc + 1 / (taux > 0 ? taux : 48_000));
  let avant = etat.avant;
  let apres = etat.apres;
  for (let i = 0; i < n; i++) {
    const x = Number.isFinite(trame[i]) ? trame[i] : 0;
    apres = a * (apres + x - avant);
    avant = x;
    sortie[i] = apres;
  }
  etat.avant = avant;
  etat.apres = apres;

  // Le bruit de fond : le plus calme des dernières secondes. Une longue phrase ne le relève pas, ses respirations le tiennent bas.
  const r = rms(sortie);
  etat.recents.push(r);
  const garder = Math.max(1, Math.ceil(FENETRE_FOND_S / (n / (taux > 0 ? taux : 48_000))));
  if (etat.recents.length > garder) etat.recents.splice(0, etat.recents.length - garder);
  etat.fond = Math.max(0.0003, Math.min(0.05, Math.min(...etat.recents)));
  const parole = r > Math.max(SEUIL_MIN, etat.fond * AU_DESSUS_DU_FOND);
  if (parole) etat.voix += (r - etat.voix) * 0.25;

  // Le gain qui ramène la voix à la cible, jamais en dessous de 1 ; la moitié entre deux phrases. Il glisse sur la trame.
  const vise = Math.max(1, Math.min(GAIN_MAX, CIBLE_VOIX / Math.max(etat.voix, 1e-5))) * (parole ? 1 : ENTRE_DEUX);
  const depart = etat.gain;
  for (let i = 0; i < n; i++) sortie[i] = limiter(sortie[i] * (depart + (vise - depart) * (i + 1) / n));
  etat.gain = vise;
  return { sortie, parole, niveau: niveauAffiche(rms(sortie)) };
}

/** Les contraintes du micro : sans le traitement d'un appel vidéo, qui prend un chuchotement pour du bruit ; ce micro-là, s'il est choisi. */
export function contraintesDuMicro(micro?: string): MediaTrackConstraints {
  return {
    ...(micro ? { deviceId: { exact: micro } } : {}),
    echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1,
  };
}
