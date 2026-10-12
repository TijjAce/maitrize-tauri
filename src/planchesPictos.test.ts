import { describe, it, expect } from "vitest";
import { PLANCHE_PAR_DEFAUT, htmlPlanche, libelleTaille, nombreDeCartes, normaliserPlanche } from "./planchesPictos";
import { CREDIT_ARASAAC } from "./cartesImprimables";

const IMAGES = { 12: "data:image/png;base64,AAA", "photo:tasse.jpg": "data:image/jpeg;base64,BBB" };
const compter = (html: string, motif: RegExp) => (html.match(motif) ?? []).length;

describe("les planches de pictos", () => {
  it("imprime le même picto à chaque taille cochée, de la plus grande à la plus petite", () => {
    const r = { ...PLANCHE_PAR_DEFAUT, pictos: [{ id: 12, mot: "manger" }], tailles: [80, 20, 40] };
    const html = htmlPlanche(normaliserPlanche(r), IMAGES);
    expect([...html.matchAll(/--c: (\d+)mm/g)].map((m) => m[1])).toEqual(["80", "40", "20"]);
    expect(compter(html, /<div class="pp-mot">manger<\/div>/g)).toBe(3);
    expect(html).toContain(CREDIT_ARASAAC);
  });

  it("répète chaque taille autant de fois qu'on le demande, picto par picto", () => {
    const r = { ...PLANCHE_PAR_DEFAUT, pictos: [{ id: 12, mot: "manger" }, { id: null, mot: "tasse", photo: "tasse.jpg" }, { id: null, mot: "" }],
      tailles: [30, 50], exemplaires: 3 };
    const html = htmlPlanche(r, IMAGES);
    expect(compter(html, /class="pp-groupe"/g)).toBe(2);
    expect(compter(html, /class="pp-carte"/g)).toBe(12);
    expect(nombreDeCartes(r)).toBe(12);
  });

  it("sans mot, sans image, ou sans taille : la carte le dit, ou la feuille explique quoi faire", () => {
    const sansMot = htmlPlanche({ ...PLANCHE_PAR_DEFAUT, pictos: [{ id: 12, mot: "manger" }], tailles: [40], mot: false }, IMAGES);
    expect(sansMot).not.toContain("pp-mot");
    // Une photo seule ne cite pas ARASAAC.
    expect(htmlPlanche({ ...PLANCHE_PAR_DEFAUT, pictos: [{ id: null, mot: "tasse", photo: "tasse.jpg" }] }, IMAGES)).not.toContain(CREDIT_ARASAAC);
    expect(htmlPlanche({ ...PLANCHE_PAR_DEFAUT, pictos: [{ id: 99, mot: "chat" }], tailles: [40] }, IMAGES)).toContain('<span class="pp-manque">chat</span>');
    expect(htmlPlanche({ ...PLANCHE_PAR_DEFAUT, pictos: [{ id: null, mot: "" }] }, IMAGES)).toContain("Choisissez un picto");
    expect(htmlPlanche({ ...PLANCHE_PAR_DEFAUT, pictos: [{ id: 12, mot: "manger" }], tailles: [] }, IMAGES)).toContain("Cochez au moins une taille");
  });

  it("échappe le mot, et répare des réglages abîmés", () => {
    expect(htmlPlanche({ ...PLANCHE_PAR_DEFAUT, pictos: [{ id: 12, mot: "<b>" }], tailles: [40] }, IMAGES)).toContain("&lt;b&gt;");
    const r = normaliserPlanche({ pictos: "x", tailles: [40, 40, 33, "20", 15], exemplaires: 99, mot: "oui", cadre: true });
    expect(r.pictos).toHaveLength(1);
    expect(r.tailles).toEqual([40, 15]);
    expect(r.exemplaires).toBe(12);
    expect(r.mot).toBe(true);
    expect(r.cadre).toBe(true);
    expect(libelleTaille(15)).toBe("1,5 cm");
    expect(libelleTaille(40)).toBe("4 cm");
  });
});
