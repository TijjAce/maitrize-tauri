import { describe, expect, it, vi } from "vitest";

// Les tests tournent sans navigateur : un localStorage de poche, vide — les réglages laissés sont ceux par défaut.
(globalThis as any).localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const poses: { atelier: string; titre: string; html: string; seanceId: string; sequenceId: string; extras: any }[] = [];
vi.mock("./impressionAtelier", () => ({
  poserDansUneSeance: async (atelier: string, titre: string, html: string, _style: string, seanceId: string, sequenceId: string, extras: any) => {
    poses.push({ atelier, titre, html, seanceId, sequenceId, extras });
    return { id: `m${poses.length}` };
  },
}));

const S = await import("./supportsDeLAssistant");
const chercher = (classe: string, matiere: string | undefined, texte: string) =>
  S.supportsDuSujet({ classe: S.classeDuNiveau(classe), matiere, texte, periode: 2 });

describe("les supports de l'Assistant", () => {
  it("lit la classe, dite de toutes les façons", () => {
    expect(S.classeDuNiveau("CP")).toBe("CP");
    expect(S.classeDuNiveau("pour des niveaux CP, et oui il y a un élève")).toBe("CP");
    expect(S.classeDuNiveau("en ce2")).toBe("CE2");
    expect(S.classeDuNiveau("en grande section")).toBe("GS");
    expect(S.classeDuNiveau("IME")).toBeNull();
    expect(S.classeDuNiveau(null)).toBeNull();
  });

  it("trouve les séquences du sujet, à la bonne classe, et leurs feuilles numérotées", () => {
    const s = chercher("CP", "Mathématiques", "décomposer les nombres jusqu'à 10");
    expect(s.sequences.length).toBeGreaterThan(0);
    expect(s.sequences.every((x) => x.classe === "CP")).toBe(true);
    expect(s.feuilles.length).toBeGreaterThan(5);
    expect(s.feuilles.map((f) => f.ref).slice(0, 3)).toEqual(["F1", "F2", "F3"]);
    // Une seule fois chacune : deux séquences prennent parfois la même.
    expect(new Set(s.feuilles.map((f) => `${f.atelier}|${f.titre}`)).size).toBe(s.feuilles.length);
    const table = chercher("CE1", "Mathématiques", "la table de 7");
    expect(table.feuilles.some((f) => /table de 7/i.test(f.titre))).toBe(true);
    const fractions = chercher("CM1", "Mathématiques", "les fractions");
    expect(fractions.sequences.every((x) => x.classe === "CM1")).toBe(true);
    expect(chercher("CE2", "Français", "le passé composé").feuilles.some((f) => /pass[eé] compos[eé]/i.test(f.titre))).toBe(true);
  });

  it("fait fabriquer de vraies feuilles par les générateurs, qui se rouvrent dans Fabriquer", async () => {
    for (const [classe, matiere, texte] of [["CP", "Mathématiques", "les nombres jusqu'à 10"], ["CE1", "Mathématiques", "la table de 7"], ["CE2", "Français", "le passé composé"], ["CM2", "Histoire-géographie", "la Première Guerre mondiale"]]) {
      const s = chercher(classe, matiere, texte);
      expect(s.feuilles.length, texte).toBeGreaterThan(0);
      for (const f of s.feuilles) {
        const r = await S.fabriquerLaFeuille(f, 12345);
        expect(r.html.length, f.titre).toBeGreaterThan(50);
        expect(r.titre).toBe(f.titre);
        expect(r.atelier).toBe(f.atelier);
      }
    }
  });

  it("donne la même feuille pour le même tirage : celle qu'on regarde est celle qu'on crée", async () => {
    const f = chercher("CP", "Mathématiques", "les nombres jusqu'à 10").feuilles[0];
    const a = await S.fabriquerLaFeuille(f, 777);
    const b = await S.fabriquerLaFeuille(f, 777);
    expect(a.html).toBe(b.html);
  });

  it("retrouve une feuille par son titre si le plan a bougé, et le dit si elle a disparu", async () => {
    const f = chercher("CP", "Mathématiques", "les nombres jusqu'à 10").feuilles[1];
    const bouge = await S.fabriquerLaFeuille({ ...f, rang: 999 }, 1);
    expect(bouge.titre).toBe(f.titre);
    await expect(S.fabriquerLaFeuille({ ...f, titre: "Une feuille disparue" }, 1)).rejects.toThrow(/n'existe plus/);
    await expect(S.fabriquerLaFeuille({ ...f, demarcheId: "inconnue" }, 1)).rejects.toThrow(/n'existe plus/);
  });

  it("ne propose rien sans la classe ou le sujet, ni pour une matière sans dossier", () => {
    expect(chercher("IME", "Mathématiques", "les nombres").sequences).toEqual([]);
    expect(chercher("CP", "Mathématiques", "")).toEqual(S.AUCUN_SUPPORT);
    // La dictée parlait de ballon : ce n'est pas de l'EPS.
    const eps = chercher("CP", "EPS", "lancer un ballon");
    expect(eps.sequences).toEqual([]);
    expect(eps.feuilles).toEqual([]);
    // Ce que l'enseignant laisse au choix ne filtre rien.
    expect(chercher("CP", "à choisir", "les nombres jusqu'à 10").sequences.length).toBeGreaterThan(0);
  });

  it("garde en tête les feuilles qu'une fiche a déjà prises, même si le sujet a changé", () => {
    const f = chercher("CP", "Mathématiques", "les nombres jusqu'à 10").feuilles[3];
    const { demarcheId, classe, periode, rang, atelier, titre } = f;
    const s = S.supportsDuSujet({ classe: "CP", matiere: "Français", texte: "les syllabes", periode: 2, deja: [{ demarcheId, classe, periode, rang, atelier, titre }] });
    expect(s.feuilles[0]).toMatchObject({ ref: "F1", titre });
    const sansSujet = S.supportsDuSujet({ classe: null, texte: "", periode: 2, deja: [{ demarcheId, classe, periode, rang, atelier, titre }] });
    expect(sansSujet.feuilles).toHaveLength(1);
  });

  it("nomme les ateliers de ce cycle seulement", () => {
    const petits = chercher("PS", "Mathématiques", "construire des collections");
    expect(petits.ateliers.map((a) => a.id)).toContain("collections");
    expect(petits.ateliers.some((a) => /CM1|CM2/.test(a.nom))).toBe(false);
    expect(chercher("CM1", "Mathématiques", "le calcul").ateliers.map((a) => a.id)).toContain("calculCM");
    expect(chercher("CP", "Mathématiques", "le calcul").ateliers.map((a) => a.id)).not.toContain("calculCM");
    // Ni les dossiers de séquences, ni le générateur à décrire.
    expect(chercher("CP", "Mathématiques", "générateur séquences").ateliers.map((a) => a.id)).not.toContain("perso");
  });

  it("nomme en maternelle les feuilles que la banque illustrera, et sinon ses ateliers", () => {
    const s = chercher("GS", "Français", "le vilain petit canard");
    expect(s.sequences.length).toBeGreaterThan(0);
    expect(chercher("GS", "Français", "les syllabes").ateliers.length).toBeGreaterThan(0);
  });

  it("montre au modèle des noms et des numéros, pas la façon de les fabriquer", () => {
    const s = chercher("CP", "Mathématiques", "les nombres jusqu'à 10");
    const bloc = S.blocDesSupports(s);
    expect(bloc).toContain("F1 : ");
    expect(bloc).toContain("Les feuilles que l'application sait fabriquer");
    expect(bloc).toContain(s.sequences[0].demarche.nom);
    expect(bloc).toContain(s.sequences[0].demarche.seances[0].titre);
    // Pendant l'entretien, pas besoin des séances.
    expect(S.blocDesSupports(s, false)).not.toContain(s.sequences[0].demarche.seances[0].objectifs);
    expect(S.blocDesSupports(S.AUCUN_SUPPORT)).toBe("");
  });

  it("range chaque feuille dans sa séance, et continue si l'une échoue", async () => {
    poses.length = 0;
    const [a, b] = chercher("CP", "Mathématiques", "les nombres jusqu'à 10").feuilles;
    const avancement: string[] = [];
    const ratees: string[] = [];
    await S.poserLesFeuilles({
      parSeance: [[a], [{ ...a, titre: "Une feuille disparue" }, b]], seances: [{ id: "s1" }, { id: "s2" }] as any, sequenceId: "q", graine: 5, competence: null,
      surProgres: (fait, total) => avancement.push(`${fait}/${total}`), surEchec: (t) => ratees.push(t),
    });
    expect(avancement).toEqual(["1/3", "2/3", "3/3"]);
    expect(ratees).toEqual(["Une feuille disparue"]);
    expect(poses.map((p) => [p.seanceId, p.titre])).toEqual([["s1", a.titre], ["s2", b.titre]]);
    expect(poses[0].sequenceId).toBe("q");
    // Le tirage et les réglages partent avec : « Modifier dans Fabriquer » la rouvre telle quelle.
    expect(poses[0].extras.fabrication.graine).toEqual(expect.any(Number));
  });
});
