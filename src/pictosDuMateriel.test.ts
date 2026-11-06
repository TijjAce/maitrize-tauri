import { describe, expect, it } from "vitest";
import { MATERIEL_REEL } from "./materielDeClasse";
import { EMOJI_DE_LA_FAMILLE, PICTOS_ARASAAC_DU_MATERIEL, dessinDuMateriel } from "./pictosDuMateriel";

describe("les pictos du matériel de la classe", () => {
  it("donnent à chaque matériel un seul picto : d'ARASAAC, ou dessiné parce que la banque n'a pas l'objet", () => {
    for (const m of MATERIEL_REEL) {
      const arasaac = !!PICTOS_ARASAAC_DU_MATERIEL[m.id], dessin = !!dessinDuMateriel(m.id);
      expect(arasaac !== dessin, m.id).toBe(true);
      expect(EMOJI_DE_LA_FAMILLE[m.famille], m.famille).toBeTruthy();
    }
  });

  it("ne gardent rien pour un matériel qui n'existe plus", () => {
    const connus = new Set(MATERIEL_REEL.map((m) => m.id));
    for (const id of Object.keys(PICTOS_ARASAAC_DU_MATERIEL)) expect(connus.has(id), id).toBe(true);
    const dessins = Object.keys(import.meta.glob("./assets/materiel/*"));
    for (const f of dessins) expect(connus.has(f.replace(/^.*\/|\.svg$/g, "")), f).toBe(true);
  });

  it("ne montrent plus aucune photographie", () => {
    expect(Object.keys(import.meta.glob("./assets/materiel/*.jpg"))).toEqual([]);
  });
});
