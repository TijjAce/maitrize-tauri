import { describe, it, expect } from "vitest";
import {
  REGLAGES_AFFICHE_CONJUGAISON, enPaysage, htmlAfficheConjugaison, morceauxDeLaForme, reglagesAfficheSurs, styleAfficheConjugaison,
  titreAfficheConjugaison,
} from "./afficheConjugaison";

const texte = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const colore = (m: { texte: string; classe?: string }[]) => m.map((x) => (x.classe ? `[${x.texte}]` : x.texte)).join("");

describe("les tableaux de conjugaison à afficher (programme de français du cycle 2, 2024)", () => {
  it("ne garde que les verbes et les temps du programme de la classe, et jamais une page vide", () => {
    expect(reglagesAfficheSurs(null)).toEqual(REGLAGES_AFFICHE_CONJUGAISON);
    // Au CP : être et avoir, au présent seulement.
    const cp = reglagesAfficheSurs({ niveau: "CP", verbes: ["être", "chanter"], temps: ["present", "futur"] });
    expect([cp.verbes, cp.temps]).toEqual([["être"], ["present"]]);
    // Au CE1, pas encore les verbes irréguliers du CE2.
    expect(reglagesAfficheSurs({ niveau: "CE1", verbes: ["faire"] }).verbes).toEqual(["être", "avoir"]);
    expect(reglagesAfficheSurs({ niveau: "CE2", verbes: ["prendre", "faire"] }).verbes).toEqual(["faire", "prendre"]);
    // Les temps dans l'ordre du programme.
    expect(reglagesAfficheSurs({ temps: ["futur", "present"] }).temps).toEqual(["present", "futur"]);
  });

  it("colore ce qui se retient : la terminaison des verbes du 1er groupe au présent, celle de tous à l'imparfait et au futur, l'auxiliaire au passé composé", () => {
    expect(colore(morceauxDeLaForme("chanter", "present", 3, "chantons"))).toBe("chant[ons]");
    expect(colore(morceauxDeLaForme("manger", "present", 3, "mangeons"))).toBe("mange[ons]");
    expect(colore(morceauxDeLaForme("être", "present", 0, "suis"))).toBe("suis");
    expect(colore(morceauxDeLaForme("faire", "imparfait", 5, "faisaient"))).toBe("fais[aient]");
    expect(colore(morceauxDeLaForme("être", "futur", 0, "serai"))).toBe("se[rai]");
    expect(colore(morceauxDeLaForme("chanter", "futur", 3, "chanterons"))).toBe("chante[rons]");
    expect(colore(morceauxDeLaForme("aller", "passeCompose", 0, "suis allé"))).toBe("[suis] allé");
  });

  it("fait une page par verbe, ses temps côte à côte — « j' » devant une voyelle, et l'accord avec « elle »", () => {
    const html = htmlAfficheConjugaison({ niveau: "CE2", verbes: ["aller"], temps: ["present", "passeCompose"], pronoms: "il-elle" });
    const t = texte(html);
    expect(html.match(/class="page ac-page/g)).toHaveLength(1);
    expect(t).toContain("Le verbe aller");
    expect(t).toContain("Présent");
    expect(t).toContain("Passé composé");
    expect(t).toContain("je vais");
    expect(t).toContain("il, elle, on est allé(e)");
    expect(t).toContain("ils, elles sont allé(e)s");
    expect(htmlAfficheConjugaison({ niveau: "CE1", verbes: ["avoir"], temps: ["present"] })).toContain('<span class="ac-pronom">j&#39;</span><span class="ac-verbe">ai</span>');
  });

  it("fait une page par temps, quatre verbes au plus par page, en paysage dès trois colonnes", () => {
    const r = { niveau: "CE1" as const, verbes: ["être", "avoir", "chanter", "jouer", "parler"], temps: ["present" as const], disposition: "temps" as const };
    const html = htmlAfficheConjugaison(r);
    expect(html.match(/class="page ac-page/g)).toHaveLength(2);
    expect(texte(html)).toContain("Le présent");
    expect(enPaysage(reglagesAfficheSurs(r))).toBe(true);
    expect(styleAfficheConjugaison(r)).toContain("A4 landscape");
    expect(styleAfficheConjugaison({ verbes: ["être"], temps: ["present"] })).not.toContain("landscape");
    expect(titreAfficheConjugaison(r)).toBe("Le présent");
    expect(titreAfficheConjugaison({ verbes: ["être", "avoir", "chanter"] })).toBe("Les verbes être, avoir et chanter");
  });

  it("pose le pictogramme de chaque pronom, et la mention que demande la licence d'ARASAAC", () => {
    const images = { je: "data:image/png;base64,AAAA", il: "data:image/png;base64,BBBB", elle: "data:image/png;base64,CCCC" };
    const html = htmlAfficheConjugaison({ verbes: ["être"], temps: ["present"], pictos: true, pronoms: "il-elle" }, images);
    expect(html.match(/class="ac-picto"/g)).toHaveLength(3);
    expect(html).toContain("ARASAAC");
    expect(htmlAfficheConjugaison({ verbes: ["être"], temps: ["present"] }, images)).not.toContain("ARASAAC");
    // Sans couleurs : rien de coloré.
    expect(htmlAfficheConjugaison({ verbes: ["chanter"], temps: ["present"], couleurs: false })).not.toContain("ac-term");
  });
});
