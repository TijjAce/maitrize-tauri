// Les objectifs du PPI, travaillés au quotidien.
//
// Le PPI fixe des objectifs ; les journées produisent des observations. Les
// deux vivaient côte à côte sans se rencontrer : au moment du bilan ou de
// l'ESS, il fallait relire toutes les observations pour retrouver ce qui
// touchait un objectif — et l'on ne voyait jamais qu'un objectif n'avait plus
// été travaillé depuis six semaines.
//
// Une observation peut donc dire quels objectifs elle a travaillés, et comment
// ça s'est passé. Le reste — ce que l'on montre, ce que l'on alerte — se déduit
// de là, et se vérifie ici plutôt qu'à l'œil.

import type { CommentaireEleve } from "./api";

/** Comment l'élève s'en est tiré, ce jour-là, sur cet objectif. */
export type Reussite = "reussi" | "aide" | "pasencore";

export const REUSSITES: { k: Reussite; label: string; icone: string; couleur: string }[] = [
  { k: "reussi", label: "Réussi seul", icone: "✅", couleur: "#57b873" },
  { k: "aide", label: "Avec aide", icone: "🤝", couleur: "#eb9e33" },
  { k: "pasencore", label: "Pas encore", icone: "🔁", couleur: "#d64d4d" },
];

export const infosReussite = (r: Reussite) => REUSSITES.find((x) => x.k === r) ?? REUSSITES[1];

/** Un objectif travaillé par une observation. */
export interface LienObjectif {
  id: string;
  reussite: Reussite;
}

const estReussite = (v: unknown): v is Reussite => REUSSITES.some((r) => r.k === v);

/** Relit les liens d'une observation. Un contenu abîmé ne fait rien perdre d'autre. */
export function lireLiens(json?: string | null): LienObjectif[] {
  if (!json || !json.trim()) return [];
  try {
    const brut = JSON.parse(json);
    if (!Array.isArray(brut)) return [];
    return brut
      .filter((x) => x && typeof x.id === "string" && x.id)
      .map((x) => ({ id: x.id as string, reussite: estReussite(x.reussite) ? x.reussite : "aide" }));
  } catch {
    return [];
  }
}

export const ecrireLiens = (liens: LienObjectif[]): string => (liens.length ? JSON.stringify(liens) : "");

/**
 * Coche un objectif, change son appréciation, ou le décoche.
 *
 * Recliquer sur l'appréciation déjà choisie retire le lien : cocher par erreur
 * doit se défaire du même geste, sans bouton supplémentaire.
 */
export function basculerLien(liens: LienObjectif[], id: string, reussite: Reussite): LienObjectif[] {
  const dedans = liens.find((l) => l.id === id);
  if (!dedans) return [...liens, { id, reussite }];
  if (dedans.reussite === reussite) return liens.filter((l) => l.id !== id);
  return liens.map((l) => (l.id === id ? { ...l, reussite } : l));
}

/**
 * Les intitulés des objectifs d'un PPI, par identifiant.
 *
 * Le PPI est rangé en un document JSON par élève : le relire ici évite d'en
 * faire un type partagé pour trois champs.
 */
export function intitulesDesObjectifs(json?: string | null): Record<string, string> {
  try {
    const d = json ? JSON.parse(json) : null;
    if (!Array.isArray(d?.objectifs)) return {};
    const sortie: Record<string, string> = {};
    for (const o of d.objectifs) {
      const titre = String(o?.intitule ?? "").trim();
      if (o?.id && titre) sortie[String(o.id)] = titre;
    }
    return sortie;
  } catch {
    return {};
  }
}

/** Une observation qui a travaillé l'objectif. */
export interface Preuve {
  commentaire: CommentaireEleve;
  reussite: Reussite;
}

/** Ce qu'on sait d'un objectif, à force d'observations. */
export interface SuiviObjectif {
  total: number;
  /** Date de la dernière observation, ou "" si aucune. */
  dernier: string;
  /** Jours écoulés depuis, ou null si l'objectif n'a jamais été observé. */
  jours: number | null;
  compte: Record<Reussite, number>;
  /** De la plus récente à la plus ancienne. */
  preuves: Preuve[];
}

const jourDe = (iso: string) => (iso ?? "").slice(0, 10);

/** Écart en jours entre deux dates ISO, sans se soucier des heures. */
export function joursEntre(depuis: string, jusqua: Date): number | null {
  const d = new Date(`${jourDe(depuis)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const a = new Date(jusqua);
  a.setHours(12, 0, 0, 0);
  return Math.round((a.getTime() - d.getTime()) / 86_400_000);
}

/** Tout ce qu'un objectif a récolté, dans les observations d'un élève. */
export function suivreObjectif(
  objectifId: string,
  commentaires: CommentaireEleve[],
  aujourdhui: Date = new Date(),
): SuiviObjectif {
  const preuves: Preuve[] = [];
  for (const c of commentaires) {
    const lien = lireLiens(c.objectifs).find((l) => l.id === objectifId);
    if (lien) preuves.push({ commentaire: c, reussite: lien.reussite });
  }
  preuves.sort((a, b) => jourDe(b.commentaire.date).localeCompare(jourDe(a.commentaire.date)));
  const compte: Record<Reussite, number> = { reussi: 0, aide: 0, pasencore: 0 };
  for (const p of preuves) compte[p.reussite]++;
  const dernier = preuves[0]?.commentaire.date ?? "";
  return {
    total: preuves.length,
    dernier,
    jours: dernier ? joursEntre(dernier, aujourdhui) : null,
    compte,
    preuves,
  };
}

/** Au-delà, un objectif mérite qu'on le remette au programme. */
export const SANS_NOUVELLES_JOURS = 21;

/** Un objectif qu'on a travaillé, puis laissé de côté. */
export const sansNouvelles = (s: SuiviObjectif, seuil = SANS_NOUVELLES_JOURS) =>
  s.jours !== null && s.jours > seuil;

/** Une phrase courte pour l'écran : « 4 fois · la dernière il y a 3 jours ». */
export function resumeSuivi(s: SuiviObjectif): string {
  if (!s.total) return "Aucune observation pour l'instant";
  const fois = s.total === 1 ? "1 fois" : `${s.total} fois`;
  if (s.jours === null) return fois;
  const quand = s.jours <= 0 ? "aujourd'hui" : s.jours === 1 ? "hier" : `il y a ${s.jours} jours`;
  return `${fois} · la dernière ${quand}`;
}
