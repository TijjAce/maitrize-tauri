import { describe, expect, it } from "vitest";
import cycle1 from "../src-tauri/referentiels/competences_cycle1_2025.json";
import type { Referentiel } from "./api";
import { DEMARCHES_ATELIERS_PS } from "./demarchesAteliersPS";
import { CLE_INVENTAIRE, ecrireInventaire, noteDuMaterielDesCompetences } from "./materielDeClasse";
import { periodeProposee } from "./periodesProposees";
import { ateliersDesFeuilles, competenceDeMaternelle, domaineDeMaternelle, sectionsDeLaDemarche } from "./sequencesDeMaternelle";

const referentiels: Referentiel[] = [{
  id: "c1", nom: "Cycle 1 – École maternelle (Programme 2025)", cycle: "Cycle 1", donnees: JSON.stringify(cycle1), estIntegre: true, dateAjout: "", actif: true,
}];

/** Le matériel que chaque séquence doit rappeler : ce que le document de la Savoie met sur ses plateaux. */
const MATERIEL_ATTENDU: Record<string, RegExp[]> = {
  "ateliers-verser-ps": [/des carafes et des verres marqués/],
  "ateliers-ouvrir-ps": [/des bocaux et des flacons/, /des pinces de toutes sortes/],
  "ateliers-sens-ps": [/des sacs à toucher/, /des boîtes sonores et des boîtes à odeurs/],
  "ateliers-tailles-ps": [/des cubes à empiler et à emboîter/, /des objets à comparer en longueur/],
  "ateliers-tracer-ps": [/un plateau de semoule/],
};

describe("les ateliers de manipulation en petite section (demande de l'enseignant, 4 novembre 2026)", () => {
  it("font cinq séquences de petite section, d'après le document de la Savoie et le programme", () => {
    expect(DEMARCHES_ATELIERS_PS.map((d) => d.id)).toEqual(Object.keys(MATERIEL_ATTENDU));
    for (const d of DEMARCHES_ATELIERS_PS) {
      expect(d.famille, d.id).toBe("Maternelle");
      expect(d.source, d.id).toMatch(/Amandine Frison.*Montessori.*programme de l'école maternelle \(2025\)/);
      expect(sectionsDeLaDemarche(d.id), d.id).toEqual(["PS"]);
      expect(domaineDeMaternelle(d.id), d.id).not.toBeNull();
      expect(ateliersDesFeuilles(d.id).length, d.id).toBeGreaterThan(0);
      expect(periodeProposee(d.id, "PS")?.periode, d.id).toBeGreaterThan(0);
      expect(d.seances, d.id).toHaveLength(7);
      // Un atelier se montre, se refait, se range : les consignes du séquentiel le disent aux élèves.
      for (const s of d.seances.slice(0, 6)) expect(s.consignes?.length ?? 0, `${d.id} › ${s.titre}`).toBeGreaterThanOrEqual(3);
      // La dernière séance observe chacun.
      expect(d.seances[6].titre, d.id).toMatch(/observer chacun/i);
    }
  });

  it("vise une compétence de petite section du programme de 2025, et chaque séance rappelle le matériel de ses plateaux", async () => {
    const lire = async (cle: string) => (cle === CLE_INVENTAIRE ? ecrireInventaire({ transvasement: { a: true, lieu: "l'étagère des plateaux" } }) : null);
    for (const d of DEMARCHES_ATELIERS_PS) {
      const c = competenceDeMaternelle(referentiels, d, "PS");
      expect(c, d.id).not.toBeNull();
      expect(c!.niveau, d.id).toBe("PS");
      const note = await noteDuMaterielDesCompetences([c!], lire);
      for (const attendu of MATERIEL_ATTENDU[d.id]) expect(note, `${d.id} : ${c!.competenceTitre}`).toMatch(attendu);
    }
    // Ce que la classe a déjà se sort, avec l'endroit où il est rangé.
    const verser = competenceDeMaternelle(referentiels, DEMARCHES_ATELIERS_PS[0], "PS")!;
    expect(await noteDuMaterielDesCompetences([verser], lire)).toMatch(/^Matériel de la classe à sortir : des carafes.*\(l'étagère des plateaux\)/);
  });

  it("garde les petits objets loin des plus jeunes, comme le programme le demande", () => {
    const tout = JSON.stringify(DEMARCHES_ATELIERS_PS);
    expect(tout).toMatch(/risque d'étouffement/);
    expect(tout).not.toMatch(/noisettes dans les alvéoles|pois chiches à la pince/);
  });
});
