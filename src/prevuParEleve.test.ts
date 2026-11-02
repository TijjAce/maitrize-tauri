import { describe, expect, it } from "vitest";
import { elevesDuPassage, estPartage, prevuDeLEleve, segmentsDuPrevu, surlignerPour } from "./prevuParEleve";

// Prénoms inventés : jamais ceux de la classe.
const groupe = ["Lina", "Tom", "Zoé"];
const entre = (texte: string, de: string, a = de) => [texte.indexOf(de), texte.indexOf(a) + a.length] as const;

describe("le prévu d'un créneau de groupe, élève par élève (demandes de l'enseignant, 2026-11-02)", () => {
  it("ouvre la partie d'un élève à son prénom, jusqu'au prénom suivant ; chacun la suit dans l'ordre où elle est écrite", () => {
    const prevu = [
      "matériel base 10", "Lina : la frise", "le loto", "", "évaluation : le cahier",
      "Tom : le loto", "la frise", "Tout le groupe : on range", "Pour la séance : la comptine",
    ].join("\n");
    // « Deux élèves peuvent faire la même chose, mais pas au même moment. »
    expect(prevuDeLEleve(prevu, "Lina", groupe)).toBe("matériel base 10\nla frise\nle loto\n\névaluation : le cahier\non range\nPour la séance : la comptine");
    expect(prevuDeLEleve(prevu, "tom", groupe)).toBe("matériel base 10\nle loto\nla frise\non range\nPour la séance : la comptine");
    // Un élève sans partie a ce qui est à tous ; un prévu sans parties reste entier.
    expect(prevuDeLEleve(prevu, "Zoé", groupe)).toBe("matériel base 10\non range\nPour la séance : la comptine");
    expect(prevuDeLEleve("Lecture à deux", "Lina", groupe)).toBe("Lecture à deux");
    expect(estPartage(prevu, groupe)).toBe(true);
    expect(estPartage(prevu, [])).toBe(false);
  });

  it("lit une tête à plusieurs, sans tenir compte des accents ni des majuscules ; une phrase qui cite un prénom n'en est pas une", () => {
    const prevu = "pour LINA et Zoe : la frise\nPour Tom, Lina : le loto\nTom\nLina et Tom rangent ensemble";
    expect(prevuDeLEleve(prevu, "Lina", groupe)).toBe("la frise\nle loto");
    expect(prevuDeLEleve(prevu, "Zoé", groupe)).toBe("la frise");
    expect(prevuDeLEleve(prevu, "Tom", groupe)).toBe("le loto\nLina et Tom rangent ensemble");
    expect(estPartage("Lecture à deux\nLina et Tom lisent", groupe)).toBe(false);
  });

  it("surligne au cahier journal la partie d'un élève de sa couleur, son prénom plus fort ; celle de plusieurs en gris", () => {
    const texte = "matériel\nPour Lina : la frise\nle loto\nTom et Lina : le jeu\nTout le groupe : on range";
    const segments = segmentsDuPrevu(texte, groupe);
    expect(segments.map((s) => s.texte).join("")).toBe(texte);
    expect(segments.filter((s) => s.genre).map((s) => [s.texte, s.genre, s.couleur])).toEqual([
      ["Pour ", "eleve", 0], ["Lina", "eleve-nom", 0], [" : la frise", "eleve", 0], ["le loto", "eleve", 0],
      ["Tom", "eleve-nom", 1], [" et ", "eleves", undefined], ["Lina", "eleve-nom", 0], [" : le jeu", "eleves", undefined],
      ["Tout le groupe", "eleves", undefined],
    ]);
    expect(segmentsDuPrevu(texte, [])).toEqual([{ texte, genre: "" }]);
  });

  it("donne plusieurs lignes à un élève d'un seul clic, son prénom une fois (« une sélection multiligne pour la même chose »)", () => {
    const prevu = "🔁 La date\nbande numérique à plastifier. Objectif :\nPoursuivre le lien\n\nréactivation : les nombres en cubes\névaluation : les cartes";
    const [a, b] = entre(prevu, "bande", "les cartes");
    const r = surlignerPour(prevu, a, b, "Tom", groupe)!;
    expect(r.texte).toBe("🔁 La date\nTom : bande numérique à plastifier. Objectif :\nPoursuivre le lien\n\nréactivation : les nombres en cubes\névaluation : les cartes");
    expect(r.texte.slice(r.debut, r.fin)).toBe(r.texte.slice(r.texte.indexOf("Tom")));
    expect(prevuDeLEleve(r.texte, "Lina", groupe)).toBe("🔁 La date");
    // Le prénom écrit sur chaque ligne par la version d'avant : un clic le remet une fois.
    const multiplie = "Tom : a\nTom : b\n\nTom : c\nTom : d";
    expect(elevesDuPassage(multiplie, 0, multiplie.length, groupe)).toEqual(["Tom"]);
    expect(surlignerPour(multiplie, 0, multiplie.length, "Tom", groupe)!.texte).toBe("Tom : a\nb\n\nc\nd");
  });

  it("donne le passage à un élève, à un second par ⇧-clic, à un autre, puis le rend à tous ; ce qui suit garde sa partie", () => {
    const prevu = "🔁 La date\nla frise\nle loto\non range";
    const [a, b] = entre(prevu, "la frise", "le loto");
    const lina = surlignerPour(prevu, a, b, "Lina", groupe)!;
    expect(lina.texte).toBe("🔁 La date\nLina : la frise\nle loto\nTout le groupe : on range");
    expect(lina.texte.slice(lina.debut, lina.fin)).toBe("Lina : la frise\nle loto");
    const deux = surlignerPour(lina.texte, lina.debut, lina.fin, "Tom", groupe, true)!;
    expect(deux.texte).toBe("🔁 La date\nLina et Tom : la frise\nle loto\nTout le groupe : on range");
    expect(elevesDuPassage(deux.texte, deux.debut, deux.fin, groupe)).toEqual(["Lina", "Tom"]);
    const tom = surlignerPour(deux.texte, deux.debut, deux.fin, "Tom", groupe)!;
    expect(tom.texte).toBe("🔁 La date\nTom : la frise\nle loto\nTout le groupe : on range");
    expect(surlignerPour(tom.texte, tom.debut, tom.fin, null, groupe)!.texte).toBe(prevu);
    // Au milieu de la partie d'un élève : la suite redit son prénom.
    const partie = "Lina : la frise\nle loto\nle puzzle";
    expect(surlignerPour(partie, ...entre(partie, "le loto"), "Tom", groupe)!.texte).toBe("Lina : la frise\nTom : le loto\nLina : le puzzle");
    expect(surlignerPour(partie, ...entre(partie, "le loto"), null, groupe)!.texte).toBe("Lina : la frise\nTout le groupe : le loto\nLina : le puzzle");
  });

  it("pose sur sa ligne un passage pris dans une ligne ; les prénoms seuls prennent leur partie ; sans sélection, la ligne du curseur", () => {
    const liste = "Lina : la frise, le loto, la pâte à modeler";
    expect(surlignerPour(liste, ...entre(liste, "le loto"), "Tom", groupe)!.texte).toBe("Lina : la frise\nTom : le loto\nLina : la pâte à modeler");
    // Les prénoms sélectionnés, ou une tête seule sur sa ligne : toute sa partie change d'élève.
    const parties = "Lina : la frise\nle loto\nTom : le jeu";
    expect(surlignerPour(parties, 0, 4, "Tom", groupe)!.texte).toBe("Tom : la frise\nle loto\nle jeu");
    const ancien = "Pour Tom :\nbande numérique\njeu de l'oie";
    expect(surlignerPour(ancien, ...entre(ancien, "Pour Tom :"), "Lina", groupe)!.texte).toBe("Lina : bande numérique\njeu de l'oie");
    const date = "🔁 La date\nle loto";
    expect(surlignerPour(date, date.length - 2, date.length - 2, "Zoé", groupe)!.texte).toBe("🔁 La date\nZoé : le loto");
    // Rien à surligner sur une ligne vide.
    expect(surlignerPour("la frise\n\nle loto", 9, 9, "Tom", groupe)).toBeNull();
    expect(elevesDuPassage("la frise\n\nle loto", 9, 9, groupe)).toEqual([]);
  });
});
