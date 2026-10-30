import { describe, expect, it } from "vitest";
import { COTE_PAGE, EXERCICES_ALBUM, REGLAGES_ALBUM, htmlAlbum, reglagesAlbumSurs, styleAlbum, titreAlbum, type ReglagesAlbum } from "./albumACalculer";

const r = (x: Partial<ReglagesAlbum>) => reglagesAlbumSurs({ ...REGLAGES_ALBUM, ...x });
const pages = (html: string) => html.match(/class="page ac-feuille"/g)?.length ?? 0;
/** Les oiseaux d'une page, et où sont leurs pattes : chacun est un groupe déplacé puis mis à l'échelle. */
const oiseaux = (svg: string) => [...svg.matchAll(/<g transform="translate\(([\d.-]+) ([\d.-]+)\) scale\(([\d.]+)\)">/g)]
  .map((m) => ({ x: Number(m[1]) + 50 * Number(m[3]), y: Number(m[2]) + 89 * Number(m[3]), l: 100 * Number(m[3]) }));

describe("l'album à calculer", () => {
  it("relit ce qu'on a gardé, et reprend sa valeur par défaut pour le reste", () => {
    expect(reglagesAlbumSurs(null)).toMatchObject(REGLAGES_ALBUM);
    expect(reglagesAlbumSurs({ exercice: "?" as never, nombre: 40, vus: 12, surLesFils: 99 })).toMatchObject({ exercice: "vierge", nombre: 9, vus: 0, surLesFils: 12 });
    // Il faut des oiseaux cachés : jamais tous vus.
    expect(reglagesAlbumSurs({ nombre: 5, vus: 5 }).vus).toBe(0);
    expect(reglagesAlbumSurs({ nombre: 5, vus: 4 }).vus).toBe(4);
    expect(reglagesAlbumSurs({ nombre: 1 }).nombre).toBe(3);
  });

  it("la page vierge : un carré, deux traits — le pli de la porte en pointillés —, trois fils, quatre cases dont trois bleues", () => {
    const html = htmlAlbum(r({ exercice: "vierge" }), 1);
    expect(html).toContain(`width="${COTE_PAGE}mm" height="${COTE_PAGE}mm"`);
    expect(html.match(/<line /g)).toHaveLength(5);
    expect(html.match(/stroke-dasharray="3 2"/g)).toHaveLength(1);
    expect(html).toContain(`x1="${0.75 * COTE_PAGE}"`);
    expect(html.match(/fill="#e8f1fd"/g)).toHaveLength(3);
    expect(html.match(/<rect /g)).toHaveLength(5);
    expect(oiseaux(html)).toHaveLength(0);
    expect(html).toContain("dans les cases bleues".replace("dans", "Dans"));
  });

  it("une page faite : le chiffre, le dé, les doigts, les oiseaux vus avant la moitié, les cachés sous la porte, la décomposition", () => {
    const html = htmlAlbum(r({ exercice: "faite", nombre: 7, vus: 5, toutes: false }), 3);
    expect(pages(html)).toBe(1);
    expect(html).toContain(">7</text>");
    expect(html).toContain(">5 + 2</text>");
    expect(html).toContain('class="cl-points cl-deux"');
    expect(html).toContain('class="cl-doigts cl-deux"');
    const o = oiseaux(html);
    expect(o).toHaveLength(7);
    expect(o.filter((x) => x.x + x.l / 2 <= COTE_PAGE / 2)).toHaveLength(5);
    expect(o.filter((x) => x.x - x.l / 2 >= COTE_PAGE / 2 && x.x + x.l / 2 <= 0.75 * COTE_PAGE)).toHaveLength(2);
    // Chacun sur un fil.
    for (const x of o) expect([0.4, 0.55, 0.7].map((k) => k * COTE_PAGE).some((y) => Math.abs(y - x.y) < 0.05)).toBe(true);
  });

  it("toutes les façons de partager un nombre : pour 3, les deux pages du manuel, deux et un puis un et deux", () => {
    const html = htmlAlbum(r({ exercice: "faite", nombre: 3, toutes: true }), 1);
    expect(pages(html)).toBe(2);
    expect(html.indexOf(">2 + 1</text>")).toBeLessThan(html.indexOf(">1 + 2</text>"));
    for (let n = 2; n <= 9; n++) {
      const h = htmlAlbum(r({ exercice: "faite", nombre: n, toutes: true }), n);
      expect(pages(h), String(n)).toBe(n - 1);
      // Les oiseaux tiennent entre les traits, même huit sous la porte.
      for (const page of h.split('class="page ac-feuille"').slice(1)) {
        const o = oiseaux(page);
        expect(o).toHaveLength(n);
        for (const x of o) expect(x.x - x.l / 2 > 0.12 * COTE_PAGE && x.x + x.l / 2 < 0.75 * COTE_PAGE).toBe(true);
        for (let i = 0; i < o.length; i++) for (let j = i + 1; j < o.length; j++) {
          if (Math.abs(o[i].y - o[j].y) < 0.05) expect(Math.abs(o[i].x - o[j].x)).toBeGreaterThanOrEqual((o[i].l + o[j].l) / 2);
        }
      }
    }
  });

  it("les oiseaux à découper, et les oiseaux sur les fils à projeter, à l'horizontale", () => {
    expect(oiseaux(htmlAlbum(r({ exercice: "oiseaux" }), 1))).toHaveLength(54);
    const fils = htmlAlbum(r({ exercice: "fils" }), 1);
    expect(oiseaux(fils)).toHaveLength(6);
    expect(oiseaux(htmlAlbum(r({ exercice: "fils", surLesFils: 11 }), 1))).toHaveLength(11);
    expect(styleAlbum(r({ exercice: "fils" }))).toContain("size: A4 landscape");
    expect(styleAlbum(r({ exercice: "vierge" }))).toContain("size: A4 portrait");
  });

  it("chaque feuille a son titre, et se refait à l'identique avec la même graine", () => {
    for (const e of EXERCICES_ALBUM) {
      const x = r({ exercice: e.id });
      expect(htmlAlbum(x, 9)).toContain(`<div class="titre">${titreAlbum(x).replace(/'/g, "&#39;")}`);
      expect(htmlAlbum(x, 9)).toBe(htmlAlbum(x, 9));
    }
  });
});
