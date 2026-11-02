import { describe, expect, it } from "vitest";
import { ajouterUnTour, enAttenteDeVoix, lireLeDialogue, nombreDeMots, nomParDefaut, nomPropre, renommer } from "./dialogueReunion";

describe("une réunion comme une conversation (demande de l'enseignant, 2026-11-02)", () => {
  it("écrit un paragraphe par tour de parole, et prolonge celui de la personne qui parle encore", () => {
    let d = "";
    d = ajouterUnTour(d, "Personne 1", "Bonjour à tous.");
    d = ajouterUnTour(d, "Personne 1", " On commence par le projet. ");
    d = ajouterUnTour(d, "Personne 2", "D'accord.");
    d = ajouterUnTour(d, "", "Un passage sans voix reconnue.");
    d = ajouterUnTour(d, "Personne 2", "   ");
    expect(d).toBe("Personne 1 : Bonjour à tous. On commence par le projet.\n\nPersonne 2 : D'accord.\n\nUn passage sans voix reconnue.");
  });

  it("se relit tour par tour : une phrase avec deux-points ne devient pas un personnage", () => {
    const d = "Personne 1 : Bonjour.\n\nIl a dit : oui, on verra.\n\nDirectrice : On avance.\n\nDirectrice : La suite ?";
    expect(lireLeDialogue(d)).toEqual([
      { nom: "Personne 1", texte: "Bonjour." },
      { nom: "", texte: "Il a dit : oui, on verra." },
      { nom: "Directrice", texte: "On avance." },
      { nom: "Directrice", texte: "La suite ?" },
    ]);
    expect(lireLeDialogue("")).toEqual([]);
  });

  it("renomme une personne en tête de ses tours seulement", () => {
    const d = "Personne 1 : Bonjour.\n\nPersonne 2 : Personne 1 : c'est vous ?\n\nPersonne 1 : Oui.";
    expect(renommer(d, "Personne 1", "Maman de L.")).toBe("Maman de L. : Bonjour.\n\nPersonne 2 : Personne 1 : c'est vous ?\n\nMaman de L. : Oui.");
    expect(renommer(d, "Personne 1", "  ")).toBe(d);
    expect(nomPropre(" La directrice :\nadjointe ")).toBe("La directrice adjointe");
  });

  it("nomme une voix reconnue tant qu'elle n'est pas renommée", () => {
    expect(nomParDefaut("speaker_2")).toBe("Personne 2");
    expect(nomParDefaut("agent")).toBe("agent");
    expect(nomParDefaut(null)).toBe("");
  });

  it("garde en attente les mots écrits à l'instant, jusqu'à ce que la bulle de leur personne arrive", () => {
    const instantane = "Bonjour à tous, merci d'être venus. On commence par le projet";
    expect(enAttenteDeVoix(instantane, 0)).toBe(instantane);
    // La première phrase a trouvé sa personne : il ne reste que la suite.
    expect(enAttenteDeVoix(instantane, nombreDeMots("Bonjour à tous, merci d'être venus."))).toBe("On commence par le projet");
    expect(enAttenteDeVoix(instantane, 99)).toBe("");
    expect(nombreDeMots("  ")).toBe(0);
  });
});
