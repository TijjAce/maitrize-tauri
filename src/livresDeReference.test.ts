import { describe, it, expect } from "vitest";
import {
  FILTRE_VIDE, LISTES, LIVRES, chercherLivres, descriptionDuFiltre, difficulteLisible, familleDe, famillesDu, filtreSur, listeEnTexte,
  premiereEdition, questionSurLaSelection, questionSurLeLivre, referenceDuLivre, sansAccents, type FiltreLivres,
} from "./livresDeReference";

const f = (p: Partial<FiltreLivres>): FiltreLivres => ({ ...FILTRE_VIDE, ...p });
const titres = (p: Partial<FiltreLivres>) => chercherLivres(f(p)).map((l) => l.titre);
const livre = (titre: string, cycle?: number) => {
  const l = LIVRES.find((x) => x.titre === titre && (!cycle || x.cycle === cycle));
  if (!l) throw new Error(`absent : ${titre}`);
  return l;
};

describe("les listes de référence d'Éduscol", () => {
  it("portent les 908 livres des trois listes, chacun complet", () => {
    expect(LIVRES).toHaveLength(908);
    expect([1, 2, 3].map((c) => LIVRES.filter((l) => l.cycle === c).length)).toEqual([300, 307, 301]);
    for (const l of LIVRES) {
      expect(l.titre.trim(), JSON.stringify(l)).toBeTruthy();
      expect(l.editeur.trim(), l.titre).toBeTruthy();
      expect(l.categorie.trim(), l.titre).toBeTruthy();
      const [a, b] = l.difficulte;
      expect(a >= 1 && a <= b && b <= LISTES[l.cycle].difficulteMax, `${l.titre} : ${l.difficulte}`).toBe(true);
      // Le P et le C des titres des cycles 2 et 3 sont devenus le statut ; l'astérisque du cycle 1, le conte.
      expect(l.titre, l.titre).not.toMatch(/^[CP] -|\*/);
      if (l.conte) expect(l.cycle).toBe(1);
      if (l.illustrateurs) expect(l.illustrateurs, l.titre).not.toBe(l.auteurs);
    }
    expect(livre("Zoom").statut).toBe("C");
    expect(livre("Boucle d'or et les trois ours").conte).toBe(true);
    expect(livre("Le schmat doudou")).toMatchObject({ auteurs: "Bloch, Muriel (raconté par)", illustrateurs: "Jolivet, Jöelle", difficulte: [3, 4] });
  });

  it("cherche sans accents ni majuscules, au début des mots", () => {
    expect(sansAccents("L’École des « Loisirs », Œuvres")).toBe("l ecole des loisirs oeuvres");
    expect(titres({ texte: "zoom" })).toEqual(["Zoom"]);
    // Par l'auteur aussi, et par l'illustrateur.
    expect(titres({ texte: "BANYAI" })).toEqual(["Zoom"]);
    expect(titres({ texte: "jolivet" })).toContain("Le schmat doudou");
    // « loup » trouve les loups, pas « Guadeloupe » ; tous les mots doivent y être.
    const loups = titres({ texte: "loup" });
    expect(loups).toEqual(expect.arrayContaining(["Loup", "Loup noir", "Matty et les cent méchants loups"]));
    for (const l of chercherLivres(f({ texte: "loup" }))) expect(sansAccents(Object.values(l).join(" ")), l.titre).toMatch(/(^| )loup/);
    expect(titres({ texte: "poule rouge" })).toEqual(["La petite poule rouge"]);
    expect(titres({ texte: "ecole des loisirs", cycle: 3 }).length).toBeGreaterThan(20);
  });

  it("met d'abord les titres qui répondent, puis l'ordre des listes", () => {
    // Le titre exact devant ceux qui le contiennent, et ceux-là devant un nom d'auteur.
    expect(titres({ texte: "loup" })[0]).toBe("Loup");
    const poucets = chercherLivres(f({ texte: "petit poucet" }));
    expect(poucets.slice(0, 2).map((l) => l.titre)).toEqual(["Le petit poucet", "Le petit poucet"]);
    // Sans rien à chercher : l'ordre des listes, cycle après cycle.
    const tous = chercherLivres(FILTRE_VIDE);
    expect(tous).toEqual(LIVRES);
  });

  it("filtre par cycle, famille, difficulté et statut", () => {
    expect(chercherLivres(f({ cycle: 2 })).every((l) => l.cycle === 2)).toBe(true);
    // Les mangas et les BD Kids se rangent avec les bandes dessinées.
    expect(familleDe("Bandes dessinées (manga)")).toBe("Bandes dessinées");
    expect(famillesDu(2)).not.toContain("Bandes dessinées (manga)");
    expect(chercherLivres(f({ cycle: 2, famille: "Bandes dessinées" }))).toHaveLength(29);
    // Toutes les poésies : celles du cycle 2 et celles du cycle 3.
    expect(new Set(chercherLivres(f({ famille: "Poésie" })).map((l) => l.cycle))).toEqual(new Set([2, 3]));
    // Un livre « 1 à 4 » répond à la difficulté 4 comme à la 1.
    const quatre = chercherLivres(f({ cycle: 1, difficulte: 4 }));
    expect(quatre.every((l) => l.difficulte[1] === 4)).toBe(true);
    expect(quatre.map((l) => l.titre)).toContain("Anthologie de la comptine traditionnelle francophone (avec cédé)");
    const p = chercherLivres(f({ statut: "P" })).length, c = chercherLivres(f({ statut: "C" })).length;
    expect(p).toBeGreaterThan(50);
    expect(chercherLivres(f({ statut: "PC" }))).toHaveLength(p + c);
  });

  it("relit un filtre gardé en remettant ce qui n'a plus de sens", () => {
    expect(filtreSur(undefined)).toEqual(FILTRE_VIDE);
    expect(filtreSur({ cycle: 2, famille: "Poésie", difficulte: 3, statut: "C", texte: "chat" }))
      .toEqual({ cycle: 2, famille: "Poésie", difficulte: 3, statut: "C", texte: "chat" });
    // Pas de difficulté 4 au cycle 2 ; pas de catégorie du cycle 1 au cycle 3.
    expect(filtreSur({ cycle: 2, difficulte: 4 }).difficulte).toBe(0);
    expect(filtreSur({ cycle: 3, famille: "2.1 Entrer dans la langue, le langage et les images" }).famille).toBe("");
    expect(filtreSur({ cycle: 7, statut: "X", texte: 3 })).toEqual(FILTRE_VIDE);
  });

  it("écrit la référence d'un livre, sa place dans la liste, et la liste d'une sélection", () => {
    expect(referenceDuLivre(livre("Zoom"))).toBe("« Zoom » — Banyai, Istvan (Circonflexe)");
    expect(referenceDuLivre(livre("Le schmat doudou"))).toBe("« Le schmat doudou » — Bloch, Muriel (raconté par) ; ill. Jolivet, Jöelle (Syros)");
    // Un conte sans auteur dans la liste : le titre et ses éditions.
    expect(referenceDuLivre(livre("Hansel et Gretel"))).toMatch(/^« Hansel et Gretel » \(Casterman/);
    expect(difficulteLisible(livre("Zoom"))).toBe("difficulté 2 sur 3");
    expect(difficulteLisible(livre("Le schmat doudou"))).toBe("difficulté 3 à 4 sur 4");
    expect(listeEnTexte([livre("Zoom")])).toBe("« Zoom » — Banyai, Istvan (Circonflexe) — cycle 2, Album tout en images, difficulté 2 sur 3, classique");
    // Six éditions conseillées : l'assistant n'en reçoit que la première, coupée à une virgule.
    expect(premiereEdition(livre("Le vilain petit canard").editeur)).toBe("Bayard jeunesse, collection Les belles histoires…");
    expect(premiereEdition("Syros")).toBe("Syros");
  });

  it("prépare les questions pour l'assistant, sans le laisser inventer", () => {
    const z = livre("Zoom");
    for (const d of ["presenter", "sequence", "questions", "libre"] as const) {
      const q = questionSurLeLivre(z, d);
      expect(q).toContain("« Zoom » — Banyai, Istvan (Circonflexe)");
      expect(q).toContain("liste de référence d'Éduscol (cycle 2, Album tout en images, difficulté 2 sur 3, classique)");
      expect(q).toMatch(/dis-le plutôt que d'inventer|dis-le avant/);
    }
    expect(questionSurLeLivre(z, "libre").endsWith(" ")).toBe(true);
    const filtre = f({ texte: "loup", cycle: 1 });
    const loups = chercherLivres(filtre);
    const q = questionSurLaSelection(loups, filtre);
    expect(q.startsWith(`Voici ${loups.length} livres de la liste de référence d'Éduscol (cycle 1, « loup ») :`)).toBe(true);
    expect(q.split("\n").filter((l) => l.startsWith("- "))).toHaveLength(loups.length);
    expect(q.endsWith("Parmi ces livres, ")).toBe(true);
    expect(descriptionDuFiltre(f({ cycle: 3, famille: "Poésie", difficulte: 2, statut: "PC" }))).toBe("cycle 3, Poésie, difficulté 2, patrimoine et classiques");
  });
});
