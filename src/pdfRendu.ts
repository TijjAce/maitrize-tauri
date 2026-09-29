// Rendu d'une page de PDF en image, pour la donner à regarder au modèle.
//
// L'analyse d'une fiche demande de la voir : le texte extrait ne dit rien du
// décor, de la densité, ni de la place laissée pour répondre. On rastérise
// donc la page avec pdf.js, qui tourne partout sans dépendance native.

import type * as TypesPdfjs from "pdfjs-dist";

/**
 * pdf.js n'est chargé qu'au premier PDF ouvert.
 *
 * La bibliothèque pèse près d'un mégaoctet : la mettre dans le paquet
 * principal la faisait analyser à chaque démarrage, y compris les jours où
 * l'on n'ouvre aucun PDF. Un import différé la range dans son propre
 * morceau, chargé quand le coffre-fort ou l'adaptation de fiche s'ouvre.
 *
 * La promesse est retenue : les appels suivants ne rechargent rien.
 */
let chargement: Promise<typeof TypesPdfjs> | null = null;

function pdfjsCharge(): Promise<typeof TypesPdfjs> {
  chargement ??= (async () => {
    const [lib, { default: ouvrier }] = await Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    ]);
    lib.GlobalWorkerOptions.workerSrc = ouvrier;
    return lib;
  })();
  return chargement;
}

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
  const doc = await (await pdfjsCharge()).getDocument({ data: copie(octets) }).promise;
  const n = doc.numPages;
  doc.destroy();
  return n;
}

export interface OptionsRendu {
  /** Retirer les marges uniformes (pour le modèle) ; faux pour imprimer la page entière. */
  rogner?: boolean;
  /** Largeur de rendu, en pixels. */
  largeur?: number;
}

/** Une page du document, dessinée sur une toile à la largeur voulue. */
async function toileDeLaPage(doc: TypesPdfjs.PDFDocumentProxy, numero: number, largeur: number): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(Math.min(Math.max(1, numero), doc.numPages));
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: largeur / base.width });
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
  return toile;
}

const enPng = (toile: HTMLCanvasElement, numero: number): PageRendue => {
  const url = toile.toDataURL("image/png");
  return { numero, image: url.slice(url.indexOf(",") + 1), largeur: toile.width, hauteur: toile.height };
};

/** Rend une page (numérotée à partir de 1) en PNG base64. */
export async function rendrePage(octets: Uint8Array, numero: number, options: OptionsRendu = {}): Promise<PageRendue> {
  const { rogner = true, largeur = LARGEUR } = options;
  const doc = await (await pdfjsCharge()).getDocument({ data: copie(octets) }).promise;
  try {
    const toile = await toileDeLaPage(doc, numero, largeur);
    return enPng(rogner ? rognerMarges(toile) : toile, numero);
  } finally {
    doc.destroy();
  }
}

// ── Les pages à joindre à une impression ──────────────────────────────────

export interface Cadre { x0: number; y0: number; x1: number; y1: number }

/**
 * Le cadrage des pages d'un même document, pour l'impression.
 *
 * Chaque page est réduite à la hauteur de son contenu : une deuxième page
 * où ne débordent que deux exercices ne prend plus une feuille entière.
 * Toutes gardent la même largeur — celle du contenu le plus large — pour
 * rester à la même échelle d'une page à l'autre. Une page vide ne s'imprime
 * pas ; une page sans marge unie garde sa pleine page, et les autres avec
 * elle leur pleine largeur.
 */
export function cadragesAImprimer(contenus: (Cadre | "vide" | "entiere")[], largeur: number, hauteurs: number[]): (Cadre | null)[] {
  const marge = Math.round(largeur * 0.012);
  const cadres = contenus.filter((c): c is Cadre => typeof c === "object");
  const pleine = contenus.some((c) => c === "entiere") || !cadres.length;
  const gauche = pleine ? 0 : Math.max(0, Math.min(...cadres.map((c) => c.x0)) - marge);
  const droite = pleine ? largeur - 1 : Math.min(largeur - 1, Math.max(...cadres.map((c) => c.x1)) + marge);
  return contenus.map((c, i) => {
    if (c === "vide") return null;
    if (c === "entiere") return { x0: 0, y0: 0, x1: largeur - 1, y1: hauteurs[i] - 1 };
    return { x0: gauche, y0: Math.max(0, c.y0 - marge), x1: droite, y1: Math.min(hauteurs[i] - 1, c.y1 + marge) };
  });
}

/**
 * Les pages d'un PDF à joindre à une impression, cadrées sur leur contenu
 * (voir `cadragesAImprimer`). Les pages vides n'y sont pas.
 */
export async function rendrePagesAImprimer(octets: Uint8Array, largeur = 1500): Promise<PageRendue[]> {
  const doc = await (await pdfjsCharge()).getDocument({ data: copie(octets) }).promise;
  try {
    const toiles: HTMLCanvasElement[] = [];
    for (let n = 1; n <= doc.numPages; n++) toiles.push(await toileDeLaPage(doc, n, largeur));
    const cadrages = cadragesAImprimer(toiles.map((t) => cadreDuContenu(t)), toiles[0]?.width ?? largeur, toiles.map((t) => t.height));
    const pages: PageRendue[] = [];
    toiles.forEach((toile, i) => {
      const c = cadrages[i];
      if (!c) return;
      const l = Math.min(toile.width - c.x0, c.x1 - c.x0 + 1), h = c.y1 - c.y0 + 1;
      if (l <= 0 || h <= 0) return;
      const sortie = document.createElement("canvas");
      sortie.width = l; sortie.height = h;
      const ctx = sortie.getContext("2d");
      if (!ctx) { pages.push(enPng(toile, i + 1)); return; }
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, l, h);
      ctx.drawImage(toile, c.x0, c.y0, l, h, 0, 0, l, h);
      pages.push(enPng(sortie, i + 1));
    });
    return pages;
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
  const { width: L, height: H } = toile;
  const contenu = cadreDuContenu(toile, tolerance);
  if (typeof contenu !== "object") return toile;
  let { x0, y0, x1, y1 } = contenu;

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

/**
 * Le rectangle du contenu d'une page : « vide » si elle est unie d'un bord à
 * l'autre, « entiere » si elle n'a pas de marge unie où couper.
 */
export function cadreDuContenu(toile: HTMLCanvasElement, tolerance = 12): Cadre | "vide" | "entiere" {
  const ctx = toile.getContext("2d");
  if (!ctx) return "entiere";
  const { width: L, height: H } = toile;
  let data: Uint8ClampedArray;
  try { data = ctx.getImageData(0, 0, L, H).data; } catch { return "entiere"; }

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
  if (!coins.every(proche)) return "entiere";

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
  if (x1 < x0 || y1 < y0) return "vide";
  return { x0, y0, x1, y1 };
}

/**
 * La première page en petite image, pour une tuile du bureau.
 *
 * Pas de rognage ici : une vignette doit ressembler à la page, marges
 * comprises. JPEG plutôt que PNG — à cette taille, dix fois plus léger, ce
 * qui permet de garder les vignettes d'une visite à l'autre.
 */
export async function vignettePdf(octets: Uint8Array, largeur = 220): Promise<string> {
  const doc = await (await pdfjsCharge()).getDocument({ data: copie(octets) }).promise;
  try {
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: largeur / base.width });
    const toile = document.createElement("canvas");
    toile.width = Math.round(viewport.width);
    toile.height = Math.round(viewport.height);
    const ctx = toile.getContext("2d");
    if (!ctx) throw new Error("Rendu impossible dans cette fenêtre.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, toile.width, toile.height);
    await page.render({ canvasContext: ctx, viewport, canvas: toile } as any).promise;
    return toile.toDataURL("image/jpeg", 0.82);
  } finally {
    doc.destroy();
  }
}

export type DocumentPdf = TypesPdfjs.PDFDocumentProxy;

/** Ouvre un PDF pour le parcourir page à page. Le refermer avec `destroy()`. */
export function ouvrirPdf(octets: Uint8Array): Promise<DocumentPdf> {
  return pdfjsCharge().then((lib) => lib.getDocument({ data: copie(octets) }).promise);
}

/** Proportions de la première page (hauteur / largeur), pour réserver la place des suivantes. */
export async function proportionPdf(doc: DocumentPdf): Promise<number> {
  const v = (await doc.getPage(1)).getViewport({ scale: 1 });
  return v.height / v.width;
}

/**
 * Dessine une page et pose dessus son texte, transparent mais sélectionnable,
 * comme dans un lecteur PDF : on surligne à la souris ce qu'on veut citer.
 *
 * Renvoie la hauteur affichée et le nombre de morceaux de texte — zéro pour une
 * page scannée, où il n'y a rien à sélectionner.
 */
export async function rendrePageSelectionnable(
  doc: DocumentPdf, numero: number, largeur: number, toile: HTMLCanvasElement, calque: HTMLDivElement,
): Promise<{ hauteur: number; morceaux: number }> {
  const page = await doc.getPage(numero);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: largeur / base.width });
  // Rendu à la densité de l'écran (plafonnée) : net sur un écran Retina sans
  // faire exploser la mémoire sur un programme de cent pages.
  const densite = Math.min(2, window.devicePixelRatio || 1);
  toile.width = Math.round(viewport.width * densite);
  toile.height = Math.round(viewport.height * densite);
  toile.style.width = `${viewport.width}px`;
  toile.style.height = `${viewport.height}px`;
  const ctx = toile.getContext("2d");
  if (!ctx) throw new Error("Rendu impossible dans cette fenêtre.");
  await page.render({ canvasContext: ctx, viewport, canvas: toile,
    transform: densite === 1 ? undefined : [densite, 0, 0, densite, 0, 0] } as any).promise;

  const contenu = await page.getTextContent();
  calque.replaceChildren();
  calque.style.setProperty("--scale-factor", String(viewport.scale));
  await new (await pdfjsCharge()).TextLayer({ textContentSource: contenu, container: calque, viewport }).render();
  return { hauteur: viewport.height, morceaux: contenu.items.length };
}

/**
 * Une page, ou une portion de page, en PNG base64 : ce qu'on découpe dans un
 * manuel pour le poser dans le cahier journal.
 *
 * `zone` est donnée en fractions de la page (0 à 1), indépendantes du zoom
 * d'affichage. Le rendu vise `largeurCible` pixels pour la portion retenue :
 * un exercice pris dans un coin de page reste lisible à l'impression.
 */
export async function imageDeLaPage(
  doc: DocumentPdf, numero: number, zone?: { x: number; y: number; l: number; h: number }, largeurCible = 1400,
): Promise<{ base64: string; largeur: number; hauteur: number }> {
  const z = {
    x: Math.min(Math.max(zone?.x ?? 0, 0), 1), y: Math.min(Math.max(zone?.y ?? 0, 0), 1),
    l: Math.min(Math.max(zone?.l ?? 1, 0.01), 1), h: Math.min(Math.max(zone?.h ?? 1, 0.01), 1),
  };
  z.l = Math.min(z.l, 1 - z.x);
  z.h = Math.min(z.h, 1 - z.y);
  const page = await doc.getPage(numero);
  const base = page.getViewport({ scale: 1 });
  // Assez de pixels pour la portion voulue, sans dépasser une page à 3000 px.
  const echelle = Math.min(3000 / base.width, largeurCible / (base.width * z.l));
  const viewport = page.getViewport({ scale: echelle });
  const entiere = document.createElement("canvas");
  entiere.width = Math.round(viewport.width);
  entiere.height = Math.round(viewport.height);
  const ctx = entiere.getContext("2d");
  if (!ctx) throw new Error("Rendu impossible dans cette fenêtre.");
  // Fond blanc : un PDF transparent donnerait une image noire une fois aplatie.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, entiere.width, entiere.height);
  await page.render({ canvasContext: ctx, viewport, canvas: entiere } as any).promise;

  const l = Math.max(1, Math.round(entiere.width * z.l));
  const h = Math.max(1, Math.round(entiere.height * z.h));
  const sortie = document.createElement("canvas");
  sortie.width = l;
  sortie.height = h;
  const sctx = sortie.getContext("2d");
  if (!sctx) throw new Error("Rendu impossible dans cette fenêtre.");
  sctx.fillStyle = "#fff";
  sctx.fillRect(0, 0, l, h);
  sctx.drawImage(entiere, Math.round(entiere.width * z.x), Math.round(entiere.height * z.y), l, h, 0, 0, l, h);
  const url = sortie.toDataURL("image/png");
  return { base64: url.slice(url.indexOf(",") + 1), largeur: l, hauteur: h };
}

/** Texte brut d'une page, pour la recherche. */
export async function textePage(doc: DocumentPdf, numero: number): Promise<string> {
  const contenu = await (await doc.getPage(numero)).getTextContent();
  return contenu.items.map((it) => ("str" in it ? it.str + (it.hasEOL ? "\n" : " ") : "")).join("");
}
