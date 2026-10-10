import { describe, it, expect } from "vitest";
import { enActions, etapesDe, sorteDe, structurerConsignesHtml, verbeEnTete } from "./consignesStructurees";

const DICTEE = "1. Je lis le texte en silence, puis à voix haute. 2. Je compte. 3. Je le copie en disant tout ce que j'écris, en sautant une ligne. "
  + "4. Je vérifie : si je me suis trompé, je ne raye pas, je fais un petit trait dessous et je réécris le mot au-dessus.";

describe("des consignes qu'on reconnaît d'un coup d'œil", () => {
  it("découpe la numérotation qu'une consigne porte déjà, une action par ligne", () => {
    const e = etapesDe(DICTEE);
    expect(e.map((x) => x.sorte)).toEqual(["action", "action", "action", "action"]);
    expect(e[1].html).toBe("Je compte.");
    expect(e.map((x) => verbeEnTete(x.html))).toEqual(["lis", "compte", "copie", "vérifie"]);
  });

  it("coupe une étape qui enchaîne plusieurs actions : une phrase, une action", () => {
    expect(enActions("J'écoute, je répète, j'écris en disant ce que j'écris.")).toEqual(["J'écoute.", "Je répète.", "J'écris en disant ce que j'écris."]);
    expect(enActions("Puis je retrouve le texte caché et je vérifie.")).toEqual(["Puis je retrouve le texte caché.", "Je vérifie."]);
    expect(enActions("Compte les cubes et écris le nombre.")).toEqual(["Compte les cubes.", "Écris le nombre."]);
    expect(enActions("Écoute bien, puis réponds.")).toEqual(["Écoute bien.", "Puis réponds."]);
    expect(enActions("<b>Lis</b> la phrase, trouve le verbe et souligne-le.")).toEqual(["<b>Lis</b> la phrase.", "Trouve le verbe.", "Souligne-le."]);
    expect(enActions("Compare leurs longueurs — avec une bande, ou en les mesurant —, puis range-les.")).toEqual(
      ["Compare leurs longueurs — avec une bande, ou en les mesurant.", "Puis range-les."]);
    // Après « je », « on », le verbe : même hors du lexique des pictos, chaque morceau reste une action.
    const cache = etapesDe("1. Je le cache et je l'écris. 2. On dit la réponse, on corrige, on passe au suivant.");
    expect(cache.map((e) => [e.sorte, e.html])).toEqual([["action", "Je le cache."], ["action", "Je l'écris."],
      ["action", "On dit la réponse."], ["action", "On corrige, on passe au suivant."]]);
    // « On » dit aussi une vérité générale : hors du lexique, ce n'est pas une action.
    expect(sorteDe("On ne parle pas de la même manière en classe et dans la cour.")).toBe("info");
    // Ce qui est permis aide ; ce qui est demandé est une action.
    expect(sorteDe("Je peux prendre un mot de la boîte.")).toBe("aide");
    expect(sorteDe("Tu n'es pas obligé de tracer l'arbre.")).toBe("aide");
  });

  it("ne coupe ni une manière de faire, ni une condition, ni ce qui n'est pas une action", () => {
    for (const phrase of [
      "Je le copie en disant tout ce que j'écris, en sautant une ligne.",
      "Lis le texte en silence, puis à voix haute.",
      "Je vérifie : si je me suis trompé, je ne raye pas, je fais un petit trait dessous et je réécris le mot au-dessus.",
      "Quand tu as vérifié, colle la bonne étiquette.",
      "Écris le mot et son déterminant.",
      "Pour trouver un nombre, suis la ligne et la colonne : il est dans la case où elles se croisent.",
      "Dis (lentement, puis vite) le mot.",
      "Attention : lis, puis écris.",
      // Après deux-points, une énumération ou une explication.
      "Remplace le groupe sujet par un pronom : il, elle, nous, vous, ils, elles.",
      "Écris l'infinitif de chaque verbe : ils plieront, tu as plié, vous pliez → plier.",
      "Écris un nouvel épisode : un autre animal répond, et dit où il était.",
      // « la barre » en tête, sans sujet : un article et un nom.
      "Trace, à la règle, la barre de chaque réponse.",
    ]) expect(enActions(phrase)).toEqual([phrase]);
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

  it("marque une aide, un exemple, une réussite d'un dessin à la place du numéro ; une information n'a pas de marque", () => {
    const html = structurerConsignesHtml('<div class="regle">1. Lis les mots.<br>2. Entoure les mots avec [a].<br>Attention : il y a 4 mots.'
      + "<br>Exemple : chat.<br>J'ai réussi si j'ai entouré 4 mots.<br>Les mots sont dans le cadre.</div>");
    expect(html).toContain('<li class="cs-etape cs-aide"><span class="cs-num cs-marque cs-marque-aide" aria-hidden="true">&#8203;</span>'
      + '<span class="cs-texte"><b class="cs-libelle">Attention</b> : il y a 4 mots.</span></li>');
    expect(html).toContain('<span class="cs-num cs-marque cs-marque-exemple" aria-hidden="true">&#8203;</span>');
    expect(html).toContain('<span class="cs-num cs-marque cs-marque-critere" aria-hidden="true">&#8203;</span>');
    expect(html).toContain('<li class="cs-etape cs-info"><span class="cs-texte">Les mots sont dans le cadre.</span></li>');
  });

  it("structure la consigne d'une feuille : numéros, verbe en valeur, paragraphe devenu bloc", () => {
    const html = structurerConsignesHtml(`<div class="feuille"><div class="regle">${DICTEE}</div><p>Le texte.</p></div>`);
    expect(html).toContain('<div class="regle cs"><ol class="cs-etapes">');
    expect(html).toContain('<span class="cs-num">2</span><span class="cs-texte">Je <b class="cs-verbe">compte</b>.</span>');
    expect(html).toContain("<p>Le texte.</p>");
    const p = structurerConsignesHtml('<p class="consigne" style="margin:0">Compte les cubes.</p>');
    expect(p).toBe('<div class="consigne cs" style="margin:0"><ol class="cs-etapes"><li class="cs-etape cs-action">'
      + '<span class="cs-num cs-seule" aria-hidden="true">▸</span><span class="cs-texte"><b class="cs-verbe">Compte</b> les cubes.</span></li></ol></div>');
    // Deux actions dans une phrase : deux étapes, numérotées.
    expect(structurerConsignesHtml('<p class="consigne">Compte les cubes et écris le nombre.</p>')).toContain(
      '<span class="cs-num">1</span><span class="cs-texte"><b class="cs-verbe">Compte</b> les cubes.</span></li><li class="cs-etape cs-action">'
      + '<span class="cs-num">2</span><span class="cs-texte"><b class="cs-verbe">Écris</b> le nombre.</span>');
  });

  it("garde les titres d'une règle encadrée, et ses références à la fin", () => {
    const html = structurerConsignesHtml('<div class="regle"><b>Fabrication</b>Découper le cadre et ses fentes. Glisser les bandes dans les fentes.'
      + '<br><b>Jeu</b>Lis la syllabe qui apparaît. <span class="reference">Livret CP, Éduscol 2025.</span></div>');
    expect(html).toContain('<div class="cs-titre">Fabrication</div><ol class="cs-etapes">');
    expect(html).toContain('<span class="cs-num">1</span><span class="cs-texte"><b class="cs-verbe">Découper</b> le cadre et ses fentes.</span>');
    expect(html).toContain('<div class="cs-titre">Jeu</div>');
    expect(html.endsWith(' <span class="reference">Livret CP, Éduscol 2025.</span></div>')).toBe(true);
    // Un gras collé au mot suivant, après une phrase finie, est un titre que la règle posait sur sa ligne.
    const bataille = structurerConsignesHtml('<div class="regle"><b>Se tester</b>On lit la carte. <b style="margin-top:4px">Bataille</b>Chacun retourne une carte.</div>');
    expect(bataille).toContain('<div class="cs-titre">Bataille</div>');
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
    // Après un auxiliaire, le verbe dit ce qui est fait, pas ce qu'il faut faire.
    expect(verbeEnTete("Le chemin du robot est tracé jusqu'à l'étoile.")).toBeNull();
    expect(verbeEnTete("Chaque joueur lit une carte.")).toBe("lit");
    // Après le sujet et ses pronoms, le verbe, même hors du lexique ; être et avoir disent un état.
    expect(verbeEnTete("Je me mets d'accord avec mon voisin.")).toBe("mets");
    expect(verbeEnTete("Puis je recompose la somme.")).toBe("recompose");
    expect(verbeEnTete("Je me suis trompé.")).toBeNull();
  });
});
