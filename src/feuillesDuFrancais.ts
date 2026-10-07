// Les feuilles des séquences de français des livrets (voir demarchesFrancais.ts).
//
// - Décoder, lire vite : la grille de fluence de la semaine et le syllabaire,
//   de l'atelier « Grille de fluence » ; le graphème est celui qu'on a choisi
//   dans l'atelier quand il est de la classe, sinon le premier de la période.
// - Le vocabulaire : les étiquettes à catégoriser, avec le corpus du livret —
//   la course au CP, l'alimentation au CE1, le bleu au CE2 —, de l'atelier
//   « Étiquettes à catégoriser ». L'enseignant change les mots dans l'atelier
//   pour son propre réseau.
// - La cursive et la copie : les modèles et les lignes à réglure de l'atelier
//   « Écriture cursive » — la lettre du graphème de la période, puis des
//   syllabes et des mots ; pour copier, la phrase du livret, puis celles de
//   l'atelier « Phrases en désordre ».
// - Lire à voix haute : les phrases codées ou à coder et la grille du binôme
//   de l'atelier « Lire à voix haute » ; au CE2, le texte partition de la
//   fable.

import type { ClasseC2, ContexteFeuilles, FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { REGLAGES_ETIQUETTES, STYLE_ETIQUETTES, htmlEtiquettes } from "./etiquettes";
import { REGLAGES_FLUENCE, REGLAGES_SYLLABAIRE, STYLE_FLUENCE, grilleFluence, htmlFluence, htmlSyllabaire, nomDeLEtape, type ReglagesFluence, type ReglagesSyllabaire } from "./fluence";
import { ETAPES, etapeDe } from "./progressionCgp";
import { reglagesLaisses } from "./reglagesLaisses";
import { REGLAGES_CURSIVE, STYLE_CURSIVE, htmlEcritureCursive, modelesDeLEtape, type ReglagesCursive } from "./ecritureCursive";
import { REGLAGES_PHRASES, phrasesSaisies, type ReglagesPhrases } from "./phrasesEnDesordre";
import { REGLAGES_VOIX_HAUTE, STYLE_VOIX_HAUTE, htmlVoixHaute, type ReglagesVoixHaute } from "./lectureVoixHaute";

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

/** La réglure de la classe : au CP, 3 mm, puis 2,5, puis 2 au fil de l'année ; 2 mm ensuite. */
export const reglureDe = (classe: ClasseC2, periode: number): ReglagesCursive["reglure"] => (classe !== "CP" ? 2 : periode <= 2 ? 3 : periode <= 4 ? 2.5 : 2);

function feuilleDeCursive(seance: number, titre: string, r: Partial<ReglagesCursive>): FeuilleAFabriquer {
  const reglages: ReglagesCursive = { ...REGLAGES_CURSIVE, ...r };
  return { seance, atelier: "cursive", titre, fabriquer: () => ({ html: htmlEcritureCursive(reglages), style: STYLE_FEUILLE + STYLE_CURSIVE }) };
}

/** Les phrases à copier : celle du livret d'abord, puis celles de l'atelier « Phrases en désordre ». */
const phrasesACopier = () => phrasesSaisies({ ...REGLAGES_PHRASES, ...reglagesLaisses<ReglagesPhrases>("phrases") }.phrases);

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
  ["cgp-deux-jours-cp", "precision-vitesse-cp", "precision-vitesse-ce1", "vocabulaire-cp", "vocabulaire-ce1", "vocabulaire-ce2", "ecriture-cursive", "strategies-de-copie",
    "prosodie-cp", "prosodie-ce1", "lecture-expressive-ce2"].includes(id);

/** Une feuille de l'atelier « Lire à voix haute ». */
function feuilleVoixHaute(seance: number, titre: string, r: Partial<ReglagesVoixHaute>): FeuilleAFabriquer {
  const reglages = { ...REGLAGES_VOIX_HAUTE, ...r };
  return { seance, atelier: "voixHaute", titre, fabriquer: (graine) => ({ html: htmlVoixHaute(reglages, graine), style: STYLE_FEUILLE + STYLE_VOIX_HAUTE }) };
}

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
  if (demarcheId === "prosodie-cp") {
    const feuilles = [
      feuilleVoixHaute(0, "Lire à voix haute — les liaisons", { exercice: "liaisons", classe: "CP", codees: true, combien: 6 }),
      feuilleVoixHaute(1, "La grille du binôme", { exercice: "grille", classe: "CP" }),
      feuilleVoixHaute(2, "Lire à voix haute — la ponctuation", { exercice: "ponctuation", classe: "CP", codees: true, combien: 6 }),
      feuilleVoixHaute(3, "La grille du binôme", { exercice: "grille", classe: "CP" }),
    ];
    return { feuilles, materiel: notes(feuilles, ["Les phrases ou le texte du jour", "Les critères du phrasé", "Un nouveau texte ; la grille « pas encore, parfois, excellent »", "Les critères du phrasé"]) };
  }
  if (demarcheId === "prosodie-ce1") {
    const feuilles = [
      feuilleVoixHaute(0, "Lire à voix haute — les liaisons codées", { exercice: "liaisons", classe: "CE1", codees: true, combien: 6 }),
      feuilleVoixHaute(1, "Lire à voix haute — les liaisons à coder", { exercice: "liaisons", classe: "CE1", codees: false, combien: 6 }),
      feuilleVoixHaute(2, "La grille du binôme", { exercice: "grille", classe: "CE1" }),
    ];
    return { feuilles, materiel: notes(feuilles, ["Le texte du jour", "La phrase au tableau : « Le petit éléphant a un gros appétit. » ; les grilles des liaisons en /n/, /t/, /z/", "Les critères et le codage du texte", "La grille « pas encore, parfois, excellent »"]) };
  }
  if (demarcheId === "lecture-expressive-ce2") {
    const feuilles = [
      feuilleVoixHaute(0, "La fable — le texte partition", { exercice: "fable", classe: "CE2" }),
      feuilleVoixHaute(1, "La grille du binôme", { exercice: "grille", classe: "CE2" }),
      feuilleVoixHaute(2, "La grille du binôme", { exercice: "grille", classe: "CE2" }),
      feuilleVoixHaute(4, "Lire à voix haute — les groupes de souffle", { exercice: "souffle", classe: "CE2", codees: true, combien: 6 }),
    ];
    return { feuilles, materiel: notes(feuilles, ["Le texte de la fable ; des surligneurs de deux couleurs", "Le texte partition", "La grille des critères de réussite", "D'autres fables d'Ésope, de Phèdre, de La Fontaine", "Les supports des livrets CP et CE1 ; des phrases dialoguées"]) };
  }
  if (demarcheId === "ecriture-cursive") {
    const etape = etapeDeLaSequence(classe, periode), reglure = reglureDe(classe, periode);
    const nom = nomDeLEtape(etapeDe(etape));
    const feuilles = [
      feuilleDeCursive(0, `Écriture cursive — la lettre : ${nom}`, { modeles: modelesDeLEtape(etape, "lettre", 1).join("\n"), reglure, lignes: 3 }),
      feuilleDeCursive(1, `Écriture cursive — syllabes et mots : ${nom}`, { modeles: modelesDeLEtape(etape, "mots", 2).join("\n"), reglure, lignes: 2 }),
      feuilleDeCursive(2, "Transcrire en cursive", { modeles: modelesDeLEtape(etape, "mots", 3).slice(-4).join("\n"), reglure, lignes: 1, transcrire: true }),
    ];
    return { feuilles, materiel: notes(feuilles, [
      "L'ardoise ; le petit cahier à la réglure de la classe ; pour qui en a besoin, un crayon à trois faces, un guide-doigts, des lettres rugueuses",
      "Le petit cahier", "Des mots ou des phrases écrits en script",
    ]) };
  }
  if (demarcheId === "strategies-de-copie") {
    const reglure = reglureDe(classe, periode);
    const leurs = phrasesACopier();
    const feuilles = [
      feuilleDeCursive(0, "Copier une phrase", { modeles: "Il lit un petit livre.", reglure, lignes: 2, transcrire: true }),
      feuilleDeCursive(1, "Copier une phrase — entraînement", { modeles: (leurs[0] ?? "Le chat dort sur le canapé."), reglure, lignes: 2, transcrire: true }),
      feuilleDeCursive(2, "Copier deux ou trois phrases", { modeles: leurs.slice(1, 4).join("\n") || "Maman prépare une tarte aux pommes.\nNous allons à la piscine le mardi.", reglure, lignes: 1, transcrire: true }),
    ];
    return { feuilles, materiel: notes(feuilles, [
      "La phrase au tableau, puis au fond de la classe ; le cahier", "Une nouvelle phrase au tableau ; le cahier", "Les phrases au tableau ; le cahier",
    ]) };
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
