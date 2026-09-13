// Synthèse d'un élève, par domaine ou matière, rédigée d'après son suivi :
// compétences travaillées, progressions, évaluations et observations.
//
// Rien n'est inventé ni écrasé : chaque section reçoit un brouillon — réussites,
// acquis en cours, points à consolider, observations — que l'enseignant relit.
// Une section déjà écrite n'est reprise que sur demande.

import type { CommentaireEleve, Evaluation, NoteEleve } from "./api";
import type { CompetenceTravaillee } from "./competencesTravaillees";
import type { CompetenceSelectionnee } from "./components/CompetenceTree";
import { normaliser } from "./competencesTravaillees";
import { pseudonymiser } from "./confidentialite";

export const SECTIONS_SYNTHESE = [
  { id: "langage", titre: "Langage oral et écrit — français" },
  { id: "maths", titre: "Mathématiques" },
  { id: "monde", titre: "Explorer le monde — sciences, temps et espace" },
  { id: "eps", titre: "Activités physiques et sportives" },
  { id: "arts", titre: "Activités artistiques" },
  { id: "vivre", titre: "Vivre ensemble, autonomie et comportement" },
  { id: "autres", titre: "Autres observations" },
] as const;

export type Section = typeof SECTIONS_SYNTHESE[number]["id"];
export type Niveau = 1 | 2 | 3;

/** Ce qu'on garde d'une synthèse, par élève. */
export interface SyntheseEleve {
  debut: string;
  fin: string;
  bilan: string;
  sections: Partial<Record<Section, string>>;
}

export const TYPE_DOC_SYNTHESE = "synthese";

/** Une donnée du suivi de l'élève, rapportée à une section. */
export interface Indice {
  section: Section;
  texte: string;
  /** 3 réussi, 2 en cours, 1 à consolider ; null pour une observation. */
  niveau: Niveau | null;
  date: string;
  source: string;
}

/**
 * La section dont parle un intitulé : domaine d'un référentiel, matière,
 * domaine d'une progression. Les domaines de maternelle et les matières de
 * l'élémentaire se rangent aux mêmes endroits.
 */
export function sectionDe(texte: string): Section | null {
  const t = normaliser(texte);
  if (!t) return null;
  if (/activites? artistiques|arts? plastiques|arts? visuels|enseignements artistiques|education musicale|univers sonores|spectacle vivant|\bmusique|\bchant|\bdanse/.test(t)) return "arts";
  if (/activites? physiques?|education physique|\beps\b|motricite|natation|savoir nager/.test(t)) return "eps";
  if (/outils mathematiques|mathematiques|\bmaths?\b|nombres?|numeration|calcul|geometrie|grandeurs|formes planes|solides/.test(t)) return "maths";
  if (/se reperer dans le temps|dans l'espace|explorer le monde|monde du vivant|matiere et des objets|questionner le monde|sciences|histoire|geographie|\btemps\b|\bespace\b|vivant/.test(t)) return "monde";
  if (/vivre ensemble|apprendre ensemble|moral et civique|\bemc\b|socialisation|autonomie|comportement|attention|rapport a la tache|regles de vie|competences psychosociales/.test(t)) return "vivre";
  if (/langage|francais|lecture|lire|ecriture|ecrire|graphisme|vocabulaire|phonolog|syntaxe|oral|communication|\bcaa\b|langues? vivantes?|alphabet/.test(t)) return "langage";
  return null;
}

const depuisStatut = (s: string): Niveau | null => (s === "acquise" ? 3 : s === "encours" ? 2 : null);
const depuisMaitrise = (n: number): Niveau => (n <= 1 ? 1 : n === 2 ? 2 : 3);
const jour = (iso: string) => (iso || "").slice(0, 10);

interface Etape { intitule: string; statut: string; date: string }
interface Progression { domaine: string; titre: string; etapes: Etape[] }

/** Les données du suivi d'un élève, rapportées aux sections de la synthèse. */
export function indicesDeLEleve(eleveId: string, sources: {
  competences: CompetenceTravaillee[];
  progressions: Progression[];
  evaluations: Evaluation[];
  notes: NoteEleve[];
  observations: CommentaireEleve[];
}): Indice[] {
  const indices: Indice[] = [];
  for (const c of sources.competences) {
    const niveau = depuisStatut(c.statut);
    if (!niveau) continue;
    indices.push({ section: sectionDe(c.chemin) ?? sectionDe(c.source) ?? sectionDe(c.texte) ?? "autres", texte: c.texte, niveau,
      date: jour(c.date || c.citeeLe), source: "Compétence travaillée" });
  }
  for (const p of sources.progressions) {
    for (const e of p.etapes ?? []) {
      const niveau = depuisStatut(e.statut);
      if (!niveau || !e.intitule?.trim()) continue;
      indices.push({ section: sectionDe(`${p.domaine} ${p.titre}`) ?? sectionDe(e.intitule) ?? "autres", texte: e.intitule.trim(), niveau,
        date: jour(e.date), source: `Progression « ${p.titre || p.domaine || "sans titre"} »` });
    }
  }
  const parEvaluation = new Map(sources.evaluations.map((ev) => [ev.id, ev]));
  for (const n of sources.notes) {
    if (n.eleveId !== eleveId || n.absent || !n.evaluationId) continue;
    const ev = parEvaluation.get(n.evaluationId);
    if (!ev) continue;
    if (ev.mode === "note") {
      if (n.note == null || !ev.bareme) continue;
      const ratio = n.note / ev.bareme;
      indices.push({ section: sectionDe(ev.matiere) ?? sectionDe(ev.titre) ?? "autres", texte: ev.titre,
        niveau: ratio < 0.5 ? 1 : ratio < 0.75 ? 2 : 3, date: jour(ev.date), source: `Évaluation notée « ${ev.titre} »` });
      continue;
    }
    let comps: CompetenceSelectionnee[] = [];
    let niveaux: Record<string, number> = {};
    try { comps = JSON.parse(ev.competencesJson || "[]"); } catch { /* ignoré */ }
    try { niveaux = JSON.parse(n.niveauxJson || "{}"); } catch { /* ignoré */ }
    for (const c of comps) {
      const nv = niveaux[c.id];
      if (!nv) continue;
      indices.push({ section: sectionDe(`${c.domaineTitre} ${c.sousDomaineTitre}`) ?? sectionDe(ev.matiere) ?? "autres",
        texte: c.competenceTitre, niveau: depuisMaitrise(nv), date: jour(ev.date), source: `Évaluation « ${ev.titre} »` });
    }
  }
  for (const o of sources.observations) {
    // La santé ne regarde pas une synthèse des apprentissages.
    if (o.eleveId !== eleveId || o.type === "santé" || !o.texte.trim()) continue;
    const section = o.type === "comportement" ? "vivre" : sectionDe(o.texte) ?? "autres";
    indices.push({ section, texte: o.texte.trim(), niveau: null, date: jour(o.date), source: `Observation (${o.type})` });
  }
  return indices;
}

/** Les données de la période ; celles qui n'ont pas de date restent. */
export const dansLaPeriode = (indices: Indice[], debut: string, fin: string) =>
  indices.filter((i) => !i.date || ((!debut || i.date >= debut) && (!fin || i.date <= fin)));

export interface Comptes { reussites: number; enCours: number; aConsolider: number; observations: number }

export function comptes(indices: Indice[]): Comptes {
  return {
    reussites: indices.filter((i) => i.niveau === 3).length,
    enCours: indices.filter((i) => i.niveau === 2).length,
    aConsolider: indices.filter((i) => i.niveau === 1).length,
    observations: indices.filter((i) => i.niveau === null).length,
  };
}

const fmt = (iso: string) => { const [a, m, j] = iso.split("-"); return a && m && j ? `${j}/${m}/${a}` : ""; };
const minuscule = (t: string) => t.charAt(0).toLocaleLowerCase("fr") + t.slice(1);
const sansPoint = (t: string) => t.replace(/[\s.;]+$/, "");
/** Le plus récent d'abord ; à date égale, le meilleur niveau. */
const recentsDabord = (a: Indice, b: Indice) => b.date.localeCompare(a.date) || (b.niveau ?? 0) - (a.niveau ?? 0);

/** Brouillon d'une section : réussites, acquis en cours, points à consolider, observations. */
export function brouillonDeSection(indices: Indice[]): string {
  const uniques = (liste: Indice[], exclus: Set<string>, max: number) => {
    const vus = new Set(exclus);
    const res: string[] = [];
    for (const i of [...liste].sort(recentsDabord)) {
      const cle = normaliser(sansPoint(i.texte));
      if (vus.has(cle)) continue;
      vus.add(cle);
      res.push(sansPoint(minuscule(i.texte)));
      if (res.length === max) break;
    }
    return res;
  };
  const reussites = uniques(indices.filter((i) => i.niveau === 3), new Set(), 8);
  const dejaDits = new Set(reussites.map(normaliser));
  const enCours = uniques(indices.filter((i) => i.niveau === 2), dejaDits, 6);
  enCours.forEach((t) => dejaDits.add(normaliser(t)));
  const aConsolider = uniques(indices.filter((i) => i.niveau === 1), dejaDits, 4);
  const observations = [...indices.filter((i) => i.niveau === null)].sort(recentsDabord).slice(0, 3)
    .map((i) => `« ${i.texte.length > 220 ? i.texte.slice(0, 217).trimEnd() + "…" : i.texte} »${i.date ? ` (${fmt(i.date)})` : ""}`);
  return [
    reussites.length ? `Réussites : ${reussites.join(" ; ")}.` : "",
    enCours.length ? `En cours d'acquisition : ${enCours.join(" ; ")}.` : "",
    aConsolider.length ? `À consolider : ${aConsolider.join(" ; ")}.` : "",
    observations.length ? `Observations : ${observations.join(" ")}` : "",
  ].filter(Boolean).join("\n");
}

/**
 * La synthèse d'un élève ne nomme pas ses camarades : une observation
 * « joue avec Aurélien » devient « joue avec un camarade ».
 */
export function sansAutresEleves(texte: string, autres: string[]): string {
  return pseudonymiser(texte, autres).texte.replace(/\[P\d+\]/g, "un camarade");
}

/**
 * Remplit les sections vides d'après le suivi de la période — ou, avec
 * `seulement`, la section demandée, même déjà écrite.
 */
export function preRemplirSynthese(synthese: SyntheseEleve, indices: Indice[], autresEleves: string[], seulement?: Section):
  { synthese: SyntheseEleve; remplies: number } {
  const periode = dansLaPeriode(indices, synthese.debut, synthese.fin);
  const sections = { ...synthese.sections };
  let remplies = 0;
  for (const { id } of SECTIONS_SYNTHESE) {
    if (seulement ? id !== seulement : (sections[id] ?? "").trim()) continue;
    const texte = sansAutresEleves(brouillonDeSection(periode.filter((i) => i.section === id)), autresEleves);
    if (!texte && !seulement) continue;
    sections[id] = texte;
    if (texte) remplies++;
  }
  return { synthese: { ...synthese, sections }, remplies };
}
