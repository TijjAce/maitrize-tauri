import { describe, it, expect } from "vitest";
import { youtubeId, vignetteYoutube, lireLien, lireVideos, nomVideo } from "./videos";

// Une variante d'adresse non reconnue ne provoque aucune erreur : la vignette
// reste vide et la vidéo ne s'ouvre pas. On ne s'en aperçoit qu'en classe.

describe("adresses YouTube", () => {
  it("reconnaît les formes courantes", () => {
    const attendu = "dQw4w9WgXcQ";
    for (const url of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://www.youtube.com/live/dQw4w9WgXcQ",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
    ]) {
      expect(youtubeId(url), url).toBe(attendu);
    }
  });

  it("reconnaît une adresse avec des paramètres", () => {
    // Le cas le plus fréquent : un lien copié depuis une vidéo en cours, ou
    // partagé depuis un téléphone.
    expect(youtubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://youtu.be/dQw4w9WgXcQ?si=abcdef")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://www.youtube.com/watch?list=PL123&v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("refuse ce qui n'est pas une vidéo", () => {
    expect(youtubeId("https://www.youtube.com/")).toBeUndefined();
    expect(youtubeId("https://eduscol.education.fr/")).toBeUndefined();
    expect(youtubeId("pas une adresse")).toBeUndefined();
  });

  it("exige onze caractères, ni plus ni moins", () => {
    expect(youtubeId("https://youtu.be/trop-court")).toBeUndefined();
    expect(youtubeId("https://youtu.be/dQw4w9WgXcQsuite")).toBeUndefined();
  });

  it("pointe vers une vignette qui existe toujours", () => {
    // `maxresdefault` manque pour beaucoup de vidéos et laisserait un vide.
    expect(vignetteYoutube("dQw4w9WgXcQ")).toContain("hqdefault");
  });
});

describe("lecture d'un lien déposé", () => {
  it("accepte une adresse et retient l'identifiant", () => {
    const v = lireLien("  https://youtu.be/dQw4w9WgXcQ  ");
    expect(v?.url).toBe("https://youtu.be/dQw4w9WgXcQ");
    expect(v?.youtubeId).toBe("dQw4w9WgXcQ");
  });

  it("accepte une autre plateforme, sans identifiant", () => {
    const v = lireLien("https://www.lumni.fr/video/les-fractions");
    expect(v?.url).toContain("lumni");
    expect(v?.youtubeId).toBeUndefined();
  });

  it("refuse ce qui n'est pas une adresse", () => {
    // Mieux vaut ne rien ajouter qu'une ligne vide à retrouver et supprimer.
    for (const x of ["", "   ", "bonjour", "www.exemple.fr", "ftp://x.fr"]) {
      expect(lireLien(x), x).toBeNull();
    }
  });
});

describe("relecture de ce qui est enregistré", () => {
  it("relit une liste normale", () => {
    const json = JSON.stringify([{ url: "https://youtu.be/dQw4w9WgXcQ", titre: "Les fractions" }]);
    const [v] = lireVideos(json);
    expect(v.titre).toBe("Les fractions");
    expect(v.youtubeId).toBe("dQw4w9WgXcQ");
  });

  it("tolère l'ancien format où une vidéo n'était qu'une chaîne", () => {
    expect(lireVideos(JSON.stringify(["https://youtu.be/dQw4w9WgXcQ"]))[0].youtubeId).toBe("dQw4w9WgXcQ");
  });

  it("rend une liste vide plutôt qu'une erreur", () => {
    for (const x of ["", "null", "{}", "[", "pas du json"]) {
      expect(() => lireVideos(x)).not.toThrow();
      expect(lireVideos(x)).toEqual([]);
    }
  });

  it("écarte une entrée sans adresse", () => {
    expect(lireVideos(JSON.stringify([{ titre: "sans lien" }, { url: "" }]))).toEqual([]);
  });
});

describe("nom affiché", () => {
  it("préfère le titre saisi", () => {
    expect(nomVideo({ url: "https://youtu.be/dQw4w9WgXcQ", titre: "Les fractions" })).toBe("Les fractions");
  });

  it("à défaut, nomme la source", () => {
    expect(nomVideo({ url: "https://youtu.be/dQw4w9WgXcQ", youtubeId: "dQw4w9WgXcQ" })).toContain("YouTube");
    expect(nomVideo({ url: "https://www.lumni.fr/video/x" })).toBe("lumni.fr");
  });
});
