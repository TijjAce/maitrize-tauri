import { describe, expect, it } from "vitest";
import { deballer, emballer } from "./relaisDev";

describe("le relais de développement : ce qui passe en JSON (2026-11-02)", () => {
  it("garde les octets — ArrayBuffer, Uint8Array, Float32Array —, où qu'ils soient, et le reste tel quel", () => {
    const valeur = {
      texte: "é", n: 3, rien: null, liste: [1, "a"], octets: new Uint8Array([0, 255, 7]),
      sons: [new Float32Array([0.5, -1])], brut: new Uint8Array([1, 2]).buffer,
    };
    const rendu = deballer(JSON.parse(JSON.stringify(emballer(valeur)))) as typeof valeur;
    expect([rendu.texte, rendu.n, rendu.rien, rendu.liste]).toEqual(["é", 3, null, [1, "a"]]);
    expect(rendu.octets).toBeInstanceOf(Uint8Array);
    expect([...rendu.octets]).toEqual([0, 255, 7]);
    expect(rendu.sons[0]).toBeInstanceOf(Float32Array);
    expect([...rendu.sons[0]]).toEqual([0.5, -1]);
    expect(rendu.brut).toBeInstanceOf(ArrayBuffer);
    expect([...new Uint8Array(rendu.brut)]).toEqual([1, 2]);
    expect(deballer(emballer("simple"))).toBe("simple");
  });
});
