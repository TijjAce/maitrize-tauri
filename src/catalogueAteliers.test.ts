import { describe, expect, it } from "vitest";
import { DOMAINES_DES_MATHS, FAMILLES, FAMILLES_DE_SUPPORTS, PARTIES_DU_FRANCAIS, famillesDeSorte, partiesDeLaFamille } from "./catalogueAteliers";

describe("le catalogue de Fabriquer", () => {
  it("range les mathématiques par domaine, comme les programmes : chaque atelier dans un seul, aucun de côté", () => {
    const maths = FAMILLES_DE_SUPPORTS.find((f) => f.id === "maths")!;
    const parties = partiesDeLaFamille(maths)!;
    expect(parties.map((p) => p.nom)).toEqual(["Les nombres", "Le calcul", "Les problèmes", "Grandeurs et mesures", "Espace et géométrie", "Données"]);
    // Rien dans « Autres » : un nouvel atelier de mathématiques doit recevoir son domaine.
    const ranges = parties.flatMap((p) => p.outils.map((o) => o.id));
    expect([...ranges].sort()).toEqual(maths.outils.map((o) => o.id).sort());
    expect(new Set(ranges).size).toBe(ranges.length);
    // Les domaines ne nomment que des ateliers du catalogue des supports.
    for (const d of DOMAINES_DES_MATHS) for (const id of d.outils) expect(maths.outils.some((o) => o.id === id), id).toBe(true);
    // Les billes, l'abaque, la suite des nombres, la demi-droite et les ordinaux vont avec les nombres, après les cubes.
    expect(parties[0].outils.map((o) => o.id)).toEqual(["collections", "nombres", "billes", "cubes", "abaque", "suiteNombres", "demiDroite", "ordinaux", "comparer", "oie", "fractions", "numeration"]);
  });

  it("rassemble le langage, les sons et la lecture, la lecture et l'écriture sous « Français » : chaque atelier dans une partie", () => {
    const francais = FAMILLES_DE_SUPPORTS.find((f) => f.id === "francais")!;
    expect(francais.libelle).toBe("📖 Français");
    const parties = partiesDeLaFamille(francais)!;
    expect(parties.map((p) => p.nom)).toEqual(["Langage", "Sons et lecture", "Lecture et écriture"]);
    const ranges = parties.flatMap((p) => p.outils.map((o) => o.id));
    expect([...ranges].sort()).toEqual(francais.outils.map((o) => o.id).sort());
    expect(new Set(ranges).size).toBe(ranges.length);
    for (const d of PARTIES_DU_FRANCAIS) for (const id of d.outils) expect(francais.outils.some((o) => o.id === id), id).toBe(true);
    // Les trois familles d'avant n'existent plus à part.
    for (const id of ["langage", "sons", "ecrit"]) expect(FAMILLES.some((f) => f.id === id), id).toBe(false);
  });

  it("ne découpe que le français et les mathématiques", () => {
    for (const f of FAMILLES_DE_SUPPORTS.filter((x) => x.id !== "maths" && x.id !== "francais")) expect(partiesDeLaFamille(f), f.id).toBeNull();
    // Un atelier qu'aucun domaine ne range ne se perd pas.
    const inconnu = { ...FAMILLES.find((f) => f.id === "maths")!, outils: [{ id: "jeux" as const, nom: "Loto", icone: "🎲", quoi: "" }] };
    expect(partiesDeLaFamille(inconnu)!.map((p) => p.nom)).toEqual(["Autres"]);
  });
});

describe("Fabriquer s'ouvre sur un choix : un support de séance, un outil pour l'élève ou un affichage (demande de l'enseignant, 2026-11-03)", () => {
  const ids = (s: "support" | "affichage" | "outil") => famillesDeSorte(s).flatMap((f) => f.outils.map((o) => o.id));
  it("range les cartes des nombres et les tables d'addition avec les affichages, ce qui fait aussi des feuilles dans plusieurs", () => {
    expect(ids("affichage")).toEqual(expect.arrayContaining(["nombres", "carteMentale", "famillesAddition", "fractions", "frise", "codePhrase"]));
    // D'après les programmes et les guides (demande de l'enseignant, 4 novembre 2026) : la conjugaison, la frise alphabétique, les tables de multiplication.
    expect(ids("affichage")).toEqual(expect.arrayContaining(["afficheConjugaison", "friseAlphabetique", "tablesMultiplication"]));
    expect(ids("outil")).toContain("friseAlphabetique");
    // « Les tables d'addition, c'est plus un affichage de classe. »
    expect(ids("outil")).not.toContain("famillesAddition");
    expect(ids("outil")).toEqual(expect.arrayContaining(["codePhrase", "codeLecture", "sequentiel", "lecteur", "gestes"]));
    expect(ids("support")).not.toContain("nombres");
    expect(ids("support")).not.toContain("famillesAddition");
    for (const plusieurs of ["fractions", "suiteNombres", "imagier", "frise", "visibileo", "sequentiel", "gestes"]) expect(ids("support"), plusieurs).toContain(plusieurs);
    // Les générateurs de l'enseignant et les feuilles sont des supports ; une famille vide s'efface d'un catalogue.
    expect(ids("support")).toEqual(expect.arrayContaining(["perso", "motsMeles", "heure"]));
    expect(famillesDeSorte("support").map((f) => f.id)).not.toContain("affichages");
    expect(famillesDeSorte("affichage").map((f) => f.id)).not.toContain("perso");
  });

  it("met les tables d'addition sous Mathématiques, avec le calcul — « il me manque un générateur des tables d'addition »", () => {
    const maths = famillesDeSorte("affichage").find((f) => f.id === "maths")!;
    expect(maths.outils.map((o) => o.id)).toContain("famillesAddition");
    expect(partiesDeLaFamille(maths)?.find((p) => p.id === "calcul")?.outils.map((o) => o.id)).toContain("famillesAddition");
    expect(FAMILLES.find((f) => f.id === "affichages")?.outils.map((o) => o.id)).not.toContain("famillesAddition");
  });

  it("garde chaque atelier dans au moins un des trois catalogues", () => {
    const tous = new Set([...ids("support"), ...ids("affichage"), ...ids("outil")]);
    for (const f of FAMILLES_DE_SUPPORTS) for (const o of f.outils) expect(tous.has(o.id), o.id).toBe(true);
  });
});
