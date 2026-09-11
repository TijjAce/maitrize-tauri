// Rendu d'une page de PDF en image, pour la donner à regarder au modèle.
//
// L'analyse d'une fiche demande de la voir : le texte extrait ne dit rien du
// décor, de la densité, ni de la place laissée pour répondre. On rastérise
// donc la page avec pdf.js, qui tourne partout sans dépendance native.

import * as pdfjs from "pdfjs-dist";
import ouvrier from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = ouvrier;

export interface PageRendue {
  numero: number;
  /** PNG en base64, sans préfixe. */
  image: string;
  largeur: number;
  hauteur: number;
}

/**
 * Largeur de rendu, en pixels.
 *
 * Assez pour que le modèle lise les consignes, pas trop pour que l'image
 * reste transmissible : une A4 à 1200 px pèse environ 300 ko en PNG.
 */
const LARGEUR = 1200;

/**
 * pdf.js **transfère** le tableau qu'on lui confie vers son ouvrier : le
 * tampon d'origine se retrouve détaché, et toute lecture suivante échoue.
 * On ne lui donne donc jamais que des copies, et l'original reste intact
 * pour la page suivante.
 */
const copie = (octets: Uint8Array) => new Uint8Array(octets);

export async function nombreDePages(octets: Uint8Array): Promise<number> {
  const doc = await pdfjs.getDocument({ data: copie(octets) }).promise;
  const n = doc.numPages;
  doc.destroy();
  return n;
}

/** Rend une page (numérotée à partir de 1) en PNG base64. */
export async function rendrePage(octets: Uint8Array, numero: number): Promise<PageRendue> {
  const doc = await pdfjs.getDocument({ data: copie(octets) }).promise;
  try {
    const page = await doc.getPage(Math.min(Math.max(1, numero), doc.numPages));
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: LARGEUR / base.width });
    const toile = document.createElement("canvas");
    toile.width = Math.round(viewport.width);
    toile.height = Math.round(viewport.height);
    const ctx = toile.getContext("2d");
    if (!ctx) throw new Error("Rendu impossible dans cette fenêtre.");
    // Fond blanc : un PDF transparent donnerait une image noire une fois
    // aplatie, que le modèle ne saurait pas lire.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, toile.width, toile.height);
    await page.render({ canvasContext: ctx, viewport, canvas: toile } as any).promise;
    const cadree = rognerMarges(toile);
    const url = cadree.toDataURL("image/png");
    return {
      numero,
      image: url.slice(url.indexOf(",") + 1),
      largeur: cadree.width,
      hauteur: cadree.height,
    };
  } finally {
    doc.destroy();
  }
}

/** Lit un fichier choisi par l'enseignant. */
export async function octetsDuFichier(f: File): Promise<Uint8Array> {
  return new Uint8Array(await f.arrayBuffer());
}


/**
 * Retire les marges uniformes autour du contenu.
 *
 * Un modèle situe ce qu'il voit en fractions de l'image qu'on lui donne. Si
 * cette image est une A4 dont le bas est vide, il place les éléments comme si
 * le contenu remplissait la page, et les cadres dessinés tombent à côté.
 * Recadrer fait coïncider son repère et le nôtre — et l'enseignant voit
 * exactement le cadrage que le modèle a examiné.
 *
 * La couleur de fond se lit aux quatre coins plutôt que d'être supposée
 * blanche : beaucoup de fiches ont un fond teinté, et chercher « ce qui n'est
 * pas blanc » y trouverait du contenu partout, donc ne rognerait rien.
 */
export function rognerMarges(toile: HTMLCanvasElement, tolerance = 12): HTMLCanvasElement {
  const ctx = toile.getContext("2d");
  if (!ctx) return toile;
  const { width: L, height: H } = toile;
  let data: Uint8ClampedArray;
  try { data = ctx.getImageData(0, 0, L, H).data; } catch { return toile; }

  const pixel = (x: number, y: number) => {
    const i = (y * L + x) * 4;
    return [data[i], data[i + 1], data[i + 2]] as const;
  };
  // Fond = la couleur des coins. Si les coins divergent, la page n'a pas de
  // marge uniforme et il n'y a rien à rogner.
  const coins = [pixel(0, 0), pixel(L - 1, 0), pixel(0, H - 1), pixel(L - 1, H - 1)];
  const [fr, fg, fb] = coins[0];
  const proche = (c: readonly [number, number, number]) =>
    Math.abs(c[0] - fr) <= tolerance && Math.abs(c[1] - fg) <= tolerance && Math.abs(c[2] - fb) <= tolerance;
  if (!coins.every(proche)) return toile;

  let x0 = L, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < L; x++) {
      if (proche(pixel(x, y))) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < x0 || y1 < y0) return toile; // page entièrement unie

  const marge = Math.round(Math.min(L, H) * 0.01);
  x0 = Math.max(0, x0 - marge); y0 = Math.max(0, y0 - marge);
  x1 = Math.min(L - 1, x1 + marge); y1 = Math.min(H - 1, y1 + marge);
  const l = x1 - x0 + 1, h = y1 - y0 + 1;
  if (l >= L * 0.98 && h >= H * 0.98) return toile;

  const sortie = document.createElement("canvas");
  sortie.width = l; sortie.height = h;
  const sctx = sortie.getContext("2d");
  if (!sctx) return toile;
  sctx.drawImage(toile, x0, y0, l, h, 0, 0, l, h);
  return sortie;
}
