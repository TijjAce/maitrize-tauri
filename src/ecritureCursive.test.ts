import { describe, it, expect } from "vitest";
import { documentImprimable } from "./print";
import { LIGNES_CIEL, REGLAGES_CURSIVE, blocMarelle, htmlEcritureCursive, ligneCielHerbeTerre } from "./ecritureCursive";

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
    const texte = svg.match(/<text x="[\d.]+" y="([\d.]+)"[^>]*font-size: calc\(([\d.]+)px \/ var\(--police-cursive-x, 0\.4\)\)[^>]*>lilas<\/text>/);
    expect(texte).not.toBeNull();
    expect(Number(texte![1])).toBeCloseTo(sol);
    // La taille vient des proportions de la police choisie : 8 mm de petites lettres, Marelle à 8 / 0,48.
    expect(Number(texte![2])).toBe(8);
    expect(svg).toContain("font-family: var(--police-cursive,");
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

  it("écrit sur les lignes Seyès que trace Marelle : le modèle, puis des rangées d'espaces, à quatre interlignes", () => {
    const html = htmlEcritureCursive({ ...REGLAGES_CURSIVE, guide: "marelle", modeles: "an\nlilas", lignes: 3, reglure: 3 });
    const blocs = [...html.matchAll(/<div class="cu-marelle" style="font-size: ([\d.]+)mm; --cu-interligne: 3mm">([^<]*)<\/div>/g)];
    expect(blocs).toHaveLength(2);
    // Une petite lettre sur un interligne : Marelle à 3 / 0,48 mm.
    expect(Number(blocs[0][1])).toBeCloseTo(6.25);
    const rangees = blocs[0][2].split("\n");
    expect(rangees).toHaveLength(3);
    expect(rangees[0].trim()).toBe("an");
    expect(rangees.slice(1).every((x) => x.trim() === "")).toBe(true);
    // La marge : de quoi passer la ligne rouge du cahier, à 16 mm.
    expect(rangees[0].indexOf("an") * 0.45 * 6.25).toBeGreaterThan(16);
    expect(html).toContain("lignes Seyès de Marelle, réglure de 3 mm");
  });

  it("donne en copiant le modèle en script, et toutes les rangées vides", () => {
    const html = htmlEcritureCursive({ ...REGLAGES_CURSIVE, guide: "marelle", modeles: "la lune", lignes: 2, transcrire: true });
    expect(html).toContain('<div class="cu-script">la lune</div>');
    const texte = html.match(/<div class="cu-marelle"[^>]*>([^<]*)<\/div>/)![1];
    expect(texte.split("\n")).toHaveLength(2);
    expect(texte.trim()).toBe("");
    expect(blocMarelle(2, [""]).split("\u00a0").length - 1).toBeGreaterThan(100);
    // Rien ne tombe à l'impression : la dernière rangée, faite d'espaces, reste.
    const doc = documentImprimable("Copier", html, "");
    expect(doc.match(/<div class="cu-marelle"[^>]*>([^<]*)<\/div>/)![1].split("\n")).toHaveLength(2);
  });
});
