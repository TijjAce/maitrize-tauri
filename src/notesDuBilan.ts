// ── Le bilan d'un créneau, jusqu'au dossier des élèves ────────────────────
//
// Ce que le bilan dit d'un élève — les phrases qui le nomment — va dans son
// dossier, onglet Notes : une note par élève et par créneau, qui suit le bilan
// quand on le reprend, et s'en va quand l'élève n'y est plus nommé. Le reste
// du bilan appartient au groupe : il reste au cahier journal.
//
// Les fiches d'observation, elles, ne naissent plus du bilan : seules celles
// qu'on pose sur un axe (« 👁 Observer ») s'en nourrissent.

import { api, nowIso, type CommentaireEleve, type Creneau, type Eleve, type ObservationEleve } from "./api";
import { natureDe } from "./heures";
import { fichesANourrir, observationVide } from "./observationEleve";
import { phrasesQuiCitent, prenomDe } from "./veilleEleve";

/** La note qu'un créneau a portée au dossier d'un élève : la même à chaque reprise du bilan. */
export const idNoteDuBilan = (creneauId: string, eleveId: string) => `bilan:${creneauId}:${eleveId}`;

type CreneauDuBilan = Pick<Creneau, "id" | "date" | "heureDebut" | "matiere" | "nature">;

/**
 * Les notes qu'un bilan porte aux élèves qu'il nomme, et celles qu'il retire
 * aux élèves qu'il ne nomme plus. Un élève nommé compte, qu'il ait été coché
 * sur le créneau ou non : c'est ce qui est écrit qui décide. La nature qu'on a
 * donnée à une note (« comportement »…) se garde quand le bilan change.
 */
export function notesDuBilan(
  existantes: CommentaireEleve[], creneau: CreneauDuBilan, bilan: string, eleves: Pick<Eleve, "id" | "nom">[],
): { aEcrire: CommentaireEleve[]; aRetirer: string[]; nouvelles: string[] } {
  const parId = new Map(existantes.map((n) => [n.id, n]));
  const date = `${creneau.date.slice(0, 10)}T${(creneau.heureDebut || "00:00").slice(0, 5)}:00`;
  const titre = (creneau.matiere ?? "").trim();
  const aEcrire: CommentaireEleve[] = [];
  const aRetirer: string[] = [];
  const nouvelles: string[] = [];
  for (const e of eleves) {
    const id = idNoteDuBilan(creneau.id, e.id);
    const deja = parId.get(id);
    const dit = phrasesQuiCitent(bilan ?? "", prenomDe(e.nom)).trim();
    if (!dit) { if (deja) aRetirer.push(id); continue; }
    const texte = titre ? `${titre} : ${dit}` : dit;
    if (deja && deja.texte === texte && deja.date === date) continue;
    aEcrire.push({
      ...deja, id, date, texte, eleveId: e.id,
      type: deja?.type || (natureDe(creneau) === "reunion" ? "divers" : "scolaire"),
    });
    if (!deja) nouvelles.push(e.id);
  }
  return { aEcrire, aRetirer, nouvelles };
}

/** Ce qu'un bilan enregistré a changé au dossier des élèves. */
export interface PorteAuDossier {
  fiches: ObservationEleve[];
  notes: CommentaireEleve[];
  notesRetirees: string[];
  /** Les élèves qui reçoivent une note de ce créneau pour la première fois. */
  nouvelles: string[];
}

/**
 * Porte un bilan enregistré au dossier des élèves : dans leurs notes, ce qui
 * les nomme ; dans les fiches posées sur le créneau avec un axe, ce que le
 * bilan dit d'eux. Une erreur remonte telle quelle : le bilan, lui, est déjà
 * enregistré.
 */
export async function porterAuDossier(
  creneau: CreneauDuBilan, bilan: string,
  listes: { observations: ObservationEleve[]; notes: CommentaireEleve[]; eleves: Pick<Eleve, "id" | "nom">[] },
  quand = nowIso(),
): Promise<PorteAuDossier> {
  const nomDe = (id: string) => listes.eleves.find((e) => e.id === id)?.nom ?? "";
  const fiches = fichesANourrir(listes.observations, creneau.id, bilan, nomDe, quand, listes.eleves.map((e) => e.nom));
  for (const o of fiches) await api.observationSave(o);
  const { aEcrire, aRetirer, nouvelles } = notesDuBilan(listes.notes, creneau, bilan, listes.eleves);
  for (const n of aEcrire) await api.commentaireSave(n);
  for (const id of aRetirer) await api.commentaireDelete(id);
  return { fiches, notes: aEcrire, notesRetirees: aRetirer, nouvelles };
}

/** Une liste à jour de ce qui vient d'être écrit et retiré. */
export function appliquer<T extends { id: string }>(liste: T[], ecrits: T[], retires: string[] = []): T[] {
  const parti = new Set([...retires, ...ecrits.map((x) => x.id)]);
  return [...liste.filter((x) => !parti.has(x.id)), ...ecrits];
}

/**
 * Une fiche que le bilan avait fait naître toute seule, avant : sans axe, sans
 * constat — une simple copie du bilan, qui reste au cahier journal.
 */
export const estUneCopieDuBilan = (o: ObservationEleve) => !o.axe.trim() && !!o.creneauId && observationVide(o);

/** Fait une fois sur chaque ordinateur ; le réglage reste sur celui-ci. */
export const CLE_MIGRATION = "migration:bilansVersLesNotes";

/**
 * Le passage aux notes, une fois : les fiches sans axe nées des bilans s'en
 * vont, et ce que les bilans déjà écrits disent des élèves rejoint leurs
 * notes. Recommencé en entier si une étape échoue : tout y est sans effet la
 * seconde fois.
 */
export async function passerLesBilansAuxNotes(): Promise<void> {
  if (await api.settingGet(CLE_MIGRATION).catch(() => null)) return;
  const [observations, notes, eleves, creneaux] = await Promise.all([
    api.observationsList(), api.commentairesList(), api.elevesList(), api.creneauxList(),
  ]);
  for (const o of observations) if (estUneCopieDuBilan(o)) await api.observationDelete(o.id);
  let courantes = notes;
  for (const c of creneaux) {
    if (!(c.bilan ?? "").trim()) continue;
    const { aEcrire } = notesDuBilan(courantes, c, c.bilan, eleves);
    for (const n of aEcrire) await api.commentaireSave(n);
    courantes = appliquer(courantes, aEcrire);
  }
  await api.settingSet(CLE_MIGRATION, "1");
}
