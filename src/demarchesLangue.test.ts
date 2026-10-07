import { describe, it, expect } from "vitest";
import { demarcheSuggeree } from "./demarches";
import { DEMARCHES_LANGUE, tempsDeLaPeriode } from "./demarchesLangue";
import { planDesFeuilles, type ClasseC2 } from "./feuillesDesSequences";
import { conjugaison, formes, radicalEtTerminaison, AU_PROGRAMME } from "./conjugaison";
import { EXERCICES_GRAMMAIRE, PHRASES_A_CONJUGUER, PHRASES_DEMONTEES, REGLAGES_GRAMMAIRE, htmlGrammaire, phraseAuTemps, sansMarques, verbesDeLaFeuille, type Classe } from "./grammaire";

const REF = "Cycle 2 — CP, CE1, CE2 (programmes 2026)";
const cible = (niveau: string, cg: string, competenceTitre: string) => ({ domaineTitre: "Français", sousDomaineTitre: "Grammaire et orthographe", competenceGeneraleTitre: cg, competenceTitre, niveau });

/** Les compétences de grammaire et d'orthographe grammaticale du référentiel ; conjuguer : en période 3, l'imparfait. */
const COMPETENCES: [string, string, string, string][] = [
  ["CP", "Se repérer dans la phrase simple", "S’approprier progressivement la notion de phrase simple et ses trois marqueurs essentiels : majuscule initiale, ponctuation finale forte et sens.", "phrase-cp"],
  ["CP", "Se repérer dans la phrase simple", "Comprendre que certains éléments (sujet/verbe et déterminants/noms/adjectifs) fonctionnent ensemble et constituent un système.", "phrase-cp"],
  ["CP", "Se repérer dans la phrase simple", "S’appuyer sur la ponctuation pour reconnaitre les trois types de phrases (déclarative, interrogative et impérative).", "types-formes-c2"],
  ["CP", "Se repérer dans la phrase simple", "Reconnaitre les formes négative et exclamative.", "types-formes-c2"],
  ["CP", "Se repérer dans la phrase simple", "Constituer des corpus par classe de mots : noms, verbes, déterminants, adjectifs, pronoms personnels.", "classes-de-mots-c2"],
  ["CE1", "Se repérer dans la phrase simple", "Identifier la phrase simple, en distinguer les principaux constituants et les nommer : groupe sujet (GS), verbe et compléments sans distinguer ces derniers entre eux.", "constituants-c2"],
  ["CE1", "Se repérer dans la phrase simple", "Reconnaitre et utiliser les trois types de phrases, en lien avec la ponctuation : déclarative, interrogative et impérative.", "types-formes-c2"],
  ["CE1", "Se repérer dans la phrase simple", "Reconnaitre les formes négatives et exclamatives et savoir effectuer des transformations.", "types-formes-c2"],
  ["CE1", "Se repérer dans la phrase simple", "Différencier et nommer les principales classes de mots : le déterminant, le nom commun, le nom propre, l’adjectif, le verbe, le pronom personnel sujet.", "classes-de-mots-c2"],
  ["CE2", "Se repérer dans la phrase simple", "Identifier la phrase simple et reconnaitre ses principaux constituants : le groupe sujet, le verbe et les compléments sans distinguer ces derniers entre eux.", "constituants-c2"],
  ["CE2", "Se repérer dans la phrase simple", "Reconnaitre et produire les trois types de phrases : déclarative, interrogative et impérative.", "types-formes-c2"],
  ["CE2", "Se repérer dans la phrase simple", "Reconnaitre et produire les formes négative et exclamative.", "types-formes-c2"],
  ["CE2", "Se repérer dans la phrase simple", "Différencier et nommer les principales classes de mots : le déterminant, le nom commun, le nom propre, l’adjectif, le verbe, le pronom personnel sujet et l’adverbe.", "classes-de-mots-c2"],
  ["CE2", "Se repérer dans la phrase simple", "Utiliser la ponctuation de fin de phrase (. ! ?) et reconnaitre les marques du discours rapporté (« … »).", "discours-rapporte-ce2"],
  ["CP", "Découvrir, comprendre et mettre en œuvre l’orthographe grammaticale", "Comprendre les notions de masculin et de féminin.", "genre-nombre-cp"],
  ["CP", "Découvrir, comprendre et mettre en œuvre l’orthographe grammaticale", "Comprendre les notions de singulier et de pluriel (plusieurs, plus qu’un).", "genre-nombre-cp"],
  ["CP", "Découvrir, comprendre et mettre en œuvre l’orthographe grammaticale", "Se familiariser avec la notion de « chaine d’accords » (déterminant/nom/adjectif) en repérant et en identifiant les régularités des marques de genre et de nombre.", "genre-nombre-cp"],
  ["CP", "Découvrir, comprendre et mettre en œuvre l’orthographe grammaticale", "S’initier à l’identification de la relation sujet-verbe à partir du sens et de l’observation des effets des transformations liées aux temps et aux personnes.", "sujet-verbe-c2"],
  ["CP", "Découvrir, comprendre et mettre en œuvre l’orthographe grammaticale", "Observer les différentes formes verbales fréquentes et régulières.", "sujet-verbe-c2"],
  ["CP", "Découvrir, comprendre et mettre en œuvre l’orthographe grammaticale", "Apprendre à conjuguer être et avoir au présent de l’indicatif et commencer à les mobiliser à l’écrit.", "etre-avoir-cp"],
  ["CE1", "Découvrir, comprendre et mettre en œuvre l’orthographe grammaticale", "Reconnaitre le GN (déterminant/nom/adjectif) et, en écoutant des transformations de phrases à l’oral puis en les observant à l’écrit, comprendre le lien entre le déterminant, le nom et l’adjectif dans la « chaine d’accords ».", "chaine-accords-c2"],
  ["CE1", "Découvrir, comprendre et mettre en œuvre l’orthographe grammaticale", "Identifier la relation sujet-verbe à partir de l’observation des effets des transformations liées au changement de temps et de personne dans des situations simples (groupe sujet + verbe).", "sujet-verbe-c2"],
  ["CE1", "Découvrir, comprendre et mettre en œuvre l’orthographe grammaticale", "Identifier le radical et la terminaison d’un verbe du premier groupe conjugué et trouver son infinitif.", "verbe-infinitif-c2"],
  ["CE1", "Découvrir, comprendre et mettre en œuvre l’orthographe grammaticale", "Apprendre à conjuguer au présent, à l’imparfait, au futur puis au passé composé de l’indicatif être et avoir et les verbes du premier groupe.", "conjuguer-imparfait-c2"],
  ["CE2", "Découvrir, comprendre et mettre en œuvre l’orthographe grammaticale", "Repérer, comprendre et mettre en œuvre les marques d’accord au sein du groupe nominal.", "chaine-accords-c2"],
  ["CE2", "Découvrir, comprendre et mettre en œuvre l’orthographe grammaticale", "Identifier, dans des situations simples, la relation sujet-verbe.", "sujet-verbe-c2"],
  ["CE2", "Découvrir, comprendre et mettre en œuvre l’orthographe grammaticale", "Apprendre à conjuguer au présent, à l’imparfait, au futur et au passé composé de l’indicatif être et avoir, les verbes du premier groupe et les verbes irréguliers du 3e groupe (faire, aller, dire, venir, pouvoir, voir, vouloir, prendre).", "conjuguer-imparfait-c2"],
  ["CE2", "Découvrir, comprendre et mettre en œuvre l’orthographe grammaticale", "Identifier le radical et la terminaison d’un verbe conjugué au programme et trouver son infinitif.", "verbe-infinitif-c2"],
];
const DUREES = [5, 10, 15, 20, 25, 30, 40, 45, 50, 55, 60, 75, 90, 105, 120, 150, 180];

describe("la grammaire et la conjugaison : des séquences bâties sur le programme et le guide CE1", () => {
  it("donnent à chaque compétence sa séquence ; conjuguer suit la période, dans l'ordre du programme", () => {
    for (const [niveau, cg, titre, attendue] of COMPETENCES) expect(demarcheSuggeree(cible(niveau, cg, titre), REF, 3).id, `${niveau} — ${titre}`).toBe(attendue);
    const conjuguer = COMPETENCES.find((c) => c[3] === "conjuguer-imparfait-c2")!;
    expect([1, 2, 3, 4, 5].map((p) => demarcheSuggeree(cible(conjuguer[0], conjuguer[1], conjuguer[2]), REF, p).id))
      .toEqual(["conjuguer-present-c2", "conjuguer-present-c2", "conjuguer-imparfait-c2", "conjuguer-futur-c2", "conjuguer-passe-compose-c2"]);
    expect(tempsDeLaPeriode(0)).toBe("present");
    for (const d of DEMARCHES_LANGUE) expect(COMPETENCES.some((c) => c[3] === d.id) || d.id.startsWith("conjuguer-"), d.id).toBe(true);
  });

  it("disent leurs sources, ont des séances bien formées et leurs feuilles", () => {
    for (const d of DEMARCHES_LANGUE) {
      // « au présent », « du passé composé » : jamais « à le », ni « de le ».
      expect(JSON.stringify(d), d.id).not.toMatch(/\b(à|de) le\b/);
      expect(d.source, d.id).toMatch(/^Bâtie sur le programme de français du cycle 2 \(2024\)/);
      expect(d.source, d.id).toContain("« La grammaire », p. 92-97");
      for (const s of d.seances) {
        expect(s.objectifs, `${d.id} · ${s.titre}`).toMatch(/^À la fin de cette séance, les élèves sauront /);
        expect(s.phases.length).toBeLessThanOrEqual(6);
        expect(s.phases.reduce((t, p) => t + parseInt(p.duree, 10), 0), `${d.id} · ${s.titre}`).toBeLessThanOrEqual(s.duree);
        for (const p of s.phases) expect(DUREES).toContain(parseInt(p.duree, 10));
      }
      const classes: ClasseC2[] = d.id.endsWith("-cp") ? ["CP"] : d.id.endsWith("-ce1") ? ["CE1"] : d.id.endsWith("-ce2") ? ["CE2"] : ["CP", "CE1", "CE2"];
      for (const classe of classes) {
        const plan = planDesFeuilles(d.id, { classe, periode: 3 })!;
        expect(plan.materiel, d.id).toHaveLength(d.seances.length);
        expect(plan.feuilles.length).toBeGreaterThan(0);
        for (const f of plan.feuilles) {
          expect(f.seance).toBeLessThan(d.seances.length);
          const html = f.fabriquer(1).html;
          expect(html, `${d.id} ${classe} · ${f.titre}`).toMatch(/^<div class="feuille/);
          expect(html, `${d.id} ${classe} · ${f.titre}`).not.toMatch(/NaN|undefined|null/);
        }
      }
    }
  });
});

describe("la conjugaison", () => {
  it("conjugue être, avoir, le 1er groupe et les irréguliers du CE2 aux quatre temps", () => {
    expect(conjugaison("chanter", "present")).toEqual(["je chante", "tu chantes", "il chante", "nous chantons", "vous chantez", "ils chantent"]);
    expect(conjugaison("aimer", "present")[0]).toBe("j'aime");
    expect(formes("manger", "present")[3]).toBe("mangeons");
    expect(formes("manger", "imparfait")).toEqual(["mangeais", "mangeais", "mangeait", "mangions", "mangiez", "mangeaient"]);
    expect(formes("commencer", "present")[3]).toBe("commençons");
    expect(formes("commencer", "imparfait")[3]).toBe("commencions");
    expect(formes("jouer", "futur")).toEqual(["jouerai", "joueras", "jouera", "jouerons", "jouerez", "joueront"]);
    expect(conjugaison("jouer", "passeCompose")).toEqual(["j'ai joué", "tu as joué", "il a joué", "nous avons joué", "vous avez joué", "ils ont joué"]);
    expect(conjugaison("être", "imparfait")[0]).toBe("j'étais");
    expect(conjugaison("avoir", "futur")[5]).toBe("ils auront");
    expect(conjugaison("aller", "passeCompose")).toEqual(["je suis allé", "tu es allé", "il est allé", "nous sommes allés", "vous êtes allés", "ils sont allés"]);
    expect(formes("faire", "present")[4]).toBe("faites");
    expect(formes("voir", "futur")[0]).toBe("verrai");
    expect(formes("prendre", "passeCompose")[2]).toBe("a pris");
    expect(radicalEtTerminaison("chanter", "chantons")).toEqual({ radical: "chant", terminaison: "ons" });
    expect(radicalEtTerminaison("manger", "mangeons")).toEqual({ radical: "mange", terminaison: "ons" });
    // Tous les verbes au programme se conjuguent à tous les temps de la classe.
    for (const classe of ["CE1", "CE2"] as const) for (const v of AU_PROGRAMME[classe].verbes) for (const t of AU_PROGRAMME[classe].temps) {
      for (const f of formes(v, t)) expect(f, `${v} ${t}`).toMatch(/^[a-zàâçéèêëîïôûù' ]+$/);
    }
  });

  it("change le temps d'une phrase : « Simon parle à Nora » au futur, au passé composé", () => {
    const simon = PHRASES_A_CONJUGUER.CE1[0];
    expect(phraseAuTemps(simon, "present", false)).toBe("Simon parle à Nora.");
    expect(phraseAuTemps(simon, "futur")).toBe("Demain, Simon parlera à Nora.");
    expect(phraseAuTemps(simon, "imparfait")).toBe("Autrefois, Simon parlait à Nora.");
    expect(phraseAuTemps(PHRASES_A_CONJUGUER.CE1[3], "passeCompose")).toBe("Hier, les enfants ont regardé un film.");
    expect(phraseAuTemps(PHRASES_A_CONJUGUER.CE1[4], "imparfait")).toBe("Autrefois, j'avais un chat.");
    expect(phraseAuTemps(PHRASES_A_CONJUGUER.CE2[1], "passeCompose")).toBe("Hier, nous sommes allés à la piscine.");
  });
});

describe("l'atelier « Grammaire et conjugaison »", () => {
  it("imprime chaque exercice, à chaque classe, avec son corrigé", () => {
    for (const e of EXERCICES_GRAMMAIRE) for (const classe of ["CP", "CE1", "CE2"] as Classe[]) for (const graine of [1, 2]) {
      const html = htmlGrammaire({ ...REGLAGES_GRAMMAIRE, exercice: e.id, classe, temps: "futur" }, graine);
      expect(html, `${e.id} ${classe}`).toMatch(/^<div class="feuille gr">/);
      expect(html, `${e.id} ${classe}`).toContain('class="page corrige"');
      expect(html, `${e.id} ${classe}`).not.toMatch(/NaN|undefined|null/);
      expect(html, `${e.id} ${classe}`).not.toMatch(/\b(à|de) le\b/);
    }
    for (const temps of ["present", "imparfait", "futur", "passeCompose"] as const) {
      expect(htmlGrammaire({ ...REGLAGES_GRAMMAIRE, exercice: "conjuguer", classe: "CE2", temps }, 1)).not.toMatch(/\b(à|de) le\b/);
      expect(htmlGrammaire({ ...REGLAGES_GRAMMAIRE, exercice: "transformerTemps", classe: "CE1", temps }, 1)).not.toMatch(/\b(à|de) le\b/);
    }
    expect(htmlGrammaire({ ...REGLAGES_GRAMMAIRE, exercice: "conjuguer", classe: "CE1", temps: "passeCompose" }, 1)).toContain("Conjuguer au passé composé");
    // Les phrases démontées gardent leur ponctuation, et seulement leurs mots.
    for (const p of PHRASES_DEMONTEES) expect(sansMarques(p)).not.toMatch(/[[\]]|S:|V:|C:/);
    // Les verbes de l'enseignant, s'ils sont au programme de la classe.
    expect(verbesDeLaFeuille({ ...REGLAGES_GRAMMAIRE, classe: "CE1", verbes: "chanter, faire, être" }, 1)).toEqual(["chanter", "être"]);
    expect(verbesDeLaFeuille({ ...REGLAGES_GRAMMAIRE, classe: "CE2", verbes: "faire" }, 1)).toEqual(["faire"]);
    expect(verbesDeLaFeuille({ ...REGLAGES_GRAMMAIRE, classe: "CP" }, 1)).toEqual(["être", "avoir"]);
  });
});
