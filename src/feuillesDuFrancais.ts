// Les feuilles des séquences de français des livrets (voir demarchesFrancais.ts).
//
// - Décoder, lire vite : la grille de fluence de la semaine et le syllabaire,
//   de l'atelier « Grille de fluence » ; le graphème est celui qu'on a choisi
//   dans l'atelier quand il est de la classe, sinon le premier de la période.
// - Le vocabulaire : les étiquettes à catégoriser, avec le corpus du livret —
//   la course au CP, l'alimentation au CE1, le bleu au CE2 —, de l'atelier
//   « Étiquettes à catégoriser ». L'enseignant change les mots dans l'atelier
//   pour son propre réseau.
// La cursive, la copie, la prosodie n'ont pas encore de feuille : leurs
// séances le disent dans la note du matériel.

import type { ClasseC2, ContexteFeuilles, FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { REGLAGES_ETIQUETTES, STYLE_ETIQUETTES, htmlEtiquettes } from "./etiquettes";
import { REGLAGES_FLUENCE, REGLAGES_SYLLABAIRE, STYLE_FLUENCE, grilleFluence, htmlFluence, htmlSyllabaire, nomDeLEtape, type ReglagesFluence, type ReglagesSyllabaire } from "./fluence";
import { ETAPES, etapeDe } from "./progressionCgp";
import { reglagesLaisses } from "./reglagesLaisses";

/** Le graphème d'une séquence de lecture : celui de l'atelier quand il est de la classe, sinon le premier de la période. */
export function etapeDeLaSequence(classe: ClasseC2, periode: number): string {
  const laissee = reglagesLaisses<ReglagesFluence>("fluence").son;
  const choisie = laissee ? etapeDe(laissee) : null;
  const duCP = (p: unknown) => typeof p === "number";
  if (choisie && !choisie.revision && duCP(choisie.periode) === (classe === "CP")) return choisie.id;
  const cible = classe === "CP" ? Math.min(5, Math.max(1, periode)) : "ce1";
  return ETAPES.find((e) => e.periode === cible && !e.revision)?.id ?? REGLAGES_FLUENCE.son;
}

function feuilleDeFluence(seance: number, classe: ClasseC2, periode: number, plus: Partial<ReglagesFluence> = {}): FeuilleAFabriquer {
  const r: ReglagesFluence = { ...REGLAGES_FLUENCE, ...reglagesLaisses<ReglagesFluence>("fluence"), son: etapeDeLaSequence(classe, periode), ...plus };
  return {
    seance, atelier: "fluence", titre: `Grille de fluence — ${nomDeLEtape(etapeDe(r.son))}`,
    fabriquer: (graine) => ({ html: htmlFluence(grilleFluence(r, graine), r), style: STYLE_FEUILLE + STYLE_FLUENCE }),
  };
}

function feuilleDuSyllabaire(seance: number): FeuilleAFabriquer {
  const r: ReglagesSyllabaire = { ...REGLAGES_SYLLABAIRE, ...reglagesLaisses<ReglagesSyllabaire>("syllabaire") };
  return { seance, atelier: "syllabaire", titre: "Syllabaire — le jeu de l'ascenseur", fabriquer: () => ({ html: htmlSyllabaire(r), style: STYLE_FEUILLE + STYLE_FLUENCE }) };
}

/** Les corpus à catégoriser que donnent les livrets, mot pour mot. */
export const CORPUS_DES_LIVRETS: Record<"CP" | "CE1" | "CE2", { theme: string; mots: string[] }> = {
  CP: {
    theme: "la course",
    mots: ["courir", "ralentir", "la course", "l'arrivée", "rapide", "lent", "arriver", "endurante", "lentement", "un coureur", "la rapidité", "rapidement",
      "l'endurance", "accélérer", "une accélération"],
  },
  CE1: {
    theme: "un repas équilibré",
    mots: ["faisselle", "fromage blanc", "endives", "agrumes", "pois chiche", "lentilles", "cabillaud", "fruits de mer", "petit-déjeuner", "déjeuner", "dîner",
      "équilibrer", "alléger", "beurre", "charcuterie", "lait", "café", "cassonade", "confiture", "copieux", "riche", "allégé", "équilibré", "collation",
      "pot-au-feu", "ragoût", "omelette", "composer", "élaborer"],
  },
  CE2: {
    theme: "le bleu",
    mots: ["turquoise", "foncé", "primaire", "outremer", "nuit", "indigo", "cyan", "asperger", "peindre", "toile", "encre", "pinceau", "rouleau", "brosse",
      "acrylique", "chaude", "badigeonner", "frotter", "pâle", "cobalt", "froide", "peinture à l'eau", "gouache", "pastel gras", "fusain", "aquarelle",
      "papier", "carton"],
  },
};

function feuilleDEtiquettes(seance: number, classe: "CP" | "CE1" | "CE2"): FeuilleAFabriquer {
  const { theme, mots } = CORPUS_DES_LIVRETS[classe];
  const r = { ...REGLAGES_ETIQUETTES, ...reglagesLaisses<typeof REGLAGES_ETIQUETTES>("etiquettes"), pictos: false, titreCorolle: theme };
  return {
    seance, atelier: "etiquettes", titre: `Étiquettes à catégoriser — ${theme}`,
    fabriquer: () => ({ html: htmlEtiquettes(mots.map((mot) => ({ id: null, mot })), {}, r), style: STYLE_FEUILLE + STYLE_ETIQUETTES }),
  };
}

/** La note du matériel de chaque séance, avec les feuilles nommées comme elles s'impriment. */
function notes(feuilles: FeuilleAFabriquer[], debuts: string[]): string[] {
  return debuts.map((debut, s) => {
    const f = feuilles.filter((x) => x.seance === s).map((x) => `« ${x.titre} »`);
    return f.length ? `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${f.join(" et ")}.` : `${debut}.`;
  });
}

const MUR = "Le mur sonore ; les ardoises";

/** Les démarches de français dont on sait fabriquer des feuilles. */
export const estUneDemarcheDeFrancais = (id: string) =>
  ["cgp-deux-jours-cp", "precision-vitesse-cp", "precision-vitesse-ce1", "vocabulaire-cp", "vocabulaire-ce1", "vocabulaire-ce2"].includes(id);

export function planDuFrancais(demarcheId: string, ctx: ContexteFeuilles): PlanDesFeuilles | null {
  const { classe, periode } = ctx;
  if (demarcheId === "cgp-deux-jours-cp") {
    const feuilles = [feuilleDuSyllabaire(0), feuilleDeFluence(3, classe, periode), feuilleDeFluence(9, classe, periode, { puissance4: true })];
    return {
      feuilles,
      materiel: notes(feuilles, [
        `${MUR} ; le nouveau graphème, en grand`, "Le cahier d'écriture, la réglure de la période", "Les ardoises ; des étiquettes-lettres", MUR,
        "Des mots entièrement décodables, écrits en grand", "Un texte déchiffrable avec le graphème", "Le cahier d'écriture",
        "Le cahier du jour, pour la dictée", "Un corpus déchiffrable à copier", "Un chronomètre ; les jetons du jeu",
      ]),
    };
  }
  if (demarcheId === "precision-vitesse-cp" || demarcheId === "precision-vitesse-ce1") {
    const cp = demarcheId === "precision-vitesse-cp";
    // La grille de la semaine : sa table des scores suit les quatre jours ; au CP, le plateau des quatre jetons alignés.
    const feuilles = cp ? [feuilleDeFluence(0, classe, periode, { puissance4: true })] : [feuilleDeFluence(0, classe, periode), feuilleDuSyllabaire(0)];
    return {
      feuilles,
      materiel: notes(feuilles, cp
        ? ["Les outils : le mur sonore, la synthèse vocale", "Les jetons de deux couleurs ; les traces écrites des séances précédentes", "Un chronomètre", "Un chronomètre ; le cahier, pour la copie cursive"]
        : ["La grille de la semaine précédente, pour l'évaluation ; un chronomètre", "Un chronomètre", "Un chronomètre ; le cahier, pour la copie cursive", "Un chronomètre"]),
    };
  }
  if (demarcheId === "vocabulaire-cp" || demarcheId === "vocabulaire-ce1" || demarcheId === "vocabulaire-ce2") {
    const niveau = demarcheId === "vocabulaire-cp" ? "CP" : demarcheId === "vocabulaire-ce1" ? "CE1" : "CE2";
    const feuilles = [feuilleDEtiquettes(2, niveau)];
    const debuts = niveau === "CP"
      ? ["La séquence d'EPS sur la course", "Des étiquettes vierges", "Les étiquettes en grand, à aimanter ; une enveloppe par trinôme", "Le cahier de vocabulaire",
        "Les jeux : loto, memory, jeu de l'oie, jeu des sept familles", "Les jeux", "Les jeux"]
      : niveau === "CE1"
        ? ["La séquence de questionner le monde sur l'équilibre alimentaire", "Des étiquettes vierges", "Les étiquettes en grand, à aimanter ; une enveloppe par trinôme",
          "Le référentiel collectif", "Les jeux : loto, jeu de piste", "Le référentiel ; un chronomètre", "Un menu type"]
        : ["La séquence d'arts visuels sur le bleu ; les trois œuvres", "Des étiquettes vierges", "Les étiquettes en grand, à aimanter ; une enveloppe par trinôme",
          "Le référentiel collectif", "Les mots du corpus", "Des cartes des nuances de bleu", "Des cartes des nuances de bleu"];
    return { feuilles, materiel: notes(feuilles, debuts) };
  }
  return null;
}
