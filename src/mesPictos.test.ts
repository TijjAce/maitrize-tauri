import { describe, it, expect } from "vitest";
import {
  PREFIXE_MES_PICTOS, chercherDans, cleDuMot, completer, estMonPicto, ficheEcrite, lireFiches, mentionDeMesPictos, nouvelIdMonPicto,
  origineDe, photoArrivee, pourLeMot, type MonPicto,
} from "./mesPictos";
import { estPerso } from "./imagesPerso";

const picto = (id: number, mot: string, date = "2026-10-05"): MonPicto =>
  ({ id, mot, fichier: `${Math.abs(id)}.png`, origine: origineDe(id)!, date });

describe("Mes pictos", () => {
  it("donnent à chaque origine sa plage de numéros, loin des images d'une séance et dans les entiers 32 bits", () => {
    for (const origine of ["ia", "sclera", "bajard", "photo", "makaton"] as const) {
      for (const h of [0, 0.5, 0.999999999]) {
        const id = nouvelIdMonPicto(origine, () => h);
        expect(origineDe(id), `${origine} ${h}`).toBe(origine);
        expect(Number.isInteger(id)).toBe(true);
        expect(id).toBeGreaterThan(-(2 ** 31));
        // Comme les images de l'enseignant : la banque ne lui doit rien.
        expect(estPerso(id)).toBe(true);
      }
    }
    // Juste au-dessus de la plus haute plage, celle des symboles Makaton : une image de séance n'y descend jamais.
    for (const autre of [0, 2349, -1, -599_999_999, -2_147_000_000, -2_147_483_648, 1.5, "-1000000001", null]) expect(estMonPicto(autre)).toBe(false);
  });

  it("se lisent dans les réglages ; une fiche abîmée ou un chemin sont écartés", () => {
    const fiches = lireFiches({
      [`${PREFIXE_MES_PICTOS}-1000000002`]: JSON.stringify({ mot: " trottinette ", fichier: "a.png", date: "2026-10-05", precision: "un enfant dessus" }),
      [`${PREFIXE_MES_PICTOS}-1400000005`]: JSON.stringify({ mot: "compter", fichier: "b.png", date: "2026-10-01" }),
      [`${PREFIXE_MES_PICTOS}-1000000003`]: JSON.stringify({ mot: "x", fichier: "../secret.png" }),
      [`${PREFIXE_MES_PICTOS}-1000000004`]: "pas du JSON",
      [`${PREFIXE_MES_PICTOS}-1000000006`]: "",
      [`${PREFIXE_MES_PICTOS}12`]: JSON.stringify({ mot: "faux", fichier: "c.png" }),
      "caa:picto:sclera:x.png": "AAA",
    });
    expect(fiches.map((p) => [p.mot, p.origine])).toEqual([["compter", "sclera"], ["trottinette", "ia"]]);
    expect(fiches[1].precision).toBe("un enfant dessus");
    // Ce qui s'écrit se relit à l'identique.
    expect(lireFiches({ [PREFIXE_MES_PICTOS + fiches[1].id]: ficheEcrite(fiches[1]) })).toEqual([fiches[1]]);
  });

  it("se trouvent par leur mot, sans souci des majuscules ni des accents", () => {
    const liste = [picto(-1_000_000_001, "Élève"), picto(-1_000_000_002, "trottinette"), picto(-1_000_000_003, "trottinette électrique")];
    expect(cleDuMot("  Élève  ROUX ")).toBe("eleve roux");
    expect(chercherDans(liste, "eleve").map((p) => p.mot)).toEqual(["Élève"]);
    expect(chercherDans(liste, "TROTTINETTE").map((p) => p.mot)).toEqual(["trottinette", "trottinette électrique"]);
    expect(chercherDans(liste, "")).toHaveLength(3);
    expect(pourLeMot(liste, "trottinette")?.id).toBe(-1_000_000_002);
    expect(pourLeMot(liste, "trotti")).toBeUndefined();
    // Deux pictos pour le même mot : le plus récent.
    expect(pourLeMot([picto(-1_000_000_009, "ballon", "2026-09-01"), picto(-1_000_000_010, "Ballon", "2026-10-01")], "ballon")?.id).toBe(-1_000_000_010);
    // Une photo nommée avec son article répond au mot sans article, et l'inverse ; écrit pareil passe d'abord.
    const photos = [picto(-2_100_000_001, "les ciseaux"), picto(-2_100_000_002, "cantine")];
    expect(pourLeMot(photos, "ciseaux")?.id).toBe(-2_100_000_001);
    expect(pourLeMot(photos, "la cantine")?.id).toBe(-2_100_000_002);
    expect(pourLeMot([...photos, picto(-1_000_000_011, "ciseaux")], "ciseaux")?.id).toBe(-1_000_000_011);
  });

  it("complètent une recherche par mots : ce qu'ARASAAC n'a pas prend le picto gardé", () => {
    const arasaac = [{ id: 2349, mot: "ballon", fichier: "2349.png" }];
    const [trouves, absents] = completer([arasaac, ["Trottinette", "dragon"]], [picto(-1_000_000_002, "trottinette")]);
    expect(trouves).toEqual([...arasaac, { id: -1_000_000_002, mot: "Trottinette", fichier: "" }]);
    expect(absents).toEqual(["dragon"]);
  });

  it("disent sur la feuille d'où ils viennent : l'IA n'est pas ARASAAC, Sclera veut son nom", () => {
    expect(mentionDeMesPictos([2349, -4, null])).toBe("");
    expect(mentionDeMesPictos([-1_000_000_001])).toMatch(/intelligence artificielle.*ils n'en font pas partie/);
    const deux = mentionDeMesPictos([-1_400_000_001, -1_000_000_001]);
    expect(deux).toContain("Sclera (www.sclera.be)");
    expect(deux).toContain("intelligence artificielle");
    expect(mentionDeMesPictos([-1_400_000_001])).not.toContain("intelligence");
    // Un symbole Makaton importé : la feuille dit à qui il appartient, et ne le prête ni à ARASAAC ni à l'IA.
    expect(origineDe(-600_000_001)).toBe("makaton");
    expect(origineDe(-599_999_999)).toBe(null);
    expect(mentionDeMesPictos([-600_000_001])).toBe("Symboles Makaton © The Makaton Charity.");
  });

  it("reconnaissent la photo arrivée du téléphone pendant qu'on l'attend : celle du mot attendu d'abord", () => {
    const deja = picto(-2_100_000_001, "la cantine");
    const ciseaux = picto(-2_100_000_002, "les ciseaux");
    const bus = picto(-2_100_000_003, "le bus");
    const ia = picto(-1_000_000_009, "ciseaux");
    const connues = new Set([deja.id]);
    // Ni une photo déjà là, ni un picto qui n'est pas une photo.
    expect(photoArrivee(connues, [deja, ia], "ciseaux")).toBeNull();
    expect(photoArrivee(connues, [bus, deja, ciseaux], "ciseaux")).toBe(ciseaux);
    expect(photoArrivee(connues, [bus, deja, ciseaux], "règle")).toBe(bus);
    expect(photoArrivee(connues, [deja, bus], " ")).toBe(bus);
  });
});
