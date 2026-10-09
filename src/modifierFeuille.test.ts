import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MaterielItem } from "./api";

// Les tests tournent sans navigateur : un localStorage et un sessionStorage de poche.
const stockage = () => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, String(v)); },
    removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear(),
  };
};
(globalThis as any).localStorage = stockage();
(globalThis as any).sessionStorage = stockage();
(globalThis as any).window = { dispatchEvent: () => true };

const enregistres: MaterielItem[] = [];
const pdfs: string[] = [];
let base: MaterielItem[] = [];

vi.mock("./api", () => ({
  api: {
    settingGet: async () => null,
    feuilleEnPdf: async (html: string) => { pdfs.push(html); return `neuf-${pdfs.length}.pdf`; },
    materielSave: async (m: MaterielItem) => { enregistres.push(m); return m; },
    materielList: async () => base,
    arasaacImage: async () => { throw new Error("pas d'image"); },
  },
  newId: () => "id-neuf",
  nowIso: () => "2026-10-09T08:00:00.000Z",
}));

const {
  ecrireFabrication, fabricationDuMoment, graineDeDepart, lireFabrication, memoiresDe, modificationEnCours, modifierDansFabriquer,
  noterGraine, noterMemoire, ouEstLaFeuille,
} = await import("./modifierFeuille");
const { enregistrerSurLeBureau, ficheDeLEleve, poserDansUneSeance } = await import("./impressionAtelier");

const materiel = (p: Partial<MaterielItem> = {}): MaterielItem => ({
  id: "m1", titre: "Les cartes des trois jeux", descriptionMateriel: "", competenceId: "", competenceTitre: "", domaineTitre: "",
  sousDomaineTitre: "", cycle: "", imagesJson: "[]", pdfsJson: "[\"ancien.pdf\"]", dateCreation: "2026-10-01", seanceId: "s3",
  sequenceId: "q1", dossier: "", videosJson: "[]", coffreJson: "[]", ...p,
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  modificationEnCours.finir();
  enregistres.length = 0;
  pdfs.length = 0;
  base = [];
});

describe("ce qu'une feuille retient de son atelier", () => {
  it("se relit, et ce qui n'en est pas une n'en a pas", () => {
    const f = lireFabrication(ecrireFabrication({ atelier: "comparer", memoires: { comparer: { niveau: "cp-59" } }, graine: 12 }));
    expect(f).toEqual({ atelier: "comparer", memoires: { comparer: { niveau: "cp-59" } }, graine: 12, competences: undefined, eleve: undefined });
    expect(lireFabrication("")).toBeNull();
    expect(lireFabrication(undefined)).toBeNull();
    expect(lireFabrication("{pas du json")).toBeNull();
    // Un atelier qui n'existe pas — renommé, ou d'une version plus récente — ne se rouvre pas.
    expect(lireFabrication(JSON.stringify({ atelier: "inconnu" }))).toBeNull();
    expect(lireFabrication(JSON.stringify({ atelier: "cubes", eleve: { prenom: "Inès", date: "jeudi 9 octobre" } }))?.eleve)
      .toEqual({ prenom: "Inès", date: "jeudi 9 octobre" });
  });

  it("ce que l'atelier garde, clé par clé, et son tirage du moment", () => {
    noterMemoire("heure", "heure");
    noterMemoire("heure", "heure:affichage");
    localStorage.setItem("fabriquer:heure", JSON.stringify({ exercice: "durees" }));
    localStorage.setItem("fabriquer:heure:affichage", JSON.stringify("grand"));
    noterGraine("heure", 77);
    expect(memoiresDe("heure")).toEqual({ heure: { exercice: "durees" }, "heure:affichage": "grand" });
    expect(fabricationDuMoment("heure")).toEqual({ atelier: "heure", memoires: memoiresDe("heure"), graine: 77 });
    // Un atelier qui ne garde rien n'a rien à rendre.
    expect(memoiresDe("trous")).toBeUndefined();
  });

  it("dit où la feuille est rangée", () => {
    expect(ouEstLaFeuille(materiel(), { atelier: "comparer" })).toBe("dans sa séance");
    expect(ouEstLaFeuille(materiel({ seanceId: null, dossier: "Maths" }), { atelier: "comparer" })).toBe("sur le bureau, dans « Maths »");
    expect(ouEstLaFeuille(materiel({ seanceId: null }), { atelier: "cubes", eleve: { prenom: "Inès", date: "jeudi 9 octobre" } }))
      .toBe("la fiche de Inès, jeudi 9 octobre");
  });
});

describe("Modifier dans Fabriquer", () => {
  it("rouvre l'atelier réglé comme la feuille, avec son tirage", () => {
    const aller = vi.fn();
    localStorage.setItem("fabriquer:comparer", JSON.stringify({ niveau: "ce2" }));
    modifierDansFabriquer(materiel(), { atelier: "comparer", memoires: { comparer: { niveau: "cp-59", regle: true } }, graine: 42 }, aller);
    expect(JSON.parse(localStorage.getItem("fabriquer:comparer")!)).toEqual({ niveau: "cp-59", regle: true });
    expect(localStorage.getItem("fabriquer:onglet")).toBe("comparer");
    expect(aller).toHaveBeenCalledWith("/jeux");
    expect(modificationEnCours.lire()).toMatchObject({ materielId: "m1", atelier: "comparer", ou: "dans sa séance", refaite: true, graine: 42 });
    // Le tirage repris ne vaut que pour l'atelier de la feuille.
    expect(graineDeDepart("comparer")).toBe(42);
    expect(graineDeDepart("cubes")).not.toBe(42);
  });

  it("sans réglages, l'atelier garde les siens et le dit", () => {
    modifierDansFabriquer(materiel(), { atelier: "comparer" }, () => {});
    expect(modificationEnCours.lire()?.refaite).toBe(false);
  });
});

describe("la feuille refaite prend la place de l'ancienne", () => {
  it("même matériel, même nom, même séance ; un nouveau PDF et de quoi la refaire encore", async () => {
    base = [materiel({ fabricationJson: ecrireFabrication({ atelier: "comparer", graine: 1 }) })];
    modifierDansFabriquer(base[0], lireFabrication(base[0].fabricationJson)!, () => {});
    noterGraine("comparer", 5);
    const m = await enregistrerSurLeBureau("comparer", "Comparer les nombres", "<div class=\"feuille\">cartes</div>", ".feuille{}");
    expect(enregistres).toHaveLength(1);
    expect(m).toMatchObject({ id: "m1", titre: "Les cartes des trois jeux", seanceId: "s3", sequenceId: "q1", pdfsJson: "[\"neuf-1.pdf\"]" });
    expect(lireFabrication(m.fabricationJson)).toMatchObject({ atelier: "comparer", graine: 5 });
    // Le document garde le nom de la feuille remplacée, pas celui de l'atelier.
    expect(pdfs[0]).toContain("<title>Les cartes des trois jeux</title>");
    expect(modificationEnCours.lire()).toBeNull();
  });

  it("une fiche d'élève refaite reste à son nom, sans corrigé", async () => {
    const eleve = { prenom: "Inès", date: "jeudi 9 octobre" };
    base = [materiel({ seanceId: null, sequenceId: null, dossier: "Fiches d'autonomie/2026-10-09", titre: "Pyramides — Inès, 9 oct.",
      fabricationJson: ecrireFabrication({ atelier: "pyramides", eleve }) })];
    modifierDansFabriquer(base[0], lireFabrication(base[0].fabricationJson)!, () => {});
    const m = await enregistrerSurLeBureau("pyramides", "Pyramides", "<div class=\"feuille\"><div>Prénom : ........ Date : ........</div><div class=\"corrige\">12</div></div>");
    expect(m).toMatchObject({ id: "m1", dossier: "Fiches d'autonomie/2026-10-09" });
    expect(pdfs[0]).toContain("Prénom : Inès Date : jeudi 9 octobre");
    expect(pdfs[0]).not.toContain("class=\"corrige\"");
    expect(lireFabrication(m.fabricationJson)?.eleve).toEqual(eleve);
  });

  it("une autre feuille, d'un autre atelier, s'enregistre à côté, comme d'habitude", async () => {
    base = [materiel()];
    modifierDansFabriquer(base[0], { atelier: "comparer" }, () => {});
    const m = await enregistrerSurLeBureau("cubes", "Les nombres en cubes", "<div class=\"feuille\">…</div>");
    expect(m.id).toBe("id-neuf");
    expect(lireFabrication(m.fabricationJson)?.atelier).toBe("cubes");
    // La modification attend toujours sa feuille.
    expect(modificationEnCours.lire()?.atelier).toBe("comparer");
  });

  it("supprimée entre-temps, la feuille ne revient pas : la nouvelle va sur le bureau", async () => {
    base = [];
    modifierDansFabriquer(materiel(), { atelier: "comparer" }, () => {});
    const m = await enregistrerSurLeBureau("comparer", "Comparer les nombres", "<div class=\"feuille\">…</div>");
    expect(m).toMatchObject({ id: "id-neuf", titre: "Comparer les nombres", seanceId: null });
    expect(modificationEnCours.lire()).toBeNull();
  });
});

describe("à la fabrication, la feuille note d'où elle vient", () => {
  it("dans une séance, avec ce que la séquence sait d'elle", async () => {
    const m = await poserDansUneSeance("comparer", "Les cartes des trois jeux", "<div class=\"feuille\">…</div>", "", "s3", "q1",
      { fabrication: { memoires: { comparer: { niveau: "cp-59" } }, graine: 9 } });
    expect(lireFabrication(m.fabricationJson)).toMatchObject({ atelier: "comparer", memoires: { comparer: { niveau: "cp-59" } }, graine: 9 });
  });

  it("pour un élève, avec son prénom et la date", async () => {
    const m = await ficheDeLEleve("pyramides", "Pyramides — Inès, 9 oct.", "<div class=\"feuille\">…</div>", "",
      { prenom: "Inès", date: "jeudi 9 octobre", dossier: "Fiches d'autonomie/2026-10-09" }, { graine: 3 });
    expect(lireFabrication(m.fabricationJson)).toMatchObject({ atelier: "pyramides", graine: 3, eleve: { prenom: "Inès", date: "jeudi 9 octobre" } });
  });
});
