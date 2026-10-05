// Les lignes que posent les boutons du prévu du cahier journal pour citer un
// PDF du bureau (📄), une page de manuel (📖), une compétence (🎯) ou un
// rituel (🔁). Ce qu'elles nomment n'est ni une séquence ni un jeu : le PDF
// « Mots mêlés Halloween » ne cite pas la séquence « Mots mêlés », ni le jeu
// du même nom.

const AUTRE_CITATION = /^\s*(?:📄|📖|🎯|🔁)/u;

/** Vrai pour une ligne qui cite un PDF, un manuel, une compétence ou un rituel. */
export const citeAutreChose = (ligne: string) => AUTRE_CITATION.test(ligne);

/** Le texte sans ces lignes : ce qui reste peut nommer une séquence ou un jeu. */
export const sansAutresCitations = (texte: string) =>
  (texte ?? "").split("\n").filter((ligne) => !citeAutreChose(ligne)).join("\n");
