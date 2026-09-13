import { describe, it, expect } from "vitest";
import { tentativeRestee } from "./UpdateBanner";

describe("tentativeRestee", () => {
  it("rien de noté : rien à signaler", () => {
    expect(tentativeRestee(null, "1.6.0")).toBeNull();
  });
  it("redémarré sur la version visée : réussite", () => {
    expect(tentativeRestee('{"version":"1.6.1"}', "1.6.1")).toBeNull();
  });
  it("toujours sur l'ancienne version : l'installateur a été bloqué", () => {
    expect(tentativeRestee('{"version":"1.6.1"}', "1.6.0")).toBe("1.6.1");
  });
  it("une note abîmée ne déclenche rien", () => {
    expect(tentativeRestee("{oups", "1.6.0")).toBeNull();
  });
});
