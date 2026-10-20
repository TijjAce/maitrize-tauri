// Les exemples des générateurs de Fabriquer : ce que donne la feuille avant
// qu'on ait rien choisi. Demande de l'enseignant (octobre 2026) : « je veux
// qu'il y ait toujours un exemple de ce que ça donne à la fin », comme les
// images séquentielles montrent déjà une journée.
//
// Des mots de tous les jours, qui ont un picto dans la banque. L'exemple ne
// fait que se montrer : rien n'entre dans un atelier sans « Partir de cet
// exemple », comme les mots du projet n'y entrent qu'à la demande.

/** Les mots d'exemple des ateliers qui partent d'une liste de mots. */
export const MOTS_EXEMPLE = {
  // Des silhouettes qui ne se confondent pas.
  ombres: ["chat", "vache", "poule", "lapin", "cheval", "canard"],
  // Deux familles à trier : des fruits, des légumes.
  etiquettes: ["pomme", "banane", "poire", "carotte", "tomate", "salade"],
  // D'une à trois syllabes, pour quatre planches.
  lotoSyllabes: ["chat", "lapin", "tomate", "moto", "vélo", "banane", "domino", "ballon", "lune", "pomme", "tortue", "cerise"],
  // Des mots qui s'enchaînent : la fin de l'un est le début de l'autre (bateau, tomate ; lapin, pinceau).
  dominos: ["lapin", "pinceau", "sorcière", "domino", "noisette", "tomate", "matelas", "lama", "moto", "tortue", "chapeau", "poteau", "taureau", "rossignol", "bateau", "toboggan"],
  // Des familles qui commencent pareil — ba, la, ca, to — : chaque ligne a son intrus.
  intrus: ["banane", "bateau", "ballon", "baleine", "lapin", "lama", "lavabo", "canard", "carotte", "cadeau", "camion", "tomate", "toboggan", "tonneau"],
  // Des mots courts, aux sons simples, à écrire en gestes.
  motsGestes: ["moto", "lune", "vélo", "papa", "tapis", "robot"],
  // Les animaux de la ferme : un loto, un jeu de mémoire, un imagier.
  jeux: ["chat", "chien", "vache", "poule", "lapin", "cheval", "mouton", "canard", "cochon", "chèvre", "âne", "oie"],
} as const;

/**
 * Des mots de tous les jours qui ont un dessin : la syllabe manquante y prend
 * ceux où l'on entend les syllabes qu'on a choisies — ma, mi, mu au départ.
 */
export const MOTS_A_SYLLABES = [
  "tomate", "pyjama", "lama", "domino", "chemise", "musique", "moto", "lapin", "vélo", "banane", "ballon", "bateau", "cadeau", "canard",
  "carotte", "lavabo", "salade", "tortue", "tapis", "poule", "chapeau", "râteau", "marteau", "radis", "robot", "sapin", "savon", "souris",
  "fusée", "girafe", "gâteau", "lune", "mouton", "papillon", "pirate", "piano", "café", "kiwi", "panier", "pantalon",
];

/** La carte mentale d'exemple : un centre et son image, quatre branches, leurs mots. */
export const CARTE_EXEMPLE = {
  centre: "Le chat",
  image: "chat",
  branches: [
    { titre: "Ce qu'il mange", idees: ["poisson", "lait", "souris"] },
    { titre: "Ce qu'il fait", idees: ["dormir", "jouer", "boire"] },
    { titre: "Son corps", idees: ["moustache", "queue", "patte"] },
    { titre: "Où il vit", idees: ["maison", "jardin", "panier"] },
  ],
};

/** Tous les mots dont un exemple a besoin, pour chercher leurs images d'un coup. */
export const motsDeLaCarte = (c = CARTE_EXEMPLE) => [c.image, ...c.branches.flatMap((b) => b.idees)];
