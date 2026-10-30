// Les problèmes de composition d'états, au CE1 : une séquence d'après le
// manuel de préparation au CRPE que l'enseignant a fourni dans « Adapter une
// fiche » (octobre 2026) — « Réussir mon CRPE, oral 2025-2026, épreuve de
// leçon, maths et français » (Nathan), sujet n° 13, « Résolution de
// problèmes – structures additives CE1 », p. 203-216.
//
// Le manuel veut une séquence filée sur toute l'année, sur les problèmes de
// composition d'états — deux parties font un tout —, et détaille sa séance 4,
// en période 2 (p. 212-215) : trois problèmes tirés de la vie de la classe,
// qui prépare une rencontre sportive, cherchés seul puis en petits groupes,
// mis en commun ; deux affiches de référence, le tout et ce qu'il manque ;
// un entraînement qui sert de première évaluation. Il dit aussi que chercher
// le tout et chercher une partie n'ont pas la même difficulté (p. 211), et
// qu'on se dégage peu à peu de la manipulation (p. 203-205) : les séances 1
// à 3 vont donc du tout — de vrais objets, puis le dessin, puis le schéma —
// à la partie cachée, par manipulation. Les séances 5 et 6 — ranger les
// problèmes sous leur affiche, rendre la monnaie, l'évaluation et les
// remédiations — suivent ce qu'il dit des affiches de référence (p. 204), sa
// conclusion et les questions du jury (p. 216).
// Ces cinq séances sont de Maitrize, et la source le dit. La séance du manuel
// s'ouvre sur un calcul mental — des jetons qu'on ajoute à une boîte, ou
// qu'on en retire — : il ouvre ici les six. Le texte du manuel n'est pas
// repris : ses phases sont dites ici avec nos mots, et ses trois problèmes
// gardent leur structure et leurs nombres, sans prénom.
//
// Ses feuilles viennent des ateliers « Calcul mental », « Problèmes
// partie-tout », « Problèmes et outils d'aide » — la fiche des trois problèmes
// de la rencontre et ses outils d'aide —, « Les maisons du tri » et « La
// monnaie », à leurs réglages : chacune se rouvre dans le sien.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { objectifParId } from "./faitsNumeriques";
import { REGLAGES_MARTINIERE, STYLE_MARTINIERE, calculsMartiniere, htmlMartiniere, type ReglagesMartiniere } from "./martiniere";
import { REGLAGES_MONNAIE, STYLE_MONNAIE, htmlMonnaie, type ReglagesMonnaie } from "./monnaie";
import {
  PRESENTATION_COMPLETE, STYLE_FEUILLE as STYLE_PROBLEMES, feuilleProblemes, genererPartieTout, type ContenuSchema, type InconnuePartieTout,
} from "./problemesBarres";
import { REGLAGES_TRI, STYLE_TRI, htmlTri, type ReglagesTri } from "./triEtiquettes";
import { PROBLEMES_DE_LA_RENCONTRE, STYLE_PROBLEMES_AIDES, htmlProblemesAides, type ReglagesProblemesAides } from "./problemesEtOutilsDAide";

export const ID_PROBLEMES_ADDITIFS_CE1 = "compositions-etats-ce1";

const LM = "Calcul mental — procédé La Martinière";
const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const T4 = "Temps 4 – Automatisation, réinvestissement, transfert";
const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;

const MANUEL = "« Réussir mon CRPE — Oral 2025-2026, épreuve de leçon, Maths · Français » (D. Motteau, C. Jegaden, A.-R. Morel, S. Méric-Pons ; Nathan)";

/** Le calcul mental de chaque séance : l'objectif de l'atelier « Calcul mental » qu'elle travaille. */
const CALCUL_MENTAL = ["ce1-tables-addition", "ce1-doubles", "ce1-tables-addition", "ce1-tables-addition", "ce1-soustraire-unites", "ce1-dizaines-centaines"];
const ROUTINE = "L'enseignant dit le calcul ; après un court temps de réflexion, chacun écrit le résultat sur son ardoise et la lève au signal.";
const CHAQUE_JOUR = "En début de séance, chaque jour : de petites situations additives, pour préparer les problèmes.";

export const DEMARCHE_PROBLEMES_ADDITIFS_CE1: Demarche = {
  id: ID_PROBLEMES_ADDITIFS_CE1,
  nom: "Problèmes de composition d'états : le tout ou ce qu'il manque (CE1)",
  famille: "Mathématiques",
  source: `D'après ${MANUEL}, sujet n° 13, « Résolution de problèmes – structures additives CE1 », p. 203-216 : la séquence filée sur l'année, `
    + "sa progression et sa période (p. 203 et 211), la séance 4 détaillée, son calcul mental compris (p. 212-215) ; les séances 1 à 3, 5 et 6, "
    + "calcul mental compris, ajoutées par Maitrize, d'après les documents, les prérequis, la conclusion et les questions du jury "
    + "(p. 203-205, 211-212 et 216) ; programme de mathématiques du cycle 2 (2024)",
  resume: "Au CE1, en période 2, une séquence filée sur l'année : les problèmes de composition d'états, où deux parties font un tout. On cherche "
    + "d'abord le tout, avec de vrais objets, puis un dessin, puis un schéma ; puis une partie cachée, en complétant. La séance 4 part de la "
    + "rencontre sportive que prépare la classe : combien d'enfants en tout, combien de places libres dans le car, combien de ballons manquent. "
    + "On cherche seul, puis en groupes, on compare les façons de faire ; deux affiches de référence, « en tout » et « ce qu'il manque », disent "
    + "l'opération qui résout : une addition, une soustraction. Ensuite, on range les problèmes sous leur affiche, on rend la monnaie, on évalue "
    + "et l'on reprend avec des objets. Le calcul mental ouvre chaque séance : des jetons qu'on ajoute à une boîte, ou qu'on en retire.",
  visee: { intitule: /problèmes additifs en une étape de type parties-tout/i, niveaux: ["CE1"] },
  seances: [
    seance("Combien en tout ? Réunir deux collections",
      sauront("trouver combien il y a en tout quand on connaît les deux parties d'une collection : en réunissant de vrais objets, en dessinant, puis en écrivant une addition."), 45, [
        ph(LM, "10 min", `Les tables d'addition dans les deux sens — « 8 plus 5 », « 6 plus combien égale 14 ? » —, puis une scène de la boîte : l'enseignant y compte des jetons, en ajoute d'autres sous les yeux de la classe ; combien y en a-t-il maintenant ? ${ROUTINE}`,
          `${CHAQUE_JOUR} On rouvre la boîte pour vérifier.`),
        ph(T1, "5 min", "La classe prépare une rencontre sportive avec une autre classe de CE1 : il faudra des ballons. Dans le local de sport, deux bacs : 7 ballons rouges dans l'un, 5 ballons jaunes dans l'autre. Combien de ballons a-t-on pour les jeux ? On fait des propositions, puis on vérifie en réunissant les ballons.",
          "Annonce le but : savoir combien il y a en tout quand on connaît les deux parties. Fait raconter la situation avant de chercher."),
        ph(T2, "20 min", "Par deux, deux boîtes de jetons, une rouge et une bleue : on dit combien il y en a dans chacune, puis combien en tout — en recomptant tout, en comptant à partir de la plus grande boîte, ou en calculant. Puis les boîtes restent fermées, leur nombre écrit dessus : on dessine, ou on calcule. Enfin la feuille « Problèmes — combien en tout ? » : on lit, on dessine dans le cadre, on écrit l'addition et la phrase réponse.",
          "Observe les procédures : tout recompter un par un, compter à partir du plus grand nombre, calculer. Aides : rouvrir les boîtes ; lire l'énoncé à voix haute, le faire raconter."),
        ph(T3, "5 min", "Ce qu'on retient : on connaît les deux parties, on cherche le tout ; on peut réunir et compter, mais l'addition va plus vite : 7 + 5 = 12. Dans le cahier : le dessin des deux bacs et l'addition."),
        ph(T4, "5 min", "Sur l'ardoise, des problèmes dits : « Dans le bac, 9 cerceaux bleus et 6 cerceaux verts : combien de cerceaux ? » Chacun écrit l'addition et son résultat."),
      ]),
    seance("Du dessin au schéma",
      sauront("représenter un problème où l'on cherche le tout — le dessin des objets, puis un schéma de deux parties qui font le tout — et le résoudre par une addition, avec des nombres plus grands."), 45, [
        ph(LM, "10 min", `Les doubles — « le double de 14 », « 25 + 25 » — : ils aident à calculer de plus grandes sommes, comme 16 + 15. ${ROUTINE}`, CHAQUE_JOUR),
        ph(T1, "5 min", "Pour la rencontre, les chasubles : 16 rouges dans un sac, 12 bleues dans l'autre. Combien de chasubles en tout ? Deux élèves dessinent toutes les chasubles au tableau : c'est long. Comment faire plus vite ?",
          "Annonce le but : passer du dessin des objets à un schéma, plus rapide, qui montre comment les nombres vont ensemble."),
        ph(T2, "20 min", "Trois façons de représenter le même problème, côte à côte : le dessin de chaque objet ; un trait par objet ; le schéma — une case pour chaque partie avec son nombre, et la case du tout avec un « ? ». Puis l'écriture : 16 + 12 = ?. Par deux, un nouveau problème : chacun choisit sa façon, puis on compare. Enfin la feuille « Problèmes — le tout et son schéma » : on écrit les nombres dans les cases du schéma, puis le calcul et la phrase réponse.",
          "N'impose aucune façon de faire : le dessin, le trait, le schéma sont des étapes, que chacun franchit à son rythme. Erreur attendue : un nombre de l'énoncé dans la case du tout. Aides : rejouer avec les objets, colorier les deux parties."),
        ph(T3, "5 min", "Ce qu'on retient : le schéma montre les deux parties et le tout ; quand on cherche le tout, on additionne les parties. Dans le cahier : un problème, son schéma et son addition."),
        ph(T4, "5 min", "Un schéma au tableau : deux parties, 23 et 14, et le tout à trouver. Chacun invente une histoire à voix haute, puis écrit l'addition sur l'ardoise."),
      ]),
    seance("Une partie cachée",
      sauront("trouver la partie qui manque quand on connaît le tout et l'autre partie : en complétant avec des jetons, en comptant de la partie jusqu'au tout, puis en écrivant une addition à trou."), 45, [
        ph(LM, "10 min", `Les tables d'addition à trou — « 9 plus combien égale 15 ? », « 13, c'est 8 plus combien ? » — : de la partie au tout. Puis une scène de la boîte : des jetons tenus cachés dans la main. ${ROUTINE}`,
          `${CHAQUE_JOUR} Fait dire comment on a trouvé : on compte de 9 jusqu'à 15.`),
        ph(T1, "5 min", "Quinze jetons comptés devant la classe. L'enseignant en cache une partie sous sa main ; on en voit 9. Combien sont cachés ? On cherche, puis on soulève la main.",
          "Annonce le but : trouver une partie quand on connaît le tout et l'autre partie."),
        ph(T2, "20 min", "Par deux, vingt jetons au plus, comptés ensemble : l'un en cache une partie sous un gobelet, l'autre dit combien sont cachés — en comptant de ce qu'il voit jusqu'au tout, sur ses doigts ou avec d'autres jetons —, puis on soulève le gobelet. On écrit : 9 + ? = 15. Puis la feuille « Problèmes — l'autre partie » : on lit, on dessine le tout et la partie connue, on complète, puis on écrit le calcul et la phrase réponse.",
          "Erreur attendue : additionner les deux nombres de l'énoncé, 9 + 15. Aides : rejouer avec les jetons, dessiner d'abord le tout. Si un élève propose une soustraction, on la note au tableau : on y reviendra."),
        ph(T3, "5 min", "Ce qu'on retient : on connaît le tout et une partie ; pour trouver l'autre, on compte de la partie jusqu'au tout. De 9 pour aller à 15, il y a 6 : 9 + 6 = 15."),
        ph(T4, "5 min", "« J'ai 12 billes dans mes deux mains, 7 dans la main droite. Combien dans la gauche ? » Trois problèmes de ce genre, dits ; la réponse sur l'ardoise, puis on ouvre les mains."),
      ]),
    // La séance détaillée du manuel : ses six phases, leur organisation et leur durée — le calcul mental en tête.
    seance("La rencontre sportive : en tout, ou ce qu'il manque ?",
      sauront("résoudre des problèmes de composition d'états avec une procédure experte : une addition quand on cherche ce qu'il y a en tout, une soustraction — ou une addition à trou — quand on cherche ce qu'il manque."), 50, [
        ph(LM, "10 min", "Chacun pour soi, une scène que la classe regarde sans toucher : l'enseignant a une boîte et des jetons. Il y met 12 jetons et en ajoute 5 : combien maintenant ? Il en retire 3 et il en reste 7 : combien y en avait-il avant ? Il y en a 15, il en ajoute qu'il tient cachés dans sa main, et il y en a 20 : combien en a-t-il ajouté ? Après un court temps de réflexion, chacun écrit sa réponse sur l'ardoise ou sur une feuille ; on valide aussitôt.",
          "Fait varier ce qu'on cherche : la fin, le début, ce qu'on a ajouté. Même quand la scène se voit, des erreurs : la phrase mal comprise, une situation mal représentée, un calcul faux — le surcomptage surtout. Aide : rejouer la scène, rouvrir la boîte et compter."),
        ph("Phase 2 – Individuel", "5 min", "Recherche. L'enseignant annonce le travail et rappelle la rencontre sportive qui se prépare avec la classe de CE1 invitée. Chacun reçoit la feuille « La rencontre sportive : trois problèmes », écrits aussi au tableau : 1. Notre classe a 24 élèves, la classe invitée en a 18. Combien d'enfants seront à la rencontre ? 2. Le car de la classe invitée a 30 places. Une fois ses élèves assis, combien de places resteront libres ? 3. L'école a 15 ballons ; il en faut 25 pour les jeux. Combien de ballons faut-il demander aux invités d'apporter ? Puis chacun, seul quelques minutes, relit les problèmes et commence à chercher.",
          "Lit les énoncés à voix haute, puis en fait lire par quelques élèves ; explique un mot, pose des questions, répond à celles des élèves. Ensuite, observe."),
        ph("Phase 3 – Petits groupes", "10 min", "Recherche, en groupes homogènes de quatre. La consigne, écrite au tableau : on compare ses résultats, on se met d'accord sur les réponses, on les écrit sur la fiche A3 du groupe — la même feuille, imprimée en A3 : les trois énoncés, un cadre chacun — et, dans chaque cadre, on explique comment on a trouvé. Qui en a besoin reçoit un outil d'aide, découpé dans la même feuille : pour le premier problème, deux ronds dans un même cadre — notre classe, 24 élèves ; nos amis, 18 élèves — et une flèche vers la case « ? élèves » ; pour les plus fragiles, les mêmes ronds remplis de croix ; pour le car, une bande de 30 places en deux parties, les places occupées et les places libres ; pour les ballons, un rond de 15 ballons dessinés et un rond vide, qui font ensemble 25 ballons. Des jetons pour qui veut manipuler.",
          "Des groupes homogènes, pour qu'aucun élève sûr de lui n'impose ses résultats ni sa façon de faire ; une attention particulière aux groupes fragiles. Procédures attendues : dessiner les 24 élèves, puis les 18, et tout compter ; pour le car et les ballons, dessiner la première partie, compléter jusqu'au tout et compter ce qu'on a ajouté — une procédure de grande section, où l'on se trompe en dessinant ou en comptant, mais un pas vers l'abstraction ; 24 + 18 ; 18 + ? = 30 et 15 + ? = 25 ; 30 – 18 et 25 – 15. Une procédure juste n'empêche pas une erreur de calcul : la retenue de 24 + 18 se reprend aussi."),
        ph("Phase 4 – Collectif", "10 min", "Mise en commun : chaque groupe présente ses réponses et sa façon de faire, par la voix d'un rapporteur. On débat des réponses et des procédures, et l'on compare : telle façon de faire va-t-elle vite ? sans erreur ? Il y aura 42 enfants, 12 places libres, et il faut 10 ballons de plus.",
          "Mène le débat. Choisit parfois le rapporteur parmi les élèves qui ont du mal à dire ce qu'ils font, ou à comprendre les procédures. Revient sans cesse à la même question : quelle façon de faire va le plus vite, et le plus sûrement ?"),
        ph("Phase 5 – Collectif", "5 min", "Structuration, institutionnalisation. L'enseignant valide ou non les procédures, puis montre les procédures expertes, avec des mots simples : dans le premier problème, on cherche ce qu'il y a en tout ; dans les deux autres, on cherche ce qu'il manque. Deux affiches de référence : chacune reprend son énoncé et son schéma, son mot — « en tout » ou « ce qu'il manque » — et l'opération qui le résout : une addition, 24 + 18 = 42 ; une soustraction, 30 – 18 = 12 et 25 – 15 = 10.",
          "Écrit les affiches avec la classe : elles restent au mur, et chaque nouveau problème s'y rapportera."),
        ph("Phase 6 – Individuel", "10 min", "Entraînement, seul : la feuille « Problèmes — en tout, ou ce qu'il manque ». Elle sert de première évaluation. La correction collective rapproche chaque problème de l'affiche dont il suit la procédure.",
          "Repère les difficultés qui restent : l'énoncé mal compris, le dessin qui n'en finit pas, l'erreur de calcul. Elles guident les aides des séances suivantes."),
      ]),
    seance("Le tout ou ce qu'il manque ? Ranger les problèmes",
      sauront("dire, avant tout calcul, si un problème cherche le tout ou ce qu'il manque, le rapprocher de l'affiche qui lui ressemble et le résoudre — avec les objets de la classe, puis avec la monnaie."), 45, [
        ph(LM, "10 min", `Soustraire un nombre à un chiffre — « 43 – 5 », « 30 – 8 » — : la soustraction, qui trouve ce qu'il manque, devient un outil. ${ROUTINE}`, CHAQUE_JOUR),
        ph(T1, "5 min", "Les deux affiches de la rencontre sportive, relues : ce que dit chaque problème, ce qu'on y cherche, l'opération qui le résout. Le but du jour : ranger de nouveaux problèmes sous l'affiche qui leur ressemble, avant de calculer."),
        ph(T2, "15 min", "Par deux, les étiquettes de la feuille « Le tout ou ce qu'il manque ? » : on les découpe, on lit chaque problème — ou on se le fait lire —, on dit ce qui est connu et ce qu'on cherche, sans calculer, puis on le range dans sa maison. Ensuite chacun résout sur l'ardoise deux étiquettes de chaque maison, avec la procédure de l'affiche. Qui a fini invente un problème de la rencontre — les points de deux équipes — pour l'une des maisons.",
          "Ne laisse pas trier aux mots : « en tout » n'est pas toujours là quand on cherche le tout. Fait dire ce qui est connu : les deux parties, ou le tout et une partie. Aide : jouer la scène avec des objets."),
        ph(T3, "5 min", "Ce qu'on retient : un problème de chaque maison rejoint son affiche. On connaît les deux parties : on additionne. On connaît le tout et une partie : on soustrait, ou l'on cherche le nombre qui manque dans l'addition."),
        ph(T4, "10 min", "La même chose avec l'argent : la feuille « Rendre la monnaie ». On paie avec un billet ; on cherche ce qu'il faut ajouter au prix pour arriver au billet : c'est ce qu'il manque, la monnaie qu'on rend. La monnaie fictive pour vérifier.",
          "Fait le lien avec l'affiche : le billet, c'est le tout ; le prix, une partie ; la monnaie rendue, ce qu'il manque."),
      ]),
    seance("Évaluation et remédiations",
      sauront("résoudre seuls des problèmes où l'on cherche le tout ou ce qu'il manque ; ceux qui en ont besoin reprennent avec des objets et de petits nombres, les autres vont jusqu'aux problèmes à trois parties."), 45, [
        ph(LM, "10 min", `Ajouter ou soustraire des dizaines entières — « 45 + 20 », « 70 – 30 » — : de quoi calculer 24 + 18 en passant par 24 + 10. ${ROUTINE}`, CHAQUE_JOUR),
        ph("Évaluation", "20 min", "La feuille « Problèmes — évaluation » : des problèmes où l'on cherche le tout ou ce qu'il manque, à résoudre seul — le dessin, le schéma ou le calcul, au choix — avec la phrase réponse. Les affiches restent au mur.",
          "Observe sans aider : qui dessine tout, qui fait un schéma, qui calcule ; qui additionne toujours ; qui se trompe dans le calcul. Lit l'énoncé à voix haute à qui ne lit pas encore seul."),
        ph("Remédiations", "15 min", "Pour qui en a besoin : rejouer chaque histoire avec les objets — les ballons, les jetons, la boîte —, la raconter, puis la feuille « Problèmes — de petits nombres » ; les erreurs de calcul se reprennent avec les barres de dix et les cubes. Les autres : la feuille « Problèmes — trois parties », un tout fait de trois parties, qu'on cherche parfois en deux étapes. Ensuite, des problèmes chaque semaine, toute l'année, rapprochés des affiches.",
          "Reprend avec le matériel ce que l'évaluation a montré ; réduit les nombres plutôt que de faire à la place de l'élève. Les problèmes du champ additif reviendront au CE2, plus complexes."),
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

/**
 * Quatre problèmes de l'atelier partie-tout : le tout, une partie, ou l'un puis l'autre ; deux parties, ou trois. Le schéma
 * en cases vides à compléter, ou un cadre pour dessiner. L'atelier les refait, avec les mêmes réglages et le même tirage.
 */
const problemes = (seance: number, titre: string, inconnue: InconnuePartieTout, max: number, schema: ContenuSchema, parties = 2): FeuilleAFabriquer => {
  const presentation = { ...PRESENTATION_COMPLETE, schema };
  return {
    seance, atelier: "partieTout", titre,
    fabriquer: (g) => ({
      html: feuilleProblemes(genererPartieTout({ nombre: 4, parties, inconnue, max, enonces: true, prenoms: [] }, g), titre, presentation),
      style: STYLE_PROBLEMES,
      refaire: { partieTout: { titre, nombre: 4, prenoms: "", parties, inconnue, max, perso: false }, "presentation:partieTout": presentation },
      graine: g,
    }),
  };
};

/** Le tri des problèmes, dans l'atelier « Les maisons du tri » : des énoncés écrits pour Maitrize, deux maisons. */
const TRI: ReglagesTri = {
  ...REGLAGES_TRI, titre: "Le tout ou ce qu'il manque ?",
  consigne: "Je découpe les étiquettes. Je lis chaque problème, sans calculer. Je le range dans sa maison : je cherche le tout, ou je cherche ce qu'il manque.",
  categories: [
    { titre: "On cherche le tout", etiquettes: [
      "Dans le bac de sport, il y a 14 ballons rouges et 9 ballons bleus. Combien de ballons y a-t-il dans le bac ?",
      "Dans le car de la sortie, il y a 23 enfants et 6 adultes. Combien de personnes y a-t-il dans le car ?",
      "La bibliothèque de la classe a 35 albums et 18 documentaires. Combien de livres a-t-elle ?",
      "Pour la rencontre, notre classe apporte 12 cerceaux et la classe invitée 15. Combien de cerceaux y aura-t-il ?",
    ].join("\n") },
    { titre: "On cherche ce qu'il manque", etiquettes: [
      "Il faut 20 chasubles pour les équipes. La classe en a 13. Combien de chasubles faut-il encore trouver ?",
      "Le car a 40 places. 27 élèves sont assis. Combien de places sont encore libres ?",
      "Dans la cour, 28 enfants jouent : 16 au ballon, les autres à la corde. Combien d'enfants jouent à la corde ?",
      "Notre album a 48 pages. Nous en avons lu 30. Combien de pages reste-t-il à lire ?",
    ].join("\n") },
  ],
  aideMots: false, aidePonctuation: false, deuxVersions: false, parLigne: 2,
  aide: "Les parties : Est-ce que je connais les deux parties ?\nLe tout : Est-ce que je connais le tout ?\nLa question : Qu'est-ce que je cherche : le tout, ou ce qu'il manque ?",
  aRetenir: "Je connais les deux parties : je cherche le tout, je fais une addition. Je connais le tout et une partie : je cherche ce qu'il manque, je fais une soustraction.",
  modele: undefined, origine: undefined,
};
const tri = (seance: number): FeuilleAFabriquer => ({
  seance, atelier: "tri", titre: TRI.titre,
  fabriquer: (g) => ({ html: htmlTri(TRI, g), style: STYLE_FEUILLE + STYLE_TRI, refaire: { tri: TRI } }),
});

const monnaie = (seance: number, titre: string, r: Partial<ReglagesMonnaie>): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_MONNAIE, ...r };
  return {
    seance, atelier: "monnaie", titre,
    fabriquer: (g) => ({ html: htmlMonnaie(reglages, g), style: STYLE_FEUILLE + STYLE_MONNAIE, refaire: { monnaie: reglages } }),
  };
};

/** La fiche des trois problèmes de la rencontre et leurs outils d'aide, dans l'atelier « Problèmes et outils d'aide ». */
const RENCONTRE: ReglagesProblemesAides = { problemes: PROBLEMES_DE_LA_RENCONTRE, aides: ["ronds", "croix", "bande"], titre: "La rencontre sportive : trois problèmes" };
const rencontre = (seance: number): FeuilleAFabriquer => ({
  seance, atelier: "problemesAides", titre: RENCONTRE.titre!,
  fabriquer: () => ({ html: htmlProblemesAides(RENCONTRE), style: STYLE_FEUILLE + STYLE_PROBLEMES_AIDES, refaire: { problemesAides: RENCONTRE } }),
});

const FEUILLES: FeuilleAFabriquer[] = [
  ...CALCUL_MENTAL.map((objectif, s) => martiniere(s, objectif)),
  problemes(0, "Problèmes — combien en tout ?", "tout", 20, "sans"),
  problemes(1, "Problèmes — le tout et son schéma", "tout", 100, "vide"),
  problemes(2, "Problèmes — l'autre partie", "partie", 20, "sans"),
  // La séance du manuel : la fiche de la rencontre et ses outils d'aide ; l'entraînement de la phase 6, qui sert de première évaluation.
  rencontre(3),
  problemes(3, "Problèmes — en tout, ou ce qu'il manque", "melange", 100, "sans"),
  tri(4),
  monnaie(4, "Rendre la monnaie", { exercice: "rendre", jusqua: 20, combien: 4 }),
  problemes(5, "Problèmes — évaluation", "melange", 100, "sans"),
  problemes(5, "Problèmes — de petits nombres", "melange", 20, "sans"),
  problemes(5, "Problèmes — trois parties", "melange", 100, "sans", 3),
];

/** Ce qu'il faut préparer, séance par séance ; les feuilles sont nommées après, sauf la fiche du calcul mental. */
const MATERIEL = [
  "Les ardoises ; une boîte et des jetons ; deux bacs de vrais ballons, ou d'autres objets de la classe à réunir ; par binôme, deux boîtes de jetons, une rouge et une bleue",
  "Les ardoises ; une boîte et des jetons ; deux sacs de chasubles de deux couleurs, ou d'autres objets de la classe ; une affiche pour les trois façons de représenter : le dessin, le trait, le schéma",
  "Les ardoises ; une boîte et des jetons ; par binôme, vingt jetons et un gobelet pour en cacher une partie",
  "Les ardoises ; une boîte et des jetons ; le tableau blanc interactif ; par groupe, la fiche de la rencontre imprimée en A3 ; "
    + "les outils d'aide découpés ; des jetons et du matériel figuratif à manipuler ; deux grandes feuilles pour les affiches de référence",
  "Les ardoises ; une boîte et des jetons ; les affiches de référence ; des ciseaux et de la colle ; la monnaie fictive, pièces et billets",
  "Les ardoises ; une boîte et des jetons ; les affiches de référence ; pour la remédiation, les objets des problèmes, des barres de dix et des cubes",
];

/** Les feuilles et le matériel de la séquence. */
export function planProblemesAdditifsCe1(): PlanDesFeuilles {
  const feuilles = [...FEUILLES].sort((a, b) => a.seance - b.seance);
  const materiel = MATERIEL.map((debut, s) => {
    const f = feuilles.filter((x) => x.seance === s && x.atelier !== "martiniere").map((x) => `« ${x.titre} »`);
    if (!f.length) return `${debut}.`;
    const liste = f.length > 1 ? `${f.slice(0, -1).join(", ")} et ${f[f.length - 1]}` : f[0];
    return `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${liste}.`;
  });
  return { feuilles, materiel };
}
