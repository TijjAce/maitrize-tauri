// ── Les maisons du tri, avec les mots du projet ───────────────────────────
//
// Le projet du moment donne ses mots et ses phrases aux ateliers. Le tri a
// besoin de plus : de maisons, qui disent où ranger. On prend ce qui se
// décide sans IA, sur ces mots-là — combien de syllabes on entend, ou ce qui
// est une phrase et ce qui n'en est pas une (ses propres phrases, défaites).
//
// Le même corpus donne toujours le même tri : sa graine vient du texte. C'est
// ce qui permet de reconnaître, plus tard, un tri qu'on n'a pas retouché.

import type { Corpus } from "./corpusProjet";
import { hasard, melanger } from "./hasard";
import { compterSyllabes } from "./syllabes";
import { BASE_TRI, etiquettesSaisies, type CategorieTri, type ReglagesTri } from "./triEtiquettes";

export interface ModeleTri { id: string; nom: string; reglages: ReglagesTri }

/** Combien d'étiquettes par maison, au plus : une feuille, pas un livre. */
const PAR_MAISON = 8;

/** Une graine tirée du texte : le même corpus redonne le même tri. */
function graineDe(texte: string): number {
  let h = 2166136261;
  for (const ch of texte) { h ^= ch.codePointAt(0) ?? 0; h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/**
 * Une phrase défaite : ses mots dans un autre ordre, sans majuscule ni point.
 * Le premier mot perd sa majuscule où qu'il aille : elle disait le début.
 */
export function phraseDefaite(phrase: string, alea: () => number): string {
  const mots = phrase.replace(/\s*[.!?…]+\s*$/, "").split(/\s+/).filter(Boolean);
  if (mots[0]) mots[0] = mots[0].charAt(0).toLocaleLowerCase("fr") + mots[0].slice(1);
  let suite = mots;
  for (let essai = 0; essai < 6 && mots.length > 1 && suite.join(" ") === mots.join(" "); essai++) suite = melanger(alea, mots);
  return suite.join(" ");
}

/** Les tris qu'un projet donne : par syllabes avec ses mots, phrase ou pas avec ses phrases. */
export function trisDuProjet(corpus: Corpus, titreProjet: string): ModeleTri[] {
  const nom = (quoi: string) => `📌 ${titreProjet.trim() || "Le projet"} — ${quoi}`;
  const modeles: ModeleTri[] = [];

  const mots = corpus.mots.map((m) => m.trim()).filter(Boolean);
  if (mots.length >= 4) {
    const maisons: CategorieTri[] = [
      { titre: "1 syllabe", etiquettes: "" }, { titre: "2 syllabes", etiquettes: "" }, { titre: "3 syllabes ou plus", etiquettes: "" },
    ];
    const parMaison: string[][] = [[], [], []];
    for (const m of mots) {
      const i = Math.min(3, Math.max(1, compterSyllabes(m))) - 1;
      if (parMaison[i].length < PAR_MAISON) parMaison[i].push(m);
    }
    const garnies = maisons.map((c, i) => ({ ...c, etiquettes: parMaison[i].join("\n") })).filter((c) => c.etiquettes);
    if (garnies.length >= 2) {
      modeles.push({ id: "projet-syllabes", nom: nom("combien de syllabes ?"), reglages: {
        ...BASE_TRI, modele: "syllabes", titre: "Combien de syllabes ?", aideMots: false, taille: "grande",
        consigne: "Découpe les étiquettes. Dis chaque mot en frappant les syllabes, et place-le dans la bonne maison.",
        categories: garnies,
      } });
    }
  }

  const phrases = corpus.phrases.map((p) => p.trim()).filter(Boolean).slice(0, PAR_MAISON);
  if (phrases.length >= 2) {
    const alea = hasard(graineDe(phrases.join("\n")));
    modeles.push({ id: "projet-phrase", nom: nom("phrase, ou pas une phrase"), reglages: {
      ...BASE_TRI, modele: "phrase", titre: "Qu'est-ce qu'une phrase ?", aideMots: false, aidePonctuation: true, parLigne: 2,
      consigne: "Découpe les étiquettes. Lis-les, et range-les : celles qui sont des phrases, et celles qui n'en sont pas.",
      categories: [
        { titre: "C'est une phrase", etiquettes: phrases.join("\n") },
        { titre: "Ce n'est pas une phrase", etiquettes: phrases.map((p) => phraseDefaite(p, alea)).join("\n") },
      ],
    } });
  }
  return modeles;
}

/** Ce qui fait l'identité d'un tri : ses maisons et leurs étiquettes. */
const empreinte = (categories: CategorieTri[]) =>
  JSON.stringify(categories.map((c) => [c.titre.trim(), etiquettesSaisies(c.etiquettes)]));

/** Un tri tel qu'un modèle l'a posé, sans retouche : on peut le remplacer sans perdre le travail de l'enseignant. */
export function estUnModele(categories: CategorieTri[], modeles: ModeleTri[]): boolean {
  const mien = empreinte(categories);
  return modeles.some((m) => empreinte(m.reglages.categories) === mien);
}
