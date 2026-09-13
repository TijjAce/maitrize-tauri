import { describe, it, expect } from "vitest";
import {
  sectionDe, indicesDeLEleve, dansLaPeriode, comptes, brouillonDeSection, sansAutresEleves, preRemplirSynthese, SECTIONS_SYNTHESE,
} from "./synthese";

const competence = (texte: string, chemin: string, statut: "acquise" | "encours" | "nonabordee", date = "") => ({
  id: texte, texte, source: "Cycle 1 — Programme 2025 (v2)", chemin, niveau: null, page: "", competenceRefId: null,
  documentId: null, statut, date, notes: "", citeeLe: "2026-09-01",
});

describe("sectionDe", () => {
  it("range domaines de maternelle et matières aux mêmes endroits", () => {
    expect(sectionDe("1. Mobiliser le langage dans toutes ses dimensions")).toBe("langage");
    expect(sectionDe("Français › Lecture et compréhension de l’écrit")).toBe("langage");
    expect(sectionDe("4. Acquérir les premiers outils mathématiques")).toBe("maths");
    expect(sectionDe("Mathématiques")).toBe("maths");
    expect(sectionDe("2. Agir, s'exprimer, comprendre à travers l'activité physique")).toBe("eps");
    expect(sectionDe("Éducation physique et sportive")).toBe("eps");
    expect(sectionDe("3. Agir, s'exprimer, comprendre à travers des activités artistiques")).toBe("arts");
    expect(sectionDe("5. Se repérer dans le temps et l'espace")).toBe("monde");
    expect(sectionDe("Sciences et technologie")).toBe("monde");
    expect(sectionDe("Socialisation")).toBe("vivre");
    expect(sectionDe("Communication (CAA)")).toBe("langage");
    expect(sectionDe("")).toBeNull();
  });
});

describe("indicesDeLEleve", () => {
  it("rassemble compétences, progressions, évaluations et observations de l'élève seulement", () => {
    const indices = indicesDeLEleve("e1", {
      competences: [
        competence("Dénombrer une collection jusqu’à dix", "4. Acquérir les premiers outils mathématiques", "acquise", "2026-05-10"),
        competence("Reconnaître des formes planes", "4. Acquérir les premiers outils mathématiques", "nonabordee"),
      ],
      progressions: [{ domaine: "Langage écrit / lecture", titre: "Entrée dans l'écrit", etapes: [
        { intitule: "Reconnaît les lettres de son prénom", statut: "encours", date: "" },
        { intitule: "Écrit son prénom", statut: "nonabordee", date: "" },
      ] }],
      evaluations: [
        { id: "ev1", titre: "Comptines", matiere: "Éducation musicale", date: "2026-04-02T10:00:00Z", bareme: 20, periode: 4, mode: "competences",
          competencesJson: JSON.stringify([{ id: "c1", referentielNom: "R", domaineId: "d", domaineTitre: "3. Agir… activités artistiques", sousDomaineTitre: "Univers sonores", competenceTitre: "Chanter une comptine" }]),
          pdfNomFichier: null },
        { id: "ev2", titre: "Nombres jusqu'à 10", matiere: "Mathématiques", date: "2026-03-01", bareme: 10, periode: 3, mode: "note", competencesJson: "[]", pdfNomFichier: null },
      ],
      notes: [
        { id: "n1", eleveNom: "", eleveId: "e1", note: null, absent: false, commentaire: "", evaluationId: "ev1", niveauxJson: JSON.stringify({ c1: 4 }) },
        { id: "n2", eleveNom: "", eleveId: "e1", note: 4, absent: false, commentaire: "", evaluationId: "ev2", niveauxJson: "{}" },
        { id: "n3", eleveNom: "", eleveId: "e2", note: 10, absent: false, commentaire: "", evaluationId: "ev2", niveauxJson: "{}" },
      ],
      observations: [
        { id: "o1", date: "2026-05-02", texte: "Attend son tour pendant le jeu", type: "comportement", eleveId: "e1" },
        { id: "o2", date: "2026-05-03", texte: "Rendez-vous orthophoniste", type: "santé", eleveId: "e1" },
        { id: "o3", date: "2026-05-04", texte: "Raconte l'histoire de l'album", type: "scolaire", eleveId: "e2" },
        { id: "o4", date: "2026-05-05", texte: "Très souriant ce matin", type: "divers", eleveId: "e1" },
      ],
    });
    expect(indices.map((i) => [i.section, i.niveau, i.texte])).toEqual([
      ["maths", 3, "Dénombrer une collection jusqu’à dix"],
      ["langage", 2, "Reconnaît les lettres de son prénom"],
      ["arts", 3, "Chanter une comptine"],
      ["maths", 1, "Nombres jusqu'à 10"],
      ["vivre", null, "Attend son tour pendant le jeu"],
      ["autres", null, "Très souriant ce matin"],
    ]);
    expect(comptes(indices)).toEqual({ reussites: 2, enCours: 1, aConsolider: 1, observations: 2 });
  });
});

describe("brouillon et pré-remplissage", () => {
  const i = (section: "langage" | "maths" | "vivre", texte: string, niveau: 1 | 2 | 3 | null, date: string) =>
    ({ section, texte, niveau, date, source: "s" });

  it("rédige un brouillon sans doublon, le plus récent d'abord", () => {
    expect(brouillonDeSection([
      i("langage", "Reconnaît son prénom.", 3, "2026-05-01"),
      i("langage", "Reconnaît son prénom", 2, "2026-02-01"),
      i("langage", "Écrit son prénom en capitales", 2, "2026-04-01"),
      i("langage", "Participe aux échanges du regroupement", null, "2026-05-02"),
    ])).toBe([
      "Réussites : reconnaît son prénom.",
      "En cours d'acquisition : écrit son prénom en capitales.",
      "Observations : « Participe aux échanges du regroupement » (02/05/2026)",
    ].join("\n"));
  });

  it("ne garde que la période, et les données sans date", () => {
    const l = [i("maths", "a", 3, "2026-01-10"), i("maths", "b", 3, "2026-06-01"), i("maths", "c", 2, "")];
    expect(dansLaPeriode(l, "2026-03-01", "2026-07-01").map((x) => x.texte)).toEqual(["b", "c"]);
  });

  it("remplit les sections vides, reprend une section écrite seulement sur demande", () => {
    const indices = [i("maths", "Dénombrer jusqu'à dix", 3, "2026-05-10"), i("langage", "Nommer les lettres", 2, "2026-05-11")];
    const base = { debut: "2026-01-01", fin: "2026-07-01", bilan: "", sections: { maths: "Écrit par l'enseignante." } };
    const r = preRemplirSynthese(base, indices, []);
    expect(r.synthese.sections.maths).toBe("Écrit par l'enseignante.");
    expect(r.synthese.sections.langage).toBe("En cours d'acquisition : nommer les lettres.");
    expect(r.remplies).toBe(1);
    const reprise = preRemplirSynthese(r.synthese, indices, [], "maths");
    expect(reprise.synthese.sections.maths).toBe("Réussites : dénombrer jusqu'à dix.");
    expect(reprise.synthese.sections.langage).toBe("En cours d'acquisition : nommer les lettres.");
  });

  it("ne nomme pas les camarades", () => {
    expect(sansAutresEleves("Attend son tour avec Aurélien Roux, puis avec Rose.", ["Aurélien Roux", "Rose Martin"]))
      .toBe("Attend son tour avec un camarade, puis avec un camarade.");
    const r = preRemplirSynthese({ debut: "", fin: "", bilan: "", sections: {} }, [i("vivre", "Joue avec Rose", null, "")], ["Rose Martin"]);
    expect(r.synthese.sections.vivre).toBe("Observations : « Joue avec un camarade »");
  });

  it("a une section pour chaque rangement possible", () => {
    expect(SECTIONS_SYNTHESE.map((s) => s.id)).toEqual(["langage", "maths", "monde", "eps", "arts", "vivre", "autres"]);
  });
});
