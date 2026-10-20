// Le reste du travail, dans le dossier « Maitrize », à côté du plan de travail.
//
// L'enseignant veut tout son travail dans un dossier sur le Bureau, lisible
// sans l'application (demande d'octobre 2026) — les élèves compris, en
// sachant que le Bureau part dans iCloud. Ce module dresse la liste des
// fichiers de ces parties ; copie_bureau.rs les écrit, sans rien détruire.
//
// - « Élèves » : un dossier par élève, son dossier complet (celui de l'export
//   de fin d'année), sa photo et ses papiers.
// - « Organisation » : emploi du temps, progressions (la classe puis les
//   niveaux, période par période), programmations.
// - « Cahier journal » : une page par semaine, rangée par année scolaire.
// - « Ressources » : les documents du coffre.
//
// Une page ne se refait que si ce qu'elle montre a changé : son empreinte
// vient de ses données, pas de sa mise en page.

import {
  couleurHex, couleurPourMatiere, MATIERES, matiereDuDomaine, type CommentaireEleve, type Creneau, type DocumentCoffre,
  type DocumentEleve, type EdtTypique, type Eleve, type Evaluation, type NoteEleve, type ObservationEleve, type PapierEleve,
  type ProgrammationFinale, type ProgressionAnnuelle, type ProgressionEleve, type Seance,
} from "./api";
import { documentImprimable } from "./print";
import { empreinte, extensionDe, Noms, nomSur, sansExtension, type FichierCopie, type PlanDeCopie } from "./copieBureau";
import { corpsDeLExport, STYLE_EXPORT } from "./dossierHtml";
import {
  anneeScolaireDe, creneauRempli, htmlEmploiDuTemps, htmlPeriode, htmlProgrammation, htmlSemaineDuJournal, lundiDe,
  type LigneProgrammation, type TableauDePeriode,
} from "./organisationHtml";
import { lireEtat } from "./progressionAnnuelle";
import { htmlParEleve, lire as lireProgrammationIme } from "./programmationIme";
import type { SlotEdt } from "./organisation";

/** Change quand la mise en page des pages change : elles sont alors toutes réécrites. */
const VERSION = "1";

export const PARTIE_ELEVES = "Élèves";
export const PARTIE_ORGANISATION = "Organisation";
export const PARTIE_JOURNAL = "Cahier journal";
export const PARTIE_RESSOURCES = "Ressources";

export interface DonneesTravail {
  eleves: Eleve[];
  commentaires: CommentaireEleve[];
  notes: NoteEleve[];
  evaluations: Evaluation[];
  documents: DocumentEleve[];
  papiers: PapierEleve[];
  progressionsEleve: ProgressionEleve[];
  observations: ObservationEleve[];
  creneaux: Creneau[];
  seances: Seance[];
  edts: EdtTypique[];
  progressions: ProgressionAnnuelle[];
  programmations: ProgrammationFinale[];
  coffre: DocumentCoffre[];
}

const liste = <T>(json: string | null | undefined): T[] => {
  try { const v = JSON.parse(json || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
};

/** La couleur d'une colonne de progression : celle de sa matière, de son domaine, sinon la sienne. */
const teinteDe = (c: { titre: string; couleur: string }) =>
  couleurHex[MATIERES.includes(c.titre) || matiereDuDomaine(c.titre) ? couleurPourMatiere(c.titre) : c.couleur] ?? couleurHex.blue;

/** Les fichiers des élèves, de l'organisation, du cahier journal et des ressources. */
export function planDuTravail(d: DonneesTravail): PlanDeCopie {
  const fichiers: FichierCopie[] = [];
  const dossiers = new Set<string>();
  const noms = new Noms();
  const page = (dossier: string, nom: string, cle: string, titre: string, corps: () => string, style = "") => {
    dossiers.add(dossier);
    fichiers.push({
      chemin: noms.reserver(dossier, nomSur(nom), ".html"),
      empreinte: empreinte(`${VERSION}|${cle}`),
      source: { genre: "contenu", creer: () => documentImprimable(titre, corps(), style) },
    });
  };
  const fichier = (dossier: string, nom: string, stocke: string) => {
    const ext = extensionDe(stocke);
    dossiers.add(dossier);
    fichiers.push({ chemin: noms.reserver(dossier, nomSur(sansExtension(nom, ext)), ext), empreinte: stocke, source: { genre: "fichier", nom: stocke } });
  };

  // ── Élèves : un dossier chacun ──
  const parNom = [...d.eleves].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  for (const e of parNom) {
    const dossier = noms.reserver(PARTIE_ELEVES, nomSur(e.nom, "Élève"), "");
    const siens = {
      commentaires: d.commentaires.filter((c) => c.eleveId === e.id),
      notes: d.notes.filter((n) => n.eleveId === e.id),
      docs: d.documents.filter((x) => x.eleveId === e.id),
      papiers: d.papiers.filter((p) => p.eleveId === e.id),
      progressions: d.progressionsEleve.filter((p) => p.eleveId === e.id),
      observations: d.observations.filter((o) => o.eleveId === e.id),
    };
    const evaluations = d.evaluations.filter((ev) => siens.notes.some((n) => n.evaluationId === ev.id));
    page(dossier, "Dossier", JSON.stringify(["eleve", e, siens, evaluations]), `Dossier — ${e.nom}`,
      () => corpsDeLExport(e, { ...siens, evaluations }), STYLE_EXPORT);
    if (e.photoFichier) fichier(dossier, "Photo", e.photoFichier);
    for (const p of siens.papiers) if (p.nomFichier) fichier(`${dossier}/Papiers`, p.intitule || "Papier", p.nomFichier);
  }

  // ── Organisation ──
  for (const edt of d.edts) {
    const slots = liste<SlotEdt>(edt.slotsJson);
    // « IME:… » : les emplois du temps d'avant la fusion, vides.
    if (!slots.length || edt.annee.startsWith("IME:")) continue;
    page(PARTIE_ORGANISATION, `Emploi du temps ${edt.annee}`, `edt|${edt.annee}|${edt.slotsJson}`,
      `Emploi du temps ${edt.annee}`, () => htmlEmploiDuTemps(edt.annee, slots));
  }
  const periodes = new Map<string, ProgressionAnnuelle[]>();
  for (const p of d.progressions) {
    const e = lireEtat(p);
    if (!e.colonnes.length) continue;
    const cle = `${p.annee}|${p.periode}`;
    periodes.set(cle, [...(periodes.get(cle) ?? []), p]);
  }
  for (const [cle, progs] of [...periodes].sort(([a], [b]) => a.localeCompare(b))) {
    const [annee, periode] = cle.split("|");
    // La classe d'abord, puis les niveaux dans l'ordre où on les a écrits.
    const ranges = [...progs].sort((a, b) => (a.niveau ? 1 : 0) - (b.niveau ? 1 : 0) || a.niveau.localeCompare(b.niveau, "fr"));
    const tableaux: TableauDePeriode[] = ranges.map((p) => {
      const e = lireEtat(p);
      return { niveau: p.niveau ?? "", colonnes: e.colonnes.map((c) => ({ ...c, teinte: teinteDe(c) })), cellules: e.cellules };
    });
    page(`${PARTIE_ORGANISATION}/Progression ${annee}`, `Période ${periode}`,
      `progression|${cle}|${JSON.stringify(ranges.map((p) => [p.niveau, p.colonnesJson, p.cellulesJson]))}`,
      `Progression ${annee} P${periode}`, () => htmlPeriode(annee, Number(periode), tableaux));
  }
  for (const p of d.programmations) {
    if (p.estImportee) continue; // celles des collègues ne sont pas le travail de l'enseignant
    if (p.niveau === "ime") {
      const prog = lireProgrammationIme(p.lignesJson);
      if (!prog.objectifs.length) continue;
      const eleves = parNom.map((e) => ({ id: e.id, nom: e.nom }));
      page(PARTIE_ORGANISATION, `Programmation par élève ${p.annee}`, `ime|${p.annee}|${p.lignesJson}|${JSON.stringify(eleves)}`,
        `Programmation par élève ${p.annee}`, () => htmlParEleve(p.annee, prog, eleves));
    } else {
      const lignes = liste<LigneProgrammation>(p.lignesJson);
      if (!lignes.length) continue;
      page(PARTIE_ORGANISATION, `Programmation ${p.annee}`, `programmation|${p.annee}|${p.lignesJson}`,
        `Programmation ${p.annee}`, () => htmlProgrammation(p.annee, lignes));
    }
  }

  // ── Cahier journal : une page par semaine ──
  const titres = new Map(d.seances.map((s) => [s.id, s.titre]));
  const semaines = new Map<string, Creneau[]>();
  for (const c of d.creneaux) {
    if (!creneauRempli(c)) continue;
    const lundi = lundiDe(c.date);
    semaines.set(lundi, [...(semaines.get(lundi) ?? []), c]);
  }
  for (const [lundi, creneaux] of [...semaines].sort(([a], [b]) => a.localeCompare(b))) {
    const seances = creneaux.map((c) => (c.seanceId ? titres.get(c.seanceId) ?? "" : ""));
    page(`${PARTIE_JOURNAL}/${anneeScolaireDe(lundi)}`, `Semaine du ${lundi}`,
      `journal|${lundi}|${JSON.stringify(creneaux.map((c) => [c.id, c.date, c.heureDebut, c.heureFin, c.matiere, c.prevu, c.bilan]))}|${JSON.stringify(seances)}`,
      `Cahier journal, semaine du ${lundi}`, () => htmlSemaineDuJournal(lundi, creneaux, (id) => titres.get(id)));
  }

  // ── Ressources : les documents du coffre ──
  for (const doc of [...d.coffre].sort((a, b) => a.nom.localeCompare(b.nom, "fr"))) {
    if (doc.nomFichier) fichier(PARTIE_RESSOURCES, doc.nom || "Document", doc.nomFichier);
  }

  return { fichiers, dossiers: [...dossiers].sort() };
}
