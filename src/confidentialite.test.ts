import { describe, it, expect } from "vitest";
import { nomsDansUnTexte, pseudonymiser, pseudonymiserTout, restaurer } from "./confidentialite";

const eleves = ["Amandine Martin", "Léo Dubois-Durand", "Rose Petit"];

describe("pseudonymiser", () => {
  it("aucun nom d'élève ne reste dans le texte envoyé", () => {
    const { texte } = pseudonymiser("Amandine Martin a lu seule. Ensuite Léo a aidé Amandine.", eleves);
    for (const mot of ["Amandine", "Martin", "Léo"]) expect(texte).not.toContain(mot);
    expect(texte).toBe("[P1] a lu seule. Ensuite [P2] a aidé [P3].");
  });

  it("le nom complet passe avant le prénom seul", () => {
    const { table } = pseudonymiser("Amandine Martin, puis Amandine.", eleves);
    expect(table.map((r) => r.original).sort()).toEqual(["Amandine", "Amandine Martin"]);
  });

  it("un nom composé reste un seul nom", () => {
    const { texte } = pseudonymiser("M. Dubois-Durand est venu.", eleves);
    expect(texte).toBe("M. [P1] est venu.");
  });

  it("un mot courant en minuscules n'est pas pris pour une élève", () => {
    expect(pseudonymiser("Une fleur rose.", eleves).texte).toBe("Une fleur rose.");
    expect(pseudonymiser("Rose est là.", eleves).texte).toBe("[P1] est là.");
  });

  it("un morceau de mot n'est pas un nom", () => {
    expect(pseudonymiser("Martine et Leonard", eleves).texte).toBe("Martine et Leonard");
  });

  it("les majuscules d'origine reviennent telles quelles", () => {
    const { texte, table } = pseudonymiser("AMANDINE progresse.", eleves);
    expect(texte).toBe("[P1] progresse.");
    expect(restaurer("[P1] fait des progrès.", table).texte).toBe("AMANDINE fait des progrès.");
  });

  it("un prénom écrit en minuscules, ou sans ses accents, ne part pas non plus", () => {
    const { texte, table } = pseudonymiser("amandine a lu. ines aussi, puis leo.", [...eleves, "Inès Bernard"]);
    expect(texte).toBe("[P1] a lu. [P2] aussi, puis [P3].");
    expect(restaurer(texte, table).texte).toBe("amandine a lu. ines aussi, puis leo.");
  });

  it("la particule d'un nom de famille n'est jamais masquée seule", () => {
    const { texte } = pseudonymiser("Le chat de Léa Le Gall. Le Gall est venu, la maman de Léa aussi.", ["Léa Le Gall"]);
    expect(texte).toBe("Le chat de [P1]. Le [P2] est venu, la maman de [P3] aussi.");
  });

  it("un nom de famille qui est un mot courant ne masque pas ce mot en minuscules", () => {
    expect(pseudonymiser("Un petit chat, petit à petit.", eleves).texte).toBe("Un petit chat, petit à petit.");
    expect(pseudonymiser("Rose Petit a lu.", eleves).texte).toBe("[P1] a lu.");
  });

  it("un texte décomposé (accents en deux caractères) est masqué comme les autres", () => {
    const decompose = "Léo a lu.";
    expect(pseudonymiser(decompose, eleves).texte).toBe("[P1] a lu.");
  });
});

describe("restaurer", () => {
  it("remet chaque nom à sa place, même déplacé", () => {
    const { table } = pseudonymiser("Amandine aide Léo.", eleves);
    expect(restaurer("[P2] est aidé par [P1].", table).texte).toBe("Léo est aidé par Amandine.");
  });

  it("signale un nom disparu de la réponse", () => {
    const { table } = pseudonymiser("Amandine aide Léo.", eleves);
    expect(restaurer("[P1] aide un camarade.", table).absents).toEqual(["Léo"]);
  });

  it("un texte sans élève passe inchangé", () => {
    const r = pseudonymiser("La séance a bien commencé.", eleves);
    expect(r.table).toEqual([]);
    expect(restaurer(r.texte, r.table).texte).toBe("La séance a bien commencé.");
  });
});

describe("les noms dans un texte libre", () => {
  it("retrouve les personnes, pas les titres ni les fonctions", () => {
    expect(nomsDansUnTexte("Mme Martin — 01 xx xx xx xx")).toEqual(["Martin"]);
    expect(nomsDansUnTexte("Sophie (classe 2), Karim (atelier cuisine)")).toEqual(["Sophie", "Karim"]);
    expect(nomsDansUnTexte("Léa (AESH), psychomotricienne le mardi")).toEqual(["Léa"]);
    expect(nomsDansUnTexte("M. Durand, enseignant référent ; la maman de Camille, Dr Nguyen")).toEqual(["Durand", "Camille", "Nguyen"]);
  });

  it("les personnes d'une réunion partent masquées avec les élèves", () => {
    const noms = [...eleves, ...nomsDansUnTexte("Mme Bernard (maman), Julie (AESH)")];
    const { texte } = pseudonymiser("Mme Bernard et Julie trouvent qu'Amandine progresse.", noms);
    expect(texte).toBe("Mme [P1] et [P2] trouvent qu'[P3] progresse.");
  });
});

describe("plusieurs textes masqués ensemble", () => {
  it("un même nom porte le même marqueur d'un texte à l'autre, et la réponse se restaure d'un coup", async () => {
    const { pseudonymiserTout } = await import("./confidentialite");
    const { textes, table } = pseudonymiserTout(["Comment aider Amandine ?", "Amandine et Léo lisent ensemble."], eleves);
    expect(textes).toEqual(["Comment aider [P1] ?", "[P1] et [P2] lisent ensemble."]);
    expect(restaurer("Proposez à [P1] de lire avec [P2].", table).texte).toBe("Proposez à Amandine de lire avec Léo.");
  });

  it("un texte sans nom revient tel quel", async () => {
    const { pseudonymiserTout } = await import("./confidentialite");
    expect(pseudonymiserTout(["Les fractions au CM1"], eleves).textes).toEqual(["Les fractions au CM1"]);
  });
});

// Des textes inventés, pleins des pièges d'un vrai compte rendu : aucun de ces noms n'est celui d'un élève.
describe("un texte sur les élèves part sans rien qui désigne quelqu'un (« anonymiser mais que ça fonctionne quand même avec la ligne »)", () => {
  const sur = (textes: string[], lieux: string[] = []) => pseudonymiserTout(textes, ["Octave Martin"], { portee: "eleves", lieux });

  it("masque les personnes que l'application ne connaît pas : un prénom courant, le nom après « son frère » ou « Mme », et ce nom partout", () => {
    const { textes: [t], table } = sur(["Octave a lu seul. Son frère Kylian est venu avec sa maman, Mme Benali ; Lucas et Emma Van Damme ont joué. Benali rappellera."]);
    expect(t).toBe("[P1] a lu seul. Son frère [P2] est venu avec sa maman, [P3] ; [P4] et [P5] ont joué. [P3] rappellera.");
    expect(table.find((r) => r.marqueur === "[P5]")?.original).toBe("Emma Van Damme");
    // Le niveau qui suit un prénom reste : « Emma CE1 » ; un mot courant en minuscules aussi.
    expect(sur(["Emma CE1 a peint en rose ; Rose aussi."]).textes[0]).toBe("[P1] CE1 a peint en rose ; [P2] aussi.");
  });

  it("masque les lieux, les dates précises, les coordonnées et les numéros", () => {
    const { textes: [t] } = sur(["Né le 12/03/2017 à Sarcelles, il habite au 12 bis rue du Général de Gaulle, 95200 Sarcelles. "
      + "Tél. : 06 12 34 56 78, parents@exemple.fr. INE 1234567890A. Suivi au CMP de Gonesse, scolarisé à l'IME Les Tilleuls, né en 2016."],
    ["École Berardin Moulin"]);
    expect(t).toBe("Né le [Date 1] à [Lieu 1], il habite au [Lieu 2], [Lieu 3]. Tél. : [Contact 1], [Contact 2]. INE [Numéro 1]. "
      + "Suivi au CMP de [Lieu 4], scolarisé à l'IME [Lieu 5], né en [Date 2].");
    // Le mois et l'année, le jour de la semaine : ils ne désignent personne.
    expect(sur(["En janvier 2025, réunion ESS ; mardi, sortie au parc."]).textes[0]).toBe("En janvier 2025, réunion ESS ; mardi, sortie au parc.");
    // L'établissement, partout et quelle que soit la portée.
    expect(pseudonymiserTout(["Sortie de l'École Berardin Moulin."], [], { lieux: ["École Berardin Moulin"] }).textes[0]).toBe("Sortie de l'[Lieu 1].");
  });

  it("remplace un diagnostic rare par sa catégorie, garde ce qui est courant", () => {
    const { textes: [t] } = sur(["Syndrome de Rett, épilepsie (syndrome de West), microdélétion 22q11 ; sa cousine : syndrome d'Asperger. TSA, trisomie 21."]);
    expect(t).toBe("[Santé 1 : un syndrome génétique rare], épilepsie ([Santé 2 : une épilepsie rare]), [Santé 3 : une anomalie chromosomique rare] ; "
      + "sa cousine : syndrome d'Asperger. TSA, trisomie 21.");
  });

  it("remet tout à sa place dans la réponse, même un marqueur recopié sans sa catégorie", () => {
    const { table } = sur(["Le 3 mars, Kylian (syndrome de Rett) est allé au CMP de Gonesse."]);
    expect(restaurer("[Date 1] : [P1] ([Santé 1]) va au CMP de [Lieu 1]. [Santé 1 : un syndrome génétique rare].", table).texte)
      .toBe("3 mars : Kylian (syndrome de Rett) va au CMP de Gonesse. syndrome de Rett.");
    // Une personne qui disparaît de la réponse se signale ; une date, non.
    expect(restaurer("Rien.", table).absents).toEqual(["Kylian"]);
  });

  it("masque un nom connu mal écrit, à une faute près, deux à partir de sept lettres, et le rend à la restauration", () => {
    const { texte, table } = pseudonymiser("Nisl a lu, puis Matilde a écrit. Nilss aussi.", ["Nils", "Mathilda"]);
    expect(texte).toBe("[P1] a lu, puis [P2] a écrit. [P3] aussi.");
    expect(restaurer(texte, table).texte).toBe("Nisl a lu, puis Matilde a écrit. Nilss aussi.");
  });

  it("ne prend pour une faute ni un mot sans majuscule, ni un mot trop loin, ni le voisin d'un mot courant", () => {
    expect(pseudonymiser("Il sera là, avec Nolis.", ["Sara", "Nils"]).texte).toBe("Il sera là, avec Nolis.");
    // Un mot de trop se masque sans dommage : il revient tel quel.
    const trop = pseudonymiser("Sera-t-il là ? Il sera là.", ["Sara"]);
    expect(trop.texte).toBe("[P1]-t-il là ? Il sera là.");
    expect(restaurer(trop.texte, trop.table).texte).toBe("Sera-t-il là ? Il sera là.");
    expect(pseudonymiser("Roses rouges.", ["Rose"]).texte).toBe("Roses rouges.");
    expect(pseudonymiser("Tous les Mardis.", ["Mardie"]).texte).toBe("Tous les [P1].");
    expect(pseudonymiser("Mardi matin.", ["Mardie"]).texte).toBe("Mardi matin.");
  });

  it("reconnaît un nom connu écrit autrement : composé, d'un seul tenant, sans ligature, décomposé, collé", () => {
    const m = (t: string, noms: string[]) => pseudonymiser(t, noms).texte;
    expect(m("Zéphyrine lit.", ["Marie-Zéphyrine"])).toBe("[P1] lit.");
    expect(m("Mariezéphyrine lit.", ["Marie-Zéphyrine"])).toBe("[P1] lit.");
    expect(m("Marie\u2011Zéphyrine lit.", ["Marie-Zéphyrine"])).not.toContain("Zéphyrine");
    expect(m("N’Zébi lit.", ["N'Zébi"])).toBe("[P1] lit.");
    expect(m("Coelie lit.", ["Cœlie"])).toBe("[P1] lit.");
    expect(m("Legoff lit.", ["Le Goff"])).toBe("[P1] lit.");
    expect(m("Mélusine lit.", ["Me\u0301lusine"])).toBe("[P1] lit.");
    expect(m("Ondine2 et cahierOndine.pdf", ["Ondine"])).toBe("[P1]2 et cahier[P1].pdf");
  });

  it("masque le nom de famille collé à un prénom connu", () => {
    const m = (t: string) => pseudonymiser(t, ["Amandine"], { portee: "eleves" }).texte;
    expect(m("Amandine Roussel lit.")).toBe("[P1] [P2] lit.");
    expect(m("ROUSSEL Amandine lit.")).toBe("[P1] [P2] lit.");
    // Ni un mois, ni un jour, ni un sigle, ni une phrase qui commence.
    expect(m("Amandine Lundi, Amandine IME. Amandine. Elle lit.")).toBe("[P1] Lundi, [P1] IME. [P1]. Elle lit.");
  });

  it("voit les personnes qu'on note à la va-vite", () => {
    const m = (t: string) => pseudonymiser(t, [], { portee: "eleves" }).texte;
    expect(m("Frère : Thaddée vient.")).toBe("Frère : [P1] vient.");
    expect(m("Mère : ROUSSEL Ysaline.")).toBe("Mère : [P1].");
    expect(m("Une fille qui s'appelle Thaddée.")).toBe("Une fille qui s'appelle [P1].");
    expect(m("M Roussel vient. MME BOILEAU aussi.")).toBe("M [P1] vient. MME [P2] aussi.");
    expect(m("Vu avec mme roussel.")).toBe("Vu avec mme [P1].");
    expect(m("Mme est venue.")).toBe("Mme est venue.");
    expect(m("Il lit lorsqu'Emma écrit. QU'EMMA écrive.")).toBe("Il lit lorsqu'[P1] écrit. QU'[P1] écrive.");
    expect(m("BERTHELOT Emma lit.")).toBe("[P1] lit.");
  });

  it("voit les lieux, les dates et les numéros écrits autrement", () => {
    const m = (t: string, lieux: string[] = []) => pseudonymiser(t, [], { portee: "eleves", lieux }).texte;
    expect(m("Il vient de déménager à Sarcelles.")).toBe("Il vient de déménager à [Lieu 1].");
    expect(m("Il est hospitalisé à Necker.")).toBe("Il est hospitalisé à [Lieu 1].");
    expect(m("Vu au CHU de Nice, au MAS du Parc et au CRA de Reims.")).toBe("Vu au CHU de [Lieu 1], au MAS du [Lieu 2] et au CRA de [Lieu 3].");
    expect(m("Il habite 12 rue des lilas, code 95200.")).toBe("Il habite [Lieu 1], code [Lieu 2].");
    expect(m("3 cours de français, 2 places.")).toBe("3 cours de français, 2 places.");
    expect(m("Sortie à Sarcelles, retour aux Tilleuls.", ["IME Les Tilleuls", "95200 Sarcelles"])).toBe("Sortie à [Lieu 1], retour aux [Lieu 2].");
    expect(m("Née en mars 2017, vue le 12/03, puis le trois mars. Note : 12/20, 3/4 de la classe.")).toBe("Née en [Date 1], vue [Date 2], puis le [Date 3]. Note : 12/20, 3/4 de la classe.");
    expect(m("Tél. +33 (0)6 12 34 56 78, INE 123 456 789 AB.")).toBe("Tél. [Contact 1], INE [Numéro 1].");
    expect(m("Le syndrome de rett, un Angelman, et Duchenne. Mme Barrett.")).toBe("Le [Santé 1 : un syndrome génétique rare], un [Santé 2 : un syndrome génétique rare], et [Santé 3 : un syndrome génétique rare]. Mme [P1].");
  });

  it("voit un nom collé à l'échappement d'un texte en JSON", () => {
    const { texte } = pseudonymiser(JSON.stringify({ note: "Bilan\nAmandine lit\tLéo écrit\nAmandin relit" }), eleves);
    for (const mot of ["Amandin", "Léo"]) expect(texte).not.toContain(mot);
    expect(texte).toBe('{"note":"Bilan\\n[P1] lit\\t[P2] écrit\\n[P3] relit"}');
  });

  it("laisse un texte de classe tel qu'il est : les personnages d'une histoire, les dates d'une leçon", () => {
    expect(pseudonymiserTout(["Pierre et le loup ; le 14 juillet 1789, la Bastille."], ["Octave Martin"]).textes[0])
      .toBe("Pierre et le loup ; le 14 juillet 1789, la Bastille.");
    // Les coordonnées, elles, ne partent jamais.
    expect(pseudonymiserTout(["Appeler le 06 12 34 56 78."], []).textes[0]).toBe("Appeler le [Contact 1].");
  });
});
