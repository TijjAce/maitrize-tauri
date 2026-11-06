// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// La petite feuille à côté du texte de chaque carte de Fabriquer : « juste à côté du texte, un petit exemple de la feuille
// qui va être créée, histoire de donner plus envie » (l'enseignant, 6 novembre 2026). Ce sont de vraies photos de la feuille
// d'exemple de chaque atelier, prises dans l'atelier lui-même avec la vraie banque de pictos : rien n'est dessiné pour l'occasion.
// Les ateliers dont l'exemple dépend de ce que l'enseignant importe n'en ont pas (voir SANS_APERCU).

const FICHIERS = import.meta.glob<string>("./assets/apercus/*.webp", { eager: true, query: "?no-inline", import: "default" });

const APERCUS = new Map(Object.entries(FICHIERS).map(([chemin, url]) => [chemin.slice(chemin.lastIndexOf("/") + 1, -".webp".length), url]));

/** Les gestes Borel-Maisonny : leurs images sont celles de l'enseignant, et l'exemple n'a que des cadres vides. */
export const SANS_APERCU: readonly string[] = ["gestes"];

/** La photo de la feuille d'exemple de cet atelier ; rien pour un dossier, un générateur de l'enseignant. */
export const apercuDeLAtelier = (id: string): string | undefined => APERCUS.get(id);
