// Tirage des pictogrammes d'un jeu : ce qui a été écarté ne revient pas.
//
// L'enseignant garde certaines images et en écarte d'autres. Retirer au sort
// ramenait pourtant les écartées, et perdait les gardées : il fallait tout
// revérifier à chaque tirage.

export interface Picto { id: number }

/**
 * Les pictos retenus, complétés jusqu'à `voulu` avec des candidats neufs :
 * jamais un picto écarté, jamais un doublon, toujours dans l'ordre des candidats.
 */
export function completer<P extends Picto>(retenus: P[], candidats: P[], bannis: Set<number>, voulu: number): P[] {
  const pris = new Set(retenus.map((p) => p.id));
  const sortie = [...retenus];
  for (const c of candidats) {
    if (sortie.length >= voulu) break;
    if (bannis.has(c.id) || pris.has(c.id)) continue;
    pris.add(c.id);
    sortie.push(c);
  }
  return sortie;
}

/** Combien de candidats demander pour pouvoir écarter bannis et retenus et en garder `voulu`. */
export const candidatsNecessaires = (voulu: number, bannis: number, retenus: number) => voulu + bannis + retenus;
