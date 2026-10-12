// Une feuille enregistrée là où l'on veut : en PDF, pour l'imprimer ou
// l'envoyer telle quelle, ou en Word (.docx), pour la retoucher ailleurs.
// L'enseignant choisit le dossier et le nom ; rien ne se range sans lui.

import { api } from "./api";
import { documentImprimable } from "./print";
import { partiesDuDocx } from "./documentWord";

/** Un nom de fichier tiré d'un titre : sans caractère interdit, assez court. */
export const nomDeFichier = (titre: string) =>
  (titre.replace(/[\\/:*?"<>|\n\r\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "Document");

/** Demande où enregistrer ; rien si l'on renonce. */
async function ouEnregistrer(titre: string, ext: "pdf" | "docx"): Promise<string | null> {
  const { save } = await import("@tauri-apps/plugin-dialog");
  return (await save({ defaultPath: `${nomDeFichier(titre)}.${ext}`, filters: [{ name: ext === "pdf" ? "PDF" : "Document Word", extensions: [ext] }] })) ?? null;
}

/** La feuille en PDF, au chemin choisi. Vrai si elle est enregistrée. */
export async function enregistrerEnPdf(titre: string, corps: string, style: string): Promise<boolean> {
  const chemin = await ouEnregistrer(titre, "pdf");
  if (!chemin) return false;
  const fichier = await api.feuilleEnPdf(documentImprimable(titre, corps, style));
  try { await api.fichierExporter(fichier, chemin); } finally { api.fichierDelete(fichier).catch(() => {}); }
  return true;
}

/** La feuille en Word (.docx), au chemin choisi. Vrai si elle est enregistrée. */
export async function enregistrerEnWord(titre: string, corps: string): Promise<boolean> {
  const chemin = await ouEnregistrer(titre, "docx");
  if (!chemin) return false;
  await api.enregistrerArchive(chemin, partiesDuDocx(corps));
  return true;
}
