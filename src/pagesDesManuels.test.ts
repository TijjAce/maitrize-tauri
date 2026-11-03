import { describe, it, expect } from "vitest";
import type { Manuel } from "./manuels";
import {
  avecLesChoix, avecLesPages, cleDuManuel, cliquerUnePage, htmlDesPages, ligneDesPages, lireLigneDePages, manuelDuTitre, memesPages, numerosCites, numerosDePages,
  pagesAttachees, pagesEnTexte, remettreLesPages, retirerLesPages, titreDesPages,
} from "./pagesDesManuels";
import { citeAutreChose } from "./lignesCitees";
import { sequencesCitees } from "./sequencesCitees";
import { ligneDeManuel } from "./cahierJournal";

/** Un manuel inventé, de `n` pages numérotées à partir de 1. */
const manuel = (id: string, titre: string, n: number): Manuel => ({
  id, titre, source: "pdf", fichierPdf: `${id}.pdf`, niveau: "CE1", creeLe: "2026-10-01",
  pages: Array.from({ length: n }, (_, i) => ({ id: `${id}-p${i + 1}`, numero: i + 1, fichier: "", exercices: [] })),
});

const maths = manuel("m1", "Mon fichier de maths", 40);
const lecture = manuel("m2", "Lire au CE1 — période 2", 12);

describe("les numéros des pages", () => {
  it("lit des pages seules, des plages et des « et »", () => {
    expect(numerosDePages("12–14, 16")).toEqual([12, 13, 14, 16]);
    expect(numerosDePages("12-14 et 16")).toEqual([12, 13, 14, 16]);
    expect(numerosDePages("12 à 14 ; 3")).toEqual([3, 12, 13, 14]);
    expect(numerosDePages("12 au 13")).toEqual([12, 13]);
  });

  it("répare une plage à l'envers, un doublon, un zéro", () => {
    expect(numerosDePages("16-14, 15, 0")).toEqual([14, 15, 16]);
    expect(numerosDePages("")).toEqual([]);
    expect(numerosDePages("aucune")).toEqual([]);
  });

  it("n'étend pas sans fin une plage tapée de travers", () => {
    expect(numerosDePages("1-9999").length).toBeLessThanOrEqual(501);
  });

  it("resserre une liste en plages", () => {
    expect(pagesEnTexte([16, 12, 13, 14])).toBe("12–14, 16");
    expect(pagesEnTexte([5, 5, 6])).toBe("5–6");
    expect(pagesEnTexte([7])).toBe("7");
    expect(pagesEnTexte([])).toBe("");
    expect(memesPages([14, 12, 13], [12, 13, 14])).toBe(true);
    expect(memesPages([12], [12, 13])).toBe(false);
  });
});

describe("la ligne du prévu", () => {
  it("écrit le manuel et ses pages, comme une citation du coffre-fort", () => {
    expect(ligneDesPages("Mon fichier de maths", [12, 13, 14, 16])).toBe("📖 Mon fichier de maths · p. 12–14, 16");
    expect(ligneDesPages("  ", [3])).toBe("📖 Manuel · p. 3");
    // Une page seule s'écrit comme la citation d'un manuel du coffre-fort.
    expect(ligneDesPages("Mon fichier de maths", [42])).toBe(ligneDeManuel("Mon fichier de maths", 42));
  });

  it("se relit, même tapée à la main", () => {
    expect(lireLigneDePages("📖 Mon fichier de maths · p. 12–14, 16")).toEqual({ titre: "Mon fichier de maths", numeros: [12, 13, 14, 16] });
    expect(lireLigneDePages("  📖 mon fichier de maths p 12 à 14 et 16")).toEqual({ titre: "mon fichier de maths", numeros: [12, 13, 14, 16] });
    expect(lireLigneDePages("📖 Mon fichier de maths, pages 3 et 4")).toEqual({ titre: "Mon fichier de maths", numeros: [3, 4] });
    expect(lireLigneDePages("📖 Mon fichier de maths (p.7)")).toEqual({ titre: "Mon fichier de maths", numeros: [7] });
    expect(lireLigneDePages("📖 Lire au CE1 — période 2 · p. 5")).toEqual({ titre: "Lire au CE1 — période 2", numeros: [5] });
    // Le manuel cité seul : son titre, sans page.
    expect(lireLigneDePages("📖 Mon fichier de maths")).toEqual({ titre: "Mon fichier de maths", numeros: [] });
  });

  it("laisse les lignes qui citent autre chose", () => {
    expect(lireLigneDePages(ligneDeManuel("Mon fichier de maths", 42, "Compare les nombres"))).toBeNull();
    expect(lireLigneDePages("📖 Mon fichier de maths · p. 4 [img:a.png]")).toBeNull();
    expect(lireLigneDePages("Lecture p. 12")).toBeNull();
    expect(lireLigneDePages("📖 · p. 12")).toBeNull();
    expect(lireLigneDePages("📖")).toBeNull();
  });

  it("ne cite ni séquence ni jeu", () => {
    const ligne = ligneDesPages("Mon fichier de maths", [3]);
    expect(citeAutreChose(ligne)).toBe(true);
    const sequence = { id: "q1", titre: "Mon fichier de maths" } as Parameters<typeof sequencesCitees>[1][number];
    expect(sequencesCitees(ligne, [sequence], [])).toEqual([]);
  });
});

describe("les pages attachées à un créneau", () => {
  it("retrouve le manuel par son titre, sans accents ni majuscules", () => {
    expect(manuelDuTitre([maths, lecture], "MON FICHIER DE MATHS")?.id).toBe("m1");
    expect(manuelDuTitre([maths, lecture], "lire au ce1 periode 2")?.id).toBe("m2");
    expect(manuelDuTitre([maths, lecture], "Mon fichier")).toBeUndefined();
    expect(manuelDuTitre([maths], "")).toBeUndefined();
    // La case « ne pas imprimer » se garde par cette clé : le même manuel importé sur un autre ordinateur la retrouve.
    expect(cleDuManuel("Lire au CE1 — Période 2")).toBe(cleDuManuel("lire au ce1 periode 2"));
    expect(cleDuManuel("Mon fichier de maths")).toBe("mon fichier de maths");
  });

  it("donne les pages de chaque manuel, dans l'ordre du texte", () => {
    const prevu = ["Rituels", "📖 Lire au CE1 — période 2 · p. 5", "📖 Mon fichier de maths · p. 12–13", "Calcul mental"].join("\n");
    const attachees = pagesAttachees(prevu, [maths, lecture]);
    expect(attachees.map((x) => [x.manuel.id, x.pages.map((p) => p.numero)])).toEqual([["m2", [5]], ["m1", [12, 13]]]);
    expect(titreDesPages(attachees[1])).toBe("Mon fichier de maths · p. 12–13");
  });

  it("répare : deux lignes du même manuel n'en font qu'une, les pages qui n'existent pas sont passées", () => {
    const prevu = "📖 Mon fichier de maths · p. 14, 99\n📖 mon fichier de maths p. 12\n📖 Lire au CE1 — période 2 · p. 50";
    const attachees = pagesAttachees(prevu, [maths, lecture]);
    expect(attachees.map((x) => [x.manuel.id, x.pages.map((p) => p.numero)])).toEqual([["m1", [12, 14]]]);
  });

  it("laisse en texte un manuel qui n'est pas sur cet ordinateur", () => {
    expect(pagesAttachees("📖 Un manuel d'ailleurs · p. 3", [maths])).toEqual([]);
    expect(pagesAttachees("📖 Mon fichier de maths", [maths])).toEqual([]);
    expect(pagesAttachees("", [maths])).toEqual([]);
  });
});

describe("attacher, retirer, remettre", () => {
  it("pose la ligne après le curseur, ou à la fin", () => {
    expect(avecLesPages("Rituels\nCalcul", "Mon fichier de maths", [12, 13], 2))
      .toBe("Rituels\n📖 Mon fichier de maths · p. 12–13\nCalcul");
    expect(avecLesPages("Rituels", "Mon fichier de maths", [3], null)).toBe("Rituels\n📖 Mon fichier de maths · p. 3");
    expect(avecLesPages("", "Mon fichier de maths", [3], null)).toBe("📖 Mon fichier de maths · p. 3");
  });

  it("pose plusieurs manuels d'un coup, dans l'ordre du choix, avec ou sans curseur", () => {
    const choix = [{ titre: "Lire au CE1 — période 2", numeros: [5] }, { titre: "Mon fichier de maths", numeros: [12, 13] }];
    expect(avecLesChoix("Rituels\nCalcul", choix, null))
      .toBe("Rituels\nCalcul\n📖 Lire au CE1 — période 2 · p. 5\n📖 Mon fichier de maths · p. 12–13");
    expect(avecLesChoix("Rituels\nCalcul", choix, 2))
      .toBe("Rituels\n📖 Lire au CE1 — période 2 · p. 5\n📖 Mon fichier de maths · p. 12–13\nCalcul");
    // Une ligne déjà là se récrit à sa place ; un manuel sans page en part.
    expect(avecLesChoix("📖 Mon fichier de maths · p. 3\nRituels\n📖 Lire au CE1 — période 2 · p. 1", [...choix].reverse().map((x, i) => (i ? { ...x, numeros: [] } : x)), null))
      .toBe("📖 Mon fichier de maths · p. 12–13\nRituels");
  });

  it("récrit la ligne à sa place, et y fond les autres lignes du manuel", () => {
    const prevu = "Rituels\n📖 mon fichier de maths p 12\nCalcul\n📖 Mon fichier de maths · p. 20";
    expect(avecLesPages(prevu, "Mon fichier de maths", [12, 13, 20], 0))
      .toBe("Rituels\n📖 Mon fichier de maths · p. 12–13, 20\nCalcul");
    expect(numerosCites(prevu, "Mon fichier de maths")).toEqual([12, 20]);
  });

  it("sans page, la ligne s'en va ; un passage cité reste", () => {
    const passage = ligneDeManuel("Mon fichier de maths", 12, "Compare les nombres");
    const prevu = `Rituels\n📖 Mon fichier de maths · p. 12\n${passage}`;
    expect(avecLesPages(prevu, "Mon fichier de maths", [])).toBe(`Rituels\n${passage}`);
  });

  it("retire une page, puis la remet là où elle était", () => {
    const prevu = "Rituels\n📖 Mon fichier de maths · p. 12–14\nCalcul";
    const r = retirerLesPages(prevu, "Mon fichier de maths", [13]);
    expect(r.texte).toBe("Rituels\n📖 Mon fichier de maths · p. 12, 14\nCalcul");
    expect(remettreLesPages(r.texte, "Mon fichier de maths", [13], r.ligne)).toBe(prevu);
  });

  it("retire la dernière page avec sa ligne, et « Annuler » la remet à son rang", () => {
    const prevu = "Rituels\n📖 Mon fichier de maths · p. 12\nCalcul";
    const r = retirerLesPages(prevu, "Mon fichier de maths", [12]);
    expect(r).toEqual({ texte: "Rituels\nCalcul", ligne: 1 });
    // Ce qu'on a écrit entre-temps reste.
    expect(remettreLesPages("Rituels\nCalcul\nJeu de l'oie", "Mon fichier de maths", [12], r.ligne))
      .toBe("Rituels\n📖 Mon fichier de maths · p. 12\nCalcul\nJeu de l'oie");
    expect(remettreLesPages("", "Mon fichier de maths", [12], 5)).toBe("📖 Mon fichier de maths · p. 12");
  });

  it("remet les pages avec celles reçues entre-temps", () => {
    expect(remettreLesPages("📖 Mon fichier de maths · p. 20", "Mon fichier de maths", [12, 13], 0)).toBe("📖 Mon fichier de maths · p. 12–13, 20");
  });

  it("ne touche à rien quand il n'y a rien à retirer", () => {
    expect(retirerLesPages("Rituels", "Mon fichier de maths", [3]).texte).toBe("Rituels");
  });
});

describe("choisir les pages", () => {
  const numeros = [1, 2, 3, 4, 5, 6, 7, 8];

  it("un clic prend la page, un second la rend", () => {
    expect(cliquerUnePage([], 3, numeros, null, false)).toEqual([3]);
    expect(cliquerUnePage([3, 5], 3, numeros, 5, false)).toEqual([5]);
  });

  it("Maj prend toute la plage depuis la page cliquée avant, dans un sens ou dans l'autre", () => {
    expect(cliquerUnePage([3], 6, numeros, 3, true)).toEqual([3, 4, 5, 6]);
    expect(cliquerUnePage([6], 2, numeros, 6, true)).toEqual([2, 3, 4, 5, 6]);
  });

  it("Maj sur une page déjà prise rend toute la plage", () => {
    expect(cliquerUnePage([2, 3, 4, 5, 6], 5, numeros, 2, true)).toEqual([6]);
  });

  it("Maj sans page cliquée avant prend la page seule", () => {
    expect(cliquerUnePage([], 4, numeros, null, true)).toEqual([4]);
    expect(cliquerUnePage([], 4, numeros, 99, true)).toEqual([4]);
  });

  it("une plage suit l'ordre du manuel, même si les numéros sautent", () => {
    expect(cliquerUnePage([], 10, [2, 4, 10, 12], 2, true)).toEqual([2, 4, 10]);
  });
});

describe("imprimer les pages", () => {
  it("une image par page, chacune de son type", () => {
    const html = htmlDesPages([{ numero: 3, image: "iVBORw0K" }, { numero: 4, image: "/9j/4AAQ" }], "Mon fichier <maths>");
    expect(html).toContain('src="data:image/png;base64,iVBORw0K"');
    expect(html).toContain('src="data:image/jpeg;base64,/9j/4AAQ"');
    expect(html).toContain('alt="Mon fichier &lt;maths&gt; — page 4"');
  });
});
