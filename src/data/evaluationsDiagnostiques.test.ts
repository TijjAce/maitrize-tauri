import { describe, it, expect } from "vitest";
import { GRILLES, compterRenseignes, compterTotal, type Bloc, type Grille } from "./evaluationsDiagnostiques";

// Ces grilles pilotent un écran générique : une coquille ici ne provoque
// aucune erreur de compilation, mais un item qui en écrase un autre à la
// saisie. D'où ces garde-fous.

describe("catalogue des grilles", () => {
  it("propose les deux grilles attendues", () => {
    expect(GRILLES.map((g) => g.nom)).toEqual(["Observation générale", "Observation S4C"]);
  });

  it("cite sa source pour chaque grille", () => {
    // Les deux reprennent un travail publié : l'origine doit rester visible.
    for (const g of GRILLES) expect(g.source.trim(), g.id).not.toBe("");
  });
});

describe.each(GRILLES.map((g) => [g.id, g] as const))("grille %s", (_id, g: Grille) => {
  it("est nommée et présentée", () => {
    expect(g.nom.trim()).not.toBe("");
    expect(g.sousTitre.trim()).not.toBe("");
    expect(g.blocs.length).toBeGreaterThan(0);
  });

  it("n'utilise jamais deux fois le même identifiant de bloc", () => {
    const ids = g.blocs.map((b) => b.id);
    expect(ids.filter((x, i) => ids.indexOf(x) !== i)).toEqual([]);
  });

  it("ne répète pas un item à l'intérieur d'un bloc", () => {
    // Deux items identiques partageraient la même case : cocher l'un
    // cocherait l'autre.
    for (const b of g.blocs) {
      const l: string[] = b.t === "cases" ? b.items
        : b.t === "echelle" ? b.groupes.flatMap((gr) => gr.items)
        : b.t === "choix" ? b.options
        : b.champs.map((c) => c.id);
      expect(l.filter((x, i) => l.indexOf(x) !== i), `doublon dans ${b.id}`).toEqual([]);
    }
  });

  it("titre et remplit chaque bloc", () => {
    for (const b of g.blocs) {
      expect(b.titre.trim(), `bloc ${b.id} sans titre`).not.toBe("");
      const n = b.t === "cases" ? b.items.length
        : b.t === "echelle" ? b.groupes.reduce((m, gr) => m + gr.items.length, 0)
        : b.t === "choix" ? b.options.length : b.champs.length;
      expect(n, `bloc ${b.id} vide`).toBeGreaterThan(0);
    }
  });

  it("donne des niveaux si elle contient une échelle", () => {
    const aEchelle = g.blocs.some((b) => b.t === "echelle");
    if (aEchelle) expect(g.niveaux?.length ?? 0).toBeGreaterThan(1);
  });
});

describe("grille S4C", () => {
  const g = GRILLES.find((x) => x.id === "besoins")!;

  it("couvre les cinq domaines du socle commun", () => {
    const echelles = g.blocs.filter((b) => b.t === "echelle");
    expect(echelles).toHaveLength(5);
  });

  it("garde les 25 sous-domaines de la grille officielle", () => {
    const sous = g.blocs.flatMap((b) => (b.t === "echelle" ? b.groupes.map((gr) => gr.nom) : []));
    expect(sous).toHaveLength(25);
    for (const attendu of ["Attention", "Fluidité de la lecture", "Respect des règles de vie",
                           "Sensorialité", "Démarche d'investigation"]) {
      expect(sous, `sous-domaine absent : ${attendu}`).toContain(attendu);
    }
  });

  it("reprend les observables du PDF, pas seulement les intitulés de domaines", () => {
    // Ce sont ces phrases-là que l'enseignant coche ; sans elles la grille
    // ne serait qu'un sommaire.
    const items = g.blocs.flatMap((b) => (b.t === "echelle" ? b.groupes.flatMap((gr) => gr.items) : []));
    expect(items.length).toBeGreaterThanOrEqual(100);
    expect(items).toContain("Parle de façon intelligible");
    expect(items).toContain("Mémorise une poésie");
    expect(items).toContain("Écrit lisiblement");
  });

  it("reprend l'échelle de fréquence de la grille officielle", () => {
    expect(g.niveaux).toEqual(["Souvent", "Parfois", "Rarement", "Jamais"]);
  });

  it("renvoie vers l'outil en ligne, qui seul donne les adaptations", () => {
    expect(g.lien).toMatch(/^https:\/\/www\.reseau-canope\.fr\//);
  });
});

describe("comptage de complétion", () => {
  const g = GRILLES.find((x) => x.id === "observation")!;

  it("compte zéro sur une grille vide", () => {
    expect(compterRenseignes(g, {})).toBe(0);
  });

  it("compte les cases cochées", () => {
    expect(compterRenseignes(g, { motricite: { marche: true, court: true } })).toBe(2);
  });

  it("compte un choix pour un seul point", () => {
    expect(compterRenseignes(g, { lateralite: "droitier" })).toBe(1);
  });

  it("ignore un champ laissé vide ou blanc", () => {
    expect(compterRenseignes(g, { synthese: { remarques: "   " } })).toBe(0);
  });

  it("compte les fréquences notées sur la grille S4C", () => {
    const b = GRILLES.find((x) => x.id === "besoins")!;
    expect(compterRenseignes(b, { d2: { "Mémorise une poésie": "Souvent" } })).toBe(1);
  });

  it("annonce un total cohérent avec le contenu", () => {
    expect(compterTotal(g)).toBeGreaterThan(80);
    expect(compterRenseignes(g, {})).toBeLessThanOrEqual(compterTotal(g));
  });
});

// La grille « Observation générale » doit tenir sur une seule feuille A4.
// Le rendu réel a été mesuré : grille entièrement cochée, la colonne la plus
// chargée occupe 227 mm pour 268 mm disponibles sous l'en-tête, soit 52 lignes
// (9 cadres + 43 items). Le plafond ci-dessous garde une marge sur ce relevé.
// Un test ne mesure pas une mise en page ; il empêche seulement d'ajouter des
// observables sans revoir l'impression.
describe("tenue sur une page de la grille d'observation", () => {
  const g = GRILLES.find((x) => x.id === "observation")!;
  const LIGNES_MAX_PAR_COLONNE = 56;

  const lignesParColonne = () => {
    const par: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    for (const b of g.blocs) {
      const col = g.mise?.[b.id]?.col ?? 1;
      const items = b.t === "cases" ? b.items.length
        : b.t === "choix" ? b.options.length
        : b.t === "champs" ? b.champs.length
        : 0;
      par[col] += items + 1; // les items, plus le titre du cadre
    }
    return par;
  };

  it("place chaque rubrique dans une des trois colonnes", () => {
    for (const b of g.blocs) {
      const col = g.mise?.[b.id]?.col;
      expect(col, `rubrique « ${b.titre} » sans colonne`).toBeDefined();
      expect([1, 2, 3]).toContain(col);
    }
  });

  it("garde chaque colonne sous le plafond mesuré", () => {
    for (const [col, lignes] of Object.entries(lignesParColonne())) {
      expect(lignes, `colonne ${col} trop chargée pour une page`)
        .toBeLessThanOrEqual(LIGNES_MAX_PAR_COLONNE);
    }
  });

  it("répartit la charge entre les colonnes", () => {
    // Une colonne deux fois plus longue qu'une autre gâche la page.
    const v = Object.values(lignesParColonne());
    expect(Math.max(...v) - Math.min(...v)).toBeLessThanOrEqual(12);
  });
});

// La grille S4C s'imprime en tableau : une colonne par fréquence, une ligne
// par observable, avec une coupure imposée avant le domaine 3. Le rendu a été
// mesuré, grille entièrement notée : 249 mm puis 234 mm pour 279 mm utiles,
// soit 68 et 58 lignes. Les bornes ci-dessous gardent la marge relevée.
describe("tenue sur deux pages de la grille S4C", () => {
  const g = GRILLES.find((x) => x.id === "besoins")!;
  const LIGNES_MAX_PAR_PAGE = 74;

  const lignes = (b: Bloc) =>
    b.t === "echelle" ? b.groupes.reduce((n, gr) => n + gr.items.length + 1, 0) : 0;

  /** Découpe les blocs comme le fera l'impression, sur `sautAvant`. */
  const pages = () => {
    const out: Bloc[][] = [[]];
    for (const b of g.blocs) {
      if (g.sautAvant?.includes(b.id) && out[out.length - 1].length) out.push([]);
      out[out.length - 1].push(b);
    }
    return out;
  };

  it("garde quatre fréquences, la largeur du tableau en dépend", () => {
    expect(g.niveaux).toEqual(["Souvent", "Parfois", "Rarement", "Jamais"]);
  });

  it("coupe avant un bloc qui existe vraiment", () => {
    for (const id of g.sautAvant ?? []) {
      expect(g.blocs.some((b) => b.id === id), `saut vers un bloc inconnu : ${id}`).toBe(true);
    }
  });

  it("tient en deux pages", () => {
    expect(pages().length).toBe(2);
  });

  it("garde chaque page sous le nombre de lignes mesuré", () => {
    pages().forEach((blocs, i) => {
      const n = blocs.reduce((s, b) => s + lignes(b), 0);
      expect(n, `page ${i + 1} trop chargée`).toBeLessThanOrEqual(LIGNES_MAX_PAR_PAGE);
    });
  });

  it("range chaque observable sous un sous-domaine nommé", () => {
    for (const b of g.blocs) {
      if (b.t !== "echelle") continue;
      for (const gr of b.groupes) {
        expect(gr.nom.trim().length, `sous-domaine sans nom dans « ${b.titre} »`).toBeGreaterThan(0);
        expect(gr.items.length, `sous-domaine « ${gr.nom} » vide`).toBeGreaterThan(0);
      }
    }
  });
});
