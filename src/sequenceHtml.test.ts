import { describe, it, expect } from "vitest";
import { htmlDeLaSequence } from "./sequenceHtml";
import { nouvelleSeance, nouvelleSequence } from "./api";

describe("la séquence imprimée", () => {
  it("donne les consignes de chaque séance, numérotées, et rien quand il n'y en a pas", () => {
    const seq = { ...nouvelleSequence(), titre: "Les semis" };
    const avec = { ...nouvelleSeance(seq.id, 1), titre: "Semer", consignes: "Prends un pot.\nMets la terre & la graine." };
    const sans = { ...nouvelleSeance(seq.id, 2), titre: "Arroser" };
    const html = htmlDeLaSequence(seq, [avec, sans], [], [], () => undefined);
    expect(html).toContain('<ol class="consignes"><li>Prends un pot.</li><li>Mets la terre &amp; la graine.</li></ol>');
    expect(html.match(/Consignes pour les élèves/g)).toHaveLength(1);
  });

  it("imprime le déroulement en document : les phases numérotées, sans tableau à côté", () => {
    const seq = { ...nouvelleSequence(), titre: "Lire" };
    const neuve = { ...nouvelleSeance(seq.id, 1), titre: "Le bon résumé",
      deroulement: "## Mise en route (5 min)\nOn relit [@affichage:a1|Les étapes du récit].\n[img:livre.png]",
      tableauDeroulement: JSON.stringify([["Phase", "Durée", "Description", "Posture de l'enseignant"], ["Mise en route", "5 min", "On relit Les étapes du récit.", ""]]) };
    const avant = { ...nouvelleSeance(seq.id, 2), titre: "Raconter",
      tableauDeroulement: JSON.stringify([["Phase", "Durée", "Description", "Posture de l'enseignant"], ["Rappel", "10", "Qui se souvient ?", "Relancer"]]) };
    const html = htmlDeLaSequence(seq, [neuve, avant], [], [], (n) => `data:${n}`);
    expect(html).toContain('<span class="doc-numero">1</span>Mise en route<span class="doc-duree">5 min</span>');
    expect(html).toContain('<span class="cite cite-affichage">🖼 Les étapes du récit</span>');
    expect(html).toContain('<img src="data:livre.png" alt="">');
    expect(html).toContain('Rappel<span class="doc-duree">10 min</span>');
    expect(html).toContain("<i>Posture de l'enseignant : Relancer</i>");
    expect(html).not.toContain("<table");
  });
});
