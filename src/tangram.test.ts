import { describe, expect, it } from "vitest";
import {
  DESSINS_TANGRAM, EXERCICES_TANGRAM, FIGURES_TANGRAM, PIECES_TANGRAM, REGLAGES_TANGRAM, avertissementTangram, htmlTangram, miseEnPageDuModele,
  reglagesTangramSurs, styleTangram, titreTangram, type FigureTangram, type PieceTangram, type Pt, type ReglagesTangram,
} from "./tangram";

const aire = (p: Pt[]) => Math.abs(p.reduce((s, [x, y], i) => { const [x2, y2] = p[(i + 1) % p.length]; return s + x * y2 - x2 * y; }, 0)) / 2;
const longueur = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const cotes = (p: Pt[]) => p.map((a, i) => longueur(a, p[(i + 1) % p.length])).sort((a, b) => a - b);
const proche = (a: number, b: number) => Math.abs(a - b) < 1e-9;

/** La longueur d'une unité de la figure, en côtés du grand carré. */
const unite = (f: FigureTangram) => (f.unite === "quart" ? 1 / 4 : 1 / (2 * Math.SQRT2));

/** Chaque pièce, en côtés du grand carré : ses côtés rangés, son aire. */
const PETIT = Math.SQRT2 / 4;
const ATTENDU: Record<PieceTangram, number[]> = {
  grand1: [Math.SQRT1_2, Math.SQRT1_2, 1], grand2: [Math.SQRT1_2, Math.SQRT1_2, 1], moyen: [0.5, 0.5, Math.SQRT1_2],
  carre: [PETIT, PETIT, PETIT, PETIT], para: [PETIT, PETIT, 0.5, 0.5], petit1: [PETIT, PETIT, 0.5], petit2: [PETIT, PETIT, 0.5],
};
const AIRE: Record<PieceTangram, number> = { grand1: 1 / 4, grand2: 1 / 4, moyen: 1 / 8, carre: 1 / 8, para: 1 / 8, petit1: 1 / 16, petit2: 1 / 16 };

/** L'aire commune à deux polygones convexes (Sutherland-Hodgman). */
function aireCommune(a: Pt[], b: Pt[]): number {
  const sens = (p: Pt[]) => Math.sign(p.reduce((s, [x, y], i) => { const [x2, y2] = p[(i + 1) % p.length]; return s + x * y2 - x2 * y; }, 0));
  const s = sens(b);
  let sortie = a;
  for (let i = 0; i < b.length && sortie.length; i++) {
    const [p, q] = [b[i], b[(i + 1) % b.length]];
    const dedans = (m: Pt) => s * ((q[0] - p[0]) * (m[1] - p[1]) - (q[1] - p[1]) * (m[0] - p[0])) >= -1e-12;
    const coupe = (m: Pt, n: Pt): Pt => {
      const [dx, dy] = [n[0] - m[0], n[1] - m[1]];
      const t = ((q[0] - p[0]) * (p[1] - m[1]) - (q[1] - p[1]) * (p[0] - m[0])) / ((q[0] - p[0]) * dy - (q[1] - p[1]) * dx);
      return [m[0] + t * dx, m[1] + t * dy];
    };
    const entree = sortie;
    sortie = [];
    entree.forEach((m, k) => {
      const n = entree[(k + 1) % entree.length];
      if (dedans(n)) { if (!dedans(m)) sortie.push(coupe(m, n)); sortie.push(n); } else if (dedans(m)) sortie.push(coupe(m, n));
    });
  }
  return sortie.length >= 3 ? aire(sortie) : 0;
}

/** La plus courte distance entre deux polygones qui ne se chevauchent pas : de sommet à côté. */
function distance(a: Pt[], b: Pt[]): number {
  const auSegment = (m: Pt, p: Pt, q: Pt) => {
    const [dx, dy] = [q[0] - p[0], q[1] - p[1]];
    const t = Math.max(0, Math.min(1, ((m[0] - p[0]) * dx + (m[1] - p[1]) * dy) / (dx * dx + dy * dy)));
    return longueur(m, [p[0] + t * dx, p[1] + t * dy]);
  };
  const d = (u: Pt[], v: Pt[]) => Math.min(...u.flatMap((m) => v.map((p, i) => auSegment(m, p, v[(i + 1) % v.length]))));
  return Math.min(d(a, b), d(b, a));
}

describe("les figures du tangram", () => {
  it("ont des noms et des identifiants à elles", () => {
    expect(new Set(FIGURES_TANGRAM.map((f) => f.id)).size).toBe(FIGURES_TANGRAM.length);
    expect(new Set(FIGURES_TANGRAM.map((f) => f.nom)).size).toBe(FIGURES_TANGRAM.length);
    // De deux à sept pièces : des modèles de deux ou trois pièces, jusqu'aux sept.
    expect(new Set(FIGURES_TANGRAM.map((f) => f.pieces.length))).toEqual(new Set([2, 3, 4, 5, 7]));
  });

  for (const f of FIGURES_TANGRAM) {
    it(`${f.nom} : les pièces d'un seul tangram, chacune à sa forme, sans se chevaucher, d'un seul morceau`, () => {
      const pieces = f.pieces.map((p) => p.piece);
      expect(new Set(pieces).size, f.nom).toBe(pieces.length);
      if (pieces.length === 7) expect(new Set(pieces)).toEqual(new Set(PIECES_TANGRAM));
      const u = unite(f);
      for (const p of f.pieces) {
        const enCarre = p.points.map(([x, y]): Pt => [x * u, y * u]);
        cotes(enCarre).forEach((c, i) => expect(proche(c, ATTENDU[p.piece][i]), `${f.nom} · ${p.piece} : ${cotes(enCarre)}`).toBe(true));
        // L'aire distingue le carré du parallélogramme, qui ont des côtés de même longueur… à part.
        expect(proche(aire(enCarre), AIRE[p.piece]), `${f.nom} · ${p.piece}`).toBe(true);
      }
      for (let i = 0; i < f.pieces.length; i++) {
        for (let j = i + 1; j < f.pieces.length; j++) {
          expect(aireCommune(f.pieces[i].points, f.pieces[j].points), `${f.nom} : ${f.pieces[i].piece} et ${f.pieces[j].piece}`).toBeLessThan(1e-9);
        }
      }
      // Chaque pièce touche la figure : par un côté, ou au moins par un sommet.
      const reliees = new Set([0]);
      for (let tour = 0; tour < f.pieces.length; tour++) {
        f.pieces.forEach((p, i) => {
          if ([...reliees].some((k) => distance(p.points, f.pieces[k].points) < 1e-9)) reliees.add(i);
        });
      }
      expect(reliees.size, f.nom).toBe(f.pieces.length);
    });
  }

  it("le grand carré est le carré entier, sans trou", () => {
    const f = FIGURES_TANGRAM.find((x) => x.id === "carre-7")!;
    expect(f.pieces.reduce((s, p) => s + aire(p.points), 0)).toBeCloseTo(16, 9);
  });
});

describe("les feuilles du tangram", () => {
  const r = (x: Partial<ReglagesTangram>) => reglagesTangramSurs({ ...REGLAGES_TANGRAM, ...x });
  const largeurs = (html: string) => [...html.matchAll(/<svg class="tg-[a-z]+" viewBox="[^"]+" width="([\d.]+)mm" height="([\d.]+)mm"/g)].map((m) => [Number(m[1]), Number(m[2])]);

  it("relit ce qu'on a gardé, et reprend sa valeur par défaut pour le reste", () => {
    expect(reglagesTangramSurs(null)).toMatchObject(REGLAGES_TANGRAM);
    expect(reglagesTangramSurs({ exercice: "inconnu" as never, cote: 900, figure: "?", dessin: "?" as never }))
      .toMatchObject({ exercice: "modele", cote: 180, figure: "fusee-7", dessin: "contours" });
    expect(reglagesTangramSurs({ cote: 20 }).cote).toBe(60);
    for (const e of EXERCICES_TANGRAM) {
      for (const d of DESSINS_TANGRAM) expect(d.exercices).toContain(reglagesTangramSurs({ exercice: e.id, dessin: d.id }).dessin === d.id ? e.id : d.exercices[0]);
    }
  });

  it("le grand carré à découper est à la taille des pièces de la classe : deux par page quand ils y tiennent", () => {
    const html = htmlTangram(r({ exercice: "carre", cote: 120 }), 1);
    expect(largeurs(html)).toEqual([[122, 122], [122, 122]]);
    expect(html.match(/<polygon /g)).toHaveLength(14);
    expect(largeurs(htmlTangram(r({ exercice: "carre", cote: 150 }), 1))).toHaveLength(1);
    expect(largeurs(htmlTangram(r({ exercice: "carre", cote: 80 }), 1))).toHaveLength(6);
    expect(htmlTangram(r({ exercice: "carre" }), 1)).toContain("Je découpe les sept pièces");
  });

  it("un modèle se dessine à la taille des pièces : la fusée de 4 carreaux sur 5, pour un carré de 12 cm", () => {
    const e = 120 / (2 * Math.SQRT2);
    const [[l, h]] = largeurs(htmlTangram(r({ figure: "fusee-7" }), 1));
    expect(l).toBeCloseTo(4 * e + 2, 1);
    expect(h).toBeCloseTo(5 * e + 2, 1);
    // Plus petit : à moitié.
    const [[l2]] = largeurs(htmlTangram(r({ figure: "fusee-7", petit: true }), 1));
    expect(l2).toBeCloseTo(2 * e + 2, 1);
    expect(htmlTangram(r({ figure: "fusee-7", petit: true }), 1)).toContain("à côté du modèle");
  });

  it("un modèle trop grand pour la page passe à l'horizontale, ou s'imprime plus petit, et l'atelier le dit", () => {
    // L'autre voilier, couché : 5 carreaux sur 3, à l'horizontale.
    expect(miseEnPageDuModele(r({ figure: "voilier-bis-7" }))).toEqual({ paysage: true, reduction: 1 });
    expect(styleTangram(r({ figure: "voilier-bis-7" }))).toContain("size: A4 landscape");
    expect(styleTangram(r({ figure: "fusee-7" }))).toContain("size: A4 portrait");
    expect(avertissementTangram(r({ figure: "fusee-7" }))).toBeNull();
    const grand = r({ figure: "fusee-7", cote: 170 });
    expect(miseEnPageDuModele(grand).reduction).toBeLessThan(1);
    expect(avertissementTangram(grand)).toMatch(/ne tient pas sur une page A4 : il s'imprime à \d+ %/);
    expect(avertissementTangram(r({ figure: "fusee-7", cote: 170, petit: true }))).toBeNull();
    // Le grand carré, la petite maison : toujours à la taille des pièces.
    for (const figure of ["carre-7", "maison-3", "bateau-4"]) expect(miseEnPageDuModele(r({ figure, cote: 150 })).reduction).toBe(1);
  });

  it("chaque dessin : les contours des pièces, les couleurs, la silhouette", () => {
    const fusee = (dessin: ReglagesTangram["dessin"]) => htmlTangram(r({ figure: "fusee-7", dessin }), 7);
    expect(fusee("contours")).toContain('fill="#a9afbb" stroke="#fff"');
    expect(fusee("couleur")).toContain('fill="#e53935"');
    expect(fusee("couleur")).not.toContain('fill="#111111"');
    // La silhouette : rien que du noir, aucun trait blanc entre les pièces.
    expect(fusee("silhouette").match(/fill="#111111"/g)).toHaveLength(7);
    expect(fusee("silhouette")).not.toContain('stroke="#fff"');
    // Un modèle ne doit rien au hasard.
    expect(new Set([1, 2, 3].map((g) => htmlTangram(r({ figure: "fusee-7", dessin: "couleur" }), g))).size).toBe(1);
  });

  it("le petit livre : une page par pièce, la pièce de la page cernée, les suivantes fondues", () => {
    const html = htmlTangram(r({ figure: "bateau-5", etapes: true }), 1);
    expect(html.match(/class="page tg-page"/g)).toHaveLength(5);
    expect(html).toContain("Le bateau à deux voiles — 1/5");
    expect(html).toContain("Le bateau à deux voiles — 5/5");
    expect(html.match(/stroke="#1c2233" stroke-width="1.2"/g)).toHaveLength(5);
    // Pas de petit livre pour une silhouette.
    expect(htmlTangram(r({ figure: "bateau-5", etapes: true, dessin: "silhouette" }), 1).match(/class="page tg-page"/g)).toHaveLength(1);
  });

  it("les sept pièces en désordre, et les parallélogrammes : à la taille des pièces, sur une page jusqu'à 12 cm, sans se toucher", () => {
    for (const cote of [80, 120, 150]) {
      for (const graine of [1, 2, 3, 42, 1789]) {
        for (const exercice of ["desordre", "parallelogrammes"] as const) {
          const html = htmlTangram(r({ exercice, cote, dessin: "silhouette" }), graine);
          const pages = html.split('class="page tg-page"').slice(1);
          // Un tangram de plus de 13 cm ne tient plus sur une page : ses pièces passent sur deux.
          if (cote <= 120) expect(pages, `${exercice}, ${cote} mm, graine ${graine}`).toHaveLength(1);
          else expect(pages.length).toBeLessThanOrEqual(2);
          expect(html.match(/<polygon /g)).toHaveLength(exercice === "desordre" ? 7 : 6);
          for (const page of pages) {
            const [[l, h]] = largeurs(page);
            expect(l).toBeLessThanOrEqual(190);
            expect(h).toBeLessThanOrEqual(240);
            const formes = [...page.matchAll(/points="([^"]+)"/g)].map((m) => m[1].split(" ").map((p) => p.split(",").map(Number) as Pt));
            for (const f of formes) for (const [x, y] of f) expect(x >= -0.01 && x <= l + 0.01 && y >= -0.01 && y <= h + 0.01).toBe(true);
            for (let i = 0; i < formes.length; i++) for (let j = i + 1; j < formes.length; j++) expect(distance(formes[i], formes[j])).toBeGreaterThan(7.9);
          }
          expect(pages[0]).toContain("Prénom :");
        }
      }
    }
    // Les parallélogrammes : trois retournés, trois seulement tournés.
    const html = htmlTangram(r({ exercice: "parallelogrammes" }), 5);
    const sens = [...html.matchAll(/points="([^"]+)"/g)].map((m) => {
      const p = m[1].split(" ").map((x) => x.split(",").map(Number) as Pt);
      return Math.sign(p.reduce((s, [x, y], i) => { const [x2, y2] = p[(i + 1) % p.length]; return s + x * y2 - x2 * y; }, 0));
    });
    expect(sens.filter((s) => s > 0)).toHaveLength(3);
    expect(html).toContain("Je peux la tourner, ou la retourner");
  });

  it("chaque feuille a son titre, et se refait à l'identique avec la même graine", () => {
    for (const e of EXERCICES_TANGRAM) {
      const x = r({ exercice: e.id });
      expect(htmlTangram(x, 9)).toContain(`<div class="titre">${titreTangram(x).replace(/'/g, "&#39;")}`);
      expect(htmlTangram(x, 9)).toBe(htmlTangram(x, 9));
    }
    expect(htmlTangram(r({ titre: "Ma fusée" }), 1)).toContain('<div class="titre">Ma fusée</div>');
  });
});
