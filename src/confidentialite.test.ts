import { describe, it, expect } from "vitest";
import { nomsDansUnTexte, pseudonymiser, restaurer } from "./confidentialite";

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

  it("un prénom écrit en minuscules, ou sans ses accents, ne part pas non plus", () => {
    const { texte, table } = pseudonymiser("apolline a lu. ines aussi, puis leo.", [...eleves, "Inès Bernard"]);
    expect(texte).toBe("[P1] a lu. [P2] aussi, puis [P3].");
    expect(restaurer(texte, table).texte).toBe("apolline a lu. ines aussi, puis leo.");
  });

  it("la particule d'un nom de famille n'est jamais masquée seule", () => {
    const { texte } = pseudonymiser("Le chat de Léa Le Gall. Le Gall est venu, la maman de Léa aussi.", ["Léa Le Gall"]);
    expect(texte).toBe("Le chat de [P1]. Le [P2] est venu, la maman de [P3] aussi.");
  });

  it("un nom de famille qui est un mot courant ne masque pas ce mot en minuscules", () => {
    expect(pseudonymiser("Un petit chat, petit à petit.", eleves).texte).toBe("Un petit chat, petit à petit.");
    expect(pseudonymiser("Rose Petit a lu.", eleves).texte).toBe("[P1] a lu.");
  });

  it("un texte décomposé (accents en deux caractères) est masqué comme les autres", () => {
    const decompose = "Léo a lu.";
    expect(pseudonymiser(decompose, eleves).texte).toBe("[P1] a lu.");
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

describe("les noms dans un texte libre", () => {
  it("retrouve les personnes, pas les titres ni les fonctions", () => {
    expect(nomsDansUnTexte("Mme Martin — 01 23 45 67 89")).toEqual(["Martin"]);
    expect(nomsDansUnTexte("Sophie (classe 2), Karim (atelier cuisine)")).toEqual(["Sophie", "Karim"]);
    expect(nomsDansUnTexte("Léa (AESH), psychomotricienne le mardi")).toEqual(["Léa"]);
    expect(nomsDansUnTexte("M. Durand, enseignant référent ; la maman de Camille, Dr Nguyen")).toEqual(["Durand", "Camille", "Nguyen"]);
  });

  it("les personnes d'une réunion partent masquées avec les élèves", () => {
    const noms = [...eleves, ...nomsDansUnTexte("Mme Bernard (maman), Julie (AESH)")];
    const { texte } = pseudonymiser("Mme Bernard et Julie trouvent qu'Apolline progresse.", noms);
    expect(texte).toBe("Mme [P1] et [P2] trouvent qu'[P3] progresse.");
  });
});

describe("plusieurs textes masqués ensemble", () => {
  it("un même nom porte le même marqueur d'un texte à l'autre, et la réponse se restaure d'un coup", async () => {
    const { pseudonymiserTout } = await import("./confidentialite");
    const { textes, table } = pseudonymiserTout(["Comment aider Apolline ?", "Apolline et Léo lisent ensemble."], eleves);
    expect(textes).toEqual(["Comment aider [P1] ?", "[P1] et [P2] lisent ensemble."]);
    expect(restaurer("Proposez à [P1] de lire avec [P2].", table).texte).toBe("Proposez à Apolline de lire avec Léo.");
  });

  it("un texte sans nom revient tel quel", async () => {
    const { pseudonymiserTout } = await import("./confidentialite");
    expect(pseudonymiserTout(["Les fractions au CM1"], eleves).textes).toEqual(["Les fractions au CM1"]);
  });
});
