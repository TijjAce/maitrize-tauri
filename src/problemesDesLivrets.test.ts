import { describe, it, expect } from "vitest";
import { demarcheDe, demarcheSuggeree } from "./demarches";
import { CLASSE_DES_DEMARCHES_PROBLEMES } from "./demarchesProblemes";
import { planDesFeuilles, type ClasseC2 } from "./feuillesDesSequences";
import { HABILLAGES_CP, problemeDeComparaison, problemeParties, problemesDeComparaison, problemesDuLivret, type Structure } from "./problemesDesLivrets";
import { cartesFractions, longueurEnUnites, longueursATracer, htmlSegmentsAMesurer, REGLAGES_FRACTIONS } from "./jeuxMaths";
import { programmationProposee } from "./programmation";
import type { Probleme } from "./problemesBarres";

const REF = "Cycle 2 — CP, CE1, CE2 (programmes 2026)";
const cible = (niveau: string, competenceGeneraleTitre: string, competenceTitre: string) => ({
  domaineTitre: "Mathématiques", sousDomaineTitre: "Nombres, calcul et résolution de problèmes", competenceGeneraleTitre, competenceTitre, niveau,
});

/** Les nombres d'un calcul « a − b = c » ou « a + b = c » ; plusieurs calculs séparés par « ; ». */
function calculsJustes(p: Probleme): boolean {
  return p.calcul.split(" ; ").every((c) => {
    // Les milliers s'écrivent avec une espace insécable : « 1 146 ».
    const m = c.replace(/[\u00a0\u202f](?=\d{3}\b)/g, "").match(/^(\d+) ([+−]) (\d+) = (\d+)$/);
    if (!m) return false;
    const [a, op, b, r] = [Number(m[1]), m[2], Number(m[3]), Number(m[4])];
    return (op === "+" ? a + b : a - b) === r && r > 0;
  });
}

describe("les problèmes et les fractions des livrets", () => {
  it("prennent la séquence du livret de la classe, et la démarche des problèmes sinon", () => {
    const cas: [string, string, string, string][] = [
      ["CP", "La résolution de problèmes", "Résoudre des problèmes additifs en une étape du type parties-tout.", "parties-tout-cp"],
      ["CE1", "La résolution de problèmes", "Résoudre des problèmes additifs en une étape de type parties-tout.", "parties-tout-ce1"],
      ["CE2", "La résolution de problèmes", "Résoudre des problèmes additifs en deux étapes.", "deux-etapes-ce2"],
      ["CE1", "Les fractions", "Savoir interpréter, représenter, écrire et lire les fractions 1/2, 1/3, 1/4, 1/5, 1/6, 1/8 et 1/10.", "fractions-unitaires-ce1"],
      ["CE2", "Les fractions", "Partager une unité de longueur en fractions d’unité et mesurer des longueurs non entières par rapport à cette unité.", "fractions-longueurs-ce2"],
      // Sans séquence de livret : la trame des livrets, prolongée (voir problemesProlonges.ts).
      ["CP", "La résolution de problèmes", "Résoudre des problèmes multiplicatifs en une étape (champ numérique inférieur ou égal à 30).", "multiplicatifs-cp"],
      ["CE1", "La résolution de problèmes", "Résoudre des problèmes additifs de comparaison en une étape.", "comparaison-ce1"],
      ["CE2", "La résolution de problèmes", "Résoudre des problèmes additifs en une étape de types parties-tout et comparaison.", "parties-tout-comparaison-ce2"],
    ];
    for (const [niveau, cg, titre, attendue] of cas) expect(demarcheSuggeree(cible(niveau, cg, titre), REF).id, `${niveau} — ${titre}`).toBe(attendue);
  });

  it("donnent à chaque séance ses feuilles, et des calculs qui tombent juste", () => {
    for (const [id, classe] of Object.entries(CLASSE_DES_DEMARCHES_PROBLEMES)) {
      const d = demarcheDe(id)!;
      const plan = planDesFeuilles(id, { classe: classe as ClasseC2, periode: 3 })!;
      expect(plan, id).not.toBeNull();
      expect(plan.materiel, id).toHaveLength(d.seances.length);
      for (const f of plan.feuilles) {
        expect(f.seance, `${id} · ${f.titre}`).toBeLessThan(d.seances.length);
        for (const graine of [1, 2, 3]) {
          const { html, style } = f.fabriquer(graine);
          expect(html, `${id} · ${f.titre}`).toMatch(/^<div class="(pb-)?feuille/);
          expect(style, `${id} · ${f.titre}`).toMatch(/\.(pb-)?feuille/);
          expect(html, `${id} · ${f.titre}`).not.toMatch(/NaN|undefined|−\d+ (billes|élèves)/);
        }
      }
    }
    // Les séquences de problèmes : chaque séance a sa feuille.
    for (const id of ["parties-tout-cp", "parties-tout-ce1", "deux-etapes-ce2"]) {
      const plan = planDesFeuilles(id, { classe: CLASSE_DES_DEMARCHES_PROBLEMES[id], periode: 3 })!;
      expect(new Set(plan.feuilles.map((f) => f.seance)).size, id).toBe(demarcheDe(id)!.seances.length);
    }
  });

  it("reprennent les problèmes de référence des livrets, mot pour mot", () => {
    const html = (id: string, seance: number) => planDesFeuilles(id, { classe: CLASSE_DES_DEMARCHES_PROBLEMES[id], periode: 3 })!
      .feuilles.filter((f) => f.seance === seance).map((f) => f.fabriquer(1).html).join("");
    expect(html("parties-tout-cp", 0)).toContain("Il y a 56 cerises dans un panier. Zoé enlève 14 cerises. Combien de cerises y a-t-il dans le panier maintenant ?");
    expect(html("parties-tout-cp", 0)).toContain("56 − 14 = 42");
    expect(html("parties-tout-cp", 3)).toContain("Il y a 43 élèves en récréation. 27 élèves jouent sous le préau.");
    expect(html("parties-tout-cp", 6)).toContain("Il y a 58 élèves en récréation.");
    expect(html("parties-tout-cp", 6)).toContain("45 − 18 = 27");
    expect(html("parties-tout-ce1", 0)).toContain("146 − 34 = 112");
    expect(html("deux-etapes-ce2", 0)).toContain("Léo a 37 billes. Lucie a 20 billes de plus que Léo. Combien de billes ont-ils en tout ?");
    expect(html("deux-etapes-ce2", 0)).toContain("37 + 20 = 57 ; 37 + 57 = 94");
    expect(html("deux-etapes-ce2", 0)).toContain("Maël a 44 billes. Maël a 10 billes de plus que Lou.");
    expect(html("deux-etapes-ce2", 0)).toContain("44 − 10 = 34 ; 44 + 34 = 78");
  });

  it("calculent chaque structure parties-tout comme il faut", () => {
    const calcul = (s: Structure, x: number, y: number) => problemeParties(s, x, y, "", () => "").calcul;
    expect(calcul("reste", 56, 14)).toBe("56 − 14 = 42");
    expect(calcul("partie", 43, 27)).toBe("43 − 27 = 16");
    expect(calcul("tout", 34, 17)).toBe("34 + 17 = 51");
    expect(calcul("final-ajout", 34, 17)).toBe("34 + 17 = 51");
    // Ce qu'on a ajouté ou retiré, la valeur de départ : une partie, ou le tout.
    expect(calcul("ajoute", 20, 45)).toBe("45 − 20 = 25");
    expect(calcul("retire", 50, 32)).toBe("50 − 32 = 18");
    expect(calcul("depart-ajout", 12, 40)).toBe("40 − 12 = 28");
    expect(calcul("depart-retrait", 12, 40)).toBe("12 + 40 = 52");
    // Des problèmes tirés : toujours justes, sans nombre négatif, la réponse dans la phrase.
    const structures: Structure[] = ["reste", "final-ajout", "ajoute", "retire"];
    for (const graine of [1, 2, 3, 4, 5, 6]) {
      for (const p of problemesDuLivret(HABILLAGES_CP, ["fruits", "autobus"], structures, 8, { min: 25, max: 99 }, graine)) {
        expect(calculsJustes(p), p.calcul).toBe(true);
        expect(p.phrase).toContain(String(p.reponse));
      }
    }
  });

  it("cassent une dizaine quand on le leur demande, et seulement alors", () => {
    for (const cassage of [false, true]) {
      const pb = problemesDuLivret(HABILLAGES_CP, ["cour"], ["partie"], 6, { min: 25, max: 99, cassage }, 7);
      expect(pb).toHaveLength(6);
      for (const p of pb) {
        const s = p.schema as Extract<Probleme["schema"], { forme: "parties" }>;
        const tout = s.tout.valeur, connue = s.parties[0].valeur;
        expect((connue % 10) > (tout % 10), p.calcul).toBe(cassage);
      }
    }
  });

  it("rédigent les comparaisons concordantes et discordantes", () => {
    const deux = problemeDeComparaison("billes", 44, 10, { mot: "plus", secondPlusGrand: false }, true, ["Maël", "Lou"]);
    expect(deux.enonce).toBe("Maël a 44 billes. Maël a 10 billes de plus que Lou. Combien de billes ont-ils en tout ?");
    expect([deux.calcul, deux.reponse]).toEqual(["44 − 10 = 34 ; 44 + 34 = 78", 78]);
    // « de moins », et pourtant la seconde est la plus grande.
    const moins = problemeDeComparaison("monnaie", 35, 20, { mot: "moins", secondPlusGrand: true }, false, ["Tom", "Inès"]);
    expect(moins.enonce).toBe("Tom a 35 €. Tom a 20 € de moins qu'Inès. Combien d'argent a Inès ?");
    expect([moins.calcul, moins.reponse]).toEqual(["35 + 20 = 55", 55]);
    expect(problemeDeComparaison("pommes", 30, 10, { mot: "plus", secondPlusGrand: true }, false, ["Léo", "Lucie"]).enonce)
      .toContain("Combien de pommes Lucie a-t-elle cueillies ?");
    expect(problemeDeComparaison("longueurs", 40, 15, { mot: "plus", secondPlusGrand: true }, true, ["Léo", "Lucie"]).enonce)
      .toBe("La bande de Léo mesure 40 cm. La bande de Lucie mesure 15 cm de plus que celle de Léo. Quelle longueur mesurent les bandes de Léo et de Lucie mises bout à bout ?");
    // Tirés au hasard : justes, et une fois sur deux la seconde valeur est la plus petite.
    for (const graine of [1, 2, 3]) {
      const pb = problemesDeComparaison(["billes", "monnaie", "longueurs", "durees", "pommes"], 8, graine, (r) => (r % 2 ? 1 : 2));
      expect(pb).toHaveLength(8);
      for (const p of pb) expect(calculsJustes(p), p.calcul).toBe(true);
      expect(pb.filter((p) => p.calcul.includes(" ; "))).toHaveLength(4);
    }
  });

  it("fabriquent les cartes unitaires, et les segments à mesurer et à tracer", () => {
    const unitaires = cartesFractions({ ...REGLAGES_FRACTIONS, denominateurs: [2, 4, 8], representations: ["lettres"], unitaires: true });
    expect(unitaires.map((c) => `${c.k}/${c.n}`)).toEqual(["1/2", "1/4", "1/8"]);
    expect(cartesFractions({ ...REGLAGES_FRACTIONS, denominateurs: [4], representations: ["chiffres"] })).toHaveLength(3);
    // Six segments, une bande unité, un corrigé.
    const mesurer = htmlSegmentsAMesurer(4, 3);
    expect(mesurer.match(/class="fr-segment"/g)).toHaveLength(6);
    expect(mesurer).toContain('class="fr-unite"');
    expect(mesurer).toContain("corrigé");
    // En huitièmes, le livret fait tracer des demis et des quarts.
    for (const graine of [1, 2, 3]) expect(longueursATracer(8, graine).every((k) => k % 2 === 0)).toBe(true);
    expect(longueurEnUnites(6, 8, true)).toContain("<span>3</span><span class=\"fr-trait\"></span><span>4</span>");
    expect(longueurEnUnites(9, 4)).toContain("2 u +");
    expect(longueurEnUnites(8, 4)).toBe("2 u");
  });

  it("proposent la période du livret ou du programme", () => {
    const periode = (niveau: string, id: string) => programmationProposee({ niveau, competenceTitre: "" }, id)!.periode;
    expect(periode("CP", "parties-tout-cp")).toBe(4);
    expect(periode("CE1", "parties-tout-ce1")).toBe(3);
    expect(periode("CE1", "fractions-unitaires-ce1")).toBe(2);
    expect(periode("CE2", "fractions-longueurs-ce2")).toBe(3);
    // Le livret CE2 ne date pas sa séquence de problèmes en deux étapes.
    expect(periode("CE2", "deux-etapes-ce2")).toBeNull();
  });
});
