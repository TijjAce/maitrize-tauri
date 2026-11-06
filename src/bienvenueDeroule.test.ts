import { describe, expect, it } from "vitest";
import { ECRITURE_MS, TENUE_MS, avancementDeLEcriture, barresDuZ, estUnLancement, etatDeLaPage, tempsDuFond } from "./bienvenueDeroule";
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

  const etat = (o: Partial<Parameters<typeof etatDeLaPage>[0]>) => etatDeLaPage({ ecoule: 0, debutEcriture: 100, appPrete: false, appPosee: false, passee: false, immobile: false, ...o });

  it("ne charge l'application qu'une fois le titre écrit : rien ne le fait saccader", () => {
    expect(etat({ ecoule: 100 + ECRITURE_MS - 1 }).chargerLApp).toBe(false);
    expect(etat({ ecoule: 100 + ECRITURE_MS }).chargerLApp).toBe(true);
    // Toucher la page, ou une préparation qui n'aboutit pas : on n'attend pas.
    expect(etat({ ecoule: 300, passee: true }).chargerLApp).toBe(true);
    expect(etat({ ecoule: 7000, debutEcriture: null }).chargerLApp).toBe(true);
    // Sans mouvement, rien à protéger.
    expect(etat({ ecoule: 110, immobile: true }).chargerLApp).toBe(true);
  });

  it("ne s'efface que devant une application prête et posée, le titre vu ; toucher la fait partir dès que l'application est là", () => {
    const fin = 100 + ECRITURE_MS + TENUE_MS;
    expect(etat({ ecoule: fin, appPrete: true, appPosee: false }).partir).toBe(false);
    expect(etat({ ecoule: fin - 1, appPrete: true, appPosee: true }).partir).toBe(false);
    expect(etat({ ecoule: fin, appPrete: true, appPosee: true }).partir).toBe(true);
    expect(etat({ ecoule: fin, appPrete: false, appPosee: false }).partir).toBe(false);
    expect(etat({ ecoule: 500, passee: true, appPrete: false }).partir).toBe(false);
    expect(etat({ ecoule: 500, passee: true, appPrete: true }).partir).toBe(true);
    // Quoi qu'il arrive, elle s'en va.
    expect(etat({ ecoule: 20_001, debutEcriture: null }).partir).toBe(true);
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
