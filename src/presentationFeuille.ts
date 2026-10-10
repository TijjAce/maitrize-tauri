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
 * La police d'abord : Luciole si l'ordinateur l'a — Éduscol la cite pour les
 * élèves à besoins particuliers —, Verdana sinon, présente sur Mac comme sur
 * Windows, large, aux lettres qui ne se confondent pas. OpenDyslexic n'y est
 * plus : les études ne lui trouvent aucun bénéfice (Rello et Baeza-Yates
 * 2013, Wery et Diliberto 2017). Puis l'espace, ce que la recherche soutient
 * le mieux : entre les lettres et, autant, entre les mots — élargir les unes
 * sans les autres ralentit la lecture (Zorzi 2012, Galliussi 2020) —, et
 * entre les lignes, de 1,5 à 2 (Cap école inclusive, BDA). L'italique et le
 * texte justifié, qui brouillent la lecture, sont retirés ; le gras remplace
 * l'italique.
 *
 * L'écriture cursive et les schémas gardent leur dessin : des lettres
 * espacées ne se tiennent plus, et un schéma est coté au millimètre.
 */
export const STYLE_DYS = `
  .feuille { font-family: "Luciole", Verdana, Geneva, Arial, sans-serif !important;
    letter-spacing: .08em; word-spacing: .25em; }
  .feuille p, .feuille li, .feuille .consigne, .feuille .consigne-ligne, .feuille .regle, .feuille .texte {
    line-height: 1.8; text-align: left; }
  .feuille .cs .cs-etape { line-height: 1.6; }
  .feuille .cs .cs-etape + .cs-etape { margin-top: .3em; }
  .feuille i, .feuille em, .feuille cite { font-style: normal; font-weight: 700; }
  .feuille [style*="justify"] { text-align: left !important; }
  .feuille svg, .feuille .gb-cursive { letter-spacing: normal; word-spacing: normal; }
`;
