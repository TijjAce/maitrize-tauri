// ── Le cahier journal, pour le téléphone ──────────────────────────────────
//
// Le téléphone reçoit le cahier journal des jours publiés — deux semaines en
// arrière, deux en avant, comme l'emploi du temps : pour chaque créneau, son
// prévu, son bilan, la séance posée et ses aides à la tâche. Les aides se
// dessinent ici, comme à l'impression, consignes structurées comprises ; le
// téléphone les montre ensuite aux tablettes des élèves, sur le réseau local,
// pendant l'activité.
//
// Tout part chiffré avec la clé du retour (voir telephone.rs) : Nuage ne lit
// rien. Rien ne repart qui n'a pas changé ; ici, rien ne se redessine non plus.

import type { Creneau, MaterielItem, Seance } from "./api";
import { lireFabrication } from "./modifierFeuille";

/** Les ateliers de Fabriquer dont une feuille est une aide à la tâche : celles-là vont aux tablettes. */
export const ATELIERS_D_AIDE = ["sequentiel", "priseDeParole", "resolution", "modelisation", "fonction"] as const;

/** Combien de jours avant et après aujourd'hui : ceux de l'emploi du temps publié (telephone.rs). */
export const JOURS_PASSES = 14;
export const JOURS_PUBLIES = 14;

export interface AideDuJournal { id: string; titre: string }
export interface CreneauDuJournal {
  id: string; debut: string; fin: string; matiere: string; prevu: string; bilan: string;
  /** La séance posée, par son titre ; vide sans séance. */
  seance: string;
  aides: AideDuJournal[];
}
export interface JourDuJournal { jour: string; creneaux: CreneauDuJournal[] }
export interface JournalTelephone { publie: string; jours: JourDuJournal[] }
/** Une aide confiée à la publication : la clé par laquelle le journal la cite, son titre, sa page complète. */
export interface AideAPublier { cle: string; titre: string; html: string }

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Les jours publiés, du plus ancien au plus lointain. */
export function joursPublies(aujourdHui: Date): string[] {
  return Array.from({ length: JOURS_PASSES + JOURS_PUBLIES }, (_, k) => {
    const d = new Date(aujourdHui.getFullYear(), aujourdHui.getMonth(), aujourdHui.getDate() - JOURS_PASSES + k);
    return iso(d);
  });
}

/** Une aide de séance : un matériel posé dans une séance et fait par un atelier d'aides. */
export const estUneAide = (m: MaterielItem): boolean => {
  const f = lireFabrication(m.fabricationJson);
  return !!m.seanceId && !!f && (ATELIERS_D_AIDE as readonly string[]).includes(f.atelier);
};

/**
 * Le cahier journal des jours publiés : chaque créneau de chaque jour, avec
 * les aides de sa séance, citées par la clé de leur matériel. Un jour sans
 * créneau y figure vide : le téléphone sait alors que c'est un jour sans classe.
 */
export function journalDes(jours: string[], creneaux: Creneau[], seances: Seance[], materiel: MaterielItem[]): JournalTelephone {
  const titreDe = new Map(seances.map((s) => [s.id, s.titre]));
  const aides = materiel.filter(estUneAide);
  return {
    publie: "",
    jours: jours.map((jour) => ({
      jour,
      creneaux: creneaux
        .filter((c) => (c.date ?? "").slice(0, 10) === jour)
        .sort((a, b) => a.heureDebut.localeCompare(b.heureDebut))
        .map((c) => ({
          id: c.id, debut: c.heureDebut, fin: c.heureFin, matiere: c.matiere ?? "", prevu: c.prevu ?? "", bilan: c.bilan ?? "",
          seance: c.seanceId ? titreDe.get(c.seanceId) ?? "" : "",
          aides: c.seanceId ? aides.filter((m) => m.seanceId === c.seanceId).map((m) => ({ id: m.id, titre: m.titre })) : [],
        })),
    })),
  };
}

/** Ce qui suffit à savoir que le journal n'a pas changé depuis la dernière publication. */
export function signatureDuJournal(journal: JournalTelephone, materiel: MaterielItem[]): string {
  const cites = new Set(journal.jours.flatMap((j) => j.creneaux.flatMap((c) => c.aides.map((a) => a.id))));
  return JSON.stringify([journal.jours, materiel.filter((m) => cites.has(m.id)).map((m) => [m.id, m.titre, m.fabricationJson ?? ""])]);
}

// ── Dessiner une aide ──────────────────────────────────────────────────────
// Les ateliers et l'API sont chargés à la demande : le reste du module se teste sans eux.

/** Les pages déjà dessinées, par matériel et par fabrication : une aide qui ne change pas ne se redessine pas. */
const dessinees = new Map<string, string>();

/** La page complète d'une aide de séance, comme à l'impression ; rien pour un matériel qui n'en est pas une. */
export async function pageDeLAide(m: MaterielItem): Promise<string | null> {
  const f = lireFabrication(m.fabricationJson);
  if (!f || !(ATELIERS_D_AIDE as readonly string[]).includes(f.atelier)) return null;
  const cle = `${m.id}|${m.fabricationJson ?? ""}`;
  const deja = dessinees.get(cle);
  if (deja) return deja;
  const a = await import("./aidesALaTache");
  const { sequentielImprimable, priseDeParoleImprimable } = await import("./aidesDesSequences");
  const { STYLE_FEUILLE } = await import("./cartesImprimables");
  const { documentImprimable } = await import("./print");
  const { STYLE_CONSIGNES_STRUCTUREES, structurerConsignesHtml } = await import("./consignesStructurees");
  const mem = f.memoires ?? {};
  let rendu: { html: string; style: string };
  switch (f.atelier) {
    case "sequentiel": rendu = await sequentielImprimable(a.reglagesSequentielSurs(mem.sequentiel)); break;
    case "priseDeParole": rendu = await priseDeParoleImprimable(a.reglagesParoleSurs(mem.priseDeParole)); break;
    case "resolution": rendu = { html: a.htmlResolution(a.reglagesResolutionSurs(mem.resolution)), style: a.STYLE_AIDES }; break;
    case "modelisation": rendu = { html: a.htmlModelisation(a.reglagesModelisationSurs(mem.modelisation)), style: a.STYLE_AIDES }; break;
    default: rendu = { html: a.htmlFonction(a.reglagesFonctionSurs(mem.fonction)), style: a.STYLE_AIDES };
  }
  const { sansReferences } = await import("./references");
  const page = documentImprimable(m.titre, sansReferences(structurerConsignesHtml(rendu.html)), STYLE_FEUILLE + rendu.style + STYLE_CONSIGNES_STRUCTUREES);
  dessinees.set(cle, page);
  return page;
}

// ── Publier ────────────────────────────────────────────────────────────────

let publiee = "";
let enCours = false;

/**
 * Publie le cahier journal pour le téléphone s'il a changé depuis la
 * dernière fois : appelée par la relève de fond, une fois le téléphone relié.
 * Silencieuse : un échec se retente au passage suivant.
 */
export async function publierLeJournal(maintenant = new Date()): Promise<void> {
  if (enCours) return;
  enCours = true;
  try {
    const { api } = await import("./api");
    const jours = joursPublies(maintenant);
    const [creneaux, seances, materiel] = await Promise.all([
      api.creneauxList(jours[0], jours[jours.length - 1]), api.seancesList(), api.materielList(),
    ]);
    const journal = journalDes(jours, creneaux, seances, materiel);
    const signature = signatureDuJournal(journal, materiel);
    if (signature === publiee) return;
    const cites = new Set(journal.jours.flatMap((j) => j.creneaux.flatMap((c) => c.aides.map((a) => a.id))));
    const aides: AideAPublier[] = [];
    for (const m of materiel.filter((x) => cites.has(x.id))) {
      const html = await pageDeLAide(m).catch(() => null);
      if (html) aides.push({ cle: m.id, titre: m.titre, html });
    }
    const bilan = await api.telephonePublierJournal(journal, aides);
    if (bilan.relie) publiee = signature;
  } catch {
    // Pas de réseau, pas de relais : le passage suivant réessaiera.
  } finally {
    enCours = false;
  }
}
