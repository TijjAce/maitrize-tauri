// Les feuilles de la séquence « comparer, ranger, encadrer ».
//
// La séquence se crée depuis sa compétence (voir feuillesDesSequences.ts) :
// la démarche « comparer-nombres-cp », et ses prolongements au CE1 et au
// CE2, reprennent celle du guide CP — deux collections qu'on ne voit pas
// ensemble, la comparaison par l'écriture chiffrée, le réinvestissement sous
// toutes les écritures, puis ordonner, intercaler, encadrer, par le jeu — ;
// chaque séance reçoit ici les feuilles qui la servent, aux nombres de sa
// classe, et la note du matériel.

import { STYLE_FEUILLE } from "./cartesImprimables";
import { STYLE_COMPARER, exempleDuSavoir, htmlComparer, niveauDe, paquet, type ReglagesComparer } from "./comparerNombres";
import { fr } from "./nombres";
import {
  STYLE_FEUILLES_COMPARER, htmlAfficheDuSavoir, htmlComparerLesEcritures, htmlDeuxCollections, htmlEncadrer, htmlEvaluation,
  htmlOrdonnerIntercaler, htmlProblemes,
} from "./feuillesComparer";

export const DEMARCHE_COMPARER = "comparer-nombres-cp";

export type FeuilleComparer = "collections" | "affiche" | "ecritures" | "jeu" | "ordonner" | "encadrer" | "problemes" | "evaluation";

/** Une feuille de la séquence : la séance qui la reçoit, et son nom dans la séance. */
export interface FeuilleDeSequence { seance: number; quoi: FeuilleComparer; titre: string }

export const FEUILLES_DE_LA_SEQUENCE: FeuilleDeSequence[] = [
  { seance: 0, quoi: "collections", titre: "Deux collections à comparer" },
  { seance: 1, quoi: "affiche", titre: "Ce qu'on retient — l'affiche" },
  { seance: 2, quoi: "ecritures", titre: "Comparer des nombres" },
  { seance: 2, quoi: "jeu", titre: "Les cartes des trois jeux" },
  { seance: 3, quoi: "ordonner", titre: "Ordonner et intercaler" },
  { seance: 4, quoi: "encadrer", titre: "Encadrer des nombres" },
  { seance: 5, quoi: "problemes", titre: "Problèmes de comparaison" },
  { seance: 6, quoi: "evaluation", titre: "Évaluation" },
];

/** Toutes les feuilles de la séquence portent les deux feuilles de style : celle du jeu, et la leur. */
export const STYLE_SEQUENCE_COMPARER = STYLE_FEUILLE + STYLE_COMPARER + STYLE_FEUILLES_COMPARER;

/** Le HTML d'une feuille, aux nombres de l'atelier ; `graine` fait le tirage. */
export function htmlDeLaFeuille(quoi: FeuilleComparer, r: ReglagesComparer, graine: number): string {
  switch (quoi) {
    case "collections": return htmlDeuxCollections(r, graine);
    case "affiche": return htmlAfficheDuSavoir(r);
    case "ecritures": return htmlComparerLesEcritures(r, graine);
    case "jeu": return htmlComparer(paquet(r, graine), { ...r, regle: true, signes: true, feuilleDeJeu: true });
    case "ordonner": return htmlOrdonnerIntercaler(r, graine);
    case "encadrer": return htmlEncadrer(r, graine);
    case "problemes": return htmlProblemes(r, graine);
    case "evaluation": return htmlEvaluation(r, graine);
  }
}

/** Ce qu'il faut préparer, séance par séance : la note « matériel » de chacune. */
export function materielDesSeances(r: ReglagesComparer): string[] {
  const niv = niveauDe(r);
  const [a, b] = exempleDuSavoir(niv);
  const collections = niv.max <= 100
    ? `Les deux feuilles de ronds — ${a} rouges pour un groupe, ${b} bleus pour l'autre — ; des feutres pour entourer les dizaines ; le matériel de numération : barres de dix et cubes, ou bûchettes.`
    : niv.max <= 1000
      ? `Les deux feuilles de matériel — ${fr(a)} cubes pour un groupe, dont une centaine défaite en dizaines, ${fr(b)} pour l'autre — ; le matériel de numération : plaques, barres et cubes.`
      : `Les deux bons de livraison — ${fr(a)} vis pour un groupe, une caisse défaite en cartons, ${fr(b)} pour l'autre — ; le tableau de numération.`;
  return [
    collections,
    "Les écritures de la séance 1 ; les deux collections ; le matériel de numération aimanté au tableau ; les ardoises ; l'affiche « Ce qu'on retient » et les cartes des signes.",
    "La feuille « Comparer des nombres » ; le matériel de numération pour vérifier ; les cartes des jeux découpées — un paquet et des signes pour deux — et la feuille de jeu.",
    "Trois cartes de nombres pour le tableau ; la feuille « Ordonner et intercaler » ; la bande numérique ; les cartes, pour la file des nombres, et la feuille de jeu.",
    "Un gobelet ; la feuille « Encadrer des nombres » ; la bande numérique et une demi-droite graduée ; les cartes, pour le nombre caché, et la feuille de jeu.",
    "La feuille « Problèmes de comparaison » ; le matériel de numération ; les cartes des jeux pour qui a fini.",
    "La feuille d'évaluation ; le matériel de numération pour la remédiation.",
  ];
}
