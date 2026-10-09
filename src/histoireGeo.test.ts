import { describe, it, expect } from "vitest";
import cycle2 from "../src-tauri/referentiels/competences_cycle2.json";
import { demarcheDe, demarcheSuggeree } from "./demarches";
import { DEMARCHES_HISTOIRE_GEO, planHistoireGeo } from "./demarchesHistoireGeo";
import { programmationProposee } from "./programmation";
import {
  CLASSE_EXEMPLE, REGLAGES_PLAN_CLASSE, cachettesDe, consignesAuto, htmlPlanClasse, lireProfils, motsDeLaPhrase, reglagesPlanSurs,
} from "./planDeLaClasse";
import { FIGURES_PAR_DEFAUT, MODELES_FRISE, REGLAGES_FRISE, figuresDesPeriodes, htmlFrise } from "./frisesTemps";
import { FAMILLES_PAYSAGE, REGLAGES_PAYSAGE, htmlPaysage, type FamillePaysage } from "./lireUnPaysage";
import { sansReferences } from "./references";
import type { CompetenceSelectionnee } from "./components/CompetenceTree";

type Ref = { domaines: { id: string; titre: string; sousDomaines: { titre: string; competencesGenerales: { titre: string; competences: { id: string; texte: string; niveau: string }[] }[] }[] }[] };
const HG = (cycle2 as Ref).domaines.find((d) => d.id === "HG")!;
const competences = HG.sousDomaines.flatMap((sd) => sd.competencesGenerales.flatMap((cg) => cg.competences.map((c): CompetenceSelectionnee => ({
  id: c.id, referentielNom: "Cycle 2 — CP, CE1, CE2 (programmes 2026)", domaineId: "HG", domaineTitre: HG.titre, sousDomaineTitre: sd.titre,
  competenceGeneraleTitre: cg.titre, competenceTitre: c.texte, niveau: c.niveau, competenceRefId: c.id,
}))));

describe("les séquences d'histoire-géographie du cycle 2", () => {
  it("donnent à chaque compétence la séquence de son thème, plus l'enquête générale", () => {
    expect(competences).toHaveLength(48);
    const ids = new Set(DEMARCHES_HISTOIRE_GEO.map((d) => d.id));
    for (const c of competences) {
      const d = demarcheSuggeree(c, c.referentielNom, 1);
      expect(ids.has(d.id), `${c.niveau} — ${c.competenceTitre}`).toBe(true);
    }
  });

  it("gardent la séquence Éduscol pour la classe et son plan, et celle du programme pour l'école et le trajet", () => {
    const de = (texte: RegExp) => demarcheSuggeree(competences.find((c) => texte.test(c.competenceTitre))!, "", 1).id;
    expect(de(/Faire le plan de la classe/)).toBe("classe-espace-organise-cp");
    expect(de(/différents angles de vue/)).toBe("classe-espace-organise-cp");
    expect(de(/Décrire l’usage des différents lieux/)).toBe("ecole-quartier-cp");
    expect(de(/représenter un trajet/)).toBe("ecole-quartier-cp");
    expect(de(/Nommer les saisons/)).toBe("temps-naturel-cp");
    expect(de(/arbres généalogiques/)).toBe("situer-evenements-cp");
    expect(de(/grandes périodes de l’histoire/)).toBe("grandes-periodes-ce1");
    expect(de(/cérémonie du sacre/)).toBe("royaume-france-ce2");
    expect(de(/station touristique/)).toBe("travailler-ce2");
  });

  it("ont toutes leurs feuilles dans leurs séances, et une note de matériel par séance", () => {
    for (const d of DEMARCHES_HISTOIRE_GEO) {
      const plan = planHistoireGeo(d.id, { classe: "CE1", periode: 2 })!;
      expect(plan, d.id).not.toBeNull();
      expect(plan.materiel, d.id).toHaveLength(d.seances.length);
      expect(plan.materiel.every((m) => m === "" || /\.$/.test(m)), d.id).toBe(true);
      for (const f of plan.feuilles) {
        expect(f.seance, `${d.id} · ${f.titre}`).toBeLessThan(d.seances.length);
        expect(f.fabriquer(7).html, `${d.id} · ${f.titre}`).toContain('<div class="feuille');
      }
      expect(demarcheDe(d.id)?.id).toBe(d.id);
      expect(d.source.length).toBeGreaterThan(20);
    }
  });

  it("disent leur source : la séquence Éduscol, ou le programme", () => {
    expect(demarcheDe("classe-espace-organise-cp")!.source).toMatch(/Éduscol, ressources 2016/);
    expect(demarcheDe("rome-gaule-ce2")!.source).toMatch(/BO n° 22 du 28 mai 2026/);
    // Le temps au CP : les séquences Éduscol « Se situer dans le temps », et le programme pour ce qu'elles ne couvrent pas.
    const temps = demarcheDe("temps-represente-cp")!;
    expect(temps.source).toMatch(/« Passer d'un temps ressenti à un temps mesuré » \(séances 1 à 3\)/);
    expect(temps.source).toMatch(/BO n° 22 du 28 mai 2026/);
    expect(temps.seances.slice(0, 3).map((x) => x.titre)).toEqual(["François et le temps", "Jeux de langage en ateliers", "Le petit voleur de temps"]);
    const situer = demarcheDe("situer-evenements-cp")!;
    expect(situer.source).toMatch(/« Situer les événements les uns par rapport aux autres » \(séances 1 et 2/);
    expect(situer.seances[0].titre).toBe("Le parcours sonore");
    const sirene = demarcheDe("petite-sirene-cp")!;
    expect(sirene.source).toMatch(/séances 1 à 5/);
    expect(sirene.seances).toHaveLength(5);
  });

  it("proposent au CE2 les périodes du programme", () => {
    const ce2 = (id: string) => programmationProposee({ niveau: "CE2", competenceTitre: "" }, id);
    expect(ce2("prehistoire-ce2")).toMatchObject({ niveau: "CE2", periode: 1 });
    expect(ce2("rome-gaule-ce2")).toMatchObject({ niveau: "CE2", periode: 2 });
    expect(ce2("royaume-france-ce2")).toMatchObject({ niveau: "CE2", periode: 4 });
  });
});

describe("le plan de la classe", () => {
  it("lit le plan de salle avec méfiance", () => {
    const profils = lireProfils(JSON.stringify([
      { id: "p1", nom: "Îlots", elements: [{ id: "e1", type: "table", x: 10, y: 10, w: 100, h: 50, label: "Îlot 1" }, { type: "inconnu" }] },
      { id: "p2", nom: "Vide", elements: [] },
    ]));
    expect(profils).toHaveLength(1);
    expect(profils[0].elements).toHaveLength(1);
    expect(lireProfils("pas du json")).toEqual([]);
  });

  it("tire les consignes de l'évaluation du mobilier, avec ses noms", () => {
    const texte = consignesAuto(CLASSE_EXEMPLE);
    expect(texte).toContain("- en orange ta place ;");
    expect(texte).toContain("Bureau");
    expect(texte).toContain("4. Trace le chemin :");
  });

  it("cache les mots de la phrase mystère toujours aux mêmes endroits pour une même graine", () => {
    const mots = motsDeLaPhrase("Bravo, vous avez trouvé tous les mots de notre phrase !");
    expect(mots).toHaveLength(10);
    expect(mots[9]).toBe("phrase !");
    expect(cachettesDe(CLASSE_EXEMPLE, 10, 3).map((e) => e.id)).toEqual(cachettesDe(CLASSE_EXEMPLE, 10, 3).map((e) => e.id));
    expect(cachettesDe(CLASSE_EXEMPLE, 10, 3).every((e) => !["mur", "porte", "fenetre"].includes(e.type))).toBe(true);
  });

  it("imprime chaque feuille, la source derrière le « ? »", () => {
    for (const feuille of ["plan", "evaluation", "tresor", "symbolique", "etiquettes"] as const) {
      const html = htmlPlanClasse(reglagesPlanSurs({ ...REGLAGES_PLAN_CLASSE, feuille, prenoms: ["Lina", "Sami"] }), 5);
      expect(html, feuille).toContain('<div class="feuille pc">');
      expect(sansReferences(html), feuille).not.toContain("ressources 2016");
    }
    expect(htmlPlanClasse(reglagesPlanSurs({ ...REGLAGES_PLAN_CLASSE, feuille: "tresor" }), 5)).toContain("Les étiquettes à cacher");
    expect(htmlPlanClasse(reglagesPlanSurs({ ...REGLAGES_PLAN_CLASSE, feuille: "etiquettes", prenoms: ["Lina"] }), 5)).toContain(">Lina<");
  });
});

describe("les frises et les calendriers", () => {
  it("s'impriment toutes, complétées ou à compléter", () => {
    for (const m of MODELES_FRISE) {
      for (const aCompleter of [true, false]) {
        const html = htmlFrise({ ...REGLAGES_FRISE, modele: m.id, aCompleter });
        expect(html, `${m.id} ${aCompleter}`).toContain('<div class="feuille fr">');
      }
    }
    // À compléter : les étiquettes à découper suivent.
    expect(htmlFrise({ ...REGLAGES_FRISE, modele: "semaine", aCompleter: true })).toContain("Les étiquettes à découper");
    expect(htmlFrise({ ...REGLAGES_FRISE, modele: "semaine", aCompleter: false })).not.toContain("Les étiquettes à découper");
  });

  it("commencent le mois au bon jour de la semaine", () => {
    // Le 1er septembre 2026 est un mardi : une case vide, le lundi, avant le 1.
    const html = htmlFrise({ ...REGLAGES_FRISE, modele: "calendrier", mois: 8, annee: 2026, aCompleter: false });
    expect(html).toContain("<tr><td></td><td><span>1</span></td>");
    expect(html).toContain("Septembre 2026");
  });

  it("placent les figures sous leur période", () => {
    expect(figuresDesPeriodes(FIGURES_PAR_DEFAUT)[0]).toEqual({ periode: "Préhistoire", figure: "Ötzi (vers 3200 av. J.-C.)" });
    const html = htmlFrise({ ...REGLAGES_FRISE, modele: "periodes", aCompleter: false });
    expect(html).toContain("Jeanne d&#39;Arc");
    expect(html).toContain("Moyen Âge");
  });
});

describe("lire un paysage", () => {
  it("donne à chaque famille ses éléments et ses noms de paysage", () => {
    for (const famille of Object.keys(FAMILLES_PAYSAGE) as FamillePaysage[]) {
      const html = htmlPaysage({ ...REGLAGES_PAYSAGE, famille });
      for (const t of FAMILLES_PAYSAGE[famille].types) expect(html, famille).toContain(t.replace(/'/g, "&#39;"));
    }
    expect(htmlPaysage({ ...REGLAGES_PAYSAGE, croquis: false })).not.toContain("Mon croquis");
  });
});
