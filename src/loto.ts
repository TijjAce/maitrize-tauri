// Le loto : choisir soi-même les images, plutôt qu'écarter celles d'un tirage.
//
// ARASAAC range sous un même mot plusieurs dessins — six « cousine » dans la
// famille. Un tirage au hasard en ramenait donc des séries presque identiques,
// qu'il fallait écarter une à une. On montre maintenant une image par mot, on
// coche celles qu'on veut, on écrit une liste de mots, on cherche ; le hasard
// ne sert plus qu'à compléter.

export interface PictoLoto { id: number; mot: string }

const cleMot = (mot: string) => (mot ?? "").trim().toLowerCase();

/** Une image par mot : la première rencontrée, et le nombre de dessins du même mot. */
export function uneImageParMot<P extends PictoLoto>(pictos: P[]): { picto: P; variantes: number }[] {
  const parMot = new Map<string, { picto: P; variantes: number }>();
  for (const p of pictos) {
    const cle = cleMot(p.mot);
    const deja = parMot.get(cle);
    if (deja) deja.variantes += 1;
    else parMot.set(cle, { picto: p, variantes: 1 });
  }
  return [...parMot.values()];
}

/** Les mots d'une liste écrite : un par ligne, ou séparés par des virgules ou des points-virgules. */
export function motsDeLaListe(texte: string): string[] {
  const vus = new Set<string>();
  return (texte ?? "")
    .split(/[\n,;]+/)
    .map((m) => m.replace(/^[\s\-–•*·]+/, "").trim())
    .filter((m) => {
      const cle = cleMot(m);
      if (!cle || vus.has(cle)) return false;
      vus.add(cle);
      return true;
    });
}

/** Ajoute des images à la sélection, à la suite, sans doublon. */
export function ajouter<P extends PictoLoto>(selection: P[], pictos: P[]): P[] {
  const pris = new Set(selection.map((p) => p.id));
  const suite = [...selection];
  for (const p of pictos) {
    if (pris.has(p.id)) continue;
    pris.add(p.id);
    suite.push(p);
  }
  return suite;
}

/** Remplace une image par un autre dessin, à la même place. */
export function remplacer<P extends PictoLoto>(selection: P[], ancien: number, nouveau: P): P[] {
  if (ancien === nouveau.id) return selection;
  if (selection.some((p) => p.id === nouveau.id)) return selection.filter((p) => p.id !== ancien);
  return selection.map((p) => (p.id === ancien ? nouveau : p));
}

/**
 * Complète la sélection au hasard jusqu'à `voulu`, avec des images d'autres
 * mots que ceux déjà choisis, et jamais une image qu'on a retirée.
 */
export function completerAuHasard<P extends PictoLoto>(
  selection: P[], candidats: P[], retires: Set<number>, voulu: number, hasard: () => number = Math.random,
): P[] {
  const mots = new Set(selection.map((p) => cleMot(p.mot)));
  const libres = uneImageParMot(candidats.filter((p) => !retires.has(p.id) && !mots.has(cleMot(p.mot)))).map((x) => x.picto);
  for (let i = libres.length - 1; i > 0; i--) {
    const j = Math.floor(hasard() * (i + 1));
    [libres[i], libres[j]] = [libres[j], libres[i]];
  }
  return ajouter(selection, libres.slice(0, Math.max(0, voulu - selection.length)));
}

/**
 * Combien d'images pour que les planches ne se ressemblent pas toutes : avec
 * autant d'images que de cases, chaque planche porte les mêmes. Deux fois plus
 * donne des planches variées.
 */
export const imagesConseillees = (casesParPlanche: number, planches: number) =>
  planches <= 1 ? casesParPlanche : Math.min(casesParPlanche * planches, casesParPlanche * 2);
