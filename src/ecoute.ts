import React from "react";
import { fautIlCouper, versWav } from "./audioWav";
import { contraintesDuMicro, nouvellePriseDeSon, traiterLaTrame } from "./priseDeSon";

// ── Écouter, et écrire au rythme de la parole ─────────────────────────────
//
// La dictée (voir `dictee.ts`) enregistre d'un bloc et transcrit à la fin :
// pour une réunion d'une heure, il faudrait attendre la fin pour avoir la
// moindre ligne.
//
// Découper toutes les N secondes ne suffit pas non plus : la première ligne
// arrive au bout de N secondes, et la coupe tombe au milieu d'un mot. On
// écoute donc le son lui-même, et l'on coupe **quand la personne se tait**.
// Le texte arrive alors à la fin de chaque phrase, et chaque morceau est une
// phrase entière — ce qui se transcrit mieux.
//
// Un plafond reste, pour qui parle sans respirer : au-delà, on coupe quand
// même, sinon rien n'arriverait.
//
// Les échantillons sont pris au vol et le fichier WAV écrit ici : c'est le
// seul format que lit un moteur local, et le service en ligne l'accepte
// aussi. L'audio ne touche jamais le disque de ce côté-ci.
//
// Le micro s'ouvre sans le traitement d'un appel vidéo, qui prenait un
// chuchotement pour du bruit ; chaque trame passe par la prise de son (voir
// priseDeSon.ts) : filtrée, ramenée au niveau d'une voix, et c'est elle qui
// dit si l'on parle — d'après le bruit de la pièce, non plus un seuil fixe.

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
  /**
   * Ouvre le micro — `micro`, s'il est choisi et branché, sinon celui du
   * système. `depuis` reprend le compte là où la réunion s'était arrêtée,
   * pour que les horodatages suivent au lieu de repartir de zéro. Renvoie
   * l'erreur à afficher, ou null.
   */
  demarrer: (depuis?: number, micro?: string) => Promise<string | null>;
  /** Le niveau du son entendu, de 0 à 1, à la dernière trame : de quoi le montrer. */
  niveau: React.MutableRefObject<number>;
  /**
   * Depuis l'ouverture du micro : les secondes de parole, et celles du silence en cours — de quoi savoir qu'une
   * question est finie, même chuchotée (voir conversationVocale.ts).
   */
  activite: React.MutableRefObject<{ parole: number; silence: number }>;
  /** Coupe la tranche en cours sans attendre le silence. */
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
export const MINIMUM_S = 1;

export function useEcoute({ onTranche, onTrame, minimumParole = 2, plafond = 15 }: {
  onTranche: (t: TrancheAudio) => void;
  /** Chaque trame du micro, au fil de la parole, et le taux de son contexte : le direct de Voxtral la prend (voir voxtralDirect.ts). */
  onTrame?: (trame: Float32Array, taux: number) => void;
  /** Secondes de parole en dessous desquelles on ne coupe pas. */
  minimumParole?: number;
  /** Secondes après lesquelles on coupe même en pleine phrase. */
  plafond?: number;
}): Ecoute {
  const [etat, setEtat] = React.useState<EtatEcoute>("repos");
  const [secondes, setSecondes] = React.useState(0);

  const flux = React.useRef<MediaStream | null>(null);
  const contexte = React.useRef<AudioContext | null>(null);
  const capteur = React.useRef<ScriptProcessorNode | null>(null);
  const minuteur = React.useRef<number | null>(null);
  const enPause = React.useRef(false);
  const prise = React.useRef(nouvellePriseDeSon());
  const niveau = React.useRef(0);
  const activite = React.useRef({ parole: 0, silence: 0 });

  // Ce qui s'accumule dans la tranche en cours.
  const morceaux = React.useRef<Float32Array[]>([]);
  const parole = React.useRef(0);
  const silence = React.useRef(0);
  const duree = React.useRef(0);
  const debutTranche = React.useRef(0);
  const total = React.useRef(0);

  const reglage = React.useRef({ minimumParole, plafond });
  reglage.current = { minimumParole, plafond };
  // Le rappel change à chaque rendu ; la capture, elle, vit plus longtemps.
  const rappel = React.useRef(onTranche);
  rappel.current = onTranche;
  const rappelTrame = React.useRef(onTrame);
  rappelTrame.current = onTrame;

  /** Ferme la tranche en cours et la remet au rappel, si elle dit quelque chose. */
  const clore = React.useCallback(() => {
    const ctx = contexte.current;
    const tranche = morceaux.current;
    const parlee = parole.current;
    const longueur = duree.current;
    morceaux.current = [];
    parole.current = 0;
    silence.current = 0;
    duree.current = 0;
    const debut = debutTranche.current;
    debutTranche.current = total.current;
    // Une salle qui se tait ne mérite ni un appel au moteur ni une ligne
    // « [BLANK_AUDIO] » dans le compte rendu.
    if (!ctx || !tranche.length || parlee <= 0 || longueur < MINIMUM_S) return;
    const total_echantillons = tranche.reduce((n, m) => n + m.length, 0);
    const tout = new Float32Array(total_echantillons);
    let pos = 0;
    for (const m of tranche) { tout.set(m, pos); pos += m.length; }
    rappel.current({ blob: versWav(tout, ctx.sampleRate), debut, fin: debut + longueur });
  }, []);

  /** Ouvre la capture sur le micro déjà ouvert. */
  const ouvrirCapture = React.useCallback(() => {
    const f = flux.current;
    if (!f || capteur.current) return;
    const ctx = new AudioContext();
    contexte.current = ctx;
    const source = ctx.createMediaStreamSource(f);
    const noeud = ctx.createScriptProcessor(4096, 1, 1);
    prise.current = nouvellePriseDeSon();
    noeud.onaudioprocess = (e) => {
      if (enPause.current) { niveau.current = 0; return; }
      // La trame telle que le moteur doit l'entendre : filtrée, ramenée au niveau d'une voix, même chuchotée.
      const { sortie: trame, parole: onParle, niveau: n } = traiterLaTrame(prise.current, e.inputBuffer.getChannelData(0), ctx.sampleRate);
      niveau.current = n;
      const secondesTrame = trame.length / ctx.sampleRate;
      rappelTrame.current?.(trame, ctx.sampleRate);
      morceaux.current.push(trame);
      duree.current += secondesTrame;
      if (!onParle) {
        silence.current += secondesTrame;
        activite.current.silence += secondesTrame;
      } else {
        parole.current += secondesTrame;
        silence.current = 0;
        activite.current = { parole: activite.current.parole + secondesTrame, silence: 0 };
      }
      if (fautIlCouper({
        parole: parole.current, silence: silence.current, total: duree.current,
        minimum: reglage.current.minimumParole, plafond: reglage.current.plafond,
      })) {
        clore();
      }
    };
    // Un nœud de capture ne tourne que s'il est branché à la sortie ; un gain
    // à zéro évite d'entendre la salle dans les haut-parleurs — et le larsen
    // qui suivrait.
    const muet = ctx.createGain();
    muet.gain.value = 0;
    source.connect(noeud);
    noeud.connect(muet);
    muet.connect(ctx.destination);
    capteur.current = noeud;
    morceaux.current = [];
    parole.current = 0;
    silence.current = 0;
    duree.current = 0;
  }, [clore]);

  const couper = React.useCallback(() => {
    if (!capteur.current) return;
    clore();
  }, [clore]);

  /** Le compteur de la réunion : il ne sert qu'à l'affichage. */
  const lancerLeCompteur = React.useCallback(() => {
    if (minuteur.current) window.clearInterval(minuteur.current);
    minuteur.current = window.setInterval(() => {
      total.current += 1;
      setSecondes(total.current);
    }, 1000);
  }, []);

  const arreterLeCompteur = React.useCallback(() => {
    if (minuteur.current) { window.clearInterval(minuteur.current); minuteur.current = null; }
  }, []);

  const fermerCapture = () => {
    niveau.current = 0;
    capteur.current?.disconnect();
    capteur.current = null;
    contexte.current?.close().catch(() => {});
    contexte.current = null;
    morceaux.current = [];
  };

  const liberer = React.useCallback(() => {
    arreterLeCompteur();
    fermerCapture();
    flux.current?.getTracks().forEach((t) => t.stop());
    flux.current = null;
  }, [arreterLeCompteur]);

  // Le micro doit être relâché même si l'on quitte l'écran en pleine réunion :
  // sinon la pastille rouge reste allumée dans la barre système.
  React.useEffect(() => () => {
    arreterLeCompteur();
    capteur.current?.disconnect();
    contexte.current?.close().catch(() => {});
    flux.current?.getTracks().forEach((t) => t.stop());
  }, [arreterLeCompteur]);

  const demarrer = React.useCallback(async (depuis = 0, micro?: string) => {
    try {
      // Le micro choisi ; débranché depuis, celui du système plutôt que rien.
      flux.current = await navigator.mediaDevices.getUserMedia({ audio: contraintesDuMicro(micro) })
        .catch((e) => {
          if (!micro || /denied|NotAllowed/i.test(String((e as Error)?.message ?? e) + String((e as Error)?.name ?? ""))) throw e;
          return navigator.mediaDevices.getUserMedia({ audio: contraintesDuMicro() });
        });
      enPause.current = false;
      activite.current = { parole: 0, silence: 0 };
      total.current = depuis;
      debutTranche.current = depuis;
      setSecondes(depuis);
      ouvrirCapture();
      lancerLeCompteur();
      setEtat("ecoute");
      return null;
    } catch (e) {
      liberer();
      setEtat("repos");
      return messageMicro(e);
    }
  }, [ouvrirCapture, lancerLeCompteur, liberer]);

  const pause = React.useCallback(() => {
    if (!capteur.current) return;
    arreterLeCompteur();
    enPause.current = true;
    setEtat("pause");
  }, [arreterLeCompteur]);

  const reprendre = React.useCallback(() => {
    if (!capteur.current) return;
    enPause.current = false;
    lancerLeCompteur();
    setEtat("ecoute");
  }, [lancerLeCompteur]);

  const arreter = React.useCallback(() => {
    arreterLeCompteur();
    enPause.current = false;
    clore();
    liberer();
    setEtat("repos");
  }, [arreterLeCompteur, clore, liberer]);

  return { etat, secondes, demarrer, couper, pause, reprendre, arreter, niveau, activite };
}
