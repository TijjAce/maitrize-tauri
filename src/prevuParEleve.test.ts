import { describe, expect, it } from "vitest";
import { elevesDuPassage, estPartage, prevuDeLEleve, segmentsDuPrevu, surlignerPour } from "./prevuParEleve";

// Prénoms inventés : jamais ceux de la classe.
const groupe = ["Lina", "Tom", "Zoé"];

describe("le prévu d'un créneau de groupe, élève par élève (demandes de l'enseignant, 2026-11-02)", () => {
  it("donne à chaque élève ce qui est à tous et ses étapes, dans l'ordre où ils sont écrits", () => {
    // « Deux élèves peuvent faire la même chose, mais pas au même moment. »
    const prevu = ["🔁 La date", "Lina : la frise", "Tom : le loto", "Lina : le loto", "Tom : la frise", "Pour la séance : on range"].join("\n");
    expect(prevuDeLEleve(prevu, "Lina", groupe)).toEqual({ texte: "🔁 La date\nla frise\nle loto\nPour la séance : on range", etapes: [1, 2] });
    expect(prevuDeLEleve(prevu, "tom", groupe).texte).toBe("🔁 La date\nle loto\nla frise\nPour la séance : on range");
    // Un élève sans étape a ce qui est à tous ; un prévu sans étapes reste entier.
    expect(prevuDeLEleve(prevu, "Zoé", groupe)).toEqual({ texte: "🔁 La date\nPour la séance : on range", etapes: [] });
    expect(prevuDeLEleve("Lecture à deux", "Lina", groupe)).toEqual({ texte: "Lecture à deux", etapes: [] });
    expect(estPartage(prevu, groupe)).toBe(true);
    expect(estPartage(prevu, [])).toBe(false);
  });

  it("lit une étape à plusieurs, sans tenir compte des accents ni des majuscules ; une phrase qui cite un prénom n'en est pas une", () => {
    const prevu = "pour LINA et Zoe : la frise\nPour Tom, Lina : le loto\nTom\nLina et Tom rangent ensemble";
    expect(prevuDeLEleve(prevu, "Lina", groupe).texte).toBe("la frise\nle loto\nLina et Tom rangent ensemble");
    expect(prevuDeLEleve(prevu, "Zoé", groupe).texte).toBe("la frise\nLina et Tom rangent ensemble");
    // Un prénom seul n'est l'étape de personne : ce qui le suit est à tous.
    expect(prevuDeLEleve(prevu, "Tom", groupe).texte).toBe("le loto\nLina et Tom rangent ensemble");
    expect(estPartage("Lecture à deux\nLina et Tom lisent", groupe)).toBe(false);
  });

  it("surligne au cahier journal l'étape d'un élève de sa couleur, son prénom plus fort ; celle de plusieurs en gris", () => {
    const texte = "matériel\nPour Lina : la frise\nTom et Lina : le loto";
    const segments = segmentsDuPrevu(texte, groupe);
    expect(segments.map((s) => s.texte).join("")).toBe(texte);
    expect(segments.filter((s) => s.genre).map((s) => [s.texte, s.genre, s.couleur])).toEqual([
      ["Pour ", "eleve", 0], ["Lina", "eleve-nom", 0], [" : la frise", "eleve", 0],
      ["Tom", "eleve-nom", 1], [" et ", "eleves", undefined], ["Lina", "eleve-nom", 0], [" : le loto", "eleves", undefined],
    ]);
    expect(segmentsDuPrevu(texte, [])).toEqual([{ texte, genre: "" }]);
  });

  it("donne le passage sélectionné à un élève, puis à un autre, le reprend, et le rend à tous (le bouton 🖍 Surligner)", () => {
    const prevu = "🔁 La date\nla frise\nle loto";
    const debut = prevu.indexOf("la frise");
    const a = surlignerPour(prevu, debut, debut + "la frise".length, "Lina", groupe)!;
    expect(a.texte).toBe("🔁 La date\nLina : la frise\nle loto");
    expect(a.texte.slice(a.debut, a.fin)).toBe("Lina : la frise");
    expect(elevesDuPassage(a.texte, a.debut, a.fin, groupe)).toEqual(["Lina"]);
    const b = surlignerPour(a.texte, a.debut, a.fin, "Tom", groupe)!;
    expect(b.texte).toBe("🔁 La date\nLina et Tom : la frise\nle loto");
    const c = surlignerPour(b.texte, b.debut, b.fin, "Lina", groupe)!;
    expect(c.texte).toBe("🔁 La date\nTom : la frise\nle loto");
    expect(surlignerPour(c.texte, c.debut, c.fin, null, groupe)!.texte).toBe(prevu);
    // À trois : « Lina, Tom et Zoé », et le texte se relit.
    const trois = surlignerPour(b.texte, b.debut, b.fin, "Zoé", groupe)!;
    expect(trois.texte).toBe("🔁 La date\nLina, Tom et Zoé : la frise\nle loto");
    expect(elevesDuPassage(trois.texte, trois.debut, trois.fin, groupe)).toEqual(groupe);
  });

  it("pose sur sa ligne un passage pris dans une ligne, sans jamais couper un prénom ; sans sélection, la ligne du curseur", () => {
    const liste = "la frise, le loto, la pâte à modeler";
    const loto = liste.indexOf("le loto");
    expect(surlignerPour(liste, loto, loto + 7, "Tom", groupe)!.texte).toBe("la frise\nTom : le loto\nla pâte à modeler");
    // Ce qui reste d'une ligne d'élève garde ses prénoms.
    const sienne = `Lina : ${liste}`;
    const dans = sienne.indexOf("le loto");
    expect(surlignerPour(sienne, dans, dans + 7, "Tom", groupe)!.texte).toBe("Lina : la frise\nLina et Tom : le loto\nLina : la pâte à modeler");
    // Un double clic sur le prénom prend la ligne entière.
    expect(surlignerPour("Lina : la frise", 0, 4, "Tom", groupe)!.texte).toBe("Lina et Tom : la frise");
    const date = "🔁 La date\nle loto";
    expect(surlignerPour(date, date.length - 2, date.length - 2, "Zoé", groupe)!.texte).toBe("🔁 La date\nZoé : le loto");
    // Rien à surligner sur une ligne vide.
    expect(surlignerPour("la frise\n\nle loto", 9, 9, "Tom", groupe)).toBeNull();
    expect(elevesDuPassage("la frise\n\nle loto", 9, 9, groupe)).toEqual([]);
    // Un prénom seul sur sa ligne, sélectionné avec ce qui le suit : chaque ligne devient l'étape, le prénom seul s'en va.
    const ancien = "Pour Tom :\nbande numérique\njeu de l'oie";
    expect(surlignerPour(ancien, 0, ancien.length, "Tom", groupe)!.texte).toBe("Tom : bande numérique\nTom : jeu de l'oie");
  });
});
