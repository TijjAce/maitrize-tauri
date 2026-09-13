import { describe, it, expect } from "vitest";
import { completer } from "./tirage";

const p = (...ids: number[]) => ids.map((id) => ({ id }));

describe("completer", () => {
  it("garde les retenus et remplace seulement les manquants", () => {
    expect(completer(p(1, 2), p(3, 4, 5), new Set(), 4).map((x) => x.id)).toEqual([1, 2, 3, 4]);
  });
  it("ne ramène jamais un picto écarté", () => {
    expect(completer(p(1), p(7, 8, 9), new Set([7, 8]), 3).map((x) => x.id)).toEqual([1, 9]);
  });
  it("ne double pas un picto déjà retenu", () => {
    expect(completer(p(1, 2), p(2, 1, 3), new Set(), 3).map((x) => x.id)).toEqual([1, 2, 3]);
  });
  it("rend moins que voulu quand le thème est épuisé", () => {
    expect(completer(p(), p(1, 2), new Set([2]), 5).map((x) => x.id)).toEqual([1]);
  });
});
