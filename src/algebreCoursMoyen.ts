// L'initiation à la pensée algébrique, au cours moyen.
//
// Programme de mathématiques du cycle 3 (2025), « Algèbre » : trouver le
// nombre manquant d'une égalité à trou, déterminer un nombre inconnu
// représenté par un symbole ou une lettre, exécuter — et au CM2 produire —
// un programme de calcul, poursuivre une suite de nombres ou de motifs. Les
// exemples de réussite (Éduscol, 2025) et le livret du CM1 (2026, séquence
// « Initiation au raisonnement algébrique ») donnent les situations : les
// cartes et les enveloppes, la balance à plateaux, « je pense à un nombre ».
// Le signe « = » y relie deux expressions égales, pas seulement une
// opération et son résultat.

import { feuille } from "./cartesImprimables";
import { hasard } from "./hasard";
import { choisir, entier, fr } from "./nombres";
import { escapeHtml } from "./print";

export type ExerciceAlgebre = "egalites" | "programme" | "suite-nombres" | "suite-motifs" | "enveloppes" | "balance" | "balance-combinee" | "je-pense" | "contextes";

export const EXERCICES_ALGEBRE: { id: ExerciceAlgebre; libelle: string }[] = [
  { id: "egalites", libelle: "Le nombre manquant d'une égalité à trou" },
  { id: "programme", libelle: "Un programme de calcul" },
  { id: "suite-nombres", libelle: "Une suite de nombres : la règle, les termes suivants" },
  { id: "suite-motifs", libelle: "Une suite de motifs : combien d'éléments ?" },
  { id: "enveloppes", libelle: "Des cartes et des enveloppes" },
  { id: "balance", libelle: "La balance à plateaux, en une étape" },
  { id: "balance-combinee", libelle: "La balance à plateaux, en deux étapes" },
  { id: "je-pense", libelle: "Je pense à un nombre" },
  { id: "contextes", libelle: "D'autres contextes : des prix, des contenances" },
];

export interface ReglagesAlgebre { classe: "CM1" | "CM2"; exercices: ExerciceAlgebre[]; combien: number; titre?: string }
export const REGLAGES_ALGEBRE: ReglagesAlgebre = { classe: "CM1", exercices: ["egalites"], combien: 6 };

interface Bloc { consigne: string; corps: string; corrige: string }
const TROU = '<span class="al-trou"></span>';
/** De quoi écrire l'égalité ou le calcul ; un cadre pour le schéma en barres. */
const ECRIRE = (quoi: string) => `<div class="al-regle">${quoi} : <span class="al-trait"></span></div>`;
const CADRE = '<div class="al-cadre"></div>';
const lignes = (items: string[]) => `<div class="al-lignes">${items.map((x) => `<div>${x}</div>`).join("")}</div>`;

// ── Les égalités à trou ───────────────────────────────────────────────────

/** Une égalité à trou : le texte, « … » marquant le trou, et le nombre qui le comble. */
function uneEgalite(alea: () => number, cm2: boolean): [string, number] {
  const sorte = entier(alea, 0, cm2 ? 12 : 9);
  const a = entier(alea, 120, 980), b = entier(alea, 12, 95), d = entier(alea, 1, 5);
  switch (sorte) {
    case 0: { const dz = 10 * entier(alea, 2, 9); return [`${fr(a)} = ${dz} + …`, a - dz]; }
    case 1: { const m = 1000 * entier(alea, 2, 9) + 100 * entier(alea, 1, 9); const c = m - 100 * entier(alea, 1, 5); return [`${fr(m)} − … = ${fr(c)}`, m - c]; }
    case 2: { const m = 1000 * entier(alea, 2, 9); return [`${fr(m)} − … = ${fr(m - 1)}`, 1]; }
    case 3: return [`2 × ${a} × 5 = ${a} × …`, 10];
    case 4: { const p = 2 * entier(alea, 6, 49); return [`${p} × 5 = … × 10`, p / 2]; }
    case 5: return [`${a} + ${b} = ${a - d} + …`, b + d];
    case 6: return [`${a} − ${b} = … − ${b + d}`, a + d];
    case 7: { const c = 100 * entier(alea, 8, 20); return [`${fr(a)} + … = ${fr(c)}`, c - a]; }
    case 8: { const p = entier(alea, 21, 39); return [`${p} × 5 = ${p - 4} × 5 + … × 5`, 4]; }
    case 9: { const q = entier(alea, 2, 9); const x = entier(alea, 10, 60); return [`${x + 5 * q} − ${x} = … × 5`, q]; }
    // Au CM2, des membres à deux opérations : (2 × …) − 5 = 23 ; 8 + (2 × …) = 11.
    case 10: { const x = entier(alea, 3, 30); return [`(2 × …) − 5 = ${2 * x - 5}`, x]; }
    case 11: { const x = entier(alea, 2, 20); return [`8 + (2 × …) = ${8 + 2 * x}`, x]; }
    default: { const x = entier(alea, 6, 40); return [`${x - 5 + 10} = 10 + (… − 5)`, x]; }
  }
}

function egalites(alea: () => number, r: ReglagesAlgebre): Bloc {
  const items: [string, number][] = [];
  for (let garde = 0; items.length < r.combien && garde < 300; garde++) {
    const e = uneEgalite(alea, r.classe === "CM2");
    if (e[1] > 0 && !items.some((x) => x[0] === e[0])) items.push(e);
  }
  return {
    consigne: "Trouve le nombre qui manque. Le signe = veut dire que les deux côtés valent autant.",
    corps: lignes(items.map(([t]) => escapeHtml(t).replace("…", TROU))),
    corrige: lignes(items.map(([t, v]) => escapeHtml(t).replace("…", `<b>${fr(v)}</b>`))),
  };
}

// ── Les programmes de calcul ──────────────────────────────────────────────

interface Etape { dire: string; faire: (x: number) => number }

/** Deux étapes au CM1 ; jusqu'à trois au CM2, comme « ajouter 2, multiplier par 4, retirer 3 ». */
function etapesDuProgramme(alea: () => number, cm2: boolean): Etape[] {
  const a = entier(alea, 2, 9), k = entier(alea, 2, 5), b = entier(alea, 1, 7);
  const ajouter: Etape = { dire: `Ajouter ${a} au nombre choisi.`, faire: (x) => x + a };
  const multiplier: Etape = { dire: `Multiplier le résultat par ${k}.`, faire: (x) => x * k };
  switch (entier(alea, 0, cm2 ? 2 : 1)) {
    case 0: return [ajouter, multiplier];
    case 1: return [{ dire: `Multiplier le nombre choisi par ${k}.`, faire: (x) => x * k }, { dire: `Ajouter ${a} au résultat.`, faire: (x) => x + a }];
    default: return [ajouter, multiplier, { dire: `Retirer ${b} au nombre obtenu.`, faire: (x) => x - b }];
  }
}

function programme(alea: () => number, r: ReglagesAlgebre): Bloc {
  const cm2 = r.classe === "CM2";
  const etapes = etapesDuProgramme(alea, cm2);
  const appliquer = (x: number) => etapes.reduce((v, e) => e.faire(v), x);
  const departs = [entier(alea, 2, 6), entier(alea, 7, 12), entier(alea, 13, 25)];
  const texte = `<ol class="al-programme"><li>Choisir un nombre entier.</li>${etapes.map((e) => `<li>${escapeHtml(e.dire)}</li>`).join("")}<li>Écrire le nombre obtenu.</li></ol>`;
  const tableau = (corrige: boolean) => `<table class="al-tableau"><thead><tr><th>Nombre choisi</th>${departs.map((d) => `<th>${d}</th>`).join("")}</tr></thead>`
    + `<tbody><tr><td>Nombre obtenu</td>${departs.map((d) => `<td>${corrige ? `<b>${fr(appliquer(d))}</b>` : ""}</td>`).join("")}</tr></tbody></table>`;
  // Au CM2, on produit aussi un programme : deux étapes qui mènent d'un nombre à un autre.
  const x0 = entier(alea, 2, 9), a2 = entier(alea, 1, 9), k2 = entier(alea, 2, 6), y0 = (x0 + a2) * k2;
  const produire = (corrige: boolean) => (cm2
    ? `<div class="al-lignes"><div>Écris un programme de calcul de deux étapes qui, appliqué à ${x0}, donne ${y0}.${corrige
      ? ` <b>Par exemple : ajouter ${a2}, puis multiplier le résultat par ${k2} — (${x0} + ${a2}) × ${k2} = ${y0}.</b> D'autres programmes sont possibles.`
      : '<div class="al-regle"><span class="al-trait"></span></div><div class="al-regle"><span class="al-trait"></span></div>'}</div></div>`
    : "");
  return {
    consigne: cm2 ? "Applique ce programme de calcul aux nombres du tableau. Puis écris le tien." : "Applique ce programme de calcul aux nombres du tableau.",
    corps: texte + tableau(false) + produire(false),
    corrige: texte + tableau(true) + produire(true),
  };
}

// ── Les suites ────────────────────────────────────────────────────────────

function uneSuite(alea: () => number, cm2: boolean): { termes: number[]; suivants: number[]; regle: string } {
  const sorte = entier(alea, 0, cm2 ? 6 : 3);
  const depart = entier(alea, 1, 20);
  const longueur = 5;
  const construire = (suivant: (x: number, i: number) => number, premier = depart) => {
    const t = [premier];
    for (let i = 1; i < longueur + 3; i++) t.push(suivant(t[i - 1], i));
    return { termes: t.slice(0, longueur), suivants: t.slice(longueur) };
  };
  if (sorte === 0) { const k = entier(alea, 3, 12); return { ...construire((x) => x + k), regle: `On ajoute ${k}.` }; }
  if (sorte === 1) { const k = entier(alea, 2, 3); return { ...construire((x) => x * k), regle: `On multiplie par ${k}.` }; }
  if (sorte === 2) { const a = entier(alea, 4, 9), b = entier(alea, 1, a - 1); return { ...construire((x, i) => (i % 2 ? x + a : x - b)), regle: `On ajoute ${a}, puis on retire ${b}, et ainsi de suite.` }; }
  if (sorte === 3) { const a = entier(alea, 1, 3), b = entier(alea, 4, 7); return { ...construire((x, i) => (i % 2 ? x + a : x + b)), regle: `On ajoute ${a}, puis ${b}, et ainsi de suite.` }; }
  // Au CM2, des règles plus complexes, comme 7 ; 15 ; 31 ; 63 (le double, plus 1), 3 ; 7 ; 12 ; 18 ou 7 ; 12 ; 22 ; 42.
  if (sorte === 4) return { ...construire((x) => 2 * x + 1), regle: "On prend le double, et on ajoute 1." };
  if (sorte === 5) { const d = entier(alea, 2, 5); return { ...construire((x, i) => x + d + i - 1), regle: `On ajoute ${d}, puis ${d + 1}, puis ${d + 2}, et ainsi de suite.` }; }
  const k = entier(alea, 1, 3);
  return { ...construire((x) => 2 * x - k, entier(alea, k + 2, 20)), regle: `On prend le double, et on retire ${k}.` };
}

function suiteNombres(alea: () => number, r: ReglagesAlgebre): Bloc {
  const cm2 = r.classe === "CM2";
  const suites = Array.from({ length: Math.max(1, Math.min(6, r.combien)) }, () => uneSuite(alea, cm2));
  // Au CM2, quand on ajoute toujours le même nombre, le terme d'un rang éloigné : le 100e de 5 ; 8 ; 11 ; 14 ; 17 vaut 2 + 100 × 3.
  const pas = entier(alea, 2, 9), premier = entier(alea, pas + 1, 20), rang = choisir(alea, [20, 50, 100]);
  const loin = (corrige: boolean) => (cm2
    ? [`Dans la suite ${[0, 1, 2, 3, 4].map((i) => fr(premier + i * pas)).join(" ; ")} ; …, quel est le ${rang}<sup>e</sup> nombre ? ${corrige
      ? `<b>${premier - pas} + ${rang} × ${pas} = ${fr(premier - pas + rang * pas)}</b>` : TROU}`]
    : []);
  return {
    consigne: "Trouve la règle de chaque suite, écris-la, puis donne les trois nombres suivants.",
    corps: lignes([...suites.map((s) => `${s.termes.map((x) => fr(x)).join(" ; ")} ; ${TROU} ; ${TROU} ; ${TROU}<div class="al-regle">Règle : <span class="al-trait"></span></div>`), ...loin(false)]),
    corrige: lignes([...suites.map((s) => `${s.termes.map((x) => fr(x)).join(" ; ")} ; <b>${s.suivants.map((x) => fr(x)).join(" ; ")}</b><div class="al-regle">Règle : ${escapeHtml(s.regle)}</div>`), ...loin(true)]),
  };
}

/** Une suite de motifs : le nombre de carrés à l'étape n, et le dessin des trois premières étapes. */
function unMotif(alea: () => number): { nombre: (n: number) => number; dessin: (n: number) => [number, number][]; regle: string } {
  const sorte = entier(alea, 0, 3);
  if (sorte === 0) {
    // Une ligne qui s'allonge de deux ou trois carrés à chaque étape, comme les cœurs « plus trois » du programme.
    const depart = entier(alea, 1, 3), plus = entier(alea, 2, 3);
    return { nombre: (k) => depart + plus * (k - 1), dessin: (k) => Array.from({ length: depart + plus * (k - 1) }, (_, i) => [i, 0]), regle: `On ajoute ${plus} carrés à chaque étape.` };
  }
  if (sorte === 1) {
    // Un L dont chaque branche s'allonge d'un carré.
    return {
      nombre: (k) => 2 * k + 1,
      dessin: (k) => [[0, 0] as [number, number], ...Array.from({ length: k }, (_, i) => [i + 1, 0] as [number, number]), ...Array.from({ length: k }, (_, i) => [0, i + 1] as [number, number])],
      regle: "On ajoute 1 carré à chaque branche : 2 de plus à chaque étape.",
    };
  }
  if (sorte === 2) {
    // Un escalier, comme les ronds du programme : à chaque étape, autant de carrés en plus que le numéro de l'étape.
    return {
      nombre: (k) => (k * (k + 1)) / 2,
      dessin: (k) => Array.from({ length: k }, (_, x) => Array.from({ length: x + 1 }, (_, y) => [x, y] as [number, number])).flat(),
      regle: "À chaque étape, on ajoute autant de carrés que le numéro de l'étape.",
    };
  }
  // Un carré qui grandit : n × n.
  return { nombre: (k) => k * k, dessin: (k) => Array.from({ length: k * k }, (_, i) => [i % k, Math.floor(i / k)]), regle: "À l'étape n, n rangées de n carrés." };
}

function suiteMotifs(alea: () => number, r: ReglagesAlgebre): Bloc {
  const m = unMotif(alea);
  const c = 4; // millimètres par carré, en unités du SVG
  const etape = (k: number) => {
    const cases = m.dessin(k);
    const w = (Math.max(...cases.map(([x]) => x)) + 1) * c, h = (Math.max(...cases.map(([, y]) => y)) + 1) * c;
    return `<figure class="al-etape"><svg viewBox="-0.5 -0.5 ${w + 1} ${h + 1}" width="${w + 1}mm" height="${h + 1}mm">`
      + cases.map(([x, y]) => `<rect x="${x * c}" y="${h - (y + 1) * c}" width="${c}" height="${c}" fill="#c7d2fe" stroke="#1c2233" stroke-width="0.3"/>`).join("")
      + `</svg><figcaption>Étape ${k}</figcaption></figure>`;
  };
  const loin = r.classe === "CM2" ? 10 : 6;
  const questions = (corrige: boolean) => lignes([
    ...[4, 5].map((k) => `Étape ${k} : ${corrige ? `<b>${m.nombre(k)}</b>` : TROU} carrés`),
    `Étape ${loin} : ${corrige ? `<b>${m.nombre(loin)}</b>` : TROU} carrés`,
    `Comment passe-t-on d'une étape à la suivante ? ${corrige ? escapeHtml(m.regle) : '<span class="al-trait"></span>'}`,
  ]);
  return {
    consigne: "Voici les trois premières étapes d'une suite de motifs. Combien de carrés y aura-t-il aux étapes suivantes ?",
    corps: `<div class="al-motifs">${[1, 2, 3].map(etape).join("")}</div>${questions(false)}`,
    corrige: `<div class="al-motifs">${[1, 2, 3].map(etape).join("")}</div>${questions(true)}`,
  };
}

// ── Les nombres inconnus ──────────────────────────────────────────────────

const ENVELOPPE = "✉";

function enveloppes(alea: () => number, r: ReglagesAlgebre): Bloc {
  const items = Array.from({ length: Math.max(1, Math.min(6, r.combien)) }, (_, i) => {
    const dans = entier(alea, 4, 15), k = entier(alea, 2, 5), horsDe = entier(alea, 3, 20);
    // Le livret, séances 1 et 2 : le champ multiplicatif (trois enveloppes = 27 cartes) et l'additif (une enveloppe et 17 cartes = 42),
    // en alternance ; les situations qui combinent les deux viennent avec la balance.
    if (i % 2 === 0) return { texte: `${k} enveloppes ${ENVELOPPE} contenant chacune le même nombre de cartes`, autre: k * dans, dans, calcul: `${k * dans} = ${k} × ${dans} ; ${k * dans} ÷ ${k} = ${dans}` };
    return { texte: `1 enveloppe ${ENVELOPPE} et ${horsDe} cartes hors de l'enveloppe`, autre: dans + horsDe, dans, calcul: `${dans + horsDe} = ${horsDe} + ${dans} ; ${dans + horsDe} − ${horsDe} = ${dans}` };
  });
  return {
    consigne: "Les deux enfants ont autant de cartes. Combien y a-t-il de cartes dans chaque enveloppe ? Écris l'égalité, puis le calcul.",
    corps: lignes(items.map((x) => `Théo a ${escapeHtml(x.texte)}. Léa a ${x.autre} cartes. Dans chaque enveloppe : ${TROU} cartes.${ECRIRE("L'égalité, le calcul")}`)),
    corrige: lignes(items.map((x) => `Théo a ${escapeHtml(x.texte)}. Léa a ${x.autre} cartes. <b>${escapeHtml(x.calcul)}</b> : ${x.dans} cartes par enveloppe.`)),
  };
}

/**
 * Une balance à l'équilibre : sur chaque plateau, des objets identiques (un
 * mot, ou « ? » pour une boîte mystère) et des masses marquées, par rangées
 * de cinq, à leur taille réelle ou presque — un millimètre par unité.
 */
function balanceSvg(gauche: string[], droite: string[]): string {
  const parRangee = 5;
  const rangees = Math.max(1, Math.ceil(gauche.length / parRangee), Math.ceil(droite.length / parRangee));
  const fleau = 2 + rangees * 10;
  const boite = (x: number, y: number, texte: string) => `<rect x="${x}" y="${y}" width="15" height="9" rx="1.2" fill="${/ g$/.test(texte) ? "#fde68a" : "#c7d2fe"}" stroke="#1c2233" stroke-width="0.4"/>`
    + `<text x="${x + 7.5}" y="${y + 6.2}" font-size="${texte.length > 6 ? 2.9 : 3.4}" text-anchor="middle" fill="#1c2233">${escapeHtml(texte)}</text>`;
  const plateau = (x0: number, contenu: string[]) => contenu.map((t, i) => boite(x0 + (i % parRangee) * 16, fleau - 10 * (Math.floor(i / parRangee) + 1), t)).join("");
  const largeur = Math.min(parRangee, Math.max(gauche.length, droite.length)) * 16;
  const w = 2 * largeur + 30, h = fleau + 12;
  return `<svg class="al-balance" viewBox="0 0 ${w} ${h}" width="${Math.min(170, w)}mm" height="${(Math.min(170, w) * h) / w}mm">`
    + `<line x1="4" y1="${fleau}" x2="${w - 4}" y2="${fleau}" stroke="#1c2233" stroke-width="0.8"/><polygon points="${w / 2},${fleau} ${w / 2 - 5},${fleau + 10} ${w / 2 + 5},${fleau + 10}" fill="#94a3b8"/>`
    + plateau(4, gauche) + plateau(largeur + 26, droite) + "</svg>";
}

/** Les objets des balances : les boîtes mystère du livret de CM1, les crayons et les ciseaux du programme. */
const OBJETS_DES_BALANCES = [
  { nom: "boîte mystère", une: "une boîte mystère", etiquette: "?", masse: (alea: () => number) => 5 * entier(alea, 2, 40) },
  { nom: "crayon", une: "un crayon", etiquette: "crayon", masse: (alea: () => number) => entier(alea, 6, 20) },
  { nom: "paire de ciseaux", une: "une paire de ciseaux", etiquette: "ciseaux", masse: (alea: () => number) => 5 * entier(alea, 8, 18) },
];
const grammes = (m: number) => `${fr(m)} g`;
const pesee = (svg: string, question: string) => `<div class="al-pesee">${svg}<div>${question}</div></div>`;

/**
 * Une étape (séance 3 du livret de CM1) : sept boîtes mystère pèsent 91 g,
 * « c'est comme les enveloppes » ; une boîte et 8 g pèsent 32 g.
 */
function balance(alea: () => number, r: ReglagesAlgebre): Bloc {
  const items = Array.from({ length: Math.max(1, Math.min(4, r.combien)) }, (_, i) => {
    const o = choisir(alea, OBJETS_DES_BALANCES), m = o.masse(alea);
    if (i % 2 === 0) {
      const k = entier(alea, 2, 7);
      return { o, m, gauche: Array.from({ length: k }, () => o.etiquette), droite: [grammes(k * m)], calcul: `${fr(k * m)} ÷ ${k} = ${m}` };
    }
    const a = 5 * entier(alea, 1, 20);
    return { o, m, gauche: [o.etiquette, grammes(a)], droite: [grammes(m + a)], calcul: `${fr(m + a)} − ${a} = ${m}` };
  });
  return {
    consigne: "La balance est à l'équilibre : les deux plateaux pèsent autant. Quelle est la masse d'un objet ? Écris le calcul.",
    corps: items.map((x) => pesee(balanceSvg(x.gauche, x.droite), `Masse d'${x.o.une} : ${TROU} g${ECRIRE("Le calcul")}`)).join(""),
    corrige: items.map((x) => pesee(balanceSvg(x.gauche, x.droite), `<b>${x.calcul}</b> : ${x.o.une} pèse ${x.m} g.`)).join(""),
  };
}

/**
 * Deux étapes (séance 4 du livret de CM1) : 900 g d'un côté, deux boîtes
 * mystère et 600 g de l'autre ; on retire d'abord la même masse des deux
 * côtés, puis on partage. Au CM2, deux pesées pour deux objets inconnus.
 */
function balanceCombinee(alea: () => number, r: ReglagesAlgebre): Bloc {
  const cm2 = r.classe === "CM2";
  const items = Array.from({ length: Math.max(1, Math.min(4, r.combien)) }, (_, i) => {
    if (cm2 && i % 2 === 1) {
      // Des ciseaux et des crayons : d'une pesée à l'autre, seuls des crayons changent.
      const ciseaux = 5 * entier(alea, 8, 18), crayon = entier(alea, 6, 20), i1 = entier(alea, 1, 2), i2 = i1 + entier(alea, 1, 3);
      const p1 = ciseaux + i1 * crayon, p2 = ciseaux + i2 * crayon;
      const svg = `<div class="al-legende">Première pesée</div>${balanceSvg(["ciseaux", ...Array.from({ length: i1 }, () => "crayon")], [grammes(p1)])}`
        + `<div class="al-legende">Seconde pesée</div>${balanceSvg(["ciseaux", ...Array.from({ length: i2 }, () => "crayon")], [grammes(p2)])}`;
      return {
        svg, question: `Masse d'une paire de ciseaux : ${TROU} g. Masse d'un crayon : ${TROU} g.`,
        reponse: `<b>${i2 - i1} crayon${i2 - i1 > 1 ? "s" : ""} de plus, ${p2 - p1} g de plus : ${p2 - p1} ÷ ${i2 - i1} = ${crayon} ; ${p1} − ${i1 === 1 ? crayon : `${i1} × ${crayon}`} = ${ciseaux}</b> : un crayon pèse ${crayon} g, une paire de ciseaux ${ciseaux} g.`,
      };
    }
    const o = choisir(alea, OBJETS_DES_BALANCES), m = o.masse(alea), k = entier(alea, 2, cm2 ? 9 : 7), a = 5 * entier(alea, 2, 120);
    const objets = Array.from({ length: k }, () => o.etiquette), total = k * m + a;
    // Les objets tantôt à gauche, tantôt à droite, comme « 670 g d'un côté ; 250 g et 7 boîtes de l'autre ».
    const [gauche, droite] = alea() < 0.5 ? [[...objets, grammes(a)], [grammes(total)]] : [[grammes(total)], [grammes(a), ...objets]];
    return {
      svg: balanceSvg(gauche, droite), question: `Masse d'${o.une} : ${TROU} g`,
      reponse: `<b>${fr(total)} − ${fr(a)} = ${fr(k * m)} ; ${fr(k * m)} ÷ ${k} = ${m}</b> : ${o.une} pèse ${m} g.`,
    };
  });
  return {
    consigne: "Les balances sont à l'équilibre. Je retire d'abord la même masse de chaque côté, puis je partage. Écris les calculs.",
    corps: items.map((x) => pesee(x.svg, `${x.question}${ECRIRE("Les calculs")}`)).join(""),
    corrige: items.map((x) => pesee(x.svg, x.reponse)).join(""),
  };
}

function jePense(alea: () => number, r: ReglagesAlgebre): Bloc {
  const combien = Math.max(1, Math.min(6, r.combien));
  const items = Array.from({ length: combien }, (_, i) => {
    const x = entier(alea, 3, 40), k = entier(alea, 2, 4), a = entier(alea, 2, 12);
    if (r.classe === "CM2" && combien > 1 && i === combien - 1) {
      // Les billes du programme de CM2 : trois nombres inconnus reliés entre eux, et un schéma en barres.
      const vertes = entier(alea, 12, 40), f = entier(alea, 2, 5), d = entier(alea, 5, 25), total = (f + 2) * vertes + d;
      return {
        texte: `Dans un paquet de billes rouges, vertes et bleues, il y a ${total} billes. Il y a ${f} fois plus de billes rouges que de billes vertes, et ${d} billes vertes de moins que de billes bleues. Combien y a-t-il de billes de chaque couleur ?`,
        reponse: `Rouges : ${TROU} vertes : ${TROU} bleues : ${TROU}`,
        calcul: `Vertes, une part ; rouges, ${f} parts ; bleues, une part et ${d} : ${total} − ${d} = ${total - d} ; ${total - d} ÷ ${f + 2} = ${vertes} vertes ; ${f} × ${vertes} = ${f * vertes} rouges ; ${vertes} + ${d} = ${vertes + d} bleues`,
      };
    }
    if (i % 2 === 0) return { texte: `Je pense à un nombre. J'ajoute ${a} au ${k === 2 ? "double" : k === 3 ? "triple" : "quadruple"} de ce nombre et je trouve ${k * x + a}. Quel est mon nombre ?`, reponse: TROU, calcul: `${k * x + a} − ${a} = ${k * x} ; ${k * x} ÷ ${k} = ${x}` };
    return { texte: `J'ai choisi un nombre N et j'ai calculé ${k} × (${a} + N). J'ai trouvé ${k * (a + x)}. Quel est le nombre N ?`, reponse: TROU, calcul: `${k * (a + x)} ÷ ${k} = ${a + x} ; ${a + x} − ${a} = ${x}` };
  });
  return {
    consigne: "Trouve le nombre. Tu peux t'aider d'un schéma en barres.",
    corps: lignes(items.map((x) => `${escapeHtml(x.texte)} ${x.reponse}${CADRE}`)),
    corrige: lignes(items.map((x) => `${escapeHtml(x.texte)} <b>${escapeHtml(x.calcul)}</b>`)),
  };
}

/**
 * D'autres contextes (séance 6 du livret de CM1) : des prix, des contenances.
 * On y retrouve les enveloppes et les balances : une seule quantité inconnue,
 * répétée, ajoutée à une autre, ou les deux.
 */
function contextes(alea: () => number, r: ReglagesAlgebre): Bloc {
  const items = Array.from({ length: Math.max(1, Math.min(6, r.combien)) }, (_, i) => {
    const k = entier(alea, 3, 8);
    switch (i % 4) {
      case 0: {
        const p = entier(alea, 2, 9);
        return { texte: `${k} cahiers identiques coûtent ${k * p} €. Combien coûte un cahier ?`, unite: "€", egalite: `${k} × ? = ${k * p}`, calcul: `${k * p} ÷ ${k} = ${p}`, v: p };
      }
      case 1: {
        const s = entier(alea, 2, 6), l = entier(alea, 8, 25);
        return { texte: `Un livre et un stylo à ${s} € coûtent ensemble ${l + s} €. Combien coûte le livre ?`, unite: "€", egalite: `? + ${s} = ${l + s}`, calcul: `${l + s} − ${s} = ${l}`, v: l };
      }
      case 2: {
        const b = choisir(alea, [25, 33, 50, 75]), a = 5 * entier(alea, 2, 30), t = k * b + a;
        return {
          texte: `On verse ${k} bouteilles identiques et ${a} cL d'eau dans une bassine vide : elle contient alors ${t} cL. Combien contient une bouteille ?`,
          unite: "cL", egalite: `${k} × ? + ${a} = ${t}`, calcul: `${t} − ${a} = ${k * b} ; ${k * b} ÷ ${k} = ${b}`, v: b,
        };
      }
      default: {
        const melon = entier(alea, 2, 5), ananas = entier(alea, 2, 6), t = k * melon + ananas;
        return { texte: `${k} melons identiques et un ananas à ${ananas} € coûtent ${t} €. Combien coûte un melon ?`, unite: "€", egalite: `${k} × ? + ${ananas} = ${t}`, calcul: `${t} − ${ananas} = ${k * melon} ; ${k * melon} ÷ ${k} = ${melon}`, v: melon };
      }
    }
  });
  return {
    consigne: "Comme avec les enveloppes et les balances : écris l'égalité, puis le calcul.",
    corps: lignes(items.map((x) => `${escapeHtml(x.texte)} ${TROU} ${x.unite}${ECRIRE("L'égalité, le calcul")}`)),
    corrige: lignes(items.map((x) => `${escapeHtml(x.texte)} <b>${escapeHtml(x.egalite)} ; ${escapeHtml(x.calcul)}</b>`)),
  };
}

const FABRIQUES: Record<ExerciceAlgebre, (alea: () => number, r: ReglagesAlgebre) => Bloc> = {
  egalites, programme, "suite-nombres": suiteNombres, "suite-motifs": suiteMotifs, enveloppes, balance, "balance-combinee": balanceCombinee,
  "je-pense": jePense, contextes,
};

export function htmlAlgebre(r: ReglagesAlgebre, graine: number): string {
  const alea = hasard(graine);
  const titre = r.titre ?? "Algèbre";
  const exos: string[] = [], corriges: string[] = [];
  EXERCICES_ALGEBRE.map((e) => e.id).filter((e) => r.exercices.includes(e)).forEach((ex, i) => {
    const b = FABRIQUES[ex](alea, { ...r, combien: Math.max(1, Math.min(10, r.combien)) });
    exos.push(`<div class="al-exo"><div class="al-consigne"><b>${i + 1}.</b> <span class="consigne">${b.consigne}</span></div>${b.corps}</div>`);
    corriges.push(`<div class="al-exo"><div class="al-consigne"><b>${i + 1}.</b> ${b.consigne}</div>${b.corrige}</div>`);
  });
  return feuille(`<div class="page"><div class="titre">${escapeHtml(titre)}</div><div class="sous">Prénom : ........................................ Date : ........................</div>${exos.join("")}</div>
    <div class="page corrige"><div class="titre">${escapeHtml(titre)} — corrigé</div>${corriges.join("")}</div>`, "al");
}

export const STYLE_ALGEBRE = `
  .feuille.al .al-exo { margin: 0 0 6mm; }
  .feuille.al .al-consigne { font-size: 13px; margin-bottom: 3mm; break-after: avoid; page-break-after: avoid; }
  .feuille.al .al-lignes > div, .feuille.al .al-programme, .feuille.al .al-tableau, .feuille.al .al-motifs { break-inside: avoid; page-break-inside: avoid; }
  .feuille.al .al-lignes > div { font-size: 15px; margin: 0 0 4mm; line-height: 1.7; }
  .feuille.al .al-trou { display: inline-block; width: 14mm; height: 7mm; border: 1.5px solid #1c2233; border-radius: 1.5mm; vertical-align: middle; }
  .feuille.al .al-trait { display: inline-block; min-width: 90mm; border-bottom: 1px dotted #9aa0b4; height: 6mm; vertical-align: bottom; }
  .feuille.al .al-regle { font-size: 13px; color: #4b5266; margin-top: 1mm; }
  .feuille.al .al-programme { font-size: 14px; margin: 0 0 3mm 6mm; padding: 2mm 4mm; border: 1.2px solid #c4c9d6; border-radius: 2mm; display: inline-block; }
  .feuille.al .al-tableau { border-collapse: collapse; font-size: 14px; margin: 0 0 3mm; }
  .feuille.al .al-tableau th, .feuille.al .al-tableau td { border: 1px solid #9aa0b4; padding: 1.5mm 4mm; min-width: 16mm; height: 8mm; text-align: center; }
  .feuille.al .al-tableau th { background: #f0f2f8; }
  .feuille.al .al-motifs { display: flex; gap: 10mm; align-items: flex-end; margin: 0 0 4mm; }
  .feuille.al .al-etape { margin: 0; text-align: center; }
  .feuille.al .al-etape figcaption { font-size: 12px; color: #4b5266; margin-top: 1mm; }
  .feuille.al .al-pesee { margin: 0 0 5mm; font-size: 15px; }
  .feuille.al .al-balance { display: block; margin: 0 0 2mm; }
  .feuille.al .al-pesee { page-break-inside: avoid; break-inside: avoid; }
  .feuille.al .al-legende { font-size: 12px; color: #4b5266; margin: 1mm 0; }
  .feuille.al .al-cadre { height: 24mm; border: 1.2px dashed #9aa0b4; border-radius: 2mm; margin: 2mm 0 0; }
`;
