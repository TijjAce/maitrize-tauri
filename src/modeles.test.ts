import { describe, it, expect } from "vitest";
import { MODELES_MISTRAL, MODELE_DEFAUT, MODELE_TACHES, MODELES_REMPLACES, normaliserModele } from "./api";

// Mistral retire des modèles au fil des mois et n'ouvre pas les mêmes à tous
// les abonnements. Un identifiant périmé enregistré dans les réglages faisait
// échouer l'assistant par un message de débit qui n'expliquait rien.

describe("choix du modèle Mistral", () => {
  it("propose un modèle par défaut ouvert à tous les comptes", () => {
    expect(MODELE_DEFAUT).toMatch(/^ministral-/);
    expect(MODELE_TACHES).toMatch(/^ministral-/);
  });

  it("ne propose plus les identifiants retirés par Mistral", () => {
    const retires = ["open-mistral-nemo", "open-mistral-7b", "open-mixtral-8x7b", "mistral-tiny"];
    for (const id of retires) {
      expect(MODELES_MISTRAL.map((m) => m.id)).not.toContain(id);
    }
  });

  it("garde le modèle par défaut dans la liste proposée", () => {
    expect(MODELES_MISTRAL.map((m) => m.id)).toContain(MODELE_DEFAUT);
    expect(MODELES_MISTRAL.map((m) => m.id)).toContain(MODELE_TACHES);
  });

  it("signale les modèles qui demandent un abonnement payant", () => {
    for (const m of MODELES_MISTRAL) {
      if (m.id.startsWith("ministral-")) continue;
      expect(m.label).toMatch(/payant/i);
    }
  });

  it("remplace un identifiant périmé par un modèle encore servi", () => {
    expect(normaliserModele("open-mistral-nemo")).toBe("ministral-8b-latest");
    expect(normaliserModele("mistral-small-latest")).toBe("ministral-14b-latest");
  });

  it("laisse intact un identifiant valide", () => {
    expect(normaliserModele("ministral-14b-latest")).toBe("ministral-14b-latest");
    expect(normaliserModele("mistral-medium-latest")).toBe("mistral-medium-latest");
  });

  it("retombe sur le défaut quand rien n'est enregistré", () => {
    expect(normaliserModele(null)).toBe(MODELE_DEFAUT);
    expect(normaliserModele("")).toBe(MODELE_DEFAUT);
    expect(normaliserModele("   ")).toBe(MODELE_DEFAUT);
    expect(normaliserModele(undefined)).toBe(MODELE_DEFAUT);
  });

  it("ne renvoie jamais vers un modèle lui-même remplacé", () => {
    for (const cible of Object.values(MODELES_REMPLACES)) {
      expect(MODELES_REMPLACES[cible]).toBeUndefined();
      expect(MODELES_MISTRAL.map((m) => m.id)).toContain(cible);
    }
  });
});
