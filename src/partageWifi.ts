// L'interrupteur du partage WiFi, partagé par la barre du haut et les Réglages.
//
// Le partage se lançait depuis les Réglages, et s'arrêtait tout seul quand on
// en sortait — une précaution qui se retournait contre l'usage : on ouvre le
// partage pour dicter en classe, et il fallait rester sur cet écran.
//
// Il se commande donc de partout, depuis un interrupteur visible en
// permanence. La précaution devient la visibilité : tant que le voyant est
// allumé, le partage tourne, et on le voit de n'importe quelle page.
//
// Deux écrans peuvent le commander : celui de la barre et celui des Réglages.
// Un événement de fenêtre les tient d'accord, sans état global à porter.
//
// Depuis octobre 2026, le partage se ferme aussi tout seul — deux heures sans
// visite du téléphone, dix heures au plus — et chaque ouverture donne un code
// neuf : le backend le dit par l'événement « portable:ferme ».

import { listen } from "@tauri-apps/api/event";
import { api, type PortableInfo } from "./api";

/** Émis quand le partage s'ouvre ou se ferme, avec son état. */
export const EVT_PARTAGE = "maitrize:partage";

/** Prévient les écrans qui affichent l'interrupteur. */
export function annoncerPartage(info: PortableInfo | null): void {
  window.dispatchEvent(new CustomEvent(EVT_PARTAGE, { detail: info }));
}

/** Ouvre le partage et l'annonce. Lève si le serveur refuse de démarrer. */
export async function ouvrirPartage(): Promise<PortableInfo> {
  const info = await api.portableDemarrer();
  annoncerPartage(info);
  return info;
}

/** Ferme le partage et l'annonce. Ne lève jamais : fermer doit toujours aboutir. */
export async function fermerPartage(): Promise<void> {
  try { await api.portableArreter(); } catch { /* déjà fermé */ }
  annoncerPartage(null);
}

/** Ce que le backend dit de l'état, ou rien s'il ne répond pas. */
export async function lirePartage(): Promise<PortableInfo | null> {
  try { return await api.portableEtat(); } catch { return null; }
}

/**
 * Suit l'état du partage, quel que soit celui qui le change : un écran qui l'ouvre ou le ferme, ou le backend qui
 * le ferme tout seul. Rend de quoi arrêter de suivre.
 */
export function suivrePartage(rappel: (info: PortableInfo | null) => void): () => void {
  const ecouter = (e: Event) => rappel((e as CustomEvent<PortableInfo | null>).detail);
  window.addEventListener(EVT_PARTAGE, ecouter);
  let fini = false;
  let oublier: (() => void) | null = null;
  listen("portable:ferme", () => rappel(null))
    .then((f) => { if (fini) f(); else oublier = f; })
    .catch(() => { /* hors de l'application */ });
  return () => {
    fini = true;
    window.removeEventListener(EVT_PARTAGE, ecouter);
    oublier?.();
  };
}

/** Ce que l'infobulle de l'interrupteur raconte. */
export function titreDuPartage(info: PortableInfo | null): string {
  return info
    ? `Partage ouvert sur ${info.ip}:${info.port} — cliquez pour le fermer`
    : "Partage fermé — cliquez pour l'ouvrir : le planning dans le navigateur du téléphone";
}
