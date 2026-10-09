import { describe, it, expect } from "vitest";
import { lirePropositions, preparerRepartition } from "./DicteeAtelier";
import { restaurer } from "../confidentialite";
import type { Eleve } from "../api";

const eleve = (nom: string, id: string): Eleve => ({
  id, nom, niveau: "", present: true, ine: "", dateNaissance: "", photoFichier: null,
});
const CLASSE = [eleve("Apolline Roux", "e1"), eleve("Ayyûb Belhadj", "e2"), eleve("Clara Meunier", "e3")];

// Une observation mal attribuée atterrit dans le dossier du mauvais enfant.
// Cette fonction est donc volontairement méfiante : elle abandonne une ligne
// plutôt que de deviner.

describe("lirePropositions", () => {
  it("associe chaque observation au bon élève", () => {
    const r = lirePropositions(
      '[{"eleve":"Apolline","observation":"A trié les couleurs seule","type":"scolaire"}]', CLASSE);
    expect(r).toHaveLength(1);
    expect(r[0].eleveId).toBe("e1");
    expect(r[0].texte).toBe("A trié les couleurs seule");
    expect(r[0].type).toBe("scolaire");
    expect(r[0].garder).toBe(true);
  });

  it("retrouve l'élève quelle que soit la casse", () => {
    expect(lirePropositions('[{"eleve":"APOLLINE","observation":"ok"}]', CLASSE)[0].eleveId).toBe("e1");
  });

  it("accepte aussi le nom complet", () => {
    expect(lirePropositions('[{"eleve":"Clara Meunier","observation":"ok"}]', CLASSE)[0].eleveId).toBe("e3");
  });

  it("écarte un prénom inconnu au lieu de l'attribuer au hasard", () => {
    const r = lirePropositions(
      '[{"eleve":"Kevin","observation":"a participé"},{"eleve":"Clara","observation":"ok"}]', CLASSE);
    expect(r.map((p) => p.eleveId)).toEqual(["e3"]);
  });

  it("ignore une observation vide", () => {
    expect(lirePropositions('[{"eleve":"Clara","observation":"   "}]', CLASSE)).toEqual([]);
  });

  it("retombe sur « divers » pour un type inattendu", () => {
    expect(lirePropositions('[{"eleve":"Clara","observation":"ok","type":"n_importe_quoi"}]', CLASSE)[0].type)
      .toBe("divers");
  });

  it("extrait le tableau même entouré de texte ou de balises de code", () => {
    const brut = 'Voici le résultat :\n```json\n[{"eleve":"Clara","observation":"ok"}]\n```\nBonne journée !';
    expect(lirePropositions(brut, CLASSE)).toHaveLength(1);
  });

  it("ne casse pas sur une réponse sans JSON", () => {
    expect(lirePropositions("Je n'ai pas compris la demande.", CLASSE)).toEqual([]);
  });

  it("ne casse pas sur un JSON tronqué", () => {
    expect(lirePropositions('[{"eleve":"Clara","observation":', CLASSE)).toEqual([]);
  });

  it("ignore les entrées qui ne sont pas des objets", () => {
    expect(lirePropositions('["Clara", 42, null]', CLASSE)).toEqual([]);
  });

  it("donne un identifiant distinct à chaque proposition", () => {
    const r = lirePropositions(
      '[{"eleve":"Clara","observation":"a"},{"eleve":"Clara","observation":"b"}]', CLASSE);
    expect(new Set(r.map((p) => p.id)).size).toBe(2);
  });
});

describe("préparer la répartition", () => {
  const { messages, table } = preparerRepartition(CLASSE, "Clara a bien travaillé, puis apolline l'a aidée.");
  const tout = messages.map((m) => m.content).join(" ");

  it("n'envoie aucun prénom ni nom de famille", () => {
    for (const nom of ["Clara", "Apolline", "apolline", "Roux", "Meunier", "Ayyûb", "Belhadj"]) expect(tout).not.toContain(nom);
    expect(tout).toContain("[P1] a bien travaillé, puis [P2] l'a aidée.");
    expect(tout).toContain("Élèves cités : [P1], [P2]");
  });

  it("la réponse retrouve ses élèves sur la machine", () => {
    const reponse = '[{"eleve":"[P1]","observation":"[P1] a aidé [P2]."},{"eleve":"[P2]","observation":"A été aidée."}]';
    const r = lirePropositions(restaurer(reponse, table).texte, CLASSE);
    expect(r.map((p) => p.eleveId)).toEqual(["e3", "e1"]);
    expect(r[0].texte).toBe("Clara a aidé apolline.");
  });

  it("demande explicitement de ne rien inventer", () => {
    expect(messages[0].content).toMatch(/n'invente rien/i);
  });
});
