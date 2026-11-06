// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import { describe, expect, it } from "vitest";
import { ADRESSE_DU_DIRECT, ADRESSE_DU_DIRECT_MONDIAL, ouvrirLeDirect, reechantillonner, versPcm16, type SocketDuDirect } from "./voxtralDirect";
import { aLaSuite } from "./dicteeEnDirect";

/** Un WebSocket d'essai : il garde ce qu'on lui envoie, et l'on joue Mistral à sa place. */
class FausseSocket implements SocketDuDirect {
  envoyes: { type: string; [k: string]: unknown }[] = [];
  ferme = false;
  onmessage: ((m: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public adresse: string, public protocoles: string[]) {}
  send(d: string) { this.envoyes.push(JSON.parse(d)); }
  close() { if (this.ferme) return; this.ferme = true; this.onclose?.(); }
  recevoir(ev: object) { this.onmessage?.({ data: JSON.stringify(ev) }); }
}
const tourDeBoucle = () => new Promise((r) => setTimeout(r, 0));
/** Un dixième de seconde de voix au taux d'un Mac : 4 800 échantillons à 48 kHz. */
const dixieme = () => new Float32Array(4800).fill(0.25);

function essai(jeton?: () => Promise<{ jeton: string; modele: string }>) {
  const sockets: FausseSocket[] = [];
  const textes: string[] = [];
  const pannes: string[] = [];
  let n = 0;
  const direct = ouvrirLeDirect({
    jeton: jeton ?? (async () => ({ jeton: `rt_${++n}`, modele: "voxtral-mini-transcribe-realtime-3" })),
    surTexte: (t) => textes.push(t),
    surPanne: (r) => pannes.push(r),
    creerSocket: (a, p) => { const s = new FausseSocket(a, p); sockets.push(s); return s; },
  });
  return { direct, sockets, textes, pannes };
}

describe("une réunion écrite en direct par Voxtral Realtime (demande de l'enseignant, 2026-11-02)", () => {
  it("s'ouvre avec un jeton d'écoute, règle la voix — 16 kHz, en français —, et l'envoie une fois prête", async () => {
    const { direct, sockets, textes, pannes } = essai();
    await tourDeBoucle();
    expect(sockets).toHaveLength(1);
    expect(sockets[0].adresse).toBe(`${ADRESSE_DU_DIRECT}?model=voxtral-mini-transcribe-realtime-3`);
    expect(sockets[0].protocoles).toEqual(["realtime", "rt_1"]);
    // Ce qui est dit avant que la liaison soit prête attend.
    direct.envoyer(dixieme(), 48000);
    expect(sockets[0].envoyes).toEqual([]);
    sockets[0].recevoir({ type: "session.created" });
    expect(sockets[0].envoyes[0]).toEqual({ type: "session.update", session: {
      audio_format: { encoding: "pcm_s16le", sample_rate: 16000 }, target_streaming_delay_ms: 480, language: "fr" } });
    // 1 600 échantillons de 16 bits : 3 200 octets.
    expect(sockets[0].envoyes[1].type).toBe("input_audio.append");
    expect(atob(String(sockets[0].envoyes[1].audio)).length).toBe(3200);
    sockets[0].recevoir({ type: "transcription.text.delta", text: "Bonjour" });
    sockets[0].recevoir({ type: "transcription.text.delta", text: " à tous" });
    expect(textes.join("")).toBe("Bonjour à tous");
    expect(pannes).toEqual([]);
  });

  it("rouvre une liaison tombée, avec un jeton neuf, à la voix suivante", async () => {
    const { direct, sockets, pannes } = essai();
    await tourDeBoucle();
    sockets[0].recevoir({ type: "session.created" });
    sockets[0].close(); // une longue réunion, un réseau qui hoquette
    direct.envoyer(dixieme(), 48000);
    await tourDeBoucle();
    expect(sockets).toHaveLength(2);
    expect(sockets[1].protocoles).toEqual(["realtime", "rt_2"]);
    // La voix dite pendant la reprise part dès que la nouvelle liaison est prête.
    sockets[1].recevoir({ type: "session.created" });
    expect(sockets[1].envoyes.map((e) => e.type)).toEqual(["session.update", "input_audio.append"]);
    expect(pannes).toEqual([]);
  });

  it("rend la main après trois échecs de suite : la réunion continue par passages", async () => {
    const { direct, sockets, pannes } = essai(async () => { throw new Error("Clé refusée"); });
    await tourDeBoucle();
    direct.envoyer(dixieme(), 48000); await tourDeBoucle();
    direct.envoyer(dixieme(), 48000); await tourDeBoucle();
    expect(pannes).toEqual(["Clé refusée"]);
    direct.envoyer(dixieme(), 48000); await tourDeBoucle();
    expect(sockets).toHaveLength(0);
    expect(pannes).toHaveLength(1);
  });

  it("compte pour un échec une liaison qui se ferme avant d'être prête", async () => {
    const { direct, sockets, pannes } = essai();
    for (let i = 0; i < 3; i++) {
      await tourDeBoucle();
      sockets[sockets.length - 1].recevoir({ type: "error", error: { message: "invalid token" } });
      direct.envoyer(dixieme(), 48000);
    }
    expect(pannes).toEqual(["Le direct de Mistral ne répond pas."]);
  });

  it("compte pour un échec une liaison prête puis refusée aussitôt, au lieu de la rouvrir sans fin", async () => {
    const { direct, sockets, pannes } = essai();
    for (let i = 0; i < 5; i++) {
      await tourDeBoucle();
      const s = sockets[sockets.length - 1];
      s.recevoir({ type: "session.created" });
      s.recevoir({ type: "error", error: { message: "diarize indisponible" } });
      direct.envoyer(dixieme(), 48000);
    }
    expect(sockets).toHaveLength(3);
    expect(pannes).toEqual(["Le direct de Mistral ne répond pas."]);
  });

  it("garde le compte à zéro tant qu'une liaison rend du texte avant de tomber", async () => {
    const { direct, sockets, pannes } = essai();
    for (let i = 0; i < 4; i++) {
      await tourDeBoucle();
      const s = sockets[sockets.length - 1];
      s.recevoir({ type: "session.created" });
      s.recevoir({ type: "transcription.text.delta", text: " mot" });
      s.close();
      direct.envoyer(dixieme(), 48000);
    }
    expect(sockets).toHaveLength(4);
    expect(pannes).toEqual([]);
  });

  it("à la fin, envoie le reste de la voix, attend les derniers mots, puis ferme", async () => {
    const { direct, sockets, textes } = essai();
    await tourDeBoucle();
    sockets[0].recevoir({ type: "session.created" });
    direct.envoyer(new Float32Array(480).fill(0.1), 48000); // trop peu pour partir seul
    const fin = direct.fermer();
    expect(sockets[0].envoyes.map((e) => e.type)).toEqual(["session.update", "input_audio.append", "input_audio.end"]);
    sockets[0].recevoir({ type: "transcription.text.delta", text: " Merci." });
    sockets[0].recevoir({ type: "transcription.done", text: "Merci." });
    await fin;
    expect(sockets[0].ferme).toBe(true);
    expect(textes.join("")).toBe(" Merci.");
    // Fermé, plus rien ne part.
    direct.envoyer(dixieme(), 48000);
    expect(sockets).toHaveLength(1);
  });

  it("reconnaît les voix sur demande : le texte arrive par tours de parole, chacun avec son intervenant", async () => {
    const sockets: FausseSocket[] = [];
    const tours: [string, string | null][] = [];
    ouvrirLeDirect({
      jeton: async () => ({ jeton: "rt_1", modele: "voxtral-mini-transcribe-realtime-3" }),
      surTexte: () => { throw new Error("pas de texte sans intervenant"); },
      diarize: true,
      surTour: (texte, qui) => tours.push([texte, qui]),
      surPanne: () => {},
      creerSocket: (a, p) => { const s = new FausseSocket(a, p); sockets.push(s); return s; },
    });
    await tourDeBoucle();
    sockets[0].recevoir({ type: "session.created" });
    expect(sockets[0].envoyes[0].session).toMatchObject({ diarize: true, language: "fr" });
    sockets[0].recevoir({ type: "transcription.segment", text: "Bonjour à tous.", start: null, end: null, speaker_id: "speaker_1" });
    sockets[0].recevoir({ type: "transcription.segment", text: "Bonjour !", start: null, end: null, speaker_id: "speaker_2" });
    expect(tours).toEqual([["Bonjour à tous.", "speaker_1"], ["Bonjour !", "speaker_2"]]);
  });

  it("se lie à l'adresse européenne, sauf la dictée de l'Assistant, qui part à l'adresse habituelle (2026-11-03)", async () => {
    expect(ADRESSE_DU_DIRECT).toMatch(/^wss:\/\/api\.eu\.mistral\.ai\//);
    expect(ADRESSE_DU_DIRECT_MONDIAL).toMatch(/^wss:\/\/api\.mistral\.ai\//);
    const sockets: FausseSocket[] = [];
    ouvrirLeDirect({
      jeton: async () => ({ jeton: "rt_a", modele: "voxtral-mini-transcribe-realtime-3" }),
      surTexte: () => {}, surPanne: () => {}, adresse: ADRESSE_DU_DIRECT_MONDIAL,
      creerSocket: (a, p) => { const s = new FausseSocket(a, p); sockets.push(s); return s; },
    });
    await tourDeBoucle();
    expect(sockets[0].adresse).toBe(`${ADRESSE_DU_DIRECT_MONDIAL}?model=voxtral-mini-transcribe-realtime-3`);
  });

  it("met les mots dictés à la suite de ce qui est écrit, un espace entre les deux s'il le faut", () => {
    expect(aLaSuite("", "Bonjour", true)).toBe("Bonjour");
    expect(aLaSuite("Une idée :", "Bonjour", true)).toBe("Une idée : Bonjour");
    expect(aLaSuite("Une idée : ", "Bonjour", true)).toBe("Une idée : Bonjour");
    // Ensuite, les mots de Voxtral portent leurs espaces.
    expect(aLaSuite("Bonjour", " à tous", false)).toBe("Bonjour à tous");
    expect(aLaSuite("Bonjour", "-là", false)).toBe("Bonjour-là");
  });

  it("ramène la voix à 16 kHz par moyenne, et l'écrit en 16 bits", () => {
    const rampe = Float32Array.from({ length: 48 }, (_, i) => i);
    expect(Array.from(reechantillonner(rampe, 48000))).toEqual(Array.from({ length: 16 }, (_, i) => 3 * i + 1));
    expect(reechantillonner(rampe, 16000)).toBe(rampe);
    expect(reechantillonner(new Float32Array(4410), 44100)).toHaveLength(1600);
    expect(Array.from(versPcm16(Float32Array.from([1, -1, 0, 2])))).toEqual([32767, -32768, 0, 32767]);
  });
});
