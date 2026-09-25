import { describe, it, expect } from "vitest";
import {
  assembler, basculer, choixParDefaut, cochees, consigneIA, corpsParDefaut, demandeIA, entete, GROUPES,
  groupesDe, htmlDeLaReponse, modeleLocal, optionsDe, signature, SORTES, type InfosGarde, type SorteGarde,
} from "./pagesDeGarde";
import { nettoyerHtml } from "./texteRiche";

const infos = (p: Partial<InfosGarde> = {}): InfosGarde => {
  const tout = {
    sorte: "lettre" as SorteGarde, titre: "Cahier de classe", annee: "2026-2027", ecole: "IME <Perce-Neige>",
    enseignant: "Clément Titet", fonction: "Professeur des écoles spécialisé", telephone: "01 85 74 27 87",
    niveau: "", ime: true, choix: [] as string[], precisions: "", ...p,
  };
  return { ...tout, choix: p.choix ?? choixParDefaut(tout.sorte, tout.ime) };
};

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
    // La case « nom de l'enseignant » n'écrit pas une ligne vide.
    expect(corpsParDefaut({ ...nu, sorte: "cahier", choix: ["enseignant"] })).toBe('<p style="text-align:center"><br></p>');
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

describe("les cases à cocher", () => {
  it("n'écrit que ce qui est coché", () => {
    const seul = infos({ sorte: "lettre", choix: ["signer"] });
    expect(corpsParDefaut(seul)).toBe(
      "<p>Chères familles,</p><p>Merci de le signer avant de le rendre.</p><p>Bien cordialement,</p>");
    // Une case décochée emporte sa phrase, et elle seule.
    const sansRdv = infos({ sorte: "lettre", choix: basculer(choixParDefaut("lettre", true), "rdv") });
    expect(corpsParDefaut(sansRdv)).not.toContain("rendez-vous");
    expect(corpsParDefaut(sansRdv)).toContain("Regardez-le avec votre enfant");
    // Tout décocher laisse un document vide, prêt à écrire à la main.
    expect(corpsParDefaut(infos({ sorte: "lettre", choix: [] })))
      .toBe("<p>Chères familles,</p><p>Bien cordialement,</p>");
  });

  it("met les fournitures en puces et ce qu'on en dit en paragraphes", () => {
    const corps = corpsParDefaut(infos({ sorte: "fournitures", choix: ["ciseaux", "marquer", "trousse"] }));
    // L'ordre est celui des cases, pas celui des clics.
    expect(corps).toContain("<ul><li>Une trousse</li><li>Une paire de ciseaux à bouts ronds</li></ul>");
    expect(corps.indexOf("</ul>")).toBeLessThan(corps.indexOf("marquer chaque objet"));
  });

  it("ne propose pas les mêmes cases en IME et en classe ordinaire", () => {
    const ids = (sorte: SorteGarde, ime: boolean) => optionsDe(sorte, ime).map((o) => o.id);
    expect(ids("fournitures", true)).toContain("change");
    expect(ids("fournitures", true)).not.toContain("stylos");
    expect(ids("fournitures", false)).toContain("stylos");
    expect(ids("fournitures", false)).not.toContain("change");
    // Un groupe vidé de ses cases ne s'affiche pas.
    expect(groupesDe("fournitures", true).map((g) => g.titre)).not.toContain("Géométrie");
    // Les cases d'office donnent un document complet dès l'ouverture.
    expect(choixParDefaut("cahier", true).length).toBeGreaterThan(1);
    expect(choixParDefaut("fournitures", false).every((id) => ids("fournitures", false).includes(id))).toBe(true);
  });

  it("reprend les cases dans la demande au modèle, liste et consignes séparées", () => {
    const d = demandeIA(infos({ sorte: "fournitures", choix: ["trousse", "courte"] }));
    expect(d).toContain("La liste doit contenir ces fournitures, et aucune autre :\n- une trousse");
    expect(d).toContain("Et il faut dire aux familles :\n- que la liste est volontairement courte");
    // Rien de coché : pas de liste vide dans la demande.
    const rien = demandeIA(infos({ sorte: "lettre", choix: [] }));
    expect(rien).not.toContain("Le mot doit dire");
    expect(demandeIA(infos({ sorte: "lettre", choix: ["signer"] }))).toContain("Le mot doit dire :\n- de signer");
  });

  it("garde un document propre quelles que soient les cases", () => {
    for (const sorte of ["cahier", "lettre", "fournitures"] as const) {
      for (const ime of [true, false]) {
        const tout = infos({ sorte, ime, choix: optionsDe(sorte, ime).map((o) => o.id) });
        expect(nettoyerHtml(modeleLocal(tout))).toBe(modeleLocal(tout));
        // Une case inconnue — un vieux document, un autre contexte — est ignorée.
        expect(corpsParDefaut({ ...tout, choix: [...tout.choix, "inconnue"] })).toBe(corpsParDefaut(tout));
      }
    }
  });

  it("donne à chaque case un identifiant et un libellé qui lui sont propres", () => {
    for (const s of SORTES) {
      const options = GROUPES[s.id].flatMap((g) => g.options);
      expect(new Set(options.map((o) => o.id)).size).toBe(options.length);
      expect(new Set(options.map((o) => o.libelle)).size).toBe(options.length);
      for (const o of options) expect(o.demande.trim().length).toBeGreaterThan(3);
    }
  });

  it("coche et décoche sans toucher au reste", () => {
    expect(basculer(["a", "b"], "c")).toEqual(["a", "b", "c"]);
    expect(basculer(["a", "b"], "a")).toEqual(["b"]);
    expect(cochees(infos({ sorte: "lettre", choix: ["rdv", "rythme"] })).map((o) => o.id)).toEqual(["rythme", "rdv"]);
  });
});
