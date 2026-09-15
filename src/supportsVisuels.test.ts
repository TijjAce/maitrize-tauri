import { describe, it, expect } from "vitest";
import {
  ATTRIBUTION_ARASAAC, DABORD_PAR_DEFAUT, dePrenom, JETONS_PAR_DEFAUT, MINUTEUR_PAR_DEFAUT, SCENARIO_PAR_DEFAUT,
  demarrer, dureeMs, estEnMarche, estFini, feuilleDabord, feuilleJetons, feuilleScenario, fractionAffichee,
  graduations, idsDes, mettreEnPause, minuteurPret, normaliserDabord, normaliserJetons, normaliserMinuteur,
  normaliserScenario, pageDuScenario, PAGE_PAYSAGE, PAGE_PORTRAIT, prolonger, restantA, secteurRestant, tempsLisible,
} from "./supportsVisuels";

const IMAGES = { 12: "data:image/png;base64,AAA", 34: "data:image/png;base64,BBB" };
const compter = (html: string, motif: RegExp) => (html.match(motif) ?? []).length;

describe("tableau d'économie de jetons", () => {
  it("dessine autant de cases que de jetons à gagner, et deux jetons de plus à découper", () => {
    const html = feuilleJetons({ ...JETONS_PAR_DEFAUT, nombre: 7 }, {});
    expect(compter(html, /class="sv-j-case"/g)).toBe(7);
    expect(compter(html, /class="sv-j-jeton"/g)).toBe(9);
    expect(html).toContain("Jetons à découper");
    const sansDecoupe = feuilleJetons({ ...JETONS_PAR_DEFAUT, nombre: 7, decouper: false }, {});
    expect(sansDecoupe).not.toContain("sv-j-jeton");
  });

  it("élide « de » devant un prénom qui commence par une voyelle", () => {
    expect(dePrenom("Tom")).toBe("de Tom");
    expect(dePrenom("Ines")).toBe("d'Ines");
    expect(dePrenom("émile")).toBe("d'émile");
    expect(dePrenom("Hugo")).toBe("de Hugo");
  });

  it("borne le nombre de jetons", () => {
    expect(compter(feuilleJetons({ ...JETONS_PAR_DEFAUT, nombre: 40 }, {}), /class="sv-j-case"/g)).toBe(10);
    expect(compter(feuilleJetons({ ...JETONS_PAR_DEFAUT, nombre: 0 }, {}), /class="sv-j-case"/g)).toBe(5);
  });

  it("échappe ce que l'enseignant écrit", () => {
    const html = feuilleJetons({ ...JETONS_PAR_DEFAUT, prenom: "<b>Adam</b>", regle: "Je lève la main & j'attends" }, {});
    expect(html).toContain("Le tableau de &lt;b&gt;Adam&lt;/b&gt;");
    expect(feuilleJetons({ ...JETONS_PAR_DEFAUT, prenom: " Adam " }, {})).toContain("Le tableau d&#39;Adam");
    expect(html).toContain("Je lève la main &amp; j&#39;attends");
    expect(html).not.toContain("<b>");
  });

  it("pose l'image de la récompense quand elle est chargée, une case vide sinon", () => {
    const avec = feuilleJetons({ ...JETONS_PAR_DEFAUT, recompense: { id: 12, mot: "tablette" }, decouper: false }, IMAGES);
    expect(avec).toContain('src="data:image/png;base64,AAA"');
    expect(avec).toContain("tablette");
    const sansImage = feuilleJetons({ ...JETONS_PAR_DEFAUT, recompense: { id: 99, mot: "tablette" }, decouper: false }, IMAGES);
    expect(sansImage).toContain("sv-image-vide");
  });

  it("cite ARASAAC seulement quand des pictogrammes sont posés", () => {
    expect(feuilleJetons({ ...JETONS_PAR_DEFAUT, decouper: false }, {})).not.toContain(ATTRIBUTION_ARASAAC);
    expect(feuilleJetons({ ...JETONS_PAR_DEFAUT, decouper: false, comportements: [{ id: 34, mot: "travailler" }] }, IMAGES))
      .toContain(ATTRIBUTION_ARASAAC);
  });

  it("dessine les jetons de la forme et de la couleur choisies", () => {
    const rond = feuilleJetons({ ...JETONS_PAR_DEFAUT, forme: "rond", couleur: "#2e7d32" }, {});
    expect(rond).toContain('fill="#2e7d32"');
    const couleurDouteuse = feuilleJetons({ ...JETONS_PAR_DEFAUT, couleur: '"><script>' }, {});
    expect(couleurDouteuse).not.toContain("<script>");
    const picto = feuilleJetons({ ...JETONS_PAR_DEFAUT, forme: "picto", jeton: { id: 34, mot: "étoile" } }, IMAGES);
    expect(compter(picto, /class="sv-jeton-image" src="data:image\/png;base64,BBB"/g)).toBe(7);
  });

  it("répare des réglages anciens ou abîmés", () => {
    const r = normaliserJetons({ nombre: "8", forme: "carré", comportements: [{ id: 3, mot: "attendre" }, null, 5, {}], couleur: "rouge" });
    expect(r.nombre).toBe(JETONS_PAR_DEFAUT.nombre);
    expect(r.forme).toBe("etoile");
    expect(r.couleur).toBe(JETONS_PAR_DEFAUT.couleur);
    expect(r.comportements).toEqual([{ id: 3, mot: "attendre" }, { id: null, mot: "" }, { id: null, mot: "" }]);
    expect(normaliserJetons(undefined)).toEqual(JETONS_PAR_DEFAUT);
  });
});

describe("d'abord / ensuite", () => {
  const etapes = [{ id: 12, mot: "travailler" }, { id: 34, mot: "récréation" }];

  it("titre les étapes et les relie par une flèche", () => {
    const html = feuilleDabord({ ...DABORD_PAR_DEFAUT, etapes }, IMAGES);
    expect(html).toContain("D'abord");
    expect(html).toContain("Ensuite");
    expect(html).not.toContain("Puis");
    expect(compter(html, /class="sv-fleche"/g)).toBe(1);
    const trois = feuilleDabord({ ...DABORD_PAR_DEFAUT, etapes: [...etapes, { id: null, mot: "maison" }] }, IMAGES);
    expect(trois).toContain("Puis");
    expect(compter(trois, /class="sv-fleche"/g)).toBe(2);
  });

  it("sans titres, garde les images et les mots", () => {
    const html = feuilleDabord({ ...DABORD_PAR_DEFAUT, etapes, titres: false }, IMAGES);
    expect(html).not.toContain("sv-d-titre");
    expect(html).toContain("récréation");
  });

  it("met deux planches par page si on le demande", () => {
    expect(compter(feuilleDabord({ ...DABORD_PAR_DEFAUT, etapes, exemplaires: 2 }, IMAGES), /class="sv-d-planche/g)).toBe(2);
    expect(compter(feuilleDabord({ ...DABORD_PAR_DEFAUT, etapes, exemplaires: 1 }, IMAGES), /class="sv-d-planche/g)).toBe(1);
  });

  it("garde deux ou trois étapes", () => {
    expect(normaliserDabord({ etapes: [{ id: 1, mot: "a" }] }).etapes).toHaveLength(2);
    expect(normaliserDabord({ etapes: [1, 2, 3, 4, 5] }).etapes).toHaveLength(3);
    expect(normaliserDabord({ exemplaires: 7 }).exemplaires).toBe(2);
  });
});

describe("scénario social", () => {
  const r = { ...SCENARIO_PAR_DEFAUT, etapes: [
    { picto: { id: 12, mot: "sonnerie" }, texte: "J'entends la sonnerie." },
    { picto: { id: null, mot: "" }, texte: "  " },
    { picto: { id: null, mot: "" }, texte: "Je range mes affaires." },
  ] };

  it("numérote les étapes écrites et laisse de côté les étapes vides", () => {
    const html = feuilleScenario(r, IMAGES);
    expect(compter(html, /class="sv-s-etape"/g)).toBe(2);
    expect(html).toContain('<div class="sv-s-numero">2</div>');
    expect(html).toContain("J&#39;entends la sonnerie.");
    expect(html).toContain("Quand la sonnerie retentit");
  });

  it("en livret : une couverture puis une étape par page, ARASAAC cité en dernière page", () => {
    const html = feuilleScenario({ ...r, disposition: "livret" }, IMAGES);
    expect(compter(html, /class="sv-s-page/g)).toBe(3);
    expect(html).toContain("sv-s-couverture");
    expect(html.lastIndexOf(ATTRIBUTION_ARASAAC)).toBeGreaterThan(html.lastIndexOf("Je range mes affaires."));
    expect(compter(feuilleScenario({ ...r, disposition: "livret", titre: "" }, IMAGES), /class="sv-s-page/g)).toBe(2);
  });

  it("imprime le livret à l'italienne, la liste et la grille en hauteur", () => {
    expect(pageDuScenario({ disposition: "livret" })).toBe(PAGE_PAYSAGE);
    expect(pageDuScenario({ disposition: "grille" })).toBe(PAGE_PORTRAIT);
    expect(feuilleScenario({ ...r, disposition: "grille" }, IMAGES)).toContain("sv-s-grille");
  });

  it("répare des réglages abîmés sans perdre les étapes", () => {
    const lu = normaliserScenario({ titre: 3, etapes: [{ texte: "Je m'assois.", picto: { id: "x" } }], disposition: "roman" });
    expect(lu.titre).toBe(SCENARIO_PAR_DEFAUT.titre);
    expect(lu.etapes).toEqual([{ picto: { id: null, mot: "" }, texte: "Je m'assois." }]);
    expect(lu.disposition).toBe("liste");
    expect(normaliserScenario({ etapes: [] }).etapes).toHaveLength(1);
    // Les étapes par défaut ne sont pas partagées : modifier l'une ne touche pas l'autre.
    const a = normaliserScenario(undefined), b = normaliserScenario(undefined);
    a.etapes[0].picto.mot = "changé";
    expect(b.etapes[0].picto.mot).toBe("");
  });
});

describe("minuteur visuel", () => {
  it("dessine le disque plein, rien à la fin, et un secteur entre les deux", () => {
    expect(secteurRestant(1)).toMatch(/^M 50 4 A 46 46 0 1 1 50 96 A 46 46 0 1 1 50 4 Z$/);
    expect(secteurRestant(0)).toBe("");
    expect(secteurRestant(-2)).toBe("");
    expect(secteurRestant(Number.NaN)).toBe("");
    // Un quart restant : dans le sens horaire, le coloré va de midi à 9 h.
    expect(secteurRestant(0.25, 46, "horaire")).toBe("M 50 50 L 50 4 A 46 46 0 0 0 4.00 50.00 Z");
    expect(secteurRestant(0.25, 46, "antihoraire")).toBe("M 50 50 L 50 4 A 46 46 0 0 1 96.00 50.00 Z");
    // Plus de la moitié : le grand arc.
    expect(secteurRestant(0.75, 40)).toContain("A 40 40 0 1 0");
  });

  it("compte la part colorée sur la durée ou sur une heure", () => {
    expect(fractionAffichee(150_000, 300_000, "duree")).toBe(0.5);
    expect(fractionAffichee(900_000, 300_000, "heure")).toBe(0.25);
    expect(fractionAffichee(7_200_000, 7_200_000, "heure")).toBe(1);
    expect(fractionAffichee(10, 0, "duree")).toBe(0);
  });

  it("gradue une heure toutes les 5 minutes, dans le sens du disque", () => {
    const g = graduations("heure", 0, "horaire");
    expect(g).toHaveLength(60);
    expect(g.filter((x) => x.texte).map((x) => x.texte)).toEqual(["0", "5", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"]);
    // Comme le Time Timer : 15 à 9 h, 45 à 3 h.
    expect(g[15].angle).toBeCloseTo((3 * Math.PI) / 2);
    expect(graduations("heure", 0, "antihoraire")[15].angle).toBeCloseTo(Math.PI / 2);
  });

  it("gradue la durée choisie par pas ronds", () => {
    expect(graduations("duree", 10 * 60_000, "horaire").map((x) => x.texte)).toEqual(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]);
    expect(graduations("duree", 20 * 60_000, "horaire").map((x) => x.texte)).toEqual(["0", "2", "4", "6", "8", "10", "12", "14", "16", "18"]);
    expect(graduations("duree", 45 * 60_000, "horaire")).toHaveLength(9);
    // Une durée qui ne tombe pas juste : des traits sans chiffres.
    const sansChiffres = graduations("duree", 90_000, "horaire");
    expect(sansChiffres).toHaveLength(12);
    expect(sansChiffres.every((x) => x.texte === null)).toBe(true);
  });

  it("écrit le temps restant en minutes et secondes", () => {
    expect(tempsLisible(125_000)).toBe("2:05");
    expect(tempsLisible(59_001)).toBe("1:00");
    expect(tempsLisible(0)).toBe("0:00");
    expect(tempsLisible(-5)).toBe("0:00");
    expect(tempsLisible(3_725_000)).toBe("1:02:05");
  });

  it("démarre, se met en pause, reprend et finit sans dériver", () => {
    let e = minuteurPret(60_000);
    expect(estEnMarche(e, 0)).toBe(false);
    e = demarrer(e, 1_000);
    expect(estEnMarche(e, 30_000)).toBe(true);
    expect(restantA(e, 31_000)).toBe(30_000);
    e = mettreEnPause(e, 31_000);
    expect(restantA(e, 500_000)).toBe(30_000);
    e = demarrer(e, 600_000);
    expect(restantA(e, 620_000)).toBe(10_000);
    expect(estFini(e, 630_000)).toBe(true);
    expect(estEnMarche(e, 630_000)).toBe(false);
    // Arrivé au bout, il repart de sa durée.
    expect(restantA(demarrer(e, 700_000), 700_000)).toBe(60_000);
  });

  it("prolonge d'une minute sans faire déborder le disque", () => {
    const e = prolonger(demarrer(minuteurPret(60_000), 0), 60_000, 10_000);
    expect(restantA(e, 10_000)).toBe(110_000);
    expect(e.total).toBe(110_000);
    expect(fractionAffichee(restantA(e, 10_000), e.total, "duree")).toBe(1);
    const enPause = prolonger(minuteurPret(300_000), 60_000, 0);
    expect(enPause.fin).toBeNull();
    expect(enPause.total).toBe(360_000);
  });

  it("répare une durée impossible", () => {
    expect(dureeMs(normaliserMinuteur({ minutes: 0, secondes: 0 }))).toBe(60_000);
    expect(normaliserMinuteur({ minutes: 999, secondes: 30 })).toMatchObject({ minutes: 180, secondes: 0 });
    expect(normaliserMinuteur({ minutes: 2, secondes: 75 }).secondes).toBe(59);
    expect(normaliserMinuteur(null)).toEqual(MINUTEUR_PAR_DEFAUT);
  });

  it("liste les pictogrammes à charger, sans doublons", () => {
    expect(idsDes([{ id: 3, mot: "" }, null, { id: null, mot: "x" }, { id: 3, mot: "y" }, { id: 4, mot: "" }])).toEqual([3, 4]);
  });
});
