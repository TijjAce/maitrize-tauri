import { describe, it, expect } from "vitest";
import { demarcheDe, demarcheSuggeree } from "./demarches";
import { DEMARCHES_GRANDEURS } from "./demarchesGrandeurs";
import { planDesFeuilles } from "./feuillesDesSequences";
import { programmationProposee } from "./programmation";
import {
  REGLAGES_MONNAIE, achats, ajoutsSuccessifs, decomposer, ecritures, especes, htmlMonnaie, montant, porteMonnaie, prixARanger, type ExerciceMonnaie,
} from "./monnaie";
import {
  EXERCICES_MESURES, REGLAGES_MESURES, conversions, cotes, ecrireMesure, htmlMesures, longueurs, mesuresAComparer, mesuresARanger, pesesDeuxADeux, polygoneAuHasard,
  type Classe, type Grandeur,
} from "./mesures";
import { REGLAGES_HEURE, cheminDuree, direHeure, durees, ecrireDuree, htmlAtelierHeure, momentsDeLaJournee, problemesDeDurees } from "./heure";
import { hasard } from "./hasard";

const REF = "Cycle 2 — CP, CE1, CE2 (programmes 2026)";
const cible = (niveau: string, cg: string, competenceTitre: string) => ({
  domaineTitre: "Mathématiques", sousDomaineTitre: "Grandeurs et mesures", competenceGeneraleTitre: cg, competenceTitre, niveau,
});

const L = "Les longueurs", M = "Les masses", MO = "La monnaie", C = "Les contenances", T1 = "Le repérage dans le temps", T2 = "Le repérage dans le temps et les durées";

/** Les compétences du référentiel, et la séquence qu'on attend pour chacune. */
const COMPETENCES: [string, string, string, string][] = [
  ["CP", L, "Utiliser le lexique spécifique associé aux longueurs.", "longueurs-comparer-cp"],
  ["CP", L, "Comparer des objets selon leur longueur.", "longueurs-comparer-cp"],
  ["CP", L, "Comparer des segments selon leur longueur.", "longueurs-comparer-cp"],
  ["CP", L, "Savoir mesurer la longueur d’un segment en utilisant une règle graduée.", "longueurs-mesurer-cp"],
  ["CP", L, "Connaitre et utiliser les unités mètre et centimètre et les symboles associés (m et cm).", "longueurs-mesurer-cp"],
  ["CP", L, "Connaitre quelques longueurs de référence.", "longueurs-mesurer-cp"],
  ["CP", L, "Savoir qu’un mètre est égal à cent centimètres.", "longueurs-mesurer-cp"],
  ["CE1", L, "Connaitre et utiliser les unités mètre, centimètre, kilomètre et les symboles associés (m, cm et km).", "longueurs-unites-ce1"],
  ["CE1", L, "Choisir l’unité la mieux adaptée pour exprimer une longueur.", "longueurs-unites-ce1"],
  ["CE1", L, "Connaitre les relations entre les unités de longueur usuelles.", "longueurs-unites-ce1"],
  ["CE1", L, "Savoir mesurer la longueur d’un segment en utilisant une règle graduée.", "longueurs-mesurer-ce1"],
  ["CE1", L, "Comparer des longueurs.", "longueurs-mesurer-ce1"],
  ["CE1", L, "Connaitre quelques longueurs de référence.", "longueurs-mesurer-ce1"],
  ["CE1", L, "Estimer la longueur d’un objet du quotidien.", "longueurs-mesurer-ce1"],
  ["CE2", L, "Connaitre et utiliser les unités mètre, décimètre, centimètre, millimètre, kilomètre et les symboles associés (m, dm, cm, mm, km).", "longueurs-unites-ce2"],
  ["CE2", L, "Connaitre les relations entre les unités de longueur.", "longueurs-unites-ce2"],
  ["CE2", L, "Choisir l’unité la mieux adaptée pour exprimer une longueur.", "longueurs-unites-ce2"],
  ["CE2", L, "Comparer des longueurs.", "longueurs-unites-ce2"],
  ["CE2", L, "Tracer un segment de longueur donnée.", "mesurer-tracer-ce2"],
  ["CE2", L, "Disposer de quelques longueurs de référence.", "longueurs-unites-ce2"],
  ["CE2", L, "Estimer la longueur d’un objet ou une distance.", "longueurs-unites-ce2"],
  ["CE2", L, "Savoir ce qu’est le périmètre d’une figure plane.", "perimetre-ce2"],
  ["CE2", L, "Comparer le périmètre de plusieurs polygones sans règle graduée, en utilisant un compas.", "perimetre-ce2"],
  ["CE2", L, "Déterminer le périmètre d’un polygone en utilisant une règle graduée.", "perimetre-ce2"],
  ["CP", M, "Utiliser le lexique associé aux masses.", "masses-cp"],
  ["CP", M, "Comparer des objets selon leur masse.", "masses-cp"],
  ["CE1", M, "Savoir identifier l’objet le plus léger (ou le plus lourd) parmi deux ou trois objets de volumes proches en les soupesant ou en utilisant une balance pour les peser.", "masses-ce1"],
  ["CE1", M, "Connaitre et utiliser les unités gramme et kilogramme et les symboles associés (g, kg).", "masses-ce1"],
  ["CE1", M, "Savoir que 1 kg est égal à 1 000 g.", "masses-ce1"],
  ["CE1", M, "Comparer des masses.", "masses-ce1"],
  ["CE1", M, "Disposer de quelques masses de référence. Estimer la masse d’objets du quotidien en gramme ou en kilogramme.", "masses-ce1"],
  ["CE2", M, "Connaitre et utiliser les unités gramme, kilogramme et tonne et les symboles associés (g, kg, t).", "masses-ce2"],
  ["CE2", M, "Choisir l’unité la mieux adaptée pour exprimer une masse.", "masses-ce2"],
  ["CE2", M, "Connaitre les relations entre les unités de masse usuelles.", "masses-ce2"],
  ["CE2", M, "Comparer des masses.", "masses-ce2"],
  ["CE2", M, "Disposer de quelques masses de référence.", "masses-ce2"],
  ["CE2", M, "Estimer la masse d’un objet.", "masses-ce2"],
  ["CP", MO, "Utiliser le lexique spécifique lié à la monnaie.", "monnaie-cp"],
  ["CP", MO, "Comparer les valeurs de deux ensembles constitués de pièces de monnaie ou de deux ensembles constitués de pièces et de billets.", "monnaie-cp"],
  ["CP", MO, "Déterminer la valeur en euro d’un ensemble constitué de pièces et de billets.", "monnaie-cp"],
  ["CP", MO, "Constituer une somme d’argent donnée avec des pièces et des billets.", "monnaie-cp"],
  ["CP", MO, "Simuler des achats en manipulant des pièces et des billets fictifs. Rendre la monnaie.", "monnaie-cp"],
  ["CE1", MO, "Connaitre le lien entre les euros et les centimes.", "monnaie-ce1"],
  ["CE1", MO, "Comparer les valeurs en euro de deux ensembles constitués de pièces et de billets.", "monnaie-ce1"],
  ["CE1", MO, "Déterminer la valeur en euro et centime d’euro d’un ensemble constitué de pièces et de billets.", "monnaie-ce1"],
  ["CE1", MO, "Constituer avec des euros et des centimes d’euro une somme d’argent d’une valeur donnée.", "monnaie-ce1"],
  ["CE1", MO, "Simuler des achats en manipulant des pièces et des billets fictifs. Rendre la monnaie.", "monnaie-ce1"],
  ["CE1", MO, "Connaitre le sens de l’écriture à virgule d’une somme d’argent.", "monnaie-virgule-ce1"],
  ["CE2", MO, "Simuler des achats en manipulant des pièces et des billets fictifs. Rendre la monnaie.", "monnaie-ce2"],
  ["CE2", MO, "Poser et effectuer des additions de montants en euro.", "posees-ce2"],
  ["CE2", MO, "Poser et effectuer des soustractions de montants en euro.", "posees-ce2"],
  ["CP", T1, "Lire sur une horloge à aiguilles une heure donnée en heures entières.", "heure-cp"],
  ["CP", T1, "Positionner les aiguilles d’une horloge correspondant à une heure donnée (uniquement des heures entières inférieures ou égales à douze).", "heure-cp"],
  ["CP", T1, "Associer une heure à un moment de la journée.", "heure-cp"],
  ["CE1", T2, "Lire l’heure sur une horloge à aiguilles (lorsque l’heure est donnée en heures entières, en heures et demi-heure ou en heures et quarts d’heure).", "heure-ce1"],
  ["CE1", T2, "Positionner les aiguilles d’une horloge correspondant à une heure donnée en heures entières, en heures et demi-heure ou en heures et quart d’heure.", "heure-ce1"],
  ["CE1", T2, "Connaitre, utiliser et distinguer les heures du matin et celles de l’après-midi.", "heure-ce1"],
  ["CE1", T2, "Connaitre les unités de mesure de durée, heure et minute, et les symboles associés (h et min).", "durees-ce1"],
  ["CE1", T2, "Comparer et mesurer des durées écoulées entre deux instants affichés sur une horloge (pour des intervalles de temps situés dans une même journée, avec des heures données en heures entières, en heures et demi-heure ou en heures et quarts d’heure).", "durees-ce1"],
  ["CE2", T2, "Lire l’heure sur une horloge à aiguilles.", "heure-ce2"],
  ["CE2", T2, "Positionner les aiguilles d’une horloge correspondant à une heure donnée en heures entières ou en heures et minutes.", "heure-ce2"],
  ["CE2", T2, "Comparer et mesurer des durées écoulées entre deux instants affichés sur une horloge (pour des intervalles de temps situés dans une même journée).", "durees-ce2"],
  ["CE2", T2, "Résoudre des problèmes à une ou deux étapes impliquant des durées.", "durees-ce2"],
  ["CE2", C, "Comparer les contenances de différents objets.", "contenances-ce2"],
  ["CE2", C, "Connaitre et utiliser les unités litre, décilitre et centilitre et les symboles associés (L, dL et cL).", "contenances-ce2"],
  ["CE2", C, "Savoir que 1 L est égal à 10 dL et également à 100 cL.", "contenances-ce2"],
];

/** La valeur d'une mesure écrite, dans la plus petite unité : « 1 m + 46 cm », « 5 t 350 kg », « 1 kg et 300 g ». */
const FACTEURS: Record<string, number> = { km: 1_000_000, m: 1000, dm: 100, cm: 10, mm: 1, t: 1_000_000, kg: 1000, g: 1, L: 100, dL: 10, cL: 1 };
const valeur = (texte: string) => [...texte.replace(/[  ]/g, "").matchAll(/(\d[\d ]*?)\s*(km|mm|cm|dm|m|t|kg|g|dL|cL|L)\b/g)]
  .reduce((s, m) => s + Number(m[1].replace(/ /g, "")) * FACTEURS[m[2]], 0);

describe("les grandeurs et mesures, bâties sur le programme et les guides", () => {
  it("donnent à chaque compétence du programme sa séquence", () => {
    for (const [niveau, cg, titre, attendue] of COMPETENCES) expect(demarcheSuggeree(cible(niveau, cg, titre), REF).id, `${niveau} — ${titre}`).toBe(attendue);
    // Chaque séquence sert au moins une compétence.
    for (const d of DEMARCHES_GRANDEURS) expect(COMPETENCES.some((c) => c[3] === d.id), d.id).toBe(true);
  });

  it("disent leurs sources, et proposent la période que le programme donne", () => {
    for (const d of DEMARCHES_GRANDEURS) expect(d.source, d.id).toMatch(/^Bâtie sur le programme de mathématiques du cycle 2 \(2024\) et les guides Éduscol, à la demande de l'enseignant/);
    expect(demarcheDe("masses-ce1")!.source).toContain("Activité : Masses");
    expect(demarcheDe("monnaie-cp")!.source).toContain("exemple 3 : la monnaie");
    expect(demarcheDe("longueurs-unites-ce2")!.source).toContain("« Grandeurs et mesures au cycle 2 »");
    const periode = (niveau: string, titre: string, id: string) => programmationProposee({ niveau, competenceTitre: titre }, id)!.periode;
    expect(periode("CP", "Constituer une somme d’argent donnée avec des pièces et des billets.", "monnaie-cp")).toBe(2);
    expect(periode("CE1", "Simuler des achats en manipulant des pièces et des billets fictifs. Rendre la monnaie.", "monnaie-ce1")).toBe(2);
    expect(periode("CE1", "Connaitre le sens de l’écriture à virgule d’une somme d’argent.", "monnaie-virgule-ce1")).toBe(3);
    expect(periode("CE2", "Simuler des achats en manipulant des pièces et des billets fictifs. Rendre la monnaie.", "monnaie-ce2")).toBe(1);
    expect(periode("CE2", "Poser et effectuer des soustractions de montants en euro.", "posees-ce2")).toBe(4);
    // Le programme ne fixe pas de période pour les longueurs.
    expect(periode("CE1", "Comparer des longueurs.", "longueurs-mesurer-ce1")).toBeNull();
  });

  it("donnent leurs feuilles et la note de matériel de chaque séance", () => {
    for (const d of DEMARCHES_GRANDEURS) {
      const classe = d.id.endsWith("-cp") ? "CP" : d.id.endsWith("-ce1") ? "CE1" : "CE2";
      const plan = planDesFeuilles(d.id, { classe, periode: 3 })!;
      expect(plan.materiel, d.id).toHaveLength(d.seances.length);
      for (const f of plan.feuilles) {
        expect(f.seance, `${d.id} · ${f.titre}`).toBeLessThan(d.seances.length);
        for (const graine of [1, 2, 3]) {
          const html = f.fabriquer(graine).html;
          expect(html, `${d.id} · ${f.titre}`).toMatch(/^<div class="feuille/);
          expect(html, `${d.id} · ${f.titre}`).not.toMatch(/NaN|undefined|Infinity/);
          expect(html, `${d.id} · ${f.titre}`).toContain('class="page');
        }
      }
    }
  });
});

describe("la monnaie", () => {
  it("garde les montants du CP en euros entiers, jusqu'à cent, sans billet de cent euros", () => {
    const cp = { ...REGLAGES_MONNAIE, jusqua: 100 };
    expect(especes(cp)).toEqual([100, 200, 500, 1000, 2000, 5000]);
    expect(especes({ ...cp, centimes: true })).toContain(10000);
    expect(especes({ ...cp, sansPiecesDe1: true })).not.toContain(100);
    const alea = hasard(4);
    for (let i = 0; i < 40; i++) {
      const p = porteMonnaie({ ...REGLAGES_MONNAIE, jusqua: 50 }, alea);
      expect(p.reduce((s, v) => s + v, 0)).toBeLessThanOrEqual(5000);
      expect(p.every((v) => v >= 100)).toBe(true);
    }
  });

  it("paie juste avec le moins de pièces et de billets, même sans pièce de 1 €", () => {
    const tout = especes({ jusqua: 100, centimes: false });
    expect(decomposer(4800, tout)).toEqual([2000, 2000, 500, 200, 100]);
    // « Produire 56 € […] sans utiliser de pièces de 1 € » ; 53 € aussi, même si le plus grand d'abord échoue.
    const sansUn = especes({ jusqua: 100, centimes: false, sansPiecesDe1: true });
    expect(decomposer(5600, sansUn)).toEqual([5000, 200, 200, 200]);
    const d53 = decomposer(5300, sansUn);
    expect(d53.reduce((s, v) => s + v, 0)).toBe(5300);
    expect(d53).not.toContain(100);
    expect(decomposer(300, sansUn)).toEqual([]);
  });

  it("écrit les sommes comme le programme : 2,05 € n'est pas 2,50 €", () => {
    expect(montant(205, true)).toBe("2,05 €");
    expect(montant(250, true)).toBe("2,50 €");
    expect(montant(85, true)).toBe("0,85 €");
    expect(montant(1700, true)).toBe("17,00 €");
    expect(montant(345, false)).toBe("3 € 45 c");
    for (const graine of [1, 2, 3]) {
      for (const e of ecritures({ jusqua: 20, combien: 14 }, graine)) {
        const a = /^(\d+) € et (\d+) centimes = /.exec(e.enonce), b = /^(\d+),(\d\d) € = /.exec(e.enonce), c = /^(\d+) centimes = /.exec(e.enonce);
        if (a) expect(e.reponse, e.enonce).toBe(montant(Number(a[1]) * 100 + Number(a[2]), true));
        else if (b) expect(e.reponse, e.enonce).toBe(`${Number(b[1])} € et ${Number(b[2])} centimes`);
        else if (c && e.enonce.includes(",")) expect(e.reponse, e.enonce).toBe(montant(Number(c[1]), true));
        else if (c && e.enonce.includes("centimes = <")) expect(e.reponse.startsWith(`${Math.floor(Number(c[1]) / 100)} €`), e.enonce).toBe(true);
      }
    }
  });

  it("rend la monnaie par ajouts successifs, et la rend juste", () => {
    expect(ajoutsSuccessifs(368, 500, true)).toBe("0,32 € pour arriver à 4,00 €, plus 1,00 € pour arriver à 5,00 €");
    expect(ajoutsSuccessifs(1300, 2000, false)).toBe("7 € pour arriver à 20 €");
    expect(ajoutsSuccessifs(3700, 5000, false)).toBe("3 € pour arriver à 40 €, plus 10 € pour arriver à 50 €");
    for (const graine of [1, 2, 3, 4]) {
      for (const a of achats({ ...REGLAGES_MONNAIE, centimes: true, jusqua: 20, combien: 6 }, graine)) {
        expect(a.paye[0]).toBeGreaterThan(a.prix);
        expect(a.rendu).toBe(a.paye[0] - a.prix);
        expect(a.prix).toBe(a.articles.reduce((s, x) => s + x.prix, 0));
      }
    }
  });

  it("range des prix tous différents, et imprime chaque exercice avec son corrigé", () => {
    for (const s of prixARanger({ jusqua: 20, virgule: true, combien: 6 }, 3)) expect(new Set(s.prix).size).toBe(4);
    for (const exercice of ["valeur", "constituer", "unEuro", "comparer", "ordonner", "rendre", "ecriture"] as ExerciceMonnaie[]) {
      const html = htmlMonnaie({ ...REGLAGES_MONNAIE, exercice, centimes: true }, 2);
      expect(html, exercice).toContain('class="page corrige"');
      expect(html, exercice).not.toMatch(/NaN|undefined/);
    }
    expect(htmlMonnaie({ ...REGLAGES_MONNAIE, exercice: "planche", jusqua: 50 }, 1)).toContain("pour jouer");
  });
});

describe("les mesures", () => {
  it("convertissent juste, sans tableau, dans toutes les classes", () => {
    const cas: [Grandeur, Classe][] = [["longueur", "CP"], ["longueur", "CE1"], ["longueur", "CE2"], ["masse", "CE1"], ["masse", "CE2"], ["contenance", "CE2"]];
    for (const [g, classe] of cas) {
      for (const graine of [1, 2, 3]) {
        for (const c of conversions(g, classe, 12, graine)) {
          let i = 0;
          const rempli = c.enonce.replace(/<span class="me-blanc"><\/span>/g, () => c.reponses[i++] ?? "?");
          const [gauche, droite] = rempli.split(" = ");
          expect(valeur(gauche), `${classe} ${rempli}`).toBe(valeur(droite));
          // Les unités : celles que la classe connaît.
          if (classe !== "CE2") expect(rempli, rempli).not.toMatch(/\b(mm|dm|t|dL|cL)\b/);
        }
      }
    }
  });

  it("comparent et rangent des mesures écrites autrement", () => {
    for (const [g, classe] of [["longueur", "CE1"], ["longueur", "CE2"], ["masse", "CE1"], ["contenance", "CE2"]] as [Grandeur, Classe][]) {
      for (const c of mesuresAComparer(g, classe, 12, 5)) {
        const [a, b] = [valeur(c.a), valeur(c.b)];
        expect(c.signe, `${c.a} ${c.signe} ${c.b}`).toBe(a < b ? "<" : a > b ? ">" : "=");
      }
      for (const s of mesuresARanger(g, classe, 6, 5)) {
        expect(new Set(s.valeurs).size).toBe(4);
        s.ecrits.forEach((e, i) => expect(valeur(e), e).toBe(g === "longueur" && classe !== "CE2" ? 10 * s.valeurs[i] : s.valeurs[i]));
      }
    }
    expect(ecrireMesure(1300, "masse", "CE1", "grande")).toBe("1 kg et 300 g");
    expect(ecrireMesure(53, "longueur", "CE2", "grande")).toBe("5 cm et 3 mm");
    expect(ecrireMesure(780, "contenance", "CE2", "grande")).toBe("7 L et 80 cL");
  });

  it("tirent des segments de 2 à 15 cm, des polygones aux côtés entiers, des pesées qui suffisent à ranger", () => {
    const alea = hasard(7);
    for (const mm of longueurs({ millimetres: false, combien: 8 }, alea)) { expect(mm % 10).toBe(0); expect(mm).toBeGreaterThanOrEqual(20); expect(mm).toBeLessThanOrEqual(150); }
    for (let i = 0; i < 30; i++) for (const c of cotes(polygoneAuHasard(alea).points)) expect(Number.isInteger(c)).toBe(true);
    for (let i = 0; i < 20; i++) {
      const { masses, pesees } = pesesDeuxADeux(alea, 4);
      expect(pesees).toHaveLength(3);
      // Les pesées relient les objets voisins dans l'ordre : elles suffisent à tout ranger.
      const ordre = masses.map((m, k) => ({ m, k })).sort((a, b) => a.m - b.m).map((x) => x.k);
      for (let k = 0; k + 1 < 4; k++) expect(pesees.some(([a, b]) => (a === ordre[k] && b === ordre[k + 1]) || (a === ordre[k + 1] && b === ordre[k]))).toBe(true);
    }
  });

  it("impriment chaque exercice, pour chaque grandeur et chaque classe, avec son corrigé", () => {
    for (const e of EXERCICES_MESURES) for (const grandeur of e.grandeurs) for (const classe of ["CP", "CE1", "CE2"] as Classe[]) {
      const html = htmlMesures({ ...REGLAGES_MESURES, exercice: e.id, grandeur, classe }, 3);
      expect(html, `${e.id} ${grandeur} ${classe}`).toContain('class="page corrige"');
      expect(html, `${e.id} ${grandeur} ${classe}`).not.toMatch(/NaN|undefined|Infinity/);
    }
    // Les segments à leur taille réelle, et le trait de contrôle de 10 cm.
    const mesurer = htmlMesures({ ...REGLAGES_MESURES, exercice: "mesurer" }, 1);
    expect(mesurer).toContain('width="102mm"');
    expect(mesurer).toContain("Ce trait mesure 10 cm");
    // Encadrer : la réponse entre deux centimètres.
    expect(htmlMesures({ ...REGLAGES_MESURES, exercice: "mesurer", encadrer: true }, 1)).toMatch(/entre \d+ cm et \d+ cm/);
  });
});

describe("l'heure et les durées", () => {
  it("disent les durées et les heures comme dans un énoncé", () => {
    expect(ecrireDuree(90)).toBe("1 h 30 min");
    expect(ecrireDuree(45)).toBe("45 min");
    expect(ecrireDuree(120)).toBe("2 h");
    expect(direHeure({ h: 9, m: 0 })).toBe("9 h");
    expect(direHeure({ h: 9, m: 5 })).toBe("9 h 05");
    expect(cheminDuree({ h: 8, m: 30 }, { h: 12, m: 30 })).toBe("de 8 h 30 à 9 h : 30 min ; de 9 h à 12 h 30 : 3 h 30 min ; en tout, 4 h");
    expect(cheminDuree({ h: 8, m: 30 }, { h: 8, m: 45 })).toBe("de 8 h 30 à 8 h 45 : 15 min");
  });

  it("mesurent la durée entre deux horloges d'une même journée", () => {
    for (const precision of ["quarts", "cinq"] as const) {
      for (const graine of [1, 2, 3]) {
        for (const d of durees({ precision, combien: 8, apresMidi: false }, graine)) {
          expect(60 * d.fin.h + d.fin.m - (60 * d.debut.h + d.debut.m)).toBe(d.minutes);
          expect(d.minutes % (precision === "quarts" ? 15 : 5)).toBe(0);
          // Sans l'après-midi, on ne passe pas midi.
          expect(d.debut.h < 12 && 60 * d.fin.h + d.fin.m > 720).toBe(false);
        }
      }
    }
  });

  it("posent des problèmes de durées au CE1 et au CE2, et les moments de la journée au CP", () => {
    for (const niveau of ["CE1", "CE2"] as const) {
      for (const p of problemesDeDurees({ precision: niveau === "CE1" ? "quarts" : "cinq", combien: 8 }, 3, niveau)) {
        expect(p.enonce).not.toMatch(/undefined|NaN/);
        expect(p.reponse.length).toBeGreaterThan(0);
      }
    }
    const ce1 = problemesDeDurees({ precision: "quarts", combien: 5 }, 1, "CE1").map((p) => p.enonce).join(" ");
    expect(ce1).toMatch(/à tailler ses rosiers/);
    const ce2 = problemesDeDurees({ precision: "cinq", combien: 7 }, 1, "CE2").map((p) => p.enonce).join(" ");
    expect(ce2).toMatch(/Le train est parti à/);
    expect(htmlAtelierHeure({ ...REGLAGES_HEURE, exercice: "problemes", precision: "cinq" }, 2)).toContain('class="he-axe"');
    const { moments, horloges } = momentsDeLaJournee(4, 5);
    expect(new Set(moments.map((m) => m.h)).size).toBe(5);
    expect([...horloges].sort()).toEqual(moments.map((m) => m.h).sort());
    for (const exercice of ["horloges", "durees", "problemes", "moments"] as const) {
      expect(htmlAtelierHeure({ ...REGLAGES_HEURE, exercice }, 5), exercice).toContain('class="page corrige"');
    }
  });
});
