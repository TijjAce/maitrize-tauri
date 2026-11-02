import { describe, it, expect } from "vitest";
import type { Creneau, Jeu, MaterielItem, Seance, Sequence } from "./api";
import {
  FEUILLE_BANDES_MM, LARGEUR_BANDE_MM, SCRIPTS_DES_BANDES, STYLE_BANDES, STYLE_BANDES_DU_JOURNAL,
  bandesDuJour, corpsDesBandes, creneauxEnBandes, estUnePause, heuresDeLaBande, largeurDesBandes, pasDeLaBande,
} from "./journeeEnBandes";
import { pasDeLEleve } from "./journalTelephone";
import { elevesDesParties } from "./prevuParEleve";
import { documentImprimable } from "./print";

const creneau = (id: string, heureDebut: string, heureFin: string, matiere: string, autre: Partial<Creneau> = {}): Creneau => ({
  id, date: "2026-11-02", heureDebut, heureFin, matiere, couleur: "blue", seanceId: null, atelierId: null, espaceId: null,
  elevesJson: "[]", nature: "classe", prevu: "", bilan: "", ...autre,
});

/** Une fiche faite par « En retard » pour un élève (prénoms inventés). */
const fiche = (id: string, titre: string, prenom: string): MaterielItem => ({
  id, titre: `${titre} — ${prenom}, 2 nov.`, descriptionMateriel: "", competenceId: "", competenceTitre: "", domaineTitre: "", sousDomaineTitre: "",
  cycle: "", imagesJson: "[]", pdfsJson: '["fiche.pdf"]', dateCreation: "2026-11-01", seanceId: null, sequenceId: null, dossier: "",
  videosJson: "[]", coffreJson: "[]", fabricationJson: JSON.stringify({ atelier: "x", eleve: { prenom, date: "2026-11-02" } }),
} as MaterielItem);

const seance = { id: "s1", titre: "Comparer des collections", sequenceId: "q1", competences: "[]" } as unknown as Seance;

describe("la journée sur une page, en bandes (demande de l'enseignant, 31 octobre 2026)", () => {
  it("donne une bande à chaque créneau qu'on imprime, dans l'ordre des heures ; une pause vide n'en a pas", () => {
    const jour = [
      creneau("c3", "10:30", "10:45", "Récréation"),
      creneau("c1", "08:30", "09:00", "Accueil", { prevu: "La date, l'appel" }),
      creneau("c2", "09:00", "10:30", "Mathématiques"),
      creneau("c4", "11:30", "13:30", "Cantine", { bilan: "Calme" }),
      creneau("c5", "13:30", "14:00", "Sieste", { seanceId: "s1" }),
    ];
    // Un créneau d'enseignement sans rien d'écrit garde sa bande : sa matière y est dite.
    expect(creneauxEnBandes(jour).map((c) => c.id)).toEqual(["c1", "c2", "c4", "c5"]);
    expect(estUnePause("Récréation")).toBe(true);
    expect(estUnePause("Français")).toBe(false);
    expect(heuresDeLaBande(jour[1])).toBe("8h30 – 9h00");
  });

  it("dessine le déroulement des tablettes : le rituel d'abord, la séance, puis les fiches de chaque élève, à son prénom", () => {
    const fiches = [fiche("f1", "Les pyramides de nombres", "Prénom-Un"), fiche("f2", "Les listes de mots qui se ressemblent", "Prénom-Deux")];
    const c = creneau("c1", "09:00", "10:00", "Mathématiques", {
      seanceId: "s1", prevu: "🔁 La date\n📄 Les pyramides de nombres — Prénom-Un, 2 nov.\n📄 Les listes de mots qui se ressemblent — Prénom-Deux, 2 nov.",
    });
    const pas = pasDeLaBande(c, seance, fiches, "Nombres");
    expect(pas.map((p) => [p.texte, p.rituel ?? false, p.fiche ?? false, p.eleve ?? ""])).toEqual([
      ["La date", true, false, ""],
      ["Comparer des collections", false, false, ""],
      ["Les pyramides de nombres", false, true, "Prénom-Un"],
      ["Les listes de mots qui se ressemblent", false, true, "Prénom-Deux"],
    ]);
    expect(pas[1].domaine).toBe("Nombres");
    // Sans séance, les fiches suivent le rituel, comme sur la tablette de leur élève.
    const sansSeance = pasDeLaBande(c, undefined, fiches);
    expect(sansSeance.map((p) => p.texte)).toEqual(["La date", "Les pyramides de nombres", "Les listes de mots qui se ressemblent"]);
  });

  it("donne une carte à un créneau qui n'a ni séance ni fiche : ses rituels, sinon sa matière", () => {
    expect(pasDeLaBande(creneau("c1", "08:30", "09:00", "Accueil", { prevu: "🔁 L'appel\n🔁 La météo" }), undefined, []))
      .toEqual([{ texte: "L'appel · La météo", matiere: "Rituel", rituel: true }]);
    expect(pasDeLaBande(creneau("c2", "11:00", "11:45", "EPS", { prevu: "Parcours" }), undefined, []))
      .toEqual([{ texte: "EPS", matiere: "", domaine: "EPS" }]);
  });

  it("montre la séance que le prévu cite par sa ligne 📚, puis les jeux de la ludothèque qu'il nomme, une carte chacun, comme les tablettes", () => {
    // Le créneau de l'enseignant (31 octobre 2026) : une séance citée sans être posée, puis un jeu ; la bande ne montrait que sa matière.
    // « Le rituel, puis une séance de maths, et encore une séance de maths » : le jeu prend la matière de la séance.
    const sequence = { id: "q1", titre: "Comparer des quantités", matiere: "Mathématiques", competences: "[]" } as unknown as Sequence;
    const oie = { id: "j1", titre: "jeu de l’oie" } as Jeu;
    const c = creneau("c1", "14:10", "15:00", "Mathématiques", { prevu: "📚 Comparer des quantités · séance 1 : Comparer des collections\njeu de l’oie" });
    expect(pasDeLaBande(c, undefined, [], "", [sequence], [{ ...seance, numero: 1 } as Seance], [oie]).map((p) => [p.matiere, p.texte]))
      .toEqual([["", "Rituel"], ["Mathématiques", "Comparer des collections"], ["Mathématiques", "Jeu de l’oie"]]);
    // Le jeu qui a sa photo dans Réglages › Personnalisation la montre au lieu du picto de son domaine (2026-11-01) ;
    // une photo sans jeu, ou celle d'un autre jeu, n'y change rien.
    const photos = [{ id: -7, origine: "photo" as const, jeuId: "j1" }, { id: -8, origine: "photo" as const, jeuId: "j2" }, { id: -9, origine: "photo" as const }];
    const avecPhoto = pasDeLaBande(c, undefined, [], "", [sequence], [{ ...seance, numero: 1 } as Seance], [oie], photos);
    expect(avecPhoto.map((p) => p.picto)).toEqual([undefined, undefined, -7]);
    expect(pasDeLaBande(c, undefined, [], "", [sequence], [{ ...seance, numero: 1 } as Seance], [oie], photos.slice(1)).every((p) => p.picto === undefined)).toBe(true);
  });

  it("partage la bande d'un groupe : une par élève, son prénom en tête, ce qui est à tous et ses parties dans l'ordre (2026-11-02)", async () => {
    // Un créneau de groupe comme celui de l'enseignant, prénoms inventés : la séance de l'une, le jeu de l'autre, à leur prénom.
    const sequence = { id: "q1", titre: "Comparer des quantités", matiere: "Mathématiques", competences: "[]" } as unknown as Sequence;
    const oie = { id: "j1", titre: "jeu de l’oie" } as Jeu;
    const lesSeances = [{ ...seance, numero: 1 } as Seance];
    const groupe = creneau("c2", "14:10", "15:00", "Lina-Tom", {
      elevesJson: '["e1","e2"]',
      prevu: "matériel base 10\nLina : 📚 Comparer des quantités · séance 1 : Comparer des collections\n\nTom : bande numérique jusqu'à 30 à plastifier\nObjectif : comparer\n\njeu de l’oie",
    });
    const deLina = pasDeLEleve(groupe, "Lina", ["Lina", "Tom"], undefined, [], "", [sequence], lesSeances, [oie]);
    const deTom = pasDeLEleve(groupe, "Tom", ["Lina", "Tom"], undefined, [], "", [sequence], lesSeances, [oie]);
    expect(deLina.map((p) => p.texte)).toEqual(["Rituel", "Comparer des collections"]);
    expect(deTom.map((p) => p.texte)).toEqual(["Rituel", "Jeu de l’oie"]);
    // « Deux élèves peuvent faire la même chose, mais pas au même moment » : chacun ses séances et ses jeux, dans l'ordre où ils sont écrits.
    const tour = { ...groupe, prevu: "Lina : 📚 Comparer des quantités · séance 1 : Comparer des collections\njeu de l’oie\nTom : jeu de l’oie\n📚 Comparer des quantités · séance 1 : Comparer des collections" };
    expect(pasDeLEleve(tour, "Lina", ["Lina", "Tom"], undefined, [], "", [sequence], lesSeances, [oie]).map((p) => p.texte))
      .toEqual(["Rituel", "Comparer des collections", "Jeu de l’oie"]);
    expect(pasDeLEleve(tour, "Tom", ["Lina", "Tom"], undefined, [], "", [sequence], lesSeances, [oie]).map((p) => p.texte))
      .toEqual(["Rituel", "Jeu de l’oie", "Comparer des collections"]);
    const eleves = [{ id: "e1", prenom: "Lina" }, { id: "e2", prenom: "Tom" }, { id: "e3", prenom: "Zoé" }];
    // Qui a sa bande : le groupe dont le prévu a des parts ; un groupe sans parts, ou la classe, garde une bande pour tous.
    expect(elevesDesParties(groupe, eleves)).toEqual(["Lina", "Tom"]);
    expect(elevesDesParties({ ...groupe, prevu: "Lecture à deux" }, eleves)).toEqual([]);
    expect(elevesDesParties(creneau("c1", "08:30", "09:00", "Accueil", { prevu: "Lina : la date" }), eleves)).toEqual([]);
    const jour = [creneau("c1", "08:30", "09:00", "Accueil", { prevu: "🔁 L'appel" }), groupe];
    const { bandes } = await bandesDuJour(jour, lesSeances, [sequence], [], [oie], [], eleves);
    expect(bandes.map((b) => [b.heures, b.matiere])).toEqual([["8h30 – 9h00", "Accueil"], ["14h10 – 15h00", "Lina"], ["14h10 – 15h00", "Tom"]]);
    expect(bandes[1].cadres).toContain("Comparer des collections");
    expect(bandes[1].cadres).not.toContain("oie");
    expect(bandes[2].cadres).toContain("Jeu de l’oie");
    // Sans les élèves, la bande du groupe reste entière.
    expect((await bandesDuJour(jour, lesSeances, [sequence], [], [oie])).bandes.map((b) => b.matiere)).toEqual(["Accueil", "Lina-Tom"]);
  });

  it("met les bandes côte à côte, regroupées, d'une largeur fixe, sur une page à la suite du cahier journal", () => {
    // Les bandes ne touchent pas à la page, qui est celle du cahier journal : leur feuille en commence une.
    expect(STYLE_BANDES).not.toMatch(/@page|\bbody\b/);
    expect(STYLE_BANDES).toMatch(/\.feuille-bandes \{[^}]*break-before: page;/);
    expect(STYLE_BANDES_DU_JOURNAL).not.toContain(".page > .titre");
    // La feuille tient dans les 188 × 275 mm que le journal laisse entre ses marges.
    expect(FEUILLE_BANDES_MM.largeur).toBeLessThanOrEqual(188);
    expect(FEUILLE_BANDES_MM.hauteur).toBeLessThanOrEqual(275);
    // Toujours la même largeur, celle de la colonne des tablettes, tant qu'elles tiennent ; sinon elles se partagent la page.
    expect(largeurDesBandes(3)).toBe(LARGEUR_BANDE_MM);
    expect(largeurDesBandes(4)).toBe(LARGEUR_BANDE_MM);
    expect(largeurDesBandes(5)).toBeCloseTo((186 - 4 * 3) / 5, 1);
    // Les cartes de la colonne des tablettes : le picto au-dessus, toutes de la même taille.
    expect(STYLE_BANDES).toMatch(/\.bande \.dr-etape \{ flex-direction: column;[^}]*height: 32mm;/);
    const corps = corpsDesBandes("Lundi 2 novembre 2026", [
      { heures: "8h30 – 9h00", matiere: "Accueil", cadres: '<div class="at-etape dr-etape">Rituel</div>' },
      { heures: "9h00 – 10h30", matiere: "Mathématiques", cadres: '<div class="at-etape dr-etape">Compter</div>' },
    ]);
    expect(corps.match(/class="bande" style="width:44mm"/g)).toHaveLength(2);
    expect(corps).toContain('<span class="bande-heure">9h00 – 10h30</span><span class="bande-matiere">Mathématiques</span>');
    expect(corps).toContain('<div class="dr"><div class="at-etape dr-etape">Compter</div></div>');
    expect(corps).toMatch(/<div class="bandes-alerte" hidden>/);
    expect(corps).toContain('<div class="feuille-bandes" lang="fr">');
    expect(corpsDesBandes("Lundi", [])).toContain("Aucun créneau à imprimer ce jour-là.");
    expect(corpsDesBandes("<b>x</b>", [{ heures: "<i>", matiere: "<u>", cadres: "" }])).not.toMatch(/<b>x<\/b>|<i>|<u>/);
  });

  it("n'exécute que son script, reconnu à son empreinte, tel quel dans la page imprimable", () => {
    const page = documentImprimable("La journée", corpsDesBandes("Lundi", [{ heures: "8h30 – 9h00", matiere: "", cadres: "" }]), STYLE_BANDES);
    const scripts = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    expect(scripts).toEqual(SCRIPTS_DES_BANDES);
  });
});
