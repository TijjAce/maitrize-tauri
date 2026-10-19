import { describe, expect, it } from "vitest";
import { DOMAINES_DES_MATHS, FAMILLES, FAMILLES_DE_SUPPORTS, partiesDeLaFamille } from "./catalogueAteliers";

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

  it("ne découpe que les mathématiques", () => {
    for (const f of FAMILLES_DE_SUPPORTS.filter((x) => x.id !== "maths")) expect(partiesDeLaFamille(f), f.id).toBeNull();
    // Un atelier qu'aucun domaine ne range ne se perd pas.
    const inconnu = { ...FAMILLES.find((f) => f.id === "maths")!, outils: [{ id: "jeux" as const, nom: "Loto", icone: "🎲", quoi: "" }] };
    expect(partiesDeLaFamille(inconnu)!.map((p) => p.nom)).toEqual(["Autres"]);
  });
});
