import { describe, expect, it } from "vitest";
import { MODELE_COMPLET, aPoser, ajouterLesPoids, classeurComplet, pictosDuModele, poserLesPictos } from "./classeurComplet";
import { ensemblesApres } from "./ensembles";
import { nouveauClasseur } from "./modele";
import { numeroDePage, ordreDesPages, pageDe, pageVoisine, sectionsDe } from "./modele";
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

  it("est rangé comme un PODD : la page 1, puis les débuts de phrase, puis les catégories, et des sections à tourner", () => {
    const ordre = ordreDesPages(c);
    expect(ordre.slice(0, 3).map((p) => p.nom)).toEqual(["L'essentiel", "Je veux dire…", "Catégories"]);
    expect(c.categories).toBe(ordre[2].id);
    // La page 1 mène aux débuts de phrase ; ceux-ci disent l'intention et ouvrent chacun leur page.
    const versDire = pageDe(c, c.accueil)!.cases.find((k) => k?.lien === ordre[1].id);
    expect(versDire?.mot).toBe("j'ai quelque chose à dire");
    for (const mot of ["je veux", "je me sens", "j'ai mal", "j'ai une question", "ça ne va pas"]) {
      const k = ordre[1].cases.find((x) => x?.mot === mot);
      expect(pageDe(c, k?.lien), mot).toBeTruthy();
    }
    // Des sections de plusieurs pages, numérotées 5a, 5b…
    const longues = sectionsDe(c).filter((s) => s.pages.length > 1);
    expect(longues.length).toBeGreaterThanOrEqual(5);
    expect(numeroDePage(c, longues[0].pages[1].id)).toMatch(/^\d+b$/);
    // Toutes les pages ont la même grille, comme les pages d'un livre.
    expect(new Set(c.pages.map((p) => `${p.lignes}×${p.colonnes}`))).toEqual(new Set(["4×5"]));
  });

  it("devine la suite : « j'ai mal » ouvre le corps, « j'ai faim » le repas, « qui ? » les gens", () => {
    const lienDe = (mot: string) => pageDe(c, c.pages.flatMap((p) => p.cases).find((k) => k?.mot === mot)?.lien)?.nom;
    expect(lienDe("j'ai mal")).toBe("J'ai mal");
    expect(lienDe("j'ai faim")).toBe("Manger");
    expect(lienDe("j'ai soif")).toBe("Boire");
    expect(lienDe("qui ?")).toBe("Les gens");
    expect(lienDe("parce que")).toBe("Catégories");
  });

  it("chaque page s'atteint depuis la page 1, par un lien ou en tournant la page", () => {
    const vues = new Set([c.accueil]);
    const aVoir = [c.accueil];
    while (aVoir.length) {
      const id = aVoir.pop()!;
      const suivantes = pageDe(c, id)!.cases.flatMap((k) => (k?.lien ? [k.lien] : []));
      const tournee = pageVoisine(c, id, 1);
      if (tournee?.suite) suivantes.push(tournee.id);
      for (const s of suivantes) if (!vues.has(s)) { vues.add(s); aVoir.push(s); }
    }
    expect([...vues].sort()).toEqual(c.pages.map((p) => p.id).sort());
  });

  it("les catégories mènent à toutes les sections", () => {
    const cat = pageDe(c, c.categories)!;
    const menees = new Set(cat.cases.flatMap((k) => (k?.lien ? [k.lien] : [])));
    const premieres = sectionsDe(c).slice(3).map((s) => s.pages[0]);
    const sansLien = premieres.filter((p) => !menees.has(p.id) && p.nom !== "Je veux" && p.nom !== "Ça ne va pas").map((p) => p.nom);
    expect(sansLien).toEqual([]);
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
    // Les poids des ensembles par thème font le voyage.
    const motDe = (x: typeof c, id: string) => x.pages.flatMap((p) => p.cases).find((k) => k?.id === id)?.mot;
    const suites = (x: typeof c) => x.pages.flatMap((p) => p.cases.flatMap((k) => (k?.suites
      ? [`${k.mot}→${k.suites.map((s) => `${pageDe(x, s.page)?.nom}:${s.poids}:${(s.cases ?? []).map((id) => motDe(x, id)).join("/")}`).join(",")}`]
      : [])));
    expect(suites(retour)).toEqual(suites(c));
    expect(retour.pages.flatMap((p) => p.cases.map((k) => k?.poids ?? null))).toEqual(c.pages.flatMap((p) => p.cases.map((k) => k?.poids ?? null)));
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

describe("au lancement", () => {
  const ancien = () => {
    const c = classeurComplet("", "2026-11-05T09:00:00.000Z", { ...MODELE_COMPLET, pages: MODELE_COMPLET.pages.slice(0, 13) });
    return c;
  };
  it("pose le classeur complet sur un appareil sans classeur, et rien quand il y en a", () => {
    expect(aPoser([])).toEqual({ poser: true, remplacer: [] });
    expect(aPoser([nouveauClasseur("Le mien")])).toEqual({ poser: false, remplacer: [] });
    expect(aPoser([classeurComplet()])).toEqual({ poser: false, remplacer: [] });
  });
  it("remplace l'ancien classeur complet que personne n'a modifié, jamais celui qu'on a changé", () => {
    const intact = ancien();
    expect(aPoser([intact, nouveauClasseur("Le mien")])).toEqual({ poser: true, remplacer: [intact.id] });
    const change = { ...ancien(), modifieLe: "2026-11-05T10:00:00.000Z" };
    expect(aPoser([change])).toEqual({ poser: false, remplacer: [] });
  });
});

describe("un classeur complet d'avant les poids", () => {
  it("les reçoit à l'identique, sans que rien d'autre ne change", () => {
    const neuf = classeurComplet("", "2026-11-05T08:00:00.000Z");
    const sansPoids = {
      ...neuf, versionDesPoids: undefined,
      pages: neuf.pages.map((p) => ({ ...p, cases: p.cases.map((k) => (k ? { ...k, poids: undefined, suites: undefined } : k)) })),
    };
    const repris = ajouterLesPoids(sansPoids)!;
    expect(repris.modifieLe).toBe(sansPoids.modifieLe);
    const jeVeux = (c: typeof neuf) => c.pages.flatMap((p) => p.cases).find((k) => k?.mot === "je veux" && k.lien)!;
    const page = (c: typeof neuf, nom: string) => c.pages.find((p) => p.nom === nom)!.id;
    const vu = (c: typeof neuf, e: ReturnType<typeof ensemblesApres>) => e.map((x) => `${x.nom}: ${x.cases.map((k) => k.mot).join(", ")}`);
    expect(vu(repris, ensemblesApres(repris, jeVeux(repris), page(repris, "Je veux"))))
      .toEqual(vu(neuf, ensemblesApres(neuf, jeVeux(neuf), page(neuf, "Je veux"))));
    const bonjour = (c: typeof neuf) => c.pages.flatMap((p) => p.cases).find((k) => k?.mot === "bonjour")!;
    expect(vu(repris, ensemblesApres(repris, bonjour(repris), repris.accueil))).toEqual(["Les gens: maman, papa, maîtresse, copain"]);
    expect(repris.pages.map((p) => p.cases.map((k) => k?.mot ?? null))).toEqual(neuf.pages.map((p) => p.cases.map((k) => k?.mot ?? null)));
  });
  it("garde les suites que l'enseignant a choisies quand les poids livrés changent", () => {
    const neuf = classeurComplet();
    const gens = neuf.pages.find((p) => p.nom === "Les gens")!.id;
    const perso = {
      ...neuf, versionDesPoids: "ancienne",
      pages: neuf.pages.map((p) => ({ ...p, cases: p.cases.map((k) => (k?.mot === "regarde" ? { ...k, suites: [{ page: gens, poids: 1 }], suitesPerso: true } : k)) })),
    };
    const repris = ajouterLesPoids(perso)!;
    const regarde = repris.pages.flatMap((p) => p.cases).find((k) => k?.mot === "regarde")!;
    expect(regarde.suites).toEqual([{ page: gens, poids: 1 }]);
    expect(regarde.suitesPerso).toBe(true);
  });

  it("ne touche pas un classeur qui a déjà les poids d'aujourd'hui ; remplace ceux d'une autre version", () => {
    const neuf = classeurComplet();
    expect(neuf.versionDesPoids).toBe(MODELE_COMPLET.versionDesPoids);
    expect(ajouterLesPoids(neuf)).toBeNull();
    const ancien = { ...neuf, versionDesPoids: "2026-11-05-ordre", pages: neuf.pages.map((p) => ({ ...p, cases: p.cases.map((k) => (k ? { ...k, poids: 0.123 } : k)) })) };
    const repris = ajouterLesPoids(ancien)!;
    expect(repris.versionDesPoids).toBe(MODELE_COMPLET.versionDesPoids);
    expect(repris.pages.map((p) => p.cases.map((k) => k?.poids ?? null))).toEqual(neuf.pages.map((p) => p.cases.map((k) => k?.poids ?? null)));
  });
});

