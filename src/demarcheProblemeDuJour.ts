// La démarche du problème du jour, en maternelle : une semaine, une séance
// reprise chaque jour.
//
// Les livrets d'accompagnement de 2025 font chercher la même sorte de
// problème pendant une période, en quelques minutes : la situation de
// référence avec les objets eux-mêmes, puis leurs images, puis des objets
// qui les représentent, puis sans rien manipuler ; le guide « La
// construction du nombre à l'école maternelle » (2023) en fait une activité
// ritualisée, et la transpose dans d'autres contextes. Chaque séance est
// celle d'une semaine : le même déroulement, chaque jour, avec le problème
// du jour (voir problemeDuJour.ts).

import type { Demarche, PhaseCadre } from "./demarches";

const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre =>
  ({ phase, duree, description, posture });

/** Le déroulement de chaque jour : la situation, le problème, la recherche, la vérification — dix minutes. */
const jour = (rappel: string, chercher: string, verifier: string): PhaseCadre[] => [
  ph("La situation", "2 min", rappel, "Met en scène, montre le matériel de la semaine ; ne montre pas ce qui est caché."),
  ph("Le problème du jour", "2 min", "L'énoncé lu deux fois, lentement ; un élève le redit avec ses mots, puis dit ce qu'on cherche.",
    "Fait reformuler sans donner la réponse : « Qu'est-ce qui se passe ? Qu'est-ce qu'on cherche ? »"),
  ph("Chercher", "4 min", chercher, "Observe les procédures, questionne : « Comment le sais-tu ? » ; laisse le temps de chercher avant qu'on dise."),
  ph("Vérifier", "2 min", verifier, "Met en évidence deux façons de trouver ; la réponse se dit en phrase."),
];

export const DEMARCHE_PROBLEME_DU_JOUR: Demarche = {
  id: "probleme-du-jour-maternelle",
  nom: "Le problème du jour : une sorte de problème pour une période",
  famille: "Maternelle",
  source: "Programme de l'école maternelle (2025), « Utiliser les nombres pour résoudre des problèmes » ; livrets d'accompagnement « Avant 4 ans », « À partir de 4 ans » et « À partir de 5 ans » (2025), Acquisition des premiers outils mathématiques ; La construction du nombre à l'école maternelle (guide fondamental, 2023)",
  resume: "La même sorte de problème — ajouter, enlever, avancer sur une piste, faire des groupes, partager — pendant une période, dix minutes chaque jour, dans une situation de référence : avec les objets, puis leurs images, puis des jetons, puis sans manipuler — on cherche, on dit, puis on vérifie —, enfin dans d'autres situations. Les nombres grandissent dans les limites de l'âge.",
  seances: [
    {
      titre: "Avec les objets de la situation",
      objectifs: "À la fin de cette séance, les élèves sauront dire ce qui se passe dans la situation de référence — on ajoute, on enlève, on avance, on distribue — et trouver la réponse du problème en le jouant avec les vrais objets.",
      duree: 10,
      phases: jour(
        "La situation de référence jouée avec les vrais objets : la valise et ses peluches, l'enclos et ses chevaux, les jongleurs et leurs balles.",
        "On cherche en jouant la situation : on montre sur ses doigts, on fait avec les objets de la réserve ; chacun dit sa réponse.",
        "On ouvre, on compte, on vérifie avec les objets ; la réponse dite en phrase : « Il y a trois peluches dans la valise. »",
      ),
    },
    {
      titre: "Avec des images",
      objectifs: "À la fin de cette séance, les élèves sauront résoudre le problème du jour quand des images remplacent les objets de la situation.",
      duree: 10,
      phases: jour(
        "La même situation, mais avec des images à la place des objets : on les cache de la même façon.",
        "On cherche avec les images, ses doigts ou un dessin ; chacun dit sa réponse avant qu'on vérifie.",
        "On vérifie avec les images ; on compare les façons de faire.",
      ),
    },
    {
      titre: "Avec des jetons",
      objectifs: "À la fin de cette séance, les élèves sauront représenter les objets du problème par des jetons ou des cubes pour trouver la réponse.",
      duree: 10,
      phases: jour(
        "Des jetons ou des cubes représentent les objets ; on rappelle ce que chacun représente.",
        "On cherche avec les jetons ; ceux qui le peuvent cherchent d'abord sans eux.",
        "On vérifie avec les jetons, puis avec les vrais objets quand on doute.",
      ),
    },
    {
      titre: "Sans manipuler, puis on vérifie",
      objectifs: "À la fin de cette séance, les élèves sauront trouver la réponse du problème sans manipuler — avec leurs doigts, un dessin, ou dans leur tête — puis la vérifier avec le matériel.",
      duree: 10,
      phases: jour(
        "La situation rappelée sans le matériel : il reste à portée de main, pour vérifier après.",
        "On cherche sans manipuler : ses doigts, un dessin sur la feuille de recherche, ou dans sa tête ; chacun dit sa réponse.",
        "On vérifie avec le matériel ; on compare la réponse dite et la réponse trouvée.",
      ),
    },
    {
      titre: "Dans d'autres situations",
      objectifs: "À la fin de cette séance, les élèves sauront reconnaître la même sorte de problème dans une autre situation et la résoudre ; chacun est observé avec la grille.",
      duree: 10,
      phases: jour(
        "Une autre situation, pour la même sorte de problème : les oiseaux sur la branche, le jeu de la boîte, la grenouille et ses sauts.",
        "On cherche comme on a appris, avec le matériel ou sans ; le maître observe chacun avec la grille.",
        "On vérifie, et l'on dit ce qui ressemble au problème des semaines passées.",
      ),
    },
  ],
};
