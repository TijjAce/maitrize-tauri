import { describe, expect, it } from "vitest";
import { BANQUES_APPOINT } from "./pictosAppoint";
import { ETAPES_DU_LANCEMENT, pictosInstalles, suiteDuLancement } from "./premierLancement";

describe("le premier lancement (« juste après avoir accepté les conditions d'utilisation »)", () => {
  it("se montre à une installation neuve, une seule fois ; une installation d'avant ne le voit pas", () => {
    expect(suiteDuLancement(null, null)).toBe("montrer");
    expect(suiteDuLancement("2026-11-05T10:00:00.000Z", null)).toBe("rien");
    // Les diapositives d'accueil d'avant déjà vues : l'installation est ancienne, rien à refaire.
    expect(suiteDuLancement(null, "1")).toBe("deja-installee");
    expect(suiteDuLancement("deja-installee", "1")).toBe("rien");
  });

  it("dans l'ordre demandé : les pictogrammes, la clé, l'emploi du temps", () => {
    expect(ETAPES_DU_LANCEMENT.map((e) => e.id)).toEqual(["pictos", "cle", "edt"]);
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
});
