// Cahier journal : ce qui se reprend d'une semaine à l'autre, et ce qui part
// au dossier d'un élève.
//
// Les emplois du temps reviennent chaque semaine : le « prévu » d'un créneau
// ressemble souvent à celui de la semaine d'avant. Et le bilan d'un créneau
// parle d'élèves : ce qui y est écrit a sa place dans leur dossier, sans le
// retaper.

import type { Creneau, Eleve } from "./api";

/** Pour comparer deux intitulés ou prénoms : sans accents ni majuscules. */
const cle = (s: string) => (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/**
 * Le même créneau la semaine précédente, parmi ceux de ce jour-là : même
 * intitulé à la même heure d'abord, puis même intitulé, puis même heure. Seuls
 * comptent ceux où quelque chose était prévu.
 */
export function creneauDeLaSemainePrecedente(
  c: Pick<Creneau, "id" | "heureDebut" | "matiere">, candidats: Creneau[],
): Creneau | null {
  const avecPrevu = candidats.filter((x) => x.id !== c.id && (x.prevu ?? "").trim());
  const memeIntitule = (x: Creneau) => cle(c.matiere) !== "" && cle(x.matiere) === cle(c.matiere);
  return avecPrevu.find((x) => memeIntitule(x) && x.heureDebut === c.heureDebut)
    ?? avecPrevu.find(memeIntitule)
    ?? avecPrevu.find((x) => x.heureDebut === c.heureDebut)
    ?? null;
}

/** Le prévu repris vient à la suite de ce qui est déjà écrit, jamais à sa place. */
export function reprendrePrevu(actuel: string, repris: string): string {
  const r = repris.trim();
  if (!actuel.trim()) return r;
  if (actuel.includes(r)) return actuel;
  return `${actuel.replace(/\s+$/, "")}\n${r}`;
}

/**
 * Les élèves cochés d'office : le seul présent sur le créneau, sinon ceux dont
 * le prénom figure dans le texte.
 */
export function elevesCites(texte: string, eleves: Eleve[], presents: string[]): string[] {
  const parmi = presents.length ? eleves.filter((e) => presents.includes(e.id)) : eleves;
  if (presents.length === 1 && parmi.length === 1) return [parmi[0].id];
  const mots = ` ${cle(texte).replace(/[^a-z0-9]+/g, " ")} `;
  return parmi
    .filter((e) => {
      const prenom = cle(e.nom.split(/\s+/)[0] ?? "").replace(/[^a-z0-9]+/g, " ").trim();
      return prenom.length > 1 && mots.includes(` ${prenom} `);
    })
    .map((e) => e.id);
}

// ── Manuels cités, et images posées dans le prévu ─────────────────────────
//
// Un manuel du coffre-fort se cite comme un jeu ou une séquence : une ligne
// « 📖 Cap Maths CE1 · p. 42 », et, si l'on a découpé l'exercice, son image
// juste dessous. L'image est un fichier de Maitrize, dont le texte ne garde
// que le nom, comme dans le déroulement d'une séance.

/** Le marqueur d'une image dans un texte du cahier journal. */
export const marqueurImage = (nom: string) => `[img:${nom}]`;
const RE_IMAGE = /\[img:([^\]]+)\]/g;

/** La ligne qui cite un manuel, avec sa page et, s'il y en a un, le passage. */
export function ligneDeManuel(manuel: string, page: number, passage = ""): string {
  const titre = (manuel ?? "").trim() || "Manuel";
  const p = Number.isFinite(page) && page > 0 ? ` · p. ${Math.round(page)}` : "";
  const dit = passage.replace(/\s+/g, " ").trim();
  return `📖 ${titre}${p}${dit ? ` — « ${dit} »` : ""}`;
}

/**
 * La ligne qui cite déjà ce manuel à cette page, passage compris. L'image
 * découpée s'y accroche, plutôt que d'ajouter une seconde ligne identique.
 */
export function ligneDuManuel(texte: string, manuel: string, page: number): string | null {
  const debut = ligneDeManuel(manuel, page);
  return (texte ?? "").split("\n").find((l) => l.trim() === debut || l.trim().startsWith(`${debut} —`)) ?? null;
}

/**
 * La ligne qui pose une compétence travaillée : « 🎯 Lire les nombres jusqu'à
 * 100 (Cycle 2) ». Le référentiel entre parenthèses dit d'où elle vient.
 */
export function ligneDeCompetence(titre: string, referentiel = "", niveau = ""): string {
  const quoi = (niveau.trim() ? `[${niveau.trim()}] ` : "") + (titre ?? "").replace(/\s+/g, " ").trim();
  if (!quoi) return "";
  const ou = referentiel.trim();
  return `🎯 ${quoi}${ou ? ` (${ou})` : ""}`;
}

/** Les images posées dans un texte, dans l'ordre, sans doublon. */
export function imagesDuTexte(texte: string): string[] {
  const vues = new Set<string>();
  for (const m of (texte ?? "").matchAll(RE_IMAGE)) vues.add(m[1]);
  return [...vues];
}

/** Retire une image du texte, sans laisser de ligne vide à sa place. */
export function retirerImage(texte: string, nom: string): string {
  const marqueur = marqueurImage(nom);
  const sortie: string[] = [];
  for (const ligne of (texte ?? "").split("\n")) {
    if (!ligne.includes(marqueur)) { sortie.push(ligne); continue; }
    const reste = ligne.split(marqueur).join("").replace(/[ \t]+$/, "");
    // Une ligne qui ne portait que cette image disparaît ; sinon son texte reste.
    if (reste.trim()) sortie.push(reste);
  }
  return sortie.join("\n");
}

/**
 * Pose une image à la suite d'une ligne (celle du manuel, en général), ou à la
 * fin du texte.
 */
export function poserImage(texte: string, nom: string, apres = ""): string {
  const marqueur = marqueurImage(nom);
  if ((texte ?? "").includes(marqueur)) return texte;
  const lignes = (texte ?? "").split("\n");
  const i = apres ? lignes.findIndex((l) => l.trim() === apres.trim()) : -1;
  if (i < 0) return `${(texte ?? "").replace(/\s+$/, "")}${texte.trim() ? "\n" : ""}${marqueur}`;
  lignes.splice(i + 1, 0, marqueur);
  return lignes.join("\n");
}

/** Date d'une observation tirée d'un créneau : la fin du créneau, ce jour-là. */
export function dateObservation(c: Pick<Creneau, "date" | "heureFin">): string {
  const heure = /^\d\d:\d\d$/.test(c.heureFin) ? c.heureFin : "12:00";
  const d = new Date(`${c.date.slice(0, 10)}T${heure}:00`);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}
