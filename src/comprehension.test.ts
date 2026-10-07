import { describe, it, expect } from "vitest";
import { EXERCICES_COMPREHENSION, REGLAGES_COMPREHENSION, htmlComprehension, questionsChoisies, souligner, texteDeLExercice } from "./comprehension";
import { TEXTES, ligneDe, lignesNumerotees, type Classe } from "./textesDeComprehension";

const sansAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

describe("les textes à comprendre", () => {
  it("ont la longueur que le programme donne à chaque classe : une dizaine, une quinzaine, une vingtaine de lignes", () => {
    const bornes: Record<Classe, [number, number]> = { CP: [9, 12], CE1: [13, 17], CE2: [16, 22] };
    for (const t of TEXTES) {
      const n = t.lignes.filter((l) => l.trim()).length;
      expect(n, t.id).toBeGreaterThanOrEqual(bornes[t.classe][0]);
      expect(n, t.id).toBeLessThanOrEqual(bornes[t.classe][1]);
    }
    // Chaque classe a ses récits, ses documentaires, ses règles ou recettes ; le CE2, un poème et une scène de théâtre.
    for (const classe of ["CP", "CE1", "CE2"] as Classe[]) for (const type of ["narratif", "informatif", "prescriptif"]) {
      expect(TEXTES.some((t) => t.classe === classe && t.type === type), `${classe} ${type}`).toBe(true);
    }
    expect(TEXTES.filter((t) => t.type === "poétique" || t.type === "théâtral").every((t) => t.classe === "CE2")).toBe(true);
    expect(new Set(TEXTES.map((t) => t.id)).size).toBe(TEXTES.length);
  });

  it("renvoient à des lignes qui disent bien ce qu'on y cherche", () => {
    for (const t of TEXTES) {
      const n = t.lignes.filter((l) => l.trim()).length;
      for (const q of t.questions) if (q.ligne) { expect(q.ligne, `${t.id} : ${q.q}`).toBeGreaterThanOrEqual(1); expect(q.ligne, `${t.id} : ${q.q}`).toBeLessThanOrEqual(n); }
      // Les reprises et le mot inconnu sont bien dans la ligne qu'on donne.
      for (const x of t.reprises) expect(sansAccents(ligneDe(t, x.ligne)), `${t.id} : « ${x.mot} » ligne ${x.ligne}`).toContain(sansAccents(x.mot));
      expect(sansAccents(ligneDe(t, t.motInconnu.ligne)), `${t.id} : ${t.motInconnu.mot}`).toContain(sansAccents(t.motInconnu.mot));
      // Une question « qui est… à la ligne n » porte sur la ligne n.
      for (const q of t.questions) {
        const m = /à la ligne (\d+)/.exec(q.q);
        if (m) expect(q.ligne, `${t.id} : ${q.q}`).toBe(Number(m[1]));
      }
      expect(t.resumes, t.id).toHaveLength(3);
      expect(new Set(t.resumes).size, t.id).toBe(3);
      expect(t.motInconnu.leurres, t.id).toHaveLength(2);
      // Les affirmations : des vraies, une fausse au moins, une qu'on ne peut pas savoir ; le vrai et le faux ont leur ligne.
      expect(t.affirmations.filter((x) => x.v === "vrai").length, t.id).toBeGreaterThanOrEqual(1);
      expect(t.affirmations.filter((x) => x.v === "faux").length, t.id).toBeGreaterThanOrEqual(1);
      expect(t.affirmations.filter((x) => x.v === "?").length, t.id).toBe(1);
      for (const x of t.affirmations) {
        if (x.v === "?") expect(x.ligne, `${t.id} : ${x.a}`).toBeUndefined();
        else { expect(x.ligne, `${t.id} : ${x.a}`).toBeGreaterThanOrEqual(1); expect(x.ligne!, `${t.id} : ${x.a}`).toBeLessThanOrEqual(n); }
      }
      if (t.type === "narratif" || t.type === "théâtral") {
        expect(t.moments, t.id).toHaveLength(4);
        // Ce que ressent un personnage : l'indice est mot pour mot dans la ligne donnée.
        expect(t.emotions?.length, t.id).toBe(2);
        for (const e of t.emotions!) expect(ligneDe(t, e.ligne), `${t.id} : ${e.qui}`).toContain(e.indice);
      }
      expect(t.questions.length, t.id).toBeGreaterThanOrEqual(5);
      expect(t.questions.some((q) => q.type === "inférence"), t.id).toBe(true);
      expect(t.questions.some((q) => q.type === "reprise"), t.id).toBe(true);
    }
  });

  it("numérotent les vers du poème sans compter les lignes vides", () => {
    const poeme = TEXTES.find((t) => t.id === "poeme-pluie")!;
    const lignes = lignesNumerotees(poeme);
    expect(lignes.filter((l) => l.n === null)).toHaveLength(3);
    expect(ligneDe(poeme, 11)).toBe("Il fait le gros dos, le pitre,");
    expect(lignes[lignes.length - 1].n).toBe(16);
  });
});

describe("l'atelier « Comprendre un texte »", () => {
  it("souligne le mot entier, à sa ligne, sans toucher aux autres", () => {
    expect(souligner("Les scientifiques le surveillent sans arrêt", ["le"])).toBe('Les scientifiques <span class="cx-souligne">le</span> surveillent sans arrêt');
    expect(souligner("Quand il sort du volcan, on l'appelle la lave.", ["l'"])).toContain('on <span class="cx-souligne">l&#39;</span>appelle');
    expect(souligner("« Où vas-tu ? » demande-t-elle.", ["elle"])).toContain('demande-t-<span class="cx-souligne">elle</span>.');
    expect(souligner("Elle les a posées sur la table de la cuisine,", ["Elle", "les"]).match(/cx-souligne/g)).toHaveLength(2);
  });

  it("imprime chaque exercice, pour chaque classe et plusieurs tirages, avec son corrigé", () => {
    for (const e of EXERCICES_COMPREHENSION) for (const classe of ["CP", "CE1", "CE2"] as Classe[]) for (const graine of [1, 2, 3, 4]) {
      const html = htmlComprehension({ ...REGLAGES_COMPREHENSION, exercice: e.id, classe }, graine);
      expect(html, `${e.id} ${classe}`).toMatch(/^<div class="feuille cx">/);
      expect(html, `${e.id} ${classe}`).toContain('class="page corrige"');
      expect(html, `${e.id} ${classe}`).not.toMatch(/NaN|undefined|null/);
    }
    // Les moments : toujours un récit ; écouter : l'élève n'a pas le texte.
    for (let g = 1; g < 20; g++) expect(texteDeLExercice({ ...REGLAGES_COMPREHENSION, exercice: "moments", classe: "CP" }, g).moments).toBeDefined();
    const ecoute = htmlComprehension({ ...REGLAGES_COMPREHENSION, exercice: "ecoute", classe: "CE1", texte: "phare" }, 1);
    const [eleve, adulte] = ecoute.split('class="page corrige"');
    expect(eleve).not.toContain("Au bout de l'île");
    expect(adulte).toContain("Au bout de l&#39;île");
    expect(eleve).toContain("J'ai compris le texte");
    // À l'écoute, ni numéro de ligne ni reprise : l'élève n'a pas le texte sous les yeux.
    expect(eleve).not.toMatch(/ligne \d|Qui est-ce/);
    expect(eleve).toContain("Je m'en souviens");
    // Le texte choisi par l'enseignant passe avant le hasard ; un filtre trop étroit garde toutes les questions.
    expect(htmlComprehension({ ...REGLAGES_COMPREHENSION, texte: "volcan" }, 9)).toContain("Les volcans");
    const herisson = TEXTES.find((t) => t.id === "herisson")!;
    expect(questionsChoisies(herisson, "reprise")).toEqual(herisson.questions);
    expect(questionsChoisies(herisson, "littérale").every((q) => q.type === "littérale")).toBe(true);
  });

  it("fait expliquer les inférences, dire les émotions et, au CE1 et au CE2, donner un titre au texte", () => {
    const inf = htmlComprehension({ ...REGLAGES_COMPREHENSION, exercice: "inferences", classe: "CE1", texte: "gouter" }, 1);
    expect(inf).toContain("Ce que je sais déjà");
    expect(inf.match(/class="cx-cadre"/g)).toHaveLength(TEXTES.find((t) => t.id === "gouter")!.questions.filter((q) => q.type === "inférence").length);
    expect(htmlComprehension({ ...REGLAGES_COMPREHENSION, exercice: "inferences", classe: "CP", texte: "chaton" }, 1)).not.toContain("cx-cadre");
    // Les émotions : un récit, même si le texte choisi est un documentaire.
    const emo = htmlComprehension({ ...REGLAGES_COMPREHENSION, exercice: "emotions", classe: "CE1", texte: "volcan" }, 3);
    expect(emo).toContain("ce que ressentent les personnages");
    expect(emo).not.toContain("Les volcans");
    // Le titre : caché sur la page du texte au CE1, donné au corrigé.
    const titre = htmlComprehension({ ...REGLAGES_COMPREHENSION, exercice: "sensGlobal", classe: "CE1", texte: "phare" }, 1);
    const [eleve, corrige] = titre.split('class="page corrige"');
    expect(eleve).not.toContain("La lumière du phare");
    expect(corrige).toContain("La lumière du phare");
    expect(htmlComprehension({ ...REGLAGES_COMPREHENSION, exercice: "sensGlobal", classe: "CP", texte: "chaton" }, 1).split('class="page corrige"')[0]).toContain("Le chaton perdu");
  });

  it("fait juger des affirmations : au CP vrai ou faux, ensuite aussi « je ne peux pas savoir »", () => {
    const cp = htmlComprehension({ ...REGLAGES_COMPREHENSION, exercice: "vraiFaux", classe: "CP", texte: "chaton" }, 1);
    expect(cp).not.toContain("Je ne peux pas savoir");
    expect(cp.split('class="page corrige"')[0].match(/<tr><td><b>/g)).toHaveLength(3);
    const ce1 = htmlComprehension({ ...REGLAGES_COMPREHENSION, exercice: "vraiFaux", classe: "CE1", texte: "phare" }, 1);
    expect(ce1).toContain("Je ne peux pas savoir");
    expect(ce1.split('class="page corrige"')[1]).toContain("le texte n'en dit rien");
  });

  it("au CE2, fait reconnaître les cinq types de textes", () => {
    const html = htmlComprehension({ ...REGLAGES_COMPREHENSION, exercice: "typesDeTextes", classe: "CE2" }, 2);
    expect(html.match(/<b>Texte \d<\/b><\/div>/g)).toHaveLength(5);
    expect(htmlComprehension({ ...REGLAGES_COMPREHENSION, exercice: "typesDeTextes", classe: "CP" }, 2).match(/<b>Texte \d<\/b><\/div>/g)).toHaveLength(3);
  });
});
