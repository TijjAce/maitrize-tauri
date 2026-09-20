import { describe, it, expect } from "vitest";
import {
  nouveauJeu, nouvelOutil, nouvelleSeance, nouvelleSequence, type MaterielItem, type PieceJointe, type Texte,
} from "./api";
import {
  base64EnTexte, compter, contenuDUnElement, contenuDuDossier, couleursDeballees, couleursDuDossier, deballer,
  descriptionDuResume, destinationLibre, estPaquet, fichiersDe, nomDeFichierSur, nomDuPaquet, resumeDe, texteEnBase64,
  titreDuPaquet, titreSansAuteur, type Contenu, type Paquet,
} from "./bureauCommun";

const materiel = (p: Partial<MaterielItem>): MaterielItem => ({
  id: "m1", titre: "Fiche", descriptionMateriel: "", competenceId: "", competenceTitre: "", domaineTitre: "",
  sousDomaineTitre: "", cycle: "", imagesJson: "[]", pdfsJson: "[]", dateCreation: "2026-09-01", seanceId: null,
  sequenceId: null, dossier: "", videosJson: "[]", coffreJson: "[]", ...p,
});
const texte = (p: Partial<Texte>): Texte => ({ id: "t1", titre: "Texte", contenu: "", dossier: "", dateCreation: "2026-09-01", dateModification: "", ...p });

function bureau(): Contenu {
  const seq = { ...nouvelleSequence(), id: "q1", titre: "Les fractions", dossier: "cycle 1/Maths", imageNom: "couv.png",
    ratingEngagement: 5, projetId: "p9" };
  const seance = { ...nouvelleSeance("q1", 1), id: "s1", deroulement: "Partager\n[img:pizza.png]", bilan: "Louison a réussi.",
    date: "2026-09-12", imagesDeroulement: '["pizza.png"]' };
  const piece: PieceJointe = { id: "pj1", nom: "Fiche élève.pdf", type: "pdf", nomFichier: "fiche.pdf", dateAjout: "", seanceId: "s1", aImprimer: false };
  return {
    sequences: [seq, { ...nouvelleSequence(), id: "q2", titre: "Ailleurs", dossier: "Français" }],
    seances: [seance, { ...nouvelleSeance("q2", 1), id: "s2" }],
    pieces: [piece],
    materiels: [materiel({ id: "m1", dossier: "cycle 1", pdfsJson: '["exo.pdf"]', coffreJson: '["c1"]', sequenceId: "q2" })],
    textes: [texte({ id: "t1", dossier: "cycle 1", contenu: '<p><img src="maitrize-fichier:photo.jpg"></p>' })],
    jeux: [{ ...nouveauJeu(), id: "j1", titre: "Loto", dossier: "cycle 1", imageNom: "loto.png" }],
    ateliers: [], espaces: [],
    outils: [{ ...nouvelOutil("outil"), id: "o1", titre: "Bande numérique", dossier: "cycle 1",
      elevesJson: '["e1","e2"]', documentsJson: '[{"nom":"Bande.pdf","fichier":"bande.pdf"}]' }],
  };
}

describe("déposer un dossier sur le bureau commun", () => {
  it("prend tout le dossier, sous-dossiers compris, et rien d'ailleurs", () => {
    const c = contenuDuDossier("cycle 1", bureau());
    expect(c.sequences.map((s) => [s.titre, s.dossier])).toEqual([["Les fractions", "Maths"]]);
    expect(c.seances.map((s) => s.id)).toEqual(["s1"]);
    expect(c.pieces.map((p) => p.id)).toEqual(["pj1"]);
    expect(c.jeux[0].dossier).toBe("");
    expect(compter(c)).toBe(5);
  });

  it("ne laisse partir rien de ce qui touche aux élèves", () => {
    const c = contenuDuDossier("cycle 1", bureau());
    expect(c.seances[0].bilan).toBe("");
    expect(c.seances[0].date).toBeNull();
    expect(c.outils[0].elevesJson).toBe("[]");
    expect(c.materiels[0].coffreJson).toBe("[]");
    // Un lien vers une séquence restée chez soi ne part pas.
    expect(c.materiels[0].sequenceId).toBeNull();
    expect(c.sequences[0].ratingEngagement).toBe(0);
    expect(c.sequences[0].projetId).toBeNull();
  });

  it("emporte chaque fichier cité, jusque dans les déroulements et les photos collées", () => {
    expect(fichiersDe(contenuDuDossier("cycle 1", bureau())).sort()).toEqual(
      ["bande.pdf", "couv.png", "exo.pdf", "fiche.pdf", "loto.png", "photo.jpg", "pizza.png"]);
  });

  it("garde la couleur des dossiers, relative au dossier déposé", () => {
    expect(couleursDuDossier("cycle 1", { "cycle 1": "#a855f7", "cycle 1/Maths": "#ff0000", "Français": "#00ff00" }))
      .toEqual({ "": "#a855f7", Maths: "#ff0000" });
  });
});

describe("déposer un seul élément, glissé sur le bureau commun", () => {
  it("emporte la séquence avec ses séances et ses pièces, à la racine du paquet", () => {
    const c = contenuDUnElement("sequence", "q1", bureau());
    expect(c.sequences.map((s) => [s.titre, s.dossier])).toEqual([["Les fractions", ""]]);
    expect(c.seances.map((s) => s.id)).toEqual(["s1"]);
    expect(c.pieces.map((p) => p.id)).toEqual(["pj1"]);
    // Rien d'autre du bureau ne part avec lui.
    expect(compter(c)).toBe(1);
    expect(c.jeux).toEqual([]);
    // Et toujours rien des élèves.
    expect(c.seances[0].bilan).toBe("");
  });

  it("emporte un jeu seul, et ignore un élément qui n'existe pas", () => {
    expect(contenuDUnElement("jeu", "j1", bureau()).jeux.map((j) => j.titre)).toEqual(["Loto"]);
    expect(compter(contenuDUnElement("jeu", "inconnu", bureau()))).toBe(0);
    // Un texte d'un dossier réservé ne part pas.
    const tout = bureau();
    tout.textes[0].dossier = "@informations";
    expect(compter(contenuDUnElement("texte", "t1", tout))).toBe(0);
  });
});

describe("récupérer un dossier sur son bureau", () => {
  const paquet = (): Paquet => ({
    v: 1, dossier: "cycle 1", auteur: "Louise", depose: "2026-09-18T10:00:00Z",
    contenu: contenuDuDossier("cycle 1", bureau()),
    couleurs: { "": "#a855f7", Maths: "#ff0000" },
    fichiers: {},
  });

  it("en fait une copie à soi : nouveaux identifiants, liens qui suivent, fichiers renommés", () => {
    let n = 0;
    const c = deballer(paquet(), "cycle 1 (Louise)", (nom) => `neuf-${nom}`, () => `id${++n}`);
    const seq = c.sequences[0];
    expect(seq.id).not.toBe("q1");
    expect(seq.dossier).toBe("cycle 1 (Louise)/Maths");
    expect(seq.imageNom).toBe("neuf-couv.png");
    expect(c.seances[0].sequenceId).toBe(seq.id);
    expect(c.seances[0].deroulement).toContain("[img:neuf-pizza.png]");
    expect(c.seances[0].imagesDeroulement).toBe('["neuf-pizza.png"]');
    expect(c.pieces[0].seanceId).toBe(c.seances[0].id);
    expect(c.pieces[0].nomFichier).toBe("neuf-fiche.pdf");
    expect(c.textes[0].contenu).toContain("maitrize-fichier:neuf-photo.jpg");
    expect(c.outils[0].documentsJson).toContain("neuf-bande.pdf");
    expect(c.jeux[0].dossier).toBe("cycle 1 (Louise)");
    expect(couleursDeballees(paquet(), "cycle 1 (Louise)")).toEqual({ "cycle 1 (Louise)": "#a855f7", "cycle 1 (Louise)/Maths": "#ff0000" });
  });

  it("pose le dossier sous son nom, ou sous celui de son auteur s'il est pris", () => {
    expect(destinationLibre("cycle 1", "Louise", new Set())).toBe("cycle 1");
    expect(destinationLibre("cycle 1", "Louise", new Set(["cycle 1"]))).toBe("cycle 1 (Louise)");
    expect(destinationLibre("cycle 1", "Louise", new Set(["cycle 1", "cycle 1 (louise)"]))).toBe("cycle 1 (Louise) 2");
  });
});

describe("sur le dossier partagé", () => {
  it("nomme le fichier d'un dossier Maitrize avec son auteur", () => {
    expect(nomDuPaquet("cycle 1", "Clément")).toBe("cycle 1 (Clément).maitrize");
    expect(nomDuPaquet("Maths/Géométrie : figures?", "")).toBe("Maths Géométrie figures (Un collègue).maitrize");
    expect(estPaquet("cycle 1 (Clément).MAITRIZE")).toBe(true);
    expect(estPaquet("fiche.pdf")).toBe(false);
    expect(titreDuPaquet("cycle 1 (Clément).maitrize")).toBe("cycle 1 (Clément)");
  });

  it("ne laisse pas un nom devenir un chemin", () => {
    expect(nomDeFichierSur("../../etc/passwd")).toBe("etc passwd");
    expect(nomDeFichierSur("C:\\Windows")).toBe("C Windows");
    expect(nomDeFichierSur("   ")).toBe("Sans titre");
  });

  it("garde les accents d'un dossier empaqueté", () => {
    const texte = JSON.stringify({ titre: "Séquence « à côté » — œuvre" });
    expect(base64EnTexte(texteEnBase64(texte))).toBe(texte);
  });
});

describe("poser des fichiers du Finder", () => {
  it("donne un nom valable chez tous les collègues, extension gardée", async () => {
    const { nomPosable } = await import("./partageCommun");
    expect(nomPosable("Séance 1: les nombres.pdf")).toBe("Séance 1 les nombres.pdf");
    expect(nomPosable("Qui est-ce ?.docx")).toBe("Qui est-ce.docx");
    expect(nomPosable(`${"a".repeat(140)}.pdf`)).toBe(`${"a".repeat(100)}.pdf`);
    expect(nomPosable("Lisez-moi")).toBe("Lisez-moi");
    expect(nomPosable(".bashrc")).toBe("bashrc");
  });
});

describe("dire ce qu'un dossier Maitrize contient", () => {
  const resume = (c: Contenu) => resumeDe(c, "Clément Titet", "2026-09-21T10:00:00Z", 3);

  it("compte chaque sorte, séances et fichiers compris", () => {
    const r = resume(contenuDuDossier("cycle 1", bureau()));
    expect(r.compte).toEqual({ sequences: 1, materiels: 1, textes: 1, jeux: 1, outils: 1 });
    expect(r.seances).toBe(1);
    expect(r.fichiers).toBe(3);
    expect(r.auteur).toBe("Clément Titet");
  });

  it("annonce une séquence seule par ses séances", () => {
    const r = resume(contenuDUnElement("sequence", "q1", bureau()));
    expect(descriptionDuResume(r)).toEqual({ icone: "📚", texte: "Séquence · 1 séance" });
  });

  it("annonce un dossier mêlé par ses deux sortes principales", () => {
    const dit = descriptionDuResume(resume(contenuDuDossier("cycle 1", bureau())));
    expect(dit.icone).toBe("📚");
    expect(dit.texte).toBe("1 séquence · 1 matériel · …");
    // Un jeu seul se dit d'un mot.
    expect(descriptionDuResume(resume(contenuDUnElement("jeu", "j1", bureau())))).toEqual({ icone: "🎲", texte: "1 jeu" });
    // Sans résumé — un paquet d'avant —, la tuile reste muette mais correcte.
    expect(descriptionDuResume(null)).toEqual({ icone: "📦", texte: "Dossier Maitrize" });
  });

  it("retire le nom de l'auteur du titre, quand on sait qui c'est", () => {
    expect(titreSansAuteur("cycle 1 (Clément Titet).maitrize", "Clément Titet")).toBe("cycle 1");
    expect(titreSansAuteur("cycle 1 (Clément Titet).maitrize", "Louise")).toBe("cycle 1 (Clément Titet)");
    expect(titreSansAuteur("cycle 1 (Clément Titet).maitrize", "")).toBe("cycle 1 (Clément Titet)");
  });
});
