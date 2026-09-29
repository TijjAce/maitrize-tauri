// Marquer les verbes des étiquettes, avec l'IA.
//
// Pour colorer le verbe, il faut le désigner : entourer d'astérisques le mot
// de chaque phrase. Seize étiquettes, c'est long à la main. Le modèle le
// fait ; mais il ne touche à rien d'autre. On ne garde sa ligne que si, une
// fois ses astérisques retirés, elle redonne la phrase de l'enseignant — à
// la lettre. Les prénoms des élèves sont masqués avant l'envoi.

import type { ChatMessage } from "./api";
import { sansMarques } from "./triEtiquettes";

/** Ce qu'on demande au modèle : le verbe conjugué de chaque phrase, entre astérisques. */
export function promptMarquerVerbes(phrases: string[]): ChatMessage[] {
  const systeme = [
    "Tu aides un enseignant à préparer un exercice de grammaire, en français.",
    "On te donne des phrases, une par ligne. Recopie chaque ligne à l'identique, dans le même ordre, en entourant d'astérisques le verbe conjugué.",
    "Au passé composé, l'auxiliaire et le participe vont ensemble : « J'*ai mangé* une pomme. ». L'apostrophe reste hors des astérisques : « J'*ai* un vélo. ».",
    "Ne change aucun mot, aucune lettre, aucune ponctuation, et ne corrige rien. Les marqueurs entre crochets comme [P1] se recopient tels quels.",
    "Une ligne sans verbe conjugué se recopie telle quelle, sans astérisque.",
    "Réponds uniquement par les lignes, sans numéro, sans tiret, sans commentaire.",
  ].join(" ");
  return [{ role: "system", content: systeme }, { role: "user", content: phrases.map(sansMarques).join("\n") }];
}

/** Une forme comparable : espaces resserrées, apostrophes droites. */
const forme = (t: string) => t.replace(/[’ʼ]/g, "'").replace(/\s+/g, " ").trim();

const nettoyer = (ligne: string) => ligne.trim().replace(/^(\d+[.)]|[-•–])\s+/, "").replace(/^[«"“]\s*|\s*[»"”]$/g, "").trim();

/**
 * Les phrases avec leur verbe marqué : celles que le modèle a recopiées à
 * la lettre. Les autres restent comme elles étaient — marquées à la main,
 * ou pas du tout.
 */
export function marquesDeLaReponse(reponse: string, phrases: string[]): { phrases: string[]; marquees: number } {
  const proposees = new Map<string, string>();
  for (const brute of (reponse ?? "").replace(/```[a-z]*/g, "").split("\n")) {
    const ligne = nettoyer(brute);
    if (!/\*[^*\n]+\*/.test(ligne)) continue;
    const cle = forme(sansMarques(ligne));
    if (!proposees.has(cle)) proposees.set(cle, ligne.replace(/\s+/g, " "));
  }
  let marquees = 0;
  const sortie = phrases.map((p) => {
    const proposee = proposees.get(forme(sansMarques(p)));
    if (!proposee || sansMarques(proposee) === proposee) return p;
    // La phrase de l'enseignant, à la lettre : sinon on remet ses apostrophes et ses espaces, et l'on garde la sienne en cas de doute.
    const fidele = sansMarques(proposee) === sansMarques(p) ? proposee : remarquer(sansMarques(p), proposee);
    if (!fidele) return p;
    marquees++;
    return fidele;
  });
  return { phrases: sortie, marquees };
}

/** Reporte les astérisques de la ligne proposée sur la phrase d'origine, caractère pour caractère. */
function remarquer(original: string, proposee: string): string | null {
  let sortie = "";
  let i = 0;
  for (const c of proposee) {
    if (c === "*") { sortie += "*"; continue; }
    if (i >= original.length || forme(original[i]) !== forme(c)) return null;
    sortie += original[i++];
  }
  return i === original.length ? sortie : null;
}
