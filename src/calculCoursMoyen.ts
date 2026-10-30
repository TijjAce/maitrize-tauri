// Le calcul posé du cours moyen, et ce qui l'entoure.
//
// Programme de mathématiques du cycle 3 (2025), « Les quatre opérations » :
// au CM1, poser des additions et des soustractions de décimaux, des
// multiplications de deux entiers et d'un décimal par un entier inférieur à
// 10, des divisions euclidiennes par un diviseur à un chiffre ; au CM2, la
// multiplication d'un décimal par un entier et la division décimale — un
// dividende entier ou décimal, un diviseur à un chiffre. Et, aux deux
// niveaux, estimer un résultat et calculer avec des parenthèses.
//
// Chaque opération a son quadrillage, une case par chiffre ; la virgule se
// pose sur le trait de la case, pour que les chiffres restent alignés rang
// par rang. La division se pose en potence ; le corrigé écrit les
// soustractions successives, et l'élève apprend à « abaisser » le chiffre
// suivant. Les nombres sont tirés au sort ; le corrigé suit.
//
// Avant la potence, ce que la séquence de la division du manuel du CRPE de
// l'enseignant fait faire : le quotient et le reste en ligne — 47 = 9 × 5 + 2
// —, puis le partage rang par rang, les centaines d'abord, le matériel
// dessiné à côté du tableau. Et, pour qui est prêt, un diviseur à deux
// chiffres, au-delà du programme du CM1. C'est l'atelier « Le calcul — CM1,
// CM2 » de Fabriquer : les feuilles des séquences s'y refont.

import { feuille } from "./cartesImprimables";
import { REGLAGES_CUBES, dessinerCubes } from "./cubesNumeration";
import { hasard } from "./hasard";
import { choisir, entier, fr } from "./nombres";
import { escapeHtml } from "./print";

export type ExerciceCalculCM =
  | "addition-decimaux" | "soustraction-decimaux" | "multiplication-entiers" | "multiplication-decimal"
  | "quotient-reste" | "division-partages" | "division-euclidienne" | "division-decimale" | "parentheses" | "estimer";

export const EXERCICES_CALCUL_CM: { id: ExerciceCalculCM; libelle: string }[] = [
  { id: "addition-decimaux", libelle: "Additions posées de décimaux" },
  { id: "soustraction-decimaux", libelle: "Soustractions posées de décimaux" },
  { id: "multiplication-entiers", libelle: "Multiplications posées de deux entiers" },
  { id: "multiplication-decimal", libelle: "Multiplier un décimal par un entier" },
  { id: "quotient-reste", libelle: "Le quotient et le reste, en ligne : 47 = 9 × … + …" },
  { id: "division-partages", libelle: "Diviser par partages : centaines, dizaines, unités" },
  { id: "division-euclidienne", libelle: "Divisions euclidiennes, en potence" },
  { id: "division-decimale", libelle: "Divisions décimales, par un chiffre" },
  { id: "parentheses", libelle: "Calculer avec des parenthèses" },
  { id: "estimer", libelle: "Estimer un résultat" },
];

export interface ReglagesCalculCM {
  classe: "CM1" | "CM2";
  exercice: ExerciceCalculCM;
  combien: number;
  /** Les nombres déjà placés dans le quadrillage ; sinon, l'élève pose l'opération lui-même. */
  posees: boolean;
  /** Les chiffres du second facteur d'une multiplication d'entiers : 2 ou 3. */
  chiffresDuSecond?: 2 | 3;
  /** La division décimale : un dividende entier, ou décimal. */
  dividende?: "entier" | "decimal";
  /**
   * Les chiffres du diviseur d'une division euclidienne : un, comme le
   * programme du CM1 ; deux, comme 785 ÷ 25, au-delà — le manuel du CRPE de
   * l'enseignant y va, pour qui est prêt.
   */
  diviseur?: 1 | 2;
  /** Les additions et soustractions de décimaux : des parties décimales de longueurs quelconques, ou toujours différentes, comme 12,47 + 2,7. */
  decimales?: "melange" | "differentes";
  /** Les partages : le dividende dessiné en plaques, barres et cubes, à côté de son tableau. */
  materiel?: boolean;
  /**
   * Les divisions d'une évaluation : la première a un quotient qui commence
   * au deuxième chiffre du dividende — 256 ÷ 9 —, la deuxième un zéro au
   * quotient — 824 ÷ 4 —, les cas que le manuel du CRPE veut y voir.
   */
  difficultes?: boolean;
  titre?: string;
}

export const REGLAGES_CALCUL_CM: ReglagesCalculCM = { classe: "CM1", exercice: "addition-decimaux", combien: 6, posees: true };

/** Le plus d'opérations sur une feuille : quatre divisions, en potence ou en partages, qui prennent de la hauteur ; douze sinon. */
export const combienAuPlus = (exercice: ExerciceCalculCM) => (/division/.test(exercice) ? 4 : 12);

/** Les exercices qui se font dans un quadrillage : on y place les nombres, ou l'élève les pose. */
export const sePose = (exercice: ExerciceCalculCM) => !["quotient-reste", "division-partages", "parentheses", "estimer"].includes(exercice);

/** Les réglages tels que l'atelier les relit : ce qui manque ou ne se lit pas reprend sa valeur par défaut. */
export function reglagesCalculCMSurs(brut: Partial<ReglagesCalculCM> | null | undefined): ReglagesCalculCM {
  const b = brut ?? {};
  const exercice = EXERCICES_CALCUL_CM.some((e) => e.id === b.exercice) ? b.exercice! : REGLAGES_CALCUL_CM.exercice;
  return {
    ...b,
    classe: b.classe === "CM2" ? "CM2" : "CM1",
    exercice,
    combien: Math.max(1, Math.min(combienAuPlus(exercice), Math.round(Number(b.combien)) || REGLAGES_CALCUL_CM.combien)),
    posees: typeof b.posees === "boolean" ? b.posees : REGLAGES_CALCUL_CM.posees,
  };
}

/** Le titre d'une feuille qu'on n'a pas nommée : l'exercice, et ce qui le précise. */
export function titreCalculCM(r: Pick<ReglagesCalculCM, "exercice" | "diviseur">): string {
  if (r.exercice === "division-euclidienne") return r.diviseur === 2 ? "Divisions en potence, par un nombre à deux chiffres" : "Divisions en potence, par un chiffre";
  return EXERCICES_CALCUL_CM.find((e) => e.id === r.exercice)?.libelle ?? "Calcul";
}

// ── Les nombres ──────────────────────────────────────────────────────────

/** Un nombre décimal exact, en centièmes ou millièmes : sa valeur entière et le nombre de chiffres après la virgule. */
interface Dec { v: number; d: number }

/** Un décimal écrit à la française, sans zéro inutile après la virgule : 68,0 s'écrit 68. */
const ecrire = (x: Dec) => (x.d ? fr(x.v / 10 ** x.d, x.d).replace(/,?0+$/, "") : fr(x.v));
/** Les chiffres d'un nombre, la partie décimale complétée à `d` chiffres. */
function chiffres(x: Dec, d: number): { entiers: string[]; decimales: string[]; zeros: number } {
  const brut = String(Math.round(x.v * 10 ** (d - x.d)));
  const s = brut.padStart(d + 1, "0");
  return { entiers: s.slice(0, s.length - d).split(""), decimales: d ? s.slice(-d).split("") : [], zeros: d - x.d };
}

// ── Le quadrillage des additions, soustractions et multiplications ────────

interface Ligne { cases: string[]; signe?: string; classe?: string; virgule?: number; zeros?: number }

/**
 * Un quadrillage : des lignes de chiffres alignés à droite, la virgule posée
 * après la case `virgule` (comptée depuis la droite), les zéros ajoutés en
 * gris au corrigé.
 */
function quadrillage(lignes: Ligne[], largeur: number): string {
  const rangees = lignes.map((l) => {
    const vides = largeur - l.cases.length;
    const cellules = l.cases.map((c, i) => {
      const depuisLaDroite = l.cases.length - 1 - i;
      const virgule = l.virgule !== undefined && depuisLaDroite === l.virgule ? '<span class="cm-virgule">,</span>' : "";
      const zero = l.zeros && depuisLaDroite < l.zeros ? ' class="cm-zero"' : "";
      return `<td${zero}>${escapeHtml(c)}${virgule}</td>`;
    }).join("");
    return `<tr class="${l.classe ?? ""}"><td class="cm-signe">${l.signe ?? ""}</td>${"<td></td>".repeat(Math.max(0, vides))}${cellules}</tr>`;
  });
  return `<table class="cm-grille">${rangees.join("")}</table>`;
}

const vides = (n: number) => Array.from({ length: n }, () => "");

interface Operation {
  enLigne: string; reponse: string; exercice: string; corrige: string;
  /** Une division : son quotient commence-t-il au deuxième chiffre du dividende ? A-t-il un zéro ? */
  difficultes?: { premier: boolean; zero: boolean };
}

/** Une addition ou une soustraction de décimaux, alignée sur la virgule. */
function additionOuSoustraction(a: Dec, b: Dec, moins: boolean, posee: boolean): Operation {
  const d = Math.max(a.d, b.d);
  const va = a.v * 10 ** (d - a.d), vb = b.v * 10 ** (d - b.d);
  const r: Dec = { v: moins ? va - vb : va + vb, d };
  const ca = chiffres(a, d), cb = chiffres(b, d), cr = chiffres(r, d);
  const largeur = Math.max(ca.entiers.length, cb.entiers.length, cr.entiers.length) + d + (moins ? 0 : 1);
  // Les retenues de l'addition, au-dessus du rang qu'elles rejoignent ; la case la plus à droite est le rang 0.
  const retenues: string[] = [];
  if (!moins) {
    const vers: number[] = [0];
    let ret = 0;
    for (let p = 0; p < largeur; p++) {
      ret = Math.floor((Math.floor(va / 10 ** p) % 10 + Math.floor(vb / 10 ** p) % 10 + ret) / 10);
      vers[p + 1] = ret;
    }
    for (let i = 0; i < largeur; i++) retenues.push(vers[largeur - 1 - i] ? "1" : "");
  }
  const ligne = (c: { entiers: string[]; decimales: string[]; zeros: number }, montre: boolean, corrige: boolean): string[] =>
    (montre ? [...c.entiers, ...c.decimales.map((x, i) => (!corrige && i >= c.decimales.length - c.zeros ? "" : x))] : vides(c.entiers.length + c.decimales.length));
  const lignes = (corrige: boolean): Ligne[] => [
    ...(!moins ? [{ cases: corrige ? retenues.slice(-largeur) : vides(largeur), classe: "cm-retenues" }] : []),
    { cases: ligne(ca, posee || corrige, corrige), virgule: d && (posee || corrige) ? d : undefined, zeros: corrige ? ca.zeros : 0 },
    { cases: ligne(cb, posee || corrige, corrige), signe: posee || corrige ? (moins ? "−" : "+") : "", classe: "cm-dernier", virgule: d && (posee || corrige) ? d : undefined, zeros: corrige ? cb.zeros : 0 },
    { cases: corrige ? [...cr.entiers, ...cr.decimales] : vides(largeur), virgule: corrige && d ? d : undefined },
  ];
  return {
    enLigne: `${ecrire(a)} ${moins ? "−" : "+"} ${ecrire(b)}`, reponse: ecrire(r),
    exercice: quadrillage(lignes(false), largeur), corrige: quadrillage(lignes(true), largeur),
  };
}

/** Une multiplication posée : un entier ou un décimal par un entier ; les produits partiels quand le second facteur a plusieurs chiffres. */
function multiplication(a: Dec, b: number, posee: boolean): Operation {
  const resultat: Dec = { v: a.v * b, d: a.d };
  const chiffresB = String(b).split("").reverse().map(Number);
  // Un produit partiel par chiffre du second facteur ; pas de ligne pour un zéro — 876 × 208 n'en a que deux.
  const partiels = chiffresB.length > 1 ? chiffresB.flatMap((c, i) => (c ? [a.v * c * 10 ** i] : [])) : [];
  const largeur = Math.max(String(resultat.v).length, String(a.v).length + 1, ...partiels.map((p) => String(p).length)) + 1;
  const cases = (n: number) => String(n).split("");
  const lignes = (corrige: boolean): Ligne[] => [
    { cases: posee || corrige ? cases(a.v) : vides(String(a.v).length), virgule: a.d && (posee || corrige) ? a.d : undefined },
    { cases: posee || corrige ? cases(b) : vides(String(b).length), signe: posee || corrige ? "×" : "", classe: "cm-dernier" },
    ...partiels.map((p, i) => ({ cases: corrige ? cases(p) : vides(String(p).length), signe: i > 0 ? "+" : "", classe: i === partiels.length - 1 ? "cm-dernier" : "" })),
    { cases: corrige ? cases(resultat.v) : vides(String(resultat.v).length), virgule: corrige && a.d ? a.d : undefined },
  ];
  return {
    enLigne: `${ecrire(a)} × ${fr(b)}`, reponse: ecrire(resultat),
    exercice: quadrillage(lignes(false), largeur), corrige: quadrillage(lignes(true), largeur),
  };
}

// ── La division, en potence ──────────────────────────────────────────────

interface EtapeDeDivision { fin: number; produit: number; reste: number }

/**
 * Les étapes d'une division par un chiffre : à chaque étape, le dividende
 * partiel qui se termine au chiffre `fin`, ce qu'on retranche, ce qui reste.
 * `chiffresDuDividende` compte les zéros ajoutés après la virgule pour une
 * division décimale.
 */
export function etapesDeDivision(chiffresDuDividende: number[], diviseur: number): { quotient: number[]; etapes: EtapeDeDivision[] } {
  let fin = 0, partiel = chiffresDuDividende[0];
  while (partiel < diviseur && fin < chiffresDuDividende.length - 1) partiel = partiel * 10 + chiffresDuDividende[++fin];
  const quotient: number[] = [], etapes: EtapeDeDivision[] = [];
  for (;;) {
    const q = Math.floor(partiel / diviseur);
    quotient.push(q);
    etapes.push({ fin, produit: q * diviseur, reste: partiel - q * diviseur });
    if (fin === chiffresDuDividende.length - 1) break;
    partiel = (partiel - q * diviseur) * 10 + chiffresDuDividende[++fin];
  }
  return { quotient, etapes };
}

/** Une division posée : le dividende (décimal ou non) à gauche, le diviseur à droite, le quotient dessous ; les étapes au corrigé. */
function division(dividende: Dec, diviseur: number, decimalesDuQuotient: number, posee: boolean): Operation {
  // Les chiffres du dividende, prolongés de zéros jusqu'aux décimales voulues du quotient.
  const ajoutes = Math.max(0, decimalesDuQuotient - dividende.d);
  const v = dividende.v * 10 ** ajoutes, d = dividende.d + ajoutes;
  const ch = String(v).padStart(d + 1, "0").split("").map(Number);
  const virguleApres = ch.length - d - 1;
  const { quotient, etapes } = etapesDeDivision(ch, diviseur);
  // Le chiffre k du quotient vient du dividende partiel qui se termine au chiffre `etapes[0].fin + k` : la virgule du quotient
  // suit le chiffre qui finit au rang des unités du dividende.
  const premier = etapes[0].fin;
  const virguleDuQuotient = d ? virguleApres - premier : -1;
  const reste = etapes[etapes.length - 1].reste;
  const largeurGauche = ch.length, largeurDroite = Math.max(String(diviseur).length, quotient.length) + 1;
  const cellule = (texte: string, virgule = false, classe = "") => `<td${classe ? ` class="${classe}"` : ""}>${escapeHtml(texte)}${virgule ? '<span class="cm-virgule">,</span>' : ""}</td>`;
  const gauche = (texteParColonne: (string | undefined)[], virgules: boolean[] = [], gris = 0) =>
    Array.from({ length: largeurGauche }, (_, i) => cellule(texteParColonne[i] ?? "", virgules[i] ?? false, i >= largeurGauche - gris ? "cm-g cm-zero" : "cm-g")).join("");
  const droite = (contenu: string[], classe = "", virgule = -1) =>
    Array.from({ length: largeurDroite }, (_, i) => cellule(contenu[i] ?? "", i === virgule, classe)).join("");
  const rangees = (corrige: boolean) => {
    const montre = posee || corrige;
    // Le dividende tel qu'on le donne ; au corrigé, les zéros qu'on ajoute après la virgule pour continuer, en gris.
    const visibles = montre ? ch.slice(0, corrige ? ch.length : ch.length - ajoutes).map(String) : [];
    const virgules = ch.map((_, i) => i === virguleApres && ((montre && dividende.d > 0) || (corrige && ajoutes > 0)));
    // Un chiffre par case, au diviseur aussi : 25 en prend deux.
    const ligneDuDividende = `<tr><td class="cm-signe"></td>${gauche(visibles, virgules, corrige ? ajoutes : 0)}`
      + `<td class="cm-potence"></td>${droite(montre ? String(diviseur).split("") : [], "cm-diviseur")}</tr>`;
    const lignes: string[] = [ligneDuDividende];
    const pas = corrige ? etapes : [];
    const nombreDeLignes = Math.max(2, etapes.length * 2);
    for (let k = 0; k < nombreDeLignes; k++) {
      let contenu: (string | undefined)[] = [];
      let signe = "";
      const e = pas[Math.floor(k / 2)];
      if (e) {
        if (k % 2 === 0) {
          const t = String(e.produit).split("");
          contenu = Array(largeurGauche).fill(undefined);
          t.forEach((c, j) => { contenu[e.fin - (t.length - 1) + j] = c; });
          signe = "−";
        } else {
          const suivante = etapes[Math.floor(k / 2) + 1];
          const t = suivante ? String(e.reste * 10 + ch[suivante.fin]).split("") : String(e.reste).split("");
          const finLigne = suivante ? suivante.fin : e.fin;
          contenu = Array(largeurGauche).fill(undefined);
          t.forEach((c, j) => { contenu[finLigne - (t.length - 1) + j] = c; });
        }
      }
      const quotientIci = k === 0 ? droite(corrige ? quotient.map(String) : [], "cm-quotient", corrige ? virguleDuQuotient : -1) : droite([]);
      lignes.push(`<tr class="${e && k % 2 === 0 ? "cm-dernier" : ""}"><td class="cm-signe">${signe}</td>${gauche(contenu)}<td class="cm-potence"></td>${quotientIci}</tr>`);
    }
    return `<table class="cm-grille cm-division">${lignes.join("")}</table>`;
  };
  const q: Dec = { v: Number(quotient.join("")), d: d ? quotient.length - 1 - virguleDuQuotient : 0 };
  return {
    enLigne: `${ecrire(dividende)} ÷ ${diviseur}`,
    reponse: d ? ecrire(q) : `quotient ${fr(q.v)}, reste ${reste}`,
    exercice: rangees(false), corrige: rangees(true),
    difficultes: { premier: premier > 0, zero: quotient.slice(1).includes(0) },
  };
}

// ── Le tirage ────────────────────────────────────────────────────────────

/** Un décimal au sort : autant de chiffres entiers, autant de décimales. */
function unDecimal(alea: () => number, chiffresEntiers: number, decimales: number): Dec {
  const v = entier(alea, 10 ** (chiffresEntiers - 1), 10 ** chiffresEntiers - 1) * 10 ** decimales + entier(alea, 1, 10 ** decimales - 1);
  return { v, d: decimales };
}

/** Un décimal dont le dernier chiffre après la virgule n'est pas un zéro : il en montre bien `decimales`. */
function decimalPlein(alea: () => number, chiffresEntiers: number, decimales: number): Dec {
  const x = unDecimal(alea, chiffresEntiers, decimales);
  return x.v % 10 ? x : { v: x.v + entier(alea, 1, 9), d: decimales };
}

/** Les parties décimales de deux longueurs différentes : un et deux chiffres, comme 12,47 + 2,7 ; au CM2, parfois trois. */
const LONGUEURS_DIFFERENTES: Record<ReglagesCalculCM["classe"], [number, number][]> = {
  CM1: [[2, 1], [1, 2]],
  CM2: [[2, 1], [1, 2], [2, 1], [1, 2], [3, 1], [2, 3]],
};

function tirer(r: ReglagesCalculCM, alea: () => number): Operation | null {
  const cm1 = r.classe === "CM1";
  switch (r.exercice) {
    case "addition-decimaux":
    case "soustraction-decimaux": {
      const moins = r.exercice === "soustraction-decimaux";
      let a: Dec, b: Dec;
      if (r.decimales === "differentes") {
        const [da, db] = choisir(alea, LONGUEURS_DIFFERENTES[r.classe]);
        a = decimalPlein(alea, entier(alea, 1, cm1 ? 2 : 3), da);
        b = decimalPlein(alea, entier(alea, 1, 2), db);
      } else {
        // Des décimaux qui n'ont pas toujours le même nombre de chiffres après la virgule : 12,5 + 3,75.
        a = unDecimal(alea, entier(alea, 1, cm1 ? 3 : 4), entier(alea, 1, 2));
        b = unDecimal(alea, entier(alea, 1, cm1 ? 2 : 3), entier(alea, 1, 2));
      }
      // Comparées en millièmes : trois chiffres après la virgule au plus.
      if (moins && a.v * 10 ** (3 - a.d) <= b.v * 10 ** (3 - b.d)) [a, b] = [b, a];
      if (moins && a.v * 10 ** (3 - a.d) === b.v * 10 ** (3 - b.d)) return null;
      return additionOuSoustraction(a, b, moins, r.posees);
    }
    case "multiplication-entiers": {
      // Comme 876 × 208 : un zéro au milieu du second facteur, de temps en temps.
      const second = r.chiffresDuSecond === 3 ? (alea() < 0.3 ? 100 * entier(alea, 1, 9) + entier(alea, 1, 9) : entier(alea, 101, 999)) : entier(alea, 11, 99);
      if (second % 10 === 0) return null;
      return multiplication({ v: entier(alea, 102, 999), d: 0 }, second, r.posees);
    }
    case "multiplication-decimal": {
      // Au CM1, par un entier inférieur à 10 ; au CM2, par un entier jusqu'à deux chiffres.
      const b = cm1 ? entier(alea, 2, 9) : choisir(alea, [entier(alea, 2, 9), entier(alea, 11, 49)]);
      if (b % 10 === 0) return null;
      return multiplication(unDecimal(alea, entier(alea, 1, 2), entier(alea, 1, 2)), b, r.posees);
    }
    case "division-euclidienne": {
      if (r.diviseur === 2) {
        // Comme 785 ÷ 25 et 936 ÷ 12 ; pour qui est prêt, et au CM2, 7 805 ÷ 27. Le quotient a au moins deux chiffres.
        const diviseur = entier(alea, 11, 49);
        if (diviseur % 10 === 0) return null;
        const dividende = entier(alea, diviseur * 10, cm1 && alea() < 0.8 ? 999 : 9999);
        return division({ v: dividende, d: 0 }, diviseur, 0, r.posees);
      }
      // Les exemples de réussite du CM1 : un dividende jusqu'à cinq chiffres, comme 9 456 ÷ 7 — ici surtout trois ou quatre.
      const diviseur = entier(alea, 2, 9);
      const dividende = alea() < 0.2 ? entier(alea, 10000, 99999) : entier(alea, cm1 ? 100 : 1000, 9999);
      return division({ v: dividende, d: 0 }, diviseur, 0, r.posees);
    }
    case "division-decimale": {
      // Un quotient exact à deux décimales au plus : un dividende entier par 2, 4 ou 5 ; ou un décimal, multiple du diviseur.
      // Les exemples de réussite du CM2 : des divisions qui s'arrêtent au plus tard au centième, avec un reste nul —
      // 785 ÷ 4, 9 855 ÷ 6, 7 854 ÷ 8, 148,2 ÷ 5.
      if ((r.dividende ?? "entier") === "entier") {
        const diviseur = choisir(alea, [2, 4, 5, 6, 8]);
        const dividende = alea() < 0.3 ? entier(alea, 1000, 9999) : entier(alea, 21, 999);
        if (dividende % diviseur === 0 || (dividende * 100) % diviseur !== 0) return null;
        // Juste assez de zéros après la virgule pour que la division tombe juste : 274 ÷ 4 = 68,5, pas 68,50.
        const decimales = [1, 2, 3].find((k) => (dividende * 10 ** k) % diviseur === 0) ?? 2;
        return division({ v: dividende, d: 0 }, diviseur, decimales, r.posees);
      }
      const diviseur = entier(alea, 2, 9);
      const decimales = entier(alea, 1, 2);
      const quotient = entier(alea, 11, 999);
      const v = quotient * diviseur;
      // La partie entière du dividende dépasse le diviseur : le quotient ne commence pas par « 0, ».
      if (v % 10 === 0 || Math.floor(v / 10 ** decimales) < diviseur) return null;
      return division({ v, d: decimales }, diviseur, decimales, r.posees);
    }
    default:
      return null;
  }
}

// ── Parenthèses et estimations ────────────────────────────────────────────

function parentheses(r: ReglagesCalculCM, alea: () => number): { calcul: string; reponse: string; etapes: string } | null {
  const a = entier(alea, 2, 20), b = entier(alea, 2, 20), c = entier(alea, 2, 9), d = entier(alea, 2, 9);
  const formes: [string, number, string][] = [
    [`(${a} + ${b}) × ${c}`, (a + b) * c, `${a + b} × ${c}`],
    [`${c} × (${a} + ${b})`, c * (a + b), `${c} × ${a + b}`],
    [`(${Math.max(a, b)} − ${Math.min(a, b)}) × ${c}`, (Math.max(a, b) - Math.min(a, b)) * c, `${Math.max(a, b) - Math.min(a, b)} × ${c}`],
    [`${a + b + c} − (${a} + ${c})`, b, `${a + b + c} − ${a + c}`],
    [`${a} + (${b} × ${c})`, a + b * c, `${a} + ${b * c}`],
  ];
  const grand = Math.max(a, b), petit = Math.min(a, b);
  const deuxPaires: [string, number, string][] = [
    [`(${a} + ${b}) × (${c} + ${d})`, (a + b) * (c + d), `${a + b} × ${c + d}`],
    // Des parenthèses dans des parenthèses : 37 − (3 × (14 − 6)), on commence par les plus intérieures.
    [`${c * (grand - petit) + a} − (${c} × (${grand} − ${petit}))`, a, `${c * (grand - petit) + a} − (${c} × ${grand - petit}) = ${c * (grand - petit) + a} − ${c * (grand - petit)}`],
    [`(${a} × ${c}) + (${b} × ${d})`, a * c + b * d, `${a * c} + ${b * d}`],
    [`(${a} × ${c}) − (${Math.min(a, b)} × ${Math.min(c, d)})`, a * c - Math.min(a, b) * Math.min(c, d), `${a * c} − ${Math.min(a, b) * Math.min(c, d)}`],
  ];
  const [calcul, valeur, etape] = r.classe === "CM2" && alea() < 0.5 ? choisir(alea, deuxPaires) : choisir(alea, formes);
  if (valeur < 0) return null;
  return { calcul, reponse: fr(valeur), etapes: `${etape} = ${fr(valeur)}` };
}

function estimation(r: ReglagesCalculCM, alea: () => number): { calcul: string; proposees: string[]; bonne: number; explication: string } {
  const arrondi = (n: number) => { const p = 10 ** (String(n).length - 1); return Math.round(n / p) * p; };
  const multiplier = alea() < 0.6;
  const a = entier(alea, 102, r.classe === "CM1" ? 989 : 9890), b = multiplier ? entier(alea, 11, 89) : entier(alea, 102, 989);
  const ea = arrondi(a), eb = arrondi(b);
  const estime = multiplier ? ea * eb : ea + eb;
  const proposees = [estime / 10, estime, estime * 10];
  return {
    calcul: `${fr(a)} ${multiplier ? "×" : "+"} ${fr(b)}`, proposees: proposees.map((x) => fr(x)), bonne: 1,
    explication: `${fr(ea)} ${multiplier ? "×" : "+"} ${fr(eb)} = ${fr(estime)}`,
  };
}

// ── Le quotient et le reste, en ligne ─────────────────────────────────────

/**
 * Ce que la potence demande à chaque étape, en calcul en ligne : 47 = 9 × 5 + 2,
 * le plus grand produit de la table qui ne dépasse pas, et ce qui reste. Le
 * manuel du CRPE de l'enseignant en ouvre la séance du trésor des pirates.
 */
function quotientReste(alea: () => number): { a: number; b: number; q: number; r: number } | null {
  const b = entier(alea, 2, 9), q = entier(alea, 2, 10);
  // Un reste presque toujours : une fois sur six, la division tombe juste.
  const r = alea() < 1 / 6 ? 0 : entier(alea, 1, b - 1);
  const a = b * q + r;
  return a > 10 && a < 100 ? { a, b, q, r } : null;
}

// ── Diviser par partages ─────────────────────────────────────────────────

/** Le nom des rangs, du plus grand au plus petit. */
const RANGS = ["milliers", "centaines", "dizaines", "unités"];

export interface Partage {
  dividende: number;
  diviseur: number;
  /** Rang par rang : ce qui vient du rang d'avant, ce qu'on voyait, ce qu'on partage, ce que chacun reçoit, ce qui reste. */
  lignes: { rang: string; venus: number; vus: number; aPartager: number; chacun: number; reste: number }[];
}

/**
 * Le partage d'un nombre, rang par rang, comme le trésor des pirates du
 * manuel du CRPE de l'enseignant : les centaines d'abord ; celles qui restent
 * font dix fois plus de dizaines, qui s'ajoutent aux dizaines qu'on voyait ;
 * puis les unités. La potence, avant la potence.
 */
export function partager(dividende: number, diviseur: number): Partage {
  const chiffres = String(dividende).split("").map(Number);
  const rangs = RANGS.slice(RANGS.length - chiffres.length);
  let reste = 0;
  const lignes = chiffres.map((vus, i) => {
    const venus = reste * 10, aPartager = venus + vus, chacun = Math.floor(aPartager / diviseur);
    reste = aPartager - chacun * diviseur;
    return { rang: rangs[i], venus, vus, aPartager, chacun, reste };
  });
  return { dividende, diviseur, lignes };
}

/** Trois chiffres, comme 672 ÷ 4 et 841 ÷ 5 ; au CM2, parfois quatre. Un échange au moins : il reste des centaines ou des dizaines. */
function tirerPartage(r: ReglagesCalculCM, alea: () => number): Partage | null {
  const diviseur = entier(alea, 3, 9);
  const dividende = r.classe === "CM2" && alea() < 0.4 ? entier(alea, 1000, 9999) : entier(alea, 112, 999);
  const p = partager(dividende, diviseur);
  return p.lignes.slice(0, -1).some((l) => l.reste > 0) ? p : null;
}

const TROU = '<span class="cm-trou"></span>';

/** Le tableau du partage, et le dividende en plaques, barres et cubes à côté ; au corrigé, rempli. */
function htmlPartage(p: Partage, corrige: boolean, materiel: boolean): string {
  const q = Math.floor(p.dividende / p.diviseur), reste = p.dividende % p.diviseur;
  const b = (x: number | string) => (corrige ? `<b>${typeof x === "number" ? fr(x) : x}</b>` : "");
  const lignes = p.lignes.map((l, i) => {
    const aPartager = i === 0 ? fr(l.vus) : corrige ? `${fr(l.venus)} + ${l.vus} = <b>${fr(l.aPartager)}</b>` : `${TROU} + ${l.vus} = ${TROU}`;
    return `<tr><th>${l.rang}</th><td>${aPartager}</td><td>${b(l.chacun)}</td><td>${b(l.reste)}</td></tr>`;
  }).join("");
  const tableau = `<table class="cm-tableau"><thead><tr><th></th><th>À partager</th><th>Chacun reçoit</th><th>Il reste</th></tr></thead><tbody>${lignes}</tbody></table>`;
  // Le matériel d'un nombre de trois chiffres au plus : au-delà, les gros cubes ne tiennent plus à côté du tableau.
  const dessin = materiel && p.dividende < 1000 ? `<span class="cm-materiel">${dessinerCubes(p.dividende, 1, REGLAGES_CUBES.couleurs).svg}</span>` : "";
  return `<div class="cm-partage"><div class="cm-enligne">${fr(p.dividende)} ÷ ${p.diviseur} : ${p.diviseur} parts égales</div>`
    + `<div class="cm-partage-corps">${dessin}${tableau}</div>`
    + `<div class="cm-egalite">${fr(p.dividende)} = ${p.diviseur} × ${corrige ? `<b>${fr(q)}</b>` : TROU} + ${corrige ? `<b>${reste}</b>` : TROU}</div></div>`;
}

// ── La feuille ───────────────────────────────────────────────────────────

const REGLE_QUOTIENT_RESTE = "Je cherche dans la table le plus grand produit qui ne dépasse pas le nombre : 9 × 5 = 45. J'écris ce qui reste : 47 − 45 = 2. "
  + "Le reste est plus petit que le nombre de la table.";
const REGLE_PARTAGES ="Je partage d'abord les centaines, puis les dizaines, puis les unités. Ce qui reste d'un rang, je l'échange : une centaine, c'est dix dizaines ; une dizaine, c'est dix unités. "
  + "J'écris l'égalité : le nombre partagé, c'est le nombre de parts fois la part de chacun, plus le reste.";
const REGLE_DEUX_CHIFFRES = "J'écris à côté les produits du diviseur qui servent : pour 25, c'est 25, 50, 75, 100… Je cherche combien de fois le diviseur dans le premier morceau du dividende ; "
  + "je retranche ; j'abaisse le chiffre suivant, et je recommence. Le reste est plus petit que le diviseur.";

const REGLES: Partial<Record<ExerciceCalculCM, string>> = {
  "addition-decimaux": "On aligne les chiffres rang par rang : les unités sous les unités, la virgule sous la virgule. On peut écrire des zéros pour que les deux nombres aient autant de chiffres après la virgule.",
  "soustraction-decimaux": "On aligne la virgule sous la virgule ; on complète avec des zéros ; on calcule comme pour les entiers, et la virgule descend dans le résultat.",
  "multiplication-entiers": "On multiplie le premier nombre par chaque chiffre du second, en commençant par les unités : une ligne par chiffre ; pour les dizaines, on écrit d'abord un zéro. Puis on additionne.",
  "multiplication-decimal": "On calcule comme si la virgule n'était pas là ; puis le résultat a autant de chiffres après la virgule que le nombre décimal.",
  "division-euclidienne": "On cherche combien de fois le diviseur dans le premier morceau du dividende ; on retranche ; on abaisse le chiffre suivant, et on recommence. Le reste est plus petit que le diviseur.",
  "division-decimale": "On divise comme d'habitude ; quand on abaisse le premier chiffre après la virgule, on met la virgule au quotient. On peut ajouter des zéros après la virgule du dividende pour continuer.",
};

export function htmlCalculCM(r: ReglagesCalculCM, graine: number): string {
  const alea = hasard(graine);
  // Une division posée prend de la hauteur : quatre par page.
  const combien = Math.max(1, Math.min(combienAuPlus(r.exercice), r.combien));
  const titre = r.titre?.trim() || titreCalculCM(r);
  let corps = "", corrige = "";
  if (r.exercice === "quotient-reste") {
    const items: NonNullable<ReturnType<typeof quotientReste>>[] = [];
    for (let garde = 0; items.length < combien && garde < 300; garde++) {
      const x = quotientReste(alea);
      if (x && !items.some((y) => y.a === x.a && y.b === x.b)) items.push(x);
    }
    corps = `<div class="regle"><b>Complète</b>${REGLE_QUOTIENT_RESTE}</div><div class="cm-lignes cm-deux-colonnes">${items.map((x) => `<div>${fr(x.a)} = ${x.b} × ${TROU} + ${TROU}</div>`).join("")}</div>`;
    corrige = `<div class="cm-lignes cm-deux-colonnes">${items.map((x) => `<div>${fr(x.a)} = ${x.b} × <b>${x.q}</b> + <b>${x.r}</b></div>`).join("")}</div>`;
  } else if (r.exercice === "division-partages") {
    const items: Partage[] = [];
    for (let garde = 0; items.length < combien && garde < 300; garde++) {
      const p = tirerPartage(r, alea);
      if (p && !items.some((x) => x.dividende === p.dividende && x.diviseur === p.diviseur)) items.push(p);
    }
    corps = `<div class="regle"><b>Partage</b>${REGLE_PARTAGES}</div><div class="cm-partages">${items.map((p) => htmlPartage(p, false, !!r.materiel)).join("")}</div>`;
    corrige = `<div class="cm-partages">${items.map((p) => htmlPartage(p, true, !!r.materiel)).join("")}</div>`;
  } else if (r.exercice === "parentheses") {
    const items: NonNullable<ReturnType<typeof parentheses>>[] = [];
    for (let garde = 0; items.length < combien && garde < 300; garde++) {
      const x = parentheses(r, alea);
      if (x && !items.some((y) => y.calcul === x.calcul)) items.push(x);
    }
    corps = `<div class="regle"><b>Calcule</b>On calcule d'abord ce qui est entre parenthèses.</div><div class="cm-lignes">${items.map((x) => `<div>${escapeHtml(x.calcul)} = <span class="cm-trait"></span></div>`).join("")}</div>`;
    corrige = `<div class="cm-lignes">${items.map((x) => `<div>${escapeHtml(x.calcul)} = ${escapeHtml(x.etapes)}</div>`).join("")}</div>`;
  } else if (r.exercice === "estimer") {
    const items = Array.from({ length: combien }, () => estimation(r, alea));
    corps = `<div class="regle"><b>Estime</b>Arrondis chaque nombre, calcule de tête, puis entoure le résultat le plus proche — sans poser l'opération.</div>`
      + `<div class="cm-lignes">${items.map((x) => `<div>${escapeHtml(x.calcul)} ≈ ${x.proposees.map((p) => `<span class="cm-choix">${escapeHtml(p)}</span>`).join(" ")}</div>`).join("")}</div>`;
    corrige = `<div class="cm-lignes">${items.map((x) => `<div>${escapeHtml(x.calcul)} ≈ <b>${escapeHtml(x.proposees[x.bonne])}</b> <span class="cm-aussi">(${escapeHtml(x.explication)})</span></div>`).join("")}</div>`;
  } else {
    const ops: Operation[] = [];
    const vues = new Set<string>();
    // Une évaluation de la division : le quotient qui commence au deuxième chiffre, puis le zéro au quotient — tant qu'on en trouve.
    const voulu = (i: number) => (r.exercice === "division-euclidienne" && r.difficultes ? (["premier", "zero"] as const)[i] : undefined);
    for (let garde = 0; ops.length < combien && garde < 600; garde++) {
      const o = tirer(r, alea);
      if (!o || vues.has(o.enLigne)) continue;
      const v = voulu(ops.length);
      if (v && garde < 500 && !o.difficultes?.[v]) continue;
      vues.add(o.enLigne);
      ops.push(o);
    }
    const regle = r.exercice === "division-euclidienne" && r.diviseur === 2 ? REGLE_DEUX_CHIFFRES : REGLES[r.exercice] ?? "";
    const bloc = (o: Operation, montreCorrige: boolean) => `<div class="cm-bloc">${!r.posees || montreCorrige ? `<div class="cm-enligne">${escapeHtml(o.enLigne)}${montreCorrige ? ` = <b>${escapeHtml(o.reponse)}</b>` : ""}</div>` : ""}${montreCorrige ? o.corrige : o.exercice}</div>`;
    corps = `<div class="regle"><b>${r.posees ? "Calcule" : "Pose, puis calcule"}</b>${regle}</div><div class="cm-liste${/division/.test(r.exercice) ? " cm-deux" : ""}">${ops.map((o) => bloc(o, false)).join("")}</div>`;
    corrige = `<div class="cm-liste${/division/.test(r.exercice) ? " cm-deux" : ""}">${ops.map((o) => bloc(o, true)).join("")}</div>`;
  }
  return feuille(`<div class="page"><div class="titre">${escapeHtml(titre)}</div><div class="sous">Prénom : ........................................ Date : ........................</div>${corps}</div>
    <div class="page corrige"><div class="titre">${escapeHtml(titre)} — corrigé</div>${corrige}</div>`, "cm");
}

export const STYLE_CALCUL_CM = `
  .feuille.cm .cm-liste { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm 8mm; }
  .feuille.cm .cm-liste.cm-deux { grid-template-columns: repeat(2, 1fr); }
  .feuille.cm .cm-bloc { page-break-inside: avoid; break-inside: avoid; }
  .feuille.cm .cm-enligne { font-size: 15px; font-weight: 600; margin: 0 0 2mm; }
  .feuille.cm .cm-grille { border-collapse: collapse; font-size: 18px; font-weight: 600; }
  .feuille.cm .cm-grille td { position: relative; width: 7mm; height: 8mm; text-align: center; border: 0.6px solid #c4c9d6; }
  .feuille.cm .cm-grille td.cm-signe { border-color: transparent; font-weight: 700; }
  .feuille.cm .cm-grille td.cm-zero { color: #9aa0b4; }
  .feuille.cm .cm-grille .cm-virgule { position: absolute; right: -1.6mm; bottom: -1.2mm; font-weight: 800; color: #d33a32; font-size: 20px; line-height: 1; }
  .feuille.cm .cm-grille tr.cm-retenues td { height: 5mm; font-size: 11px; color: #d33a32; border-style: dashed; }
  .feuille.cm .cm-grille:not(.cm-division) tr.cm-dernier td:not(.cm-signe) { border-bottom: 2px solid #1c2233; }
  .feuille.cm .cm-division tr.cm-dernier td.cm-g { border-bottom: 2px solid #1c2233; }
  .feuille.cm .cm-division td.cm-potence { width: 0; padding: 0; border: none; border-left: 2.5px solid #1c2233; }
  .feuille.cm .cm-division td.cm-quotient { border-top: 2.5px solid #1c2233; color: #1c2233; }
  .feuille.cm .cm-division tr:first-child td.cm-diviseur { border-bottom: 2.5px solid #1c2233; }
  .feuille.cm .cm-lignes > div { font-size: 16px; margin: 0 0 5mm; line-height: 1.6; }
  .feuille.cm .cm-trait { display: inline-block; min-width: 70mm; border-bottom: 1px dotted #9aa0b4; vertical-align: bottom; height: 6mm; }
  .feuille.cm .cm-choix { display: inline-block; margin: 0 3mm; padding: 0.5mm 3mm; border: 1.2px solid #9aa0b4; border-radius: 4mm; }
  .feuille.cm .cm-aussi { color: #687087; font-size: 12.5px; }
  .feuille.cm .cm-lignes.cm-deux-colonnes { display: grid; grid-template-columns: repeat(2, 1fr); column-gap: 10mm; }
  .feuille.cm .cm-partage { page-break-inside: avoid; break-inside: avoid; margin: 0 0 7mm; }
  .feuille.cm .cm-partage-corps { white-space: nowrap; }
  .feuille.cm .cm-partage-corps > * { display: inline-block; vertical-align: middle; white-space: normal; }
  .feuille.cm .cm-materiel { margin-right: 5mm; }
  .feuille.cm .cm-materiel svg { display: block; }
  .feuille.cm .cm-tableau { width: auto; margin: 0; border-collapse: collapse; font-size: 14px; }
  .feuille.cm .cm-tableau th, .feuille.cm .cm-tableau td { border: 1px solid #9aa0b4; padding: 1mm 2mm; height: 8mm; text-align: center; }
  .feuille.cm .cm-tableau td { min-width: 18mm; }
  .feuille.cm .cm-tableau thead th { background: #f0f2f8; font-size: 12.5px; font-weight: 600; }
  .feuille.cm .cm-tableau tbody th { text-align: left; font-weight: 600; }
  .feuille.cm .cm-trou { display: inline-block; width: 11mm; height: 6mm; border: 1.2px solid #1c2233; border-radius: 1.2mm; vertical-align: middle; }
  .feuille.cm .cm-egalite { font-size: 15px; margin-top: 2.5mm; }
`;
