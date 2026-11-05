import { describe, expect, it } from "vitest";
import {
  elementDeLEspace, espacesAPlacer, formeDeLEspace, placeLibre, poserLesEspacesNouveaux, type AgencementDeSalle, type ElementDeSalle,
} from "./espacesDansLaSalle";

const AUJOURDHUI = "2026-11-05";
const salle = (id: string, elements: ElementDeSalle[] = []): AgencementDeSalle => ({ id, nom: id, elements });
const BUREAU: ElementDeSalle = { id: "b", type: "bureau", x: 375, y: 30, w: 150, h: 60, label: "Bureau" };
const ARMOIRE = { id: "e-armoire", titre: "armoire classe", dateCreation: "2026-11-05T09:12:00Z" };
const COIN = { id: "e-coin", titre: "Coin lecture", dateCreation: "2026-09-01T08:00:00Z" };

const chevauchent = (a: ElementDeSalle, b: ElementDeSalle) => !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);

describe("les espaces de la classe dans le plan (« quand j'ajoute un nouvel espace de classe, il se met dans aménagement »)", () => {
  it("un espace nouveau se pose dans chaque agencement, à son nom, sans couvrir le mobilier", () => {
    const r = poserLesEspacesNouveaux([salle("ilots", [BUREAU]), salle("frontal", [BUREAU])], [ARMOIRE], [], AUJOURDHUI);
    expect(r.poses.map((e) => e.titre)).toEqual(["armoire classe"]);
    for (const a of r.agencements) {
      const armoire = a.elements.find((e) => e.espaceId === "e-armoire")!;
      expect(armoire).toMatchObject({ type: "meuble", label: "armoire classe", w: 130, h: 40 });
      expect(chevauchent(armoire, BUREAU)).toBe(false);
      // Le long d'un mur : en haut d'abord.
      expect(armoire.y).toBe(20);
    }
    expect(r.connus).toEqual(["e-armoire"]);
  });

  it("une fois posé, il ne revient pas : retiré d'un agencement, il attend dans « Ajouter »", () => {
    const premier = poserLesEspacesNouveaux([salle("s", [BUREAU])], [ARMOIRE], [], AUJOURDHUI);
    expect(poserLesEspacesNouveaux(premier.agencements, [ARMOIRE], premier.connus, AUJOURDHUI).poses).toEqual([]);
    const sansArmoire = [salle("s", [BUREAU])];
    const ensuite = poserLesEspacesNouveaux(sansArmoire, [ARMOIRE], premier.connus, AUJOURDHUI);
    expect(ensuite.agencements[0].elements).toHaveLength(1);
    expect(espacesAPlacer([ARMOIRE], ensuite.agencements[0]).map((e) => e.titre)).toEqual(["armoire classe"]);
  });

  it("à la première ouverture, seuls les espaces de la semaine se posent ; les plus anciens attendent dans « Ajouter »", () => {
    const r = poserLesEspacesNouveaux([salle("s", [BUREAU])], [ARMOIRE, COIN], null, AUJOURDHUI);
    expect(r.poses.map((e) => e.id)).toEqual(["e-armoire"]);
    expect(r.connus.sort()).toEqual(["e-armoire", "e-coin"]);
    expect(espacesAPlacer([ARMOIRE, COIN], r.agencements[0]).map((e) => e.titre)).toEqual(["Coin lecture"]);
  });

  it("sans agencement, rien ne se pose ni ne se retient : les espaces attendent la première salle", () => {
    const r = poserLesEspacesNouveaux([], [ARMOIRE], null, AUJOURDHUI);
    expect(r.poses).toEqual([]);
    expect(r.agencements).toEqual([]);
  });

  it("un coin est une surface au sol, une armoire un meuble ; le coin déjà dessiné à la main devient celui de l'espace", () => {
    expect(formeDeLEspace("Coin lecture")).toEqual({ type: "tapis", w: 200, h: 130 });
    expect(formeDeLEspace("Atelier peinture").type).toBe("tapis");
    expect(formeDeLEspace("Étagère des jeux")).toEqual({ type: "meuble", w: 130, h: 40 });
    const dessine: ElementDeSalle = { id: "t", type: "tapis", x: 650, y: 400, w: 220, h: 140, label: "Coin Lecture" };
    const { elements, element } = elementDeLEspace(COIN, salle("s", [BUREAU, dessine]));
    expect(elements).toHaveLength(2);
    expect(element).toMatchObject({ id: "t", espaceId: "e-coin", x: 650 });
  });

  it("une place libre : le long des murs, puis ailleurs, jamais sur un autre élément", () => {
    const plein: ElementDeSalle[] = [
      { id: "haut", type: "mur", x: 0, y: 0, w: 900, h: 80, label: "" },
      { id: "bas", type: "mur", x: 0, y: 480, w: 900, h: 80, label: "" },
    ];
    const p = placeLibre(plein, 130, 40);
    const pose: ElementDeSalle = { id: "x", type: "meuble", ...p, w: 130, h: 40, label: "" };
    for (const e of plein) expect(chevauchent(pose, e)).toBe(false);
    expect(p.x).toBe(20);
  });

  it("propose les espaces qui manquent, par ordre alphabétique, sans ceux qui n'ont pas de nom", () => {
    const a = salle("s", [{ ...BUREAU, id: "x", espaceId: "e-armoire" }]);
    expect(espacesAPlacer([{ id: "z", titre: "Zone calme" }, ARMOIRE, { id: "v", titre: "  " }, COIN], a).map((e) => e.titre))
      .toEqual(["Coin lecture", "Zone calme"]);
  });
});
