import { describe, it, expect } from "vitest";
import {
  CONSIGNE_MAX, CONSIGNES_MAX, avecChoix, demandesDe, ecrireConsignes, htmlDuTapuscrit, infinitifsPossibles, lireChoix, lireConsignes,
  motPrincipal, motsDeLaConsigne, pictoDuMot, singuliers, type MotDeConsigne,
} from "./tapuscrit";

/** Les mots d'une consigne, réduits à ce qu'on en vérifie : le mot, sa clé, ce qu'on demande à la banque. */
const resume = (consigne: string) =>
  motsDeLaConsigne(consigne).map((m) => [m.texte, m.cle, m.demande.verbes.join("|"), m.demande.noms.join("|")]);

describe("les consignes d'une séance", () => {
  it("se gardent une par ligne, bornées, sans ligne vide", () => {
    expect(lireConsignes("  Découpe les étiquettes.\n\n Colle-les dans l'ordre.  \r\n")).toEqual(["Découpe les étiquettes.", "Colle-les dans l'ordre."]);
    expect(lireConsignes(undefined)).toEqual([]);
    expect(ecrireConsignes(["  Lis   la phrase. ", "", "Entoure le mot."])).toBe("Lis la phrase.\nEntoure le mot.");
    expect(ecrireConsignes(["a".repeat(CONSIGNE_MAX + 30)])).toHaveLength(CONSIGNE_MAX);
    expect(lireConsignes(ecrireConsignes(Array.from({ length: 12 }, (_, i) => `Consigne ${i + 1}.`)))).toHaveLength(CONSIGNES_MAX);
  });
});

describe("les mots d'une consigne", () => {
  it("reconnaissent les verbes de consigne en tête d'action, et laissent les petits mots écrits", () => {
    expect(resume("Découpe les étiquettes et colle-les dans l'ordre de l'histoire.")).toEqual([
      ["Découpe", "découper", "découper", ""],
      ["les", "", "", ""],
      ["étiquettes", "étiquettes", "", "étiquettes|étiquette"],
      ["et", "", "", ""],
      ["colle", "coller", "coller", ""],
      ["les", "", "", ""],
      ["dans", "dans", "", "dans"],
      ["l’", "", "", ""],
      ["ordre", "ordre", "", "mettre dans l'ordre|ordre"],
      ["de", "", "", ""],
      ["l’", "", "", ""],
      ["histoire", "histoire", "", "histoire"],
    ]);
  });

  it("lisent la place du mot : « Range ta classe », c'est ranger, puis la classe", () => {
    const mots = motsDeLaConsigne("Range ta classe, puis classe les mots.");
    expect(mots.map((m) => m.verbe ?? "")).toEqual(["ranger", "", "", "", "classer", "", ""]);
    expect(mots[2]).toMatchObject({ texte: "classe", cle: "classe", demande: { verbes: [], noms: ["classe"] } });
  });

  it("montrent la négation par le « non », et non par le pied", () => {
    const mots = motsDeLaConsigne("Ne colorie pas le cadre.");
    expect(mots.map((m) => [m.texte, m.cle])).toEqual([["Ne", ""], ["colorie", "colorier"], ["pas", "non"], ["le", ""], ["cadre", "cadre"]]);
    // Sans « ne », « pas » reste un petit mot.
    expect(motsDeLaConsigne("Avance d'un pas.").find((m) => m.texte === "pas")?.cle).toBe("");
  });

  it("essaient les infinitifs d'un verbe inconnu en tête d'action, puis le mot lui-même", () => {
    expect(resume("Saute à pieds joints.")[0]).toEqual(["Saute", "saute", "sauter", "saute"]);
    // Un verbe de consigne connu se ramène à son infinitif, qui fait la clé.
    expect(resume("Trace un trait.")[0]).toEqual(["Trace", "tracer", "tracer", ""]);
    expect(resume("Prends ton cahier.")[0]).toEqual(["Prends", "prends", "prendre", "prends|prend"]);
    expect(resume("Lève-toi.")).toEqual([["Lève", "lève", "lever", "lève"], ["toi", "", "", ""]]);
    // Ailleurs dans la phrase, un nom reste un nom.
    expect(resume("Prends le livre.")[2]).toEqual(["livre", "livre", "", "livre"]);
    // Les nombres se dessinent tels quels.
    expect(resume("Prends 3 jetons.")[1]).toEqual(["3", "3", "", "3"]);
  });

  it("cherchent un verbe pronominal sous sa forme pronominale", () => {
    expect(resume("Je me rappelle la règle.")[2]).toEqual(["rappelle", "rappelle", "se rappeler|se rappeller|rappeler|rappeller", "rappelle"]);
    expect(motsDeLaConsigne("Je m'assieds.")[2].demande.verbes).toEqual(["s'asseoir", "se asseoir", "asseoir"]);
  });

  it("donnent le mot principal d'une étape : son verbe, sinon son premier mot de sens", () => {
    expect(motPrincipal("Je travaille seul.")?.texte).toBe("travaille");
    expect(motPrincipal("Découpe les étiquettes.")?.verbe).toBe("découper");
    expect(motPrincipal("La carte mentale du thème")?.texte).toBe("carte");
    expect(motPrincipal("et puis")).toBeNull();
  });

  it("disent « le son » qu'on entend, mais pas « son cahier »", () => {
    expect(motsDeLaConsigne("Entoure le son [a].").find((m) => m.texte === "son")?.cle).toBe("son");
    expect(motsDeLaConsigne("Range son cahier.").find((m) => m.texte === "son")?.cle).toBe("");
  });
});

describe("les infinitifs et les singuliers", () => {
  it("se devinent d'un impératif", () => {
    expect(infinitifsPossibles("observe")).toEqual(["observer"]);
    expect(infinitifsPossibles("répète")).toContain("répéter");
    expect(infinitifsPossibles("essaie")).toContain("essayer");
    expect(infinitifsPossibles("finis")).toEqual(["finir", "finire"]);
    expect(infinitifsPossibles("attends")).toEqual(["attendre"]);
    expect(infinitifsPossibles("choisissez")[0]).toBe("choisir");
    expect(infinitifsPossibles("faites")).toEqual(["faire"]);
  });

  it("se devinent d'un pluriel", () => {
    expect(singuliers("Étiquettes")).toEqual(["étiquettes", "étiquette"]);
    expect(singuliers("chevaux")).toEqual(["chevaux", "cheval", "chevail", "chevau"]);
    expect(singuliers("bus")).toEqual(["bus"]);
    expect(singuliers("fois")).toEqual(["fois"]);
  });
});

describe("le picto d'un mot", () => {
  const [decoupe, , etiquettes, , colle] = motsDeLaConsigne("Découpe les étiquettes et colle-les.");

  it("vient du choix de l'enseignant, puis du lexique de CAA pour un verbe, puis de la banque", () => {
    const banque = { découper: 2547, étiquettes: 27749, coller: 2511 };
    expect(pictoDuMot(decoupe, {}, {}, banque)).toBe(2547);
    expect(pictoDuMot(decoupe, {}, { découper: "bajard:Decoupe.png" }, banque)).toBe("bajard:Decoupe.png");
    expect(pictoDuMot(decoupe, { découper: 9999 }, { découper: 1 }, banque)).toBe(9999);
    // Vidé par l'enseignant : plus de picto, même si la banque en a un.
    expect(pictoDuMot(colle, { coller: 0 }, {}, banque)).toBeNull();
    expect(pictoDuMot(etiquettes, {}, {}, {})).toBeNull();
  });

  it("se demande une fois par mot", () => {
    const mots = motsDeLaConsigne("Colle l'étiquette, puis colle la photo.");
    expect(demandesDe(mots).cles).toEqual(["coller", "étiquette", "photo"]);
  });

  it("se garde par mot, et se lit avec méfiance", () => {
    expect(lireChoix('{"Étiquette": 27749, "coller": 0, "cadre": "sclera:cadre.png", "x": "inconnu", "y": -3, " ": 2}'))
      .toEqual({ étiquette: 27749, coller: 0, cadre: "sclera:cadre.png" });
    expect(lireChoix("pas du json")).toEqual({});
    expect(avecChoix({ a: 1 }, "b", 0)).toEqual({ a: 1, b: 0 });
    expect(avecChoix({ a: 1, b: 2 }, "b", undefined)).toEqual({ a: 1 });
  });
});

describe("le tapuscrit imprimé", () => {
  it("numérote les consignes et pose chaque mot sous son dessin", () => {
    const consignes = ["Découpe les étiquettes.", "Colle-les."].map(motsDeLaConsigne);
    const pictoDe = (m: MotDeConsigne) => pictoDuMot(m, {}, {}, { découper: 2547, coller: 2511 });
    const html = htmlDuTapuscrit(consignes, pictoDe, { 2547: "data:image/png;base64,AAA" });
    expect(html).toContain('<span class="tp-num">1</span>');
    expect(html).toContain('<span class="tp-num">2</span>');
    expect(html).toContain('<img src="data:image/png;base64,AAA" alt=""><span>Découpe</span>');
    // Sans image chargée, le mot reste écrit ; un petit mot se reconnaît.
    expect(html).toContain('<span class="tp-mot"><span>Colle</span></span>');
    expect(html).toContain('<span class="tp-mot tp-petit"><span>les</span></span>');
    expect(htmlDuTapuscrit([], pictoDe, {})).toBe("");
  });
});
