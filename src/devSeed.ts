// Données factices pour tester rapidement : séquences + séances + une
// programmation cohérentes (cycle 1 / cycle 2). Déclenché depuis Réglages.
import {
  api, Sequence, ProgrammationFinale,
  nouvelleSequence, nouvelleSeance, newId, anneeScolaireActuelle, couleurPourMatiere,
} from "./api";

interface Ligne {
  id: string; estDomaine: boolean; label: string; couleur?: string;
  p1: string; p2: string; p3: string; p4: string; p5: string;
  seqs?: Record<string, string[]>; periodesFaites?: number[];
}

interface SeqDef {
  titre: string; matiere: string; cycle: string; periode: number; objectifs: string;
  seances: { titre: string; objectifs: string; deroulement: string; materiel: string; duree: number }[];
}

const DONNEES: SeqDef[] = [
  {
    titre: "Le verbe et son sujet", matiere: "Français", cycle: "Cycle 2", periode: 1,
    objectifs: "Identifier le verbe conjugué et son sujet dans une phrase simple.",
    seances: [
      { titre: "Qu'est-ce qu'un verbe ?", objectifs: "Repérer le verbe (mot de l'action).", deroulement: "1. Rituel : phrases au tableau, on entoure les actions.\n2. Tri d'étiquettes verbes / non-verbes.\n3. Trace écrite collective.", materiel: "Étiquettes-mots, affiche", duree: 45 },
      { titre: "Trouver le sujet", objectifs: "Poser la question « Qui est-ce qui… ? ».", deroulement: "1. Rappel de la séance précédente.\n2. Manipulation sur des phrases.\n3. Exercices d'application.", materiel: "Fiche d'exercices", duree: 45 },
      { titre: "Évaluation", objectifs: "Identifier verbe et sujet en autonomie.", deroulement: "Évaluation écrite individuelle.", materiel: "Fiche d'évaluation", duree: 30 },
    ],
  },
  {
    titre: "Numération jusqu'à 100", matiere: "Mathématiques", cycle: "Cycle 2", periode: 2,
    objectifs: "Lire, écrire, comparer et ranger les nombres jusqu'à 100.",
    seances: [
      { titre: "Dizaines et unités", objectifs: "Décomposer un nombre en dizaines/unités.", deroulement: "1. Manipulation matériel base 10.\n2. Jeu du banquier.\n3. Trace écrite.", materiel: "Matériel base 10", duree: 45 },
      { titre: "Comparer et ranger", objectifs: "Utiliser <, >, = et ranger des nombres.", deroulement: "1. Bataille de cartes.\n2. Rangement croissant / décroissant.", materiel: "Cartes nombres", duree: 45 },
      { titre: "La file numérique", objectifs: "Situer un nombre, intercaler.", deroulement: "1. Bande numérique géante.\n2. Exercices d'intercalation.", materiel: "Bande numérique", duree: 40 },
    ],
  },
  {
    titre: "Les besoins des animaux", matiere: "Questionner le monde", cycle: "Cycle 2", periode: 3,
    objectifs: "Identifier les besoins vitaux des animaux et leur régime alimentaire.",
    seances: [
      { titre: "Que mangent les animaux ?", objectifs: "Classer : carnivore / herbivore / omnivore.", deroulement: "1. Observation d'images.\n2. Tri collectif.\n3. Affiche bilan.", materiel: "Images d'animaux", duree: 45 },
      { titre: "Où vivent-ils ?", objectifs: "Associer animal et milieu de vie.", deroulement: "1. Jeu d'association.\n2. Trace écrite.", materiel: "Cartes milieux", duree: 40 },
    ],
  },
  {
    titre: "Le loup qui voulait changer de couleur", matiere: "Mobiliser le langage", cycle: "Cycle 1", periode: 1,
    objectifs: "Comprendre une histoire lue, nommer les couleurs et les jours de la semaine.",
    seances: [
      { titre: "Découverte de l'album", objectifs: "Émettre des hypothèses, écouter l'histoire.", deroulement: "1. Lecture offerte.\n2. Échange oral sur l'histoire.", materiel: "Album, marottes", duree: 30 },
      { titre: "Les couleurs du loup", objectifs: "Nommer et associer les couleurs.", deroulement: "1. Rappel de l'histoire.\n2. Atelier tri de couleurs.", materiel: "Loup en couleurs, gommettes", duree: 30 },
      { titre: "Les jours de la semaine", objectifs: "Remettre les jours dans l'ordre.", deroulement: "1. Comptine des jours.\n2. Remise en ordre des étiquettes.", materiel: "Étiquettes jours", duree: 25 },
    ],
  },
];

/** Crée séquences + séances + une programmation de démonstration. Renvoie un résumé. */
export async function genererDonneesTest(anneeChoisie?: string): Promise<string> {
  // Année explicitement choisie, sinon celle sélectionnée dans Organisation, sinon l'année en cours.
  const annee = anneeChoisie || (await api.settingGet("anneeCourante")) || anneeScolaireActuelle();
  const idsParMatiere: Record<string, string[]> = {};

  for (const def of DONNEES) {
    const seq: Sequence = {
      ...nouvelleSequence(),
      titre: def.titre, matiere: def.matiere, cycle: def.cycle, periode: def.periode,
      annee, objectifs: def.objectifs, couleur: couleurPourMatiere(def.matiere),
      ratingEngagement: 1 + Math.floor(Math.random() * 5),
      ratingFacilite: 1 + Math.floor(Math.random() * 5),
    };
    const saved = await api.sequenceSave(seq);
    (idsParMatiere[def.matiere] ??= []).push(saved.id);
    let n = 1;
    for (const s of def.seances) {
      await api.seanceSave({
        ...nouvelleSeance(saved.id, n),
        titre: s.titre, objectifs: s.objectifs, deroulement: s.deroulement, materiel: s.materiel, duree: s.duree,
      });
      n++;
    }
  }

  // Programmation : seulement s'il n'y en a pas déjà une pour l'année (on n'écrase rien).
  let progMsg = "";
  const progs = await api.programmationsFinaleList();
  if (progs.some((p) => p.annee === annee && !p.estImportee)) {
    progMsg = " — programmation existante conservée";
  } else {
    const L = (estDomaine: boolean, label: string, vals: string[], couleur?: string, seqs?: Record<string, string[]>): Ligne => ({
      id: newId(), estDomaine, label, couleur,
      p1: vals[0] ?? "", p2: vals[1] ?? "", p3: vals[2] ?? "", p4: vals[3] ?? "", p5: vals[4] ?? "", seqs,
    });
    const lignes: Ligne[] = [
      L(true, "Français", [], "blue"),
      L(false, "Lecture / compréhension", ["Sons simples", "Sons complexes", "Compréhension d'albums", "Lecture de textes", "Lecture suivie"], "blue",
        idsParMatiere["Français"] ? { p1: idsParMatiere["Français"] } : undefined),
      L(false, "Grammaire", ["La phrase", "Le verbe et le sujet", "Le nom", "L'adjectif", "Révisions"], "blue"),
      L(true, "Mathématiques", [], "red"),
      L(false, "Numération", ["Nombres < 20", "Nombres jusqu'à 100", "Les centaines", "Nombres < 1000", "Révisions"], "red",
        idsParMatiere["Mathématiques"] ? { p2: idsParMatiere["Mathématiques"] } : undefined),
      L(false, "Géométrie / Grandeurs", ["Repérage", "Solides", "Figures planes", "Longueurs", "Masses"], "red"),
      L(true, "Questionner le monde", [], "green"),
      L(false, "Le vivant", ["Les saisons", "Le corps", "Les besoins des animaux", "Les végétaux", "Cycle de vie"], "green",
        idsParMatiere["Questionner le monde"] ? { p3: idsParMatiere["Questionner le monde"] } : undefined),
    ];
    const prog: ProgrammationFinale = {
      id: newId(), annee, lignesJson: JSON.stringify(lignes),
      niveau: "CE1", enseignant: "Données de démo", estImportee: false,
    };
    await api.programmationFinaleSave(prog);
  }

  const nbSeances = DONNEES.reduce((n, d) => n + d.seances.length, 0);
  return `${DONNEES.length} séquences, ${nbSeances} séances et une programmation (année ${annee}) créées${progMsg}.`;
}
