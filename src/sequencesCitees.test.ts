import { describe, it, expect } from "vitest";
import { nouvelleSeance, nouvelleSequence, type Seance, type Sequence } from "./api";
import { insererLigne, ligneDeSequence, sequencesCitees, sequencesImprimees } from "./sequencesCitees";

const sequence = (id: string, titre: string, p: Partial<Sequence> = {}): Sequence => ({ ...nouvelleSequence(), id, titre, ...p });
const seance = (id: string, sequenceId: string, numero: number, titre: string, p: Partial<Seance> = {}): Seance =>
  ({ ...nouvelleSeance(sequenceId, numero), id, titre, ...p });

const reseau = sequence("s1", "Organiser les mots en réseau", { matiere: "Français", periode: 1, objectifs: "Catégoriser le vocabulaire." });
const fractions = sequence("s2", "Les fractions");
const fractionsDecimales = sequence("s3", "Les fractions décimales");
const courte = sequence("s4", "Lire");
const seances = [
  seance("a", "s1", 1, "Découverte du corpus", { deroulement: "1. Lecture du corpus\n[img:photo.png]\n2. Tri des mots", objectifs: "Découvrir les mots." }),
  seance("b", "s1", 2, "Réinvestir le corpus de mots"),
  seance("c", "s2", 1, "Partager une pizza"),
];
const toutes = [reseau, fractions, fractionsDecimales, courte];
const decrire = (c: ReturnType<typeof sequencesCitees>) => c.map((x) => `${x.sequence.id}${x.seance ? `/${x.seance.numero}` : ""}`);

describe("séquences citées dans le prévu", () => {
  it("reconnaît une séquence écrite à la main, sans accents ni majuscules", () => {
    const prevu = "-graphisme\n- lecture narramus du vilain petit canard\nsequence organiser les mots en reseau.";
    expect(decrire(sequencesCitees(prevu, toutes, seances))).toEqual(["s1"]);
  });

  it("reconnaît la séance posée par le bouton, par son numéro ou par son titre", () => {
    expect(decrire(sequencesCitees(ligneDeSequence(reseau, seances[0]), toutes, seances))).toEqual(["s1/1"]);
    expect(decrire(sequencesCitees("Organiser les mots en réseau, séance n°2", toutes, seances))).toEqual(["s1/2"]);
    expect(decrire(sequencesCitees("Organiser les mots en réseau : réinvestir le corpus de mots", toutes, seances))).toEqual(["s1/2"]);
  });

  it("reconnaît toujours la ligne du bouton, même pour un titre court, et une seule séquence par ligne", () => {
    expect(decrire(sequencesCitees(ligneDeSequence(courte), toutes, seances))).toEqual(["s4"]);
    expect(decrire(sequencesCitees(ligneDeSequence(fractionsDecimales), toutes, seances))).toEqual(["s3"]);
    // Le titre d'une séance qui contient celui d'une autre séquence ne la cite pas.
    const album = seance("d", "s2", 2, "Lire les fractions décimales");
    expect(decrire(sequencesCitees(ligneDeSequence(fractions, album), toutes, [...seances, album]))).toEqual(["s2/2"]);
    // Un 📚 écrit à la main devant autre chose : la séquence se cherche comme ailleurs.
    expect(decrire(sequencesCitees("📚 révisions : organiser les mots en réseau", toutes, seances))).toEqual(["s1"]);
  });

  it("préfère le titre le plus long, ignore les titres trop courts et ne cite chaque séance qu'une fois", () => {
    expect(decrire(sequencesCitees("les fractions décimales", toutes, seances))).toEqual(["s3"]);
    expect(decrire(sequencesCitees("Lire un album", toutes, seances))).toEqual([]);
    const prevu = "Pour Aurélien : les fractions, séance 1\nPour Louison : organiser les mots en réseau\nencore les fractions séance 1";
    expect(decrire(sequencesCitees(prevu, toutes, seances))).toEqual(["s2/1", "s1"]);
  });
});

describe("le bouton 📚", () => {
  it("écrit une ligne lisible", () => {
    expect(ligneDeSequence(reseau)).toBe("📚 Organiser les mots en réseau");
    expect(ligneDeSequence(reseau, seances[0])).toBe("📚 Organiser les mots en réseau · séance 1 : Découverte du corpus");
  });

  it("pose la ligne après celle du curseur, ou à la fin, sans la doubler", () => {
    const prevu = "-graphisme\n- lecture narramus";
    expect(insererLigne(prevu, "📚 X", 3)).toBe("-graphisme\n📚 X\n- lecture narramus");
    expect(insererLigne(prevu, "📚 X", null)).toBe("-graphisme\n- lecture narramus\n📚 X");
    expect(insererLigne("", "📚 X", null)).toBe("📚 X");
    expect(insererLigne("a\n📚 X", "📚 X", 0)).toBe("a\n📚 X");
  });
});

describe("le PDF du jour", () => {
  it("imprime les objectifs et le déroulement de la séance citée, sans marqueurs", () => {
    const html = sequencesImprimees(sequencesCitees(ligneDeSequence(reseau, seances[0]), toutes, seances));
    expect(html).toContain("📚 Organiser les mots en réseau — séance 1 : Découverte du corpus");
    expect(html).toContain("Français · période 1");
    expect(html).toContain("Découvrir les mots.");
    expect(html).toContain("1. Lecture du corpus");
    expect(html).not.toContain("[img:");
    expect(sequencesImprimees([])).toBe("");
    // Sans séance précisée : les objectifs de la séquence.
    expect(sequencesImprimees(sequencesCitees("organiser les mots en réseau", toutes, seances))).toContain("Catégoriser le vocabulaire.");
  });
});
