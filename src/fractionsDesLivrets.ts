// Les feuilles des séquences de fractions des livrets (voir demarchesProblemes.ts).
//
// Au CE1, les cartes des fractions unitaires, par familles comme la séquence
// les introduit — un demi, un quart, un huitième ; un tiers, un sixième ; un
// cinquième, un dixième —, puis avec l'écriture en chiffres, pour le memory.
// Au CE2, la bande unité, les segments à mesurer, la règle graduée en quarts,
// en dixièmes puis en huitièmes, la course des nageurs, les segments à tracer.
// Tout vient de l'atelier « Fractions ».

import type { FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { REGLAGES_FRACTIONS, STYLE_JEUX_MATHS, htmlFractions, type ReglagesFractions } from "./jeuxMaths";

function feuilleDeFractions(seance: number, titre: string, r: Partial<ReglagesFractions>): FeuilleAFabriquer {
  const reglages: ReglagesFractions = { ...REGLAGES_FRACTIONS, ...r };
  return {
    seance, atelier: "fractions", titre,
    fabriquer: (graine) => ({ html: htmlFractions(reglages, graine), style: STYLE_FEUILLE + STYLE_JEUX_MATHS, refaire: { fractions: reglages } }),
  };
}

/** La note du matériel de chaque séance, avec les feuilles nommées comme elles s'impriment. */
function notes(feuilles: FeuilleAFabriquer[], debuts: string[]): string[] {
  return debuts.map((debut, s) => {
    const f = feuilles.filter((x) => x.seance === s).map((x) => `« ${x.titre} »`);
    return f.length ? `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${f.join(" et ")}.` : `${debut}.`;
  });
}

const TOUTES_UNITAIRES = [2, 3, 4, 5, 6, 8, 10];

function planFractionsCE1(): PlanDesFeuilles {
  const cartes = (seance: number, titre: string, denominateurs: number[], representations: ReglagesFractions["representations"]) =>
    feuilleDeFractions(seance, titre, { materiel: ["cartes"], denominateurs, representations, unitaires: true });
  const feuilles: FeuilleAFabriquer[] = [
    cartes(1, "Cartes des fractions — un demi, un quart, un huitième", [2, 4, 8], ["lettres", "disque", "bande"]),
    cartes(2, "Cartes des fractions — un tiers, un sixième", [3, 6], ["lettres", "disque"]),
    cartes(3, "Cartes des fractions — un cinquième, un dixième", [5, 10], ["lettres", "bande"]),
    cartes(5, "Cartes des fractions — en chiffres, en lettres, en images", TOUTES_UNITAIRES, ["chiffres", "lettres", "disque"]),
    cartes(6, "Jeu de mémoire des fractions — l'écriture en chiffres et l'image", TOUTES_UNITAIRES, ["chiffres", "disque"]),
  ];
  return {
    feuilles,
    materiel: notes(feuilles, [
      "Des carrés, des rectangles, des disques et des demi-disques découpés ; par élève, quatre cartes « en lettres » et quatre cartes vierges ; de la colle ; un carré agrandi pour le tableau",
      "Les jeux de memory fabriqués à la séance 1 ; le cahier de mathématiques",
      "Des disques marqués en trois parts égales, des hexagones réguliers, des rectangles ; le cahier de mathématiques",
      "Des bandes rectangulaires, certaines déjà tracées en cinq parts égales",
      "Les énoncés des problèmes ; du matériel pour vérifier ; le test de mi-séquence",
      "Par élève, un jeu de seize cartes — huit en lettres, huit disques partagés — ; un jeu agrandi pour le tableau",
      "Les jeux de memory ; des jeux autocorrectifs recto-verso",
      "Les énoncés des problèmes ; l'évaluation",
    ]),
  };
}

function planLongueursCE2(): PlanDesFeuilles {
  const feuilles: FeuilleAFabriquer[] = [
    feuilleDeFractions(0, "Bandes unités à plier", { materiel: ["bandes"] }),
    feuilleDeFractions(0, "Mesurer des segments en quarts d'unité", { materiel: ["mesurer"], graduation: 4 }),
    feuilleDeFractions(1, "Mesurer des segments en dixièmes d'unité", { materiel: ["mesurer"], graduation: 10 }),
    feuilleDeFractions(3, "Règle graduée en quarts d'unité", { materiel: ["regle"], graduation: 4 }),
    feuilleDeFractions(3, "Mesurer des segments avec la règle", { materiel: ["mesurer"], graduation: 4 }),
    feuilleDeFractions(3, "La course des nageurs", { materiel: ["nageurs"], graduation: 4 }),
    feuilleDeFractions(4, "Règle graduée en dixièmes d'unité", { materiel: ["regle"], graduation: 10 }),
    feuilleDeFractions(4, "Tracer des segments en dixièmes d'unité", { materiel: ["tracer"], graduation: 10 }),
    feuilleDeFractions(5, "Règle graduée en huitièmes d'unité", { materiel: ["regle"], graduation: 8 }),
    feuilleDeFractions(5, "Tracer des segments en demis et en quarts d'unité", { materiel: ["tracer"], graduation: 8 }),
  ];
  return {
    feuilles,
    materiel: notes(feuilles, [
      "Une bande de papier d'une vingtaine de centimètres ; des objets de la classe à mesurer, sans règle ; une affiche",
      "Des bandes unités à partager en dix",
      "Des bandes de longueur connue, des bandes vierges, des ciseaux",
      "Des segments à comparer ; du carton pour coller la règle ; pour la course des nageurs, une feuille A3 par groupe de trois",
      "Du carton pour coller la règle",
      "Du carton pour coller la règle",
    ]),
  };
}

/** Les démarches de fractions dont on sait fabriquer les feuilles. */
export const estUneDemarcheDeFractions = (id: string) => id === "fractions-unitaires-ce1" || id === "fractions-longueurs-ce2";

export function planDesFractions(demarcheId: string): PlanDesFeuilles | null {
  if (demarcheId === "fractions-unitaires-ce1") return planFractionsCE1();
  if (demarcheId === "fractions-longueurs-ce2") return planLongueursCE2();
  return null;
}
