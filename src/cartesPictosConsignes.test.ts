import { describe, it, expect } from "vitest";
import {
  REGLAGES_CARTES_PICTOS, TAILLES_PICTOS, htmlCartesPictos, pagesDesCartesPictos, verbesAImprimer, verbesAvecPicto,
} from "./cartesPictosConsignes";

const lexique = { écrire: 22, lire: 11, colorier: "bajard:Colorie01.png", comparer: "sclera:comparer.png" };
const images = { 11: "data:lire", 22: "data:ecrire", "bajard:Colorie01.png": "data:colorie" };

describe("les pictos des consignes en cartes", () => {
  it("prennent les verbes qui ont un picto, dans l'ordre de la liste, ou ceux qu'on a choisis", () => {
    expect(verbesAvecPicto(lexique)).toEqual(["lire", "écrire", "colorier", "comparer"]);
    expect(verbesAImprimer(lexique, REGLAGES_CARTES_PICTOS)).toEqual(["lire", "écrire", "colorier", "comparer"]);
    expect(verbesAImprimer(lexique, { ...REGLAGES_CARTES_PICTOS, choisis: ["colorier", "lire", "dire"] })).toEqual(["lire", "colorier"]);
  });

  it("se rangent en planches de la taille choisie, un jeu après l'autre", () => {
    const r = { ...REGLAGES_CARTES_PICTOS, taille: "tresPetit" as const, exemplaires: 3 };
    expect(TAILLES_PICTOS.tresPetit.colonnes * TAILLES_PICTOS.tresPetit.lignes).toBe(48);
    expect(pagesDesCartesPictos(54, r)).toBe(4);
    expect(pagesDesCartesPictos(54, { ...r, taille: "petit", exemplaires: 1 })).toBe(3);
    const html = htmlCartesPictos(["lire", "écrire"], lexique, images, r);
    expect(html.match(/class="cp-carte"/g)).toHaveLength(6);
    expect(html).toContain("cp-tresPetit");
    expect(html).toContain("grid-template-columns: repeat(6, 1fr)");
  });

  it("écrivent le verbe à la demande, gardent la place d'une image qui manque, et citent les banques imprimées", () => {
    const avec = htmlCartesPictos(["lire", "colorier", "comparer"], lexique, images, REGLAGES_CARTES_PICTOS);
    expect(avec).toContain('<img src="data:colorie" alt="colorier"><div class="cp-verbe">colorier</div>');
    expect(avec).toContain('<span class="cp-manque">comparer</span>');
    expect(avec).toContain('<div class="attribution">Pictogrammes : ARASAAC');
    expect(avec).toContain("François Bajard");
    // L'image de Sclera manque : la mention ne la cite pas.
    expect(avec).not.toContain("Sclera");
    const sans = htmlCartesPictos(["lire"], lexique, images, { ...REGLAGES_CARTES_PICTOS, verbe: false });
    expect(sans).not.toContain("cp-verbe");
    expect(htmlCartesPictos([], lexique, images, REGLAGES_CARTES_PICTOS)).toContain("Donnez d'abord un picto");
  });
});
