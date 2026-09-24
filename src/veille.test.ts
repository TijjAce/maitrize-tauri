import { describe, it, expect, vi } from "vitest";
import { BATTEMENT_MS, BLOCAGE_MS, demarrerLaVeille, messageDeBlocage, SOMMEIL_MS, ouEtQuoi } from "./veille";

describe("veille", () => {
  it("ne signale qu'un vrai blocage", () => {
    expect(messageDeBlocage(200, false, "/planning")).toBeNull();
    expect(messageDeBlocage(BLOCAGE_MS - 1, false, "/planning")).toBeNull();
    expect(messageDeBlocage(8000, false, "/planning")).toBe("FIGÉ 8 s sur /planning");
    expect(messageDeBlocage(8000, false, "")).toBe("FIGÉ 8 s");
  });

  it("se tait quand la fenêtre est masquée ou quand l'ordinateur a dormi", () => {
    expect(messageDeBlocage(30_000, true, "/")).toBeNull();
    expect(messageDeBlocage(SOMMEIL_MS + 1, false, "/")).toBeNull();
  });

  it("écrit une ligne quand le fil principal a été bloqué", () => {
    vi.useFakeTimers();
    const lignes: string[] = [];
    const arret = demarrerLaVeille((l) => lignes.push(l));
    // Un battement à l'heure : rien à dire.
    vi.advanceTimersByTime(BATTEMENT_MS);
    expect(lignes).toEqual([]);
    // Le minuteur repart en retard : la fenêtre était bloquée entre-temps.
    vi.setSystemTime(Date.now() + 9000);
    vi.advanceTimersByTime(BATTEMENT_MS);
    expect(lignes).toHaveLength(1);
    expect(lignes[0]).toMatch(/^FIGÉ \d+ s/);
    arret();
    vi.setSystemTime(Date.now() + 9000);
    vi.advanceTimersByTime(BATTEMENT_MS);
    expect(lignes).toHaveLength(1);
    vi.useRealTimers();
  });

  it("envoie le battement au backend à chaque tour, avec l'écran", () => {
    vi.useFakeTimers();
    const lignes: string[] = [];
    const battements: string[] = [];
    const arret = demarrerLaVeille((l) => lignes.push(l), (ou) => battements.push(ou));
    vi.advanceTimersByTime(BATTEMENT_MS * 3);
    expect(battements.length).toBe(3);
    // Hors fenêtre, il n'y a pas d'écran à nommer : le battement part quand même.
    expect(battements[0]).toBe("");
    expect(lignes).toEqual([]);
    arret();
    vi.useRealTimers();
  });
});

describe("ce qui tournait au moment du blocage", () => {
  it("joint les commandes en cours à l'écran, quand il y en a", () => {
    expect(ouEtQuoi("/plan", "sync_deltas 46s")).toBe("/plan (sync_deltas 46s)");
  });

  it("sans rien en vol, la ligne reste celle d'avant", () => {
    expect(ouEtQuoi("/plan", "")).toBe("/plan");
  });
});

describe("un ralentissement n'est pas un gel", () => {
  it("rien ne s'écrit quand la fenêtre est passée derrière", () => {
    // Le vrai défaut : sur cent vingt gels relevés dans le journal, presque
    // tous ont été écrits pendant que l'application était en arrière-plan.
    // macOS ralentit alors ses minuteurs — rien ne bloquait, et personne ne
    // regardait l'écran.
    expect(messageDeBlocage(12_000, false, "/plan", false)).toBeNull();
    expect(messageDeBlocage(107_000, false, "/reunions", false)).toBeNull();
  });

  it("mais un gel au premier plan se dit toujours", () => {
    expect(messageDeBlocage(12_000, false, "/plan", true)).toBe("FIGÉ 12 s sur /plan");
  });

  it("par défaut, on suppose la fenêtre devant", () => {
    expect(messageDeBlocage(12_000, false, "/plan")).toBe("FIGÉ 12 s sur /plan");
  });
});
