import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer } from "node:http";
import { mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { creerLeRelais, laCle } from "./vite.relaisDev.mjs";

const CLE = "a".repeat(48);
let serveur, base;

beforeAll(async () => {
  let relais;
  serveur = createServer((req, res) => {
    if (!req.url.startsWith("/__relais")) { res.writeHead(404); res.end(); return; }
    req.url = req.url.slice("/__relais".length) || "/";
    relais(req, res, () => { res.writeHead(404); res.end(); });
  });
  await new Promise((ok) => serveur.listen(0, "127.0.0.1", ok));
  const { port } = serveur.address();
  base = `http://127.0.0.1:${port}/__relais`;
  relais = creerLeRelais(CLE, { port });
});
afterAll(() => new Promise((ok) => { serveur.closeAllConnections(); serveur.close(ok); }));

/** Un flux d'événements serveur, lu message par message. */
async function ouvrir(url, enTetes = {}) {
  const arret = new AbortController();
  const r = await fetch(url, { headers: enTetes, signal: arret.signal });
  const messages = [];
  let reveil = null;
  void (async () => {
    const lecteur = r.body.getReader(), decodeur = new TextDecoder();
    let tampon = "";
    try {
      for (;;) {
        const { value, done } = await lecteur.read();
        if (done) break;
        tampon += decodeur.decode(value, { stream: true });
        for (let i; (i = tampon.indexOf("\n\n")) >= 0;) {
          const ligne = tampon.slice(0, i).split("\n").find((l) => l.startsWith("data: "));
          tampon = tampon.slice(i + 2);
          if (ligne) { messages.push(JSON.parse(ligne.slice(6))); reveil?.(); }
        }
      }
    } catch { /* flux fermé */ }
  })();
  return {
    statut: r.status,
    async suivant() { while (!messages.length) await new Promise((ok) => { reveil = ok; }); return messages.shift(); },
    fermer: () => arret.abort(),
  };
}
const poster = (chemin, corps, enTetes = {}) =>
  fetch(`${base}${chemin}`, { method: "POST", headers: { "Content-Type": "application/json", ...enTetes }, body: JSON.stringify(corps) });

describe("le relais de développement (demande de l'enseignant, 2026-11-02)", () => {
  it("refuse un invité sans la clé, et ne prend pour la fenêtre du Mac ni une demande relayée, ni un autre site", async () => {
    expect((await poster("/appel", { cmd: "x" })).status).toBe(403);
    expect((await poster("/appel", { cmd: "x" }, { "X-Relais-Cle": "b".repeat(48) })).status).toBe(403);
    expect((await fetch(`${base}/evenements?cle=${"b".repeat(48)}`)).status).toBe(403);
    expect((await fetch(`${base}/hote`, { headers: { "X-Forwarded-For": "100.64.0.2" } })).status).toBe(403);
    expect((await fetch(`${base}/hote`, { headers: { Origin: "https://ailleurs.example" } })).status).toBe(403);
  });

  it("dit à l'invité que la fenêtre du Mac n'est pas là, sans rien envoyer", async () => {
    const r = await poster("/appel", { cmd: "plugin:app|version" }, { "X-Relais-Cle": CLE });
    expect(r.status).toBe(503);
    expect(await r.json()).toMatchObject({ ok: false, hote: false, envoye: false });
  });

  it("passe une demande à la fenêtre du Mac et rend sa réponse ; de même pour un événement écouté", async () => {
    const fenetre = await ouvrir(`${base}/hote`);
    expect(fenetre.statut).toBe(200);
    const invite = await ouvrir(`${base}/evenements?cle=${CLE}`);
    const bonjour = await invite.suivant();
    expect(bonjour).toMatchObject({ type: "bonjour", hote: true });
    const reponse = poster("/appel", { cmd: "plugin:app|version", args: {} }, { "X-Relais-Cle": CLE });
    const appel = await fenetre.suivant();
    expect(appel).toMatchObject({ type: "appel", cmd: "plugin:app|version", args: {} });
    await poster("/hote/reponse", { id: appel.id, ok: true, valeur: "1.6.41" });
    expect(await (await reponse).json()).toEqual({ ok: true, valeur: "1.6.41" });
    const cle = `${bonjour.invite}:1`;
    expect((await poster("/ecouter", { invite: bonjour.invite, cle, evenement: "essai" }, { "X-Relais-Cle": CLE })).status).toBe(204);
    expect(await fenetre.suivant()).toEqual({ type: "ecouter", cle, evenement: "essai" });
    await poster("/hote/evenement", { cle, evenement: { event: "essai", payload: 42 } });
    expect(await invite.suivant()).toEqual({ type: "evenement", cle, evenement: { event: "essai", payload: 42 } });
    // On n'écoute pas au nom d'un autre invité.
    expect((await poster("/ecouter", { invite: bonjour.invite, cle: "autre:1", evenement: "essai" }, { "X-Relais-Cle": CLE })).status).toBe(400);
    // La fenêtre fermée, l'invité le sait.
    fenetre.fermer();
    expect(await invite.suivant()).toEqual({ type: "hote", present: false });
    invite.fermer();
  });

  it("garde sa clé d'un lancement à l'autre, lisible du seul utilisateur", () => {
    const chemin = join(mkdtempSync(join(tmpdir(), "relais-")), "sous", "relais-dev.jeton");
    const cle = laCle(chemin);
    expect(cle).toMatch(/^[0-9a-f]{48}$/);
    expect(laCle(chemin)).toBe(cle);
    expect(statSync(chemin).mode & 0o777).toBe(0o600);
  });
});
