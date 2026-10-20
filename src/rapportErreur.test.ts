import { describe, expect, it, vi } from "vitest";

vi.mock("./api", () => ({ api: { diagCourriel: vi.fn(), diagIncidentPrecedent: vi.fn() } }));
vi.mock("./components/Toaster", () => ({ toast: vi.fn() }));

import { aProposer, estUnBruit, estUnBug, signatureDe } from "./rapportErreur";

describe("le rapport d'erreur proposé", () => {
  it("reconnaît le même problème à une ligne près, et ne le repropose qu'au bout d'une semaine", () => {
    const a = signatureDe("TypeError: x is undefined @ Organisation.tsx:123");
    expect(signatureDe("TypeError: x is undefined @ Organisation.tsx:131")).toBe(a);
    const maintenant = new Date("2026-10-20T10:00:00Z");
    expect(aProposer({}, a, maintenant)).toBe(true);
    expect(aProposer({ [a]: "2026-10-18T10:00:00Z" }, a, maintenant)).toBe(false);
    expect(aProposer({ [a]: "2026-10-12T10:00:00Z" }, a, maintenant)).toBe(true);
    expect(aProposer({ [a]: "pas une date" }, a, maintenant)).toBe(true);
  });

  it("ne prend pour un bug que les exceptions de l'écran, pas les échecs du backend ni les bruits connus", () => {
    expect(estUnBug(new TypeError("undefined is not an object (evaluating 'x.y')"))).toBe(true);
    // Une commande qui échoue rejette une chaîne : déjà un « ÉCHEC » au journal, souvent le réseau.
    expect(estUnBug("Envoi impossible : dispatch failure")).toBe(false);
    expect(estUnBug(new Error("undefined is not an object (evaluating 'listeners[eventId].handlerId')"))).toBe(false);
    expect(estUnBruit("ResizeObserver loop completed with undelivered notifications.")).toBe(true);
    expect(estUnBruit("ReferenceError: Can't find variable: api")).toBe(false);
  });
});
