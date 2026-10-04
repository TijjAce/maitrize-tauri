// Les manuels : des pages photographiées ou un PDF, leurs exercices, et la
// fiche qu'on en refait.
//
// Un manuel scolaire est fait pour la classe entière ; ses exercices sont
// bons, leur présentation surcharge. On le photographie page après page avec
// le téléphone (ou l'on importe son PDF), le modèle en relit les exercices,
// et l'enseignant en réadapte un : consigne simplifiée, moins d'items, un
// exemple, de la place pour répondre. Le manuel reste sur cet ordinateur,
// avec ses images ; rien ne part chez le modèle avant qu'on le lui demande.
//
// Le modèle range aussi les exercices de tout le manuel par notion, et
// l'enseignant donne à chaque notion la compétence du BO qu'il veut.

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

export interface ExerciceManuel {
  id: string;
  /** Le numéro tel qu'il est écrit : « 3 », « 4 ★ », « Je m'entraîne ». */
  numero: string;
  consigne: string;
  /** Les items, données, texte : ce sur quoi porte la consigne. */
  contenu: string;
  type: TypeExercice;
  /** La notion où le classement l'a rangé ; vide tant qu'il n'est pas classé. */
  notion: string;
}

/** Ce qu'un groupe d'exercices fait travailler, et la compétence du BO que l'enseignant y met. */
export interface NotionManuel {
  id: string;
  /** Dite comme un savoir-faire : « Accorder le verbe avec son sujet ». */
  titre: string;
  domaine: string;
  /** Les compétences du BO, choisies par l'enseignant : le classement ne les devine pas. */
  competences: CompetenceSelectionnee[];
}

export interface PageManuel {
  id: string;
  numero: number;
  /** L'image de la page dans Fichiers/ ; vide pour une page de PDF. */
  fichier: string;
  exercices: ExerciceManuel[];
  /** Quand le modèle l'a relue ; vide tant qu'il ne l'a pas fait. */
  extraitLe: string;
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
  notions: NotionManuel[];
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
    id: nouvelId(), titre: titre.trim() || `Manuel du ${aujourdhui}`, source, fichierPdf, niveau: "", creeLe: aujourdhui, notions: [],
    pages: Array.from({ length: Math.max(0, nbPages) }, (_, i) => ({ id: nouvelId(), numero: i + 1, fichier: "", exercices: [], extraitLe: "" })),
  };
}

/** Une page de plus, photographiée : elle prend le numéro suivant. */
export function ajouterPagePhoto(m: Manuel, fichier: string): Manuel {
  return { ...m, pages: [...m.pages, { id: nouvelId(), numero: m.pages.length + 1, fichier, exercices: [], extraitLe: "" }] };
}

/** Une page retirée ; les suivantes se renumérotent. */
export function retirerPage(m: Manuel, pageId: string): Manuel {
  return { ...m, pages: m.pages.filter((p) => p.id !== pageId).map((p, i) => ({ ...p, numero: i + 1 })) };
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

export function lireManuel(brut: string | null | undefined): Manuel | null {
  if (!brut) return null;
  try {
    const v = JSON.parse(brut);
    if (!v || typeof v !== "object" || typeof v.id !== "string") return null;
    const pages: PageManuel[] = Array.isArray(v.pages) ? v.pages.map((p: any, i: number) => ({
      id: String(p?.id ?? nouvelId()), numero: Number(p?.numero) || i + 1, fichier: String(p?.fichier ?? ""),
      extraitLe: String(p?.extraitLe ?? ""),
      exercices: Array.isArray(p?.exercices) ? p.exercices.filter((e: any) => e && typeof e.consigne === "string").map((e: any) => ({
        id: String(e.id ?? nouvelId()), numero: String(e.numero ?? ""), consigne: e.consigne, contenu: String(e.contenu ?? ""),
        type: (TYPES.has(e.type) ? e.type : "autre") as TypeExercice, notion: String(e.notion ?? ""),
      })) : [],
    })) : [];
    const notions: NotionManuel[] = Array.isArray(v.notions) ? v.notions.filter((n: any) => n && typeof n.id === "string" && typeof n.titre === "string").map((n: any) => ({
      id: n.id, titre: n.titre, domaine: domaineConnu(String(n.domaine ?? "")),
      competences: lireCompetencesAtelier(JSON.stringify(Array.isArray(n.competences) ? n.competences : [])),
    })) : [];
    // Un exercice rangé dans une notion qui n'est plus là redevient « à classer ».
    const connues = new Set(notions.map((n) => n.id));
    for (const p of pages) for (const e of p.exercices) if (!connues.has(e.notion)) e.notion = "";
    const bureau = v.surLeBureau && typeof v.surLeBureau.materielId === "string" && typeof v.surLeBureau.fichier === "string"
      ? { materielId: v.surLeBureau.materielId, fichier: v.surLeBureau.fichier } : undefined;
    return {
      id: v.id, titre: String(v.titre ?? "Manuel"), source: v.source === "pdf" ? "pdf" : "telephone",
      fichierPdf: String(v.fichierPdf ?? ""), niveau: String(v.niveau ?? ""), creeLe: String(v.creeLe ?? ""), pages, notions,
      ...(bureau ? { surLeBureau: bureau } : {}),
    };
  } catch { return null; }
}

export const ecrireManuel = (m: Manuel) => JSON.stringify(m);

// ── Relire les exercices d'une page ───────────────────────────────────────

export function consigneExtraction(niveau: string): string {
  const types = TYPES_EXERCICE.map((t) => t.id).join(", ");
  return `Tu lis la photo d'une page de manuel scolaire${niveau ? ` de niveau ${niveau}` : ""}.
Transcris chaque exercice de la page, dans l'ordre où il apparaît.

Règles :
- Ne transcris que ce qui est VISIBLE. N'invente rien, ne complète rien.
- Garde les nombres, les mots et la ponctuation exactement tels qu'ils sont écrits.
- "numero" est le repère écrit devant l'exercice (« 3 », « 4 ★ », « Je m'entraîne ») ; vide s'il n'y en a pas.
- "consigne" est ce que l'élève doit faire ; "contenu" est ce sur quoi il le fait : les calculs, les phrases, les mots, les questions, ligne par ligne.
- Une image ou un schéma se décrit entre crochets, brièvement : [image : trois pommes dans un panier].
- Ignore les titres de leçon, les encadrés de cours, les numéros de page et les décors.
- "type" vaut l'un de : ${types}.

Réponds uniquement par un tableau JSON, sans texte autour :
[{"numero":"3","consigne":"Calcule.","contenu":"12 + 7 = …\\n25 + 9 = …","type":"calcul"}]

S'il n'y a aucun exercice sur la page, renvoie [].`;
}

/**
 * Relit la réponse du modèle : le tableau JSON, quoi qu'il y ait autour, et
 * rien de ce qui n'a pas de consigne.
 */
export function lireExercices(reponse: string): ExerciceManuel[] {
  const debut = reponse.indexOf("[");
  const fin = reponse.lastIndexOf("]");
  if (debut < 0 || fin <= debut) return [];
  let brut: any;
  try { brut = JSON.parse(reponse.slice(debut, fin + 1)); } catch { return []; }
  if (!Array.isArray(brut)) return [];
  return brut.flatMap((x: any): ExerciceManuel[] => {
    const consigne = String(x?.consigne ?? "").trim();
    const contenu = String(x?.contenu ?? "").trim();
    if (!consigne && !contenu) return [];
    return [{
      id: nouvelId(), numero: String(x?.numero ?? "").trim(), consigne: consigne || "(sans consigne)", contenu,
      type: (TYPES.has(String(x?.type)) ? String(x?.type) : "autre") as TypeExercice, notion: "",
    }];
  });
}

// ── Le classement des exercices ───────────────────────────────────────────
//
// Un manuel range ses exercices par leçon, page après page ; l'enseignant
// cherche, lui, ce qu'un exercice fait travailler. Le modèle regroupe donc
// les exercices de tout le manuel par notion — « Accorder le verbe avec son
// sujet », où qu'ils soient dans le livre —, et l'enseignant met sur chaque
// notion la compétence du BO qu'il veut. Le modèle ne la devine pas : c'est
// l'enseignant qui en juge.

export const DOMAINES_MANUEL = [
  "Lecture", "Écriture", "Oral", "Grammaire", "Conjugaison", "Orthographe", "Vocabulaire",
  "Nombres", "Calcul", "Problèmes", "Grandeurs et mesures", "Espace et géométrie", "Données", "Autre",
];

/** Un texte ramené à ses lettres : « Accorder le verbe ! » et « accorder le verbe » se retrouvent. */
const aplati = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").replace(/[^a-z0-9]+/g, " ").trim();

/** Le domaine dans la liste, d'où qu'il vienne ; « Autre » s'il n'y est pas. */
export function domaineConnu(d: string): string {
  const cle = aplati(d);
  return DOMAINES_MANUEL.find((x) => aplati(x) === cle) ?? "Autre";
}

/** Un exercice à classer : où il est, et ce qu'il est. */
export interface ExerciceAClasser { page: number; exercice: ExerciceManuel }

/** Les exercices relus que le classement n'a pas encore rangés, dans l'ordre du manuel. */
export function exercicesAClasser(m: Manuel): ExerciceAClasser[] {
  const connues = new Set(m.notions.map((n) => n.id));
  return m.pages.flatMap((p) => p.exercices.filter((e) => !connues.has(e.notion)).map((exercice) => ({ page: p.numero, exercice })));
}

const extrait = (s: string, n: number) => {
  const plat = s.replace(/\s*\n\s*/g, " ; ").replace(/\s+/g, " ").trim();
  return plat.length > n ? `${plat.slice(0, n - 1).trimEnd()}…` : plat;
};

/** Combien d'exercices par demande : assez pour voir les ressemblances, pas assez pour noyer le modèle. */
export const PAR_LOT = 50;

export function consigneClassement(m: Manuel, lot: ExerciceAClasser[], notions: NotionManuel[]): ChatMessage[] {
  const deja = notions.map((n, i) => `N${i + 1} · ${n.domaine} · ${n.titre}`).join("\n");
  const exercices = lot.map((x, i) => {
    const ou = `p. ${x.page}${x.exercice.numero ? `, ex. ${x.exercice.numero}` : ""}`;
    const contenu = x.exercice.contenu ? ` — ${extrait(x.exercice.contenu, 140)}` : "";
    return `E${i + 1} (${ou}) ${extrait(x.exercice.consigne, 160)}${contenu}`;
  }).join("\n");
  return [
    { role: "system", content: "Tu es un enseignant qui prépare sa progression à partir d'un manuel. Tu ranges des exercices par notion travaillée. Tu réponds en français, uniquement par un objet JSON." },
    { role: "user", content: `Manuel : « ${m.titre} »${m.niveau ? ` (niveau ${m.niveau})` : ""}.

Range chaque exercice ci-dessous dans la notion qu'il fait travailler.
${deja ? `
Notions déjà retenues — reprends-les quand un exercice y entre :
${deja}
` : ""}
Exercices :
${exercices}

Règles :
- Une notion dit ce que l'exercice fait apprendre, comme un savoir-faire, en 3 à 8 mots : « Accorder le verbe avec son sujet », « Identifier les compléments circonstanciels », « Comprendre un texte lu », « Additionner des nombres décimaux ».
- Deux exercices qui travaillent la même chose vont dans la même notion, même loin l'un de l'autre dans le manuel.
- Ni « Divers », ni « Révisions », ni « Exercices » : un exercice qui ne ressemble à aucun autre a sa propre notion.
- "domaine" vaut l'un de : ${DOMAINES_MANUEL.join(", ")}.
- Chaque exercice (E1, E2…) apparaît une fois, et une seule.

Réponds uniquement par un objet JSON, sans texte autour :
{"notions":[{"id":"nouvelle","titre":"…","domaine":"…","exercices":["E1","E4"]}]}
- "id" : ${deja ? "celui d'une notion déjà retenue (N1, N2…) quand l'exercice y entre ; " : ""}"nouvelle" pour une notion nouvelle.` },
  ];
}

/** Un groupe tel que le modèle l'a rendu : une notion déjà retenue (son rang) ou nouvelle, et ses exercices (leur rang dans le lot). */
export interface GroupeClasse { notion: number | null; titre: string; domaine: string; exercices: number[] }

/** Relit la réponse du modèle : l'objet JSON, quoi qu'il y ait autour, et rien qui ne se rattache à rien. */
export function classementDeLaReponse(reponse: string, nbExercices: number, nbNotions: number): GroupeClasse[] {
  const debut = reponse.search(/[[{]/);
  const fin = Math.max(reponse.lastIndexOf("}"), reponse.lastIndexOf("]"));
  if (debut < 0 || fin <= debut) return [];
  let brut: any;
  try { brut = JSON.parse(reponse.slice(debut, fin + 1)); } catch { return []; }
  const groupes: any[] = Array.isArray(brut) ? brut : Array.isArray(brut?.notions) ? brut.notions : [];
  const rang = (v: unknown, lettre: string, max: number): number | null => {
    const m = new RegExp(`^\\s*${lettre}?\\s*(\\d+)\\s*$`, "i").exec(String(v ?? ""));
    const n = m ? Number(m[1]) : NaN;
    return n >= 1 && n <= max ? n : null;
  };
  return groupes.flatMap((g): GroupeClasse[] => {
    if (!g || typeof g !== "object") return [];
    const exercices = (Array.isArray(g.exercices) ? g.exercices : []).map((e: unknown) => rang(e, "E", nbExercices)).filter((n: number | null): n is number => n !== null);
    const notion = rang(g.id, "N", nbNotions);
    const titre = String(g.titre ?? "").trim();
    if (!exercices.length || (notion === null && !titre)) return [];
    return [{ notion: notion === null ? null : notion - 1, titre, domaine: domaineConnu(String(g.domaine ?? "")), exercices: exercices.map((n: number) => n - 1) }];
  });
}

/**
 * Le manuel, ses exercices rangés. Une notion nouvelle qui porte le titre
 * d'une notion déjà là la rejoint ; un exercice ne se range qu'une fois.
 */
export function appliquerClassement(m: Manuel, lot: ExerciceAClasser[], groupes: GroupeClasse[], notionsDuLot: NotionManuel[], idNeuf: () => string = nouvelId): Manuel {
  const notions = [...m.notions];
  const rangement = new Map<string, string>();
  for (const g of groupes) {
    let notion = g.notion !== null ? notions.find((n) => n.id === notionsDuLot[g.notion!]?.id) : undefined;
    if (!notion) notion = notions.find((n) => aplati(n.titre) === aplati(g.titre));
    if (!notion) {
      notion = { id: idNeuf(), titre: g.titre, domaine: g.domaine, competences: [] };
      notions.push(notion);
    }
    for (const i of g.exercices) {
      const e = lot[i]?.exercice;
      if (e && !rangement.has(e.id)) rangement.set(e.id, notion.id);
    }
  }
  return {
    ...m, notions,
    pages: m.pages.map((p) => ({ ...p, exercices: p.exercices.map((e) => (rangement.has(e.id) ? { ...e, notion: rangement.get(e.id)! } : e)) })),
  };
}

/** Les exercices d'une notion, dans l'ordre du manuel, avec leur page. */
export function exercicesDeLaNotion(m: Manuel, notionId: string): ExerciceAClasser[] {
  return m.pages.flatMap((p) => p.exercices.filter((e) => e.notion === notionId).map((exercice) => ({ page: p.numero, exercice })));
}

/** Les notions dans l'ordre des domaines, puis de leur première apparition dans le manuel. */
export function notionsRangees(m: Manuel): NotionManuel[] {
  const premiere = new Map<string, number>();
  m.pages.forEach((p) => p.exercices.forEach((e) => { if (e.notion && !premiere.has(e.notion)) premiere.set(e.notion, p.numero); }));
  const rangDomaine = (d: string) => { const i = DOMAINES_MANUEL.indexOf(d); return i < 0 ? DOMAINES_MANUEL.length : i; };
  return [...m.notions].sort((a, b) => rangDomaine(a.domaine) - rangDomaine(b.domaine)
    || (premiere.get(a.id) ?? Infinity) - (premiere.get(b.id) ?? Infinity) || a.titre.localeCompare(b.titre, "fr"));
}

/** L'exercice tel qu'on le lit d'un trait : « 3 · Calcule. — 12 + 7 = … ». */
export const texteExercice = (e: ExerciceManuel) =>
  [e.numero && `${e.numero} ·`, e.consigne, e.contenu && `— ${e.contenu.replace(/\s*\n\s*/g, " ; ")}`].filter(Boolean).join(" ");

// ── Réadapter un exercice ─────────────────────────────────────────────────
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

export function consigneReadaptation(e: ExerciceManuel, o: OptionsReadaptation, niveau: string): ChatMessage[] {
  const demandes = [
    o.simplifier && "- La consigne tient en une phrase courte, à l'impératif, qui dit UNE action, avec des mots que l'élève connaît. Pas de double consigne.",
    o.items > 0 && `- Garde au plus ${o.items} items, les plus simples ou les plus représentatifs ; ne change pas les nombres ni les mots des items gardés.`,
    o.exemple && "- Donne un exemple entièrement fait, pris parmi les items (ou un item du même modèle), pour montrer ce qu'on attend.",
    o.etapes && "- Découpe la tâche en étapes numérotées (étape 1, étape 2…), une action par étape, dans le champ \"aide\".",
    o.zonesReponse && "- Chaque item se termine par ce qu'il faut écrire ou compléter : l'élève aura une ligne ou un cadre pour répondre.",
    o.precision.trim() && `- Consigne particulière de l'enseignant : ${o.precision.trim()}`,
  ].filter(Boolean).join("\n");
  return [
    { role: "system", content: "Tu es un enseignant spécialisé. Tu réécris des exercices de manuel pour un élève qui a besoin d'une présentation allégée : une information à la fois, des mots simples, une tâche claire. Tu ne changes ni la notion travaillée ni la difficulté visée. Tu réponds en français, uniquement par un objet JSON." },
    { role: "user", content: `Voici un exercice de manuel${niveau ? ` (niveau ${niveau})` : ""} :

Numéro : ${e.numero || "—"}
Consigne : ${e.consigne}
Contenu :
${e.contenu || "(rien d'autre que la consigne)"}

Réécris-le pour un élève qui traite mal plusieurs informations à la fois.
${demandes}

Réponds uniquement par un objet JSON, sans texte autour :
{"titre":"…","consigne":"…","exemple":"…","items":["…","…"],"aide":"…"}

- "titre" : trois ou quatre mots qui disent ce qu'on travaille (« Additionner deux nombres »).
- "exemple" : vide si tu n'en donnes pas.
- "items" : un item par entrée, tel qu'il s'écrira sur la fiche.
- "aide" : ce que l'adulte peut dire ou donner ; vide si rien.` },
  ];
}

export function lireFicheAdaptee(reponse: string): FicheAdaptee | null {
  const debut = reponse.indexOf("{");
  const fin = reponse.lastIndexOf("}");
  if (debut < 0 || fin <= debut) return null;
  let brut: any;
  try { brut = JSON.parse(reponse.slice(debut, fin + 1)); } catch { return null; }
  if (!brut || typeof brut !== "object") return null;
  const items = Array.isArray(brut.items) ? brut.items.map((x: any) => String(x ?? "").trim()).filter(Boolean) : [];
  const consigne = String(brut.consigne ?? "").trim();
  if (!consigne && !items.length) return null;
  return {
    titre: String(brut.titre ?? "").trim(), consigne, exemple: String(brut.exemple ?? "").trim(), items,
    aide: String(brut.aide ?? "").trim(),
  };
}

/** Ce qu'on garde d'un exercice sans passer par le modèle : ses items, ligne par ligne. */
export function ficheDepuisLExercice(e: ExerciceManuel, o: OptionsReadaptation): FicheAdaptee {
  const lignes = e.contenu.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  return { titre: "", consigne: e.consigne, exemple: "", items: o.items > 0 ? lignes.slice(0, o.items) : lignes, aide: "" };
}

export const STYLE_FICHE_ADAPTEE = `
  .fa { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1c2233; }
  .fa.gros { font-size: 20px; line-height: 1.7; }
  .fa .fa-titre { font-size: 24px; font-weight: 800; margin: 0 0 4px; }
  .fa.gros .fa-titre { font-size: 30px; }
  .fa .fa-nom { font-size: 13px; color: #687087; margin: 0 0 14px; }
  .fa .fa-consigne { font-weight: 700; font-size: 1.15em; border: 2px solid #1c2233; border-radius: 10px; padding: 10px 14px; margin: 0 0 16px; }
  .fa .fa-exemple { background: #eef0fe; border-radius: 10px; padding: 10px 14px; margin: 0 0 16px; }
  .fa .fa-exemple b { display: block; font-size: .8em; color: #4338ca; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 2px; }
  .fa ol { padding-left: 1.6em; margin: 0; }
  .fa li { margin: 0 0 14px; page-break-inside: avoid; }
  .fa .fa-reponse { display: block; border-bottom: 1.5px solid #9aa0b4; height: 1.6em; margin-top: 6px; }
  .fa.gros .fa-reponse { height: 2em; }
  .fa .fa-aide { margin-top: 20px; border-top: 1px dashed #cfd4e2; padding-top: 10px; font-size: .8em; color: #687087; }
  .fa .fa-aide b { color: #1c2233; }
`;

export function htmlFicheAdaptee(f: FicheAdaptee, o: OptionsReadaptation, origine: { manuel: string; page: number; numero: string }): string {
  const items = f.items.map((it) => `<li>${escapeHtml(it).replace(/\n/g, "<br>")}${o.zonesReponse ? `<span class="fa-reponse"></span>` : ""}</li>`).join("");
  return `<div class="fa${o.grosCaracteres ? " gros" : ""}">
    <div class="fa-titre">${escapeHtml(f.titre || "Exercice")}</div>
    <div class="fa-nom">Prénom : ................................ &nbsp;&nbsp; Date : ..............
      <span style="float:right">${escapeHtml(origine.manuel)} · p. ${origine.page}${origine.numero ? ` · ex. ${escapeHtml(origine.numero)}` : ""}</span></div>
    ${f.consigne ? `<div class="fa-consigne">${escapeHtml(f.consigne)}</div>` : ""}
    ${f.exemple ? `<div class="fa-exemple"><b>Exemple</b>${escapeHtml(f.exemple).replace(/\n/g, "<br>")}</div>` : ""}
    <ol>${items}</ol>
    ${f.aide ? `<div class="fa-aide"><b>Pour l'adulte :</b> ${escapeHtml(f.aide).replace(/\n/g, "<br>")}</div>` : ""}
  </div>`;
}
