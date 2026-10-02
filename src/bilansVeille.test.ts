import { describe, it, expect } from "vitest";
import type { Creneau } from "./api";
import { bilansDeLaVeilleHtml, jourEnToutesLettres, veilleDe } from "./bilansVeille";

const creneau = (id: string, date: string, heureDebut: string, matiere: string, bilan = "", p: Partial<Creneau> = {}): Creneau => ({
  id, date, heureDebut, heureFin: "10:00", matiere, couleur: "blue", seanceId: null, atelierId: null, espaceId: null,
  elevesJson: "[]", nature: "classe", prevu: "", bilan, ...p,
});

describe("les bilans de la veille", () => {
  const creneaux = [
    creneau("a", "2026-10-01", "09:00", "Lecture", "Jeudi : à ne pas confondre."),
    creneau("b", "2026-10-02", "10:30", "Numération", "Les dizaines passent.\nReprendre les unités avec Louison."),
    creneau("c", "2026-10-02", "09:00", "Lecture", "Fluence : tous ont gagné deux mots."),
    creneau("d", "2026-10-02", "13:30", "Arts", "   "),
    creneau("e", "2026-10-02", "16:00", "Synthèse", "Ce qui s'est dit en réunion.", { nature: "reunion" }),
    creneau("f", "2026-10-05", "09:00", "Lecture", "Le jour même : pas la veille."),
    creneau("g", "2026-10-06", "09:00", "Lecture", "Demain : encore moins."),
  ];

  it("sont ceux du dernier jour de classe avant le jour imprimé, par ordre d'heure", () => {
    // Lundi 5 octobre : la veille, c'est le vendredi 2 — le week-end s'enjambe.
    const v = veilleDe(creneaux, "2026-10-05")!;
    expect(v.date).toBe("2026-10-02");
    expect(v.bilans.map((b) => `${b.heure} ${b.matiere}`)).toEqual(["09:00 Lecture", "10:30 Numération"]);
    expect(v.bilans[1].bilan).toBe("Les dizaines passent.\nReprendre les unités avec Louison.");
  });

  it("laissent de côté les réunions, les bilans vides, et ce qui n'est pas la veille", () => {
    const v = veilleDe(creneaux, "2026-10-05")!;
    expect(v.bilans.some((b) => b.matiere === "Synthèse" || b.matiere === "Arts")).toBe(false);
    expect(veilleDe(creneaux, "2026-10-02")!.date).toBe("2026-10-01");
    expect(veilleDe(creneaux, "2026-10-01")).toBeNull();
  });

  it("ne remontent pas plus loin quand la veille n'a laissé aucun bilan", () => {
    const sansBilan = [creneau("a", "2026-10-01", "09:00", "Lecture", "Un bilan d'avant-hier."), creneau("b", "2026-10-02", "09:00", "Lecture", "")];
    expect(veilleDe(sansBilan, "2026-10-05")).toBeNull();
    expect(veilleDe([], "2026-10-05")).toBeNull();
  });

  it("s'impriment en tête du journal, échappés, sans marqueur d'image", () => {
    const html = bilansDeLaVeilleHtml(veilleDe([creneau("a", "2026-10-02", "09:00", "Lecture <b>", "Bien [img:photo.png] <i>lu</i>.")], "2026-10-05"));
    expect(html).toContain("Bilans de la veille — vendredi 2 octobre");
    expect(html).toContain("09h00 · Lecture &lt;b&gt;");
    expect(html).toContain("Bien  &lt;i&gt;lu&lt;/i&gt;.");
    expect(html).not.toContain("[img:");
    expect(bilansDeLaVeilleHtml(null)).toBe("");
    expect(jourEnToutesLettres("2026-10-05")).toBe("lundi 5 octobre");
  });
});
