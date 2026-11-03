// Les noms à masquer avant tout envoi à l'IA (voir `confidentialite`).
//
// Les élèves d'abord ; mais un compte rendu ou un bilan nomme aussi des
// adultes : la maman, l'AESH, la collègue du mardi, l'enseignant lui-même. On
// masque donc en plus les personnes que l'enseignant a notées dans les repères
// de l'établissement, son nom, et celles que le texte en cours présente — les
// participants d'une réunion. L'établissement — son nom, son adresse — part
// masqué lui aussi.

import { api } from "./api";
import { nomsDansUnTexte, pseudonymiserTout, type Remplacement } from "./confidentialite";
import { CONTACTS, lireEtablissement } from "./etablissement";

/** Les élèves, l'enseignant, les contacts de l'établissement, et les personnes nommées dans `textes`. */
export async function nomsAMasquer(textes: string[] = []): Promise<string[]> {
  // Une liste illisible n'empêche pas de masquer les autres : on fait avec ce qu'on a.
  const lire = async <T,>(f: () => Promise<T>, defaut: T): Promise<T> => { try { return await f(); } catch { return defaut; } };
  const [eleves, reglages] = await Promise.all([
    lire(() => api.elevesList(), []),
    lire((): Promise<Record<string, string>> => api.settingsAll(), {}),
  ]);
  const contacts = lireEtablissement(reglages).contacts;
  const libres = [...CONTACTS.map((c) => contacts[c.id] ?? ""), ...textes].filter(Boolean);
  const enseignant = (reglages.enseignantNom ?? "").trim();
  return [...new Set([...eleves.map((e) => e.nom), ...(enseignant ? [enseignant] : []), ...libres.flatMap(nomsDansUnTexte)])];
}

/** L'établissement : son nom et son adresse, tels que les réglages les gardent. */
export async function lieuxAMasquer(): Promise<string[]> {
  let reglages: Record<string, string> = {};
  // Des réglages illisibles n'empêchent pas d'envoyer : on masque ce qu'on sait.
  try { reglages = await api.settingsAll(); } catch { /* sans réglages, sans lieux */ }
  return [reglages.ecole ?? "", lireEtablissement(reglages).adresse].map((l) => l.trim()).filter(Boolean);
}

/**
 * Des textes qui parlent des élèves, prêts à partir : les noms connus, et tout
 * ce qui désigne quelqu'un (voir `confidentialite`). `autres` : des noms en
 * plus, ceux que l'appelant connaît déjà.
 */
export async function masquerSurLesEleves(textes: string[], autres: string[] = []): Promise<{ textes: string[]; table: Remplacement[] }> {
  const [noms, lieux] = await Promise.all([nomsAMasquer(), lieuxAMasquer()]);
  return pseudonymiserTout(textes, [...autres, ...noms], { portee: "eleves", lieux });
}
