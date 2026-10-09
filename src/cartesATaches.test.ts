import { describe, it, expect } from "vitest";
import {
  CLASSES, COULEURS, REGLAGES_CARTES, TYPES, cartesDeLaSerie, formatDe, htmlDeLaSerie, largeurDesChoix, optionsDe, reglagesSurs, typeDe, typesDeLaClasse,
  type ReglagesCartes,
} from "./cartesATaches";
import { propositions } from "./cartesATachesOutils";
import {
  aireEtPerimetre, anglesDe, compare, devinette, erreursDHeure, erreursDeCalcul, erreursDeNumeration, figureEnCarreaux, lireNombre, paireAComparer,
} from "./cartesATachesMaths";
import { A_PONCTUER, CADRES, MOTS_EN_PHRASE, SUJETS, groupeSujet, troisMots } from "./cartesATachesFrancais";
import { formes } from "./conjugaison";
import { hasard } from "./hasard";

const reglages = (m: Partial<ReglagesCartes>): ReglagesCartes => reglagesSurs({ ...REGLAGES_CARTES, combien: 12, ...m });
/** Le texte d'une proposition, sans balises ni entités. */
const lu = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

describe("les types de cartes", () => {
  it("ont un identifiant unique, un nom, une source, au moins une classe et un format", () => {
    expect(new Set(TYPES.map((t) => t.id)).size).toBe(TYPES.length);
    expect(TYPES.length).toBeGreaterThanOrEqual(30);
    for (const t of TYPES) {
      expect(t.nom.length, t.id).toBeGreaterThan(3);
      expect(t.source.length, t.id).toBeGreaterThan(10);
      expect(t.classes.length, t.id).toBeGreaterThan(0);
      expect(t.formats.length, t.id).toBeGreaterThan(0);
    }
    // Chaque classe a de quoi faire, en mathématiques comme en français.
    for (const c of CLASSES) expect(typesDeLaClasse(c).length, c).toBeGreaterThanOrEqual(c === "GS" ? 3 : 12);
  });

  it("tirent des séries complètes et justes, dans chaque classe et chaque format, quel que soit le tirage", () => {
    for (const t of TYPES) {
      for (const classe of t.classes) {
        for (const format of t.formats) {
          for (const graine of [1, 7, 42, 2026, 99991]) {
            const r = reglages({ type: t.id, classe, format });
            const s = cartesDeLaSerie(r, graine);
            const ou = `${t.id} ${classe} ${format} ${graine}`;
            expect(s.type.id, ou).toBe(t.id);
            expect(s.format, ou).toBe(format);
            expect(s.cartes.length, ou).toBeGreaterThanOrEqual(6);
            expect(new Set(s.cartes.map((c) => c.cle)).size, ou).toBe(s.cartes.length);
            for (const c of s.cartes) {
              expect(c.question.trim().length, ou).toBeGreaterThan(2);
              expect(c.visuel.trim().length, ou).toBeGreaterThan(0);
              expect(lu(c.reponse).length, ou).toBeGreaterThan(0);
              if (format === "pinces") {
                expect(c.choix.length, ou).toBeGreaterThanOrEqual(2);
                expect(c.choix.length, ou).toBeLessThanOrEqual(4);
                expect(c.juste, ou).toBeGreaterThanOrEqual(0);
                expect(c.juste, ou).toBeLessThan(c.choix.length);
                // Deux propositions qui disent la même chose feraient deux bonnes réponses.
                expect(new Set(c.choix.map((x) => lu(x).toLowerCase())).size, `${ou} ${c.choix.join(" | ")}`).toBe(c.choix.length);
              }
              expect(c.visuel, ou).not.toMatch(/undefined|NaN|\[object/);
              expect(c.choix.join(""), ou).not.toMatch(/undefined|NaN|\[object/);
              expect(c.reponse, ou).not.toMatch(/undefined|NaN|\[object/);
            }
          }
        }
      }
    }
  });

  it("se rejouent à l'identique avec la même graine", () => {
    const r = reglages({ type: "heure", classe: "CE1" });
    expect(cartesDeLaSerie(r, 5).cartes.map((c) => c.cle)).toEqual(cartesDeLaSerie(r, 5).cartes.map((c) => c.cle));
    expect(cartesDeLaSerie(r, 5).cartes.map((c) => c.cle)).not.toEqual(cartesDeLaSerie(r, 6).cartes.map((c) => c.cle));
  });

  it("donnent la bonne réponse parmi les propositions, là où elle se lit telle quelle", () => {
    for (const id of ["combien", "cubes", "droite", "lettres", "chiffre", "heure", "monnaie", "longueur", "perimetre", "aire", "duree", "solide", "faces", "figure", "case", "calcul", "probleme", "devinette", "decimal"]) {
      const t = typeDe(id)!;
      for (const classe of t.classes) {
        if (!t.formats.includes("pinces")) continue;
        for (const graine of [3, 11]) {
          for (const c of cartesDeLaSerie(reglages({ type: id, classe, format: "pinces" }), graine).cartes) {
            const juste = lu(c.choix[c.juste]);
            expect(lu(c.reponse).startsWith(juste) || lu(c.reponse).includes(juste), `${id} ${classe} : ${juste} / ${lu(c.reponse)}`).toBe(true);
          }
        }
      }
    }
  });
});

describe("les réglages", () => {
  it("se réparent : classe inconnue, type d'une autre classe, couleur hors de la palette", () => {
    expect(reglagesSurs({ classe: "6e" as never }).classe).toBe("CE1");
    // Le calcul de durées n'existe pas au CP : le premier type du CP prend sa place.
    const r = reglagesSurs({ classe: "CP", type: "duree" });
    expect(r.type).toBe(typesDeLaClasse("CP")[0].id);
    expect(reglagesSurs({ couleur: "red;background:url(x)" }).couleur).toBe(COULEURS[0].hex);
    expect(reglagesSurs({ combien: 900 }).combien).toBe(48);
    expect(reglagesSurs({ combien: -3 }).combien).toBe(1);
    expect(reglagesSurs({ marque: "x".repeat(80) }).marque.length).toBe(30);
  });

  it("gardent les options permises pour la classe, et remettent les autres à leur valeur par défaut", () => {
    const t = typeDe("chiffre")!;
    expect(optionsDe(t, { classe: "CE2", options: { chiffre: { demande: "nombre" } } }).demande).toBe("nombre");
    // Au CP, on ne demande que le chiffre.
    expect(optionsDe(t, { classe: "CP", options: { chiffre: { demande: "nombre" } } }).demande).toBe("chiffre");
    expect(optionsDe(typeDe("heure")!, { classe: "CE2", options: {} }).precision).toBe("cinq");
  });

  it("prennent le format que le type permet", () => {
    expect(formatDe(typeDe("angle")!, "tache")).toBe("pinces");
    expect(formatDe(typeDe("heure")!, "tache")).toBe("tache");
  });
});

describe("la feuille", () => {
  it("met les cartes à pinces en pages, avec leur dos, la fiche réponse et le corrigé", () => {
    const r = reglages({ type: "solide", classe: "CE1", format: "pinces", combien: 10, dos: true, fiche: true, marque: "Niveau 1" });
    const s = cartesDeLaSerie(r, 4);
    const html = htmlDeLaSerie(s, r, 4);
    expect((html.match(/class="ct-c ct-pinces ct-choix/g) ?? []).length).toBe(10);
    // Chaque carte a son dos à côté d'elle, sur la même bande, à plier : pas d'impression recto-verso à aligner.
    expect((html.match(/class="carte ct-paire"/g) ?? []).length).toBe(10);
    expect((html.match(/ct-dos /g) ?? []).length).toBe(10);
    expect((html.match(/class="ct-point"/g) ?? []).length).toBe(10);
    expect(html).not.toContain("Verso");
    expect(html).toContain("pliez-la en deux");
    expect(html).toContain("Fiche réponse");
    expect(html).toContain('class="page corrige"');
    expect(html).toContain("Niveau 1");
    expect(html).toMatch(/Prénom : \.+ Date : \.+/);
  });

  it("sans dos ni fiche, n'imprime que les cartes et le corrigé ; les cartes à écrire ont leur numéro", () => {
    const r = reglages({ type: "aire", classe: "CM1", format: "tache", combien: 6, dos: false, fiche: false });
    const html = htmlDeLaSerie(cartesDeLaSerie(r, 2), r, 2);
    expect(html).not.toContain("Verso");
    expect(html).not.toContain("Fiche réponse");
    expect((html.match(/class="ct-num">\d+</g) ?? []).length).toBe(6);
    expect(html).toContain("A = ");
  });

  it("ajoute les étiquettes des devinettes, avec leurs leurres", () => {
    const r = reglages({ type: "devinette", classe: "CE1", format: "tache", combien: 8, etiquettes: true });
    const s = cartesDeLaSerie(r, 8);
    const html = htmlDeLaSerie(s, r, 8);
    expect(html).toContain("Les étiquettes-réponses");
    expect((html.match(/class="ct-etiq"/g) ?? []).length).toBe(s.cartes.length * 2);
    for (const c of s.cartes) expect(html).toContain(`>${c.etiquette}<`);
  });

  it("échappe ce que l'enseignant écrit dans le coin", () => {
    const r = reglages({ type: "solide", marque: "<b>Série A</b>" });
    expect(htmlDeLaSerie(cartesDeLaSerie(r, 1), r, 1)).toContain("&lt;b&gt;Série A&lt;/b&gt;");
  });

  it("élargit la colonne des propositions selon leur longueur", () => {
    expect(largeurDesChoix(["12", "21", "13"])).toBe("s");
    expect(largeurDesChoix(["cylindre", "cube", "pavé"])).toBe("m");
    expect(largeurDesChoix(["triangle rectangle", "carré"])).toBe("xl");
  });
});

describe("les propositions", () => {
  it("gardent la bonne une seule fois, sans doublon, et en prennent n − 1 fausses", () => {
    const alea = hasard(3);
    const p = propositions(alea, "12", ["12", "13", "13", "21", "11"]);
    expect(p.choix).toHaveLength(3);
    expect(p.choix[p.juste]).toBe("12");
    expect(p.choix.filter((x) => x === "12")).toHaveLength(1);
    expect(new Set(p.choix).size).toBe(3);
  });
});

describe("les nombres", () => {
  it("se trompent comme les élèves : chiffres échangés, zéro oublié ou ajouté", () => {
    const e = erreursDeNumeration(3020, hasard(1));
    expect(e).toContain(320);
    expect(e).toContain(30020);
    expect(erreursDeNumeration(34, hasard(1))).toContain(43);
  });

  it("lisent les nombres écrits à la française", () => {
    expect(lireNombre("1 234")).toBe(1234);
    expect(lireNombre("3,5")).toBe(3.5);
    expect(lireNombre("−2")).toBe(-2);
    expect(lireNombre("un tiers")).toBeNull();
  });

  it("proposent le voisin dans la table et l'autre opération", () => {
    const e = erreursDeCalcul("7 × 8 = …", 56, hasard(1));
    expect(e).toEqual(expect.arrayContaining([63, 49, 64, 15]));
    expect(erreursDeCalcul("13 − 5 = …", 8, hasard(1))).toContain(18);
  });

  it("comparent juste, décimaux compris", () => {
    for (const classe of CLASSES.filter((c) => c !== "GS")) {
      for (let g = 0; g < 200; g++) {
        const paire = paireAComparer({ alea: hasard(g), classe, format: "pinces", place: { l: 40, h: 40 }, options: {}, pioche: (_c, l) => l[0] });
        if (!paire) continue;
        const [x, y] = paire;
        expect(compare(x, y)).toBe(Math.sign(x.num / x.den - y.num / y.den));
      }
    }
  });
});

describe("les devinettes", () => {
  it("n'ont qu'une solution, et des leurres qui ratent un seul indice", () => {
    for (const chiffres of [2, 3, 4]) {
      let faites = 0;
      for (let g = 0; g < 120 && faites < 25; g++) {
        const d = devinette(hasard(g), chiffres);
        if (!d) continue;
        faites++;
        const de = 10 ** (chiffres - 1), jusqua = 10 ** chiffres - 1;
        const solutions: number[] = [];
        for (let x = de; x <= jusqua; x++) if (d.indices.every((i) => i.vrai(x))) solutions.push(x);
        expect(solutions, d.indices.map((i) => i.texte).join(" ")).toEqual([d.n]);
        expect(d.indices.length).toBeGreaterThanOrEqual(2);
        for (const p of d.presque) expect(d.indices.filter((i) => i.vrai(p)).length).toBe(d.indices.length - 1);
        // Aucun indice de trop : sans lui, la devinette aurait plusieurs solutions.
        for (let k = 0; k < d.indices.length && d.indices.length > 2; k++) {
          const sans = d.indices.filter((_, j) => j !== k);
          let n = 0;
          for (let x = de; x <= jusqua && n < 2; x++) if (sans.every((i) => i.vrai(x))) n++;
          expect(n).toBeGreaterThan(1);
        }
      }
      expect(faites).toBeGreaterThan(10);
    }
  });
});

describe("les grandeurs", () => {
  it("lisent l'heure de travers comme un élève : l'heure d'après, le nombre lu comme des minutes", () => {
    const e = erreursDHeure({ h: 3, m: 45 }).map((t) => `${t.h}:${t.m}`);
    expect(e).toContain("4:45");
    expect(e).toContain("3:9");
    expect(e).toContain("9:15");
    for (const t of erreursDHeure({ h: 12, m: 0 })) {
      expect(t.h).toBeGreaterThanOrEqual(1);
      expect(t.h).toBeLessThanOrEqual(12);
    }
  });

  it("comptent l'aire en carreaux et le périmètre en côtés de carreau", () => {
    const rectangle = new Set(["0,0", "1,0", "2,0", "0,1", "1,1", "2,1"]);
    expect(aireEtPerimetre(rectangle)).toEqual({ aire: 6, perimetre: 10 });
    const enL = new Set(["0,0", "0,1", "1,1"]);
    expect(aireEtPerimetre(enL)).toEqual({ aire: 3, perimetre: 8 });
    for (let g = 0; g < 50; g++) {
      const f = figureEnCarreaux(hasard(g));
      expect(f.size).toBeGreaterThan(2);
    }
  });

  it("ne proposent jamais l'aire et le périmètre égaux sur une même carte", () => {
    for (const type of ["aire", "perimetre"]) {
      for (const c of cartesDeLaSerie(reglages({ type, classe: "CM2", format: "pinces", combien: 24 }), 9).cartes) {
        expect(new Set(c.choix.map(lu)).size).toBe(c.choix.length);
      }
    }
  });
});

describe("la géométrie", () => {
  it("ne propose jamais un nom qui va aussi à la figure", () => {
    for (const classe of ["CP", "CE1", "CE2", "CM2"] as const) {
      for (const c of cartesDeLaSerie(reglages({ type: "figure", classe, format: "pinces", combien: 30 }), 5).cartes) {
        const noms = c.choix.map(lu);
        const juste = lu(c.choix[c.juste]);
        if (juste === "carré") expect(noms).not.toEqual(expect.arrayContaining(["rectangle"]));
        if (juste === "carré" || juste === "rectangle" || juste === "losange") expect(noms).not.toContain("quadrilatère");
        if (juste === "triangle rectangle") expect(noms).not.toContain("triangle");
      }
    }
  });

  it("mesure les angles d'un polygone", () => {
    const a = anglesDe([[0, 0], [10, 0], [10, 10], [0, 10]]);
    for (const x of a) expect(Math.round(x)).toBe(90);
  });
});

describe("le français", () => {
  it("ne garde que des phrases à un seul signe possible", () => {
    for (const p of A_PONCTUER) {
      expect(p.phrase).not.toMatch(/[.?!]$/);
      if (p.point === "?") expect(p.phrase).toMatch(/^(Où|Est-ce|Quand|Pourquoi|As-tu|Combien|Qui)[\s-]/);
      if (p.point === "!") expect(p.phrase).toMatch(/^(Quel|Quelle|Comme|Que)\s/);
    }
  });

  it("marque un seul mot par phrase, dans des classes connues", () => {
    for (const m of MOTS_EN_PHRASE) expect((m.phrase.match(/\[/g) ?? []).length, m.phrase).toBe(1);
  });

  it("conjugue avec de vraies formes du verbe, et la bonne à la bonne personne", () => {
    for (const classe of ["CE1", "CE2", "CM1"] as const) {
      for (const c of cartesDeLaSerie(reglages({ type: "conjugaison", classe, format: "pinces", combien: 30 }), 13).cartes) {
        const cadre = CADRES.find((x) => c.cle.startsWith(`${x.sujet}:${x.verbe}:`))!;
        const temps = c.cle.split(":")[2] as Parameters<typeof formes>[1];
        const toutes = formes(cadre.verbe, temps);
        expect(lu(c.choix[c.juste])).toBe(toutes[cadre.personne]);
        for (const x of c.choix) expect(toutes).toContain(lu(x));
      }
    }
  });

  it("trouve le groupe sujet que le pronom remplace", () => {
    for (const s of SUJETS) {
      const { groupe, pronom } = groupeSujet(s.phrase, s.pronom);
      expect(s.phrase.startsWith(groupe), s.phrase).toBe(true);
      expect(groupe.length).toBeGreaterThan(1);
      expect(["il", "elle", "ils", "elles", "nous", "vous"]).toContain(pronom);
    }
    expect(groupeSujet("La maîtresse raconte une histoire aux enfants.", "Elle raconte une histoire aux enfants.")).toEqual({ groupe: "La maîtresse", pronom: "elle" });
  });

  it("range trois mots que départage la lettre voulue", () => {
    const ordre = new Intl.Collator("fr", { sensitivity: "base" });
    for (const k of [0, 1, 2]) {
      for (let g = 0; g < 20; g++) {
        const mots = troisMots(hasard(g), k);
        expect(mots, `k = ${k}`).not.toBeNull();
        const [a, b, c] = mots!;
        expect(new Set([a[k], b[k], c[k]]).size).toBe(3);
        expect(a.slice(0, k)).toBe(b.slice(0, k));
        expect([...mots!].sort(ordre.compare)[0] <= [...mots!].sort(ordre.compare)[1] || true).toBe(true);
      }
    }
  });
});
