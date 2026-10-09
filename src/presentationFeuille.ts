// ── Comment la feuille se présente : le mode dyslexique ───────────────────
//
// Chaque feuille d'un atelier peut sortir en « mode dyslexique » : une police
// sans empattement aux lettres bien distinctes, des lettres et des mots plus
// espacés, des lignes plus hautes, rien en italique, rien de justifié. Le
// choix se garde par atelier, dans un réglage partagé entre les ordinateurs,
// et vaut pour l'aperçu, l'impression, le bureau et les séances.
//
// On n'y touche qu'au texte courant : ce qui fixe sa propre police — l'écriture
// cursive, les chiffres d'un schéma — la garde, et les feuilles calculées au
// millimètre ne changent pas de mise en page.

/** Où se garde le choix d'un atelier — préfixe « fabriquer: », donc partagé. */
export const cleModeDys = (atelier: string) => `fabriquer:dys:${atelier}`;

/** Émis quand le choix change : l'aperçu ouvert se met à jour. */
export const EVT_MODE_DYS = "maitrize:mode-dys";

export const lireModeDys = (brut: string | null | undefined): boolean => brut === "1";
export const ecrireModeDys = (dys: boolean): string => (dys ? "1" : "");

/**
 * Le style ajouté à la feuille en mode dyslexique.
 *
 * La police d'abord : Luciole ou OpenDyslexic si l'ordinateur les a, Verdana
 * sinon — présente sur Mac comme sur Windows, large, aux lettres qui ne se
 * confondent pas. Puis l'espace : entre les lettres, entre les mots, entre les
 * lignes. L'italique et le texte justifié, qui brouillent la lecture, sont
 * retirés.
 */
export const STYLE_DYS = `
  .feuille { font-family: "Luciole", "OpenDyslexic", Verdana, Geneva, Arial, sans-serif !important;
    letter-spacing: .05em; word-spacing: .16em; }
  .feuille p, .feuille li, .feuille .consigne, .feuille .consigne-ligne, .feuille .regle, .feuille .texte {
    line-height: 1.6; text-align: left; }
  .feuille i, .feuille em, .feuille cite { font-style: normal; font-weight: 600; }
  .feuille [style*="justify"] { text-align: left !important; }
`;
