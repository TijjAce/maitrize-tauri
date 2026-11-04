// Les supports d'une séance : un outil pour l'élève, un affichage, un jeu,
// une évaluation ou un matériel du plan de travail, posés dans la séance
// (demande de l'enseignant, octobre 2026) ; un outil pour l'enseignant aussi
// — ses classeurs… —, « il faudrait également ajouter […] outils pour
// l'enseignant » (l'enseignant, 4 novembre 2026).
//
// Le support reste sur le bureau, à sa place : la séance y renvoie. Le renvoi
// est une ligne de son matériel qui porte la sorte et l'identifiant de
// l'élément (`supportJson`) ; la séance montre l'élément tel qu'il est
// aujourd'hui, et le retirer de la séance ne le retire pas du bureau. Les
// feuilles PDF, elles, se copient dans la séance (voir materielSeance) : elles
// s'impriment à la suite du cahier journal, et peuvent changer d'une séance à
// l'autre. Le cahier journal montre, sous le prévu, ceux des séances du
// créneau, avec leur image : la photo que l'enseignant leur a donnée dans
// Réglages › Personnalisation, sinon la leur (demande de l'enseignant,
// 2026-11-01).

import type { Creneau, Jeu, MaterielItem, OutilClasse, Seance, Sequence } from "./api";
import { liensDuCreneau } from "./materielAImprimer";
import { escapeHtml } from "./print";

export type GenreDeSupport = "outil" | "enseignant" | "affichage" | "evaluation" | "jeu" | "materiel";

export interface RenvoiDeSupport {
  genre: GenreDeSupport;
  /** L'identifiant de l'élément du bureau. */
  source: string;
}

/** Les sortes de supports, dans l'ordre du menu « Nouveau support » du plan de travail. */
export const GENRES_DE_SUPPORT: readonly { id: GenreDeSupport; nom: string; pluriel: string; ico: string; nouveau: string }[] = [
  { id: "outil", nom: "Outil pour l'élève", pluriel: "Outils pour l'élève", ico: "📏", nouveau: "Nouvel outil pour l'élève" },
  { id: "enseignant", nom: "Outil pour l'enseignant", pluriel: "Outils pour l'enseignant", ico: "🧑‍🏫", nouveau: "Nouvel outil pour l'enseignant" },
  { id: "affichage", nom: "Affichage", pluriel: "Affichages", ico: "🖼", nouveau: "Nouvel affichage" },
  { id: "jeu", nom: "Jeu", pluriel: "Jeux", ico: "🎲", nouveau: "Nouveau jeu" },
  { id: "evaluation", nom: "Évaluation", pluriel: "Évaluations", ico: "📋", nouveau: "Nouvelle évaluation" },
  { id: "materiel", nom: "Matériel", pluriel: "Matériel", ico: "🧰", nouveau: "Nouveau matériel" },
];

export const genreDeSupport = (id: GenreDeSupport) => GENRES_DE_SUPPORT.find((g) => g.id === id)!;

const estUnGenre = (g: unknown): g is GenreDeSupport => GENRES_DE_SUPPORT.some((x) => x.id === g);

/** Le renvoi d'une ligne de matériel ; rien pour un matériel qui n'est pas un support de séance. */
export function lireRenvoi(json: string | null | undefined): RenvoiDeSupport | null {
  if (!json) return null;
  try {
    const r = JSON.parse(json) as Partial<RenvoiDeSupport> | null;
    return r && estUnGenre(r.genre) && typeof r.source === "string" && r.source ? { genre: r.genre, source: r.source } : null;
  } catch {
    return null;
  }
}

/**
 * La ligne de la séance qui renvoie à un élément du bureau. Le titre de
 * l'élément y est recopié : il dit encore ce que c'était si l'élément quitte
 * le bureau, ou si la séance part chez un collègue qui ne l'a pas.
 */
export function renvoiVers(
  seance: { id: string; sequenceId: string | null }, renvoi: RenvoiDeSupport, titre: string, id: string, date: string,
): MaterielItem {
  return {
    id, titre: titre.trim() || genreDeSupport(renvoi.genre).nom, descriptionMateriel: "",
    competenceId: "", competenceTitre: "", domaineTitre: "", sousDomaineTitre: "", cycle: "",
    imagesJson: "[]", pdfsJson: "[]", dateCreation: date, seanceId: seance.id, sequenceId: seance.sequenceId,
    dossier: "", videosJson: "[]", coffreJson: "[]", supportJson: JSON.stringify(renvoi),
  };
}

/** Les supports posés dans une séance, dans l'ordre où on les a posés. */
export function supportsDeLaSeance(materiel: MaterielItem[], seanceId: string): MaterielItem[] {
  return materiel
    .filter((m) => m.seanceId === seanceId && lireRenvoi(m.supportJson))
    .sort((a, b) => a.dateCreation.localeCompare(b.dateCreation));
}

/**
 * Les supports des séances d'un créneau — la séance posée, et celles que le
 * prévu cite par leur ligne 📚 —, chacun une fois ; sans les jeux, que leur
 * règle montre déjà quand le prévu les nomme.
 */
export function supportsDuCreneau(
  c: Pick<Creneau, "seanceId" | "prevu">, sequences: Sequence[], seances: Seance[], materiel: MaterielItem[],
): MaterielItem[] {
  const vus = new Set<string>();
  return [...liensDuCreneau(c, sequences, seances).seances].flatMap((id) => supportsDeLaSeance(materiel, id)).filter((m) => {
    const r = lireRenvoi(m.supportJson);
    const cle = r ? `${r.genre}:${r.source}` : "";
    return r !== null && r.genre !== "jeu" && !vus.has(cle) && Boolean(vus.add(cle));
  });
}

/**
 * Les supports d'un créneau pour le PDF du jour, sur une ligne : chacun son
 * image — `images`, prêtes à imprimer, par « genre:id » —, sa sorte et son nom.
 */
export function supportsImprimes(supports: MaterielItem[], bureau: SourcesDuBureau, images: Record<string, string> = {}): string {
  const morceaux = supports.flatMap((m) => {
    const r = lireRenvoi(m.supportJson);
    if (!r) return [];
    const e = elementDuRenvoi(r, bureau);
    const image = images[`${r.genre}:${r.source}`];
    return [`<span class="support-imprime">${image ? `<img alt="" src="${escapeHtml(image)}">` : ""}`
      + `${genreDeSupport(r.genre).ico} ${escapeHtml(e?.titre || m.titre)}${e?.detail ? `<span class="support-imprime-detail"> · ${escapeHtml(e.detail)}</span>` : ""}</span>`];
  });
  return morceaux.length ? `<div class="supports-imprimes">${morceaux.join("")}</div>` : "";
}

export const STYLE_SUPPORTS_IMPRIMES = `
  .supports-imprimes { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 4px; }
  .support-imprime { display: inline-flex; align-items: center; gap: 5px; break-inside: avoid; page-break-inside: avoid; }
  .support-imprime img { width: 14mm; height: 14mm; object-fit: contain; margin: 0; border-radius: 3px; border: 1px solid #d7dbe6; background: #fff; }
  .support-imprime-detail { color: #7a7f8f; }
`;

/** Cet élément du bureau est-il déjà posé dans la séance ? */
export function dejaPose(supports: MaterielItem[], renvoi: RenvoiDeSupport): boolean {
  return supports.some((m) => {
    const r = lireRenvoi(m.supportJson);
    return r?.genre === renvoi.genre && r.source === renvoi.source;
  });
}

/** Un élément du bureau, quelle que soit sa sorte, tel qu'une liste le montre. */
export interface ElementDeSupport {
  renvoi: RenvoiDeSupport;
  titre: string;
  /** Ce qui le situe : catégorie, où il est rangé, durée d'un jeu… */
  detail: string;
  dossier: string;
  image: string | null;
}

const comparer = new Intl.Collator("fr", { sensitivity: "base", numeric: true }).compare;

const elementDOutil = (o: OutilClasse): ElementDeSupport => ({
  renvoi: { genre: o.genre, source: o.id }, titre: o.titre, dossier: o.dossier, image: o.imageNom,
  detail: [o.categorie, o.lieu].filter(Boolean).join(" · "),
});
const elementDeJeu = (j: Jeu): ElementDeSupport => ({
  renvoi: { genre: "jeu", source: j.id }, titre: j.titre, dossier: j.dossier, image: j.imageNom,
  detail: [j.typeJeu, j.duree ? `${j.duree} min` : "", j.nbJoueursMax ? `${j.nbJoueursMin}–${j.nbJoueursMax} joueurs` : ""].filter(Boolean).join(" · "),
});
const elementDeMateriel = (m: MaterielItem): ElementDeSupport => ({
  renvoi: { genre: "materiel", source: m.id }, titre: m.titre, dossier: m.dossier, image: premiereImage(m.imagesJson),
  detail: m.descriptionMateriel.split("\n")[0].slice(0, 90),
});

/** Ce que le plan de travail porte, pour y trouver les supports. */
export interface SourcesDuBureau { outils: OutilClasse[]; jeux: Jeu[]; materiel: MaterielItem[] }

/**
 * Les éléments du bureau d'une sorte, prêts à être posés dans une séance.
 * Le matériel ne compte que s'il est sur le bureau et ne porte pas de PDF :
 * une feuille PDF se copie dans la séance (« Feuilles PDF »).
 */
export function elementsDuBureau(
  genre: GenreDeSupport, sources: SourcesDuBureau, aDesPdfs: (m: MaterielItem) => boolean,
): ElementDeSupport[] {
  const liste = genre === "jeu" ? sources.jeux.map(elementDeJeu)
    : genre === "materiel" ? sources.materiel.filter((m) => !m.seanceId && !m.sequenceId && !aDesPdfs(m) && !lireRenvoi(m.supportJson)).map(elementDeMateriel)
    : sources.outils.filter((o) => o.genre === genre).map(elementDOutil);
  return liste.filter((e) => e.titre.trim()).sort((a, b) => comparer(a.titre, b.titre));
}

/** L'élément du bureau auquel un support renvoie ; rien s'il n'y est plus (supprimé, à la poubelle, chez un collègue). */
export function elementDuRenvoi(r: RenvoiDeSupport, sources: SourcesDuBureau): ElementDeSupport | null {
  if (r.genre === "jeu") { const j = sources.jeux.find((x) => x.id === r.source); return j ? elementDeJeu(j) : null; }
  if (r.genre === "materiel") { const m = sources.materiel.find((x) => x.id === r.source); return m ? elementDeMateriel(m) : null; }
  const o = sources.outils.find((x) => x.id === r.source && x.genre === r.genre);
  return o ? elementDOutil(o) : null;
}

function premiereImage(json: string): string | null {
  try {
    const v = JSON.parse(json || "[]");
    return Array.isArray(v) && typeof v[0] === "string" ? v[0] : null;
  } catch {
    return null;
  }
}

const plat = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Ce qui répond à une recherche, dans le titre, le détail ou le dossier. */
export function chercherElements(elements: ElementDeSupport[], recherche: string): ElementDeSupport[] {
  const mots = plat(recherche).split(/\s+/).filter(Boolean);
  if (!mots.length) return elements;
  return elements.filter((e) => { const t = plat(`${e.titre} ${e.detail} ${e.dossier}`); return mots.every((m) => t.includes(m)); });
}
