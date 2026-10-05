// La carte mentale d'un thème, d'une notion, d'une leçon : l'affichage de la classe.
//
// Au centre, le thème ; autour, ses branches — chacune sa couleur, son image,
// ses idées —, reliées au centre par des traits courbes. La moitié des
// branches à droite, l'autre à gauche, comme on la dessine au tableau : elle
// se lit d'un coup d'œil, et chaque branche se retrouve à sa couleur. Elle
// s'imprime sur une page A4 à l'italienne, et s'agrandit en A3 à la
// photocopieuse pour le mur.

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

export interface Branche {
  titre: string;
  image: PictoPose;
  couleur: string;
  /** Ce que la branche porte : des mots, avec leur image si on veut — ou l'image seule, ou le mot seul. */
  idees: MotImage[];
}

export interface ReglagesCarte {
  centre: string;
  image: PictoPose;
  branches: Branche[];
  /** Les images des idées, à côté de leurs mots. */
  pictos: boolean;
  /** Tout en capitales, pour les plus jeunes. */
  capitales: boolean;
}

export const brancheVide = (i: number): Branche => ({ titre: "", image: { id: null, mot: "" }, couleur: couleurDeBranche(i), idees: [] });

export const REGLAGES_CARTE: ReglagesCarte = {
  centre: "", image: { id: null, mot: "" }, branches: [brancheVide(0), brancheVide(1), brancheVide(2), brancheVide(3)], pictos: true, capitales: false,
};

const HEX = /^#[0-9a-f]{6}$/i;

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
    };
  }) : REGLAGES_CARTE.branches;
  while (branches.length < BRANCHES_MIN) branches.push(brancheVide(branches.length));
  return {
    centre: typeof brut.centre === "string" ? brut.centre : "",
    image: normaliserPicto(brut.image),
    branches,
    pictos: brut.pictos !== false,
    capitales: brut.capitales === true,
  };
}

/** Les branches qui s'impriment : celles qui ont un titre, une image ou une idée. */
export const branchesPleines = (r: Pick<ReglagesCarte, "branches">) =>
  r.branches.filter((b) => b.titre.trim() || !estVide(b.image) || b.idees.length);

export const cequiManque = (r: ReglagesCarte) =>
  !r.centre.trim() && estVide(r.image) ? "Écrivez le thème du centre."
    : branchesPleines(r).length < BRANCHES_MIN ? "Il faut au moins deux branches." : null;

/** Les images des idées qui en montrent une : toutes, sauf celles qu'on a voulues en mot seul. */
const imagesDesIdees = (r: Pick<ReglagesCarte, "pictos">, idees: MotImage[]) =>
  r.pictos ? idees.filter((m) => m.seul !== "mot").map((m) => m.id).filter((id): id is number => id != null) : [];

/** Les images à charger : celle du centre, celles des branches, celles des idées. */
export function idsDesImages(r: ReglagesCarte): (number | string)[] {
  const cles = [r.image, ...r.branches.map((b) => b.image)].map(cleImage).filter((k): k is number | string => k !== null);
  return [...new Set([...cles, ...imagesDesIdees(r, r.branches.flatMap((b) => b.idees))])];
}

/**
 * Une idée sur la feuille : son image et son mot, ou l'un des deux seulement.
 * Sans image à montrer, le mot reste : une idée ne disparaît jamais.
 */
function idee(m: MotImage, src: string | undefined): string {
  const ecrit = m.seul !== "image" || !src;
  return `<span class="cm-idee${src && !ecrit ? " cm-image-seule" : ""}">`
    + `${src ? `<img src="${src}" alt="${ecrit ? "" : escapeHtml(m.mot)}">` : ""}${ecrit ? escapeHtml(m.mot) : ""}</span>`;
}

// ── La mise en page ───────────────────────────────────────────────────────
//
// En millimètres, sur une page A4 à l'italienne : le centre au milieu, les
// branches en deux colonnes, chacune dans sa part de hauteur — rien ne
// déborde, rien ne se chevauche, quel que soit leur nombre.

export const LARGEUR = 256;
export const HAUTEUR = 168;
const LARGEUR_CENTRE = 70;
const LARGEUR_BRANCHE = 88;
const ECART = 4;

export interface Bloc { x: number; y: number; largeur: number; hauteur: number; cote: "gauche" | "droite" }

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

/** Le trait courbe du centre à une branche, qui part du bord du centre et arrive au milieu du bloc. */
export function trait(b: Bloc, rang: number, parCote: number): string {
  const cx = LARGEUR / 2, cy = HAUTEUR / 2;
  const sens = b.cote === "droite" ? 1 : -1;
  const x0 = cx + sens * (LARGEUR_CENTRE / 2 - 4);
  const y0 = cy + (rang - (parCote - 1) / 2) * Math.min(9, 32 / Math.max(1, parCote));
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

const image = (p: PictoPose | null, images: Images, classe: string) => {
  const cle = cleImage(p);
  const src = cle !== null ? images[cle] : undefined;
  return src ? `<img class="${classe}" src="${src}" alt="${escapeHtml(p?.mot ?? "")}">` : "";
};

/** La carte, prête à imprimer : le centre, les branches et leurs traits. */
export function htmlCarteMentale(r: ReglagesCarte, images: Images): string {
  const branches = branchesPleines(r);
  const blocs = blocsDesBranches(branches.length);
  const parCote = { droite: blocs.filter((b) => b.cote === "droite").length, gauche: blocs.filter((b) => b.cote === "gauche").length };
  const rangs = { droite: 0, gauche: 0 };
  // Les traits partent du centre dans l'ordre où les blocs se lisent de haut en bas, de chaque côté.
  const traits = blocs.map((b, i) => ({ b, i })).sort((p, q) => p.b.y - q.b.y)
    .map(({ b, i }) => `<path d="${trait(b, rangs[b.cote]++, parCote[b.cote])}" stroke="${branches[i].couleur}"/>`).join("");
  const centre = `<div class="cm-centre" style="left:${(LARGEUR - LARGEUR_CENTRE) / 2}mm;top:${HAUTEUR / 2 - 24}mm;width:${LARGEUR_CENTRE}mm;height:48mm">`
    + `${image(r.image, images, "cm-centre-image")}<div class="cm-centre-titre">${escapeHtml(r.centre.trim() || "…")}</div></div>`;
  const blocsHtml = branches.map((br, i) => {
    const b = blocs[i];
    const taille = tailleDesIdees(br.idees.length, b.hauteur - 13);
    const idees = br.idees.map((m) => idee(m, r.pictos && m.seul !== "mot" && m.id != null ? images[m.id] : undefined)).join("");
    return `<div class="cm-branche" style="left:${b.x}mm;top:${b.y.toFixed(1)}mm;width:${b.largeur}mm;height:${b.hauteur.toFixed(1)}mm;--c:${br.couleur}">`
      + `<div class="cm-titre">${image(br.image, images, "cm-titre-image")}<span>${escapeHtml(br.titre.trim() || "…")}</span></div>`
      + (idees ? `<div class="cm-idees cm-${taille}">${idees}</div>` : "") + `</div>`;
  }).join("");
  const ids = [r.image, ...branches.map((b) => b.image)].filter((p) => !p.photo && p.id != null && images[p.id]).map((p) => p.id)
    .concat(imagesDesIdees(r, branches.flatMap((b) => b.idees)).filter((id) => images[id]));
  return feuille(`<div class="page"><div class="cm-carte${r.capitales ? " cm-capitales" : ""}" style="width:${LARGEUR}mm;height:${HAUTEUR}mm">`
    + `<svg class="cm-traits" viewBox="0 0 ${LARGEUR} ${HAUTEUR}" width="${LARGEUR}mm" height="${HAUTEUR}mm">${traits}</svg>`
    + `${centre}${blocsHtml}</div></div>${attributionPour(ids)}`, "cm");
}

export const STYLE_CARTE_MENTALE = `
  @page { size: A4 landscape; margin: 10mm; }
  .feuille.cm .cm-carte { position: relative; margin: 0 auto; }
  .feuille.cm .cm-capitales { text-transform: uppercase; }
  .feuille.cm .cm-traits { position: absolute; left: 0; top: 0; }
  .feuille.cm .cm-traits path { fill: none; stroke-width: 1.6; stroke-linecap: round; }
  .feuille.cm .cm-centre { position: absolute; box-sizing: border-box; border: 1mm solid #1c2233; border-radius: 50%; background: #fff;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.5mm; padding: 4mm 8mm; text-align: center; }
  .feuille.cm .cm-centre-image { width: 17mm; height: 17mm; object-fit: contain; margin: 0; max-height: none; }
  .feuille.cm .cm-centre-titre { font-size: 24px; font-weight: 800; line-height: 1.12; }
  .feuille.cm .cm-branche { position: absolute; box-sizing: border-box; display: flex; flex-direction: column; border: 0.7mm solid var(--c);
    border-radius: 3.5mm; background: #fff; overflow: hidden; }
  .feuille.cm .cm-titre { flex: none; display: flex; align-items: center; gap: 2mm; background: var(--c); color: #fff; padding: 1.5mm 3mm;
    font-size: 17px; font-weight: 800; line-height: 1.1; min-height: 10mm; box-sizing: border-box; }
  .feuille.cm .cm-titre-image { width: 9mm; height: 9mm; object-fit: contain; margin: 0; max-height: none; background: #fff; border-radius: 1.5mm; flex: none; }
  .feuille.cm .cm-idees { flex: 1; min-height: 0; display: flex; flex-wrap: wrap; align-content: center; justify-content: center; gap: 1.5mm 3mm; padding: 2mm 3mm; }
  .feuille.cm .cm-idee { display: inline-flex; align-items: center; gap: 1.2mm; font-weight: 600; color: #1c2233; }
  .feuille.cm .cm-idee img { object-fit: contain; margin: 0; max-height: none; }
  .feuille.cm .cm-grande .cm-idee { font-size: 16px; }
  .feuille.cm .cm-grande .cm-idee img { width: 13mm; height: 13mm; }
  .feuille.cm .cm-moyenne .cm-idee { font-size: 13px; }
  .feuille.cm .cm-moyenne .cm-idee img { width: 9mm; height: 9mm; }
  .feuille.cm .cm-petite .cm-idee { font-size: 11px; }
  .feuille.cm .cm-petite .cm-idee img { width: 7mm; height: 7mm; }
  /* L'image seule prend la place du mot. */
  .feuille.cm .cm-grande .cm-image-seule img { width: 17mm; height: 17mm; }
  .feuille.cm .cm-moyenne .cm-image-seule img { width: 12mm; height: 12mm; }
  .feuille.cm .cm-petite .cm-image-seule img { width: 9mm; height: 9mm; }
`;
