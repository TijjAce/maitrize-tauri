import { describe, expect, it } from "vitest";
import { ajouterPage, nouveauClasseur, nouvellePage, poserCase } from "../classeur/src/modele";
import { versObz } from "../classeur/src/obz";
import { NATURES } from "./tla";
import { enHex, gabaritsDepuisObz } from "./tlaObz";

const PNG = "iVBORw0KGgo=";

describe("le classeur de l'iPad revient dans Maitrize, en tableaux de langage (5 novembre 2026)", () => {
  it("reprend chaque page, ses liens, ses cases cachées, ses natures à leur couleur, ses pictos d'ARASAAC à leur numéro et ses photos", async () => {
    // Un classeur fait sur l'iPad, exporté par le code même de l'application (classeur/src/obz.ts).
    let c = nouveauClasseur("Classeur de la classe", 2, 3);
    const veux = nouvellePage("Je veux", 1, 2);
    c = ajouterPage(c, veux);
    const verbe = NATURES.find((n) => n.id === "verbe")!.couleur;
    c = poserCase(c, c.accueil, 0, { id: "a", mot: "je veux", lien: veux.id, fond: verbe, bord: "#2e9b3e", image: "arasaac-6456" });
    c = poserCase(c, c.accueil, 2, { id: "b", mot: "aide", masquee: true, fond: "#123456" });
    c = poserCase(c, veux.id, 1, { id: "c", mot: "le ballon de la classe", image: "photo-1" });
    const fichiers = versObz(c, { "arasaac-6456": `data:image/png;base64,${PNG}`, "photo-1": `data:image/jpeg;base64,${PNG}` });

    const photos: { mot: string; ext: string }[] = [];
    const [accueil, page] = await gabaritsDepuisObz(fichiers, async (mot, _b64, ext) => { photos.push({ mot, ext }); return -2_100_000_123; });
    expect(accueil.nom).toBe("Accueil");
    expect([accueil.lignes, accueil.colonnes]).toEqual([2, 3]);
    expect(accueil.eleve).toBe("");
    expect(accueil.cases).toHaveLength(6);
    expect(accueil.cases[0]).toMatchObject({ mot: "je veux", nature: "verbe", pictoId: 6456, lien: page.id });
    expect(accueil.cases[0].couleur).toBeUndefined();
    expect(accueil.cases[2]).toMatchObject({ mot: "aide", masquee: true, couleur: "#123456", nature: "nom" });
    expect(accueil.cases[1].mot).toBe("");
    // La photo prise sur la tablette rejoint Mes photos, et la case la montre.
    expect(photos).toEqual([{ mot: "le ballon de la classe", ext: "jpg" }]);
    expect(page.cases[1]).toMatchObject({ mot: "le ballon de la classe", pictoId: -2_100_000_123 });
  });

  it("lit les couleurs du format, et refuse une archive sans tableau", async () => {
    expect(enHex("rgb(217, 240, 212)")).toBe("#d9f0d4");
    expect(enHex("pas une couleur")).toBeUndefined();
    await expect(gabaritsDepuisObz({ textes: {}, images: {} }, async () => null)).rejects.toThrow(/aucun tableau/);
  });
});
