import { describe, it, expect, vi, afterEach } from "vitest";
import {
  anneeScolaireActuelle, avecCouleurChoisie, categoriesDuGenre, couleurPourMatiere,
  estAbsence, joursFeriesFR, raccourci, teinteCreneau, texteErreur,
} from "./api";

afterEach(() => { vi.useRealTimers(); });

const le = (iso: string) => { vi.useFakeTimers(); vi.setSystemTime(new Date(iso)); };

describe("api : ce qui se calcule ici", () => {
  it("bascule d'année scolaire au 1er août", () => {
    le("2026-07-31T12:00:00");
    expect(anneeScolaireActuelle()).toBe("2025-2026");
    le("2026-08-01T12:00:00");
    expect(anneeScolaireActuelle()).toBe("2026-2027");
    le("2027-01-15T12:00:00");
    expect(anneeScolaireActuelle()).toBe("2026-2027");
  });

  it("rend une erreur lisible, d'où qu'elle vienne", () => {
    expect(texteErreur("Phrase secrète absente")).toBe("Phrase secrète absente");
    expect(texteErreur(new Error("boum"))).toContain("boum");
    expect(texteErreur({ code: 42 })).toBe('{"code":42}');
    // Rien du tout reste une chaîne : le journal n'écrit pas « undefined » brut.
    expect(texteErreur(undefined)).toBe("undefined");
    expect(texteErreur(null)).toBe("null");
  });

  it("place les fêtes mobiles au bon jour", () => {
    // Pâques 2026 : dimanche 5 avril. Lundi de Pâques le 6, Ascension le 14 mai.
    const f = joursFeriesFR(2026);
    expect(f["2026-04-06"]).toBe("Lundi de Pâques");
    expect(f["2026-05-14"]).toBe("Ascension");
    expect(f["2026-05-25"]).toBe("Lundi de Pentecôte");
    // Et les dates fixes, qui ne bougent pas.
    expect(f["2026-01-01"]).toBe("Jour de l'an");
    expect(f["2026-12-25"]).toBe("Noël");
    expect(Object.keys(f)).toHaveLength(11);
    // Pâques 2027 : dimanche 28 mars.
    expect(joursFeriesFR(2027)["2027-03-29"]).toBe("Lundi de Pâques");
  });

  it("donne une couleur à chaque matière, et retient celle qu'on choisit", () => {
    const defaut = couleurPourMatiere("Mobiliser le langage");
    expect(defaut).toBe("blue");
    // Choisir la couleur par défaut n'enregistre rien : c'est déjà le cas.
    expect(avecCouleurChoisie({}, "Mobiliser le langage", "blue")).toEqual({});
    expect(avecCouleurChoisie({}, "Mobiliser le langage", "red"))
      .toEqual({ "Mobiliser le langage": "red" });
    // Revenir au défaut efface le choix.
    expect(avecCouleurChoisie({ Sport: "red" }, "Sport", "")).toEqual({});
    // Une matière inconnue reçoit tout de même une teinte.
    expect(teinteCreneau({ matiere: "Bricolage" })).toMatch(/^#[0-9a-f]{6}$/i);
    expect(teinteCreneau({ matiere: "", couleur: "green" })).toBe("#22c55e");
    expect(teinteCreneau({ matiere: "", couleur: "inconnue" })).toBe("#3b82f6");
  });

  it("reconnaît une absence, quelle qu'en soit la moitié de journée", () => {
    expect(estAbsence("absent")).toBe(true);
    expect(estAbsence("absentMatin")).toBe(true);
    expect(estAbsence("absentAprem")).toBe(true);
    expect(estAbsence("present")).toBe(false);
    expect(estAbsence("")).toBe(false);
  });

  it("propose des catégories selon le genre d'outil", () => {
    expect(categoriesDuGenre("affichage").length).toBeGreaterThan(0);
    expect(categoriesDuGenre("evaluation").length).toBeGreaterThan(0);
    // Le raccourci se dit dans la langue du clavier.
    expect(raccourci("K")).toMatch(/^(⌘K|Ctrl\+K)$/);
  });
});
