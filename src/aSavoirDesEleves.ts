// « À savoir » sur chaque élève, dans la feuille de la personne qui remplace.
//
// L'enseignant l'a demandé (31 octobre 2026) : un agent va chercher ce qu'on
// sait de l'élève — sa synthèse pour l'enseignant d'abord, puis tout ce que lit
// l'agent de synthèse : observations, temps d'observation, cahier journal,
// suivi, plans et projets — et en tire, en cinq phrases au plus, ce qu'il faut
// savoir pour l'accueillir une journée : la communication et le langage, le
// social, l'autonomie et la vie quotidienne, son niveau, le comportement et la
// régulation.
//
// Comme pour la synthèse : ni la santé, ni la famille, ni l'orientation ; les
// camarades s'effacent, le prénom de l'élève et les adultes partent masqués.
// Un élève dont on ne sait encore rien ne coûte pas d'appel.

import { api, type ChatMessage, type Eleve } from "./api";
import { lireLEleve } from "./agentSynthese";
import { nomDeStructure, structureDe } from "./classe";
import { normaliser } from "./competencesTravaillees";
import { restaurer } from "./confidentialite";
import { nomsAMasquer } from "./nomsAMasquer";
import type { PointASavoir } from "./remplacant";
import { SECTIONS_SYNTHESE, TYPE_DOC_SYNTHESE, sansAutresEleves } from "./synthese";
import { dossierDesEcrits, masquerLEleveEtLesAdultes } from "./veilleEleve";

/** Les cinq points, dans l'ordre de la feuille ; le motif reconnaît le point dans la réponse du modèle, sans accents. */
export const POINTS_A_SAVOIR: { point: string; motif: RegExp }[] = [
  { point: "Communication / langage", motif: /communication|langage|parole|s'exprim/ },
  { point: "Social", motif: /social|relation|camarade/ },
  { point: "Autonomie / vie quotidienne", motif: /autonomie|vie quotidienne|quotidien/ },
  { point: "Niveau", motif: /niveau|apprentissage/ },
  { point: "Comportement / régulation", motif: /comportement|regulation|emotion/ },
];

/** La synthèse enregistrée de l'élève, en texte : son bilan, puis chaque domaine écrit. */
export function texteDeLaSynthese(brut: string | null | undefined): string {
  let v: { bilan?: unknown; sections?: Record<string, unknown> } | null = null;
  try { v = JSON.parse(brut || "null"); } catch { return ""; }
  if (!v || typeof v !== "object") return "";
  const lignes: string[] = [];
  if (typeof v.bilan === "string" && v.bilan.trim()) lignes.push(`Bilan : ${v.bilan.trim()}`);
  for (const s of SECTIONS_SYNTHESE) {
    const t = v.sections?.[s.id];
    if (typeof t === "string" && t.trim()) lignes.push(`${s.titre} : ${t.trim()}`);
  }
  return lignes.join("\n");
}

export function promptASavoir(a: { connu: string; niveau: string; contexte: string }): ChatMessage[] {
  return [
    {
      role: "system",
      content: [
        "Tu aides un enseignant du premier degré à préparer la feuille de la personne qui va le remplacer.",
        "Pour un élève, tu écris ce qu'il faut savoir pour bien l'accueillir et le faire travailler une journée sans son enseignant.",
        a.contexte,
        "On te donne ce que l'enseignant sait de l'élève : sa synthèse, ce qu'il a écrit sur lui, son suivi et ses plans (PAP, PPRE, PPS, PPI, GEVA-Sco).",
        "Réponds par cinq lignes au plus, une par point, dans cet ordre, chacune commençant par le nom du point suivi de deux-points :",
        POINTS_A_SAVOIR.map((p) => `« ${p.point} : »`).join(", ") + ".",
        "Une seule phrase par ligne, courte et concrète, qui dit à la personne ce qu'elle doit savoir ou faire :",
        "comment l'élève s'exprime et ce qui l'aide à comprendre ; comment il est avec les camarades et les adultes ;",
        "ce qu'il fait seul et ce pour quoi il a besoin d'aide ; où il en est dans ses apprentissages ; ce qui le met en difficulté et ce qui l'apaise.",
        "Si ce qu'on te donne ne dit rien d'un point, saute sa ligne. Pas de titre, pas de liste à puces, pas de gras.",
        "Règles : n'invente rien. Ne parle pas de santé, de traitement, de famille ni d'orientation ; pas de diagnostic, pas d'étiquette sur l'élève.",
        "Reste bienveillant : la feuille sort de l'école et passe de main en main.",
        "N'écris pas le prénom de l'élève : la ligne du tableau le donne déjà. Le marqueur [P1] le remplace dans ce qu'on te donne.",
        "Les marqueurs [P2], [P3]… remplacent des adultes : ne les cite pas. Les camarades sont « un camarade ».",
      ].filter(Boolean).join(" "),
    },
    {
      role: "user",
      content: [`Classe de l'élève : ${a.niveau || "non précisée"}`, "", "Ce que l'enseignant sait de l'élève :", a.connu].join("\n"),
    },
  ];
}

/** La première phrase d'un texte, avec sa majuscule et son point. */
function premierePhrase(t: string): string {
  const net = t.trim();
  const m = net.match(/^[\s\S]*?[.!?…](?=\s|$)/);
  const phrase = (m ? m[0] : net).trim();
  if (!phrase) return "";
  const majuscule = phrase.charAt(0).toUpperCase() + phrase.slice(1);
  return /[.!?…]$/.test(majuscule) ? majuscule : `${majuscule}.`;
}

/**
 * Les points de la réponse : une ligne « Point : phrase » chacun — puces,
 * numéros et gras tolérés —, la première phrase seulement, dans l'ordre de la
 * feuille ; cinq au plus, un par point.
 */
export function lireASavoir(reponse: string): PointASavoir[] {
  const trouves = new Map<string, string>();
  for (const brute of reponse.split("\n")) {
    const ligne = brute.replace(/[*_]{2}/g, "").replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim();
    const m = ligne.match(/^([^:]{2,40}?)\s*:\s*(.+)$/);
    if (!m) continue;
    const p = POINTS_A_SAVOIR.find((x) => x.motif.test(normaliser(m[1])));
    if (!p || trouves.has(p.point)) continue;
    const phrase = premierePhrase(m[2]);
    if (phrase.length > 1) trouves.set(p.point, phrase);
  }
  return POINTS_A_SAVOIR.filter((p) => trouves.has(p.point)).map((p) => ({ point: p.point, texte: trouves.get(p.point)! }));
}

/**
 * Ce qu'il faut savoir d'un élève : l'agent lit tout ce qu'on sait de lui sur
 * la période, sa synthèse en tête, puis Mistral le dit en cinq phrases au
 * plus. Rien quand on ne sait rien de plus que sa classe.
 */
export async function redigerASavoir(a: {
  eleve: Pick<Eleve, "id" | "nom" | "niveau" | "nonVerbal">;
  autresEleves: string[];
  debut: string; fin: string;
}): Promise<PointASavoir[]> {
  const [lu, synthese] = await Promise.all([
    lireLEleve({ eleve: a.eleve, autresEleves: a.autresEleves, debut: a.debut, fin: a.fin, pas: 0 }),
    api.documentEleveGet(a.eleve.id, TYPE_DOC_SYNTHESE).catch(() => null).then(texteDeLaSynthese),
  ]);
  // La ligne « Dossier — » dit sa classe, et s'il ne parle pas : seule, elle ne vaut pas un appel.
  const plans = lu.plans.split("\n").filter((l) => l.trim() && !l.startsWith("Dossier —")).join("\n");
  if (!synthese && !lu.ecrits.length && !lu.suivi.trim() && !plans) {
    return a.eleve.nonVerbal ? [{ point: POINTS_A_SAVOIR[0].point, texte: "Ne s'exprime pas oralement." }] : [];
  }

  const connu = [
    synthese && `Sa synthèse, écrite pour l'enseignant :\n${synthese}`,
    lu.ecrits.length > 0 && `Ce qui a été écrit sur l'élève :\n${dossierDesEcrits(lu.ecrits, 40, 300)}`,
    lu.suivi.trim() && `Relevé du suivi :\n${lu.suivi.trim()}`,
    lu.plans.trim() && `Dossier, plans et projets :\n${lu.plans.trim()}`,
  ].filter(Boolean).join("\n\n");

  const reglages = await api.settingsAll().catch(() => ({} as Record<string, string>));
  const structure = nomDeStructure(structureDe(reglages));
  const contexte = structure
    ? `L'enseignant exerce en ${structure} : ses élèves ont des besoins éducatifs particuliers ; dis où en est l'élève, sans le comparer à une norme d'âge.`
    : "";
  // Les camarades disparaissent ; l'élève devient [P1], les adultes nommés [P2], [P3]…
  const eleves = new Set([a.eleve.nom, ...a.autresEleves]);
  const adultes = (await nomsAMasquer()).filter((n) => !eleves.has(n));
  const { texte: masque, table } = masquerLEleveEtLesAdultes(sansAutresEleves(connu, a.autresEleves), a.eleve.nom, adultes);
  const rep = await api.mistralChat(promptASavoir({ connu: masque, niveau: a.eleve.niveau, contexte }), await api.modeleActif());
  return lireASavoir(restaurer(rep.trim(), table).texte);
}
