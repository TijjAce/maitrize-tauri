import { describe, it, expect } from "vitest";
import { alaPremierePersonne } from "./premierePersonne";

const IMPERATIFS = new Set(["entoure", "lis", "écris", "relis", "range", "colle", "compte", "dessine", "trace", "raye", "oublie", "réponds", "suis", "va",
  "vas", "sois", "demande", "aide", "fais", "prends", "dis", "mets", "montre", "regarde", "pense", "barre", "complète", "coche", "écoute", "répète",
  "marque"]);
const je = (html: string) => alaPremierePersonne(html, (m) => IMPERATIFS.has(m));

describe("les consignes à la première personne", () => {
  it("mettent l'impératif en tête à « je », élidé devant une voyelle", () => {
    expect(je("Entoure les mots.")).toBe("J'entoure les mots.");
    expect(je("Lis le texte en silence, puis à voix haute.")).toBe("Je lis le texte en silence, puis à voix haute.");
    expect(je("Puis écris le nombre.")).toBe("Puis j'écris le nombre.");
    expect(je("<b>Range</b> les étiquettes.")).toBe("<b>Je range</b> les étiquettes.");
  });

  it("gardent les irréguliers justes : « je suis le programme », « je vais »", () => {
    expect(je("Suis le programme.")).toBe("Je suis le programme.");
    expect(je("Va au tableau.")).toBe("Je vais au tableau.");
    expect(je("Sois attentif.")).toBe("Je suis attentif.");
  });

  it("placent les pronoms devant le verbe, et la négation après « je »", () => {
    expect(je("Écris-le en cursive.")).toBe("Je l'écris en cursive.");
    expect(je("Colle-la sur la ligne.")).toBe("Je la colle sur la ligne.");
    expect(je("Range-les dans la boîte.")).toBe("Je les range dans la boîte.");
    expect(je("Relis-toi.")).toBe("Je me relis.");
    expect(je("Aide-toi du modèle.")).toBe("Je m'aide du modèle.");
    expect(je("Prends-en trois.")).toBe("J'en prends trois.");
    expect(je("Ne raye pas.")).toBe("Je ne raye pas.");
    expect(je("N'oublie pas la majuscule.")).toBe("Je n'oublie pas la majuscule.");
  });

  it("mettent à « je » les impératifs que la consigne coordonne au premier", () => {
    expect(je("Dessine ou colle les pièces.")).toBe("Je dessine ou je colle les pièces.");
    expect(je("Lis, puis réponds.")).toBe("Je lis, puis je réponds.");
    expect(je("Complète la phrase : entoure-la, puis écris-la.")).toBe("Je complète la phrase : je l'entoure, puis je l'écris.");
    expect(je("Aide : regarde la bande numérique.")).toBe("Aide : je regarde la bande numérique.");
  });

  it("passent de « tu » à « je », et de « ton » à « mon »", () => {
    expect(je("Tu peux tourner la feuille, ou te mettre à sa place.")).toBe("Je peux tourner la feuille, ou me mettre à sa place.");
    expect(je("Tu n'es pas obligé de tracer l'arbre.")).toBe("Je ne suis pas obligé de tracer l'arbre.");
    expect(je("Si tu bloques, demande de l'aide.")).toBe("Si je bloque, je demande de l'aide.");
    expect(je("Quand tu as vérifié, colle la bonne étiquette.")).toBe("Quand j'ai vérifié, je colle la bonne étiquette.");
    expect(je("Montre-le à ton voisin, avec tes mots.")).toBe("Je le montre à mon voisin, avec mes mots.");
    expect(je("Pour t'aider, regarde l'exemple.")).toBe("Pour m'aider, je regarde l'exemple.");
    expect(je("Avant chaque calcul, demande-toi : faut-il ajouter 20 ?")).toBe("Avant chaque calcul, je me demande : faut-il ajouter 20 ?");
  });

  it("laissent ce qui ne s'adresse pas à l'élève : l'infinitif, « on », les citations, le ton de la voix", () => {
    for (const phrase of [
      "Découper le cadre et ses quatre fentes.", "On lit la carte.", "Le robot regarde dans la direction de sa flèche.",
      "« Écrivez ! » : chacun écrit sa réponse.", "Je lis la grille.", "Lis « Regarde tomber l'eau ».".replace(/^Lis /, "Le poème dit "),
      "Change le ton de la voix.".replace(/^Change /, "On change "),
    ]) expect(je(phrase)).toBe(phrase);
  });
});

describe("les consignes à la première personne, sur de vraies feuilles", () => {
  it("lisent l'apostrophe écrite en entité, et mettent la majuscule après le numéro", () => {
    expect(je("Tu n&#39;es pas obligé de tracer l&#39;arbre.")).toBe("Je ne suis pas obligé de tracer l'arbre.");
    expect(je("1. Coche le résumé.")).toBe("1. Je coche le résumé.");
    expect(je("D. Trace un segment.")).toBe("D. Je trace un segment.");
  });

  it("continuent après un tiret ou une parenthèse, et retournent les questions simples", () => {
    expect(je("Compte les faces — marque d'une gommette ce que tu as compté.")).toBe("Je compte les faces — je marque d'une gommette ce que j'ai compté.");
    expect(je("Je regarde… (coche ce qui t'aide le plus)")).toBe("Je regarde… (je coche ce qui m'aide le plus)");
    expect(je("Et toi, à sa place, qu'aurais-tu fait ?")).toBe("Et moi, à sa place, qu'aurais-je fait ?");
  });

  it("ne touchent pas une liste de formes conjuguées : c'est un exemple", () => {
    expect(je("Écris l'infinitif de chaque verbe : ils plieront, tu as plié, vous pliez → plier.")).toBe(
      "J'écris l'infinitif de chaque verbe : ils plieront, tu as plié, vous pliez → plier.");
  });
});

describe("les consignes à la première personne, après deux ouvertures", () => {
  it("trouvent l'impératif après « Puis, à l'inverse, » et gardent « de ton » possessif devant un nom", () => {
    expect(alaPremierePersonne("Puis, à l'inverse, remplace le pronom par un groupe de ton choix.", (m) => m === "remplace"))
      .toBe("Puis, à l'inverse, je remplace le pronom par un groupe de mon choix.");
    expect(alaPremierePersonne("On change de ton.", () => false)).toBe("On change de ton.");
  });
});

describe("les consignes à la première personne, proposition par proposition", () => {
  it("trouvent l'impératif après deux-points, même derrière une ouverture, et ce qui le continue", () => {
    const imp = (m: string) => ["calcule", "écris", "reporte", "range"].includes(m);
    expect(alaPremierePersonne("Je ne suis pas obligé : pour les calculs faciles, calcule dans ma tête et écris le résultat.", imp))
      .toBe("Je ne suis pas obligé : pour les calculs faciles, je calcule dans ma tête et j'écris le résultat.");
    expect(alaPremierePersonne("Sans règle : reporte la longueur (ou avec le compas), puis range les segments.", imp))
      .toBe("Sans règle : je reporte la longueur (ou avec le compas), puis je range les segments.");
  });
});
