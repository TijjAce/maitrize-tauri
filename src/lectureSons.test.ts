import { describe, it, expect } from "vitest";
import {
  contientLeSon, fabriquerFiche, intrus, lireMesMots, REGLAGES_PAR_DEFAUT, SONS, sonDe, syllabes,
} from "./lectureSons";
import { hasard } from "./problemesBarres";

describe("le corpus des sons", () => {
  it("n'a que des mots qui s'écrivent avec le graphème travaillé", () => {
    for (const s of SONS) {
      for (const mot of s.mots) {
        expect(contientLeSon(mot, s), `« ${mot} » pour ${s.son} (${s.graphemes.join("/")})`).toBe(true);
        // Un mot de fiche de son s'écrit en minuscules, sans espace ni chiffre.
        expect(/^[a-zàâçéèêëîïôœùûü-]+$/.test(mot), `« ${mot} »`).toBe(true);
      }
      expect(s.mots.length, s.son).toBeGreaterThanOrEqual(8);
      expect(new Set(s.mots).size, `doublon dans ${s.son}`).toBe(s.mots.length);
    }
  });

  it("n'a pas deux fois le même son ni le même identifiant", () => {
    expect(new Set(SONS.map((s) => s.id)).size).toBe(SONS.length);
    // Les voyelles d'abord : c'est l'ordre des méthodes syllabiques.
    expect(SONS[0].sorte).toBe("voyelle");
    expect(SONS.findIndex((s) => s.id === "a")).toBeLessThan(SONS.findIndex((s) => s.id === "m"));
    expect(SONS.findIndex((s) => s.id === "m")).toBeLessThan(SONS.findIndex((s) => s.id === "gn"));
  });
});

describe("les syllabes", () => {
  it("marient la consonne aux voyelles, et la voyelle aux consonnes", () => {
    expect(syllabes(sonDe("m")!, 4)).toEqual(["ma", "mi", "mo", "mu"]);
    expect(syllabes(sonDe("ch")!, 3)).toEqual(["cha", "chi", "cho"]);
    // Une voyelle reçoit les consonnes devant elle.
    expect(syllabes(sonDe("a")!, 3)).toEqual(["ma", "la", "ra"]);
    // Un graphème complexe qui sonne comme une voyelle se traite ainsi.
    expect(syllabes(sonDe("ou")!, 3)).toEqual(["mou", "lou", "rou"]);
    expect(syllabes(sonDe("oi")!, 2)).toEqual(["moi", "loi"]);
  });
});

describe("les intrus", () => {
  it("ne contiennent jamais le graphème travaillé", () => {
    for (const s of SONS) {
      const faux = intrus(s, 6, hasard(3));
      expect(faux.length, s.son).toBeGreaterThan(0);
      for (const mot of faux) {
        expect(contientLeSon(mot, s), `« ${mot} » n'est pas un intrus pour ${s.son}`).toBe(false);
      }
    }
  });
});

describe("la fiche", () => {
  it("ne retient des mots de l'enseignant que ceux qui portent le son", () => {
    expect(lireMesMots("chat, niche\nbrouette;  ")).toEqual(["chat", "niche", "brouette"]);
    const f = fabriquerFiche({ ...REGLAGES_PAR_DEFAUT, son: "ch", mesMots: "chapeau\nvélo\nruche" }, 1);
    expect(f.mots).toContain("chapeau");
    expect(f.mots).toContain("ruche");
    // « vélo » ne s'écrit pas avec « ch » : il ne peut pas servir de modèle.
    expect(f.mots).not.toContain("vélo");
  });

  it("mêle des mots du son et des intrus dans l'exercice à entourer", () => {
    const f = fabriquerFiche(REGLAGES_PAR_DEFAUT, 7);
    expect(f.aEntourer.length).toBeGreaterThan(6);
    for (const { mot, dedans } of f.aEntourer) {
      expect(contientLeSon(mot, f.son), `« ${mot} »`).toBe(dedans);
    }
    // Les deux sortes sont présentes : sinon l'exercice n'en est pas un.
    expect(f.aEntourer.some((x) => x.dedans)).toBe(true);
    expect(f.aEntourer.some((x) => !x.dedans)).toBe(true);
  });

  it("creuse les mots à compléter là où est le graphème", () => {
    const f = fabriquerFiche({ ...REGLAGES_PAR_DEFAUT, son: "ou" }, 4);
    for (const { trou, reponse } of f.aCompleter) {
      expect(trou).toContain("…");
      expect(trou.replace("…", "ou")).toBe(reponse);
    }
  });

  it("rend la même fiche à graine égale, une autre sinon", () => {
    const a = fabriquerFiche(REGLAGES_PAR_DEFAUT, 12);
    const b = fabriquerFiche(REGLAGES_PAR_DEFAUT, 12);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(fabriquerFiche(REGLAGES_PAR_DEFAUT, 13)));
  });

  it("supporte un son inconnu et un titre vide", () => {
    const f = fabriquerFiche({ ...REGLAGES_PAR_DEFAUT, son: "xyz", titre: "" }, 1);
    expect(f.son.id).toBe(SONS[0].id);
    expect(f.titre).toContain("Le son");
  });
});
