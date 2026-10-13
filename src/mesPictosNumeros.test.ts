import { describe, it, expect, vi } from "vitest";

// La banque de l'essai : deux pictos, cherchés par numéro comme le fait arasaac_chercher.
const BANQUE = [{ id: 17183, mot: "pousser", fichier: "/b/17183.png" }, { id: 2462, mot: "pomme", fichier: "/b/2462.png" }];
vi.mock("./api", () => ({
  api: {
    arasaacChercher: vi.fn(async (q: string) => BANQUE.filter((p) => String(p.id) === q.replace(/\D/g, ""))),
  },
}));

import { lireLesSaisies, motEtNumero } from "./mesPictos";

describe("Le numéro d'un picto, écrit après le mot", () => {
  it("se lit sous toutes ses formes, et le mot reste le mot", () => {
    expect(motEtNumero("graine 17183")).toEqual({ mot: "graine", numero: 17183 });
    expect(motEtNumero(" graine = 17183 ")).toEqual({ mot: "graine", numero: 17183 });
    expect(motEtNumero("graine : 17183")).toEqual({ mot: "graine", numero: 17183 });
    expect(motEtNumero("graine #17183")).toEqual({ mot: "graine", numero: 17183 });
    expect(motEtNumero("graine n°17183")).toEqual({ mot: "graine", numero: 17183 });
    expect(motEtNumero("Graine N° 17183")).toEqual({ mot: "Graine", numero: 17183 });
    expect(motEtNumero("la petite graine (n° 17183)")).toEqual({ mot: "la petite graine", numero: 17183 });
    expect(motEtNumero("17183")).toEqual({ mot: "", numero: 17183 });
    expect(motEtNumero("n° 2462")).toEqual({ mot: "", numero: 2462 });
  });

  it("ne prend pas un nombre qui fait partie du mot", () => {
    expect(motEtNumero("graine")).toEqual({ mot: "graine", numero: null });
    expect(motEtNumero("2 pommes")).toEqual({ mot: "2 pommes", numero: null });
    expect(motEtNumero("page 12")).toEqual({ mot: "page 12", numero: null });
    expect(motEtNumero("graine17183")).toEqual({ mot: "graine17183", numero: null });
    expect(motEtNumero("graine 123456")).toEqual({ mot: "graine 123456", numero: null });
  });

  it("donne au mot le picto de ce numéro ; un numéro inconnu laisse la saisie comme un mot", async () => {
    expect(await lireLesSaisies(["graine 17183", "pomme", "17183", "l'an 2000"])).toEqual([
      { mot: "graine", picto: { id: 17183, mot: "graine", fichier: "/b/17183.png" } },
      { mot: "pomme", picto: null },
      { mot: "pousser", picto: { id: 17183, mot: "pousser", fichier: "/b/17183.png" } },
      { mot: "l'an 2000", picto: null },
    ]);
  });
});
