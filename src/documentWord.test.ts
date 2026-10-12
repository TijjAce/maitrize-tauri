import { describe, it, expect } from "vitest";
import { arbreDepuisHtml, decoderEntites, partiesDuDocx, type Element } from "./documentWord";
import { feuilleDuDocument } from "./documentIa";

const documentDe = (corps: string) => partiesDuDocx(corps, "2026-10-12T10:00:00Z").find((p) => p.nom === "word/document.xml")!.contenu;
const stylesDe = (corps: string) => partiesDuDocx(corps).find((p) => p.nom === "word/styles.xml")!.contenu;
const compter = (texte: string, motif: string) => texte.split(motif).length - 1;

describe("le HTML de la feuille, lu sans navigateur", () => {
  it("garde les balises, leurs classes et le texte, entités décodées", () => {
    const r = arbreDepuisHtml('<div class="doc-ia doc-normal"><p>Le <b>chat</b> &amp; l&#39;oiseau&nbsp;!<br>Fin</p><hr><span class="case cochee"></span></div>');
    const div = r.enfants[0] as Element;
    expect(div.classes).toEqual(["doc-ia", "doc-normal"]);
    const p = div.enfants[0] as Element;
    expect(p.enfants.map((n) => ("texte" in n ? n.texte : n.balise))).toEqual(["Le ", "b", " & l'oiseau !", "br", "Fin"]);
    // Une balise vide ne garde rien dedans : le <span> qui suit le <hr> est son frère.
    expect(div.enfants.map((n) => ("texte" in n ? "#" : n.balise))).toEqual(["p", "hr", "span"]);
    expect(decoderEntites("&#x2610; &lt;b&gt; &inconnu;")).toBe("☐ <b> &inconnu;");
  });
});

describe("un document de l'assistant en Word", () => {
  const md = `# Fiche interview

Une **consigne** courte.

| Étape | À faire |
|---|---|
| 1. Préparation | Nom : ____ |
| 2. Questions | [ ] Oui [x] Non |

- premier point
- second point
  1. sous-point

> Astuce : un minuteur.`;

  it("met les titres, le tableau, les listes et la citation à leur place, avec leurs styles", () => {
    const doc = documentDe(feuilleDuDocument(md).corps);
    expect(doc).toContain('<w:pStyle w:val="Titre1"/></w:pPr><w:r><w:t xml:space="preserve">Fiche interview</w:t></w:r>');
    expect(doc).toContain('<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">consigne</w:t></w:r>');
    // Un tableau, sa ligne d'en-tête répétée sur chaque page et teintée, deux colonnes.
    expect(compter(doc, "<w:tbl>")).toBe(1);
    expect(compter(doc, "<w:tblHeader/>")).toBe(1);
    expect(compter(doc, '<w:gridCol w:w="5103"/>')).toBe(2);
    expect(doc).toContain('w:fill="EEF0FE"');
    // Les cases à cocher et la ligne à remplir deviennent des caractères qu'on peut effacer.
    expect(doc).toContain("☐ ");
    expect(doc).toContain("☑ ");
    expect(doc).toContain("________________");
    // Les puces, et la numérotation de la liste imbriquée, plus en retrait.
    expect(doc).toContain('<w:t xml:space="preserve">• premier point</w:t>');
    expect(doc).toMatch(/<w:ind w:left="720" w:hanging="280"\/>.*?<w:t xml:space="preserve">1\. sous-point<\/w:t>/);
    // Pas de double blanc après une case : « ☐ Oui ☑ Non ».
    expect(doc).toContain('<w:t xml:space="preserve">☐ Oui ☑ Non</w:t>');
    expect(doc).toContain('<w:pStyle w:val="Citation"/>');
    // Le XML se referme comme il s'ouvre.
    for (const b of ["w:tbl", "w:tr", "w:tc", "w:p"]) expect(compter(doc, `<${b}>`), b).toBe(compter(doc, `</${b}>`));
  });

  it("suit la taille du texte de la feuille et l'aération de chaque tableau", () => {
    const aere = feuilleDuDocument("# Court\n\nDeux mots.").corps;
    expect(stylesDe(aere)).toContain('<w:sz w:val="22"/>');
    const serre = aere.replace("doc-aere", "doc-serre").replace("<table>", '<table class="air-3">');
    expect(stylesDe(serre)).toContain('<w:sz w:val="19"/>');
    const tableau = feuilleDuDocument(md).corps.replace("<table>", '<table class="air-3">');
    const doc = documentDe(tableau);
    expect(doc).toContain('<w:top w:w="220" w:type="dxa"/>');
    // Le texte du tableau, 15 % plus grand que celui de la feuille (aérée : 11 pt).
    expect(doc).toContain('<w:sz w:val="25"/>');
  });

  it("forme une archive complète : types, relations, styles, propriétés et document", () => {
    const parties = partiesDuDocx(feuilleDuDocument(md).corps, "2026-10-12T10:00:00Z");
    expect(parties.map((p) => p.nom)).toEqual([
      "[Content_Types].xml", "_rels/.rels", "word/_rels/document.xml.rels", "docProps/core.xml", "word/styles.xml", "word/document.xml",
    ]);
    expect(parties[3].contenu).toContain("<dc:title>Fiche interview</dc:title>");
    expect(documentDe("<p>a < b &amp; c</p>")).toContain('<w:t xml:space="preserve">a &lt; b &amp; c</w:t>');
  });
});
