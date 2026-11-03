import { describe, it, expect } from "vitest";
import { CIBLE_VOIX, GAIN_MAX, contraintesDuMicro, niveauAffiche, nouvellePriseDeSon, traiterLaTrame } from "./priseDeSon";
import { estSilencieux } from "./audioWav";

const TAUX = 48_000;
const TRAME = 4096;
const rms = (t: Float32Array) => Math.sqrt(t.reduce((s, v) => s + v * v, 0) / t.length);

/** Un hasard reproductible, pour le souffle d'une pièce. */
function souffle(graine: number) {
  let a = graine >>> 0;
  return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296 - 0.5; };
}

/** Des trames : une voix (une somme de sinus, entre 200 et 2 000 Hz) d'amplitude donnée, sur un souffle de fond. */
function trames(combien: number, voix: number, fond: number, depart = 0, graine = 7): Float32Array[] {
  const bruit = souffle(graine);
  return Array.from({ length: combien }, (_, k) => {
    const t = new Float32Array(TRAME);
    for (let i = 0; i < TRAME; i++) {
      const s = (depart + k * TRAME + i) / TAUX;
      const parole = voix * (0.6 * Math.sin(2 * Math.PI * 220 * s) + 0.3 * Math.sin(2 * Math.PI * 900 * s) + 0.1 * Math.sin(2 * Math.PI * 1900 * s));
      t[i] = parole + fond * 3.46 * bruit();
    }
    return t;
  });
}

describe("entendre une voix basse en réunion (demande de l'enseignant, 3 novembre 2026)", () => {
  it("entend un chuchotement que le seuil fixe jetait comme du silence, et le ramène au niveau d'une voix", () => {
    const etat = nouvellePriseDeSon();
    // Dix secondes de pièce calme, puis cinq secondes de murmure sans respirer, à peine au-dessus : un petit micro, une voix basse.
    const calme = trames(110, 0, 0.0006);
    const murmure = trames(60, 0.004, 0.0006, 110 * TRAME);
    expect(estSilencieux(murmure[0])).toBe(true); // l'ancien seuil fixe le jetait
    const avant = calme.map((t) => traiterLaTrame(etat, t, TAUX));
    expect(avant.filter((x) => x.parole).length).toBeLessThan(5);
    expect(etat.fond).toBeLessThan(0.0015);
    const apres = murmure.map((t) => traiterLaTrame(etat, t, TAUX));
    expect(apres.filter((x) => x.parole).length).toBeGreaterThan(55);
    // Au bout de deux secondes, la voix sort autour de la cible : bien assez pour le moteur.
    const fin = rms(apres[apres.length - 1].sortie);
    expect(fin).toBeGreaterThan(CIBLE_VOIX * 0.6);
    expect(fin).toBeLessThan(CIBLE_VOIX * 1.5);
    // Entre deux phrases, le souffle ne monte pas avec la voix : le gain baisse de moitié, en glissant sur une trame.
    const silences = trames(2, 0, 0.0006, 170 * TRAME).map((t) => traiterLaTrame(etat, t, TAUX));
    expect(silences.every((x) => !x.parole)).toBe(true);
    expect(rms(silences[1].sortie)).toBeLessThan(0.0006 * GAIN_MAX * 0.6);
    expect(rms(silences[1].sortie)).toBeLessThan(fin * 0.2);
  });

  it("entend aussi qui murmure dès que le micro s'ouvre, sans silence avant pour mesurer le fond", () => {
    const etat = nouvellePriseDeSon();
    const tout = trames(40, 0.004, 0.0003).map((t) => traiterLaTrame(etat, t, TAUX));
    // Les deux premières secondes comptent comme parole ; ensuite, le murmure reste au-dessus du fond qu'il a fixé lui-même
    // seulement s'il y a un silence pour le mesurer : c'est la seconde moitié du test d'au-dessus.
    expect(tout.slice(0, 20).filter((x) => x.parole).length).toBeGreaterThan(18);
  });

  it("laisse une voix normale telle quelle, et arrondit les pics d'une voix forte au lieu d'écrêter", () => {
    const etat = nouvellePriseDeSon();
    const normale = trames(40, 0.25, 0.001).map((t) => traiterLaTrame(etat, t, TAUX));
    expect(etat.gain).toBe(1);
    expect(rms(normale[39].sortie)).toBeGreaterThan(0.08);
    const forte = trames(20, 1.4, 0.001, 40 * TRAME).map((t) => traiterLaTrame(etat, t, TAUX));
    expect(Math.max(...forte.flatMap((x) => [...x.sortie].map(Math.abs)))).toBeLessThanOrEqual(1);
  });

  it("coupe le grondement d'un petit micro qu'on manipule, sans rien casser quand le son manque", () => {
    const etat = nouvellePriseDeSon();
    // Un décalage continu — le micro qui frotte — disparaît après quelques millisecondes.
    const continu = new Float32Array(TRAME).fill(0.2);
    const sortie = traiterLaTrame(etat, continu, TAUX).sortie;
    expect(Math.abs(sortie[TRAME - 1])).toBeLessThan(0.01);
    // Une trame vide, ou abîmée, ne rend rien d'aberrant.
    expect(traiterLaTrame(etat, new Float32Array(0), TAUX)).toEqual({ sortie: new Float32Array(0), parole: false, niveau: 0, brut: 0, fond: etat.fond });
    const abimee = new Float32Array([NaN, Infinity, 0.1, -0.1]);
    expect([...traiterLaTrame(etat, abimee, TAUX).sortie].every(Number.isFinite)).toBe(true);
  });

  it("montre un niveau entre 0 et 1, et ouvre le micro sans le traitement d'un appel vidéo", () => {
    expect(niveauAffiche(0)).toBe(0);
    expect(niveauAffiche(1)).toBe(1);
    expect(niveauAffiche(0.003)).toBeLessThan(0.3);
    expect(niveauAffiche(CIBLE_VOIX)).toBeGreaterThan(0.5);
    expect(contraintesDuMicro()).toEqual({ echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 });
    expect(contraintesDuMicro("micro-usb")).toMatchObject({ deviceId: { exact: "micro-usb" }, noiseSuppression: false });
  });
});
