// Les dictées et l'orthographe des mots : des séquences bâties sur le
// programme de français du cycle 2 (2024) et les guides de lecture et
// d'écriture du CP et du CE1.
//
// Les livrets n'ont pas de séquence pour la dictée, ni pour l'orthographe
// lexicale ; l'enseignant a demandé (2026-10-07) qu'on les construise depuis
// le programme et les guides, en le disant. Le programme : « Tous les jours,
// chaque élève […] fait une dictée en lien avec les apprentissages
// conduits » ; « avant d'être un outil d'évaluation de l'orthographe, la
// dictée est bien une activité d'écriture ». Le guide CP (p. 85-86) en donne la
// conduite pas à pas ; le guide CE1 (p. 97-106) les types de dictées — pour
// apprendre, pour s'entraîner, pour évaluer — et la mémorisation des mots.
// Chaque séance suit la démarche en quatre temps des livrets ; les feuilles
// viennent de l'atelier « Orthographe et dictées ».

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { ClasseC2, ContexteFeuilles, FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { REGLAGES_ORTHOGRAPHE, STYLE_ORTHOGRAPHE, htmlOrthographe, type ReglagesOrthographe } from "./orthographe";
import { PROGRAMME_FRANCAIS } from "./demarchesLecture";
import { etapeDe, motsDe } from "./progressionCgp";
import { etapeDeLaSequence } from "./feuillesDuFrancais";

const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const T4 = "Temps 4 – Automatisation, réinvestissement, transfert";
const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;
const trois = (titre: string, objectif: string, situation: string, activite: string, retenir: string, posture = "") =>
  seance(titre, sauront(objectif), 45, [ph(T1, "10 min", situation), ph(T2, "25 min", activite, posture), ph(T3, "10 min", retenir)]);
/** Une séance courte et ritualisée, comme les veut le guide CE1 pour la dictée quotidienne. */
const rituel = (titre: string, objectif: string, activite: string, retenir: string, posture = "") =>
  seance(titre, sauront(objectif), 20, [ph(T1, "5 min", "L'objectif dit ; ce qu'on a appris la veille, rappelé."), ph(T2, "10 min", activite, posture), ph(T3, "5 min", retenir)]);
const evaluation = (quoi: string, ensuite: string) => seance("Évaluation", sauront(`${quoi}, seuls.`), 30, [
  ph("Évaluation", "25 min", `Une feuille : ${quoi}.`),
  ph(T4, "5 min", ensuite),
]);

const GUIDE_CP = "guide « Pour enseigner la lecture et l'écriture au CP » (2019), p. 85-86";
const GUIDE_CE1 = "guide « Pour enseigner la lecture et l'écriture au CE1 » (2019), p. 97-106";
const DICTEES = (guides: string) => `${PROGRAMME_FRANCAIS} ; ${guides} ; démarche en quatre temps des livrets`;

// ── Les dictées ───────────────────────────────────────────────────────────

const DICTEES_CP: Demarche = {
  id: "dictees-cp", nom: "La dictée qui apprend : mots, phrases, lettres muettes (CP)", famille: "Français",
  source: DICTEES(GUIDE_CP),
  resume: "Écrire des mots dictés avec les lettres muettes apprises — « un ballon rond, une balle ronde, des ballons ronds » —, puis, en fin d'année, écrire sous la dictée des mots et des phrases. La dictée est « envisagée ici sous un angle constructif et non évaluatif » (guide CP, p. 85-86) : lire et comprendre le texte, compter ses phrases, ses mots, ses signes de ponctuation, le copier en prononçant, se vérifier, puis l'écrire sous la dictée. L'élève « oralise ce qu'il écrit et segmente la chaîne orale », utilise l'analogie et les outils de la classe.",
  seances: [
    trois("Préparer la dictée : lire, comprendre, compter", "lire le texte de la dictée, le comprendre et en compter les phrases, les mots et les signes de ponctuation.",
      "Le texte de la dictée au tableau : « Demain, je vous le dicterai. Aujourd'hui, on apprend à l'écrire. »",
      "Les élèves lisent le texte en silence, puis à voix haute ; le professeur s'assure de la compréhension par quelques questions. Pour chaque phrase, on compte les mots — « l'enfant » en compte deux —, les espaces, les signes de ponctuation, les syllabes des mots longs.",
      "Ce qu'on retient : une phrase commence par une majuscule et finit par un point ; entre deux mots, un espace."),
    trois("Copier en prononçant, se vérifier", "copier le texte en prononçant ce qu'on écrit, et corriger soi-même ses erreurs.",
      "Le professeur copie une phrase devant les élèves en disant tout haut ce qu'il écrit.",
      "Chacun copie le texte en prononçant à voix haute, en sautant une ligne. Puis il vérifie avec le modèle : une erreur ne se raye pas, on fait un petit trait dessous et on réécrit le mot au-dessus.",
      "Ce qu'on retient : « Je dis ce que j'écris ; je compare au modèle ; je corrige au-dessus. »", "Montre le geste de correction : il apprend à ne plus avoir peur de l'erreur."),
    trois("Les mots, puis le texte, sous la dictée", "écrire sous la dictée des mots du texte, puis le texte entier, en prononçant ce qu'on écrit.",
      "Le texte caché : « Vous l'avez préparé ; à vous de l'écrire. »",
      "Dictée des mots du texte dans le désordre, puis du texte entier, toujours en prononçant pendant l'écriture. On retrouve le texte caché et on corrige comme pour la copie ; le professeur fait l'ultime vérification ; les mots encore mal écrits sont dictés de nouveau.",
      "Ce qu'on retient : les mots que je sais écrire ; ceux que je dois encore apprendre."),
    trois("Les lettres muettes : un ballon rond, une balle ronde", "écrire sous la dictée des mots avec les lettres muettes apprises.",
      "« Un ballon rond, une balle ronde » : qu'entend-on au féminin qu'on n'entend pas au masculin ?",
      "Dictée de groupes de mots qui font entendre la lettre muette — rond/ronde, petit/petite, grand/grande — puis de pluriels : des ballons ronds. Chercher le mot de la même famille qui fait entendre la lettre : chat, chaton.",
      "Ce qu'on retient : pour trouver la lettre muette, je pense au féminin ou à un mot de la même famille."),
    evaluation("écrire sous la dictée des mots et une phrase, et se relire",
      "Ensuite, chaque jour, une dictée en lien avec les graphèmes étudiés ; et quelques mots des dictées précédentes pour réviser."),
  ],
};

const DICTEES_CE1: Demarche = {
  id: "dictees-ce1", nom: "Les dictées du CE1 : apprendre, s'entraîner, évaluer", famille: "Français",
  source: DICTEES(GUIDE_CE1),
  resume: "Orthographier correctement les mots fréquents, réguliers puis irréguliers, et réaliser les accords en genre et en nombre dans le groupe nominal et le -nt du verbe. Le guide CE1 distingue trois usages de la dictée — pour apprendre (à choix multiples, négociée, dialoguée), pour s'entraîner chaque jour (syllabes et mots, autodictée, phrase du jour), pour évaluer (dictée test, à trous, fausse dictée, segmentée) — et veut qu'on « fasse alterner des séances courtes et ritualisées, et des séances plus longues au cours desquelles les élèves réfléchissent à la façon d'écrire les mots ». La dictée n'est pas corrigée en l'absence de l'élève.",
  seances: [
    rituel("La dictée de mots, chaque jour", "écrire sous la dictée des mots réguliers du graphème étudié, en disant ce qu'on écrit.",
      "Dictée de 4 à 10 mots selon la période, dans le cahier — il garde la trace des erreurs et des réussites ; les plus fragiles complètent des mots à trous. Correction collective immédiate.",
      "Ce qu'on retient : je découpe le mot en syllabes, j'écris chaque son, je relis.", "Circule pendant la dictée et attire l'attention sur les erreurs : leur nombre baisse."),
    trois("Mémoriser les mots : listes et cartes", "mémoriser l'orthographe de mots fréquents grâce aux listes analogiques, aux cartes et à l'escalier.",
      "« Comment apprendre à écrire un mot par cœur ? » : chacun dit comment il fait.",
      "Construire des listes analogiques — maison : mais, la paix, la craie ; fête : une bête, être, une forêt — ; apprendre avec les cartes : j'observe, je lis, j'épelle, je ferme les yeux et je le vois, je vérifie, je retourne la carte et je l'écris ; l'escalier : es, esca, escalier.",
      "Les listes de la classe, affichées et complétées au fil de l'année."),
    trois("La phrase du jour", "écrire une phrase dictée et justifier l'orthographe de chaque mot avec ses connaissances sur la langue.",
      "« Emma dessine une tête. » — la phrase de la semaine, qui change un peu chaque jour.",
      "Dictée de la phrase du jour ; le professeur relève les propositions sur les cahiers et les recopie au tableau sans valider ; échange : on supprime les propositions erronées en justifiant, avec les affichages et le cahier de références.",
      "Ce qu'on retient : les règles qu'on a utilisées pour justifier — le -s du pluriel, le -nt du verbe.", "N'interroge pas d'emblée les meilleurs : laisse émerger les représentations erronées."),
    trois("Les accords : élève, élèves, élèvent", "choisir la forme qui convient dans la phrase et justifier son choix.",
      "Trois formes au tableau : élève, élèves, élèvent. « Laquelle pour : les … écoutent la maîtresse ? »",
      "Dictée à choix multiples : entourer la forme qui convient, puis justifier ; dictée dialoguée : un élève dit son hésitation, les autres le mettent sur la voie sans donner la réponse.",
      "Ce qu'on retient : dans le groupe nominal, le déterminant, le nom et l'adjectif s'accordent ; le verbe prend -nt quand le sujet est au pluriel."),
    trois("L'autodictée", "apprendre une ou plusieurs phrases et les restituer par écrit de mémoire.",
      "Le texte de l'autodictée, découpé en groupes de sens.",
      "Préparer en classe : repérer les mots difficiles et les points de vigilance ; apprendre par groupes de sens ; restituer seul, puis se relire avec la liste de vérification.",
      "Ce qu'on retient : pour mémoriser, je découpe en groupes de sens et j'épelle les mots difficiles."),
    evaluation("écrire un texte à trous sous la dictée, puis corriger ses erreurs",
      "Ensuite, la dictée quotidienne continue ; aux périodes 3 à 5, la dictée négociée en binômes."),
  ],
};

const DICTEES_CE2: Demarche = {
  id: "dictees-ce2", nom: "Les dictées du CE2 : graphèmes, accords, formes verbales", famille: "Français",
  source: DICTEES(GUIDE_CE1),
  resume: "En fin d'année, orthographier correctement les mots fréquents, réguliers et irréguliers, et des phrases selon les accords étudiés, dans le cadre de dictées. Exemples de réussite du programme : l'élève transcrit correctement les phonèmes qui s'écrivent de plusieurs façons — /o/, /é/, /è/, /an/, /s/ — dans des mots fréquents ; il orthographie les chaînes d'accord dans la phrase ; il verbalise ses raisonnements orthographiques en situation de dictée. Les types de dictées du guide CE1 continuent : négociée, dialoguée, autodictée, fausse dictée.",
  seances: [
    trois("Un son, plusieurs écritures", "choisir la bonne écriture d'un son qui s'écrit de plusieurs façons dans des mots fréquents.",
      "/o/ dans vélo, jaune, bateau : « pourquoi pas la même lettre ? »",
      "Classer des mots par écriture du son ; constituer des listes analogiques — bateau, chapeau, gâteau — ; dictée de mots tirés des listes, en disant comment on s'en souvient.",
      "Les listes de la classe : un son, ses écritures, des mots repères."),
    trois("La dictée négociée", "confronter ses choix orthographiques avec un camarade et les justifier.",
      "Le professeur dicte un texte de trois phrases, puis le relit.",
      "En binômes, confronter ses écrits et se mettre d'accord sur un seul texte, avec tous les référents ; mise en commun : la classe s'entend sur une proposition que le professeur recopie au fil de la négociation.",
      "Ce qu'on retient : les justifications qui ont convaincu, ajoutées au cahier de références."),
    trois("Les chaînes d'accord dans la phrase", "orthographier les chaînes d'accord dans la phrase, du déterminant au verbe.",
      "« Les grandes vagues frappent les rochers noirs » : on relie les mots qui s'accordent.",
      "Dictée à trous ciblée sur les accords ; dire à voix haute le raisonnement pour chaque mot ; relier par des flèches le nom à son déterminant, à son adjectif, le sujet à son verbe.",
      "Ce qu'on retient : je trouve le nom, je regarde son nombre et son genre, je les reporte sur toute la chaîne."),
    trois("La fausse dictée", "repérer et corriger dans un texte des erreurs sur des notions étudiées.",
      "« Ce texte contient trois erreurs sur les accords : à vous de les trouver. »",
      "Lire le texte piégé, souligner les erreurs, les corriger en justifiant, recopier le texte juste.",
      "Ce qu'on retient : relire en cherchant une chose à la fois — les accords, puis les mots difficiles."),
    trois("L'autodictée de deux ou trois phrases", "restituer de mémoire un texte de deux ou trois phrases appris en classe.",
      "Le texte préparé ensemble, découpé en groupes de sens.",
      "Apprendre par groupes de sens ; écrire de mémoire ; se relire avec la liste de vérification ; comparer avec le texte.",
      "Ce qu'on retient : mes manières d'apprendre un texte par cœur."),
    evaluation("écrire sous la dictée un texte court et se relire méthodiquement",
      "Ensuite, une dictée chaque jour, en lien avec l'étude de la langue ; la dictée segmentée pour mesurer les progrès."),
  ],
};

// ── Mémoriser l'orthographe des mots ──────────────────────────────────────

const ORTHO = DICTEES(`${GUIDE_CE1.replace(", p. 97-106", ", p. 104-105")} ; « Mémoriser l'orthographe des mots »`);

const MOTS_FREQUENTS: Demarche = {
  id: "mots-frequents-c2", nom: "Mémoriser l'orthographe des mots fréquents (CP, CE1, CE2)", famille: "Français",
  source: ORTHO,
  resume: "Mémoriser l'orthographe des mots réguliers et irréguliers fréquemment rencontrés et pouvoir les écrire sous la dictée. Exemples de réussite du programme : au CP, mettre en mémoire les mots en épelant, en copiant et en prenant appui sur des analogies — quarante/cinquante/soixante, mais/maison, chaise/fraise, maisonnette/fillette/tablette ; au CE1, un corpus organisé de mots invariables — tôt/aussitôt/plutôt, ici/là-bas/loin/près ; au CE2, la copie, y compris différée, de listes de mots par analogie et des mots irréguliers les plus fréquents.",
  seances: [
    trois("Des mots qui se ressemblent", "rapprocher des mots qui s'écrivent de la même façon pour mieux les retenir.",
      "Quarante, cinquante, soixante : « Qu'est-ce qui est pareil ? »",
      "Observer des mots, souligner ce qu'ils ont en commun, construire des listes analogiques ; en ajouter d'autres.",
      "Les listes analogiques de la classe, affichées."),
    trois("Apprendre un mot par cœur", "mémoriser l'orthographe d'un mot en l'observant, en l'épelant et en l'écrivant de mémoire.",
      "« Comment faites-vous pour apprendre un mot ? »",
      "Les cartes : j'observe, je lis, j'épelle, je ferme les yeux et je le vois, je vérifie, je l'écris de mémoire ; l'escalier ; le jeu de mémory des mots.",
      "Ce qu'on retient : je regarde, je dis, j'épelle, je cache, j'écris, je vérifie."),
    trois("Les petits mots qui ne changent pas", "écrire sans erreur les mots invariables les plus fréquents.",
      "Les mots invariables des textes de la semaine : aujourd'hui, toujours, beaucoup…",
      "Les classer — le temps, le lieu, la quantité — ; les apprendre par séries ; les retrouver dans des phrases ; les réécrire de mémoire.",
      "Le répertoire des mots invariables, dans le cahier de références."),
    trois("Copier de mémoire", "copier un mot ou une phrase de mémoire, sans le modèle sous les yeux.",
      "Le mot montré, puis caché : la copie différée.",
      "Observer le mot ou le groupe de mots, le cacher, l'écrire, comparer ; augmenter peu à peu la longueur.",
      "Ce qu'on retient : plus je regarde attentivement, moins je dois revenir au modèle."),
    evaluation("écrire sous la dictée les mots appris",
      "Ensuite, chaque semaine, la remémoration des mots appris ; la liste à apprendre est ajustée à chacun."),
  ],
};

const ACCENTS: Demarche = {
  id: "accents-c2", nom: "Les accents (CP, CE1, CE2)", famille: "Français",
  source: ORTHO,
  resume: "Au CP, identifier et nommer les accents ; au CE1 et au CE2, tenir compte des accents en lisant et en écrivant. L'accent aigu, grave, circonflexe : il change le son de la lettre, et parfois le sens du mot (a, à ; ou, où ; la, là).",
  seances: [
    trois("Trois accents", "reconnaître et nommer l'accent aigu, l'accent grave et l'accent circonflexe.",
      "École, mère, fête : « Qu'est-ce qui est écrit au-dessus du e ? »",
      "Trier des mots selon leur accent ; colorier chaque accent de sa couleur ; dire les mots à voix haute.",
      "L'affiche des trois accents, un mot repère pour chacun."),
    trois("é ou è : ce que l'on entend", "choisir entre é et è d'après ce que l'on entend.",
      "Été, frère : les deux e sonnent-ils pareil ?",
      "Classer des mots selon le son ; compléter des mots avec é ou è ; les lire à voix haute pour vérifier.",
      "Ce qu'on retient : é se dit [e], comme dans école ; è se dit [ɛ], comme dans mère."),
    trois("L'accent circonflexe", "écrire les mots fréquents qui prennent un accent circonflexe.",
      "Fête, forêt, tête, château : « un accent en forme de chapeau ».",
      "Construire la liste analogique — fête, bête, être, forêt, prêter — ; repérer l'accent sur d'autres voyelles : château, île, hôpital.",
      "La liste des mots à accent circonflexe, à apprendre."),
    trois("Quand l'accent change le sens", "distinguer a et à, ou et où, la et là.",
      "« Il a un chat » et « il va à l'école » : pourquoi un accent dans l'un, pas dans l'autre ?",
      "Remplacer par « avait » pour savoir s'il faut a ; compléter des phrases ; expliquer son choix.",
      "Ce qu'on retient : si je peux dire « avait », j'écris a sans accent."),
    evaluation("compléter des mots avec le bon accent et le nommer", "Ensuite, à la relecture de chaque écrit, vérifier les accents."),
  ],
};

const VALEUR_DES_LETTRES: Demarche = {
  id: "valeur-des-lettres-c2", nom: "s, c, g : une lettre, deux sons ; m devant m, b, p (CP, CE1)", famille: "Français",
  source: ORTHO,
  resume: "Au CP, connaître la valeur sonore de certaines lettres (s, c, g) et la composition de certains graphèmes selon la lettre qui suit (an/am, en/em, on/om, in/im) ; au CE1, classer par analogie et mémoriser les mots fréquents comportant ces graphèmes. Exemples de réussite : distinguer poisson et poison, gag et gage, ga, gi, ca, ci ; regrouper garder, gai, gorille, gamin, élégant et girafe, gendarme, geste, agiter, gentiment ; décoder les mots comportant un m devant m, b, p.",
  seances: [
    trois("La lettre g", "lire et écrire g selon la lettre qui suit : [g] devant a, o, u, [ʒ] devant e, i.",
      "Gâteau, girafe : « la même lettre, deux sons ? »",
      "Lire des mots, les classer selon le son du g, entourer la lettre qui suit ; découvrir gu (guitare) et ge (pigeon).",
      "La règle de la lettre g, avec les mots repères."),
    trois("La lettre c", "lire et écrire c selon la lettre qui suit, et la cédille.",
      "Carotte, cinéma, garçon : « comment le c sait-il ce qu'il doit dire ? »",
      "Classer des mots selon le son du c ; découvrir la cédille ; compléter des mots avec c ou ç.",
      "La règle de la lettre c, avec les mots repères."),
    trois("La lettre s : poisson ou poison", "distinguer s et ss entre deux voyelles.",
      "Poisson, poison : lire les deux mots ; qu'est-ce qui change ?",
      "Classer des mots selon le son du s ; compléter avec s ou ss ; lire des paires de mots.",
      "Ce qu'on retient : entre deux voyelles, s se dit [z] ; pour [s], on double : ss."),
    trois("m devant m, b, p", "écrire am, em, om, im devant m, b, p.",
      "La lampe, la chambre, le pompier : « pourquoi un m et pas un n ? »",
      "Observer des mots, entourer la lettre qui suit le m ; compléter avec m ou n ; dictée de mots.",
      "Ce qu'on retient : devant m, b, p, j'écris m."),
    evaluation("classer des mots selon le son d'une lettre et compléter avec m ou n", "Ensuite, à la relecture, vérifier les lettres qui changent de son."),
  ],
};

const FAMILLES: Demarche = {
  id: "familles-orthographe-c2", nom: "La lettre muette et la famille du mot (CP, CE1, CE2)", famille: "Français",
  source: ORTHO,
  resume: "Au CP, comprendre la présence d'une lettre muette finale à l'aide d'un mot de la même famille — chat/chaton, gros/grossir ; au CE1, l'anticiper — blanc/blanche, sang/sanguin, chant/chanter, surpris/surprise ; au CE2, s'appuyer sur des critères morphologiques (radical, préfixe, suffixe) et analogiques pour orthographier les mots — il s'appuie sur beau pour écrire beauté. Au CP, l'orthographe des affixes fréquents : faire/refaire/défaire, visible/invisible, ferme/fermette.",
  seances: [
    trois("La lettre qu'on n'entend pas", "trouver la lettre muette finale grâce à un mot de la même famille.",
      "Chat, chaton : « où est passé le t qu'on n'entend pas dans chat ? »",
      "Trouver pour chaque mot un mot de la famille qui fait entendre la lettre ; compléter la lettre muette ; trier les mots par lettre muette.",
      "Ce qu'on retient : pour trouver la lettre muette, je cherche un mot de la même famille."),
    trois("Le féminin aide aussi", "trouver la lettre muette d'un adjectif grâce à son féminin.",
      "Petit, petite ; grand, grande ; blanc, blanche.",
      "Dire le féminin, entendre la lettre, l'écrire au masculin ; dictée de paires de mots.",
      "Ce qu'on retient : au féminin, la lettre muette se fait entendre."),
    trois("Préfixes et suffixes", "écrire des mots dérivés en gardant l'orthographe du radical et de l'affixe.",
      "Faire, refaire, défaire ; coiffeur, danseur : « qu'est-ce qui ne change pas ? »",
      "Entourer le radical, souligner le préfixe ou le suffixe ; compléter des listes de dérivés ; écrire des mots nouveaux.",
      "Ce qu'on retient : le radical garde son orthographe ; un préfixe, un suffixe s'écrivent toujours de la même façon."),
    trois("Raisonner pour écrire un mot", "s'appuyer sur la famille d'un mot pour écrire un mot qu'on ne connaît pas.",
      "« Comment écrire beauté ? » — on pense à beau.",
      "Écrire des mots inconnus en cherchant leur famille ; expliquer son raisonnement à voix haute ; vérifier dans le dictionnaire.",
      "Ce qu'on retient : un mot de la même famille me dit comment écrire le début du mot."),
    evaluation("compléter des mots à lettre muette et dire le mot de la famille qui l'a fait trouver", "Ensuite, à chaque dictée, chercher la famille des mots difficiles."),
  ],
};

export const DEMARCHES_ORTHOGRAPHE: Demarche[] = [DICTEES_CP, DICTEES_CE1, DICTEES_CE2, MOTS_FREQUENTS, ACCENTS, VALEUR_DES_LETTRES, FAMILLES];

/**
 * La séquence de dictée ou d'orthographe des mots d'une compétence du cycle
 * 2 ; rien sinon. Au CP, « encoder des syllabes simples puis des mots selon
 * la progression des CGP » reste à la routine du livret.
 */
export function demarcheDeLOrthographe(classe: string, sd: string, cg: string, comp: string): string | null {
  if (/encoder puis ecrire sous dictee/.test(cg)) {
    if (classe === "cp") return /lettres muettes|sous la dictee/.test(comp) ? "dictees-cp" : null;
    return classe === "ce1" ? "dictees-ce1" : classe === "ce2" ? "dictees-ce2" : null;
  }
  if (/vocabulaire/.test(sd) && /orthographe (des mots|lexicale)/.test(cg)) {
    if (/accents/.test(comp)) return "accents-c2";
    if (/valeur sonore|prononciation variable/.test(comp)) return "valeur-des-lettres-c2";
    if (/lettre muette|morphologiques/.test(comp)) return "familles-orthographe-c2";
    return "mots-frequents-c2";
  }
  return null;
}

// ── Les feuilles ──────────────────────────────────────────────────────────

const or = (seance: number, titre: string, r: Partial<ReglagesOrthographe>, mots: string[] = []): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_ORTHOGRAPHE, ...r };
  return { seance, atelier: "orthographe", titre, fabriquer: (graine) => ({ html: htmlOrthographe(reglages, graine, mots), style: STYLE_FEUILLE + STYLE_ORTHOGRAPHE }) };
};

/** Les mots de la dictée de mots : ceux du graphème de la période, au CP et au CE1. */
const motsDuGrapheme = (classe: ClasseC2, periode: number) => (classe === "CE2" ? [] : motsDe(etapeDe(etapeDeLaSequence(classe, periode)), []).corpus);
/** De 4 mots en début d'année à 10 en fin d'année (guide CE1, p. 101). */
const combienDeMots = (periode: number) => Math.min(10, 4 + Math.max(0, periode - 1) * 1.5) | 0;

type Plan = { feuilles: FeuilleAFabriquer[]; materiel: string[] };

const PLANS: Record<string, (classe: ClasseC2, periode: number) => Plan> = {
  "dictees-cp": (_c, periode) => ({
    feuilles: [
      or(0, "La dictée préparée", { exercice: "dicteePreparee", classe: "CP" }),
      or(2, "La dictée de mots", { exercice: "dicteeDeMots", classe: "CP", combien: combienDeMots(periode) }, motsDuGrapheme("CP", periode)),
      or(3, "La lettre muette et la famille du mot", { exercice: "lettreMuette", classe: "CP" }),
      or(3, "La dictée à trous", { exercice: "aTrous", classe: "CP" }),
      or(4, "La dictée de mots — évaluation", { exercice: "dicteeDeMots", classe: "CP", combien: combienDeMots(periode) }, motsDuGrapheme("CP", periode)),
    ],
    materiel: ["Le texte de la dictée au tableau", "Le cahier, une ligne sautée sur deux ; le modèle au tableau", "Le texte caché ; le cahier", "Des étiquettes-mots : rond, ronde, petit, petite", "Le cahier"],
  }),
  "dictees-ce1": (_c, periode) => ({
    feuilles: [
      or(0, "La dictée de mots", { exercice: "dicteeDeMots", classe: "CE1", combien: combienDeMots(periode) }, motsDuGrapheme("CE1", periode)),
      or(0, "La dictée de mots — mots à trous", { exercice: "dicteeDeMots", classe: "CE1", combien: combienDeMots(periode), aide: true }, motsDuGrapheme("CE1", periode)),
      or(1, "Mémoriser des mots", { exercice: "memoriser", classe: "CE1" }),
      or(1, "Les listes analogiques", { exercice: "listes", classe: "CE1" }),
      or(2, "La phrase du jour", { exercice: "phraseDuJour", classe: "CE1" }),
      or(3, "La dictée à choix multiples", { exercice: "choixMultiples", classe: "CE1" }),
      or(4, "L'autodictée", { exercice: "autodictee", classe: "CE1" }),
      or(5, "La dictée à trous — évaluation", { exercice: "aTrous", classe: "CE1" }),
    ],
    materiel: ["Le cahier de dictée", "Des cartes vierges ; des lettres mobiles", "Le tableau, pour recopier les propositions ; les affichages ; le cahier de références", "Les trois formes au tableau", "Le texte découpé en groupes de sens", "Le cahier ; le texte complet pour l'adulte"],
  }),
  "dictees-ce2": () => ({
    feuilles: [
      or(0, "Les listes analogiques", { exercice: "listes", classe: "CE2" }),
      or(1, "La dictée à choix multiples", { exercice: "choixMultiples", classe: "CE2" }),
      or(2, "La dictée à trous", { exercice: "aTrous", classe: "CE2" }),
      or(3, "La fausse dictée", { exercice: "piegee", classe: "CE2" }),
      or(4, "L'autodictée", { exercice: "autodictee", classe: "CE2" }),
      or(5, "La phrase du jour — évaluation", { exercice: "phraseDuJour", classe: "CE2" }),
    ],
    materiel: ["Les listes de sons de la classe", "Le texte de trois phrases ; une grande feuille par binôme ; les référents", "Des flèches de couleur", "Le texte piégé", "Le texte découpé en groupes de sens", "Le cahier"],
  }),
  "mots-frequents-c2": (classe) => ({
    feuilles: [
      or(0, "Les listes analogiques", { exercice: "listes", classe }),
      or(1, "Mémoriser des mots", { exercice: "memoriser", classe }),
      or(4, "La dictée de mots — évaluation", { exercice: "dicteeDeMots", classe, combien: 10 }),
    ],
    materiel: ["Les mots au tableau, en colonnes", "Des cartes vierges ; des lettres mobiles", "Les textes de la semaine", "Des mots et des phrases à cacher", "Le cahier"],
  }),
  "accents-c2": (classe) => ({
    feuilles: [
      or(0, "Les accents", { exercice: "accents", classe: "CP" }),
      or(1, "Les accents — compléter", { exercice: "accents", classe: classe === "CP" ? "CE1" : classe }),
      or(4, "Les accents — évaluation", { exercice: "accents", classe }),
    ],
    materiel: ["Des crayons de trois couleurs", "Les mots repères au tableau", "La liste des mots à accent circonflexe", "Des phrases avec a, à, ou, où", "Le cahier"],
  }),
  "valeur-des-lettres-c2": (classe) => ({
    feuilles: [
      or(0, "La lettre g", { exercice: "valeurLettres", classe, lettre: "g" }),
      or(1, "La lettre c", { exercice: "valeurLettres", classe, lettre: "c" }),
      or(2, "La lettre s", { exercice: "valeurLettres", classe, lettre: "s" }),
      or(3, "m devant m, b, p", { exercice: "mbp", classe }),
      or(4, "m devant m, b, p — évaluation", { exercice: "mbp", classe }),
    ],
    materiel: ["Les mots en étiquettes", "Les mots en étiquettes", "Des paires de mots : poisson, poison", "Les mots en étiquettes", "Le cahier"],
  }),
  "familles-orthographe-c2": (classe) => ({
    feuilles: [
      or(0, "La lettre muette et la famille du mot", { exercice: "lettreMuette", classe }),
      or(1, "La lettre muette — avec le féminin", { exercice: "lettreMuette", classe: classe === "CE2" ? "CE1" : classe }),
      or(4, "La lettre muette — évaluation", { exercice: "lettreMuette", classe }),
    ],
    materiel: ["Des paires de mots en étiquettes", "Des adjectifs au masculin et au féminin", "Des listes de mots dérivés", "Des dictionnaires", "Le cahier"],
  }),
};

export const estUneDemarcheDOrthographe = (id: string) => id in PLANS;

export function planDeLOrthographe(demarcheId: string, ctx: ContexteFeuilles): PlanDesFeuilles | null {
  const fabrique = PLANS[demarcheId];
  if (!fabrique) return null;
  const p = fabrique(ctx.classe, ctx.periode);
  const materiel = p.materiel.map((debut, s) => {
    const f = p.feuilles.filter((x) => x.seance === s).map((x) => `« ${x.titre} »`);
    return f.length ? `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${f.join(" et ")}.` : `${debut}.`;
  });
  return { feuilles: p.feuilles, materiel };
}
