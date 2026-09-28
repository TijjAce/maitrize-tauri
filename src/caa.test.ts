import { describe, it, expect } from "vitest";
import {
  CLASSES_CONSIGNE, VERBES_CONSIGNE, consignesActives, decorerConsignesHtml, ecrireLexique, htmlPictosVerbes, lireLexique, verbesDe,
} from "./caa";

const lexique = { lire: 11, écrire: 22, colorier: 33, entourer: 44 };
const images = { 11: "data:lire", 22: "data:ecrire", 33: "data:colorier" };

describe("les verbes d'une consigne", () => {
  it("se reconnaissent sous leurs formes, sans accents ni majuscules, une fois chacun", () => {
    expect(verbesDe("Écris le nombre, puis écris-le en lettres et colorie la case.", lexique)).toEqual(["écrire", "colorier"]);
    expect(verbesDe("J'entoure les mots où j'entends [a]", lexique)).toEqual(["entourer"]);
    expect(verbesDe("Je lis les syllabes", lexique)).toEqual(["lire"]);
    expect(verbesDe("LISEZ puis COLORIEZ", lexique)).toEqual(["lire", "colorier"]);
  });

  it("ne retiennent que les verbes qui ont un picto, et rien dans un texte sans verbe", () => {
    // « découpe » n'a pas de picto dans ce lexique ; « lecture » n'est pas un verbe.
    expect(verbesDe("Découpe puis colle les étiquettes de lecture.", lexique)).toEqual([]);
    expect(verbesDe("Prénom : ............", lexique)).toEqual([]);
    expect(verbesDe("", lexique)).toEqual([]);
  });

  it("couvrent les gestes courants de la classe", () => {
    const verbes = VERBES_CONSIGNE.map((v) => v.verbe);
    for (const v of ["lire", "écrire", "copier", "colorier", "entourer", "relier", "compter", "découper", "coller", "cocher"]) expect(verbes).toContain(v);
    // Chaque forme mène à un seul verbe.
    const formes = VERBES_CONSIGNE.flatMap((v) => v.formes);
    expect(new Set(formes).size).toBe(formes.length);
  });
});

describe("le lexique", () => {
  it("se relit sans faire confiance à ce qui est enregistré", () => {
    expect(lireLexique(null)).toEqual({});
    expect(lireLexique("{pas du json")).toEqual({});
    expect(lireLexique("[1,2]")).toEqual({});
    expect(lireLexique('{"lire": 11, "écrire": "22", "vide": 0, " ": 5, "x": "abc"}')).toEqual({ lire: 11, écrire: 22 });
    expect(lireLexique(ecrireLexique(lexique))).toEqual(lexique);
  });

  it("met les pictos en marche dès qu'un verbe en a un, sauf si on les a coupés", () => {
    expect(consignesActives(null, lexique)).toBe(true);
    expect(consignesActives("1", lexique)).toBe(true);
    expect(consignesActives("0", lexique)).toBe(false);
    expect(consignesActives(null, {})).toBe(false);
  });
});

describe("les consignes décorées", () => {
  it("mettent les pictos devant chaque consigne, et la mention ARASAAC à la fin", () => {
    const feuille = `<h1>Fiche</h1><p class="consigne">Écris le nombre et colorie la case.</p><div class="regle"><b>Loto</b>On lit les cartes.</div>`
      + `<div class="sous cu-consigne">Compte les cubes et écris le nombre.</div><table class="grille"></table>`;
    const html = decorerConsignesHtml(feuille, lexique, images);
    expect(html).toContain(`<p class="consigne"><span class="consigne-pictos"><span class="consigne-picto"><img src="data:ecrire" alt="écrire"><small>écrire</small></span>`
      + `<span class="consigne-picto"><img src="data:colorier" alt="colorier"><small>colorier</small></span></span>Écris le nombre`);
    // La règle du jeu, pour l'adulte, reste telle quelle ; « compter » n'a pas de picto.
    expect(html).toContain(`<div class="regle"><b>Loto</b>On lit les cartes.</div>`);
    expect(html).toContain(`<div class="sous cu-consigne"><span class="consigne-pictos"><span class="consigne-picto"><img src="data:ecrire"`);
    expect(html.endsWith(`<div class="consigne-attribution">Pictogrammes : ARASAAC (arasaac.org) — Gouvernement d'Aragon, licence CC BY-NC-SA. Usage non commercial.</div>`)).toBe(true);
    // Décorer deux fois ne double rien.
    expect(decorerConsignesHtml(html, lexique, images)).toBe(html);
  });

  it("ne changent rien sans lexique, sans verbe, ou sans image", () => {
    const feuille = `<p class="consigne">Écris le nombre.</p>`;
    expect(decorerConsignesHtml(feuille, {}, images)).toBe(feuille);
    expect(decorerConsignesHtml(`<p class="consigne">Prénom : ........</p>`, lexique, images)).toBe(`<p class="consigne">Prénom : ........</p>`);
    // Un verbe qui a un picto mais pas encore d'image : rien devant.
    expect(decorerConsignesHtml(`<p class="consigne">Entoure.</p>`, lexique, images)).toBe(`<p class="consigne">Entoure.</p>`);
    expect(htmlPictosVerbes(["entourer"], lexique, images)).toBe("");
    // Une feuille qui cite déjà ARASAAC ne reçoit pas la mention deux fois.
    const avec = decorerConsignesHtml(`<p class="consigne">Lis.</p><div class="attribution">Pictogrammes : ARASAAC</div>`, lexique, images);
    expect(avec.match(/ARASAAC/g)).toHaveLength(1);
  });

  it("connaissent les consignes de toutes les feuilles", () => {
    expect(CLASSES_CONSIGNE).toEqual(["consigne", "cu-consigne", "ls-consigne", "fa-consigne"]);
  });
});
