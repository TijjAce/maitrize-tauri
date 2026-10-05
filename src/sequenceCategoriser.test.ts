import { describe, it, expect } from "vitest";
import { REGLAGES_CATEGORISER, type Categorie, type ReglagesCategoriser } from "./categoriser";
import { demarcheDe } from "./demarches";
import type { Referentiel } from "./api";
import {
  DEMARCHE_CATEGORISER, FEUILLES_DE_LA_SEQUENCE, competenceDuProgramme, feuillesPour, materielDesSeances, objectifsDeLaSequence, titreDeLaSequence,
} from "./sequenceCategoriser";

const cat = (nom: string, mots: string[], debut: number): Categorie =>
  ({ nom, image: null, appel: "", intrus: false, mots: mots.map((mot, i) => ({ id: debut + i, mot })) });
const FRUITS = cat("Les fruits", ["pomme", "banane", "poire", "orange"], 1);
const LEGUMES = cat("Les légumes", ["carotte", "salade", "poireau", "chou"], 10);
const r = (m: Partial<ReglagesCategoriser>): ReglagesCategoriser => ({ ...REGLAGES_CATEGORISER, categories: [FRUITS, LEGUMES], ...m });

const referentiel = (nom: string, actif: boolean, niveaux: string[]): Referentiel => ({
  id: nom, nom, cycle: "Cycle 1", estIntegre: true, actif, dateAjout: "",
  donnees: JSON.stringify({ domaines: [{ id: "D1", titre: "1. Mobiliser le langage dans toutes ses dimensions", sousDomaines: [{
    id: "D1.SD1", titre: "Acquérir le langage oral", competencesGenerales: [{ id: "CG1", titre: "Enrichir son vocabulaire",
      competences: niveaux.map((niveau) => ({ id: `${nom}-${niveau}`, texte: "Organiser les mots en catégorie et en réseau", niveau })) }],
  }] }] }),
});

describe("la séquence pour catégoriser les mots", () => {
  it("suit la démarche de maternelle, et chaque feuille a sa séance", () => {
    const d = demarcheDe(DEMARCHE_CATEGORISER)!;
    expect(d.famille).toBe("Maternelle");
    expect(d.seances.map((s) => s.titre)[0]).toMatch(/^Étape 1/);
    for (const f of FEUILLES_DE_LA_SEQUENCE) expect(f.seance).toBeLessThan(d.seances.length);
    expect(materielDesSeances("loto")).toHaveLength(d.seances.length);
  });

  it("donne le jeu de cartes de l'âge — J'appelle…, les familles, le mistigri — ou un autre qui se fait", () => {
    const jeu = (n: ReglagesCategoriser["niveau"], cs?: Categorie[]) => feuillesPour(r({ niveau: n, ...(cs ? { categories: cs } : {}) })).find((f) => f.seance === 4)?.forme;
    expect(jeu("PS")).toBe("appelle");
    expect(jeu("MS")).toBe("familles");
    expect(jeu("GS")).toBe("mistigri");
    // Deux images par catégorie : pas de familles, alors « J'appelle… ».
    expect(jeu("MS", [cat("A", ["a", "b"], 1), cat("B", ["c", "d"], 5)])).toBe("appelle");
    const toutes = feuillesPour(r({ niveau: "MS" })).map((f) => f.forme);
    expect(toutes).toEqual(["cartes", "tri", "intrus", "affiche", "loto", "familles", "evaluation"]);
  });

  it("se nomme d'après ses catégories, et vise ce que la fiche observe à cet âge", () => {
    expect(titreDeLaSequence(r({ niveau: "PS" }))).toBe("Catégoriser : les fruits et les légumes (PS)");
    expect(titreDeLaSequence(r({ categories: [] }))).toBe("Catégoriser les mots (MS)");
    expect(objectifsDeLaSequence(r({ niveau: "GS" }))).toMatch(/^Organiser les mots en catégorie et en réseau : les fruits et les légumes\. GS, à partir de 5 ans : /);
  });

  it("trouve la compétence du programme à cet âge, dans le référentiel actif — 2025 d'abord", () => {
    const ancien = referentiel("Cycle 1 — École maternelle (v1)", true, ["PS", "MS", "GS"]);
    const nouveau = referentiel("Cycle 1 — Programme 2025 (v2)", true, ["PS", "MS", "GS"]);
    const c = competenceDuProgramme([ancien, nouveau], "MS")!;
    expect(c.referentielNom).toBe("Cycle 1 — Programme 2025 (v2)");
    expect(c.competenceRefId).toBe("Cycle 1 — Programme 2025 (v2)-MS");
    expect(c.niveau).toBe("MS");
    expect(c.domaineTitre).toBe("1. Mobiliser le langage dans toutes ses dimensions");
    expect(c.competenceGeneraleTitre).toBe("Enrichir son vocabulaire");
    expect(competenceDuProgramme([referentiel("Cycle 1 — Programme 2025", false, ["MS"])], "MS")).toBeNull();
    expect(competenceDuProgramme([{ ...nouveau, donnees: "{" }], "MS")).toBeNull();
  });
});
