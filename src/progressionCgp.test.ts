import { describe, it, expect } from "vitest";
import { hasard } from "./hasard";
import { decouper } from "./decoupageCgp";
import { MOTS_DECHIFFRABLES } from "./motsDechiffrables";
import {
  ETAPES, ETAPE_PAR_DEFAUT, PERIODES, dechiffrable, dejaVu, etapeDe, etapeVoisine, motsDe, motsSeuls, ouSApprend, porteLEtape, pseudoMotsDe,
  syllabesDe, vuesJusqua,
} from "./progressionCgp";

const rang = (id: string) => ETAPES.findIndex((e) => e.id === id);
const REELS = new Set(MOTS_DECHIFFRABLES);
const HALLOWEEN = ["araignée", "balai", "chapeau de sorcier", "chauve-souris", "cimetière", "citrouille", "fantôme", "nuit", "sorcière", "vampire"];

describe("la progression des guides CP et CE1", () => {
  it("suit l'ordre du guide CP, période par période, puis le CE1", () => {
    expect(new Set(ETAPES.map((e) => e.id)).size).toBe(ETAPES.length);
    const ordre = ETAPES.map((e) => PERIODES.findIndex((p) => p.id === e.periode));
    expect(ordre).toEqual([...ordre].sort((a, b) => a - b));
    // Chaque période du CP finit par ses révisions.
    for (const p of [1, 2, 3, 4, 5]) expect(ETAPES.filter((e) => e.periode === p).slice(-1)[0].id).toBe(`p${p}-revisions`);
    // Les liquides et les fricatives avant m et s ; c = [k] en période 3, c = [s] en période 4, ill en période 5.
    expect(rang("p1-l")).toBeLessThan(rang("p2-m"));
    expect(rang("p1-j")).toBeLessThan(rang("p2-s"));
    expect(ouSApprend("c-k")!.etape.periode).toBe(3);
    expect(ouSApprend("c-s")!.etape.periode).toBe(4);
    expect(ouSApprend("ill-yod")!.etape.periode).toBe(5);
    expect(ETAPES.filter((e) => e.periode === "ce1")).toHaveLength(17);
  });

  it("apprend, à la fin du CP, tout ce que demandent les mots du corpus", () => {
    const toutLeCp = vuesJusqua(etapeDe("p5-revisions"));
    for (const mot of MOTS_DECHIFFRABLES) {
      const ms = decouper(mot);
      for (const m of ms) expect(ouSApprend(m.cle), `« ${mot} » : ${m.cle}`).toBeDefined();
      expect(dechiffrable(ms, toutLeCp), mot).toBe(true);
    }
  });

  it("ne donne, à chaque étape, que des syllabes, des pseudo-mots et des mots déjà déchiffrables", () => {
    for (const e of ETAPES) {
      const vues = vuesJusqua(e);
      const syllabes = syllabesDe(e);
      for (const s of syllabes) expect(dechiffrable(decouper(s, { syllabe: true }), vues), `${e.id} : ${s}`).toBe(true);
      const pseudos = pseudoMotsDe(e, 10, hasard(5), REELS);
      for (const p of pseudos) {
        const ms = decouper(p);
        expect(dechiffrable(ms, vues) && porteLEtape(e, ms, p), `${e.id} : ${p}`).toBe(true);
        expect(REELS.has(p) || p.length > 9 || /n[pb]/.test(p), `${e.id} : ${p}`).toBe(false);
      }
      const { corpus } = motsDe(e, []);
      for (const mot of corpus) expect(dechiffrable(decouper(mot), vues) && porteLEtape(e, decouper(mot), mot), `${e.id} : ${mot}`).toBe(true);
      // De quoi remplir une grille, sans répéter dix fois la même chose.
      expect(syllabes.length + pseudos.length + corpus.length, e.id).toBeGreaterThanOrEqual(5);
    }
  });

  it("marie les graphèmes comme le guide : ch devant a, o, é, u, i, e, eu, ou", () => {
    expect(syllabesDe(etapeDe("p2-ch")).slice(0, 8)).toEqual(["cha", "cho", "ché", "chu", "chi", "che", "cheu", "chou"]);
    expect(syllabesDe(etapeDe("p1-ou"))).toEqual(["lou", "rou", "fou", "jou", "oul", "our", "ouf"]);
    // c devant a, o, u ; qu devant e, i.
    const ck = syllabesDe(etapeDe("p3-c-k"));
    expect(ck).toEqual(expect.arrayContaining(["ca", "co", "cou", "qui", "que"]));
    expect(ck.some((s) => /^c[eéi]/.test(s))).toBe(false);
    // Avant les syllabes VC et CVC, pas de « il » ni de « jour ».
    expect(motsDe(etapeDe("p1-r"), []).corpus).not.toContain("or");
    expect(motsDe(etapeDe("p1-ou"), []).corpus).not.toContain("jour");
    expect(motsDe(etapeDe("p2-cvc-ccv"), []).corpus).toEqual(expect.arrayContaining(["jour", "four", "fleur"]));
  });

  it("garde les mots de la classe qui se déchiffrent, et dit ce qui manque aux autres", () => {
    const ch = motsDe(etapeDe("p2-ch"), HALLOWEEN);
    expect(ch.miens).toEqual([]);
    expect(ch.enAttente.map((a) => a.mot)).toEqual(["chapeau", "chauve-souris"]);
    const chauve = ch.enAttente.find((a) => a.mot === "chauve-souris")!;
    expect(chauve.manque.map((m) => [m.libelle, m.etape?.id])).toEqual(expect.arrayContaining([["au", "p3-au"], ["s", "p2-s"]]));
    // À l'étape au, eau : le chapeau et la chauve-souris se lisent.
    const au = motsDe(etapeDe("p3-au"), HALLOWEEN);
    expect(au.miens).toEqual(["chapeau", "chauve-souris"]);
    expect(au.enAttente).toEqual([]);
    // En fin d'année, la citrouille, enfin.
    expect(motsDe(etapeDe("p5-ill"), HALLOWEEN).miens).toEqual(["citrouille"]);
  });

  it("ne met que des mots seuls dans la grille ; les verbes avec « ils », à leur étape seulement", () => {
    expect(motsSeuls(["chapeau de sorcier", "toile d'araignée", "chauve-souris", "ils chantent", "pleine lune", "chapeau"]))
      .toEqual(["chapeau", "de", "sorcier", "toile", "araignée", "chauve-souris", "ils chantent", "pleine", "lune"]);
    for (const e of ETAPES) {
      const { miens, corpus } = motsDe(e, ["ils jouent"]);
      const avecIls = [...miens, ...corpus].filter((m) => m.includes(" "));
      if (e.id === "p3-ent") expect(avecIls).toEqual(expect.arrayContaining(["ils jouent", "ils chantent"]));
      else expect(avecIls, e.id).toEqual([]);
    }
  });

  it("retrouve l'étape d'un ancien réglage, et dit ce qui est déjà étudié", () => {
    expect(etapeDe("ch").id).toBe("p2-ch");
    expect(etapeDe("an").id).toBe("p3-an");
    expect(etapeDe("je-n-existe-pas").id).toBe(ETAPE_PAR_DEFAUT);
    expect(etapeVoisine(etapeDe("p1-voyelles"), -1)).toBeUndefined();
    expect(etapeVoisine(etapeDe("p1-voyelles"), 1)!.id).toBe("p1-l");
    expect(dejaVu(etapeDe("p1-voyelles"))).toBe("rien encore : c'est le tout début.");
    expect(dejaVu(etapeDe("p2-ch"))).toBe("la période 1 ; en période 2 : CVC et CCV · lettres muettes · v.");
    expect(dejaVu(etapeDe("p4-revisions"))).toBe("les périodes 1 à 3, et toute la période 4.");
    expect(dejaVu(etapeDe("ce1-eu"))).toContain("tout le code du CP");
  });
});
