// La fenêtre de connexion de SimplySign Desktop, lue par UI Automation :
// trouver chaque champ d'après son libellé plutôt que par l'ordre des
// tabulations (voir simplysign-connexion.mjs).

/** Le milieu d'un élément, en pixels de l'écran. */
export const milieu = (e) => ({ x: Math.round(e.x + e.largeur / 2), y: Math.round(e.y + e.hauteur / 2) });

/**
 * Le champ de saisie d'un libellé (« ID: », « Token: ») : un élément sans nom
 * qui peut prendre la main, sur la même ligne et à sa droite de préférence,
 * sinon juste en dessous.
 */
export function champDuLibelle(elements, libelle) {
  const etiquette = elements.find((e) => e.nom === libelle);
  if (!etiquette) return null;
  const centre = milieu(etiquette);
  const candidats = elements.filter((e) => !e.nom && e.main && e.hauteur >= 12 && e.hauteur <= 80 && e.largeur >= 60);
  const ecart = (e) => {
    const m = milieu(e);
    const dy = Math.abs(m.y - centre.y);
    const dx = e.x - (etiquette.x + etiquette.largeur);
    return dx >= -10 && dy <= Math.max(etiquette.hauteur, e.hauteur) ? dx : 1000 + dy + Math.abs(dx);
  };
  return candidats.sort((a, b) => ecart(a) - ecart(b))[0] ?? null;
}
