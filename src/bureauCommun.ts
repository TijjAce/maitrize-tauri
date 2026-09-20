// Le bureau commun : empaqueter un dossier pour le déposer, le déballer chez soi.
//
// Un bureau commun est un dossier partagé par un service de stockage (Nuage,
// OneDrive, Google Drive…). On y glisse des fichiers ordinaires — PDF, images,
// documents —, qui restent lisibles par tous, même sans Maitrize ; et des
// dossiers Maitrize, qui partent en un seul fichier « .maitrize » pour garder
// tout ce qui fait une séquence ou un jeu.
//
// Un dossier part entier — séquences et leurs séances, pièces jointes,
// matériel, textes, jeux, outils, affichages, évaluations, ateliers, espaces — avec ses
// sous-dossiers et ses fichiers. Chez le collègue, il devient une copie à lui :
// nouveaux identifiants, nouveaux noms de fichiers, rangée dans un dossier de
// son bureau. Rien ne relie ensuite les deux copies, et c'est voulu : chacun
// modifie la sienne librement, et redépose s'il veut partager la suite.
//
// Ce qui touche aux élèves ne part pas : les bilans de séance (ils les
// nomment souvent), les élèves associés à un outil, le coffre des documents.
// Les textes et documents partent tels qu'ils sont écrits.

import type { Atelier, DocumentOutil, Espace, Jeu, MaterielItem, OutilClasse, PieceJointe, Seance, Sequence, Texte } from "./api";
import { estDans, normaliser } from "./dossiers";

/** Tout ce qu'un dossier peut contenir. */
export interface Contenu {
  sequences: Sequence[]; seances: Seance[]; pieces: PieceJointe[];
  materiels: MaterielItem[]; textes: Texte[];
  jeux: Jeu[]; ateliers: Atelier[]; espaces: Espace[]; outils: OutilClasse[];
}

/** Un dossier empaqueté, tel qu'il est posé sur le bureau commun. */
/**
 * Ce qu'un dossier Maitrize contient, dit en quelques nombres.
 *
 * Il ouvre le fichier : une tuile peut ainsi annoncer « Séquence · 4 séances »
 * sans télécharger les mégaoctets qui suivent.
 */
export interface Resume {
  auteur: string;
  depose: string;
  /** Combien de chaque sorte : « sequences », « jeux », « materiels »… */
  compte: Record<string, number>;
  /** Les séances des séquences emportées. */
  seances: number;
  /** Les fichiers joints. */
  fichiers: number;
}

export interface Paquet {
  v: 1;
  /** Écrit en premier : il se lit sans ouvrir tout le fichier. */
  resume?: Resume;
  /** Le nom du dossier déposé. */
  dossier: string;
  auteur: string;
  depose: string;
  /** Les éléments, leurs dossiers rendus relatifs au dossier déposé ("" : à sa racine). */
  contenu: Contenu;
  /** Couleur des dossiers, par chemin relatif ("" : le dossier déposé lui-même). */
  couleurs: Record<string, string>;
  /** Les fichiers, par nom : leur contenu en base64. */
  fichiers: Record<string, string>;
}

/** Le résumé d'un contenu, tel qu'il s'écrit en tête du paquet. */
export function resumeDe(contenu: Contenu, auteur: string, depose: string, fichiers: number): Resume {
  const compte: Record<string, number> = {};
  const ajouter = (cle: string, n: number) => { if (n) compte[cle] = n; };
  ajouter("sequences", contenu.sequences.length);
  ajouter("materiels", contenu.materiels.length);
  ajouter("textes", contenu.textes.length);
  ajouter("jeux", contenu.jeux.length);
  ajouter("ateliers", contenu.ateliers.length);
  ajouter("espaces", contenu.espaces.length);
  ajouter("outils", contenu.outils.filter((o) => o.genre === "outil").length);
  ajouter("affichages", contenu.outils.filter((o) => o.genre === "affichage").length);
  ajouter("evaluations", contenu.outils.filter((o) => o.genre === "evaluation").length);
  return { auteur, depose, compte, seances: contenu.seances.length, fichiers };
}

/** Le mot d'une sorte, au singulier et au pluriel, avec son icône. */
const SORTES_RESUME: Record<string, { icone: string; un: string; des: string }> = {
  sequences: { icone: "📚", un: "séquence", des: "séquences" },
  materiels: { icone: "🧰", un: "matériel", des: "matériels" },
  textes: { icone: "📝", un: "texte", des: "textes" },
  jeux: { icone: "🎲", un: "jeu", des: "jeux" },
  ateliers: { icone: "🧩", un: "atelier", des: "ateliers" },
  espaces: { icone: "🪑", un: "espace", des: "espaces" },
  outils: { icone: "🧰", un: "outil", des: "outils" },
  affichages: { icone: "🖼", un: "affichage", des: "affichages" },
  evaluations: { icone: "📋", un: "évaluation", des: "évaluations" },
};

/**
 * Ce qu'une tuile montre d'un dossier Maitrize : une icône, et ce qu'il y a
 * dedans en toutes lettres.
 */
export function descriptionDuResume(r: Resume | null): { icone: string; texte: string } {
  const entrees = Object.entries(r?.compte ?? {}).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  if (!entrees.length) return { icone: "📦", texte: "Dossier Maitrize" };
  const mot = ([cle, n]: [string, number]) => {
    const s = SORTES_RESUME[cle] ?? { icone: "📦", un: cle, des: cle };
    return `${n} ${n > 1 ? s.des : s.un}`;
  };
  const icone = SORTES_RESUME[entrees[0][0]]?.icone ?? "📦";
  // Une seule séquence : dire ses séances en dit plus que de la compter.
  if (entrees.length === 1 && entrees[0][0] === "sequences" && entrees[0][1] === 1) {
    return { icone, texte: r!.seances ? `Séquence · ${r!.seances} séance${r!.seances > 1 ? "s" : ""}` : "Séquence" };
  }
  const dits = entrees.slice(0, 2).map(mot);
  if (entrees.length > 2) dits.push("…");
  return { icone, texte: dits.join(" · ") };
}

/** L'extension d'un dossier Maitrize posé sur un bureau commun. */
export const EXTENSION_PAQUET = ".maitrize";

export const estPaquet = (nom: string) => nom.toLowerCase().endsWith(EXTENSION_PAQUET);

/** Le titre d'un dossier Maitrize, sans son extension. */
export const titreDuPaquet = (nom: string) => (estPaquet(nom) ? nom.slice(0, -EXTENSION_PAQUET.length) : nom);

/**
 * Le titre sans le nom de l'auteur, quand on sait qui c'est : la tuile le dit
 * en dessous, et « cycle 1 » se lit mieux que « cycle 1 (Clément Titet) ».
 */
export function titreSansAuteur(nom: string, auteur: string): string {
  const titre = titreDuPaquet(nom);
  const suffixe = ` (${(auteur ?? "").trim()})`;
  return auteur?.trim() && titre.endsWith(suffixe) ? titre.slice(0, -suffixe.length) : titre;
}

/**
 * Un nom de fichier que Windows et macOS acceptent, et que le bureau commun
 * n'interprète pas comme un chemin.
 */
export function nomDeFichierSur(brut: string, secours = "Sans titre"): string {
  const n = [...(brut ?? "").normalize("NFC")]
    .map((c) => (c.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(c) ? " " : c))
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[.\s]+/, "")
    .replace(/[.\s]+$/, "")
    .slice(0, 100)
    .trim();
  return n || secours;
}

/**
 * Le fichier d'un dossier Maitrize déposé : « cycle 1 (Clément).maitrize ».
 * Le nom de l'auteur y est : deux collègues peuvent déposer chacun leur
 * « cycle 1 », et redéposer le sien le remplace.
 */
export const nomDuPaquet = (dossier: string, auteur: string) =>
  `${nomDeFichierSur(dossier)} (${nomDeFichierSur(auteur, "Un collègue")})${EXTENSION_PAQUET}`;

/** Du texte en base64, sans rien perdre des accents. */
export function texteEnBase64(texte: string): string {
  const octets = new TextEncoder().encode(texte);
  let binaire = "";
  for (let i = 0; i < octets.length; i += 0x8000) binaire += String.fromCharCode(...octets.subarray(i, i + 0x8000));
  return btoa(binaire);
}

/** Le texte d'un contenu en base64. */
export function base64EnTexte(b64: string): string {
  const binaire = atob(b64);
  const octets = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
  return new TextDecoder().decode(octets);
}

/** Au-delà, un dépôt serait long à envoyer et à récupérer : mieux vaut des sous-dossiers. */
export const TAILLE_MAX = 150 * 1024 * 1024;

const vide = (): Contenu => ({
  sequences: [], seances: [], pieces: [], materiels: [], textes: [], jeux: [], ateliers: [], espaces: [], outils: [],
});

const liste = <T>(json: string | null | undefined): T[] => {
  try { const v = JSON.parse(json || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
};

/** Le chemin d'un élément, relatif au dossier déposé. */
const relatif = (racine: string, chemin: string) => {
  const c = normaliser(chemin ?? "");
  return c === racine ? "" : c.slice(racine.length + 1);
};

/**
 * Ce que contient un dossier du bureau, sous-dossiers compris, prêt à partir :
 * chemins relatifs, et rien de ce qui touche aux élèves.
 */
export function contenuDuDossier(chemin: string, tout: Contenu): Contenu {
  const racine = normaliser(chemin);
  const dedans = <T extends { dossier: string }>(l: T[]) =>
    l.filter((x) => estDans(normaliser(x.dossier ?? ""), racine)).map((x) => ({ ...x, dossier: relatif(racine, x.dossier) }));

  const sequences = dedans(tout.sequences).map((s) => ({
    ...s,
    // Une appréciation, un projet : c'est à celui qui a fait la séquence.
    projetId: null, ratingEngagement: 0, ratingFacilite: 0, ratingApprentissage: 0, ratingDateMaj: null,
  }));
  const idsSequences = new Set(sequences.map((s) => s.id));
  const seances = tout.seances
    .filter((s) => s.sequenceId && idsSequences.has(s.sequenceId))
    // Le bilan d'une séance nomme souvent les élèves ; sa date est celle d'une classe.
    .map((s) => ({ ...s, bilan: "", bilanDate: null, date: null }));
  const idsSeances = new Set(seances.map((s) => s.id));
  const pieces = tout.pieces.filter((p) => p.seanceId && idsSeances.has(p.seanceId));

  return {
    sequences, seances, pieces,
    materiels: dedans(tout.materiels).map((m) => ({
      ...m,
      // Le coffre garde des documents personnels ; un lien vers une séance qui ne part pas ne mène à rien.
      coffreJson: "[]",
      sequenceId: m.sequenceId && idsSequences.has(m.sequenceId) ? m.sequenceId : null,
      seanceId: m.seanceId && idsSeances.has(m.seanceId) ? m.seanceId : null,
    })),
    textes: dedans(tout.textes.filter((t) => !t.dossier.startsWith("@"))),
    jeux: dedans(tout.jeux),
    ateliers: dedans(tout.ateliers),
    espaces: dedans(tout.espaces),
    // Les élèves qui se servent d'un outil sont ceux de la classe, pas ceux du collègue.
    outils: dedans(tout.outils).map((o) => ({ ...o, elevesJson: "[]" })),
  };
}

/** Les genres d'éléments qu'un bureau peut porter, tels que le plan de travail les nomme. */
export type GenreElement = "sequence" | "materiel" | "texte" | "jeu" | "atelier" | "espace" | "outil";

/**
 * Un seul élément, empaqueté comme un dossier qui ne contiendrait que lui :
 * une séquence glissée sur un bureau commun part avec ses séances et ses
 * pièces jointes, et sans ce qui touche aux élèves.
 */
export function contenuDUnElement(genre: GenreElement, id: string, tout: Contenu): Contenu {
  const seul = <T extends { id: string }>(liste: T[], g: GenreElement) =>
    (g === genre ? liste.filter((x) => x.id === id) : []).map((x) => ({ ...x, dossier: "" }));
  return contenuDuDossier("", {
    sequences: seul(tout.sequences, "sequence"),
    // Séances et pièces suivent leur séquence : le filtrage commun s'en charge.
    seances: tout.seances, pieces: tout.pieces,
    materiels: seul(tout.materiels, "materiel"),
    // Un texte rangé dans un dossier réservé (« @… ») n'est pas à partager.
    textes: seul(tout.textes.filter((t) => !(t.dossier ?? "").startsWith("@")), "texte"),
    jeux: seul(tout.jeux, "jeu"),
    ateliers: seul(tout.ateliers, "atelier"),
    espaces: seul(tout.espaces, "espace"),
    outils: seul(tout.outils, "outil"),
  });
}

/** Combien d'éléments un contenu compte (les séances et pièces vont avec leur séquence). */
export const compter = (c: Contenu) =>
  c.sequences.length + c.materiels.length + c.textes.length + c.jeux.length + c.ateliers.length + c.espaces.length + c.outils.length;

const MARQUE_IMAGE = /\[img:([^\]]+)\]/g;
const MARQUE_FICHIER = /maitrize-fichier:([^"'\s<>)]+)/g;

/** Les fichiers cités dans un texte : images d'un déroulement, photos collées. */
function fichiersDuTexte(texte: string | null | undefined): string[] {
  const sortie: string[] = [];
  for (const m of (texte ?? "").matchAll(MARQUE_IMAGE)) sortie.push(m[1]);
  for (const m of (texte ?? "").matchAll(MARQUE_FICHIER)) sortie.push(m[1]);
  return sortie;
}

/** Tous les fichiers dont le contenu a besoin, chacun une fois. */
export function fichiersDe(c: Contenu): string[] {
  const noms = [
    ...c.sequences.flatMap((s) => [s.imageNom ?? "", ...fichiersDuTexte(s.objectifs)]),
    ...c.seances.flatMap((s) => [
      ...liste<string>(s.imagesDeroulement),
      ...fichiersDuTexte(s.deroulement), ...fichiersDuTexte(s.tableauDeroulement),
      ...fichiersDuTexte(s.objectifs), ...fichiersDuTexte(s.materiel),
    ]),
    ...c.pieces.map((p) => p.nomFichier),
    ...c.materiels.flatMap((m) => [...liste<string>(m.imagesJson), ...liste<string>(m.pdfsJson)]),
    ...c.textes.flatMap((t) => fichiersDuTexte(t.contenu)),
    ...[...c.jeux, ...c.ateliers, ...c.espaces].map((x) => x.imageNom ?? ""),
    ...c.outils.flatMap((o) => [o.imageNom ?? "", ...liste<DocumentOutil>(o.documentsJson).map((d) => d?.fichier ?? "")]),
  ];
  return [...new Set(noms.filter((n) => typeof n === "string" && n.trim()))];
}

/** La couleur des dossiers du dossier déposé, par chemin relatif. */
export function couleursDuDossier(chemin: string, couleurs: Record<string, string>): Record<string, string> {
  const racine = normaliser(chemin);
  const sortie: Record<string, string> = {};
  for (const [c, v] of Object.entries(couleurs)) {
    if (v && estDans(normaliser(c), racine)) sortie[relatif(racine, c)] = v;
  }
  return sortie;
}

/** Le dossier où poser ce qu'on récupère : son nom, ou son nom et celui de l'auteur s'il est pris. */
export function destinationLibre(nom: string, auteur: string, pris: Set<string>): string {
  const base = normaliser(nom) || "Bureau commun";
  const libre = (c: string) => !pris.has(c.toLowerCase());
  if (libre(base)) return base;
  const avecAuteur = auteur.trim() ? `${base} (${auteur.trim()})` : `${base} (reçu)`;
  if (libre(avecAuteur)) return avecAuteur;
  for (let i = 2; ; i++) if (libre(`${avecAuteur} ${i}`)) return `${avecAuteur} ${i}`;
}

/**
 * Le contenu d'un paquet, prêt à poser sur son propre bureau.
 *
 * Tout reçoit un nouvel identifiant, et les liens suivent : une séance reste
 * à sa séquence, une pièce jointe à sa séance. Les fichiers ont été
 * réenregistrés sous un autre nom : chaque mention les suit aussi, jusque dans
 * les images d'un déroulement et les photos collées dans un texte.
 */
export function deballer(p: Paquet, destination: string, renommer: (nom: string) => string, nouvelId: () => string): Contenu {
  const ids = new Map<string, string>();
  const neuf = (ancien: string) => { if (!ids.has(ancien)) ids.set(ancien, nouvelId()); return ids.get(ancien)!; };
  const ou = (rel: string) => normaliser(rel ? `${destination}/${rel}` : destination);
  const texte = (t: string | null | undefined) => (t ?? "")
    .replace(MARQUE_IMAGE, (_, n: string) => `[img:${renommer(n)}]`)
    .replace(MARQUE_FICHIER, (_, n: string) => `maitrize-fichier:${renommer(n)}`);
  const nom = (n: string | null | undefined) => (n ? renommer(n) : n ?? null);
  const noms = (json: string) => JSON.stringify(liste<string>(json).map(renommer));
  const c = p.contenu ?? vide();

  return {
    sequences: c.sequences.map((s) => ({ ...s, id: neuf(s.id), dossier: ou(s.dossier), imageNom: nom(s.imageNom), objectifs: texte(s.objectifs) })),
    seances: c.seances.map((s) => ({
      ...s, id: neuf(s.id), sequenceId: s.sequenceId ? neuf(s.sequenceId) : null,
      deroulement: texte(s.deroulement), tableauDeroulement: texte(s.tableauDeroulement),
      objectifs: texte(s.objectifs), materiel: texte(s.materiel), imagesDeroulement: noms(s.imagesDeroulement),
    })),
    pieces: c.pieces.map((x) => ({ ...x, id: neuf(x.id), seanceId: x.seanceId ? neuf(x.seanceId) : null, nomFichier: renommer(x.nomFichier) })),
    materiels: c.materiels.map((m) => ({
      ...m, id: neuf(m.id), dossier: ou(m.dossier), imagesJson: noms(m.imagesJson), pdfsJson: noms(m.pdfsJson),
      sequenceId: m.sequenceId ? neuf(m.sequenceId) : null, seanceId: m.seanceId ? neuf(m.seanceId) : null,
    })),
    textes: c.textes.map((t) => ({ ...t, id: neuf(t.id), dossier: ou(t.dossier), contenu: texte(t.contenu) })),
    jeux: c.jeux.map((j) => ({ ...j, id: neuf(j.id), dossier: ou(j.dossier), imageNom: nom(j.imageNom) })),
    ateliers: c.ateliers.map((a) => ({ ...a, id: neuf(a.id), dossier: ou(a.dossier), imageNom: nom(a.imageNom) })),
    espaces: c.espaces.map((e) => ({ ...e, id: neuf(e.id), dossier: ou(e.dossier), imageNom: nom(e.imageNom) })),
    outils: c.outils.map((o) => ({
      ...o, id: neuf(o.id), dossier: ou(o.dossier), imageNom: nom(o.imageNom),
      documentsJson: JSON.stringify(liste<DocumentOutil>(o.documentsJson).map((d) => ({ ...d, fichier: renommer(d.fichier) }))),
    })),
  };
}

/** Les couleurs des dossiers reçus, rangés sous leur destination. */
export function couleursDeballees(p: Paquet, destination: string): Record<string, string> {
  const sortie: Record<string, string> = {};
  for (const [rel, v] of Object.entries(p.couleurs ?? {})) sortie[normaliser(rel ? `${destination}/${rel}` : destination)] = v;
  return sortie;
}
