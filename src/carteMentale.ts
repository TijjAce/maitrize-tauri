// La carte mentale d'un thème, d'une notion, d'une leçon : l'affichage de la classe.
//
// Au centre, le thème ; autour, ses branches — chacune sa couleur, son image,
// ses idées —, reliées au centre par des traits courbes. La moitié des
// branches à droite, l'autre à gauche, comme on la dessine au tableau : elle
// se lit d'un coup d'œil, et chaque branche se retrouve à sa couleur. Elle
// s'imprime sur une page A4 à l'italienne, et s'agrandit en A3 à la
// photocopieuse pour le mur.
//
// Ce que la carte place d'elle-même, l'enseignant le reprend sur la feuille :
// un cadre se déplace ou s'agrandit, un texte grossit, un mot se réécrit, un
// picto s'en va. On ne garde que ce qu'il a changé : le reste suit la mise
// en page, et une branche ajoutée trouve encore sa place.

import { escapeHtml } from "./print";
import { attributionPour, feuille } from "./cartesImprimables";
import { cleImage, estVide, normaliserPicto, type Images, type PictoPose } from "./supportsVisuels";
import type { MotImage } from "./jeuxSons";

export const BRANCHES_MIN = 2;
export const BRANCHES_MAX = 8;
export const IDEES_MAX = 12;

/** Les couleurs des branches : franches, distinctes, lisibles sous un texte blanc. */
export const PALETTE: { nom: string; hex: string }[] = [
  { nom: "bleu", hex: "#1971c2" }, { nom: "orange", hex: "#e8590c" }, { nom: "vert", hex: "#2f9e44" }, { nom: "violet", hex: "#9c36b5" },
  { nom: "rouge", hex: "#c92a2a" }, { nom: "turquoise", hex: "#0c8599" }, { nom: "rose", hex: "#c2255c" }, { nom: "brun", hex: "#a0522d" },
];
export const couleurDeBranche = (i: number) => PALETTE[i % PALETTE.length].hex;

// ── La page ───────────────────────────────────────────────────────────────
//
// En millimètres, sur une page A4 à l'italienne : le centre au milieu, les
// branches en deux colonnes, chacune dans sa part de hauteur — rien ne
// déborde, rien ne se chevauche, quel que soit leur nombre.

export const LARGEUR = 256;
export const HAUTEUR = 168;
const LARGEUR_CENTRE = 70;
const HAUTEUR_CENTRE = 48;
const LARGEUR_BRANCHE = 88;
const ECART = 4;

/** Un cadre sur la feuille, en millimètres depuis le coin haut gauche de la carte. */
export interface Cadre { x: number; y: number; largeur: number; hauteur: number }

/** La place du centre tant qu'on ne l'a pas changée. */
export const CENTRE_DEFAUT: Cadre = {
  x: (LARGEUR - LARGEUR_CENTRE) / 2, y: (HAUTEUR - HAUTEUR_CENTRE) / 2, largeur: LARGEUR_CENTRE, hauteur: HAUTEUR_CENTRE,
};

export interface Branche {
  titre: string;
  image: PictoPose;
  couleur: string;
  /** Ce que la branche porte : des mots, avec leur image si on veut — ou l'image seule, ou le mot seul. */
  idees: MotImage[];
  /** Sa place, quand on l'a déplacée ou agrandie sur la feuille ; sinon, celle que la carte lui donne. */
  cadre?: Cadre;
  /** La taille de son titre (texte et picto), quand on l'a changée : 1, c'est la taille d'origine. */
  tailleTitre?: number;
  /** La taille de ses idées, texte et pictos. */
  tailleIdees?: number;
}

export interface ReglagesCarte {
  centre: string;
  image: PictoPose;
  branches: Branche[];
  /** Les images des idées, à côté de leurs mots. */
  pictos: boolean;
  /** Tout en capitales, pour les plus jeunes. */
  capitales: boolean;
  /** La place du centre, quand on l'a déplacé ou agrandi. */
  cadreCentre?: Cadre;
  /** La taille du centre, texte et picto. */
  tailleCentre?: number;
}

export const brancheVide = (i: number): Branche => ({ titre: "", image: { id: null, mot: "" }, couleur: couleurDeBranche(i), idees: [] });

export const REGLAGES_CARTE: ReglagesCarte = {
  centre: "", image: { id: null, mot: "" }, branches: [brancheVide(0), brancheVide(1), brancheVide(2), brancheVide(3)], pictos: true, capitales: false,
};

// ── Tailles et cadres ─────────────────────────────────────────────────────

/** Les tailles qu'on parcourt avec A− et A+ : de la moitié au triple. */
export const TAILLES = [0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.15, 1.3, 1.5, 1.75, 2, 2.5, 3];

/** La taille d'après, plus grande ou plus petite, sans dépasser les bornes. */
export function tailleSuivante(k: number | undefined, sens: 1 | -1): number {
  const v = k ?? 1;
  return sens > 0
    ? TAILLES.find((t) => t > v + 1e-9) ?? TAILLES[TAILLES.length - 1]
    : [...TAILLES].reverse().find((t) => t < v - 1e-9) ?? TAILLES[0];
}

/** Une taille enregistrée, ramenée dans les bornes ; rien pour la taille d'origine. */
export function tailleSure(v: unknown): number | undefined {
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  const k = Math.round(Math.min(TAILLES[TAILLES.length - 1], Math.max(TAILLES[0], v)) * 100) / 100;
  return k === 1 ? undefined : k;
}

/** Les plus petits cadres : une branche garde la place de son titre, le centre celle de son mot. */
export const MIN_BRANCHE = { largeur: 30, hauteur: 18 };
export const MIN_CENTRE = { largeur: 30, hauteur: 16 };

const dixieme = (v: number) => Math.round(v * 10) / 10;
const auDixieme = (c: Cadre): Cadre => ({ x: dixieme(c.x), y: dixieme(c.y), largeur: dixieme(c.largeur), hauteur: dixieme(c.hauteur) });

/** Un cadre tel qu'on peut s'y fier : dans la carte, pas plus petit que permis ; rien s'il est illisible. */
export function cadreSur(v: unknown, min = MIN_BRANCHE): Cadre | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const [x, y, l, h] = [o.x, o.y, o.largeur, o.hauteur].map((n) => (typeof n === "number" && Number.isFinite(n) ? n : NaN));
  if ([x, y, l, h].some(Number.isNaN)) return undefined;
  const largeur = Math.min(LARGEUR, Math.max(min.largeur, l)), hauteur = Math.min(HAUTEUR, Math.max(min.hauteur, h));
  return auDixieme({ x: Math.min(LARGEUR - largeur, Math.max(0, x)), y: Math.min(HAUTEUR - hauteur, Math.max(0, y)), largeur, hauteur });
}

/** Le cadre glissé de (dx, dy) millimètres, sans sortir de la carte. */
export function deplacer(c: Cadre, dx: number, dy: number): Cadre {
  return auDixieme({ ...c, x: Math.max(0, Math.min(LARGEUR - c.largeur, c.x + dx)), y: Math.max(0, Math.min(HAUTEUR - c.hauteur, c.y + dy)) });
}

/** Les poignées d'un cadre : ses côtés et ses coins, nommés comme sur une boussole (« o » pour l'ouest). */
export type Poignee = "n" | "s" | "e" | "o" | "ne" | "no" | "se" | "so";

/** Le cadre tiré par une poignée de (dx, dy) millimètres : le côté opposé ne bouge pas. */
export function redimensionner(c: Cadre, p: Poignee, dx: number, dy: number, min = MIN_BRANCHE): Cadre {
  let { x, y, largeur, hauteur } = c;
  const droite = x + largeur, bas = y + hauteur;
  if (p.includes("e")) largeur = Math.min(LARGEUR - x, Math.max(min.largeur, largeur + dx));
  if (p.includes("o")) { x = Math.max(0, Math.min(droite - min.largeur, x + dx)); largeur = droite - x; }
  if (p.includes("s")) hauteur = Math.min(HAUTEUR - y, Math.max(min.hauteur, hauteur + dy));
  if (p.includes("n")) { y = Math.max(0, Math.min(bas - min.hauteur, y + dy)); hauteur = bas - y; }
  return auDixieme({ x, y, largeur, hauteur });
}

// ── Les réglages ──────────────────────────────────────────────────────────

const HEX = /^#[0-9a-f]{6}$/i;
/** Un champ facultatif : présent seulement s'il a une valeur. */
const siDefini = <K extends string, V>(cle: K, v: V | undefined) => (v === undefined ? {} : { [cle]: v } as Record<K, V>);

/** Les réglages enregistrés, réparés : ce qu'une version plus ancienne ou un fichier abîmé y a laissé. */
export function reglagesSurs(brut: Partial<ReglagesCarte>): ReglagesCarte {
  const branches = Array.isArray(brut.branches) ? brut.branches.slice(0, BRANCHES_MAX).map((b, i): Branche => {
    const o = (b && typeof b === "object" ? b : {}) as Partial<Branche>;
    return {
      titre: typeof o.titre === "string" ? o.titre : "",
      image: normaliserPicto(o.image),
      couleur: typeof o.couleur === "string" && HEX.test(o.couleur) ? o.couleur : couleurDeBranche(i),
      idees: Array.isArray(o.idees) ? o.idees.filter((m): m is MotImage => Boolean(m) && typeof m.mot === "string")
        .map((m): MotImage => ({ id: typeof m.id === "number" ? m.id : null, mot: m.mot, ...(m.seul === "image" || m.seul === "mot" ? { seul: m.seul } : {}) }))
        .slice(0, IDEES_MAX) : [],
      ...siDefini("cadre", cadreSur(o.cadre)),
      ...siDefini("tailleTitre", tailleSure(o.tailleTitre)),
      ...siDefini("tailleIdees", tailleSure(o.tailleIdees)),
    };
  }) : REGLAGES_CARTE.branches;
  while (branches.length < BRANCHES_MIN) branches.push(brancheVide(branches.length));
  return {
    centre: typeof brut.centre === "string" ? brut.centre : "",
    image: normaliserPicto(brut.image),
    branches,
    pictos: brut.pictos !== false,
    capitales: brut.capitales === true,
    ...siDefini("cadreCentre", cadreSur(brut.cadreCentre, MIN_CENTRE)),
    ...siDefini("tailleCentre", tailleSure(brut.tailleCentre)),
  };
}

/** Une branche qui s'imprime : elle a un titre, une image ou une idée. */
const estPleine = (b: Branche) => Boolean(b.titre.trim() || !estVide(b.image) || b.idees.length);

/** Les branches qui s'impriment : celles qui ont un titre, une image ou une idée. */
export const branchesPleines = (r: Pick<ReglagesCarte, "branches">) => r.branches.filter(estPleine);

export const cequiManque = (r: ReglagesCarte) =>
  !r.centre.trim() && estVide(r.image) ? "Écrivez le thème du centre."
    : branchesPleines(r).length < BRANCHES_MIN ? "Il faut au moins deux branches." : null;

/** Vrai si l'on a déplacé ou agrandi un cadre de la carte. */
export const aDesCadres = (r: ReglagesCarte) => Boolean(r.cadreCentre) || r.branches.some((b) => b.cadre);

/** Les images des idées qui en montrent une : toutes, sauf celles qu'on a voulues en mot seul. */
const imagesDesIdees = (r: Pick<ReglagesCarte, "pictos">, idees: MotImage[]) =>
  r.pictos ? idees.filter((m) => m.seul !== "mot").map((m) => m.id).filter((id): id is number => id != null) : [];

/** Les images à charger : celle du centre, celles des branches, celles des idées. */
export function idsDesImages(r: ReglagesCarte): (number | string)[] {
  const cles = [r.image, ...r.branches.map((b) => b.image)].map(cleImage).filter((k): k is number | string => k !== null);
  return [...new Set([...cles, ...imagesDesIdees(r, r.branches.flatMap((b) => b.idees))])];
}

// ── La mise en page ───────────────────────────────────────────────────────

export interface Bloc extends Cadre { cote: "gauche" | "droite" }

/** La place de chaque branche : la moitié à droite d'abord, dans l'ordre des aiguilles d'une montre, le reste à gauche. */
export function blocsDesBranches(n: number): Bloc[] {
  const droite = Math.ceil(n / 2), gauche = n - droite;
  const colonne = (k: number, cote: "gauche" | "droite") => Array.from({ length: k }, (_, i): Bloc => {
    const part = HAUTEUR / k;
    return { x: cote === "droite" ? LARGEUR - LARGEUR_BRANCHE : 0, y: i * part + ECART / 2, largeur: LARGEUR_BRANCHE, hauteur: part - ECART, cote };
  });
  // À gauche, de bas en haut : on tourne autour du centre.
  return [...colonne(droite, "droite"), ...colonne(gauche, "gauche").reverse()];
}

/** Le cadre du centre : celui qu'on lui a donné, sinon le milieu de la page. */
export const cadreDuCentre = (r: Pick<ReglagesCarte, "cadreCentre">): Cadre => r.cadreCentre ?? CENTRE_DEFAUT;

/**
 * Les branches qui s'impriment, chacune avec son rang dans les réglages et
 * sa place sur la feuille. Les branches qu'on n'a pas touchées gardent la
 * place que la carte donne à toutes : en agrandir une ne fait pas bouger
 * les autres.
 */
export function blocsDeLaCarte(r: ReglagesCarte): { branche: Branche; rang: number; bloc: Bloc }[] {
  const pleines = r.branches.map((branche, rang) => ({ branche, rang })).filter(({ branche }) => estPleine(branche));
  const auto = blocsDesBranches(pleines.length);
  const centre = cadreDuCentre(r);
  return pleines.map(({ branche, rang }, k) => {
    const c = branche.cadre;
    if (!c) return { branche, rang, bloc: auto[k] };
    // Un cadre déplacé se relie au centre par le côté où il se trouve.
    const cote = c.x + c.largeur / 2 >= centre.x + centre.largeur / 2 ? "droite" : "gauche";
    return { branche, rang, bloc: { ...c, cote } };
  });
}

/** Le trait courbe du centre à une branche, qui part du bord du centre et arrive au milieu du bloc. */
export function trait(b: Bloc, rang: number, parCote: number, centre: Cadre = CENTRE_DEFAUT): string {
  const cx = centre.x + centre.largeur / 2, cy = centre.y + centre.hauteur / 2;
  const sens = b.cote === "droite" ? 1 : -1;
  const x0 = cx + sens * Math.max(0, centre.largeur / 2 - 4);
  const ecart = Math.min(9, 32 / Math.max(1, parCote)) * (centre.hauteur / HAUTEUR_CENTRE);
  const y0 = cy + (rang - (parCote - 1) / 2) * ecart;
  const x1 = b.cote === "droite" ? b.x : b.x + b.largeur;
  const y1 = b.y + b.hauteur / 2;
  const dx = Math.abs(x1 - x0) * 0.55;
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} C${(x0 + sens * dx).toFixed(1)} ${y0.toFixed(1)} ${(x1 - sens * dx).toFixed(1)} ${y1.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}

/** La taille des idées : grande quand elles sont peu nombreuses et que la branche a de la place. */
export function tailleDesIdees(idees: number, hauteurDuBloc: number): "grande" | "moyenne" | "petite" {
  const place = hauteurDuBloc / Math.max(1, idees);
  return place >= 14 ? "grande" : place >= 8 ? "moyenne" : "petite";
}

// ── La feuille ────────────────────────────────────────────────────────────
//
// Chaque élément porte un repère (`data-cm`, `data-i`, `data-j`…) : l'éditeur
// de la feuille s'en sert pour savoir ce qu'on a choisi. L'imprimante, elle,
// n'en fait rien.

const image = (p: PictoPose | null, images: Images, classe: string, quoi: string) => {
  const cle = cleImage(p);
  const src = cle !== null ? images[cle] : undefined;
  return src ? `<img class="${classe}" src="${src}" alt="${escapeHtml(p?.mot ?? "")}" data-cm-image="${quoi}">` : "";
};

/**
 * Une idée sur la feuille : son image et son mot, ou l'un des deux seulement.
 * Sans image à montrer, le mot reste : une idée ne disparaît jamais.
 */
function idee(m: MotImage, j: number, src: string | undefined): string {
  const ecrit = m.seul !== "image" || !src;
  return `<span class="cm-idee${src && !ecrit ? " cm-image-seule" : ""}" data-j="${j}">`
    + `${src ? `<img src="${src}" alt="${ecrit ? "" : escapeHtml(m.mot)}" data-cm-image="idee">` : ""}${ecrit ? escapeHtml(m.mot) : ""}</span>`;
}

/** Les millimètres d'un cadre, en style. */
const place = (c: Cadre) => `left:${c.x.toFixed(1)}mm;top:${c.y.toFixed(1)}mm;width:${c.largeur.toFixed(1)}mm;height:${c.hauteur.toFixed(1)}mm`;

/** La carte, prête à imprimer : le centre, les branches et leurs traits. */
export function htmlCarteMentale(r: ReglagesCarte, images: Images): string {
  const placees = blocsDeLaCarte(r);
  const centre = cadreDuCentre(r);
  const parCote = { droite: placees.filter((p) => p.bloc.cote === "droite").length, gauche: placees.filter((p) => p.bloc.cote === "gauche").length };
  const rangs = { droite: 0, gauche: 0 };
  // Les traits partent du centre dans l'ordre où les blocs se lisent de haut en bas, de chaque côté.
  const traits = [...placees].sort((p, q) => p.bloc.y - q.bloc.y)
    .map(({ branche, bloc }) => `<path d="${trait(bloc, rangs[bloc.cote]++, parCote[bloc.cote], centre)}" stroke="${branche.couleur}"/>`).join("");
  const centreHtml = `<div class="cm-centre" data-cm="centre" style="${place(centre)}${r.tailleCentre ? `;--k:${r.tailleCentre}` : ""}">`
    + `${image(r.image, images, "cm-centre-image", "centre")}<div class="cm-centre-titre" data-cm-texte="centre">${escapeHtml(r.centre.trim() || "…")}</div></div>`;
  const blocsHtml = placees.map(({ branche: br, rang, bloc: b }) => {
    const taille = tailleDesIdees(br.idees.length, b.hauteur - 13);
    const idees = br.idees.map((m, j) => idee(m, j, r.pictos && m.seul !== "mot" && m.id != null ? images[m.id] : undefined)).join("");
    return `<div class="cm-branche" data-cm="branche" data-i="${rang}" style="${place(b)};--c:${br.couleur}${br.tailleTitre ? `;--kt:${br.tailleTitre}` : ""}">`
      + `<div class="cm-titre">${image(br.image, images, "cm-titre-image", "titre")}<span data-cm-texte="titre">${escapeHtml(br.titre.trim() || "…")}</span></div>`
      + (idees ? `<div class="cm-idees cm-${taille}"${br.tailleIdees ? ` style="--k:${br.tailleIdees}"` : ""}>${idees}</div>` : "") + `</div>`;
  }).join("");
  const branches = placees.map((p) => p.branche);
  const ids = [r.image, ...branches.map((b) => b.image)].filter((p) => !p.photo && p.id != null && images[p.id]).map((p) => p.id)
    .concat(imagesDesIdees(r, branches.flatMap((b) => b.idees)).filter((id) => images[id]));
  return feuille(`<div class="page"><div class="cm-carte${r.capitales ? " cm-capitales" : ""}" style="width:${LARGEUR}mm;height:${HAUTEUR}mm">`
    + `<svg class="cm-traits" viewBox="0 0 ${LARGEUR} ${HAUTEUR}" width="${LARGEUR}mm" height="${HAUTEUR}mm">${traits}</svg>`
    + `${centreHtml}${blocsHtml}</div></div>${attributionPour(ids)}`, "cm");
}

// Les tailles suivent `--k` (le centre, les idées) et `--kt` (le titre d'une
// branche) : le texte et ses pictos grandissent ensemble.
export const STYLE_CARTE_MENTALE = `
  @page { size: A4 landscape; margin: 10mm; }
  .feuille.cm .cm-carte { position: relative; margin: 0 auto; }
  .feuille.cm .cm-capitales { text-transform: uppercase; }
  .feuille.cm .cm-traits { position: absolute; left: 0; top: 0; }
  .feuille.cm .cm-traits path { fill: none; stroke-width: 1.6; stroke-linecap: round; }
  .feuille.cm .cm-centre { position: absolute; box-sizing: border-box; border: 1mm solid #1c2233; border-radius: 50%; background: #fff;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.5mm; padding: 4mm 8mm; text-align: center; overflow: hidden; }
  .feuille.cm .cm-centre-image { width: calc(17mm * var(--k, 1)); height: calc(17mm * var(--k, 1)); object-fit: contain; margin: 0; max-height: none; flex: none; }
  .feuille.cm .cm-centre-titre { font-size: calc(24px * var(--k, 1)); font-weight: 800; line-height: 1.12; }
  .feuille.cm .cm-branche { position: absolute; box-sizing: border-box; display: flex; flex-direction: column; border: 0.7mm solid var(--c);
    border-radius: 3.5mm; background: #fff; overflow: hidden; }
  .feuille.cm .cm-titre { flex: none; display: flex; align-items: center; gap: 2mm; background: var(--c); color: #fff; padding: 1.5mm 3mm;
    font-size: calc(17px * var(--kt, 1)); font-weight: 800; line-height: 1.1; min-height: 10mm; box-sizing: border-box; }
  .feuille.cm .cm-titre-image { width: calc(9mm * var(--kt, 1)); height: calc(9mm * var(--kt, 1)); object-fit: contain; margin: 0; max-height: none;
    background: #fff; border-radius: 1.5mm; flex: none; }
  .feuille.cm .cm-idees { flex: 1; min-height: 0; display: flex; flex-wrap: wrap; align-content: center; justify-content: center; gap: 1.5mm 3mm; padding: 2mm 3mm; }
  .feuille.cm .cm-idee { display: inline-flex; align-items: center; gap: 1.2mm; font-weight: 600; color: #1c2233; text-align: center; }
  .feuille.cm .cm-idee img { object-fit: contain; margin: 0; max-height: none; }
  .feuille.cm .cm-grande .cm-idee { font-size: calc(16px * var(--k, 1)); }
  .feuille.cm .cm-grande .cm-idee img { width: calc(13mm * var(--k, 1)); height: calc(13mm * var(--k, 1)); }
  .feuille.cm .cm-moyenne .cm-idee { font-size: calc(13px * var(--k, 1)); }
  .feuille.cm .cm-moyenne .cm-idee img { width: calc(9mm * var(--k, 1)); height: calc(9mm * var(--k, 1)); }
  .feuille.cm .cm-petite .cm-idee { font-size: calc(11px * var(--k, 1)); }
  .feuille.cm .cm-petite .cm-idee img { width: calc(7mm * var(--k, 1)); height: calc(7mm * var(--k, 1)); }
  /* L'image seule prend la place du mot. */
  .feuille.cm .cm-grande .cm-image-seule img { width: calc(17mm * var(--k, 1)); height: calc(17mm * var(--k, 1)); }
  .feuille.cm .cm-moyenne .cm-image-seule img { width: calc(12mm * var(--k, 1)); height: calc(12mm * var(--k, 1)); }
  .feuille.cm .cm-petite .cm-image-seule img { width: calc(9mm * var(--k, 1)); height: calc(9mm * var(--k, 1)); }
`;
