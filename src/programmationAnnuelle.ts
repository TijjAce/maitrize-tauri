// La programmation de l'année, en classe : celle de la classe, puis celle de
// chaque niveau d'une classe à plusieurs niveaux — « comme pour la
// progression » (l'enseignant, octobre 2026). La programmation par élève
// (IME) vit à part : voir programmationIme.ts.

import type { ProgrammationFinale } from "./api";
import type { LigneProgrammation } from "./organisationHtml";

/** Une programmation à soi : ni reçue d'un collègue, ni par élève. */
export const estALaClasse = (p: ProgrammationFinale) => !p.estImportee && (p.niveau ?? "") !== "ime";

/** La programmation de l'année de la classe (niveau vide) ou d'un de ses niveaux. */
export function programmationDe(liste: ProgrammationFinale[], annee: string, niveau: string): ProgrammationFinale | undefined {
  return liste.find((p) => p.annee === annee && estALaClasse(p) && (p.niveau ?? "") === niveau);
}

/** Les lignes d'une programmation ; rien d'illisible ne fait tomber l'écran. */
export function lireLignes(p?: Pick<ProgrammationFinale, "lignesJson"> | null): LigneProgrammation[] {
  try {
    const v = JSON.parse(p?.lignesJson || "[]");
    return Array.isArray(v) ? v.filter((l) => l && typeof l === "object") : [];
  } catch { return []; }
}

/** La clé d'un niveau ajouté par « + Niveau », le temps qu'il reçoive sa programmation. */
export const cleNiveauDeLAnnee = (annee: string, niveau: string) => `${annee}|${niveau}`;

/**
 * Les niveaux de l'année, sous la programmation de la classe : ceux qui ont
 * une programmation, et ceux qu'on vient d'ajouter, dans l'ordre de l'école.
 */
export function niveauxDeLAnnee(ordre: string[], liste: ProgrammationFinale[], annee: string, ajoutes: string[]): string[] {
  const vus = new Set(liste
    .filter((p) => p.annee === annee && estALaClasse(p) && (p.niveau ?? "") !== "" && lireLignes(p).length > 0)
    .map((p) => p.niveau));
  for (const k of ajoutes) {
    const [a, n] = k.split("|");
    if (a === annee && n) vus.add(n);
  }
  const rang = (n: string) => { const i = ordre.indexOf(n); return i < 0 ? ordre.length : i; };
  return [...vus].sort((a, b) => rang(a) - rang(b) || a.localeCompare(b, "fr"));
}

/**
 * La couleur de chaque ligne : celle de son domaine, et pour une activité,
 * celle du domaine au-dessus d'elle ; `neutre` quand il n'y en a pas.
 */
export function teintesDesLignes(lignes: LigneProgrammation[], teinteDomaine: (l: LigneProgrammation) => string, neutre: string): Record<string, string> {
  const teintes: Record<string, string> = {};
  let courante = neutre;
  for (const l of lignes) {
    if (l.estDomaine) courante = teinteDomaine(l);
    teintes[l.id] = courante;
  }
  return teintes;
}

/** Une ligne neuve : un domaine (titre et couleur), ou une activité vide. */
export function ligneNeuve(id: string, estDomaine: boolean, label = "", couleur?: string): LigneProgrammation {
  return { id, estDomaine, label, couleur: estDomaine ? (couleur ?? "blue") : undefined, p1: "", p2: "", p3: "", p4: "", p5: "", seqs: {}, periodesFaites: [] };
}

export interface SourceDeDomaines { libelle: string; domaines: LigneProgrammation[] }

/** Les autres programmations de l'année dont on peut reprendre les domaines. */
export function sourcesDeDomaines(liste: ProgrammationFinale[], annee: string, niveau: string): SourceDeDomaines[] {
  return liste
    .filter((p) => p.annee === annee && estALaClasse(p) && (p.niveau ?? "") !== niveau)
    .map((p) => ({ libelle: p.niveau || "la classe", domaines: lireLignes(p).filter((l) => l.estDomaine && l.label.trim()) }))
    .filter((s) => s.domaines.length > 0);
}

/** Des domaines repris : mêmes titres et couleurs, en lignes neuves et sans activités. */
export const copieDesDomaines = (domaines: LigneProgrammation[], newId: () => string): LigneProgrammation[] =>
  domaines.map((d) => ligneNeuve(newId(), true, d.label, d.couleur));

/**
 * Déplace une ligne après une autre ; un domaine emporte ses activités, et
 * posé sur un autre domaine, il passe après tout le groupe de celui-ci.
 */
export function deplacerLigne(lignes: LigneProgrammation[], source: string, cible: string): LigneProgrammation[] {
  if (source === cible) return lignes;
  const arr = [...lignes];
  const si = arr.findIndex((l) => l.id === source);
  if (si < 0) return lignes;
  const groupe = [arr[si]];
  if (arr[si].estDomaine) for (let j = si + 1; j < arr.length && !arr[j].estDomaine; j++) groupe.push(arr[j]);
  if (groupe.some((l) => l.id === cible)) return lignes;
  arr.splice(si, groupe.length);
  const ci = arr.findIndex((l) => l.id === cible);
  if (ci < 0) return [...arr, ...groupe];
  let place = ci + 1;
  if (arr[ci].estDomaine && groupe[0].estDomaine) while (place < arr.length && !arr[place].estDomaine) place++;
  arr.splice(place, 0, ...groupe);
  return arr;
}

/** Remet une ligne supprimée à sa place — sauf si elle est revenue d'ailleurs entre-temps. */
export function remettreLigne(lignes: LigneProgrammation[], ligne: LigneProgrammation, place: number): LigneProgrammation[] {
  if (lignes.some((l) => l.id === ligne.id)) return lignes;
  const arr = [...lignes];
  arr.splice(Math.min(Math.max(place, 0), arr.length), 0, ligne);
  return arr;
}
