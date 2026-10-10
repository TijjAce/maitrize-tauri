// ── Les mots des problèmes ─────────────────────────────────────────────────
//
// Un élève qui ne sait pas ce qu'est une mirabelle, un préau ou une tirelire,
// ou ce que veut dire « il reste », bute sur le problème avant même de le
// chercher. L'enseignant l'a demandé : dans toute séquence qui pose des
// problèmes, les mots des énoncés se travaillent en début de séquence. La
// séquence s'ouvre donc sur une séance « Les mots des problèmes » — les
// rencontrer en contexte, les jouer, les trier, comme le veut la démarche de
// vocabulaire des livrets de français (Éduscol, « Enrichir son vocabulaire
// dans toutes les disciplines ») —, et sur une feuille : les mots que ses
// problèmes emploient vraiment, chacun avec son picto, ou la photo qu'on a
// prise de l'objet.
//
// Les énoncés se tirent au hasard à la création de la séquence : on relève
// les mots dans les feuilles fabriquées, d'après un dictionnaire des mots que
// les énoncés de l'application emploient (un test vérifie qu'il n'en manque
// aucun).

import type { Demarche, SeanceCadre } from "./demarches";
import type { PlanDesFeuilles } from "./feuillesDesSequences";
import { attributionPour, feuille } from "./cartesImprimables";
import { escapeHtml } from "./print";

/**
 * Une entrée du dictionnaire : ce qu'on écrit sous l'image, le mot qu'on
 * cherche dans la banque, les formes des énoncés (« @… » : une expression).
 * Le mot cherché n'est pas toujours l'étiquette : la banque répond par le
 * premier picto qui porte ce mot, et « monter » y fait d'abord du cheval —
 * on cherche donc « monter les escaliers », comme « retirer » pour enlever.
 * Vide : pas de picto plutôt qu'un faux.
 */
type Entree = [etiquette: string, picto: string, formes: string];

/** Les personnes, les animaux, les choses, les lieux et les moments des énoncés. */
const CHOSES: Entree[] = [
  ["l'adulte", "adulte", "adultes"], ["l'album", "album", "album albums"], ["l'animal", "animal", "animal animaux"],
  ["l'aquarium", "aquarium", "aquarium"], ["l'arbre", "arbre", "arbre"], ["l'arrêt de bus", "arrêt de bus", "arrêt"],
  ["l'argent", "argent", "argent"], ["l'assiette", "assiette", "assiette assiettes"], ["la baguette", "pain", "baguette"],
  ["le ballon", "ballon", "ballon"], ["la bande de papier", "bande de papier", "bande bandes"], ["la bande dessinée", "bande dessinée", "@bandes? dessinées?"],
  ["les baskets", "baskets", "baskets"], ["la bibliothèque", "bibliothèque", "bibliothèque"], ["la bille", "bille", "bille billes"],
  ["le billet", "billets", "billet"], ["le biscuit", "biscuit", "biscuits"], ["le bouquet", "bouquet", "bouquet bouquets"],
  ["la bouteille", "bouteille", "bouteille"], ["la boîte", "boîte", "boîte boîtes"], ["le brigand", "voleur", "brigands"],
  ["le bus", "bus", "bus"], ["le cahier", "cahier", "cahier cahiers"], ["le camion", "camion", "camion camions"],
  ["la cantine", "cantine", "cantine"], ["la carotte", "carotte", "carottes"], ["la carte", "jeu de cartes", "carte cartes"],
  ["le casque", "casque", "casque"], ["la cerise", "cerise", "cerises"], ["la chaise", "chaise", "chaises"],
  ["le chant", "chanter", "chant"], ["le chapeau", "chapeau", "chapeau chapeaux"], ["le chocolat", "chocolat", "chocolat"],
  ["la chèvre", "chèvre", "chèvres"], ["la cigogne", "cigogne", "cigognes"], ["la classe", "salle de classe", "classe"],
  ["le client", "client", "clients"], ["le clown", "clown", "clown"], ["le coffre", "coffre", "coffre coffres"],
  ["le coquillage", "coquillage", "coquillages"], ["la corde à sauter", "corde à sauter", "@cordes? à sauter"], ["le cornet de glace", "cornet de glace", "cornet cornets"],
  ["le costume", "déguisement", "costumes"], ["la cour", "cour de récréation", "cour"], ["la course", "course", "course"],
  ["le crayon", "crayon", "crayons"], ["le croissant", "croissant", "croissant"], ["la danse", "danse", "danse"],
  ["le dessert", "dessert", "dessert desserts"], ["les devoirs", "devoirs", "devoirs"], ["le dictionnaire", "dictionnaire", "dictionnaire dictionnaires"],
  ["le documentaire", "livre", "documentaire documentaires"], ["l'école", "école", "école"], ["l'élève", "élève", "élèves"],
  ["l'enfant", "enfant", "enfants"], ["l'entracte", "entracte", "entracte"], ["l'entrée", "", "entrée entrées"],
  ["l'équipe", "équipe", "équipe équipes"], ["l'euro", "euro", "euros €"], ["la fête", "fête", "fête"],
  ["la fille", "fille", "fille filles"], ["la fleur", "fleur", "fleur fleurs"], ["le fleuve", "fleuve", "fleuve"],
  ["le football", "football", "football"], ["le four", "four", "four"], ["la fraise", "fraise", "fraise fraises"],
  ["la gare", "gare", "gare"], ["la garniture", "garniture", "garniture garnitures"], ["le garçon", "garçon", "garçons"],
  ["la glace", "glace", "glaces"], ["le glacier", "glacier", "glacier"], ["la gomme", "gomme", "gomme"],
  ["le gâteau", "gâteau", "gâteau gâteaux"], ["l'heure", "heure", "heure heures h"], ["la demi-heure", "demi-heure", "demi-heure"],
  ["le quart d'heure", "quart d'heure", "@quarts? d'heure"], ["l'hirondelle", "hirondelle", "hirondelles"], ["l'huile", "huile", "huile"],
  ["l'image", "autocollant", "images"], ["le jardin", "jardin", "jardin"], ["le jeu", "jeu", "jeu"],
  ["le jeu de société", "dé", "@jeux? de société"], ["le judo", "judo", "judo"], ["le jus", "jus", "jus"],
  ["la lecture", "lire", "lecture"], ["le litre", "litre", "litre litres"], ["le livre", "livre", "livre livres"],
  ["la longueur", "longueur", "longueur"], ["le légume", "légume", "légumes"], ["le magazine", "revue", "magazine"],
  ["la maîtresse", "maîtresse", "maîtresse maitresse"], ["le match", "match", "match"], ["le menu", "menu", "menus"],
  ["la minute", "minute", "minutes min"], ["la mirabelle", "mirabelle", "mirabelles"], ["la moto", "moto", "moto motos"],
  ["le mouton", "mouton", "mouton moutons"], ["la musique", "musique", "musique"], ["le navet", "navet", "navets"],
  ["l'oiseau", "oiseau", "oiseaux"], ["l'oiseau migrateur", "oiseau", "@oiseaux migrateurs"], ["la page", "page", "page pages"], ["le pain", "pain", "pain pains"],
  ["la paire", "paire", "paire"], ["le panier", "panier", "panier"], ["le pantalon", "pantalon", "pantalon pantalons"],
  ["papi", "papi", "papi"], ["mamie", "mamie", "mamie"], ["tata", "tante", "tata"],
  ["tonton", "oncle", "tonton"], ["le paquet", "paquet", "paquet paquets"], ["le parfum", "", "parfum parfums"],
  ["le parking", "parking", "parking"], ["la pause", "pause", "pause"], ["la peinture", "peinture", "peinture"],
  ["la peluche", "peluche", "peluche"], ["la personne", "personne", "personnes"], ["la pièce d'or", "trésor", "@pièces? d'or"],
  ["la pièce", "monnaie", "pièce pièces"], ["la poire", "poire", "poires"], ["le point", "", "points"],
  ["le poisson", "poisson", "poisson poissons"], ["la pomme", "pomme", "pomme pommes"], ["le potager", "potager", "potager"],
  ["la poupée", "poupée", "poupée"], ["le professeur", "professeur", "professeur"], ["la prune", "prune", "prunes"],
  ["le pré", "pré", "pré"], ["le préau", "préau", "préau"], ["le puzzle", "puzzle", "puzzle"],
  ["le restaurant", "restaurant", "restaurant"], ["le rosier", "rosier", "rosiers"], ["la récréation", "récréation", "récréation"],
  ["le sac à dos", "sac à dos", "@sacs? à dos"], ["le sac", "sac", "sac sacs"], ["la salle", "salle", "salle"],
  ["le sandwich", "sandwich", "sandwich sandwichs"], ["la semaine", "semaine", "semaine"], ["le spectacle", "spectacle", "spectacle"],
  ["le spectateur", "spectateurs", "spectateurs"], ["le sport", "sport", "sport"], ["le stade", "stade", "stade"],
  ["le stylo", "stylo", "stylo"], ["la séance", "", "séance"], ["la table", "table", "table tables"],
  ["la tarte", "tarte", "tarte"], ["le tee-shirt", "tee-shirt", "teeshirt teeshirts"], ["le timbre", "timbre", "timbres"],
  ["la tirelire", "tirelire", "tirelire"], ["le train", "train", "train"], ["la trousse", "trousse", "trousse"],
  ["la trottinette", "trottinette", "trottinette"], ["la vache", "vache", "vaches"], ["la vanille", "vanille", "vanille"],
  ["le vendeur", "vendeur", "vendeur"], ["la voiture", "voiture", "voiture voitures"], ["le véhicule", "véhicule", "véhicule véhicules"],
  ["le centimètre", "règle", "cm"], ["lundi", "lundi", "lundi"], ["mardi", "mardi", "mardi"],
  ["midi", "midi", "midi"], ["l'Afrique", "Afrique", "afrique"], ["rouge", "rouge", "rouge rouges"],
  ["bleu", "bleu", "bleu bleue bleus bleues"], ["jaune", "jaune", "jaune jaunes"], ["vert", "vert", "verts verte vertes"],
  ["noir", "noir", "noire noires"], ["blanc", "blanc", "blanches"],
];

/** Ce qui se passe dans les énoncés, à l'infinitif. */
const ACTIONS: Entree[] = [
  ["acheter", "acheter", "acheté achète"], ["ajouter", "mettre", "ajoute ajoutent ajouté ajoutées"], ["apporter", "apporter", "apporte"],
  ["arriver", "arriver", "arrivent arriver arrivé arrivés"], ["attendre", "attendre", "attendre"], ["bêcher", "bêcher", "bêcher"],
  ["choisir", "choisir", "choisit"], ["coller", "coller", "colle"], ["commencer", "commencer", "commence"],
  ["composer", "", "composer"], ["contenir", "contenir", "contient"], ["cueillir", "cueillir", "cueilli cueillies"],
  ["cuire", "cuire", "cuire"], ["descendre", "descendre", "descendent descendues descendus"], ["déguiser", "déguiser", "déguiser"],
  ["distribuer", "distribuer", "distribue"], ["donner", "donner", "donne"], ["durer", "durer", "dure durent dure-t-il"],
  ["emprunter", "emprunter", "empruntent"], ["enlever", "retirer", "enlevé enlevées enlève"], ["entrer", "entrer", "entrés"],
  ["s'envoler", "battre des ailes", "envolent envolés"], ["finir", "finir", "fini finit"], ["gagner", "gagner", "gagne"],
  ["habiller", "habiller", "habiller"], ["installer", "installer", "installe"], ["jouer", "jouer", "jouent"],
  ["livrer", "livrer", "livrée"], ["mesurer", "mesurer", "mesure mesurent"], ["mettre", "mettre", "met mettre mis mises"],
  ["monter", "monter les escaliers", "montent montées montés"], ["partir", "partir", "parti partie"], ["payer", "payer", "paie payé"],
  ["perdre", "perdre", "perd"], ["placer", "placer", "place placées"], ["poser", "mettre", "pose"],
  ["prendre", "prendre", "prennent pris prises"], ["ranger", "ranger", "range rangé rangées"], ["recevoir", "recevoir", "recevoir"],
  ["remplir", "remplir", "remplit"], ["rendre", "rendre la monnaie", "rendre rend-on"], ["rentrer", "rentrer", "rentré rentrée"],
  ["rester", "rester", "resté restée"], ["s'asseoir", "s'asseoir sur une chaise", "asseoir"], ["sortir", "sortir", "sorti sortie sortis"],
  ["tailler", "tailler", "tailler"], ["terminer", "terminer", "termine"], ["travailler", "travailler", "travaille"],
  ["utiliser", "utiliser", "utilise"], ["coûter", "prix", "coute coûte"], ["former", "former", "forment"],
];

/**
 * Les mots de la question et des relations. Pas de picto pour « en tout »,
 * « il reste », « de plus » : un dessin d'opération ferait croire qu'un mot
 * dit l'opération — le livret de CP met en garde contre ces associations
 * réductrices. On les montre par une petite scène, avec des objets.
 */
const QUESTION: Entree[] = [
  ["combien", "combien", "combien(?! de temps)"], ["combien de temps", "temps", "combien de temps"], ["à quelle heure", "horloge", "à quelle heure"],
  ["quel, quelle", "", "quel(?:le)?s?"], ["il faut", "", "faut-il|il faut"],
  ["en tout", "", "en tout"], ["il reste", "", "reste(?:-t-il)?"], ["maintenant", "maintenant", "maintenant"],
  ["avant", "avant", "avant"], ["au début", "", "au début|début"], ["de plus", "", "de plus"],
  ["de moins", "", "de moins"], ["fois plus", "", "fois plus"], ["fois moins", "", "fois moins"],
  ["chaque", "", "chaque"], ["ensemble", "", "ensemble"], ["autant", "", "autant|le même nombre"],
  ["la somme", "", "somme"], ["le prix", "prix", "prix"], ["par", "", "par"],
  ["les autres", "", "autres?"], ["parmi", "", "parmi"], ["différent", "", "différente?s?"], ["la sorte", "", "sortes?"], ["bout à bout", "", "bout à bout"],
  ["plus tard", "plus tard", "plus tard"], ["pendant", "pendant", "pendant"], ["de combien de façons", "", "façons"],
  ["premier, deuxième", "premier", "premi(?:er|ère)|deuxième"],
];

/** Une expression, entière : ni au milieu d'un mot, accents compris. */
const expression = (source: string) => new RegExp(`(?<![\\p{L}-])(?:${source})(?![\\p{L}-])`, "giu");

type Sorte = "choses" | "actions" | "question";
interface Lu { sorte: Sorte; etiquette: string; picto: string }
/** Les expressions de plusieurs mots, à relever avant les mots seuls ; puis chaque forme d'un mot, vers son entrée. */
const EXPRESSIONS: [RegExp, Lu][] = [
  ...QUESTION.map(([etiquette, picto, motif]): [RegExp, Lu] => [expression(motif), { sorte: "question", etiquette, picto }]),
  ...CHOSES.filter(([, , f]) => f.startsWith("@")).map(([etiquette, picto, f]): [RegExp, Lu] => [expression(f.slice(1)), { sorte: "choses", etiquette, picto }]),
];
const FORMES = new Map<string, Lu>(([["choses", CHOSES], ["actions", ACTIONS]] as const).flatMap(([sorte, liste]) =>
  liste.filter(([, , f]) => !f.startsWith("@")).flatMap(([etiquette, picto, f]) => f.split(" ").map((forme): [string, Lu] => [forme, { sorte, etiquette, picto }]))));

/** Un mot relevé : ce qu'on écrit, le mot du picto, dans combien d'énoncés on l'a trouvé. */
export interface MotDuProbleme { mot: string; picto: string; fois: number }
export interface MotsDesProblemes { choses: MotDuProbleme[]; actions: MotDuProbleme[]; question: MotDuProbleme[] }

export const nombreDeMots = (m: MotsDesProblemes) => m.choses.length + m.actions.length + m.question.length;

/** Les mots d'un énoncé, en minuscules, l'élision ôtée — « l'arbre » donne « arbre » —, les expressions déjà relevées en moins. */
export function motsDeLEnonce(enonce: string): { lus: Lu[]; inconnus: string[] } {
  let texte = enonce.toLowerCase().replace(/’/g, "'").replace(/ /g, " ");
  const lus: Lu[] = [];
  for (const [motif, lu] of EXPRESSIONS) {
    motif.lastIndex = 0;
    if (motif.test(texte)) lus.push(lu);
    texte = texte.replace(motif, " ");
  }
  const inconnus: string[] = [];
  for (const brut of texte.split(/[^\p{L}'€-]+/u)) {
    const mot = brut.replace(/^(?:l|d|qu|c|s|n|j|m|t)'/, "").replace(/^-+|-+$/g, "");
    if (!mot) continue;
    const lu = FORMES.get(mot);
    if (lu) lus.push(lu); else inconnus.push(mot);
  }
  return { lus, inconnus };
}

/**
 * Les mots de ces énoncés, chacun une fois, rangés : les personnes et les
 * choses, ce qui se passe, les mots de la question. Les plus fréquents
 * d'abord — ceux qu'on retrouvera dans presque chaque problème —, puis dans
 * l'ordre où ils viennent.
 */
export function motsDesEnonces(enonces: string[]): MotsDesProblemes {
  const vus = new Map<string, { lu: Lu; fois: number; rang: number }>();
  for (const enonce of enonces) {
    const ici = new Set<string>();
    for (const lu of motsDeLEnonce(enonce).lus) {
      const cle = `${lu.sorte}|${lu.etiquette}`;
      if (ici.has(cle)) continue;
      ici.add(cle);
      const deja = vus.get(cle);
      if (deja) deja.fois += 1; else vus.set(cle, { lu, fois: 1, rang: vus.size });
    }
  }
  const de = (sorte: Sorte) => [...vus.values()].filter((v) => v.lu.sorte === sorte)
    .sort((a, b) => b.fois - a.fois || a.rang - b.rang)
    .map((v) => ({ mot: v.lu.etiquette, picto: v.lu.picto, fois: v.fois }));
  return { choses: de("choses"), actions: de("actions"), question: de("question") };
}

/** Les énoncés des problèmes d'une feuille : ceux des problèmes en barres, des durées, de la monnaie, du calcul, des cartes à tâches. */
export function enoncesDuHtml(html: string): string[] {
  const sortie: string[] = [];
  for (const m of html.matchAll(/<(div|p)\b[^>]*class="[^"]*\b(?:pb|he|mo|ma|ct)-enonce\b[^"]*"[^>]*>([\s\S]*?)<\/\1>/g)) {
    const texte = m[2].replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
    if (texte) sortie.push(texte);
  }
  return sortie;
}

// ── La séance ──────────────────────────────────────────────────────────────

/**
 * Les séquences qui posent des problèmes : une de leurs feuilles en a trois
 * au moins. Un test le vérifie sur toutes les démarches.
 */
export const DEMARCHES_A_PROBLEMES = new Set([
  "problemes", "arbre-a-calcul-cp", "parties-tout-cp", "parties-tout-ce1", "deux-etapes-ce2",
  "deux-etapes-cp", "multiplicatifs-cp", "comparaison-ce1", "deux-etapes-ce1", "multiplicatifs-ce1", "mixtes-ce1",
  "parties-tout-comparaison-ce2", "multiplicatifs-ce2", "mixtes-ce2", "comparaison-multiplicative-ce2", "produits-cartesiens-ce2",
  "sens-addition-soustraction-cp", "sens-multiplication-cp", "multiplication-ce1", "division-ce2",
  "monnaie-cp", "monnaie-ce1", "monnaie-ce2", "durees-ce1", "durees-ce2",
]);

/** La séance qui ouvre une séquence de problèmes. */
export const SEANCE_DES_MOTS: SeanceCadre = {
  titre: "Les mots des problèmes",
  objectifs: "À la fin de cette séance, les élèves sauront nommer les personnes, les objets et les actions des problèmes de la séquence, et comprendre les mots de leurs questions — « combien », « en tout », « il reste »…",
  duree: 45,
  phases: [
    {
      phase: "Rencontrer les mots", duree: "15 min",
      description: "Les personnes, les objets et les lieux des problèmes de la séquence, montrés en vrai, en photo ou en picto (la feuille « Les mots des problèmes ») : on les nomme, on les touche, on dit à quoi ils servent ; les étiquettes vont au tableau.",
      posture: "Apporte les objets réels quand on les a — un panier, des fruits, des billes — ; nomme, fait répéter, reformule.",
    },
    {
      phase: "Jouer les actions", duree: "10 min",
      description: "Ce qui se passe dans les problèmes — monter, descendre, enlever, ajouter… — joué avec les objets ou mimé : un élève fait, les autres disent ce qu'il fait.",
      posture: "Fait dire la phrase entière : « Zoé enlève des cerises du panier ».",
    },
    {
      phase: "Les mots de la question", duree: "10 min",
      description: "« Combien », « en tout », « il reste », « de plus »… : chaque mot montré par une petite scène, avec des cubes ou des objets ; on dit ce qu'on cherche, sans calculer.",
      posture: "Ne lie pas un mot à une opération : « de plus » ne veut pas toujours dire « + ». Le livret de CP met en garde contre ces associations réductrices, comme celle qui réduit la soustraction à « ce qu'il reste ».",
    },
    {
      phase: "Trier les étiquettes", duree: "10 min",
      description: "En petits groupes, les étiquettes à trier — les personnes et les choses, ce qui se passe, les mots de la question — ; chacun dit pourquoi.",
      posture: "Des images pour les non-lecteurs, peu de mots à la fois. Les étiquettes restent au tableau : on y revient au début de chaque séance de problèmes.",
    },
  ],
};

/** Le matériel de la séance, avant qu'on sache ses mots. */
export const MATERIEL_DES_MOTS = "Les objets des problèmes, en vrai quand on les a ; la feuille « Les mots des problèmes », imprimée deux fois : une pour le tableau, une à découper pour trier.";

/** Une démarche qui pose des problèmes s'ouvre sur la séance des mots ; les autres restent telles. */
export function avecLaSeanceDesMots(d: Demarche): Demarche {
  if (!DEMARCHES_A_PROBLEMES.has(d.id) || d.seances[0] === SEANCE_DES_MOTS) return d;
  return { ...d, seances: [SEANCE_DES_MOTS, ...d.seances] };
}

/** La démarche et ses feuilles, la séance des mots en tête : chaque feuille passe à la séance suivante. */
export function avecLesMotsDesProblemes(d: Demarche | undefined, plan: PlanDesFeuilles | null): { demarche: Demarche | undefined; plan: PlanDesFeuilles | null } {
  if (!d || !DEMARCHES_A_PROBLEMES.has(d.id) || d.seances[0] === SEANCE_DES_MOTS) return { demarche: d, plan };
  return {
    demarche: avecLaSeanceDesMots(d),
    plan: plan && { feuilles: plan.feuilles.map((f) => ({ ...f, seance: f.seance + 1 })), materiel: [MATERIEL_DES_MOTS, ...plan.materiel] },
  };
}

/** Les mots, pour le matériel de la séance : l'enseignant les voit avant d'imprimer. */
export function noteDesMots(m: MotsDesProblemes): string {
  const liste = (l: MotDuProbleme[]) => l.map((x) => x.mot).join(", ");
  return [
    m.choses.length ? `Les personnes et les choses : ${liste(m.choses)}.` : "",
    m.actions.length ? `Ce qui se passe : ${liste(m.actions)}.` : "",
    m.question.length ? `Les mots de la question : ${liste(m.question)}.` : "",
  ].filter(Boolean).join("\n");
}

// ── La feuille ─────────────────────────────────────────────────────────────

/** La feuille des mots : une carte par mot, son image au-dessus, à découper pour le tableau ou pour trier. */
export function htmlMotsDesProblemes(m: MotsDesProblemes, pictoDe: (x: MotDuProbleme) => number | null, images: Record<number, string>): string {
  const carte = (x: MotDuProbleme) => {
    const id = pictoDe(x);
    const src = id != null ? images[id] : undefined;
    return `<div class="mp-carte">${src ? `<img src="${src}" alt="">` : ""}<div class="mp-mot">${escapeHtml(x.mot)}</div></div>`;
  };
  const groupe = (titre: string, aide: string, liste: MotDuProbleme[]) => (liste.length
    ? `<section class="mp-groupe"><h2>${titre} <span class="mp-aide">${aide}</span></h2><div class="mp-cartes">${liste.map(carte).join("")}</div></section>` : "");
  const tous = [...m.choses, ...m.actions, ...m.question];
  return feuille(`<div class="titre">Les mots des problèmes</div>
    <div class="sous">Les mots des problèmes de la séquence, à découvrir avant de chercher : avec les objets, en photo ou en picto.</div>
    ${groupe("Les personnes et les choses", "Qui ? Quoi ? Où ?", m.choses)}${groupe("Ce qui se passe", "Ce qu'on fait.", m.actions)}${groupe("Les mots de la question", "Ce qu'on cherche, et comment les nombres vont ensemble.", m.question)}
    ${attributionPour(tous.map(pictoDe))}`, "mp");
}

export const STYLE_MOTS_DES_PROBLEMES = `
  .feuille.mp .mp-groupe { margin: 4mm 0 0; }
  .feuille.mp .mp-groupe h2 { font-size: 17px; margin: 0 0 2mm; break-after: avoid; page-break-after: avoid; }
  .feuille.mp .mp-aide { font-size: 12px; font-weight: 400; color: #4b5563; margin-left: 2mm; }
  .feuille.mp .mp-cartes { display: flex; flex-wrap: wrap; padding: 1px 0 0 1px; }
  .feuille.mp .mp-carte { box-sizing: border-box; width: 25%; height: 36mm; margin: -1px 0 0 -1px; border: 1px dashed #9aa0b4;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2mm; padding: 2mm;
    break-inside: avoid; page-break-inside: avoid; }
  .feuille.mp .mp-carte img { max-width: 26mm; max-height: 22mm; object-fit: contain; }
  .feuille.mp .mp-mot { font-size: 17px; font-weight: 700; text-align: center; line-height: 1.15; }
`;

/**
 * La feuille, ses images chargées : le picto de chaque mot, sinon un picto
 * gardé dans Mes pictos — une photo prise avec le téléphone —, selon le
 * choix photos ou pictos de l'atelier « Étiquettes ». Un mot sans image
 * reste écrit seul sur sa carte.
 */
export async function motsDesProblemesImprimable(m: MotsDesProblemes): Promise<{ html: string; style: string }> {
  const [{ pictosDesMots }, { chargerPicto }, { cleModeImages, lireModeImages }, { api }] = await Promise.all([
    import("./mesPictos"), import("./components/ChoixPicto"), import("./imagesSelonMode"), import("./api"),
  ]);
  const cherches = [...new Set([...m.choses, ...m.actions, ...m.question].map((x) => x.picto).filter(Boolean))];
  const [trouves] = cherches.length ? await pictosDesMots(cherches).catch(() => [[], []] as Awaited<ReturnType<typeof pictosDesMots>>) : [[]];
  const idDe = new Map(trouves.map((p) => [p.mot.toLowerCase(), p.id]));
  const mode = lireModeImages(await api.settingGet(cleModeImages("etiquettes")).catch(() => null));
  const images: Record<number, string> = {};
  await Promise.all([...new Set(idDe.values())].map(async (id) => {
    try { images[id] = await chargerPicto(id, mode); } catch { /* la carte garde son mot seul */ }
  }));
  // Seule une image chargée compte : la mention des banques ne nomme que ce que la feuille montre.
  const pictoDe = (x: MotDuProbleme) => {
    const id = x.picto ? idDe.get(x.picto.toLowerCase()) : undefined;
    return id != null && images[id] ? id : null;
  };
  return { html: htmlMotsDesProblemes(m, pictoDe, images), style: STYLE_MOTS_DES_PROBLEMES };
}
