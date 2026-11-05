import { describe, expect, it } from "vitest";
import { MODELE_COMPLET, aPoser, ajouterLesPoids, classeurComplet, nouveauxPictos, pictosDuModele, poserLesPictos } from "./classeurComplet";
import { categoriesApres } from "./ensembles";
import { nouveauClasseur, type Case, type Classeur } from "./modele";
import { ditEnTouchant, formeDeLaCase, nouvellePage, numeroDePage, ordreDesPages, pageDe, pageVoisine, sectionDe, sectionsDe } from "./modele";
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

  it("les catégories mènent à toutes les sections ; les pages d'activité, par le jeu qui y mène", () => {
    const menees = (ids: string[]) => new Set(ids.flatMap((id) => pageDe(c, id)!.cases.flatMap((k) => (k?.lien ? [k.lien] : []))));
    const cat = sectionDe(c, c.categories!)!.pages.map((p) => p.id);
    const direct = menees(cat);
    const premieres = sectionsDe(c).slice(3).map((s) => s.pages[0]);
    const sansLien = premieres.filter((p) => !direct.has(p.id) && !["Je veux", "Ça ne va pas", "Raconter"].includes(p.nom)).map((p) => p.nom);
    expect(sansLien).toEqual(["Pâte à modeler", "Peinture", "Puzzle", "Ballon", "Album", "Cuisine"]);
    // Celles-là s'ouvrent depuis une page que les catégories ouvrent (ou tournent) : « jouer » › « ballon ».
    const enDeux = menees([...direct].flatMap((id) => sectionDe(c, id)!.pages.map((p) => p.id)));
    expect(sansLien.filter((nom) => !enDeux.has(c.pages.find((p) => p.nom === nom)!.id))).toEqual([]);
    // « Raconter » s'ouvre depuis « je te raconte ».
    expect(pageDe(c, ordreDesPages(c)[1].cases.find((k) => k?.mot === "je te raconte")?.lien)?.nom).toBe("Raconter");
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

  // « Fais toi-même les phrases et regarde si elles ont du sens » (l'enseignant, 5 novembre 2026).
  /** La phrase que l'on fait en touchant ces mots, depuis « Je veux dire… » : chaque lien ouvre sa page, que l'on peut tourner. */
  const phraseDans = (x: Classeur, ...mots: string[]) => {
    let page = ordreDesPages(x)[1].id;
    const dits: string[] = [];
    for (const mot of mots) {
      const s = sectionDe(x, page)!;
      const k = s.pages.slice(s.pages.findIndex((p) => p.id === page)).flatMap((p) => p.cases).find((y) => y?.mot === mot);
      if (!k) throw new Error(`« ${mot} » n'est pas sur la page « ${pageDe(x, page)?.nom} »`);
      const dit = ditEnTouchant(formeDeLaCase(k, x.feminin));
      if (dit) dits.push(dit);
      if (k.lien) page = k.lien;
    }
    return dits.join(" ");
  };
  const phrase = (...mots: string[]) => phraseDans(c, ...mots);

  it("fait des phrases qui ont du sens : le verbe, puis ce qui le complète, avec son article", () => {
    expect(phrase("je veux", "jouer", "ballon")).toBe("je veux jouer au ballon");
    expect(phrase("je veux", "manger", "pâtes")).toBe("je veux manger des pâtes");
    expect(phrase("je veux", "boire", "jus de pomme")).toBe("je veux boire du jus de pomme");
    expect(phrase("je veux", "aller", "piscine")).toBe("je veux aller à la piscine");
    expect(phrase("on joue", "poupée")).toBe("on joue à la poupée");
    expect(phrase("ça ne va pas", "j'ai mal", "ventre")).toBe("quelque chose ne va pas j'ai mal au ventre");
    expect(phrase("autre chose", "j'ai mal", "tête")).toBe("autre chose j'ai mal à la tête");
    // Les indices de temps, comme dans les PODD.
    expect(phrase("autre chose", "avant", "aller", "parc")).toBe("autre chose c'est déjà arrivé aller au parc");
    // « Dis-moi oui ou non » mène aux catégories : on montre sur quoi porte la question.
    expect(phrase("j'ai une question", "oui ou non ?", "aller", "piscine")).toBe("j'ai une question dis-moi oui ou non aller à la piscine");
    // « je suis malade » ne mène plus au corps (« je suis malade à la tête ») : la bande propose « j'ai mal ».
    const malade = c.pages.flatMap((p) => p.cases).find((k) => k?.mot === "je suis malade")!;
    expect(malade.lien).toBeUndefined();
    const probleme = c.pages.find((p) => p.nom === "Ça ne va pas")!.id;
    expect(categoriesApres(c, malade, probleme).map((x) => x.nom)).toEqual(["j'ai mal"]);
  });

  it("ouvre une catégorie qu'un nom désigne sans rien dire : « j'aime maman », pas « j'aime les gens maman »", () => {
    expect(phrase("j'aime", "les gens", "maman")).toBe("j'aime maman");
    expect(phrase("j'aime", "les animaux", "chien")).toBe("j'aime le chien");
    expect(phrase("je n'aime pas", "en classe", "écrire")).toBe("je n'aime pas écrire");
    expect(phrase("je veux", "faire", "dormir")).toBe("je veux dormir");
    expect(phrase("j'aime", "s'habiller", "pull")).toBe("j'aime mon pull");
    // Les verbes qui ouvrent leur page parlent.
    expect(phrase("je n'aime pas", "manger", "soupe")).toBe("je n'aime pas manger de la soupe");
    expect(phrase("j'aime", "jouer", "cache-cache")).toBe("j'aime jouer à cache-cache");
  });

  it("raconte ce qui s'est passé, et ouvre la page d'activité du jeu choisi", () => {
    expect(phrase("je te raconte", "hier", "on est allés", "piscine")).toBe("je te raconte quelque chose hier on est allés à la piscine");
    expect(phrase("je te raconte", "ce week-end", "j'ai joué", "ballon")).toBe("je te raconte quelque chose ce week-end j'ai joué au ballon");
    expect(phrase("je te raconte", "avec", "mamie")).toBe("je te raconte quelque chose avec mamie");
    expect(phrase("on joue", "ballon", "à moi", "lance")).toBe("on joue au ballon à mon tour lance-moi le ballon");
    expect(phrase("je veux", "lire un livre", "lis-moi")).toBe("je veux lire un livre lis-moi l'histoire");
    expect(phrase("en classe", "cuisiner", "mélanger")).toBe("cuisiner mélanger");
    // Après « hier », la bande propose de dire où l'on est allé, à quoi l'on a joué.
    const raconter = c.pages.find((p) => p.nom === "Raconter")!;
    const hier = raconter.cases.find((k) => k?.mot === "hier")!;
    expect(categoriesApres(c, hier, raconter.id).map((x) => x.nom)).toEqual(["je suis allé", "j'ai joué"]);
    const weekEnd = raconter.cases.find((k) => k?.mot === "ce week-end")!;
    expect(categoriesApres(c, weekEnd, raconter.id).map((x) => x.nom)).toEqual(["je suis allé", "j'ai joué", "avec"]);
  });

  it("parle au féminin quand l'élève est une fille : « je me sens contente », « je suis tombée »", () => {
    const elle = { ...c, feminin: true };
    expect(phraseDans(elle, "je me sens", "content")).toBe("je me sens contente");
    expect(phraseDans(elle, "ça ne va pas", "je suis fatigué")).toBe("quelque chose ne va pas je suis fatiguée");
    expect(phraseDans(elle, "je te raconte", "hier", "je suis allé", "piscine")).toBe("je te raconte quelque chose hier je suis allée à la piscine");
    expect(phrase("je me sens", "content")).toBe("je me sens content");
    // Ce qui décrit une chose ne change pas.
    expect(phraseDans(elle, "c'est…", "petit")).toBe("c'est petit");
  });

  it("après « jouer », « manger », « boire », chaque chose dit son article ou sa préposition", () => {
    const article = /^(?:(?:le|la|les|un|une|des|du|de|au|aux|à|avec|dans|mon|ma|mes|quelque) |l'|d')/;
    const nom = "#fce6ca";
    const pages = c.pages.filter((p) => ["Manger", "Boire", "Les animaux", "S'habiller"].includes(p.nom)
      || (p.nom === "Jouer" && !p.suite) || (p.nom === "En classe" && p.suite));
    expect(pages.length).toBe(7);
    for (const p of pages) for (const k of p.cases) if (k && k.fond === nom) expect(ditEnTouchant(k), `${p.nom} › ${k.mot}`).toMatch(article);
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
    // Ce qui se dit, et les catégories muettes, aussi.
    const dits = (x: typeof c) => x.pages.flatMap((p) => p.cases.flatMap((k) => (k ? [`${k.mot}=${ditEnTouchant(k)}`] : [])));
    expect(dits(retour)).toEqual(dits(c));
    expect(retour.pages.flatMap((p) => p.cases.filter((k) => k?.muette)).length).toBe(c.pages.flatMap((p) => p.cases.filter((k) => k?.muette)).length);
    const feminins = (x: typeof c) => x.pages.flatMap((p) => p.cases.flatMap((k) => (k?.feminin ? [`${k.mot}=${k.feminin.mot ?? ""}/${k.feminin.dire ?? ""}`] : [])));
    expect(feminins(retour)).toEqual(feminins(c));
    expect(feminins(c).length).toBeGreaterThan(10);
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
  it("remplace aussi un classeur complet intact dont les pages ont changé de mots (« un animal », « un jouet »…)", () => {
    const ancien = classeurComplet("", "2026-11-05T09:00:00.000Z", {
      ...MODELE_COMPLET,
      pages: MODELE_COMPLET.pages.map((p) => (p.cle === "animaux" ? { ...p, cases: p.cases.filter((k) => k.mot !== "un animal") } : p)),
    });
    expect(aPoser([ancien])).toEqual({ poser: true, remplacer: [ancien.id] });
    expect(aPoser([classeurComplet()])).toEqual({ poser: false, remplacer: [] });
  });

  it("remplace aussi un classeur complet intact dont une case disait autre chose, ou parlait au lieu d'être muette", () => {
    const avec = (f: (cle: string, k: (typeof MODELE_COMPLET.pages)[number]["cases"][number]) => object) => classeurComplet("", "2026-11-05T09:00:00.000Z", {
      ...MODELE_COMPLET, pages: MODELE_COMPLET.pages.map((p) => ({ ...p, cases: p.cases.map((k) => ({ ...k, ...f(p.cle, k) })) })),
    });
    const ballon = avec((cle, k) => (cle === "jouer" && k.mot === "ballon" ? { dire: undefined } : {}));
    expect(aPoser([ballon])).toEqual({ poser: true, remplacer: [ballon.id] });
    const gens = avec((cle, k) => (cle === "categories" && k.mot === "les gens" ? { muette: undefined } : {}));
    expect(aPoser([gens])).toEqual({ poser: true, remplacer: [gens.id] });
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
    const vu = (e: ReturnType<typeof categoriesApres>) => e.map((x) => `${x.nom} (${x.image})`);
    expect(vu(categoriesApres(repris, jeVeux(repris), page(repris, "Je veux"))))
      .toEqual(vu(categoriesApres(neuf, jeVeux(neuf), page(neuf, "Je veux"))));
    const bonjour = (c: typeof neuf) => c.pages.flatMap((p) => p.cases).find((k) => k?.mot === "bonjour")!;
    expect(vu(categoriesApres(repris, jeVeux(repris), page(repris, "Je veux")))).toContain("jouer (arasaac-2439)");
    expect(vu(categoriesApres(repris, bonjour(repris), repris.accueil))).toEqual(vu(categoriesApres(neuf, bonjour(neuf), neuf.accueil)));
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

  it("reçoit ce qui se dit aujourd'hui là où une case dit encore une forme d'avant, jamais par-dessus ce que l'enseignant a écrit", () => {
    const neuf = classeurComplet();
    const change = (nom: string, suite: boolean, mot: string, f: (k: Case) => Case) => (c: Classeur): Classeur => ({
      ...c, pages: c.pages.map((p) => (p.nom === nom && !!p.suite === suite ? { ...p, cases: p.cases.map((k) => (k?.mot === mot ? f(k) : k)) } : p)),
    });
    const sans = (k: Case, champ: "dire" | "muette") => { const x = { ...k }; delete x[champ]; return x; };
    let ancien: Classeur = { ...neuf, versionDesPoids: "2026-11-05-lexique383-generiques5" };
    ancien = change("Jouer", false, "ballon", (k) => sans(k, "dire"))(ancien); // il disait son mot
    ancien = change("Jouer", true, "dehors", (k) => ({ ...k, dire: "jouer dehors" }))(ancien); // il disait plus
    ancien = change("Manger", false, "pomme", (k) => ({ ...k, dire: "ma pomme à moi" }))(ancien); // l'enseignant l'a écrit
    ancien = change("Catégories", false, "les gens", (k) => sans(k, "muette"))(ancien); // pas encore muette
    ancien = change("Catégories", false, "les animaux", (k) => ({ ...k, muette: false }))(ancien); // l'enseignant la fait parler
    // Deux cases d'avant leur nouveau nom : l'une telle que livrée, l'autre avec la photo de l'enseignant.
    ancien = change("Catégories", false, "j'ai mal", (k) => ({ ...k, mot: "le corps", image: "arasaac-2728", fond: "#fce6ca", bord: "#e07b12" }))(ancien);
    ancien = change("Manger", false, "boire", (k) => ({ ...k, mot: "à boire", image: "photo-de-la-classe" }))(ancien);
    const repris = ajouterLesPoids(ancien)!;
    const caseDe = (nom: string, suite: boolean, mot: string) =>
      repris.pages.find((p) => p.nom === nom && !!p.suite === suite)!.cases.find((k) => k?.mot === mot)!;
    expect(caseDe("Jouer", false, "ballon").dire).toBe("au ballon");
    expect(caseDe("Jouer", true, "dehors").dire).toBeUndefined();
    expect(caseDe("Manger", false, "pomme").dire).toBe("ma pomme à moi");
    expect(caseDe("Catégories", false, "les gens").muette).toBe(true);
    expect(caseDe("Catégories", false, "les animaux").muette).toBe(false);
    const mal = caseDe("Catégories", false, "j'ai mal");
    const livree = neuf.pages.find((p) => p.nom === "Catégories")!.cases.find((k) => k?.mot === "j'ai mal")!;
    expect({ image: mal.image, fond: mal.fond, bord: mal.bord, lien: mal.lien }).toEqual({ image: livree.image, fond: livree.fond, bord: livree.bord, lien: livree.lien });
    expect(caseDe("Manger", false, "boire").image).toBe("photo-de-la-classe");
    expect(repris.modifieLe).toBe(ancien.modifieLe);
  });

  it("reçoit les pages neuves (« Raconter », les activités), leurs liens, et les formes féminines", () => {
    const neuf = classeurComplet();
    const neuves = ["Raconter", "Pâte à modeler", "Peinture", "Puzzle", "Ballon", "Album", "Cuisine"];
    const idsNeufs = new Set(neuf.pages.filter((p) => neuves.includes(p.nom)).map((p) => p.id));
    const mal = neuf.pages.find((p) => p.nom === "J'ai mal")!.id;
    // Un classeur d'avant : sans ces pages ; « je te raconte » menait aux catégories, « je suis malade » au corps,
    // « oui ou non ? » et les jeux nulle part ; pas de formes féminines ; et l'enseignant a ajouté une page à « S'habiller ».
    let ancien: Classeur = {
      ...neuf, versionDesPoids: "2026-11-05-lexique383-phrases7",
      pages: neuf.pages.filter((p) => !idsNeufs.has(p.id)).map((p) => ({
        ...p, cases: p.cases.map((k) => {
          if (!k) return k;
          const x: Case = { ...k };
          delete x.feminin;
          if (x.lien && idsNeufs.has(x.lien)) delete x.lien;
          if (x.mot === "je te raconte") x.lien = neuf.categories;
          if (x.mot === "oui ou non ?") delete x.lien;
          if (x.mot === "je suis malade") x.lien = mal;
          return x;
        }),
      })),
    };
    const iHabits = ancien.pages.findIndex((p) => p.nom === "S'habiller");
    ancien = { ...ancien, pages: [...ancien.pages.slice(0, iHabits + 1), { ...nouvellePage("Mes vêtements", 4, 5), suite: true }, ...ancien.pages.slice(iHabits + 1)] };
    const repris = ajouterLesPoids(ancien)!;
    const noms = ordreDesPages(repris).map((p) => p.nom);
    // Les pages neuves arrivent après la section « S'habiller », la page de l'enseignant comprise.
    expect(noms.slice(noms.indexOf("S'habiller"))).toEqual(["S'habiller", "Mes vêtements", ...neuves]);
    const caseDe = (nomPage: string, mot: string) => repris.pages.find((p) => p.nom === nomPage && !p.suite)!.cases.find((k) => k?.mot === mot)!;
    const versPage = (k: Case) => pageDe(repris, k.lien)?.nom;
    expect(versPage(caseDe("Jouer", "ballon"))).toBe("Ballon");
    expect(versPage(caseDe("Je veux dire…", "je te raconte"))).toBe("Raconter");
    expect(versPage(caseDe("Questions", "oui ou non ?"))).toBe("Catégories");
    expect(caseDe("Ça ne va pas", "je suis malade").lien).toBeUndefined();
    expect(caseDe("Je me sens", "content").feminin).toEqual({ mot: "contente" });
    expect(versPage(caseDe("Raconter", "je suis allé"))).toBe("Aller");
    expect(nouveauxPictos(ancien, repris)).toEqual(expect.arrayContaining([8583, 37186, 25704]));
    expect(repris.modifieLe).toBe(ancien.modifieLe);
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

