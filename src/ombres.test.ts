import { describe, it, expect } from "vitest";
import { REGLAGES_OMBRES, feuillesDOmbres, htmlOmbres, silhouette, teinteDeLOmbre, type ImageOmbre } from "./ombres";
import { aDeLaTransparence, dimensionsReduites, estPerso, motDuFichier, nouvelIdPerso } from "./imagesPerso";
import { ATTRIBUTION_ARASAAC, attributionPour } from "./cartesImprimables";

/** Une image de test : une lettre par pixel — « . » transparent, « b » blanc, « r » rouge, « n » noir, « g » gris clair. */
function image(lignes: string[]): { rgba: Uint8ClampedArray; l: number; h: number } {
  const couleurs: Record<string, [number, number, number, number]> = {
    ".": [0, 0, 0, 0], b: [255, 255, 255, 255], r: [220, 30, 30, 255], n: [10, 10, 10, 255], g: [246, 248, 250, 255],
  };
  const l = lignes[0].length, h = lignes.length;
  const rgba = new Uint8ClampedArray(l * h * 4);
  lignes.join("").split("").forEach((c, i) => rgba.set(couleurs[c], i * 4));
  return { rgba, l, h };
}
/** La silhouette en lettres : « # » pour l'ombre, « . » pour le vide. */
const dessin = (s: Uint8ClampedArray, l: number) => {
  const lignes: string[] = [];
  for (let i = 0; i < s.length / 4; i += l) lignes.push(Array.from({ length: l }, (_, x) => (s[(i + x) * 4 + 3] ? "#" : ".")).join(""));
  return lignes;
};

describe("la silhouette d'une image", () => {
  it("noircit tout ce qui est peint, quand l'image a un fond transparent", () => {
    const { rgba, l, h } = image([".....", ".rbr.", ".rrr.", "....."]);
    const s = silhouette(rgba, l, h);
    expect(dessin(s, l)).toEqual([".....", ".###.", ".###.", "....."]);
    // La teinte demandée, opaque ; le blanc de l'intérieur fait partie de l'ombre.
    expect([...s.slice((1 * l + 2) * 4, (1 * l + 2) * 4 + 4)]).toEqual([20, 22, 30, 255]);
    expect([...silhouette(rgba, l, h, teinteDeLOmbre(true)).slice((1 * l + 1) * 4, (1 * l + 1) * 4 + 4)]).toEqual([150, 154, 166, 255]);
  });

  it("efface le fond d'une photo en partant des bords : le blanc enfermé dans le sujet reste", () => {
    const { rgba, l, h } = image(["bbbbbbb", "brrrrrb", "brbbbrb", "brrrrrb", "bgbbbbb"]);
    expect(dessin(silhouette(rgba, l, h), l)).toEqual([".......", ".#####.", ".#####.", ".#####.", "......."]);
  });

  it("détache un sujet de n'importe quel fond uni, pas seulement du blanc", () => {
    const { rgba, l, h } = image(["rrrr", "rnnr", "rrrr"]);
    expect(dessin(silhouette(rgba, l, h), l)).toEqual(["....", ".##.", "...."]);
  });

  it("rend le cadre entier quand rien ne se détache : une image unie, une photo plein cadre", () => {
    const unie = image(["rrr", "rrr", "rrr"]);
    expect(dessin(silhouette(unie.rgba, unie.l, unie.h), unie.l)).toEqual(["###", "###", "###"]);
    // Une photo : chaque pixel a sa couleur, aucun fond ne tient les bords.
    const cote = 12;
    const photo = new Uint8ClampedArray(cote * cote * 4);
    for (let y = 0; y < cote; y++) for (let x = 0; x < cote; x++) photo.set([(x * 97 + y * 57) % 256, (x * 31 + y * 141) % 256, (x * y * 7 + x * 13) % 256, 255], (y * cote + x) * 4);
    expect(dessin(silhouette(photo, cote, cote), cote).join("")).toMatch(/^#+$/);
    // Un ciel uni au-dessus d'un paysage qui touche trois bords : rien n'entoure un sujet.
    const paysage = image(["bbbbbbbb", "bbbbbbbb", "nrnrnrnr", "rnrnrnrn", "nrnrnrnr", "rnrnrnrn"]);
    expect(dessin(silhouette(paysage.rgba, paysage.l, paysage.h), paysage.l).join("")).toMatch(/^#+$/);
  });

  it("suit la lumière qui tombe d'un côté de la feuille : le fond s'efface d'un bord à l'autre", () => {
    // Une feuille blanche éclairée par la gauche — de 250 à 150 —, un objet sombre au milieu.
    const l = 40, h = 30;
    const rgba = new Uint8ClampedArray(l * h * 4);
    const dansLObjet = (x: number, y: number) => x >= 14 && x < 26 && y >= 10 && y < 20;
    for (let y = 0; y < h; y++) for (let x = 0; x < l; x++) {
      const blanc = 250 - Math.round((x / (l - 1)) * 100) - (y % 2) * 3;
      rgba.set(dansLObjet(x, y) ? [40, 60, 150, 255] : [blanc, blanc, blanc - 6, 255], (y * l + x) * 4);
    }
    const s = silhouette(rgba, l, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < l; x++) expect(s[(y * l + x) * 4 + 3], `${x},${y}`).toBe(dansLObjet(x, y) ? 255 : 0);
  });

  it("garde un sujet qui touche le bord, et oublie les poussières du fond", () => {
    const { rgba, l, h } = image([
      "bbbbbbbbbbbb",
      "bnbbbbbbbbbb",
      "bbbrrrrrrbbb",
      "bbbrrrrrrbbb",
      "bbbrrrrrrbbb",
      "bbbrrrrrrbbb",
      "bbbrrrrrrbbb",
      "bbbrrrrrrbbb",
      "bbbrrrrrrbbb",
      "bbbrrrrrrbbb",
    ]);
    expect(dessin(silhouette(rgba, l, h), l)).toEqual([
      "............", "............", "...######...", "...######...", "...######...",
      "...######...", "...######...", "...######...", "...######...", "...######...",
    ]);
  });

  it("garde le bord adouci d'un dessin détouré, en plus appuyé", () => {
    const rgba = new Uint8ClampedArray([0, 0, 0, 0, 9, 9, 9, 10, 9, 9, 9, 60, 9, 9, 9, 200, 0, 0, 0, 0, 0, 0, 0, 0]);
    const s = silhouette(rgba, 6, 1);
    expect([s[3], s[7], s[11], s[15], s[19]]).toEqual([0, 0, 120, 255, 0]);
  });
});

const items = (n: number): ImageOmbre[] => Array.from({ length: n }, (_, i) => ({ mot: `mot${i + 1}`, image: `data:image/png;base64,I${i + 1}`, ombre: `data:image/png;base64,O${i + 1}` }));
const compter = (html: string, re: RegExp) => (html.match(re) ?? []).length;

describe("la feuille du jeu des ombres", () => {
  it("donne une planche d'ombres et ses images à découper, de la même taille et dans un autre ordre", () => {
    const html = htmlOmbres(items(6), REGLAGES_OMBRES, 3);
    expect(compter(html, /class="om-case"/g)).toBe(6);
    expect(compter(html, /class="om-carte"/g)).toBe(6);
    expect(compter(html, /class="page"/g)).toBe(2);
    expect(html).toContain("pose chaque image sur son ombre");
    expect(compter(html, /repeat\(3, 1fr\)/g)).toBe(2);
    const ordre = (re: RegExp) => [...html.matchAll(re)].map((m) => m[1]);
    const ombres = ordre(/class="om-case"><img src="data:image\/png;base64,O(\d)"/g);
    const images = ordre(/class="om-carte"><img src="data:image\/png;base64,I(\d)"/g);
    expect(ombres).toEqual(["1", "2", "3", "4", "5", "6"]);
    expect([...images].sort()).toEqual(ombres);
    expect(images).not.toEqual(ombres);
  });

  it("fait autant de planches qu'il en faut, et écrit le mot quand on le demande", () => {
    const html = htmlOmbres(items(13), { ...REGLAGES_OMBRES, parPage: 12, legendes: true }, 1);
    expect(compter(html, /class="page"/g)).toBe(4);
    expect(compter(html, /repeat\(4, 1fr\)/g)).toBe(4);
    expect(compter(html, /class="om-mot"/g)).toBe(26);
    expect(htmlOmbres(items(6), REGLAGES_OMBRES, 1)).not.toContain("om-mot");
    expect(feuillesDOmbres(13, { ...REGLAGES_OMBRES, parPage: 12 })).toBe(4);
    expect(feuillesDOmbres(0, REGLAGES_OMBRES)).toBe(0);
  });

  it("fait une fiche à relier, cinq par page, avec son corrigé à part", () => {
    const r = { ...REGLAGES_OMBRES, forme: "relier" as const };
    const html = htmlOmbres(items(7), r, 5);
    expect(html).toContain("Relie chaque image à son ombre.");
    expect(compter(html, /class="om-ligne"/g)).toBe(7);
    expect(compter(html, /class="page"/g)).toBe(2);
    expect(compter(html, /class="page corrige"/g)).toBe(1);
    expect(compter(html, /class="om-paire"/g)).toBe(7);
    expect(feuillesDOmbres(7, r)).toBe(3);
    // Deux images : les ombres ne restent jamais chacune en face de la sienne.
    for (let g = 0; g < 12; g++) {
      const deux = htmlOmbres(items(2), r, g);
      const lignes = [...deux.matchAll(/class="om-ligne">.*?base64,I(\d).*?base64,O(\d)/g)].map((m) => `${m[1]}${m[2]}`);
      expect(lignes).toEqual(["12", "21"]);
    }
  });

  it("cite la banque quand ses pictogrammes y sont, et seulement alors", () => {
    const banque = items(3).map((x, i) => ({ ...x, id: 2300 + i }));
    const perso = items(3).map((x, i) => ({ ...x, id: -1 - i }));
    expect(htmlOmbres(banque, REGLAGES_OMBRES, 1)).toContain("Les ombres sont tirées de ces pictogrammes.");
    expect(htmlOmbres([...perso, banque[0]], { ...REGLAGES_OMBRES, forme: "relier" }, 1)).toContain("ARASAAC");
    // Rien que des photos de l'enseignant : rien à attribuer.
    expect(htmlOmbres(perso, REGLAGES_OMBRES, 1)).not.toContain("ARASAAC");
    expect(attributionPour([null, undefined, -4])).toBe("");
    expect(attributionPour([null, -4, 2349])).toBe(ATTRIBUTION_ARASAAC);
  });

  it("attend des images pour faire une feuille", () => {
    expect(htmlOmbres([], REGLAGES_OMBRES, 1)).toContain("Ajoutez des images");
    expect(htmlOmbres([{ mot: "x", image: "", ombre: "" }], REGLAGES_OMBRES, 1)).toContain("Ajoutez des images");
  });
});

describe("les images de l'enseignant", () => {
  it("portent un identifiant négatif, neuf à chaque fois", () => {
    const a = nouvelIdPerso(), b = nouvelIdPerso();
    expect(a).toBeLessThan(0);
    expect(b).toBeLessThan(a);
    expect(estPerso(a)).toBe(true);
    expect(estPerso(12)).toBe(false);
    expect(estPerso(null)).toBe(false);
  });

  it("prennent leur mot dans le nom du fichier, sauf quand il ne dit rien", () => {
    expect(motDuFichier("pomme_rouge.JPG")).toBe("pomme rouge");
    expect(motDuFichier("/Users/x/Images/mon-chat.webp")).toBe("mon chat");
    expect(motDuFichier("IMG_2034.jpeg")).toBe("");
    expect(motDuFichier("DSC 0041.png")).toBe("");
    expect(motDuFichier("20261002_101500.jpg")).toBe("");
    // Une image collée, téléchargée : le nom n'apprend rien non plus.
    expect(motDuFichier("image.png")).toBe("");
    expect(motDuFichier("Sans titre (2).png")).toBe("");
    expect(motDuFichier("download.jpeg")).toBe("");
    expect(motDuFichier("imagier.png")).toBe("imagier");
    expect(motDuFichier("")).toBe("");
  });

  it("se réduisent sans se déformer ni s'agrandir, et gardent leur transparence quand elles en ont", () => {
    expect(dimensionsReduites(4000, 3000, 700)).toEqual([700, 525]);
    expect(dimensionsReduites(300, 600, 700)).toEqual([300, 600]);
    expect(dimensionsReduites(0, 0, 700)).toEqual([1, 1]);
    expect(aDeLaTransparence(new Uint8ClampedArray([1, 2, 3, 255, 4, 5, 6, 255]))).toBe(false);
    expect(aDeLaTransparence(new Uint8ClampedArray([1, 2, 3, 255, 4, 5, 6, 0]))).toBe(true);
  });
});
