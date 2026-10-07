import { describe, it, expect } from "vitest";
import { demarcheDe, demarcheSuggeree } from "./demarches";
import { DEMARCHES_LECTURE } from "./demarchesLecture";
import { planDesFeuilles, type ClasseC2 } from "./feuillesDesSequences";
import { EXERCICES_LECTEUR, REGLAGES_LECTEUR, htmlLecteur, titreEtAuteur, type Classe } from "./carnetDeLecteur";

const REF = "Cycle 2 — CP, CE1, CE2 (programmes 2026)";
const C = "Comprendre un texte", D = "Devenir lecteur";
const cible = (niveau: string, cg: string, competenceTitre: string) => ({
  domaineTitre: "Français", sousDomaineTitre: "Lecture", competenceGeneraleTitre: cg, competenceTitre, niveau,
});

/** Toutes les compétences « Comprendre un texte » et « Devenir lecteur » du référentiel, et leur séquence. */
const COMPETENCES: [string, string, string, string][] = [
  ["CP", C, "Dégager le sens global d’un texte entendu ou lu de façon autonome.", "comprendre-cp"],
  ["CP", C, "Identifier les mots inconnus dans un texte et chercher à leur donner un sens.", "mots-inconnus-c2"],
  ["CP", C, "Se repérer dans la chaine anaphorique (qui relie un nom à sa ou ses reprise(s) pronominale(s) ou à d’autres noms de sens équivalent).", "reprises-c2"],
  ["CP", C, "Comprendre ce qui est implicite (inférences simples).", "inferences-c2"],
  ["CP", C, "Justifier ses réponses par un retour au texte.", "comprendre-cp"],
  ["CP", C, "Lire et comprendre en autonomie un texte narratif, informatif ou prescriptif d’une dizaine de lignes.", "comprendre-cp"],
  ["CE1", C, "Dégager le sens global d’un texte lu, de façon autonome, à la suite d’une séance dédiée à la compréhension.", "comprendre-ce1"],
  ["CE1", C, "Développer des stratégies pour élucider le sens des mots et des expressions inconnus.", "mots-inconnus-c2"],
  ["CE1", C, "Se repérer dans la chaine anaphorique (qui relie un nom à sa ou ses reprise(s) pronominale(s) ou à d’autres noms de sens équivalent) et s’appuyer sur le sens du texte pour résoudre des ambigüités.", "reprises-c2"],
  ["CE1", C, "Comprendre ce qui est implicite dans le texte (inférences) dans des cas simples.", "inferences-c2"],
  ["CE1", C, "Justifier ses réponses par un retour au texte.", "comprendre-ce1"],
  ["CE1", C, "Lire et comprendre en autonomie un texte narratif, informatif ou prescriptif d’une quinzaine de lignes.", "comprendre-ce1"],
  ["CE2", C, "Lire et dégager le sens d’un texte narratif, poétique, documentaire ou théâtral, lu en autonomie ou lu par un adulte en s’appuyant sur les caractéristiques de ces textes.", "comprendre-ce2"],
  ["CE2", C, "Adopter une posture active par rapport au vocabulaire inconnu.", "mots-inconnus-c2"],
  ["CE2", C, "Se repérer dans la chaine anaphorique (qui relie un nom à sa ou ses reprise(s) pronominale(s) ou à d’autres noms de sens équivalent) et s’appuyer sur le sens du texte pour résoudre des ambigüités.", "reprises-c2"],
  ["CE2", C, "Différencier le type narratif du type informatif et prescriptif.", "types-et-genres-c2"],
  ["CE2", C, "Comprendre ce qui est implicite (inférences) en s’appuyant sur des indices explicites et sur ses propres connaissances.", "inferences-c2"],
  ["CE2", C, "Revenir au texte pour identifier et comprendre les éléments complexes.", "comprendre-ce2"],
  ["CE2", C, "Lire et comprendre en autonomie un texte narratif, informatif ou prescriptif d’une vingtaine de lignes.", "comprendre-ce2"],
  ["CP", D, "Lire 5 à 10 œuvres complètes et variées issues du patrimoine et de la littérature de jeunesse (albums, romans, contes, fables, poèmes, pièces de théâtre et documentaires).", "oeuvre-complete-c2"],
  ["CP", D, "Repérer et reconnaitre des types de personnages.", "personnages-types-c2"],
  ["CP", D, "Aller vers les livres et être capable d’en choisir à titre personnel.", "lieux-de-lecture-c2"],
  ["CP", D, "Relier ses lectures à son expérience personnelle, être en mesure d’établir des liens entre ses différentes lectures (mise en réseau).", "oeuvre-complete-c2"],
  ["CP", D, "Fréquenter régulièrement des lieux de lecture et se familiariser avec eux, rencontrer des acteurs du livre.", "lieux-de-lecture-c2"],
  ["CE1", D, "Lire 5 à 10 œuvres complètes et variées issues du patrimoine et de la littérature de jeunesse (albums, romans, contes, fables, poèmes, pièces de théâtre et documentaires).", "oeuvre-complete-c2"],
  ["CE1", D, "Se familiariser aux différents genres et types de textes.", "types-et-genres-c2"],
  ["CE1", D, "Faire preuve d’initiative dans ses lectures personnelles en empruntant des livres en fonction de ses gouts.", "lieux-de-lecture-c2"],
  ["CE1", D, "Relier ses lectures à son expérience personnelle, être en mesure d’établir des liens entre ses différentes lectures (mise en réseau).", "oeuvre-complete-c2"],
  ["CE2", D, "Lire de manière autonome 5 à 10 œuvres complètes et variées issues du patrimoine et de la littérature de jeunesse (albums, romans, contes, fables, poèmes, pièces de théâtre et documentaires).", "oeuvre-complete-c2"],
  ["CE2", D, "Relier ses lectures à son expérience personnelle, être en mesure d’établir des liens entre ses différentes lectures (mise en réseau).", "oeuvre-complete-c2"],
  ["CE2", D, "Fréquenter des lieux de lecture régulièrement et rencontrer des acteurs du livre.", "lieux-de-lecture-c2"],
];

const DUREES = [5, 10, 15, 20, 25, 30, 40, 45, 50, 55, 60, 75, 90, 105, 120, 150, 180];

describe("comprendre un texte, devenir lecteur : des séquences bâties sur le programme", () => {
  it("donnent à chaque compétence sa séquence", () => {
    for (const [niveau, cg, titre, attendue] of COMPETENCES) expect(demarcheSuggeree(cible(niveau, cg, titre), REF).id, `${niveau} — ${titre}`).toBe(attendue);
    // Chaque séquence sert au moins une compétence.
    for (const d of DEMARCHES_LECTURE) expect(COMPETENCES.some((c) => c[3] === d.id), d.id).toBe(true);
  });

  it("disent leurs sources, ont des séances bien formées et leurs feuilles à chaque classe", () => {
    for (const d of DEMARCHES_LECTURE) {
      expect(d.source, d.id).toMatch(/^Bâtie sur le programme de français du cycle 2 \(2024\)/);
      expect(d.famille).toBe("Français");
      expect(d.seances.length, d.id).toBeGreaterThanOrEqual(4);
      for (const s of d.seances) {
        expect(s.objectifs, `${d.id} · ${s.titre}`).toMatch(/^À la fin de cette séance, les élèves sauront /);
        expect(s.phases.length).toBeLessThanOrEqual(6);
        const total = s.phases.reduce((t, p) => t + parseInt(p.duree, 10), 0);
        expect(total, `${d.id} · ${s.titre}`).toBeLessThanOrEqual(s.duree);
        for (const p of s.phases) expect(DUREES, `${d.id} · ${p.duree}`).toContain(parseInt(p.duree, 10));
      }
      const classes: ClasseC2[] = d.id.endsWith("-cp") ? ["CP"] : d.id.endsWith("-ce1") ? ["CE1"] : d.id.endsWith("-ce2") ? ["CE2"] : ["CP", "CE1", "CE2"];
      for (const classe of classes) {
        const plan = planDesFeuilles(d.id, { classe, periode: 3 })!;
        expect(plan, d.id).not.toBeNull();
        expect(plan.materiel, d.id).toHaveLength(d.seances.length);
        expect(plan.feuilles.length, d.id).toBeGreaterThan(0);
        for (const f of plan.feuilles) {
          expect(f.seance, `${d.id} · ${f.titre}`).toBeLessThan(d.seances.length);
          for (const graine of [1, 2]) {
            const html = f.fabriquer(graine).html;
            expect(html, `${d.id} ${classe} · ${f.titre}`).toMatch(/^<div class="feuille (cx|cl)">/);
            expect(html, `${d.id} ${classe} · ${f.titre}`).not.toMatch(/NaN|undefined|null/);
          }
        }
      }
    }
    expect(demarcheDe("comprendre-cp")!.resume).toContain("à partir de la 3e période de CP");
    expect(demarcheDe("reprises-c2")!.resume).toContain("le lion / il / le fauve / le roi de la savane");
  });
});

describe("le carnet de lecteur", () => {
  it("imprime chaque feuille, à chaque classe", () => {
    for (const e of EXERCICES_LECTEUR) for (const classe of ["CP", "CE1", "CE2"] as Classe[]) {
      const html = htmlLecteur({ ...REGLAGES_LECTEUR, exercice: e.id, classe }, 4);
      expect(html, `${e.id} ${classe}`).toMatch(/^<div class="feuille cl">/);
      expect(html, `${e.id} ${classe}`).not.toMatch(/NaN|undefined|null/);
    }
    // Le livre de l'enseignant s'écrit sur la page ; le réseau prend ses livres, sinon celui du loup en exemple.
    expect(titreEtAuteur("Le Petit Poucet — Charles Perrault")).toEqual(["Le Petit Poucet", "Charles Perrault"]);
    expect(htmlLecteur({ ...REGLAGES_LECTEUR, exercice: "fiche", livre: "Le Petit Poucet — Charles Perrault" }, 1)).toContain("Charles Perrault");
    expect(htmlLecteur({ ...REGLAGES_LECTEUR, exercice: "reseau" }, 1)).toContain("Le loup dans les contes");
    expect(htmlLecteur({ ...REGLAGES_LECTEUR, exercice: "reseau", theme: "Les ogres", livres: "Le Petit Poucet\nLe Chat botté" }, 1)).toContain("Le Chat botté");
    // Au CP, on relie ; ensuite, on complète le tableau.
    expect(htmlLecteur({ ...REGLAGES_LECTEUR, exercice: "personnagesTypes", classe: "CP" }, 1)).toContain("cl-relier");
    expect(htmlLecteur({ ...REGLAGES_LECTEUR, exercice: "personnagesTypes", classe: "CE2" }, 1)).toContain("cl-tableau");
  });
});
