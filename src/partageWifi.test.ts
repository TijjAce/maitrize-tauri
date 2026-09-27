// L'accord entre les deux écrans passe par un événement de fenêtre : il se
// vérifie dans un navigateur, pas ici — les tests tournent sans DOM.
import { describe, it, expect } from "vitest";
import { adresseDuPartage, titreDuPartage } from "./partageWifi";
import type { PortableInfo } from "./api";

const ouvert: PortableInfo = {
  url: "http://192.168.1.20:8787/?t=jeton-abc", ip: "192.168.1.20", port: 8787, qrSvg: "<svg/>",
};

describe("le partage WiFi", () => {
  it("dit où joindre l'ordinateur, ou comment ouvrir", () => {
    expect(titreDuPartage(ouvert)).toContain("192.168.1.20:8787");
    expect(titreDuPartage(ouvert)).toContain("fermer");
    expect(titreDuPartage(null)).toContain("ouvrir");
    // L'adresse garde son jeton : sans lui, chaque dépôt serait refusé.
    expect(adresseDuPartage(ouvert)).toContain("?t=jeton-abc");
    expect(adresseDuPartage(null)).toBe("");
  });

});
