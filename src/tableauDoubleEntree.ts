// ── Le tableau à double entrée, son atelier à lui ─────────────────────────
//
// Demande de l'enseignant (2026-11-01) : « un générateur pour ça, distinct
// de la séquence » — le tableau des formes et des couleurs n'était qu'un
// exercice de l'atelier « Données ». Une ligne par forme — ou par image de la
// banque —, une colonne par couleur : chaque case, la forme de sa ligne, de la
// couleur de sa colonne. Quelques cases faites au hasard, ou la première
// ligne, ou la première colonne, en modèle ; l'élève dessine les autres, ou
// colle les gommettes qu'il découpe sur la deuxième page. Le corrigé suit.
//
// Puis (le même jour) : « il faut qu'il puisse y avoir plus de couleurs » —
// jusqu'à neuf colonnes, la feuille passant à l'italienne au-delà de cinq —,
// et « des coloriages noir et blanc dans les images » : en lignes d'images,
// le dessin en noir et blanc (voir coloriages.ts) dans la tête et dans chaque
// case, que l'élève colorie de la couleur de sa colonne.
//
// Le programme de mathématiques du CP (2024) : « Construire et compléter un
// tableau à double entrée » ; il permet de représenter tous les couples de
// deux critères, « par exemple la forme et la couleur ».

import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";
import { escapeHtml } from "./print";

export const FORMES_DU_TABLEAU = ["cercle", "carré", "triangle", "rectangle", "losange", "étoile", "cœur"] as const;
export type FormeDuTableau = (typeof FORMES_DU_TABLEAU)[number];

export const COULEURS_DU_TABLEAU: { nom: string; hex: string }[] = [
  { nom: "bleu", hex: "#4a86e8" }, { nom: "vert", hex: "#38a169" }, { nom: "jaune", hex: "#f2c94c" }, { nom: "violet", hex: "#8e44ad" },
  { nom: "rouge", hex: "#e05252" }, { nom: "orange", hex: "#f2994a" }, { nom: "rose", hex: "#f48fb1" }, { nom: "marron", hex: "#8d6e63" },
  { nom: "noir", hex: "#1c2233" },
];
export const couleurDuTableau = (nom: string) => COULEURS_DU_TABLEAU.find((c) => c.nom === nom);

const NOIR = "#1c2233";
const n2 = (v: number) => String(Math.round(v * 100) / 100);

/** L'étoile à cinq branches, dans un carré de 20. */
const ETOILE = Array.from({ length: 10 }, (_, i) => {
  const r = i % 2 ? 3.4 : 8, a = -Math.PI / 2 + (i * Math.PI) / 5;
  return `${n2(10 + r * Math.cos(a))} ${n2(10.6 + r * Math.sin(a))}`;
}).join(" L");

/** Le tracé d'une forme dans un carré de 20 sur 20, remplie de `fond` ; le dé à fabriquer s'en sert aussi. */
export function traceDeLaForme(forme: FormeDuTableau, fond: string, trait = 0.6): string {
  const s = `fill="${fond}" stroke="${NOIR}" stroke-width="${trait}" stroke-linejoin="round"`;
  switch (forme) {
    case "cercle": return `<circle cx="10" cy="10" r="7" ${s}/>`;
    case "carré": return `<rect x="3.5" y="3.5" width="13" height="13" ${s}/>`;
    case "triangle": return `<path d="M10 3 L17 16.5 L3 16.5 Z" ${s}/>`;
    case "rectangle": return `<rect x="2" y="6" width="16" height="8" ${s}/>`;
    case "losange": return `<path d="M10 2.5 L16.5 10 L10 17.5 L3.5 10 Z" ${s}/>`;
    case "étoile": return `<path d="M${ETOILE} Z" ${s}/>`;
    case "cœur": return `<path d="M10 16.5 C4 12.5 2.2 9.2 4.4 6 C6.3 3.4 9 4 10 6.2 C11 4 13.7 3.4 15.6 6 C17.8 9.2 16 12.5 10 16.5 Z" ${s}/>`;
  }
}
const forme = (f: FormeDuTableau, fond: string, taille = 14) =>
  `<svg viewBox="0 0 20 20" width="${taille}mm" height="${taille}mm">${traceDeLaForme(f, fond)}</svg>`;

export interface ReglagesTableau {
  /** Le titre de la feuille ; vide, celui de ses lignes. */
  titre: string;
  /** Ce que portent les lignes : des formes, ou les images d'une liste de mots. */
  lignes: "formes" | "images";
  formes: FormeDuTableau[];
  /** Les couleurs des colonnes, par leur nom. */
  couleurs: string[];
  /** Les cases déjà faites : quelques-unes au hasard, la première ligne ou la première colonne en modèle, ou aucune. */
  faites: "hasard" | "ligne" | "colonne" | "aucune";
  /** Combien, au hasard. */
  combien: number;
  /** Ce que fait l'élève : dessiner dans les cases vides, ou y coller les gommettes qu'il découpe. */
  tache: "dessiner" | "coller";
  /** Le nom de la forme, de l'image et de la couleur, écrit dans les têtes. */
  motsEcrits: boolean;
  /** Pour l'enseignant, la case où noter le niveau d'aide (une évaluation). */
  niveauDAide: boolean;
  /** Des lignes d'images en coloriage : le dessin noir et blanc dans chaque case, à colorier. */
  coloriage: boolean;
}

export const REGLAGES_TABLEAU: ReglagesTableau = {
  titre: "", lignes: "formes", formes: ["cercle", "carré", "triangle"], couleurs: ["bleu", "vert", "jaune", "violet"],
  faites: "hasard", combien: 3, tache: "dessiner", motsEcrits: true, niveauDAide: false, coloriage: false,
};

/** De deux à cinq lignes : au-delà, elles ne tiennent plus sur la page. */
export const MAX_DU_TABLEAU = 5;
/** De deux à neuf colonnes, toutes les couleurs ; au-delà de cinq, la feuille passe à l'italienne. */
export const MAX_COULEURS_DU_TABLEAU = COULEURS_DU_TABLEAU.length;
const COLONNES_EN_PORTRAIT = 5;

/** Des réglages lus de la mémoire, sans leur faire confiance. */
export function reglagesTableauSurs(brut: Partial<ReglagesTableau> | null | undefined): ReglagesTableau {
  const b = brut ?? {};
  const formes = [...new Set((Array.isArray(b.formes) ? b.formes : []).filter((f): f is FormeDuTableau => FORMES_DU_TABLEAU.includes(f as FormeDuTableau)))];
  const couleurs = [...new Set((Array.isArray(b.couleurs) ? b.couleurs : []).filter((c) => !!couleurDuTableau(c)))];
  return {
    titre: typeof b.titre === "string" ? b.titre : "",
    lignes: b.lignes === "images" ? "images" : "formes",
    formes: formes.length >= 2 ? formes.slice(0, MAX_DU_TABLEAU) : REGLAGES_TABLEAU.formes,
    couleurs: couleurs.length >= 2 ? couleurs.slice(0, MAX_COULEURS_DU_TABLEAU) : REGLAGES_TABLEAU.couleurs,
    faites: b.faites === "ligne" || b.faites === "colonne" || b.faites === "aucune" ? b.faites : "hasard",
    combien: Math.max(1, Math.min(8, typeof b.combien === "number" && Number.isFinite(b.combien) ? Math.round(b.combien) : 3)),
    tache: b.tache === "coller" ? "coller" : "dessiner",
    motsEcrits: b.motsEcrits !== false,
    niveauDAide: b.niveauDAide === true,
    coloriage: b.coloriage === true,
  };
}

/**
 * Une image de la banque, pour une ligne : son mot, sa source prête à
 * imprimer ; son dessin noir et blanc, pour le coloriage ; et l'image
 * recoloriée de chaque couleur (par son code, « #e05252 »), pour les cases
 * faites et le corrigé.
 */
export interface ImageDeLigne { mot: string; src: string; coloriage?: string; colorie?: Record<string, string> }

/** Les niveaux d'aide qu'on note, du plus autonome au plus guidé (les mêmes qu'à la séquence). */
const NIVEAUX_D_AIDE = ["seul, sans support", "avec la ligne modèle", "avec les gommettes de départ", "avec un geste de l'adulte", "avec la main de l'adulte"];

/** Le titre de la feuille : celui qu'on a écrit, sinon celui de ses lignes. */
export const titreTableau = (r: Pick<ReglagesTableau, "titre" | "lignes">, avecImages = r.lignes === "images") =>
  r.titre.trim() || (avecImages ? "Le tableau des images et des couleurs" : "Le tableau des formes et des couleurs");

/**
 * La feuille : le tableau, ses cases faites ; la planche des gommettes à
 * découper quand l'élève colle ; le corrigé. Des lignes en images ne valent
 * qu'à partir de deux images : sinon, les formes. Au-delà de cinq couleurs,
 * la feuille passe à l'italienne, et les cases se resserrent pour tenir.
 */
export function htmlTableau(brut: Partial<ReglagesTableau>, images: ImageDeLigne[], graine: number): string {
  const r = reglagesTableauSurs(brut);
  const alea = hasard(graine);
  const enImages = r.lignes === "images" && images.length >= 2;
  const choisies = images.slice(0, MAX_DU_TABLEAU);
  // En coloriage : le dessin noir et blanc dans les têtes et dans les cases à colorier ; colorié dans les cases faites.
  const enColoriage = enImages && r.coloriage && choisies.every((i) => !!i.coloriage);
  const couleurs = r.couleurs.map((nom) => couleurDuTableau(nom)!);
  const paysage = couleurs.length > COLONNES_EN_PORTRAIT;
  const nLignes = enImages ? choisies.length : r.formes.length;
  const l = Math.min(30, (paysage ? 250 : 180) / (couleurs.length + 1));
  const h = Math.min(28, (paysage ? 135 : 210) / (nLignes + 1));
  const figure = Math.min(14, l * 0.6, h * 0.6);
  const img = (src: string, taille = figure + 2) =>
    `<img class="tde-image" alt="" src="${escapeHtml(src)}" style="width:${n2(taille)}mm;height:${n2(taille)}mm">`;
  const lignes = enImages
    ? choisies.map((i) => ({
      nom: i.mot,
      tete: img(enColoriage ? i.coloriage! : i.src),
      vide: enColoriage && r.tache === "dessiner" ? img(i.coloriage!) : "",
      // Le pictogramme recolorié de la couleur de la colonne, comme une forme ; sinon, en attendant, encadré de cette couleur.
      dans: (hex: string) => (i.colorie?.[hex] ? img(i.colorie[hex])
        : `<span class="tde-encadre" style="border-color:${hex};background:${hex}33">${img(i.src, figure)}</span>`),
    }))
    : r.formes.map((f) => ({ nom: f, tete: forme(f, "#ffffff", figure), vide: "", dans: (hex: string) => forme(f, hex, figure) }));
  const cases = lignes.flatMap((_, k) => couleurs.map((__, c) => `${k},${c}`));
  const faites = new Set(r.faites === "ligne" ? couleurs.map((_, c) => `0,${c}`)
    : r.faites === "colonne" ? lignes.map((_, k) => `${k},0`)
      : r.faites === "hasard" ? melanger(alea, cases).slice(0, Math.min(r.combien, cases.length - 1)) : []);
  const tailles = `--tde-l:${n2(l)}mm;--tde-h:${n2(h)}mm`;
  const tableau = (tout: boolean) => `<table class="tde-tableau" style="${tailles}"><tr><th></th>${couleurs.map((c) =>
    `<th><span class="tde-pastille" style="background:${c.hex}"></span>${r.motsEcrits ? `<div>${c.nom}</div>` : ""}</th>`).join("")}</tr>`
    + lignes.map((ligne, k) => `<tr><th>${ligne.tete}${r.motsEcrits ? `<div>${escapeHtml(ligne.nom)}</div>` : ""}</th>${couleurs.map((c, i) =>
      `<td>${tout || faites.has(`${k},${i}`) ? ligne.dans(c.hex) : ligne.vide}</td>`).join("")}</tr>`).join("")
    + "</table>";
  const quoi = enImages ? "l'image de sa ligne" : "la forme de sa ligne";
  const deja = r.faites === "ligne" ? " La première ligne est faite : c'est le modèle."
    : r.faites === "colonne" ? " La première colonne est faite : c'est le modèle."
      : faites.size ? ` ${faites.size === 1 ? "Une case est déjà faite" : `${faites.size} cases sont déjà faites`}.` : "";
  const consigne = r.tache === "coller"
    ? `Je découpe les gommettes. Je colle chacune dans la case de sa ligne et de sa colonne.${deja}`
    : enColoriage ? `Dans chaque case, je colorie le dessin de la couleur de sa colonne.${deja}`
      : `Dans chaque case vide, je dessine ${quoi}, de la couleur de sa colonne.${deja}`;
  const aide = r.niveauDAide
    ? `<div class="tde-aide"><b>Pour l'enseignant — le niveau d'aide :</b> ${NIVEAUX_D_AIDE.map((n) => `<span>☐ ${n}</span>`).join("")}</div>` : "";
  const titre = escapeHtml(titreTableau(r, enImages));
  const restantes = melanger(alea, cases.filter((x) => !faites.has(x)));
  const gommettes = r.tache === "coller"
    ? `<div class="page"><div class="titre">${titre} — les gommettes</div><div class="regle">Je découpe en suivant les pointillés.</div>
      <div class="tde-gommettes" style="${tailles}">${restantes.map((x) => { const [k, c] = x.split(",").map(Number); return `<div class="tde-gommette">${lignes[k].dans(couleurs[c].hex)}</div>`; }).join("")}</div></div>`
    : "";
  // Plus de cinq couleurs : à l'italienne (le fabricant de PDF le lit dans la feuille, voir feuille_pdf.rs).
  return feuille(`${paysage ? "<style>@page { size: A4 landscape; }</style>" : ""}<div class="page"><div class="titre">${titre}</div>
    <div class="sous">Prénom : ........................................ Date : ........................</div>
    <div class="regle">${consigne}</div>${tableau(false)}${aide}</div>${gommettes}
    <div class="page corrige"><div class="titre">${titre} — corrigé</div>${tableau(true)}</div>`, "tde");
}

export const STYLE_TABLEAU = `
  .feuille.tde .tde-tableau { border-collapse: collapse; margin: 6mm auto; }
  .feuille.tde .tde-tableau th, .feuille.tde .tde-tableau td { border: 1.2px solid ${NOIR}; width: var(--tde-l, 30mm); height: var(--tde-h, 28mm);
    text-align: center; vertical-align: middle; font-size: 13px; font-weight: 700; padding: 0; }
  .feuille.tde .tde-tableau svg { display: block; margin: 0 auto; }
  .feuille.tde .tde-pastille { display: block; width: min(14mm, calc(var(--tde-l, 30mm) - 6mm)); height: 7mm; border-radius: 1.5mm;
    border: 1px solid ${NOIR}; margin: 0 auto 2mm; }
  .feuille.tde .tde-image { display: block; object-fit: contain; margin: 0 auto; }
  .feuille.tde .tde-encadre { display: inline-block; padding: 1mm; border: 1.8mm solid; border-radius: 3mm; }
  .feuille.tde .tde-aide { margin-top: 6mm; font-size: 12px; display: flex; flex-wrap: wrap; gap: 4px 14px; }
  .feuille.tde .tde-gommettes { display: flex; flex-wrap: wrap; gap: 0; margin-top: 6mm; }
  .feuille.tde .tde-gommette { width: var(--tde-l, 30mm); height: var(--tde-h, 28mm); display: flex; align-items: center; justify-content: center;
    border: 1px dashed #9aa0b4; box-sizing: border-box; break-inside: avoid; page-break-inside: avoid; }
`;
