import { describe, it, expect } from "vitest";
import { PAR_TIC, estUneSuite, parTic, prefixeCommun, prochainAffichage } from "./ZoneVivante";

describe("ce qui n'a pas à être retapé", () => {
  it("trouve le début commun à deux textes", () => {
    expect(prefixeCommun("Bonjour", "Bonjour à tous")).toBe(7);
    expect(prefixeCommun("", "Bonjour")).toBe(0);
    expect(prefixeCommun("Décisions", "Décisions")).toBe(9);
    expect(prefixeCommun("Alpha", "Bravo")).toBe(0);
  });
});

describe("la cadence de la frappe", () => {
  it("écrit tranquillement quand elle suit", () => {
    expect(parTic(10)).toBe(PAR_TIC);
    expect(parTic(0)).toBe(0);
  });

  it("accélère à mesure que le retard grandit", () => {
    // Une page entière de retard ne doit pas prendre une minute à rattraper.
    expect(parTic(1000)).toBeGreaterThan(parTic(200));
    expect(parTic(4000)).toBeGreaterThan(parTic(1000));
  });

  it("ne dépasse jamais ce qu'il reste à écrire", () => {
    expect(parTic(2)).toBe(2);
  });
});

describe("le texte qui s'écrit", () => {
  it("avance lettre après lettre vers la cible", () => {
    let affiche = "";
    const cible = "Bonjour à tous";
    for (let i = 0; i < 100 && affiche !== cible; i++) affiche = prochainAffichage(affiche, cible);
    expect(affiche).toBe(cible);
  });

  it("n'écrit pas tout d'un coup", () => {
    const un = prochainAffichage("", "Bonjour à tous, on commence la réunion.");
    expect(un.length).toBeLessThan(10);
    expect("Bonjour à tous, on commence la réunion.".startsWith(un)).toBe(true);
  });

  it("garde le début commun quand l'agent réagence la suite", () => {
    // Seule la fin change : le début ne doit pas clignoter.
    const affiche = "## Points abordés\n- La cantine.\n\nOn accepte l'essai.";
    const cible = "## Points abordés\n- La cantine.\n\n## Décisions\n- Essai accepté.";
    const suite = prochainAffichage(affiche, cible);
    expect(suite.startsWith("## Points abordés\n- La cantine.\n\n")).toBe(true);
    expect(suite.length).toBeLessThan(cible.length);
  });

  it("une cible atteinte ne bouge plus", () => {
    expect(prochainAffichage("Bonjour", "Bonjour")).toBe("Bonjour");
  });

  it("un texte raccourci se ramène d'un coup, sans réécrire à l'envers", () => {
    expect(prochainAffichage("Bonjour à tous", "Bonjour")).toBe("Bonjour");
  });
});

describe("ce qui s'écrit et ce qui se range", () => {
  it("la parole qui arrive est une suite : elle s'écrit", () => {
    expect(estUneSuite("Bonjour", "Bonjour à tous")).toBe(true);
    expect(estUneSuite("", "Bonjour")).toBe(true);
  });

  it("un document réagencé n'est pas une suite : il se pose d'un coup", () => {
    const avant = "## Points abordés\n- La cantine.\n\nOn accepte l'essai.";
    const apres = "## Points abordés\n- La cantine.\n\n## Décisions\n- Essai accepté.";
    expect(estUneSuite(avant, apres)).toBe(false);
  });

  it("un texte raccourci n'est pas une suite non plus", () => {
    expect(estUneSuite("Bonjour à tous", "Bonjour")).toBe(false);
  });
});
