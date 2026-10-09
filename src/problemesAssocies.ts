// Les problèmes qui vont avec un calcul.
//
// Un fait ou une procédure de calcul se réinvestit dans des problèmes (la
// séance de réinvestissement de la démarche « calcul mental ») : ceux de
// l'addition et de la soustraction sont des problèmes partie-tout, ceux de la
// multiplication et de la division des problèmes multiplicatifs ; doubles et
// moitiés, des comparaisons « 2 fois plus ». On le lit dans les calculs mêmes
// de l'objectif : ce que l'élève y cherche (voir consignesCalcul) dit
// l'opération, leurs nombres disent jusqu'où aller. Décimaux et fractions
// n'ont pas encore leurs problèmes : rien n'est proposé pour eux.

import { chercheDans, type Cherche } from "./consignesCalcul";
import { tirerCalcul, type Objectif } from "./faitsNumeriques";
import { hasard } from "./hasard";
import {
  PLAFONDS, PRESENTATION_COMPLETE, genererMultiplicatifs, genererPartieTout, type InconnuePartieTout, type Probleme, type TypeMultiplicatif,
} from "./problemesBarres";

export type ProblemesAssocies =
  | { atelier: "partieTout"; nom: string; inconnue: InconnuePartieTout; max: number }
  | { atelier: "multiplicatifs"; nom: string; types: TypeMultiplicatif[]; parts: [number, number]; valeurs: [number, number] };

/** Les nombres entiers d'une égalité et de sa réponse ; rien s'il y a un décimal ou une fraction. */
function entiersDe(ecrit: string, reponse: string): number[] | null {
  const tout = `${ecrit} ${reponse}`;
  if (/[,/]/.test(tout)) return null;
  return (tout.replace(/(\d)[  ](?=\d{3}\b)/g, "$1").match(/\d+/g) ?? []).map(Number);
}

/** Les problèmes qui réinvestissent cet objectif, ou rien s'il n'en a pas. */
export function problemesAssocies(o: Objectif, tables: number[] = []): ProblemesAssocies | null {
  const alea = hasard(97);
  const calculs = Array.from({ length: 40 }, () => tirerCalcul(o, alea, tables));
  const nombres: number[] = [];
  for (const c of calculs) {
    const n = entiersDe(c.ecrit, c.reponse);
    if (!n) return null;
    nombres.push(...n);
  }
  const plusGrand = Math.max(1, ...nombres);
  const cherches = new Set<Cherche>(calculs.map((c) => chercheDans(c.ecrit)));
  const seulement = (...permis: Cherche[]) => [...cherches].every((c) => permis.includes(c));
  // Doubles et moitiés, écrits « double de 6 » ou « 2 × 6 » : la comparaison « 2 fois plus ».
  if (calculs.every((c) => /^(double de|moiti[ée] de|2 × )/i.test(c.ecrit))) {
    return {
      atelier: "multiplicatifs", nom: "Problèmes de comparaison : 2 fois plus, 2 fois moins", types: ["grand", "petit"],
      parts: [2, 2], valeurs: [1, Math.max(2, Math.min(50, Math.floor(plusGrand / 2)))],
    };
  }
  if (seulement("somme", "difference", "terme")) {
    const inconnue: InconnuePartieTout = seulement("somme") ? "tout" : seulement("difference", "terme") ? "partie" : "melange";
    return { atelier: "partieTout", nom: "Problèmes partie-tout", inconnue, max: PLAFONDS.find((p) => p >= plusGrand) ?? PLAFONDS[PLAFONDS.length - 1] };
  }
  if (seulement("produit", "facteur", "quotient")) {
    const types: TypeMultiplicatif[] = seulement("produit") ? ["tout", "grand"] : seulement("facteur", "quotient") ? ["part", "nombre", "petit"] : ["tout", "part", "nombre"];
    // Une table choisie : des groupes de ce nombre-là.
    const table = o.tables ? (tables.find((t) => o.tables!.includes(t)) ?? o.tables[0]) : null;
    return table
      ? { atelier: "multiplicatifs", nom: `Problèmes multiplicatifs — la table de ${table}`, types, parts: [2, 10], valeurs: [table, table] }
      : { atelier: "multiplicatifs", nom: "Problèmes multiplicatifs", types, parts: [2, 10], valeurs: [2, 10] };
  }
  return null;
}

/** Des problèmes associés, tirés de leur graine, énoncés écrits. */
export function problemesDe(a: ProblemesAssocies, nombre: number, graine: number): Probleme[] {
  return a.atelier === "partieTout"
    ? genererPartieTout({ nombre, parties: 2, inconnue: a.inconnue, max: a.max, enonces: true, prenoms: [] }, graine)
    : genererMultiplicatifs({ nombre, types: a.types, table: 10, parts: a.parts, valeurs: a.valeurs, enonces: true, prenoms: [] }, graine);
}

/**
 * Ce que l'atelier de problèmes garde pour refaire la feuille des problèmes
 * associés (voir `modifierFeuille`) : ses réglages, combien de problèmes, et
 * la présentation complète sous sa propre clé.
 */
export function memoiresDesProblemes(a: ProblemesAssocies, titre: string, nombre: number): Record<string, unknown> {
  return {
    [a.atelier]: { ...reglagesDeLAtelier(a, titre), nombre, prenoms: "", ...(a.atelier === "multiplicatifs" ? { table: 10 } : {}) },
    [`presentation:${a.atelier}`]: PRESENTATION_COMPLETE,
  };
}

/** Les réglages à donner à l'atelier de problèmes pour qu'il s'ouvre sur ces problèmes-là. */
export function reglagesDeLAtelier(a: ProblemesAssocies, titre: string): Record<string, unknown> {
  return a.atelier === "partieTout"
    ? { titre, parties: 2, inconnue: a.inconnue, max: a.max, perso: false }
    : { titre, types: a.types, perso: true, partsMin: a.parts[0], partsMax: a.parts[1], valeurMin: a.valeurs[0], valeurMax: a.valeurs[1] };
}
