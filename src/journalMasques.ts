// Ce qu'on cite sans l'imprimer.
//
// Citer un jeu, une séquence ou un rituel dans le prévu montre sa règle ou
// son déroulement sous le prévu — à l'écran, et sur le papier. Sur le
// papier, ce n'est pas toujours voulu : la règle d'un jeu qu'on connaît par
// cœur, le déroulement d'une séance déjà imprimé la veille, et le cahier
// journal fait dix pages. Une case par bloc, par créneau : ce qui est coché
// reste sous les yeux à l'écran et ne s'imprime pas.
//
// Ce qu'on masque se garde par créneau, dans un réglage partagé entre les
// ordinateurs (préfixe « journal: »).

export const PREFIXE_MASQUES = "journal:masques:";

/** Où se garde ce qu'un créneau cite sans l'imprimer. */
export const cleMasques = (creneauId: string) => `${PREFIXE_MASQUES}${creneauId}`;

/** Émis quand un masque change : le journal ouvert ailleurs se met à jour. */
export const EVT_MASQUES = "maitrize:journal-masques";

export const masqueJeu = (id: string) => `jeu:${id}`;
export const masqueSequence = (sequenceId: string, seanceId?: string | null) => `sequence:${sequenceId}|${seanceId ?? ""}`;
export const masqueRituel = (id: string) => `rituel:${id}`;

/** Les masques d'un créneau, tels qu'on peut s'y fier : des clés, sans doublon. */
export function lireMasques(brut: string | null | undefined): string[] {
  if (!brut) return [];
  try {
    const lu = JSON.parse(brut);
    return Array.isArray(lu) ? [...new Set(lu.filter((x): x is string => typeof x === "string" && x.trim() !== ""))] : [];
  } catch {
    return [];
  }
}

export const ecrireMasques = (masques: string[]) => JSON.stringify(masques);

/** Coche ou décoche : la clé entre dans la liste, ou en sort. */
export const basculerMasque = (masques: readonly string[], cle: string): string[] =>
  (masques.includes(cle) ? masques.filter((m) => m !== cle) : [...masques, cle]);

/** Tous les masques, créneau par créneau, d'après l'ensemble des réglages. */
export function masquesDesReglages(reglages: Record<string, string>): Record<string, string[]> {
  const sortie: Record<string, string[]> = {};
  for (const [cle, valeur] of Object.entries(reglages)) {
    if (!cle.startsWith(PREFIXE_MASQUES) || cle.length === PREFIXE_MASQUES.length) continue;
    const masques = lireMasques(valeur);
    if (masques.length) sortie[cle.slice(PREFIXE_MASQUES.length)] = masques;
  }
  return sortie;
}

/** Ce qui s'imprime : ce que le créneau cite, moins ce qu'on y a masqué. */
export const aImprimer = <T,>(cites: T[], cle: (x: T) => string, masques: readonly string[]): T[] =>
  (masques.length ? cites.filter((x) => !masques.includes(cle(x))) : cites);
