import { describe, expect, it } from "vitest";
import { REGLAGES_TABLEAU, htmlTableau, reglagesTableauSurs, titreTableau } from "./tableauDoubleEntree";

/** Les pages de la feuille, sans le corrigé, et le corrigé. */
const parties = (html: string) => { const i = html.indexOf('class="page corrige"'); return { eleve: html.slice(0, i), corrige: html.slice(i) }; };
/** Les cases dessinées du tableau : une forme coloriée (pas blanche) par case faite. */
const coloriees = (html: string) => (html.match(/<td><svg viewBox="0 0 20 20"[^>]*><(?:circle|rect|path)[^>]*fill="#(?!ffffff)/g) ?? []).length;

describe("le tableau à double entrée, son atelier (demande de l'enseignant, 2026-11-01)", () => {
  it("croise trois formes et quatre couleurs, trois cases faites ; le corrigé les a toutes", () => {
    const { eleve, corrige } = parties(htmlTableau(REGLAGES_TABLEAU, [], 1));
    expect(eleve).toContain("Le tableau des formes et des couleurs");
    expect(eleve).toContain("Dans chaque case vide, je dessine la forme de sa ligne, de la couleur de sa colonne. 3 cases sont déjà faites.");
    expect(coloriees(eleve)).toBe(3);
    expect(coloriees(corrige)).toBe(12);
    expect(eleve).toContain("<div>violet</div>");
    expect(eleve).toContain("<div>triangle</div>");
  });

  it("fait la première ligne ou la première colonne en modèle, ou aucune case", () => {
    expect(coloriees(parties(htmlTableau({ ...REGLAGES_TABLEAU, faites: "ligne" }, [], 1)).eleve)).toBe(4);
    expect(coloriees(parties(htmlTableau({ ...REGLAGES_TABLEAU, faites: "colonne" }, [], 1)).eleve)).toBe(3);
    expect(coloriees(parties(htmlTableau({ ...REGLAGES_TABLEAU, faites: "aucune" }, [], 1)).eleve)).toBe(0);
    expect(htmlTableau({ ...REGLAGES_TABLEAU, faites: "ligne" }, [], 1)).toContain("La première ligne est faite : c'est le modèle.");
  });

  it("donne à coller les gommettes des cases vides, sur leur page", () => {
    const html = htmlTableau({ ...REGLAGES_TABLEAU, tache: "coller" }, [], 1);
    expect(html).toContain("Je découpe les gommettes. Je colle chacune dans la case de sa ligne et de sa colonne.");
    expect(html.match(/class="tde-gommette"/g)).toHaveLength(9);
  });

  it("prend des images de la banque pour les lignes, à partir de deux ; sinon les formes", () => {
    const images = [{ mot: "zèbre", src: "data:image/png;base64,AAA" }, { mot: "lion", src: "data:image/png;base64,BBB" }];
    const html = htmlTableau({ ...REGLAGES_TABLEAU, lignes: "images" }, images, 1);
    expect(html).toContain("Le tableau des images et des couleurs");
    expect(html).toContain("je dessine l'image de sa ligne");
    expect(html).toContain('<img class="tde-image" alt="" src="data:image/png;base64,AAA"');
    expect(htmlTableau({ ...REGLAGES_TABLEAU, lignes: "images" }, images.slice(0, 1), 1)).toContain("Le tableau des formes et des couleurs");
    expect(titreTableau({ titre: " Mon tableau ", lignes: "formes" })).toBe("Mon tableau");
  });

  it("prend jusqu'à neuf couleurs : au-delà de cinq, la feuille passe à l'italienne et les cases se resserrent", () => {
    const toutes = ["bleu", "vert", "jaune", "violet", "rouge", "orange", "rose", "marron", "noir"];
    const html = htmlTableau({ ...REGLAGES_TABLEAU, couleurs: toutes }, [], 1);
    expect(html).toContain("<style>@page { size: A4 landscape; }</style>");
    expect(html.match(/class="tde-pastille"/g)).toHaveLength(18);
    expect(html).toContain("--tde-l:25mm;--tde-h:28mm");
    expect(htmlTableau(REGLAGES_TABLEAU, [], 1)).not.toContain("landscape");
    expect(reglagesTableauSurs({ couleurs: [...toutes, "bleu"] }).couleurs).toEqual(toutes);
  });

  it("met en coloriage les lignes d'images : le dessin noir et blanc dans les têtes et les cases, colorié dans les cases faites", () => {
    const zebre = { mot: "zèbre", src: "data:image/png;base64,Z", coloriage: "data:image/png;base64,ZNB", colorie: { "#4a86e8": "data:image/png;base64,ZBLEU" } };
    const lion = { mot: "lion", src: "data:image/png;base64,L", coloriage: "data:image/png;base64,LNB", colorie: { "#4a86e8": "data:image/png;base64,LBLEU" } };
    const html = htmlTableau({ ...REGLAGES_TABLEAU, lignes: "images", coloriage: true, couleurs: ["bleu", "vert"], faites: "colonne" }, [zebre, lion], 1);
    const { eleve, corrige } = parties(html);
    expect(eleve).toContain("Dans chaque case, je colorie le dessin de la couleur de sa colonne. La première colonne est faite : c'est le modèle.");
    // Les têtes et les deux cases vides en noir et blanc, la première colonne coloriée en bleu.
    expect(eleve.match(/src="data:image\/png;base64,ZNB"/g)).toHaveLength(2);
    expect(eleve).toContain('src="data:image/png;base64,ZBLEU"');
    expect(eleve).not.toContain('src="data:image/png;base64,Z"');
    // Le vert n'est pas encore colorié : au corrigé, l'image encadrée de vert, en attendant.
    expect(corrige).toContain("border-color:#38a169");
    // Sans le dessin noir et blanc, pas de coloriage : les images telles quelles.
    expect(htmlTableau({ ...REGLAGES_TABLEAU, lignes: "images", coloriage: true }, [{ mot: "a", src: "x" }, { mot: "b", src: "y" }], 1)).toContain("je dessine l'image de sa ligne");
  });

  it("lit ses réglages sans leur faire confiance", () => {
    const r = reglagesTableauSurs({ formes: ["cercle", "ovale" as never], couleurs: ["bleu", "bleu", "vert", "gris"], combien: 99, faites: "partout" as never });
    expect(r.formes).toEqual(REGLAGES_TABLEAU.formes);
    expect(r.couleurs).toEqual(["bleu", "vert"]);
    expect(r.combien).toBe(8);
    expect(r.faites).toBe("hasard");
    expect(htmlTableau({ formes: ["étoile", "cœur", "losange", "rectangle"] }, [], 2)).not.toMatch(/NaN|undefined|null/);
  });
});
