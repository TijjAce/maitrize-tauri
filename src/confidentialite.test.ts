import { describe, it, expect } from "vitest";
import { pseudonymiser, restaurer } from "./confidentialite";

const eleves = ["Apolline Martin", "Léo Dubois-Durand", "Rose Petit"];

describe("pseudonymiser", () => {
  it("aucun nom d'élève ne reste dans le texte envoyé", () => {
    const { texte } = pseudonymiser("Apolline Martin a lu seule. Ensuite Léo a aidé Apolline.", eleves);
    for (const mot of ["Apolline", "Martin", "Léo"]) expect(texte).not.toContain(mot);
    expect(texte).toBe("[P1] a lu seule. Ensuite [P2] a aidé [P3].");
  });

  it("le nom complet passe avant le prénom seul", () => {
    const { table } = pseudonymiser("Apolline Martin, puis Apolline.", eleves);
    expect(table.map((r) => r.original).sort()).toEqual(["Apolline", "Apolline Martin"]);
  });

  it("un nom composé reste un seul nom", () => {
    const { texte } = pseudonymiser("M. Dubois-Durand est venu.", eleves);
    expect(texte).toBe("M. [P1] est venu.");
  });

  it("un mot courant en minuscules n'est pas pris pour une élève", () => {
    expect(pseudonymiser("Une fleur rose.", eleves).texte).toBe("Une fleur rose.");
    expect(pseudonymiser("Rose est là.", eleves).texte).toBe("[P1] est là.");
  });

  it("un morceau de mot n'est pas un nom", () => {
    expect(pseudonymiser("Martine et Leonard", eleves).texte).toBe("Martine et Leonard");
  });

  it("les majuscules d'origine reviennent telles quelles", () => {
    const { texte, table } = pseudonymiser("APOLLINE progresse.", eleves);
    expect(texte).toBe("[P1] progresse.");
    expect(restaurer("[P1] fait des progrès.", table).texte).toBe("APOLLINE fait des progrès.");
  });
});

describe("restaurer", () => {
  it("remet chaque nom à sa place, même déplacé", () => {
    const { table } = pseudonymiser("Apolline aide Léo.", eleves);
    expect(restaurer("[P2] est aidé par [P1].", table).texte).toBe("Léo est aidé par Apolline.");
  });

  it("signale un nom disparu de la réponse", () => {
    const { table } = pseudonymiser("Apolline aide Léo.", eleves);
    expect(restaurer("[P1] aide un camarade.", table).absents).toEqual(["Léo"]);
  });

  it("un texte sans élève passe inchangé", () => {
    const r = pseudonymiser("La séance a bien commencé.", eleves);
    expect(r.table).toEqual([]);
    expect(restaurer(r.texte, r.table).texte).toBe("La séance a bien commencé.");
  });
});
