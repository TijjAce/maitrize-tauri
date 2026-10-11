import { describe, it, expect } from "vitest";
import { DOCUMENTS_HG, documentsDesSeances, texteDesDocuments } from "./documentsHistoireGeo";
import { DEMARCHES_HISTOIRE_GEO, planHistoireGeo } from "./demarchesHistoireGeo";
import { morceauxAvecLiens } from "./liens";

describe("les documents à montrer des séquences d'histoire-géographie", () => {
  it("vont chacun à une séance qui existe, avec une adresse sûre", () => {
    const seances = new Map(DEMARCHES_HISTOIRE_GEO.map((d) => [d.id, d.seances.length]));
    for (const [id, parSeance] of Object.entries(DOCUMENTS_HG)) {
      expect(seances.has(id), id).toBe(true);
      for (const [s, documents] of Object.entries(parSeance)) {
        expect(Number(s), `${id} · séance ${s}`).toBeLessThan(seances.get(id)!);
        for (const d of documents) {
          expect(d.url, d.titre).toMatch(/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}\//);
          // Ce qui s'imprime dit sa licence.
          if (d.usage === "imprimer") expect(d.licence, d.titre).toBeTruthy();
        }
      }
    }
  });

  it("s'écrivent dans le matériel de la séance, une ligne chacun, l'adresse cliquable au bout", () => {
    const texte = texteDesDocuments(DOCUMENTS_HG["prehistoire-ce2"][2]);
    expect(texte.split("\n")[0]).toBe("Documents à montrer :");
    expect(texte).toContain("• Lascaux : entrer dans la grotte, en visite virtuelle (ministère de la Culture) — à projeter : https://archeologie.culture.gouv.fr/lascaux/fr/visiter-grotte-lascaux");
    expect(texte).toContain("— libre, à imprimer (licence de chaque image) :");
    // Chaque adresse, même celles qui finissent par une parenthèse, reste entière.
    for (const parSeance of Object.values(DOCUMENTS_HG)) for (const documents of Object.values(parSeance)) {
      const liens = morceauxAvecLiens(texteDesDocuments(documents)).filter((m) => m.lien).map((m) => m.texte);
      expect(liens).toEqual(documents.map((d) => d.url));
    }
    expect(texteDesDocuments([])).toBe("");
  });

  it("suivent le plan de la séquence, séance par séance, sans toucher à la note de matériel", () => {
    const plan = planHistoireGeo("representations-monde-cp", null)!;
    expect(plan.documents).toHaveLength(plan.materiel.length);
    expect(plan.documents![1]).toContain("Le planisphère de la classe, 6 feuilles A4 à assembler (Éduscol, kit de cartes 2026) — à imprimer pour la classe");
    expect(plan.materiel[1]).toBe("Le globe et le planisphère de la classe.");
    expect(documentsDesSeances("petite-sirene-cp", 5).every((t) => t === "")).toBe(true);
    expect(planHistoireGeo("petite-sirene-cp", null)!.documents).toBeUndefined();
  });
});

describe("les adresses d'un texte", () => {
  it("se détachent de la ponctuation de la phrase, mais gardent leurs propres parenthèses", () => {
    const lien = (t: string) => morceauxAvecLiens(t).filter((m) => m.lien).map((m) => m.texte);
    expect(lien("Voir https://exemple.fr/page.")).toEqual(["https://exemple.fr/page"]);
    expect(lien("(voir https://exemple.fr/a)")).toEqual(["https://exemple.fr/a"]);
    expect(lien("Carnac : https://commons.wikimedia.org/wiki/Category:Carnac_(stone_rows)")).toEqual(["https://commons.wikimedia.org/wiki/Category:Carnac_(stone_rows)"]);
    expect(lien("Rien ici, ni http:// seul.")).toEqual([]);
    expect(morceauxAvecLiens("a https://b.fr c").map((m) => m.texte)).toEqual(["a ", "https://b.fr", " c"]);
  });
});
