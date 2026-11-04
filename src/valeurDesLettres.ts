// ── La valeur des lettres c, g et s, pour le mur ──────────────────────────
//
// « Fais-en encore plus » (l'enseignant, 4 novembre 2026), après les tables
// de multiplication, la frise alphabétique et les tableaux de conjugaison.
//
// Programme de français du cycle 2 (2024), au CE1 : « classer par analogie et
// mémoriser les mots les plus fréquents comportant des graphèmes à
// prononciation variable : s prononcé –ss ou –z, c prononcé –ss ou –k, g
// prononcé –j ou –g », en regroupant des mots — « garder/gai/gorille… »,
// « girafe/gendarme/geste… » —, et anticiper une lettre muette finale à
// l'aide d'un mot de la même famille, « blanc/blanche, sang/sanguin » (p. 18) ;
// établir des listes analogiques, « ça/glaçon/garçon/nous forçons/maçon »
// (p. 6). Le guide « Pour enseigner la lecture et l'écriture au CE1 »
// (Éduscol, 2019) relie ces valeurs à la dictée : la valeur de base d'une
// lettre, sa valeur de position, sa valeur zéro — la lettre muette —, sa
// place dans un digramme (p. 108-111) ; il range celles de la lettre c en
// carte mentale : [k] devant a, o, u, devant une consonne, à la fin des
// mots ; [s] devant e, i, y, et ç devant a, o, u ; muette dans banc
// (p. 112). L'affiche reprend cette carte pour c, g et s : une case par
// son, une ligne par règle, des mots et leurs dessins — la lettre en
// couleur, la lettre qui décide soulignée.

import { ATTRIBUTION_ARASAAC, feuille } from "./cartesImprimables";
import { POLICE_CURSIVE } from "./ecritureCursive";
import { escapeHtml } from "./print";

export type LettreAValeurs = "c" | "g" | "s";
export const LETTRES_A_VALEURS: LettreAValeurs[] = ["c", "g", "s"];

/** Ce qui décide, et qu'on souligne : la lettre suivante, les deux voisines, ou les seules consonnes voisines. */
type Contexte = "apres" | "autour" | "consonnes" | null;

export interface RegleDeLettre {
  id: string;
  /** « devant a, o, u ». */
  quand: string;
  /** Le graphème mis en couleur : c, ç, ch, g, gu, ge, gn, s, ss. */
  cherche: string;
  /** La règle vaut-elle pour le graphème à la place `i` du mot (en minuscules) ? */
  vaut: (mot: string, i: number) => boolean;
  contexte: Contexte;
  /** Les mots de départ ; « blanc/blanche » : le mot, et celui de sa famille où la lettre s'entend. */
  mots: string;
}

export interface SonDeLettre {
  id: string;
  son: string;
  teinte: "bleu" | "rouge" | "gris" | "violet";
  /** Les lettres muettes et les digrammes se montrent sur demande. */
  option?: "muettes" | "digrammes";
  regles: RegleDeLettre[];
}

const AOU = "aàâäoôöuûü";
const EIY = "eéèêëiîïy";
const VOYELLES = "aàâäeéèêëiîïoôöuûüyœ";
const CONSONNES = "bcçdfghjklmnpqrstvwxz";
const est = (classe: string, c: string | undefined) => !!c && classe.includes(c);
const derniere = (mot: string, i: number, longueur = 1) => i + longueur === mot.length;

export const VALEURS: Record<LettreAValeurs, SonDeLettre[]> = {
  c: [
    {
      id: "c-k", son: "[k]", teinte: "bleu", regles: [
        { id: "c-k-aou", quand: "devant a, o, u", cherche: "c", contexte: "apres", vaut: (m, i) => est(AOU, m[i + 1]), mots: "canard, cochon, cube" },
        { id: "c-k-consonne", quand: "devant une consonne", cherche: "c", contexte: "apres", vaut: (m, i) => est(CONSONNES, m[i + 1]) && m[i + 1] !== "h", mots: "clé, crabe, crocodile" },
        { id: "c-k-fin", quand: "à la fin du mot", cherche: "c", contexte: null, vaut: (m, i) => derniere(m, i), mots: "sac, lac, bec" },
      ],
    },
    {
      id: "c-s", son: "[s]", teinte: "rouge", regles: [
        { id: "c-s-eiy", quand: "devant e, i, y", cherche: "c", contexte: "apres", vaut: (m, i) => est(EIY, m[i + 1]), mots: "cerise, citron, cygne" },
        { id: "c-s-cedille", quand: "ç devant a, o, u", cherche: "ç", contexte: "apres", vaut: (m, i) => est(AOU, m[i + 1]), mots: "garçon, maçon, balançoire" },
      ],
    },
    {
      id: "c-muet", son: "muet", teinte: "gris", option: "muettes", regles: [
        { id: "c-muet", quand: "à la fin de quelques mots", cherche: "c", contexte: null, vaut: (m, i) => derniere(m, i), mots: "blanc/blanche, banc, tronc" },
      ],
    },
    {
      id: "c-ch", son: "ch", teinte: "violet", option: "digrammes", regles: [
        { id: "c-ch", quand: "avec h", cherche: "ch", contexte: null, vaut: () => true, mots: "cheval, chat, chaise" },
      ],
    },
  ],
  g: [
    {
      id: "g-g", son: "[g]", teinte: "bleu", regles: [
        { id: "g-g-aou", quand: "devant a, o, u", cherche: "g", contexte: "apres", vaut: (m, i) => est(AOU, m[i + 1]), mots: "gâteau, gomme, légume" },
        { id: "g-g-consonne", quand: "devant une consonne", cherche: "g", contexte: "apres", vaut: (m, i) => est(CONSONNES, m[i + 1]) && m[i + 1] !== "n", mots: "grenouille, glace, tigre" },
        { id: "g-gu", quand: "gu devant e, i", cherche: "gu", contexte: "apres", vaut: (m, i) => est(EIY, m[i + 2]), mots: "guêpe, guitare, figue" },
      ],
    },
    {
      id: "g-j", son: "[j]", teinte: "rouge", regles: [
        { id: "g-j-eiy", quand: "devant e, i, y", cherche: "g", contexte: "apres", vaut: (m, i) => est(EIY, m[i + 1]), mots: "genou, girafe, gilet" },
        { id: "g-ge", quand: "ge devant a, o, u", cherche: "ge", contexte: "apres", vaut: (m, i) => est(AOU, m[i + 2]), mots: "pigeon, nageoire, orangeade" },
      ],
    },
    {
      id: "g-muet", son: "muet", teinte: "gris", option: "muettes", regles: [
        { id: "g-muet", quand: "à la fin de quelques mots", cherche: "g", contexte: null,
          vaut: (m, i) => derniere(m, i) || (m[i + 1] === "t" && derniere(m, i, 2)), mots: "sang/sanguin, long/longue, doigt" },
      ],
    },
    {
      id: "g-gn", son: "gn", teinte: "violet", option: "digrammes", regles: [
        { id: "g-gn", quand: "avec n", cherche: "gn", contexte: null, vaut: () => true, mots: "montagne, champignon, araignée" },
      ],
    },
  ],
  s: [
    {
      id: "s-s", son: "[s]", teinte: "bleu", regles: [
        { id: "s-debut", quand: "au début du mot", cherche: "s", contexte: null, vaut: (_m, i) => i === 0, mots: "sapin, soleil, salade" },
        { id: "s-consonne", quand: "à côté d'une consonne", cherche: "s", contexte: "consonnes",
          vaut: (m, i) => i > 0 && !derniere(m, i) && (est(CONSONNES, m[i - 1]) || est(CONSONNES, m[i + 1])) && m[i - 1] !== "s" && m[i + 1] !== "s",
          mots: "veste, masque, escargot" },
        { id: "s-ss", quand: "ss entre deux voyelles", cherche: "ss", contexte: "autour", vaut: (m, i) => est(VOYELLES, m[i - 1]) && est(VOYELLES, m[i + 2]), mots: "poisson, tasse, chaussette" },
      ],
    },
    {
      id: "s-z", son: "[z]", teinte: "rouge", regles: [
        { id: "s-z", quand: "entre deux voyelles", cherche: "s", contexte: "autour", vaut: (m, i) => est(VOYELLES, m[i - 1]) && est(VOYELLES, m[i + 1]), mots: "maison, oiseau, fraise, chemise" },
      ],
    },
    {
      id: "s-muet", son: "muet", teinte: "gris", option: "muettes", regles: [
        { id: "s-muet", quand: "souvent, à la fin du mot", cherche: "s", contexte: null, vaut: (m, i) => derniere(m, i), mots: "souris, gris/grise, radis" },
      ],
    },
  ],
};

export interface ReglagesValeurLettres {
  lettres: LettreAValeurs[];
  /** Les mots de la classe, par règle ; absente, la règle garde ses mots. */
  mots: Record<string, string>;
  muettes: boolean;
  digrammes: boolean;
  images: boolean;
  /** La lettre aussi en cursive, à côté de la script, en tête de page. */
  cursive: boolean;
  format: "mur" | "cahier";
}

export const REGLAGES_VALEUR_LETTRES: ReglagesValeurLettres = {
  lettres: ["c", "g", "s"], mots: {}, muettes: true, digrammes: false, images: true, cursive: true, format: "mur",
};

const REGLES = Object.values(VALEURS).flatMap((sons) => sons.flatMap((s) => s.regles));

export function reglagesValeurLettresSurs(brut: Partial<ReglagesValeurLettres> | null | undefined): ReglagesValeurLettres {
  const o = (brut && typeof brut === "object" ? brut : {}) as Partial<ReglagesValeurLettres>;
  const d = REGLAGES_VALEUR_LETTRES;
  const lettres = Array.isArray(o.lettres) ? LETTRES_A_VALEURS.filter((l) => o.lettres!.includes(l)) : d.lettres;
  const mots: Record<string, string> = {};
  if (o.mots && typeof o.mots === "object") {
    for (const r of REGLES) if (typeof o.mots[r.id] === "string") mots[r.id] = o.mots[r.id].slice(0, 300);
  }
  const oui = (v: unknown, defaut: boolean) => (typeof v === "boolean" ? v : defaut);
  return {
    lettres: lettres.length ? lettres : d.lettres, mots,
    muettes: oui(o.muettes, d.muettes), digrammes: oui(o.digrammes, d.digrammes), images: oui(o.images, d.images), cursive: oui(o.cursive, d.cursive),
    format: o.format === "cahier" ? "cahier" : "mur",
  };
}

/** Un mot de l'affiche : le mot, et celui de sa famille qui fait entendre la lettre muette. */
export interface MotDeRegle { mot: string; famille: string }

/** Les mots d'une règle : ceux de la classe, sinon les siens ; au plus cinq. */
export function motsDeLaRegle(regle: RegleDeLettre, r: Pick<ReglagesValeurLettres, "mots">): MotDeRegle[] {
  const saisie = r.mots[regle.id] ?? regle.mots;
  return saisie.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean).slice(0, 5).map((s) => {
    const [mot, famille = ""] = s.split("/").map((x) => x.trim());
    return { mot, famille };
  }).filter((m) => m.mot);
}

/** Les places du graphème de la règle dans le mot, là où elle vaut. */
export function placesDeLaRegle(regle: RegleDeLettre, mot: string): number[] {
  const m = mot.toLowerCase();
  const places: number[] = [];
  for (let i = m.indexOf(regle.cherche); i >= 0; i = m.indexOf(regle.cherche, i + 1)) {
    if (regle.vaut(m, i)) places.push(i);
  }
  return places;
}

/** Les mots de la classe où la règle ne se voit pas : « chat » n'a pas de c devant a, o, u. */
export const motsHorsDeLaRegle = (regle: RegleDeLettre, r: Pick<ReglagesValeurLettres, "mots">) =>
  motsDeLaRegle(regle, r).filter((m) => !placesDeLaRegle(regle, m.mot).length).map((m) => m.mot);

/** Le mot, son graphème en couleur et la lettre qui décide soulignée. */
export function motEnCouleur(regle: RegleDeLettre, mot: string): string {
  const places = placesDeLaRegle(regle, mot);
  const n = regle.cherche.length;
  const marque = Array.from({ length: mot.length }, () => "");
  for (const i of places) {
    for (let k = i; k < i + n; k++) marque[k] = "l";
    const m = mot.toLowerCase();
    const voisines = regle.contexte === "apres" ? [i + n] : regle.contexte === "autour" ? [i - 1, i + n]
      : regle.contexte === "consonnes" ? [i - 1, i + n].filter((k) => est(CONSONNES, m[k])) : [];
    for (const k of voisines) if (k >= 0 && k < mot.length && marque[k] !== "l") marque[k] = "c";
  }
  let html = "", courant = "", morceau = "";
  const fermer = () => {
    if (!morceau) return;
    html += courant === "l" ? `<span class="vl-l">${escapeHtml(morceau)}</span>` : courant === "c" ? `<span class="vl-c">${escapeHtml(morceau)}</span>` : escapeHtml(morceau);
    morceau = "";
  };
  [...mot].forEach((ch, k) => {
    if (marque[k] !== courant) { fermer(); courant = marque[k]; }
    morceau += ch;
  });
  fermer();
  return html;
}

/** Les sons d'une lettre qui paraissent sur l'affiche, selon les options. */
export const sonsAffiches = (lettre: LettreAValeurs, r: Pick<ReglagesValeurLettres, "muettes" | "digrammes">) =>
  VALEURS[lettre].filter((s) => !s.option || r[s.option]);

/** « Elle se prononce [k] ou [s] » : les sons de base et de position, sans la lettre muette ni le digramme. */
export const prononciations = (lettre: LettreAValeurs) => VALEURS[lettre].filter((s) => !s.option).map((s) => s.son).join(" ou ");

/** Tous les mots qu'il faut dessiner. */
export function motsADessiner(brut: Partial<ReglagesValeurLettres>): string[] {
  const r = reglagesValeurLettresSurs(brut);
  return [...new Set(r.lettres.flatMap((l) => sonsAffiches(l, r).flatMap((s) => s.regles.flatMap((g) => motsDeLaRegle(g, r).map((m) => m.mot.toLowerCase())))))];
}

const LARGEUR_MOTS = 104;

function pageDeLaLettre(lettre: LettreAValeurs, r: ReglagesValeurLettres, images: Record<string, string>): string {
  const sons = sonsAffiches(lettre, r);
  const lignes = sons.reduce((n, s) => n + s.regles.length, 0);
  const avecImages = r.images && Object.keys(images).length > 0;
  // La place d'une ligne : la page moins l'en-tête, partagée entre les règles.
  const parLigne = (avecImages ? 196 : 200) / Math.max(1, lignes);
  const ecrit = avecImages ? Math.max(5, Math.min(7.5, parLigne * 0.21)) : Math.max(6, Math.min(10, parLigne * 0.24));
  const dessin = Math.max(9, Math.min(19, parLigne - 1.3 * ecrit - 10));
  const regle = (g: RegleDeLettre) => {
    const mots = motsDeLaRegle(g, r);
    // Des mots plus nombreux ou plus longs s'écrivent plus petit, pour tenir sur la ligne.
    const plusLong = Math.max(4, ...mots.map((m) => m.mot.length));
    const taille = Math.min(ecrit, LARGEUR_MOTS / Math.max(1, mots.length) / (0.62 * plusLong));
    return `<div class="vl-regle"><div class="vl-quand">${escapeHtml(g.quand)}</div>`
      + `<div class="vl-mots" style="--vl-ecrit:${Math.round(taille * 10) / 10}mm">`
      + mots.map((m) => {
        const img = avecImages ? images[m.mot.toLowerCase()] : undefined;
        return `<figure class="vl-mot">${img ? `<img class="vl-dessin" src="${escapeHtml(img)}" alt="">` : avecImages ? `<div class="vl-dessin"></div>` : ""}`
          + `<figcaption>${motEnCouleur(g, m.mot)}${m.famille ? `<span class="vl-famille">${escapeHtml(m.famille)}</span>` : ""}</figcaption></figure>`;
      }).join("")
      + `</div></div>`;
  };
  return `<div class="vl-page" style="--vl-dessin:${Math.round(dessin * 10) / 10}mm; --vl-ecrit:${Math.round(ecrit * 10) / 10}mm">`
    + `<div class="vl-tete"><div class="vl-lettres"><span class="vl-script">${lettre}</span>${r.cursive ? `<span class="vl-cursive">${lettre}</span>` : ""}</div>`
    + `<div><div class="vl-titre">La lettre ${lettre}</div><div class="vl-sous-titre">Elle se prononce ${escapeHtml(prononciations(lettre))}.</div></div></div>`
    + `<div class="vl-sons">`
    + sons.map((s) => `<section class="vl-son vl-${s.teinte}" style="--vl-lignes:${s.regles.length}"><div class="vl-pastille">${escapeHtml(s.son)}</div>`
      + `<div class="vl-regles">${s.regles.map(regle).join("")}</div></section>`).join("")
    + `</div>${avecImages ? ATTRIBUTION_ARASAAC : ""}</div>`;
}

/**
 * Pour le mur, une page par lettre ; pour le cahier, la même en petit, quatre
 * fois sur une planche, à découper et à coller (comme les tables, voir
 * tablesMultiplication.ts).
 */
export function htmlValeurLettres(brut: Partial<ReglagesValeurLettres>, images: Record<string, string> = {}): string {
  const r = reglagesValeurLettresSurs(brut);
  const pages = r.lettres.map((l) => pageDeLaLettre(l, r, images));
  return feuille(r.format === "cahier"
    ? pages.map((p) => `<div class="page vl-planche">${`<div class="vl-petit">${p}</div>`.repeat(4)}</div>`).join("")
    : pages.map((p) => `<div class="page">${p}</div>`).join(""), "vl");
}

export function titreValeurLettres(brut: Partial<ReglagesValeurLettres>): string {
  const l = reglagesValeurLettresSurs(brut).lettres;
  return l.length === 1 ? `La lettre ${l[0]}` : `Les lettres ${l.slice(0, -1).join(", ")} et ${l[l.length - 1]}`;
}

const NOIR = "#1c2233";
const TEINTES = { bleu: "#2a6fd6", rouge: "#d33a32", gris: "#6b7287", violet: "#7e57c2" };
const POLICE_SCRIPT = `"Andika", "Andika New Basic", "Century Gothic", "Avenir Next", "Helvetica Neue", Arial, sans-serif`;

export const STYLE_VALEUR_LETTRES = `
  .feuille.vl .vl-page { width: 182mm; height: 250mm; margin: 0 auto; box-sizing: border-box; display: flex; flex-direction: column; color: ${NOIR};
    font-family: ${POLICE_SCRIPT}; }
  .feuille.vl .vl-tete { display: flex; align-items: center; gap: 6mm; margin: 0 0 4mm; }
  .feuille.vl .vl-lettres { display: flex; align-items: baseline; gap: 3mm; border: 1mm solid ${NOIR}; border-radius: 4mm; padding: 0 5mm; line-height: 1.15; }
  .feuille.vl .vl-script { font-size: 20mm; font-weight: 700; }
  .feuille.vl .vl-cursive { font-family: ${POLICE_CURSIVE}; font-size: 20mm; }
  .feuille.vl .vl-titre { font-size: 10mm; font-weight: 800; line-height: 1.1; }
  .feuille.vl .vl-sous-titre { font-size: 6mm; color: #4a5068; margin-top: 1.5mm; }
  .feuille.vl .vl-sons { flex: 1; display: flex; flex-direction: column; gap: 3mm; min-height: 0; }
  .feuille.vl .vl-son { display: flex; border: 0.8mm solid var(--vl-teinte); border-radius: 3mm; overflow: hidden; break-inside: avoid; page-break-inside: avoid;
    flex: var(--vl-lignes, 1) 1 0; min-height: 0; }
  .feuille.vl .vl-bleu { --vl-teinte: ${TEINTES.bleu}; }
  .feuille.vl .vl-rouge { --vl-teinte: ${TEINTES.rouge}; }
  .feuille.vl .vl-gris { --vl-teinte: ${TEINTES.gris}; }
  .feuille.vl .vl-violet { --vl-teinte: ${TEINTES.violet}; }
  .feuille.vl .vl-pastille { flex: none; width: 24mm; display: flex; align-items: center; justify-content: center; background: var(--vl-teinte); color: #fff;
    font-size: 8mm; font-weight: 800; }
  .feuille.vl .vl-gris .vl-pastille { font-size: 6mm; }
  .feuille.vl .vl-regles { flex: 1; display: flex; flex-direction: column; min-width: 0; }
  .feuille.vl .vl-regle { flex: 1; display: flex; align-items: center; gap: 3mm; padding: 1.5mm 3mm; min-height: 0; }
  .feuille.vl .vl-regle + .vl-regle { border-top: 0.4mm dashed #c9cfdc; }
  .feuille.vl .vl-quand { flex: none; width: 37mm; font-size: 4.6mm; font-weight: 700; line-height: 1.2; color: var(--vl-teinte); }
  .feuille.vl .vl-mots { flex: 1; display: flex; justify-content: space-around; align-items: flex-end; gap: 2mm; min-width: 0; }
  .feuille.vl .vl-mot { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 1mm; min-width: 0; }
  .feuille.vl .vl-dessin { width: var(--vl-dessin); height: var(--vl-dessin); object-fit: contain; }
  .feuille.vl .vl-mot figcaption { font-size: var(--vl-ecrit); font-weight: 600; line-height: 1.1; white-space: nowrap; text-align: center; }
  .feuille.vl .vl-l { color: var(--vl-teinte); font-weight: 800; }
  .feuille.vl .vl-c { text-decoration: underline; text-decoration-thickness: 0.5mm; text-underline-offset: 0.8mm; }
  .feuille.vl .vl-famille { display: block; font-size: 0.6em; font-weight: 500; color: #687087; margin-top: 0.6mm; }
  .feuille.vl .vl-famille::before { content: "→ "; }
  /* Pour le cahier : quatre par planche, dans leur pointillé de découpe. */
  .feuille.vl .vl-planche { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; height: 250mm; box-sizing: border-box; }
  .feuille.vl .vl-petit { zoom: 0.48; outline: 1mm dashed #9aa0b4; outline-offset: -1.5mm; box-sizing: border-box; overflow: hidden;
    display: flex; align-items: center; justify-content: center; }
`;
