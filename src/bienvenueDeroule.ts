// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// ── La page de bienvenue : son déroulé ────────────────────────────────────
//
// Ce qui se passe, et quand : sans écran, pour se lire et s'essayer (voir bienvenue.ts).

import type { MiseEnPage } from "./bienvenueRendu";

/** Retenu le temps d'une session : la fenêtre qui se recharge (après un retour en arrière, par exemple) n'est pas un lancement. */
const MARQUE_DE_SESSION = "maitrize:bienvenue";
export const ECRITURE_MS = 1900;
export const FONDU_MS = 600;
/** Le fond ralentit sur cette fin d'écriture, jusqu'à s'arrêter. */
const ARRET_MS = 700;
/** Combien d'images calmes de suite disent que l'application a fini de se poser, et combien de temps les attendre. */
export const IMAGES_CALMES = 4;
export const POSE_MAX_MS = 1500;
/** Après le clic, si l'application ne vient pas : mieux vaut une application en train de se charger qu'une page qui ne part plus. */
export const PATIENCE_APRES_LE_CLIC_MS = 20_000;

/** Est-ce un lancement ? Oui la première fois de la session, et la marque est posée au passage. */
export function estUnLancement(session: Pick<Storage, "getItem" | "setItem"> | null): boolean {
  try {
    if (session?.getItem(MARQUE_DE_SESSION)) return false;
    session?.setItem(MARQUE_DE_SESSION, "1");
  } catch { /* pas de stockage : on accueille, tant pis si la fenêtre se recharge */ }
  return true;
}

/** Où en est l'écriture, de 0 à 1,06 : elle démarre et finit en douceur (1,06 : la dernière lettre finit de s'arrondir). */
export function avancementDeLEcriture(ecoule: number): number {
  const x = Math.min(1, Math.max(0, ecoule / ECRITURE_MS));
  return (x * x * (3 - 2 * x) * 0.5 + x * 0.5) * 1.06;
}

/** Le temps du fond, en secondes : il coule, ralentit sur la fin de l'écriture, et s'arrête sans à-coup. */
export function tempsDuFond(ecoule: number): number {
  const avantArret = ECRITURE_MS - ARRET_MS;
  if (ecoule <= avantArret) return ecoule / 1000;
  const reste = Math.max(0, (ECRITURE_MS - ecoule) / ARRET_MS);
  return (avantArret + (ARRET_MS / 2) * (1 - reste * reste)) / 1000;
}

/** Les deux barres sous le z, dans la fenêtre : la largeur de la lettre, sous sa boucle. `mesure` en part de la taille, comme `miseEnPage`. */
export function barresDuZ(mp: MiseEnPage, mesure: (texte: string) => number, descente: number): { x: number; l: number; y1: number; y2: number; e: number } | null {
  const li = [...mp.lignes].reverse().find((l) => l.texte.includes("z"));
  if (!li) return null;
  const rang = li.texte.lastIndexOf("z");
  const x = li.x + mesure(li.texte.slice(0, rang)) * mp.taille;
  const l = (mesure(li.texte.slice(0, rang + 1)) - mesure(li.texte.slice(0, rang))) * mp.taille;
  const e = Math.max(2.5, Math.round(mp.taille * 0.032 * 2) / 2);
  const y1 = Math.round(li.base + (descente + 0.13) * mp.taille);
  return { x: Math.round(x - 0.02 * mp.taille), l: Math.round(l + 0.04 * mp.taille), y1, y2: y1 + Math.round(e * 2.2), e };
}

/**
 * Qu'est-ce que la page doit faire, à cet instant : pure, pour se lire et s'essayer sans écran. Elle charge l'application
 * derrière elle une fois le titre écrit, puis elle attend qu'on clique, sans limite : c'est le clic qui la fait partir,
 * dès que l'application est là et posée (`passeeDepuis` : depuis combien de temps on a cliqué, `null` tant qu'on ne l'a pas fait).
 */
export function etatDeLaPage(p: {
  ecoule: number; debutEcriture: number | null; appPrete: boolean; appPosee: boolean; passeeDepuis: number | null; immobile: boolean;
}): { chargerLApp: boolean; partir: boolean } {
  const ecrit = p.debutEcriture !== null && (p.immobile || p.ecoule - p.debutEcriture >= ECRITURE_MS);
  const passee = p.passeeDepuis !== null;
  return {
    chargerLApp: ecrit || passee || p.ecoule > 6000,
    partir: passee && ((p.appPrete && p.appPosee) || (p.passeeDepuis as number) > PATIENCE_APRES_LE_CLIC_MS),
  };
}

/** Une touche fait entrer, comme le clic ; pas ce qui sert à autre chose : ⌘Tab pour changer de fenêtre, une touche de majuscule seule. */
export function toucheQuiFaitEntrer(e: Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "altKey">): boolean {
  if (e.metaKey || e.ctrlKey || e.altKey) return false;
  return !["Shift", "Control", "Alt", "AltGraph", "Meta", "CapsLock", "Tab", "Fn"].includes(e.key);
}

/** La souris sur la page, telle que le dessin la suit. */
export interface Survol {
  /** Où elle est, en part de la fenêtre : un peu en retard sur la vraie, pour que tout reste doux. */
  x: number; y: number;
  /** Elle est sur la page, de 0 à 1. */
  presence: number;
  /** Elle bouge, de 0 à 1 : la goutte se creuse, et la soie repart. */
  elan: number;
  /** Ce que la soie a coulé sous elle, en secondes. */
  temps: number;
}

export const SURVOL_AU_REPOS: Survol = { x: 0.5, y: 0.5, presence: 0, elan: 0, temps: 0 };

/**
 * La souris, une image plus tard : `cible` est où elle se trouve vraiment, `null` quand elle a quitté la page ; `dt` le
 * temps écoulé, en millisecondes. `calme` dit que plus rien ne bouge : le dessin peut s'arrêter jusqu'au prochain mouvement.
 */
export function suivreLaSouris(s: Survol, cible: { x: number; y: number } | null, dt: number): { survol: Survol; calme: boolean } {
  const pas = Math.min(100, Math.max(0, dt));
  const vers = (a: number, b: number, duree: number) => b + (a - b) * Math.exp(-pas / duree);
  // Elle arrive sur la page : la goutte naît sous elle, sans venir de l'endroit où elle l'avait quittée.
  const depart = cible && s.presence < 0.01 ? cible : { x: s.x, y: s.y };
  const x = cible ? vers(depart.x, cible.x, 70) : s.x;
  const y = cible ? vers(depart.y, cible.y, 70) : s.y;
  const retard = cible ? Math.hypot(cible.x - x, cible.y - y) : 0;
  const voulue = cible ? 1 : 0;
  const presence = vers(s.presence, voulue, cible ? 180 : 320);
  const elanVoulu = Math.min(1, retard / 0.035);
  const elan = vers(s.elan, elanVoulu, elanVoulu > s.elan ? 60 : 420);
  const temps = s.temps + (elan * pas * 1.1) / 1000;
  const calme = retard < 0.0008 && Math.abs(presence - voulue) < 0.004 && elan < 0.004;
  return {
    survol: calme ? { x: cible?.x ?? x, y: cible?.y ?? y, presence: voulue, elan: 0, temps } : { x, y, presence, elan, temps },
    calme,
  };
}
