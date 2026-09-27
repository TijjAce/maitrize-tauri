// Les démarches d'enseignement : le cadre qu'une séquence reçoit à sa création.
//
// Une séquence neuve est une page blanche, et la page blanche fait perdre le
// fil : on écrit la séance 1 en détail, la séance 4 en deux lignes, et
// l'évaluation n'est jamais prévue. Les guides le disent autrement — « la
// démarche d'enseignement se compose de quatre temps pour aider l'élève à
// passer de découvertes fortuites à des apprentissages structurés et
// transférables » — mais c'est la même idée : la structure d'abord, le
// contenu ensuite.
//
// Chaque démarche ci-dessous est reprise d'un guide publié, avec ses
// formulations. On ne les réécrit pas : c'est ce qu'un inspecteur ou un
// collègue reconnaîtra. Les phases deviennent les lignes du tableau de
// déroulement de chaque séance ; les descriptions sont des consignes-cadres,
// à compléter, jamais un contenu inventé pour l'enseignant.
//
// Sources :
// - Livrets d'accompagnement de programme, Éduscol 2025 (mathématiques CP)
//   et 2026 (français CE1) : « Temps 1 – Définition des objectifs et mise en
//   réussite ; Temps 2 – Mise en activité des élèves ; Temps 3 –
//   Institutionnalisation, retour réflexif ; Temps 4 – Automatisation,
//   réinvestissement, transfert. »
// - Éduscol, EPS cycle 2, « Concevoir un module d'apprentissage » : découverte,
//   apprentissage-entraînement, évaluation ; « au cycle 2, on peut recommander
//   des modules de 6 à 12 séances ».
// - L'enseignement explicite (Gauthier, Bissonnette ; DGESCO « Enseigner plus
//   explicitement ») : modelage, pratique guidée, pratique autonome, avec un
//   objectif annoncé au départ et une objectivation à la fin.

import { newId, type Seance } from "./api";

/** Une ligne du tableau de déroulement, dans l'ordre de ses colonnes. */
export interface PhaseCadre {
  phase: string;
  duree: string;
  description: string;
  posture: string;
}

/** Une séance telle que la démarche la prévoit, avant qu'on l'écrive. */
export interface SeanceCadre {
  titre: string;
  /** Ce que la séance doit obtenir, dans les mots du guide. */
  objectifs: string;
  duree: number;
  phases: PhaseCadre[];
}

export interface Demarche {
  id: string;
  nom: string;
  /** Le guide dont elle vient, pour le dire à l'écran. */
  source: string;
  /** Ce qu'elle fait, en une phrase. */
  resume: string;
  seances: SeanceCadre[];
}

/** Les colonnes du tableau de déroulement, celles que l'éditeur propose déjà. */
export const ENTETE_TABLEAU = ["Phase", "Durée", "Description", "Posture de l'enseignant"] as const;

// ── Les quatre temps des livrets Éduscol ──────────────────────────────────

const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const T4 = "Temps 4 – Automatisation, réinvestissement, transfert";

const quatreTemps = (
  t1: string, t2: string, t3: string, t4: string, durees: [string, string, string, string],
): PhaseCadre[] => [
  { phase: T1, duree: durees[0], description: t1,
    posture: "Annonce l'objectif et le critère de réussite. Fait réussir avant de faire chercher." },
  { phase: T2, duree: durees[1], description: t2,
    posture: "Observe, guide si besoin, différencie : matériel de manipulation à disposition." },
  { phase: T3, duree: durees[2], description: t3,
    posture: "Fait verbaliser, écrit la trace avec les élèves. Traite l'erreur comme un appui." },
  { phase: T4, duree: durees[3], description: t4,
    posture: "Fait répéter en variant les supports. Reprend la procédure avec ceux qui hésitent." },
];

const EDUSCOL_QUATRE_TEMPS: Demarche = {
  id: "eduscol-quatre-temps",
  nom: "Démarche en quatre temps",
  source: "Livrets d'accompagnement de programme, Éduscol 2025-2026",
  resume: "Découverte et trace écrite, entraînement différencié, évaluation courte, réinvestissement — les quatre temps dans chaque séance.",
  seances: [
    {
      titre: "Découverte et institutionnalisation",
      objectifs: "Objectif : … (à écrire tel qu'il sera annoncé aux élèves).\nCritère de réussite : l'élève …",
      duree: 45,
      phases: quatreTemps(
        "Très courte recherche individuelle (3 minutes) sur ardoise : …\nPuis enseignement de la procédure : un élève en réussite montre, l'enseignant verbalise.",
        "Même tâche sur un nouveau cas : …\nLes élèves font seuls ; l'enseignant guide ceux qui en ont besoin.",
        "Ce qu'on retient, dit par les élèves puis écrit : …\nTrace écrite courte, avec l'exemple travaillé.",
        "Deux ou trois cas de plus, supports variés, pour fixer le geste.",
        ["10 min", "15 min", "10 min", "10 min"],
      ),
    },
    {
      titre: "Entraînement différencié",
      objectifs: "Effectuer seul plusieurs cas de plus en plus variés. Matériel de manipulation à disposition de qui en a besoin.",
      duree: 30,
      phases: quatreTemps(
        "Rappel de la trace écrite par les élèves ; un cas résolu ensemble.",
        "Série de cas à faire seul : …\nGroupes selon la maîtrise : avec matériel, sans matériel, cas plus grands.",
        "Retour sur deux erreurs vues dans la classe : ce qu'elles apprennent.",
        "Un cas « pour voir » sur un support nouveau.",
        ["5 min", "15 min", "5 min", "5 min"],
      ),
    },
    {
      titre: "Entraînement — autonomie",
      objectifs: "Les élèves, progressivement selon leur maîtrise, effectuent plusieurs cas de manière autonome.",
      duree: 30,
      phases: quatreTemps(
        "Rappel de l'objectif ; annonce de l'évaluation à venir.",
        "Série autonome : …\nL'enseignant travaille avec le groupe qui hésite encore.",
        "Retour réflexif : « comment as-tu fait ? » — les procédures se disent.",
        "Réinvestissement dans un problème ou une situation de classe.",
        ["5 min", "15 min", "5 min", "5 min"],
      ),
    },
    {
      titre: "Évaluation courte",
      objectifs: "Évaluation courte et fréquente : identifier réussites, progrès et besoins. Les élèves savent qu'ils peuvent répondre directement pour ce qu'ils trouvent facile.",
      duree: 20,
      phases: [
        { phase: T1, duree: "5 min", description: "Ce qui est attendu, dit clairement. Un exemple fait ensemble.",
          posture: "Rassure : on montre ce qu'on sait faire." },
        { phase: "Évaluation", duree: "10 min", description: "Fiche de … cas, en temps limité : …",
          posture: "Observe qui fait quoi, note les procédures." },
        { phase: T3, duree: "5 min", description: "Retour immédiat : ce qui est réussi, mis en valeur ; ce qui reste à travailler.",
          posture: "Évaluation positive : affiche les progrès d'un entraînement à l'autre." },
      ],
    },
    {
      titre: "Réinvestissement (séance courte)",
      objectifs: "Séance courte, tout au long de l'année : la procédure réinvestie dans d'autres situations, rituels compris.",
      duree: 15,
      phases: [
        { phase: T4, duree: "15 min", description: "Rituel ou situation nouvelle où la procédure sert : …",
          posture: "Fait le lien avec la trace écrite ; reprend avec ceux qui l'ont perdue." },
      ],
    },
  ],
};

// ── Le module d'apprentissage (Éduscol, EPS cycle 2) ──────────────────────

const EPS_MODULE: Demarche = {
  id: "eps-module",
  nom: "Module d'apprentissage",
  source: "Éduscol, EPS cycle 2 — « Concevoir un module d'apprentissage »",
  resume: "Découverte, apprentissage-entraînement, évaluation : de six à douze séances, l'évaluation conçue dès le départ.",
  seances: [
    {
      titre: "Découverte",
      objectifs: "Mettre les élèves « en mouvement », leur permettre de prendre des repères, de construire du sens par une première expérience authentique.",
      duree: 45,
      phases: [
        { phase: "Mise en train", duree: "10 min", description: "Entrée dans l'activité : …", posture: "Installe un cadre apaisé et des repères." },
        { phase: "Situation de découverte", duree: "25 min", description: "Première expérience de l'activité, telle qu'elle est : …", posture: "Observe ce que les élèves savent déjà faire — c'est l'évaluation diagnostique." },
        { phase: "Bilan", duree: "10 min", description: "Ce qu'on a compris de l'activité, ce qu'il faudra apprendre.", posture: "Fait dire, sans corriger encore." },
      ],
    },
    {
      titre: "Apprentissage — situation complexe",
      objectifs: "La situation porteuse des enjeux de formation du module, dans son entier.",
      duree: 45,
      phases: [
        { phase: "Mise en train", duree: "10 min", description: "…", posture: "" },
        { phase: "Situation complexe", duree: "25 min", description: "La situation de référence du module : …", posture: "Relève les difficultés qui reviennent : elles font la séance suivante." },
        { phase: "Bilan", duree: "10 min", description: "Ce qui a marché, ce qui bloque.", posture: "" },
      ],
    },
    {
      titre: "Apprentissage — situations ciblées",
      objectifs: "Des situations ciblées visant à consolider des acquis ou à remédier aux difficultés constatées.",
      duree: 45,
      phases: [
        { phase: "Mise en train", duree: "10 min", description: "…", posture: "" },
        { phase: "Situations ciblées", duree: "25 min", description: "Ateliers sur les difficultés relevées : …", posture: "Différencie : chacun travaille ce qui lui manque." },
        { phase: "Retour à la situation complexe", duree: "10 min", description: "On rejoue la situation de référence : ce qui a changé.", posture: "" },
      ],
    },
    {
      titre: "Apprentissage — situation complexe",
      objectifs: "Retour à la situation de référence : mesurer les progrès.",
      duree: 45,
      phases: [
        { phase: "Mise en train", duree: "10 min", description: "…", posture: "" },
        { phase: "Situation complexe", duree: "25 min", description: "…", posture: "" },
        { phase: "Bilan", duree: "10 min", description: "…", posture: "" },
      ],
    },
    {
      titre: "Apprentissage — situations ciblées",
      objectifs: "Consolider ce qui reste fragile avant l'évaluation.",
      duree: 45,
      phases: [
        { phase: "Mise en train", duree: "10 min", description: "…", posture: "" },
        { phase: "Situations ciblées", duree: "25 min", description: "…", posture: "" },
        { phase: "Bilan", duree: "10 min", description: "…", posture: "" },
      ],
    },
    {
      titre: "Évaluation — bilan des savoirs",
      objectifs: "Bilan des savoirs construits par les élèves. La situation d'évaluation est attentive à deux choses : la part d'inédit par rapport aux entraînements, et l'accessibilité pour toutes et tous.",
      duree: 45,
      phases: [
        { phase: "Mise en train", duree: "10 min", description: "…", posture: "" },
        { phase: "Situation d'évaluation", duree: "25 min", description: "Situation proche de la situation complexe, avec une part d'inédit : …", posture: "Observe avec la grille prévue dès le début du module." },
        { phase: "Bilan du module", duree: "10 min", description: "Ce que chacun sait faire maintenant, dit par lui.", posture: "" },
      ],
    },
  ],
};

// ── L'enseignement explicite ──────────────────────────────────────────────

const explicite = (
  ouverture: string, modelage: string, guidee: string, autonome: string, cloture: string,
  durees: [string, string, string, string, string],
): PhaseCadre[] => [
  { phase: "Ouverture — objectif et rappel", duree: durees[0], description: ouverture,
    posture: "Dit ce qu'on va apprendre et à quoi ça sert. Réactive ce qu'il faut savoir avant." },
  { phase: "Modelage — « je fais »", duree: durees[1], description: modelage,
    posture: "Met un haut-parleur sur sa pensée : quoi faire, où, quand, pourquoi, comment." },
  { phase: "Pratique guidée — « nous faisons »", duree: durees[2], description: guidee,
    posture: "Fait faire avec lui, questionne, corrige aussitôt. Ne lâche que si ça tient." },
  { phase: "Pratique autonome — « vous faites »", duree: durees[3], description: autonome,
    posture: "Observe. Reprend en petit groupe ceux qui n'y arrivent pas seuls." },
  { phase: "Clôture — objectivation", duree: durees[4], description: cloture,
    posture: "Fait redire ce qu'on a appris, et quand on s'en resservira." },
];

const ENSEIGNEMENT_EXPLICITE: Demarche = {
  id: "explicite",
  nom: "Enseignement explicite",
  source: "Gauthier & Bissonnette ; DGESCO, « Enseigner plus explicitement »",
  resume: "Modelage, pratique guidée, pratique autonome — par petits pas, avec de la répétition et des révisions fréquentes.",
  seances: [
    {
      titre: "Modelage et pratique guidée",
      objectifs: "À la fin de la séance, l'élève sait … Il l'a vu faire, puis fait avec l'enseignant.",
      duree: 45,
      phases: explicite(
        "Objectif annoncé : …\nRappel de ce qu'il faut savoir : …",
        "L'enseignant fait devant les élèves, en disant tout haut ce qu'il pense : …",
        "Même tâche, ensemble : les élèves proposent, l'enseignant valide pas à pas.",
        "Un cas seul, court : …",
        "Qu'a-t-on appris ? À quoi le reconnaît-on ?",
        ["5 min", "12 min", "15 min", "8 min", "5 min"],
      ),
    },
    {
      titre: "Pratique guidée puis autonome",
      objectifs: "Répéter la procédure sur des cas proches, en réduisant l'aide.",
      duree: 45,
      phases: explicite(
        "Rappel de la séance précédente par les élèves.",
        "Un exemple refait rapidement, pour montrer le geste juste.",
        "Cas travaillés à deux, puis corrigés ensemble.",
        "Série de cas seul : …",
        "Ce qui est acquis, ce qui reste difficile.",
        ["5 min", "5 min", "15 min", "15 min", "5 min"],
      ),
    },
    {
      titre: "Pratique autonome et petits pas",
      objectifs: "Un pas de plus vers le complexe, sans surcharge : une seule nouveauté.",
      duree: 45,
      phases: explicite(
        "Ce qu'on sait déjà faire ; ce qu'on ajoute aujourd'hui : …",
        "Modelage de la seule nouveauté.",
        "Cas mêlant l'ancien et le nouveau, ensemble.",
        "Série seul : …",
        "Redire la procédure complète.",
        ["5 min", "8 min", "12 min", "15 min", "5 min"],
      ),
    },
    {
      titre: "Révision et évaluation",
      objectifs: "Révision fréquente pour la mémoire à long terme, puis évaluation de ce qui a été enseigné explicitement.",
      duree: 30,
      phases: [
        { phase: "Révision", duree: "10 min", description: "Reprise rapide des cas des séances précédentes.", posture: "Valorise les efforts et les stratégies : R = E × S." },
        { phase: "Évaluation", duree: "15 min", description: "Cas proches de ceux travaillés : …", posture: "Observe les stratégies, pas seulement les réponses." },
        { phase: "Clôture — objectivation", duree: "5 min", description: "Où en est-on ? Ce qu'on reverra.", posture: "" },
      ],
    },
  ],
};

export const DEMARCHES: Demarche[] = [EDUSCOL_QUATRE_TEMPS, EPS_MODULE, ENSEIGNEMENT_EXPLICITE];

export const demarcheDe = (id: string) => DEMARCHES.find((d) => d.id === id);

/**
 * La démarche à proposer d'après la compétence visée.
 *
 * Les quatre temps des livrets valent pour presque tout ; l'EPS a son
 * propre guide et ses propres mots — « module », « situation complexe »,
 * « bilan » —, on ne lui propose pas une trace écrite. L'enseignement
 * explicite reste au choix : on le prend quand on le veut, pas quand la
 * compétence le dicte.
 */
export function demarcheSuggeree(domaineTitre: string, referentielNom = ""): Demarche {
  const texte = `${domaineTitre} ${referentielNom}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/\beps\b|physique et sportive|activite(s)? physique/.test(texte)) return demarcheDe("eps-module") ?? DEMARCHES[0];
  return demarcheDe("eduscol-quatre-temps") ?? DEMARCHES[0];
}

/** Le tableau de déroulement d'une séance : l'en-tête, puis une ligne par phase. */
export function tableauDesPhases(phases: PhaseCadre[]): string[][] {
  return [
    [...ENTETE_TABLEAU],
    ...phases.map((p) => [p.phase, p.duree, p.description, p.posture]),
  ];
}

/**
 * Les séances que le cadre pose sur une séquence.
 *
 * Numérotées à la suite de ce qui existe déjà : poser un cadre sur une
 * séquence qui a une séance ne la renumérote pas. Le déroulement libre reste
 * vide — c'est le tableau qui porte la structure, et le texte reste à
 * l'enseignant.
 */
export function seancesDuCadre(demarche: Demarche, sequenceId: string, depuis = 1): Seance[] {
  return demarche.seances.map((s, i) => ({
    id: newId(),
    titre: s.titre,
    numero: depuis + i,
    objectifs: s.objectifs,
    competences: "[]",
    deroulement: "",
    materiel: "",
    duree: s.duree,
    date: null,
    tableauDeroulement: JSON.stringify(tableauDesPhases(s.phases)),
    imagesDeroulement: "[]",
    bilan: "",
    bilanDate: null,
    sequenceId,
  }));
}

/** Ce que la fiche annonce avant de poser le cadre : « 5 séances, 2 h 20 ». */
export function resumeDuCadre(demarche: Demarche): string {
  const n = demarche.seances.length;
  const total = demarche.seances.reduce((acc, s) => acc + s.duree, 0);
  const h = Math.floor(total / 60);
  const min = total % 60;
  const duree = h ? `${h} h${min ? ` ${String(min).padStart(2, "0")}` : ""}` : `${min} min`;
  return `${n} séance${n > 1 ? "s" : ""}, ${duree} au total`;
}
