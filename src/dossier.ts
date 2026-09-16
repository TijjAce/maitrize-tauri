// Rassemble ce qui est connu d'un élève, éparpillé dans huit écrans.
//
// L'application enregistre les informations là où elles se saisissent :
// observations d'un côté, notes d'un autre, GEVA-Sco, PPI, évaluations
// diagnostiques, progressions, papiers. Chacun de ces écrans répond à une
// question précise. Aucun ne répond à « où en est cet élève ? ».
//
// Ce fichier ne stocke rien de nouveau : il relit ce qui existe et le met en
// regard. Ce qui manque compte autant que ce qui est là — un dossier sans
// axe de travail, ou dont le PPI date de l'an dernier, se voit ici.

import { CommentaireEleve, DocumentEleve, Eleve, NoteEleve, Evaluation,
         PapierEleve, ProgressionEleve, TYPE_AXE } from "./api";

/** Un document du dossier, présent ou attendu. */
export interface Piece {
  typeDoc: string;
  label: string;
  /** Onglet où le remplir, pour y renvoyer d'un clic. */
  onglet: string;
  rempli: boolean;
  dateMaj?: string;
}

/**
 * Les pièces qu'on s'attend à trouver, selon le contexte d'exercice.
 *
 * En IME s'ajoutent le GEVA-Sco, le PPI et le projet pédagogique, qui n'ont
 * pas cours en classe ordinaire ; les annoncer partout ferait paraître tous
 * les dossiers incomplets.
 */
export function piecesAttendues(ime: boolean): { typeDoc: string; label: string; onglet: string }[] {
  const communes = [
    { typeDoc: "evaldiag:observation", label: "Observation générale", onglet: "evaluations" },
    { typeDoc: "evaldiag:besoins", label: "Observation S4C", onglet: "evaluations" },
    { typeDoc: "progressions", label: "Progressions", onglet: "progressions" },
    { typeDoc: "syntheseGS", label: "Synthèse des acquis GS", onglet: "synthese" },
  ];
  const imeSeules = [
    { typeDoc: "ppi", label: "PPI", onglet: "dispositifs" },
    { typeDoc: "gevasco", label: "GEVA-Sco", onglet: "gevasco" },
    { typeDoc: "projetPedagogique", label: "Projet pédagogique", onglet: "dispositifs" },
  ];
  return ime ? [... imeSeules, ...communes] : communes;
}

/**
 * Un document n'est « rempli » que s'il contient quelque chose.
 *
 * Ouvrir un écran suffit à créer la ligne en base ; compter cette ligne comme
 * un document fait dirait qu'un dossier est complet alors qu'il est vide.
 */
export function documentRempli(donnees: string | undefined): boolean {
  if (!donnees) return false;
  try {
    const v = JSON.parse(donnees);
    if (v == null) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "object") return Object.values(v).some(nonVide);
    return nonVide(v);
  } catch {
    return donnees.trim().length > 0;
  }
}

function nonVide(v: unknown): boolean {
  if (v == null || v === false) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.values(v as object).some(nonVide);
  return true;
}

export function pieces(attendues: ReturnType<typeof piecesAttendues>, docs: DocumentEleve[]): Piece[] {
  const parType = new Map(docs.map((d) => [d.typeDoc, d]));
  return attendues.map((a) => {
    const d = parType.get(a.typeDoc);
    return { ...a, rempli: documentRempli(d?.donnees), dateMaj: d?.dateMaj };
  });
}

// ── Observations ───────────────────────────────────────────────────────────

export interface Observations {
  axes: CommentaireEleve[];
  parType: { type: string; items: CommentaireEleve[] }[];
  total: number;
}

/**
 * Sépare les axes de travail du reste.
 *
 * Un axe n'est pas un constat mais une intention : c'est ce qu'on relit avant
 * une séance, et ce qui manque quand un dossier n'est qu'une collection de
 * remarques. Il mérite donc d'être à part, pas noyé dans la liste.
 */
export function observations(commentaires: CommentaireEleve[]): Observations {
  const tries = [...commentaires].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  const axes = tries.filter((c) => c.type === TYPE_AXE);
  const groupes = new Map<string, CommentaireEleve[]>();
  for (const c of tries) {
    if (c.type === TYPE_AXE) continue;
    const t = c.type || "divers";
    groupes.set(t, [...(groupes.get(t) ?? []), c]);
  }
  return {
    axes,
    parType: [...groupes.entries()]
      .map(([type, items]) => ({ type, items }))
      .sort((a, b) => b.items.length - a.items.length),
    total: tries.length,
  };
}

// ── Évaluations ────────────────────────────────────────────────────────────

export interface LigneNote {
  evaluation: Evaluation;
  note: NoteEleve;
  /** Note ramenée sur 20, quand un barème le permet. */
  sur20?: number;
}

/**
 * Les notes de l'élève, la plus récente d'abord.
 *
 * On ne calcule pas de moyenne générale : mêler une dictée sur 10 et un
 * contrôle sur 100 produirait un chiffre qui ne veut rien dire. Le ramené
 * sur 20 sert seulement à comparer deux évaluations entre elles.
 */
export function notes(toutes: NoteEleve[], evaluations: Evaluation[], eleveId: string): LigneNote[] {
  const parId = new Map(evaluations.map((e) => [e.id, e]));
  return toutes
    .filter((n) => n.eleveId === eleveId && !n.absent && n.note != null)
    .flatMap((n) => {
      const evaluation = n.evaluationId ? parId.get(n.evaluationId) : undefined;
      if (!evaluation) return [];
      const bareme = Number(evaluation.bareme) || 0;
      return [{
        evaluation,
        note: n,
        sur20: bareme > 0 ? Math.round((n.note! / bareme) * 20 * 10) / 10 : undefined,
      }];
    })
    .sort((a, b) => (b.evaluation.date ?? "").localeCompare(a.evaluation.date ?? ""));
}

// ── Vue d'ensemble ─────────────────────────────────────────────────────────

export interface Dossier {
  eleve: Eleve;
  age?: number;
  observations: Observations;
  notes: LigneNote[];
  pieces: Piece[];
  papiers: PapierEleve[];
  progressions: { faites: number; total: number };
  /** Ce qui mérite un coup d'œil : pièces vides, absence d'axe. */
  manques: string[];
}

/** Âge en années à partir d'une date ISO, ou rien si elle est absente. */
export function age(dateNaissance: string, aujourdhui = new Date()): number | undefined {
  if (!dateNaissance) return undefined;
  const d = new Date(dateNaissance);
  if (Number.isNaN(d.getTime())) return undefined;
  let a = aujourdhui.getFullYear() - d.getFullYear();
  const m = aujourdhui.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && aujourdhui.getDate() < d.getDate())) a--;
  return a >= 0 && a < 130 ? a : undefined;
}

/** « 9 ans », « 1 an ». */
export const libelleAge = (ans: number) => `${ans} an${ans > 1 ? "s" : ""}`;

export function construire(
  eleve: Eleve,
  commentaires: CommentaireEleve[],
  toutesNotes: NoteEleve[],
  evaluations: Evaluation[],
  docs: DocumentEleve[],
  papiers: PapierEleve[],
  progressions: ProgressionEleve[],
  ime: boolean,
): Dossier {
  const obs = observations(commentaires.filter((c) => c.eleveId === eleve.id));
  const p = pieces(piecesAttendues(ime), docs.filter((d) => d.eleveId === eleve.id));
  const miennes = progressions.filter((x) => x.eleveId === eleve.id);

  const manques: string[] = [];
  if (!obs.axes.length) manques.push("Aucun axe de travail n'est posé.");
  const vides = p.filter((x) => !x.rempli);
  if (vides.length) manques.push(`À remplir : ${vides.map((x) => x.label).join(", ")}.`);
  if (!obs.total) manques.push("Aucune observation enregistrée.");

  return {
    eleve,
    age: age(eleve.dateNaissance),
    observations: obs,
    notes: notes(toutesNotes, evaluations, eleve.id),
    pieces: p,
    papiers: papiers.filter((x) => x.eleveId === eleve.id),
    progressions: { faites: miennes.filter((x) => x.fait).length, total: miennes.length },
    manques,
  };
}
