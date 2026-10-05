// Catégoriser les mots : les jeux de la maternelle.
//
// « Organiser les mots en catégorie et en réseau » (programme de l'école
// maternelle, 2025). La fiche Éduscol « Catégoriser : de la catégorisation
// d'objets à la catégorisation de mots (représentés par des images) »
// (octobre 2023) en donne les jeux, âge par âge : trier, retirer l'intrus,
// le loto aveugle, « J'appelle… », les sous-catégories, les familles de mots
// et le mistigri. Le guide « Pour enseigner le vocabulaire à l'école
// maternelle » (2021) y ajoute le jeu des 7 familles, et l'affichage des
// catégories de la classe, trace de ce qu'on a structuré. Le livret « À
// partir de 5 ans » (2025) observe les élèves sur une grille : on la
// fabrique aussi.
//
// Les catégories sont celles que compose l'enseignant — ou celles des
// exemples de la fiche, toutes prêtes. Les élèves ne lisent pas encore : tout
// passe par l'image, le mot n'est écrit dessous que si on le veut.

import { escapeHtml } from "./print";
import { melanger } from "./hasard";
import {
  HAUTEUR_UTILE_MM, LARGEUR_CONTENU_MM, attributionPour, carte, feuille, gabaritGrille, hauteurDesCartes, imgPicto, legende, pagesAvecRegle, pagesDeCartes,
  type FormatGrille,
} from "./cartesImprimables";
import type { MotImage } from "./jeuxSons";

export type Niveau = "PS" | "MS" | "GS";

export const NIVEAUX: { id: Niveau; age: string; classe: string }[] = [
  { id: "PS", age: "à partir de 3 ans", classe: "petite section" },
  { id: "MS", age: "à partir de 4 ans", classe: "moyenne section" },
  { id: "GS", age: "à partir de 5 ans", classe: "grande section" },
];

/** Ce qu'on observe chez l'élève, d'après la fiche « Catégoriser » : la progression d'un âge à l'autre. */
export const REPERES: Record<Niveau, string> = {
  PS: "Retirer l'intrus ; mettre ensemble ce qui va ensemble ; attribuer un objet à une catégorie (les aliments, les vêtements) ; corriger une catégorie.",
  MS: "Trier et commencer à justifier ; classer et nommer la catégorie ; trouver un intrus et dire pourquoi ; faire deux classements différents du même corpus ; les familles de mots (chien – chiot).",
  GS: "Trier selon un ou plusieurs critères imposés ; nommer les catégories et les sous-catégories (animaux à poils, à plumes…) ; trouver les intrus et justifier ; changer la règle de classement ; les familles de mots (arrosoir – arroser).",
};

/** Une catégorie de mots : son nom, l'image qui la dit, et ses mots en images. */
export interface Categorie {
  nom: string;
  /** Le picto qui dit la catégorie — celui du mot qui les dit toutes : « fruits ». */
  image: number | null;
  /** Ce que dit le meneur de « J'appelle… » : « tout ce qui se mange ». Vide, c'est le nom. */
  appel: string;
  /** Des images qui ne vont dans aucune boîte : les intrus du tri. */
  intrus: boolean;
  mots: MotImage[];
}

export type Forme = "cartes" | "tri" | "intrus" | "loto" | "appelle" | "familles" | "mistigri" | "affiche" | "evaluation";

export const FORMES: { id: Forme; nom: string; quoi: string }[] = [
  { id: "cartes", nom: "Les cartes-images", quoi: "toutes les images du corpus, à nommer, décrire, manipuler" },
  { id: "tri", nom: "Les boîtes de tri", quoi: "une boîte par catégorie et les images à découper pour les ranger" },
  { id: "intrus", nom: "Trouve l'intrus", quoi: "dans chaque ligne, une image ne va pas avec les autres" },
  { id: "loto", nom: "Le loto des catégories", quoi: "le loto aveugle : une plaque par catégorie, les cartes à piocher" },
  { id: "appelle", nom: "J'appelle…", quoi: "« J'appelle tout ce qui se mange ! » : les cartes d'appel et les images" },
  { id: "familles", nom: "Le jeu des familles", quoi: "« Dans la famille des fruits, je voudrais la pomme »" },
  { id: "mistigri", nom: "Le mistigri", quoi: "des paires de cartes qui vont ensemble, et le mistigri" },
  { id: "affiche", nom: "L'affichage des catégories", quoi: "la trace : une page par catégorie, pour le mur de la classe" },
  { id: "evaluation", nom: "La grille d'observation", quoi: "l'évaluation : ce qu'on observe chez chaque élève" },
];

export const nomDeLaForme = (f: Forme) => FORMES.find((x) => x.id === f)?.nom ?? "Catégoriser";

export interface ReglagesCategoriser {
  niveau: Niveau;
  forme: Forme;
  categories: Categorie[];
  /** Le nom des catégories sur les boîtes et les plaques ; décoché, c'est l'élève qui les nomme. */
  nommer: boolean;
  /** Le mot écrit sous chaque image. */
  legendes: boolean;
  /** Les boîtes du tri dessinées en maisons : les maisons des familles de mots. */
  maisons: boolean;
  /** L'intrus : combien de lignes, et combien d'images par ligne, l'intrus compris. */
  lignes: number;
  parLigne: number;
}

/** Ce que la fiche fait faire à chaque âge : des catégories nommées d'abord, puis que l'élève nomme. */
export function reglagesDuNiveau(n: Niveau): Pick<ReglagesCategoriser, "nommer" | "lignes" | "parLigne"> {
  // « Parmi trois lignes de 2 à 3 cartes qui appartiennent à la même catégorie, il y a un intrus » (3 ans) ;
  // une dizaine de cartes (4 ans), une quinzaine (5 ans).
  return n === "PS" ? { nommer: true, lignes: 3, parLigne: 3 } : n === "MS" ? { nommer: true, lignes: 5, parLigne: 4 } : { nommer: false, lignes: 6, parLigne: 4 };
}

export const REGLAGES_CATEGORISER: ReglagesCategoriser = {
  niveau: "MS", forme: "tri", categories: [], legendes: false, maisons: false, ...reglagesDuNiveau("MS"),
};

export const CATEGORIES_MAX = 8;

const texte = (v: unknown) => (typeof v === "string" ? v : "");
const entier = (v: unknown) => (typeof v === "number" && Number.isInteger(v) ? v : null);

/** Les catégories enregistrées, réparées : ce qu'une version plus ancienne ou un fichier abîmé y a laissé. */
export function normaliserCategories(brut: unknown): Categorie[] {
  if (!Array.isArray(brut)) return [];
  return brut.slice(0, CATEGORIES_MAX).map((c): Categorie => {
    const o = (c && typeof c === "object" ? c : {}) as Record<string, unknown>;
    const mots = Array.isArray(o.mots) ? o.mots : [];
    return {
      nom: texte(o.nom), image: entier(o.image), appel: texte(o.appel), intrus: o.intrus === true,
      mots: mots.filter((m): m is Record<string, unknown> => Boolean(m) && typeof m === "object")
        .map((m) => ({ id: entier(m.id), mot: texte(m.mot) })).filter((m) => m.mot.trim() || m.id != null),
    };
  });
}

/** Les catégories qui ont une boîte : pas les intrus, et au moins une image. */
export const categoriesRangees = (cs: Categorie[]) => cs.filter((c) => !c.intrus && c.mots.length > 0);

/** Les images à charger : celles des mots, et celles qui disent les catégories. */
export function idsDesImages(cs: Categorie[]): number[] {
  const ids = cs.flatMap((c) => [c.image, ...c.mots.map((m) => m.id)]).filter((x): x is number => x != null);
  return [...new Set(ids)];
}

/** Le mot d'une catégorie qui en cherche l'image : « Les fruits » → « fruits », « La famille de chaussure » → « chaussure ». */
export function motDeLaCategorie(nom: string): string {
  return nom.trim().toLowerCase()
    .replace(/^(les|la|le|l'|l’|des|du|de la|de l'|ce qui|ce que|ce qu'|tout ce qui|tous les|toutes les|chez le|chez la)\s*/, "")
    .replace(/^(animaux|famille) (de la|de l'|des|du|de|à)\s+/, "")
    .trim();
}

/** Les mots à essayer dans la banque pour l'image d'une catégorie : le mot, puis son singulier (« poils » → « poil »). */
export function motsPourLImage(nom: string): string[] {
  const mot = motDeLaCategorie(nom);
  if (!mot) return [];
  const singulier = mot.replace(/aux$/, "al").replace(/([^s])s$/, "$1");
  return [...new Set([mot, singulier])];
}

// ── Les catégories toutes prêtes ──────────────────────────────────────────
//
// Les exemples de la fiche « Catégoriser » et du programme, puis des thèmes de
// la classe — les saisons, la maison, les couleurs —, avec des mots qui ont
// tous un picto dans la banque, et le bon : « baguette » y est un bâton,
// « paquebot » le même dessin que « bateau », « seau » une poubelle, « feu » un
// feu tricolore, « maïs » des grains bruns, « salade » un bol bleu (on dit « laitue »).

export interface CategoriePreparee {
  nom: string;
  /**
   * Le mot dont le picto dit la catégorie — ou le numéro du picto, quand le
   * premier dessin du mot n'est pas le bon (« salle de bain » : une porte).
   */
  picto: string | number;
  appel?: string;
  intrus?: boolean;
  mots: string[];
}

export interface JeuDeCategories {
  id: string;
  libelle: string;
  niveaux: Niveau[];
  /** D'où vient l'exemple, pour le dire à l'écran. */
  source: string;
  categories: CategoriePreparee[];
}

export const JEUX_DE_CATEGORIES: JeuDeCategories[] = [
  {
    id: "habiller-cuisiner", libelle: "S'habiller ou cuisiner", niveaux: ["PS"],
    source: "fiche « Catégoriser » : « Mets d'un côté ce qui sert à s'habiller, de l'autre ce qui sert à cuisiner »",
    categories: [
      { nom: "Ce qui sert à s'habiller", picto: "vêtements", appel: "ce qui sert à s'habiller", mots: ["bonnet", "pull", "pantalon", "chaussette", "manteau", "robe"] },
      { nom: "Ce qui sert à cuisiner", picto: "ustensiles de cuisine", appel: "ce qui sert à cuisiner", mots: ["casserole", "cuillère", "fouet", "poêle", "louche", "passoire"] },
    ],
  },
  {
    id: "piscine-neige", libelle: "Le sac de la poupée : la piscine ou la neige", niveaux: ["PS"],
    source: "fiche « Catégoriser » : le sac de piscine de la poupée",
    categories: [
      { nom: "Pour aller à la piscine", picto: "piscine", appel: "ce qu'on met dans le sac de piscine", mots: ["maillot de bain", "bonnet de bain", "serviette", "lunettes de natation", "bouée", "brassards"] },
      { nom: "Pour jouer dans la neige", picto: "neige", appel: "ce qu'on prend pour jouer dans la neige", mots: ["anorak", "écharpe", "gants", "moufles", "bottes", "luge"] },
    ],
  },
  {
    id: "fruits-legumes", libelle: "Les fruits et les légumes", niveaux: ["PS", "MS"],
    source: "fiche « Catégoriser » : le marchand de légumes",
    categories: [
      { nom: "Les fruits", picto: "fruits", appel: "les fruits", mots: ["pomme", "banane", "poire", "orange", "fraise", "cerise"] },
      { nom: "Les légumes", picto: "légumes", appel: "les légumes", mots: ["carotte", "laitue", "poireau", "pomme de terre", "chou", "radis"] },
    ],
  },
  {
    id: "ferme-foret", libelle: "Les animaux de la ferme et de la forêt", niveaux: ["MS"],
    source: "fiche « Catégoriser » : le jeu des animaux, deux sous-catégories",
    categories: [
      { nom: "Les animaux de la ferme", picto: "ferme", appel: "les animaux qui vivent à la ferme", mots: ["vache", "cochon", "mouton", "poule", "cheval", "chèvre"] },
      { nom: "Les animaux de la forêt", picto: "forêt", appel: "les animaux qui vivent dans la forêt", mots: ["renard", "cerf", "sanglier", "hibou", "écureuil", "hérisson"] },
    ],
  },
  {
    id: "quatre-grandes", libelle: "Animaux, véhicules, aliments, vêtements", niveaux: ["MS", "GS"],
    source: "fiche « Catégoriser » : « J'appelle tout ce qui se mange », quatre catégories mêlées",
    categories: [
      { nom: "Les animaux", picto: "animaux", appel: "tout ce qui est une bête", mots: ["chat", "chien", "lion", "vache", "poule"] },
      { nom: "Les véhicules", picto: "véhicule", appel: "tout ce qui sert à se déplacer", mots: ["voiture", "bus", "vélo", "avion", "bateau"] },
      { nom: "Les aliments", picto: "aliment", appel: "tout ce qui se mange", mots: ["pain", "fromage", "yaourt", "pomme", "œuf"] },
      { nom: "Les vêtements", picto: "vêtements", appel: "tout ce qu'on met pour s'habiller", mots: ["robe", "pull", "pantalon", "chaussette", "bonnet"] },
    ],
  },
  {
    id: "marchands", libelle: "Les marchands", niveaux: ["MS", "GS"],
    source: "fiche « Catégoriser » : « Quel marchand peut les mettre dans son magasin ? »",
    categories: [
      { nom: "Chez le boulanger", picto: "boulangerie", appel: "ce qu'on achète chez le boulanger", mots: ["pain", "croissant", "pain au chocolat", "gâteau", "tarte", "pain de mie"] },
      { nom: "Chez le boucher", picto: "boucherie", appel: "ce qu'on achète chez le boucher", mots: ["viande", "saucisse", "jambon", "poulet", "steak", "rôti"] },
      { nom: "Chez le poissonnier", picto: "poissonnerie", appel: "ce qu'on achète chez le poissonnier", mots: ["poisson", "crevette", "huître", "crabe", "moule", "saumon"] },
      { nom: "Chez le primeur", picto: "primeur", appel: "les fruits et les légumes", mots: ["pomme", "banane", "cerise", "carotte", "laitue", "poireau"] },
    ],
  },
  {
    id: "poils-plumes", libelle: "Les animaux à poils, à plumes, à écailles, à carapace", niveaux: ["GS"],
    source: "fiche « Catégoriser » : le jeu des animaux, quatre sous-catégories",
    categories: [
      { nom: "Les animaux à poils", picto: "poil", appel: "les animaux qui ont des poils", mots: ["chat", "chien", "lapin", "ours", "lion"] },
      { nom: "Les animaux à plumes", picto: "plume", appel: "les animaux qui ont des plumes", mots: ["poule", "canard", "hibou", "perroquet", "pigeon"] },
      { nom: "Les animaux à écailles", picto: "écailles", appel: "les animaux qui ont des écailles", mots: ["poisson", "serpent", "crocodile", "lézard", "requin"] },
      { nom: "Les animaux à carapace", picto: "carapace", appel: "les animaux qui ont une carapace", mots: ["tortue", "crabe", "homard", "crevette", "tatou"] },
    ],
  },
  {
    id: "roule-vole-flotte", libelle: "Les véhicules : ce qui roule, vole, flotte", niveaux: ["GS"],
    source: "programme 2025 : chercher des hyperonymes (« véhicule est un hyperonyme de voiture, bus, vélo »)",
    categories: [
      { nom: "Ce qui roule", picto: "rouler", appel: "les véhicules qui roulent", mots: ["voiture", "bus", "vélo", "train", "camion", "moto"] },
      { nom: "Ce qui vole", picto: "voler", appel: "les véhicules qui volent", mots: ["avion", "hélicoptère", "montgolfière", "fusée"] },
      { nom: "Ce qui flotte", picto: "flotter", appel: "les véhicules qui vont sur l'eau", mots: ["bateau", "voilier", "sous-marin", "barque", "canot", "pédalo"] },
    ],
  },
  {
    id: "familles-maisons", libelle: "Les maisons des familles de mots", niveaux: ["MS", "GS"],
    source: "fiche « Catégoriser » : les maisons des familles de mots, avec des intrus (savon – savonner – baignoire)",
    categories: [
      { nom: "La famille de chaussure", picto: "chaussure", mots: ["chaussure", "chaussette", "chausson"] },
      { nom: "La famille de boulanger", picto: "boulanger", mots: ["boulanger", "boulangère", "boulangerie"] },
      { nom: "La famille de peindre", picto: "peindre", mots: ["peindre", "peintre", "peinture"] },
      { nom: "La famille de danser", picto: "danser", mots: ["danser", "danseur", "danse"] },
      { nom: "La famille de savon", picto: "savon", mots: ["savon", "savonner"] },
      { nom: "Les intrus", picto: "", intrus: true, mots: ["baignoire", "chapeau"] },
    ],
  },
  {
    id: "familles-actions", libelle: "Familles de mots : l'action et qui la fait", niveaux: ["GS"],
    source: "fiche « Catégoriser » : « Associe l'action à son personnage, à son objet » ; le mistigri (arrosoir – arroser)",
    categories: [
      { nom: "arroser", picto: "arroser", mots: ["arroser", "arrosoir"] },
      { nom: "gommer", picto: "gommer", mots: ["gommer", "gomme"] },
      { nom: "jardiner", picto: "jardin", mots: ["jardin", "jardinier"] },
      { nom: "jongler", picto: "jongler", mots: ["jongler", "jongleur"] },
      { nom: "coiffer", picto: "coiffer", mots: ["coiffer", "coiffeur"] },
      { nom: "chanter", picto: "chanter", mots: ["chanter", "chanteur"] },
      { nom: "balayer", picto: "balayer", mots: ["balayer", "balai"] },
      { nom: "skier", picto: "skier", mots: ["skier", "skieur"] },
    ],
  },
  // Des catégories perceptives, dès 3 ans : « Mets ici tous les objets bleus, ici tous les objets rouges ».
  {
    id: "couleurs", libelle: "Les couleurs : rouge, jaune, vert", niveaux: ["PS"],
    source: "fiche « Catégoriser » : des catégories perceptives, la taille, la couleur (à partir de 3 ans)",
    categories: [
      { nom: "Ce qui est rouge", picto: "rouge", appel: "tout ce qui est rouge", mots: ["fraise", "tomate", "cerise", "coccinelle", "camion de pompiers", "pomme"] },
      { nom: "Ce qui est jaune", picto: "jaune", appel: "tout ce qui est jaune", mots: ["banane", "citron", "soleil", "poussin", "canari", "tournesol"] },
      { nom: "Ce qui est vert", picto: "vert", appel: "tout ce qui est vert", mots: ["laitue", "grenouille", "feuille", "petits pois", "concombre", "brocoli"] },
    ],
  },
  {
    id: "chaud-froid", libelle: "Chaud ou froid", niveaux: ["PS", "MS"],
    source: "fiche « Catégoriser » : des catégories perceptives, ce qu'on sent",
    categories: [
      { nom: "Ce qui est chaud", picto: "chaud", appel: "tout ce qui est chaud", mots: ["soleil", "feu de camp", "four", "radiateur", "soupe", "bougie"] },
      { nom: "Ce qui est froid", picto: "froid", appel: "tout ce qui est froid", mots: ["neige", "glaçon", "réfrigérateur", "bonhomme de neige", "glace", "iceberg"] },
    ],
  },
  {
    id: "se-mange", libelle: "Ce qui se mange, ce qui ne se mange pas", niveaux: ["PS", "MS"],
    source: "fiche « Catégoriser » : « Je mets le chat avec l'arbre car ils ne se mangent pas »",
    categories: [
      { nom: "Ce qui se mange", picto: "manger", appel: "tout ce qui se mange", mots: ["pomme", "pain", "fromage", "gâteau", "yaourt", "carotte"] },
      { nom: "Ce qui ne se mange pas", picto: "", appel: "tout ce qui ne se mange pas", mots: ["chat", "arbre", "ballon", "chaussure", "crayon", "voiture"] },
    ],
  },
  {
    id: "ranger-la-classe", libelle: "Ranger la classe : les jouets et le matériel", niveaux: ["PS"],
    source: "fiche « Catégoriser » : ranger un espace de la classe, en disant pourquoi chaque objet va là",
    categories: [
      { nom: "Les jouets", picto: "jouets", appel: "les jouets", mots: ["poupée", "ballon", "cubes", "puzzle", "toupie", "peluche"] },
      { nom: "Le matériel de l'école", picto: "matériel scolaire", appel: "ce qui sert pour travailler en classe", mots: ["crayon", "ciseaux", "colle", "cahier", "livre", "gomme"] },
    ],
  },
  {
    id: "mer-montagne", libelle: "À la mer ou à la montagne", niveaux: ["PS", "MS"],
    source: "fiche « Catégoriser » : des catégories thématiques (tracteur et vache = ferme)",
    categories: [
      { nom: "À la mer", picto: "mer", appel: "ce qu'on voit à la mer", mots: ["coquillage", "crabe", "étoile de mer", "mouette", "voilier", "château de sable"] },
      { nom: "À la montagne", picto: "montagne", appel: "ce qu'on voit à la montagne", mots: ["ski", "luge", "sapin", "chalet", "marmotte", "télésiège"] },
    ],
  },
  {
    id: "domestiques-sauvages", libelle: "Les animaux de la maison et les animaux sauvages", niveaux: ["PS", "MS"],
    source: "fiche « Catégoriser » : des catégories taxonomiques, puis leurs sous-catégories",
    categories: [
      { nom: "Les animaux de la maison", picto: "animal domestique", appel: "les animaux qui vivent avec nous", mots: ["chat", "chien", "lapin", "hamster", "perruche"] },
      { nom: "Les animaux sauvages", picto: "savane", appel: "les animaux sauvages", mots: ["lion", "éléphant", "girafe", "zèbre", "tigre", "singe"] },
    ],
  },
  {
    id: "saisons", libelle: "Les saisons", niveaux: ["MS", "GS"],
    source: "fiche « Catégoriser » : des catégories thématiques — ici, le temps qui passe",
    categories: [
      { nom: "L'hiver", picto: "hiver", appel: "ce qu'on voit en hiver", mots: ["neige", "bonhomme de neige", "moufles", "écharpe", "luge", "flocon de neige"] },
      { nom: "Le printemps", picto: "printemps", appel: "ce qu'on voit au printemps", mots: ["fleur", "papillon", "coccinelle", "nid", "tulipe", "poussin"] },
      { nom: "L'été", picto: "été", appel: "ce qu'on voit en été", mots: ["soleil", "plage", "maillot de bain", "parasol", "lunettes de soleil", "glace"] },
      { nom: "L'automne", picto: "automne", appel: "ce qu'on voit en automne", mots: ["feuilles mortes", "champignon", "châtaigne", "citrouille", "parapluie", "gland"] },
    ],
  },
  {
    id: "maison", libelle: "Les pièces de la maison", niveaux: ["MS", "GS"],
    source: "fiche « Catégoriser » : des catégories thématiques — chaque objet dans la pièce où il se trouve",
    categories: [
      { nom: "La cuisine", picto: "cuisine", appel: "ce qu'on trouve dans la cuisine", mots: ["réfrigérateur", "four", "évier", "casserole", "cuisinière", "micro-ondes"] },
      { nom: "La salle de bain", picto: 33954, appel: "ce qu'on trouve dans la salle de bain", mots: ["baignoire", "douche", "lavabo", "brosse à dents", "savon", "dentifrice"] },
      { nom: "La chambre", picto: "chambre à coucher", appel: "ce qu'on trouve dans la chambre", mots: ["lit", "oreiller", "armoire", "couverture", "réveil", "lampe"] },
      { nom: "Le salon", picto: "salon", appel: "ce qu'on trouve dans le salon", mots: ["canapé", "télévision", "fauteuil", "tapis", "table basse"] },
    ],
  },
  {
    id: "fonctions", libelle: "À quoi ça sert : couper, écrire, nettoyer", niveaux: ["MS", "GS"],
    source: "fiche « Catégoriser » : classer des objets selon leur fonction, « les objets qui coupent (ciseaux, couteau, scie) »",
    categories: [
      { nom: "Ce qui coupe", picto: "couper", appel: "tout ce qui coupe", mots: ["ciseaux", "couteau", "scie", "hache", "sécateur"] },
      { nom: "Ce qui sert à écrire", picto: "écrire", appel: "tout ce qui sert à écrire", mots: ["crayon", "stylo", "feutre", "craie"] },
      { nom: "Ce qui sert à nettoyer", picto: "nettoyer", appel: "tout ce qui sert à nettoyer", mots: ["balai", "éponge", "aspirateur", "chiffon"] },
    ],
  },
  {
    id: "vetements-corps", libelle: "Les vêtements : le haut, le bas, les pieds, les accessoires", niveaux: ["GS"],
    source: "livret « À partir de 5 ans » (2025) : chercher les hyperonymes — vêtements pour le haut du corps, pour le bas du corps, accessoires",
    categories: [
      { nom: "Pour le haut du corps", picto: "torse", appel: "ce qu'on met sur le haut du corps", mots: ["pull", "tee-shirt", "chemise", "gilet", "anorak"] },
      { nom: "Pour le bas du corps", picto: "jambe", appel: "ce qu'on met sur le bas du corps", mots: ["pantalon", "jupe", "short", "collant", "culotte"] },
      { nom: "Pour les pieds", picto: "pieds", appel: "ce qu'on met aux pieds", mots: ["chaussure", "bottes", "sandales", "baskets", "chausson", "tongs"] },
      { nom: "Les accessoires", picto: "accessoires", appel: "les accessoires", mots: ["bonnet", "écharpe", "gants", "ceinture", "casquette", "lunettes"] },
    ],
  },
  {
    id: "instruments", libelle: "Les instruments : on frappe, on souffle, on gratte les cordes", niveaux: ["GS"],
    source: "fiche « Catégoriser » : des sous-catégories ; programme 2025, les univers sonores",
    categories: [
      { nom: "Ceux qu'on frappe", picto: "percussion", appel: "les instruments qu'on frappe", mots: ["tambour", "xylophone", "triangle", "cymbales", "tambourin"] },
      { nom: "Ceux dans lesquels on souffle", picto: "instruments à vent", appel: "les instruments dans lesquels on souffle", mots: ["flûte", "trompette", "harmonica", "saxophone", "clarinette"] },
      { nom: "Ceux qui ont des cordes", picto: "instruments à cordes", appel: "les instruments à cordes", mots: ["guitare", "violon", "harpe", "contrebasse", "ukulélé"] },
    ],
  },
  {
    id: "metiers", libelle: "Les métiers et leurs outils", niveaux: ["GS"],
    source: "fiche « Catégoriser » : des catégories thématiques — l'objet et celui qui s'en sert",
    categories: [
      { nom: "Le jardinier", picto: "jardinier", appel: "les outils du jardinier", mots: ["râteau", "arrosoir", "brouette", "pelle", "sécateur"] },
      { nom: "Le médecin", picto: "médecin", appel: "les outils du médecin", mots: ["stéthoscope", "thermomètre", "seringue", "pansement", "médicament"] },
      { nom: "Le pompier", picto: "pompier", appel: "les outils du pompier", mots: ["camion de pompiers", "échelle", "extincteur"] },
      { nom: "Le coiffeur", picto: "coiffeur", appel: "les outils du coiffeur", mots: ["peigne", "brosse à cheveux", "sèche-cheveux", "ciseaux", "shampoing"] },
    ],
  },
];

/** Les exemples qui conviennent à cet âge d'abord, les autres ensuite. */
export const jeuxPour = (n: Niveau) =>
  [...JEUX_DE_CATEGORIES.filter((j) => j.niveaux.includes(n)), ...JEUX_DE_CATEGORIES.filter((j) => !j.niveaux.includes(n))];

/** Tous les mots à chercher dans la banque pour un exemple : ceux des images, et ceux des catégories (sauf un picto donné par son numéro). */
export const motsDuJeu = (j: JeuDeCategories) =>
  [...new Set(j.categories.flatMap((c) => [...c.mots, typeof c.picto === "string" ? c.picto : ""].filter((m) => m.trim())))];

/** Un exemple devenu des catégories, une fois ses mots trouvés dans la banque (un mot sans picto garde son mot seul). */
export function categoriesDuJeu(j: JeuDeCategories, parMot: Record<string, number>): Categorie[] {
  const id = (mot: string) => parMot[mot.toLowerCase()] ?? null;
  return j.categories.map((c) => ({
    nom: c.nom, image: typeof c.picto === "number" ? c.picto : c.picto ? id(c.picto) : null, appel: c.appel ?? "", intrus: c.intrus === true,
    mots: c.mots.map((mot) => ({ id: id(mot), mot })),
  }));
}

// ── Ce qu'on peut fabriquer avec ces catégories ───────────────────────────

const memeMot = (a: MotImage, b: MotImage) => a.mot.trim().toLowerCase() === b.mot.trim().toLowerCase();

/** Les familles du jeu des familles : au moins trois cartes chacune, six au plus. */
export const famillesDuJeu = (cs: Categorie[]) =>
  categoriesRangees(cs).filter((c) => c.mots.length >= 3).map((c) => ({ ...c, mots: c.mots.slice(0, 6) }));

/** Les paires du mistigri : deux images d'une même catégorie. */
export function pairesDuMistigri(cs: Categorie[]): { a: MotImage; b: MotImage; categorie: Categorie }[] {
  return categoriesRangees(cs).flatMap((c) => {
    const paires: { a: MotImage; b: MotImage; categorie: Categorie }[] = [];
    for (let i = 0; i + 1 < c.mots.length; i += 2) paires.push({ a: c.mots[i], b: c.mots[i + 1], categorie: c });
    return paires;
  });
}

export interface LigneIntrus { mots: MotImage[]; intrus: MotImage; categorie: Categorie }

/**
 * Les lignes de l'intrus : des images d'une même catégorie et une d'une
 * autre, glissée à une place au hasard. Les catégories passent à tour de
 * rôle, et leurs images tournent d'une ligne à l'autre.
 */
export function lignesIntrus(cs: Categorie[], combien: number, parLigne: number, alea: () => number): LigneIntrus[] {
  const memes = Math.max(2, parLigne - 1);
  const sources = cs.filter((c) => !c.intrus && c.mots.length >= memes);
  const lignes: LigneIntrus[] = [];
  const restes = new Map(sources.map((c) => [c, melanger(alea, c.mots)]));
  for (let i = 0; i < combien && sources.length; i++) {
    const c = sources[i % sources.length];
    const ailleurs = cs.filter((x) => x !== c).flatMap((x) => x.mots).filter((m) => !c.mots.some((x) => memeMot(x, m)));
    if (!ailleurs.length) break;
    let reste = restes.get(c) ?? [];
    if (reste.length < memes) reste = melanger(alea, c.mots);
    const pris = reste.slice(0, memes);
    restes.set(c, reste.slice(memes));
    const intrus = ailleurs[Math.floor(alea() * ailleurs.length)];
    const mots = [...pris];
    mots.splice(Math.floor(alea() * (mots.length + 1)), 0, intrus);
    lignes.push({ mots, intrus, categorie: c });
  }
  return lignes;
}

/** Ce qui manque pour fabriquer ce jeu, ou rien s'il se fabrique. */
export function cequiManque(r: ReglagesCategoriser): string | null {
  const rangees = categoriesRangees(r.categories);
  const images = r.categories.reduce((n, c) => n + c.mots.length, 0);
  if (!images) return "Ajoutez des catégories et leurs images : prenez-en de toutes prêtes, ou composez les vôtres.";
  switch (r.forme) {
    case "tri": case "loto": case "appelle":
      return rangees.length >= 2 ? null : "Il faut au moins deux catégories qui ont des images.";
    case "intrus":
      return r.categories.some((c) => !c.intrus && c.mots.length >= Math.max(2, r.parLigne - 1)) && r.categories.filter((c) => c.mots.length).length >= 2
        ? null : `Il faut deux catégories, dont une d'au moins ${Math.max(2, r.parLigne - 1)} images.`;
    case "familles":
      return famillesDuJeu(r.categories).length >= 2 ? null : "Le jeu des familles demande au moins deux catégories de trois images ou plus.";
    case "mistigri":
      return pairesDuMistigri(r.categories).length >= 3 ? null : "Le mistigri demande au moins trois paires : deux images par catégorie, sur trois catégories.";
    default:
      return null;
  }
}

// ── Les feuilles ──────────────────────────────────────────────────────────

/** Des images, par identifiant de pictogramme. */
export type Images = Record<number, string>;

const imageDe = (m: MotImage, images: Images) => (m.id != null ? images[m.id] : undefined);

/** Les couleurs des catégories : bien distinctes, et lisibles en noir et blanc par leur nom. */
const COULEURS = ["#e8590c", "#1971c2", "#2f9e44", "#9c36b5", "#e67700", "#c2255c", "#0c8599", "#5c940d"];
export const couleurDe = (i: number) => COULEURS[i % COULEURS.length];

/** Les cartes à découper, carrées comme les pictos : grandes pour les petits, un peu moins ensuite. */
const formatCartes = (n: Niveau): FormatGrille => (n === "PS" ? { colonnes: 3, lignes: 4, hauteurMm: 54, carre: true } : { colonnes: 4, lignes: 5, hauteurMm: 41, carre: true });
/** Les cartes d'un jeu qu'on tient en main : un peu plus petites, toutes de la même taille. */
const formatJeuDeCartes = (n: Niveau): FormatGrille => (n === "PS" ? { colonnes: 3, lignes: 4, hauteurMm: 50, carre: true } : { colonnes: 4, lignes: 5, hauteurMm: 40, carre: true });

const titre = (t: string, sous = "") => `<div class="titre">${escapeHtml(t)}</div>${sous ? `<div class="sous">${escapeHtml(sous)}</div>` : ""}`;
const consigne = (t: string, quoi = "Consigne") => `<div class="regle"><b>${quoi}</b>${escapeHtml(t)}</div>`;
const prenom = `<div class="ct-prenom">Prénom : ………………………… Date : ……………</div>`;
const carteImage = (m: MotImage, images: Images, legendes: boolean, classe = "") =>
  carte(`${imgPicto(imageDe(m, images), m.mot)}${legende(m.mot, legendes)}`, `ct-carte ${classe}`.trim());

/** L'en-tête d'une catégorie : son image et son nom — ou une ligne où écrire le nom que l'élève lui donne. */
function enteteCategorie(c: Categorie, images: Images, nommer: boolean): string {
  if (!nommer) return `<span class="ct-a-nommer">Son nom : ………………………</span>`;
  const src = c.image != null ? images[c.image] : undefined;
  return `${src ? `<img src="${src}" alt="">` : ""}<span>${escapeHtml(c.nom.trim() || "…")}</span>`;
}

/** Toutes les images, mêlées : celles des catégories et les intrus. */
const toutesMelees = (cs: Categorie[], alea: () => number) => melanger(alea, cs.flatMap((c) => c.mots));

/** La page des images à découper. */
const pageDesCartes = (mots: MotImage[], r: ReglagesCategoriser, images: Images, t = "Les images à découper") =>
  pagesDeCartes(mots.map((m) => carteImage(m, images, r.legendes)), formatCartes(r.niveau), titre(t));

/** Ce qui va où, pour le maître : une ligne par catégorie, et les intrus. */
function corrige(t: string, cs: Categorie[]): string {
  const rangees = categoriesRangees(cs);
  const intrus = cs.filter((c) => c.intrus).flatMap((c) => c.mots);
  return `<div class="page corrige">${titre(`${t} — pour le maître`)}<ul class="ct-corrige">${rangees.map((c) =>
    `<li><b>${escapeHtml(c.nom || "…")}</b> : ${escapeHtml(c.mots.map((m) => m.mot).join(", "))}</li>`).join("")}${intrus.length
    ? `<li><b>Les intrus</b>, qui ne vont dans aucune boîte : ${escapeHtml(intrus.map((m) => m.mot).join(", "))}</li>` : ""}</ul></div>`;
}

function htmlCartes(r: ReglagesCategoriser, images: Images): string {
  const mots = r.categories.flatMap((c) => c.mots);
  return pagesDeCartes(mots.map((m) => carteImage(m, images, r.legendes)), formatCartes(r.niveau),
    titre("Les cartes-images", "Pour nommer chaque image, la décrire, dire à quoi elle sert et où on l'a rencontrée — puis pour trier et jouer."));
}

/** La consigne du tri, à l'âge des élèves. */
function consigneDuTri(r: ReglagesCategoriser): string {
  const intrus = r.categories.some((c) => c.intrus && c.mots.length) ? " Attention : des images ne vont dans aucune boîte." : "";
  const ou = r.maisons ? "maison" : "boîte";
  if (!r.nommer) return `Découpe les images. Range ensemble celles qui vont ensemble, puis donne un nom à chaque ${ou}.${intrus}`;
  return r.niveau === "PS"
    ? `Découpe les images. Mets chaque image dans la bonne ${ou}.${intrus}`
    : `Découpe les images. Range chaque image dans la bonne ${ou} et dis pourquoi.${intrus}`;
}

/** Les images du tri, carrées : la place de chacune se compte dans les boîtes, où l'élève les colle. */
const formatDuTri = (n: Niveau): FormatGrille => (n === "PS" ? { colonnes: 3, lignes: 5, hauteurMm: 50, carre: true } : { colonnes: 4, lignes: 5, hauteurMm: 41, carre: true });
/**
 * La hauteur d'une page de boîtes, en mm. Les boîtes s'y partagent ce que
 * laissent le titre, la consigne et le prénom, quelle que soit leur hauteur.
 * La première page compte large : l'en-tête des compétences et le blanc du
 * haut de la feuille la raccourcissent ; une maison qui déborde d'un
 * millimètre finirait seule sur la page suivante.
 */
const HAUTEUR_PREMIERE_PLANCHE = 248;
const HAUTEUR_PLANCHE = HAUTEUR_UTILE_MM - 7;
/** Ce que la première page garde pour ses boîtes : le titre, la consigne — et ses pictos — et le prénom prennent le reste. */
const PLACE_PREMIERE_PAGE = HAUTEUR_PREMIERE_PLANCHE - 50;
/** Le toit d'une maison, en mm : il compte dans sa hauteur. */
const TOIT = 22;
const ECART_BOITES = 4;

/**
 * Les boîtes du tri, page par page. Chacune doit recevoir toutes ses images
 * collées, à leur taille, rangée par rangée sous son en-tête : une page en
 * porte autant que la place le permet — souvent une seule —, et les boîtes
 * d'une page s'en partagent toute la hauteur.
 */
export function pagesDuTri(r: Pick<ReglagesCategoriser, "niveau" | "maisons" | "categories">): Categorie[][] {
  const cote = hauteurDesCartes(formatDuTri(r.niveau), false);
  // Ce qu'une rangée de la boîte reçoit d'images : la largeur, moins le bord et le retrait.
  const parRangee = Math.max(1, Math.floor((LARGEUR_CONTENU_MM - 10) / cote));
  const toit = r.maisons ? TOIT : 0;
  const besoin = (c: Categorie) => Math.ceil(Math.max(1, c.mots.length) / parRangee) * cote + 34 + toit;
  const pages: Categorie[][] = [];
  let page: Categorie[] = [];
  let pris = 0;
  for (const c of categoriesRangees(r.categories)) {
    const place = pages.length === 0 ? PLACE_PREMIERE_PAGE : HAUTEUR_PLANCHE;
    if (page.length && pris + ECART_BOITES + besoin(c) > place) {
      pages.push(page);
      page = [];
      pris = 0;
    }
    pris += (page.length ? ECART_BOITES : 0) + besoin(c);
    page.push(c);
  }
  if (page.length) pages.push(page);
  return pages;
}

function htmlTri(r: ReglagesCategoriser, images: Images, alea: () => number): string {
  const t = r.maisons ? "Les maisons des mots" : "Les boîtes de tri";
  const boite = (c: Categorie) =>
    `<div class="ct-boite${r.maisons ? " ct-maison" : ""}" style="--c:${couleurDe(r.categories.indexOf(c))}">`
    + `${r.maisons ? `<div class="ct-toit"></div>` : ""}<div class="ct-entete">${enteteCategorie(c, images, r.nommer)}</div><div class="ct-fond"></div></div>`;
  const planches = pagesDuTri(r).map((p, i) => `<div class="page ct-planche" style="height:${i === 0 ? HAUTEUR_PREMIERE_PLANCHE : HAUTEUR_PLANCHE}mm">`
    + `${i === 0 ? `${titre(t)}${consigne(consigneDuTri(r))}${prenom}` : ""}<div class="ct-boites">${p.map(boite).join("")}</div></div>`).join("");
  const cartes = toutesMelees(r.categories, alea).map((m) => carteImage(m, images, r.legendes));
  return planches + pagesDeCartes(cartes, formatDuTri(r.niveau), titre("Les images à découper")) + corrige(t, r.categories);
}

function consigneIntrus(n: Niveau): string {
  return n === "PS" ? "Dans chaque ligne, une image ne va pas avec les autres : entoure-la."
    : n === "MS" ? "Dans chaque ligne, une image ne va pas avec les autres : entoure-la, puis dis pourquoi."
    : "Dans chaque ligne, trouve l'intrus : entoure-le et explique pourquoi il ne va pas avec les autres.";
}

function htmlIntrus(r: ReglagesCategoriser, images: Images, alea: () => number): string {
  const lignes = lignesIntrus(r.categories, r.lignes, r.parLigne, alea);
  const hauteur = Math.min(62, Math.floor((HAUTEUR_UTILE_MM - 85) / Math.max(1, lignes.length)) - 3);
  const rangs = lignes.map((l, i) => `<div class="ct-ligne" style="grid-template-columns:7mm repeat(${l.mots.length},1fr);height:${hauteur}mm">`
    + `<div class="ct-numero">${i + 1}</div>${l.mots.map((m) => `<div class="ct-case">${imgPicto(imageDe(m, images), m.mot)}${legende(m.mot, r.legendes)}</div>`).join("")}</div>`).join("");
  const solution = lignes.length
    ? `<div class="page corrige">${titre("Trouve l'intrus — pour le maître")}<ol class="ct-corrige">${lignes.map((l) =>
      `<li><b>${escapeHtml(l.intrus.mot)}</b> — les autres : ${escapeHtml(l.categorie.nom || l.mots.filter((m) => m !== l.intrus).map((m) => m.mot).join(", "))}</li>`).join("")}</ol></div>`
    : "";
  return `<div class="page">${titre("Trouve l'intrus")}${consigne(consigneIntrus(r.niveau))}${prenom}<div class="ct-lignes">${rangs}</div></div>${solution}`;
}

/** Une plaque de loto : six cases au plus, chacune à la mesure d'une carte à piocher — un carré de 36 mm. */
const CASES_DU_LOTO = 6;
const CARTES_DU_LOTO: FormatGrille = { colonnes: 4, lignes: 6, hauteurMm: 36, carre: true };

function regleDuLoto(r: ReglagesCategoriser): string {
  if (!r.nommer) return "Chaque joueur reçoit une plaque : elle ne dit pas sa catégorie. Le meneur pioche une carte et la montre ; on la nomme. Celui à qui elle va la réclame et dit pourquoi. Au fil des cartes, chacun trouve sa catégorie — et la nomme quand sa plaque est pleine.";
  return r.niveau === "PS"
    ? "Chaque joueur reçoit une plaque : elle montre une catégorie. Le meneur pioche une carte et la montre : « Qu'est-ce que c'est ? » Celui dont la plaque est de la même catégorie la prend et la pose sur une case. La première plaque pleine a gagné."
    : "Chaque joueur reçoit une plaque : elle montre une catégorie. Le meneur pioche une carte ; on la nomme. Celui dont la plaque est de la même catégorie la réclame et dit pourquoi — « C'est un fruit, c'est pour moi ! » — puis la pose sur une case. La première plaque pleine a gagné.";
}

function htmlLoto(r: ReglagesCategoriser, images: Images, alea: () => number): string {
  const rangees = categoriesRangees(r.categories);
  const plaques = rangees.map((c) => {
    const i = r.categories.indexOf(c);
    const cases = Math.min(CASES_DU_LOTO, c.mots.length);
    return `<div class="ct-plaque" style="--c:${couleurDe(i)}"><div class="ct-entete">${enteteCategorie(c, images, r.nommer)}</div>`
      + `<div class="ct-cases">${Array.from({ length: cases }, () => `<div class="ct-case-vide"></div>`).join("")}</div></div>`;
  });
  // Deux plaques par page : une par joueur, à découper.
  const pages: string[] = [];
  for (let i = 0; i < plaques.length; i += 2) {
    pages.push(`<div class="page">${i === 0 ? `${titre("Le loto des catégories", "Le loto aveugle de la fiche Éduscol « Catégoriser » : la plaque montre la catégorie, pas les images.")}${consigne(regleDuLoto(r), "Règle du jeu")}` : ""}${plaques.slice(i, i + 2).join("")}</div>`);
  }
  const cartes = toutesMelees(r.categories, alea).map((m) => carteImage(m, images, r.legendes));
  return pages.join("") + pagesDeCartes(cartes, CARTES_DU_LOTO, titre("Les cartes à piocher")) + corrige("Le loto des catégories", r.categories);
}

function regleAppelle(n: Niveau): string {
  return n === "PS"
    ? "Les images sont étalées, mélangées. Le meneur tire une carte d'appel et la dit : « J'appelle ce qui sert à s'habiller ! » Chacun cherche les images qui vont et les apporte ; on vérifie ensemble en les nommant."
    : n === "MS"
      ? "Les images de toutes les catégories sont mêlées. Le meneur tire une carte d'appel : « J'appelle tout ce qui se mange ! » Chacun cherche les images qui vont, explique son choix et nomme la catégorie : « les aliments »."
      : "Beaucoup d'images, de quatre ou cinq catégories, sont mêlées. Le meneur tire une carte d'appel ; chacun apporte les images qui vont, justifie chacune et nomme la catégorie. À la fin, on cherche une autre façon de les ranger.";
}

function htmlAppelle(r: ReglagesCategoriser, images: Images, alea: () => number): string {
  const rangees = categoriesRangees(r.categories);
  const appels = rangees.map((c) => {
    const i = r.categories.indexOf(c);
    const src = c.image != null ? images[c.image] : undefined;
    return `<div class="ct-appel" style="--c:${couleurDe(i)}"><div class="ct-appel-dit">J'appelle…</div>`
      + `${r.nommer && src ? `<img src="${src}" alt="">` : ""}<div class="ct-appel-quoi">${escapeHtml((c.appel || c.nom).trim() || "…")}</div></div>`;
  }).join("");
  const colonnes = rangees.length > 4 ? 3 : 2;
  const grille = gabaritGrille({ colonnes, lignes: Math.ceil(rangees.length / colonnes), hauteurMm: 60, carre: true }, true);
  const page = `<div class="page">${titre("J'appelle…", "Les cartes d'appel, une par catégorie ; les images à la suite.")}${consigne(regleAppelle(r.niveau), "Règle du jeu")}<div class="ct-appels" style="${grille}">${appels}</div></div>`;
  return page + pageDesCartes(toutesMelees(r.categories, alea), r, images) + corrige("J'appelle…", r.categories);
}

/** Les cartes du jeu des familles : des carrés, trois par rangée, qu'on tient en main. */
const CARTES_DES_FAMILLES: FormatGrille = { colonnes: 3, lignes: 4, hauteurMm: 54, carre: true };

const REGLE_FAMILLES = "On distribue quatre cartes à chacun ; les autres font la pioche. À son tour, on demande à un joueur une carte qui manque à l'une de ses familles : « Dans la famille des fruits, je voudrais la pomme. » S'il l'a, il la donne et on redemande ; sinon : « Pioche ! ». Une famille complète se pose devant soi, en nommant chaque carte. Celui qui a le plus de familles a gagné. Avec les plus jeunes : cartes visibles, et trois familles.";

function htmlFamilles(r: ReglagesCategoriser, images: Images): string {
  const familles = famillesDuJeu(r.categories);
  const cartes = familles.flatMap((f) => {
    const i = r.categories.findIndex((c) => c.nom === f.nom && c.mots[0] === f.mots[0]);
    const src = f.image != null ? images[f.image] : undefined;
    return f.mots.map((m) => `<div class="ct-famille" style="--c:${couleurDe(i < 0 ? 0 : i)}">`
      + `<div class="ct-famille-nom">${src ? `<img src="${src}" alt="">` : ""}<span>${escapeHtml(f.nom || "…")}</span></div>`
      + `<div class="ct-famille-image">${imgPicto(imageDe(m, images), m.mot)}</div>${legende(m.mot, true)}`
      + `<div class="ct-famille-membres">${f.mots.map((x) => `<span class="${x === m ? "ici" : ""}">${imgPicto(imageDe(x, images), x.mot)}</span>`).join("")}</div></div>`);
  });
  return pagesAvecRegle(cartes, CARTES_DES_FAMILLES, `${titre("Le jeu des familles")}${consigne(REGLE_FAMILLES, "Règle du jeu")}`);
}

/** Le chat noir du mistigri, dessiné : il n'a pas à être un picto. */
const CHAT = `<svg class="ct-chat" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M28 30 L33 10 L45 24 Q50 23 55 24 L67 10 L72 30 Q80 42 72 54 Q86 62 84 82 Q82 94 70 94 L34 94 Q20 94 20 80 Q20 64 30 55 Q20 42 28 30 Z" fill="#1c2233"/><path d="M84 82 Q98 76 92 58" fill="none" stroke="#1c2233" stroke-width="6" stroke-linecap="round"/><ellipse cx="42" cy="38" rx="4" ry="6" fill="#ffd43b"/><ellipse cx="58" cy="38" rx="4" ry="6" fill="#ffd43b"/></svg>`;

const REGLE_MISTIGRI = "On distribue toutes les cartes. Chacun pose devant lui les paires qu'il a — deux cartes qui vont ensemble — en disant pourquoi : « La pomme et la banane, ce sont des fruits. » Puis, à tour de rôle, on pioche une carte dans le jeu de son voisin ; si elle fait une paire, on la pose en disant pourquoi. Celui qui garde le mistigri à la fin a perdu.";

function htmlMistigri(r: ReglagesCategoriser, images: Images, alea: () => number): string {
  const paires = pairesDuMistigri(r.categories);
  const cellules = melanger(alea, paires.flatMap((p) => [p.a, p.b])).map((m) => carteImage(m, images, r.legendes));
  // Le mistigri se glisse n'importe où dans le paquet.
  cellules.splice(Math.floor(alea() * (cellules.length + 1)), 0, carte(`${CHAT}<div class="mot">Mistigri</div>`, "ct-carte ct-mistigri"));
  const entete = `${titre("Le mistigri")}${consigne(REGLE_MISTIGRI, "Règle du jeu")}`;
  const solution = `<div class="page corrige">${titre("Le mistigri — pour le maître")}<ul class="ct-corrige">${paires.map((p) =>
    `<li><b>${escapeHtml(p.a.mot)}</b> et <b>${escapeHtml(p.b.mot)}</b> — ${escapeHtml(p.categorie.nom || "…")}</li>`).join("")}</ul></div>`;
  return pagesAvecRegle(cellules, formatJeuDeCartes(r.niveau), entete) + solution;
}

function htmlAffiche(r: ReglagesCategoriser, images: Images): string {
  return categoriesRangees(r.categories).map((c) => {
    const i = r.categories.indexOf(c);
    const src = c.image != null ? images[c.image] : undefined;
    return `<div class="page ct-affiche" style="--c:${couleurDe(i)}"><div class="ct-affiche-tete">${src ? `<img src="${src}" alt="">` : ""}<span>${escapeHtml(c.nom || "…")}</span></div>`
      + `<div class="ct-affiche-images">${c.mots.map((m) => `<div class="ct-affiche-mot">${imgPicto(imageDe(m, images), m.mot)}<div class="mot">${escapeHtml(m.mot)}</div></div>`).join("")}</div></div>`;
  }).join("");
}

/** Ce qu'on observe, d'après la fiche « Catégoriser » et les exemples de réussite du programme. */
export const OBSERVABLES: Record<Niveau, string[]> = {
  PS: ["Nomme les images", "Retire l'intrus", "Attribue une image à sa catégorie", "Range par catégorie quand on lui dit comment"],
  MS: ["Nomme les images", "Trouve l'intrus et dit pourquoi", "Classe et nomme la catégorie", "Fait deux classements différents"],
  GS: ["Nomme les images", "Trouve les intrus et justifie", "Classe selon un critère imposé et nomme les catégories", "Fait des sous-catégories", "Propose plusieurs façons de classer"],
};

function htmlEvaluation(r: ReglagesCategoriser): string {
  const age = NIVEAUX.find((n) => n.id === r.niveau)?.age ?? "";
  const colonnes = OBSERVABLES[r.niveau];
  const corpus = categoriesRangees(r.categories).map((c) => `<li><b>${escapeHtml(c.nom || "…")}</b> : ${escapeHtml(c.mots.map((m) => m.mot).join(", "))}</li>`).join("");
  const ligne = `<tr><td></td>${colonnes.map(() => "<td></td>").join("")}<td></td></tr>`;
  return `<div class="page">${titre("Grille d'observation — catégoriser", `Programme de l'école maternelle 2025 · Organiser les mots en catégorie et en réseau · ${r.niveau}, ${age}.`)}`
    + `<div class="sous">Le corpus :</div><ul class="ct-corpus">${corpus}</ul>`
    + `<table class="ct-grille"><thead><tr><th>Prénom</th>${colonnes.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}<th>Mots à retravailler</th></tr></thead>`
    + `<tbody>${Array.from({ length: 12 }, () => ligne).join("")}</tbody></table>`
    + `<div class="sous ct-pied">✓ réussi · ~ en cours · ✗ pas encore. En petit groupe ou seul avec l'élève, avec les cartes-images, à distance de la séquence. Le programme demande de vérifier chaque mois et chaque période que les corpus enseignés sont mémorisés : refaites l'observation un mois plus tard.</div></div>`;
}

/** La feuille du jeu choisi, avec ses images ; `alea` mêle les cartes. */
export function htmlCategoriser(r: ReglagesCategoriser, images: Images, alea: () => number): string {
  const corps = {
    cartes: () => htmlCartes(r, images),
    tri: () => htmlTri(r, images, alea),
    intrus: () => htmlIntrus(r, images, alea),
    loto: () => htmlLoto(r, images, alea),
    appelle: () => htmlAppelle(r, images, alea),
    familles: () => htmlFamilles(r, images),
    mistigri: () => htmlMistigri(r, images, alea),
    affiche: () => htmlAffiche(r, images),
    evaluation: () => htmlEvaluation(r),
  }[r.forme]();
  const ids = r.forme === "evaluation" ? [] : idsDesImages(r.categories);
  return feuille(`${corps}${attributionPour(ids)}`, "ct");
}

export const STYLE_CATEGORISER = `
  .feuille.ct .ct-prenom { font-size: 12px; color: #687087; margin: 0 0 4mm; }
  .feuille.ct .ct-entete { display: flex; align-items: center; gap: 3mm; font-size: 20px; font-weight: 800; color: var(--c, #1c2233); }
  .feuille.ct .ct-entete img { width: 16mm; height: 16mm; object-fit: contain; margin: 0; }
  .feuille.ct .ct-a-nommer { font-size: 14px; font-weight: 600; color: #687087; }
  .feuille.ct .ct-planche { display: flex; flex-direction: column; }
  .feuille.ct .ct-boites { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 4mm; }
  .feuille.ct .ct-boite { flex: 1 1 0; min-height: 0; border: 1.2mm solid var(--c); border-radius: 4mm; padding: 3mm; display: flex; flex-direction: column; gap: 2mm; box-sizing: border-box; }
  .feuille.ct .ct-fond { flex: 1; border: 1.5px dashed #c4c9d6; border-radius: 3mm; }
  .feuille.ct .ct-maison { border-top: none; border-radius: 0 0 3mm 3mm; padding-top: 0; position: relative; margin-top: 22mm; }
  .feuille.ct .ct-toit { height: 22mm; margin: -22mm -4.2mm 2mm; background: var(--c); clip-path: polygon(50% 0, 100% 100%, 0 100%); }
  .feuille.ct .ct-lignes { display: flex; flex-direction: column; gap: 3mm; }
  .feuille.ct .ct-ligne { display: grid; gap: 3mm; align-items: center; border: 1px solid #cfd4e2; border-radius: 3mm; padding: 2mm 3mm; box-sizing: border-box; page-break-inside: avoid; }
  .feuille.ct .ct-numero { font-size: 14px; font-weight: 800; color: #687087; }
  .feuille.ct .ct-case { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 0; gap: 1mm; }
  .feuille.ct .ct-case img, .feuille.ct .ct-case .vide { max-height: calc(100% - 2mm); max-width: 100%; aspect-ratio: 1; object-fit: contain; margin: 0; }
  .feuille.ct .ct-plaque { border: 1.2mm solid var(--c); border-radius: 4mm; padding: 3mm 4mm; margin: 0 0 5mm; page-break-inside: avoid; }
  .feuille.ct .ct-plaque .ct-entete img { width: 12mm; height: 12mm; }
  .feuille.ct .ct-cases { display: grid; grid-template-columns: repeat(3, 36mm); grid-auto-rows: 36mm; gap: 3mm; justify-content: center; margin-top: 3mm; }
  .feuille.ct .ct-case-vide { border: 1.5px dashed #9aa0b4; border-radius: 3mm; }
  .feuille.ct .ct-appels { display: grid; gap: 0; }
  .feuille.ct .ct-appel { border: 1px dashed #9aa0b4; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3mm; padding: 4mm; text-align: center; }
  .feuille.ct .ct-appel-dit { font-size: 15px; font-weight: 700; color: var(--c); }
  .feuille.ct .ct-appel img { width: 30mm; height: 30mm; object-fit: contain; margin: 0; }
  .feuille.ct .ct-appel-quoi { font-size: 19px; font-weight: 800; line-height: 1.2; }
  .feuille.ct .ct-famille { border: 1px dashed #9aa0b4; display: flex; flex-direction: column; align-items: center; gap: 1mm; padding: 0 0 1.5mm; overflow: hidden; }
  .feuille.ct .ct-famille-nom { align-self: stretch; background: var(--c); color: #fff; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 1.5mm; padding: 1mm 2mm; text-align: center; }
  .feuille.ct .ct-famille-nom img { width: 6mm; height: 6mm; object-fit: contain; margin: 0; background: #fff; border-radius: 1mm; }
  .feuille.ct .ct-famille-image { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; width: 100%; }
  .feuille.ct .ct-famille-image img, .feuille.ct .ct-famille-image .vide { max-width: 38mm; max-height: 100%; aspect-ratio: 1; object-fit: contain; margin: 0; }
  .feuille.ct .ct-famille .mot { font-size: 12px; }
  .feuille.ct .ct-famille-membres { display: flex; gap: 1mm; flex-wrap: wrap; justify-content: center; padding: 0 2mm; }
  .feuille.ct .ct-famille-membres span { width: 6mm; height: 6mm; border: 1px solid #dfe3ec; border-radius: 1mm; display: flex; }
  .feuille.ct .ct-famille-membres span.ici { border: 2px solid var(--c); }
  .feuille.ct .ct-famille-membres img, .feuille.ct .ct-famille-membres .vide { width: 100%; height: 100%; object-fit: contain; margin: 0; max-width: none; border: none; }
  .feuille.ct .ct-chat { width: 70%; max-width: 30mm; }
  .feuille.ct .ct-affiche-tete { display: flex; align-items: center; gap: 6mm; font-size: 34px; font-weight: 800; color: var(--c); border-bottom: 1.2mm solid var(--c); padding-bottom: 4mm; margin-bottom: 6mm; }
  .feuille.ct .ct-affiche-tete img { width: 40mm; height: 40mm; object-fit: contain; margin: 0; }
  .feuille.ct .ct-affiche-images { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; }
  .feuille.ct .ct-affiche-mot { display: flex; flex-direction: column; align-items: center; gap: 2mm; }
  .feuille.ct .ct-affiche-mot img, .feuille.ct .ct-affiche-mot .vide { width: 44mm; height: 44mm; object-fit: contain; margin: 0; }
  .feuille.ct .ct-affiche-mot .mot { font-size: 20px; }
  .feuille.ct .ct-corrige { font-size: 13px; line-height: 1.7; }
  .feuille.ct .ct-corpus { font-size: 12px; line-height: 1.5; margin: 0 0 4mm; }
  .feuille.ct .ct-grille { width: 100%; border-collapse: collapse; font-size: 11px; }
  .feuille.ct .ct-grille th, .feuille.ct .ct-grille td { border: 1px solid #9aa0b4; padding: 1.5mm; vertical-align: top; }
  .feuille.ct .ct-grille th { background: #f2f4f8; text-align: left; }
  .feuille.ct .ct-grille td { height: 11mm; }
  .feuille.ct .ct-grille th:first-child { width: 28mm; }
  .feuille.ct .ct-pied { margin-top: 3mm; }
`;
