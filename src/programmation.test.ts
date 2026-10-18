import { describe, it, expect } from "vitest";
import { libelleDeProgrammation, niveauDeProgrammation, programmationProposee } from "./programmation";
import { CLASSE_DES_DEMARCHES } from "./demarchesNumeration";
import { demarcheDe } from "./demarches";
import { tempsDeLaPeriode } from "./demarchesLangue";

const propose = (niveau: string, competenceTitre: string, demarche = "") => programmationProposee({ niveau, competenceTitre }, demarche);

describe("la programmation d'une séquence", () => {
  it("propose aux séquences de numération la période que le programme leur donne", () => {
    const attendues: Record<string, number> = {
      "numeration-dizaine-cp": 1, "nombres-livret-cp-59": 2, "nombres-livret-cp-100": 3, "comparer-nombres-cp": 3,
      "groupements-ce1": 1, "nombres-livret-ce1": 2, "comparer-nombres-ce1": 2,
      "groupements-ce2": 1, "nombres-livret-ce2": 2, "comparer-nombres-ce2": 2,
    };
    expect(Object.keys(attendues).sort()).toEqual(Object.keys(CLASSE_DES_DEMARCHES).sort());
    for (const [id, periode] of Object.entries(attendues)) {
      expect(demarcheDe(id), id).toBeDefined();
      const p = propose(CLASSE_DES_DEMARCHES[id], "", id)!;
      expect([p.niveau, p.periode], id).toEqual([CLASSE_DES_DEMARCHES[id], periode]);
      // La raison cite le programme, à la classe de la séquence.
      expect(p.raison, id).toMatch(new RegExp(`^Programme de mathématiques du cycle 2 \\(2024\\), ${CLASSE_DES_DEMARCHES[id]} : « .+ »$`));
    }
    expect(propose("CE1", "", "nombres-livret-ce1")!.raison).toContain("jusqu'à mille");
    expect(propose("CE1", "", "groupements-ce1")!.raison).toContain("La centaine est abordée dès le début de la période 1.");
  });

  it("trouve les autres repères de période du programme, compétence par compétence", () => {
    const cas: [string, string, number][] = [
      ["CP", "Poser et effectuer des additions en colonnes.", 4],
      ["CP", "Constituer une somme d’argent donnée avec des pièces et des billets.", 2],
      ["CE1", "Savoir interpréter, représenter, écrire et lire les fractions 1/2, 1/3, 1/4, 1/5, 1/6, 1/8 et 1/10.", 2],
      ["CE1", "Comparer des fractions ayant le même dénominateur.", 4],
      ["CE1", "Poser et effectuer des additions et des soustractions en colonnes.", 3],
      ["CE1", "Connaitre le lien entre les euros et les centimes.", 2],
      ["CE1", "Connaitre le sens de l’écriture à virgule d’une somme d’argent.", 3],
      ["CE2", "Partager une unité de longueur en fractions d’unité et mesurer des longueurs non entières par rapport à cette unité.", 3],
      ["CE2", "Poser et effectuer des multiplications d’un nombre à deux ou trois chiffres par un nombre à un ou deux chiffres.", 4],
      ["CE2", "Poser et effectuer des additions de montants en euro.", 2],
      ["CE2", "Poser et effectuer des soustractions de montants en euro.", 4],
    ];
    for (const [niveau, titre, periode] of cas) {
      const p = propose(niveau, titre)!;
      expect([p.niveau, p.periode], `${niveau} — ${titre}`).toEqual([niveau, periode]);
      expect(p.raison, titre).toMatch(/^Programme de mathématiques du cycle 2 \(2024\)/);
    }
  });

  it("ne fixe pas de période quand le programme n'en dit rien : le niveau seul", () => {
    // Additionner des fractions vient après les fractions unitaires, sans période dite.
    expect(propose("CE1", "Additionner et soustraire des fractions de même dénominateur.")).toEqual({ niveau: "CE1", periode: null, raison: "" });
    expect(propose("CP", "Lire et comprendre un texte.")).toEqual({ niveau: "CP", periode: null, raison: "" });
    // Une même compétence à une autre classe n'emporte pas le repère : l'addition posée en période 4, c'est au CP.
    expect(propose("CE1", "Poser et effectuer des additions en colonnes.")!.periode).toBeNull();
    expect(programmationProposee({ niveau: "", competenceTitre: "Lire" })).toBeNull();
    expect(programmationProposee(null)).toBeNull();
  });

  it("se dit en quelques mots, et ne prend pour niveau qu'un niveau", () => {
    expect(libelleDeProgrammation({ niveau: "CE1", periode: 2 })).toBe("CE1, période 2");
    expect(libelleDeProgrammation({ niveau: "", periode: 3 })).toBe("Période 3");
    expect(libelleDeProgrammation({ niveau: "cp", periode: null })).toBe("CP");
    expect(libelleDeProgrammation({})).toBe("");
    expect(niveauDeProgrammation(" ce2 ")).toBe("CE2");
    expect(niveauDeProgrammation("Cycle 2")).toBe("");
  });
});

describe("les fractions du CE1", () => {
  it("ne mettent en période 2 que les fractions unitaires et les mots pour les dire", () => {
    expect(propose("CE1", "Connaitre et utiliser les mots « dénominateur » et « numérateur ».")!.periode).toBe(2);
    expect(propose("CE1", "Savoir interpréter, représenter, écrire et lire des fractions inférieures ou égales à 1.")!.periode).toBeNull();
  });
});

describe("les repères relevés dans le texte des programmes de 2024 (demande de l'enseignant, octobre 2026)", () => {
  it("placent les séquences que le programme place, chacune avec sa phrase", () => {
    const cas: [string, string, number, RegExp][] = [
      ["egalites-fractions-ce2", "CE2", 1, /^Programme de mathématiques du cycle 2 \(2024\), CE2 : « Au début du CE2, les élèves réinvestissent/],
      ["posees-ce2", "CE2", 2, /« L'addition posée de montants en euro .+ au plus tard en période 2\. »$/],
      ["comprendre-cp", "CP", 3, /^Programme de français du cycle 2 \(2024\), CP : « Progressivement, à partir de la 3e période de CP/],
      ["familles-orthographe-c2", "CP", 2, /« Dès la fin de la 2e période — Écrire des mots dictés avec des lettres muettes apprises/],
      ["ecrire-un-texte-c2", "CE1", 1, /« Dès la période 1 — Écrire un texte court de une à trois phrases\. »$/],
      ["strategies-de-copie", "CE1", 1, /« À l'issue de la période 1 — Copier quatre à cinq phrases courtes\. »$/],
      ["strategies-de-copie", "CP", 2, /^Livret d'accompagnement de français du CP/],
    ];
    for (const [id, niveau, periode, raison] of cas) {
      expect(demarcheDe(id), id).toBeDefined();
      const p = propose(niveau, "", id)!;
      expect(p.periode, `${id} ${niveau}`).toBe(periode);
      expect(p.raison, `${id} ${niveau}`).toMatch(raison);
    }
    // Chaque classe son repère : ce que le programme dit du CE1 ne vaut pas au CE2, ni ce qu'il dit du CP au CE1.
    expect(propose("CE2", "", "strategies-de-copie")!.periode).toBeNull();
    expect(propose("CE2", "", "ecrire-un-texte-c2")!.periode).toBeNull();
    expect(propose("CE1", "", "familles-orthographe-c2")!.periode).toBeNull();
    // Ils ne viennent qu'en dernier : la compétence qui dit sa période la garde.
    expect(propose("CE2", "Poser et effectuer des soustractions de montants en euro.", "posees-ce2")!.periode).toBe(4);
    expect(propose("CE1", "Écrire un texte de six ou sept phrases maximum en assurant la cohérence syntaxique et logique du texte produit. (en fin d'année)", "ecrire-un-texte-c2")!.periode).toBe(5);
  });

  it("cite la compétence entière quand son intitulé porte le moment de l'année", () => {
    const p = propose("CP", "Copier une phrase en lien avec les 12/15 correspondances graphophonémiques étudiées. (dès la fin de la période 1)")!;
    expect(p.periode).toBe(1);
    expect(p.raison).toBe("Programme de français du cycle 2 (2024), CP : « Copier une phrase en lien avec les 12/15 correspondances graphophonémiques étudiées. (dès la fin de la période 1) »");
  });
});

describe("les séquences sans période du programme, datées par les livrets, les guides et les repères de 2019 (demande de l'enseignant, octobre 2026)", () => {
  const REPERES_2019 = /^Repères annuels de progression en mathématiques du cycle 2 \(Éduscol, 2019 — d'avant les programmes de 2024\), /;
  it("placent les séquences que ces textes datent, chacune avec sa phrase", () => {
    const debutDuCe2 = /CE2 : « Dès le début de l'année, les élèves résolvent des problèmes additifs et multiplicatifs .+ l'exploration d'un tableau ou d'un graphique\. »$/;
    const cas: [string, string, number, RegExp][] = [
      ["multiplication-ce1", "CE1", 1, /^Livret d'accompagnement de mathématiques du CE1 \(Éduscol, 2025\) : « Périodes 1 et 2 : Connaitre et utiliser le symbole « x »/],
      ["sens-addition-soustraction-cp", "CP", 2, /^Guide « Pour enseigner les nombres, le calcul et la résolution de problèmes au CP » \(Éduscol, 2021\) : « .+\(en période 2\)\. »$/],
      ["sens-multiplication-cp", "CP", 3, /CP : « À partir de la période 3, .+ le sens de la multiplication\. »$/],
      ["deux-etapes-cp", "CP", 3, /« La résolution de problèmes arithmétiques : périodes 3 à 5 .+\(2 étapes\) »$/],
      ["multiplicatifs-cp", "CP", 4, /« Problèmes multiplicatifs \(avec trois nombres en jeu inférieurs à 30 – périodes 4 et 5\) »$/],
      ["deux-etapes-ce1", "CE1", 1, /^Livret d'accompagnement de mathématiques du CE1 .+« En début d'année de CE1, .+ en une ou plusieurs étapes/],
      ["multiplicatifs-ce1", "CE1", 3, /CE1 : « À partir de la période 3, ils rencontrent de nouveaux problèmes multiplicatifs/],
      ["mixtes-ce1", "CE1", 4, /CE1 : « En période 4, .+ problèmes à deux étapes mixant addition et soustraction/],
      ["parties-tout-comparaison-ce2", "CE2", 1, debutDuCe2],
      ["multiplicatifs-ce2", "CE2", 1, debutDuCe2],
      ["deux-etapes-ce2", "CE2", 1, debutDuCe2],
      ["mixtes-ce2", "CE2", 1, debutDuCe2],
      ["problemes-donnees-ce2", "CE2", 1, debutDuCe2],
      ["phrase-cp", "CP", 1, /^Guide « Pour enseigner la lecture et l'écriture au CP » \(Éduscol, 2019\) : « Dès la première phrase de l'année/],
      ["accents-c2", "CP", 3, /« Dès qu'apparaîtront les lettres accentuées, .+ accent circonflexe\. » .+période 3 \(janvier-février\) : à, â, è, ê, ë\.$/],
      ["valeur-des-lettres-c2", "CP", 4, /« Période 4 \(mars-avril\) — Consonnes fricatives 5 - les différents graphèmes pour les phonèmes ‘s’ et ‘j’ »/],
      ["valeur-des-lettres-c2", "CE1", 1, /^Guide « Pour enseigner la lecture et l'écriture au CE1 » \(Éduscol, 2019\) : « .+tous les jours en période 1.+la valeur sonore de certaines lettres/],
      ["connecteurs-ce1", "CE1", 1, /« Au cours des périodes 1 à 3, .+ insérer des connecteurs pour lier les phrases entre elles/],
      ["genre-nombre-cp", "CP", 3, /^Programme de français du cycle 2 \(2024\), CP : « En milieu d'année — .+ identifie les marques grammaticales en genre et en nombre\. »$/],
      ["sujet-verbe-c2", "CP", 3, /^Guide « Pour enseigner la lecture et l'écriture au CP » .+-ent : terminaison muette — Pluriel des verbes du premier groupe » : le « -nt »/],
      ["lecture-expressive-ce2", "CE2", 1, /^Livret d'accompagnement de français du CE2 \(Éduscol, 2026\) : « Séances décrochées régulières à mener depuis la période 1/],
    ];
    for (const [id, niveau, periode, raison] of cas) {
      expect(demarcheDe(id), id).toBeDefined();
      const p = propose(niveau, "", id)!;
      expect(p.periode, `${id} ${niveau}`).toBe(periode);
      expect(p.raison, `${id} ${niveau}`).toMatch(raison);
      // Les repères de 2019 ont précédé les programmes de 2024 : leur citation le dit.
      if (/^Repères/.test(p.raison)) expect(p.raison, id).toMatch(REPERES_2019);
    }
    // Chaque classe son repère : les accents datés au CP ne le sont pas au CE1 ; s, c, g ne le sont pas au CE2.
    expect(propose("CE1", "", "accents-c2")!.periode).toBeNull();
    expect(propose("CE2", "", "valeur-des-lettres-c2")!.periode).toBeNull();
    expect(propose("CE1", "", "sujet-verbe-c2")!.periode).toBeNull();
  });

  it("rangent la conjugaison dans l'ordre des temps du programme, comme la fiche d'une séquence", () => {
    for (const niveau of ["CE1", "CE2"]) {
      for (const temps of ["present", "imparfait", "futur", "passeCompose"] as const) {
        const id = `conjuguer-${temps === "passeCompose" ? "passe-compose" : temps}-c2`;
        const p = propose(niveau, "", id)!;
        expect(tempsDeLaPeriode(p.periode!), `${id} ${niveau}`).toBe(temps);
        expect(p.raison).toMatch(/« Apprendre à conjuguer au présent, à l'imparfait, au futur puis au passé composé .+ » Le programme donne l'ordre des temps, sans période/);
      }
    }
    expect(propose("CE1", "", "conjuguer-present-c2")!.periode).toBe(1);
    expect(propose("CP", "", "conjuguer-futur-c2")!.periode).toBeNull();
  });

  it("ne passent qu'après la compétence qui dit sa période", () => {
    expect(propose("CE1", "Poser et effectuer des additions et des soustractions en colonnes.", "mixtes-ce1")!.periode).toBe(3);
    expect(propose("CE1", "Insérer des connecteurs pour rendre cohérent l'enchainement de plusieurs phrases. (en fin de période 2)", "connecteurs-ce1")!.periode).toBe(2);
  });
});
