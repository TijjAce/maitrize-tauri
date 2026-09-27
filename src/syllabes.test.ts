import { describe, it, expect } from "vitest";
import { attaque, cleSon, compterSyllabes, decouperSyllabes, rime } from "./syllabes";

describe("les syllabes orales", () => {
  it("scandent comme en classe", () => {
    const cas: [string, string[]][] = [
      ["lapin", ["la", "pin"]], ["papillon", ["pa", "pi", "llon"]], ["chat", ["chat"]], ["tortue", ["tor", "tue"]],
      ["banane", ["ba", "nane"]], ["crocodile", ["cro", "co", "dile"]], ["éléphant", ["é", "lé", "phant"]],
      ["ordinateur", ["or", "di", "na", "teur"]], ["oiseau", ["oi", "seau"]], ["maison", ["mai", "son"]],
      ["bateau", ["ba", "teau"]], ["ballon", ["ba", "llon"]], ["tapis", ["ta", "pis"]], ["micro", ["mi", "cro"]],
      ["crayon", ["cra", "yon"]], ["pyjama", ["py", "ja", "ma"]],
      ["pluie", ["pluie"]], ["poisson", ["poi", "sson"]], ["fromage", ["fro", "mage"]], ["barque", ["barque"]],
      ["pommes", ["pommes"]], ["école", ["é", "cole"]], ["le", ["le"]], ["girafe", ["gi", "rafe"]],
    ];
    for (const [mot, attendu] of cas) expect(decouperSyllabes(mot), mot).toEqual(attendu);
  });

  it("comptent, à l'oral ou à l'écrit, et à travers les mots composés", () => {
    expect(compterSyllabes("table")).toBe(1);
    expect(compterSyllabes("table", { ecrites: true })).toBe(2);
    // « Chambre » et « arbre » finissent en consonnes : une syllabe à l'oral, deux à l'écrit.
    expect(decouperSyllabes("chambre")).toEqual(["chambre"]);
    expect(decouperSyllabes("chambre", { ecrites: true })).toEqual(["cham", "bre"]);
    expect(decouperSyllabes("arbre", { ecrites: true })).toEqual(["ar", "bre"]);
    expect(compterSyllabes("pomme de terre")).toBe(3);
    expect(compterSyllabes("arc-en-ciel")).toBe(3);
    expect(compterSyllabes("")).toBe(0);
    expect(compterSyllabes("Maïs")).toBe(2);
  });
});

describe("ce que les syllabes font entendre", () => {
  it("rapproche ce qui sonne pareil", () => {
    expect(cleSon("teau")).toBe(cleSon("to"));
    expect(cleSon("seau")).toBe(cleSon("so"));
    expect(cleSon("mai")).toBe(cleSon("mè"));
    expect(cleSon("ce")).toBe(cleSon("se"));
    expect(cleSon("ca")).toBe(cleSon("ka"));
    expect(cleSon("dile")).toBe(cleSon("dil"));
    expect(cleSon("pha")).toBe(cleSon("fa"));
    expect(cleSon("llon")).toBe(cleSon("lon"));
    expect(cleSon("pin")).toBe(cleSon("pain"));
    // « nane » (banane) n'est pas nasal : le e final fait sonner le n.
    expect(cleSon("nane")).toBe("nan");
    expect(cleSon("nan")).toBe("nA");
    expect(decouperSyllabes("guitare")).toEqual(["gui", "tare"]);
  });

  it("distingue ce qui ne sonne pas pareil", () => {
    expect(cleSon("pou")).not.toBe(cleSon("pu"));
    expect(cleSon("cha")).not.toBe(cleSon("sa"));
    expect(cleSon("ban")).not.toBe(cleSon("ba"));
    expect(cleSon("bon")).not.toBe(cleSon("ban"));
  });

  it("donne l'attaque et la rime des exemples du guide", () => {
    // « bateau, banane, tapis, ballon » : trois attaques « ba », un intrus.
    expect(new Set(["bateau", "banane", "ballon"].map(attaque)).size).toBe(1);
    expect(attaque("tapis")).not.toBe(attaque("bateau"));
    // « micro – crocodile » : la rime de l'un est l'attaque de l'autre.
    expect(rime("micro")).toBe(attaque("crocodile"));
    expect(rime("château")).toBe(attaque("tomate"));
    // Le « s » de bisou sonne « z » : il ne s'enchaîne pas avec souris, mais avec zoo.
    expect(rime("bisou")).not.toBe(attaque("souris"));
    expect(rime("bisou")).toBe(attaque("zoulou"));
    expect(rime("poisson")).toBe(attaque("songer"));
  });
});
