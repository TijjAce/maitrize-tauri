import { describe, it, expect } from "vitest";
import {
  COULEURS, FAMILLES_MOTIFS, GRAPHIES, basculerCase, casesAColorier, consigne, couleursDuMotif, ecrireMotifsPerso, fabriquerColoriage, grilleValide,
  lettreSousGraphie, lireMotifsPerso, MOTIFS, motifDepuisImage, motsSansAmbiguite, operationPour, resultatsDesCouleurs,
  REGLAGES_PAR_DEFAUT, type Graphie, type Operation,
} from "./coloriageMagique";
import { hasard } from "./problemesBarres";
import { contientLeSon, sonDe } from "./lectureSons";

const calcule = (expr: string): number => {
  const m = /^(\d+) ([+−×]) (\d+)$/.exec(expr);
  if (!m) throw new Error(`calcul illisible : « ${expr} »`);
  const [a, b] = [Number(m[1]), Number(m[3])];
  return m[2] === "+" ? a + b : m[2] === "−" ? a - b : a * b;
};

describe("les motifs", () => {
  it("sont des carrés de huit à douze, sans caractère inattendu", () => {
    expect(MOTIFS.length).toBeGreaterThanOrEqual(15);
    for (const m of MOTIFS) {
      expect(grilleValide(m.grille), m.nom).toBe(true);
      expect(m.grille.length, m.nom).toBeGreaterThanOrEqual(8);
      expect(m.grille.length, m.nom).toBeLessThanOrEqual(12);
    }
  });

  it("donnent une feuille d'une longueur raisonnable", () => {
    for (const m of MOTIFS) {
      const n = casesAColorier(m);
      // Assez pour que le dessin se lise, pas au point d'y passer l'après-midi.
      expect(n, m.nom).toBeGreaterThan(20);
      expect(n, m.nom).toBeLessThan(80);
      expect(couleursDuMotif(m).length, m.nom).toBeGreaterThan(0);
      expect(couleursDuMotif(m).length, m.nom).toBeLessThanOrEqual(COULEURS.length);
    }
  });

  it("rangent chaque dessin dans une famille de la galerie, avec assez d'animaux pour choisir", () => {
    for (const m of MOTIFS) expect(FAMILLES_MOTIFS.map((f) => f.id), m.nom).toContain(m.famille);
    const animaux = MOTIFS.filter((m) => m.famille === "animaux").map((m) => m.id);
    expect(animaux.length).toBeGreaterThanOrEqual(15);
    for (const id of ["zebre", "lion", "elephant", "girafe", "coccinelle", "manchot"]) expect(animaux).toContain(id);
  });

  it("n'ont pas deux identifiants ni deux noms pareils", () => {
    expect(new Set(MOTIFS.map((m) => m.id)).size).toBe(MOTIFS.length);
    expect(new Set(MOTIFS.map((m) => m.nom)).size).toBe(MOTIFS.length);
  });
});

describe("les calculs", () => {
  it("tombent toujours sur le résultat voulu", () => {
    const r = hasard(7);
    for (const op of ["addition", "soustraction", "melange"] as Operation[]) {
      for (let resultat = 2; resultat <= 10; resultat++) {
        for (let i = 0; i < 20; i++) {
          expect(calcule(operationPour(resultat, op, 10, 2, r)), `${op} → ${resultat}`).toBe(resultat);
        }
      }
    }
  });

  it("ne dépassent pas le plafond, même en soustrayant", () => {
    const r = hasard(11);
    for (let i = 0; i < 200; i++) {
      const expr = operationPour(6, "soustraction", 10, 2, r);
      expect(calcule(expr)).toBe(6);
      expect(Number(/^(\d+)/.exec(expr)![1])).toBeLessThanOrEqual(10);
    }
  });

  it("restent dans la table demandée, dans un sens ou dans l'autre", () => {
    const r = hasard(3);
    const vus = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const expr = operationPour(42, "multiplication", 10, 7, r);
      expect(calcule(expr)).toBe(42);
      expect(expr === "7 × 6" || expr === "6 × 7", expr).toBe(true);
      vus.add(expr);
    }
    // Les deux écritures sortent : sinon toutes les cases d'une couleur
    // porteraient le même calcul, recopié vingt fois.
    expect(vus.size).toBe(2);
    for (const resultat of [2, 4, 6, 8, 20]) {
      expect(calcule(operationPour(resultat, "multiplication", 10, 2, r))).toBe(resultat);
    }
  });
});

describe("la feuille", () => {
  it("donne une couleur par résultat, et jamais deux fois le même", () => {
    for (let graine = 1; graine <= 40; graine++) {
      for (const m of MOTIFS) {
        const c = fabriquerColoriage({ ...REGLAGES_PAR_DEFAUT, motif: m.id }, graine);
        const resultats = c.legende.map((l) => l.resultat);
        expect(new Set(resultats).size, `${m.nom} graine ${graine}`).toBe(resultats.length);
      }
    }
  });

  it("met dans chaque case un calcul qui donne la couleur de sa case", () => {
    const c = fabriquerColoriage({ ...REGLAGES_PAR_DEFAUT, motif: "maison", operation: "melange", plafond: 20 }, 42);
    const attendu = new Map(c.legende.map((l) => [l.couleur.id, l.resultat]));
    let calculs = 0;
    c.lignes.forEach((ligne, y) => ligne.forEach((caseC, x) => {
      const attenduIci = c.motif.grille[y][x];
      if (attenduIci === ".") {
        expect(caseC.calcul).toBe("");
        expect(caseC.couleur).toBe("");
        return;
      }
      calculs += 1;
      expect(caseC.couleur).toBe(attenduIci);
      expect(calcule(caseC.calcul), `case ${x},${y}`).toBe(attendu.get(attenduIci));
    }));
    expect(calculs).toBe(casesAColorier(c.motif));
  });

  it("rend la même feuille à graine égale, une autre sinon", () => {
    const a = fabriquerColoriage(REGLAGES_PAR_DEFAUT, 5);
    const b = fabriquerColoriage(REGLAGES_PAR_DEFAUT, 5);
    const c = fabriquerColoriage(REGLAGES_PAR_DEFAUT, 6);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(c));
  });

  it("supporte un motif qu'on ne connaît pas", () => {
    const c = fabriquerColoriage({ ...REGLAGES_PAR_DEFAUT, motif: "licorne" }, 1);
    expect(c.motif.id).toBe(MOTIFS[0].id);
  });

  it("ne manque jamais de résultats pour les couleurs", () => {
    // Trois couleurs, et des additions jusqu'à 10 : neuf résultats possibles.
    const pris = resultatsDesCouleurs(couleursDuMotif(MOTIFS[1]), "addition", 10, 2, hasard(9));
    expect(new Set(pris).size).toBe(couleursDuMotif(MOTIFS[1]).length);
  });

  it("dit à l'élève ce qu'on attend de lui", () => {
    expect(consigne(REGLAGES_PAR_DEFAUT)).toContain("colorie");
    // On colorie selon le résultat : la somme, la différence, le produit — les mots du programme.
    expect(consigne(REGLAGES_PAR_DEFAUT)).toContain("Calcule la somme écrite dans chaque case");
    expect(consigne({ ...REGLAGES_PAR_DEFAUT, operation: "soustraction" })).toContain("selon cette différence");
    expect(consigne({ ...REGLAGES_PAR_DEFAUT, operation: "multiplication", table: 7 })).toContain("selon ce produit");
    expect(consigne({ ...REGLAGES_PAR_DEFAUT, operation: "melange" })).toContain("selon son résultat");
    expect(consigne(REGLAGES_PAR_DEFAUT)).toContain("reste blanche");
  });
});

describe("le coloriage des lettres", () => {
  const lettres = (sons: string[], motif = "maison") =>
    fabriquerColoriage({ ...REGLAGES_PAR_DEFAUT, matiere: "lettres" as const, sons, motif }, 21);

  it("met dans chaque case un mot qui porte le son de sa couleur, et lui seul", () => {
    const sons = ["ch", "ou", "oi"];
    const c = lettres(sons);
    const parCouleur = new Map(c.legende.map((l) => [l.couleur.id, l.grapheme]));
    let cases = 0;
    c.lignes.forEach((ligne, y) => ligne.forEach((x, col) => {
      if (c.motif.grille[y][col] === ".") { expect(x.calcul).toBe(""); return; }
      cases += 1;
      const sien = sonDe(sons[[...parCouleur.keys()].indexOf(x.couleur)])!;
      expect(contientLeSon(x.calcul, sien), `« ${x.calcul} » pour ${sien.son}`).toBe(true);
      // Et aucun autre son colorié : sinon la case aurait deux couleurs.
      for (const autre of sons.filter((id) => id !== sien.id)) {
        expect(contientLeSon(x.calcul, sonDe(autre)!), `« ${x.calcul} » aussi ${autre}`).toBe(false);
      }
    }));
    expect(cases).toBeGreaterThan(20);
  });

  it("écarte les mots ambigus du vivier", () => {
    const ch = sonDe("ch")!, ou = sonDe("ou")!;
    const propres = motsSansAmbiguite(ch, [ch, ou]);
    expect(propres.length).toBeGreaterThan(0);
    for (const m of propres) expect(contientLeSon(m, ou), m).toBe(false);
    // « bouche » porte les deux : il ne peut servir ni à l'un ni à l'autre.
    expect(ch.mots).toContain("bouche");
    expect(propres).not.toContain("bouche");
  });

  it("annonce les graphèmes en légende, et non des résultats", () => {
    const c = lettres(["ch", "ou", "oi"]);
    expect(c.legende.map((l) => l.grapheme)).toEqual(["ch", "ou", "oi"]);
    expect(c.legende.every((l) => l.resultat === undefined)).toBe(true);
    expect(consigne({ ...REGLAGES_PAR_DEFAUT, matiere: "lettres" })).toContain("Lis chaque mot");
  });

  it("tient debout avec moins de sons que de couleurs", () => {
    const c = lettres(["ch"]);
    expect(c.legende.every((l) => l.grapheme === "ch")).toBe(true);
    expect(c.lignes.flat().filter((x) => x.calcul).every((x) => x.calcul !== "?")).toBe(true);
  });
});

describe("le coloriage des graphies", () => {
  const reglages = { ...REGLAGES_PAR_DEFAUT, matiere: "graphies" as const, motif: "maison", lettres: ["b", "d", "P"], graphies: ["majuscule", "cursive"] as Graphie[], polices: true };

  it("montre dans chaque case la lettre de sa couleur, sous une forme cochée", () => {
    const c = fabriquerColoriage(reglages, 5);
    expect(c.legende.map((l) => l.lettre)).toEqual(["b", "d", "p"]);
    for (const ligne of c.lignes) for (const x of ligne) {
      if (!x.couleur) { expect(x.calcul).toBe(""); continue; }
      const attendue = c.legende.find((l) => l.couleur.id === x.couleur)!.lettre!;
      expect(x.calcul.toLowerCase()).toBe(attendue);
      expect(reglages.graphies).toContain(x.graphie);
      expect(x.calcul).toBe(lettreSousGraphie(attendue, x.graphie!));
      // Les polices ne se mêlent qu'à l'imprimerie : la cursive garde la sienne.
      if (x.graphie === "cursive" || x.graphie === "cursiveMajuscule") expect(x.police).toBeUndefined();
    }
    expect(c.lignes.flat().some((x) => x.police)).toBe(true);
    expect(fabriquerColoriage(reglages, 5)).toEqual(c);
  });

  it("complète les lettres manquantes et se rabat sur le script sans graphie cochée", () => {
    const c = fabriquerColoriage({ ...reglages, lettres: [], graphies: [] }, 1);
    expect(c.legende.map((l) => l.lettre)).toEqual(["a", "b", "c"]);
    expect(c.lignes.flat().filter((x) => x.couleur).every((x) => x.graphie === "script")).toBe(true);
    expect(GRAPHIES.map((g) => g.id)).toContain("cursiveMajuscule");
    expect(consigne({ ...reglages })).toContain("cursive");
  });
});

describe("un dessin tiré d'une image", () => {
  /** Une image colorée par blocs d'après une grille de lettres : b blanc, r rouge, v vert, k noir, g gris clair, t transparent. */
  const image = (blocs: string[], parBloc = 4) => {
    const [l, h] = [blocs[0].length * parBloc, blocs.length * parBloc];
    const pixels = new Uint8ClampedArray(l * h * 4);
    const teinte: Record<string, [number, number, number, number]> = {
      b: [250, 250, 248, 255], r: [220, 30, 70, 255], v: [30, 160, 80, 255], k: [20, 20, 30, 255], g: [200, 200, 200, 255], t: [0, 0, 0, 0],
    };
    for (let y = 0; y < h; y++) for (let x = 0; x < l; x++) {
      const i = (y * l + x) * 4;
      teinte[blocs[Math.floor(y / parBloc)][Math.floor(x / parBloc)]].forEach((v, k) => { pixels[i + k] = v; });
    }
    return { largeur: l, hauteur: h, pixels };
  };
  const options = (p: Partial<Parameters<typeof motifDepuisImage>[1]> = {}) => ({ taille: 4, seuilBlanc: 0.85, palette: COULEURS, recadrer: false, ...p });

  it("donne à chaque case la couleur de feutre la plus proche, et laisse le clair en blanc", () => {
    expect(motifDepuisImage(image(["bbbb", "brrb", "bvkb", "bbgb"]), options())).toEqual(["....", ".11.", ".46.", "...."]);
    // Le transparent d'un picto compte comme du blanc.
    expect(motifDepuisImage(image(["tttt", "trrt", "trrt", "tttt"]), options())).toEqual(["....", ".11.", ".11.", "...."]);
  });

  it("prend la couleur qui couvre le plus la case, plutôt que la moyenne qui salit", () => {
    // Les cases de gauche sont rouges aux deux tiers, celles de droite vertes : jamais une couleur de mélange.
    const deux = motifDepuisImage(image(["rrrrvv", "rrrrvv", "rrrrvv", "rrrrvv", "rrrrvv", "rrrrvv"], 2), options({ taille: 4 }));
    expect(deux.join("")).toMatch(/^[14]+$/);
    expect(deux.every((ligne) => ligne.startsWith("11"))).toBe(true);
  });

  it("garde les proportions de l'image entière, sans en couper les bords", () => {
    // Une image deux fois plus large que haute : 8 colonnes, 4 rangées ; le rouge du bord droit reste.
    const large = image(["bbbbbbbr", "bbbbbbbr", "bbbbbbbr", "bbbbbbbr"]);
    const g = motifDepuisImage(large, options({ taille: 8 }));
    expect(g).toHaveLength(4);
    expect(g.every((ligne) => ligne.length === 8 && ligne.endsWith("1"))).toBe(true);
    // Plus haute que large : le grand côté est la hauteur.
    const haute = motifDepuisImage(image(["rr", "rr", "bb", "bb"]), options({ taille: 8 }));
    expect(haute.map((l) => l.length)).toEqual(Array(8).fill(4));
  });

  it("retire les marges claires : le dessin occupe toute la grille", () => {
    const petit = image(["bbbbbbbb", "bbbbbbbb", "bbbrrbbb", "bbbrrbbb", "bbbbbbbb", "bbbbbbbb", "bbbbbbbb", "bbbbbbbb"]);
    expect(motifDepuisImage(petit, options({ taille: 4 }))).toEqual(["....", "....", "....", "...."].map((l, i) => (i === 1 ? ".11." : l)));
    const recadre = motifDepuisImage(petit, options({ taille: 4, recadrer: true }));
    expect(recadre.join("").replace(/\./g, "").length).toBeGreaterThanOrEqual(9);
  });

  it("remplit l'intérieur clair d'un dessin au trait, et laisse blanc le fond qui touche le bord", () => {
    // Un picto au trait : un corps gris clair entouré de noir, sur fond blanc.
    const trait = image(["bbbbbb", "bkkkkb", "bkggkb", "bkggkb", "bkkkkb", "bbbbbb"]);
    const sansNoir = COULEURS.filter((c) => c.id !== "6");
    expect(motifDepuisImage(trait, options({ taille: 6, palette: sansNoir, remplissage: "5" })))
      .toEqual(["......", "......", "..55..", "..55..", "......", "......"]);
    // Sans remplissage, l'intérieur reste blanc : il n'y a rien à colorier.
    expect(motifDepuisImage(trait, options({ taille: 6, palette: sansNoir })).join("")).toMatch(/^\.+$/);
    // Un feutre de remplissage retiré de la palette ne remplit rien.
    expect(motifDepuisImage(trait, options({ taille: 6, palette: COULEURS.slice(0, 2), remplissage: "5" })).join("")).not.toContain("5");
  });

  it("ne compte pas les traits noirs quand on retire le feutre noir", () => {
    // Un picto : des contours noirs autour d'une tache verte.
    const picto = image(["kkkk", "kvvk", "kvvk", "kkkk"]);
    expect(motifDepuisImage(picto, options())).toEqual(["6666", "6446", "6446", "6666"]);
    const sansNoir = COULEURS.filter((c) => c.id !== "6");
    expect(motifDepuisImage(picto, options({ palette: sansNoir }))).toEqual(["....", ".44.", ".44.", "...."]);
  });

  it("se retouche case par case, et ne garde que des grilles qui tiennent debout", () => {
    let g = ["....", ".11.", ".11.", "...."];
    g = basculerCase(g, 0, 0, COULEURS.slice(0, 2));
    expect(g[0]).toBe("1...");
    g = basculerCase(g, 0, 0, COULEURS.slice(0, 2));
    expect(g[0]).toBe("2...");
    g = basculerCase(g, 0, 0, COULEURS.slice(0, 2));
    expect(g[0]).toBe("....");
    expect(grilleValide(["...."])).toBe(false);
    expect(grilleValide(["..", ".."])).toBe(false);
    expect(grilleValide(["...7", "....", "....", "...."])).toBe(false);
    const perso = lireMotifsPerso(ecrireMotifsPerso([{ id: "p1", nom: "Mon chien", grille: g, perso: true }, { id: "p2", nom: "Cassé", grille: ["1"] }]));
    expect(perso).toHaveLength(1);
    expect(perso[0]).toMatchObject({ id: "p1", nom: "Mon chien", perso: true });
    expect(lireMotifsPerso("nope")).toEqual([]);
    // Un dessin de l'enseignant se fabrique comme les nôtres.
    const c = fabriquerColoriage({ ...REGLAGES_PAR_DEFAUT, motif: "p1" }, 3, perso);
    expect(c.motif.id).toBe("p1");
  });
});
