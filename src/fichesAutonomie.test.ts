import { describe, expect, it } from "vitest";
import type { Creneau, Eleve, MaterielItem } from "./api";
import {
  NIVEAUX_FICHES, RECETTES, combienDeFiches, elevesDuJour, graineDe, niveauDesFiches, nomDeLaRecette, prenomEcrit, prevuAvecLesFiches,
  proposer, recetteDe, recettesPour, repartir, titreDeLaFiche, titreLibre, uneAutre, uneDePlus, type OutilsFiche,
} from "./fichesAutonomie";
import { auNomDeLEleve } from "./impressionAtelier";
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

  it("en maternelle : le langage, le temps, les nombres — chaque âge les siens", () => {
    for (let g = 1; g < 20; g++) {
      expect(proposer("PS", 1, false, 3, g).map((f) => f.recette)).toEqual(["intrus", "suite", "intrus"]);
      expect(proposer("MS", 1, false, 3, g).map((f) => recetteDe(f.recette)?.domaine)).toEqual(["nombres", "langage", "temps"]);
      expect(proposer("GS", 1, false, 3, g).map((f) => recetteDe(f.recette)?.domaine)).toEqual(["nombres", "lettres", "langage"]);
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
  const eleves = [eleve("e1", "ETHAN", "CP"), eleve("e2", "Marianna", "GS"), eleve("e3", "Jean Dupont", "CE1"), eleve("e4", "Yolanda", "CE2"), eleve("e5", "Parti", "CP", { present: false })];

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
    const titre = titreDeLaFiche("Les pyramides de nombres", "Ethan", "2026-10-07");
    expect(titre).toBe("Les pyramides de nombres — Ethan, 7 oct.");
    const prevu = prevuAvecLesFiches("Lecture du conte.\n", [titre]);
    expect(prevu).toBe("Lecture du conte.\n\n⏰ En autonomie :\n📄 Les pyramides de nombres — Ethan, 7 oct.");
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
    const pris = new Set<string>(["mots mêlés — ethan, 7 oct."]);
    expect(titreLibre("Mots mêlés — Ethan, 7 oct.", pris)).toBe("Mots mêlés — Ethan, 7 oct. (2)");
    expect(titreLibre("Mots mêlés — Ethan, 7 oct.", pris)).toBe("Mots mêlés — Ethan, 7 oct. (3)");
  });

  it("le prénom à la façon d'un prénom, et la ligne « Prénom … Date … » remplie", () => {
    expect(prenomEcrit("ETHAN")).toBe("Ethan");
    expect(prenomEcrit("jean-luc")).toBe("Jean-Luc");
    expect(prenomEcrit("AYYûB")).toBe("Ayyûb");
    const html = '<div class="sous">Prénom : ........................ Date : ..........</div><p>Date : le jour</p><div>Prénom : ………………</div>';
    expect(auNomDeLEleve(html, "Inès", "mercredi 7 octobre"))
      .toBe('<div class="sous">Prénom : Inès Date : mercredi 7 octobre</div><p>Date : le jour</p><div>Prénom : Inès</div>');
  });
});

describe("chaque fiche se fabrique, à chaque niveau et chaque période", () => {
  it("rend une feuille, avec la ligne du prénom à remplir", async () => {
    const sansPrenom = new Set<string>();
    for (const r of RECETTES) for (const niveau of r.niveaux) for (let periode = 1; periode <= 5; periode++) {
      if (!recettesPour(niveau, periode, false).includes(r)) continue;
      for (const graine of [1, 2, 3]) {
        const c = { niveau, periode, prenom: "Ethan" };
        const f = await r.fabriquer(c, graine, outils);
        expect(f.html.length, `${r.id} ${niveau} P${periode}`).toBeGreaterThan(200);
        expect(f.html, `${r.id} ${niveau} P${periode}`).not.toMatch(/undefined|NaN|\[object Object\]/);
        expect(nomDeLaRecette(r, c).length).toBeGreaterThan(3);
        if (!auNomDeLEleve(f.html, "Ethan", "mercredi 7 octobre").includes("Prénom : Ethan")) sansPrenom.add(`${r.id} ${niveau}`);
      }
    }
    expect([...sansPrenom]).toEqual([]);
  });
});
