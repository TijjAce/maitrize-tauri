// Poser un déroulement sur une séquence : ses séances, puis les feuilles des
// ateliers dans chacune, les mots des problèmes et les aides à la tâche.
//
// La fiche d'une séquence le fait quand on suit un déroulement ; les
// séquences toutes faites de Fabriquer aussi (voir sequencesToutesFaites.ts) :
// les deux créent la même séquence.

import { api, type Seance, type Sequence } from "./api";
import { aideDesMots, aidesDeLaSequence } from "./aidesDesSequences";
import type { CompetenceSelectionnee } from "./components/CompetenceTree";
import { seancesDuCadre, type Demarche } from "./demarches";
import type { FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { graineAuHasard } from "./hasard";
import { poserDansUneSeance } from "./impressionAtelier";
import { enoncesDuHtml, estLaSeanceDesMots, motsDesEnonces, nombreDeMots, noteDesMots } from "./motsDesProblemes";

export interface DeroulementAPoser {
  /** La séquence, déjà enregistrée. */
  sequence: Pick<Sequence, "id" | "titre">;
  demarche: Demarche;
  /** Le matériel et les documents de chaque séance. */
  plan: PlanDesFeuilles | null;
  /** Les feuilles à fabriquer : celles du plan qu'on garde, et les jeux rattachés à la compétence. */
  feuilles: FeuilleAFabriquer[];
  competence: CompetenceSelectionnee | null;
  /** Le numéro de la première séance : à la suite de celles qui existent. */
  depuis: number;
  /** Le matériel réel que la compétence nomme : chaque séance le rappelle. */
  noteReelle: string;
  /** Le séquentiel de chaque séance ; la séance de la prise de parole (négative : aucune). */
  aides: { sequentiel: boolean; parole: number };
  /** Le tirage de chaque feuille, d'après son rang : celui de l'aperçu. Au hasard sinon. */
  graine?: (rang: number) => number;
  onProgres?: (texte: string) => void;
  /** Une feuille qui n'a pas pu être fabriquée : les autres se font quand même. */
  onEchec?: (titre: string, erreur: unknown) => void;
}

/** Pose les séances et range chaque feuille dans la sienne ; rend les séances, et combien de feuilles et d'aides y sont. */
export async function poserLeDeroulement(x: DeroulementAPoser): Promise<{ seances: Seance[]; feuilles: number; aides: number }> {
  const { sequence, demarche, plan, competence } = x;
  // Numérotées à la suite, avec la note du matériel, les documents à montrer et la compétence visée.
  const seances = seancesDuCadre(demarche, sequence.id, x.depuis).map((sc, i) => ({
    ...sc, materiel: [plan?.materiel[i] || sc.materiel, plan?.documents?.[i], x.noteReelle].filter(Boolean).join("\n"),
    competences: competence ? JSON.stringify([competence]) : sc.competences,
  }));
  for (const seance of seances) await api.seanceSave(seance);
  // Puis les feuilles, chacune dans sa séance, en PDF, avec la compétence en tête.
  let faites = 0;
  const enonces: string[] = [];
  for (const [rang, f] of x.feuilles.entries()) {
    const seance = seances[f.seance];
    if (!seance) continue;
    x.onProgres?.(`Feuilles : ${faites + 1} sur ${x.feuilles.length}…`);
    try {
      // Le tirage et les réglages vont avec la feuille : « Modifier dans Fabriquer » la refait.
      const graine = x.graine ? x.graine(rang) : graineAuHasard();
      const sortie = f.fabriquer(graine);
      enonces.push(...enoncesDuHtml(sortie.html));
      await poserDansUneSeance(f.atelier, f.titre, sortie.html, sortie.style, seance.id, sequence.id,
        { competences: competence ? [competence] : undefined, fabrication: { memoires: sortie.refaire, graine: sortie.graine ?? graine } });
      faites++;
    } catch (e) {
      x.onEchec?.(f.titre, e);
    }
  }
  // Les mots des problèmes, relevés dans les énoncés qu'on vient de tirer : dans le matériel de la première séance, et sur leur feuille.
  const mots = estLaSeanceDesMots(demarche.seances[0]) ? motsDesEnonces(enonces) : null;
  if (mots && nombreDeMots(mots) && seances[0]) await api.seanceSave({ ...seances[0], materiel: [seances[0].materiel, noteDesMots(mots)].filter(Boolean).join("\n") });
  // Puis les aides à la tâche, chacune dans sa séance.
  const aides = [
    ...(mots && nombreDeMots(mots) ? [aideDesMots(0, mots)] : []),
    ...aidesDeLaSequence(seances, sequence, x.aides),
  ];
  let aidees = 0;
  for (const a of aides) {
    const seance = seances[a.seance];
    if (!seance) continue;
    x.onProgres?.(`Aides à la tâche : ${aidees + 1} sur ${aides.length}…`);
    try {
      const sortie = await a.fabriquer();
      await poserDansUneSeance(a.atelier, a.titre, sortie.html, sortie.style, seance.id, sequence.id,
        { competences: competence ? [competence] : undefined, fabrication: { memoires: sortie.refaire } });
      aidees++;
    } catch (e) {
      x.onEchec?.(a.titre, e);
    }
  }
  return { seances, feuilles: faites, aides: aidees };
}
