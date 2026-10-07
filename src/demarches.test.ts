import { describe, it, expect } from "vitest";
import {
  DEBUT_OBJECTIF_SEANCE, DEMARCHES, ENTETE_TABLEAU, FAMILLES, demarcheDe, demarcheSuggeree, demarchesParFamille, resumeDuCadre, seancesDuCadre,
  tableauDesPhases,
} from "./demarches";
import { DUREES } from "./api";

describe("les démarches", () => {
  it("ont chacune un nom, une source, une famille et au moins trois séances", () => {
    expect(DEMARCHES.length).toBeGreaterThanOrEqual(20);
    for (const d of DEMARCHES) {
      expect(d.nom.trim().length, d.id).toBeGreaterThan(0);
      expect(d.source.trim().length, d.id).toBeGreaterThan(0);
      expect(d.resume.trim().length, d.id).toBeGreaterThan(0);
      expect(FAMILLES, d.id).toContain(d.famille);
      expect(d.seances.length, d.id).toBeGreaterThanOrEqual(3);
    }
    expect(new Set(DEMARCHES.map((d) => d.id)).size).toBe(DEMARCHES.length);
    // Le menu les montre toutes, chacune dans sa famille, sans famille vide.
    const groupes = demarchesParFamille();
    expect(groupes.flatMap((g) => g.demarches).length).toBe(DEMARCHES.length);
    expect(groupes.every((g) => g.demarches.length > 0)).toBe(true);
    expect(groupes[0].famille).toBe("Toutes disciplines");
  });

  it("disent, pour chaque séance, ce que les élèves sauront à la fin", () => {
    for (const d of DEMARCHES) for (const s of d.seances) {
      expect(s.objectifs.startsWith(`${DEBUT_OBJECTIF_SEANCE} `), `${d.id} › ${s.titre} : ${s.objectifs}`).toBe(true);
      expect(s.objectifs.length, `${d.id} › ${s.titre}`).toBeGreaterThan(DEBUT_OBJECTIF_SEANCE.length + 3);
    }
    // La séance créée porte cet objectif.
    const seance = seancesDuCadre(demarcheDe("categoriser-maternelle")!, "seq", 1)[0];
    expect(seance.objectifs).toMatch(/^À la fin de cette séance, les élèves sauront nommer chaque objet du corpus/);
  });

  it("gardent les phases lisibles : une durée par ligne, et un tableau qui tient dans l'éditeur", () => {
    for (const d of DEMARCHES) for (const s of d.seances) {
      // Les durées des phases font au plus la durée de la séance : on ne
      // promet pas 55 minutes de phases dans une séance de 30.
      const total = s.phases.reduce((acc, p) => acc + (parseInt(p.duree, 10) || 0), 0);
      expect(total, `${d.id} › ${s.titre} : ${total} min de phases pour ${s.duree}`).toBeLessThanOrEqual(s.duree);
      expect(s.phases.length, `${d.id} › ${s.titre}`).toBeLessThanOrEqual(6);
    }
  });

  it("prévoient des séances complètes, aux durées que l'éditeur propose", () => {
    for (const d of DEMARCHES) for (const s of d.seances) {
      expect(s.titre.trim().length, `${d.id} › ${s.titre}`).toBeGreaterThan(0);
      expect(s.phases.length, `${d.id} › ${s.titre}`).toBeGreaterThan(0);
      // Une durée hors de la liste ne s'afficherait pas dans le menu de la séance.
      expect(DUREES, `${d.id} › ${s.titre} : ${s.duree} min`).toContain(s.duree);
      for (const p of s.phases) {
        expect(p.phase.trim().length, `${d.id} › ${s.titre}`).toBeGreaterThan(0);
        expect(p.duree.trim().length, `${d.id} › ${s.titre} › ${p.phase}`).toBeGreaterThan(0);
      }
    }
  });

  it("reprennent les quatre temps des livrets Éduscol, dans leur ordre et leurs mots", () => {
    const d = demarcheDe("eduscol-quatre-temps")!;
    const premiere = d.seances[0].phases.map((p) => p.phase);
    expect(premiere).toEqual([
      "Temps 1 – Définition des objectifs et mise en réussite",
      "Temps 2 – Mise en activité des élèves",
      "Temps 3 – Institutionnalisation, retour réflexif",
      "Temps 4 – Automatisation, réinvestissement, transfert",
    ]);
    // La séquence se termine comme dans le livret : évaluation courte, puis
    // réinvestissement en séance courte.
    const titres = d.seances.map((s) => s.titre);
    expect(titres[titres.length - 2]).toMatch(/Évaluation/);
    expect(titres[titres.length - 1]).toMatch(/Réinvestissement/);
  });

  it("gardent l'ordre de l'enseignement explicite : je fais, nous faisons, vous faites", () => {
    const d = demarcheDe("explicite")!;
    const phases = d.seances[0].phases.map((p) => p.phase);
    const rang = (mot: string) => phases.findIndex((p) => p.includes(mot));
    expect(rang("je fais")).toBeGreaterThan(rang("Ouverture"));
    expect(rang("nous faisons")).toBeGreaterThan(rang("je fais"));
    expect(rang("vous faites")).toBeGreaterThan(rang("nous faisons"));
    expect(rang("Clôture")).toBeGreaterThan(rang("vous faites"));
  });

  it("tiennent dans la fourchette du module EPS : de six à douze séances", () => {
    const n = demarcheDe("eps-module")!.seances.length;
    expect(n).toBeGreaterThanOrEqual(6);
    expect(n).toBeLessThanOrEqual(12);
  });
});

describe("le cadre posé sur une séquence", () => {
  it("crée les séances numérotées à la suite, rattachées à la séquence", () => {
    const d = demarcheDe("eduscol-quatre-temps")!;
    const seances = seancesDuCadre(d, "seq-1", 3);
    expect(seances).toHaveLength(d.seances.length);
    expect(seances.map((s) => s.numero)).toEqual(seances.map((_, i) => 3 + i));
    expect(seances.every((s) => s.sequenceId === "seq-1")).toBe(true);
    expect(new Set(seances.map((s) => s.id)).size).toBe(seances.length);
    // Rien n'est écrit à la place de l'enseignant : le texte libre reste vide.
    expect(seances.every((s) => s.deroulement === "" && s.bilan === "")).toBe(true);
  });

  it("met les phases dans le tableau de déroulement, avec l'en-tête de l'éditeur", () => {
    const d = demarcheDe("explicite")!;
    const [s] = seancesDuCadre(d, "seq-1");
    const grille = JSON.parse(s.tableauDeroulement) as string[][];
    expect(grille[0]).toEqual([...ENTETE_TABLEAU]);
    expect(grille.length).toBe(d.seances[0].phases.length + 1);
    for (const ligne of grille) expect(ligne).toHaveLength(ENTETE_TABLEAU.length);
    expect(grille[1][0]).toBe(d.seances[0].phases[0].phase);
  });

  it("se résume en séances et en temps", () => {
    const d = { ...demarcheDe("eduscol-quatre-temps")!, seances: [
      { titre: "a", objectifs: "", duree: 45, phases: [] },
      { titre: "b", objectifs: "", duree: 30, phases: [] },
    ] };
    expect(resumeDuCadre(d)).toBe("2 séances, 1 h 15 au total");
    expect(resumeDuCadre({ ...d, seances: [d.seances[1]] })).toBe("1 séance, 30 min au total");
    expect(resumeDuCadre({ ...d, seances: [{ ...d.seances[0], duree: 60 }, d.seances[0], { ...d.seances[0], duree: 15 }] }))
      .toBe("3 séances, 2 h au total");
  });

  it("rend un tableau vide de phases à l'en-tête seul", () => {
    expect(tableauDesPhases([])).toEqual([[...ENTETE_TABLEAU]]);
    expect(demarcheDe("inconnue")).toBeUndefined();
  });
});

describe("la démarche que la compétence appelle", () => {
  it("propose les quatre temps des livrets pour le français et les mathématiques", () => {
    expect(demarcheSuggeree("Français", "Cycle 2 — CP, CE1, CE2 (programmes 2026)").id).toBe("eduscol-quatre-temps");
    expect(demarcheSuggeree("Nombres et calculs", "Cycle 2").id).toBe("eduscol-quatre-temps");
    expect(demarcheSuggeree("", "").id).toBe("eduscol-quatre-temps");
  });

  it("propose le module d'apprentissage pour l'EPS, quelle que soit la graphie", () => {
    expect(demarcheSuggeree("Éducation physique et sportive", "Cycle 2").id).toBe("eps-module");
    expect(demarcheSuggeree("EPS", "").id).toBe("eps-module");
    expect(demarcheSuggeree("Activité physique", "Cycle 1").id).toBe("eps-module");
    // « physique » seul ne suffit pas : ce serait la physique-chimie.
    expect(demarcheSuggeree("Sciences physiques", "Cycle 4").id).toBe("investigation");
  });

  const c2 = "Cycle 2 – CP, CE1, CE2 (programmes en vigueur à la rentrée 2026)";
  const c1 = "Cycle 1 – École maternelle (Programme 2025)";
  const sug = (domaineTitre: string, sousDomaineTitre: string, competenceTitre: string, ref = c2) =>
    demarcheSuggeree({ domaineTitre, sousDomaineTitre, competenceTitre }, ref).id;

  it("lisent le sous-domaine du français : lecture, écriture, oral, vocabulaire, grammaire", () => {
    expect(sug("Français", "Lecture", "Décoder les syllabes contenant les graphèmes étudiés")).toBe("lecture-code");
    expect(sug("Français", "Lecture", "Lire à voix haute avec fluidité, 50 mots par minute")).toBe("lecture-fluence");
    expect(sug("Français", "Lecture", "Comprendre un texte lu par l'adulte et le raconter")).toBe("comprehension");
    expect(sug("Français", "Écriture", "Écrire en cursive de manière fluide et lisible")).toBe("ecriture-geste");
    expect(sug("Français", "Écriture", "Copier un texte court sans erreur")).toBe("ecriture-geste");
    expect(sug("Français", "Écriture", "Produire un écrit narratif de quelques phrases")).toBe("ecriture-rediger");
    expect(sug("Français", "Oral", "Raconter une histoire connue")).toBe("oral");
    expect(sug("Français", "Vocabulaire", "Catégoriser des mots")).toBe("vocabulaire");
    expect(sug("Français", "Grammaire et orthographe", "Identifier le verbe")).toBe("grammaire");
    expect(sug("Français", "Grammaire et orthographe grammaticale", "Accorder le sujet et le verbe", "Cycle 3")).toBe("grammaire");
  });

  it("distinguent, en mathématiques, le calcul, les problèmes et la géométrie", () => {
    // Le calcul mental a désormais sa démarche ; le calcul posé garde les quatre temps.
    expect(sug("Mathématiques", "Nombres, calcul et résolution de problèmes", "Ajouter 9 en calcul mental")).toBe("calcul-mental-martiniere");
    expect(sug("Mathématiques", "Nombres, calcul et résolution de problèmes", "Poser une addition en colonnes")).toBe("eduscol-quatre-temps");
    expect(sug("Mathématiques", "Nombres, calcul et résolution de problèmes", "Résoudre des problèmes additifs en une étape")).toBe("problemes");
    expect(sug("Mathématiques", "Grandeurs et mesures", "Comparer des masses")).toBe("geometrie-grandeurs");
    // Comparer, encadrer, intercaler des entiers : la séquence du guide CP ; pas les fractions.
    expect(sug("Mathématiques", "Nombres, calcul et résolution de problèmes", "Comparer, encadrer, intercaler des nombres entiers en utilisant les symboles =, < et >.")).toBe("comparer-nombres-cp");
    expect(sug("Mathématiques", "Nombres, calcul et résolution de problèmes", "Ordonner des nombres dans l'ordre croissant ou décroissant.")).toBe("comparer-nombres-cp");
    expect(sug("Mathématiques", "Nombres, calcul et résolution de problèmes", "Comparer des fractions de même dénominateur", "Cycle 3")).not.toBe("comparer-nombres-cp");
    // Dénombrer en groupant par dix, passer d'une représentation à l'autre : le chemin du guide CP, au cycle 2.
    expect(sug("Mathématiques", "Nombres, calcul et résolution de problèmes", "Connaitre et utiliser diverses représentations d'un nombre et passer de l'une à l'autre.")).toBe("nombres-livret-cp-59");
    expect(sug("Mathématiques", "Nombres, calcul et résolution de problèmes", "Comparer et dénombrer des collections en les organisant.")).toBe("numeration-dizaine-cp");
    expect(sug("Mathématiques", "Nombres, calcul et résolution de problèmes", "Connaitre et utiliser les relations entre les unités de numération.")).toBe("numeration-dizaine-cp");
    expect(sug("Mathématiques", "Nombres, calcul et résolution de problèmes", "Connaître les unités de numération des grands nombres", "Cycle 3")).not.toBe("numeration-dizaine-cp");
    expect(sug("Mathématiques", "Espace et géométrie", "Reconnaître un carré")).toBe("geometrie-grandeurs");
    expect(sug("Mathématiques", "Organisation et gestion de données", "Lire un tableau")).toBe("problemes");
    expect(sug("Mathématiques", "La proportionnalité", "Reconnaître une situation de proportionnalité", "Cycle 3")).toBe("problemes");
  });

  it("envoient chaque discipline vers son guide", () => {
    expect(sug("Sciences et technologie", "Les êtres vivants dans leur environnement", "Identifier ce qui est vivant")).toBe("investigation");
    expect(sug("Histoire-géographie", "Histoire", "Situer un événement sur une frise", "Cycle 3")).toBe("enquete-histoire-geo");
    expect(sug("Enseignement moral et civique", "CE1 : Respecter les autres", "Écouter l'autre")).toBe("emc-debat");
    expect(sug("Éducation physique et sportive", "Coopérer et s'opposer", "Jouer en respectant les règles")).toBe("eps-module");
    expect(sug("Enseignements artistiques", "Arts plastiques", "Expérimenter des matériaux")).toBe("arts-plastiques");
    expect(sug("Enseignements artistiques", "Éducation musicale", "Chanter en chœur")).toBe("musique");
    expect(sug("Enseignements artistiques", "Histoire des arts", "Décrire une œuvre", "Cycle 3")).toBe("histoire-des-arts");
    expect(sug("Langues vivantes étrangères et régionales", "Compréhension de l'oral : écouter et comprendre (CO)", "Comprendre des consignes")).toBe("langues-vivantes");
  });

  it("en maternelle, proposent la phonologie, le vocabulaire, l'investigation ou les modalités du programme", () => {
    expect(sug("1. Mobiliser le langage dans toutes ses dimensions", "Passer de l'oral à l'écrit: se préparer à apprendre à écrire", "Repérer une syllabe", c1)).toBe("phonologie");
    expect(sug("1. Mobiliser le langage dans toutes ses dimensions", "Acquérir le langage oral", "Utiliser un vocabulaire précis", c1)).toBe("vocabulaire");
    expect(sug("1. Mobiliser le langage dans toutes ses dimensions", "Acquérir le langage oral", "Organiser les mots en catégorie et en réseau", c1)).toBe("categoriser-maternelle");
    // Trier des instruments, classer des formes : ce n'est pas catégoriser des mots.
    expect(sug("3. Agir, s'exprimer, comprendre à travers des activités artistiques", "Univers sonores", "Explorer différents instruments de musique, des objets sonores, les trier, les catégoriser", c1)).toBe("musique");
    expect(sug("1. Mobiliser le langage dans toutes ses dimensions", "Acquérir le langage oral", "Raconter une histoire", c1)).toBe("maternelle-modalites");
    expect(sug("2. Agir, s'exprimer, comprendre à travers l'activité physique", "Se déplacer", "Courir", c1)).toBe("eps-module");
    expect(sug("3. Agir, s'exprimer, comprendre à travers des activités artistiques", "Arts visuels", "Dessiner", c1)).toBe("arts-plastiques");
    expect(sug("3. Agir, s'exprimer, comprendre à travers des activités artistiques", "Les univers sonores", "Chanter", c1)).toBe("musique");
    expect(sug("4. Acquérir les premiers outils mathématiques", "Découvrir les nombres", "Dénombrer jusqu'à 5", c1)).toBe("maternelle-modalites");
    // Constituer une collection d'un cardinal donné : la situation de référence des livrets, quelle que soit la formulation.
    expect(sug("4. Acquérir les premiers outils mathématiques", "Découvrir les nombres", "Constituer une collection (jusqu'à trois, voir quatre objets) d'un cardinal donné", c1)).toBe("collections-maternelle");
    expect(sug("4. Acquérir les premiers outils mathématiques", "Découvrir les nombres", "Construire des collections de cardinal donné.", c1)).toBe("collections-maternelle");
    // La chronologie : le déroulement d'une histoire, sa chronologie, les étapes d'un processus — dans les mots du référentiel.
    for (const comp of ["Comprendre et restituer le déroulement d'évènements quotidiens au sein d'une histoire simple.", "Restituer la chronologie des actions majeures d'une histoire simple.",
      "Repérer les différentes étapes d'un processus ou d'un évènement vécu et les ordonner.", "Ordonner entre eux des moments rituels vécus."]) {
      expect(sug("5. Se repérer dans le temps et l'espace", "Se repérer dans le temps", comp, c1), comp).toBe("chronologie-maternelle");
    }
    // Les étapes de la vie d'un animal restent une observation du vivant.
    expect(sug("6. Découvrir le monde du vivant, de la matière et des objets", "Découvrir le monde du vivant", "Reconnaitre les étapes de la vie d'un animal ou d'une plante.", c1)).toBe("investigation");
    // Trouver un cardinal à partir d'un autre et d'un écart reste un problème.
    expect(sug("4. Acquérir les premiers outils mathématiques", "Utiliser les nombres pour résoudre des problèmes", "Déterminer le cardinal d'une collection à partir de celui d'une autre collection et de l'écart entre les deux.", c1)).toBe("problemes");
    expect(sug("4. Acquérir les premiers outils mathématiques", "Utiliser les nombres pour résoudre des problèmes", "Partager", c1)).toBe("problemes");
    expect(sug("4. Acquérir les premiers outils mathématiques", "Explorer les solides et les formes planes", "Trier", c1)).toBe("geometrie-grandeurs");
    expect(sug("6. Découvrir le monde du vivant, de la matière et des objets", "Découvrir le monde du vivant", "Observer", c1)).toBe("investigation");
    expect(sug("5. Se repérer dans le temps et l'espace", "Se repérer dans le temps", "Ordonner", c1)).toBe("maternelle-modalites");
    // Le domaine seul suffit à reconnaître la maternelle, référentiel absent.
    expect(sug("5. Explorer le monde", "Explorer la matière", "Transvaser", "")).toBe("investigation");
  });
});

describe("le calcul mental au procédé La Martinière", () => {
  it("est proposé pour un fait numérique ou une procédure de calcul, pas pour un problème", () => {
    expect(demarcheSuggeree({ domaineTitre: "Mathématiques", sousDomaineTitre: "Nombres et calculs", competenceTitre: "Ajouter ou soustraire 1 ou 2 à un nombre." }).id).toBe("calcul-mental-martiniere");
    expect(demarcheSuggeree({ domaineTitre: "Mathématiques", sousDomaineTitre: "Nombres et calculs", competenceTitre: "Mémoriser les compléments à 10" }).id).toBe("calcul-mental-martiniere");
    expect(demarcheSuggeree({ domaineTitre: "Mathématiques", sousDomaineTitre: "Calcul mental", competenceTitre: "Multiplier par 10" }).id).toBe("calcul-mental-martiniere");
    expect(demarcheSuggeree({ domaineTitre: "Mathématiques", sousDomaineTitre: "Nombres et calculs", competenceTitre: "Trouver le complément d'un nombre à la dizaine supérieure." }).id).toBe("calcul-mental-martiniere");
    expect(demarcheSuggeree({ domaineTitre: "Mathématiques", sousDomaineTitre: "Nombres et calculs", competenceTitre: "Résoudre des problèmes en une étape" }).id).toBe("problemes");
    expect(demarcheSuggeree({ domaineTitre: "Mathématiques", sousDomaineTitre: "Nombres et calculs", competenceTitre: "Lire et écrire les nombres jusqu'à 100" }).id).toBe("eduscol-quatre-temps");
  });

  it("dit le procédé dans ses mots : énoncé deux fois, réflexion, écrivez, montrez, correction", () => {
    const d = demarcheDe("calcul-mental-martiniere")!;
    expect(d.famille).toBe("Mathématiques");
    const serie = d.seances[1].phases.find((p) => p.phase === "Série La Martinière")!;
    for (const mot of ["deux fois", "réflexion", "Écrivez", "Montrez", "corrige"]) expect(serie.description).toContain(mot);
    // Le plan des guides : une séance longue de découverte, puis des courtes, chacune ouverte par un échauffement.
    expect(d.seances.map((s) => s.duree)).toEqual([45, 15, 15, 15, 15, 20]);
    expect(d.seances[0].phases.map((p) => p.phase)).toEqual(["Échauffement", "Entraînement", "Recherche", "Trace écrite"]);
    for (const s of d.seances.slice(0, 5)) expect(s.phases[0].phase).toBe("Échauffement");
    expect(d.source).toContain("Une séquence de calcul");
  });
});

describe("la numération du cycle 2, compétence par compétence", () => {
  // Les 38 compétences « Les nombres entiers » du référentiel « Cycle 2 — CP, CE1, CE2 (programmes 2026) », et la démarche
  // que chacune appelle à sa classe. « Plus tard » : la demi-droite graduée et les ordinaux attendent leur démarche.
  const REF = "Cycle 2 — CP, CE1, CE2 (programmes 2026)";
  const PLUS_TARD = "eduscol-quatre-temps";
  const COMPETENCES: [string, string, string][] = [
    ["CP", "Comparer et dénombrer des collections en les organisant.", "numeration-dizaine-cp"],
    ["CP", "Construire des collections de cardinal donné.", "numeration-dizaine-cp"],
    ["CP", "Connaitre la suite écrite et la suite orale des nombres jusqu’à cent.", "nombres-livret-cp-59"],
    ["CP", "Connaitre et utiliser diverses représentations d’un nombre et passer de l’une à l’autre.", "nombres-livret-cp-59"],
    ["CP", "Connaitre la valeur des chiffres en fonction de leur position (unités, dizaines).", "nombres-livret-cp-59"],
    ["CP", "Comparer, encadrer, intercaler des nombres entiers en utilisant les symboles =, < et >.", "comparer-nombres-cp"],
    ["CP", "Ordonner des nombres dans l’ordre croissant ou décroissant.", "comparer-nombres-cp"],
    ["CP", "Savoir placer des nombres sur une demi-droite graduée de un en un.", PLUS_TARD],
    ["CP", "Connaitre les nombres ordinaux jusqu’à « vingtième ».", PLUS_TARD],
    ["CP", "Comprendre et utiliser les nombres ordinaux.", PLUS_TARD],
    ["CP", "Repérer un rang ou une position dans une file orientée ou dans une liste d’objets ou de personnes.", PLUS_TARD],
    ["CP", "Faire le lien entre le rang d’un objet dans une liste et le nombre d’éléments qui le précèdent.", PLUS_TARD],
    ["CP", "Utiliser les nombres ordinaux dans le cadre de l’étude de suites de symboles, de formes, de lettres ou de nombres.", PLUS_TARD],
    ["CE1", "Dénombrer des collections en les organisant.", "groupements-ce1"],
    ["CE1", "Construire des collections de cardinal donné.", "groupements-ce1"],
    ["CE1", "Connaitre et utiliser la relation entre unités et dizaines, entre dizaines et centaines, entre unités et centaines.", "groupements-ce1"],
    ["CE1", "Connaitre la suite écrite et la suite orale des nombres jusqu’à mille.", "nombres-livret-ce1"],
    ["CE1", "Connaitre et utiliser diverses représentations d’un nombre et passer de l’une à l’autre.", "nombres-livret-ce1"],
    ["CE1", "Connaitre la valeur des chiffres en fonction de leur position dans un nombre.", "nombres-livret-ce1"],
    ["CE1", "Comparer, encadrer, intercaler des nombres entiers en utilisant les symboles (=, <, >).", "comparer-nombres-ce1"],
    ["CE1", "Ordonner des nombres dans l’ordre croissant ou décroissant.", "comparer-nombres-ce1"],
    ["CE1", "Comprendre et savoir utiliser les expressions « égal à », « supérieur à », « inférieur à », « compris entre … et … ».", "comparer-nombres-ce1"],
    ["CE1", "Savoir placer des nombres sur une demi-droite graduée.", PLUS_TARD],
    ["CE1", "Connaitre les nombres ordinaux jusqu’à cent.", PLUS_TARD],
    ["CE1", "Comprendre et utiliser les nombres ordinaux.", PLUS_TARD],
    ["CE1", "Repérer un rang ou une position dans une file orientée ou dans une liste d’objets ou de personnes.", PLUS_TARD],
    ["CE1", "Faire le lien entre le rang d’un objet dans une liste et le nombre d’éléments qui le précèdent.", PLUS_TARD],
    ["CE1", "Utiliser les nombres ordinaux dans le cadre de suite de symboles, de lettres ou de nombres.", PLUS_TARD],
    ["CE2", "Dénombrer des collections.", "groupements-ce2"],
    ["CE2", "Construire des collections de cardinal donné.", "groupements-ce2"],
    ["CE2", "Connaitre et utiliser les relations entre les unités de numération.", "groupements-ce2"],
    ["CE2", "Connaitre la suite écrite et la suite orale des nombres jusqu’à dix-mille.", "nombres-livret-ce2"],
    ["CE2", "Connaitre et utiliser diverses représentations d’un nombre et passer de l’une à l’autre.", "nombres-livret-ce2"],
    ["CE2", "Connaitre la valeur des chiffres en fonction de leur position dans un nombre.", "nombres-livret-ce2"],
    ["CE2", "Comparer, encadrer, intercaler des nombres entiers en utilisant les symboles (=, <, >).", "comparer-nombres-ce2"],
    ["CE2", "Ordonner des nombres dans l’ordre croissant ou décroissant.", "comparer-nombres-ce2"],
    ["CE2", "Comprendre et savoir utiliser les expressions « égal à », « supérieur à », « inférieur à », « compris entre … et … ».", "comparer-nombres-ce2"],
    ["CE2", "Savoir placer des nombres sur une demi-droite graduée.", PLUS_TARD],
  ];
  const cible = (niveau: string, competenceTitre: string) =>
    ({ domaineTitre: "Mathématiques", sousDomaineTitre: "Nombres, calcul et résolution de problèmes", competenceTitre, niveau });

  it("propose à chaque compétence la démarche de sa classe", () => {
    expect(COMPETENCES).toHaveLength(38);
    for (const [niveau, titre, attendue] of COMPETENCES) {
      expect(demarcheSuggeree(cible(niveau, titre), REF).id, `${niveau} — ${titre}`).toBe(attendue);
    }
  });

  it("passe au CP de « jusqu'à 59 » à « jusqu'à 100 » dès la période 3, comme la progression du livret", () => {
    const suite = cible("CP", "Connaitre la suite écrite et la suite orale des nombres jusqu’à cent.");
    expect(demarcheSuggeree(suite, REF, 2).id).toBe("nombres-livret-cp-59");
    expect(demarcheSuggeree(suite, REF, 3).id).toBe("nombres-livret-cp-100");
    expect(demarcheSuggeree(suite, REF, 5).id).toBe("nombres-livret-cp-100");
  });

  it("dit d'où vient chaque démarche : la source du CP, ou l'adaptation au CE1 et au CE2", () => {
    for (const id of ["nombres-livret-ce1", "nombres-livret-ce2", "groupements-ce1", "groupements-ce2", "comparer-nombres-ce1", "comparer-nombres-ce2"]) {
      const d = demarcheDe(id)!;
      expect(d.source, id).toMatch(/^Adaptée du CP au CE[12], faute de séquence de numération dans le livret CE[12]/);
      expect(d.nom, id).toMatch(/\((CE1|CE2)\)$/);
    }
    expect(demarcheDe("nombres-livret-cp-59")!.source).toMatch(/Livret d'accompagnement du programme de mathématiques, CP \(Éduscol, 2025\)/);
    expect(demarcheDe("nombres-livret-cp-59")!.seances).toHaveLength(8);
    expect(demarcheDe("nombres-livret-cp-100")!.source).toMatch(/Le système de numération oral utilisé en France/);
  });

  it("écrit les nombres de chaque classe, sans un exemple d'une autre", () => {
    const texte = (id: string) => JSON.stringify(demarcheDe(id)!.seances);
    expect(texte("nombres-livret-ce1")).not.toMatch(/millier/);
    expect(texte("nombres-livret-ce2")).toMatch(/millier/);
    expect(texte("groupements-ce2")).not.toMatch(/la millier|une millier|une gros cube/);
    expect(texte("comparer-nombres-ce1")).toContain("412");
    expect(texte("comparer-nombres-ce2")).toContain("4\u202f012");
  });
});

