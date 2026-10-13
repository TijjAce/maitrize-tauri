import { describe, it, expect, vi, beforeEach } from "vitest";

const enregistres = { sequences: [] as any[], seances: [] as any[], feuilles: [] as any[] };
let compteur = 0;
// L'inventaire du matériel de la classe : les jetons et les cubes sont rangés.
const INVENTAIRE = JSON.stringify({ numeration: { a: true, lieu: "le bac des jetons" } });
vi.mock("./api", () => ({
  api: {
    sequenceSave: async (s: unknown) => { enregistres.sequences.push(s); },
    seanceSave: async (s: unknown) => { enregistres.seances.push(s); },
    settingGet: async (cle: string) => (cle === "fabriquer:materiel-classe" ? INVENTAIRE : null),
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
  FAMILLES_DE_L_HISTOIRE, IDS_VPC, LIEUX, PERSONNAGES, P, PETITS_PAR_FAMILLE, decomposition, feuillesDeLaSequence, materielDesSeances, universEtIntrus,
  type NiveauVpc,
} from "./vilainPetitCanard";
import { DECORATIONS, nomDeLaDecoration } from "./canardsDessines";
import type { CompetenceSelectionnee } from "./components/CompetenceTree";

const NIVEAUX: NiveauVpc[] = ["MS", "GS"];
const IMAGES = Object.fromEntries(IDS_VPC.map((id) => [id, `data:image/png;base64,${id}`]));
const ids = (n: NiveauVpc) => feuillesDeLaSequence(n).map((f) => f.id);

describe("la séquence du Vilain Petit Canard, d'après le guide du vocabulaire en maternelle", () => {
  beforeEach(() => { enregistres.sequences = []; enregistres.seances = []; enregistres.feuilles = []; });

  it("suit la démarche du guide, puis le prolongement de la classe : treize séances, et chaque feuille dans l'une d'elles", () => {
    for (const n of NIVEAUX) {
      const d = demarcheDe(DEMARCHE_VPC[n])!;
      expect(d.famille, n).toBe("Maternelle");
      expect(d.source, n).toMatch(/Pour enseigner le vocabulaire à l'école maternelle.*p\. 71-76/);
      expect(d.source, n).toMatch(/prolongement : les exercices de la classe/);
      expect(d.seances, n).toHaveLength(13);
      expect(d.seances[11].titre, n).toMatch(/^Prolongement — En ateliers/);
      expect(d.seances[12].titre, n).toMatch(/^Évaluation/);
      expect(d.seances.every((s) => s.objectifs.startsWith(DEBUT_OBJECTIF_SEANCE)), n).toBe(true);
      expect(materielDesSeances(n), n).toHaveLength(13);
      expect(materielDesSeances(n)[11], n).toMatch(/jetons ou des cubes jaunes et gris/);
      for (const f of feuillesDeLaSequence(n)) expect(f.seance, `${n} ${f.id}`).toBeLessThan(13);
      expect(feuillesDeLaSequence(n).filter((f) => f.seance === 11).map((f) => [f.id, f.competence]), n)
        .toEqual([["familles-canards", "maths"], ["decorer", "graphisme"]]);
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

  it("fait colorier les familles de canards de toutes les façons : chaque décomposition, une fois", () => {
    expect(decomposition(3, 2)).toBe("3 jaunes et 2 gris");
    expect(decomposition(0, 4)).toBe("0 jaune et 4 gris");
    expect(decomposition(1, 1)).toBe("1 jaune et 1 gris");
    for (const n of NIVEAUX) {
      const petits = PETITS_PAR_FAMILLE[n];
      const html = feuillesDeLaSequence(n).find((f) => f.id === "familles-canards")!.fabriquer(IMAGES, hasard(1)).html;
      const [eleve, corrige] = html.split('class="page corrige"');
      // Autant de familles que de décompositions ; chaque cane a ses petits, tous à colorier.
      expect((eleve.match(/class="vp-famille"/g) ?? []).length, n).toBe(petits + 1);
      expect((eleve.match(/class="cd-cane"/g) ?? []).length, n).toBe(petits + 1);
      // La légende montre un caneton de chaque sorte, en couleur et avec son nom.
      expect((eleve.match(/class="cd-caneton"/g) ?? []).length, n).toBe((petits + 1) * petits + 2);
      expect(eleve, n).toContain("<b>jaune</b> : un caneton");
      expect(eleve, n).toContain("<b>gris</b> : un vilain petit canard");
      // En GS, on écrit combien il y a de chaque sorte.
      expect((eleve.match(/class="vp-nb"/g) ?? []).length, n).toBe(n === "GS" ? 2 * (petits + 1) : 0);
      // Le corrigé : chaque décomposition, de « tout jaune » à « tout gris ».
      for (let gris = 0; gris <= petits; gris++) expect(corrige, `${n} ${gris}`).toContain(`${decomposition(petits - gris, gris)}<br>${petits} = ${petits - gris} + ${gris}`);
    }
  });

  it("fait continuer la décoration des canards : un motif commencé par bande, et en GS le dernier canard libre", () => {
    for (const n of NIVEAUX) {
      const html = feuillesDeLaSequence(n).find((f) => f.id === "decorer")!.fabriquer(IMAGES, hasard(1)).html;
      expect((html.match(/class="cd-a-decorer"/g) ?? []).length, n).toBe(6);
      // Chaque canard a son propre gabarit : le motif ne déborde pas sur le voisin.
      const gabarits = [...html.matchAll(/<clipPath id="([^"]+)"/g)].map((m) => m[1]);
      expect(new Set(gabarits).size, n).toBe(6);
      for (const motifs of DECORATIONS[n]) expect(html, n).toContain(nomDeLaDecoration(motifs).replace(/'/g, "&#39;"));
    }
    expect(nomDeLaDecoration(["vagues", "vagues"])).toBe("des vagues");
    expect(nomDeLaDecoration(["boucles", "points", "boucles"])).toBe("des boucles et des points");
    expect(nomDeLaDecoration([null, null, null])).toBe("ma décoration, que j'invente");
  });

  it("se nomme et vise ce que dit le guide, à chaque niveau", () => {
    expect(titreDeLaSequence("MS")).toBe("Le Vilain Petit Canard : les émotions et la naissance (MS)");
    expect(titreDeLaSequence("GS")).toBe("Le Vilain Petit Canard : à la queue leu leu (GS)");
    expect(objectifsDeLaSequence("MS")).toMatch(/émotions.*naissance des poussins/);
    expect(objectifsDeLaSequence("GS")).toMatch(/synonymes de « marcher à la queue leu leu »/);
  });

  it("crée la séquence : treize séances avec leur matériel, et les feuilles dans leurs séances, leur compétence en tête", async () => {
    const vise = { competenceTitre: "Organiser les mots en catégorie et en réseau", domaineTitre: "1. Mobiliser le langage dans toutes ses dimensions" } as CompetenceSelectionnee;
    const maths = { competenceTitre: "Composer ou décomposer des nombres inférieurs ou égaux à dix voir au delà", domaineTitre: "4. Acquérir les premiers outils mathématiques" } as CompetenceSelectionnee;
    const graphisme = { competenceTitre: "Réaliser une composition à partir de plusieurs contraintes.", domaineTitre: "3. Agir, s'exprimer, comprendre à travers des activités artistiques" } as CompetenceSelectionnee;
    const { sequence, feuilles } = await creerLaSequenceDuVilainPetitCanard("GS", "", [vise], IMAGES, { maths, graphisme });
    expect(sequence.titre).toBe("Le Vilain Petit Canard : à la queue leu leu (GS)");
    expect(sequence.matiere).toBe("1. Mobiliser le langage dans toutes ses dimensions");
    expect(sequence.cycle).toBe("Cycle 1");
    expect(sequence.niveau).toBe("GS");
    expect(enregistres.seances).toHaveLength(13);
    expect(enregistres.seances.every((s) => s.materiel)).toBe(true);
    expect(enregistres.seances.filter((_, i) => i !== 11).every((s) => s.competences.includes("Organiser les mots"))).toBe(true);
    // La séance des ateliers vise leurs compétences, et rappelle le matériel de la classe — où il est rangé.
    expect(JSON.parse(enregistres.seances[11].competences)).toEqual([maths, graphisme]);
    expect(enregistres.seances[11].materiel).toMatch(/Matériel de la classe à sortir : des cubes emboîtables.*des jetons.*\(le bac des jetons\)/);
    expect(enregistres.seances[0].materiel).not.toMatch(/Matériel de la classe/);
    expect(feuilles).toBe(feuillesDeLaSequence("GS").length);
    expect(enregistres.feuilles.every((f) => f.sequenceId === sequence.id)).toBe(true);
    const enTete = (titre: string) => enregistres.feuilles.find((f) => f.titre === titre)!.extras.competences?.[0];
    expect(enTete("L'intrus")).toBe(vise);
    expect(enTete("Les familles de canards")).toBe(maths);
    expect(enTete("Décorer les canards")).toBe(graphisme);
    const dans = (i: number) => enregistres.feuilles.filter((f) => f.seanceId === enregistres.seances[i].id).map((f) => f.titre);
    expect(dans(3)).toEqual([]);
    expect(dans(5)).toEqual(["Synonymots : à la queue leu leu"]);
    expect(dans(7)).toEqual(["Les lieux de l'histoire", "Les silhouettes", "L'intrus"]);
    expect(dans(11)).toEqual(["Les familles de canards", "Décorer les canards"]);
    expect(dans(12)).toEqual(["La grille d'observation"]);
    // « Modifier dans Fabriquer » rouvre l'atelier qui a fait la feuille, avec son tirage.
    const intrus = enregistres.feuilles.find((f) => f.titre === "L'intrus")!;
    expect(intrus.atelier).toBe("categoriser");
    expect(intrus.extras.fabrication.memoires.categoriser.forme).toBe("intrus");
    expect(typeof intrus.extras.fabrication.graine).toBe("number");
  });

  it("sans compétence pour les ateliers, garde celle de la séquence sur leurs feuilles et dans leur séance", async () => {
    const vise = { competenceTitre: "Organiser les mots en catégorie et en réseau", domaineTitre: "1. Mobiliser le langage dans toutes ses dimensions" } as CompetenceSelectionnee;
    await creerLaSequenceDuVilainPetitCanard("MS", "", [vise], IMAGES);
    expect(enregistres.seances[11].competences).toContain("Organiser les mots");
    expect(enregistres.feuilles.every((f) => f.extras.competences?.[0] === vise)).toBe(true);
  });
});
