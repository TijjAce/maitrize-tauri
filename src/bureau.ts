// Ce que fait un double-clic sur une tuile du bureau.
//
// Un lien, un PDF ou une image déposés tels quels sont des raccourcis : on
// s'attend à les voir s'ouvrir, pas à remplir un formulaire de compétences.
// Dès qu'on a travaillé l'objet — une description, une compétence liée, un
// second document —, c'est un matériel pédagogique et il s'ouvre en fiche.
import type { MaterielItem } from "./api";
import { lireVideos, type Video } from "./videos";

export type ContenuDirect =
  | { genre: "video"; video: Video }
  | { genre: "pdf"; nom: string }
  | { genre: "image"; nom: string };

const liste = (json: string): string[] => {
  try { const v = JSON.parse(json || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
};

/** Le contenu à ouvrir directement, ou `null` si l'objet s'ouvre en fiche. */
export function contenuDirect(m: MaterielItem): ContenuDirect | null {
  const travaille = m.descriptionMateriel.trim() !== "" || m.competenceId !== "" || liste(m.coffreJson).length > 0;
  if (travaille) return null;
  const videos = lireVideos(m.videosJson);
  const pdfs = liste(m.pdfsJson);
  const images = liste(m.imagesJson);
  if (videos.length + pdfs.length + images.length !== 1) return null;
  if (videos.length) return { genre: "video", video: videos[0] };
  if (pdfs.length) return { genre: "pdf", nom: pdfs[0] };
  return { genre: "image", nom: images[0] };
}

/** Libellé sous la tuile : dit ce que l'on ouvrira. */
export function nature(m: MaterielItem): string {
  const c = contenuDirect(m);
  if (!c) return m.sousDomaineTitre || "Matériel";
  return c.genre === "video" ? "Vidéo" : c.genre === "pdf" ? "PDF" : "Image";
}
