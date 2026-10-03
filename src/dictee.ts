import React from "react";
import { api } from "./api";
import { messageMicro, useEcoute } from "./ecoute";
import { choixIci, paroleMinimale, plafondDuMorceau, type Usage } from "./transcription";

// ── Dictée ────────────────────────────────────────────────────────────────
// Enregistrement micro puis transcription, partagés par la dictée d'atelier,
// le cahier journal et l'assistant. L'audio ne touche jamais le disque.
//
// Où il est transcrit dépend de l'ordinateur, comme pour les vocaux du
// téléphone. Avec un modèle installé, tout se passe ici : on prend les
// échantillons du micro, on les coupe aux silences, et chaque phrase est
// transcrite dans l'application pendant que l'enseignant parle encore — rien
// ne sort. Sans modèle, l'enregistrement part d'un bloc au service en ligne.

export type EtatDictee = "repos" | "enregistrement" | "transcription";

export interface Dictee {
  etat: EtatDictee;
  secondes: number;
  /** Vrai quand la dictée se transcrit sur cet ordinateur ; inconnu tant qu'on n'a pas regardé. */
  ici: boolean | null;
  /** Ouvre le micro. Renvoie l'erreur à afficher, ou null si tout va bien. */
  demarrer: () => Promise<string | null>;
  /** Ferme le micro et renvoie le texte transcrit (chaîne vide si échec). */
  arreter: () => Promise<{ texte: string; erreur: string | null }>;
  /** Relâche le micro sans transcrire. */
  annuler: () => void;
}

/** Un enregistrement, en base64 nu : ce que les commandes de transcription attendent. */
const enBase64 = (blob: Blob) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result).split(",")[1] ?? "");
  r.onerror = () => rej(new Error("Lecture de l'enregistrement impossible."));
  r.readAsDataURL(blob);
});

/** Ce qu'on écrit à la place d'une phrase que le moteur n'a pas su transcrire : l'enseignant voit qu'il en manque une. */
export const LACUNE = "[…]";

/**
 * Le texte d'une dictée transcrite phrase à phrase : les phrases remises
 * bout à bout, une lacune là où le moteur a échoué. Si rien n'a pu être
 * écrit, c'est l'erreur qu'on rend — pas un texte fait de lacunes.
 */
export function texteDeLaDictee(morceaux: string[], echec: string | null): { texte: string; erreur: string | null } {
  const dits = morceaux.map((m) => m.trim()).filter(Boolean);
  if (dits.every((m) => m === LACUNE)) return { texte: "", erreur: dits.length ? echec ?? "Transcription impossible." : null };
  return { texte: dits.join(" "), erreur: null };
}

/** Une dictée au micro ; `usage` dit quel réglage de transcription la commande. */
export function useDictee(usage: Usage = "dictees"): Dictee {
  const [etat, setEtat] = React.useState<EtatDictee>("repos");
  const [secondes, setSecondes] = React.useState(0);
  const [ici, setIci] = React.useState<boolean | null>(null);

  // ── En ligne : l'enregistreur du navigateur, d'un bloc ──
  const recRef = React.useRef<MediaRecorder | null>(null);
  const morceaux = React.useRef<Blob[]>([]);
  const fluxRef = React.useRef<MediaStream | null>(null);
  const minuteur = React.useRef<number | null>(null);

  // ── Sur cet ordinateur : phrase après phrase ──
  /** La dictée locale en cours ; zéro quand il n'y en a pas. Une tranche d'une dictée abandonnée ne compte plus. */
  const seance = React.useRef(0);
  const enCours = React.useRef(0);
  const textes = React.useRef<string[]>([]);
  const echec = React.useRef<string | null>(null);
  /** Le modèle choisi au départ : une dictée ne change pas de modèle en cours de route. */
  const modele = React.useRef("");
  /** Les transcriptions se suivent : le moteur n'en mène qu'une à la fois, et le texte garde l'ordre de la parole. */
  const fil = React.useRef<Promise<void>>(Promise.resolve());
  const { demarrer: ecouter, arreter: cesser, secondes: secondesEcoutees } = useEcoute({
    minimumParole: paroleMinimale("local"),
    plafond: plafondDuMorceau("local"),
    onTranche: (t) => {
      const moi = enCours.current;
      if (!moi) return;
      const rang = textes.current.push("") - 1;
      fil.current = fil.current.then(async () => {
        if (enCours.current !== moi) return;
        try {
          const texte = await api.transcrireLocal(await enBase64(t.blob), modele.current);
          if (enCours.current === moi) textes.current[rang] = texte;
        } catch (e) {
          if (enCours.current !== moi) return;
          textes.current[rang] = LACUNE;
          echec.current = String((e as Error)?.message ?? e);
        }
      });
    },
  });

  const liberer = React.useCallback(() => {
    if (minuteur.current) { window.clearInterval(minuteur.current); minuteur.current = null; }
    fluxRef.current?.getTracks().forEach((t) => t.stop());
    fluxRef.current = null;
    recRef.current = null;
  }, []);

  // Le micro doit être relâché même si l'écran se ferme en cours
  // d'enregistrement : sinon la pastille reste allumée dans la barre système.
  // (L'écoute locale relâche le sien de son côté.)
  React.useEffect(() => () => { enCours.current = 0; liberer(); }, [liberer]);

  // Ce que l'écran peut dire avant même qu'on parle : l'audio sortira-t-il ?
  React.useEffect(() => {
    let vivant = true;
    void choixIci(usage).then((m) => { if (vivant) setIci("moteur" in m && m.moteur === "local"); });
    return () => { vivant = false; };
  }, [usage]);

  const demarrer = React.useCallback(async () => {
    const choix = await choixIci(usage);
    if ("erreur" in choix) return choix.erreur;
    setIci(choix.moteur === "local");
    if (choix.moteur === "local") {
      modele.current = choix.modele;
      enCours.current = ++seance.current;
      textes.current = [];
      echec.current = null;
      fil.current = Promise.resolve();
      const erreur = await ecouter();
      if (erreur) { enCours.current = 0; return erreur; }
      setEtat("enregistrement");
      return null;
    }
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
  }, [liberer, ecouter, usage]);

  const arreter = React.useCallback(async () => {
    if (enCours.current) {
      setEtat("transcription");
      // Clôt la dernière phrase, relâche le micro ; puis on attend que tout soit écrit.
      cesser();
      await fil.current;
      // Une phrase perdue sur dix ne fait pas perdre les neuf autres : elle laisse une lacune.
      const rendu = texteDeLaDictee(textes.current, echec.current);
      enCours.current = 0;
      setEtat("repos");
      return rendu;
    }
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
      const texte = await api.transcrireAudio(await enBase64(blob), "dictee.webm");
      return { texte, erreur: null };
    } catch (e) {
      return { texte: "", erreur: String((e as Error)?.message ?? e) };
    } finally {
      setEtat("repos");
    }
  }, [liberer, cesser]);

  const annuler = React.useCallback(() => {
    if (enCours.current) {
      // D'abord oublier la dictée : la tranche que l'arrêt clôt ne sera pas transcrite.
      enCours.current = 0;
      cesser();
    }
    liberer();
    setEtat("repos");
  }, [liberer, cesser]);

  return { etat, secondes: enCours.current ? secondesEcoutees : secondes, ici, demarrer, arreter, annuler };
}

/** Durée d'enregistrement au format m:ss. */
export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
