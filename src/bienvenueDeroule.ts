// ── La page de bienvenue : son déroulé ────────────────────────────────────
//
// Ce qui se passe, et quand : sans écran, pour se lire et s'essayer (voir bienvenue.ts).

import type { MiseEnPage } from "./bienvenueRendu";

/** Retenu le temps d'une session : la fenêtre qui se recharge (après un retour en arrière, par exemple) n'est pas un lancement. */
const MARQUE_DE_SESSION = "maitrize:bienvenue";
export const ECRITURE_MS = 1900;
/** Après l'écriture, le temps de voir les barres se tirer et la signature. */
export const TENUE_MS = 1400;
export const FONDU_MS = 600;
/** Le fond ralentit sur cette fin d'écriture, jusqu'à s'arrêter. */
const ARRET_MS = 700;
/** Combien d'images calmes de suite disent que l'application a fini de se poser, et combien de temps les attendre. */
export const IMAGES_CALMES = 4;
export const POSE_MAX_MS = 1500;
/** Quoi qu'il arrive, la page s'en va : mieux vaut une application en train de se charger qu'une page qui ne part plus. */
const PRESENCE_MAX_MS = 20_000;

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

/** Qu'est-ce que la page doit faire, à cet instant : pure, pour se lire et s'essayer sans écran. */
export function etatDeLaPage(p: {
  ecoule: number; debutEcriture: number | null; appPrete: boolean; appPosee: boolean; passee: boolean; immobile: boolean;
}): { chargerLApp: boolean; partir: boolean } {
  const ecrit = p.debutEcriture !== null && (p.immobile || p.ecoule - p.debutEcriture >= ECRITURE_MS);
  const tenu = p.debutEcriture !== null && p.ecoule - p.debutEcriture >= (p.immobile ? 0 : ECRITURE_MS) + TENUE_MS;
  return {
    chargerLApp: ecrit || p.passee || p.ecoule > 6000,
    partir: p.ecoule > PRESENCE_MAX_MS || (p.appPrete && (p.passee || (tenu && p.appPosee))),
  };
}
