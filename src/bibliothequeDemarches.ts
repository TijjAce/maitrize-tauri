// La bibliothèque des démarches (demande de l'enseignant, octobre 2026) : au lieu d'un menu où plus de trois cents
// démarches défilaient en une liste, une bibliothèque, comme celle du coffre-fort de « Citer un passage ».
//
// Deux sortes de livres, à ne pas confondre (« qu'on puisse bien faire la distinction entre une méthodologie et une
// séquence toute faite ») : une séquence toute faite vise une notion, à une classe — ses séances sont écrites, comme
// dans les dossiers de Fabriquer ; une méthodologie est une façon de faire, qui vaut pour toute notion — la démarche
// d'investigation, l'enseignement explicite, La Martinière. Les séquences se rangent par discipline, puis par classe
// et par domaine ; les méthodologies par famille.

import { couleurHex, couleurPourMatiere } from "./api";
import { DEMARCHES, FAMILLES, type Demarche, type Famille } from "./demarches";
import type { Classe } from "./feuillesDesSequences";
import { sequenceDuManuel } from "./sequencesDuManuel";
import { CLASSES, DISCIPLINES, DOMAINES, classesDeLaDemarche, domaineDeLaDemarche, nomSansClasse, type Domaine } from "./sequencesToutesFaites";

export type Sorte = "sequence" | "methodologie";

export interface Rayon { cle: string; sorte: Sorte | "competence"; nom: string; icone: string }

/** Les démarches de la compétence de la séquence, avant tous les rayons. */
export const RAYON_COMPETENCE: Rayon = { cle: "competence", sorte: "competence", nom: "Pour cette compétence", icone: "🎯" };

export const ICONE_DU_RAYON: Record<Famille, string> = {
  "Toutes disciplines": "🧭", "Français": "📖", "Mathématiques": "🔢", "Sciences, histoire, EMC": "🔬",
  "Arts, EPS et langues": "🎨", "Maternelle": "🧸",
};

const MATERNELLE = "Maternelle";
export const RAYONS_DES_SEQUENCES: Rayon[] = [
  ...DISCIPLINES.map((d) => ({ cle: `sequences:${d.nom}`, sorte: "sequence" as const, nom: d.nom, icone: d.icone })),
  { cle: `sequences:${MATERNELLE}`, sorte: "sequence", nom: MATERNELLE, icone: ICONE_DU_RAYON.Maternelle },
];
export const RAYONS_DES_METHODOLOGIES: Rayon[] = FAMILLES.map((f) => ({ cle: `methodologies:${f}`, sorte: "methodologie", nom: f, icone: ICONE_DU_RAYON[f] }));

const ICONE_DU_DOMAINE: Record<string, string> = {
  nombres: "🔢", calcul: "🧮", problemes: "🧩", algebre: "🟰", fractions: "🍕", decimaux: "💶", grandeurs: "📏",
  geometrie: "📐", donnees: "📊", proportionnalite: "⚖️",
  code: "🔤", comprendre: "📖", geste: "✍️", ecrire: "📝", orthographe: "✏️", langue: "🏷️", vocabulaire: "💬", oral: "🗣️",
  temps: "⏳", espace: "🗺️", temps2020: "⏳", espace2020: "🗺️",
};

/** Les démarches sans domaine — les méthodologies, la maternelle — : chacune son image. */
const ICONE_DE_LA_DEMARCHE: Record<string, string> = {
  "eduscol-quatre-temps": "🧭", explicite: "🎯",
  "lecture-code": "🔤", "lecture-fluence": "🎙️", comprehension: "📖", "ecriture-geste": "✍️", "ecriture-rediger": "📝",
  oral: "🗣️", vocabulaire: "💬", grammaire: "🏷️",
  problemes: "🧩", "calcul-mental-martiniere": "🧠", "geometrie-grandeurs": "📐",
  investigation: "🔬", "enquete-histoire-geo": "🔎", "emc-debat": "⚖️",
  "arts-plastiques": "🎨", musique: "🎵", "histoire-des-arts": "🖼️", "eps-module": "🏃", "langues-vivantes": "🌐",
  "maternelle-modalites": "🧸", phonologie: "👂", "categoriser-maternelle": "🗂️", "vilain-petit-canard-ms": "🦆",
  "vilain-petit-canard-gs": "🦆", "collections-maternelle": "🧺", "probleme-du-jour-maternelle": "🧩", "chronologie-maternelle": "🎞️",
  "formes-tangram-gs": "🔷", "decomposition-additive-gs": "🐦",
};

/**
 * Les méthodologies de la maternelle : apprendre en jouant, en réfléchissant, en s'exerçant, en mémorisant ; les étapes du
 * guide pour catégoriser les mots, quel que soit l'univers. Ses autres démarches visent une notion — la conscience
 * phonologique, les collections, la chronologie, le problème du jour, l'album du Vilain Petit Canard — : des séquences.
 */
const METHODOLOGIES_DE_MATERNELLE = new Set(["maternelle-modalites", "categoriser-maternelle"]);

/** La matière de l'emploi du temps qui donne sa couleur au livre ; rien pour une démarche de toutes les disciplines. */
function matiereDe(d: Demarche, domaine: Domaine | null): string | null {
  switch (d.famille) {
    case "Français": return "Français";
    case "Mathématiques": return "Mathématiques";
    case "Sciences, histoire, EMC":
      if (d.id === "emc-debat") return "EMC";
      return domaine || d.id === "enquete-histoire-geo" ? "Histoire-Géographie" : "Sciences et techno.";
    case "Arts, EPS et langues":
      return d.id === "musique" ? "Éducation musicale" : d.id === "eps-module" ? "EPS" : d.id === "langues-vivantes" ? "LVE / Anglais" : "Arts plastiques";
    case "Maternelle":
      // Les séquences du manuel du CRPE de l'enseignant disent la leur (voir sequencesDuManuel.ts).
      if (sequenceDuManuel(d.id)?.matiere) return sequenceDuManuel(d.id)!.matiere!;
      if (/collections|probleme/.test(d.id)) return "Structurer sa pensée";
      if (/chronologie/.test(d.id)) return "Explorer le monde";
      return d.id === "maternelle-modalites" ? null : "Mobiliser le langage";
    default: return null;
  }
}

export interface Livre {
  demarche: Demarche;
  /** Son nom sans la classe qui le termine : la couverture la dit. */
  titre: string;
  classes: Classe[];
  domaine: Domaine | null;
  sorte: Sorte;
  /** La clé de son rayon. */
  rayon: string;
  icone: string;
  matiere: string | null;
}

const livres = new Map<string, Livre>();
export function livreDe(d: Demarche): Livre {
  let l = livres.get(d.id);
  if (!l) {
    const domaine = domaineDeLaDemarche(d);
    const classes = classesDeLaDemarche(d);
    const sorte: Sorte = classes.length || domaine || (d.famille === MATERNELLE && !METHODOLOGIES_DE_MATERNELLE.has(d.id)) ? "sequence" : "methodologie";
    l = {
      demarche: d, titre: nomSansClasse(d.nom), classes, domaine, sorte,
      rayon: sorte === "methodologie" ? `methodologies:${d.famille}` : `sequences:${domaine?.discipline ?? MATERNELLE}`,
      icone: (domaine && ICONE_DU_DOMAINE[domaine.id]) || ICONE_DE_LA_DEMARCHE[d.id] || ICONE_DU_RAYON[d.famille],
      matiere: matiereDe(d, domaine),
    };
    livres.set(d.id, l);
  }
  return l;
}

/** Ce que le livre est, en clair : « Séquence toute faite — CE1 · Le calcul », « Méthodologie — Mathématiques ». */
export function sorteDuLivre(l: Livre): string {
  if (l.sorte === "methodologie") return `Méthodologie — ${l.demarche.famille}`;
  const ou = [classesDuLivre(l), l.domaine?.nom ?? (l.demarche.famille === MATERNELLE ? MATERNELLE : "")].filter(Boolean).join(" · ");
  return `Séquence toute faite${ou ? ` — ${ou}` : ""}`;
}

/** La couleur du livre, celle de sa matière dans l'emploi du temps (choix de l'enseignant compris) ; rien : celle de l'application. */
export const couleurDuLivre = (l: Livre): string | null => (l.matiere ? couleurHex[couleurPourMatiere(l.matiere)] ?? couleurHex.blue : null);

/** Les classes que dit la couverture : « CE1 », « CP–CE2 ». */
export const classesDuLivre = (l: Livre) => (l.classes.length > 1 ? `${l.classes[0]}–${l.classes[l.classes.length - 1]}` : l.classes[0] ?? "");

export interface Etagere { titre: string | null; livres: Livre[] }

const plat = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const texteDe = (l: Livre) => plat(`${l.demarche.nom} ${l.demarche.resume} ${l.domaine?.nom ?? ""} ${l.demarche.famille}`);

/** Une démarche de cette classe — ou de toutes : une méthodologie vaut partout. */
const deLaClasse = (l: Livre, classe: Classe | null) => !classe || !l.classes.length || l.classes.includes(classe);
const rangDeClasse = (l: Livre) => (l.classes.length ? CLASSES.indexOf(l.classes[0]) : -1);
const parClasse = (a: Livre, b: Livre) => rangDeClasse(a) - rangDeClasse(b);

const TOUS_LES_RAYONS = [...RAYONS_DES_SEQUENCES, ...RAYONS_DES_METHODOLOGIES];
const duRayon = (cle: string) => DEMARCHES.map(livreDe).filter((l) => l.rayon === cle);

/** Les classes que les séquences d'un rayon nomment, pour le filtrer. */
export function classesDuRayon(cle: string): Classe[] {
  const presentes = new Set(duRayon(cle).flatMap((l) => l.classes));
  return CLASSES.filter((c) => presentes.has(c));
}

/** Combien de livres un rayon garde à la classe choisie : le nombre à côté de son nom. */
export function nombreDuRayon(cle: string, classe: Classe | null, proposees: Demarche[]): number {
  if (cle === RAYON_COMPETENCE.cle) return proposees.length;
  return duRayon(cle).filter((l) => deLaClasse(l, classe)).length;
}

/**
 * Les étagères à montrer. Une recherche passe tous les rayons — les séquences, puis les méthodologies. Un rayon de
 * séquences range ses livres par domaine, chacun de la première classe à la dernière ; un rayon de méthodologies n'a
 * qu'une étagère. Une étagère seule n'a pas de titre.
 */
export function etageres(o: { rayon: string; classe: Classe | null; recherche: string; proposees: Demarche[] }): Etagere[] {
  const mots = plat(o.recherche).split(/\s+/).filter(Boolean);
  if (mots.length) {
    const trouves = DEMARCHES.map(livreDe).filter((l) => deLaClasse(l, o.classe) && mots.every((m) => texteDe(l).includes(m)));
    return TOUS_LES_RAYONS.map((r) => ({
      titre: `${r.sorte === "sequence" ? "Séquences toutes faites" : "Méthodologies"} — ${r.nom}` as string | null,
      livres: trouves.filter((l) => l.rayon === r.cle).sort(parClasse),
    })).filter((e) => e.livres.length);
  }
  if (o.rayon === RAYON_COMPETENCE.cle) return [{ titre: null, livres: o.proposees.map(livreDe) }];
  const livresDuRayon = duRayon(o.rayon).filter((l) => deLaClasse(l, o.classe));
  const rangees: Etagere[] = [
    ...DOMAINES.map((dom) => ({ titre: dom.nom as string | null, livres: livresDuRayon.filter((l) => l.domaine?.id === dom.id).sort(parClasse) })),
    { titre: null, livres: livresDuRayon.filter((l) => !l.domaine) },
  ].filter((e) => e.livres.length);
  return rangees.length === 1 ? [{ titre: null, livres: rangees[0].livres }] : rangees;
}

/** Le rayon où la bibliothèque s'ouvre : les démarches de la compétence, s'il y en a plusieurs ; sinon celui de la démarche donnée. */
export function rayonDeDepart(proposees: Demarche[], depuis?: Demarche): string {
  if (proposees.length > 1) return RAYON_COMPETENCE.cle;
  const d = depuis ?? proposees[0];
  return d ? livreDe(d).rayon : RAYONS_DES_SEQUENCES[0].cle;
}

/** La classe d'une compétence (« CE1 »), si c'en est une de l'élémentaire : la bibliothèque s'ouvre sur elle. */
export const classeDeDepart = (niveau: string | null | undefined): Classe | null => CLASSES.find((c) => c === niveau?.trim()) ?? null;
