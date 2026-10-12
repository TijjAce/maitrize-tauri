import { describe, it, expect } from "vitest";
import { PHOTOS_PAYSAGES, avecLesPhotosDePaysage, chargerPhotoPaysage, creditPhoto, photosDe } from "./photosPaysages";
import { FAMILLES_PAYSAGE, REGLAGES_PAYSAGE, htmlPaysage, reglagesPaysageSurs, type FamillePaysage } from "./lireUnPaysage";
import { planHistoireGeo } from "./demarchesHistoireGeo";

const LICENCES_LIBRES = ["CC0", "CC BY 2.0", "CC BY 3.0", "CC BY 4.0", "CC BY-SA 2.5", "CC BY-SA 3.0", "CC BY-SA 4.0"];

describe("les photographies de paysages", () => {
  it("sont libres, créditées, et chacune dans l'application", async () => {
    expect(PHOTOS_PAYSAGES).toHaveLength(24);
    expect(new Set(PHOTOS_PAYSAGES.map((p) => p.id)).size).toBe(24);
    for (const p of PHOTOS_PAYSAGES) {
      expect(LICENCES_LIBRES, p.id).toContain(p.licence);
      expect(p.page, p.id).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(p.auteur.trim(), p.id).not.toBe("");
      expect(await chargerPhotoPaysage(p.id), p.id).toMatch(/^data:image\/jpeg;base64,/);
    }
    expect(await chargerPhotoPaysage("inconnue")).toBeNull();
    expect(creditPhoto(PHOTOS_PAYSAGES.find((p) => p.id === "plaine")!)).toBe("Photo : Jebulon, domaine public (CC0), Wikimedia Commons.");
    expect(creditPhoto(PHOTOS_PAYSAGES.find((p) => p.id === "ville")!)).toBe("Photo : CEphoto, Uwe Aranas, licence CC BY-SA 3.0, Wikimedia Commons.");
  });

  it("montrent chaque paysage que la fiche fait nommer, dans chaque famille", () => {
    for (const famille of Object.keys(FAMILLES_PAYSAGE) as FamillePaysage[]) {
      const types = photosDe(famille).map((p) => p.type);
      for (const t of FAMILLES_PAYSAGE[famille].types) expect(types.some((x) => x.startsWith(t)), `${famille} : ${t}`).toBe(true);
    }
  });

  it("se mettent en tête de la fiche, leur crédit dessous ; l'impression met l'image qui manque", async () => {
    const r = reglagesPaysageSurs({ ...REGLAGES_PAYSAGE, famille: "residentiel", photo: "centre-ville" });
    const sans = htmlPaysage(r);
    expect(sans).toContain('<img src="paysage:centre-ville" alt="un centre-ville historique : La Petite Venise, à Colmar">');
    expect(sans).toContain("<figcaption>Photo : Krzysztof Golik, licence CC BY-SA 4.0, Wikimedia Commons.</figcaption>");
    expect(sans).not.toContain("Je colle la photographie ici.");
    const avec = await avecLesPhotosDePaysage(sans);
    expect(avec).toMatch(/<img src="data:image\/jpeg;base64,[^"]+" alt="un centre-ville/);
    expect(htmlPaysage(r, { "centre-ville": "data:x" })).toContain('<img src="data:x"');
    // Sans photographie, ou avec une photographie d'une autre famille : le cadre où coller la sienne.
    expect(htmlPaysage(REGLAGES_PAYSAGE)).toContain("Je colle la photographie ici.");
    expect(reglagesPaysageSurs({ famille: "monde", photo: "centre-ville" }).photo).toBe("");
    expect(await avecLesPhotosDePaysage("<p>rien</p>")).toBe("<p>rien</p>");
  });

  it("accompagnent les fiches de paysage des séquences", () => {
    const loger = planHistoireGeo("se-loger-ce2", null)!.feuilles.filter((f) => f.atelier === "paysage").map((f) => f.fabriquer(1).html);
    expect(loger.map((h) => /src="paysage:([a-z-]+)"/.exec(h)?.[1])).toEqual(["centre-ville", "lotissement", "grand-ensemble"]);
  });
});
