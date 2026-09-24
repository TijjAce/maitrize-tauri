import { describe, it, expect } from "vitest";
import { estUnePanneDeReseau, lireMode, rangeEnLigne, relitEnLigne } from "./modeReunion";

describe("le mode d'une réunion", () => {
  it("se lit tel qu'il a été choisi", () => {
    expect(lireMode("local", null)).toBe("local");
    expect(lireMode("ligne", null)).toBe("ligne");
  });

  it("par défaut, l'IA range et relit", () => {
    expect(lireMode(null, null)).toBe("ligne");
  });

  it("relit les trois positions d'avant sans rien perdre", () => {
    // « rien » valait le local ; « ranger » et « relire » valaient l'IA.
    expect(lireMode("rien", null)).toBe("local");
    expect(lireMode("ranger", "1")).toBe("ligne");
    expect(lireMode("relire", "0")).toBe("ligne");
  });

  it("qui avait décoché « Relecture » garde son rangement", () => {
    // Décocher voulait dire « un appel de moins », pas « plus d'IA du tout » :
    // le faire basculer en local lui retirerait son compte rendu.
    expect(lireMode(null, "0")).toBe("ligne");
    expect(lireMode("", "0")).toBe("ligne");
  });

  it("dit ce qui part, pour chaque mode", () => {
    expect(rangeEnLigne("local")).toBe(false);
    expect(relitEnLigne("local")).toBe(false);
    expect(rangeEnLigne("ligne")).toBe(true);
    expect(relitEnLigne("ligne")).toBe(true);
  });
});

describe("reconnaître une panne de réseau", () => {
  it("sur les messages que le journal a vraiment enregistrés", () => {
    for (const m of [
      "Envoi impossible : error sending request for url (https://api.mistral.ai/v1/audio/transcriptions)",
      "Envoi impossible : dispatch failure — io error — client error (Connect) — tcp connect error — Network is unreachable (os error 51)",
      "Envoi impossible : dispatch failure — timeout — HTTP connect timeout occurred after 3.1s",
      "Réseau : error sending request for url (...)",
      "SANS RÉPONSE transcrire_audio : plus de 45 s",
    ]) expect(estUnePanneDeReseau(m)).toBe(true);
  });

  it("ne confond pas une panne avec un refus du service", () => {
    // Celle-ci se règle en attendant quelques secondes, pas en passant en local.
    expect(estUnePanneDeReseau("Trop de demandes d'affilée pour votre abonnement Mistral.")).toBe(false);
    expect(estUnePanneDeReseau("Whisper a échoué : modèle introuvable")).toBe(false);
    expect(estUnePanneDeReseau("Clé API Mistral manquante.")).toBe(false);
  });
});
