// Supprimer, et pouvoir revenir en arrière : au bouton « Annuler » du bandeau, ou par ⌘Z tant
// qu'il est là (voir annulation.ts). L'enseignant a supprimé une séance, fait ⌘Z, et elle n'est
// pas revenue (octobre 2026) : la plupart des suppressions ne se défaisaient pas.
//
// La base fait suivre une suppression : une séance supprimée laisse sans séance les créneaux du
// planning et du cahier journal qui la posaient (ON DELETE SET NULL) ; une séquence emporte ses
// séances, une évaluation ses notes, un espace ses progressions (ON DELETE CASCADE). On garde donc
// tout avant de supprimer, et l'on remet tout, tel quel — même identifiant, même contenu —, puis
// chaque lien défait se refait, s'il n'a pas été refait autrement entre-temps.

import { api, type Atelier, type Creneau, type Espace, type Evaluation, type ProjetClasse, type Seance, type Sequence } from "./api";
import { toastAnnulable } from "./components/Toaster";

type Lien = "seanceId" | "atelierId" | "espaceId";

/** Les créneaux qui posent l'un de ces éléments : leur identifiant et ce qu'ils posent. */
async function creneauxQuiPosent(champ: Lien, ids: Set<string>): Promise<{ id: string; vers: string }[]> {
  if (!ids.size) return [];
  const tous = await api.creneauxList();
  return tous.filter((c) => c[champ] && ids.has(c[champ]!)).map((c) => ({ id: c.id, vers: c[champ]! }));
}

/** Chaque créneau repose ce qu'il posait, tel qu'il est aujourd'hui, s'il est resté vide. */
async function reposer(champ: Lien, liens: { id: string; vers: string }[]) {
  if (!liens.length) return;
  const parId = new Map((await api.creneauxList()).map((c) => [c.id, c]));
  for (const l of liens) {
    const c = parId.get(l.id);
    if (c && !c[champ]) await api.creneauSave({ ...c, [champ]: l.vers });
  }
}

const nomDeLaSeance = (s: Seance) => (s.titre.trim() ? `« ${s.titre.trim()} »` : `${s.numero}`);

/** Supprime une séance ; « Annuler » (ou ⌘Z) la remet, et la repose dans ses créneaux. */
export async function supprimerLaSeance(s: Seance, relire: () => void) {
  const liens = await creneauxQuiPosent("seanceId", new Set([s.id]));
  await api.seanceDelete(s.id);
  relire();
  toastAnnulable(`Séance ${nomDeLaSeance(s)} supprimée.`, async () => {
    await api.seanceSave(s);
    await reposer("seanceId", liens);
    relire();
  });
}

/** Supprime une séquence et ses séances ; « Annuler » (ou ⌘Z) remet le tout, et le repose dans ses créneaux. */
export async function supprimerLaSequence(seq: Sequence, apres: { supprimee: () => void; revenue: () => void }) {
  const seances = await api.seancesList(seq.id);
  const liens = await creneauxQuiPosent("seanceId", new Set(seances.map((s) => s.id)));
  await api.sequenceDelete(seq.id);
  apres.supprimee();
  toastAnnulable(`Séquence « ${seq.titre.trim() || "sans titre"} » supprimée${seances.length ? `, avec ses ${seances.length} séance${seances.length > 1 ? "s" : ""}` : ""}.`, async () => {
    await api.sequenceSave(seq);
    for (const s of seances) await api.seanceSave(s);
    await reposer("seanceId", liens);
    apres.revenue();
  });
}

/** Supprime un créneau du planning ; « Annuler » (ou ⌘Z) le remet. */
export async function supprimerLeCreneau(c: Creneau, relire: () => void) {
  await api.creneauDelete(c.id);
  relire();
  toastAnnulable("Créneau supprimé.", async () => { await api.creneauSave(c); relire(); });
}

/** Supprime une évaluation et ses notes ; « Annuler » (ou ⌘Z) remet l'une et les autres. */
export async function supprimerLEvaluation(ev: Evaluation, relire: () => void) {
  const notes = await api.notesEleveList(ev.id);
  await api.evaluationDelete(ev.id);
  relire();
  toastAnnulable(`« ${ev.titre} » supprimée.`, async () => {
    await api.evaluationSave(ev);
    for (const n of notes) await api.noteEleveSave(n);
    relire();
  });
}

/** Les espaces où un atelier se trouve : chacun garde sa liste d'ateliers. */
const espacesDe = async (atelierId: string) => (await api.atelierEspaceList()).filter(([a]) => a === atelierId).map(([, e]) => e);
async function remettreDansLesEspaces(atelierId: string, espaces: string[]) {
  const liens = await api.atelierEspaceList();
  for (const e of espaces) {
    const ateliers = liens.filter(([, x]) => x === e).map(([a]) => a);
    if (!ateliers.includes(atelierId)) await api.atelierEspaceSet(e, [...ateliers, atelierId]);
  }
}

/** Supprime un atelier ; « Annuler » (ou ⌘Z) le remet dans ses espaces et ses créneaux. */
export async function supprimerLAtelier(a: Atelier, relire: () => void) {
  const espaces = await espacesDe(a.id);
  const poses = await creneauxQuiPosent("atelierId", new Set([a.id]));
  await api.atelierDelete(a.id);
  relire();
  toastAnnulable(`Atelier « ${a.titre} » supprimé.`, async () => {
    await api.atelierSave(a);
    await remettreDansLesEspaces(a.id, espaces);
    await reposer("atelierId", poses);
    relire();
  });
}

/** Supprime un espace ; « Annuler » (ou ⌘Z) le remet, avec ses ateliers, ses progressions et ses créneaux. */
export async function supprimerLEspace(esp: Espace, relire: () => void) {
  const ateliers = (await api.atelierEspaceList()).filter(([, e]) => e === esp.id).map(([a]) => a);
  const progressions = await api.progressionsEleveList(esp.id);
  const poses = await creneauxQuiPosent("espaceId", new Set([esp.id]));
  await api.espaceDelete(esp.id);
  relire();
  toastAnnulable(`Espace « ${esp.titre} » supprimé.`, async () => {
    await api.espaceSave(esp);
    if (ateliers.length) await api.atelierEspaceSet(esp.id, ateliers);
    for (const p of progressions) await api.progressionEleveSave(p);
    await reposer("espaceId", poses);
    relire();
  });
}

/** Retire un projet de l'année ; « Annuler » (ou ⌘Z) le remet, et ses séquences s'y rattachent de nouveau. */
export async function supprimerLeProjet(p: ProjetClasse, relire: () => void) {
  const rattachees = new Set((await api.sequencesList(true)).filter((s) => s.projetId === p.id).map((s) => s.id));
  await api.projetDelete(p.id);
  relire();
  toastAnnulable(`« ${p.titre || "Le projet"} » retiré de l'année.`, async () => {
    await api.projetSave(p);
    for (const s of await api.sequencesList(true)) if (rattachees.has(s.id) && !s.projetId) await api.sequenceSave({ ...s, projetId: p.id });
    relire();
  });
}
