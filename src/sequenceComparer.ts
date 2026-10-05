// Une séquence pour comparer, encadrer, intercaler des nombres, avec ses feuilles.
//
// Comme pour les collections et la catégorisation : l'atelier fabrique le
// jeu, la séquence l'installe dans la durée. La démarche
// « comparer-nombres-cp » (voir demarches.ts) reprend celle du guide CP —
// deux collections qu'on ne voit pas ensemble, la comparaison par
// l'écriture chiffrée, le réinvestissement sous toutes les écritures, puis
// ordonner, intercaler, encadrer, par le jeu — ; chaque séance reçoit les
// feuilles qui la servent, aux nombres de l'atelier, et la note du matériel.

import { api, anneeScolaireActuelle, couleurPourMatiere, newId, nowIso, type Referentiel, type Sequence } from "./api";
import type { CompetenceSelectionnee } from "./components/CompetenceTree";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { STYLE_COMPARER, exempleDuSavoir, htmlComparer, niveauDe, paquet, phraseDuSavoir, type Niveau, type ReglagesComparer } from "./comparerNombres";
import { fr } from "./nombres";
import {
  STYLE_FEUILLES_COMPARER, htmlAfficheDuSavoir, htmlComparerLesEcritures, htmlDeuxCollections, htmlEncadrer, htmlEvaluation,
  htmlOrdonnerIntercaler, htmlProblemes,
} from "./feuillesComparer";
import { demarcheDe, seancesDuCadre } from "./demarches";
import { graineAuHasard } from "./hasard";
import { poserDansUneSeance } from "./impressionAtelier";
import { competenceDuProgramme as competenceDuReferentiel } from "./sequenceCategoriser";
import { chargerVacances, periodeDuJour } from "./vacances";

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

/**
 * La séquence du guide CP vaut pour le cycle 2, aux nombres de chaque
 * classe ; la maternelle compare des quantités, le cycle 3 des grands
 * nombres et des décimaux : leurs démarches ne sont pas celle-ci.
 */
export const sequencePossible = (niv: Niveau) => niv.cycle === 2;

/** Le titre proposé : « Comparer, encadrer, intercaler les nombres jusqu'à 1 000 (CE1) ». */
export function titreDeLaSequence(r: ReglagesComparer): string {
  const niv = niveauDe(r);
  return `Comparer, encadrer, intercaler les nombres jusqu'à ${fr(niv.max)} (${niv.classe})`;
}

/** Ce que la séquence vise : la compétence du programme, et la phrase du guide aux nombres de l'atelier. */
export function objectifsDeLaSequence(r: ReglagesComparer): string {
  const niv = niveauDe(r);
  return `Comparer, encadrer, intercaler des nombres entiers jusqu'à ${fr(niv.max)} en utilisant les symboles =, < et > ; ranger cinq nombres `
    + `dans l'ordre croissant ou décroissant — grâce à leur écriture chiffrée : « ${phraseDuSavoir(niv).replace(/\.$/, "")} ».`;
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

/** « Comparer, encadrer, intercaler des nombres entiers… », à la classe du niveau, dans les référentiels actifs. */
export const competenceDuProgramme = (referentiels: Referentiel[], niv: Niveau) =>
  competenceDuReferentiel(referentiels, niv.classe, /comparer, encadrer, intercaler/i);

/**
 * Crée la séquence : la fiche, les séances de la démarche avec leur
 * matériel, puis les feuilles dans leurs séances. Rend la séquence créée, et
 * combien de feuilles y sont.
 */
export async function creerLaSequenceDeComparaison(
  r: ReglagesComparer, titre: string, competences: CompetenceSelectionnee[],
): Promise<{ sequence: Sequence; feuilles: number }> {
  const demarche = demarcheDe(DEMARCHE_COMPARER);
  if (!demarche) throw new Error("La démarche « comparer des nombres » est introuvable.");
  const vise = competences[0];
  const matiere = vise?.domaineTitre || "Mathématiques";
  const aujourdHui = nowIso().slice(0, 10);
  const vacances = await chargerVacances(aujourdHui).catch(() => []);
  const periode = periodeDuJour(aujourdHui, Array.isArray(vacances) ? vacances : []);
  const sequence: Sequence = {
    id: newId(), titre: titre.trim() || titreDeLaSequence(r), matiere, cycle: "Cycle 2",
    objectifs: objectifsDeLaSequence(r), competences: JSON.stringify(competences), competenceVisee: vise ? JSON.stringify(vise) : "",
    imageNom: null, couleur: couleurPourMatiere(matiere), dateCreation: nowIso(), periode, annee: anneeScolaireActuelle(),
    ratingEngagement: 0, ratingFacilite: 0, ratingApprentissage: 0, ratingDateMaj: null, projetId: null, video: "",
    dossier: "", nbSeancesPrevu: demarche.seances.length, etat: "", dateMaj: "",
  };
  await api.sequenceSave(sequence);
  const materiel = materielDesSeances(r);
  const seances = seancesDuCadre(demarche, sequence.id, 1).map((s, i) => ({ ...s, competences: JSON.stringify(competences), materiel: materiel[i] ?? "" }));
  for (const s of seances) await api.seanceSave(s);
  let posees = 0;
  for (const f of FEUILLES_DE_LA_SEQUENCE) {
    const seance = seances[f.seance];
    if (!seance) continue;
    await poserDansUneSeance("comparer", f.titre, htmlDeLaFeuille(f.quoi, r, graineAuHasard()), STYLE_SEQUENCE_COMPARER, seance.id, sequence.id);
    posees++;
  }
  return { sequence, feuilles: posees };
}
