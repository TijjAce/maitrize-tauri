// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// ── Le relais de développement ───────────────────────────────────────────
//
// Demande de l'enseignant (2026-11-02) : développer et se servir de Maitrize
// depuis son ordinateur Windows, capot du Mac fermé, sans le décalage d'un
// bureau à distance. Le navigateur de l'autre ordinateur dessine l'interface
// lui-même ; chaque demande à la partie Rust arrive ici, au serveur de
// développement que lance `tauri dev`, qui la passe à la fenêtre Maitrize du
// Mac. Elle la fait comme les siennes et renvoie la réponse, et les
// événements qu'il écoute (voir src/relaisDev.ts).
//
// On y arrive par Tailscale : `tailscale serve --bg 1420`, sur le Mac, donne
// une adresse HTTPS que seuls les appareils de l'enseignant ouvrent ; Vite
// n'écoute toujours que le Mac lui-même. Le navigateur se présente avec une
// clé, gardée dans ~/.config/maitrize/relais-dev.jeton ; l'adresse à ouvrir,
// `/?relais=<clé>`, s'écrit au lancement de `tauri dev`.
//
// En développement seulement : rien de ceci n'est dans l'application publiée.

import { randomBytes, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

/** Où la clé est gardée, d'un lancement à l'autre : le favori de l'autre ordinateur reste bon. */
export const CHEMIN_DE_LA_CLE = join(homedir(), ".config", "maitrize", "relais-dev.jeton");

/** La clé du relais : celle qui est gardée, sinon une neuve. Supprimer le fichier en fait tirer une autre. */
export function laCle(chemin = CHEMIN_DE_LA_CLE) {
  try {
    const cle = readFileSync(chemin, "utf8").trim();
    if (/^[0-9a-f]{48}$/.test(cle)) return cle;
  } catch { /* pas encore de clé */ }
  const cle = randomBytes(24).toString("hex");
  mkdirSync(dirname(chemin), { recursive: true, mode: 0o700 });
  writeFileSync(chemin, `${cle}\n`, { mode: 0o600 });
  return cle;
}

const memeCle = (donnee, cle) => {
  const a = Buffer.from(String(donnee ?? "")), b = Buffer.from(cle);
  return a.length === b.length && timingSafeEqual(a, b);
};

/**
 * La fenêtre Maitrize du Mac, et elle seule : une demande venue du Mac
 * lui-même, à l'adresse locale de Vite — ni relayée par Tailscale, ni lancée
 * par un autre site ouvert dans un navigateur du Mac.
 */
export function estLaFenetreDuMac(req, port) {
  const h = req.headers;
  const hote = String(h.host ?? "");
  const locale = [`localhost:${port}`, `127.0.0.1:${port}`, `[::1]:${port}`].includes(hote);
  const boucle = ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket?.remoteAddress ?? "");
  const relayee = Boolean(h["x-forwarded-for"] || h["x-forwarded-host"] || h["tailscale-user-login"]);
  const site = h["sec-fetch-site"];
  return locale && boucle && !relayee && (!h.origin || h.origin === `http://${hote}`) && (!site || site === "same-origin" || site === "none");
}

/**
 * Le relais, sur `/__relais` : la fenêtre du Mac d'un côté (`/hote`), les
 * navigateurs invités de l'autre (`/appel`, `/evenements`, `/ecouter`,
 * `/oublier`), par des flux d'événements serveur et de simples POST — rien à
 * installer. `port` : celui de Vite, à l'adresse duquel la fenêtre du Mac
 * appelle ; une fonction, s'il n'est connu qu'au démarrage.
 */
export function creerLeRelais(cle, { port = 1420, delaiMs = 10 * 60_000 } = {}) {
  /** Le flux de la fenêtre du Mac ; aucune : Maitrize n'y est pas ouvert. */
  let fenetre = null;
  const invites = new Map();
  /** Les appels partis à la fenêtre, par numéro : la réponse HTTP de l'invité qui attend. */
  const enAttente = new Map();
  /** Les événements que les invités écoutent, par clé d'écoute « invité:n° ». */
  const ecoutes = new Map();
  let numero = 0;

  const envoyer = (flux, message) => flux.write(`data: ${JSON.stringify(message)}\n\n`);
  const auxInvites = (message) => { for (const flux of invites.values()) envoyer(flux, message); };
  const repondre = (res, statut, corps) => {
    if (res.headersSent || res.writableEnded) return;
    if (corps === undefined) { res.writeHead(statut); res.end(); return; }
    res.writeHead(statut, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(JSON.stringify(corps));
  };
  const ouvrirLeFlux = (res) => {
    res.writeHead(200, { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store", Connection: "keep-alive", "X-Accel-Buffering": "no" });
    res.write(": ouvert\n\n");
    // Un flux muet trop longtemps, et un intermédiaire le couperait.
    const veille = setInterval(() => res.write(": veille\n\n"), 20_000);
    res.on("close", () => clearInterval(veille));
  };
  const lireLeCorps = (req) => new Promise((ok, ko) => {
    const morceaux = [];
    let taille = 0;
    req.on("data", (m) => {
      taille += m.length;
      if (taille > 256 * 2 ** 20) { ko(new Error("demande trop grosse")); req.destroy(); } else morceaux.push(m);
    });
    req.on("end", () => { try { ok(JSON.parse(Buffer.concat(morceaux).toString("utf8") || "{}")); } catch (e) { ko(e); } });
    req.on("error", ko);
  });

  return async function relais(req, res, suite) {
    const url = new URL(req.url ?? "/", "http://relais");
    const chemin = url.pathname;
    const poste = req.method === "POST";
    try {
      // ── La fenêtre du Mac ──
      if (chemin === "/hote" || chemin.startsWith("/hote/")) {
        if (!estLaFenetreDuMac(req, typeof port === "function" ? port() : port)) return repondre(res, 403, { erreur: "refusé" });
        if (chemin === "/hote" && req.method === "GET") {
          fenetre?.end();
          ouvrirLeFlux(res);
          fenetre = res;
          // Une fenêtre rechargée reprend les écoutes des invités.
          for (const [cleEcoute, x] of ecoutes) envoyer(res, { type: "ecouter", cle: cleEcoute, evenement: x.evenement });
          auxInvites({ type: "hote", present: true });
          res.on("close", () => {
            if (fenetre !== res) return;
            fenetre = null;
            for (const [n, x] of enAttente) {
              clearTimeout(x.minuteur);
              repondre(x.res, 503, { ok: false, hote: false, envoye: true, erreur: "Maitrize s'est fermé sur le Mac pendant la demande." });
              enAttente.delete(n);
            }
            auxInvites({ type: "hote", present: false });
          });
          return;
        }
        if (chemin === "/hote/reponse" && poste) {
          const m = await lireLeCorps(req);
          const x = enAttente.get(m.id);
          if (x) {
            enAttente.delete(m.id);
            clearTimeout(x.minuteur);
            repondre(x.res, 200, { ok: Boolean(m.ok), valeur: m.valeur, erreur: m.erreur });
          }
          return repondre(res, 204);
        }
        if (chemin === "/hote/evenement" && poste) {
          const m = await lireLeCorps(req);
          const x = ecoutes.get(m.cle);
          const flux = x && invites.get(x.invite);
          if (flux) envoyer(flux, { type: "evenement", cle: m.cle, evenement: m.evenement });
          return repondre(res, 204);
        }
        return suite();
      }

      // ── Les navigateurs invités : la clé, toujours ──
      if (!["/appel", "/evenements", "/ecouter", "/oublier"].includes(chemin)) return suite();
      if (req.headers["sec-fetch-site"] === "cross-site" || !memeCle(req.headers["x-relais-cle"] ?? url.searchParams.get("cle"), cle)) {
        return repondre(res, 403, { erreur: "Clé du relais refusée." });
      }
      if (chemin === "/evenements" && req.method === "GET") {
        const invite = randomBytes(8).toString("hex");
        ouvrirLeFlux(res);
        invites.set(invite, res);
        envoyer(res, { type: "bonjour", invite, hote: Boolean(fenetre) });
        res.on("close", () => {
          invites.delete(invite);
          for (const [cleEcoute, x] of ecoutes) {
            if (x.invite !== invite) continue;
            ecoutes.delete(cleEcoute);
            if (fenetre) envoyer(fenetre, { type: "oublier", cle: cleEcoute });
          }
        });
        return;
      }
      if (!poste) return suite();
      const m = await lireLeCorps(req);
      if (chemin === "/appel") {
        if (!fenetre) return repondre(res, 503, { ok: false, hote: false, envoye: false, erreur: "Maitrize n'est pas ouvert sur le Mac." });
        const n = ++numero;
        const minuteur = setTimeout(() => {
          enAttente.delete(n);
          repondre(res, 504, { ok: false, erreur: "Maitrize, sur le Mac, n'a pas répondu." });
        }, delaiMs);
        enAttente.set(n, { res, minuteur });
        // L'invité est parti avant la réponse : elle n'ira nulle part.
        res.on("close", () => { if (enAttente.get(n)?.res === res) { clearTimeout(minuteur); enAttente.delete(n); } });
        envoyer(fenetre, { type: "appel", id: n, cmd: String(m.cmd), args: m.args ?? {} });
        return;
      }
      // Une écoute appartient à son invité : sa clé commence par lui.
      if (typeof m.cle !== "string" || !invites.has(m.invite) || !m.cle.startsWith(`${m.invite}:`)) {
        return repondre(res, 400, { erreur: "Écoute inconnue." });
      }
      if (chemin === "/ecouter") {
        ecoutes.set(m.cle, { invite: m.invite, evenement: String(m.evenement) });
        if (fenetre) envoyer(fenetre, { type: "ecouter", cle: m.cle, evenement: String(m.evenement) });
      } else {
        ecoutes.delete(m.cle);
        if (fenetre) envoyer(fenetre, { type: "oublier", cle: m.cle });
      }
      return repondre(res, 204);
    } catch (e) {
      return repondre(res, 400, { erreur: String(e?.message ?? e) });
    }
  };
}

/** Le greffon Vite : le relais sur `/__relais`, quand Vite sert en développement — ni à la construction, ni pendant les essais. */
export default function relaisDev() {
  return {
    name: "maitrize-relais-dev",
    apply: (_config, env) => env.command === "serve" && !process.env.VITEST,
    configureServer(server) {
      const cle = laCle();
      server.middlewares.use("/__relais", creerLeRelais(cle, { port: () => server.config.server.port ?? 1420 }));
      server.httpServer?.once("listening", () => {
        server.config.logger.info(`  ➜  Relais : sur l'autre ordinateur, l'adresse Tailscale du Mac suivie de /?relais=${cle}`);
      });
    },
  };
}
