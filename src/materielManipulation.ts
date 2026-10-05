// Le matériel de manipulation de la séance de découverte.
//
// « L'apprentissage de chaque famille s'appuie d'abord sur l'utilisation et
// la manipulation de supports adaptés (cubes, frise numérique, cartes à
// points, etc.) qui permettent de construire, à l'aide de la verbalisation,
// des images mentales. » (Éduscol, « Pour enseigner les nombres, le calcul et
// la résolution de problèmes au CP »). Chaque objectif de calcul mental
// reçoit le sien, lu dans ses calculs : boîtes de dix, jetons, cartes à points
// et bande numérique pour les faits jusqu'à 20 ; barres de dix, cubes et
// tableau des nombres jusqu'à 100 ; plaques de cent et tableau de numération
// au-delà ; quadrillages et jetons pour les produits et les partages ;
// glisse-nombre pour multiplier ou diviser par 10, 100, 1 000 ; carré de cent
// pour les décimaux ; bandes unités pour les fractions. Tout s'imprime, se
// découpe, se plastifie.

import { chercheDans } from "./consignesCalcul";
import { REGLAGES_CUBES, piece } from "./cubesNumeration";
import { tirerCalcul, type Objectif } from "./faitsNumeriques";
import { feuille } from "./cartesImprimables";
import { hasard } from "./hasard";
import { constellationSvg } from "./jeuxMaths";
import { escapeHtml } from "./print";

export type Piece =
  | "boitesDeDix" | "jetons" | "cartesAPoints" | "bandeNumerique"
  | "barresEtCubes" | "tableauCent" | "plaquesBarresCubes" | "tableauNumeration"
  | "quadrillages" | "glisseNombre" | "carreCent" | "bandesUnites";

export interface Materiel {
  nom: string;
  pieces: Piece[];
  /** Ce qu'on en fait, en une ou deux phrases : la manipulation qui fait comprendre le calcul. */
  usage: string;
}

/** Une espace de milliers, quelle qu'elle soit : « 1 000 ». */
const MILLIERS = /(\d)[\s  ](?=\d{3}\b)/g;
/** Les nombres entiers d'un texte, sans les décimaux ni les fractions. */
const entiers = (texte: string) =>
  (texte.replace(MILLIERS, "$1").replace(/\d+[,/]\d+/g, " ").match(/\d+/g) ?? []).map(Number);

const A_VIRGULE = /\d,\d/;
const FRACTION = /\d\s*\/\s*\d/;
/** Une fraction décimale : un dénominateur 10, 100, 1 000. */
const FRACTION_DECIMALE = /\/\s*1(0{1,3})\b/;
/** Un facteur ou un diviseur 10, 100 ou 1 000, entier. */
const PAR_DIX = /(^|[^\d,])10{1,3}(?![\d,])/;

/** Le matériel qui fait découvrir cet objectif. */
export function materielPour(o: Objectif, tables: number[] = []): Materiel {
  const alea = hasard(131);
  const calculs = Array.from({ length: 40 }, () => tirerCalcul(o, alea, tables));
  const textes = calculs.map((c) => `${c.ecrit} ${c.reponse}`.replace(MILLIERS, "$1"));
  const plusGrand = Math.max(1, ...textes.flatMap(entiers));
  const virgules = textes.some((t) => A_VIRGULE.test(t));
  const fractions = textes.some((t) => FRACTION.test(t));
  const fractionsDecimales = textes.some((t) => FRACTION_DECIMALE.test(t));
  const cherches = new Set(calculs.map((c) => chercheDans(c.ecrit)));
  const seulement = (...permis: string[]) => [...cherches].every((c) => permis.includes(c));
  // Multiplier ou diviser par 10, 100, 1 000 : les chiffres changent de rang.
  const parDix = calculs.every((c) => /[×÷]/.test(c.ecrit) && PAR_DIX.test(c.ecrit.replace(MILLIERS, "$1")));
  const doubles = calculs.every((c) => /^(double de|moiti[ée] de|2 × )/i.test(c.ecrit));

  // Prendre une fraction d'une quantité : on partage des jetons, même en dixièmes.
  if (seulement("fractionDe")) {
    return {
      nom: "Bandes unités et jetons", pieces: ["bandesUnites", "jetons"],
      usage: "Pour prendre les trois quarts de 12, on partage les 12 jetons en quatre parts égales, et on en garde trois. Les bandes pliées font voir les parts.",
    };
  }
  if (fractions && (virgules || fractionsDecimales)) {
    return {
      nom: "Carré de cent et bandes unités", pieces: ["carreCent", "bandesUnites"],
      usage: "Un demi, c'est cinquante centièmes : 0,5 ; un quart, vingt-cinq centièmes : 0,25 ; un dixième, une colonne du carré : 0,1. Le carré de cent et les bandes pliées le font voir.",
    };
  }
  if (virgules || parDix) {
    return {
      nom: virgules ? "Glisse-nombre et carré de cent" : "Glisse-nombre", pieces: virgules ? ["glisseNombre", "carreCent"] : ["glisseNombre"],
      usage: "Sur le glisse-nombre, les chiffres glissent d'un rang vers la gauche quand on multiplie par 10, de deux rangs par 100 — la virgule, elle, ne bouge pas."
        + (virgules ? " Le carré de cent fait voir qu'une unité vaut dix dixièmes, et cent centièmes." : ""),
    };
  }
  if (fractions) {
    return {
      nom: "Bandes unités à plier", pieces: ["bandesUnites"],
      usage: "On plie la bande unité en deux, puis en quatre : un demi, c'est deux quarts ; trois quarts et un quart font une unité. Une bande pliée en dix pour les dixièmes.",
    };
  }
  if (!doubles && seulement("produit", "facteur", "quotient")) {
    return {
      nom: "Quadrillages et jetons", pieces: ["quadrillages", "jetons"],
      usage: "Un rectangle de 3 rangées de 4 carreaux, c'est 3 × 4 = 12 ; tourné, c'est 4 × 3 : le même nombre. Les jetons se rangent en paquets égaux pour partager.",
    };
  }
  if (plusGrand <= 20) {
    return doubles
      ? { nom: "Boîtes de dix et jetons", pieces: ["boitesDeDix", "jetons"],
        usage: "Le double, c'est deux fois la même collection : on la pose dans deux boîtes de dix. La moitié, c'est partager les jetons en deux parts égales." }
      : { nom: "Boîtes de dix, jetons, cartes à points et bande numérique", pieces: ["boitesDeDix", "jetons", "cartesAPoints", "bandeNumerique"],
        usage: "Dans une boîte de dix, ce qui manque pour la remplir, c'est le complément à 10 ; deux boîtes pleines font vingt. Sur la bande numérique, ajouter, c'est avancer ; retirer, c'est reculer." };
  }
  if (plusGrand <= 100) {
    return {
      nom: "Barres de dix, cubes et tableau des nombres", pieces: ["barresEtCubes", "tableauCent"],
      usage: doubles
        ? "Le double de 34 : le double des trois barres et le double des quatre cubes. La moitié : on partage les barres, puis les cubes — on échange une barre contre dix cubes s'il le faut."
        : "Ajouter 10, c'est ajouter une barre — ou descendre d'une ligne dans le tableau des nombres ; ajouter 9, c'est ajouter une barre et retirer un cube.",
    };
  }
  return {
    nom: "Plaques de cent, barres de dix, cubes et tableau de numération", pieces: ["plaquesBarresCubes", "tableauNumeration"],
    usage: "Centaines, dizaines et unités se voient et s'échangent : dix cubes contre une barre, dix barres contre une plaque. Le tableau de numération range les chiffres à leur place.",
  };
}

// ── Les pièces, page par page ─────────────────────────────────────────────

/** Les couleurs du matériel le plus répandu : le jaune des unités, le vert des barres, le bleu des plaques, le rouge. */
const COULEURS = REGLAGES_CUBES.couleurs;

/** Une boîte de dix vide, grande : deux rangées de cinq cases. */
const boiteVide = () => {
  const cases = Array.from({ length: 10 }, (_, i) =>
    `<rect x="${(i % 5) * 16}" y="${Math.floor(i / 5) * 16}" width="16" height="16" fill="#fff" stroke="#1c2233" stroke-width="0.8"/>`).join("");
  return `<svg viewBox="-1 -1 82 34" width="82mm" height="34mm"><rect x="-0.5" y="-0.5" width="81" height="33" fill="none" stroke="#1c2233" stroke-width="1.6"/>${cases}</svg>`;
};

const jeton = (couleur: string) =>
  `<svg viewBox="0 0 16 16" width="15mm" height="15mm"><circle cx="8" cy="8" r="7.4" fill="${couleur}" stroke="#1c2233" stroke-width="0.4"/></svg>`;

/** Des pièces de cubes, chacune dans sa case à découper. */
const pieces = (g: "u" | "d" | "c", combien: number, u: number) => {
  const [l, h] = g === "u" ? [1, 1] : g === "d" ? [1, 10] : [10, 10];
  const svg = `<svg viewBox="-0.3 -0.3 ${l * u + 0.6} ${h * u + 0.6}" width="${l * u + 0.6}mm" height="${h * u + 0.6}mm">${piece(g, 0, 0, u, COULEURS[g])}</svg>`;
  return `<div class="mm-pieces">${Array.from({ length: combien }, () => `<span class="mm-coupe">${svg}</span>`).join("")}</div>`;
};

const tableau = (lignes: (string | number)[][], classe: string) =>
  `<table class="${classe}">${lignes.map((l) => `<tr>${l.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</table>`;

/** Des étiquettes de chiffres à découper, pour les poser dans un tableau. */
const etiquettesChiffres = (fois: number) =>
  `<div class="mm-pieces">${Array.from({ length: fois }, () => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((c) => `<span class="mm-coupe mm-chiffre">${c}</span>`).join("")).join("")}</div>`;

const RANGS = ["milliers", "centaines", "dizaines", "unités", "dixièmes", "centièmes", "millièmes"];

interface PieceImprimee { titre: string; aide: string; contenu: () => string }

const PIECES: Record<Piece, PieceImprimee> = {
  boitesDeDix: {
    titre: "Boîtes de dix", aide: "À découper et plastifier : une case, un jeton ; une boîte pleine, c'est dix.",
    contenu: () => `<div class="mm-grille-2">${Array.from({ length: 4 }, () => `<div class="mm-coupe">${boiteVide()}</div>`).join("")}</div>`,
  },
  jetons: {
    titre: "Jetons", aide: "À découper : vingt rouges, vingt bleus — deux couleurs pour voir les deux nombres qu'on ajoute.",
    contenu: () => `<div class="mm-pieces">${Array.from({ length: 40 }, (_, i) => `<span class="mm-coupe">${jeton(i < 20 ? COULEURS.m : COULEURS.c)}</span>`).join("")}</div>`,
  },
  cartesAPoints: {
    titre: "Cartes à points", aide: "À découper : chaque carte montre un nombre d'un coup d'œil, sans compter un à un.",
    contenu: () => `<div class="mm-pieces">${Array.from({ length: 10 }, (_, i) => `<span class="mm-coupe mm-carte">${constellationSvg(i + 1)}<b>${i + 1}</b></span>`).join("")}</div>`,
  },
  bandeNumerique: {
    titre: "Bande numérique de 0 à 20", aide: "À découper et coller bout à bout, le 10 sur le 10 : on avance pour ajouter, on recule pour retirer.",
    contenu: () => [[0, 10], [10, 20]].map(([a, b]) =>
      `<table class="mm-bande"><tr>${Array.from({ length: b - a + 1 }, (_, i) => `<td>${a + i}</td>`).join("")}</tr></table>`).join(""),
  },
  barresEtCubes: {
    titre: "Barres de dix et cubes", aide: "À découper : dix barres de dix, trente cubes. Dix cubes s'échangent contre une barre.",
    contenu: () => `${pieces("d", 10, 6)}${pieces("u", 30, 6)}`,
  },
  tableauCent: {
    titre: "Tableau des nombres de 1 à 100", aide: "Ajouter 10, c'est descendre d'une ligne ; retirer 10, monter d'une ligne ; ajouter 1, avancer d'une case.",
    contenu: () => tableau(Array.from({ length: 10 }, (_, l) => Array.from({ length: 10 }, (_, c) => l * 10 + c + 1)), "mm-cent"),
  },
  plaquesBarresCubes: {
    titre: "Plaques de cent, barres de dix et cubes", aide: "À découper : dix cubes font une barre, dix barres une plaque.",
    contenu: () => `${pieces("c", 3, 4)}${pieces("d", 10, 4)}${pieces("u", 20, 4)}`,
  },
  tableauNumeration: {
    titre: "Tableau de numération", aide: "On pose les étiquettes : chaque chiffre à sa place. Dix unités s'échangent contre une dizaine.",
    contenu: () => tableau([["centaines", "dizaines", "unités"], ["", "", ""]], "mm-numeration") + etiquettesChiffres(3),
  },
  quadrillages: {
    titre: "Quadrillage", aide: "On découpe des rectangles : 3 rangées de 4 carreaux, c'est 3 × 4. Tourné, c'est 4 × 3 — le même nombre de carreaux.",
    contenu: () => `<div class="mm-quadrillage">${"<span></span>".repeat(100)}</div>`,
  },
  glisseNombre: {
    titre: "Glisse-nombre",
    aide: "Le tableau ne bouge pas. On écrit le nombre sur une bande, un chiffre par case, et on fait glisser la bande : vers la gauche pour multiplier par 10, 100, 1 000, vers la droite pour diviser.",
    contenu: () => `<table class="mm-glisse"><tr>${RANGS.map((c) => `<th>${c}</th>`).join("")}</tr><tr>${RANGS.map((c) => `<td${c === "unités" ? ' class="mm-virgule"' : ""}></td>`).join("")}</tr></table>
      <div class="sous">Les bandes à glisser, à découper</div>${Array.from({ length: 4 }, () => `<table class="mm-glisse mm-bande-glisse"><tr>${"<td></td>".repeat(RANGS.length)}</tr></table>`).join("")}`,
  },
  carreCent: {
    titre: "Carré de cent", aide: "Le carré entier, c'est une unité ; une colonne, un dixième ; un petit carré, un centième.",
    contenu: () => `<div class="mm-carre">${"<span></span>".repeat(100)}</div>`,
  },
  bandesUnites: {
    titre: "Bandes unités", aide: "À découper : on plie, on compare, on vérifie avec les bandes repérées.",
    contenu: () => `<div class="sous">Bandes vierges, à plier</div>${'<div class="mm-unite"></div>'.repeat(3)}
      ${([[2, "en demis"], [4, "en quarts"], [10, "en dixièmes"]] as const).map(([n, nom]) =>
        `<div class="sous">Bande repérée ${nom}</div><div class="mm-unite mm-reperee" style="grid-template-columns: repeat(${n}, 1fr)">${"<span></span>".repeat(n)}</div>`).join("")}`,
  },
};

/**
 * Le matériel, à imprimer : ce qu'on en fait d'abord, puis chaque pièce sur
 * sa page, avec son mode d'emploi.
 */
export function htmlMateriel(m: Materiel, objectif: string): string {
  const pages = m.pieces.map((p, i) => {
    const x = PIECES[p];
    const tete = i === 0
      ? `<div class="titre">Matériel de manipulation — ${escapeHtml(m.nom)}</div><div class="sous">${escapeHtml(objectif)}</div>
        <div class="regle"><b>Pour la découverte</b>${escapeHtml(m.usage)} On manipule d'abord, en disant ce qu'on fait ; puis on calcule sans le matériel, en se le représentant.</div>
        <div class="mm-soustitre">${escapeHtml(x.titre)}</div>`
      : `<div class="titre">${escapeHtml(x.titre)}</div>`;
    return `<div class="page">${tete}<div class="sous">${escapeHtml(x.aide)}</div>${x.contenu()}</div>`;
  });
  return feuille(pages.join(""), "mm");
}

export const STYLE_MATERIEL = `
  .feuille.mm .mm-soustitre { font-size: 15px; font-weight: 800; margin: 4mm 0 1mm; }
  .feuille.mm .mm-coupe { display: inline-flex; flex-direction: column; align-items: center; justify-content: center; gap: 1mm;
    border: 1px dashed #9aa0b4; padding: 2mm; margin: 0 -1px -1px 0; break-inside: avoid; page-break-inside: avoid; }
  .feuille.mm .mm-pieces { display: flex; flex-wrap: wrap; align-items: flex-end; margin: 0 0 4mm; }
  .feuille.mm .mm-grille-2 { display: grid; grid-template-columns: repeat(2, max-content); gap: 0; }
  .feuille.mm .mm-carte b { font-size: 16px; }
  .feuille.mm .mm-chiffre { width: 14mm; height: 14mm; font-size: 26px; font-weight: 800; }
  .feuille.mm table { border-collapse: collapse; margin: 0 0 4mm; }
  .feuille.mm td, .feuille.mm th { border: 1.2px solid #1c2233; text-align: center; padding: 0; }
  .feuille.mm .mm-bande td { width: 14mm; height: 14mm; font-size: 18px; font-weight: 700; }
  .feuille.mm .mm-cent td { width: 15mm; height: 13mm; font-size: 15px; }
  .feuille.mm .mm-numeration td { width: 50mm; height: 22mm; font-size: 15px; font-weight: 700; }
  .feuille.mm .mm-glisse th { width: 22mm; height: 10mm; font-size: 10.5px; background: #f0f2f8; }
  .feuille.mm .mm-glisse td { width: 22mm; height: 18mm; font-size: 22px; font-weight: 800; position: relative; }
  /* La virgule, sur le trait entre les unités et les dixièmes : elle ne bouge pas, les chiffres glissent. */
  .feuille.mm .mm-glisse td.mm-virgule::after { content: ","; position: absolute; right: -2.2mm; bottom: -3mm; font-size: 34px; font-weight: 900; }
  .feuille.mm .mm-bande-glisse { margin-bottom: 3mm; }
  .feuille.mm .mm-quadrillage { display: grid; grid-template-columns: repeat(10, 12mm); grid-auto-rows: 12mm; width: max-content;
    border: 1.2px solid #1c2233; margin: 0 0 6mm; }
  .feuille.mm .mm-quadrillage span { border: 0.5px solid #1c2233; }
  .feuille.mm .mm-carre { display: grid; grid-template-columns: repeat(10, 12mm); grid-auto-rows: 12mm; width: max-content; border: 1.6px solid #1c2233; margin: 0 0 5mm; }
  .feuille.mm .mm-carre span { border: 0.4px solid #1c2233; }
  .feuille.mm .mm-unite { width: 150mm; height: 14mm; border: 1.4px solid #1c2233; margin: 0 0 4mm; }
  .feuille.mm .mm-reperee { display: grid; }
  .feuille.mm .mm-reperee span { border-right: 1px solid #1c2233; }
  .feuille.mm .mm-reperee span:last-child { border-right: none; }
`;
