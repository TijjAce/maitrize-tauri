import { describe, expect, it } from "vitest";
import { classeurComplet } from "./classeurComplet";
import { ensemblesApres } from "./ensembles";
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

  it("« regarde » propose ce qu'on montre : les animaux, les gens, les jeux (« j'ai pas forcément ce qui pourrait suivre »)", () => {
    expect(ensemblesApres(c, caseDe("L'essentiel", "regarde"), c.accueil).map((x) => x.nom)).toEqual(["Les animaux", "Les gens", "Jouer"]);
    expect(ensemblesApres(c, caseDe("Ça ne va pas", "j'ai froid"), page("Ça ne va pas").id).map((x) => x.nom)).toEqual(["S'habiller"]);
  });

  it("sur la deuxième page d'une section, propose la première (« lancer » → les jouets de la page Jouer)", () => {
    const deuxieme = ordreDesPages(c).filter((p) => p.nom === "Jouer")[1];
    const lancer = deuxieme.cases.find((k) => k?.mot === "lancer")!;
    expect(noms(ensemblesApres(c, lancer, deuxieme.id))).toEqual(["Jouer : voiture, ballon, jeu de société, poupée"]);
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
