import { describe, it, expect } from "vitest";
import {
  CLASSES_CONSIGNE, VERBES_CONSIGNE, consignesActives, decorerConsignesHtml, ecrireLexique, htmlPictosVerbes, lireLexique, verbesDe,
  verbesDuTexte, motsAChercher, pictosProposes,
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

  it("se lisent aussi sans lexique, pour proposer un picto à ceux qui n'en ont pas", () => {
    expect(verbesDuTexte("Découpe puis colle les étiquettes, et lis-les.")).toEqual(["découper", "coller", "lire"]);
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
    // La règle du jeu aussi, après son titre ; « compter » n'a pas de picto.
    expect(html).toContain(`<div class="regle"><b>Loto</b><span class="consigne-pictos"><span class="consigne-picto"><img src="data:lire" alt="lire"><small>lire</small></span></span>On lit les cartes.</div>`);
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

  it("mettent les pictos ajoutés à la main devant la première consigne, ou en tête s'il n'y en a pas", () => {
    const feuille = `<h1>Fiche</h1><p class="consigne">Écris le nombre.</p><p class="consigne">Colorie la case.</p>`;
    const html = decorerConsignesHtml(feuille, lexique, images, ["lire", "écrire", "entourer"]);
    // « lire » d'abord (ajouté), « écrire » une seule fois, « entourer » sans image passe son tour.
    expect(html).toContain(`<p class="consigne"><span class="consigne-pictos"><span class="consigne-picto"><img src="data:lire" alt="lire"><small>lire</small></span><span class="consigne-picto"><img src="data:ecrire" alt="écrire"><small>écrire</small></span></span>Écris le nombre.</p>`);
    expect(html).toContain(`<p class="consigne"><span class="consigne-pictos"><span class="consigne-picto"><img src="data:colorier"`);
    expect(html.match(/alt="lire"/g)).toHaveLength(1);
    // Sans consigne marquée : une ligne de pictos en tête, et la mention.
    const nue = decorerConsignesHtml(`<h1>Loto</h1><div class="grille"></div>`, lexique, images, ["lire"]);
    expect(nue.startsWith(`<div class="consigne consigne-seule"><span class="consigne-pictos"><span class="consigne-picto"><img src="data:lire"`)).toBe(true);
    expect(nue).toContain("ARASAAC");
    expect(decorerConsignesHtml(`<h1>Loto</h1>`, lexique, images, ["entourer"])).toBe(`<h1>Loto</h1>`);
  });

  it("connaissent les consignes de toutes les feuilles", () => {
    expect(CLASSES_CONSIGNE).toEqual(["consigne", "cu-consigne", "ls-consigne", "fa-consigne", "regle"]);
  });

  it("décorent la règle encadrée d'un jeu, section par section, après chaque titre", () => {
    const lexique = { "découper": 1, "retrouver": 2, "entourer": 3, "lire": 4 };
    const images = { 1: "data:decouper", 2: "data:retrouver", 3: "data:entourer", 4: "data:lire" };
    const regle = `<div class="regle"><b>Fabrication</b>Découper le cadre et ses bandes.<b style="margin-top:4px">Jeu</b>On lit la syllabe, puis on l'entoure.<span style="color:#687087">— Livret.</span></div>`;
    const html = decorerConsignesHtml(regle, lexique, images);
    expect(html).toContain(`<b>Fabrication</b><span class="consigne-pictos"><span class="consigne-picto"><img src="data:decouper" alt="découper"><small>découper</small></span></span>Découper`);
    expect(html).toContain(`<b style="margin-top:4px">Jeu</b><span class="consigne-pictos"><span class="consigne-picto"><img src="data:lire"`);
    expect(html).toContain(`<small>entourer</small></span></span>On lit la syllabe`);
    expect(html).toContain("ARASAAC");
    // Sans titre, la règle se décore en tête, comme une consigne ; les verbes ajoutés y vont aussi.
    const simple = decorerConsignesHtml(`<div class="regle">Retrouve les mots cachés dans la grille.</div>`, lexique, images, ["lire"]);
    expect(simple.startsWith(`<div class="regle"><span class="consigne-pictos"><span class="consigne-picto"><img src="data:lire"`)).toBe(true);
    expect(simple).toContain(`<small>retrouver</small>`);
    // Les nouveaux verbes des jeux sont reconnus.
    expect(verbesDe("Remets les mots dans l'ordre, décompose le nombre, ajoute puis retranche.", { remettre: 1, "décomposer": 1, ajouter: 1, retrancher: 1 }))
      .toEqual(["remettre", "décomposer", "ajouter", "retrancher"]);
  });
});

describe("proposer un picto à chaque verbe", () => {
  it("demande le verbe, puis ses synonymes, dans l'ordre où l'on préfère", () => {
    expect(motsAChercher("retrouver")).toEqual(["retrouver", "trouver", "chercher"]);
    expect(motsAChercher("lire")).toEqual(["lire"]);
  });

  it("retient le verbe lui-même avant un synonyme, et laisse sans picto ce que la banque ignore", () => {
    const trouves = [{ id: 24773, mot: "trouver" }, { id: 6947, mot: "chercher" }, { id: 2348, mot: "colorier" }, { id: 7, mot: "peindre" }, { id: 25282, mot: "mettre dans l'ordre" }];
    expect(pictosProposes(["retrouver", "colorier", "remettre", "décomposer", "lire"], trouves))
      .toEqual({ retrouver: 24773, colorier: 2348, remettre: 25282 });
  });
});
