import { describe, expect, it } from "vitest";
import {
  AFFICHE, CONSIGNE_IMAGES, CONSIGNE_VISIBILEO, EXEMPLE_VISIBILEO, REGLAGES_VISIBILEO, ajouterPage, bord, cequiManque, courbeVers, demandeDesImages,
  etapesDeLAffiche, htmlAffichage, htmlDeLElement, htmlDesEtapes, htmlMemo, htmlPieces, htmlPreparation, htmlVisibileo, idLibre, idsDesImages,
  lireChoixDesImages, lirePremierJet, motsDeLExemple, numerosDesEtapes, personnageVide, pieceVide, placesDeLAffiche, queuesDeLAffiche, reglagesSurs,
  traitDeFleche, type ImageACherche, type ReglagesVisibileo,
} from "./visibileo";
import { SOURCES_DES_ATELIERS } from "./sourcesDesAteliers";

// Personnages et pièces de l'exemple : ceux d'une fable du domaine public.
const histoire = (): ReglagesVisibileo => reglagesSurs({
  titre: "Le Corbeau et le Renard",
  personnages: [{ ...personnageVide(0), nom: "Le corbeau" }, { ...personnageVide(1), nom: "Le renard", image: { id: 7, mot: "renard" } }],
  // Le corbeau agit dans l'étape ; le renard y pense et y parle.
  pieces: [
    { id: "q1", genre: "cadre", texte: "Le corbeau tient un fromage.", image: { id: 5, mot: "fromage" }, qui: -1, acteurs: [0], etape: "" },
    { id: "q2", genre: "nuage", texte: "Je veux ce fromage.", image: { id: null, mot: "" }, qui: 1, acteurs: [], etape: "q1" },
    { id: "q3", genre: "bulle", texte: "Que vous êtes joli !", image: { id: null, mot: "" }, qui: 1, acteurs: [], etape: "q1" },
  ],
});
const compter = (html: string, classe: string) => html.split(`class="vb-piece ${classe}`).length - 1;

describe("le Visibiléo : les pièces pour construire avec la classe la trace d'un récit (demande de l'enseignant, 2026-11-03)", () => {
  it("fait les pièces à découper : personnages, cadres, nuages et bulles à la couleur de qui pense ou parle, vierges et flèches", () => {
    const r = histoire();
    const html = htmlPieces(r, { 5: "data:fromage", 7: "data:renard" });
    expect(compter(html, "vb-personnage")).toBe(2);
    // Une pièce écrite par genre ; les vierges : 4 cadres, et pour chacun des deux personnages 2 nuages et 1 bulle.
    expect(compter(html, "vb-cadre")).toBe(1 + 4);
    expect(compter(html, "vb-nuage")).toBe(1 + 2 * 2);
    expect(compter(html, "vb-bulle")).toBe(1 + 2 * 1);
    expect(compter(html, "vb-fleche")).toBe(6 + 4);
    expect(html).toContain("« Que vous êtes joli ! »");
    expect(html).toContain('src="data:fromage"');
    // Le nuage du renard est à sa couleur ; les flèches, rouges pour les causes et bleues pour l'ordre.
    expect(html).toContain(`stroke="${r.personnages[1].couleur}"`);
    expect(html).toContain('stroke="#e03131"');
    expect(html).toContain('stroke="#1971c2"');
  });

  it("montre l'image seule sans les mots, pour qui ne lit pas encore — et garde les mots d'une pièce sans image", () => {
    const html = htmlPieces({ ...histoire(), mots: false }, { 5: "data:fromage" });
    expect(html).not.toContain("Le corbeau tient un fromage.");
    expect(html).toContain("Je veux ce fromage.");
  });

  it("écrit le mémo dans les mots de la classe, et la fiche de préparation avec ce que l'enseignant a prévu", () => {
    const r = { ...histoire(), libelles: { ...histoire().libelles, rouge: "à cause de" } };
    const memo = htmlMemo(r, {});
    expect(memo).toContain("à cause de");
    expect(memo).toContain("Le renard");
    const fiche = htmlPreparation(r);
    expect(fiche).toContain("Le corbeau tient un fromage.");
    expect(fiche).toContain("<b>Le renard</b> : Je veux ce fromage.");
    expect(fiche).toContain("de ce qui arrive, remontons à ce qui l'a causé");
    // Seules les feuilles cochées s'impriment.
    const seules = htmlVisibileo({ ...r, feuilles: { pieces: false, memo: true, preparation: false } }, {});
    expect(seules).toContain("vb-memo");
    expect(seules).not.toContain("vb-pieces");
    expect(seules).not.toContain("vb-preparation");
  });

  it("répare des réglages abîmés : couleurs, nombres bornés, pièces d'un genre inconnu ou d'un personnage disparu", () => {
    const r = reglagesSurs({
      personnages: [{ id: "p1", nom: "A", image: { id: null, mot: "" }, couleur: "rouge" }],
      pieces: [{ id: "q1", genre: "carte" as never, texte: "x", image: { id: null, mot: "" }, qui: 0, acteurs: [], etape: "" }, { ...pieceVide("nuage"), texte: "y", qui: 4 }],
      vierges: { cadre: 99, nuage: -3, bulle: 1.6 },
      libelles: { cadre: "  ", nuage: "pense", bulle: "dit", rouge: "", bleue: "puis" },
    });
    expect(r.personnages[0].couleur).toMatch(/^#[0-9a-f]{6}$/i);
    // Une pièce sans identifiant en reçoit un libre.
    expect(r.pieces).toEqual([{ ...pieceVide("nuage", -1, "q1"), texte: "y", qui: -1 }]);
    expect(r.vierges).toEqual({ cadre: 12, nuage: 0, bulle: 2 });
    expect(r.libelles.cadre).toBe(REGLAGES_VISIBILEO.libelles.cadre);
    expect(r.libelles.rouge).toBe("parce que");
    expect(r.libelles.nuage).toBe("pense");
    expect(reglagesSurs({})).toEqual(REGLAGES_VISIBILEO);
    // Les personnages d'une étape existent, une fois chacun ; l'étape d'un nuage est un cadre qui existe ; un cadre n'a pas d'étape, un nuage pas d'acteurs.
    const e = reglagesSurs({
      personnages: [personnageVide(0), personnageVide(1)],
      pieces: [
        { ...pieceVide("cadre", -1, "q1"), texte: "a", acteurs: [1, 1, 7, -1, 0.5, 0], etape: "q2" },
        { ...pieceVide("nuage", 0, "q2"), texte: "b", acteurs: [0], etape: "q1" },
        { ...pieceVide("bulle", 0, "q3"), texte: "c", etape: "q2" },
        { ...pieceVide("bulle", 0, "q4"), texte: "d", etape: "q9" },
        { ...pieceVide("nuage", 0, "q5"), texte: "e", etape: 3 as never },
      ],
    });
    expect(e.pieces.map((p) => [p.acteurs, p.etape])).toEqual([[[1, 0], ""], [[], "q1"], [[], ""], [[], ""], [[], ""]]);
    // Une pièce d'avant, sans acteurs ni étape : ni l'un ni l'autre.
    const ancienne = reglagesSurs({ pieces: [{ id: "q1", genre: "cadre", texte: "a", image: { id: null, mot: "" }, qui: -1 } as never] });
    expect(ancienne.pieces[0]).toEqual({ ...pieceVide("cadre", -1, "q1"), texte: "a" });
  });

  it("dit ce qui manque, charge les images utiles, a son exemple et sa source", () => {
    expect(cequiManque(REGLAGES_VISIBILEO)).toMatch(/titre/);
    expect(cequiManque(histoire())).toBeNull();
    expect(cequiManque({ ...histoire(), feuilles: { pieces: false, memo: false, preparation: false } })).toMatch(/feuille/);
    expect(idsDesImages(histoire())).toEqual([7, 5]);
    expect(motsDeLExemple()).toContain("corbeau");
    expect(EXEMPLE_VISIBILEO.pieces.every((p) => p.qui < EXEMPLE_VISIBILEO.personnages.length)).toBe(true);
    expect(SOURCES_DES_ATELIERS.visibileo).toMatch(/Marie-France Bishop/);
  });

  it("relit le premier jet de l'IA : un genre inconnu, un personnage qui n'existe pas, une pièce vide s'écartent (« elle se construit toute seule avec l'IA »)", () => {
    const reponse = `Voici : ${JSON.stringify({
      titre: "Le Corbeau et le Renard",
      personnages: [{ nom: "Le corbeau", image: "corbeau" }, { nom: "Le renard", image: "renard" }, { nom: "", image: "x" }],
      pieces: [
        { genre: "cadre", texte: "Le corbeau tient un fromage.", qui: 1, image: "fromage" },
        { genre: "nuage", texte: "Je veux ce fromage.", qui: 1, image: "vouloir" },
        { genre: "bulle", texte: "« Que vous êtes joli ! »", qui: 1, image: "parler fort" },
        { genre: "nuage", texte: "Je suis beau.", qui: 9, image: "fier" },
        { genre: "carte", texte: "?", qui: 0, image: "" },
        { genre: "cadre", texte: "   ", qui: -1, image: "rien" },
      ],
    })} — bonne lecture.`;
    expect(lirePremierJet(reponse)).toEqual({
      titre: "Le Corbeau et le Renard",
      causes: [],
      personnages: [{ nom: "Le corbeau", images: ["corbeau"], sens: "" }, { nom: "Le renard", images: ["renard"], sens: "" }],
      pieces: [
        // Un cadre n'est à personne ; les guillemets d'une bulle tombent ; un personnage inconnu, personne. Un seul mot d'image : une liste d'un mot.
        { genre: "cadre", texte: "Le corbeau tient un fromage.", qui: -1, acteurs: [], etape: -1, images: ["fromage"], sens: "" },
        { genre: "nuage", texte: "Je veux ce fromage.", qui: 1, acteurs: [], etape: -1, images: ["vouloir"], sens: "" },
        { genre: "bulle", texte: "Que vous êtes joli !", qui: 1, acteurs: [], etape: -1, images: ["parler fort"], sens: "" },
        { genre: "nuage", texte: "Je suis beau.", qui: -1, acteurs: [], etape: -1, images: ["fier"], sens: "" },
      ],
    });
    expect(lirePremierJet("Je n'ai pas compris.")).toBeNull();
    expect(lirePremierJet("{}")).toBeNull();
    // La consigne dit la méthode et la forme de la réponse.
    expect(CONSIGNE_VISIBILEO).toMatch(/nuages pour ce que pense, croit ou veut/);
    expect(CONSIGNE_VISIBILEO).toMatch(/"pieces"/);
  });

  it("met les pages lues à la suite, une ligne vide entre deux, et garde le texte dans les réglages", () => {
    expect(ajouterPage("", "  Il était une fois.  ")).toBe("Il était une fois.");
    expect(ajouterPage("Il était une fois.", "Un corbeau.\n")).toBe("Il était une fois.\n\nUn corbeau.");
    expect(ajouterPage("Il était une fois.", "   ")).toBe("Il était une fois.");
    expect(reglagesSurs({ texte: "Maître Corbeau" }).texte).toBe("Maître Corbeau");
    expect(reglagesSurs({ texte: 3 as never }).texte).toBe("");
  });

  it("choisit chaque picto dans le sens de l'histoire, parmi ceux du mot — aucun plutôt qu'un faux (« faut faire gaffe aux homonymes »)", () => {
    const images: ImageACherche[] = [
      { n: 0, mots: ["cheval"], sens: "un cheval de l'attelage", candidats: [{ id: 2294, mots: ["cheval"], nature: "nom" }, { id: 4923, mots: ["cheval à bascule"] }] },
      { n: 1, mots: ["tirer"], sens: "des chevaux qui tirent une voiture", candidats: [{ id: 5961, mots: ["donner un coup", "shooter", "tirer"] }, { id: 34123, mots: ["remorquer", "tirer"] }] },
      { n: 2, mots: ["cocher", "conducteur"], sens: "l'homme qui conduit la voiture", candidats: [{ id: 39451, mots: ["cocher"], nature: "verbe" }] },
      { n: 3, mots: ["colline"], sens: "un chemin qui monte", candidats: [] },
    ];
    // Ce qui part : le sens et les mots-clés des pictos, pas les images sans candidats.
    const demande = JSON.parse(demandeDesImages(images));
    expect(demande.map((d: { n: number }) => d.n)).toEqual([0, 1, 2]);
    expect(demande[1].pictogrammes[1]).toEqual({ id: 34123, motsCles: "remorquer, tirer" });
    // La nature part avec le picto : le verbe « cocher » n'est pas le cocher.
    expect(demande[2]).toEqual({ n: 2, mots: ["cocher", "conducteur"], sens: "l'homme qui conduit la voiture", pictogrammes: [{ id: 39451, nature: "verbe", motsCles: "cocher" }] });
    // Le choix relu : un id qu'on n'a pas proposé pour cette image, ou rien, laisse la pièce sans image.
    const choix = lireChoixDesImages(`{"choix": [{"n": 0, "id": 2294}, {"n": 1, "id": 34123}, {"n": 2, "id": null}, {"n": 3, "id": 2294}]}`, images);
    expect([...choix]).toEqual([[0, 2294], [1, 34123], [2, null], [3, null]]);
    expect([...lireChoixDesImages("pas de JSON", images).values()]).toEqual([null, null, null, null]);
    expect(CONSIGNE_IMAGES).toMatch(/homonymes/);
    expect(CONSIGNE_IMAGES).toMatch(/acouphène/);
    expect(lirePremierJet(`{"personnages": [{"nom": "Le cocher", "images": ["Cocher", "conducteur", "homme", "cocher", "voiture"]}], "pieces": []}`)!.personnages[0].images)
      .toEqual(["cocher", "conducteur", "homme"]);
    expect(CONSIGNE_VISIBILEO).toMatch(/pas au pistolet/);
  });

  it("range l'affiche : personnages à gauche, étapes dans l'ordre, au-dessus de chacune ce qu'on y pense et ce qu'on y dit, dessous ce qui n'est d'aucune étape", () => {
    const r = histoire();
    const places = placesDeLAffiche(r);
    expect(Object.keys(places).sort()).toEqual(["p1", "p2", "q1", "q2", "q3"]);
    expect(places.p1.x + places.p1.largeur).toBeLessThan(places.q1.x);
    // Le nuage et la bulle de l'étape sont au-dessus d'elle, côte à côte, de part et d'autre de son milieu.
    for (const id of ["q2", "q3"]) expect(places[id].y + places[id].hauteur).toBeLessThan(places.q1.y);
    expect(places.q2.x + places.q2.largeur).toBeLessThanOrEqual(places.q3.x);
    expect(places.q2.x).toBeLessThan(places.q1.x + places.q1.largeur / 2);
    expect(places.q3.x + places.q3.largeur).toBeGreaterThan(places.q1.x + places.q1.largeur / 2);
    for (const p of Object.values(places)) {
      expect(p.x + p.largeur).toBeLessThanOrEqual(AFFICHE.largeur);
      expect(p.y + p.hauteur).toBeLessThanOrEqual(AFFICHE.hauteur);
    }
    // D'aucune étape : dessous.
    const libres = placesDeLAffiche(reglagesSurs({ ...r, pieces: r.pieces.map((p) => ({ ...p, etape: "" })) }));
    expect(libres.q2.y).toBeGreaterThan(libres.q1.y + libres.q1.hauteur);
    // Huit étapes et douze pensées : deux rangées, et rien ne sort de l'affiche ni ne se chevauche dans une rangée.
    const longue = reglagesSurs({
      personnages: [{ ...personnageVide(0), nom: "A" }, { ...personnageVide(1), nom: "B" }],
      pieces: [
        ...Array.from({ length: 8 }, (_, k) => ({ ...pieceVide("cadre", -1, `q${k + 1}`), texte: `Étape ${k + 1}` })),
        ...Array.from({ length: 12 }, (_, k) => ({ ...pieceVide(k % 3 ? "nuage" : "bulle", k % 2, `q${k + 9}`), texte: `Pensée ${k}`, etape: `q${(k % 8) + 1}` })),
      ],
    });
    const p8 = placesDeLAffiche(longue);
    expect(p8.q5.y).toBeGreaterThan(p8.q1.y + p8.q1.hauteur);
    const posees = Object.entries(p8).filter(([id]) => id.startsWith("q")).map(([, p]) => p);
    for (const p of posees) expect(p.y + p.hauteur).toBeLessThanOrEqual(AFFICHE.hauteur);
    for (const [i, a] of posees.entries()) for (const b of posees.slice(i + 1)) {
      const chevauche = a.x < b.x + b.largeur - 0.01 && b.x < a.x + a.largeur - 0.01 && a.y < b.y + b.hauteur - 0.01 && b.y < a.y + a.hauteur - 0.01;
      expect(chevauche).toBe(false);
    }
    // Une place donnée l'emporte ; elle reste dans l'affiche.
    const posee = reglagesSurs({ ...r, affichage: { places: { q1: { x: 390, y: -4, largeur: 80, hauteur: 40 } }, fleches: [] } });
    expect(placesDeLAffiche(posee).q1).toEqual({ x: 320, y: 0, largeur: 80, hauteur: 40 });
  });

  it("numérote les étapes et y greffe les personnages ; la bulle et le nuage partent de qui parle ou pense (« la bulle doit partir du personnage »)", () => {
    const r = histoire();
    const places = placesDeLAffiche(r);
    // Les cadres écrits, numérotés à la suite ; un cadre vide n'a pas de numéro.
    const avecVide = reglagesSurs({ ...r, pieces: [{ ...pieceVide("cadre", -1, "q9") }, ...r.pieces, { ...pieceVide("cadre", -1, "q8"), texte: "La fin." }] });
    expect([...numerosDesEtapes(avecVide)]).toEqual([["q1", 1], ["q8", 2]]);
    // Sur l'étape : le corbeau, qui y agit, puis le renard, qui y pense et y parle ; une pastille chacun, sur le bord haut du cadre.
    const [etape] = etapesDeLAffiche(r, places);
    expect(etape.numero).toBe(1);
    expect(etape.greffes.map((g) => g.qui)).toEqual([0, 1]);
    for (const g of etape.greffes) {
      expect(g.y).toBeLessThan(places.q1.y);
      expect(g.y + g.hauteur).toBeGreaterThan(places.q1.y);
      expect(g.x).toBeGreaterThan(places.q1.x);
      expect(g.x + g.largeur).toBeLessThanOrEqual(places.q1.x + places.q1.largeur);
    }
    // Le renard a une image : une pastille ronde ; le corbeau n'en a pas : son nom.
    expect(etape.greffes.map((g) => g.image)).toEqual([false, true]);
    const html = htmlDesEtapes(r, places, { 7: "data:renard" });
    expect(html).toContain('class="vb-numero"');
    expect(html).toContain('<img src="data:renard" alt="Le renard">');
    expect(html).toContain('class="vb-greffe vb-nom"');
    expect(html).toContain(">Le corbeau</div>");
    // La queue de la bulle s'arrête juste avant la pastille du renard, sur cette étape ; elle passe sous les pièces, et seul son raccord se dessine par-dessus.
    const { dessous: queues, dessus } = queuesDeLAffiche(r, places);
    expect(dessus).toContain('fill="#fff"');
    expect(dessus).not.toContain("<circle");
    const renard = etape.greffes[1];
    const pointes = [...queues.matchAll(/L([\d.]+) ([\d.]+) L[\d.]+ [\d.]+"/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
    expect(pointes).toHaveLength(1);
    const loin = Math.hypot(pointes[0].x - (renard.x + renard.largeur / 2), pointes[0].y - (renard.y + renard.hauteur / 2));
    expect(loin).toBeGreaterThan(renard.largeur / 2);
    expect(loin).toBeLessThan(renard.largeur / 2 + 1.5);
    // Le nuage : des ronds de plus en plus petits jusqu'au renard.
    const ronds = [...queues.matchAll(/<circle [^>]*r="([\d.]+)"/g)].map((m) => Number(m[1]));
    expect(ronds.length).toBeGreaterThanOrEqual(2);
    expect(ronds[0]).toBeGreaterThan(ronds[ronds.length - 1]);
    // Sur l'affiche, ni la bulle ni le nuage n'ont leur queue toute faite ; sur les pièces à découper, si.
    const bulle = htmlDeLElement(r, { id: "q3", piece: r.pieces[2] }, {});
    expect(bulle).toContain("vb-sans-queue");
    expect(bulle).toContain("V104");
    expect(htmlPieces(r, {})).not.toContain("vb-sans-queue");
    // Sans étape, la queue va à la carte du renard ; à personne, la bulle garde la sienne et rien n'est tracé.
    const sansEtape = reglagesSurs({ ...r, pieces: r.pieces.map((p) => ({ ...p, etape: "" })) });
    expect(queuesDeLAffiche(sansEtape, placesDeLAffiche(sansEtape)).dessous).toContain("<path");
    const aPersonne = reglagesSurs({ ...r, pieces: r.pieces.map((p) => ({ ...p, qui: -1 })) });
    expect(queuesDeLAffiche(aPersonne, placesDeLAffiche(aPersonne))).toEqual({ dessous: "", dessus: "" });
    expect(htmlDeLElement(aPersonne, { id: "q3", piece: aPersonne.pieces[2] }, {})).not.toContain("vb-sans-queue");
    // L'affiche imprimée a tout : les queues sous les pièces, les numéros et les pastilles, les flèches par-dessus.
    const affiche = htmlAffichage(r, { 7: "data:renard" });
    expect(affiche.indexOf("<circle")).toBeLessThan(affiche.indexOf('class="vb-pose"'));
    expect(affiche.indexOf('class="vb-etapes"')).toBeGreaterThan(affiche.lastIndexOf('class="vb-pose"'));
    expect(affiche).toContain("vector-effect");
  });

  it("courbe une flèche par sa poignée et la redresse : la poignée suit le pointeur, au bord des pièces (« des flèches qui peuvent être courbes »)", () => {
    const a = { x: 0, y: 0, largeur: 40, hauteur: 20 }, b = { x: 100, y: 0, largeur: 40, hauteur: 20 };
    // Droite : du bord droit de l'une au bord gauche de l'autre.
    expect(bord(a, { x: 120, y: 10 })).toEqual({ x: 40, y: 10 });
    expect(traitDeFleche(a, b, 0).d).toBe("M40.0 10.0 Q70.0 10.0 100.0 10.0");
    // Le milieu tiré de 15 mm vers le haut : la courbe le suit, et sa poignée y revient.
    const courbe = courbeVers(a, b, { x: 70, y: -5 });
    expect(courbe).toBeLessThan(0);
    expect(traitDeFleche(a, b, courbe).milieu.y).toBeLessThan(10);
    expect(courbeVers(a, b, { x: 70, y: 10.2 })).toBe(0);
  });

  it("garde les flèches et les places de ce qui existe encore, et donne des identifiants libres", () => {
    const r = histoire();
    const brut = { ...r, affichage: { places: { q2: { x: 10, y: 10, largeur: 50, hauteur: 30 }, q9: { x: 0, y: 0, largeur: 50, hauteur: 30 } },
      fleches: [{ de: "q1", vers: "q2", couleur: "rouge" as const, courbe: 4 }, { de: "q1", vers: "q9", couleur: "bleue" as const, courbe: 0 }, { de: "q3", vers: "q3", couleur: "rouge" as const, courbe: 0 }] } };
    const s = reglagesSurs(brut);
    expect(Object.keys(s.affichage.places)).toEqual(["q2"]);
    expect(s.affichage.fleches).toEqual([{ de: "q1", vers: "q2", couleur: "rouge", courbe: 1.5 }]);
    expect(idLibre(s, "q")).toBe("q4");
    expect(idLibre(s, "p")).toBe("p3");
    // Deux pièces au même identifiant : la seconde en reçoit un autre.
    const doublon = reglagesSurs({ pieces: [{ ...pieceVide("cadre", -1, "q1"), texte: "a" }, { ...pieceVide("cadre", -1, "q1"), texte: "b" }] });
    expect(doublon.pieces.map((p) => p.id)).toEqual(["q1", "q2"]);
    // L'affiche imprimée : les pièces à leur place, les flèches avec leur pointe.
    const html = htmlAffichage(s, {});
    expect(html).toContain('class="vb-pose"');
    expect(html).toContain('marker-end="url(#vb-pointe-rouge)"');
    expect(html.split("marker-end=").length - 1).toBe(1);
  });

  it("lit les causes du premier jet : les flèches rouges, de ce qui arrive vers ce qui l'explique", () => {
    const jet = lirePremierJet(JSON.stringify({
      personnages: [{ nom: "Le corbeau", images: ["corbeau"] }],
      pieces: [{ genre: "cadre", texte: "Le fromage tombe." }, { genre: "cadre", texte: "Il ouvre son bec." }, { genre: "nuage", texte: "Je veux chanter.", qui: 0 }],
      causes: [{ de: 0, vers: 1 }, { de: 1, vers: 2 }, { de: 2, vers: 2 }, { de: 5, vers: 1 }, { de: "1", vers: 0 }],
    }))!;
    expect(jet.causes).toEqual([{ de: 0, vers: 1 }, { de: 1, vers: 2 }]);
    expect(CONSIGNE_VISIBILEO).toMatch(/"causes"/);
    // Une pièce ou un personnage écartés au milieu ne décalent rien : les rangs suivent ce qu'on garde.
    const decale = lirePremierJet(JSON.stringify({
      personnages: [{ nom: "Le corbeau" }, { nom: "" }, { nom: "Le renard" }],
      pieces: [
        { genre: "cadre", texte: "Le corbeau tient un fromage.", acteurs: [0, 2, 1, 9] },
        { genre: "carte", texte: "?" },
        { genre: "cadre", texte: "Le renard parle.", acteurs: [2] },
        { genre: "nuage", texte: "Je veux ce fromage.", qui: 2, etape: 0 },
        { genre: "bulle", texte: "Que vous êtes joli !", qui: 2, etape: 2 },
        { genre: "nuage", texte: "Je chante.", qui: 0, etape: 3 },
      ],
      causes: [{ de: 2, vers: 3 }, { de: 5, vers: 1 }],
    }))!;
    expect(decale.personnages.map((p) => p.nom)).toEqual(["Le corbeau", "Le renard"]);
    expect(decale.pieces.map((p) => [p.texte, p.qui, p.acteurs, p.etape])).toEqual([
      ["Le corbeau tient un fromage.", -1, [0, 1], -1],
      ["Le renard parle.", -1, [1], -1],
      ["Je veux ce fromage.", 1, [], 0],
      ["Que vous êtes joli !", 1, [], 1],
      // Son étape est un nuage : aucune.
      ["Je chante.", 0, [], -1],
    ]);
    expect(decale.causes).toEqual([{ de: 1, vers: 2 }]);
    expect(CONSIGNE_VISIBILEO).toMatch(/"acteurs"/);
    expect(CONSIGNE_VISIBILEO).toMatch(/"etape"/);
    // L'exemple : chaque pensée et la parole à une étape, chaque étape avec ses personnages ; plus de flèches bleues, les numéros disent l'ordre.
    for (const p of EXEMPLE_VISIBILEO.pieces) {
      if (p.genre === "cadre") expect(p.acteurs.length).toBeGreaterThan(0);
      else expect(EXEMPLE_VISIBILEO.pieces[p.etape]?.genre).toBe("cadre");
    }
    expect(EXEMPLE_VISIBILEO.fleches.every((f) => f.couleur === "rouge")).toBe(true);
    expect(EXEMPLE_VISIBILEO.fleches.every((f) => f.de < EXEMPLE_VISIBILEO.pieces.length && f.vers < EXEMPLE_VISIBILEO.pieces.length)).toBe(true);
  });
});
