// ── Chercher dans un PDF, comme ⌘F dans un navigateur ─────────────────────
//
// Le coffre-fort affichait ses documents dans un cadre du système : pas de
// recherche, et un programme de cent pages se parcourt à la molette. pdf.js
// donne le texte de chaque page ; il reste à le comparer comme un lecteur le
// ferait, et à savoir quel morceau de la page surligner.
//
// Deux difficultés, propres aux PDF :
//   — le texte arrive en morceaux, découpés par le style et non par les mots :
//     « voca | bulaire », parfois sans l'espace entre deux mots ;
//   — les accents et la casse ne doivent pas compter, mais chaque caractère
//     comparé doit rester rattaché à son morceau pour qu'on puisse le montrer.

/** Une trouvaille dans le texte aplati d'une page. */
export interface Occurrence { debut: number; fin: number }

/** Le texte d'une page, aplati, et l'origine de chacun de ses caractères. */
export interface TexteAplati {
  texte: string;
  /** Pour chaque caractère du texte aplati, l'indice du morceau d'où il vient. */
  origine: number[];
}

/**
 * Un caractère prêt à comparer : sans accent, sans casse, apostrophe unifiée.
 *
 * Rend une chaîne et non un caractère : « Œ » en vaut deux, un accent isolé
 * n'en vaut aucun. C'est ce qui permet de suivre l'origine caractère par
 * caractère.
 */
export function aplatirCaractere(c: string): string {
  if (c === "’" || c === "'" || c === "`") return "'";
  if (c === "œ" || c === "Œ") return "oe";
  if (c === "æ" || c === "Æ") return "ae";
  // La décomposition sépare la lettre de son accent ; on jette l'accent.
  const sans = c.normalize("NFD").replace(/\p{M}/gu, "");
  return sans.toLowerCase();
}

/**
 * Aplatit les morceaux d'une page en un seul texte comparable.
 *
 * Les blancs — espaces, retours à la ligne, insécables — se réduisent à un
 * seul espace, et les blancs de tête et de queue disparaissent : le même
 * document lu par le texte brut ou par les morceaux affichés donne alors la
 * même chaîne, et les deux comptes concordent.
 */
export function aplatir(morceaux: string[]): TexteAplati {
  let texte = "";
  const origine: number[] = [];
  let blanc = true; // vrai tant qu'on n'a rien écrit : mange les blancs de tête
  for (let i = 0; i < morceaux.length; i++) {
    for (const c of morceaux[i] ?? "") {
      if (/\s/.test(c)) {
        if (!blanc) { texte += " "; origine.push(i); blanc = true; }
        continue;
      }
      const plat = aplatirCaractere(c);
      for (const p of plat) { texte += p; origine.push(i); }
      if (plat) blanc = false;
    }
  }
  // Un blanc de queue ne se compare à rien.
  if (texte.endsWith(" ")) { texte = texte.slice(0, -1); origine.pop(); }
  return { texte, origine };
}

const echapper = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Le motif d'une recherche, ou null si elle est vide.
 *
 * Entre deux mots, l'espace est facultatif : le texte d'un PDF le perd une
 * fois sur deux, et « jeux de construction » doit se trouver quand même.
 */
export function motifDe(recherche: string): RegExp | null {
  const mots = aplatir([recherche]).texte.split(" ").filter(Boolean);
  if (!mots.length) return null;
  return new RegExp(mots.map(echapper).join("\\s*"), "g");
}

/** Toutes les trouvailles d'une recherche dans un texte aplati, dans l'ordre. */
export function occurrences(texte: string, recherche: string): Occurrence[] {
  const motif = motifDe(recherche);
  if (!motif) return [];
  const sortie: Occurrence[] = [];
  for (const m of texte.matchAll(motif)) {
    if (!m[0]) continue; // un motif vide boucle sans fin
    sortie.push({ debut: m.index ?? 0, fin: (m.index ?? 0) + m[0].length });
  }
  return sortie;
}

/** Les morceaux qu'une trouvaille recouvre : ce sont eux qu'on surligne. */
export function morceauxCouverts(o: Occurrence, origine: number[]): number[] {
  const vus = new Set<number>();
  for (let i = o.debut; i < o.fin && i < origine.length; i++) vus.add(origine[i]);
  return [...vus].sort((a, b) => a - b);
}

/** Le passage autour d'une trouvaille, pour se reconnaître sans y aller. */
export function extraitAutour(texte: string, o: Occurrence, marge = 40): string {
  const debut = Math.max(0, o.debut - marge);
  const fin = Math.min(texte.length, o.fin + marge);
  return (debut > 0 ? "…" : "") + texte.slice(debut, fin).trim() + (fin < texte.length ? "…" : "");
}
