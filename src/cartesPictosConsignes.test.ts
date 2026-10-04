import { describe, it, expect } from "vitest";
import {
  REGLAGES_CARTES_PICTOS, cartesParPage, coteDesCartes, coteSurUneFeuille, htmlCartesPictos, libelleTaille, pagesDesCartesPictos,
  verbesAImprimer, verbesAvecPicto,
} from "./cartesPictosConsignes";

const lexique = { écrire: 22, lire: 11, colorier: "bajard:Colorie01.png", comparer: "sclera:comparer.png" };
const images = { 11: "data:lire", 22: "data:ecrire", "bajard:Colorie01.png": "data:colorie" };

describe("les pictos des consignes en cartes", () => {
  it("prennent les verbes qui ont un picto, dans l'ordre de la liste, ou ceux qu'on a choisis", () => {
    expect(verbesAvecPicto(lexique)).toEqual(["lire", "écrire", "colorier", "comparer"]);
    expect(verbesAImprimer(lexique, REGLAGES_CARTES_PICTOS)).toEqual(["lire", "écrire", "colorier", "comparer"]);
    expect(verbesAImprimer(lexique, { ...REGLAGES_CARTES_PICTOS, choisis: ["colorier", "lire", "dire"] })).toEqual(["lire", "colorier"]);
  });

  it("sont des carrés, et tiennent par défaut sur une seule feuille", () => {
    expect(cartesParPage(30)).toBe(48);
    expect(cartesParPage(25)).toBe(63);
    expect(cartesParPage(20)).toBe(108);
    expect(libelleTaille("petit")).toBe("Petits — 3 cm, 48 par page");
    expect(libelleTaille("tresPetit")).toBe("Très petits — 2,5 cm, 63 par page");
    // Les 54 verbes : six colonnes, neuf rangées de carrés de 2,7 cm.
    expect(coteSurUneFeuille(54)).toBe(27);
    expect(coteSurUneFeuille(4)).toBe(90);
    expect(coteSurUneFeuille(5000)).toBe(15);
    expect(pagesDesCartesPictos(54, REGLAGES_CARTES_PICTOS)).toBe(1);
    expect(pagesDesCartesPictos(54, { ...REGLAGES_CARTES_PICTOS, taille: "petit" })).toBe(2);
    expect(coteDesCartes(54, REGLAGES_CARTES_PICTOS)).toBe(27);
    expect(coteDesCartes(54, { taille: "moyen" })).toBe(45);
  });

  it("se rangent en planches de carrés de la taille choisie, un jeu après l'autre", () => {
    const html = htmlCartesPictos(["lire", "écrire"], lexique, images, { ...REGLAGES_CARTES_PICTOS, taille: "petit", exemplaires: 3 });
    expect(html.match(/class="cp-carte"/g)).toHaveLength(6);
    expect(html).toContain("grid-template-columns: repeat(6, 30mm); grid-auto-rows: 30mm");
    const seule = htmlCartesPictos(["lire", "écrire"], lexique, images, REGLAGES_CARTES_PICTOS);
    expect(seule).toContain("grid-template-columns: repeat(2, 90mm); grid-auto-rows: 90mm");
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
