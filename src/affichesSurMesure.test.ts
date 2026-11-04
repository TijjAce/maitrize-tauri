import { describe, expect, it } from "vitest";
import { htmlEtiquettesPrenoms, lirePrenoms, reductionDuPrenom, styleEtiquettesPrenoms } from "./etiquettesPrenoms";
import { GRILLE_DES_SIEGES, PETALES_DE_LA_PEUR, htmlFleur, htmlGrilleSemique, lireGrille, lirePetales, motEtDessin, placesDesPetales } from "./fleurLexicale";
import { elementsDe, htmlMurSyllabes, pagesDuMur, styleMurSyllabes } from "./murSyllabes";
import { SIGNES, htmlRepertoire, traceDuSigne } from "./repertoireGraphique";
import {
  SECTIONS, bandesDuMur, enDizainesEtUnites, htmlFrise, htmlTableauNombres, lignesDuTableau, morceauxDeLaFrise, nombresCaches, reglagesFriseSurs,
  styleFrise,
} from "./tableauNombres";
import { RELATIONS, UNITES_CM, htmlUnites } from "./tableauUnites";

const pages = (html: string) => (html.match(/class="page /g) ?? []).length;

describe("le tableau des nombres (guide CP, p. 110)", () => {
  it("une ligne par dizaine, de 0 à 99 ou de 1 à 100, une page par centaine", () => {
    expect(lignesDuTableau(0, 0)[0]).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(lignesDuTableau(0, 0)[9][9]).toBe(99);
    expect(lignesDuTableau(1, 0)[0]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(lignesDuTableau(1, 0)[9][9]).toBe(100);
    expect(lignesDuTableau(0, 9)[9][9]).toBe(999);
    expect(pages(htmlTableauNombres({ centaines: 10 }))).toBe(10);
    expect(htmlTableauNombres({ depart: 1 })).toContain("de 1 à 100");
  });

  it("cache des nombres au hasard rejouable, jamais le premier ; ou trois lignes entières", () => {
    const lignes = lignesDuTableau(0, 0);
    const quelques = nombresCaches(lignes, "quelques", 4);
    expect(quelques.size).toBe(15);
    expect(quelques.has(0)).toBe(false);
    expect(nombresCaches(lignes, "quelques", 4)).toEqual(quelques);
    expect(nombresCaches(lignes, "moitie", 4).size).toBe(50);
    const parLignes = nombresCaches(lignes, "lignes", 4);
    expect(parLignes.size).toBe(30);
    expect(parLignes.has(5)).toBe(false);
    expect(nombresCaches(lignes, "aucune", 4).size).toBe(0);
    expect((htmlTableauNombres({ caches: "moitie" }).match(/<td(?: class="tn-rond")?><\/td>/g) ?? []).length).toBe(50);
  });
});

describe("la frise numérique (guide CP, p. 37 et 109-110)", () => {
  it("garde les sept sections du guide, et le nom au début de chacune", () => {
    const morceaux = morceauxDeLaFrise(reglagesFriseSurs({}));
    expect(morceaux.map((m) => [m.nombres[0], m.nombres[m.nombres.length - 1], m.nom])).toEqual([
      [1, 19, ""], [20, 29, "vingt"], [30, 39, "trente"], [40, 49, "quarante"], [50, 59, "cinquante"], [60, 79, "soixante"], [80, 100, "quatre-vingts"]]);
    expect(SECTIONS).toHaveLength(7);
    // Jusqu'à 59 au milieu de l'année : cinq sections ; depuis 0, la première commence à 0.
    expect(morceauxDeLaFrise(reglagesFriseSurs({ jusqua: 59 }))).toHaveLength(5);
    expect(morceauxDeLaFrise(reglagesFriseSurs({ depart: 0 }))[0].nombres[0]).toBe(0);
    // Sans les sections : une seule file, en dizaines.
    expect(morceauxDeLaFrise(reglagesFriseSurs({ sections: false, jusqua: 30 })).map((m) => m.nombres.length)).toEqual([10, 10, 10]);
    expect(morceauxDeLaFrise(reglagesFriseSurs({ sections: false, jusqua: 30, depart: 0 })).map((m) => m.nombres.length)).toEqual([10, 10, 10, 1]);
  });

  it("coupe les sections en bandes de onze cases au plus, à mettre bout à bout, sans répéter le nom", () => {
    const bandes = bandesDuMur(morceauxDeLaFrise(reglagesFriseSurs({})));
    for (const b of bandes) expect(b.nombres.length).toBeLessThanOrEqual(11);
    expect(bandes.flatMap((b) => b.nombres)).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));
    const quatreVingts = bandes.filter((b) => b.couleur === 6);
    expect(quatreVingts.map((b) => b.nombres.length)).toEqual([11, 10]);
    expect(quatreVingts.map((b) => b.nom)).toEqual(["quatre-vingts", ""]);
    expect(pages(htmlFrise({}))).toBe(3);
    expect(pages(htmlFrise({ format: "eleve" }))).toBe(1);
    expect(styleFrise({})).toContain("landscape");
    expect(styleFrise({ format: "eleve" })).not.toContain("landscape");
  });

  it("écrit chaque nombre en dizaines et unités", () => {
    expect(enDizainesEtUnites(47)).toBe("4d 7u");
    expect(enDizainesEtUnites(40)).toBe("4d");
    expect(enDizainesEtUnites(7)).toBe("7u");
    expect(enDizainesEtUnites(0)).toBe("0u");
    expect(enDizainesEtUnites(100)).toBe("10d");
    expect(htmlFrise({ unites: true })).toContain("1d 8u");
  });
});

describe("le mur de syllabes (guides CP p. 100, CE1 p. 98)", () => {
  it("croise chaque consonne et chaque voyelle", () => {
    expect(elementsDe("l, r m;ch  l", 10)).toEqual(["l", "r", "m", "ch"]);
    const html = htmlMurSyllabes({ consonnes: "l, ch", voyelles: "a, ou" });
    for (const s of ["la", "lou", "cha", "chou"]) expect(html).toContain(`<span class="ms-script">${s}</span>`);
  });

  it("tient sur une page en script, sur deux avec les deux écritures ; la cursive n'est demandée que si elle s'écrit", () => {
    const consonnes = elementsDe("l, r, m, s, f, ch, v, p, t, b, d, n, j", 30);
    expect(pagesDuMur(consonnes, "script")).toHaveLength(1);
    expect(pagesDuMur(consonnes, "deux")).toHaveLength(2);
    expect(styleMurSyllabes({ ecriture: "script" })).not.toContain("--police-cursive");
    expect(styleMurSyllabes({ ecriture: "cursive" })).toContain("--police-cursive");
    expect(pages(htmlMurSyllabes({ format: "cahier" }))).toBe(1);
  });
});

describe("la fleur lexicale et la grille sémique (guide CP, p. 104)", () => {
  it("lit l'exemple du guide : cinq pétales, la peur au cœur", () => {
    const petales = lirePetales(PETALES_DE_LA_PEUR);
    expect(petales.map((p) => p.nom)).toEqual(["Les verbes", "Les noms", "Les expressions", "Les adjectifs", "Les onomatopées"]);
    expect(petales[1].mots.map((m) => m.mot)).toEqual(["loup", "monstre", "terreur", "sorcière", "frayeur", "nuit"]);
    expect(htmlFleur({})).toContain("la peur");
    expect(motEtDessin("pig=cochon")).toEqual({ mot: "pig", picto: "cochon" });
    expect(motEtDessin("six=-")).toEqual({ mot: "six", picto: "" });
  });

  it("place les pétales dans la page, sans se toucher ni toucher le cœur", () => {
    const coeur = { g: 98.5, d: 164.5, h: 64, b: 106 };
    for (let n = 1; n <= 6; n++) {
      const places = placesDesPetales(n).map((p) => ({ g: p.x - p.l / 2, d: p.x + p.l / 2, h: p.y - p.h / 2, b: p.y + p.h / 2 }));
      for (const p of places) {
        expect(p.g, `${n} pétales`).toBeGreaterThanOrEqual(0);
        expect(p.d, `${n} pétales`).toBeLessThanOrEqual(263);
        expect(p.h, `${n} pétales`).toBeGreaterThanOrEqual(0);
        expect(p.b, `${n} pétales`).toBeLessThanOrEqual(170);
      }
      const touche = (a: typeof coeur, b: typeof coeur) => a.g < b.d && b.g < a.d && a.h < b.b && b.h < a.b;
      for (let i = 0; i < places.length; i++) {
        expect(touche(places[i], coeur), `${n} pétales, le ${i + 1}e et le cœur`).toBe(false);
        for (let j = i + 1; j < places.length; j++) expect(touche(places[i], places[j]), `${n} pétales, ${i + 1} et ${j + 1}`).toBe(false);
      }
    }
  });

  it("croise les mots et leurs traits, avec les croix ou à remplir", () => {
    const { mots, traits } = lireGrille(GRILLE_DES_SIEGES);
    expect(mots.map((m) => m.mot)).toEqual(["chaise", "tabouret", "fauteuil", "canapé"]);
    expect(traits).toEqual(["a des pieds", "a un dossier", "pour une personne", "a des accoudoirs", "pour plusieurs personnes"]);
    expect((htmlGrilleSemique({}).match(/✕/g) ?? []).length).toBe(3 + 2 + 4 + 4);
    expect(htmlGrilleSemique({ croix: false })).not.toContain("✕");
  });
});

describe("le répertoire graphique (programme de maternelle, p. 28)", () => {
  it("trace chaque signe dans sa bande", () => {
    for (const s of SIGNES) {
      const trace = traceDuSigne(s.id);
      expect(trace, s.id).not.toBe("");
      expect(trace, s.id).not.toMatch(/NaN|undefined/);
      const nombres = [...trace.matchAll(/(?:[ML] |c[xy]=")(-?[\d.]+)[ "](-?[\d.]+)?/g)];
      for (const [, x, y] of nombres) {
        expect(Number(x), s.id).toBeGreaterThanOrEqual(0);
        expect(Number(x), s.id).toBeLessThanOrEqual(150);
        if (y !== undefined) {
          expect(Number(y), s.id).toBeGreaterThanOrEqual(0);
          expect(Number(y), s.id).toBeLessThanOrEqual(34);
        }
      }
    }
    expect(pages(htmlRepertoire({ signes: SIGNES.map((s) => s.id) }))).toBe(3);
    expect(htmlRepertoire({ capitales: true })).toContain("LES SPIRALES");
  });
});

describe("les unités de mesure (programmes des cycles 2 et 3)", () => {
  /** Ce que vaut chaque unité dans l'unité de sa grandeur. */
  const VALEUR: Record<string, number> = {
    km: 1000, hm: 100, dam: 10, m: 1, dm: 0.1, cm: 0.01, mm: 0.001,
    t: 1e6, kg: 1000, hg: 100, dag: 10, g: 1, dg: 0.1, cg: 0.01, mg: 0.001,
    hL: 100, daL: 10, L: 1, dL: 0.1, cL: 0.01, mL: 0.001,
  };
  const juste = (relation: string) => {
    const m = relation.replace(/ /g, "").match(/^1 (\w+) = (\d+) (\w+)$/);
    expect(m, relation).not.toBeNull();
    const [, a, n, b] = m!;
    return Math.abs(VALEUR[a] - Number(n) * VALEUR[b]) < 1e-9;
  };

  it("n'écrit que des relations justes, au CE1, au CE2 et au CM", () => {
    for (const niveau of ["CE1", "CE2"] as const) for (const liste of Object.values(RELATIONS[niveau])) for (const r of liste) expect(juste(r), r).toBe(true);
    for (const liste of Object.values(UNITES_CM)) for (const u of liste) if (u.relation) expect(juste(u.relation), u.relation).toBe(true);
    expect(juste("1 t = 1 000 kg".replace("1 t", "1 t"))).toBe(true);
  });

  it("pas de contenances au CE1, qui n'en a pas ; le tableau au CM seulement", () => {
    expect(htmlUnites({ niveau: "CE1" })).not.toContain("Les contenances");
    expect(htmlUnites({ niveau: "CE2" })).not.toContain("tu-table");
    expect(htmlUnites({ niveau: "CM" })).toContain("tu-table");
    expect(htmlUnites({ niveau: "CM" })).toContain("hectogramme");
  });
});

describe("les étiquettes des prénoms (« L'écriture à l'école maternelle »)", () => {
  // Des prénoms inventés pour l'essai.
  const prenoms = lirePrenoms("Zéphyrine\nOthon\n\nAnatole-Barnabé\nOthon");

  it("lit la liste sans doublon, dans l'ordre alphabétique, et écrit chaque prénom dans les écritures choisies", () => {
    expect(prenoms).toEqual(["Anatole-Barnabé", "Othon", "Zéphyrine"]);
    const html = htmlEtiquettesPrenoms(prenoms, {});
    expect(html).toContain("ZÉPHYRINE");
    expect(html).toContain(`<div class="ep-script">Zéphyrine</div>`);
    expect(html).toContain(`<div class="ep-cursive">Zéphyrine</div>`);
    expect(htmlEtiquettesPrenoms(prenoms, { ecritures: ["capitales"] })).not.toContain("ep-script");
    expect(pages(htmlEtiquettesPrenoms(Array.from({ length: 9 }, (_, i) => `Élève ${i + 1}`), {}))).toBe(2);
  });

  it("réduit un long prénom pour qu'il tienne, et ne demande la cursive que si on l'a choisie", () => {
    expect(reductionDuPrenom("Othon", "grandes", false)).toBe(1);
    expect(reductionDuPrenom("Anatole-Barnabé", "grandes", false)).toBeLessThan(1);
    expect(reductionDuPrenom("Anatole-Barnabé", "grandes", true)).toBeLessThan(reductionDuPrenom("Anatole-Barnabé", "grandes", false));
    expect(styleEtiquettesPrenoms({ ecritures: ["capitales", "script"] })).not.toContain("--police-cursive");
    expect(styleEtiquettesPrenoms({})).toContain("--police-cursive");
  });
});
