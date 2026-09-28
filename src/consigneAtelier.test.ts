import { describe, it, expect } from "vitest";
import { cleConsigne, consigneParDefaut, consignesParDefaut, htmlDeConsigne, remplacerConsigne } from "./consigneAtelier";

const cubes = `<div class="titre">Les nombres en cubes</div><div class="sous cu-consigne consigne">Compte les cubes et écris le nombre.</div><table></table>`;
const loto = `<div class="page"><div class="regle"><b>Loto des syllabes</b>Chaque élève a une planche : dans chaque case, un nombre de syllabes.
    On pioche une image. <span style="color:#687087">— Éduscol 2020.</span></div><div class="grille"></div></div>`;

describe("la consigne d'origine", () => {
  it("se lit sur le premier élément de consigne, titre en tête, sans les balises", () => {
    expect(consigneParDefaut(cubes)).toBe("Compte les cubes et écris le nombre.");
    expect(consigneParDefaut(loto)).toBe("Loto des syllabes\nChaque élève a une planche : dans chaque case, un nombre de syllabes. On pioche une image. — Éduscol 2020.");
    expect(consigneParDefaut(`<h1>Loto</h1><div class="grille"></div>`)).toBeNull();
  });

  it("ignore les pictos déjà posés et rend les caractères échappés", () => {
    const decore = `<p class="consigne"><span class="consigne-pictos"><span class="consigne-picto"><img src="x" alt="lire"><small>lire</small></span></span>Lis &amp; entoure « l&#39;intrus »</p>`;
    expect(consigneParDefaut(decore)).toBe("Lis & entoure « l'intrus »");
  });
});

describe("la consigne réécrite", () => {
  it("remplace la première consigne, échappée, les lignes à la ligne", () => {
    const html = remplacerConsigne(cubes, "Regarde les cubes.\nÉcris le nombre <ici>.");
    expect(html).toBe(`<div class="titre">Les nombres en cubes</div><div class="sous cu-consigne consigne">Regarde les cubes.<br>Écris le nombre &lt;ici&gt;.</div><table></table>`);
  });

  it("garde le titre en gras d'une règle encadrée", () => {
    expect(htmlDeConsigne("Le loto\nOn pioche.\nOn pose.", true)).toBe("<b>Le loto</b>On pioche.<br>On pose.");
    expect(htmlDeConsigne("Une seule ligne", true)).toBe("Une seule ligne");
    expect(htmlDeConsigne("Titre\nTexte", false)).toBe("Titre<br>Texte");
    expect(remplacerConsigne(loto, "Le loto de la classe\nOn pioche, on scande, on pose.")).toContain(`<div class="regle"><b>Le loto de la classe</b>On pioche, on scande, on pose.</div>`);
  });

  it("laisse la feuille telle quelle sans texte, ou sans consigne à remplacer", () => {
    expect(remplacerConsigne(cubes, "")).toBe(cubes);
    expect(remplacerConsigne(cubes, "   \n ")).toBe(cubes);
    expect(remplacerConsigne(cubes, null)).toBe(cubes);
    expect(remplacerConsigne(`<h1>Loto</h1>`, "Ma consigne")).toBe(`<h1>Loto</h1>`);
  });

  it("se range par atelier dans un réglage partagé", () => {
    expect(cleConsigne("fluence")).toBe("fabriquer:consigne:fluence");
  });
});

describe("les consignes d'origine publiées", () => {
  it("se retiennent par atelier et préviennent qui écoute", () => {
    let appels = 0;
    const arreter = consignesParDefaut.abonner(() => { appels++; });
    consignesParDefaut.publier("cubes", "Compte.");
    consignesParDefaut.publier("cubes", "Compte.");
    consignesParDefaut.publier("", "rien");
    expect(consignesParDefaut.lire("cubes")).toBe("Compte.");
    expect(consignesParDefaut.lire("inconnu")).toBe("");
    expect(appels).toBe(1);
    arreter();
  });
});
