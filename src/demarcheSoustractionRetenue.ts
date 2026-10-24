// La soustraction posée avec retenue, au CE1 : une séquence d'après le manuel
// de préparation au CRPE que l'enseignant a fourni dans « Adapter une fiche »
// (octobre 2026) — « Réussir mon CRPE, oral 2025-2026, épreuve de leçon,
// maths et français » (Nathan), sujet n° 2, « Nombres et calculs CE1 »,
// p. 44-62.
//
// Le manuel découpe la séquence en quatre séances et la place en période 3
// (p. 56-57) : des problèmes qui réactivent l'addition avec retenue et la
// soustraction sans retenue ; la découverte, détaillée en cinq phases
// (p. 59-61) ; la systématisation ; l'évaluation et les remédiations. Sa
// séance de découverte s'ouvre sur le calcul mental La Martinière, qu'il veut
// presque quotidien : il ouvre ici les quatre. Les phases des séances 1, 3 et
// 4 sont de Maitrize, d'après ce que le manuel dit de ces séances, des
// prérequis et des suites qu'il propose (p. 57 et 62), et la source le dit.
// Le texte du manuel n'est pas repris : ses phases sont dites ici avec nos
// mots, et son problème des timbres n'a pas de prénom.
//
// L'algorithme est celui que le manuel retient, l'emprunt ou cassage : on
// casse une dizaine en dix unités. C'est celui de « La soustraction posée »
// (voir sequenceSoustractionPosee.ts), qui va jusqu'aux centaines en dix
// séances ; celle-ci reste sous 100, en quatre.
//
// Ses feuilles viennent des ateliers « Calcul mental », « Opérations
// posées », « Problèmes partie-tout » et « Nombres en cubes », à ses
// réglages : chacune se rouvre dans le sien.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { objectifParId } from "./faitsNumeriques";
import { REGLAGES_MARTINIERE, STYLE_MARTINIERE, calculsMartiniere, htmlMartiniere, type ReglagesMartiniere } from "./martiniere";
import { REGLAGES_POSEES, STYLE_POSEES, htmlOperationsPosees, type ReglagesPosees } from "./operationsPosees";
import {
  PRESENTATION_COMPLETE, STYLE_FEUILLE as STYLE_PROBLEMES, feuilleProblemes, genererPartieTout, type InconnuePartieTout,
} from "./problemesBarres";

export const DEMARCHE_SOUSTRACTION_RETENUE = "soustraction-retenue-ce1";

const LM = "Calcul mental — procédé La Martinière";
const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;

const MANUEL = "« Réussir mon CRPE — Oral 2025-2026, épreuve de leçon, Maths · Français » (D. Motteau, C. Jegaden, A.-R. Morel, S. Méric-Pons ; Nathan)";

/** Le calcul mental de chaque séance : l'objectif de l'atelier « Calcul mental » qu'elle travaille. */
const CALCUL_MENTAL = ["ce1-tables-addition", "ce1-tables-addition", "ce1-soustraire-unites", "ce1-dizaines-centaines"];
const ROUTINE = "L'enseignant dit le calcul ; après un court temps de réflexion, chacun écrit le résultat sur son ardoise et la lève au signal.";

export const SOUSTRACTION_AVEC_RETENUE: Demarche = {
  id: DEMARCHE_SOUSTRACTION_RETENUE,
  nom: "La soustraction posée avec retenue (CE1)",
  famille: "Mathématiques",
  source: `D'après ${MANUEL}, sujet n° 2, « Nombres et calculs CE1 », p. 44-62 : la séquence en quatre séances et sa période (p. 56-57), `
    + "la séance de découverte détaillée (p. 59-61) ; les phases des séances 1, 3 et 4 et le calcul mental en tête de chaque séance ajoutés par Maitrize, "
    + "d'après les prérequis et les suites que le manuel propose (p. 57 et 62) ; programme de mathématiques du cycle 2 (2024)",
  resume: "Au CE1, en période 3 : la soustraction posée avec retenue, par emprunt — on casse une dizaine —, pour des nombres inférieurs à 100. "
    + "Le sens vient d'un problème : une collection de 52 timbres rangés par enveloppes de dix, dont on donne 18. On confronte trois façons de le "
    + "résoudre — manipuler, dessiner, écrire un calcul —, puis le calcul posé bute sur 2 – 8 : on ouvre une enveloppe. Avant, une séance de "
    + "problèmes réactive l'addition avec retenue et la soustraction sans retenue ; après, on s'entraîne en ne cassant une dizaine que lorsqu'il le "
    + "faut, puis on évalue et on reprend la numération avec qui en a besoin. Le calcul mental ouvre chaque séance : la technique demande les tables "
    + "d'addition dans les deux sens (12 – 8).",
  visee: { intitule: /additions et des soustractions en colonnes/i, niveaux: ["CE1"] },
  seances: [
    seance("Des problèmes pour additionner ou soustraire",
      sauront("résoudre des problèmes additifs — ce qu'on a après avoir ajouté ou retiré, le tout ou une partie —, les écrire par une addition ou une soustraction, poser des additions avec retenue et des soustractions sans retenue."), 45, [
        ph(LM, "10 min", `Les tables d'addition dans les deux sens — « 13 – 5 », « 12 – 8 », « de 7 pour aller à 15 » : les petites différences que la soustraction avec retenue fera calculer. ${ROUTINE}`,
          "En début de séance de numération et de calcul, chaque jour."),
        ph(T1, "10 min", "Deux problèmes dits, puis lus : « La classe avait 47 billes ; elle en gagne 25. Combien en a-t-elle maintenant ? » et « Elle en avait 68 ; elle en perd 35. Combien lui en reste-t-il ? » Chacun écrit le calcul qui répond : une addition, ou une soustraction.",
          "Fait dire ce qui change : on ajoute, on retire ; on cherche ce qu'il y a à la fin."),
        ph(T2, "20 min", "La feuille « Problèmes — le tout ou une partie » : lire l'énoncé seul, écrire le calcul, le faire — de tête, en ligne ou posé —, répondre par une phrase. Puis « Additions posées, avec retenue » et « Soustractions posées, sans retenue ».",
          "Le matériel de numération reste à disposition ; repère qui pose encore mal ses nombres ou commence par les dizaines."),
        ph(T3, "5 min", "Ce qu'on retient : on additionne pour trouver le tout, ou ce qu'on a après avoir ajouté ; on soustrait pour trouver une partie, ou ce qui reste. La soustraction posée sans retenue se calcule rang par rang, les unités d'abord ; on dit « 5 moins 3 », « 3 ôté de 5 » ou « de 3 pour aller à 5 »."),
      ]),
    // La séance détaillée du manuel : ses cinq phases, leur organisation et leur durée.
    seance("Le problème des timbres : casser une dizaine",
      sauront("poser et calculer une soustraction en colonnes avec retenue, pour des nombres inférieurs à 100 : quand il n'y a pas assez d'unités, on casse une dizaine en dix unités."), 40, [
        ph(LM, "10 min", `Chacun pour soi : des soustractions simples — « 7 – 2 », « 9 – 6 » —, des compléments — « de 3 pour aller à 8 » — et une question de numération : « Combien de dizaines dans 34 ? » ${ROUTINE}`,
          "Commente les réponses et interprète les erreurs : un comptage faux (8 – 3 = 6), une écriture mal lue (43, c'est 40 + 3, 4 dizaines et 3 unités). Aides : des jetons, les barres de dix et les cubes pour montrer les nombres. Si les erreurs persistent, des séances de remédiation."),
        ph("Phase 2 – Groupes de 2 ou 3", "10 min", "Le problème, lu d'abord seul, puis cherché en groupes homogènes : « Notre classe collectionne les timbres. Elle en a 52 ; elle en donne 18 à la classe voisine. Combien lui en reste-t-il ? » Après la recherche, chaque groupe reçoit de quoi vérifier : cinq enveloppes fermées de dix timbres et deux timbres seuls. On n'ouvre une enveloppe qu'avec l'accord de l'enseignant.",
          "Gère les échanges dans les groupes ; apporte le matériel à qui en a besoin. Erreurs attendues : la soustraction posée qui donne 46 — on a retiré 2 de 8 —, ou un changement de procédure : dessiner, manipuler."),
        ph("Phase 3 – Collectif", "5 min", "La mise en commun : deux ou trois groupes, choisis, montrent leur façon de faire — le dessin, le calcul écrit, le matériel. Il reste 34 timbres.",
          "Mène le débat ; propose une représentation de la situation et son écriture : 52 – 18."),
        ph("Phase 4 – Collectif", "5 min", "De l'écriture du problème, 52 – 18, à la soustraction posée : 2 – 8, on ne peut pas. On ouvre une enveloppe, on casse une dizaine : 12 unités. 12 – 8 = 4 ; il reste 4 dizaines, 4 – 1 = 3. On trouve 34. Les premières traces écrites, les premiers mots : « je casse une dizaine ».",
          "Montre l'obstacle nouveau ; ouvre l'enveloppe devant la classe pendant qu'on écrit le cassage, sur l'affiche de l'algorithme."),
        ph("Phase 5 – Individuel", "10 min", "Sans histoire : 65 – 37. Chacun a six barres de dix cubes et cinq cubes seuls ; on casse une barre, on retire, puis on pose la soustraction en disant ce qu'on écrit. La feuille « Soustractions posées — casser une dizaine ».",
          "Fait dire le sens de chaque trace — la dizaine barrée, le 1 devant les unités — et les façons de dire. Aide : revenir au matériel et montrer que 6 dizaines et 5 unités, c'est aussi 5 dizaines et 15 unités."),
      ]),
    seance("Casser ou pas : s'entraîner",
      sauront("poser seuls des soustractions avec et sans retenue, et décider avant de calculer s'il faut casser une dizaine."), 45, [
        ph(LM, "10 min", `Soustraire un nombre à un chiffre — « 48 – 6 », « 52 – 7 » : de tête, en passant la dizaine quand il le faut. ${ROUTINE}`,
          "En début de séance de numération et de calcul, chaque jour."),
        ph(T1, "10 min", "L'affiche de l'algorithme, faite à la séance des timbres : on refait 43 – 17 ensemble, avec les barres et les cubes, puis posé ; chacun dit une étape.",
          "Fait dire les mots de la technique : « je casse une dizaine », « 13 moins 7 », « 3 dizaines moins 1 dizaine »."),
        ph(T2, "20 min", "La feuille « Soustractions à poser — casser ou pas ? » : on regarde d'abord les unités — assez, ou pas assez ? —, puis on pose et on calcule. Puis la feuille « Problèmes — chercher une partie ».",
          "Le matériel reste à disposition. Observe qui casse une dizaine alors qu'il y a assez d'unités : le manuel prévient que certains le feront à chaque fois."),
        ph(T3, "5 min", "Ce qu'on retient : on ne casse une dizaine que s'il n'y a pas assez d'unités ; le résultat est plus petit que le premier nombre, et l'addition le vérifie."),
      ]),
    seance("Évaluation et remédiations",
      sauront("poser et calculer seuls des soustractions avec et sans retenue ; ceux qui en ont besoin reprennent la dizaine et la valeur des chiffres."), 45, [
        ph(LM, "10 min", `Ajouter ou soustraire des dizaines entières — « 70 – 30 », « 45 + 20 », et « Dans 28, quel est le chiffre des dizaines ? » ${ROUTINE}`,
          "En début de séance de numération et de calcul, chaque jour."),
        ph("Évaluation", "20 min", "La feuille « Soustractions à poser — évaluation » : des soustractions avec et sans retenue, à poser et à calculer seul.",
          "Observe sans aider : qui casse sans en avoir besoin, qui se trompe dans les tables, qui aligne mal les nombres."),
        ph("Remédiations", "15 min", "Pour qui en a besoin, la numération d'abord : dénombrer une grande collection — des allumettes en fagots de dix, tenus par un élastique —, montrer 34 et 87 avec les barres et les cubes, dire ce que vaut chaque chiffre de 56 ; la feuille « Faire un nombre de plusieurs façons ». Les autres : de nouvelles soustractions et des problèmes. Ensuite, un entraînement court et régulier, et des problèmes chaque semaine.",
          "Reprend avec le matériel ce que l'évaluation a montré ; garde les fagots pour les séances suivantes."),
      ]),
  ],
};

// ── Les feuilles des séances ──────────────────────────────────────────────

/** Le calcul mental d'une séance, au procédé La Martinière : la fiche du maître et les ardoises. */
const martiniere = (seance: number, objectif: string): FeuilleAFabriquer => {
  const r: ReglagesMartiniere = { ...REGLAGES_MARTINIERE, niveau: "CE1", objectifs: [objectif], revision: false, forme: "oral", ardoises: true };
  return {
    seance, atelier: "martiniere", titre: `Calcul mental — ${objectifParId(objectif)?.libelle ?? objectif}`,
    fabriquer: (g) => ({ html: htmlMartiniere(calculsMartiniere(r, g), r), style: STYLE_FEUILLE + STYLE_MARTINIERE, refaire: { martiniere: r } }),
  };
};

const posees = (seance: number, titre: string, r: Partial<ReglagesPosees>): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_POSEES, chiffres: 2, ...r };
  return {
    seance, atelier: "posees", titre,
    fabriquer: (g) => ({ html: htmlOperationsPosees(reglages, g), style: STYLE_FEUILLE + STYLE_POSEES, refaire: { operationsPosees: reglages } }),
  };
};

const PRESENTATION_SANS_SCHEMA = { ...PRESENTATION_COMPLETE, schema: "sans" as const };
/** Quatre problèmes de l'atelier partie-tout, sous 100 : il les refait, avec les mêmes réglages et le même tirage. */
const problemes = (seance: number, titre: string, inconnue: InconnuePartieTout): FeuilleAFabriquer => ({
  seance, atelier: "partieTout", titre,
  fabriquer: (g) => ({
    html: feuilleProblemes(genererPartieTout({ nombre: 4, parties: 2, inconnue, max: 100, enonces: true, prenoms: [] }, g), titre, PRESENTATION_SANS_SCHEMA),
    style: STYLE_PROBLEMES,
    refaire: { partieTout: { titre, nombre: 4, prenoms: "", parties: 2, inconnue, max: 100, perso: false }, "presentation:partieTout": PRESENTATION_SANS_SCHEMA },
    graine: g,
  }),
});

const FEUILLES: FeuilleAFabriquer[] = [
  ...CALCUL_MENTAL.map((objectif, s) => martiniere(s, objectif)),
  problemes(0, "Problèmes — le tout ou une partie", "melange"),
  posees(0, "Additions posées, avec retenue", { operation: "+", retenue: "avec", combien: 4 }),
  posees(0, "Soustractions posées, sans retenue", { operation: "−", retenue: "sans", combien: 4 }),
  // La séance du manuel : 65 – 37 avec le matériel, puis quelques autres.
  posees(1, "Soustractions posées — casser une dizaine", { operation: "−", retenue: "avec", combien: 4 }),
  posees(2, "Soustractions à poser — casser ou pas ?", { operation: "−", retenue: "melange", combien: 8, posees: false }),
  problemes(2, "Problèmes — chercher une partie", "partie"),
  posees(3, "Soustractions à poser — évaluation", { operation: "−", retenue: "melange", combien: 6, posees: false }),
];

/** Ce qu'il faut préparer, séance par séance ; les feuilles sont nommées après, sauf la fiche du calcul mental. */
const MATERIEL = [
  "Les ardoises ; les barres de dix et les cubes, à disposition",
  "Les ardoises ; des jetons ; par groupe de 2 ou 3, cinq enveloppes fermées de dix timbres — ou de dix petites images — et deux timbres seuls ; "
    + "six barres de dix cubes et cinq cubes par élève ; le tableau référentiel ; l'affiche de l'algorithme, préparée",
  "Les ardoises ; l'affiche de l'algorithme ; les barres et les cubes, à disposition",
  "Les ardoises ; pour la remédiation, de quoi faire une grande collection — des allumettes et des élastiques —, les barres et les cubes",
];

export const estUneDemarcheSoustractionRetenue = (id: string) => id === DEMARCHE_SOUSTRACTION_RETENUE;

/** Les feuilles et le matériel de la séquence ; `autres` : les feuilles d'un atelier qu'on y ajoute, à leur séance. */
export function planSoustractionRetenue(autres: FeuilleAFabriquer[] = []): PlanDesFeuilles {
  const feuilles = [...FEUILLES, ...autres].sort((a, b) => a.seance - b.seance);
  const materiel = MATERIEL.map((debut, s) => {
    const f = feuilles.filter((x) => x.seance === s && x.atelier !== "martiniere").map((x) => `« ${x.titre} »`);
    if (!f.length) return `${debut}.`;
    const liste = f.length > 1 ? `${f.slice(0, -1).join(", ")} et ${f[f.length - 1]}` : f[0];
    return `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${liste}.`;
  });
  return { feuilles, materiel };
}
