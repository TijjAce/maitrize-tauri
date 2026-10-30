import { describe, expect, it } from "vitest";
import { NAV, SOUS_ONGLETS } from "./components/CommandPalette";
import {
  catalogue, ceQuIlComprend, comprendre, consigneDeMistral, destinationsDe, dureeDite, dureeEnClair, enChiffres, epurer,
  estComplexe, inviteDeLaVoix, jourDit, lireLesActions, masquerLesPrenoms, nomDeLaPage, nommesParmi, pageAConfirmer, plat,
  type ContexteTelecommande, type Destination, type ListesDeLaClasse,
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

  it("va dans tous les menus — ceux des élèves aussi, que la fenêtre n'affiche qu'après un « oui »", () => {
    for (const [phrase, nom] of [["Affiche les élèves", "Élèves"], ["Montre les observations", "Observations"], ["Ouvre le planning", "Planning"]]) {
      const c = comprendre(phrase, ctx);
      expect(c, phrase).toMatchObject({ genre: "aller", destination: { label: nom } });
      expect(c.genre === "aller" && pageAConfirmer(c.destination), phrase).toBe(true);
    }
    // « Observations » seul est la page, pas une note.
    expect(comprendre("Observations", ctx)).toMatchObject({ genre: "aller", destination: { label: "Observations" } });
    expect(pageAConfirmer(ctx.destinations.find((d) => d.label === "Supports visuels")!)).toBe(false);
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
    // … et Voxtral, en ligne.
    ["Alfiche la frise.", page("frise")],
    ["Affriche le tableau de jetons.", page("jetons")],
    ["Affichent les supports visuels.", page("supports")],
    ["La fiche la frise.", page("frise")],
    ["Femme.", { genre: "fermer" }],
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
    expect(comprendre("Fiches", classe)).toMatchObject({ genre: "aller", destination: { to: "/ateliers" } });
    expect(comprendre("Montre les femmes", classe)).toMatchObject({ genre: "chercher" });
  });

  it("les menus des élèves et de l'organisation s'ouvrent aussi, poliment demandés — après un « oui »", () => {
    for (const [phrase, onglet] of [["Tu peux afficher les observations s'il te plaît ?", "observations"], ["Je voudrais voir l'emploi du temps", "edt"]]) {
      const c = comprendre(phrase, classe);
      expect(c, phrase).toMatchObject({ genre: "aller", destination: { onglet } });
      expect(c.genre === "aller" && pageAConfirmer(c.destination), phrase).toBe(true);
    }
    expect(comprendre("Va dans les réglages", classe)).toMatchObject({ genre: "aller", destination: { to: "/reglages" } });
  });
});

describe("les commandes brèves, comprises sans attendre", () => {
  const vraies = destinationsDe(NAV, SOUS_ONGLETS);
  const classe: ContexteTelecommande = { destinations: vraies, eleves: ctx.eleves };
  it.each([
    ["Pause", { genre: "minuteurPause" }],
    ["Mets en pause", { genre: "minuteurPause" }],
    ["Reprends.", { genre: "minuteurReprendre" }],
    ["Arrête le minuteur", { genre: "minuteurArreter" }],
    ["Ajoute deux minutes", { genre: "minuteurAjouter", secondes: 120 }],
    ["Encore cinq minutes", { genre: "minuteurAjouter", secondes: 300 }],
    ["Deux minutes de plus", { genre: "minuteurAjouter", secondes: 120 }],
    ["Enlève une minute", { genre: "minuteurAjouter", secondes: -60 }],
    ["Plus grand", { genre: "zoom", sens: "plus" }],
    ["Affiche plus grand, s'il te plaît", { genre: "zoom", sens: "plus" }],
    ["Plus petit", { genre: "zoom", sens: "moins" }],
    ["Taille normale", { genre: "zoom", sens: "normal" }],
    ["Descends", { genre: "defiler", sens: "bas" }],
    ["Remonte", { genre: "defiler", sens: "haut" }],
    ["Retour", { genre: "retour" }],
    // Ce qui se disait déjà ne change pas.
    ["Remets cinq minutes", { genre: "minuteur", secondes: 300 }],
    ["Stop.", { genre: "fermer" }],
  ])("« %s »", (phrase, attendu) => {
    expect(comprendre(phrase, classe)).toEqual(attendu);
  });
});

describe("Mistral, pour les phrases complexes", () => {
  const vraies = destinationsDe(NAV, SOUS_ONGLETS);
  const classe: ContexteTelecommande = { destinations: vraies, eleves: ctx.eleves };
  const listes: ListesDeLaClasse = {
    sequences: [{ id: "q-a", titre: "Les fractions" }],
    seances: [
      { id: "s-a", titre: "Partager une bande", numero: 2, date: "2026-10-25T09:00:00", sequenceId: "q-a" },
      { id: "s-b", titre: "Lecture avec Barnabé", numero: 1, date: "2026-10-26", sequenceId: null },
    ],
    jeux: [{ id: "j-a", titre: "Loto des animaux" }],
    outils: [], textes: [{ id: "t-a", titre: "Le Petit Chaperon rouge" }],
    dossiers: ["Maths/Nombres", "Maths/Nombres/Jusqu'à 10"],
  };
  const elements = catalogue(listes, ctx.eleves, "2026-10-25");

  it("le catalogue : un nom court par élément, la séquence d'une séance, « aujourd'hui », et pas un prénom", () => {
    expect(elements.map((e) => `${e.ref} ${e.libelle}`)).toEqual([
      "q1 séquence « Les fractions »",
      "s1 séance 2 « Partager une bande » (séquence « Les fractions ») — aujourd'hui",
      "s2 séance 1 « Lecture avec [élève] »",
      "j1 jeu « Loto des animaux »",
      "t1 texte « Le Petit Chaperon rouge »",
      "d1 dossier « Maths › Nombres »",
    ]);
    expect(masquerLesPrenoms("Isidore et Pomme lisent", ctx.eleves)).toBe("[élève] et [élève] lisent");
  });

  it("une phrase qui demande plusieurs choses va à Mistral ; « et demie » ou un nom de page, non", () => {
    expect(estComplexe("Lance dix minutes et affiche la carte mentale", vraies)).toBe(true);
    expect(estComplexe("Ouvre la séance d'aujourd'hui puis mets-la en plein écran", vraies)).toBe(true);
    expect(estComplexe("Minuteur une minute et demie", vraies)).toBe(false);
    expect(estComplexe("Affiche Frises et calendriers", vraies)).toBe(false);
    expect(estComplexe("Affiche la carte mentale", vraies)).toBe(false);
  });

  it("la consigne : toutes les actions, les pages et le catalogue ; ni prénom, ni page cachée", () => {
    const consigne = consigneDeMistral(vraies, elements, "aucun minuteur ; page affichée : /caa.");
    for (const nom of new Set(vraies.map((d) => nomDeLaPage(d.label)))) expect(consigne).toContain(nom);
    for (const a of ["minuteur_ajouter", "ouvrir", "zoom", "defiler", "retour", "note"]) expect(consigne).toContain(`"action":"${a}"`);
    expect(consigne).toContain("s1 : séance 2 « Partager une bande » (séquence « Les fractions ») — aujourd'hui");
    expect(consigne).toContain("En ce moment : aucun minuteur");
    // Une séance est prévue aujourd'hui : rien à dire. Aucune : on le lui dit, pour qu'il n'en invente pas.
    expect(consigne).not.toContain("aucune séance n'est prévue");
    expect(consigneDeMistral(vraies, catalogue(listes, ctx.eleves, "2026-11-02"), "")).toContain("aucune séance n'est prévue");
    for (const tu of ["Barnabé", "Isidore", "Pomme"]) expect(consigne).not.toContain(tu);
  });

  it("ses actions, relues, dans l'ordre : ce qui sort de la liste tombe", () => {
    const lu = (j: unknown, phrase = "les fractions et le loto des animaux") =>
      lireLesActions(typeof j === "string" ? j : JSON.stringify(j), classe, elements, phrase);
    expect(lu({ actions: [
      { action: "minuteur", secondes: 600 },
      { action: "page", page: "Carte mentale" },
      { action: "ouvrir", ref: "s1" },
      { action: "zoom", sens: "plus" },
    ] })).toMatchObject([
      { genre: "minuteur", secondes: 600 },
      { genre: "aller", destination: { onglet: "carteMentale" } },
      { genre: "ouvrir", element: { id: "s-a", sorte: "seance" } },
      { genre: "zoom", sens: "plus" },
    ]);
    // Une action seule, sans liste, et en bloc de code : lue aussi.
    expect(lu("```json\n{\"action\":\"minuteur_ajouter\",\"secondes\":-60}\n```")).toEqual([{ genre: "minuteurAjouter", secondes: -60 }]);
    // Une page inventée, une référence inventée, un élève inconnu, une action qui n'existe pas : elles tombent.
    expect(lu({ actions: [{ action: "page", page: "La page des secrets" }, { action: "ouvrir", ref: "s99" }, { action: "fermer" }] }))
      .toEqual([{ genre: "fermer" }]);
    // Une page des élèves : lue — la fenêtre demandera le « oui ».
    expect(lu({ actions: [{ action: "page", page: "Élèves" }] })).toMatchObject([{ genre: "aller", destination: { to: "/eleves" } }]);
    expect(lu({ actions: [{ action: "note", eleve: "Zoé", texte: "bravo" }, { action: "supprimer_tout" }] })).toBeNull();
    expect(lu({ actions: [{ action: "note", eleve: "Barnabé", texte: "a lu seul" }] }))
      .toEqual([{ genre: "note", eleve: ctx.eleves[0], texte: "A lu seul" }]);
    expect(lu({ actions: [{ action: "minuteur", secondes: 2 }, { action: "zoom", sens: "énorme" }] })).toBeNull();
    // Un élément que la phrase ne nomme pas — la séance 2 d'une autre séquence — ne s'ouvre pas.
    expect(lu({ actions: [{ action: "ouvrir", ref: "j1" }] }, "ouvre le jeu du loto")).toMatchObject([{ genre: "ouvrir" }]);
    expect(lu({ actions: [{ action: "ouvrir", ref: "j1" }] }, "ouvre le jeu des volcans")).toBeNull();
    // Le début d'un mot le nomme : « maths » pour « Mathématiques ».
    const dossiers = catalogue({ ...listes, dossiers: ["Mathématiques"] }, ctx.eleves, "2026-10-25");
    expect(lireLesActions(JSON.stringify({ action: "ouvrir", ref: "d1" }), classe, dossiers, "le dossier des maths")).toMatchObject([{ genre: "ouvrir" }]);
    expect(lu({ actions: [{ action: "ouvrir", ref: "s1" }] }, "la deuxième séance d'aujourd'hui")).toMatchObject([{ genre: "ouvrir" }]);
    // « Chercher » des mots qui nomment une page de la classe : la page s'ouvre.
    expect(lu({ actions: [{ action: "chercher", quoi: "frise" }] })).toMatchObject([{ genre: "aller", destination: { onglet: "frise" } }]);
    // Rien à faire, ou pas du JSON : rien.
    expect(lu({ actions: [] })).toBeNull();
    expect(lu("pas du JSON")).toBeNull();
    // Au plus quatre actions.
    expect(lu({ actions: Array.from({ length: 7 }, () => ({ action: "defiler", sens: "bas" })) })).toHaveLength(4);
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
        expect(["minuteur", "minuteurPause", "minuteurReprendre", "minuteurArreter", "minuteurAjouter", "pleinEcran", "fermer",
          "zoom", "defiler", "retour", "aller"], `${g.titre} › ${exemple}`).toContain(c.genre);
        if (c.genre === "aller") expect(nomDeLaPage(c.destination.label), `${g.titre} › ${exemple}`).toBe(exemple);
      }
    }
  });

  it("montre toutes les pages de ⌘K, une fois chacune", () => {
    const pages = groupes.filter((g) => g.aToucher && !["Minuteur", "Écran"].includes(g.titre)).flatMap((g) => g.exemples);
    const attendues = new Set(vraies.map((d) => nomDeLaPage(d.label)));
    expect(new Set(pages)).toEqual(attendues);
    expect(pages.length).toBe(attendues.size);
    for (const menu of ["Élèves", "Observations", "Planning", "Organisation", "Emploi du temps", "Réglages"]) expect(pages).toContain(menu);
    // Ce qu'on affiche le plus d'abord ; les phrases sans exemple à toucher, à la fin.
    expect(groupes.slice(0, 4).map((g) => g.titre)).toEqual(["Minuteur", "Écran", "CAA", "Fabriquer"]);
    expect(groupes.slice(-2).map((g) => g.aToucher)).toEqual([false, false]);
  });
});

describe("créer à la voix, après un « oui » sur le téléphone (demande de l'enseignant, 30 octobre 2026)", () => {
  const dit = (phrase: string) => comprendre(phrase, ctx);

  it("une séquence : son titre tel qu'il est dit, et ce que la phrase en précise — classe, période, matière", () => {
    expect(dit("Crée une séquence sur les volcans au CM1 en période 2."))
      .toEqual({ genre: "creerSequence", titre: "Les volcans", classe: "CM1", periode: 2, matiere: null, touteFaite: false });
    expect(dit("Nouvelle séquence : le corps humain")).toMatchObject({ genre: "creerSequence", titre: "Le corps humain", classe: null, periode: null });
    expect(dit("Fais une séquence de maths en CE deux période trois sur les fractions, s'il te plaît"))
      .toEqual({ genre: "creerSequence", titre: "Les fractions", classe: "CE2", periode: 3, matiere: "Mathématiques", touteFaite: false });
    expect(dit("Crée une séquence de sciences sur les volcans en grande section")).toMatchObject({ titre: "Les volcans", matiere: "Sciences et techno.", classe: "GS" });
    expect(dit("Je voudrais créer la séquence toute faite de la symétrie au CE2"))
      .toMatchObject({ genre: "creerSequence", titre: "La symétrie", classe: "CE2", touteFaite: true });
    expect(dit("Crée une séquence")).toMatchObject({ genre: "rien" });
  });

  it("une séance : la séquence nommée — sinon celle qui est affichée —, son titre, son jour, sa durée", () => {
    expect(dit("Ajoute une séance à la séquence des fractions : partager une pizza"))
      .toEqual({ genre: "creerSeance", titre: "Partager une pizza", sequence: "des fractions", jour: null, duree: null });
    expect(dit("Ajoute une séance dans cette séquence : les éruptions")).toMatchObject({ titre: "Les éruptions", sequence: null });
    expect(dit("Crée une séance de lecture pour demain")).toMatchObject({ titre: "Lecture", sequence: null, jour: "demain" });
    expect(dit("Crée-moi une séance de 45 minutes pour lundi prochain dans la séquence des volcans"))
      .toMatchObject({ titre: "", sequence: "des volcans", jour: "lundi", duree: 45 });
    expect(dit("Prépare une séance d'une heure et demie après-demain")).toMatchObject({ duree: 90, jour: "après-demain" });
  });

  it("ne crée que ce qu'on demande : ouvrir, chercher, le minuteur restent ce qu'ils sont ; « annule » défait", () => {
    expect(dit("Affiche la séquence des fractions")).toMatchObject({ genre: "chercher", sorte: "sequence" });
    expect(dit("La séance d'aujourd'hui")).toMatchObject({ genre: "chercher" });
    expect(dit("Ajoute deux minutes")).toEqual({ genre: "minuteurAjouter", secondes: 120 });
    expect(dit("Annule")).toEqual({ genre: "annuler" });
    expect(dit("Annule la création")).toEqual({ genre: "annuler" });
  });

  it("le jour dit devient une date ; un titre se retrouve par ses mots", () => {
    expect(["demain", "après-demain", "lundi", "vendredi", "aujourd'hui"].map((j) => jourDit(j, "2026-10-30")))
      .toEqual(["2026-10-31", "2026-11-01", "2026-11-02", "2026-11-06", "2026-10-30"]);
    const titres = [{ titre: "La symétrie axiale : reconnaître et compléter une figure (CE2)", valeur: "a" }, { titre: "Les fractions (CE2)", valeur: "b" }];
    expect(nommesParmi("de la symétrie", titres)).toEqual(["a"]);
    expect(nommesParmi("les fraction", titres)).toEqual(["b"]);
    expect(nommesParmi("les volcans", titres)).toEqual([]);
    // À égalité, le titre dit tel quel l'emporte ; sinon, tous, pour que l'enseignant choisisse.
    const deux = [{ titre: "La symétrie axiale (CE2)", valeur: "c" }, ...titres];
    expect(nommesParmi("La symétrie axiale", deux)).toEqual(["c"]);
    expect(nommesParmi("La symétrie", deux)).toEqual(["c", "a"]);
  });

  it("avec Mistral : des créations relues — classe, période, matière possibles —, dans une séquence que la phrase nomme", () => {
    const vraies = destinationsDe(NAV, SOUS_ONGLETS);
    const classe: ContexteTelecommande = { destinations: vraies, eleves: ctx.eleves };
    const elements = catalogue({ sequences: [{ id: "q-a", titre: "Les volcans" }], seances: [], jeux: [{ id: "j-a", titre: "Loto des volcans" }], outils: [], textes: [], dossiers: [] },
      ctx.eleves, "2026-10-30");
    const lu = (j: unknown, phrase: string) => lireLesActions(JSON.stringify(j), classe, elements, phrase);
    expect(lu({ actions: [{ action: "creer_sequence", titre: "Les volcans", classe: "cm1", periode: 2, matiere: "Sciences et techno." }] }, "crée une séquence de sciences sur les volcans au CM1"))
      .toEqual([{ genre: "creerSequence", titre: "Les volcans", classe: "CM1", periode: 2, matiere: "Sciences et techno.", touteFaite: false }]);
    // Une classe, une période, une matière qui n'existent pas tombent ; la création reste, sans elles.
    expect(lu({ actions: [{ action: "creer_sequence", titre: "Les volcans", classe: "6e", periode: 9, matiere: "Chimie" }] }, "crée une séquence sur les volcans"))
      .toEqual([{ genre: "creerSequence", titre: "Les volcans", classe: null, periode: null, matiere: null, touteFaite: false }]);
    expect(lu({ actions: [{ action: "creer_sequence", titre: "" }] }, "crée une séquence")).toBeNull();
    expect(lu({ actions: [{ action: "creer_seance", titre: "Les éruptions", sequence: "q1", jour: "Demain", duree: 45 }] }, "ajoute une séance aux volcans sur les éruptions demain"))
      .toEqual([{ genre: "creerSeance", titre: "Les éruptions", sequence: "Les volcans", sequenceId: "q-a", jour: "demain", duree: 45 }]);
    // Une référence qui n'est pas une séquence, ou une séquence que la phrase ne nomme pas : rien.
    expect(lu({ actions: [{ action: "creer_seance", titre: "x", sequence: "j1" }] }, "ajoute une séance au loto des volcans")).toBeNull();
    expect(lu({ actions: [{ action: "creer_seance", titre: "x", sequence: "q1" }] }, "ajoute une séance aux fractions")).toBeNull();
    expect(lu({ actions: [{ action: "annuler" }] }, "annule tout ça")).toEqual([{ genre: "annuler" }]);
    const consigne = consigneDeMistral(vraies, elements, "");
    for (const a of ["creer_sequence", "creer_seance", "annuler"]) expect(consigne).toContain(`"action":"${a}"`);
  });
});
