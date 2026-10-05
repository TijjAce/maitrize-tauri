import { describe, it, expect } from "vitest";
import {
  ETAPES_MAX, REGLAGES_SUITES, SUITES, cequiManque, etapesPleines, hauteurDeLaBande, htmlSuites, mesuresBande, mesuresColonnes, motsDuTemps,
  ordreMele, reglagesSurs, type ReglagesSuites,
} from "./suitesImages";
import { LARGEUR_CONTENU_MM } from "./cartesImprimables";
import { hasard } from "./hasard";

const etape = (id: number, mot: string) => ({ id, mot });
const BONHOMME = [etape(3135, "il neige"), etape(24891, "une boule de neige"), etape(3131, "le bonhomme de neige"), etape(7011, "il fond")];
const IMAGES: Record<string | number, string> = { 3135: "data:neige", 24891: "data:boule", 3131: "data:bonhomme", 7011: "data:fond", "photo:album-1.jpg": "data:photo" };
const r = (m: Partial<ReglagesSuites>): ReglagesSuites => reglagesSurs({ ...REGLAGES_SUITES, etapes: BONHOMME, ...m });
const compter = (html: string, motif: RegExp) => (html.match(motif) ?? []).length;
/** L'ordre des images à découper, lu dans la feuille. */
const ordreDesCartes = (html: string) => [...html.matchAll(/class="si-carte"[^>]*><img src="data:(\w+)"/g)].map((m) => m[1]);

describe("les mots du temps", () => {
  it("sont ceux du programme, à chaque âge", () => {
    expect(motsDuTemps("PS", 2)).toEqual(["d'abord", "après"]);
    expect(motsDuTemps("PS", 3)).toEqual(["d'abord", "après", "à la fin"]);
    expect(motsDuTemps("MS", 4)).toEqual(["au début", "ensuite", "ensuite", "pour finir"]);
    expect(motsDuTemps("GS", 5)).toEqual(["d'abord", "ensuite", "puis", "après", "enfin"]);
    expect(motsDuTemps("GS", 2)).toEqual(["d'abord", "enfin"]);
    for (const n of [2, 3, 4, 5, 6]) expect(motsDuTemps("GS", n)).toHaveLength(n);
  });
});

describe("les réglages", () => {
  it("se réparent, et ne gardent que six images au plus", () => {
    const repare = reglagesSurs({ niveau: "CP" as never, forme: "x" as never, reperes: "?" as never, etapes: Array.from({ length: 9 }, () => ({ id: 1, mot: "a" })) });
    expect(repare.niveau).toBe(REGLAGES_SUITES.niveau);
    expect(repare.forme).toBe("colonnes");
    expect(repare.reperes).toBe("mots");
    expect(repare.etapes).toHaveLength(ETAPES_MAX);
    // Une photo garde son nom de fichier ; un chemin est refusé.
    expect(reglagesSurs({ etapes: [{ id: null, mot: "", photo: "album-1.jpg" }, { id: null, mot: "", photo: "../secret" }] }).etapes.map((p) => p.photo)).toEqual(["album-1.jpg", undefined]);
  });

  it("disent ce qui manque : deux images au moins", () => {
    expect(cequiManque(r({ etapes: [etape(1, "a")] }))).toMatch(/deux images/);
    expect(cequiManque(r({ etapes: [etape(1, "a"), { id: null, mot: "" }] }))).toMatch(/deux images/);
    expect(cequiManque(r({}))).toBeNull();
  });

  it("les suites toutes prêtes se suivent sans discussion, de deux à six images", () => {
    for (const s of SUITES) {
      expect(s.etapes.length, s.id).toBeGreaterThanOrEqual(3);
      expect(s.etapes.length, s.id).toBeLessThanOrEqual(ETAPES_MAX);
      expect(new Set(s.etapes.map((e) => e.id)).size, s.id).toBe(s.etapes.length);
    }
  });
});

describe("les images mêlées", () => {
  it("ne sont jamais dans l'ordre de l'histoire", () => {
    for (let n = 2; n <= 6; n++) for (let g = 0; g < 200; g++) {
      const ordre = ordreMele(n, hasard(g));
      expect([...ordre].sort()).toEqual(Array.from({ length: n }, (_, i) => i));
      expect(ordre.every((v, i) => v === i)).toBe(false);
    }
  });

  it("le même tirage pour la même graine : l'aperçu est ce qui s'imprime", () => {
    expect(htmlSuites(r({}), IMAGES, hasard(5))).toBe(htmlSuites(r({}), IMAGES, hasard(5)));
  });
});

describe("la fiche en colonnes", () => {
  it("une rangée par image : la carte mêlée à gauche, la case à droite avec son mot du temps", () => {
    const html = htmlSuites(r({ niveau: "MS" }), IMAGES, hasard(3));
    expect(compter(html, /class="si-carte"/g)).toBe(4);
    expect(compter(html, /class="si-cadre"/g)).toBe(4);
    expect(html).toContain('class="si-coupe"');
    expect(ordreDesCartes(html)).not.toEqual(["neige", "boule", "bonhomme", "fond"]);
    expect(ordreDesCartes(html).sort()).toEqual(["bonhomme", "boule", "fond", "neige"]);
    for (const m of ["Au début", "Ensuite", "Pour finir"]) expect(html).toContain(`>${m}<`);
    expect(html).toContain("Prénom :");
    expect(html).toContain("Découpe les images");
  });

  it("des numéros, ou rien, à la place des mots", () => {
    expect(compter(htmlSuites(r({ reperes: "numeros" }), IMAGES, hasard(1)), /class="si-repere si-numero"/g)).toBe(4);
    expect(htmlSuites(r({ reperes: "aucun" }), IMAGES, hasard(1))).not.toContain("si-repere");
  });

  it("des cartes plus petites que les cases où elles se collent, six rangées tenant sur la page", () => {
    for (let n = 2; n <= 6; n++) {
      const { rangee, cadre, carte } = mesuresColonnes(n);
      expect(carte).toBeLessThan(cadre);
      expect(cadre).toBeLessThan(rangee);
      expect(n * rangee).toBeLessThanOrEqual(195);
    }
  });
});

describe("la bande fléchée", () => {
  it("des cases reliées par des flèches, et les cartes mêlées dessous", () => {
    const html = htmlSuites(r({ forme: "bande", niveau: "GS" }), IMAGES, hasard(2));
    expect(compter(html, /class="si-cadre"/g)).toBe(4);
    // Quatre cases : deux rangées de deux, une flèche dans chacune.
    expect(compter(html, /class="si-fleche"/g)).toBe(2);
    expect(compter(html, /class="si-carte"/g)).toBe(4);
    for (const m of ["D&#39;abord", "Ensuite", "Puis", "Enfin"]) expect(html).toContain(`>${m}<`);
  });

  it("tient sur une page, en largeur comme en hauteur, de deux à six images", () => {
    for (let n = 2; n <= 6; n++) {
      const { parRangee, cadre, carte, cartesParRangee } = mesuresBande(n);
      expect(parRangee * cadre + (parRangee - 1) * 12).toBeLessThanOrEqual(LARGEUR_CONTENU_MM);
      expect(cartesParRangee * (carte + 3)).toBeLessThanOrEqual(LARGEUR_CONTENU_MM + 3);
      expect(carte).toBeLessThan(cadre);
      expect(hauteurDeLaBande(n)).toBeLessThanOrEqual(195);
    }
  });
});

describe("les grandes images et l'ordre juste", () => {
  it("les grandes images, mêlées, et les mots du temps à poser dessous", () => {
    const html = htmlSuites(r({ forme: "affichage", niveau: "GS" }), IMAGES, hasard(4));
    expect(compter(html, /class="carte si-grande"/g)).toBe(4);
    expect(compter(html, /class="carte si-carte-mot"/g)).toBe(4);
    expect(html).toContain("Au tableau");
  });

  it("l'ordre juste pour le maître, dans chaque feuille, et la mention d'ARASAAC pour les pictos seulement", () => {
    for (const forme of ["colonnes", "bande", "affichage"] as const) {
      const html = htmlSuites(r({ forme }), IMAGES, hasard(1));
      const corrige = html.split('class="page corrige"')[1];
      expect(corrige, forme).toBeDefined();
      expect([...corrige.matchAll(/src="data:(\w+)"/g)].map((m) => m[1])).toEqual(["neige", "boule", "bonhomme", "fond"]);
      expect(html).toContain("ARASAAC");
    }
    // Des photos seules — les illustrations d'un album : pas de mention.
    const photos = r({ etapes: [{ id: null, mot: "", photo: "album-1.jpg" }, { id: null, mot: "la fin" }] });
    expect(etapesPleines(photos)).toHaveLength(2);
    const html = htmlSuites(photos, IMAGES, hasard(1));
    expect(html).toContain('src="data:photo"');
    expect(html).toContain('class="si-mot-seul">la fin<');
    expect(html).not.toContain("ARASAAC");
  });
});
