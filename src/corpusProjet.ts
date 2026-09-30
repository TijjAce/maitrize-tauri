// ── Le corpus d'un projet, et le projet du moment ─────────────────────────
//
// Un projet de classe a ses mots et ses phrases : ceux de la soupe, du marché
// de Noël, de la sortie à la ferme. L'enseignant les écrit une fois, sur la
// fiche du projet ; les ateliers de Fabriquer s'en servent d'eux-mêmes tant
// que le projet est en cours — posé sur la semaine ou sur le mois où l'on
// est. Les mots mêlés cachent ces mots-là, les phrases en désordre découpent
// ces phrases-là, le loto cherche leurs images : plus rien à recopier
// d'atelier en atelier.

import type { ProjetClasse } from "./api";
import { anneeDe, isoJour, lundiDe } from "./dates";
import { MOIS, etatDeduit, lireEtapes, moisCourant } from "./projets";

export interface Corpus { mots: string[]; phrases: string[] }

/** Les lignes d'un corpus saisi : une entrée par ligne, sans vide ni doublon. */
export function lignesDuCorpus(texte: string): string[] {
  const vues = new Set<string>();
  return (texte ?? "").split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter((l) => {
    const cle = l.toLocaleLowerCase("fr");
    if (!cle || vues.has(cle)) return false;
    vues.add(cle);
    return true;
  });
}

/** Le texte qu'on écrit dans un atelier à partir d'une liste : une entrée par ligne. */
export const texteDuCorpus = (lignes: string[]) => lignes.join("\n");

/** Le corpus d'un projet, relu ; celui d'aucun projet est vide. */
export function corpusDe(p: ProjetClasse | null | undefined): Corpus {
  return { mots: lignesDuCorpus(p?.mots ?? ""), phrases: lignesDuCorpus(p?.phrases ?? "") };
}

export function aUnCorpus(p: ProjetClasse): boolean {
  const c = corpusDe(p);
  return c.mots.length + c.phrases.length > 0;
}

/** « 18 mots · 6 phrases », ou ce qui manque. */
export function resumeDuCorpus(c: Corpus): string {
  const parts = [
    c.mots.length ? `${c.mots.length} mot${c.mots.length > 1 ? "s" : ""}` : "",
    c.phrases.length ? `${c.phrases.length} phrase${c.phrases.length > 1 ? "s" : ""}` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "pas encore de corpus";
}

/** Un projet de cette année scolaire — ou d'aucune, comme les anciens. */
const deLAnnee = (p: ProjetClasse, quand: Date) => !p.annee || p.annee === anneeDe(isoJour(quand));

/**
 * Vrai si le projet est posé sur le moment donné : sur la semaine où l'on
 * est, ou sur le mois quand il tient tout le mois.
 */
export function estDuMoment(p: ProjetClasse, quand: Date): boolean {
  if (p.semaine) return p.semaine === isoJour(lundiDe(quand));
  return p.mois === moisCourant(quand);
}

const termine = (p: ProjetClasse) => etatDeduit(p.etat, lireEtapes(p.etapesJson)) === "fait";

/**
 * Les projets du moment : ceux posés sur la semaine d'abord, puis ceux du
 * mois ; parmi eux, ceux qui se mènent encore avant ceux qu'on a terminés.
 */
export function projetsDuMoment(projets: ProjetClasse[], quand = new Date()): ProjetClasse[] {
  return projets
    .filter((p) => deLAnnee(p, quand) && estDuMoment(p, quand))
    .sort((a, b) => Number(Boolean(b.semaine)) - Number(Boolean(a.semaine)) || Number(termine(a)) - Number(termine(b)));
}

/** Le projet que Fabriquer retient de lui-même : le premier du moment qui a un corpus, sinon le premier. */
export function projetParDefaut(projets: ProjetClasse[], quand = new Date()): ProjetClasse | null {
  const du = projetsDuMoment(projets, quand);
  return du.find(aUnCorpus) ?? du[0] ?? null;
}

/** Un projet qu'on peut désigner dans un atelier, et s'il est du moment. */
export interface ChoixProjet { projet: ProjetClasse; duMoment: boolean }

/** Les projets de l'année, ceux du moment en tête, puis dans l'ordre de l'année scolaire. */
export function choixDeProjets(projets: ProjetClasse[], quand = new Date()): ChoixProjet[] {
  const duMoment = new Set(projetsDuMoment(projets, quand).map((p) => p.id));
  const rang = (p: ProjetClasse) => {
    const i = MOIS.findIndex((m) => m.num === p.mois);
    return i < 0 ? MOIS.length : i;
  };
  return projets
    .filter((p) => deLAnnee(p, quand))
    .map((projet) => ({ projet, duMoment: duMoment.has(projet.id) }))
    .sort((a, b) => Number(b.duMoment) - Number(a.duMoment)
      || rang(a.projet) - rang(b.projet)
      || a.projet.semaine.localeCompare(b.projet.semaine));
}

/**
 * Vrai si ce texte est de la main de l'enseignant : ni vide, ni la liste
 * d'exemple de l'atelier, ni le corpus d'un projet.
 *
 * C'est la règle qui permet aux ateliers de suivre le projet sans rien
 * abîmer : ce que l'enseignant a écrit lui-même ne se remplace jamais ; le
 * reste — l'exemple, ou le corpus du projet précédent — se remplace sans
 * demander quand le projet change.
 */
export function ecritALaMain(texte: string, exemple: string, corpus: string[][]): boolean {
  const mien = texteDuCorpus(lignesDuCorpus(texte));
  if (!mien) return false;
  if (mien === texteDuCorpus(lignesDuCorpus(exemple))) return false;
  return !corpus.some((c) => texteDuCorpus(c) === mien);
}
