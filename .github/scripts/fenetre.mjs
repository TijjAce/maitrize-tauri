// La fenêtre de connexion de SimplySign Desktop, lue par UI Automation :
// trouver chaque champ d'après son libellé plutôt que par l'ordre des
// tabulations (voir simplysign-connexion.mjs).

/** Le milieu d'un élément, en pixels de l'écran. */
export const milieu = (e) => ({ x: Math.round(e.x + e.largeur / 2), y: Math.round(e.y + e.hauteur / 2) });

/** Un champ de saisie : une zone d'édition (classe « EDIT » de Windows Forms), ou à défaut un élément qui peut prendre la main. */
const estUnChamp = (e) => !e.nom && (/EDIT/i.test(e.classe ?? "") || e.main) && e.hauteur >= 12 && e.hauteur <= 80 && e.largeur >= 60;

/**
 * Le champ de saisie d'un libellé (« ID: », « Token: »), sur la même ligne et
 * à sa droite de préférence, sinon juste en dessous. Windows n'annonce pas
 * toujours qu'une zone d'édition peut prendre la main : sa classe suffit.
 */
export function champDuLibelle(elements, libelle) {
  const etiquette = elements.find((e) => e.nom === libelle);
  if (!etiquette) return null;
  const centre = milieu(etiquette);
  const candidats = elements.filter(estUnChamp);
  const ecart = (e) => {
    const m = milieu(e);
    const dy = Math.abs(m.y - centre.y);
    const dx = e.x - (etiquette.x + etiquette.largeur);
    return dx >= -10 && dy <= Math.max(etiquette.hauteur, e.hauteur) ? dx : 1000 + dy + Math.abs(dx);
  };
  return candidats.sort((a, b) => ecart(a) - ecart(b))[0] ?? null;
}
