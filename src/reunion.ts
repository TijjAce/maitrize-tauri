// ── Réunions écoutées et résumées ─────────────────────────────────────────
//
// Une ESS dure une heure, on y parle vite, et l'on en ressort avec trois mots
// griffonnés. L'application écoute, découpe en tranches de cinq minutes, et
// résume chaque tranche pendant que la réunion continue : à la fin, le compte
// rendu est déjà écrit, et il ne reste qu'à le relire.
//
// Le découpage n'est pas qu'un détail technique. Cinq minutes, c'est assez
// court pour qu'un résumé arrive avant qu'on ait oublié de quoi il parle, et
// assez long pour qu'un point soit traité en entier. On voit donc avancer la
// réunion, et l'on peut couper soi-même quand un sujet se termine.
//
// Ce qui sort de l'ordinateur : l'audio de chaque tranche part chez Mistral
// pour être transcrit, puis le texte pour être résumé — prénoms d'élèves
// masqués (voir `confidentialite.ts`), remis au retour. L'audio n'est jamais
// écrit sur le disque.

import { api, type Reunion, MODELE_TACHES } from "./api";
import { pseudonymiser, restaurer } from "./confidentialite";

/** Durée d'une tranche, en secondes. */
export const TRANCHE_S = 300;

/** Les réunions d'un enseignant du premier degré, ESMS compris. */
export const GENRES = [
  "ESS",
  "Équipe éducative",
  "Réunion de synthèse",
  "Conseil de cycle",
  "Conseil des maîtres",
  "Conseil d'école",
  "Concertation",
  "Rencontre avec la famille",
  "Animation pédagogique",
  "Formation",
  "Autre réunion",
] as const;

export type Genre = (typeof GENRES)[number];

export type EtatTranche = "attente" | "transcription" | "resume" | "fait" | "echec";

/** Cinq minutes de réunion : ce qui a été dit, et ce qu'on en retient. */
export interface Tranche {
  id: string;
  /** Rang dans la réunion, à partir de 1. */
  rang: number;
  /** Bornes en secondes depuis le début de la réunion. */
  debut: number;
  fin: number;
  transcription: string;
  resume: string;
  etat: EtatTranche;
  erreur?: string;
}

/** « 00:00 → 05:00 » */
export function horodatage(t: { debut: number; fin: number }): string {
  const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.round(s % 60)).padStart(2, "0")}`;
  return `${mmss(t.debut)} → ${mmss(t.fin)}`;
}

/** « 1 h 05 » — la durée écoutée, telle qu'on la dit. */
export function dureeLisible(secondes: number): string {
  const m = Math.round(secondes / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
}

/** Ce qui reste avant la prochaine coupe. */
export function restantAvantLaCoupe(secondesDeLaTranche: number, tranche = TRANCHE_S): number {
  return Math.max(0, tranche - secondesDeLaTranche);
}

// ── Lecture et écriture des tranches ──────────────────────────────────────
//
// Une tranche encore en cours de transcription n'a pas à être enregistrée
// comme telle : si l'application se ferme entre-temps, l'audio est perdu et
// l'état « transcription en cours » ne voudrait plus rien dire au retour.

export function lireTranches(json: string): Tranche[] {
  let brut: unknown;
  try { brut = JSON.parse(json || "[]"); } catch { return []; }
  if (!Array.isArray(brut)) return [];
  return brut.flatMap((x, i): Tranche[] => {
    if (!x || typeof x !== "object") return [];
    const o = x as Record<string, unknown>;
    const nombre = (v: unknown, repli: number) => (typeof v === "number" && isFinite(v) ? v : repli);
    const texte = (v: unknown) => (typeof v === "string" ? v : "");
    const rang = nombre(o.rang, i + 1);
    const etat = texte(o.etat);
    return [{
      id: texte(o.id) || `t${rang}`,
      rang,
      debut: nombre(o.debut, (rang - 1) * TRANCHE_S),
      fin: nombre(o.fin, rang * TRANCHE_S),
      transcription: texte(o.transcription),
      resume: texte(o.resume),
      // Une tranche relue d'une ancienne session n'est plus « en cours ».
      etat: etat === "echec" ? "echec" : "fait",
      erreur: texte(o.erreur) || undefined,
    }];
  });
}

export function ecrireTranches(tranches: Tranche[]): string {
  const posables = tranches
    .filter((t) => t.etat === "fait" || t.etat === "echec")
    .map((t) => ({
      id: t.id, rang: t.rang, debut: t.debut, fin: t.fin,
      transcription: t.transcription, resume: t.resume, etat: t.etat,
      ...(t.erreur ? { erreur: t.erreur } : {}),
    }));
  return JSON.stringify(posables);
}

// ── Ce qu'on demande au modèle ────────────────────────────────────────────

/** Le résumé d'une tranche : des puces, rien d'autre. */
export function promptTranche(genre: string, titre: string, transcription: string) {
  const quoi = [genre, titre].filter(Boolean).join(" — ") || "une réunion";
  return [
    {
      role: "system" as const,
      content: [
        "Tu assistes un enseignant du premier degré pendant " + quoi + ".",
        "On te donne la transcription brute de cinq minutes de réunion : plusieurs personnes parlent, la transcription contient des hésitations et des erreurs.",
        "Rends les points importants sous forme de puces commençant par « - », une idée par puce, à l'infinitif ou en phrase courte.",
        "Garde ce qui compte pour la suite : décisions, échéances, chiffres, dispositifs cités, ce que chacun s'engage à faire.",
        "N'invente rien, n'interprète pas, n'ajoute aucun commentaire ni titre.",
        "Ignore les bavardages, les répétitions et ce qui n'a pas de suite.",
        "Si ces cinq minutes n'apportent rien (silence, hors sujet), réponds exactement : —",
        "Les marqueurs entre crochets comme [P1] remplacent des prénoms : recopie-les exactement.",
      ].join(" "),
    },
    { role: "user" as const, content: transcription },
  ];
}

/** Le compte rendu final, à partir des résumés de tranches. */
export function promptCompteRendu(r: {
  genre: string; titre: string; date: string; participants: string; resumes: string;
}) {
  const entete = [
    r.genre && `Type : ${r.genre}`,
    r.titre && `Objet : ${r.titre}`,
    r.date && `Date : ${r.date}`,
    r.participants && `Participants : ${r.participants}`,
  ].filter(Boolean).join("\n");
  return [
    {
      role: "system" as const,
      content: [
        "Tu rédiges le compte rendu d'une réunion pour un enseignant du premier degré (maternelle, élémentaire ou ESMS).",
        "On te donne les résumés successifs de la réunion, tranche par tranche, dans l'ordre.",
        "Rends un compte rendu en français, sobre et professionnel, structuré avec exactement ces titres, chacun sur sa ligne et précédé de « ## » :",
        "## Points abordés, ## Décisions, ## Ce que je dois faire, ## À revoir.",
        "Sous chaque titre, des puces commençant par « - ». Regroupe ce qui se répète d'une tranche à l'autre, garde l'ordre chronologique des sujets.",
        "Sous « Ce que je dois faire », ne mets que ce qui incombe à l'enseignant, avec l'échéance si elle a été dite.",
        "Sous « À revoir », mets ce qui est resté en suspens ou ce qui n'a pas été compris.",
        "Si une rubrique est vide, écris « - Rien à signaler ».",
        "N'invente rien : pas de nom, pas de date, pas de décision qui ne soit dans les résumés.",
        "Les marqueurs entre crochets comme [P1] remplacent des prénoms : recopie-les exactement.",
      ].join(" "),
    },
    { role: "user" as const, content: `${entete}\n\nRésumés successifs :\n${r.resumes}` },
  ];
}

/** Ce que les modèles ajoutent parfois autour de la réponse. */
export function nettoyer(rep: string): string {
  return rep.trim().replace(/^```[a-z]*\n?|\n?```$/g, "").trim();
}

/** Un résumé vide, ou le tiret que le modèle renvoie quand il n'y a rien. */
export function riendedit(resume: string): boolean {
  return !resume.trim() || /^[-—–.\s]*$/.test(resume.trim());
}

// ── Les appels à l'IA ─────────────────────────────────────────────────────

/** Les prénoms de la classe, pour les masquer avant l'envoi du texte. */
async function nomsDesEleves(): Promise<string[]> {
  return api.elevesList().then((l) => l.map((e) => e.nom)).catch(() => []);
}

/**
 * Masque les noms d'élèves dans **tout** ce qui part, d'un seul tenant.
 *
 * L'objet d'une réunion s'écrit « ESS de Camille Bernard » : le titre part
 * dans la consigne, et il aurait suffi de masquer la transcription pour que
 * le nom sorte quand même. On masque donc les morceaux ensemble, avec une
 * seule table — [P1] désigne alors la même personne dans le titre et dans le
 * texte, ce qu'un masquage séparé ne garantirait pas.
 */
const SEPARE = "\u0000";
function masquerTout(morceaux: string[], noms: string[]) {
  const { texte, table } = pseudonymiser(morceaux.join(SEPARE), noms);
  const parts = texte.split(SEPARE);
  return { parts: morceaux.map((_, i) => parts[i] ?? ""), table };
}

/**
 * Résume une tranche. La transcription arrive de l'audio (déjà partie chez
 * Mistral) ; pour le résumé, les prénoms connus sont masqués et remis ici.
 */
export async function resumerTranche(
  transcription: string,
  contexte: { genre: string; titre: string },
): Promise<string> {
  if (!transcription.trim()) return "";
  const { parts, table } = masquerTout([contexte.titre, transcription], await nomsDesEleves());
  const [titre, masque] = parts;
  const modele = await api.modeleActif(MODELE_TACHES);
  const rep = await api.mistralChat(promptTranche(contexte.genre, titre, masque), modele);
  const propre = nettoyer(rep);
  return restaurer(propre, table).texte;
}

/** Rédige le compte rendu à partir des résumés déjà obtenus. */
export async function redigerCompteRendu(
  reunion: Pick<Reunion, "genre" | "titre" | "date" | "participants">,
  tranches: Tranche[],
): Promise<string> {
  const utiles = tranches.filter((t) => !riendedit(t.resume));
  if (!utiles.length) throw new Error("Aucun résumé à assembler.");
  const resumes = utiles.map((t) => `[${horodatage(t)}]\n${t.resume.trim()}`).join("\n\n");
  // Le titre et les participants partent aussi : ils se masquent avec le reste.
  const { parts, table } = masquerTout(
    [reunion.titre, reunion.participants, resumes], await nomsDesEleves());
  const [titre, participants, masque] = parts;
  const modele = await api.modeleActif();
  const rep = await api.mistralChat(promptCompteRendu({
    genre: reunion.genre, titre, date: reunion.date,
    participants, resumes: masque,
  }), modele);
  const propre = nettoyer(rep);
  if (!propre) throw new Error("La réponse de l'IA est vide.");
  return restaurer(propre, table).texte;
}

// ── Ce qu'on emporte : texte à copier, page à imprimer ────────────────────

/** Le compte rendu tel qu'on le colle dans un courriel. */
export function texteACopier(r: Reunion, tranches: Tranche[]): string {
  const entete = [
    r.titre || r.genre || "Réunion",
    [r.genre, r.date, r.dureeS ? dureeLisible(r.dureeS) : ""].filter(Boolean).join(" · "),
    r.participants ? `Participants : ${r.participants}` : "",
  ].filter(Boolean).join("\n");
  const corps = r.compteRendu.trim()
    || tranches.filter((t) => !riendedit(t.resume))
      .map((t) => `[${horodatage(t)}]\n${t.resume.trim()}`).join("\n\n");
  return `${entete}\n\n${corps}\n`;
}

/** Le titre d'une réunion dans la liste — jamais vide. */
export function nomDeLaReunion(r: { titre: string; genre: string; date: string }): string {
  return r.titre.trim() || r.genre.trim() || "Réunion";
}
