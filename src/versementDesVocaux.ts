// ── Les dictées du téléphone vont toutes seules dans le bilan ─────────────
//
// Une dictée transcrite — ou une note, qui arrive déjà écrite — se verse
// d'elle-même dans le bilan de son créneau : celui qu'on avait choisi sur le
// téléphone, sinon celui de l'heure. Exactement comme si on l'avait tapée dans
// le cahier journal : à la suite de ce qui est écrit, sans rien écraser, et
// jusqu'au dossier des élèves du créneau. L'enregistrement est ensuite effacé.
//
// Ce qui ne trouve pas de créneau, ou n'a rien donné à écrire, reste dans
// Réglages › Téléphone, où l'on choisit à la main. Un bilan qu'on est en train
// de taper dans le cahier journal n'est pas touché : la dictée attend que la
// frappe soit enregistrée, puis passe à la suite.

import { api, newId, nowIso, texteErreur, type Creneau } from "./api";
import { bilanEnCoursDEcriture } from "./journalEnAttente";
import { toast } from "./components/Toaster";
import { LACUNE } from "./dictee";
import { fichesDuBilan } from "./observationEleve";
import { creneauRetenu, jourDuVocal, verserDansLeBilan, type Vocal } from "./vocaux";

/** Émis après un versement : le planning ouvert se relit. */
export const EVT_BILAN_VERSE = "maitrize:bilan-verse";
/** Émis par « Voir » sur l'annonce d'un versement : le planning s'ouvre à ce jour-là. */
export const EVT_VOIR_JOUR = "maitrize:voir-jour";
/** Émis par « Voir » quand une dictée attend qu'on lui choisisse un créneau : l'application ouvre les vocaux du téléphone. */
export const EVT_VOIR_VOCAUX = "maitrize:voir-vocaux";

/** Un texte qui dit quelque chose : ni vide, ni fait que de passages inaudibles. */
export const aQuelqueChoseADire = (texte: string) => (texte || "").split(LACUNE).join("").trim().length > 0;

/** Ce qui peut partir, et vers quel créneau ; ce qui attend qu'on lui en choisisse un. */
export function aVerser(vocaux: Vocal[], creneaux: Creneau[]): { prets: { vocal: Vocal; creneau: Creneau }[]; sansCreneau: Vocal[] } {
  const prets: { vocal: Vocal; creneau: Creneau }[] = [];
  const sansCreneau: Vocal[] = [];
  for (const vocal of vocaux) {
    if (vocal.etat !== "transcrit" || !aQuelqueChoseADire(vocal.texte)) continue;
    const creneau = creneauRetenu(vocal, creneaux);
    if (creneau) prets.push({ vocal, creneau }); else sansCreneau.push(vocal);
  }
  return { prets, sansCreneau };
}

/**
 * Verse un vocal dans le bilan d'un créneau, comme le cahier journal l'aurait
 * écrit, puis efface le vocal. Rend le créneau tel qu'il est désormais.
 *
 * Le bilan est relu juste avant : un autre versement, ou une saisie, a pu
 * passer depuis. Il s'écrit avant que le vocal s'efface : une panne entre les
 * deux le verserait deux fois, jamais zéro.
 */
export async function verserUnVocal(vocal: Vocal, creneau: Creneau, texte = vocal.texte): Promise<Creneau> {
  const jour = creneau.date.slice(0, 10);
  const frais = (await api.creneauxList(jour, jour)).find((c) => c.id === creneau.id) ?? creneau;
  const bilan = verserDansLeBilan(frais.bilan ?? "", texte);
  await api.creneauJournalSave(frais.id, frais.prevu ?? "", bilan);
  await api.vocalDelete(vocal.id);
  // Jusqu'au dossier des élèves, comme un bilan tapé. S'il coince, le bilan est
  // écrit quand même : les fiches se nourriront à la prochaine écriture du cahier.
  try {
    const [observations, eleves, seances] = await Promise.all([api.observationsList(), api.elevesList(), api.seancesList()]);
    const nomDe = (id: string) => eleves.find((e) => e.id === id)?.nom ?? "";
    const seance = seances.find((s) => s.id === frais.seanceId);
    for (const o of fichesDuBilan(observations, frais, seance, bilan, nomDe, nowIso(), newId).aEcrire) await api.observationSave(o);
  } catch { /* voir plus haut */ }
  window.dispatchEvent(new CustomEvent(EVT_BILAN_VERSE, { detail: { creneauId: frais.id, jour } }));
  return { ...frais, bilan };
}

/** « vendredi 2 octobre » */
const jourLisible = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

function annoncer(vocal: Vocal, c: Creneau) {
  const quoi = vocal.dureeS > 0 ? "Dictée versée" : "Note versée";
  toast(`${quoi} dans le bilan de ${c.heureDebut.slice(0, 5)} ${c.matiere || "ce créneau"}, ${jourLisible(c.date)}.`, {
    icone: "🎙", duree: 9000,
    action: { label: "Voir", faire: () => { window.dispatchEvent(new CustomEvent(EVT_VOIR_JOUR, { detail: c.date.slice(0, 10) })); } },
  });
}

/** Les vocaux sans créneau déjà signalés : une fois suffit. */
const signales = new Set<string>();
let enCours = false;

/** Verse tout ce qui est prêt ; dit une fois ce qui attend qu'on lui choisisse un créneau. */
export async function verserCeQuiEstPret(): Promise<void> {
  if (enCours) return;
  enCours = true;
  let differe = false;
  try {
    const candidats = (await api.vocauxList()).filter((v) => v.etat === "transcrit" && aQuelqueChoseADire(v.texte));
    if (!candidats.length) return;
    const jours = [...new Set(candidats.map(jourDuVocal))].sort();
    const { prets, sansCreneau } = aVerser(candidats, await api.creneauxList(jours[0], jours[jours.length - 1]));
    for (const { vocal, creneau } of prets) {
      if (bilanEnCoursDEcriture(creneau.id)) { differe = true; continue; }
      try {
        annoncer(vocal, await verserUnVocal(vocal, creneau));
      } catch (e) {
        toast(`Une dictée n'a pas pu être versée dans le bilan : ${texteErreur(e)}`, { icone: "⚠️", duree: 9000 });
      }
    }
    const nouveaux = sansCreneau.filter((v) => !signales.has(v.id));
    if (nouveaux.length) {
      nouveaux.forEach((v) => signales.add(v.id));
      toast(`${nouveaux.length > 1 ? `${nouveaux.length} dictées n'ont` : "Une dictée n'a"} pas trouvé de créneau : choisissez-le dans Réglages › Téléphone.`, {
        icone: "🗓", duree: 12000,
        action: { label: "Voir", faire: () => { window.dispatchEvent(new Event(EVT_VOIR_VOCAUX)); } },
      });
    }
  } catch {
    // Pas de liste : on réessaiera à la prochaine arrivée.
  } finally {
    enCours = false;
    // Un bilan en cours de frappe : on repasse une fois qu'il est enregistré.
    if (differe) setTimeout(() => { void verserCeQuiEstPret(); }, 15_000);
  }
}
