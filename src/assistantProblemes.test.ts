import { describe, expect, it } from "vitest";
import {
  changementsEnClair, consigneDesProblemes, lireReponseProblemes, nombreDeProblemes, type EtatDeLAtelier, type ReglagesDeLAtelier,
} from "./assistantProblemes";
import {
  CATALOGUE_PRESENTATION, PRESENTATION_COMPLETE, STYLE_FEUILLE, blocCorrige, blocProbleme, classesFeuille, contexteLu, contextesChoisis, genererPartieTout,
  retoucherPresentation, type ContexteParties,
} from "./problemesBarres";

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

describe("l'assistant fait les commandes de l'écran (« je veux que l'IA comprenne réellement ce que je veux : relié aux commandes possibles à la main »)", () => {
  const e = (): EtatDeLAtelier => ({
    ...etat(), presentation: PRESENTATION_COMPLETE, presentationsEnregistrees: [], voirCorrige: false, motsDesEnonces: ["la bille", "donner"],
  });

  it("toutes les commandes de la présentation sont dans la liste de l'écran, une fois chacune", () => {
    const cles = CATALOGUE_PRESENTATION.map((x) => x.cle);
    expect(new Set(cles).size).toBe(cles.length);
    expect([...cles].sort()).toEqual(Object.keys(PRESENTATION_COMPLETE).sort());
  });

  it("la consigne donne chaque commande avec son nom à l'écran, sa clé, ses choix et sa valeur", () => {
    const c = consigneDesProblemes(e());
    for (const x of CATALOGUE_PRESENTATION) expect(c).toContain(`« ${x.libelle} » — clé ${x.cle}`);
    expect(c).toMatch(/« Écrire l'énoncé » — clé enonce, true ou false ; ses mots : la consigne, .+ — actuellement : oui/);
    expect(c).toContain('« Taille du texte » — clé tailleTexte, choix "normale" (Normale), "grande" (Grande), "tres-grande" (Très grande)');
    expect(c).toMatch(/« Nombre de problèmes » — clé nombre : .+ — actuellement : 6/);
    expect(c).toMatch(/« Ce que l'élève cherche » — clé inconnue : .+ — actuellement : Le tout ou une partie, en alternance/);
  });

  it("« consigne » veut dire l'énoncé, et l'assistant agit au lieu de réciter les réglages", () => {
    const c = consigneDesProblemes(e());
    expect(c).toContain(`« pas de consigne » → ${JSON.stringify({ reponse: "Les problèmes n'ont plus d'énoncé : il reste les schémas.", presentation: { enonce: false } })}`);
    expect(c).toMatch(/« consigne », « texte », « histoire », « phrase » désignent l'énoncé/);
    expect(c).toMatch(/fais-les tout de suite/);
    expect(c).toMatch(/Ne récite pas les réglages/);
    // Aucune commande qui n'agirait pas sur cette feuille (le bandeau « La feuille » n'y a pas de consigne).
    expect(c).not.toMatch(/clé (feuille|aide|tablettes)\b/);
    // Les exemples ont de vraies réponses : rien que l'assistant recopierait tel quel.
    expect(c).not.toMatch(/"reponse":"…"/);
  });

  it("« pas de consigne » décoche « Écrire l'énoncé », et le fil le dit avec le nom de l'écran", () => {
    const r = lireReponseProblemes(JSON.stringify({ reponse: "Les problèmes n'ont plus d'énoncé.", presentation: { enonce: false } }), e());
    expect(r.presentation).toEqual({ enonce: false });
    expect(retoucherPresentation(PRESENTATION_COMPLETE, r.presentation!).enonce).toBe(false);
    expect(changementsEnClair(r, e())).toEqual(["Écrire l'énoncé : non"]);
  });

  it("lit les valeurs telles que l'écran les écrit : « Très grande », « 2 par page », « non », « Noir seulement »", () => {
    const r = lireReponseProblemes(JSON.stringify({
      reponse: "ok", presentation: { tailleTexte: "Très grande", parPage: "2 par page", nomDate: "non", couleurs: "Noir seulement" },
    }), e());
    expect(r.presentation).toEqual({ tailleTexte: "tres-grande", parPage: 2, nomDate: false, couleurs: "noir" });
    expect(changementsEnClair(r, e())).toEqual([
      "Lignes « Prénom » et « Date » : non", "Par page : 2 par page", "Taille du texte : Très grande", "Couleurs : Noir seulement",
    ]);
  });

  it("« laisser la place pour que l'élève puisse schématiser » : le schéma devient une place vide, plus grande avec la taille du schéma", () => {
    expect(consigneDesProblemes(e())).toContain(`« laisse la place pour que l'élève schématise » → ${JSON.stringify({
      reponse: "Chaque problème a maintenant une place vide où l'élève dessine son schéma.", presentation: { schema: "sans" } })}`);
    const r = lireReponseProblemes(JSON.stringify({ reponse: "ok", presentation: { schema: "sans", tailleSchema: "grand" } }), e());
    expect(changementsEnClair(r, e())).toEqual(["Dans le schéma : Pas de schéma : une place pour que l'élève le dessine", "Taille : Grande"]);
    const p = retoucherPresentation(PRESENTATION_COMPLETE, r.presentation!);
    const pb = generer(REGLAGES)[0];
    expect(blocProbleme(pb, 0, p)).toContain('<div class="pb-cadre"></div>');
    expect(blocProbleme(pb, 0, p)).not.toContain("<svg");
    expect(classesFeuille(p)).toContain("pb-schema-grand");
    expect(STYLE_FEUILLE).toMatch(/\.pb-schema-grand \.pb-cadre \{ height: 220px; \}/);
    // Le corrigé garde le schéma, pour l'enseignant.
    expect(blocCorrige(pb, 0, p)).toContain("<svg");
  });

  it("ce qui ne change rien ne s'affiche pas : une question laisse tout tel quel", () => {
    expect(changementsEnClair(lireReponseProblemes(JSON.stringify({ reponse: "Le texte ou le schéma ?" }), e()), e())).toEqual([]);
    expect(changementsEnClair(lireReponseProblemes(JSON.stringify({ reponse: "C'est déjà le cas.", presentation: { enonce: true }, nombre: 6 }), e()), e())).toEqual([]);
  });

  it("les problèmes, l'aperçu et l'impression se disent aussi avec les noms de l'écran", () => {
    const r = lireReponseProblemes(JSON.stringify({
      reponse: "ok", inconnue: "tout", max: 100, nombre: 8, remplacer: [2], voirCorrige: true, imprimer: true,
    }), e());
    expect(changementsEnClair(r, e())).toEqual([
      "Nombre de problèmes : 8", "Ce que l'élève cherche : Le tout", "Nombres : jusqu'à 100", "↻ Problème 2 remplacé", "Voir le corrigé : oui", "🖨 Imprimer",
    ]);
    const modele = lireReponseProblemes(JSON.stringify({ reponse: "ok", modele: "modele-seul", presentation: { tailleSchema: "pleine" } }), e());
    expect(changementsEnClair(modele, e())).toEqual(["▭ Modèle en barres seul", "Taille : Toute la largeur"]);
  });

  it("les mots des énoncés en images : à voir, à imprimer, sur le bureau ; la consigne dit lesquels, ou qu'il n'y en a pas", () => {
    const mots = (v: unknown) => lireReponseProblemes(JSON.stringify({ reponse: "ok", motsEnImages: v }), e()).motsEnImages;
    expect([mots(true), mots("voir"), mots("imprimer"), mots("bureau"), mots("autre chose")]).toEqual(["voir", "voir", "imprimer", "bureau", undefined]);
    expect(consigneDesProblemes(e())).toMatch(/clé motsEnImages : .+ les mots relevés : la bille, donner/);
    expect(consigneDesProblemes({ ...e(), motsDesEnonces: [] })).toMatch(/aucun mot : la feuille n'a pas d'énoncé/);
    // Sans énoncé, rien ne s'affiche comme fait : l'atelier dit qu'il n'y a pas de mots.
    const voir = lireReponseProblemes(JSON.stringify({ reponse: "ok", motsEnImages: "voir" }), e());
    expect(changementsEnClair(voir, e())).toEqual(["🖼 Les mots"]);
    expect(changementsEnClair(voir, { ...e(), motsDesEnonces: [] })).toEqual([]);
  });

  it("les exemples des problèmes multiplicatifs n'emploient que leurs clés", () => {
    const c = consigneDesProblemes({ sorte: "multiplicatifs", reglages: REGLAGES, problemes: [] });
    expect(c).toContain('"types":["part"],"table":5');
    expect(c).not.toContain('"inconnue":"tout"');
    expect(c).toMatch(/« Types de problèmes, en alternance sur la feuille » — clé types/);
  });
});
