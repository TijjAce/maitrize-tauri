import { describe, it, expect } from "vitest";
import { estHtml, nettoyerHtml, versHtml, texteBrut, texteVersHtmlEnLigne } from "./texteRiche";

describe("nettoyerHtml", () => {
  it("garde la mise en forme simple", () => {
    const html = "<h1>Trame</h1><p><b>Séance 1</b> : <i>loto</i> <u>des</u> animaux</p><ul><li>un</li><li>deux</li></ul>";
    expect(nettoyerHtml(html)).toBe(html);
  });

  it("retire scripts, gestionnaires, liens et images", () => {
    expect(nettoyerHtml('<p onclick="alert(1)">a</p><script>alert(2)</script><img src=x onerror=alert(3)><a href="javascript:x">b</a>'))
      .toBe("<p>a</p>b");
    expect(nettoyerHtml("<style>p{}</style><iframe src='x'></iframe><svg><script>1</script></svg>c")).toBe("c");
    expect(nettoyerHtml("<p style=\"color:red;background:url(x)\">d</p>")).toBe("<p>d</p>");
  });

  it("garde l'alignement et le surlignage, rien d'autre", () => {
    expect(nettoyerHtml('<p style="text-align: center;">e</p>')).toBe('<p style="text-align: center;">e</p>');
    expect(nettoyerHtml('<span style="background-color: rgb(255, 240, 120);">f</span>'))
      .toBe('<span style="background-color: rgb(255, 240, 120);">f</span>');
    expect(nettoyerHtml('<span style="background-color: url(javascript:x)">g</span>')).toBe("<span>g</span>");
  });

  it("neutralise un chevron isolé", () => {
    expect(nettoyerHtml("3 < 5 et 5 > 3")).toBe("3 &lt; 5 et 5 &gt; 3");
  });
});

describe("versHtml / texteBrut", () => {
  it("transforme un ancien texte brut en paragraphes, sans rien interpréter", () => {
    expect(versHtml("Première séance\nloto <ARASAAC>\n\nDeuxième")).toBe("<p>Première séance<br>loto &lt;ARASAAC&gt;</p><p>Deuxième</p>");
    expect(versHtml("   ")).toBe("");
    expect(estHtml("Juste du texte, 3 < 4")).toBe(false);
  });

  it("rend le texte lisible d'un contenu mis en forme", () => {
    expect(texteBrut("<h1>Trame</h1><p>Séance 1 &amp; 2<br>loto</p><ul><li>un</li><li>deux</li></ul>"))
      .toBe("Trame\nSéance 1 & 2\nloto\n• un\n• deux");
    expect(texteBrut("texte brut\nconservé")).toBe("texte brut\nconservé");
  });

  it("insère une proposition en échappant le texte", () => {
    expect(texteVersHtmlEnLigne(" Ligne 1\n<b>Ligne 2</b> ")).toBe("Ligne 1<br>&lt;b&gt;Ligne 2&lt;/b&gt;");
  });
});
