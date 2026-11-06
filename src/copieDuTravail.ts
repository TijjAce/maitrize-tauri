// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

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
// - « Grilles d'observables » : la grille de chaque séquence finie, avec les
//   élèves observés, rangée par année scolaire (voir grillesObservables.ts).
// - « Ressources » : les documents du coffre.
//
// Une page ne se refait que si ce qu'elle montre a changé : son empreinte
// vient de ses données, pas de sa mise en page.

import {
  couleurHex, couleurPourMatiere, getMatiereOverrides, MATIERES, matiereDuDomaine, NIVEAUX_SCOLAIRES, type CommentaireEleve, type Creneau, type DocumentCoffre,
  type DocumentEleve, type EdtTypique, type Eleve, type Evaluation, type NoteEleve, type ObservationEleve, type PapierEleve,
  type ProgrammationFinale, type ProgressionAnnuelle, type ProgressionEleve, type Seance, type Sequence,
} from "./api";
import { documentImprimable } from "./print";
import { empreinte, extensionDe, Noms, nomSur, sansExtension, type FichierCopie, type PlanDeCopie } from "./copieBureau";
import { corpsDeLExport, STYLE_EXPORT } from "./dossierHtml";
import {
  anneeScolaireDe, creneauRempli, htmlEmploiDuTemps, htmlPeriode, htmlProgrammation, htmlSemaineDuJournal, lundiDe,
  type LigneProgrammation, type TableauDePeriode, type TableauDeProgrammation,
} from "./organisationHtml";
import { estUnEleve, idDeLEleve, lireEtat } from "./progressionAnnuelle";
import { estALaClasse, teintesDesLignes } from "./programmationAnnuelle";
import { htmlParEleve, lire as lireProgrammationIme } from "./programmationIme";
import type { SlotEdt } from "./organisation";
import {
  PREFIXE_GRILLE, STYLE_GRILLE_OBSERVABLES, aEteObserve, aObserver, echelleDe, estUneGrille, htmlGrilleObservables, lireGrille,
  observablesDeLaSequence, type GrilleDeLEleve,
} from "./grillesObservables";
import { dateCourte, suivisDesSequences } from "./suiviSequences";
import { isoJour } from "./dates";

/** Change quand la mise en page des pages change : elles sont alors toutes réécrites. */
const VERSION = "1";

export const PARTIE_ELEVES = "Élèves";
export const PARTIE_ORGANISATION = "Organisation";
export const PARTIE_JOURNAL = "Cahier journal";
export const PARTIE_GRILLES = "Grilles d'observables";
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
  sequences: Sequence[];
  seances: Seance[];
  edts: EdtTypique[];
  progressions: ProgressionAnnuelle[];
  programmations: ProgrammationFinale[];
  coffre: DocumentCoffre[];
  /** Le jour où l'on copie : une séquence finie depuis une semaine y range sa grille. Aujourd'hui par défaut. */
  aujourdHui?: string;
}

const liste = <T>(json: string | null | undefined): T[] => {
  try { const v = JSON.parse(json || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
};

/**
 * La couleur d'une colonne de progression ou d'un domaine de programmation :
 * celle de sa matière, de son domaine ou de l'intitulé choisi dans Réglages,
 * sinon la sienne.
 */
const teinteDe = (c: { titre: string; couleur?: string }) => {
  const connu = MATIERES.includes(c.titre) || !!matiereDuDomaine(c.titre) || Object.prototype.hasOwnProperty.call(getMatiereOverrides(), c.titre);
  return couleurHex[connu ? couleurPourMatiere(c.titre) : c.couleur ?? "blue"] ?? couleurHex.blue;
};

/** La classe d'abord, puis les niveaux dans l'ordre de l'école. */
const rangDuNiveau = (n: string) => (n ? 1 + Math.max(0, NIVEAUX_SCOLAIRES.indexOf(n)) : 0);

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
  // Le dossier de chaque élève : sa progression de l'année y va aussi (plus bas, avec l'organisation).
  const dossierDe = new Map<string, { dossier: string; nom: string }>();
  for (const e of parNom) {
    const dossier = noms.reserver(PARTIE_ELEVES, nomSur(e.nom, "Élève"), "");
    dossierDe.set(e.id, { dossier, nom: e.nom });
    const siens = {
      commentaires: d.commentaires.filter((c) => c.eleveId === e.id),
      notes: d.notes.filter((n) => n.eleveId === e.id),
      // Ses grilles se lisent avec leur séquence, dans « Grilles d'observables ».
      docs: d.documents.filter((x) => x.eleveId === e.id && !estUneGrille(x.typeDoc)),
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
  // Les séances placées dans les cases se nomment comme à l'écran.
  const seanceParId = new Map(d.seances.map((s) => [s.id, s]));
  const nomSeance = (id: string) => { const s = seanceParId.get(id); return s ? `S${s.numero} · ${s.titre || "Sans titre"}` : undefined; };
  const periodes = new Map<string, ProgressionAnnuelle[]>();
  for (const p of d.progressions) {
    const e = lireEtat(p);
    if (!e.colonnes.length || estUnEleve(p.niveau)) continue;
    const cle = `${p.annee}|${p.periode}`;
    periodes.set(cle, [...(periodes.get(cle) ?? []), p]);
  }
  for (const [cle, progs] of [...periodes].sort(([a], [b]) => a.localeCompare(b))) {
    const [annee, periode] = cle.split("|");
    // La classe d'abord, puis les niveaux dans l'ordre où on les a écrits.
    const ranges = [...progs].sort((a, b) => rangDuNiveau(a.niveau ?? "") - rangDuNiveau(b.niveau ?? "") || (a.niveau ?? "").localeCompare(b.niveau ?? "", "fr"));
    const tableaux: TableauDePeriode[] = ranges.map((p) => {
      const e = lireEtat(p);
      return { niveau: p.niveau ?? "", colonnes: e.colonnes.map((c) => ({ ...c, teinte: teinteDe(c) })), cellules: e.cellules, seances: e.seances };
    });
    // Une séance renommée refait la page qui la cite.
    const cite = tableaux.flatMap((t) => Object.values(t.seances ?? {}).flat().map(nomSeance));
    page(`${PARTIE_ORGANISATION}/Progression ${annee}`, `Période ${periode}`,
      `progression|${cle}|${JSON.stringify(ranges.map((p) => [p.niveau, p.colonnesJson, p.cellulesJson, p.seancesJson ?? ""]))}|${JSON.stringify(cite)}`,
      `Progression ${annee} P${periode}`, () => htmlPeriode(annee, Number(periode), tableaux, [], nomSeance));
  }
  // La progression d'un élève va dans son dossier, une page par période ; celle d'un élève parti ne se copie plus.
  for (const p of d.progressions) {
    const id = idDeLEleve(p.niveau ?? "");
    const sien = id === null ? undefined : dossierDe.get(id);
    const e = lireEtat(p);
    if (!sien || !e.colonnes.length) continue;
    const tableau: TableauDePeriode = { niveau: "", colonnes: e.colonnes.map((c) => ({ ...c, teinte: teinteDe(c) })), cellules: e.cellules, seances: e.seances };
    const cite = Object.values(e.seances).flat().map(nomSeance);
    page(sien.dossier, `Progression ${p.annee} P${p.periode}`,
      `progression-eleve|${p.annee}|${p.periode}|${JSON.stringify([p.colonnesJson, p.cellulesJson, p.seancesJson ?? ""])}|${JSON.stringify(cite)}`,
      `Progression ${p.annee} P${p.periode} — ${sien.nom}`, () => htmlPeriode(p.annee, p.periode, [tableau], [], nomSeance));
  }
  // Celles des collègues ne sont pas le travail de l'enseignant.
  for (const p of d.programmations) {
    if (p.estImportee || p.niveau !== "ime") continue;
    const prog = lireProgrammationIme(p.lignesJson);
    if (!prog.objectifs.length) continue;
    const eleves = parNom.map((e) => ({ id: e.id, nom: e.nom }));
    page(PARTIE_ORGANISATION, `Programmation par élève ${p.annee}`, `ime|${p.annee}|${p.lignesJson}|${JSON.stringify(eleves)}`,
      `Programmation par élève ${p.annee}`, () => htmlParEleve(p.annee, prog, eleves));
  }
  // Une page par année : la programmation de la classe, puis celles de ses niveaux.
  const parAnnee = new Map<string, ProgrammationFinale[]>();
  for (const p of d.programmations) {
    if (!estALaClasse(p) || !liste(p.lignesJson).length) continue;
    parAnnee.set(p.annee, [...(parAnnee.get(p.annee) ?? []), p]);
  }
  for (const [annee, progs] of [...parAnnee].sort(([a], [b]) => a.localeCompare(b))) {
    const ranges = [...progs].sort((a, b) => rangDuNiveau(a.niveau ?? "") - rangDuNiveau(b.niveau ?? "") || (a.niveau ?? "").localeCompare(b.niveau ?? "", "fr"));
    const tableaux: TableauDeProgrammation[] = ranges.map((p) => {
      const lignes = liste<LigneProgrammation>(p.lignesJson);
      return { niveau: p.niveau ?? "", lignes, teintes: teintesDesLignes(lignes, (l) => teinteDe({ titre: l.label, couleur: l.couleur }), "#94a3b8") };
    });
    page(PARTIE_ORGANISATION, `Programmation ${annee}`, `programmation|${annee}|${JSON.stringify(ranges.map((p) => [p.niveau, p.lignesJson]))}`,
      `Programmation ${annee}`, () => htmlProgrammation(annee, tableaux));
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

  // ── Grilles d'observables : celle de chaque séquence qu'on n'observe plus, avec les élèves observés ──
  const aujourdHui = d.aujourdHui ?? isoJour(new Date());
  const suivis = suivisDesSequences(d.sequences, d.seances, d.creneaux, aujourdHui);
  const grilles = new Map<string, Map<string, GrilleDeLEleve>>();
  for (const doc of d.documents) {
    if (!estUneGrille(doc.typeDoc)) continue;
    const sequenceId = doc.typeDoc.slice(PREFIXE_GRILLE.length);
    grilles.set(sequenceId, (grilles.get(sequenceId) ?? new Map()).set(doc.eleveId, lireGrille(doc.donnees)));
  }
  for (const s of [...d.sequences].sort((a, b) => a.titre.localeCompare(b.titre, "fr"))) {
    const suivi = suivis.get(s.id);
    const parEleve = grilles.get(s.id);
    if (!parEleve || !suivi || aObserver(suivi, aujourdHui)) continue;
    const observables = observablesDeLaSequence(d.seances.filter((x) => x.sequenceId === s.id));
    // Les élèves observés, même partis depuis : la grille garde ce qui a été vu.
    const observes = parNom.filter((e) => aEteObserve(parEleve.get(e.id), observables));
    if (!observes.length) continue;
    const valeurs = Object.fromEntries(observes.map((e) => [e.id, parEleve.get(e.id) ?? {}]));
    const quand = suivi.demarreeLe && suivi.derniereLe ? `du ${dateCourte(suivi.demarreeLe)} au ${dateCourte(suivi.derniereLe)}` : "";
    const sous = [s.niveau, s.periode ? `période ${s.periode}` : "", quand, "grille d'observables"].filter(Boolean).join(" · ");
    const annee = s.annee || anneeScolaireDe(suivi.derniereLe ?? aujourdHui);
    page(`${PARTIE_GRILLES}/${annee}`, s.titre || "Séquence", `grille|${s.id}|${JSON.stringify([s.titre, sous, observables, observes.map((e) => [e.id, e.nom]), valeurs])}`,
      `Grille — ${s.titre}`, () => htmlGrilleObservables({ titre: s.titre, sous, observables, eleves: observes, valeurs, echelle: echelleDe(s) }),
      STYLE_GRILLE_OBSERVABLES);
  }

  // ── Ressources : les documents du coffre ──
  for (const doc of [...d.coffre].sort((a, b) => a.nom.localeCompare(b.nom, "fr"))) {
    if (doc.nomFichier) fichier(PARTIE_RESSOURCES, doc.nom || "Document", doc.nomFichier);
  }

  return { fichiers, dossiers: [...dossiers].sort() };
}
