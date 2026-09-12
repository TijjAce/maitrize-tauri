import { describe, it, expect } from "vitest";
import { contenuDirect, nature } from "./bureau";
import type { MaterielItem } from "./api";

const base: MaterielItem = {
  id: "m", titre: "", descriptionMateriel: "", competenceId: "", competenceTitre: "",
  domaineTitre: "", sousDomaineTitre: "", cycle: "", imagesJson: "[]", pdfsJson: "[]",
  dateCreation: "", seanceId: null, sequenceId: null, dossier: "", videosJson: "[]", coffreJson: "[]",
};
const yt = JSON.stringify([{ url: "https://www.youtube.com/watch?v=DM801qbNf-c", youtubeId: "DM801qbNf-c" }]);

describe("contenuDirect", () => {
  it("une vidéo déposée se lit", () => {
    const c = contenuDirect({ ...base, videosJson: yt });
    expect(c?.genre).toBe("video");
    expect(nature({ ...base, videosJson: yt })).toBe("Vidéo");
  });

  it("un PDF ou une image déposés s'ouvrent", () => {
    expect(contenuDirect({ ...base, pdfsJson: '["a.pdf"]' })).toEqual({ genre: "pdf", nom: "a.pdf" });
    expect(contenuDirect({ ...base, imagesJson: '["a.png"]' })).toEqual({ genre: "image", nom: "a.png" });
  });

  it("un objet travaillé s'ouvre en fiche", () => {
    expect(contenuDirect({ ...base, videosJson: yt, descriptionMateriel: "Pour le rituel" })).toBeNull();
    expect(contenuDirect({ ...base, pdfsJson: '["a.pdf"]', competenceId: "c1" })).toBeNull();
    expect(contenuDirect({ ...base, pdfsJson: '["a.pdf"]', coffreJson: '["d1"]' })).toBeNull();
  });

  it("plusieurs documents ou aucun : fiche", () => {
    expect(contenuDirect({ ...base, pdfsJson: '["a.pdf","b.pdf"]' })).toBeNull();
    expect(contenuDirect({ ...base, videosJson: yt, pdfsJson: '["a.pdf"]' })).toBeNull();
    expect(contenuDirect(base)).toBeNull();
    expect(nature(base)).toBe("Matériel");
  });

  it("un JSON abîmé ne casse rien", () => {
    expect(contenuDirect({ ...base, pdfsJson: "{oups" })).toBeNull();
  });
});
