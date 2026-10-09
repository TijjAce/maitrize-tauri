// ── Photos ou pictos, selon la fabrication ─────────────────────────────────
//
// Les photos prises avec le téléphone rejoignent Mes pictos sous leur nom :
// certains élèves n'entrent pas dans l'abstraction d'un pictogramme, la photo
// de l'objet de la classe leur parle. Mais pas dans toutes les fabrications :
// chaque atelier de Fabriquer garde son choix, dans un réglage partagé.
//
//   - « Photos et pictos » : la photo quand on en a une pour ce mot, le
//     picto sinon ;
//   - « Pictos seulement » : jamais de photo — celle qu'on avait choisie cède
//     la place au picto de son mot ;
//   - « Photos seulement » : rien que les photos — un mot sans photo reste
//     sans image.
//
// Une photo répond à une image par son nom : « les ciseaux » répond au picto
// « ciseaux », articles, majuscules et accents mis à part. Hors de Fabriquer,
// rien n'est remplacé : la photo se choisit comme un picto, et vient d'elle-même
// pour un mot qu'aucune banque n'a.

import { cleDeNom, cleDuMot, estPhoto, lireMesPictos, EVT_MES_PICTOS, type MonPicto } from "./mesPictos";

export { cleDeNom };

export type ModeImages = "les-deux" | "pictos" | "photos";

export const MODE_IMAGES_DEFAUT: ModeImages = "les-deux";

export const MODES_IMAGES: { id: ModeImages; libelle: string; aide: string }[] = [
  { id: "les-deux", libelle: "Photos et pictos", aide: "La photo quand vous en avez pris une pour ce mot, le picto sinon." },
  { id: "pictos", libelle: "Pictos seulement", aide: "Aucune photo : chaque image est un pictogramme." },
  { id: "photos", libelle: "Photos seulement", aide: "Rien que vos photos : un mot sans photo reste sans image." },
];

/** Où se garde le choix d'un atelier — préfixe « fabriquer: », donc partagé. */
export const cleModeImages = (atelier: string) => `fabriquer:images:${atelier}`;

/** Émis quand un atelier change de choix : l'aperçu se redessine. */
export const EVT_MODE_IMAGES = "maitrize:mode-images";

/** Le choix enregistré, tel qu'on peut s'y fier ; le premier, faute de mieux. */
export function lireModeImages(brut: string | null | undefined): ModeImages {
  return MODES_IMAGES.some((m) => m.id === brut) ? brut as ModeImages : MODE_IMAGES_DEFAUT;
}

/** Ce qu'il faut savoir pour choisir sans rien lire. */
export interface Connaissances {
  /** Les photos de Mes pictos. */
  photos: MonPicto[];
  /** Les mots d'une image : ceux d'un picto ARASAAC, le mot d'un picto gardé ; rien si on ne les connaît pas. */
  motsDe: (id: number | string) => string[];
  /** Le picto ARASAAC d'un mot, s'il en a un. */
  pictoDe: (mot: string) => number | undefined;
}

/**
 * L'image à montrer à la place de `id`, selon le choix : elle-même, une autre,
 * ou aucune (`null`).
 */
export function imageSelonMode(id: number | string, mode: ModeImages, k: Connaissances): number | string | null {
  if (estPhoto(id)) {
    if (mode !== "pictos") return id;
    const photo = k.photos.find((p) => p.id === id);
    return photo ? k.pictoDe(photo.mot) ?? null : null;
  }
  // Une photo des fichiers, prise par le WiFi pour une séance : une photo aussi, sans nom.
  if (typeof id === "string" && id.startsWith("photo:")) return mode === "pictos" ? null : id;
  if (mode === "pictos") return id;
  const cles = k.motsDe(id).map(cleDeNom).filter(Boolean);
  const photo = cles.length ? k.photos.find((p) => cles.includes(cleDeNom(p.mot))) : undefined;
  if (photo) return photo.id;
  return mode === "photos" ? null : id;
}

// ── Lire ce qu'il faut ─────────────────────────────────────────────────────

let mesPictosLus: Promise<MonPicto[]> | null = null;
/** Mes pictos, lus une fois jusqu'au prochain changement. */
function mesPictos(): Promise<MonPicto[]> {
  mesPictosLus ??= lireMesPictos().catch((): MonPicto[] => []);
  return mesPictosLus;
}

/** Les photos de Mes pictos. */
export const mesPhotos = (): Promise<MonPicto[]> => mesPictos().then((l) => l.filter((p) => p.origine === "photo"));

const motsDesPictos = new Map<number, string[]>();
const pictoDesMots = new Map<string, number | null>();

/** Ce qui change quand Mes pictos change : les listes relues, les images remplacées à revoir. */
const abonnesPhotos = new Set<() => void>();
let versionPhotos = 0;
if (typeof window !== "undefined") {
  window.addEventListener(EVT_MES_PICTOS, () => {
    mesPictosLus = null;
    versionPhotos += 1;
    abonnesPhotos.forEach((f) => f());
  });
}
export const photosChangees = {
  version: () => versionPhotos,
  abonner(f: () => void) { abonnesPhotos.add(f); return () => { abonnesPhotos.delete(f); }; },
};

/**
 * Les images à montrer à la place de chacune, selon le choix : la même, une
 * autre, ou `null` pour aucune. Sans photo dans Mes pictos, rien ne change —
 * sauf « Photos seulement », qui n'a alors rien à montrer.
 */
export async function imagesSelonMode(ids: (number | string)[], mode: ModeImages): Promise<Map<number | string, number | string | null>> {
  const tous = await mesPictos();
  const photos = tous.filter((p) => p.origine === "photo");
  const sortie = new Map<number | string, number | string | null>();
  if (!photos.length && mode !== "photos") {
    for (const id of ids) sortie.set(id, id);
    return sortie;
  }
  const { api } = await import("./api");
  // Les mots des pictos ARASAAC qu'on ne connaît pas encore.
  const inconnus = [...new Set(ids.filter((id): id is number => typeof id === "number" && id > 0 && !motsDesPictos.has(id)))];
  if (inconnus.length && mode !== "pictos") {
    const lus = await api.arasaacMotsDesIds(inconnus).catch((): Record<string, string[]> => ({}));
    for (const id of inconnus) motsDesPictos.set(id, lus[String(id)] ?? []);
  }
  // Le picto des photos à remplacer, en « Pictos seulement ».
  if (mode === "pictos") {
    const noms = [...new Set(ids.flatMap((id) => {
      const p = estPhoto(id) ? photos.find((x) => x.id === id) : undefined;
      return p && !pictoDesMots.has(cleDuMot(p.mot)) ? [p.mot.trim().toLowerCase()] : [];
    }))];
    if (noms.length) {
      const [trouves] = await api.arasaacParMots(noms).catch((): [{ id: number; mot: string }[], string[]] => [[], noms]);
      for (const nom of noms) pictoDesMots.set(cleDuMot(nom), trouves.find((t) => cleDuMot(t.mot) === cleDuMot(nom))?.id ?? null);
    }
  }
  const parId = new Map(tous.map((p) => [p.id, p]));
  const k: Connaissances = {
    photos,
    motsDe: (id) => (typeof id === "number" ? (id > 0 ? motsDesPictos.get(id) ?? [] : parId.has(id) ? [parId.get(id)!.mot] : []) : []),
    pictoDe: (mot) => pictoDesMots.get(cleDuMot(mot)) ?? undefined,
  };
  for (const id of ids) sortie.set(id, imageSelonMode(id, mode, k));
  return sortie;
}

/**
 * Une liste de pictos selon le choix : chacun prend l'image qui lui revient,
 * et ceux qui n'en ont plus s'en vont — un loto « Photos seulement » ne garde
 * que les mots photographiés.
 */
export async function listeSelonMode<T extends { id: number }>(liste: T[], mode: ModeImages): Promise<T[]> {
  const m = await imagesSelonMode(liste.map((p) => p.id), mode);
  return liste.flatMap((p) => {
    const autre = m.get(p.id);
    return typeof autre === "number" ? [{ ...p, id: autre }] : [];
  });
}

// ── Le choix de l'atelier ouvert ───────────────────────────────────────────
//
// Les images se chargent loin de l'atelier — dans l'aperçu, à l'impression.
// L'atelier ouvert dans Fabriquer dit ici son choix ; ailleurs, il n'y en a
// pas, et rien n'est remplacé.

let modeActif: ModeImages | null = null;
const abonnesMode = new Set<() => void>();

export const modeImagesActif = {
  lire: (): ModeImages | null => modeActif,
  definir(m: ModeImages | null) {
    if (m === modeActif) return;
    modeActif = m;
    abonnesMode.forEach((f) => f());
  },
  abonner(f: () => void) { abonnesMode.add(f); return () => { abonnesMode.delete(f); }; },
};

// ── Les feuilles qui portent des images ────────────────────────────────────
//
// Le choix ne se propose qu'aux ateliers dont la feuille montre des images :
// c'est l'aperçu qui le sait, et il le dit ici.

const avecImages: Record<string, boolean> = {};
const abonnesImages = new Set<() => void>();

export const feuillesAvecImages = {
  lire: (atelier: string): boolean => avecImages[atelier] ?? false,
  publier(atelier: string, oui: boolean) {
    if (!atelier || avecImages[atelier] === oui) return;
    avecImages[atelier] = oui;
    abonnesImages.forEach((f) => f());
  },
  abonner(f: () => void) { abonnesImages.add(f); return () => { abonnesImages.delete(f); }; },
};

/** Une feuille montre-t-elle des images ? Une balise <img>, ou une image posée dans un SVG. */
export const porteDesImages = (html: string): boolean => /<img\b|<image\b/i.test(html);
