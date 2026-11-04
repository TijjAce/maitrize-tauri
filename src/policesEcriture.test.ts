import { describe, expect, it } from "vitest";
import { documentImprimable } from "./print";
import { REGLAGES_CURSIVE, STYLE_CURSIVE, htmlEcritureCursive } from "./ecritureCursive";
import {
  CHOIX_PAR_DEFAUT, POLICES_CURSIVES, POLICE_CURSIVE, chargerLesLignes, choixSur, cssDuChoix, famillesDuChoix, lignesChargees, lignesDuChoix,
  policeCursive, policeDuDocument, tailleCursive,
} from "./policesEcriture";

describe("La police cursive des feuilles", () => {
  it("est d'abord Marelle, la police cursive du ministère, embarquée dans l'application", () => {
    expect(CHOIX_PAR_DEFAUT.id).toBe("marelle");
    for (const p of POLICES_CURSIVES.filter((x) => x.id.startsWith("marelle"))) {
      expect(p.fichier, p.id).toMatch(/^data:font\/woff2;base64,d09GMg/);
      // Ses petites lettres font 0,48 de sa taille : 18 pt pour une réglure de 3 mm.
      expect(p.x).toBe(0.48);
    }
  });

  it("met la police dans un document qui écrit en cursive, et seulement là", () => {
    const html = documentImprimable("Cursive", `<p style="font-family: ${POLICE_CURSIVE}">lilas</p>`);
    expect(html).toContain('@font-face { font-family: "Marelle"; src: url(data:font/woff2;base64,');
    expect(html).toContain('--police-cursive: "Marelle", "Snell Roundhand", cursive; --police-cursive-x: 0.48;');
    expect(documentImprimable("Calcul", "<p>2 + 3</p>")).not.toContain("@font-face");
    expect(policeDuDocument("rien", CHOIX_PAR_DEFAUT)).toBe("");
  });

  it("prend une police installée sans l'embarquer, avec la cursive du système en secours", () => {
    const css = cssDuChoix({ id: "belle-allure", autre: "" });
    expect(css).not.toContain("@font-face");
    expect(css).toContain('--police-cursive: "Belle Allure CE", "Belle Allure GS", "Belle Allure CM", "Snell Roundhand", cursive; --police-cursive-x: 0.4;');
    expect(famillesDuChoix({ id: "autre", autre: "Ma Cursive" })).toBe('"Ma Cursive", "Snell Roundhand", cursive');
    expect(cssDuChoix({ id: "marelle-baton", autre: "" })).toContain('font-family: "Marelle Bâton"');
  });

  it("répare un choix abîmé, et refuse ce qui sortirait du nom de la police", () => {
    expect(choixSur(null)).toEqual(CHOIX_PAR_DEFAUT);
    expect(choixSur({ id: "inconnue" })).toEqual(CHOIX_PAR_DEFAUT);
    // « Une autre police », tant que son nom n'est pas écrit : Marelle.
    expect(cssDuChoix(choixSur({ id: "autre", autre: "" }))).toContain('font-family: "Marelle"');
    expect(choixSur({ id: "autre", autre: 'X"; } body { display: none' }).autre).toBe("X  body  display: none");
    expect(policeCursive("ecriture-a").familles).toEqual(["Écriture A", "Ecriture A"]);
  });

  it("dit la taille d'une cursive d'après la hauteur de ses petites lettres", () => {
    expect(tailleCursive(3)).toBe("calc(3px / var(--police-cursive-x, 0.4))");
    expect(tailleCursive(9, "mm")).toBe("calc(9mm / var(--police-cursive-x, 0.4))");
    expect(POLICE_CURSIVE.startsWith("var(--police-cursive, ")).toBe(true);
  });

  it("ajoute la police à lignes de Marelle aux feuilles qui s'en servent, une fois chargée", async () => {
    const feuille = htmlEcritureCursive({ ...REGLAGES_CURSIVE, guide: "marelle", modeles: "an" });
    // Avant le chargement : le nom de la police, pas encore son fichier.
    if (!lignesChargees()) expect(policeDuDocument(feuille + STYLE_CURSIVE, CHOIX_PAR_DEFAUT)).not.toContain('font-family: "Marelle LIGNES"');
    await chargerLesLignes();
    const html = documentImprimable("Lignes", feuille, STYLE_CURSIVE);
    expect(html).toContain('@font-face { font-family: "Marelle LIGNES"; src: url(data:font/woff2;base64,');
    expect(html).toContain('--police-lignes: "Marelle LIGNES";');
    // Les variantes suivent le choix ; une autre police prend les lignes de Marelle.
    expect(lignesDuChoix({ id: "marelle-baton-2", autre: "" })).toBe("Marelle LIGNES Bâton 2");
    expect(lignesDuChoix({ id: "belle-allure", autre: "" })).toBe("Marelle LIGNES");
    expect(cssDuChoix({ id: "marelle-2", autre: "" }, ":root", true)).toContain('font-family: "Marelle LIGNES 2"');
    // Une feuille sans les lignes de Marelle n'emporte pas leur fichier.
    expect(documentImprimable("Cursive", `<p style="font-family: ${POLICE_CURSIVE}">lilas</p>`)).not.toContain("Marelle LIGNES\"; src");
  });
});
