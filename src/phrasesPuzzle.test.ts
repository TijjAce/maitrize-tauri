import { describe, expect, it } from "vitest";
import { FAMILLES, ONGLETS, PARTIES_DU_FRANCAIS } from "./catalogueAteliers";
import { CODE_PAR_DEFAUT, hexDe } from "./codeDeLaPhrase";
import {
  REGLAGES_PUZZLE, THEMES_DE_PUZZLE, combienDePhrases, contourDePiece, htmlPuzzle, mesures, motDeLImage, quelquesPhrases, reglagesPuzzle,
  type PiecesDuPuzzle,
} from "./phrasesPuzzle";
import { sourceDeLAtelier } from "./sourcesDesAteliers";

let n = 100;
const pieces = (id = "ferme"): PiecesDuPuzzle => {
  const t = THEMES_DE_PUZZLE.find((x) => x.id === id)!;
  return { sujet: t.pieces.sujet.map((mot) => ({ id: n++, mot })), verbe: t.pieces.verbe.map((mot) => ({ id: n++, mot })), complement: t.pieces.complement.map((mot) => ({ id: n++, mot })) };
};
const pages = (html: string) => html.split('<div class="page">').length - 1;

describe("les phrases en puzzle (demande de l'enseignant, 31 octobre 2026)", () => {
  it("cherchent l'image d'une pièce par son nom, ou par l'infinitif de son verbe", () => {
    expect(motDeLImage("le fermier", "sujet")).toBe("fermier");
    expect(motDeLImage("la petite fille", "sujet")).toBe("fille");
    expect(motDeLImage("l'éléphant", "sujet")).toBe("éléphant");
    expect(motDeLImage("les poules", "complement")).toBe("poule");
    expect(motDeLImage("une pomme rouge", "complement")).toBe("pomme");
    expect(motDeLImage("maman", "sujet")).toBe("maman");
    expect(motDeLImage("nourrit", "verbe")).toBe("nourrir");
    expect(motDeLImage("regarde", "verbe")).toBe("regarder");
    expect(motDeLImage("lit", "verbe")).toBe("lire");
    expect(motDeLImage("prend", "verbe")).toBe("prendre");
  });

  it("ne s'emboîtent que dans l'ordre : un tenon au sujet, une encoche et un tenon au verbe, une encoche au complément", () => {
    const m = mesures("grandes");
    expect(m.tenon).toBeCloseTo(2.5 + Math.sqrt(5.5 ** 2 - 4 ** 2) + 5.5, 0);
    const tenon = "A 5.5 5.5 0 1 1";
    const encoche = "A 5.5 5.5 0 1 0";
    const sujet = contourDePiece("sujet", m), verbe = contourDePiece("verbe", m), complement = contourDePiece("complement", m);
    expect([sujet.includes(tenon), sujet.includes(encoche)]).toEqual([true, false]);
    expect([verbe.includes(tenon), verbe.includes(encoche)]).toEqual([true, true]);
    expect([complement.includes(tenon), complement.includes(encoche)]).toEqual([false, true]);
    // Le tenon et l'encoche ont le même col : l'un entre dans l'autre.
    expect(sujet).toContain(`V ${m.hauteur / 2 - m.demiCol}`);
    expect(complement).toContain(`V ${m.hauteur / 2 + m.demiCol}`);
  });

  it("font des phrases qui se tiennent toutes : des sujets au singulier, et assez de pièces pour beaucoup de phrases", () => {
    for (const t of THEMES_DE_PUZZLE) {
      for (const s of t.pieces.sujet) expect(s, t.id).not.toMatch(/^(les|des|mes|ses) /);
      expect(t.pieces.sujet.length * t.pieces.verbe.length * t.pieces.complement.length, t.id).toBeGreaterThanOrEqual(60);
    }
    const p = pieces();
    expect(combienDePhrases(p)).toBe(80);
    expect(quelquesPhrases(p)).toEqual(["Le fermier regarde les poules.", "La fermière caresse le cheval.", "Le chien lave un mouton."]);
  });

  it("s'impriment en un groupe de pages par sachet, la règle en tête, puis les étiquettes des sachets", () => {
    const p = pieces();
    const html = htmlPuzzle(p, {}, REGLAGES_PUZZLE, CODE_PAR_DEFAUT);
    expect(html).toContain("Les sujets — à découper (4)");
    expect(html).toContain("Les verbes — à découper (4)");
    expect(html).toContain("Les compléments — à découper (5)");
    expect(html).toContain("4 × 4 × 5 = 80 phrases");
    expect(html).toContain(">SUJET<");
    expect(html).toContain(">COMPLÉMENT<");
    expect(html).toContain("LE FERMIER");
    // Aux couleurs du code de la classe : la teinte du sujet en fond de ses pièces.
    expect(html).toContain(`fill="${hexDe(CODE_PAR_DEFAUT, "sujet")}24"`);
    expect(pages(html)).toBe(4);
    // Sans le code, des pièces blanches ; en script, les mots tels qu'écrits ; sans sachets, pas de dernière page.
    const blanc = htmlPuzzle(p, {}, { ...REGLAGES_PUZZLE, code: false, ecriture: "script", sachets: false }, CODE_PAR_DEFAUT);
    expect(blanc).not.toContain(`${hexDe(CODE_PAR_DEFAUT, "sujet")}24`);
    expect(blanc).toContain("le fermier");
    expect(pages(blanc)).toBe(3);
    // Douze sujets : la première page, qui porte la règle, en prend huit ; la suivante, le reste.
    const beaucoup = { ...p, sujet: Array.from({ length: 12 }, (_, i) => ({ id: null, mot: `le sujet ${i + 1}` })) };
    expect(pages(htmlPuzzle(beaucoup, {}, { ...REGLAGES_PUZZLE, sachets: false }, CODE_PAR_DEFAUT))).toBe(4);
  });

  it("relisent leurs réglages, et ont leur atelier dans « Lecture et écriture », avec leur source", () => {
    expect(reglagesPuzzle({ taille: "petites", ecriture: "script", code: false })).toEqual({ taille: "petites", ecriture: "script", code: false, images: true, sachets: true });
    expect(reglagesPuzzle({})).toEqual(REGLAGES_PUZZLE);
    expect((ONGLETS as readonly string[]).includes("phrasesPuzzle")).toBe(true);
    expect(FAMILLES.flatMap((f) => f.outils).find((o) => o.id === "phrasesPuzzle")?.nom).toBe("Les phrases en puzzle");
    expect(PARTIES_DU_FRANCAIS.find((p) => p.id === "ecrit")!.outils).toContain("phrasesPuzzle");
    expect(sourceDeLAtelier("phrasesPuzzle")).toMatch(/^Source inconnue.*programme de français du cycle 2/);
  });
});
