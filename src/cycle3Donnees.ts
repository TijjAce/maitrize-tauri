// L'organisation et la gestion de données, et les probabilités, au cours
// moyen. Les probabilités suivent la séquence n° 3 des livrets
// d'accompagnement du CM1 et du CM2 (Éduscol, 2026) : les bouteilles opaques
// et leur « contenu mystère », les mots puis l'échelle des probabilités au
// CM1 ; « a chances sur b » et l'arbre des possibles au CM2. Les données sont
// bâties, en le disant, sur le programme de mathématiques du cycle 3 (2025)
// et ses exemples de réussite.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { ContexteFeuilles, FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { REGLAGES_DONNEES_CM, STYLE_DONNEES_CM, htmlDonneesCM, type ExerciceDonneesCM } from "./donneesCoursMoyen";
import { REGLAGES_DONNEES, STYLE_DONNEES, htmlDonnees } from "./donnees";

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

// ── Les données ───────────────────────────────────────────────────────────

const donnees = (classe: "CM1" | "CM2"): Demarche => ({
  id: `donnees-${classe.toLowerCase()}`, nom: `Tableaux, diagrammes${classe === "CM2" ? ", diagrammes circulaires" : ""} et courbes (${classe})`, famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: `Mener une enquête — le moyen de transport, le sport pratiqué — ou des relevés au cours du temps — une température, une longueur, une masse —, compiler les données dans un tableau et les représenter par un diagramme en barres ou par des points dans un repère, reliés par une courbe, sur des axes gradués à une échelle adaptée. Lire et interpréter un tableau à simple ou à double entrée, un diagramme en barres${classe === "CM2" ? ", un diagramme circulaire" : ""} ou une courbe, deux courbes dans un même repère grâce à la légende ; résoudre des problèmes en une ou plusieurs étapes dont les données sont dans un tableau, sur un graphique, ou à la fois dans l'énoncé et sur le graphique — « plus de la moitié des filles viennent-elles à pied ou à vélo ? »${classe === "CM2" ? " ; quel volume de jus de litchi dans un verre de 250 mL d'un cocktail dont la recette est un diagramme circulaire ?" : ""}`,
  seances: [
    seance("Du relevé au graphique", sauront("compiler des données dans un tableau et les représenter par un diagramme en barres."), 45, [
      ph(T1, "10 min", "Une enquête dans la classe : comment chacun vient-il à l'école ? On relève, puis on compte."),
      ph(T2, "25 min", "Le tableau, puis le diagramme en barres : choisir l'échelle de l'axe, tracer les barres ; ou des relevés de température, des points dans un repère reliés par une courbe."),
      ph(T3, "10 min", "Ce qu'on retient : l'axe est gradué régulièrement ; la hauteur de la barre dit la valeur."),
    ]),
    seance(classe === "CM1" ? "Lire un tableau, un diagramme, une courbe" : "Lire un diagramme circulaire, des courbes", sauront(classe === "CM1" ? "lire et interpréter un tableau à double entrée, un diagramme en barres et deux courbes avec leur légende." : "lire et interpréter un diagramme circulaire et deux courbes dans un même repère, avec leur légende."), 45, [
      ph(T1, "10 min", classe === "CM1" ? "Les hauteurs de pluie de deux villes : quelle courbe est celle de quelle ville ?" : "Les couleurs des voitures d'un parking : 30 blanches, 15 bleues, 10 noires, 5 vertes. Lequel de quatre diagrammes circulaires leur correspond ?"),
      ph(T2, "25 min", "Prélever une valeur, comparer, trouver le plus grand et le plus petit, une évolution ; justifier en montrant sur le graphique."),
      ph(T3, "10 min", classe === "CM1" ? "Ce qu'on retient : on lit la légende avant le graphique." : "Ce qu'on retient : dans un diagramme circulaire, la part du disque est la part du total."),
    ]),
    seance("Des problèmes avec des données", sauront("résoudre des problèmes dont les données sont dans un tableau ou sur un graphique, et dans l'énoncé."), 45, [
      ph(T2, "35 min", classe === "CM1"
        ? "Les filles et les garçons de chaque classe ; « il y a 11 filles en CM1 C : combien de garçons ? » ; plus de la moitié des élèves viennent-ils à pied ou à vélo ?"
        : "La recette du cocktail : 250 mL, deux cinquièmes de jus de litchi ; des problèmes en une ou deux étapes avec un tableau, un diagramme ou une courbe."),
      ph(T3, "10 min", "On compare les démarches : où a-t-on pris chaque donnée ?"),
    ]),
    evaluation("lire des tableaux et des graphiques et résoudre des problèmes", "Ensuite, des données dans les autres disciplines : la géographie, les sciences."),
  ],
});

// ── Les probabilités ──────────────────────────────────────────────────────

/** La séquence n° 3 du livret de CM1 : « Enseigner les probabilités ». */
const PROBABILITES_CM1: Demarche = {
  id: "probabilites-cm1", nom: "Les probabilités : impossible, certain, probable (CM1)", famille: "Mathématiques",
  source: "Livret d'accompagnement de mathématiques du CM1 (Éduscol, 2026), proposition de séquence n° 3 « Enseigner les probabilités »",
  resume: "La séquence du livret : se familiariser avec les expériences aléatoires, qualifier des évènements — certain, impossible, probable, peu probable, « une chance sur deux » — et les placer sur une échelle. Des bouteilles opaques, qui ne laissent voir qu'une bille quand on les retourne : leur « contenu mystère » se devine en les retournant de nombreuses fois, puis se dévoile. « Une chance sur deux » ne vient pas de ce qu'il y a deux couleurs, mais d'autant de billes vertes que de billes qui ne le sont pas. Le livret propose de recueillir d'abord les représentations des élèves — le biais d'équiprobabilité, l'effet mémoire, l'illusion de contrôle — par un court questionnaire.",
  seances: [
    seance("Impossible, certain, une chance sur deux (focus 1 du livret)", sauront("qualifier un évènement d'impossible, de certain, ou d'« une chance sur deux »."), 45, [
      ph(T1, "20 min", "Trois bouteilles de deux billes, rouges ou vertes ; on ne voit qu'une bille quand on les retourne. Comment trouver leur contenu sans les ouvrir ? On retourne, on note au tableau, puis on dévoile. « Obtenir une bille verte » : impossible avec la bouteille B, une chance sur deux avec la C, certain avec la A.",
        "Pour « une chance sur deux », partir des mots des élèves — « c'est pareil », « il y a autant de chances » — et préciser qu'il y a autant de billes vertes que de billes rouges."),
      ph(T2, "15 min", "Par deux : la bouteille D, quatre billes ; combien de vertes ? Retourner de nombreuses fois, en mélangeant, noter dans un tableau, puis dévoiler : 2 vertes, 1 rouge, 1 noire."),
      ph(T3, "10 min", "Sans retourner la bouteille : quelle couleur est la plus facile à obtenir ? La trace écrite : « il y a une chance sur deux d'obtenir une bille verte car la moitié des billes sont vertes »."),
    ]),
    seance("Questions flash (et plus si besoin)", sauront("réinvestir les mots impossible, certain et une chance sur deux, et justifier."), 10, [
      ph(T4, "10 min", "Des cartes de bouteilles projetées, la réponse sur l'ardoise, puis la justification par le contenu ; des évènements de la vie : naître un 30 février, impossible."),
    ]),
    seance("Probable, peu probable", sauront("estimer la probabilité d'un évènement avec les mots « probable » et « peu probable »."), 40, [
      ph(T1, "10 min", "Deux nouvelles bouteilles, E et F, de quatre billes jaunes ou vertes : que contiennent-elles ?"),
      ph(T2, "20 min", "En groupes : retourner, noter, émettre des hypothèses, puis dévoiler : une verte et trois jaunes ; trois vertes et une jaune."),
      ph(T3, "10 min", "« Obtenir une bille verte » : peu probable avec E, probable avec F. Peu probable, c'est moins d'une chance sur deux, mais pas impossible ; probable, plus d'une chance sur deux, mais pas certain."),
    ]),
    seance("Questions flash (plusieurs séances)", sauront("employer tout le vocabulaire des probabilités dans des situations variées."), 10, [
      ph(T4, "10 min", "Des évènements peu probables, probables, à une chance sur deux ; voir un arc-en-ciel après la pluie, c'est probable, car cela arrive souvent."),
    ]),
    seance("L'échelle des probabilités (focus 2 du livret)", sauront("ordonner des évènements selon leur probabilité sur une échelle."), 45, [
      ph(T1, "5 min", "Le jeu à deux : chacun retourne une carte de son paquet, on lance le dé ; si l'évènement de la carte se réalise, elle sort du jeu ; le premier qui n'a plus de cartes gagne."),
      ph(T2, "25 min", "Les binômes jouent : le paquet A — un nombre pair, un nombre supérieur à 1… — gagne presque toujours contre le paquet B — obtenir 3, un nombre supérieur à 5… Le jeu n'est pas équitable : pourquoi ?"),
      ph(T3, "15 min", "Placer chaque carte sur l'échelle — impossible, peu probable, une chance sur deux, probable, certain — affichée sur cinq feuilles A4 ; elle reste au mur."),
    ]),
    seance("Questions flash sur l'échelle (plusieurs séances)", sauront("placer des évènements sur l'échelle des probabilités."), 10, [
      ph(T4, "10 min", "Des billes, des dés, des situations de la vie : où placer l'évènement sur l'échelle ?"),
    ]),
    seance("Évaluation", sauront("qualifier et ordonner des évènements selon leur probabilité, seuls."), 30, [
      ph("Évaluation", "25 min", "Comme le propose le livret : des cartes représentées sur une feuille ; sous chacune, une formulation apprise, ou sa place sur l'échelle."),
      ph(T4, "5 min", "Ensuite, au CM2, « a chances sur b »."),
    ]),
  ],
};

/** La séquence n° 3 du livret de CM2 : « Enseigner les probabilités au CM2 ». */
const PROBABILITES_CM2: Demarche = {
  id: "probabilites-cm2", nom: "Les probabilités : « a chances sur b » et l'arbre des possibles (CM2)", famille: "Mathématiques",
  source: "Livret d'accompagnement de mathématiques du CM2 (Éduscol, 2026), proposition de séquence n° 3 « Enseigner les probabilités au CM2 »",
  resume: "La séquence du livret : déterminer une probabilité et l'exprimer sous la forme « a chances sur b », la comparer à « une chance sur deux », puis représenter une expérience aléatoire en deux étapes par un arbre des possibles. Les bouteilles opaques du CM1 reviennent — 2 noires et 2 blanches, 1 noire et 3 blanches, 3 noires et 1 blanche —, puis deux bouteilles retournées l'une après l'autre : trois billes, puis deux, six chemins. Les étapes sont indépendantes : le contenu de la seconde bouteille ne dépend pas de ce qui est sorti de la première. Au CM2, le travail sur les probabilités est amorcé au plus tard en période 2.",
  seances: [
    seance("« a chances sur b » (focus 1 du livret)", sauront("exprimer une probabilité sous la forme « a chances sur b » et la comparer à une chance sur deux."), 45, [
      ph(T1, "5 min", "La bouteille A : 2 noires et 2 blanches ; une chance sur deux d'obtenir une noire. Et les bouteilles B et C, de quatre billes noires ou blanches ?"),
      ph(T2, "15 min", "Par deux, retourner B ou C de nombreuses fois, noter, puis mettre en commun : une noire et une blanche sont apparues, donc 1, 2 ou 3 noires ; si le noir sort très souvent, il y en a presque sûrement trois. On dévoile."),
      ph(T3, "25 min", "Sans retourner les bouteilles : une chance sur quatre d'obtenir une noire avec B, trois chances sur quatre avec C ; comparer à une chance sur deux. Puis trois cartes de contenus : 2 noires et 2 blanches, 2 noires et 1 blanche, 1 noire et 4 blanches."),
    ]),
    seance("Questions flash : a chances sur b (plusieurs fois)", sauront("exprimer des probabilités sous la forme « a chances sur b », dans d'autres contextes."), 10, [
      ph(T4, "10 min", "Des contenus de bouteilles, un dé à six faces — autant de chances d'obtenir n'importe laquelle des faces —, un jeu de cartes ; la réponse sur l'ardoise, puis la justification."),
    ]),
    seance("Comparer, ordonner (plusieurs fois)", sauront("comparer et ordonner des probabilités exprimées sous la forme « a chances sur b »."), 20, [
      ph(T4, "15 min", "Quel évènement est le plus probable ? Un pique ou un as dans un jeu de 52 cartes ; placer des évènements sur l'échelle, avec leur probabilité « a chances sur b »."),
      ph(T3, "5 min", "Ce qu'on retient : a chances sur b est plus que une chance sur deux quand a est plus que la moitié de b."),
    ]),
    seance("L'arbre des possibles (focus 2 du livret)", sauront("construire un arbre pour recenser toutes les issues d'une expérience en deux étapes, et calculer une probabilité."), 45, [
      ph(T1, "10 min", "La bouteille D — une bille bleue, une rouge, une verte — et la bouteille E — une noire, une bleue — retournées ensemble ; on note les résultats. Toutes les combinaisons sont-elles sorties ?"),
      ph(T2, "25 min", "Les écrire ou les dessiner sans en oublier ; l'arbre au tableau : trois branches pour D, puis, au bout de chacune, deux branches pour E — le contenu de E ne change pas. Six chemins : une chance sur six d'obtenir bleue puis noire. Puis chacun construit l'arbre en commençant par E.",
        "Points de vigilance : les billes de la seconde bouteille s'écrivent au bout de chaque branche ; on entoure un chemin, pas des billes d'une même bouteille."),
      ph(T3, "10 min", "Ce qu'on retient : le nombre de chemins, c'est le nombre de branches de la première étape multiplié par celui de la seconde."),
    ]),
    seance("Des expériences répétées (plusieurs fois)", sauront("comprendre que les résultats précédents n'influencent pas le suivant, et utiliser un arbre."), 30, [
      ph(T4, "30 min", "Deux bouteilles de même contenu, puis la même bouteille retournée deux fois ; la pièce lancée deux fois : quatre issues, (F ; P) et (P ; F) sont différentes ; après trois « face », il y a toujours une chance sur deux."),
    ]),
    seance("D'autres contextes (plusieurs fois)", sauront("construire et utiliser un arbre pour calculer des probabilités dans des situations variées."), 30, [
      ph(T4, "30 min", "Une pièce puis une roue, deux dés, des menus : l'arbre, les issues, les probabilités sous la forme « a chances sur b »."),
    ]),
    seance("Évaluation", sauront("exprimer, comparer et calculer des probabilités, seuls."), 30, [
      ph("Évaluation", "25 min", "Comme le propose le livret : des cartes et leur probabilité « a chances sur b », leur place sur l'échelle, et un arbre à construire pour une expérience répétée."),
      ph(T4, "5 min", "Ensuite, en sixième, la probabilité comme nombre entre 0 et 1."),
    ]),
  ],
};

export const DEMARCHES_DONNEES_CM: Demarche[] = [donnees("CM1"), donnees("CM2"), PROBABILITES_CM1, PROBABILITES_CM2];

/** La séquence d'une compétence de données ou de probabilités du cours moyen ; rien sinon. En minuscules sans accents. */
export function demarcheDesDonneesCM(classe: string, cg: string): string | null {
  if (classe !== "cm1" && classe !== "cm2") return null;
  if (/probabilites/.test(cg)) return `probabilites-${classe}`;
  if (/gestion de donnees/.test(cg)) return `donnees-${classe}`;
  return null;
}

// ── Les feuilles ──────────────────────────────────────────────────────────

const donneesCM = (seance: number, titre: string, classe: "CM1" | "CM2", exercices: ExerciceDonneesCM[], combien = 4): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_DONNEES_CM, classe, exercices, combien, titre };
  return { seance, atelier: "donnees", titre, fabriquer: (g) => ({ html: htmlDonneesCM(reglages, g), style: STYLE_FEUILLE + STYLE_DONNEES_CM }) };
};
/** Le relevé, le tableau et le diagramme de l'atelier « Tableaux et diagrammes », avec la source du cycle 3. */
const releve = (seance: number, titre: string): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_DONNEES, exercice: "releve" as const, classe: "CE2" as const, combien: 6 };
  return {
    seance, atelier: "donnees", titre,
    fabriquer: (g) => ({ html: htmlDonnees(reglages, g).split("Programme de mathématiques du cycle 2, 2024.").join("Programme de mathématiques du cycle 3, 2025."), style: STYLE_FEUILLE + STYLE_DONNEES }),
  };
};

const PLANS: Record<string, { feuilles: FeuilleAFabriquer[]; materiel: string[] }> = {
  "donnees-cm1": {
    feuilles: [
      releve(0, "Du relevé au tableau et au diagramme"),
      donneesCM(0, "Construire un diagramme en barres", "CM1", ["barres-construire"]),
      donneesCM(1, "Lire un tableau et un diagramme", "CM1", ["tableau", "barres-lire"]),
      donneesCM(1, "Deux courbes dans un même repère", "CM1", ["courbes"]),
      donneesCM(2, "Des problèmes avec des données", "CM1", ["probleme", "tableau"]),
      donneesCM(3, "Les données — évaluation", "CM1", ["barres-lire", "probleme"]),
    ],
    materiel: ["Du papier quadrillé ; une règle", "Un tableau et des graphiques projetés", "Les énoncés", "Les énoncés"],
  },
  "donnees-cm2": {
    feuilles: [
      donneesCM(0, "Construire un diagramme en barres", "CM2", ["barres-construire", "tableau"]),
      donneesCM(1, "Le diagramme circulaire", "CM2", ["circulaire"]),
      donneesCM(1, "Deux courbes dans un même repère", "CM2", ["courbes"]),
      donneesCM(2, "Des problèmes avec des données", "CM2", ["probleme", "barres-lire"]),
      donneesCM(3, "Les données — évaluation", "CM2", ["circulaire", "probleme"]),
    ],
    materiel: ["Du papier quadrillé ; une règle", "Des diagrammes projetés", "Les énoncés", "Les énoncés"],
  },
  "probabilites-cm1": {
    feuilles: [
      donneesCM(1, "Impossible, certain, une chance sur deux", "CM1", ["qualifier"], 4),
      donneesCM(3, "Probable, peu probable", "CM1", ["qualifier", "colorier"], 4),
      donneesCM(4, "L'échelle des probabilités", "CM1", ["echelle"]),
      donneesCM(5, "Toutes les issues", "CM1", ["issues", "echelle"]),
      donneesCM(6, "Les probabilités — évaluation", "CM1", ["qualifier", "echelle"], 4),
    ],
    materiel: [
      "Trois bouteilles opaques de deux billes, et une de quatre par binôme, comme celles de l'annexe 1 du livret", "Les cartes des bouteilles projetées, les ardoises",
      "Deux bouteilles de quatre billes jaunes ou vertes", "Des cartes d'évènements de la vie", "Des dés à six faces ; les paquets de cartes A et B ; l'échelle des probabilités sur cinq feuilles A4",
      "L'échelle des probabilités, au mur", "Les cartes, sur une feuille",
    ],
  },
  "probabilites-cm2": {
    feuilles: [
      donneesCM(0, "a chances sur b", "CM2", ["chances"], 4),
      donneesCM(1, "a chances sur b — entraînement", "CM2", ["chances", "issues"], 4),
      donneesCM(2, "Comparer des probabilités", "CM2", ["comparer", "colorier"], 3),
      donneesCM(3, "L'arbre des possibles", "CM2", ["arbre"]),
      donneesCM(4, "Des expériences répétées", "CM2", ["independance"]),
      donneesCM(6, "Les probabilités — évaluation", "CM2", ["chances", "arbre"], 3),
    ],
    materiel: [
      "Des bouteilles opaques de quatre billes noires ou blanches, comme celles de l'annexe 1 du livret", "Les ardoises ; un dé, un jeu de 52 cartes", "L'échelle des probabilités",
      "Les bouteilles D et E", "Des pièces de monnaie, des bouteilles de même contenu", "Des dés, des roues", "Les énoncés",
    ],
  },
};

export const estUneDemarcheDesDonneesCM = (id: string) => id in PLANS;

export function planDesDonneesCM(demarcheId: string, _ctx?: ContexteFeuilles): PlanDesFeuilles | null {
  const p = PLANS[demarcheId];
  if (!p) return null;
  const materiel = p.materiel.map((debut, s) => {
    const f = p.feuilles.filter((x) => x.seance === s).map((x) => `« ${x.titre} »`);
    return f.length ? `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${f.join(" et ")}.` : `${debut}.`;
  });
  return { feuilles: p.feuilles, materiel };
}
