import { describe, expect, it } from "vitest";
import cycle1 from "../src-tauri/referentiels/competences_cycle1_2025.json";
import cycle2 from "../src-tauri/referentiels/competences_cycle2.json";
import cycle3 from "../src-tauri/referentiels/competences_cycle3.json";
import type { Referentiel } from "./api";
import {
  AVANT_DE_PRODUIRE, AVEC_LA_MEMOIRE, AVEC_LES_PROGRAMMES, ROLE_DE_L_ASSISTANT, SEUIL_DES_PROGRAMMES, TROIS_NIVEAUX, consigneDeLAssistant,
  extraitsPourLAssistant, programmesPourLaDemande,
} from "./consigneAssistant";

const ref = (id: string, nom: string, cycle: string, donnees: unknown): Referentiel =>
  ({ id, nom, cycle, donnees: JSON.stringify(donnees), estIntegre: true, dateAjout: "", actif: true });
const REFS = [
  ref("c1", "Cycle 1 — Programme 2025 (v2)", "Cycle 1", cycle1),
  ref("c2", "Cycle 2 — CP, CE1, CE2 (programmes 2026)", "Cycle 2", cycle2),
  ref("c3", "Cycle 3 — CM1, CM2 (programmes 2026)", "Cycle 3", cycle3),
];

describe("la consigne de l'Assistant, d'après M2PA (demande de l'enseignant, 5 novembre 2026)", () => {
  it("donne le rôle, la question avant une longue production, les trois niveaux sourcés, la classe, les programmes et la mémoire", () => {
    const c = consigneDeLAssistant({ role: true, contexte: "Niveau de la classe : CM1.", programmes: "- [Cycle 3] … — (CM1) Comparer des fractions", memoire: "- Enseigne en ULIS." });
    for (const partie of [ROLE_DE_L_ASSISTANT, AVANT_DE_PRODUIRE, TROIS_NIVEAUX, AVEC_LES_PROGRAMMES, AVEC_LA_MEMOIRE]) expect(c).toContain(partie);
    expect(c).toContain("Niveau de la classe : CM1.");
    expect(c.indexOf(AVEC_LES_PROGRAMMES)).toBeLessThan(c.indexOf(AVEC_LA_MEMOIRE));
    // Les trois niveaux disent d'où ils viennent.
    for (const source of ["M2PA (Ryckebusch, Carra et Cadalen, 2026)", "Cnesco (2017)", "Millon-Fauré et", "Gombert, 2021"]) expect(TROIS_NIVEAUX).toContain(source);
    expect(TROIS_NIVEAUX).toMatch(/accommodement, ajustement, adaptation parallèle, adaptation coïncidente/);
    expect(AVANT_DE_PRODUIRE).toMatch(/au plus deux questions/);
    expect(AVEC_LES_PROGRAMMES).toMatch(/mot pour mot/);
  });

  it("contexte désactivé : rien que la mémoire ; sans mémoire non plus, aucun message système", () => {
    expect(consigneDeLAssistant({ role: false, contexte: "Niveau : CP.", programmes: "- x", memoire: "- Enseigne en IME." }))
      .toBe(`${AVEC_LA_MEMOIRE}\n- Enseigne en IME.`);
    expect(consigneDeLAssistant({ role: false, contexte: "Niveau : CP.", programmes: "- x", memoire: "" })).toBe("");
    expect(consigneDeLAssistant({})).toBe("");
  });

  it("joint les attendus du programme qui parlent de la demande, ciblés sur le cycle de la classe, six au plus", () => {
    const cm1 = programmesPourLaDemande(REFS, "Une séquence pour comparer et ranger des fractions", ["CM1"]);
    expect(cm1.length).toBeGreaterThan(0);
    expect(cm1.length).toBeLessThanOrEqual(6);
    for (const t of cm1) {
      expect(t.referentiel, t.texte).toMatch(/^Cycle 3/);
      expect(t.score).toBeGreaterThanOrEqual(SEUIL_DES_PROGRAMMES);
    }
    expect(cm1.some((t) => /fraction/i.test(t.texte))).toBe(true);
    expect(extraitsPourLAssistant(cm1)).toMatch(/^- \[Cycle 3 — CM1, CM2 \(programmes 2026\)\] /);
    // Une classe de maternelle : le programme de la maternelle.
    const ms = programmesPourLaDemande(REFS, "Des activités pour dénombrer et comparer des quantités", ["MS", "GS"]);
    expect(ms.length).toBeGreaterThan(0);
    for (const t of ms) expect(t.referentiel).toMatch(/^Cycle 1/);
  });

  it("ne cherche que le sujet : le niveau et ce qu'on demande ne font pas remonter n'importe quel attendu (vu dans la maquette)", () => {
    const demande = "Je travaille avec une classe à double niveau CM1-CM2, en IME. Propose une séquence pour comparer et ranger des fractions.";
    const trouves = programmesPourLaDemande(REFS, demande, ["CM1"]);
    expect(trouves.length).toBeGreaterThan(0);
    for (const t of trouves) {
      expect(t.referentiel).toMatch(/^Cycle 3/);
      expect(`${t.chemin} ${t.texte}`, t.texte).toMatch(/fraction|compar|rang/i);
      expect(t.chemin).not.toMatch(/Langues vivantes/);
    }
  });

  it("laisse la demande choisir son cycle quand elle nomme un niveau, et ne joint rien de trop vague", () => {
    const cp = programmesPourLaDemande(REFS, "En CP, comment travailler la segmentation des mots en syllabes ?", ["CM1"]);
    expect(cp.length).toBeGreaterThan(0);
    for (const t of cp) expect(t.referentiel).toMatch(/^Cycle 2/);
    expect(programmesPourLaDemande(REFS, "Bonjour, merci pour hier !", ["CM1"])).toEqual([]);
  });
});
