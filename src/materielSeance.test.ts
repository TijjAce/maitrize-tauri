import { describe, it, expect } from "vitest";
import type { MaterielItem } from "./api";
import { chercherPdfs, copiePourLaSeance, estSurLeBureau, lirePdfs, pdfsDuBureau } from "./materielSeance";

const materiel = (p: Partial<MaterielItem> = {}): MaterielItem => ({
  id: "m1", titre: "Fiche lecture", descriptionMateriel: "", competenceId: "", competenceTitre: "", domaineTitre: "",
  sousDomaineTitre: "", cycle: "", imagesJson: "[]", pdfsJson: '["a.pdf"]', dateCreation: "2026-09-01T00:00:00Z",
  seanceId: null, sequenceId: null, dossier: "", videosJson: "[]", coffreJson: "[]", ...p,
});

describe("les PDF du bureau", () => {
  it("se lisent sans faire confiance au JSON", () => {
    expect(lirePdfs('["a.pdf","b.pdf"]')).toEqual(["a.pdf", "b.pdf"]);
    expect(lirePdfs("")).toEqual([]);
    expect(lirePdfs(null)).toEqual([]);
    expect(lirePdfs("{pas une liste")).toEqual([]);
    expect(lirePdfs('["a.pdf", 3, "", null]')).toEqual(["a.pdf"]);
  });

  it("sont les matériels du bureau qui portent un PDF, dans l'ordre du plan de travail", () => {
    const liste = [
      materiel({ id: "s", seanceId: "se1", titre: "Dans une séance" }),
      materiel({ id: "q", sequenceId: "sq1", titre: "Dans une séquence" }),
      materiel({ id: "v", pdfsJson: "[]", titre: "Sans PDF" }),
      materiel({ id: "i", pdfsJson: "[]", imagesJson: '["x.png"]', titre: "Une image" }),
      materiel({ id: "b", dossier: "Maths", titre: "Numération" }),
      materiel({ id: "a", dossier: "Français/Lecture", titre: "Syllabes" }),
      materiel({ id: "c", dossier: "", titre: "Étiquettes" }),
      materiel({ id: "d", dossier: "", titre: "Affiche 10" }),
      materiel({ id: "e", dossier: "", titre: "Affiche 9" }),
    ];
    expect(pdfsDuBureau(liste).map((m) => m.id)).toEqual(["e", "d", "c", "a", "b"]);
    expect(estSurLeBureau(materiel({ seanceId: "x" }))).toBe(false);
  });

  it("se cherchent sur le titre ou le dossier, accents et casse oubliés", () => {
    const liste = [materiel({ id: "a", dossier: "Français/Lecture", titre: "Syllabes" }), materiel({ id: "b", titre: "Étiquettes" })];
    expect(chercherPdfs(liste, "").map((m) => m.id)).toEqual(["a", "b"]);
    expect(chercherPdfs(liste, "etiq").map((m) => m.id)).toEqual(["b"]);
    expect(chercherPdfs(liste, "FRANCAIS").map((m) => m.id)).toEqual(["a"]);
    expect(chercherPdfs(liste, "rien")).toEqual([]);
  });

  it("se copient dans la séance sans rien emporter du bureau", () => {
    const source = materiel({
      id: "m1", titre: "Numération", descriptionMateriel: "Les cubes", competenceId: "c1", competenceTitre: "Dénombrer",
      dossier: "Maths", pdfsJson: '["a.pdf"]', imagesJson: '["x.png"]', videosJson: '[{"url":"u"}]', coffreJson: '["k"]',
    });
    const copie = copiePourLaSeance(source, "se1", ["b.pdf"], "m2", "2026-09-27T10:00:00Z");
    expect(copie).toMatchObject({
      id: "m2", seanceId: "se1", sequenceId: null, dossier: "", dateCreation: "2026-09-27T10:00:00Z",
      titre: "Numération", descriptionMateriel: "Les cubes", competenceId: "c1", competenceTitre: "Dénombrer",
      pdfsJson: '["b.pdf"]', imagesJson: "[]", videosJson: "[]", coffreJson: "[]",
    });
    // La source n'a pas bougé : le bureau garde sa tuile.
    expect(source.seanceId).toBeNull();
    expect(source.pdfsJson).toBe('["a.pdf"]');
  });
});
