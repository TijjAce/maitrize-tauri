import { describe, expect, it } from "vitest";
import {
  BLOCS_PERSO, blocVide, ceQuiManque, generateurSur, htmlGenerateurPerso, imagesDeLaRecette, lireGenerateurs, lireRecette, motsSansImage, placeDansLaPlanche,
  poserLesPictos, retoucheALIA, type GenerateurPerso,
} from "./generateursPerso";

/** Une recette comme l'IA en répond : des mots seuls, sans picto. */
const RECETTE = {
  nom: "Les animaux et leurs petits", icone: "🐣", quoi: "Relier, trier, compter les animaux de la ferme.", classe: "CP", moment: "entrainement",
  blocs: [
    { sorte: "relier", consigne: "Je relie chaque animal à son petit.", paires: [["chat", "chaton"], ["vache", "veau"], ["poule", "poussin"], ["chien", "chiot"], ["cheval", "poulain"]], combien: 4, affichage: "les-deux" },
    { sorte: "trier", consigne: "Je colle chaque animal dans sa colonne.", categories: [{ nom: "Ils volent", elements: ["oiseau", "papillon", "abeille"] }, { nom: "Ils nagent", elements: ["poisson", "dauphin", "baleine"] }], combien: 6 },
    { sorte: "compter", elements: ["pomme", "ballon"], min: 2, max: 9, combien: 6 },
    { sorte: "entourer", consigne: "J'entoure les animaux.", cibles: ["chat", "chien", "lapin"], autres: ["pomme", "table", "vélo"], combien: 12 },
    { sorte: "questions", questions: [{ question: "Qui donne du lait ?", reponse: "la vache", choix: ["la vache", "le chat"] }, { question: "Où vit le poisson ?", reponse: "dans l'eau", choix: [] }], combien: 2 },
    { sorte: "completer", phrases: ["Le [chat] dort.", "La [vache] broute.", "Le [chien] aboie."], combien: 3, banque: true },
  ],
};

const corrige = (html: string) => html.split('class="page corrige"')[1] ?? "";
const eleve = (html: string) => html.split('class="page corrige"')[0];

describe("les générateurs que l'enseignant fait faire à l'IA", () => {
  it("relisent la recette de l'IA, et laissent de côté ce qui ne fait pas un exercice", () => {
    const g = generateurSur({ ...RECETTE, blocs: [...RECETTE.blocs.slice(0, 4), { sorte: "inconnu" }, { sorte: "relier", paires: [["chat", "chaton"]] }] });
    expect(g.blocs.map((b) => b.sorte)).toEqual(["relier", "trier", "compter", "entourer", "relier"]);
    // Un exercice incomplet se garde — l'enseignant l'écrit encore —, mais ne va pas sur la feuille.
    expect(ceQuiManque(g.blocs[4])).toBe("il faut au moins deux paires complètes.");
    expect(g.blocs.slice(0, 4).map(ceQuiManque)).toEqual([null, null, null, null]);
    expect((htmlGenerateurPerso({ ...g, blocs: [g.blocs[4]] }, 1))).toContain("pas encore d'exercice complet");
    expect(lireRecette(JSON.stringify({ ...RECETTE, blocs: [g.blocs[4], RECETTE.blocs[2]] }))!.blocs.map((b) => b.sorte)).toEqual(["compter"]);
    // Une paire dont on a vidé un côté reste, pour qu'on le remplisse.
    const relier = generateurSur({ blocs: [{ sorte: "relier", paires: [["chat", { id: null, mot: "" }], ["chien", "chiot"], ["vache", "veau"]] }] }).blocs[0];
    expect(relier.sorte === "relier" && relier.paires.length).toBe(3);
    expect(ceQuiManque(relier)).toBeNull();
    expect(htmlGenerateurPerso({ ...g, blocs: [relier] }, 1)).not.toContain(">chat<");
    expect(g.icone).toBe("🐣");
    expect(generateurSur({ icone: "pas un emoji", moment: "jamais", classe: "6e" })).toMatchObject({ icone: "✨", moment: "entrainement", classe: "", nom: "Mon générateur", blocs: [] });
    // Une consigne absente prend celle du bloc ; une question à un seul choix devient ouverte.
    const compter = g.blocs.find((b) => b.sorte === "compter")!;
    expect(compter.consigne).toBe(BLOCS_PERSO.find((b) => b.sorte === "compter")!.consigne);
    const q = generateurSur({ blocs: [{ sorte: "questions", questions: [{ question: "Q ?", reponse: "oui", choix: ["oui"] }] }] }).blocs[0];
    expect(q.sorte === "questions" && q.questions[0].choix).toEqual([]);
    // Chaque sorte a un bloc de départ, complet, qui se relit tel quel.
    for (const b of BLOCS_PERSO) {
      expect(generateurSur({ blocs: [blocVide(b.sorte)] }).blocs[0], b.sorte).toEqual(blocVide(b.sorte));
      expect(ceQuiManque(blocVide(b.sorte)), b.sorte).toBeNull();
    }
  });

  it("trouvent la recette dans la réponse, même entourée de texte ; rien sans exercice lisible", () => {
    const g = lireRecette(`Voici la recette :\n${JSON.stringify(RECETTE)}\nBonne classe !`)!;
    expect(g.nom).toBe("Les animaux et leurs petits");
    expect(lireRecette("Je ne peux pas.")).toBeNull();
    expect(lireRecette('{"nom": "x", "blocs": []}')).toBeNull();
    expect(lireRecette("{ pas du json }")).toBeNull();
    expect(lireGenerateurs("pas du json")).toEqual([]);
    expect(lireGenerateurs(JSON.stringify([{ ...RECETTE, id: "g1" }, { ...RECETTE }])).map((x) => x.id)).toEqual(["g1"]);
  });

  it("posent le picto de chaque mot, gardent les images choisies, et disent les mots restés sans image", () => {
    const g = generateurSur(RECETTE);
    expect(motsSansImage(g)).toContain("chaton");
    const avecPictos = poserLesPictos(g, [{ id: 101, mot: "chat" }, { id: 102, mot: "chaton" }]);
    const relier = avecPictos.blocs[0];
    expect(relier.sorte === "relier" && relier.paires[0]).toEqual([{ id: 101, mot: "chat" }, { id: 102, mot: "chaton" }]);
    expect(motsSansImage(avecPictos)).not.toContain("chaton");
    // Une retouche garde la photo que l'enseignant avait mise sur « chat ».
    const avecPhoto = poserLesPictos(g, [], { ...g, blocs: [{ sorte: "etiquettes", consigne: "", elements: [{ id: null, mot: "chat", photo: "chat-de-la-classe.jpg" }], combien: 1, affichage: "picto" }] });
    const r = avecPhoto.blocs[0];
    expect(r.sorte === "relier" && r.paires[0][0]).toEqual({ id: null, mot: "chat", photo: "chat-de-la-classe.jpg" });
    expect(imagesDeLaRecette(avecPhoto)).toContain("photo:chat-de-la-classe.jpg");
    // La retouche envoie les mots, pas les numéros des pictos.
    const message = retoucheALIA(avecPictos, "Ajoute des animaux de la mer.");
    expect(message).toContain("Ajoute des animaux de la mer.");
    expect(message).toContain('["chat","chaton"]');
    expect(message).not.toContain("101");
  });

  it("fabriquent une feuille et son corrigé, tirés au sort, justes", () => {
    const g: GenerateurPerso = { ...generateurSur(RECETTE), id: "g1" };
    for (const graine of [1, 2, 3, 4, 5]) {
      const html = htmlGenerateurPerso(g, graine);
      expect(html).not.toMatch(/NaN|undefined|Infinity|\[object/);
      expect(html).toContain('<div class="titre">Les animaux et leurs petits</div>');
      expect(htmlGenerateurPerso(g, graine)).toBe(html);
      const c = corrige(html);
      // Relier : chaque ligne du corrigé est une paire de la recette.
      const relier = c.split('class="gp-relier"')[1].split("</div></div></div>")[0];
      const rangs = [...relier.matchAll(/gp-relier-g"><span class="gp-el"><span class="gp-mot">([^<]+)<[\s\S]*?gp-relier-d"><span class="gp-point"><\/span><span class="gp-el"><span class="gp-mot">([^<]+)</g)];
      expect(rangs.length).toBe(4);
      for (const [, a, b] of rangs) expect(RECETTE.blocs[0].paires as string[][]).toContainEqual([a, b]);
      // Compter : autant de ronds que le nombre écrit.
      for (const m of c.matchAll(/<div class="gp-boite">([\s\S]*?)<\/div><div class="gp-ligne">Il y en a <b class="gp-rep">(\d+)<\/b>/g)) {
        expect((m[1].match(/gp-rond/g) ?? []).length).toBe(Number(m[2]));
      }
      // Entourer : seuls les animaux sont entourés.
      for (const m of c.matchAll(/<div class="gp-case( gp-entoure)?"><span class="gp-el"><span class="gp-mot">([^<]+)</g)) {
        expect(Boolean(m[1]), m[2]).toBe(["chat", "chien", "lapin"].includes(m[2]));
      }
      // Questions : la case cochée est la bonne réponse.
      for (const m of c.matchAll(/gp-case-a-cocher gp-coche"><\/span>([^<]+)</g)) expect(m[1]).toBe("la vache");
      // Compléter : la banque de mots n'est que sur la feuille de l'élève, avec les mots qui manquent.
      expect(eleve(html)).toMatch(/gp-banque/);
      expect(c).not.toMatch(/gp-banque/);
      expect((c.match(/<b class="gp-rep">(chat|vache|chien)<\/b>/g) ?? []).length).toBeGreaterThanOrEqual(3);
      // Trier : au corrigé, chaque colonne ne garde que les siens.
      const [, vole, nage] = c.split('<td style="height:');
      for (const mot of ["poisson", "dauphin", "baleine"]) expect(vole.split("</td>")[0]).not.toContain(`>${mot}<`);
      for (const mot of ["oiseau", "papillon", "abeille"]) expect(nage.split("</td>")[0]).not.toContain(`>${mot}<`);
    }
    expect(htmlGenerateurPerso(g, 1)).not.toBe(htmlGenerateurPerso(g, 2));
  });

  it("n'ont pas de corrigé quand rien ne se corrige, et écrivent les mots tels quels", () => {
    const etiquettes = generateurSur({ nom: "<b>Mes</b> étiquettes", blocs: [{ sorte: "etiquettes", elements: ["chat", "<script>x</script>"], combien: 4 }] });
    const html = htmlGenerateurPerso(etiquettes, 3);
    expect(html).not.toContain('class="page corrige"');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;b&gt;Mes&lt;/b&gt; étiquettes");
    // Un seul bloc : sa consigne est celle de la feuille, sans numéro.
    expect(html).toContain('<div class="regle">Je découpe les étiquettes.</div>');
    expect(html).not.toContain("gp-consigne");
  });

  it("gardent les images de la planche dans leur cadre, légende comprise", () => {
    const b = { hauteur: 100, legendes: true };
    expect(placeDansLaPlanche({ element: { id: null, mot: "x" }, x: 0, y: 0, taille: 30 }, b)).toEqual([9.7, 16]);
    expect(placeDansLaPlanche({ element: { id: null, mot: "x" }, x: 100, y: 100, taille: 30 }, b)).toEqual([90.3, 77]);
    expect(placeDansLaPlanche({ element: { id: null, mot: "x" }, x: 50, y: 50, taille: 30 }, b)).toEqual([50, 50]);
    // Une petite image : c'est la ligne de sa légende, plus large qu'elle, qui reste dans le cadre.
    expect(placeDansLaPlanche({ element: { id: null, mot: "x" }, x: 0, y: 50, taille: 15 }, b)[0]).toBe(7.3);
    expect(placeDansLaPlanche({ element: { id: null, mot: "x" }, x: 0, y: 50, taille: 15 }, { hauteur: 100, legendes: false })[0]).toBe(5.2);
    const planche = generateurSur({ blocs: [blocVide("planche")] });
    expect(corrige(htmlGenerateurPerso(planche, 1))).toContain('<b class="gp-rep">chat</b>');
  });
});
