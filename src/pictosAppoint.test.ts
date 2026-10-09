import { describe, it, expect } from "vitest";
import { banqueDe, mentionDesPictos, parMot } from "./pictosAppoint";

describe("les banques d'appoint", () => {
  it("reconnaissent la banque d'un picto, et rien d'autre", () => {
    expect(banqueDe(2348)).toBe("arasaac");
    expect(banqueDe("bajard:Colorie01.png")).toBe("bajard");
    expect(banqueDe("sclera:compter.png")).toBe("sclera");
    for (const x of [0, -3, 1.5, "", "x", "autre:a.png", "sclera:", "sclera:a/b.png", "bajard:..\\a.png", null, undefined]) expect(banqueDe(x)).toBeNull();
  });

  it("disent la mention d'ARASAAC entière — auteur, origine, licence, propriétaire —, et rien sans picto", () => {
    expect(mentionDesPictos([])).toBe("");
    expect(mentionDesPictos([11, 22])).toBe(`<div class="consigne-attribution">Pictogrammes : Sergio Palao, ARASAAC (arasaac.org), licence CC BY-NC-SA 4.0, propriété du Gouvernement d'Aragon. Usage non commercial.</div>`);
    expect(mentionDesPictos([11, "sclera:x.png"], "… Pictogrammes : ARASAAC … Sclera …")).toBe("");
  });

  it("gardent pour chaque mot la première image trouvée", () => {
    const m = parMot([{ mot: "Colorie", reference: "bajard:Colorie01.png" }, { mot: "colorie", reference: "bajard:Colorie02.png" }]);
    expect(m.get("colorie")).toBe("bajard:Colorie01.png");
    expect(m.size).toBe(1);
  });
});
