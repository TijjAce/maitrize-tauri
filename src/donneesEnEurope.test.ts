// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import { describe, it, expect } from "vitest";

// « Pour les réunions, n'oublie pas : tout doit rester dans l'UE en ligne » (l'enseignant, 3 novembre 2026).
// Tout part à l'adresse européenne de Mistral ; les seules exceptions voulues sont dans l'Assistant IA, sous son
// avertissement : sa dictée en direct (voir dicteeEnDirect.ts), et sa recherche sur internet quand le document du
// coffre-fort choisi ne répond pas (voir questionsAuDocument.ts). Cet essai garde les exceptions où elles sont — côté
// Rust, les essais `tout_part_en_europe_sauf_la_dictee_de_l_assistant` et
// `seule_la_recherche_de_l_assistant_echappe_a_la_coupure_des_agents` font de même.

/** Les fichiers de l'interface, sans les essais, chacun avec son texte. */
const SOURCES = import.meta.glob(["./**/*.ts", "./**/*.tsx", "!./**/*.test.ts", "!./**/*.test.tsx"],
  { query: "?raw", import: "default", eager: true }) as Record<string, string>;

const contenant = (motif: RegExp) => Object.keys(SOURCES).filter((f) => motif.test(SOURCES[f])).sort();

describe("les données restent en Europe, sauf la dictée et la recherche sur internet de l'Assistant", () => {
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

  it("ne laisse que l'Assistant chercher sur internet, quand un document du coffre-fort ne répond pas", () => {
    expect(contenant(/mistralRechercheWebAssistant|mistral_recherche_web_assistant/)).toEqual(["./api.ts", "./pages/Assistant.tsx"]);
  });

  it("ne cherche sur internet que sur un clic de l'enseignant (« demande avant chaque recherche sur internet »)", () => {
    const assistant = SOURCES["./pages/Assistant.tsx"];
    // Un seul appel, dans `chercherSurInternet`…
    const appels = [...assistant.matchAll(/mistralRechercheWebAssistant\(/g)].map((m) => m.index!);
    expect(appels).toHaveLength(1);
    const debut = assistant.indexOf("const chercherSurInternet = async");
    const fin = debut + 1 + assistant.slice(debut + 1).search(/\n  (?:const|let|function|if|return|React\.useEffect)\b/);
    expect(debut).toBeGreaterThan(-1);
    expect(appels[0] > debut && appels[0] < fin).toBe(true);
    // … que seul un bouton appelle (les commentaires mis à part).
    const ligneDe = (i: number) => assistant.slice(assistant.lastIndexOf("\n", i) + 1, i).trimStart();
    const usages = [...assistant.matchAll(/chercherSurInternet\b/g)]
      .filter((m) => !/^(?:\*|\/\/|\/\*)/.test(ligneDe(m.index!)))
      .map((m) => assistant.slice(m.index! - 30, m.index!));
    expect(usages).toHaveLength(2);
    expect(usages.filter((avant) => /onClick=\{\(\) => \{ void $/.test(avant))).toHaveLength(1);
  });
});
