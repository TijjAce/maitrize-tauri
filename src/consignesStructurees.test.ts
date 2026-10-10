import { describe, it, expect } from "vitest";
import { etapesDe, sorteDe, structurerConsignesHtml, verbeEnTete } from "./consignesStructurees";

const DICTEE = "1. Je lis le texte en silence, puis à voix haute. 2. Je compte. 3. Je le copie en disant tout ce que j'écris, en sautant une ligne. "
  + "4. Je vérifie : si je me suis trompé, je ne raye pas, je fais un petit trait dessous et je réécris le mot au-dessus.";

describe("des consignes qu'on reconnaît d'un coup d'œil", () => {
  it("découpe la numérotation qu'une consigne porte déjà, une action par ligne", () => {
    const e = etapesDe(DICTEE);
    expect(e.map((x) => x.sorte)).toEqual(["action", "action", "action", "action"]);
    expect(e[1].html).toBe("Je compte.");
    expect(e.map((x) => verbeEnTete(x.html))).toEqual(["lis", "compte", "copie", "vérifie"]);
  });

  it("ne prend pas un numéro de page pour une étape", () => {
    expect(etapesDe("Lis la page 3. Puis écris la réponse.").map((x) => x.html)).toEqual(["Lis la page 3.", "Puis écris la réponse."]);
  });

  it("met à part ce qui aide, ce qui montre, ce qui dit qu'on a réussi", () => {
    expect(sorteDe("Aide : regarde la bande numérique.")).toBe("aide");
    expect(sorteDe("Exemple : 3 + 4 = 7.")).toBe("exemple");
    expect(sorteDe("J'ai réussi si tous les mots sont bien écrits.")).toBe("critere");
    expect(sorteDe("Opérations permises : +, −.")).toBe("info");
    expect(sorteDe("Découpe les étiquettes.")).toBe("action");
  });

  it("structure la consigne d'une feuille : numéros, verbe en valeur, paragraphe devenu bloc", () => {
    const html = structurerConsignesHtml(`<div class="feuille"><div class="regle">${DICTEE}</div><p>Le texte.</p></div>`);
    expect(html).toContain('<div class="regle cs"><ol class="cs-etapes">');
    expect(html).toContain('<span class="cs-num">2</span><span class="cs-texte">Je <b class="cs-verbe">compte</b>.</span>');
    expect(html).toContain("<p>Le texte.</p>");
    const p = structurerConsignesHtml('<p class="consigne" style="margin:0">Compte les cubes et écris le nombre.</p>');
    expect(p).toBe('<div class="consigne cs" style="margin:0"><ol class="cs-etapes"><li class="cs-etape cs-action">'
      + '<span class="cs-num cs-seule" aria-hidden="true">▸</span><span class="cs-texte"><b class="cs-verbe">Compte</b> les cubes et écris le nombre.</span></li></ol></div>');
  });

  it("garde les titres d'une règle encadrée, et ses références à la fin", () => {
    const html = structurerConsignesHtml('<div class="regle"><b>Fabrication</b>Découper le cadre et ses fentes. Glisser les bandes dans les fentes.'
      + '<br><b>Jeu</b>Lis la syllabe qui apparaît. <span class="reference">Livret CP, Éduscol 2025.</span></div>');
    expect(html).toContain('<div class="cs-titre">Fabrication</div><ol class="cs-etapes">');
    expect(html).toContain('<span class="cs-num">1</span><span class="cs-texte"><b class="cs-verbe">Découper</b> le cadre et ses fentes.</span>');
    expect(html).toContain('<div class="cs-titre">Jeu</div>');
    expect(html.endsWith(' <span class="reference">Livret CP, Éduscol 2025.</span></div>')).toBe(true);
    // Un gras au milieu d'une phrase, ou suivi de deux-points, n'est pas un titre.
    const milieu = structurerConsignesHtml('<p class="consigne">Écris le mot <b>en majuscules</b>.</p>');
    expect(milieu).not.toContain("cs-titre");
    expect(milieu).toContain("<b>en majuscules</b>");
  });

  it("laisse ce qu'elle ne sait pas découper sans risque : une consigne déjà structurée, ou qui contient des blocs", () => {
    const deja = '<div class="consigne cs"><ol class="cs-etapes"><li>x</li></ol></div>';
    expect(structurerConsignesHtml(deja)).toBe(deja);
    const blocs = '<div class="regle"><div class="a">Lis.</div><div class="b">Écris.</div></div>';
    expect(structurerConsignesHtml(blocs)).toBe(blocs);
    const titre = '<h3 class="consigne">Lis</h3>';
    expect(structurerConsignesHtml(titre)).toBe(titre);
  });
});

describe("le verbe d'action", () => {
  it("se trouve aussi avec son pronom, après un mot de liaison, et pour les impératifs que le lexique n'a pas", () => {
    expect(verbeEnTete("Écris-le en cursive.")).toBe("Écris");
    expect(verbeEnTete("Relis-toi avant de rendre.")).toBe("Relis");
    expect(verbeEnTete("Puis reproduis la figure.")).toBe("reproduis");
    expect(verbeEnTete("Pique la pointe du compas sur le centre O.")).toBe("Pique");
    expect(verbeEnTete("Je suis content de ma réponse.")).toBeNull();
    expect(verbeEnTete("Le périmètre, c'est la longueur du tour.")).toBeNull();
  });
});
