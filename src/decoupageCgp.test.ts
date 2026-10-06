import { describe, it, expect } from "vitest";
import { clesDe, decouper, structure } from "./decoupageCgp";

/** Les clés d'un mot, à la suite : « ch a t-muet ». */
const cles = (mot: string, syllabe = false) => decouper(mot, { syllabe }).map((m) => m.cle).join(" ");

describe("le découpage d'un mot en graphèmes", () => {
  it("lit les règles qu'on enseigne au CP", () => {
    expect(cles("chat")).toBe("ch a t-muet");
    expect(cles("rose")).toBe("r o s-z e-muet");
    expect(cles("chasseur")).toBe("ch a ss eu r");
    expect(cles("cheval")).toBe("ch e v a l");
    expect(cles("garçon")).toBe("g a r ç on");
    expect(cles("cerise")).toBe("c-s e r i s-z e-muet");
    expect(cles("pigeon")).toBe("p i ge on");
    expect(cles("nageur")).toBe("n a g-j eu r");
    expect(cles("guitare")).toBe("gu i t a r e-muet");
    expect(cles("lampe")).toBe("l am p e-muet");
    expect(cles("pomme")).toBe("p o mm e-muet");
    expect(cles("banane")).toBe("b a n a n e-muet");
    expect(cles("chien")).toBe("ch i-yod en-in");
    expect(cles("science")).toBe("sc i-yod en c-s e-muet");
    expect(cles("ourson")).toBe("ou r s-ss on");
    expect(cles("attention")).toBe("a cons-double en t-s i-yod on");
    expect(cles("exemple")).toBe("e-cc x-gz em p l e-muet");
    expect(cles("taxi")).toBe("t a x-ks i");
  });

  it("reconnaît les e : muet, [ə], [e], [ɛ]", () => {
    expect(cles("le")).toBe("l e");
    expect(cles("que")).toBe("qu e");
    expect(cles("les")).toBe("l es");
    expect(cles("tables")).toBe("t a b l e-muet s-muet");
    expect(cles("chanter")).toBe("ch an t er-final");
    expect(cles("hiver")).toBe("h i v finale");
    expect(cles("jouet")).toBe("j ou et-final");
    expect(cles("belle")).toBe("b e-double e-muet");
    expect(cles("merci")).toBe("m e-cc r c-s i");
    expect(cles("bec")).toBe("b e-finale");
    expect(cles("pied")).toBe("p i-yod er-final");
  });

  it("reconnaît le yod, les ill, les il", () => {
    expect(cles("fille")).toBe("f i ill-yod e-muet");
    expect(cles("ville")).toBe("v i ll e-muet");
    expect(cles("paille")).toBe("p a ill-yod e-muet");
    expect(cles("abeille")).toBe("a b ill-yod e-muet");
    expect(cles("soleil")).toBe("s o l il");
    expect(cles("fauteuil")).toBe("f au t eu il");
    expect(cles("crayon")).toBe("c-k r ay on");
    expect(cles("amie")).toBe("a m i e-muet");
    expect(cles("lion")).toBe("l i-yod on");
  });

  it("garde les lettres muettes de fin de mot, et celles qu'on entend", () => {
    expect(cles("loup")).toBe("l ou muette-3");
    expect(cles("blanc")).toBe("b l an muette-3");
    expect(cles("sac")).toBe("s a c-k");
    expect(cles("ours")).toBe("ou r finale");
    expect(cles("riz")).toBe("r i z-muet");
    expect(cles("deux")).toBe("d eu x-muet");
  });

  it("donne les mots qui échappent aux règles une à une", () => {
    expect(cles("femme")).toBe("f emm e-muet");
    expect(cles("monsieur")).toContain("rare");
    expect(cles("et")).toBe("et-final");
    expect(cles("oui")).toBe("ou-w i");
  });

  it("lit les suites de mots : apostrophes, traits d'union, verbes avec « ils »", () => {
    expect(cles("toile d'araignée")).toBe("t oi l e-muet d a r ai gn é e-muet");
    expect(cles("chauve-souris")).toBe("ch au v e-muet s ou r i s-muet");
    expect(cles("ils chantent")).toBe("i l s-muet ch an t ent-muet");
    // Sans « ils », -ent est la nasale de dent.
    expect(cles("dent")).toBe("d en t-muet");
    expect(clesDe(decouper("joujou"))).toEqual(["j", "ou"]);
  });

  it("lit une syllabe seule sans lettre muette", () => {
    expect(cles("che", true)).toBe("ch e");
    expect(cles("per", true)).toBe("p e-cc r");
    expect(cles("chez", true)).toBe("ch ez");
    expect(cles("tail", true)).toBe("t a il");
  });

  it("mesure les structures de syllabes : CV, VC, puis CVC et CCV", () => {
    expect(structure(decouper("joli"))).toBe(0);
    expect(structure(decouper("il"))).toBe(1);
    expect(structure(decouper("ourlé"))).toBe(1);
    expect(structure(decouper("jour"))).toBe(2);
    expect(structure(decouper("fleur"))).toBe(2);
  });
});
