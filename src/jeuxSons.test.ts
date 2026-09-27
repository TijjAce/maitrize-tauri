import { describe, it, expect } from "vitest";
import { hasard } from "./hasard";
import {
  PAIRES_DISTINCTIVES, comptesDisponibles, dominos, htmlDominos, htmlIntrus, htmlLettres, htmlLotoSyllabes, htmlPaires,
  lettresChoisies, lignesIntrus, motsDesPaires, motsSimples, nbSyllabes, pairesQuiSenchainent, planchesLettres, planchesLotoSyllabes,
  REGLAGES_LETTRES, REGLAGES_LOTO_SYLLABES, type MotImage,
} from "./jeuxSons";
import { grilleFluence, htmlFluence, htmlSyllabaire, pseudoMots, REGLAGES_FLUENCE, REGLAGES_SYLLABAIRE } from "./fluence";
import { sonDe } from "./lectureSons";

const mots = (liste: string[]): MotImage[] => liste.map((mot, i) => ({ id: i + 1, mot }));
const BANQUE = mots(["bateau", "banane", "ballon", "tapis", "micro", "crocodile", "château", "tomate", "lapin", "pinceau", "sapin", "chat", "chapeau", "pomme de terre", "vélo", "lit"]);

describe("le loto des syllabes", () => {
  it("ne met sur une planche que des comptes qu'un mot peut remplir", () => {
    const r = { ...REGLAGES_LOTO_SYLLABES, planches: 3, cases: 6 as const, maximum: 3 };
    const planches = planchesLotoSyllabes(BANQUE, r, hasard(1));
    expect(planches).toHaveLength(3);
    const dispo = comptesDisponibles(BANQUE, r);
    for (const pl of planches) {
      expect(pl).toHaveLength(6);
      for (const n of pl) expect(dispo).toContain(n);
      // Jamais plus de cases « n » que de mots de n syllabes.
      for (const n of dispo) expect(pl.filter((x) => x === n).length).toBeLessThanOrEqual(BANQUE.filter((m) => nbSyllabes(m, false) === n).length);
    }
  });

  it("respecte le compte fixé par l'enseignant, et se tait sans mots", () => {
    expect(nbSyllabes({ id: 1, mot: "table", syllabes: 2 }, false)).toBe(2);
    expect(nbSyllabes({ id: 1, mot: "table" }, true)).toBe(2);
    expect(planchesLotoSyllabes([], REGLAGES_LOTO_SYLLABES, hasard(1))).toEqual([]);
    const html = htmlLotoSyllabes(planchesLotoSyllabes(BANQUE, REGLAGES_LOTO_SYLLABES, hasard(2)), BANQUE, { 1: "data:x" }, REGLAGES_LOTO_SYLLABES);
    expect(html).toContain("planche 1");
    expect(html).toContain('<img src="data:x"');
    expect(html).toContain("ARASAAC");
  });
});

describe("les dominos des syllabes", () => {
  it("enchaînent la rime de l'un à l'attaque de l'autre, en boucle, sans mot composé", () => {
    const paires = pairesQuiSenchainent(BANQUE, hasard(3));
    expect(paires.length).toBeGreaterThanOrEqual(3);
    const tous = paires.flat().map((m) => m.mot);
    expect(new Set(tous).size).toBe(tous.length);
    expect(tous).not.toContain("pomme de terre");
    const pieces = dominos(paires);
    expect(pieces).toHaveLength(paires.length);
    // La droite de chaque pièce est le X d'une paire dont le Y ouvre la pièce suivante.
    for (let i = 0; i < pieces.length; i++) {
      const suivante = pieces[(i + 1) % pieces.length];
      const paire = paires.find((p) => p[0] === pieces[i].droite)!;
      expect(suivante.gauche).toBe(paire[1]);
    }
    expect(htmlDominos(pieces, {}, true)).toContain("ls-domino");
  });

  it("ne trouvent rien dans une liste qui ne s'enchaîne pas", () => {
    expect(pairesQuiSenchainent(mots(["chat", "vélo", "lit"]), hasard(1))).toEqual([]);
    expect(motsSimples(mots(["pomme de terre", "arc-en-ciel", "chat"])).map((m) => m.mot)).toEqual(["chat"]);
  });
});

describe("la chasse à l'intrus", () => {
  it("met trois mots de même attaque et un intrus, comme le guide", () => {
    const lignes = lignesIntrus(BANQUE, "attaque", 3, hasard(4));
    expect(lignes.length).toBeGreaterThanOrEqual(1);
    for (const l of lignes) {
      expect(l.mots).toHaveLength(4);
      expect(l.mots).toContain(l.intrus);
      const autres = l.mots.filter((m) => m !== l.intrus).map((m) => m.mot);
      expect(autres).toHaveLength(3);
    }
    const ba = lignes.find((l) => l.cle === "ba");
    expect(ba).toBeDefined();
    expect(ba!.mots.filter((m) => m !== ba!.intrus).map((m) => m.mot).sort()).toEqual(["ballon", "banane", "bateau"]);
    expect(htmlIntrus(lignes, {}, "attaque", false, true)).toContain("corrigé");
  });

  it("sait aussi jouer sur la rime", () => {
    const lignes = lignesIntrus(mots(["lapin", "sapin", "pépin", "requin", "matin", "chat", "vélo"]), "rime", 2, hasard(5));
    expect(lignes.length).toBeGreaterThanOrEqual(1);
    expect(lignes[0].cle).toBe("pI");
  });
});

describe("les paires distinctives", () => {
  it("viennent du livret pour les huit premières, et sortent en autant de jeux qu'on veut", () => {
    expect(PAIRES_DISTINCTIVES.filter((p) => p.source === "livret")).toHaveLength(8);
    expect(PAIRES_DISTINCTIVES.every((p) => p.a !== p.b && p.sons.includes("/"))).toBe(true);
    const deux = motsDesPaires(PAIRES_DISTINCTIVES.slice(0, 8), 2);
    expect(deux).toHaveLength(32);
    expect(deux.slice(0, 2)).toEqual(["manche", "mange"]);
    const html = htmlPaires(PAIRES_DISTINCTIVES.slice(0, 2), 1, { manche: "data:m" }, true);
    expect(html).toContain("Le trésor");
    expect(html).toContain('<img src="data:m"');
  });
});

describe("les lettres", () => {
  it("font des planches de loto sans doublon et un mistigri de plus", () => {
    const lettres = lettresChoisies("a b c d é e f g h i j k l m ! 3");
    expect(lettres).toEqual(["a", "b", "c", "d", "é", "e", "f", "g", "h", "i", "j", "k", "l", "m"]);
    for (const pl of planchesLettres(lettres, 3, hasard(6))) {
      expect(pl).toHaveLength(9);
      expect(new Set(pl).size).toBe(9);
    }
    const mistigri = htmlLettres({ ...REGLAGES_LETTRES, jeu: "mistigri" }, hasard(1));
    expect((mistigri.match(/class="carte /g) ?? []).length).toBe(REGLAGES_LETTRES.lettres.length * 2 + 1);
    expect(htmlLettres({ ...REGLAGES_LETTRES, jeu: "ophtalmologue" }, hasard(1))).toContain("ophtalmologue");
    expect(htmlLettres({ ...REGLAGES_LETTRES, jeu: "loto", planches: 2 }, hasard(1))).toContain("planche 2");
  });
});

describe("la grille de fluence", () => {
  it("remplit ses lignes et compte en cumulé", () => {
    const g = grilleFluence({ ...REGLAGES_FLUENCE, lignes: 5 }, 7);
    expect(g.lignes).toHaveLength(5);
    expect(g.lignes.every((l) => l.length === 5 && l.every(Boolean))).toBe(true);
    expect(g.cumul).toEqual([5, 10, 15, 20, 25]);
    expect(grilleFluence({ ...REGLAGES_FLUENCE, lignes: 5 }, 7)).toEqual(g);
    const html = htmlFluence(g, { ...REGLAGES_FLUENCE, puissance4: true });
    expect(html).toContain("Jour 4");
    expect(html).toContain("Quatre jetons alignés");
  });

  it("invente des pseudo-mots qui ne sont pas des mots du son", () => {
    const son = sonDe("ch")!;
    const pseudos = pseudoMots(son, 8, hasard(8));
    expect(pseudos.length).toBe(8);
    expect(pseudos.some((p) => son.mots.includes(p))).toBe(false);
  });

  it("dessine le syllabaire avec ses bandes", () => {
    const html = htmlSyllabaire(REGLAGES_SYLLABAIRE);
    expect((html.match(/sy-cell/g) ?? []).length).toBe(REGLAGES_SYLLABAIRE.consonnes.length + REGLAGES_SYLLABAIRE.voyelles.length);
  });
});
