// Les aides à la tâche qu'une séquence reçoit en se créant.
//
// Quand on suit le déroulement d'une démarche, chaque séance reçoit son
// séquentiel — ce que l'élève va faire, étape par étape, à cocher —, et la
// séance du bilan, la fiche pour préparer sa prise de parole. Elles se
// glissent dans les séances comme les feuilles des ateliers, et « Modifier
// dans Fabriquer » les rouvre dans « Aides à la tâche » (voir
// aidesALaTache.ts).

import type { Sequence } from "./api";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { motsDesProblemesImprimable, type MotsDesProblemes } from "./motsDesProblemes";
import { resoudrePictos, motDuMot } from "./components/Tapuscrit";
import { motPrincipal, type MotDeConsigne } from "./tapuscrit";
import {
  REGLAGES_PAROLE, etapesDeLaFiche, etapesDeLaSeance, htmlPriseDeParole, htmlSequentiel, modeleParole, motsDeLaParole, sequentielDeLaSeance,
  STYLE_PAROLE, styleDuSequentiel, type ReglagesParole, type ReglagesSequentiel,
} from "./aidesALaTache";

/** La fiche d'une tâche décomposée, ses images chargées : pour l'imprimer, ou la poser dans une séance. */
export async function sequentielImprimable(r: ReglagesSequentiel): Promise<{ html: string; style: string }> {
  const mots = etapesDeLaFiche(r).map(motPrincipal);
  const { pictoDe, images } = await resoudrePictos(mots.filter((m): m is MotDeConsigne => m !== null));
  return { html: htmlSequentiel(r, mots.map((m) => (m ? pictoDe(m) : null)), images), style: styleDuSequentiel(r) };
}

/** La fiche pour préparer une prise de parole, ses images chargées. */
export async function priseDeParoleImprimable(r: ReglagesParole): Promise<{ html: string; style: string }> {
  const { pictoDe, images } = await resoudrePictos(motsDeLaParole(r).map(motDuMot));
  return { html: htmlPriseDeParole(r, (mot) => pictoDe(motDuMot(mot)), images), style: STYLE_PAROLE() };
}

/** Ce qu'on sait d'une séance de la démarche : son titre, ses phases. */
interface SeanceDuCadre { titre: string; phases: { phase: string }[] }

const ORAL = /bilan|retien|clôture|institutionnalisation|échange|écoute des productions|mise en commun|synthèse/i;
const estUneEvaluation = (s: SeanceDuCadre) => /évaluation/i.test(s.titre) || (s.phases.length > 0 && s.phases.every((p) => /évaluation/i.test(p.phase)));

/**
 * La séance où l'on prépare sa prise de parole : la dernière qui a un temps
 * de bilan, d'échange ou de synthèse, hors évaluation ; sinon celle qui
 * précède l'évaluation ; sinon la dernière.
 */
export function seanceDeLaParole(seances: SeanceDuCadre[]): number {
  let retenue = -1;
  seances.forEach((s, i) => { if (!estUneEvaluation(s) && s.phases.some((p) => ORAL.test(p.phase))) retenue = i; });
  if (retenue >= 0) return retenue;
  const derniere = seances.length - 1;
  return derniere > 0 && estUneEvaluation(seances[derniere]) ? derniere - 1 : Math.max(0, derniere);
}

/** Une aide à poser dans une séance : de quoi la fabriquer, et de quoi la refaire dans Fabriquer. */
export interface AideAPoser {
  /** La séance qui la reçoit, dans l'ordre de la démarche. */
  seance: number;
  atelier: "sequentiel" | "priseDeParole" | "etiquettes";
  titre: string;
  fabriquer: () => Promise<{ html: string; style: string; refaire: Record<string, unknown> }>;
}

/**
 * La feuille des mots des problèmes, pour la séance qui ouvre la séquence :
 * les mots que ses énoncés emploient, chacun avec son image (voir
 * motsDesProblemes.ts). Elle se range avec les étiquettes de mots.
 */
export const aideDesMots = (seance: number, mots: MotsDesProblemes): AideAPoser => ({
  seance, atelier: "etiquettes", titre: "Les mots des problèmes",
  fabriquer: async () => { const f = await motsDesProblemesImprimable(mots); return { html: f.html, style: STYLE_FEUILLE + f.style, refaire: {} }; },
});

/** La prise de parole d'une séquence : dire ce qu'on a appris, le titre de la séquence au centre. */
export const paroleDeLaSequence = (sequence: Pick<Sequence, "titre">): ReglagesParole => {
  const modele = modeleParole("appris");
  return {
    ...REGLAGES_PAROLE, sujet: sequence.titre.trim().slice(0, 80), modele: modele.id, branches: modele.branches.map((b) => b.titre),
    carte: true, debuts: true, cartes: false, de: "aucun", mots: [],
  };
};

/**
 * Les aides d'une séquence qu'on crée : le séquentiel de chaque séance — ses
 * consignes, sinon ses phases dites pour l'élève —, et la prise de parole
 * dans la séance choisie (`parole` négatif : aucune).
 */
export function aidesDeLaSequence(
  seances: { titre: string; numero: number; consignes?: string; tableauDeroulement?: string }[],
  sequence: Pick<Sequence, "titre">,
  choix: { sequentiel: boolean; parole: number },
): AideAPoser[] {
  const aides: AideAPoser[] = [];
  if (choix.sequentiel) {
    seances.forEach((s, i) => {
      const etapes = etapesDeLaSeance(s);
      if (!etapes.length) return;
      const r = sequentielDeLaSeance(s.titre.trim() || `Séance ${s.numero}`, etapes);
      aides.push({
        seance: i, atelier: "sequentiel", titre: `Ce que je vais faire — ${r.titre}`,
        fabriquer: async () => { const f = await sequentielImprimable(r); return { html: f.html, style: STYLE_FEUILLE + f.style, refaire: { sequentiel: r } }; },
      });
    });
  }
  if (choix.parole >= 0 && choix.parole < seances.length) {
    const r = paroleDeLaSequence(sequence);
    aides.push({
      seance: choix.parole, atelier: "priseDeParole", titre: `Je prépare ma prise de parole — ${r.sujet || "la séquence"}`,
      fabriquer: async () => { const f = await priseDeParoleImprimable(r); return { html: f.html, style: STYLE_FEUILLE + f.style, refaire: { priseDeParole: r } }; },
    });
  }
  return aides;
}
