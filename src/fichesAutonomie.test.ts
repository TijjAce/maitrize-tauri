import { describe, expect, it, vi } from "vitest";
import type { Creneau, Eleve, MaterielItem, Seance, Sequence } from "./api";
import {
  NIVEAUX_FICHES, RECETTES, combienDeFiches, elevesDuJour, fabricationsDesFiches, graineDe, motsDuSon, niveauDesFiches, nomDeLaRecette, prenomEcrit, prevuAvecLesFiches,
  proposer, recetteDe, recettesPour, repartir, titreDeLaFiche, titreLibre, uneAutre, uneDePlus, type OutilsFiche,
  MINUTEURS_DE_BASE, lireMinuteursRetard, minuteurDeLaRecette, nomDeToutesLesFiches, rubriqueDeLaRecette,
  DOMAINE_DES_FICHES, domaineDeLaRecette, matiereDeLaRecette, recetteDuTitre,
  creneauDeLaFiche, detailDeLaSeance, estUneSeance, familleDeMatiere, iconeDeLaRecette, ligneDeLaSeance, prevuEnAutonomie, recettesDesSeances, recettesDesSupports,
} from "./fichesAutonomie";
import { MATIERES } from "./api";
import { MINUTEURS_DES_TABLETTES } from "./journalTelephone";
import { ETAPES, motsDe } from "./progressionCgp";
import { titreSansLEleve } from "./impressionAtelier";
import { liensDuCreneau, pdfsCites } from "./materielAImprimer";
import { sequencesCitees } from "./sequencesCitees";
import { suivisDesSequences } from "./suiviSequences";

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

describe("les ateliers en photo et les séances qui viennent (demande de l'enseignant, octobre 2026)", () => {
  // Une photo de Mes pictos, réglée pour tous les niveaux, sans matière.
  const PHOTO = -2_100_000_100;
  const atelier = recettesDesSupports(
    [{ photo: { id: PHOTO, mot: "Le geo shorter", fichier: "g.jpg", origine: "photo", date: "2026-10-15", niveau: "tous" }, jeu: "", regles: "" }],
    async () => "");

  const sequence = (id: string, titre: string, p: Partial<Sequence> = {}): Sequence => ({
    id, titre, matiere: "Mathématiques", cycle: "", objectifs: "", competences: "", competenceVisee: "", imageNom: null, couleur: "", dateCreation: "2026-09-01",
    periode: 1, annee: "2026-2027", ratingEngagement: 0, ratingFacilite: 0, ratingApprentissage: 0, ratingDateMaj: null, projetId: null, video: "", dossier: "",
    nbSeancesPrevu: 0, etat: "", dateMaj: "", ...p,
  });
  const seance = (id: string, sequenceId: string, numero: number, titre: string): Seance => ({
    id, titre, numero, objectifs: "", competences: "", deroulement: "", materiel: "", duree: 45, date: null, tableauDeroulement: "[]", imagesDeroulement: "[]",
    bilan: "", bilanDate: null, sequenceId, dateMaj: "",
  });
  const comparer = sequence("q1", "Comparer les nombres jusqu'à 30", { nbSeancesPrevu: 4 });
  const jardin = sequence("q2", "Le jardin de l'école");
  const fractions = sequence("q3", "Les fractions décimales");
  const solides = sequence("q4", "Les solides de la classe", { etat: "pause" });
  const heure = sequence("q5", "Lire l'heure pile");
  const familles = sequence("q6", "Les familles de mots");
  const sequences = [comparer, jardin, fractions, solides, heure, familles];
  const seances = [
    seance("s1", "q1", 1, "Découvrir"), seance("s2", "q1", 2, "Comparer deux nombres"), seance("s3", "q1", 3, "Ranger"), seance("s4", "q1", 4, "Encadrer"),
    seance("j1", "q2", 1, "Semer"), seance("j2", "q2", 2, "Arroser"),
    seance("f1", "q3", 1, "Partager"), seance("f2", "q3", 2, "Les dixièmes"),
    seance("o1", "q4", 1, "Toucher"), seance("o2", "q4", 2, "Trier"),
    seance("h1", "q5", 1, "Les heures pile"),
    seance("m1", "q6", 1, "Des mots de la même famille"), seance("m2", "q6", 2, "Le radical"), seance("m3", "q6", 3, "Écrire un mot de la famille"),
  ];
  // Une classe d'IME : chaque créneau dit qui y est — sauf celui du jardin, en classe entière.
  const creneaux = [
    creneau("c1", "09:00", ["e1"], { date: "2026-10-05", prevu: "📚 Comparer les nombres jusqu'à 30 · séance 1/4 : Découvrir" }),
    creneau("c2", "09:00", ["e1", "e2"], { date: "2026-10-06", seanceId: "s2" }),
    creneau("c3", "10:00", ["e2"], { date: "2026-10-06", prevu: "📚 Les fractions décimales · séance 1 : Partager" }),
    creneau("c4", "14:00", [], { date: "2026-10-06", seanceId: "j1" }),
    creneau("c5", "15:00", ["e1"], { date: "2026-10-06", seanceId: "o1" }),
    creneau("c6", "16:00", ["e1"], { date: "2026-10-06", seanceId: "h1" }),
    // La séance 1 des familles de mots n'a pas été écrite au journal : la 2 l'a été.
    creneau("c7", "11:00", ["e3"], { date: "2026-10-06", prevu: "📚 Les familles de mots · séance 2 : Le radical" }),
  ];
  const suivis = [...suivisDesSequences(sequences, seances, creneaux, "2026-10-07").values()];
  const parId = new Map(creneaux.map((c) => [c.id, c]));
  const seancesDe = (eleveId: string) => recettesDesSeances(eleveId, suivis, parId);

  it("chaque élève reçoit un atelier en photo dès qu'il y en a un à son niveau, à sa place dans la journée", () => {
    for (let g = 1; g < 30; g++) {
      expect(proposer("CE1", 1, false, 4, g, [], atelier).map((f) => recetteDe(f.recette, atelier)?.domaine)).toEqual(["francais", "maths", "atelier", "francais"]);
      expect(proposer("MS", 1, false, 3, g, [], atelier).map((f) => recetteDe(f.recette, atelier)?.domaine)).toEqual(["nombres", "atelier", "temps"]);
      // Une seule photo : elle ne revient pas, même quand toutes les fiches sont prises.
      expect(proposer("PS", 1, false, 5, g, [], atelier).filter((f) => f.recette === `support:${PHOTO}`)).toHaveLength(1);
    }
  });

  it("propose la séance qui vient de chaque séquence en classe qu'il suit — ni celles des autres, ni une séquence en pause ou terminée", () => {
    expect(seancesDe("e1").map((r) => r.seance?.seance.id)).toEqual(["s3", "j2"]);
    expect(seancesDe("e2").map((r) => r.seance?.seance.id)).toEqual(["s3", "j2", "f2"]);
    // Au créneau de toute la classe, le jardin ; aux familles de mots, la 3 après la 2 — pas la 1, jamais écrite au journal.
    expect(seancesDe("e3").map((r) => r.seance?.seance.id)).toEqual(["j2", "m3"]);
    const r = seancesDe("e1")[0];
    // Un nom court — celui de la séance —, son rang et sa séquence dessous.
    expect([r.id, r.domaine, iconeDeLaRecette(r), nomDeLaRecette(r, { niveau: "CP", periode: 1, prenom: "Eliot" }), detailDeLaSeance(r)])
      .toEqual(["seance:s3", "seance", "📚", "Ranger", "séance 3/4 · Comparer les nombres jusqu'à 30"]);
    expect(detailDeLaSeance(recetteDe("pyramides")!)).toBe("");
    expect(estUneSeance(r.id)).toBe(true);
    expect(estUneSeance("pyramides")).toBe(false);
  });

  it("passe la séance en premier, puis les fiches et l'atelier ; une autre séance à la place, s'il en suit une autre", () => {
    const siennes = [...seancesDe("e1"), ...atelier];
    for (let g = 1; g < 30; g++) {
      const fiches = proposer("CP", 1, false, 4, g, [], siennes);
      expect(fiches.map((f) => recetteDe(f.recette, siennes)?.domaine)).toEqual(["seance", "francais", "maths", "atelier"]);
      const autre = uneAutre(fiches[0], fiches, "CP", 1, false, g + 1, [], siennes);
      expect(recetteDe(autre.recette, siennes)?.domaine).toBe("seance");
      expect(autre.recette).not.toBe(fiches[0].recette);
    }
    // Sans séquence suivie, pas de place pour une séance : le français et les maths, comme avant.
    expect(proposer("CE2", 2, false, 4, 3, [], []).map((f) => recetteDe(f.recette)?.domaine)).toEqual(["francais", "maths", "francais", "maths"]);
  });

  it("va au créneau de sa matière quand l'élève en a un : une séance de maths au créneau de maths", () => {
    expect(["nombres, calcul et résolution de problèmes cycle 2", "Compréhension écrite cycle 2", "Mathématiques", "Français",
      "1. Mobiliser le langage dans toutes ses dimensions", "4. Acquérir les premiers outils mathématiques", "5. Se repérer dans le temps et l'espace",
      "questionner le monde cycle 2", "Espace et géométrie", "Les familles de mots", "Accueil"].map(familleDeMatiere))
      .toEqual(["maths", "francais", "maths", "francais", "francais", "maths", "monde", "monde", "maths", "francais", ""]);
    const journee = [creneau("j1", "09:00", ["e1"], { matiere: "Compréhension écrite cycle 2" }), creneau("j2", "10:00", ["e1"], { matiere: "nombres, calcul et résolution de problèmes cycle 2" })];
    const maths = seancesDe("e1")[0];
    expect(creneauDeLaFiche(maths, journee, 0)).toBe(1);
    // Sans créneau de sa matière, ou pour une fiche : la place de la répartition.
    expect(creneauDeLaFiche(maths, [journee[0]], 0)).toBe(0);
    expect(creneauDeLaFiche(recetteDe("pyramides")!, journee, 0)).toBe(0);
  });

  it("s'écrit au cahier journal sur la ligne du bouton 📚, à son nom : le journal reconnaît la séance, et son matériel s'imprime à la suite", () => {
    const ligne = ligneDeLaSeance(seancesDe("e1")[0], "Eliot");
    expect(ligne).toBe("📚 Comparer les nombres jusqu'à 30 · séance 3/4 : Ranger — Eliot");
    const prevu = prevuEnAutonomie("Accueil.", [ligne, "📄 Les pyramides de nombres — Eliot, 7 oct."]);
    expect(prevu).toBe("Accueil.\n\n⏰ En autonomie :\n📚 Comparer les nombres jusqu'à 30 · séance 3/4 : Ranger — Eliot\n📄 Les pyramides de nombres — Eliot, 7 oct.");
    expect(sequencesCitees(prevu, sequences, seances).map((c) => [c.sequence.id, c.seance?.id])).toEqual([["q1", "s3"]]);
    expect([...liensDuCreneau({ seanceId: null, prevu }, sequences, seances).seances]).toEqual(["s3"]);
    // Une fiche n'est pas une séance : rien à écrire pour elle sur cette ligne.
    expect(ligneDeLaSeance(recetteDe("pyramides")!, "Eliot")).toBe("");
  });
});
