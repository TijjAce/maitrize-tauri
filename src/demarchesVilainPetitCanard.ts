// Le Vilain Petit Canard : une séquence de vocabulaire en moyenne et en
// grande section, d'après le guide « Pour enseigner le vocabulaire à l'école
// maternelle » (Éduscol, 2020), Focus « Un exemple de séquence en moyenne et
// grande sections à partir d'un conte traditionnel », p. 71-76.
//
// Le guide part de l'album d'Attilio Cassinelli (Gallimard Jeunesse, 2018)
// et de ses objectifs : en MS, comprendre et employer les mots des émotions
// et les verbes de la naissance des poussins ; en GS, les expressions
// synonymes de « marcher à la queue leu leu ». Ses quatre phases deviennent
// douze séances : l'univers de référence (les animaux et leurs familles, les
// documentaires, les saisons), la découverte de l'album, la structuration —
// où MS et GS se séparent —, puis raconter, réinvestir et observer. Les
// séances sont dites avec nos mots ; les modalités sont celles du guide :
// petits groupes pour parler et observer, collectif pour la lecture.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";

export type NiveauDuCanard = "MS" | "GS";

export const DEMARCHE_VPC: Record<NiveauDuCanard, string> = { MS: "vilain-petit-canard-ms", GS: "vilain-petit-canard-gs" };

const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;
const seance = (titre: string, objectif: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs: sauront(objectif), duree, phases });

const PETITS_GROUPES = "En petits groupes, pour que chacun parle : le professeur observe qui emploie quels mots.";

function seances(n: NiveauDuCanard): SeanceCadre[] {
  const gs = n === "GS";
  return [
    // ── Première phase : l'univers de référence ──
    seance("Phase 1 — Les animaux et leurs familles",
      gs ? "nommer les animaux de la ferme et de l'eau — le canard, la cane, le caneton ; le cygne et le cygneau ; le coq, la poule, le poussin ; le jars, l'oie, l'oison — et les rassembler par famille."
        : "nommer les animaux de la ferme et de l'eau — le canard, la cane, le caneton ; le cygne et le cygneau ; le coq, la poule, le poussin — et les rassembler par famille.",
      20, [
        ph("Rencontrer les animaux", "10 min", "Après une visite à la ferme ou au parc animalier, ou avec un imagier, des photos, un petit film documentaire : nommer chaque animal, le décrire, dire ce qu'il fait.",
          "Dit le mot précis — la cane, le caneton — et le fait redire dans une phrase."),
        ph("Les familles", "10 min", "Les cartes des animaux : rassembler le papa, la maman et le petit de chaque famille, et dire pourquoi ils vont ensemble.", PETITS_GROUPES),
      ]),
    seance("Phase 1 — Ranger les animaux par famille",
      "ranger chaque animal dans la maison de sa famille, avec des images puis des animaux miniatures, et dire le nom du petit de chaque famille.",
      20, [
        ph("Rappel", "5 min", "Les familles de la veille, nommées avec les cartes : le papa, la maman, le petit."),
        ph("S'entraîner", "10 min", "Les maisons des familles : chacun range ses images en disant « Le caneton va avec la cane et le canard », puis recommence avec des animaux miniatures.", PETITS_GROUPES),
        ph("Bilan", "5 min", "Ce qu'on sait dire maintenant ; les noms qui résistent reviennent dans les jeux."),
      ]),
    seance(gs ? "Phase 1 — Les textes documentaires et les saisons" : "Phase 1 — Les documentaires et les saisons",
      gs ? "trouver dans un texte documentaire où vit un animal, ce qu'il mange, comment s'appelle son petit et comment il naît, et nommer les quatre saisons et ce qu'on y voit."
        : "dire ce qu'on apprend d'un animal dans un documentaire, et nommer les quatre saisons et ce qu'on y voit.",
      20, [
        ph("Le documentaire", "10 min", gs
          ? "La fiche de chaque famille, lue aux élèves, images à l'appui. Ce qu'on a appris va dans le tableau — où elle vit, ce qu'elle mange, le nom du petit, la naissance —, avec ce qu'en disent les histoires connues."
          : "La fiche d'une famille, lue aux élèves, images à l'appui : où vivent ces animaux, ce qu'ils mangent, comment naissent les petits.",
          gs ? "En collectif, observation outillée : le professeur note les informations et qui les a trouvées." : PETITS_GROUPES),
        ph("Les saisons", "10 min", "Avec des albums documentaires ou des imagiers des saisons : nommer les saisons, ranger dans la boîte de chacune ce qu'on y voit — la neige, les fleurs, le soleil, les feuilles mortes."),
      ]),
    // ── Deuxième phase : découvrir l'album ──
    seance("Phase 2 — La couverture et la première lecture",
      "dire ce qu'ils ont retenu de l'histoire et ce qu'ils ont ressenti, après l'avoir écoutée sans voir les illustrations.",
      20, [
        ph("La couverture", "5 min", "La première de couverture : qui est-ce ? que va-t-il lui arriver ? Les hypothèses sont notées, pour écouter l'histoire en les ayant en tête."),
        ph("La lecture", "10 min", "L'histoire lue de façon expressive, sans montrer les illustrations : les élèves se concentrent sur le sens du texte.",
          "Lit avec une voix pour chaque personnage ; en collectif, dans le coin lecture."),
        ph("Ce qu'on a retenu", "5 min", "Chacun dit ce qu'il a retenu et ce qu'il a ressenti. Une deuxième lecture le même jour, d'autres les jours suivants."),
      ]),
    seance("Phase 2 — Les illustrations, raconter avec les marottes",
      "décrire une illustration de l'album et raconter un moment de l'histoire, sans accessoire ou avec les marottes des personnages.",
      20, [
        ph("Les illustrations", "10 min", "Découvrir les images de l'album, les observer, les commenter : qui est là, où, que fait-il, que ressent-il ?"),
        ph("Raconter", "10 min", "Le professeur raconte en reformulant, avec des mots que les élèves comprennent ; puis les élèves racontent une illustration, sans accessoire, avec les marottes ou un tablier à raconter.",
          "Change de voix pour chaque personnage ; reprend les mots de l'album et les fait redire."),
      ]),
    // ── Troisième phase : structurer ──
    ...(gs
      ? [
        seance("Phase 3 — Les synonymots : « à la queue leu leu »",
          "dire de plusieurs façons que la cane et ses petits marchent l'un derrière l'autre — à la queue leu leu, les uns derrière les autres, en file indienne, en faisant le petit train — et expliquer l'expression.",
          20, [
            ph("L'image de l'album", "5 min", "Décrire l'illustration où la cane marche avec ses petits."),
            ph("Les synonymots", "10 min", "La carte : une image, une phrase à compléter, des étiquettes qui s'échangent. Chaque étiquette se lit dans la phrase : la phrase garde son sens, ces mots disent la même chose.",
              "Explique l'expression : autrefois, le loup se disait « leu » ; les loups avancent l'un derrière l'autre, comme la cane et ses petits."),
            ph("Se mettre en file", "5 min", "Les élèves se placent à leur tour à la queue leu leu, et disent ce qu'ils font avec chaque expression.", PETITS_GROUPES),
          ]),
        seance("Phase 3 — D'autres synonymots : la coquille se brise",
          "trouver d'autres mots qui disent la même chose en questionnant le texte — la coquille se brise, se fendille, se fissure, se craquèle — et les employer dans une phrase.",
          20, [
            ph("Questionner le texte", "5 min", "Relire le moment où le dernier œuf se brise : comment le dire autrement ?"),
            ph("La carte", "10 min", "La carte des synonymots et ses étiquettes : chacun place l'étiquette de son choix, relit la phrase, vérifie qu'elle dit toujours la même chose.", PETITS_GROUPES),
            ph("Produire des phrases", "5 min", "Dire de nouvelles phrases avec chaque étiquette des deux cartes."),
          ]),
      ]
      : [
        seance("Phase 3 — Les émotions du petit canard",
          "nommer les émotions du petit canard — triste, fatigué, heureux —, dire pourquoi il les ressent, et ranger les mots de chaque émotion du plus faible au plus fort.",
          20, [
            ph("Les émotions dans l'histoire", "5 min", "Les pages où le petit canard est triste, fatigué, heureux : les mots qui le disent, et ce qui le laisse deviner sans le dire — il part, il se cache, il s'envole."),
            ph("Les causes", "5 min", "Pourquoi est-il triste ? On se moque de lui, on le trouve laid. Fatigué ? On l'a jeté dehors, les chiens l'ont effrayé, il a froid. Heureux ? Il s'envole, les cygnes l'accueillent."),
            ph("Les affiches", "10 min", "Une affiche par émotion, avec des photos : ranger les mots du plus faible au plus fort — peiné, triste, chagriné, malheureux ; fatigué, affaibli, épuisé, abattu ; content, joyeux, heureux, ravi.",
              PETITS_GROUPES),
          ]),
        seance("Phase 3 — La naissance du poussin",
          "remettre dans l'ordre les étapes de la naissance d'un poussin — être dans l'œuf, briser la coquille, sortir de la coquille, devenir grand — en disant les indices qui guident leur choix.",
          20, [
            ph("Les verbes de la naissance", "5 min", "Dans l'album, l'œuf se brise et le petit canard sort. Les verbes sont dits et mimés : briser, sortir, grandir."),
            ph("La frise", "10 min", "Les images de la naissance du poussin à remettre dans l'ordre, puis à coller ; dire ce qui vient avant, ce qui vient après.",
              "Fait dire les indices : « la coquille est entière, c'est avant »."),
            ph("Raconter la frise", "5 min", "La frise racontée avec les verbes et les mots du temps : d'abord, ensuite, puis, enfin."),
          ]),
      ]),
    seance("Phase 3 — Les lieux, les silhouettes, l'intrus",
      "nommer les lieux du voyage du petit canard — la vieille maison, le fleuve, la tanière, le lac —, reconnaître un animal à sa silhouette, et trouver l'animal qui n'est pas de l'histoire en disant pourquoi.",
      20, [
        ph("Les lieux", "10 min", "Trier les images de l'album, puis des photos de vrais lieux : où est le petit canard ? Les cartes des lieux, dans l'ordre du voyage."),
        ph("Les silhouettes", "5 min", "Reconnaître chaque animal à son ombre, en disant ce qui le montre : le long cou du cygne, les oreilles du chat."),
        ph("L'intrus", "5 min", "Dans chaque ligne, l'animal qui n'appartient pas à l'univers de l'histoire : le montrer, et dire pourquoi.", PETITS_GROUPES),
      ]),
    seance("Phase 3 — Les outils pour raconter",
      "deviner et inventer des devinettes avec les mots appris, raconter l'histoire dans l'ordre avec le plan du récit, et dire l'action que montre une image.",
      20, [
        ph("Les devinettes", "5 min", "Le professeur lit une devinette, les élèves montrent l'image ; puis ils inventent les leurs avec les mots de l'histoire."),
        ph("Le plan du récit", "10 min", "Les cinq moments de l'histoire dans l'ordre — au début, le problème, le voyage, l'hiver, la fin — : chacun recolle les images dans le plan et raconte un moment.",
          "Montre comment l'histoire est organisée ; fait raconter chaque moment avec ses mots."),
        ph("Les verbes et le jeu des familles", "5 min", "Les cartes des actions : dire ce que fait le petit canard. Le jeu des familles de l'histoire — les personnages, les lieux, les émotions, les actions — est présenté, puis joué en atelier."),
      ]),
    // ── Quatrième phase : mémoriser et réinvestir ──
    seance("Phase 4 — Raconter avec le tapis de conte, jouer l'histoire",
      "raconter l'histoire avec le tapis de conte, le plan du récit et les images, en réemployant les mots et les expressions travaillés.",
      20, [
        ph("Le tapis de conte", "10 min", "Les lieux posés dans l'ordre du voyage ; les personnages avancent sur le tapis pendant qu'on raconte.",
          "Laisse raconter ; relance par une question, reprend le mot juste."),
        ph("Jouer l'histoire", "10 min", gs
          ? "En salle de jeux : jouer l'histoire, marcher à la queue leu leu, réviser les mots par le mime (« Montre-moi : il est épuisé ! »)."
          : "En salle de jeux : jouer l'histoire, réviser les mots par le mime (« Montre-moi : il est épuisé ! »)."),
      ]),
    gs
      ? seance("Phase 4 — Comparer deux versions, les mots écrits",
        "dire ce qui est commun et ce qui change entre deux versions de l'histoire — comment est le petit canard au début, ce qu'il pense, ce qu'il ressent, les lieux qu'il traverse — et retrouver les mots du titre.",
        20, [
          ph("Comparer", "10 min", "Une autre version de l'histoire, lue : quels mots disent comment est le petit canard au début ? ce qu'il pense, ce qu'il ressent ? quels lieux il traverse ? Le tableau des deux versions se remplit en dictée à l'adulte."),
          ph("Les mots écrits", "10 min", "Le titre de l'album : le reformer avec les étiquettes, séparer ses mots ; retrouver le mot « canard » en capitales, en script et en cursive.", PETITS_GROUPES),
        ])
      : seance("Phase 4 — La collection des émotions",
        "retrouver les émotions de l'album sur d'autres visages — des personnages d'albums, des photos, des œuvres d'art, des masques — et les nommer.",
        20, [
          ph("La collection", "10 min", "Des images de visages : pour chacune, dire l'émotion, et la ranger sur l'affiche de son émotion."),
          ph("Dire et mimer", "10 min", "Chacun choisit une image et la décrit avec le mot juste ; les autres miment l'émotion.", PETITS_GROUPES),
        ]),
    seance("Évaluation — Observer, à distance",
      gs ? "montrer ce qu'ils ont acquis : nommer les animaux et leurs petits, trouver une information, employer une expression synonyme, expliquer un mot de l'histoire, la raconter. L'observation se refait un mois plus tard."
        : "montrer ce qu'ils ont acquis : nommer les animaux et leurs petits, les ranger par famille, dire l'émotion du petit canard et sa cause, remettre la naissance dans l'ordre, raconter. L'observation se refait un mois plus tard.",
      15, [
        ph("Observation", "10 min", "En petit groupe, avec les cartes et les outils de la séquence : la grille d'observation se remplit.",
          "Observe sans aider ; note les mots à retravailler."),
        ph("Suite", "5 min", "Les mots à retravailler reviennent dans les jeux ; la grille se refait un mois plus tard."),
      ]),
  ];
}

const SOURCE = "Pour enseigner le vocabulaire à l'école maternelle (guide fondamental, Éduscol, 2020), Focus « Un exemple de séquence en moyenne et grande sections à partir d'un conte traditionnel », p. 71-76 ; "
  + "album : Attilio Cassinelli, Le Vilain Petit Canard, Gallimard Jeunesse, 2018";

export const DEMARCHES_VILAIN_PETIT_CANARD: Demarche[] = [
  {
    id: DEMARCHE_VPC.MS,
    nom: "Le Vilain Petit Canard (MS) : les mots des émotions et de la naissance",
    famille: "Maternelle",
    source: SOURCE,
    resume: "D'abord l'univers de référence — les animaux de la ferme et de l'eau, leurs familles, les saisons —, puis l'album, lu sans les images et raconté avec des marottes ; ensuite les émotions du petit canard, rangées du plus faible au plus fort avec leurs causes, la frise de la naissance du poussin, les lieux, les silhouettes, l'intrus, les devinettes, le plan du récit ; enfin raconter avec le tapis de conte, collectionner les émotions sur d'autres visages, et observer à distance.",
    seances: seances("MS"),
  },
  {
    id: DEMARCHE_VPC.GS,
    nom: "Le Vilain Petit Canard (GS) : des synonymes pour « à la queue leu leu »",
    famille: "Maternelle",
    source: `${SOURCE} ; synonymots : Micheline Cellier, Guide pour enseigner le vocabulaire à l'école élémentaire, Retz, 2015`,
    resume: "D'abord l'univers de référence — les animaux et leurs familles, des textes documentaires dont on tire des informations, les saisons —, puis l'album, lu sans les images et raconté avec des marottes ; ensuite les synonymots — « à la queue leu leu », « la coquille se brise » —, les lieux, les silhouettes, l'intrus, les devinettes, le plan du récit ; enfin raconter avec le tapis de conte, comparer deux versions de l'histoire, retrouver les mots du titre, et observer à distance.",
    seances: seances("GS"),
  },
];
