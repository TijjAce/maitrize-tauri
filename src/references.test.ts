import { describe, it, expect } from "vitest";
import { reference, referencesDe, referencesEnAide, sansReferences } from "./references";
import { consigneParDefaut, remplacerConsigne } from "./consigneAtelier";
import { documentImprimable } from "./print";

const FEUILLE = `<div class="feuille"><div class="titre">Grille de fluence</div>`
  + `<div class="regle"><b>Lire vite et bien</b>Je lis le plus de mots possible en une minute. ${reference("Livret Français CP, Éduscol 2025 ; guide « Pour enseigner la lecture et l'écriture au CP », p. 67-74.")}</div>`
  + `<div class="grille">…</div></div>`;

describe("les références d'une feuille", () => {
  it("s'écrivent en texte, échappé", () => {
    expect(reference(" Guide « CP » & <b>CE1</b> ")).toBe('<span class="reference">Guide « CP » &amp; &lt;b&gt;CE1&lt;/b&gt;</span>');
  });

  it("ne s'impriment pas", () => {
    const papier = sansReferences(FEUILLE);
    expect(papier).not.toContain("Éduscol");
    expect(papier).not.toContain("reference");
    // La consigne reste entière, sans espace qui traîne avant la fin de la règle.
    expect(papier).toContain("Je lis le plus de mots possible en une minute.</div>");
    expect(documentImprimable("Fluence", FEUILLE)).not.toContain("Éduscol");
  });

  it("se montrent dans l'application derrière un « ? », leur texte dans un attribut", () => {
    const aide = referencesEnAide(FEUILLE);
    expect(aide).toContain('class="reference-aide"');
    expect(aide).toContain('data-reference="Livret Français CP, Éduscol 2025 ; guide « Pour enseigner la lecture et l&#39;écriture au CP », p. 67-74."');
    // Aucun texte dans la page : ni les pictos de la consigne ni l'éditeur de consigne ne le voient.
    expect(aide.replace(/<[^>]*>/g, "")).not.toContain("Éduscol");
    expect(aide).toMatch(/<span class="reference-aide"[^>]*><\/span>/);
  });

  it("ne font pas partie de la consigne qu'on réécrit, et restent après la nouvelle", () => {
    expect(consigneParDefaut(FEUILLE)).toBe("Lire vite et bien\nJe lis le plus de mots possible en une minute.");
    const reecrite = remplacerConsigne(FEUILLE, "On lit\nUne minute, pas plus.");
    expect(reecrite).toContain("<b>On lit</b>Une minute, pas plus.");
    expect(referencesDe(reecrite)).toHaveLength(1);
    expect(sansReferences(reecrite)).not.toContain("Éduscol");
  });
});
