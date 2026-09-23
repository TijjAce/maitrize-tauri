// ── L'ordre des séances ───────────────────────────────────────────────────
//
// Une séquence se construit rarement dans l'ordre : on écrit la séance 3 en
// premier parce qu'on l'a en tête, puis on intercale. Déplacer une séance
// doit donc être aussi simple que de la faire glisser.
//
// Le numéro n'est pas qu'un affichage : c'est lui qui range la liste, qui
// s'écrit dans le cahier journal (« séance 3/6 ») et qui s'imprime. Le
// renuméroter proprement — 1, 2, 3… sans trou ni doublon — est donc le vrai
// travail, et c'est ce que cette fonction fait.

/** Ce dont on a besoin pour ranger : le reste de la séance ne nous regarde pas. */
export interface Numerotee {
  id: string;
  numero: number;
}

/** Les séances dans leur ordre d'affichage : par numéro, puis par ordre reçu. */
export function ordonnees<T extends Numerotee>(seances: T[]): T[] {
  return seances.map((s, rang) => ({ s, rang }))
    .sort((a, b) => a.s.numero - b.s.numero || a.rang - b.rang)
    .map((x) => x.s);
}

/**
 * La liste rangée après avoir posé `deId` à la place de `versId`.
 *
 * Déplacer, et non échanger : poser la séance 5 entre la 1 et la 2 doit
 * décaler les autres, pas troquer deux numéros. C'est ce qu'on attend d'un
 * glisser-déposer, et ce que l'échange ne faisait pas.
 */
export function deplacee<T extends Numerotee>(seances: T[], deId: string, versId: string): T[] {
  const liste = ordonnees(seances);
  const de = liste.findIndex((s) => s.id === deId);
  const vers = liste.findIndex((s) => s.id === versId);
  if (de < 0 || vers < 0 || de === vers) return liste;
  const suite = [...liste];
  const [prise] = suite.splice(de, 1);
  suite.splice(vers, 0, prise);
  return suite;
}

/** La même, d'un cran vers le haut (-1) ou vers le bas (+1). */
export function decalee<T extends Numerotee>(seances: T[], id: string, sens: -1 | 1): T[] {
  const liste = ordonnees(seances);
  const i = liste.findIndex((s) => s.id === id);
  const j = i + sens;
  if (i < 0 || j < 0 || j >= liste.length) return liste;
  return deplacee(liste, id, liste[j].id);
}

/**
 * Ce qu'il faut réécrire pour que les numéros suivent : 1, 2, 3…
 *
 * On ne renvoie que ce qui change. Une séquence de douze séances dont deux
 * bougent ne doit pas provoquer douze écritures — la synchronisation les
 * transporterait toutes, et l'autre ordinateur les rejouerait.
 */
export function renumerotees<T extends Numerotee>(rangees: T[]): T[] {
  return rangees
    .map((s, i) => ({ ...s, numero: i + 1 }))
    .filter((s, i) => s.numero !== rangees[i].numero);
}

/**
 * Une numérotation abîmée se répare-t-elle ?
 *
 * Des doublons ou des trous (1, 1, 5) arrivent après un import, une copie ou
 * une vieille version : la liste s'affiche alors dans un ordre instable.
 */
export function numerotationAbimee(seances: Numerotee[]): boolean {
  const liste = ordonnees(seances);
  return liste.some((s, i) => s.numero !== i + 1);
}
