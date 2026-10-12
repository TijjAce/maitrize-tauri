import { describe, it, expect } from "vitest";
import {
  OPTIONS_FEUILLE, appliquerOptionsFeuille, cleOptionsFeuille, consignesDeLaFeuille, contenuDeLaFeuille, ecrireOptionsFeuille, feuilleSelonOptions,
  feuillesPubliees, lireOptionsFeuille, rappelsDansLeCorrige, retirerElements, sansLesAides,
} from "./optionsFeuille";

/** Tout sur la feuille, et la consigne aux tablettes aussi. */
const TOUT = { consigne: true, prenom: true, corrige: true, aide: true, tablettes: true };

const feuille = `<div class="feuille nu"><div class="page"><div class="titre">Numération</div><div class="sous">Prénom : ........ Date : ........</div>`
  + `<div class="regle"><b>La règle</b>On lit, puis on <span style="color:#687087">écrit</span>.</div>`
  + `<div class="nu-exo"><div class="nu-consigne"><b>1.</b> <span class="consigne">Écris chaque nombre en lettres.</span></div><div class="nu-lignes"><div>12</div></div></div>`
  + `<table><tr><th>n°</th><th class="corrige">Réponse</th></tr><tr><td>1</td><td class="corrige"><b>14</b></td></tr></table></div>`
  + `<div class="page corrige"><div class="titre">Corrigé</div><div class="nu-exo"><div>douze</div></div></div></div>`;

/** La même, sans consigne d'exercice : un relevé, où l'on écrit dans les cases. */
const sansExercice = feuille.replace(`<div class="nu-exo"><div class="nu-consigne"><b>1.</b> <span class="consigne">Écris chaque nombre en lettres.</span></div><div class="nu-lignes"><div>12</div></div></div>`, "");

describe("ce qui s'imprime sur la feuille", () => {
  it("se garde par atelier : la consigne va aux tablettes, le reste s'imprime tant qu'on ne l'a pas décoché", () => {
    expect(cleOptionsFeuille("heure")).toBe("fabriquer:feuille:heure");
    expect(OPTIONS_FEUILLE).toEqual({ consigne: false, prenom: true, corrige: true, aide: false, tablettes: true });
    expect(lireOptionsFeuille(null)).toEqual(OPTIONS_FEUILLE);
    expect(lireOptionsFeuille("{pas un objet")).toEqual(OPTIONS_FEUILLE);
    expect(lireOptionsFeuille("[]")).toEqual(OPTIONS_FEUILLE);
    expect(lireOptionsFeuille(ecrireOptionsFeuille({ consigne: true, prenom: false, corrige: true, aide: true, tablettes: false })))
      .toEqual({ consigne: true, prenom: false, corrige: true, aide: true, tablettes: false });
  });

  it("relit les choix d'avant les tablettes : la consigne y passe, le prénom et la correction restent comme on les avait laissés", () => {
    expect(lireOptionsFeuille('{"consigne":true,"prenom":true,"corrige":false}')).toEqual({ consigne: false, prenom: true, corrige: false, aide: false, tablettes: true });
    expect(lireOptionsFeuille('{"consigne":false,"prenom":false,"corrige":true}')).toEqual({ consigne: false, prenom: false, corrige: true, aide: false, tablettes: true });
    expect(lireOptionsFeuille('{"corrige":false,"autre":1}')).toEqual({ consigne: false, prenom: true, corrige: false, aide: false, tablettes: true });
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
    // Ses exercices portent leur consigne sur le papier : la sienne y reste, la case n'y ferait rien ; les tablettes la reçoivent quand même.
    expect(contenuDeLaFeuille(feuille)).toEqual({ consigne: false, prenom: true, corrige: true, aide: false, tablettes: true });
    expect(contenuDeLaFeuille(sansExercice)).toEqual({ consigne: true, prenom: true, corrige: true, aide: false, tablettes: true });
    expect(contenuDeLaFeuille(`<div class="feuille"><div class="page"><div class="he-corrige">x</div></div></div>`))
      .toEqual({ consigne: false, prenom: false, corrige: false, aide: false, tablettes: false });
    // Une aide : le rappel de la leçon, ou une ligne « Je peux… » d'une consigne.
    expect(contenuDeLaFeuille(`<div class="page"><div class="rappel">Le verbe s'accorde avec son sujet.</div></div>`).aide).toBe(true);
    expect(contenuDeLaFeuille(`<div class="page"><div class="regle">Lis le texte. Tu peux prendre un mot de la boîte.</div></div>`).aide).toBe(true);
  });

  it("sort la feuille sans la correction, sans la consigne, sans le prénom", () => {
    expect(appliquerOptionsFeuille(feuille, TOUT)).toBe(feuille);
    // Par défaut, la feuille sort sans sa consigne : elle est sur les tablettes.
    expect(appliquerOptionsFeuille(sansExercice, OPTIONS_FEUILLE)).toBe(appliquerOptionsFeuille(sansExercice, { ...TOUT, consigne: false }));
    expect(appliquerOptionsFeuille(sansExercice, OPTIONS_FEUILLE)).not.toContain("La règle");
    // Mais quand un exercice porte sa consigne sur le papier, celle de la feuille y reste aussi : le premier exercice n'est pas laissé sans elle.
    expect(appliquerOptionsFeuille(feuille, OPTIONS_FEUILLE)).toContain("La règle");
    const sansCorrige = appliquerOptionsFeuille(feuille, { ...TOUT, corrige: false });
    expect(sansCorrige).not.toContain("Corrigé");
    expect(sansCorrige).not.toContain("Réponse");
    expect(sansCorrige).toContain(`<table><tr><th>n°</th></tr><tr><td>1</td></tr></table>`);
    expect(sansCorrige).toContain("Écris chaque nombre");
    const sansConsigne = appliquerOptionsFeuille(sansExercice, { ...TOUT, consigne: false });
    expect(sansConsigne).not.toContain("La règle");
    // La consigne de l'exercice reste avec lui.
    expect(appliquerOptionsFeuille(feuille, { ...TOUT, consigne: false }))
      .toContain(`<div class="nu-consigne"><b>1.</b> <span class="consigne">Écris chaque nombre en lettres.</span></div>`);
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
    expect(feuillesPubliees.lire("inconnu")).toEqual({ consigne: false, prenom: false, corrige: false, aide: false, tablettes: false });
    arreter();
  });
});

describe("les aides, hors de la feuille tant qu'on ne les y met pas", () => {
  const page = `<div class="page"><div class="titre">Le sujet et le verbe</div><div class="rappel">Le verbe s'accorde avec son sujet.</div>`
    + `<div class="regle">Relie chaque sujet à son verbe. Tu peux t'aider des couleurs.</div><table class="gr-relier"></table></div>`;
  const corrige = `<div class="page corrige"><div class="titre">Le sujet et le verbe — corrigé</div><div class="gr-corrige">il chante</div></div>`;

  it("le rappel de la leçon passe sous le titre de la correction ; sans correction, il ne s'imprime pas", () => {
    expect(rappelsDansLeCorrige(page + corrige)).toBe(page.replace(`<div class="rappel">Le verbe s'accorde avec son sujet.</div>`, "")
      + `<div class="page corrige"><div class="titre">Le sujet et le verbe — corrigé</div><div class="rappel">Le verbe s'accorde avec son sujet.</div><div class="gr-corrige">il chante</div></div>`);
    expect(appliquerOptionsFeuille(page + corrige, { ...TOUT, aide: false, corrige: false })).not.toContain("s'accorde");
    expect(appliquerOptionsFeuille(page + corrige, TOUT)).toBe(page + corrige);
  });

  it("par défaut, ni rappel ni ligne d'aide sur la feuille ; cochées, elles y sont", () => {
    const sans = feuilleSelonOptions(page, { ...TOUT, aide: false });
    expect(sans).not.toContain("s'accorde");
    expect(sans).not.toContain("couleurs");
    expect(sans).toContain(`<b class="cs-verbe">relie</b>`);
    const avec = feuilleSelonOptions(page, TOUT);
    expect(avec).toContain(`<div class="rappel">Le verbe s'accorde avec son sujet.</div>`);
    expect(avec).toContain(`<li class="cs-etape cs-aide">`);
  });

  it("une consigne qui n'avait que des aides disparaît avec elles", () => {
    expect(sansLesAides(`<div class="regle cs"><ol class="cs-etapes"><li class="cs-etape cs-aide"><span class="cs-texte">Je peux m'aider.</span></li></ol></div><p>x</p>`))
      .toBe(`<p>x</p>`);
  });
});
