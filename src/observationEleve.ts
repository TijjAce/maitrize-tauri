// ── Observer un élève, et en garder trace ─────────────────────────────────
//
// « On observe tout, donc on n'observe rien. » Un temps d'observation se
// décide à l'avance, sur **un** axe, en lien avec ce qu'on travaille ce
// jour-là — c'est la grille « Observer » de l'académie de Versailles :
// réussites et points d'appui, difficultés et obstacles, hypothèses sur le
// besoin, aménagements proposés, réajustement.
//
// L'axe vient de la grille Cap école inclusive (Réseau Canopé), déjà dans
// l'application : cent un observables rangés sous les cinq domaines du socle.
// Choisir dedans plutôt que d'écrire une intention vague, c'est ce qui rend
// l'observation relisable trois mois plus tard — et transmissible en ESS.
//
// Le bilan du créneau nourrit la fiche : ce qui a été écrit le jour même, à
// chaud, est la matière première. L'IA peut le ranger en colonnes ; c'est
// l'enseignant qui garde la plume.

import { api, type ObservationEleve } from "./api";
import { GRILLES } from "./data/evaluationsDiagnostiques";
import { normaliser } from "./competencesTravaillees";
import { pseudonymiser, restaurer } from "./confidentialite";
import { phrasesQuiCitent, prenomDe } from "./veilleEleve";

/** Un observable de la grille, avec d'où il vient. */
export interface Axe {
  domaine: string;
  sousDomaine: string;
  observable: string;
}

/** Les colonnes de la grille « Observer », dans l'ordre du document. */
export const COLONNES = [
  { id: "reussites", titre: "Réussites, points d'appui", aide: "Ce qui a marché, sur quoi s'appuyer" },
  { id: "difficultes", titre: "Difficultés, obstacles", aide: "Ce qui a bloqué, et dans quel contexte" },
  { id: "hypotheses", titre: "Besoin identifié — hypothèses", aide: "Ce dont l'élève aurait besoin, au conditionnel" },
  { id: "amenagements", titre: "Propositions — aménagements", aide: "Ce qu'on met en place, concrètement" },
  { id: "reajustement", titre: "Évaluation — réajustement", aide: "Ce que ça a donné, ce qu'on change" },
] as const;

export type Colonne = (typeof COLONNES)[number]["id"];

/**
 * Tous les observables de la grille Cap école inclusive, à plat.
 *
 * La grille est décrite pour être imprimée — des blocs, des groupes, des
 * items. Pour choisir un axe, il faut une liste : on la déplie une fois.
 */
export const AXES: Axe[] = (() => {
  const grille = GRILLES.find((g) => g.id === "besoins");
  if (!grille) return [];
  const axes: Axe[] = [];
  for (const bloc of grille.blocs) {
    if (bloc.t !== "echelle") continue;
    for (const groupe of bloc.groupes) {
      for (const item of groupe.items) {
        axes.push({ domaine: bloc.titre, sousDomaine: groupe.nom, observable: item });
      }
    }
  }
  return axes;
})();

/** « Comprend une consigne orale » — le chemin complet, pour une fiche. */
export const cheminDeLAxe = (a: Axe) => `${a.domaine} › ${a.sousDomaine}`;

const MOTS_VIDES = new Set([
  "les", "des", "une", "un", "le", "la", "de", "du", "en", "et", "ou", "dans", "sur", "avec", "pour",
  "par", "aux", "son", "ses", "leur", "leurs", "est", "sont", "que", "qui", "quand", "plus",
  "eleve", "eleves", "seance", "sequence", "travail", "activite", "atelier",
]);

/** Les mots d'un intitulé sur lesquels une comparaison a du sens. */
export function motsUtiles(texte: string): string[] {
  return [...new Set(
    normaliser(texte).replace(/[^\p{L}\p{N} ]/gu, " ").split(" ")
      .filter((m) => m.length >= 4 && !MOTS_VIDES.has(m)),
  )];
}

/**
 * Les axes qui collent le mieux à ce qu'on travaille aujourd'hui.
 *
 * C'est tout l'intérêt de partir du cahier journal : la compétence de la
 * séance désigne déjà le domaine. On classe par mots partagés — l'observable
 * d'abord, son sous-domaine ensuite — et l'on garde l'ordre de la grille à
 * égalité, pour que deux ouvertures de suite proposent la même chose.
 */
export function axesProches(contexte: string, maximum = 8, axes: Axe[] = AXES): Axe[] {
  const mots = motsUtiles(contexte);
  if (!mots.length) return [];
  return axes
    .map((a, rang) => {
      const dans = normaliser(a.observable);
      const autour = normaliser(`${a.sousDomaine} ${a.domaine}`);
      let score = 0;
      for (const m of mots) {
        if (dans.includes(m)) score += 3;
        else if (autour.includes(m)) score += 1;
      }
      return { a, score, rang };
    })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score || x.rang - y.rang)
    .slice(0, maximum)
    .map((x) => x.a);
}

/** Les axes dont l'intitulé, le sous-domaine ou le domaine contient la recherche. */
export function chercherAxes(recherche: string, maximum = 40, axes: Axe[] = AXES): Axe[] {
  const mots = normaliser(recherche).split(" ").filter(Boolean);
  if (!mots.length) return axes.slice(0, maximum);
  return axes
    .filter((a) => {
      const tout = normaliser(`${a.observable} ${a.sousDomaine} ${a.domaine}`);
      return mots.every((m) => tout.includes(m));
    })
    .slice(0, maximum);
}

/** Une fiche d'observation toute neuve, posée sur un axe. */
export function nouvelleObservation(p: {
  id: string; eleveId: string; date: string; creneauId?: string | null;
  contexte?: string; competence?: string; axe?: Axe | null; quand: string;
}): ObservationEleve {
  return {
    id: p.id,
    eleveId: p.eleveId,
    date: p.date,
    creneauId: p.creneauId ?? null,
    contexte: p.contexte ?? "",
    axe: p.axe?.observable ?? "",
    domaine: p.axe ? cheminDeLAxe(p.axe) : "",
    competence: p.competence ?? "",
    note: "", reussites: "", difficultes: "", hypotheses: "", amenagements: "", reajustement: "",
    dateCreation: p.quand,
    dateMaj: p.quand,
  };
}

/** Une fiche est-elle encore vide de tout constat ? */
export const observationVide = (o: ObservationEleve) =>
  !COLONNES.some((c) => (o[c.id] ?? "").trim());

/**
 * Ce que le bilan d'un créneau dit de cet élève.
 *
 * Un bilan parle souvent de plusieurs élèves : on n'en garde que les phrases
 * qui nomment celui-ci — c'est la même règle que la veille sur un élève. S'il
 * n'est nommé nulle part, on garde tout : le créneau était le sien, et
 * l'enseignant tranchera.
 */
export function noteDepuisLeBilan(bilan: string, nomEleve: string): string {
  const part = phrasesQuiCitent(bilan, prenomDe(nomEleve));
  return (part.trim() || bilan.trim());
}

/**
 * Les fiches d'un créneau, mises à jour depuis son bilan.
 *
 * Rendue séparément pour être vérifiable : c'est elle qui, en se trompant,
 * porterait au dossier d'un élève ce qui a été dit d'un autre.
 */
export function fichesANourrir(
  observations: ObservationEleve[],
  creneauId: string,
  bilan: string,
  nomDe: (eleveId: string) => string,
  quand: string,
): ObservationEleve[] {
  const suite: ObservationEleve[] = [];
  for (const o of observations) {
    if (o.creneauId !== creneauId) continue;
    const note = noteDepuisLeBilan(bilan, nomDe(o.eleveId));
    // Rien de neuf : on n'écrit pas pour écrire, et l'on ne touche pas à
    // `dateMaj` — la synchronisation transporterait la ligne pour rien.
    if (note === o.note) continue;
    suite.push({ ...o, note, dateMaj: quand });
  }
  return suite;
}

// ── Ranger le bilan en colonnes ───────────────────────────────────────────

/** Ce qu'on demande au modèle : répartir, pas inventer. */
export function promptRepartition(o: ObservationEleve) {
  const entete = [
    o.axe && `Axe observé : ${o.axe}${o.domaine ? ` (${o.domaine})` : ""}`,
    o.competence && `Compétence travaillée : ${o.competence}`,
    o.contexte && `Contexte : ${o.contexte}`,
    o.date && `Date : ${o.date}`,
  ].filter(Boolean).join("\n");
  return [
    {
      role: "system" as const,
      content: [
        "Tu aides un enseignant du premier degré à ranger une observation d'élève dans la grille « Observer » de l'académie de Versailles.",
        "On te donne l'axe observé et ce que l'enseignant a écrit le jour même, à chaud.",
        "Réponds avec exactement ces cinq titres, chacun sur sa ligne et précédé de « ## » :",
        COLONNES.map((c) => `## ${c.titre}`).join(", ") + ".",
        "Sous chaque titre, une ou deux phrases courtes, ou « - » suivi d'un point par ligne.",
        "Règles : ne mets sous « Réussites » et « Difficultés » que ce qui a été observé, en gardant le contexte ;",
        "les hypothèses s'écrivent au conditionnel et portent sur un besoin, jamais sur un diagnostic ;",
        "les aménagements sont concrets et réalisables en classe ;",
        "laisse « Évaluation — réajustement » vide (« - ») : il se remplit plus tard, quand on aura vu ce que ça donne.",
        "N'invente aucun fait, aucune date, aucun diagnostic. Si une colonne n'a rien, écris « - ».",
        "Le marqueur [P1] remplace le prénom de l'élève : recopie-le exactement.",
      ].join(" "),
    },
    { role: "user" as const, content: `${entete}\n\nCe qui a été écrit :\n${o.note}` },
  ];
}

/** La réponse du modèle, découpée en colonnes de la grille. */
export function lireRepartition(reponse: string): Partial<Record<Colonne, string>> {
  const parTitre = new Map(COLONNES.map((c) => [normaliser(c.titre), c.id as Colonne]));
  const sortie: Partial<Record<Colonne, string>> = {};
  let courante: Colonne | null = null;
  let morceaux: string[] = [];
  const vider = () => {
    const texte = morceaux.join("\n").trim().replace(/^[-–—\s]*$/g, "");
    morceaux = [];
    if (courante && texte) sortie[courante] = texte;
  };
  for (const ligne of (reponse ?? "").split("\n")) {
    const titre = ligne.match(/^\s*#{1,3}\s*(.+?)\s*$/);
    if (titre) {
      vider();
      const t = normaliser(titre[1]);
      courante = parTitre.get(t)
        ?? COLONNES.find((c) => normaliser(c.titre).startsWith(t) || t.startsWith(normaliser(c.titre)))?.id as Colonne
        ?? null;
      continue;
    }
    if (courante) morceaux.push(ligne);
  }
  vider();
  return sortie;
}

/**
 * Range la note en colonnes, prénom masqué.
 *
 * Rien n'est écrasé sans le dire : l'appelant décide quoi faire des colonnes
 * déjà remplies.
 */
export async function repartir(o: ObservationEleve, nomEleve: string): Promise<Partial<Record<Colonne, string>>> {
  if (!o.note.trim()) throw new Error("Rien à ranger : le bilan de ce temps d'observation est vide.");
  const { texte: note, table } = pseudonymiser(o.note, nomEleve ? [nomEleve] : []);
  const modele = await api.modeleActif();
  const rep = await api.mistralChat(promptRepartition({ ...o, note }), modele);
  const lu = lireRepartition(rep);
  const rendu: Partial<Record<Colonne, string>> = {};
  for (const [cle, valeur] of Object.entries(lu) as [Colonne, string][]) {
    rendu[cle] = restaurer(valeur, table).texte;
  }
  if (!Object.keys(rendu).length) throw new Error("La réponse de l'IA n'était pas exploitable.");
  return rendu;
}
