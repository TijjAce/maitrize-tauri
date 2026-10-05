import { describe, it, expect } from "vitest";
import {
  DISPOSITIONS, JUSQUA, OBSERVABLES, REGLAGES_COLLECTIONS, SITUATIONS, cequiManque, codeDeLaFiche, consigneDeLaSituation, doigtsSvg,
  fichesDeLaFeuille, htmlCollections, messagesDuPanier, panierSvg, partieDuGroupe, placesDeLaFiche, pointsSvg, quantites, reglagesDuNiveau,
  reglagesSurs, type Disposition, type ReglagesCollections,
} from "./collections";
import { LARGEUR_CONTENU_MM } from "./cartesImprimables";
import { hasard } from "./hasard";

const r = (m: Partial<ReglagesCollections>): ReglagesCollections => reglagesSurs({ ...REGLAGES_COLLECTIONS, ...m });
const IMAGES = { 2304: "data:lit", 4945: "data:ourson", 2532: "data:assiette", 2462: "data:pomme" };
const feuille = (m: Partial<ReglagesCollections>, graine = 3) => htmlCollections(r(m), IMAGES, hasard(graine));
const compter = (html: string, motif: RegExp) => (html.match(motif) ?? []).length;

describe("les réglages", () => {
  it("suivent le programme : trois, voire quatre avant 4 ans ; six à partir de 4 ans ; dix à partir de 5 ans", () => {
    expect(JUSQUA).toEqual({ PS: 3, MS: 6, GS: 10 });
    expect(reglagesDuNiveau("PS")).toMatchObject({ de: 1, a: 3, situation: "poupees" });
    expect(reglagesDuNiveau("MS")).toMatchObject({ a: 6, situation: "dortoir" });
    expect(reglagesDuNiveau("GS")).toMatchObject({ a: 10, situation: "voyageurs", places: "ronds" });
  });

  it("se réparent : des bornes tenues, des choix connus, jamais de liste vide", () => {
    const repare = reglagesSurs({ de: 0, a: 40, dispositions: [], representations: ["rien" as never], situation: "lune" as never, forme: "x" as never });
    expect([repare.de, repare.a]).toEqual([1, 10]);
    expect(repare.dispositions.length).toBeGreaterThan(0);
    expect(repare.representations.length).toBeGreaterThan(0);
    expect(repare.situation).toBe(REGLAGES_COLLECTIONS.situation);
    expect(reglagesSurs({ de: 7, a: 3 }).a).toBe(7);
    expect(quantites({ de: 2, a: 5 })).toEqual([2, 3, 4, 5]);
  });

  it("disent ce qui manque", () => {
    expect(cequiManque(r({ forme: "panier", de: 1, a: 1 }))).toMatch(/deux/);
    expect(cequiManque(r({ forme: "panier" }))).toBeNull();
    expect(cequiManque(r({ forme: "fiches" }))).toBeNull();
  });
});

describe("les places d'une fiche", () => {
  const zones = [[156, 240, 46], [156, 105, 34]] as const;
  it("tiennent dans la zone et ne se touchent jamais, de 1 à 10, dans toutes les dispositions", () => {
    for (const [largeur, hauteur, max] of zones) for (const d of DISPOSITIONS.map((x) => x.id)) for (let n = 1; n <= 10; n++) for (const graine of [1, 2, 3]) {
      const { centres, diametre } = placesDeLaFiche(n, d, largeur, hauteur, max, hasard(graine));
      const quoi = `${n} ${d} ${largeur}×${hauteur}`;
      expect(centres, quoi).toHaveLength(n);
      expect(diametre, quoi).toBeGreaterThan(12);
      expect(diametre, quoi).toBeLessThanOrEqual(max);
      for (const [x, y] of centres) {
        expect(x - diametre / 2, quoi).toBeGreaterThanOrEqual(-0.01);
        expect(y - diametre / 2, quoi).toBeGreaterThanOrEqual(-0.01);
        expect(x + diametre / 2, quoi).toBeLessThanOrEqual(largeur + 0.01);
        expect(y + diametre / 2, quoi).toBeLessThanOrEqual(hauteur + 0.01);
      }
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        expect(Math.hypot(centres[i][0] - centres[j][0], centres[i][1] - centres[j][1]), quoi).toBeGreaterThan(diametre);
      }
    }
  });

  it("au-delà de six, la constellation est cinq et encore… : deux groupes bien séparés", () => {
    const { centres, diametre } = placesDeLaFiche(7, "constellation", 156, 240, 46, hasard(1));
    const xs = centres.map((c) => c[0]).sort((a, b) => a - b);
    const ecarts = xs.slice(1).map((x, i) => x - xs[i]);
    expect(Math.max(...ecarts)).toBeGreaterThan(diametre * 1.5);
    expect(xs.filter((x) => x < xs[0] + Math.max(...ecarts)).length).toBe(5);
  });

  it("en deux groupes, chaque partie se lit comme un dé : six au plus", () => {
    for (let n = 2; n <= 10; n++) for (let g = 0; g < 20; g++) {
      const b = partieDuGroupe(n, hasard(g));
      expect(b).toBeGreaterThanOrEqual(1);
      expect(n - b).toBeLessThanOrEqual(6);
      expect(b).toBeLessThanOrEqual(n - b);
    }
  });
});

describe("les fiches de places", () => {
  it("une fiche par quantité et par disposition — une seule pour une place —, chacune avec ses places, et la clé pour le maître", () => {
    const m = { de: 1, a: 4, dispositions: ["rangee", "vrac"] as Disposition[], places: "ronds" as const, grandes: true };
    expect(fichesDeLaFeuille(r(m))).toHaveLength(1 + 3 * 2);
    const html = feuille(m);
    expect(compter(html, /class="cl-fiche"/g)).toBe(7);
    expect(compter(html, /class="cl-rond"/g)).toBe(1 + 2 * (2 + 3 + 4));
    expect(html).toMatch(/class="cl-cle corrige"/);
    expect(html).toContain(consigneDeLaSituation(SITUATIONS.find((s) => s.id === "dortoir")!).replace(/'/g, "&#39;"));
    // Une page par fiche, après la page du maître ; deux par page sinon.
    expect(compter(html, /<div class="page">/g)).toBe(1 + 7);
    expect(compter(feuille({ ...m, grandes: false }), /<div class="page">/g)).toBe(1 + 4);
  });

  it("ne dit jamais son nombre : une lettre la désigne", () => {
    const html = feuille({ de: 3, a: 6, dispositions: ["constellation"] });
    const fiches = html.split('class="cl-fiche"').slice(1);
    expect(fiches).toHaveLength(4);
    fiches.forEach((f, i) => {
      const tete = /cl-fiche-tete">([^<]*)</.exec(f)![1];
      expect(tete).toMatch(new RegExp(`fiche ${codeDeLaFiche(i)}$`));
      expect(tete).not.toMatch(/\d/);
    });
    expect([0, 25, 26, 27].map(codeDeLaFiche)).toEqual(["A", "Z", "AA", "AB"]);
  });

  it("dessine les places de la situation — des lits —, ou des ronds quand on va vers l'abstraction", () => {
    expect(compter(feuille({ de: 2, a: 2, dispositions: ["rangee"], places: "dessins" }), /class="cl-dessin" src="data:lit"/g)).toBe(2);
    // Sans l'image, des ronds : la fiche se fait quand même.
    const sans = htmlCollections(r({ de: 2, a: 2, dispositions: ["rangee"], places: "dessins" }), {}, hasard(1));
    expect(compter(sans, /class="cl-rond"/g)).toBe(2);
    expect(sans).not.toContain("ARASAAC");
  });

  it("garde le même tirage pour la même graine : l'aperçu est ce qui s'imprime", () => {
    const m = { de: 5, a: 8, dispositions: ["vrac", "groupes"] as Disposition[] };
    expect(feuille(m, 9)).toBe(feuille(m, 9));
    expect(feuille(m, 9)).not.toBe(feuille(m, 10));
  });
});

describe("les cartes-nombres, les bons, la bande", () => {
  it("une carte carrée par nombre, avec les représentations choisies", () => {
    const html = feuille({ forme: "cartes", de: 1, a: 7, representations: ["points", "doigts", "chiffre"] });
    expect(compter(html, /class="carte cl-carte r3"/g)).toBe(7);
    expect(compter(html, /class="cl-points/g)).toBe(7);
    expect(compter(html, /class="cl-doigts/g)).toBe(7);
    expect(html).toMatch(/grid-template-columns: repeat\(3, 54mm\); grid-auto-rows: 54mm/);
    expect(54 * 3).toBeLessThanOrEqual(LARGEUR_CONTENU_MM);
    expect(html).toContain("Donne-moi");
  });

  it("dessine les doigts comme on compte en France, une main puis deux ; les points d'un dé, puis cinq et encore…", () => {
    // Repliés, l'index, le majeur, l'annulaire et l'auriculaire ne dépassent la paume que d'un bout ; levé, le pouce s'écarte.
    const replies = (svg: string) => (svg.match(/ y="26"/g) ?? []).length;
    expect(replies(doigtsSvg(1))).toBe(4);
    expect(doigtsSvg(1)).toContain("rotate(-32)");
    // Trois : le pouce, l'index, le majeur.
    expect(replies(doigtsSvg(3))).toBe(2);
    expect(replies(doigtsSvg(5))).toBe(0);
    expect(replies(doigtsSvg(8))).toBe(2);
    expect(doigtsSvg(5).match(/<g /g)).toHaveLength(1);
    expect(doigtsSvg(8).match(/<g /g)).toHaveLength(2);
    expect(pointsSvg(4).match(/<circle/g)).toHaveLength(4);
    expect(pointsSvg(9).match(/<rect/g)).toHaveLength(2);
    expect(pointsSvg(9).match(/<circle/g)).toHaveLength(9);
  });

  it("des bons de commande à l'objet de la situation, avec le prénom et le modèle des chiffres", () => {
    const html = feuille({ forme: "bons", a: 6 });
    expect(compter(html, /class="cl-bon"/g)).toBe(6);
    expect(compter(html, /src="data:ourson"/g)).toBe(6);
    expect(html).toContain("Prénom :");
    expect(compter(html.split('class="cl-modele"')[1].split("</div>")[0], /<span>/g)).toBe(6);
  });

  it("une bande numérique de 1 au plus grand nombre", () => {
    const html = feuille({ forme: "bande", a: 10 });
    const bande = html.split('class="cl-bande"')[1].split('class="cl-bande"')[0];
    expect(compter(bande, /<b>\d+<\/b>/g)).toBe(10);
    expect(compter(html, /class="cl-bande"/g)).toBe(12);
  });
});

describe("le bon panier et la grille", () => {
  it("chaque message a son panier : juste ce qu'il faut d'œufs ; des voisins font hésiter", () => {
    const reglages = r({ forme: "panier", niveau: "GS", de: 4, a: 10 });
    const messages = messagesDuPanier(reglages, hasard(4));
    expect(messages).toHaveLength(6);
    for (const m of messages) {
      expect(m.a).toBeGreaterThanOrEqual(1);
      expect(m.b).toBeGreaterThanOrEqual(1);
      expect(m.a + m.b).toBeLessThanOrEqual(10);
    }
    const html = htmlCollections(reglages, {}, hasard(4));
    const paniers = html.split('class="cl-panier"').slice(1).map((p) => compter(p.split("</svg>")[0], /<ellipse/g));
    for (const m of messages) expect(paniers).toContain(m.a + m.b);
    expect(paniers.length).toBeGreaterThan(messages.length);
    expect(html).toMatch(/class="page corrige"[\s\S]*le panier de/);
    // Un panier compte ses œufs, rangés comme le message ou en rangées de cinq.
    expect(compter(panierSvg(9, [4, 5]), /<ellipse/g)).toBe(9);
    expect(compter(panierSvg(10, null), /<ellipse/g)).toBe(10);
  });

  it("la grille observe ce que le programme attend à cet âge, et la procédure", () => {
    for (const niveau of ["PS", "MS", "GS"] as const) {
      const html = feuille({ forme: "evaluation", niveau });
      for (const o of OBSERVABLES[niveau]) expect(html).toContain(o.replace(/'/g, "&#39;"));
      expect(html).toContain("Procédure");
      expect(html).not.toContain("ARASAAC");
    }
  });
});
