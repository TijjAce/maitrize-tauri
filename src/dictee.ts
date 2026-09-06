import React from "react";
import { api } from "./api";

// ── Dictée ────────────────────────────────────────────────────────────────
// Enregistrement micro puis transcription, partagés par la dictée d'atelier
// et l'assistant. L'audio ne touche jamais le disque : il passe de la fenêtre
// à la requête, et disparaît.

export type EtatDictee = "repos" | "enregistrement" | "transcription";

export interface Dictee {
  etat: EtatDictee;
  secondes: number;
  /** Ouvre le micro. Renvoie l'erreur à afficher, ou null si tout va bien. */
  demarrer: () => Promise<string | null>;
  /** Ferme le micro et renvoie le texte transcrit (chaîne vide si échec). */
  arreter: () => Promise<{ texte: string; erreur: string | null }>;
  /** Relâche le micro sans transcrire. */
  annuler: () => void;
}

/** Message lisible pour les refus les plus courants. */
function messageMicro(e: unknown): string {
  const brut = String((e as Error)?.message ?? e);
  if (/denied|NotAllowed/i.test(brut)) {
    return "Accès au micro refusé. Autorisez Maitrize dans Réglages système → Confidentialité et sécurité → Microphone.";
  }
  if (/NotFound|Requested device not found/i.test(brut)) return "Aucun micro détecté.";
  return "Micro indisponible : " + brut;
}

export function useDictee(): Dictee {
  const [etat, setEtat] = React.useState<EtatDictee>("repos");
  const [secondes, setSecondes] = React.useState(0);

  const recRef = React.useRef<MediaRecorder | null>(null);
  const morceaux = React.useRef<Blob[]>([]);
  const fluxRef = React.useRef<MediaStream | null>(null);
  const minuteur = React.useRef<number | null>(null);

  const liberer = React.useCallback(() => {
    if (minuteur.current) { window.clearInterval(minuteur.current); minuteur.current = null; }
    fluxRef.current?.getTracks().forEach((t) => t.stop());
    fluxRef.current = null;
    recRef.current = null;
  }, []);

  // Le micro doit être relâché même si l'écran se ferme en cours
  // d'enregistrement : sinon la pastille reste allumée dans la barre système.
  React.useEffect(() => liberer, [liberer]);

  const demarrer = React.useCallback(async () => {
    try {
      const flux = await navigator.mediaDevices.getUserMedia({ audio: true });
      fluxRef.current = flux;
      morceaux.current = [];
      const rec = new MediaRecorder(flux);
      rec.ondataavailable = (e) => { if (e.data.size) morceaux.current.push(e.data); };
      rec.start();
      recRef.current = rec;
      setSecondes(0);
      minuteur.current = window.setInterval(() => setSecondes((s) => s + 1), 1000);
      setEtat("enregistrement");
      return null;
    } catch (e) {
      liberer();
      setEtat("repos");
      return messageMicro(e);
    }
  }, [liberer]);

  const arreter = React.useCallback(async () => {
    const rec = recRef.current;
    if (!rec) return { texte: "", erreur: null };
    setEtat("transcription");
    const blob: Blob = await new Promise((res) => {
      rec.onstop = () => res(new Blob(morceaux.current, { type: rec.mimeType || "audio/webm" }));
      rec.stop();
    });
    liberer();
    try {
      if (blob.size === 0) throw new Error("Enregistrement vide.");
      const b64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result).split(",")[1] ?? "");
        r.onerror = () => rej(new Error("Lecture de l'enregistrement impossible."));
        r.readAsDataURL(blob);
      });
      const texte = await api.transcrireAudio(b64, "dictee.webm");
      return { texte, erreur: null };
    } catch (e) {
      return { texte: "", erreur: String((e as Error)?.message ?? e) };
    } finally {
      setEtat("repos");
    }
  }, [liberer]);

  const annuler = React.useCallback(() => { liberer(); setEtat("repos"); }, [liberer]);

  return { etat, secondes, demarrer, arreter, annuler };
}

/** Durée d'enregistrement au format m:ss. */
export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
