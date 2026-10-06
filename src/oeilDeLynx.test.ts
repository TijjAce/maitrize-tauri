import { describe, it, expect } from "vitest";
import { hasard } from "./hasard";
import {
  NIVEAUX_LYNX, REGLAGES_LYNX, auTrait, cadrage, choisirDessins, consigneLynx, encombrement, foisDesModeles, htmlLynx, niveauModifie,
  SEUIL_ENCRE, enGris, encre, plancheLynx, reglagesLynxSurs, remplissage, sosieDe, variablesDuNiveau,
  type DessinLynx, type IdNiveauLynx, type PlaceLynx, type PlancheLynx, type ReglagesLynx, type SosieLynx,
} from "./oeilDeLynx";

const r = (p: Partial<ReglagesLynx> = {}) => reglagesLynxSurs({ ...REGLAGES_LYNX, ...p });
const auNiveau = (id: IdNiveauLynx, p: Partial<ReglagesLynx> = {}) => r({ niveau: id, ...variablesDuNiveau(id), ...p });

// Des dessins de toutes les formes : carrés, hauts, larges, très allongés.
const FORMES = [1, 0.6, 1.8, 1.2, 2.8, 0.8];
const VIVIER: DessinLynx[] = Array.from({ length: 220 }, (_, i) => ({ id: 1000 + i, mot: `objet ${i}` }));
const ratios: Record<number, number> = Object.fromEntries(
  [...VIVIER, ...Array.from({ length: 40 }, (_, i) => ({ id: 5000 + i }))].map((d, i) => [d.id, FORMES[i % FORMES.length]]),
);
const images = (p: PlancheLynx) => Object.fromEntries([...p.modeles, ...p.places].map((d) => [d.id, `data:image/png;base64,${d.id}`]));

/** Les quatre coins d'un dessin posé, penché, grossi de `marge` tout autour. */
function coins(d: PlaceLynx, marge: number): [number, number][] {
  const a = (d.angle * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const l = d.l / 2 + marge, h = d.h / 2 + marge;
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => [d.x + u * l * c - v * h * s, d.y + u * l * s + v * h * c]);
}

/** Deux dessins se touchent, à un demi-millimètre de blanc près de chaque côté : aucun côté de l'un ni de l'autre ne les sépare. */
function seTouchent(a: PlaceLynx, b: PlaceLynx): boolean {
  const pa = coins(a, 0.5), pb = coins(b, 0.5);
  for (const poly of [pa, pb]) for (let i = 0; i < 4; i++) {
    const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % 4];
    const projeter = (p: [number, number][]) => p.map(([x, y]) => x * (y2 - y1) + y * (x1 - x2));
    const A = projeter(pa), B = projeter(pb);
    if (Math.max(...A) <= Math.min(...B) || Math.max(...B) <= Math.min(...A)) return false;
  }
  return true;
}

function verifierPlanche(p: PlancheLynx, quoi: string) {
  for (const d of p.places) {
    const [bl, bh] = encombrement(d.l, d.h, d.angle);
    expect(d.x - bl / 2, quoi).toBeGreaterThanOrEqual(-0.01);
    expect(d.y - bh / 2, quoi).toBeGreaterThanOrEqual(-0.01);
    expect(d.x + bl / 2, quoi).toBeLessThanOrEqual(p.cadre.l + 0.01);
    expect(d.y + bh / 2, quoi).toBeLessThanOrEqual(p.cadre.h + 0.01);
  }
  for (let i = 0; i < p.places.length; i++) for (let j = i + 1; j < p.places.length; j++) {
    expect(seTouchent(p.places[i], p.places[j]), `${quoi} : ${p.places[i].mot} et ${p.places[j].mot}`).toBe(false);
  }
}

describe("l'œil de lynx", () => {
  it("cache chaque modèle dans l'image, sans que deux dessins se touchent, à chaque niveau", () => {
    for (const n of NIVEAUX_LYNX) for (const graine of [1, 2, 3, 42]) {
      const reglages = auNiveau(n.id, { ressemblants: false });
      const choix = choisirDessins([], VIVIER, reglages, graine);
      const p = plancheLynx(choix, [], ratios, reglages, graine);
      const quoi = `${n.id} · ${graine}`;
      expect(p.modeles, quoi).toHaveLength(n.modeles);
      for (const m of p.modeles) expect(p.places.filter((d) => d.role === "cible" && d.id === m.id), quoi).toHaveLength(1);
      // Aucun dessin caché ne porte le mot d'un modèle : on n'entoure que ce qu'on cherche.
      const mots = new Set(p.modeles.map((m) => m.mot));
      expect(p.places.filter((d) => d.role === "intrus" && mots.has(d.mot)), quoi).toEqual([]);
      // L'image montre ce qu'on a demandé, à deux dessins près au plus quand elle est pleine.
      expect(p.nonPlaces, quoi).toBeLessThanOrEqual(2);
      expect(p.places.length + p.nonPlaces, quoi).toBe(n.dessins);
      verifierPlanche(p, quoi);
    }
  });

  it("reprend le même tirage à l'identique, et en change avec la graine", () => {
    const reglages = auNiveau("difficile");
    const une = plancheLynx(choisirDessins([], VIVIER, reglages, 7), [], ratios, reglages, 7);
    expect(plancheLynx(choisirDessins([], VIVIER, reglages, 7), [], ratios, reglages, 7)).toEqual(une);
    const autre = plancheLynx(choisirDessins([], VIVIER, reglages, 8), [], ratios, reglages, 8);
    expect(autre.modeles.map((m) => m.id)).not.toEqual(une.modeles.map((m) => m.id));
  });

  it("cherche les mots de la classe, et cache dans l'image ceux qui ne sont pas tirés", () => {
    const classe: DessinLynx[] = ["citrouille", "chauve-souris", "fantôme", "chapeau", "balai", "chaudron", "araignée", "bonbon", "lune", "hibou"]
      .map((mot, i) => ({ id: 9000 + i, mot }));
    const reglages = auNiveau("moyen", { modeles: 4 });
    const choix = choisirDessins(classe, VIVIER, reglages, 3);
    expect(choix.deLaListe).toBe(true);
    expect(choix.modeles).toHaveLength(4);
    for (const m of choix.modeles) expect(classe.map((c) => c.id)).toContain(m.id);
    // Les six autres mots de la classe se cachent d'abord ; la banque complète.
    const autres = classe.filter((c) => !choix.modeles.some((m) => m.id === c.id)).map((c) => c.id).sort();
    expect(choix.intrus.slice(0, 6).map((d) => d.id).sort()).toEqual(autres);
    // De quoi remplir l'image, et quelques-uns d'avance.
    expect(choix.intrus.length).toBeGreaterThan(reglages.dessins - 4);
    // Sans banque et avec une liste courte : les mêmes dessins reviennent, plutôt qu'une image vide.
    const seuls = choisirDessins(classe.slice(0, 5), [], reglages, 3);
    const p = plancheLynx(seuls, [], Object.fromEntries(classe.map((c) => [c.id, 1])), reglages, 3);
    expect(p.places.length + p.nonPlaces).toBe(reglages.dessins);
    expect(new Set(seuls.intrus.map((d) => d.id)).size).toBe(1);
  });

  it("tire les modèles parmi les dessins que les enfants connaissent, quand la banque les dit", () => {
    const familiers = new Set(VIVIER.filter((_, i) => i % 3 === 0).map((d) => d.id));
    const choix = choisirDessins([], VIVIER, auNiveau("expert"), 5, new Set(), familiers);
    expect(choix.modeles.every((m) => familiers.has(m.id))).toBe(true);
    // Les dessins qui les cachent viennent de toute la banque.
    expect(choix.intrus.some((d) => !familiers.has(d.id))).toBe(true);
    // Trop peu de familiers pour les modèles demandés : toute la banque.
    expect(choisirDessins([], VIVIER, auNiveau("expert"), 5, new Set(), new Set([VIVIER[0].id])).modeles).toHaveLength(10);
  });

  it("complète l'image quand un modèle n'a pas de sosie dans la banque", () => {
    const reglages = auNiveau("expert");
    const choix = choisirDessins([], VIVIER, reglages, 6);
    const p = plancheLynx(choix, [{ id: 5000, mot: choix.modeles[0].mot, de: choix.modeles[0].id }], ratios, reglages, 6);
    expect(p.places.filter((d) => d.role === "sosie")).toHaveLength(1);
    expect(p.places.length + p.nonPlaces).toBe(reglages.dessins);
  });

  it("écarte une scène de la banque sans rien changer d'autre au tirage", () => {
    const reglages = auNiveau("moyen");
    const avant = choisirDessins([], VIVIER, reglages, 12);
    const scene = avant.modeles[2].id;
    const apres = choisirDessins([], VIVIER, reglages, 12, new Set([scene]));
    const ids = (l: DessinLynx[]) => l.map((d) => d.id);
    // Le suivant du tirage prend sa place ; les autres modèles restent, dans le même ordre.
    expect(ids(apres.modeles).slice(0, 5)).toEqual(ids(avant.modeles).filter((id) => id !== scene));
    expect(ids(apres.modeles)).not.toContain(scene);
    expect(ids(apres.intrus)).not.toContain(scene);
    expect(apres.modeles.map((m) => m.fois)).toEqual(avant.modeles.map((m) => m.fois));
    // Les mots de la classe ne s'écartent jamais : c'est l'enseignant qui les a choisis.
    const classe = [{ id: 1, mot: "boutique" }, { id: 2, mot: "billet" }];
    expect(ids(choisirDessins(classe, VIVIER, auNiveau("moyen", { modeles: 2 }), 1, new Set([1, 2])).modeles).sort()).toEqual([1, 2]);
  });

  it("garde aux niveaux faciles le modèle à la taille du dessin caché", () => {
    for (const id of ["decouverte", "facile"] as const) {
      const reglages = auNiveau(id);
      const p = plancheLynx(choisirDessins([], VIVIER, reglages, 5), [], ratios, reglages, 5);
      for (const m of p.modeles) {
        const cache = p.places.find((d) => d.role === "cible" && d.id === m.id)!;
        expect(m.l, `${id} : ${m.mot}`).toBeCloseTo(cache.l, 1);
        expect(m.h, `${id} : ${m.mot}`).toBeCloseTo(cache.h, 1);
        expect(Math.max(m.l, m.h)).toBeLessThanOrEqual(p.caseModele - 2.9);
      }
      // Ni penché, ni retourné.
      expect(p.places.every((d) => d.angle === 0 && !d.miroir)).toBe(true);
    }
  });

  it("range les dessins en lignes régulières à la découverte : on balaie l'image comme on lira", () => {
    const reglages = auNiveau("decouverte");
    const p = plancheLynx(choisirDessins([], VIVIER, reglages, 9), [], ratios, reglages, 9);
    const colonnes = new Set(p.places.map((d) => d.x.toFixed(2)));
    const lignes = new Set(p.places.map((d) => d.y.toFixed(2)));
    expect(colonnes.size * lignes.size).toBeGreaterThanOrEqual(p.places.length);
    expect(colonnes.size * lignes.size).toBeLessThan(p.places.length + Math.max(colonnes.size, lignes.size));
  });

  it("penche et retourne des dessins quand on le demande, les modèles compris", () => {
    const reglages = auNiveau("expert", { ressemblants: false });
    const p = plancheLynx(choisirDessins([], VIVIER, reglages, 11), [], ratios, reglages, 11);
    const penches = p.places.filter((d) => d.angle !== 0);
    expect(penches.length).toBeGreaterThan(p.places.length / 4);
    expect(penches.every((d) => Math.abs(d.angle) >= 12 && Math.abs(d.angle) <= 40)).toBe(true);
    expect(p.places.some((d) => d.miroir)).toBe(true);
    // Des tailles variées : du simple au double, au moins.
    const tailles = p.places.map((d) => Math.sqrt(d.l * d.h));
    expect(Math.max(...tailles) / Math.min(...tailles)).toBeGreaterThan(1.8);
  });

  it("cache chaque modèle une à trois fois quand on compte, et le corrigé donne les nombres", () => {
    expect(foisDesModeles(4, false, hasard(1))).toEqual([1, 1, 1, 1]);
    for (let g = 0; g < 30; g++) {
      const fois = foisDesModeles(5, true, hasard(g));
      expect(fois.every((f) => f >= 1 && f <= 3)).toBe(true);
      expect(new Set(fois).size).toBeGreaterThan(1);
    }
    const reglages = auNiveau("moyen", { compter: true });
    const choix = choisirDessins([], VIVIER, reglages, 4);
    const p = plancheLynx(choix, [], ratios, reglages, 4);
    for (const m of p.modeles) expect(p.places.filter((d) => d.role === "cible" && d.id === m.id)).toHaveLength(m.fois);
    expect(p.places.length + p.nonPlaces).toBe(reglages.dessins);
    verifierPlanche(p, "compter");
    const html = htmlLynx(p, images(p), reglages);
    expect(consigneLynx(reglages)).toContain("Combien de fois");
    const [feuille, corrige] = html.split('class="page lx-page corrige"');
    expect(feuille.match(/class="lx-compte"><\/div>/g)).toHaveLength(p.modeles.length);
    expect(corrige.match(/class="lx-compte"><b>[123]<\/b>/g)).toHaveLength(p.modeles.length);
  });

  it("glisse un sosie par modèle quand on les demande : le même mot, un autre dessin, à ne pas entourer", () => {
    expect(sosieDe({ id: 1, mot: "Chat" }, [{ id: 1, mot: "chat" }, { id: 2, mot: "chaton" }, { id: 3, mot: "chat " }])).toEqual({ id: 3, mot: "chat ", de: 1 });
    expect(sosieDe({ id: 1, mot: "clé" }, [{ id: 1, mot: "clé" }])).toBeNull();
    const reglages = auNiveau("expert");
    const choix = choisirDessins([], VIVIER, reglages, 6);
    const sosies: SosieLynx[] = choix.modeles.map((m, i) => ({ id: 5000 + i, mot: m.mot, de: m.id }));
    const p = plancheLynx(choix, sosies, ratios, reglages, 6);
    expect(p.places.filter((d) => d.role === "sosie")).toHaveLength(choix.modeles.length);
    expect(p.places.length + p.nonPlaces).toBe(reglages.dessins);
    verifierPlanche(p, "sosies");
    const html = htmlLynx(p, images(p), reglages);
    expect(consigneLynx(reglages)).toContain("se ressemblent");
    const corrige = html.split('class="page lx-page corrige"')[1];
    expect(corrige.match(/class="lx-rond"/g)).toHaveLength(choix.modeles.length);
    expect(corrige.match(/class="lx-rond lx-piege"/g)).toHaveLength(choix.modeles.length);
  });

  it("écrit la feuille avec sa consigne, la ligne du prénom, ses modèles, son cadre, puis le corrigé", () => {
    const reglages = auNiveau("difficile", { legendes: true });
    const p = plancheLynx(choisirDessins([], VIVIER, reglages, 2), [], ratios, reglages, 2);
    const html = htmlLynx(p, images(p), reglages);
    expect(html).toContain('<p class="consigne lx-consigne">Observe l&#39;image et entoure les dessins demandés.</p>');
    expect(html).toMatch(/<div class="lx-nom">Prénom : \.+ Date : \.+<\/div>/);
    expect(html.match(/class="lx-d"/g)).toHaveLength(p.places.length * 2);
    expect(html.match(/class="lx-mot"/g)).toHaveLength(p.modeles.length * 2);
    expect(html).toContain("Œil de lynx — corrigé");
    expect(html.match(/class="lx-rond"/g)).toHaveLength(p.modeles.length);
    expect(html).toContain("ARASAAC");
    expect(html).not.toContain("dessins au trait");
    expect(htmlLynx(p, images(p), { ...reglages, trait: true })).toContain("Les dessins au trait sont tirés de ces pictogrammes");
    // Rien de prêt : la feuille le dit, sans planche.
    expect(htmlLynx(null, {}, reglages)).toContain("Les dessins se préparent");
  });

  it("laisse au cadre une bonne hauteur, quels que soient les modèles et leurs cases", () => {
    const hauteur = (p: Partial<ReglagesLynx>) => {
      const reglages = auNiveau("difficile", p);
      return plancheLynx(choisirDessins([], VIVIER, reglages, 1), [], ratios, reglages, 1).cadre.h;
    };
    expect(hauteur({})).toBeGreaterThan(170);
    expect(hauteur({ legendes: true, compter: true })).toBeLessThan(hauteur({}));
    // Onze modèles et plus : deux rangées, un cadre plus bas, encore grand.
    expect(hauteur({ modeles: 12 })).toBeLessThan(hauteur({}));
    expect(hauteur({ modeles: 12, legendes: true, compter: true })).toBeGreaterThan(120);
  });

  it("garde des réglages sûrs, et dit quand on s'écarte du niveau", () => {
    expect(reglagesLynxSurs({ modeles: 40, dessins: 3 } as Partial<ReglagesLynx>)).toMatchObject({ modeles: 12, dessins: 13 });
    expect(reglagesLynxSurs({ niveau: "inconnu" as IdNiveauLynx, disposition: "spirale" as never }).niveau).toBe("difficile");
    expect(reglagesLynxSurs({ disposition: "spirale" as never }).disposition).toBe("vrac");
    expect(niveauModifie(auNiveau("moyen"))).toBe(false);
    expect(niveauModifie(auNiveau("moyen", { trait: true }))).toBe(true);
    // Le titre ou la version « combien de fois » ne sont pas des variables du niveau.
    expect(niveauModifie(auNiveau("moyen", { compter: true, titre: "Halloween" }))).toBe(false);
  });
});

describe("les dessins de l'œil de lynx", () => {
  const image = (l: number, h: number, peindre: (x: number, y: number) => [number, number, number, number]) => {
    const rgba = new Uint8ClampedArray(l * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < l; x++) rgba.set(peindre(x, y), (y * l + x) * 4);
    return rgba;
  };

  it("se rognent à ce qui est peint, ou à ce qui n'est pas blanc", () => {
    const detoure = image(10, 10, (x, y) => (x >= 4 && x < 7 && y >= 5 && y < 7 ? [200, 30, 30, 255] : [0, 0, 0, 0]));
    expect(cadrage(detoure, 10, 10)).toEqual({ x: 4, y: 5, l: 3, h: 2 });
    const photo = image(10, 10, (x, y) => (x === 2 && y === 8 ? [40, 40, 40, 255] : [255, 255, 255, 255]));
    expect(cadrage(photo, 10, 10)).toEqual({ x: 2, y: 8, l: 1, h: 1 });
    expect(cadrage(image(4, 4, () => [0, 0, 0, 0]), 4, 4)).toEqual({ x: 0, y: 0, l: 4, h: 4 });
  });

  it("disent quelle part de leur cadre ils remplissent : une scène le remplit tout entier", () => {
    const scene = image(4, 4, () => [10, 120, 200, 255]);
    expect(remplissage(scene, 4, cadrage(scene, 4, 4))).toBe(1);
    const balle = image(4, 4, (x, y) => ((x + y) % 2 ? [200, 30, 30, 255] : [0, 0, 0, 0]));
    expect(remplissage(balle, 4, cadrage(balle, 4, 4))).toBe(0.5);
  });

  it("passent au trait : le contour noir reste, les aplats blanchissent, même un rouge vif", () => {
    const couleurs: [number, number, number, number][] = [[0, 0, 0, 255], [230, 20, 20, 255], [20, 20, 140, 255], [255, 255, 255, 255], [0, 0, 0, 0]];
    const pictogramme = image(5, 4, (x, y) => (y === 3 ? [0, 0, 0, 0] : couleurs[x]));
    const trait = auTrait(pictogramme, 5, 4);
    const point = (x: number) => [...trait.slice(x * 4, x * 4 + 4)];
    expect(point(0)).toEqual([0, 0, 0, 255]);
    expect(point(1)).toEqual([255, 255, 255, 255]);
    expect(point(2)).toEqual([255, 255, 255, 255]);
    expect(point(3)).toEqual([255, 255, 255, 255]);
    expect(point(4)).toEqual([0, 0, 0, 0]);
    // Un ressort arc-en-ciel n'a pas de contour : au trait, il n'en resterait rien. Il passe en gris.
    const rubans = [[230, 20, 20, 255], [20, 200, 40, 255], [250, 220, 0, 255]];
    const arcEnCiel = image(8, 1, (x) => (rubans[x] ?? [0, 0, 0, 0]) as [number, number, number, number]);
    expect(encre(auTrait(arcEnCiel, 8, 1))).toBeLessThan(SEUIL_ENCRE);
    expect(encre(trait)).toBeGreaterThan(SEUIL_ENCRE);
    expect([...enGris(arcEnCiel).slice(0, 4)]).toEqual([83, 83, 83, 255]);
    // Une photo n'a pas de contour : elle passe en gris.
    const photo = auTrait(image(2, 1, (x) => (x ? [230, 20, 20, 255] : [255, 255, 255, 255])), 2, 1);
    expect([...photo.slice(4, 8)]).toEqual([83, 83, 83, 255]);
  });
});
