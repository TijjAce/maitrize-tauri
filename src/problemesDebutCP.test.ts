import { describe, expect, it } from "vitest";
import { demarcheDe, demarchesPour } from "./demarches";
import { demarcheDuLivretDeProblemes } from "./demarchesProblemes";
import { planDesFeuilles } from "./feuillesDesSequences";
import { avecLaSeanceDesMots, enoncesDuHtml, estLaSeanceDesMots } from "./motsDesProblemes";
import { PRESENTATION_COMPLETE, blocCorrige, blocProbleme, valeurDePresentation, type Probleme } from "./problemesBarres";
import { PROBLEMES_A_DIRE, problemesDuDebutDuCP } from "./problemesDebutCP";
import { periodeDeLaDemarche, repereDeLaDemarche, sequencesToutesFaites } from "./sequencesToutesFaites";

const plan = (id: string, periode = 1) => planDesFeuilles(id, { classe: "CP", periode })!;
const html = (id: string, seance: number, periode = 1, graine = 1) =>
  plan(id, periode).feuilles.filter((f) => f.seance === seance).map((f) => f.fabriquer(graine).html).join("");
const parties = (p: Probleme) => (p.schema.forme === "parties" ? p.schema.parties.map((c) => c.valeur) : []);
const tout = (p: Probleme) => (p.schema.forme === "parties" ? p.schema.tout.valeur : 0);

describe("la séquence du début du CP : chercher le tout (« la séquence qui manque »)", () => {
  const d = demarcheDe("chercher-le-tout-cp")!;

  it("existe, en mathématiques, avec ses treize séances et une feuille pour chacune", () => {
    expect(d.nom).toBe("Problèmes parties-tout : chercher le tout (CP)");
    expect(d.seances).toHaveLength(13);
    const p = plan(d.id);
    expect(p.materiel).toHaveLength(13);
    expect(new Set(p.feuilles.map((f) => f.seance)).size).toBe(13);
    for (const f of p.feuilles) for (const g of [1, 2, 3]) {
      const h = f.fabriquer(g).html;
      expect(h, f.titre).toMatch(/^<div class="pb-feuille/);
      expect(h, f.titre).not.toMatch(/NaN|undefined|−\d+ (jetons|billes|élèves)/);
    }
  });

  it("suit le guide : la boîte, les billes de Léo, puis la cour de récréation ; les écritures viennent après la résolution", () => {
    expect(d.seances.map((s) => s.titre).slice(0, 4)).toEqual([
      "La boîte (1) : on ajoute", "La boîte (2) : moins d'outils, puis plus rien", "Entraînement court (1) : la boîte, de tête", "Les billes de Léo : réunir deux collections",
    ]);
    expect(html(d.id, 3)).toContain("Léo a 7 billes rouges et 5 billes bleues. Combien Léo a-t-il de billes en tout ?");
    expect(html(d.id, 3)).toContain("7 + 5 = 12");
    expect(html(d.id, 8)).toContain("Il y a 9 élèves en récréation. 4 élèves jouent sous le préau. Les autres élèves jouent dans la cour.");
    expect(html(d.id, 8)).toContain("9 − 4 = 5");
    // Le professeur propose l'écriture ; le schéma en barres ne s'impose pas.
    expect(d.seances[0].phases.map((p) => p.description).join(" ")).toMatch(/il le propose, il ne l'exige pas/);
    expect(d.seances[3].phases.map((p) => p.posture).join(" ")).toMatch(/ne s'impose pas au CP/);
  });

  it("des nombres du début d'année : la boîte jusqu'à dix, des parties sous dix, jusqu'à vingt en période 2", () => {
    for (const g of [1, 2, 3, 4, 5]) {
      const boite = problemesDuDebutDuCP(["boite"], ["final-ajout"], 4, { partieMax: 6, toutMax: 10 }, g);
      for (const p of boite) expect(tout(p)).toBeLessThanOrEqual(10);
      const meles = problemesDuDebutDuCP(["boite", "billes", "fruits", "autobus", "cour", "stade"], ["tout", "reste", "partie", "final-ajout"], 6, { partieMax: 9, toutMax: 18 }, g);
      expect(meles).toHaveLength(6);
      for (const p of meles) {
        for (const v of parties(p)) expect(v).toBeLessThan(10);
        expect(tout(p)).toBeLessThanOrEqual(18);
        expect(p.reponse).toBeGreaterThan(0);
      }
    }
  });

  it("ce qu'on cherche seul laisse une place pour dessiner, sans ligne « Calcul » ; ce qu'on dit n'a que l'énoncé", () => {
    const seul = html(d.id, 0);
    expect(seul).toContain('<div class="pb-cadre"></div>');
    // Pas de ligne « Calcul » à remplir ; le corrigé, pour le professeur, donne le calcul.
    expect(seul).not.toMatch(/<div>Calcul : <span class="pb-ligne">/);
    expect(seul).toMatch(/<div>Réponse : <span class="pb-ligne">/);
    const aDire = html(d.id, 2);
    expect(aDire).not.toContain("pb-cadre");
    // Le corrigé garde le schéma, pour le professeur.
    expect(aDire).toContain("<svg");
  });

  it("vient en période 1, d'après le guide, et la compétence parties-tout du CP la propose en périodes 1 et 2", () => {
    const repere = repereDeLaDemarche(d.id, "CP");
    expect(repere?.periode).toBe(1);
    expect(repere?.raison).toMatch(/Problèmes de parties-tout avec recherche du tout \(nombres inférieurs à 10 pour chacune des parties\)/);
    const comp = "resoudre des problemes additifs en une etape du type parties-tout.";
    expect([1, 2, 3, 4].map((p) => demarcheDuLivretDeProblemes("cp", comp, p))).toEqual(["chercher-le-tout-cp", "chercher-le-tout-cp", "parties-tout-cp", "parties-tout-cp"]);
    expect(demarcheDuLivretDeProblemes("cp", comp)).toBe("parties-tout-cp");
  });

  it("s'ouvre sur la séance des mots, et se range dans le dossier du CP, en période 1", () => {
    expect(estLaSeanceDesMots(avecLaSeanceDesMots(d).seances[0])).toBe(true);
    const s = sequencesToutesFaites().filter((x) => x.demarche.id === d.id);
    expect(s.map((x) => `${x.classe} ${x.domaine.nom}`)).toEqual(["CP Les problèmes"]);
    expect(periodeDeLaDemarche(d.id, "CP")).toBe(1);
  });
});

describe("le rituel des problèmes à dire (« dix problèmes par semaine »)", () => {
  const d = demarcheDe("problemes-a-dire-cp")!;

  it("huit séances de dix minutes, une feuille par semaine de douze problèmes, à dire", () => {
    expect(d.seances).toHaveLength(8);
    expect(d.seances.every((s) => s.duree === 10)).toBe(true);
    const p = plan(d.id);
    expect(p.feuilles.map((f) => [f.seance, f.titre])).toEqual([[0, "Problèmes à dire — semaine 1, période 1"], [4, "Problèmes à dire — semaine 2, période 1"]]);
    expect(p.materiel).toHaveLength(8);
    const h = html(d.id, 0);
    expect(h.match(/class="pb-enonce"/g)).toHaveLength(12);
    expect(h).not.toContain("pb-cadre");
  });

  it("ses problèmes suivent le guide, période par période", () => {
    const sortes = (periode: number) => new Set(problemesDuDebutDuCP(["boite", "billes", "fruits", "autobus", "cour", "stade"],
      PROBLEMES_A_DIRE[periode].structures, 24, PROBLEMES_A_DIRE[periode].nombres, 3).map((p) => p.enonce.replace(/\d+/g, "#")));
    // Période 1 : le tout et la quantité finale ; pas encore de partie cherchée.
    expect(PROBLEMES_A_DIRE[1].structures).not.toContain("partie");
    expect(PROBLEMES_A_DIRE[2].structures).toContain("partie");
    expect(PROBLEMES_A_DIRE[3].structures).toEqual(expect.arrayContaining(["ajoute", "retire"]));
    expect(PROBLEMES_A_DIRE[3].structures).not.toContain("depart-ajout");
    expect(PROBLEMES_A_DIRE[4].structures).toEqual(expect.arrayContaining(["depart-ajout", "depart-retrait"]));
    expect(sortes(1).size).toBeGreaterThan(5);
    // Les nombres de la période dans les feuilles.
    for (const periode of [1, 2, 3, 4, 5]) {
      const { nombres } = PROBLEMES_A_DIRE[periode];
      const enonces = enoncesDuHtml(plan(d.id, periode).feuilles[0].fabriquer(7).html);
      const vus = enonces.flatMap((e) => [...e.matchAll(/\d+/g)].map((m) => Number(m[0])));
      expect(Math.max(...vus), `période ${periode}`).toBeLessThanOrEqual(nombres.toutMax);
    }
  });

  it("se propose à côté de la séquence de la compétence parties-tout du CP, et vient dès la période 1", () => {
    const cible = { competenceTitre: "Résoudre des problèmes additifs en une étape du type parties-tout.", niveau: "CP",
      domaineTitre: "Mathématiques", sousDomaineTitre: "La résolution de problèmes", competenceGeneraleTitre: null };
    expect(demarchesPour(cible, "", 1).map((x) => x.id)).toEqual(expect.arrayContaining(["chercher-le-tout-cp", "problemes-a-dire-cp"]));
    expect(repereDeLaDemarche(d.id, "CP")?.raison).toMatch(/doit débuter dès le début de l'année de CP/);
  });
});

describe("l'énoncé seul, dans l'atelier des problèmes", () => {
  it("« Rien : l'énoncé seul » : ni schéma ni place pour dessiner ; le corrigé garde le schéma", () => {
    const [p] = problemesDuDebutDuCP(["boite"], ["final-ajout"], 1, { partieMax: 6, toutMax: 10 }, 1);
    const pres = { ...PRESENTATION_COMPLETE, schema: "aucun" as const };
    expect(blocProbleme(p, 0, pres)).not.toMatch(/<svg|pb-cadre|pb-schema/);
    expect(blocCorrige(p, 0, pres)).toContain("<svg");
    expect(valeurDePresentation("schema", "aucun")).toBe("aucun");
    expect(valeurDePresentation("schema", "Rien : l'énoncé seul, à dire ou à projeter")).toBe("aucun");
  });
});
