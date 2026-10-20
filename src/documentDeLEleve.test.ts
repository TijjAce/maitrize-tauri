import { beforeEach, describe, expect, it, vi } from "vitest";

const base: Record<string, string> = {};
vi.mock("./api", () => ({
  api: {
    documentEleveGet: async (eleveId: string, type: string) => base[`${eleveId}/${type}`] ?? null,
    documentEleveSet: async (eleveId: string, type: string, json: string) => { base[`${eleveId}/${type}`] = json; },
  },
}));

import { lireJson, modifierLeDocument } from "./documentDeLEleve";

type Doc = { bilans: { id: string; texte: string }[]; besoins: string };
const lire = lireJson<Doc>({ bilans: [], besoins: "" });

beforeEach(() => { for (const k of Object.keys(base)) delete base[k]; });

describe("une réponse rangée chez l'élève pour qui on l'a demandée", () => {
  it("change le document enregistré de cet élève, dans son état du moment", async () => {
    // Pendant que l'IA travaillait, les besoins de l'élève A ont été retouchés et enregistrés.
    base["A/ppi"] = JSON.stringify({ bilans: [{ id: "b1", texte: "notes brutes" }], besoins: "retouché pendant l'attente" });
    base["B/ppi"] = JSON.stringify({ bilans: [{ id: "b9", texte: "le bilan de B" }], besoins: "B" });
    await modifierLeDocument("A", "ppi", lire, (d) => ({ ...d, bilans: d.bilans.map((b) => (b.id === "b1" ? { ...b, texte: "bilan rédigé" } : b)) }));
    expect(JSON.parse(base["A/ppi"])).toEqual({ bilans: [{ id: "b1", texte: "bilan rédigé" }], besoins: "retouché pendant l'attente" });
    expect(JSON.parse(base["B/ppi"]).bilans[0].texte).toBe("le bilan de B");
  });

  it("part d'un document vide quand il n'existe pas ou ne se lit pas", async () => {
    base["C/ppi"] = "pas du json";
    await modifierLeDocument("C", "ppi", lire, (d) => ({ ...d, besoins: "x" }));
    expect(JSON.parse(base["C/ppi"])).toEqual({ bilans: [], besoins: "x" });
    expect(lire(null)).toEqual({ bilans: [], besoins: "" });
  });
});
