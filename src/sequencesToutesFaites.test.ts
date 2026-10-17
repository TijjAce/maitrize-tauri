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
import { DEMARCHES_HISTOIRE_GEO } from "./demarchesHistoireGeo";
import { objectifParId } from "./faitsNumeriques";
import { planDesFeuilles, type ClasseC2 } from "./feuillesDesSequences";
import { estLaSeanceDesMots } from "./motsDesProblemes";
import { DEMARCHE_SOUSTRACTION_POSEE, FEUILLES_SOUSTRACTION_POSEE, graineDeLaFeuille } from "./sequenceSoustractionPosee";
import {
  CLASSES, DISCIPLINES, DOMAINES, PHASE_LA_MARTINIERE, classeDesEleves, classesDeLaDemarche, competenceDeLaDemarche, creerLaSequenceToutefaite,
  domaineDeLaDemarche, lirePeriodes, nomSansClasse, periodeDeLaDemarche, planToutFait, rangerLesSequences, sequencesToutesFaites,
  type SequenceToutefaite,
} from "./sequencesToutesFaites";

const toutes = sequencesToutesFaites();
const periodeDe = (id: string, c: ClasseC2) => periodeDeLaDemarche(id, c) ?? 3;
const REFERENTIELS: Referentiel[] = [{
  id: "cycle2", nom: "Cycle 2 — CP, CE1, CE2 (programmes 2026)", cycle: "Cycle 2", donnees: JSON.stringify(cycle2),
  estIntegre: true, dateAjout: "", actif: true,
}];
const sequence = (cle: string) => toutes.find((s) => s.cle === cle)!;
const titres = (ss: SequenceToutefaite[]) => ss.map((s) => s.cle);

describe("les séquences toutes faites, d'après les déroulements (demande de l'enseignant, octobre 2026)", () => {
  beforeEach(() => { enregistres.sequences = []; enregistres.seances = []; enregistres.feuilles = []; });

  it("prennent chaque déroulement d'une classe connue — mathématiques, français, histoire-géographie — à chaque classe où il a des feuilles", () => {
    const cles = toutes.map((s) => s.cle);
    expect(new Set(cles).size).toBe(cles.length);
    const attendues = DEMARCHES.filter((d) => domaineDeLaDemarche(d)).flatMap((d) => classesDeLaDemarche(d)
      .filter((c) => (planDesFeuilles(d.id, { classe: c, periode: periodeDe(d.id, c), competence: "" })?.feuilles.length ?? 0) > 0)
      .map((c) => `${d.id}:${c}`));
    // La soustraction posée du CE1 en est aussi, avec ses séances et ses feuilles à elle.
    expect([...cles].sort()).toEqual([...attendues, "soustraction-posee-ce1:CE1"].sort());
    expect(cles.length).toBeGreaterThan(200);
    // Les démarches des guides, sans classe, restent dans la fiche d'une séquence ; une démarche sans feuille aussi ; la maternelle a ses cartes.
    for (const id of ["problemes", "calcul-mental-martiniere", "geometrie-grandeurs", "comprehension", "investigation", "mots-operations-ce2", "phonologie"]) {
      expect(cles.some((c) => c.startsWith(`${id}:`)), id).toBe(false);
    }
    // Un déroulement de plusieurs classes est pris à chacune.
    expect(cles.filter((c) => c.startsWith("accents-c2:"))).toEqual(["accents-c2:CP", "accents-c2:CE1", "accents-c2:CE2"]);
    const domaine = (cle: string) => sequence(cle).domaine.id;
    const attendus: [string, string][] = [
      ["nombres-livret-ce1:CE1", "nombres"], ["posees-ce1:CE1", "calcul"], ["soustraction-posee-ce1:CE1", "calcul"], ["table-de-7-ce1:CE1", "calcul"],
      ["parties-tout-cp:CP", "problemes"], ["fractions-longueurs-ce2:CE2", "fractions"], ["heure-cp:CP", "grandeurs"], ["symetrie-ce2:CE2", "geometrie"],
      ["donnees-ce1:CE1", "donnees"], ["cgp-deux-jours-cp:CP", "code"], ["ecriture-cursive:CE1", "geste"], ["vocabulaire-ce1:CE1", "vocabulaire"],
      ["comprendre-ce1:CE1", "comprendre"], ["dictees-ce1:CE1", "orthographe"], ["ecrire-un-texte-c2:CE2", "ecrire"], ["conjuguer-futur-c2:CE1", "langue"],
      ["dire-un-poeme-c2:CP", "oral"], ["prehistoire-ce2:CE2", "temps"], ["se-loger-ce2:CE2", "espace"],
    ];
    for (const [cle, d] of attendus) expect(domaine(cle), cle).toBe(d);
    // Toute séquence d'histoire-géographie a sa place : dix d'histoire, les autres de géographie.
    for (const d of DEMARCHES_HISTOIRE_GEO) expect(domaineDeLaDemarche(d)?.discipline, d.id).toBe("Histoire-géographie");
    expect(DEMARCHES_HISTOIRE_GEO.filter((d) => domaineDeLaDemarche(d)?.id === "temps")).toHaveLength(10);
  });

  it("se rangent par famille, par niveau ou par moment de l'année, dans l'ordre de l'année", () => {
    // La période du programme ou du livret, comme l'onglet la lit : par la démarche, sinon par sa compétence.
    const periodes = new Map(toutes.map((s) => {
      const fixee = periodeDeLaDemarche(s.demarche.id, s.classe);
      const comp = competenceDeLaDemarche(REFERENTIELS, s.demarche.id, s.classe, fixee ?? 1);
      return [s.cle, fixee ?? periodeDeLaDemarche(s.demarche.id, s.classe, comp?.competenceTitre ?? "")];
    }));
    const programme = (s: SequenceToutefaite) => periodes.get(s.cle) ?? null;
    // Par famille : une section par discipline, un groupe par domaine.
    const parFamille = rangerLesSequences(toutes, "famille", programme);
    expect(parFamille.map((s) => s.titre)).toEqual(DISCIPLINES.map((d) => d.nom));
    expect(parFamille[0].groupes.map((g) => g.titre)).toEqual(DOMAINES.filter((d) => d.discipline === "Mathématiques").map((d) => d.nom));
    expect(parFamille[0].aide).toBe("Les nombres, le calcul, les problèmes, les fractions, grandeurs et mesures, espace et géométrie, données");
    expect(parFamille.reduce((n, s) => n + s.nombre, 0)).toBe(toutes.length);
    // Dans un groupe, par classe puis par période : au CP, grouper par dix (période 1), jusqu'à 59 (période 2), jusqu'à 100 (période 3).
    const nombres = titres(parFamille[0].groupes[0].sequences);
    expect(nombres.indexOf("numeration-dizaine-cp:CP")).toBeLessThan(nombres.indexOf("nombres-livret-cp-59:CP"));
    expect(nombres.indexOf("nombres-livret-cp-59:CP")).toBeLessThan(nombres.indexOf("nombres-livret-cp-100:CP"));
    expect(nombres.indexOf("nombres-livret-cp-100:CP")).toBeLessThan(nombres.indexOf("groupements-ce1:CE1"));
    // Par niveau : une section par classe, ses groupes disent la discipline.
    const parNiveau = rangerLesSequences(toutes, "niveau", programme);
    expect(parNiveau.map((s) => s.titre)).toEqual(["CP", "CE1", "CE2"]);
    for (const s of parNiveau) for (const g of s.groupes) for (const x of g.sequences) expect(x.classe).toBe(s.titre);
    expect(parNiveau[1].groupes[0].titre).toBe("Mathématiques — les nombres");
    // Par moment de l'année : les cinq périodes, puis celles que le programme ne fixe pas ; le choix de l'enseignant les déplace.
    const parMoment = rangerLesSequences(toutes, "moment", programme);
    expect(parMoment.map((s) => s.cle)).toEqual(["moment:1", "moment:2", "moment:3", "moment:4", "moment:5", "moment:sans"]);
    const dans = (sections: typeof parMoment, cle: string) => sections.find((s) => s.groupes.some((g) => g.sequences.some((x) => x.cle === cle)))?.cle;
    expect(dans(parMoment, "prehistoire-ce2:CE2")).toBe("moment:1");
    expect(dans(parMoment, "rome-gaule-ce2:CE2")).toBe("moment:2");
    expect(dans(parMoment, "heure-cp:CP")).toBe("moment:sans");
    const choisies: Record<string, number> = { "heure-cp:CP": 4 };
    expect(dans(rangerLesSequences(toutes, "moment", (s) => choisies[s.cle] ?? programme(s)), "heure-cp:CP")).toBe("moment:4");
    // Une section vide ne se montre pas.
    expect(rangerLesSequences(toutes.filter((s) => s.classe === "CP"), "niveau", programme).map((s) => s.titre)).toEqual(["CP"]);
  });

  it("gardent les périodes choisies telles qu'on peut s'y fier", () => {
    expect(lirePeriodes('{"heure-cp:CP":4,"x:CE1":7,"y:CE2":"2","z:CP":2.5,"w:CE1":1}')).toEqual({ "heure-cp:CP": 4, "w:CE1": 1 });
    expect(lirePeriodes("pas du json")).toEqual({});
    expect(lirePeriodes("[3]")).toEqual({});
    expect(lirePeriodes(null)).toEqual({});
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
    for (const s of toutes.filter((x) => x.domaine.id === "nombres" || x.domaine.id === "calcul")) {
      if (s.demarche.id === DEMARCHE_SOUSTRACTION_POSEE.id) continue;
      const livret = DEMARCHES_CALCUL.some((d) => d.id === s.demarche.id);
      const tout = planToutFait(s.demarche, s.classe, periodeDe(s.demarche.id, s.classe));
      // Les séquences de calcul mental des livrets en sont déjà : rien n'est ajouté.
      expect(tout.calculMental, s.cle).toBe(!livret);
      if (livret) continue;
      const base = planToutFait(s.demarche, s.classe, periodeDe(s.demarche.id, s.classe), { calculMental: false });
      tout.demarche.seances.forEach((seance, i) => {
        if (estLaSeanceDesMots(seance)) { expect(seance).toBe(base.demarche.seances[i]); return; }
        expect(seance.phases[0].phase, `${s.cle} ${i}`).toBe(PHASE_LA_MARTINIERE);
        expect(seance.duree).toBe(base.demarche.seances[i].duree + 10);
        const premiere = tout.plan.feuilles.find((f) => f.seance === i)!;
        expect(premiere.atelier, `${s.cle} ${i}`).toBe("martiniere");
        const r = premiere.fabriquer(1).refaire as { martiniere: { niveau: string; objectifs: string[]; forme: string } };
        expect(r.martiniere.forme).toBe("oral");
        expect(objectifParId(r.martiniere.objectifs[0])?.niveau, `${s.cle} ${i}`).toBe(s.classe);
        expect(tout.plan.materiel[i]).toContain("ardoises");
        ouvertes++;
      });
      // Les feuilles de la séquence restent toutes, dans leur ordre, après les fiches du calcul mental.
      const fiches = tout.demarche.seances.filter((x) => !estLaSeanceDesMots(x)).length;
      expect(tout.plan.feuilles.slice(fiches).map((f) => `${f.seance} ${f.titre}`)).toEqual(base.plan.feuilles.map((f) => `${f.seance} ${f.titre}`));
    }
    expect(ouvertes).toBeGreaterThan(100);
    // Au CP, en période 1, les sommes jusqu'à dix et les compléments à dix : pas de nombres plus grands que ceux de la période.
    const p1 = planToutFait(demarcheDe("numeration-dizaine-cp")!, "CP", 1);
    const objectifs = new Set(p1.plan.feuilles.filter((f) => f.atelier === "martiniere")
      .map((f) => (f.fabriquer(1).refaire as { martiniere: { objectifs: string[] } }).martiniere.objectifs[0]));
    expect([...objectifs].sort()).toEqual(["cp-complements-10", "cp-sommes-10"]);
    // Les problèmes, la géométrie, le français, l'histoire-géographie : rien n'est ajouté.
    for (const cle of ["parties-tout-cp:CP", "symetrie-ce2:CE2", "heure-ce1:CE1", "dictees-ce1:CE1", "prehistoire-ce2:CE2"]) {
      const s = sequence(cle);
      expect(planToutFait(s.demarche, s.classe, 3).calculMental, cle).toBe(false);
    }
  });

  it("donnent à la soustraction posée ses séances et ses feuilles à elle, son calcul mental compris, qu'on peut retirer", () => {
    const d = DEMARCHE_SOUSTRACTION_POSEE;
    const avec = planToutFait(d, "CE1", 3);
    expect(avec.calculMental).toBe(true);
    expect(avec.demarche).toBe(d);
    expect(avec.plan.feuilles).toBe(FEUILLES_SOUSTRACTION_POSEE);
    const sans = planToutFait(d, "CE1", 3, { calculMental: false });
    expect(sans.calculMental).toBe(false);
    sans.demarche.seances.forEach((s, i) => {
      expect(s.phases[0].phase).not.toBe(PHASE_LA_MARTINIERE);
      expect(s.duree).toBe(d.seances[i].duree - 10);
    });
    expect(sans.plan.feuilles.some((f) => f.atelier === "martiniere")).toBe(false);
    expect(sans.plan.feuilles).toHaveLength(FEUILLES_SOUSTRACTION_POSEE.filter((f) => f.atelier !== "martiniere").length);
    expect(competenceDeLaDemarche(REFERENTIELS, d.id, "CE1", 3)?.competenceTitre).toMatch(/additions et des soustractions en colonnes/);
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
    for (const s of toutes) {
      for (const [k, f] of planToutFait(s.demarche, s.classe, periodeDe(s.demarche.id, s.classe), { prenoms: ["Prénom un", "Prénom deux"] }).plan.feuilles.entries()) {
        const { html, style } = f.fabriquer(graineDeLaFeuille(17, k));
        expect(html.length, `${s.cle} — ${f.titre}`).toBeGreaterThan(200);
        expect(style.length, `${s.cle} — ${f.titre}`).toBeGreaterThan(20);
        n++;
      }
    }
    expect(n).toBeGreaterThan(1000);
  });

  it("visent une compétence du programme du cycle 2, de leur discipline et à leur classe", () => {
    let francaisEtHistoire = 0, trouvees = 0;
    for (const s of toutes) {
      const comp = competenceDeLaDemarche(REFERENTIELS, s.demarche.id, s.classe, periodeDe(s.demarche.id, s.classe));
      if (s.domaine.discipline === "Mathématiques") expect(comp, s.cle).not.toBeNull();
      else { francaisEtHistoire++; if (comp) trouvees++; }
      if (!comp) continue;
      expect(comp.niveau ?? s.classe, s.cle).toBe(s.classe);
      expect(comp.domaineTitre, s.cle).toBe(s.domaine.discipline);
    }
    // En français et en histoire-géographie, quelques séquences d'Éduscol ne sont proposées que pour une compétence d'une autre classe.
    expect(trouvees / francaisEtHistoire).toBeGreaterThan(0.85);
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

  it("crée une séquence de français dans sa matière, sans calcul mental", async () => {
    const s = sequence("dictees-ce1:CE1");
    const tout = planToutFait(s.demarche, s.classe, 2);
    const competence = competenceDeLaDemarche(REFERENTIELS, s.demarche.id, s.classe, 2);
    const r = await creerLaSequenceToutefaite({ tout, classe: "CE1", periode: 2, titre: "Les dictées", competence, graine: 7, aides: { sequentiel: false, parole: -1 } });
    expect(r.sequence).toMatchObject({ titre: "Les dictées", niveau: "CE1", periode: 2, matiere: "Français" });
    expect(r.feuilles).toBe(tout.plan.feuilles.length);
    expect(enregistres.feuilles.some((f) => f.atelier === "martiniere")).toBe(false);
    expect(r.aides).toBe(0);
  });

  it("se présentent dans Fabriquer en une seule carte bleue, en tête du catalogue", () => {
    expect(FAMILLES[0].id).toBe("sequences");
    expect(FAMILLES[0].outils.map((o) => [o.id, o.sequence])).toEqual([["sequencesToutesFaites", true]]);
    expect((ONGLETS as readonly string[]).includes("sequencesToutesFaites")).toBe(true);
    for (const id of ["sequencesNombres", "sequencesCalcul", "sequencesProblemes", "sequencesFractions", "sequencesGrandeurs", "sequencesGeometrie", "sequencesDonnees"]) {
      expect((ONGLETS as readonly string[]).includes(id), id).toBe(false);
    }
  });
});
