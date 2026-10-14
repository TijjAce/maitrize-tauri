import { api, MATIERES, matiereDuDomaine, type Referentiel } from "./api";
import type { Lexique } from "./caa";
import type { RefPicto } from "./pictosAppoint";

// ── Les matières et les domaines, en pictos ───────────────────────────────
//
// Ceux du planning — les matières de l'élémentaire, les domaines de la
// maternelle, et les moments de la journée (accueil, récréation, temps
// calme) —, chacun avec le picto que la classe connaît : de quoi faire un
// emploi du temps en images, ou dire ce qui vient. Ils se choisissent comme
// ceux des verbes et s'impriment avec eux, en cartes à découper — ici, dans
// la page CAA, ou dans Réglages › Personnalisation, qui y ajoute les
// domaines des référentiels. Le déroulement des tablettes montre, pour une
// fiche ou une séance, le picto de sa matière — ou celui de son domaine, si
// l'enseignant détaille la matière par domaine et l'a choisi ; le rituel,
// celui de « Rituel ». Sans choix, la banque propose celui du nom.

/** Ce qui reçoit un picto : tout le planning, sauf « Autre ». */
export const MATIERES_EN_PICTOS: string[] = MATIERES.filter((m) => m !== "Autre");

/**
 * Les mots sous lesquels ARASAAC range chaque matière, dans l'ordre où l'on
 * préfère : le picto de la matière d'abord (« mathématiques », « EPS »),
 * puis ce qui s'y fait (« compter », « chanter »).
 */
export const MOTS_DES_MATIERES: Record<string, string[]> = {
  "Français": ["français", "langage", "lire"],
  "Mathématiques": ["mathématiques", "maths", "compter"],
  "Questionner le monde": ["sciences de la nature", "monde"],
  // « histoire » tout court, c'est aussi le livre de contes : le cours d'histoire montre le globe.
  "Histoire-Géographie": ["cours d'histoire", "sciences sociales", "carte"],
  "Sciences et techno.": ["sciences naturelles", "technologie", "expérience"],
  "EMC": ["éducation morale et civique"],
  "Arts plastiques": ["éducation plastique et visuelle", "arts plastiques", "peindre"],
  "Éducation musicale": ["cours de musique", "musique", "chanter"],
  "EPS": ["éducation physique et sportive", "eps", "sport"],
  "LVE / Anglais": ["anglais", "cours de langues"],
  "Mobiliser le langage": ["langage", "parler"],
  "Activité physique": ["psychomotricité", "activité physique", "sport"],
  "Activités artistiques": ["éducation artistique", "dessin", "peindre"],
  "Structurer sa pensée": ["compter", "nombre", "mathématiques"],
  "Explorer le monde": ["monde", "sciences de la nature"],
  // L'« accueil » d'ARASAAC, ce sont des clés et des maisons : on dit bonjour.
  "Accueil": ["bonjour"],
  "Rituel": ["calendrier"],
  "Récréation": ["récréation", "cour de récréation"],
  "Pause méridienne": ["cantine", "déjeuner", "repas"],
  // « aide » montre quelqu'un en détresse ; « appui », deux mains qui se tendent.
  "APC": ["appui", "aide"],
  "Temps calme": ["se reposer", "calme", "repos"],
};

export const motsDeLaMatiere = (matiere: string): string[] => MOTS_DES_MATIERES[matiere] ?? [matiere.toLowerCase()];

/**
 * Le picto proposé à chaque matière : celui du premier de ses mots
 * qu'ARASAAC connaît. Pas de préférence pour les dessins « de la classe »,
 * comme pour les verbes : elle ferait passer « compter » devant le picto des
 * mathématiques.
 */
export function pictosDesMatieresProposes(matieres: string[], trouves: { id: number; mot: string }[]): Record<string, number> {
  const parMot = new Map(trouves.map((p) => [p.mot.toLowerCase(), p.id]));
  const sortie: Record<string, number> = {};
  for (const m of matieres) {
    const id = motsDeLaMatiere(m).map((mot) => parMot.get(mot.toLowerCase())).find((x) => x !== undefined);
    if (id !== undefined) sortie[m] = id;
  }
  return sortie;
}

/** Le lexique des matières, dans un réglage à lui : partagé entre les ordinateurs, comme celui des verbes. */
export const CLE_MATIERES = "caa:matieres";

/** Ce qu'on écrit sous le picto : le nom du planning, sans ses abréviations. */
const ETIQUETTES: Record<string, string> = { "LVE / Anglais": "Anglais", "Sciences et techno.": "Sciences et technologie" };
export const etiquetteDeMatiere = (matiere: string) => ETIQUETTES[matiere] ?? matiere;

/** Les matières qui ont un picto, dans l'ordre du planning. */
export const matieresAvecPicto = (lexique: Lexique): string[] => MATIERES_EN_PICTOS.filter((m) => lexique[m] != null);

// ── Les domaines, et ce que la banque propose ──────────────────────────────

/** Une forme comparable d'un nom : sans numéro en tête, sans accents ni majuscules — « 5. Se repérer… » et « se reperer… » se valent. */
export const formeDuNom = (nom: string): string => nom.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/^\s*\d+\s*[.)]\s*/, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Le picto choisi pour un nom — une matière, un domaine —, qu'il soit écrit tel quel ou autrement. */
export function pictoChoisi(choix: Lexique, nom: string): RefPicto | null {
  if (choix[nom] != null) return choix[nom];
  const f = formeDuNom(nom);
  const cle = Object.keys(choix).find((k) => formeDuNom(k) === f);
  return cle ? choix[cle] : null;
}

/**
 * Des mots plus sûrs que le nom d'un domaine, pour qu'on propose un picto
 * parlant : la banque n'a pas « géométrie », et son « espace » est celui des
 * astronautes. Vérifiés sur la banque (octobre 2026).
 */
const MOTS_DES_DOMAINES: [RegExp, string][] = [
  [/mobiliser le langage|^oral$/, "langage"], [/premiers outils mathematiques/, "nombres"], [/se reperer dans le temps/, "calendrier"],
  [/activite physique/, "sport"], [/activites artistiques/, "peindre"],
  [/geometrie/, "quadrillage"], [/grandeurs|mesure/, "mesure"], [/^nombres/, "nombres"],
];
/** Des mots dont le picto porte des mots espagnols, ou trompe : jamais proposés. */
const MOTS_ECARTES = new Set(["histoire", "phrase", "mot", "espace"]);

/**
 * Les mots à chercher dans la banque pour un nom : ceux de la matière s'il
 * en est une ; pour un domaine, des mots sûrs, puis le nom, ses morceaux,
 * leur singulier.
 */
export function motsDuNom(nom: string): string[] {
  if (MOTS_DES_MATIERES[nom]) return MOTS_DES_MATIERES[nom];
  const forme = formeDuNom(nom);
  const propre = nom.toLowerCase().replace(/^\s*\d+\s*[.)]\s*/, "").trim();
  const morceaux = propre.split(/,|\s+et\s+|\s*-\s*|\//).map((m) => m.trim()).filter(Boolean);
  // Le singulier des pluriels — « mesures », « nombres » —, pas celui de « français » ni de « temps ».
  const singuliers = morceaux.map((m) => m.replace(/(?<=[eétrnl])s$/, "").replace(/(?<=eu)x$/, ""));
  return [...new Set([...MOTS_DES_DOMAINES.filter(([re]) => re.test(forme)).map(([, m]) => m), propre, ...morceaux, ...singuliers])]
    .filter((m) => m.length > 1 && !MOTS_ECARTES.has(m));
}

/** Le picto que la banque propose pour chacun de ces noms : celui du premier de leurs mots qu'elle connaît. */
export async function pictosProposes(noms: string[]): Promise<Record<string, number>> {
  const mots = [...new Set(noms.flatMap(motsDuNom))];
  if (!mots.length) return {};
  const trouves = await api.arasaacPourConsignes(mots).catch(() => []);
  const ids = new Map(trouves.map((p) => [p.mot.toLowerCase(), p.id]));
  const sortie: Record<string, number> = {};
  for (const nom of noms) {
    const mot = motsDuNom(nom).find((m) => ids.has(m.toLowerCase()));
    if (mot) sortie[nom] = ids.get(mot.toLowerCase())!;
  }
  return sortie;
}

/**
 * Les domaines des référentiels actifs, rangés sous leur matière de la liste :
 * les sous-domaines d'une matière — Français › Lecture, Écriture… —, et les
 * domaines du cycle 1 sous la leur — Mobiliser le langage › 1. Mobiliser le
 * langage dans toutes ses dimensions. Chacun une fois, dans l'ordre des référentiels.
 */
export function domainesParMatiere(referentiels: Pick<Referentiel, "actif" | "donnees">[]): Record<string, string[]> {
  const sortie: Record<string, string[]> = {};
  const vus = new Set<string>();
  const poser = (matiere: string, nom: string) => {
    const f = formeDuNom(nom);
    if (!f || vus.has(f) || f === formeDuNom(matiere)) return;
    vus.add(f);
    (sortie[matiere] ??= []).push(nom.trim());
  };
  for (const r of referentiels.filter((x) => x.actif)) {
    let domaines: { titre?: string; sousDomaines?: { titre?: string }[] }[] = [];
    try { domaines = JSON.parse(r.donnees)?.domaines ?? []; } catch { domaines = []; }
    if (!Array.isArray(domaines)) continue;
    for (const d of domaines) {
      const titre = (d?.titre ?? "").trim();
      const matiere = MATIERES.includes(titre) ? titre : matiereDuDomaine(titre);
      if (!matiere) continue;
      poser(matiere, titre);
      for (const sd of Array.isArray(d.sousDomaines) ? d.sousDomaines : []) poser(matiere, sd?.titre ?? "");
    }
  }
  return sortie;
}

// ── Un picto par domaine, ou celui de la matière ───────────────────────────
//
// Par défaut, un domaine prend le picto de sa matière : les compétences
// générales des référentiels — « Les êtres vivants dans leur environnement »,
// « Construire des équilibres »… — sont nombreuses, et leurs pictos parlent
// moins aux élèves que celui de la matière (demande de l'enseignant, octobre
// 2026). L'enseignant peut détailler une matière par domaine : chaque domaine
// prend alors son picto, s'il en a un choisi, et celui de la matière sinon.
// Ne plus la détailler garde les pictos choisis, sans s'en servir.

/** Les matières détaillées par domaine, ou non, quand l'enseignant l'a dit : `{ "Français": true }`. */
export const CLE_PAR_DOMAINE = "caa:matieres-par-domaine";

export function lireParDomaine(brut: string | null | undefined): Record<string, boolean> {
  try {
    const v: unknown = JSON.parse(brut || "{}");
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    return Object.fromEntries(Object.entries(v).filter(([, oui]) => typeof oui === "boolean")) as Record<string, boolean>;
  } catch {
    return {};
  }
}

/** Une matière se détaille par domaine si l'enseignant l'a dit ; sans réponse, si l'un de ses domaines a déjà son picto. */
export function detailleeParDomaine(matiere: string, parDomaine: Record<string, boolean>, sesDomaines: string[], choix: Lexique): boolean {
  return parDomaine[matiere] ?? sesDomaines.some((d) => pictoChoisi(choix, d) != null);
}

/** La matière d'un nom : lui-même pour une matière de la liste, celle sous laquelle il se range pour un domaine des référentiels. */
export function matiereDuNom(nom: string, domaines: Record<string, string[]>): string | undefined {
  const f = formeDuNom(nom);
  if (!f) return undefined;
  return MATIERES_EN_PICTOS.find((m) => formeDuNom(m) === f) ?? Object.keys(domaines).find((m) => domaines[m].some((d) => formeDuNom(d) === f));
}

/**
 * Le picto d'un domaine sur le déroulement : le sien, si sa matière se
 * détaille par domaine et qu'on l'a choisi ; sinon celui de sa matière,
 * choisi ou proposé par la banque. Sans matière connue : le sien, choisi ou
 * proposé.
 */
export function pictoDuDomaine(
  nom: string, matiere: string | undefined, choix: Lexique, parDomaine: Record<string, boolean>,
  domaines: Record<string, string[]>, proposes: Record<string, number>,
): RefPicto | null {
  if (!matiere) return pictoChoisi(choix, nom) ?? proposes[nom] ?? null;
  const detaille = formeDuNom(nom) !== formeDuNom(matiere) && detailleeParDomaine(matiere, parDomaine, domaines[matiere] ?? [], choix);
  return (detaille ? pictoChoisi(choix, nom) : null) ?? pictoChoisi(choix, matiere) ?? proposes[matiere] ?? null;
}

