// Pré-remplissage de la synthèse des acquis de fin de GS à partir du suivi de
// l'élève : compétences travaillées, progressions, évaluations et observations.
//
// Rien n'est inventé ni écrasé. Un item n'est positionné que si une donnée de
// l'élève en parle ; un commentaire n'est écrit que dans un cadre vide ; chaque
// positionnement proposé garde sa source pour que l'enseignant la vérifie.

import type { CommentaireEleve, Evaluation, NoteEleve } from "./api";
import type { CompetenceTravaillee } from "./competencesTravaillees";
import type { CompetenceSelectionnee } from "./components/CompetenceTree";
import { normaliser } from "./competencesTravaillees";
import { pseudonymiser } from "./confidentialite";

export type DomaineGS = "d1" | "d2" | "d3" | "d4" | "d5" | "aeve";
export type NiveauGS = 1 | 2 | 3;

export interface SynItem { id: string; bloc: string | null; label: string }
export interface SynDom { id: string; titre: string; titreObservations: string; items: SynItem[]; enonces: string[] }
export interface SynData {
  positionnements: Record<string, number>;
  observations: Record<string, string>;
  dateVisa?: string;
  /** Positionnements proposés d'après le suivi, avec leur source ; retirés dès que l'enseignant choisit. */
  origines?: Record<string, string>;
}

/** Une donnée du suivi de l'élève, rapportée à un domaine de la synthèse. */
export interface Indice {
  domaine: DomaineGS | null;
  texte: string;
  /** null : une observation, qui nourrit le commentaire sans positionner. */
  niveau: NiveauGS | null;
  date: string;
  source: string;
}

const cherche = (motif: RegExp, texte: string) => motif.test(normaliser(texte));

/**
 * Le domaine de la synthèse dont parle un intitulé (domaine d'un référentiel,
 * matière, domaine d'une progression…). Les domaines de maternelle d'abord,
 * puis les matières de l'élémentaire.
 */
export function domaineGS(texte: string): DomaineGS | null {
  const t = normaliser(texte);
  if (!t) return null;
  if (/activites? artistiques|arts? plastiques|arts? visuels|enseignements artistiques|education musicale|univers sonores|spectacle vivant|\bmusique|\bchant|\bdanse/.test(t)) return "d3";
  if (/activites? physiques?|education physique|\beps\b|motricite globale|\bmotricite\b|natation|savoir nager/.test(t)) return "d2";
  if (/outils mathematiques|mathematiques|\bmaths?\b|nombres?|numeration|calcul|geometrie|grandeurs|formes planes|solides/.test(t)) return "d4";
  if (/se reperer dans le temps|dans l'espace|explorer le monde|monde du vivant|matiere et des objets|questionner le monde|sciences|histoire|geographie|\btemps\b|\bespace\b|vivant|numerique/.test(t)) return "d5";
  if (/vivre ensemble|apprendre ensemble|moral et civique|\bemc\b|socialisation|autonomie|comportement|attention|rapport a la tache|regles de vie|competences psychosociales/.test(t)) return "aeve";
  if (/langage|francais|lecture|lire|ecriture|ecrire|graphisme|vocabulaire|phonolog|syntaxe|oral|communication|\bcaa\b|langues? vivantes?|alphabet/.test(t)) return "d1";
  return null;
}

/** Ce dont parle chaque item de la synthèse, pour y rapporter une donnée. */
export const MOTS_ITEMS: Record<string, RegExp> = {
  "d1.o1": /vocabulaire|\bmots?\b|lexique|corpus|nommer/,
  "d1.o2": /syntaxe|phrases?|articul|s'exprimer|pronoms?|langage structure/,
  "d1.o3": /raconter|recit|expliquer|discours|decrire|evoquer|reformuler/,
  "d1.l1": /phonolog|syllabes?|phonemes?|lettres?|principe alphabetique|rimes?|nom des lettres|son des lettres/,
  "d1.l2": /diversite linguistique|autres? langues?|langues? vivantes?|discriminer|reproduire des sons/,
  "d1.l3": /comprendre (des |un |les )?(textes?|histoires?|recits?|albums?)|lus? par|ecouter une histoire|comprehension/,
  "d1.e1": /geste d'ecriture|ecriture cursive|tracer|graphisme|tenir (son|le) (crayon|stylo)|pince|boucles?/,
  "d1.e2": /premiers ecrits|ecrire (seul|des mots|son prenom)|encoder|dictee a l'adulte|mots transparents|produire (un|des) ecrits?/,
  "d2.p1": /deplac|courir|sauter|lancer|equilibre|s'engager|parcours|grimper|rouler|nager|glisser|motricite/,
  "d2.p2": /cooper|interagir|roles?|jeux collectifs|s'opposer|jeux? (de|a) regles/,
  "d3.a1": /dessin|peinture|composition|productions? plastiques?|chant|comptines?|danse|musique|artistique|modelage|collage|instrument/,
  "d4.qte": /quantites?|denombr|collections?|compter|cardinal|comptine numerique|nombres? jusqu'a/,
  "d4.rang": /\brang\b|position|ordinal|suite ordonnee/,
  "d4.pb": /problemes?|ajout|retrait|partage|decompos|compos|parties?-tout|le tout/,
  "d4.formes": /formes?|solides?|figures?|carre|triangle|rond|cercle|cube|rectangle/,
  "d4.grand": /longueurs?|masses?|grandeurs?|mesur/,
  "d4.motifs": /motifs?|algorithmes?|suites? (repetitive|evolutive)|repetitif/,
  "d5.t1": /\btemps\b|jours?|semaines?|saisons?|chronolog|calendrier|frise|avant|apres|matin|soir/,
  "d5.e1": /espace|situer|orient|\bplan\b|maquette|gauche|droite|dessus|dessous|devant|derriere/,
  "d5.v1": /vivant|animaux|animal|plantes?|vegetal|corps humain|elevage|nature/,
  "d5.m1": /matiere|\beau\b|sable|pate|melange|transform/,
  "d5.o1": /objets?|construi|fabriqu|outils?|montage|technique/,
  "d5.s1": /securite|hygiene|risques?|laver les mains|sante/,
  "d5.n1": /numerique|tablette|ordinateur|robot|ecran/,
};

const depuisStatut = (s: string): NiveauGS | null => (s === "acquise" ? 3 : s === "encours" ? 2 : null);
const depuisMaitrise = (n: number): NiveauGS => (n <= 1 ? 1 : n === 2 ? 2 : 3);
const jour = (iso: string) => (iso || "").slice(0, 10);

interface Etape { intitule: string; statut: string; date: string }
interface Progression { domaine: string; titre: string; etapes: Etape[] }

/** Les données du suivi d'un élève, rapportées aux domaines de la synthèse. */
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
    indices.push({ domaine: domaineGS(c.chemin) ?? domaineGS(c.source) ?? domaineGS(c.texte), texte: c.texte, niveau,
      date: jour(c.date || c.citeeLe), source: "Compétence travaillée" });
  }
  for (const p of sources.progressions) {
    for (const e of p.etapes ?? []) {
      const niveau = depuisStatut(e.statut);
      if (!niveau || !e.intitule?.trim()) continue;
      indices.push({ domaine: domaineGS(`${p.domaine} ${p.titre}`) ?? domaineGS(e.intitule), texte: e.intitule.trim(), niveau,
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
      indices.push({ domaine: domaineGS(ev.matiere) ?? domaineGS(ev.titre), texte: ev.titre,
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
      indices.push({ domaine: domaineGS(`${c.domaineTitre} ${c.sousDomaineTitre}`) ?? domaineGS(ev.matiere), texte: c.competenceTitre,
        niveau: depuisMaitrise(nv), date: jour(ev.date), source: `Évaluation « ${ev.titre} »` });
    }
  }
  for (const o of sources.observations) {
    // La santé ne regarde pas la synthèse des acquis.
    if (o.eleveId !== eleveId || o.type === "santé" || !o.texte.trim()) continue;
    const domaine = o.type === "comportement" ? "aeve" : domaineGS(o.texte);
    indices.push({ domaine, texte: o.texte.trim(), niveau: null, date: jour(o.date), source: "Observation" });
  }
  return indices;
}

const fmt = (iso: string) => { const [a, m, j] = iso.split("-"); return a && m && j ? `${j}/${m}/${a}` : ""; };
const minuscule = (t: string) => t.charAt(0).toLocaleLowerCase("fr") + t.slice(1);
const sansPoint = (t: string) => t.replace(/[\s.;]+$/, "");
/** Le plus récent d'abord ; à date égale, le meilleur niveau. */
const recentsDabord = (a: Indice, b: Indice) => b.date.localeCompare(a.date) || (b.niveau ?? 0) - (a.niveau ?? 0);

/** Brouillon du commentaire d'un domaine : réussites, acquis en cours, observations. */
export function commentaireDuDomaine(indices: Indice[]): string {
  const uniques = (liste: Indice[], exclus: Set<string>, max: number) => {
    const vus = new Set(exclus);
    const res: string[] = [];
    for (const i of [...liste].sort(recentsDabord)) {
      const cle = normaliser(i.texte);
      if (vus.has(cle)) continue;
      vus.add(cle);
      res.push(sansPoint(minuscule(i.texte)));
      if (res.length === max) break;
    }
    return res;
  };
  const reussites = uniques(indices.filter((i) => i.niveau === 3), new Set(), 6);
  const dejaDits = new Set(reussites.map(normaliser));
  const enCours = uniques(indices.filter((i) => i.niveau === 2), dejaDits, 4);
  enCours.forEach((t) => dejaDits.add(normaliser(t)));
  const aConsolider = uniques(indices.filter((i) => i.niveau === 1), dejaDits, 3);
  const observations = [...indices.filter((i) => i.niveau === null)].sort(recentsDabord).slice(0, 2)
    .map((i) => `« ${i.texte.length > 180 ? i.texte.slice(0, 177).trimEnd() + "…" : i.texte} »${i.date ? ` (${fmt(i.date)})` : ""}`);
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
 * Remplit ce qui est vide : positionnements des items dont parle une donnée de
 * l'élève (la plus récente l'emporte), commentaires des domaines sans texte.
 * `autresEleves` : les noms à ne pas laisser dans les commentaires.
 */
export function preRemplir(domaines: SynDom[], data: SynData, indices: Indice[], autresEleves: string[] = []):
  { data: SynData; positionnes: number; commentaires: number } {
  const positionnements = { ...data.positionnements };
  const observations = { ...data.observations };
  const origines = { ...(data.origines ?? {}) };
  let positionnes = 0, commentaires = 0;
  for (const dom of domaines) {
    const duDomaine = indices.filter((i) => i.domaine === dom.id);
    for (const it of dom.items) {
      if (positionnements[it.id] != null) continue;
      const motif = MOTS_ITEMS[it.id];
      const candidat = motif && duDomaine.filter((i) => i.niveau != null && cherche(motif, i.texte)).sort(recentsDabord)[0];
      if (!candidat) continue;
      positionnements[it.id] = candidat.niveau!;
      origines[it.id] = `${candidat.source} — ${candidat.texte}${candidat.date ? ` (${fmt(candidat.date)})` : ""}`;
      positionnes++;
    }
    if (!(observations[dom.id] ?? "").trim()) {
      const texte = sansAutresEleves(commentaireDuDomaine(duDomaine), autresEleves);
      if (texte) { observations[dom.id] = texte; commentaires++; }
    }
  }
  return { data: { ...data, positionnements, observations, origines }, positionnes, commentaires };
}
