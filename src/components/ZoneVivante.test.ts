import { describe, it, expect } from "vitest";
import { PAR_TIC, estUneSuite, parTic, parImage } from "./ZoneVivante";

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

describe("la frappe suit les images de l'écran", () => {
  it("écrit deux fois plus à trente images par seconde qu'à soixante", () => {
    // Le minuteur de seize millisecondes n'était respecté que quand le
    // navigateur le voulait : la frappe avançait par à-coups. Le nombre de
    // caractères se déduit maintenant du temps vraiment écoulé.
    const une = parImage(1000, 16);
    const deux = parImage(1000, 32);
    expect(deux).toBe(une * 2);
  });

  it("ne rattrape jamais plus que le retard", () => {
    expect(parImage(3, 100)).toBe(3);
    expect(parImage(0, 100)).toBe(0);
  });

  it("une image très en retard ne fait pas tout apparaître d'un coup", () => {
    // Après un onglet resté en arrière-plan, l'écart peut valoir une seconde :
    // sans plafond, la réunion entière tomberait d'un bloc.
    expect(parImage(5000, 1000)).toBeLessThan(5000);
  });

  it("avance toujours d'au moins un caractère", () => {
    expect(parImage(1, 1)).toBe(1);
  });
});
