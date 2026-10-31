import { describe, expect, it } from "vitest";
import {
  AIDES, ECHELLE_LSU, ECHELLE_MATERNELLE, ceQuIlsSauront, cleDeLaGrille, echelleDe, htmlGrilleObservables, niveauSuivant, observablesDeLaSequence,
} from "./grillesObservables";

const seance = (id: string, numero: number, objectifs: string) => ({ id, numero, titre: `Séance ${numero}`, objectifs });

describe("les grilles d'observables des séquences (demande de l'enseignant, 31 octobre 2026)", () => {
  it("font de l'objectif de chaque séance un observable, dans l'ordre des séances", () => {
    const obs = observablesDeLaSequence([
      seance("s2", 2, "À la fin de cette séance, les élèves sauront placer la forme dans la bonne case du tableau — 8 essais sur 10."),
      seance("s1", 1, "À la fin de cette séance, les élèves sauront ranger une forme dans le bac de sa forme."),
      seance("s3", 3, ""),
    ]);
    expect(obs.map((o) => [o.id, o.numero, o.texte])).toEqual([
      ["s1", 1, "Ranger une forme dans le bac de sa forme"],
      ["s2", 2, "Placer la forme dans la bonne case du tableau — 8 essais sur 10"],
    ]);
    // Un objectif écrit en liste : une ligne par élément.
    expect(ceQuIlsSauront("- Nommer les couleurs.\n- Trier par couleur ;")).toEqual(["Nommer les couleurs", "Trier par couleur"]);
    expect(observablesDeLaSequence([seance("s1", 1, "1. Compter jusqu'à 5\n2. Montrer 3 avec ses doigts")]).map((o) => o.id)).toEqual(["s1:1", "s1:2"]);
  });

  it("prennent l'échelle du carnet de suivi en maternelle, celle du LSU ensuite, et cyclent au clic", () => {
    expect(echelleDe({ cycle: "", niveau: "GS" })).toBe(ECHELLE_MATERNELLE);
    expect(echelleDe({ cycle: "Cycle 1", niveau: "" })).toBe(ECHELLE_MATERNELLE);
    expect(echelleDe({ cycle: "Cycle 2", niveau: "CP" })).toBe(ECHELLE_LSU);
    expect(ECHELLE_MATERNELLE.map((x) => x.libelle)).toEqual(["Ne réussit pas encore", "En voie de réussite", "Réussit souvent"]);
    expect([undefined, 1, 2, 3].map((n) => niveauSuivant(n, ECHELLE_MATERNELLE))).toEqual([1, 2, 3, undefined]);
    expect(niveauSuivant(4, ECHELLE_LSU)).toBeUndefined();
    expect(cleDeLaGrille("q1")).toBe("grille-sequence:q1");
  });

  it("s'impriment vierges pour noter à la main, ou remplies, l'aide marquée d'une lettre", () => {
    const observables = observablesDeLaSequence([seance("s1", 1, "À la fin de cette séance, les élèves sauront trier <b>")]);
    const eleves = [{ id: "e1", nom: "Prénom-Un" }, { id: "e2", nom: "Prénom-Deux" }];
    const valeurs = { e1: { s1: { n: 3, aide: "geste" } } };
    const remplie = htmlGrilleObservables({ titre: "La séquence", sous: "CP · P2", observables, eleves, valeurs, echelle: ECHELLE_LSU });
    expect(remplie).toContain("Trier &lt;b&gt;");
    expect(remplie).toContain(`background:${ECHELLE_LSU[2].couleur}`);
    expect(remplie).toContain(`<em>${AIDES.find((a) => a.id === "geste")!.lettre}</em>`);
    const vierge = htmlGrilleObservables({ titre: "La séquence", sous: "", observables, eleves, valeurs, echelle: ECHELLE_LSU, vierge: true });
    expect(vierge).not.toContain("<em>");
    expect(vierge.match(/class="go-case"><\/td>/g)).toHaveLength(2);
  });
});
