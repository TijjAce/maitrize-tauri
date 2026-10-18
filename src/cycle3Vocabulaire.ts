// Le vocabulaire et l'orthographe des mots au cours moyen.
//
// Bâties, en le disant, sur le programme de français du cycle 3 (2025) et ses
// exemples de réussite du CM1 et du CM2 : les livrets d'accompagnement de
// français s'arrêtent au CE2. Le programme veut un temps dédié au
// vocabulaire chaque jour, une remémoration des corpus chaque semaine, un
// outil qui consigne les mots, et trois étapes : la rencontre du mot en
// contexte, l'étude structurée, le réemploi à l'oral et surtout à l'écrit.
// Les feuilles viennent de vocabulaireCoursMoyen.ts.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { ContexteFeuilles, FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { PROGRAMME_FRANCAIS_C3 } from "./cycle3Langue";
import { REGLAGES_VOCABULAIRE_CM, STYLE_VOCABULAIRE_CM, htmlVocabulaireCM, type ExerciceVocabulaireCM } from "./vocabulaireCoursMoyen";

const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const T4 = "Temps 4 – Automatisation, réinvestissement, transfert";
const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;
const trois = (titre: string, objectif: string, situation: string, activite: string, retenir: string, posture = "") =>
  seance(titre, sauront(objectif), 45, [ph(T1, "10 min", situation), ph(T2, "25 min", activite, posture), ph(T3, "10 min", retenir)]);
const entrainement = (titre: string, objectif: string, activite: string, retenir: string) =>
  seance(titre, sauront(objectif), 30, [ph(T1, "5 min", "Ce qu'on a retenu, rappelé par les élèves ; l'objectif du jour."), ph(T4, "20 min", activite), ph(T3, "5 min", retenir)]);
const rituel = (titre: string, objectif: string, duree: number, activite: string) => seance(titre, sauront(objectif), duree, [ph(T4, `${duree} min`, activite)]);
const evaluation = (quoi: string, ensuite: string) => seance("Évaluation", sauront(`${quoi}, seuls.`), 30, [
  ph("Évaluation", "25 min", `Une feuille : ${quoi}.`),
  ph(T4, "5 min", ensuite),
]);

const enrichir = (classe: "CM1" | "CM2"): Demarche => {
  const cm2 = classe === "CM2";
  return {
    id: `enrichir-vocabulaire-${classe.toLowerCase()}`, nom: `Enrichir son vocabulaire : le mot inconnu, le dictionnaire, le répertoire (${classe})`, famille: "Français",
    source: PROGRAMME_FRANCAIS_C3,
    resume: cm2
      ? "Acquérir un vocabulaire précis dans différents univers de référence ; se servir du contexte et de la morphologie pour comprendre les mots inconnus ; utiliser des dictionnaires. Exemples de réussite : relever les mots inconnus d'une lecture et en chercher le sens — en histoire, industrialisation, mécanisation ; en géographie, mobilités pendulaires, migration ; en sciences, convertir, convertisseur — ; lire en entier un article de dictionnaire et en distinguer les informations ; mémoriser par un dictionnaire personnel, une carte mentale, des paraphrases, des phrases inventées ; paraphraser un mot nouveau : « Une révolution, c'est le moment où le peuple renverse par la force un gouvernement. »"
      : "Approfondir, en contexte, le vocabulaire appris au cycle 2 ; mémoriser des mots et des expressions à partir de corpus variés, issus de toutes les disciplines ; identifier les mots inconnus et chercher leur sens par la morphologie et le contexte. Exemples de réussite : découvrir les multiples usages d'un mot connu — une belle vue, avoir une bonne vue, un point de vue, à perte de vue — ; expliquer avec ses mots un mot nouveau ; utiliser régulièrement le dictionnaire ; mémoriser par le jeu : mots croisés, domino des synonymes, jeu du dictionnaire.",
    seances: [
      trois("Le mot inconnu", "comprendre un mot inconnu par le contexte et par sa formation.",
        "Une phrase avec un mot inconnu : comment le comprendre sans dictionnaire ?",
        "Chercher l'indice dans la phrase et dans le mot — un radical connu, un préfixe, un suffixe — ; proposer un sens, le vérifier en remplaçant le mot ; puis vérifier dans le dictionnaire.",
        "Ce qu'on retient : la phrase et la formation du mot aident à le comprendre ; le dictionnaire confirme."),
      trois("Le dictionnaire", "chercher un mot dans le dictionnaire et choisir le sens qui convient.",
        "Comment trouver vite un mot dans le dictionnaire ?",
        "Ranger des mots dans l'ordre alphabétique, jusqu'à la troisième lettre ; lire un article en entier : la classe, les sens numérotés, les exemples, la famille ; choisir le sens qui convient à une phrase.",
        "Ce qu'on retient : je lis l'article en entier, puis je choisis le sens de ma phrase."),
      ...(cm2 ? [entrainement("Dire un mot nouveau avec ses mots", "expliquer un mot nouveau par une paraphrase.",
        "Pour chaque mot nouveau d'une leçon d'histoire, de géographie ou de sciences, écrire sa paraphrase — « Une révolution, c'est le moment où… » — ; comparer avec le dictionnaire et avec les paraphrases des autres.",
        "Ce qu'on retient : expliquer un mot avec ses mots, c'est le comprendre.")] : []),
      rituel("Mon répertoire de mots (chaque semaine)", "remémorer les mots étudiés et les consigner dans son répertoire.", 20,
        `Chaque semaine, on remémore les mots du corpus étudié — en français, en histoire, en sciences — et on les consigne dans son répertoire, rangés par thèmes ; on joue avec : ${cm2 ? "la carte mentale, les phrases inventées, le dictionnaire personnel" : "les mots croisés, le domino des synonymes, le jeu du dictionnaire"}.`),
      evaluation("comprendre des mots inconnus et utiliser le dictionnaire", "Ensuite, chaque lecture et chaque discipline apportent leurs mots au répertoire."),
    ],
  };
};

const relations = (classe: "CM1" | "CM2"): Demarche => classe === "CM1" ? {
  id: "relations-mots-cm1", nom: "Les relations entre les mots : la formation, les familles, synonymes et antonymes (CM1)", famille: "Français",
  source: PROGRAMME_FRANCAIS_C3,
  resume: "Établir des relations morphologiques et sémantiques entre les mots ; comprendre et utiliser les notions de synonymie et d'antonymie. Exemples de réussite : identifier les morphèmes d'un mot — lait, laiteux, allaiter ; maisonnette, fillette, camionnette — ; comprendre un mot par ses affixes — embarquer, biodégradable — ; différencier des homonymes par la dérivation ou le dictionnaire — comte, comtesse ; conte — ; former des mots avec des préfixes et des suffixes fréquents et les définir ; comprendre la formation des noms composés ; trouver des synonymes, des antonymes de même classe : un monstre répugnant, terrifiant, repoussant.",
  seances: [
    trois("La formation des mots", "décomposer un mot et en déduire son sens.",
      "lait, laiteux, allaiter : qu'ont-ils en commun ?",
      "Décomposer des mots — préfixe, radical, suffixe — ; trouver le sens d'un mot par ses affixes ; fabriquer des mots avec des préfixes et des suffixes fréquents, et les définir.",
      "Ce qu'on retient : le radical porte le sens ; préfixes et suffixes le modifient."),
    trois("Les familles de mots", "constituer une famille de mots et distinguer des homonymes.",
      "Un mot et ses cousins : dent, dentiste, dentaire…",
      "Constituer des familles ; repérer les faux amis ; distinguer des homonymes par la dérivation : comte, comtesse ; conte, conteur.",
      "Ce qu'on retient : une famille partage un radical et un sens."),
    trois("Synonymes et antonymes", "trouver des synonymes et des antonymes de même classe.",
      "« Un monstre répugnant » : par quoi remplacer « répugnant » ?",
      "Chercher des synonymes et des antonymes de même classe ; vérifier en remplaçant dans la phrase ; ranger des synonymes du plus faible au plus fort : effrayant, terrifiant, épouvantable.",
      "Ce qu'on retient : un synonyme, un antonyme, toujours de la même classe que le mot."),
    evaluation("décomposer des mots, constituer des familles, trouver des synonymes et des antonymes", "Ensuite, ces relations servent à comprendre et à écrire."),
  ],
} : {
  id: "relations-mots-cm2", nom: "Les relations entre les mots : la polysémie, les éléments savants (CM2)", famille: "Français",
  source: PROGRAMME_FRANCAIS_C3,
  resume: "Approfondir la notion de polysémie dans un contexte non référentiel ; approfondir les relations morphologiques et sémantiques entre les mots. Exemples de réussite : illustrer les constructions d'un verbe — jouer à, jouer sur, jouer avec — ; construire le sens de mots polysémiques comme milieu ou point, selon la discipline ; donner des synonymes et des antonymes de même classe — nom, verbe, adjectif — ; rapprocher insecticide et régicide pour dégager -cide, tuer ; insecticide et insectivore pour isoler insecte ; insectivore et carnivore pour isoler -vore.",
  seances: [
    trois("Un mot, plusieurs sens", "trouver le sens d'un mot polysémique selon son contexte.",
      "« Le milieu de la cour », « le milieu de vie du castor » : est-ce le même sens ?",
      "Pour des mots comme sens, milieu, point, chercher le sens de chaque phrase ; illustrer les constructions d'un verbe : jouer à, jouer de, jouer sur, jouer avec.",
      "Ce qu'on retient : le contexte dit le sens ; un verbe change de sens avec sa construction."),
    trois("Les éléments savants", "reconnaître des éléments savants pour comprendre un mot.",
      "insecticide, régicide, insectivore, carnivore : que veulent dire -cide et -vore ?",
      "Rapprocher des mots pour isoler un élément et en déduire le sens — -cide, -vore, bio-, géo-, trans-, omni- — ; former et définir d'autres mots.",
      "Ce qu'on retient : un élément savant garde son sens d'un mot à l'autre."),
    entrainement("Synonymes et antonymes, de même classe", "donner des synonymes et des antonymes qui respectent la classe du mot.",
      "Chercher des synonymes et des antonymes de noms, de verbes, d'adjectifs ; vérifier en remplaçant dans la phrase.",
      "Ce qu'on retient : le synonyme d'un verbe est un verbe ; celui d'un nom, un nom."),
    evaluation("trouver le sens d'un mot polysémique, et de mots formés d'éléments savants", "Ensuite, en lecture et en sciences, ces éléments éclairent les mots nouveaux."),
  ],
};

const reemployer = (classe: "CM1" | "CM2"): Demarche => {
  const cm2 = classe === "CM2";
  return {
    id: `reemployer-${classe.toLowerCase()}`, nom: `Réemployer le vocabulaire : univers de référence et mot juste (${classe})`, famille: "Français",
    source: PROGRAMME_FRANCAIS_C3,
    resume: cm2
      ? "À l'oral et à l'écrit, utiliser précisément le vocabulaire de différents univers de référence et se l'approprier durablement ; utiliser à bon escient les mots polysémiques dans différentes disciplines. Exemples de réussite : réemployer les mots appris dans différents domaines, avec les outils de la classe ; les réactiver à court et à long terme ; employer à bon escient les acceptions du mot sens : la direction, la signification, les cinq sens."
      : "À l'oral et à l'écrit, utiliser à bon escient les mots appris et se les approprier durablement ; utiliser à bon escient les mots polysémiques dans différentes disciplines. Exemples de réussite : réemployer les mots appris dans un exposé ou une rédaction ; améliorer son texte avec une corolle lexicale, des synonymes, des antonymes ; réactiver les mots en les associant à leur définition, en les définissant, en les retrouvant d'après leur définition ; distinguer la règle qui mesure et la règle à respecter.",
    seances: [
      trois("La corolle d'un univers", "rassembler les mots d'un univers de référence pour écrire.",
        cm2 ? "Un univers étudié — le château fort, la révolution industrielle, l'énergie — : quels mots connaissons-nous ?" : "Un univers de la classe — la peur dans le conte lu, la mer — : quels mots connaissons-nous ?",
        "Construire la corolle : des noms, des verbes, des adjectifs, des expressions ; les classer ; écrire des phrases qui les réemploient.",
        "Ce qu'on retient : la corolle est un outil pour parler et pour écrire."),
      trois("Le mot juste dans son texte", "remplacer un mot vague par un mot précis.",
        "Un texte qui répète « dire », « faire », « beau » : comment l'améliorer ?",
        "Remplacer les mots vagues par des mots précis de la corolle ; vérifier le sens et la classe ; relire le texte amélioré.",
        "Ce qu'on retient : le mot précis rend le texte clair et vivant."),
      entrainement("Les mots qui changent de sens selon la discipline", "employer un mot polysémique dans le sens de chaque discipline.",
        cm2 ? "Le sens en mathématiques, en grammaire, en sciences ; le point, le milieu : employer chaque mot dans le sens de la discipline, à l'oral puis à l'écrit."
          : "La règle en géométrie et la règle du jeu ; le point en grammaire et en mathématiques : employer chaque mot dans le sens de la discipline, à l'oral puis à l'écrit.",
        "Ce qu'on retient : la discipline donne le sens du mot."),
      rituel("Réactiver les mots (chaque semaine)", "retrouver les mots appris, longtemps après.", 15,
        "Associer des mots à leur définition, définir un mot, trouver le mot d'après sa définition : avec les mots de la semaine, puis avec ceux des semaines passées."),
    ],
  };
};

const orthographeDesMots = (classe: "CM1" | "CM2"): Demarche => {
  const cm2 = classe === "CM2";
  return {
    id: `orthographe-mots-${classe.toLowerCase()}`, nom: `Mémoriser l'orthographe des mots : la formation, les mots fréquents (${classe})`, famille: "Français",
    source: PROGRAMME_FRANCAIS_C3,
    resume: cm2
      ? "Écrire correctement les mots fréquents en s'appuyant sur les régularités et la formation. Exemples de réussite : automatiser l'orthographe des mots fréquents étudiés à l'école ; systématiser l'appui sur la formation des mots — l'orthographe d'insecticide aide à écrire insectivore — ; apprendre les mots invariables et les mots irréguliers fréquents."
      : "Écrire correctement les mots les plus fréquents de la langue en s'appuyant sur les régularités et la formation ; s'appuyer sur la dimension morphologique des mots pour les orthographier. Exemples de réussite : automatiser l'orthographe des mots fréquents du cycle 2 et de l'année ; hasardeux, hasarder, hasard ; laideur, laid ; progresser, progrès ; les métiers en -eur et -ice, comme agriculteur, agricultrice ; écrire les mots irréguliers les plus fréquents.",
    seances: [
      trois("La lettre muette", "trouver la lettre muette d'un mot par un mot de sa famille.",
        "« le hasar… » : quelle lettre finale ? Comment le savoir sans dictionnaire ?",
        "Chercher un mot de la famille qui fait entendre la lettre muette — hasardeux, laideur, progresser — ; classer les mots selon leur lettre finale ; les écrire.",
        "Ce qu'on retient : un mot de la famille révèle souvent la lettre muette."),
      trois("Les noms de métiers", "écrire le féminin des noms de métiers.",
        "un agriculteur, une agricult… ?",
        "Former le féminin des noms de métiers ; classer les mots en -trice et en -euse ; chercher les exceptions dans le dictionnaire.",
        "Ce qu'on retient : -teur, -trice ; -eur, -euse ; je vérifie quand j'hésite."),
      rituel("Les mots invariables (chaque semaine)", "écrire sans erreur les mots invariables appris.", 20,
        "Apprendre une liste de mots invariables ; une dictée de mots, puis de phrases ; réviser les mots des listes précédentes."),
      entrainement("La dictée préparée", "préparer une dictée et la corriger avec ses outils.",
        `Préparer une dictée : repérer les mots difficiles, les expliquer par leur formation ou les mémoriser ; l'écrire sous la dictée ; la corriger avec ses outils${cm2 ? " et expliquer chaque correction" : ""}.`,
        "Ce qu'on retient : je m'appuie sur la formation des mots, puis sur ma mémoire."),
      evaluation("écrire les mots étudiés, en s'appuyant sur leur formation", "Ensuite, chaque semaine, une dictée et une liste de mots."),
    ],
  };
};

export const DEMARCHES_VOCABULAIRE_CM: Demarche[] = [
  enrichir("CM1"), relations("CM1"), reemployer("CM1"), orthographeDesMots("CM1"),
  enrichir("CM2"), relations("CM2"), reemployer("CM2"), orthographeDesMots("CM2"),
];

/** La séquence d'une compétence de vocabulaire ou d'orthographe des mots du cours moyen ; en minuscules sans accents. */
export function demarcheDuVocabulaireCM(classe: string, cg: string): string | null {
  if (classe !== "cm1" && classe !== "cm2") return null;
  if (/enrichir son vocabulaire/.test(cg)) return `enrichir-vocabulaire-${classe}`;
  if (/relations entre les mots/.test(cg)) return `relations-mots-${classe}`;
  if (/reemployer/.test(cg)) return `reemployer-${classe}`;
  if (/orthographe des mots/.test(cg)) return `orthographe-mots-${classe}`;
  return null;
}

// ── Les feuilles ──────────────────────────────────────────────────────────

const vc = (seance: number, titre: string, classe: "CM1" | "CM2", exercice: ExerciceVocabulaireCM): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_VOCABULAIRE_CM, classe, exercice };
  const atelier = ["lettres-muettes", "feminins", "invariables"].includes(exercice) ? "orthographe" : "etiquettes";
  return { seance, atelier, titre, fabriquer: (g) => ({ html: htmlVocabulaireCM(reglages, g), style: STYLE_FEUILLE + STYLE_VOCABULAIRE_CM }) };
};

const PLANS: Record<string, { feuilles: FeuilleAFabriquer[]; materiel: string[] }> = {
  "enrichir-vocabulaire-cm1": {
    feuilles: [vc(0, "Le mot inconnu", "CM1", "mots-inconnus"), vc(1, "Le dictionnaire", "CM1", "dictionnaire"), vc(3, "Le mot inconnu — évaluation", "CM1", "mots-inconnus")],
    materiel: ["Des phrases avec un mot inconnu, au tableau ; des dictionnaires", "Des dictionnaires", "Le répertoire de mots de chacun ; des jeux de mots", "Les feuilles d'évaluation ; des dictionnaires"],
  },
  "enrichir-vocabulaire-cm2": {
    feuilles: [vc(0, "Le mot inconnu", "CM2", "mots-inconnus"), vc(1, "Le dictionnaire", "CM2", "dictionnaire"), vc(4, "Le mot inconnu — évaluation", "CM2", "mots-inconnus")],
    materiel: ["Des phrases des leçons d'histoire, de géographie et de sciences ; des dictionnaires", "Des dictionnaires", "Les mots nouveaux des leçons de la semaine", "Le répertoire de mots de chacun", "Les feuilles d'évaluation ; des dictionnaires"],
  },
  "relations-mots-cm1": {
    feuilles: [vc(0, "La formation des mots", "CM1", "formation"), vc(1, "Les familles de mots", "CM1", "familles"), vc(2, "Synonymes et antonymes", "CM1", "synonymes"), vc(3, "La formation des mots — évaluation", "CM1", "formation")],
    materiel: ["Des étiquettes de préfixes, de radicaux, de suffixes", "Des dictionnaires", "Des phrases au tableau ; des dictionnaires des synonymes", "Les feuilles d'évaluation"],
  },
  "relations-mots-cm2": {
    feuilles: [vc(0, "Un mot, plusieurs sens", "CM2", "polysemie"), vc(1, "La formation des mots", "CM2", "formation"), vc(2, "Synonymes et antonymes", "CM2", "synonymes"), vc(3, "Un mot, plusieurs sens — évaluation", "CM2", "polysemie")],
    materiel: ["Des phrases au tableau", "Des mots savants au tableau ; des dictionnaires", "Des phrases ; des dictionnaires des synonymes", "Les feuilles d'évaluation"],
  },
  "reemployer-cm1": {
    feuilles: [vc(0, "La corolle d'un univers", "CM1", "corolle"), vc(1, "Synonymes et antonymes", "CM1", "synonymes"), vc(2, "Un mot, plusieurs sens", "CM1", "polysemie")],
    materiel: ["Le livre lu en classe ; une grande corolle affichée", "Un texte à améliorer ; la corolle", "Des phrases de géométrie, de grammaire, de mathématiques", "Les cartes des mots et de leurs définitions"],
  },
  "reemployer-cm2": {
    feuilles: [vc(0, "La corolle d'un univers", "CM2", "corolle"), vc(1, "Synonymes et antonymes", "CM2", "synonymes"), vc(2, "Un mot, plusieurs sens", "CM2", "polysemie")],
    materiel: ["Les leçons d'histoire et de sciences ; une grande corolle affichée", "Un texte à améliorer ; la corolle", "Des phrases de plusieurs disciplines", "Les cartes des mots et de leurs définitions"],
  },
  "orthographe-mots-cm1": {
    feuilles: [vc(0, "La lettre muette", "CM1", "lettres-muettes"), vc(1, "Les noms de métiers", "CM1", "feminins"), vc(2, "Les mots invariables", "CM1", "invariables"), vc(4, "La lettre muette — évaluation", "CM1", "lettres-muettes")],
    materiel: ["Des mots au tableau, la lettre finale cachée", "Des images de métiers ; des dictionnaires", "La liste de mots de la semaine", "Le texte de la dictée ; les outils de la classe", "Les feuilles d'évaluation"],
  },
  "orthographe-mots-cm2": {
    feuilles: [vc(0, "La lettre muette", "CM2", "lettres-muettes"), vc(1, "Les noms de métiers", "CM2", "feminins"), vc(2, "Les mots invariables", "CM2", "invariables"), vc(4, "La lettre muette — évaluation", "CM2", "lettres-muettes")],
    materiel: ["Des mots au tableau, la lettre finale cachée", "Des images de métiers ; des dictionnaires", "La liste de mots de la semaine", "Le texte de la dictée ; les outils de la classe", "Les feuilles d'évaluation"],
  },
};

export const estUneDemarcheDuVocabulaireCM = (id: string) => id in PLANS;

export function planDuVocabulaireCM(demarcheId: string, _ctx?: ContexteFeuilles): PlanDesFeuilles | null {
  const p = PLANS[demarcheId];
  if (!p) return null;
  const materiel = p.materiel.map((debut, s) => {
    const f = p.feuilles.filter((x) => x.seance === s).map((x) => `« ${x.titre} »`);
    return f.length ? `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${f.join(" et ")}.` : `${debut}.`;
  });
  return { feuilles: p.feuilles, materiel };
}
