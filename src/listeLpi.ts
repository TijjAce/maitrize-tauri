// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// Ce qu'un plan retient de la liste du LPI : les aménagements, dans l'ordre choisi, et les points
// d'appui et difficultés. Le libellé est gardé avec le choix : une nouvelle liste du ministère ne
// changera pas ce qu'un plan déjà écrit dit à la famille.

import type { NiveauLpi } from "./data/amenagementsLPI";

/** `autre` : le rang du champ libre de la rubrique (0, 1 ou 2), pour un aménagement écrit à la main. */
export interface AmenagementRetenu { rubrique: string; texte: string; precision?: string; autre?: number }
export interface ChoixAmenagements { niveau?: NiveauLpi; retenus: AmenagementRetenu[] }

export type SensLpi = "appuis" | "difficultes";
/** `autre` : le champ libre du sous-domaine. */
export interface LigneRetenue { sousDomaine: string; texte: string; autre?: boolean }
export interface ChoixAppuis { appuis: LigneRetenue[]; difficultes: LigneRetenue[] }

const MATERNELLE = /\b(ps|ms|gs|tps|maternelle)\b|petite section|moyenne section|grande section/i;
const SECOND = /\b(6e|5e|4e|3e|6[èe]me|5[èe]me|4[èe]me|3[èe]me|2de|1re|tle|coll[èe]ge|lyc[ée]e|segpa)\b/i;

/** Le niveau de la liste d'après la classe de l'élève ; l'élémentaire si la classe ne le dit pas. */
export function niveauLpiDe(niveauEleve: string | null | undefined): NiveauLpi {
  const n = (niveauEleve ?? "").trim();
  if (MATERNELLE.test(n)) return "maternelle";
  if (SECOND.test(n)) return "second";
  return "elementaire";
}

const estTexte = (x: unknown): x is string => typeof x === "string";

/** Ce qui est enregistré, tel quel s'il est bien formé. Un document ancien ou abîmé donne un choix vide. */
export function lireAmenagements(val: unknown): ChoixAmenagements {
  const v = (val ?? {}) as Partial<ChoixAmenagements>;
  const retenus = Array.isArray(v.retenus)
    ? v.retenus.filter((r) => r && estTexte(r.rubrique) && estTexte(r.texte))
    : [];
  return { ...(v.niveau ? { niveau: v.niveau } : {}), retenus };
}

export function lireAppuis(val: unknown): ChoixAppuis {
  const v = (val ?? {}) as Partial<ChoixAppuis>;
  const liste = (l: unknown) => (Array.isArray(l) ? l.filter((r) => r && estTexte(r.sousDomaine) && estTexte(r.texte)) : []);
  return { appuis: liste(v.appuis), difficultes: liste(v.difficultes) };
}

export const estRetenu = (c: ChoixAmenagements, rubrique: string, texte: string) =>
  c.retenus.some((r) => r.autre === undefined && r.rubrique === rubrique && r.texte === texte);

/** Coche ou décoche : un aménagement coché se place à la fin de la liste. */
export function basculerAmenagement(c: ChoixAmenagements, rubrique: string, texte: string): ChoixAmenagements {
  if (estRetenu(c, rubrique, texte)) {
    return { ...c, retenus: c.retenus.filter((r) => !(r.autre === undefined && r.rubrique === rubrique && r.texte === texte)) };
  }
  return { ...c, retenus: [...c.retenus, { rubrique, texte }] };
}

export function preciserAmenagement(c: ChoixAmenagements, index: number, precision: string): ChoixAmenagements {
  return { ...c, retenus: c.retenus.map((r, i) => (i === index ? { ...r, precision } : r)) };
}

/** Monte (-1) ou descend (+1) : l'ordre compte, seuls les premiers vont dans le PDF du LPI. */
export function deplacerAmenagement(c: ChoixAmenagements, index: number, sens: -1 | 1): ChoixAmenagements {
  const cible = index + sens;
  if (index < 0 || cible < 0 || index >= c.retenus.length || cible >= c.retenus.length) return c;
  const retenus = [...c.retenus];
  [retenus[index], retenus[cible]] = [retenus[cible], retenus[index]];
  return { ...c, retenus };
}

export function retirerAmenagement(c: ChoixAmenagements, index: number): ChoixAmenagements {
  return { ...c, retenus: c.retenus.filter((_, i) => i !== index) };
}

export const texteAutre = (c: ChoixAmenagements, rubrique: string, rang: number) =>
  c.retenus.find((r) => r.rubrique === rubrique && r.autre === rang)?.texte ?? "";

/** Écrit l'un des trois champs libres d'une rubrique : vidé, il sort de la liste. */
export function poserAutre(c: ChoixAmenagements, rubrique: string, rang: number, texte: string): ChoixAmenagements {
  const existe = c.retenus.some((r) => r.rubrique === rubrique && r.autre === rang);
  if (!texte.trim()) return { ...c, retenus: c.retenus.filter((r) => !(r.rubrique === rubrique && r.autre === rang)) };
  if (existe) return { ...c, retenus: c.retenus.map((r) => (r.rubrique === rubrique && r.autre === rang ? { ...r, texte } : r)) };
  return { ...c, retenus: [...c.retenus, { rubrique, texte, autre: rang }] };
}

export const ligneRetenue = (c: ChoixAppuis, sens: SensLpi, sousDomaine: string, texte: string) =>
  c[sens].some((l) => !l.autre && l.sousDomaine === sousDomaine && l.texte === texte);

export function basculerLigne(c: ChoixAppuis, sens: SensLpi, sousDomaine: string, texte: string): ChoixAppuis {
  const liste = ligneRetenue(c, sens, sousDomaine, texte)
    ? c[sens].filter((l) => !(!l.autre && l.sousDomaine === sousDomaine && l.texte === texte))
    : [...c[sens], { sousDomaine, texte }];
  return { ...c, [sens]: liste };
}

export const texteLigneAutre = (c: ChoixAppuis, sens: SensLpi, sousDomaine: string) =>
  c[sens].find((l) => l.autre && l.sousDomaine === sousDomaine)?.texte ?? "";

export function poserLigneAutre(c: ChoixAppuis, sens: SensLpi, sousDomaine: string, texte: string): ChoixAppuis {
  const sans = c[sens].filter((l) => !(l.autre && l.sousDomaine === sousDomaine));
  if (!texte.trim()) return { ...c, [sens]: sans };
  const existe = sans.length !== c[sens].length;
  const liste = existe
    ? c[sens].map((l) => (l.autre && l.sousDomaine === sousDomaine ? { ...l, texte } : l))
    : [...c[sens], { sousDomaine, texte, autre: true }];
  return { ...c, [sens]: liste };
}

/** Un choix vide ne s'enregistre pas : le dossier de l'élève ne doit pas passer pour commencé. */
export const amenagementsVides = (c: ChoixAmenagements) => c.retenus.length === 0;
export const appuisVides = (c: ChoixAppuis) => c.appuis.length === 0 && c.difficultes.length === 0;

const avecPrecision = (r: AmenagementRetenu) => {
  const p = (r.precision ?? "").trim();
  return p ? `${r.texte.trim()} (${p})` : r.texte.trim();
};

/** Les aménagements en une ligne, dans l'ordre choisi. */
export const texteDesAmenagements = (c: ChoixAmenagements) => c.retenus.map(avecPrecision).join(" ; ");

/** Points d'appui et difficultés en une ligne. */
export function texteDesAppuis(c: ChoixAppuis): string {
  const morceau = (titre: string, l: LigneRetenue[]) => (l.length ? `${titre} : ${l.map((x) => x.texte.trim()).join(" ; ")}` : "");
  return [morceau("Points d'appui", c.appuis), morceau("Difficultés", c.difficultes)].filter(Boolean).join(". ");
}

/** Les aménagements à l'impression : numérotés dans l'ordre, chacun avec sa rubrique. */
export function htmlDesAmenagements(c: ChoixAmenagements, echapper: (t: string) => string): string {
  if (amenagementsVides(c)) return "";
  const lignes = c.retenus.map((r) => {
    const p = (r.precision ?? "").trim();
    return `<li>${echapper(r.texte.trim())}${p ? ` <i>(${echapper(p)})</i>` : ""} <span class="rubrique">${echapper(r.rubrique)}</span></li>`;
  }).join("");
  return `<ol class="liste-lpi">${lignes}</ol>`;
}

/** Points d'appui et difficultés à l'impression, rangés par sous-domaine. */
export function htmlDesAppuis(c: ChoixAppuis, echapper: (t: string) => string): string {
  const bloc = (titre: string, liste: LigneRetenue[]) => {
    if (!liste.length) return "";
    const parSous = new Map<string, string[]>();
    for (const l of liste) parSous.set(l.sousDomaine, [...(parSous.get(l.sousDomaine) ?? []), l.texte.trim()]);
    const lignes = [...parSous].map(([s, t]) => `<li><b>${echapper(s)} :</b> ${t.map(echapper).join(" ; ")}</li>`).join("");
    return `<div class="fl">${echapper(titre)}</div><ul class="liste-lpi">${lignes}</ul>`;
  };
  return bloc("Points d'appui", c.appuis) + bloc("Difficultés", c.difficultes);
}
