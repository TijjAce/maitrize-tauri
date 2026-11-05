// ── Le début d'année en problèmes, au CP et au CE1, et les problèmes à dire ─
//
// Les feuilles des séquences « Problèmes parties-tout : chercher le tout
// (CP) », « Problèmes parties-tout jusqu'à 100 (CE1) » et des rituels
// « Problèmes à dire, chaque jour » (voir demarchesProblemes.ts).
//
// Au CP, la boîte et ses jetons, les billes de Léo — la situation de
// référence et le problème du guide du CP —, puis les habillages du livret du
// CP, les paniers de Zoé, le bus, la cour, le stade, avec de petits nombres.
// Les sortes de problèmes et les nombres suivent le guide période par
// période : la boîte jusqu'à dix en période 1, jusqu'à vingt en période 2 ;
// les parties sous dix ; une partie cherchée en période 2 ; ce qu'on a ajouté
// ou enlevé à partir de la période 3, ce qu'il y avait au début en périodes 4
// et 5.
//
// Au CE1, le livret veut qu'en début d'année les problèmes parties-tout sous
// cent soient « entretenus » : on reprend les problèmes de référence du CP,
// avec des nombres jusqu'à cent, et ce qui change — ce qu'on a ajouté ou
// enlevé, ce qu'il y avait au début, comme l'exemple des images du programme.
// Les coffres des brigands et les oiseaux attendent la séquence du livret, en
// période 3.
//
// Les feuilles à l'ardoise et celles des rituels n'ont que les énoncés : on
// les dit, la réponse va sur l'ardoise, et le corrigé est pour le professeur.
// Au CP, celles qu'on cherche seul laissent une place pour dessiner, sans
// ligne « Calcul » : en périodes 1 et 2, le guide n'exige pas encore les
// écritures « + » et « − » des élèves. Au CE1, le schéma en barres est à
// compléter dans les séances qui le montrent, la place pour dessiner ailleurs.

import type { FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { hasard } from "./hasard";
import { choisir, entier } from "./nombres";
import { PRESENTATION_COMPLETE, STYLE_FEUILLE as STYLE_PROBLEMES, feuilleProblemes, nombre, type Presentation, type Probleme } from "./problemesBarres";
import { HABILLAGES_CE1, HABILLAGES_CP, problemeParties, problemesDeComparaison, type Structure } from "./problemesDesLivrets";
import { problemesDeuxTransformations, problemesMultiplicatifs } from "./problemesProlonges";

const n = nombre;
type Modele = (x: number, y: number) => [enonce: string, phrase: (r: number) => string];
type Habillage = Partial<Record<Structure, Modele>>;

/** La boîte du guide : on y met des jetons, on en ajoute, on en enlève ; c'est le professeur qui parle. */
const boite = (): Habillage => ({
  "final-ajout": (x, y) => [`Je mets ${n(x)} jetons dans la boîte. J'ajoute encore ${n(y)} jetons. Combien y a-t-il de jetons dans la boîte ?`,
    (r) => `Il y a ${n(r)} jetons dans la boîte.`],
  reste: (x, y) => [`Il y a ${n(x)} jetons dans la boîte. J'enlève ${n(y)} jetons. Combien de jetons reste-t-il dans la boîte ?`,
    (r) => `Il reste ${n(r)} jetons dans la boîte.`],
  ajoute: (x, y) => [`Il y avait ${n(x)} jetons dans la boîte. J'en ai ajouté. Maintenant, il y en a ${n(y)}. Combien de jetons ai-je ajoutés ?`,
    (r) => `Tu as ajouté ${n(r)} jetons.`],
  retire: (x, y) => [`Il y avait ${n(x)} jetons dans la boîte. J'en ai enlevé. Maintenant, il en reste ${n(y)}. Combien de jetons ai-je enlevés ?`,
    (r) => `Tu as enlevé ${n(r)} jetons.`],
  "depart-ajout": (x, y) => [`J'ai ajouté ${n(x)} jetons dans la boîte. Maintenant, il y en a ${n(y)}. Combien de jetons y avait-il dans la boîte avant ?`,
    (r) => `Il y avait ${n(r)} jetons dans la boîte.`],
  "depart-retrait": (x, y) => [`J'ai enlevé ${n(x)} jetons de la boîte. Il en reste ${n(y)}. Combien de jetons y avait-il dans la boîte avant ?`,
    (r) => `Il y avait ${n(r)} jetons dans la boîte.`],
});

/** Les billes de Léo, rouges et bleues ; la question ne dit pas toujours « en tout » : on ne cherche pas l'addition à ce seul mot. */
const billes = (alea: () => number): Habillage => ({
  tout: (x, y) => [alea() < 0.5
    ? `Léo a ${n(x)} billes rouges et ${n(y)} billes bleues. Combien Léo a-t-il de billes en tout ?`
    : `Léo a ${n(x)} billes rouges et ${n(y)} billes bleues. Combien de billes Léo a-t-il ?`, (r) => `Léo a ${n(r)} billes.`],
  partie: (x, y) => [`Léo a ${n(x)} billes : des rouges et des bleues. Il a ${n(y)} billes rouges. Combien a-t-il de billes bleues ?`,
    (r) => `Léo a ${n(r)} billes bleues.`],
});

/** Les images de la boîte, comme l'exemple du programme du CE1 : ce qu'il y avait au début. */
const images = (): Habillage => ({
  "depart-retrait": (x, y) => [`Dans ma boîte, il y avait des images. J'en ai distribué ${n(x)} et il m'en reste encore ${n(y)}. Combien y avait-il d'images dans ma boîte avant que j'en distribue ?`,
    (r) => `Il y avait ${n(r)} images dans la boîte.`],
  "depart-ajout": (x, y) => [`Dans ma boîte, il y avait des images. On m'en a donné ${n(x)} et maintenant j'en ai ${n(y)}. Combien y avait-il d'images dans ma boîte avant ?`,
    (r) => `Il y avait ${n(r)} images dans la boîte.`],
  reste: (x, y) => [`Dans ma boîte, il y a ${n(x)} images. J'en distribue ${n(y)}. Combien d'images reste-t-il dans ma boîte ?`,
    (r) => `Il reste ${n(r)} images dans la boîte.`],
});

export const HABILLAGES_PARTIES_TOUT: Record<string, (alea: () => number) => Habillage> = { boite, billes, images, ...HABILLAGES_CP, ...HABILLAGES_CE1 };

/** Les nombres d'un problème : deux parties sous `partieMax`, leur tout sous `toutMax`. */
export interface Petits { partieMax: number; toutMax: number }

/** Les deux nombres de l'énoncé, d'après deux parties a et b (voir problemeParties) ; rien quand le tout dépasse. */
function deuxNombres(alea: () => number, s: Structure, c: Petits): [number, number] | null {
  // Au-delà des tout petits nombres, pas de partie d'un seul objet : le problème ne serait qu'un « un de plus ».
  const min = c.partieMax >= 30 ? 6 : c.partieMax >= 5 ? 2 : 1;
  const a = entier(alea, min, c.partieMax), b = entier(alea, min, c.partieMax);
  if (a + b > c.toutMax) return null;
  switch (s) {
    case "tout": case "final-ajout": return [a, b];
    case "reste": case "partie": return [a + b, b];
    case "retire": return [a + b, a];
    case "ajoute": return [a, a + b];
    case "depart-ajout": return [b, a + b];
    case "depart-retrait": return [b, a];
  }
}

/** Des problèmes parties-tout : les sortes tour à tour, un habillage tiré pour chacun parmi `noms`, sans doublon d'énoncé. */
export function problemesPartiesTout(noms: string[], structures: Structure[], combien: number, c: Petits, graine: number): Probleme[] {
  const alea = hasard(graine);
  const sortie: Probleme[] = [];
  const vus = new Set<string>();
  for (let essai = 0; sortie.length < combien && essai < 400; essai++) {
    const s = structures[sortie.length % structures.length];
    const possibles = noms.filter((h) => HABILLAGES_PARTIES_TOUT[h]?.(alea)[s]);
    if (!possibles.length) break;
    const nombres = deuxNombres(alea, s, c);
    if (!nombres) continue;
    const [enonce, phrase] = HABILLAGES_PARTIES_TOUT[choisir(alea, possibles)](alea)[s]!(nombres[0], nombres[1]);
    if (vus.has(enonce)) continue;
    vus.add(enonce);
    sortie.push(problemeParties(s, nombres[0], nombres[1], enonce, phrase));
  }
  return sortie;
}

// ── Les présentations, les feuilles, le matériel ─────────────────────────

/** Ce qu'on cherche seul au CP : une place pour dessiner, la ligne « Réponse », pas encore de ligne « Calcul ». */
const A_CHERCHER_CP: Presentation = { ...PRESENTATION_COMPLETE, schema: "sans", calcul: false };
/** Au CE1 : une place pour dessiner, ou le schéma en barres à compléter ; le calcul et la réponse. */
const A_CHERCHER_CE1: Presentation = { ...PRESENTATION_COMPLETE, schema: "sans" };
const A_COMPLETER_CE1: Presentation = { ...PRESENTATION_COMPLETE, schema: "vide" };
/** Ce qu'on dit : l'énoncé seul, et le corrigé pour le professeur. */
const A_DIRE: Presentation = { ...PRESENTATION_COMPLETE, schema: "aucun", calcul: false, reponse: false, cadres: false, nomDate: false };

const feuille = (seance: number, titre: string, presentation: Presentation, problemes: (g: number) => Probleme[]): FeuilleAFabriquer => ({
  seance, atelier: "partieTout", titre,
  fabriquer: (graine) => ({ html: feuilleProblemes(problemes(graine), titre, presentation), style: STYLE_PROBLEMES }),
});

/** La note du matériel de chaque séance, avec ses feuilles nommées comme elles s'impriment. */
const notes = (feuilles: FeuilleAFabriquer[], debuts: string[]): string[] => debuts.map((debut, s) => {
  const f = feuilles.filter((x) => x.seance === s).map((x) => `« ${x.titre} »`);
  return f.length ? `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${f.join(" et ")}.` : `${debut}.`;
});

const p = problemesPartiesTout;
const HISTOIRES_CP = ["boite", "billes", "fruits", "autobus", "cour", "stade"];

// ── CP : chercher le tout, puis une partie ────────────────────────────────

/** La boîte « au moins jusqu'à 10 en période 1 » ; les billes de Léo, deux parties sous dix (7 et 5 dans le guide) ; la période 2, jusqu'à vingt. */
const BOITE_P1: Petits = { partieMax: 6, toutMax: 10 };
const PARTIES_P1: Petits = { partieMax: 9, toutMax: 12 };
const P2: Petits = { partieMax: 9, toutMax: 18 };

/** Les billes de Léo, le problème du guide ; la cour de récréation, celui du livret avec de petits nombres. */
const LES_BILLES_DE_LEO = problemeParties("tout", 7, 5, "Léo a 7 billes rouges et 5 billes bleues. Combien Léo a-t-il de billes en tout ?", (r) => `Léo a ${r} billes en tout.`);
const laCour = (tout: number, preau: number): Probleme => {
  const [enonce, phrase] = HABILLAGES_CP.cour(() => 0).partie!(tout, preau);
  return problemeParties("partie", tout, preau, enonce, phrase);
};

function planChercherLeTout(): PlanDesFeuilles {
  const reunir = ["cour", "stade", "billes"];
  const tous = HISTOIRES_CP;
  const feuilles: FeuilleAFabriquer[] = [
    feuille(0, "La boîte — on ajoute", A_CHERCHER_CP, (g) => p(["boite"], ["final-ajout"], 4, BOITE_P1, g)),
    feuille(1, "La boîte — moins d'outils, puis de tête", A_CHERCHER_CP, (g) => p(["boite"], ["final-ajout"], 4, BOITE_P1, g + 1)),
    feuille(2, "Problèmes à dire — la boîte", A_DIRE, (g) => p(["boite"], ["final-ajout"], 3, BOITE_P1, g + 2)),
    feuille(3, "Problèmes — les billes de Léo", A_CHERCHER_CP, (g) => [LES_BILLES_DE_LEO, ...p(["billes"], ["tout"], 3, PARTIES_P1, g)]),
    feuille(4, "Problèmes à dire — réunir", A_DIRE, (g) => p(reunir, ["tout"], 3, PARTIES_P1, g)),
    feuille(5, "Problèmes — chercher le tout", A_CHERCHER_CP, (g) => p(tous, ["tout", "final-ajout"], 6, PARTIES_P1, g)),
    feuille(6, "Évaluation intermédiaire — chercher le tout", A_CHERCHER_CP, (g) => p(tous, ["tout", "final-ajout", "tout"], 3, PARTIES_P1, g + 3)),
    feuille(7, "La boîte — on enlève", A_CHERCHER_CP, (g) => p(["boite"], ["reste"], 4, P2, g)),
    feuille(8, "Problèmes — la cour de récréation", A_CHERCHER_CP, (g) => [laCour(9, 4), ...p(reunir, ["partie"], 3, P2, g)]),
    feuille(9, "Problèmes à dire — le tout ou une partie", A_DIRE, (g) => p(reunir, ["tout", "partie", "partie"], 3, P2, g)),
    feuille(10, "Problèmes à dire — ajouter, enlever, réunir", A_DIRE, (g) => p(tous, ["final-ajout", "reste", "tout"], 3, P2, g)),
    feuille(11, "Problèmes — tout mêlé", A_CHERCHER_CP, (g) => p(tous, ["tout", "reste", "partie", "final-ajout", "reste", "partie"], 6, P2, g)),
    feuille(12, "Évaluation — le tout ou une partie", A_CHERCHER_CP, (g) => p(tous, ["tout", "reste", "partie", "final-ajout", "partie"], 5, P2, g + 4)),
  ];
  const ardoise = "Les ardoises ; les affiches des problèmes de référence";
  return {
    feuilles,
    materiel: notes(feuilles, [
      "Une boîte opaque avec un couvercle et des jetons identiques ; sur les tables, des cubes, des jetons, la frise numérique, une feuille pour dessiner ; les ardoises",
      "La boîte et ses jetons ; la frise numérique ; une feuille pour dessiner ; les ardoises",
      "La boîte et ses jetons ; les ardoises",
      "Des cubes emboîtables rouges et bleus ; le cahier de leçons et le cahier d'entraînement ; une grande feuille pour l'affiche",
      ardoise,
      "Le cahier d'entraînement ; des cubes pour qui en a besoin",
      "Les énoncés à lire ; pour la remédiation, la boîte et ses jetons",
      "La boîte opaque et vingt jetons ; la frise numérique ; les ardoises",
      "Des cubes emboîtables de deux couleurs ; le cahier de leçons et le cahier d'entraînement ; l'affiche des billes de Léo",
      ardoise, ardoise,
      "Le cahier d'entraînement",
      "Les énoncés à lire",
    ]),
  };
}

// ── CE1 : les parties-tout jusqu'à cent, en début d'année ─────────────────

/** Des nombres sous cent : le champ du début du CE1. */
const CE1_P1: Petits = { partieMax: 60, toutMax: 99 };

/** Les problèmes de référence repris du CP, avec des nombres jusqu'à cent ; les images, d'après l'exemple du programme. */
const ce1 = {
  billes: problemeParties("tout", 37, 25, "Léo a 37 billes rouges et 25 billes bleues. Combien Léo a-t-il de billes en tout ?", (r) => `Léo a ${r} billes en tout.`),
  bus: (): Probleme => {
    const [enonce, phrase] = HABILLAGES_CP.autobus(() => 0).reste!(45, 18);
    return problemeParties("reste", 45, 18, enonce, phrase);
  },
  images: (): Probleme => {
    const [enonce, phrase] = images()["depart-retrait"]!(26, 47);
    return problemeParties("depart-retrait", 26, 47, enonce, phrase);
  },
};

function planPartiesTout100(): PlanDesFeuilles {
  const reunir = ["billes", "cour", "stade"];
  const changer = ["fruits", "autobus", "boite"];
  const tous = [...reunir, ...changer, "images"];
  const feuilles: FeuilleAFabriquer[] = [
    feuille(0, "Problèmes — le tout et une partie, jusqu'à 100", A_COMPLETER_CE1, (g) => [ce1.billes, laCour(64, 28), ...p(reunir, ["tout", "partie"], 2, CE1_P1, g)]),
    feuille(1, "Problèmes à dire — le tout ou une partie", A_DIRE, (g) => p(reunir, ["tout", "partie", "partie"], 3, CE1_P1, g)),
    feuille(2, "Problèmes — ajouter, enlever", A_COMPLETER_CE1, (g) => [ce1.bus(), ...p(changer, ["final-ajout", "reste"], 3, CE1_P1, g)]),
    feuille(3, "Problèmes à dire — ajouter, enlever", A_DIRE, (g) => p(changer, ["final-ajout", "reste", "final-ajout"], 3, CE1_P1, g)),
    feuille(4, "Problèmes — ce qu'on a ajouté ou enlevé", A_CHERCHER_CE1, (g) => p(changer, ["ajoute", "retire"], 4, CE1_P1, g)),
    feuille(5, "Problèmes — entraînement", A_CHERCHER_CE1, (g) => p(tous, ["tout", "partie", "final-ajout", "reste", "ajoute", "retire"], 6, CE1_P1, g)),
    feuille(6, "Évaluation intermédiaire", A_CHERCHER_CE1, (g) => p(tous, ["partie", "reste", "ajoute"], 3, CE1_P1, g + 3)),
    feuille(7, "Problèmes — ce qu'il y avait au début", A_CHERCHER_CE1, (g) => [ce1.images(), ...p(["images", "boite"], ["depart-retrait", "depart-ajout"], 3, CE1_P1, g)]),
    feuille(8, "Problèmes à dire — ce qu'on cherche vraiment", A_DIRE, (g) => p(tous, ["ajoute", "depart-retrait", "retire"], 3, CE1_P1, g)),
    feuille(9, "Problèmes à dire — c'est comme…", A_DIRE, (g) => p(tous, ["tout", "reste", "depart-ajout"], 3, CE1_P1, g + 1)),
    feuille(10, "Problèmes — tout mêlé", A_CHERCHER_CE1, (g) => p(tous, ["tout", "reste", "ajoute", "partie", "depart-retrait", "final-ajout"], 6, CE1_P1, g)),
    feuille(11, "Évaluation — problèmes parties-tout jusqu'à 100", A_CHERCHER_CE1, (g) => p(tous, ["partie", "reste", "ajoute", "tout", "depart-retrait"], 5, CE1_P1, g + 4)),
  ];
  const ardoise = "Les ardoises ; les affiches des problèmes de référence";
  return {
    feuilles,
    materiel: notes(feuilles, [
      "Les affiches des problèmes de référence du CP — les billes de Léo, la cour — ; du matériel multibase ; le cahier de leçons et le cahier d'entraînement",
      ardoise,
      "Du matériel multibase ; l'affiche de la boîte ; le cahier de leçons et le cahier d'entraînement",
      ardoise,
      "Une droite graduée au tableau ; le cahier d'entraînement",
      "Le cahier d'entraînement ; du matériel multibase pour qui en a besoin",
      "Les énoncés à distribuer ; pour la remédiation, du matériel multibase",
      "Une boîte et des images ; le cahier de leçons et le cahier d'entraînement",
      ardoise, ardoise,
      "Le cahier d'entraînement",
      "Les énoncés à distribuer",
    ]),
  };
}

// ── Les rituels : trois problèmes à dire, chaque jour ─────────────────────

/** Au CP, les sortes et les nombres de chaque période, d'après le guide ; à l'oral, les nombres restent à la mesure du calcul de tête. */
export const PROBLEMES_A_DIRE: Record<number, { structures: Structure[]; nombres: Petits }> = {
  1: { structures: ["final-ajout", "tout", "reste"], nombres: BOITE_P1 },
  2: { structures: ["final-ajout", "tout", "reste", "partie"], nombres: P2 },
  3: { structures: ["final-ajout", "tout", "reste", "partie", "ajoute", "retire"], nombres: { partieMax: 20, toutMax: 30 } },
  4: { structures: ["final-ajout", "tout", "reste", "partie", "ajoute", "retire", "depart-ajout", "depart-retrait"], nombres: { partieMax: 20, toutMax: 30 } },
  5: { structures: ["final-ajout", "tout", "reste", "partie", "ajoute", "retire", "depart-ajout", "depart-retrait"], nombres: { partieMax: 20, toutMax: 30 } },
};

/**
 * Au CE1, d'après le programme et ses repères : les parties-tout et ce qui change dès la rentrée, sous cent ; la
 * comparaison ensuite ; les premiers problèmes multiplicatifs avec les tables apprises en période 3 ; puis les
 * partages, et deux étapes à la suite. À l'oral, des nombres sous cent.
 */
export const PROBLEMES_A_DIRE_CE1: Record<number, { structures: Structure[]; comparaisons: number; multiplicatifs: number; deuxEtapes: number }> = {
  1: { structures: ["tout", "partie", "final-ajout", "reste", "ajoute", "retire"], comparaisons: 0, multiplicatifs: 0, deuxEtapes: 0 },
  2: { structures: ["tout", "partie", "final-ajout", "reste", "ajoute", "retire", "depart-retrait"], comparaisons: 3, multiplicatifs: 0, deuxEtapes: 0 },
  3: { structures: ["tout", "partie", "reste", "ajoute", "depart-retrait", "depart-ajout"], comparaisons: 2, multiplicatifs: 3, deuxEtapes: 0 },
  4: { structures: ["tout", "partie", "reste", "ajoute", "depart-retrait"], comparaisons: 2, multiplicatifs: 3, deuxEtapes: 2 },
  5: { structures: ["tout", "partie", "reste", "ajoute", "depart-retrait", "depart-ajout"], comparaisons: 2, multiplicatifs: 3, deuxEtapes: 2 },
};
const CE1_A_DIRE: Petits = { partieMax: 50, toutMax: 99 };

/** Douze problèmes à dire, au CE1 : les sortes de la période mêlées, pour que chaque jour en ait de différentes. */
export function problemesADireCE1(periode: number, graine: number): Probleme[] {
  const r = PROBLEMES_A_DIRE_CE1[periode];
  const autres: Probleme[] = [
    ...(r.comparaisons ? problemesDeComparaison(["billes", "pommes"], r.comparaisons, graine + 1, () => 1, 90) : []),
    ...(r.multiplicatifs ? problemesMultiplicatifs("CE1", periode >= 4 ? ["tout", "nombre", "part"] : ["tout", "nombre", "tout"], r.multiplicatifs, graine + 2,
      { parts: [2, 5], valeurs: [2, 10] }) : []),
    ...(r.deuxEtapes ? problemesDeuxTransformations(60, r.deuxEtapes, graine + 3) : []),
  ];
  const histoires = [...HISTOIRES_CP, "images", ...(periode >= 3 ? ["brigands", "oiseaux"] : [])];
  const parties = p(histoires, r.structures, 12 - autres.length, CE1_A_DIRE, graine);
  // Une autre sorte tous les trois ou quatre problèmes : chaque jour, au moins une qui change.
  const sortie: Probleme[] = [];
  for (let i = 0; sortie.length < 12 && (parties.length || autres.length); i++) {
    const tour = (i % 4 === 2 && autres.length) || !parties.length ? autres : parties;
    sortie.push(tour.shift()!);
  }
  return sortie;
}

function planProblemesADire(classe: "CP" | "CE1", periode: number): PlanDesFeuilles {
  const per = Math.min(5, Math.max(1, periode));
  const semaine = (k: number) => `Problèmes à dire — semaine ${k}, période ${per}`;
  const douze = (g: number) => (classe === "CP"
    ? problemesPartiesTout(HISTOIRES_CP, PROBLEMES_A_DIRE[per].structures, 12, PROBLEMES_A_DIRE[per].nombres, g)
    : problemesADireCE1(per, g));
  const feuilles: FeuilleAFabriquer[] = [feuille(0, semaine(1), A_DIRE, douze), feuille(4, semaine(2), A_DIRE, (g) => douze(g + 1))];
  const jour = "Les ardoises ; la feuille de la semaine, pour le professeur";
  return {
    feuilles,
    materiel: notes(feuilles, [
      "Les ardoises, les feutres, les chiffons ; les affiches des problèmes de référence", jour, jour, jour,
      "Les ardoises ; les affiches des problèmes de référence", jour, jour, jour,
    ]),
  };
}

const DEMARCHES_DU_DEBUT_D_ANNEE = ["chercher-le-tout-cp", "problemes-a-dire-cp", "parties-tout-100-ce1", "problemes-a-dire-ce1"];

export const estUneDemarcheDuDebutDAnnee = (id: string) => DEMARCHES_DU_DEBUT_D_ANNEE.includes(id);

/** Les feuilles d'une démarche du début d'année ; un rituel prend les problèmes de la période où on le pose. */
export function planDuDebutDAnnee(id: string, periode: number): PlanDesFeuilles | null {
  if (id === "chercher-le-tout-cp") return planChercherLeTout();
  if (id === "parties-tout-100-ce1") return planPartiesTout100();
  if (id === "problemes-a-dire-cp") return planProblemesADire("CP", periode);
  if (id === "problemes-a-dire-ce1") return planProblemesADire("CE1", periode);
  return null;
}
