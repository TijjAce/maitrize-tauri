// Les noms à masquer avant tout envoi à l'IA (voir `confidentialite`).
//
// Les élèves d'abord ; mais un compte rendu ou un bilan nomme aussi des
// adultes : la maman, l'AESH, la collègue du mardi. On masque donc en plus les
// personnes que l'enseignant a notées dans les repères de l'établissement, et
// celles que le texte en cours présente — les participants d'une réunion.

import { api } from "./api";
import { nomsDansUnTexte } from "./confidentialite";
import { CONTACTS, lireEtablissement } from "./etablissement";

/** Les élèves, les contacts de l'établissement, et les personnes nommées dans `textes`. */
export async function nomsAMasquer(textes: string[] = []): Promise<string[]> {
  // Une liste illisible n'empêche pas de masquer les autres : on fait avec ce qu'on a.
  const lire = async <T,>(f: () => Promise<T>, defaut: T): Promise<T> => { try { return await f(); } catch { return defaut; } };
  const [eleves, reglages] = await Promise.all([
    lire(() => api.elevesList(), []),
    lire((): Promise<Record<string, string>> => api.settingsAll(), {}),
  ]);
  const contacts = lireEtablissement(reglages).contacts;
  const libres = [...CONTACTS.map((c) => contacts[c.id] ?? ""), ...textes].filter(Boolean);
  return [...new Set([...eleves.map((e) => e.nom), ...libres.flatMap(nomsDansUnTexte)])];
}
