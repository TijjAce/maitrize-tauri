import { describe, it, expect } from "vitest";
import { OPTIONS_FEUILLE, appliquerOptionsFeuille } from "./optionsFeuille";
import {
  NIVEAUX_CUBES, REGLAGES_CUBES, couleursDe, decomposer, defaire, dessinerCubes, dessinerEnVrac, ecrirePieces, ecrireNombre, ecrireUnites,
  enChiffres, exercicesCubes, facons, groupementsJusqua, htmlAfficheCubes, htmlCubes, niveauCubes, ordreHabituel, ordreMelange, piece,
  reglagesCubesSurs, taille, teinte, tirerNombres, valeurDe, type Groupement, type ReglagesCubes,
} from "./cubesNumeration";
import { hasard } from "./hasard";
import { nombreEnLettres } from "./nombresEnLettres";

const reglages = (p: Partial<ReglagesCubes> = {}): ReglagesCubes => reglagesCubesSurs({ ...REGLAGES_CUBES, ...p });
const compter = (html: string, motif: RegExp) => (html.match(motif) ?? []).length;
const egales = (a: Record<Groupement, number>, b: Record<Groupement, number>) => (["m", "c", "d", "u"] as Groupement[]).every((g) => a[g] === b[g]);

describe("le nombre en cubes", () => {
  it("se décompose en groupements, sans unité plus grande que celle de la classe", () => {
    expect(decomposer(2305)).toEqual({ m: 2, c: 3, d: 0, u: 5 });
    expect(decomposer(7)).toEqual({ m: 0, c: 0, d: 0, u: 7 });
    // Au CP, 100, c'est 10 dizaines ; au CE1, 1 000, c'est 10 centaines.
    expect(decomposer(100, "d")).toEqual({ m: 0, c: 0, d: 10, u: 0 });
    expect(decomposer(1000, "c")).toEqual({ m: 0, c: 10, d: 0, u: 0 });
    expect(groupementsJusqua(99).map((g) => g.id)).toEqual(["d", "u"]);
    expect(groupementsJusqua(1000).map((g) => g.id)).toEqual(["m", "c", "d", "u"]);
  });

  it("se défait : une barre devient dix cubes, le nombre ne change pas", () => {
    const p = defaire(decomposer(34, "d"), "d", 1);
    expect(p).toEqual({ m: 0, c: 0, d: 2, u: 14 });
    expect(valeurDe(p)).toBe(34);
    expect(valeurDe(defaire(decomposer(484), "c", 2))).toBe(484);
    // On ne défait pas ce qu'on n'a pas.
    expect(defaire(decomposer(7), "d", 1)).toEqual(decomposer(7));
  });

  it("s'écrit de quatre façons, en abrégé ou en toutes lettres", () => {
    expect(ecrireNombre(325, "chiffres")).toBe("325");
    expect(ecrireNombre(2305, "chiffres")).toBe("2 305");
    expect(enChiffres(1000)).toBe("1 000");
    // Les unités de numération, zéros compris : 305 → « 3c 0d 5u », c'est la dizaine vide qui piège.
    expect(ecrireNombre(111, "unites")).toBe("1c 1d 1u");
    expect(ecrireNombre(305, "unites")).toBe("3c 0d 5u");
    expect(ecrireNombre(2040, "unites")).toBe("2m 0c 4d 0u");
    expect(ecrireNombre(7, "unites")).toBe("7u");
    // Au CP, en toutes lettres et sans centaine.
    expect(ecrireNombre(34, "unites", { plusGrand: "d", enMots: true })).toBe("3 dizaines 4 unités");
    expect(ecrireNombre(30, "unites", { plusGrand: "d", enMots: true })).toBe("3 dizaines 0 unité");
    expect(ecrireNombre(100, "unites", { plusGrand: "d", enMots: true })).toBe("10 dizaines 0 unité");
    expect(ecrireNombre(11, "unites", { plusGrand: "d", enMots: true })).toBe("1 dizaine 1 unité");
    // La décomposition additive ne garde que ce qui compte.
    expect(ecrireNombre(325, "additive")).toBe("300 + 20 + 5");
    expect(ecrireNombre(2040, "additive")).toBe("2 000 + 40");
    expect(ecrireNombre(100, "additive", { plusGrand: "d" })).toBe("100");
    expect(ecrireNombre(325, "lettres")).toBe("trois cent vingt-cinq");
  });

  it("se dit dans tous les sens : le guide CP, de 5 dizaines 6 unités à 16 unités 4 dizaines", () => {
    const juste = decomposer(56, "d");
    expect(ecrireUnites(juste, ordreHabituel(juste), true)).toBe("5 dizaines 6 unités");
    expect(ecrireUnites(juste, ordreMelange(juste, hasard(1)), true)).toBe("6 unités 5 dizaines");
    const regroupee = defaire(decomposer(56, "d"), "d", 1);
    expect(ecrireUnites(regroupee, ordreHabituel(regroupee), true)).toBe("4 dizaines 16 unités");
    expect(ecrireUnites(regroupee, ordreMelange(regroupee, hasard(1)), true)).toBe("16 unités 4 dizaines");
    // Dans le désordre, jamais dans l'ordre habituel, et sans les zéros.
    for (let g = 1; g < 30; g++) expect(ordreMelange(decomposer(305), hasard(g))).toEqual(["u", "c"]);
    expect(ecrirePieces(regroupee)).toBe("4 barres et 16 cubes");
    expect(ecrirePieces(decomposer(635))).toBe("6 plaques, 3 barres et 5 cubes");
    expect(ecrirePieces(decomposer(1001))).toBe("1 gros cube et 1 cube");
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

describe("les niveaux : la progression du programme", () => {
  it("vont du CP, jusqu'à 19 puis 100, au CE2, jusqu'à 10 000, chacun avec sa plus grande unité", () => {
    expect(NIVEAUX_CUBES.map((n) => `${n.classe} ${n.max}`)).toEqual(["CP 19", "CP 30", "CP 59", "CP 100", "CE1 1000", "CE2 9999"]);
    expect(NIVEAUX_CUBES.filter((n) => n.classe === "CP").every((n) => n.plusGrand === "d" && n.enMots)).toBe(true);
    expect(niveauCubes("ce1").plusGrand).toBe("c");
    expect(niveauCubes("ce2").plusGrand).toBe("m");
    // Une seule couleur au début du CP, comme les cubes emboîtables.
    expect(NIVEAUX_CUBES.filter((n) => n.memeCouleur).map((n) => n.id)).toEqual(["cp-19", "cp-30"]);
  });

  it("reprennent les anciens réglages par bornes, tant qu'on n'a pas choisi de niveau", () => {
    expect(reglagesCubesSurs({ ...REGLAGES_CUBES, de: 1, a: 19 }).niveau).toBe("cp-19");
    expect(reglagesCubesSurs({ ...REGLAGES_CUBES, de: 10, a: 99 }).niveau).toBe("cp-100");
    expect(reglagesCubesSurs({ ...REGLAGES_CUBES, de: 100, a: 999 }).niveau).toBe("ce1");
    expect(reglagesCubesSurs({ ...REGLAGES_CUBES, de: 1000, a: 9999 }).niveau).toBe("ce2");
    expect(reglagesCubesSurs({ ...REGLAGES_CUBES, niveau: "cp-59" }).niveau).toBe("cp-59");
    expect(reglagesCubesSurs({ ...REGLAGES_CUBES, niveau: "inconnu" as never }).niveau).toBe(REGLAGES_CUBES.niveau);
    // Grouper en vrac, c'est au CP : au CE1, on revient à écrire.
    expect(reglagesCubesSurs({ ...REGLAGES_CUBES, niveau: "ce1", exercice: "grouper" }).exercice).toBe("ecrire");
    expect(reglagesCubesSurs({ ...REGLAGES_CUBES, nombre: 40 }).nombre).toBe(12);
  });
});

describe("le tirage", () => {
  it("donne des nombres différents du niveau, autant que demandé", () => {
    for (const niv of NIVEAUX_CUBES) {
      const tires = tirerNombres(reglages({ niveau: niv.id, nombre: 8 }), hasard(3));
      expect(tires, niv.id).toHaveLength(8);
      expect(new Set(tires).size, niv.id).toBe(8);
      for (const n of tires) expect(n >= niv.min && n <= niv.max, `${niv.id} ${n}`).toBe(true);
    }
  });

  it("garde peu de nombres sans barre, et aucun quand il faut grouper", () => {
    for (let g = 1; g < 20; g++) {
      const tires = tirerNombres(reglages({ niveau: "cp-19", nombre: 9 }), hasard(g));
      expect(tires.filter((n) => n < 10).length).toBeLessThanOrEqual(3);
      expect(tirerNombres(reglages({ niveau: "cp-19", nombre: 9, exercice: "grouper" }), hasard(g)).every((n) => n >= 10)).toBe(true);
      expect(tirerNombres(reglages({ niveau: "cp-19", nombre: 6, exercice: "facons" }), hasard(g)).every((n) => n >= 10)).toBe(true);
    }
  });

  it("peut écarter les zéros", () => {
    for (const n of tirerNombres(reglages({ niveau: "ce1", nombre: 12, zeros: false }), hasard(5))) expect(String(n)).not.toContain("0");
  });

  it("montre un tiers de collections à regrouper, toujours du bon nombre", () => {
    for (const niveau of ["cp-59", "cp-100", "ce1", "ce2"] as const) {
      const exos = exercicesCubes(reglages({ niveau, nombre: 9, aRegrouper: true }), 7);
      const niv = niveauCubes(niveau);
      const regroupees = exos.filter((e) => !egales(e.parts, decomposer(e.n, niv.plusGrand)));
      expect(regroupees.length, niveau).toBe(3);
      for (const e of exos) expect(valeurDe(e.parts), `${niveau} ${e.n}`).toBe(e.n);
      // Plus de dix cubes, ou plus de dix barres : jamais un gros cube défait en plaques, trop grand à dessiner.
      for (const e of regroupees) expect(e.parts.u >= 10 || e.parts.d >= 10, `${niveau} ${e.n}`).toBe(true);
    }
    // Sans la case, tout est au plus juste ; avec une part de 1, tout est à regrouper.
    expect(exercicesCubes(reglages({ nombre: 6, aRegrouper: false }), 7).every((e) => egales(e.parts, decomposer(e.n, "d")))).toBe(true);
    expect(exercicesCubes(reglages({ nombre: 6, aRegrouper: true }), 7, 1).every((e) => !egales(e.parts, decomposer(e.n, "d")))).toBe(true);
  });

  it("sème les cubes à grouper, avec parfois quelques barres déjà faites", () => {
    const exos = exercicesCubes(reglages({ niveau: "cp-59", exercice: "grouper", nombre: 9 }), 4);
    for (const e of exos) {
      expect(e.enVrac).toBe(true);
      expect(valeurDe(e.parts)).toBe(e.n);
      expect(e.parts.u).toBeGreaterThanOrEqual(10);
    }
    expect(exos.some((e) => e.parts.d > 0)).toBe(true);
  });

  it("écrit les unités de numération à regrouper, ou dans le désordre, sans changer le nombre", () => {
    const exos = exercicesCubes(reglages({ niveau: "ce1", exercice: "dessiner", ecritures: ["unites"], nombre: 12, aRegrouper: true, desordre: true }), 11);
    for (const e of exos) expect(valeurDe(e.unites.parts)).toBe(e.n);
    expect(exos.some((e) => (["c", "d", "u"] as Groupement[]).some((g) => e.unites.parts[g] >= 10))).toBe(true);
    expect(exos.some((e) => e.unites.ordre[e.unites.ordre.length - 1] !== "u")).toBe(true);
    // La même graine redonne la même feuille : l'aperçu est celui qu'on imprime.
    expect(exercicesCubes(reglages(), 42)).toEqual(exercicesCubes(reglages(), 42));
    for (const e of exercicesCubes(reglages({ ecritures: [] }), 9)) expect(e.ecriture).toBe("chiffres");
  });

  it("fait un nombre de plusieurs façons, toutes différentes et justes", () => {
    expect(facons(34, niveauCubes("cp-59"), 4).map(ecrirePieces)).toEqual(["3 barres et 4 cubes", "2 barres et 14 cubes", "1 barre et 24 cubes", "34 cubes"]);
    const ce1 = facons(235, niveauCubes("ce1"), 4);
    expect(ce1).toHaveLength(4);
    expect(new Set(ce1.map(ecrirePieces)).size).toBe(4);
    for (const p of ce1) expect(valeurDe(p)).toBe(235);
    expect(ecrirePieces(ce1[0])).toBe("2 plaques, 3 barres et 5 cubes");
  });
});

describe("le dessin", () => {
  const couleurs = REGLAGES_CUBES.couleurs;

  it("rapetisse avec les nombres, et pose chaque groupement dans sa couleur", () => {
    expect(taille(99)).toBeGreaterThan(taille(999));
    expect(taille(999)).toBeGreaterThan(taille(9999));
    const d = dessinerCubes(325, 1.6, couleurs);
    // Trois plaques, deux barres, cinq cubes : autant de rectangles pleins.
    expect(compter(d.svg, new RegExp(`fill="${couleurs.c}"`, "g"))).toBe(3);
    expect(compter(d.svg, new RegExp(`fill="${couleurs.d}"`, "g"))).toBe(2);
    expect(compter(d.svg, new RegExp(`fill="${couleurs.u}"`, "g"))).toBe(5);
    expect(d.svg).not.toContain(`fill="${couleurs.m}"`);
    // Une seule couleur, comme les cubes emboîtables : tout est jaune.
    const meme = dessinerCubes(34, 2, couleursDe({ couleurs, memeCouleur: true }), "d");
    expect(compter(meme.svg, new RegExp(`fill="${couleurs.u}"`, "g"))).toBe(7);
    expect(meme.svg).not.toContain(`fill="${couleurs.d}"`);
  });

  it("range les cubes isolés par cinq : 8, c'est une rangée de cinq et une de trois", () => {
    const d = dessinerCubes(8, 2, couleurs);
    const ys = new Set([...d.svg.matchAll(/<rect x="[\d.]+" y="([\d.]+)"/g)].map((m) => m[1]));
    expect(ys.size).toBe(2);
    expect(compter(d.svg, /<rect /g)).toBe(8);
  });

  it("tient dans une colonne de feuille, même pour le plus grand nombre", () => {
    expect(dessinerCubes(999, taille(999), couleurs).largeur).toBeLessThan(80);
    expect(dessinerCubes(99, taille(99), couleurs).largeur).toBeLessThan(80);
    expect(dessinerCubes(100, taille(100), couleurs, "d").largeur).toBeLessThan(80);
    expect(dessinerCubes(9999, taille(9999), couleurs).largeur).toBeLessThan(175);
    expect(dessinerCubes(9999, taille(9999), couleurs).hauteur).toBeLessThan(80);
  });

  it("sème les cubes en vrac sans qu'ils se touchent, dans un champ qui tient dans sa case", () => {
    const d = dessinerEnVrac({ m: 0, c: 0, d: 2, u: 37 }, 2.4, couleurs, 5, "57 cubes");
    expect(compter(d.svg, new RegExp(`fill="${couleurs.u}"`, "g"))).toBe(37);
    expect(compter(d.svg, new RegExp(`fill="${couleurs.d}"`, "g"))).toBe(2);
    const cubes = [...d.svg.matchAll(new RegExp(`<rect x="([\\d.]+)" y="([\\d.]+)" width="2.4" height="2.4" fill="${couleurs.u}"`, "g"))].map((m) => [Number(m[1]), Number(m[2])]);
    expect(cubes).toHaveLength(37);
    for (let i = 0; i < cubes.length; i++) for (let j = i + 1; j < cubes.length; j++) {
      expect(Math.abs(cubes[i][0] - cubes[j][0]) >= 2.4 || Math.abs(cubes[i][1] - cubes[j][1]) >= 2.4, `${i} ${j}`).toBe(true);
    }
    expect(dessinerEnVrac({ m: 0, c: 0, d: 0, u: 100 }, 2.4, couleurs, 1, "100").largeur).toBeLessThan(85);
  });

  it("quadrille les pièces en blanc, ou en gris sur du blanc", () => {
    expect(piece("c", 0, 0, 2, "#2454e6")).toContain("rgba(255,255,255");
    expect(piece("c", 0, 0, 2, "#ffffff")).toContain("#8a8f9c");
    const gros = piece("m", 0, 0, 2, "#e8402f");
    expect(gros).toContain(teinte("#e8402f", "clair"));
    expect(gros).toContain(teinte("#e8402f", "sombre"));
    expect(teinte("#000000", "clair")).toBe("#4d4d4d");
    expect(teinte("#ffffff", "sombre")).toBe("#b3b3b3");
  });
});

describe("la feuille", () => {
  it("écrire : les cubes, une ligne de réponse par écriture, le corrigé à part", () => {
    const r = reglages({ niveau: "cp-100", nombre: 6, ecritures: ["chiffres", "unites"], aRegrouper: true });
    const exos = exercicesCubes(r, 1);
    const html = htmlCubes(exos, r, 1);
    expect(html).toContain("Trouve le nombre que représente chaque dessin, et écris-le.");
    expect(compter(html, /class="cu-exo"/g)).toBe(6);
    expect(compter(html, /En chiffres :/g)).toBe(6);
    // Au CP, les cases des unités de numération se nomment en toutes lettres, sans centaine.
    expect(html).toContain('<span class="cu-unite">dizaines</span>');
    expect(html).not.toContain('<span class="cu-unite">centaines</span>');
    expect(html).toContain("= 10");
    expect(html).not.toContain("= 100");
    // Le corrigé dit ce que montrait le dessin à regrouper.
    expect(html).toMatch(/— le dessin : \d+ barres? et 1\d cubes/);
    expect(html).toContain('<div class="page cu-corrige corrige">');
    expect(appliquerOptionsFeuille(html, { ...OPTIONS_FEUILLE, corrige: false })).not.toContain("Corrigé");
    expect(htmlCubes(exos, reglages({ nombre: 6, legende: false }), 1)).not.toContain("cu-legende");
  });

  it("grouper : la consigne du guide, les cubes semés", () => {
    const r = reglages({ niveau: "cp-59", exercice: "grouper", nombre: 4 });
    const html = htmlCubes(exercicesCubes(r, 2), r, 2);
    expect(html).toContain("Entoure des paquets de dix cubes, puis écris le nombre.");
    expect(html).toContain("cubes à grouper");
  });

  it("dessiner : l'écriture montrée et un cadre vide ; relier : toutes les écritures, mélangées", () => {
    const r = reglages({ niveau: "cp-59", exercice: "dessiner", nombre: 3, ecritures: ["unites"] });
    const exos = exercicesCubes(r, 4);
    const html = htmlCubes(exos, r, 4);
    expect(html).toContain("Dessine les cubes qui font ce nombre.");
    expect(compter(html, /class="cu-cadre"/g)).toBe(3);
    expect(html).toMatch(/dizaines? \d+ unités?|unités? \d+ dizaines?/);
    expect(htmlCubes(exos, reglages({ niveau: "cp-59", exercice: "dessiner", nombre: 3, numeros: false }), 4)).not.toContain("cu-num");
    const rr = reglages({ exercice: "relier", nombre: 6 });
    const ex = exercicesCubes(rr, 8);
    const relier = htmlCubes(ex, rr, 8);
    const nombres = [...relier.matchAll(/cu-relie-nombre">([^<]+)</g)].map((m) => m[1]);
    expect(nombres).toHaveLength(6);
    expect([...nombres].sort()).toEqual(ex.map((e) => enChiffres(e.n)).sort());
    expect(nombres).not.toEqual(ex.map((e) => enChiffres(e.n)));
  });

  it("plusieurs façons : un tableau par nombre, trois lignes au CP, quatre au CE1", () => {
    const cp = reglages({ niveau: "cp-59", exercice: "facons", nombre: 4 });
    const html = htmlCubes(exercicesCubes(cp, 3), cp, 3);
    expect(html).toContain("Fais chaque nombre de plusieurs façons, avec des barres et des cubes : écris combien il en faut.");
    expect(compter(html, /<table class="cu-facons">/g)).toBe(4);
    expect(compter(html, /<tr><td><\/td><td><\/td><\/tr>/g)).toBe(12);
    expect(html).toContain("— par exemple :");
    const ce1 = reglages({ niveau: "ce1", exercice: "facons", nombre: 2 });
    const h1 = htmlCubes(exercicesCubes(ce1, 3), ce1, 3);
    expect(h1).toContain("avec des plaques, des barres et des cubes");
    expect(compter(h1, /<tr><td><\/td><td><\/td><td><\/td><\/tr>/g)).toBe(8);
  });

  it("met « Ce qu'on retient » en haut quand on le demande, et fait l'affiche de la classe", () => {
    const r = reglages({ niveau: "cp-59", retenir: true });
    const html = htmlCubes(exercicesCubes(r, 1), r, 1);
    expect(html).toContain("<b>Ce qu'on retient</b>");
    expect(html).toContain("34, c&#39;est 3 dizaines 4 unités : 3 barres et 4 cubes.");
    const affiche = htmlAfficheCubes(reglages({ niveau: "ce1" }));
    expect(affiche).toContain("1 centaine = 10 dizaines = 100 unités.");
    expect(affiche).toContain("6 centaines 3 dizaines 5 unités");
    expect(affiche).toContain("6 centaines 2 dizaines 15 unités");
    expect(affiche).toContain("six cent trente-cinq");
  });

  it("échappe le titre", () => {
    const r = reglages({ titre: "Cubes <b>&</b> nombres" });
    expect(htmlCubes(exercicesCubes(r, 1), r, 1)).toContain("Cubes &lt;b&gt;&amp;&lt;/b&gt; nombres");
  });
});

describe("les exemples", () => {
  it("restent dans les nombres du niveau", () => {
    const r = (niveau: ReglagesCubes["niveau"]) => reglagesCubesSurs({ ...REGLAGES_CUBES, niveau, retenir: true });
    expect(htmlCubes(exercicesCubes(r("cp-19"), 1), r("cp-19"), 1)).toContain("14, c&#39;est 1 dizaine 4 unités : 1 barre et 4 cubes.");
    expect(htmlCubes(exercicesCubes(r("cp-30"), 1), r("cp-30"), 1)).toContain("24, c&#39;est 2 dizaines 4 unités : 2 barres et 4 cubes.");
  });
});
