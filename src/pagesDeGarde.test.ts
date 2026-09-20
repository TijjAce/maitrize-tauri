import { describe, it, expect } from "vitest";
import {
  assembler, consigneIA, corpsParDefaut, demandeIA, entete, htmlDeLaReponse, modeleLocal, signature, type InfosGarde,
} from "./pagesDeGarde";
import { nettoyerHtml } from "./texteRiche";

const infos = (p: Partial<InfosGarde> = {}): InfosGarde => ({
  sorte: "lettre", titre: "Cahier de classe", annee: "2026-2027", ecole: "IME <Perce-Neige>",
  enseignant: "Clément Titet", fonction: "Professeur des écoles spécialisé", telephone: "01 85 74 27 87",
  niveau: "", ime: true, precisions: "", ...p,
});

describe("pages de garde", () => {
  it("pose l'en-tête et la signature à partir des réglages, texte échappé", () => {
    const html = assembler(infos(), "<p>Chères familles,</p>");
    expect(html).toContain("<h1>Cahier de classe</h1>");
    expect(html).toContain("IME &lt;Perce-Neige&gt; · 2026-2027");
    expect(html).toContain("Clément Titet<br>Professeur des écoles spécialisé<br>01 85 74 27 87");
    // Une page de garde ne se signe pas en bas : le nom est au milieu.
    expect(assembler(infos({ sorte: "cahier" }), "")).not.toContain("01 85 74 27 87");
  });

  it("sans identité renseignée, rien de vide ne s'affiche", () => {
    const nu = infos({ enseignant: "", fonction: "", telephone: "", ecole: "", annee: "" });
    expect(signature(nu)).toBe("");
    expect(entete({ ...nu, titre: "Fournitures" })).toBe("<h1>Fournitures</h1>");
  });

  it("propose un document présentable sans l'IA, que l'éditeur garde intact", () => {
    for (const sorte of ["cahier", "lettre", "fournitures"] as const) {
      const html = modeleLocal(infos({ sorte }));
      expect(html.length).toBeGreaterThan(80);
      expect(nettoyerHtml(html)).toBe(html);
    }
    expect(corpsParDefaut(infos({ sorte: "cahier" }))).toContain("Nom de l'élève");
    expect(corpsParDefaut(infos({ sorte: "fournitures" }))).toContain("<li>");
    // En IME, le mot aux familles parle des traces écrites qui varient.
    expect(corpsParDefaut(infos({ sorte: "lettre" }))).toContain("manipulent");
    expect(corpsParDefaut(infos({ sorte: "lettre", ime: false }))).not.toContain("manipulent");
  });

  it("ne transmet au modèle que le document et le contexte, jamais d'élève", () => {
    const d = demandeIA(infos({ sorte: "fournitures", niveau: "CE1", precisions: "budget serré" }));
    expect(d).toContain("Niveau des élèves : CE1.");
    expect(d).toContain("budget serré");
    expect(d).not.toContain("Clément Titet");
    expect(d).not.toContain("01 85");
    expect(consigneIA(infos({ sorte: "fournitures" }))).toContain("ni prix");
  });

  it("ramène la réponse du modèle à du HTML simple", () => {
    expect(htmlDeLaReponse("```html\n<p>Bonjour</p>\n```")).toBe("<p>Bonjour</p>");
    expect(htmlDeLaReponse("<h1>Titre</h1><p>Texte</p>")).toBe("<p>Texte</p>");
    expect(htmlDeLaReponse("Premier paragraphe.\n\nSecond <paragraphe>."))
      .toBe("<p>Premier paragraphe.</p><p>Second &lt;paragraphe&gt;.</p>");
    expect(htmlDeLaReponse("   ")).toBe("");
  });
});
