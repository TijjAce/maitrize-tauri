import { describe, expect, it } from "vitest";
import {
  EXERCICES_BILLES, EXERCICES_SUITE, PARTIES_ABAQUE, htmlAbaque, htmlBilles, htmlSuite, nombreMax,
  reglagesAbaqueSurs, reglagesBillesSurs, reglagesSuiteSurs, titreSuite, type ReglagesBilles,
} from "./numerationCP";
import { nombreEnLettres } from "./nombresEnLettres";

const eleve = (html: string) => html.split('class="page corrige"')[0];
const corrige = (html: string) => html.split('class="page corrige"')[1];
/** Les billes d'un dessin : le rond de leur couleur, d'un rayon donné. */
const billes = (html: string, rayon: number) => [...html.matchAll(new RegExp(`<circle cx="([\\d.]+)" cy="([\\d.]+)" r="${rayon}" fill="#(?:4a86e8|e05252|38a169)"`, "g"))]
  .map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
const rayonDe = (n: number) => (n <= 20 ? 3 : n <= 59 ? 2.5 : 2);
const billesDe = (r: Partial<ReglagesBilles>, g: number) => htmlBilles(r, g);

describe("les ateliers de la numération au CP : billes et calots, l'abaque, la suite des nombres", () => {
  it("fabriquent des feuilles complètes à toutes les bornes, avec un corrigé et des consignes à la première personne", () => {
    const feuilles: string[] = [];
    for (const g of [1, 2, 3]) {
      for (const e of EXERCICES_BILLES) for (const [de, a] of [e.defaut, [e.min, e.max], [e.max - 5, e.max]]) feuilles.push(billesDe({ exercice: e.id, de, a, nombre: 99 }, g));
      for (const [de, a] of [[10, 20], [1, 99], [40, 59], [60, 99]]) feuilles.push(htmlAbaque({ de, a, nombre: 8 }, g));
      for (const [de, a] of [[1, 20], [0, 100], [10, 16], [60, 99], [81, 100]]) feuilles.push(htmlSuite({ de, a, exercices: EXERCICES_SUITE.map((x) => x.id) }, g));
    }
    for (const html of feuilles) {
      expect(html).not.toMatch(/NaN|undefined|Infinity|\[object/);
      expect(html).toContain('class="page corrige"');
      for (const m of html.matchAll(/<div class="regle">([^<]*)/g)) expect(m[1]).toMatch(/^(Je |J'|Un )/);
      for (const m of html.matchAll(/<div class="dv-consigne"><b>\d\.<\/b> ([^<]*)/g)) expect(m[1]).toMatch(/^(Je |J'|Un )/);
    }
    // Le même tirage pour la même graine.
    expect(htmlSuite({}, 5)).toBe(htmlSuite({}, 5));
    expect(htmlSuite({}, 5)).not.toBe(htmlSuite({}, 6));
  });

  it("gardent leurs réglages dans leurs bornes", () => {
    // Deux joueurs n'ont pas le même nombre ; on ne compte pas plus de cartes que la page n'en tient.
    expect(reglagesBillesSurs({ exercice: "partie", de: 15, a: 15 })).toMatchObject({ de: 15, a: 16 });
    expect(reglagesBillesSurs({ exercice: "compter", de: 30, a: 50, nombre: 9 }).nombre).toBe(2);
    expect(reglagesBillesSurs({ exercice: "compter", de: 3, a: 9, nombre: 9 }).nombre).toBe(9);
    expect(reglagesBillesSurs({ exercice: "paquets", de: 2, a: 300 })).toMatchObject({ de: 11, a: 59 });
    expect(reglagesBillesSurs({ exercice: "inconnu" as never }).exercice).toBe("partie");
    expect(nombreMax("deux", 9)).toBe(8);
    // L'abaque échange au moins une dizaine ; au moins deux abaques.
    expect(reglagesAbaqueSurs({ de: 1, a: 5, nombre: 0, parties: [] })).toMatchObject({ a: 11, nombre: 2, parties: PARTIES_ABAQUE.map((p) => p.id) });
    // La suite : au moins six nombres.
    expect(reglagesSuiteSurs({ de: 40, a: 41 })).toMatchObject({ de: 40, a: 45 });
    expect(titreSuite(reglagesSuiteSurs({ exercices: ["relier", "dizaines"], de: 10, a: 16 }))).toBe("De 10 à 16 : le nom et l'écriture");
    expect(titreSuite(reglagesSuiteSurs({ exercices: ["voisins"], de: 30, a: 60 }))).toBe("La frise de 30 à 60");
  });

  it("dessinent les collections comme on les compte : chaque bille à sa place, et autant que le corrigé le dit", () => {
    for (const g of [1, 2, 3, 4, 5, 6]) {
      // De 17 à 19, trois collections : chacune son nombre.
      const cadres = eleve(billesDe({ exercice: "compter", de: 17, a: 19, nombre: 3 }, g)).split('class="dv-bloc"').slice(1);
      expect(cadres.map((c) => billes(c, 3).length).sort((x, y) => x - y)).toEqual([17, 18, 19]);
      for (const [de, a] of [[12, 19], [21, 59], [60, 99]]) {
        const html = billesDe({ exercice: "compter", de, a, nombre: 2 }, g);
        const nombres = [...corrige(html).matchAll(/Il y a <b class="dv-rep">(\d+)<\/b> billes/g)].map((m) => Number(m[1]));
        const blocs = eleve(html).split('class="dv-bloc"').slice(1);
        expect(blocs).toHaveLength(nombres.length);
        for (const [k, c] of blocs.entries()) {
          const n = nombres[k];
          const pts = billes(c, rayonDe(n));
          expect(pts.length).toBe(n);
          // Aucune bille n'en cache une autre.
          for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) expect(Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)).toBeGreaterThan(2 * rayonDe(n));
        }
      }
    }
  });

  it("entourent au corrigé un trait par paquet de dix, jusqu'à 59", () => {
    for (const g of [1, 2, 3]) {
      for (const [n, paquets] of [[17, 1], [34, 3], [59, 5], [72, 0]] as const) {
        const html = billesDe({ exercice: "compter", de: n, a: n, nombre: 1 }, g);
        // Chaque trait : deux polygones, le bord et le fond.
        expect((corrige(html).match(/<polygon /g) ?? []).length, `${n}`).toBe(2 * paquets);
        expect(eleve(html)).not.toContain("<polygon ");
      }
      // Des paquets de dix : le tableau dit combien de paquets, de billes seules, et en tout.
      const paquets = corrige(billesDe({ exercice: "paquets", de: 23, a: 47, nombre: 2 }, g));
      for (const bloc of paquets.split('class="dv-bloc"').slice(1)) {
        const n = billes(bloc, 2.5).length;
        expect(bloc).toContain(`<td><b class="dv-rep">${Math.floor(n / 10)}</b></td><td><b class="dv-rep">${n % 10}</b></td><td><b class="dv-rep">${n}</b></td>`);
      }
    }
  });

  it("corrigent juste : qui a gagné, les deux tas, l'abaque, la frise, ranger, comparer, le nom des nombres", () => {
    for (const g of [1, 2, 3, 4, 5, 6]) {
      for (const [de, a] of [[10, 20], [10, 59], [40, 99]]) {
        for (const partie of corrige(billesDe({ exercice: "partie", de, a, nombre: 5 }, g)).split('class="dv-partie"').slice(1)) {
          const joueurs = partie.split('class="dv-joueur"').slice(1, 3).map((j) => j.split('class="dv-ligne"')[0]);
          const valeurs = joueurs.map((j) => 10 * (j.match(/fill="#f2c94c"/g) ?? []).length + billes(j, 2.6).length);
          expect(valeurs[0]).not.toBe(valeurs[1]);
          for (const v of valeurs) expect(v >= de && v <= a, `${v} dans ${de}-${a}`).toBe(true);
          expect(partie).toContain(`A : <b class="dv-rep">${valeurs[0]}</b> billes.`);
          expect(partie).toContain(`<span class="dv-lettre dv-gagne">${valeurs[0] > valeurs[1] ? "A" : "B"}</span>`);
        }
      }
      for (const ligne of corrige(billesDe({ exercice: "deux", de: 6, a: 10, nombre: 5 }, g)).split('class="dv-rang"').slice(1)) {
        const [x, y, t] = [...ligne.matchAll(/<b class="dv-rep">(\d+)<\/b>/g)].map((m) => Number(m[1]));
        expect(billes(ligne, 2.6).length).toBe(t);
        expect(x + y).toBe(t);
      }
      for (const [de, a] of [[10, 20], [21, 99]]) {
        const abaques = corrige(htmlAbaque({ de, a, parties: ["lire"] }, g));
        for (const ab of abaques.split("<div><svg").slice(1)) {
          const valeur = 10 * (ab.match(/fill="#e05252"/g) ?? []).length + (ab.match(/<ellipse[^>]*fill="#38a169"/g) ?? []).length;
          expect(ab).toContain(`<b class="dv-rep">${valeur}</b>`);
          expect(valeur >= de && valeur <= a).toBe(true);
        }
        // L'échange : ce qu'on avait avant vaut le nombre écrit après.
        const echange = corrige(htmlAbaque({ de, a, parties: ["echange"] }, g)).split('class="dv-echange"')[1];
        const avant = echange.split('class="dv-fleche"')[0];
        const total = 10 * (avant.match(/fill="#e05252"/g) ?? []).length + (avant.match(/fill="#38a169"/g) ?? []).length;
        expect(echange).toContain(`Le nombre : <b class="dv-rep">${total}</b>`);
      }
      for (const [de, a] of [[1, 20], [30, 79], [81, 100]]) {
        const html = corrige(htmlSuite({ de, a, exercices: ["manquants", "voisins", "ranger", "relier"] }, g));
        for (const f of html.match(/<table class="dv-frise[^"]*">.*?<\/table>/g) ?? []) {
          const suite = f.replace(/<[^>]+>/g, " ").trim().split(/\s+/).map(Number);
          expect(suite.length).toBe(Math.min(20, a - de + 1));
          suite.forEach((n, i) => { expect(n).toBe(suite[0] + i); expect(n >= de && n <= a).toBe(true); });
        }
        for (const m of html.matchAll(/<b class="dv-rep">(\d+)<\/b> <b class="dv-gros">(\d+)<\/b> <b class="dv-rep">(\d+)<\/b>/g)) {
          expect([Number(m[1]) + 1, Number(m[3]) - 1]).toEqual([Number(m[2]), Number(m[2])]);
        }
        for (const m of html.matchAll(/<div class="dv-cases">(.*?)<\/div>/g)) {
          const rangés = [...m[1].matchAll(/>(\d+)</g)].map((x) => Number(x[1]));
          expect(rangés).toEqual([...rangés].sort((x, y) => x - y));
        }
        for (const m of html.matchAll(/<div class="dv-relier-g">([^<]+) <span[^]*?<span class="dv-point"><\/span> (\d+)<\/div>/g)) {
          expect(m[1]).toBe(nombreEnLettres(Number(m[2])));
        }
      }
    }
  });
});
