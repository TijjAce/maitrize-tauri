// Les photos d'un texte mis en forme : les coller, les afficher, les imprimer.
//
// Une photo collée est réduite (une photo de téléphone pèse plusieurs Mo),
// puis enregistrée comme fichier de Maitrize ; le texte n'en garde que le nom
// (voir texteRiche.ts). Pour l'afficher ou l'imprimer, on la relit en base64.

import { api } from "../api";
import { dataUrlImage } from "../print";
import { fichierEnBase64 } from "../dragdrop";
import { avecSourcesImages, imagesDuTexte } from "../texteRiche";

/** Plus grand côté d'une photo collée, en pixels : assez pour une page imprimée. */
const COTE_MAX = 1600;
/** En dessous, une image déjà aux bonnes dimensions est gardée telle quelle. */
const OCTETS_GARDES = 1_000_000;
/** Au-delà, une capture d'écran repasse en JPEG. */
const PNG_MAX = 1_500_000;

const EXTENSIONS: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp" };

const cache = new Map<string, Promise<string>>();

/** L'image d'un fichier de Maitrize, lue une fois par séance de travail. */
export function chargerImage(nom: string): Promise<string> {
  let p = cache.get(nom);
  if (!p) {
    p = api.fichierRead(nom).then((b64) => dataUrlImage(nom, b64));
    p.catch(() => cache.delete(nom));
    cache.set(nom, p);
  }
  return p;
}

/** Le contenu prêt à imprimer : les images lues et intégrées à la page. */
export async function avecImages(html: string): Promise<string> {
  const sources: Record<string, string> = {};
  await Promise.all(imagesDuTexte(html).map(async (nom) => {
    try { sources[nom] = await chargerImage(nom); } catch { /* image absente : retirée */ }
  }));
  return avecSourcesImages(html, (nom) => sources[nom]);
}

function decoder(fichier: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(fichier);
  const img = new Image();
  return new Promise<HTMLImageElement>((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image illisible"));
    img.src = url;
  }).finally(() => URL.revokeObjectURL(url));
}

function versBlob(canvas: HTMLCanvasElement, type: string, qualite?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("conversion impossible"))), type, qualite));
}

/** Une photo collée, réduite si besoin : son contenu en base64 et son extension. */
export async function preparerImage(fichier: Blob): Promise<{ base64: string; ext: string }> {
  const connue = EXTENSIONS[fichier.type.toLowerCase()];
  let image: HTMLImageElement;
  try {
    image = await decoder(fichier);
  } catch (e) {
    // Illisible ici, mais d'un format courant : on la garde telle quelle.
    if (connue) return { base64: await fichierEnBase64(fichier), ext: connue };
    throw e;
  }
  const cote = Math.max(image.naturalWidth, image.naturalHeight);
  if (connue && fichier.size <= OCTETS_GARDES && cote <= COTE_MAX) {
    return { base64: await fichierEnBase64(fichier), ext: connue };
  }
  const echelle = Math.min(1, COTE_MAX / Math.max(1, cote));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * echelle));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * echelle));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("conversion impossible");
  // Une capture d'écran reste nette en PNG ; une photo passe en JPEG, sur fond blanc.
  if (connue === "png") {
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const png = await versBlob(canvas, "image/png");
    if (png.size <= PNG_MAX) return { base64: await fichierEnBase64(png), ext: "png" };
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const jpeg = await versBlob(canvas, "image/jpeg", 0.85);
  return { base64: await fichierEnBase64(jpeg), ext: "jpg" };
}
