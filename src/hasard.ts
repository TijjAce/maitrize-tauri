// Le hasard qu'on peut rejouer : une graine, toujours la même suite.
//
// Un jeu tiré au sort doit se réimprimer à l'identique le lendemain ; c'est
// la graine qui le garantit, et le bouton « autre tirage » qui en change.

export { hasard } from "./problemesBarres";

/** Mélange reproductible (Fisher-Yates). */
export function melanger<T>(r: () => number, liste: readonly T[]): T[] {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

/** `n` éléments pris au hasard, sans remise. */
export const piocher = <T,>(r: () => number, liste: readonly T[], n: number): T[] => melanger(r, liste).slice(0, n);

export const graineAuHasard = () => Math.floor(Math.random() * 1e9);
