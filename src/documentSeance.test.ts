import { describe, expect, it } from "vitest";
import { ENTETE_TABLEAU, demarchesParFamille, tableauDesPhases } from "./demarches";
import {
  aDesPhases, ajouterChamp, champsDesPhases, citationsDuDocument, documentDeLaSeance, documentEnHtml, ecrireDocument, ecrireSeance,
  imagesDuDocument, lireDocument, lireSeance, ligneEnHtml, marqueDeCitation, phasesOuLeChampEstRempli, retirerChamp, seanceEnCartes,
  tableauDuDocument, texteDuDeroulement,
} from "./documentSeance";

const DOC = [
  "Une séance pour choisir le bon résumé.",
  "## Mise en route (5 min)",
  "On relit ensemble [@affichage:a1|Les étapes du récit].",
  "## Lecture du texte (15 min)",
  "Lecture **à voix haute**, puis *silencieuse*, avec [@outil:o1|Réglette de lecture].",
  "[img:livre.jpg]",
  "## Le bon résumé (15 min)",
  "Par deux, sur [@feuille:f1|Le bon résumé] :",
  "- lire les trois résumés ;",
  "- entourer celui qui dit toute l'histoire.",
  "*Posture de l'enseignant : circuler, relancer les binômes.*",
].join("\n");

describe("le déroulement en document", () => {
  it("se lit en blocs et se réécrit à l'identique", () => {
    const blocs = lireDocument(DOC);
    expect(blocs.map((b) => b.t)).toEqual(["texte", "phase", "texte", "phase", "texte", "image", "phase", "texte", "liste", "texte"]);
    expect(blocs[1]).toEqual({ t: "phase", titre: "Mise en route", duree: "5 min" });
    expect(ecrireDocument(blocs)).toBe(DOC);
  });

  it("lit les durées comme on les écrit, et garde un titre qui a ses propres parenthèses", () => {
    const titre = (l: string) => lireDocument(l)[0];
    expect(titre("## Rituel (1 h 30)")).toEqual({ t: "phase", titre: "Rituel", duree: "1 h 30" });
    expect(titre("## Jeu (5-10 min)")).toEqual({ t: "phase", titre: "Jeu", duree: "5-10 min" });
    expect(titre("## Le loup (le méchant)")).toEqual({ t: "phase", titre: "Le loup (le méchant)", duree: "" });
    expect(titre("## Calcul (le compte est bon) (10 min)")).toEqual({ t: "phase", titre: "Calcul (le compte est bon)", duree: "10 min" });
  });

  it("sort une image glissée au milieu d'une ligne en bloc à elle", () => {
    expect(lireDocument("Avant [img:a.png] après")).toEqual([
      { t: "texte", texte: "Avant" }, { t: "image", nom: "a.png" }, { t: "texte", texte: "après" },
    ]);
  });

  it("donne aux tablettes et à l'impression le tableau des phases", () => {
    const t = tableauDuDocument(DOC)!;
    expect(t[0]).toEqual([...ENTETE_TABLEAU]);
    expect(t.slice(1).map((l) => [l[0], l[1]])).toEqual([["Mise en route", "5 min"], ["Lecture du texte", "15 min"], ["Le bon résumé", "15 min"]]);
    // Les supports par leur titre, l'image gardée, la mise en forme effacée.
    expect(t[2][2]).toBe("Lecture à voix haute, puis silencieuse, avec Réglette de lecture.\n[img:livre.jpg]");
    expect(t[3][2]).toBe("Par deux, sur Le bon résumé :\n• lire les trois résumés ;\n• entourer celui qui dit toute l'histoire.");
    expect(t[3][3]).toBe("circuler, relancer les binômes.");
    expect(tableauDuDocument("Un texte sans phases.")).toBeNull();
  });

  it("se lit en texte simple pour les PDF du jour", () => {
    expect(texteDuDeroulement(DOC)).toBe([
      "Une séance pour choisir le bon résumé.",
      "1. Mise en route — 5 min",
      "On relit ensemble Les étapes du récit.",
      "2. Lecture du texte — 15 min",
      "Lecture à voix haute, puis silencieuse, avec Réglette de lecture.",
      "3. Le bon résumé — 15 min",
      "Par deux, sur Le bon résumé :",
      "• lire les trois résumés ;",
      "• entourer celui qui dit toute l'histoire.",
      "Posture de l'enseignant : circuler, relancer les binômes.",
    ].join("\n"));
  });

  it("sait où chaque support est cité", () => {
    expect(citationsDuDocument(DOC).map((c) => [c.genre, c.id, c.phase])).toEqual([["affichage", "a1", 1], ["outil", "o1", 2], ["feuille", "f1", 3]]);
    expect(marqueDeCitation("jeu", "j1", "Le jeu [rapide] | 2")).toBe("[@jeu:j1|Le jeu [rapide) / 2]");
    expect(imagesDuDocument(DOC)).toEqual(["livre.jpg"]);
  });
});

describe("une séance d'avant devient un document", () => {
  const tableau = JSON.stringify([
    [...ENTETE_TABLEAU],
    ["Découverte", "10", "Observer l'album.\n[img:album.png]", "Questionner"],
    ["", "", "", ""],
    ["Entraînement", "15 min", "Fiche en autonomie.", ""],
  ]);

  it("garde son texte, puis une phase par ligne du tableau, puis ses illustrations", () => {
    const doc = documentDeLaSeance({ deroulement: "Introduction.", tableauDeroulement: tableau, imagesDeroulement: JSON.stringify(["album.png", "affiche.png"]) });
    expect(doc).toBe([
      "Introduction.",
      "## Découverte (10 min)",
      "Observer l'album.",
      "[img:album.png]",
      "### Posture de l'enseignant",
      "Questionner",
      "## Entraînement (15 min)",
      "Fiche en autonomie.",
      "[img:affiche.png]",
    ].join("\n"));
    expect(aDesPhases(doc)).toBe(true);
    // Et le tableau qu'on en tire redit le même tableau.
    const t = tableauDuDocument(doc)!;
    expect(t[1]).toEqual(["Découverte", "10 min", "Observer l'album.\n[img:album.png]", "Questionner"]);
  });

  it("ne touche pas à une séance déjà en document, ni à une séance vide", () => {
    expect(documentDeLaSeance({ deroulement: DOC, tableauDeroulement: tableau })).toBe(DOC);
    expect(documentDeLaSeance({ deroulement: "", tableauDeroulement: "" })).toBe("");
    expect(documentDeLaSeance({ deroulement: "Juste un texte.", tableauDeroulement: "illisible" })).toBe("Juste un texte.");
  });

  it("reçoit les phases d'une démarche, avec leur durée et la posture de l'enseignant", () => {
    const demarche = demarchesParFamille().flatMap((g) => g.demarches).find((d) => d.seances[0]?.phases.length)!;
    const phases = demarche.seances[0].phases;
    const doc = documentDeLaSeance({ tableauDeroulement: JSON.stringify(tableauDesPhases(phases)) });
    expect(lireSeance(doc).phases.map((p) => p.titre)).toEqual(phases.map((p) => p.phase.replace(/\n/g, " ").trim() || "Phase"));
    // Sa posture de l'enseignant va dans son champ.
    expect(lireSeance(doc).phases.map((p) => p.champs.find((c) => c.nom === "Posture de l'enseignant")?.texte ?? ""))
      .toEqual(phases.map((p) => p.posture.trim()));
    expect(tableauDuDocument(doc)!.length).toBe(phases.length + 1);
  });

  it("reprend toute autre colonne, nommée", () => {
    const autre = JSON.stringify([["Étape", "Durée", "Organisation"], ["Atelier", "20 min", "Groupes de 4"]]);
    expect(documentDeLaSeance({ deroulement: "", tableauDeroulement: autre })).toBe("## Atelier (20 min)\n### Organisation\nGroupes de 4");
  });
});

describe("en HTML", () => {
  it("échappe le texte, met le gras, l'italique et les pastilles", () => {
    expect(ligneEnHtml("a <b> **gras** *ital* [@jeu:j1|Halli Galli]")).toBe(
      'a &lt;b&gt; <b>gras</b> <i>ital</i> <span class="cite cite-jeu">🎲 Halli Galli</span>');
    expect(ligneEnHtml("[@outil:o1|Réglette]", true)).toBe(
      '<span class="cite cite-outil" contenteditable="false" data-cite="outil:o1" data-titre="Réglette">📏 Réglette</span>');
  });

  it("numérote les phases pour la lecture, garde de quoi se réécrire pour l'éditeur", () => {
    const lu = documentEnHtml("## Mise en route (5 min)\n- un\n[img:x.png]", { image: (n) => `data:${n}` });
    expect(lu).toBe('<h3 class="doc-phase"><span class="doc-numero">1</span>Mise en route<span class="doc-duree">5 min</span></h3><ul><li>un</li></ul><figure class="doc-image"><img src="data:x.png" alt=""></figure>');
    expect(documentEnHtml("", { edition: true })).toBe("<p><br></p>");
  });

  it("montre une citation du coffre en entier à la lecture, en une ligne dans l'éditeur", () => {
    const long = "Le langage oral est le pivot des apprentissages, à l'école maternelle comme à l'école élémentaire, pour tous.";
    const marque = `[cite:${btoa(unescape(encodeURIComponent(JSON.stringify({ texte: long, source: "Guide <oral>", page: "12" }))))}]`;
    expect(ligneEnHtml(marque)).toBe(`<span class="doc-citation">« ${long} » <span class="doc-source">— Guide &lt;oral&gt;, p. 12</span></span>`);
    const edite = ligneEnHtml(marque, true);
    expect(edite).toContain("…");
    expect(edite).toContain(`data-brut="${marque}"`);
    expect(ligneEnHtml("[cite:illisible]")).toBe("");
  });

  it("le document vide se lit vide", () => {
    expect(lireSeance("")).toEqual({ intro: "", phases: [] });
    expect(texteDuDeroulement("")).toBe("");
  });

  it("montre chaque phase en carte : déroulement et posture côte à côte, les autres champs remplis dessous", () => {
    const html = seanceEnCartes(CARTES);
    expect(html).toContain('<div class="doc-intro"><p>Avant tout.</p></div>');
    expect(html).toContain('<span class="ph-n">1</span><h3 class="ph-titre-lu">Mise en route</h3><span class="ph-chip">5 min</span><span class="ph-orga">👥 Collectif</span>');
    expect(html).toContain('<span class="ph-label">Posture de l\'enseignant</span><p>Questionne.</p>');
    // Un champ vide ne s'affiche pas à la lecture ; un titre vide se lit « Phase ».
    expect(html).not.toContain("Différenciation");
    expect(html).toContain('<span class="ph-n">2</span><h3 class="ph-titre-lu">Phase</h3>');
  });
});

const CARTES = [
  "Avant tout.",
  "## Mise en route (5 min)",
  "On relit [@affichage:a1|Les étapes du récit].",
  "### Posture de l'enseignant",
  "Questionne.",
  "### Organisation",
  "Collectif",
  "## (10 min)",
  "### Différenciation",
].join("\n");

describe("les phases en cartes", () => {
  it("se lisent avec leurs champs et se réécrivent à l'identique, titre vide compris", () => {
    const s = lireSeance(CARTES);
    expect(s.intro).toBe("Avant tout.");
    expect(s.phases).toEqual([
      { titre: "Mise en route", duree: "5 min", deroulement: "On relit [@affichage:a1|Les étapes du récit].",
        champs: [{ nom: "Posture de l'enseignant", texte: "Questionne." }, { nom: "Organisation", texte: "Collectif" }] },
      { titre: "", duree: "10 min", deroulement: "", champs: [{ nom: "Différenciation", texte: "" }] },
    ]);
    expect(ecrireSeance(s)).toBe(CARTES);
    expect(citationsDuDocument(CARTES).map((c) => c.phase)).toEqual([1]);
  });

  it("range dans son champ la posture écrite en ligne des premières séances", () => {
    const s = lireSeance("## Jeu\nOn joue.\n*Posture de l'enseignant : observe*");
    expect(s.phases[0]).toEqual({ titre: "Jeu", duree: "", deroulement: "On joue.", champs: [{ nom: "Posture de l'enseignant", texte: "observe" }] });
  });

  it("protège une ligne qui commence par « # » : elle ne devient ni phase ni champ", () => {
    const ecrit = ecrireDocument([{ t: "texte", texte: "## pas une phase" }, { t: "texte", texte: "### ni un champ" }]);
    expect(ecrit).toBe("\\## pas une phase\n\\### ni un champ");
    expect(lireSeance(ecrit).phases).toEqual([]);
    expect(lireDocument(ecrit)).toEqual([{ t: "texte", texte: "## pas une phase" }, { t: "texte", texte: "### ni un champ" }]);
  });

  it("ajoute un champ à toutes les phases, le retire de toutes, et sait où il est rempli", () => {
    const avec = ajouterChamp(CARTES, "Matériel");
    expect(lireSeance(avec).phases.map((p) => p.champs.map((c) => c.nom))).toEqual([
      ["Posture de l'enseignant", "Organisation", "Matériel"], ["Différenciation", "Matériel"],
    ]);
    expect(ajouterChamp(avec, "matériel")).toBe(avec);
    expect(champsDesPhases(lireSeance(avec).phases)).toEqual(["Posture de l'enseignant", "Organisation", "Différenciation", "Matériel"]);
    expect(phasesOuLeChampEstRempli(avec, "Organisation")).toBe(1);
    expect(phasesOuLeChampEstRempli(avec, "Matériel")).toBe(0);
    expect(retirerChamp(avec, "Matériel")).toBe(CARTES);
  });

  it("donne aux tablettes une colonne par champ ajouté, et au PDF du jour les champs nommés", () => {
    expect(tableauDuDocument(CARTES)).toEqual([
      ["Phase", "Durée", "Description", "Posture de l'enseignant", "Organisation", "Différenciation"],
      ["Mise en route", "5 min", "On relit Les étapes du récit.", "Questionne.", "Collectif", ""],
      ["Phase 2", "10 min", "", "", "", ""],
    ]);
    expect(texteDuDeroulement(CARTES)).toBe([
      "Avant tout.",
      "1. Mise en route — 5 min · Collectif",
      "On relit Les étapes du récit.",
      "Posture de l'enseignant : Questionne.",
      "2. Phase — 10 min",
    ].join("\n"));
  });
});
