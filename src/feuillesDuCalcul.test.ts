import { describe, it, expect } from "vitest";
import { demarcheDe, demarcheSuggeree } from "./demarches";
import { CLASSE_DES_DEMARCHES_CALCUL } from "./demarchesCalcul";
import { additionsDeLArbre, htmlConstruireLaTable, objectifsDuCalcul, planDuCalcul } from "./feuillesDuCalcul";
import { planDesFeuilles, type ClasseC2 } from "./feuillesDesSequences";
import { objectifParId } from "./faitsNumeriques";
import { programmationProposee } from "./programmation";

const REF = "Cycle 2 — CP, CE1, CE2 (programmes 2026)";
const FAITS = "Le calcul mental : mémoriser des faits numériques";
const NUMERATION = "Le calcul mental : utiliser ses connaissances en numération pour calculer mentalement";
const PROCEDURES = "Le calcul mental : apprendre des procédures de calcul mental";

/** Les compétences de calcul mental du référentiel, telles qu'il les écrit, et la démarche attendue. */
const COMPETENCES: [ClasseC2, string, string, string][] = [
  ["CP", FAITS, "Connaitre dans les deux sens les tables d’addition.", "calcul-mental-martiniere"],
  ["CP", FAITS, "Connaitre les doubles et les moitiés de nombres usuels.", "calcul-mental-martiniere"],
  ["CE1", FAITS, "Connaitre dans les deux sens les tables d’addition.", "calcul-mental-martiniere"],
  // En période 2, les tables de 2 à 6 et de 10 : La Martinière ; la table de 7 vient en période 3 (voir plus bas).
  ["CE1", FAITS, "Connaitre dans les deux sens les tables de multiplication.", "calcul-mental-martiniere"],
  ["CE1", FAITS, "Connaitre des faits multiplicatifs usuels.", "calcul-mental-martiniere"],
  ["CE2", FAITS, "Connaitre dans les deux sens les tables d’addition.", "calcul-mental-martiniere"],
  ["CE2", FAITS, "Connaitre dans les deux sens les tables de multiplication.", "calcul-mental-martiniere"],
  ["CE2", FAITS, "Connaitre des faits multiplicatifs usuels.", "calcul-mental-martiniere"],
  ["CP", NUMERATION, "Ajouter ou soustraire 1 ou 2 à un nombre.", "calcul-mental-martiniere"],
  ["CP", NUMERATION, "Ajouter ou soustraire 10 à un nombre.", "calcul-mental-martiniere"],
  ["CP", NUMERATION, "Ajouter ou soustraire 20, 30, 40, 50, 60, 70, 80 ou 90 à un nombre.", "calcul-mental-martiniere"],
  ["CE1", NUMERATION, "Ajouter ou soustraire un nombre entier de dizaines à un nombre. Ajouter ou soustraire un nombre entier de centaines à un nombre.", "calcul-mental-martiniere"],
  ["CE1", NUMERATION, "Multiplier par 10 un nombre inférieur à 100.", "calcul-mental-martiniere"],
  ["CE2", NUMERATION, "Multiplier un nombre entier par 10 ou 100.", "calcul-mental-martiniere"],
  ["CP", PROCEDURES, "Trouver le complément d’un nombre à la dizaine supérieure.", "calcul-mental-martiniere"],
  ["CP", PROCEDURES, "Ajouter un nombre inférieur à 9 à un nombre.", "calcul-mental-martiniere"],
  ["CP", PROCEDURES, "Ajouter 9 à un nombre.", "calcul-mental-martiniere"],
  ["CP", PROCEDURES, "Ajouter deux nombres inférieurs à 100.", "arbre-a-calcul-cp"],
  ["CP", PROCEDURES, "Déterminer la moitié d’un nombre pair.", "calcul-mental-martiniere"],
  ["CP", PROCEDURES, "Soustraire un nombre inférieur à 10 à un nombre entier de dizaines.", "calcul-mental-martiniere"],
  ["CE1", PROCEDURES, "Ajouter 9, 19 ou 29 à un nombre.", "ajouter-9-19-29-ce1"],
  ["CE1", PROCEDURES, "Soustraire 9 à un nombre.", "calcul-mental-martiniere"],
  ["CE1", PROCEDURES, "Soustraire un nombre inférieur à 9 à un nombre.", "calcul-mental-martiniere"],
  ["CE1", PROCEDURES, "Déterminer la moitié d’un nombre pair.", "calcul-mental-martiniere"],
  ["CE1", PROCEDURES, "Calculer le produit d’un nombre compris entre 11 et 19 par un nombre inférieur à 10 en décomposant le plus grand des deux facteurs en la somme de deux nombres (propriété de distributivité de la multiplication par rapport à l’addition).", "calcul-mental-martiniere"],
  ["CE2", PROCEDURES, "Ajouter 8, 9, 18, 19, 28, 29, 38 ou 39 à un nombre.", "calcul-mental-martiniere"],
  ["CE2", PROCEDURES, "Soustraire 9, 19, 29 ou 39 à un nombre.", "calcul-mental-martiniere"],
  ["CE2", PROCEDURES, "Multiplier un nombre entier par 4 ou par 8.", "multiplier-par-4-ce2"],
  ["CE2", PROCEDURES, "Multiplier un nombre inférieur à 10 par un nombre entier de dizaines.", "calcul-mental-martiniere"],
  ["CE2", PROCEDURES, "Calculer le produit d’un nombre compris entre 11 et 99 par un nombre inférieur à 10 en décomposant le plus grand des deux facteurs en la somme de deux nombres (propriété de distributivité de la multiplication par rapport à l’addition).", "calcul-mental-martiniere"],
];

const cible = (niveau: string, competenceGeneraleTitre: string, competenceTitre: string) => ({
  domaineTitre: "Mathématiques", sousDomaineTitre: "Nombres, calcul et résolution de problèmes", competenceGeneraleTitre, competenceTitre, niveau,
});

/** Les feuilles d'un plan, fabriquées : chacune doit donner une page imprimable. */
const fabriquees = (demarcheId: string, ctx: Parameters<typeof planDuCalcul>[1]) =>
  planDuCalcul(demarcheId, ctx)!.feuilles.map((f) => ({ ...f, ...f.fabriquer(5) }));

describe("le calcul mental du cycle 2, compétence par compétence", () => {
  it("prend la séquence du livret quand il y en a une, le procédé La Martinière sinon", () => {
    expect(COMPETENCES).toHaveLength(30);
    for (const [niveau, cg, titre, attendue] of COMPETENCES) {
      expect(demarcheSuggeree(cible(niveau, cg, titre), REF, 2).id, `${niveau} — ${titre}`).toBe(attendue);
    }
    // « Un nombre inférieur à 9 » n'est pas une comparaison de nombres.
    expect(demarcheSuggeree(cible("CP", PROCEDURES, "Ajouter un nombre inférieur à 9 à un nombre."), REF).id).not.toMatch(/^comparer/);
    // Les tables du CE1 : la séquence de la table de 7 en période 3, La Martinière aux autres périodes.
    const tables = (periode: number) => demarcheSuggeree(cible("CE1", FAITS, "Connaitre dans les deux sens les tables de multiplication."), REF, periode).id;
    expect([tables(1), tables(3), tables(4), tables(0)]).toEqual(["calcul-mental-martiniere", "table-de-7-ce1", "calcul-mental-martiniere", "table-de-7-ce1"]);
    // La séquence d'un livret est celle d'une classe : ajouter 9, 19 ou 29 n'est pas au programme du CP.
    expect(demarcheSuggeree(cible("CE2", PROCEDURES, "Ajouter deux nombres inférieurs à 100."), REF).id).toBe("calcul-mental-martiniere");
  });

  it("sait, pour chaque compétence, quels objectifs de l'atelier la travaillent, à sa classe", () => {
    for (const [classe, , titre, demarche] of COMPETENCES) {
      const o = objectifsDuCalcul({ classe, periode: 2, competence: titre });
      expect(o, `${classe} — ${titre}`).not.toBeNull();
      for (const id of o!.objectifs) expect(objectifParId(id)?.niveau, `${classe} — ${titre} : ${id}`).toBe(classe);
      // Et sa séquence a ses feuilles.
      const plan = planDesFeuilles(demarche, { classe, periode: 2, competence: titre });
      expect(plan?.feuilles.length, `${classe} — ${titre}`).toBeGreaterThanOrEqual(6);
    }
    // Les tables d'addition : les sommes jusqu'à dix d'abord, puis toutes.
    expect(objectifsDuCalcul({ classe: "CP", periode: 1, competence: "Connaitre dans les deux sens les tables d’addition." })!.objectifs).toEqual(["cp-sommes-10"]);
    expect(objectifsDuCalcul({ classe: "CP", periode: 3, competence: "Connaitre dans les deux sens les tables d’addition." })!.objectifs).toEqual(["cp-tables-addition"]);
    // Les tables de multiplication du CE1, période par période, comme le livret.
    const tables = (periode: number) => objectifsDuCalcul({ classe: "CE1", periode, competence: "Connaitre dans les deux sens les tables de multiplication." })!.tables;
    expect([tables(1), tables(3), tables(4)]).toEqual([[2, 3, 4, 5, 6, 10], [7], [8]]);
    expect(objectifsDuCalcul({ classe: "CP", periode: 2, competence: "Lire un texte." })).toBeNull();
  });

  it("donne à chaque démarche ses feuilles et la note du matériel de chaque séance", () => {
    const cas: [string, ClasseC2, string][] = [
      ...Object.entries(CLASSE_DES_DEMARCHES_CALCUL).map(([id, classe]) => [id, classe, ""] as [string, ClasseC2, string]),
      ["calcul-mental-martiniere", "CE1", "Connaitre des faits multiplicatifs usuels."],
      ["calcul-mental-martiniere", "CP", "Ajouter 9 à un nombre."],
    ];
    for (const [id, classe, competence] of cas) {
      const d = demarcheDe(id)!;
      const plan = planDuCalcul(id, { classe, periode: 3, competence })!;
      expect(plan.materiel, id).toHaveLength(d.seances.length);
      expect(plan.materiel.every((m) => m.trim().length > 0), id).toBe(true);
      for (const f of fabriquees(id, { classe, periode: 3, competence })) {
        expect(f.seance, `${id} · ${f.titre}`).toBeLessThan(d.seances.length);
        // Une feuille d'atelier — ou celle des problèmes, qui a la sienne.
        expect(f.html, `${id} · ${f.titre}`).toMatch(/^<div class="(pb-)?feuille/);
        expect(f.style, `${id} · ${f.titre}`).toMatch(/\.(pb-)?feuille/);
      }
    }
  });

  it("reprend les calculs mêmes des livrets", () => {
    const html = (id: string, classe: ClasseC2, titre: string) =>
      fabriquees(id, { classe, periode: 3 }).find((f) => f.titre === titre)!.html;
    // CP : l'annexe « séance 2 – entraînement ».
    const arbre = html("arbre-a-calcul-cp", "CP", "Arbre à calcul — fiche d'entraînement");
    for (const c of ["24 + 12", "15 + 22", "36 + 17"]) expect(arbre).toContain(c);
    // CE1 : la découverte part de 58 + 19 ; la fiche d'entraînement a ses douze calculs.
    expect(html("ajouter-9-19-29-ce1", "CE1", "Calcul mental — découverte : ajouter 19")).toContain("58 + 19");
    const fiche = html("ajouter-9-19-29-ce1", "CE1", "Ajouter 19 — fiche d'entraînement");
    for (const c of ["84 + 19", "264 + 19", "633 + 19"]) expect(fiche).toContain(c);
    // CE2 : 4 × 35, le problème des livres de la directrice.
    expect(html("multiplier-par-4-ce2", "CE2", "Calcul mental — découverte : multiplier par 4")).toContain("4 × 35");
    // La table de 7 : ce qu'on sait par les autres tables, et les trois résultats nouveaux à construire.
    const table = htmlConstruireLaTable(7, [7, 8, 9]);
    expect(table).toContain("6 × 7 = ");
    expect(table).toContain("Comment j'ai fait");
    expect(table).toContain("<b>63</b>");
  });

  it("tire des nombres où la procédure du jour est la bonne", () => {
    for (const graine of [1, 2, 3, 4, 5]) {
      const liste = additionsDeLArbre(9, graine);
      expect(liste).toHaveLength(9);
      for (const { a, b } of liste) {
        // Ni dizaine entière, ni nombre qui se termine par 9 : le livret les évite.
        for (const n of [a, b]) expect([0, 9]).not.toContain(n % 10);
        expect(a + b).toBeLessThanOrEqual(100);
      }
      // Une sur deux avec retenue, comme 34 + 17.
      expect(liste.filter(({ a, b }) => (a % 10) + (b % 10) >= 10)).toHaveLength(5);
    }
    // Ajouter 19 quand le nombre se termine par 0 ou 1 : un calcul sur deux.
    const zeroOuUn = fabriquees("ajouter-9-19-29-ce1", { classe: "CE1", periode: 2 })
      .find((f) => f.titre === "Ajouter 19 — quand le nombre se termine par 0 ou 1")!.html;
    const eleve = zeroOuUn.split('class="page corrige"')[0];
    const termes = [...eleve.matchAll(/(\d[\d  ]*) \+ 19/g)].map((m) => Number(m[1].replace(/\D/g, "")));
    expect(termes).toHaveLength(12);
    expect(termes.filter((n) => n % 10 <= 1)).toHaveLength(6);
    // La table de 7 à l'oral : des produits dans les deux ordres ; sur fiche, aussi le facteur manquant.
    const table = fabriquees("table-de-7-ce1", { classe: "CE1", periode: 3 });
    const oral = table.find((f) => f.titre === "La table de 7 — à l'ardoise")!.html;
    expect(oral).not.toMatch(/… ×/);
    const fiches = [1, 2, 3, 4].map((g) => planDuCalcul("table-de-7-ce1", { classe: "CE1", periode: 3 })!.feuilles
      .find((f) => f.titre === "La table de 7 — vingt égalités")!.fabriquer(g).html);
    expect(fiches.some((h) => /<span class="ma-trou"><\/span> × 7 = \d+/.test(h))).toBe(true);
    expect(fiches[0]).toContain("en deux minutes");
  });

  it("prend l'objectif qu'on a rattaché soi-même à la compétence, quand il est de sa classe", () => {
    const titres = (ctx: Parameters<typeof planDuCalcul>[1]) => planDuCalcul("calcul-mental-martiniere", ctx)!.feuilles.map((f) => f.titre);
    const ctx = { classe: "CP" as const, periode: 2, competence: "Connaitre dans les deux sens les tables d’addition." };
    expect(titres({ ...ctx, objectifRattache: "cp-complements-10" })).toContain("Problèmes — Compléments à 10");
    // Un objectif du CE1 rattaché à une compétence du CP ne compte pas.
    expect(titres({ ...ctx, objectifRattache: "ce1-tables-addition" })).toEqual(titres(ctx));
    // Sans objectif connu ni rattaché, rien à piocher.
    expect(planDuCalcul("calcul-mental-martiniere", { classe: "CP", periode: 2, competence: "Lire un texte." })).toBeNull();
  });

  it("nomme chaque feuille d'entraînement quand la compétence a plusieurs objectifs", () => {
    const t = planDuCalcul("calcul-mental-martiniere", { classe: "CP", periode: 2, competence: "Connaitre les doubles et les moitiés de nombres usuels." })!
      .feuilles.filter((f) => f.titre.startsWith("Calcul mental — La Martinière")).map((f) => f.titre);
    expect(t).toEqual([
      "Calcul mental — La Martinière : Doubles des nombres de 1 à 10",
      "Calcul mental — La Martinière : Moitiés des nombres pairs de 2 à 20",
      "Calcul mental — La Martinière : tout mêlé",
    ]);
  });

  it("propose la période que donne le livret, et la cite", () => {
    const p = (niveau: string, demarche: string) => programmationProposee({ niveau, competenceTitre: "" }, demarche)!;
    expect(p("CP", "arbre-a-calcul-cp")).toMatchObject({ niveau: "CP", periode: 3 });
    expect(p("CP", "arbre-a-calcul-cp").raison).toBe("Livret d'accompagnement de mathématiques du CP (Éduscol, 2025) : « Cette séquence peut être abordée en période 3. »");
    expect(p("CE1", "ajouter-9-19-29-ce1").periode).toBe(2);
    expect(p("CE1", "table-de-7-ce1").periode).toBe(3);
    // Le livret CE2 ne dit pas quand multiplier par 4.
    expect(p("CE2", "multiplier-par-4-ce2").periode).toBeNull();
    // Les tables d'addition du CP : réintroduites dès les deux premières périodes.
    expect(programmationProposee({ niveau: "CP", competenceTitre: "Connaitre dans les deux sens les tables d’addition." })!.periode).toBe(1);
  });
});
