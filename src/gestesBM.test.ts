import { describe, it, expect } from "vitest";
import {
  GESTES, GESTES_MAX_PAR_MOT, REGLAGES_CARTES, REGLAGES_MOTS_CODES, TAILLES_CARTES, codageCorrige, coderMot, coteDesGestes, enCorrection, feuillesDeMotsCodes,
  gesteDuFichier, gestesDuMot, gestesRetenus, graphiesDuSon, hauteurDeLigne, htmlCartesGestes, htmlMotsCodes, legendeDuGeste, motCode, motsDuPlan,
  pagesDeCartesGestes, planDesMotsCodes, repartir, type MotCode,
} from "./gestesBM";
import { ATTRIBUTION_ARASAAC } from "./cartesImprimables";

/** Le codage d'un mot en une ligne : les gestes, « - » pour une lettre muette. */
const code = (mot: string, eFinal = true) => coderMot(mot, { eFinal }).map((p) => p.geste ?? "-").join(" ");
const compter = (html: string, re: RegExp) => (html.match(re) ?? []).length;

describe("les gestes Borel-Maisonny", () => {
  it("sont trente-quatre, chacun avec ses écritures, sans doublon", () => {
    expect(GESTES).toHaveLength(34);
    expect(new Set(GESTES.map((g) => g.id)).size).toBe(34);
    expect(GESTES.every((g) => g.graphies.length > 0)).toBe(true);
    const o = GESTES.find((g) => g.id === "o")!;
    expect(legendeDuGeste(o, false)).toBe("o");
    expect(legendeDuGeste(o, true)).toBe("o · au · eau");
  });

  it("se reconnaissent au nom du fichier, quand il dit le son", () => {
    expect(gesteDuFichier("Geste-Borel-Maisonny-by-Mysticlolly-Son-A.png")).toBe("a");
    expect(gesteDuFichier("Geste-Borel-Maisonny-Son-CH.png")).toBe("ch");
    expect(gesteDuFichier("/Users/x/gestes/ou.jpg")).toBe("ou");
    expect(gesteDuFichier("son_e_accent_aigu.jpeg")).toBe("é");
    expect(gesteDuFichier("È.png")).toBe("è");
    expect(gesteDuFichier("geste ê couleur.png")).toBe("è");
    expect(gesteDuFichier("borel-maisonny-gn-nb.png")).toBe("gn");
    expect(gesteDuFichier("x.png")).toBe("ks");
    expect(gesteDuFichier("carte ILL.png")).toBe("ill");
    // Un nom d'appareil photo, ou un mot qui n'est pas un son : à ranger à la main.
    expect(gesteDuFichier("IMG_2034.jpg")).toBeNull();
    expect(gesteDuFichier("planche complète.pdf")).toBeNull();
    expect(gesteDuFichier("")).toBeNull();
  });
});

describe("un mot écrit en gestes", () => {
  it("suit la feuille de la méthode : fève, crêpe, bête, rêve", () => {
    expect(code("fève")).toBe("f è v e");
    expect(code("crêpe")).toBe("k r è p e");
    expect(code("bête")).toBe("b è t e");
    expect(code("rêve")).toBe("r è v e");
    expect(code("mère")).toBe("m è r e");
    // Le e final muet, pour qui ne le fait pas dire.
    expect(code("fève", false)).toBe("f è v -");
    // « le », « de » gardent leur e : c'est leur seule voyelle.
    expect(code("le", false)).toBe("l e");
  });

  it("lit les sons à plusieurs lettres", () => {
    expect(code("mouton")).toBe("m ou t on");
    expect(code("oiseau")).toBe("oi z o");
    expect(code("poisson")).toBe("p oi s on");
    expect(code("cheval")).toBe("ch e v a l");
    expect(code("photo")).toBe("f o t o");
    expect(code("montagne")).toBe("m on t a gn e");
    expect(code("quatre")).toBe("k a t r e");
    expect(code("bateau")).toBe("b a t o");
    expect(code("cœur")).toBe("k eu r");
    expect(code("point")).toBe("p oin -");
    expect(code("maison")).toBe("m è z on");
    expect(code("neige")).toBe("n è j e");
    expect(code("taxi")).toBe("t a ks i");
  });

  it("distingue les voyelles nasales de la voyelle suivie d'un n", () => {
    expect(code("lapin")).toBe("l a p in");
    expect(code("enfant")).toBe("an f an -");
    expect(code("pain")).toBe("p in");
    expect(code("faim")).toBe("f in");
    expect(code("peinture")).toBe("p in t u r e");
    expect(code("lundi")).toBe("l un d i");
    expect(code("parfum")).toBe("p a r f un");
    expect(code("jambe")).toBe("j an b e");
    expect(code("timbre")).toBe("t in b r e");
    expect(code("chien")).toBe("ch i in");
    // Devant une voyelle ou un n doublé, le n se dit : pas de nasale.
    expect(code("ami")).toBe("a m i");
    expect(code("âne")).toBe("a n e");
    expect(code("une")).toBe("u n e");
    expect(code("bonne")).toBe("b o n e");
    expect(code("année")).toBe("a n é -");
    expect(code("bonheur")).toBe("b o n - eu r");
  });

  it("choisit le son du c, du g et du s d'après ce qui suit", () => {
    expect(code("cerise")).toBe("s e r i z e");
    expect(code("citron")).toBe("s i t r on");
    expect(code("école")).toBe("é k o l e");
    expect(code("garçon")).toBe("g a r s on");
    expect(code("girafe")).toBe("j i r a f e");
    expect(code("guitare")).toBe("g i t a r e");
    expect(code("pigeon")).toBe("p i j on");
    expect(code("glace")).toBe("g l a s e");
    expect(code("addition")).toBe("a d i s i on");
    expect(code("question")).toBe("k è s t i on");
  });

  it("mouille avec « ill », « il » et « y »", () => {
    expect(code("fille")).toBe("f i ill e");
    expect(code("paille")).toBe("p a ill e");
    expect(code("feuille")).toBe("f eu ill e");
    expect(code("soleil")).toBe("s o l è ill");
    expect(code("travail")).toBe("t r a v a ill");
    expect(code("abeille")).toBe("a b è ill e");
    expect(code("voyage")).toBe("v oi ill a j e");
    expect(code("crayon")).toBe("k r è ill on");
    expect(code("yaourt")).toBe("ill a ou r -");
    expect(code("stylo")).toBe("s t i l o");
  });

  it("laisse muettes les lettres qu'on n'entend pas en fin de mot", () => {
    expect(code("chat")).toBe("ch a -");
    expect(code("petit")).toBe("p e t i -");
    expect(code("loup")).toBe("l ou -");
    expect(code("blanc")).toBe("b l an -");
    expect(code("long")).toBe("l on -");
    expect(code("deux")).toBe("d eu -");
    expect(code("hibou")).toBe("- i b ou");
    expect(code("rue")).toBe("r u -");
    expect(code("roue")).toBe("r ou -");
    // Le pluriel ne se dit pas, et n'empêche pas de reconnaître la fin du mot.
    expect(code("chats")).toBe("ch a - -");
    expect(code("tables", false)).toBe("t a b l - -");
    expect(code("temps")).toBe("t an - -");
  });

  it("lit le e d'après ce qui l'entoure", () => {
    expect(code("veste")).toBe("v è s t e");
    expect(code("merci")).toBe("m è r s i");
    expect(code("belle")).toBe("b è l e");
    expect(code("terre")).toBe("t è r e");
    expect(code("sec")).toBe("s è k");
    expect(code("chef")).toBe("ch è f");
    expect(code("mer")).toBe("m è r");
    expect(code("manger")).toBe("m an j é");
    expect(code("nez")).toBe("n é");
    expect(code("jouet")).toBe("j ou è");
    expect(code("secret")).toBe("s e k r è");
    expect(code("les")).toBe("l é");
    expect(code("pied")).toBe("p i é -");
    expect(code("texte")).toBe("t è ks t e");
  });

  it("donne les gestes à montrer, sans les lettres muettes", () => {
    expect(gestesDuMot(coderMot("chat"))).toEqual(["ch", "a"]);
    expect(gestesDuMot(coderMot("enfant"))).toEqual(["an", "f", "an"]);
    // Deux mots : chacun se lit pour lui-même.
    expect(code("le chat")).toBe("l e ch a -");
    expect(code("")).toBe("");
  });

  it("garde les corrections de l'enseignant, tant que le mot n'a pas changé", () => {
    // « ville » : la règle entend « fille » ; l'enseignant remet un l.
    expect(code("ville")).toBe("v i ill e");
    const corrige = coderMot("ville").map((p) => (p.graphie === "ll" ? { ...p, geste: "l" } : p));
    const corrections = { ville: enCorrection(corrige) };
    expect(codageCorrige("Ville ", corrections).map((p) => p.geste)).toEqual(["v", "i", "l", "e"]);
    // Une lettre rendue muette, et une correction illisible qui ne casse rien.
    expect(codageCorrige("fils", { fils: ["f", "i", "-", "s"] }).map((p) => p.geste)).toEqual(["f", "i", null, "s"]);
    expect(codageCorrige("fils", { fils: ["f", "i", "?", "-"] }).map((p) => p.geste)).toEqual(["f", "i", "l", null]);
    // Une correction faite pour un autre découpage ne s'applique pas.
    expect(codageCorrige("ville", { ville: ["v", "i"] }).map((p) => p.geste)).toEqual(["v", "i", "ill", "e"]);
  });
});

const images = Object.fromEntries(GESTES.map((g) => [g.id, `data:image/png;base64,G${g.id}`]));

describe("les cartes des gestes à découper", () => {
  it("tiennent en planches de la taille choisie, un jeu après l'autre", () => {
    const tous = gestesRetenus(REGLAGES_CARTES, images);
    expect(tous).toHaveLength(34);
    const petit = htmlCartesGestes(tous, images, REGLAGES_CARTES);
    expect(compter(petit, /class="gb-carte"/g)).toBe(34);
    expect(compter(petit, /class="page"/g)).toBe(2);
    expect(petit).toContain("repeat(5, 1fr)");
    expect(pagesDeCartesGestes(34, REGLAGES_CARTES)).toBe(2);
    // En grand : quatre par page ; en affiche : une.
    const grand = { ...REGLAGES_CARTES, taille: "grand" as const };
    expect(compter(htmlCartesGestes(tous, images, grand), /class="page"/g)).toBe(9);
    expect(pagesDeCartesGestes(34, { ...REGLAGES_CARTES, taille: "affiche" })).toBe(34);
    // Trois jeux de petites cartes : cent deux cartes, cinq pages.
    const trois = { ...REGLAGES_CARTES, exemplaires: 3 };
    expect(compter(htmlCartesGestes(tous, images, trois), /class="gb-carte"/g)).toBe(102);
    expect(pagesDeCartesGestes(34, trois)).toBe(5);
    expect(Object.keys(TAILLES_CARTES)).toEqual(["petit", "moyen", "grand", "affiche"]);
  });

  it("écrivent le son sous l'image, ou toutes ses écritures, ou rien", () => {
    const o = GESTES.filter((g) => g.id === "o");
    expect(htmlCartesGestes(o, images, REGLAGES_CARTES)).toContain(`<div class="gb-lettre">o</div>`);
    expect(htmlCartesGestes(o, images, { ...REGLAGES_CARTES, toutesLesGraphies: true })).toContain(`<div class="gb-lettre">o · au · eau</div>`);
    expect(htmlCartesGestes(o, images, { ...REGLAGES_CARTES, lettres: false })).not.toContain("gb-lettre");
  });

  it("ne retiennent que les sons choisis, ou ceux qui ont une image", () => {
    expect(gestesRetenus(REGLAGES_CARTES, { a: "data:x", ch: "data:y" }).map((g) => g.id)).toEqual(["a", "ch"]);
    // Dans l'ordre de la méthode, quel que soit l'ordre des clics ; un son inconnu est ignoré.
    expect(gestesRetenus({ ...REGLAGES_CARTES, choisis: ["ch", "a", "zz"] }, {}).map((g) => g.id)).toEqual(["a", "ch"]);
    // Un son choisi sans image garde sa place : la carte dit qu'il manque.
    const sans = htmlCartesGestes(gestesRetenus({ ...REGLAGES_CARTES, choisis: ["a"] }, {}), {}, REGLAGES_CARTES);
    expect(sans).toContain(`class="gb-manque"`);
    expect(htmlCartesGestes([], images, REGLAGES_CARTES)).toContain("Ajoutez les images des gestes");
  });
});

const mot = (m: string, p: Partial<MotCode> = {}): MotCode => ({ ...motCode(m, coderMot(m)), ...p });

describe("les mots codés en gestes", () => {
  const mots = [mot("fève"), mot("crêpe"), mot("bête"), mot("rêve")];
  const relier = { ...REGLAGES_MOTS_CODES, forme: "relier" as const };
  const colorier = { ...REGLAGES_MOTS_CODES, forme: "colorier" as const };

  it("se relient au mot écrit, jamais en face de lui, avec un corrigé", () => {
    for (let g = 0; g < 10; g++) {
      const html = htmlMotsCodes(mots, images, relier, g);
      expect(html).toContain("Dis les syllabes et relie au bon mot.");
      expect(compter(html, /class="gb-ligne"/g)).toBe(4);
      const droite = [...html.matchAll(/class="gb-mot">([^<]+)</g)].map((x) => x[1]);
      expect([...droite].sort()).toEqual(["bête", "crêpe", "fève", "rêve"]);
      expect(droite).not.toEqual(["fève", "crêpe", "bête", "rêve"]);
    }
    const html = htmlMotsCodes(mots, images, relier, 1);
    // Quatre gestes pour « fève » : f, è, v, e.
    expect(html).toContain(["f", "è", "v", "e"].map((id) => `<span class="gb-geste"><img src="data:image/png;base64,G${id}" alt="${id}"></span>`).join(""));
    expect(compter(html, /class="page corrige"/g)).toBe(1);
    expect(compter(html, /class="gb-reponse"/g)).toBe(4);
    expect(feuillesDeMotsCodes(mots, relier)).toBe(2);
    // Aucun dessin : aucune mention à porter.
    expect(html).not.toContain("ARASAAC");
  });

  it("font choisir entre deux dessins, le bon d'un côté ou de l'autre", () => {
    const illustres = [
      mot("mère", { image: "data:mere", id: 2301 }), mot("père", { image: "data:pere", id: 2302 }),
      mot("tête", { image: "data:tete", id: -1 }), mot("rêve"),
    ];
    const html = htmlMotsCodes(illustres, images, colorier, 4);
    expect(html).toContain("Dis les syllabes et colorie le bon dessin.");
    // « rêve » n'a pas d'image : il ne peut pas se reconnaître à son dessin.
    expect(compter(html, /class="gb-ligne gb-choix"/g)).toBe(3);
    expect(feuillesDeMotsCodes(illustres, colorier)).toBe(2);
    const dessinsDe = (page: string) => page.split(`class="gb-ligne gb-choix"`).slice(1)
      .map((ligne) => [...ligne.split("</div></div>")[0].matchAll(/class="gb-dessin"><img src="(data:[a-z]+)"/g)].map((x) => x[1]));
    for (const dessins of dessinsDe(html)) {
      // Deux dessins différents par ligne.
      expect(dessins).toHaveLength(2);
      expect(dessins[0]).not.toBe(dessins[1]);
    }
    expect(html).toContain("dessin de");
    // Des pictogrammes de la banque y figurent : la mention est due.
    expect(html).toContain(ATTRIBUTION_ARASAAC);
    // Rien que des images de l'enseignant : pas de mention.
    const perso = [mot("mère", { image: "data:mere", id: -1 }), mot("père", { image: "data:pere", id: -2 })];
    expect(htmlMotsCodes(perso, images, colorier, 1)).not.toContain("ARASAAC");
    // Pas deux dessins différents : rien à faire choisir.
    expect(htmlMotsCodes([mot("rêve"), mot("fève")], images, colorier, 1)).toContain("Il faut au moins deux mots qui aient une image");
    expect(htmlMotsCodes([mot("mère", { image: "data:x" }), mot("père", { image: "data:x" })], images, colorier, 1)).toContain("Il faut au moins deux mots");
    expect(feuillesDeMotsCodes([mot("rêve"), mot("fève")], colorier)).toBe(0);
  });

  it("ne proposent jamais deux fois le même dessin, même quand deux mots le partagent", () => {
    // « maman » et « mère » portent la même image : l'autre dessin vient d'ailleurs.
    const jumeaux = [mot("mère", { image: "data:mere" }), mot("maman", { image: "data:mere" }), mot("père", { image: "data:pere" })];
    for (let g = 0; g < 30; g++) {
      const html = htmlMotsCodes(jumeaux, images, colorier, g);
      for (const ligne of html.split(`class="gb-ligne gb-choix"`).slice(1)) {
        const dessins = [...ligne.split("</div></div>")[0].matchAll(/class="gb-dessin"><img src="(data:[a-z]+)"/g)].map((x) => x[1]);
        expect(new Set(dessins).size).toBe(2);
      }
    }
  });

  it("se font écrire, un trait par mot", () => {
    const html = htmlMotsCodes(mots, images, { ...REGLAGES_MOTS_CODES, forme: "ecrire", parPage: 3 }, 1);
    expect(html).toContain("Dis les syllabes et écris le mot.");
    expect(compter(html, /class="gb-trait"/g)).toBe(4);
    expect(compter(html, /class="page"/g)).toBe(2);
    expect(feuillesDeMotsCodes(mots, { ...REGLAGES_MOTS_CODES, forme: "ecrire", parPage: 3 })).toBe(3);
  });

  it("composent la fiche de la méthode : des dessins à colorier, puis des mots à relier", () => {
    const sept = [
      mot("mère", { image: "data:mere", id: 2301 }), mot("père", { image: "data:pere", id: 2302 }), mot("tête", { image: "data:tete", id: 2303 }),
      mot("fête", { image: "data:fete", id: 2304 }), ...mots.slice(0, 3),
    ];
    const plan = planDesMotsCodes(sept, REGLAGES_MOTS_CODES);
    expect(plan).toHaveLength(1);
    // Trois dessins sur sept mots ; le quatrième mot illustré se relie comme les autres.
    expect(plan[0].colorier.map((m) => m.mot)).toEqual(["mère", "père", "tête"]);
    expect(plan[0].relier.map((m) => m.mot)).toEqual(["fête", "fève", "crêpe", "bête"]);
    expect(motsDuPlan(plan)).toHaveLength(7);
    const html = htmlMotsCodes(sept, images, REGLAGES_MOTS_CODES, 3);
    expect(html.indexOf("colorie le bon dessin")).toBeGreaterThan(0);
    expect(html.indexOf("relie au bon mot")).toBeGreaterThan(html.indexOf("colorie le bon dessin"));
    expect(compter(html, /class="gb-ligne gb-choix"/g)).toBe(3);
    expect(compter(html, /class="gb-ligne"/g)).toBe(4);
    expect(compter(html, /class="gb-reponse"/g)).toBe(7);
    expect(feuillesDeMotsCodes(sept, REGLAGES_MOTS_CODES)).toBe(2);
    expect(html).toContain(ATTRIBUTION_ARASAAC);
    // Sans images, la fiche n'a que des mots à relier — et ne doit rien à la banque.
    const sans = planDesMotsCodes(mots, REGLAGES_MOTS_CODES);
    expect(sans).toEqual([{ colorier: [], relier: mots, ecrire: [] }]);
    expect(htmlMotsCodes(mots, images, REGLAGES_MOTS_CODES, 1)).not.toContain("colorie");
    // Il reste toujours deux mots à relier : trois mots illustrés n'en font colorier qu'un.
    const trois = planDesMotsCodes(sept.slice(0, 3), REGLAGES_MOTS_CODES);
    expect(trois[0].colorier).toHaveLength(1);
    expect(trois[0].relier).toHaveLength(2);
    // Un dessin affiché là où l'on relie ne doit rien : la mention ne suit que les dessins imprimés.
    const unSeul = [mot("mère", { image: "data:mere", id: 2301 }), ...mots];
    expect(planDesMotsCodes(unSeul, REGLAGES_MOTS_CODES)[0].colorier).toEqual([]);
    expect(htmlMotsCodes(unSeul, images, REGLAGES_MOTS_CODES, 1)).not.toContain("ARASAAC");
  });

  it("portent en tête le geste du son étudié, avec les écritures qu'on y rencontre", () => {
    expect(graphiesDuSon("è", mots)).toEqual(["è", "ê"]);
    expect(graphiesDuSon("è", [...mots, mot("lait"), mot("neige")])).toEqual(["è", "ê", "ai", "ei"]);
    // Le son n'est dans aucun mot : son écriture la plus courante.
    expect(graphiesDuSon("ou", mots)).toEqual(["ou"]);
    expect(graphiesDuSon("", mots)).toEqual([]);
    const html = htmlMotsCodes(mots, images, { ...relier, son: "è" }, 1);
    expect(html).toContain(`<div class="gb-bandeau"><span class="gb-geste"><img src="data:image/png;base64,Gè" alt="è"></span><span class="gb-graphies"><b>è</b><b>ê</b></span></div>`);
    // L'en-tête tient lieu de titre ; le corrigé garde le sien.
    expect(compter(html, /class="titre"/g)).toBe(1);
    expect(htmlMotsCodes(mots, images, relier, 1)).not.toContain("gb-bandeau");
    expect(htmlMotsCodes(mots, images, { ...relier, son: "inconnu" }, 1)).not.toContain("gb-bandeau");
  });

  it("se répartissent en pages de taille voisine", () => {
    const tailles = (n: number, parPage: number) => repartir(Array.from({ length: n }, (_, k) => k), parPage).map((t) => t.length);
    expect(tailles(7, 5)).toEqual([4, 3]);
    expect(tailles(6, 5)).toEqual([3, 3]);
    expect(tailles(10, 4)).toEqual([4, 3, 3]);
    expect(tailles(3, 8)).toEqual([3]);
    expect(tailles(0, 5)).toEqual([]);
    expect(repartir([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    // Douze mots à relier, cinq par page au plus : trois pages de quatre, et le corrigé.
    const douze = Array.from({ length: 12 }, (_, k) => mot(["fève", "crêpe", "bête", "rêve"][k % 4]));
    expect(planDesMotsCodes(douze, { ...relier, parPage: 5 }).map((p) => p.relier.length)).toEqual([4, 4, 4]);
    expect(feuillesDeMotsCodes(douze, { ...relier, parPage: 5 })).toBe(4);
  });

  it("donnent aux gestes la taille que la ligne et la page permettent", () => {
    // Quatre gestes : la taille des feuilles de la méthode.
    expect(coteDesGestes(mots)).toBe(18);
    expect(htmlMotsCodes(mots, images, relier, 1)).toContain(`style="--gb-cote: 18mm; --gb-dessin: 26mm"`);
    // Huit gestes : plus petits, pour qu'il reste de quoi relier.
    expect(coteDesGestes([mot("fève"), { mot: "x", gestes: Array(8).fill("a") }])).toBe(12);
    expect(coteDesGestes([])).toBe(18);
    // Une page chargée : la hauteur commande, et les lignes tiennent toutes.
    expect(coteDesGestes(mots, 15)).toBe(12);
    for (const bandeau of [false, true]) {
      for (const consignes of [1, 2]) {
        for (let lignes = 2; lignes <= 8; lignes++) {
          const hauteur = hauteurDeLigne(lignes, consignes, bandeau);
          expect(coteDesGestes(mots, hauteur) * 1.25).toBeLessThanOrEqual(hauteur);
          expect(hauteur).toBeGreaterThanOrEqual(14);
        }
      }
    }
    // Huit lignes à colorier sous l'en-tête du son : des dessins plus petits que les vingt-six millimètres d'usage.
    const huit = Array.from({ length: 8 }, (_, k) => mot("fève", { mot: `mot${k}`, image: `data:i${"abcdefgh"[k]}` }));
    const html = htmlMotsCodes(huit, images, { ...colorier, parPage: 8, son: "è" }, 1);
    const [, cote, dessin] = /--gb-cote: (\d+)mm; --gb-dessin: (\d+)mm/.exec(html) ?? [];
    expect(Number(dessin)).toBeLessThan(26);
    expect(Number(dessin)).toBeLessThanOrEqual(hauteurDeLigne(8, 1, true));
    expect(Number(cote) * 1.25).toBeLessThanOrEqual(hauteurDeLigne(8, 1, true));
  });

  it("montrent l'écriture du son quand son image manque, et écartent les mots trop longs", () => {
    const html = htmlMotsCodes([mot("chat"), mot("ami")], { a: "data:a" }, relier, 1);
    expect(html).toContain(`<span class="gb-manque" title="Image à ajouter">ch</span>`);
    const long = mot("anticonstitutionnellement");
    expect(long.gestes.length).toBeGreaterThan(GESTES_MAX_PAR_MOT);
    expect(htmlMotsCodes([long], images, relier, 1)).toContain("Ajoutez des mots");
    expect(feuillesDeMotsCodes([long], relier)).toBe(0);
  });

  it("gardent, pour chaque geste, les lettres qui le disent", () => {
    expect(motCode("bête", coderMot("bête"))).toEqual({ mot: "bête", gestes: ["b", "è", "t", "e"], graphies: ["b", "ê", "t", "e"], image: undefined, id: undefined });
    // Les lettres muettes n'ont ni geste ni place dans la suite.
    expect(motCode("chat", coderMot("chat")).graphies).toEqual(["ch", "a"]);
  });
});
