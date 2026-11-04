import { describe, expect, it } from "vitest";
import {
  REGLAGES_PRONOMS, htmlPronoms, lireRemplacants, motsADessinerPronoms, personnes, pronomEtVerbe, reglagesPronomsSurs, titrePronoms,
} from "./affichePronoms";

const pronomsAffiches = (html: string) => [...html.matchAll(/class="pp-pronom">([^<]+)</g)].map((m) => m[1]);

describe("Les pronoms personnels sujets", () => {
  it("range les six pronoms du guide : qui parle, à qui l'on parle, de qui l'on parle", () => {
    expect(pronomsAffiches(htmlPronoms({}))).toEqual(["je", "nous", "tu", "vous", "il, elle", "ils, elles"]);
    expect(personnes({ on: false }).map((p) => p.role)).toEqual(["celle qui parle", "celle à qui l'on parle", "celle de qui l'on parle"]);
  });

  it("commence par le singulier, comme au CE1, et ajoute « on » sur demande", () => {
    expect(pronomsAffiches(htmlPronoms({ pluriel: false }))).toEqual(["je", "tu", "il, elle"]);
    expect(pronomsAffiches(htmlPronoms({ on: true }))).toContain("il, elle, on");
    expect(titrePronoms({ pluriel: false })).toBe("Les pronoms personnels sujets du singulier");
  });

  it("conjugue le verbe choisi au présent, et élide je", () => {
    expect(pronomEtVerbe("je", "chanter")).toBe("je chante");
    expect(pronomEtVerbe("je", "aimer")).toBe("j'aime");
    expect(pronomEtVerbe("je", "avoir")).toBe("j'ai");
    expect(pronomEtVerbe("elles", "être")).toBe("elles sont");
    expect(pronomEtVerbe("vous", "faire")).toBe("vous faites");
    const html = htmlPronoms({ verbe: "chanter" });
    expect(html).toContain("nous chantons");
    expect(html).toContain("il chante, elle chante");
    expect(htmlPronoms({ verbe: "" })).not.toContain("pp-exemple");
  });

  it("nomme la personne et le nombre, ou les laisse percevoir sans les nommer", () => {
    expect(htmlPronoms({})).toContain("1re personne");
    expect(htmlPronoms({})).toContain(">singulier<");
    const sansNoms = htmlPronoms({ noms: false });
    expect(sansNoms).not.toContain("1re personne");
    expect(sansNoms).not.toContain(">singulier<");
    expect(sansNoms).toContain("celle qui parle");
    expect(htmlPronoms({ noms: false, roles: false })).not.toContain("pp-personne");
  });

  it("dit ce que remplace le pronom, avec les exemples du guide", () => {
    expect(lireRemplacants("la voiture → elle\nles jouets -> ils\nle chat : il\nrien")).toEqual([
      { groupe: "la voiture", pronom: "elle", dessin: "voiture" },
      { groupe: "les jouets", pronom: "ils", dessin: "jouets" },
      { groupe: "le chat", pronom: "il", dessin: "chat" },
    ]);
    expect(htmlPronoms({})).toContain("Il remplace un groupe nominal");
    expect(htmlPronoms({ avecRemplacants: false })).not.toContain("Il remplace");
    expect(motsADessinerPronoms({})).toEqual(expect.arrayContaining(["je", "elles", "jouets", "jouet", "voiture"]));
  });

  it("met les pictogrammes et la mention d'ARASAAC quand il y en a", () => {
    const html = htmlPronoms({}, { je: "data:image/png;base64,AAAA", jouet: "data:image/png;base64,BBBB" });
    expect(html).toContain('src="data:image/png;base64,AAAA"');
    // « les jouets » prend le dessin de son singulier quand le pluriel n'en a pas.
    expect(html).toContain('src="data:image/png;base64,BBBB"');
    expect(html).toContain("ARASAAC");
    expect(htmlPronoms({})).not.toContain("ARASAAC");
    expect(htmlPronoms({ format: "cahier" }).match(/pp-petit/g)).toHaveLength(4);
  });

  it("répare des réglages abîmés", () => {
    expect(reglagesPronomsSurs(undefined)).toEqual(REGLAGES_PRONOMS);
    expect(reglagesPronomsSurs({ verbe: "manger" }).verbe).toBe("manger");
    expect(reglagesPronomsSurs({ verbe: "<script>" }).verbe).toBe("chanter");
    expect(reglagesPronomsSurs({ verbe: "" }).verbe).toBe("");
  });
});
