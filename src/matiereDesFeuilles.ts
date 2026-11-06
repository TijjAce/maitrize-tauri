// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// ── La matière d'une feuille fabriquée ────────────────────────────────────
//
// « Il faudrait que chaque PDF généré par le générateur puisse avoir sa
// matière qui y soit associée : comme ça, il n'y a pas d'erreur lorsque ça
// crée ce que doit faire l'élève lors du créneau » (l'enseignant, 3 novembre
// 2026). La carte d'une fiche, sur les tablettes et dans la journée en bandes,
// devinait sa matière et son domaine d'après son titre ; elle les lit
// désormais dans le PDF, écrits à sa fabrication. C'est, dans l'ordre :
// - la matière choisie pour l'atelier dans « La feuille » ;
// - celle de la première compétence de la feuille ;
// - celle de la famille de l'atelier : Français, Mathématiques et leurs
//   domaines, celles de la maternelle quand la classe en est.

import { DOMAINES_DES_MATHS, FAMILLES, PARTIES_DU_FRANCAIS } from "./catalogueAteliers";
import { lireNiveaux } from "./classe";
import { MATIERES } from "./api";

export interface MatiereDeFeuille { matiere: string; domaine: string }

/** Le choix de l'enseignant pour un atelier, dans les réglages : il voyage avec eux. */
export const cleMatiereDeLaFeuille = (atelier: string) => `feuille:matiere:${atelier}`;
/** Le choix vient de changer : les résumés de « La feuille » se relisent. */
export const EVT_MATIERE_DE_LA_FEUILLE = "maitrize:matiere-de-la-feuille";

/** Les matières qu'une feuille peut avoir : celles de l'emploi du temps, sans les temps qui n'en sont pas. */
export const MATIERES_DES_FEUILLES = MATIERES.filter((m) => !["Accueil", "Rituel", "Récréation", "Pause méridienne", "Temps calme", "APC", "Autre"].includes(m));

/** Un choix enregistré, relu : rien s'il est vide ou abîmé. */
export function lireMatiereDeFeuille(brut: unknown): MatiereDeFeuille | null {
  let v: unknown = brut;
  if (typeof brut === "string") {
    if (!brut.trim()) return null;
    try { v = JSON.parse(brut); } catch { return null; }
  }
  const o = v && typeof v === "object" ? v as Record<string, unknown> : {};
  const matiere = typeof o.matiere === "string" ? o.matiere.trim() : "";
  return matiere ? { matiere, domaine: typeof o.domaine === "string" ? o.domaine.trim() : "" } : null;
}

const MATERNELLE = new Set(["TPS", "PS", "MS", "GS"]);
/** Les niveaux de la classe, tels que les réglages les gardent. */
export const niveauxDeLaClasse = (reglages: Record<string, string | undefined>) => lireNiveaux(reglages.niveauClasse);

// Les domaines, nommés comme les feuilles d'« En retard » les nomment (voir fichesAutonomie) : ce sont ceux des pictos.
const NOMBRES = "Nombres, calcul et résolution de problèmes";
const DOMAINE_DES_MATHS: Record<string, string> = {
  nombres: NOMBRES, calcul: NOMBRES, problemes: NOMBRES, grandeurs: "Grandeurs et mesures",
  geometrie: "Espace et géométrie", donnees: "Organisation et gestion de données",
};
const DOMAINE_DU_FRANCAIS: Record<string, string> = {
  ecrire: "Écriture", cursive: "Écriture", oral: "Langage oral",
  orthographe: "Grammaire et orthographe", grammaire: "Grammaire et orthographe", phrases: "Grammaire et orthographe",
  phrasesPuzzle: "Grammaire et orthographe", tri: "Grammaire et orthographe", trous: "Grammaire et orthographe",
};

/**
 * Ce que la famille de l'atelier dit de sa matière, à défaut d'autre chose ;
 * rien pour ce qui n'en a pas en propre — évaluer, les aides, les affichages,
 * les générateurs de l'enseignant.
 */
export function matiereParDefaut(atelier: string, niveaux: string[] = []): MatiereDeFeuille | null {
  const famille = FAMILLES.find((f) => f.outils.some((o) => o.id === atelier))?.id;
  const maternelle = niveaux.length > 0 && niveaux.every((n) => MATERNELLE.has(n));
  if (famille === "maths") {
    if (maternelle) return { matiere: "Structurer sa pensée", domaine: "Acquérir les premiers outils mathématiques" };
    const partie = DOMAINES_DES_MATHS.find((d) => (d.outils as string[]).includes(atelier))?.id ?? "";
    return { matiere: "Mathématiques", domaine: DOMAINE_DES_MATHS[partie] ?? "" };
  }
  if (famille === "francais" || famille === "observation") {
    if (maternelle) return { matiere: "Mobiliser le langage", domaine: "Mobiliser le langage dans toutes ses dimensions" };
    const partie = PARTIES_DU_FRANCAIS.find((p) => (p.outils as string[]).includes(atelier))?.id ?? "";
    const domaine = DOMAINE_DU_FRANCAIS[atelier] ?? (partie === "langage" ? "Langage oral" : partie === "sons" || partie === "ecrit" || famille === "observation" ? "Lecture" : "");
    return { matiere: "Français", domaine };
  }
  if (famille === "histoireGeo") {
    if (maternelle) return { matiere: "Explorer le monde", domaine: "" };
    return { matiere: niveaux.some((n) => n === "CM1" || n === "CM2") ? "Histoire-Géographie" : "Questionner le monde", domaine: "" };
  }
  return null;
}

/** La matière d'une feuille en clair, pour le résumé de « La feuille » : « Mathématiques · Grandeurs et mesures ». */
export const matiereEnClair = (m: MatiereDeFeuille | null): string => (m ? [m.matiere, m.domaine].filter(Boolean).join(" · ") : "");
