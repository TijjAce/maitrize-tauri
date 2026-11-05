import { describe, expect, it } from "vitest";
import { classeurComplet } from "./classeurComplet";
import { casesDuTheme, ensemblesApres, lignesDeSuites, suitesDeLaFiche } from "./ensembles";
import { lireClasseur, ordreDesPages, supprimerPage, type Case } from "./modele";

describe("les ensembles de pictos par thème, aux poids calculés à l'avance", () => {
  const c = classeurComplet("", "2026-11-05T08:00:00.000Z");
  const page = (nom: string) => ordreDesPages(c).find((p) => p.nom === nom)!;
  const caseDe = (nomPage: string, mot: string): Case => page(nomPage).cases.find((k) => k?.mot === mot)!;
  const noms = (e: ReturnType<typeof ensemblesApres>) => e.map((x) => `${x.nom} : ${x.cases.map((k) => k.mot).join(", ")}`);

  it("après « je veux », propose Manger, Jouer, Boire, avec leurs pictos les plus courants — pas « j'ai faim »", () => {
    const e = ensemblesApres(c, caseDe("Je veux dire…", "je veux"), page("Je veux").id);
    expect(noms(e)).toEqual([
      "Manger : pain, pomme, poisson, fromage",
      "Jouer : voiture, ballon, jeu de société, poupée",
      "Boire : eau, lait, verre, chocolat chaud",
    ]);
  });

  it("propose les pictos de la page du thème avant ceux de la page suivante (« faire » → les activités de la classe)", () => {
    const e = ensemblesApres(c, caseDe("Je veux dire…", "faire"), page("Je veux dire…").id);
    expect(noms(e).find((x) => x.startsWith("En classe"))).toBe("En classe : lire, écrire, compter, chanter");
  });

  it("ne propose pas le thème de la page ouverte, et passe au suivant", () => {
    const e = ensemblesApres(c, caseDe("Je veux dire…", "je veux"), page("Manger").id);
    expect(e.map((x) => x.nom)).toEqual(["Jouer", "Boire", "Aller"]);
  });

  it("« qui ? » propose les gens ; « c'est… » ce qui décrit, puis les couleurs", () => {
    expect(noms(ensemblesApres(c, caseDe("Questions", "qui ?"), page("Questions").id))).toEqual(["Les gens : moi, toi, maman, papa"]);
    expect(ensemblesApres(c, caseDe("Je veux dire…", "c'est…"), page("Je veux dire…").id).map((x) => x.nom)).toEqual(["C'est…", "Couleurs et formes"]);
  });

  it("après « regarde », chaque ensemble commence par son picto générique (« il me faudrait des pictos génériques, par exemple pour animaux »)", () => {
    expect(noms(ensemblesApres(c, caseDe("L'essentiel", "regarde"), c.accueil, 3))).toEqual([
      "Les animaux : un animal, chien, chat, oiseau", "Les gens : quelqu'un, moi, maman, papa", "Jouer : un jouet, ballon, voiture, livre",
    ]);
  });

  it("« regarde » propose ce qu'on montre : les animaux, les gens, les jeux (« j'ai pas forcément ce qui pourrait suivre »)", () => {
    expect(ensemblesApres(c, caseDe("L'essentiel", "regarde"), c.accueil).map((x) => x.nom)).toEqual(["Les animaux", "Les gens", "Jouer"]);
    expect(ensemblesApres(c, caseDe("Ça ne va pas", "j'ai froid"), page("Ça ne va pas").id).map((x) => x.nom)).toEqual(["S'habiller"]);
  });

  it("sur la deuxième page d'une section, propose la première (« lancer » → les jouets de la page Jouer)", () => {
    const deuxieme = ordreDesPages(c).filter((p) => p.nom === "Jouer")[1];
    const lancer = deuxieme.cases.find((k) => k?.mot === "lancer")!;
    expect(noms(ensemblesApres(c, lancer, deuxieme.id))).toEqual(["Jouer : ballon, un jouet, cubes, voiture"]);
  });

  it("montre les pictos choisis pour ce qui précède : « bonjour » → maman, papa… ; « j'ai froid » → manteau, bonnet…", () => {
    expect(noms(ensemblesApres(c, caseDe("L'essentiel", "bonjour"), c.accueil))).toEqual(["Les gens : maman, papa, maîtresse, copain"]);
    expect(noms(ensemblesApres(c, caseDe("Ça ne va pas", "j'ai froid"), page("Ça ne va pas").id))).toEqual(["S'habiller : manteau, bonnet, écharpe, gants"]);
    expect(noms(ensemblesApres(c, caseDe("En classe", "peindre"), page("En classe").id))[0]).toBe("Couleurs et formes : rouge, bleu, jaune, vert");
    const faire2 = ordreDesPages(c).filter((p) => p.nom === "Faire")[1];
    const dormir = faire2.cases.find((k) => k?.mot === "dormir")!;
    expect(noms(ensemblesApres(c, dormir, faire2.id))).toEqual(["Aller : chambre, maison, salon, chez un copain"]);
  });

  it("après un jouet : avec qui, comment il est, sa couleur", () => {
    expect(noms(ensemblesApres(c, caseDe("Jouer", "ballon"), page("Jouer").id))).toEqual([
      "Les gens : copain, copine, moi, toi", "C'est… : grand, petit, cassé, beau", "Couleurs et formes : rouge, bleu, jaune, vert",
    ]);
  });

  it("un picto choisi qui a disparu (caché par l'enseignant) laisse la place au plus lourd du thème", () => {
    const sansMaman = { ...c, pages: c.pages.map((p) => ({ ...p, cases: p.cases.map((k) => (k?.mot === "maman" ? { ...k, masquee: true } : k)) })) };
    const e = ensemblesApres(sansMaman, caseDe("L'essentiel", "bonjour"), c.accueil);
    expect(e[0].cases.map((k) => k.mot).slice(0, 3)).toEqual(["papa", "maîtresse", "copain"]);
    expect(e[0].cases).toHaveLength(4);
    expect(e[0].cases.some((k) => k.mot === "maman")).toBe(false);
  });

  it("selon le geste ou le sentiment, d'autres pictos du même thème", () => {
    const faire = page("Faire");
    expect(noms(ensemblesApres(c, caseDe("Faire", "ouvrir"), faire.id))[0]).toBe("En classe : porte, fenêtre, cahier, cartable");
    expect(noms(ensemblesApres(c, caseDe("Faire", "prendre"), faire.id))[0]).toBe("En classe : quelque chose, crayon, ciseaux, colle");
    expect(noms(ensemblesApres(c, caseDe("Je veux dire…", "j'aime"), page("Je veux dire…").id))[0]).toBe("Manger : gâteau, chocolat, frites, pizza");
    expect(noms(ensemblesApres(c, caseDe("Je veux dire…", "je n'aime pas"), page("Je veux dire…").id))[0]).toBe("Manger : légumes, soupe, poisson, viande");
    // Un sentiment agréable n'appelle pas « ça ne va pas » ; un sentiment pénible, si.
    expect(ensemblesApres(c, caseDe("Je me sens", "content"), page("Je me sens").id).map((x) => x.nom)).toEqual(["Les gens", "Jouer"]);
    expect(ensemblesApres(c, caseDe("Je me sens", "triste"), page("Je me sens").id).map((x) => x.nom)).toContain("Ça ne va pas");
  });

  it("une même case appelle autre chose selon sa page : « encore » dans un jeu propose le jeu", () => {
    const jeu2 = ordreDesPages(c).filter((p) => p.nom === "Jouer")[1];
    const encore = jeu2.cases.find((k) => k?.mot === "encore")!;
    expect(ensemblesApres(c, encore, jeu2.id).map((x) => x.nom)).toEqual(["Jouer"]);
    expect(ensemblesApres(c, caseDe("L'essentiel", "encore"), c.accueil)[0].nom).toBe("Manger");
  });

  it("une case qui finit la phrase ne propose rien", () => {
    expect(ensemblesApres(c, caseDe("J'ai mal", "tête"), page("J'ai mal").id)).toEqual([]);
    expect(ensemblesApres(c, null, c.accueil)).toEqual([]);
  });

  it("les poids se gardent, et un thème retiré disparaît des suites", () => {
    const relu = lireClasseur(JSON.stringify(c))!;
    expect(ensemblesApres(relu, caseDe("Je veux dire…", "je veux"), page("Je veux").id)).toHaveLength(3);
    const sansManger = supprimerPage(c, page("Manger").id);
    const jeVeux = sansManger.pages.flatMap((p) => p.cases).find((k) => k?.id === caseDe("Je veux dire…", "je veux").id)!;
    expect(jeVeux.suites!.some((s) => s.page === page("Manger").id)).toBe(false);
    expect(ensemblesApres(sansManger, jeVeux, page("Je veux").id).map((x) => x.nom)).toEqual(["Jouer", "Boire", "Aller"]);
  });
});

describe("les suites choisies par l'enseignant, dans la fiche d'une case", () => {
  const c = classeurComplet("", "2026-11-05T08:00:00.000Z");
  const page = (nom: string) => ordreDesPages(c).find((p) => p.nom === nom)!;
  const id = (nomPage: string, mot: string) => casesDuTheme(c, page(nomPage).id).find((k) => k.mot === mot)!.id;

  it("le rang fait le poids, la première d'abord ; un thème en double ne compte qu'une fois ; quatre pictos au plus", () => {
    const suites = suitesDeLaFiche([
      { page: page("Les animaux").id, cases: ["a", "b", "c", "d", "e"] },
      { page: page("Les gens").id, cases: [] },
      { page: page("Les animaux").id, cases: ["x"] },
    ]);
    expect(suites.map((s) => s.page)).toEqual([page("Les animaux").id, page("Les gens").id]);
    expect(suites[0].poids).toBeGreaterThan(suites[1].poids);
    expect(suites[0].cases).toEqual(["a", "b", "c", "d"]);
    expect(suites[1].cases).toBeUndefined();
    expect(suitesDeLaFiche([])).toEqual([]);
  });

  it("relit les suites d'une case dans l'ordre de leur poids, et les rend telles que la bande les montre", () => {
    const k = c.pages.flatMap((p) => p.cases).find((x) => x?.mot === "regarde")!;
    const lignes = lignesDeSuites(k.suites);
    expect(lignes[0].page).toBe(page("Les animaux").id);
    // L'enseignant met les gens d'abord, avec papi et mamie.
    const choisi = { ...k, suites: suitesDeLaFiche([{ page: page("Les gens").id, cases: [id("Les gens", "papi"), id("Les gens", "mamie")] }, lignes[0]]), suitesPerso: true };
    const e = ensemblesApres(c, choisi, c.accueil);
    expect(e.map((x) => `${x.nom} : ${x.cases.map((y) => y.mot).join(", ")}`)[0]).toBe("Les gens : papi, mamie, moi, toi");
  });

  it("propose à choisir tous les pictos d'un thème, ses deux pages comprises", () => {
    const mots = casesDuTheme(c, page("Manger").id).map((k) => k.mot);
    expect(mots).toContain("pain");
    expect(mots).toContain("gâteau");
  });
});

