// Organiser et lire des données : relevés, tableaux, diagrammes en barres.
//
// Programme de mathématiques du cycle 2 (2024) : au CP, une enquête sur un
// caractère qualitatif — « Parmi ces quatre fruits, quel est ton fruit
// préféré : orange, fraise, banane ou kiwi ? » —, un relevé par bâtons, un
// tableau, un diagramme en barres, d'abord fait de cubes, « à raison d'un
// cube par individu » ; les mots le plus, le moins, autant que, plus que,
// moins que ; un tableau à double entrée, la forme et la couleur. Au CE1, des
// populations de moins de cent individus, un axe gradué de un en un ; lire
// un diagramme ou un tableau qu'on n'a pas construit : « Combien de garçons
// viennent à l'école en vélo ? ». Au CE2, des caractères quantitatifs — le
// nombre de frères et sœurs, l'âge —, une échelle adaptée, compléter un
// tableau, des problèmes : « Les 175 élèves de l'école Poséidon habitent
// dans quatre villes différentes… »

import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";

export type Classe = "CP" | "CE1" | "CE2";
export type ExerciceDonnees = "releve" | "lireDiagramme" | "construireDiagramme" | "doubleEntree" | "lireTableau" | "completerTableau" | "problemes";

export const EXERCICES_DONNEES: { id: ExerciceDonnees; libelle: string }[] = [
  { id: "releve", libelle: "Du relevé au tableau et au diagramme" },
  { id: "lireDiagramme", libelle: "Lire un diagramme en barres" },
  { id: "construireDiagramme", libelle: "Construire un diagramme en barres (CE1, CE2)" },
  { id: "doubleEntree", libelle: "Le tableau à double entrée : formes et couleurs (CP)" },
  { id: "lireTableau", libelle: "Lire un tableau à double entrée (CE1, CE2)" },
  { id: "completerTableau", libelle: "Compléter un tableau et ses totaux (CE2)" },
  { id: "problemes", libelle: "Des problèmes avec un tableau ou un diagramme (CE2)" },
];

export interface ReglagesDonnees { exercice: ExerciceDonnees; classe: Classe; combien: number }
export const REGLAGES_DONNEES: ReglagesDonnees = { exercice: "lireDiagramme", classe: "CE1", combien: 6 };

const NOIR = "#1c2233", GRIS = "#c4c9d6", BLEU = "#6fa8dc";
const f2 = (x: number) => x.toFixed(2);
const entre = (alea: () => number, a: number, b: number) => a + Math.floor(alea() * (b - a + 1));

const SOURCE = `<span class="reference">Programme de mathématiques du cycle 2, 2024.</span>`;
const entete = (titre: string, consigne: string) => `<div class="titre">${titre}</div>
  <div class="sous">Prénom : ........................................ Date : ........................</div>
  <div class="regle">${consigne} ${SOURCE}</div>`;

/** Une enquête : sa question, ce que compte chaque réponse, et ses valeurs. */
export interface Enquete { question: string; qui: string; valeurs: string[]; effectifs: number[] }

const THEMES: { question: string; valeurs: string[]; quantitatif?: boolean }[] = [
  { question: "Parmi ces fruits, quel est ton fruit préféré ?", valeurs: ["orange", "fraise", "banane", "kiwi", "pomme"] },
  { question: "Quel est ton animal préféré ?", valeurs: ["chat", "chien", "lapin", "poisson", "cheval"] },
  { question: "Comment viens-tu à l'école ?", valeurs: ["à pied", "en vélo", "en voiture", "en bus"] },
  { question: "Quelle est ta couleur préférée ?", valeurs: ["rouge", "bleu", "vert", "jaune", "violet"] },
  { question: "Quel est ton sport préféré ?", valeurs: ["football", "natation", "danse", "judo", "basket"] },
  { question: "Combien as-tu de frères et sœurs ?", valeurs: ["0", "1", "2", "3", "4"], quantitatif: true },
  { question: "Quel âge ont les élèves de l'école ?", valeurs: ["6 ans", "7 ans", "8 ans", "9 ans", "10 ans"], quantitatif: true },
];

/**
 * Une enquête à la mesure de la classe : au CP, moins de quarante réponses,
 * de deux à cinq valeurs ; au CE1, moins de cent, un axe gradué de un en un ;
 * au CE2, des caractères quantitatifs aussi, et de plus grands effectifs.
 */
export function enqueteAuHasard(alea: () => number, classe: Classe): Enquete {
  const themes = THEMES.filter((t) => classe === "CE2" || !t.quantitatif);
  const t = themes[Math.floor(alea() * themes.length)];
  const n = Math.min(t.valeurs.length, entre(alea, classe === "CP" ? 3 : 4, classe === "CP" ? 4 : 5));
  const valeurs = t.quantitatif ? t.valeurs.slice(0, n) : melanger(alea, t.valeurs).slice(0, n);
  const max = classe === "CP" ? 12 : classe === "CE1" ? 18 : 90;
  for (let garde = 0; garde < 200; garde++) {
    // Au CE2, des multiples de cinq : ils se lisent sur l'axe gradué de dix en dix, à la ligne ou à mi-chemin.
    const effectifs = valeurs.map(() => (classe === "CE2" ? 5 * entre(alea, 2, 18) : entre(alea, 1, max)));
    const total = effectifs.reduce((s, x) => s + x, 0);
    // Un seul « plus » et un seul « moins » : les questions ont une réponse.
    const trie = [...effectifs].sort((a, b) => b - a);
    if (trie[0] === trie[1] || trie[trie.length - 1] === trie[trie.length - 2]) continue;
    if (classe === "CP" && total >= 40) continue;
    if (classe === "CE1" && total >= 100) continue;
    return { question: t.question, qui: t.question.startsWith("Quel âge") ? "élèves" : "élèves", valeurs, effectifs };
  }
  return { question: t.question, qui: "élèves", valeurs, effectifs: valeurs.map((_, i) => i + 2) };
}

/** Le pas de l'axe : de un en un jusqu'à vingt ; puis cinq, dix, vingt. */
export const pasDeLAxe = (max: number) => (max <= 20 ? 1 : max <= 50 ? 5 : max <= 100 ? 10 : 20);

/**
 * Un diagramme en barres, en millimètres : l'axe vertical gradué, une barre
 * par valeur — faite de cubes au CP —, son nom dessous. `cachees` : les
 * barres à tracer par l'élève.
 */
export function diagrammeSvg(e: Pick<Enquete, "valeurs" | "effectifs">, o: { cubes?: boolean; cachees?: number[]; hautMax?: number; cases?: boolean } = {}): string {
  const max = Math.max(o.hautMax ?? 0, ...e.effectifs);
  const pas = pasDeLAxe(max);
  const haut = Math.ceil((max + (pas === 1 ? 1 : 0)) / pas) * pas;
  const H = 90, unite = H / haut, L = Math.min(26, 150 / e.valeurs.length), x0 = 14;
  let corps = "";
  // De dix en dix, des lignes plus claires à chaque cinq.
  if (pas === 10) for (let v = 5; v < haut; v += 10) corps += `<line x1="${x0}" y1="${f2(8 + H - v * unite)}" x2="${f2(x0 + L * e.valeurs.length + 4)}" y2="${f2(8 + H - v * unite)}" stroke="${GRIS}" stroke-width="0.12" stroke-dasharray="1 1"/>`;
  for (let v = 0; v <= haut; v += pas) {
    const y = 8 + H - v * unite;
    corps += `<line x1="${x0}" y1="${f2(y)}" x2="${f2(x0 + L * e.valeurs.length + 4)}" y2="${f2(y)}" stroke="${GRIS}" stroke-width="0.2"/>`;
    if (pas > 1 || v % (haut > 12 ? 2 : 1) === 0) corps += `<text x="${x0 - 2}" y="${f2(y + 1.2)}" text-anchor="end" font-size="3.4" font-family="Helvetica, Arial, sans-serif" fill="${NOIR}">${v}</text>`;
  }
  e.valeurs.forEach((nom, i) => {
    const x = x0 + 3 + i * L, v = e.effectifs[i], l = L * 0.6;
    // Des cases vides à colorier, une par élève, quand on construit le diagramme de cubes.
    if (o.cases && pas === 1) for (let k = 0; k < haut; k++) corps += `<rect x="${f2(x)}" y="${f2(8 + H - (k + 1) * unite)}" width="${f2(l)}" height="${f2(unite)}" fill="none" stroke="#9aa0b4" stroke-width="0.25" stroke-dasharray="1 0.8"/>`;
    if (!o.cachees?.includes(i)) {
      if (o.cubes) for (let k = 0; k < v; k++) corps += `<rect x="${f2(x)}" y="${f2(8 + H - (k + 1) * unite)}" width="${f2(l)}" height="${f2(unite)}" fill="${BLEU}" stroke="${NOIR}" stroke-width="0.25"/>`;
      else corps += `<rect x="${f2(x)}" y="${f2(8 + H - v * unite)}" width="${f2(l)}" height="${f2(v * unite)}" fill="${BLEU}" stroke="${NOIR}" stroke-width="0.35"/>`;
    }
    corps += `<text x="${f2(x + l / 2)}" y="${f2(8 + H + 5)}" text-anchor="middle" font-size="3.4" font-family="Helvetica, Arial, sans-serif" fill="${NOIR}">${nom}</text>`;
  });
  corps += `<line x1="${x0}" y1="8" x2="${x0}" y2="${8 + H}" stroke="${NOIR}" stroke-width="0.5"/><line x1="${x0}" y1="${8 + H}" x2="${f2(x0 + L * e.valeurs.length + 4)}" y2="${8 + H}" stroke="${NOIR}" stroke-width="0.5"/>`;
  const w = x0 + L * e.valeurs.length + 6;
  return `<svg class="do-diagramme" viewBox="0 0 ${f2(w)} ${8 + H + 9}" width="${f2(w)}mm" height="${8 + H + 9}mm">${corps}</svg>`;
}

/** Des bâtons, groupés par cinq : « ||||| ||| ». */
const batons = (n: number) => `<span class="do-batons">${Array.from({ length: Math.ceil(n / 5) }, (_, k) => "|".repeat(Math.min(5, n - 5 * k))).join(" ")}</span>`;

const tableauSimple = (e: Enquete, titre: string, remplir: boolean, avecBatons = false) => `<table class="do-tableau"><tr><th>${titre}</th>${avecBatons ? "<th>Les bâtons</th>" : ""}<th>Nombre d'élèves</th></tr>
  ${e.valeurs.map((v, i) => `<tr><td>${v}</td>${avecBatons ? `<td>${remplir ? batons(e.effectifs[i]) : ""}</td>` : ""}<td>${remplir ? `<b>${e.effectifs[i]}</b>` : ""}</td></tr>`).join("")}</table>`;

/** Les questions qu'on pose sur une enquête, selon la classe. */
export function questionsSur(e: Enquete, classe: Classe, alea: () => number): { question: string; reponse: string }[] {
  const i = Math.floor(alea() * e.valeurs.length);
  const plus = e.effectifs.indexOf(Math.max(...e.effectifs)), moins = e.effectifs.indexOf(Math.min(...e.effectifs));
  const [a, b] = [plus, moins === plus ? (plus + 1) % e.valeurs.length : moins];
  const total = e.effectifs.reduce((s, x) => s + x, 0);
  const sortie = [
    { question: `Combien d'élèves ont répondu « ${e.valeurs[i]} » ?`, reponse: `${e.effectifs[i]}` },
    { question: "Quelle est la réponse la plus choisie ?", reponse: e.valeurs[plus] },
    { question: "Quelle est la réponse la moins choisie ?", reponse: e.valeurs[moins] },
  ];
  if (classe === "CP") sortie.push({ question: `Y a-t-il plus d'élèves pour « ${e.valeurs[a]} » que pour « ${e.valeurs[b]} » ?`, reponse: "oui" });
  else sortie.push(
    { question: `Combien d'élèves de plus ont répondu « ${e.valeurs[a]} » que « ${e.valeurs[b]} » ?`, reponse: `${e.effectifs[a] - e.effectifs[b]}` },
    { question: "Combien d'élèves ont répondu en tout ?", reponse: `${total}` },
  );
  return sortie;
}

const lignesQuestions = (qs: { question: string }[]) => qs.map((q, k) => `<div class="do-question"><b>${k + 1}.</b> ${q.question} <span class="do-blanc"></span></div>`).join("");
const corrigeQuestions = (qs: { question: string; reponse: string }[]) => qs.map((q, k) => `<div>${k + 1}. ${q.question} <b>${q.reponse}</b></div>`).join("");

/** Le relevé brut des réponses, mélangées : on les compte avec des bâtons, puis on remplit le tableau et le diagramme. */
function feuilleReleve(r: ReglagesDonnees, graine: number): string {
  const alea = hasard(graine);
  const e = enqueteAuHasard(alea, r.classe === "CE2" ? "CE1" : r.classe);
  const reponses = melanger(alea, e.valeurs.flatMap((v, i) => Array.from({ length: e.effectifs[i] }, () => v)));
  const vide = { ...e, effectifs: e.effectifs.map(() => 0) };
  const releve = `<div class="do-releve">${reponses.map((x) => `<span>${x}</span>`).join("")}</div>`;
  const diagrammeVide = diagrammeSvg(vide, { hautMax: Math.max(...e.effectifs), cases: true });
  return `<div class="page">${entete("Une enquête dans la classe", `On a demandé à chaque élève : « ${e.question} » Voici leurs réponses. Fais un bâton pour chaque réponse, puis écris combien il y en a. Colorie ensuite les barres du diagramme : une case par élève.`)}
    ${releve}${tableauSimple(e, "Réponse", false, true)}<div class="do-centre">${diagrammeVide}</div></div>
    <div class="page corrige"><div class="titre">Une enquête — corrigé</div>${tableauSimple(e, "Réponse", true, true)}<div class="do-centre">${diagrammeSvg(e, { cubes: r.classe === "CP" })}</div></div>`;
}

function feuilleLireDiagramme(r: ReglagesDonnees, graine: number): string {
  const alea = hasard(graine);
  const e = enqueteAuHasard(alea, r.classe);
  const qs = questionsSur(e, r.classe, alea);
  return `<div class="page">${entete("Lire un diagramme en barres", `On a demandé aux élèves : « ${e.question} » Le diagramme montre leurs réponses${r.classe === "CP" ? " : un cube pour chaque élève" : ""}. Lis-le pour répondre.`)}
    <div class="do-centre">${diagrammeSvg(e, { cubes: r.classe === "CP" })}</div>${lignesQuestions(qs)}</div>
    <div class="page corrige"><div class="titre">Lire un diagramme — corrigé</div><div class="do-corrige">${corrigeQuestions(qs)}</div></div>`;
}

/** Construire le diagramme d'après un tableau (CE1) ou d'après un texte (CE2) ; au CE2, l'axe est à graduer. */
function feuilleConstruireDiagramme(r: ReglagesDonnees, graine: number): string {
  const alea = hasard(graine);
  const e = enqueteAuHasard(alea, r.classe === "CP" ? "CE1" : r.classe);
  const texte = r.classe === "CE2"
    ? `<div class="do-texte">À la question « ${e.question} », ${e.valeurs.map((v, i) => `${e.effectifs[i]} élèves ont répondu « ${v} »`).join(", ")}.</div>`
    : tableauSimple(e, "Réponse", true);
  const vide = diagrammeSvg(e, { cachees: e.valeurs.map((_, i) => i) });
  return `<div class="page">${entete("Construire un diagramme en barres", `Trace, à la règle, la barre de chaque réponse : sa hauteur dit le nombre d'élèves.${r.classe === "CE2" ? " Lis bien l'échelle de l'axe." : ""}`)}${texte}<div class="do-centre">${vide}</div></div>
    <div class="page corrige"><div class="titre">Construire un diagramme — corrigé</div><div class="do-centre">${diagrammeSvg(e)}</div></div>`;
}

// ── Les tableaux à double entrée ──────────────────────────────────────────

export const COULEURS_TABLEAU: { nom: string; hex: string }[] = [
  { nom: "bleu", hex: "#4a86e8" }, { nom: "vert", hex: "#38a169" }, { nom: "jaune", hex: "#f2c94c" }, { nom: "violet", hex: "#8e44ad" }, { nom: "rouge", hex: "#e05252" },
];
const FORMES_TABLEAU = ["cercle", "carré", "triangle"] as const;

const formeEnCouleur = (f: (typeof FORMES_TABLEAU)[number], hex: string) => {
  const corps = f === "cercle" ? `<circle cx="10" cy="10" r="7" fill="${hex}" stroke="${NOIR}" stroke-width="0.5"/>`
    : f === "carré" ? `<rect x="3.5" y="3.5" width="13" height="13" fill="${hex}" stroke="${NOIR}" stroke-width="0.5"/>`
      : `<path d="M10 3 L17 16.5 L3 16.5 Z" fill="${hex}" stroke="${NOIR}" stroke-width="0.5"/>`;
  return `<svg viewBox="0 0 20 20" width="14mm" height="14mm">${corps}</svg>`;
};

/**
 * Le tableau des formes et des couleurs : « une ligne et une colonne d'un
 * tableau à double entrée permettent d'identifier le contenu de la case
 * située à leur intersection ». Quelques cases sont déjà remplies.
 */
function feuilleDoubleEntree(_r: ReglagesDonnees, graine: number): string {
  const alea = hasard(graine);
  const couleurs = COULEURS_TABLEAU.slice(0, 4);
  const remplies = new Set(melanger(alea, FORMES_TABLEAU.flatMap((_, l) => couleurs.map((__, c) => `${l},${c}`))).slice(0, 3));
  const tableau = (tout: boolean) => `<table class="do-double"><tr><th></th>${couleurs.map((c) => `<th><span class="do-pastille" style="background:${c.hex}"></span>${c.nom}</th>`).join("")}</tr>
    ${FORMES_TABLEAU.map((f, l) => `<tr><th>${formeEnCouleur(f, "#ffffff")}<div>${f}</div></th>${couleurs.map((c, k) => `<td>${tout || remplies.has(`${l},${k}`) ? formeEnCouleur(f, c.hex) : ""}</td>`).join("")}</tr>`).join("")}</table>`;
  return `<div class="page">${entete("Le tableau des formes et des couleurs", "Dans chaque case, dessine la forme de sa ligne, coloriée de la couleur de sa colonne. Trois cases sont déjà faites.")}${tableau(false)}</div>
    <div class="page corrige"><div class="titre">Le tableau des formes et des couleurs — corrigé</div>${tableau(true)}</div>`;
}

/** Un tableau à double entrée avec ses totaux : les élèves de l'école, filles et garçons, et leur moyen de transport. */
export function tableauTransports(alea: () => number): { lignes: string[]; colonnes: string[]; cases: number[][] } {
  const lignes = ["À pied", "En vélo", "En voiture", "En bus"], colonnes = ["Filles", "Garçons"];
  const cases = lignes.map(() => colonnes.map(() => entre(alea, 12, 80)));
  return { lignes, colonnes, cases };
}

const sommeLigne = (t: { cases: number[][] }, l: number) => t.cases[l].reduce((s, x) => s + x, 0);
const sommeColonne = (t: { cases: number[][] }, c: number) => t.cases.reduce((s, ligne) => s + ligne[c], 0);

/** Le tableau, ses totaux, et les cases qu'on cache. */
function tableauHtml(t: ReturnType<typeof tableauTransports>, caches: Set<string>, montrer: boolean) {
  const total = t.cases.flat().reduce((s, x) => s + x, 0);
  const cellule = (cle: string, v: number) => `<td>${caches.has(cle) && !montrer ? "<span class=\"do-blanc do-blanc-case\"></span>" : caches.has(cle) ? `<b>${v}</b>` : v}</td>`;
  return `<table class="do-tableau do-transports"><tr><th></th>${t.colonnes.map((c) => `<th>${c}</th>`).join("")}<th>Total</th></tr>
    ${t.lignes.map((l, i) => `<tr><th>${l}</th>${t.cases[i].map((v, j) => cellule(`${i},${j}`, v)).join("")}${cellule(`${i},t`, sommeLigne(t, i))}</tr>`).join("")}
    <tr><th>Total</th>${t.colonnes.map((_, j) => cellule(`t,${j}`, sommeColonne(t, j))).join("")}${cellule("t,t", total)}</tr></table>`;
}

function feuilleLireTableau(r: ReglagesDonnees, graine: number): string {
  const alea = hasard(graine);
  const t = tableauTransports(alea);
  const total = t.cases.flat().reduce((s, x) => s + x, 0);
  const [l1, l2] = melanger(alea, [0, 1, 2, 3]);
  const qs = [
    { question: `Combien de garçons viennent à l'école ${t.lignes[l1].toLowerCase()} ?`, reponse: `${t.cases[l1][1]}` },
    { question: `Combien de filles viennent à l'école ${t.lignes[l2].toLowerCase()} ?`, reponse: `${t.cases[l2][0]}` },
    { question: `Combien d'élèves viennent ${t.lignes[l1].toLowerCase()} ?`, reponse: `${sommeLigne(t, l1)}` },
    { question: "Combien y a-t-il de filles à l'école ?", reponse: `${sommeColonne(t, 0)}` },
    { question: "Quel est le moyen de transport le plus utilisé ?", reponse: t.lignes[t.lignes.map((_, i) => sommeLigne(t, i)).indexOf(Math.max(...t.lignes.map((_, i) => sommeLigne(t, i))))] },
  ];
  if (r.classe === "CE2") qs.push({ question: "Combien d'élèves y a-t-il à l'école ?", reponse: `${total}` });
  return `<div class="page">${entete("Lire un tableau à double entrée", "Les élèves de l'école ont dit comment ils viennent à l'école. Pour trouver un nombre, suis la ligne et la colonne : il est dans la case où elles se croisent.")}
    ${tableauHtml(t, new Set(), true)}${lignesQuestions(qs)}</div>
    <div class="page corrige"><div class="titre">Lire un tableau — corrigé</div><div class="do-corrige">${corrigeQuestions(qs)}</div></div>`;
}

/** Compléter un tableau : des cases cachées, qu'on retrouve par les totaux — une seule inconnue par ligne ou par colonne, chaque fois. */
export function casesACacher(alea: () => number): Set<string> {
  // Le modèle du programme : une case de chaque ligne, et des totaux, de sorte que tout se retrouve.
  const modeles = [
    ["0,1", "1,0", "2,t", "3,0", "3,1", "t,1", "t,t"],
    ["0,0", "1,1", "2,t", "3,1", "t,0", "t,t"],
    ["0,1", "1,t", "2,0", "3,0", "t,1", "t,t"],
  ];
  return new Set(modeles[Math.floor(alea() * modeles.length)]);
}

function feuilleCompleterTableau(_r: ReglagesDonnees, graine: number): string {
  const alea = hasard(graine);
  const t = tableauTransports(alea);
  const caches = casesACacher(alea);
  return `<div class="page">${entete("Compléter un tableau", "Complète le tableau. Dans chaque ligne, les filles et les garçons font le total de la ligne ; dans chaque colonne, les quatre nombres font le total de la colonne.")}${tableauHtml(t, caches, false)}</div>
    <div class="page corrige"><div class="titre">Compléter un tableau — corrigé</div>${tableauHtml(t, caches, true)}</div>`;
}

/** Des problèmes : une barre à tracer d'après le total — l'école Poséidon —, et des écarts à calculer. */
function feuilleProblemes(_r: ReglagesDonnees, graine: number): string {
  const alea = hasard(graine);
  const villes = ["Alphaville", "Bêtaville", "Gammaville", "Deltaville"];
  const effectifs = villes.map(() => 5 * entre(alea, 2, 18));
  const total = effectifs.reduce((s, x) => s + x, 0);
  const e = { valeurs: villes, effectifs };
  const qs = [
    { question: `Les ${total} élèves de l'école Poséidon habitent dans ces quatre villes. Combien habitent à Deltaville ? Trace sa barre.`, reponse: `${total} − ${effectifs.slice(0, 3).join(" − ")} = ${effectifs[3]}` },
    { question: "Combien d'élèves de plus habitent à Alphaville qu'à Bêtaville ?", reponse: `${effectifs[0]} − ${effectifs[1]} = ${effectifs[0] - effectifs[1]}${effectifs[0] < effectifs[1] ? " : c'est Bêtaville qui en a plus" : ""}` },
    { question: "Combien d'élèves habitent à Gammaville ou à Deltaville ?", reponse: `${effectifs[2]} + ${effectifs[3]} = ${effectifs[2] + effectifs[3]}` },
  ];
  return `<div class="page">${entete("Des problèmes avec un diagramme", "Lis le diagramme : chaque barre dit combien d'élèves habitent dans chaque ville. Une barre manque !")}
    <div class="do-centre">${diagrammeSvg(e, { cachees: [3] })}</div>${qs.map((q, k) => `<div class="do-probleme"><b>${k + 1}.</b> ${q.question}<div class="do-calculs">Mes calculs</div></div>`).join("")}</div>
    <div class="page corrige"><div class="titre">Des problèmes — corrigé</div><div class="do-centre">${diagrammeSvg(e)}</div><div class="do-corrige">${qs.map((q, k) => `<div>${k + 1}. <b>${q.reponse}</b></div>`).join("")}</div></div>`;
}

export function htmlDonnees(r: ReglagesDonnees, graine: number): string {
  const f: Record<ExerciceDonnees, (r: ReglagesDonnees, g: number) => string> = {
    releve: feuilleReleve, lireDiagramme: feuilleLireDiagramme, construireDiagramme: feuilleConstruireDiagramme, doubleEntree: feuilleDoubleEntree,
    lireTableau: feuilleLireTableau, completerTableau: feuilleCompleterTableau, problemes: feuilleProblemes,
  };
  return feuille((f[r.exercice] ?? feuilleLireDiagramme)(r, graine), "do");
}

export const STYLE_DONNEES = `
  .feuille.do svg { display: block; }
  .feuille.do .do-centre { display: flex; justify-content: center; margin: 4mm 0; }
  .feuille.do .do-releve { display: block; line-height: 2; border: 1px dashed #c4c9d6; border-radius: 3mm; padding: 2mm 3mm; margin: 0 0 4mm; font-size: 13px; }
  .feuille.do .do-releve span { display: inline-block; margin: 0 2.5mm 0 0; padding: 0 1.5mm; border: 1px solid #c4c9d6; border-radius: 1.5mm; line-height: 1.6; }
  .feuille.do .do-tableau { border-collapse: collapse; margin: 0 auto 4mm; font-size: 14px; }
  .feuille.do .do-tableau th, .feuille.do .do-tableau td { border: 1px solid #1c2233; padding: 2mm 4mm; text-align: center; min-width: 22mm; height: 9mm; }
  .feuille.do .do-tableau th { background: #f0f2f8; }
  .feuille.do .do-batons { font-size: 17px; letter-spacing: 1px; font-weight: 700; }
  .feuille.do .do-question { font-size: 14px; line-height: 2.2; }
  .feuille.do .do-blanc { display: inline-block; width: 28mm; height: 6mm; border-bottom: 2px dotted #1c2233; }
  .feuille.do .do-blanc-case { width: 14mm; }
  .feuille.do .do-corrige { font-size: 13px; line-height: 1.8; }
  .feuille.do .do-texte { font-size: 14px; line-height: 1.6; margin: 0 0 3mm; }
  .feuille.do .do-double { border-collapse: collapse; margin: 6mm auto; }
  .feuille.do .do-double th, .feuille.do .do-double td { border: 1.2px solid #1c2233; width: 30mm; height: 28mm; text-align: center; vertical-align: middle; font-size: 13px; }
  .feuille.do .do-double th svg, .feuille.do .do-double td svg { margin: 0 auto; }
  .feuille.do .do-pastille { display: block; width: 12mm; height: 6mm; margin: 0 auto 1mm; border: 1px solid #1c2233; border-radius: 1mm; }
  .feuille.do .do-probleme { font-size: 14px; line-height: 1.6; margin-bottom: 3mm; page-break-inside: avoid; break-inside: avoid; }
  .feuille.do .do-calculs { border: 1.5px dashed #c4c9d6; border-radius: 3mm; min-height: 20mm; font-size: 10.5px; color: #9aa0b4; padding: 1.5mm 2mm; margin-top: 2mm; }
`;
