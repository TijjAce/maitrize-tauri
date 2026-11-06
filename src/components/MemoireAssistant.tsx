// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import React from "react";
import { api, newId } from "../api";
import {
  CLE_MEMOIRE_COUPEE, LONGUEUR_MAX_SOUVENIR, MEMOIRE_MAX, chargerMemoire, effacerSouvenir, garderSouvenir, memoireCoupee, type Souvenir,
} from "../memoireAssistant";
import { Aide } from "./Aide";
import { confirmer } from "./confirmer";
import { toastAnnulable } from "./Toaster";
import { Modal } from "./ui";

// ── Assistant IA › 🧠 Mémoire ─────────────────────────────────────────────
//
// Ce que l'Assistant retient de ce que l'enseignant lui dit (memoireAssistant.ts),
// tel qu'il le garde : chaque souvenir se lit, se corrige, s'oublie ; d'où il
// vient se lit sous son « ? ». On en ajoute un à la main ; on coupe la mémoire.
// Chaque oubli, chaque correction se défait (« Annuler », ⌘Z).

const dateCourte = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};

export function MemoireAssistant({ onClose }: { onClose: () => void }) {
  const [souvenirs, setSouvenirs] = React.useState<Souvenir[] | null>(null);
  const [coupee, setCoupee] = React.useState(false);
  const [enEdition, setEnEdition] = React.useState<string | null>(null);
  const [nouveau, setNouveau] = React.useState("");

  const recharger = React.useCallback(async () => {
    const [liste, c] = await Promise.all([chargerMemoire(), memoireCoupee()]);
    setSouvenirs(liste);
    setCoupee(c);
  }, []);
  React.useEffect(() => { void recharger(); }, [recharger]);

  const basculer = async () => {
    await api.settingSet(CLE_MEMOIRE_COUPEE, coupee ? "" : "1");
    setCoupee(!coupee);
  };

  const oublier = async (s: Souvenir) => {
    await effacerSouvenir(s.id);
    await recharger();
    toastAnnulable(`Oublié : « ${s.texte} »`, async () => { await garderSouvenir(s); await recharger(); }, "🧠");
  };

  const corriger = async (s: Souvenir, brut: string) => {
    setEnEdition(null);
    const texte = brut.trim().replace(/\s+/g, " ").slice(0, LONGUEUR_MAX_SOUVENIR);
    if (!texte || texte === s.texte) return;
    const maintenant = new Date().toISOString();
    const historique = [...(s.historique ?? []), { texte: s.texte, jusquau: maintenant }].slice(-5);
    await garderSouvenir({ ...s, texte, modifieLe: maintenant, historique });
    await recharger();
    toastAnnulable(`Corrigé : « ${texte} »`, async () => { await garderSouvenir(s); await recharger(); }, "🧠");
  };

  const ajouter = async () => {
    const texte = nouveau.trim().replace(/\s+/g, " ").slice(0, LONGUEUR_MAX_SOUVENIR);
    if (!texte || (souvenirs?.length ?? 0) >= MEMOIRE_MAX) return;
    const maintenant = new Date().toISOString();
    // Écrit par l'enseignant : ses mots sont leur propre source.
    const s: Souvenir = { id: newId(), texte, citation: texte, creeLe: maintenant, modifieLe: maintenant };
    await garderSouvenir(s);
    setNouveau("");
    await recharger();
  };

  const toutOublier = async () => {
    const avant = souvenirs ?? [];
    if (!avant.length) return;
    if (!(await confirmer(`Oublier ${avant.length === 1 ? "le souvenir" : `les ${avant.length} souvenirs`} de l'Assistant ?`, { oui: "Tout oublier", danger: true }))) return;
    for (const s of avant) await effacerSouvenir(s.id);
    await recharger();
    toastAnnulable(`${avant.length === 1 ? "Un souvenir oublié" : `${avant.length} souvenirs oubliés`}.`, async () => {
      for (const s of avant) await garderSouvenir(s);
      await recharger();
    }, "🧠");
  };

  return (
    <Modal titre="🧠 La mémoire de l'Assistant" onClose={onClose}
      footer={souvenirs?.length ? <button className="btn ghost sm danger" onClick={() => { void toutOublier(); }}>Tout oublier</button> : undefined}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <button className="btn sm" aria-pressed={!coupee} onClick={() => { void basculer(); }}>
          Retenir ce que je dis&nbsp;: {coupee ? "non" : "oui"}</button>
        <Aide titre="La mémoire de l'Assistant" vers="droite">
          <p>Après chaque message où vous parlez de vous, de votre classe ou de ce que vous attendez de ses réponses, l'Assistant
            relève ce qui mérite d'être retenu, et s'en sert dans vos conversations suivantes. Dites-lui « retiens que… » ou
            « oublie que… » : il le fait.</p>
          <p>Il ne garde un souvenir que si vos mots le justifient, et jamais rien sur un élève en particulier : ni son nom, ni sa
            santé, ni sa famille. Les souvenirs partent chez Mistral masqués, comme la conversation.</p>
          <p>Coupée, la mémoire ne retient plus rien et ne sert plus ; ce qu'elle a gardé reste ici.</p>
        </Aide>
      </div>

      {souvenirs === null ? null : souvenirs.length === 0
        ? <p className="meta" style={{ margin: "4px 0 12px" }}>Rien encore.</p>
        : (
          <ul style={{ listStyle: "none", margin: "0 0 12px", padding: 0, display: "grid", gap: 6, opacity: coupee ? 0.55 : 1 }}>
            {souvenirs.map((s) => (
              <li key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, background: "var(--bg)" }}>
                {enEdition === s.id
                  ? <input className="input" autoFocus defaultValue={s.texte} maxLength={LONGUEUR_MAX_SOUVENIR} aria-label="Corriger le souvenir"
                      style={{ flex: 1, padding: "4px 8px", fontSize: 13 }}
                      onBlur={(e) => { void corriger(s, e.target.value); }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        if (e.key === "Escape") { e.stopPropagation(); setEnEdition(null); }
                      }} />
                  : <button className="btn ghost sm" style={{ flex: 1, justifyContent: "flex-start", textAlign: "left", whiteSpace: "normal", fontSize: 13 }}
                      title="Corriger" onClick={() => setEnEdition(s.id)}>{s.texte}</button>}
                <span className="meta" style={{ fontSize: 11, whiteSpace: "nowrap" }}>{dateCourte(s.modifieLe)}</span>
                <Aide titre="D'où vient ce souvenir">
                  {s.citation && s.citation !== s.texte
                    ? <p>D'après vos mots : « {s.citation} »</p>
                    : <p>Écrit par vous.</p>}
                  {!!s.historique?.length && (
                    <p>Avant : {s.historique.map((h) => `« ${h.texte} »`).join(", puis ")}.</p>
                  )}
                </Aide>
                <button className="btn ghost sm" aria-label={`Oublier « ${s.texte} »`} title="Oublier" onClick={() => { void oublier(s); }}>🗑</button>
              </li>
            ))}
          </ul>
        )}

      <div style={{ display: "flex", gap: 8 }}>
        <input className="input" value={nouveau} maxLength={LONGUEUR_MAX_SOUVENIR} placeholder="Ce que l'Assistant doit retenir…"
          aria-label="Un souvenir à ajouter" style={{ flex: 1 }}
          onChange={(e) => setNouveau(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void ajouter(); }} />
        <button className="btn sm" disabled={!nouveau.trim()} onClick={() => { void ajouter(); }}>Retenir</button>
      </div>
    </Modal>
  );
}
