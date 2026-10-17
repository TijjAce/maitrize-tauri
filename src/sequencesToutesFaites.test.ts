import { beforeEach, describe, expect, it, vi } from "vitest";
import cycle2 from "../src-tauri/referentiels/competences_cycle2.json";

const enregistres = { sequences: [] as any[], seances: [] as any[], feuilles: [] as any[] };
let compteur = 0;
vi.mock("./api", () => ({
  api: {
    sequenceSave: async (s: unknown) => { enregistres.sequences.push(s); },
    seanceSave: async (s: unknown) => { enregistres.seances.push(s); },
    settingGet: async () => null,
  },
  newId: () => `id-${++compteur}`,
  nowIso: () => "2026-10-17T08:00:00.000Z",
  anneeScolaireActuelle: () => "2026-2027",
  couleurPourMatiere: () => "blue",
}));
vi.mock("./impressionAtelier", () => ({
  poserDansUneSeance: async (atelier: string, titre: string, html: string, _style: string, seanceId: string, sequenceId: string, extras: any) => {
    enregistres.feuilles.push({ atelier, titre, html, seanceId, sequenceId, extras });
  },
}));
// Les aides se fabriquent avec les pictogrammes de la banque : ici, des fiches sans images.
vi.mock("./aidesDesSequences", () => {
  const aide = (seance: number, atelier: string, titre: string) => ({ seance, atelier, titre, fabriquer: async () => ({ html: `<p>${titre}</p>`, style: "", refaire: {} }) });
  return {
    aideDesMots: (seance: number) => aide(seance, "etiquettes", "Les mots des problèmes"),
    aidesDeLaSequence: (seances: { titre: string }[], _s: unknown, choix: { sequentiel: boolean; parole: number }) => [
      ...(choix.sequentiel ? seances.map((s, i) => aide(i, "sequentiel", `Ce que je vais faire — ${s.titre}`)) : []),
      ...(choix.parole >= 0 ? [aide(choix.parole, "priseDeParole", "Je prépare ma prise de parole")] : []),
    ],
  };
});

import type { Referentiel } from "./api";
import { FAMILLES, ONGLETS } from "./catalogueAteliers";
import { DEMARCHES, demarcheDe } from "./demarches";
import { DEMARCHES_CALCUL } from "./demarchesCalcul";
import { objectifParId } from "./faitsNumeriques";
import { planDesFeuilles } from "./feuillesDesSequences";
import { estLaSeanceDesMots } from "./motsDesProblemes";
import { graineDeLaFeuille } from "./sequenceSoustractionPosee";
import {
  CLASSES, ONGLET_DU_THEME, PHASE_LA_MARTINIERE, classeDesEleves, classesDeLaDemarche, competenceDeLaDemarche, creerLaSequenceToutefaite,
  nomSansClasse, periodeDeLaDemarche, planToutFait, sequencesDuTheme, themeDeLOnglet, type ThemeToutFait,
} from "./sequencesToutesFaites";

const THEMES = Object.keys(ONGLET_DU_THEME) as ThemeToutFait[];
const toutes = THEMES.flatMap((t) => sequencesDuTheme(t).map((s) => ({ ...s, theme: t })));
const periodeDe = (id: string, c: (typeof CLASSES)[number]) => periodeDeLaDemarche(id, c) ?? 3;
const REFERENTIELS: Referentiel[] = [{
  id: "cycle2", nom: "Cycle 2 — CP, CE1, CE2 (programmes 2026)", cycle: "Cycle 2", donnees: JSON.stringify(cycle2),
  estIntegre: true, dateAjout: "", actif: true,
}];

describe("les séquences toutes faites, d'après les déroulements (demande de l'enseignant, octobre 2026)", () => {
  beforeEach(() => { enregistres.sequences = []; enregistres.seances = []; enregistres.feuilles = []; });

  it("rangent chaque déroulement de mathématiques d'une classe connue dans un domaine, s'il a des feuilles à cette classe", () => {
    for (const t of THEMES) expect(sequencesDuTheme(t).length, t).toBeGreaterThan(0);
    const ids = toutes.map((s) => s.demarche.id);
    expect(new Set(ids).size).toBe(ids.length);
    // Toutes celles qui ont une classe et des feuilles, et seulement elles.
    const attendues = DEMARCHES.filter((d) => d.famille === "Mathématiques"
      && classesDeLaDemarche(d).some((c) => (planDesFeuilles(d.id, { classe: c, periode: periodeDe(d.id, c), competence: "" })?.feuilles.length ?? 0) > 0));
    expect([...ids].sort()).toEqual(attendues.map((d) => d.id).sort());
    // Les démarches des guides, sans classe, restent dans la fiche d'une séquence ; une démarche sans feuille aussi.
    for (const id of ["problemes", "calcul-mental-martiniere", "geometrie-grandeurs", "mots-operations-ce2"]) expect(ids).not.toContain(id);
    const theme = (id: string) => toutes.find((s) => s.demarche.id === id)?.theme;
    expect(theme("nombres-livret-ce1")).toBe("nombres");
    expect(theme("posees-ce1")).toBe("calcul");
    expect(theme("table-de-7-ce1")).toBe("calcul");
    expect(theme("parties-tout-cp")).toBe("problemes");
    expect(theme("fractions-longueurs-ce2")).toBe("fractions");
    expect(theme("heure-cp")).toBe("grandeurs");
    expect(theme("symetrie-ce2")).toBe("geometrie");
    expect(theme("donnees-ce1")).toBe("donnees");
    // Dans l'ordre de l'année : au CP, grouper par dix en période 1, les nombres jusqu'à 59 en période 2, jusqu'à 100 en période 3.
    const cp = sequencesDuTheme("nombres").filter((s) => s.classes.includes("CP")).map((s) => s.demarche.id);
    expect(cp.indexOf("numeration-dizaine-cp")).toBeLessThan(cp.indexOf("nombres-livret-cp-59"));
    expect(cp.indexOf("nombres-livret-cp-59")).toBeLessThan(cp.indexOf("nombres-livret-cp-100"));
  });

  it("prennent la classe dans le nom du déroulement quand il la donne, et celle des élèves d'abord", () => {
    expect(classesDeLaDemarche({ id: "x", nom: "Pair ou impair (CE1)" })).toEqual(["CE1"]);
    expect(classesDeLaDemarche({ id: "x", nom: "Automatiser la lecture (CE1-CE2)" })).toEqual(["CE1", "CE2"]);
    expect(classesDeLaDemarche({ id: "x", nom: "Les accents (CP, CE1, CE2)" })).toEqual(["CP", "CE1", "CE2"]);
    expect(classesDeLaDemarche({ id: "x", nom: "Paléolithique et Néolithique (CE2, période 1)" })).toEqual(["CE2"]);
    expect(classesDeLaDemarche(demarcheDe("numeration-dizaine-cp")!)).toEqual(["CP"]);
    expect(classesDeLaDemarche(demarcheDe("problemes")!)).toEqual([]);
    expect(nomSansClasse("Pair ou impair (CE1)")).toBe("Pair ou impair");
    expect(nomSansClasse("Les accents (CP, CE1, CE2)")).toBe("Les accents");
    expect(nomSansClasse("Paléolithique et Néolithique (CE2, période 1)")).toBe("Paléolithique et Néolithique (CE2, période 1)");
    expect(classeDesEleves([{ niveau: "CE1" }, { niveau: "ce1 " }, { niveau: "CP" }, { niveau: "GS" }], CLASSES)).toBe("CE1");
    expect(classeDesEleves([{ niveau: "CE2" }, { niveau: "CP" }], CLASSES)).toBe("CP");
    expect(classeDesEleves([{ niveau: "CP" }], ["CE1", "CE2"])).toBeNull();
    expect(classeDesEleves([], CLASSES)).toBeNull();
  });

  it("ouvrent chaque séance de numération et de calcul sur le calcul mental La Martinière de la classe, avec sa fiche en tête", () => {
    let ouvertes = 0;
    for (const s of toutes.filter((x) => x.theme === "nombres" || x.theme === "calcul")) {
      const livret = DEMARCHES_CALCUL.some((d) => d.id === s.demarche.id);
      for (const c of s.classes) {
        const tout = planToutFait(s.demarche, c, periodeDe(s.demarche.id, c));
        // Les séquences de calcul mental des livrets en sont déjà : rien n'est ajouté.
        expect(tout.calculMental, s.demarche.id).toBe(!livret);
        if (livret) continue;
        const base = planToutFait(s.demarche, c, periodeDe(s.demarche.id, c), { calculMental: false });
        tout.demarche.seances.forEach((seance, i) => {
          if (estLaSeanceDesMots(seance)) { expect(seance).toBe(base.demarche.seances[i]); return; }
          expect(seance.phases[0].phase, `${s.demarche.id} ${i}`).toBe(PHASE_LA_MARTINIERE);
          expect(seance.duree).toBe(base.demarche.seances[i].duree + 10);
          const premiere = tout.plan.feuilles.find((f) => f.seance === i)!;
          expect(premiere.atelier, `${s.demarche.id} ${i}`).toBe("martiniere");
          const r = premiere.fabriquer(1).refaire as { martiniere: { niveau: string; objectifs: string[]; forme: string } };
          expect(r.martiniere.forme).toBe("oral");
          expect(objectifParId(r.martiniere.objectifs[0])?.niveau, `${s.demarche.id} ${i}`).toBe(c);
          expect(tout.plan.materiel[i]).toContain("ardoises");
          ouvertes++;
        });
        // Les feuilles de la séquence restent toutes, dans leur ordre, après les fiches du calcul mental.
        const fiches = tout.demarche.seances.filter((x) => !estLaSeanceDesMots(x)).length;
        expect(tout.plan.feuilles.slice(fiches).map((f) => `${f.seance} ${f.titre}`)).toEqual(base.plan.feuilles.map((f) => `${f.seance} ${f.titre}`));
      }
    }
    expect(ouvertes).toBeGreaterThan(100);
    // Au CP, en période 1, les sommes jusqu'à dix et les compléments à dix : pas de nombres plus grands que ceux de la période.
    const p1 = planToutFait(demarcheDe("numeration-dizaine-cp")!, "CP", 1);
    const objectifs = new Set(p1.plan.feuilles.filter((f) => f.atelier === "martiniere")
      .map((f) => (f.fabriquer(1).refaire as { martiniere: { objectifs: string[] } }).martiniere.objectifs[0]));
    expect([...objectifs].sort()).toEqual(["cp-complements-10", "cp-sommes-10"]);
    // Les problèmes, la géométrie : rien n'est ajouté.
    for (const id of ["parties-tout-cp", "symetrie-ce2", "heure-ce1"]) {
      const d = demarcheDe(id)!;
      expect(planToutFait(d, classesDeLaDemarche(d)[0], 3).calculMental, id).toBe(false);
    }
  });

  it("ouvrent une séquence de problèmes sur la séance de ses mots, ses feuilles une séance plus loin", () => {
    const d = demarcheDe("parties-tout-cp")!;
    const tout = planToutFait(d, "CP", 4);
    expect(estLaSeanceDesMots(tout.demarche.seances[0])).toBe(true);
    expect(tout.demarche.seances).toHaveLength(d.seances.length + 1);
    expect(tout.plan.feuilles.some((f) => f.seance === 0)).toBe(false);
  });

  it("fabriquent toutes leurs feuilles, à chaque classe", () => {
    let n = 0;
    for (const s of toutes) for (const c of s.classes) {
      for (const [k, f] of planToutFait(s.demarche, c, periodeDe(s.demarche.id, c)).plan.feuilles.entries()) {
        const { html, style } = f.fabriquer(graineDeLaFeuille(17, k));
        expect(html.length, `${s.demarche.id} — ${f.titre}`).toBeGreaterThan(200);
        expect(style.length, `${s.demarche.id} — ${f.titre}`).toBeGreaterThan(20);
        n++;
      }
    }
    expect(n).toBeGreaterThan(600);
  });

  it("visent chacune une compétence de mathématiques du programme du cycle 2, à leur classe", () => {
    for (const s of toutes) for (const c of s.classes) {
      const comp = competenceDeLaDemarche(REFERENTIELS, s.demarche.id, c, periodeDe(s.demarche.id, c));
      expect(comp, `${s.demarche.id} ${c}`).not.toBeNull();
      expect(comp!.niveau ?? c).toBe(c);
      expect(comp!.domaineTitre).toBe("Mathématiques");
    }
    expect(competenceDeLaDemarche(REFERENTIELS, "nombres-livret-cp-59", "CP", 2)?.competenceTitre).toMatch(/suite orale des nombres jusqu.à cent/);
    expect(competenceDeLaDemarche(REFERENTIELS, "posees-ce1", "CE1", 3)?.competenceTitre).toMatch(/additions et des soustractions en colonnes/);
    expect(competenceDeLaDemarche(REFERENTIELS.map((r) => ({ ...r, actif: false })), "posees-ce1", "CE1", 3)).toBeNull();
  });

  it("crée la séquence à sa classe et sa période : ses séances, ses feuilles du tirage de l'aperçu, les mots des problèmes et les aides", async () => {
    const d = demarcheDe("sens-addition-soustraction-cp")!;
    const tout = planToutFait(d, "CP", 3);
    const competence = competenceDeLaDemarche(REFERENTIELS, d.id, "CP", 3);
    const r = await creerLaSequenceToutefaite({
      tout, classe: "CP", periode: 3, titre: "  ", competence, graine: 42, aides: { sequentiel: true, parole: 2 },
    });
    expect(r.sequence).toMatchObject({ titre: d.nom, niveau: "CP", periode: 3, cycle: "Cycle 2", matiere: "Mathématiques", nbSeancesPrevu: tout.demarche.seances.length });
    expect(JSON.parse(r.sequence.competenceVisee).competenceTitre).toBe(competence!.competenceTitre);
    expect(r.seances).toBe(tout.demarche.seances.length);
    // Les séances, numérotées, avec leur matériel ; la première, celle des mots, reçoit les mots relevés dans les énoncés.
    const seances = enregistres.seances.slice(0, r.seances);
    expect(seances.map((s) => s.numero)).toEqual(tout.demarche.seances.map((_, i) => i + 1));
    expect(seances[1].tableauDeroulement).toContain(PHASE_LA_MARTINIERE);
    expect(seances.every((s) => s.competences.includes(competence!.competenceTitre))).toBe(true);
    expect(enregistres.seances.length).toBe(r.seances + 1);
    expect(enregistres.seances[enregistres.seances.length - 1].materiel).toMatch(/Les personnes et les choses|Ce qui se passe|Les mots de la question/);
    // Les feuilles, dans leur séance, du tirage de l'aperçu ; puis la feuille des mots et les aides.
    expect(r.feuilles).toBe(tout.plan.feuilles.length);
    const [premiere] = enregistres.feuilles;
    expect(premiere.atelier).toBe("martiniere");
    expect(premiere.seanceId).toBe(seances[tout.plan.feuilles[0].seance].id);
    expect(premiere.html).toBe(tout.plan.feuilles[0].fabriquer(graineDeLaFeuille(42, 0)).html);
    expect(premiere.extras.fabrication.graine).toBe(graineDeLaFeuille(42, 0));
    const aides = enregistres.feuilles.slice(r.feuilles);
    expect(aides[0]).toMatchObject({ atelier: "etiquettes", seanceId: seances[0].id });
    expect(aides.filter((a) => a.atelier === "sequentiel")).toHaveLength(r.seances);
    expect(aides.filter((a) => a.atelier === "priseDeParole").map((a) => a.seanceId)).toEqual([seances[2].id]);
    expect(r.aides).toBe(aides.length);
  });

  it("se présentent dans Fabriquer en cartes bleues, une par domaine", () => {
    const outils = FAMILLES.flatMap((f) => f.outils);
    for (const t of THEMES) {
      const onglet = ONGLET_DU_THEME[t];
      expect((ONGLETS as readonly string[]).includes(onglet), onglet).toBe(true);
      expect(outils.find((o) => o.id === onglet)?.sequence, onglet).toBe(true);
      expect(themeDeLOnglet(onglet)).toBe(t);
    }
    expect(themeDeLOnglet("posees")).toBeNull();
  });
});
