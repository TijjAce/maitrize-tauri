import { describe, expect, it } from "vitest";
import { FAMILLES, ONGLETS, PARTIES_DU_FRANCAIS } from "./catalogueAteliers";
import { MOTS_EXEMPLE } from "./exemplesDesAteliers";
import { hasard } from "./hasard";
import {
  LOTOS_DES_SONS, REGLAGES_LOTO_SONS, htmlLotoDesSons, lotoDe, partieDeLoto, regleDuLoto, reglagesLotoSons, sonDuMot, syllabesDuMot,
  type UniteLoto,
} from "./lotosDesSons";
import { sourceDeLAtelier } from "./sourcesDesAteliers";

const avecImages = (mots: readonly string[]) => mots.map((mot, i) => ({ id: 100 + i, mot }));
const cle = (mot: string, u: UniteLoto) => sonDuMot(mot, u)?.cle ?? null;
const ensemble = (u: UniteLoto, ...mots: string[]) => new Set(mots.map((m) => cle(m, u))).size === 1 && cle(mots[0], u) !== null;

describe("les lotos des sons (demande de l'enseignant, 31 octobre 2026)", () => {
  it("entendent dans chaque mot l'unité de leur loto, à sa place", () => {
    // L'attaque : les consonnes avant la voyelle — « dans tronc il y a deux parties /tr/ et /on/ » (guide 2020, p. 12).
    expect(sonDuMot("tronc", "attaque")).toEqual({ cle: "t.r", ecrit: "/tr/" });
    expect(ensemble("attaque", "train", "tronc", "tracteur")).toBe(true);
    expect(cle("avion", "attaque")).toBeNull();
    expect(ensemble("attaque", "chat", "cheval", "chapeau")).toBe(true);
    expect(cle("clé", "attaque")).not.toBe(cle("cadeau", "attaque"));
    // La rime : depuis la dernière voyelle ; les lettres muettes ne comptent pas, le i glissé de « lion » non plus.
    expect(sonDuMot("tronc", "rime")).toEqual({ cle: "on", ecrit: "-on" });
    expect(ensemble("rime", "bateau", "gâteau", "seau", "chapeau")).toBe(true);
    expect(ensemble("rime", "chat", "rat", "chocolat")).toBe(true);
    expect(ensemble("rime", "lion", "ballon", "camion")).toBe(true);
    expect(ensemble("rime", "poule", "boule")).toBe(true);
    expect(cle("lune", "rime")).not.toBe(cle("plume", "rime"));
    // Les syllabes orales : la première, la dernière ; « souris » et « riz » finissent pareil.
    expect(ensemble("syllabeAttaque", "bateau", "banane", "ballon")).toBe(true);
    expect(sonDuMot("bateau", "syllabeFin")?.ecrit).toBe("« teau »");
    expect(ensemble("syllabeFin", "souris", "riz")).toBe(true);
    expect(ensemble("syllabeFin", "bateau", "gâteau", "râteau")).toBe(true);
    expect(cle("moto", "syllabeAttaque")).not.toBe(cle("mouton", "syllabeAttaque"));
    // Le premier et le dernier son.
    expect(ensemble("phonemeAttaque", "soleil", "sac", "citron", "cerise")).toBe(true);
    expect(sonDuMot("lune", "phonemeFin")).toEqual({ cle: "n", ecrit: "/n/" });
    expect(ensemble("phonemeFin", "lune", "banane", "baleine")).toBe(true);
    expect(ensemble("phonemeFin", "bateau", "vélo")).toBe(true);
    // Le découpage suit celui de la classe : « sou-ris ».
    expect(syllabesDuMot("souris").map((s) => s.map((p) => p.graphie).join(""))).toEqual(["sou", "ris"]);
  });

  it("prennent le son que l'enseignant a corrigé, lu comme il l'écrit", () => {
    // « ville » n'est pas « fille » : sa rime est « ile », son dernier son /l/.
    expect(cle("ville", "rime")).toBe(cle("fille", "rime"));
    expect(sonDuMot("ville", "rime", "ile")).toEqual({ cle: "i.l", ecrit: "-ile" });
    expect(sonDuMot("ville", "phonemeFin", "/l/")).toEqual({ cle: "l", ecrit: "/l/" });
    expect(sonDuMot("ville", "attaque", "v")).toEqual({ cle: "v", ecrit: "/v/" });
    expect(sonDuMot("koala", "syllabeAttaque", "ko")?.cle).toBe("k.o");
    expect(sonDuMot("ville", "rime", "  ")).toEqual(sonDuMot("ville", "rime"));
  });

  it("font des planches où un jeton ne va qu'à une case, et une carte du meneur par son", () => {
    for (const l of LOTOS_DES_SONS) {
      const mots = avecImages(MOTS_EXEMPLE[l.atelier as keyof typeof MOTS_EXEMPLE]);
      for (const graine of [1, 2, 3]) {
        const p = partieDeLoto(mots, l.unite, REGLAGES_LOTO_SONS, hasard(graine));
        expect(p.manque, l.atelier).toBe("");
        expect(p.planches, l.atelier).toHaveLength(REGLAGES_LOTO_SONS.planches);
        for (const planche of p.planches) {
          expect(planche, l.atelier).toHaveLength(REGLAGES_LOTO_SONS.cases);
          const sons = planche.map((m) => sonDuMot(m.mot, l.unite)!.cle);
          expect(new Set(sons).size, `${l.atelier} : ${sons.join(" ")}`).toBe(sons.length);
        }
        // Chaque son des planches a sa carte, une seule fois.
        const appeles = p.appels.map((a) => a.cle);
        expect(new Set(appeles).size).toBe(appeles.length);
        expect(new Set(p.planches.flat().map((m) => sonDuMot(m.mot, l.unite)!.cle))).toEqual(new Set(appeles));
        expect(p.cartes).toEqual([]);
      }
    }
  });

  it("sans meneur, donnent à piocher une image d'un autre mot qui sonne pareil, pour chaque case", () => {
    const r = { ...REGLAGES_LOTO_SONS, jeu: "images" as const };
    for (const l of LOTOS_DES_SONS) {
      const p = partieDeLoto(avecImages(MOTS_EXEMPLE[l.atelier as keyof typeof MOTS_EXEMPLE]), l.unite, r, hasard(4));
      expect(p.manque, l.atelier).toBe("");
      expect(p.cartes).toHaveLength(r.planches * r.cases);
      // Pour chaque son, autant d'images à piocher que de cases qui l'attendent, jamais celle de la case.
      const cases = p.planches.flat();
      const compte = (liste: { mot: string }[]) => {
        const n = new Map<string, number>();
        for (const m of liste) { const c = sonDuMot(m.mot, l.unite)!.cle; n.set(c, (n.get(c) ?? 0) + 1); }
        return n;
      };
      expect(compte(p.cartes)).toEqual(compte(cases));
    }
    // Trop peu de paires : la partie ne se fait pas, et le dit.
    const seuls = partieDeLoto(avecImages(["chat", "lune", "moto", "vélo", "sac", "pomme"]), "rime", r, hasard(1));
    expect(seuls.planches).toEqual([]);
    expect(seuls.manque).toMatch(/deux mots/);
    // Avec le meneur, il faut autant de sons différents que de cases.
    const peu = partieDeLoto(avecImages(["bateau", "gâteau", "chat", "rat"]), "rime", REGLAGES_LOTO_SONS, hasard(1));
    expect(peu.manque).toMatch(/6 sons différents : ces mots n'en donnent que 2/);
  });

  it("impriment les planches, la règle du guide, et les cartes du meneur ou les images à piocher", () => {
    const l = lotoDe("syllabeAttaque");
    const mots = avecImages(MOTS_EXEMPLE.lotoSyllabesAttaque);
    const images = Object.fromEntries(mots.map((m) => [m.id, `data:image/png;base64,${m.mot}`]));
    const p = partieDeLoto(mots, l.unite, REGLAGES_LOTO_SONS, hasard(2));
    const html = htmlLotoDesSons(p, l, images, REGLAGES_LOTO_SONS);
    expect(html).toContain("Loto des syllabes d&#39;attaque — planche 4");
    expect(html).toContain("les cartes du meneur");
    expect(html).toContain("« ba »");
    expect(html).toContain("p. 24");
    expect(regleDuLoto(l, "meneur")).toMatch(/dit la syllabe .* commence par cette syllabe/);
    expect(regleDuLoto(lotoDe("rime"), "images")).toMatch(/rime avec le sien \(bateau – gâteau\)/);
    expect(regleDuLoto(lotoDe("phonemeFin"), "meneur")).toMatch(/finit par ce son/);
    const r = { ...REGLAGES_LOTO_SONS, jeu: "images" as const, legendes: true };
    const avecImagesAPiocher = htmlLotoDesSons(partieDeLoto(mots, l.unite, r, hasard(2)), l, images, r);
    expect(avecImagesAPiocher).toContain("les images à piocher (24)");
    expect(avecImagesAPiocher).toContain('<div class="mot">bateau</div>');
  });

  it("relisent leurs réglages, et chacun a son atelier au catalogue, dans « Sons et lecture », avec sa source", () => {
    expect(reglagesLotoSons({ cases: 9, jeu: "images", planches: 40, corrections: { ville: "ile", vide: " " } as Record<string, string> }))
      .toEqual({ planches: 12, cases: 9, jeu: "images", legendes: false, corrections: { ville: "ile" } });
    expect(reglagesLotoSons({})).toEqual(REGLAGES_LOTO_SONS);
    const outils = FAMILLES.flatMap((f) => f.outils);
    const sons = PARTIES_DU_FRANCAIS.find((p) => p.id === "sons")!.outils as string[];
    for (const l of LOTOS_DES_SONS) {
      expect((ONGLETS as readonly string[]).includes(l.atelier), l.atelier).toBe(true);
      expect(outils.find((o) => o.id === l.atelier)?.nom, l.atelier).toBe(l.nom);
      expect(sons, l.atelier).toContain(l.atelier);
      expect(sourceDeLAtelier(l.atelier), l.atelier).toMatch(/Éduscol|programme/);
    }
  });
});
