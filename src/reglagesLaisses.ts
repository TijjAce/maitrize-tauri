// Les réglages qu'on a laissés dans un atelier de Fabriquer — ses couleurs, ses
// options, le graphème de la semaine —, gardés sur cet ordinateur (voir
// useMemoire). Une séquence qui pioche une feuille dans l'atelier la fabrique
// telle qu'on l'y a réglée.

export function reglagesLaisses<T>(cle: string): Partial<T> {
  try {
    const brut = localStorage.getItem(`fabriquer:${cle}`);
    const lu = brut ? JSON.parse(brut) : {};
    return lu && typeof lu === "object" && !Array.isArray(lu) ? lu as Partial<T> : {};
  } catch {
    return {};
  }
}
