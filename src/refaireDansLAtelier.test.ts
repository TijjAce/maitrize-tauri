import { describe, it, expect } from "vitest";
import { REGLAGES_PLAN_CLASSE, htmlPlanClasse, reglagesPlanSurs } from "./planDeLaClasse";
import { REGLAGES_FRISE, htmlFrise, reglagesFriseSurs } from "./frisesTemps";
import { REGLAGES_PAYSAGE, htmlPaysage, reglagesPaysageSurs } from "./lireUnPaysage";

// Ce qu'une feuille dit pouvoir refaire dans son atelier (`refaire`), l'atelier doit le refaire tel quel : les mêmes
// réglages, relus comme l'atelier les relit, et le même tirage donnent la même feuille. Les « ateliers » ci-dessous
// reprennent, onglet par onglet, le calcul de l'aperçu de Fabriquer (pages/Ateliers*.tsx) : un écart entre une
// séquence et son atelier fait échouer ce test.

// Les tests tournent sans navigateur : un localStorage de poche, vide — les réglages laissés sont ceux par défaut.
(globalThis as any).localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const { DEMARCHES } = await import("./demarches");
const { feuilleRattachee, planDesFeuilles } = await import("./feuillesDesSequences");
const { RECETTES } = await import("./fichesAutonomie");
const { REGLAGES_COMPARER, htmlComparer, paquet, reglagesComparerSurs } = await import("./comparerNombres");
const { REGLAGES_CUBES, exercicesCubes, htmlCubes, reglagesCubesSurs } = await import("./cubesNumeration");
const J = await import("./jeuxMaths");
const { REGLAGES_MARTINIERE, calculsMartiniere, htmlMartiniere } = await import("./martiniere");
const { REGLAGES_POSEES, htmlOperationsPosees } = await import("./operationsPosees");
const { REGLAGES_PYRAMIDES, htmlPyramides } = await import("./pyramides");
const { REGLAGES_HEURE, htmlAtelierHeure } = await import("./heure");
const { REGLAGES_MONNAIE, htmlMonnaie } = await import("./monnaie");
const { EXERCICES_MESURES, REGLAGES_MESURES, htmlMesures } = await import("./mesures");
const { REGLAGES_DONNEES, htmlDonnees } = await import("./donnees");
const { REGLAGES_GEOMETRIE, htmlGeometrie } = await import("./geometrie");
const { REGLAGES_SOLIDES, htmlSolides } = await import("./solides");
const { REGLAGES_DEPLACEMENTS, htmlDeplacements } = await import("./deplacements");
const { REGLAGES_FLUENCE, REGLAGES_SYLLABAIRE, grilleFluence, htmlFluence, htmlSyllabaire } = await import("./fluence");
const { REGLAGES_CURSIVE, htmlEcritureCursive } = await import("./ecritureCursive");
const { REGLAGES_VOIX_HAUTE, htmlVoixHaute } = await import("./lectureVoixHaute");
const { REGLAGES_COMPREHENSION, htmlComprehension } = await import("./comprehension");
const { REGLAGES_LECTEUR, htmlLecteur } = await import("./carnetDeLecteur");
const { REGLAGES_ORTHOGRAPHE, htmlOrthographe } = await import("./orthographe");
const { REGLAGES_ECRIRE, htmlEcrire } = await import("./ecrire");
const { REGLAGES_GRAMMAIRE, htmlGrammaire } = await import("./grammaire");
const { REGLAGES_ORAL, htmlOral } = await import("./oral");
const { REGLAGES_TRI, htmlTri } = await import("./triEtiquettes");
const { REGLAGES_PHRASES, htmlPhrasesEnDesordre, phrasesEnDesordre, phrasesSaisies } = await import("./phrasesEnDesordre");
const { REGLAGES_TROUS, htmlTexteATrous, reglagesTrousSurs } = await import("./texteATrous");
const { REGLAGES_MOTS_MELES, grilleMotsMeles, htmlMotsMeles, motsSaisis } = await import("./motsMeles");
const { feuilleProblemes, genererMultiplicatifs, genererPartieTout, lirePrenoms, normaliserPresentation } = await import("./problemesBarres");
const { REGLAGES_CATEGORISER, htmlCategoriser, normaliserCategories } = await import("./categoriser");
const { REGLAGES_SUITES, htmlSuites, reglagesSurs: suitesSures } = await import("./suitesImages");
const { REGLAGES_PAR_DEFAUT: REGLAGES_COLORIAGE, fabriquerColoriage, feuilleDuColoriage } = await import("./coloriageMagique");
const { hasard } = await import("./hasard");

type Memoires = Record<string, any>;
/** Ce que fait `useReglages` : les réglages par défaut, complétés de ce qu'on a gardé. */
const lu = <T extends object>(defaut: T, brut: unknown): T => ({ ...defaut, ...(brut && typeof brut === "object" ? brut : {}) });

/** L'aperçu de chaque atelier, à partir de ce qu'il garde et de son tirage. */
const ATELIERS: Record<string, (m: Memoires, g: number) => string> = {
  comparer: (m, g) => { const r = reglagesComparerSurs(lu(REGLAGES_COMPARER, m.comparer)); return htmlComparer(paquet(r, g), r); },
  cubes: (m, g) => { const r = reglagesCubesSurs(lu(REGLAGES_CUBES, m.cubes)); return htmlCubes(exercicesCubes(r, g), r, g); },
  nombres: (m) => { const r = lu(J.REGLAGES_NOMBRES, m.cartesNombres); return J.htmlCartesNombres(J.cartesNombres(r), r); },
  oie: (m, g) => J.htmlJeuDeLOie(lu(J.REGLAGES_OIE, m.jeuDeLOie), g),
  martiniere: (m, g) => { const r = lu(REGLAGES_MARTINIERE, m.martiniere); return htmlMartiniere(calculsMartiniere(r, g), r); },
  calcul: (m, g) => { const r = lu(J.REGLAGES_CALCUL, m.cartesCalcul); return J.htmlCartesCalcul(J.cartesCalcul(r, g), r); },
  fractions: (m, g) => J.htmlFractions(lu(J.REGLAGES_FRACTIONS, m.fractions), g),
  posees: (m, g) => htmlOperationsPosees(lu(REGLAGES_POSEES, m.operationsPosees), g),
  pyramides: (m, g) => htmlPyramides(lu(REGLAGES_PYRAMIDES, m.pyramides), g),
  heure: (m, g) => htmlAtelierHeure(lu(REGLAGES_HEURE, m.heure), g),
  monnaie: (m, g) => htmlMonnaie(lu(REGLAGES_MONNAIE, m.monnaie), g),
  mesures: (m, g) => {
    const r = lu(REGLAGES_MESURES, m.mesures);
    const exercices = EXERCICES_MESURES.filter((e) => e.grandeurs.includes(r.grandeur));
    return htmlMesures({ ...r, exercice: exercices.some((e) => e.id === r.exercice) ? r.exercice : exercices[0].id }, g);
  },
  donnees: (m, g) => htmlDonnees(lu(REGLAGES_DONNEES, m.donnees), g),
  geometrie: (m, g) => htmlGeometrie(lu(REGLAGES_GEOMETRIE, m.geometrie), g),
  solides: (m, g) => htmlSolides(lu(REGLAGES_SOLIDES, m.solides), g),
  deplacements: (m, g) => htmlDeplacements(lu(REGLAGES_DEPLACEMENTS, m.deplacements), g),
  fluence: (m, g) => { const r = lu(REGLAGES_FLUENCE, m.fluence); return htmlFluence(grilleFluence(r, g), r); },
  syllabaire: (m) => htmlSyllabaire(lu(REGLAGES_SYLLABAIRE, m.syllabaire)),
  cursive: (m) => htmlEcritureCursive(lu(REGLAGES_CURSIVE, m.cursive)),
  voixHaute: (m, g) => htmlVoixHaute(lu(REGLAGES_VOIX_HAUTE, m.voixHaute), g),
  comprehension: (m, g) => htmlComprehension(lu(REGLAGES_COMPREHENSION, m.comprehension), g),
  lecteur: (m, g) => htmlLecteur(lu(REGLAGES_LECTEUR, m.lecteur), g),
  orthographe: (m, g) => htmlOrthographe(lu(REGLAGES_ORTHOGRAPHE, m.orthographe), g),
  ecrire: (m, g) => htmlEcrire(lu(REGLAGES_ECRIRE, m.ecrire), g),
  grammaire: (m, g) => htmlGrammaire(lu(REGLAGES_GRAMMAIRE, m.grammaire), g),
  oral: (m, g) => htmlOral(lu(REGLAGES_ORAL, m.oral), g),
  tri: (m, g) => htmlTri(lu(REGLAGES_TRI, m.tri), g),
  phrases: (m, g) => { const r = lu(REGLAGES_PHRASES, m.phrases); return htmlPhrasesEnDesordre(phrasesEnDesordre(phrasesSaisies(r.phrases), g), r); },
  trous: (m, g) => htmlTexteATrous(reglagesTrousSurs(lu(REGLAGES_TROUS, m.trous)), g),
  motsMeles: (m, g) => {
    const r = lu(REGLAGES_MOTS_MELES, m.motsMeles);
    const mots = motsSaisis(r.mots);
    return htmlMotsMeles(Array.from({ length: Math.max(1, Math.min(4, r.grilles)) }, (_, i) => grilleMotsMeles(mots, r, g + i)), r);
  },
  partieTout: (m, g) => {
    const r = lu({ titre: "Problèmes partie-tout", nombre: 6, prenoms: "", parties: 2, inconnue: "melange", max: 20, perso: false, toutMin: 5, toutMax: 10, partieMin: 1 }, m.partieTout);
    const p = normaliserPresentation(m["presentation:partieTout"]);
    const problemes = genererPartieTout({
      nombre: r.nombre, parties: r.parties, inconnue: r.inconnue as any, enonces: p.enonce, prenoms: lirePrenoms(r.prenoms),
      ...(r.perso ? { max: r.toutMax, min: r.toutMin, partMin: r.partieMin } : { max: r.max }),
    }, g, {});
    return feuilleProblemes(problemes, r.titre, p);
  },
  multiplicatifs: (m, g) => {
    const r = lu({ titre: "Problèmes multiplicatifs", nombre: 6, prenoms: "", types: ["tout", "part", "nombre"], table: 10, perso: false, partsMin: 2, partsMax: 5, valeurMin: 1, valeurMax: 5 }, m.multiplicatifs);
    const p = normaliserPresentation(m["presentation:multiplicatifs"]);
    const problemes = genererMultiplicatifs({
      nombre: r.nombre, types: r.types as any, table: r.table, enonces: p.enonce, prenoms: lirePrenoms(r.prenoms),
      ...(r.perso ? { parts: [r.partsMin, r.partsMax] as [number, number], valeurs: [r.valeurMin, r.valeurMax] as [number, number] } : {}),
    }, g, {});
    return feuilleProblemes(problemes, r.titre, p);
  },
  categoriser: (m, g) => {
    const brut = lu(REGLAGES_CATEGORISER, m.categoriser);
    return htmlCategoriser({ ...brut, categories: normaliserCategories(brut.categories) }, {}, hasard(g));
  },
  suites: (m, g) => htmlSuites(suitesSures(lu(REGLAGES_SUITES, m.suites)), {}, hasard(g)),
  coloriage: (m, g) => { const r = lu(REGLAGES_COLORIAGE, m.coloriage); return feuilleDuColoriage(fabriquerColoriage(r, g, []), r, false).corps; },
  planClasse: (m, g) => htmlPlanClasse(reglagesPlanSurs(lu(REGLAGES_PLAN_CLASSE, m.planClasse)), g),
  frise: (m) => htmlFrise(reglagesFriseSurs(lu(REGLAGES_FRISE, m.frise))),
  paysage: (m) => htmlPaysage(reglagesPaysageSurs(lu(REGLAGES_PAYSAGE, m.paysage))),
};

const GRAINES = [3, 1789];

describe("une feuille de séquence se refait dans son atelier", () => {
  // Des centaines de feuilles refaites : plusieurs secondes, davantage sur les machines de GitHub.
  it("telle quelle, pour toutes celles qui le disent", () => {
    let verifiees = 0;
    const ateliers = new Set<string>();
    for (const d of DEMARCHES) {
      for (const classe of ["CP", "CE1", "CE2"] as const) {
        for (const periode of [2, 4]) {
          const plan = planDesFeuilles(d.id, { classe, periode, competence: "" });
          for (const f of plan?.feuilles ?? []) {
            for (const g of GRAINES) {
              const sortie = f.fabriquer(g);
              if (!sortie.refaire) continue;
              const atelier = ATELIERS[f.atelier];
              expect(atelier, `${d.id} · ${f.titre} : l'atelier « ${f.atelier} » n'a pas d'aperçu dans ce test`).toBeDefined();
              expect(atelier(sortie.refaire, sortie.graine ?? g), `${d.id} (${classe}, P${periode}) · ${f.titre}`).toBe(sortie.html);
              verifiees++;
              ateliers.add(f.atelier);
            }
          }
        }
      }
    }
    // Presque toutes les feuilles des séquences se refont : on en vérifie des centaines, dans une vingtaine d'ateliers.
    expect(verifiees).toBeGreaterThan(500);
    expect(ateliers.size).toBeGreaterThan(20);
  }, 60_000);

  it("les jeux rattachés à la compétence aussi, à la classe de la séquence", () => {
    for (const atelier of ["cubes", "comparer", "nombres", "oie"]) {
      for (const ctx of [null, { classe: "CP" as const, periode: 1 }, { classe: "CE2" as const, periode: 4 }]) {
        const f = feuilleRattachee(atelier, 0, ctx)!;
        const sortie = f.fabriquer(42);
        expect(ATELIERS[atelier](sortie.refaire!, 42), `${atelier} · ${JSON.stringify(ctx)}`).toBe(sortie.html);
      }
    }
  });
});

describe("une fiche « En retard » se refait dans son atelier", () => {
  const outils = {
    image: async () => null,
    // Chaque mot a son picto : les catégories de la maternelle se forment toutes.
    pictos: async (mots: string[]) => Object.fromEntries(mots.map((m, i) => [m.toLowerCase(), 1000 + i])),
  };
  it("telle quelle, pour toutes celles qui le disent", async () => {
    let verifiees = 0;
    for (const r of RECETTES) {
      for (const niveau of r.niveaux) {
        for (const periode of [1, 3, 5]) {
          for (const g of GRAINES) {
            const fiche = await r.fabriquer({ niveau, periode, prenom: "Inès" }, g, outils);
            if (!fiche.refaire) continue;
            expect(ATELIERS[r.atelier](fiche.refaire, g), `${r.id} (${niveau}, P${periode})`).toBe(fiche.html);
            verifiees++;
          }
        }
      }
    }
    expect(verifiees).toBeGreaterThan(100);
  }, 60_000);
});
