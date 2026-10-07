import { describe, it, expect } from "vitest";
import { demarcheDe, demarcheSuggeree } from "./demarches";
import { DEMARCHES_GEOMETRIE } from "./demarchesGeometrie";
import { planDesFeuilles } from "./feuillesDesSequences";
import { programmationProposee } from "./programmation";
import { EXERCICES_GEOMETRIE, MOITIES, REGLAGES_GEOMETRIE, FIGURES_A_REPRODUIRE, figuresACompleter, htmlGeometrie, triplets, type Classe } from "./geometrie";
import { ASSEMBLAGES, EXERCICES_SOLIDES, REGLAGES_SOLIDES, aucunCubeCache, assemblagesDeSixCarres, estUnPatronDuCube, htmlSolides, type Case } from "./solides";
import { EXERCICES_DEPLACEMENTS, REGLAGES_DEPLACEMENTS, cheminAuHasard, executer, htmlDeplacements, programmeAuHasard, questionDePositions, relationsVraies } from "./deplacements";
import { hasard } from "./hasard";

const REF = "Cycle 2 — CP, CE1, CE2 (programmes 2026)";
const cible = (niveau: string, cg: string, competenceTitre: string) => ({
  domaineTitre: "Mathématiques", sousDomaineTitre: "Espace et géométrie", competenceGeneraleTitre: cg, competenceTitre, niveau,
});
const S = "Les solides", G = "La géométrie plane", R = "Le repérage dans l’espace";

const COMPETENCES: [string, string, string, string][] = [
  ["CP", S, "Reconnaitre les solides usuels suivants : cube, boule, cône, cylindre, pavé.", "solides-cp"],
  ["CP", S, "Nommer un cube, un pavé et une boule.", "solides-cp"],
  ["CP", S, "Décrire un cube ou un pavé en utilisant le terme « face ». Connaitre le nombre et la nature des faces d’un cube et d’un pavé.", "solides-cp"],
  ["CP", S, "Construire des cubes et des pavés.", "solides-cp"],
  ["CE1", S, "Reconnaitre les solides usuels suivants : cube, boule, cône, pyramide, cylindre, pavé.", "solides-ce1"],
  ["CE1", S, "Nommer un cube, une boule, un pavé, un cône ou une pyramide.", "solides-ce1"],
  ["CE1", S, "Décrire un cube, un pavé ou une pyramide en utilisant les termes « face », « sommet » et « arête ».", "solides-ce1"],
  ["CE1", S, "Connaitre le nombre et la nature des faces d’un cube ou d’un pavé.", "solides-ce1"],
  ["CE1", S, "Construire un cube, un pavé droit ou une pyramide.", "solides-ce1"],
  ["CE2", S, "Nommer un cube, une boule, un pavé, un cône, une pyramide ou un cylindre.", "solides-ce2"],
  ["CE2", S, "Décrire un cube, un pavé ou une pyramide en utilisant les termes « face », « sommet » et « arête ».", "solides-ce2"],
  ["CE2", S, "Connaitre le nombre et la nature des faces d’un cube ou d’un pavé.", "solides-ce2"],
  ["CE2", S, "Connaitre la nature des faces d’une pyramide.", "solides-ce2"],
  ["CE2", S, "Construire un cube, un pavé ou une pyramide.", "solides-ce2"],
  ["CE2", S, "Construire un cube à partir d’un patron.", "patron-cube-ce2"],
  ["CP", G, "Reconnaitre des formes planes (disque, carré, rectangle et triangle) dans un assemblage et dans son environnement proche.", "figures-cp"],
  ["CP", G, "Nommer le disque, le carré, le rectangle et le triangle.", "figures-cp"],
  ["CP", G, "Donner une première description du carré, du rectangle, du triangle en utilisant les termes « sommet » et « côté ».", "figures-cp"],
  ["CP", G, "Repérer visuellement des alignements.", "alignements-cp"],
  ["CP", G, "Utiliser la règle pour repérer ou vérifier des alignements.", "alignements-cp"],
  ["CP", G, "Utiliser la règle comme instrument de tracé.", "alignements-cp"],
  ["CP", G, "Construire un carré, un rectangle, un triangle ou un assemblage de ces figures sur du papier quadrillé ou pointé.", "reproduire-cp"],
  ["CE1", G, "Utiliser le vocabulaire géométrique approprié.", "figures-ce1"],
  ["CE1", G, "Reconnaitre, nommer et décrire un cercle, un carré, un rectangle, un triangle, un triangle rectangle en utilisant le vocabulaire approprié.", "figures-ce1"],
  ["CE1", G, "Connaitre les propriétés des angles et des égalités de longueur pour les carrés et les rectangles.", "figures-ce1"],
  ["CE1", G, "Reproduire ou construire un carré, un rectangle, un triangle, un triangle rectangle et un cercle ou un assemblage de ces figures.", "construire-ce1"],
  ["CE1", G, "Utiliser la règle pour vérifier des alignements et l’équerre pour vérifier qu’un angle est droit.", "construire-ce1"],
  ["CE1", G, "Utiliser la règle graduée, l’équerre et le compas comme instruments de tracé.", "construire-ce1"],
  ["CE1", G, "Connaitre et utiliser le code pour les angles droits.", "construire-ce1"],
  ["CE2", G, "Utiliser le vocabulaire géométrique approprié.", "figures-ce2"],
  ["CE2", G, "Reconnaitre, nommer et décrire le carré, le rectangle, le triangle, le triangle rectangle et le losange.", "figures-ce2"],
  ["CE2", G, "Connaitre les propriétés des angles et les égalités de longueur pour les carrés, les rectangles et les losanges.", "figures-ce2"],
  ["CE2", G, "Reproduire ou construire un carré, un rectangle, un triangle, un triangle rectangle et un cercle ou des assemblages de ces figures sur tout support (papier quadrillé ou pointé ou papier uni), avec une règle graduée, une équerre ou un compas.", "construire-ce2"],
  ["CE2", G, "Connaitre et utiliser le codage d’un angle droit et celui qui indique que des segments ont la même longueur.", "construire-ce2"],
  ["CE2", G, "Reconnaitre si une figure possède un ou plusieurs axes de symétrie en utilisant des pliages ou du papier calque.", "symetrie-ce2"],
  ["CE2", G, "Compléter, sur une feuille quadrillée ou pointée, une figure simple pour la rendre symétrique par rapport à un axe donné.", "symetrie-ce2"],
  ["CP", R, "Connaitre et utiliser le vocabulaire lié aux positions relatives.", "positions-cp"],
  ["CP", R, "Situer des personnes ou des objets les uns par rapport aux autres ou par rapport à d’autres repères dans la classe.", "positions-cp"],
  ["CP", R, "Construire et utiliser des représentations de la classe pour localiser, mémoriser et communiquer un emplacement.", "positions-cp"],
  ["CP", R, "Construire et reproduire des assemblages de solides à partir d’un modèle en trois dimensions ou de représentations planes.", "assemblages-cp"],
  ["CP", R, "Se déplacer et décrire des déplacements dans la classe en s’orientant et en utilisant des repères.", "deplacements-cp"],
  ["CP", R, "Construire et utiliser un plan de la classe pour communiquer un déplacement.", "deplacements-cp"],
  ["CP", R, "Utiliser et produire une suite d’instructions qui codent un déplacement en utilisant un vocabulaire spatial précis.", "deplacements-cp"],
  ["CE1", R, "Connaitre et utiliser le vocabulaire lié aux positions relatives.", "positions-ce1"],
  ["CE1", R, "Situer des personnes ou des objets les uns par rapport aux autres ou par rapport à d’autres repères dans un espace familier.", "positions-ce1"],
  ["CE1", R, "Construire et utiliser des représentations d’un espace familier pour localiser, mémoriser ou communiquer un emplacement.", "positions-ce1"],
  ["CE1", R, "Construire des assemblages de cubes et de pavés.", "assemblages-ce1"],
  ["CE1", R, "Comprendre, utiliser et produire une suite d’instructions qui codent un déplacement en utilisant un vocabulaire spatial précis.", "deplacements-ce1"],
];

describe("l'espace et la géométrie, bâtis sur le programme et les guides", () => {
  it("donnent à chaque compétence du programme sa séquence", () => {
    for (const [niveau, cg, titre, attendue] of COMPETENCES) expect(demarcheSuggeree(cible(niveau, cg, titre), REF).id, `${niveau} — ${titre}`).toBe(attendue);
    for (const d of DEMARCHES_GEOMETRIE) expect(COMPETENCES.some((c) => c[3] === d.id), d.id).toBe(true);
  });

  it("disent leurs sources ; le programme ne leur fixe pas de période", () => {
    for (const d of DEMARCHES_GEOMETRIE) expect(d.source, d.id).toMatch(/^Bâtie sur le programme de mathématiques du cycle 2 \(2024\) et les guides Éduscol, à la demande de l'enseignant/);
    expect(demarcheDe("reproduire-cp")!.source).toContain("« Espace et géométrie au cycle 2 »");
    expect(demarcheDe("deplacements-ce1")!.source).toContain("« Initiation à la programmation aux cycles 2 et 3 »");
    for (const [niveau, , titre, id] of COMPETENCES) expect(programmationProposee({ niveau, competenceTitre: titre }, id)!.periode, titre).toBeNull();
  });

  it("donnent leurs feuilles et la note de matériel de chaque séance", () => {
    for (const d of DEMARCHES_GEOMETRIE) {
      const classe = d.id.endsWith("-cp") ? "CP" : d.id.endsWith("-ce1") ? "CE1" : "CE2";
      const plan = planDesFeuilles(d.id, { classe, periode: 3 })!;
      expect(plan.materiel, d.id).toHaveLength(d.seances.length);
      for (const f of plan.feuilles) {
        expect(f.seance, `${d.id} · ${f.titre}`).toBeLessThan(d.seances.length);
        for (const graine of [1, 2, 3]) {
          const html = f.fabriquer(graine).html;
          expect(html, `${d.id} · ${f.titre}`).toMatch(/^<div class="feuille/);
          expect(html, `${d.id} · ${f.titre}`).not.toMatch(/NaN|undefined|Infinity/);
        }
      }
    }
  });
});

describe("la géométrie plane", () => {
  it("imprime chaque exercice, dans chaque classe, avec son corrigé", () => {
    for (const e of EXERCICES_GEOMETRIE) for (const classe of ["CP", "CE1", "CE2"] as Classe[]) for (const uni of [false, true]) {
      const html = htmlGeometrie({ ...REGLAGES_GEOMETRIE, exercice: e.id, classe, uni }, 4);
      expect(html, `${e.id} ${classe}`).toContain('class="page corrige"');
      expect(html, `${e.id} ${classe}`).not.toMatch(/NaN|undefined|Infinity/);
    }
  });

  it("tire des figures justes : carrés et rectangles à compléter, moitiés posées sur l'axe, points alignés ou non", () => {
    for (const uni of [false, true]) for (const graine of [1, 2, 3]) {
      for (const f of figuresACompleter({ classe: "CE1", uni, combien: 6 }, graine)) {
        const s = f.sommets;
        const l = (a: number[], b: number[]) => Math.hypot(b[0] - a[0], b[1] - a[1]);
        const droit = (a: number[], o: number[], b: number[]) => Math.abs((a[0] - o[0]) * (b[0] - o[0]) + (a[1] - o[1]) * (b[1] - o[1])) < 1e-6;
        if (f.quoi === "carré") { expect(l(s[0], s[1])).toBeCloseTo(l(s[1], s[2]), 6); expect(droit(s[0], s[1], s[2])).toBe(true); }
        if (f.quoi === "rectangle") { expect(droit(s[0], s[1], s[2])).toBe(true); expect(droit(s[1], s[2], s[3])).toBe(true); }
        if (f.quoi === "triangle rectangle") expect(droit(s[1], s[0], s[2])).toBe(true);
      }
    }
    for (const m of MOITIES) for (const t of m.traits) { expect(t[0][0], m.nom).toBe(0); expect(t[t.length - 1][0], m.nom).toBe(0); }
    for (const niveau of ["lignes", "diagonales", "obliques"] as const) {
      for (const f of FIGURES_A_REPRODUIRE[niveau]) for (const t of f.figure) for (const [x, y] of t.points) { expect(x).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(8); }
      // Les côtés suivent les lignes, puis passent en diagonale par les nœuds.
      if (niveau !== "obliques") for (const f of FIGURES_A_REPRODUIRE[niveau]) for (const t of f.figure) {
        t.points.forEach((p, k) => {
          const q = t.points[(k + 1) % t.points.length];
          if (!t.ferme && k === t.points.length - 1) return;
          const [dx, dy] = [Math.abs(q[0] - p[0]), Math.abs(q[1] - p[1])];
          expect(niveau === "lignes" ? dx === 0 || dy === 0 : dx === 0 || dy === 0 || dx === dy, `${f.nom}`).toBe(true);
        });
      }
    }
    const alea = hasard(5);
    for (const t of triplets(alea, 8)) {
      const [a, b, c] = t.points;
      const aire = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
      expect(aire < 1e-6, JSON.stringify(t)).toBe(t.alignes);
    }
  });
});

describe("les solides", () => {
  it("reconnaissent les onze patrons du cube parmi les trente-cinq assemblages de six carrés", () => {
    // Tous les assemblages de six carrés, à rotation et retournement près.
    const cle = (cases: Case[]) => { const mx = Math.min(...cases.map((c) => c[0])), my = Math.min(...cases.map((c) => c[1])); return JSON.stringify(cases.map(([x, y]) => [x - mx, y - my]).sort((p, q) => p[1] - q[1] || p[0] - q[0])); };
    const canon = (cases: Case[]) => { const formes: string[] = []; let c = cases; for (let k = 0; k < 4; k++) { c = c.map(([x, y]) => [y, -x] as Case); formes.push(cle(c), cle(c.map(([x, y]) => [-x, y] as Case))); } return formes.sort()[0]; };
    let niveau = new Map<string, Case[]>([[canon([[0, 0]]), [[0, 0]]]]);
    for (let n = 2; n <= 6; n++) {
      const suivant = new Map<string, Case[]>();
      for (const cases of niveau.values()) for (const [x, y] of cases) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (cases.some((c) => c[0] === x + dx && c[1] === y + dy)) continue;
        const plus: Case[] = [...cases, [x + dx, y + dy]];
        suivant.set(canon(plus), plus);
      }
      niveau = suivant;
    }
    expect(niveau.size).toBe(35);
    expect([...niveau.values()].filter(estUnPatronDuCube)).toHaveLength(11);
    expect(estUnPatronDuCube([[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]])).toBe(true);
    expect(estUnPatronDuCube([[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]])).toBe(false);
    for (const a of assemblagesDeSixCarres(hasard(3), 6)) expect(estUnPatronDuCube(a.cases)).toBe(a.patron);
  });

  it("montrent chaque cube des assemblages, et impriment chaque exercice", () => {
    for (const classe of ["CP", "CE1"] as const) for (const a of ASSEMBLAGES[classe]) expect(aucunCubeCache(a), JSON.stringify(a)).toBe(true);
    // Au CP, une seule rangée.
    for (const a of ASSEMBLAGES.CP) expect(a.every((c) => c[1] === 0)).toBe(true);
    for (const e of EXERCICES_SOLIDES) for (const classe of ["CP", "CE1", "CE2"] as const) {
      const html = htmlSolides({ ...REGLAGES_SOLIDES, exercice: e.id, classe, cachees: classe === "CE2" }, 2);
      expect(html, `${e.id} ${classe}`).not.toMatch(/NaN|undefined|Infinity/);
      if (!["patronCube", "faces"].includes(e.id)) expect(html, `${e.id} ${classe}`).toContain('class="page corrige"');
    }
  });
});

describe("se repérer, se déplacer", () => {
  it("tirent des chemins et des programmes dans les limites du programme", () => {
    const alea = hasard(9);
    for (let i = 0; i < 30; i++) {
      const c = cheminAuHasard(alea, 8);
      expect(new Set(c.cases.map((x) => x.join())).size).toBe(c.cases.length);
      expect(c.cases.every(([x, y]) => x >= 0 && y >= 0 && x < 8 && y < 6)).toBe(true);
      for (const [classe, max, virages] of [["CP", 10, 2], ["CE1", 15, 4]] as const) {
        const p = programmeAuHasard(alea, classe);
        expect(p.programme.length).toBeLessThanOrEqual(max);
        expect(p.programme.filter((x) => x !== "A").length).toBeLessThanOrEqual(virages);
        expect(executer(p.debut, p.dir, p.programme).cases).toEqual(p.cases);
      }
    }
    // Pivoter fait tourner sur place.
    expect(executer([2, 2], "haut", ["D", "A", "A", "G", "A"]).cases).toEqual([[2, 2], [3, 2], [4, 2], [4, 1]]);
  });

  it("posent des questions de positions où une seule carte convient", () => {
    const alea = hasard(4);
    for (let i = 0; i < 20; i++) {
      const q = questionDePositions(alea);
      expect(q.cartes).toHaveLength(4);
      const vraies = relationsVraies(q.cartes[q.bonne]).map((r) => r.texte);
      const [r1, r2] = q.description.replace(/\.$/, "").split(", et ");
      expect(vraies).toContain(r1.charAt(0).toLowerCase() + r1.slice(1));
      expect(vraies).toContain(r2);
      // Les deux relations ne disent pas deux fois la même chose.
      const formes = (t: string) => ["rond", "carré", "triangle"].filter((f) => t.includes(f)).sort().join();
      expect(formes(r1), q.description).not.toBe(formes(r2));
      // Les autres cartes ne vérifient pas les deux relations.
      q.cartes.forEach((d, k) => { if (k !== q.bonne) { const v = relationsVraies(d).map((r) => r.texte); expect(v.includes(r1.charAt(0).toLowerCase() + r1.slice(1)) && v.includes(r2)).toBe(false); } });
    }
    for (const e of EXERCICES_DEPLACEMENTS) for (const mode of ["decoder", "coder", "corriger"] as const) {
      const html = htmlDeplacements({ ...REGLAGES_DEPLACEMENTS, exercice: e.id, mode }, 3);
      expect(html).toContain('class="page corrige"');
      expect(html).not.toMatch(/NaN|undefined/);
    }
  });
});
