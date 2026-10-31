import { describe, expect, it } from "vitest";
import { FAMILLES } from "./catalogueAteliers";
import { SOURCES_DES_ATELIERS, SOURCE_INCONNUE, sourceDeLAtelier } from "./sourcesDesAteliers";

/** Les ateliers qui n'ont pas encore leur source : à remplir, puis à retirer d'ici. */
const ATTENDENT_LEUR_SOURCE: string[] = [];
/** Les lotos des sons qui arrivent au catalogue : leur source est déjà là (31 octobre 2026) ; à retirer d'ici une fois au catalogue. */
const A_VENIR = ["lotoAttaques", "lotoRimes", "lotoSyllabesAttaque", "lotoSyllabesFin", "lotoPhonemesAttaque", "lotoPhonemesFin"];

describe("d'où vient chaque atelier (demande de l'enseignant, 31 octobre 2026)", () => {
  const ateliers = FAMILLES.flatMap((f) => f.outils).filter((o) => !o.dossier);

  it("chaque atelier du catalogue dit sa source — sinon « Source inconnue » —, et chaque source est celle d'un atelier", () => {
    const sans = ateliers.filter((o) => !SOURCES_DES_ATELIERS[o.id] && !ATTENDENT_LEUR_SOURCE.includes(o.id)).map((o) => o.id);
    expect(sans, "ajoutez leur entrée dans sourcesDesAteliers.ts").toEqual([]);
    const ids = new Set(ateliers.map((o) => o.id as string));
    for (const id of Object.keys(SOURCES_DES_ATELIERS)) expect(ids.has(id) || A_VENIR.includes(id), id).toBe(true);
  });

  it("se lit en une ligne, sous le « ? » du titre : « Source : … », ou « Source inconnue »", () => {
    for (const [id, texte] of Object.entries(SOURCES_DES_ATELIERS)) {
      expect(texte.trim(), id).toBe(texte);
      expect(texte, id).toMatch(/[.»)]$/);
      expect(texte, id).not.toMatch(/undefined|https?:/);
      expect(sourceDeLAtelier(id), id).toMatch(texte.startsWith(SOURCE_INCONNUE) ? /^Source inconnue/ : /^Source : [A-ZÀ-ÝÉ«]/);
    }
    // Les dossiers de séquences n'en ont pas : chaque séquence dit la sienne, dans le tableau.
    expect(sourceDeLAtelier("sequencesCP")).toBeNull();
    expect(sourceDeLAtelier("lettres")).toMatch(/^Source : Livret d'accompagnement de français CP \(Éduscol, 2025\)/);
  });

  it("cite d'abord Éduscol et les programmes officiels : la plupart en viennent", () => {
    const officielles = Object.values(SOURCES_DES_ATELIERS).filter((t) => /Éduscol|[Pp]rogramme/.test(t));
    expect(officielles.length).toBeGreaterThan(Object.keys(SOURCES_DES_ATELIERS).length / 2);
  });
});
