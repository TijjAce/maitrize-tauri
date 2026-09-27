import { describe, it, expect, beforeEach, vi } from "vitest";

// Les tests tournent sans navigateur : un localStorage de poche, posé avant
// que le module ne se charge, pour vérifier que la trace se garde.
vi.hoisted(() => {
  const stock = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => stock.get(k) ?? null,
    setItem: (k: string, v: string) => { stock.set(k, String(v)); },
    removeItem: (k: string) => { stock.delete(k); },
  };
});
import {
  LIEUX_MAX, actuel, arriver, historique, historiqueVide, libelleDuChemin, nomDuLieu, precedent, recents, suivant, titrer,
} from "./historique";

const MENU = [{ to: "/", label: "Tableau de bord" }, { to: "/plan", label: "Plan de travail" }, { to: "/jeux", label: "Fabriquer" }, { to: "/eleves", label: "Élèves" }];

const parcours = (...chemins: string[]) => chemins.reduce((h, c, i) => arriver(h, c, i + 1), historiqueVide());

describe("l'historique des lieux", () => {
  it("empile les arrivées, et ne compte pas deux fois le même lieu de suite", () => {
    const h = parcours("/", "/plan", "/plan", "/sequences/abc");
    expect(h.lieux.map((l) => l.chemin)).toEqual(["/", "/plan", "/sequences/abc"]);
    expect(actuel(h)?.chemin).toBe("/sequences/abc");
    expect(precedent(h)?.chemin).toBe("/plan");
    expect(suivant(h)).toBeNull();
  });

  it("revient en arrière sans rien perdre, et oublie ce qui est devant quand on repart ailleurs", () => {
    let h = parcours("/sequences/abc", "/planning", "/eleves");
    // Revenir : on vise le rang précédent, puis on y arrive.
    h = arriver(h, "/planning", 10, h.index - 1);
    expect(actuel(h)?.chemin).toBe("/planning");
    expect(suivant(h)?.chemin).toBe("/eleves");
    h = arriver(h, "/sequences/abc", 11, h.index - 1);
    expect(precedent(h)).toBeNull();
    // Avancer, c'est arriver sur le rang suivant.
    h = arriver(h, "/planning", 12, h.index + 1);
    expect(actuel(h)?.chemin).toBe("/planning");
    // Un rang visé qui ne correspond pas au chemin : c'est une arrivée ordinaire.
    h = arriver(h, "/jeux", 13, h.index + 1);
    expect(h.lieux.map((l) => l.chemin)).toEqual(["/sequences/abc", "/planning", "/jeux"]);
    expect(suivant(h)).toBeNull();
  });

  it("garde le titre que la page annonce, pour le lieu où l'on est seulement", () => {
    let h = parcours("/", "/sequences/abc");
    h = titrer(h, "/sequences/abc", "Les syllabes");
    expect(actuel(h)?.titre).toBe("Les syllabes");
    // Une page cachée qui s'annonce pour un autre chemin ne change rien.
    expect(titrer(h, "/jeux", "Fabriquer")).toBe(h);
    expect(titrer(h, "/sequences/abc", "Les syllabes")).toBe(h);
    expect(nomDuLieu(actuel(h)!, MENU)).toBe("Les syllabes");
    expect(nomDuLieu(h.lieux[0], MENU)).toBe("Tableau de bord");
  });

  it("propose les lieux récents, chacun une fois, sans celui où l'on est", () => {
    let h = parcours("/plan", "/sequences/abc", "/eleves", "/plan", "/jeux", "/eleves");
    expect(recents(h).map((l) => l.chemin)).toEqual(["/jeux", "/plan", "/sequences/abc"]);
    // Après un retour, ce qui est devant reste proposé.
    h = arriver(h, "/jeux", 20, h.index - 1);
    expect(recents(h).map((l) => l.chemin)).toEqual(["/plan", "/eleves", "/sequences/abc"]);
    expect(recents(h, 1).map((l) => l.chemin)).toEqual(["/plan"]);
    expect(recents(historiqueVide())).toEqual([]);
  });

  it("ne garde qu'un nombre borné de lieux", () => {
    const h = parcours(...Array.from({ length: LIEUX_MAX + 10 }, (_, i) => `/sequences/${i}`));
    expect(h.lieux).toHaveLength(LIEUX_MAX);
    expect(actuel(h)?.chemin).toBe(`/sequences/${LIEUX_MAX + 9}`);
    expect(h.lieux[0].chemin).toBe("/sequences/10");
  });

  it("nomme un lieu d'après le menu quand la page ne s'est pas annoncée", () => {
    expect(libelleDuChemin("/plan", MENU)).toBe("Plan de travail");
    expect(libelleDuChemin("/eleves?onglet=x", MENU)).toBe("Élèves");
    expect(libelleDuChemin("/sequences/abc", MENU)).toBe("Séquence");
    expect(libelleDuChemin("/", MENU)).toBe("Tableau de bord");
    expect(libelleDuChemin("/inconnu", MENU)).toBe("/inconnu");
  });
});

describe("l'historique de l'application", () => {
  beforeEach(() => historique.oublier());

  it("suit les arrivées, revient, avance, et prévient qui écoute", () => {
    let appels = 0;
    const arreter = historique.abonner(() => { appels++; });
    historique.arriver("/");
    historique.arriver("/plan");
    historique.titrer("/plan", "Plan de travail");
    historique.arriver("/sequences/abc");
    expect(historique.lire().lieux).toHaveLength(3);
    const retour = historique.reculer();
    expect(retour?.chemin).toBe("/plan");
    // L'application navigue puis annonce l'arrivée : on est bien revenu, pas empilé.
    historique.arriver("/plan");
    expect(historique.lire().index).toBe(1);
    expect(historique.lire().lieux).toHaveLength(3);
    expect(historique.avancer()?.chemin).toBe("/sequences/abc");
    historique.arriver("/sequences/abc");
    expect(historique.lire().index).toBe(2);
    expect(historique.avancer()).toBeNull();
    expect(appels).toBeGreaterThanOrEqual(5);
    arreter();
    // Persisté sur ce poste : un redémarrage retrouve d'où l'on vient.
    expect(JSON.parse(localStorage.getItem("historique:lieux") || "{}").index).toBe(2);
  });
});
