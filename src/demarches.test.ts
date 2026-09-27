import { describe, it, expect } from "vitest";
import {
  DEMARCHES, ENTETE_TABLEAU, demarcheDe, demarcheSuggeree, resumeDuCadre, seancesDuCadre,
  tableauDesPhases,
} from "./demarches";
import { DUREES } from "./api";

describe("les démarches", () => {
  it("ont chacune un nom, une source et au moins trois séances", () => {
    expect(DEMARCHES.length).toBeGreaterThanOrEqual(3);
    for (const d of DEMARCHES) {
      expect(d.nom.trim().length, d.id).toBeGreaterThan(0);
      expect(d.source.trim().length, d.id).toBeGreaterThan(0);
      expect(d.seances.length, d.id).toBeGreaterThanOrEqual(3);
    }
    expect(new Set(DEMARCHES.map((d) => d.id)).size).toBe(DEMARCHES.length);
  });

  it("prévoient des séances complètes, aux durées que l'éditeur propose", () => {
    for (const d of DEMARCHES) for (const s of d.seances) {
      expect(s.titre.trim().length, `${d.id} › ${s.titre}`).toBeGreaterThan(0);
      expect(s.phases.length, `${d.id} › ${s.titre}`).toBeGreaterThan(0);
      // Une durée hors de la liste ne s'afficherait pas dans le menu de la séance.
      expect(DUREES, `${d.id} › ${s.titre} : ${s.duree} min`).toContain(s.duree);
      for (const p of s.phases) {
        expect(p.phase.trim().length, `${d.id} › ${s.titre}`).toBeGreaterThan(0);
        expect(p.duree.trim().length, `${d.id} › ${s.titre} › ${p.phase}`).toBeGreaterThan(0);
      }
    }
  });

  it("reprennent les quatre temps des livrets Éduscol, dans leur ordre et leurs mots", () => {
    const d = demarcheDe("eduscol-quatre-temps")!;
    const premiere = d.seances[0].phases.map((p) => p.phase);
    expect(premiere).toEqual([
      "Temps 1 – Définition des objectifs et mise en réussite",
      "Temps 2 – Mise en activité des élèves",
      "Temps 3 – Institutionnalisation, retour réflexif",
      "Temps 4 – Automatisation, réinvestissement, transfert",
    ]);
    // La séquence se termine comme dans le livret : évaluation courte, puis
    // réinvestissement en séance courte.
    const titres = d.seances.map((s) => s.titre);
    expect(titres[titres.length - 2]).toMatch(/Évaluation/);
    expect(titres[titres.length - 1]).toMatch(/Réinvestissement/);
  });

  it("gardent l'ordre de l'enseignement explicite : je fais, nous faisons, vous faites", () => {
    const d = demarcheDe("explicite")!;
    const phases = d.seances[0].phases.map((p) => p.phase);
    const rang = (mot: string) => phases.findIndex((p) => p.includes(mot));
    expect(rang("je fais")).toBeGreaterThan(rang("Ouverture"));
    expect(rang("nous faisons")).toBeGreaterThan(rang("je fais"));
    expect(rang("vous faites")).toBeGreaterThan(rang("nous faisons"));
    expect(rang("Clôture")).toBeGreaterThan(rang("vous faites"));
  });

  it("tiennent dans la fourchette du module EPS : de six à douze séances", () => {
    const n = demarcheDe("eps-module")!.seances.length;
    expect(n).toBeGreaterThanOrEqual(6);
    expect(n).toBeLessThanOrEqual(12);
  });
});

describe("le cadre posé sur une séquence", () => {
  it("crée les séances numérotées à la suite, rattachées à la séquence", () => {
    const d = demarcheDe("eduscol-quatre-temps")!;
    const seances = seancesDuCadre(d, "seq-1", 3);
    expect(seances).toHaveLength(d.seances.length);
    expect(seances.map((s) => s.numero)).toEqual(seances.map((_, i) => 3 + i));
    expect(seances.every((s) => s.sequenceId === "seq-1")).toBe(true);
    expect(new Set(seances.map((s) => s.id)).size).toBe(seances.length);
    // Rien n'est écrit à la place de l'enseignant : le texte libre reste vide.
    expect(seances.every((s) => s.deroulement === "" && s.bilan === "")).toBe(true);
  });

  it("met les phases dans le tableau de déroulement, avec l'en-tête de l'éditeur", () => {
    const d = demarcheDe("explicite")!;
    const [s] = seancesDuCadre(d, "seq-1");
    const grille = JSON.parse(s.tableauDeroulement) as string[][];
    expect(grille[0]).toEqual([...ENTETE_TABLEAU]);
    expect(grille.length).toBe(d.seances[0].phases.length + 1);
    for (const ligne of grille) expect(ligne).toHaveLength(ENTETE_TABLEAU.length);
    expect(grille[1][0]).toBe(d.seances[0].phases[0].phase);
  });

  it("se résume en séances et en temps", () => {
    const d = { ...demarcheDe("eduscol-quatre-temps")!, seances: [
      { titre: "a", objectifs: "", duree: 45, phases: [] },
      { titre: "b", objectifs: "", duree: 30, phases: [] },
    ] };
    expect(resumeDuCadre(d)).toBe("2 séances, 1 h 15 au total");
    expect(resumeDuCadre({ ...d, seances: [d.seances[1]] })).toBe("1 séance, 30 min au total");
    expect(resumeDuCadre({ ...d, seances: [{ ...d.seances[0], duree: 60 }, d.seances[0], { ...d.seances[0], duree: 15 }] }))
      .toBe("3 séances, 2 h au total");
  });

  it("rend un tableau vide de phases à l'en-tête seul", () => {
    expect(tableauDesPhases([])).toEqual([[...ENTETE_TABLEAU]]);
    expect(demarcheDe("inconnue")).toBeUndefined();
  });
});

describe("la démarche que la compétence appelle", () => {
  it("propose les quatre temps des livrets pour le français et les mathématiques", () => {
    expect(demarcheSuggeree("Français", "Cycle 2 — CP, CE1, CE2 (programmes 2026)").id).toBe("eduscol-quatre-temps");
    expect(demarcheSuggeree("Nombres et calculs", "Cycle 2").id).toBe("eduscol-quatre-temps");
    expect(demarcheSuggeree("", "").id).toBe("eduscol-quatre-temps");
  });

  it("propose le module d'apprentissage pour l'EPS, quelle que soit la graphie", () => {
    expect(demarcheSuggeree("Éducation physique et sportive", "Cycle 2").id).toBe("eps-module");
    expect(demarcheSuggeree("EPS", "").id).toBe("eps-module");
    expect(demarcheSuggeree("Activité physique", "Cycle 1").id).toBe("eps-module");
    // « physique » seul ne suffit pas : ce serait la physique-chimie.
    expect(demarcheSuggeree("Sciences physiques", "Cycle 4").id).toBe("eduscol-quatre-temps");
  });
});
