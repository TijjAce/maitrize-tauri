// Les manuels : des pages photographiées ou un PDF, les exercices que
// l'enseignant y encadre, et le modèle simplifié qu'on en tire.
//
// Un manuel scolaire est fait pour la classe entière ; ses exercices sont
// bons, leur présentation surcharge. On le photographie page après page avec
// le téléphone (ou l'on importe son PDF). L'enseignant encadre lui-même un
// exercice sur la page : c'est lui qui sait ce qui en fait un. Le modèle lit
// l'encadré, et n'est là que pour en tirer un modèle simplifié — consigne
// courte, moins d'items, un exemple, de la place pour répondre. L'enseignant
// met sur l'exercice la compétence du BO qu'il veut, et le retrouve dans les
// séquences qui la visent, prêt à poser dans une séance. Le manuel reste sur
// cet ordinateur ; seul l'encadré part chez le modèle, quand on le lui donne.

import type { ChatMessage } from "./api";
import type { CompetenceSelectionnee } from "./components/CompetenceTree";
import { lireCompetencesAtelier } from "./ateliersCompetences";
import { escapeHtml } from "./print";

export const CLE_INDEX = "manuels:index";
export const cleManuel = (id: string) => `manuel:${id}`;

export type SourceManuel = "telephone" | "pdf";
export type TypeExercice = "calcul" | "probleme" | "lecture" | "ecriture" | "langue" | "question" | "autre";

export const TYPES_EXERCICE: { id: TypeExercice; libelle: string; icone: string }[] = [
  { id: "calcul", libelle: "calcul", icone: "🔢" },
  { id: "probleme", libelle: "problème", icone: "🧩" },
  { id: "lecture", libelle: "lecture", icone: "📖" },
  { id: "ecriture", libelle: "écriture", icone: "✏️" },
  { id: "langue", libelle: "étude de la langue", icone: "🔤" },
  { id: "question", libelle: "questions", icone: "❓" },
  { id: "autre", libelle: "autre", icone: "📄" },
];

/** Un rectangle sur l'image d'une page, en fractions de sa largeur et de sa hauteur (0…1). */
export interface Zone { x: number; y: number; l: number; h: number }

export interface ExerciceManuel {
  id: string;
  /** Le numéro tel qu'il est écrit : « 3 », « 4 ★ », « Pour commencer ». */
  numero: string;
  /** Le titre de l'exercice, quand il en a un : « J'accorde l'adjectif avec le nom ». */
  titre: string;
  /** Ce que l'élève doit faire : toutes les consignes, une par ligne. */
  consigne: string;
  /** Les items, données, texte : ce sur quoi porte la consigne. */
  contenu: string;
  type: TypeExercice;
  /** L'encadré que l'enseignant a tracé sur la page. */
  zone?: Zone;
  /** Les compétences du BO que l'enseignant met sur l'exercice. */
  competences: CompetenceSelectionnee[];
  /** Le modèle simplifié, tel que le modèle l'a fait et que l'enseignant l'a corrigé. */
  modele?: ModeleSimplifie;
}

export interface PageManuel {
  id: string;
  numero: number;
  /** L'image de la page dans Fichiers/ ; vide pour une page de PDF. */
  fichier: string;
  exercices: ExerciceManuel[];
}

export interface Manuel {
  id: string;
  titre: string;
  source: SourceManuel;
  /** Le PDF dans Fichiers/, pour un manuel importé. */
  fichierPdf: string;
  niveau: string;
  pages: PageManuel[];
  creeLe: string;
  /** Le PDF du manuel posé sur le bureau : on le remplace au lieu d'en poser un second. */
  surLeBureau?: { materielId: string; fichier: string };
}

/** Ce que l'index retient d'un manuel, pour la liste. */
export interface ResumeManuel {
  id: string;
  titre: string;
  source: SourceManuel;
  creeLe: string;
  pages: number;
  exercices: number;
}

const nouvelId = () => (globalThis.crypto?.randomUUID?.() ?? `m${Date.now()}${Math.random().toString(36).slice(2)}`);

export function nouveauManuel(titre: string, source: SourceManuel, aujourdhui: string, fichierPdf = "", nbPages = 0): Manuel {
  return {
    id: nouvelId(), titre: titre.trim() || `Manuel du ${aujourdhui}`, source, fichierPdf, niveau: "", creeLe: aujourdhui,
    pages: Array.from({ length: Math.max(0, nbPages) }, (_, i) => ({ id: nouvelId(), numero: i + 1, fichier: "", exercices: [] })),
  };
}

/** Une page de plus, photographiée : elle prend le numéro suivant. */
export function ajouterPagePhoto(m: Manuel, fichier: string): Manuel {
  return { ...m, pages: [...m.pages, { id: nouvelId(), numero: m.pages.length + 1, fichier, exercices: [] }] };
}

/** Une page retirée ; les suivantes se renumérotent. */
export function retirerPage(m: Manuel, pageId: string): Manuel {
  return { ...m, pages: m.pages.filter((p) => p.id !== pageId).map((p, i) => ({ ...p, numero: i + 1 })) };
}

/** Un exercice neuf, encadré sur sa page : il reste à le lire. */
export function exerciceEncadre(zone: Zone, id: string = nouvelId()): ExerciceManuel {
  return { id, numero: "", titre: "", consigne: "", contenu: "", type: "autre", zone, competences: [] };
}

export const resumeDe = (m: Manuel): ResumeManuel => ({
  id: m.id, titre: m.titre, source: m.source, creeLe: m.creeLe, pages: m.pages.length,
  exercices: m.pages.reduce((n, p) => n + p.exercices.length, 0),
});

export function lireIndex(brut: string | null | undefined): ResumeManuel[] {
  if (!brut) return [];
  try {
    const v = JSON.parse(brut);
    return Array.isArray(v) ? v.filter((x) => x && typeof x.id === "string" && typeof x.titre === "string") : [];
  } catch { return []; }
}

/** L'index avec ce manuel, à sa place — le plus récent d'abord. */
export function indexAvec(index: ResumeManuel[], m: Manuel): ResumeManuel[] {
  const r = resumeDe(m);
  return [...index.filter((x) => x.id !== m.id), r].sort((a, b) => b.creeLe.localeCompare(a.creeLe) || a.titre.localeCompare(b.titre, "fr"));
}

export const indexSans = (index: ResumeManuel[], id: string) => index.filter((x) => x.id !== id);

const TYPES = new Set<string>(TYPES_EXERCICE.map((t) => t.id));
const dans01 = (v: number) => Math.min(1, Math.max(0, v));

/** Une zone enregistrée, telle qu'on peut s'y fier. */
function zoneRelue(v: any): Zone | undefined {
  if (!v || typeof v !== "object") return undefined;
  const [x, y, l, h] = [v.x, v.y, v.l, v.h].map(Number);
  if (![x, y, l, h].every(Number.isFinite) || l <= 0 || h <= 0) return undefined;
  return { x: dans01(x), y: dans01(y), l: Math.min(l, 1 - dans01(x)), h: Math.min(h, 1 - dans01(y)) };
}

const competencesRelues = (v: unknown) => lireCompetencesAtelier(JSON.stringify(Array.isArray(v) ? v : []));

/** Le modèle simplifié enregistré, s'il se relit. */
function modeleRelu(v: any): ModeleSimplifie | undefined {
  if (!v || typeof v !== "object") return undefined;
  const fiche = lireFicheAdaptee(JSON.stringify(v.fiche ?? null));
  // Un modèle d'avant la lecture tolérante a pu garder « [object Object] » : il est à refaire.
  if (!fiche || JSON.stringify(fiche).includes("[object Object]")) return undefined;
  return { fiche, options: { ...OPTIONS_PAR_DEFAUT, ...(v.options && typeof v.options === "object" ? v.options : {}) }, faitLe: String(v.faitLe ?? "") };
}

export function lireManuel(brut: string | null | undefined): Manuel | null {
  if (!brut) return null;
  try {
    const v = JSON.parse(brut);
    if (!v || typeof v !== "object" || typeof v.id !== "string") return null;
    // Un manuel d'avant : ses exercices prenaient la compétence de leur notion — ils la gardent.
    const deLaNotion = new Map<string, unknown>(
      (Array.isArray(v.notions) ? v.notions : []).filter((n: any) => n && typeof n.id === "string").map((n: any) => [n.id, n.competences]),
    );
    const pages: PageManuel[] = Array.isArray(v.pages) ? v.pages.map((p: any, i: number) => ({
      id: String(p?.id ?? nouvelId()), numero: Number(p?.numero) || i + 1, fichier: String(p?.fichier ?? ""),
      exercices: Array.isArray(p?.exercices) ? p.exercices.filter((e: any) => e && typeof e.consigne === "string").map((e: any): ExerciceManuel => {
        const propres = competencesRelues(e.competences);
        const zone = zoneRelue(e.zone);
        const modele = modeleRelu(e.modele);
        return {
          id: String(e.id ?? nouvelId()), numero: String(e.numero ?? ""), titre: String(e.titre ?? ""), consigne: e.consigne,
          contenu: String(e.contenu ?? ""), type: (TYPES.has(e.type) ? e.type : "autre") as TypeExercice,
          competences: propres.length ? propres : competencesRelues(deLaNotion.get(e.notion)),
          ...(zone ? { zone } : {}), ...(modele ? { modele } : {}),
        };
      }) : [],
    })) : [];
    const bureau = v.surLeBureau && typeof v.surLeBureau.materielId === "string" && typeof v.surLeBureau.fichier === "string"
      ? { materielId: v.surLeBureau.materielId, fichier: v.surLeBureau.fichier } : undefined;
    return {
      id: v.id, titre: String(v.titre ?? "Manuel"), source: v.source === "pdf" ? "pdf" : "telephone",
      fichierPdf: String(v.fichierPdf ?? ""), niveau: String(v.niveau ?? ""), creeLe: String(v.creeLe ?? ""), pages,
      ...(bureau ? { surLeBureau: bureau } : {}),
    };
  } catch { return null; }
}

export const ecrireManuel = (m: Manuel) => JSON.stringify(m);

/** L'exercice tel qu'on le lit d'un trait : « 3 · Calcule. — 12 + 7 = … ». */
export const texteExercice = (e: ExerciceManuel) =>
  [e.numero && `${e.numero} ·`, e.titre && `« ${e.titre} »`, e.consigne.replace(/\s*\n\s*/g, " "), e.contenu && `— ${e.contenu.replace(/\s*\n\s*/g, " ; ")}`].filter(Boolean).join(" ");

/** Le nom court d'un exercice, pour une liste : le titre de son modèle simplifié, sinon le sien, sinon sa consigne. */
export const nomExercice = (e: ExerciceManuel) =>
  e.modele?.fiche.titre || e.titre || e.consigne.split("\n")[0] || "Exercice à lire";

// ── Le modèle simplifié ───────────────────────────────────────────────────
//
// Ce qu'on demande au modèle, c'est ce qu'un enseignant spécialisé fait à la
// main : une consigne courte qui dit une seule action, le vocabulaire de
// l'élève, moins d'items, un exemple fait, la place pour répondre. Le fond de
// l'exercice ne change pas : c'est la même notion, la même difficulté visée.

export interface OptionsReadaptation {
  /** Une phrase, une action, des mots simples. */
  simplifier: boolean;
  /** Le nombre d'items à garder ; 0 garde tout. */
  items: number;
  exemple: boolean;
  /** Une ligne ou un cadre pour écrire chaque réponse. */
  zonesReponse: boolean;
  grosCaracteres: boolean;
  /** Découper la tâche : étape 1, étape 2… */
  etapes: boolean;
  /** Ce que l'enseignant veut en plus, dans ses mots. */
  precision: string;
}

export const OPTIONS_PAR_DEFAUT: OptionsReadaptation = {
  simplifier: true, items: 5, exemple: true, zonesReponse: true, grosCaracteres: true, etapes: false, precision: "",
};

export interface FicheAdaptee {
  titre: string;
  consigne: string;
  /** Un item fait devant l'élève ; vide si on n'en veut pas. */
  exemple: string;
  items: string[];
  /** Ce que l'adulte dit ou donne : une aide, un matériel, un rappel. */
  aide: string;
}

/** Le modèle simplifié d'un exercice : la fiche, et les choix avec lesquels on l'a faite. */
export interface ModeleSimplifie { fiche: FicheAdaptee; options: OptionsReadaptation; faitLe: string }

const SYSTEME_READAPTATION = "Tu es un enseignant spécialisé. Tu réécris des exercices de manuel pour un élève qui a besoin d'une présentation allégée : une information à la fois, des mots simples, une tâche claire. Tu ne changes ni la notion travaillée ni la difficulté visée. Tu réponds en français, uniquement par un objet JSON.";

/** Ce qu'on demande en réécrivant, selon les choix de l'enseignant. */
function demandesDeReadaptation(o: OptionsReadaptation): string {
  return [
    "- Garde TOUTES les tâches de l'exercice, dans l'ordre : n'en supprime aucune. S'il y en a plusieurs (lire, puis barrer, puis corriger…), écris une consigne par tâche, une par ligne dans \"consigne\".",
    o.simplifier && "- Chaque consigne est une phrase courte, à l'impératif, qui dit UNE action, avec des mots que l'élève connaît : deux actions font deux lignes.",
    o.items > 0 && `- Garde au plus ${o.items} items, les plus simples ou les plus représentatifs ; ne change pas les nombres ni les mots des items gardés. Si les items forment un texte suivi (un dialogue, une histoire), garde-les dans l'ordre, et d'abord ceux où l'élève a quelque chose à faire.`,
    o.exemple && "- Donne un exemple entièrement fait, pris parmi les items (ou un item du même modèle), pour montrer ce qu'on attend.",
    o.etapes && "- Découpe la tâche en étapes numérotées (étape 1, étape 2…), une action par étape, dans le champ \"aide\".",
    o.zonesReponse && "- Chaque item se termine par ce qu'il faut écrire ou compléter : l'élève aura une ligne ou un cadre pour répondre.",
    o.precision.trim() && `- Consigne particulière de l'enseignant : ${o.precision.trim()}`,
  ].filter(Boolean).join("\n");
}

const CHAMPS_DE_LA_FICHE = `- "titre" : trois ou quatre mots qui disent ce qu'on travaille (« Additionner deux nombres »).
- "consigne" : les consignes, une par ligne.
- "exemple" : une ligne de texte ; vide si tu n'en donnes pas.
- "items" : un item par entrée, tel qu'il s'écrira sur la fiche — du texte simple, jamais un objet.
- "aide" : ce que l'adulte peut dire ou donner ; vide si rien.`;

/** Réécrire un exercice déjà lu, d'après son texte — celui que l'enseignant a pu corriger. */
export function consigneReadaptation(e: ExerciceManuel, o: OptionsReadaptation, niveau: string): ChatMessage[] {
  return [
    { role: "system", content: SYSTEME_READAPTATION },
    { role: "user", content: `Voici un exercice de manuel${niveau ? ` (niveau ${niveau})` : ""} :

Numéro : ${e.numero || "—"}${e.titre ? `\nTitre : ${e.titre}` : ""}
Consigne : ${e.consigne}
Contenu :
${e.contenu || "(rien d'autre que la consigne)"}

Réécris-le pour un élève qui traite mal plusieurs informations à la fois.
${demandesDeReadaptation(o)}

Réponds uniquement par un objet JSON, sans texte autour :
{"titre":"…","consigne":"…","exemple":"…","items":["…","…"],"aide":"…"}

${CHAMPS_DE_LA_FICHE}` },
  ];
}

/**
 * Lire l'encadré : l'exercice tel qu'il est écrit, rien de plus. La
 * simplification vient ensuite, d'après ce texte — deux demandes simples
 * valent mieux qu'une double pour un petit modèle, et l'enseignant peut
 * corriger la lecture avant de la refaire.
 */
export function consigneLectureEncadre(niveau: string): string {
  const types = TYPES_EXERCICE.map((t) => t.id).join(", ");
  return `Tu lis la photo d'UN exercice de manuel scolaire${niveau ? ` de niveau ${niveau}` : ""}, encadré dans sa page par l'enseignant. Tout ce qui est sur la photo fait un seul exercice : transcris-le.

Règles :
- Ne transcris que ce qui est VISIBLE. N'invente rien, ne complète rien.
- Garde les nombres, les mots et la ponctuation exactement tels qu'ils sont écrits.
- "numero" : le repère écrit devant l'exercice (« 3 », « 4 ★ », « Pour commencer ») ; vide s'il n'y en a pas.
- "titre" : son titre, s'il en a un (« Je fais attention à la logique des textes ») ; vide sinon.
- "consigne" : TOUTES les consignes, dans l'ordre où elles sont écrites, une par ligne — celles du début comme celles de la fin.
- "contenu" : ce sur quoi l'élève travaille — les phrases, les lignes d'un texte ou d'un dialogue, les calculs, les mots —, une ligne par ligne du manuel.
- Une image ou un schéma se décrit entre crochets, brièvement : [image : trois pommes dans un panier].
- "type" vaut l'un de : ${types}.
- Chaque valeur est du texte simple, jamais un objet ni un tableau.

Réponds uniquement par un objet JSON, sans texte autour :
{"numero":"…","titre":"…","consigne":"…","contenu":"…","type":"…"}`;
}

/** Ce qui tient lieu de consigne à un exercice qui n'en montre pas. */
const SANS_CONSIGNE = "(sans consigne)";

/** L'exercice tel que le modèle l'a transcrit, ou rien s'il n'a rien lu. */
function exerciceTranscrit(x: any): Omit<ExerciceManuel, "id" | "competences"> | null {
  if (!x || typeof x !== "object") return null;
  const consigne = lignesDe(x.consigne).join("\n");
  const contenu = lignesDe(x.contenu).join("\n");
  if (!consigne && !contenu) return null;
  return {
    numero: enTexte(x.numero), titre: enTexte(x.titre), consigne: consigne || SANS_CONSIGNE, contenu,
    type: (TYPES.has(enTexte(x.type)) ? enTexte(x.type) : "autre") as TypeExercice,
  };
}

/** Le premier objet JSON d'une réponse, quoi qu'il y ait autour. */
function objetDe(reponse: string): any {
  const debut = reponse.indexOf("{");
  const fin = reponse.lastIndexOf("}");
  if (debut < 0 || fin <= debut) return null;
  try { return JSON.parse(reponse.slice(debut, fin + 1)); } catch { return null; }
}

/** L'exercice que le modèle a lu dans l'encadré, ou rien s'il n'a rien lu. */
export function lireExerciceDeLEncadre(reponse: string): Omit<ExerciceManuel, "id" | "competences"> | null {
  const brut = objetDe(reponse);
  if (!brut || typeof brut !== "object") return null;
  // Un modèle qui enveloppe sa réponse (« {"exercice": {…}} ») est compris aussi.
  return exerciceTranscrit(brut.exercice && typeof brut.exercice === "object" ? brut.exercice : brut);
}

/**
 * Une valeur du modèle, en texte — quelle que soit la forme qu'il lui a
 * donnée. Un petit modèle rend parfois un item en objet (« {"phrase": …,
 * "correction": …} ») : on en garde les mots, au lieu d'imprimer
 * « [object Object] ».
 */
export function enTexte(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.map(enTexte).filter(Boolean).join(" ; ");
  if (typeof v === "object") return Object.values(v as Record<string, unknown>).map(enTexte).filter(Boolean).join(" → ");
  return "";
}

/** Des lignes, d'où qu'elles viennent : un tableau, ou un texte à couper aux retours à la ligne. */
const lignesDe = (v: unknown): string[] =>
  (Array.isArray(v) ? v.map(enTexte) : enTexte(v).split(/\n+/)).map((x) => x.trim()).filter(Boolean);

export function lireFicheAdaptee(reponse: string): FicheAdaptee | null {
  const brut = objetDe(reponse);
  if (!brut || typeof brut !== "object") return null;
  const items = lignesDe(brut.items);
  const consigne = lignesDe(brut.consigne).join("\n");
  if (!consigne && !items.length) return null;
  return { titre: enTexte(brut.titre), consigne, exemple: enTexte(brut.exemple), items, aide: enTexte(brut.aide) };
}

/** Ce qu'on garde d'un exercice sans passer par le modèle : ses items, ligne par ligne. */
export function ficheDepuisLExercice(e: ExerciceManuel, o: OptionsReadaptation): FicheAdaptee {
  const lignes = e.contenu.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  return { titre: e.titre, consigne: e.consigne === SANS_CONSIGNE ? "" : e.consigne, exemple: "", items: o.items > 0 ? lignes.slice(0, o.items) : lignes, aide: "" };
}

/** Vrai si l'exercice a été lu : on peut le réécrire d'après son texte, sans renvoyer la photo. */
export const estLu = (e: ExerciceManuel) => !!(e.contenu.trim() || (e.consigne.trim() && e.consigne !== SANS_CONSIGNE));

// ── Les exercices d'une compétence ────────────────────────────────────────

/** Un exercice retrouvé : son manuel, sa page, lui. */
export interface ExerciceTrouve { manuel: Manuel; page: PageManuel; exercice: ExerciceManuel }

/** Les exercices de ces manuels qui portent une compétence que `vise` reconnaît, dans l'ordre des manuels et des pages. */
export function exercicesQuiTravaillent(manuels: Manuel[], vise: (c: CompetenceSelectionnee) => boolean): ExerciceTrouve[] {
  return manuels.flatMap((manuel) => manuel.pages.flatMap((page) => page.exercices
    .filter((exercice) => exercice.competences.some(vise))
    .map((exercice) => ({ manuel, page, exercice }))));
}

/** Les exercices d'un manuel, par compétence — et ceux qui n'en ont pas encore. */
export function exercicesParCompetence(m: Manuel): { groupes: { competence: CompetenceSelectionnee; exercices: { page: PageManuel; exercice: ExerciceManuel }[] }[]; sans: { page: PageManuel; exercice: ExerciceManuel }[] } {
  const groupes: { competence: CompetenceSelectionnee; exercices: { page: PageManuel; exercice: ExerciceManuel }[] }[] = [];
  const sans: { page: PageManuel; exercice: ExerciceManuel }[] = [];
  const cle = (c: CompetenceSelectionnee) => `${c.referentielNom}|${c.sousDomaineTitre}|${c.competenceRefId ?? c.competenceTitre}`;
  for (const page of m.pages) for (const exercice of page.exercices) {
    if (!exercice.competences.length) { sans.push({ page, exercice }); continue; }
    for (const competence of exercice.competences) {
      let g = groupes.find((x) => cle(x.competence) === cle(competence));
      if (!g) { g = { competence, exercices: [] }; groupes.push(g); }
      g.exercices.push({ page, exercice });
    }
  }
  return { groupes, sans };
}

// ── La fiche imprimée ─────────────────────────────────────────────────────

export const STYLE_FICHE_ADAPTEE = `
  .fa { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1c2233; }
  .fa.gros { font-size: 20px; line-height: 1.7; }
  .fa .fa-titre { font-size: 24px; font-weight: 800; margin: 0 0 4px; }
  .fa.gros .fa-titre { font-size: 30px; }
  .fa .fa-nom { font-size: 13px; color: #687087; margin: 0 0 14px; }
  .fa .fa-consigne { font-weight: 700; font-size: 1.15em; border: 2px solid #1c2233; border-radius: 10px; padding: 10px 14px; margin: 0 0 16px; }
  .fa ol.fa-etapes { padding-left: 2.2em; }
  .fa ol.fa-etapes li { margin: 0 0 4px; }
  .fa .fa-exemple { background: #eef0fe; border-radius: 10px; padding: 10px 14px; margin: 0 0 16px; }
  .fa .fa-exemple b { display: block; font-size: .8em; color: #4338ca; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 2px; }
  .fa ol { padding-left: 1.6em; margin: 0; }
  .fa li { margin: 0 0 14px; page-break-inside: avoid; }
  .fa .fa-reponse { display: block; border-bottom: 1.5px solid #9aa0b4; height: 1.6em; margin-top: 6px; }
  .fa.gros .fa-reponse { height: 2em; }
  .fa .fa-aide { margin-top: 20px; border-top: 1px dashed #cfd4e2; padding-top: 10px; font-size: .8em; color: #687087; }
  .fa .fa-aide b { color: #1c2233; }
`;

/** La consigne dans son cadre : une phrase, ou des étapes numérotées quand il y a plusieurs tâches. */
function consigneHtml(consigne: string): string {
  const etapes = consigne.split(/\n+/).map((l) => l.replace(/^\s*(\d+[.)]|[-•▸►])\s*/, "").trim()).filter(Boolean);
  if (!etapes.length) return "";
  if (etapes.length === 1) return `<div class="fa-consigne">${escapeHtml(etapes[0])}</div>`;
  return `<ol class="fa-consigne fa-etapes">${etapes.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ol>`;
}

export function htmlFicheAdaptee(f: FicheAdaptee, o: OptionsReadaptation, origine: { manuel: string; page: number; numero: string }): string {
  const items = f.items.map((it) => `<li>${escapeHtml(it).replace(/\n/g, "<br>")}${o.zonesReponse ? `<span class="fa-reponse"></span>` : ""}</li>`).join("");
  return `<div class="fa${o.grosCaracteres ? " gros" : ""}">
    <div class="fa-titre">${escapeHtml(f.titre || "Exercice")}</div>
    <div class="fa-nom">Prénom : ................................ &nbsp;&nbsp; Date : ..............
      <span style="float:right">${escapeHtml(origine.manuel)} · p. ${origine.page}${origine.numero ? ` · ex. ${escapeHtml(origine.numero)}` : ""}</span></div>
    ${consigneHtml(f.consigne)}
    ${f.exemple ? `<div class="fa-exemple"><b>Exemple</b>${escapeHtml(f.exemple).replace(/\n/g, "<br>")}</div>` : ""}
    <ol>${items}</ol>
    ${f.aide ? `<div class="fa-aide"><b>Pour l'adulte :</b> ${escapeHtml(f.aide).replace(/\n/g, "<br>")}</div>` : ""}
  </div>`;
}
