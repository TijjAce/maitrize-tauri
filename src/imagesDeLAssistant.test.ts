import { describe, expect, it } from "vitest";
import { IMAGES_PAR_DEMANDE, imagesDeLaDemande } from "./imagesDeLAssistant";

describe("les images collées dans l'assistant (demande de l'enseignant, 2026-11-01)", () => {
  it("repartent avec la demande, les plus récentes d'abord, huit au plus", () => {
    const messages = [{ images: ["a", "b", "c"] }, {}, { images: ["d", "e", "f", "g", "h", "i"] }, { images: [] }];
    expect(imagesDeLaDemande(messages)).toEqual([["b", "c"], [], ["d", "e", "f", "g", "h", "i"], []]);
    expect(imagesDeLaDemande(messages, 4)).toEqual([[], [], ["f", "g", "h", "i"], []]);
    expect(IMAGES_PAR_DEMANDE).toBe(8);
  });

  it("ne changent rien à une conversation sans image", () => {
    expect(imagesDeLaDemande([{}, { images: [] }])).toEqual([[], []]);
    expect(imagesDeLaDemande([])).toEqual([]);
  });
});
