import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Les tests tournent sans navigateur : une fenêtre et un localStorage de poche.
vi.hoisted(() => {
  const stock = new Map<string, string>();
  (globalThis as any).window = globalThis;
  (globalThis as any).localStorage = {
    getItem: (k: string) => stock.get(k) ?? null,
    setItem: (k: string, v: string) => { stock.set(k, String(v)); },
    removeItem: (k: string) => { stock.delete(k); },
    clear: () => { stock.clear(); },
  };
});

const etat = { lu: { etat: "inactif", nom: "FileVault" } as { etat: string; nom: string } };
const toasts: { message: string; action?: { label: string } }[] = [];

vi.mock("./api", () => ({
  isMac: true,
  api: { chiffrementDisque: async () => etat.lu },
}));
vi.mock("./components/Toaster", () => ({
  toast: (message: string, opts: { action?: { label: string } } = {}) => { toasts.push({ message, action: opts.action }); },
}));

import { constat, rappelDu, surveillerLeChiffrement } from "./chiffrementDisque";

describe("ce que la carte dit du disque", () => {
  it("un disque chiffré rassure, sans rien demander", () => {
    const c = constat({ etat: "actif", nom: "FileVault" }, true);
    expect(c.ton).toBe("ok");
    expect(c.texte).toContain("FileVault est activé");
  });

  it("un disque en clair alerte et dit où activer la protection, selon le système", () => {
    const mac = constat({ etat: "inactif", nom: "FileVault" }, true);
    expect(mac.ton).toBe("alerte");
    expect(mac.texte).toContain("Réglages Système › Confidentialité et sécurité › FileVault");
    expect(mac.texte).toContain("clé de secours");
    const pc = constat({ etat: "inactif", nom: "BitLocker" }, false);
    expect(pc.texte).toContain("BitLocker est désactivé");
    expect(pc.texte).toContain("Chiffrement de l'appareil");
    expect(pc.texte).not.toContain("clé de secours");
  });

  it("un état illisible ne fait pas de fausse alerte", () => {
    const c = constat({ etat: "inconnu", nom: "BitLocker" }, false);
    expect(c.ton).toBe("neutre");
    expect(c.texte).toContain("n'a pas pu lire");
  });
});

describe("le rappel au démarrage", () => {
  beforeEach(() => { vi.useFakeTimers(); toasts.length = 0; localStorage.clear(); etat.lu = { etat: "inactif", nom: "FileVault" }; });
  afterEach(() => { vi.useRealTimers(); });

  it("pas plus d'une fois par mois", () => {
    const maintenant = Date.parse("2026-10-09T08:00:00Z");
    expect(rappelDu(null, maintenant)).toBe(true);
    expect(rappelDu("2026-10-01T08:00:00Z", maintenant)).toBe(false);
    expect(rappelDu("2026-09-01T08:00:00Z", maintenant)).toBe(true);
    expect(rappelDu("pas une date", maintenant)).toBe(true);
  });

  it("un disque en clair se rappelle une fois, avec un chemin vers les Réglages", async () => {
    const voir = vi.fn();
    surveillerLeChiffrement(voir, 10);
    await vi.advanceTimersByTimeAsync(20);
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toContain("FileVault est désactivé");
    expect(toasts[0].action?.label).toBe("Voir");
    // Au lancement suivant, le même mois : rien.
    surveillerLeChiffrement(voir, 10);
    await vi.advanceTimersByTimeAsync(20);
    expect(toasts).toHaveLength(1);
  });

  it("un disque chiffré, ou un état inconnu, ne dit rien", async () => {
    for (const lu of [{ etat: "actif", nom: "FileVault" }, { etat: "inconnu", nom: "BitLocker" }]) {
      etat.lu = lu;
      surveillerLeChiffrement(() => {}, 10);
      await vi.advanceTimersByTimeAsync(20);
    }
    expect(toasts).toHaveLength(0);
  });

  it("quitter avant le délai annule la vérification", async () => {
    const arreter = surveillerLeChiffrement(() => {}, 10);
    arreter();
    await vi.advanceTimersByTimeAsync(20);
    expect(toasts).toHaveLength(0);
  });
});
