// Les petits outils des générateurs de calcul : écrire un nombre comme au
// tableau, tirer un entier ou un élément au sort avec le hasard rejouable.

/** « 1 234 » — l'espace fine insécable des milliers, la virgule des décimaux. */
export function fr(n: number, decimales = 0): string {
  const signe = n < 0 ? "−" : "";
  const fixe = Math.abs(n).toFixed(decimales);
  const [entier, dec] = fixe.split(".");
  const groupe = entier.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${signe}${groupe}${dec ? `,${dec}` : ""}`;
}

/** Un entier entre `min` et `max` compris. */
export const entier = (alea: () => number, min: number, max: number) => min + Math.floor(alea() * (max - min + 1));

/** Un élément de la liste. */
export const choisir = <T,>(alea: () => number, liste: readonly T[]): T => liste[Math.floor(alea() * liste.length)];
