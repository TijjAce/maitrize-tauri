// ── Du micro au fichier, sans intermédiaire ───────────────────────────────
//
// L'enregistreur du navigateur (MediaRecorder) rend du WebM ou du MP4 selon
// la plateforme : très bien pour un service qui décode tout, impossible pour
// un moteur local qui attend un WAV 16 kHz mono. Plutôt que de décoder après
// coup, on prend les échantillons bruts et on écrit le fichier nous-mêmes.
//
// Deux bénéfices en passant : plus de conteneur à refermer — donc plus de
// morceau perdu à la coupe — et une découpe à l'échantillon près.

/** Ce que veut Whisper, et ce qui suffit pour de la parole. */
export const DEBIT_WHISPER = 16_000;

/**
 * Ramène des échantillons à un autre débit.
 *
 * Moyenne des échantillons couverts plutôt que simple prélèvement : une voix
 * ré-échantillonnée en sautant des points devient métallique, et la
 * transcription s'en ressent.
 */
export function reechantillonner(entree: Float32Array, deDebit: number, versDebit: number): Float32Array {
  if (deDebit === versDebit || entree.length === 0) return entree;
  const rapport = deDebit / versDebit;
  const taille = Math.floor(entree.length / rapport);
  const sortie = new Float32Array(taille);
  for (let i = 0; i < taille; i++) {
    const debut = Math.floor(i * rapport);
    const fin = Math.min(entree.length, Math.floor((i + 1) * rapport));
    let somme = 0;
    for (let j = debut; j < fin; j++) somme += entree[j];
    sortie[i] = fin > debut ? somme / (fin - debut) : 0;
  }
  return sortie;
}

/** Les 44 octets d'en-tête d'un WAV mono 16 bits. */
export function enteteWav(octetsDonnees: number, debit: number): ArrayBuffer {
  const tampon = new ArrayBuffer(44);
  const vue = new DataView(tampon);
  const ecrire = (pos: number, texte: string) => {
    for (let i = 0; i < texte.length; i++) vue.setUint8(pos + i, texte.charCodeAt(i));
  };
  ecrire(0, "RIFF");
  vue.setUint32(4, 36 + octetsDonnees, true);
  ecrire(8, "WAVE");
  ecrire(12, "fmt ");
  vue.setUint32(16, 16, true);           // taille du bloc fmt
  vue.setUint16(20, 1, true);            // PCM entier
  vue.setUint16(22, 1, true);            // mono
  vue.setUint32(24, debit, true);
  vue.setUint32(28, debit * 2, true);    // octets par seconde
  vue.setUint16(32, 2, true);            // octets par échantillon
  vue.setUint16(34, 16, true);           // bits par échantillon
  ecrire(36, "data");
  vue.setUint32(40, octetsDonnees, true);
  return tampon;
}

/** Les échantillons en 16 bits signés, bornés : un pic ne doit pas s'inverser. */
export function versPcm16(echantillons: Float32Array): Int16Array {
  const sortie = new Int16Array(echantillons.length);
  for (let i = 0; i < echantillons.length; i++) {
    const v = Math.max(-1, Math.min(1, echantillons[i]));
    sortie[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  return sortie;
}

/** Un fichier WAV complet, prêt à partir — au moteur local comme en ligne. */
export function versWav(echantillons: Float32Array, debitEntree: number, debitSortie = DEBIT_WHISPER): Blob {
  const reduits = reechantillonner(echantillons, debitEntree, debitSortie);
  const pcm = versPcm16(reduits);
  return new Blob([enteteWav(pcm.byteLength, debitSortie), pcm.buffer], { type: "audio/wav" });
}

/** Combien de secondes d'audio, à ce débit. */
export const secondesDe = (echantillons: number, debit: number) => echantillons / debit;

/** Le silence qui marque une fin de phrase, en secondes. */
export const SILENCE_COUPE_S = 0.6;

/**
 * Faut-il couper la tranche maintenant ?
 *
 * C'est la décision qui fait toute la différence entre « le texte suit la
 * parole » et « le texte arrive une minute plus tard ». Couper au bout d'un
 * temps fixe, c'est attendre ce temps-là avant la première ligne — et couper
 * au milieu d'un mot. Couper quand la personne se tait, c'est écrire à la fin
 * de chaque phrase.
 *
 * Le plafond reste, pour qui parle sans respirer : au-delà, on coupe même en
 * pleine phrase, sinon rien n'arriverait jamais.
 */
export function fautIlCouper(p: {
  /** Secondes de parole accumulées dans la tranche (silences non comptés). */
  parole: number;
  /** Secondes de silence consécutif à l'instant présent. */
  silence: number;
  /** Secondes écoulées depuis le début de la tranche. */
  total: number;
  /** En dessous, on ne coupe pas : une tranche trop courte se transcrit mal. */
  minimum: number;
  /** Au-dessus, on coupe quoi qu'il arrive. */
  plafond: number;
}): boolean {
  if (p.parole <= 0) return false;
  if (p.total >= p.plafond) return true;
  return p.parole >= p.minimum && p.silence >= SILENCE_COUPE_S;
}

/**
 * Le passage est-il silencieux ?
 *
 * Une salle vide entre deux prises de parole ne mérite ni un appel au moteur
 * ni une ligne « [BLANK_AUDIO] » dans le compte rendu. Le seuil est bas :
 * mieux vaut transcrire un murmure que rater une décision.
 */
export function estSilencieux(echantillons: Float32Array, seuil = 0.004): boolean {
  if (!echantillons.length) return true;
  let somme = 0;
  for (let i = 0; i < echantillons.length; i++) somme += echantillons[i] * echantillons[i];
  return Math.sqrt(somme / echantillons.length) < seuil;
}
