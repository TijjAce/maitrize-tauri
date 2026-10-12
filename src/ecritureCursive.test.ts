import { describe, it, expect } from "vitest";
import { LIGNES_CIEL, REGLAGES_CURSIVE, htmlEcritureCursive, ligneCielHerbeTerre } from "./ecritureCursive";

// Le ciel, l'herbe, la terre : les petites lettres dans l'herbe, les grandes
// dans le ciel, les jambages dans la terre. Les bandes gardent les proportions
// de la réglure Seyès, pour que les lettres d'une police scolaire s'y posent.

/** Les ordonnées des lignes d'une ligne d'écriture, de haut en bas. */
const ordonnees = (svg: string) => [...svg.matchAll(/<line x1="0" y1="([\d.]+)"/g)].map((m) => Number(m[1]));

describe("ciel, herbe, terre", () => {
  it("trace quatre lignes de couleur : deux hauteurs d'herbe de ciel, une d'herbe, deux de terre", () => {
    const svg = ligneCielHerbeTerre(10);
    const [ciel, herbe, sol, terre] = ordonnees(svg);
    expect(herbe - ciel).toBeCloseTo(20);
    expect(sol - herbe).toBeCloseTo(10);
    expect(terre - sol).toBeCloseTo(20);
    for (const couleur of Object.values(LIGNES_CIEL)) expect(svg).toContain(`stroke="${couleur}"`);
  });

  it("pose le modèle au sol, ses petites lettres de la hauteur de l'herbe", () => {
    const svg = ligneCielHerbeTerre(8, "lilas");
    const [, , sol] = ordonnees(svg);
    const texte = svg.match(/<text x="[\d.]+" y="([\d.]+)"[^>]*font-size="([\d.]+)"[^>]*>lilas<\/text>/);
    expect(texte).not.toBeNull();
    expect(Number(texte![1])).toBeCloseTo(sol);
    expect(Number(texte![2])).toBeCloseTo(8 / 0.4);
  });

  it("dessine l'image au bord, et teinte toute la ligne seulement si on le demande", () => {
    const sans = ligneCielHerbeTerre(10);
    expect(sans).toContain('class="cu-image"');
    expect(sans).not.toContain("#ecf7e4");
    expect(ligneCielHerbeTerre(10, "", true)).toContain("#ecf7e4");
  });

  it("remplace la réglure Seyès sur la feuille, consigne comprise", () => {
    const html = htmlEcritureCursive({ ...REGLAGES_CURSIVE, guide: "ciel", modeles: "a\nb", lignes: 2 });
    expect(html).toContain("ciel, herbe, terre");
    expect(html).not.toContain("réglure de");
    expect(html.match(/cu-ciel/g)).toHaveLength(4);
    expect(html).toContain("les petites lettres restent dans l'herbe");
    // Le cahier reste la règle : sans choix, la réglure de 3 mm.
    expect(htmlEcritureCursive(REGLAGES_CURSIVE)).toContain("réglure de 3 mm");
  });

  it("ramène une hauteur inconnue à celle d'origine", () => {
    const html = htmlEcritureCursive({ ...REGLAGES_CURSIVE, guide: "ciel", herbe: 42 as never, modeles: "a", lignes: 1 });
    expect(html).toContain(`height="${(5 * 10 + 5).toFixed(2)}mm"`);
  });
});
