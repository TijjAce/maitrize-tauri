import { describe, it, expect } from "vitest";
import { texteDuFichier, titreDuLecteur } from "./lecteurMarkdown";
import { EXTENSIONS_DOCUMENTS, estDocument, estMarkdown, typeDocument } from "./dragdrop";

const b64 = (octets: ArrayLike<number>) => btoa(String.fromCharCode(...Array.from(octets)));

describe("le lecteur de fichiers .md", () => {
  it("reconnaît un .md, l'accepte parmi les documents et lui donne son icône", () => {
    for (const nom of ["projet journal.md", "NOTES.MD", "a.markdown"]) {
      expect(estMarkdown(nom)).toBe(true);
      expect(estDocument(nom)).toBe(true);
    }
    expect(estMarkdown("cours.pdf")).toBe(false);
    expect(estMarkdown("md")).toBe(false);
    expect(typeDocument("projet journal.md")).toEqual({ icone: "📓", libelle: "Markdown" });
    expect(EXTENSIONS_DOCUMENTS.split(",")).toEqual(expect.arrayContaining([".md", ".markdown"]));
  });

  it("lit le texte en UTF-8, sans la marque d'en-tête ; sinon en Windows-1252", () => {
    expect(texteDuFichier(b64(new TextEncoder().encode("# Été\n- élève")))).toBe("# Été\n- élève");
    expect(texteDuFichier(b64([0xef, 0xbb, 0xbf, 0x23, 0x20, 0x41]))).toBe("# A");
    // « Été » écrit par un ancien PC : É = 0xC9, é = 0xE9.
    expect(texteDuFichier(b64([0xc9, 0x74, 0xe9]))).toBe("Été");
    expect(texteDuFichier("")).toBe("");
  });

  it("prend pour titre le nom du fichier, sinon le premier titre du texte", () => {
    expect(titreDuLecteur("projet journal.md", "# Autre chose")).toBe("projet journal");
    expect(titreDuLecteur("NOTES.MARKDOWN", "")).toBe("NOTES");
    expect(titreDuLecteur(undefined, "Intro\n# Mon projet\n## Suite")).toBe("Mon projet");
    expect(titreDuLecteur("", "")).toBe("Document");
  });
});
