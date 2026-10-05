import { describe, it, expect } from "vitest";
import {
  BRANCHES_MAX, CENTRE_DEFAUT, HAUTEUR, IDEES_MAX, LARGEUR, MIN_BRANCHE, REGLAGES_CARTE, TAILLES, aDesCadres, blocsDeLaCarte, blocsDesBranches,
  branchesPleines, cadreSur, cequiManque, deplacer, htmlCarteMentale, idsDesImages, redimensionner, reglagesSurs, tailleDesIdees, tailleSuivante,
  tailleSure, trait, type ReglagesCarte,
} from "./carteMentale";

const compter = (html: string, motif: RegExp) => (html.match(motif) ?? []).length;
const branche = (titre: string, idees: string[], id: number | null = null) =>
  ({ titre, image: { id, mot: titre }, couleur: "#1971c2", idees: idees.map((mot, i) => ({ id: 100 + i, mot })) });
const SENS: ReglagesCarte = reglagesSurs({
  centre: "Les cinq sens", image: { id: 7, mot: "sens" },
  branches: [branche("La vue", ["les yeux", "regarder"], 1), branche("L'ouïe", ["les oreilles", "écouter"]), branche("L'odorat", ["le nez", "sentir"]),
    branche("Le goût", ["la bouche", "goûter"]), branche("Le toucher", ["les mains", "toucher"])],
});

describe("la carte mentale", () => {
  it("se répare : deux branches au moins, des couleurs valides, douze idées au plus", () => {
    const r = reglagesSurs({ branches: [{ titre: "A", image: { id: null, mot: "" }, couleur: "rouge", idees: Array.from({ length: 20 }, (_, i) => ({ id: i, mot: `m${i}` })) }] });
    expect(r.branches).toHaveLength(2);
    expect(r.branches[0].couleur).toMatch(/^#[0-9a-f]{6}$/i);
    expect(r.branches[0].idees).toHaveLength(IDEES_MAX);
    expect(reglagesSurs({}).branches).toHaveLength(REGLAGES_CARTE.branches.length);
  });

  it("dit ce qui manque : le thème, deux branches", () => {
    expect(cequiManque(reglagesSurs({}))).toMatch(/thème/);
    expect(cequiManque(reglagesSurs({ centre: "Les saisons" }))).toMatch(/deux branches/);
    expect(cequiManque(SENS)).toBeNull();
    expect(branchesPleines(SENS)).toHaveLength(5);
  });

  it("place les branches en deux colonnes, dans la page, sans qu'elles se touchent ni touchent le centre", () => {
    for (let n = 2; n <= BRANCHES_MAX; n++) {
      const blocs = blocsDesBranches(n);
      expect(blocs).toHaveLength(n);
      expect(blocs.filter((b) => b.cote === "droite")).toHaveLength(Math.ceil(n / 2));
      for (const b of blocs) {
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.y).toBeGreaterThanOrEqual(0);
        expect(b.x + b.largeur).toBeLessThanOrEqual(LARGEUR);
        expect(b.y + b.hauteur).toBeLessThanOrEqual(HAUTEUR + 0.01);
        // Le centre occupe le milieu : 70 mm de large.
        expect(b.cote === "droite" ? b.x >= LARGEUR / 2 + 35 : b.x + b.largeur <= LARGEUR / 2 - 35).toBe(true);
      }
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const [a, c] = [blocs[i], blocs[j]];
        const separes = a.x + a.largeur <= c.x || c.x + c.largeur <= a.x || a.y + a.hauteur <= c.y || c.y + c.hauteur <= a.y;
        expect(separes, `${n} branches : ${i} et ${j}`).toBe(true);
      }
    }
  });

  it("relie chaque branche au centre par un trait courbe, du bord du centre au milieu de la branche", () => {
    const [b] = blocsDesBranches(4);
    const d = trait(b, 0, 2);
    const [x0] = d.slice(1).split(" C")[0].split(" ").map(Number);
    const fin = d.split(" ").slice(-2).map(Number);
    expect(Math.abs(x0 - LARGEUR / 2)).toBeLessThan(35);
    expect(fin).toEqual([b.x, Number((b.y + b.hauteur / 2).toFixed(1))]);
    expect(d).toMatch(/^M[\d.]+ [\d.]+ C/);
  });

  it("écrit les idées plus petites quand elles sont nombreuses", () => {
    expect(tailleDesIdees(2, 60)).toBe("grande");
    expect(tailleDesIdees(6, 60)).toBe("moyenne");
    expect(tailleDesIdees(12, 60)).toBe("petite");
  });

  it("s'imprime : le centre, une branche et un trait par branche, les idées avec leurs pictos — ou sans", () => {
    const images: Record<number, string> = { 1: "data:vue", 7: "data:sens", 100: "data:yeux", 101: "data:regarder" };
    const html = htmlCarteMentale(SENS, images);
    expect(compter(html, /class="cm-branche"/g)).toBe(5);
    expect(compter(html, /<path /g)).toBe(5);
    expect(compter(html, /class="cm-idee"/g)).toBe(10);
    expect(html).toContain('src="data:yeux"');
    expect(html).toContain("Les cinq sens");
    expect(html).toContain("ARASAAC");
    const sansPictos = htmlCarteMentale({ ...SENS, pictos: false, image: { id: null, mot: "" }, branches: SENS.branches.map((b) => ({ ...b, image: { id: null, mot: "" } })) }, images);
    expect(sansPictos).not.toContain("<img");
    expect(sansPictos).not.toContain("ARASAAC");
    expect(htmlCarteMentale({ ...SENS, capitales: true }, images)).toContain("cm-capitales");
    expect(idsDesImages(SENS)).toEqual(expect.arrayContaining([7, 1, 100, 101]));
    expect(idsDesImages({ ...SENS, pictos: false })).not.toContain(100);
  });

  it("montre chaque idée comme on l'a voulue : l'image seule, le mot seul, ou les deux", () => {
    const ponctuation = reglagesSurs({
      centre: "La phrase",
      branches: [
        { ...branche("La ponctuation", []), idees: [{ id: 100, mot: "?", seul: "image" }, { id: 101, mot: ".", seul: "mot" }, { id: 102, mot: "!" }, { id: 103, mot: "virgule", seul: "image" }] },
        branche("Les mots", ["le nom"]),
      ],
    });
    // Le réglage se garde, et un réglage inconnu s'oublie.
    expect(ponctuation.branches[0].idees.map((m) => m.seul)).toEqual(["image", "mot", undefined, "image"]);
    expect(reglagesSurs({ branches: [{ ...branche("A", []), idees: [{ id: 1, mot: "x", seul: "rien" as never }] }] }).branches[0].idees[0]).toEqual({ id: 1, mot: "x" });
    const images: Record<number, string> = { 100: "data:question", 101: "data:point", 102: "data:exclamation" };
    const html = htmlCarteMentale(ponctuation, images);
    // L'image seule, avec son mot pour qui ne voit pas l'image.
    expect(html).toContain('<span class="cm-idee cm-image-seule" data-j="0"><img src="data:question" alt="?" data-cm-image="idee"></span>');
    // Le mot seul : son image ne se charge même pas.
    expect(html).toContain('<span class="cm-idee" data-j="1">.</span>');
    expect(idsDesImages(ponctuation)).not.toContain(101);
    expect(html).toContain('<span class="cm-idee" data-j="2"><img src="data:exclamation" alt="" data-cm-image="idee">!</span>');
    // Sans image à montrer, le mot reste : l'idée ne disparaît pas.
    expect(html).toContain('<span class="cm-idee" data-j="3">virgule</span>');
  });

  it("change la taille d'un texte pas à pas, de la moitié au triple", () => {
    expect(tailleSuivante(undefined, 1)).toBe(1.15);
    expect(tailleSuivante(1, -1)).toBe(0.9);
    expect(tailleSuivante(1.2, 1)).toBe(1.3);
    expect(tailleSuivante(3, 1)).toBe(3);
    expect(tailleSuivante(0.5, -1)).toBe(0.5);
    expect(tailleSure(1)).toBeUndefined();
    expect(tailleSure(12)).toBe(TAILLES[TAILLES.length - 1]);
    expect(tailleSure("2")).toBeUndefined();
  });

  it("déplace et agrandit un cadre sans qu'il sorte de la carte ni devienne trop petit", () => {
    const c = { x: 10, y: 10, largeur: 60, hauteur: 40 };
    expect(deplacer(c, 500, -50)).toEqual({ x: LARGEUR - 60, y: 0, largeur: 60, hauteur: 40 });
    // Tiré par le coin bas droit : le coin haut gauche reste.
    expect(redimensionner(c, "se", 20, 15)).toEqual({ x: 10, y: 10, largeur: 80, hauteur: 55 });
    // Tiré vers la gauche par son côté ouest : le côté est reste.
    expect(redimensionner(c, "o", -5, 0)).toEqual({ x: 5, y: 10, largeur: 65, hauteur: 40 });
    // Jamais plus petit que le minimum, et le côté opposé ne bouge toujours pas.
    const petit = redimensionner(c, "no", 100, 100);
    expect(petit).toEqual({ x: 70 - MIN_BRANCHE.largeur, y: 50 - MIN_BRANCHE.hauteur, ...MIN_BRANCHE });
    expect(redimensionner(c, "e", 1000, 0).largeur).toBe(LARGEUR - 10);
    expect(cadreSur({ x: -5, y: 300, largeur: 2, hauteur: 30 })).toEqual({ x: 0, y: HAUTEUR - 30, largeur: MIN_BRANCHE.largeur, hauteur: 30 });
    expect(cadreSur({ x: 1, y: 2, largeur: "grand" })).toBeUndefined();
  });

  it("garde les cadres et les tailles qu'on a changés, et oublie ceux qui sont abîmés", () => {
    const r = reglagesSurs({
      ...SENS, cadreCentre: { x: 100, y: 50, largeur: 50, hauteur: 30 }, tailleCentre: 1.5,
      branches: [{ ...SENS.branches[0], cadre: { x: 150, y: 5, largeur: 100, hauteur: 60 }, tailleIdees: 2, tailleTitre: 1 },
        { ...SENS.branches[1], cadre: { x: "?" } as never, tailleIdees: Number.NaN }],
    });
    expect(r.cadreCentre).toEqual({ x: 100, y: 50, largeur: 50, hauteur: 30 });
    expect(r.tailleCentre).toBe(1.5);
    expect(r.branches[0].cadre).toEqual({ x: 150, y: 5, largeur: 100, hauteur: 60 });
    expect(r.branches[0].tailleIdees).toBe(2);
    expect("tailleTitre" in r.branches[0]).toBe(false);
    expect("cadre" in r.branches[1]).toBe(false);
    expect(aDesCadres(r)).toBe(true);
    expect(aDesCadres(SENS)).toBe(false);
  });

  it("place une branche déplacée là où on l'a mise, sans bouger les autres, et la relie par son côté", () => {
    const deplacee = { ...SENS, branches: SENS.branches.map((b, i) => (i === 0 ? { ...b, cadre: { x: 10, y: 10, largeur: 60, hauteur: 30 } } : b)) };
    const avant = blocsDeLaCarte(SENS), apres = blocsDeLaCarte(deplacee);
    expect(apres[0].bloc).toEqual({ x: 10, y: 10, largeur: 60, hauteur: 30, cote: "gauche" });
    expect(apres.slice(1).map((p) => p.bloc)).toEqual(avant.slice(1).map((p) => p.bloc));
    // Le trait part du côté gauche du centre.
    const d = trait(apres[0].bloc, 0, 1, CENTRE_DEFAUT);
    expect(Number(d.slice(1).split(" ")[0])).toBeLessThan(LARGEUR / 2);
  });

  it("repère chaque élément de la feuille, et porte les tailles choisies", () => {
    const r = reglagesSurs({
      ...SENS, tailleCentre: 1.3, cadreCentre: { x: 90, y: 60, largeur: 80, hauteur: 40 },
      // Une branche vide d'abord : les repères gardent le rang dans les réglages.
      branches: [{ titre: "", image: { id: null, mot: "" }, couleur: "#1971c2", idees: [] }, ...SENS.branches.map((b, i) => (i === 0 ? { ...b, tailleTitre: 2, tailleIdees: 1.5 } : b))],
    });
    const html = htmlCarteMentale(r, { 1: "data:vue", 100: "data:yeux" });
    expect(html).toContain('class="cm-centre" data-cm="centre" style="left:90.0mm;top:60.0mm;width:80.0mm;height:40.0mm;--k:1.3"');
    expect(html).toContain('data-cm-texte="centre">Les cinq sens<');
    expect(html).toMatch(/class="cm-branche" data-cm="branche" data-i="1" style="[^"]*;--kt:2"/);
    expect(html).not.toContain('data-i="0"');
    expect(html).toContain('<div class="cm-idees cm-grande" style="--k:1.5">');
    expect(html).toContain('data-cm-image="titre"');
    expect(html).toContain('<span data-cm-texte="titre">La vue</span>');
  });
});
