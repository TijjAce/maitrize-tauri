import { describe, it, expect } from "vitest";
import {
  CODE_LECTURE_PAR_DEFAUT, REGLAGES_CARTE_LECTURE, SIGNES, exempleCode, groupeMarque, htmlCodeDeLaLecture, lireCodeLecture, nomDuSigne,
  reglagesCarteLectureSurs, signe,
} from "./codeDeLaLecture";

describe("le code de la lecture à voix haute", () => {
  it("se relit réparé : ce qui manque ou ne se connaît pas reprend le code proposé", () => {
    expect(lireCodeLecture(undefined)).toEqual(CODE_LECTURE_PAR_DEFAUT);
    expect(lireCodeLecture({ liaison: { couleur: "vert", forme: "_" }, pauseCourte: { couleur: "fuchsia", forme: "~" } })).toEqual({
      ...CODE_LECTURE_PAR_DEFAUT, liaison: { couleur: "vert", forme: "_" },
    });
    // Le code proposé reprend les signes des feuilles : l'arc, une barre, deux barres, les flèches.
    expect(CODE_LECTURE_PAR_DEFAUT.liaison.forme).toBe("‿");
    expect(CODE_LECTURE_PAR_DEFAUT.pauseCourte.forme).toBe("/");
    expect(CODE_LECTURE_PAR_DEFAUT.pauseLongue.forme).toBe("//");
    expect(CODE_LECTURE_PAR_DEFAUT.tonMonte.forme).toBe("↗");
  });

  it("se lit en noir et blanc : dans le code proposé, chaque signe a sa forme propre", () => {
    const formes = SIGNES.map((s) => `${s.id === "groupeSouffle" ? "groupe" : ""}${CODE_LECTURE_PAR_DEFAUT[s.id].forme}`);
    expect(new Set(formes).size).toBe(formes.length);
    expect(SIGNES.every((s) => s.formes.some((f) => f.id === s.defaut.forme))).toBe(true);
    // Ce que fait la voix se dit à la première personne.
    expect(SIGNES.every((s) => /^(Je|Ma|La) /.test(s.voix)), SIGNES.map((s) => s.voix).join(" | ")).toBe(true);
  });

  it("dessine ses signes en ligne, et la consigne les nomme avec leur couleur", () => {
    expect(signe(CODE_LECTURE_PAR_DEFAUT, "pauseCourte")).toBe('<span class="cl-pauseCourte" style="color:#1d4ed8;font-weight:800">/</span>');
    expect(nomDuSigne(CODE_LECTURE_PAR_DEFAUT, "liaison")).toBe("un arc sous les mots ‿ en rouge");
    expect(nomDuSigne({ ...CODE_LECTURE_PAR_DEFAUT, pauseLongue: { couleur: "noir", forme: "■" } }, "pauseLongue")).toBe("un carré ■");
    expect(groupeMarque({ ...CODE_LECTURE_PAR_DEFAUT, groupeSouffle: { couleur: "vert", forme: "entoure" } }, "le chat & moi")).toContain("le chat &amp; moi");
    const exemple = exempleCode(CODE_LECTURE_PAR_DEFAUT, "[Ce matin,/] [les‿enfants] [jouent.//↘]");
    expect((exemple.match(/class="vh-groupe"/g) ?? []).length).toBe(3);
    expect(exemple).toContain("cl-liaison");
    expect(exemple).toContain("cl-pauseCourte");
    expect(exemple).toContain("cl-pauseLongue");
    expect(exemple).toContain("cl-tonDescend");
    // Les crochets du groupe sont devenus sa marque ; les barres restent, ce sont les signes.
    expect(exemple).not.toMatch(/\[|\]/);
  });

  it("imprime sa carte : deux par page, ou l'affiche ; les signes et ce que fait la voix au choix", () => {
    const compter = (h: string) => (h.match(/class="cl-carte"/g) ?? []).length;
    expect(compter(htmlCodeDeLaLecture(CODE_LECTURE_PAR_DEFAUT, REGLAGES_CARTE_LECTURE))).toBe(2);
    expect(compter(htmlCodeDeLaLecture(CODE_LECTURE_PAR_DEFAUT, { ...REGLAGES_CARTE_LECTURE, format: "affiche" }))).toBe(1);
    const tout = htmlCodeDeLaLecture(CODE_LECTURE_PAR_DEFAUT, REGLAGES_CARTE_LECTURE);
    expect((tout.match(/class="cl-ligne"/g) ?? []).length).toBe(2 * SIGNES.length);
    const sansSuite = htmlCodeDeLaLecture(CODE_LECTURE_PAR_DEFAUT, { ...REGLAGES_CARTE_LECTURE, caches: ["suite"], voix: false });
    expect(sansSuite).not.toContain("La phrase continue");
    expect(sansSuite).not.toContain("cl-voix");
    expect(reglagesCarteLectureSurs({ format: "poster" as never, caches: ["inconnu" as never, "liaison"] })).toEqual({ ...REGLAGES_CARTE_LECTURE, caches: ["liaison"] });
  });
});
