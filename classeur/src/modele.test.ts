import { describe, expect, it } from "vitest";
import {
  ajouterPage, casesPerdues, changerTaille, ditDeLaCase, dupliquer, fairePageDAccueil, imagesDuClasseur, lireClasseur, nouveauClasseur,
  nouvellePage, poserCase, redimensionner, supprimerPage, texteDeLaPhrase, type Case,
} from "./modele";

const k = (mot: string, autre: Partial<Case> = {}): Case => ({ id: mot, mot, ...autre });

describe("le classeur de communication (demande de l'enseignant, 5 novembre 2026)", () => {
  it("naît avec une page d'accueil vide, à la taille demandée, bornée", () => {
    const c = nouveauClasseur("  ", 3, 4, "2026-11-05T10:00:00.000Z");
    expect(c.nom).toBe("Mon classeur");
    expect(c.pages).toHaveLength(1);
    expect(c.accueil).toBe(c.pages[0].id);
    expect(c.pages[0].cases).toHaveLength(12);
    expect(nouvellePage("x", 40, 0).cases).toHaveLength(8 * 1);
  });

  it("pose, déplace et retire des cases sans toucher au classeur d'avant", () => {
    const c = nouveauClasseur("Essai", 2, 3);
    const p = c.pages[0].id;
    const c2 = poserCase(c, p, 4, k("manger"));
    expect(c.pages[0].cases[4]).toBeNull();
    expect(c2.pages[0].cases[4]?.mot).toBe("manger");
    expect(poserCase(c2, p, 99, k("x")).pages[0].cases).toEqual(c2.pages[0].cases);
  });

  it("change de taille en gardant chaque case à sa ligne et à sa colonne, et dit ce qui serait perdu", () => {
    const p = { ...nouvellePage("p", 2, 3), cases: [k("a"), null, k("c"), null, k("e"), null] };
    expect(casesPerdues(p, 2, 2)).toBe(1);
    const plus = redimensionner(p, 3, 4);
    expect(plus.cases.map((x) => x?.mot ?? null)).toEqual(["a", null, "c", null, null, "e", null, null, null, null, null, null]);
    const moins = redimensionner(p, 2, 2);
    expect(moins.cases.map((x) => x?.mot ?? null)).toEqual(["a", null, null, "e"]);
    const c = nouveauClasseur("x", 2, 3);
    expect(changerTaille(c, c.pages[0].id, 5, 5).pages[0].cases).toHaveLength(25);
  });

  it("retire une page avec les liens qui y menaient, garde la dernière, et déplace l'accueil s'il le faut", () => {
    let c = nouveauClasseur("x", 2, 2);
    const accueil = c.pages[0].id;
    const veux = nouvellePage("Je veux", 2, 2);
    c = ajouterPage(c, veux);
    c = poserCase(c, accueil, 0, k("je veux", { lien: veux.id }));
    const sans = supprimerPage(c, veux.id);
    expect(sans.pages).toHaveLength(1);
    expect(sans.pages[0].cases[0]?.lien).toBeUndefined();
    expect(supprimerPage(sans, accueil)).toBe(sans);
    const autreAccueil = supprimerPage(fairePageDAccueil(c, accueil), accueil);
    expect(autreAccueil.accueil).toBe(veux.id);
  });

  it("dit la phrase de la case, sinon son mot ; enchaîne la phrase de l'élève", () => {
    expect(ditDeLaCase({ mot: "mal", dire: "J'ai mal" })).toBe("J'ai mal");
    expect(ditDeLaCase({ mot: " encore ", dire: "  " })).toBe("encore");
    expect(texteDeLaPhrase([{ mot: "je veux", dire: "je veux" }, { mot: "eau", dire: "de l'eau" }])).toBe("je veux de l'eau");
  });

  it("relit un classeur gardé en remettant d'aplomb ce qui déborde, et refuse l'illisible", () => {
    const c = nouveauClasseur("x", 2, 2);
    c.pages[0].cases = [k("a"), k("b"), k("c"), k("d"), k("en trop")];
    const relu = lireClasseur(JSON.stringify({ ...c, accueil: "inconnue" }))!;
    expect(relu.pages[0].cases).toHaveLength(4);
    expect(relu.accueil).toBe(relu.pages[0].id);
    expect(lireClasseur("{pas du json")).toBeNull();
    expect(lireClasseur({ id: "x", pages: [] })).toBeNull();
  });

  it("liste ses images une fois, et se duplique sous un autre identifiant", () => {
    let c = nouveauClasseur("x", 1, 3);
    c = poserCase(c, c.pages[0].id, 0, k("a", { image: "arasaac-1" }));
    c = poserCase(c, c.pages[0].id, 1, k("b", { image: "arasaac-1" }));
    c = poserCase(c, c.pages[0].id, 2, k("c", { image: "photo-2" }));
    expect(imagesDuClasseur(c)).toEqual(["arasaac-1", "photo-2"]);
    const d = dupliquer(c, "Copie");
    expect(d.id).not.toBe(c.id);
    expect(d.pages[0].cases[2]?.image).toBe("photo-2");
  });
});
