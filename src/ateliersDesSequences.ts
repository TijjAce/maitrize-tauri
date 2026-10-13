// Les ateliers que les séquences prennent déjà, compétence par compétence.
//
// Une séquence créée sur une compétence suit sa démarche, et la démarche
// fabrique ses feuilles dans les ateliers de Fabriquer : les cubes pour
// grouper par dix, « Comparer les nombres » pour ranger, la grille de fluence
// pour lire à voix haute. Ce n'est pas une devinette sur des mots-clés :
// c'est ce que fait déjà la séquence. Le catalogue par compétence le
// reprend, pour qu'on voie d'un coup quel atelier sert quelle compétence.

import type { CompetenceSelectionnee } from "./components/CompetenceTree";
import { ONGLETS } from "./catalogueAteliers";
import { demarcheSuggeree } from "./demarches";
import { classeDe, planDesFeuilles } from "./feuillesDesSequences";
import { DEMARCHE_CATEGORISER } from "./sequenceCategoriser";
import { DEMARCHE_COLLECTIONS } from "./sequenceCollections";
import { ATELIER_PROBLEME_DU_JOUR, DEMARCHE_PROBLEME } from "./sequenceProblemeDuJour";
import { niveauxDeLaLigne, rattacherAtelier } from "./ateliersCompetences";

/** Les séquences de maternelle qui naissent d'un atelier, et cet atelier : leurs feuilles se font là. */
const ATELIER_DE_LA_DEMARCHE: Record<string, string> = {
  [DEMARCHE_COLLECTIONS]: "collections", [DEMARCHE_CATEGORISER]: "categoriser", [DEMARCHE_PROBLEME]: ATELIER_PROBLEME_DU_JOUR,
};

const PERIODES = [1, 2, 3, 4, 5];

/**
 * Les ateliers dont la séquence de la compétence fabrique des feuilles,
 * d'une période à l'autre — la numération du CP ne prend pas les mêmes
 * nombres en période 2 et en période 4 —, et pour chaque classe d'une
 * compétence commune à plusieurs (« CP-CE2 »). Seuls ceux de Fabriquer.
 */
export function ateliersDeLaSequence(c: CompetenceSelectionnee): string[] {
  const ateliers = new Set<string>();
  const niveaux = niveauxDeLaLigne(c.niveau);
  for (const niveau of niveaux.length ? niveaux : [c.niveau ?? ""]) {
    const classe = classeDe(niveau);
    for (const periode of PERIODES) {
      const demarche = demarcheSuggeree({ ...c, niveau }, c.referentielNom, periode);
      const atelier = ATELIER_DE_LA_DEMARCHE[demarche.id];
      if (atelier) ateliers.add(atelier);
      if (!classe) continue;
      for (const f of planDesFeuilles(demarche.id, { classe, periode, competence: c.competenceTitre })?.feuilles ?? []) ateliers.add(f.atelier);
    }
  }
  return [...ateliers].filter((a) => (ONGLETS as readonly string[]).includes(a));
}

/**
 * Ce qu'il faut écrire pour rattacher à chaque compétence les ateliers de sa
 * séquence — rien pour ceux qui le sont déjà, ni pour ceux qu'on a retirés
 * à la main depuis, puisqu'on ne repasse qu'à la demande —, et combien de
 * liens et de compétences cela fait.
 */
export function rattacherLesAteliersDesSequences(reglages: Record<string, string>, competences: CompetenceSelectionnee[]):
  { ecrit: Record<string, string>; liens: number; competences: number } {
  const courant = { ...reglages };
  const ecrit: Record<string, string> = {};
  let liens = 0;
  let touchees = 0;
  for (const c of competences) {
    let ici = false;
    for (const atelier of ateliersDeLaSequence(c)) {
      const e = rattacherAtelier(courant, atelier, c);
      if (!Object.keys(e).length) continue;
      Object.assign(courant, e);
      Object.assign(ecrit, e);
      liens++;
      ici = true;
    }
    if (ici) touchees++;
  }
  return { ecrit, liens, competences: touchees };
}
