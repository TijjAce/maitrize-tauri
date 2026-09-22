import { describe, it, expect } from "vitest";
import {
  DEBIT_WHISPER, SILENCE_COUPE_S, enteteWav, estSilencieux, fautIlCouper, reechantillonner,
  secondesDe, versPcm16,
} from "./audioWav";

const sinus = (n: number, amplitude = 0.5) =>
  Float32Array.from({ length: n }, (_, i) => Math.sin(i / 8) * amplitude);

describe("ramener au débit de Whisper", () => {
  it("garde la durée, pas le nombre d'échantillons", () => {
    const entree = sinus(48_000); // une seconde à 48 kHz
    const sortie = reechantillonner(entree, 48_000, DEBIT_WHISPER);
    expect(sortie.length).toBe(16_000);
    expect(secondesDe(sortie.length, DEBIT_WHISPER)).toBeCloseTo(1, 5);
  });

  it("ne touche à rien quand le débit est déjà le bon", () => {
    const entree = sinus(100);
    expect(reechantillonner(entree, 16_000, 16_000)).toBe(entree);
  });

  it("moyenne au lieu de prélever : le signal ne se disloque pas", () => {
    // Un signal constant doit le rester, quel que soit le rapport.
    const plat = new Float32Array(300).fill(0.25);
    const sortie = reechantillonner(plat, 48_000, 16_000);
    expect(sortie.length).toBe(100);
    for (const v of sortie) expect(v).toBeCloseTo(0.25, 6);
  });

  it("un enregistrement vide ne casse rien", () => {
    expect(reechantillonner(new Float32Array(0), 48_000, 16_000).length).toBe(0);
  });
});

describe("l'en-tête du fichier", () => {
  const lire = (vue: DataView, pos: number, n: number) =>
    String.fromCharCode(...Array.from({ length: n }, (_, i) => vue.getUint8(pos + i)));

  it("annonce un WAV mono 16 bits au bon débit", () => {
    const vue = new DataView(enteteWav(32_000, DEBIT_WHISPER));
    expect(lire(vue, 0, 4)).toBe("RIFF");
    expect(lire(vue, 8, 4)).toBe("WAVE");
    expect(lire(vue, 36, 4)).toBe("data");
    expect(vue.getUint16(22, true)).toBe(1);               // mono
    expect(vue.getUint32(24, true)).toBe(DEBIT_WHISPER);
    expect(vue.getUint16(34, true)).toBe(16);              // bits
    expect(vue.getUint32(40, true)).toBe(32_000);          // taille des données
    expect(vue.getUint32(4, true)).toBe(36 + 32_000);      // taille du fichier
  });
});

describe("les échantillons en 16 bits", () => {
  it("borne les pics au lieu de les retourner", () => {
    // Sans la borne, un pic à 1.2 repassait en négatif : un claquement.
    const pcm = versPcm16(Float32Array.from([1.2, -1.5, 0, 1, -1]));
    expect(pcm[0]).toBe(32767);
    expect(pcm[1]).toBe(-32768);
    expect(pcm[2]).toBe(0);
    expect(pcm[3]).toBe(32767);
    expect(pcm[4]).toBe(-32768);
  });
});

describe("le silence", () => {
  it("reconnaît une salle qui se tait", () => {
    expect(estSilencieux(new Float32Array(1000))).toBe(true);
    expect(estSilencieux(new Float32Array(0))).toBe(true);
    // Un souffle très faible reste un silence.
    expect(estSilencieux(sinus(1000, 0.001))).toBe(true);
  });

  it("un murmure n'est pas un silence", () => {
    expect(estSilencieux(sinus(1000, 0.05))).toBe(false);
  });
});

describe("quand couper la tranche", () => {
  const cas = (p: Partial<Parameters<typeof fautIlCouper>[0]>) =>
    fautIlCouper({ parole: 0, silence: 0, total: 0, minimum: 2, plafond: 12, ...p });

  it("coupe à la fin d'une phrase, dès qu'il y a de quoi transcrire", () => {
    expect(cas({ parole: 3, silence: SILENCE_COUPE_S, total: 4 })).toBe(true);
  });

  it("ne coupe pas au milieu d'une phrase", () => {
    expect(cas({ parole: 5, silence: 0.1, total: 5 })).toBe(false);
  });

  it("ne coupe pas sur un souffle après deux mots", () => {
    // Une tranche d'une seconde se transcrit mal : on laisse venir.
    expect(cas({ parole: 1, silence: 1, total: 2 })).toBe(false);
  });

  it("coupe quand même qui parle sans respirer", () => {
    expect(cas({ parole: 12, silence: 0, total: 12 })).toBe(true);
  });

  it("ne coupe jamais une tranche sans parole : on n'envoie pas du silence", () => {
    expect(cas({ parole: 0, silence: 30, total: 30 })).toBe(false);
  });
});
