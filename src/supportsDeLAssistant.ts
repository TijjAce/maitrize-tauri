// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// ── Les supports de l'Assistant : ce que Fabriquer sait déjà faire ─────────
//
// « Le problème, c'est qu'il faudrait les supports de mes générateurs pour aider à
// réaliser tout ça : l'assistant qui implémente en même temps mes générateurs »
// (l'enseignant, 6 novembre 2026, sur la fiche d'une séquence qui écrivait « fiches
// d'évaluation ; jetons » sans rien fabriquer).
//
// Une séquence toute faite sait déjà, séance par séance, quelles feuilles demander à
// quels ateliers, aux nombres de la classe (feuillesDesSequences.ts). L'Assistant y
// pioche : on lui montre les séquences qui parlent du sujet et leurs feuilles, il
// choisit par numéro, et c'est le générateur qui fabrique. Il ne décrit aucune feuille
// et n'écrit aucun réglage : l'essai du 19 octobre l'a montré, 2 feuilles écrites par
// l'IA sur 20 étaient utilisables ; il comprend, il choisit, le code fabrique. Chaque
// feuille se rouvre dans Fabriquer, comme celles d'une séquence toute faite.
//
// Les autres ateliers, qu'on ne sait pas régler pour lui, il peut les nommer : un
// bouton les ouvre.

import { api, type MaterielItem, type Seance } from "./api";
import { FAMILLES, nomDeLAtelier } from "./catalogueAteliers";
import { normaliser } from "./competencesTravaillees";
import type { CompetenceSelectionnee } from "./components/CompetenceTree";
import { demarcheDe, type Demarche } from "./demarches";
import { poserDansUneSeance } from "./impressionAtelier";
import { estUneSection, feuillesEnPictos } from "./sequencesDeMaternelle";
import { graineDeLaFeuille } from "./sequenceSoustractionPosee";
import { competenceDeLaDemarche, planToutFait, sequencesToutesFaites, type ClasseDuDossier, type SequenceToutefaite } from "./sequencesToutesFaites";

/** Ce qu'il faut pour refaire une feuille : la séquence qui la prévoit, sa classe, sa période, et son rang dans le plan. */
export interface ReferenceDeFeuille { demarcheId: string; classe: ClasseDuDossier; periode: number; rang: number; atelier: string; titre: string }
export interface FeuilleProposee extends ReferenceDeFeuille { ref: string; sequence: string; seance: number }
export interface AtelierPropose { id: string; nom: string; quoi: string }
export interface SupportsDuSujet { sequences: SequenceToutefaite[]; feuilles: FeuilleProposee[]; ateliers: AtelierPropose[] }

export const AUCUN_SUPPORT: SupportsDuSujet = { sequences: [], feuilles: [], ateliers: [] };

const SEQUENCES_MAX = 4;
const FEUILLES_MAX = 40;
const FEUILLES_PAR_SEQUENCE = 14;
const ATELIERS_MAX = 10;

/** La classe qu'une phrase nomme, comme les dossiers de Fabriquer : « des CP », « en grande section ». */
export function classeDuNiveau(texte: string | null | undefined): ClasseDuDossier | null {
  const t = normaliser(texte ?? "");
  const m = /\b(ps|ms|gs|cp|ce1|ce2|cm1|cm2)\b/.exec(t);
  if (m) return m[1].toUpperCase() as ClasseDuDossier;
  if (/\bpetite section\b/.test(t)) return "PS" as ClasseDuDossier;
  if (/\bmoyenne section\b/.test(t)) return "MS" as ClasseDuDossier;
  if (/\bgrande section\b/.test(t)) return "GS" as ClasseDuDossier;
  return null;
}

const MOTS_VIDES = new Set([
  "pour", "avec", "dans", "sans", "sur", "les", "des", "une", "aux", "leur", "leurs", "qui", "que", "est", "ils", "elles", "sauront", "savoir", "faire", "eleve", "eleves",
  "seance", "seances", "sequence", "sequences", "travailler", "apprendre", "jusqu", "plus", "moins", "tout", "tous", "cette", "comme", "bien", "deja", "alors", "oui", "non",
  "niveau", "classe", "matiere", "maths", "mathematiques", "francais", "voudrais", "veux", "faut", "besoin",
]);

/** Les mots qui disent le sujet ; leur début suffit : décomposer, décompositions. */
function motsDuSujet(texte: string): string[] {
  const mots = normaliser(texte).replace(/[^\p{L}\p{N} ]/gu, " ").split(" ").filter((m) => m.length >= 4 && !MOTS_VIDES.has(m));
  return [...new Set(mots.map((m) => m.slice(0, 6)))];
}

const compte = (mots: string[], texte: string) => {
  const t = normaliser(texte);
  return mots.reduce((n, m) => n + (t.includes(m) ? 1 : 0), 0);
};

function scoreDeLaSequence(s: SequenceToutefaite, mots: string[]): number {
  const d = s.demarche;
  return 3 * compte(mots, d.nom) + 2 * compte(mots, d.resume) + d.seances.reduce((n, x) => n + 2 * compte(mots, x.titre) + compte(mots, x.objectifs), 0) / Math.max(1, d.seances.length) * 2;
}

/**
 * Les dossiers où chercher, d'après la matière dite : `null` si elle n'est pas dite. Une matière sans dossier — l'EPS, les
 * arts — n'a pas de séquence toute faite : mieux vaut rien qu'une dictée qui parlerait de ballon.
 */
function filtreDeLaMatiere(matiere: string | undefined): RegExp | "aucun" | null {
  const m = normaliser(matiere ?? "");
  if (!m || m === "a choisir") return null;
  if (/math|calcul|nombre|geometr|grandeur|structurer sa pensee|outils/.test(m)) return /math/i;
  if (/francais|lecture|lire|ecri|grammaire|orthographe|conjugaison|vocabulaire|langage|oral/.test(m)) return /fran|langage/i;
  if (/histoire|geographie|questionner|temps|espace/.test(m)) return /histoire|temps/i;
  if (/monde|vivant|matiere|objets/.test(m)) return /vivant|temps/i;
  return "aucun";
}

const cycleDeLaClasse = (c: ClasseDuDossier): number => (estUneSection(c) ? 1 : c === "CM1" || c === "CM2" ? 3 : 2);

/** « Cycles 1 et 2 », « De la maternelle au CM2 », « Le calcul — CM1, CM2 », rien : ce que la carte de l'atelier dit de ses classes. */
function atelierDeCeCycle(a: { cycles?: string; nom: string }, cycle: number): boolean {
  const t = `${a.cycles ?? ""} ${a.nom}`;
  if (/maternelle au cm2/i.test(t)) return true;
  const cycles = new Set<number>();
  if (/\bcm[12]\b/i.test(t)) cycles.add(3);
  if (/\bce[12]\b|\bcp\b/i.test(t)) cycles.add(2);
  if (/maternelle|\b[pmg]s\b/i.test(t)) cycles.add(1);
  for (const m of t.matchAll(/cycles?\s+((?:\d(?:\s*(?:,|et|à)\s*)?)+)/gi)) for (const d of m[1].matchAll(/\d/g)) cycles.add(Number(d[0]));
  return !cycles.size || cycles.has(cycle);
}

/**
 * Ce que Fabriquer sait faire sur ce sujet, à cette classe : les séquences toutes faites qui en parlent, leurs feuilles
 * numérotées, et les ateliers dont le nom ou la carte en parlent. Rien sans la classe et le sujet : on ne propose pas au hasard.
 * `deja` : les feuilles qu'une fiche a déjà prises, gardées en tête de liste quand on la retouche.
 */
export function supportsDuSujet(o: { classe: ClasseDuDossier | null; matiere?: string; texte: string; periode: number; deja?: ReferenceDeFeuille[] }): SupportsDuSujet {
  const deja = o.deja ?? [];
  const mots = motsDuSujet(o.texte);
  if ((!o.classe || !mots.length) && !deja.length) return AUCUN_SUPPORT;
  const filtre = filtreDeLaMatiere(o.matiere);
  const sequences = !o.classe || filtre === "aucun" ? [] : sequencesToutesFaites()
    .filter((s) => s.classe === o.classe && (!filtre || filtre.test(s.domaine.discipline)))
    .map((s) => ({ s, score: scoreDeLaSequence(s, mots) }))
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, SEQUENCES_MAX)
    .map((x) => x.s);

  const vues = new Set<string>();
  const feuilles: FeuilleProposee[] = [];
  const ajouter = (r: ReferenceDeFeuille, sequence: string, seance: number) => {
    const cle = `${r.atelier}|${normaliser(r.titre)}`;
    if (vues.has(cle) || feuilles.length >= FEUILLES_MAX) return;
    vues.add(cle);
    feuilles.push({ ...r, ref: `F${feuilles.length + 1}`, sequence, seance });
  };
  for (const r of deja) ajouter(r, demarcheDe(r.demarcheId)?.nom ?? "", 0);
  for (const s of sequences) {
    let plan: ReturnType<typeof planToutFait>["plan"] | null = null;
    // Pour les nommer, pas besoin de leurs images : les feuilles de maternelle en pictogrammes les chargeront en se fabriquant.
    try { plan = planToutFait(s.demarche, s.classe, o.periode, { calculMental: false, images: {} }).plan; } catch { /* pas de feuilles à proposer */ }
    (plan?.feuilles ?? []).slice(0, FEUILLES_PAR_SEQUENCE).forEach((f, rang) => {
      ajouter({ demarcheId: s.demarche.id, classe: s.classe, periode: o.periode, rang, atelier: f.atelier, titre: f.titre }, s.demarche.nom, f.seance);
    });
  }

  const cycle = o.classe ? cycleDeLaClasse(o.classe) : 0;
  const ateliers = !mots.length ? [] : FAMILLES.flatMap((f) => f.outils)
    .filter((a) => !a.sequence && !a.dossier && !a.dansSonDossier && a.id !== "perso" && (!cycle || atelierDeCeCycle(a, cycle)))
    .map((a) => ({ a, score: 2 * compte(mots, a.nom) + compte(mots, a.quoi) }))
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, ATELIERS_MAX)
    .map(({ a }) => ({ id: a.id, nom: `${a.icone} ${a.nom}`, quoi: a.quoi }));
  return { sequences, feuilles, ateliers };
}

/** Ce qu'on montre au modèle : des noms et des numéros ; il n'a pas à savoir comment une feuille se fabrique. */
export function blocDesSupports(s: SupportsDuSujet, avecLesSeances = true): string {
  return [
    s.sequences.length && avecLesSeances && `Les séquences toutes faites de l'application qui parlent de ce sujet, d'après leurs sources :\n${s.sequences.map((x) => {
      const d: Demarche = x.demarche;
      return `- « ${d.nom} » (${d.source}) : ${d.resume}\n${d.seances.map((c, i) => `  ${i + 1}. ${c.titre} : ${c.objectifs}`).join("\n")}`;
    }).join("\n")}`,
    s.sequences.length && !avecLesSeances && `Les séquences toutes faites de l'application qui parlent de ce sujet :\n${s.sequences.map((x) => `- « ${x.demarche.nom} » : ${x.demarche.resume}`).join("\n")}`,
    s.feuilles.length && `Les feuilles que l'application sait fabriquer :\n${s.feuilles.map((f) => `- ${f.ref} : ${f.titre} (atelier ${nomDeLAtelier(f.atelier)}${f.sequence ? `, séquence « ${f.sequence} »${f.seance ? `, pour sa séance ${f.seance + 1}` : ""}` : ""})`).join("\n")}`,
    s.ateliers.length && `D'autres ateliers de l'application, que l'enseignant règle lui-même :\n${s.ateliers.map((a) => `- ${a.id} : ${a.nom}, ${a.quoi}`).join("\n")}`,
  ].filter(Boolean).join("\n\n");
}

/** Le plan de la séquence d'une feuille, comme l'aperçu d'une séquence toute faite ; en maternelle, avec les images de la banque. */
async function planDeLaReference(r: ReferenceDeFeuille) {
  const demarche = demarcheDe(r.demarcheId);
  if (!demarche) return null;
  let images: Record<string, string> | undefined;
  if (estUneSection(r.classe)) {
    const enPictos = feuillesEnPictos(r.demarcheId, r.classe, "");
    if (enPictos) images = await (await import("./components/ChoixPicto")).chargerImages(enPictos.ids).catch(() => ({}));
  }
  return planToutFait(demarche, r.classe, r.periode, { calculMental: false, images }).plan;
}

export interface FeuilleFabriquee { atelier: string; titre: string; html: string; style: string; refaire?: Record<string, unknown>; graine: number }

/** Le générateur fabrique la feuille. Le plan peut avoir changé d'une version à l'autre : c'est le titre qui la retrouve. */
export async function fabriquerLaFeuille(r: ReferenceDeFeuille, graine: number): Promise<FeuilleFabriquee> {
  const plan = await planDeLaReference(r);
  const f = plan?.feuilles[r.rang]?.titre === r.titre ? plan.feuilles[r.rang] : plan?.feuilles.find((x) => x.titre === r.titre);
  if (!f) throw new Error(`« ${r.titre} » n'existe plus dans sa séquence.`);
  const tirage = graineDeLaFeuille(graine, r.rang);
  const sortie = f.fabriquer(tirage);
  return { atelier: f.atelier, titre: f.titre, html: sortie.html, style: sortie.style, refaire: sortie.refaire, graine: sortie.graine ?? tirage };
}

/** La compétence que vise la première feuille de la fiche : celle de sa séquence toute faite. */
export async function competenceDesFeuilles(references: ReferenceDeFeuille[]): Promise<CompetenceSelectionnee | null> {
  const r = references[0];
  if (!r) return null;
  return competenceDeLaDemarche(await api.referentielsList().catch(() => []), r.demarcheId, r.classe, r.periode);
}

/** Les feuilles des séances, fabriquées et rangées comme celles d'une séquence toute faite : elles se rouvrent dans Fabriquer. */
export async function poserLesFeuilles(o: {
  parSeance: ReferenceDeFeuille[][]; seances: Seance[]; sequenceId: string; graine: number; competence: CompetenceSelectionnee | null;
  surProgres?: (fait: number, total: number) => void; surEchec?: (titre: string, e: unknown) => void;
}): Promise<{ posees: MaterielItem[] }> {
  const total = o.parSeance.reduce((n, l) => n + l.length, 0);
  const posees: MaterielItem[] = [];
  let fait = 0;
  for (const [i, liste] of o.parSeance.entries()) {
    const seance = o.seances[i];
    if (!seance) continue;
    for (const r of liste) {
      o.surProgres?.(++fait, total);
      try {
        const f = await fabriquerLaFeuille(r, o.graine);
        posees.push(await poserDansUneSeance(f.atelier, f.titre, f.html, f.style, seance.id, o.sequenceId, {
          competences: o.competence ? [o.competence] : undefined, fabrication: { memoires: f.refaire, graine: f.graine },
        }));
      } catch (e) { o.surEchec?.(r.titre, e); }
    }
  }
  return { posees };
}
