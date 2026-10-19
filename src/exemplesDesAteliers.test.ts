import { describe, expect, it } from "vitest";
import { CARTE_EXEMPLE, MOTS_A_SYLLABES, MOTS_EXEMPLE, motsDeLaCarte } from "./exemplesDesAteliers";
import { REGLAGES_LOTO_SYLLABES, dominos, lignesIntrus, pairesQuiSenchainent, planchesLotoSyllabes } from "./jeuxSons";
import { REGLAGES_SYLLABES, syllabesCibles, trousPossibles } from "./syllabeManquante";
import { htmlApercuJeu } from "./apercuJeux";
import { hasard } from "./hasard";

// Un exemple qui ne donne pas de feuille ne montre rien : chacun est essayé
// avec le vrai générateur, comme si ses mots avaient tous leur image.
const avecImages = (mots: readonly string[]) => mots.map((mot, i) => ({ id: 100 + i, mot }));

describe("les exemples des générateurs", () => {
  it("donnent chacun une vraie feuille", () => {
    for (const graine of [1, 2, 3]) {
      expect(planchesLotoSyllabes(avecImages(MOTS_EXEMPLE.lotoSyllabes), REGLAGES_LOTO_SYLLABES, hasard(graine)).length).toBe(REGLAGES_LOTO_SYLLABES.planches);
      // Des dominos qui s'enchaînent, et des lignes d'intrus : ces exemples-là sont faits pour.
      expect(dominos(pairesQuiSenchainent(avecImages(MOTS_EXEMPLE.dominos), hasard(graine))).length).toBeGreaterThanOrEqual(4);
      expect(lignesIntrus(avecImages(MOTS_EXEMPLE.intrus), "attaque", 6, hasard(graine)).length).toBeGreaterThanOrEqual(3);
    }
    // La syllabe manquante prend, parmi ses mots, ceux où l'on entend ma, mi, mu.
    const cibles = syllabesCibles(REGLAGES_SYLLABES.syllabes);
    expect(MOTS_A_SYLLABES.filter((m) => trousPossibles(m, cibles).length > 0).length).toBeGreaterThanOrEqual(4);
    expect(motsDeLaCarte()).toHaveLength(1 + CARTE_EXEMPLE.branches.length * 3);
  });

  it("montrent la planche d'un loto, d'un jeu de mémoire, d'un imagier, comme le PDF la fera", () => {
    const images = Object.fromEntries(avecImages(MOTS_EXEMPLE.jeux).map((m) => [m.id, `data:image/png;base64,${m.mot}`]));
    const choisies = avecImages(MOTS_EXEMPLE.jeux);
    const loto = htmlApercuJeu("loto", choisies, { colonnes: 3, lignes: 2, libelles: false, cartes: true }, images);
    // La planche, en paysage, puis la page des cartes à piocher.
    expect(loto.match(/class="page aj-page"/g)).toHaveLength(2);
    expect(loto).toContain("aspect-ratio:297/210");
    expect(loto.match(/class="aj-case"/g)).toHaveLength(6 + 12);
    expect(loto).not.toContain("aj-mot");
    // Le jeu de mémoire : chaque image deux fois.
    const memory = htmlApercuJeu("memory", choisies, { colonnes: 4, lignes: 3, libelles: false, cartes: false }, images);
    const cartes = [...memory.matchAll(/base64,(\w+)/g)].map((m) => m[1]);
    expect(cartes).toHaveLength(12);
    for (const mot of new Set(cartes)) expect(cartes.filter((x) => x === mot)).toHaveLength(2);
    // L'imagier écrit toujours le mot ; une sélection courte laisse des cases vides.
    const imagier = htmlApercuJeu("imagier", choisies.slice(0, 3), { colonnes: 2, lignes: 2, libelles: false, cartes: false }, images);
    expect(imagier.match(/class="aj-mot"/g)).toHaveLength(3);
    expect(imagier).toContain("aj-case aj-vide");
    expect(htmlApercuJeu("loto", [], { colonnes: 3, lignes: 2, libelles: false, cartes: true }, images)).toBe("");
  });
});
