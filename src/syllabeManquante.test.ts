import { describe, it, expect } from "vitest";
import {
  REGLAGES_SYLLABES, consigneDesSyllabes, coteDesDessins, ecrituresEnTete, enTeteDesSyllabes, feuillesDeSyllabes, htmlSyllabes, motsAEcrire, pagesDeSyllabes,
  sonDesSyllabes, syllabesCibles, trouDuMot, trousPossibles, type MotATrou,
} from "./syllabeManquante";
import { ATTRIBUTION_ARASAAC } from "./cartesImprimables";

const CIBLES = ["ma", "mi", "mu"];
const compter = (html: string, re: RegExp) => (html.match(re) ?? []).length;
/** Le mot tel qu'il se lit sur la feuille : « four__ ». */
const troue = (mot: string, cibles = CIBLES, choix = 0) => {
  const t = trouDuMot(mot, cibles, choix);
  return t ? `${mot.slice(0, t.debut)}__${mot.slice(t.fin)}` : null;
};
const mot = (m: string, id: number | null = 100, cibles = CIBLES): MotATrou => ({ mot: m, texte: m, trou: trouDuMot(m, cibles)!, image: `data:${m}`, id });
/** Les douze mots de la fiche du son « m ». */
const FICHE = ["fourmi", "dromadaire", "marteau", "malle", "manège", "mamie", "lama", "mur", "musique", "masque", "cheminée", "marguerite"];

describe("les syllabes à retrouver", () => {
  it("se lisent comme l'enseignant les écrit", () => {
    expect(syllabesCibles("ma, mi, mu")).toEqual(["ma", "mi", "mu"]);
    expect(syllabesCibles("Ma mi  MU")).toEqual(["ma", "mi", "mu"]);
    expect(syllabesCibles("ma, mi ou mu.")).toEqual(["ma", "mi", "mu"]);
    expect(syllabesCibles("ma ; mi\nmu / ma")).toEqual(["ma", "mi", "mu"]);
    // Seul, « ou » est un son ; entre deux syllabes, c'est le mot de liaison.
    expect(syllabesCibles("ou, on")).toEqual(["ou", "on"]);
    expect(syllabesCibles("mou ou fou")).toEqual(["mou", "fou"]);
    expect(syllabesCibles(" , ")).toEqual([]);
    expect(syllabesCibles("a, b, c, d, e, f, g, h, i, j")).toHaveLength(8);
  });

  it("font la consigne", () => {
    expect(consigneDesSyllabes(CIBLES)).toBe("Écris la syllabe qui manque : ma, mi ou mu.");
    expect(consigneDesSyllabes(["la", "le"])).toBe("Écris la syllabe qui manque : la ou le.");
    expect(consigneDesSyllabes(["ma"])).toBe("Écris la syllabe qui manque : ma.");
    expect(consigneDesSyllabes([])).toBe("Écris la syllabe qui manque.");
  });

  it("disent le son étudié quand elles en partagent un", () => {
    expect(sonDesSyllabes(CIBLES)).toEqual({ son: "m", graphies: ["m"] });
    expect(sonDesSyllabes(["la", "ma", "ra"])).toEqual({ son: "a", graphies: ["a"] });
    expect(sonDesSyllabes(["cha", "chi"])).toEqual({ son: "ch", graphies: ["ch"] });
    // Le c de « ca, co, cu » fait le son [k].
    expect(sonDesSyllabes(["ca", "co", "cu"])).toEqual({ son: "k", graphies: ["c"] });
    expect(sonDesSyllabes(["ou"])).toEqual({ son: "ou", graphies: ["ou"] });
    // Une syllabe seule ne dit pas si l'on étudie sa consonne ou sa voyelle.
    expect(sonDesSyllabes(["ma"])).toBeNull();
    expect(sonDesSyllabes(["ma", "li"])).toBeNull();
    expect(sonDesSyllabes([])).toBeNull();
  });
});

describe("le trou d'un mot", () => {
  it("retrouve les mots de la fiche : fourmi, dromadaire, marteau…", () => {
    expect(FICHE.map((m) => troue(m))).toEqual([
      "four__", "dro__daire", "__rteau", "__lle", "__nège", "__mie", "la__", "__r", "__sique", "__sque", "che__née", "__rguerite",
    ]);
  });

  it("ne tombe que là où l'on entend la syllabe", () => {
    // m-ain, m-ai-son, m-an-teau, a-m-an-de : les lettres y sont, pas la syllabe.
    for (const m of ["main", "maison", "manteau", "amande", "mai", "maman".slice(2)]) expect([m, troue(m)]).toEqual([m, null]);
    expect(troue("maman")).toBe("__man");
    // La voyelle qui se fond dans la suivante ne fait pas la syllabe : ca-mion, mi-el, nu-age, mou-ette.
    for (const [m, s] of [["camion", "mi"], ["miel", "mi"], ["lion", "li"], ["piano", "pi"], ["radio", "di"], ["chien", "chi"], ["nuage", "nu"], ["mouette", "mou"], ["lui", "lu"]]) {
      expect([m, troue(m, [s])]).toEqual([m, null]);
    }
    // Devant un e muet ou un son mouillé, elle reste entière : a-mie, fi-lle, ru-e.
    expect(troue("amie")).toBe("a__e");
    expect(troue("fille", ["fi"])).toBe("__lle");
    expect(troue("rue", ["ru"])).toBe("__e");
    expect(troue("pyjama")).toBe("pyja__");
    expect(troue("mouton", ["mo", "mou"])).toBe("__ton");
    expect(trouDuMot("mouton", ["mo", "mou"])?.syllabe).toBe("mou");
    expect(troue("moto", ["mo", "mou"])).toBe("__to");
    expect(troue("chat", CIBLES)).toBeNull();
    // Un son à plusieurs lettres se retire entier.
    expect(troue("vache", ["cha", "che"])).toBe("va__");
    expect(troue("pomme de terre", ["te"])).toBe("pomme de __rre");
    expect(troue("Lama ", CIBLES)).toBe("Lama ".slice(0, 2) + "__" + "Lama ".slice(4));
  });

  it("laisse choisir entre plusieurs syllabes du même mot", () => {
    expect(trousPossibles("mamie", CIBLES).map((t) => `${t.debut}-${t.syllabe}`)).toEqual(["0-ma", "2-mi"]);
    expect(troue("mamie", CIBLES, 1)).toBe("ma__e");
    // Un choix qui n'existe plus — les syllabes ont changé — revient au premier trou.
    expect(troue("mamie", CIBLES, 5)).toBe("__mie");
    expect(trousPossibles("papa", ["pa"]).map((t) => t.debut)).toEqual([0, 2]);
    expect(trousPossibles("lama", [])).toEqual([]);
    expect(trousPossibles("lama", [""])).toEqual([]);
  });
});

describe("les mots à écrire en entier", () => {
  it("sont les plus courts, dans l'ordre de la liste", () => {
    const mots = FICHE.map((m) => ({ texte: m }));
    expect(motsAEcrire(mots, 3).map((m) => m.texte)).toEqual(["malle", "lama", "mur"]);
    expect(motsAEcrire(mots, 0)).toEqual([]);
    expect(motsAEcrire(mots, 99)).toHaveLength(6);
    expect(motsAEcrire([{ texte: "mur" }, { texte: "mur" }, { texte: "lama" }], 3).map((m) => m.texte)).toEqual(["mur", "lama"]);
  });
});

describe("l'en-tête du son", () => {
  it("écrit la lettre, sa majuscule, et les deux en cursive", () => {
    expect(ecrituresEnTete(["m"], "minuscule")).toBe("<b>m</b>");
    expect(ecrituresEnTete(["m"], "majuscule")).toBe("<b>m</b><b>M</b>");
    expect(ecrituresEnTete(["m"], "cursive")).toBe(`<b>m</b><b>M</b><b class="gb-cursive">m</b><b class="gb-cursive">M</b>`);
    // Un son à plusieurs lettres n'a pas de majuscule à montrer.
    expect(ecrituresEnTete(["ou"], "majuscule")).toBe("<b>ou</b>");
    expect(ecrituresEnTete(["è", "ê"], "majuscule")).toBe("<b>è</b><b>È</b><b>ê</b><b>Ê</b>");
  });

  it("vient de lui-même quand le geste a son image, ou du choix de l'enseignant", () => {
    const auto = { ...REGLAGES_SYLLABES, son: "auto" };
    expect(enTeteDesSyllabes(auto, CIBLES, { m: "data:m" })).toEqual({ son: "m", graphies: ["m"] });
    // Sans l'image du geste, la feuille garde son titre.
    expect(enTeteDesSyllabes(auto, CIBLES, {})).toBeNull();
    expect(enTeteDesSyllabes(auto, ["ma", "li"], { m: "data:m" })).toBeNull();
    expect(enTeteDesSyllabes({ ...auto, son: "" }, CIBLES, { m: "data:m" })).toBeNull();
    // Choisi, le son fait l'en-tête même sans image : sa lettre tient la place.
    expect(enTeteDesSyllabes({ ...auto, son: "m" }, CIBLES, {})).toEqual({ son: "m", graphies: ["m"] });
    expect(enTeteDesSyllabes({ ...auto, son: "a" }, CIBLES, {})).toEqual({ son: "a", graphies: ["a"] });
    expect(enTeteDesSyllabes({ ...auto, son: "o" }, ["mau", "meau"], {})).toEqual({ son: "o", graphies: ["au", "eau"] });
    expect(enTeteDesSyllabes({ ...auto, son: "ch" }, CIBLES, {})).toEqual({ son: "ch", graphies: ["ch"] });
    expect(enTeteDesSyllabes({ ...auto, son: "inconnu" }, CIBLES, {})).toBeNull();
  });
});

describe("la feuille de la syllabe qui manque", () => {
  const mots = FICHE.map((m, k) => mot(m, 2000 + k));
  const articles = { lama: "un", mur: "un", malle: "une" } as const;
  const entete = { son: "m", graphies: ["m"] };

  it("tient sur une page comme le modèle : douze dessins, trois mots à écrire", () => {
    const pages = pagesDeSyllabes(mots, motsAEcrire(mots, 3), 4, true);
    expect(pages).toHaveLength(1);
    expect(pages[0].trous).toHaveLength(12);
    expect(pages[0].ecrire.map((m) => m.texte)).toEqual(["malle", "lama", "mur"]);
    expect(pages[0].dessin).toBeGreaterThanOrEqual(20);
    expect(pages[0].dessin).toBe(coteDesDessins(3, 1, true));
    const html = htmlSyllabes(mots, motsAEcrire(mots, 3), CIBLES, { ...REGLAGES_SYLLABES, lettres: "cursive" }, articles, entete, { m: "data:geste" }, 7);
    expect(html).toContain("Écris la syllabe qui manque : ma, mi ou mu.");
    expect(html).toContain("Écris les mots qui correspondent aux dessins.");
    expect(html).toContain(`<div class="gb-bandeau"><span class="gb-geste"><img src="data:geste" alt="m"></span><span class="gb-graphies"><b>m</b><b>M</b><b class="gb-cursive">m</b><b class="gb-cursive">M</b></span></div>`);
    expect(compter(html, /class="sm-trou"/g)).toBe(12);
    expect(compter(html, /class="sm-ligne"/g)).toBe(6);
    expect(compter(html, /class="sm-article">Une?</g)).toBe(3);
    expect(html).toContain(`four<span class="sm-trou" style="width: 14mm"></span></div>`);
    expect(html).toContain(`dro<span class="sm-trou" style="width: 14mm"></span>daire</div>`);
    // L'en-tête tient lieu de titre ; le corrigé garde le sien, et dit chaque syllabe.
    expect(compter(html, /class="titre"/g)).toBe(1);
    expect(html).toContain("<span>four<b>mi</b></span>");
    expect(html).toContain("<span>une malle</span><span>un lama</span><span>un mur</span>");
    expect(html).toContain(ATTRIBUTION_ARASAAC);
    expect(feuillesDeSyllabes(mots, motsAEcrire(mots, 3), REGLAGES_SYLLABES, true)).toBe(2);
    // D'autres mots à écrire que les plus courts : ceux que l'enseignant a gardés.
    const choisis = htmlSyllabes(mots, [mots[5], mots[0]], CIBLES, REGLAGES_SYLLABES, { mamie: "une", fourmi: "une" }, entete, {}, 7);
    expect(choisis).toContain("<span>une mamie</span><span>une fourmi</span>");
    expect(compter(choisis, /class="sm-ligne"/g)).toBe(4);
  });

  it("mêle les mots, et les remêle à chaque tirage", () => {
    const ordre = (graine: number) => [...htmlSyllabes(mots, [], CIBLES, REGLAGES_SYLLABES, {}, null, {}, graine).split(`class="page corrige"`)[0]
      .matchAll(/class="sm-dessin"><img src="data:([^"]+)"/g)].map((x) => x[1]).slice(0, 12);
    expect([...ordre(1)].sort()).toEqual([...FICHE].sort());
    expect(ordre(1)).toEqual(ordre(1));
    expect(ordre(1)).not.toEqual(ordre(2));
  });

  it("rapetisse le mot long pour qu'il tienne dans sa case, et élargit le trou d'une syllabe longue", () => {
    const html = htmlSyllabes([mot("marguerite"), mot("mur")], [], CIBLES, REGLAGES_SYLLABES, {}, null, {}, 1);
    const corps = Object.fromEntries([...html.matchAll(/class="sm-mot" style="font-size: (\d+)px">(?:[a-zè]*)<span[^>]*><\/span>([a-zè]*)</g)].map((x) => [x[2], Number(x[1])]));
    expect(corps.r).toBe(22);
    expect(corps.rguerite).toBeLessThan(22);
    expect(corps.rguerite).toBeGreaterThanOrEqual(13);
    // Trois lettres à écrire : un trou plus long ; trois dessins par rangée : plus long encore.
    const mou = mot("mouton", 1, ["mou"]);
    expect(htmlSyllabes([mou], [], ["mou"], REGLAGES_SYLLABES, {}, null, {}, 1)).toContain(`style="width: 21mm"`);
    expect(htmlSyllabes([mou], [], ["mou"], { ...REGLAGES_SYLLABES, colonnes: 3 }, {}, null, {}, 1)).toContain(`style="width: 27mm"`);
  });

  it("garde des rangées complètes, et un titre quand il n'y a pas d'en-tête", () => {
    const html = htmlSyllabes(mots.slice(0, 5), motsAEcrire(mots.slice(0, 5), 2), CIBLES, REGLAGES_SYLLABES, {}, null, {}, 1);
    const page = html.split(`class="page corrige"`)[0];
    // Cinq mots sur quatre colonnes : huit cases ; deux mots à écrire sur trois : trois cases.
    expect(compter(page, /class="sm-case"/g)).toBe(8 + 3);
    expect(compter(page, /class="sm-case"><\/div>/g)).toBe(3 + 1);
    expect(page).toContain(`<div class="titre">La syllabe qui manque</div>`);
    expect(page).not.toContain("gb-bandeau");
    // Sans article choisi, la ligne d'écriture reste, sans « Un » devant.
    expect(page).not.toContain("sm-article");
    // Trois dessins par rangée.
    expect(htmlSyllabes(mots, [], CIBLES, { ...REGLAGES_SYLLABES, colonnes: 3 }, {}, null, {}, 1)).toContain("grid-template-columns: repeat(3, 1fr)");
  });

  it("passe à la page suivante quand les dessins deviendraient trop petits", () => {
    const beaucoup = Array.from({ length: 24 }, (_, k) => mot(FICHE[k % 12], 3000 + k));
    // Six rangées : trois par page plutôt que cinq et une ; les mots à écrire tiennent sous les trois dernières.
    const pages = pagesDeSyllabes(beaucoup, beaucoup.slice(0, 3), 4, true);
    expect(pages.map((p) => [p.trous.length, p.ecrire.length])).toEqual([[12, 0], [12, 3]]);
    // Cinq rangées pleines ne laissent pas de place aux mots à écrire : ils prennent leur page.
    const vingt = beaucoup.slice(0, 20);
    expect(pagesDeSyllabes(vingt, vingt.slice(0, 3), 4, true).map((p) => [p.trous.length, p.ecrire.length])).toEqual([[20, 0], [0, 3]]);
    for (const p of pagesDeSyllabes(vingt, vingt.slice(0, 6), 4, false)) {
      expect(p.dessin).toBeGreaterThanOrEqual(20);
      expect(p.dessin).toBeLessThanOrEqual(30);
    }
    expect(feuillesDeSyllabes(vingt, vingt.slice(0, 3), REGLAGES_SYLLABES, true)).toBe(3);
    expect(feuillesDeSyllabes(vingt, [], REGLAGES_SYLLABES, true)).toBe(2);
    expect(feuillesDeSyllabes([], [], REGLAGES_SYLLABES, true)).toBe(0);
  });

  it("dit ce qui manque tant qu'il n'y a rien à imprimer, et ne doit rien à la banque pour les images de l'enseignant", () => {
    expect(htmlSyllabes(mots, [], [], REGLAGES_SYLLABES, {}, null, {}, 1)).toContain("Écrivez les syllabes à retrouver");
    expect(htmlSyllabes([], [], CIBLES, REGLAGES_SYLLABES, {}, null, {}, 1)).toContain("Ajoutez des mots qui ont un dessin");
    expect(htmlSyllabes([mot("lama", -1), mot("mur", -2)], [], CIBLES, REGLAGES_SYLLABES, {}, null, {}, 1)).not.toContain("ARASAAC");
  });
});
