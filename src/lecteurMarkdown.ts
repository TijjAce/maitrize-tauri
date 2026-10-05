// Lire un fichier « .md » dans l'application : son texte, son titre.

import { titreDuDocument } from "./documentIa";

/**
 * Le texte d'un fichier lu en base64 : en UTF-8, comme on écrit aujourd'hui ;
 * sinon en Windows-1252, celui des fichiers d'un ancien PC — plutôt que des
 * accents changés en « � ».
 */
export function texteDuFichier(b64: string): string {
  const octets = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  try { return new TextDecoder("utf-8", { fatal: true }).decode(octets); }
  catch { return new TextDecoder("windows-1252").decode(octets); }
}

/** Le titre du lecteur : le nom du fichier sans son extension ; à défaut, le premier titre du texte. */
export function titreDuLecteur(nom: string | undefined, texte: string): string {
  return (nom ?? "").replace(/\.(md|markdown)$/i, "").trim() || titreDuDocument(texte);
}
