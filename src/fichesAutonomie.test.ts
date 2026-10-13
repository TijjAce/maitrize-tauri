import { describe, expect, it } from "vitest";
import type { Creneau, Eleve, MaterielItem } from "./api";
import {
  NIVEAUX_FICHES, RECETTES, combienDeFiches, elevesDuJour, graineDe, motsDuSon, niveauDesFiches, nomDeLaRecette, prenomEcrit, prevuAvecLesFiches,
  proposer, recetteDe, recettesPour, repartir, titreDeLaFiche, titreLibre, uneAutre, uneDePlus, type OutilsFiche,
} from "./fichesAutonomie";
import { ETAPES, motsDe } from "./progressionCgp";
import { titreSansLEleve } from "./impressionAtelier";
import { pdfsCites } from "./materielAImprimer";

const outils: OutilsFiche = {
  image: async (id) => `data:image/png;base64,${id}`,
  pictos: async (mots) => Object.fromEntries(mots.map((m, i) => [m.toLowerCase(), 1000 + i])),
};

const eleve = (id: string, nom: string, niveau: string, plus: Partial<Eleve> = {}): Eleve =>
  ({ id, nom, niveau, present: true, ine: "", dateNaissance: "", photoFichier: null, ...plus });

const creneau = (id: string, heureDebut: string, eleves: string[], plus: Partial<Creneau> = {}): Creneau => ({
  id, date: "2026-10-07", heureDebut, heureFin: heureDebut.replace(/^(\d\d)/, (h) => String(Number(h) + 1).padStart(2, "0")), matiere: "Français",
  couleur: "", seanceId: null, atelierId: null, espaceId: null, elevesJson: JSON.stringify(eleves), nature: "classe", prevu: "", bilan: "", ...plus,
});

describe("le niveau et le nombre de fiches", () => {
  it("lit le niveau de l'élève ; au-delà du CE2, les fiches du CE2 ; rien sans niveau", () => {
    expect(niveauDesFiches("CP")).toBe("CP");
    expect(niveauDesFiches(" ce1 ")).toBe("CE1");
    expect(niveauDesFiches("TPS")).toBe("PS");
    expect(niveauDesFiches("CM2")).toBe("CE2");
    expect(niveauDesFiches("")).toBeNull();
    expect(niveauDesFiches("ULIS")).toBeNull();
  });

  it("trois fiches en maternelle, quatre du CP au CE2, une au moins par créneau", () => {
    expect(combienDeFiches("PS")).toBe(3);
    expect(combienDeFiches("GS", 2)).toBe(3);
    expect(combienDeFiches("CP")).toBe(4);
    expect(combienDeFiches("CE2", 5)).toBe(5);
    expect(combienDeFiches("CE1", 20)).toBe(8);
  });
});

describe("les fiches qu'on propose", () => {
  it("un élève non verbal ne reçoit pas de fiche de lecture", () => {
    for (const n of NIVEAUX_FICHES) for (let p = 1; p <= 5; p++) {
      expect(recettesPour(n, p, true).some((r) => r.lecture)).toBe(false);
    }
    expect(recettesPour("CE1", 3, false).some((r) => r.lecture)).toBe(true);
    for (let g = 1; g < 40; g++) {
      const fiches = proposer("CE1", 3, true, 4, g);
      expect(fiches).toHaveLength(4);
      expect(fiches.every((f) => !recetteDe(f.recette)?.lecture)).toBe(true);
    }
  });

  it("au CP, pas de texte à comprendre seul avant la troisième période", () => {
    expect(recettesPour("CP", 1, false).map((r) => r.id)).not.toContain("comprendre");
    expect(recettesPour("CP", 3, false).map((r) => r.id)).toContain("comprendre");
    expect(recettesPour("CP", 3, false).map((r) => r.id)).not.toContain("grammaire");
    expect(recettesPour("CE1", 1, false).map((r) => r.id)).toContain("comprendre");
  });

  it("le français et les maths tour à tour, quatre fiches différentes", () => {
    for (let g = 1; g < 40; g++) {
      const fiches = proposer("CE2", 2, false, 4, g);
      expect(fiches.map((f) => recetteDe(f.recette)?.domaine)).toEqual(["francais", "maths", "francais", "maths"]);
      expect(new Set(fiches.map((f) => f.recette)).size).toBe(4);
    }
  });

  it("en maternelle : les nombres, les lettres, le temps — chaque âge les siens", () => {
    for (let g = 1; g < 20; g++) {
      expect(proposer("PS", 1, false, 3, g).map((f) => f.recette)).toEqual(["suite", "suite", "suite"]);
      expect(proposer("MS", 1, false, 3, g).map((f) => recetteDe(f.recette)?.domaine)).toEqual(["nombres", "temps", "nombres"]);
      expect(proposer("GS", 1, false, 3, g).map((f) => recetteDe(f.recette)?.domaine)).toEqual(["nombres", "lettres", "temps"]);
    }
  });

  it("ne tire jamais « Trouve l'intrus » : il se fait en disant pourquoi, et une ligne au hasard a souvent plusieurs intrus", () => {
    expect(recetteDe("intrus")).toBeUndefined();
    for (const n of ["PS", "MS", "GS"] as const) {
      for (let g = 1; g < 30; g++) expect(proposer(n, 1, false, 5, g).map((f) => f.recette)).not.toContain("intrus");
    }
  });

  it("le même élève, le même jour : le même tirage ; plus de fiches que de recettes : les mêmes, autrement tirées", () => {
    const g = graineDe("e1|2026-10-07");
    expect(proposer("CP", 2, false, 4, g)).toEqual(proposer("CP", 2, false, 4, g));
    const beaucoup = proposer("PS", 1, false, 5, g);
    expect(beaucoup).toHaveLength(5);
    expect(new Set(beaucoup.map((f) => f.graine)).size).toBe(5);
  });

  it("une autre fiche : du même domaine, jamais une déjà choisie ; sinon la même, autrement tirée", () => {
    const choisies = proposer("CE1", 3, false, 4, 11);
    const autre = uneAutre(choisies[1], choisies, "CE1", 3, false, 99);
    expect(autre.recette).not.toBe(choisies[1].recette);
    expect(choisies.map((f) => f.recette)).not.toContain(autre.recette);
    expect(recetteDe(autre.recette)?.domaine).toBe(recetteDe(choisies[1].recette)?.domaine);
    const ps = proposer("PS", 1, false, 3, 5);
    const meme = uneAutre(ps[0], ps, "PS", 1, false, 7);
    expect(meme.recette).toBe(ps[0].recette);
    expect(meme.graine).not.toBe(ps[0].graine);
    expect(uneDePlus(ps, "PS", 1, false, 3)).not.toBeNull();
  });
});

describe("la journée", () => {
  const eleves = [eleve("e1", "ELIOT", "CP"), eleve("e2", "Mathilda", "GS"), eleve("e3", "Jules Dupont", "CE1"), eleve("e4", "Yasmine", "CE2"), eleve("e5", "Parti", "CP", { present: false })];

  it("en IME, chaque élève est dans ses créneaux ; les autres sont dits sans créneau", () => {
    const creneaux = [creneau("c2", "14:10", ["e3", "e4"]), creneau("c1", "09:00", ["e1"]), creneau("c3", "10:00", ["e1", "e5"]), creneau("r", "16:00", ["e2"], { nature: "reunion" })];
    const { presents, sansCreneau } = elevesDuJour(creneaux, eleves);
    expect(presents.map((p) => [p.eleve.id, p.creneaux.map((c) => c.id)])).toEqual([["e1", ["c1", "c3"]], ["e3", ["c2"]], ["e4", ["c2"]]]);
    expect(sansCreneau.map((e) => e.id)).toEqual(["e2"]);
  });

  it("dans une classe ordinaire, toute la classe est à chaque créneau", () => {
    const { presents, sansCreneau } = elevesDuJour([creneau("c1", "09:00", []), creneau("c2", "10:30", [])], eleves);
    expect(presents).toHaveLength(4);
    expect(presents.every((p) => p.creneaux.length === 2)).toBe(true);
    expect(sansCreneau).toEqual([]);
  });

  it("les fiches passent d'un créneau au suivant", () => {
    expect(repartir(4, 2)).toEqual([0, 1, 0, 1]);
    expect(repartir(4, 3)).toEqual([0, 1, 2, 0]);
    expect(repartir(3, 1)).toEqual([0, 0, 0]);
  });

  it("le journal : la fiche à la suite du prévu, un titre que le journal imprimé retrouve", () => {
    const titre = titreDeLaFiche("Les pyramides de nombres", "Eliot", "2026-10-07");
    expect(titre).toBe("Les pyramides de nombres — Eliot, 7 oct.");
    const prevu = prevuAvecLesFiches("Lecture du conte.\n", [titre]);
    expect(prevu).toBe("Lecture du conte.\n\n⏰ En autonomie :\n📄 Les pyramides de nombres — Eliot, 7 oct.");
    expect(prevuAvecLesFiches("", [titre]).startsWith("⏰ En autonomie :\n📄 ")).toBe(true);
    expect(prevuAvecLesFiches("Rien", [])).toBe("Rien");
    const materiel = (id: string, t: string): MaterielItem => ({
      id, titre: t, descriptionMateriel: "", competenceId: "", competenceTitre: "", domaineTitre: "", sousDomaineTitre: "", cycle: "",
      imagesJson: "[]", pdfsJson: JSON.stringify([`${id}.pdf`]), dateCreation: "2026-10-07", seanceId: null, sequenceId: null, dossier: "", videosJson: "[]", coffreJson: "[]",
    });
    const vieux = materiel("m0", "Les pyramides de nombres");
    const lui = materiel("m1", titre);
    expect(pdfsCites(prevu, [vieux, lui]).map((m) => m.id)).toEqual(["m1"]);
  });

  it("deux fiches pareilles ne portent pas le même titre", () => {
    const pris = new Set<string>(["mots mêlés — eliot, 7 oct."]);
    expect(titreLibre("Mots mêlés — Eliot, 7 oct.", pris)).toBe("Mots mêlés — Eliot, 7 oct. (2)");
    expect(titreLibre("Mots mêlés — Eliot, 7 oct.", pris)).toBe("Mots mêlés — Eliot, 7 oct. (3)");
  });

  it("le prénom à la façon d'un prénom ; le PDF garde le titre de la feuille, sans l'élève ni le jour", () => {
    expect(prenomEcrit("ELIOT")).toBe("Eliot");
    expect(prenomEcrit("jean-luc")).toBe("Jean-Luc");
    expect(prenomEcrit("ALOïS")).toBe("Aloïs");
    expect(titreSansLEleve("Mots mêlés — Eliot, 7 oct.", "Eliot")).toBe("Mots mêlés");
    expect(titreSansLEleve("Lire l'heure — pile et demie — Jean-Luc, 7 oct. (2)", "Jean-Luc")).toBe("Lire l'heure — pile et demie");
    expect(titreSansLEleve("Les pyramides", "Inès")).toBe("Les pyramides");
  });
});

describe("chaque fiche se fabrique, à chaque niveau et chaque période", () => {
  it("rend une feuille, qui ne porte pas le prénom de l'élève", async () => {
    const aSonNom = new Set<string>();
    for (const r of RECETTES) for (const niveau of r.niveaux) for (let periode = 1; periode <= 5; periode++) {
      if (!recettesPour(niveau, periode, false).includes(r)) continue;
      for (const graine of [1, 2, 3]) {
        const c = { niveau, periode, prenom: "Eliot" };
        const f = await r.fabriquer(c, graine, outils);
        expect(f.html.length, `${r.id} ${niveau} P${periode}`).toBeGreaterThan(200);
        expect(f.html, `${r.id} ${niveau} P${periode}`).not.toMatch(/undefined|NaN|\[object Object\]/);
        expect(nomDeLaRecette(r, c).length).toBeGreaterThan(3);
        // Seul « J'écris mon prénom » le prend : c'est le modèle à copier.
        if (r.id !== "prenom" && f.html.includes("Eliot")) aSonNom.add(`${r.id} ${niveau}`);
      }
    }
    expect([...aSonNom]).toEqual([]);
  });

  it("donne toujours des mots à chercher aux mots mêlés — au CP, des mots qu'on sait lire, dès la première période", async () => {
    const r = recetteDe("mots-meles")!;
    for (const niveau of r.niveaux) for (let periode = 1; periode <= 5; periode++) for (const graine of [1, 2, 3, 4]) {
      const ou = `${niveau} P${periode} ${graine}`;
      const { html } = await r.fabriquer({ niveau, periode, prenom: "Eliot" }, graine, outils);
      const liste = /<div class="mm-liste">(.*?)<\/div>/.exec(html)?.[1] ?? "";
      expect((liste.match(/<span>/g) ?? []).length, ou).toBeGreaterThanOrEqual(6);
    }
    // En période 1, la première étape n'a que des voyelles : les mots viennent de toute la période, déchiffrables avec elle.
    const periode1 = new Set(ETAPES.filter((e) => e.periode === 1).flatMap((e) => motsDe(e, []).corpus));
    const mots = motsDuSon({ periode: 1 }, 5, 8);
    expect(mots).toHaveLength(8);
    expect(mots.every((m) => periode1.has(m) && /^\p{L}{3,7}$/u.test(m)), mots.join(", ")).toBe(true);
  });
});
