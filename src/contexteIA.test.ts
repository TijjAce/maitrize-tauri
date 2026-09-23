import { describe, it, expect, vi } from "vitest";

const reglages: Record<string, string | null> = { niveauClasse: "CE1", anneeCourante: "2026-2027" };
const etat = {
  eleves: [{ id: "e1", nom: "Apolline Martin" }, { id: "e2", nom: "Ayyûb Haddad" }],
  progs: [] as { annee: string; lignesJson: string; niveau: string; estImportee: boolean }[],
};

vi.mock("./api", () => ({
  newId: () => "id" + Math.random().toString(36).slice(2, 8),
  api: {
    settingGet: async (c: string) => reglages[c] ?? null,
    elevesList: async () => etat.eleves,
    sequencesList: async () => [],
    programmationsFinaleList: async () => etat.progs,
  },
}));

import { construireContexteIA } from "./contexteIA";

const ligne = (niveau: string, lignesJson: string) =>
  ({ annee: "2026-2027", lignesJson, niveau, estImportee: false });

describe("le contexte envoyé à l'IA", () => {
  it("donne le nombre d'élèves, jamais leurs noms", async () => {
    const texte = await construireContexteIA();
    expect(texte).toContain("Nombre d'élèves dans la classe : 2");
    expect(texte).not.toContain("Apolline");
    expect(texte).not.toContain("Ayyûb");
  });

  it("lit la programmation de classe", async () => {
    etat.progs = [ligne("", JSON.stringify([
      { estDomaine: true, label: "Français" }, { estDomaine: false, label: "Lire des syllabes" }]))];
    expect(await construireContexteIA()).toContain("Lire des syllabes");
  });

  it("lit la programmation IME sans dire qui travaille quoi", async () => {
    // Une programmation par élève n'est pas un tableau de lignes : lue comme
    // telle, elle disparaissait du contexte.
    etat.progs = [ligne("ime", JSON.stringify({
      groupes: [{ id: "g1", nom: "Langage", eleveIds: ["e1", "e2"] }],
      objectifs: [
        { competence: "Demander de l'aide", pour: ["groupe:g1"], periodes: [1] },
        { competence: "Demander de l'aide", pour: ["eleve:e2"], periodes: [2] },
        { competence: "", pour: [], periodes: [] },
      ],
    }))];
    const texte = await construireContexteIA();
    expect(texte).toContain("Demander de l'aide");
    // Une seule fois, et sans le moindre prénom.
    expect(texte.match(/Demander de l'aide/g)).toHaveLength(1);
    expect(texte).not.toContain("Apolline");
    expect(texte).not.toContain("e2");
  });

  it("la ligne IME ne se fait pas passer pour la programmation de classe", async () => {
    etat.progs = [
      ligne("ime", JSON.stringify({ groupes: [], objectifs: [{ competence: "Dénombrer" }] })),
      ligne("", JSON.stringify([{ estDomaine: true, label: "Mathématiques" }])),
    ];
    const texte = await construireContexteIA();
    expect(texte).toContain("Mathématiques");
    // La classe l'emporte : on ne double pas le contexte.
    expect(texte).not.toContain("Dénombrer");
  });
});
