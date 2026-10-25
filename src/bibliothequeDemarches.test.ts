import { describe, expect, it } from "vitest";
import { DEMARCHES, demarcheDe } from "./demarches";
import {
  RAYON_COMPETENCE, RAYONS_DES_METHODOLOGIES, RAYONS_DES_SEQUENCES, classeDeDepart, classesDuLivre, classesDuRayon, etageres, livreDe,
  nombreDuRayon, rayonDeDepart, sorteDuLivre,
} from "./bibliothequeDemarches";

const ids = (e: ReturnType<typeof etageres>) => e.flatMap((x) => x.livres.map((l) => l.demarche.id));
const rayon = (cle: string, classe: "CP" | "CE1" | "CE2" | "CM1" | "CM2" | null = null) => etageres({ rayon: cle, classe, recherche: "", proposees: [] });
const HG = "sequences:Histoire-géographie";
const METHODES_SCIENCES = "methodologies:Sciences, histoire, EMC";

describe("La bibliothèque des démarches", () => {
  it("range chaque démarche dans un rayon, une seule fois", () => {
    const rangees = [...RAYONS_DES_SEQUENCES, ...RAYONS_DES_METHODOLOGIES].flatMap((r) => ids(rayon(r.cle)));
    expect(rangees.length).toBe(DEMARCHES.length);
    expect(new Set(rangees).size).toBe(DEMARCHES.length);
  });

  it("met les séquences d'histoire-géographie avec les séquences toutes faites, et les méthodologies à part", () => {
    const hg = ids(rayon(HG));
    for (const id of ["temps-naturel-cp", "prehistoire-ce2", "temps-republique-cm2"]) expect(hg).toContain(id);
    expect(hg).not.toContain("investigation");
    expect(ids(rayon(METHODES_SCIENCES))).toEqual(["investigation", "enquete-histoire-geo", "emc-debat"]);
    expect(rayon(HG, "CE1").map((e) => e.titre)).toEqual(["Se situer dans le temps : l'histoire", "Se situer dans l'espace : la géographie"]);
    expect(sorteDuLivre(livreDe(demarcheDe("prehistoire-ce2")!))).toBe("Séquence toute faite — CE2 · Se situer dans le temps : l'histoire");
    expect(sorteDuLivre(livreDe(demarcheDe("investigation")!))).toBe("Méthodologie — Sciences, histoire, EMC");
  });

  it("range un rayon de séquences par domaine, à la classe choisie, sans méthodologie", () => {
    const maths = rayon("sequences:Mathématiques", "CE1");
    const livres = maths.flatMap((e) => e.livres);
    expect(livres.length).toBeGreaterThan(20);
    expect(livres.every((l) => l.sorte === "sequence" && l.classes.includes("CE1"))).toBe(true);
    expect(maths.every((e) => e.titre && e.livres.every((l) => l.domaine?.nom === e.titre))).toBe(true);
    expect(ids(maths)).toContain("soustraction-retenue-ce1");
    expect(ids(maths)).not.toContain("calcul-mental-martiniere");
    expect(classesDuRayon("sequences:Mathématiques")).toEqual(["CP", "CE1", "CE2", "CM1", "CM2"]);
  });

  it("garde les méthodologies sur une étagère sans titre, ni classe", () => {
    const methodes = rayon("methodologies:Mathématiques", "CE2");
    expect(methodes).toEqual([{ titre: null, livres: expect.any(Array) }]);
    expect(ids(methodes)).toEqual(["problemes", "calcul-mental-martiniere", "geometrie-grandeurs"]);
    expect(classesDuRayon("methodologies:Mathématiques")).toEqual([]);
    expect(nombreDuRayon("methodologies:Toutes disciplines", "CM1", [])).toBe(2);
  });

  it("sépare la maternelle : ses séquences d'une notion, ses méthodologies", () => {
    expect(ids(rayon("sequences:Maternelle"))).toEqual(expect.arrayContaining(["vilain-petit-canard-ms", "probleme-du-jour-maternelle", "phonologie"]));
    expect(ids(rayon("methodologies:Maternelle"))).toEqual(["maternelle-modalites", "categoriser-maternelle"]);
  });

  it("cherche dans tous les rayons, sans accents, par mots", () => {
    const trouve = etageres({ rayon: "methodologies:Maternelle", classe: null, recherche: "soustraction  RETENUE", proposees: [] });
    expect(trouve.map((e) => e.titre)).toEqual(["Séquences toutes faites — Mathématiques"]);
    expect(ids(trouve)).toContain("soustraction-retenue-ce1");
    expect(etageres({ rayon: HG, classe: null, recherche: "investigation", proposees: [] }).map((e) => e.titre))
      .toContain("Méthodologies — Sciences, histoire, EMC");
    expect(etageres({ rayon: HG, classe: null, recherche: "zzzz", proposees: [] })).toEqual([]);
  });

  it("s'ouvre sur les démarches de la compétence, s'il y en a plusieurs, sinon sur le rayon de la proposée", () => {
    const deux = [demarcheDe("posees-ce1")!, demarcheDe("soustraction-retenue-ce1")!];
    expect(rayonDeDepart(deux)).toBe(RAYON_COMPETENCE.cle);
    expect(ids(etageres({ rayon: RAYON_COMPETENCE.cle, classe: "CE1", recherche: "", proposees: deux }))).toEqual(["posees-ce1", "soustraction-retenue-ce1"]);
    expect(rayonDeDepart([deux[0]])).toBe("sequences:Mathématiques");
    expect(rayonDeDepart([], demarcheDe("lecture-code"))).toBe("methodologies:Français");
    expect(classeDeDepart("CE1")).toBe("CE1");
    expect(classeDeDepart("GS")).toBeNull();
  });

  it("donne une image à chaque livre, et la classe sur sa couverture", () => {
    expect(DEMARCHES.every((d) => livreDe(d).icone)).toBe(true);
    const soustraction = livreDe(demarcheDe("soustraction-retenue-ce1")!);
    expect(classesDuLivre(soustraction)).toBe("CE1");
    expect(soustraction.titre).not.toMatch(/\(CE1\)/);
  });
});
