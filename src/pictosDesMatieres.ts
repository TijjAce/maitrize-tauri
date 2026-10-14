// ── Les pictos des matières et des domaines ───────────────────────────────
//
// Chaque matière de l'emploi du temps et chaque domaine des référentiels a
// son picto : Réglages › Général › Pictos des matières, à côté de leurs
// couleurs. Le déroulement des tablettes les prend — pour une fiche, celui de
// son domaine, sinon celui de sa matière ; pour le rituel, celui de la
// matière « Rituel ». Sans choix de l'enseignant, la banque d'images de
// l'ordinateur propose le picto de leur nom.

import { api, MATIERES, matiereDuDomaine, type Referentiel } from "./api";
import type { PictoPose } from "./supportsVisuels";

/** Où se gardent les pictos choisis : un réglage partagé avec l'autre ordinateur (préfixe « caa: »). */
export const CLE_PICTOS_MATIERES = "caa:pictos-matieres";

/** Une forme comparable d'un nom : sans numéro en tête, sans accents ni majuscules — « 5. Se repérer… » et « se reperer… » se valent. */
export const formeDuNom = (nom: string): string => nom.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/^\s*\d+\s*[.)]\s*/, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Les pictos choisis, par nom, sans faire confiance à ce qui est enregistré : un numéro de la banque, ou une photo. */
export function lirePictosMatieres(brut: string | null | undefined): Record<string, PictoPose> {
  let o: unknown;
  try { o = JSON.parse(brut || "{}"); } catch { return {}; }
  if (!o || typeof o !== "object" || Array.isArray(o)) return {};
  const sortie: Record<string, PictoPose> = {};
  for (const [nom, v] of Object.entries(o as Record<string, unknown>)) {
    if (!nom.trim() || !v || typeof v !== "object") continue;
    const p = v as Record<string, unknown>;
    const photo = typeof p.photo === "string" && p.photo.trim() ? p.photo : "";
    const id = typeof p.id === "number" && Number.isFinite(p.id) ? p.id : null;
    if (!photo && id == null) continue;
    sortie[nom] = photo ? { id: null, mot: typeof p.mot === "string" ? p.mot : "", photo } : { id, mot: typeof p.mot === "string" ? p.mot : "" };
  }
  return sortie;
}

/** Le picto choisi pour un nom — une matière, un domaine —, qu'il soit écrit tel quel ou autrement. */
export function pictoChoisi(choix: Record<string, PictoPose>, nom: string): PictoPose | null {
  if (choix[nom]) return choix[nom];
  const f = formeDuNom(nom);
  const cle = Object.keys(choix).find((k) => formeDuNom(k) === f);
  return cle ? choix[cle] : null;
}

/**
 * Des mots plus sûrs que le nom, pour qu'on propose un picto parlant : la
 * banque n'a ni « géométrie » ni « rituel », et son « espace » est celui des
 * astronautes. Vérifiés sur la banque (octobre 2026).
 */
const MOTS_PREFERES: [RegExp, string][] = [
  [/^rituel/, "calendrier"], [/^accueil$/, "bonjour"],
  [/^eps$|education physique|activite physique/, "sport"], [/musicale|^musique/, "musique"], [/anglais|langues vivantes/, "anglais"],
  [/mobiliser le langage|^oral$/, "langage"], [/premiers outils mathematiques|structurer sa pensee/, "nombres"],
  [/se reperer dans le temps/, "calendrier"], [/geometrie/, "quadrillage"], [/grandeurs|mesure/, "mesure"], [/^nombres/, "nombres"],
];
/** Des mots dont le picto porte des mots espagnols : jamais proposés. */
const MOTS_ECARTES = new Set(["histoire", "phrase", "mot", "espace"]);

/** Les mots à chercher dans la banque pour un nom : les mots préférés, le nom, ses morceaux, leur singulier. */
export function motsDuNom(nom: string): string[] {
  const forme = formeDuNom(nom);
  const propre = nom.toLowerCase().replace(/^\s*\d+\s*[.)]\s*/, "").trim();
  const morceaux = propre.split(/,|\s+et\s+|\s*-\s*|\//).map((m) => m.trim()).filter(Boolean);
  // Le singulier des pluriels — « mesures », « nombres » —, pas celui de « français » ni de « temps ».
  const singuliers = morceaux.map((m) => m.replace(/(?<=[eétrnl])s$/, "").replace(/(?<=eu)x$/, ""));
  return [...new Set([...MOTS_PREFERES.filter(([re]) => re.test(forme)).map(([, m]) => m), propre, ...morceaux, ...singuliers])]
    .filter((m) => m.length > 1 && !MOTS_ECARTES.has(m));
}

/** Le picto que la banque propose pour chacun de ces noms : celui du premier de leurs mots qu'elle connaît, au sens de la classe. */
export async function pictosProposes(noms: string[]): Promise<Record<string, number>> {
  const mots = [...new Set(noms.flatMap(motsDuNom))];
  if (!mots.length) return {};
  const trouves = await api.arasaacPourConsignes(mots).catch(() => []);
  const ids = new Map(trouves.map((p) => [p.mot.toLowerCase(), p.id]));
  const sortie: Record<string, number> = {};
  for (const nom of noms) {
    const mot = motsDuNom(nom).find((m) => ids.has(m));
    if (mot) sortie[nom] = ids.get(mot)!;
  }
  return sortie;
}

/**
 * Les domaines des référentiels actifs, rangés sous leur matière de la liste :
 * les sous-domaines d'une matière — Français › Lecture, Écriture… —, et les
 * domaines du cycle 1 sous la leur — Mobiliser le langage › 1. Mobiliser le
 * langage dans toutes ses dimensions. Chacun une fois, dans l'ordre des référentiels.
 */
export function domainesParMatiere(referentiels: Pick<Referentiel, "actif" | "donnees">[]): Record<string, string[]> {
  const sortie: Record<string, string[]> = {};
  const vus = new Set<string>();
  const poser = (matiere: string, nom: string) => {
    const f = formeDuNom(nom);
    if (!f || vus.has(f) || f === formeDuNom(matiere)) return;
    vus.add(f);
    (sortie[matiere] ??= []).push(nom.trim());
  };
  for (const r of referentiels.filter((x) => x.actif)) {
    let domaines: { titre?: string; sousDomaines?: { titre?: string }[] }[] = [];
    try { domaines = JSON.parse(r.donnees)?.domaines ?? []; } catch { domaines = []; }
    if (!Array.isArray(domaines)) continue;
    for (const d of domaines) {
      const titre = (d?.titre ?? "").trim();
      const matiere = MATIERES.includes(titre) ? titre : matiereDuDomaine(titre);
      if (!matiere) continue;
      poser(matiere, titre);
      for (const sd of Array.isArray(d.sousDomaines) ? d.sousDomaines : []) poser(matiere, sd?.titre ?? "");
    }
  }
  return sortie;
}
