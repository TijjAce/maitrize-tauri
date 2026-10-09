// Refaire une feuille dans son atelier.
//
// Une feuille fabriquée — déposée sur le bureau depuis Fabriquer, posée dans
// une séance par sa séquence, faite pour un élève par « En retard » — retient
// l'atelier qui l'a faite et, quand il sait la refaire, ce qu'il gardait de
// ses réglages et son tirage. « Modifier dans Fabriquer » rouvre l'atelier
// réglé comme elle ; la feuille qu'on y enregistre ensuite prend sa place :
// même nom, même séance, même ligne au cahier journal.

import React from "react";
import type { MaterielItem } from "./api";
import type { CompetenceSelectionnee } from "./components/CompetenceTree";
import { AtelierContext } from "./components/AtelierContext";
import { ouvrirOnglet } from "./ongletDemande";
import { ONGLETS } from "./catalogueAteliers";
import { graineAuHasard } from "./hasard";

/** D'où vient une feuille. */
export interface Fabrication {
  /** L'atelier de Fabriquer qui l'a faite : son onglet. */
  atelier: string;
  /** Ce que l'atelier garde d'une visite à l'autre, clé par clé (`fabriquer:<clé>`), tel que la feuille le demande. */
  memoires?: Record<string, unknown>;
  /** Le tirage. */
  graine?: number;
  /** Les compétences écrites en tête quand ce ne sont pas celles de l'atelier : celles de la séquence. */
  competences?: CompetenceSelectionnee[];
  /** Une fiche d'élève : son prénom et la date s'y écrivent, et le corrigé n'y est pas. */
  eleve?: { prenom: string; date: string };
}

const estUnObjet = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);

/** La fabrication d'un matériel ; rien pour un matériel qui ne vient pas d'un atelier, ou d'un atelier qui n'existe plus. */
export function lireFabrication(json: string | null | undefined): Fabrication | null {
  if (!json) return null;
  try {
    const f: unknown = JSON.parse(json);
    if (!estUnObjet(f) || typeof f.atelier !== "string" || !(ONGLETS as readonly string[]).includes(f.atelier)) return null;
    const eleve = estUnObjet(f.eleve) && typeof f.eleve.prenom === "string" && typeof f.eleve.date === "string"
      ? { prenom: f.eleve.prenom, date: f.eleve.date } : undefined;
    return {
      atelier: f.atelier,
      memoires: estUnObjet(f.memoires) ? f.memoires : undefined,
      graine: typeof f.graine === "number" && Number.isFinite(f.graine) ? f.graine : undefined,
      competences: Array.isArray(f.competences) ? f.competences as CompetenceSelectionnee[] : undefined,
      eleve,
    };
  } catch {
    return null;
  }
}

/** Le JSON d'une fabrication ; les champs absents n'y figurent pas. */
export const ecrireFabrication = (f: Fabrication): string => JSON.stringify(f);

/**
 * Deux réglages pareils, quel que soit l'ordre de leurs champs — un champ
 * absent vaut un champ indéfini, comme en JSON. Un atelier qui corrige ses
 * réglages en les relisant ne refait la feuille à l'identique que s'il les
 * garde tels quels.
 */
export function memesReglages(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => memesReglages(x, b[i]));
  }
  if (!estUnObjet(a) || !estUnObjet(b)) return false;
  const cles = (o: Record<string, unknown>) => Object.keys(o).filter((k) => o[k] !== undefined);
  const ka = cles(a);
  return ka.length === cles(b).length && ka.every((k) => memesReglages(a[k], b[k]));
}

// ── Ce que l'atelier ouvert garde, et son tirage ───────────────────────────
//
// `useMemoire` note ici, atelier par atelier, les clés qu'il lit ; `useGraine`
// le tirage du moment. À l'enregistrement, on relit les unes et l'autre :
// c'est de quoi refaire la feuille.

const clesDesAteliers = new Map<string, Set<string>>();
const grainesDesAteliers = new Map<string, number>();

export function noterMemoire(atelier: string, cle: string) {
  if (!atelier) return;
  const cles = clesDesAteliers.get(atelier) ?? new Set<string>();
  cles.add(cle);
  clesDesAteliers.set(atelier, cles);
}

export function noterGraine(atelier: string, graine: number) {
  if (atelier) grainesDesAteliers.set(atelier, graine);
}

/** Ce que l'atelier garde en ce moment sur cet ordinateur, clé par clé ; rien s'il ne garde rien. */
export function memoiresDe(atelier: string): Record<string, unknown> | undefined {
  const sortie: Record<string, unknown> = {};
  for (const cle of clesDesAteliers.get(atelier) ?? []) {
    try {
      const brut = localStorage.getItem(`fabriquer:${cle}`);
      if (brut) sortie[cle] = JSON.parse(brut);
    } catch { /* illisible : on s'en passe */ }
  }
  return Object.keys(sortie).length ? sortie : undefined;
}

/** De quoi refaire la feuille que l'atelier montre en ce moment. */
export function fabricationDuMoment(atelier: string, enPlus: Omit<Fabrication, "atelier" | "memoires" | "graine"> = {}): Fabrication {
  return { atelier, memoires: memoiresDe(atelier), graine: grainesDesAteliers.get(atelier), ...enPlus };
}

// ── La feuille qu'on refait ────────────────────────────────────────────────

export interface Modification {
  materielId: string;
  titre: string;
  atelier: string;
  /** Où elle est rangée, en clair : « dans sa séance », « sur le bureau », « la fiche de Léa »… */
  ou: string;
  /** Vrai si l'atelier s'ouvre réglé comme elle ; faux s'il ne sait pas la refaire et garde ses derniers réglages. */
  refaite: boolean;
  graine?: number;
  competences?: CompetenceSelectionnee[];
  eleve?: { prenom: string; date: string };
}

const CLE_SESSION = "maitrize:modification";

function lireSession(): Modification | null {
  try {
    const brut = sessionStorage.getItem(CLE_SESSION);
    const m: unknown = brut ? JSON.parse(brut) : null;
    return estUnObjet(m) && typeof m.materielId === "string" && typeof m.atelier === "string" ? m as unknown as Modification : null;
  } catch {
    return null;
  }
}

// Gardée pour la fenêtre : un rechargement ne la perd pas, un redémarrage l'oublie.
let courante: Modification | null = lireSession();
const abonnes = new Set<() => void>();

export const modificationEnCours = {
  lire: (): Modification | null => courante,
  poser(m: Modification) {
    courante = m;
    try { sessionStorage.setItem(CLE_SESSION, JSON.stringify(m)); } catch { /* stockage indisponible */ }
    abonnes.forEach((f) => f());
  },
  finir() {
    if (!courante) return;
    courante = null;
    try { sessionStorage.removeItem(CLE_SESSION); } catch { /* idem */ }
    abonnes.forEach((f) => f());
  },
  abonner(f: () => void) {
    abonnes.add(f);
    return () => { abonnes.delete(f); };
  },
};

export const useModification = (): Modification | null =>
  React.useSyncExternalStore(modificationEnCours.abonner, modificationEnCours.lire);

/** Le tirage d'un atelier qui s'ouvre : celui de la feuille qu'on y refait, sinon un nouveau. */
export function graineDeDepart(atelier: string): number {
  const m = courante;
  return m && m.atelier === atelier && m.graine !== undefined ? m.graine : graineAuHasard();
}

/**
 * Le tirage d'un atelier, à la place de `useState(graineAuHasard)` : à
 * l'ouverture, celui de la feuille qu'on refait ; à chaque changement, noté
 * pour l'enregistrement.
 */
export function useGraine(): [number, React.Dispatch<React.SetStateAction<number>>] {
  const atelier = React.useContext(AtelierContext);
  const [graine, setGraine] = React.useState(() => graineDeDepart(atelier));
  React.useEffect(() => { noterGraine(atelier, graine); }, [atelier, graine]);
  return [graine, setGraine];
}

/** Où le matériel est rangé, dit simplement. */
export function ouEstLaFeuille(m: Pick<MaterielItem, "seanceId" | "dossier">, f: Fabrication): string {
  if (f.eleve) return `la fiche de ${f.eleve.prenom}, ${f.eleve.date}`;
  if (m.seanceId) return "dans sa séance";
  return m.dossier ? `sur le bureau, dans « ${m.dossier} »` : "sur le bureau";
}

/**
 * Rouvre l'atelier de la feuille, réglé comme elle : ce qu'il gardait est
 * remplacé par les réglages de la feuille. La feuille qu'on y enregistrera
 * ensuite prendra sa place.
 */
export function modifierDansFabriquer(m: MaterielItem, f: Fabrication, aller: (chemin: string) => void) {
  for (const [cle, valeur] of Object.entries(f.memoires ?? {})) {
    try { localStorage.setItem(`fabriquer:${cle}`, JSON.stringify(valeur)); } catch { /* stockage indisponible */ }
  }
  // Fabriquer s'ouvre sur l'atelier qu'il a gardé : celui de la feuille.
  try { localStorage.setItem("fabriquer:onglet", f.atelier); } catch { /* idem */ }
  modificationEnCours.poser({
    materielId: m.id, titre: m.titre.trim() || "La feuille", atelier: f.atelier, ou: ouEstLaFeuille(m, f),
    refaite: Boolean(f.memoires), graine: f.graine, competences: f.competences, eleve: f.eleve,
  });
  aller("/jeux");
  setTimeout(() => ouvrirOnglet("jeux", f.atelier), 140);
}
