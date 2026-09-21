// ── Le documentaliste des programmes ──────────────────────────────────────
//
// « Que disent les programmes sur la numération en GS ? » — la réponse est
// dans l'application, éparpillée dans les référentiels, et la chercher à la
// main prend dix minutes de dépliage d'arbre.
//
// L'ordre de recherche n'est pas négociable : **d'abord les référentiels du
// BO** posés dans l'application, ensuite seulement les guides Éduscol et le
// web. Un programme cité de mémoire par un modèle n'est pas un programme ;
// une compétence lue dans le référentiel de l'enseignant, si — et elle porte
// son chemin exact, que l'on peut recopier dans une séquence.
//
// Rien de ce qui concerne les élèves ne part ici : la question de
// l'enseignant et des extraits de programmes officiels, rien d'autre.

import { api, type Referentiel, type SourceWeb } from "./api";
import { normaliser } from "./competencesTravaillees";
import eduscol from "./data/eduscol.json";

/** Une compétence trouvée dans un référentiel, avec de quoi la citer. */
export interface TrouvailleBO {
  id: string;
  referentiel: string;
  /** Domaine › sous-domaine › compétence générale. */
  chemin: string;
  texte: string;
  niveau: string;
  /** Combien de mots de la question s'y retrouvent (pour classer). */
  score: number;
}

export interface RessourceEduscol {
  titre: string;
  url: string;
  categorie: string;
  source?: string;
}

export interface ReponseDocumentaliste {
  texte: string;
  competences: TrouvailleBO[];
  ressources: RessourceEduscol[];
  sources: SourceWeb[];
  /** Vrai si le web a réellement été interrogé (sinon, tout vient d'ici). */
  aCherche: boolean;
  /** Ce qui a empêché la recherche web, s'il y a lieu. */
  avertissement?: string;
}

// ── Des mots d'une question aux mots d'un programme ───────────────────────

/**
 * Les mots vides du français, plus ceux d'une question d'enseignant.
 *
 * Sans ce tri, « Que disent les programmes sur la numération en GS ? »
 * cherche « que », « disent », « programmes »… et ne trouve rien, ou tout.
 */
const MOTS_VIDES = new Set([
  "que", "qu", "quoi", "quel", "quelle", "quels", "quelles", "qui", "quand", "comment", "pourquoi",
  "est", "sont", "disent", "dit", "dire", "faut", "peut", "doit", "doivent", "veux", "voudrais",
  "je", "tu", "il", "elle", "on", "nous", "vous", "ils", "elles", "me", "mon", "ma", "mes",
  "le", "la", "les", "un", "une", "des", "du", "de", "d", "au", "aux", "a", "l", "et", "ou", "en",
  "pour", "par", "sur", "sous", "dans", "avec", "sans", "chez", "vers", "entre", "plus", "moins",
  "programme", "programmes", "bo", "officiel", "officiels", "attendu", "attendus",
  "eleve", "eleves", "classe", "cycle", "faire", "travailler", "apprendre", "aider",
]);

/** Les niveaux qui disent un cycle, et le cycle qu'ils désignent. */
const CYCLE_DU_NIVEAU: Record<string, number> = {
  ps: 1, ms: 1, gs: 1, tps: 1, maternelle: 1,
  cp: 2, ce1: 2, ce2: 2, cm1: 3, cm2: 3, "6e": 3, sixieme: 3,
};

/** Les mots courts qu'on garde quand même : ce sont des niveaux. */
const COURTS_UTILES = new Set(Object.keys(CYCLE_DU_NIVEAU).concat(["ime", "ulis", "caa", "eps", "emc"]));

export function motsCles(question: string): string[] {
  const mots = normaliser(question).replace(/[^\p{L}\p{N}' ]/gu, " ").split(" ").filter(Boolean);
  const gardes = mots.filter((m) => !MOTS_VIDES.has(m) && (m.length >= 4 || COURTS_UTILES.has(m)));
  return [...new Set(gardes)];
}

/** Le cycle visé par la question, s'il s'y trouve (« en GS » → 1). */
export function cycleDemande(question: string): number | null {
  for (const m of normaliser(question).replace(/[^\p{L}\p{N} ]/gu, " ").split(" ")) {
    if (CYCLE_DU_NIVEAU[m]) return CYCLE_DU_NIVEAU[m];
  }
  const cycle = normaliser(question).match(/cycle\s*([123])/);
  return cycle ? Number(cycle[1]) : null;
}

/** Le cycle d'un référentiel, tel qu'il s'annonce (« Cycle 2 », « C1 »…). */
export function cycleDuReferentiel(r: { nom: string; cycle: string }): number | null {
  const t = normaliser(`${r.cycle} ${r.nom}`);
  const m = t.match(/cycle\s*([123])|\bc([123])\b/);
  if (m) return Number(m[1] ?? m[2]);
  if (/maternelle/.test(t)) return 1;
  return null;
}

interface RefComp { id?: string; texte?: string; niveau?: string }
interface RefCG { id?: string; titre?: string; competences?: RefComp[] }
interface RefSous { id?: string; titre?: string; competences?: RefComp[]; competencesGenerales?: RefCG[] }
interface RefDom { id?: string; titre?: string; sousDomaines?: RefSous[] }
interface RefData { titre?: string; domaines?: RefDom[] }

/**
 * Cherche dans les référentiels actifs, et classe par nombre de mots trouvés.
 *
 * Un mot présent dans l'intitulé compte double : « numération » dans la
 * compétence vaut mieux que « numération » dans le titre du domaine, qui
 * ferait remonter tout le domaine.
 */
export function chercherDansLesProgrammes(
  refs: Referentiel[], question: string, maximum = 14,
): TrouvailleBO[] {
  const mots = motsCles(question);
  if (!mots.length) return [];
  const cycle = cycleDemande(question);
  const trouvailles: TrouvailleBO[] = [];

  for (const r of refs) {
    if (!r.actif) continue;
    let data: RefData | null = null;
    try { data = JSON.parse(r.donnees); } catch { continue; }
    const cycleRef = cycleDuReferentiel(r);
    // Un cycle demandé écarte les autres — mais un référentiel sans cycle
    // annoncé (celui de l'enseignant, souvent) reste dans la course.
    if (cycle && cycleRef && cycleRef !== cycle) continue;

    const poser = (dom: RefDom, sd: RefSous, cg: RefCG | null, c: RefComp) => {
      const texte = (c.texte ?? "").trim();
      if (!texte) return;
      const intitule = normaliser(`${c.niveau ?? ""} ${texte}`);
      const chemin = [dom.titre, sd.titre, cg?.titre].filter(Boolean).join(" › ");
      const contexte = normaliser(chemin);
      let score = 0;
      for (const mot of mots) {
        if (intitule.includes(mot)) score += 2;
        else if (contexte.includes(mot)) score += 1;
      }
      if (!score) return;
      if (cycle && cycleRef === cycle) score += 1;
      trouvailles.push({
        id: c.id ?? `${r.id}|${chemin}|${texte}`,
        referentiel: r.nom, chemin, texte, niveau: (c.niveau ?? "").trim(), score,
      });
    };

    for (const dom of data?.domaines ?? []) {
      for (const sd of dom.sousDomaines ?? []) {
        for (const c of sd.competences ?? []) poser(dom, sd, null, c);
        for (const cg of sd.competencesGenerales ?? []) for (const c of cg.competences ?? []) poser(dom, sd, cg, c);
      }
    }
  }

  return trouvailles
    .sort((a, b) => b.score - a.score || a.texte.localeCompare(b.texte, "fr"))
    .slice(0, maximum);
}

/** Les guides Éduscol déjà connus de l'application qui parlent du sujet. */
export function ressourcesEduscol(question: string, maximum = 6): RessourceEduscol[] {
  const mots = motsCles(question);
  if (!mots.length) return [];
  const cycle = cycleDemande(question);
  const liste = eduscol as RessourceEduscol[];
  return liste
    .map((d) => {
      const titre = normaliser(d.titre);
      const cat = normaliser(`${d.categorie} ${d.source ?? ""}`);
      let score = 0;
      for (const mot of mots) {
        if (titre.includes(mot)) score += 2;
        else if (cat.includes(mot)) score += 1;
      }
      if (cycle && normaliser(d.categorie).includes(`cycle ${cycle}`)) score += 1;
      return { d, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maximum)
    .map((x) => x.d);
}

// ── Ce qu'on demande au modèle ────────────────────────────────────────────

/** Les compétences trouvées, telles qu'elles partent au modèle. */
export function extraitsDesProgrammes(trouvailles: TrouvailleBO[]): string {
  return trouvailles
    .map((t) => `- [${t.referentiel}] ${t.chemin} — ${t.niveau ? `(${t.niveau}) ` : ""}${t.texte}`)
    .join("\n");
}

export function promptDocumentaliste(a: {
  question: string;
  extraits: string;
  ressources: RessourceEduscol[];
  web: string;
  contexte: string;
}) {
  const sections = [
    "Tu es le documentaliste d'un enseignant du premier degré (maternelle, élémentaire ou ESMS).",
    a.contexte,
    "Tu réponds à partir des extraits de programmes fournis — ce sont les référentiels officiels installés dans son application — et, s'il y en a, des ressources Éduscol et de la recherche web.",
    "Ordre de confiance : les extraits de programmes d'abord, les guides Éduscol ensuite, le reste en dernier.",
    "Structure ta réponse avec ces trois titres, précédés de « ## » :",
    "## Ce que disent les programmes — cite les compétences fournies mot pour mot, entre guillemets, avec leur chemin entre parenthèses. N'en invente aucune, n'en reformule aucune.",
    "## Ce qu'en disent les guides — seulement si des ressources Éduscol ou des résultats web sont fournis ; sinon écris « - Rien trouvé de ce côté. »",
    "## Trois pistes pour la classe — trois propositions concrètes, réalisables avec du matériel ordinaire, en une ou deux phrases chacune.",
    "Si les extraits ne répondent pas à la question, dis-le franchement en premier au lieu de combler.",
    "Écris en français, sobrement, sans flatterie ni introduction. Pas de tableau.",
  ];
  const ressources = a.ressources.length
    ? a.ressources.map((r) => `- ${r.titre} (${r.categorie}) — ${r.url}`).join("\n")
    : "aucune";
  return [
    { role: "system" as const, content: sections.join(" ") },
    {
      role: "user" as const,
      content: [
        `Question : ${a.question}`,
        "",
        "Extraits des référentiels installés :",
        a.extraits || "aucun extrait ne correspond",
        "",
        "Ressources Éduscol connues de l'application :",
        ressources,
        ...(a.web ? ["", "Recherche web (guides Éduscol et textes officiels) :", a.web] : []),
      ].join("\n"),
    },
  ];
}

/** La question posée au moteur de recherche, orientée vers les sources sûres. */
export function questionWeb(question: string): string {
  return [
    "Cherche en priorité sur eduscol.education.fr, education.gouv.fr (Bulletin officiel)",
    "et les guides et ressources d'accompagnement des programmes.",
    "Ne cite aucun blog ni site commercial.",
    "Réponds brièvement, en citant chaque source avec son titre et son lien.",
    "",
    `Question d'un enseignant du premier degré : ${question}`,
  ].join(" ");
}

/** Ce que l'application sait de la classe, en une ligne — jamais d'élève. */
export async function contexteDeLaClasse(): Promise<string> {
  const r = await api.settingsAll().catch(() => ({} as Record<string, string>));
  const bouts = [
    r.niveauClasse && `La classe est de niveau ${r.niveauClasse}.`,
    (r.typeStructure === "ime" || r["edt:mode"] === "ime")
      && "L'enseignant exerce en ESMS (IME) : les pistes doivent convenir à des élèves en situation de handicap, avec des supports très concrets.",
  ].filter(Boolean);
  return bouts.join(" ");
}

/**
 * Pose la question : les référentiels d'abord, les guides ensuite.
 *
 * La recherche web demande un modèle que tous les abonnements n'ont pas : si
 * elle échoue, la réponse se fait quand même sur les programmes installés, et
 * l'écran le dit au lieu de faire comme si de rien n'était.
 */
export async function demanderAuxProgrammes(
  question: string, { web = true }: { web?: boolean } = {},
): Promise<ReponseDocumentaliste> {
  const refs = await api.referentielsList();
  const competences = chercherDansLesProgrammes(refs, question);
  const ressources = ressourcesEduscol(question);

  let texteWeb = "";
  let sources: SourceWeb[] = [];
  let aCherche = false;
  let avertissement: string | undefined;
  if (web) {
    try {
      const r = await api.mistralRechercheWeb(questionWeb(question));
      texteWeb = r.texte;
      sources = r.sources;
      aCherche = r.aCherche;
    } catch (e) {
      avertissement = "Les guides Éduscol n'ont pas pu être interrogés (" + String((e as Error)?.message ?? e)
        + "). La réponse ne tient qu'aux programmes installés.";
    }
  }

  const modele = await api.modeleActif();
  const texte = await api.mistralChat(promptDocumentaliste({
    question,
    extraits: extraitsDesProgrammes(competences),
    ressources,
    web: texteWeb,
    contexte: await contexteDeLaClasse(),
  }), modele);

  return { texte: texte.trim(), competences, ressources, sources, aCherche, avertissement };
}
