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

  it("imprime le déroulement comme une fiche : une ligne par phase, une colonne par champ", () => {
    const seq = { ...nouvelleSequence(), titre: "Lire" };
    const neuve = { ...nouvelleSeance(seq.id, 1), titre: "Le bon résumé",
      deroulement: "## Mise en route (5 min)\nOn relit [@affichage:a1|Les étapes du récit].\n[img:livre.png]",
      tableauDeroulement: JSON.stringify([["Phase", "Durée", "Description", "Posture de l'enseignant"], ["Mise en route", "5 min", "On relit Les étapes du récit.", ""]]) };
    const avant = { ...nouvelleSeance(seq.id, 2), titre: "Raconter",
      tableauDeroulement: JSON.stringify([["Phase", "Durée", "Description", "Posture de l'enseignant"], ["Rappel", "10", "Qui se souvient ?", "Relancer"]]) };
    const html = htmlDeLaSequence(seq, [neuve, avant], [], [], (n) => `data:${n}`);
    expect(html).toContain("<th>Phase</th><th>Durée</th><th>Déroulement</th><th>Posture de l&#39;enseignant</th></tr>");
    expect(html).toContain('<td><b>1. Mise en route</b></td><td class="duree">5 min</td><td><p>On relit <span class="cite cite-affichage">🖼 Les étapes du récit</span>.</p>');
    expect(html).toContain('<img src="data:livre.png" alt="">');
    // Le tableau d'avant, rangé en phases : la posture dans sa colonne.
    expect(html).toContain('<td><b>1. Rappel</b></td><td class="duree">10 min</td><td><p>Qui se souvient ?</p></td><td><p>Relancer</p></td>');
  });
});
