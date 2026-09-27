import { describe, it, expect } from "vitest";
import { chercherAteliers } from "./pages/Jeux";

const familles = [
  { libelle: "🗣 Langage", outils: [
    { id: "jeux" as const, nom: "Loto", icone: "🎲", quoi: "Des planches et leurs cartes à découper." },
    { id: "sons" as const, nom: "Fiches de sons", icone: "🔤", quoi: "Syllabes, mots à lire, à entourer." },
  ] },
  { libelle: "🔢 Mathématiques", outils: [
    { id: "coloriage" as const, nom: "Coloriage magique", icone: "🎨",
      quoi: "On calcule, le résultat dit la couleur." },
  ] },
];

describe("chercher un atelier", () => {
  it("trouve par le nom, par ce qu'il fabrique, ou par la famille", () => {
    expect(chercherAteliers(familles, "loto").map((o) => o.id)).toEqual(["jeux"]);
    // Par ce qu'on obtient, quand on ne connaît pas le nom de l'atelier.
    expect(chercherAteliers(familles, "syllabes").map((o) => o.id)).toEqual(["sons"]);
    expect(chercherAteliers(familles, "couleur").map((o) => o.id)).toEqual(["coloriage"]);
    // Par la famille : « langage » remonte les deux.
    expect(chercherAteliers(familles, "langage").map((o) => o.id)).toEqual(["jeux", "sons"]);
  });

  it("ignore les accents et la casse", () => {
    expect(chercherAteliers(familles, "MAGIQUE").map((o) => o.id)).toEqual(["coloriage"]);
    expect(chercherAteliers(familles, "mathematiques").map((o) => o.id)).toEqual(["coloriage"]);
    expect(chercherAteliers(familles, "decouper").map((o) => o.id)).toEqual(["jeux"]);
  });

  it("ne rend rien sur une recherche vide, et rien sur l'introuvable", () => {
    expect(chercherAteliers(familles, "")).toEqual([]);
    expect(chercherAteliers(familles, "   ")).toEqual([]);
    expect(chercherAteliers(familles, "trombone")).toEqual([]);
  });
});
