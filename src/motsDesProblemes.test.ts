import { describe, it, expect } from "vitest";
import { DEBUT_OBJECTIF_SEANCE, DEMARCHES, demarcheDe } from "./demarches";
import { DUREES } from "./api";
import { planDesFeuilles, type ClasseC2 } from "./feuillesDesSequences";
import { REGLAGES_PROBLEME, TYPES, maxParDefaut, problemesDeLaPeriode, reglagesSurs } from "./problemeDuJour";
import { DEMARCHE_PROBLEME, planDuProblemeDuJour } from "./sequenceProblemeDuJour";
import { hasard } from "./hasard";
import {
  DEMARCHES_A_PROBLEMES, MATERIEL_DES_MOTS, SEANCE_DES_MOTS, SEANCE_DES_MOTS_MATERNELLE, avecLaSeanceDesMots, avecLesMotsDesProblemes, enoncesDuHtml,
  estLaSeanceDesMots, htmlMotsDesProblemes, motsDeLEnonce, motsDesEnonces, noteDesMots,
} from "./motsDesProblemes";

const CLASSES: ClasseC2[] = ["CP", "CE1", "CE2"];

/** Ce qui, dans un énoncé, n'est pas un mot à apprendre : les mots outils, les nombres, et quelques mots qu'on laisse à la lecture. */
const OUTILS = new Set(`de a y dans le la a-t-il et des un en sont à que les au lui sur avec ont-ils avait ont fait une elle du grand bord est pour
  son deux autour font ils va-t-il on avait-il sous vers se a-t-elle celle aux peuvent leur tout c sa est-il tous doit petite ses peut-on est-elle
  calcul chez puis encore être prêt cours faire toutes passé peut-elle trois est-ce qui plus longtemps ou sept peut-il ce huit vingt six quatre
  cher possible il sans ai quelques-unes quelques-uns grande doit-elle avoir aura aura-t-il auront pourront`.split(/\s+/));

/** Les énoncés du problème du jour de maternelle : chaque sorte de problème, à chaque âge, dans chacune de ses situations. */
function enoncesDuProblemeDuJour(): string[] {
  const enonces: string[] = [];
  for (const t of TYPES) for (const niveau of t.niveaux) for (const situation of t.situations.filter((s) => s !== "perso")) for (let g = 1; g <= 4; g++) {
    const r = reglagesSurs({ ...REGLAGES_PROBLEME, niveau, type: t.id, situation, max: maxParDefaut(niveau, t.id) });
    for (const semaine of problemesDeLaPeriode(r, hasard(g * 7919))) for (const p of semaine) enonces.push(p.enonce);
  }
  return enonces;
}

/** Les mots d'un énoncé que le dictionnaire ne connaît pas, prénoms et mots outils mis à part. */
function inconnusDe(enonce: string): string[] {
  const prenoms = new Set([...enonce.matchAll(/\p{Lu}\p{Ll}+/gu)].map((m) => m[0].toLowerCase()));
  return motsDeLEnonce(enonce).inconnus.filter((m) => !OUTILS.has(m) && !prenoms.has(m));
}

describe("les mots des problèmes", () => {
  it("relèvent chaque mot que les énoncés de l'application emploient : le dictionnaire n'en oublie aucun", () => {
    const oublies = new Map<string, string>();
    for (const id of DEMARCHES_A_PROBLEMES) for (const classe of CLASSES) {
      for (const f of planDesFeuilles(id, { classe, periode: 3 })?.feuilles ?? []) for (let g = 1; g <= 8; g++) {
        for (const e of enoncesDuHtml(f.fabriquer(g * 7919).html)) for (const m of inconnusDe(e)) if (!oublies.has(m)) oublies.set(m, e);
      }
    }
    for (const e of enoncesDuProblemeDuJour()) for (const m of inconnusDe(e)) if (!oublies.has(m)) oublies.set(m, e);
    expect([...oublies.entries()].map(([m, e]) => `${m} — « ${e} »`)).toEqual([]);
  }, 60_000);

  it("ouvrent toute séquence qui pose des problèmes, et seulement celles-là", () => {
    for (const d of DEMARCHES) {
      const pose = CLASSES.some((classe) => (planDesFeuilles(d.id, { classe, periode: 3 })?.feuilles ?? [])
        .some((f) => enoncesDuHtml(f.fabriquer(12345).html).length >= 3))
        // Le problème du jour fait ses feuilles lui-même, pour la maternelle.
        || (d.id === DEMARCHE_PROBLEME && planDuProblemeDuJour(reglagesSurs(REGLAGES_PROBLEME), {}).feuilles
          .some((f) => enoncesDuHtml(f.fabriquer(12345).html).length >= 3));
      // La démarche générale des problèmes n'a pas de feuilles : elle en pose quand même.
      expect(DEMARCHES_A_PROBLEMES.has(d.id), d.id).toBe(pose || d.id === "problemes");
    }
    for (const id of DEMARCHES_A_PROBLEMES) expect(demarcheDe(id), id).toBeDefined();
  }, 60_000);

  it("rangent les mots : les personnes et les choses, ce qui se passe, la question ; les plus fréquents d'abord", () => {
    const m = motsDesEnonces([
      "Zoé a 56 cerises dans son panier. Elle enlève 14 cerises. Combien de cerises reste-t-il dans le panier ?",
      "Il y a 43 cerises dans un panier. Zoé enlève 21 cerises. Combien de cerises y a-t-il dans le panier maintenant ?",
      "Dans le bus, il y a 12 personnes. 5 personnes descendent. Combien de personnes y a-t-il maintenant ?",
      "Au bord du fleuve, il y a 342 oiseaux migrateurs : des hirondelles et des cigognes. Les autres sont des pièces d'or.",
    ]);
    expect(m.choses.map((x) => x.mot)).toEqual(["la cerise", "le panier", "le bus", "la personne", "l'oiseau migrateur", "la pièce d'or", "le fleuve",
      "l'hirondelle", "la cigogne"]);
    expect(m.choses[0]).toEqual({ mot: "la cerise", picto: "cerise", fois: 2 });
    expect(m.actions.map((x) => x.mot)).toEqual(["enlever", "descendre"]);
    expect(m.question.map((x) => x.mot)).toEqual(["combien", "maintenant", "il reste", "les autres"]);
    // « pièces d'or » est une expression : « la pièce » n'y est pas relevée en plus.
    expect(m.choses.some((x) => x.mot === "la pièce")).toBe(false);
  });

  it("ne prennent dans une feuille que les énoncés des problèmes", () => {
    expect(enoncesDuHtml('<div class="pb-enonce">Il y a <b>3</b>&nbsp;billes.</div><p class="he-enonce"><b>1.</b> Le train part.</p>'
      + '<div class="cx-enonce">Une question de lecture.</div>')).toEqual(["Il y a 3 billes.", "1. Le train part."]);
  });
});

describe("la séance des mots", () => {
  it("ouvre la séquence, et chaque feuille passe à la séance suivante", () => {
    const d = demarcheDe("parties-tout-cp")!;
    const plan = planDesFeuilles(d.id, { classe: "CP", periode: 3 })!;
    const r = avecLesMotsDesProblemes(d, plan);
    expect(r.demarche!.seances[0]).toBe(SEANCE_DES_MOTS);
    expect(r.demarche!.seances.slice(1)).toEqual(d.seances);
    expect(r.plan!.feuilles.map((f) => f.seance)).toEqual(plan.feuilles.map((f) => f.seance + 1));
    expect(r.plan!.materiel).toEqual([MATERIEL_DES_MOTS, ...plan.materiel]);
    // Une seule fois ; et rien ne change pour une séquence sans problèmes.
    expect(avecLesMotsDesProblemes(r.demarche, r.plan)).toEqual(r);
    const vocabulaire = demarcheDe("vocabulaire")!;
    expect(avecLaSeanceDesMots(vocabulaire)).toBe(vocabulaire);
    expect(avecLaSeanceDesMots(demarcheDe("problemes")!).seances[0]).toBe(SEANCE_DES_MOTS);
    // En maternelle, la séance des mots se fait avec les objets, plus courte ; elle aussi ne vient qu'une fois.
    const duJour = avecLaSeanceDesMots(demarcheDe(DEMARCHE_PROBLEME)!);
    expect(duJour.seances[0]).toBe(SEANCE_DES_MOTS_MATERNELLE);
    expect(estLaSeanceDesMots(duJour.seances[0])).toBe(true);
    expect(avecLaSeanceDesMots(duJour)).toBe(duJour);
  });

  it("se dit à l'élève à la première personne, dans son séquentiel", async () => {
    const { etapesDesPhases } = await import("./aidesALaTache");
    expect(etapesDesPhases(SEANCE_DES_MOTS.phases.map((p) => p.phase)))
      .toEqual(["Je découvre les mots.", "Je joue ce qui se passe.", "J'apprends les mots de la question.", "Je trie les étiquettes."]);
  });

  it("suit les règles des séances des démarches", () => {
    for (const s of [SEANCE_DES_MOTS, SEANCE_DES_MOTS_MATERNELLE]) {
      expect(s.objectifs.startsWith(`${DEBUT_OBJECTIF_SEANCE} `)).toBe(true);
      expect(DUREES).toContain(s.duree);
      expect(s.phases.length).toBeLessThanOrEqual(6);
      expect(s.phases.reduce((t, p) => t + parseInt(p.duree, 10), 0)).toBeLessThanOrEqual(s.duree);
    }
  });

  it("dit ses mots dans le matériel, et les montre sur une feuille : l'image quand on en a une, le mot toujours", () => {
    const m = motsDesEnonces(["Zoé a 5 cerises dans son panier. Elle enlève 2 cerises. Combien de cerises reste-t-il ?"]);
    expect(noteDesMots(m)).toBe("Les personnes et les choses : la cerise, le panier.\nCe qui se passe : enlever.\nLes mots de la question : combien, il reste.");
    const html = htmlMotsDesProblemes(m, (x) => (x.picto === "cerise" ? 2479 : null), { 2479: "data:image/png;base64,AAAA" });
    expect(html).toContain('<div class="mp-carte"><img src="data:image/png;base64,AAAA" alt=""><div class="mp-mot">la cerise</div></div>');
    expect(html).toContain('<div class="mp-carte"><div class="mp-mot">le panier</div></div>');
    expect(html).toContain("Ce qui se passe");
    expect(html).toContain("ARASAAC");
    // Sans image du tout, pas de mention des banques.
    expect(htmlMotsDesProblemes(m, () => null, {})).not.toContain("ARASAAC");
  });
});
