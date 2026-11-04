import { describe, expect, it } from "vitest";
import cycle1 from "../src-tauri/referentiels/competences_cycle1_2025.json";
import type { Referentiel } from "./api";
import { DEMARCHES_ATELIERS_GS, DEMARCHES_ATELIERS_MS } from "./demarchesAteliersMSGS";
import { DEMARCHES_ATELIERS_PS } from "./demarchesAteliersPS";
import { noteDuMaterielDesCompetences } from "./materielDeClasse";
import { periodeProposee } from "./periodesProposees";
import { ateliersDesFeuilles, competenceDeMaternelle, domaineDeMaternelle, sectionsDeLaDemarche } from "./sequencesDeMaternelle";

const referentiels: Referentiel[] = [{
  id: "c1", nom: "Cycle 1 – École maternelle (Programme 2025)", cycle: "Cycle 1", donnees: JSON.stringify(cycle1), estIntegre: true, dateAjout: "", actif: true,
}];

/** La compétence de sa section que chaque séquence vise, et le matériel de la classe que ses séances rappellent. */
const ATTENDU: Record<string, { section: "MS" | "GS"; competence: RegExp; materiel: RegExp[] }> = {
  "ateliers-verser-ms": { section: "MS", competence: /^Désigner et utiliser des outils ou des objets adaptés/, materiel: [/des carafes et des verres marqués/, /des pinces de toutes sortes/] },
  "ateliers-ouvrir-ms": { section: "MS", competence: /^Désigner et utiliser des outils ou des objets adaptés/, materiel: [/des cadenas et leurs clés/, /des trombones/] },
  "ateliers-sens-ms": { section: "MS", competence: /^Identifier et nommer des organes sensoriels/, materiel: [/des sacs à toucher/, /des boîtes sonores et des boîtes à odeurs/, /des planches de nuances/] },
  "ateliers-tailles-ms": { section: "MS", competence: /^Ordonner des objets rectilignes selon leur longueur/, materiel: [/des barres rouges/, /des poupées gigognes/] },
  "ateliers-tracer-ms": { section: "MS", competence: /^Tracer des lettres capitales/, materiel: [/un plateau de semoule/, /des lettres douces/] },
  "ateliers-verser-gs": { section: "GS", competence: /^Identifier et prévenir les risques liés à certains objets/, materiel: [/des pinces de toutes sortes/, /des ciseaux adaptés/] },
  "ateliers-ouvrir-gs": { section: "GS", competence: /^Associer une solution technique à une fonction technique/, materiel: [/des vis, des boulons et leurs écrous/] },
  "ateliers-lettres-gs": { section: "GS", competence: /^Connaitre les différentes graphies d'une même lettre/, materiel: [/des roues des lettres/] },
  "ateliers-tailles-gs": { section: "GS", competence: /^Ordonner des objets rectlignes selon leur longueur/, materiel: [/des barres rouges/] },
  "ateliers-tracer-gs": { section: "GS", competence: /^travailler la ligature entre deux lettres/, materiel: [/un plateau de semoule/] },
};

const TOUTES = [...DEMARCHES_ATELIERS_MS, ...DEMARCHES_ATELIERS_GS];

describe("les ateliers de manipulation déclinés en moyenne et en grande section (demande de l'enseignant, 4 novembre 2026)", () => {
  it("font cinq séquences par section, d'après le document de la Savoie et le programme", () => {
    expect(TOUTES.map((d) => d.id)).toEqual(Object.keys(ATTENDU));
    for (const d of TOUTES) {
      const { section } = ATTENDU[d.id];
      expect(d.famille, d.id).toBe("Maternelle");
      expect(d.source, d.id).toMatch(new RegExp(`Amandine Frison.*Montessori.*programme de l'école maternelle \\(2025\\).*à partir de ${section === "MS" ? 4 : 5} ans`));
      expect(sectionsDeLaDemarche(d.id), d.id).toEqual([section]);
      expect(domaineDeMaternelle(d.id), d.id).not.toBeNull();
      expect(ateliersDesFeuilles(d.id).length, d.id).toBeGreaterThan(0);
      expect(periodeProposee(d.id, section)?.periode, d.id).toBeGreaterThan(0);
      expect(d.seances, d.id).toHaveLength(7);
      for (const s of d.seances.slice(0, 6)) expect(s.consignes?.length ?? 0, `${d.id} › ${s.titre}`).toBeGreaterThanOrEqual(3);
      expect(d.seances[6].titre, d.id).toMatch(/observer chacun/i);
    }
    // Rien ne répète la petite section mot pour mot : chaque séance est plus fine.
    const titresPS = new Set(DEMARCHES_ATELIERS_PS.flatMap((d) => d.seances.slice(0, 6).map((s) => s.titre)));
    for (const d of TOUTES) for (const s of d.seances.slice(0, 6)) expect(titresPS.has(s.titre), `${d.id} › ${s.titre}`).toBe(false);
  });

  it("visent chacune une compétence de sa section dans le programme de 2025, et leurs séances rappellent le matériel de leurs plateaux", async () => {
    const lire = async () => null;
    for (const d of TOUTES) {
      const { section, competence, materiel } = ATTENDU[d.id];
      const c = competenceDeMaternelle(referentiels, d, section);
      expect(c, d.id).not.toBeNull();
      expect(c!.niveau, d.id).toBe(section);
      expect(c!.competenceTitre, d.id).toMatch(competence);
      // Pas à une autre section.
      expect(competenceDeMaternelle(referentiels, d, section === "MS" ? "GS" : "MS"), d.id).toBeNull();
      const note = await noteDuMaterielDesCompetences([c!], lire);
      for (const m of materiel) expect(note, `${d.id} : ${c!.competenceTitre}`).toMatch(m);
    }
  });

  it("gardent les mises en garde du programme : petits objets comptés, outils qui coupent, eau qui fait glisser", () => {
    const ms = JSON.stringify(DEMARCHES_ATELIERS_MS);
    expect(ms).toMatch(/risque d'étouffement/);
    expect(ms).toMatch(/compte les (noisettes|pièces|trombones)|les compte avant et après/);
    const securite = DEMARCHES_ATELIERS_GS.find((d) => d.id === "ateliers-verser-gs")!;
    // Chaque plateau finit par sa règle de sécurité.
    for (const s of securite.seances.slice(0, 6)) expect(s.phases[s.phases.length - 1].phase, s.titre).toBe("Dire la règle");
    const tout = JSON.stringify(securite);
    for (const risque of [/risque de chute/, /risques d'étouffement/, /outils qui pincent ou coupent/]) expect(tout).toMatch(risque);
  });

  it("respectent les bornes du programme : cinq longueurs au plus en grande section, sept pièces de tangram sur huit permises", () => {
    const tailles = JSON.stringify(DEMARCHES_ATELIERS_GS.find((d) => d.id === "ateliers-tailles-gs"));
    expect(tailles).toMatch(/au maximum cinq/);
    expect(tailles).toMatch(/au maximum huit/);
    expect(tailles).not.toMatch(/dix barres de la plus courte/);
  });
});
