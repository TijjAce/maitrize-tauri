// La connaissance des nombres de 10 à 20, au CP : une séquence d'après un
// manuel de préparation au CRPE que l'enseignant a fourni dans « Adapter une
// fiche » (octobre 2026) — « Réussir mon CRPE, oral 2025-2026, épreuve de
// leçon, maths et français » (Nathan), sujet n° 1, « Les nombres CP »,
// p. 40-43.
//
// Le manuel détaille la séance 4 — six phases courtes, du collectif au
// binôme et à l'individuel — et dit ce que font les trois premières : les
// nombres jusqu'à 9 en liaison avec la grande section, la dizaine, les
// nombres de 10 à 16. Les séances 5 et 6 — comparer et ranger, l'évaluation —
// sont de Maitrize, et la source le dit. Le texte du manuel n'est pas repris :
// ses phases sont dites ici avec nos mots.
//
// La séquence sert « Connaitre la valeur des chiffres en fonction de leur
// position (unités, dizaines) », la compétence de sa séance 4 ; elle se
// place sous « Les nombres jusqu'à 59 », en période 2, où le manuel la met.
// Ses feuilles viennent des ateliers « Billes et calots », « L'abaque » et
// « La suite des nombres » (voir numerationCP.ts), à ses réglages : chacune
// se rouvre dans le sien. La séance de la dizaine prend aussi une feuille de
// l'atelier « Nombres en cubes » ; l'évaluation n'est qu'à la séquence.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import {
  STYLE_NUMERATION_CP, htmlAbaque, htmlBilles, htmlEvaluationDixAVingt, htmlSuite, reglagesAbaqueSurs, reglagesBillesSurs, reglagesSuiteSurs,
  titreAbaque, titreBilles, titreSuite, type ReglagesAbaque, type ReglagesBilles, type ReglagesSuite,
} from "./numerationCP";

export const DEMARCHE_DIX_A_VINGT = "nombres-10-20-cp";

const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const T4 = "Temps 4 – Automatisation, réinvestissement, transfert";
const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;

const MANUEL = "« Réussir mon CRPE — Oral 2025-2026, épreuve de leçon, Maths · Français » (D. Motteau, C. Jegaden, A.-R. Morel, S. Méric-Pons ; Nathan)";

export const NOMBRES_DE_10_A_20: Demarche = {
  id: DEMARCHE_DIX_A_VINGT,
  nom: "La connaissance des nombres de 10 à 20 (CP)",
  famille: "Mathématiques",
  source: `D'après ${MANUEL}, sujet n° 1, « Les nombres CP », p. 40-43 : la séance 4, détaillée, et le contenu des séances 1 à 3 ; `
    + "les séances 5 et 6 ajoutées par Maitrize ; programme de mathématiques du cycle 2 (2024)",
  resume: "Des nombres jusqu'à 9 à la dizaine, puis de 10 à 20. À l'oral, onze… seize cachent la dizaine ; dix-sept, dix-huit, dix-neuf la font "
    + "entendre, avec le sept, le huit, le neuf qu'on connaît déjà : la séance 4 s'appuie sur eux pour faire comprendre l'écriture à deux chiffres. "
    + "Deux matériels : les cubes et les barres pour grouper par dix ; l'abaque à deux tiges pour la valeur et la position — dix jetons verts "
    + "s'échangent contre un rouge, et c'est sa place qui fait la dizaine. Des phases courtes — un élève de CP reste rarement attentif plus d'une "
    + "dizaine de minutes —, qui alternent le collectif, le binôme et l'individuel.",
  visee: { intitule: /valeur des chiffres en fonction de leur position/i, niveaux: ["CP"] },
  seances: [
    seance("Les nombres jusqu'à 9 : dire, écrire, décomposer",
      sauront("dire, lire et écrire les nombres jusqu'à 9, les ranger, et les décomposer en deux parties : 7, c'est 4 et 3, ou 5 et 2."), 40, [
        ph(T1, "5 min", "Des collections de 1 à 9 objets, montrées un court instant : « Combien ? » On écrit le nombre sur l'ardoise.",
          "Part de ce qui a été fait en grande section : c'est la liaison GS-CP."),
        ph(T2, "20 min", "Par deux, une boîte de neuf jetons au plus : l'un en cache une partie dans sa main, l'autre dit combien sont cachés ; on dit « cinq et quatre, c'est neuf ». Puis les feuilles « Combien de billes ? » et « Deux tas de billes ».",
          "Fait dire les décompositions ; on vérifie en ouvrant la main."),
        ph(T3, "10 min", "Ce qu'on retient : toutes les façons de faire 7, 8 et 9 en deux parties ; les nombres de 1 à 9 rangés sur la frise de la classe."),
        ph(T4, "5 min", "Dictée de nombres jusqu'à 9 sur l'ardoise ; « Montrez-moi six avec vos doigts, de deux façons. »"),
      ]),
    seance("La dizaine : dix cubes font une barre",
      sauront("grouper une collection par dix, dire qu'une dizaine, c'est dix unités, et dénombrer une collection de 11 à 19 objets comme une dizaine et des unités."), 40, [
        ph(T1, "5 min", "Un tas de quatorze cubes sur le bureau : « Comment savoir combien il y en a sans se tromper ? » On les emboîte par dix."),
        ph(T2, "20 min", "Par deux, des tas de 11 à 19 cubes : former une barre de dix, dire combien de cubes restent seuls, écrire le nombre. Puis les feuilles « Un paquet de dix » et « Lire les cubes, écrire le nombre ».",
          "Les cubes et les barres sont le matériel du groupement : une barre ne se défait pas pour compter."),
        ph(T3, "10 min", "Ce qu'on retient : dix unités font une dizaine ; quatorze, c'est une dizaine et quatre unités."),
        ph(T4, "5 min", "« Montrez-moi une dizaine et trois unités » avec les cubes ; le nombre sur l'ardoise."),
      ]),
    seance("De 10 à 16 : ce que dit le nom, ce que dit l'écriture",
      sauront("lire, dire et écrire les nombres de 10 à 16, et dire que les mots onze à seize ne font pas entendre la dizaine alors que l'écriture chiffrée la montre : 13, c'est 1 dizaine et 3 unités."), 40, [
        ph(T1, "5 min", "La frise des nombres jusqu'à 16 au tableau ; on la lit. « Entendez-vous dix dans treize ? Et dans dix-sept ? »"),
        ph(T2, "20 min", "Construire chaque nombre de 10 à 16 avec une barre et des cubes ; associer son nom, son écriture chiffrée et son dessin. La feuille « De 10 à 16 : le nom et l'écriture ».",
          "Deux logiques : l'écriture chiffrée code une dizaine et des unités ; les mots onze à seize, eux, s'apprennent par cœur."),
        ph(T3, "10 min", "Ce qu'on retient : l'affiche des nombres de 10 à 16, chacun avec son nom, son écriture et son dessin — onze s'écrit 11, une dizaine et une unité."),
        ph(T4, "5 min", "Dictée et lecture de nombres de 10 à 16 ; le furet de un à seize."),
      ]),
    // La séance détaillée du manuel : ses six phases, leur forme de travail et leur durée.
    seance("17, 18, 19 : ce que les nombres disent de leur écriture",
      sauront("lire 17, 18 et 19 écrits en chiffres, les écrire sous la dictée, et dire ce que vaut chaque chiffre selon sa place : dans 18, le 1 compte une dizaine — dix unités —, le 8 compte huit unités."), 45, [
        ph("Phase 1 – Collectif", "5 min", "Un tas de vingt-cinq cubes sur le bureau : « Combien y en a-t-il ? » Deux ou trois élèves viennent compter devant la classe. On compare leurs résultats : comment ont-ils fait ? Pourquoi ne trouvent-ils pas tous le même nombre ?",
          "Fait dire les procédures : compter un à un, mettre de côté ce qui est compté, faire des paquets."),
        ph("Phase 2 – Individuel", "10 min", "Chacun reçoit une carte de billes dispersées — dix-neuf bleues, dix-huit rouges ou dix-sept vertes —, les compte et écrit le nombre sur l'ardoise. On lève les ardoises ; quelques élèves disent leur nombre. Au tableau : 19 billes bleues, 18 billes rouges, 17 billes vertes. La feuille « Combien de billes ? ».",
          "Interroge des élèves qui ont des cartes différentes ; fait lire les nombres écrits."),
        ph("Phase 3 – Collectif", "2 min", "La frise des nombres jusqu'à 20 au tableau : on la lit à voix haute. Un élève vient y écrire 17, 18, 19 dans l'ordre. « Comment le sait-on ? » On entend sept, huit, neuf dans dix-sept, dix-huit, dix-neuf : leur ordre est celui qu'on connaît jusqu'à dix."),
        ph("Phase 4 – Binômes", "10 min", "Des billes et un calot sortis de la poche : « Un calot, combien de billes cela vaut-il ? » On se met d'accord : un calot vaut dix billes. Par deux, la feuille « Qui a gagné ? » : un joueur a un calot et des billes, l'autre des billes seules. Deux ou trois minutes de recherche, puis des binômes expliquent : un calot et huit billes valent dix-huit billes ; dix-sept billes, c'est un calot et sept billes ; le premier a gagné.",
          "Différencie par les nombres ; accepte les deux chemins : remplacer le calot par dix billes, ou faire un calot de dix billes."),
        ph("Phase 5 – Binômes", "5 min", "Un abaque à deux tiges et une boîte de dix-neuf jetons verts par binôme : « Rangez les jetons sur l'abaque. » Une tige ne prend pas plus de dix jetons : on trouve dix et neuf, ou neuf et dix, qu'on lit « dix-neuf » ou « neuf-dix ». On rappelle l'échange : dix jetons verts contre un rouge. Deux élèves passent dans les rangs avec des jetons rouges et font l'échange ; on replace les jetons, on dit le nombre. Conclusion : c'est la place du jeton rouge qui dit la dizaine. La feuille « L'abaque à deux tiges ».",
          "Fait vérifier chaque échange : dix jetons verts, pas un de moins."),
        ph("Phase 6 – Individuel", "10 min", "La feuille « La frise jusqu'à 20 » : compléter la frise, puis les nombres juste avant et juste après ; qui a fini compare des quantités en billes et calots ou sur l'abaque.",
          "Observe qui s'appuie sur la frise, qui sur la dizaine et les unités."),
      ]),
    seance("Jusqu'à 20 : comparer et ranger",
      sauront("comparer deux nombres jusqu'à 20 en s'appuyant sur la dizaine et les unités, ranger des nombres et dire celui qui vient juste avant ou juste après."), 40, [
        ph(T1, "5 min", "Deux abaques au tableau, 15 et 13 : « Lequel montre le plus grand nombre ? Comment le savoir sans compter tous les jetons ? » Même dizaine : on regarde les unités."),
        ph(T2, "20 min", "La feuille « Comparer et ranger de 10 à 20 » : des paires en chiffres, puis en abaques, en calots et billes, en mots ; ranger cinq nombres.",
          "Le matériel reste à disposition pour vérifier ; fait justifier : « 17, c'est une dizaine et sept unités ; 14, une dizaine et quatre. »"),
        ph(T3, "10 min", "Ce qu'on retient : de 10 à 19, chaque nombre a une dizaine ; pour comparer, on regarde les unités. 20, c'est deux dizaines."),
        ph(T4, "5 min", "Le nombre mystère : « Je suis juste après 17. » « J'ai une dizaine et cinq unités. » Dictée de nombres jusqu'à 20."),
      ]),
    seance("Évaluation",
      sauront("montrer ce qu'ils ont acquis, seuls : dénombrer une collection jusqu'à 20, lire un abaque, comparer avec des calots et des billes, compléter la frise, écrire des nombres dictés et relier un nombre à son nom."), 30, [
        ph("Évaluation", "20 min", "La feuille d'évaluation ; l'adulte dicte les nombres de l'exercice 5, écrits sur le corrigé.",
          "Observe sans aider : qui compte un à un, qui fait un paquet de dix, qui s'appuie sur la frise."),
        ph(T4, "10 min", "La remédiation à l'abaque et aux cubes pour qui en a besoin. Ce travail sur la dizaine se reprend tout au long du cycle 2, avec le calcul."),
      ]),
  ],
};

// ── Les feuilles des séances ──────────────────────────────────────────────

const STYLE = STYLE_FEUILLE + STYLE_NUMERATION_CP;

/** Une feuille d'un atelier, à ses réglages : le titre qu'elle imprime, et de quoi la refaire dans l'atelier. */
const billes = (seance: number, brut: Partial<ReglagesBilles>): FeuilleAFabriquer => {
  const r = reglagesBillesSurs(brut);
  return { seance, atelier: "billes", titre: titreBilles(r), fabriquer: (g) => ({ html: htmlBilles(r, g), style: STYLE, refaire: { billes: r } }) };
};
const abaque = (seance: number, brut: Partial<ReglagesAbaque>): FeuilleAFabriquer => {
  const r = reglagesAbaqueSurs(brut);
  return { seance, atelier: "abaque", titre: titreAbaque(r), fabriquer: (g) => ({ html: htmlAbaque(r, g), style: STYLE, refaire: { abaque: r } }) };
};
const suite = (seance: number, brut: Partial<ReglagesSuite>): FeuilleAFabriquer => {
  const r = reglagesSuiteSurs(brut);
  return { seance, atelier: "suiteNombres", titre: titreSuite(r), fabriquer: (g) => ({ html: htmlSuite(r, g), style: STYLE, refaire: { suiteNombres: r } }) };
};

const FEUILLES: FeuilleAFabriquer[] = [
  billes(0, { exercice: "compter", de: 4, a: 9, nombre: 6 }), billes(0, { exercice: "deux", de: 6, a: 9, nombre: 4 }),
  billes(1, { exercice: "paquets", de: 12, a: 19, nombre: 3 }),
  suite(2, { exercices: ["relier", "dizaines", "dessiner"], de: 10, a: 16 }),
  // La séance du manuel : les trois cartes de billes, qui a gagné, l'abaque, la frise.
  billes(3, { exercice: "compter", de: 17, a: 19, nombre: 3 }), billes(3, { exercice: "partie", de: 10, a: 20, nombre: 4 }),
  abaque(3, { parties: ["echange", "lire", "dessiner"], de: 10, a: 20, nombre: 4 }), suite(3, { exercices: ["manquants", "voisins"], de: 1, a: 20 }),
  suite(4, { exercices: ["plusGrand", "formes", "ranger"], de: 10, a: 20 }),
  { seance: 5, atelier: "billes", titre: "Évaluation — les nombres de 10 à 20", fabriquer: (g) => ({ html: htmlEvaluationDixAVingt(g), style: STYLE }) },
];

/** Ce qu'il faut préparer, séance par séance ; les feuilles sont nommées après. */
const MATERIEL = [
  "Des jetons ou des billes, de quoi faire des collections jusqu'à 9 ; une boîte de neuf jetons par binôme ; les ardoises",
  "Des cubes emboîtables, de quoi faire une barre de dix et des cubes seuls par binôme ; des tas de 11 à 19 cubes ; les ardoises",
  "Les barres et les cubes ; la frise des nombres jusqu'à 16 ; des étiquettes des nombres de 10 à 16, en chiffres et en mots",
  "Un tas de vingt-cinq cubes ; les ardoises ; la frise des nombres jusqu'à 20 au tableau ; des billes et des calots ; un abaque à deux tiges par binôme — dix jetons au plus par tige —, une boîte de dix-neuf jetons verts par binôme, des jetons rouges pour les échanges ; les cartes de billes à découper",
  "Deux abaques au tableau ; les abaques, les billes et les calots, la frise pour vérifier",
  "Les abaques et les cubes pour la remédiation",
];

export const estUneDemarcheDixAVingt = (id: string) => id === DEMARCHE_DIX_A_VINGT;

/** Les feuilles et le matériel de la séquence ; `autres` : les feuilles d'un atelier qu'on y ajoute, à leur séance. */
export function planDixAVingt(autres: FeuilleAFabriquer[] = []): PlanDesFeuilles {
  const feuilles = [...FEUILLES, ...autres].sort((a, b) => a.seance - b.seance);
  const materiel = MATERIEL.map((debut, s) => {
    const f = feuilles.filter((x) => x.seance === s).map((x) => `« ${x.titre} »`);
    if (!f.length) return `${debut}.`;
    const liste = f.length > 1 ? `${f.slice(0, -1).join(", ")} et ${f[f.length - 1]}` : f[0];
    return `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${liste}.`;
  });
  return { feuilles, materiel };
}
