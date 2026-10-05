import { describe, it, expect } from "vitest";
import {
  MODELES_TROUS, REGLAGES_TROUS, estUnTrou, etiquettesEnPlus, htmlTexteATrous, largeurDesCases, morceauxDe, pagesATrous, phrasesATrous,
  phrasesSansTrou, queDesFormesEtreAvoir, reglagesTrousSurs, trousDe, type ReglagesTrous,
} from "./texteATrous";

const compter = (html: string, motif: RegExp) => (html.match(motif) ?? []).length;
const r = (p: Partial<ReglagesTrous> = {}) => reglagesTrousSurs({ ...REGLAGES_TROUS, ...p });
const trier = (l: string[]) => [...l].sort();

describe("le texte à trous", () => {
  it("retire les mots écrits entre astérisques, avec l'infinitif d'être et d'avoir ou l'indice écrit", () => {
    expect(morceauxDe("Je *suis* à l'école et j'*ai* faim.")).toEqual([
      { texte: "Je " }, { trou: { mot: "suis", indice: "être" } }, { texte: " à l'école et j'" }, { trou: { mot: "ai", indice: "avoir" } }, { texte: " faim." },
    ]);
    expect(trousDe(morceauxDe("Le chat *mange|manger* une souris."))).toEqual([{ mot: "mange", indice: "manger" }]);
    expect(trousDe(morceauxDe("Il *court* vite."))).toEqual([{ mot: "court", indice: "" }]);
    // Une étoile seule n'ouvre pas de trou ; une phrase sans trou se signale.
    const phrases = phrasesATrous("Il *est* là.\n\nTrois * deux.\n  Nous *avons* faim.  ");
    expect(phrases).toHaveLength(3);
    expect(phrasesSansTrou(phrases)).toEqual([2]);
    expect(morceauxDe("Trois * deux.").some(estUnTrou)).toBe(false);
  });

  it("donne à toutes les cases et à toutes les étiquettes la largeur du plus long mot", () => {
    const court = largeurDesCases(["a", "es"], r());
    const long = largeurDesCases(["a", "sommes"], r());
    expect(long).toBeGreaterThan(court);
    expect(largeurDesCases(["sommes"], r({ taille: "grande" }))).toBeGreaterThan(long);
    expect(largeurDesCases(["sommes"], r({ capitales: true }))).toBeGreaterThan(long);
    const html = htmlTexteATrous(r({ phrases: "Tu *as* un vélo.\nNous *sommes* là." }), 1);
    expect(html).toContain(`style="--l:${long}mm"`);
  });

  it("ajoute des formes d'être et d'avoir que les phrases n'emploient pas — et seulement pour être et avoir", () => {
    const phrases = phrasesATrous(MODELES_TROUS[0].phrases);
    expect(queDesFormesEtreAvoir(phrases)).toBe(true);
    const enPlus = etiquettesEnPlus(phrases, { intrus: 3, autres: "et, à" }, 4);
    expect(enPlus.slice(0, 2)).toEqual(["et", "à"]);
    expect(enPlus).toHaveLength(5);
    // Être au présent emploie toutes ses formes : les étiquettes en plus sont d'avoir.
    for (const f of enPlus.slice(2)) expect(["ai", "as", "a", "avons", "avez", "ont"]).toContain(f);
    const autres = phrasesATrous("Le chat *mange* une souris.");
    expect(queDesFormesEtreAvoir(autres)).toBe(false);
    expect(etiquettesEnPlus(autres, { intrus: 3, autres: "" }, 4)).toEqual([]);
  });

  it("met sous les phrases de chaque page leurs étiquettes, mélangées, celles en plus avec la dernière", () => {
    const reglages = r({ phrases: MODELES_TROUS[2].phrases, intrus: 2 });
    const phrases = phrasesATrous(reglages.phrases);
    const pages = pagesATrous(phrases, reglages, 9);
    expect(pages).toHaveLength(1);
    const mots = phrases.flatMap(trousDe).map((t) => t.mot);
    expect(trier(pages[0].etiquettes)).toEqual(trier([...mots, ...etiquettesEnPlus(phrases, reglages, 9)]));
    expect(pages[0].etiquettes).not.toEqual([...mots, ...etiquettesEnPlus(phrases, reglages, 9)]);
    // Le même tirage se réimprime à l'identique.
    expect(pagesATrous(phrases, reglages, 9)).toEqual(pages);
    // Beaucoup de phrases : plusieurs pages, chacune avec ses étiquettes, la numérotation continue.
    const longues = r({ phrases: Array.from({ length: 4 }, () => MODELES_TROUS[0].phrases).join("\n"), lignes: true, taille: "grande" });
    const plusieurs = pagesATrous(phrasesATrous(longues.phrases), longues, 1);
    expect(plusieurs.length).toBeGreaterThan(1);
    for (const p of plusieurs) expect(trier(p.etiquettes)).toEqual(trier(p.phrases.flatMap(trousDe).map((t) => t.mot)));
    expect(plusieurs[1].debut).toBe(plusieurs[0].phrases.length);
    const html = htmlTexteATrous(longues, 1);
    expect(html).toContain(`<ol class="tt-phrases" start="${plusieurs[1].debut + 1}">`);
    expect(html).toContain("(suite)");
  });

  it("s'imprime : la consigne, le rappel, une case par trou, une étiquette par case, le corrigé", () => {
    const reglages = r({ phrases: MODELES_TROUS[2].phrases, indices: true, intrus: 1 });
    const html = htmlTexteATrous(reglages, 3);
    const trous = phrasesATrous(reglages.phrases).flatMap(trousDe).length;
    expect(compter(html, /class="tt-trou"/g)).toBe(trous);
    expect(compter(html, /class="tt-etiquette"/g)).toBe(trous + 1);
    expect(compter(html, /class="tt-indice">être</g) + compter(html, /class="tt-indice">avoir</g)).toBe(trous);
    expect(html).toContain('class="regle"');
    expect(html).toContain("🔎 Je vérifie");
    expect(html).toContain('<div class="page corrige">');
    expect(html).toContain("<li>Je <b>suis</b> à l&#39;école et j&#39;<b>ai</b> faim.</li>");
    // Sans le rappel, ni les indices.
    const sobre = htmlTexteATrous(r({ phrases: reglages.phrases, methode: false, indices: false }), 3);
    expect(sobre).not.toContain("tt-methode");
    expect(sobre).not.toContain("tt-indice");
    expect(htmlTexteATrous(r({ capitales: true, taille: "grande" }), 3)).toContain('class="feuille tt tt-grande tt-capitales"');
  });

  it("répare des réglages abîmés", () => {
    const s = reglagesTrousSurs({ intrus: 40, taille: "énorme" as never, phrases: 3 as never, methode: undefined });
    expect(s.intrus).toBe(6);
    expect(s.taille).toBe("normale");
    expect(s.phrases).toBe("");
    expect(s.methode).toBe(true);
  });
});
