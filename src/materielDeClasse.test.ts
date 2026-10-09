import { describe, it, expect } from "vitest";
import {
  MATERIEL_REEL, ecrireInventaire, lireInventaire, materielDeLAtelier, materielPourCompetences, noteDuMaterielReel,
} from "./materielDeClasse";
import { ONGLETS } from "./catalogueAteliers";

const ids = (texte: string, domaine: string) => materielPourCompetences([{ texte, domaine }]).map((m) => m.id);
const MATHS = "Mathématiques › Grandeurs et mesures";
const SCIENCES = "Sciences et technologie › La matière, les mesures, l’électricité";

describe("le matériel de la classe", () => {
  it("vient des textes officiels, avec ce qu'on en fait", () => {
    for (const m of MATERIEL_REEL) {
      expect(m.source, m.id).toMatch(/BO n°|Programme de l'école maternelle|Éduscol/);
      expect(m.usage.length, m.id).toBeGreaterThan(20);
      expect(m.nom.length, m.id).toBeGreaterThan(5);
    }
    expect(new Set(MATERIEL_REEL.map((m) => m.id)).size).toBe(MATERIEL_REEL.length);
  });

  it("ne renvoie qu'à des ateliers qui existent", () => {
    const connus = new Set<string>(ONGLETS as readonly string[]);
    for (const m of MATERIEL_REEL) {
      for (const a of [...m.ateliers, ...(m.imprime ? [m.imprime.atelier] : [])]) expect(connus.has(a), `${m.id} → ${a}`).toBe(true);
    }
  });

  it("répond aux compétences qui le nomment, dans leur domaine", () => {
    expect(ids("Savoir identifier l’objet le plus léger (ou le plus lourd) parmi deux ou trois objets de volumes proches en les soupesant ou en utilisant une balance pour les peser.", MATHS)).toContain("balance");
    expect(ids("Disposer de quelques masses de référence. Estimer la masse d’objets du quotidien en gramme ou en kilogramme.", MATHS)).toEqual(["balance", "massesReference"]);
    expect(ids("Lire la valeur de la température avec un thermomètre à liquide.", SCIENCES)).toEqual(["thermometre"]);
    expect(ids("Réaliser un circuit électrique à une boucle associant un générateur (pile), un interrupteur, un récepteur (ampoule) pour mettre en évidence la circulation du courant électrique.", SCIENCES)).toEqual(["circuit"]);
    expect(ids("Expliquer l’alternance du jour et de la nuit en manipulant un globe terrestre.", "Histoire-géographie › Histoire")).toEqual(["globe"]);
    expect(ids("Lire sur une horloge à aiguilles une heure donnée en heures entières.", "Mathématiques › Grandeurs et mesures")).toEqual(["horloge"]);
    expect(ids("Comparer des volumes de liquide en utilisant un verre gradué ou en utilisant un récipient de contenance connue comme une bouteille d’un litre ou d’un demi-litre.", SCIENCES))
      .toEqual(["recipients", "eau"]);
  });

  it("ne confond pas les mots d'un domaine avec ceux d'un autre", () => {
    // Les « états solides » de l'eau ne sont pas des solides de géométrie.
    expect(ids("Reconnaitre et identifier les états solides et liquides de l’eau.", SCIENCES)).toEqual(["eau"]);
    expect(ids("Reconnaitre les solides usuels suivants : cube, boule, cône, cylindre, pavé.", "Mathématiques › Espace et géométrie")).toEqual(["solides"]);
    // La croissance d'une plante n'appelle pas la toise.
    expect(ids("Mesurer la croissance d’un être vivant (plante ou animal) au cours du temps.", "Sciences et technologie › Les êtres vivants dans leur environnement")).toEqual(["vivant"]);
    // Les instruments de mesure de la croissance ne sont pas des instruments de musique.
    expect(ids("Utiliser des instruments de mesure pour suivre la croissance du corps, en particulier du squelette (os).", "Sciences et technologie › Le corps humain et la santé"))
      .toEqual(["croissance", "corps"]);
    // Comparer des masses n'est pas comparer des longueurs ; des centimètres carrés ne se mesurent pas à la règle.
    expect(ids("Comparer des objets selon leur masse.", MATHS)).toEqual(["balance"]);
    expect(ids("Connaître et utiliser les centimètres carrés pour exprimer des aires", MATHS)).toEqual([]);
    // Lire une phrase n'appelle rien.
    expect(ids("Lire à voix haute un texte court.", "Français › Lecture")).toEqual([]);
  });

  it("dit le vrai matériel d'un atelier, et ce que le papier n'en remplace pas", () => {
    const mesures = materielDeLAtelier("mesures");
    expect(mesures.map((m) => m.id)).toEqual(expect.arrayContaining(["balance", "regles", "recipients"]));
    expect(mesures.find((m) => m.id === "balance")!.irremplacable).toMatch(/papier ne pèse rien/);
    expect(materielDeLAtelier("heure").map((m) => m.id)).toEqual(["horloge", "durees"]);
    expect(materielDeLAtelier("syllabaire")).toEqual([]);
  });

  it("relit l'inventaire avec méfiance", () => {
    const inv = lireInventaire(ecrireInventaire({ balance: { a: true, lieu: "  armoire du fond " }, globe: { a: false, lieu: "" } }));
    expect(inv).toEqual({ balance: { a: true, lieu: "armoire du fond" }, globe: { a: false, lieu: "" } });
    expect(lireInventaire('{"inconnu":{"a":true},"balance":"oui"}')).toEqual({});
    expect(lireInventaire("pas du json")).toEqual({});
    expect(lireInventaire(null)).toEqual({});
  });

  it("écrit la note des séances : à sortir, avec le rangement, ou à se procurer", () => {
    const m = MATERIEL_REEL.filter((x) => ["balance", "massesReference"].includes(x.id));
    expect(noteDuMaterielReel(m, {})).toBe(
      "Matériel de la classe : une balance à plateaux et des masses marquées — le papier ne le remplace pas ; "
      + "des objets du quotidien à soupeser : un paquet d'un kilo, une plaquette de 250 g, une pomme… — le papier ne le remplace pas.",
    );
    expect(noteDuMaterielReel(m, { balance: { a: true, lieu: "armoire du fond" } })).toBe(
      "Matériel de la classe à sortir : une balance à plateaux et des masses marquées (armoire du fond).\n"
      + "À se procurer : des objets du quotidien à soupeser : un paquet d'un kilo, une plaquette de 250 g, une pomme… — le papier ne le remplace pas.",
    );
    expect(noteDuMaterielReel([], {})).toBe("");
  });
});
