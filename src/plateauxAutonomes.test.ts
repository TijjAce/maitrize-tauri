import { describe, expect, it } from "vitest";
import { DEMARCHES_ATELIERS_PS } from "./demarchesAteliersPS";
import {
  DOMAINE_DES_FICHES, MINUTEURS_DE_BASE, fabricationsDesFiches, iconeDeLaRecette, proposer, recetteDe, recettesPour, rubriqueDeLaRecette, type OutilsFiche,
} from "./fichesAutonomie";
import { MATERIEL_REEL, ecrireInventaire, lireInventaire } from "./materielDeClasse";
import { periodeProposee } from "./periodesProposees";
import { PLATEAUX_PS, plateauxSansMateriel } from "./plateauxAutonomes";

const outils: OutilsFiche = { image: async () => null, pictos: async () => ({}), ombre: async () => null };
/** Le texte d'une page, sans balises ni entités. */
const texte = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#39;|&#x27;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ");

describe("les plateaux de manipulation de la petite section (demande de l'enseignant, 4 novembre 2026)", () => {
  it("viennent des séquences de petite section, à la période où elles les montrent", () => {
    expect(PLATEAUX_PS.length).toBeGreaterThanOrEqual(20);
    expect(new Set(PLATEAUX_PS.map((p) => p.id)).size).toBe(PLATEAUX_PS.length);
    const sequences = new Set(DEMARCHES_ATELIERS_PS.map((d) => d.id));
    for (const p of PLATEAUX_PS) {
      expect(sequences.has(p.sequence), p.id).toBe(true);
      expect(p.periode, p.id).toBe(periodeProposee(p.sequence, "PS")?.periode);
      // Le matériel de la classe que le plateau prend existe au catalogue.
      expect(MATERIEL_REEL.some((m) => m.id === p.materiel), `${p.id} → ${p.materiel}`).toBe(true);
    }
    // Les quatre familles : vie pratique, sens, tailles, tracer.
    expect(new Set(PLATEAUX_PS.map((p) => p.famille))).toEqual(new Set(["viePratique", "sens", "tailles", "tracer"]));
  });

  it("disent les étapes à l'élève, à la première personne, comme les consignes de leur séance", () => {
    const consignes = new Set(DEMARCHES_ATELIERS_PS.flatMap((d) => d.seances.flatMap((s) => s.consignes ?? [])));
    for (const p of PLATEAUX_PS) {
      expect(p.etapes.length, p.id).toBeGreaterThanOrEqual(3);
      expect(p.etapes.length, p.id).toBeLessThanOrEqual(5);
      for (const e of p.etapes) expect(e, p.id).toMatch(/^(Je |J'|Il |Jusqu'au )/);
      // La plupart des étapes sont celles que la séance a montrées.
      expect(p.etapes.filter((e) => consignes.has(e)).length, p.id).toBeGreaterThanOrEqual(p.etapes.length - 2);
      expect(p.surLePlateau, p.id).toMatch(/\.$/);
      expect(p.resultat, p.id).toMatch(/\.$/);
    }
  });

  it("n'en donnent aucun qu'un petit porte à la bouche ou fait éclater, seul", () => {
    const tout = JSON.stringify(PLATEAUX_PS);
    expect(tout).not.toMatch(/noix|noisette|élastique|ballon|haricot|pois chiche|graine/i);
    expect(PLATEAUX_PS.find((p) => p.id === "plateau-sons")!.surLePlateau).toMatch(/fermées pour de bon/);
  });

  it("se proposent en petite section, deux sur trois, rangés à part dans les réglages ; chacun a son temps et sa matière", () => {
    for (const p of PLATEAUX_PS) {
      const r = recetteDe(p.id)!;
      expect(r.niveaux).toEqual(["PS"]);
      expect(r.atelier).toBe("sequentiel");
      expect(rubriqueDeLaRecette(r)).toBe("Plateaux de manipulation");
      expect(iconeDeLaRecette(r)).toBe("🧺");
      expect(MINUTEURS_DE_BASE[p.id]).toBe(10);
      expect(DOMAINE_DES_FICHES[p.id]?.matiere, p.id).toBeTruthy();
      // Pas avant d'avoir été montré.
      expect(recettesPour("PS", p.periode - 1, false).some((x) => x.id === p.id), p.id).toBe(false);
      expect(recettesPour("PS", p.periode, false).some((x) => x.id === p.id), p.id).toBe(true);
    }
    expect(recettesPour("MS", 5, false).some((r) => r.domaine === "plateau")).toBe(false);
    // On les écarte tous d'un coup sous leur nom.
    expect(fabricationsDesFiches("PS")).toContainEqual({ atelier: "sequentiel", nom: "Les plateaux de manipulation" });
  });

  it("font le séquentiel de « Décomposer la tâche » : ce qu'on pose, les étapes, ce qu'on doit obtenir ; l'atelier le refait", async () => {
    const p = PLATEAUX_PS.find((x) => x.id === "plateau-odeurs")!;
    const f = await recetteDe(p.id)!.fabriquer({ niveau: "PS", periode: 3, prenom: "Eliot" }, 1, outils);
    const lu = texte(f.html);
    expect(lu).toContain(p.nom);
    expect(lu).toContain("Ce dont j'ai besoin");
    expect(lu).toContain(p.surLePlateau);
    expect(lu).toContain(p.resultat);
    for (const e of p.etapes) expect(lu).toContain(e);
    expect(lu).not.toContain("Eliot");
    expect(f.refaire).toMatchObject({ sequentiel: { titre: p.nom, etapes: p.etapes, forme: "sequentiel", materiel: p.surLePlateau, resultat: p.resultat } });
    // Avec les pictos de l'application, quand elle les donne.
    const avec = await recetteDe(p.id)!.fabriquer({ niveau: "PS", periode: 3, prenom: "Eliot" }, 1,
      { ...outils, sequentiel: async () => ({ html: "<div>séquentiel avec ses pictos</div>", style: "" }) });
    expect(avec.html).toBe("<div>séquentiel avec ses pictos</div>");
  });

  it("écartent ceux dont la classe n'a pas le matériel, une fois l'inventaire fait — sans inventaire, tous se proposent", () => {
    expect(plateauxSansMateriel({})).toEqual([]);
    expect(plateauxSansMateriel(lireInventaire(ecrireInventaire({ pinces: { a: false, lieu: "" } })))).toEqual([]);
    const inv = lireInventaire(ecrireInventaire({ pinces: { a: true, lieu: "l'étagère" }, transvasement: { a: true, lieu: "" } }));
    const sans = plateauxSansMateriel(inv);
    expect(sans).not.toContain("plateau-verser");
    expect(sans).not.toContain("plateau-pinces-linge");
    expect(sans).toContain("plateau-cadenas");
    // Seuls ses deux plateaux restent : ce sont eux qui viennent.
    for (let g = 1; g < 10; g++) {
      const fiches = proposer("PS", 2, false, 3, g, sans);
      const plateaux = fiches.filter((f) => recetteDe(f.recette)?.domaine === "plateau").map((f) => f.recette);
      expect(plateaux.every((id) => id === "plateau-verser" || id === "plateau-pinces-linge"), `${g} : ${plateaux}`).toBe(true);
    }
  });
});
