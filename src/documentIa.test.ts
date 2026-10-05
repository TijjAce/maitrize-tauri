import { describe, it, expect } from "vitest";
import {
  SUGGESTIONS_DOCUMENT, consigneDocument, estUnDocument, feuilleDuDocument, markdownVersHtml, titreDuDocument,
} from "./documentIa";

describe("le Markdown d'un document", () => {
  it("échappe tout avant de mettre en forme : le modèle n'écrit jamais de code", () => {
    const html = markdownVersHtml("<script>alert(1)</script> et **gras** et [lien](https://a.fr/x\"onmouseover=\"y)");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("<strong>gras</strong>");
    // Le guillemet est échappé avant tout : il ne referme pas l'attribut.
    expect(html).toContain('href="https://a.fr/x&quot;onmouseover=&quot;y"');
    expect(html).not.toContain('onmouseover="');
  });

  it("met les titres au bon niveau : h2 dans la conversation, h1 sur le papier", () => {
    const md = "# Titre\n## Partie\n### Détail";
    expect(markdownVersHtml(md)).toBe("<h2>Titre</h2><h3>Partie</h3><h4>Détail</h4>");
    expect(markdownVersHtml(md, { titres: "impression" })).toBe("<h1>Titre</h1><h2>Partie</h2><h3>Détail</h3>");
  });

  it("connaît les lignes à écrire, les cases à cocher et le changement de page", () => {
    const html = markdownVersHtml("Réponse : ______\n- [ ] je range\n- [x] fini\n[page]\nSuite");
    expect(html).toContain('<p>Réponse : <span class="ligne"></span></p>');
    // La case sert de puce.
    expect(html).toContain('<li class="tache"><span class="case"></span> je range</li>');
    expect(html).toContain('<li class="tache"><span class="case cochee"></span> fini</li>');
    expect(html).toContain('<div class="saut"></div><p>Suite</p>');
  });

  it("fait des listes, des citations, des filets et des tableaux", () => {
    const md = "1. un\n2) deux\n\n- a\n- b\n> note\n---\n| Jour | Score |\n|---|---|\n| lundi | 12 |\n| mardi | 15 |\nfin";
    const html = markdownVersHtml(md);
    expect(html).toContain("<ol><li>un</li><li>deux</li></ol>");
    expect(html).toContain("<ul><li>a</li><li>b</li></ul>");
    expect(html).toContain("<blockquote>note</blockquote><hr>");
    expect(html).toContain("<table><thead><tr><th>Jour</th><th>Score</th></tr></thead><tbody><tr><td>lundi</td><td>12</td></tr><tr><td>mardi</td><td>15</td></tr></tbody></table><p>fin</p>");
    // Une liste qui bute sur un tableau se ferme proprement.
    expect(markdownVersHtml("- a\n| x |\n|---|\n| 1 |")).toBe("<ul><li>a</li></ul><table><thead><tr><th>x</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>");
    expect(markdownVersHtml("")).toBe("");
  });

  it("garde dans l'exercice ses lignes en retrait, et sa numérotation après un paragraphe", () => {
    const md = "1. Léa a 12 bonbons.\n   Calcul : ______\n   Réponse : ______\n2. Tom a 20 billes.\n\nOn passe à la suite.\n\n3. Zoé a 8 pommes.";
    const html = markdownVersHtml(md);
    expect(html).toContain('<li>Léa a 12 bonbons.<br>Calcul : <span class="ligne"></span><br>Réponse : <span class="ligne"></span></li>');
    expect(html).toContain("<li>Tom a 20 billes.</li></ol>");
    expect(html).toContain('<ol start="3"><li>Zoé a 8 pommes.</li></ol>');
  });
});

describe("le Markdown d'un fichier .md, écrit à la main ou ailleurs", () => {
  const imp = (md: string) => markdownVersHtml(md, { titres: "impression" });

  it("a des titres jusqu'à six niveaux, sans leurs dièses de fin", () => {
    expect(imp("#### Quatre\n##### Cinq\n###### Six")).toBe("<h4>Quatre</h4><h5>Cinq</h5><h6>Six</h6>");
    expect(markdownVersHtml("#### Quatre\n###### Six")).toBe("<h5>Quatre</h5><h6>Six</h6>");
    expect(imp("## Partie ##\n# Le langage C#")).toBe("<h2>Partie</h2><h1>Le langage C#</h1>");
    expect(imp("#mot-clé")).toBe("<p>#mot-clé</p>");
  });

  it("garde les blocs de code tels quels, échappés", () => {
    expect(imp("```js\nconst a = 1 < 2;\n  **pas gras**\n```\nfin")).toBe("<pre><code>const a = 1 &lt; 2;\n  **pas gras**</code></pre><p>fin</p>");
    expect(imp("~~~\n# pas un titre\n~~~")).toBe("<pre><code># pas un titre</code></pre>");
    // Un bloc jamais refermé va jusqu'au bout ; « ```mot``` » sur une ligne n'ouvre rien.
    expect(imp("- a\n```\nx")).toBe("<ul><li>a</li></ul><pre><code>x</code></pre>");
    expect(imp("```mot```")).toBe("<p><code>mot</code></p>");
    expect(imp("`` a ` b `` et `c`")).toBe("<p><code>a ` b</code> et <code>c</code></p>");
  });

  it("imbrique les listes selon leur retrait, et les garde ouvertes par-dessus une ligne vide", () => {
    expect(imp("- a\n  - a1\n    - a1x\n  - a2\n- b")).toBe("<ul><li>a<ul><li>a1<ul><li>a1x</li></ul></li><li>a2</li></ul></li><li>b</li></ul>");
    expect(imp("1. un\n   - détail\n2. deux")).toBe("<ol><li>un<ul><li>détail</li></ul></li><li>deux</li></ol>");
    expect(imp("- a\n\t+ b")).toBe("<ul><li>a<ul><li>b</li></ul></li></ul>");
    expect(imp("- a\n\n- b")).toBe("<ul><li>a</li><li>b</li></ul>");
    expect(imp("- a\n  1. x\n  - y")).toBe("<ul><li>a<ol><li>x</li></ol><ul><li>y</li></ul></li></ul>");
  });

  it("met en forme le barré, le souligné, les images et les liens vers d'autres fichiers", () => {
    const html = imp("~~barré~~ __gras__ _penché_ un_nom_composé `**brut**` ![le chat](https://a.fr/c.png) [mes notes](notes.md)");
    expect(html).toContain("<del>barré</del>");
    expect(html).toContain("<strong>gras</strong>");
    expect(html).toContain("<em>penché</em>");
    expect(html).toContain("un_nom_composé");
    expect(html).toContain("<code>**brut**</code>");
    // Rien ne se charge depuis Internet : l'image devient un lien.
    expect(html).toContain('<a href="https://a.fr/c.png" target="_blank" rel="noreferrer">🖼 le chat</a>');
    expect(html).not.toContain("<img");
    expect(html).toContain(" mes notes</p>");
    // Le souligné ne touche pas aux liens.
    expect(imp("[lien](https://a.fr/_x_) _ et _")).toContain('<a href="https://a.fr/_x_" target="_blank" rel="noreferrer">lien</a>');
  });

  it("fait une citation des lignes qui se suivent, un filet de « * * * », et lit les fins de ligne Windows", () => {
    expect(imp("> un\n> deux\n\n> trois")).toBe("<blockquote>un<br>deux</blockquote><blockquote>trois</blockquote>");
    expect(imp("* * *")).toBe("<hr>");
    // « ______ » seul reste une ligne où l'élève écrit.
    expect(imp("______")).toBe('<p><span class="ligne"></span></p>');
    expect(imp("# Titre\r\n- a\r\n")).toBe("<h1>Titre</h1><ul><li>a</li></ul>");
  });
});

describe("le document lui-même", () => {
  it("prend son titre au premier « # », sinon à la première ligne", () => {
    expect(titreDuDocument("Bonjour\n# La **fiche** de lecture\n## suite")).toBe("La fiche de lecture");
    expect(titreDuDocument("\n\n## Seulement des parties\ntexte")).toBe("Seulement des parties");
    expect(titreDuDocument("   ")).toBe("Document");
    expect(titreDuDocument("# " + "x".repeat(200))).toHaveLength(80);
  });

  it("reconnaît un document à sa forme", () => {
    expect(estUnDocument("# Fiche\ntexte")).toBe(true);
    expect(estUnDocument("## Un\n## Deux")).toBe(true);
    expect(estUnDocument("Voici trois idées :\n- a\n- b")).toBe(false);
  });

  it("donne une feuille prête à imprimer, sur le papier avec un h1", () => {
    const f = feuilleDuDocument("# Les fractions\nPrénom : ______ Date : ______\n## Exercice 1\n1. Colorie la moitié.");
    expect(f.titre).toBe("Les fractions");
    expect(f.corps).toContain('<div class="doc-ia"><h1>Les fractions</h1>');
    expect(f.corps).toContain('<span class="ligne"></span>');
    expect(f.style).toContain(".doc-ia .saut");
  });

  it("dit au modèle les conventions du document, et propose des départs", () => {
    const c = consigneDocument();
    for (const mot of ["Markdown", "# ", "______", "[ ]", "[page]", "Prénom", "IME"]) expect(c).toContain(mot);
    expect(SUGGESTIONS_DOCUMENT.length).toBeGreaterThanOrEqual(3);
  });
});
