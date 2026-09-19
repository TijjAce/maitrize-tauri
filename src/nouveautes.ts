// Ce qui a changé, version par version.
//
// L'app se met à jour toute seule : rien ne dit ce qui a bougé, et les
// nouveautés se découvrent par hasard — ou jamais. Cette liste est lue à la
// première ouverture qui suit une mise à jour, puis reste consultable.
//
// Une entrée se lit en classe, entre deux ateliers : des phrases courtes, et
// l'endroit où trouver la chose. Ce qui ne se voit pas — un correctif de
// synchronisation, par exemple — se dit quand même, en une ligne, parce que
// c'est ce qui explique qu'un travail perdu ne se reperde plus.

export interface Nouveaute {
  version: string;
  /** Ce que la version apporte, en une phrase. */
  titre: string;
  points: { quoi: string; ou?: string }[];
}

export const NOUVEAUTES: Nouveaute[] = [
  {
    version: "1.6.12",
    titre: "Un seul bureau dans toute l'application",
    points: [
      { quoi: "Ateliers, espaces, jeux, outils et affichages rejoignent le bureau du plan de travail : un dossier « cycle 1 » peut réunir une séquence, ses jeux et l'outil qui va avec. Clic droit sur le bureau pour en créer, double-clic pour ouvrir leur fiche.", ou: "Plan de travail" },
      { quoi: "« Ateliers & Espaces » quitte le menu. Les fiches et leurs filtres — nombre de joueurs, catégorie, élève — restent à portée de main par le bouton « ▦ Fiches » du bureau.", ou: "Plan de travail · ▦ Fiches" },
      { quoi: "Les dossiers créés dans l'ancien bureau des ateliers sont versés dans le plan de travail ; deux dossiers du même nom n'en font plus qu'un." },
      { quoi: "Les bureaux communs : un dossier partagé par Nuage, OneDrive ou Google Drive devient un bureau commun avec vos collègues. On y glisse des fichiers et des dossiers depuis le Finder, on y dépose un dossier de son bureau (séquences, jeux, outils, avec tout leur contenu) par un clic droit, et l'on récupère en copie ce que les autres ont posé. Vous décidez, dans le service de stockage, qui y a accès. Les bilans de séance et les élèves associés aux outils ne partent pas ; les textes et documents partent tels qu'ils sont écrits.", ou: "Plan de travail · 🤝 Bureaux communs" },
    ],
  },
  {
    version: "1.6.11",
    titre: "Un seul bureau pour les ateliers, les jeux, les outils et les affichages",
    points: [
      { quoi: "Ateliers, espaces, jeux, outils et affichages se rangent sur un même bureau : un dossier « cycle 1 » peut réunir un jeu, l'outil qui va avec et l'affichage du coin. Plus d'onglets : la recherche et les filtres (nombre de joueurs, catégorie, élève) suffisent.", ou: "Ateliers & Espaces" },
      { quoi: "Les barres d'onglets ont la même taille et la même place sur toutes les pages." },
    ],
  },
  {
    version: "1.6.10",
    titre: "Retrouver ce qu'on a écrit, et ne plus rien perdre entre les deux ordinateurs",
    points: [
      { quoi: "La recherche ⌘K cherche enfin dans les séances, le cahier journal, les observations, les jeux et les affichages. Elle montre la ligne trouvée et sa date, et mène au bon jour.", ou: "N'importe où · ⌘K" },
      { quoi: "Le tableau de bord montre la journée : ce qui est prévu à chaque créneau, celui en cours, et les bilans qui manquent. Un clic ouvre le cahier journal.", ou: "Tableau de bord" },
      { quoi: "Citer une séquence dans le prévu affiche ses objectifs et le déroulement de la séance, dans l'app et dans le PDF du jour. Le bouton 📚 la pose pour vous.", ou: "Planning · cahier journal" },
      { quoi: "Citer un jeu affiche sa règle, au même endroit et dans le PDF.", ou: "Planning · cahier journal" },
      { quoi: "Les objectifs du PPI se cochent en portant une observation au dossier ; le PPI montre ensuite les preuves datées, et signale un objectif laissé de côté.", ou: "Élèves · PPI" },
      { quoi: "Les tableaux de langage s'échangent au glisser-déposer, et le générateur de lotos a été refait.", ou: "Fabriquer" },
      { quoi: "Nouveaux onglets Outils pour l'élève et Affichage ; jeux, espaces, outils et affichages se rangent comme sur le bureau.", ou: "Ateliers & Espaces" },
      { quoi: "Supports visuels : économie de jetons, « d'abord / ensuite », minuteur visuel, scénarios sociaux.", ou: "Fabriquer" },
      { quoi: "Le bureau se recopie dans un vrai dossier du Bureau de l'ordinateur, lisible sans l'app.", ou: "Réglages · Données" },
      { quoi: "Synchronisation : une ligne qu'une version ne sait pas écrire n'annule plus tout l'envoi, et deux tableaux créés chacun de son côté se gardent tous les deux." },
      { quoi: "Une fois par mois, l'app relit pour de vrai la dernière sauvegarde et prévient si elle n'est pas restaurable.", ou: "Réglages · Données" },
      { quoi: "Un bouton « Ranger » remet les icônes en ordre, dossiers d'abord puis par nom, là où un déplacement a laissé des trous.", ou: "Ateliers & Espaces · Plan de travail" },
      { quoi: "Une fenêtre figée ou une commande qui ne répond plus laisse une trace dans le journal d'incidents, pour qu'on puisse comprendre ce qui s'est passé.", ou: "Réglages · Données" },
    ],
  },
];

/** Compare deux numéros de version : négatif si a est plus ancienne que b. */
export function comparerVersions(a: string, b: string): number {
  const p = (v: string) => (v || "").split(/[.\-+]/).map((x) => parseInt(x, 10) || 0);
  const [xa, xb] = [p(a), p(b)];
  for (let i = 0; i < Math.max(xa.length, xb.length); i++) {
    const d = (xa[i] ?? 0) - (xb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

/**
 * Ce qu'il y a de neuf depuis la dernière fois qu'on a regardé.
 *
 * On ne montre rien à qui n'a jamais rien vu : à la première ouverture, l'app
 * est nouvelle tout entière, et un panneau de nouveautés n'y apprendrait rien.
 */
export function nouveautesDepuis(vues: string, version: string, liste = NOUVEAUTES): Nouveaute[] {
  if (!vues.trim()) return [];
  return liste
    .filter((n) => comparerVersions(n.version, vues) > 0 && comparerVersions(n.version, version) <= 0)
    .sort((a, b) => comparerVersions(b.version, a.version));
}
