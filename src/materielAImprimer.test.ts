import { describe, it, expect } from "vitest";
import type { MaterielItem, Seance, Sequence } from "./api";
import {
  annexesDesCreneaux, annexesHtml, cleEchelle, echellesDesReglages, liensDuCreneau, ligneDuPdf, lireEchelle, materielDuCreneau, moletteDuJournalHtml,
  echellePourUneFeuille, limiteMm, octetsDeBase64, pdfsCites, STYLE_ANNEXES, titresDuMateriel,
} from "./materielAImprimer";

const materiel = (p: Partial<MaterielItem>): MaterielItem => ({
  id: "m", titre: "Fiche", descriptionMateriel: "", competenceId: "", competenceTitre: "", domaineTitre: "",
  sousDomaineTitre: "", cycle: "", imagesJson: "[]", pdfsJson: '["a.pdf"]', dateCreation: "", seanceId: null,
  sequenceId: null, dossier: "", videosJson: "[]", coffreJson: "[]", ...p,
});
const creneau = (date: string, heureDebut: string, seanceId: string | null, matiere = "Lecture", prevu = "") =>
  ({ date, heureDebut, seanceId, matiere, prevu });
const sequences = [{ id: "q1", titre: "Organiser les mots en réseau" }, { id: "q2", titre: "Les fractions au quotidien" }] as Sequence[];
const seances = [
  { id: "s1", titre: "Les syllabes", sequenceId: "q1", ordre: 1 }, { id: "s2", titre: "", sequenceId: "q1", ordre: 2 },
  { id: "s3", titre: "Découverte du corpus", sequenceId: "q1", ordre: 3 },
] as unknown as Seance[];
const materiels = [
  materiel({ id: "m1", titre: "Fiche syllabes", seanceId: "s1", pdfsJson: '["a.pdf","b.pdf"]' }),
  materiel({ id: "m2", titre: "  ", seanceId: "s2", pdfsJson: '["c.pdf"]' }),
  materiel({ id: "m3", titre: "Sans PDF", seanceId: "s1", pdfsJson: "[]", imagesJson: '["x.png"]' }),
  materiel({ id: "m4", titre: "Sur le bureau", seanceId: null }),
  materiel({ id: "m5", titre: "Corpus à découper", seanceId: "s3", pdfsJson: '["e.pdf"]' }),
  materiel({ id: "m6", titre: "Affiche du réseau", sequenceId: "q1", pdfsJson: '["f.pdf"]' }),
  materiel({ id: "m7", titre: "Bande des fractions", sequenceId: "q2", pdfsJson: '["g.pdf"]' }),
];

describe("le matériel des séances du journal", () => {
  it("s'annonce par ses titres, sans les matériels sans PDF", () => {
    expect(titresDuMateriel(creneau("2026-09-28", "09:00", "s1"), sequences, seances, materiels)).toEqual(["Fiche syllabes"]);
    expect(titresDuMateriel(creneau("2026-09-28", "09:00", "s2"), sequences, seances, materiels)).toEqual(["Matériel"]);
    expect(titresDuMateriel(creneau("2026-09-28", "09:00", null), sequences, seances, materiels)).toEqual([]);
  });

  it("compte aussi la séance ou la séquence citée dans le prévu", () => {
    // La ligne du bouton 📚 : la séquence et sa séance.
    const cite = creneau("2026-09-28", "09:00", null, "Lecture", "📚 Organiser les mots en réseau · séance 3 : Découverte du corpus");
    expect(liensDuCreneau(cite, sequences, seances)).toEqual({ seances: new Set(["s3"]), sequences: new Set() });
    expect(titresDuMateriel(cite, sequences, seances, materiels)).toEqual(["Corpus à découper"]);
    // Une séquence citée sans séance, c'est toute la séquence : son matériel à elle, puis celui de ses séances, dans l'ordre.
    const seule = creneau("2026-09-28", "10:00", null, "Lecture", "On continue la séquence Organiser les mots en réseau.");
    expect(titresDuMateriel(seule, sequences, seances, materiels)).toEqual(["Affiche du réseau", "Fiche syllabes", "Matériel", "Corpus à découper"]);
    // La séance citée en plus n'est pas comptée deux fois.
    const avecSeance = creneau("2026-09-28", "10:00", "s1", "Lecture", "On continue la séquence Organiser les mots en réseau.");
    expect(materielDuCreneau(avecSeance, sequences, seances, materiels).map((m) => m.id)).toEqual(["m1", "m6", "m2", "m5"]);
    // Le lien du planning et la citation se cumulent, la séance liée d'abord.
    const deux = creneau("2026-09-28", "11:00", "s1", "Lecture", "Puis Les fractions au quotidien.");
    expect(materielDuCreneau(deux, sequences, seances, materiels).map((m) => m.id)).toEqual(["m1", "m7"]);
  });

  it("joint un PDF du bureau cité dans le prévu, sans séance, une seule fois", () => {
    const bureau = [
      ...materiels,
      materiel({ id: "b1", titre: "Mots mêlés Halloween", pdfsJson: '["h.pdf"]', dateCreation: "2026-10-01" }),
      materiel({ id: "b2", titre: "Mots mêlés Halloween (2)", pdfsJson: '["i.pdf"]' }),
      materiel({ id: "b3", titre: "Mots mêlés Halloween", seanceId: "s1", pdfsJson: '["j.pdf"]', dateCreation: "2026-10-03" }),
    ];
    expect(ligneDuPdf(bureau[7])).toBe("📄 Mots mêlés Halloween");
    expect(ligneDuPdf(materiel({ titre: "  " }))).toBe("📄 PDF sans titre");
    // La ligne du bouton, sans accents ni majuscules, et ce qu'on écrit après le titre.
    const prevu = "Accueil\n📄 MOTS MELES halloween, pour les CE1\n📄 Mots mêlés Halloween (2)\nMots mêlés Halloween sans le 📄 en tête";
    expect(pdfsCites(prevu, bureau).map((m) => m.id)).toEqual(["b1", "b2"]);
    // Rien que du texte : rien n'est cité.
    expect(pdfsCites("Mots mêlés Halloween", bureau)).toEqual([]);
    // Le PDF cité rejoint le matériel du créneau, après celui de la séance ; le même fichier ne sort qu'une fois.
    const c = creneau("2026-10-05", "17:00", "s1", "Réunion", "📄 Mots mêlés Halloween\n📄 Mots mêlés Halloween");
    expect(materielDuCreneau(c, sequences, seances, bureau).map((m) => m.id)).toEqual(["m1", "b3", "b1"]);
    expect(annexesDesCreneaux([{ ...c, seanceId: null }], sequences, seances, bureau).map((a) => a.fichier)).toEqual(["h.pdf"]);
  });

  it("suit l'ordre des créneaux, un fichier une seule fois, avec d'où il vient", () => {
    const creneaux = [
      creneau("2026-09-29", "10:30", "s1"),           // le lendemain : même séance, rien de plus à imprimer
      creneau("2026-09-28", "14:00", "s2", "Maths"),
      creneau("2026-09-28", "09:00", "s1"),
      creneau("2026-09-28", "11:00", null),
    ];
    const annexes = annexesDesCreneaux(creneaux, sequences, seances, materiels, (c) => (c.date === "2026-09-28" ? "lundi 28 septembre" : "mardi 29 septembre"));
    expect(annexes.map((a) => a.fichier)).toEqual(["a.pdf", "b.pdf", "c.pdf"]);
    expect(annexes[0]).toEqual({ seanceId: "s1", quand: "lundi 28 septembre · 09:00 · Les syllabes", titre: "Fiche syllabes", fichier: "a.pdf", echelle: 1 });
    // L'échelle du matériel suit chacun de ses fichiers.
    const reduites = annexesDesCreneaux(creneaux, sequences, seances, materiels, () => "", { m1: 0.8 });
    expect(reduites.map((a) => a.echelle)).toEqual([0.8, 0.8, 1]);
    // Sans titre de séance, la matière ; sans libellé de jour, l'heure d'abord.
    expect(annexes[2].quand).toBe("lundi 28 septembre · 14:00 · Maths");
    expect(annexesDesCreneaux(creneaux, sequences, seances, materiels)[2].quand).toBe("14:00 · Maths");
    expect(annexesDesCreneaux([], sequences, seances, materiels)).toEqual([]);
  });

  it("garde l'échelle d'impression de chaque matériel dans un réglage, bornée", () => {
    expect(cleEchelle("m1")).toBe("impression:echelle:m1");
    expect(lireEchelle("80")).toBe(0.8);
    expect(lireEchelle("125")).toBe(1.25);
    expect(lireEchelle(null)).toBe(1);
    expect(lireEchelle("abc")).toBe(1);
    expect(lireEchelle("0")).toBe(1);
    expect(lireEchelle("300")).toBe(1.5);
    expect(lireEchelle("10")).toBe(0.5);
    expect(echellesDesReglages({ "impression:echelle:m1": "80", "impression:echelle:m2": "x", "theme": "sombre", "impression:echelle:": "50" }))
      .toEqual({ m1: 0.8, m2: 1 });
  });

  it("donne au journal lui-même sa molette, qui remet en page par zoom et se retient", () => {
    const html = moletteDuJournalHtml();
    expect(html).toContain('class="annexe-outils journal-outils"');
    expect(html).toContain('value="100"');
    expect(html).toContain('journal.style.zoom');
    expect(html).toContain("maitrize:echelle-journal");
    expect(STYLE_ANNEXES).toContain(".journal-outils");
  });

  it("relit les octets d'un fichier en base64", () => {
    expect(Array.from(octetsDeBase64("JVBERi0="))).toEqual([0x25, 0x50, 0x44, 0x46, 0x2d]);
    expect(octetsDeBase64("")).toHaveLength(0);
  });

  it("met chaque page de PDF sur sa feuille, le bandeau sur la première seulement", () => {
    const annexe = { seanceId: "s1", quand: "09:00 · Les syllabes", titre: "Fiche <b>1</b>", fichier: "a.pdf", echelle: 1 };
    const page = (numero: number) => ({ numero, image: `IMG${numero}`, largeur: 10, hauteur: 14 });
    const html = annexesHtml([{ annexe, pages: [page(1), page(2)] }, { annexe: { ...annexe, titre: "Seule", fichier: "b.pdf" }, pages: [page(1)] }]);
    expect(html.match(/<section class="annexe( annexe-suite)?" data-annexe="\d+" /g)).toHaveLength(3);
    // Les pages d'un même document se suivent ; chaque document commence sa feuille.
    expect(html.match(/class="annexe annexe-suite"/g)).toHaveLength(1);
    // Toutes à la largeur qui fait tenir la plus haute dans la page : 250 mm pour un rapport de 1,4.
    expect(html.match(/style="--limite:178.6mm"/g)).toHaveLength(3);
    expect(html.match(/annexe-bandeau/g)).toHaveLength(2);
    // À l'écran, une molette par feuille, réglée à son échelle ; le script une seule fois.
    expect(html.match(/class="annexe-outils"/g)).toHaveLength(2);
    expect(html).toContain('value="100"');
    expect(html.match(/<script>/g)).toHaveLength(1);
    expect(html).toContain("📎 Matériel à imprimer · 09:00 · Les syllabes · Fiche &lt;b&gt;1&lt;/b&gt; · 2 pages");
    expect(html).not.toContain("Seule · 1 pages");
    expect(html).toContain('src="data:image/png;base64,IMG2"');
    expect(annexesHtml([])).toBe("");
    // Réduite ou agrandie : c'est la taille réelle de l'image qui change, et la place qu'elle prend.
    expect(html).not.toContain(";--echelle:");
    const reduite = annexesHtml([{ annexe: { ...annexe, echelle: 0.8 }, pages: [page(1)] }]);
    expect(reduite).toContain('style="--limite:178.6mm;--echelle:0.8"');
    expect(reduite).toContain('f.style.setProperty("--echelle"');
    expect(reduite).toContain('value="80"');
    // Le cadre rogne l'image agrandie : elle ne déborde ni sur le bandeau ni sur la page suivante.
    expect(html.match(/<div class="annexe-cadre"><img /g)).toHaveLength(3);
    expect(STYLE_ANNEXES).toContain(".annexe-cadre { overflow: hidden;");
    expect(STYLE_ANNEXES).toContain(".annexe.annexe-suite { break-before: auto;");
    // Sous 100 %, la taille réelle ; au-dessus, un agrandissement dans le cadre, depuis le haut.
    expect(STYLE_ANNEXES).toContain("width: calc(min(100%, var(--limite)) * min(var(--echelle), 1))");
    expect(STYLE_ANNEXES).toContain("transform: scale(max(var(--echelle), 1)); transform-origin: top center");
    // La page la plus haute fixe la largeur de toutes ; sans page, pas de limite.
    expect(limiteMm([{ largeur: 1300, hauteur: 1600 }, { largeur: 1300, hauteur: 350 }])).toBe(203.1);
    expect(limiteMm([{ largeur: 1000, hauteur: 250 }])).toBe(1000);
    expect(limiteMm([])).toBe(1000);
    // « Tenir sur une feuille » : proposé dès qu'un document a plusieurs pages, avec son pourcentage tout prêt.
    expect(html.match(/class="annexe-ajuster"/g)).toHaveLength(1);
    expect(html).toContain('class="annexe-ajuster" data-echelle="50"');
    // Une feuille pleine et deux exercices qui débordent : 75 % suffisent, au pas de la molette.
    expect(echellePourUneFeuille([{ largeur: 1216, hauteur: 1769 }, { largeur: 1216, hauteur: 369 }])).toBe(75);
    // Deux pages pleines ne tiennent qu'à moitié ; ce qui tient déjà reste à 100 %.
    expect(echellePourUneFeuille([{ largeur: 1500, hauteur: 2121 }, { largeur: 1500, hauteur: 2121 }])).toBe(50);
    expect(echellePourUneFeuille([{ largeur: 1216, hauteur: 600 }, { largeur: 1216, hauteur: 369 }])).toBe(100);
    expect(echellePourUneFeuille([])).toBe(100);
    expect(STYLE_ANNEXES).toContain("@media print { .annexe-outils { display: none; } }");
    // Chaque feuille jointe commence une page, l'image plafonnée pour laisser le pied.
    expect(STYLE_ANNEXES).toContain("break-before: page");
  });
});
