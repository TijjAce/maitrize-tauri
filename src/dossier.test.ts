import { describe, it, expect } from "vitest";
import {
  age, libelleAge, construire, documentRempli, notes, observations, pieces, piecesAttendues,
} from "./dossier";
import type { CommentaireEleve, DocumentEleve, Eleve, Evaluation, NoteEleve,
              PapierEleve, ProgressionEleve } from "./api";

// Ce que ces tests protègent : un dossier doit dire la vérité sur ce qui
// manque. Compter comme renseignée une pièce seulement ouverte, ou noyer les
// axes de travail dans les observations, ferait passer un dossier vide pour
// un dossier complet — exactement au moment où on le relit avant une équipe.

const eleve = (p: Partial<Eleve> = {}): Eleve => ({
  id: "e1", nom: "Quang", niveau: "CE2", present: true, ine: "",
  dateNaissance: "", photoFichier: null, ...p,
});
const obs = (type: string, texte: string, date = "2026-09-01", id = texte): CommentaireEleve =>
  ({ id, date, texte, type, eleveId: "e1" });
const doc = (typeDoc: string, donnees: string): DocumentEleve =>
  ({ id: typeDoc, eleveId: "e1", typeDoc, donnees, dateMaj: "2026-09-01" });

describe("état d'une pièce du dossier", () => {
  it("ne compte pas comme renseigné un document seulement ouvert", () => {
    // Ouvrir un écran crée la ligne en base : la compter dirait qu'un dossier
    // est complet alors qu'il est vide.
    expect(documentRempli("{}")).toBe(false);
    expect(documentRempli("[]")).toBe(false);
    expect(documentRempli('{"positionnements":{},"observations":{}}')).toBe(false);
    expect(documentRempli('{"a":"","b":null,"c":false}')).toBe(false);
    expect(documentRempli("")).toBe(false);
    expect(documentRempli(undefined)).toBe(false);
  });

  it("compte comme renseigné dès qu'une valeur est posée", () => {
    expect(documentRempli('{"positionnements":{"d1":2}}')).toBe(true);
    expect(documentRempli('{"observations":{"d1":"progresse"}}')).toBe(true);
    expect(documentRempli('[{"x":1}]')).toBe(true);
    expect(documentRempli('{"a":{"b":{"c":"oui"}}}')).toBe(true);
  });

  it("ignore les blancs, qui ne sont pas une saisie", () => {
    expect(documentRempli('{"remarques":"   "}')).toBe(false);
  });

  it("n'attend les pièces IME qu'en mode IME", () => {
    const ordinaire = piecesAttendues(false).map((p) => p.typeDoc);
    expect(ordinaire).not.toContain("gevasco");
    expect(ordinaire).not.toContain("ppi");
    expect(piecesAttendues(true).map((p) => p.typeDoc)).toContain("gevasco");
  });

  it("renvoie vers l'onglet où remplir chaque pièce", () => {
    for (const p of piecesAttendues(true)) expect(p.onglet).toBeTruthy();
  });

  it("croise les pièces attendues et les documents trouvés", () => {
    const p = pieces(piecesAttendues(false), [doc("progressions", '[{"fait":true}]')]);
    expect(p.find((x) => x.typeDoc === "progressions")!.rempli).toBe(true);
    expect(p.find((x) => x.typeDoc === "syntheseGS")!.rempli).toBe(false);
  });
});

describe("observations", () => {
  it("sort les axes de travail du lot", () => {
    // Un axe est une intention, pas un constat : il se relit avant la séance.
    const o = observations([
      obs("axe de travail", "Travailler le tour de rôle"),
      obs("comportement", "Crise en récréation"),
      obs("comportement", "Calme en atelier"),
    ]);
    expect(o.axes.map((a) => a.texte)).toEqual(["Travailler le tour de rôle"]);
    expect(o.parType.flatMap((g) => g.items)).toHaveLength(2);
    expect(o.total).toBe(3);
  });

  it("range les plus récentes en tête", () => {
    const o = observations([
      obs("divers", "ancienne", "2026-01-05", "a"),
      obs("divers", "récente", "2026-09-05", "b"),
    ]);
    expect(o.parType[0].items.map((c) => c.texte)).toEqual(["récente", "ancienne"]);
  });

  it("groupe par type, le groupe le plus fourni d'abord", () => {
    const o = observations([
      obs("santé", "s1", "2026-01-01", "1"),
      obs("scolaire", "sc1", "2026-01-02", "2"),
      obs("scolaire", "sc2", "2026-01-03", "3"),
    ]);
    expect(o.parType[0].type).toBe("scolaire");
  });

  it("range sous « divers » une observation sans type", () => {
    expect(observations([obs("", "sans type")]).parType[0].type).toBe("divers");
  });
});

describe("notes", () => {
  const ev = (id: string, bareme: number, date: string): Evaluation => ({
    id, titre: `Éval ${id}`, matiere: "Maths", date, bareme, periode: 1,
    mode: "note", competencesJson: "[]", pdfNomFichier: null,
  });
  const n = (id: string, evaluationId: string, note: number | null, absent = false): NoteEleve => ({
    id, eleveNom: "Quang", eleveId: "e1", note, absent, commentaire: "",
    evaluationId, niveauxJson: "{}",
  });

  it("ramène sur 20 pour pouvoir comparer", () => {
    const l = notes([n("n1", "ev1", 8)], [ev("ev1", 10, "2026-09-01")], "e1");
    expect(l[0].sur20).toBe(16);
  });

  it("écarte les absences et les notes vides", () => {
    const evs = [ev("ev1", 20, "2026-09-01")];
    expect(notes([n("n1", "ev1", null)], evs, "e1")).toHaveLength(0);
    expect(notes([n("n2", "ev1", 12, true)], evs, "e1")).toHaveLength(0);
  });

  it("écarte une note dont l'évaluation a disparu", () => {
    expect(notes([n("n1", "fantome", 12)], [], "e1")).toHaveLength(0);
  });

  it("ne ramène pas sur 20 sans barème exploitable", () => {
    expect(notes([n("n1", "ev1", 3)], [ev("ev1", 0, "2026-09-01")], "e1")[0].sur20).toBeUndefined();
  });

  it("ne garde que les notes de l'élève demandé", () => {
    const autre = { ...n("n2", "ev1", 20), eleveId: "e2" };
    expect(notes([n("n1", "ev1", 10), autre], [ev("ev1", 20, "2026-09-01")], "e1")).toHaveLength(1);
  });
});

describe("âge", () => {
  it("compte les années révolues", () => {
    expect(age("2018-05-10", new Date("2026-09-11"))).toBe(8);
    expect(age("2018-12-10", new Date("2026-09-11"))).toBe(7);
  });

  it("se tait plutôt que d'inventer", () => {
    expect(age("")).toBeUndefined();
    expect(libelleAge(1)).toBe("1 an");
    expect(libelleAge(17)).toBe("17 ans");
    expect(age("pas une date")).toBeUndefined();
    expect(age("2080-01-01", new Date("2026-09-11"))).toBeUndefined();
  });
});

describe("dossier complet", () => {
  const vide = { papiers: [] as PapierEleve[], progressions: [] as ProgressionEleve[] };

  it("signale l'absence d'axe de travail", () => {
    const d = construire(eleve(), [obs("divers", "x")], [], [], [], vide.papiers, vide.progressions, false);
    expect(d.manques.join(" ")).toMatch(/axe de travail/);
  });

  it("ne le signale plus dès qu'un axe est posé", () => {
    const d = construire(eleve(), [obs("axe de travail", "tour de rôle")], [], [], [], vide.papiers, vide.progressions, false);
    expect(d.manques.join(" ")).not.toMatch(/axe de travail/);
  });

  it("énumère les pièces à remplir", () => {
    const d = construire(eleve(), [], [], [], [doc("progressions", '[{"a":1}]')], vide.papiers, vide.progressions, false);
    const texte = d.manques.join(" ");
    expect(texte).toMatch(/Synthèse des acquis GS/);
    expect(texte).not.toMatch(/À remplir.*Progressions/);
  });

  it("ne mélange pas les élèves", () => {
    const autre: CommentaireEleve = { ...obs("divers", "pas à lui"), eleveId: "e2" };
    const d = construire(eleve(), [obs("divers", "à lui"), autre], [], [], [], vide.papiers, vide.progressions, false);
    expect(d.observations.total).toBe(1);
  });

  it("compte les progressions faites", () => {
    const p: ProgressionEleve[] = [
      { id: "p1", nomEleve: "Quang", eleveId: "e1", fait: true, espaceId: null },
      { id: "p2", nomEleve: "Quang", eleveId: "e1", fait: false, espaceId: null },
      { id: "p3", nomEleve: "Autre", eleveId: "e2", fait: true, espaceId: null },
    ];
    expect(construire(eleve(), [], [], [], [], [], p, false).progressions).toEqual({ faites: 1, total: 2 });
  });
});
