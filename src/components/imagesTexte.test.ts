import { describe, it, expect } from "vitest";
import { imagesDuHtmlColle } from "./imagesTexte";

// Un pixel PNG transparent, tel qu'un navigateur le met dans le presse-papiers.
const PIXEL = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("les images collées depuis une page web", () => {
  it("lit une image écrite en base64 dans le HTML du presse-papiers", () => {
    const images = imagesDuHtmlColle(`<meta charset="utf-8"><img src="data:image/png;base64,${PIXEL}" alt="">`);
    expect(images).toHaveLength(1);
    expect(images[0].type).toBe("image/png");
    expect(images[0].size).toBeGreaterThan(50);
  });

  it("en prend plusieurs, et ignore celles qui pointent ailleurs", () => {
    const html = `<img src="data:image/png;base64,${PIXEL}"><img src="https://exemple.fr/photo.jpg">`
      + `<img src="data:image/jpeg;base64,${PIXEL}">`;
    const images = imagesDuHtmlColle(html);
    expect(images.map((i) => i.type)).toEqual(["image/png", "image/jpeg"]);
  });

  it("une donnée abîmée ne fait pas tomber le collage", () => {
    expect(imagesDuHtmlColle('<img src="data:image/png;base64,@@@pas du base64@@@">')).toEqual([]);
    expect(imagesDuHtmlColle("")).toEqual([]);
    expect(imagesDuHtmlColle("<p>du texte</p>")).toEqual([]);
  });
});
