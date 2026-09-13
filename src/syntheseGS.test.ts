import { describe, it, expect } from "vitest";
import { domaineGS, indicesDeLEleve, preRemplir, commentaireDuDomaine, sansAutresEleves, MOTS_ITEMS, type SynDom } from "./syntheseGS";
import syntheseDomaines from "./data/syntheseGS.json";

const DOMAINES = syntheseDomaines as SynDom[];

const competence = (texte: string, chemin: string, statut: "acquise" | "encours" | "nonabordee", date = "") => ({
  id: texte, texte, source: "Cycle 1 — Programme 2025 (v2)", chemin, niveau: null, page: "", competenceRefId: null,
  documentId: null, statut, date, notes: "", citeeLe: "2026-09-01",
});

describe("domaineGS", () => {
  it("reconnaît les domaines de maternelle et les matières", () => {
    expect(domaineGS("1. Mobiliser le langage dans toutes ses dimensions › Oral")).toBe("d1");
    expect(domaineGS("2. Agir, s'exprimer, comprendre à travers l'activité physique")).toBe("d2");
    expect(domaineGS("3. Agir, s'exprimer, comprendre à travers des activités artistiques")).toBe("d3");
    expect(domaineGS("4. Acquérir les premiers outils mathématiques › Découvrir les nombres")).toBe("d4");
    expect(domaineGS("5. Se repérer dans le temps et l'espace")).toBe("d5");
    expect(domaineGS("6. Découvrir le monde du vivant, de la matière et des objets")).toBe("d5");
    expect(domaineGS("Français › Lecture et compréhension de l’écrit")).toBe("d1");
    expect(domaineGS("Mathématiques")).toBe("d4");
    expect(domaineGS("Éducation physique et sportive")).toBe("d2");
    expect(domaineGS("Socialisation")).toBe("aeve");
    expect(domaineGS("Communication (CAA)")).toBe("d1");
    expect(domaineGS("Motricité")).toBe("d2");
    expect(domaineGS("")).toBeNull();
  });

  it("a une règle pour chaque item de la synthèse officielle", () => {
    const items = DOMAINES.flatMap((d) => d.items.map((i) => i.id));
    expect(items.filter((id) => !MOTS_ITEMS[id])).toEqual([]);
  });
});

describe("indicesDeLEleve", () => {
  it("rassemble compétences, progressions, évaluations et observations de l'élève seulement", () => {
    const indices = indicesDeLEleve("e1", {
      competences: [
        competence("Dénombrer une collection jusqu’à dix", "4. Acquérir les premiers outils mathématiques › Découvrir les nombres", "acquise", "2026-05-10"),
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
      ],
    });
    expect(indices.map((i) => [i.domaine, i.niveau, i.texte])).toEqual([
      ["d4", 3, "Dénombrer une collection jusqu’à dix"],
      ["d1", 2, "Reconnaît les lettres de son prénom"],
      ["d3", 3, "Chanter une comptine"],
      ["d4", 1, "Nombres jusqu'à 10"],
      ["aeve", null, "Attend son tour pendant le jeu"],
    ]);
  });
});

describe("preRemplir", () => {
  const vide = { positionnements: {}, observations: {} };

  it("positionne les items dont parle une donnée, la plus récente l'emportant, avec sa source", () => {
    const indices = [
      { domaine: "d4" as const, texte: "Dénombrer une collection jusqu’à dix", niveau: 2 as const, date: "2026-01-10", source: "Progression « Nombres »" },
      { domaine: "d4" as const, texte: "Dénombrer une collection jusqu’à dix", niveau: 3 as const, date: "2026-05-10", source: "Compétence travaillée" },
    ];
    const r = preRemplir(DOMAINES, vide, indices);
    expect(r.data.positionnements["d4.qte"]).toBe(3);
    expect(r.data.origines!["d4.qte"]).toBe("Compétence travaillée — Dénombrer une collection jusqu’à dix (10/05/2026)");
    expect(r.positionnes).toBe(1);
    expect(r.data.positionnements["d4.formes"]).toBeUndefined();
  });

  it("ne touche ni aux positionnements ni aux commentaires déjà donnés", () => {
    const data = { positionnements: { "d4.qte": 1 }, observations: { d4: "Écrit par l'enseignante." } };
    const indices = [{ domaine: "d4" as const, texte: "Dénombrer une collection", niveau: 3 as const, date: "2026-05-10", source: "Compétence travaillée" }];
    const r = preRemplir(DOMAINES, data, indices);
    expect(r.data.positionnements["d4.qte"]).toBe(1);
    expect(r.data.observations.d4).toBe("Écrit par l'enseignante.");
    expect(r.positionnes + r.commentaires).toBe(0);
  });

  it("rédige un brouillon de commentaire par domaine, sans doublon", () => {
    const texte = commentaireDuDomaine([
      { domaine: "d1", texte: "Reconnaît son prénom.", niveau: 3, date: "2026-05-01", source: "a" },
      { domaine: "d1", texte: "Reconnaît son prénom", niveau: 2, date: "2026-02-01", source: "b" },
      { domaine: "d1", texte: "Écrit son prénom en capitales", niveau: 2, date: "2026-04-01", source: "c" },
      { domaine: "d1", texte: "Participe aux échanges du regroupement", niveau: null, date: "2026-05-02", source: "Observation" },
    ]);
    expect(texte).toBe([
      "Réussites : reconnaît son prénom.",
      "En cours d'acquisition : écrit son prénom en capitales.",
      "Observations : « Participe aux échanges du regroupement » (02/05/2026)",
    ].join("\n"));
  });

  it("ne nomme pas les camarades dans les commentaires", () => {
    expect(sansAutresEleves("Attend son tour avec Aurélien Roux, puis avec Rose.", ["Aurélien Roux", "Rose Martin"]))
      .toBe("Attend son tour avec un camarade, puis avec un camarade.");
    const r = preRemplir(DOMAINES, vide, [{ domaine: "aeve", texte: "Joue avec Rose", niveau: null, date: "", source: "Observation" }], ["Rose Martin"]);
    expect(r.data.observations.aeve).toBe("Observations : « Joue avec un camarade »");
  });

  it("ne rédige rien pour un domaine sans donnée", () => {
    expect(preRemplir(DOMAINES, vide, []).commentaires).toBe(0);
  });
});
