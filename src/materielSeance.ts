// Les PDF du bureau qu'une séance peut reprendre.
//
// Un PDF déposé sur le plan de travail est une tuile du bureau : un matériel
// sans séance ni séquence. Une séance peut en avoir besoin sans qu'on ait à
// le réimporter depuis le Finder. On le **copie** dans la séance — le fichier
// aussi — plutôt que d'y déplacer la tuile : le bureau garde le sien, le
// même PDF peut servir à plusieurs séances, et supprimer l'un ne touche pas
// l'autre.

import type { MaterielItem } from "./api";
import { normaliser } from "./dossiers";

/** Les noms de fichiers d'une liste JSON, sans faire confiance à sa forme. */
export function lirePdfs(json: string | null | undefined): string[] {
  try {
    const v = JSON.parse(json || "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "") : [];
  } catch {
    return [];
  }
}

/** Sur le bureau : ni dans une séance, ni dans une séquence. */
export const estSurLeBureau = (m: MaterielItem) => !m.seanceId && !m.sequenceId;

const comparer = new Intl.Collator("fr", { sensitivity: "base", numeric: true }).compare;

/**
 * Les matériels du bureau qui portent au moins un PDF, rangés par dossier
 * puis par titre — l'ordre du plan de travail.
 */
export function pdfsDuBureau(materiels: MaterielItem[]): MaterielItem[] {
  return materiels
    .filter((m) => estSurLeBureau(m) && lirePdfs(m.pdfsJson).length > 0)
    .sort((a, b) => comparer(normaliser(a.dossier), normaliser(b.dossier)) || comparer(a.titre, b.titre));
}

const plat = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Ce qui répond à une recherche, sur le titre ou le dossier. */
export function chercherPdfs(materiels: MaterielItem[], recherche: string): MaterielItem[] {
  const q = plat(recherche.trim());
  if (!q) return materiels;
  return materiels.filter((m) => plat(`${m.titre} ${m.dossier}`).includes(q));
}

/**
 * La copie d'un matériel du bureau pour une séance : mêmes titre, description
 * et compétence, mais seulement ses PDF, déjà copiés (`copies`), et rien du
 * bureau — ni dossier, ni images, ni vidéos, ni documents du coffre.
 */
export function copiePourLaSeance(m: MaterielItem, seanceId: string, copies: string[], id: string, date: string): MaterielItem {
  return {
    ...m, id, seanceId, sequenceId: null, dossier: "", dateCreation: date,
    pdfsJson: JSON.stringify(copies), imagesJson: "[]", videosJson: "[]", coffreJson: "[]",
  };
}
