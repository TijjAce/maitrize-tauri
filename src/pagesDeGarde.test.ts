import { describe, it, expect } from "vitest";
import {
  assembler, auNomDe, basculer, choixParDefaut, CITATIONS, cochees, consigneIA, corpsParDefaut, dateEnLettres, demandeIA, entete, exemplaires, GROUPES,
  groupesDe, htmlDeLaReponse, lireMeta, modeleLocal, optionsDe, pourDesEleves, puceDe, REGLAGES, reglagesParDefaut, rienPourLIA, signature,
  SORTES, SORTES_DU_CHOIX, type InfosGarde, type SorteGarde,
} from "./pagesDeGarde";
import { nettoyerHtml } from "./texteRiche";

const infos = (p: Partial<InfosGarde> = {}): InfosGarde => {
  const tout = {
    sorte: "lettre" as SorteGarde, titre: "Cahier de classe", annee: "2026-2027", ecole: "IME <Perce-Neige>",
    enseignant: "Clément Titet", fonction: "Professeur des écoles spécialisé", telephone: "01 85 74 27 87",
    niveau: "", ime: true, choix: [] as string[], reglages: {} as Record<string, string>, precisions: "", ...p,
  };
  return {
    ...tout,
    choix: p.choix ?? choixParDefaut(tout.sorte, tout.ime),
    reglages: p.reglages ?? reglagesParDefaut(tout.sorte, tout.ime),
  };
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
    // Un groupe vidé de ses cases ne s'affiche pas : la géométrie n'est pas
    // au programme d'une unité d'enseignement.
    expect(groupesDe("fournitures", false).map((g) => g.titre)).toContain("Mesurer et compter");
    expect(groupesDe("fournitures", true).map((g) => g.titre)).not.toContain("Mesurer et compter");
    // Le matériel de compensation ne se propose qu'en IME.
    expect(groupesDe("fournitures", true).map((g) => g.titre)).toContain("Si votre enfant en a besoin");
    expect(groupesDe("fournitures", false).map((g) => g.titre)).not.toContain("Si votre enfant en a besoin");
    // Il y a de quoi composer une liste sans écrire une ligne, dans les deux cas.
    expect(optionsDe("fournitures", true).length).toBeGreaterThan(55);
    expect(optionsDe("fournitures", false).length).toBeGreaterThan(55);
    // Mais on n'en coche qu'une dizaine d'office : une liste de rentrée reste courte.
    expect(choixParDefaut("fournitures", true).length).toBeLessThan(15);
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
    for (const sorte of ["cahier", "journal", "lettre", "fournitures"] as const) {
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

describe("les précisions sur les cahiers", () => {
  const avec = (reglages: Record<string, string>, choix = ["cahierGrand"]) =>
    infos({ sorte: "fournitures", choix, reglages });

  it("écrit le lignage, les pages et la couverture sur chaque cahier coché", () => {
    const i = avec({ lignage: "seyes3", pages: "96", couverture: "polypro", grammage: "90" });
    expect(corpsParDefaut(i)).toContain(
      "<li>Un cahier 24 × 32 cm, assez grand pour y coller une feuille A4, 96 pages, "
      + "réglure Seyès agrandie, interligne 3 mm, couverture polypro, papier 90 g</li>");
    // Le même choix vaut pour tous les cahiers, et pour eux seuls.
    const deux = avec({ lignage: "carreaux" }, ["cahierPetit", "poesies", "ramette"]);
    const corps = corpsParDefaut(deux);
    expect(corps).toContain("<li>Un cahier 17 × 22 cm, petits carreaux (5 × 5 mm)</li>");
    expect(corps).toContain("<li>Un cahier de poésies, petits carreaux (5 × 5 mm)</li>");
    expect(corps).toContain("<li>Une ramette de papier blanc A4</li>");
  });

  it("supporte un document où les précisions n'existent pas encore", () => {
    // Un document commencé avant que ces menus n'existent : la fenêtre ne
    // doit pas tomber sur « reglages » manquant.
    const vieux = { ...avec({}), reglages: undefined as unknown as Record<string, string> };
    expect(() => corpsParDefaut(vieux)).not.toThrow();
    expect(corpsParDefaut(vieux)).toContain("<li>Un cahier 24 × 32 cm");
  });

  it("ne dit rien de plus quand on ne précise rien", () => {
    const i = avec({ lignage: "", pages: "", couverture: "", grammage: "" });
    expect(corpsParDefaut(i)).toContain("<li>Un cahier 24 × 32 cm, assez grand pour y coller une feuille A4</li>");
    // Une valeur inconnue — un vieux document — ne casse pas la puce.
    expect(puceDe(GROUPES.fournitures.flatMap((g) => g.options).find((o) => o.id === "brouillon")!,
      avec({ pages: "mille" }))).toBe("Un cahier de brouillon");
  });

  it("part du Seyès agrandi en IME, du Seyès ordinaire ailleurs", () => {
    expect(reglagesParDefaut("fournitures", true).lignage).toBe("seyes3");
    expect(reglagesParDefaut("fournitures", false).lignage).toBe("seyes");
    // Les autres documents ne se précisent pas ainsi.
    expect(reglagesParDefaut("lettre", true)).toEqual({});
    expect(REGLAGES.lettre).toBeUndefined();
    // Chaque réglage propose de ne rien préciser.
    for (const r of REGLAGES.fournitures!) expect(r.valeurs.some((v) => v.id === "" && v.texte === "")).toBe(true);
  });

  it("transmet au modèle la puce précisée, pour qu'il n'invente pas de réglure", () => {
    const d = demandeIA(avec({ lignage: "seyes", pages: "48" }, ["cahierPetit"]));
    expect(d).toContain("- un cahier 17 × 22 cm, 48 pages, grands carreaux (Seyès)");
    expect(consigneIA(infos({ sorte: "fournitures" }))).toContain("rien d'autre");
  });
});

const PERIODES = [
  { numero: 1, debut: "2026-09-01", fin: "2026-10-16" }, { numero: 2, debut: "2026-11-02", fin: "2026-12-18" },
  { numero: 3, debut: "2027-01-04", fin: "2027-02-19" }, { numero: 4, debut: "2027-03-08", fin: "2027-04-16" },
  { numero: 5, debut: "2027-05-03", fin: "2027-07-02" },
];

describe("la page de garde de mon cahier journal", () => {
  const journal = (p: Partial<InfosGarde> = {}) => infos({ sorte: "journal", titre: "Cahier journal", niveau: "CE1", periodes: PERIODES, ...p });

  it("se range sous « Page de garde », à côté du cahier d'un élève", () => {
    expect(SORTES_DU_CHOIX).toEqual(["cahier", "lettre", "fournitures"]);
    expect(SORTES.find((s) => s.id === "journal")!.titre).toBe("Cahier journal");
  });

  it("porte l'année, la classe, le nom, la citation exacte, les périodes datées, la photo et la frise", () => {
    const html = modeleLocal(journal());
    expect(html).toContain("<h1 style=\"text-align:center\">📒 Cahier journal</h1>");
    expect(html).toContain("2026 – 2027");
    expect(html).toContain("IME &lt;Perce-Neige&gt; · CE1");
    expect(html).toContain("<b>Clément Titet — Professeur des écoles spécialisé</b>");
    expect(html).toContain("Plutôt la tête bien faite que bien pleine.");
    expect(html).toContain("— Montaigne, Essais, I, 26");
    expect(html).toContain("<td>du 1er septembre au 16 octobre</td>");
    expect(html).toContain("<td>du 3 mai au 2 juillet</td>");
    expect(html).toContain("la photo de la classe");
    // La frise, en tête et en pied de page.
    expect(html.match(/<h2 style="text-align:center">✏️/g)).toHaveLength(2);
    // Ce que l'éditeur garde tel quel : aucune balise ni style qu'il retirerait.
    expect(nettoyerHtml(html)).toBe(html);
    // Le cahier journal ne se signe pas : c'est le sien.
    expect(html).not.toContain("01 85 74 27 87");
  });

  it("change de citation et de frise selon les précisions", () => {
    const html = modeleLocal(journal({ reglages: { citation: "3", frise: "saisons" } }));
    expect(html).toContain("Rien ne sert de courir ; il faut partir à point.");
    expect(html).toContain("🍂 🍁 ❄️");
    expect(REGLAGES.journal!.find((r) => r.id === "citation")!.valeurs).toHaveLength(CITATIONS.length);
  });

  it("sans calendrier, donne les mois des périodes, sans inventer de dates", () => {
    const html = modeleLocal(journal({ periodes: [] , choix: ["periodes", "chiffres"] }));
    expect(html).toContain("<td>septembre et octobre</td>");
    expect(html).not.toContain("semaines de classe");
    expect(modeleLocal(journal({ choix: ["chiffres"] }))).toContain("semaines de classe");
    expect(dateEnLettres("2026-09-01")).toBe("1er septembre");
    expect(dateEnLettres("2027-02-19")).toBe("19 février");
  });

  it("ne demande à l'IA que les mots doux : ni date, ni citation, ni nom", () => {
    const i = journal();
    const d = demandeIA(i);
    expect(d).toContain("Écris seulement :\n- un petit mot d'encouragement");
    expect(d).not.toMatch(/septembre|Montaigne|Clément|périodes|citation/);
    expect(consigneIA(i)).toContain("sans date ni citation");
    // L'IA écrit le souhait ; les dates et la citation restent celles d'ici.
    const avecIA = assembler(i, "<p style=\"text-align:center\">Une belle année s'ouvre.</p>");
    expect(avecIA).toContain("Une belle année s'ouvre.");
    expect(avecIA).toContain("du 1er septembre au 16 octobre");
    expect(rienPourLIA(i)).toBe(false);
    expect(rienPourLIA(journal({ choix: ["annee", "periodes", "citation"] }))).toBe(true);
  });
});

describe("un document pour plusieurs élèves", () => {
  it("écrit le nom de l'élève sur la ligne à compléter, ou sous le titre", () => {
    const page = modeleLocal(infos({ sorte: "cahier" }));
    const lea = auNomDe(page, "Léa Martin", "cahier");
    expect(lea).toContain("<b>Nom de l'élève :</b> <b>Léa Martin</b>");
    expect(lea).not.toContain("……………");
    const liste = modeleLocal(infos({ sorte: "fournitures" }));
    expect(auNomDe(liste, "Tom & Sami", "fournitures")).toContain("</h1><p><b>Pour Tom &amp; Sami</b></p>");
    // Un « $ » dans un nom ne casse rien.
    expect(auNomDe(page, "A$1B", "cahier")).toContain("<b>A$1B</b>");
    expect(auNomDe(liste, "", "fournitures")).toBe(liste);
  });

  it("imprime un exemplaire par élève, chacun sur sa page ; le document seul sinon", () => {
    const liste = modeleLocal(infos({ sorte: "fournitures" }));
    const trois = exemplaires(liste, ["Léa", "Tom", "Inès"], "fournitures");
    expect(trois.match(/class="exemplaire"/g)).toHaveLength(3);
    expect(trois).toContain("Pour Inès");
    expect(exemplaires(liste, [], "fournitures")).toBe(liste);
    // Le cahier journal ne se fait pas au nom des élèves.
    expect(pourDesEleves("journal")).toBe(false);
    expect(pourDesEleves("fournitures")).toBe(true);
    expect(pourDesEleves(undefined)).toBe(true);
  });

  it("ne transmet jamais les élèves cochés au modèle", () => {
    const i = infos({ sorte: "fournitures", eleves: ["e1", "e2"] });
    expect(demandeIA(i)).not.toMatch(/e1|e2|élèves coch/);
  });

  it("lit ce qu'il retient d'un document, même abîmé", () => {
    expect(lireMeta('{"sorte":"fournitures","eleves":["a","b"]}')).toEqual({ sorte: "fournitures", eleves: ["a", "b"] });
    expect(lireMeta("")).toEqual({ sorte: undefined, eleves: [] });
    expect(lireMeta("{pas du json")).toEqual({ eleves: [] });
    expect(lireMeta('{"eleves":[1,"x"]}').eleves).toEqual(["x"]);
  });
});
