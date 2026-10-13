import { describe, it, expect } from "vitest";
import {
  FORMES, PROCEDURES, REGLAGES_PROBLEME, TYPES, autresSituations, cequiManque, htmlProblemeDuJour, maxParDefaut, modesDeLaPeriode,
  problemesDeLaPeriode, reglagesDuNiveau, reglagesDuType, reglagesSurs, situationDe, typeDe, typesDuNiveau,
  type Probleme, type ReglagesProbleme,
} from "./problemeDuJour";
import {
  ATELIER_PROBLEME_DU_JOUR, demarcheDeLaPeriode, deroulementDeLaSemaine, feuillesDeLaPeriode, materielDeLaSemaine, planDuProblemeDuJour,
  reglagesPourLaCompetence, typePourLaCompetence,
} from "./sequenceProblemeDuJour";
import { SEANCE_DES_MOTS_MATERNELLE, enoncesDuHtml } from "./motsDesProblemes";
import { hasard } from "./hasard";

/** Toutes les périodes : chaque sorte de problème, à chaque âge, dans chacune de ses situations, sur quelques tirages. */
function toutesLesPeriodes(): { r: ReglagesProbleme; periode: Probleme[][] }[] {
  const sortie: { r: ReglagesProbleme; periode: Probleme[][] }[] = [];
  for (const t of TYPES) for (const niveau of t.niveaux) for (const situation of t.situations) for (let g = 1; g <= 6; g++) {
    const r = reglagesSurs({ ...REGLAGES_PROBLEME, niveau, type: t.id, situation, max: maxParDefaut(niveau, t.id), semaines: 4 + (g % 3), jours: g % 2 ? 4 : 5 });
    sortie.push({ r, periode: problemesDeLaPeriode(r, hasard(g * 104729)) });
  }
  return sortie;
}

describe("les sortes de problèmes", () => {
  it("changent avec l'âge : ajouter et enlever avant 4 ans, la piste et les groupes à partir de 4 ans, la transformation en grande section", () => {
    expect(typesDuNiveau("PS").map((t) => t.id)).toEqual(["ajout", "retrait"]);
    expect(typesDuNiveau("MS").map((t) => t.id)).toEqual(["ajout", "retrait", "ajoutRetrait", "piste", "groupements", "partage"]);
    expect(typesDuNiveau("GS").map((t) => t.id)).toEqual(TYPES.map((t) => t.id));
    expect(typeDe("groupements").quand?.MS).toContain("février");
    // Le plus grand nombre de l'âge, celui du programme : trois, six, dix ; la piste va jusqu'à dix.
    expect(maxParDefaut("PS", "ajout")).toBe(3);
    expect(maxParDefaut("MS", "partage")).toBe(6);
    expect(maxParDefaut("GS", "ajout")).toBe(10);
    expect(maxParDefaut("MS", "piste")).toBe(10);
  });

  it("ont chacune au moins deux situations, pour la semaine des autres contextes", () => {
    for (const t of TYPES) {
      expect(t.situations.filter((s) => s !== "perso").length, t.id).toBeGreaterThanOrEqual(2);
      for (const s of t.situations) expect(situationDe(s).famille, `${t.id} ${s}`).toBe(t.famille);
      expect(autresSituations({ type: t.id, situation: t.situations[0] })).not.toContain(t.situations[0]);
    }
  });

  it("disent les façons de chercher à la première personne", () => {
    for (const liste of Object.values(PROCEDURES)) for (const p of liste) expect(p.texte).toMatch(/^Je |^J'/);
  });
});

describe("la période", () => {
  it("garde les nombres dans les limites de l'âge, sans réponse nulle", () => {
    for (const { r, periode } of toutesLesPeriodes()) {
      for (const semaine of periode) for (const p of semaine) {
        const cas = `${r.type} ${r.niveau} ${p.situation} S${p.semaine + 1} : ${p.enonce}`;
        for (const k of p.nombres) {
          expect(k, cas).toBeGreaterThanOrEqual(1);
          expect(k, cas).toBeLessThanOrEqual(r.max);
        }
        const resultat = parseInt(p.resultat.replace(/^\D+/, ""), 10);
        expect(resultat, cas).toBeGreaterThanOrEqual(1);
        expect(resultat, cas).toBeLessThanOrEqual(r.max);
        // Les tous petits ne vont pas au-delà de trois.
        if (r.niveau === "PS") expect(Math.max(...p.nombres, resultat), cas).toBeLessThanOrEqual(3);
        // Pas de reste avant 5 ans ; trois parties seulement en grande section.
        if (r.niveau !== "GS") expect(p.resultat, cas).not.toContain("reste");
        if (r.niveau !== "GS") expect(p.nombres.length, cas).toBeLessThanOrEqual(2);
      }
    }
  });

  it("monte d'une semaine à l'autre : la première reste en deçà du plus grand nombre", () => {
    for (const niveau of ["MS", "GS"] as const) {
      const r = reglagesSurs({ ...REGLAGES_PROBLEME, niveau, type: "ajout", max: maxParDefaut(niveau, "ajout") });
      for (let g = 1; g <= 5; g++) {
        const periode = problemesDeLaPeriode(r, hasard(g));
        const totaux = (i: number) => periode[i].map((p) => Number(p.resultat));
        expect(Math.max(...totaux(0)), `${niveau} ${g}`).toBeLessThan(r.max);
      }
    }
  });

  it("suit les semaines du livret : les objets, les images, les jetons, sans manipuler, puis d'autres situations", () => {
    expect(modesDeLaPeriode(5)).toEqual(["objets", "images", "jetons", "tete", "contextes"]);
    expect(modesDeLaPeriode(4)).toEqual(["objets", "images", "tete", "contextes"]);
    expect(modesDeLaPeriode(6)).toEqual(["objets", "images", "jetons", "tete", "tete", "contextes"]);
    const r = reglagesSurs({ ...REGLAGES_PROBLEME, niveau: "MS", type: "ajout", situation: "valise" });
    const periode = problemesDeLaPeriode(r, hasard(3));
    expect(periode).toHaveLength(5);
    for (const semaine of periode) expect(semaine).toHaveLength(4);
    for (const semaine of periode.slice(0, 4)) for (const p of semaine) expect(p.situation).toBe("valise");
    expect(new Set(periode[4].map((p) => p.situation)).has("valise")).toBe(false);
    // Le même tirage redonne la même période.
    expect(problemesDeLaPeriode(r, hasard(3))).toEqual(periode);
  });

  it("écrit des énoncés accordés : un cheval, des chevaux ; jamais un chiffre en tête de phrase", () => {
    for (const { periode } of toutesLesPeriodes()) for (const semaine of periode) for (const p of semaine) {
      expect(p.enonce, p.enonce).not.toMatch(/(?:^|[.?!] )\d/);
      expect(p.enonce, p.enonce).not.toMatch(/\b1 (?:chevaux|peluches|bonnets|crayons|livres|billes|oiseaux|balles|perles|gâteaux|cases|sauts)\b/);
      expect(p.enonce, p.enonce).not.toMatch(/\b(?:[2-9]|10) (?:cheval|peluche|bonnet|crayon|livre|bille|oiseau|balle|perle|gâteau|case|saut)\b/);
      expect(p.enonce, p.enonce).toMatch(/\?$/);
      expect(p.reponse.length, p.enonce).toBeGreaterThan(0);
    }
    const r = reglagesSurs({ ...REGLAGES_PROBLEME, niveau: "PS", type: "retrait", situation: "valise", mascotte: "Nono" });
    expect(problemesDeLaPeriode(r, hasard(1))[0][0].enonce).toMatch(/^Dans la valise de Nono, il y a \d (?:peluches?)\. Nono en sort \d\. Combien de peluches reste-t-il dans la valise \?$/);
  });

  it("prend la situation de l'enseignant : son contenant, son objet, au singulier et au pluriel", () => {
    const r = reglagesSurs({
      ...REGLAGES_PROBLEME, niveau: "MS", type: "ajout", situation: "perso", mascotte: "Pilou",
      perso: { lieu: "le panier", objet: "pomme", objets: "pommes", feminin: true, pictoLieu: { id: 3012, mot: "panier" }, pictoObjet: { id: 2462, mot: "pomme" } },
    });
    const p = problemesDeLaPeriode(r, hasard(9))[0][0];
    expect(p.enonce).toMatch(/^Pilou met \d pommes? dans le panier\. Puis Pilou en met encore \d\. Combien de pommes y a-t-il dans le panier \?$/);
    expect(cequiManque({ ...r, perso: { ...r.perso, objet: " " } })).toMatch(/objet/);
  });
});

describe("les réglages", () => {
  it("se réparent : une sorte de problème que l'âge n'a pas, des nombres hors des bornes", () => {
    const r = reglagesSurs({ niveau: "PS", type: "partage", max: 99, semaines: 12, jours: 7, forme: "rien" as never, semaine: 9 });
    expect(r.type).toBe("ajout");
    expect(r.max).toBe(10);
    expect(r.semaines).toBe(6);
    expect(r.jours).toBe(4);
    expect(r.forme).toBe("cartes");
    expect(r.semaine).toBe(6);
    expect(reglagesSurs({ niveau: "GS", type: "groupements", max: 2 }).max).toBe(4);
  });

  it("suivent l'âge et la sorte de problème : la situation de référence, le plus grand nombre", () => {
    const ms = reglagesSurs({ ...REGLAGES_PROBLEME, niveau: "MS", type: "partage", situation: "poupees" });
    expect(reglagesDuNiveau(ms, "PS")).toMatchObject({ niveau: "PS", type: "ajout", situation: "valise", max: 3 });
    expect(reglagesDuType(ms, "piste")).toMatchObject({ type: "piste", situation: "oie", max: 10 });
    expect(reglagesDuType(ms, "groupements")).toMatchObject({ type: "groupements", situation: "poupees", max: ms.max });
  });

  it("viennent de la compétence du programme 2025 : la sorte de problème qu'elle appelle, à son âge", () => {
    expect(typePourLaCompetence("Recherche du tout ou d'une partie dans un problème de parties-tout", "PS")).toBe("ajout");
    expect(typePourLaCompetence("Rechercher le tout ou une partie dans un problème de parties-tout", "MS")).toBe("ajoutRetrait");
    expect(typePourLaCompetence("Trouver une position finale à partir d'une position initiale et d'un déplacement sur une piste du type jeu de l'oie ou bande numérique", "MS")).toBe("piste");
    expect(typePourLaCompetence("Rechercher le tout dans un problème de groupements", "MS")).toBe("groupements");
    expect(typePourLaCompetence("Déterminer la quantité d'objets ayant été ajoutée ou retirée à une collection à partir de ses quantités initiale et finale", "GS")).toBe("complement");
    expect(typePourLaCompetence("Déterminer le cardinal d'une collection à partir de celui d'une autre collection et de l'écart entre les deux.", "GS")).toBe("comparaison");
    expect(typePourLaCompetence("Déterminer la valeur d'une part dans un problème de partage équitable (avec éventuellement un reste)", "GS")).toBe("partage");
    expect(typePourLaCompetence("Déterminer le tout dans un problème de groupement d'objets", "GS")).toBe("groupements");
    expect(reglagesPourLaCompetence("Rechercher le tout dans un problème de groupements", "MS")).toMatchObject({ niveau: "MS", type: "groupements", situation: "jongleurs", max: 6 });
    // Chaque sorte de problème dit les mots de sa compétence, à chaque âge où on la pose.
    for (const t of TYPES) for (const n of t.niveaux) expect(t.competence[n], `${t.id} ${n}`).toBeInstanceOf(RegExp);
  });
});

describe("les feuilles", () => {
  const r = reglagesSurs({ ...REGLAGES_PROBLEME, niveau: "MS", type: "ajout", situation: "valise" });
  const images = { 2931: "data:image/png;base64,VA", 4945: "data:image/png;base64,PE" };

  it("disent chaque problème du jour sur sa carte, et le plan de la période pour le maître", () => {
    const html = htmlProblemeDuJour(r, images, hasard(5));
    expect(enoncesDuHtml(html)).toHaveLength(20);
    expect(html).toContain('class="pj-plan"');
    expect(html.match(/class="pj-reponse corrige"/g)).toHaveLength(20);
    expect(html).toContain("ARASAAC");
    // Une semaine seule : ses quatre cartes, sans le plan.
    const semaine2 = htmlProblemeDuJour({ ...r, semaine: 2 }, images, hasard(5));
    // Le relevé des énoncés laisse une espace où le nombre en gras se fermait.
    expect(enoncesDuHtml(semaine2).map((e) => e.replace(/ ([.,])/g, "$1"))).toEqual(problemesDeLaPeriode(r, hasard(5))[1].map((p) => p.enonce));
    expect(semaine2).not.toContain('class="pj-plan"');
  });

  it("ne portent ni prénom ni date remplis : la ligne reste vierge", () => {
    for (const f of FORMES) {
      const html = htmlProblemeDuJour({ ...r, forme: f.id }, images, hasard(5));
      expect(html, f.id).not.toMatch(/Prénom : [^…<\s]/);
      expect(html, f.id).not.toMatch(/Date : [^…<\s]/);
    }
    expect(htmlProblemeDuJour({ ...r, forme: "recherche" }, images, hasard(5))).toContain("Prénom : ……");
  });

  it("font chacune ce qu'elles annoncent : l'affiche, le matériel, les étiquettes, la recherche, la grille", () => {
    const de = (forme: ReglagesProbleme["forme"], x: Partial<ReglagesProbleme> = {}) => htmlProblemeDuJour({ ...r, ...x, forme }, images, hasard(5));
    expect(de("affiche")).toContain("Je montre avec mes doigts.");
    expect(de("affiche")).toContain(problemesDeLaPeriode(r, hasard(5))[0][0].enonce.split(" ")[0]);
    expect(de("materiel").match(/class="carte pj-objet"/g)).toHaveLength(4 * (r.max + 1));
    expect(de("etiquettes")).toContain("La boîte à problèmes");
    expect(de("etiquettes").match(/class="pj-chiffre"/g)).toHaveLength(r.max);
    // La recherche : les problèmes de la semaine sans manipuler, deux par page.
    expect(de("recherche").match(/class="pj-recherche"/g)).toHaveLength(4);
    expect(de("recherche")).toContain("Je dessine pour chercher.");
    // La réponse n'est pas sur la feuille de l'élève : elle est sur la page du maître.
    expect(de("recherche")).not.toMatch(/pj-r-fin[^]*?corrige[^]*?<\/div><\/div><\/div>/);
    expect(de("recherche")).toContain('<div class="page corrige">');
    expect(de("grille")).toContain("Voit d&#39;un coup d&#39;œil 1, 2, 3");
    expect(de("materiel", { type: "piste", situation: "oie", max: 10 })).toContain('class="pj-piste"');
  });
});

describe("la séquence de la période", () => {
  it("met une séance par semaine après celle des mots, chacune avec ses feuilles", () => {
    const r = reglagesSurs({ ...REGLAGES_PROBLEME, niveau: "GS", type: "partage", situation: "poupees" });
    const d = demarcheDeLaPeriode(r);
    expect(d.seances[0]).toBe(SEANCE_DES_MOTS_MATERNELLE);
    expect(d.seances.slice(1).map((s) => s.titre)).toEqual([
      "Semaine 1 — Avec les objets de la situation", "Semaine 2 — Avec des images", "Semaine 3 — Avec des jetons",
      "Semaine 4 — Sans manipuler, puis on vérifie", "Semaine 5 — Dans d'autres situations",
    ]);
    const six = demarcheDeLaPeriode({ ...r, semaines: 6 }).seances.map((s) => s.titre);
    expect(six).toContain("Semaine 5 — Sans manipuler, puis on vérifie (2)");
    const feuilles = feuillesDeLaPeriode(r);
    expect(feuilles.filter((f) => f.forme === "cartes").map((f) => [f.seance, f.semaine])).toEqual([[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]]);
    expect(feuilles.find((f) => f.forme === "materiel")?.seance).toBe(1);
    expect(feuilles.find((f) => f.forme === "recherche")?.seance).toBe(3);
    expect(feuilles.find((f) => f.forme === "grille")?.seance).toBe(4);
    // Avant 4 ans, pas de feuille de recherche ; une piste n'a pas d'étiquettes de boîtes à nombres.
    expect(feuillesDeLaPeriode({ ...r, niveau: "PS", type: "ajout", situation: "valise" }).some((f) => f.forme === "recherche")).toBe(false);
    expect(feuillesDeLaPeriode({ ...r, type: "piste", situation: "oie" }).some((f) => f.forme === "etiquettes")).toBe(false);
  });

  it("tire une seule période pour toutes ses feuilles, que « Modifier dans Fabriquer » refait", () => {
    const r = reglagesSurs({ ...REGLAGES_PROBLEME, niveau: "MS", type: "ajout", situation: "ferme" });
    const plan = planDuProblemeDuJour(r, {});
    const sorties = plan.feuilles.map((f) => f.fabriquer(1));
    expect(new Set(sorties.map((x) => x.graine)).size).toBe(1);
    for (const x of sorties) expect(Object.keys(x.refaire ?? {})).toEqual([ATELIER_PROBLEME_DU_JOUR]);
    const enonces = sorties.flatMap((x) => enoncesDuHtml(x.html));
    expect(enonces).toHaveLength(20);
    expect(plan.materiel).toHaveLength(5);
    expect(plan.materiel[0]).toContain("l'enclos");
    expect(plan.materiel[0]).toContain("L'affiche du problème de référence");
  });

  it("écrit dans chaque séance les problèmes de ses jours, et le matériel de sa semaine", () => {
    const r = reglagesSurs({ ...REGLAGES_PROBLEME, niveau: "MS", type: "ajout", situation: "valise" });
    const semaine = problemesDeLaPeriode(r, hasard(2))[0];
    const texte = deroulementDeLaSemaine(semaine, r);
    expect(texte.split("\n")).toHaveLength(5);
    expect(texte).toContain("• Lundi — ");
    expect(texte).toContain("(Réponse : ");
    expect(materielDeLaSemaine(r, "objets", true)).toContain("la valise, peluches, bonnets, crayons, livres");
    expect(materielDeLaSemaine(r, "images", false)).toContain("images découpées");
    expect(materielDeLaSemaine({ ...r, type: "piste", situation: "oie", max: 10 }, "jetons", false)).toContain("bande numérique");
  });
});
