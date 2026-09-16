import { describe, it, expect } from "vitest";
import { nouveauJeu, nouvelleSeance, nouvelleSequence, type DocumentCoffre, type MaterielItem, type Texte } from "./api";
import { empreinte, nomSur, planDeCopie, type DonneesBureau, type FichierCopie } from "./copieBureau";

const materiel = (p: Partial<MaterielItem>): MaterielItem => ({
  id: "m", titre: "Matériel", descriptionMateriel: "", competenceId: "", competenceTitre: "", domaineTitre: "",
  sousDomaineTitre: "", cycle: "", imagesJson: "[]", pdfsJson: "[]", dateCreation: "2026-09-01T10:00:00Z",
  seanceId: null, sequenceId: null, dossier: "", videosJson: "[]", coffreJson: "[]", ...p,
});
const texte = (p: Partial<Texte>): Texte => ({
  id: "t", titre: "Texte", contenu: "", dossier: "", dateCreation: "2026-09-01T10:00:00Z", dateModification: "", ...p,
});
const donnees = (p: Partial<DonneesBureau>): DonneesBureau => ({
  sequences: [], seances: [], piecesJointes: [], materiels: [], textes: [], coffre: [], reglages: {}, jeux: [], ...p,
});
const chemins = (f: FichierCopie[]) => f.map((x) => x.chemin).sort();
const trouver = (f: FichierCopie[], chemin: string) => {
  const x = f.find((y) => y.chemin === chemin);
  if (!x) throw new Error(`absent : ${chemin} parmi ${chemins(f).join(", ")}`);
  return x;
};
const contenuDe = (x: FichierCopie) => (x.source.genre === "contenu" ? x.source.creer() : "");

describe("des noms que macOS et Windows acceptent", () => {
  it("remplace les caractères interdits et retire les points et espaces des bords", () => {
    expect(nomSur('Fiche: élève / "lecture" ?')).toBe("Fiche élève lecture");
    expect(nomSur("..caché")).toBe("caché");
    expect(nomSur("Fin avec point.")).toBe("Fin avec point");
    expect(nomSur("   ")).toBe("Sans titre");
    expect(nomSur("a\tb\nc")).toBe("a b c");
  });

  it("écarte les noms réservés de Windows et borne la longueur", () => {
    expect(nomSur("CON")).toBe("CON (fichier)");
    expect(nomSur("aux.txt")).toBe("aux.txt (fichier)");
    expect(nomSur("Console")).toBe("Console");
    expect(nomSur("x".repeat(200))).toHaveLength(80);
  });
});

describe("le plan de la copie", () => {
  it("recrée les dossiers du bureau, même vides, et laisse de côté les feuilles d'Organisation", () => {
    const plan = planDeCopie(donnees({
      textes: [texte({ id: "t1", titre: "Notes", dossier: "Français/Lecture" }), texte({ id: "t2", titre: "Infos", dossier: "@organisation" })],
      reglages: { "dossier:Maths/Géométrie": "aucune", "dossier:Arts": "#ff0000", "edt:truc": "x" },
    }), "mac");
    expect(plan.dossiers).toEqual(["Arts", "Français", "Français/Lecture", "Maths", "Maths/Géométrie"]);
    expect(chemins(plan.fichiers)).toEqual(["Français/Lecture/Notes.html"]);
  });

  it("recopie un document déposé sous son nom, sans doubler l'extension", () => {
    const plan = planDeCopie(donnees({
      materiels: [
        materiel({ id: "a", titre: "Suivi des élèves", pdfsJson: '["1a2b.xlsx"]', dossier: "Maths" }),
        materiel({ id: "b", titre: "Photo.JPG", imagesJson: '["3c4d.jpg"]' }),
      ],
    }), "mac");
    expect(chemins(plan.fichiers)).toEqual(["Maths/Suivi des élèves.xlsx", "Photo.jpg"]);
    expect(trouver(plan.fichiers, "Maths/Suivi des élèves.xlsx").source).toEqual({ genre: "fichier", nom: "1a2b.xlsx" });
  });

  it("fait d'un matériel riche un dossier : documents, description et raccourcis", () => {
    const coffre: DocumentCoffre[] = [{ id: "c1", nom: "Guide du maître.pdf", nomFichier: "9z.pdf", tailleOctets: 1, dateAjout: "" }];
    const m = materiel({
      titre: "Les fractions", pdfsJson: '["f1.pdf","f2.pdf"]', coffreJson: '["c1","inconnu"]',
      descriptionMateriel: "Deux fiches et un guide.", competenceTitre: "Comprendre les fractions",
      videosJson: JSON.stringify([{ url: "https://www.youtube.com/watch?v=abcdefghijk", youtubeId: "abcdefghijk" }, { url: "https://exemple.fr/jeu", titre: "Jeu en ligne" }]),
    });
    const mac = planDeCopie(donnees({ materiels: [m], coffre }), "mac");
    expect(chemins(mac.fichiers)).toEqual([
      "Les fractions/Description.txt", "Les fractions/Guide du maître.pdf", "Les fractions/Jeu en ligne.webloc",
      "Les fractions/Les fractions (2).pdf", "Les fractions/Les fractions.pdf", "Les fractions/Vidéo YouTube.webloc",
    ]);
    expect(mac.dossiers).toEqual(["Les fractions"]);
    const description = contenuDe(trouver(mac.fichiers, "Les fractions/Description.txt"));
    expect(description).toContain("Deux fiches et un guide.");
    expect(description).toContain("Compétence : Comprendre les fractions");
    expect(contenuDe(trouver(mac.fichiers, "Les fractions/Jeu en ligne.webloc"))).toContain("<string>https://exemple.fr/jeu</string>");
    const windows = planDeCopie(donnees({ materiels: [m], coffre }), "windows");
    expect(contenuDe(trouver(windows.fichiers, "Les fractions/Jeu en ligne.url"))).toBe("[InternetShortcut]\r\nURL=https://exemple.fr/jeu\r\n");
  });

  it("écrit les textes et les séquences en pages web, images comprises", () => {
    const seq = { ...nouvelleSequence(), id: "s1", titre: "Les fractions", dossier: "Maths" };
    const seance = { ...nouvelleSeance("s1", 1), id: "se1", titre: "Découverte",
      deroulement: "On partage une pizza.\n[img:pizza.png]\nPartie de Skyjo." };
    const plan = planDeCopie(donnees({
      sequences: [seq], seances: [seance],
      piecesJointes: [
        { id: "p1", nom: "Fiche élève.pdf", type: "pdf", nomFichier: "pj1.pdf", dateAjout: "", seanceId: "se1", aImprimer: false },
        { id: "p2", nom: "Photo", type: "image", nomFichier: "pj2.png", dateAjout: "", seanceId: "se1", aImprimer: false },
      ],
      textes: [texte({ titre: "Bilan <période>", contenu: "<p><b>Très</b> bien</p><script>x</script>" })],
      jeux: [{ ...nouveauJeu(), id: "j", titre: "Skyjo", regles: "Retourner deux cartes." }],
    }), "mac");
    expect(chemins(plan.fichiers)).toEqual([
      "Bilan période.html", "Maths/Les fractions (séquence) - documents/Fiche élève.pdf", "Maths/Les fractions (séquence).html",
    ]);
    const page = contenuDe(trouver(plan.fichiers, "Maths/Les fractions (séquence).html"));
    expect(page).toContain("<h1>Les fractions</h1>");
    expect(page).toContain('src="maitrize-fichier:pizza.png"');
    expect(page).toContain('src="maitrize-fichier:pj2.png"');
    expect(page).toContain("🎲 Règle — Skyjo");
    const bilan = contenuDe(trouver(plan.fichiers, "Bilan période.html"));
    expect(bilan).toContain("<title>Bilan &lt;période&gt;</title>");
    expect(bilan).toContain("<b>Très</b> bien");
    expect(bilan).not.toContain("<script>");
  });

  it("départage les homonymes : le plus ancien garde son nom, sans distinction de casse", () => {
    const plan = planDeCopie(donnees({
      textes: [
        texte({ id: "t2", titre: "notes", dateCreation: "2026-09-10T00:00:00Z" }),
        texte({ id: "t1", titre: "Notes", dateCreation: "2026-09-01T00:00:00Z" }),
      ],
      materiels: [materiel({ id: "m", titre: "Anciennes versions", pdfsJson: '["x.pdf"]' })],
      reglages: { "dossier:Anciennes versions": "aucune" },
    }), "mac");
    // Le dossier des anciennes versions garde son nom ; un fichier « .pdf » du même nom ne le gêne pas.
    expect(chemins(plan.fichiers)).toEqual(["Anciennes versions.pdf", "Notes.html", "notes (2).html"]);
    expect(plan.dossiers).toEqual(["Anciennes versions (2)"]);
  });

  it("garde les mêmes empreintes d'un passage à l'autre, et les change avec le contenu", () => {
    const d = donnees({ textes: [texte({ titre: "Notes", contenu: "v1" })] });
    const a = planDeCopie(d, "mac").fichiers[0].empreinte;
    expect(planDeCopie(d, "mac").fichiers[0].empreinte).toBe(a);
    expect(planDeCopie(donnees({ textes: [texte({ titre: "Notes", contenu: "v2" })] }), "mac").fichiers[0].empreinte).not.toBe(a);
    expect(empreinte("a")).not.toBe(empreinte("b"));
    expect(empreinte("")).toMatch(/^[0-9a-f]{28}$/);
  });

  it("donne la même empreinte à un élément rangé ailleurs : la copie le déplace sans le réécrire", () => {
    const seq = { ...nouvelleSequence(), id: "s1", titre: "Les fractions" };
    const ici = planDeCopie(donnees({ sequences: [{ ...seq, dossier: "Maths" }], materiels: [materiel({ pdfsJson: '["f.pdf"]', dossier: "A" })] }), "mac");
    const ailleurs = planDeCopie(donnees({ sequences: [{ ...seq, dossier: "Archives" }], materiels: [materiel({ pdfsJson: '["f.pdf"]', dossier: "B" })] }), "mac");
    const empreintes = (p: typeof ici) => p.fichiers.map((f) => f.empreinte).sort();
    expect(chemins(ici.fichiers)).not.toEqual(chemins(ailleurs.fichiers));
    expect(empreintes(ici)).toEqual(empreintes(ailleurs));
  });

  it("ne produit que des chemins que le backend accepte", () => {
    const plan = planDeCopie(donnees({
      textes: [texte({ titre: "../../évasion", dossier: "../..//C:/..." }), texte({ id: "t3", titre: ".maitrize-copie.json" })],
      materiels: [materiel({ titre: "À lire.txt", pdfsJson: '["a.txt"]' })],
    }), "windows");
    for (const chemin of [...chemins(plan.fichiers), ...plan.dossiers]) {
      const segments = chemin.split("/");
      expect(segments.every((s) => s && s !== "." && s !== ".." && !/[:\\]/.test(s)), chemin).toBe(true);
      expect(["anciennes versions", "à lire.txt", ".maitrize-copie.json"]).not.toContain(segments[0].toLowerCase());
    }
  });
});
