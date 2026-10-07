import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { demarcheDe, demarcheSuggeree } from "./demarches";
import { DEMARCHES_FRANCAIS } from "./demarchesFrancais";
import { CORPUS_DES_LIVRETS, etapeDeLaSequence, estUneDemarcheDeFrancais, planDuFrancais } from "./feuillesDuFrancais";
import { planDesFeuilles, type ClasseC2 } from "./feuillesDesSequences";
import { etapeDe } from "./progressionCgp";
import { programmationProposee } from "./programmation";

const REF = "Cycle 2 — CP, CE1, CE2 (programmes 2026)";
const cible = (niveau: string, sousDomaineTitre: string, competenceGeneraleTitre: string, competenceTitre: string) => ({
  domaineTitre: "Français", sousDomaineTitre, competenceGeneraleTitre, competenceTitre, niveau,
});
const IDENTIFIER = "Identifier les mots de manière de plus en plus aisée";
const VOIX_HAUTE = "Lire à voix haute";

/** Un faux stockage, le temps d'un test : les réglages laissés dans les ateliers. */
function stockage(valeurs: Record<string, unknown>) {
  const m = new Map(Object.entries(valeurs).map(([k, v]) => [k, JSON.stringify(v)]));
  (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => m.set(k, v) };
}

describe("le français du cycle 2, d'après les livrets", () => {
  afterEach(() => { delete (globalThis as { localStorage?: unknown }).localStorage; });

  it("prend la séquence du livret de la classe, et la démarche du guide sinon", () => {
    const cas: [string, string, string, string, string][] = [
      ["CP", "Lecture", IDENTIFIER, "Décoder et encoder 12 à 15 correspondances grapho-phonémiques (CGP) régulières, fréquentes et aisément prononçables. (en fin de période 1)", "cgp-deux-jours-cp"],
      ["CP", "Lecture", IDENTIFIER, "Mémoriser les mots fréquents et réguliers. (en milieu d’année)", "cgp-deux-jours-cp"],
      ["CP", "Lecture", IDENTIFIER, "Déchiffrer entre 15 et 30 mots par minute. (en milieu d’année)", "precision-vitesse-cp"],
      ["CP", "Lecture", VOIX_HAUTE, "Oraliser les syllabes déchiffrées et encodées, puis les mots. (dès le début de l’année)", "cgp-deux-jours-cp"],
      ["CP", "Lecture", VOIX_HAUTE, "S’entrainer à lire des textes déchiffrables de manière à automatiser sa lecture. (en cours d’année)", "precision-vitesse-cp"],
      ["CP", "Lecture", VOIX_HAUTE, "Amorcer une lecture expressive. (en fin d’année)", "prosodie-cp"],
      ["CE1", "Lecture", IDENTIFIER, "Automatiser le décodage des correspondances graphophonémiques (CGP) apprises au CP. (tout au long de l’année)", "precision-vitesse-ce1"],
      ["CE1", "Lecture", VOIX_HAUTE, "Lire de manière expressive. (en fin d’année)", "prosodie-ce1"],
      ["CE2", "Lecture", IDENTIFIER, "Automatiser la lecture des mots.", "precision-vitesse-ce1"],
      ["CE2", "Lecture", VOIX_HAUTE, "Manifester sa compréhension par une lecture expressive qui respecte la structure du texte, de la phrase et le sens.", "lecture-expressive-ce2"],
      ["CP", "Écriture", "Encoder puis écrire sous dictée", "Écrire sous la dictée des mots et des phrases. (en fin d’année)", "cgp-deux-jours-cp"],
      ["CP", "Écriture", "Apprendre à écrire en écriture cursive", "Apprendre à écrire en écriture cursive tous les graphèmes étudiés selon la progression en décodage.", "ecriture-cursive"],
      ["CE1", "Écriture", "Apprendre à écrire en écriture cursive", "Apprendre le tracé normé des lettres majuscules cursives par familles de gestes. (à partir de la période 2)", "ecriture-cursive"],
      ["CE1", "Écriture", "Copier et acquérir des stratégies de copie", "Acquérir des stratégies de copie et en mesurer l’efficacité.", "strategies-de-copie"],
      ["CP", "Vocabulaire", "Établir des relations entre les mots", "Savoir proposer et justifier une catégorisation du corpus de mots étudié.", "vocabulaire-cp"],
      ["CE1", "Vocabulaire", "Enrichir son vocabulaire dans toutes les disciplines", "S’appuyer sur la morphologie des mots pour en trouver le sens.", "vocabulaire-ce1"],
      ["CE2", "Vocabulaire", "Réemployer le vocabulaire étudié", "Automatiser la restitution des mots d’un corpus étudié (fluence verbale).", "vocabulaire-ce2"],
      // Sans séquence de livret : les démarches des guides.
      ["CP", "Vocabulaire", "Mémoriser l’orthographe des mots", "Identifier et nommer les accents.", "vocabulaire"],
      ["CE1", "Lecture", "Comprendre un texte", "Justifier ses réponses par un retour au texte.", "comprehension"],
      ["CE2", "Grammaire et orthographe", "Se repérer dans la phrase simple", "Reconnaitre et produire les trois types de phrases : déclarative, interrogative et impérative.", "grammaire"],
      ["CE1", "Oral", "Participer à des échanges", "Respecter le propos au cours des échanges au sein d’un groupe.", "oral"],
    ];
    for (const [niveau, sd, cg, titre, attendue] of cas) expect(demarcheSuggeree(cible(niveau, sd, cg, titre), REF).id, `${niveau} — ${titre}`).toBe(attendue);
  });

  it("donnent leurs feuilles et la note de matériel de chaque séance", () => {
    for (const d of DEMARCHES_FRANCAIS) {
      if (!estUneDemarcheDeFrancais(d.id)) continue;
      const classe: ClasseC2 = /ce2/.test(d.id) ? "CE2" : /ce1/.test(d.id) ? "CE1" : "CP";
      const plan = planDesFeuilles(d.id, { classe, periode: 2 })!;
      expect(plan.materiel, d.id).toHaveLength(d.seances.length);
      for (const f of plan.feuilles) {
        expect(f.seance, `${d.id} · ${f.titre}`).toBeLessThan(d.seances.length);
        const { html, style } = f.fabriquer(4);
        expect(html, `${d.id} · ${f.titre}`).toMatch(/^<div class="feuille/);
        expect(style, `${d.id} · ${f.titre}`).toContain(".feuille");
      }
    }
    // La prosodie et la fable : les feuilles de l'atelier « Lire à voix haute » (voir lectureVoixHaute.test.ts).
    for (const id of ["prosodie-cp", "prosodie-ce1", "lecture-expressive-ce2"]) {
      expect(demarcheDe(id), id).toBeDefined();
      expect(planDesFeuilles(id, { classe: "CP", periode: 2 })!.feuilles.every((f) => f.atelier === "voixHaute"), id).toBe(true);
    }
  });

  it("lisent le graphème de la période, ou celui qu'on a choisi dans l'atelier quand il est de la classe", () => {
    expect(etapeDe(etapeDeLaSequence("CP", 1)).periode).toBe(1);
    expect(etapeDe(etapeDeLaSequence("CP", 3)).periode).toBe(3);
    expect(etapeDe(etapeDeLaSequence("CE1", 2)).periode).toBe("ce1");
    expect(etapeDe(etapeDeLaSequence("CE2", 4)).periode).toBe("ce1");
    stockage({ "fabriquer:fluence": { son: "p2-ch" } });
    expect(etapeDeLaSequence("CP", 4)).toBe("p2-ch");
    // Un graphème du CP ne fait pas la grille d'un CE1.
    expect(etapeDe(etapeDeLaSequence("CE1", 1)).periode).toBe("ce1");
    const grille = planDuFrancais("precision-vitesse-cp", { classe: "CP", periode: 4 })!.feuilles[0];
    expect(grille.titre).toContain("ch");
    // Au CP, le plateau des quatre jetons alignés accompagne la grille.
    expect(grille.fabriquer(1).html).toContain("Quatre jetons alignés");
  });

  it("donnent à catégoriser le corpus du livret, et la corolle de son thème", () => {
    for (const [classe, attendu] of [["CP", "une accélération"], ["CE1", "pot-au-feu"], ["CE2", "badigeonner"]] as const) {
      const id = `vocabulaire-${classe.toLowerCase()}`;
      const f = planDuFrancais(id, { classe, periode: 1 })!.feuilles[0];
      const html = f.fabriquer(1).html;
      expect(html, id).toContain(attendu);
      expect(html, id).toContain(CORPUS_DES_LIVRETS[classe].theme);
      // La séance de catégorisation la reçoit.
      expect(demarcheDe(id)!.seances[f.seance].titre, id).toMatch(/^Catégoriser/);
    }
    expect(CORPUS_DES_LIVRETS.CP.mots).toHaveLength(15);
  });

  it("proposent la période du livret, ou celle que la compétence écrit", () => {
    const p = (niveau: string, titre: string, id: string) => programmationProposee({ niveau, competenceTitre: titre }, id)!;
    const cgp = p("CP", "Décoder et encoder 12 à 15 correspondances grapho-phonémiques (CGP) régulières, fréquentes et aisément prononçables. (en fin de période 1)", "cgp-deux-jours-cp");
    expect([cgp.periode, cgp.raison]).toEqual([1, "Programme de français du cycle 2 (2024), CP : « en fin de période 1 »"]);
    expect(p("CP", "Décoder et encoder de 25 à 30 CGP. (en milieu d’année)", "cgp-deux-jours-cp").periode).toBe(3);
    expect(p("CP", "Écrire des mots dictés avec des lettres muettes apprises (mettre en relation des morphogrammes lexicaux et grammaticaux). (dès la fin de la 2e période)", "cgp-deux-jours-cp").periode).toBe(2);
    // La routine du livret l'emporte : la prosodie à partir de la période 2.
    const prosodie = p("CP", "Amorcer une lecture expressive. (en fin d’année)", "prosodie-cp");
    expect(prosodie.periode).toBe(2);
    expect(prosodie.raison).toMatch(/^Livret d'accompagnement de français du CP/);
    // La copie au CE1 : le repère du livret est celui du CP ; la compétence dit le sien.
    expect(p("CE1", "Copier quatre à cinq phrases courtes. (à l’issue de la période 1)", "strategies-de-copie").periode).toBe(1);
    expect(p("CE1", "Copier cinq ou six lignes sans erreur. (à partir de la période 3)", "strategies-de-copie").periode).toBe(3);
    expect(p("CE1", "Automatiser le décodage des correspondances graphophonémiques (CGP) apprises au CP. (tout au long de l’année)", "precision-vitesse-ce1").periode).toBe(1);
    // Rien ne fixe la période : le niveau seul.
    expect(p("CE2", "Lire un texte adapté à son niveau de lecture avec une vitesse de 90 mots par minute.", "lecture-expressive-ce2").periode).toBeNull();
  });
});

describe("la cursive et la copie", () => {
  afterEach(() => { delete (globalThis as { localStorage?: unknown }).localStorage; });

  it("écrivent la lettre de la période, sur la réglure de la classe", () => {
    const plan = planDuFrancais("ecriture-cursive", { classe: "CP", periode: 1 })!;
    expect(plan.feuilles.map((f) => f.seance)).toEqual([0, 1, 2]);
    const lettre = plan.feuilles[0].fabriquer(1).html;
    expect(lettre).toContain("réglure de 3 mm");
    expect(lettre).toContain("<text");
    // En fin de CP, la réglure se resserre ; au CE1, 2 mm.
    expect(planDuFrancais("ecriture-cursive", { classe: "CP", periode: 5 })!.feuilles[0].fabriquer(1).html).toContain("réglure de 2 mm");
    expect(planDuFrancais("ecriture-cursive", { classe: "CP", periode: 3 })!.feuilles[0].fabriquer(1).html).toContain("réglure de 2,5 mm");
    // La transcription : le modèle en script, à écrire en cursive.
    expect(plan.feuilles[2].fabriquer(1).html).toContain("cu-script");
  });

  it("font copier la phrase du livret, puis celles de l'atelier « Phrases en désordre »", () => {
    stockage({ "fabriquer:phrases": { phrases: "Le loup court.\nLa lune brille.\nIl pleut." } });
    const plan = planDuFrancais("strategies-de-copie", { classe: "CE1", periode: 2 })!;
    expect(plan.feuilles[0].fabriquer(1).html).toContain("Il lit un petit livre.");
    expect(plan.feuilles[1].fabriquer(1).html).toContain("Le loup court.");
    expect(plan.feuilles[2].fabriquer(1).html).toContain("La lune brille.");
    expect(plan.feuilles[2].fabriquer(1).html).toContain("Il pleut.");
  });
});

describe("les démarches de français", () => {
  beforeEach(() => { delete (globalThis as { localStorage?: unknown }).localStorage; });

  it("citent leur livret", () => {
    for (const d of DEMARCHES_FRANCAIS) expect(d.source, d.id).toMatch(/^Éduscol, livret d'accompagnement du programme de français du (CP|CE1|CE2) \((2025|2026)\)/);
  });
});
