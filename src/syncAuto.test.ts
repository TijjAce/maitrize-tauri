import { describe, it, expect } from "vitest";
import { PERIODE_MAX, attenteApres } from "./syncAuto";

describe("espacer les passages quand le stockage ne répond pas", () => {
  it("garde la cadence tant que tout va bien", () => {
    expect(attenteApres(0)).toBe(30_000);
  });

  it("double à chaque échec de suite", () => {
    // Le journal d'incidents gardait cinquante-deux passages ratés en une
    // heure : chacun s'obstinait une minute auprès d'un stockage absent.
    expect(attenteApres(1)).toBe(60_000);
    expect(attenteApres(2)).toBe(120_000);
    expect(attenteApres(3)).toBe(240_000);
  });

  it("sans jamais dépasser cinq minutes", () => {
    expect(attenteApres(4)).toBe(PERIODE_MAX);
    expect(attenteApres(50)).toBe(PERIODE_MAX);
  });
});
