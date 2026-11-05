import { describe, expect, it } from "vitest";
import {
  BUDGET_MEMOIRE, LONGUEUR_MAX_SOUVENIR, MEMOIRE_MAX, PREFIXE_MEMOIRE, appliquerOperations, blocDeMemoire, demandeDeMemoire, direLesChangements,
  ecrireSouvenir, lireMemoire, lireOperations, lireSouvenir, meriteDEtreRelu, souvenirsPourLaQuestion, type Souvenir,
} from "./memoireAssistant";

const souvenir = (id: string, texte: string, modifieLe = "2026-11-01T10:00:00.000Z", autre: Partial<Souvenir> = {}): Souvenir =>
  ({ id, texte, citation: texte, creeLe: modifieLe, modifieLe, ...autre });
const reponse = (operations: unknown[]) => JSON.stringify({ operations });

describe("la mémoire de l'Assistant (demande de l'enseignant, 5 novembre 2026)", () => {
  it("garde un souvenir par réglage, le relit tel quel, du plus récent au plus ancien, sans les vides ni les illisibles", () => {
    const s = souvenir("a", "Enseigne en IME.", "2026-11-02T08:00:00.000Z", { historique: [{ texte: "Enseigne en ULIS.", jusquau: "2026-11-02T08:00:00.000Z" }] });
    expect(lireSouvenir("a", ecrireSouvenir(s))).toEqual(s);
    expect(JSON.parse(ecrireSouvenir(s)).id).toBeUndefined();
    const memoire = lireMemoire({
      [`${PREFIXE_MEMOIRE}a`]: ecrireSouvenir(s),
      [`${PREFIXE_MEMOIRE}b`]: ecrireSouvenir(souvenir("b", "Préfère des séances courtes.", "2026-11-04T08:00:00.000Z")),
      [`${PREFIXE_MEMOIRE}c`]: "",
      [`${PREFIXE_MEMOIRE}d`]: "{pas du json",
      "autreReglage": ecrireSouvenir(souvenir("x", "Rien à voir.")),
    });
    expect(memoire.map((m) => m.id)).toEqual(["b", "a"]);
  });

  it("ne relit que les messages où l'enseignant parle de lui, de sa classe, ou demande de retenir ou d'oublier", () => {
    expect(meriteDEtreRelu("Je travaille en IME avec des élèves de 6 à 12 ans.")).toBe(true);
    expect(meriteDEtreRelu("J'utilise la méthode des Alphas en lecture.")).toBe(true);
    expect(meriteDEtreRelu("Retiens que les séances durent trente minutes.")).toBe(true);
    expect(meriteDEtreRelu("Oublie ce que je t'ai dit sur le CP.")).toBe(true);
    expect(meriteDEtreRelu("Propose trois ateliers de lecture pour des CP.")).toBe(false);
    expect(meriteDEtreRelu("Merci !")).toBe(false);
  });

  it("demande au modèle de comparer avec les souvenirs numérotés, sans jamais garder un élève, la santé ou la famille", () => {
    const [systeme, utilisateur] = demandeDeMemoire("Je suis en MS-GS.", ["Enseigne en maternelle.", "Préfère des fiches courtes."]);
    expect(systeme.role).toBe("system");
    expect(systeme.content).toMatch(/\[P1\]/);
    expect(systeme.content).toMatch(/la santé, la famille/);
    expect(systeme.content).toMatch(/"op":"ajouter"/);
    expect(utilisateur.content).toContain("1. Enseigne en maternelle.\n2. Préfère des fiches courtes.");
    expect(utilisateur.content).toContain("« Je suis en MS-GS. »");
    expect(demandeDeMemoire("Je suis en CP.", [])[1].content).toContain("(aucun)");
  });

  it("ne garde une proposition que si les mots de l'enseignant la justifient, retrouvés dans son message", () => {
    const message = "Cette année, j'ai une classe de MS-GS à double niveau, et je préfère des séances de trente minutes.";
    const ops = lireOperations(reponse([
      { op: "ajouter", texte: "A une classe de MS-GS à double niveau.", citation: "une classe de MS-GS à double niveau" },
      // À la casse, aux accents et aux espaces près.
      { op: "ajouter", texte: "Préfère des séances de trente minutes.", citation: "JE  PREFERE des seances de trente minutes" },
      // Une citation que le message ne contient pas : inventée.
      { op: "ajouter", texte: "Utilise la méthode Picot.", citation: "j'utilise la méthode Picot" },
      { op: "ajouter", texte: "Sans citation." },
    ]), message, []);
    expect(ops.map((o) => o.op === "ajouter" && o.texte)).toEqual(["A une classe de MS-GS à double niveau.", "Préfère des séances de trente minutes."]);
    expect(lireOperations("pas de json", message, [])).toEqual([]);
    expect(lireOperations('{"rien":1}', message, [])).toEqual([]);
  });

  it("écarte tout souvenir qui désigne un élève, sa santé, ses coordonnées ou une date ; garde un lieu", () => {
    const message = "[P1] a un [Santé 1 : un syndrome rare], on l'appelle au [Numéro 1], et j'enseigne à [Lieu 1] depuis le [Date 1].";
    const ops = lireOperations(reponse([
      { op: "ajouter", texte: "[P1] a un [Santé 1 : un syndrome rare].", citation: "[P1] a un [Santé 1 : un syndrome rare]" },
      { op: "ajouter", texte: "Joignable au [Numéro 1].", citation: "on l'appelle au [Numéro 1]" },
      { op: "ajouter", texte: "Enseigne depuis le [Date 1].", citation: "depuis le [Date 1]" },
      { op: "ajouter", texte: "Enseigne à [Lieu 1].", citation: "j'enseigne à [Lieu 1]" },
    ]), message, []);
    expect(ops).toEqual([{ op: "ajouter", texte: "Enseigne à [Lieu 1].", citation: "j'enseigne à [Lieu 1]" }]);
  });

  it("met à jour ou oublie un souvenir qui existe, une seule fois, et n'ajoute pas ce qui est déjà retenu", () => {
    const message = "Finalement je suis passé en GS seule, et oublie ce que je t'ai dit sur les ceintures de couleur.";
    const deja = ["Enseigne en MS-GS.", "Utilise des ceintures de couleur en calcul.", "Préfère des fiches courtes."];
    const ops = lireOperations(reponse([
      { op: "modifier", numero: 1, texte: "Enseigne en GS seule.", citation: "je suis passé en GS seule" },
      { op: "supprimer", numero: 1, citation: "je suis passé en GS seule" },
      { op: "supprimer", numero: 2, citation: "oublie ce que je t'ai dit sur les ceintures de couleur" },
      { op: "supprimer", numero: 9, citation: "oublie ce que je t'ai dit" },
      { op: "ajouter", texte: "préfère des fiches  courtes.", citation: "je suis passé en GS seule" },
      { op: "modifier", numero: 3, texte: "x".repeat(LONGUEUR_MAX_SOUVENIR + 1), citation: "je suis passé en GS seule" },
    ]), message, deja);
    expect(ops).toEqual([
      { op: "modifier", numero: 1, texte: "Enseigne en GS seule.", citation: "je suis passé en GS seule" },
      { op: "supprimer", numero: 2, citation: "oublie ce que je t'ai dit sur les ceintures de couleur" },
    ]);
    // Cinq opérations au plus : la sixième n'est pas lue.
    const beaucoup = Array.from({ length: 7 }, (_, i) => ({ op: "ajouter", texte: `Fait la chose ${i}.`, citation: "je suis passé en GS seule" }));
    expect(lireOperations(reponse(beaucoup), message, [])).toHaveLength(5);
  });

  it("applique les opérations : un ajout prend un nouvel identifiant, une mise à jour garde ses textes d'avant, un oubli se défait", () => {
    const avant = [souvenir("a", "Enseigne en MS-GS."), souvenir("b", "Utilise des ceintures de couleur.")];
    let n = 0;
    const changements = appliquerOperations(avant, [
      { op: "modifier", numero: 1, texte: "Enseigne en GS seule.", citation: "je suis passé en GS seule" },
      { op: "supprimer", numero: 2, citation: "oublie les ceintures" },
      { op: "ajouter", texte: "Prépare un projet sur les saisons.", citation: "un projet sur les saisons" },
      // Le même texte : rien ne change.
      { op: "modifier", numero: 1, texte: "Enseigne en MS-GS.", citation: "MS-GS" },
    ], "2026-11-05T10:00:00.000Z", () => `n${++n}`);
    expect(changements.map((c) => c.sorte)).toEqual(["modifie", "oublie", "ajoute"]);
    const modifie = changements[0];
    expect(modifie.sorte === "modifie" && modifie.apres).toMatchObject({
      id: "a", texte: "Enseigne en GS seule.", modifieLe: "2026-11-05T10:00:00.000Z",
      historique: [{ texte: "Enseigne en MS-GS.", jusquau: "2026-11-05T10:00:00.000Z" }],
    });
    expect(changements[2].sorte === "ajoute" && changements[2].apres).toMatchObject({ id: "n1", citation: "un projet sur les saisons" });
    expect(direLesChangements(changements))
      .toBe("Mis à jour : « Enseigne en GS seule. » · Oublié : « Utilise des ceintures de couleur. » · Retenu : « Prépare un projet sur les saisons. »");
    // L'historique ne garde que les cinq derniers textes.
    const long = souvenir("c", "Version 6.", undefined, { historique: Array.from({ length: 5 }, (_, i) => ({ texte: `Version ${i + 1}.`, jusquau: "x" })) });
    const [maj] = appliquerOperations([long], [{ op: "modifier", numero: 1, texte: "Version 7.", citation: "x" }], "t");
    expect(maj.sorte === "modifie" && maj.apres.historique?.map((h) => h.texte)).toEqual(["Version 2.", "Version 3.", "Version 4.", "Version 5.", "Version 6."]);
    // Une mémoire pleine n'ajoute plus.
    const pleine = Array.from({ length: MEMOIRE_MAX }, (_, i) => souvenir(`p${i}`, `Souvenir ${i}.`));
    expect(appliquerOperations(pleine, [{ op: "ajouter", texte: "Un de trop.", citation: "x" }], "t")).toEqual([]);
  });

  it("envoie tous les souvenirs s'ils tiennent dans le budget ; sinon ceux qui parlent de la question d'abord, puis les plus récents", () => {
    const peu = [souvenir("a", "Enseigne en IME."), souvenir("b", "Préfère des séances courtes.")];
    expect(souvenirsPourLaQuestion(peu, "une séquence sur les fractions")).toEqual(peu);
    expect(blocDeMemoire(peu)).toBe("- Enseigne en IME.\n- Préfère des séances courtes.");
    const remplissage = Array.from({ length: 30 }, (_, i) => souvenir(`r${i}`, `Habitude numéro ${i} : ${"détail ".repeat(10)}`));
    const fractions = souvenir("f", "Utilise des bandes de papier pour les fractions.");
    const choisis = souvenirsPourLaQuestion([...remplissage, fractions], "Une séance sur les fractions en CM1");
    expect(choisis[0].id).toBe("f");
    expect(choisis.reduce((n, s) => n + s.texte.length + 3, 0)).toBeLessThanOrEqual(BUDGET_MEMOIRE);
    expect(choisis[1].id).toBe("r0");
  });
});
