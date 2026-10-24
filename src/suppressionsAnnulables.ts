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
import { DUREE_ANNULABLE, toast, toastAnnulable } from "./components/Toaster";
import { texteErreur } from "./api";

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

/** Ce qu'il faut pour remettre une séquence après l'avoir effacée : elle, ses séances, et les créneaux qui les posaient. */
export async function retourDeLaSequence(seq: Sequence): Promise<{ seances: number; remettre: () => Promise<void> }> {
  const seances = await api.seancesList(seq.id);
  const liens = await creneauxQuiPosent("seanceId", new Set(seances.map((s) => s.id)));
  return {
    seances: seances.length,
    remettre: async () => {
      await api.sequenceSave(seq);
      for (const s of seances) await api.seanceSave(s);
      await reposer("seanceId", liens);
    },
  };
}

/** Supprime une séquence et ses séances ; « Annuler » (ou ⌘Z) remet le tout, et le repose dans ses créneaux. */
export async function supprimerLaSequence(seq: Sequence, apres: { supprimee: () => void; revenue: () => void }) {
  const retour = await retourDeLaSequence(seq);
  await api.sequenceDelete(seq.id);
  apres.supprimee();
  const n = retour.seances;
  toastAnnulable(`Séquence « ${seq.titre.trim() || "sans titre"} » supprimée${n ? `, avec ses ${n} séance${n > 1 ? "s" : ""}` : ""}.`, async () => {
    await retour.remettre();
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

/** Ce qu'il faut pour remettre un atelier : lui, sa place dans ses espaces et ses créneaux. */
export async function retourDeLAtelier(a: Atelier): Promise<() => Promise<void>> {
  const espaces = await espacesDe(a.id);
  const poses = await creneauxQuiPosent("atelierId", new Set([a.id]));
  return async () => {
    await api.atelierSave(a);
    await remettreDansLesEspaces(a.id, espaces);
    await reposer("atelierId", poses);
  };
}

/** Supprime un atelier ; « Annuler » (ou ⌘Z) le remet dans ses espaces et ses créneaux. */
export async function supprimerLAtelier(a: Atelier, relire: () => void) {
  const remettre = await retourDeLAtelier(a);
  await api.atelierDelete(a.id);
  relire();
  toastAnnulable(`Atelier « ${a.titre} » supprimé.`, async () => { await remettre(); relire(); });
}

/** Ce qu'il faut pour remettre un espace : lui, ses ateliers, ses progressions et ses créneaux. */
export async function retourDeLEspace(esp: Espace): Promise<() => Promise<void>> {
  const ateliers = (await api.atelierEspaceList()).filter(([, e]) => e === esp.id).map(([a]) => a);
  const progressions = await api.progressionsEleveList(esp.id);
  const poses = await creneauxQuiPosent("espaceId", new Set([esp.id]));
  return async () => {
    await api.espaceSave(esp);
    if (ateliers.length) await api.atelierEspaceSet(esp.id, ateliers);
    for (const p of progressions) await api.progressionEleveSave(p);
    await reposer("espaceId", poses);
  };
}

/** Supprime un espace ; « Annuler » (ou ⌘Z) le remet, avec ses ateliers, ses progressions et ses créneaux. */
export async function supprimerLEspace(esp: Espace, relire: () => void) {
  const remettre = await retourDeLEspace(esp);
  await api.espaceDelete(esp.id);
  relire();
  toastAnnulable(`Espace « ${esp.titre} » supprimé.`, async () => { await remettre(); relire(); });
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

/**
 * Ce qui ne se reconstruit pas — un élève et tout son dossier, une sauvegarde du stockage, un élément d'un
 * bureau commun — ne s'efface qu'à la fin du bandeau : on le cache aussitôt, « Annuler » (ou ⌘Z) le remontre,
 * et rien n'est parti. Si l'application se ferme avant, rien n'est effacé.
 */
export function effacerALaFin(o: { message: string; icone?: string; cacher: () => void; remontrer: () => void; effacer: () => Promise<unknown> }) {
  o.cacher();
  let annule = false;
  toastAnnulable(o.message, () => { annule = true; o.remontrer(); }, o.icone);
  window.setTimeout(() => {
    if (annule) return;
    o.effacer().catch((e) => { o.remontrer(); toast("Suppression impossible : " + texteErreur(e), { icone: "⚠️" }); });
  }, DUREE_ANNULABLE + 300);
}
