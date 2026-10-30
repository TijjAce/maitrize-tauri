// Les quatre opérations au cours moyen : estimer, les parenthèses, le calcul posé.
//
// Le livret d'accompagnement du CM1 n'a, pour le calcul, que la séquence de
// calcul mental « Multiplier un nombre entier par 5 » (voir demarchesCalcul.ts) ;
// celui du CM2, aucune. Ces séquences sont bâties, comme au cycle 2 et en le
// disant, sur le programme de mathématiques du cycle 3 (2025) et ses exemples
// de réussite (Éduscol, 2025), avec la démarche en quatre temps des livrets.
// Chaque séance s'ouvre sur le calcul mental, au procédé La Martinière (voir
// sequencesToutesFaites.ts) ; le calcul posé arrive quand le calcul mental ne
// suffit plus, et l'estimation contrôle chaque résultat.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { ContexteFeuilles, FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { REGLAGES_CALCUL_CM, STYLE_CALCUL_CM, htmlCalculCM, type ReglagesCalculCM } from "./calculCoursMoyen";

const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const T4 = "Temps 4 – Automatisation, réinvestissement, transfert";
const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;
const evaluation = (quoi: string, ensuite: string) => seance("Évaluation", sauront(`${quoi}, seuls.`), 30, [
  ph("Évaluation", "25 min", `La feuille d'évaluation : ${quoi}.`),
  ph(T4, "5 min", ensuite),
]);

const PROGRAMME_C3 = "Bâtie sur le programme de mathématiques du cycle 3 (2025) et ses exemples de réussite (Éduscol, 2025) — le livret d'accompagnement n'a pas de séquence pour cette notion — ; démarche en quatre temps des livrets";
const ESTIMER = "Avant de poser, on estime ; après, on compare le résultat à l'estimation.";

const ESTIMER_CALCULER_CM1: Demarche = {
  id: "estimer-calculer-cm1", nom: "Estimer un résultat ; calculer avec des parenthèses (CM1)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Estimer le résultat d'une opération dans des cas simples, et écrire ≈ : 212 m + 298 m + 496 m est proche de 1 000 m ; 1 494 − 203 ≈ 1 300 ; 52 × 37 L est proche de 2 000 L ; 597 kg ÷ 2, de 300 kg. Comprendre que les parenthèses disent les calculs à faire en premier : 3 × (10 − 6).",
  seances: [
    seance("Un ordre de grandeur", sauront("estimer une somme ou une différence en arrondissant les nombres, et écrire le symbole ≈."), 45, [
      ph(T1, "10 min", "Trois parcours, 212 m, 298 m et 496 m : environ combien en tout ? Sans calculer exactement."),
      ph(T2, "25 min", "Arrondir chaque nombre à la centaine, au millier ; calculer de tête ; écrire 1 494 − 203 ≈ 1 300."),
      ph(T3, "10 min", "Ce qu'on retient : estimer, c'est calculer de tête avec des nombres arrondis ; ≈ se lit « environ égal à »."),
    ]),
    seance("Estimer pour contrôler", sauront("estimer un produit ou un quotient, et s'en servir pour repérer un résultat impossible."), 45, [
      ph(T1, "10 min", "52 × 37 L = 19 240 L, a écrit un élève. Est-ce possible ? 50 × 40 = 2 000."),
      ph(T2, "25 min", "Choisir, parmi trois nombres, le plus proche du résultat ; repérer des résultats faux par l'estimation."),
      ph(T3, "10 min", ESTIMER),
    ]),
    seance("Les parenthèses", sauront("effectuer un calcul avec des parenthèses, en commençant par ce qu'elles entourent."), 45, [
      ph(T1, "10 min", "3 × 10 − 6 et 3 × (10 − 6) : le même résultat ?"),
      ph(T2, "25 min", "Des calculs avec parenthèses, écrits étape par étape ; un problème qu'on traduit par un calcul avec parenthèses."),
      ph(T3, "10 min", "Ce qu'on retient : on calcule d'abord ce qui est entre parenthèses."),
    ]),
    evaluation("estimer des résultats et calculer avec des parenthèses", "Ensuite, l'estimation avant chaque calcul posé."),
  ],
};

const POSEES_DECIMAUX_CM1: Demarche = {
  id: "posees-decimaux-cm1", nom: "Additions et soustractions posées de décimaux (CM1)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Poser en colonnes et effectuer des additions et des soustractions de nombres décimaux, en utilisant les mots terme, somme, différence. Exemples de réussite : 56,75 + 234 + 0,8 ; 34,5 − 2,58.",
  seances: [
    seance("La virgule sous la virgule", sauront("poser une addition de décimaux en alignant les chiffres rang par rang, la virgule sous la virgule."), 45, [
      ph(T1, "10 min", "56,75 + 234 + 0,8 posé « à droite » comme des entiers : le résultat est-il possible ? On l'estime : environ 290."),
      ph(T2, "25 min", "Le tableau de numération guide l'alignement : unités sous unités, dixièmes sous dixièmes ; on pose, on calcule, la virgule descend."),
      ph(T3, "10 min", "Ce qu'on retient : j'aligne les chiffres de même rang ; la virgule est sous la virgule.", ESTIMER),
    ]),
    seance("Des zéros pour soustraire", sauront("poser une soustraction de décimaux, en complétant avec des zéros."), 45, [
      ph(T1, "10 min", "34,5 − 2,58 : il manque un chiffre des centièmes. 34,5, c'est aussi 34,50."),
      ph(T2, "25 min", "Des soustractions à poser, avec des zéros à écrire ; on calcule comme pour les entiers."),
      ph(T3, "10 min", "Ce qu'on retient : j'écris autant de chiffres après la virgule dans les deux nombres."),
    ]),
    seance("S'entraîner", sauront("poser soi-même additions et soustractions de décimaux et vérifier par l'estimation."), 30, [
      ph(T4, "25 min", "Des calculs donnés en ligne, à poser ; des prix, des longueurs ; l'estimation d'abord."),
      ph(T3, "5 min", "On compare une erreur d'alignement et un oubli de zéro."),
    ]),
    evaluation("poser et calculer des additions et des soustractions de décimaux", "Ensuite, ces calculs dans les problèmes de mesures et de prix."),
  ],
};

const MULTIPLICATION_POSEE_CM1: Demarche = {
  id: "multiplication-posee-cm1", nom: "La multiplication posée de deux entiers (CM1)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Poser et effectuer des multiplications de deux nombres entiers, et utiliser les mots facteur, produit, multiple, diviseur. Exemple de réussite : calculer 876 × 208 en posant la multiplication.",
  seances: [
    seance("Par un nombre à deux chiffres", sauront("poser une multiplication par un nombre à deux chiffres, avec ses deux produits partiels."), 45, [
      ph(T1, "10 min", "Rappel du CE2 : la multiplication par un chiffre. Puis 347 × 26 : 347 × 6 et 347 × 20."),
      ph(T2, "25 min", "Poser, une ligne par chiffre du second facteur ; pour les dizaines, le zéro d'abord ; puis additionner les produits partiels."),
      ph(T3, "10 min", "La trace écrite : une multiplication posée, et ce que vaut chaque ligne.", ESTIMER),
    ]),
    seance("Par un nombre à trois chiffres", sauront("poser une multiplication par un nombre à trois chiffres, même avec un zéro au milieu."), 45, [
      ph(T1, "10 min", "876 × 208 : combien de lignes ? Le zéro des dizaines ne donne pas de ligne."),
      ph(T2, "25 min", "Des multiplications par trois chiffres ; on estime avant, on contrôle après."),
      ph(T3, "10 min", "Ce qu'on retient : une ligne par chiffre qui n'est pas zéro, chacune décalée de son rang."),
    ]),
    seance("S'entraîner", sauront("poser seul des multiplications données en ligne."), 30, [
      ph(T4, "25 min", "Des multiplications à poser ; des problèmes de quantités et de prix."),
      ph(T3, "5 min", "On compare les erreurs fréquentes : un décalage oublié, une retenue."),
    ]),
    evaluation("poser et calculer des multiplications de deux entiers", "Ensuite, multiplier un décimal par un entier."),
  ],
};

const MULTIPLICATION_DECIMAL_CM1: Demarche = {
  id: "multiplication-decimal-cm1", nom: "Multiplier un décimal par un entier inférieur à 10 (CM1)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Dans le cadre d'un problème, déterminer le produit d'un décimal par un entier inférieur à 10, en posant l'opération si besoin : 7 × 46,55 € ; 8 × 17,3 km.",
  seances: [
    seance("Ce que veut dire 3 × 2,5", sauront("calculer le produit d'un décimal par un entier en revenant à l'addition itérée et aux dixièmes."), 45, [
      ph(T1, "10 min", "Trois bouteilles de 2,5 L : 2,5 + 2,5 + 2,5. Et 8 × 17,3 km ?"),
      ph(T2, "25 min", "17,3, c'est 173 dixièmes ; 8 × 173 dixièmes = 1 384 dixièmes = 138,4. On le vérifie par l'addition et par l'estimation : 8 × 17 ≈ 140."),
      ph(T3, "10 min", "Ce qu'on retient : je calcule avec des dixièmes ou des centièmes, puis je reviens à l'unité."),
    ]),
    seance("Poser la multiplication", sauront("poser la multiplication d'un décimal par un entier et placer la virgule du résultat."), 45, [
      ph(T2, "35 min", "Poser 46,55 × 7 comme 4 655 × 7, puis placer la virgule : deux chiffres après la virgule, comme 46,55 ; contrôler : 47 × 7 ≈ 330."),
      ph(T3, "10 min", "La règle, justifiée par les centièmes, dans le cahier de leçons.", ESTIMER),
    ]),
    seance("Des problèmes", sauront("résoudre des problèmes de prix et de mesures avec un décimal multiplié par un entier."), 30, [
      ph(T2, "25 min", "Des achats, des distances, des masses ; on écrit la réponse par une phrase, avec l'unité."),
      ph(T3, "5 min", "On compare les estimations et les résultats."),
    ]),
    evaluation("multiplier un décimal par un entier inférieur à 10", "Ensuite, au CM2, par un entier quelconque."),
  ],
};

const DIVISION_CM1: Demarche = {
  id: "division-cm1", nom: "La division euclidienne posée (CM1)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Poser et effectuer la division euclidienne d'un entier jusqu'à cinq chiffres par un nombre à un chiffre ; nommer dividende, diviseur, quotient et reste ; faire le lien avec l'égalité 9 456 = 1 350 × 7 + 6, et dans un problème, 2 458 œufs = 409 × 6 œufs + 4 œufs.",
  seances: [
    seance("Partager, grouper : le sens", sauront("reconnaître un problème de division et nommer dividende, diviseur, quotient et reste."), 45, [
      ph(T1, "10 min", "743 images à partager entre 9 enfants : combien chacun ? combien en reste-t-il ? Chacun cherche à sa façon."),
      ph(T2, "25 min", "Des procédures comparées : soustractions successives, multiplications par essais, 9 × 80 = 720 ; le vocabulaire posé sur la situation."),
      ph(T3, "10 min", "Ce qu'on retient : dans la division de 743 par 9, 743 est le dividende, 9 le diviseur ; on cherche le quotient et le reste."),
    ]),
    seance("La potence", sauront("poser une division par un chiffre et trouver le nombre de chiffres du quotient."), 45, [
      ph(T1, "10 min", "Le premier « morceau » du dividende : 7 centaines, peut-on les partager en 9 ? Non ; 74 dizaines, oui : le quotient aura deux chiffres."),
      ph(T2, "25 min", "Poser des divisions : chercher combien de fois le diviseur, retrancher, abaisser le chiffre suivant ; le reste plus petit que le diviseur."),
      ph(T3, "10 min", "La trace écrite : une division posée, ses étapes nommées."),
    ]),
    seance("Vérifier par l'égalité", sauront("vérifier une division par l'égalité dividende = quotient × diviseur + reste."), 45, [
      ph(T1, "10 min", "9 456 ÷ 7 : quotient 1 350, reste 6. Et 1 350 × 7 + 6 ?"),
      ph(T2, "25 min", "Des divisions à poser et à vérifier ; des problèmes où l'on écrit l'égalité avec les unités : 2 458 œufs = 409 × 6 œufs + 4 œufs."),
      ph(T3, "10 min", "Ce qu'on retient : le reste est toujours plus petit que le diviseur."),
    ]),
    seance("S'entraîner", sauront("poser seul des divisions jusqu'à cinq chiffres et interpréter le reste dans un problème."), 30, [
      ph(T4, "25 min", "Des divisions à poser ; des problèmes où le reste compte — combien de boîtes faut-il pour tout ranger ?"),
      ph(T3, "5 min", "Le reste, selon la question : on l'ignore, ou il faut une boîte de plus."),
    ]),
    evaluation("poser des divisions euclidiennes et vérifier leur résultat", "Ensuite, au CM2, la division décimale."),
  ],
};

const ESTIMER_CALCULER_CM2: Demarche = {
  id: "estimer-calculer-cm2", nom: "Estimer un résultat ; calculer avec des parenthèses (CM2)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Estimer : 1 212 L − 496 L est proche de 700 L ; 724 × 68 est proche de 50 000, car 700 × 70 = 49 000 ; 59 437 kg ÷ 6 est proche de 10 000 kg. Choisir la meilleure estimation de 32 × 3 182,5 parmi 1 000, 10 000, 100 000 et 1 000 000. Calculer avec une ou deux paires de parenthèses : (15 − 7) × (6 + 3) ; 37 − (3 × (14 − 6)).",
  seances: [
    seance("Estimer", sauront("estimer une somme, une différence, un produit, un quotient et choisir la meilleure estimation."), 45, [
      ph(T1, "10 min", "32 × 3 182,5 : plutôt 1 000, 10 000, 100 000 ou 1 000 000 ?"),
      ph(T2, "25 min", "Arrondir, calculer de tête avec les puissances de dix : 700 × 70 = (7 × 7) × (100 × 10) ; écrire ≈."),
      ph(T3, "10 min", "Ce qu'on retient : l'estimation dit l'ordre de grandeur, et trahit les erreurs de virgule."),
    ]),
    seance("Deux paires de parenthèses", sauront("calculer avec une ou deux paires de parenthèses, même imbriquées."), 45, [
      ph(T1, "10 min", "37 − (3 × (14 − 6)) : par où commencer ?"),
      ph(T2, "25 min", "Des calculs écrits étape par étape, des parenthèses les plus intérieures vers l'extérieur ; traduire un problème par un calcul."),
      ph(T3, "10 min", "Ce qu'on retient : d'abord les parenthèses les plus intérieures."),
    ]),
    evaluation("estimer des résultats et calculer avec des parenthèses", "Ensuite, l'estimation à chaque calcul posé."),
  ],
};

const MULTIPLICATION_DECIMAL_CM2: Demarche = {
  id: "multiplication-decimal-cm2", nom: "Multiplier un décimal par un entier (CM2)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Poser et effectuer la multiplication d'un décimal par un entier : 876 × 20,8 ou 8,76 × 208. On calcule comme avec des entiers, puis la virgule : autant de chiffres après elle que dans le décimal — et l'estimation contrôle.",
  seances: [
    seance("Poser et placer la virgule", sauront("poser la multiplication d'un décimal par un entier à plusieurs chiffres et placer la virgule."), 45, [
      ph(T1, "10 min", "8,76 × 208 et 876 × 2,08 : mêmes chiffres, mais quels résultats ? On estime d'abord."),
      ph(T2, "25 min", "Poser comme des entiers, puis placer la virgule en comptant les chiffres après la virgule du décimal ; justifier par les centièmes."),
      ph(T3, "10 min", "La règle, et l'estimation qui la contrôle.", ESTIMER),
    ]),
    seance("S'entraîner", sauront("poser seul des multiplications de décimaux par des entiers."), 30, [
      ph(T4, "25 min", "Des calculs à poser ; des problèmes de prix et de mesures."),
      ph(T3, "5 min", "Les erreurs de virgule, repérées par l'estimation."),
    ]),
    evaluation("multiplier un décimal par un entier", "Ensuite, en sixième, multiplier deux décimaux."),
  ],
};

const DIVISION_DECIMALE_CM2: Demarche = {
  id: "division-decimale-cm2", nom: "La division décimale (CM2)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Poser et effectuer la division décimale d'un entier ou d'un décimal jusqu'à cinq chiffres par un entier à un chiffre — 785 ÷ 4 ; 148,2 ÷ 5. Les divisions s'arrêtent au plus tard au centième, avec un reste nul : 9 855 ÷ 6 ; 7 854 ÷ 8 ; 986,3 ÷ 5.",
  seances: [
    seance("Continuer après l'unité", sauront("continuer une division au-delà des unités, en partageant le reste en dixièmes puis en centièmes."), 45, [
      ph(T1, "10 min", "785 € à partager entre 4 : 196 € chacun, et il reste 1 €. Peut-on partager ce dernier euro ?"),
      ph(T2, "25 min", "1 €, c'est 10 dixièmes, puis 100 centièmes : on continue la division ; on ajoute des zéros après la virgule du dividende : 785,00."),
      ph(T3, "10 min", "Ce qu'on retient : quand j'abaisse le premier chiffre après la virgule, je mets la virgule au quotient."),
    ]),
    seance("Un dividende décimal", sauront("diviser un nombre décimal par un entier à un chiffre."), 45, [
      ph(T1, "10 min", "148,2 ÷ 5 : la virgule du quotient arrive quand on abaisse le 2."),
      ph(T2, "25 min", "Des divisions de décimaux, jusqu'au centième ; on vérifie par la multiplication."),
      ph(T3, "10 min", "La trace écrite : une division décimale posée, la virgule au quotient."),
    ]),
    seance("Des problèmes", sauront("résoudre des problèmes de partage avec une division décimale."), 30, [
      ph(T2, "25 min", "Partager une somme, une longueur, une masse ; la réponse par une phrase, avec l'unité."),
      ph(T3, "5 min", "On compare la division euclidienne et la division décimale : laquelle répond à la question ?"),
    ]),
    evaluation("poser des divisions décimales", "Ensuite, en sixième, diviser par un nombre à deux chiffres."),
  ],
};

export const DEMARCHES_CALCUL_CM: Demarche[] = [
  ESTIMER_CALCULER_CM1, POSEES_DECIMAUX_CM1, MULTIPLICATION_POSEE_CM1, MULTIPLICATION_DECIMAL_CM1, DIVISION_CM1,
  ESTIMER_CALCULER_CM2, MULTIPLICATION_DECIMAL_CM2, DIVISION_DECIMALE_CM2,
];

/** La séquence d'une compétence des quatre opérations du cours moyen ; rien sinon. En minuscules sans accents. */
export function demarcheDuCalculCM(classe: string, comp: string): string | null {
  if (classe === "cm1") {
    if (/estimer|parentheses/.test(comp)) return "estimer-calculer-cm1";
    if (/additions et des soustractions de nombres decimaux/.test(comp)) return "posees-decimaux-cm1";
    if (/multiplications de deux nombres entiers/.test(comp)) return "multiplication-posee-cm1";
    if (/nombre decimal par un nombre entier/.test(comp)) return "multiplication-decimal-cm1";
    if (/division/.test(comp)) return "division-cm1";
  }
  if (classe === "cm2") {
    if (/estimer|parentheses/.test(comp)) return "estimer-calculer-cm2";
    if (/nombre decimal par un nombre entier/.test(comp)) return "multiplication-decimal-cm2";
    if (/division/.test(comp)) return "division-decimale-cm2";
  }
  return null;
}

// ── Les feuilles ──────────────────────────────────────────────────────────

/** Une feuille de l'atelier « Le calcul — CM1, CM2 », qui la refait avec les mêmes réglages et le même tirage. */
const calcul = (seance: number, titre: string, r: Partial<ReglagesCalculCM>): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_CALCUL_CM, ...r, titre };
  return {
    seance, atelier: "calculCM", titre,
    fabriquer: (g) => ({ html: htmlCalculCM(reglages, g), style: STYLE_FEUILLE + STYLE_CALCUL_CM, refaire: { calculCM: reglages } }),
  };
};

const CM1 = { classe: "CM1" as const };
const CM2 = { classe: "CM2" as const };

const PLANS: Record<string, { feuilles: FeuilleAFabriquer[]; materiel: string[] }> = {
  "estimer-calculer-cm1": {
    feuilles: [
      calcul(0, "Estimer un résultat", { ...CM1, exercice: "estimer", combien: 8 }),
      calcul(1, "Estimer pour contrôler", { ...CM1, exercice: "estimer", combien: 8 }),
      calcul(2, "Calculer avec des parenthèses", { ...CM1, exercice: "parentheses", combien: 8 }),
      calcul(3, "Les parenthèses — évaluation", { ...CM1, exercice: "parentheses", combien: 6 }),
      calcul(3, "Estimer — évaluation", { ...CM1, exercice: "estimer", combien: 6 }),
    ],
    materiel: ["Les ardoises", "Des résultats d'élèves à contrôler, au tableau", "Les ardoises", "Les énoncés"],
  },
  "posees-decimaux-cm1": {
    feuilles: [
      calcul(0, "Additions posées de décimaux", { ...CM1, exercice: "addition-decimaux", combien: 6, posees: true }),
      calcul(1, "Soustractions posées de décimaux", { ...CM1, exercice: "soustraction-decimaux", combien: 6, posees: true }),
      calcul(2, "Additions de décimaux à poser", { ...CM1, exercice: "addition-decimaux", combien: 6, posees: false }),
      calcul(2, "Soustractions de décimaux à poser", { ...CM1, exercice: "soustraction-decimaux", combien: 6, posees: false }),
      calcul(3, "Décimaux posés — évaluation", { ...CM1, exercice: "soustraction-decimaux", combien: 6, posees: false }),
    ],
    materiel: ["Le tableau de numération, avec les dixièmes et les centièmes", "Le cahier", "Des tickets de caisse", "Les énoncés"],
  },
  "multiplication-posee-cm1": {
    feuilles: [
      calcul(0, "Multiplications posées — par deux chiffres", { ...CM1, exercice: "multiplication-entiers", combien: 6, chiffresDuSecond: 2 }),
      calcul(1, "Multiplications posées — par trois chiffres", { ...CM1, exercice: "multiplication-entiers", combien: 6, chiffresDuSecond: 3 }),
      calcul(2, "Multiplications à poser", { ...CM1, exercice: "multiplication-entiers", combien: 6, chiffresDuSecond: 2, posees: false }),
      calcul(3, "Multiplications posées — évaluation", { ...CM1, exercice: "multiplication-entiers", combien: 6, chiffresDuSecond: 3, posees: false }),
    ],
    materiel: ["Les tables de multiplication", "Les tables", "Le cahier", "Les énoncés"],
  },
  "multiplication-decimal-cm1": {
    feuilles: [
      calcul(1, "Multiplier un décimal par un entier", { ...CM1, exercice: "multiplication-decimal", combien: 6, posees: true }),
      calcul(2, "Multiplier un décimal — à poser", { ...CM1, exercice: "multiplication-decimal", combien: 6, posees: false }),
      calcul(3, "Multiplier un décimal — évaluation", { ...CM1, exercice: "multiplication-decimal", combien: 6, posees: false }),
    ],
    materiel: ["Des bouteilles, des étiquettes de prix", "Le tableau de numération", "Des catalogues de prix", "Les énoncés"],
  },
  "division-cm1": {
    feuilles: [
      calcul(1, "Divisions posées", { ...CM1, exercice: "division-euclidienne", combien: 4, posees: true }),
      calcul(2, "Divisions à poser et à vérifier", { ...CM1, exercice: "division-euclidienne", combien: 4, posees: false }),
      calcul(3, "Divisions — entraînement", { ...CM1, exercice: "division-euclidienne", combien: 4, posees: false }),
      calcul(4, "Divisions — évaluation", { ...CM1, exercice: "division-euclidienne", combien: 4, posees: false }),
    ],
    materiel: ["Des images ou des jetons à partager", "Le matériel multibase, pour qui en a besoin", "Les tables de multiplication", "Des boîtes dessinées", "Les énoncés"],
  },
  "estimer-calculer-cm2": {
    feuilles: [
      calcul(0, "Estimer un résultat", { ...CM2, exercice: "estimer", combien: 8 }),
      calcul(1, "Calculer avec des parenthèses", { ...CM2, exercice: "parentheses", combien: 8 }),
      calcul(2, "Estimer et calculer — évaluation", { ...CM2, exercice: "parentheses", combien: 6 }),
    ],
    materiel: ["Les ardoises", "Le cahier", "Les énoncés"],
  },
  "multiplication-decimal-cm2": {
    feuilles: [
      calcul(0, "Multiplier un décimal par un entier", { ...CM2, exercice: "multiplication-decimal", combien: 6, posees: true }),
      calcul(1, "Multiplier un décimal — à poser", { ...CM2, exercice: "multiplication-decimal", combien: 6, posees: false }),
      calcul(2, "Multiplier un décimal — évaluation", { ...CM2, exercice: "multiplication-decimal", combien: 6, posees: false }),
    ],
    materiel: ["Le cahier", "Des catalogues de prix", "Les énoncés"],
  },
  "division-decimale-cm2": {
    feuilles: [
      calcul(0, "Divisions décimales — un dividende entier", { ...CM2, exercice: "division-decimale", combien: 4, posees: true, dividende: "entier" }),
      calcul(1, "Divisions décimales — un dividende décimal", { ...CM2, exercice: "division-decimale", combien: 4, posees: true, dividende: "decimal" }),
      calcul(2, "Divisions décimales à poser", { ...CM2, exercice: "division-decimale", combien: 4, posees: false, dividende: "entier" }),
      calcul(3, "Divisions décimales — évaluation", { ...CM2, exercice: "division-decimale", combien: 4, posees: false, dividende: "decimal" }),
    ],
    materiel: ["Des pièces et des billets factices", "Le tableau de numération", "Des énoncés de partages", "Les énoncés"],
  },
};

export const estUneDemarcheDuCalculCM = (id: string) => id in PLANS;

export function planDuCalculCM(demarcheId: string, _ctx?: ContexteFeuilles): PlanDesFeuilles | null {
  const p = PLANS[demarcheId];
  if (!p) return null;
  const materiel = p.materiel.map((debut, s) => {
    const f = p.feuilles.filter((x) => x.seance === s).map((x) => `« ${x.titre} »`);
    return f.length ? `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${f.join(" et ")}.` : `${debut}.`;
  });
  return { feuilles: p.feuilles, materiel };
}
