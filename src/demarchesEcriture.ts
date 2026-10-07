// Produire des écrits : des séquences bâties sur le programme de français
// du cycle 2 (2024) et les guides de lecture et d'écriture du CP et du CE1.
//
// Les livrets n'ont pas de séquence de production d'écrits ; l'enseignant a
// demandé (2026-10-07) qu'on la construise depuis le programme et les
// guides, en le disant. Le programme : au CP, des phrases avec l'aide du
// professeur, des écrits courts d'une à cinq lignes « dès la 2e période »,
// transformer un texte lu, une méthodologie de production écrite en fin
// d'année ; au CE1, la phrase prototypique « dès les premières semaines »,
// un texte d'une à trois phrases dès la période 1, les connecteurs au cours
// des périodes 1 à 5, six ou sept phrases en fin d'année ; au CE2, écrire
// pour un destinataire un texte d'une dizaine de lignes et le relire
// méthodiquement. Le guide CP (« Savoir écrire un texte », p. 11-12 ;
// p. 86-87) et le guide CE1 (« La rédaction », p. 77-89) en donnent la
// démarche : planifier, mettre en mots, réviser ; les écrits très courts
// ritualisés et le jogging d'écriture ; deux séances d'écrits courts par
// semaine. Les feuilles viennent de l'atelier « Écrire ».

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { ClasseC2, ContexteFeuilles, FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { REGLAGES_ECRIRE, STYLE_ECRIRE, htmlEcrire, type ReglagesEcrire } from "./ecrire";
import { REGLAGES_PHRASES, STYLE_PHRASES, htmlPhrasesEnDesordre, phrasesEnDesordre } from "./phrasesEnDesordre";
import { PROGRAMME_FRANCAIS } from "./demarchesLecture";

const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;
const trois = (titre: string, objectif: string, situation: string, activite: string, retenir: string, posture = "") =>
  seance(titre, sauront(objectif), 45, [ph(T1, "10 min", situation), ph(T2, "25 min", activite, posture), ph(T3, "10 min", retenir)]);
/** Un écrit très court ritualisé : chaque jour, dix minutes d'écriture (guide CE1, p. 83-85). */
const rituel = (titre: string, objectif: string, activite: string, retenir: string, posture = "") =>
  seance(titre, sauront(objectif), 20, [ph(T1, "5 min", "Le lanceur ou la phrase du jour, dit à l'oral d'abord."), ph(T2, "10 min", activite, posture), ph(T3, "5 min", retenir)]);

const GUIDES = "guides « Pour enseigner la lecture et l'écriture » au CP (2018), « Savoir écrire un texte », p. 11-12, et au CE1 (2019), « La rédaction », p. 77-89";
const SOURCE = `${PROGRAMME_FRANCAIS} ; ${GUIDES} ; démarche en quatre temps des livrets`;

const ECRIRE_CP: Demarche = {
  id: "ecrire-phrases-cp", nom: "Écrire ses premières phrases, puis un écrit court (CP)", famille: "Français",
  source: SOURCE,
  resume: "Dès le début de l'année, écrire des mots puis quelques phrases avec l'aide du professeur, à partir des mots connus et déchiffrés, et continuer la dictée à l'adulte ; dès la 2e période, produire des écrits courts porteurs de sens, d'une à cinq lignes, en articulation avec la lecture. Exemples de réussite : composer des phrases avec des étiquettes mobiles qu'on sait déchiffrer ; compléter des listes analogiques ; des gammes d'écriture (« J'ai un chat./J'ai un … ») ; respecter la majuscule et la ponctuation finale forte. Le guide CP : inventer des phrases, puis de petites histoires, « avec le souci de l'orthographe » ; partir d'un mot ou de deux que la phrase doit contenir.",
  seances: [
    trois("Des phrases avec des étiquettes", "composer une phrase avec des étiquettes-mots qu'on sait déchiffrer.",
      "Des étiquettes-mots au tableau, en désordre : « Faisons une phrase qui veut dire quelque chose. »",
      "Lire les étiquettes, composer des phrases, les lire à voix haute ; vérifier le sens, la majuscule et le point ; recopier sa phrase.",
      "Ce qu'on retient : une phrase a du sens ; elle commence par une majuscule et finit par un point."),
    trois("La dictée à l'adulte", "dicter une phrase au professeur en tenant compte de ce qui change entre l'oral et l'écrit.",
      "« On écrit ensemble ce qu'on a fait ce matin : vous me dictez, j'écris. »",
      "En petit groupe, dicter au professeur en adaptant son débit ; le professeur fait remarquer ce qui change à l'écrit — la négation complète, les reprises (« il ») — ; relire le texte ensemble.",
      "Ce qu'on retient : à l'écrit, on dit tout, et on le dit plus complètement qu'à l'oral."),
    trois("Les gammes : une phrase modèle", "écrire de nouvelles phrases sur le modèle d'une phrase, en changeant un mot.",
      "« J'ai un chat. » — « Et toi, qu'as-tu ? »",
      "Changer le nom avec des mots déchiffrables ; puis changer deux mots ; compléter des listes analogiques (trois animaux dont on connaît l'orthographe) ; lire ses phrases à son voisin.",
      "Les phrases de la classe, affichées : le modèle et ses variantes."),
    trois("Une phrase avec des mots imposés", "écrire une phrase qui contient un ou deux mots donnés.",
      "Deux mots tirés au sort : « chat » et « lit ». « Quelle phrase peut les contenir ? »",
      "Dire sa phrase à l'oral, puis l'écrire en cherchant les mots dans les leçons de lecture ; la relire à voix haute ; dessiner ensuite son histoire.",
      "Ce qu'on retient : je cherche les mots que je connais dans mes leçons."),
    trois("Un écrit court", "écrire un court texte de une à cinq lignes à partir d'une structure donnée.",
      "Un modèle court, lu et relu : sa structure, au tableau.",
      "Planifier ensemble ce qu'on va écrire ; écrire son texte avec les outils de la classe ; le relire à voix haute au professeur ; le corriger avec son aide.",
      "Ce qu'on retient : avant d'écrire, je sais ce que je veux dire ; après, je relis.", "Indique la forme juste à chaque erreur, au moment où elle se fait."),
  ],
};

const TRANSFORMER: Demarche = {
  id: "transformer-un-texte-c2", nom: "Transformer un texte lu, écrire à la manière de (CP, CE1, CE2)", famille: "Français",
  source: SOURCE,
  resume: "Au CP, dès la 2e période, s'appuyer sur les textes de lecture pour les transformer sur quelques points seulement — écrire à la façon de, ajouter un épisode ; exemples : modifier « Jacques a un canari jaune » avec un corpus de mots, écrire un nouvel épisode d'un récit à structure répétitive. Au CE1, retravailler un texte en fonction d'une ou deux contraintes d'écriture ; exemple : « Le petit chat est dans la cour de la ferme » et poules/grosses/maison/cour → « Les grosses poules sont dans la cour de la maison ». Le guide CE1 : le texte de l'album « constitue alors une matrice pour une activité qui articule copie et création d'un nouveau texte cohérent ».",
  seances: [
    trois("Changer des mots dans un texte lu", "transformer une phrase d'un texte lu en remplaçant des mots par d'autres de la boîte.",
      "Une phrase du texte de lecture au tableau ; une boîte de mots.",
      "Remplacer un mot, puis plusieurs ; lire à voix haute pour vérifier le sens ; accorder ce qui doit l'être.",
      "Ce qu'on retient : quand je change un mot, je vérifie que la phrase garde son sens et ses accords."),
    trois("Ajouter un épisode", "écrire un nouvel épisode d'un récit à structure répétitive.",
      "Un récit qui se répète : « Qu'est-ce qui revient à chaque fois ? »",
      "Repérer la structure, la souligner ; inventer un épisode à l'oral ; l'écrire en suivant le cadre ; l'illustrer ; lire les épisodes et les ajouter au récit de la classe.",
      "Ce qu'on retient : pour écrire à la manière d'un texte, je garde sa structure et je change ce qui peut changer."),
    trois("Réécrire avec une contrainte", "réécrire un texte court en respectant une ou deux contraintes : un autre personnage, plusieurs personnages, un autre temps.",
      "Le texte de départ, et la contrainte : « Et si c'était une pâtissière ? Et si ils étaient plusieurs ? »",
      "Repérer tout ce que la contrainte oblige à changer ; réécrire ; comparer à deux ; corriger.",
      "Ce qu'on retient : une contrainte change plusieurs mots à la fois : je les cherche tous."),
    trois("À la manière d'un poème", "écrire un court poème à la manière d'un poème lu.",
      "Un poème lu et appris, dit à voix haute ; sa structure (« Et si j'étais… »).",
      "Garder la structure du poème, trouver ses propres mots, à l'oral d'abord ; écrire ; chercher des rimes ; lire son poème à la classe.",
      "Le recueil de poèmes de la classe."),
    trois("Lire, améliorer, publier", "relire son texte, l'améliorer et le présenter à des lecteurs.",
      "Les textes de la séquence, rassemblés : « Pour qui les publier ? »",
      "Relire avec la grille, améliorer, recopier au propre ; lire à la classe, afficher, envoyer à une autre classe ou aux familles.",
      "Ce qu'on retient : on écrit pour être lu."),
  ],
};

const PHRASE_PROTOTYPIQUE: Demarche = {
  id: "phrase-prototypique-ce1", nom: "De la phrase prototypique au texte court (CE1)", famille: "Français",
  source: SOURCE,
  resume: "Dès les premières semaines, rédiger une phrase simple à partir d'une phrase prototypique, en changeant un puis plusieurs mots ; dès la période 1, écrire un texte court d'une à trois phrases. Le guide CE1 (p. 82-85) : une phrase simple « qui se complexifiera rapidement avec un ajout d'informations : article/nom/verbe, puis article/nom/verbe/complément » ; les écrits très courts ritualisés chaque jour — déplacer, ajouter, remplacer, supprimer à partir d'une phrase de base ; les gammes d'écriture (supprimer le pronom redondant, « il y a », « je vois… qui ») ; le jogging d'écriture et ses lanceurs. Exemple de réussite du programme : « Simon parle à Nora./Simon parlait à Nora./Simon parlera à Nora. »",
  seances: [
    trois("Une phrase modèle, un mot qui change", "écrire une phrase nouvelle à partir d'une phrase prototypique en changeant un mot, puis plusieurs.",
      "« Simon parle à Nora. » au tableau : « Que peut-on changer ? »",
      "Changer le personnage, puis le verbe, puis le temps ; à l'oral d'abord ; écrire ses phrases ; les lire à voix haute.",
      "Ce qu'on retient : une phrase a des places ; à chaque place, je peux mettre un autre mot du même genre."),
    trois("Déplacer, ajouter, remplacer, supprimer", "transformer une phrase de base en déplaçant, ajoutant, remplaçant ou supprimant des groupes de mots.",
      "« L'élève trace un cercle dans la cour. » — la phrase de base du guide.",
      "Transformations à l'oral, puis à l'écrit : déplacer « dans la cour », ajouter « grand », remplacer « trace » ; vérifier que la phrase garde son sens.",
      "Ce qu'on retient : certains groupes se déplacent ou se suppriment ; d'autres non."),
    rituel("De l'oral à l'écrit", "écrire une phrase comme on l'écrit, et non comme on la dit.",
      "Des phrases dites à l'oral — « Le chat, il est sur le mur » — à réécrire : supprimer le pronom en trop, « il y a », « je vois… qui » ; écrire une phrase au lieu de deux.",
      "Ce qu'on retient : à l'écrit, je ne répète pas le sujet."),
    rituel("Le jogging d'écriture", "écrire chaque jour une ou deux phrases à partir d'un lanceur d'écriture.",
      "Le lanceur du jour — « J'aime… parce que… » — ; écrire une ou deux phrases ; les lire à voix haute pour entendre ses erreurs ; les corriger avec le professeur.",
      "Les phrases du cahier, relues en fin de semaine."),
    trois("Un texte de une à trois phrases", "écrire un texte court de une à trois phrases à partir d'une structure simple.",
      "Une image, ou un poème court, comme inducteur ; ce qu'on va écrire, dit à l'oral.",
      "Écrire une idée par ligne au brouillon, puis remettre le texte en forme avec la ponctuation et les majuscules ; relire ; recopier au propre sur la page de droite.",
      "Ce qu'on retient : une idée, une phrase ; une majuscule, un point."),
  ],
};

const CONNECTEURS: Demarche = {
  id: "connecteurs-ce1", nom: "Enchaîner les phrases : les connecteurs (CE1)", famille: "Français",
  source: SOURCE,
  resume: "Au cours des périodes 1 à 5, insérer des connecteurs pour rendre cohérent l'enchaînement de plusieurs phrases. Le guide CE1 : « l'élève s'apercevra qu'une suite de phrases ne peut se suffire à constituer un texte cohérent » ; on travaille « la chronologie du récit avec l'utilisation de connecteurs, l'introduction et la clôture des récits, l'usage des anaphores », avec des frises chronologiques. Exemple de réussite du programme : lors de l'étude d'une œuvre, écrire la suite d'un passage en séquençant les actions : « D'abord… Puis… Enfin… ».",
  seances: [
    trois("Une suite de phrases n'est pas un texte", "voir ce qui manque à une suite de phrases pour faire un texte.",
      "Quatre phrases au tableau, sans lien : « Est-ce que ça se lit bien ? »",
      "Remettre des étapes dans l'ordre ; les lire telles quelles, puis avec des mots qui les relient ; comparer.",
      "Ce qu'on retient : des petits mots relient les phrases et disent l'ordre."),
    trois("D'abord, puis, ensuite, enfin", "raconter des étapes dans l'ordre avec des connecteurs de temps.",
      "Une frise de quatre images : la recette du chocolat chaud.",
      "Numéroter les étapes, puis écrire le texte avec d'abord, puis, ensuite, enfin ; varier : après, plus tard, à la fin.",
      "La liste des connecteurs de temps, au mur."),
    trois("Alors, mais, parce que, donc", "relier deux phrases avec le connecteur logique qui convient.",
      "« Il pleut. Je prends mon parapluie. » — quel mot pour les relier ?",
      "Relier des paires de phrases ; dire pourquoi tel connecteur et pas un autre ; inventer des phrases avec chacun.",
      "Ce qu'on retient : parce que dit la cause, alors et donc la conséquence, mais l'opposition."),
    trois("Ne pas répéter : les reprises", "éviter les répétitions en reprenant un personnage par un pronom ou un autre nom.",
      "Un texte où le prénom revient à chaque phrase : « Qu'est-ce qui gêne ? »",
      "Remplacer les répétitions par il, elle, le, lui, ou un autre nom ; vérifier qu'on sait toujours de qui on parle.",
      "Ce qu'on retient : je varie les reprises, mais le lecteur doit toujours savoir de qui il s'agit."),
    trois("Écrire la suite d'un passage", "écrire la suite d'un passage en séquençant les actions avec des connecteurs.",
      "Un passage de l'œuvre lue en classe, arrêté au milieu.",
      "Planifier la suite en trois actions ; écrire avec d'abord, puis, enfin ; relire avec la grille ; lire les suites à la classe.",
      "Ce qu'on retient : mes connecteurs préférés, et ceux que je veux essayer."),
  ],
};

const ECRIRE_UN_TEXTE: Demarche = {
  id: "ecrire-un-texte-c2", nom: "Écrire un texte : planifier, écrire, réviser (CP, CE1, CE2)", famille: "Français",
  source: SOURCE,
  resume: "Acquérir une méthodologie de production écrite — planification, mise en mots avec vigilance orthographique, relectures et révisions — : au CP, repérer les dysfonctionnements de son texte par la relecture à voix haute du professeur ou avec des outils ; au CE1, écrire en fin d'année un texte de six ou sept phrases cohérent ; au CE2, écrire pour un destinataire un texte d'une dizaine de lignes et le relire méthodiquement. Le guide CE1 (p. 80-82) : un échange collectif sur le projet, la planification « notée au tableau » qui accompagne l'élève jusqu'à la révision, le premier essai avec les outils d'aide, la relecture à voix haute où l'élève repère « des omissions, des incohérences et des répétitions », une grille de relecture et un code de correction ; jamais de correction en l'absence de l'élève ; la valorisation des écrits.",
  seances: [
    trois("Le projet d'écriture", "dire ce qu'on va écrire, pour qui et pour quoi faire.",
      "Le projet présenté : une lettre aux correspondants, un conte pour les maternelles, une règle de jeu pour la cour…",
      "Échange collectif : le sens du projet, le destinataire, les caractéristiques de l'écrit demandé ; lire des textes de même nature et en relever ce qui servira.",
      "Ce qu'on retient : avant d'écrire, je sais pour qui et pour quoi j'écris."),
    trois("Planifier ensemble", "préparer son écrit : chercher des idées, les choisir, les organiser.",
      "« Que doit-on trouver dans notre texte ? »",
      "Le guide d'écriture collectif, noté au tableau : les idées, l'ordre, le début et la fin, les mots utiles ; chacun prépare son brouillon — listes, carte mentale, plan.",
      "La planification affichée : elle servira jusqu'à la révision."),
    trois("Le premier jet", "écrire un premier jet en s'appuyant sur la planification et les outils de la classe.",
      "La planification relue ; les outils sur la table : banque de mots, cahier d'écriture.",
      "Écrire au brouillon, sur la page de gauche ; le professeur intervient peu, fait reformuler à l'oral, oriente vers les outils ; comparer son écrit à celui d'un camarade.",
      "Ce qu'on retient : un premier jet n'est pas parfait ; il va s'améliorer."),
    trois("Relire et réviser", "relire son texte pour repérer ce qui ne va pas et l'améliorer.",
      "Le professeur relit à voix haute un texte (avec l'accord de son auteur) : « Qu'est-ce qui manque ? Qu'est-ce qui se répète ? »",
      "Relire à voix haute, ou faire relire ; la grille de relecture, une chose à la fois ; corriger avec le code de correction et les outils ; ajouter ce qui manque.",
      "Ce qu'on retient : je relis une fois pour le sens, une fois pour l'orthographe.", "Corrige en présence de l'élève, en explicitant les procédures."),
    trois("Améliorer et publier", "mettre au propre un texte amélioré et le présenter à ses destinataires.",
      "Les textes révisés : « Comment les faire lire ? »",
      "Recopier au propre sur la page de droite ; illustrer ; lire à la classe ou à une autre classe, envoyer, afficher, réunir dans un recueil.",
      "Ce qu'on retient : en comparant le premier jet et le texte final, je vois mes progrès."),
  ],
};

export const DEMARCHES_ECRITURE: Demarche[] = [ECRIRE_CP, TRANSFORMER, PHRASE_PROTOTYPIQUE, CONNECTEURS, ECRIRE_UN_TEXTE];

/** La séquence de production d'écrits d'une compétence du cycle 2 ; rien sinon. */
export function demarcheDeLEcriture(classe: string, cg: string, comp: string): string | null {
  if (!/produire des ecrits/.test(cg)) return null;
  if (/transformer|retravailler un texte/.test(comp)) return "transformer-un-texte-c2";
  if (/methodologie|dysfonctionnements|six ou sept phrases|relire son texte/.test(comp)) return "ecrire-un-texte-c2";
  if (/connecteurs/.test(comp)) return "connecteurs-ce1";
  if (classe === "cp") return "ecrire-phrases-cp";
  if (classe === "ce1") return "phrase-prototypique-ce1";
  return "ecrire-un-texte-c2";
}

// ── Les feuilles ──────────────────────────────────────────────────────────

const ec = (seance: number, titre: string, r: Partial<ReglagesEcrire>): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_ECRIRE, ...r };
  return { seance, atelier: "ecrire", titre, fabriquer: (graine) => ({ html: htmlEcrire(reglages, graine), style: STYLE_FEUILLE + STYLE_ECRIRE }) };
};

/** Des phrases en étiquettes, faites de mots simples : on les découpe et on les remet en ordre. */
const PHRASES_ETIQUETTES = ["Le chat dort sur le lit.", "Papa lit le journal.", "Lila a une moto rouge.", "Le loup a vu la chèvre.", "Malo mange une tomate."];
const etiquettes = (seance: number): FeuilleAFabriquer => ({
  seance, atelier: "phrases", titre: "Des phrases en étiquettes",
  fabriquer: (graine) => ({ html: htmlPhrasesEnDesordre(phrasesEnDesordre(PHRASES_ETIQUETTES, graine), { ...REGLAGES_PHRASES, phrases: PHRASES_ETIQUETTES.join("\n") }), style: STYLE_FEUILLE + STYLE_PHRASES }),
});

type Plan = { feuilles: FeuilleAFabriquer[]; materiel: string[] };

const PLANS: Record<string, (classe: ClasseC2) => Plan> = {
  "ecrire-phrases-cp": () => ({
    feuilles: [
      etiquettes(0),
      ec(2, "Les gammes d'écriture", { exercice: "gammes", classe: "CP" }),
      ec(3, "Une phrase avec des mots imposés", { exercice: "motsImposes", classe: "CP" }),
      ec(4, "Je relis mon texte", { exercice: "relecture", classe: "CP" }),
    ],
    materiel: ["Des étiquettes-mots déchiffrables, en grand ; des ciseaux, de la colle", "Une grande affiche pour écrire sous la dictée", "Le modèle au tableau ; des étiquettes de noms", "Des mots tirés au sort ; les leçons de lecture", "Le modèle et sa structure au tableau"],
  }),
  "transformer-un-texte-c2": (classe) => ({
    feuilles: [
      ec(0, "Transformer un texte", { exercice: "transformer", classe }),
      ec(1, "Ajouter un épisode à un récit répétitif", { exercice: "episode", classe }),
      ec(2, "Réécrire avec une contrainte", { exercice: "transformer", classe: classe === "CP" ? "CE1" : classe }),
      ec(4, "Je relis mon texte", { exercice: "relecture", classe }),
    ],
    materiel: ["Le texte de lecture ; la boîte de mots", "Le récit répétitif, en grand", "Le texte de départ et la contrainte", "Le poème appris, en grand", "Les textes de la séquence ; des feuilles pour le propre"],
  }),
  "phrase-prototypique-ce1": () => ({
    feuilles: [
      ec(0, "Les gammes d'écriture", { exercice: "gammes", classe: "CE1" }),
      ec(1, "Déplacer, ajouter, remplacer, supprimer", { exercice: "manipulations", classe: "CE1" }),
      ec(2, "De l'oral à l'écrit", { exercice: "oralEcrit", classe: "CE1" }),
      ec(3, "Le jogging d'écriture", { exercice: "lanceurs", classe: "CE1" }),
      ec(4, "Une phrase avec des mots imposés", { exercice: "motsImposes", classe: "CE1" }),
    ],
    materiel: ["La phrase prototypique au tableau ; les boîtes à mots", "La phrase de base en étiquettes", "Les phrases dites à l'oral, au tableau", "Le lanceur du jour ; le cahier du jour", "Une image ou un poème court ; le cahier d'écriture"],
  }),
  "connecteurs-ce1": () => ({
    feuilles: [
      ec(1, "Enchaîner les phrases", { exercice: "connecteurs", classe: "CE1" }),
      ec(2, "Enchaîner les phrases — les connecteurs logiques", { exercice: "connecteurs", classe: "CE2" }),
      ec(4, "Je relis mon texte", { exercice: "relecture", classe: "CE1" }),
    ],
    materiel: ["Quatre phrases sans lien, au tableau", "Une frise de quatre images", "Des paires de phrases au tableau", "Un texte plein de répétitions", "Le passage de l'œuvre lue en classe"],
  }),
  "ecrire-un-texte-c2": (classe) => ({
    feuilles: [
      ec(1, "Je prépare mon écrit", { exercice: "planifier", classe }),
      ec(3, "Je relis mon texte", { exercice: "relecture", classe }),
      ...(classe === "CE2" ? [ec(4, "Écrire à un destinataire", { exercice: "message", classe })] : []),
    ],
    materiel: ["Des textes de même nature que celui à écrire", "Le tableau, pour la planification collective", "La banque de mots ; le cahier d'écriture, page de gauche", "La grille de relecture ; le code de correction", "Le cahier d'écriture, page de droite ; de quoi illustrer"],
  }),
};

export const estUneDemarcheDEcriture = (id: string) => id in PLANS;

export function planDeLEcriture(demarcheId: string, ctx: ContexteFeuilles): PlanDesFeuilles | null {
  const fabrique = PLANS[demarcheId];
  if (!fabrique) return null;
  const p = fabrique(ctx.classe);
  const materiel = p.materiel.map((debut, s) => {
    const f = p.feuilles.filter((x) => x.seance === s).map((x) => `« ${x.titre} »`);
    return f.length ? `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${f.join(" et ")}.` : `${debut}.`;
  });
  return { feuilles: p.feuilles, materiel };
}
