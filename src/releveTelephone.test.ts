import { describe, it, expect, vi } from "vitest";

vi.mock("./api", () => ({ api: {}, texteErreur: (e: unknown) => String(e) }));
vi.mock("./components/Toaster", () => ({ toast: () => {} }));

import { annonceDeLaReleve, resumeDeLaReleve } from "./releveTelephone";
import type { BilanReleve } from "./api";

const bilan = (p: Partial<BilanReleve> = {}): BilanReleve => ({
  relie: true, occupe: false, vocaux: 0, notes: 0, pages: 0, pagesEnAttente: 0, illisibles: 0, agendaPublie: false, erreur: "", ...p,
});

describe("la relève du téléphone", () => {
  it("annonce ce qui vient d'arriver, et se tait quand rien n'arrive", () => {
    expect(annonceDeLaReleve(bilan())).toBe("");
    expect(annonceDeLaReleve(bilan({ vocaux: 1 }))).toBe("1 dictée reçue du téléphone");
    expect(annonceDeLaReleve(bilan({ vocaux: 3 }))).toBe("3 dictées reçues du téléphone");
    expect(annonceDeLaReleve(bilan({ notes: 1 }))).toBe("1 note reçue du téléphone");
    expect(annonceDeLaReleve(bilan({ vocaux: 1, notes: 1 }))).toBe("1 dictée et 1 note reçues du téléphone");
    expect(annonceDeLaReleve(bilan({ vocaux: 2, notes: 4 }))).toBe("2 dictées et 4 notes reçues du téléphone");
  });

  it("résume le dernier passage en une ligne, avec ce qui reste à faire", () => {
    expect(resumeDeLaReleve(null)).toContain("Pas encore");
    expect(resumeDeLaReleve({ quand: 1, bilan: bilan(), erreur: "" })).toBe("rien de nouveau");
    expect(resumeDeLaReleve({ quand: 1, bilan: null, erreur: "Nuage injoignable" })).toBe("⚠️ Nuage injoignable");
    const charge = resumeDeLaReleve({ quand: 1, bilan: bilan({ vocaux: 2, pagesEnAttente: 3, illisibles: 1, erreur: "Enregistrement vide." }), erreur: "" });
    expect(charge).toContain("2 dictées reçues du téléphone");
    expect(charge).toContain("3 pages scannées en attente");
    expect(charge).toContain("1 dépôt illisible");
    expect(charge).toContain("Enregistrement vide.");
  });
});
