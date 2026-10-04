// ── Les élisions, sans IA ─────────────────────────────────────────────────
//
// « Je *ai* », « de Halloween », « la araignée » : un modèle qui écrit des
// étiquettes les laisse passer, et sa relecture aussi — l'astérisque entre
// « Je » et « ai » lui cache la règle. Or la règle est mécanique : devant une
// voyelle ou un h muet, je, me, te, se, le, la, de, ne, que s'élident ; ce
// devant être ; si devant il. On la fait ici, sur le texte, astérisques compris.

/** Les mots en h muet qu'une étiquette rencontre : les autres h sont aspirés (« le hibou »), on n'élide pas. */
const H_MUETS = [
  "halloween", "habit", "habiller", "habitant", "habiter", "habitude", "harmonie", "hélicoptère", "herbe", "héroïne", "heure",
  "heureu", "hier", "hippopotame", "hirondelle", "histoire", "hiver", "homme", "hôpital", "horaire", "horizon", "horloge",
  "hôtel", "huile", "huître", "humain", "humeur", "humide",
];

const VOYELLE = /^[aeiouàâäéèêëîïôöùûüœæ]/i;

/** Ce qui s'élide, et en quoi. */
const ELIDES: Record<string, string> = { je: "j", me: "m", te: "t", se: "s", le: "l", la: "l", de: "d", ne: "n", que: "qu", ce: "c", si: "s" };

/** Le mot qui suit appelle-t-il l'élision ? */
function appelleLElision(elide: string, suivant: string): boolean {
  const mot = suivant.toLocaleLowerCase("fr");
  if (elide === "ce") return /^(est|était|étaient|es)$/.test(mot);
  if (elide === "si") return /^ils?$/.test(mot);
  // « le un », « le onze », « le oui » : pas d'élision devant ces mots-là.
  if ((elide === "le" || elide === "la") && /^(un|une|onze|onzième|oui)$/.test(mot)) return false;
  return VOYELLE.test(mot) || H_MUETS.some((h) => mot.startsWith(h));
}

/**
 * Le texte, élisions faites. La majuscule du mot élidé se garde : « Je ai »
 * → « J'ai ». On avance mot par mot : « de la araignée » donne « de l'araignée »,
 * le premier mot ne cache pas le second.
 */
export function elider(texte: string): string {
  const morceaux = (texte ?? "").split(/(\s+)/);
  for (let i = 0; i + 2 < morceaux.length; i += 2) {
    const m = /^([«("—–-]*)(je|me|te|se|le|la|de|ne|que|ce|si)$/i.exec(morceaux[i]);
    const suivant = /^\*?([A-Za-zÀ-ÖØ-öø-ÿœŒæÆ]+)/.exec(morceaux[i + 2]);
    if (!m || !suivant || !appelleLElision(m[2].toLocaleLowerCase("fr"), suivant[1])) continue;
    const elide = ELIDES[m[2].toLocaleLowerCase("fr")];
    const forme = m[2][0] === m[2][0].toLocaleUpperCase("fr") ? elide.charAt(0).toLocaleUpperCase("fr") + elide.slice(1) : elide;
    // Le mot élidé se soude au suivant : l'espace entre eux disparaît.
    morceaux.splice(i, 3, `${m[1]}${forme}'${morceaux[i + 2]}`);
    i -= 2;
  }
  return morceaux.join("");
}
