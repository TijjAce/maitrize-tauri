import { describe, it, expect } from "vitest";
import { COULEURS_AIGUILLES, REGLAGES_HEURE, autreLecture, consigneHeure, couleurSure, couleursDe, heures, horlogeSvg, htmlHeure, lireHeure } from "./heure";

describe("lire l'heure", () => {
  it("tire des heures à la précision demandée, toutes différentes", () => {
    const pile = heures(REGLAGES_HEURE, 1);
    expect(pile).toHaveLength(9);
    for (const t of pile) { expect(t.m).toBe(0); expect(t.h).toBeGreaterThanOrEqual(1); expect(t.h).toBeLessThanOrEqual(12); }
    expect(new Set(pile.map(lireHeure)).size).toBe(9);
    const cinq = heures({ ...REGLAGES_HEURE, precision: "cinq", apresMidi: true, combien: 24 }, 2);
    for (const t of cinq) { expect(t.m % 5).toBe(0); expect(t.h).toBeLessThanOrEqual(23); }
    expect(new Set(cinq.map(lireHeure)).size).toBe(24);
    // Douze heures pile le matin : au-delà, on repasse.
    expect(heures({ ...REGLAGES_HEURE, combien: 15 }, 3)).toHaveLength(15);
    expect(heures(REGLAGES_HEURE, 1)).toEqual(pile);
  });

  it("écrit l'heure comme au tableau, et sait l'autre lecture du cadran", () => {
    expect(lireHeure({ h: 7, m: 5 })).toBe("7 h 05");
    expect(lireHeure({ h: 12, m: 30 })).toBe("12 h 30");
    expect(autreLecture({ h: 7, m: 30 })).toEqual({ h: 19, m: 30 });
    expect(autreLecture({ h: 19, m: 30 })).toEqual({ h: 7, m: 30 });
  });

  it("dessine le cadran, les aiguilles arrêtées avant les nombres", () => {
    const avec = horlogeSvg({ h: 3, m: 0 });
    // À trois heures, la petite aiguille pointe à droite, la grande en haut — et s'arrête sous le 12.
    expect(avec).toMatch(/he-heures" x1="50" y1="50" x2="69\.0" y2="50\.0" stroke="#1c2233"/);
    expect(avec).toMatch(/he-minutes" x1="50" y1="50" x2="50\.0" y2="21\.0" stroke="#1c2233"/);
    expect((avec.match(/<text/g) ?? []).length).toBe(12);
    expect(avec).toContain('viewBox="0 0 100 100" width="40.0mm"');
    expect(horlogeSvg(null)).not.toContain("he-heures");
  });

  it("met les aiguilles en couleur, et les minutes autour du cadran, quand on le demande", () => {
    const couleur = horlogeSvg({ h: 3, m: 0 }, { heures: "#d94033", minutes: "#2454e6" });
    expect(couleur).toMatch(/he-heures"[^>]* stroke="#d94033"/);
    expect(couleur).toMatch(/he-minutes"[^>]* stroke="#2454e6"/);
    // Une couleur qui n'en est pas une retombe sur le noir.
    expect(couleurSure("rouge vif")).toBe("#1c2233");
    expect(couleurSure('"><script>')).toBe("#1c2233");
    expect(couleurSure("#AbCdEf")).toBe("#AbCdEf");
    expect(couleursDe({ couleurs: false, couleurHeures: "#d94033", couleurMinutes: "#2454e6" })).toEqual({ heures: "#1c2233", minutes: "#1c2233" });
    expect(couleursDe({ couleurs: true, couleurHeures: "#d94033", couleurMinutes: "n'importe" })).toEqual({ heures: "#d94033", minutes: "#1c2233" });
    expect(COULEURS_AIGUILLES.map((c) => c.nom)).toEqual(["rouge", "bleu", "vert", "orange", "violet", "noir"]);
    const autour = horlogeSvg({ h: 3, m: 0 }, { minutes: "#2454e6", minutesAutour: true });
    expect((autour.match(/class="he-minute"/g) ?? []).length).toBe(12);
    expect(autour).toContain('fill="#2454e6">55</text>');
    // Le cadre s'élargit, le dessin aussi : le cadran garde sa taille.
    expect(autour).toContain('viewBox="-9 -9 118 118" width="47.2mm"');
  });

  it("donne une consigne d'une phrase, selon l'exercice", () => {
    expect(consigneHeure({ sens: "lire" })).toBe("Écris l'heure qu'il est.");
    expect(consigneHeure({ sens: "dessiner" })).toBe("Dessine les aiguilles.");
    expect(consigneHeure({ sens: "mixte" })).toBe("Écris l'heure qu'il est, ou dessine les aiguilles.");
  });

  it("s'imprime en cartes : le prénom, la consigne, la réponse avec ou sans « h », le corrigé", () => {
    const liste = heures(REGLAGES_HEURE, 4);
    const html = htmlHeure(liste, REGLAGES_HEURE);
    expect(html).toContain(`<div class="consigne">Écris l'heure qu'il est.</div>`);
    expect(html).toContain("Prénom : ");
    expect(html).not.toContain("La règle");
    expect((html.match(/class="he-carte"/g) ?? []).length).toBe(9);
    expect((html.match(/he-heures/g) ?? []).length).toBe(9);
    expect((html.match(/<b class="he-h">h<\/b>/g) ?? []).length).toBe(9);
    expect(html).toContain("Lire l'heure — corrigé");
    // Sans le « h » : un seul blanc, large ; en couleur, deux blancs aux couleurs des aiguilles.
    const sansH = htmlHeure(liste, { ...REGLAGES_HEURE, avecH: false });
    expect(sansH).not.toContain('class="he-h"');
    expect((sansH.match(/he-blanc he-blanc-large/g) ?? []).length).toBe(9);
    const couleurs = htmlHeure(liste, { ...REGLAGES_HEURE, avecH: false, couleurs: true });
    expect(couleurs).toContain(`<span class="he-blanc" style="border-color:#d94033"></span><span class="he-blanc" style="border-color:#2454e6"></span>`);
    expect(couleurs).toMatch(/he-heures"[^>]* stroke="#d94033"/);
    const dessiner = htmlHeure([{ h: 10, m: 0 }], { ...REGLAGES_HEURE, sens: "dessiner", couleurs: true });
    expect(dessiner).not.toContain("he-heures");
    expect(dessiner).toContain(`<div class="consigne">Dessine les aiguilles.</div>`);
    expect(dessiner).toContain(`<div class="he-donnee"><span style="color:#d94033">10</span> h <span style="color:#2454e6">00</span></div>`);
    expect(htmlHeure([{ h: 10, m: 5 }], { ...REGLAGES_HEURE, sens: "dessiner", avecH: false })).toContain(`<span style="color:#1c2233">10</span>:<span style="color:#1c2233">05</span>`);
    const mixte = htmlHeure(liste, { ...REGLAGES_HEURE, sens: "mixte" });
    expect((mixte.match(/he-heures/g) ?? []).length).toBe(5);
    const pm = htmlHeure([{ h: 19, m: 30 }], { ...REGLAGES_HEURE, apresMidi: true });
    expect(pm).toContain("<b>7 h 30 ou 19 h 30</b>");
    expect(pm).toContain(`<span class="he-moment">matin</span>`);
    expect(pm).toContain(`<span class="he-moment">après-midi</span>`);
  });
});
