import { describe, expect, it } from "vitest";
import {
  CONSIGNE_VISIBILEO, EXEMPLE_VISIBILEO, REGLAGES_VISIBILEO, ajouterPage, cequiManque, htmlMemo, htmlPieces, htmlPreparation, htmlVisibileo,
  idsDesImages, lirePremierJet, motsDeLExemple, personnageVide, pieceVide, reglagesSurs, type ReglagesVisibileo,
} from "./visibileo";
import { SOURCES_DES_ATELIERS } from "./sourcesDesAteliers";

// Personnages et pièces de l'exemple : ceux d'une fable du domaine public.
const histoire = (): ReglagesVisibileo => reglagesSurs({
  titre: "Le Corbeau et le Renard",
  personnages: [{ ...personnageVide(0), nom: "Le corbeau" }, { ...personnageVide(1), nom: "Le renard", image: { id: 7, mot: "renard" } }],
  pieces: [
    { genre: "cadre", texte: "Le corbeau tient un fromage.", image: { id: 5, mot: "fromage" }, qui: -1 },
    { genre: "nuage", texte: "Je veux ce fromage.", image: { id: null, mot: "" }, qui: 1 },
    { genre: "bulle", texte: "Que vous êtes joli !", image: { id: null, mot: "" }, qui: 1 },
  ],
});
const compter = (html: string, classe: string) => html.split(`class="vb-piece ${classe}`).length - 1;

describe("le Visibiléo : les pièces pour construire avec la classe la trace d'un récit (demande de l'enseignant, 2026-11-03)", () => {
  it("fait les pièces à découper : personnages, cadres, nuages et bulles à la couleur de qui pense ou parle, vierges et flèches", () => {
    const r = histoire();
    const html = htmlPieces(r, { 5: "data:fromage", 7: "data:renard" });
    expect(compter(html, "vb-personnage")).toBe(2);
    // Une pièce écrite par genre ; les vierges : 4 cadres, et pour chacun des deux personnages 2 nuages et 1 bulle.
    expect(compter(html, "vb-cadre")).toBe(1 + 4);
    expect(compter(html, "vb-nuage")).toBe(1 + 2 * 2);
    expect(compter(html, "vb-bulle")).toBe(1 + 2 * 1);
    expect(compter(html, "vb-fleche")).toBe(6 + 4);
    expect(html).toContain("« Que vous êtes joli ! »");
    expect(html).toContain('src="data:fromage"');
    // Le nuage du renard est à sa couleur ; les flèches, rouges pour les causes et bleues pour l'ordre.
    expect(html).toContain(`stroke="${r.personnages[1].couleur}"`);
    expect(html).toContain('stroke="#e03131"');
    expect(html).toContain('stroke="#1971c2"');
  });

  it("montre l'image seule sans les mots, pour qui ne lit pas encore — et garde les mots d'une pièce sans image", () => {
    const html = htmlPieces({ ...histoire(), mots: false }, { 5: "data:fromage" });
    expect(html).not.toContain("Le corbeau tient un fromage.");
    expect(html).toContain("Je veux ce fromage.");
  });

  it("écrit le mémo dans les mots de la classe, et la fiche de préparation avec ce que l'enseignant a prévu", () => {
    const r = { ...histoire(), libelles: { ...histoire().libelles, rouge: "à cause de" } };
    const memo = htmlMemo(r, {});
    expect(memo).toContain("à cause de");
    expect(memo).toContain("Le renard");
    const fiche = htmlPreparation(r);
    expect(fiche).toContain("Le corbeau tient un fromage.");
    expect(fiche).toContain("<b>Le renard</b> : Je veux ce fromage.");
    expect(fiche).toContain("de ce qui arrive, remontons à ce qui l'a causé");
    // Seules les feuilles cochées s'impriment.
    const seules = htmlVisibileo({ ...r, feuilles: { pieces: false, memo: true, preparation: false } }, {});
    expect(seules).toContain("vb-memo");
    expect(seules).not.toContain("vb-pieces");
    expect(seules).not.toContain("vb-preparation");
  });

  it("répare des réglages abîmés : couleurs, nombres bornés, pièces d'un genre inconnu ou d'un personnage disparu", () => {
    const r = reglagesSurs({
      personnages: [{ nom: "A", image: { id: null, mot: "" }, couleur: "rouge" }],
      pieces: [{ genre: "carte" as never, texte: "x", image: { id: null, mot: "" }, qui: 0 }, { ...pieceVide("nuage"), texte: "y", qui: 4 }],
      vierges: { cadre: 99, nuage: -3, bulle: 1.6 },
      libelles: { cadre: "  ", nuage: "pense", bulle: "dit", rouge: "", bleue: "puis" },
    });
    expect(r.personnages[0].couleur).toMatch(/^#[0-9a-f]{6}$/i);
    expect(r.pieces).toEqual([{ ...pieceVide("nuage"), texte: "y", qui: -1 }]);
    expect(r.vierges).toEqual({ cadre: 12, nuage: 0, bulle: 2 });
    expect(r.libelles.cadre).toBe(REGLAGES_VISIBILEO.libelles.cadre);
    expect(r.libelles.rouge).toBe("parce que");
    expect(r.libelles.nuage).toBe("pense");
    expect(reglagesSurs({})).toEqual(REGLAGES_VISIBILEO);
  });

  it("dit ce qui manque, charge les images utiles, a son exemple et sa source", () => {
    expect(cequiManque(REGLAGES_VISIBILEO)).toMatch(/titre/);
    expect(cequiManque(histoire())).toBeNull();
    expect(cequiManque({ ...histoire(), feuilles: { pieces: false, memo: false, preparation: false } })).toMatch(/feuille/);
    expect(idsDesImages(histoire())).toEqual([7, 5]);
    expect(motsDeLExemple()).toContain("corbeau");
    expect(EXEMPLE_VISIBILEO.pieces.every((p) => p.qui < EXEMPLE_VISIBILEO.personnages.length)).toBe(true);
    expect(SOURCES_DES_ATELIERS.visibileo).toMatch(/Marie-France Bishop/);
  });

  it("relit le premier jet de l'IA : un genre inconnu, un personnage qui n'existe pas, une pièce vide s'écartent (« elle se construit toute seule avec l'IA »)", () => {
    const reponse = `Voici : ${JSON.stringify({
      titre: "Le Corbeau et le Renard",
      personnages: [{ nom: "Le corbeau", image: "corbeau" }, { nom: "Le renard", image: "renard" }, { nom: "", image: "x" }],
      pieces: [
        { genre: "cadre", texte: "Le corbeau tient un fromage.", qui: 1, image: "fromage" },
        { genre: "nuage", texte: "Je veux ce fromage.", qui: 1, image: "vouloir" },
        { genre: "bulle", texte: "« Que vous êtes joli ! »", qui: 1, image: "parler fort" },
        { genre: "nuage", texte: "Je suis beau.", qui: 9, image: "fier" },
        { genre: "carte", texte: "?", qui: 0, image: "" },
        { genre: "cadre", texte: "   ", qui: -1, image: "rien" },
      ],
    })} — bonne lecture.`;
    expect(lirePremierJet(reponse)).toEqual({
      titre: "Le Corbeau et le Renard",
      personnages: [{ nom: "Le corbeau", image: "corbeau" }, { nom: "Le renard", image: "renard" }],
      pieces: [
        // Un cadre n'est à personne ; les guillemets d'une bulle tombent, l'image garde un seul mot ; un personnage inconnu, personne.
        { genre: "cadre", texte: "Le corbeau tient un fromage.", qui: -1, image: "fromage" },
        { genre: "nuage", texte: "Je veux ce fromage.", qui: 1, image: "vouloir" },
        { genre: "bulle", texte: "Que vous êtes joli !", qui: 1, image: "parler" },
        { genre: "nuage", texte: "Je suis beau.", qui: -1, image: "fier" },
      ],
    });
    expect(lirePremierJet("Je n'ai pas compris.")).toBeNull();
    expect(lirePremierJet("{}")).toBeNull();
    // La consigne dit la méthode et la forme de la réponse.
    expect(CONSIGNE_VISIBILEO).toMatch(/nuages pour ce que pense, croit ou veut/);
    expect(CONSIGNE_VISIBILEO).toMatch(/"pieces"/);
  });

  it("met les pages lues à la suite, une ligne vide entre deux, et garde le texte dans les réglages", () => {
    expect(ajouterPage("", "  Il était une fois.  ")).toBe("Il était une fois.");
    expect(ajouterPage("Il était une fois.", "Un corbeau.\n")).toBe("Il était une fois.\n\nUn corbeau.");
    expect(ajouterPage("Il était une fois.", "   ")).toBe("Il était une fois.");
    expect(reglagesSurs({ texte: "Maître Corbeau" }).texte).toBe("Maître Corbeau");
    expect(reglagesSurs({ texte: 3 as never }).texte).toBe("");
  });
});
