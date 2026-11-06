// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// ── Une réunion écrite en direct : Voxtral Realtime ────────────────────────
//
// Demande de l'enseignant (2026-11-02) : « branche sur réunion Mistral
// Realtime pour écrire ». En ligne, une réunion s'écrivait par passages :
// on coupait sur un silence, et le passage partait chez Mistral (Voxtral)
// pour revenir, entier, quelques secondes plus tard. En direct, la voix part
// au fil de la parole et les mots s'écrivent pendant qu'on parle.
//
// Le même chemin que la télécommande du téléphone (voir compagnon,
// dictaphone.js) : l'ordinateur demande à Mistral un jeton d'écoute
// (`mistral_jeton_temps_reel`, « rt_… »), le WebSocket s'ouvre avec lui — la
// clé ne sort jamais de Rust —, la voix part en PCM 16 bits à 16 kHz, et le
// texte revient par morceaux (`transcription.text.delta`). Un jeton n'ouvre
// qu'une liaison : une liaison tombée en reprend un autre. Trois échecs de
// suite, et le direct rend la main : la réunion continue par passages.
//
// Puis : « je veux de la reconnaissance de voix avec les personnages qui
// parlent, comme un tchat » (2026-11-02). Avec `diarize`, Voxtral reconnaît
// les voix : le texte arrive alors par tours de parole
// (`transcription.segment`), chacun avec son intervenant (« speaker_1 »…).
// La documentation prévient que ces noms ne valent que pour une liaison.

/** Le direct de Voxtral, à l'adresse européenne de Mistral (voir ai.rs, `MISTRAL`). */
export const ADRESSE_DU_DIRECT = "wss://api.eu.mistral.ai/v1/audio/transcriptions/realtime";
/**
 * Le direct à l'adresse habituelle de Mistral, hors garantie européenne : la seule qui l'offre. Seule la dictée
 * de l'Assistant IA s'en sert, sous son avertissement (voir dicteeEnDirect.ts, et `MISTRAL_MONDIAL` dans ai.rs).
 */
export const ADRESSE_DU_DIRECT_MONDIAL = "wss://api.mistral.ai/v1/audio/transcriptions/realtime";
/**
 * Le direct n'existe pas encore à l'adresse européenne : Mistral y répond
 * « introuvable » au jeton d'écoute, quel que soit le modèle (essayé le
 * 2 novembre 2026). Coupé, comme dans ai.rs : la voix s'écrit par passages.
 */
export const DIRECT_COUPE = true;
/** La voix comme Voxtral la veut : 16 000 échantillons par seconde. */
export const TAUX_DU_DIRECT = 16000;
/** Ce que Voxtral attend avant d'écrire : un demi-seconde, comme au téléphone. */
export const DELAI_DU_DIRECT_MS = 480;
/** Au-delà de trois échecs de suite, le direct rend la main. */
export const ECHECS_AVANT_PANNE = 3;
/** Ce qu'on garde de la voix pendant qu'une liaison se rouvre : une demi-minute, au plus. */
const ATTENTE_MAX = TAUX_DU_DIRECT * 30;
/** La voix part par dixièmes de seconde. */
const PAR_ENVOI = TAUX_DU_DIRECT / 10;
/** À la fin, ce qu'on attend des derniers mots. */
const ATTENTE_DE_LA_FIN_MS = 4000;
/** Ce qu'on laisse à une liaison pour s'ouvrir. */
const OUVERTURE_MAX_MS = 8000;
/** Une liaison prête qui n'a rien rendu compte quand même comme une réussite au-delà de ce temps : une salle silencieuse. */
const TENUE_MIN_MS = 10000;

/** Une trame de voix ramenée à `vers` échantillons par seconde, par moyenne : rien de la voix ne se perd sous 8 kHz. */
export function reechantillonner(trame: Float32Array, de: number, vers = TAUX_DU_DIRECT): Float32Array {
  if (de === vers) return trame;
  const n = Math.floor((trame.length * vers) / de);
  const sortie = new Float32Array(n);
  const pas = de / vers;
  for (let i = 0; i < n; i++) {
    const debut = Math.floor(i * pas), fin = Math.min(trame.length, Math.max(debut + 1, Math.floor((i + 1) * pas)));
    let somme = 0;
    for (let k = debut; k < fin; k++) somme += trame[k];
    sortie[i] = somme / (fin - debut);
  }
  return sortie;
}

/** De la voix en 16 bits, comme Voxtral la veut. */
export function versPcm16(trame: Float32Array): Int16Array {
  const pcm = new Int16Array(trame.length);
  for (let i = 0; i < trame.length; i++) {
    const v = Math.max(-1, Math.min(1, trame[i]));
    pcm[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  return pcm;
}

export function enBase64(octets: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < octets.length; i += 0x8000) bin += String.fromCharCode(...octets.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Ce qu'il faut d'un WebSocket : de quoi le remplacer dans les essais. */
export interface SocketDuDirect {
  send(donnees: string): void;
  close(): void;
  onmessage: ((m: { data: unknown }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
}

export interface OptionsDuDirect {
  /** Un jeton d'écoute neuf, à chaque liaison. */
  jeton: () => Promise<{ jeton: string; modele: string }>;
  /** Les mots qui arrivent, tels quels : avec leurs espaces. */
  surTexte: (morceau: string) => void;
  /** Reconnaître les voix : le texte arrive par tours de parole, chacun avec son intervenant. */
  diarize?: boolean;
  /** Un tour de parole et son intervenant (« speaker_1 »…), quand les voix sont reconnues. */
  surTour?: (texte: string, intervenant: string | null) => void;
  /** Le direct a lâché pour de bon : la réunion continue sans lui. */
  surPanne: (raison: string) => void;
  /** Où se lier : l'adresse européenne, sauf pour la dictée de l'Assistant (voir `ADRESSE_DU_DIRECT_MONDIAL`). */
  adresse?: string;
  creerSocket?: (adresse: string, protocoles: string[]) => SocketDuDirect;
}

export interface Direct {
  /** Une trame du micro, au taux de son contexte audio. */
  envoyer: (trame: Float32Array, taux: number) => void;
  /** La fin : le reste de la voix part, et les derniers mots arrivent — ou l'attente s'arrête. */
  fermer: () => Promise<void>;
}

/** Ouvre le direct ; la première liaison se fait tout de suite, la voix attend qu'elle soit prête. */
export function ouvrirLeDirect(o: OptionsDuDirect): Direct {
  const creer = o.creerSocket ?? ((adresse, protocoles) => new WebSocket(adresse, protocoles) as unknown as SocketDuDirect);
  let ws: SocketDuDirect | null = null;
  let pret = false;
  let enCours = false;
  let echecs = 0;
  let ferme = false;
  let enPanne = false;
  let enAttente: Int16Array[] = [];
  let attente = 0;
  let finDuTexte: (() => void) | null = null;

  const panne = (raison: string) => {
    if (enPanne || ferme) return;
    enPanne = true;
    enAttente = []; attente = 0;
    o.surPanne(raison);
  };

  /** La voix en attente part, par dixièmes de seconde — ou tout de suite, à la fin. */
  const vider = (toutDeSuite: boolean) => {
    if (!ws || !pret || attente === 0 || (!toutDeSuite && attente < PAR_ENVOI)) return;
    const pcm = new Int16Array(attente);
    let pos = 0;
    for (const b of enAttente) { pcm.set(b, pos); pos += b.length; }
    enAttente = []; attente = 0;
    try { ws.send(JSON.stringify({ type: "input_audio.append", audio: enBase64(new Uint8Array(pcm.buffer)) })); }
    catch { ws.close(); }
  };

  const lier = async () => {
    if (enCours || ferme || enPanne) return;
    enCours = true;
    let j: { jeton: string; modele: string };
    try { j = await o.jeton(); }
    catch (e) {
      enCours = false;
      if (++echecs >= ECHECS_AVANT_PANNE) panne(String((e as Error)?.message ?? e));
      return;
    }
    if (ferme) { enCours = false; return; }
    let s: SocketDuDirect;
    try { s = creer(`${o.adresse ?? ADRESSE_DU_DIRECT}?model=${encodeURIComponent(j.modele)}`, ["realtime", j.jeton]); }
    catch (e) {
      enCours = false;
      if (++echecs >= ECHECS_AVANT_PANNE) panne(String((e as Error)?.message ?? e));
      return;
    }
    ws = s;
    // Une liaison qui ne s'ouvre pas, sans même se fermer, compte pour un échec.
    const delai = setTimeout(() => { if (ws === s && !pret) s.close(); }, OUVERTURE_MAX_MS);
    // Prête, puis refusée aussitôt — une option que le modèle n'accepte pas — : un échec aussi. Elle ne compte comme
    // réussie qu'une fois du texte rendu, ou après avoir tenu un moment.
    let rendu = false;
    let preteA = 0;
    const reussie = () => { rendu = true; echecs = 0; };
    s.onmessage = (m) => {
      let ev: { type?: string; text?: string; speaker_id?: string | null };
      try { ev = JSON.parse(String(m.data)); } catch { return; }
      if (ev.type === "session.created") {
        clearTimeout(delai);
        s.send(JSON.stringify({ type: "session.update", session: {
          audio_format: { encoding: "pcm_s16le", sample_rate: TAUX_DU_DIRECT }, target_streaming_delay_ms: DELAI_DU_DIRECT_MS, language: "fr",
          ...(o.diarize ? { diarize: true } : {}),
        } }));
        pret = true; enCours = false; preteA = Date.now();
        vider(false);
      } else if (ev.type === "transcription.text.delta" && ev.text) {
        reussie();
        o.surTexte(ev.text);
      } else if (ev.type === "transcription.segment" && ev.text) {
        reussie();
        if (o.surTour) o.surTour(ev.text, ev.speaker_id ?? null);
        else o.surTexte(ev.text);
      } else if (ev.type === "transcription.done") {
        finDuTexte?.();
      } else if (ev.type === "error") {
        s.close();
      }
    };
    s.onerror = () => { s.close(); };
    s.onclose = () => {
      clearTimeout(delai);
      if (ws !== s) return;
      const aTenu = rendu || (preteA > 0 && Date.now() - preteA >= TENUE_MIN_MS);
      ws = null; pret = false; enCours = false;
      finDuTexte?.();
      if (ferme) return;
      // Une liaison qui n'a rien donné est un échec ; une liaison qui a tenu et se ferme (une longue réunion, un
      // réseau qui hoquette) se rouvre à la voix suivante.
      if (aTenu) echecs = 0;
      else if (++echecs >= ECHECS_AVANT_PANNE) panne("Le direct de Mistral ne répond pas.");
    };
  };

  void lier();

  return {
    envoyer(trame, taux) {
      if (ferme || enPanne || !trame.length) return;
      const pcm = versPcm16(reechantillonner(trame, taux));
      enAttente.push(pcm);
      attente += pcm.length;
      // Une liaison qui tarde à se rouvrir ne fait pas grossir la mémoire sans fin : on garde la voix la plus récente.
      while (attente > ATTENTE_MAX && enAttente.length > 1) attente -= enAttente.shift()!.length;
      if (!ws && !enCours) void lier();
      vider(false);
    },
    async fermer() {
      if (ferme) return;
      const s = ws;
      if (s && pret) {
        vider(true);
        const fin = new Promise<void>((resoudre) => { finDuTexte = resoudre; });
        try { s.send(JSON.stringify({ type: "input_audio.end" })); } catch { /* déjà fermé */ }
        await Promise.race([fin, new Promise<void>((r) => setTimeout(r, ATTENTE_DE_LA_FIN_MS))]);
      }
      ferme = true;
      enAttente = []; attente = 0;
      try { ws?.close(); } catch { /* déjà fermé */ }
      ws = null;
    },
  };
}
