import { describe, expect, it } from "vitest";
import {
  ECRITURE_MS, PATIENCE_APRES_LE_CLIC_MS, SURVOL_AU_REPOS, avancementDeLEcriture, barresDuZ, estUnLancement, etatDeLaPage, suivreLaSouris, tempsDuFond, toucheQuiFaitEntrer,
} from "./bienvenueDeroule";
import { miseEnPage } from "./bienvenueRendu";

const memoire = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } }; };
/** Une police de chasse fixe, à peu près celle de Marelle. */
const mesure = (t: string) => t.length * 0.64;

describe("la page de bienvenue, à chaque lancement", () => {
  it("s'ouvre une fois par session : la fenêtre qui se recharge n'est pas un lancement", () => {
    const s = memoire();
    expect(estUnLancement(s)).toBe(true);
    expect(estUnLancement(s)).toBe(false);
    expect(estUnLancement(memoire())).toBe(true);
    expect(estUnLancement(null)).toBe(true);
    // Un stockage qui refuse : on accueille plutôt que d'échouer.
    expect(estUnLancement({ getItem: () => { throw new Error("non"); }, setItem: () => {} })).toBe(true);
  });

  it("écrit le titre d'un mouvement continu, du premier point à la dernière lettre", () => {
    expect(avancementDeLEcriture(0)).toBe(0);
    expect(avancementDeLEcriture(ECRITURE_MS)).toBeCloseTo(1.06);
    expect(avancementDeLEcriture(ECRITURE_MS * 2)).toBeCloseTo(1.06);
    let avant = -1;
    for (let t = 0; t <= ECRITURE_MS; t += 16) {
      const ici = avancementDeLEcriture(t);
      expect(ici).toBeGreaterThan(avant);
      avant = ici;
    }
  });

  it("laisse le fond couler, ralentir sans à-coup, et s'arrêter quand le titre est écrit", () => {
    let avant = tempsDuFond(0), plusGrandPas = 0;
    for (let t = 16; t <= ECRITURE_MS; t += 16) {
      const ici = tempsDuFond(t);
      expect(ici).toBeGreaterThanOrEqual(avant);
      plusGrandPas = Math.max(plusGrandPas, ici - avant);
      avant = ici;
    }
    // Jamais plus vite que le temps lui-même : pas de saut.
    expect(plusGrandPas).toBeLessThanOrEqual(0.0161);
    expect(tempsDuFond(ECRITURE_MS + 5000)).toBeCloseTo(tempsDuFond(ECRITURE_MS));
  });

  const etat = (o: Partial<Parameters<typeof etatDeLaPage>[0]>) => etatDeLaPage({ ecoule: 0, debutEcriture: 100, appPrete: false, appPosee: false, passeeDepuis: null, immobile: false, ...o });

  it("ne charge l'application qu'une fois le titre écrit : rien ne le fait saccader", () => {
    expect(etat({ ecoule: 100 + ECRITURE_MS - 1 }).chargerLApp).toBe(false);
    expect(etat({ ecoule: 100 + ECRITURE_MS }).chargerLApp).toBe(true);
    // Toucher la page, ou une préparation qui n'aboutit pas : on n'attend pas.
    expect(etat({ ecoule: 300, passeeDepuis: 0 }).chargerLApp).toBe(true);
    expect(etat({ ecoule: 7000, debutEcriture: null }).chargerLApp).toBe(true);
    // Sans mouvement, rien à protéger.
    expect(etat({ ecoule: 110, immobile: true }).chargerLApp).toBe(true);
  });

  it("attend qu'on clique, sans limite, même l'application prête derrière elle", () => {
    expect(etat({ ecoule: 100 + ECRITURE_MS + 60_000, appPrete: true, appPosee: true }).partir).toBe(false);
    expect(etat({ ecoule: 3_600_000, appPrete: true, appPosee: true }).partir).toBe(false);
    expect(etat({ ecoule: 3_600_000 }).partir).toBe(false);
    expect(etat({ ecoule: 5000, passeeDepuis: 0, appPrete: true, appPosee: true }).partir).toBe(true);
  });

  it("après le clic, ne s'efface que devant une application prête et posée ; une application qui ne vient pas ne la retient pas", () => {
    expect(etat({ ecoule: 500, passeeDepuis: 0 }).partir).toBe(false);
    expect(etat({ ecoule: 500, passeeDepuis: 0, appPrete: true }).partir).toBe(false);
    expect(etat({ ecoule: 500, passeeDepuis: 0, appPrete: true, appPosee: true }).partir).toBe(true);
    expect(etat({ ecoule: 30_000, passeeDepuis: PATIENCE_APRES_LE_CLIC_MS }).partir).toBe(false);
    expect(etat({ ecoule: 30_000, passeeDepuis: PATIENCE_APRES_LE_CLIC_MS + 1 }).partir).toBe(true);
  });

  it("fait entrer par une touche, sauf celles qui servent à autre chose", () => {
    const touche = (key: string, o = {}) => toucheQuiFaitEntrer({ key, metaKey: false, ctrlKey: false, altKey: false, ...o });
    expect(touche("Enter")).toBe(true);
    expect(touche(" ")).toBe(true);
    expect(touche("a")).toBe(true);
    expect(touche("Shift")).toBe(false);
    expect(touche("Tab")).toBe(false);
    expect(touche("Tab", { metaKey: true })).toBe(false);
    expect(touche("r", { metaKey: true })).toBe(false);
    expect(touche("r", { ctrlKey: true })).toBe(false);
  });
});

describe("la souris sur la page", () => {
  const DT = 1000 / 60;
  /** Jusqu'à ce que tout soit calme : combien d'images il a fallu, et où l'on en est. */
  const jusquAuCalme = (depart: typeof SURVOL_AU_REPOS, cible: { x: number; y: number } | null) => {
    let s = depart, images = 0;
    for (; images < 600; images++) {
      const suite = suivreLaSouris(s, cible, DT);
      s = suite.survol;
      if (suite.calme) break;
    }
    return { s, images };
  };

  it("fait naître la goutte sous la souris, sans venir d'ailleurs", () => {
    const { survol } = suivreLaSouris({ ...SURVOL_AU_REPOS, x: 0.1, y: 0.1 }, { x: 0.8, y: 0.6 }, DT);
    expect(survol.x).toBeCloseTo(0.8);
    expect(survol.y).toBeCloseTo(0.6);
    expect(survol.presence).toBeGreaterThan(0);
    expect(survol.presence).toBeLessThan(0.2);
  });

  it("la suit avec un peu de retard, et s'y arrête", () => {
    const sur = { x: 0.2, y: 0.2, presence: 1, elan: 0, temps: 0 };
    const { survol } = suivreLaSouris(sur, { x: 0.8, y: 0.2 }, DT);
    expect(survol.x).toBeGreaterThan(0.2);
    expect(survol.x).toBeLessThan(0.5);
    expect(survol.elan).toBeGreaterThan(0.1);
    const { s, images } = jusquAuCalme(sur, { x: 0.8, y: 0.2 });
    expect(images).toBeLessThan(300);
    expect(s.x).toBe(0.8);
    expect(s.elan).toBe(0);
    expect(s.presence).toBe(1);
  });

  it("n'avance plus rien quand tout est calme : plus rien à dessiner", () => {
    const { s } = jusquAuCalme({ x: 0.2, y: 0.2, presence: 1, elan: 0, temps: 0 }, { x: 0.8, y: 0.2 });
    const { survol, calme } = suivreLaSouris(s, { x: 0.8, y: 0.2 }, DT);
    expect(calme).toBe(true);
    expect(survol).toEqual(s);
  });

  it("s'efface quand elle quitte la page, sans bouger de place", () => {
    const { s } = jusquAuCalme({ x: 0.3, y: 0.4, presence: 1, elan: 0.5, temps: 0 }, null);
    expect(s.presence).toBe(0);
    expect(s.elan).toBe(0);
    expect(s.x).toBe(0.3);
    expect(s.y).toBe(0.4);
  });

  it("reste bornée, et une image en retard ne fait pas sauter la soie", () => {
    let s = { x: 0, y: 0, presence: 1, elan: 0, temps: 0 };
    for (let i = 0; i < 200; i++) s = suivreLaSouris(s, { x: i % 2, y: i % 2 }, DT).survol;
    expect(s.elan).toBeLessThanOrEqual(1);
    expect(s.presence).toBeLessThanOrEqual(1);
    const apres = suivreLaSouris({ ...s, elan: 1 }, { x: s.x, y: s.y }, 60_000).survol;
    expect(apres.temps - s.temps).toBeLessThan(0.12);
  });
});

describe("le titre dans la fenêtre", () => {
  const titre: [string, string] = ["Bienvenue", "sur Maitrize"];

  it("tient dans toutes les tailles de fenêtre, sans se chevaucher", () => {
    for (const [l, h] of [[900, 600], [1280, 820], [1728, 1117], [2560, 1440], [3440, 1440]]) {
      const mp = miseEnPage(l, h, titre, mesure);
      expect(mp.taille).toBeGreaterThan(30);
      for (const li of mp.lignes) {
        expect(li.x).toBeGreaterThanOrEqual(0);
        expect(li.x + li.largeur).toBeLessThanOrEqual(l);
      }
      expect(mp.boite.y).toBeGreaterThanOrEqual(0);
      expect(mp.bas).toBeLessThanOrEqual(h);
    }
  });

  it("pose ses lignes d'écriture sur la réglure du cahier", () => {
    const mp = miseEnPage(1280, 820, titre, mesure);
    expect(mp.lignes).toHaveLength(2);
    const ecart = (mp.lignes[1].base - mp.lignes[0].base) / mp.reglure.pas;
    expect(ecart).toBeCloseTo(4);
    expect(mp.reglure.base).toBeCloseTo(mp.lignes[0].base);
    // Les boucles de la seconde ligne (1,44 de la taille) restent sous la première.
    expect(mp.lignes[1].base - 1.44 * mp.taille).toBeGreaterThan(mp.lignes[0].base);
  });

  it("écrit la seconde ligne quand la première finit", () => {
    const [a, b] = miseEnPage(1280, 820, titre, mesure).lignes;
    expect(a.debut).toBe(0);
    expect(b.fin).toBe(1);
    expect(b.debut).toBeLessThan(a.fin);
    expect(b.debut).toBeGreaterThan(0.3);
  });

  it("souligne le z de deux barres égales, sous sa boucle, à la largeur de la lettre", () => {
    const mp = miseEnPage(1280, 820, titre, mesure);
    const b = barresDuZ(mp, mesure, 0.96)!;
    const ligne = mp.lignes[1];
    const debutDuZ = ligne.x + mesure("sur Maitri") * mp.taille;
    expect(b.x).toBeLessThanOrEqual(debutDuZ);
    expect(b.x + b.l).toBeGreaterThanOrEqual(debutDuZ + 0.64 * mp.taille);
    expect(b.y1).toBeGreaterThan(ligne.base + 0.96 * mp.taille);
    expect(b.y2).toBeGreaterThan(b.y1 + b.e);
    expect(barresDuZ({ ...mp, lignes: [{ ...ligne, texte: "sans la lettre" }] }, mesure, 0.96)).toBeNull();
  });
});
