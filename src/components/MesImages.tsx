import React from "react";
import { raccourci } from "../api";
import { toast } from "./Toaster";
import { chargerImages, memoriserImage } from "./ChoixPicto";
import { aDeLaTransparence, dimensionsReduites, motDuFichier, nouvelIdPerso } from "../imagesPerso";
import { silhouette, teinteDeLOmbre } from "../ombres";

// ── Les images de l'enseignant, côté écran ─────────────────────────────────
//
// On choisit des fichiers ; chacun est réduit à une taille d'impression et
// rangé à côté des pictogrammes, sous un identifiant négatif. Tout ce qui
// sait montrer un pictogramme — une tuile du loto, une étiquette, l'aperçu
// d'une feuille — sait alors montrer une photo, sans le savoir. Et l'ombre
// d'une image se calcule ici, là où l'on a une toile pour la peindre.

/** L'image d'un fichier ou d'une adresse, peinte sur une toile d'au plus `max` pixels de côté. */
export async function peindre(source: Blob | string, max: number): Promise<{ toile: HTMLCanvasElement; pinceau: CanvasRenderingContext2D }> {
  const adresse = typeof source === "string" ? source : URL.createObjectURL(source);
  try {
    const image = new Image();
    image.src = adresse;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) throw new Error("Image sans dimensions.");
    const [largeur, hauteur] = dimensionsReduites(image.naturalWidth, image.naturalHeight, max);
    const toile = document.createElement("canvas");
    toile.width = largeur;
    toile.height = hauteur;
    const pinceau = toile.getContext("2d", { willReadFrequently: true });
    if (!pinceau) throw new Error("Toile indisponible.");
    pinceau.drawImage(image, 0, 0, largeur, hauteur);
    return { toile, pinceau };
  } finally {
    if (typeof source !== "string") URL.revokeObjectURL(adresse);
  }
}

/** Une image — un fichier, ou une image déjà lue —, réduite : en PNG si elle a de la transparence, en JPEG sinon, dix fois plus léger pour une photo. */
export async function imageReduite(fichier: Blob | string, max = 700): Promise<string> {
  const { toile, pinceau } = await peindre(fichier, max);
  const pixels = pinceau.getImageData(0, 0, toile.width, toile.height).data;
  return aDeLaTransparence(pixels) ? toile.toDataURL("image/png") : toile.toDataURL("image/jpeg", 0.86);
}

export interface ImagePerso { id: number; mot: string; src: string }

const EST_IMAGE = /\.(png|jpe?g|webp|gif|bmp|avif|heic|heif|svg)$/i;

/** Les images choisies, réduites et rangées à côté des pictogrammes ; celles qui ne se lisent pas sont dites, pas perdues en silence. */
export async function importerImages(fichiers: File[]): Promise<ImagePerso[]> {
  const sortie: ImagePerso[] = [];
  const ratees: string[] = [];
  for (const f of fichiers) {
    if (!f.type.startsWith("image/") && !EST_IMAGE.test(f.name)) { ratees.push(f.name); continue; }
    try {
      const src = await imageReduite(f);
      const id = nouvelIdPerso();
      memoriserImage(id, src);
      sortie.push({ id, mot: motDuFichier(f.name) || `image ${-id}`, src });
    } catch {
      ratees.push(f.name);
    }
  }
  if (ratees.length) {
    toast(`${ratees.length} fichier${ratees.length > 1 ? "s" : ""} illisible${ratees.length > 1 ? "s" : ""} : ${ratees.slice(0, 3).join(", ")}${ratees.length > 3 ? "…" : ""}. Préférez un PNG ou un JPEG.`, { icone: "⚠️", duree: 7000 });
  }
  return sortie;
}

/**
 * L'image telle que le fabricant de PDF la lit : un JPEG ou un PNG, en base64
 * nu. Une photo reste un JPEG — elle y pèse dix fois moins — ; tout autre
 * format est repeint en PNG.
 */
export async function imagePourLePdf(src: string): Promise<string> {
  const connu = /^data:image\/(?:png|jpeg);base64,/.exec(src);
  if (connu) return src.slice(connu[0].length);
  const { toile } = await peindre(src, 1200);
  return toile.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
}

const ombres = new Map<string, Promise<string>>();

/** L'ombre d'une image, calculée une fois par image et par teinte. */
export function ombreDe(src: string, grise: boolean): Promise<string> {
  const cle = `${grise ? "g" : "n"}:${src}`;
  let p = ombres.get(cle);
  if (!p) {
    p = peindre(src, 420).then(({ toile, pinceau }) => {
      const pixels = pinceau.getImageData(0, 0, toile.width, toile.height);
      const ombre = silhouette(pixels.data, toile.width, toile.height, teinteDeLOmbre(grise));
      pinceau.putImageData(new ImageData(ombre, toile.width, toile.height), 0, 0);
      return toile.toDataURL("image/png");
    });
    p.catch(() => ombres.delete(cle));
    ombres.set(cle, p);
  }
  return p;
}

/**
 * Les images de plusieurs pictogrammes et leurs ombres. `pret` passe à vrai
 * quand tout ce qui pouvait se charger l'est : une image qui manque ne
 * retient pas les autres, elle n'a simplement pas d'ombre.
 */
export function useImagesEtOmbres(ids: number[], grise: boolean): { images: Record<number, string>; ombres: Record<number, string>; pret: boolean } {
  const cle = `${grise ? "g" : "n"}|${[...ids].sort((a, b) => a - b).join(",")}`;
  const [etat, setEtat] = React.useState<{ cle: string; images: Record<number, string>; ombres: Record<number, string> }>({ cle: "", images: {}, ombres: {} });
  React.useEffect(() => {
    let vivant = true;
    void (async () => {
      const images = await chargerImages(ids);
      const paires = await Promise.all(Object.entries(images)
        .map(([id, src]) => ombreDe(src, grise).then((o) => [Number(id), o] as const).catch(() => null)));
      if (vivant) setEtat({ cle, images, ombres: Object.fromEntries(paires.filter((p): p is readonly [number, string] => p !== null)) });
    })();
    return () => { vivant = false; };
  }, [cle]); // eslint-disable-line react-hooks/exhaustive-deps
  return { images: etat.images, ombres: etat.ombres, pret: etat.cle === cle };
}

/**
 * Le bouton qui ouvre le choix de fichiers : une photo, un dessin, une image
 * trouvée ailleurs. Tant qu'il est à l'écran, une image copiée — depuis une
 * page web, un document — se colle aussi, sans passer par un fichier.
 */
export function BoutonMesImages({ onImages, children = "🖼 Mes images…", className = "btn sm", disabled = false, style }: {
  onImages: (images: ImagePerso[]) => void;
  children?: React.ReactNode; className?: string; disabled?: boolean; style?: React.CSSProperties;
}) {
  const champ = React.useRef<HTMLInputElement>(null);
  const [occupe, setOccupe] = React.useState(false);
  // La liste a pu changer pendant la lecture des images : on rend à celui qui écoute maintenant.
  const rendre = React.useRef(onImages);
  rendre.current = onImages;
  const importer = React.useCallback(async (fichiers: File[]) => {
    if (!fichiers.length) return;
    setOccupe(true);
    try {
      const images = await importerImages(fichiers);
      if (images.length) rendre.current(images);
    } finally { setOccupe(false); }
  }, []);
  React.useEffect(() => {
    if (disabled) return;
    const coller = (e: ClipboardEvent) => {
      const images = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith("image/"));
      // Du texte collé dans un champ reste du texte : on ne prend que les images.
      if (!images.length) return;
      e.preventDefault();
      void importer(images);
    };
    document.addEventListener("paste", coller);
    return () => document.removeEventListener("paste", coller);
  }, [disabled, importer]);
  return (
    <>
      <button type="button" className={className} style={style} disabled={disabled || occupe} onClick={() => champ.current?.click()}
        title={`Vos propres images : une photo, un dessin, une image d'ailleurs — PNG, JPEG… Une image copiée se colle aussi (${raccourci("V")}).`}>
        {occupe ? "Lecture des images…" : children}
      </button>
      <input ref={champ} type="file" accept="image/*" multiple hidden aria-label="Choisir des images"
        onChange={(e) => { const fichiers = [...(e.target.files ?? [])]; e.target.value = ""; void importer(fichiers); }} />
    </>
  );
}
