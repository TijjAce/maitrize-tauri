import { describe, expect, it, vi } from "vitest";
import type { Creneau, Eleve, MaterielItem } from "./api";
import {
  NIVEAUX_FICHES, RECETTES, combienDeFiches, elevesDuJour, fabricationsDesFiches, graineDe, motsDuSon, niveauDesFiches, nomDeLaRecette, prenomEcrit, prevuAvecLesFiches,
  proposer, recetteDe, recettesPour, repartir, titreDeLaFiche, titreLibre, uneAutre, uneDePlus, type OutilsFiche,
  MINUTEURS_DE_BASE, lireMinuteursRetard, minuteurDeLaRecette, nomDeToutesLesFiches, rubriqueDeLaRecette,
  DOMAINE_DES_FICHES, domaineDeLaRecette, matiereDeLaRecette, recetteDuTitre,
} from "./fichesAutonomie";
import { MATIERES } from "./api";
import { MINUTEURS_DES_TABLETTES } from "./journalTelephone";
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

describe("ce que l'enseignant a demandé pour « En retard » (octobre 2026)", () => {
  it("n'offre jamais à un élève les fabrications que sa fiche écarte, et les nomme comme Fabriquer", () => {
    const coloriages = RECETTES.filter((r) => r.atelier === "coloriage").map((r) => r.id);
    expect(coloriages.length).toBeGreaterThan(1);
    for (const niveau of ["MS", "GS", "CE1"] as const) {
      expect(recettesPour(niveau, 3, false, ["coloriage"]).some((r) => r.atelier === "coloriage"), niveau).toBe(false);
      for (let g = 1; g <= 30; g++) {
        const fiches = proposer(niveau, 3, false, 8, g, ["coloriage"]);
        expect(fiches.some((f) => coloriages.includes(f.recette)), `${niveau} ${g}`).toBe(false);
        const autre = uneAutre(fiches[0], fiches, niveau, 3, false, g, ["coloriage"]);
        expect(coloriages.includes(autre.recette)).toBe(false);
        const plus = uneDePlus(fiches, niveau, 3, false, g, ["coloriage"]);
        expect(plus && coloriages.includes(plus.recette)).toBeFalsy();
      }
    }
    const ms = fabricationsDesFiches("MS");
    expect(ms.find((f) => f.atelier === "coloriage")?.nom).toBe("Coloriage magique");
    expect(ms.map((f) => f.nom)).toEqual([...ms.map((f) => f.nom)].sort((a, b) => a.localeCompare(b, "fr")));
    // Sans niveau, toutes, une fois chacune.
    const toutes = fabricationsDesFiches(null);
    expect(new Set(toutes.map((f) => f.atelier)).size).toBe(toutes.length);
    expect(toutes.length).toBeGreaterThan(ms.length);
  });

  it("fait colorier les aiguilles, la rouge des heures et la bleue des minutes, évidées pour qu'on les colorie", async () => {
    const r = recetteDe("heure")!;
    const { html } = await r.fabriquer({ niveau: "CE1", periode: 1, prenom: "Eliot" }, 4, outils);
    expect(html).toContain("Colorie en rouge l'aiguille des heures. Colorie en bleu l'aiguille des minutes.");
    expect(html).toContain("he-creuse");
  });

  it("fait lire l'heure, ou dessiner les aiguilles : l'un ou l'autre, jamais les deux sur la même fiche", async () => {
    const r = recetteDe("heure")!;
    const sortes = new Set<string>();
    for (const niveau of r.niveaux) for (let g = 1; g <= 12; g++) {
      const { html } = await r.fabriquer({ niveau, periode: 3, prenom: "Eliot" }, g, outils);
      const lire = html.includes("Écris l'heure qu'il est"), dessiner = html.includes("Dessine les aiguilles");
      expect(lire !== dessiner, `${niveau} ${g}`).toBe(true);
      expect(html, `${niveau} ${g}`).not.toContain("ou dessine les aiguilles");
      sortes.add(lire ? "lire" : "dessiner");
    }
    expect([...sortes].sort()).toEqual(["dessiner", "lire"]);
  });

  it("enlève la règle des pyramides : l'élève connaît le jeu, la consigne dit ce qu'il fait", async () => {
    const { html } = await recetteDe("pyramides")!.fabriquer({ niveau: "CE1", periode: 2, prenom: "Eliot" }, 3, outils);
    expect(html).not.toContain("somme des nombres des deux briques");
    expect(html).toContain("Complète la pyramide en montant.");
  });

  it("met chaque groupement de cubes dans sa couleur, même si l'atelier a été laissé sur une seule couleur", async () => {
    vi.stubGlobal("localStorage", { getItem: (k: string) => (k === "fabriquer:cubes" ? JSON.stringify({ memeCouleur: true }) : null) });
    try {
      for (const id of ["cubes-ecrire", "cubes-dessiner"]) {
        const f = await recetteDe(id)!.fabriquer({ niveau: "CE1", periode: 2, prenom: "Eliot" }, 3, outils);
        const cubes = f.refaire?.cubes as { memeCouleur?: boolean } | undefined;
        if (cubes) expect(cubes.memeCouleur, id).toBe(false);
        // Le jaune des unités et le vert des dizaines, pas une seule teinte.
        expect(f.html, id).toContain("#62d93a");
      }
    } finally { vi.unstubAllGlobals(); }
  });
});



describe("le temps de chaque fiche", () => {
  it("chaque sorte de fiche a son temps de base, parmi ceux qu'on propose", () => {
    for (const r of RECETTES) expect(MINUTEURS_DES_TABLETTES, r.id).toContain(MINUTEURS_DE_BASE[r.id]);
    expect(Object.keys(MINUTEURS_DE_BASE).sort()).toEqual(RECETTES.map((r) => r.id).sort());
  });

  it("prend le temps réglé, « sans minuteur » compris, sinon celui de base", () => {
    const regles = lireMinuteursRetard(JSON.stringify({ pyramides: 20, heure: 0, inconnue: 5, listes: 12.5, "mots-meles": 500, comparer: "10" }));
    expect(regles).toEqual({ pyramides: 20, heure: 0 });
    expect([minuteurDeLaRecette("pyramides", regles), minuteurDeLaRecette("heure", regles), minuteurDeLaRecette("listes", regles)])
      .toEqual([20, 0, MINUTEURS_DE_BASE.listes]);
    expect([lireMinuteursRetard(""), lireMinuteursRetard("pas du json"), lireMinuteursRetard("[1]")]).toEqual([{}, {}, {}]);
  });

  it("se règle par sorte de fiche, sous un nom qui vaut pour tous les niveaux, rangé par rubrique", () => {
    expect(nomDeToutesLesFiches(recetteDe("posees")!)).toBe("Des additions posées / Des soustractions posées");
    expect(nomDeToutesLesFiches(recetteDe("heure")!)).toBe("Lire l'heure");
    expect(["suite", "pyramides", "mots-meles"].map((id) => rubriqueDeLaRecette(recetteDe(id)!))).toEqual(["Maternelle", "Mathématiques", "Français"]);
  });
});

describe("le déroulement d'un créneau", () => {
  it("range chaque sorte de fiche dans une matière de la liste et un domaine des référentiels", () => {
    for (const r of RECETTES) {
      expect(MATIERES, r.id).toContain(DOMAINE_DES_FICHES[r.id]?.matiere);
      expect(DOMAINE_DES_FICHES[r.id]?.domaine, r.id).toBeTruthy();
    }
    expect([matiereDeLaRecette(recetteDe("posees")!), matiereDeLaRecette(recetteDe("listes")!), matiereDeLaRecette(recetteDe("suite")!)])
      .toEqual(["Mathématiques", "Français", "Explorer le monde"]);
    expect([domaineDeLaRecette(recetteDe("heure")!), domaineDeLaRecette(recetteDe("mots-imposes")!)]).toEqual(["Grandeurs et mesures", "Écriture"]);
  });

  it("retrouve la sorte d'une fiche déjà faite par son titre, quel que soit le niveau", () => {
    expect(recetteDuTitre("Des soustractions posées")?.id).toBe("posees");
    expect(recetteDuTitre("Les classes de mots")?.id).toBe("grammaire");
    expect(recetteDuTitre("Mots mêlés (2)")?.id).toBe("mots-meles");
    expect(recetteDuTitre("Une fiche d'ailleurs")).toBeUndefined();
  });
});
