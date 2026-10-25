// Démarrer en un clic (choisi par l'enseignant le 25 octobre 2026) : sur l'aperçu d'exemple d'un atelier à mots,
// quelques départs tout prêts — des thèmes de la banque d'images adaptés à la classe, les mots du projet du
// moment, ses propres images. Un clic remplit la liste, et la vraie feuille paraît ; rien n'entre sans ce clic.

import { lireNiveaux } from "./classe";

export interface ThemeDeDepart {
  /** La catégorie de la banque (ARASAAC) où piocher. */
  categorie: string;
  libelle: string;
  icone: string;
}

const MATERNELLE = ["TPS", "PS", "MS", "GS"];

const FERME: ThemeDeDepart = { categorie: "domestic animal", libelle: "La ferme", icone: "🐮" };
const FRUITS: ThemeDeDepart = { categorie: "fruit", libelle: "Les fruits", icone: "🍎" };
const JOUETS: ThemeDeDepart = { categorie: "toy", libelle: "Les jouets", icone: "🧸" };
const VETEMENTS: ThemeDeDepart = { categorie: "clothes", libelle: "Les vêtements", icone: "👕" };
const SAUVAGES: ThemeDeDepart = { categorie: "wild animal", libelle: "Les animaux sauvages", icone: "🦁" };
const LEGUMES: ThemeDeDepart = { categorie: "vegetable", libelle: "Les légumes", icone: "🥕" };
const TRANSPORTS: ThemeDeDepart = { categorie: "land transport", libelle: "Les transports", icone: "🚗" };

/**
 * Les thèmes proposés, selon les niveaux de la classe (réglage « niveauClasse ») : ceux de la maternelle quand
 * elle fait au moins la moitié de la classe, ceux de l'élémentaire sinon ; sans niveau, un peu des deux.
 */
export function themesDeDepart(niveauClasse: string | null | undefined): ThemeDeDepart[] {
  const niveaux = lireNiveaux(niveauClasse);
  if (!niveaux.length) return [FERME, FRUITS, TRANSPORTS, VETEMENTS];
  const maternelle = niveaux.filter((n) => MATERNELLE.includes(n)).length;
  return maternelle * 2 >= niveaux.length ? [FERME, FRUITS, JOUETS, VETEMENTS] : [SAUVAGES, LEGUMES, TRANSPORTS, VETEMENTS];
}

/** Combien de mots un thème met dans la liste : une feuille, pas davantage. */
export const MOTS_PAR_THEME = 8;
