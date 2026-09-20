import { describe, it, expect } from "vitest";
import {
  blocClasse, blocContacts, blocEmploiDuTemps, blocEleves, blocMateriel, blocSecurite, feuilleRemplacant,
  BLOCS_REMPLACANT, type DonneesClasse,
} from "./remplacant";
import { lireEtablissement } from "./etablissement";
import { nettoyerHtml } from "./texteRiche";

const donnees = (p: Partial<DonneesClasse> = {}): DonneesClasse => ({
  ecole: "IME Les Tilleuls", enseignant: "C. Martin", niveau: "", ime: true, annee: "2026-2027",
  eleves: [
    { id: "e1", nom: "Zéphir Blanc", niveau: "GS", dispositifs: ["PPS", "PAI"], axe: "Attendre son tour" },
    { id: "e2", nom: "Aurélien <Roux>", niveau: "CP", dispositifs: [], axe: "" },
  ],
  edt: [
    { id: "s1", jour: "Lundi", heureDebut: "09:00", heureFin: "10:00", titre: "Scolarité", couleur: "blue", eleves: ["e1", "e2"] },
    { id: "s2", jour: "Mardi", heureDebut: "09:00", heureFin: "10:00", titre: "Piscine", couleur: "blue" },
    { id: "s3", jour: "Lundi", heureDebut: "13:30", heureFin: "14:00", titre: "Synthèse", couleur: "blue", nature: "reunion" },
  ],
  sourceEdt: "ime", ateliers: [], espaces: [], ...p,
});

describe("feuille pour le remplaçant", () => {
  it("présente la classe à partir des réglages", () => {
    const html = blocClasse(donnees(), "14/09/2026");
    expect(html).toContain("<b>École ou établissement :</b> IME Les Tilleuls");
    expect(html).toContain("<b>Effectif :</b> 2 élèves");
    expect(html).toContain("Mise à jour le 14/09/2026");
  });

  it("met l'emploi du temps en tableau, horaires triés, prénoms des présents", () => {
    const html = blocEmploiDuTemps(donnees());
    expect(html).toContain("<th>Horaire</th><th>Lundi</th><th>Mardi</th>");
    expect(html.indexOf("09h00–10h00")).toBeLessThan(html.indexOf("13h30–14h00"));
    expect(html).toContain("<b>Scolarité</b><br>Zéphir, Aurélien");
    expect(html).toContain("(organisation IME)");
  });

  it("liste les élèves avec leurs dispositifs, texte échappé", () => {
    const html = blocEleves(donnees());
    expect(html).toContain("<td>Zéphir Blanc</td><td>GS</td><td>PPS, PAI</td><td>Attendre son tour</td>");
    expect(html).toContain("Aurélien &lt;Roux&gt;");
  });

  it("signale les élèves qui ont un PAI", () => {
    expect(blocSecurite(donnees())).toContain("<b>Élèves avec un PAI :</b> Zéphir Blanc");
    expect(blocSecurite(donnees({ eleves: [] }))).toContain("aucun enregistré");
  });

  it("laisse des lignes à compléter quand l'application ne sait pas", () => {
    expect(blocEmploiDuTemps(donnees({ edt: [], sourceEdt: null }))).toBe("<h2>Emploi du temps</h2><p>…</p>");
  });

  it("reprend les contacts et les repères des réglages, et laisse le reste à compléter", () => {
    const etablissement = lireEtablissement({
      "etab:telephone": "01 85 74 27 87",
      "etab:direction": "Mme Martin",
      "etab:cahiers": "Armoire, étagère du milieu <gauche>",
      "etab:cles": "   ",
    });
    const d = donnees({ etablissement });
    const contacts = blocContacts(d);
    expect(contacts).toContain("<b>Téléphone de l'établissement :</b> 01 85 74 27 87");
    expect(contacts).toContain("<b>Direction :</b> Mme Martin");
    expect(contacts).toContain("<b>Secrétariat :</b> …");
    const materiel = blocMateriel(d);
    expect(materiel).toContain("Armoire, étagère du milieu &lt;gauche&gt;");
    // Un champ laissé vide reste une ligne à remplir à la main.
    expect(materiel).toContain("<b>Clés et badges :</b> …");
    // Sans rien dans les réglages, la feuille est celle d'avant.
    expect(blocContacts(donnees())).toContain("<b>Direction :</b> …");
  });

  it("signe avec la fonction de l'enseignant quand elle est renseignée", () => {
    expect(blocClasse(donnees({ fonction: "Professeur des écoles spécialisé" }), "14/09/2026"))
      .toContain("<b>Enseignant·e :</b> C. Martin — Professeur des écoles spécialisé");
  });

  it("assemble une feuille complète que l'éditeur garde intacte", () => {
    const html = feuilleRemplacant(donnees(), "14/09/2026");
    for (const titre of ["Emploi du temps", "Les élèves", "Sécurité et santé", "Contacts utiles", "Travail prévu"]) expect(html).toContain(titre);
    expect(nettoyerHtml(html)).toBe(html);
    expect(BLOCS_REMPLACANT.length).toBe(10);
  });
});
