// ── L'agent de synthèse ───────────────────────────────────────────────────
//
// « Un agent local qui, au lancement, récupère toutes les infos d'un élève
// pour en rédiger une synthèse ; on voit l'avancement avec une barre et un
// petit chat qui avance » (l'enseignant, octobre 2026).
//
// L'agent lit tout sur l'ordinateur, source après source — le dossier, les
// observations, les temps d'observation, le cahier journal, les évaluations,
// les plans (PAP, PPRE, PPS), le PPI, le GEVA-Sco, les réunions —, puis
// Mistral rédige, les noms masqués (voir veilleEleve.ts). Il ne lit ni la
// santé (le PAI, les observations de santé, les prises en charge), ni les
// coordonnées, ni la famille, ni l'orientation, ni les papiers scannés : une
// synthèse peut être lue par la famille.

import { api, type Eleve, type ObservationEleve } from "./api";
import { lireCompetences, TYPE_DOC_COMPETENCES } from "./competencesTravaillees";
import { DISPOSITIFS } from "./data/dispositifs";
import { SECTIONS_SYNTHESE, brouillonDeSection, dansLaPeriode, indicesDeLEleve, type Section } from "./synthese";
import {
  ecritsDesObservations, ecritsDesReunions, ecritsDuJournal, prenomDe, redigerSyntheseSuivie, type Ecrit,
} from "./veilleEleve";

/** Une étape de l'agent : ce qu'il lit, et ce qu'il dit en le lisant. */
export interface EtapeDeLAgent { id: string; libelle: string; enCours: string }

export const ETAPES_DE_L_AGENT: EtapeDeLAgent[] = [
  { id: "dossier", libelle: "Dossier", enCours: "ouvre le dossier" },
  { id: "observations", libelle: "Observations", enCours: "lit les observations" },
  { id: "grille", libelle: "Temps d'observation", enCours: "lit les temps d'observation" },
  { id: "journal", libelle: "Cahier journal", enCours: "feuillette le cahier journal" },
  { id: "evaluations", libelle: "Évaluations", enCours: "regarde les évaluations et les compétences" },
  { id: "plans", libelle: "PAP, PPRE, PPS", enCours: "lit les plans d'accompagnement" },
  { id: "ppi", libelle: "PPI", enCours: "lit le PPI" },
  { id: "gevasco", libelle: "GEVA-Sco", enCours: "lit le GEVA-Sco" },
  { id: "reunions", libelle: "Réunions", enCours: "relit les comptes rendus de réunion" },
  { id: "redaction", libelle: "Rédaction", enCours: "rédige la synthèse" },
];

/** Ce que la barre montre : l'étape en cours, et ce que chaque étape faite a trouvé. */
export interface AvancementDeLAgent {
  /** Rang de l'étape en cours (0 au départ ; la longueur des étapes quand tout est fait). */
  etape: number;
  trouves: Record<string, number>;
}

/** De 0 à 1 : la lecture compte pour 60 %, la rédaction — la plus longue — pour le reste. */
export function partFaite(etape: number, redaction = 0): number {
  const lectures = ETAPES_DE_L_AGENT.length - 1;
  if (etape >= ETAPES_DE_L_AGENT.length) return 1;
  if (etape < lectures) return 0.6 * (etape / lectures);
  return 0.6 + 0.4 * Math.max(0, Math.min(0.95, redaction));
}

const jour = (iso: string | undefined | null) => (iso || "").slice(0, 10);
const dansLaPeriodeDu = (date: string, debut: string, fin: string) => {
  const j = jour(date);
  return (!debut || !j || j >= debut) && (!fin || !j || j <= fin);
};
const texte = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const lireJson = (brut: string | null | undefined): Record<string, unknown> => {
  try { const v: unknown = JSON.parse(brut || "null"); return v && typeof v === "object" ? (v as Record<string, unknown>) : {}; } catch { return {}; }
};

/** Les temps d'observation de la grille : ce qui réussit, ce qui résiste, ce qu'on a ajusté. */
export function ecritsDesTempsDObservation(fiches: ObservationEleve[], eleveId: string): Ecrit[] {
  return fiches.filter((f) => f.eleveId === eleveId).flatMap((f) => {
    const parties = [
      ["Réussites", f.reussites], ["Difficultés", f.difficultes], ["Hypothèses", f.hypotheses],
      ["Aménagements", f.amenagements], ["Réajustement", f.reajustement], ["Note", f.note],
    ].filter(([, t]) => texte(t)).map(([l, t]) => `${l} : ${texte(t)}`);
    if (!parties.length) return [];
    const ou = [f.axe, f.domaine, f.competence].map(texte).filter(Boolean).join(" — ");
    return [{ origine: "observation" as const, date: jour(f.date), texte: parties.join(" "), source: `Temps d'observation${ou ? ` (${ou})` : ""}` }];
  });
}

/**
 * Les plans d'accompagnement : seulement ce qui dit la pédagogie — adaptations,
 * aménagements, objectifs, constat, bilan des aides. Ni le PAI (la santé), ni
 * l'identification, les besoins notés par le médecin, les signatures.
 */
const SECTIONS_PEDAGOGIQUES = /adaptations|aménagements|conduite de classe|mise en œuvre pédagogique|objectifs|constat|bilan/i;

export function texteDesPlans(docs: Record<string, string | null>): string {
  const morceaux: string[] = [];
  for (const d of DISPOSITIFS) {
    if (d.id === "pai") continue;
    const v = lireJson(docs[d.id]);
    if (!Object.keys(v).length) continue;
    for (const s of d.sections) {
      if (!SECTIONS_PEDAGOGIQUES.test(s.titre) || /médecin/i.test(s.note ?? "")) continue;
      for (const c of s.champs) {
        const val = v[c.id];
        let dit = "";
        if (c.t === "zone" || c.t === "ligne") dit = texte(val);
        else if (c.t === "grille" && val && typeof val === "object") {
          const g = val as Record<string, boolean>;
          dit = c.items.filter((_, i) => c.colonnes.some((__, j) => g[`${i}:${j}`])).join(" ; ");
        } else if (c.t === "liste" && Array.isArray(val)) {
          dit = (val as unknown[]).map((l) => (Array.isArray(l) ? l.map(texte).filter(Boolean).join(", ") : "")).filter(Boolean).join(" ; ");
        }
        if (dit) morceaux.push(`${d.nom} — ${c.label} : ${dit}`);
      }
    }
  }
  return morceaux.join("\n");
}

/** Le PPI : besoins, aménagements, objectifs et leur statut, bilans de la période. Pas les prises en charge (le soin). */
export function texteDuPpi(brut: string | null, debut: string, fin: string): string {
  const v = lireJson(brut);
  const statut: Record<string, string> = { encours: "en cours", atteint: "atteint", areprendre: "à reprendre" };
  const lignes: string[] = [];
  if (texte(v.besoins)) lignes.push(`PPI — Besoins : ${texte(v.besoins)}`);
  if (texte(v.amenagements)) lignes.push(`PPI — Aménagements : ${texte(v.amenagements)}`);
  for (const o of Array.isArray(v.objectifs) ? v.objectifs as Record<string, unknown>[] : []) {
    if (!texte(o.intitule)) continue;
    lignes.push(`PPI — Objectif${texte(o.domaine) ? ` (${texte(o.domaine)})` : ""} : ${texte(o.intitule)} — ${statut[texte(o.statut)] ?? "en cours"}${texte(o.notes) ? ` ; ${texte(o.notes)}` : ""}`);
  }
  for (const b of Array.isArray(v.bilans) ? v.bilans as Record<string, unknown>[] : []) {
    if (texte(b.texte) && dansLaPeriodeDu(texte(b.date), debut, fin)) lignes.push(`PPI — Bilan du ${texte(b.date)} : ${texte(b.texte)}`);
  }
  return lignes.join("\n");
}

/**
 * Le GEVA-Sco : le niveau des apprentissages, les obstacles et les points
 * d'appui par domaine, les évolutions et le bilan des aménagements. Ni
 * l'identité, ni les coordonnées, ni les remarques de la famille, ni la
 * nature des difficultés ou les perspectives (la santé, l'orientation).
 */
export function texteDuGevasco(brut: string | null): string {
  const v = lireJson(brut);
  const lignes: string[] = [];
  const champ = (cle: string, libelle: string) => { if (texte(v[cle])) lignes.push(`GEVA-Sco — ${libelle} : ${texte(v[cle])}`); };
  champ("niveauApprentissages", "Niveau des apprentissages");
  if (v.acquisitions === "atteintes" || v.acquisitions === "nonatteintes") {
    lignes.push(`GEVA-Sco — Acquisitions du cycle : ${v.acquisitions === "atteintes" ? "atteintes" : "pas encore atteintes"}`);
  }
  const cadres = v.cadres && typeof v.cadres === "object" ? v.cadres as Record<string, { obstacles?: unknown; appuis?: unknown }> : {};
  for (const [domaine, c] of Object.entries(cadres)) {
    if (texte(c?.appuis)) lignes.push(`GEVA-Sco — ${domaine}, points d'appui : ${texte(c.appuis)}`);
    if (texte(c?.obstacles)) lignes.push(`GEVA-Sco — ${domaine}, obstacles : ${texte(c.obstacles)}`);
  }
  champ("evolutions", "Évolutions");
  champ("bilanAmenagements", "Bilan des aménagements");
  champ("bilanDispositifs", "Bilan des dispositifs");
  champ("bilanAccompagnements", "Bilan des accompagnements");
  champ("bilanAideHumaine", "Bilan de l'aide humaine");
  return lignes.join("\n");
}

/** Le suivi de la période, par domaine de la synthèse : compétences, progressions, évaluations, notes. */
export async function suiviDeLEleve(eleveId: string, debut: string, fin: string): Promise<{ texte: string; indices: number }> {
  const [competences, progressions, evaluations, notes, observations] = await Promise.all([
    api.documentEleveGet(eleveId, TYPE_DOC_COMPETENCES).then(lireCompetences),
    api.documentEleveGet(eleveId, "progressions").then((v) => { try { return v ? JSON.parse(v) : []; } catch { return []; } }),
    api.evaluationsList(), api.notesEleveList(), api.commentairesList(eleveId),
  ]);
  const periode = dansLaPeriode(indicesDeLEleve(eleveId, { competences, progressions, evaluations, notes, observations }), debut, fin);
  const texteSuivi = SECTIONS_SYNTHESE
    .map((s) => { const t = brouillonDeSection(periode.filter((i) => i.section === s.id)); return t ? `${s.titre} :\n${t}` : ""; })
    .filter(Boolean).join("\n\n");
  return { texte: texteSuivi, indices: periode.length };
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** L'agent s'est arrêté à la demande : rien n'est écrit. */
export class AgentArrete extends Error {
  constructor() { super("L'agent s'est arrêté."); }
}

/**
 * Lance l'agent sur un élève : il lit chaque source, puis fait rédiger la
 * synthèse. `surAvancement` reçoit chaque pas ; `arrete` est lu entre deux
 * lectures, et avant de rendre la rédaction. `pas` : le temps que dure, au
 * moins, une lecture — assez pour qu'on voie le chat avancer.
 */
export async function lancerLAgent(a: {
  eleve: Pick<Eleve, "id" | "nom" | "niveau" | "nonVerbal">;
  autresEleves: string[];
  debut: string; fin: string; periode: string;
  surAvancement: (av: AvancementDeLAgent) => void;
  arrete?: () => boolean;
  pas?: number;
}): Promise<{ redige: { bilan: string; sections: Partial<Record<Section, string>> }; lus: number }> {
  const trouves: Record<string, number> = {};
  const ecrits: Ecrit[] = [];
  let suivi = "";
  const plans: string[] = [];
  const prenom = prenomDe(a.eleve.nom);
  const dans = (e: Ecrit) => dansLaPeriodeDu(e.date, a.debut, a.fin);

  const lectures: Record<string, () => Promise<number>> = {
    dossier: async () => {
      const dit = [a.eleve.niveau && `Niveau : ${a.eleve.niveau}.`, a.eleve.nonVerbal && "L'élève ne s'exprime pas oralement."].filter(Boolean).join(" ");
      if (dit) plans.push(`Dossier — ${dit}`);
      return dit ? 1 : 0;
    },
    observations: async () => {
      const lus = ecritsDesObservations(await api.commentairesList(a.eleve.id), a.eleve.id).filter(dans);
      ecrits.push(...lus);
      return lus.length;
    },
    grille: async () => {
      const lus = ecritsDesTempsDObservation(await api.observationsList(a.eleve.id).catch(() => []), a.eleve.id).filter(dans);
      ecrits.push(...lus);
      return lus.length;
    },
    journal: async () => {
      const lus = ecritsDuJournal(await api.creneauxList(a.debut, a.fin).catch(() => []), a.eleve.id, prenom).filter(dans);
      ecrits.push(...lus);
      return lus.length;
    },
    evaluations: async () => {
      const s = await suiviDeLEleve(a.eleve.id, a.debut, a.fin);
      suivi = s.texte;
      return s.indices;
    },
    plans: async () => {
      const ids = DISPOSITIFS.filter((d) => d.id !== "pai").map((d) => d.id);
      const docs = Object.fromEntries(await Promise.all(ids.map(async (id) => [id, await api.documentEleveGet(a.eleve.id, `dispositif:${id}`).catch(() => null)] as const)));
      const t = texteDesPlans(docs);
      if (t) plans.push(t);
      return t ? t.split("\n").length : 0;
    },
    ppi: async () => {
      const t = texteDuPpi(await api.documentEleveGet(a.eleve.id, "ppi").catch(() => null), a.debut, a.fin);
      if (t) plans.push(t);
      return t ? t.split("\n").length : 0;
    },
    gevasco: async () => {
      const t = texteDuGevasco(await api.documentEleveGet(a.eleve.id, "gevasco").catch(() => null));
      if (t) plans.push(t);
      return t ? t.split("\n").length : 0;
    },
    reunions: async () => {
      const lus = ecritsDesReunions(await api.reunionsList().catch(() => []), prenom).filter(dans);
      ecrits.push(...lus);
      return lus.length;
    },
  };

  for (let i = 0; i < ETAPES_DE_L_AGENT.length - 1; i++) {
    if (a.arrete?.()) throw new AgentArrete();
    a.surAvancement({ etape: i, trouves: { ...trouves } });
    const [n] = await Promise.all([lectures[ETAPES_DE_L_AGENT[i].id](), pause(a.pas ?? 350)]);
    trouves[ETAPES_DE_L_AGENT[i].id] = n;
  }
  if (a.arrete?.()) throw new AgentArrete();
  const rang = ETAPES_DE_L_AGENT.length - 1;
  a.surAvancement({ etape: rang, trouves: { ...trouves } });
  ecrits.sort((x, y) => y.date.localeCompare(x.date));
  const redige = await redigerSyntheseSuivie({
    eleve: { id: a.eleve.id, nom: a.eleve.nom }, autresEleves: a.autresEleves,
    ecrits, suivi, plans: plans.join("\n"), periode: a.periode,
  });
  if (a.arrete?.()) throw new AgentArrete();
  trouves.redaction = Object.keys(redige.sections).length + (redige.bilan ? 1 : 0);
  a.surAvancement({ etape: ETAPES_DE_L_AGENT.length, trouves: { ...trouves } });
  const lus = Object.entries(trouves).filter(([id]) => id !== "redaction").reduce((s, [, n]) => s + n, 0);
  return { redige, lus };
}
