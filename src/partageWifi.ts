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
 * L'adresse à coller dans le téléphone, telle qu'on la lit à l'écran.
 *
 * Elle porte le jeton : sans lui, l'ordinateur répondrait « accès refusé » à
 * chaque dépôt.
 */
export const adresseDuPartage = (info: PortableInfo | null): string => info?.url ?? "";

/** Ce que l'infobulle de l'interrupteur raconte. */
export function titreDuPartage(info: PortableInfo | null): string {
  return info
    ? `Partage ouvert sur ${info.ip}:${info.port} — cliquez pour le fermer`
    : "Partage fermé — cliquez pour l'ouvrir : le planning et les observations dans le navigateur du téléphone";
}
