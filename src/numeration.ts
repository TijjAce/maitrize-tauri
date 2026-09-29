// La numération du cycle 3 : les grands nombres et les nombres décimaux.
//
// Placer un nombre dans le tableau de numération, l'écrire en lettres, le
// décomposer, comparer, encadrer : les exercices que les manuels répètent
// et qu'on refait avec d'autres nombres. Ceux-ci sont tirés au sort ; le
// corrigé suit.

import { escapeHtml } from "./print";
import { feuille } from "./cartesImprimables";
import { hasard } from "./hasard";
import { nombreEnLettres } from "./nombresEnLettres";
import { choisir, entier, fr } from "./nombres";

export type ExerciceNumeration = "tableau" | "lettres" | "decomposition" | "comparer" | "encadrer";
export const EXERCICES_NUMERATION: { id: ExerciceNumeration; libelle: string }[] = [
  { id: "tableau", libelle: "Placer dans le tableau de numération" },
  { id: "lettres", libelle: "Écrire en lettres" },
  { id: "decomposition", libelle: "Décomposer" },
  { id: "comparer", libelle: "Comparer avec <, > ou =" },
  { id: "encadrer", libelle: "Encadrer" },
];
export const PLAFONDS_NUMERATION = [1000, 10000, 100000, 1000000, 1000000000] as const;

export interface ReglagesNumeration {
  decimaux: boolean;
  /** Les entiers vont jusque là ; pour les décimaux, c'est la partie entière. */
  jusqua: number;
  decimales: 1 | 2 | 3;
  exercices: ExerciceNumeration[];
  /** Combien de nombres par exercice. */
  combien: number;
}
export const REGLAGES_NUMERATION: ReglagesNumeration = { decimaux: false, jusqua: 100000, decimales: 2, exercices: ["tableau", "lettres", "decomposition", "comparer"], combien: 5 };

/** Un nombre : sa partie entière, et ses décimales en entier (« 45 » pour ,45 avec deux décimales). */
export interface Nombre { entier: number; dec: number }

const PARTIES = ["dixièmes", "centièmes", "millièmes"] as const;

/** « 3 456 », « 3,45 ». */
export const ecrireNombre = (n: Nombre, r: ReglagesNumeration) =>
  r.decimaux ? `${fr(n.entier)},${String(n.dec).padStart(r.decimales, "0")}` : fr(n.entier);

export const valeur = (n: Nombre, r: ReglagesNumeration) => n.entier + (r.decimaux ? n.dec / 10 ** r.decimales : 0);

/** Un nombre au sort, d'une taille variée : autant de nombres à trois chiffres qu'à cinq quand on va jusqu'à cent mille. */
export function unNombre(r: ReglagesNumeration, alea: () => number): Nombre {
  const plafond = Math.max(100, r.jusqua);
  const chiffres = String(plafond - 1).length;
  // Un décimal peut n'avoir qu'un chiffre, voire zéro, avant la virgule : 0,45 se lit aussi.
  const c = entier(alea, r.decimaux ? 1 : Math.max(2, chiffres - 2), chiffres);
  const entierPart = entier(alea, c === 1 ? 0 : 10 ** (c - 1), Math.min(plafond - 1, 10 ** c - 1));
  if (!r.decimaux) return { entier: entierPart, dec: 0 };
  let dec = entier(alea, 1, 10 ** r.decimales - 1);
  // Pas de zéro qui traîne : 3,50 s'écrit 3,5, et on ne l'écrit pas ici.
  while (r.decimales > 1 && dec % 10 === 0) dec = entier(alea, 1, 10 ** r.decimales - 1);
  return { entier: entierPart, dec };
}

export function nombresNumeration(r: ReglagesNumeration, combien: number, alea: () => number): Nombre[] {
  const sortie: Nombre[] = [];
  const vus = new Set<string>();
  for (let essai = 0; essai < 200 && sortie.length < combien; essai++) {
    const n = unNombre(r, alea);
    const cle = `${n.entier},${n.dec}`;
    if (vus.has(cle)) continue;
    vus.add(cle);
    sortie.push(n);
  }
  return sortie;
}

/** « trois mille quatre cent cinquante-six », « trois unités et quarante-cinq centièmes ». */
export function enLettres(n: Nombre, r: ReglagesNumeration): string {
  if (!r.decimaux || n.dec === 0) return nombreEnLettres(n.entier);
  const partie = PARTIES[r.decimales - 1];
  const decimales = n.dec === 1 ? `un ${partie.slice(0, -1)}` : `${nombreEnLettres(n.dec)} ${partie}`;
  if (n.entier === 0) return decimales;
  // « unité » est féminin : « vingt et une unités ».
  const unites = n.entier === 1 ? "une unité" : `${nombreEnLettres(n.entier).replace(/\bun$/, "une")} unités`;
  return `${unites} et ${decimales}`;
}

/** « 3 000 + 400 + 50 + 6 » ; en décimal, « 3 + 0,4 + 0,05 ». */
export function decomposer(n: Nombre, r: ReglagesNumeration): string {
  const morceaux: string[] = [];
  const chiffres = String(n.entier).split("").map(Number);
  chiffres.forEach((c, i) => { if (c) morceaux.push(fr(c * 10 ** (chiffres.length - 1 - i))); });
  if (r.decimaux) {
    String(n.dec).padStart(r.decimales, "0").split("").map(Number).forEach((c, i) => {
      if (c) morceaux.push(`0,${"0".repeat(i)}${c}`);
    });
  }
  return morceaux.join(" + ") || "0";
}

/** « (3 × 1 000) + (4 × 100) + (5 × 10) + 6 » — la décomposition qui dit la valeur de chaque chiffre. */
export function decomposerEnProduits(n: Nombre, r: ReglagesNumeration): string {
  const morceaux: string[] = [];
  const chiffres = String(n.entier).split("").map(Number);
  chiffres.forEach((c, i) => {
    const puissance = 10 ** (chiffres.length - 1 - i);
    if (c) morceaux.push(puissance === 1 ? fr(c) : `(${fr(c)} × ${fr(puissance)})`);
  });
  if (r.decimaux) {
    String(n.dec).padStart(r.decimales, "0").split("").map(Number).forEach((c, i) => {
      if (c) morceaux.push(`(${fr(c)} × 0,${"0".repeat(i)}1)`);
    });
  }
  return morceaux.join(" + ") || "0";
}

/** Deux nombres à comparer : une fois sur deux, des voisins qui se ressemblent. */
export function paireAComparer(r: ReglagesNumeration, alea: () => number): [Nombre, Nombre] {
  const a = unNombre(r, alea);
  const tirage = alea();
  if (tirage < 0.15) return [a, { ...a }];
  if (tirage < 0.6) {
    // Le même nombre, un chiffre changé — ou les décimales seules qui bougent.
    const chiffres = String(a.entier).split("");
    const i = entier(alea, 0, chiffres.length - 1);
    const autre = String((Number(chiffres[i]) + entier(alea, 1, 9)) % 10);
    if (i === 0 && autre === "0") return [a, unNombre(r, alea)];
    chiffres[i] = autre;
    return [a, { entier: Number(chiffres.join("")), dec: a.dec }];
  }
  return [a, unNombre(r, alea)];
}

export const comparer = (a: Nombre, b: Nombre, r: ReglagesNumeration) => {
  const va = valeur(a, r), vb = valeur(b, r);
  return va < vb ? "<" : va > vb ? ">" : "=";
};

/** Encadrer à la dizaine, à la centaine, au millier — ou à l'unité et au dixième près pour un décimal. */
export function encadrement(n: Nombre, r: ReglagesNumeration, alea: () => number): { pas: number; bas: string; haut: string; libelle: string } {
  if (r.decimaux) {
    const enDixiemes = alea() < 0.5 && r.decimales > 1;
    if (enDixiemes) {
      const bas = Math.floor(valeur(n, r) * 10) / 10;
      return { pas: 0.1, bas: fr(bas, 1), haut: fr(bas + 0.1, 1), libelle: "au dixième près" };
    }
    return { pas: 1, bas: fr(n.entier), haut: fr(n.entier + 1), libelle: "à l'unité près" };
  }
  // Un pas plus grand que le nombre n'encadre rien : « 0 < 758 < 10 000 ».
  const possibles = [10, 100, 1000, 10000, 100000, 1000000].filter((p) => p * 10 <= Math.max(1000, r.jusqua) && p <= n.entier);
  const pas = possibles.length ? choisir(alea, possibles) : 10;
  const bas = Math.floor(n.entier / pas) * pas;
  const libelles: Record<number, string> = { 10: "à la dizaine près", 100: "à la centaine près", 1000: "au millier près", 10000: "à la dizaine de mille près", 100000: "à la centaine de mille près", 1000000: "au million près" };
  return { pas, bas: fr(bas), haut: fr(bas + pas), libelle: libelles[pas] };
}

// ── Le tableau de numération ──────────────────────────────────────────────

const CLASSES = [
  { nom: "milliards", seuil: 1_000_000_000 }, { nom: "millions", seuil: 1_000_000 }, { nom: "mille", seuil: 1000 }, { nom: "unités simples", seuil: 1 },
];

/** Les chiffres d'un nombre, classe par classe, du rang le plus haut au plus bas ; vide au-dessus du premier chiffre. */
export function chiffresDuTableau(n: Nombre, r: ReglagesNumeration, classes: number): string[] {
  const texte = String(n.entier).padStart(3 * classes, " ").split("").map((c) => (c === " " ? "" : c));
  if (!r.decimaux) return texte;
  const dec = String(n.dec).padStart(r.decimales, "0").split("");
  return [...texte, ...dec];
}

function tableauHtml(nombres: Nombre[], r: ReglagesNumeration, corrige: boolean): string {
  // Les nombres restent sous le plafond : jusqu'à 1 000, pas de classe des mille.
  const classes = CLASSES.filter((c) => c.seuil < Math.max(1000, r.jusqua));
  const entetes = classes.map((c) => `<th colspan="3" class="nu-classe">${c.nom}</th>`).join("")
    + (r.decimaux ? PARTIES.slice(0, r.decimales).map((p) => `<th class="nu-classe nu-dec">${p}</th>`).join("") : "");
  const sous = classes.map(() => `<th>c</th><th>d</th><th>u</th>`).join("") + (r.decimaux ? PARTIES.slice(0, r.decimales).map(() => `<th class="nu-dec"></th>`).join("") : "");
  const lignes = nombres.map((n) => {
    const chiffres = corrige ? chiffresDuTableau(n, r, classes.length) : [];
    const total = 3 * classes.length + (r.decimaux ? r.decimales : 0);
    return `<tr><td class="nu-nombre">${ecrireNombre(n, r)}</td>${Array.from({ length: total }, (_, i) => `<td class="${i >= 3 * classes.length ? "nu-dec" : ""}">${chiffres[i] ?? ""}</td>`).join("")}</tr>`;
  }).join("");
  return `<table class="nu-tableau"><thead><tr><th rowspan="2"></th>${entetes}</tr><tr>${sous}</tr></thead><tbody>${lignes}</tbody></table>`;
}

// ── La feuille ────────────────────────────────────────────────────────────

export function htmlNumeration(r: ReglagesNumeration, graine: number): string {
  const alea = hasard(graine);
  const combien = Math.max(1, Math.min(10, r.combien));
  const titre = r.decimaux ? "Numération — les nombres décimaux" : "Numération — les grands nombres";
  const exercices: string[] = [];
  const corriges: string[] = [];
  let num = 0;
  const bloc = (consigne: string, corps: string, corrige: string) => {
    num++;
    exercices.push(`<div class="nu-exo"><div class="nu-consigne"><b>${num}.</b> <span class="consigne">${consigne}</span></div>${corps}</div>`);
    corriges.push(`<div class="nu-exo"><div class="nu-consigne"><b>${num}.</b> ${consigne}</div>${corrige}</div>`);
  };
  for (const ex of EXERCICES_NUMERATION.map((e) => e.id).filter((e) => r.exercices.includes(e))) {
    if (ex === "tableau") {
      const nombres = nombresNumeration(r, combien, alea);
      bloc("Place chaque nombre dans le tableau de numération, un chiffre par colonne.", tableauHtml(nombres, r, false), tableauHtml(nombres, r, true));
    } else if (ex === "lettres") {
      const nombres = nombresNumeration(r, combien, alea);
      bloc("Écris chaque nombre en lettres.",
        `<div class="nu-lignes">${nombres.map((n) => `<div><span class="nu-nombre">${ecrireNombre(n, r)}</span> : <span class="nu-trait"></span></div>`).join("")}</div>`,
        `<div class="nu-lignes">${nombres.map((n) => `<div><span class="nu-nombre">${ecrireNombre(n, r)}</span> : <b>${escapeHtml(enLettres(n, r))}</b></div>`).join("")}</div>`);
    } else if (ex === "decomposition") {
      const nombres = nombresNumeration(r, combien, alea);
      bloc("Décompose chaque nombre selon la valeur de ses chiffres.",
        `<div class="nu-lignes">${nombres.map((n) => `<div><span class="nu-nombre">${ecrireNombre(n, r)}</span> = <span class="nu-trait"></span></div>`).join("")}</div>`,
        `<div class="nu-lignes">${nombres.map((n) => `<div><span class="nu-nombre">${ecrireNombre(n, r)}</span> = <b>${decomposer(n, r)}</b><span class="nu-aussi"> = ${decomposerEnProduits(n, r)}</span></div>`).join("")}</div>`);
    } else if (ex === "comparer") {
      const paires = Array.from({ length: combien }, () => paireAComparer(r, alea));
      bloc("Compare avec &lt;, &gt; ou =.",
        `<div class="nu-paires">${paires.map(([a, b]) => `<div>${ecrireNombre(a, r)} <span class="nu-signe"></span> ${ecrireNombre(b, r)}</div>`).join("")}</div>`,
        `<div class="nu-paires">${paires.map(([a, b]) => `<div>${ecrireNombre(a, r)} <b>${escapeHtml(comparer(a, b, r))}</b> ${ecrireNombre(b, r)}</div>`).join("")}</div>`);
    } else if (ex === "encadrer") {
      const nombres = nombresNumeration(r, combien, alea);
      const cadres = nombres.map((n) => ({ n, e: encadrement(n, r, alea) }));
      bloc("Encadre chaque nombre comme on te le demande.",
        `<div class="nu-lignes">${cadres.map(({ n, e }) => `<div><span class="nu-cadre"></span> &lt; ${ecrireNombre(n, r)} &lt; <span class="nu-cadre"></span> <span class="nu-aussi">(${e.libelle})</span></div>`).join("")}</div>`,
        `<div class="nu-lignes">${cadres.map(({ n, e }) => `<div><b>${e.bas}</b> &lt; ${ecrireNombre(n, r)} &lt; <b>${e.haut}</b> <span class="nu-aussi">(${e.libelle})</span></div>`).join("")}</div>`);
    }
  }
  return feuille(`<div class="page"><div class="titre">${titre}</div><div class="sous">Prénom : ........................................ Date : ........................</div>${exercices.join("")}</div>
    <div class="page corrige"><div class="titre">${titre} — corrigé</div>${corriges.join("")}</div>`, "nu");
}

export const STYLE_NUMERATION = `
  .feuille.nu .nu-exo { margin: 0 0 6mm; page-break-inside: avoid; }
  .feuille.nu .nu-consigne { font-size: 13px; margin-bottom: 2.5mm; }
  .feuille.nu .nu-tableau { border-collapse: collapse; width: 100%; font-size: 12px; }
  .feuille.nu .nu-tableau th, .feuille.nu .nu-tableau td { border: 1px solid #9aa0b4; text-align: center; padding: 1.2mm 1mm; height: 7mm; }
  .feuille.nu .nu-tableau th { background: #f0f2f8; font-size: 10.5px; }
  .feuille.nu .nu-tableau .nu-classe { font-weight: 800; }
  .feuille.nu .nu-tableau .nu-dec { background: #fbf6ea; }
  .feuille.nu .nu-tableau th.nu-dec { background: #f3ead2; }
  .feuille.nu .nu-tableau td:nth-child(3n+1) { border-right-width: 2px; }
  .feuille.nu .nu-tableau .nu-nombre { text-align: right; width: 24mm; padding-right: 2mm; }
  .feuille.nu .nu-nombre { font-weight: 700; }
  .feuille.nu .nu-lignes > div, .feuille.nu .nu-paires > div { font-size: 14px; margin: 0 0 3.5mm; line-height: 1.6; }
  .feuille.nu .nu-paires { display: grid; grid-template-columns: repeat(2, 1fr); }
  .feuille.nu .nu-trait { display: inline-block; min-width: 110mm; border-bottom: 1px dotted #9aa0b4; vertical-align: bottom; }
  .feuille.nu .nu-signe, .feuille.nu .nu-cadre { display: inline-block; width: 10mm; height: 7mm; border: 1.5px solid #1c2233; border-radius: 1.5mm; vertical-align: middle; }
  .feuille.nu .nu-cadre { width: 24mm; }
  .feuille.nu .nu-aussi { color: #687087; font-size: 11.5px; }
`;
