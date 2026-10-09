// Images séquentielles : remettre dans l'ordre une histoire, un geste, une recette.
//
// « S'approprier la notion de chronologie » (programme de l'école maternelle,
// 2025) : avant 4 ans, ordonner des moments rituels vécus et le déroulement
// d'actions quotidiennes dans une histoire simple ; à partir de 4 ans,
// restituer la chronologie des actions majeures d'une histoire simple — « au
// début, ensuite et pour finir » ; à partir de 5 ans, repérer et ordonner les
// étapes d'un processus ou d'un évènement vécu — « d'abord, ensuite, puis,
// après, enfin » — et reconstruire la structure d'une histoire. Le programme
// fait aussi ordonner les étapes d'une recette, d'une fabrication, du cycle
// de vie d'une plante ou d'un animal. Les indicateurs de progrès d'Éduscol
// (2016) représentent « les séquences vécues ou la trame des histoires
// entendues » par des photographies qu'on ordonne pour reconstituer la
// chronologie, avec des activités langagières autour.
//
// L'atelier imprime la fiche de l'élève — les images mêlées, à découper, et
// les cases où les coller dans l'ordre, en colonne ou en bande fléchée —, les
// grandes images pour ordonner ensemble au tableau, et l'ordre juste pour le
// maître. Les images sont des pictos, ou des photos : de la classe en
// activité, ou des illustrations d'un album.

import { escapeHtml } from "./print";
import { melanger } from "./hasard";
import { attributionPour, carte, feuille, pagesAvecRegle, pagesDeCartes, type FormatGrille } from "./cartesImprimables";
import { NIVEAUX, type Niveau } from "./categoriser";
import { cleImage, estVide, normaliserPicto, type Images, type PictoPose } from "./supportsVisuels";
import { reference } from "./references";

export const ETAPES_MIN = 2;
export const ETAPES_MAX = 6;

/** Ce que le programme attend, âge par âge. */
export const REPERES: Record<Niveau, string> = {
  PS: "Ordonner des moments vécus, et le déroulement d'actions de tous les jours dans une histoire simple : « On va à la cantine, après on va dormir. »",
  MS: "Restituer la chronologie des actions majeures d'une histoire simple — le début, ce qui se passe, la fin —, avec « au début, ensuite, pour finir ».",
  GS: "Repérer et ordonner les étapes d'un processus ou d'un évènement vécu, reconstruire la structure d'une histoire, avec « d'abord, ensuite, puis, après, enfin ».",
};

/** Combien d'étapes, à chaque âge : trois, puis quatre, puis cinq. */
export const ETAPES_CONSEILLEES: Record<Niveau, number> = { PS: 3, MS: 4, GS: 5 };

export type Forme = "colonnes" | "bande" | "affichage" | "evaluation";

export const FORMES: { id: Forme; nom: string; quoi: string }[] = [
  { id: "colonnes", nom: "La fiche en colonnes", quoi: "les images à découper à gauche, les cases où les coller à droite" },
  { id: "bande", nom: "La bande fléchée", quoi: "des cases reliées par des flèches, les images à découper dessous" },
  { id: "affichage", nom: "Les grandes images", quoi: "pour ordonner ensemble au tableau, avec les mots du temps" },
  { id: "evaluation", nom: "La grille d'observation", quoi: "l'évaluation : ordonner, raconter, avec quels mots du temps" },
];

export const nomDeLaForme = (f: Forme) => FORMES.find((x) => x.id === f)?.nom ?? "Images séquentielles";

/** Ce qui marque l'ordre près des cases. */
export type Repere = "mots" | "numeros" | "aucun";

export const REPERES_ORDRE: { id: Repere; nom: string }[] = [
  { id: "mots", nom: "les mots du temps — d'abord, ensuite…" },
  { id: "numeros", nom: "les numéros" },
  { id: "aucun", nom: "rien" },
];

export interface ReglagesSuites {
  niveau: Niveau;
  forme: Forme;
  /** « L'histoire d'un bonhomme de neige » ; vide, la consigne tient lieu de titre. */
  titre: string;
  /** Les images, dans l'ordre juste. */
  etapes: PictoPose[];
  reperes: Repere;
  /** Le mot écrit sous chaque image. */
  legendes: boolean;
}

export const REGLAGES_SUITES: ReglagesSuites = { niveau: "MS", forme: "colonnes", titre: "", etapes: [], reperes: "mots", legendes: false };

/** Les réglages enregistrés, réparés : ce qu'une version plus ancienne ou un fichier abîmé y a laissé. */
export function reglagesSurs(brut: Partial<ReglagesSuites>): ReglagesSuites {
  const d = REGLAGES_SUITES;
  return {
    niveau: NIVEAUX.some((n) => n.id === brut.niveau) ? (brut.niveau as Niveau) : d.niveau,
    forme: FORMES.some((f) => f.id === brut.forme) ? (brut.forme as Forme) : d.forme,
    titre: typeof brut.titre === "string" ? brut.titre : d.titre,
    etapes: Array.isArray(brut.etapes) ? brut.etapes.slice(0, ETAPES_MAX).map(normaliserPicto) : [],
    reperes: REPERES_ORDRE.some((x) => x.id === brut.reperes) ? (brut.reperes as Repere) : d.reperes,
    legendes: brut.legendes === true,
  };
}

/** Les étapes qui s'impriment : celles qui ont une image ou un mot, dans l'ordre juste. */
export const etapesPleines = (r: Pick<ReglagesSuites, "etapes">) => r.etapes.filter((p) => !estVide(p)).slice(0, ETAPES_MAX);

/** Ce qui empêche la feuille de se faire, ou rien : la grille, elle, se passe d'images. */
export const cequiManque = (r: ReglagesSuites) =>
  r.forme !== "evaluation" && etapesPleines(r).length < ETAPES_MIN ? "Il faut au moins deux images, dans l'ordre de l'histoire." : null;

const MOTS_DU_TEMPS: Record<Niveau, { premier: string; milieu: string[]; dernier: string }> = {
  PS: { premier: "d'abord", milieu: ["après"], dernier: "à la fin" },
  MS: { premier: "au début", milieu: ["ensuite"], dernier: "pour finir" },
  GS: { premier: "d'abord", milieu: ["ensuite", "puis", "après"], dernier: "enfin" },
};

/**
 * Les mots du temps, à l'âge des élèves, ceux que le programme donne : « d'abord…
 * après » avant 4 ans ; « au début, ensuite, pour finir » à partir de 4 ans ;
 * « d'abord, ensuite, puis, après, enfin » à partir de 5 ans.
 */
export function motsDuTemps(niveau: Niveau, n: number): string[] {
  const m = MOTS_DU_TEMPS[niveau];
  if (n <= 1) return [m.premier];
  // Deux images, avant 4 ans : « d'abord… après ».
  if (n === 2) return [m.premier, niveau === "PS" ? "après" : m.dernier];
  return [m.premier, ...Array.from({ length: n - 2 }, (_, i) => m.milieu[i % m.milieu.length]), m.dernier];
}

const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** L'ordre des images à découper : mêlé, jamais celui de l'histoire. */
export function ordreMele(n: number, alea: () => number): number[] {
  const ordre = melanger(alea, Array.from({ length: n }, (_, i) => i));
  if (n >= 2 && ordre.every((v, i) => v === i)) ordre.push(ordre.shift()!);
  return ordre;
}

// ── Des suites toutes prêtes ──────────────────────────────────────────────
//
// Des pictos de la banque ARASAAC, dans un ordre qui ne se discute pas : un
// geste de tous les jours, une recette, un cycle de vie, une histoire
// d'hiver. Les photos de la classe ou d'un album s'ajoutent de la même façon.

export interface SuiteToutePrete { id: string; libelle: string; niveaux: Niveau[]; genre: string; etapes: { id: number; mot: string }[] }

export const SUITES: SuiteToutePrete[] = [
  { id: "mains", libelle: "Se laver les mains", niveaux: ["PS", "MS"], genre: "un geste de tous les jours",
    etapes: [{ id: 11737, mot: "ouvrir le robinet" }, { id: 29210, mot: "se savonner les mains" }, { id: 8975, mot: "se rincer les mains" }, { id: 11739, mot: "fermer le robinet" }, { id: 2566, mot: "s'essuyer les mains" }] },
  { id: "dents", libelle: "Se brosser les dents", niveaux: ["PS", "MS"], genre: "un geste de tous les jours",
    etapes: [{ id: 2858, mot: "le dentifrice" }, { id: 2326, mot: "se brosser les dents" }, { id: 8560, mot: "se rincer la bouche" }] },
  { id: "journee", libelle: "Ma journée", niveaux: ["PS", "MS"], genre: "les moments de la journée",
    etapes: [{ id: 8988, mot: "se réveiller" }, { id: 4625, mot: "le petit déjeuner" }, { id: 36473, mot: "aller à l'école" }, { id: 9824, mot: "la cantine" }, { id: 4553, mot: "se coucher" }] },
  { id: "poule", libelle: "De l'œuf à la poule", niveaux: ["PS", "MS", "GS"], genre: "le cycle de vie d'un animal",
    etapes: [{ id: 2427, mot: "l'œuf" }, { id: 28409, mot: "l'œuf éclot" }, { id: 2533, mot: "le poussin" }, { id: 2403, mot: "la poule" }] },
  { id: "bonhomme", libelle: "Le bonhomme de neige", niveaux: ["MS", "GS"], genre: "une histoire d'hiver",
    etapes: [{ id: 3135, mot: "il neige" }, { id: 6627, mot: "on s'habille" }, { id: 24891, mot: "une boule de neige" }, { id: 3131, mot: "le bonhomme de neige" }] },
  { id: "graine", libelle: "Planter une graine", niveaux: ["MS", "GS"], genre: "le cycle de vie d'une plante",
    etapes: [{ id: 8689, mot: "la graine" }, { id: 2828, mot: "planter" }, { id: 2816, mot: "arroser" }, { id: 17183, mot: "la pousse" }, { id: 3102, mot: "la fleur" }] },
  { id: "papillon", libelle: "De la chenille au papillon", niveaux: ["GS"], genre: "le cycle de vie d'un animal",
    etapes: [{ id: 16727, mot: "la chenille" }, { id: 26012, mot: "la chrysalide" }, { id: 2465, mot: "le papillon" }] },
  { id: "gateau", libelle: "Faire un gâteau", niveaux: ["MS", "GS"], genre: "une recette",
    etapes: [{ id: 8600, mot: "la farine" }, { id: 7298, mot: "verser" }, { id: 5515, mot: "mélanger" }, { id: 10135, mot: "cuire au four" }, { id: 2502, mot: "le gâteau" }, { id: 2349, mot: "manger" }] },
];

export const suitesPour = (niveau: Niveau) =>
  [...SUITES.filter((s) => s.niveaux.includes(niveau)), ...SUITES.filter((s) => !s.niveaux.includes(niveau))];

// ── Les feuilles ──────────────────────────────────────────────────────────

/** Le titre, sa ligne de sous-titre, et la référence de la feuille au bout — elle ne s'imprime pas (voir `references`). */
const titre = (t: string, sous = "", ref = "") =>
  `<div class="titre">${escapeHtml(t)}</div>${sous || ref ? `<div class="sous">${escapeHtml(sous)}${ref ? ` ${reference(ref)}` : ""}</div>` : ""}`;
const consigne = (t: string, quoi = "Consigne") => `<div class="regle"><b>${quoi}</b>${escapeHtml(t)}</div>`;
const prenom = `<div class="si-prenom">Prénom : ………………………… Date : ……………</div>`;

/** Une image et, si on le veut, son mot ; sans image, le mot seul. */
function contenu(p: PictoPose, images: Images, legendes: boolean): string {
  const cle = cleImage(p);
  const src = cle !== null ? images[cle] : undefined;
  const mot = p.mot.trim();
  if (!src) return `<div class="si-mot-seul">${escapeHtml(mot || "…")}</div>`;
  return `<img src="${src}" alt="${escapeHtml(mot)}">${legendes && mot ? `<div class="si-mot">${escapeHtml(mot)}</div>` : ""}`;
}

/** Le repère d'une case : le mot du temps, le numéro, ou rien. */
const repere = (r: ReglagesSuites, mots: string[], i: number) =>
  r.reperes === "mots" ? `<div class="si-repere">${escapeHtml(majuscule(mots[i]))}</div>`
    : r.reperes === "numeros" ? `<div class="si-repere si-numero">${i + 1}</div>` : "";

/** La consigne de la fiche, à l'âge des élèves. */
function consigneDeLaFiche(r: ReglagesSuites, n: number): string {
  const mots = motsDuTemps(r.niveau, n);
  const raconte = r.niveau === "PS" ? `Dis ce qui se passe : « ${majuscule(mots[0])}…, ${mots[1]}… »`
    : `Raconte : « ${majuscule(mots.slice(0, 2).join(", "))}… ${mots[mots.length - 1]}… »`;
  return `Découpe les images, puis colle-les dans l'ordre${r.niveau === "PS" ? "" : " de l'histoire"}. ${raconte}`;
}

const entete = (r: ReglagesSuites, n: number) =>
  `${titre(r.titre.trim() || "Remets les images dans l'ordre")}${consigne(consigneDeLaFiche(r, n))}${prenom}`;

/** La fiche en colonnes : une rangée par étape, la carte à découper à gauche, la case à droite. */
export function mesuresColonnes(n: number): { rangee: number; cadre: number; carte: number } {
  const rangee = Math.min(54, Math.floor(195 / Math.max(ETAPES_MIN, n)));
  return { rangee, cadre: rangee - 3, carte: rangee - 8 };
}

/** La bande fléchée : combien de cases par rangée, leur côté, celui des cartes, et combien de cartes par rangée. */
export function mesuresBande(n: number): { parRangee: number; cadre: number; carte: number; cartesParRangee: number } {
  const rangees = Math.ceil(n / 3);
  const parRangee = Math.ceil(n / rangees);
  const cadre = n <= 2 ? 60 : n === 3 ? 46 : n === 4 ? 42 : 38;
  const carte = cadre - 5;
  return { parRangee, cadre, carte, cartesParRangee: Math.min(n, Math.floor(165 / (carte + 3))) };
}

/** La hauteur que prend la bande et ses cartes, en mm, sous le titre et la consigne : elle tient sur une page. */
export function hauteurDeLaBande(n: number): number {
  const { parRangee, cadre, carte, cartesParRangee } = mesuresBande(n);
  return Math.ceil(n / parRangee) * (8 + cadre + 6) + 12 + Math.ceil(n / cartesParRangee) * (carte + 3);
}

/** La flèche d'une case à la suivante, à mi-hauteur des cases : celle des supports « d'abord / ensuite ». */
const fleche = (cadre: number) =>
  `<svg class="si-fleche" style="margin-bottom:${((cadre - 8) / 2).toFixed(1)}mm" viewBox="0 0 60 40"><path d="M4 20H46M34 8 50 20 34 32" fill="none" stroke="#3a3a3a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function htmlColonnes(r: ReglagesSuites, etapes: PictoPose[], images: Images, ordre: number[]): string {
  const n = etapes.length;
  const { rangee, cadre, carte } = mesuresColonnes(n);
  const mots = motsDuTemps(r.niveau, n);
  const lignes = etapes.map((_, i) => {
    const p = etapes[ordre[i]];
    return `<div class="si-carte" style="width:${carte}mm;height:${carte}mm">${contenu(p, images, r.legendes)}</div>`
      + `<div class="si-cadre" style="width:${cadre}mm;height:${cadre}mm"></div>${repere(r, mots, i)}`;
  }).join("");
  return `<div class="page">${entete(r, n)}<div class="si-colonnes" style="grid-template-columns:${carte}mm 12mm ${cadre}mm 1fr;grid-auto-rows:${rangee}mm">`
    + `<div class="si-coupe" style="grid-row:1 / span ${n}"><span>✂</span></div>${lignes}</div></div>`;
}

function htmlBande(r: ReglagesSuites, etapes: PictoPose[], images: Images, ordre: number[]): string {
  const n = etapes.length;
  const { parRangee, cadre, carte, cartesParRangee } = mesuresBande(n);
  const mots = motsDuTemps(r.niveau, n);
  const rangees: string[] = [];
  for (let debut = 0; debut < n; debut += parRangee) {
    const cases = Array.from({ length: Math.min(parRangee, n - debut) }, (_, k) => {
      const i = debut + k;
      return `${k ? fleche(cadre) : ""}<div class="si-etape">${repere(r, mots, i) || `<div class="si-repere"></div>`}<div class="si-cadre" style="width:${cadre}mm;height:${cadre}mm"></div></div>`;
    });
    rangees.push(`<div class="si-rangee">${cases.join("")}</div>`);
  }
  const cartes = ordre.map((k) => `<div class="si-carte" style="width:${carte}mm;height:${carte}mm">${contenu(etapes[k], images, r.legendes)}</div>`).join("");
  return `<div class="page">${entete(r, n)}<div class="si-bande">${rangees.join("")}</div>`
    + `<div class="si-a-decouper"><span>✂ Les images à découper</span></div>`
    + `<div class="si-cartes" style="grid-template-columns:repeat(${cartesParRangee}, ${carte}mm)">${cartes}</div></div>`;
}

/** Les grandes images, deux par page, carrées ; puis les mots du temps en grand, à poser dessous. */
const GRANDES: FormatGrille = { colonnes: 1, lignes: 2, hauteurMm: 120, carre: true };
const ETIQUETTES: FormatGrille = { colonnes: 2, lignes: 6, hauteurMm: 32, largeurMm: 80 };

function htmlAffichage(r: ReglagesSuites, etapes: PictoPose[], images: Images, ordre: number[]): string {
  const n = etapes.length;
  const regle = "Au tableau, les images en désordre : on les nomme, on les décrit. On cherche ensemble par laquelle tout commence, puis la suite, "
    + "en disant pourquoi ; on vérifie avec l'album, les photos ou en refaisant l'action. Puis on raconte, les mots du temps posés sous les images.";
  const grandes = ordre.map((k) => carte(contenu(etapes[k], images, r.legendes), "si-grande"));
  const mots = motsDuTemps(r.niveau, n).map((m) => carte(`<div class="si-etiquette">${escapeHtml(majuscule(m))}</div>`, "si-carte-mot"));
  return pagesAvecRegle(grandes, GRANDES, `${titre(r.titre.trim() || "Les images à remettre dans l'ordre", "Les grandes images, à découper et à afficher.")}${consigne(regle, "Au tableau")}`)
    + pagesDeCartes(mots, ETIQUETTES, titre("Les mots du temps"));
}

/** L'ordre juste, pour le maître : les images numérotées, avec leurs mots. */
function corrige(r: ReglagesSuites, etapes: PictoPose[], images: Images): string {
  const mots = motsDuTemps(r.niveau, etapes.length);
  return `<div class="page corrige">${titre(`${r.titre.trim() || "Les images"} — l'ordre juste, pour le maître`)}<div class="si-corrige">${etapes.map((p, i) =>
    `<div class="si-corrige-etape"><div class="si-corrige-image">${contenu(p, images, false)}</div><b>${i + 1}. ${escapeHtml(majuscule(mots[i]))}</b>`
    + `${p.mot.trim() ? `<span>${escapeHtml(p.mot.trim())}</span>` : ""}</div>`).join("")}</div>`
    + `<div class="sous si-pied">On valide avec ce qui a été vécu ou lu : l'album, les photos de la classe, l'action refaite. Puis l'élève raconte, avec les mots du temps de son âge.</div></div>`;
}

/** Ce qu'on observe, d'après le programme 2025 : ordonner, puis raconter avec les mots du temps de l'âge. */
export const OBSERVABLES: Record<Niveau, string[]> = {
  PS: ["Dit ce qui se passe au début et à la fin", "Ordonne deux images, puis trois", "Emploie « d'abord », « après »", "Raconte en montrant les images"],
  MS: ["Ordonne les images de la suite", "Dit le début, ce qui se passe, la fin", "Emploie « au début, ensuite, pour finir »", "Dit pourquoi une image vient avant une autre"],
  GS: ["Ordonne les étapes, seul", "Raconte la suite en entier", "Emploie « d'abord, ensuite, puis, enfin »", "Justifie l'ordre par une cause", "Ordonne une suite nouvelle"],
};

function htmlEvaluation(r: ReglagesSuites): string {
  const age = NIVEAUX.find((x) => x.id === r.niveau)?.age ?? "";
  const colonnes = OBSERVABLES[r.niveau];
  const ligne = `<tr><td></td>${colonnes.map(() => "<td></td>").join("")}<td></td></tr>`;
  const suite = r.titre.trim() ? ` · ${r.titre.trim()}` : "";
  return `<div class="page">${titre("Grille d'observation — ordonner et raconter", `S'approprier la notion de chronologie · ${r.niveau}, ${age}${suite}.`, "Programme de l'école maternelle 2025.")}`
    + `<table class="si-grille"><thead><tr><th>Prénom</th>${colonnes.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}<th>Mots du temps entendus</th></tr></thead>`
    + `<tbody>${Array.from({ length: 12 }, () => ligne).join("")}</tbody></table>`
    + `<div class="sous si-pied">✓ réussi · ~ en cours · ✗ pas encore. Seul avec l'élève, les cartes de la suite mêlées : il les ordonne, puis raconte. `
    + `Noter les mots qu'il emploie pour dire l'ordre ; revenir sur la suite quelques semaines plus tard.</div></div>`;
}

/** La feuille choisie, avec ses images ; `alea` mêle les images à découper. */
export function htmlSuites(r: ReglagesSuites, images: Images, alea: () => number): string {
  if (r.forme === "evaluation") return feuille(htmlEvaluation(r), "si");
  const etapes = etapesPleines(r);
  const ordre = ordreMele(etapes.length, alea);
  const corps = { colonnes: htmlColonnes, bande: htmlBande, affichage: htmlAffichage }[r.forme as Exclude<Forme, "evaluation">](r, etapes, images, ordre);
  const pictos = etapes.filter((p) => !p.photo && p.id != null && images[p.id]).map((p) => p.id);
  return feuille(`${corps}${corrige(r, etapes, images)}${attributionPour(pictos)}`, "si");
}

export const STYLE_SUITES = `
  .feuille.si .si-prenom { font-size: 12px; color: #687087; margin: 0 0 4mm; }
  .feuille.si .si-carte { border: 1px dashed #9aa0b4; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 1mm; padding: 1.5mm; box-sizing: border-box; overflow: hidden; background: #fff; }
  .feuille.si .si-carte img { flex: 0 1 auto; min-height: 0; width: 100%; height: 100%; object-fit: contain; margin: 0; max-width: none; max-height: none; }
  .feuille.si .si-mot { font-size: 11px; font-weight: 700; text-align: center; line-height: 1.1; flex: none; }
  .feuille.si .si-mot-seul { font-size: 15px; font-weight: 700; text-align: center; line-height: 1.15; padding: 0 1mm; }
  .feuille.si .si-cadre { border: 0.9mm solid #3a3a3a; border-radius: 4mm; position: relative; box-sizing: border-box; background: #fff; flex: none; }
  .feuille.si .si-cadre::after { content: ""; position: absolute; inset: 2mm; border: 0.35mm dashed #c4c9d6; border-radius: 2.5mm; }
  .feuille.si .si-repere { font-size: 15px; font-weight: 800; color: #1c2233; }
  .feuille.si .si-numero { font-size: 26px; }
  .feuille.si .si-colonnes { display: grid; align-items: center; row-gap: 0; column-gap: 0; }
  .feuille.si .si-colonnes .si-carte { grid-column: 1; }
  .feuille.si .si-colonnes .si-cadre { grid-column: 3; }
  .feuille.si .si-colonnes .si-repere { grid-column: 4; padding-left: 4mm; }
  .feuille.si .si-coupe { grid-column: 2; align-self: stretch; position: relative; }
  .feuille.si .si-coupe::before { content: ""; position: absolute; left: 50%; top: 0; bottom: 0; border-left: 1.5px dashed #9aa0b4; }
  .feuille.si .si-coupe span { position: absolute; left: 50%; top: -1mm; transform: translateX(-50%); background: #fff; font-size: 14px; line-height: 1; }
  .feuille.si .si-bande { display: flex; flex-direction: column; gap: 6mm; margin: 2mm 0 0; }
  .feuille.si .si-rangee { display: flex; align-items: flex-end; justify-content: center; gap: 0; }
  .feuille.si .si-etape { display: flex; flex-direction: column; align-items: center; gap: 1.5mm; }
  .feuille.si .si-etape .si-repere { min-height: 6.5mm; }
  .feuille.si .si-fleche { width: 12mm; height: 8mm; flex: none; }
  .feuille.si .si-a-decouper { border-top: 1.5px dashed #9aa0b4; margin: 7mm 0 4mm; position: relative; height: 0; }
  .feuille.si .si-a-decouper span { position: absolute; left: 0; top: -2.2mm; background: #fff; padding-right: 2mm; font-size: 11px; color: #687087; }
  .feuille.si .si-cartes { display: grid; gap: 3mm; justify-content: center; }
  .feuille.si .si-grande { padding: 6mm; }
  .feuille.si .si-grande img { width: 100%; height: 100%; max-width: none; max-height: none; object-fit: contain; margin: 0; }
  .feuille.si .si-grande .si-mot { font-size: 22px; }
  .feuille.si .si-grande .si-mot-seul { font-size: 30px; }
  .feuille.si .si-etiquette { font-size: 30px; font-weight: 800; }
  .feuille.si .si-corrige { display: flex; flex-wrap: wrap; gap: 5mm; margin: 2mm 0 5mm; }
  .feuille.si .si-corrige-etape { width: 36mm; display: flex; flex-direction: column; align-items: center; gap: 1mm; font-size: 11px; text-align: center; }
  .feuille.si .si-corrige-image { width: 30mm; height: 30mm; display: flex; align-items: center; justify-content: center; border: 1px solid #cfd4e2; border-radius: 2mm; }
  .feuille.si .si-corrige-image img { width: 100%; height: 100%; object-fit: contain; margin: 0; max-height: none; }
  .feuille.si .si-corrige-image .si-mot-seul { font-size: 11px; }
  .feuille.si .si-pied { margin-top: 2mm; }
  .feuille.si .si-grille { width: 100%; border-collapse: collapse; font-size: 11px; }
  .feuille.si .si-grille th, .feuille.si .si-grille td { border: 1px solid #9aa0b4; padding: 1.5mm; vertical-align: top; }
  .feuille.si .si-grille th { background: #f2f4f8; text-align: left; }
  .feuille.si .si-grille td { height: 11mm; }
  .feuille.si .si-grille th:first-child { width: 28mm; }
`;
