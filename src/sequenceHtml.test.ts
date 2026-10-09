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
});
