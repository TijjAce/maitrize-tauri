// ── Les images de l'enseignant ─────────────────────────────────────────────
//
// Une photo de l'objet réel, le dessin d'un élève, une image trouvée
// ailleurs : la banque ARASAAC ne suffit pas toujours. Ces images se mêlent
// aux pictogrammes sous un identifiant négatif — la banque n'en a que de
// positifs — et vivent le temps de la séance de travail : rien ne s'écrit
// sur le disque tant qu'on ne fabrique pas la feuille.

let dernier = 0;

/** Un identifiant neuf pour une image personnelle : négatif, unique pendant la séance de travail. */
export const nouvelIdPerso = (): number => --dernier;

/** Vrai pour une image de l'enseignant ; faux pour un pictogramme de la banque, ou pour rien. */
export const estPerso = (id: number | null | undefined): boolean => id != null && id < 0;

/**
 * Le mot que le nom d'un fichier suggère : « pomme_rouge.JPG » → « pomme
 * rouge ». Un nom d'appareil photo (« IMG_2034 ») ne dit rien : mieux vaut
 * laisser l'enseignant écrire le mot.
 */
export function motDuFichier(nom: string): string {
  const base = (nom ?? "").replace(/^.*[\\/]/, "").replace(/\.[a-z0-9]{2,5}$/i, "");
  const mot = base.replace(/[_\-.]+/g, " ").replace(/\s+/g, " ").trim();
  // Le nom que donne un appareil, une capture, un collage : il ne dit pas ce qu'on voit.
  const MACHINE = /^(img|dsc|dscn|pxl|image|photo|capture|screenshot|scan|sans titre|untitled|unnamed|download|téléchargement|pasted image|image collée)?[\s\d()]*$/i;
  return MACHINE.test(mot) ? "" : mot;
}

/** Les dimensions d'une image ramenée dans un carré de `max` pixels, sans jamais l'agrandir. */
export function dimensionsReduites(largeur: number, hauteur: number, max: number): [number, number] {
  const plus = Math.max(largeur, hauteur);
  if (!(plus > 0)) return [1, 1];
  const k = Math.min(1, max / plus);
  return [Math.max(1, Math.round(largeur * k)), Math.max(1, Math.round(hauteur * k))];
}

/** Vrai si l'image a des zones transparentes : il faut alors la garder en PNG, le JPEG les noircirait. */
export function aDeLaTransparence(rgba: Uint8ClampedArray): boolean {
  for (let i = 3; i < rgba.length; i += 4) if (rgba[i] < 250) return true;
  return false;
}
