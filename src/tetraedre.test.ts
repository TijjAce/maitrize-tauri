// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import { describe, expect, it } from "vitest";
import {
  ANGLE_LANGUETTE, COTE, COULEURS_TETRAEDRE, LANGUETTE, LES_MODELES, PAGE_TETRAEDRE, SOMMETS, STYLE_TETRAEDRE, TETRAEDRE_PAR_DEFAUT,
  blocsDeLaPage, carreTient, contraste, demiBords, demiLargeur, disposerLaZone, encreSur, etapesDeMontage, etatsDuModele, facesDuPatron, hexDe,
  htmlTetraedre, languette, largeurDuTexte, mentionsDesImages, motsTropLongs, normaliserTetraedre, pointsDuPatron, svgDuTetraedre,
  titreDuTetraedre, traitsDuPatron, zonesDuPatron, type Point, type ReglagesTetraedre, type Sommet,
} from "./tetraedre";
import { CREDIT_ARASAAC } from "./cartesImprimables";

// ── Outils de géométrie ──

type V3 = [number, number, number];
const moins = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const plus = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const fois = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const scalaire = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vectoriel = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norme = (a: V3) => Math.sqrt(scalaire(a, a));
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const memePoint = (a: Point, b: Point) => distance(a, b) < 1e-9;
const aire = (ps: Point[]) => ps.reduce((t, p, i) => t + (p.x * ps[(i + 1) % ps.length].y - ps[(i + 1) % ps.length].x * p.y), 0) / 2;

/**
 * Le tétraèdre plié, de côté COTE : le triangle du milieu posé à plat, face
 * imprimée vers le haut, et D en dessous — les trois pointes se rabattent
 * vers l'arrière, comme le disent les consignes.
 */
const s = COTE;
const T: Record<Sommet, V3> = {
  A: [0, 0, 0], B: [s, 0, 0], C: [s / 2, (s * Math.sqrt(3)) / 2, 0], D: [s / 2, (s * Math.sqrt(3)) / 6, -s * Math.sqrt(2 / 3)],
};
const O: V3 = fois(plus(plus(T.A, T.B), plus(T.C, T.D)), 1 / 4);

/** Le pliage d'une face : un point du patron, à sa place sur le tétraèdre. */
function plier(face: number): (p: Point) => V3 {
  const f = facesDuPatron()[face];
  const [n0, n1, n2] = f.coins;
  const [t0, t1, t2] = f.sommets.map((x) => T[x]);
  const a = n1.x - n0.x, b = n2.x - n0.x, c = n1.y - n0.y, d = n2.y - n0.y, det = a * d - b * c;
  return (p) => {
    const u = ((p.x - n0.x) * d - b * (p.y - n0.y)) / det;
    const v = (a * (p.y - n0.y) - c * (p.x - n0.x)) / det;
    return plus(t0, plus(fois(moins(t1, t0), u), fois(moins(t2, t0), v)));
  };
}
const pareil3 = (a: V3, b: V3) => norme(moins(a, b)) < 1e-6;

describe("le tétraèdre des émotions : le patron (demande de l'enseignant, 2026-11-03)", () => {
  it("est le patron classique, le plus grand qui tienne sur une page A4 à l'italienne, languettes comprises", () => {
    expect(COTE).toBeGreaterThanOrEqual(100);
    const { P, Q, R, A, B, C } = pointsDuPatron();
    // Le grand triangle, de côté double ; ses milieux font le triangle du milieu.
    for (const [u, v] of [[P, Q], [Q, R], [R, P]]) expect(distance(u, v)).toBeCloseTo(2 * COTE, 9);
    for (const f of facesDuPatron()) {
      for (let i = 0; i < 3; i++) expect(distance(f.coins[i], f.coins[(i + 1) % 3])).toBeCloseTo(COTE, 9);
    }
    expect(memePoint(A, { x: (P.x + Q.x) / 2, y: (P.y + Q.y) / 2 }) && memePoint(B, { x: (Q.x + R.x) / 2, y: (Q.y + R.y) / 2 })
      && memePoint(C, { x: (R.x + P.x) / 2, y: (R.y + P.y) / 2 })).toBe(true);
    // Tout le contour, languettes comprises, tient sur la page, et un côté d'un millimètre de plus n'y tiendrait pas.
    const { contour } = traitsDuPatron();
    for (const p of contour) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(PAGE_TETRAEDRE.largeur);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(PAGE_TETRAEDRE.hauteur);
    }
    expect((COTE + 1) * Math.sqrt(3) + LANGUETTE + 1).toBeGreaterThan(PAGE_TETRAEDRE.hauteur);
  });

  it("a une languette par arête à coller, vers l'extérieur, qui tient dans la face où elle se colle", () => {
    const bords = demiBords();
    for (const arete of ["AD", "BD", "CD"]) expect(bords.filter((b) => b.arete === arete && b.languette)).toHaveLength(1);
    const { P, Q, R } = pointsDuPatron();
    const centre = { x: (P.x + Q.x + R.x) / 3, y: (P.y + Q.y + R.y) / 3 };
    for (const b of bords.filter((x) => x.languette)) {
      const { contour, normale } = languette(b.de, b.vers);
      // Sa normale part du centre du patron, et ses deux coins du haut sont à LANGUETTE du bord, de ce côté : elle sort du patron.
      const m = { x: (b.de.x + b.vers.x) / 2, y: (b.de.y + b.vers.y) / 2 };
      expect(normale.x * (m.x - centre.x) + normale.y * (m.y - centre.y)).toBeGreaterThan(0);
      for (const c of [contour[1], contour[2]]) expect(normale.x * (c.x - b.de.x) + normale.y * (c.y - b.de.y)).toBeCloseTo(LANGUETTE, 9);
      // Ses côtés font ANGLE_LANGUETTE avec le bord : moins que les 60° d'un coin de face.
      const d = { x: b.vers.x - b.de.x, y: b.vers.y - b.de.y }, c = { x: contour[1].x - b.de.x, y: contour[1].y - b.de.y };
      const angle = (Math.acos((d.x * c.x + d.y * c.y) / (Math.hypot(d.x, d.y) * Math.hypot(c.x, c.y))) * 180) / Math.PI;
      expect(angle).toBeCloseTo(ANGLE_LANGUETTE, 6);
      expect(angle).toBeLessThan(60);
    }
    // Les plis : les trois côtés du triangle du milieu et les pieds des trois languettes.
    expect(traitsDuPatron().plis).toHaveLength(6);
    expect(traitsDuPatron().languettes).toHaveLength(3);
  });

  it("se plie en un tétraèdre : les bords collés deux à deux se rejoignent, et la face imprimée reste dehors", () => {
    const faces = facesDuPatron();
    // Chaque demi-bord, plié avec sa face ; ceux d'une même arête tombent l'un sur l'autre.
    const plie = (de: Point, vers: Point) => {
      const k = faces.findIndex((f) => f.coins.some((c) => memePoint(c, de)) && f.coins.some((c) => memePoint(c, vers)));
      expect(k).toBeGreaterThanOrEqual(0);
      return [plier(k)(de), plier(k)(vers)];
    };
    for (const arete of ["AD", "BD", "CD"]) {
      const [x, y] = demiBords().filter((b) => b.arete === arete).map((b) => plie(b.de, b.vers));
      const memes = (pareil3(x[0], y[0]) && pareil3(x[1], y[1])) || (pareil3(x[0], y[1]) && pareil3(x[1], y[0]));
      expect(memes, arete).toBe(true);
      // C'est bien l'arête qui joint D à son autre sommet.
      const bout = arete[0] as Sommet;
      expect([x[0], x[1]].some((p) => pareil3(p, T.D)) && [x[0], x[1]].some((p) => pareil3(p, T[bout])), arete).toBe(true);
    }
    // Vue de face sur le papier ou de dehors sur le tétraèdre, chaque face tourne dans le même sens : rien n'est imprimé dedans.
    faces.forEach((f, k) => {
      const [t0, t1, t2] = f.sommets.map((x) => T[x]);
      const normale = vectoriel(moins(t1, t0), moins(t2, t0));
      const versDehors = scalaire(normale, moins(fois(plus(plus(t0, t1), t2), 1 / 3), O)) > 0;
      // Sur la page, y descend : une aire négative est un tour dans le sens inverse des aiguilles d'une montre.
      const inverseSurLaPage = aire(f.coins) < 0;
      expect(inverseSurLaPage, `face ${k}`).toBe(versDehors);
      // Les quatre faces sont différentes : chacune a ses trois sommets.
      expect(new Set(f.sommets).size).toBe(3);
    });
    expect(new Set(faces.map((f) => [...f.sommets].sort().join(""))).size).toBe(4);
  });
});

describe("le tétraèdre des émotions : les zones de chaque sommet", () => {
  const zones = zonesDuPatron();

  it("partage chaque face en trois cerfs-volants, un autour de chacun de ses coins, chacun au sommet de ce coin", () => {
    expect(zones).toHaveLength(12);
    const faces = facesDuPatron();
    faces.forEach((f, k) => {
      const siennes = zones.filter((z) => z.face === k);
      expect(siennes.map((z) => z.sommet).sort()).toEqual([...f.sommets].sort());
      // Les trois zones couvrent la face, un tiers chacune.
      for (const z of siennes) expect(Math.abs(aire(z.polygone))).toBeCloseTo(Math.abs(aire(f.coins)) / 3, 6);
    });
    // Trois zones par sommet, sur les trois faces qui le touchent — jamais sur celle d'en face.
    for (const x of SOMMETS) {
      const siennes = zones.filter((z) => z.sommet === x);
      expect(siennes).toHaveLength(3);
      expect(new Set(siennes.map((z) => z.face)).size).toBe(3);
      for (const z of siennes) expect(faces[z.face].sommets).toContain(x);
    }
  });

  it("rejoint, une fois plié, les trois zones d'un même sommet à ce sommet ; celles de D sont aux trois pointes du patron", () => {
    for (const x of SOMMETS) {
      for (const z of zones.filter((y) => y.sommet === x)) expect(pareil3(plier(z.face)(z.coin), T[x]), `${x}, face ${z.face}`).toBe(true);
    }
    const { P, Q, R, A } = pointsDuPatron();
    const pointes = zones.filter((z) => z.sommet === "D").map((z) => z.coin);
    expect([P, Q, R].every((p) => pointes.some((c) => memePoint(c, p)))).toBe(true);
    // Les zones de A, de B et de C se touchent déjà sur le papier, autour de leur point.
    expect(zones.filter((z) => z.sommet === "A").every((z) => memePoint(z.coin, A))).toBe(true);
  });

  it("tourne chaque texte pour qu'il se lise son sommet en haut", () => {
    for (const z of zones) {
      const a = (z.angle * Math.PI) / 180;
      // Le haut du texte, (0, -1) dans son repère, une fois tourné…
      const haut = { x: Math.sin(a), y: -Math.cos(a) };
      // … regarde le coin, depuis le centre de la face.
      const l = distance(z.coin, z.centre);
      expect(haut.x).toBeCloseTo((z.coin.x - z.centre.x) / l, 9);
      expect(haut.y).toBeCloseTo((z.coin.y - z.centre.y) / l, 9);
      // Plié, ce haut monte vers le sommet : posé sur la face d'en face, le texte est à l'endroit.
      const f = plier(z.face), g = f(z.centre), pointe = f({ x: z.centre.x + haut.x, y: z.centre.y + haut.y });
      const versLeSommet = moins(T[z.sommet], g);
      expect(scalaire(moins(pointe, g), versLeSommet) / norme(versLeSommet)).toBeCloseTo(1, 9);
    }
    // Sur le papier, la pointe du haut se lit droite ; celle du bas du triangle du milieu, la tête en bas.
    const { P, B } = pointsDuPatron();
    expect(zones.find((z) => memePoint(z.coin, P))!.angle).toBeCloseTo(0, 9);
    expect(Math.abs(zones.find((z) => z.face === 0 && memePoint(z.coin, B))!.angle)).toBeCloseTo(180, 9);
  });

  it("pose le picto et le mot dans la zone, à sa marge, sans qu'ils se touchent", () => {
    const mots = [...LES_MODELES.emotions.etats, ...LES_MODELES.ouJenSuis.etats].map((e) => e.mot);
    for (const mot of [...mots, ...mots.map((m) => m.toLocaleUpperCase("fr-FR"))]) {
      for (const avecPicto of [true, false]) {
        const d = disposerLaZone(mot, avecPicto);
        expect(d.tropLong, mot).toBe(false);
        expect(d.taille, mot).toBeGreaterThanOrEqual(3);
        expect(d.lignes.map((l) => l.texte).join(" ")).toBe(mot);
        for (const l of d.lignes) {
          const haut = l.y - 0.93 * d.taille, bas = haut + 1.18 * d.taille;
          expect(largeurDuTexte(l.texte, d.taille, true), `${mot} : ${l.texte}`).toBeLessThanOrEqual(2 * Math.min(demiLargeur(haut), demiLargeur(bas)) + 1e-9);
          if (d.picto) expect(haut, mot).toBeGreaterThanOrEqual(d.picto.y + d.picto.cote);
        }
        if (avecPicto) {
          expect(d.picto, mot).not.toBeNull();
          expect(carreTient(d.picto!.y, d.picto!.cote), mot).toBe(true);
          expect(d.picto!.x).toBeCloseTo(-d.picto!.cote / 2, 9);
          expect(d.picto!.cote, mot).toBeGreaterThanOrEqual(16);
        } else expect(d.picto).toBeNull();
      }
    }
  });

  it("agrandit le mot sans picto, le picto sans mot, et dit quand un mot est trop long pour sa zone", () => {
    const avec = disposerLaZone("triste", true), seul = disposerLaZone("triste", false), image = disposerLaZone("", true);
    expect(seul.taille).toBeGreaterThan(avec.taille);
    expect(image.picto!.cote).toBeGreaterThan(avec.picto!.cote);
    expect(carreTient(image.picto!.y, image.picto!.cote)).toBe(true);
    expect(disposerLaZone("", false)).toEqual({ picto: null, lignes: [], taille: 0, tropLong: false });
    // Une phrase longue rapetisse ; trop longue, elle prend la place du picto, puis déborde.
    expect(disposerLaZone("j'ai une question qui peut attendre", true).taille).toBeLessThan(avec.taille);
    // Une longue phrase tient encore, en petit, avec un petit picto ; trois fois plus longue, plus rien ne tient.
    const phrase = "je suis en train de travailler tranquillement avec un camarade de la classe et tout se passe très bien pour nous deux";
    expect(disposerLaZone(phrase, true)).toMatchObject({ tropLong: false, picto: { cote: expect.any(Number) } });
    const fleuve = [phrase, phrase, phrase].join(" ");
    expect(disposerLaZone(fleuve, true).tropLong).toBe(true);
    expect(disposerLaZone(fleuve, false).tropLong).toBe(true);
    expect(disposerLaZone(fleuve, true).lignes.map((l) => l.texte).join(" ")).toBe(fleuve);
    const r = normaliserTetraedre({ etats: { emotions: [{}, { mot: fleuve }] } });
    expect(motsTropLongs(r, {})).toEqual([1]);
  });

  it("mesure les mots comme Arial les écrit", () => {
    // « m » est plus large que « i », le gras plus large que le maigre, et un accent ne change rien.
    expect(largeurDuTexte("m", 10)).toBeGreaterThan(largeurDuTexte("i", 10));
    expect(largeurDuTexte("content", 10, true)).toBeGreaterThan(largeurDuTexte("content", 10));
    expect(largeurDuTexte("colère", 10)).toBeCloseTo(largeurDuTexte("colere", 10), 9);
    // Cinq « a » d'Arial à 10 mm : 5 × 0,556 × 10, et 3 % de marge.
    expect(largeurDuTexte("aaaaa", 10)).toBeCloseTo(5 * 5.56 * 1.03, 6);
  });
});

describe("le tétraèdre des émotions : la feuille", () => {
  const images = { 35547: "data:content", 35545: "data:triste", 35539: "data:colere", 35535: "data:peur" };
  const zonesDe = (svg: string) => [...svg.matchAll(/class="te-zone" data-sommet="(\w)" points="[^"]*" fill="([^"]*)"/g)].map((m) => ({ sommet: m[1], fond: m[2] }));

  it("donne aux trois zones de chaque sommet la couleur de son état, son picto et son mot", () => {
    const r = TETRAEDRE_PAR_DEFAUT;
    const svg = svgDuTetraedre(r, images);
    const zones = zonesDe(svg);
    expect(zones).toHaveLength(12);
    r.etats.emotions.forEach((e, i) => {
      expect(zones.filter((z) => z.fond === hexDe(e.couleur)).map((z) => z.sommet)).toEqual([SOMMETS[i], SOMMETS[i], SOMMETS[i]]);
    });
    // Trois fois chaque picto dans les zones, une fois dans la légende ; chaque mot, trois fois dans les zones et une dans la légende.
    expect(svg.split('href="data:content"')).toHaveLength(5);
    expect(svg.split(">j&#39;ai peur<")).toHaveLength(5);
    expect(svg).toContain(">jaune<");
    expect(svg).toContain(`${CREDIT_ARASAAC.slice(0, 30)}`);
    expect(svg).toContain('width="277mm" height="186mm"');
    expect(htmlTetraedre(r, images)).toMatch(/^<div class="feuille te">/);
  });

  it("écrit le mot dans l'encre qui se lit le mieux sur sa couleur", () => {
    for (const c of COULEURS_TETRAEDRE) expect(contraste(c.hex, encreSur(c.hex)), c.nom).toBeGreaterThanOrEqual(4.5);
    expect(encreSur(hexDe("jaune"))).toBe("#1c2233");
    expect(encreSur(hexDe("bleu"))).toBe("#ffffff");
    const svg = svgDuTetraedre(TETRAEDRE_PAR_DEFAUT, {});
    expect(svg).toMatch(/fill="#ffffff">triste</);
    expect(svg).toMatch(/fill="#1c2233">content</);
  });

  it("en noir et blanc, laisse les zones blanches, à colorier d'après la légende, et passe les pictos en gris", () => {
    const r = { ...TETRAEDRE_PAR_DEFAUT, colorier: true };
    const svg = svgDuTetraedre(r, images);
    expect(zonesDe(svg).every((z) => z.fond === "#fff")).toBe(true);
    for (const e of r.etats.emotions) expect(svg).not.toContain(`fill="${hexDe(e.couleur)}"`);
    expect(svg.split('filter="url(#te-gris)"')).toHaveLength(17);
    // La légende dit la couleur de chaque mot, et la première consigne est de colorier.
    for (const nom of ["jaune", "bleu", "rouge", "violet"]) expect(svg).toContain(`>${nom}<`);
    expect(etapesDeMontage(true)[0].verbe).toBe("Je colorie");
    expect(htmlTetraedre(r, images)).toMatch(/^<div class="feuille te te-colorier">/);
  });

  it("écrit les consignes de montage en « Je + verbe », une action par étape", () => {
    for (const colorier of [false, true]) {
      for (const e of etapesDeMontage(colorier)) {
        expect(e.verbe).toMatch(/^Je [a-zé]+$/);
        expect(e.suite).toMatch(/\.$/);
      }
    }
    const svg = svgDuTetraedre(TETRAEDRE_PAR_DEFAUT, {});
    expect(svg).toContain(">Je découpe</tspan>");
    expect(svg).toContain("Pour monter le tétraèdre");
  });

  it("met les mots en capitales si on le demande, et n'écrit jamais de balise venue d'un mot", () => {
    const r = normaliserTetraedre({ capitales: true, etats: { emotions: [{ mot: "<b>joie</b> & co" }] } });
    const svg = svgDuTetraedre(r, {});
    expect(svg).toContain("&lt;B&gt;JOIE&lt;/B&gt;");
    expect(svg).not.toContain("<b>");
    expect(svg).toContain(">TRISTE<");
    expect(svg).not.toContain(">triste<");
  });

  it("cite ARASAAC quand ses pictos sont dessinés, et seulement alors", () => {
    expect(mentionsDesImages(TETRAEDRE_PAR_DEFAUT, images)).toEqual([CREDIT_ARASAAC]);
    expect(mentionsDesImages(TETRAEDRE_PAR_DEFAUT, {})).toEqual([]);
    // Une photo de l'enseignant n'a rien à attribuer.
    const photos = normaliserTetraedre({ etats: { emotions: [0, 1, 2, 3].map(() => ({ picto: { id: null, mot: "moi", photo: "moi.jpg" } })) } });
    expect(mentionsDesImages(photos, { "photo:moi.jpg": "data:moi" })).toEqual([]);
    expect(svgDuTetraedre(photos, { "photo:moi.jpg": "data:moi" })).not.toContain("ARASAAC");
  });

  it("loge la légende et les consignes dans les coins du haut, sans toucher le patron", () => {
    const { contour } = traitsDuPatron();
    const dedans = (p: Point) => {
      let oui = false;
      for (let i = 0, j = contour.length - 1; i < contour.length; j = i++) {
        const a = contour[i], b = contour[j];
        if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) oui = !oui;
      }
      return oui;
    };
    const cas: ReglagesTetraedre[] = [
      TETRAEDRE_PAR_DEFAUT, { ...TETRAEDRE_PAR_DEFAUT, colorier: true }, { ...TETRAEDRE_PAR_DEFAUT, modele: "ouJenSuis" },
      { ...TETRAEDRE_PAR_DEFAUT, modele: "ouJenSuis", capitales: true, colorier: true },
    ];
    for (const r of cas) {
      const { legende, consignes } = blocsDeLaPage(r, images);
      for (const b of [legende, consignes]) {
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.x + b.largeur).toBeLessThanOrEqual(PAGE_TETRAEDRE.largeur + 1e-9);
        // Chaque point du bord du bloc est hors du patron, et aucun coin du patron n'est dans le bloc.
        for (let k = 0; k <= 40; k++) {
          const t = k / 40;
          for (const p of [{ x: b.x + t * b.largeur, y: b.y }, { x: b.x + t * b.largeur, y: b.y + b.hauteur }, { x: b.x, y: b.y + t * b.hauteur }, { x: b.x + b.largeur, y: b.y + t * b.hauteur }]) {
            expect(dedans(p), `${r.modele} : (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`).toBe(false);
          }
        }
        for (const p of contour) expect(p.x > b.x && p.x < b.x + b.largeur && p.y > b.y && p.y < b.y + b.hauteur).toBe(false);
      }
      expect(legende.x).toBe(0);
      expect(consignes.x + consignes.largeur).toBeCloseTo(PAGE_TETRAEDRE.largeur, 9);
    }
    // La page est à l'italienne : c'est ce que lit la fabrication du PDF.
    expect(STYLE_TETRAEDRE).toContain("size: A4 landscape");
  });
});

describe("le tétraèdre des émotions : les réglages", () => {
  it("part des émotions, en couleur ; chaque modèle a ses quatre états, que l'on reprend neufs", () => {
    expect(normaliserTetraedre(undefined)).toEqual(TETRAEDRE_PAR_DEFAUT);
    expect(TETRAEDRE_PAR_DEFAUT.modele).toBe("emotions");
    expect(LES_MODELES.emotions.etats.map((e) => e.mot)).toEqual(["content", "triste", "en colère", "j'ai peur"]);
    expect(LES_MODELES.ouJenSuis.etats.map((e) => e.mot))
      .toEqual(["tout va bien", "je travaille avec quelqu'un", "j'ai une question qui peut attendre", "j'ai besoin d'aide tout de suite"]);
    for (const m of ["emotions", "ouJenSuis"] as const) {
      expect(LES_MODELES[m].etats.every((e) => e.picto.id != null && e.mot.trim())).toBe(true);
      // Quatre couleurs différentes : les sommets se distinguent de loin.
      expect(new Set(LES_MODELES[m].etats.map((e) => e.couleur)).size).toBe(4);
    }
    const neufs = etatsDuModele("emotions");
    neufs[0].picto.id = 1;
    neufs[0].mot = "x";
    expect(LES_MODELES.emotions.etats[0]).toEqual({ couleur: "jaune", picto: { id: 35547, mot: "content" }, mot: "content" });
    expect(titreDuTetraedre({ modele: "ouJenSuis" })).toBe("Le tétraèdre « Où j'en suis »");
  });

  it("répare des réglages abîmés : modèle inconnu, couleurs, nombre d'états, pictos, cases", () => {
    const r = normaliserTetraedre({
      modele: "meteo",
      etats: {
        emotions: [
          { couleur: "fuchsia", picto: { id: "12", mot: 3, photo: "../secret.jpg" }, mot: 42 },
          { couleur: "noir", picto: { id: -1 }, mot: "" },
          null,
          { couleur: "vert", mot: "calme" },
          { couleur: "rose", mot: "en trop" },
          { couleur: "rose", mot: "en trop" },
        ],
        ouJenSuis: "abîmé",
      },
      colorier: "oui",
      capitales: true,
    });
    expect(r.modele).toBe("emotions");
    expect(r.etats.emotions).toHaveLength(4);
    // La couleur inconnue reprend celle du modèle ; un mot qui n'en est pas aussi ; un picto illisible se vide.
    expect(r.etats.emotions[0]).toEqual({ couleur: "jaune", picto: { id: null, mot: "" }, mot: "content" });
    // Un état vidé à dessein le reste : la couleur choisie, ni picto ni mot.
    expect(r.etats.emotions[1]).toEqual({ couleur: "noir", picto: { id: null, mot: "" }, mot: "" });
    expect(r.etats.emotions[2]).toEqual(LES_MODELES.emotions.etats[2]);
    // Sans picto du tout, celui du modèle.
    expect(r.etats.emotions[3]).toEqual({ couleur: "vert", picto: LES_MODELES.emotions.etats[3].picto, mot: "calme" });
    expect(r.etats.ouJenSuis).toEqual(etatsDuModele("ouJenSuis"));
    expect(r.colorier).toBe(false);
    expect(r.capitales).toBe(true);
    // Les états d'un modèle ne bougent pas quand on change l'autre.
    const deux = normaliserTetraedre({ modele: "ouJenSuis", etats: { emotions: [{ mot: "joyeux" }] } });
    expect(deux.etats.emotions[0].mot).toBe("joyeux");
    expect(deux.etats.ouJenSuis[0].mot).toBe("tout va bien");
    expect(normaliserTetraedre(JSON.parse(JSON.stringify(deux)))).toEqual(deux);
  });
});
