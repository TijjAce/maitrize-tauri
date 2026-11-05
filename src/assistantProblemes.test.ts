import { describe, expect, it } from "vitest";
import {
  consigneDesProblemes, lireReponseProblemes, nombreDeProblemes, type EtatDeLAtelier, type ReglagesDeLAtelier,
} from "./assistantProblemes";
import { PRESENTATION_COMPLETE, contexteLu, contextesChoisis, genererPartieTout, retoucherPresentation, type ContexteParties } from "./problemesBarres";

const REGLAGES: ReglagesDeLAtelier = {
  titre: "Problèmes partie-tout", nombre: 6, prenoms: "",
  parties: 2, inconnue: "melange", max: 10, perso: false, toutMin: 5, toutMax: 10, partieMin: 1, themes: [], themesPerso: [],
  types: ["tout", "part", "nombre"], table: 10, partsMin: 2, partsMax: 5, valeurMin: 1, valeurMax: 5,
};
const generer = (r: ReglagesDeLAtelier) => genererPartieTout({
  nombre: r.nombre, parties: r.parties, inconnue: r.inconnue, max: r.max, enonces: true, prenoms: [],
  contextes: contextesChoisis(r.themes, r.themesPerso),
}, 42);
const etat = (r: Partial<ReglagesDeLAtelier> = {}): EtatDeLAtelier => {
  const reglages = { ...REGLAGES, ...r };
  return { sorte: "partieTout", reglages, problemes: generer(reglages) };
};

const CITROUILLES = {
  tout: ["citrouille", "citrouilles"], lieu: "dans le champ",
  parties: [
    { groupe: ["citrouille orange", "citrouilles orange"], attribut: ["orange", "orange"] },
    { groupe: ["citrouille verte", "citrouilles vertes"], attribut: ["verte", "vertes"] },
  ],
};

describe("l'assistant de l'atelier Problèmes (« essaye de faire un tchatbot ici »)", () => {
  it("règle l'atelier d'après la demande : ce qu'on cherche, les parties, les nombres, le nombre de problèmes, le titre", () => {
    const r = lireReponseProblemes(JSON.stringify({
      reponse: "Voici 8 problèmes jusqu'à 20 où l'on cherche une partie.", inconnue: "partie", parties: 3, max: 20, nombre: 8, titre: "Les parties",
    }), etat());
    expect(r.reponse).toMatch(/8 problèmes/);
    expect(r.reglages).toEqual({ inconnue: "partie", parties: 3, perso: false, max: 20, nombre: 8, titre: "Les parties" });
  });

  it("un plafond qui n'est pas dans la liste devient une plage ; un nombre de problèmes va au plus proche de la liste", () => {
    const r = lireReponseProblemes(JSON.stringify({ reponse: "ok", max: 50, nombre: 7 }), etat());
    expect(r.reglages.perso).toBe(true);
    expect(r.reglages.toutMax).toBe(50);
    expect(r.reglages.nombre).toBe(8);
    expect(nombreDeProblemes(11)).toBe(12);
  });

  it("un thème nouveau n'apporte que des mots : la feuille garde ses nombres, ses calculs et ses réponses justes", () => {
    const r = lireReponseProblemes(JSON.stringify({ reponse: "Des citrouilles !", nouveauxThemes: [CITROUILLES] }), etat());
    expect(r.reglages.themes).toEqual(["citrouilles"]);
    expect(r.reglages.themesPerso?.[0].lieu).toBe("Dans le champ");
    const feuille = generer({ ...REGLAGES, ...r.reglages } as ReglagesDeLAtelier);
    for (const p of feuille) {
      expect(p.enonce).toMatch(/citrouilles/);
      const s = p.schema;
      if (s.forme !== "parties") throw new Error("forme");
      expect(s.parties.reduce((a, c) => a + c.valeur, 0)).toBe(s.tout.valeur);
      expect(p.reponse).toBe(s.tout.connue ? s.parties.find((c) => !c.connue)!.valeur : s.tout.valeur);
      // « il y a » seulement : jamais « il » ni « elle » pour une personne.
      expect(p.enonce.replace(/il y a|y a-t-il/g, "")).not.toMatch(/\b(il|elle)\b/);
    }
  });

  it("refuse un thème mal écrit, avec « il » ou « elle », ou d'une seule partie", () => {
    expect(contexteLu({ ...CITROUILLES, parties: CITROUILLES.parties.slice(0, 1) })).toBeNull();
    expect(contexteLu({ ...CITROUILLES, tout: ["il", "ils"] })).toBeNull();
    expect(contexteLu("des citrouilles")).toBeNull();
    const sansLieu = contexteLu({ ...CITROUILLES, lieu: "quelque part" }) as ContexteParties;
    expect(sansLieu.lieu).toBeUndefined();
  });

  it("garde les thèmes nommés qui existent, et seulement eux", () => {
    const r = lireReponseProblemes(JSON.stringify({ reponse: "ok", themes: ["Billes", "pommes", "dragons"] }), etat());
    expect(r.reglages.themes).toEqual(["billes", "pommes"]);
    const feuille = generer({ ...REGLAGES, themes: ["billes", "pommes"] });
    for (const p of feuille) expect(p.enonce).toMatch(/billes|pommes/);
  });

  it("remplace un problème et choisit les nombres d'un autre ; ce qui sort de la feuille est écarté", () => {
    const r = lireReponseProblemes(JSON.stringify({
      reponse: "ok", remplacer: [3, 9, "2"], nombres: [{ probleme: 2, valeurs: [8, 5], cherche: "tout" }, { probleme: 4, valeurs: [8], cherche: 1 },
        { probleme: 1, valeurs: [4, 3], cherche: 2 }],
    }), etat());
    expect(r.remplacer).toEqual([3, 2]);
    expect(r.nombres).toEqual([{ probleme: 2, valeurs: [8, 5], inconnue: -1 }, { probleme: 1, valeurs: [4, 3], inconnue: 1 }]);
  });

  it("une réponse en texte se dit telle quelle, et ne change rien", () => {
    const r = lireReponseProblemes("Je ne peux pas faire cela.", etat());
    expect(r.reponse).toBe("Je ne peux pas faire cela.");
    expect(r.reglages).toEqual({});
    expect(r.remplacer).toBeUndefined();
  });

  it("les problèmes multiplicatifs : les types, la table, une plage", () => {
    const e: EtatDeLAtelier = { sorte: "multiplicatifs", reglages: REGLAGES, problemes: [] };
    const r = lireReponseProblemes(JSON.stringify({ reponse: "ok", types: ["part", "inconnu", "tout"], table: 4 }), e);
    expect(r.reglages).toEqual({ types: ["tout", "part"], perso: false, table: 5 });
    const p = lireReponseProblemes(JSON.stringify({ reponse: "ok", plage: { partsMin: 3, partsMax: 6, valeurMin: 2, valeurMax: 9 } }), e);
    expect(p.reglages).toEqual({ perso: true, partsMin: 3, partsMax: 6, valeurMin: 2, valeurMax: 9 });
  });

  it("la consigne donne à l'assistant la feuille avec ses nombres, et lui interdit d'écrire un énoncé ou un résultat", () => {
    const c = consigneDesProblemes(etat());
    expect(c).toMatch(/n'écris jamais toi-même un énoncé/);
    expect(c).toMatch(/^1\. .+\[parties \d+ et \d+, tout \d+/m);
  });
});

describe("l'assistant règle aussi la présentation (« tout ça, je voulais dire le tchatbot »)", () => {
  const e = (): EtatDeLAtelier => ({ ...etat(), presentation: PRESENTATION_COMPLETE, presentationsEnregistrees: ["Pour les CP"], voirCorrige: false });

  it("relit les éléments un à un : ce qui ne se lit pas est laissé de côté", () => {
    const r = lireReponseProblemes(JSON.stringify({
      reponse: "En grand et en capitales, sur deux colonnes.",
      presentation: { tailleTexte: "grande", capitales: true, colonnes: "2", police: "papyrus", couleurTout: "#12AB34", motTout: "  LE TOUT ", inconnu: 3 },
    }), e());
    expect(r.presentation).toEqual({ tailleTexte: "grande", capitales: true, colonnes: 2, couleurTout: "#12ab34", motTout: "LE TOUT" });
    const p = retoucherPresentation(PRESENTATION_COMPLETE, r.presentation!);
    expect(p.police).toBe("arial");
    expect(p.colonnes).toBe(2);
  });

  it("une présentation toute faite, une enregistrée (si elle existe), le corrigé, l'impression, le bureau", () => {
    const r = lireReponseProblemes(JSON.stringify({
      reponse: "ok", modele: "modele-seul", presentationEnregistree: "pour les cp", enregistrerPresentation: "Grand format",
      voirCorrige: true, imprimer: true, surLeBureau: true,
    }), e());
    expect(r).toMatchObject({ modele: "modele-seul", presentationEnregistree: "Pour les CP", enregistrerPresentation: "Grand format", voirCorrige: true, imprimer: true, surLeBureau: true });
    expect(lireReponseProblemes(JSON.stringify({ reponse: "ok", presentationEnregistree: "inconnue" }), e()).presentationEnregistree).toBeUndefined();
  });

  it("la consigne dit la présentation telle qu'elle est, et ce qu'on peut en changer", () => {
    const c = consigneDesProblemes(e());
    expect(c).toMatch(/Présentation : titre oui/);
    expect(c).toMatch(/tailleTexte/);
    expect(c).toMatch(/Présentations enregistrées : Pour les CP/);
  });
});

