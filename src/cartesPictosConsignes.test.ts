import { describe, it, expect } from "vitest";
import {
  REGLAGES_CARTES_PICTOS, cartesParPage, coteDesCartes, coteSur, coteSurUneFeuille, htmlCartesPictos, libelleTaille, pagesDesCartesPictos,
  pictosAImprimer, pictosImprimables, verbesAImprimer, verbesAvecPicto,
} from "./cartesPictosConsignes";

const lexique = { écrire: 22, lire: 11, colorier: "bajard:Colorie01.png", comparer: "sclera:comparer.png" };
const images = { 11: "data:lire", 22: "data:ecrire", "bajard:Colorie01.png": "data:colorie" };

describe("les pictos des consignes en cartes", () => {
  it("prennent les verbes qui ont un picto, dans l'ordre de la liste, ou ceux qu'on a choisis", () => {
    expect(verbesAvecPicto(lexique)).toEqual(["lire", "écrire", "colorier", "comparer"]);
    expect(verbesAImprimer(lexique, REGLAGES_CARTES_PICTOS)).toEqual(["lire", "écrire", "colorier", "comparer"]);
    expect(verbesAImprimer(lexique, { ...REGLAGES_CARTES_PICTOS, choisis: ["colorier", "lire", "dire"] })).toEqual(["lire", "colorier"]);
  });

  it("sont des carrés : de 32 mm par défaut, ou tous sur une seule feuille", () => {
    expect(cartesParPage(30)).toBe(48);
    expect(cartesParPage(25)).toBe(63);
    expect(cartesParPage(20)).toBe(108);
    expect(libelleTaille("petit")).toBe("Petits — 3 cm, 48 par page");
    expect(libelleTaille("tresPetit")).toBe("Très petits — 2,5 cm, 63 par page");
    // Les 54 verbes : six colonnes, neuf rangées de carrés de 2,7 cm.
    expect(coteSurUneFeuille(54)).toBe(27);
    expect(coteSurUneFeuille(4)).toBe(90);
    expect(coteSurUneFeuille(5000)).toBe(15);
    const unePage = { ...REGLAGES_CARTES_PICTOS, taille: "unePage" as const };
    expect(pagesDesCartesPictos(54, unePage)).toBe(1);
    expect(pagesDesCartesPictos(54, { ...REGLAGES_CARTES_PICTOS, taille: "petit" })).toBe(2);
    expect(coteDesCartes(54, unePage)).toBe(27);
    expect(coteDesCartes(54, { taille: "moyen" })).toBe(45);
    // Les 2,7 cm d'une seule feuille étaient trop petits : 5 mm de plus dans les deux sens, sur deux pages.
    expect(coteDesCartes(54, REGLAGES_CARTES_PICTOS)).toBe(32);
    expect(cartesParPage(32)).toBe(35);
    expect(pagesDesCartesPictos(54, REGLAGES_CARTES_PICTOS)).toBe(2);
    // Sur mesure, au millimètre, entre 15 et 90 mm.
    expect(coteDesCartes(54, { taille: "surMesure", cote: 41 })).toBe(41);
    expect(coteSur(5)).toBe(15);
    expect(coteSur(120)).toBe(90);
    expect(coteSur("n'importe quoi")).toBe(32);
    expect(libelleTaille("surMesure")).toBe("Sur mesure — au millimètre");
  });

  it("se rangent en planches de carrés de la taille choisie, un jeu après l'autre", () => {
    const html = htmlCartesPictos(["lire", "écrire"], lexique, images, { ...REGLAGES_CARTES_PICTOS, taille: "petit", exemplaires: 3 });
    expect(html.match(/class="cp-carte"/g)).toHaveLength(6);
    expect(html).toContain("grid-template-columns: repeat(6, 30mm); grid-auto-rows: 30mm");
    const seule = htmlCartesPictos(["lire", "écrire"], lexique, images, { ...REGLAGES_CARTES_PICTOS, taille: "unePage" });
    expect(seule).toContain("grid-template-columns: repeat(2, 90mm); grid-auto-rows: 90mm");
    const parDefaut = htmlCartesPictos(["lire", "écrire"], lexique, images, REGLAGES_CARTES_PICTOS);
    expect(parDefaut).toContain("grid-template-columns: repeat(5, 32mm); grid-auto-rows: 32mm");
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

  it("impriment aussi les matières : après les verbes, sous leur nom sans abréviation", () => {
    const matieres = { "Mathématiques": 10260, "LVE / Anglais": 32705, "Autre": 5 };
    expect(pictosImprimables(lexique, matieres, "tout")).toEqual(["lire", "écrire", "colorier", "comparer", "Mathématiques", "LVE / Anglais"]);
    expect(pictosImprimables(lexique, matieres, "matieres")).toEqual(["Mathématiques", "LVE / Anglais"]);
    expect(pictosImprimables(lexique, matieres, "verbes")).toEqual(["lire", "écrire", "colorier", "comparer"]);
    expect(pictosAImprimer(lexique, matieres, { ...REGLAGES_CARTES_PICTOS, choisis: ["lire", "LVE / Anglais"] })).toEqual(["lire", "LVE / Anglais"]);
    const html = htmlCartesPictos(["LVE / Anglais"], { ...lexique, ...matieres }, { 32705: "data:anglais" }, REGLAGES_CARTES_PICTOS);
    expect(html).toContain('<img src="data:anglais" alt="Anglais"><div class="cp-verbe">Anglais</div>');
  });
});
