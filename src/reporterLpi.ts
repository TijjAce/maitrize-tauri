// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// Reporter un plan dans le Livret de parcours inclusif : le LPI n'importe rien, tout se refait à la
// main. On reprend donc ses étapes, dans son ordre, avec ce qui se coche et ce qui se colle. Rien ne
// part tout seul, et le nom de l'élève n'est dans aucun texte à coller : le LPI sait de qui il s'agit.
//
// Les étapes viennent des fiches du ministère sur le PAP, le PPRE et le document de mise en œuvre du PPS.

import { AMENAGEMENTS_LPI, POINTS_ET_DIFFICULTES_LPI } from "./data/amenagementsLPI";
import { DISPOSITIFS, type Champ } from "./data/dispositifs";
import { lireAmenagements, lireAppuis, type LigneRetenue } from "./listeLpi";

/** Ce qui se colle : un champ de Maitrize, son texte. */
export interface TexteAColler { libelle: string; texte: string }
/** Ce qui se coche : `rang` est la place choisie dans le plan, `precision` et `autre` se collent. */
export interface LigneACocher { rang?: number; texte: string; precision?: string; autre?: boolean }
/** Les cases d'une même rubrique du LPI : son chemin, « onglet › rubrique ». */
export interface GroupeACocher { chemin: string; lignes: LigneACocher[] }
export interface BlocACocher { titre: string; groupes: GroupeACocher[]; alerte?: string }
export interface EtapeDuReport {
  titre: string;
  /** Ce que le LPI demande et que Maitrize n'a pas : à écrire là-bas. */
  aSaisir?: string;
  blocs: BlocACocher[];
  textes: TexteAColler[];
  alerte?: string;
}

/**
 * Les champs d'un plan, rangés dans les étapes du LPI.
 * « lpiAppuis:appuis » : seulement les points d'appui ; « lpiAppuis » : les deux côtés.
 */
const ETAPES: Record<string, { titre: string; aSaisir?: string; champs: string[] }[]> = {
  pap: [
    { titre: "Avis médical", aSaisir: "L'avis du médecin à joindre et sa date", champs: ["classe"] },
    { titre: "Informations préliminaires", aSaisir: "Les participants et la date de la réunion", champs: [] },
    { titre: "Analyse pédagogique", champs: ["lpiAppuis"] },
    { titre: "Mise en œuvre", aSaisir: "Les personnes mobilisées", champs: ["lpiAmenagements"] },
    { titre: "Bilan", champs: ["bilanProfitables", "bilanNonAtteints", "liaison"] },
  ],
  ppre: [
    { titre: "Informations préliminaires", aSaisir: "Le type de PPRE, sa durée en semaines et les participants", champs: ["periode", "enseignant"] },
    { titre: "Points d'appui", champs: ["lpiAppuis:appuis", "appuis"] },
    { titre: "Difficultés", champs: ["lpiAppuis:difficultes", "difficultes"] },
    { titre: "Mise en œuvre", aSaisir: "Les personnes mobilisées", champs: ["objectifs", "actions", "lpiAmenagements"] },
    { titre: "Bilan", aSaisir: "Les participants au bilan", champs: ["dateBilan", "bilan", "suites"] },
  ],
  pps: [
    { titre: "Situation de l'élève", champs: ["classe", "etablissement", "dispositif"] },
    { titre: "Emploi du temps", champs: ["tempsScolarisation"] },
    { titre: "Priorités, objectifs et préconisations", champs: ["objectifs", "amenagements"] },
    { titre: "Notifications de la CDAPH", champs: ["aideHumaine", "materiel"] },
    { titre: "Aménagements et adaptations", champs: ["lpiAmenagements"] },
  ],
};

export const peutSeReporter = (dispoId: string) => dispoId in ETAPES;

/** Les identifiants de champs cités par les étapes : un essai vérifie qu'ils existent bien. */
export const champsDesEtapes = (dispoId: string) => (ETAPES[dispoId] ?? []).flatMap((e) => e.champs.map((c) => c.split(":")[0]));

const ongletDe = (rubrique: string) => {
  for (const rubriques of Object.values(AMENAGEMENTS_LPI)) {
    const r = rubriques.find((x) => x.titre === rubrique);
    if (r) return r.onglet;
  }
  return "";
};
/** « onglet › rubrique », sans répéter un onglet qui porte le nom de sa seule rubrique. */
const chemin = (haut: string, bas: string) => (haut && haut !== bas ? `${haut} › ${bas}` : bas);
const domaineDe = (sousDomaine: string) => POINTS_ET_DIFFICULTES_LPI.find((s) => s.titre === sousDomaine)?.domaine ?? "";

/** Les lignes par groupe, dans l'ordre où chaque groupe apparaît. */
function regrouper<T>(lignes: T[], chemin: (l: T) => string, ligne: (l: T) => LigneACocher): GroupeACocher[] {
  const groupes = new Map<string, LigneACocher[]>();
  for (const l of lignes) groupes.set(chemin(l), [...(groupes.get(chemin(l)) ?? []), ligne(l)]);
  return [...groupes].map(([c, ls]) => ({ chemin: c, lignes: ls }));
}

function blocAmenagements(titre: string, val: unknown): BlocACocher | null {
  const { retenus } = lireAmenagements(val);
  if (!retenus.length) return null;
  const numerotes = retenus.map((r, i) => ({ ...r, rang: i + 1 }));
  const groupes = regrouper(numerotes,
    (r) => chemin(ongletDe(r.rubrique), r.rubrique),
    (r) => {
      const precision = (r.precision ?? "").trim();
      return { rang: r.rang, texte: r.texte.trim(), ...(precision ? { precision } : {}), ...(r.autre !== undefined ? { autre: true } : {}) };
    });
  return { titre, groupes };
}

/** Le LPI ne prend que trois domaines ou disciplines par côté, d'après ses fiches. */
function blocLignes(titre: string, lignes: LigneRetenue[]): BlocACocher | null {
  if (!lignes.length) return null;
  const domaines = new Set(lignes.map((l) => domaineDe(l.sousDomaine)));
  const groupes = regrouper(lignes,
    (l) => chemin(domaineDe(l.sousDomaine), l.sousDomaine),
    (l) => ({ texte: l.texte.trim(), ...(l.autre ? { autre: true } : {}) }));
  return {
    titre, groupes,
    ...(domaines.size > 3 ? { alerte: `${domaines.size} domaines retenus : les fiches du LPI n'en prévoient que trois.` } : {}),
  };
}

const propre = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Les lignes remplies d'un tableau : « Colonne : valeur », une par ligne. */
function textesDuTableau(c: Extract<Champ, { t: "liste" }>, val: unknown): TexteAColler[] {
  const lignes = Array.isArray(val) ? val : [];
  const remplies = lignes.filter((l): l is unknown[] => Array.isArray(l) && l.some((x) => propre(x)));
  return remplies.map((l, i) => ({
    libelle: remplies.length > 1 ? `${c.label} ${i + 1}` : c.label,
    texte: c.colonnes.map((nom, j) => (propre(l[j]) ? `${nom} : ${propre(l[j])}` : "")).filter(Boolean).join(" · "),
  }));
}

/** Les étapes du LPI pour ce plan, avec ce qu'il contient. */
export function etapesDuReport(dispoId: string, valeurs: Record<string, unknown>): EtapeDuReport[] {
  const dispo = DISPOSITIFS.find((d) => d.id === dispoId);
  const plan = ETAPES[dispoId];
  if (!dispo || !plan) return [];
  const champs = dispo.sections.flatMap((s) => s.champs);

  const etapes: EtapeDuReport[] = plan.map(({ titre, aSaisir, champs: ids }) => {
    const blocs: BlocACocher[] = [];
    const textes: TexteAColler[] = [];
    let alerte: string | undefined;
    for (const id of ids) {
      const [champId, cote] = id.split(":");
      const c = champs.find((x) => x.id === champId);
      if (!c) continue;
      const val = valeurs[champId];
      if (c.t === "amenagements") {
        const b = blocAmenagements(c.label, val);
        if (b) blocs.push(b);
      } else if (c.t === "appuis") {
        const a = lireAppuis(val);
        const cotes = cote ? [cote as "appuis" | "difficultes"] : (["appuis", "difficultes"] as const);
        for (const k of cotes) {
          const b = blocLignes(k === "appuis" ? "Points d'appui" : "Difficultés", a[k]);
          if (b) blocs.push(b);
        }
      } else if (c.t === "liste") {
        const lignes = textesDuTableau(c, val);
        textes.push(...lignes);
        if (dispoId === "ppre" && champId === "objectifs" && lignes.length > 3) {
          alerte = `${lignes.length} objectifs : les fiches du LPI n'en prévoient que trois.`;
        }
      } else if (c.t === "ligne" || c.t === "zone") {
        const t = propre(val);
        if (t) textes.push({ libelle: c.label, texte: t });
      }
    }
    return { titre, ...(aSaisir ? { aSaisir } : {}), blocs, textes, ...(alerte ? { alerte } : {}) };
  });

  // Un PAP écrit sur l'ancien formulaire : ses grilles cochées ne se perdent pas en route.
  const miseEnOeuvre = etapes.find((e) => e.titre === "Mise en œuvre");
  if (miseEnOeuvre) {
    for (const c of champs) {
      if (c.t !== "grille") continue;
      const g = (valeurs[c.id] ?? {}) as Record<string, boolean>;
      const coches = c.items.filter((_, i) => c.colonnes.some((__, j) => g[`${i}:${j}`]));
      if (coches.length) miseEnOeuvre.textes.push({ libelle: `Formulaire de 2015 : ${c.label}`, texte: coches.join(" ; ") });
    }
  }
  return etapes;
}

export const reportVide = (etapes: EtapeDuReport[]) => etapes.every((e) => !e.blocs.length && !e.textes.length);

/** Une ligne à cocher, en texte. */
export function texteDeLaLigne(l: LigneACocher): string {
  const debut = l.rang ? `${l.rang}. ` : "- ";
  const fin = l.precision ? ` (préciser : ${l.precision})` : "";
  return `${debut}${l.autre ? "Autre : " : ""}${l.texte}${fin}`;
}

/** Un bloc à cocher en texte, rubrique par rubrique. */
export function texteDuBloc(b: BlocACocher): string {
  return [b.titre, ...b.groupes.flatMap((g) => [g.chemin, ...g.lignes.map(texteDeLaLigne)])].join("\n");
}

/** Tout le report en texte, étape par étape : de quoi le garder sous les yeux à côté du LPI. */
export function texteDuReport(titre: string, etapes: EtapeDuReport[]): string {
  const morceaux = etapes.map((e, i) => {
    if (!e.blocs.length && !e.textes.length) return "";
    const lignes = [
      `${i + 1}. ${e.titre}`,
      ...e.blocs.map(texteDuBloc),
      ...e.textes.map((t) => `${t.libelle} : ${t.texte}`),
    ];
    return lignes.join("\n");
  }).filter(Boolean);
  return [titre, ...morceaux].join("\n\n");
}
