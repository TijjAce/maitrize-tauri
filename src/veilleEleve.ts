// ── La veille sur un élève ────────────────────────────────────────────────
//
// Ce qu'on écrit sur un élève se disperse : une observation ici, une phrase
// dans le bilan d'un créneau, une ligne dans un compte rendu d'ESS, un
// objectif du PPI coché un mardi. Au moment de faire la synthèse, on se
// souvient de la semaine écoulée et l'on oublie octobre.
//
// Ce module ramasse tout ce qui a été écrit sur un élève, où que ce soit,
// dit ce qui est arrivé depuis la dernière synthèse, et prépare ce qu'on
// envoie pour la rédiger.
//
// Deux règles tiennent l'ensemble :
//   • on ne retient d'un texte de groupe que les phrases qui nomment l'élève,
//     pour ne pas verser la classe entière dans son dossier ;
//   • les camarades cités deviennent « un camarade », et le prénom de l'élève
//     lui-même est masqué avant l'envoi puis remis ici (confidentialite.ts).

import type { CommentaireEleve, Creneau, Reunion } from "./api";
import { api } from "./api";
import { normaliser } from "./competencesTravaillees";
import { pseudonymiser, restaurer } from "./confidentialite";
import { lireResumes, lireTranches, riendedit } from "./reunion";
import { SECTIONS_SYNTHESE, sansAutresEleves, type Section, type SyntheseEleve } from "./synthese";

/** D'où vient un écrit — pour que l'enseignant puisse aller le relire. */
export type Origine = "observation" | "journal" | "reunion";

export interface Ecrit {
  origine: Origine;
  /** AAAA-MM-JJ. */
  date: string;
  texte: string;
  /** Ce qu'on affiche : « Observation (langage) », « Cahier journal — Maths »… */
  source: string;
}

const jour = (iso: string) => (iso || "").slice(0, 10);
/**
 * Ce qui colle à un prénom et en fait un autre mot.
 *
 * Le trait d'union et l'apostrophe en font partie : « Camille-Rose » est une
 * autre élève que « Rose », et lui attribuer ses réussites serait pire qu'un
 * oubli.
 */
const LETTRE = /[\p{L}\p{N}'’-]/u;

/** Le prénom, tel qu'on le cherche dans un texte. */
export const prenomDe = (nom: string) => nom.trim().split(/\s+/)[0] ?? "";

/**
 * Le texte nomme-t-il cette personne ?
 *
 * Mot entier et initiale majuscule : « Rose a rangé » parle d'une élève,
 * « une fleur rose » non. Même règle que le masquage des noms, pour que ce
 * qui est repéré ici soit bien ce qui sera masqué avant l'envoi.
 */
export function citeLePrenom(texte: string, prenom: string): boolean {
  if (!prenom) return false;
  const bas = texte.toLocaleLowerCase("fr");
  const cible = prenom.toLocaleLowerCase("fr");
  let i = bas.indexOf(cible);
  while (i >= 0) {
    const avant = i > 0 ? texte[i - 1] : "";
    const apres = texte[i + cible.length] ?? "";
    const initiale = texte[i];
    if (!LETTRE.test(avant) && !LETTRE.test(apres)
        && initiale === initiale.toLocaleUpperCase("fr") && initiale !== initiale.toLocaleLowerCase("fr")) {
      return true;
    }
    i = bas.indexOf(cible, i + 1);
  }
  return false;
}

/**
 * Les phrases d'un texte de groupe qui parlent de l'élève.
 *
 * Un bilan de créneau raconte six élèves : en verser l'intégralité dans la
 * synthèse de l'un d'eux serait faux, et indiscret pour les cinq autres.
 */
export function phrasesQuiCitent(texte: string, prenom: string): string {
  // Découpage à la main : la recherche en arrière (lookbehind) plante les
  // webviews de macOS 11, et c'est la seule façon simple de couper « après »
  // un point sans le perdre.
  const phrases: string[] = [];
  let courante = "";
  for (const ch of texte) {
    if (ch === "\n") { phrases.push(courante); courante = ""; continue; }
    courante += ch;
    if (".!?…".includes(ch)) { phrases.push(courante); courante = ""; }
  }
  phrases.push(courante);
  return phrases.map((p) => p.trim()).filter((p) => p && citeLePrenom(p, prenom)).join(" ");
}

// ── Le ramassage, source par source ───────────────────────────────────────

/** Les observations portées au dossier de l'élève. La santé n'en est pas. */
export function ecritsDesObservations(observations: CommentaireEleve[], eleveId: string): Ecrit[] {
  return observations
    .filter((o) => o.eleveId === eleveId && o.type !== "santé" && o.texte.trim())
    .map((o) => ({ origine: "observation" as const, date: jour(o.date), texte: o.texte.trim(),
      source: `Observation (${o.type})` }));
}

/**
 * Ce que le cahier journal dit de l'élève.
 *
 * On lit le bilan et le prévu des créneaux où il était, et l'on n'en garde
 * que les phrases qui le nomment : le reste appartient au groupe.
 */
export function ecritsDuJournal(creneaux: Creneau[], eleveId: string, prenom: string): Ecrit[] {
  const ecrits: Ecrit[] = [];
  for (const c of creneaux) {
    if (c.nature === "reunion") continue;
    let presents: string[] = [];
    try { presents = JSON.parse(c.elevesJson || "[]"); } catch { presents = []; }
    // Soit il était inscrit sur le créneau, soit son prénom y est écrit :
    // un bilan qui le nomme compte, même si la liste n'a pas été cochée.
    const concerne = presents.includes(eleveId);
    for (const [champ, texte] of [["bilan", c.bilan], ["prévu", c.prevu]] as const) {
      const brut = (texte ?? "").trim();
      if (!brut) continue;
      const part = phrasesQuiCitent(brut, prenom);
      if (!part) continue;
      if (!concerne && !citeLePrenom(brut, prenom)) continue;
      ecrits.push({
        origine: "journal", date: jour(c.date), texte: part,
        source: `Cahier journal${c.matiere ? ` — ${c.matiere}` : ""}${champ === "prévu" ? " (prévu)" : ""}`,
      });
    }
  }
  return ecrits;
}

/** Ce qu'une réunion a dit de lui : compte rendu, ou résumés de tranches. */
export function ecritsDesReunions(reunions: Reunion[], prenom: string): Ecrit[] {
  const ecrits: Ecrit[] = [];
  for (const r of reunions) {
    const morceaux: string[] = [];
    if (r.compteRendu.trim()) morceaux.push(r.compteRendu);
    else {
      // Les résumés d'aujourd'hui, ou les tranches des réunions d'avant.
      const resumes = lireResumes(r.resumesJson).map((x) => x.texte)
        .concat(lireTranches(r.tranchesJson).map((t) => t.resume));
      for (const texte of resumes) if (!riendedit(texte)) morceaux.push(texte);
    }
    const part = morceaux.map((m) => phrasesQuiCitent(m, prenom)).filter(Boolean).join(" ");
    if (!part) continue;
    ecrits.push({
      origine: "reunion", date: jour(r.date),
      texte: part,
      source: `Réunion — ${r.genre || "réunion"}${r.titre.trim() ? ` « ${r.titre.trim()}` + " »" : ""}`,
    });
  }
  return ecrits;
}

/** Tout ce qui est écrit sur l'élève, du plus récent au plus ancien. */
export function rassembler(sources: {
  observations: CommentaireEleve[];
  creneaux: Creneau[];
  reunions: Reunion[];
  eleveId: string;
  nom: string;
}): Ecrit[] {
  const prenom = prenomDe(sources.nom);
  return [
    ...ecritsDesObservations(sources.observations, sources.eleveId),
    ...ecritsDuJournal(sources.creneaux, sources.eleveId, prenom),
    ...ecritsDesReunions(sources.reunions, prenom),
  ].sort((a, b) => b.date.localeCompare(a.date));
}

/** Ceux arrivés depuis la dernière synthèse (tous, si elle n'a jamais été faite). */
export function nouveauxDepuis(ecrits: Ecrit[], vuLe: string | undefined): Ecrit[] {
  if (!vuLe) return ecrits;
  return ecrits.filter((e) => e.date > jour(vuLe));
}

const PLURIEL: Record<Origine, [string, string]> = {
  observation: ["observation", "observations"],
  journal: ["passage du cahier journal", "passages du cahier journal"],
  reunion: ["compte rendu de réunion", "comptes rendus de réunion"],
};

/** « 5 observations, 2 passages du cahier journal » — ce qui est arrivé. */
export function resumeDesEcrits(ecrits: Ecrit[]): string {
  const ordre: Origine[] = ["observation", "journal", "reunion"];
  return ordre
    .map((o) => [o, ecrits.filter((e) => e.origine === o).length] as const)
    .filter(([, n]) => n > 0)
    .map(([o, n]) => `${n} ${PLURIEL[o][n > 1 ? 1 : 0]}`)
    .join(", ");
}

// ── Ce qu'on envoie, et ce qui revient ────────────────────────────────────

const fmt = (iso: string) => { const [a, m, j] = (iso || "").split("-"); return a && m && j ? `${j}/${m}/${a}` : "sans date"; };

/** Les écrits mis en forme pour le modèle : datés, sourcés, coupés s'ils sont longs. */
export function dossierDesEcrits(ecrits: Ecrit[], maximum = 60, parEcrit = 400): string {
  return ecrits.slice(0, maximum)
    .map((e) => `- ${fmt(e.date)} · ${e.source} : ${e.texte.length > parEcrit ? e.texte.slice(0, parEcrit - 1).trimEnd() + "…" : e.texte}`)
    .join("\n");
}

export function promptSynthese(a: { ecrits: string; suivi: string; periode: string; contexte: string }) {
  return [
    {
      role: "system" as const,
      content: [
        "Tu aides un enseignant du premier degré à rédiger la synthèse d'un élève.",
        a.contexte,
        "On te donne tout ce que l'enseignant a écrit sur cet élève pendant la période — observations, passages du cahier journal, comptes rendus de réunion — et un relevé de son suivi (compétences, évaluations).",
        "Rends un texte en français, structuré avec ces titres précédés de « ## » :",
        "## Bilan, puis un titre par domaine concerné parmi : " + SECTIONS_SYNTHESE.map((s) => s.titre).join(" | ") + ".",
        "N'écris un domaine que si les écrits en disent quelque chose : mieux vaut trois domaines nourris que sept vides.",
        "Sous « Bilan », cinq à dix lignes : où en est l'élève, ce qui a progressé pendant la période, ce qui reste difficile.",
        "Sous chaque domaine, des phrases rédigées, jamais de puces sèches, et appuyées sur des faits datés.",
        "Règles : n'invente aucun fait, aucune date, aucun diagnostic. Ne parle pas de santé, de famille ni d'orientation.",
        "Reste descriptif et bienveillant : ce texte peut être lu par la famille. Pas de jargon, pas d'étiquette sur l'élève.",
        "Les camarades sont « un camarade » : ne cherche pas à les nommer.",
        "Le marqueur [P1] remplace le prénom de l'élève : recopie-le exactement, à chaque fois.",
      ].join(" "),
    },
    {
      role: "user" as const,
      content: [
        `Période : ${a.periode}`,
        "",
        "Ce qui a été écrit sur l'élève :",
        a.ecrits || "rien",
        "",
        "Relevé du suivi :",
        a.suivi || "rien",
      ].join("\n"),
    },
  ];
}

/** La réponse du modèle, découpée en bilan et sections de la synthèse. */
export function lireSyntheseRedigee(reponse: string): { bilan: string; sections: Partial<Record<Section, string>> } {
  const parTitre = new Map<string, Section>(
    SECTIONS_SYNTHESE.map((s) => [normaliser(s.titre), s.id]),
  );
  const sections: Partial<Record<Section, string>> = {};
  let bilan = "";
  let courante: Section | "bilan" | null = null;
  const morceaux: string[] = [];
  const vider = () => {
    const texte = morceaux.join("\n").trim();
    morceaux.length = 0;
    if (!texte || !courante) return;
    if (courante === "bilan") bilan = texte;
    else sections[courante] = texte;
  };
  for (const ligne of reponse.split("\n")) {
    const titre = ligne.match(/^\s*#{1,3}\s*(.+?)\s*$/);
    if (titre) {
      vider();
      const t = normaliser(titre[1]);
      if (t.startsWith("bilan")) { courante = "bilan"; continue; }
      // Le modèle raccourcit parfois le titre : « Mathématiques » pour
      // « Mathématiques — … ». On accepte le début du titre officiel.
      courante = parTitre.get(t)
        ?? SECTIONS_SYNTHESE.find((s) => normaliser(s.titre).startsWith(t) || t.startsWith(normaliser(s.titre)))?.id
        ?? null;
      continue;
    }
    if (courante) morceaux.push(ligne);
  }
  vider();
  return { bilan, sections };
}

/**
 * Rédige la synthèse à partir de tout ce qui est écrit.
 *
 * Les camarades disparaissent avant l'envoi, le prénom de l'élève part masqué
 * et revient ici : ce qui sort de l'ordinateur est un texte sans nom.
 */
export async function redigerSyntheseSuivie(a: {
  eleve: { id: string; nom: string };
  autresEleves: string[];
  ecrits: Ecrit[];
  suivi: string;
  periode: string;
}): Promise<{ bilan: string; sections: Partial<Record<Section, string>> }> {
  if (!a.ecrits.length && !a.suivi.trim()) {
    throw new Error("Rien n'a encore été écrit sur cet élève pour cette période.");
  }
  const reglages = await api.settingsAll().catch(() => ({} as Record<string, string>));
  const contexte = reglages.typeStructure === "ime" || reglages["edt:mode"] === "ime"
    ? "L'enseignant exerce en ESMS (IME) : la synthèse décrit les progrès d'élèves en situation de handicap, sans les comparer à une norme d'âge."
    : "";

  const sansCamarades = (t: string) => sansAutresEleves(t, a.autresEleves);
  const ecrits = sansCamarades(dossierDesEcrits(a.ecrits));
  const suivi = sansCamarades(a.suivi);
  const { texte: masque, table } = pseudonymiser(`${ecrits} ${suivi}`, [a.eleve.nom]);
  const [ecritsMasques, suiviMasque] = masque.split(" ");

  const modele = await api.modeleActif();
  const rep = await api.mistralChat(promptSynthese({
    ecrits: ecritsMasques, suivi: suiviMasque ?? "", periode: a.periode, contexte,
  }), modele);
  const propre = restaurer(rep.trim(), table).texte;
  const lu = lireSyntheseRedigee(propre);
  if (!lu.bilan && !Object.keys(lu.sections).length) {
    throw new Error("La réponse de l'IA n'était pas exploitable.");
  }
  return lu;
}

/** La synthèse mise à jour, sans écraser ce que l'enseignant a écrit lui-même. */
export function poserLaRedaction(
  synthese: SyntheseEleve,
  redige: { bilan: string; sections: Partial<Record<Section, string>> },
  remplacer: boolean,
): SyntheseEleve {
  const sections = { ...synthese.sections };
  for (const [id, texte] of Object.entries(redige.sections) as [Section, string][]) {
    if (!texte.trim()) continue;
    if (!remplacer && (sections[id] ?? "").trim()) continue;
    sections[id] = texte.trim();
  }
  const bilan = redige.bilan.trim() && (remplacer || !synthese.bilan.trim()) ? redige.bilan.trim() : synthese.bilan;
  return { ...synthese, bilan, sections, vuLe: new Date().toISOString() };
}
