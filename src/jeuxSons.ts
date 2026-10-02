// Les jeux de sons que les guides décrivent, prêts à découper.
//
// Le guide « Pour préparer l'apprentissage de la lecture et de l'écriture à
// l'école maternelle » (2020) nomme ses jeux : le loto des syllabes, le domino
// des syllabes, la chasse à l'intrus. Le livret Français CP (2025) y ajoute le
// loto des lettres, le mémory et le mistigri des lettres, le jeu de
// l'ophtalmologue ; le livret « À partir de 5 ans » (2025) joue au trésor et
// au téléphone avec des paires de mots proches. On les fabrique ici, avec les
// mots et les images que l'enseignant choisit — rien ne sort sans avoir été vu.

import { escapeHtml } from "./print";
import { melanger } from "./hasard";
import { attaque, compterSyllabes, rime } from "./syllabes";
import { ATTRIBUTION_ARASAAC, attributionPour, carte, feuille, imgPicto, legende, pagesDeCartes } from "./cartesImprimables";

/** Un mot et son image, ou pas d'image du tout. */
export interface MotImage {
  id: number | null;
  mot: string;
  /** Le nombre de syllabes fixé par l'enseignant, quand le nôtre est faux. */
  syllabes?: number;
}

export type Images = Record<number, string>;

const image = (m: MotImage, images: Images) => (m.id != null ? images[m.id] : undefined);

/** Les mots simples : un domino ou un intrus ne se joue pas sur « pomme de terre ». */
export const motsSimples = (mots: MotImage[]) => mots.filter((m) => !/[\s-]/.test(m.mot.trim()));

// ── Le loto des syllabes ──────────────────────────────────────────────────
//
// « Chaque élève dispose d'une planche de loto composée de cases dans
// lesquelles un nombre de syllabes est imposé ; l'élève pioche une image,
// scande les syllabes du mot correspondant à l'image, les dénombre pour gagner
// l'image et la poser sur sa planche. » (guide 2020)

export interface ReglagesLotoSyllabes {
  planches: number;
  cases: 6 | 9;
  /** Le plus grand nombre de syllabes qu'on scande : 3 en maternelle, 4 ensuite. */
  maximum: number;
  /** Compter le e muet final (ta-ble), comme on l'écrit. */
  ecrites: boolean;
  legendes: boolean;
}

export const REGLAGES_LOTO_SYLLABES: ReglagesLotoSyllabes = { planches: 4, cases: 6, maximum: 3, ecrites: false, legendes: false };

export const nbSyllabes = (m: MotImage, ecrites: boolean) => m.syllabes ?? compterSyllabes(m.mot, { ecrites });

/** Les nombres de syllabes qu'on peut mettre sur une planche : ceux qu'un mot au moins porte. */
export function comptesDisponibles(mots: MotImage[], r: ReglagesLotoSyllabes): number[] {
  const comptes = new Set<number>();
  for (const m of mots) {
    const n = nbSyllabes(m, r.ecrites);
    if (n >= 1 && n <= r.maximum) comptes.add(n);
  }
  return [...comptes].sort((a, b) => a - b);
}

/**
 * Les planches : chacune ses cases, chaque case un nombre de syllabes.
 *
 * Une planche ne demande jamais plus de cases « 3 syllabes » qu'il n'y a de
 * mots de trois syllabes : sinon elle ne se remplit pas et le jeu s'arrête.
 */
export function planchesLotoSyllabes(mots: MotImage[], r: ReglagesLotoSyllabes, hasard: () => number): number[][] {
  const comptes = comptesDisponibles(mots, r);
  if (!comptes.length) return [];
  const disponibles = new Map<number, number>();
  for (const m of mots) {
    const n = nbSyllabes(m, r.ecrites);
    disponibles.set(n, (disponibles.get(n) ?? 0) + 1);
  }
  const planches: number[][] = [];
  for (let p = 0; p < r.planches; p++) {
    const pris = new Map<number, number>();
    const cases: number[] = [];
    // On tourne sur les comptes, mélangés, pour équilibrer la planche.
    let file = melanger(hasard, comptes);
    while (cases.length < r.cases) {
      if (!file.length) file = melanger(hasard, comptes);
      const n = file.shift()!;
      if ((pris.get(n) ?? 0) >= (disponibles.get(n) ?? 0)) {
        // Ce compte est épuisé : on prend le premier qui reste.
        const autre = comptes.find((c) => (pris.get(c) ?? 0) < (disponibles.get(c) ?? 0));
        if (autre == null) break;
        cases.push(autre); pris.set(autre, (pris.get(autre) ?? 0) + 1);
        continue;
      }
      cases.push(n); pris.set(n, (pris.get(n) ?? 0) + 1);
    }
    planches.push(melanger(hasard, cases));
  }
  return planches;
}

/** Les arcs qu'on dessine sous le nombre : un par syllabe, comme on les frappe. */
const arcs = (n: number) =>
  `<svg viewBox="0 0 ${n * 22} 14" width="${n * 22 * 0.9}" height="12"><path d="${Array.from({ length: n }, (_, i) => `M${i * 22 + 2} 3 Q${i * 22 + 11} 16 ${i * 22 + 20} 3`).join(" ")}" fill="none" stroke="#1c2233" stroke-width="2"/></svg>`;

export function htmlLotoSyllabes(planches: number[][], mots: MotImage[], images: Images, r: ReglagesLotoSyllabes, titre = "Loto des syllabes"): string {
  const colonnes = 3;
  const lignes = r.cases / 3;
  const regle = `<div class="regle"><b>Loto des syllabes</b>Chaque élève a une planche : dans chaque case, un nombre de syllabes.
    On pioche une image, on scande les syllabes du mot, on les compte — si une case le demande, on y pose l'image. La planche pleine a gagné.
    <span style="color:#687087">— Pour préparer l'apprentissage de la lecture et de l'écriture à l'école maternelle, Éduscol 2020.</span></div>`;
  const pagesPlanches: string[] = [];
  for (let i = 0; i < planches.length; i += 2) {
    const deux = planches.slice(i, i + 2).map((pl, k) =>
      `<div class="ls-planche"><div class="ls-planche-titre">${escapeHtml(titre)} — planche ${i + k + 1}</div>
        <div class="grille" style="grid-template-columns: repeat(${colonnes}, 1fr); grid-auto-rows: ${lignes === 2 ? 48 : 36}mm">
        ${pl.map((n) => `<div class="carte ls-case"><div class="ls-nombre">${n}</div>${arcs(n)}</div>`).join("")}</div></div>`).join("");
    pagesPlanches.push(`<div class="page">${i === 0 ? regle : ""}${deux}</div>`);
  }
  const cartes = mots.map((m) => carte(`${imgPicto(image(m, images), m.mot)}${legende(m.mot, r.legendes)}`));
  const pagesCartes = pagesDeCartes(cartes, { colonnes: 4, lignes: 5 }, `<div class="sous">${escapeHtml(titre)} — les images à piocher (${mots.length})</div>`);
  return feuille(`${pagesPlanches.join("")}${pagesCartes}${attributionPour(mots.map((m) => m.id))}`, "ls");
}

// ── Les dominos des syllabes ──────────────────────────────────────────────
//
// « Domino des syllabes : à partir d'un jeu de domino-images, lier l'image
// d'un mot qui se termine de la même manière à une autre image comprenant la
// même syllabe en attaque (par exemple, micro – crocodile). » (guide 2020)

export interface PieceDomino { gauche: MotImage; droite: MotImage }

/** Des paires (X, Y) où la rime de X est l'attaque de Y, sans réemployer un mot. */
export function pairesQuiSenchainent(mots: MotImage[], hasard: () => number): [MotImage, MotImage][] {
  const simples = melanger(hasard, motsSimples(mots));
  const rimes = new Map(simples.map((m) => [m.mot, rime(m.mot)]));
  const attaques = new Map(simples.map((m) => [m.mot, attaque(m.mot)]));
  const pris = new Set<string>();
  const paires: [MotImage, MotImage][] = [];
  for (const x of simples) {
    if (pris.has(x.mot)) continue;
    const cle = rimes.get(x.mot);
    if (!cle) continue;
    const y = simples.find((m) => m.mot !== x.mot && !pris.has(m.mot) && attaques.get(m.mot) === cle);
    if (!y) continue;
    pris.add(x.mot); pris.add(y.mot);
    paires.push([x, y]);
  }
  return paires;
}

/**
 * Les pièces, en boucle : la droite d'une pièce s'enchaîne avec la gauche de
 * la suivante, et la dernière revient à la première.
 */
export function dominos(paires: [MotImage, MotImage][]): PieceDomino[] {
  const n = paires.length;
  return paires.map((p, i) => ({ gauche: paires[(i - 1 + n) % n][1], droite: p[0] }));
}

export function htmlDominos(pieces: PieceDomino[], images: Images, legendes: boolean, titre = "Dominos des syllabes"): string {
  const regle = `<div class="regle"><b>${escapeHtml(titre)}</b>On pose les dominos bout à bout : l'image de droite se termine par la syllabe
    qui commence l'image de gauche du domino suivant (micro – crocodile). ${pieces.length} pièces, qui se referment en boucle.
    <span style="color:#687087">— Pour préparer l'apprentissage de la lecture et de l'écriture à l'école maternelle, Éduscol 2020.</span></div>`;
  const moitie = (m: MotImage) => `<div class="ls-moitie">${imgPicto(image(m, images), m.mot)}${legende(m.mot, legendes)}</div>`;
  const cellules = pieces.map((p) => `<div class="carte ls-domino">${moitie(p.gauche)}<div class="ls-barre"></div>${moitie(p.droite)}</div>`);
  return feuille(`${pagesDeCartes(cellules, { colonnes: 2, lignes: 5, hauteurMm: 46 }, regle)}${attributionPour(pieces.flatMap((p) => [p.gauche.id, p.droite.id]))}`, "ls");
}

// ── La chasse à l'intrus ──────────────────────────────────────────────────
//
// « Trouver l'intrus : énoncer des mots contenant une même syllabe en
// position initiale ou finale ainsi qu'un intrus (par exemple, bateau,
// banane, tapis, ballon). » (guide 2020)

export type ModeIntrus = "attaque" | "rime";

export interface LigneIntrus { mots: MotImage[]; intrus: MotImage; cle: string }

export function lignesIntrus(mots: MotImage[], mode: ModeIntrus, combien: number, hasard: () => number): LigneIntrus[] {
  const cleDe = mode === "attaque" ? attaque : rime;
  const simples = motsSimples(mots).filter((m) => compterSyllabes(m.mot) >= 1);
  const groupes = new Map<string, MotImage[]>();
  for (const m of simples) {
    const c = cleDe(m.mot);
    if (!c) continue;
    groupes.set(c, [...(groupes.get(c) ?? []), m]);
  }
  const candidats = melanger(hasard, [...groupes.entries()].filter(([, l]) => l.length >= 3));
  const lignes: LigneIntrus[] = [];
  const dejaIntrus = new Set<string>();
  for (const [cle, liste] of candidats) {
    if (lignes.length >= combien) break;
    const trois = melanger(hasard, liste).slice(0, 3);
    const autres = melanger(hasard, simples.filter((m) => cleDe(m.mot) !== cle && !dejaIntrus.has(m.mot)));
    const intrus = autres[0] ?? simples.find((m) => cleDe(m.mot) !== cle);
    if (!intrus) continue;
    dejaIntrus.add(intrus.mot);
    lignes.push({ mots: melanger(hasard, [...trois, intrus]), intrus, cle });
  }
  return lignes;
}

export function htmlIntrus(lignes: LigneIntrus[], images: Images, mode: ModeIntrus, legendes: boolean): string {
  const quoi = mode === "attaque" ? "commencent par la même syllabe" : "finissent par la même syllabe";
  const consigne = `<div class="titre">Chasse à l'intrus</div><div class="regle"><b>Consigne</b>Dans chaque ligne, trois mots ${quoi} ; un seul est différent : entoure l'intrus.
    <span style="color:#687087">— Pour préparer l'apprentissage de la lecture et de l'écriture à l'école maternelle, Éduscol 2020.</span></div>`;
  const cellules = lignes.flatMap((l, i) => l.mots.map((m, k) =>
    carte(`${k === 0 ? `<div class="ls-numero">${i + 1}</div>` : ""}${imgPicto(image(m, images), m.mot)}${legende(m.mot, legendes)}`, "ls-intrus")));
  const corps = pagesDeCartes(cellules, { colonnes: 4, lignes: 5, hauteurMm: 44 }, consigne);
  const reponses = lignes.length
    ? `<div class="page corrige"><div class="titre">Chasse à l'intrus — corrigé</div><ol class="ls-corrige">${lignes.map((l) =>
      `<li><b>${escapeHtml(l.intrus.mot)}</b> — les autres ${quoi} « ${escapeHtml(l.mots.filter((m) => m !== l.intrus).map((m) => m.mot).join(", "))} »</li>`).join("")}</ol></div>`
    : "";
  return feuille(`${corps}${reponses}${attributionPour(lignes.flatMap((l) => l.mots.map((m) => m.id)))}`, "ls");
}

// ── Les paires distinctives : le trésor et le téléphone ───────────────────
//
// Livret « À partir de 5 ans » (2025), séquence 1 : seize cartes-images
// tirées de huit paires de mots qui ne diffèrent que d'une consonne (ch/s,
// ch/j, j/z), et deux jeux : le trésor, le téléphone.

export interface PaireDistinctive { a: string; b: string; sons: string; source: "livret" | "guide" | "classique" }

export const PAIRES_DISTINCTIVES: PaireDistinctive[] = [
  { a: "manche", b: "mange", sons: "ch / j", source: "livret" },
  { a: "chou", b: "joue", sons: "ch / j", source: "livret" },
  { a: "chaud", b: "seau", sons: "ch / s", source: "livret" },
  { a: "caché", b: "cassé", sons: "ch / s", source: "livret" },
  { a: "tache", b: "tasse", sons: "ch / s", source: "livret" },
  { a: "mouche", b: "mousse", sons: "ch / s", source: "livret" },
  { a: "bûche", b: "bus", sons: "ch / s", source: "livret" },
  { a: "bijou", b: "bisou", sons: "j / z", source: "livret" },
  { a: "pain", b: "bain", sons: "p / b", source: "guide" },
  { a: "poule", b: "boule", sons: "p / b", source: "guide" },
  { a: "four", b: "tour", sons: "f / t", source: "guide" },
  { a: "poisson", b: "poison", sons: "s / z", source: "classique" },
  { a: "coussin", b: "cousin", sons: "s / z", source: "classique" },
  { a: "cadeau", b: "gâteau", sons: "k / g", source: "classique" },
  { a: "car", b: "gare", sons: "k / g", source: "classique" },
  { a: "roue", b: "loup", sons: "r / l", source: "classique" },
  { a: "riz", b: "lit", sons: "r / l", source: "classique" },
  { a: "mouton", b: "bouton", sons: "m / b", source: "classique" },
  { a: "pile", b: "bille", sons: "p / b", source: "classique" },
  { a: "pomme", b: "gomme", sons: "p / g", source: "classique" },
  { a: "carte", b: "tarte", sons: "k / t", source: "classique" },
  { a: "moto", b: "photo", sons: "m / f", source: "classique" },
  { a: "vache", b: "bâche", sons: "v / b", source: "classique" },
  { a: "singe", b: "linge", sons: "s / l", source: "classique" },
];

/** Les mots d'un jeu de cartes, dans l'ordre des paires, répétés autant de jeux qu'on veut. */
export function motsDesPaires(paires: PaireDistinctive[], jeux: number): string[] {
  const unJeu = paires.flatMap((p) => [p.a, p.b]);
  return Array.from({ length: Math.max(1, jeux) }, () => unJeu).flat();
}

export function htmlPaires(paires: PaireDistinctive[], jeux: number, images: Record<string, string>, legendes: boolean): string {
  const regles = `<div class="titre">Paires de mots proches : le trésor et le téléphone</div>
    <div class="regle"><b>Le trésor</b>Le professeur montre et nomme quatre à huit cartes, les fait répéter, les cache dans le coffre et le ferme.
      De mémoire, les élèves citent tout ce qu'il y a dans le trésor ; chaque mot juste fait sortir sa carte.</div>
    <div class="regle"><b>Le téléphone</b>Les seize images sont affichées ; un second jeu est dans un sac. Le premier élève tire une carte sans la montrer
      et souffle le mot à l'oreille de son voisin, qui le passe au suivant… Le dernier désigne l'image entendue ; le premier montre la carte tirée.
      Si les deux diffèrent (mouche / mousse), on redit les deux mots en faisant entendre la consonne qui change.
      <span style="color:#687087">— Livret d'accompagnement « À partir de 5 ans », Éduscol 2025.</span></div>
    <div class="sous">Sons travaillés : ${escapeHtml([...new Set(paires.map((p) => p.sons))].join(" · "))} — ${jeux} jeu${jeux > 1 ? "x" : ""} de ${paires.length * 2} cartes.</div>`;
  const cellules = motsDesPaires(paires, jeux).map((mot) => carte(`${imgPicto(images[mot.toLowerCase()], mot)}${legende(mot, legendes)}`));
  return feuille(`${pagesDeCartes(cellules, { colonnes: 4, lignes: 4 }, regles)}${ATTRIBUTION_ARASAAC}`, "ls");
}

// ── Les lettres : mémory, mistigri, loto, ophtalmologue ───────────────────
//
// Livret Français CP (2025) : « memory des lettres, mistigri des lettres,
// jeu de l'oie, jeu d'association des lettres dans les trois graphies ;
// loto des lettres ; jeu de l'ophtalmologue : l'ophtalmologue pointe les
// lettres une à une, le patient nomme les lettres. »

export type JeuLettres = "memory" | "mistigri" | "loto" | "ophtalmologue";

export interface ReglagesLettres {
  lettres: string;
  jeu: JeuLettres;
  planches: number;
}

export const REGLAGES_LETTRES: ReglagesLettres = { lettres: "abcdefghijklm", jeu: "memory", planches: 4 };

export const lettresChoisies = (saisie: string) =>
  [...new Set(saisie.toLowerCase().replace(/[^a-zàâäéèêëîïôöùûüœç]/g, "").split(""))];

const lettreCarte = (l: string, graphie: "maj" | "min") =>
  carte(`<div class="ls-lettre ${graphie}">${graphie === "maj" ? l.toUpperCase() : l}</div>`);

/** Des planches de loto : les majuscules sur les planches, les minuscules à piocher. */
export function planchesLettres(lettres: string[], planches: number, hasard: () => number): string[][] {
  const taille = Math.min(9, lettres.length);
  return Array.from({ length: planches }, () => melanger(hasard, lettres).slice(0, taille));
}

export function htmlLettres(r: ReglagesLettres, hasard: () => number): string {
  const lettres = lettresChoisies(r.lettres);
  if (r.jeu === "ophtalmologue") {
    const lignes = [1, 2, 3, 4, 5, 6, 7].map((n) => melanger(hasard, lettres).slice(0, Math.min(lettres.length, n + 1)));
    const tailles = [64, 52, 42, 34, 28, 22, 18];
    return feuille(`<div class="page"><div class="titre">Jeu de l'ophtalmologue</div>
      <div class="regle">L'« ophtalmologue » pointe les lettres une à une ; le « patient » nomme les lettres. On peut lire de haut en bas, puis les yeux à demi fermés.
      <span style="color:#687087">— Livret Français CP, Éduscol 2025.</span></div>
      <div class="ls-oeil">${lignes.map((l, i) => `<div style="font-size:${tailles[i]}px">${l.map((x) => (i % 2 ? x : x.toUpperCase())).join("&nbsp;&nbsp;")}</div>`).join("")}</div></div>`, "ls");
  }
  if (r.jeu === "loto") {
    const planches = planchesLettres(lettres, r.planches, hasard);
    const pages = planches.map((pl, i) => `<div class="ls-planche"><div class="ls-planche-titre">Loto des lettres — planche ${i + 1}</div>
      <div class="grille" style="grid-template-columns: repeat(3, 1fr); grid-auto-rows: 34mm">${pl.map((l) => `<div class="carte"><div class="ls-lettre maj">${l.toUpperCase()}</div></div>`).join("")}</div></div>`);
    const regle = `<div class="regle"><b>Loto des lettres</b>Les majuscules sur les planches, les minuscules à piocher : on nomme la lettre tirée, celui qui l'a la couvre.
      <span style="color:#687087">— Livret Français CP, Éduscol 2025.</span></div>`;
    const pagesPlanches: string[] = [];
    for (let i = 0; i < pages.length; i += 2) pagesPlanches.push(`<div class="page">${i === 0 ? regle : ""}${pages.slice(i, i + 2).join("")}</div>`);
    const cartes = lettres.map((l) => lettreCarte(l, "min"));
    return feuille(`${pagesPlanches.join("")}${pagesDeCartes(cartes, { colonnes: 5, lignes: 6 }, `<div class="sous">Les lettres à piocher</div>`)}`, "ls");
  }
  const regle = r.jeu === "memory"
    ? `<div class="regle"><b>Mémory des lettres</b>Cartes face cachée ; on en retourne deux : la majuscule et sa minuscule font une paire.
        <span style="color:#687087">— Livret Français CP, Éduscol 2025.</span></div>`
    : `<div class="regle"><b>Mistigri des lettres</b>On distribue tout ; on pose ses paires (majuscule et minuscule), puis chacun tire une carte chez son voisin.
        Qui garde le Mistigri à la fin a perdu.
        <span style="color:#687087">— Livret Français CP, Éduscol 2025.</span></div>`;
  const cartes = melanger(hasard, [...lettres.map((l) => lettreCarte(l, "maj")), ...lettres.map((l) => lettreCarte(l, "min"))]);
  if (r.jeu === "mistigri") cartes.push(carte(`<div class="ls-lettre" style="font-size:22px">🐈‍⬛<br>Mistigri</div>`));
  return feuille(pagesDeCartes(cartes, { colonnes: 5, lignes: 6 }, regle), "ls");
}

export const STYLE_JEUX_SONS = `
  .feuille.ls .ls-planche { border: 2px solid #1c2233; border-radius: 4mm; padding: 3mm; margin-bottom: 6mm; page-break-inside: avoid; }
  .feuille.ls .ls-planche-titre { font-size: 12px; font-weight: 700; color: #687087; margin-bottom: 2mm; }
  .feuille.ls .ls-case { gap: 2mm; }
  .feuille.ls .ls-nombre { font-size: 40px; font-weight: 800; line-height: 1; }
  .feuille.ls .ls-domino { flex-direction: row; gap: 0; padding: 0; }
  .feuille.ls .ls-moitie { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2mm; padding: 3mm; min-width: 0; }
  .feuille.ls .ls-moitie img { max-width: 26mm; }
  .feuille.ls .ls-barre { width: 0; align-self: stretch; border-left: 2px solid #1c2233; }
  .feuille.ls .ls-intrus { position: relative; }
  .feuille.ls .ls-numero { position: absolute; top: 2mm; left: 2mm; font-size: 11px; font-weight: 700; color: #687087; }
  .feuille.ls .ls-corrige { font-size: 13px; line-height: 1.7; }
  .feuille.ls .ls-lettre { font-size: 44px; font-weight: 700; line-height: 1; }
  .feuille.ls .ls-lettre.min { font-weight: 500; }
  .feuille.ls .ls-oeil { text-align: center; margin-top: 10mm; line-height: 1.9; font-weight: 700; letter-spacing: 2px; }
`;
