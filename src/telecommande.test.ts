import { describe, expect, it } from "vitest";
import { comprendre, dureeDite, dureeEnClair, enChiffres, plat, type ContexteTelecommande, type Destination } from "./telecommande";

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
  });
});
