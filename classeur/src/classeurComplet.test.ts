import { describe, expect, it } from "vitest";
import { MODELE_COMPLET, classeurComplet, pictosDuModele, poserLesPictos } from "./classeurComplet";
import { pageDe } from "./modele";
import { depuisObz, versObz } from "./obz";

// Les pictos livrés avec l'application, par leur numéro.
const livres = new Set(Object.keys(import.meta.glob("../public/pictos/*.png")).map((f) => Number(f.match(/(\d+)\.png$/)?.[1])));

describe("le classeur complet", () => {
  const c = classeurComplet("", "2026-11-05T08:00:00.000Z");

  it("a toutes ses pages, l'accueil d'abord, chaque case à sa place", () => {
    expect(c.pages.length).toBe(MODELE_COMPLET.pages.length);
    expect(c.pages.length).toBeGreaterThanOrEqual(10);
    expect(c.accueil).toBe(c.pages[0].id);
    expect(c.nom).toBe(MODELE_COMPLET.nom);
    for (const [i, p] of c.pages.entries()) {
      expect(p.cases.length).toBe(p.lignes * p.colonnes);
      expect(p.cases.filter(Boolean).length).toBe(MODELE_COMPLET.pages[i].cases.length);
    }
    const ids = [c.id, ...c.pages.map((p) => p.id), ...c.pages.flatMap((p) => p.cases.flatMap((k) => (k ? [k.id] : [])))];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("part des intentions, et chaque page s'atteint depuis l'accueil", () => {
    const accueil = pageDe(c, c.accueil)!;
    for (const mot of ["je veux", "je me sens", "j'ai mal", "j'ai une question", "ça ne va pas"]) {
      const k = accueil.cases.find((x) => x?.mot === mot);
      expect(k?.lien, mot).toBeTruthy();
      expect(pageDe(c, k!.lien)).toBeTruthy();
    }
    const vues = new Set([c.accueil]);
    const aVoir = [c.accueil];
    while (aVoir.length) {
      for (const k of pageDe(c, aVoir.pop())!.cases) {
        if (k?.lien && !vues.has(k.lien)) { vues.add(k.lien); aVoir.push(k.lien); }
      }
    }
    expect([...vues].sort()).toEqual(c.pages.map((p) => p.id).sort());
  });

  it("a un picto à chaque case, livré avec l'application, et rien de plus", () => {
    for (const p of c.pages) for (const k of p.cases) if (k) expect(k.image, `${p.nom} › ${k.mot}`).toMatch(/^arasaac-\d+$/);
    const numeros = pictosDuModele();
    for (const n of numeros) expect(livres.has(n), `picto ${n}`).toBe(true);
    expect(livres.size).toBe(numeros.length);
  });

  it("ne dit pas deux fois la même chose : une phrase à dire n'est jamais le mot lui-même", () => {
    for (const p of MODELE_COMPLET.pages) for (const k of p.cases) if (k.dire) expect(k.dire, k.mot).not.toBe(k.mot);
  });

  it("se crée neuf à chaque fois : deux classeurs complets ne partagent aucun identifiant", () => {
    const autre = classeurComplet("Pour la classe");
    expect(autre.nom).toBe("Pour la classe");
    expect(autre.id).not.toBe(c.id);
    expect(autre.pages.some((p) => c.pages.some((q) => q.id === p.id))).toBe(false);
  });

  it("part vers Maitrize et en revient avec ses pages, ses liens et ses pictos", () => {
    const images = Object.fromEntries(pictosDuModele().map((n) => [`arasaac-${n}`, "data:image/png;base64,iVBORw0KGgo="]));
    const { classeur: retour } = depuisObz(versObz(c, images), "Retour");
    expect(retour.pages.map((p) => p.nom)).toEqual(c.pages.map((p) => p.nom));
    const liens = (x: typeof c) => x.pages.flatMap((p) => p.cases.flatMap((k) => (k?.lien ? [`${p.nom}→${pageDe(x, k.lien)?.nom}`] : [])));
    expect(liens(retour)).toEqual(liens(c));
    const pictos = (x: typeof c) => x.pages.flatMap((p) => p.cases.flatMap((k) => (k?.image ? [k.image] : [])));
    expect(pictos(retour)).toEqual(pictos(c));
  });
});

describe("les pictos livrés", () => {
  it("rejoignent les images de l'appareil sous leur numéro ; un picto absent est passé", async () => {
    const gardees: Record<string, string> = {};
    const poses = await poserLesPictos([1, 2, 3], async (id, d) => { gardees[id] = d; }, async (n) => (n === 2 ? null : `data:image/png;base64,${n}`));
    expect(poses).toBe(2);
    expect(gardees).toEqual({ "arasaac-1": "data:image/png;base64,1", "arasaac-3": "data:image/png;base64,3" });
  });
});
