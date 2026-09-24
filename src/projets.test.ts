import { describe, it, expect, vi } from "vitest";

vi.mock("./api", () => ({
  newId: () => "id" + Math.random().toString(36).slice(2, 8),
  nowIso: () => "2026-09-24T10:00:00.000Z",
}));

import {
  CATALOGUE, MOIS, avancement, chercherIdees, depuisIdee, ecrireEtapes, etatDeduit,
  ideesDuMois, lireEtapes, moisCourant, nomDuMois, projetVierge, rangerParMois, type Etape, semainesDuMois, anneeDuMois, placer, THEMES
} from "./projets";

const aplatir = (s: string) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

describe("le catalogue", () => {
  it("couvre les dix mois de l'année scolaire", () => {
    for (const m of MOIS) {
      expect(ideesDuMois(m.num).length, `mois ${m.nom}`).toBeGreaterThanOrEqual(3);
    }
  });

  it("chaque idée se tient : un titre, une phrase, des domaines, des étapes", () => {
    for (const i of CATALOGUE) {
      expect(i.titre.length, i.id).toBeGreaterThan(3);
      expect(i.pitch.length, i.id).toBeGreaterThan(30);
      expect(i.domaines.length, i.id).toBeGreaterThanOrEqual(2);
      expect(i.etapes.length, i.id).toBeGreaterThanOrEqual(3);
    }
  });

  it("n'a pas deux fois le même identifiant", () => {
    expect(new Set(CATALOGUE.map((i) => i.id)).size).toBe(CATALOGUE.length);
  });

  it("dit le nom d'un mois, et reste poli sur l'inconnu", () => {
    expect(nomDuMois("09")).toBe("Septembre");
    expect(nomDuMois("")).toBe("Hors année");
  });

  it("sait le mois où l'on est", () => {
    expect(moisCourant(new Date("2026-09-24T10:00:00"))).toBe("09");
    expect(moisCourant(new Date("2027-01-05T10:00:00"))).toBe("01");
  });
});

describe("chercher une idée", () => {
  it("trouve par le domaine, pas seulement par le titre", () => {
    // « monnaie » doit remonter le marché de Noël et la marchande, qui ne
    // portent pas le mot dans leur titre.
    const trouves = chercherIdees("monnaie", aplatir).map((i) => i.id);
    expect(trouves).toContain("p-marche");
    expect(trouves).toContain("p-marchande");
  });

  it("se passe des accents et de la casse", () => {
    expect(chercherIdees("EMOTIONS", aplatir).map((i) => i.id)).toContain("p-emotions");
  });

  it("veut tous les mots", () => {
    expect(chercherIdees("bus horaire", aplatir).map((i) => i.id)).toEqual(["p-transports"]);
    expect(chercherIdees("bus zzz", aplatir)).toEqual([]);
  });

  it("une recherche vide ne rend rien plutôt que tout", () => {
    expect(chercherIdees("   ", aplatir)).toEqual([]);
  });
});

describe("mener un projet", () => {
  it("part d'une idée sans rien perdre", () => {
    const idee = CATALOGUE.find((i) => i.id === "p-soupe")!;
    const p = depuisIdee(idee, "2026-2027");
    expect(p.titre).toBe(idee.titre);
    expect(p.mois).toBe("10");
    expect(p.origine).toBe("p-soupe");
    expect(lireEtapes(p.etapesJson).map((e) => e.texte)).toEqual(idee.etapes);
    expect(lireEtapes(p.etapesJson).every((e) => !e.faite)).toBe(true);
  });

  it("s'écrit aussi de zéro", () => {
    const p = projetVierge("03", "2026-2027");
    expect(p.mois).toBe("03");
    expect(lireEtapes(p.etapesJson)).toEqual([]);
  });

  it("relit des étapes abîmées sans tout perdre", () => {
    expect(lireEtapes("pas du json")).toEqual([]);
    expect(lireEtapes('["une étape"]')).toEqual([{ texte: "une étape", faite: false }]);
    expect(lireEtapes('[{"texte":"a","faite":true},null,{"texte":"  "}]'))
      .toEqual([{ texte: "a", faite: true }]);
  });

  it("fait l'aller-retour", () => {
    const e: Etape[] = [{ texte: "Semer", faite: true }, { texte: "Arroser", faite: false }];
    expect(lireEtapes(ecrireEtapes(e))).toEqual(e);
  });
});

describe("où en est un projet", () => {
  const e = (n: number, faites: number): Etape[] =>
    Array.from({ length: n }, (_, i) => ({ texte: `étape ${i}`, faite: i < faites }));

  it("compte les étapes cochées", () => {
    expect(avancement(e(4, 1))).toEqual({ faites: 1, total: 4, part: 0.25 });
    expect(avancement([])).toEqual({ faites: 0, total: 0, part: 0 });
  });

  it("déduit l'état de ce qu'on coche, sans le demander", () => {
    expect(etatDeduit("idee", e(4, 0))).toBe("idee");
    expect(etatDeduit("idee", e(4, 1))).toBe("encours");
    expect(etatDeduit("idee", e(4, 4))).toBe("fait");
  });

  it("un projet déclaré terminé le reste, même avec une étape en suspens", () => {
    // C'est le seul cas où l'enseignant a dit quelque chose : on ne le
    // contredit pas parce qu'une case n'est pas cochée.
    expect(etatDeduit("fait", e(4, 2))).toBe("fait");
  });

  it("un projet sans étape reste ce qu'on en a dit", () => {
    expect(etatDeduit("encours", [])).toBe("encours");
    expect(etatDeduit("idee", [])).toBe("idee");
  });
});

describe("ranger par mois", () => {
  const p = (mois: string) => ({ ...projetVierge(mois, "2026-2027"), titre: "x" });

  it("rend les dix mois, même vides, dans l'ordre de l'année", () => {
    const rangs = rangerParMois([p("01"), p("09")]);
    expect(rangs.map((r) => r.mois)).toEqual(MOIS.map((m) => m.num));
    expect(rangs[0].projets).toHaveLength(1); // septembre
  });

  it("ajoute un groupe pour ce qui n'a pas de mois — et seulement alors", () => {
    expect(rangerParMois([p("09")]).some((r) => r.mois === "")).toBe(false);
    expect(rangerParMois([p("")]).some((r) => r.mois === "")).toBe(true);
  });
});

describe("les semaines d'un mois", () => {
  it("rend les lundis du mois, dans la bonne année civile", () => {
    // Année scolaire 2026-2027 : septembre est en 2026, janvier en 2027.
    const sept = semainesDuMois("2026-2027", "09");
    expect(sept[0].iso.startsWith("2026-09")).toBe(true);
    expect(semainesDuMois("2026-2027", "01")[0].iso.startsWith("2027-01")).toBe(true);
  });

  it("en donne quatre ou cinq, jamais plus", () => {
    for (const m of MOIS) {
      const s = semainesDuMois("2026-2027", m.num);
      expect(s.length, m.nom).toBeGreaterThanOrEqual(4);
      expect(s.length, m.nom).toBeLessThanOrEqual(5);
    }
  });

  it("chaque semaine se lit « du 7 au 11 »", () => {
    const [premiere] = semainesDuMois("2026-2027", "09");
    expect(premiere.label).toMatch(/^\d+ au \d+$/);
    // Et c'est bien un lundi.
    expect(new Date(`${premiere.iso}T12:00:00`).getDay()).toBe(1);
  });

  it("sait l'année civile d'un mois", () => {
    expect(anneeDuMois("2026-2027", "09")).toBe(2026);
    expect(anneeDuMois("2026-2027", "06")).toBe(2027);
  });
});

describe("poser un projet", () => {
  it("sur un mois : la semaine s'efface", () => {
    const p = { ...projetVierge("09", "2026-2027"), semaine: "2026-09-07" };
    expect(placer(p, "10")).toMatchObject({ mois: "10", semaine: "" });
  });

  it("sur une semaine : le mois suit, les deux ne se contredisent pas", () => {
    const p = projetVierge("09", "2026-2027");
    expect(placer(p, "01", "2027-01-04")).toMatchObject({ mois: "01", semaine: "2027-01-04" });
  });
});

describe("le catalogue élargi", () => {
  it("compte quatre-vingt-dix projets, tous avec un thème connu", () => {
    expect(CATALOGUE.length).toBe(90);
    const connus = new Set(THEMES.map((t) => t.id));
    for (const i of CATALOGUE) expect(connus.has(i.theme), i.id).toBe(true);
  });

  it("chaque thème en porte dix", () => {
    for (const t of THEMES) {
      expect(CATALOGUE.filter((i) => i.theme === t.id).length, t.nom).toBe(10);
    }
  });
});
