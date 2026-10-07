// Les quatre opérations au cycle 2 : des séquences bâties sur les guides.
//
// Les livrets d'accompagnement n'ont pas de séquence pour les opérations ;
// l'enseignant a demandé (2026-10-07) qu'on les construise depuis les guides
// Éduscol et le programme, en le disant. Les sources : le programme de
// mathématiques du cycle 2 (2024) — ses objectifs et ses exemples de
// réussite, cités —, le guide « Pour enseigner les nombres, le calcul et la
// résolution de problèmes au CP » (Éduscol, 2021, « Comment enseigner
// l'addition posée ? »), et la démarche en quatre temps des livrets :
// définir l'objectif et mettre en réussite, mettre en activité,
// institutionnaliser, automatiser. Le matériel de numération accompagne
// chaque technique, pour qu'elle garde son sens.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { REGLAGES_POSEES, STYLE_POSEES, htmlOperationsPosees, type ReglagesPosees } from "./operationsPosees";
import { PRESENTATION_COMPLETE, STYLE_FEUILLE as STYLE_PROBLEMES, feuilleProblemes, genererPartieTout, type Probleme } from "./problemesBarres";
import { problemesMultiplicatifs } from "./problemesProlonges";
import { REGLAGES_TRI, STYLE_TRI, htmlTri } from "./triEtiquettes";
import { STYLE_JEUX_MATHS, cartesCalcul, htmlCartesCalcul } from "./jeuxMaths";
import { hasard } from "./hasard";

const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const T4 = "Temps 4 – Automatisation, réinvestissement, transfert";
const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;

const PROGRAMME = "Bâtie sur le programme de mathématiques du cycle 2 (2024) et les guides Éduscol, à la demande de l'enseignant, faute de séquence dans les livrets d'accompagnement ; démarche en quatre temps des livrets";
const GUIDE_CP = "guide « Pour enseigner les nombres, le calcul et la résolution de problèmes au CP » (Éduscol, 2021), « Comment enseigner l'addition posée ? »";

/** L'évaluation qui clôt chaque séquence, puis l'entretien. */
const evaluation = (quoi: string, ensuite: string) => seance("Évaluation", sauront(`${quoi}, seuls.`), 20, [
  ph("Évaluation", "15 min", `Des calculs et un problème : ${quoi}.`),
  ph(T4, "5 min", ensuite),
]);

const ADDITION_POSEE_CP: Demarche = {
  id: "addition-posee-cp", nom: "L'addition posée (CP)", famille: "Mathématiques",
  source: `${PROGRAMME} ; ${GUIDE_CP}`,
  resume: "En période 4 ou 5, quand le calcul mental et le calcul en ligne sont là : l'algorithme de l'addition posée, enseigné de façon précise, guidée et normalisée, avec le matériel de numération pour lui donner son sens — on aligne les unités sous les unités, les dizaines sous les dizaines ; dix unités font une dizaine, qu'on met en retenue. Les calculs avec et sans retenue ensemble ; puis trois termes, dont un nombre à un chiffre, comme 28 + 8 + 56.",
  seances: [
    seance("Poser une addition : rang par rang", sauront("poser une addition de deux nombres à deux chiffres, les unités sous les unités, les dizaines sous les dizaines, et la calculer."), 45, [
      ph(T1, "10 min", "Un calcul long à faire de tête — 45 + 37 — : on cherche une méthode sûre. Les deux nombres représentés avec le matériel : barres de dix et cubes."),
      ph(T2, "25 min", "L'enseignant pose l'addition au tableau en verbalisant : « on aligne les unités sous les unités, les dizaines sous les dizaines » — plutôt que « on aligne à droite ». On commence par les unités, puis les dizaines, en montrant à chaque fois les cubes, puis les barres. Les élèves posent et calculent à leur tour.",
        "Fais dire les unités de numération à chaque rang."),
      ph(T3, "10 min", "La trace écrite : une addition posée, et la règle d'alignement, dite avec les unités et les dizaines."),
    ]),
    seance("La retenue", sauront("poser et calculer une addition avec retenue, en disant pourquoi on retient."), 45, [
      ph(T1, "10 min", "25 + 37, posée : « 5 unités plus 7 unités, cela fait 12 unités, c'est-à-dire 2 unités plus 1 dizaine que je mets en retenue, puis 1 dizaine plus 2 dizaines plus 3 dizaines, cela fait 6 dizaines. »"),
      ph(T2, "25 min", "Avec le matériel : dix cubes s'échangent contre une barre ; puis des additions avec et sans retenue, mêlées — le guide les traite ensemble."),
      ph(T3, "10 min", "La trace écrite s'enrichit : la retenue, une dizaine faite de dix unités."),
    ]),
    seance("S'entraîner", sauront("poser et calculer seuls des additions, avec ou sans retenue, et les poser à partir de leur écriture en ligne."), 30, [
      ph(T2, "25 min", "Des additions posées, puis des additions à poser soi-même ; chacun dit les unités de numération en calculant.",
        "Le matériel reste à disposition de qui en a besoin."),
      ph(T3, "5 min", "On compare deux erreurs : un mauvais alignement, une retenue oubliée."),
    ]),
    seance("Trois termes", sauront("poser une addition de trois nombres, dont un nombre à un chiffre, en alignant rang par rang."), 30, [
      ph(T1, "10 min", "28 + 8 + 56 : où placer le 8 ? Sous les unités — c'est là que l'alignement compte."),
      ph(T2, "20 min", "Des additions de trois termes à poser et à calculer."),
    ]),
    evaluation("poser et calculer des additions de deux ou trois nombres", "Ensuite, l'addition posée pour les problèmes ; le calcul mental chaque fois qu'il suffit."),
  ],
};

const POSEES_CE1: Demarche = {
  id: "posees-ce1", nom: "Additions et soustractions posées (CE1)", famille: "Mathématiques",
  source: PROGRAMME,
  resume: "L'addition posée revue avec des nombres jusqu'à 1 000 — trois nombres de un, deux ou trois chiffres, comme 76 + 7 + 568 —, puis un algorithme de la soustraction posée, en période 3 au plus tard : ici « par cassage », dans la continuité des soustractions où l'on casse une dizaine au CP ; un même algorithme pour toute l'école. Le calcul mental reste privilégié chaque fois qu'il suffit.",
  seances: [
    seance("L'addition posée, jusqu'à 1 000", sauront("poser une addition de deux ou trois nombres, jusqu'à trois chiffres, les centaines sous les centaines."), 45, [
      ph(T1, "10 min", "Rappel de l'addition posée du CP ; 245 + 437 : les centaines entrent dans le quadrillage."),
      ph(T2, "25 min", "Des additions de deux ou trois nombres — 218 + 48, 76 + 7 + 568 — posées et calculées, la retenue dite en unités de numération."),
      ph(T3, "10 min", "La trace écrite, avec les centaines."),
    ]),
    seance("La soustraction posée : casser une dizaine", sauront("poser une soustraction et casser une dizaine quand il n'y a pas assez d'unités."), 45, [
      ph(T1, "10 min", "52 – 27, avec le matériel : il n'y a que 2 unités ; on casse une dizaine en dix unités, comme au CP."),
      ph(T2, "25 min", "L'enseignant pose la soustraction en verbalisant le cassage : on barre une dizaine, on écrit 12 unités ; puis les élèves, avec le matériel d'abord.",
        "Garde l'algorithme choisi par l'école — par cassage ou par compensation — pour toutes les classes."),
      ph(T3, "10 min", "La trace écrite : une soustraction posée, le cassage montré."),
    ]),
    seance("La soustraction posée, jusqu'à 1 000", sauront("poser une soustraction avec des centaines, et casser une centaine quand il le faut."), 45, [
      ph(T2, "35 min", "Des soustractions de nombres à trois chiffres, avec et sans cassage — d'une dizaine, puis d'une centaine."),
      ph(T3, "10 min", "On compare : quand faut-il casser ?"),
    ]),
    seance("Poser ou calculer de tête ?", sauront("choisir entre le calcul mental et l'opération posée selon les nombres."), 30, [
      ph(T2, "25 min", "Des additions et des soustractions : on décide d'abord — de tête, ou posée ? — puis on calcule, et on vérifie."),
      ph(T3, "5 min", "Ce qu'on retient : le calcul mental d'abord, chaque fois qu'il suffit."),
    ]),
    evaluation("poser et calculer des additions et des soustractions", "Ensuite, les opérations posées dans les problèmes, toute l'année."),
  ],
};

const POSEES_CE2: Demarche = {
  id: "posees-ce2", nom: "Additions et soustractions posées, jusqu'à 10 000 et en euros (CE2)", famille: "Mathématiques",
  source: PROGRAMME,
  resume: "Les additions et les soustractions posées étendues aux nombres jusqu'à 10 000, et aux montants en euros écrits avec une virgule, pour les problèmes de monnaie ; le calcul mental reste privilégié chaque fois qu'il est possible.",
  seances: [
    seance("Jusqu'à 10 000", sauront("poser et calculer des additions et des soustractions de nombres jusqu'à 10 000."), 45, [
      ph(T1, "10 min", "Rappel : unités sous les unités… et maintenant les milliers ; une retenue, un cassage, au rang des milliers."),
      ph(T2, "25 min", "Des additions et des soustractions de nombres à quatre chiffres, posées, puis à poser."),
      ph(T3, "10 min", "La trace écrite, avec les milliers."),
    ]),
    seance("Des montants en euros", sauront("poser une addition ou une soustraction de montants en euros, les virgules alignées."), 45, [
      ph(T1, "10 min", "Un problème d'achats : 12,35 € et 7,80 €. Les euros sous les euros, les centimes sous les centimes : les virgules s'alignent."),
      ph(T2, "25 min", "Des montants à ajouter et à soustraire, posés."),
      ph(T3, "10 min", "La trace écrite : aligner les virgules ; cent centimes font un euro."),
    ]),
    seance("Poser ou calculer de tête ?", sauront("choisir la façon de calculer selon les nombres."), 30, [
      ph(T2, "25 min", "Des calculs variés : de tête, ou posés ? On décide, on calcule, on vérifie."),
      ph(T3, "5 min", "On compare les choix."),
    ]),
    evaluation("poser et calculer des additions et des soustractions, jusqu'à 10 000 et en euros", "Ensuite, dans les problèmes, toute l'année."),
  ],
};

const MULTIPLICATION_POSEE_CE2: Demarche = {
  id: "multiplication-posee-ce2", nom: "La multiplication posée (CE2)", famille: "Mathématiques",
  source: PROGRAMME,
  resume: "L'algorithme de la multiplication posée, introduit en période 4 au plus tard : d'abord par un nombre à un chiffre — chaque chiffre multiplié, les retenues, en s'appuyant sur la décomposition (3 × 125 = 3 × 100 + 3 × 20 + 3 × 5) —, puis par un nombre à deux chiffres, avec le nombre qui a le moins de chiffres sur la deuxième ligne : une ligne pour les unités, une pour les dizaines.",
  seances: [
    seance("Par un nombre à un chiffre", sauront("poser et calculer la multiplication d'un nombre à deux ou trois chiffres par un nombre à un chiffre."), 45, [
      ph(T1, "10 min", "3 × 125 calculé en décomposant : 3 × 100 + 3 × 20 + 3 × 5 ; la multiplication posée fait la même chose, rang par rang."),
      ph(T2, "25 min", "L'enseignant pose et calcule en verbalisant : 3 fois 5 unités, 15 unités, 5 unités et 1 dizaine en retenue… Les élèves posent et calculent à leur tour."),
      ph(T3, "10 min", "La trace écrite : la multiplication posée par un chiffre."),
    ]),
    seance("S'entraîner, les retenues", sauront("multiplier par un chiffre en gérant les retenues."), 30, [
      ph(T2, "25 min", "Des multiplications par un chiffre, avec des retenues, les tables à portée de main pour qui en a besoin."),
      ph(T3, "5 min", "On revient sur une retenue oubliée."),
    ]),
    seance("Par un nombre à deux chiffres", sauront("poser et calculer la multiplication par un nombre à deux chiffres, avec deux lignes de produits."), 45, [
      ph(T1, "10 min", "16 × 548 ou 548 × 16 ? On pose le nombre qui a le moins de chiffres sur la deuxième ligne."),
      ph(T2, "25 min", "548 × 16, c'est 548 × 6 plus 548 × 10 : une ligne pour chacun, puis la somme. Les élèves posent et calculent."),
      ph(T3, "10 min", "La trace écrite : pourquoi la deuxième ligne se décale — on multiplie par des dizaines."),
    ]),
    seance("S'entraîner", sauront("poser seuls des multiplications par un ou deux chiffres, à partir de leur écriture en ligne."), 30, [
      ph(T2, "25 min", "Des multiplications à poser et à calculer ; on vérifie un résultat par un ordre de grandeur."),
      ph(T3, "5 min", "On compare les erreurs : un décalage oublié, une retenue."),
    ]),
    evaluation("poser et calculer des multiplications par un ou deux chiffres", "Ensuite, dans les problèmes multiplicatifs."),
  ],
};

const SENS_ADDITION_CP: Demarche = {
  id: "sens-addition-soustraction-cp", nom: "Le sens de l'addition et de la soustraction ; « + », « – », « = » (CP)", famille: "Mathématiques",
  source: PROGRAMME,
  resume: "L'addition et la soustraction comprises dans les problèmes : réunir, ajouter, retirer, chercher ce qui manque ; la soustraction comme l'opération inverse de l'addition — on a 32 + 15 = 47, donc 47 – 32 = 15 et 47 – 15 = 32 — ; l'ordre des termes, sans importance pour l'addition, important pour la soustraction ; le signe = placé seulement entre deux termes égaux.",
  seances: [
    seance("Réunir, ajouter : l'addition", sauront("écrire une addition pour un problème où l'on réunit ou ajoute, avec les signes + et =."), 45, [
      ph(T1, "10 min", "Un problème joué avec des objets : on réunit deux collections ; comment l'écrire ? Le signe +, le signe =."),
      ph(T2, "25 min", "Des problèmes où l'on réunit ou ajoute, résolus avec le matériel puis écrits : 7 + 5 = 12. On échange les termes : 5 + 7 = 12 aussi."),
      ph(T3, "10 min", "La trace écrite : l'addition, ses signes ; l'ordre des termes ne change pas le résultat."),
    ]),
    seance("Retirer, chercher ce qui manque : la soustraction", sauront("écrire une soustraction pour un problème où l'on retire, ou où l'on cherche ce qui manque."), 45, [
      ph(T1, "10 min", "Un problème joué : on retire des objets d'une boîte ; comment l'écrire ? Le signe –."),
      ph(T2, "25 min", "Des problèmes où l'on retire, ou cherche ce qui manque, résolus puis écrits : 12 – 5 = 7. L'ordre compte : 5 – 12 ne se calcule pas au CP."),
      ph(T3, "10 min", "La trace écrite : la soustraction, et l'ordre des termes."),
    ]),
    seance("L'opération inverse", sauront("trouver les deux soustractions d'une addition : 32 + 15 = 47, donc 47 – 32 = 15 et 47 – 15 = 32."), 30, [
      ph(T2, "25 min", "Des familles de calculs : une addition, ses deux soustractions ; on les vérifie avec le matériel."),
      ph(T3, "5 min", "Ce qu'on retient : la soustraction défait l'addition."),
    ]),
    seance("Le signe =", sauront("placer le signe = seulement entre deux termes égaux, et écrire un calcul par étapes sans erreur."), 30, [
      ph(T1, "10 min", "47 + 8 en décomposant 8 en 3 + 5 : « 47 + 3 = 50 + 5 = 55 » est-il juste ? Non : 47 + 3 n'est pas égal à 50 + 5."),
      ph(T2, "15 min", "Des écritures à corriger, puis des calculs par étapes à écrire juste : 47 + 3 = 50 ; 50 + 5 = 55."),
      ph(T3, "5 min", "La trace écrite : = veut dire « égal ». Un calcul par ligne."),
    ]),
    evaluation("écrire l'addition ou la soustraction qui résout un problème, et utiliser + , – et =", "Ensuite, dans les problèmes, toute l'année."),
  ],
};

const SENS_MULTIPLICATION_CP: Demarche = {
  id: "sens-multiplication-cp", nom: "Le sens de la multiplication : « fois » (CP)", famille: "Mathématiques",
  source: PROGRAMME,
  resume: "La multiplication comprise dans les problèmes, avec le mot « fois » dans des additions itérées : « Jan a trois paquets de biscuits. Chaque paquet contient 20 biscuits. Combien Jan a-t-il de biscuits ? » — Jan a trois fois vingt biscuits : 20 + 20 + 20. Le symbole × viendra au CE1.",
  seances: [
    seance("Des paquets égaux : « fois »", sauront("dire « trois fois vingt » et écrire l'addition itérée qui va avec."), 45, [
      ph(T1, "10 min", "Le problème de Jan, joué avec des paquets : trois paquets de 20 biscuits."),
      ph(T2, "25 min", "« Jan a trois fois vingt biscuits » : 20 + 20 + 20. D'autres collections de paquets égaux, dites avec « fois », écrites en additions itérées."),
      ph(T3, "10 min", "La trace écrite : « 3 fois 20 », c'est 20 + 20 + 20."),
    ]),
    seance("Représenter : des croix, des groupes", sauront("représenter des parts égales par des croix ou des ronds et trouver le tout."), 30, [
      ph(T2, "25 min", "Des problèmes de parts égales : on dessine les croix, on entoure les groupes, on compte — de un en un, ou par dix."),
      ph(T3, "5 min", "On compare les dessins."),
    ]),
    seance("Des problèmes", sauront("résoudre un problème de parts égales en disant « fois » et en écrivant l'addition itérée."), 30, [
      ph(T2, "25 min", "Des problèmes variés : le tout fait de parts égales ; puis, combien de groupes ?"),
      ph(T3, "5 min", "Une trace dans le cahier."),
    ]),
    evaluation("comprendre et dire « fois » dans des problèmes de parts égales", "Ensuite, au CE1, le symbole ×."),
  ],
};

const MULTIPLICATION_CE1: Demarche = {
  id: "multiplication-ce1", nom: "Le symbole × et la commutativité (CE1)", famille: "Mathématiques",
  source: PROGRAMME,
  resume: "Le symbole × lu « fois » : « Jan a sept paquets de vingt biscuits » s'écrit 7 × 20 biscuits = 140 biscuits — plus court que l'addition itérée, les unités dans le calcul. Puis la commutativité, dans des situations qui la montrent : un potager de huit colonnes de quatre salades, c'est aussi quatre rangées de huit.",
  seances: [
    seance("Le symbole ×", sauront("lire × « fois » et écrire une multiplication pour des parts égales, avec les unités."), 45, [
      ph(T1, "10 min", "Le problème de Jan, sept paquets de vingt biscuits : 20 + 20 + 20 + 20 + 20 + 20 + 20 — long ! « Sept fois vingt » s'écrit 7 × 20."),
      ph(T2, "25 min", "Des collections de parts égales à écrire en multiplication : 7 × 20 biscuits = 140 biscuits ; on lit « fois »."),
      ph(T3, "10 min", "La trace écrite : le symbole ×, lu « fois » ; une addition itérée et sa multiplication."),
    ]),
    seance("Dans les deux sens : la commutativité", sauront("savoir que l'ordre des facteurs ne change pas le résultat : 8 × 4 = 4 × 8."), 45, [
      ph(T1, "10 min", "Le potager : huit colonnes de quatre salades, 8 × 4 ; vu de l'autre côté, quatre rangées de huit, 4 × 8."),
      ph(T2, "25 min", "Des quadrillages et des collections rangées à décrire dans les deux sens ; on compare les résultats."),
      ph(T3, "10 min", "La trace écrite : l'ordre des facteurs n'a pas d'importance — ce qui aide à mémoriser les tables."),
    ]),
    seance("S'entraîner", sauront("écrire et calculer des multiplications pour des problèmes de parts égales."), 30, [
      ph(T2, "25 min", "Des problèmes de parts égales, et les cartes des tables, dans les deux ordres."),
      ph(T3, "5 min", "On vérifie un résultat en échangeant les facteurs."),
    ]),
    evaluation("écrire une multiplication avec × et utiliser la commutativité", "Ensuite, les tables de multiplication, toute l'année."),
  ],
};

const PARITE_CE1: Demarche = {
  id: "parite-ce1", nom: "Pair ou impair (CE1)", famille: "Mathématiques",
  source: PROGRAMME,
  resume: "La notion de parité : un nombre pair se partage en deux parts égales — des paires sans cube seul —, et se reconnaît à son chiffre des unités : 0, 2, 4, 6 ou 8. L'élève sait dire si un nombre est pair ou impair, et donner tous les nombres pairs compris entre 767 et 778.",
  seances: [
    seance("Des paires : pair ou impair", sauront("dire si une collection a un nombre pair ou impair d'objets, en faisant des paires."), 45, [
      ph(T1, "10 min", "Des collections de cubes : on fait des paires ; reste-t-il un cube seul ?"),
      ph(T2, "25 min", "Des collections à ranger : sans cube seul, le nombre est pair ; avec un cube seul, impair."),
      ph(T3, "10 min", "La trace écrite : pair, impair ; les nombres pairs jusqu'à 20."),
    ]),
    seance("Le chiffre des unités", sauront("reconnaître un nombre pair à son chiffre des unités, même grand."), 45, [
      ph(T1, "10 min", "Les nombres pairs jusqu'à 20, rangés : leurs chiffres des unités sont 0, 2, 4, 6 ou 8."),
      ph(T2, "25 min", "Des nombres plus grands à trier : pair ou impair ? Tous les nombres pairs entre 767 et 778."),
      ph(T3, "10 min", "La trace écrite : un nombre est pair quand son chiffre des unités est 0, 2, 4, 6 ou 8."),
    ]),
    seance("S'entraîner", sauront("trier vite des nombres pairs et impairs."), 30, [
      ph(T2, "25 min", "Des étiquettes à ranger dans leur maison : pair ou impair ; puis des suites de nombres pairs à compléter."),
      ph(T3, "5 min", "On vérifie avec le chiffre des unités."),
    ]),
    evaluation("dire si un nombre est pair ou impair, et donner des nombres pairs", "Ensuite, les doubles et les moitiés : un nombre pair est le double d'un nombre."),
  ],
};

const MOTS_CE2: Demarche = {
  id: "mots-operations-ce2", nom: "Terme, somme, différence ; facteur, produit, multiple (CE2)", famille: "Mathématiques",
  source: PROGRAMME,
  resume: "Les mots des opérations, compris et utilisés dans des phrases : « La somme de 12 et de 25 est 37 », « 12 et 25 sont les termes de l'addition », « La différence entre 60 et 37 est 23 » ; « Le produit de 3 et de 25 est 75 », « 3 et 25 sont les facteurs », « 75 est un multiple de 25 », « les nombres pairs sont des multiples de 2 ».",
  seances: [
    seance("Terme, somme, différence", sauront("utiliser les mots terme, somme et différence dans des phrases justes."), 45, [
      ph(T1, "10 min", "12 + 25 = 37 : comment dire chaque nombre ? « La somme de 12 et de 25 est 37 » ; « 12 et 25 sont les termes »."),
      ph(T2, "25 min", "Des additions et des soustractions à dire avec les mots, et des phrases à transformer en calculs : « la différence entre 60 et 37 »."),
      ph(T3, "10 min", "La trace écrite : un exemple pour chaque mot."),
    ]),
    seance("Facteur, produit, multiple", sauront("utiliser les mots facteur, produit et multiple dans des phrases justes."), 45, [
      ph(T1, "10 min", "3 × 25 = 75 : « le produit de 3 et de 25 est 75 » ; « 3 et 25 sont les facteurs » ; « 75 est un multiple de 25 »."),
      ph(T2, "25 min", "Des multiplications à dire avec les mots ; des multiples d'un nombre à trouver ; les nombres pairs, multiples de 2."),
      ph(T3, "10 min", "La trace écrite : un exemple pour chaque mot."),
    ]),
    seance("Des devinettes", sauront("retrouver un nombre décrit avec ces mots."), 30, [
      ph(T2, "25 min", "« Je suis la somme de 40 et de 15 » ; « je suis un multiple de 5 compris entre 21 et 29 » ; chacun invente les siennes."),
      ph(T3, "5 min", "On relit les devinettes, et on vérifie les mots."),
    ]),
    evaluation("utiliser les mots terme, somme, différence, facteur, produit et multiple", "Ensuite, ces mots dans les consignes et les problèmes."),
  ],
};

const DIVISION_CE2: Demarche = {
  id: "division-ce2", nom: "Le sens de la division ; le symbole ÷ (CE2)", famille: "Mathématiques",
  source: PROGRAMME,
  resume: "La division comprise dans les problèmes de partage — la valeur d'une part — et de groupement — le nombre de parts —, puis comme l'opération inverse de la multiplication : 7 × 13 = 91, donc 91 ÷ 7 = 13 et 91 ÷ 13 = 7. Le symbole ÷.",
  seances: [
    seance("Partager : la valeur d'une part", sauront("trouver la valeur d'une part dans un partage équitable."), 45, [
      ph(T1, "10 min", "Trois enfants se partagent 18 images, autant chacun : combien d'images chacun ? On distribue, une à une."),
      ph(T2, "25 min", "Des partages, avec des jetons puis un schéma en barres ; la table de multiplication pour vérifier."),
      ph(T3, "10 min", "La trace écrite : partager en parts égales."),
    ]),
    seance("Grouper : le nombre de parts", sauront("trouver combien de parts égales on peut faire."), 45, [
      ph(T1, "10 min", "60 élèves en équipes de 5 : combien d'équipes ?"),
      ph(T2, "25 min", "Des problèmes de groupement, avec un schéma ; on compte les groupes."),
      ph(T3, "10 min", "La trace écrite : grouper par parts égales."),
    ]),
    seance("L'opération inverse ; le symbole ÷", sauront("écrire une division avec ÷ et la relier à une multiplication."), 45, [
      ph(T1, "10 min", "7 × 13 = 91 : donc 91 ÷ 7 = 13, et 91 ÷ 13 = 7. Le symbole ÷."),
      ph(T2, "25 min", "Des familles de calculs : une multiplication, ses deux divisions ; des problèmes de partage et de groupement écrits avec ÷."),
      ph(T3, "10 min", "La trace écrite : la division défait la multiplication."),
    ]),
    evaluation("résoudre des problèmes de partage et de groupement, et écrire la division", "Ensuite, au CM, la division posée."),
  ],
};

export const DEMARCHES_OPERATIONS: Demarche[] = [
  ADDITION_POSEE_CP, POSEES_CE1, POSEES_CE2, MULTIPLICATION_POSEE_CE2, SENS_ADDITION_CP, SENS_MULTIPLICATION_CP, MULTIPLICATION_CE1, PARITE_CE1, MOTS_CE2, DIVISION_CE2,
];

/** La séquence d'une compétence des quatre opérations, à sa classe ; rien sinon. En minuscules sans accents. */
export function demarcheDesOperations(classe: string, comp: string): string | null {
  if (classe === "cp") {
    if (/additions en colonnes/.test(comp)) return "addition-posee-cp";
    if (/sens de l.addition|symboles .{0,3}\+/.test(comp)) return "sens-addition-soustraction-cp";
    if (/sens de la multiplication/.test(comp)) return "sens-multiplication-cp";
  }
  if (classe === "ce1") {
    if (/en colonnes/.test(comp)) return "posees-ce1";
    if (/symbole .{0,3}×|commutative/.test(comp)) return "multiplication-ce1";
    if (/parite/.test(comp)) return "parite-ce1";
  }
  if (classe === "ce2") {
    if (/multiplications d.un nombre a deux ou trois chiffres/.test(comp)) return "multiplication-posee-ce2";
    if (/en colonnes/.test(comp)) return "posees-ce2";
    if (/mots .{0,3}terme|mots .{0,3}facteur/.test(comp)) return "mots-operations-ce2";
    if (/sens de la division/.test(comp)) return "division-ce2";
  }
  return null;
}

// ── Les feuilles ──────────────────────────────────────────────────────────

const posees = (seance: number, titre: string, r: Partial<ReglagesPosees>): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_POSEES, ...r };
  return { seance, atelier: "posees", titre, fabriquer: (g) => ({ html: htmlOperationsPosees(reglages, g), style: STYLE_FEUILLE + STYLE_POSEES }) };
};
const problemes = (seance: number, titre: string, atelier: string, tirer: (g: number) => Probleme[]): FeuilleAFabriquer => ({
  seance, atelier, titre, fabriquer: (g) => ({ html: feuilleProblemes(tirer(g), titre, { ...PRESENTATION_COMPLETE, schema: "sans" }), style: STYLE_PROBLEMES }),
});

/** Le tri des nombres pairs et impairs, dans l'atelier « Les maisons du tri ». */
function triDeLaParite(seance: number, grands: boolean): FeuilleAFabriquer {
  return {
    seance, atelier: "tri", titre: grands ? "Pair ou impair — de grands nombres" : "Pair ou impair",
    fabriquer: (g) => {
      const alea = hasard(g);
      const nombres = Array.from({ length: 24 }, () => (grands ? 100 + Math.floor(alea() * 900) : 1 + Math.floor(alea() * 40)));
      const uniques = [...new Set(nombres)].slice(0, 16);
      const r = {
        ...REGLAGES_TRI, titre: "Pair ou impair ?", consigne: "Range chaque nombre dans sa maison : pair ou impair.",
        categories: [
          { titre: "pair", etiquettes: uniques.filter((x) => x % 2 === 0).join("\n") },
          { titre: "impair", etiquettes: uniques.filter((x) => x % 2 === 1).join("\n") },
        ],
        aide: "Des paires : reste-t-il un cube seul ?\nLe chiffre des unités : est-ce 0, 2, 4, 6 ou 8 ?",
        aRetenir: "Un nombre est pair quand son chiffre des unités est 0, 2, 4, 6 ou 8.",
        aideMots: false, aidePonctuation: false, deuxVersions: false, modele: undefined, origine: undefined,
      };
      return { html: htmlTri(r, g), style: STYLE_FEUILLE + STYLE_TRI };
    },
  };
}

const PLANS: Record<string, { feuilles: FeuilleAFabriquer[]; materiel: string[] }> = {
  "addition-posee-cp": {
    feuilles: [
      posees(0, "Additions posées", { operation: "+", chiffres: 2, retenue: "sans", combien: 6 }),
      posees(1, "Additions posées — avec et sans retenue", { operation: "+", chiffres: 2, retenue: "melange", combien: 6 }),
      posees(2, "Additions à poser", { operation: "+", chiffres: 2, retenue: "melange", combien: 6, posees: false }),
      posees(3, "Additions de trois termes", { operation: "+", chiffres: 2, retenue: "melange", combien: 6, troisTermes: true }),
      posees(4, "Additions posées — évaluation", { operation: "+", chiffres: 2, retenue: "melange", combien: 6, posees: false }),
    ],
    materiel: ["Des barres de dix et des cubes ; le cahier de leçons", "Des barres de dix et des cubes, à échanger", "Le matériel à disposition", "Le cahier", "Les énoncés"],
  },
  "posees-ce1": {
    feuilles: [
      posees(0, "Additions posées, jusqu'à 1 000", { operation: "+", chiffres: 3, retenue: "melange", combien: 6, troisTermes: true }),
      posees(1, "Soustractions posées — casser une dizaine", { operation: "−", chiffres: 2, retenue: "melange", combien: 6 }),
      posees(2, "Soustractions posées, jusqu'à 1 000", { operation: "−", chiffres: 3, retenue: "melange", combien: 6 }),
      posees(3, "Additions à poser", { operation: "+", chiffres: 3, retenue: "melange", combien: 6, posees: false }),
      posees(3, "Soustractions à poser", { operation: "−", chiffres: 3, retenue: "melange", combien: 6, posees: false }),
      posees(4, "Soustractions à poser — évaluation", { operation: "−", chiffres: 3, retenue: "melange", combien: 6, posees: false }),
    ],
    materiel: ["Le matériel multibase", "Des barres de dix et des cubes, à casser", "Le matériel multibase, plaques comprises", "Le cahier", "Les énoncés"],
  },
  "posees-ce2": {
    feuilles: [
      posees(0, "Additions posées, jusqu'à 10 000", { operation: "+", chiffres: 4, retenue: "melange", combien: 6 }),
      posees(0, "Soustractions posées, jusqu'à 10 000", { operation: "−", chiffres: 4, retenue: "melange", combien: 6 }),
      posees(1, "Des montants en euros", { operation: "+", chiffres: 4, retenue: "melange", combien: 6, euros: true }),
      posees(2, "Additions à poser, jusqu'à 10 000", { operation: "+", chiffres: 4, retenue: "melange", combien: 6, posees: false }),
      posees(3, "Soustractions de montants — évaluation", { operation: "−", chiffres: 4, retenue: "melange", combien: 6, euros: true, posees: false }),
    ],
    materiel: ["Le cahier", "Des pièces et des billets factices", "Le cahier", "Les énoncés"],
  },
  "multiplication-posee-ce2": {
    feuilles: [
      posees(0, "Multiplications posées — par un chiffre", { operation: "×", chiffres: 2, chiffresDuSecond: 1, retenue: "melange", combien: 6 }),
      posees(1, "Multiplications posées — les retenues", { operation: "×", chiffres: 3, chiffresDuSecond: 1, retenue: "avec", combien: 6 }),
      posees(2, "Multiplications posées — par deux chiffres", { operation: "×", chiffres: 3, chiffresDuSecond: 2, retenue: "melange", combien: 6 }),
      posees(3, "Multiplications à poser", { operation: "×", chiffres: 3, chiffresDuSecond: 2, retenue: "melange", combien: 6, posees: false }),
      posees(4, "Multiplications à poser — évaluation", { operation: "×", chiffres: 3, chiffresDuSecond: 1, retenue: "melange", combien: 6, posees: false }),
    ],
    materiel: ["Les tables de multiplication ; le cahier", "Les tables", "Le cahier", "Le cahier", "Les énoncés"],
  },
  "sens-addition-soustraction-cp": {
    feuilles: [
      problemes(0, "Problèmes — réunir, ajouter", "partieTout", (g) => genererPartieTout({ nombre: 4, parties: 2, inconnue: "tout", max: 20, enonces: true, prenoms: [] }, g)),
      problemes(1, "Problèmes — retirer, chercher ce qui manque", "partieTout", (g) => genererPartieTout({ nombre: 4, parties: 2, inconnue: "partie", max: 20, enonces: true, prenoms: [] }, g)),
      problemes(4, "Problèmes — évaluation", "partieTout", (g) => genererPartieTout({ nombre: 4, parties: 2, inconnue: "melange", max: 30, enonces: true, prenoms: [] }, g)),
    ],
    materiel: ["Des objets à réunir ; des cubes", "Une boîte et des objets à retirer", "Des cubes", "Des écritures à corriger, au tableau", "Les énoncés"],
  },
  "sens-multiplication-cp": {
    feuilles: [
      problemes(0, "Problèmes — des paquets égaux", "multiplicatifs", (g) => problemesMultiplicatifs("CP", ["tout"], 4, g, { parts: [2, 5], valeurs: [2, 6] })),
      problemes(2, "Problèmes — parts égales", "multiplicatifs", (g) => problemesMultiplicatifs("CP", ["tout", "nombre"], 4, g, { parts: [2, 5], valeurs: [2, 6] })),
      problemes(3, "Problèmes — évaluation", "multiplicatifs", (g) => problemesMultiplicatifs("CP", ["tout", "nombre"], 4, g + 1, { parts: [2, 5], valeurs: [2, 6] })),
    ],
    materiel: ["Des paquets et des objets", "Des jetons ; du papier pour dessiner", "Le cahier", "Les énoncés"],
  },
  "multiplication-ce1": {
    feuilles: [
      problemes(0, "Problèmes — écrire avec ×", "multiplicatifs", (g) => problemesMultiplicatifs("CE1", ["tout"], 4, g, { parts: [2, 10], valeurs: [2, 10] })),
      {
        seance: 1, atelier: "calcul", titre: "Cartes de calcul — tables de 2 à 5",
        fabriquer: (g) => ({ html: htmlCartesCalcul(cartesCalcul({ operation: "x", tables: [2, 3, 4, 5], rectoVerso: true, melanger: true }, g),
          { operation: "x", tables: [2, 3, 4, 5], rectoVerso: true, melanger: true }), style: STYLE_FEUILLE + STYLE_JEUX_MATHS }),
      },
      problemes(2, "Problèmes — parts égales", "multiplicatifs", (g) => problemesMultiplicatifs("CE1", ["tout", "nombre"], 4, g, { parts: [2, 10], valeurs: [2, 10] })),
      problemes(3, "Problèmes — évaluation", "multiplicatifs", (g) => problemesMultiplicatifs("CE1", ["tout", "nombre"], 4, g + 1, { parts: [2, 10], valeurs: [2, 10] })),
    ],
    materiel: ["Des paquets d'objets", "Du papier quadrillé ; des jetons", "Les cartes des tables", "Les énoncés"],
  },
  "parite-ce1": {
    feuilles: [triDeLaParite(1, false), triDeLaParite(2, true)],
    materiel: ["Des cubes", "Les nombres pairs jusqu'à 20, affichés", "Les étiquettes à découper ; les maisons", "Les énoncés"],
  },
  "mots-operations-ce2": {
    feuilles: [],
    materiel: ["Des calculs au tableau", "Des calculs au tableau", "Des étiquettes pour les devinettes", "Les énoncés"],
  },
  "division-ce2": {
    feuilles: [
      problemes(0, "Problèmes — partager", "multiplicatifs", (g) => problemesMultiplicatifs("CE2", ["part"], 4, g, { parts: [2, 9], valeurs: [2, 12] })),
      problemes(1, "Problèmes — grouper", "multiplicatifs", (g) => problemesMultiplicatifs("CE2", ["nombre"], 4, g, { parts: [2, 9], valeurs: [2, 12] })),
      problemes(2, "Problèmes — partager ou grouper", "multiplicatifs", (g) => problemesMultiplicatifs("CE2", ["part", "nombre"], 4, g, { parts: [2, 9], valeurs: [2, 12] })),
      problemes(3, "Problèmes — évaluation", "multiplicatifs", (g) => problemesMultiplicatifs("CE2", ["part", "nombre", "tout"], 4, g + 1, { parts: [2, 9], valeurs: [2, 12] })),
    ],
    materiel: ["Des jetons ; des images à partager", "Des jetons", "Les tables de multiplication", "Les énoncés"],
  },
};

export const estUneDemarcheDesOperations = (id: string) => id in PLANS;

export function planDesOperations(demarcheId: string): PlanDesFeuilles | null {
  const p = PLANS[demarcheId];
  if (!p) return null;
  const materiel = p.materiel.map((debut, s) => {
    const f = p.feuilles.filter((x) => x.seance === s).map((x) => `« ${x.titre} »`);
    return f.length ? `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${f.join(" et ")}.` : `${debut}.`;
  });
  return { feuilles: p.feuilles, materiel };
}
