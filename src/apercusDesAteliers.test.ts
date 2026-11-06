import { describe, expect, it } from "vitest";
import { FAMILLES } from "./catalogueAteliers";
import { SANS_APERCU, apercuDeLAtelier } from "./apercusDesAteliers";

describe("les vignettes des ateliers", () => {
  const ateliers = FAMILLES.filter((f) => f.id !== "perso").flatMap((f) => f.outils).filter((o) => !o.dossier);

  it("chaque atelier du catalogue montre sa feuille, sauf ceux qui n'ont rien à montrer", () => {
    const sans = [...new Set(ateliers.filter((o) => !apercuDeLAtelier(o.id)).map((o) => o.id))];
    expect(sans.sort()).toEqual([...SANS_APERCU].sort());
  });

  it("aucune photo ne reste sans atelier", () => {
    const ids = new Set<string>(ateliers.map((o) => o.id));
    const photos = Object.keys(import.meta.glob("./assets/apercus/*")).map((c) => c.slice(c.lastIndexOf("/") + 1).replace(/\.webp$/, ""));
    expect(photos.filter((p) => !ids.has(p))).toEqual([]);
  });

  it("un dossier et le générateur à créer n'en ont pas", () => {
    expect(FAMILLES.flatMap((f) => f.outils).filter((o) => o.dossier && apercuDeLAtelier(o.id))).toEqual([]);
    expect(apercuDeLAtelier("perso")).toBeUndefined();
  });
});
