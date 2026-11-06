// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// ── Le premier lancement ──────────────────────────────────────────────────
//
// « À la première installation de l'application, juste après avoir accepté
// les conditions d'utilisation, l'utilisateur est invité à installer les
// pictos ARASAAC et les autres (obligatoirement). Ensuite il peut, s'il veut,
// rentrer sa clé API. Puis il est invité à débuter par la création de son
// emploi du temps » (l'enseignant, 5 novembre 2026).
//
// Puis, le lendemain : « Pour commencer ensuite, après les pictos et la clé, une
// sorte de Tinder, swipe right and left, du matériel. Et la possibilité de
// dessiner son plan de classe. Ensuite l'application s'ouvre avec le thème rose
// Aurore Vitré » (voir triDuMateriel.ts, et `THEME_DE_DEPART`). L'invitation à
// faire son emploi du temps reste la dernière étape : elle ouvre l'application.
//
// En plein écran, après la porte des conditions d'utilisation (voir
// components/PremierLancement.tsx). Le parcours remplace les diapositives
// d'accueil d'avant (réglage « onboardingVu ») : une installation qui les avait
// déjà vues ne le voit pas, elle n'a rien à installer de nouveau.
//
// Hors connexion, les pictogrammes peuvent attendre : « Installer plus tard »
// (« oui ajoute "Installer plus tard" hors connexion », le même jour). Ils
// restent obligatoires : l'étape revient à chaque lancement, seule, jusqu'à
// ce qu'ils soient installés.

/** Le réglage qui retient que le premier lancement est fait : sa date, ou « deja-installee ». */
export const CLE_PREMIER_LANCEMENT = "premierLancement";

/** Le réglage qui retient que les pictogrammes ont été remis à plus tard, faute de connexion. */
export const CLE_PICTOS_PLUS_TARD = "premierLancementPictos";
export const PICTOS_PLUS_TARD = "plus-tard";

/**
 * Ce que le lancement doit faire : montrer le parcours, revenir aux seuls pictogrammes remis à plus tard, noter le
 * parcours comme fait pour une installation d'avant, ou rien.
 */
export function suiteDuLancement(
  fait: string | null | undefined, accueilVu: string | null | undefined, pictosPlusTard?: string | null,
): "montrer" | "pictos" | "deja-installee" | "rien" {
  if (fait) return pictosPlusTard === PICTOS_PLUS_TARD ? "pictos" : "rien";
  return accueilVu ? "deja-installee" : "montrer";
}

/** « Installer plus tard » ne se propose que sans connexion, ou quand un téléchargement vient d'échouer. */
export const installerPlusTardPossible = (enLigne: boolean, erreur: boolean, enCours: boolean): boolean => !enCours && (!enLigne || erreur);

export type EtapeDuLancement = "pictos" | "cle" | "materiel" | "salle" | "edt";

export const ETAPES_DU_LANCEMENT: { id: EtapeDuLancement; nom: string }[] = [
  { id: "pictos", nom: "Les pictogrammes" },
  { id: "cle", nom: "L'assistant IA" },
  { id: "materiel", nom: "Le matériel" },
  { id: "salle", nom: "Le plan de classe" },
  { id: "edt", nom: "L'emploi du temps" },
];

/** Les pictogrammes sont là quand ARASAAC et chaque banque d'appoint attendue le sont : on ne passe pas sans eux. */
export const pictosInstalles = (arasaac: boolean, appoint: { banque: string; installee: boolean }[], attendues: string[]): boolean =>
  arasaac && attendues.every((b) => appoint.some((e) => e.banque === b && e.installee));

/** Une installation neuve s'ouvre en rose, Aurore, Vitré. Une installation d'avant garde ce qu'elle a, même sans rien avoir choisi. */
export const THEME_DE_DEPART = { apparence: "aurore", accent: "pink", styleInterface: "vitre" };

/** Rien n'a encore été fait sur cet ordinateur : ni le premier lancement, ni l'accueil d'avant, ni aucun choix d'apparence. */
export const installationNeuve = (s: Record<string, string | undefined>): boolean =>
  !s[CLE_PREMIER_LANCEMENT] && !s.onboardingVu && !s.apparence && !s.accent && !s.styleInterface;
