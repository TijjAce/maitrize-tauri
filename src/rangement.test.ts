import { describe, expect, it } from "vitest";
import { lireRangements, ordonner, PREFIXE_RANGEMENT, type Icone } from "./rangement";

const icone = (cle: string, nom: string, plus: Partial<Icone> = {}): Icone =>
  ({ cle, nom, dossier: false, date: "", total: 0, rangDuGenre: 0, ...plus });

const bureau: Icone[] = [
  icone("m:1", "Séance 10", { date: "2026-09-01T08:00:00Z", rangDuGenre: 1 }),
  icone("s:1", "Lecture CP", { date: "2026-10-03T17:00:00.000Z", rangDuGenre: 0 }),
  icone("d:Maths", "Maths", { dossier: true, total: 3, date: "2026-09-20T10:00:00Z" }),
  icone("t:1", "Séance 2", { date: "2026-09-15T08:00:00Z", rangDuGenre: 2 }),
  icone("d:Arts", "Arts", { dossier: true, total: 12, date: "2026-10-01T10:00:00Z" }),
  icone("d:Vide", "Vide", { dossier: true }),
];

describe("ranger le bureau", () => {
  it("par nom : les dossiers d'abord, et « Séance 2 » avant « Séance 10 »", () => {
    expect(ordonner(bureau, "nom")).toEqual(["d:Arts", "d:Maths", "d:Vide", "s:1", "t:1", "m:1"]);
  });

  it("les plus récents d'abord, un dossier daté par ce qu'il contient", () => {
    expect(ordonner(bureau, "recent")).toEqual(["d:Arts", "d:Maths", "d:Vide", "s:1", "t:1", "m:1"]);
    const plusRecent = bureau.map((i) => (i.cle === "d:Maths" ? { ...i, date: "2026-10-03T09:00:00Z" } : i));
    expect(ordonner(plusRecent, "recent").slice(0, 3)).toEqual(["d:Maths", "d:Arts", "d:Vide"]);
  });

  it("par nombre d'éléments : le dossier le plus plein d'abord", () => {
    expect(ordonner(bureau, "nombre")).toEqual(["d:Arts", "d:Maths", "d:Vide", "s:1", "t:1", "m:1"]);
    const plein = bureau.map((i) => (i.cle === "d:Maths" ? { ...i, total: 40 } : i));
    expect(ordonner(plein, "nombre").slice(0, 3)).toEqual(["d:Maths", "d:Arts", "d:Vide"]);
  });

  it("par type : les séquences, puis le matériel, puis les textes", () => {
    expect(ordonner(bureau, "type")).toEqual(["d:Arts", "d:Maths", "d:Vide", "s:1", "m:1", "t:1"]);
  });

  it("l'ordre de chaque dossier se relit dans les réglages, sans ce qui n'en est pas un", () => {
    expect(lireRangements({
      [PREFIXE_RANGEMENT]: "recent",
      [`${PREFIXE_RANGEMENT}Maths/Calcul`]: "nombre",
      [`${PREFIXE_RANGEMENT}Arts`]: "couleur",
      [`${PREFIXE_RANGEMENT}Vide`]: "",
      "bureau:Maths": "{}",
      // Les réglages des anciens bureaux des ateliers ne sont pas des ordres.
      "rangement:atelier:dossier:Maths": "#00ff00",
    })).toEqual({ "": "recent", "Maths/Calcul": "nombre" });
  });
});
