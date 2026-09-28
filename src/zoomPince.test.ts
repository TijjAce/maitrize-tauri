import { describe, it, expect } from "vitest";
import { ZOOM_MAX, ZOOM_MIN, bornerZoom, lireZoom, zoomApresPincement, zoomReelDuJournal } from "./zoomPince";

describe("le zoom au pincement", () => {
  it("se relit sans faire confiance à ce qui est retenu", () => {
    expect(lireZoom(null)).toBe(1);
    expect(lireZoom("")).toBe(1);
    expect(lireZoom("abc")).toBe(1);
    expect(lireZoom("0.2")).toBe(1);
    expect(lireZoom("9")).toBe(1);
    expect(lireZoom("1.3")).toBe(1.3);
  });

  it("suit les doigts, dans les bornes", () => {
    // Écarter les doigts (deltaY négatif) agrandit ; les rapprocher réduit.
    expect(zoomApresPincement(1, -10)).toBeCloseTo(1.1);
    expect(zoomApresPincement(1, 10)).toBeCloseTo(0.9);
    expect(zoomApresPincement(ZOOM_MAX, -50)).toBe(ZOOM_MAX);
    expect(zoomApresPincement(ZOOM_MIN, 50)).toBe(ZOOM_MIN);
    expect(bornerZoom(0)).toBe(ZOOM_MIN);
    expect(bornerZoom(100)).toBe(ZOOM_MAX);
  });

  it("fait fondre le journal deux fois moins que son chiffre", () => {
    expect(zoomReelDuJournal(ZOOM_MIN)).toBeCloseTo(0.8);
    expect(zoomReelDuJournal(0.8)).toBeCloseTo(0.9);
    expect(zoomReelDuJournal(1)).toBe(1);
    expect(zoomReelDuJournal(1.6)).toBeCloseTo(1.3);
    expect(zoomReelDuJournal(ZOOM_MAX)).toBeCloseTo(1.75);
  });
});
