import { describe, expect, it } from "vitest";
import type { Segment } from "./surlignage";
import { elevesDuPassage, encadrerPour, estPartage, prevuDeLEleve, prevuSansTetes, segmentsDuPrevu } from "./prevuParEleve";

// Prénoms inventés : jamais ceux de la classe.
const groupe = ["Lina", "Tom", "Zoé"];
const entre = (texte: string, de: string, a = de) => [texte.indexOf(de), texte.indexOf(a) + a.length] as const;
/** Le texte de chaque cadre, dans l'ordre, et sa couleur. */
const cadresDe = (segments: Segment[]) => {
  const cadres = new Map<number, { texte: string; couleur?: number }>();
  for (const s of segments) if (s.cadre) cadres.set(s.cadre.id, { texte: (cadres.get(s.cadre.id)?.texte ?? "") + s.texte, couleur: s.cadre.couleur });
  return [...cadres.values()];
};

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

  it("encadre au cahier journal la partie d'un élève de sa couleur, celle de plusieurs en gris ; les prénoms gardent la leur", () => {
    const texte = "matériel\nPour Lina : la frise\nle loto\nTom et Lina : le jeu\nTout le groupe : on range";
    const segments = segmentsDuPrevu(texte, groupe);
    expect(segments.map((s) => s.texte).join("")).toBe(texte);
    // Chaque cadre, de sa tête au retour à la ligne qui le clôt, et sa couleur.
    expect(cadresDe(segments)).toEqual([
      { texte: "Pour Lina : la frise\nle loto\n", couleur: 0 },
      { texte: "Tom et Lina : le jeu\n", couleur: undefined },
    ]);
    expect(segments.filter((s) => s.genre).map((s) => [s.texte, s.genre, s.couleur])).toEqual([
      ["Lina", "eleve-nom", 0], ["Tom", "eleve-nom", 1], ["Lina", "eleve-nom", 0], ["Tout le groupe", "eleves", undefined],
    ]);
    expect(segmentsDuPrevu(texte, [])).toEqual([{ texte, genre: "" }]);
  });

  it("garde deux cadres à deux temps du même élève, même seul dans son créneau ; les lignes vides du bout restent dehors", () => {
    // « Au lieu de surligner, il faudrait pouvoir encadrer. Même pour un élève unique. » (2026-11-03)
    const seul = ["Lina"];
    const prevu = "mémory des animaux\ntri des poissons\n\nLe matériel est dans les classeurs.";
    const memory = encadrerPour(prevu, ...entre(prevu, "mémory des animaux"), "Lina", seul)!;
    expect(memory.texte).toBe("Lina : mémory des animaux\nTout le groupe : tri des poissons\n\nLe matériel est dans les classeurs.");
    const tri = encadrerPour(memory.texte, ...entre(memory.texte, "tri des poissons"), "Lina", seul)!;
    expect(tri.texte).toBe("Lina : mémory des animaux\nLina : tri des poissons\n\nTout le groupe : Le matériel est dans les classeurs.");
    const segments = segmentsDuPrevu(tri.texte, seul);
    expect(segments.map((s) => s.texte).join("")).toBe(tri.texte);
    expect(cadresDe(segments)).toEqual([
      { texte: "Lina : mémory des animaux\n", couleur: 0 },
      { texte: "Lina : tri des poissons\n", couleur: 0 },
    ]);
    // L'élève a tout son prévu, sans les têtes ; deux lignes d'un coup font un seul cadre.
    expect(estPartage(tri.texte, seul)).toBe(true);
    expect(prevuDeLEleve(tri.texte, "Lina", seul)).toBe(prevu);
    expect(encadrerPour(prevu, ...entre(prevu, "mémory", "poissons"), "Lina", seul)!.texte)
      .toBe("Lina : mémory des animaux\ntri des poissons\n\nTout le groupe : Le matériel est dans les classeurs.");
    // Dans un groupe aussi, un passage encadré après un autre du même élève a son cadre.
    const deux = "Lina : la frise\nle loto";
    expect(encadrerPour(deux, ...entre(deux, "le loto"), "Lina", groupe)!.texte).toBe("Lina : la frise\nLina : le loto");
  });

  it("donne plusieurs lignes à un élève d'un seul clic, son prénom une fois (« une sélection multiligne pour la même chose »)", () => {
    const prevu = "🔁 La date\nbande numérique à plastifier. Objectif :\nPoursuivre le lien\n\nréactivation : les nombres en cubes\névaluation : les cartes";
    const [a, b] = entre(prevu, "bande", "les cartes");
    const r = encadrerPour(prevu, a, b, "Tom", groupe)!;
    expect(r.texte).toBe("🔁 La date\nTom : bande numérique à plastifier. Objectif :\nPoursuivre le lien\n\nréactivation : les nombres en cubes\névaluation : les cartes");
    expect(r.texte.slice(r.debut, r.fin)).toBe(r.texte.slice(r.texte.indexOf("Tom")));
    expect(prevuDeLEleve(r.texte, "Lina", groupe)).toBe("🔁 La date");
    // Le prénom écrit sur chaque ligne par la version d'avant : un clic le remet une fois.
    const multiplie = "Tom : a\nTom : b\n\nTom : c\nTom : d";
    expect(elevesDuPassage(multiplie, 0, multiplie.length, groupe)).toEqual(["Tom"]);
    expect(encadrerPour(multiplie, 0, multiplie.length, "Tom", groupe)!.texte).toBe("Tom : a\nb\n\nc\nd");
  });

  it("donne le passage à un élève, à un second par ⇧-clic, à un autre, puis le rend à tous ; ce qui suit garde sa partie", () => {
    const prevu = "🔁 La date\nla frise\nle loto\non range";
    const [a, b] = entre(prevu, "la frise", "le loto");
    const lina = encadrerPour(prevu, a, b, "Lina", groupe)!;
    expect(lina.texte).toBe("🔁 La date\nLina : la frise\nle loto\nTout le groupe : on range");
    expect(lina.texte.slice(lina.debut, lina.fin)).toBe("Lina : la frise\nle loto");
    const deux = encadrerPour(lina.texte, lina.debut, lina.fin, "Tom", groupe, true)!;
    expect(deux.texte).toBe("🔁 La date\nLina et Tom : la frise\nle loto\nTout le groupe : on range");
    expect(elevesDuPassage(deux.texte, deux.debut, deux.fin, groupe)).toEqual(["Lina", "Tom"]);
    const tom = encadrerPour(deux.texte, deux.debut, deux.fin, "Tom", groupe)!;
    expect(tom.texte).toBe("🔁 La date\nTom : la frise\nle loto\nTout le groupe : on range");
    expect(encadrerPour(tom.texte, tom.debut, tom.fin, null, groupe)!.texte).toBe(prevu);
    // Au milieu de la partie d'un élève : la suite redit son prénom.
    const partie = "Lina : la frise\nle loto\nle puzzle";
    expect(encadrerPour(partie, ...entre(partie, "le loto"), "Tom", groupe)!.texte).toBe("Lina : la frise\nTom : le loto\nLina : le puzzle");
    expect(encadrerPour(partie, ...entre(partie, "le loto"), null, groupe)!.texte).toBe("Lina : la frise\nTout le groupe : le loto\nLina : le puzzle");
  });

  it("pose sur sa ligne un passage pris dans une ligne ; les prénoms seuls prennent leur partie ; sans sélection, la ligne du curseur", () => {
    const liste = "Lina : la frise, le loto, la pâte à modeler";
    expect(encadrerPour(liste, ...entre(liste, "le loto"), "Tom", groupe)!.texte).toBe("Lina : la frise\nTom : le loto\nLina : la pâte à modeler");
    // Les prénoms sélectionnés, ou une tête seule sur sa ligne : toute sa partie change d'élève — et garde son cadre.
    const parties = "Lina : la frise\nle loto\nTom : le jeu";
    expect(encadrerPour(parties, 0, 4, "Tom", groupe)!.texte).toBe("Tom : la frise\nle loto\nTom : le jeu");
    const ancien = "Pour Tom :\nbande numérique\njeu de l'oie";
    expect(encadrerPour(ancien, ...entre(ancien, "Pour Tom :"), "Lina", groupe)!.texte).toBe("Lina : bande numérique\njeu de l'oie");
    const date = "🔁 La date\nle loto";
    expect(encadrerPour(date, date.length - 2, date.length - 2, "Zoé", groupe)!.texte).toBe("🔁 La date\nZoé : le loto");
    // Une ligne qui commence par un signe — 📚, 🔁, 📄 — ne se lit qu'en tête de ligne : le prénom se pose au-dessus.
    const seance = "🔁 La date\n📚 Les nombres · séance 1\njeu de l'oie\non range";
    const r = encadrerPour(seance, ...entre(seance, "📚", "jeu de l'oie"), "Lina", groupe)!;
    expect(r.texte).toBe("🔁 La date\nLina :\n📚 Les nombres · séance 1\njeu de l'oie\nTout le groupe : on range");
    expect(prevuDeLEleve(r.texte, "Lina", groupe)).toBe("🔁 La date\n📚 Les nombres · séance 1\njeu de l'oie\non range");
    expect(encadrerPour("Lina : la frise\n🔁 La comptine", 0, 4, "Tom", groupe)!.texte).toBe("Tom : la frise\n🔁 La comptine");
    expect(encadrerPour("Lina : la frise\n🔁 La comptine", 7, 15, "Tom", groupe)!.texte).toBe("Tom : la frise\nLina :\n🔁 La comptine");
    // Pour la classe, le prévu se lit sans ses têtes.
    expect(prevuSansTetes("Lina : 📚 Les nombres\nTom :\n🔁 La date\non range", groupe)).toBe("📚 Les nombres\n🔁 La date\non range");
    // Rien à encadrer sur une ligne vide.
    expect(encadrerPour("la frise\n\nle loto", 9, 9, "Tom", groupe)).toBeNull();
    expect(elevesDuPassage("la frise\n\nle loto", 9, 9, groupe)).toEqual([]);
  });
});
