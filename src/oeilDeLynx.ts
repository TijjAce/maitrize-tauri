// ── Œil de lynx ────────────────────────────────────────────────────────────
//
// En haut, une rangée de modèles ; dessous, un grand cadre plein de dessins
// où chacun se cache : l'élève le retrouve et l'entoure. C'est de
// l'exploration visuelle — balayer une image avec méthode, garder le modèle
// en tête, reconnaître une forme quand elle change de taille ou de sens.
//
// Ce qui rend la feuille plus ou moins difficile, ce sont ses variables :
// - le nombre de modèles et le nombre de dessins dans l'image ;
// - la disposition : en rangées, on balaie ligne par ligne, comme on lira ;
//   en vrac, il faut s'organiser seul ;
// - la taille : le dessin caché a-t-il celle du modèle ?
// - le sens : penché, retourné comme dans un miroir ;
// - les sosies : un autre dessin du même objet, qu'il ne faut pas entourer ;
// - la couleur : au trait, en noir et blanc, il ne reste que la forme.
// Les niveaux en proposent des réglages tout faits ; chaque variable se règle
// ensuite. La version « combien de fois ? » cache chaque modèle une à trois
// fois : on entoure, on compte, on écrit le nombre.
//
// Les dessins sont ceux de la banque, ou ceux de l'enseignant. Leurs bords
// transparents sont rognés avant la mise en page : deux dessins voisins sont
// séparés par un vrai blanc, pas par les marges invisibles de leurs images.

import { LARGEUR_CONTENU_MM, attributionPour, feuille, CREDIT_ARASAAC } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";
import { escapeHtml } from "./print";

export type DispositionLynx = "vrac" | "rangees";
export type IdNiveauLynx = "decouverte" | "facile" | "moyen" | "difficile" | "expert";

/** Ce que les niveaux règlent. */
export interface VariablesLynx {
  /** Combien de dessins à retrouver. */
  modeles: number;
  /** Combien de dessins dans l'image, ceux à retrouver compris. */
  dessins: number;
  disposition: DispositionLynx;
  /** Des tailles variées : le dessin caché n'a pas la taille de son modèle. */
  tailles: boolean;
  /** Certains dessins penchés. */
  tourner: boolean;
  /** Certains dessins retournés, comme dans un miroir. */
  retourner: boolean;
  /** Pour chaque modèle, un sosie : un autre dessin du même objet, à ne pas entourer. */
  ressemblants: boolean;
  /** Au trait, en noir et blanc : la forme sans la couleur. */
  trait: boolean;
}

export interface NiveauLynx extends VariablesLynx {
  id: IdNiveauLynx;
  libelle: string;
  /** Pour qui, d'ordinaire. */
  pour: string;
  /** Ce qui change à ce niveau, en une phrase. */
  aide: string;
}

const SANS_PIEGE = { tourner: false, retourner: false, ressemblants: false, trait: false };

export const NIVEAUX_LYNX: NiveauLynx[] = [
  { id: "decouverte", libelle: "Découverte — 3 dessins parmi 12", pour: "PS, MS",
    aide: "Les dessins en rangées, à la taille des modèles : on balaie l'image ligne par ligne, de gauche à droite.",
    modeles: 3, dessins: 12, disposition: "rangees", tailles: false, ...SANS_PIEGE },
  { id: "facile", libelle: "Facile — 4 dessins parmi 20", pour: "MS, GS",
    aide: "Les dessins en vrac, à la taille des modèles : il faut s'organiser pour ne rien oublier.",
    modeles: 4, dessins: 20, disposition: "vrac", tailles: false, ...SANS_PIEGE },
  { id: "moyen", libelle: "Moyen — 6 dessins parmi 35", pour: "GS, CP",
    aide: "Des tailles variées : le dessin caché est plus grand ou plus petit que son modèle.",
    modeles: 6, dessins: 35, disposition: "vrac", tailles: true, ...SANS_PIEGE },
  { id: "difficile", libelle: "Difficile — 8 dessins parmi 50", pour: "CP, CE1",
    aide: "Des tailles variées, et des dessins penchés : la forme se reconnaît dans un autre sens.",
    modeles: 8, dessins: 50, disposition: "vrac", tailles: true, ...SANS_PIEGE, tourner: true },
  { id: "expert", libelle: "Expert — 10 dessins parmi 70", pour: "CE1 et au-delà",
    aide: "Au trait, en noir et blanc ; penchés, retournés ; et des sosies — un autre dessin du même objet, qu'il ne faut pas entourer.",
    modeles: 10, dessins: 70, disposition: "vrac", tailles: true, tourner: true, retourner: true, ressemblants: true, trait: true },
];

export const niveauLynx = (id: string): NiveauLynx => NIVEAUX_LYNX.find((n) => n.id === id) ?? NIVEAUX_LYNX[3];

export interface ReglagesLynx extends VariablesLynx {
  titre: string;
  niveau: IdNiveauLynx;
  /** Chaque modèle se cache une à trois fois : on entoure, on compte, on écrit le nombre. */
  compter: boolean;
  /** Le mot sous chaque modèle. */
  legendes: boolean;
  /** Où piocher les dessins qui cachent les modèles : "" pour toute sorte, sinon une catégorie de la banque. */
  intrus: string;
}

/** Les variables d'un niveau, à poser sur les réglages quand on le choisit. */
export function variablesDuNiveau(id: IdNiveauLynx): VariablesLynx {
  const { modeles, dessins, disposition, tailles, tourner, retourner, ressemblants, trait } = niveauLynx(id);
  return { modeles, dessins, disposition, tailles, tourner, retourner, ressemblants, trait };
}

export const REGLAGES_LYNX: ReglagesLynx = {
  titre: "Cherche et trouve", niveau: "difficile", ...variablesDuNiveau("difficile"), compter: false, legendes: false, intrus: "",
};

export const MODELES_MAX = 12;
export const DESSINS_MAX = 100;

/** Les réglages tels qu'on peut s'y fier : un réglage gardé d'une version à l'autre, ou modifié à la main. */
export function reglagesLynxSurs(brut: Partial<ReglagesLynx>): ReglagesLynx {
  const r = { ...REGLAGES_LYNX, ...brut };
  const entier = (v: unknown, min: number, max: number, defaut: number) =>
    (typeof v === "number" && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v))) : defaut);
  const oui = (v: unknown, defaut: boolean) => (typeof v === "boolean" ? v : defaut);
  const modeles = entier(r.modeles, 1, MODELES_MAX, REGLAGES_LYNX.modeles);
  return {
    titre: typeof r.titre === "string" ? r.titre : REGLAGES_LYNX.titre,
    niveau: NIVEAUX_LYNX.some((n) => n.id === r.niveau) ? r.niveau : REGLAGES_LYNX.niveau,
    modeles,
    // Au moins un dessin de plus que de modèles : sinon il n'y a rien à chercher.
    dessins: entier(r.dessins, modeles + 1, DESSINS_MAX, Math.max(modeles + 1, REGLAGES_LYNX.dessins)),
    disposition: r.disposition === "rangees" ? "rangees" : "vrac",
    tailles: oui(r.tailles, REGLAGES_LYNX.tailles), tourner: oui(r.tourner, false), retourner: oui(r.retourner, false),
    ressemblants: oui(r.ressemblants, false), trait: oui(r.trait, false), compter: oui(r.compter, false), legendes: oui(r.legendes, false),
    intrus: typeof r.intrus === "string" ? r.intrus : "",
  };
}

/** Vrai quand une variable s'écarte de celles du niveau choisi. */
export function niveauModifie(r: ReglagesLynx): boolean {
  const v = variablesDuNiveau(r.niveau);
  return (Object.keys(v) as (keyof VariablesLynx)[]).some((k) => v[k] !== r[k]);
}

// ── Le choix des dessins ───────────────────────────────────────────────────

export interface DessinLynx { id: number; mot: string }
export interface ModeleLynx extends DessinLynx { fois: number }
/** Un sosie : un autre dessin du même mot que le modèle `de`. */
export interface SosieLynx extends DessinLynx { de: number }
export interface ChoixLynx {
  modeles: ModeleLynx[];
  /** Les dessins qui cachent les modèles. */
  intrus: DessinLynx[];
  /** Les modèles viennent de la liste de l'enseignant, pas de la banque. */
  deLaListe: boolean;
}

/** La clé d'un mot, pour reconnaître deux fois le même. */
export const cleDuMot = (mot: string) => mot.trim().toLowerCase();

const unParId = <T extends DessinLynx>(liste: T[]) => liste.filter((d, i) => liste.findIndex((x) => x.id === d.id) === i);
const unParMot = <T extends DessinLynx>(liste: T[]) => liste.filter((d, i) => liste.findIndex((x) => cleDuMot(x.mot) === cleDuMot(d.mot)) === i);

/** Les dessins tirés en plus de ceux qu'il faut, pour qu'une image qui manque ne laisse pas de trou. */
const RESERVE = 5;

/** Combien de fois chaque modèle se cache : une fois, ou d'une à trois fois quand on compte — jamais toutes pareilles. */
export function foisDesModeles(n: number, compter: boolean, r: () => number): number[] {
  if (!compter) return Array.from({ length: n }, () => 1);
  const fois = Array.from({ length: n }, () => 1 + Math.floor(r() * 3));
  if (n > 1 && fois.every((f) => f === fois[0])) fois[Math.floor(r() * n)] = (fois[0] % 3) + 1;
  return fois;
}

/**
 * Les modèles et les dessins qui les cachent.
 *
 * Les modèles se tirent dans la liste de l'enseignant quand il en a donné
 * une, dans la banque sinon. Les autres mots de sa liste se cachent dans
 * l'image, puis la banque complète. Aucun dessin caché ne porte le mot d'un
 * modèle : un autre chat qu'on ne doit pas entourer est un sosie, et ne
 * vient que si on les demande.
 *
 * `exclus` écarte des dessins de la banque — les scènes, reconnues une fois
 * leur image lue. Tout se mélange avant qu'on les écarte : un dessin écarté
 * laisse sa place au suivant, et le reste du tirage ne bouge pas.
 */
export function choisirDessins(
  liste: DessinLynx[], vivier: DessinLynx[], r: ReglagesLynx, graine: number, exclus: ReadonlySet<number> = new Set(),
  /** Les dessins que les enfants connaissent — des animaux, des fruits, des jouets — : les modèles tirés dans la banque viennent d'eux. */
  familiers?: ReadonlySet<number> | null,
): ChoixLynx {
  const tirage = hasard(graine);
  const miens = unParId(liste);
  const deLaListe = miens.length > 0;
  const ordreDeLaListe = melanger(tirage, miens);
  const ordreDeLaBanque = melanger(tirage, unParMot(unParId(vivier))).filter((d) => !exclus.has(d.id));
  const connus = familiers?.size ? ordreDeLaBanque.filter((d) => familiers.has(d.id)) : [];
  const modeles = (deLaListe ? ordreDeLaListe : connus.length >= r.modeles ? connus : ordreDeLaBanque).slice(0, r.modeles);
  const fois = foisDesModeles(r.modeles, r.compter, tirage).slice(0, modeles.length);
  const ids = new Set(modeles.map((m) => m.id));
  const mots = new Set(modeles.map((m) => cleDuMot(m.mot)));
  const libre = (d: DessinLynx) => !ids.has(d.id) && !mots.has(cleDuMot(d.mot));
  const resteDeLaListe = deLaListe ? ordreDeLaListe.filter(libre) : [];
  const dejaPris = new Set(resteDeLaListe.map((d) => d.id));
  const candidats = [...resteDeLaListe, ...ordreDeLaBanque.filter((d) => libre(d) && !dejaPris.has(d.id))];
  // De quoi remplir l'image sans sosie, et quelques-uns d'avance : la place d'un sosie que la banque n'a pas, d'une image qui ne se lit pas.
  const besoin = Math.max(0, r.dessins - fois.reduce((a, b) => a + b, 0)) + RESERVE;
  // Une liste trop courte et pas de banque : les mêmes dessins reviennent, plutôt qu'une image vide.
  const intrus = candidats.length ? Array.from({ length: besoin }, (_, i) => candidats[i % candidats.length]) : [];
  return { modeles: modeles.map((m, i) => ({ id: m.id, mot: m.mot, fois: fois[i] })), intrus, deLaListe };
}

/** Le sosie d'un modèle parmi des dessins trouvés dans la banque : le même mot, un autre dessin. */
export function sosieDe(modele: DessinLynx, trouves: DessinLynx[]): SosieLynx | null {
  const s = trouves.find((t) => t.id !== modele.id && cleDuMot(t.mot) === cleDuMot(modele.mot));
  return s ? { id: s.id, mot: s.mot, de: modele.id } : null;
}

// ── La page ────────────────────────────────────────────────────────────────
//
// Tout se compte en millimètres, dans la largeur que la feuille occupe à
// l'impression. La hauteur garde de quoi loger les pictos d'une consigne et la
// mention des pictogrammes : la feuille tient sur une page, quoi qu'on coche.

/** La hauteur que la feuille peut occuper sur une page A4 imprimée. */
export const HAUTEUR_FEUILLE_MM = 246;
const TETE_MM = 12;
const CONSIGNE_MM = 19;
const MENTION_MM = 6;
const LEGENDE_MM = 4.5;
const COMPTE_MM = 9;
const ECART_MODELES_MM = 2;
/** La largeur du cadre, bordure comprise. */
const LARGEUR_CADRE_MM = LARGEUR_CONTENU_MM - 1;
/** Le blanc entre deux dessins, et entre un dessin et le cadre. */
const ECART_MM = 1.6;
const BORD_MM = 2;
/** La part du cadre que les dessins couvrent, en vrac. */
const DENSITE = 0.46;

/** Combien de modèles par rangée, et combien de rangées. */
export function rangeesDeModeles(n: number): { parRangee: number; rangees: number } {
  return n <= 10 ? { parRangee: Math.max(1, n), rangees: 1 } : { parRangee: Math.ceil(n / 2), rangees: 2 };
}

/** Le côté le plus grand qu'une case de modèle peut avoir dans sa rangée. */
const caseMaximale = (parRangee: number) => Math.min(34, (LARGEUR_CONTENU_MM - (parRangee - 1) * ECART_MODELES_MM) / parRangee);

/** La hauteur du cadre, quand les modèles ont des cases de `c` mm. */
function hauteurDuCadre(r: ReglagesLynx, rangees: number, c: number): number {
  const parRangee = c + (r.legendes ? LEGENDE_MM : 0) + (r.compter ? COMPTE_MM : 0) + ECART_MODELES_MM;
  return HAUTEUR_FEUILLE_MM - TETE_MM - CONSIGNE_MM - MENTION_MM - rangees * parRangee - 3;
}

/** Le rapport largeur sur hauteur d'un dessin, borné : une épée ne doit pas traverser la page. */
const rapportBorne = (rapport: number | undefined) => Math.max(0.3, Math.min(3.3, rapport && Number.isFinite(rapport) ? rapport : 1));

/** Les dimensions d'un dessin de « taille » `s` : un rectangle de même surface qu'un carré de côté `s`. */
function dimensions(s: number, rapport: number): [number, number] {
  const k = Math.sqrt(rapportBorne(rapport));
  return [s * k, s / k];
}

/** La place qu'occupe un rectangle penché : sa boîte droite. */
export function encombrement(l: number, h: number, angle: number): [number, number] {
  const a = (Math.abs(angle) * Math.PI) / 180;
  return [l * Math.cos(a) + h * Math.sin(a), l * Math.sin(a) + h * Math.cos(a)];
}

export type RoleLynx = "cible" | "sosie" | "intrus";

export interface PlaceLynx {
  id: number;
  mot: string;
  /** Le centre du dessin dans le cadre, en mm. */
  x: number;
  y: number;
  /** Ses dimensions avant qu'on le penche. */
  l: number;
  h: number;
  angle: number;
  miroir: boolean;
  role: RoleLynx;
  /** Pour une cible ou un sosie : le rang de son modèle. */
  modele?: number;
}

export interface ModelePlace extends ModeleLynx { l: number; h: number }

export interface PlancheLynx {
  modeles: ModelePlace[];
  places: PlaceLynx[];
  /** L'intérieur du cadre, en mm. */
  cadre: { l: number; h: number };
  /** Le côté d'une case de modèle. */
  caseModele: number;
  parRangee: number;
  /** Les dessins qui n'ont pas trouvé de place : l'image en montre moins qu'on n'en demandait. */
  nonPlaces: number;
}

interface APlacer { d: DessinLynx; role: RoleLynx; modele?: number; facteur: number; angle: number; miroir: boolean }

/** Un dessin posé : son centre, ses dimensions, son angle — de quoi savoir s'il en touche un autre. */
export interface Rectangle { x: number; y: number; l: number; h: number; angle: number }

/**
 * Deux dessins se touchent-ils, à `ecart` près ? On compare les rectangles
 * eux-mêmes, penchés, par leurs projections sur les quatre côtés : deux
 * dessins penchés peuvent s'imbriquer là où leurs boîtes droites se
 * recouvriraient.
 */
export function seTouchent(a: Rectangle, b: Rectangle, ecart = 0): boolean {
  // Loin l'un de l'autre, d'une diagonale à l'autre : inutile d'aller plus loin — c'est le cas de presque toutes les paires.
  const dx = b.x - a.x, dy = b.y - a.y;
  const portee = (Math.hypot(a.l + ecart, a.h + ecart) + Math.hypot(b.l + ecart, b.h + ecart)) / 2;
  if (dx * dx + dy * dy >= portee * portee) return false;
  const ra = (a.angle * Math.PI) / 180, rb = (b.angle * Math.PI) / 180;
  const demi = (o: Rectangle, t: number, r: number) =>
    ((o.l + ecart) / 2) * Math.abs(Math.cos(r - t)) + ((o.h + ecart) / 2) * Math.abs(Math.sin(r - t));
  for (const t of [ra, ra + Math.PI / 2, rb, rb + Math.PI / 2]) {
    const d = Math.abs(dx * Math.cos(t) + dy * Math.sin(t));
    if (d >= demi(a, t, ra) + demi(b, t, rb)) return false;
  }
  return true;
}

/**
 * En vrac : les dessins à retrouver d'abord, à des places tirées au sort,
 * puis les autres, du plus grand au plus petit — les petits se glissent
 * entre les grands. Quand le hasard ne trouve plus de place, on passe le
 * cadre au peigne fin et l'on tire parmi les places libres ; à défaut, le
 * dessin rapetisse un peu et réessaie — sans devenir une miette : un dessin
 * qui ne tient toujours pas reste dehors. Un dessin à retrouver, placé en
 * premier, trouve toujours la sienne.
 */
function enVrac(items: APlacer[], ratios: Record<number, number>, l: number, h: number, s0: number, tirage: () => number): { places: PlaceLynx[]; nonPlaces: number } {
  const places: PlaceLynx[] = [];
  let nonPlaces = 0;
  const ordre = [
    ...items.filter((i) => i.role !== "intrus"),
    ...items.filter((i) => i.role === "intrus").sort((a, b) => b.facteur - a.facteur),
  ];
  const libre = (b: Rectangle) => !places.some((o) => seTouchent(o, b, ECART_MM));
  for (const it of ordre) {
    const depart = s0 * it.facteur;
    const plancher = it.role === "intrus" ? Math.max(depart * 0.6, s0 * 0.55) : 4;
    let trouvee: Rectangle | null = null;
    for (let s = depart; !trouvee && s >= plancher; s *= 0.88) {
      const [dl, dh] = dimensions(s, ratios[it.d.id]);
      // Le cadre, lui, se garde avec la boîte droite : un coin penché ne doit pas en sortir.
      const [bl, bh] = encombrement(dl, dh, it.angle);
      const jeuX = l - 2 * BORD_MM - bl, jeuY = h - 2 * BORD_MM - bh;
      if (jeuX < 0 || jeuY < 0) continue;
      const en = (x: number, y: number): Rectangle => ({ x: BORD_MM + bl / 2 + x, y: BORD_MM + bh / 2 + y, l: dl, h: dh, angle: it.angle });
      for (let k = 0; k < 250 && !trouvee; k++) {
        const b = en(tirage() * jeuX, tirage() * jeuY);
        if (libre(b)) trouvee = b;
      }
      if (!trouvee) {
        const libres: Rectangle[] = [];
        for (let y = 0; y <= jeuY; y += 1.5) for (let x = 0; x <= jeuX; x += 1.5) {
          const b = en(x, y);
          if (libre(b)) libres.push(b);
        }
        if (libres.length) trouvee = libres[Math.floor(tirage() * libres.length)];
      }
    }
    if (!trouvee) { nonPlaces++; continue; }
    places.push({ id: it.d.id, mot: it.d.mot, ...trouvee, miroir: it.miroir, role: it.role, modele: it.modele });
  }
  return { places, nonPlaces };
}

/** La grille des rangées : autant de cases que de dessins, à peu près carrées, et la taille d'un dessin dans sa case. */
function grilleDe(n: number, l: number, h: number): { colonnes: number; cl: number; ch: number; s: number } {
  let colonnes = Math.max(1, Math.round(Math.sqrt((n * l) / h)));
  while (colonnes * Math.ceil(n / colonnes) < n) colonnes++;
  const cl = l / colonnes, ch = h / Math.max(1, Math.ceil(n / colonnes));
  return { colonnes, cl, ch, s: Math.min(cl, ch) * 0.68 };
}

/** En rangées : une grille régulière, les dessins dans un ordre tiré au sort, chacun centré dans sa case. */
function enRangees(items: APlacer[], ratios: Record<number, number>, l: number, h: number, s: number, tirage: () => number): PlaceLynx[] {
  const { colonnes, cl, ch } = grilleDe(items.length, l, h);
  return melanger(tirage, items).map((it, i): PlaceLynx => {
    const [dl, dh] = dimensions(s * it.facteur, ratios[it.d.id]);
    // Un dessin allongé ne déborde pas de sa case.
    const [bl, bh] = encombrement(dl, dh, it.angle);
    const k = Math.min(1, (cl - ECART_MM * 2) / bl, (ch - ECART_MM * 2) / bh);
    return {
      id: it.d.id, mot: it.d.mot, x: (i % colonnes + 0.5) * cl, y: (Math.floor(i / colonnes) + 0.5) * ch, l: dl * k, h: dh * k,
      angle: it.angle, miroir: it.miroir, role: it.role, modele: it.modele,
    };
  });
}

/** Un facteur de taille, entre `min` et `max`, réparti comme les tailles d'une image : autant de petits que de grands. */
const facteurAuHasard = (tirage: () => number, min: number, max: number) => min * Math.exp(tirage() * Math.log(max / min));

/**
 * La planche : les modèles et leurs cases, puis la place de chaque dessin
 * dans le cadre. `ratios` donne, pour chaque image, sa largeur sur sa
 * hauteur une fois rognée ; une image qui n'en a pas ne s'est pas chargée, et
 * reste dehors — un modèle sans image aussi.
 */
export function plancheLynx(choix: ChoixLynx, sosies: SosieLynx[], ratios: Record<number, number>, r: ReglagesLynx, graine: number): PlancheLynx {
  const tirage = hasard(graine + 17);
  const modeles = choix.modeles.filter((m) => ratios[m.id]);
  const { parRangee, rangees } = rangeesDeModeles(modeles.length);
  const cMax = caseMaximale(parRangee);
  let c = Math.min(24, cMax);
  const l = LARGEUR_CADRE_MM - 1;
  let h = hauteurDuCadre(r, rangees, c);

  const sens = () => ({
    angle: r.tourner && tirage() < 0.55 ? (tirage() < 0.5 ? -1 : 1) * (12 + tirage() * 28) : 0,
    miroir: r.retourner && tirage() < 0.4,
  });
  const items: APlacer[] = [];
  modeles.forEach((m, rang) => {
    for (let k = 0; k < m.fois; k++) items.push({ d: m, role: "cible", modele: rang, facteur: r.tailles ? facteurAuHasard(tirage, 0.6, 1.35) : 1, ...sens() });
  });
  for (const s of sosies) {
    const rang = modeles.findIndex((m) => m.id === s.de);
    if (rang >= 0 && ratios[s.id]) items.push({ d: s, role: "sosie", modele: rang, facteur: r.tailles ? facteurAuHasard(tirage, 0.6, 1.35) : 1, ...sens() });
  }
  // Les autres dessins complètent jusqu'au compte : un sosie que la banque n'a pas laisse sa place à un dessin de plus.
  const reste = Math.max(0, r.dessins - items.length);
  for (const d of choix.intrus.filter((x) => ratios[x.id]).slice(0, reste)) {
    items.push({ d, role: "intrus", facteur: r.tailles ? facteurAuHasard(tirage, 0.68, 1.45) : 1, ...sens() });
  }

  // La taille de référence : en rangées, celle que permet une case de la grille ; en vrac, celle qui couvre la part voulue du cadre.
  const moyenneCarres = items.length ? items.reduce((a, it) => a + it.facteur * it.facteur, 0) / items.length : 1;
  const tailleDeReference = (hauteur: number) => (r.disposition === "rangees"
    ? grilleDe(Math.max(1, items.length), l, hauteur).s
    // Le blanc qui sépare deux dessins compte dans la place qu'ils prennent.
    : Math.max(8, Math.min(34, Math.sqrt((DENSITE * l * hauteur) / Math.max(1, items.length * moyenneCarres)) - ECART_MM / 2)));
  let s0 = tailleDeReference(h);
  if (!r.tailles) {
    // Le modèle a la taille du dessin caché : sa case s'agrandit, dans la limite de la rangée — et le cadre, plus bas, se recalcule.
    const allonge = Math.max(1, ...modeles.map((m) => { const [a, b] = dimensions(1, ratios[m.id]); return Math.max(a, b); }));
    s0 = Math.min(s0, (cMax - 3) / allonge);
    c = Math.max(c, Math.min(cMax, s0 * allonge + 3));
    h = hauteurDuCadre(r, rangees, c);
    s0 = Math.min(s0, tailleDeReference(h));
  }

  let places: PlaceLynx[], nonPlaces = 0;
  if (r.disposition === "rangees") places = enRangees(items, ratios, l, h, s0, tirage);
  else ({ places, nonPlaces } = enVrac(items, ratios, l, h, s0, tirage));

  // Les modèles : à la taille du dessin caché quand les tailles ne varient pas, à celle de leur case sinon.
  const interieur = c - 3;
  const placesModeles = modeles.map((m): ModelePlace => {
    const cachee = places.find((p) => p.role === "cible" && p.id === m.id);
    const [ml, mh] = !r.tailles && cachee ? [cachee.l, cachee.h] : dimensions(interieur, ratios[m.id]);
    // Ce qui dépasserait de la case se réduit : un dessin allongé, une case que la rangée n'a pas pu agrandir.
    const k = Math.min(1, interieur / ml, interieur / mh);
    return { ...m, l: ml * k, h: mh * k };
  });
  return { modeles: placesModeles, places, cadre: { l, h }, caseModele: c, parRangee, nonPlaces };
}

// ── Le HTML ────────────────────────────────────────────────────────────────

/** Un œil, dessiné au trait. */
const OEIL = `<svg class="lx-oeil" viewBox="0 0 48 28" aria-hidden="true"><path d="M3 15 Q24 -3 45 15 Q24 31 3 15 Z" fill="#fff" stroke="#1c2233" stroke-width="2.2" stroke-linejoin="round"/>`
  + `<circle cx="24" cy="14.5" r="7.2" fill="none" stroke="#1c2233" stroke-width="2"/><circle cx="24" cy="14.5" r="3.6" fill="#1c2233"/>`
  + `<circle cx="22.3" cy="12.8" r="1.2" fill="#fff"/><path d="M10 7 L7 3 M17 3.6 L15.6 -0.6 M24 2.6 L24 -1.6 M31 3.6 L32.4 -0.6 M38 7 L41 3" stroke="#1c2233" stroke-width="1.8" stroke-linecap="round"/></svg>`;

const mm = (v: number) => `${v.toFixed(1)}mm`;

/** La consigne de la feuille. */
export function consigneLynx(r: ReglagesLynx): string {
  const base = r.compter
    ? "Combien de fois vois-tu chaque dessin ? Entoure-les dans l'image, puis écris le nombre dans la case."
    : "Observe l'image et entoure les dessins demandés.";
  return base + (r.ressemblants ? " Attention : certains dessins se ressemblent beaucoup !" : "");
}

function rangeeDesModeles(p: PlancheLynx, images: Record<number, string>, r: ReglagesLynx, corrige: boolean): string {
  const cases = p.modeles.map((m) => `<div class="lx-modele">`
    + `<div class="lx-case" style="width:${mm(p.caseModele)};height:${mm(p.caseModele)}">`
    + `<img src="${images[m.id] ?? ""}" alt="${escapeHtml(m.mot)}" style="width:${mm(m.l)};height:${mm(m.h)}"></div>`
    + (r.legendes ? `<div class="lx-mot">${escapeHtml(m.mot)}</div>` : "")
    + (r.compter ? `<div class="lx-compte">${corrige ? `<b>${m.fois}</b>` : ""}</div>` : "")
    + `</div>`).join("");
  return `<div class="lx-modeles" style="grid-template-columns:repeat(${p.parRangee}, ${mm(p.caseModele)})">${cases}</div>`;
}

function cadre(p: PlancheLynx, images: Record<number, string>, corrige: boolean): string {
  const dessins = p.places.map((d) => {
    const transformation = [d.angle ? `rotate(${d.angle.toFixed(1)}deg)` : "", d.miroir ? "scaleX(-1)" : ""].filter(Boolean).join(" ");
    return `<img class="lx-d" src="${images[d.id] ?? ""}" alt="${escapeHtml(d.mot)}" style="left:${mm(d.x - d.l / 2)};top:${mm(d.y - d.h / 2)};`
      + `width:${mm(d.l)};height:${mm(d.h)}${transformation ? `;transform:${transformation}` : ""}">`;
  }).join("");
  // Au corrigé : les dessins à entourer dans un rond rouge, les sosies dans un rond gris en tirets.
  const ronds = corrige ? p.places.filter((d) => d.role !== "intrus").map((d) => {
    const [bl, bh] = encombrement(d.l, d.h, d.angle);
    const rl = bl + 3.5, rh = bh + 3.5;
    return `<div class="lx-rond${d.role === "sosie" ? " lx-piege" : ""}" style="left:${mm(d.x - rl / 2)};top:${mm(d.y - rh / 2)};width:${mm(rl)};height:${mm(rh)}"></div>`;
  }).join("") : "";
  return `<div class="lx-cadre" style="width:${mm(p.cadre.l)};height:${mm(p.cadre.h)}">${dessins}${ronds}</div>`;
}

/** Les dessins d'ARASAAC passés au trait en sont une adaptation : la licence demande de le dire. */
const MENTION_TRAIT = `<div class="attribution">${CREDIT_ARASAAC} Les dessins au trait sont tirés de ces pictogrammes, sous la même licence.</div>`;

/** La feuille de l'élève, puis le corrigé : les mêmes dessins, aux mêmes places, ceux à trouver entourés. */
export function htmlLynx(p: PlancheLynx | null, images: Record<number, string>, r: ReglagesLynx): string {
  const titre = escapeHtml(r.titre.trim() || REGLAGES_LYNX.titre);
  if (!p || !p.modeles.length) {
    return feuille(`<div class="page"><div class="titre">${titre}</div><div class="sous">Les dessins se préparent…</div></div>`, "lx");
  }
  const page = `<div class="page lx-page"><div class="lx-tete"><div class="titre lx-titre">${OEIL}<span>${titre}</span></div>`
    + `<div class="lx-nom">Prénom : ............................ Date : ....................</div></div>`
    + `<p class="consigne lx-consigne">${escapeHtml(consigneLynx(r))}</p>`
    + rangeeDesModeles(p, images, r, false) + cadre(p, images, false) + `</div>`;
  const corrige = `<div class="page lx-page corrige"><div class="lx-tete"><div class="titre lx-titre">${OEIL}<span>${titre} — corrigé</span></div></div>`
    + rangeeDesModeles(p, images, r, true) + cadre(p, images, true) + `</div>`;
  const ids = [...p.modeles.map((m) => m.id), ...p.places.map((d) => d.id)];
  return feuille(page + corrige + attributionPour(ids, r.trait ? MENTION_TRAIT : undefined), "lx");
}

export const STYLE_LYNX = `
  .feuille.lx .lx-tete { display: flex; align-items: center; justify-content: space-between; gap: 6mm; margin: 0 0 1.5mm; }
  .feuille.lx .lx-titre { display: flex; align-items: center; gap: 2.5mm; margin: 0; font-size: 22px; }
  .feuille.lx .lx-oeil { width: 13mm; height: 7.6mm; flex: none; }
  .feuille.lx .lx-nom { font-size: 12px; color: #4a5065; white-space: nowrap; }
  .feuille.lx .lx-consigne { font-size: 14px; font-weight: 600; margin: 0 0 2.5mm; line-height: 1.35; }
  .feuille.lx .lx-modeles { display: grid; gap: ${ECART_MODELES_MM}mm; justify-content: center; margin: 0 0 3mm; }
  .feuille.lx .lx-modele { display: flex; flex-direction: column; align-items: center; break-inside: avoid; }
  .feuille.lx .lx-case { box-sizing: border-box; border: 0.45mm solid #1c2233; border-radius: 1.5mm; display: flex;
    align-items: center; justify-content: center; overflow: hidden; }
  .feuille.lx .lx-case img { margin: 0; max-width: none; max-height: none; object-fit: contain; }
  .feuille.lx .lx-mot { font-size: 10.5px; font-weight: 700; line-height: 1.1; margin-top: 0.8mm; text-align: center; max-width: 100%;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .feuille.lx .lx-compte { box-sizing: border-box; width: 9mm; height: 7mm; margin-top: 1.5mm; border: 0.35mm solid #687087; border-radius: 1mm;
    display: flex; align-items: center; justify-content: center; font-size: 15px; color: #d0342c; }
  .feuille.lx .lx-cadre { position: relative; box-sizing: content-box; margin: 0 auto; border: 0.5mm solid #1c2233; border-radius: 2mm;
    overflow: hidden; break-inside: avoid; page-break-inside: avoid; }
  .feuille.lx .lx-d { position: absolute; margin: 0; max-width: none; max-height: none; object-fit: contain; }
  .feuille.lx .lx-rond { position: absolute; box-sizing: border-box; border: 0.7mm solid #d0342c; border-radius: 50%; }
  .feuille.lx .lx-rond.lx-piege { border: 0.45mm dashed #8a8f9c; }
`;

// ── Les images ─────────────────────────────────────────────────────────────

/**
 * Le cadre utile d'une image : ce qui est peint d'un dessin détouré, ou ce
 * qui n'est pas du blanc d'une image sans transparence. Rien de peint : toute
 * l'image.
 */
export function cadrage(rgba: Uint8ClampedArray, largeur: number, hauteur: number): { x: number; y: number; l: number; h: number } {
  const n = largeur * hauteur;
  let transparents = 0;
  for (let i = 0; i < n; i++) if (rgba[i * 4 + 3] < 128) transparents++;
  const detoure = transparents >= Math.max(4, n * 0.01);
  let x0 = largeur, y0 = hauteur, x1 = -1, y1 = -1;
  for (let y = 0; y < hauteur; y++) for (let x = 0; x < largeur; x++) {
    const i = (y * largeur + x) * 4;
    const peint = detoure ? rgba[i + 3] > 24 : rgba[i + 3] > 24 && Math.min(rgba[i], rgba[i + 1], rgba[i + 2]) < 240;
    if (!peint) continue;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  if (x1 < 0) return { x: 0, y: 0, l: largeur, h: hauteur };
  return { x: x0, y: y0, l: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/**
 * La part du cadre utile qu'une image peint pour de bon. Un objet détouré en
 * laisse toujours un peu de transparent autour de lui ; une scène — une
 * boutique, un billet de train, un conducteur dans sa voiture — remplit son
 * rectangle : ce n'est pas un objet qu'on cherche des yeux.
 */
export function remplissage(rgba: Uint8ClampedArray, largeur: number, zone: { x: number; y: number; l: number; h: number }): number {
  let peints = 0;
  for (let y = zone.y; y < zone.y + zone.h; y++) for (let x = zone.x; x < zone.x + zone.l; x++) if (rgba[(y * largeur + x) * 4 + 3] > 128) peints++;
  return peints / Math.max(1, zone.l * zone.h);
}

/** Au-delà, une image de la banque est une scène : on ne la tire pas. */
export const SEUIL_SCENE = 0.93;

/**
 * Le dessin au trait. Les contours d'un pictogramme sont noirs, ses aplats
 * en couleur : ce qui est presque noir reste noir, le reste devient blanc —
 * un rouge vif ne noircit pas, il n'est sombre qu'en apparence. Une photo n'a
 * pas de contour à garder : elle passe en gris.
 */
export function auTrait(rgba: Uint8ClampedArray, largeur: number, hauteur: number): Uint8ClampedArray {
  const n = largeur * hauteur;
  const sortie = new Uint8ClampedArray(n * 4);
  let transparents = 0;
  for (let i = 0; i < n; i++) if (rgba[i * 4 + 3] < 128) transparents++;
  const detoure = transparents >= Math.max(4, n * 0.01);
  for (let i = 0; i < n * 4; i += 4) {
    const a = rgba[i + 3];
    if (a < 8) continue;
    const [r, v, b] = [rgba[i], rgba[i + 1], rgba[i + 2]];
    let gris: number;
    if (detoure) {
      const clair = Math.max(r, v, b);
      gris = clair <= 60 ? 0 : clair >= 120 ? 255 : Math.round(((clair - 60) / 60) * 255);
    } else {
      gris = Math.round(0.299 * r + 0.587 * v + 0.114 * b);
    }
    sortie[i] = gris; sortie[i + 1] = gris; sortie[i + 2] = gris; sortie[i + 3] = a;
  }
  return sortie;
}

/**
 * La part d'encre d'un dessin passé au trait : les points sombres parmi ceux
 * qui sont peints. Un pictogramme sans contour noir — un ressort arc-en-ciel —
 * n'en garde presque pas : au trait, il disparaîtrait.
 */
export function encre(rgba: Uint8ClampedArray): number {
  let peints = 0, sombres = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] <= 128) continue;
    peints++;
    if (rgba[i] < 128) sombres++;
  }
  return peints ? sombres / peints : 0;
}

/** En deçà, un dessin n'a pas de trait : la banque en tire un autre, et un dessin de l'enseignant passe en gris. */
export const SEUIL_ENCRE = 0.03;

/** Le dessin en gris, quand il n'a pas de trait à garder. */
export function enGris(rgba: Uint8ClampedArray): Uint8ClampedArray {
  const sortie = new Uint8ClampedArray(rgba.length);
  for (let i = 0; i < rgba.length; i += 4) {
    const gris = Math.round(0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2]);
    sortie[i] = gris; sortie[i + 1] = gris; sortie[i + 2] = gris; sortie[i + 3] = rgba[i + 3];
  }
  return sortie;
}

/** Les catégories de la banque où piocher des dessins de toute sorte : des choses qui se dessinent et se nomment. */
export const CATEGORIES_LYNX = [
  "core vocabulary-object", "object", "toy", "clothes", "footwear", "accessories", "jewelry", "utensil", "container", "furniture",
  "electrical appliance", "work tool", "hardware", "sport material", "educational material", "music device", "percussion instrument",
  "string instrument", "wind instrument", "keyboard instrument", "fruit", "vegetable", "dessert", "sweets", "terrestrial animal",
  "wild animal", "domestic animal", "marine animal", "river animal", "bird", "insect", "fish", "flying animal", "flower",
  "land transport", "aerial transport", "water transport", "board game",
];

/** Parmi elles, celles que les enfants connaissent et nomment : les modèles tirés au sort viennent d'ici. */
export const CATEGORIES_FAMILIERES = [
  "core vocabulary-object", "toy", "clothes", "footwear", "utensil", "furniture", "sport material", "fruit", "vegetable", "dessert", "sweets",
  "terrestrial animal", "wild animal", "domestic animal", "marine animal", "bird", "insect", "flying animal", "flower", "land transport",
  "aerial transport", "water transport", "percussion instrument", "string instrument", "wind instrument",
];

/** Ce qui ne se cache pas dans une image d'enfant, ou ne s'y reconnaît pas : les actions, les armes, le corps, les personnes, les lieux. */
export const EXCLUES_LYNX = [
  "verb", "commercial building", "residential building", "building facility", "building room", "hospital room", "educational space",
  "recreational facility", "weapon", "war", "gender violence", "drug addiction", "disease", "symptom", "human anatomy", "professional", "family",
  "feeling", "covid-19", "medical procedure", "medical test", "religious object", "christianity", "flag", "country", "signaling system",
  "letter", "number", "numeral adjective", "qualifying adjective", "expression", "disruptive behavior", "sanitary professional",
  "health personnel", "athlete", "group",
];
