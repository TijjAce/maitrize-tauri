// La classe telle que l'enseignant la décrit dans les Réglages : sa structure
// et ses niveaux.
//
// Ni l'une ni les autres ne changent ce que propose l'application : tous les
// onglets, toutes les cases restent là, quelle que soit la structure. Elles
// disent où l'on enseigne — sur les documents qu'on imprime, et à l'IA, qui
// adapte ses pistes au public.

import { NIVEAUX_SCOLAIRES } from "./api";

export interface Structure {
  id: string;
  /** Tel que la liste des Réglages le propose. */
  libelle: string;
  /** Tel qu'une phrase le dit : « en SESSAD », « en ULIS école ». */
  court: string;
  groupe: string;
  /** Un public à besoins éducatifs particuliers : l'IA le sait. */
  specialisee: boolean;
}

const s = (id: string, libelle: string, court: string, groupe: string, specialisee = true): Structure =>
  ({ id, libelle, court, groupe, specialisee });

/** Les structures où l'on enseigne, regroupées comme on les cherche. */
export const STRUCTURES: Structure[] = [
  s("ordinaire", "Classe ordinaire", "classe ordinaire", "École", false),
  s("ulis-ecole", "ULIS école", "ULIS école", "Dispositifs d'inclusion"),
  s("ulis-college", "ULIS collège ou lycée", "ULIS collège ou lycée", "Dispositifs d'inclusion"),
  s("uema", "UEMA — unité d'enseignement maternelle autisme", "UEMA", "Dispositifs d'inclusion"),
  s("ueea", "UEEA — unité d'enseignement élémentaire autisme", "UEEA", "Dispositifs d'inclusion"),
  s("uee", "Unité d'enseignement externalisée", "unité d'enseignement externalisée", "Dispositifs d'inclusion"),
  s("rased", "RASED", "RASED", "Dispositifs d'inclusion"),
  s("segpa", "SEGPA", "SEGPA", "Enseignement adapté"),
  s("erea", "EREA", "EREA", "Enseignement adapté"),
  s("ime", "IME — institut médico-éducatif", "IME", "Établissements et services médico-sociaux"),
  s("iem", "IEM — institut d'éducation motrice", "IEM", "Établissements et services médico-sociaux"),
  s("itep", "ITEP / DITEP", "ITEP", "Établissements et services médico-sociaux"),
  s("sessad", "SESSAD — service d'éducation spéciale et de soins à domicile", "SESSAD", "Établissements et services médico-sociaux"),
  s("sensoriel", "Institut pour jeunes sourds ou aveugles", "institut pour jeunes sourds ou aveugles", "Établissements et services médico-sociaux"),
  s("hopital", "Enseignement à l'hôpital, hôpital de jour", "unité d'enseignement à l'hôpital", "Soin"),
  s("autre", "Autre structure", "", "Autre", false),
];

/** Les groupes de la liste, dans leur ordre. */
export const GROUPES_DE_STRUCTURES = [...new Set(STRUCTURES.map((x) => x.groupe))];

/**
 * La structure des Réglages. Un réglage d'avant la liste, venu de l'ancien
 * emploi du temps « Organisation IME », vaut l'IME.
 */
export function structureDe(reglages: Record<string, string | undefined>): Structure {
  const id = reglages.typeStructure || (reglages["edt:mode"] === "ime" ? "ime" : "ordinaire");
  return STRUCTURES.find((x) => x.id === id) ?? STRUCTURES[0];
}

/** Ce que les documents et l'IA disent de la structure : son nom court, rien en classe ordinaire. */
export const nomDeStructure = (x: Structure): string => (x.specialisee ? x.court : "");

/**
 * Les niveaux de la classe, dans l'ordre de l'école : une classe à plusieurs
 * niveaux en coche plusieurs. Le réglage les garde en une ligne, « CP, CE1 »,
 * que les documents impriment telle quelle.
 */
export function lireNiveaux(valeur: string | null | undefined): string[] {
  const dits = (valeur ?? "").split(/[,/·;]+/).map((x) => x.trim().toUpperCase()).filter(Boolean);
  return NIVEAUX_SCOLAIRES.filter((n) => dits.includes(n.toUpperCase()));
}

export const ecrireNiveaux = (niveaux: string[]): string => lireNiveaux(niveaux.join(",")).join(", ");
