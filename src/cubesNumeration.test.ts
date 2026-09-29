import { describe, it, expect } from "vitest";
import { OPTIONS_FEUILLE, appliquerOptionsFeuille } from "./optionsFeuille";
import {
  REGLAGES_CUBES, decomposer, dessinerCubes, ecrireNombre, enChiffres, exercicesCubes, groupementsJusqua, htmlCubes,
  piece, taille, teinte, tirerNombres, type ReglagesCubes,
} from "./cubesNumeration";
import { hasard } from "./hasard";
import { nombreEnLettres } from "./nombresEnLettres";

const reglages = (p: Partial<ReglagesCubes> = {}): ReglagesCubes => ({ ...REGLAGES_CUBES, ...p });

describe("le nombre en cubes", () => {
  it("se décompose en groupements", () => {
    expect(decomposer(2305)).toEqual({ m: 2, c: 3, d: 0, u: 5 });
    expect(decomposer(7)).toEqual({ m: 0, c: 0, d: 0, u: 7 });
    expect(groupementsJusqua(99).map((g) => g.id)).toEqual(["d", "u"]);
    expect(groupementsJusqua(1000).map((g) => g.id)).toEqual(["m", "c", "d", "u"]);
  });

  it("s'écrit de quatre façons", () => {
    expect(ecrireNombre(325, "chiffres")).toBe("325");
    expect(ecrireNombre(2305, "chiffres")).toBe("2 305");
    expect(enChiffres(1000)).toBe("1 000");
    // Les unités de numération, zéros compris : 305 → « 3c 0d 5u », c'est la dizaine vide qui piège.
    expect(ecrireNombre(111, "unites")).toBe("1c 1d 1u");
    expect(ecrireNombre(305, "unites")).toBe("3c 0d 5u");
    expect(ecrireNombre(25, "unites")).toBe("2d 5u");
    expect(ecrireNombre(7, "unites")).toBe("7u");
    expect(ecrireNombre(2040, "unites")).toBe("2m 0c 4d 0u");
    // La décomposition additive ne garde que ce qui compte.
    expect(ecrireNombre(325, "additive")).toBe("300 + 20 + 5");
    expect(ecrireNombre(305, "additive")).toBe("300 + 5");
    expect(ecrireNombre(2040, "additive")).toBe("2 000 + 40");
    expect(ecrireNombre(7, "additive")).toBe("7");
    expect(ecrireNombre(325, "lettres")).toBe("trois cent vingt-cinq");
  });
});

describe("les nombres en lettres au-delà de cent", () => {
  it("suivent l'orthographe d'usage", () => {
    const cas: [number, string][] = [
      [100, "cent"], [101, "cent un"], [200, "deux cents"], [201, "deux cent un"], [325, "trois cent vingt-cinq"],
      [380, "trois cent quatre-vingts"], [471, "quatre cent soixante et onze"], [999, "neuf cent quatre-vingt-dix-neuf"],
      [1000, "mille"], [1001, "mille un"], [1100, "mille cent"], [2000, "deux mille"], [2380, "deux mille trois cent quatre-vingts"],
      [9999, "neuf mille neuf cent quatre-vingt-dix-neuf"],
    ];
    for (const [n, attendu] of cas) expect(nombreEnLettres(n), String(n)).toBe(attendu);
    // Au-delà des milliards, on ne ment pas : le chiffre tel quel.
    expect(nombreEnLettres(10000)).toBe("dix mille");
    expect(nombreEnLettres(1_000_000_000_000)).toBe("1000000000000");
  });
});

describe("le tirage", () => {
  it("donne des nombres différents dans les bornes, autant que demandé", () => {
    const r = reglages({ de: 10, a: 99, nombre: 8 });
    const tires = tirerNombres(r, hasard(3));
    expect(tires).toHaveLength(8);
    expect(new Set(tires).size).toBe(8);
    for (const n of tires) { expect(n).toBeGreaterThanOrEqual(10); expect(n).toBeLessThanOrEqual(99); }
  });

  it("peut écarter les zéros, et se rabat sur tout si rien ne reste", () => {
    const sansZero = tirerNombres(reglages({ de: 100, a: 999, nombre: 12, zeros: false }), hasard(5));
    for (const n of sansZero) expect(String(n)).not.toContain("0");
    // Entre 10 et 10, il n'y a que 10 : on le donne quand même, en double s'il le faut.
    expect(tirerNombres(reglages({ de: 10, a: 10, nombre: 2, zeros: false }), hasard(1))).toEqual([10, 10]);
  });

  it("ne tape jamais de borne à l'envers ni au-delà de douze exercices", () => {
    const tires = tirerNombres(reglages({ de: 999, a: 99, nombre: 40 }), hasard(2));
    expect(tires).toHaveLength(12);
    for (const n of tires) expect(n).toBe(99);
  });

  it("tire l'écriture montrée parmi celles cochées, et retombe sur les chiffres sans choix", () => {
    const exos = exercicesCubes(reglages({ nombre: 12, ecritures: ["unites", "lettres"] }), 9);
    for (const e of exos) expect(["unites", "lettres"]).toContain(e.ecriture);
    for (const e of exercicesCubes(reglages({ ecritures: [] }), 9)) expect(e.ecriture).toBe("chiffres");
    // La même graine redonne la même feuille : l'aperçu est celui qu'on imprime.
    expect(exercicesCubes(reglages(), 42)).toEqual(exercicesCubes(reglages(), 42));
  });
});

describe("le dessin", () => {
  const couleurs = REGLAGES_CUBES.couleurs;

  it("rapetisse avec les nombres, et pose chaque groupement dans sa couleur", () => {
    expect(taille(99)).toBeGreaterThan(taille(999));
    expect(taille(999)).toBeGreaterThan(taille(9999));
    const d = dessinerCubes(325, 1.6, couleurs);
    expect(d.svg).toContain(`fill="${couleurs.c}"`);
    expect(d.svg).toContain(`fill="${couleurs.d}"`);
    expect(d.svg).toContain(`fill="${couleurs.u}"`);
    expect(d.svg).not.toContain(`fill="${couleurs.m}"`);
    // Trois plaques, deux barres, cinq cubes : autant de rectangles pleins.
    expect(d.svg.match(new RegExp(`fill="${couleurs.c}"`, "g"))).toHaveLength(3);
    expect(d.svg.match(new RegExp(`fill="${couleurs.d}"`, "g"))).toHaveLength(2);
    expect(d.svg.match(new RegExp(`fill="${couleurs.u}"`, "g"))).toHaveLength(5);
  });

  it("tient dans une colonne de feuille, même pour le plus grand nombre", () => {
    // Deux colonnes jusqu'à 999 : chaque dessin doit rester sous 80 mm de large.
    expect(dessinerCubes(999, taille(999), couleurs).largeur).toBeLessThan(80);
    expect(dessinerCubes(99, taille(99), couleurs).largeur).toBeLessThan(80);
    // Une colonne au-delà : sous la largeur utile de la page.
    expect(dessinerCubes(9999, taille(9999), couleurs).largeur).toBeLessThan(175);
    expect(dessinerCubes(9999, taille(9999), couleurs).hauteur).toBeLessThan(80);
  });

  it("quadrille les pièces en blanc, ou en gris sur du blanc", () => {
    expect(piece("c", 0, 0, 2, "#2454e6")).toContain("rgba(255,255,255");
    expect(piece("c", 0, 0, 2, "#ffffff")).toContain("#8a8f9c");
    // Le gros cube a trois faces : le dessus plus clair, le côté plus sombre.
    const gros = piece("m", 0, 0, 2, "#e8402f");
    expect(gros).toContain(teinte("#e8402f", "clair"));
    expect(gros).toContain(teinte("#e8402f", "sombre"));
    expect(teinte("#000000", "clair")).toBe("#4d4d4d");
    expect(teinte("#ffffff", "sombre")).toBe("#b3b3b3");
  });
});

describe("la feuille", () => {
  it("écrire : les cubes, puis une ligne de réponse par écriture, et le corrigé à part", () => {
    const r = reglages({ nombre: 4, ecritures: ["chiffres", "unites"], titre: "Les nombres en cubes" });
    const exos = exercicesCubes(r, 1);
    const html = htmlCubes(exos, r, 1);
    expect(html).toContain("Compte les cubes et écris le nombre.");
    expect(html.match(/class="cu-exo"/g)).toHaveLength(4);
    expect(html.match(/En chiffres :/g)).toHaveLength(4);
    expect(html.match(/En unités :/g)).toHaveLength(4);
    // Jusqu'à 99 : des cases d et u seulement.
    expect(html).toContain('<span class="cu-unite">d</span>');
    expect(html).not.toContain('<span class="cu-unite">c</span>');
    expect(html).toContain("cu-legende");
    expect(html).toContain("= 10");
    expect(html).not.toContain("= 100");
    expect(html).toContain("Corrigé");
    expect(html).toContain(ecrireNombre(exos[0].n, "lettres"));
    // Le corrigé est une page marquée : la case « correction » du bandeau la retire d'un geste.
    expect(html).toContain('<div class="page cu-corrige corrige">');
    expect(appliquerOptionsFeuille(html, { ...OPTIONS_FEUILLE, corrige: false })).not.toContain("Corrigé");
    // Sans légende, pas de légende.
    const nue = htmlCubes(exos, reglages({ nombre: 4, legende: false }), 1);
    expect(nue).not.toContain("cu-legende");
  });

  it("dessiner : le nombre écrit et un cadre vide", () => {
    const r = reglages({ exercice: "dessiner", nombre: 3, ecritures: ["unites"] });
    const exos = exercicesCubes(r, 4);
    const html = htmlCubes(exos, r, 4);
    expect(html).toContain("Dessine les cubes qui font ce nombre.");
    expect(html.match(/class="cu-cadre"/g)).toHaveLength(3);
    expect(html).toContain(ecrireNombre(exos[0].n, "unites"));
    // Les numéros d'exercice se retirent : deux nombres dans une case, c'est un de trop.
    expect(html.match(/class="cu-num"/g)).toHaveLength(3);
    expect(htmlCubes(exos, reglages({ exercice: "dessiner", nombre: 3, numeros: false }), 4)).not.toContain("cu-num");
    expect(html).not.toContain("<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"2");
  });

  it("relier : les dessins dans l'ordre, les nombres mélangés, tous présents", () => {
    const r = reglages({ exercice: "relier", nombre: 6 });
    const exos = exercicesCubes(r, 8);
    const html = htmlCubes(exos, r, 8);
    expect(html).toContain("Relie chaque dessin au nombre qu&#39;il représente.");
    const nombres = [...html.matchAll(/cu-relie-nombre">([^<]+)</g)].map((m) => m[1]);
    expect(nombres).toHaveLength(6);
    expect([...nombres].sort()).toEqual(exos.map((e) => enChiffres(e.n)).sort());
    expect(nombres).not.toEqual(exos.map((e) => enChiffres(e.n)));
  });

  it("échappe le titre", () => {
    const r = reglages({ titre: "Cubes <b>&</b> nombres" });
    expect(htmlCubes(exercicesCubes(r, 1), r, 1)).toContain("Cubes &lt;b&gt;&amp;&lt;/b&gt; nombres");
  });
});
