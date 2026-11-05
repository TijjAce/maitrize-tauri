// ── Le début du CP : chercher le tout, et les problèmes à dire ─────────────
//
// Les feuilles de la séquence « Problèmes parties-tout : chercher le tout
// (CP) » et du rituel « Problèmes à dire, chaque jour (CP) » (voir
// demarchesProblemes.ts). Leurs problèmes : la boîte et ses jetons, les
// billes de Léo — la situation de référence et le problème du guide du CP —,
// puis les habillages du livret du CP, les paniers de Zoé, le bus, la cour,
// le stade, avec de petits nombres. Les sortes de problèmes et les nombres
// suivent le guide période par période : la boîte jusqu'à dix en période 1,
// jusqu'à vingt en période 2 ; les parties sous dix ; une partie cherchée en
// période 2 ; ce qu'on a ajouté ou enlevé à partir de la période 3, ce qu'il
// y avait au début en périodes 4 et 5.
//
// Les feuilles à l'ardoise et celles du rituel n'ont que les énoncés : on les
// dit, la réponse va sur l'ardoise, et le corrigé est pour le professeur.
// Celles qu'on cherche seul laissent une place pour dessiner ; elles n'ont pas
// de ligne « Calcul » : en périodes 1 et 2, le guide n'exige pas encore les
// écritures « + » et « − » des élèves.

import type { FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { hasard } from "./hasard";
import { choisir, entier } from "./nombres";
import { PRESENTATION_COMPLETE, STYLE_FEUILLE as STYLE_PROBLEMES, feuilleProblemes, nombre, type Presentation, type Probleme } from "./problemesBarres";
import { HABILLAGES_CP, problemeParties, type Structure } from "./problemesDesLivrets";

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

export const HABILLAGES_DEBUT_CP: Record<string, (alea: () => number) => Habillage> = { boite, billes, ...HABILLAGES_CP };

/** Les nombres d'un problème : deux parties sous `partieMax`, leur tout sous `toutMax`. */
export interface Petits { partieMax: number; toutMax: number }

/** Les deux nombres de l'énoncé, d'après deux parties a et b (voir problemeParties) ; rien quand le tout dépasse. */
function petitsNombres(alea: () => number, s: Structure, c: Petits): [number, number] | null {
  // Au-delà des tout petits nombres, pas de partie d'un seul objet : le problème ne serait qu'un « un de plus ».
  const min = c.partieMax >= 5 ? 2 : 1;
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

/** Des problèmes du début du CP : les sortes tour à tour, un habillage tiré pour chacun parmi `noms`, sans doublon d'énoncé. */
export function problemesDuDebutDuCP(noms: string[], structures: Structure[], combien: number, c: Petits, graine: number): Probleme[] {
  const alea = hasard(graine);
  const sortie: Probleme[] = [];
  const vus = new Set<string>();
  for (let essai = 0; sortie.length < combien && essai < 400; essai++) {
    const s = structures[sortie.length % structures.length];
    const possibles = noms.filter((h) => HABILLAGES_DEBUT_CP[h]?.(alea)[s]);
    if (!possibles.length) break;
    const nombres = petitsNombres(alea, s, c);
    if (!nombres) continue;
    const [enonce, phrase] = HABILLAGES_DEBUT_CP[choisir(alea, possibles)](alea)[s]!(nombres[0], nombres[1]);
    if (vus.has(enonce)) continue;
    vus.add(enonce);
    sortie.push(problemeParties(s, nombres[0], nombres[1], enonce, phrase));
  }
  return sortie;
}

// ── Les nombres et les présentations ─────────────────────────────────────

/** La boîte « au moins jusqu'à 10 en période 1 » ; les billes de Léo, deux parties sous dix (7 et 5 dans le guide) ; la période 2, jusqu'à vingt. */
const BOITE_P1: Petits = { partieMax: 6, toutMax: 10 };
const PARTIES_P1: Petits = { partieMax: 9, toutMax: 12 };
const P2: Petits = { partieMax: 9, toutMax: 18 };

/** Ce qu'on cherche seul : une place pour dessiner, la ligne « Réponse », pas encore de ligne « Calcul ». */
const A_CHERCHER: Presentation = { ...PRESENTATION_COMPLETE, schema: "sans", calcul: false };
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

// ── La séquence : chercher le tout, puis une partie ───────────────────────

/** Les billes de Léo, le problème du guide ; la cour de récréation, celui du livret avec de petits nombres. */
const LES_BILLES_DE_LEO = problemeParties("tout", 7, 5, "Léo a 7 billes rouges et 5 billes bleues. Combien Léo a-t-il de billes en tout ?", (r) => `Léo a ${r} billes en tout.`);
const LA_COUR = (): Probleme => {
  const [enonce, phrase] = HABILLAGES_CP.cour(() => 0).partie!(9, 4);
  return problemeParties("partie", 9, 4, enonce, phrase);
};

function planChercherLeTout(): PlanDesFeuilles {
  const p = problemesDuDebutDuCP;
  const reunir = ["cour", "stade", "billes"];
  const tous = ["boite", "billes", "fruits", "autobus", "cour", "stade"];
  const feuilles: FeuilleAFabriquer[] = [
    feuille(0, "La boîte — on ajoute", A_CHERCHER, (g) => p(["boite"], ["final-ajout"], 4, BOITE_P1, g)),
    feuille(1, "La boîte — moins d'outils, puis de tête", A_CHERCHER, (g) => p(["boite"], ["final-ajout"], 4, BOITE_P1, g + 1)),
    feuille(2, "Problèmes à dire — la boîte", A_DIRE, (g) => p(["boite"], ["final-ajout"], 3, BOITE_P1, g + 2)),
    feuille(3, "Problèmes — les billes de Léo", A_CHERCHER, (g) => [LES_BILLES_DE_LEO, ...p(["billes"], ["tout"], 3, PARTIES_P1, g)]),
    feuille(4, "Problèmes à dire — réunir", A_DIRE, (g) => p(reunir, ["tout"], 3, PARTIES_P1, g)),
    feuille(5, "Problèmes — chercher le tout", A_CHERCHER, (g) => p(tous, ["tout", "final-ajout"], 6, PARTIES_P1, g)),
    feuille(6, "Évaluation intermédiaire — chercher le tout", A_CHERCHER, (g) => p(tous, ["tout", "final-ajout", "tout"], 3, PARTIES_P1, g + 3)),
    feuille(7, "La boîte — on enlève", A_CHERCHER, (g) => p(["boite"], ["reste"], 4, P2, g)),
    feuille(8, "Problèmes — la cour de récréation", A_CHERCHER, (g) => [LA_COUR(), ...p(reunir, ["partie"], 3, P2, g)]),
    feuille(9, "Problèmes à dire — le tout ou une partie", A_DIRE, (g) => p(reunir, ["tout", "partie", "partie"], 3, P2, g)),
    feuille(10, "Problèmes à dire — ajouter, enlever, réunir", A_DIRE, (g) => p(tous, ["final-ajout", "reste", "tout"], 3, P2, g)),
    feuille(11, "Problèmes — tout mêlé", A_CHERCHER, (g) => p(tous, ["tout", "reste", "partie", "final-ajout", "reste", "partie"], 6, P2, g)),
    feuille(12, "Évaluation — le tout ou une partie", A_CHERCHER, (g) => p(tous, ["tout", "reste", "partie", "final-ajout", "partie"], 5, P2, g + 4)),
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

// ── Le rituel : trois problèmes à dire, chaque jour ───────────────────────

/** Les sortes et les nombres de chaque période, d'après le guide du CP ; à l'oral, les nombres restent à la mesure du calcul de tête. */
export const PROBLEMES_A_DIRE: Record<number, { structures: Structure[]; nombres: Petits }> = {
  1: { structures: ["final-ajout", "tout", "reste"], nombres: BOITE_P1 },
  2: { structures: ["final-ajout", "tout", "reste", "partie"], nombres: P2 },
  3: { structures: ["final-ajout", "tout", "reste", "partie", "ajoute", "retire"], nombres: { partieMax: 20, toutMax: 30 } },
  4: { structures: ["final-ajout", "tout", "reste", "partie", "ajoute", "retire", "depart-ajout", "depart-retrait"], nombres: { partieMax: 20, toutMax: 30 } },
  5: { structures: ["final-ajout", "tout", "reste", "partie", "ajoute", "retire", "depart-ajout", "depart-retrait"], nombres: { partieMax: 20, toutMax: 30 } },
};

function planProblemesADire(periode: number): PlanDesFeuilles {
  const { structures, nombres } = PROBLEMES_A_DIRE[Math.min(5, Math.max(1, periode))];
  const tous = ["boite", "billes", "fruits", "autobus", "cour", "stade"];
  const semaine = (k: number) => `Problèmes à dire — semaine ${k}, période ${Math.min(5, Math.max(1, periode))}`;
  const feuilles: FeuilleAFabriquer[] = [
    feuille(0, semaine(1), A_DIRE, (g) => problemesDuDebutDuCP(tous, structures, 12, nombres, g)),
    feuille(4, semaine(2), A_DIRE, (g) => problemesDuDebutDuCP(tous, structures, 12, nombres, g + 1)),
  ];
  const jour = "Les ardoises ; la feuille de la semaine, pour le professeur";
  return {
    feuilles,
    materiel: notes(feuilles, [
      "Les ardoises, les feutres, les chiffons ; les affiches des problèmes de référence", jour, jour, jour,
      "Les ardoises ; les affiches des problèmes de référence", jour, jour, jour,
    ]),
  };
}

export const estUneDemarcheDuDebutDuCP = (id: string) => id === "chercher-le-tout-cp" || id === "problemes-a-dire-cp";

/** Les feuilles d'une démarche du début du CP ; le rituel prend les problèmes de la période où on le pose. */
export function planDuDebutDuCP(id: string, periode: number): PlanDesFeuilles | null {
  if (id === "chercher-le-tout-cp") return planChercherLeTout();
  if (id === "problemes-a-dire-cp") return planProblemesADire(periode);
  return null;
}
