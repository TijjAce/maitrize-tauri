import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CompetenceSelectionnee } from "./components/CompetenceTree";

const reglages = new Map<string, string>();
const impressions: { titre: string; corps: string; style: string }[] = [];
const pdfs: string[] = [];
const materiels: unknown[] = [];

vi.mock("./api", () => ({
  api: {
    settingGet: async (cle: string) => reglages.get(cle) ?? null,
    feuilleEnPdf: async (html: string) => { pdfs.push(html); return `pdf-${pdfs.length}.pdf`; },
    materielSave: async (m: unknown) => { materiels.push(m); return m; },
  },
  newId: () => "id-neuf",
  nowIso: () => "2026-09-28T10:00:00.000Z",
}));
vi.mock("./print", async (importOriginal) => {
  const vrai = await importOriginal<typeof import("./print")>();
  return {
    ...vrai,
    printHTML: (titre: string, corps: string, style = "") => { impressions.push({ titre, corps, style }); },
  };
});

const {
  LIGNES_MAX, contexteCompetence, enregistrerSurLeBureau, enteteCompetencesHtml, imprimerAtelier, ligneCompetence,
  lignesCompetences, materielDuBureau, STYLE_ENTETE_COMPETENCES,
} = await import("./impressionAtelier");
const { ecrireCompetencesAtelier } = await import("./ateliersCompetences");

const comp = (p: Partial<CompetenceSelectionnee> = {}): CompetenceSelectionnee => ({
  id: "r1|S1|c1", referentielNom: "Cycle 2", domaineId: "D1", domaineTitre: "Lire et écrire",
  sousDomaineTitre: "Identifier des mots", competenceGeneraleTitre: null,
  competenceTitre: "Décoder des syllabes simples", niveau: "CP", competenceRefId: "c1", ...p,
});

beforeEach(() => { reglages.clear(); impressions.length = 0; pdfs.length = 0; materiels.length = 0; });

describe("une compétence sur une ligne", () => {
  it("dit l'intitulé, puis d'où elle vient — jamais le niveau, la feuille va à l'élève", () => {
    expect(ligneCompetence(comp())).toBe("Décoder des syllabes simples — Cycle 2 › Lire et écrire › Identifier des mots");
    expect(ligneCompetence(comp({ niveau: "CP" }))).not.toContain("CP");
  });

  it("se passe de ce qui manque", () => {
    expect(ligneCompetence(comp({ niveau: null, referentielNom: "", domaineTitre: "", sousDomaineTitre: "" })))
      .toBe("Décoder des syllabes simples");
    // Un domaine qui répète le référentiel ne s'écrit qu'une fois.
    expect(contexteCompetence(comp({ referentielNom: "Maternelle", domaineTitre: "Maternelle", sousDomaineTitre: " " })))
      .toBe("Maternelle");
  });
});

describe("l'en-tête imprimé", () => {
  it("n'existe pas sans compétence choisie", () => {
    expect(enteteCompetencesHtml([])).toBe("");
  });

  it("écrit chaque compétence, échappée, et accorde son titre", () => {
    const une = enteteCompetencesHtml([comp({ competenceTitre: "Lire <b>vite</b>" })]);
    expect(une).toContain("Compétence travaillée");
    expect(une).not.toContain("Compétences travaillées");
    expect(une).toContain("<b>Lire &lt;b&gt;vite&lt;/b&gt;</b>");
    expect(une).not.toContain("[CP]");
    expect(une).toContain("Cycle 2 › Lire et écrire › Identifier des mots");
    expect(une).not.toContain("<b>vite</b>");

    const deux = enteteCompetencesHtml([comp(), comp({ competenceTitre: "Lire des mots", niveau: "CE1" })]);
    expect(deux).toContain("Compétences travaillées");
    expect(deux.match(/class="ca-ligne"/g)).toHaveLength(2);
  });

  it("compte les compétences en trop plutôt que de déborder", () => {
    // L'en-tête a une hauteur plafonnée : au-delà, la place manque et il vaut
    // mieux le dire que couper une ligne au milieu.
    const beaucoup = Array.from({ length: 6 }, (_, i) => comp({ competenceTitre: `Compétence ${i + 1}` }));
    const html = enteteCompetencesHtml(beaucoup);
    expect(html).toContain("Compétence 3");
    expect(html).not.toContain("Compétence 4");
    expect(html).toContain("et 3 autres compétences");
    const lignes = lignesCompetences(beaucoup);
    expect(lignes).toHaveLength(LIGNES_MAX);
    expect(lignes[LIGNES_MAX - 1]).toBe("… et 3 autres compétences");
    expect(lignesCompetences([comp()])).toEqual([ligneCompetence(comp())]);
  });

  it("prend la place de la marge, pas celle du contenu", () => {
    // Une feuille de cartes remplit la page : l'en-tête ne doit rien pousser.
    expect(STYLE_ENTETE_COMPETENCES).toContain("@page :first { margin-top: 6mm; }");
    expect(STYLE_ENTETE_COMPETENCES).toContain("max-height: 13.4mm");
    expect(STYLE_ENTETE_COMPETENCES).toMatch(/@media print \{ body \{ padding-top: 0; \} \}/);
  });
});

describe("imprimer un atelier", () => {
  it("met ses compétences en tête, puis la feuille telle quelle", async () => {
    reglages.set("fabriquer:competences:lotoSyllabes", ecrireCompetencesAtelier([comp()]));
    await imprimerAtelier("lotoSyllabes", "Loto des syllabes", "<div class=\"feuille\">…</div>", ".feuille { }");
    expect(impressions).toHaveLength(1);
    const { titre, corps, style } = impressions[0];
    expect(titre).toBe("Loto des syllabes");
    expect(corps.startsWith('<div class="competences-atelier">')).toBe(true);
    expect(corps.endsWith("<div class=\"feuille\">…</div>")).toBe(true);
    expect(corps).toContain("Décoder des syllabes simples");
    expect(style.startsWith(".feuille { }")).toBe(true);
    expect(style).toContain(".competences-atelier");
  });

  it("imprime la feuille inchangée quand rien n'est choisi", async () => {
    await imprimerAtelier("fluence", "Grille de fluence", "<p>grille</p>", ".fl { }");
    expect(impressions[0]).toEqual({ titre: "Grille de fluence", corps: "<p>grille</p>", style: ".fl { }" });
  });

  it("imprime quand même si le réglage est illisible", async () => {
    reglages.set("fabriquer:competences:oie", "{pas du json");
    await imprimerAtelier("oie", "Jeu de l'oie", "<p>piste</p>");
    expect(impressions[0].corps).toBe("<p>piste</p>");
  });
});

describe("sur le bureau", () => {
  it("fait un matériel du bureau qui porte le PDF et la première compétence", () => {
    const m = materielDuBureau("cubes", "Les nombres en cubes", "x.pdf", [comp(), comp({ competenceTitre: "Autre" })], "id-1", "2026-09-28T10:00:00.000Z");
    expect(m).toMatchObject({
      id: "id-1", titre: "Les nombres en cubes", pdfsJson: '["x.pdf"]', dossier: "", seanceId: null, sequenceId: null,
      competenceId: "c1", competenceTitre: "Décoder des syllabes simples", domaineTitre: "Lire et écrire",
      sousDomaineTitre: "Identifier des mots", cycle: "Cycle 2", imagesJson: "[]", videosJson: "[]", coffreJson: "[]",
    });
    // Sans compétence, le matériel existe quand même ; sans titre, l'atelier le nomme.
    expect(materielDuBureau("oie", "  ", "y.pdf", [], "id-2", "")).toMatchObject({ titre: "oie", competenceId: "", competenceTitre: "" });
  });

  it("enregistre la même feuille que l'impression, compétences en tête, puis la dépose", async () => {
    reglages.set("fabriquer:competences:cubes", ecrireCompetencesAtelier([comp()]));
    const m = await enregistrerSurLeBureau("cubes", "Les nombres en cubes", "<div class=\"feuille\">…</div>", ".feuille { }");
    expect(pdfs).toHaveLength(1);
    expect(pdfs[0]).toContain("<title>Les nombres en cubes</title>");
    expect(pdfs[0].indexOf("competences-atelier")).toBeLessThan(pdfs[0].indexOf("<div class=\"feuille\">"));
    expect(pdfs[0]).toContain("Décoder des syllabes simples");
    expect(pdfs[0]).toContain(".feuille { }");
    expect(materiels).toHaveLength(1);
    expect(m).toMatchObject({ id: "id-neuf", titre: "Les nombres en cubes", pdfsJson: '["pdf-1.pdf"]', dateCreation: "2026-09-28T10:00:00.000Z" });
  });
});
