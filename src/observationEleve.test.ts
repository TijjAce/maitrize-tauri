import { describe, it, expect, vi, beforeEach } from "vitest";

const appels: { messages: { role: string; content: string }[] }[] = [];
let reponse = "";

vi.mock("./api", () => ({
  api: {
    modeleActif: async () => "ministral-8b-latest",
    mistralChat: async (messages: { role: string; content: string }[]) => {
      appels.push({ messages });
      return reponse;
    },
  },
}));

import {
  AXES, COLONNES, axesProches, cheminDeLAxe, chercherAxes, fichesANourrir, lireRepartition,
  motsUtiles, noteDepuisLeBilan, nouvelleObservation, observationVide, promptRepartition, repartir,
} from "./observationEleve";
import type { ObservationEleve } from "./api";

const fiche = (p: Partial<ObservationEleve> = {}): ObservationEleve => ({
  id: "o1", eleveId: "e1", date: "2026-09-22", creneauId: "c1",
  contexte: "Maths — atelier tri", axe: "Comprend une consigne orale y compris en contexte bruyant",
  domaine: "1. Les langages pour penser et communiquer › Compréhension du langage oral",
  competence: "Comprendre des consignes", note: "", reussites: "", difficultes: "",
  hypotheses: "", amenagements: "", reajustement: "", dateCreation: "", dateMaj: "", ...p,
});

beforeEach(() => { appels.length = 0; });

describe("les axes tirés de la grille Cap école inclusive", () => {
  it("déplie les cent observables de la grille", () => {
    expect(AXES.length).toBeGreaterThan(80);
    for (const a of AXES.slice(0, 20)) {
      expect(a.observable.trim()).not.toBe("");
      expect(a.domaine).toMatch(/^\d\./);
      expect(a.sousDomaine.trim()).not.toBe("");
    }
  });

  it("chaque axe dit d'où il vient", () => {
    const a = AXES.find((x) => x.observable.includes("consigne orale"));
    expect(a).toBeTruthy();
    expect(cheminDeLAxe(a!)).toContain("›");
    expect(cheminDeLAxe(a!)).toContain("langages");
  });
});

describe("l'axe proposé d'après ce qu'on travaille", () => {
  it("propose des observables du bon domaine pour une compétence de langage", () => {
    const proches = axesProches("Comprendre une consigne orale simple");
    expect(proches.length).toBeGreaterThan(0);
    expect(proches[0].observable.toLowerCase()).toContain("consigne");
  });

  it("classe l'observable qui porte le mot avant celui dont c'est le domaine", () => {
    const proches = axesProches("lecture des mots irréguliers");
    expect(proches[0].observable.toLowerCase()).toContain("mots irréguliers");
  });

  it("ne propose rien plutôt que n'importe quoi", () => {
    expect(axesProches("")).toEqual([]);
    expect(axesProches("les des une")).toEqual([]);
  });

  it("jette les mots qui ne discriminent rien", () => {
    expect(motsUtiles("Travail sur les consignes en atelier")).toEqual(["consignes"]);
  });
});

describe("chercher un axe à la main", () => {
  it("cherche dans l'observable, le sous-domaine et le domaine", () => {
    expect(chercherAxes("consigne").length).toBeGreaterThan(0);
    expect(chercherAxes("consigne orale bruyant")[0].observable).toContain("bruyant");
  });

  it("sans recherche, rend le début de la grille", () => {
    expect(chercherAxes("", 5)).toHaveLength(5);
  });

  it("une recherche sans résultat ne rend rien", () => {
    expect(chercherAxes("zzzz inexistant")).toEqual([]);
  });
});

describe("la fiche d'observation", () => {
  it("naît vide, sur son axe, avec sa date et son contexte", () => {
    const axe = AXES[0];
    const o = nouvelleObservation({
      id: "o9", eleveId: "e1", date: "2026-09-22", creneauId: "c1",
      contexte: "Maths", competence: "Dénombrer", axe, quand: "2026-09-22T08:00:00Z",
    });
    expect(o.axe).toBe(axe.observable);
    expect(o.domaine).toBe(cheminDeLAxe(axe));
    expect(o.competence).toBe("Dénombrer");
    expect(observationVide(o)).toBe(true);
  });

  it("une fiche qui porte un constat n'est plus vide", () => {
    expect(observationVide(fiche({ reussites: "A trié seule." }))).toBe(false);
  });
});

describe("ranger le bilan en colonnes", () => {
  it("la consigne nomme les cinq colonnes et interdit le diagnostic", () => {
    const m = promptRepartition(fiche({ note: "A demandé de l'aide." }));
    for (const c of COLONNES) expect(m[0].content).toContain(c.titre);
    expect(m[0].content).toContain("jamais sur un diagnostic");
    expect(m[0].content).toContain("au conditionnel");
    expect(m[1].content).toContain("Axe observé");
    expect(m[1].content).toContain("A demandé de l'aide.");
  });

  it("découpe la réponse en colonnes, et ignore une colonne vide", () => {
    const lu = lireRepartition([
      "## Réussites, points d'appui", "- A trié seule les couleurs.",
      "## Difficultés, obstacles", "- Perdue quand la consigne est longue.",
      "## Besoin identifié — hypothèses", "Aurait besoin d'une consigne en deux temps.",
      "## Propositions — aménagements", "- Reformuler avec un pictogramme.",
      "## Évaluation — réajustement", "-",
    ].join("\n"));
    expect(lu.reussites).toBe("- A trié seule les couleurs.");
    expect(lu.hypotheses).toContain("Aurait besoin");
    expect(lu.reajustement).toBeUndefined();
  });

  it("aucun prénom ne part, et il revient dans les colonnes", async () => {
    reponse = "## Réussites, points d'appui\n[P1] a trié seule.\n## Difficultés, obstacles\n-";
    const rendu = await repartir(fiche({ note: "Camille a trié seule les couleurs." }), "Camille Bernard");
    const envoye = appels[0].messages.map((m) => m.content).join("\n");
    expect(envoye).not.toContain("Camille");
    expect(rendu.reussites).toBe("Camille a trié seule.");
  });

  it("sans bilan, on n'appelle pas l'IA pour rien", async () => {
    await expect(repartir(fiche(), "Camille")).rejects.toThrow(/vide/);
    expect(appels).toHaveLength(0);
  });

  it("une réponse inexploitable ne remplit aucune colonne", async () => {
    reponse = "Bien sûr ! Voici la grille remplie.";
    await expect(repartir(fiche({ note: "Un constat." }), "Camille")).rejects.toThrow(/exploitable/);
  });
});

describe("le bilan du créneau qui nourrit la fiche", () => {
  it("ne garde que les phrases qui nomment l'élève", () => {
    const bilan = "Apolline a trié seule les couleurs. Ayyûb a eu besoin d'aide.";
    expect(noteDepuisLeBilan(bilan, "Apolline Martin")).toBe("Apolline a trié seule les couleurs.");
  });

  it("garde tout quand l'élève n'est nommé nulle part : le créneau était le sien", () => {
    const bilan = "Atelier calme, tout le monde a participé.";
    expect(noteDepuisLeBilan(bilan, "Apolline Martin")).toBe(bilan);
  });

  it("ne met à jour que les fiches du bon créneau, et seulement si ça change", () => {
    const base = fiche({ id: "a", creneauId: "c1", eleveId: "e1", note: "" });
    const autre = fiche({ id: "b", creneauId: "c2", eleveId: "e1", note: "" });
    const nomDe = () => "Apolline Martin";
    const suite = fichesANourrir([base, autre], "c1", "Apolline a réussi.", nomDe, "2026-09-22T10:00:00Z");
    expect(suite.map((o) => o.id)).toEqual(["a"]);
    expect(suite[0].note).toBe("Apolline a réussi.");

    // Rejouée avec le même bilan, elle ne réécrit rien.
    expect(fichesANourrir([suite[0], autre], "c1", "Apolline a réussi.", nomDe, "x")).toEqual([]);
  });
});
