import donnees from "./data/livresDeReference.json";

// ── Lectures à l'école : les listes de référence d'Éduscol ────────────────
//
// Les sélections du ministère pour la littérature à l'école : le cycle 1 en
// 2020, les cycles 2 et 3 en 2018. 908 albums, contes, romans, poésies,
// bandes dessinées et pièces de théâtre, relevés dans les fichiers tableur
// d'Éduscol. Chaque livre porte une catégorie, un niveau de difficulté (de 1
// à 4 en maternelle, de 1 à 3 ensuite) et parfois un P ou un C. Les noms
// restent écrits comme les listes les écrivent : « Nom, Prénom », mais aussi
// des pseudonymes, des « & » et des tirets, qu'on abîmerait à les retourner.

export type Cycle = 1 | 2 | 3;

export interface LivreReference {
  cycle: Cycle;
  titre: string;
  /** Tels que la liste les écrit ; vide pour un conte ou un texte sans auteur. */
  auteurs: string;
  /** Au cycle 1, quand l'illustrateur n'est pas l'auteur. */
  illustrateurs?: string;
  /** L'éditeur, ou les éditions conseillées quand la liste en cite plusieurs. */
  editeur: string;
  /** Le niveau de difficulté, ou l'intervalle des niveaux : [2, 2], [1, 3]. */
  difficulte: [number, number];
  categorie: string;
  /** P : patrimoine ; C : classique de la littérature de jeunesse. */
  statut?: "P" | "C";
  /** Au cycle 1 : l'une des versions d'un même conte traditionnel. */
  conte?: boolean;
}

export const LIVRES = donnees as LivreReference[];

export const PAGE_EDUSCOL = "https://eduscol.education.gouv.fr/6825/lectures-l-ecole-des-listes-de-reference";
const DOC = "https://eduscol.education.gouv.fr/sites/default/files/document/";

/** Chaque liste : son année, sa difficulté la plus haute, et ses PDF sur Éduscol. */
export const LISTES: Record<Cycle, { annee: number; difficulteMax: number; imprimer: string; criteres: string; notices?: string }> = {
  1: {
    annee: 2020, difficulteMax: 4,
    imprimer: DOC + "lecture-cycle-1-liste-de-reference-2020-pdf-74148.pdf",
    criteres: DOC + "presentationselection-maternelle140727relumcm2342050pdf-74145.pdf",
  },
  2: {
    annee: 2018, difficulteMax: 3,
    imprimer: DOC + "lecture-cycle-2-liste-de-reference-2018-pdf-74157.pdf",
    criteres: DOC + "criteresdeselectionlitteraturecycle2986241pdf-74154.pdf",
  },
  3: {
    annee: 2018, difficulteMax: 3,
    imprimer: DOC + "lecture-cycle-3-liste-de-reference-2018-pdf-74166.pdf",
    criteres: DOC + "criteresdeselectionlitteraturecycle3613582pdf-74163.pdf",
    notices: DOC + "notices-des-ouvrages-de-litterature-pour-le-cycle-3-2018-73239.pdf",
  },
};

/** Ce que disent le P et le C, d'après la présentation d'Éduscol. */
export const STATUTS = {
  P: { court: "P · patrimoine", long: "Patrimoine : une œuvre de référence tombée dans le domaine public" },
  C: { court: "C · classique", long: "Classique de la littérature de jeunesse : une œuvre plus récente, souvent étudiée et rééditée" },
} as const;

export const CONTE = "L'une des versions d'un même conte traditionnel (réécriture, emprunt, parodie…) : à lire en réseau avec les autres";

/** « L’École des loisirs » → « l ecole des loisirs » : ni accents, ni ponctuation, ni majuscules. */
export function sansAccents(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/œ/g, "oe").replace(/æ/g, "ae").replace(/[^a-z0-9]+/g, " ").trim();
}

/** La famille d'une catégorie : « Bandes dessinées (manga) » se range avec les bandes dessinées. */
export const familleDe = (categorie: string) => categorie.replace(/\s*\([^)]*\)\s*$/, "");

/** Les familles des livres d'un cycle (0 : de tous), dans l'ordre des listes. */
export function famillesDu(cycle: Cycle | 0, livres: LivreReference[] = LIVRES): string[] {
  return [...new Set(livres.filter((l) => !cycle || l.cycle === cycle).map((l) => familleDe(l.categorie)))];
}

export interface FiltreLivres {
  texte: string;
  /** 0 : tous les cycles. */
  cycle: Cycle | 0;
  famille: string;
  /** 0 : toutes ; sinon les livres dont l'intervalle contient ce niveau. */
  difficulte: number;
  /** « PC » : patrimoine ou classique. */
  statut: "" | "P" | "C" | "PC";
}

export const FILTRE_VIDE: FiltreLivres = { texte: "", cycle: 0, famille: "", difficulte: 0, statut: "" };

/** Des réglages relus de la mémoire : ce qui n'a plus de sens revient au défaut. */
export function filtreSur(brut: unknown): FiltreLivres {
  const f = { ...FILTRE_VIDE, ...(brut && typeof brut === "object" ? brut : {}) } as FiltreLivres;
  const cycle = ([1, 2, 3] as const).find((c) => c === f.cycle) ?? 0;
  const max = cycle ? LISTES[cycle].difficulteMax : 4;
  return {
    texte: typeof f.texte === "string" ? f.texte : "",
    cycle,
    famille: typeof f.famille === "string" && famillesDu(cycle).includes(f.famille) ? f.famille : "",
    difficulte: Number.isInteger(f.difficulte) && f.difficulte >= 1 && f.difficulte <= max ? f.difficulte : 0,
    statut: (["P", "C", "PC"] as const).find((s) => s === f.statut) ?? "",
  };
}

/**
 * Les livres qui répondent au filtre.
 *
 * Chaque mot cherché doit commencer un mot du titre, des noms, de l'éditeur
 * ou de la catégorie : « loup » trouve « Loups », pas « Guadeloupe ». Sans
 * rien à chercher, les livres restent dans l'ordre des listes — par cycle,
 * par catégorie, par auteur ; sinon le titre passe avant les noms.
 */
export function chercherLivres(f: FiltreLivres, livres: LivreReference[] = LIVRES): LivreReference[] {
  const mots = sansAccents(f.texte).split(" ").filter(Boolean);
  const phrase = mots.join(" ");
  const retenus: { l: LivreReference; note: number; rang: number }[] = [];
  livres.forEach((l, rang) => {
    if (f.cycle && l.cycle !== f.cycle) return;
    if (f.famille && familleDe(l.categorie) !== f.famille) return;
    if (f.difficulte && (f.difficulte < l.difficulte[0] || f.difficulte > l.difficulte[1])) return;
    if (f.statut && !(l.statut && f.statut.includes(l.statut))) return;
    if (!mots.length) { retenus.push({ l, note: 0, rang }); return; }
    const titre = ` ${sansAccents(l.titre)} `;
    const noms = ` ${sansAccents(`${l.auteurs} ${l.illustrateurs ?? ""}`)} `;
    const tout = `${titre}${noms} ${sansAccents(l.editeur)} ${sansAccents(l.categorie)} `;
    if (!mots.every((m) => tout.includes(` ${m}`))) return;
    let note = titre.trim() === phrase ? 8 : titre.startsWith(` ${phrase}`) ? 5 : titre.includes(` ${phrase} `) ? 3 : 0;
    for (const m of mots) note += titre.includes(` ${m}`) ? 2 : noms.includes(` ${m}`) ? 1 : 0;
    retenus.push({ l, note, rang });
  });
  return retenus.sort((a, b) => b.note - a.note || a.rang - b.rang).map((r) => r.l);
}

/** « difficulté 2 sur 3 », « difficulté 1 à 4 sur 4 ». */
export function difficulteLisible(l: LivreReference): string {
  const [a, b] = l.difficulte;
  return `difficulté ${a === b ? a : `${a} à ${b}`} sur ${LISTES[l.cycle].difficulteMax}`;
}

/** Les auteurs, puis l'illustrateur quand ce n'est pas l'auteur. */
export function nomsDuLivre(l: LivreReference): string {
  return [l.auteurs, l.illustrateurs ? `ill. ${l.illustrateurs}` : ""].filter(Boolean).join(" ; ");
}

/** « Zoom » — Banyai, Istvan (Circonflexe) : de quoi le retrouver chez un libraire. */
export function referenceDuLivre(l: LivreReference, editeur = l.editeur): string {
  const noms = nomsDuLivre(l);
  return `« ${l.titre} »${noms ? ` — ${noms}` : ""}${editeur ? ` (${editeur})` : ""}`;
}

/** Où le livre se range : « cycle 2, Album tout en images, difficulté 2 sur 3, classique ». */
export function placeDuLivre(l: LivreReference): string {
  return [`cycle ${l.cycle}`, l.categorie, difficulteLisible(l), l.statut === "P" ? "patrimoine" : l.statut === "C" ? "classique" : ""]
    .filter(Boolean).join(", ");
}

/** Une ligne par livre, pour coller la sélection dans un mot, une progression, une commande. */
export function listeEnTexte(livres: LivreReference[]): string {
  return livres.map((l) => `${referenceDuLivre(l)} — ${placeDuLivre(l)}`).join("\n");
}

/** La première édition citée, coupée à une virgule : l'assistant n'a pas besoin des six. */
export function premiereEdition(editeur: string): string {
  const e = editeur.split(" / ")[0].trim();
  if (e.length <= 60) return e;
  const virgule = e.lastIndexOf(", ", 60);
  return `${(virgule > 10 ? e.slice(0, virgule) : e.slice(0, 59)).trimEnd()}…`;
}

const GARDE = "Si tu ne le connais pas bien, dis-le plutôt que d'inventer.";

/** Ce qu'on peut demander à l'assistant sur un livre. */
export const DEMANDES = [
  { id: "presenter", icone: "📖", libelle: "Présenter le livre et son intérêt" },
  { id: "sequence", icone: "🗂", libelle: "Une séquence de lecture autour du livre" },
  { id: "questions", icone: "❓", libelle: "Des questions de compréhension" },
  { id: "libre", icone: "✏️", libelle: "Ma propre question…" },
] as const;
export type Demande = typeof DEMANDES[number]["id"];

/**
 * La question préparée pour l'assistant : le livre, sa place dans la liste,
 * et la demande. « Ma propre question » s'arrête où l'on écrira la sienne.
 */
export function questionSurLeLivre(l: LivreReference, demande: Demande): string {
  const livre = `ce livre de la liste de référence d'Éduscol (${placeDuLivre(l)}) : ${referenceDuLivre(l, premiereEdition(l.editeur))}`;
  switch (demande) {
    case "presenter": return `Présente-moi ${livre}. De quoi parle-t-il, qu'apporte-t-il en classe, à quels élèves le proposer ? ${GARDE}`;
    case "sequence": return `Propose-moi une séquence de lecture autour de ${livre}. Objectifs, séances, activités et traces écrites. ${GARDE}`;
    case "questions": return `Propose des questions de compréhension, des plus simples aux plus fines, sur ${livre}. ${GARDE}`;
    case "libre": return `À propos de ${livre} (si tu ne le connais pas bien, dis-le plutôt que d'inventer). `;
  }
}

/** « cycle 1, Poésie, difficulté 2, patrimoine et classiques, « loup » ». */
export function descriptionDuFiltre(f: FiltreLivres): string {
  return [
    f.cycle ? `cycle ${f.cycle}` : "",
    f.famille,
    f.difficulte ? `difficulté ${f.difficulte}` : "",
    f.statut === "PC" ? "patrimoine et classiques" : f.statut === "P" ? "patrimoine" : f.statut === "C" ? "classiques" : "",
    f.texte.trim() ? `« ${f.texte.trim()} »` : "",
  ].filter(Boolean).join(", ");
}

/** Au-delà, la question devient trop longue pour qu'on la relise avant de l'envoyer. */
export const SELECTION_MAX = 60;

/**
 * Une question sur toute une sélection : l'assistant choisit parmi ces
 * livres-là, pas dans sa mémoire. On écrit sa demande après « Parmi ces
 * livres, ».
 */
export function questionSurLaSelection(livres: LivreReference[], f: FiltreLivres): string {
  const description = descriptionDuFiltre(f);
  const lignes = livres.map((l) => `- ${referenceDuLivre(l, premiereEdition(l.editeur))} — ${placeDuLivre(l)}`);
  return [
    `Voici ${livres.length} livre${livres.length > 1 ? "s" : ""} de la liste de référence d'Éduscol${description ? ` (${description})` : ""} :`,
    ...lignes,
    "Ne retiens que des livres de cette liste, et dis-le si tu en connais mal un plutôt que d'inventer.",
    "Parmi ces livres, ",
  ].join("\n");
}
