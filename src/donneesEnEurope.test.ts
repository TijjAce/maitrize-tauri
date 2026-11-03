import { describe, it, expect } from "vitest";

// « Pour les réunions, n'oublie pas : tout doit rester dans l'UE en ligne » (l'enseignant, 3 novembre 2026).
// Tout part à l'adresse européenne de Mistral ; la seule exception voulue est la dictée en direct de l'Assistant IA,
// sous son avertissement (voir dicteeEnDirect.ts). Cet essai garde l'exception où elle est — côté Rust, l'essai
// `tout_part_en_europe_sauf_la_dictee_de_l_assistant` fait de même.

/** Les fichiers de l'interface, sans les essais, chacun avec son texte. */
const SOURCES = import.meta.glob(["./**/*.ts", "./**/*.tsx", "!./**/*.test.ts", "!./**/*.test.tsx"],
  { query: "?raw", import: "default", eager: true }) as Record<string, string>;

const contenant = (motif: RegExp) => Object.keys(SOURCES).filter((f) => motif.test(SOURCES[f])).sort();

describe("les données restent en Europe, sauf la dictée de l'Assistant", () => {
  it("ne nomme l'adresse habituelle de Mistral qu'à un seul endroit", () => {
    expect(contenant(/api\.mistral\.ai/)).toEqual(["./voxtralDirect.ts"]);
    expect(contenant(/ADRESSE_DU_DIRECT_MONDIAL|mistralJetonDicteeAssistant/))
      .toEqual(["./api.ts", "./dicteeEnDirect.ts", "./voxtralDirect.ts"]);
  });

  it("ne laisse que l'Assistant se servir de la dictée hors d'Europe : jamais les réunions", () => {
    expect(contenant(/from "\.\.?\/(?:\.\.\/)?dicteeEnDirect"/)).toEqual(["./pages/Assistant.tsx"]);
    for (const f of ["./pages/Reunions.tsx", "./reunion.ts", "./ecoute.ts", "./dictee.ts"]) {
      expect(SOURCES[f]).toBeTruthy();
      expect(SOURCES[f]).not.toMatch(/dicteeEnDirect|ADRESSE_DU_DIRECT_MONDIAL|mistralJetonDicteeAssistant/);
    }
  });
});
