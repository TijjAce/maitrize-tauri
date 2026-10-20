// Une réponse lente (l'IA met quelques secondes) se range chez l'élève pour qui
// on l'a demandée. L'écran a pu changer d'élève entre-temps : la réponse
// s'appliquait alors au document affiché — celui d'un autre élève — avec
// l'état d'avant la demande, et la frappe suivante l'enregistrait chez lui.

import { api } from "./api";

/**
 * Modifie le document enregistré d'un élève : relu, changé, réécrit. Pour la
 * réponse qui revient quand l'écran montre un autre élève.
 */
export async function modifierLeDocument<T>(
  eleveId: string,
  typeDoc: string,
  lire: (brut: string | null) => T,
  changer: (document: T) => T,
): Promise<void> {
  const suite = changer(lire(await api.documentEleveGet(eleveId, typeDoc)));
  await api.documentEleveSet(eleveId, typeDoc, JSON.stringify(suite));
}

/** Le JSON d'un document, ou `vide` s'il n'existe pas ou ne se lit pas. */
export function lireJson<T>(vide: T): (brut: string | null) => T {
  return (brut) => {
    if (!brut) return vide;
    try { return { ...vide, ...JSON.parse(brut) }; } catch { return vide; }
  };
}
