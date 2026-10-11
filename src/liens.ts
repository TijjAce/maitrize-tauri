// Les adresses web d'un texte, pour les rendre cliquables.
//
// Une adresse finit au premier blanc ; la ponctuation qui la suit — un point
// en fin de phrase, une virgule — n'en fait pas partie. Une parenthèse
// finale en fait partie si l'adresse l'a ouverte (« …Carnac_(stone_rows) »),
// pas si elle ferme la phrase.

const ADRESSE = /https?:\/\/[^\s<>"«»]+/g;

const compte = (texte: string, c: string) => texte.split(c).length - 1;

/** L'adresse sans la ponctuation de la phrase qui la suit. */
function sansPonctuationFinale(adresse: string): string {
  let a = adresse;
  for (;;) {
    if (/[.,;:!?'’]$/.test(a)) a = a.slice(0, -1);
    else if (a.endsWith(")") && compte(a, ")") > compte(a, "(")) a = a.slice(0, -1);
    else if (a.endsWith("]") && compte(a, "]") > compte(a, "[")) a = a.slice(0, -1);
    else return a;
  }
}

/** Le texte en morceaux, dans l'ordre : le texte courant, et les adresses. */
export function morceauxAvecLiens(texte: string): { texte: string; lien: boolean }[] {
  const morceaux: { texte: string; lien: boolean }[] = [];
  let depuis = 0;
  for (const m of texte.matchAll(ADRESSE)) {
    const debut = m.index ?? 0;
    const adresse = sansPonctuationFinale(m[0]);
    if (!/^https?:\/\/[^/]/.test(adresse)) continue;
    if (debut > depuis) morceaux.push({ texte: texte.slice(depuis, debut), lien: false });
    morceaux.push({ texte: adresse, lien: true });
    depuis = debut + adresse.length;
  }
  if (depuis < texte.length) morceaux.push({ texte: texte.slice(depuis), lien: false });
  return morceaux;
}
