import React from "react";
import { MORCEAU_S } from "./reunion";

// ── Écouter longtemps, par morceaux ───────────────────────────────────────
//
// La dictée (voir `dictee.ts`) enregistre d'un bloc et transcrit à la fin :
// pour une réunion d'une heure, il faudrait attendre la fin pour avoir la
// moindre ligne, et un envoi raté ferait tout perdre.
//
// Ici, l'enregistreur est refermé et rouvert régulièrement sur le même micro.
// Chaque morceau est donc un fichier complet, transcriptible seul et tout de
// suite : le texte de la réunion s'écrit pendant qu'elle a lieu. La coupe
// laisse un trou de quelques millisecondes — le prix d'un fichier valide, un
// mot n'y tient pas.
//
// L'audio ne touche jamais le disque : il part en mémoire vers la
// transcription, puis disparaît.

export type EtatEcoute = "repos" | "ecoute" | "pause";

/** Une tranche prête à être transcrite. */
export interface TrancheAudio {
  blob: Blob;
  debut: number;
  fin: number;
}

export interface Ecoute {
  etat: EtatEcoute;
  /** Secondes écoutées depuis le début (pauses non comptées). */
  secondes: number;
  /** Secondes écoutées dans la tranche en cours. */
  secondesTranche: number;
  /**
   * Ouvre le micro. `depuis` reprend le compte là où la réunion s'était
   * arrêtée, pour que les horodatages suivent au lieu de repartir de zéro.
   * Renvoie l'erreur à afficher, ou null.
   */
  demarrer: (depuis?: number) => Promise<string | null>;
  /** Clôt le morceau en cours et en ouvre un autre : le texte arrive sans attendre. */
  couper: () => void;
  pause: () => void;
  reprendre: () => void;
  /** Clôt la dernière tranche et relâche le micro. */
  arreter: () => void;
}

/** Message lisible pour les refus les plus courants. */
export function messageMicro(e: unknown): string {
  const brut = String((e as Error)?.message ?? e);
  if (/denied|NotAllowed/i.test(brut)) {
    return "Accès au micro refusé. Autorisez Maitrize dans Réglages système → Confidentialité et sécurité → Microphone.";
  }
  if (/NotFound|Requested device not found/i.test(brut)) return "Aucun micro détecté.";
  return "Micro indisponible : " + brut;
}

/** En dessous, la tranche n'a rien à dire : on ne l'envoie pas transcrire. */
export const MINIMUM_S = 3;

export function useEcoute({ onTranche, tranche = MORCEAU_S }: {
  onTranche: (t: TrancheAudio) => void;
  tranche?: number;
}): Ecoute {
  const [etat, setEtat] = React.useState<EtatEcoute>("repos");
  const [secondes, setSecondes] = React.useState(0);
  const [secondesTranche, setSecondesTranche] = React.useState(0);

  const flux = React.useRef<MediaStream | null>(null);
  const rec = React.useRef<MediaRecorder | null>(null);
  const morceaux = React.useRef<Blob[]>([]);
  const minuteur = React.useRef<number | null>(null);
  const total = React.useRef(0);
  const debutTranche = React.useRef(0);
  // Le rappel change à chaque rendu ; l'enregistreur, lui, vit plus longtemps.
  const rappel = React.useRef(onTranche);
  rappel.current = onTranche;

  /** Ferme l'enregistreur en cours et remet la tranche au rappel. */
  const clore = React.useCallback(() => {
    const courant = rec.current;
    rec.current = null;
    if (!courant) return;
    // Le tableau de CET enregistreur : ses données arrivent à l'arrêt, et
    // elles doivent y tomber, pas dans celui de la tranche suivante.
    const parts = morceaux.current;
    const debut = debutTranche.current;
    const fin = total.current;
    courant.onstop = () => {
      const blob = new Blob(parts, { type: courant.mimeType || "audio/webm" });
      if (blob.size > 0 && fin - debut >= MINIMUM_S) rappel.current({ blob, debut, fin });
    };
    try { courant.stop(); } catch { /* déjà arrêté */ }
  }, []);

  /** Ouvre un enregistreur sur le micro déjà ouvert. */
  const ouvrirEnregistreur = React.useCallback(() => {
    const f = flux.current;
    if (!f) return;
    // Chaque enregistreur écrit dans son propre tableau : celui d'avant est
    // peut-être encore en train de rendre son dernier morceau.
    const parts: Blob[] = [];
    morceaux.current = parts;
    const r = new MediaRecorder(f);
    r.ondataavailable = (e) => { if (e.data.size) parts.push(e.data); };
    r.start();
    rec.current = r;
    debutTranche.current = total.current;
    setSecondesTranche(0);
  }, []);

  const couper = React.useCallback(() => {
    if (!rec.current) return;
    clore();
    ouvrirEnregistreur();
  }, [clore, ouvrirEnregistreur]);

  /** Le compteur : il avance, et coupe de lui-même à chaque morceau. */
  const lancerLeCompteur = React.useCallback(() => {
    if (minuteur.current) window.clearInterval(minuteur.current);
    minuteur.current = window.setInterval(() => {
      total.current += 1;
      setSecondes(total.current);
      const dans = total.current - debutTranche.current;
      setSecondesTranche(dans);
      if (dans >= tranche) couper();
    }, 1000);
  }, [couper, tranche]);

  const arreterLeCompteur = React.useCallback(() => {
    if (minuteur.current) { window.clearInterval(minuteur.current); minuteur.current = null; }
  }, []);

  const liberer = React.useCallback(() => {
    arreterLeCompteur();
    flux.current?.getTracks().forEach((t) => t.stop());
    flux.current = null;
  }, [arreterLeCompteur]);

  // Le micro doit être relâché même si l'on quitte l'écran en pleine réunion :
  // sinon la pastille rouge reste allumée dans la barre système.
  React.useEffect(() => () => { arreterLeCompteur(); flux.current?.getTracks().forEach((t) => t.stop()); }, [arreterLeCompteur]);

  const demarrer = React.useCallback(async (depuis = 0) => {
    try {
      flux.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      total.current = depuis;
      debutTranche.current = depuis;
      setSecondes(depuis);
      ouvrirEnregistreur();
      lancerLeCompteur();
      setEtat("ecoute");
      return null;
    } catch (e) {
      liberer();
      setEtat("repos");
      return messageMicro(e);
    }
  }, [ouvrirEnregistreur, lancerLeCompteur, liberer]);

  const pause = React.useCallback(() => {
    if (!rec.current) return;
    arreterLeCompteur();
    try { rec.current.pause(); } catch { /* pas de pause : la tranche continue */ }
    setEtat("pause");
  }, [arreterLeCompteur]);

  const reprendre = React.useCallback(() => {
    if (!rec.current) return;
    try { rec.current.resume(); } catch { /* idem */ }
    lancerLeCompteur();
    setEtat("ecoute");
  }, [lancerLeCompteur]);

  const arreter = React.useCallback(() => {
    arreterLeCompteur();
    // Reprendre avant de clore : un enregistreur en pause ne rend pas ses données.
    if (rec.current?.state === "paused") { try { rec.current.resume(); } catch { /* ignore */ } }
    clore();
    liberer();
    setEtat("repos");
    setSecondesTranche(0);
  }, [arreterLeCompteur, clore, liberer]);

  return { etat, secondes, secondesTranche, demarrer, couper, pause, reprendre, arreter };
}
