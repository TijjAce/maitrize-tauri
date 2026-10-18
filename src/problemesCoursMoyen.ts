// Les problèmes du cours moyen, d'après le programme de mathématiques du cycle 3
// (2025) et ses exemples de réussite (Éduscol, 2025) : des structures déjà
// rencontrées au cycle 2 — parties-tout, comparaison, parts égales — sur des
// grands nombres, des décimaux et des grandeurs ; et des structures nouvelles —
// comparaison multiplicative, problèmes mixtes, dénombrement, optimisation,
// recherches exhaustives qui préparent aux algorithmes, proportionnalité.
//
// La résolution suit le modèle en quatre phases du programme : comprendre —
// redire l'histoire —, modéliser — un schéma, l'opération —, calculer,
// répondre — et se demander si c'est possible. Chaque problème a son cadre de
// recherche ; le corrigé écrit les calculs, la phrase réponse, et le schéma en
// barres quand il aide. Les prénoms sont inventés.

import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";
import { choisir, entier, fr } from "./nombres";
import { nombreEnLettres } from "./nombresEnLettres";
import { escapeHtml } from "./print";
import { STYLE_CLASSE, schemaSvg, type Schema } from "./problemesBarres";

export type SorteProblemeCM =
  | "partie-tout" | "comparaison" | "deux-etapes" | "comparaison-deux-etapes" | "parts-egales" | "comparaison-multiplicative"
  | "mixte" | "denombrement" | "optimisation" | "algorithme"
  | "proportionnalite" | "proportionnalite-deux-etapes" | "proportionnalite-additive" | "proportionnalite-combinee" | "identifier-proportionnalite";

export interface ReglagesProblemesCM {
  classe: "CM1" | "CM2";
  sortes: SorteProblemeCM[];
  combien: number;
  titre?: string;
}

export const REGLAGES_PROBLEMES_CM: ReglagesProblemesCM = { classe: "CM1", sortes: ["partie-tout"], combien: 4 };

export interface ProblemeCM { enonce: string; calcul: string; phrase: string; schema?: Schema }

// ── Les mots ─────────────────────────────────────────────────────────────

/** Des prénoms inventés, avec leur pronom. */
const PRENOMS: [string, "il" | "elle"][] = [
  ["Léa", "elle"], ["Tom", "il"], ["Nour", "elle"], ["Basile", "il"], ["Zoé", "elle"], ["Malik", "il"], ["Maëlle", "elle"], ["Timéo", "il"],
  ["Anaïs", "elle"], ["Yanis", "il"], ["Lina", "elle"], ["Sacha", "il"], ["Jade", "elle"], ["Noé", "il"],
];
const quelquun = (alea: () => number, sauf = "") => {
  let p = choisir(alea, PRENOMS);
  while (p[0] === sauf) p = choisir(alea, PRENOMS);
  return { nom: p[0], il: p[1], Il: p[1] === "il" ? "Il" : "Elle" };
};

/** Un nombre écrit à la française ; `d` décimales gardées telles quelles (des euros : deux). */
const n = (x: number, d = 0) => (d ? fr(Math.round(x * 10 ** d) / 10 ** d, d) : fr(x));
/** Un décimal sans zéro inutile après la virgule. */
const nd = (x: number) => fr(Math.round(x * 1000) / 1000, 3).replace(/,?0+$/, "");
const arrondi2 = (x: number) => Math.round(x * 100) / 100;

const parties = (tout: number, a: number, b: number, inconnue: "tout" | "a" | "b"): Schema => ({
  forme: "parties", tout: { valeur: tout, connue: inconnue !== "tout" },
  parties: [{ valeur: a, connue: inconnue !== "a" }, { valeur: b, connue: inconnue !== "b" }],
});

// ── Les problèmes ────────────────────────────────────────────────────────

/** Des centimes, écrits en euros : « 12,50 », « 20 » dans un calcul ; avec le symbole dans une phrase. */
const e2 = (c: number) => n(c / 100, c % 100 === 0 ? 0 : 2);
const eu = (c: number) => `${e2(c)} €`;

/** Une fraction dite en mots : « cinq douzièmes », « un quart ». */
const PARTS: Record<number, string> = { 3: "tiers", 4: "quart", 5: "cinquième", 6: "sixième", 8: "huitième", 10: "dixième", 12: "douzième" };
const enMots = (num: number, den: number) => `${nombreEnLettres(num)} ${num > 1 && den !== 3 ? `${PARTS[den]}s` : PARTS[den]}`;

function partieTout(alea: () => number, r: ReglagesProblemesCM): ProblemeCM {
  const p = quelquun(alea);
  const sorte = entier(alea, 0, r.classe === "CM2" ? 3 : 2);
  if (sorte === 0) {
    const a = entier(alea, 12, 48) / 10, t = a + entier(alea, 15, 40) / 10;
    return {
      enonce: `${p.nom} a acheté des pommes et des poires. ${p.Il} a acheté ${nd(a)} kg de pommes et ${nd(t)} kg de fruits en tout. Quelle masse de poires a-t-${p.il} achetée ?`,
      calcul: `${nd(t)} − ${nd(a)} = ${nd(t - a)}`, phrase: `${p.nom} a acheté ${nd(t - a)} kg de poires.`, schema: parties(t, a, arrondi2(t - a), "b"),
    };
  }
  if (sorte === 1) {
    const a = entier(alea, r.classe === "CM1" ? 1200 : 12000, r.classe === "CM1" ? 98000 : 980000), b = entier(alea, 800, 60000);
    return {
      enonce: `Une ville compte ${n(a)} habitants dans le centre et ${n(b)} habitants dans ses quartiers. Combien d'habitants compte-t-elle en tout ?`,
      calcul: `${n(a)} + ${n(b)} = ${n(a + b)}`, phrase: `La ville compte ${n(a + b)} habitants.`, schema: parties(a + b, a, b, "tout"),
    };
  }
  if (sorte === 2) {
    const t = entier(alea, 30, 95) / 10, a = entier(alea, 5, Math.floor(t * 10) - 5) / 10;
    return {
      enonce: `Un ruban de ${nd(t)} m est coupé en deux morceaux. Le premier mesure ${nd(a)} m. Combien mesure le second ?`,
      calcul: `${nd(t)} − ${nd(a)} = ${nd(t - a)}`, phrase: `Le second morceau mesure ${nd(t - a)} m.`, schema: parties(t, a, arrondi2(t - a), "b"),
    };
  }
  // Au CM2, comme la pizza d'Yseult : des fractions dont un dénominateur est multiple de l'autre.
  const [D, d] = choisir(alea, [[12, 4], [12, 3], [8, 4], [10, 5], [6, 3], [12, 6]] as const);
  const k = D / d, b = entier(alea, 1, d - 1), a = entier(alea, 1, D - k * b - 1), garde = D - a - k * b;
  return {
    enonce: `${p.nom} partage une pizza avec son frère et sa sœur. ${p.Il} donne ${enMots(a, D)} de la pizza à sa sœur et ${enMots(b, d)} à son frère. Quelle fraction de la pizza garde-t-${p.il} pour ${p.il === "il" ? "lui" : "elle"} ?`,
    calcul: `${b}/${d} = ${k * b}/${D} ; ${a}/${D} + ${k * b}/${D} = ${a + k * b}/${D} ; ${D}/${D} − ${a + k * b}/${D} = ${garde}/${D}`,
    phrase: `${p.nom} garde ${enMots(garde, D)} de la pizza.`,
  };
}

function comparaison(alea: () => number): ProblemeCM {
  const p = quelquun(alea), q = quelquun(alea, p.nom);
  const sorte = entier(alea, 0, 2);
  if (sorte === 0) {
    // Comme Alix et Bruno, dans les exemples de réussite : une taille en mètres, un écart en centimètres.
    const a = entier(alea, 140, 175) / 100, ecart = entier(alea, 5, 25);
    return {
      enonce: `${p.nom} mesure ${nd(a)} m. ${p.Il} mesure ${ecart} cm de plus que ${q.nom}. Quelle est la taille de ${q.nom} ?`,
      calcul: `${ecart} cm = ${nd(ecart / 100)} m ; ${nd(a)} − ${nd(ecart / 100)} = ${nd(a - ecart / 100)}`,
      phrase: `${q.nom} mesure ${nd(a - ecart / 100)} m.`, schema: parties(a, arrondi2(a - ecart / 100), ecart / 100, "a"),
    };
  }
  if (sorte === 1) {
    // Comme les bandes de papier d'Anaël et de Léna : une longueur en centimètres et dixièmes, l'autre en dixièmes.
    const e = entier(alea, 2, 6), d = entier(alea, 1, 9), premiere = 10 * e + d;
    const autre = premiere + (alea() < 0.5 ? -1 : 1) * entier(alea, 2, 9), ecart = Math.abs(premiere - autre);
    return {
      enonce: `${p.nom} a construit une bande de papier de ${e} cm et ${enMots(d, 10)} de centimètre. ${q.nom} a construit une bande de ${nombreEnLettres(autre)} dixièmes de centimètre. Quelle est la bande la plus longue ? Quel est l'écart de longueur entre les deux bandes ?`,
      calcul: `${e} cm et ${d} dixièmes = ${premiere} dixièmes ; ${Math.max(premiere, autre)} − ${Math.min(premiere, autre)} = ${ecart} dixièmes`,
      phrase: `La bande de ${premiere > autre ? p.nom : q.nom} est la plus longue ; l'écart est de ${enMots(ecart, 10)} de centimètre.`,
    };
  }
  const a = entier(alea, 2000, 9000), ecart = entier(alea, 150, 1500);
  return {
    enonce: `${p.nom} a ${eu(a)}. ${q.nom} a ${eu(ecart)} de moins que ${p.nom}. Combien d'euros a ${q.nom} ?`,
    calcul: `${e2(a)} − ${e2(ecart)} = ${e2(a - ecart)}`, phrase: `${q.nom} a ${eu(a - ecart)}.`,
    schema: parties(a / 100, (a - ecart) / 100, ecart / 100, "a"),
  };
}

function deuxEtapes(alea: () => number, r: ReglagesProblemesCM): ProblemeCM {
  const p = quelquun(alea);
  const sorte = entier(alea, 0, r.classe === "CM2" ? 3 : 1);
  if (sorte === 0) {
    // Comme Agathe : la distance des trois demi-heures, dont on connaît les deux premières.
    const a = entier(alea, 45, 95) / 10, b = entier(alea, 25, 60) / 10, c = entier(alea, 20, 50) / 10, t = a + b + c;
    return {
      enonce: `${p.nom} a parcouru ${nd(t)} km en 1 h 30 min. ${p.Il} a parcouru ${nd(a)} km pendant la première demi-heure, puis ${nd(b)} km pendant la deuxième. Quelle distance a-t-${p.il} parcourue pendant la dernière demi-heure ?`,
      calcul: `${nd(a)} + ${nd(b)} = ${nd(a + b)} ; ${nd(t)} − ${nd(a + b)} = ${nd(c)}`,
      phrase: `${p.nom} a parcouru ${nd(c)} km pendant la dernière demi-heure.`,
    };
  }
  if (sorte === 1) {
    const t = entier(alea, 400, 2000), b = entier(alea, 60, Math.floor(t / 3)), c = entier(alea, 50, Math.floor(t / 3));
    return {
      enonce: `Une librairie avait ${n(t)} livres. Elle en a vendu ${n(b)} en septembre et ${n(c)} en octobre. Combien lui en reste-t-il ?`,
      calcul: `${n(b)} + ${n(c)} = ${n(b + c)} ; ${n(t)} − ${n(b + c)} = ${n(t - b - c)}`, phrase: `Il reste ${n(t - b - c)} livres à la librairie.`,
    };
  }
  if (sorte === 2) {
    // Comme les fromages de Qassim, au CM2 : un billet, la monnaie rendue, et un prix inconnu.
    const a = 100 * entier(alea, 5, 12), b = entier(alea, 800, 1500), c = entier(alea, 300, 900), paye = a + b + c;
    return {
      enonce: `${p.nom} achète un reblochon à ${eu(a)}, une tranche de beaufort à ${eu(b)} et un camembert. ${p.Il} donne un billet de 50 € au fromager, qui lui rend ${eu(5000 - paye)}. Quel est le prix du camembert ?`,
      calcul: `50 − ${e2(5000 - paye)} = ${e2(paye)} ; ${e2(a)} + ${e2(b)} = ${e2(a + b)} ; ${e2(paye)} − ${e2(a + b)} = ${e2(c)}`,
      phrase: `Le camembert coûte ${eu(c)}.`,
    };
  }
  // Comme les courses de Côme, au CM2 : on cherche ce qu'on avait au départ.
  const depart = entier(alea, 500, 4000), retrait = 1000 * entier(alea, 2, 5), achat = entier(alea, 800, depart + retrait - 300);
  const reste = depart + retrait - achat;
  return {
    enonce: `${p.nom} part faire des courses. ${p.Il} retire d'abord ${eu(retrait)} au distributeur, puis achète un rôti à ${eu(achat)}. En rentrant, il lui reste ${eu(reste)}. Combien d'argent ${p.nom} avait-${p.il} en partant ?`,
    calcul: `${e2(reste)} + ${e2(achat)} = ${e2(reste + achat)} ; ${e2(reste + achat)} − ${e2(retrait)} = ${e2(depart)}`,
    phrase: `${p.nom} avait ${eu(depart)} en partant.`,
  };
}

function comparaisonDeuxEtapes(alea: () => number, r: ReglagesProblemesCM): ProblemeCM {
  const p = quelquun(alea), q = quelquun(alea, p.nom);
  if (r.classe === "CM2" && alea() < 0.5) {
    // Comme Léo et Lucie au CM2 : on connaît ce qu'ils ont à eux deux et l'écart ; on cherche chacun.
    const a = entier(alea, 1200, 3000), ecart = entier(alea, 150, 1000), total = 2 * a + ecart;
    return {
      enonce: `${p.nom} et ${q.nom} ont ${eu(total)} ${p.il === "elle" && q.il === "elle" ? "à elles deux" : "à eux deux"}. ${q.nom} a ${eu(ecart)} de plus que ${p.nom}. Combien chaque enfant a-t-il d'euros ?`,
      calcul: `${e2(total)} − ${e2(ecart)} = ${e2(2 * a)} ; ${e2(2 * a)} ÷ 2 = ${e2(a)} ; ${e2(a)} + ${e2(ecart)} = ${e2(a + ecart)}`,
      phrase: `${p.nom} a ${eu(a)} et ${q.nom} a ${eu(a + ecart)}.`,
    };
  }
  // Comme Léo et Lucie au CM1 : la valeur de l'un, l'écart, et les deux réunis.
  const a = entier(alea, 1500, 4000), ecart = entier(alea, 250, 1200);
  return {
    enonce: `${p.nom} a ${eu(a)}. ${q.nom} a ${eu(ecart)} de plus que ${p.nom}. Combien d'euros les deux enfants ont-ils en tout ?`,
    calcul: `${e2(a)} + ${e2(ecart)} = ${e2(a + ecart)} ; ${e2(a)} + ${e2(a + ecart)} = ${e2(2 * a + ecart)}`,
    phrase: `Les deux enfants ont ${eu(2 * a + ecart)} en tout.`,
  };
}

function partsEgales(alea: () => number, r: ReglagesProblemesCM): ProblemeCM {
  const cm2 = r.classe === "CM2";
  const sorte = entier(alea, 0, 2);
  if (sorte === 0) {
    // Comme les six dictionnaires de la maîtresse de CM1 : le tout.
    const k = entier(alea, 3, 9), prix = entier(alea, 1205, 2995);
    return {
      enonce: `La maîtresse achète ${k} dictionnaires pour la classe. Chaque dictionnaire coûte ${eu(prix)}. Combien doit-elle payer ?`,
      calcul: `${k} × ${e2(prix)} = ${e2(k * prix)}`, phrase: `Elle doit payer ${eu(k * prix)}.`,
      schema: { forme: "parts-egales", tout: { valeur: (k * prix) / 100, connue: false }, part: { valeur: prix / 100, connue: true }, nombre: { valeur: k, connue: true } },
    };
  }
  if (sorte === 1) {
    if (cm2) {
      // Comme les dictionnaires de la maîtresse de CM2 : la valeur d'une part, avec des centimes.
      const k = entier(alea, 3, 9), part = entier(alea, 950, 2490), t = k * part;
      return {
        enonce: `La maîtresse achète ${k} dictionnaires identiques pour la classe. Elle paie ${eu(t)}. Quel est le prix d'un dictionnaire ?`,
        calcul: `${e2(t)} ÷ ${k} = ${e2(part)}`, phrase: `Un dictionnaire coûte ${eu(part)}.`,
        schema: { forme: "parts-egales", tout: { valeur: t / 100, connue: true }, part: { valeur: part / 100, connue: false }, nombre: { valeur: k, connue: true } },
      };
    }
    const k = entier(alea, 3, 8), part = entier(alea, 12, 95);
    return {
      enonce: `${k} amis se partagent équitablement ${k * part} €. Combien d'euros reçoit chacun ?`,
      calcul: `${k * part} ÷ ${k} = ${part}`, phrase: `Chacun reçoit ${part} €.`,
      schema: { forme: "parts-egales", tout: { valeur: k * part, connue: true }, part: { valeur: part, connue: false }, nombre: { valeur: k, connue: true } },
    };
  }
  if (cm2) {
    // Comme les sandwichs de monsieur Dupin : le nombre de parts, quand une part vaut au plus 10.
    const k = entier(alea, 6, 9), nombre = entier(alea, 120, 480);
    return {
      enonce: `À la fête du village, chaque sandwich est vendu avec une boisson pour ${k} €. À la fin de la journée, la recette est de ${n(k * nombre)} €. Combien de sandwichs ont été vendus ?`,
      calcul: `${n(k * nombre)} ÷ ${k} = ${nombre}`, phrase: `${nombre} sandwichs ont été vendus.`,
      schema: { forme: "parts-egales", tout: { valeur: k * nombre, connue: true }, part: { valeur: k, connue: true }, nombre: { valeur: nombre, connue: false } },
    };
  }
  const k = choisir(alea, [6, 10, 12]), boites = entier(alea, 15, 90);
  return {
    enonce: `Un fermier range ${n(k * boites)} œufs dans des boîtes de ${k} œufs. Combien de boîtes remplit-il ?`,
    calcul: `${n(k * boites)} ÷ ${k} = ${boites}`, phrase: `Il remplit ${boites} boîtes.`,
    schema: { forme: "parts-egales", tout: { valeur: k * boites, connue: true }, part: { valeur: k, connue: true }, nombre: { valeur: boites, connue: false } },
  };
}

function comparaisonMultiplicative(alea: () => number, r: ReglagesProblemesCM): ProblemeCM {
  const p = quelquun(alea);
  const fois = entier(alea, 2, 6);
  const sorte = entier(alea, 0, r.classe === "CM2" ? 3 : 2);
  if (sorte === 0) {
    const casque = entier(alea, 18, 45);
    return {
      enonce: `Une trottinette coûte ${fois} fois plus cher qu'un casque. Le casque coûte ${casque} €. Combien coûte la trottinette ?`,
      calcul: `${fois} × ${casque} = ${fois * casque}`, phrase: `La trottinette coûte ${fois * casque} €.`,
      schema: { forme: "comparaison", petit: { valeur: casque, connue: true }, grand: { valeur: fois * casque, connue: false }, fois, noms: ["le casque", "la trottinette"] },
    };
  }
  if (sorte === 1) {
    const casque = entier(alea, 12, 35);
    return {
      enonce: `Un vélo coûte ${fois * casque} €. Un casque coûte ${fois} fois moins cher que le vélo. Combien coûte le casque ?`,
      calcul: `${fois * casque} ÷ ${fois} = ${casque}`, phrase: `Le casque coûte ${casque} €.`,
      schema: { forme: "comparaison", petit: { valeur: casque, connue: false }, grand: { valeur: fois * casque, connue: true }, fois, noms: ["le casque", "le vélo"] },
    };
  }
  if (sorte === 2) {
    // En deux étapes, comme la trottinette et le casque d'Axel au CM1 : combien pour les deux ?
    const casque = entier(alea, 18, 45);
    return {
      enonce: `${p.nom} achète une trottinette et un casque. La trottinette coûte ${fois} fois plus cher que le casque. Le casque coûte ${casque} €. Combien ${p.nom} doit-${p.il} payer ?`,
      calcul: `${fois} × ${casque} = ${fois * casque} ; ${fois * casque} + ${casque} = ${(fois + 1) * casque}`,
      phrase: `${p.nom} doit payer ${(fois + 1) * casque} €.`,
      schema: { forme: "comparaison", petit: { valeur: casque, connue: true }, grand: { valeur: fois * casque, connue: false }, fois, noms: ["le casque", "la trottinette"] },
    };
  }
  // Au CM2, comme Axel qui paie 161,25 € : on connaît le prix des deux, on cherche celui de la trottinette.
  const casque = entier(alea, 1500, 4500), total = (fois + 1) * casque;
  return {
    enonce: `${p.nom} achète une trottinette et un casque. La trottinette coûte ${fois} fois plus cher que le casque. ${p.Il} paie ${eu(total)} en tout. Combien coûte la trottinette ?`,
    calcul: `Le casque, une part ; la trottinette, ${fois} parts ; en tout, ${fois + 1} parts : ${e2(total)} ÷ ${fois + 1} = ${e2(casque)} ; ${fois} × ${e2(casque)} = ${e2(fois * casque)}`,
    phrase: `La trottinette coûte ${eu(fois * casque)}.`,
    schema: { forme: "comparaison", petit: { valeur: casque / 100, connue: false }, grand: { valeur: (fois * casque) / 100, connue: false }, fois, noms: ["le casque", "la trottinette"] },
  };
}

function mixte(alea: () => number, r: ReglagesProblemesCM): ProblemeCM {
  const p = quelquun(alea);
  const sorte = entier(alea, 0, r.classe === "CM2" ? 2 : 1);
  if (sorte === 0) {
    // Comme les pains et les bouteilles d'Izmir : des masses en grammes et en kilogrammes.
    const n1 = entier(alea, 2, 5), m1 = 10 * entier(alea, 12, 35), n2 = entier(alea, 2, 4), m2 = entier(alea, 10, 20) / 10;
    const total = (n1 * m1) / 1000 + n2 * m2;
    return {
      enonce: `${p.nom} achète ${n1} pains aux raisins pesant chacun ${m1} g et ${n2} bouteilles d'eau pesant ${nd(m2)} kg chacune. Quelle est la masse totale de ses achats ?`,
      calcul: `${n1} × ${m1} g = ${n1 * m1} g = ${nd((n1 * m1) / 1000)} kg ; ${n2} × ${nd(m2)} kg = ${nd(n2 * m2)} kg ; ${nd((n1 * m1) / 1000)} + ${nd(n2 * m2)} = ${nd(total)}`,
      phrase: `Ses achats pèsent ${nd(total)} kg.`,
    };
  }
  if (sorte === 1) {
    const n1 = entier(alea, 2, 5), p1 = entier(alea, 150, 450), n2 = entier(alea, 2, 6), p2 = entier(alea, 80, 250);
    const depense = n1 * p1 + n2 * p2, billet = depense < 2000 ? 2000 : 5000;
    const trois = r.classe === "CM2" || alea() < 0.5;
    return {
      enonce: `${p.nom} achète ${n1} cahiers à ${eu(p1)} et ${n2} stylos à ${eu(p2)}.${trois ? ` ${p.Il} paie avec un billet de ${eu(billet)}. Combien lui rend-on ?` : ` Combien dépense-t-${p.il} ?`}`,
      calcul: `${n1} × ${e2(p1)} = ${e2(n1 * p1)} ; ${n2} × ${e2(p2)} = ${e2(n2 * p2)} ; ${e2(n1 * p1)} + ${e2(n2 * p2)} = ${e2(depense)}${trois ? ` ; ${e2(billet)} − ${e2(depense)} = ${e2(billet - depense)}` : ""}`,
      phrase: trois ? `On rend ${eu(billet - depense)} à ${p.nom}.` : `${p.nom} dépense ${eu(depense)}.`,
    };
  }
  // Au CM2, comme Romy : un prix unitaire inconnu, après le billet et la monnaie rendue.
  const n1 = entier(alea, 2, 4), p1 = entier(alea, 90, 180), n2 = entier(alea, 3, 7), p2 = entier(alea, 80, 160);
  const paye = n1 * p1 + n2 * p2;
  return {
    enonce: `${p.nom} achète ${n1} pains aux raisins à ${eu(p1)} l'un et ${n2} chaussons aux pommes. ${p.Il} donne un billet de 20 € au boulanger, qui lui rend ${eu(2000 - paye)}. Quel est le prix d'un chausson aux pommes ?`,
    calcul: `20 − ${e2(2000 - paye)} = ${e2(paye)} ; ${n1} × ${e2(p1)} = ${e2(n1 * p1)} ; ${e2(paye)} − ${e2(n1 * p1)} = ${e2(n2 * p2)} ; ${e2(n2 * p2)} ÷ ${n2} = ${e2(p2)}`,
    phrase: `Un chausson aux pommes coûte ${eu(p2)}.`,
  };
}

function denombrement(alea: () => number, r: ReglagesProblemesCM): ProblemeCM {
  const p = quelquun(alea);
  const sorte = entier(alea, 0, r.classe === "CM2" ? 4 : 2);
  if (sorte === 0) {
    // Comme l'ours en peluche de Félicien.
    const a = entier(alea, 3, 6), b = entier(alea, 2, 4);
    return {
      enonce: `${p.nom} veut habiller son ours en peluche avec un tee-shirt et un pantalon. ${p.Il} a ${a} tee-shirts différents et ${b} pantalons différents. De combien de façons différentes peut-${p.il} habiller son ours ? Fais un tableau ou un arbre.`,
      calcul: `${a} tee-shirts, et pour chacun ${b} pantalons : ${a} × ${b} = ${a * b}`, phrase: `${p.nom} peut habiller son ours de ${a * b} façons différentes.`,
    };
  }
  if (sorte === 1) {
    // Comme les deux dés de Coumba.
    return {
      enonce: `${p.nom} lance deux dés dont les faces sont numérotées de 1 à 6, et ajoute les deux nombres. Donne la liste de tous les résultats possibles.`,
      calcul: "Un tableau à double entrée, les faces du premier dé en ligne, celles du second en colonne : les sommes vont de 1 + 1 à 6 + 6.",
      phrase: "Les résultats possibles sont 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 et 12 : onze résultats.",
    };
  }
  if (sorte === 2) {
    // Les dominos : de 0 à 4 au CM1, comme ceux de Karnish ; jusqu'à 6 au CM2, comme ceux d'Arthur.
    const max = r.classe === "CM2" ? entier(alea, 4, 6) : entier(alea, 3, 4), total = ((max + 1) * (max + 2)) / 2;
    return {
      enonce: `${p.nom} fabrique un jeu de dominos. Chaque domino a deux nombres de points, de 0 à ${max}, et il ne peut pas y avoir deux dominos identiques. Combien de dominos au plus son jeu peut-il contenir ?`,
      calcul: `Une liste organisée : les dominos qui commencent par 0 (${max + 1}), puis par 1 sans redire 0-1 (${max}), … jusqu'à ${max}-${max} (1) : ${Array.from({ length: max + 1 }, (_, i) => max + 1 - i).join(" + ")} = ${total}`,
      phrase: `Le jeu peut contenir ${total} dominos.`,
    };
  }
  if (sorte === 3) {
    const e = entier(alea, 2, 3), pl = entier(alea, 2, 4), d = entier(alea, 2, 3);
    return {
      enonce: `À la cantine, on choisit une entrée parmi ${e}, un plat parmi ${pl} et un dessert parmi ${d}. Combien de menus différents peut-on composer ?`,
      calcul: `${e} × ${pl} × ${d} = ${e * pl * d}`, phrase: `On peut composer ${e * pl * d} menus différents.`,
    };
  }
  // Au CM2, comme la pièce de Telma, lancée trois fois.
  return {
    enonce: `${p.nom} lance une pièce de monnaie trois fois de suite et note chaque fois « pile » ou « face ». Trouve tous les résultats qu'${p.il} aurait pu obtenir.`,
    calcul: "Un arbre : 2 issues au premier lancer, 2 au deuxième, 2 au troisième, 2 × 2 × 2 = 8 : PPP, PPF, PFP, PFF, FPP, FPF, FFP, FFF.",
    phrase: "Il y a 8 résultats possibles.",
  };
}

/** Ce qu'on peut faire avec un stock : « 47 = 6 × 7 + 5, donc 7 ». */
const combienAvec = (stock: number, besoin: number) => Math.floor(stock / besoin);
const detail = (stock: number, besoin: number) => `${n(stock)} = ${n(besoin)} × ${combienAvec(stock, besoin)}${stock % besoin ? ` + ${n(stock % besoin)}` : ""}, donc ${combienAvec(stock, besoin)}`;

/** L'optimisation : plusieurs contraintes, et c'est la plus forte qui décide ; ou le nombre minimum de boîtes. */
function optimisation(alea: () => number, r: ReglagesProblemesCM): ProblemeCM {
  const p = quelquun(alea);
  const sorte = entier(alea, 0, 2);
  // Ce qu'on a de chaque chose : juste de quoi faire `max` objets pour celle qui décide, davantage pour les autres.
  const stocks = (besoins: number[], max: number) => {
    const limite = entier(alea, 0, besoins.length - 1);
    return besoins.map((b, i) => b * (i === limite ? max : max + entier(alea, 1, 3)) + entier(alea, 0, b - 1));
  };
  if (sorte === 0 && r.classe === "CM1") {
    // Comme les bracelets d'Ilyes.
    const besoins = [1, entier(alea, 3, 6), entier(alea, 4, 7), entier(alea, 2, 4)], max = entier(alea, 5, 9);
    const [fils, blanches, vertes, rouges] = stocks(besoins, max);
    return {
      enonce: `${p.nom} veut faire des bracelets. Pour un bracelet, il faut un fil, ${besoins[1]} perles blanches, ${besoins[2]} perles vertes et ${besoins[3]} perles rouges. ${p.Il} a ${fils} fils, ${blanches} perles blanches, ${vertes} perles vertes et ${rouges} perles rouges. Combien de bracelets peut-${p.il} faire au maximum ?`,
      calcul: `Les fils : ${fils} ; les perles blanches : ${detail(blanches, besoins[1])} ; les vertes : ${detail(vertes, besoins[2])} ; les rouges : ${detail(rouges, besoins[3])}. Le plus petit nombre décide.`,
      phrase: `${p.nom} peut faire ${max} bracelets au maximum.`,
    };
  }
  if (sorte === 0) {
    // Comme les étagères de madame Lidon : une planche coupée en morceaux de 2 m, des équerres, des vis.
    const longueur = choisir(alea, [4, 5, 7]), parPlanche = Math.floor(longueur / 2), planches = entier(alea, 4, 8), vis = choisir(alea, [6, 8, 9]);
    const parLesPlanches = planches * parPlanche;
    const limite = entier(alea, 0, 2), max = limite === 0 ? parLesPlanches : parLesPlanches - entier(alea, 1, 3);
    const equerres = 2 * (limite === 1 ? max : max + entier(alea, 1, 4)) + entier(alea, 0, 1);
    const lesVis = vis * (limite === 2 ? max : max + entier(alea, 1, 4)) + entier(alea, 0, vis - 1);
    return {
      enonce: `Pour fabriquer une étagère, il faut une planche de 2 m, 2 équerres et ${vis} vis. On dispose de ${planches} planches de ${longueur} m, de ${equerres} équerres et de ${lesVis} vis. Quel est le nombre maximal d'étagères que l'on peut fabriquer ?`,
      calcul: `Dans une planche de ${longueur} m, on coupe ${parPlanche} planches de 2 m : ${planches} × ${parPlanche} = ${parLesPlanches} ; les équerres : ${detail(equerres, 2)} ; les vis : ${detail(lesVis, vis)}. Le plus petit nombre décide.`,
      phrase: `On peut fabriquer ${max} étagères au maximum.`,
    };
  }
  if (sorte === 1) {
    // Une recette et des provisions : au CM2, la farine en kilogrammes.
    const besoins = [entier(alea, 2, 4), choisir(alea, [150, 200, 250]), choisir(alea, [80, 100, 125])], max = entier(alea, 3, 8);
    const limite = entier(alea, 0, 2);
    const oeufs = besoins[0] * (limite === 0 ? max : max + entier(alea, 1, 3)) + entier(alea, 0, besoins[0] - 1);
    const farine = besoins[1] * (limite === 1 ? max : max + entier(alea, 1, 3)) + 10 * entier(alea, 0, besoins[1] / 10 - 1);
    const sucre = besoins[2] * (limite === 2 ? max : max + entier(alea, 1, 3)) + 5 * entier(alea, 0, besoins[2] / 5 - 1);
    const kg = r.classe === "CM2";
    return {
      enonce: `Pour un gâteau, il faut ${besoins[0]} œufs, ${besoins[1]} g de farine et ${besoins[2]} g de sucre. On a ${oeufs} œufs, ${kg ? `${nd(farine / 1000)} kg` : `${n(farine)} g`} de farine et ${n(sucre)} g de sucre. Combien de gâteaux peut-on faire au maximum ?`,
      calcul: `Les œufs : ${detail(oeufs, besoins[0])} ; la farine : ${kg ? `${nd(farine / 1000)} kg = ${n(farine)} g ; ` : ""}${detail(farine, besoins[1])} ; le sucre : ${detail(sucre, besoins[2])}. Le plus petit nombre décide.`,
      phrase: `On peut faire ${max} gâteaux au maximum.`,
    };
  }
  if (alea() < 0.5) {
    const k = choisir(alea, [6, 10, 12]);
    let oeufs = entier(alea, 40, 150);
    if (oeufs % k === 0) oeufs += entier(alea, 1, k - 1);
    return {
      enonce: `On veut ranger ${oeufs} œufs dans des boîtes de ${k}. Combien de boîtes faut-il au minimum pour ranger tous les œufs ?`,
      calcul: `${oeufs} = ${k} × ${Math.floor(oeufs / k)} + ${oeufs % k} ; il faut une boîte de plus pour les ${oeufs % k} œufs qui restent.`,
      phrase: `Il faut au minimum ${Math.ceil(oeufs / k)} boîtes.`,
    };
  }
  const places = choisir(alea, [40, 50, 60]);
  let eleves = entier(alea, 90, 300);
  if (eleves % places === 0) eleves += entier(alea, 1, places - 1);
  return {
    enonce: `${eleves} élèves partent en sortie dans des cars de ${places} places. Combien de cars faut-il au minimum ?`,
    calcul: `${eleves} = ${places} × ${Math.floor(eleves / places)} + ${eleves % places} ; il faut un car de plus pour les ${eleves % places} élèves qui restent.`,
    phrase: `Il faut au minimum ${Math.ceil(eleves / places)} cars.`,
  };
}

/** Les problèmes de recherche exhaustive du CM2, qui préparent aux algorithmes. */
function algorithme(alea: () => number): ProblemeCM {
  const sorte = entier(alea, 0, 2);
  if (sorte === 0) {
    const aire = choisir(alea, [24, 36, 48, 60]);
    const dims = Array.from({ length: aire }, (_, i) => i + 1).filter((l) => aire % l === 0 && l <= aire / l).map((l) => `${l} cm × ${aire / l} cm`);
    return {
      enonce: `Trouve toutes les dimensions possibles des rectangles dont les côtés mesurent un nombre entier de centimètres et dont l'aire est égale à ${aire} cm².`,
      calcul: `On essaie toutes les largeurs, de 1 cm à ${Math.floor(Math.sqrt(aire))} cm : ${dims.join(" ; ")}`,
      phrase: `Il y a ${dims.length} rectangles possibles.`,
    };
  }
  if (sorte === 1) {
    const [a, b] = [6, 10], total = choisir(alea, [60, 80, 100]);
    const solutions = Array.from({ length: Math.floor(total / a) + 1 }, (_, x) => x).filter((x) => (total - a * x) % b === 0 && total - a * x >= 0)
      .map((x) => `${x} boîtes de ${a} et ${(total - a * x) / b} boîtes de ${b}`);
    return {
      enonce: `On veut ranger ${total} œufs dans des boîtes de ${a} œufs et des boîtes de ${b} œufs. Tous les œufs doivent être dans des boîtes et toutes les boîtes doivent être pleines. Quelles sont toutes les solutions possibles ?`,
      calcul: `On essaie 0, 1, 2… boîtes de ${a}, et l'on regarde si le reste se range dans des boîtes de ${b} : ${solutions.join(" ; ")}`,
      phrase: `Il y a ${solutions.length} solutions.`,
    };
  }
  const eleves = choisir(alea, [30, 45, 36, 63]);
  const groupes = Array.from({ length: eleves }, (_, i) => i + 1).filter((g) => g % 2 === 1 && eleves % g === 0 && g > 1 && g < eleves);
  return {
    enonce: `Il y a ${eleves} élèves dans une classe. Le maître veut faire des groupes qui ont tous le même nombre d'élèves, et un nombre impair d'élèves dans chaque groupe. Quelles sont toutes les solutions possibles ?`,
    calcul: `On cherche les diviseurs impairs de ${eleves}, autres que 1 et ${eleves} : ${groupes.map((g) => `${eleves / g} groupes de ${g}`).join(" ; ")}`,
    phrase: `Il y a ${groupes.length} solutions.`,
  };
}

// ── La proportionnalité ──────────────────────────────────────────────────

/** Des minutes, et leur écriture en heures quand elles dépassent l'heure. */
const minutes = (m: number) => (m < 60 ? `${m} minutes` : `${m} minutes, soit ${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`);

/**
 * En une étape : une seule fois la linéarité multiplicative, « fois plus » ou
 * « fois moins » — les crêpes, la farine, les cerises et le vélo de la
 * séance 1 du livret de CM2, les manuels et les allumettes du programme.
 */
function proportionnalite(alea: () => number): ProblemeCM {
  const k = entier(alea, 2, 5);
  const plus = (b: number, a: number, quoi: string) => `${n(b)} ${quoi}, c'est ${k} fois plus que ${n(a)} ${quoi}`;
  const moins = (b: number, a: number, quoi: string) => `${n(b)} ${quoi}, c'est ${k} fois moins que ${n(a)} ${quoi}`;
  const p = quelquun(alea);
  switch (entier(alea, 0, 5)) {
    case 0: {
      const a = choisir(alea, [2, 3, 4, 6]), va = entier(alea, 2, 6);
      return {
        enonce: `Pour faire des crêpes pour ${a} personnes, il faut ${va} œufs. Combien faut-il d'œufs pour ${k * a} personnes ?`,
        calcul: `${plus(k * a, a, "personnes")} : ${k} × ${va} = ${k * va}`, phrase: `Il faut ${k * va} œufs pour ${k * a} personnes.`,
      };
    }
    case 1: {
      const b = choisir(alea, [2, 3, 4, 6]), vb = 50 * entier(alea, 2, 8);
      return {
        enonce: `Pour faire des crêpes pour ${k * b} personnes, il faut ${k * vb} g de farine. Quelle quantité de farine faut-il pour ${b} personnes ?`,
        calcul: `${moins(b, k * b, "personnes")} : ${k * vb} ÷ ${k} = ${vb}`, phrase: `Il faut ${vb} g de farine pour ${b} personnes.`,
      };
    }
    case 2: {
      // Les cerises « au poids » : le prix est proportionnel à la masse ; de 6 à 12 € le kilogramme.
      const a = choisir(alea, [200, 250, 500]), va = (a * entier(alea, 6, 12)) / 10;
      if (alea() < 0.5) {
        return {
          enonce: `Au marché, les cerises sont vendues au poids. ${a} g de cerises coûtent ${eu(va)}. Combien coûtent ${n(k * a)} g de cerises ?`,
          calcul: `${plus(k * a, a, "g")} : ${k} × ${e2(va)} = ${e2(k * va)}`, phrase: `${n(k * a)} g de cerises coûtent ${eu(k * va)}.`,
        };
      }
      return {
        enonce: `Au marché, les cerises sont vendues au poids. ${n(2 * a)} g de cerises coûtent ${eu(2 * va)}. Combien coûtent ${a} g de cerises ?`,
        calcul: `${a} g, c'est 2 fois moins que ${n(2 * a)} g : ${e2(2 * va)} ÷ 2 = ${e2(va)}`, phrase: `${a} g de cerises coûtent ${eu(va)}.`,
      };
    }
    case 3: {
      const a = choisir(alea, [2, 4, 5]), va = entier(alea, 1, 3);
      return {
        enonce: `${a} manuels de mathématiques identiques pèsent ${va} kg. Quelle est la masse de ${k * a} de ces manuels ?`,
        calcul: `${plus(k * a, a, "manuels")} : ${k} × ${va} = ${k * va}`, phrase: `${k * a} manuels pèsent ${k * va} kg.`,
      };
    }
    case 4: {
      const a = choisir(alea, [5, 6, 10]), va = choisir(alea, [20, 25, 30, 50]);
      return {
        enonce: `${a} allumettes identiques mises bout à bout mesurent ${va} cm. Quelle est la longueur de ${k * a} de ces allumettes mises bout à bout ?`,
        calcul: `${plus(k * a, a, "allumettes")} : ${k} × ${va} = ${k * va}`, phrase: `${k * a} allumettes mesurent ${k * va} cm.`,
      };
    }
    default: {
      const a = choisir(alea, [2, 3, 4]), va = choisir(alea, [8, 10, 12, 15]);
      return {
        enonce: `À vélo, ${p.nom} parcourt ${a} km en ${va} minutes. En roulant à la même vitesse, combien de temps mettra-t-${p.il} pour parcourir ${k * a} km ?`,
        calcul: `${plus(k * a, a, "km")} : ${k} × ${va} = ${k * va}`, phrase: `${p.nom} mettra ${minutes(k * va)}.`,
      };
    }
  }
}

/**
 * En deux étapes de linéarité multiplicative, quand les nombres ne sont pas
 * multiples l'un de l'autre (séances 2 et 3 du livret de CM2) : 6 cubes
 * pèsent 16 kg ; 3 cubes, deux fois moins ; 15 cubes, cinq fois plus.
 */
function proportionnaliteDeuxEtapes(alea: () => number): ProblemeCM {
  const [pa, pb] = choisir(alea, [[2, 3], [2, 5], [3, 2], [3, 4], [3, 5], [4, 3], [4, 5], [5, 2], [5, 3], [2, 7]] as const);
  const etapes = (d: number, a: number, b: number, quoi: string, wa: string, w: string, wb: string, unite: string) =>
    `${d} ${quoi}, c'est ${pa} fois moins que ${a} ${quoi} : ${wa} ÷ ${pa} = ${w}${unite} ; ${b} ${quoi}, c'est ${pb} fois plus que ${d} ${quoi} : ${pb} × ${w} = ${wb}${unite}`;
  const sorte = entier(alea, 0, 3);
  if (sorte === 0) {
    const d = entier(alea, 2, 4), w = entier(alea, 3, 12), a = pa * d, b = pb * d;
    return {
      enonce: `${a} cubes identiques pèsent ${pa * w} kg. Combien pèsent ${b} de ces cubes ?`,
      calcul: etapes(d, a, b, "cubes", String(pa * w), String(w), String(pb * w), " kg"), phrase: `${b} cubes pèsent ${pb * w} kg.`,
    };
  }
  if (sorte === 1) {
    const objet = choisir(alea, ["puzzles", "porte-clés", "ballons", "livres"]);
    const d = choisir(alea, [2, 3, 4, 5, 10, 11]), w = 50 * entier(alea, 6, 120), a = pa * d, b = pb * d;
    return {
      enonce: `${a} ${objet} identiques coûtent ${eu(pa * w)}. Combien coûtent ${b} de ces ${objet} ?`,
      calcul: etapes(d, a, b, objet, e2(pa * w), e2(w), e2(pb * w), " €"), phrase: `${b} ${objet} coûtent ${eu(pb * w)}.`,
    };
  }
  if (sorte === 2) {
    // Comme les 200 feuilles de papier du programme, qui font 24 mm.
    const d = choisir(alea, [25, 50, 100]), w = entier(alea, 2, 9), a = pa * d, b = pb * d;
    return {
      enonce: `${a} feuilles d'un certain papier ont une épaisseur de ${pa * w} mm. Quelle est l'épaisseur de ${b} feuilles de ce papier ?`,
      calcul: etapes(d, a, b, "feuilles", String(pa * w), String(w), String(pb * w), " mm"), phrase: `${b} feuilles ont une épaisseur de ${pb * w} mm.`,
    };
  }
  // Comme les 140 sucettes à 35 € du livret : on cherche la quantité, à partir du prix.
  const [qa, qb] = choisir(alea, [[7, 3], [5, 3], [4, 3], [5, 2], [3, 2], [7, 2]] as const);
  const w = entier(alea, 2, 6), d = choisir(alea, [10, 20, 25]);
  return {
    enonce: `${qa * d} sucettes identiques coûtent ${qa * w} €. Combien de sucettes peut-on avoir pour ${qb * w} € ?`,
    calcul: `${w} €, c'est ${qa} fois moins que ${qa * w} € : ${qa * d} ÷ ${qa} = ${d} sucettes ; ${qb * w} €, c'est ${qb} fois plus que ${w} € : ${qb} × ${d} = ${qb * d} sucettes`,
    phrase: `On peut avoir ${qb * d} sucettes pour ${qb * w} €.`,
  };
}

/**
 * La linéarité additive, en une étape (séance 4 du livret de CM2) : le prix
 * de 13 écharpes, c'est celui de 4 écharpes et celui de 9 ; la tour de 14
 * cubes, c'est celle de 20 moins celle de 6.
 */
function proportionnaliteAdditive(alea: () => number): ProblemeCM {
  const [a, b] = choisir(alea, [[4, 9], [6, 20], [3, 8], [5, 7], [4, 11], [6, 14], [5, 12], [3, 10]] as const);
  const cible = choisir(alea, ["somme", "difference", "deux-b", "deux-a"] as const);
  const t = cible === "somme" ? a + b : cible === "difference" ? b - a : cible === "deux-b" ? 2 * b + a : b + 2 * a;
  const decompose = cible === "somme" ? `${t} = ${a} + ${b}` : cible === "difference" ? `${t} = ${b} − ${a}` : cible === "deux-b" ? `${t} = ${b} + ${b} + ${a}` : `${t} = ${b} + ${a} + ${a}`;
  const calcule = (va: string, vb: string) =>
    cible === "somme" ? `${va} + ${vb}` : cible === "difference" ? `${vb} − ${va}` : cible === "deux-b" ? `${vb} + ${vb} + ${va}` : `${vb} + ${va} + ${va}`;
  if (alea() < 0.5) {
    const u = entier(alea, 6, 15);
    return {
      enonce: `Des écharpes sont toutes vendues au même prix. ${a} écharpes coûtent ${a * u} € et ${b} écharpes coûtent ${b * u} €. Combien coûtent ${t} écharpes ?`,
      calcul: `${decompose} : ${calcule(String(a * u), String(b * u))} = ${t * u}`, phrase: `${t} écharpes coûtent ${t * u} €.`,
    };
  }
  const u = choisir(alea, [1.5, 2, 2.5, 3]);
  return {
    enonce: `Une tour de ${a} cubes emboîtables identiques mesure ${nd(a * u)} cm. Une tour de ${b} de ces cubes mesure ${nd(b * u)} cm. Combien mesure une tour de ${t} cubes ?`,
    calcul: `${decompose} : ${calcule(nd(a * u), nd(b * u))} = ${nd(t * u)}`, phrase: `Une tour de ${t} cubes mesure ${nd(t * u)} cm.`,
  };
}

/**
 * Deux procédures combinées, choisies selon les nombres (séance 5 du livret
 * de CM2) : 10 pots coûtent 22 € ; 5 pots, deux fois moins ; 15 pots, 10 pots
 * et 5 pots. Et, quand aucune relation simple n'apparaît, le passage par
 * l'unité du programme : 3 plaques de carton font 24 mm, et 5 plaques ?
 */
function proportionnaliteCombinee(alea: () => number): ProblemeCM {
  if (alea() < 0.25) {
    const plaques = choisir(alea, [3, 4, 6, 7]), une = entier(alea, 3, 9);
    let voulu = entier(alea, 2, 11);
    const pgcd = (x: number, y: number): number => (y ? pgcd(y, x % y) : x);
    while (pgcd(voulu, plaques) !== 1) voulu = entier(alea, 2, 11);
    return {
      enonce: `${plaques} plaques d'un certain carton ont une épaisseur de ${plaques * une} mm. Quelle est l'épaisseur de ${voulu} plaques de ce carton ?`,
      calcul: `Aucune relation simple entre ${plaques} et ${voulu} : on passe par une plaque. ${plaques * une} ÷ ${plaques} = ${une} mm ; ${voulu} × ${une} = ${voulu * une} mm`,
      phrase: `${voulu} plaques ont une épaisseur de ${voulu * une} mm.`,
    };
  }
  const [a, m] = choisir(alea, [[10, 2], [10, 5], [20, 4], [20, 5], [20, 2], [100, 4], [200, 4]] as const);
  const s = a / m, plus = alea() < 0.6, t = plus ? a + s : a - s;
  const relie = (quoi: string, va: string, vs: string, vt: string) =>
    `${s} ${quoi}, c'est ${m} fois moins que ${a} ${quoi} : ${va} ÷ ${m} = ${vs} ; ${t} ${quoi}, c'est ${a} ${quoi} ${plus ? "et" : "moins"} ${s} ${quoi} : ${va} ${plus ? "+" : "−"} ${vs} = ${vt}`
    + (t % s === 0 ? ` (ou ${t / s} × ${vs})` : "");
  if (a < 100) {
    const objet = choisir(alea, ["pots de riz au lait", "tasses", "tubes de dentifrice"]);
    const vs = 10 * entier(alea, 25, 160), va = m * vs, vt = plus ? va + vs : va - vs;
    return {
      enonce: `${a} ${objet} identiques coûtent ${eu(va)}. Combien coûtent ${t} ${objet} ?`,
      calcul: relie(objet, e2(va), e2(vs), e2(vt)), phrase: `${t} ${objet} coûtent ${eu(vt)}.`,
    };
  }
  // Comme la voiture et le camion du livret : des litres d'essence pour des kilomètres.
  const vehicule = choisir(alea, [["Une voiture", "elle", "La voiture"], ["Un camion", "il", "Le camion"]] as const);
  const w = entier(alea, 2, 8), va = m * w, vt = plus ? va + w : va - w;
  return {
    enonce: `${vehicule[0]} consomme ${va} L d'essence pour parcourir ${a} km. Combien de litres consomme-t-${vehicule[1]} pour parcourir ${t} km ?`,
    calcul: relie("km", String(va), String(w), String(vt)), phrase: `${vehicule[2]} consomme ${vt} L pour ${t} km.`,
  };
}

/** Dire si deux grandeurs sont proportionnelles, et pourquoi. */
function identifierProportionnalite(alea: () => number): ProblemeCM {
  const situations: [string, boolean, string][] = [
    ["L'âge d'une personne et sa taille.", false, "À quarante ans, on n'est pas deux fois plus grand qu'à vingt ans."],
    ["Le nombre de manuels identiques d'une pile et la masse de la pile.", true, "S'il y a trois fois plus de manuels, la pile est trois fois plus lourde."],
    ["Le nombre de baguettes achetées et le prix payé, quand la baguette coûte toujours le même prix.", true, "Deux fois plus de baguettes coûtent deux fois plus cher."],
    ["La pointure d'un enfant et son âge.", false, "La pointure ne double pas quand l'âge double."],
    ["Le nombre de litres d'essence et le prix payé à la pompe.", true, "Le prix d'un litre ne change pas : deux fois plus de litres coûtent deux fois plus."],
    ["Le nombre d'élèves d'une classe et la note de la classe à un contrôle.", false, "La note ne dépend pas du nombre d'élèves."],
    ["La masse de cerises achetées au poids et le prix payé.", true, "Si j'achète deux fois moins de cerises, cela coûte deux fois moins cher."],
  ];
  const [quoi, oui, raison] = choisir(alea, melanger(alea, situations));
  return {
    enonce: `Ces deux grandeurs sont-elles proportionnelles ? Explique pourquoi. ${quoi}`,
    calcul: raison, phrase: oui ? "Oui, elles sont proportionnelles." : "Non, elles ne sont pas proportionnelles.",
  };
}

const FABRIQUES: Record<SorteProblemeCM, (alea: () => number, r: ReglagesProblemesCM) => ProblemeCM> = {
  "partie-tout": partieTout, comparaison, "deux-etapes": deuxEtapes, "comparaison-deux-etapes": comparaisonDeuxEtapes,
  "parts-egales": partsEgales, "comparaison-multiplicative": comparaisonMultiplicative, mixte, denombrement, optimisation, algorithme,
  proportionnalite, "proportionnalite-deux-etapes": proportionnaliteDeuxEtapes, "proportionnalite-additive": proportionnaliteAdditive,
  "proportionnalite-combinee": proportionnaliteCombinee, "identifier-proportionnalite": identifierProportionnalite,
};

export function problemesCM(r: ReglagesProblemesCM, graine: number): ProblemeCM[] {
  const alea = hasard(graine);
  const sortie: ProblemeCM[] = [];
  const vus = new Set<string>();
  for (let garde = 0; sortie.length < Math.max(1, Math.min(8, r.combien)) && garde < 400; garde++) {
    const sorte = r.sortes[sortie.length % r.sortes.length];
    const pb = FABRIQUES[sorte](alea, r);
    if (vus.has(pb.enonce)) continue;
    vus.add(pb.enonce);
    sortie.push(pb);
  }
  return sortie;
}

// ── La feuille ───────────────────────────────────────────────────────────

const PHASES = "Je comprends : je redis l'histoire. Je modélise : un schéma, une opération. Je calcule. Je réponds par une phrase, et je vérifie que c'est possible.";

/** Un nombre de parts cherché trop grand pour dessiner chaque part : le corrigé garde les deux premières et les points de suite. */
const tropDeParts = (s: Schema) => s.forme === "parts-egales" && !s.nombre.connue && s.nombre.valeur > 12;

export function htmlProblemesCM(r: ReglagesProblemesCM, graine: number): string {
  const problemes = problemesCM(r, graine);
  const titre = r.titre ?? "Résoudre des problèmes";
  const bloc = (pb: ProblemeCM, i: number) => `<section class="pc-probleme"><div class="pc-numero">${i + 1}</div><div class="pc-contenu">`
    + `<p class="pc-enonce">${escapeHtml(pb.enonce)}</p><div class="pc-cadre"></div>`
    + `<div class="pc-reponse"><div>Calcul : <span class="pc-ligne"></span></div><div>Réponse : <span class="pc-ligne"></span></div></div></div></section>`;
  const corrige = (pb: ProblemeCM, i: number) => `<section class="pc-probleme"><div class="pc-numero">${i + 1}</div><div class="pc-contenu">`
    + `<p class="pc-enonce pc-rappel">${escapeHtml(pb.enonce)}</p>${pb.schema ? `<div class="pc-schema">${schemaSvg(pb.schema, tropDeParts(pb.schema) ? "nombres" : "corrige", STYLE_CLASSE)}</div>` : ""}`
    + `<p class="pc-solution"><b>Calcul :</b> ${escapeHtml(pb.calcul)} · <b>Réponse :</b> ${escapeHtml(pb.phrase)}</p></div></section>`;
  return feuille(`<div class="page"><div class="titre">${escapeHtml(titre)}</div><div class="sous">Prénom : ........................................ Date : ........................</div>`
    + `<div class="regle"><b>Résous</b>${PHASES}</div>${problemes.map(bloc).join("")}</div>`
    + `<div class="page corrige"><div class="titre">${escapeHtml(titre)} — corrigé</div>${problemes.map(corrige).join("")}</div>`, "pc");
}

export const STYLE_PROBLEMES_CM = `
  .feuille.pc .pc-probleme { display: flex; gap: 3mm; margin: 0 0 5mm; page-break-inside: avoid; break-inside: avoid; }
  .feuille.pc .pc-numero { flex: none; width: 7mm; height: 7mm; border-radius: 50%; background: #1c2233; color: #fff; font-weight: 700; display: flex; align-items: center; justify-content: center; font-size: 13px; }
  .feuille.pc .pc-contenu { flex: 1; }
  .feuille.pc .pc-enonce { font-size: 15px; line-height: 1.55; margin: 0 0 2.5mm; }
  .feuille.pc .pc-rappel { font-size: 13px; color: #4b5266; }
  .feuille.pc .pc-cadre { height: 34mm; border: 1.2px dashed #9aa0b4; border-radius: 2mm; margin: 0 0 2.5mm; }
  .feuille.pc .pc-reponse > div { font-size: 14px; margin: 0 0 2.5mm; display: flex; gap: 2mm; align-items: flex-end; }
  .feuille.pc .pc-ligne { flex: 1; border-bottom: 1px dotted #9aa0b4; height: 5mm; }
  .feuille.pc .pc-schema { margin: 0 0 2mm; }
  .feuille.pc .pc-schema svg { max-width: 120mm; height: auto; }
  .feuille.pc .pc-solution { font-size: 13.5px; line-height: 1.5; margin: 0; }
`;
