import { describe, expect, it } from "vitest";
import { eleveAChoisir } from "./eleveDuDossier";
import { piecesAttendues } from "./dossier";

const ELEVES = [{ id: "a", niveau: "MS" }, { id: "b", niveau: "GS" }, { id: "c", niveau: "GS" }];

describe("l'élève d'un onglet d'Élèves", () => {
  it("reste celui qu'on regardait dans le dossier", () => {
    expect(eleveAChoisir(ELEVES, "c")).toBe("c");
    expect(eleveAChoisir(ELEVES, "c", (e) => e.niveau === "GS")).toBe("c");
  });

  it("à défaut, celui que l'onglet préfère, sinon le premier", () => {
    expect(eleveAChoisir(ELEVES, "parti", (e) => e.niveau === "GS")).toBe("b");
    expect(eleveAChoisir(ELEVES, "")).toBe("a");
    expect(eleveAChoisir([], "a")).toBe("");
  });
});

describe("les pièces du dossier", () => {
  it("ouvrent la pièce elle-même", () => {
    const onglet = Object.fromEntries(piecesAttendues().map((p) => [p.typeDoc, p.page ? `${p.page}:${p.onglet}` : p.onglet]));
    expect(onglet.ppi).toBe("ppi");
    expect(onglet["evaldiag:observation"]).toBe("evaldiag:observation");
    expect(onglet["evaldiag:besoins"]).toBe("evaldiag:besoins");
    expect(onglet.projetPedagogique).toBe("organisation:projet");
  });
});
