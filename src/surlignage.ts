// ── Ce qui, dans le bilan, part dans les notes des élèves ─────────────────
//
// Les phrases qui nomment un élève vont dans ses notes (voir notesDuBilan.ts).
// Le cahier journal les montre en couleur pendant qu'on écrit : on voit ce qui
// part, et à qui — le prénom un ton plus fort que sa phrase.

import { positionsDuPrenom } from "./veilleEleve";

export interface Segment {
  texte: string;
  /** « phrase » : elle part dans les notes ; « nom » : le prénom qui l'y envoie. */
  genre: "" | "phrase" | "nom";
}

/** Les phrases d'un texte, coupées comme `phrasesQuiCitent` les coupe : à chaque ligne, et après . ! ? … */
function phrases(texte: string): [number, number][] {
  const sortie: [number, number][] = [];
  let debut = 0;
  for (let i = 0; i < texte.length; i++) {
    const ch = texte[i];
    if (ch === "\n") { sortie.push([debut, i]); debut = i + 1; }
    else if (".!?…".includes(ch)) { sortie.push([debut, i + 1]); debut = i + 1; }
  }
  sortie.push([debut, texte.length]);
  return sortie;
}

/**
 * Le texte découpé pour être surligné. Mis bout à bout, les segments
 * redonnent le texte au caractère près — retours à la ligne compris : c'est
 * ce qui garde le surlignage sous les bons mots.
 */
export function segmentsDuBilan(texte: string, prenoms: string[]): Segment[] {
  const genres: Segment["genre"][] = new Array(texte.length).fill("");
  for (const [a, b] of phrases(texte)) {
    const phrase = texte.slice(a, b);
    const noms = prenoms.flatMap((p) => positionsDuPrenom(phrase, p).map((i) => [a + i, a + i + p.length]));
    if (!noms.length) continue;
    // La phrase sans les blancs de ses bords : c'est elle qui part dans les notes.
    let d = a, f = b;
    while (d < f && /\s/.test(texte[d])) d++;
    while (f > d && /\s/.test(texte[f - 1])) f--;
    for (let i = d; i < f; i++) genres[i] = "phrase";
    for (const [x, y] of noms) for (let i = x; i < y; i++) genres[i] = "nom";
  }
  const sortie: Segment[] = [];
  for (let i = 0; i < texte.length; i++) {
    const dernier = sortie[sortie.length - 1];
    if (dernier && dernier.genre === genres[i]) dernier.texte += texte[i];
    else sortie.push({ texte: texte[i], genre: genres[i] });
  }
  return sortie;
}

/** Les prénoms que le texte nomme, dans l'ordre de la classe. */
export const prenomsNommes = (texte: string, prenoms: string[]): string[] =>
  prenoms.filter((p) => positionsDuPrenom(texte, p).length > 0);
