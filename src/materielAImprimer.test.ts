import { describe, it, expect } from "vitest";
import type { MaterielItem } from "./api";
import { annexesDesCreneaux, annexesHtml, octetsDeBase64, STYLE_ANNEXES, titresDuMateriel } from "./materielAImprimer";

const materiel = (p: Partial<MaterielItem>): MaterielItem => ({
  id: "m", titre: "Fiche", descriptionMateriel: "", competenceId: "", competenceTitre: "", domaineTitre: "",
  sousDomaineTitre: "", cycle: "", imagesJson: "[]", pdfsJson: '["a.pdf"]', dateCreation: "", seanceId: null,
  sequenceId: null, dossier: "", videosJson: "[]", coffreJson: "[]", ...p,
});
const creneau = (date: string, heureDebut: string, seanceId: string | null, matiere = "Lecture") => ({ date, heureDebut, seanceId, matiere });
const seances = [{ id: "s1", titre: "Les syllabes" }, { id: "s2", titre: "" }];
const materiels = [
  materiel({ id: "m1", titre: "Fiche syllabes", seanceId: "s1", pdfsJson: '["a.pdf","b.pdf"]' }),
  materiel({ id: "m2", titre: "  ", seanceId: "s2", pdfsJson: '["c.pdf"]' }),
  materiel({ id: "m3", titre: "Sans PDF", seanceId: "s1", pdfsJson: "[]", imagesJson: '["x.png"]' }),
  materiel({ id: "m4", titre: "Sur le bureau", seanceId: null }),
];

describe("le matériel des séances du journal", () => {
  it("s'annonce par ses titres, sans les matériels sans PDF", () => {
    expect(titresDuMateriel(creneau("2026-09-28", "09:00", "s1"), materiels)).toEqual(["Fiche syllabes"]);
    expect(titresDuMateriel(creneau("2026-09-28", "09:00", "s2"), materiels)).toEqual(["Matériel"]);
    expect(titresDuMateriel(creneau("2026-09-28", "09:00", null), materiels)).toEqual([]);
  });

  it("suit l'ordre des créneaux, un fichier une seule fois, avec d'où il vient", () => {
    const creneaux = [
      creneau("2026-09-29", "10:30", "s1"),           // le lendemain : même séance, rien de plus à imprimer
      creneau("2026-09-28", "14:00", "s2", "Maths"),
      creneau("2026-09-28", "09:00", "s1"),
      creneau("2026-09-28", "11:00", null),
    ];
    const annexes = annexesDesCreneaux(creneaux, seances, materiels, (c) => (c.date === "2026-09-28" ? "lundi 28 septembre" : "mardi 29 septembre"));
    expect(annexes.map((a) => a.fichier)).toEqual(["a.pdf", "b.pdf", "c.pdf"]);
    expect(annexes[0]).toEqual({ seanceId: "s1", quand: "lundi 28 septembre · 09:00 · Les syllabes", titre: "Fiche syllabes", fichier: "a.pdf" });
    // Sans titre de séance, la matière ; sans libellé de jour, l'heure d'abord.
    expect(annexes[2].quand).toBe("lundi 28 septembre · 14:00 · Maths");
    expect(annexesDesCreneaux(creneaux, seances, materiels)[2].quand).toBe("14:00 · Maths");
    expect(annexesDesCreneaux([], seances, materiels)).toEqual([]);
  });

  it("relit les octets d'un fichier en base64", () => {
    expect(Array.from(octetsDeBase64("JVBERi0="))).toEqual([0x25, 0x50, 0x44, 0x46, 0x2d]);
    expect(octetsDeBase64("")).toHaveLength(0);
  });

  it("met chaque page de PDF sur sa feuille, le bandeau sur la première seulement", () => {
    const annexe = { seanceId: "s1", quand: "09:00 · Les syllabes", titre: "Fiche <b>1</b>", fichier: "a.pdf" };
    const page = (numero: number) => ({ numero, image: `IMG${numero}`, largeur: 10, hauteur: 14 });
    const html = annexesHtml([{ annexe, pages: [page(1), page(2)] }, { annexe: { ...annexe, titre: "Seule", fichier: "b.pdf" }, pages: [page(1)] }]);
    expect(html.match(/<section class="annexe">/g)).toHaveLength(3);
    expect(html.match(/annexe-bandeau/g)).toHaveLength(2);
    expect(html).toContain("📎 Matériel à imprimer · 09:00 · Les syllabes · Fiche &lt;b&gt;1&lt;/b&gt; · 2 pages");
    expect(html).not.toContain("Seule · 1 pages");
    expect(html).toContain('src="data:image/png;base64,IMG2"');
    expect(annexesHtml([])).toBe("");
    // Chaque feuille jointe commence une page, l'image plafonnée pour laisser le pied.
    expect(STYLE_ANNEXES).toContain("break-before: page");
    expect(STYLE_ANNEXES).toContain("max-height: 250mm");
  });
});
