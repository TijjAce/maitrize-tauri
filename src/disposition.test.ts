import { describe, it, expect } from "vitest";
import {
  disposer, caseLibreLaPlusProche, poser, lirePositions, lireDispositions, reporterDispositions,
} from "./disposition";

describe("disposer", () => {
  it("place ce qui n'est pas placé dans les premières cases libres, rang par rang", () => {
    expect(disposer(["d:A", "d:B", "m:1"], {}, 2)).toEqual({
      "d:A": { col: 0, rang: 0 }, "d:B": { col: 1, rang: 0 }, "m:1": { col: 0, rang: 1 },
    });
  });

  it("garde la case choisie et contourne les cases prises", () => {
    const d = disposer(["d:A", "d:B", "m:1"], { "d:B": [0, 0], "m:1": [3, 2] }, 4);
    expect(d["d:B"]).toEqual({ col: 0, rang: 0 });
    expect(d["m:1"]).toEqual({ col: 3, rang: 2 });
    expect(d["d:A"]).toEqual({ col: 1, rang: 0 });
  });

  it("reprend une tuile placée hors de la largeur, ou sur une case déjà prise", () => {
    const d = disposer(["d:A", "d:B"], { "d:A": [7, 0], "d:B": [0, 0] }, 3);
    expect(d["d:B"]).toEqual({ col: 0, rang: 0 });
    expect(d["d:A"]).toEqual({ col: 1, rang: 0 });
    const doublon = disposer(["d:A", "d:B"], { "d:A": [1, 1], "d:B": [1, 1] }, 3);
    expect(doublon["d:A"]).toEqual({ col: 1, rang: 1 });
    expect(doublon["d:B"]).toEqual({ col: 0, rang: 0 });
  });
});

describe("poser", () => {
  const depart = disposer(["d:A", "d:B", "m:1"], {}, 4); // A(0,0) B(1,0) 1(2,0)

  it("pose la tuile sur la case voulue sans déplacer les autres", () => {
    expect(poser(depart, "d:A", { col: 3, rang: 5 }, 4)).toEqual({ "d:A": [3, 5], "d:B": [1, 0], "m:1": [2, 0] });
  });

  it("va à la case libre la plus proche si la case est prise", () => {
    const p = poser(depart, "d:A", { col: 1, rang: 0 }, 4);
    expect(p["d:B"]).toEqual([1, 0]);
    expect(p["d:A"]).toEqual([0, 0]);
  });

  it("reste dans la largeur du bureau", () => {
    expect(poser(depart, "m:1", { col: 9, rang: -2 }, 4)["m:1"]).toEqual([3, 0]);
  });

  it("trouve une case voisine libre", () => {
    const prises = new Set(["2,2", "1,2", "3,2", "2,1", "2,3"]);
    const c = caseLibreLaPlusProche({ col: 2, rang: 2 }, prises, 5);
    expect(Math.max(Math.abs(c.col - 2), Math.abs(c.rang - 2))).toBe(1);
    expect(prises.has(`${c.col},${c.rang}`)).toBe(false);
  });
});

describe("réglages", () => {
  it("lit les dispositions et ignore ce qui est abîmé", () => {
    expect(lirePositions('{"d:A":[1,2],"x":[1],"y":"z","n":[-1,0]}')).toEqual({ "d:A": [1, 2] });
    expect(lirePositions("pas du json")).toEqual({});
    expect(lireDispositions({ "bureau:": '{"d:A":[0,1]}', "bureau:Français": '{"m:1":[2,0]}', theme: "x", "bureau:vide": "" }))
      .toEqual({ "": { "d:A": [0, 1] }, "Français": { "m:1": [2, 0] } });
  });

  it("fait suivre la disposition d'un dossier renommé, et sa case dans le parent", () => {
    const dispositions = {
      "": { "d:Maths": [4, 1] as [number, number], "d:Lecture": [0, 0] as [number, number] },
      "Maths": { "m:1": [2, 2] as [number, number] },
      "Maths/Géométrie": { "m:2": [1, 0] as [number, number] },
    };
    expect(reporterDispositions(dispositions, "Maths", "Mathématiques")).toEqual({
      "bureau:Maths": "", "bureau:Mathématiques": '{"m:1":[2,2]}',
      "bureau:Maths/Géométrie": "", "bureau:Mathématiques/Géométrie": '{"m:2":[1,0]}',
      "bureau:": '{"d:Lecture":[0,0],"d:Mathématiques":[4,1]}',
    });
  });

  it("libère la case d'un dossier déplacé ailleurs ou supprimé", () => {
    const dispositions = { "": { "d:Maths": [4, 1] as [number, number] }, "Maths/Géométrie": { "m:2": [1, 0] as [number, number] } };
    expect(reporterDispositions(dispositions, "Maths", "Classe/Maths")).toEqual({
      "bureau:Maths/Géométrie": "", "bureau:Classe/Maths/Géométrie": '{"m:2":[1,0]}', "bureau:": "{}",
    });
    expect(reporterDispositions({ ...dispositions, "Maths": { "m:1": [0, 0] } }, "Maths", "", true)).toEqual({
      "bureau:Maths": "", "bureau:Maths/Géométrie": "", "bureau:Géométrie": '{"m:2":[1,0]}', "bureau:": "{}",
    });
  });
});
