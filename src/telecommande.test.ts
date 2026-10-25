import { describe, expect, it } from "vitest";
import { NAV, SOUS_ONGLETS } from "./components/CommandPalette";
import {
  ceQuIlComprend, comprendre, destinationsDe, dureeDite, dureeEnClair, enChiffres, epurer, inviteDeLaVoix, nomDeLaPage, plat,
  pourLaClasse,
  type ContexteTelecommande, type Destination,
} from "./telecommande";

const D = (label: string, to: string, onglet?: string): Destination => ({ label, to, page: to.slice(1), onglet });
const ctx: ContexteTelecommande = {
  destinations: [
    D("Minuteur visuel", "/caa", "minuteur"),
    D("Supports visuels", "/caa", "supports"),
    D("Consignes en pictogrammes (CAA)", "/caa", "consignes"),
    D("Carte mentale (affichage de la classe : un thème, ses branches, ses idées)", "/jeux", "carteMentale"),
    D("Loto (pictogrammes)", "/jeux", "jeux"),
    D("Fabriquer", "/jeux"),
    D("CAA", "/caa"),
    D("Observations", "/eleves", "observations"),
    D("Élèves", "/eleves"),
    D("Planning", "/planning"),
  ],
  eleves: [
    { id: "e1", nom: "Barnabé Lune" },
    { id: "e2", nom: "Isidore Pomme" },
    { id: "e3", nom: "Isidore Ciel" },
  ],
};

describe("la télécommande", () => {
  it("lit les nombres et les durées dites", () => {
    expect(enChiffres(plat("vingt-cinq minutes et trente et une secondes"))).toBe("25 minutes et 31 secondes");
    expect(dureeDite("minuteur dix minutes")).toBe(600);
    expect(dureeDite("lance un minuteur de 5 min")).toBe(300);
    expect(dureeDite("deux minutes trente")).toBe(150);
    expect(dureeDite("une minute et demie")).toBe(90);
    expect(dureeDite("quarante-cinq secondes")).toBe(45);
    expect(dureeDite("un quart d'heure")).toBe(900);
    expect(dureeDite("une demi-heure")).toBe(1800);
    expect(dureeDite("le minuteur")).toBeNull();
    expect(dureeEnClair(600)).toBe("10 minutes");
    expect(dureeEnClair(90)).toBe("1 minute 30");
    expect(dureeEnClair(45)).toBe("45 secondes");
  });

  it("lance le minuteur, au tableau", () => {
    expect(comprendre("Minuteur dix minutes.", ctx)).toEqual({ genre: "minuteur", secondes: 600 });
    expect(comprendre("Lance un chrono de trois minutes", ctx)).toEqual({ genre: "minuteur", secondes: 180 });
    expect(comprendre("Mets 5 minutes", ctx)).toEqual({ genre: "minuteur", secondes: 300 });
    // Sans durée : le minuteur s'affiche, sans partir.
    expect(comprendre("Affiche le minuteur", ctx)).toEqual({ genre: "aller", destination: ctx.destinations[0] });
  });

  it("ouvre les pages de ⌘K qu'on peut montrer à la classe, par leur nom", () => {
    expect(comprendre("Affiche les supports visuels", ctx)).toMatchObject({ genre: "aller", destination: { onglet: "supports" } });
    expect(comprendre("montre la consigne en pictogrammes", ctx)).toMatchObject({ genre: "aller", destination: { onglet: "consignes" } });
    expect(comprendre("Ouvre la carte mentale", ctx)).toMatchObject({ genre: "aller", destination: { onglet: "carteMentale" } });
    expect(comprendre("le loto", ctx)).toMatchObject({ genre: "aller", destination: { onglet: "jeux" } });
    expect(comprendre("Va à la CAA", ctx)).toMatchObject({ genre: "aller", destination: { to: "/caa", onglet: undefined } });
  });

  it("n'ouvre jamais les élèves, le cahier journal ou les observations : on les cherche, et la recherche les écarte", () => {
    expect(comprendre("Affiche les élèves", ctx)).toEqual({ genre: "chercher", quoi: "eleves", sorte: null });
    expect(comprendre("Montre les observations", ctx)).toEqual({ genre: "chercher", quoi: "observations", sorte: null });
    expect(comprendre("Ouvre le planning", ctx)).toEqual({ genre: "chercher", quoi: "planning", sorte: null });
  });

  it("cherche ce qu'il ne connaît pas par son nom", () => {
    expect(comprendre("Affiche la séquence sur les fractions", ctx)).toEqual({ genre: "chercher", quoi: "fractions", sorte: "sequence" });
    expect(comprendre("Montre-moi les doubles", ctx)).toEqual({ genre: "chercher", quoi: "doubles", sorte: null });
    expect(comprendre("Ouvre le jeu des animaux de la ferme", ctx)).toEqual({ genre: "chercher", quoi: "animaux ferme", sorte: "jeu" });
  });

  it("met en plein écran, et ferme", () => {
    expect(comprendre("Plein écran", ctx)).toEqual({ genre: "pleinEcran", actif: true });
    expect(comprendre("Quitte le plein écran", ctx)).toEqual({ genre: "pleinEcran", actif: false });
    expect(comprendre("Ferme", ctx)).toEqual({ genre: "fermer" });
    expect(comprendre("Stop.", ctx)).toEqual({ genre: "fermer" });
  });

  it("prépare une note sur un élève, par son prénom ou son nom entier", () => {
    expect(comprendre("Note pour Barnabé : a lu douze mots seul.", ctx))
      .toEqual({ genre: "note", eleve: ctx.eleves[0], texte: "A lu douze mots seul." });
    expect(comprendre("Note Isidore Ciel qui a compté jusqu'à 20", ctx))
      .toEqual({ genre: "note", eleve: ctx.eleves[2], texte: "A compté jusqu'à 20" });
    expect(comprendre("Note pour Isidore : a fini", ctx)).toMatchObject({ genre: "rien", pourquoi: expect.stringContaining("Plusieurs élèves") });
    expect(comprendre("Note pour Zoé : bravo", ctx)).toMatchObject({ genre: "rien" });
    expect(comprendre("Note pour Barnabé", ctx)).toEqual({ genre: "rien", pourquoi: "Que faut-il noter ?" });
  });

  it("dit quand il n'a rien compris ou rien entendu", () => {
    expect(comprendre("", ctx)).toEqual({ genre: "rien", pourquoi: "Je n'ai rien entendu." });
    expect(comprendre("Affiche", ctx)).toEqual({ genre: "rien", pourquoi: "Que faut-il afficher ?" });
    expect(comprendre("Lance le minuteur", ctx)).toMatchObject({ genre: "aller" });
    for (const aide of ["Qu'est-ce que je peux dire ?", "Que dire ?", "Aide", "Alors, je dis quoi ?", "Les commandes"]) {
      expect(comprendre(aide, ctx), aide).toEqual({ genre: "aide" });
    }
  });
});

describe("la télécommande, comme on parle en classe", () => {
  // Les vraies pages de ⌘K : ce que l'enseignant voit dans « Que dire ? ».
  const vraies = destinationsDe(NAV, SOUS_ONGLETS);
  const classe: ContexteTelecommande = { destinations: vraies, eleves: ctx.eleves };
  const page = (onglet: string) => ({ genre: "aller", destination: { onglet } });

  it("laisse ce qui ne change pas la commande, et recolle les sigles épelés", () => {
    expect(epurer(plat("Alors, tu peux afficher la carte mentale, s'il te plaît ?"))).toBe("afficher la carte mentale");
    expect(epurer(plat("C'est bon, tu peux fermer."))).toBe("fermer");
    expect(epurer(plat("Va à la C.A.A."))).toBe("va a la caa");
  });

  it.each([
    ["Lance un minuteur de dix minutes, s'il te plaît.", { genre: "minuteur", secondes: 600 }],
    ["Tu peux mettre un minuteur de 3 minutes ?", { genre: "minuteur", secondes: 180 }],
    ["Cinq minutes.", { genre: "minuteur", secondes: 300 }],
    ["Minuteur dix.", { genre: "minuteur", secondes: 600 }],
    ["On met cinq minutes.", { genre: "minuteur", secondes: 300 }],
    ["Démarre un compte à rebours de 4 minutes.", { genre: "minuteur", secondes: 240 }],
    ["Maîtrise, minuteur cinq minutes.", { genre: "minuteur", secondes: 300 }],
    ["Tu peux afficher la carte mentale s'il te plaît ?", page("carteMentale")],
    ["On passe à la carte mentale.", page("carteMentale")],
    ["Ouvre la page des supports visuels.", page("supports")],
    ["Je voudrais voir le loto.", page("jeux")],
    ["Retourne aux supports visuels.", page("supports")],
    ["Ouvre les TLA.", page("tla")],
    ["Affiche la frise.", page("frise")],
    ["Affiche le tableau de jetons.", page("jetons")],
    ["Montre le d'abord ensuite.", page("dabord")],
    ["Va à la C.A.A.", { genre: "aller", destination: { label: "CAA", to: "/caa" } }],
    // Ce que Whisper a vraiment écrit, sur des commandes dites (essai du 25 octobre).
    ["Voilà CAA.", { genre: "aller", destination: { label: "CAA", to: "/caa" } }],
    ["Affiche la prise.", page("frise")],
    ["Je vous montre le d'abord ensuite.", page("dabord")],
    ["Note pour Barnabé. A lu 12 mots seul.", { genre: "note", eleve: { id: "e1" }, texte: "A lu 12 mots seul." }],
    ["Cherche les fractions.", { genre: "chercher", quoi: "fractions", sorte: null }],
    ["C'est bon, tu peux fermer.", { genre: "fermer" }],
    ["Note que Barnabé a bien travaillé.", { genre: "note", eleve: { id: "e1" }, texte: "A bien travaillé." }],
    ["Alors, note pour Barnabé : a travaillé dix minutes seul.", { genre: "note", eleve: { id: "e1" }, texte: "A travaillé dix minutes seul." }],
    ["Note pour Isidore Pomme : a fini l'atelier.", { genre: "note", eleve: { id: "e2" }, texte: "A fini l'atelier." }],
  ])("« %s »", (phrase, attendu) => {
    expect(comprendre(phrase, classe)).toMatchObject(attendu);
  });

  it("à une lettre près, seulement sur les mots longs, et sans confondre les pages", () => {
    expect(comprendre("Affiche les motifs", classe)).toMatchObject(page("motifs"));
    expect(comprendre("Montre le lot", classe)).toMatchObject({ genre: "chercher" });
    expect(comprendre("Affiche la crise", classe)).toMatchObject(page("frise"));
    expect(comprendre("Affiche la cerise", classe)).toMatchObject({ genre: "chercher" });
  });

  it("n'ouvre toujours pas ce qui nomme les élèves, même poliment", () => {
    expect(comprendre("Tu peux afficher les observations s'il te plaît ?", classe)).toMatchObject({ genre: "chercher" });
    expect(comprendre("Je voudrais voir l'emploi du temps", classe)).toMatchObject({ genre: "chercher" });
  });
});

describe("ce que Whisper lit avant chaque commande", () => {
  it("des commandes d'abord, puis les prénoms par petits groupes, chacun une fois", () => {
    const eleves = ["Barnabé Lune", "Isidore Pomme", "Isidore Ciel", "Ada", "Basile", "Capucine", "Dorian", "Eulalie", "Firmin"]
      .map((nom) => ({ nom }));
    const invite = inviteDeLaVoix(eleves);
    expect(invite.startsWith("Minuteur cinq minutes. Plein écran. Ferme.")).toBe(true);
    expect(invite).toContain("Note pour Barnabé, Isidore, Ada, Basile, Capucine et Dorian. Note pour Eulalie et Firmin.");
    expect(invite).not.toContain("Pomme");
    expect(inviteDeLaVoix([])).not.toContain("Note pour");
    expect(inviteDeLaVoix([{ nom: "Ada" }]).endsWith("Note pour Ada.")).toBe(true);
  });
});

describe("ce que la télécommande comprend, montré sur le téléphone", () => {
  const vraies = destinationsDe(NAV, SOUS_ONGLETS);
  const classe: ContexteTelecommande = { destinations: vraies, eleves: ctx.eleves };
  const groupes = ceQuIlComprend(vraies);

  it("chaque phrase à toucher se comprend telle quelle, et chaque page s'ouvre par son nom", () => {
    for (const g of groupes.filter((g) => g.aToucher)) {
      for (const exemple of g.exemples) {
        const c = comprendre(exemple, classe);
        expect(["minuteur", "pleinEcran", "fermer", "aller"], `${g.titre} › ${exemple}`).toContain(c.genre);
        if (c.genre === "aller") expect(nomDeLaPage(c.destination.label), `${g.titre} › ${exemple}`).toBe(exemple);
      }
    }
  });

  it("montre toutes les pages de la classe, une fois, et aucune autre", () => {
    const pages = groupes.filter((g) => g.aToucher && !["Minuteur", "Écran"].includes(g.titre)).flatMap((g) => g.exemples);
    const attendues = new Set(vraies.filter(pourLaClasse).map((d) => nomDeLaPage(d.label)));
    expect(new Set(pages)).toEqual(attendues);
    expect(pages.length).toBe(attendues.size);
    for (const cachee of ["Élèves", "Observations", "Planning", "Organisation", "Emploi du temps"]) expect(pages).not.toContain(cachee);
    // Ce qu'on affiche le plus d'abord ; les phrases sans exemple à toucher, à la fin.
    expect(groupes.slice(0, 4).map((g) => g.titre)).toEqual(["Minuteur", "Écran", "CAA", "Fabriquer"]);
    expect(groupes[groupes.length - 1]).toMatchObject({ titre: "Noter, sans rien afficher", aToucher: false });
  });
});
