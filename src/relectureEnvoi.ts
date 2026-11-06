// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// ── Voir ce qui part ──────────────────────────────────────────────────────
//
// « Vous pourriez voir exactement ce qui part » : c'était la promesse du plan
// d'anonymisation (2 novembre 2026). Un réglage de Réglages › IA, éteint par
// défaut, montre avant chaque demande à Mistral le texte exact qui sort de
// l'ordinateur — les noms, les lieux, les dates déjà remplacés par leurs
// marqueurs —, à envoyer ou à annuler. Ce qui part tout seul — le compte rendu
// qui se range pendant une réunion, la télécommande — ne s'arrête pas pour
// demander : il passe `relire = false`.

import { invoke } from "@tauri-apps/api/core";

/** Le réglage : « 1 » quand l'enseignant veut voir chaque envoi. */
export const CLE_RELIRE = "iaRelireEnvois";

export interface Envoi {
  /** Ce qui part : les messages, la consigne de Maitrize comprise. */
  messages: { role: string; content: string }[];
  /** Une image part avec le texte : elle, ne se masque pas. */
  image?: boolean;
}

export interface DemandeDeRelecture { envoi: Envoi; resoudre: (envoyer: boolean) => void }
export const EVT_RELIRE = "maitrize:relire-envoi";

/** L'hôte qui montre ce qui part (RelectureEnvoiHost) : sans lui — un essai, une fenêtre sans interface —, rien ne s'arrête. */
let hotes = 0;
export const hoteDeRelecture = (present: boolean) => { hotes += present ? 1 : -1; };

/** Montre ce qui part si l'enseignant l'a demandé ; une erreur s'il annule : rien n'est parti. */
export async function relireAvantEnvoi(envoi: Envoi): Promise<void> {
  if (hotes <= 0) return;
  let voulu = false;
  try { voulu = (await invoke<string | null>("setting_get", { cle: CLE_RELIRE })) === "1"; } catch { return; }
  if (!voulu) return;
  const envoyer = await new Promise<boolean>((resoudre) => {
    window.dispatchEvent(new CustomEvent<DemandeDeRelecture>(EVT_RELIRE, { detail: { envoi, resoudre } }));
  });
  if (!envoyer) throw new Error("Envoi annulé : rien n'est parti.");
}
