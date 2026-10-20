import { describe, it, expect } from "vitest";
import { ficheEcrite, lireFiches, type MonPicto } from "./mesPictos";
import { estUnSupport, supportsDeLaSequence, TOUS_LES_NIVEAUX } from "./supportsDeTravail";
import { lireFabrication, seRefaitDansFabriquer } from "./modifierFeuille";
import { NIVEAUX_FICHES, iconeDeLaRecette, pageDuSupport, recetteDe, recettesDesSupports, recettesPour } from "./fichesAutonomie";

// Le numéro d'une photo : dans la plage des photos de Mes pictos (voir mesPictos).
const PHOTO = -2_100_000_100;
const photo = (p: Partial<MonPicto>): MonPicto => ({ id: PHOTO, mot: "Le jeu des boîtes", fichier: "boites.jpg", origine: "photo", date: "2026-10-14", ...p });

describe("une photo, support de travail", () => {
  it("le devient avec son niveau — la matière est facultative —, et garde dans sa fiche son jeu et sa séquence", () => {
    const p = photo({ matiere: "Mathématiques", niveau: "CP", jeuId: "j1", sequenceId: "q1" });
    expect(estUnSupport(p)).toBe(true);
    expect(estUnSupport(photo({ niveau: "CP" }))).toBe(true);
    expect(estUnSupport(photo({ niveau: TOUS_LES_NIVEAUX }))).toBe(true);
    expect(estUnSupport(photo({ matiere: "Mathématiques" }))).toBe(false);
    expect(estUnSupport(photo({}))).toBe(false);
    // Sa fiche de Mes pictos se relit telle quelle ; une fiche d'avant, sans ces champs, aussi.
    const relue = lireFiches({ [`pictos:${PHOTO}`]: ficheEcrite(p) });
    expect(relue[0]).toMatchObject({ matiere: "Mathématiques", niveau: "CP", jeuId: "j1", sequenceId: "q1" });
    expect(lireFiches({ [`pictos:${PHOTO}`]: JSON.stringify({ mot: "Les boîtes", fichier: "b.jpg", date: "" }) })[0].matiere).toBeUndefined();
  });

  it("va aux élèves de son niveau — tous pour « tous les niveaux » — et à sa séquence", () => {
    const cp = photo({ id: PHOTO, matiere: "Français", niveau: "CP", sequenceId: "q1" });
    const tous = photo({ id: PHOTO - 1, mot: "Les cubes", matiere: "Mathématiques", niveau: TOUS_LES_NIVEAUX });
    const simple = photo({ id: PHOTO - 2, mot: "Les ciseaux" });
    expect(supportsDeLaSequence([cp, tous, simple], "q1").map((p) => p.mot)).toEqual(["Le jeu des boîtes"]);
  });
});

describe("un support de travail dans « En retard »", () => {
  const image = async () => "data:image/jpeg;base64,AAAA";
  const supports = recettesDesSupports([
    { photo: photo({ matiere: "Mathématiques", niveau: "CP" }), jeu: "Le jeu des boîtes", regles: "Je lance le dé.\nJe mets autant de jetons dans la boîte." },
    { photo: photo({ id: PHOTO - 1, mot: "Les cubes", matiere: "Mathématiques", niveau: TOUS_LES_NIVEAUX }), jeu: "", regles: "" },
    { photo: photo({ id: PHOTO - 2, mot: "Le geo shorter", niveau: "CM2" }), jeu: "", regles: "" },
  ], image);

  it("se tire comme une fiche, pour son niveau seulement — celui du CM2 avec les fiches du CE2, comme ses élèves", () => {
    expect(supports.map((r) => [r.nom, r.niveaux])).toEqual([["Le jeu des boîtes", ["CP"]], ["Les cubes", NIVEAUX_FICHES], ["Le geo shorter", ["CE2"]]]);
    expect(supports.every((r) => r.domaine === "atelier")).toBe(true);
    // Sans matière : rien à écrire au-dessus de la photo, sur les tablettes.
    expect(supports[2].support).toEqual({ photo: PHOTO - 2, matiere: "" });
    const cp = recettesPour("CP", 1, false, [], supports).map((r) => r.id);
    const ce1 = recettesPour("CE1", 1, false, [], supports).map((r) => r.id);
    expect(cp).toContain(`support:${PHOTO}`);
    expect(ce1).not.toContain(`support:${PHOTO}`);
    expect(ce1).toContain(`support:${PHOTO - 1}`);
    // Un élève non verbal le reçoit aussi : il n'y a rien à lire pour s'y mettre.
    expect(recettesPour("CP", 1, true, [], supports).map((r) => r.id)).toContain(`support:${PHOTO}`);
    expect(recetteDe(`support:${PHOTO}`, supports)?.support).toEqual({ photo: PHOTO, matiere: "Mathématiques" });
    expect(iconeDeLaRecette(supports[0])).toBe("📷");
  });

  it("montre la photo, que la tablette reçoit, et les règles de son jeu", async () => {
    const { html } = await supports[0].fabriquer({ niveau: "CP", periode: 1, prenom: "JULES" }, 1, { image: async () => null, pictos: async () => ({}) });
    expect(html).toContain('<div class="titre">Le jeu des boîtes</div>');
    expect(html).toContain('<div class="consigne sp-support"><div class="sp-photo"><img src="data:image/jpeg;base64,AAAA"');
    expect(html).toContain('<div class="regle"><b>Les règles du jeu « Le jeu des boîtes »</b>Je lance le dé.<br>Je mets autant de jetons dans la boîte.</div>');
    // Sans jeu : la photo seule.
    expect(pageDuSupport("Les cubes", "data:x", "", "")).not.toContain("regle");
  });

  it("se refait sans atelier : sa fabrication se relit, avec sa photo, et « Modifier dans Fabriquer » ne s'offre pas", () => {
    const f = lireFabrication(JSON.stringify({ atelier: "support", eleve: { prenom: "JULES", date: "mardi" }, minuteur: 15, support: { photo: PHOTO, matiere: "Mathématiques" } }));
    expect(f).toMatchObject({ atelier: "support", minuteur: 15, support: { photo: PHOTO, matiere: "Mathématiques" } });
    expect(seRefaitDansFabriquer(f)).toBe(false);
    expect(seRefaitDansFabriquer(lireFabrication(JSON.stringify({ atelier: "pyramides" })))).toBe(true);
  });
});
