import { describe, it, expect } from "vitest";
import { objectifParId } from "./faitsNumeriques";
import { escapeHtml } from "./print";
import { OPTIONS_FEUILLE, appliquerOptionsFeuille, contenuDeLaFeuille } from "./optionsFeuille";
import { REGLAGES_MARTINIERE, calculsMartiniere, fluenceAttendue, htmlMartiniere, libelleTravaille, objectifsRetenus, resumeMartiniere, type ReglagesMartiniere } from "./martiniere";

const r = (p: Partial<ReglagesMartiniere> = {}): ReglagesMartiniere => ({ ...REGLAGES_MARTINIERE, ...p });

describe("le calcul mental, un objectif à la fois", () => {
  it("ne retient qu'un objectif hors révision, et seulement ceux de la classe", () => {
    expect(objectifsRetenus(r()).map((o) => o.id)).toEqual(["cp-complements-10"]);
    const plusieurs = r({ objectifs: ["cp-doubles", "cp-moities", "ce1-doubles"] });
    expect(objectifsRetenus(plusieurs).map((o) => o.id)).toEqual(["cp-doubles"]);
    expect(objectifsRetenus({ ...plusieurs, revision: true }).map((o) => o.id)).toEqual(["cp-doubles", "cp-moities"]);
    // Rien de la classe parmi les choix, ou un réglage d'avant : le premier objectif de la classe.
    expect(objectifsRetenus(r({ niveau: "CE2", objectifs: ["cp-doubles"] })).map((o) => o.id)).toEqual(["ce2-tables-addition"]);
    expect(objectifsRetenus({ niveau: "CM1", objectifs: undefined as unknown as string[], revision: false }).map((o) => o.id)).toEqual(["cm1-table-multiplication"]);
  });

  it("fait des séries du seul objectif choisi, rejouables", () => {
    const series = calculsMartiniere(r(), 42);
    expect(series).toHaveLength(2);
    for (const s of series) {
      expect(s).toHaveLength(10);
      for (const c of s) { expect(c.objectif).toBe("cp-complements-10"); expect(c.ecrit).toMatch(/10/); }
    }
    expect(calculsMartiniere(r(), 42)).toEqual(series);
    expect(calculsMartiniere(r(), 43)).not.toEqual(series);
    // Pas deux fois le même calcul tant que l'objectif en a d'autres.
    const tables = calculsMartiniere(r({ niveau: "CE1", objectifs: ["ce1-tables-addition"], series: 3 }), 7).flat().map((c) => c.ecrit);
    expect(new Set(tables).size).toBe(30);
    // En révision, les objectifs choisis reviennent à tour de rôle.
    const revision = calculsMartiniere(r({ objectifs: ["cp-doubles", "cp-moities"], revision: true }), 3);
    for (const s of revision) expect(new Set(s.map((c) => c.objectif))).toEqual(new Set(["cp-doubles", "cp-moities"]));
    expect(calculsMartiniere(r({ series: 99, parSerie: 99 }), 1)).toHaveLength(6);
  });

  it("dit ce qu'on travaille, la table choisie comprise, et ce que le programme attend", () => {
    expect(resumeMartiniere(r())).toBe("CP · Compléments à 10 · 2 séries de 10 calculs.");
    const table = r({ niveau: "CE1", objectifs: ["ce1-table-multiplication"], tables: [7], series: 1 });
    expect(resumeMartiniere(table)).toBe("CE1 · Une table de multiplication : 7 · 1 série de 10 calculs.");
    expect(libelleTravaille(objectifParId("ce1-table-multiplication")!, [1, 3, 7])).toBe("Une table de multiplication : 3, 7");
    expect(libelleTravaille(objectifParId("ce1-table-multiplication")!, [])).toBe("Une table de multiplication : 2");
    expect(fluenceAttendue(objectifParId("cp-complements-10")!)).toBe("8 égalités à trou en une minute");
    expect(fluenceAttendue(objectifParId("cp-ajouter-9")!)).toBe("9 résultats en trois minutes");
    expect(fluenceAttendue(objectifParId("cm1-fois-5")!)).toBe("");
  });

  it("à l'oral : la fiche du maître, les réponses marquées comme correction, puis les ardoises", () => {
    const series = calculsMartiniere(r(), 5);
    const html = htmlMartiniere(series, r());
    expect(html).toContain("procédé La Martinière");
    expect(html).toContain("<caption>Série 2</caption>");
    expect(html).toContain("5 secondes");
    expect(html).toContain("Attendu en fin de CP : 8 égalités à trou en une minute.");
    // La consigne des élèves d'abord, et juste : on y cherche un terme, l'élève écrit le nombre qui manque — pas « le résultat ».
    expect(html).toContain('<div class="consigne">Écris le nombre qui manque.</div>');
    expect(html.indexOf('class="consigne"')).toBeLessThan(html.indexOf('class="regle"'));
    expect(html).toContain("chacun écrit sa réponse");
    expect(html).not.toContain("écrit le résultat");
    expect((html.match(/<td class="corrige">/g) ?? []).length).toBe(20);
    expect((html.match(/class="ma-case"/g) ?? []).length).toBe(2 * 20);
    expect(contenuDeLaFeuille(html)).toEqual({ consigne: true, prenom: true, corrige: true });
    // Sans la correction : la colonne des réponses s'en va, les calculs restent.
    const sans = appliquerOptionsFeuille(html, { ...OPTIONS_FEUILLE, corrige: false });
    expect(sans).not.toContain("Réponse");
    expect(sans).toContain("<th>Au tableau</th></tr>");
    expect(sans).toContain(escapeHtml(series[0][0].dire));
    expect(htmlMartiniere(series, r({ ardoises: false }))).not.toContain("ma-case");
    const longues = r({ parSerie: 15, series: 3 });
    expect((htmlMartiniere(calculsMartiniere(longues, 5), longues).match(/class="ma-ardoise"/g) ?? []).length).toBe(1);
  });

  it("par écrit : les égalités à trou à compléter, et le corrigé sur sa page", () => {
    const ecrit = r({ forme: "ecrit" });
    const series = calculsMartiniere(ecrit, 5);
    const html = htmlMartiniere(series, ecrit);
    expect(html).toContain(`<div class="consigne">Complète le plus d'égalités possible en une minute.</div>`);
    expect(html).toContain("Prénom : ");
    expect((html.match(/class="ma-trou"/g) ?? []).length).toBe(20);
    expect(html).toContain(`<div class="page corrige">`);
    expect(html).toContain(`<b>${series[0][0].reponse}</b>`);
    expect(html).not.toContain("La Martinière");
    const sans = appliquerOptionsFeuille(html, { consigne: false, prenom: false, corrige: false });
    expect(sans).not.toContain("corrigé");
    expect(sans).not.toContain("Complète");
    expect(sans).not.toContain("Prénom");
    expect((sans.match(/class="ma-trou"/g) ?? []).length).toBe(20);
    // Une procédure ne se chronomètre pas à la minute.
    const procedure = r({ forme: "ecrit", objectifs: ["cp-ajouter-9"] });
    expect(htmlMartiniere(calculsMartiniere(procedure, 1), procedure)).toContain("Calcule de tête, et complète les égalités.");
  });
});
