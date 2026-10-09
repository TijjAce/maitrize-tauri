import { describe, it, expect } from "vitest";
import { aMontrer, debutDeLEte, derniereFinDAnnee, elevesDeLAnneeFinie, lendemain } from "./finDAnnee";
import type { Eleve } from "./api";
import type { Periode } from "./vacances";

const vacances: Periode[] = [
  { description: "Vacances d'Été", debut: "2026-07-04T00:00:00", fin: "2026-09-01T00:00:00" },
  { description: "Vacances de la Toussaint", debut: "2026-10-17T00:00:00", fin: "2026-11-02T00:00:00" },
  { description: "Vacances d'Été", debut: "2027-07-03T00:00:00", fin: "2027-09-01T00:00:00" },
];
const eleve = (id: string, o: Partial<Eleve> = {}): Eleve =>
  ({ id, nom: id, niveau: "CE1", present: true, ine: "", dateNaissance: "", photoFichier: null, ...o });

describe("la fin de l'année scolaire", () => {
  it("commence au premier jour des vacances d'été de la zone", () => {
    expect(debutDeLEte(vacances, 2027)).toBe("2027-07-03");
    expect(debutDeLEte([], 2027)).toBe("2027-07-04");
    expect(derniereFinDAnnee("2027-07-02", vacances).annee).toBe("2025-2026");
    expect(derniereFinDAnnee("2027-07-03", vacances)).toEqual({ annee: "2026-2027", suivante: "2027-2028", debutEte: "2027-07-03" });
    expect(derniereFinDAnnee("2027-10-15", vacances).annee).toBe("2026-2027");
  });

  it("ne propose que les élèves de l'année finie", () => {
    const fin = derniereFinDAnnee("2027-07-10", vacances);
    const classe = [
      eleve("de-l-annee", { anneeScolaire: "2026-2027" }),
      eleve("cree-pendant-l-annee", { dateCreation: "2026-09-02T08:00:00Z" }),
      eleve("garde", { anneeScolaire: "2027-2028" }),
      eleve("arrive-cet-ete", { dateCreation: "2027-08-25T08:00:00Z" }),
      eleve("venu-d-une-vieille-sauvegarde"),
    ];
    expect(elevesDeLAnneeFinie(classe, fin).map((e) => e.id))
      .toEqual(["de-l-annee", "cree-pendant-l-annee", "venu-d-une-vieille-sauvegarde"]);
  });

  it("à la mise à jour, en pleine année, rien ne s'ouvre", () => {
    // Les élèves déjà là sont rattachés à l'année en cours (2026-2027) ; la
    // dernière fin d'année, à l'automne 2026, est celle de 2025-2026.
    const fin = derniereFinDAnnee("2026-10-09", vacances);
    expect(aMontrer([eleve("a", { anneeScolaire: "2026-2027" })], fin, null, "2026-10-09")).toBe(false);
  });

  it("« Plus tard » la remet au lendemain", () => {
    const fin = derniereFinDAnnee("2027-07-10", vacances);
    const classe = [eleve("a", { anneeScolaire: "2026-2027" })];
    expect(aMontrer(classe, fin, null, "2027-07-10")).toBe(true);
    expect(aMontrer(classe, fin, lendemain("2027-07-10"), "2027-07-10")).toBe(false);
    expect(aMontrer(classe, fin, "2027-07-11", "2027-07-11")).toBe(true);
    expect(lendemain("2027-08-31")).toBe("2027-09-01");
  });

  it("une fois les élèves supprimés ou gardés, elle ne revient plus", () => {
    const fin = derniereFinDAnnee("2027-07-10", vacances);
    expect(aMontrer([eleve("g", { anneeScolaire: "2027-2028" })], fin, null, "2027-07-12")).toBe(false);
  });
});
