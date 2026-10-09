// ── Le plan de la classe, pour la géographie ──────────────────────────────
//
// La séquence Éduscol « La classe, un espace organisé qui se représente »
// (CP, 2016) mène les élèves de la photographie au plan : dessiner la
// classe, la représenter en maquette, regarder la maquette vue de dessus,
// faire le plan avec des formes collées, puis lire le plan — la chasse au
// trésor, « Où est Charlie ? », l'évaluation. Cet atelier en fabrique les
// feuilles.
//
// Le plan vient du plan de salle de l'application : le mobilier que
// l'enseignant y a placé, vu de dessus, avec les noms qu'il lui a donnés.
// La feuille en garde une copie, pour se refaire telle qu'elle était. Sans
// plan de salle, une classe d'exemple.

import { escapeHtml } from "./print";
import { reference } from "./references";
import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";

const esc = escapeHtml;

export type TypeElem = "place" | "table" | "bureau" | "tapis" | "meuble" | "mur" | "porte" | "fenetre";
export interface ElemSalle { id: string; type: TypeElem; x: number; y: number; w: number; h: number; label: string }
export interface Profil { id: string; nom: string; elements: ElemSalle[] }

/** La salle du plan de salle : une toile de 900 sur 560. */
export const LARGEUR_SALLE = 900;
export const HAUTEUR_SALLE = 560;

const TYPES: TypeElem[] = ["place", "table", "bureau", "tapis", "meuble", "mur", "porte", "fenetre"];
const nombre = (v: unknown, defaut = 0) => (typeof v === "number" && Number.isFinite(v) ? v : defaut);

/** Un élément de salle tel qu'on peut s'y fier. */
function elementSur(v: unknown): ElemSalle | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (!TYPES.includes(o.type as TypeElem)) return null;
  return {
    id: typeof o.id === "string" ? o.id : "", type: o.type as TypeElem,
    x: nombre(o.x), y: nombre(o.y), w: Math.max(4, nombre(o.w, 40)), h: Math.max(4, nombre(o.h, 40)),
    label: typeof o.label === "string" ? o.label.slice(0, 40) : "",
  };
}

export const elementsSurs = (v: unknown): ElemSalle[] =>
  (Array.isArray(v) ? v.map(elementSur).filter((e): e is ElemSalle => e !== null).slice(0, 200) : []);

/** Les agencements du plan de salle (réglage « salle:profils »). */
export function lireProfils(brut: string | null | undefined): Profil[] {
  try {
    const lu = JSON.parse(brut || "[]");
    if (!Array.isArray(lu)) return [];
    return lu
      .filter((p) => p && typeof p === "object")
      .map((p) => ({ id: String(p.id ?? ""), nom: String(p.nom ?? "Agencement"), elements: elementsSurs(p.elements) }))
      .filter((p) => p.elements.length > 0);
  } catch {
    return [];
  }
}

/** Une classe d'exemple, quand le plan de salle est vide : des tables en rangs, le bureau, le tableau, une étagère, le coin regroupement. */
export const CLASSE_EXEMPLE: ElemSalle[] = [
  { id: "ex-tableau", type: "meuble", x: 300, y: 4, w: 300, h: 18, label: "Tableau" },
  { id: "ex-bureau", type: "bureau", x: 375, y: 50, w: 150, h: 60, label: "Bureau" },
  { id: "ex-porte", type: "porte", x: 40, y: 0, w: 70, h: 14, label: "Porte" },
  { id: "ex-fenetre-1", type: "fenetre", x: 886, y: 120, w: 14, h: 140, label: "Fenêtre" },
  { id: "ex-fenetre-2", type: "fenetre", x: 886, y: 330, w: 14, h: 140, label: "Fenêtre" },
  { id: "ex-etagere", type: "meuble", x: 0, y: 180, w: 40, h: 200, label: "Étagère" },
  { id: "ex-tapis", type: "tapis", x: 650, y: 400, w: 220, h: 140, label: "Coin regroupement" },
  ...[0, 1, 2].flatMap((r) => [0, 1].map((c) => ({
    id: `ex-table-${r}-${c}`, type: "table" as const, x: 140 + c * 230, y: 170 + r * 120, w: 170, h: 60, label: `Table ${r * 2 + c + 1}`,
  }))),
  ...[0, 1, 2].flatMap((r) => [0, 1].flatMap((c) => [0, 1].map((k) => ({
    id: `ex-place-${r}-${c}-${k}`, type: "place" as const, x: 155 + c * 230 + k * 85, y: 232 + r * 120, w: 55, h: 40, label: "",
  })))),
];

/** Les couleurs du plan, par sorte d'élément : le code de la légende. */
export const COULEURS: Record<TypeElem, { fond: string; trait: string; nom: string }> = {
  place: { fond: "#ffd8a8", trait: "#c77d2e", nom: "les places" },
  table: { fond: "#d9b48f", trait: "#8a5a2b", nom: "les tables" },
  bureau: { fond: "#f4a7a7", trait: "#b03a3a", nom: "le bureau" },
  tapis: { fond: "#bfe3c4", trait: "#3d8b4f", nom: "le coin regroupement" },
  meuble: { fond: "#b9d3f0", trait: "#2f5f97", nom: "les meubles" },
  mur: { fond: "#1c2233", trait: "#1c2233", nom: "les murs" },
  porte: { fond: "#8a5a2b", trait: "#8a5a2b", nom: "la porte" },
  fenetre: { fond: "#7cb7e8", trait: "#2f6fa8", nom: "les fenêtres" },
};

/** Le nom d'un élément : celui que l'enseignant lui a donné, sinon celui de sa sorte. */
const NOMS: Record<TypeElem, string> = {
  place: "Place", table: "Table", bureau: "Bureau", tapis: "Coin regroupement", meuble: "Meuble", mur: "Mur", porte: "Porte", fenetre: "Fenêtre",
};
export const nomDe = (e: ElemSalle) => e.label.trim() || NOMS[e.type];

/** Ce qui structure la pièce, et ce qu'on y range ou ce qui l'occupe. */
const STRUCTURE: TypeElem[] = ["mur", "porte", "fenetre"];
export const estDuMobilier = (e: ElemSalle) => !STRUCTURE.includes(e.type);

// ── Les réglages ──────────────────────────────────────────────────────────

export type FeuillePlan = "plan" | "evaluation" | "tresor" | "symbolique" | "etiquettes";
export const FEUILLES_PLAN: { id: FeuillePlan; nom: string; quoi: string }[] = [
  { id: "plan", nom: "Le plan", quoi: "Le plan de la classe vu de dessus, avec ou sans les noms, en couleurs avec sa légende : pour se repérer, jouer à « Où est Charlie ? »." },
  { id: "tresor", nom: "La chasse au trésor", quoi: "Le plan avec les cachettes numérotées, et les étiquettes-mots de la phrase mystère à cacher." },
  { id: "evaluation", nom: "L'évaluation", quoi: "Le plan et la fiche de consignes : colorier, dessiner, écrire, tracer un chemin." },
  { id: "symbolique", nom: "Le plan à coller", quoi: "Le contour de la classe, et les formes du mobilier à découper et à coller : passer de la maquette au plan, avec sa légende." },
  { id: "etiquettes", nom: "Les étiquettes", quoi: "Les prénoms et les objets à poser sur les maquettes, pour les jeux de repérage." },
];

export interface ReglagesPlanClasse {
  feuille: FeuillePlan;
  /** Le mobilier, copié du plan de salle : la feuille se refait telle qu'elle était. Vide : la classe d'exemple. */
  elements: ElemSalle[];
  /** L'agencement d'où vient le mobilier. */
  agencement: string;
  /** Les noms sur le plan. */
  noms: boolean;
  /** Le code couleur, et sa légende. */
  couleurs: boolean;
  /** La phrase mystère de la chasse au trésor : un mot par cachette, dix au plus. */
  phrase: string;
  /** Les consignes de l'évaluation, une par ligne ; vides, celles que le mobilier dicte. */
  consignes: string;
  /** Les prénoms à poser sur les maquettes. */
  prenoms: string[];
  /** Les objets à poser sur les maquettes. */
  objets: string[];
}

export const PHRASE_PAR_DEFAUT = "Bravo, vous avez trouvé tous les mots de notre phrase !";
export const MOTS_MAX = 10;

export const REGLAGES_PLAN_CLASSE: ReglagesPlanClasse = {
  feuille: "plan", elements: [], agencement: "", noms: true, couleurs: true, phrase: PHRASE_PAR_DEFAUT, consignes: "",
  prenoms: [], objets: ["livre", "fleur", "trousse", "ciseaux", "cahier", "poubelle"],
};

export function reglagesPlanSurs(brut: unknown): ReglagesPlanClasse {
  const o = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;
  const d = REGLAGES_PLAN_CLASSE;
  const liste = (v: unknown, defaut: string[], max: number) =>
    (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.slice(0, 40)).slice(0, max) : defaut);
  return {
    feuille: FEUILLES_PLAN.some((f) => f.id === o.feuille) ? (o.feuille as FeuillePlan) : d.feuille,
    elements: elementsSurs(o.elements),
    agencement: typeof o.agencement === "string" ? o.agencement.slice(0, 60) : "",
    noms: typeof o.noms === "boolean" ? o.noms : d.noms,
    couleurs: typeof o.couleurs === "boolean" ? o.couleurs : d.couleurs,
    phrase: typeof o.phrase === "string" ? o.phrase.slice(0, 200) : d.phrase,
    consignes: typeof o.consignes === "string" ? o.consignes.slice(0, 1500) : d.consignes,
    prenoms: liste(o.prenoms, d.prenoms, 40),
    objets: liste(o.objets, d.objets, 12),
  };
}

/** Le mobilier du plan : celui de la feuille, sinon la classe d'exemple. */
export const mobilierDe = (r: Pick<ReglagesPlanClasse, "elements">) => (r.elements.length ? r.elements : CLASSE_EXEMPLE);

/** Les mots de la phrase mystère, un par cachette. */
export const motsDeLaPhrase = (phrase: string) => phrase.split(/\s+/).map((m) => m.trim()).filter(Boolean)
  // Une ponctuation seule rejoint le mot d'avant : « phrase ! ».
  .reduce<string[]>((acc, m) => (/^[!?;:.,»]+$/.test(m) && acc.length ? [...acc.slice(0, -1), `${acc[acc.length - 1]} ${m}`] : [...acc, m]), [])
  .slice(0, MOTS_MAX);

/**
 * Les cachettes de la chasse au trésor : un élément du mobilier par mot,
 * tiré au sort — toujours les mêmes pour une même graine. S'il y a moins
 * d'éléments que de mots, une cachette en garde plusieurs.
 */
export function cachettesDe(elements: ElemSalle[], mots: number, graine: number): ElemSalle[] {
  const eligibles = elements.filter(estDuMobilier);
  if (!eligibles.length || mots <= 0) return [];
  const melanges = melanger(hasard(graine), eligibles);
  return Array.from({ length: mots }, (_, i) => melanges[i % melanges.length]);
}

// ── Le plan ───────────────────────────────────────────────────────────────

interface OptionsPlan { noms: boolean; couleurs: boolean; largeurMm?: number; cachettes?: ElemSalle[]; seulementLesMurs?: boolean }

/** Le plan vu de dessus : les murs, puis chaque élément, à sa place. */
export function planSvg(elements: ElemSalle[], o: OptionsPlan): string {
  const largeur = o.largeurMm ?? 178;
  const corps = elements
    .filter((e) => !o.seulementLesMurs || STRUCTURE.includes(e.type))
    .map((e) => {
      const c = COULEURS[e.type];
      const fond = o.couleurs || STRUCTURE.includes(e.type) ? c.fond : "#fff";
      const trait = o.couleurs ? c.trait : "#1c2233";
      // Un meuble haut et étroit, contre un mur, porte son nom à la verticale.
      const debout = e.h > e.w * 1.5;
      const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
      const nom = o.noms && e.type !== "place" && e.type !== "mur"
        ? `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="${Math.min(15, Math.max(9, (debout ? e.w : e.h) * 0.45))}"`
          + `${debout ? ` transform="rotate(-90 ${cx} ${cy})"` : ""} font-family="Helvetica, Arial, sans-serif" fill="#1c2233">${esc(nomDe(e))}</text>` : "";
      return `<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" rx="${e.type === "tapis" ? 10 : 3}" fill="${fond}" stroke="${trait}" stroke-width="2"/>${nom}`;
    }).join("");
  const reperes = (o.cachettes ?? []).map((e, i) => {
    // Plusieurs mots dans la même cachette : leurs numéros se suivent, côte à côte.
    const rang = (o.cachettes ?? []).slice(0, i).filter((x) => x.id === e.id).length;
    // Dans le coin du meuble : son nom reste lisible.
    const cx = e.x + Math.min(16, e.w / 2) + rang * 30, cy = e.y + Math.min(16, e.h / 2);
    return `<circle cx="${cx}" cy="${cy}" r="14" fill="#fff" stroke="#b03a3a" stroke-width="3"/>`
      + `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="15" font-weight="700" font-family="Helvetica, Arial, sans-serif" fill="#b03a3a">${i + 1}</text>`;
  }).join("");
  // Toute la largeur de la page, sans la dépasser : l'aperçu, plus étroit, la montre en entier.
  return `<svg class="pc-plan" viewBox="-8 -8 ${LARGEUR_SALLE + 16} ${HAUTEUR_SALLE + 16}" style="width:100%;max-width:${largeur}mm;height:auto">`
    + `<rect x="0" y="0" width="${LARGEUR_SALLE}" height="${HAUTEUR_SALLE}" fill="#fff" stroke="#1c2233" stroke-width="6"/>${corps}${reperes}</svg>`;
}

/** La légende du code couleur : les sortes d'éléments qu'il y a sur le plan. */
function legende(elements: ElemSalle[]): string {
  const presents = TYPES.filter((t) => t !== "mur" && elements.some((e) => e.type === t));
  return `<div class="pc-legende"><b>Légende</b>${presents.map((t) =>
    `<span><i style="background:${COULEURS[t].fond};border-color:${COULEURS[t].trait}"></i>${esc(COULEURS[t].nom)}</span>`).join("")}</div>`;
}

/** Les éléments du mobilier qui ont un nom à eux, sans doublon : ceux que les consignes peuvent désigner. */
function nommes(elements: ElemSalle[]): ElemSalle[] {
  const vus = new Set<string>();
  const ordre: TypeElem[] = ["bureau", "meuble", "tapis", "table"];
  return ordre.flatMap((t) => elements.filter((e) => e.type === t)).filter((e) => {
    const n = nomDe(e).toLowerCase();
    if (vus.has(n)) return false;
    vus.add(n);
    return true;
  });
}

/**
 * Les consignes de l'évaluation, quand l'enseignant n'a pas écrit les siennes :
 * colorier, dessiner, écrire, tracer un chemin, avec les noms du mobilier.
 */
export function consignesAuto(elements: ElemSalle[]): string {
  const n = nommes(elements);
  const couleurs = ["vert", "jaune", "rouge", "bleu"];
  const bureau = n.find((e) => e.type === "bureau");
  const meuble = n.find((e) => e.type === "meuble" && e !== bureau) ?? n.find((e) => e !== bureau);
  const lignes = [
    "1. Colorie :",
    "- en orange ta place ;",
    ...n.slice(0, 4).map((e, i) => `- en ${couleurs[i]} : ${nomDe(e)}${i === Math.min(4, n.length) - 1 ? "." : " ;"}`),
    "2. Dessine :",
    ...(meuble ? [`- un livre sur : ${nomDe(meuble)}${bureau ? " ;" : "."}`] : []),
    ...(bureau ? [`- une fleur sur : ${nomDe(bureau)}.`] : []),
    "3. Écris :",
    "- ton prénom sur ta place.",
    "4. Trace le chemin :",
    `Tu entres par la porte.${bureau ? ` Tu vas jusqu'à : ${nomDe(bureau)}.` : ""}${meuble ? ` Puis tu passes près de : ${nomDe(meuble)}.` : ""} Enfin, tu vas t'asseoir à ta place.`,
  ];
  return lignes.join("\n");
}

/** Les consignes en HTML : un titre par ligne qui commence par un numéro, une puce par tiret. */
function consignesHtml(texte: string): string {
  return `<div class="pc-consignes">${texte.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
    if (/^\d+[./)]/.test(l)) return `<div class="pc-consigne-titre">${esc(l)}</div>`;
    if (/^[-–•]/.test(l)) return `<div class="pc-consigne-puce">${esc(l.replace(/^[-–•]\s*/, ""))}</div>`;
    return `<div class="pc-consigne-texte">${esc(l)}</div>`;
  }).join("")}</div>`;
}

const SOURCE = "Éduscol, ressources 2016 — Questionner le monde, cycle 2 : « La classe, un espace organisé qui se représente », séquence au CP (séances 2, 5, 6 et 7).";
const prenomDate = `<div class="sous">Prénom : ………………………… Date : ……………</div>`;
const titre = (t: string) => `<div class="titre">${esc(t)} ${reference(SOURCE)}</div>`;

/**
 * La feuille. `images` porte les images des objets à poser sur les maquettes,
 * par mot ; sans elles, l'étiquette n'a que le mot.
 */
export function htmlPlanClasse(r: ReglagesPlanClasse, graine: number, images: Record<string, string> = {}): string {
  const elements = mobilierDe(r);
  const sous = r.agencement ? `<div class="sous">Notre classe — ${esc(r.agencement)}</div>` : "";
  if (r.feuille === "evaluation") {
    return feuille(`<div class="page">${titre("Je lis le plan de la classe")}${prenomDate}`
      + `<div class="pc-plan-bloc">${planSvg(elements, { noms: r.noms, couleurs: r.couleurs })}</div>`
      + `${r.couleurs ? legende(elements) : ""}${consignesHtml(r.consignes.trim() || consignesAuto(elements))}</div>`, "pc");
  }
  if (r.feuille === "tresor") {
    const mots = motsDeLaPhrase(r.phrase);
    const cachettes = cachettesDe(elements, mots.length, graine);
    const etiquettes = mots.map((m, i) => `<div class="pc-etiquette"><span class="pc-num">${i + 1}</span>${esc(m)}</div>`).join("");
    return feuille(`<div class="page">${titre("La chasse au trésor")}`
      + `<div class="sous">Des messages sont cachés dans la classe : le plan dit où. Retrouve-les, puis remets les mots dans l'ordre.</div>`
      + `<div class="pc-plan-bloc">${planSvg(elements, { noms: r.noms, couleurs: r.couleurs, cachettes })}</div>${r.couleurs ? legende(elements) : ""}</div>`
      + `<div class="page"><div class="titre">Les étiquettes à cacher</div>`
      + `<div class="sous">Un mot par cachette : le numéro de l'étiquette est celui de la cachette sur le plan.</div>`
      + `<div class="pc-etiquettes">${etiquettes}</div></div>`, "pc");
  }
  if (r.feuille === "symbolique") {
    const pieces = elements.filter(estDuMobilier).map((e) => {
      const c = COULEURS[e.type];
      const l = (e.w / LARGEUR_SALLE) * 178, h = (e.h / LARGEUR_SALLE) * 178;
      return `<div class="pc-piece" style="width:${l.toFixed(1)}mm;height:${h.toFixed(1)}mm;background:${r.couleurs ? c.fond : "#fff"};border-color:${r.couleurs ? c.trait : "#1c2233"}">`
        + `${r.noms && e.type !== "place" ? `<span>${esc(nomDe(e))}</span>` : ""}</div>`;
    }).join("");
    return feuille(`<div class="page">${titre("Je fais le plan de la classe")}${prenomDate}`
      + `<div class="sous">Je découpe les formes, je les colle à leur place dans la classe vue de dessus, puis je complète la légende.</div>`
      + `<div class="pc-plan-bloc">${planSvg(elements, { noms: false, couleurs: true, seulementLesMurs: true })}</div>`
      + `<div class="pc-legende-vide"><b>Ma légende</b>${Array.from({ length: 5 }, () => `<span><i></i><em></em></span>`).join("")}</div></div>`
      + `<div class="page"><div class="titre">Les formes à découper</div><div class="pc-pieces">${pieces}</div></div>`, "pc");
  }
  if (r.feuille === "etiquettes") {
    const prenoms = r.prenoms.map((p) => p.trim()).filter(Boolean);
    const objets = r.objets.map((o) => o.trim()).filter(Boolean);
    return feuille(`<div class="page">${titre("Les étiquettes pour les maquettes")}`
      + `<div class="sous">Chacun pose son prénom sur sa place, dans chaque maquette ; les objets servent aux jeux de repérage : « Pose ce livre sur la table de… ».</div>`
      + (prenoms.length ? `<div class="pc-etiquettes petites">${prenoms.map((p) => `<div class="pc-etiquette">${esc(p)}</div>`).join("")}</div>` : "")
      + (objets.length ? `<div class="pc-objets">${objets.map((o) => {
        const src = images[o.toLowerCase()];
        return `<div class="pc-objet">${src ? `<img src="${src}" alt="">` : ""}<span>${esc(o)}</span></div>`;
      }).join("")}</div>` : "") + `</div>`, "pc");
  }
  return feuille(`<div class="page">${titre("Le plan de la classe")}${sous}`
    + `<div class="pc-plan-bloc">${planSvg(elements, { noms: r.noms, couleurs: r.couleurs })}</div>${r.couleurs ? legende(elements) : ""}</div>`, "pc");
}

export const STYLE_PLAN_CLASSE = `
  .feuille.pc .pc-plan-bloc { margin: 3mm 0; text-align: center; }
  .feuille.pc .pc-legende { display: flex; flex-wrap: wrap; gap: 2mm 5mm; align-items: center; font-size: 12px; margin: 2mm 0 4mm; }
  .feuille.pc .pc-legende i, .feuille.pc .pc-legende-vide i { display: inline-block; width: 8mm; height: 4.5mm; border: 1.5px solid #1c2233; border-radius: 1mm; vertical-align: -1mm; margin-right: 1.5mm; }
  .feuille.pc .pc-legende-vide { border: 1.5px solid #cfd4e2; border-radius: 3mm; padding: 3mm 4mm; margin-top: 3mm; font-size: 12px; }
  .feuille.pc .pc-legende-vide span { display: flex; align-items: center; gap: 3mm; margin-top: 3mm; }
  .feuille.pc .pc-legende-vide em { flex: 1; border-bottom: 1px solid #aab1c2; height: 5mm; }
  .feuille.pc .pc-consignes { font-size: 14px; line-height: 1.55; }
  .feuille.pc .pc-consigne-titre { font-weight: 800; margin-top: 2.5mm; }
  .feuille.pc .pc-consigne-puce { padding-left: 6mm; position: relative; }
  .feuille.pc .pc-consigne-puce::before { content: "•"; position: absolute; left: 2mm; }
  .feuille.pc .pc-etiquettes { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0; }
  .feuille.pc .pc-etiquettes.petites { grid-template-columns: repeat(4, 1fr); margin-bottom: 5mm; }
  .feuille.pc .pc-etiquette { position: relative; border: 1px dashed #9aa0b4; display: flex; align-items: center; justify-content: center;
    height: 30mm; font-size: 26px; font-weight: 800; text-align: center; padding: 2mm; }
  .feuille.pc .pc-etiquettes.petites .pc-etiquette { height: 14mm; font-size: 16px; }
  .feuille.pc .pc-num { position: absolute; top: 2mm; left: 2.5mm; font-size: 11px; font-weight: 700; color: #b03a3a; border: 1.5px solid #b03a3a;
    border-radius: 50%; width: 6mm; height: 6mm; display: flex; align-items: center; justify-content: center; }
  .feuille.pc .pc-objets { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; }
  .feuille.pc .pc-objet { border: 1px dashed #9aa0b4; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.5mm;
    height: 32mm; font-weight: 700; font-size: 14px; }
  .feuille.pc .pc-objet img { width: 20mm; height: 20mm; object-fit: contain; margin: 0; max-height: none; }
  .feuille.pc .pc-pieces { display: flex; flex-wrap: wrap; gap: 4mm; align-items: flex-start; }
  .feuille.pc .pc-piece { border: 1.5px solid #1c2233; display: flex; align-items: center; justify-content: center; font-size: 8px; text-align: center; overflow: hidden; }
`;
