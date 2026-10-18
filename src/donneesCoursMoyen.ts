// L'organisation et la gestion de données, et les probabilités, au cours
// moyen, d'après le programme de mathématiques du cycle 3 (2025), ses
// exemples de réussite (Éduscol, 2025) et la séquence n° 3 des livrets
// d'accompagnement du CM1 et du CM2 (2026).
//
// Les données : un tableau à double entrée — les moyens de transport des
// filles et des garçons, « plus de la moitié viennent-ils à pied ou à
// vélo ? » —, des diagrammes en barres à lire et à construire, deux courbes
// dans un même repère avec leur légende, et au CM2 le diagramme circulaire.
// Les probabilités : les bouteilles de billes du livret, les mots
// « impossible », « peu probable », « une chance sur deux », « probable »,
// « certain » et leur échelle ; au CM2, « a chances sur b », l'arbre des
// possibles d'une expérience en deux étapes, et l'indépendance : la pièce
// « ne se souvient pas » des lancers précédents.

import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";
import { choisir, entier, fr } from "./nombres";
import { escapeHtml } from "./print";

export type ExerciceDonneesCM =
  | "tableau" | "barres-lire" | "barres-construire" | "courbes" | "circulaire" | "probleme"
  | "qualifier" | "echelle" | "colorier" | "issues" | "chances" | "comparer" | "arbre" | "independance";

export const EXERCICES_DONNEES_CM: { id: ExerciceDonneesCM; libelle: string }[] = [
  { id: "tableau", libelle: "Un tableau à double entrée" },
  { id: "barres-lire", libelle: "Lire un diagramme en barres" },
  { id: "barres-construire", libelle: "Construire un diagramme en barres" },
  { id: "courbes", libelle: "Deux courbes dans un même repère" },
  { id: "circulaire", libelle: "Le diagramme circulaire (CM2)" },
  { id: "probleme", libelle: "Un problème : l'énoncé et le graphique" },
  { id: "qualifier", libelle: "Impossible, peu probable, une chance sur deux, probable, certain" },
  { id: "echelle", libelle: "L'échelle des probabilités" },
  { id: "colorier", libelle: "Colorier les billes du sac" },
  { id: "issues", libelle: "Toutes les issues d'une expérience" },
  { id: "chances", libelle: "« a chances sur b » (CM2)" },
  { id: "comparer", libelle: "Comparer des probabilités (CM2)" },
  { id: "arbre", libelle: "L'arbre des possibles (CM2)" },
  { id: "independance", libelle: "Le dé ne se souvient pas (CM2)" },
];

export interface ReglagesDonneesCM { classe: "CM1" | "CM2"; exercices: ExerciceDonneesCM[]; combien: number; titre?: string }
export const REGLAGES_DONNEES_CM: ReglagesDonneesCM = { classe: "CM1", exercices: ["tableau"], combien: 4 };

interface Bloc { consigne: string; corps: string; corrige: string }
type Alea = () => number;
const NOIR = "#1c2233";
const TROU = '<span class="do-trou"></span>';
const TRAIT = '<span class="do-trait"></span>';
/** Une réponse en mots : un mois, un sport, un qualificatif. */
const MOT = '<span class="do-trait do-court"></span>';
const n2 = (x: number) => Number(x.toFixed(2));
const lignes = (items: string[]) => `<div class="do-lignes">${items.map((x) => `<div>${x}</div>`).join("")}</div>`;
const cases = (items: string[]) => `<div class="do-figures">${items.map((x) => `<div class="do-case">${x}</div>`).join("")}</div>`;
const texte = (x: number, y: number, t: string, taille = 3.2, ancre = "middle", couleur = NOIR) => `<text x="${n2(x)}" y="${n2(y)}" font-size="${taille}" text-anchor="${ancre}" fill="${couleur}">${escapeHtml(t)}</text>`;
const COULEURS = ["#2454e6", "#e07b00", "#1f9a48", "#d94033", "#8e44ad", "#0f9fb0"];

/** Des prénoms inventés, et ceux qui se disent « elle ». */
const PRENOMS = ["Léa", "Tom", "Nour", "Basile", "Zoé", "Malik", "Maëlle", "Timéo", "Lina", "Sacha", "Jade", "Noé"];
const FEMININS = new Set(["Léa", "Nour", "Zoé", "Maëlle", "Lina", "Jade"]);
const il = (nom: string) => (FEMININS.has(nom) ? "elle" : "il");
const Il = (nom: string) => (FEMININS.has(nom) ? "Elle" : "Il");

// ── Les graphiques ────────────────────────────────────────────────────────

/** Un pas de graduation lisible pour des valeurs jusqu'à max : 1, 2, 5, 10, 20, 50… */
function pasDeGraduation(max: number): number {
  for (const p of [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500]) if (max / p <= 10) return p;
  return 1000;
}

/** Un diagramme en barres : des catégories, leurs valeurs, un axe gradué ; les barres absentes quand on les fait construire. */
function barresSvg(etiquettes: string[], valeurs: number[], barres = true, titreAxe = ""): string {
  const max = Math.max(...valeurs), pas = pasDeGraduation(max), haut = Math.ceil(max / pas) * pas;
  const x0 = 16, y0 = 66, h = 56, l = 12, ecart = 6, w = x0 + etiquettes.length * (l + ecart) + 4;
  const y = (v: number) => y0 - (v / haut) * h;
  const graduations = Array.from({ length: haut / pas + 1 }, (_, i) => i * pas).map((v) =>
    `<line x1="${x0 - 1}" y1="${n2(y(v))}" x2="${w}" y2="${n2(y(v))}" stroke="#d6dae4" stroke-width="0.25"/>` + texte(x0 - 2, y(v) + 1.1, String(v), 2.8, "end")).join("");
  const corps = etiquettes.map((e, i) => {
    const x = x0 + ecart / 2 + i * (l + ecart);
    return (barres ? `<rect x="${n2(x)}" y="${n2(y(valeurs[i]))}" width="${l}" height="${n2(y0 - y(valeurs[i]))}" fill="${COULEURS[i % COULEURS.length]}" fill-opacity="0.75" stroke="${NOIR}" stroke-width="0.3"/>` : "")
      + texte(x + l / 2, y0 + 4.5, e, 2.8);
  }).join("");
  return `<svg class="do-graphique" viewBox="0 0 ${w} 76" width="${n2(w * 1.25)}mm" height="${76 * 1.25}mm">${graduations}`
    + `<line x1="${x0}" y1="${y0}" x2="${w}" y2="${y0}" stroke="${NOIR}" stroke-width="0.4"/><line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y0 - h - 2}" stroke="${NOIR}" stroke-width="0.4"/>`
    + (titreAxe ? texte(x0 - 12, 5, titreAxe, 2.8, "start") : "") + corps + "</svg>";
}

/** Deux courbes dans un même repère, avec leur légende. */
function courbesSvg(abscisses: string[], series: { nom: string; valeurs: number[] }[], unite: string): string {
  const max = Math.max(...series.flatMap((s) => s.valeurs)), pas = pasDeGraduation(max), haut = Math.ceil(max / pas) * pas;
  const x0 = 16, y0 = 66, h = 56, dx = 10, w = x0 + (abscisses.length - 1) * dx + 10;
  const y = (v: number) => y0 - (v / haut) * h, x = (i: number) => x0 + 4 + i * dx;
  const grille = Array.from({ length: haut / pas + 1 }, (_, i) => i * pas).map((v) =>
    `<line x1="${x0}" y1="${n2(y(v))}" x2="${w}" y2="${n2(y(v))}" stroke="#d6dae4" stroke-width="0.25"/>` + texte(x0 - 2, y(v) + 1.1, String(v), 2.8, "end")).join("")
    + abscisses.map((a, i) => `<line x1="${n2(x(i))}" y1="${y0}" x2="${n2(x(i))}" y2="${y0 - h}" stroke="#eef0f5" stroke-width="0.25"/>` + texte(x(i), y0 + 4.5, a, 2.6)).join("");
  const traits = series.map((s, k) => `<polyline points="${s.valeurs.map((v, i) => `${n2(x(i))},${n2(y(v))}`).join(" ")}" fill="none" stroke="${COULEURS[k]}" stroke-width="0.7"${k ? ' stroke-dasharray="2 1"' : ""}/>`
    + s.valeurs.map((v, i) => `<circle cx="${n2(x(i))}" cy="${n2(y(v))}" r="0.8" fill="${COULEURS[k]}"/>`).join("")).join("");
  const legende = series.map((s, k) => `<line x1="${x0 + 2 + k * 40}" y1="74" x2="${x0 + 10 + k * 40}" y2="74" stroke="${COULEURS[k]}" stroke-width="0.8"${k ? ' stroke-dasharray="2 1"' : ""}/>` + texte(x0 + 12 + k * 40, 75, s.nom, 2.8, "start")).join("");
  return `<svg class="do-graphique" viewBox="0 0 ${w} 80" width="${n2(w * 1.25)}mm" height="${80 * 1.25}mm">${grille}`
    + `<line x1="${x0}" y1="${y0}" x2="${w}" y2="${y0}" stroke="${NOIR}" stroke-width="0.4"/><line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y0 - h - 2}" stroke="${NOIR}" stroke-width="0.4"/>`
    + texte(x0 - 12, 5, unite, 2.8, "start") + traits + legende + "</svg>";
}

/** Un diagramme circulaire : des parts, et leur légende. */
function camembertSvg(parts: { nom: string; valeur: number }[], couleurs = COULEURS): string {
  const total = parts.reduce((s, p) => s + p.valeur, 0), cx = 22, cy = 22, r = 19;
  let angle = -90;
  const secteurs = parts.map((p, i) => {
    const a1 = angle, a2 = angle + (p.valeur / total) * 360; angle = a2;
    const P = (a: number) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
    const [x1, y1] = P(a1), [x2, y2] = P(a2);
    return `<path d="M ${cx} ${cy} L ${n2(x1)} ${n2(y1)} A ${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${n2(x2)} ${n2(y2)} Z" fill="${couleurs[i % couleurs.length]}" fill-opacity="0.8" stroke="#fff" stroke-width="0.6"/>`;
  }).join("");
  const legende = parts.map((p, i) => `<rect x="48" y="${6 + i * 7}" width="4" height="4" fill="${couleurs[i % couleurs.length]}" fill-opacity="0.8"/>` + texte(54, 9.6 + i * 7, p.nom, 3, "start")).join("");
  return `<svg class="do-graphique" viewBox="0 0 92 46" width="80mm" height="40mm">${secteurs}${legende}</svg>`;
}

// ── Les données ───────────────────────────────────────────────────────────

/** Comme l'enquête de l'école du Centre : les moyens de transport des filles et des garçons du cours moyen. */
function tableau(alea: Alea, _r: ReglagesDonneesCM): Bloc {
  const moyens = ["À pied", "À vélo", "En voiture", "En bus"];
  const filles = moyens.map(() => entier(alea, 20, 90)), garcons = moyens.map(() => entier(alea, 20, 90));
  const tf = filles.reduce((a, b) => a + b, 0), tg = garcons.reduce((a, b) => a + b, 0);
  const [p, q] = melanger(alea, PRENOMS).slice(0, 2);
  const tab = `<table class="do-tableau"><thead><tr><th>Moyen de transport</th><th>Filles</th><th>Garçons</th></tr></thead><tbody>${moyens.map((m, i) => `<tr><td>${m}</td><td>${filles[i]}</td><td>${garcons[i]}</td></tr>`).join("")}</tbody></table>`;
  const piedVeloF = filles[0] + filles[1], piedVelo = filles[0] + filles[1] + garcons[0] + garcons[1];
  const questions: [string, string][] = [
    [`Combien de filles viennent en bus ?`, `${filles[3]}`],
    [`Combien d'élèves viennent à vélo ?`, `${filles[1]} + ${garcons[1]} = ${filles[1] + garcons[1]}`],
    [`Combien de filles y a-t-il en tout au cours moyen ?`, `${filles.join(" + ")} = ${tf}`],
    [`${p} dit que plus de la moitié des filles viennent à l'école à pied ou à vélo. A-t-${il(p)} raison ?`, `${filles[0]} + ${filles[1]} = ${piedVeloF} ; la moitié de ${tf}, c'est ${fr(tf / 2, tf % 2 ? 1 : 0)} : ${piedVeloF > tf / 2 ? "oui" : "non"}.`],
    [`${q} dit que plus de la moitié des élèves viennent à pied ou à vélo. A-t-${il(q)} raison ?`, `${piedVelo} élèves sur ${tf + tg} ; la moitié de ${tf + tg}, c'est ${fr((tf + tg) / 2, (tf + tg) % 2 ? 1 : 0)} : ${piedVelo > (tf + tg) / 2 ? "oui" : "non"}.`],
  ];
  return {
    consigne: "Une enquête sur le moyen de transport des élèves du cours moyen pour venir à l'école. Lis le tableau, puis réponds.",
    corps: tab + lignes(questions.map(([qq]) => `${escapeHtml(qq)} ${TROU}`)), corrige: tab + lignes(questions.map(([qq, rep]) => `${escapeHtml(qq)} <b>${escapeHtml(rep)}</b>`)),
  };
}

const SPORTS = ["Football", "Danse", "Judo", "Natation", "Basket", "Tennis"];

function barresLire(alea: Alea, r: ReglagesDonneesCM): Bloc {
  const noms = melanger(alea, SPORTS).slice(0, 5), echelle = choisir(alea, [1, 2, 5]);
  const valeurs = noms.map(() => echelle * entier(alea, 2, 12));
  while (new Set(valeurs).size < valeurs.length) valeurs[entier(alea, 0, valeurs.length - 1)] = echelle * entier(alea, 2, 12);
  const imax = valeurs.indexOf(Math.max(...valeurs)), imin = valeurs.indexOf(Math.min(...valeurs));
  const [a, b] = melanger(alea, [0, 1, 2, 3, 4]).slice(0, 2);
  const questions: [string, string][] = [
    [`Combien d'élèves pratiquent le ${noms[a].toLowerCase()} ?`, `${valeurs[a]}`],
    ["Quel sport est le plus pratiqué ?", noms[imax]], ["Quel sport est le moins pratiqué ?", noms[imin]],
    [`Combien d'élèves de plus pratiquent le ${noms[a].toLowerCase()} que le ${noms[b].toLowerCase()} ?`, `${Math.max(valeurs[a], valeurs[b])} − ${Math.min(valeurs[a], valeurs[b])} = ${Math.abs(valeurs[a] - valeurs[b])}${valeurs[a] < valeurs[b] ? ` : c'est le ${noms[b].toLowerCase()} qui en a ${Math.abs(valeurs[a] - valeurs[b])} de plus` : ""}`],
    ["Combien d'élèves ont répondu à l'enquête ?", `${valeurs.join(" + ")} = ${valeurs.reduce((s, v) => s + v, 0)}`],
  ];
  const svg = barresSvg(noms, valeurs, true, "Nombre d'élèves");
  return {
    consigne: `Le diagramme montre le sport pratiqué par les élèves de l'école. Je lis le diagramme${r.classe === "CM2" ? " et ses graduations" : ""}, puis je réponds.`,
    corps: svg + lignes(questions.map(([q], k) => `${escapeHtml(q)} ${k === 1 || k === 2 ? MOT : TROU}`)), corrige: svg + lignes(questions.map(([q, rep]) => `${escapeHtml(q)} <b>${escapeHtml(rep)}</b>`)),
  };
}

function barresConstruire(alea: Alea, _r: ReglagesDonneesCM): Bloc {
  const noms = ["Lundi", "Mardi", "Jeudi", "Vendredi"], pas = choisir(alea, [2, 5, 10]);
  const valeurs = noms.map(() => pas * entier(alea, 2, 9));
  const tab = `<table class="do-tableau"><thead><tr><th>Jour</th>${noms.map((n) => `<th>${n}</th>`).join("")}</tr></thead><tbody><tr><td>Repas servis à la cantine</td>${valeurs.map((v) => `<td>${v}</td>`).join("")}</tr></tbody></table>`;
  return {
    consigne: "Construis le diagramme en barres qui représente ce tableau : l'axe est déjà gradué ; trace chaque barre à la bonne hauteur.",
    corps: tab + barresSvg(noms, valeurs, false, "Repas"), corrige: tab + barresSvg(noms, valeurs, true, "Repas"),
  };
}

/** Comme les précipitations à Paris et à Marseille : deux courbes dans le même repère, avec une légende. */
function courbes(alea: Alea, _r: ReglagesDonneesCM): Bloc {
  const mois = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  // Des données inventées : des villes sans nom, pour ne rien faire croire du climat d'une vraie ville.
  const villes = ["la ville A", "la ville B"];
  const serie = (base: number, ete: boolean) => mois.map((_, i) => Math.max(2, Math.round(base + (ete ? -1 : 1) * 25 * Math.cos(((i - 0.5) * Math.PI) / 6) + entier(alea, -12, 12))));
  const s1 = serie(entier(alea, 50, 70), false), s2 = serie(entier(alea, 35, 55), true);
  const series = [{ nom: "Ville A", valeurs: s1 }, { nom: "Ville B", valeurs: s2 }];
  const nomsMois = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const i = entier(alea, 0, 11), imax = s1.indexOf(Math.max(...s1)), imin = s2.indexOf(Math.min(...s2));
  const plus = nomsMois.filter((_, k) => s2[k] > s1[k]);
  const questions: [string, string][] = [
    [`Quelle a été la hauteur des pluies dans ${villes[0]} en ${nomsMois[i]} ?`, `${s1[i]} mm`],
    [`Pendant quel mois a-t-il le plus plu dans ${villes[0]} ?`, nomsMois[imax]],
    [`Pendant quel mois a-t-il le moins plu dans ${villes[1]} ?`, nomsMois[imin]],
    [`Pendant quels mois a-t-il plus plu dans ${villes[1]} que dans ${villes[0]} ?`, plus.length ? plus.join(", ") : "aucun"],
  ];
  const svg = courbesSvg(mois, series, "Pluie (mm)");
  return {
    consigne: "Les hauteurs de pluie chaque mois dans deux villes, la même année. Utilise la légende pour savoir quelle courbe est celle de quelle ville.",
    corps: svg + lignes(questions.map(([q], k) => `${escapeHtml(q)} ${k === 0 ? TROU : MOT}`)), corrige: svg + lignes(questions.map(([q, rep]) => `${escapeHtml(q)} <b>${escapeHtml(rep)}</b>`)),
  };
}

/** Au CM2 : quel diagramme circulaire correspond au tableau, comme les couleurs des voitures relevées sur un parking ; puis la recette du cocktail. */
function circulaire(alea: Alea, _r: ReglagesDonneesCM): Bloc {
  const couleurs = ["Blanche", "Bleue", "Noire", "Verte"];
  const valeurs = choisir(alea, [[30, 15, 10, 5], [20, 20, 10, 10], [30, 10, 15, 5], [40, 10, 5, 5]] as const);
  const total = valeurs.reduce((s, v) => s + v, 0);
  const tab = `<table class="do-tableau"><thead><tr><th>Couleur</th>${couleurs.map((c) => `<th>${c}</th>`).join("")}<th>Total</th></tr></thead><tbody><tr><td>Nombre de voitures</td>${valeurs.map((v) => `<td>${v}</td>`).join("")}<td>${total}</td></tr></tbody></table>`;
  // Le bon diagramme, et trois autres : les parts échangées, les parts égales, une part oubliée.
  const parts = (v: readonly number[], noms = couleurs) => v.map((x, i) => ({ nom: noms[i], valeur: x }));
  const candidats = melanger(alea, [
    { svg: camembertSvg(parts(valeurs)), juste: true, raison: "La moitié des voitures sont blanches : la part blanche est la moitié du disque." },
    { svg: camembertSvg(parts([valeurs[1], valeurs[0], valeurs[2], valeurs[3]])), juste: false, raison: "Les parts des voitures blanches et bleues sont échangées." },
    { svg: camembertSvg(parts([15, 15, 15, 15])), juste: false, raison: "Les quatre parts sont égales, alors que les nombres de voitures ne le sont pas." },
    { svg: camembertSvg(parts(valeurs.slice(0, 3), couleurs)), juste: false, raison: "Les voitures vertes ont été oubliées." },
  ]);
  // La recette : des fractions du verre.
  const recette = choisir(alea, [[["jus de litchi", 2, 5], ["jus d'orange", 3, 10], ["sirop de fraise", 1, 10], ["eau gazeuse", 1, 5]], [["jus de pomme", 1, 2], ["jus de litchi", 1, 4], ["sirop de citron", 1, 4]]] as const);
  const volume = choisir(alea, [200, 250, 300, 400]);
  const [nom, a, b] = recette[0];
  const cocktail = camembertSvg(recette.map(([n, x, y]) => ({ nom: `${n} : ${x}/${y}`, valeur: x / y })), ["#e07b00", "#f2c94c", "#d94033", "#7fb8e6"]);
  const question = `Un verre contient ${volume} mL d'un cocktail réalisé avec la recette du diagramme. Quel volume de ${nom} y a-t-il dans ce verre ?`;
  return {
    consigne: "J'entoure le diagramme qui représente le tableau. J'écris pourquoi je rejette les trois autres. Puis je résous le problème du cocktail.",
    corps: tab + cases(candidats.map((c, i) => `<b>${"ABCD"[i]}</b>${c.svg}`)) + lignes([`Le bon diagramme : ${TROU}`, `Pourquoi pas les autres : ${TRAIT}`]) + cocktail + lignes([`${escapeHtml(question)} ${TROU} mL`]),
    corrige: tab + cases(candidats.map((c, i) => `<b>${"ABCD"[i]}</b>${c.svg}<div><b>${c.juste ? "Oui" : "Non"}</b> : ${escapeHtml(c.raison)}</div>`)) + cocktail
      + lignes([`${escapeHtml(question)} <b>${volume} ÷ ${b} = ${volume / b} ; ${a} × ${volume / b} = ${(a * volume) / b} mL</b>`]),
  };
}

/** Un problème en une ou deux étapes, l'énoncé et le graphique : le nombre de garçons d'une classe. */
function probleme(alea: Alea, _r: ReglagesDonneesCM): Bloc {
  const classes = ["CM1 A", "CM1 B", "CM1 C"];
  const filles = classes.map(() => entier(alea, 9, 15)), garcons = classes.map(() => entier(alea, 9, 15));
  const totaux = classes.map((_, i) => filles[i] + garcons[i]);
  const k = entier(alea, 0, 2);
  const svg = barresSvg(classes, totaux, true, "Élèves");
  const questions: [string, string][] = [
    [`Il y a ${filles[k]} filles en ${classes[k]}. Combien de garçons y a-t-il dans cette classe ?`, `${totaux[k]} − ${filles[k]} = ${garcons[k]}`],
    ["Combien d'élèves y a-t-il en CM1 dans cette école ?", `${totaux.join(" + ")} = ${totaux.reduce((s, v) => s + v, 0)}`],
  ];
  return {
    consigne: "Le graphique donne le nombre d'élèves de chaque classe de CM1 de l'école. Je prends les données dans l'énoncé et sur le graphique.",
    corps: svg + lignes(questions.map(([q]) => `${escapeHtml(q)} ${TROU}`)), corrige: svg + lignes(questions.map(([q, rep]) => `${escapeHtml(q)} <b>${escapeHtml(rep)}</b>`)),
  };
}

// ── Les probabilités ──────────────────────────────────────────────────────

const VERT = "#1f9a48", ROUGE = "#d94033", JAUNE = "#f2c94c", NOIRE = "#1c2233", BLANCHE = "#ffffff";
/** Une bouteille opaque, et les billes qu'elle contient — dessinées à côté, comme le contenu dévoilé. */
function bouteille(billes: string[], nom = ""): string {
  const corps = `<path d="M 14 4 L 20 4 L 20 10 Q 27 13 27 20 L 27 44 Q 27 46 25 46 L 9 46 Q 7 46 7 44 L 7 20 Q 7 13 14 10 Z" fill="#e6e9f1" stroke="${NOIR}" stroke-width="0.5"/>`;
  const contenu = billes.map((c, i) => `<circle cx="${n2(11 + (i % 3) * 6)}" cy="${n2(40 - Math.floor(i / 3) * 6)}" r="2.6" fill="${c}" stroke="${NOIR}" stroke-width="0.35"/>`).join("");
  return `<svg class="do-bouteille" viewBox="0 0 34 54" width="24mm" height="38mm">${corps}${contenu}${nom ? texte(17, 52, nom, 3.4) : ""}</svg>`;
}
const QUALIFICATIFS = ["impossible", "peu probable", "une chance sur deux", "probable", "certain"];
/** Le mot qui qualifie la probabilité de a issues favorables sur b. */
const qualifier = (a: number, b: number) => (a === 0 ? "impossible" : a === b ? "certain" : 2 * a === b ? "une chance sur deux" : 2 * a < b ? "peu probable" : "probable");

/** Les évènements de la vie et du dé du livret de CM1, et leur qualification. */
const EVENEMENTS_VIE: [string, string][] = [
  ["Naître un 30 février.", "impossible"], ["Tirer une bille bleue d'un sac qui ne contient que des billes rouges.", "impossible"],
  ["En lançant un dé, obtenir un nombre inférieur à 7.", "certain"], ["En lançant un dé, obtenir 7.", "impossible"],
  ["En lançant une pièce, obtenir « pile ».", "une chance sur deux"], ["En lançant un dé, obtenir un nombre pair.", "une chance sur deux"],
  ["Voir un arc-en-ciel après la pluie.", "probable"], ["En lançant un dé, obtenir 6.", "peu probable"],
  ["En lançant un dé, obtenir un nombre supérieur à 1.", "probable"], ["Qu'il neige à Marseille le 15 août.", "peu probable"],
];

function qualifierEvenements(alea: Alea, r: ReglagesDonneesCM): Bloc {
  const couleurs = [VERT, ROUGE, JAUNE];
  const bouteilles = Array.from({ length: Math.max(2, Math.min(4, Math.ceil(r.combien / 2))) }, (_, i) => {
    const total = choisir(alea, [2, 4]), verts = [0, total, total / 2, 1, total - 1][(i + entier(alea, 0, 4)) % 5];
    const billes = melanger(alea, [...Array(verts).fill(VERT), ...Array.from({ length: total - verts }, () => choisir(alea, couleurs.slice(1)))]);
    return { billes, mot: qualifier(verts, total), verts, total };
  });
  const vie = melanger(alea, EVENEMENTS_VIE).slice(0, Math.max(2, Math.min(5, r.combien)));
  return {
    consigne: "La bouteille retournée ne montre qu'une bille, au hasard. Pour « obtenir une bille verte », j'écris : impossible, peu probable, une chance sur deux, probable ou certain. Je fais de même pour les évènements écrits.",
    corps: cases(bouteilles.map((b) => `${bouteille(b.billes)}<div>${MOT}</div>`)) + lignes(vie.map(([e]) => `${escapeHtml(e)} ${MOT}`)),
    corrige: cases(bouteilles.map((b) => `${bouteille(b.billes)}<div><b>${b.mot}</b> : ${b.verts} bille${b.verts > 1 ? "s" : ""} verte${b.verts > 1 ? "s" : ""} sur ${b.total}.</div>`))
      + lignes(vie.map(([e, m]) => `${escapeHtml(e)} <b>${m}</b>`)),
  };
}

/** L'échelle des probabilités du livret de CM1, et des évènements du lancer d'un dé à placer dessus. */
function echelle(alea: Alea, _r: ReglagesDonneesCM): Bloc {
  const evenements = melanger(alea, [
    ["obtenir un nombre inférieur à 7", 6], ["obtenir 7", 0], ["obtenir un nombre pair", 3], ["obtenir un nombre supérieur à 1", 5],
    ["obtenir 3", 1], ["obtenir un nombre différent de 4", 5], ["obtenir un nombre inférieur à 3", 2], ["obtenir un nombre impair", 3],
  ] as [string, number][]).slice(0, 5);
  const lettres = "ABCDE";
  const position = (k: number) => QUALIFICATIFS.indexOf(qualifier(k, 6));
  const svg = (corrige: boolean) => `<svg class="do-echelle" viewBox="0 0 170 30" width="170mm" height="30mm"><line x1="10" y1="12" x2="160" y2="12" stroke="${NOIR}" stroke-width="0.6"/>`
    + QUALIFICATIFS.map((m, i) => `<line x1="${10 + i * 37.5}" y1="9" x2="${10 + i * 37.5}" y2="15" stroke="${NOIR}" stroke-width="0.6"/>` + texte(10 + i * 37.5, 22, m, 3.4)).join("")
    + (corrige ? evenements.map(([, k], j) => texte(10 + position(k) * 37.5 + (evenements.slice(0, j).filter(([, kk]) => position(kk) === position(k)).length - 0.5) * 5, 7, lettres[j], 3.6, "middle", ROUGE)).join("") : "") + "</svg>";
  return {
    consigne: "On lance un dé à six faces. Place chaque évènement sur l'échelle des probabilités : écris sa lettre au-dessus du bon mot.",
    corps: svg(false) + lignes(evenements.map(([e], j) => `<b>${lettres[j]}</b> : ${escapeHtml(e)}`)),
    corrige: svg(true) + lignes(evenements.map(([e, k], j) => `<b>${lettres[j]}</b> : ${escapeHtml(e)} — <b>${qualifier(k, 6)}</b> (${k} face${k > 1 ? "s" : ""} sur 6)`)),
  };
}

/** Colorier les billes d'un sac pour obtenir la probabilité demandée. */
function colorier(alea: Alea, r: ReglagesDonneesCM): Bloc {
  const cm2 = r.classe === "CM2";
  const items = Array.from({ length: Math.max(2, Math.min(4, r.combien)) }, (_, i) => {
    const total = choisir(alea, [4, 6, 8, 10]);
    const cible = cm2 && i % 2 ? entier(alea, 1, total - 1) : [total / 2, 1, total - 1][i % 3];
    const demande = cm2 && i % 2 ? `${cible} chance${cible > 1 ? "s" : ""} sur ${total}` : qualifier(cible, total);
    return { total, cible, demande };
  });
  const sac = (total: number, verts: number) => `<svg class="do-sac" viewBox="0 0 44 36" width="40mm" height="33mm"><path d="M 6 12 Q 4 34 22 34 Q 40 34 38 12 Z" fill="#f3f0e8" stroke="${NOIR}" stroke-width="0.5"/>`
    + Array.from({ length: total }, (_, i) => `<circle cx="${n2(11 + (i % 5) * 5.5)}" cy="${n2(20 + Math.floor(i / 5) * 6.5)}" r="2.4" fill="${verts < 0 ? BLANCHE : i < verts ? VERT : ROUGE}" stroke="${NOIR}" stroke-width="0.35"/>`).join("") + "</svg>";
  return {
    consigne: "Colorie chaque bille du sac, en vert ou en rouge, pour qu'en prenant une bille au hasard, sans regarder, la probabilité d'obtenir une bille verte soit celle qui est écrite.",
    corps: cases(items.map((x) => `${sac(x.total, -1)}<div>Obtenir une bille verte : <b>${x.demande}</b></div>`)),
    corrige: cases(items.map((x) => `${sac(x.total, x.cible)}<div>Par exemple, <b>${x.cible} bille${x.cible > 1 ? "s" : ""} verte${x.cible > 1 ? "s" : ""}</b> sur ${x.total}.${x.demande === "probable" ? " Toute répartition avec plus de la moitié de billes vertes, mais pas toutes, convient." : x.demande === "peu probable" ? " Toute répartition avec moins de la moitié de billes vertes, mais au moins une, convient." : ""}</div>`)),
  };
}

/** Toutes les issues d'une expérience simple ; au CM2, celles qui réalisent un évènement. */
function issues(alea: Alea, r: ReglagesDonneesCM): Bloc {
  const items: [string, string][] = [
    ["On lance un dé à six faces. Écris toutes les issues possibles.", "1, 2, 3, 4, 5, 6 : six issues."],
    ["On lance une pièce de monnaie. Écris toutes les issues possibles.", "pile, face : deux issues."],
    ["On fait tourner une roue partagée en cinq secteurs égaux numérotés de 1 à 5. Écris toutes les issues possibles.", "1, 2, 3, 4, 5 : cinq issues."],
  ];
  if (r.classe === "CM2") {
    items.push(
      ...melanger(alea, [
        ["On lance un dé. Quelles issues réalisent l'évènement « obtenir un nombre pair » ?", "2, 4, 6"],
        ["On lance un dé. Quelles issues réalisent l'évènement « obtenir un multiple de 3 » ?", "3, 6"],
        ["On lance un dé. Quelles issues réalisent l'évènement « obtenir un diviseur de 10 » ?", "1, 2, 5"],
        ["On tire une carte d'un jeu de 52 cartes. Quelles cartes réalisent « tirer un roi » ?", "le roi de cœur, de carreau, de pique et de trèfle : quatre cartes"],
        ["On tire une carte d'un jeu de 52 cartes. Quelles cartes réalisent « tirer un as rouge » ?", "l'as de cœur et l'as de carreau"],
        ["On tire une carte d'un jeu de 52 cartes. Quelles cartes réalisent « tirer une figure » ?", "les valets, les dames et les rois des quatre couleurs : douze cartes"],
      ] as [string, string][]).slice(0, 3),
    );
  }
  return {
    consigne: "Écris toutes les issues, sans en oublier et sans écrire deux fois la même.",
    corps: lignes(items.map(([q]) => `${escapeHtml(q)}<div>${TRAIT}</div>`)), corrige: lignes(items.map(([q, rep]) => `${escapeHtml(q)} <b>${escapeHtml(rep)}</b>`)),
  };
}

/** Au CM2 : « a chances sur b », et la comparaison avec « une chance sur deux ». */
function chances(alea: Alea, r: ReglagesDonneesCM): Bloc {
  const items: { svg?: string; texte: string; a: number; b: number }[] = [];
  for (let i = 0; i < Math.max(2, Math.min(3, Math.ceil(r.combien / 2))); i++) {
    const total = choisir(alea, [3, 4, 5, 6]), noires = entier(alea, 1, total - 1);
    items.push({ svg: bouteille(melanger(alea, [...Array(noires).fill(NOIRE), ...Array(total - noires).fill(BLANCHE)])), texte: "Obtenir une bille noire", a: noires, b: total });
  }
  items.push(...melanger(alea, [
    { texte: "En lançant un dé, obtenir 4", a: 1, b: 6 }, { texte: "En lançant un dé, obtenir un nombre pair", a: 3, b: 6 },
    { texte: "En lançant un dé, obtenir un multiple de 3", a: 2, b: 6 }, { texte: "Tirer un pique dans un jeu de 52 cartes", a: 13, b: 52 },
    { texte: "Tirer un as dans un jeu de 52 cartes", a: 4, b: 52 }, { texte: "En faisant tourner une roue de 4 secteurs égaux, obtenir le 2", a: 1, b: 4 },
  ]).slice(0, 3));
  const compare = (a: number, b: number) => (2 * a === b ? "égale à" : 2 * a < b ? "inférieure à" : "supérieure à");
  return {
    consigne: "J'écris la probabilité de chaque évènement sous la forme « a chances sur b ». J'écris si elle est supérieure, égale ou inférieure à une chance sur deux : je compare a à la moitié de b.",
    corps: cases(items.filter((x) => x.svg).map((x) => `${x.svg}<div>${escapeHtml(x.texte)} : ${TROU} chance(s) sur ${TROU}</div>`))
      + lignes(items.filter((x) => !x.svg).map((x) => `${escapeHtml(x.texte)} : ${TROU} chance(s) sur ${TROU} ; par rapport à une chance sur deux : ${TRAIT}`)),
    corrige: cases(items.filter((x) => x.svg).map((x) => `${x.svg}<div>${escapeHtml(x.texte)} : <b>${x.a} chance${x.a > 1 ? "s" : ""} sur ${x.b}</b>, ${compare(x.a, x.b)} une chance sur deux.</div>`))
      + lignes(items.filter((x) => !x.svg).map((x) => `${escapeHtml(x.texte)} : <b>${x.a} chance${x.a > 1 ? "s" : ""} sur ${x.b}</b>, ${compare(x.a, x.b)} une chance sur deux (la moitié de ${x.b}, c'est ${fr(x.b / 2, x.b % 2 ? 1 : 0)}).`)),
  };
}

function comparer(alea: Alea, _r: ReglagesDonneesCM): Bloc {
  const paires = melanger(alea, [
    ["tirer un pique", 13, 52, "tirer un as", 4, 52], ["obtenir un nombre pair avec un dé", 3, 6, "obtenir un multiple de 3 avec un dé", 2, 6],
    ["obtenir une bille noire dans un sac de 2 noires et 3 blanches", 2, 5, "obtenir une bille blanche dans le même sac", 3, 5],
    ["obtenir 6 avec un dé", 1, 6, "obtenir « face » avec une pièce", 1, 2], ["tirer une figure dans un jeu de 52 cartes", 12, 52, "tirer un cœur dans le même jeu", 13, 52],
  ] as [string, number, number, string, number, number][]).slice(0, 3);
  const plus = (p: (typeof paires)[number]) => (p[1] * p[5] > p[4] * p[2] ? p[0] : p[1] * p[5] < p[4] * p[2] ? p[3] : "les deux sont aussi probables");
  return {
    consigne: "J'écris d'abord chaque probabilité sous la forme « a chances sur b ». Puis j'écris l'évènement le plus probable.",
    corps: lignes(paires.map((p) => `« ${escapeHtml(p[0])} » ou « ${escapeHtml(p[3])} » ?<div>${TRAIT}</div>`)),
    corrige: lignes(paires.map((p) => `« ${escapeHtml(p[0])} » : ${p[1]} chance${p[1] > 1 ? "s" : ""} sur ${p[2]} ; « ${escapeHtml(p[3])} » : ${p[4]} chance${p[4] > 1 ? "s" : ""} sur ${p[5]}. <b>Le plus probable : ${escapeHtml(plus(p))}.</b>`)),
  };
}

/** L'arbre des possibles d'une expérience en deux étapes, comme les bouteilles D et E du livret de CM2. */
function arbreSvg(premiere: string[], seconde: string[]): string {
  const h = premiere.length * seconde.length * 6 + 4;
  let corps = "";
  premiere.forEach((a, i) => {
    const ya = 2 + (i + 0.5) * seconde.length * 6;
    corps += `<line x1="4" y1="${n2(h / 2)}" x2="26" y2="${n2(ya)}" stroke="${NOIR}" stroke-width="0.4"/>` + texte(30, ya + 1.2, a, 3.2);
    seconde.forEach((b, j) => {
      const yb = 2 + (i * seconde.length + j + 0.5) * 6;
      corps += `<line x1="34" y1="${n2(ya)}" x2="56" y2="${n2(yb)}" stroke="${NOIR}" stroke-width="0.4"/>` + texte(60, yb + 1.2, b, 3.2) + texte(68, yb + 1.2, `(${a} ; ${b})`, 3, "start", "#4b5266");
    });
  });
  return `<svg class="do-arbre" viewBox="0 0 100 ${h}" width="100mm" height="${n2(h)}mm">${corps}</svg>`;
}

function arbre(alea: Alea, _r: ReglagesDonneesCM): Bloc {
  const items = melanger(alea, [
    { texte: "La bouteille D contient une bille bleue, une rouge et une verte ; la bouteille E, une noire et une bleue. On retourne D, puis E.", premiere: ["B", "R", "V"], seconde: ["N", "B"], question: "Quelle est la probabilité d'obtenir une bille bleue, puis une bille noire ?", reponse: "1 chance sur 6 : un seul chemin sur six." },
    { texte: "On lance deux fois une pièce de monnaie.", premiere: ["F", "P"], seconde: ["F", "P"], question: "Quelle est la probabilité d'obtenir deux fois « face » ? Et d'obtenir une fois « pile » et une fois « face », dans n'importe quel ordre ?", reponse: "1 chance sur 4 pour (F ; F) ; 2 chances sur 4 pour (F ; P) ou (P ; F)." },
    { texte: "On lance une pièce, puis on fait tourner une roue de trois secteurs égaux : 1, 2, 3.", premiere: ["P", "F"], seconde: ["1", "2", "3"], question: "Quelle est la probabilité d'obtenir « pile » et un nombre impair ?", reponse: "2 chances sur 6 : (P ; 1) et (P ; 3)." },
  ]).slice(0, 2);
  return {
    consigne: "Construis l'arbre des possibles : une branche par issue à la première étape, puis, au bout de chacune, une branche par issue à la seconde. Compte les chemins, puis réponds.",
    corps: items.map((x) => `<div class="do-probleme">${escapeHtml(x.texte)}<div class="do-cadre"></div>${escapeHtml(x.question)} ${TRAIT}</div>`).join(""),
    corrige: items.map((x) => `<div class="do-probleme">${escapeHtml(x.texte)}${arbreSvg(x.premiere, x.seconde)}<div>${x.premiere.length} × ${x.seconde.length} = ${x.premiere.length * x.seconde.length} chemins. ${escapeHtml(x.question)} <b>${escapeHtml(x.reponse)}</b></div></div>`).join(""),
  };
}

function independance(alea: Alea, _r: ReglagesDonneesCM): Bloc {
  const p = melanger(alea, PRENOMS);
  const tirages = Array.from({ length: 3 }, () => choisir(alea, ["PILE", "FACE"]));
  const items: [string, string][] = [
    [`${p[0]} jette trois fois de suite la même pièce. ${Il(p[0])} obtient dans l'ordre : ${tirages.join(" – ")}. ${Il(p[0])} la jette une quatrième fois. Le résultat a-t-il plus de chances d'être PILE, plus de chances d'être FACE, ou autant de chances ? Explique.`,
      "Autant de chances : la pièce ne se souvient pas des lancers précédents ; il y a toujours une chance sur deux d'obtenir PILE, et une chance sur deux d'obtenir FACE."],
    [`${p[1]} a obtenu trois fois 6 de suite avec un dé. Au lancer suivant, a-t-on plus de chances, moins de chances, ou autant de chances d'obtenir 6 ?`, "Autant de chances : une chance sur six, comme à chaque lancer."],
    ["On tire une bille d'un sac de 2 billes noires et 2 blanches, on la remet, et on recommence. La première était noire. Quelle est la probabilité que la seconde soit noire ?", "2 chances sur 4, une chance sur deux : la bille a été remise, le sac est le même."],
  ];
  return {
    consigne: "Réponds, et explique : que se passe-t-il quand on répète la même expérience ?",
    corps: lignes(items.map(([q]) => `${escapeHtml(q)}<div>${TRAIT}</div>`)), corrige: lignes(items.map(([q, rep]) => `${escapeHtml(q)} <b>${escapeHtml(rep)}</b>`)),
  };
}

const FABRIQUES: Record<ExerciceDonneesCM, (alea: Alea, r: ReglagesDonneesCM) => Bloc> = {
  tableau, "barres-lire": barresLire, "barres-construire": barresConstruire, courbes, circulaire, probleme,
  qualifier: qualifierEvenements, echelle, colorier, issues, chances, comparer, arbre, independance,
};

export function htmlDonneesCM(r: ReglagesDonneesCM, graine: number): string {
  const alea = hasard(graine);
  const titre = r.titre ?? "Données et probabilités";
  const exos: string[] = [], corriges: string[] = [];
  EXERCICES_DONNEES_CM.map((e) => e.id).filter((e) => r.exercices.includes(e)).forEach((ex, i) => {
    const b = FABRIQUES[ex](alea, { ...r, combien: Math.max(1, Math.min(10, r.combien)) });
    exos.push(`<div class="do-exo"><div class="do-consigne"><b>${i + 1}.</b> ${b.consigne}</div>${b.corps}</div>`);
    corriges.push(`<div class="do-exo"><div class="do-consigne"><b>${i + 1}.</b> ${b.consigne}</div>${b.corrige}</div>`);
  });
  return feuille(`<div class="page"><div class="titre">${escapeHtml(titre)}</div><div class="sous">Prénom : ........................................ Date : ........................</div>${exos.join("")}</div>
    <div class="page corrige"><div class="titre">${escapeHtml(titre)} — corrigé</div>${corriges.join("")}</div>`, "do");
}

export const STYLE_DONNEES_CM = `
  .feuille.do .do-exo { margin: 0 0 6mm; }
  .feuille.do .do-consigne { font-size: 13px; margin-bottom: 3mm; break-after: avoid; page-break-after: avoid; break-inside: avoid; page-break-inside: avoid; }
  .feuille.do .do-lignes > div { font-size: 14px; margin: 0 0 3.5mm; line-height: 1.7; break-inside: avoid; page-break-inside: avoid; }
  .feuille.do .do-trou { display: inline-block; width: 16mm; height: 7mm; border: 1.5px solid #1c2233; border-radius: 1.5mm; vertical-align: middle; }
  .feuille.do .do-trait { display: inline-block; min-width: 80mm; border-bottom: 1px dotted #9aa0b4; height: 6mm; vertical-align: bottom; }
  .feuille.do .do-trait.do-court { min-width: 42mm; }
  .feuille.do .do-choix { display: inline-block; padding: 0.5mm 2.5mm; margin: 0 1mm; border: 1px solid #c4c9d6; border-radius: 3mm; font-size: 13px; }
  .feuille.do .do-figures { display: flex; flex-wrap: wrap; gap: 5mm 8mm; align-items: flex-end; margin: 0 0 4mm; }
  .feuille.do .do-case { break-inside: avoid; page-break-inside: avoid; font-size: 13.5px; max-width: 80mm; }
  .feuille.do .do-case > div { margin-top: 1.5mm; line-height: 1.6; }
  .feuille.do .do-tableau { border-collapse: collapse; font-size: 13.5px; margin: 0 0 4mm; }
  .feuille.do .do-tableau th, .feuille.do .do-tableau td { border: 1px solid #9aa0b4; padding: 1.4mm 3mm; text-align: center; }
  .feuille.do .do-tableau th { background: #f0f2f8; }
  .feuille.do .do-tableau td:first-child { text-align: left; }
  .feuille.do .do-graphique, .feuille.do .do-echelle, .feuille.do .do-arbre { display: block; margin: 0 0 3mm; break-inside: avoid; }
  .feuille.do .do-probleme { font-size: 14px; margin: 0 0 5mm; break-inside: avoid; page-break-inside: avoid; }
  .feuille.do .do-cadre { height: 46mm; border: 1.2px dashed #9aa0b4; border-radius: 2mm; margin: 2mm 0; }
  .feuille.do svg { display: block; }
`;
