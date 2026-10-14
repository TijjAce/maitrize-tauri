import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BureauCommun, MaterielItem, Sequence } from "./api";

// Ce que le dépôt demande au backend, et ce que le bureau contient.
const { appels, etat } = vi.hoisted(() => ({
  appels: [] as [string, unknown[]][],
  etat: { materiels: [] as MaterielItem[], sequences: [] as Sequence[] },
}));

vi.mock("./api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api")>()),
  api: new Proxy({}, {
    get: (_cible, nom) => {
      if (typeof nom !== "string" || nom === "then") return undefined;
      return async (...args: unknown[]) => {
        appels.push([nom, args]);
        if (nom === "materielList") return etat.materiels;
        if (nom === "sequencesList") return etat.sequences;
        if (nom === "settingsAll") return {};
        // Le backend rend le chemin écrit : le dossier, puis le nom.
        if (nom === "communPoserFichier" || nom === "communCreerDossier" || nom === "communEcrire") {
          return [args[1], args[2]].filter(Boolean).join("/");
        }
        if (nom === "fichierRead") return "";
        return nom.endsWith("List") ? [] : null;
      };
    },
  }),
}));

import { nouvelleSequence } from "./api";
import { deposerElement } from "./partageCommun";

const bureau = { id: "b1", nom: "Nuage", chemin: "", sorte: "nuage" } as unknown as BureauCommun;
const materiel = (p: Partial<MaterielItem>): MaterielItem => ({
  id: "m1", titre: "Fiche", descriptionMateriel: "", competenceId: "", competenceTitre: "", domaineTitre: "",
  sousDomaineTitre: "", cycle: "", imagesJson: "[]", pdfsJson: "[]", dateCreation: "2026-10-14", seanceId: null,
  sequenceId: null, dossier: "", videosJson: "[]", coffreJson: "[]", ...p,
});
const demandes = (nom: string) => appels.filter(([n]) => n === nom).map(([, args]) => args);

beforeEach(() => {
  appels.length = 0;
  etat.materiels = [];
  etat.sequences = [];
});

describe("déposer un élément du bureau sur un bureau commun", () => {
  it("pose le PDF d'un document tel qu'il est, à son nom : aucun paquet que seul Maitrize ouvrirait", async () => {
    etat.materiels = [materiel({ id: "m1", titre: "Dictées pour l'école", pdfsJson: '["3f2a.pdf"]' })];
    const r = await deposerElement("materiel", "m1", "Dictées pour l'école", bureau, "Manuels");
    expect(demandes("communPoserFichier")).toEqual([["b1", "Manuels", "Dictées pour l'école.pdf", "3f2a.pdf"]]);
    expect(demandes("communEcrire")).toEqual([]);
    // Annuler supprime ce fichier-là.
    expect(r).toEqual({ nom: "Dictées pour l'école.pdf", elements: 1 });
  });

  it("range les fichiers d'un document qui en a plusieurs dans un dossier à son nom", async () => {
    etat.materiels = [materiel({ id: "m2", titre: "Loto", pdfsJson: '["a.pdf"]', imagesJson: '["b.png"]' })];
    const r = await deposerElement("materiel", "m2", "Loto", bureau);
    expect(demandes("communCreerDossier")).toEqual([["b1", "", "Loto"]]);
    expect(demandes("communPoserFichier")).toEqual([["b1", "Loto", "Loto.pdf", "a.pdf"], ["b1", "Loto", "Loto (2).png", "b.png"]]);
    expect(r).toEqual({ nom: "Loto", elements: 1 });
  });

  it("garde le paquet « .maitrize » pour une séquence, qui emporte ses séances", async () => {
    etat.sequences = [{ ...nouvelleSequence(), id: "q1", titre: "Les fractions" }];
    await deposerElement("sequence", "q1", "Les fractions", bureau);
    expect(demandes("communPoserFichier")).toEqual([]);
    expect(demandes("communEcrire").map((args) => String(args[2]))).toEqual([expect.stringMatching(/\.maitrize$/)]);
  });
});
