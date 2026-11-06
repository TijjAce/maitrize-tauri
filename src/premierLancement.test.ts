// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import { describe, expect, it } from "vitest";
import { BANQUES_APPOINT } from "./pictosAppoint";
import { ETAPES_DU_LANCEMENT, PICTOS_PLUS_TARD, THEME_DE_DEPART, installationNeuve, installerPlusTardPossible, pictosInstalles, suiteDuLancement } from "./premierLancement";

describe("le premier lancement (« juste après avoir accepté les conditions d'utilisation »)", () => {
  it("se montre à une installation neuve, une seule fois ; une installation d'avant ne le voit pas", () => {
    expect(suiteDuLancement(null, null)).toBe("montrer");
    expect(suiteDuLancement("2026-11-05T10:00:00.000Z", null)).toBe("rien");
    // Les diapositives d'accueil d'avant déjà vues : l'installation est ancienne, rien à refaire.
    expect(suiteDuLancement(null, "1")).toBe("deja-installee");
    expect(suiteDuLancement("deja-installee", "1")).toBe("rien");
  });

  it("dans l'ordre demandé : les pictogrammes, la clé, l'emploi du temps", () => {
    expect(ETAPES_DU_LANCEMENT.map((e) => e.id)).toEqual(["pictos", "cle", "materiel", "salle", "edt"]);
  });

  it("on ne passe les pictogrammes qu'avec ARASAAC et toutes les banques d'appoint", () => {
    const attendues = BANQUES_APPOINT.map((b) => b.cle);
    expect(attendues).toEqual(["bajard", "sclera"]);
    const toutes = attendues.map((banque) => ({ banque, installee: true }));
    expect(pictosInstalles(true, toutes, attendues)).toBe(true);
    expect(pictosInstalles(false, toutes, attendues)).toBe(false);
    expect(pictosInstalles(true, [{ banque: "bajard", installee: true }], attendues)).toBe(false);
    expect(pictosInstalles(true, [{ banque: "bajard", installee: true }, { banque: "sclera", installee: false }], attendues)).toBe(false);
  });

  it("hors connexion, les pictogrammes peuvent attendre (« Installer plus tard ») ; ils reviennent seuls au lancement suivant", () => {
    // Le bouton : sans connexion, ou après un téléchargement qui a échoué ; jamais pendant un téléchargement.
    expect(installerPlusTardPossible(true, false, false)).toBe(false);
    expect(installerPlusTardPossible(false, false, false)).toBe(true);
    expect(installerPlusTardPossible(true, true, false)).toBe(true);
    expect(installerPlusTardPossible(false, false, true)).toBe(false);
    // Le parcours fini, des pictogrammes remis à plus tard : l'étape revient, seule.
    expect(suiteDuLancement("2026-11-05T10:00:00.000Z", null, PICTOS_PLUS_TARD)).toBe("pictos");
    expect(suiteDuLancement("2026-11-05T10:00:00.000Z", "1", PICTOS_PLUS_TARD)).toBe("pictos");
    // Installés ensuite : la remise est levée.
    expect(suiteDuLancement("2026-11-05T10:00:00.000Z", "1", "")).toBe("rien");
    // Une installation neuve commence toujours par le parcours entier.
    expect(suiteDuLancement(null, null, PICTOS_PLUS_TARD)).toBe("montrer");
  });

  it("une installation neuve s'ouvre en rose, Aurore, Vitré ; une installation d'avant garde ce qu'elle a", () => {
    expect(THEME_DE_DEPART).toEqual({ apparence: "aurore", accent: "pink", styleInterface: "vitre" });
    expect(installationNeuve({})).toBe(true);
    expect(installationNeuve({ cgu: "{}" })).toBe(true);
    // Déjà passée par le premier lancement, ou par l'accueil d'avant, même sans avoir choisi d'apparence.
    expect(installationNeuve({ premierLancement: "2026-11-05" })).toBe(false);
    expect(installationNeuve({ onboardingVu: "1" })).toBe(false);
    // Une apparence déjà choisie n'est jamais remplacée.
    expect(installationNeuve({ apparence: "sombre" })).toBe(false);
    expect(installationNeuve({ accent: "teal" })).toBe(false);
    expect(installationNeuve({ styleInterface: "epure" })).toBe(false);
  });
});
