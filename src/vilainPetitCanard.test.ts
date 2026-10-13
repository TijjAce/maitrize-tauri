import { describe, it, expect, vi, beforeEach } from "vitest";

const enregistres = { sequences: [] as any[], seances: [] as any[], feuilles: [] as any[] };
let compteur = 0;
vi.mock("./api", () => ({
  api: {
    sequenceSave: async (s: unknown) => { enregistres.sequences.push(s); },
    seanceSave: async (s: unknown) => { enregistres.seances.push(s); },
  },
  newId: () => `id-${++compteur}`,
  nowIso: () => "2026-10-13T08:00:00.000Z",
  anneeScolaireActuelle: () => "2026-2027",
  couleurPourMatiere: () => "orange",
}));
vi.mock("./impressionAtelier", () => ({
  poserDansUneSeance: async (atelier: string, titre: string, html: string, _style: string, seanceId: string, sequenceId: string, extras: unknown) => {
    enregistres.feuilles.push({ atelier, titre, html, seanceId, sequenceId, extras });
  },
}));
vi.mock("./vacances", () => ({ chargerVacances: async () => [], periodeDuJour: () => 1 }));

import { cequiManque as manqueCategoriser, type ReglagesCategoriser } from "./categoriser";
import { cequiManque as manqueSuites, type ReglagesSuites } from "./suitesImages";
import { DEBUT_OBJECTIF_SEANCE, demarcheDe } from "./demarches";
import { DEMARCHE_VPC } from "./demarchesVilainPetitCanard";
import { hasard } from "./hasard";
import { creerLaSequenceDuVilainPetitCanard, objectifsDeLaSequence, titreDeLaSequence } from "./sequenceVilainPetitCanard";
import {
  FAMILLES_DE_L_HISTOIRE, IDS_VPC, LIEUX, PERSONNAGES, P, feuillesDeLaSequence, materielDesSeances, universEtIntrus, type NiveauVpc,
} from "./vilainPetitCanard";
import type { CompetenceSelectionnee } from "./components/CompetenceTree";

const NIVEAUX: NiveauVpc[] = ["MS", "GS"];
const IMAGES = Object.fromEntries(IDS_VPC.map((id) => [id, `data:image/png;base64,${id}`]));
const ids = (n: NiveauVpc) => feuillesDeLaSequence(n).map((f) => f.id);

describe("la séquence du Vilain Petit Canard, d'après le guide du vocabulaire en maternelle", () => {
  beforeEach(() => { enregistres.sequences = []; enregistres.seances = []; enregistres.feuilles = []; });

  it("suit la démarche du guide : douze séances, et chaque feuille dans l'une d'elles", () => {
    for (const n of NIVEAUX) {
      const d = demarcheDe(DEMARCHE_VPC[n])!;
      expect(d.famille, n).toBe("Maternelle");
      expect(d.source, n).toMatch(/Pour enseigner le vocabulaire à l'école maternelle.*p\. 71-76/);
      expect(d.seances, n).toHaveLength(12);
      expect(d.seances.every((s) => s.objectifs.startsWith(DEBUT_OBJECTIF_SEANCE)), n).toBe(true);
      expect(materielDesSeances(n), n).toHaveLength(12);
      for (const f of feuillesDeLaSequence(n)) expect(f.seance, `${n} ${f.id}`).toBeLessThan(12);
      expect(new Set(ids(n)).size, n).toBe(ids(n).length);
    }
    // En MS, les émotions et la naissance ; en GS, les synonymots, puis comparer les versions et les mots du titre.
    expect(demarcheDe(DEMARCHE_VPC.MS)!.seances[5].titre).toMatch(/émotions/);
    expect(demarcheDe(DEMARCHE_VPC.GS)!.seances[5].titre).toMatch(/queue leu leu/);
    expect(ids("MS")).toEqual(expect.arrayContaining(["emotions", "naissance"]));
    expect(ids("MS")).not.toEqual(expect.arrayContaining(["synonymots-queue"]));
    expect(ids("GS")).toEqual(expect.arrayContaining(["synonymots-queue", "synonymots-coquille", "comparer", "titre"]));
    expect(ids("GS")).not.toContain("naissance");
    expect(demarcheDe(DEMARCHE_VPC.GS)!.source).toMatch(/Micheline Cellier/);
  });

  it("met dans l'histoire ses personnages et ses lieux, pas ceux de la ferme", () => {
    const motsDesPersonnages = [...PERSONNAGES.map((p) => p.mot), ...FAMILLES_DE_L_HISTOIRE[0].mots.map((m) => m.mot)];
    expect(motsDesPersonnages.some((m) => /poule|coq|oie/.test(m))).toBe(false);
    expect(LIEUX.map((l) => l.mot)).toEqual(["la vieille maison", "le fleuve", "la tanière", "le lac"]);
    // Le vilain petit canard se distingue de ses frères.
    expect(PERSONNAGES.find((p) => p.mot === "le vilain petit canard")?.gris).toBe(true);
  });

  it("fabrique chaque feuille, à chaque niveau, avec ses images, sans rien d'indéfini ni de prénom écrit", () => {
    for (const n of NIVEAUX) for (const f of feuillesDeLaSequence(n)) {
      const ou = `${n} ${f.id}`;
      const { html, style, memoires } = f.fabriquer(IMAGES, hasard(7));
      expect(html, ou).not.toMatch(/undefined|NaN|\[object Object\]/);
      expect(html, ou).toContain('class="page');
      expect(style.length, ou).toBeGreaterThan(0);
      // Toutes les images sont trouvées : pas de case vide.
      expect(html, ou).not.toContain('class="vide"');
      // La ligne « Prénom … Date … » reste vierge : la feuille resert à un autre élève, un autre jour.
      expect(html, ou).not.toMatch(/Prénom\s*:\s*[^.…\s<]/);
      // Les consignes d'ici sont écrites à la première personne (celles des autres ateliers le deviennent au rendu).
      if (f.atelier === "vilainPetitCanard") for (const regle of html.match(/<div class="regle">[^<]*/g) ?? []) expect(regle, ou).toMatch(/<div class="regle">J(e |')/);
      // Ce qu'il faut pour la refaire dans son atelier, et qui s'y refait.
      if (f.atelier === "categoriser") expect(manqueCategoriser(memoires.categoriser as ReglagesCategoriser), ou).toBeNull();
      else if (f.atelier === "suites") expect(manqueSuites(memoires.suites as ReglagesSuites), ou).toBeNull();
      else expect(memoires, ou).toEqual({ vilainPetitCanard: { niveau: n, feuille: f.id } });
    }
  });

  it("fait trouver l'intrus parmi les animaux qui ne sont pas de l'univers de l'histoire", () => {
    for (const n of NIVEAUX) {
      const intrus = new Set(universEtIntrus(n).find((c) => c.intrus)!.mots.map((m) => m.mot));
      const f = feuillesDeLaSequence(n).find((x) => x.id === "intrus")!;
      for (let g = 1; g <= 10; g++) {
        const { html } = f.fabriquer(IMAGES, hasard(g));
        const trouves = [...html.matchAll(/<li><b>([^<]+)<\/b> — les autres/g)].map((m) => m[1].replace(/&#39;/g, "'"));
        expect(trouves.length, `${n} ${g}`).toBe(n === "MS" ? 5 : 6);
        expect(trouves.every((t) => intrus.has(t)), `${n} ${g} : ${trouves.join(", ")}`).toBe(true);
      }
    }
  });

  it("imprime les ombres en noir et le vilain petit canard en gris, et ses synonymots avec leurs quatre étiquettes", () => {
    const silhouettes = feuillesDeLaSequence("MS").find((f) => f.id === "silhouettes")!.fabriquer(IMAGES, hasard(3)).html;
    expect((silhouettes.match(/vp-ombre/g) ?? []).length).toBe(5);
    const marottes = feuillesDeLaSequence("MS").find((f) => f.id === "marottes")!.fabriquer(IMAGES, hasard(3)).html;
    expect((marottes.match(/vp-gris/g) ?? []).length).toBe(1);
    const queue = feuillesDeLaSequence("GS").find((f) => f.id === "synonymots-queue")!.fabriquer(IMAGES, hasard(3)).html;
    for (const e of ["à la queue leu leu", "les uns derrière les autres", "en file indienne", "en faisant le petit train"]) expect(queue).toContain(e);
    // L'image de la file : la cane, puis ses trois canetons.
    expect((queue.match(new RegExp(`base64,${P.caneton}"`, "g")) ?? []).length).toBe(3);
    expect(queue).toContain(`base64,${P.cane}"`);
  });

  it("se nomme et vise ce que dit le guide, à chaque niveau", () => {
    expect(titreDeLaSequence("MS")).toBe("Le Vilain Petit Canard : les émotions et la naissance (MS)");
    expect(titreDeLaSequence("GS")).toBe("Le Vilain Petit Canard : à la queue leu leu (GS)");
    expect(objectifsDeLaSequence("MS")).toMatch(/émotions.*naissance des poussins/);
    expect(objectifsDeLaSequence("GS")).toMatch(/synonymes de « marcher à la queue leu leu »/);
  });

  it("crée la séquence : douze séances avec leur matériel, et les feuilles dans leurs séances, la compétence en tête", async () => {
    const vise = { competenceTitre: "Organiser les mots en catégorie et en réseau", domaineTitre: "1. Mobiliser le langage dans toutes ses dimensions" } as CompetenceSelectionnee;
    const { sequence, feuilles } = await creerLaSequenceDuVilainPetitCanard("GS", "", [vise], IMAGES);
    expect(sequence.titre).toBe("Le Vilain Petit Canard : à la queue leu leu (GS)");
    expect(sequence.matiere).toBe("1. Mobiliser le langage dans toutes ses dimensions");
    expect(sequence.cycle).toBe("Cycle 1");
    expect(sequence.niveau).toBe("GS");
    expect(enregistres.seances).toHaveLength(12);
    expect(enregistres.seances.every((s) => s.materiel && s.competences.includes("Organiser les mots"))).toBe(true);
    expect(feuilles).toBe(feuillesDeLaSequence("GS").length);
    expect(enregistres.feuilles.every((f) => f.sequenceId === sequence.id && f.extras.competences?.[0] === vise)).toBe(true);
    const dans = (i: number) => enregistres.feuilles.filter((f) => f.seanceId === enregistres.seances[i].id).map((f) => f.titre);
    expect(dans(3)).toEqual([]);
    expect(dans(5)).toEqual(["Synonymots : à la queue leu leu"]);
    expect(dans(7)).toEqual(["Les lieux de l'histoire", "Les silhouettes", "L'intrus"]);
    expect(dans(11)).toEqual(["La grille d'observation"]);
    // « Modifier dans Fabriquer » rouvre l'atelier qui a fait la feuille, avec son tirage.
    const intrus = enregistres.feuilles.find((f) => f.titre === "L'intrus")!;
    expect(intrus.atelier).toBe("categoriser");
    expect(intrus.extras.fabrication.memoires.categoriser.forme).toBe("intrus");
    expect(typeof intrus.extras.fabrication.graine).toBe("number");
  });
});
