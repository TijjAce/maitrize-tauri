import { describe, it, expect } from "vitest";
import { cleDeNom, imageSelonMode, lireModeImages, porteDesImages, type Connaissances } from "./imagesSelonMode";
import { ETIQUETTES, estPhoto, mentionDeMesPictos, nouvelIdMonPicto, origineDe, typeDImage, type MonPicto } from "./mesPictos";

const photo = (id: number, mot: string): MonPicto => ({ id, mot, fichier: `photo-${-id}.jpg`, origine: "photo", date: "2026-10-09" });
const CISEAUX = photo(-2_100_000_001, "les ciseaux");
const CANTINE = photo(-2_100_000_002, "la cantine");
const IA_LAPIN = -1_000_000_005;

/** La banque d'essai : ARASAAC 2591 « ciseaux », 3000 « colle », un picto de l'IA « lapin ». */
const k: Connaissances = {
  photos: [CISEAUX, CANTINE],
  motsDe: (id) => ({ 2591: ["ciseaux", "paire de ciseaux"], 3000: ["colle", "bâton de colle"], [IA_LAPIN]: ["lapin"] } as Record<string, string[]>)[String(id)] ?? [],
  pictoDe: (mot) => ({ "les ciseaux": 2591 } as Record<string, number>)[mot],
};

describe("photos ou pictos, selon la fabrication", () => {
  it("les photos ont leur plage dans Mes pictos, et pas de mention à porter", () => {
    expect(origineDe(CISEAUX.id)).toBe("photo");
    expect(estPhoto(CISEAUX.id)).toBe(true);
    expect(estPhoto(IA_LAPIN)).toBe(false);
    expect(estPhoto(2591)).toBe(false);
    for (const h of [0, 0.5, 0.999999]) expect(origineDe(nouvelIdMonPicto("photo", () => h))).toBe("photo");
    expect(ETIQUETTES.photo.court).toBe("Photo");
    expect(mentionDeMesPictos([CISEAUX.id])).toBe("");
    expect(typeDImage("photo-ph1.jpg")).toBe("image/jpeg");
    expect(typeDImage("1234.png")).toBe("image/png");
  });

  it("rapproche une photo d'une image par son nom, sans article ni majuscule ni accent", () => {
    expect(cleDeNom("Les Ciseaux")).toBe("ciseaux");
    expect(cleDeNom("l’École")).toBe("ecole");
    expect(cleDeNom("de la colle")).toBe("colle");
    expect(cleDeNom("lapin")).toBe("lapin");
  });

  it("« Photos et pictos » : la photo quand on en a une, le picto sinon", () => {
    expect(imageSelonMode(2591, "les-deux", k)).toBe(CISEAUX.id);
    expect(imageSelonMode(3000, "les-deux", k)).toBe(3000);
    expect(imageSelonMode(CANTINE.id, "les-deux", k)).toBe(CANTINE.id);
    expect(imageSelonMode(IA_LAPIN, "les-deux", k)).toBe(IA_LAPIN);
  });

  it("« Pictos seulement » : la photo cède la place au picto de son nom, ou à rien", () => {
    expect(imageSelonMode(2591, "pictos", k)).toBe(2591);
    expect(imageSelonMode(CISEAUX.id, "pictos", k)).toBe(2591);
    expect(imageSelonMode(CANTINE.id, "pictos", k)).toBeNull();
    expect(imageSelonMode("photo:IMG-1.jpg", "pictos", k)).toBeNull();
    expect(imageSelonMode("sclera:compter.png", "pictos", k)).toBe("sclera:compter.png");
  });

  it("« Photos seulement » : rien que les photos, un mot sans photo reste sans image", () => {
    expect(imageSelonMode(2591, "photos", k)).toBe(CISEAUX.id);
    expect(imageSelonMode(3000, "photos", k)).toBeNull();
    expect(imageSelonMode(IA_LAPIN, "photos", k)).toBeNull();
    expect(imageSelonMode(CANTINE.id, "photos", k)).toBe(CANTINE.id);
    expect(imageSelonMode("photo:IMG-1.jpg", "photos", k)).toBe("photo:IMG-1.jpg");
  });

  it("relit le choix enregistré avec méfiance, et sait si une feuille montre des images", () => {
    expect(lireModeImages("photos")).toBe("photos");
    expect(lireModeImages("")).toBe("les-deux");
    expect(lireModeImages("n'importe quoi")).toBe("les-deux");
    expect(porteDesImages('<div class="feuille"><img src="data:x"></div>')).toBe(true);
    expect(porteDesImages('<svg><image href="x"/></svg>')).toBe(true);
    expect(porteDesImages('<div class="feuille">Rien</div>')).toBe(false);
  });
});
