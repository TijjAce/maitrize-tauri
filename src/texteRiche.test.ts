import { describe, it, expect } from "vitest";
import { avecSourcesImages, estHtml, imagesDuTexte, imagesEnAttente, nettoyerHtml, versHtml, texteBrut, texteVersHtmlEnLigne } from "./texteRiche";

describe("nettoyerHtml", () => {
  it("garde la mise en forme simple", () => {
    const html = "<h1>Trame</h1><p><b>Séance 1</b> : <i>loto</i> <u>des</u> animaux</p><ul><li>un</li><li>deux</li></ul>";
    expect(nettoyerHtml(html)).toBe(html);
  });

  it("retire scripts, gestionnaires, liens et images venues d'ailleurs", () => {
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

describe("images collées", () => {
  it("ne garde d'une image de Maitrize que son nom de fichier", () => {
    expect(nettoyerHtml('<p>avant<img data-fichier="a1-b2.png" src="data:image/png;base64,iVBOR" onerror="x" style="width:9px">après</p>'))
      .toBe('<p>avant<img src="maitrize-fichier:a1-b2.png">après</p>');
    expect(nettoyerHtml('<img src="maitrize-fichier:photo.jpg">')).toBe('<img src="maitrize-fichier:photo.jpg">');
  });

  it("refuse les images d'ailleurs et les noms qui sortent du dossier des fichiers", () => {
    expect(nettoyerHtml('<img src="data:image/png;base64,AAAA"><img src="https://exemple.fr/x.png">')).toBe("");
    expect(nettoyerHtml('<img data-fichier="../secret.png"><img src="maitrize-fichier:.cache"><img src="maitrize-fichier:a b.png">')).toBe("");
    expect(nettoyerHtml('<img src="javascript:alert(1)" data-fichier="x.png">')).toBe('<img src="maitrize-fichier:x.png">');
  });

  it("reconnaît un contenu fait d'une seule image, sans texte", () => {
    const contenu = '<img src="maitrize-fichier:photo.jpg">';
    expect(estHtml(contenu)).toBe(true);
    expect(versHtml(contenu)).toBe(contenu);
    expect(texteBrut(`<p>Sortie</p>${contenu}`)).toBe("Sortie");
  });

  it("donne leur source aux images, pour l'éditeur et l'impression", () => {
    const html = '<p>a</p><img src="maitrize-fichier:un.png"><img src="maitrize-fichier:absent.png"><img src="maitrize-fichier:un.png">';
    expect(imagesDuTexte(html)).toEqual(["un.png", "absent.png"]);
    expect(avecSourcesImages(html, (n) => (n === "un.png" ? "data:image/png;base64,QQ==" : undefined)))
      .toBe('<p>a</p><img src="data:image/png;base64,QQ==" alt=""><img src="data:image/png;base64,QQ==" alt="">');
    expect(imagesEnAttente(html)).toBe('<p>a</p><img data-fichier="un.png" alt=""><img data-fichier="absent.png" alt=""><img data-fichier="un.png" alt="">');
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
