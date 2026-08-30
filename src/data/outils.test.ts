import { describe, it, expect } from "vitest";
import outils from "./outils.json";

interface Outil { titre: string; description: string; categorie: string; url: string }
const ITEMS = outils as Outil[];

// Ces entrées sont des liens ouverts dans le navigateur de l'enseignant :
// une URL morte ou un doublon se voit tout de suite à l'usage. Les adresses
// ont été vérifiées une à une ; ces tests empêchent les régressions de forme.

describe("catalogue d'outils", () => {
  it("n'est pas vide", () => {
    expect(ITEMS.length).toBeGreaterThan(20);
  });

  it("renseigne les quatre champs de chaque entrée", () => {
    for (const o of ITEMS) {
      expect(o.titre?.trim(), `titre manquant : ${JSON.stringify(o)}`).toBeTruthy();
      expect(o.description?.trim(), `description manquante : ${o.titre}`).toBeTruthy();
      expect(o.categorie?.trim(), `rubrique manquante : ${o.titre}`).toBeTruthy();
      expect(o.url?.trim(), `URL manquante : ${o.titre}`).toBeTruthy();
    }
  });

  it("n'utilise que des adresses https", () => {
    // http simple afficherait un avertissement au navigateur.
    const nonHttps = ITEMS.filter((o) => !o.url.startsWith("https://")).map((o) => o.titre);
    expect(nonHttps).toEqual([]);
  });

  it("ne référence pas deux fois la même adresse", () => {
    const urls = ITEMS.map((o) => o.url.replace(/\/$/, ""));
    const doublons = urls.filter((u, i) => urls.indexOf(u) !== i);
    expect(doublons).toEqual([]);
  });

  it("ne référence pas deux fois le même titre", () => {
    const titres = ITEMS.map((o) => o.titre);
    expect(titres.filter((t, i) => titres.indexOf(t) !== i)).toEqual([]);
  });

  it("écarte les domaines dont on a constaté qu'ils ne répondent plus", () => {
    // ONDE n'a pas de domaine public (il passe par le portail académique) et
    // Éduthèque a été fermé : les rajouter donnerait des liens morts.
    const morts = ["onde.education.gouv.fr", "edutheque.fr"];
    for (const m of morts) {
      expect(ITEMS.filter((o) => o.url.includes(m)).map((o) => o.titre), `lien mort : ${m}`).toEqual([]);
    }
  });

  it("couvre l'école inclusive, utile en IME et en Ulis", () => {
    expect(ITEMS.filter((o) => o.categorie === "École inclusive & ASH").length).toBeGreaterThanOrEqual(8);
  });
});
