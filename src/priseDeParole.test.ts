// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import { describe, it, expect } from "vitest";
import { DUREE_PRISE_DE_PAROLE_S, MESURE_MIN_S, PAS_ENVELOPPE_S, detecteurDePriseDeParole, enveloppe, niveauJoue } from "./priseDeParole";
import { derniersInstants } from "./dicteeEnDirect";

// Une trame du micro de l'application : 4 096 échantillons à 48 kHz.
const TRAME_S = 4096 / 48_000;

/** Un hasard reproductible. */
function hasard(graine: number) {
  let a = graine >>> 0;
  return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
}

/** L'enveloppe d'une voix qui parle : des syllabes fortes, de courts creux, une pause entre deux phrases. */
function voixQuiParle(secondes: number, graine = 3): Float32Array {
  const h = hasard(graine);
  const env: number[] = [];
  while (env.length * PAS_ENVELOPPE_S < secondes) {
    const syllabes = 6 + Math.floor(h() * 8);
    for (let s = 0; s < syllabes; s++) {
      const fort = 0.09 + h() * 0.06;
      for (let k = 0, n = 7 + Math.floor(h() * 6); k < n; k++) env.push(fort * (0.8 + 0.2 * h()));
      for (let k = 0, n = 2 + Math.floor(h() * 3); k < n; k++) env.push(0.004 + h() * 0.004);
    }
    for (let k = 0; k < 20; k++) env.push(0.002);
  }
  return Float32Array.from(env);
}

/**
 * Ce que le micro entend, trame après trame, pendant que la voix joue `env` : son écho (une part `couplage`, en retard
 * de `retard`, qui varie d'une trame à l'autre), le souffle de la pièce, et l'enseignant (`enseignant(t)`). Rend
 * l'instant où le détecteur coupe la voix, ou null.
 */
function ecouter(o: {
  env: Float32Array; couplage: number; souffle: number; enseignant?: (t: number) => number;
  detecteur?: ReturnType<typeof detecteurDePriseDeParole>; retard?: number; variation?: number; graine?: number;
}): { coupe: number | null; detecteur: ReturnType<typeof detecteurDePriseDeParole> } {
  const d = o.detecteur ?? detecteurDePriseDeParole();
  const h = hasard(o.graine ?? 11);
  const duree = o.env.length * PAS_ENVELOPPE_S;
  const retard = o.retard ?? 0.04;
  for (let t = TRAME_S; t <= duree; t += TRAME_S) {
    // L'écho de la trame : la voix d'il y a `retard`, sur la durée de la trame.
    const debut = Math.max(0, Math.floor((t - TRAME_S - retard) / PAS_ENVELOPPE_S));
    const fin = Math.max(debut, Math.floor((t - retard) / PAS_ENVELOPPE_S));
    let somme = 0;
    for (let k = debut; k < fin; k++) somme += (o.env[k] ?? 0) ** 2;
    const echo = o.couplage * Math.sqrt(somme / Math.max(1, fin - debut)) * (1 - (o.variation ?? 0.25) * h());
    const bruit = o.souffle * (0.8 + 0.4 * h());
    const voixEnseignant = o.enseignant?.(t) ?? 0;
    const micro = Math.sqrt(echo ** 2 + bruit ** 2 + voixEnseignant ** 2);
    if (d.entendre({ micro, fond: o.souffle * 0.8, voix: niveauJoue(o.env, t), duree: TRAME_S })) return { coupe: t, detecteur: d };
  }
  return { coupe: null, detecteur: d };
}

describe("la voix se tait quand on prend la parole (demande de l'enseignant, 3 novembre 2026)", () => {
  it("lit le niveau de la voix toutes les 20 ms, et le plus fort de ce qui vient d'être joué", () => {
    const son = new Float32Array(48_000).map((_, i) => (i < 24_000 ? 0.5 : 0.1) * (i % 2 ? 1 : -1));
    const env = enveloppe(son, 48_000);
    expect(env).toHaveLength(50);
    expect(env[0]).toBeCloseTo(0.5, 5);
    expect(env[49]).toBeCloseTo(0.1, 5);
    // Juste après le passage fort, son écho traîne encore ; un peu plus tard, non.
    expect(niveauJoue(env, 0.6)).toBeCloseTo(0.5, 5);
    expect(niveauJoue(env, 0.9)).toBeCloseTo(0.1, 5);
    // Après la fin, la traîne de la fin ; avant le début, rien.
    expect(niveauJoue(env, 5)).toBe(0);
    expect(niveauJoue(env, 1.1)).toBeCloseTo(0.1, 5);
    expect(niveauJoue(env, -1)).toBe(0);
    expect(niveauJoue(new Float32Array(0), 1)).toBe(0);
  });

  it("ne se coupe pas d'elle-même : son écho dans les haut-parleurs, si fort soit-il, ne passe pas pour l'enseignant", () => {
    for (const graine of [1, 2, 3, 4, 5]) {
      const { coupe, detecteur } = ecouter({ env: voixQuiParle(30, graine), couplage: 0.3, souffle: 0.0008, graine: graine * 7 });
      expect(coupe).toBeNull();
      // L'écho mesuré : la part de la voix que le micro entend, à peu près.
      expect(detecteur.couplage()).toBeGreaterThan(0.2);
      expect(detecteur.couplage()).toBeLessThan(0.45);
    }
    // Un écho plus fort que la voix elle-même — un micro réglé très fort, collé au haut-parleur — : mesuré d'abord, il ne coupe rien.
    expect(ecouter({ env: voixQuiParle(20), couplage: 1.8, souffle: 0.0008 }).coupe).toBeNull();
  });

  it("se coupe quand l'enseignant parle par-dessus des haut-parleurs, d'une voix normale, en un tiers de seconde", () => {
    for (const graine of [1, 2, 3]) {
      const { coupe } = ecouter({
        env: voixQuiParle(12, graine), couplage: 0.3, souffle: 0.0008, graine,
        enseignant: (t) => (t >= 6 ? 0.1 : 0),
      });
      expect(coupe).not.toBeNull();
      expect(coupe!).toBeGreaterThanOrEqual(6 + DUREE_PRISE_DE_PAROLE_S - TRAME_S);
      expect(coupe!).toBeLessThan(6.45);
    }
  });

  it("avec un casque, l'écho est nul : un murmure suffit", () => {
    const { coupe } = ecouter({
      env: voixQuiParle(8), couplage: 0.004, souffle: 0.0006,
      enseignant: (t) => (t >= 4 ? 0.004 : 0),
    });
    expect(coupe).not.toBeNull();
    expect(coupe!).toBeLessThan(4.45);
  });

  it("ne se coupe ni pour une toux, ni tant qu'on ignore ce que joue la voix", () => {
    // Une toux : deux trames fortes.
    const toux = ecouter({
      env: voixQuiParle(8), couplage: 0.3, souffle: 0.0008,
      enseignant: (t) => (t >= 4 && t < 4 + 2 * TRAME_S ? 0.4 : 0),
    });
    expect(toux.coupe).toBeNull();
    const d = detecteurDePriseDeParole(0.3);
    for (let k = 0; k < 10; k++) expect(d.entendre({ micro: 0.5, fond: 0.001, voix: null, duree: TRAME_S })).toBe(false);
    expect(d.depuis()).toBe(0);
  });

  it("mesure l'écho de la première réponse avant de la laisser couper, et le garde pour la suivante, coupée dès le premier mot", () => {
    const d = detecteurDePriseDeParole();
    expect(d.couplage()).toBeNull();
    expect(d.aRetenir()).toBeNull();
    // Première réponse : l'enseignant parle à 1,5 s ; l'écho est mesuré depuis longtemps.
    const premiere = ecouter({ env: voixQuiParle(4), couplage: 0.3, souffle: 0.0008, detecteur: d, enseignant: (t) => (t >= 1.5 ? 0.1 : 0) });
    expect(premiere.coupe!).toBeGreaterThan(1.5);
    expect(premiere.coupe!).toBeLessThan(1.9);
    // Ce qu'il faut rendre au direct : le temps où l'on parlait déjà par-dessus, à une trame près.
    expect(d.depuis()).toBeGreaterThanOrEqual(DUREE_PRISE_DE_PAROLE_S - 1e-9);
    expect(d.depuis()).toBeLessThan(0.6);
    // Une réponse sans coupure garde son écho mesuré ; la suivante se coupe dès que l'enseignant continue sa phrase.
    const calme = ecouter({ env: voixQuiParle(6, 4), couplage: 0.3, souffle: 0.0008 });
    const suivante = ecouter({
      env: voixQuiParle(3, 9), couplage: 0.3, souffle: 0.0008,
      detecteur: detecteurDePriseDeParole(calme.detecteur.aRetenir()),
      enseignant: (t) => (t >= 0.1 ? 0.1 : 0),
    });
    expect(suivante.coupe).not.toBeNull();
    expect(suivante.coupe!).toBeLessThan(0.1 + MESURE_MIN_S);
  });

  it("ne se coupe pas en boucle quand l'écho monte d'un coup — un casque ôté, le volume monté — : une fois au plus", () => {
    const casque = ecouter({ env: voixQuiParle(6), couplage: 0.003, souffle: 0.0008 });
    expect(casque.coupe).toBeNull();
    const ote = ecouter({ env: voixQuiParle(6, 5), couplage: 0.5, souffle: 0.0008, detecteur: detecteurDePriseDeParole(casque.detecteur.aRetenir()) });
    expect(ote.coupe).not.toBeNull();
    // La réponse d'après part de ce que le micro entendait alors : elle ne se coupe plus d'elle-même.
    let retenu = ote.detecteur.aRetenir();
    for (const graine of [6, 7, 8]) {
      const r = ecouter({ env: voixQuiParle(20, graine), couplage: 0.5, souffle: 0.0008, graine, detecteur: detecteurDePriseDeParole(retenu) });
      expect(r.coupe).toBeNull();
      retenu = r.detecteur.aRetenir();
    }
  });

  it("rend au direct les dernières trames entendues, jusqu'à la durée voulue", () => {
    const trame = (n: number) => ({ trame: new Float32Array(4800).fill(n), taux: 48_000 });
    const tues = [1, 2, 3, 4, 5].map(trame);
    expect(derniersInstants(tues, 0.25).map((t) => t.trame[0])).toEqual([3, 4, 5]);
    expect(derniersInstants(tues, 0.2).map((t) => t.trame[0])).toEqual([4, 5]);
    expect(derniersInstants(tues, 10)).toHaveLength(5);
    expect(derniersInstants(tues, 0)).toEqual([]);
    expect(derniersInstants([], 1)).toEqual([]);
  });
});
