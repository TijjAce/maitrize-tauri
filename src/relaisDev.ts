// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// ── Le relais de développement, côté navigateur ───────────────────────────
//
// Voir vite.relaisDev.mjs. Deux rôles, en développement seulement :
//   — dans la fenêtre Maitrize du Mac, faire les demandes venues d'un autre
//     ordinateur comme les siennes, et lui renvoyer réponses et événements ;
//   — dans le navigateur de l'autre ordinateur, ouvert avec `?relais=<clé>`,
//     tenir lieu du pont de Tauri : chaque demande part au Mac, chaque
//     événement écouté en revient.
// Ce module est le premier que charge main.tsx : le pont est en place avant
// la moindre demande. Dans l'application publiée, `import.meta.env.DEV` est
// faux, et il n'en reste rien.

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

type Octets = { __octets__: string; genre: string };

const TABLEAUX: Record<string, new (b: ArrayBuffer) => ArrayBufferView> = {
  Uint8Array, Int8Array, Uint8ClampedArray, Uint16Array, Int16Array, Uint32Array, Int32Array, Float32Array, Float64Array,
};

const enBase64 = (o: Uint8Array) => {
  let texte = "";
  for (let i = 0; i < o.length; i += 0x8000) texte += String.fromCharCode(...o.subarray(i, i + 0x8000));
  return btoa(texte);
};
const deBase64 = (b: string) => Uint8Array.from(atob(b), (c) => c.charCodeAt(0));

/** Ce qui passe par le relais, en JSON : les octets — ArrayBuffer, Uint8Array… — en base64, marqués de leur genre. */
export function emballer(v: unknown): unknown {
  if (v instanceof ArrayBuffer) return { __octets__: enBase64(new Uint8Array(v)), genre: "ArrayBuffer" } satisfies Octets;
  if (ArrayBuffer.isView(v)) {
    return { __octets__: enBase64(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)), genre: v.constructor.name } satisfies Octets;
  }
  if (Array.isArray(v)) return v.map(emballer);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, emballer(x)]));
  return v;
}

/** L'inverse d'`emballer`, à l'arrivée. */
export function deballer(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(deballer);
  if (v && typeof v === "object") {
    const o = v as Partial<Octets>;
    if (typeof o.__octets__ === "string" && typeof o.genre === "string") {
      const octets = deBase64(o.__octets__);
      const buffer = octets.buffer.slice(octets.byteOffset, octets.byteOffset + octets.byteLength) as ArrayBuffer;
      return o.genre === "ArrayBuffer" ? buffer : new (TABLEAUX[o.genre] ?? Uint8Array)(buffer);
    }
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deballer(x)]));
  }
  return v;
}

let invite = false;
/**
 * Ce navigateur est-il l'invité du relais, sur un autre ordinateur ? Les
 * tâches de fond — relèves, transcriptions, copie du bureau, mises à jour —
 * restent alors à la fenêtre du Mac : elles ne tournent pas deux fois.
 */
export const estInviteDuRelais = (): boolean => invite;

const poster = (chemin: string, corps: unknown, enTetes: Record<string, string> = {}) =>
  fetch(`/__relais${chemin}`, { method: "POST", headers: { "Content-Type": "application/json", ...enTetes }, body: JSON.stringify(corps) });

/** La fenêtre du Mac : elle fait les demandes des invités, et leur renvoie les événements qu'ils écoutent. */
function devenirLaFenetre() {
  const ecoutes = new Map<string, () => void>();
  const flux = new EventSource("/__relais/hote");
  // Vite relancé, la fenêtre se reconnecte : le relais lui redit alors les écoutes en cours.
  flux.onopen = () => { for (const arret of ecoutes.values()) arret(); ecoutes.clear(); };
  flux.onmessage = (e) => {
    const m = JSON.parse(e.data) as { type: string; id?: number; cmd?: string; args?: unknown; cle?: string; evenement?: string };
    if (m.type === "appel" && m.cmd) {
      invoke(m.cmd, deballer(m.args) as Record<string, unknown>).then(
        (valeur) => poster("/hote/reponse", { id: m.id, ok: true, valeur: emballer(valeur) }),
        (erreur) => poster("/hote/reponse", { id: m.id, ok: false, erreur: emballer(erreur instanceof Error ? erreur.message : erreur) }),
      ).catch(() => undefined);
    } else if (m.type === "ecouter" && m.cle && m.evenement && !ecoutes.has(m.cle)) {
      const cle = m.cle;
      ecoutes.set(cle, () => undefined);
      void listen(m.evenement, (ev) => {
        void poster("/hote/evenement", { cle, evenement: emballer({ event: ev.event, payload: ev.payload }) }).catch(() => undefined);
      }).then((arret) => { if (ecoutes.has(cle)) ecoutes.set(cle, arret); else arret(); });
    } else if (m.type === "oublier" && m.cle) {
      ecoutes.get(m.cle)?.();
      ecoutes.delete(m.cle);
    }
  };
}

/** Un mot en haut de la page de l'invité, quand ses demandes attendent le Mac ; aucun sinon. */
function bandeau(texte: string | null) {
  let el = document.getElementById("relais-bandeau");
  if (!texte) { el?.remove(); return; }
  if (!el) {
    el = document.createElement("div");
    el.id = "relais-bandeau";
    el.setAttribute("role", "status");
    Object.assign(el.style, {
      position: "fixed", top: "0", left: "50%", transform: "translateX(-50%)", zIndex: "2147483647", padding: "6px 14px",
      borderRadius: "0 0 10px 10px", background: "#b45309", color: "#fff", font: "600 13px system-ui, sans-serif",
    });
    document.body.appendChild(el);
  }
  el.textContent = texte;
}

/** Le navigateur d'un autre ordinateur : le pont de Tauri, dont chaque demande part au Mac. */
function devenirInvite(cle: string) {
  invite = true;
  const enTetes = { "X-Relais-Cle": cle };
  const rappels = new Map<number, (x: unknown) => void>();
  const ecoutes = new Map<number, { evenement: string; rappel: number }>();
  let numero = 0;
  let nom = "";
  let hote = true;
  let quandLeMacRevient: (() => void)[] = [];
  const leMac = (present: boolean) => {
    hote = present;
    bandeau(present ? null : "Maitrize n'est pas ouvert sur le Mac : les demandes attendent.");
    if (present) { for (const f of quandLeMacRevient) f(); quandLeMacRevient = []; }
  };
  const souscrire = (id: number, evenement: string) =>
    nom ? poster("/ecouter", { invite: nom, cle: `${nom}:${id}`, evenement }, enTetes).catch(() => undefined) : undefined;

  const flux = new EventSource(`/__relais/evenements?cle=${encodeURIComponent(cle)}`);
  flux.onmessage = (e) => {
    const m = JSON.parse(e.data) as { type: string; invite?: string; hote?: boolean; present?: boolean; cle?: string; evenement?: unknown };
    if (m.type === "bonjour" && m.invite) {
      // Une nouvelle connexion, un nouveau nom : les écoutes se redemandent.
      nom = m.invite;
      leMac(Boolean(m.hote));
      for (const [id, x] of ecoutes) void souscrire(id, x.evenement);
    } else if (m.type === "hote") leMac(Boolean(m.present));
    else if (m.type === "evenement" && m.cle) {
      const id = Number(m.cle.split(":")[1]);
      const x = ecoutes.get(id);
      if (x) rappels.get(x.rappel)?.({ ...(deballer(m.evenement) as object), id });
    }
  };

  const appeler = async (cmd: string, args: unknown): Promise<unknown> => {
    for (;;) {
      if (!hote) await new Promise<void>((ok) => quandLeMacRevient.push(ok));
      const r = await fetch("/__relais/appel", {
        method: "POST", headers: { "Content-Type": "application/json", ...enTetes }, body: JSON.stringify({ cmd, args: emballer(args) }),
      });
      const corps = (await r.json().catch(() => ({ ok: false, erreur: `Relais : ${r.status}` }))) as {
        ok: boolean; valeur?: unknown; erreur?: unknown; hote?: boolean; envoye?: boolean;
      };
      // Le Mac n'avait pas la fenêtre ouverte : la demande n'est pas partie, elle attend son retour.
      if (r.status === 503 && corps.envoye === false) { leMac(false); continue; }
      if (r.status === 403) bandeau("Clé du relais refusée : rouvrez l'adresse donnée au lancement de tauri dev.");
      if (corps.ok) return deballer(corps.valeur);
      throw deballer(corps.erreur);
    }
  };

  const fenetre = window as unknown as Record<string, unknown>;
  fenetre.__TAURI_INTERNALS__ = {
    invoke: (cmd: string, args: Record<string, unknown> = {}) => {
      if (cmd === "plugin:event|listen") {
        const id = ++numero;
        ecoutes.set(id, { evenement: String(args.event), rappel: Number(args.handler) });
        void souscrire(id, String(args.event));
        return Promise.resolve(id);
      }
      if (cmd === "plugin:event|unlisten") {
        const id = Number(args.eventId);
        ecoutes.delete(id);
        if (nom) void poster("/oublier", { invite: nom, cle: `${nom}:${id}` }, enTetes).catch(() => undefined);
        return Promise.resolve();
      }
      return appeler(cmd, args);
    },
    transformCallback: (rappel?: (x: unknown) => void, unique = false) => {
      const id = ++numero;
      rappels.set(id, (x) => { if (unique) rappels.delete(id); rappel?.(x); });
      return id;
    },
    unregisterCallback: (id: number) => { rappels.delete(id); },
    convertFileSrc: (chemin: string) => chemin,
    metadata: { currentWindow: { label: "main" }, currentWebview: { windowLabel: "main", label: "main" } },
    plugins: {},
  };
  fenetre.__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener: (_evenement: string, id: number) => { ecoutes.delete(id); } };
}

const CLE_DE_SESSION = "maitrize:relais";

if (import.meta.env.DEV && import.meta.env.MODE !== "test") {
  if ((window as unknown as { isTauri?: boolean }).isTauri) devenirLaFenetre();
  else {
    const parametres = new URLSearchParams(location.search);
    let cle = parametres.get("relais");
    try {
      if (cle) sessionStorage.setItem(CLE_DE_SESSION, cle);
      else cle = sessionStorage.getItem(CLE_DE_SESSION);
    } catch { /* sans stockage : la clé de l'adresse seulement */ }
    if (cle) {
      // La clé quitte la barre d'adresse : elle reste pour cet onglet, le temps de la session.
      if (parametres.has("relais")) {
        parametres.delete("relais");
        const reste = parametres.toString();
        history.replaceState(null, "", `${location.pathname}${reste ? `?${reste}` : ""}${location.hash}`);
      }
      devenirInvite(cle);
    }
  }
}
