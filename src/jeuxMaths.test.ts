import { describe, it, expect } from "vitest";
import { fractionEnLettres, nombreEnLettres } from "./nombresEnLettres";
import {
  additionsArbre, cartesCalcul, cartesFractions, cartesNageurs, cartesNombres, casesOie, decomposition, htmlArbreCalcul, htmlCartesCalcul,
  htmlCartesNombres, htmlFractions, htmlJeuDeLOie, itemsDeLaListe, pisteSvg, REGLAGES_ARBRE, REGLAGES_CALCUL, REGLAGES_FRACTIONS,
  REGLAGES_NOMBRES, REGLAGES_OIE,
} from "./jeuxMaths";
import { corolleSvg, htmlEtiquettes, REGLAGES_ETIQUETTES } from "./etiquettes";

describe("les nombres en lettres", () => {
  it("écrivent comme au tableau", () => {
    const cas: [number, string][] = [
      [0, "zéro"], [1, "un"], [11, "onze"], [16, "seize"], [17, "dix-sept"], [20, "vingt"], [21, "vingt et un"], [34, "trente-quatre"],
      [59, "cinquante-neuf"], [70, "soixante-dix"], [71, "soixante et onze"], [77, "soixante-dix-sept"], [80, "quatre-vingts"],
      [81, "quatre-vingt-un"], [90, "quatre-vingt-dix"], [91, "quatre-vingt-onze"], [99, "quatre-vingt-dix-neuf"],
    ];
    for (const [n, attendu] of cas) expect(nombreEnLettres(n), String(n)).toBe(attendu);
    expect(fractionEnLettres(1, 2)).toBe("un demi");
    expect(fractionEnLettres(3, 4)).toBe("trois quarts");
    expect(fractionEnLettres(2, 3)).toBe("deux tiers");
    expect(fractionEnLettres(5, 10)).toBe("cinq dixièmes");
  });
});

describe("les cartes des nombres", () => {
  it("sortent chaque nombre sous chaque forme qui a un sens", () => {
    const cartes = cartesNombres({ de: 1, a: 12, representations: ["chiffre", "constellation", "boite", "mot", "decomposition"] });
    expect(cartes.filter((c) => c.representation === "chiffre")).toHaveLength(12);
    expect(cartes.filter((c) => c.representation === "constellation")).toHaveLength(12);
    // Pas de constellation au-delà de douze, pas de boîte de dix au-delà de vingt.
    expect(cartesNombres({ de: 13, a: 25, representations: ["constellation", "boite"] }).filter((c) => c.representation === "constellation")).toHaveLength(0);
    expect(cartesNombres({ de: 13, a: 25, representations: ["constellation", "boite"] }).filter((c) => c.representation === "boite")).toHaveLength(8);
    expect(decomposition(14)).toBe("10 + 4");
    expect(decomposition(20)).toBe("20");
    expect(decomposition(7)).toBe("5 + 2");
    expect(decomposition(3)).toBe("3");
    expect(htmlCartesNombres(cartes, REGLAGES_NOMBRES)).toContain("Bataille");
  });
});

describe("les cartes de calcul", () => {
  it("couvrent les tables choisies, et se mélangent à graine égale", () => {
    const cartes = cartesCalcul({ ...REGLAGES_CALCUL, tables: [3, 7], melanger: false }, 1);
    expect(cartes).toHaveLength(20);
    expect(cartes[0]).toEqual({ question: "3 × 1", reponse: 3 });
    expect(cartes[19]).toEqual({ question: "7 × 10", reponse: 70 });
    expect(cartesCalcul({ ...REGLAGES_CALCUL, tables: [4], operation: "-" }, 2).every((c) => c.reponse === 4)).toBe(true);
    expect(cartesCalcul(REGLAGES_CALCUL, 5)).toEqual(cartesCalcul(REGLAGES_CALCUL, 5));
    expect(htmlCartesCalcul(cartes, { ...REGLAGES_CALCUL, rectoVerso: true })).toContain("Verso");
    // Le titre dit ce que sont les nombres choisis : la table, le premier terme, la différence.
    expect(htmlCartesCalcul(cartes, { ...REGLAGES_CALCUL, operation: "x", tables: [3, 7] })).toContain("tables de multiplication de 3, 7");
    expect(htmlCartesCalcul(cartes, { ...REGLAGES_CALCUL, operation: "+", tables: [3] })).toContain("tables d'addition de 3");
    expect(htmlCartesCalcul(cartes, { ...REGLAGES_CALCUL, operation: "-", tables: [4] })).toContain("soustractions dont la différence est 4");
    expect(htmlCartesCalcul(cartes, { ...REGLAGES_CALCUL, rectoVerso: false })).toContain("Corrigé");
  });
});

describe("l'arbre à calcul", () => {
  it("tient ses retenues et reste sous cent", () => {
    const sans = additionsArbre({ ...REGLAGES_ARBRE, combien: 8, retenue: "sans" }, 3);
    expect(sans).toHaveLength(8);
    expect(sans.every(({ a, b }) => a + b < 100 && (a % 10) + (b % 10) < 10 && a >= 10 && b >= 10)).toBe(true);
    const avec = additionsArbre({ ...REGLAGES_ARBRE, combien: 6, retenue: "avec" }, 3);
    expect(avec.every(({ a, b }) => (a % 10) + (b % 10) >= 10)).toBe(true);
    expect(htmlArbreCalcul(sans, { ...REGLAGES_ARBRE, aide: true })).toContain(String(Math.floor(sans[0].a / 10) * 10));
  });
});

describe("les fractions", () => {
  it("font des cartes pour chaque fraction inférieure à un", () => {
    const cartes = cartesFractions({ ...REGLAGES_FRACTIONS, denominateurs: [2, 4], representations: ["chiffres", "bande"] });
    expect(cartes).toHaveLength((1 + 3) * 2);
    expect(cartes.every((c) => c.k < c.n)).toBe(true);
    expect(cartesNageurs(10)).toHaveLength(18);
    expect(cartesNageurs(4)).toHaveLength(6);
    const html = htmlFractions({ ...REGLAGES_FRACTIONS, materiel: ["cartes", "bandes", "regle", "nageurs"], graduation: 10 }, 1);
    for (const mot of ["Jeu de mémoire", "Bandes unités", "dixièmes", "course des nageurs"]) expect(html).toContain(mot);
  });
});

describe("le jeu de l'oie", () => {
  it("numérote la piste, place ses événements loin du départ et de l'arrivée, répartit les lettres", () => {
    const cases = casesOie({ ...REGLAGES_OIE, cases: 30 }, 4);
    expect(cases).toHaveLength(30);
    expect(cases.map((c) => c.texte)).toEqual(cases.map((c) => String(c.n)));
    const evenements = cases.filter((c) => c.evenement);
    expect(evenements.length).toBeGreaterThanOrEqual(4);
    expect(cases[0].evenement).toBeUndefined();
    expect(cases[29].evenement).toBeUndefined();
    const lettres = casesOie({ ...REGLAGES_OIE, cases: 12, contenu: "lettres", items: "a, b c", evenements: false }, 1);
    expect(lettres.map((c) => c.texte).join("")).toBe("abcabcabcabc");
    expect(itemsDeLaListe("cha chi ; cho,chu")).toEqual(["cha", "chi", "cho", "chu"]);
    expect(pisteSvg(cases)).toContain("Arrivée");
    expect(htmlJeuDeLOie({ ...REGLAGES_OIE, de: "1-3" }, 4)).toContain("patron");
    expect(htmlJeuDeLOie({ ...REGLAGES_OIE, de: "aucun" }, 4)).not.toContain("patron");
  });
});

describe("les étiquettes", () => {
  it("sortent en grand pour le tableau et en petit par enveloppe, avec la corolle", () => {
    const mots = [{ id: 1, mot: "courir" }, { id: null, mot: "la course" }, { id: 2, mot: "rapide" }];
    const html = htmlEtiquettes(mots, { 1: "data:c" }, { ...REGLAGES_ETIQUETTES, enveloppes: 3, titreCorolle: "courir" });
    expect((html.match(/Enveloppe \d/g) ?? []).length).toBe(3);
    expect((html.match(/et-petite/g) ?? []).length).toBe(9);
    expect(html).toContain("Corolle lexicale");
    expect(corolleSvg("vite", 6).match(/<ellipse/g)).toHaveLength(6);
  });
});
