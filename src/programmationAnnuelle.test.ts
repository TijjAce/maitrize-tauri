import { describe, expect, it } from "vitest";
import type { ProgrammationFinale } from "./api";
import type { LigneProgrammation } from "./organisationHtml";
import {
  copieDesDomaines, deplacerLigne, ligneNeuve, niveauxDeLAnnee, programmationDe, remettreLigne, sourcesDeDomaines, teintesDesLignes,
} from "./programmationAnnuelle";

const prog = (id: string, niveau: string, lignes: LigneProgrammation[], extra: Partial<ProgrammationFinale> = {}): ProgrammationFinale => ({
  id, annee: "2026-2027", niveau, enseignant: "", estImportee: false, lignesJson: JSON.stringify(lignes), ...extra,
});
const D = (id: string, label: string, couleur = "blue") => ligneNeuve(id, true, label, couleur);
const A = (id: string, label: string) => ligneNeuve(id, false, label);
const ids = (ls: LigneProgrammation[]) => ls.map((l) => l.id);

describe("la programmation de la classe et de ses niveaux", () => {
  const liste = [
    prog("c", "", [D("d1", "Français"), A("a1", "Lecture")]),
    prog("ce1", "CE1", [D("d2", "Mathématiques")]),
    prog("cp", "CP", [D("d3", "EPS")]),
    prog("vide", "CM1", []),
    prog("ime", "ime", []),
    prog("x", "CE2", [D("d4", "Arts")], { estImportee: true, enseignant: "Collègue" }),
  ];

  it("trouve chaque programmation à soi, jamais celle d'un collègue ni celle par élève", () => {
    expect(programmationDe(liste, "2026-2027", "")?.id).toBe("c");
    expect(programmationDe(liste, "2026-2027", "CP")?.id).toBe("cp");
    expect(programmationDe(liste, "2026-2027", "CE2")).toBeUndefined();
    expect(programmationDe(liste, "2027-2028", "")).toBeUndefined();
  });

  it("range les niveaux de l'année dans l'ordre de l'école, avec ceux qu'on vient d'ajouter", () => {
    const ordre = ["CP", "CE1", "CE2", "CM1", "CM2"];
    expect(niveauxDeLAnnee(ordre, liste, "2026-2027", [])).toEqual(["CP", "CE1"]);
    expect(niveauxDeLAnnee(ordre, liste, "2026-2027", ["2026-2027|CM2", "2027-2028|CM1"])).toEqual(["CP", "CE1", "CM2"]);
  });

  it("donne à chaque activité la couleur du domaine au-dessus d'elle", () => {
    const lignes = [A("a0", "Accueil"), D("d1", "Français"), A("a1", "Lecture"), D("d2", "Maths"), A("a2", "Calcul")];
    const teintes = teintesDesLignes(lignes, (l) => (l.label === "Français" ? "#00f" : "#f00"), "#999");
    expect(teintes).toEqual({ a0: "#999", d1: "#00f", a1: "#00f", d2: "#f00", a2: "#f00" });
  });

  it("reprend les domaines d'une autre programmation de l'année, sans ses activités", () => {
    const sources = sourcesDeDomaines(liste, "2026-2027", "CM1");
    expect(sources.map((s) => s.libelle)).toEqual(["la classe", "CE1", "CP"]);
    let n = 0;
    const copie = copieDesDomaines(sources[0].domaines, () => `n${++n}`);
    expect(copie.map((l) => [l.id, l.label, l.estDomaine])).toEqual([["n1", "Français", true]]);
  });

  it("déplace un domaine avec ses activités, et remet une ligne supprimée à sa place", () => {
    const lignes = [D("d1", "Français"), A("a1", "Lecture"), A("a2", "Écriture"), D("d2", "Maths"), A("a3", "Calcul")];
    expect(ids(deplacerLigne(lignes, "d1", "d2"))).toEqual(["d2", "a3", "d1", "a1", "a2"]);
    expect(ids(deplacerLigne(lignes, "a3", "a1"))).toEqual(["d1", "a1", "a3", "a2", "d2"]);
    // Un domaine ne se pose pas dans son propre groupe.
    expect(ids(deplacerLigne(lignes, "d1", "a2"))).toEqual(ids(lignes));
    const sans = lignes.filter((l) => l.id !== "a2");
    expect(ids(remettreLigne(sans, lignes[2], 2))).toEqual(ids(lignes));
    // Déjà revenue : rien ne double.
    expect(ids(remettreLigne(lignes, lignes[2], 0))).toEqual(ids(lignes));
  });
});
