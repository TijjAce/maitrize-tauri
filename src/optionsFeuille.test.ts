import { describe, it, expect } from "vitest";
import {
  OPTIONS_FEUILLE, appliquerOptionsFeuille, cleOptionsFeuille, consignesDeLaFeuille, contenuDeLaFeuille, ecrireOptionsFeuille, feuillesPubliees,
  lireOptionsFeuille, retirerElements,
} from "./optionsFeuille";

/** Tout sur la feuille, et la consigne aux tablettes aussi. */
const TOUT = { consigne: true, prenom: true, corrige: true, tablettes: true };

const feuille = `<div class="feuille nu"><div class="page"><div class="titre">Numération</div><div class="sous">Prénom : ........ Date : ........</div>`
  + `<div class="regle"><b>La règle</b>On lit, puis on <span style="color:#687087">écrit</span>.</div>`
  + `<div class="nu-exo"><div class="nu-consigne"><b>1.</b> <span class="consigne">Écris chaque nombre en lettres.</span></div><div class="nu-lignes"><div>12</div></div></div>`
  + `<table><tr><th>n°</th><th class="corrige">Réponse</th></tr><tr><td>1</td><td class="corrige"><b>14</b></td></tr></table></div>`
  + `<div class="page corrige"><div class="titre">Corrigé</div><div class="nu-exo"><div>douze</div></div></div></div>`;

describe("ce qui s'imprime sur la feuille", () => {
  it("se garde par atelier : la consigne va aux tablettes, le reste s'imprime tant qu'on ne l'a pas décoché", () => {
    expect(cleOptionsFeuille("heure")).toBe("fabriquer:feuille:heure");
    expect(OPTIONS_FEUILLE).toEqual({ consigne: false, prenom: true, corrige: true, tablettes: true });
    expect(lireOptionsFeuille(null)).toEqual(OPTIONS_FEUILLE);
    expect(lireOptionsFeuille("{pas un objet")).toEqual(OPTIONS_FEUILLE);
    expect(lireOptionsFeuille("[]")).toEqual(OPTIONS_FEUILLE);
    expect(lireOptionsFeuille(ecrireOptionsFeuille({ consigne: true, prenom: false, corrige: true, tablettes: false })))
      .toEqual({ consigne: true, prenom: false, corrige: true, tablettes: false });
  });

  it("relit les choix d'avant les tablettes : la consigne y passe, le prénom et la correction restent comme on les avait laissés", () => {
    expect(lireOptionsFeuille('{"consigne":true,"prenom":true,"corrige":false}')).toEqual({ consigne: false, prenom: true, corrige: false, tablettes: true });
    expect(lireOptionsFeuille('{"consigne":false,"prenom":false,"corrige":true}')).toEqual({ consigne: false, prenom: false, corrige: true, tablettes: true });
    expect(lireOptionsFeuille('{"corrige":false,"autre":1}')).toEqual({ consigne: false, prenom: true, corrige: false, tablettes: true });
  });

  it("donne aux tablettes la règle et les consignes en bloc de la feuille, entières, dans l'ordre ; la consigne d'un exercice reste avec lui", () => {
    expect(consignesDeLaFeuille(feuille)).toEqual([
      `<div class="regle"><b>La règle</b>On lit, puis on <span style="color:#687087">écrit</span>.</div>`,
    ]);
    expect(consignesDeLaFeuille(`<p class="consigne">Relie.</p><div class="x"><div class="consigne a">Colle.</div></div>`))
      .toEqual([`<p class="consigne">Relie.</p>`, `<div class="consigne a">Colle.</div>`]);
    expect(consignesDeLaFeuille(`<div class="page"><p>Rien</p></div>`)).toEqual([]);
  });

  it("retire un élément entier, ce qu'il contient compris, sans toucher au reste", () => {
    expect(retirerElements(`<div class="a"><div class="b"><div>x</div></div><div>y</div></div><p class="b">z</p>`, (c) => c.includes("b")))
      .toBe(`<div class="a"><div>y</div></div>`);
    expect(retirerElements(`<p>rien à retirer</p>`, () => true)).toBe(`<p>rien à retirer</p>`);
    // Une balise jamais refermée reste telle quelle plutôt que d'emporter la page.
    expect(retirerElements(`<div class="b">ouverte<p>x</p>`, (c) => c.includes("b"))).toBe(`<div class="b">ouverte<p>x</p>`);
  });

  it("sait ce que la feuille contient, pour ne proposer que les cases utiles", () => {
    expect(contenuDeLaFeuille(feuille)).toEqual({ consigne: true, prenom: true, corrige: true, tablettes: true });
    expect(contenuDeLaFeuille(`<div class="feuille"><div class="page"><div class="he-corrige">x</div></div></div>`))
      .toEqual({ consigne: false, prenom: false, corrige: false, tablettes: false });
  });

  it("sort la feuille sans la correction, sans la consigne, sans le prénom", () => {
    expect(appliquerOptionsFeuille(feuille, TOUT)).toBe(feuille);
    // Par défaut, la feuille sort sans sa consigne : elle est sur les tablettes.
    expect(appliquerOptionsFeuille(feuille, OPTIONS_FEUILLE)).toBe(appliquerOptionsFeuille(feuille, { ...TOUT, consigne: false }));
    const sansCorrige = appliquerOptionsFeuille(feuille, { ...TOUT, corrige: false });
    expect(sansCorrige).not.toContain("Corrigé");
    expect(sansCorrige).not.toContain("Réponse");
    expect(sansCorrige).toContain(`<table><tr><th>n°</th></tr><tr><td>1</td></tr></table>`);
    expect(sansCorrige).toContain("Écris chaque nombre");
    const sansConsigne = appliquerOptionsFeuille(feuille, { ...TOUT, consigne: false });
    expect(sansConsigne).not.toContain("La règle");
    // La consigne de l'exercice, écrite dans sa ligne, reste avec lui : seule la règle va aux tablettes.
    expect(sansConsigne).toContain(`<div class="nu-consigne"><b>1.</b> <span class="consigne">Écris chaque nombre en lettres.</span></div>`);
    expect(sansConsigne).toContain("Corrigé");
    const sansPrenom = appliquerOptionsFeuille(feuille, { ...TOUT, prenom: false });
    expect(sansPrenom).not.toContain("Prénom");
    expect(sansPrenom).toContain(`<div class="titre">Numération</div><div class="regle">`);
  });

  it("publie ce que l'aperçu connaît, et ne prévient que si cela change", () => {
    let appels = 0;
    const arreter = feuillesPubliees.abonner(() => { appels++; });
    feuillesPubliees.publier("heure", TOUT);
    feuillesPubliees.publier("heure", { ...TOUT });
    expect(appels).toBe(1);
    expect(feuillesPubliees.lire("heure")).toEqual(TOUT);
    expect(feuillesPubliees.lire("inconnu")).toEqual({ consigne: false, prenom: false, corrige: false, tablettes: false });
    arreter();
  });
});
