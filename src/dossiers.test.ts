import { describe, it, expect } from "vitest";
import {
  estDans, filDAriane, normaliser, parent, renommerChemin, sousDossiers,
  destinationDossier, reporterCouleurs, lireCouleurs, SANS_COULEUR, couleurDe, materielsDeCreationDeDossier,
} from "./dossiers";

const el = (dossier: string, id = dossier + Math.random()) => ({ id, dossier });

describe("chemins", () => {
  it("nettoie ce qui est saisi", () => {
    expect(normaliser("  Français / Lecture  ")).toBe("Français/Lecture");
    expect(normaliser("//Français//")).toBe("Français");
    expect(normaliser("   ")).toBe("");
  });

  it("connaît son parent", () => {
    expect(parent("Français/Lecture/Sons")).toBe("Français/Lecture");
    expect(parent("Français")).toBe("");
  });

  it("sait ce qu'un dossier contient", () => {
    expect(estDans("Français/Lecture", "Français")).toBe(true);
    expect(estDans("Français", "Français")).toBe(true);
    expect(estDans("Mathématiques", "Français")).toBe(false);
    // Piège : un nom qui commence pareil n'est pas dedans.
    expect(estDans("Francophonie", "Français")).toBe(false);
    expect(estDans("n'importe quoi", "")).toBe(true);
  });
});



describe("renommage", () => {
  it("emmène les sous-dossiers", () => {
    // Sans cela, les sous-dossiers se retrouveraient orphelins à la racine.
    expect(renommerChemin("Français/Lecture", "Français", "Langage")).toBe("Langage/Lecture");
    expect(renommerChemin("Français", "Français", "Langage")).toBe("Langage");
  });

  it("laisse les autres tranquilles", () => {
    expect(renommerChemin("Maths/Calcul", "Français", "Langage")).toBe("Maths/Calcul");
    expect(renommerChemin("Francophonie", "Français", "Langage")).toBe("Francophonie");
  });
});



describe("navigation façon bureau", () => {
  const elements = [
    el("Français"), el("Français/Lecture"), el("Français/Lecture/Sons"),
    el("Maths"), el(""),
  ];

  it("ne montre que les dossiers d'ici", () => {
    // Un bureau montre ce qui est ici, on entre pour voir la suite.
    expect(sousDossiers(elements, "").map((d) => d.nom)).toEqual(["Français", "Maths"]);
    expect(sousDossiers(elements, "Français").map((d) => d.nom)).toEqual(["Lecture"]);
    expect(sousDossiers(elements, "Français/Lecture").map((d) => d.nom)).toEqual(["Sons"]);
    expect(sousDossiers(elements, "Français/Lecture/Sons")).toEqual([]);
  });

  it("compte tout ce qu'un dossier contient, à tous les niveaux", () => {
    // Sinon un dossier plein de sous-dossiers paraîtrait vide.
    expect(sousDossiers(elements, "").find((d) => d.nom === "Français")!.total).toBe(3);
  });

  it("ne confond pas deux noms qui se ressemblent", () => {
    const l = [el("Français"), el("Francophonie")];
    expect(sousDossiers(l, "Français")).toEqual([]);
  });

  it("dresse le fil d'Ariane", () => {
    expect(filDAriane("Français/Lecture").map((x) => x.nom)).toEqual(["Bureau", "Français", "Lecture"]);
    expect(filDAriane("").map((x) => x.nom)).toEqual(["Bureau"]);
    expect(filDAriane("Français/Lecture")[1].chemin).toBe("Français");
  });
});

describe("destinationDossier", () => {
  it("un dossier lâché dans un autre y entre avec son nom", () => {
    expect(destinationDossier("Rituels", "Français")).toBe("Français/Rituels");
    expect(destinationDossier("Français/Lecture/Sons", "")).toBe("Sons");
  });
  it("refuse de le lâcher là où il est", () => {
    expect(destinationDossier("Français/Lecture", "Français")).toBeNull();
    expect(destinationDossier("Rituels", "")).toBeNull();
  });
  it("refuse de le lâcher dans lui-même ou un descendant", () => {
    expect(destinationDossier("Français", "Français")).toBeNull();
    expect(destinationDossier("Français", "Français/Lecture")).toBeNull();
  });
  it("un nom qui commence pareil n'est pas un descendant", () => {
    expect(destinationDossier("Français", "Français bis")).toBe("Français bis/Français");
  });
});

describe("couleurs des dossiers", () => {
  const couleurs = { "Français": "blue", "Français/Lecture": "green", "Maths": "red" };
  it("suivent un dossier déplacé, sous-dossiers compris", () => {
    expect(reporterCouleurs(couleurs, "Français", "Classe/Français")).toEqual({
      "dossier:Français": "", "dossier:Classe/Français": "blue",
      "dossier:Français/Lecture": "", "dossier:Classe/Français/Lecture": "green",
    });
  });
  it("ne touchent pas aux autres dossiers", () => {
    expect(reporterCouleurs(couleurs, "Maths", "Mathématiques")).toEqual({
      "dossier:Maths": "", "dossier:Mathématiques": "red",
    });
  });
  it("se lisent dans les réglages, sans les couleurs retirées", () => {
    expect(lireCouleurs({ "dossier:A": "blue", "dossier:B": "", "theme": "sombre" })).toEqual({ A: "blue" });
  });
});

describe("dossiers créés à la main", () => {
  it("paraissent même vides, à leur place dans l'arbre", () => {
    const elements = [el("Maths")];
    const crees = ["Lecture", "Français/Poésie"];
    expect(sousDossiers(elements, "", crees).map((d) => [d.nom, d.total])).toEqual([["Français", 0], ["Lecture", 0], ["Maths", 1]]);
    expect(sousDossiers(elements, "Français", crees).map((d) => d.nom)).toEqual(["Poésie"]);
    expect(sousDossiers(elements, "Lecture", crees)).toEqual([]);
  });

  it("ne comptent pas deux fois un dossier qui a aussi du contenu", () => {
    expect(sousDossiers([el("Maths"), el("Maths")], "", ["Maths"])).toEqual([{ chemin: "Maths", nom: "Maths", total: 2 }]);
  });

  it("gardent leur place sans couleur, et suivent un déplacement", () => {
    expect(couleurDe(SANS_COULEUR)).toBeUndefined();
    expect(couleurDe("blue")).toBe("blue");
    expect(lireCouleurs({ "dossier:Lecture": SANS_COULEUR })).toEqual({ Lecture: SANS_COULEUR });
    expect(reporterCouleurs({ Lecture: SANS_COULEUR }, "Lecture", "Français/Lecture"))
      .toEqual({ "dossier:Lecture": "", "dossier:Français/Lecture": SANS_COULEUR });
  });
});

describe("matériels vides déposés à la création d'un dossier", () => {
  const mat = (p: Partial<Parameters<typeof materielsDeCreationDeDossier>[0][number]>) => ({
    id: Math.random().toString(), dossier: "Lecture", titre: "Nouveau matériel", descriptionMateriel: "", competenceId: "",
    imagesJson: "[]", pdfsJson: "[]", videosJson: "[]", coffreJson: "[]", seanceId: null, sequenceId: null, ...p,
  });

  it("repère le matériel vide, seul dans son dossier", () => {
    const m = mat({});
    expect(materielsDeCreationDeDossier([m], [m])).toEqual([m]);
  });

  it("laisse tout matériel rempli, renommé, à la racine ou accompagné", () => {
    const seul = (x: ReturnType<typeof mat>) => materielsDeCreationDeDossier([x], [x]);
    expect(seul(mat({ titre: "Loto des animaux" }))).toEqual([]);
    expect(seul(mat({ descriptionMateriel: "À plastifier" }))).toEqual([]);
    expect(seul(mat({ pdfsJson: '["fiche.pdf"]' }))).toEqual([]);
    expect(seul(mat({ dossier: "" }))).toEqual([]);
    const m = mat({});
    expect(materielsDeCreationDeDossier([m], [m, el("Lecture")])).toEqual([]);
  });
});

describe("dossiers des onglets rangés comme le bureau", () => {
  it("lisent et déplacent leurs couleurs sous leur propre préfixe, sans toucher au bureau", () => {
    const reglages = { "dossier:Français": "#ff0000", "rangement:jeux:dossier:Maths": "aucune", "rangement:jeux:dossier:Maths/Nombres": "#00ff00" };
    const couleurs = lireCouleurs(reglages, "rangement:jeux:dossier:");
    expect(couleurs).toEqual({ Maths: "aucune", "Maths/Nombres": "#00ff00" });
    expect(lireCouleurs(reglages)).toEqual({ Français: "#ff0000" });
    expect(reporterCouleurs(couleurs, "Maths", "Mathématiques", "rangement:jeux:dossier:")).toEqual({
      "rangement:jeux:dossier:Maths": "", "rangement:jeux:dossier:Mathématiques": "aucune",
      "rangement:jeux:dossier:Maths/Nombres": "", "rangement:jeux:dossier:Mathématiques/Nombres": "#00ff00",
    });
  });

  it("nomment la racine du fil d'Ariane", () => {
    expect(filDAriane("Maths/Nombres", "Jeux").map((x) => x.nom)).toEqual(["Jeux", "Maths", "Nombres"]);
  });
});
