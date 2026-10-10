// ── Les aides à la tâche ──────────────────────────────────────────────────
//
// Cap école inclusive (Réseau Canopé), « Aménager et adapter », pour le
// besoin « structuration de la tâche » : des fiches qui aident l'élève à
// entrer dans la tâche et à la mener au bout. L'enseignant les a voulues en
// octobre 2026 — le séquentiel de chaque séance et la préparation d'une prise
// de parole se glissent dans les séquences qu'on crée ; résoudre un problème,
// décomposer une tâche, passer de la figure à l'équation et modéliser par une
// fonction se fabriquent dans Fabriquer.
//
// Les fiches de Cap école inclusive sont des exemples, « et non des
// modèles » : on en garde la démarche, étape par étape, et ce qu'elles
// mettent entre les mains de l'élève. Les énoncés d'exemple sont écrits pour
// Maitrize. Ce qui existait déjà s'y retrouve : la carte mentale de Fabriquer,
// le scénario des supports visuels de CAA, les pictos des consignes.

import { escapeHtml } from "./print";
import { reference } from "./references";
import { feuille } from "./cartesImprimables";
import { lireConsignes } from "./tapuscrit";
import { mentionDesPictos, type RefPicto } from "./pictosAppoint";
import { feuilleScenario, pageDuScenario, STYLE_SUPPORTS, type DispositionScenario, type EtapeScenario, type Images } from "./supportsVisuels";
import { brancheVide, htmlCarteMentale, STYLE_CARTE_MENTALE, type ReglagesCarte } from "./carteMentale";
import { patronDeSvg } from "./jeuxMaths";

// ── Ce qu'elles ont en commun ─────────────────────────────────────────────

const CAP = "https://www.reseau-canope.fr/cap-ecole-inclusive/amenager-et-adapter/fiche-adaptation/";

/** D'où vient chaque fiche : la référence qui se montre derrière le « ? », et ne s'imprime pas. */
export const SOURCES_DES_AIDES = {
  sequentiel: `Cap école inclusive (Réseau Canopé), fiches « Décomposition et séquentialisation de la tâche » et « Décomposer une tâche » — ${CAP}decomposition-et-sequentialisation-de-la-tache.html`,
  parole: `Cap école inclusive (Réseau Canopé), fiche « Organiser la prise de parole à l'oral » — ${CAP}organiser-la-prise-de-parole-a-loral.html`,
  resolution: `Cap école inclusive (Réseau Canopé), fiche « S'engager dans une démarche de résolution de problème, mise en équation et résolution » — ${CAP}sengager-dans-une-demarche-de-resolution-de-probleme-mise-en-equation-et-resolution.html`,
  modelisation: `Cap école inclusive (Réseau Canopé), fiche « Aider à la modélisation mathématique » — ${CAP}aider-a-la-modelisation-mathematique.html`,
  fonction: `Cap école inclusive (Réseau Canopé), fiche « Modéliser par une fonction une situation mathématique » — ${CAP}modeliser-par-une-fonction-une-situation-mathematique.html`,
} as const;

const esc = escapeHtml;
const texteSur = (v: unknown, defaut: string, max = 800) => (typeof v === "string" ? v.slice(0, max) : defaut);
const booleenSur = (v: unknown, defaut: boolean) => (typeof v === "boolean" ? v : defaut);
const parmi = <T extends string>(v: unknown, valeurs: readonly T[], defaut: T): T => (valeurs.includes(v as T) ? (v as T) : defaut);
const listeSure = (v: unknown, defaut: string[], max: number, longueur: number) =>
  (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.slice(0, longueur)).slice(0, max) : defaut);
/** Les lignes d'un texte, sans les vides : une étape, une phrase, un mot par ligne. */
export const lignesDe = (texte: string) => texte.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

/** Des lignes où écrire. */
const aEcrire = (n: number) => `<div class="at-lignes">${Array.from({ length: n }, () => `<div class="at-ligne"></div>`).join("")}</div>`;
/** Un cadre numéroté : une étape de la démarche. */
const cadre = (numero: number | string | null, titre: string, corps: string, classe = "") =>
  `<div class="at-cadre ${classe}"><div class="at-cadre-titre">${numero != null ? `<span class="at-num">${numero}</span>` : ""}<span>${titre}</span></div>${corps}</div>`;
const tete = (titre: string, source: string, sous = "") =>
  `<div class="at-titre">${esc(titre)} ${reference(source)}</div>${sous ? `<div class="at-sous">${sous}</div>` : ""}`;
/** Un tableau à remplir : ses en-têtes, et autant de rangées vides. */
const tableauVide = (entetes: string[], rangees: number, classe = "") =>
  `<table class="at-tableau ${classe}"><tr>${entetes.map((e) => `<th>${e}</th>`).join("")}</tr>`
  + `${Array.from({ length: rangees }, () => `<tr>${entetes.map(() => "<td></td>").join("")}</tr>`).join("")}</table>`;

/** L'image d'un picto, ou une place vide. */
const imgDe = (ref: RefPicto | null | undefined, images: Record<string, string>, classe = "at-picto") => {
  const src = ref != null ? images[String(ref)] : "";
  return src ? `<img class="${classe}" src="${src}" alt="">` : `<span class="${classe} at-sans"></span>`;
};

/** La mention des licences des pictos posés : ARASAAC, F. Bajard, Sclera. */
const mention = (refs: (RefPicto | null | undefined)[], images: Record<string, string>) =>
  mentionDesPictos(refs.filter((r): r is RefPicto => r != null && Boolean(images[String(r)])), "", "attribution");

// ── Décomposer la tâche : le séquentiel, la check-list, le logigramme ─────
//
// « Décomposer la tâche en chacune de ses sous-parties, en étapes plus
// simples » ; la montrer à l'élève comme une recette illustrée — en entier,
// ou en cachant l'étape qu'il apprend (le chaînage) — ; la lui faire dire en
// la faisant (le soliloque). « Décomposer une tâche » ajoute ce qui aide à y
// entrer : redire la consigne, savoir le matériel, voir le résultat attendu,
// numéroter et flécher les étapes, vérifier à la fin.

export type FormeSequentiel = "liste" | "sequentiel" | "logigramme" | "frise";
export const FORMES_SEQUENTIEL: { id: FormeSequentiel; nom: string; quoi: string }[] = [
  { id: "liste", nom: "Check-list", quoi: "Les étapes numérotées, une case à cocher à chacune." },
  { id: "sequentiel", nom: "Séquentiel visuel", quoi: "Une étape par case, son image en grand : le scénario des supports visuels de CAA." },
  { id: "logigramme", nom: "Logigramme", quoi: "Les étapes dans des cadres reliés par des flèches, de haut en bas." },
  { id: "frise", nom: "Frise", quoi: "Les étapes le long d'une flèche, à l'italienne." },
];

export type Chainage = "aucun" | "avant" | "arriere";
export const CHAINAGES: { id: Chainage; nom: string; quoi: string }[] = [
  { id: "aucun", nom: "Toutes les étapes", quoi: "Une seule version, complète." },
  { id: "avant", nom: "Chaînage avant", quoi: "La version complète, puis une version par étape apprise, cachée — de la première à la dernière." },
  { id: "arriere", nom: "Chaînage arrière", quoi: "La version complète, puis on cache en partant de la fin : l'élève termine seul, et réussit." },
];

export const ETAPES_SEQUENTIEL_MAX = 10;
export const ETAPE_SEQUENTIEL_MAX = 120;
/** L'étape qui ouvre la tâche : s'assurer qu'on a compris la consigne. */
export const ETAPE_REDIRE = "Je lis la consigne et je la redis avec mes mots.";
/** L'étape qui la ferme : contrôler. */
export const ETAPE_VERIFIER = "Je vérifie mon travail.";

export interface ReglagesSequentiel {
  titre: string;
  /** Les étapes de la tâche, une par ligne, dans l'ordre. */
  etapes: string[];
  forme: FormeSequentiel;
  /** La disposition du séquentiel visuel : en liste, en grille, ou une étape par page. */
  disposition: DispositionScenario;
  /** Le picto du geste de chaque étape. */
  pictos: boolean;
  /** Une case à cocher par étape faite. */
  cases: boolean;
  chainage: Chainage;
  /** Ce dont j'ai besoin. */
  materiel: string;
  /** Ce que je dois obtenir. */
  resultat: string;
  /** En tête : je redis la consigne avec mes mots. */
  redire: boolean;
  /** À la fin : je vérifie mon travail. */
  verifier: boolean;
  /** La page du soliloque : je me dis ce que je fais. */
  soliloque: boolean;
}

export const REGLAGES_SEQUENTIEL: ReglagesSequentiel = {
  titre: "Coller une feuille dans mon cahier",
  etapes: [
    "Je prends mon cahier et la feuille.",
    "Je mets de la colle au dos de la feuille.",
    "Je pose la feuille bien droite sur la page.",
    "J'appuie avec la main.",
    "Je range la colle.",
  ],
  forme: "liste", disposition: "liste", pictos: true, cases: true, chainage: "aucun",
  materiel: "Mon cahier, la feuille, la colle.", resultat: "La feuille est collée bien droite dans mon cahier.",
  redire: true, verifier: true, soliloque: false,
};

export function reglagesSequentielSurs(brut: unknown): ReglagesSequentiel {
  const o = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;
  const d = REGLAGES_SEQUENTIEL;
  return {
    titre: texteSur(o.titre, d.titre, 120),
    etapes: listeSure(o.etapes, d.etapes, ETAPES_SEQUENTIEL_MAX, ETAPE_SEQUENTIEL_MAX),
    forme: parmi(o.forme, FORMES_SEQUENTIEL.map((f) => f.id), d.forme),
    disposition: parmi(o.disposition, ["liste", "grille", "livret"] as const, d.disposition),
    pictos: booleenSur(o.pictos, d.pictos),
    cases: booleenSur(o.cases, d.cases),
    chainage: parmi(o.chainage, CHAINAGES.map((c) => c.id), d.chainage),
    materiel: texteSur(o.materiel, d.materiel, 300),
    resultat: texteSur(o.resultat, d.resultat, 300),
    redire: booleenSur(o.redire, d.redire),
    verifier: booleenSur(o.verifier, d.verifier),
    soliloque: booleenSur(o.soliloque, d.soliloque),
  };
}

/** Les étapes telles que la fiche les montre : la consigne redite en tête, la vérification à la fin. */
export function etapesDeLaFiche(r: Pick<ReglagesSequentiel, "etapes" | "redire" | "verifier">): string[] {
  const etapes = r.etapes.map((e) => e.trim()).filter(Boolean);
  return [...(r.redire ? [ETAPE_REDIRE] : []), ...etapes, ...(r.verifier ? [ETAPE_VERIFIER] : [])];
}

/**
 * Les étapes cachées de chaque version : aucune pour la version complète ;
 * puis, au chaînage avant, la première, les deux premières… ; au chaînage
 * arrière, la dernière, les deux dernières… Seules les étapes de la tâche se
 * cachent : on redit toujours la consigne, on vérifie toujours.
 */
export function versionsDuChainage(r: Pick<ReglagesSequentiel, "etapes" | "redire" | "verifier" | "chainage">): Set<number>[] {
  const n = r.etapes.map((e) => e.trim()).filter(Boolean).length;
  const decalage = r.redire ? 1 : 0;
  const versions: Set<number>[] = [new Set()];
  if (r.chainage === "aucun") return versions;
  for (let k = 1; k <= n; k++) {
    const cachees = r.chainage === "avant"
      ? Array.from({ length: k }, (_, i) => decalage + i)
      : Array.from({ length: k }, (_, i) => decalage + n - 1 - i);
    versions.push(new Set(cachees));
  }
  return versions;
}

/** Le picto d'un séquentiel visuel : un numéro ARASAAC, ou l'image d'une banque d'appoint rangée comme une photo. */
const poseDe = (ref: RefPicto | null | undefined, mot: string) =>
  (typeof ref === "number" ? { id: ref, mot } : typeof ref === "string" ? { id: null, mot, photo: ref } : { id: null, mot: "" });

/** Ce que voit l'élève avant de commencer : le matériel, le résultat attendu. */
function avantDeCommencer(r: ReglagesSequentiel): string {
  const blocs = [
    r.materiel.trim() ? `<div class="at-avant"><b>🧰 Ce dont j'ai besoin</b><span>${esc(r.materiel.trim())}</span></div>` : "",
    r.resultat.trim() ? `<div class="at-avant"><b>🎯 Ce que je dois obtenir</b><span>${esc(r.resultat.trim())}</span></div>` : "",
  ].filter(Boolean);
  return blocs.length ? `<div class="at-avants">${blocs.join("")}</div>` : "";
}

/** Une étape cachée : son numéro, et la place de la dire de mémoire. */
const cachee = (i: number) => `<div class="at-etape at-cachee"><span class="at-num">${i + 1}</span><span class="at-trou">Je m'en souviens…</span></div>`;

function htmlEtapes(r: ReglagesSequentiel, etapes: string[], pictos: (RefPicto | null)[], images: Record<string, string>, cachees: Set<number>): string {
  const ligne = (t: string, i: number) => (cachees.has(i) ? cachee(i)
    : `<div class="at-etape"><span class="at-num">${i + 1}</span>${r.pictos ? imgDe(pictos[i], images) : ""}`
      + `<span class="at-texte">${esc(t)}</span>${r.cases ? `<span class="at-case" aria-label="à cocher"></span>` : ""}</div>`);
  if (r.forme === "logigramme") {
    return `<div class="at-logigramme">${etapes.map((t, i) => (i ? `<div class="at-fleche">↓</div>` : "") + ligne(t, i)).join("")}</div>`;
  }
  if (r.forme === "frise") {
    const haut = etapes.map((t, i) => `<td>${i % 2 === 0 ? (cachees.has(i) ? `<span class="at-trou">…</span>` : `${r.pictos ? imgDe(pictos[i], images) : ""}<div>${esc(t)}</div>`) : ""}</td>`).join("");
    const bas = etapes.map((t, i) => `<td>${i % 2 === 1 ? (cachees.has(i) ? `<span class="at-trou">…</span>` : `${r.pictos ? imgDe(pictos[i], images) : ""}<div>${esc(t)}</div>`) : ""}</td>`).join("");
    const axe = etapes.map((_, i) => `<td><span class="at-num">${i + 1}</span>${r.cases ? `<span class="at-case"></span>` : ""}</td>`).join("");
    return `<table class="at-frise"><tr class="at-frise-haut">${haut}</tr><tr class="at-axe">${axe}</tr><tr class="at-frise-bas">${bas}</tr></table>`;
  }
  return `<div class="at-liste">${etapes.map(ligne).join("")}</div>`;
}

/** La page du soliloque : se dire chaque étape, à voix haute, en chuchotant, puis dans sa tête. */
function pageSoliloque(r: ReglagesSequentiel, etapes: string[]): string {
  const rangees = etapes.map((t, i) => `<tr><td><span class="at-num">${i + 1}</span> ${esc(t)}</td><td><span class="at-case"></span></td><td><span class="at-case"></span></td><td><span class="at-case"></span></td></tr>`).join("");
  return `<div class="page">${tete(`Je me dis ce que je fais — ${r.titre.trim() || "ma tâche"}`, SOURCES_DES_AIDES.sequentiel)}
    <table class="at-tableau at-soliloque"><tr><th>Mes étapes</th><th>🗣 À voix haute</th><th>🤫 En chuchotant</th><th>💭 Dans ma tête</th></tr>${rangees}</table>
    <div class="at-adulte"><b>Pour l'adulte — le soliloque, en cinq temps</b><ol>
      <li>L'adulte fait la tâche en disant à voix haute ce qu'il fait ; l'élève regarde et écoute.</li>
      <li>L'élève fait la tâche ; l'adulte lui dit chaque étape, au fur et à mesure.</li>
      <li>L'élève fait la tâche en disant lui-même chaque étape à voix haute.</li>
      <li>Puis en chuchotant.</li>
      <li>Puis dans sa tête, sans parler ni chuchoter.</li>
    </ol></div></div>`;
}

/**
 * La fiche d'une tâche décomposée. `pictos` donne le picto de chaque étape
 * telle que la fiche la montre (voir `etapesDeLaFiche`), et `images` leurs
 * images, par référence.
 */
export function htmlSequentiel(r: ReglagesSequentiel, pictos: (RefPicto | null)[], images: Record<string, string>): string {
  const etapes = etapesDeLaFiche(r);
  const titre = r.titre.trim() || "Ma tâche, étape par étape";
  const versions = versionsDuChainage(r);
  const pages = versions.map((cachees, v) => {
    const quelle = v === 0 ? "" : r.chainage === "avant"
      ? `Version ${v + 1} — j'apprends ${v === 1 ? "la première étape" : `les ${v} premières étapes`} : ${v === 1 ? "elle est cachée" : "elles sont cachées"}.`
      : `Version ${v + 1} — je termine seul : ${v === 1 ? "la dernière étape est cachée" : `les ${v} dernières étapes sont cachées`}.`;
    if (r.forme === "sequentiel") {
      // Le scénario des supports visuels : une case par étape, son image, son texte.
      const scenario: EtapeScenario[] = etapes.map((t, i) => ({
        picto: cachees.has(i) || !r.pictos ? { id: null, mot: "" } : poseDe(pictos[i], t),
        texte: cachees.has(i) ? "Je m'en souviens…" : t,
      }));
      const imagesSv: Images = { ...images };
      for (const ref of pictos) if (typeof ref === "string" && images[ref]) imagesSv[`photo:${ref}`] = images[ref];
      return `<div class="page"><div class="at-reference-carte">${reference(SOURCES_DES_AIDES.sequentiel)}</div>`
        + `${v === 0 ? avantDeCommencer(r) : `<div class="at-sous">${esc(quelle)}</div>`}`
        + feuilleScenario({ titre, etapes: scenario, disposition: r.disposition, grandTexte: true, capitales: false }, imagesSv) + `</div>`;
    }
    return `<div class="page">${tete(titre, SOURCES_DES_AIDES.sequentiel, quelle ? esc(quelle) : "")}${v === 0 ? avantDeCommencer(r) : ""}`
      + `${htmlEtapes(r, etapes, pictos, images, cachees)}</div>`;
  });
  const toutes = pages.join("") + (r.soliloque ? pageSoliloque(r, etapes) : "");
  // Le scénario des supports visuels cite déjà ARASAAC : il reste les banques d'appoint.
  const cites = r.forme === "sequentiel" ? pictos.filter((p) => typeof p === "string") : pictos;
  return feuille(toutes + (r.pictos ? mention(cites, images) : ""), `at at-${r.forme}`);
}

/** La page qui va à la forme : la frise s'étire à l'italienne, le séquentiel suit sa disposition. */
export const styleDuSequentiel = (r: Pick<ReglagesSequentiel, "forme" | "disposition">) =>
  STYLE_AIDES + (r.forme === "sequentiel" ? STYLE_SUPPORTS + pageDuScenario(r) : r.forme === "frise" ? "@page { size: A4 landscape; margin: 10mm; }" : "");

// ── Le séquentiel d'une séance, pour une séquence qu'on crée ──────────────
//
// Les séances d'une démarche ont des phases écrites pour l'enseignant :
// « Temps 3 – Institutionnalisation ». Le séquentiel les dit à l'élève,
// à la première personne, une action par phase — ce qu'il va faire, dans
// l'ordre. Quand la séance a ses consignes, ce sont elles.

const ETAPES_DES_PHASES: [RegExp, string][] = [
  // La séance des mots des problèmes (voir motsDesProblemes.ts).
  [/rencontrer les mots/i, "Je découvre les mots."],
  [/jouer les actions/i, "Je joue ce qui se passe."],
  [/mots de la question/i, "J'apprends les mots de la question."],
  [/trier les étiquettes/i, "Je trie les étiquettes."],
  [/évaluation/i, "Je montre ce que je sais faire."],
  [/rappel|rituel|échauffement|mise en train|révision/i, "Je me rappelle ce que je sais déjà."],
  [/objectif|ouverture/i, "J'écoute ce que je vais apprendre."],
  [/modelage/i, "Je regarde et j'écoute l'adulte."],
  [/institutionnalisation|retien|trace écrite|clôture|objectivation|synthèse/i, "J'apprends ce qu'il faut retenir."],
  [/autonom|automatisation|réinvestissement|transfert|\bseul/i, "Je travaille seul."],
  [/guidée/i, "Je travaille avec l'adulte."],
  [/correction/i, "Je corrige mon travail."],
  [/bilan|retour|écoute des|échange|mise en commun|partage/i, "Je dis ce que j'ai fait et j'écoute les autres."],
  [/\bjeu/i, "Je joue avec les autres."],
  [/observation/i, "J'observe."],
  [/découverte|situation|collecte|recherche|problème/i, "Je cherche."],
  [/écri|dictée|copie/i, "J'écris."],
  [/lecture|\blire\b/i, "Je lis."],
  [/calcul/i, "Je calcule."],
  [/activité|atelier|entraînement|pratique|ardoise|exercice|série|suite|étape/i, "Je travaille."],
];

/** Les phases d'une séance, dites pour l'élève, dans l'ordre ; deux phases qui se suivent et disent la même chose n'en font qu'une. */
export function etapesDesPhases(phases: string[]): string[] {
  const sortie: string[] = [];
  for (const p of phases) {
    const titre = p.replace(/^Temps\s*\d+\s*[–—-]\s*/i, "").trim();
    if (!titre) continue;
    const etape = ETAPES_DES_PHASES.find(([re]) => re.test(titre))?.[1] ?? `${titre.replace(/[.\s]+$/, "")}.`;
    if (sortie[sortie.length - 1] !== etape) sortie.push(etape);
  }
  return sortie.slice(0, ETAPES_SEQUENTIEL_MAX);
}

/** Les étapes d'une séance pour son séquentiel : ses consignes, sinon ses phases dites pour l'élève. */
export function etapesDeLaSeance(s: { consignes?: string; tableauDeroulement?: string }): string[] {
  const consignes = lireConsignes(s.consignes);
  if (consignes.length) return consignes.slice(0, ETAPES_SEQUENTIEL_MAX);
  let grille: unknown = [];
  try { grille = JSON.parse(s.tableauDeroulement || "[]"); } catch { grille = []; }
  const phases = Array.isArray(grille) ? grille.slice(1).map((l) => (Array.isArray(l) && typeof l[0] === "string" ? l[0] : "")) : [];
  return etapesDesPhases(phases);
}

/** Les réglages du séquentiel d'une séance : sa check-list, ses étapes, la consigne redite et la vérification. */
export const sequentielDeLaSeance = (titre: string, etapes: string[]): ReglagesSequentiel => ({
  ...REGLAGES_SEQUENTIEL, titre, etapes, materiel: "", resultat: "", redire: false, verifier: false,
});

// ── Préparer une prise de parole ──────────────────────────────────────────
//
// « Organiser la prise de parole à l'oral passe par la clarification et
// l'organisation des idées » : la carte mentale, le noyau au centre et les
// idées en mots-clés autour, avec pictos et couleurs ; les cartes-images
// qu'on choisit pour soutenir ce qu'on dit, et qu'on range dans l'ordre ; le
// dé à raconter ; les questions simples — qui, quoi, où, quand.

export type ModeleParole = "presenter" | "appris";
export interface BrancheParole { titre: string; /** Le mot sous lequel la banque dessine la branche. */ mot: string }
export const MODELES_PAROLE: { id: ModeleParole; nom: string; quoi: string; branches: BrancheParole[] }[] = [
  {
    id: "presenter", nom: "Présenter, raconter", quoi: "Une notion, un événement, un document, une opinion : les questions qui l'ordonnent.",
    branches: [
      { titre: "Qui ?", mot: "qui" }, { titre: "Quoi ?", mot: "quoi ?" }, { titre: "Où ?", mot: "où" },
      { titre: "Quand ?", mot: "quand" }, { titre: "Comment ?", mot: "comment" }, { titre: "Pourquoi ?", mot: "pourquoi" },
    ],
  },
  {
    id: "appris", nom: "Dire ce que j'ai appris", quoi: "Au bilan d'une séquence : ce que j'ai appris, comment je fais, un exemple, ce que je me demande.",
    branches: [
      { titre: "J'ai appris…", mot: "apprendre" }, { titre: "Je fais comme ça", mot: "comment" },
      { titre: "Un exemple", mot: "montrer" }, { titre: "Je me demande…", mot: "question" },
    ],
  },
];
export const modeleParole = (id: ModeleParole) => MODELES_PAROLE.find((m) => m.id === id) ?? MODELES_PAROLE[0];

export type FacesDuDe = "aucun" | "questions" | "mots";
export const MOTS_PAROLE_MAX = 12;

export interface ReglagesParole {
  sujet: string;
  modele: ModeleParole;
  /** Les branches retenues, par leur titre. */
  branches: string[];
  /** La carte mentale à compléter. */
  carte: boolean;
  /** Les mots pour enchaîner ses idées. */
  debuts: boolean;
  /** Les cartes-images des mots-clés, à découper. */
  cartes: boolean;
  /** Le dé à raconter : ses faces portent les questions, ou les mots-clés. */
  de: FacesDuDe;
  /** Les mots-clés, un par ligne. */
  mots: string[];
}

export const REGLAGES_PAROLE: ReglagesParole = {
  sujet: "Les saisons", modele: "presenter", branches: ["Qui ?", "Quoi ?", "Où ?", "Quand ?"],
  carte: true, debuts: true, cartes: true, de: "aucun", mots: ["printemps", "été", "automne", "hiver", "arbre", "neige"],
};

export function reglagesParoleSurs(brut: unknown): ReglagesParole {
  const o = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;
  const d = REGLAGES_PAROLE;
  const modele = parmi(o.modele, MODELES_PAROLE.map((m) => m.id), d.modele);
  const titres = modeleParole(modele).branches.map((b) => b.titre);
  const branches = listeSure(o.branches, d.branches, 8, 40).filter((t) => titres.includes(t));
  return {
    sujet: texteSur(o.sujet, d.sujet, 80),
    modele,
    branches: branches.length >= 2 ? branches : titres.slice(0, 4),
    carte: booleenSur(o.carte, d.carte),
    debuts: booleenSur(o.debuts, d.debuts),
    cartes: booleenSur(o.cartes, d.cartes),
    de: parmi(o.de, ["aucun", "questions", "mots"] as const, d.de),
    mots: listeSure(o.mots, d.mots, MOTS_PAROLE_MAX, 40),
  };
}

/** Les branches de la carte, dans l'ordre du modèle. */
export const branchesDeLaParole = (r: Pick<ReglagesParole, "modele" | "branches">) =>
  modeleParole(r.modele).branches.filter((b) => r.branches.includes(b.titre));

/** Les faces du dé : les six questions, ou six mots-clés (on en répète s'il en manque). */
export function facesDuDe(r: Pick<ReglagesParole, "de" | "mots">): BrancheParole[] {
  if (r.de === "questions") return MODELES_PAROLE[0].branches;
  const mots = r.mots.map((m) => m.trim()).filter(Boolean);
  if (r.de !== "mots" || !mots.length) return [];
  return Array.from({ length: 6 }, (_, i) => ({ titre: mots[i % mots.length], mot: mots[i % mots.length] }));
}

/** Les mots à chercher dans la banque pour la fiche : ceux des branches, des cartes, du dé. */
export function motsDeLaParole(r: ReglagesParole): string[] {
  const mots = [
    ...branchesDeLaParole(r).map((b) => b.mot),
    ...(r.cartes ? r.mots : []),
    ...facesDuDe(r).map((f) => f.mot),
  ].map((m) => m.trim()).filter(Boolean);
  return [...new Set(mots)];
}

/** Les débuts de phrase qui enchaînent les idées, dans l'ordre où on les dit. */
const ENCHAINEMENTS = [
  { mot: "Pour commencer", suite: "Je vais vous parler de…" },
  { mot: "D'abord", suite: "" },
  { mot: "Ensuite", suite: "" },
  { mot: "Puis", suite: "" },
  { mot: "Enfin", suite: "" },
  { mot: "Pour finir", suite: "Ce que je retiens, c'est que…" },
];

/**
 * La fiche pour préparer une prise de parole. `pictoDe` donne le picto d'un
 * mot (un numéro ARASAAC : la carte mentale n'en prend pas d'autre), et
 * `images` leurs images.
 */
export function htmlPriseDeParole(r: ReglagesParole, pictoDe: (mot: string) => RefPicto | null, images: Record<string, string>): string {
  const sujet = r.sujet.trim();
  const pages: string[] = [];
  const poses: RefPicto[] = [];
  const numero = (mot: string) => { const ref = pictoDe(mot); return typeof ref === "number" && images[String(ref)] ? ref : null; };
  if (r.carte) {
    const carte: ReglagesCarte = {
      centre: sujet || "Mon sujet", image: { id: null, mot: "" },
      branches: branchesDeLaParole(r).map((b, i) => ({ ...brancheVide(i), titre: b.titre, image: { id: numero(b.mot), mot: b.titre } })),
      pictos: true, capitales: false,
    };
    // La carte mentale de Fabriquer, ses branches vides : l'élève y écrit, y dessine, y colle ses cartes.
    pages.push(htmlCarteMentale(carte, images));
  }
  const suite: string[] = [];
  if (r.debuts) {
    suite.push(`<div class="at-cadre"><div class="at-cadre-titre"><span>🔗 Pour enchaîner mes idées</span></div><div class="at-enchainements">`
      + ENCHAINEMENTS.map((e) => `<div class="at-enchainement"><b>${esc(e.mot)}</b>${e.suite ? ` <i>${esc(e.suite)}</i>` : ""}<div class="at-ligne"></div></div>`).join("")
      + `</div></div>`);
  }
  const mots = r.mots.map((m) => m.trim()).filter(Boolean);
  if (r.cartes && mots.length) {
    suite.push(`<div class="at-cadre"><div class="at-cadre-titre"><span>✂️ Mes cartes : je les choisis, je les range dans l'ordre où je vais parler</span></div>`
      + `<div class="at-cartes">${mots.map((m) => {
        const ref = pictoDe(m);
        if (ref != null && images[String(ref)]) poses.push(ref);
        return `<div class="at-carte">${imgDe(ref, images)}<span>${esc(m)}</span></div>`;
      }).join("")}</div></div>`);
  }
  const faces = facesDuDe(r);
  if (faces.length) {
    const dessin = (i: number, x: number, y: number, c: number) => {
      const f = faces[i];
      const ref = f ? pictoDe(f.mot) : null;
      const src = ref != null ? images[String(ref)] : "";
      if (ref != null && src) poses.push(ref);
      return (src ? `<image href="${src}" x="${x + 20}" y="${y + 8}" width="${c - 40}" height="${c - 40}" preserveAspectRatio="xMidYMid meet"/>` : "")
        + `<text x="${x + c / 2}" y="${y + c - 10}" text-anchor="middle" font-size="15" font-weight="700" font-family="Helvetica, Arial, sans-serif">${esc(f?.titre ?? "")}</text>`;
    };
    suite.push(`<div class="at-cadre at-de"><div class="at-cadre-titre"><span>🎲 Mon dé à raconter : je le lance, je dis une phrase avec ce qu'il montre</span></div>`
      + `<div class="at-de-patron">${patronDeSvg("aucun", dessin, 150)}</div></div>`);
  }
  if (suite.length) {
    // Après la carte, une nouvelle page : chacune des deux feuilles finit sans saut.
    pages.push(feuille(`<div class="page">${pages.length ? "" : tete(`Je prépare ma prise de parole${sujet ? ` — ${sujet}` : ""}`, SOURCES_DES_AIDES.parole)}`
      + `${suite.join("")}</div>${mention(poses, images)}`, `at at-parole${pages.length ? " at-apres-carte" : ""}`));
  }
  if (!pages.length) return feuille(tete("Je prépare ma prise de parole", SOURCES_DES_AIDES.parole), "at");
  // La référence va avec la carte quand elle ouvre la fiche : elle n'a pas de titre où se poser.
  return (r.carte ? `<div class="at-reference-carte">${reference(SOURCES_DES_AIDES.parole)}</div>` : "") + pages.join("");
}

// Dans l'aperçu de l'application, la carte à l'italienne se voit en entier ; le papier garde sa taille.
export const STYLE_PAROLE = () => STYLE_AIDES + STYLE_CARTE_MENTALE + ".apercu-feuille .feuille.cm .cm-carte { zoom: .5; }";

// ── Résoudre un problème, étape par étape ─────────────────────────────────
//
// Travailler l'énoncé d'abord — surligner, encadrer, souligner, entourer la
// question et la sortir du texte —, puis quatre étapes : ce qu'on cherche et
// son nom ; une phrase de l'énoncé traduite en égalité, puis en équation ;
// la résolution, ce qui change de couleur d'une ligne à l'autre ; vérifier,
// puis conclure en reprenant la question. À l'école, l'inconnue n'a pas
// encore de lettre : on la cherche avec un calcul.

export type NiveauResolution = "ecole" | "college";
export const NIVEAUX_RESOLUTION: { id: NiveauResolution; nom: string; quoi: string }[] = [
  { id: "ecole", nom: "À l'école", quoi: "Ce qu'on cherche se note « ? » et se trouve par un calcul." },
  { id: "college", nom: "Au collège", quoi: "Ce qu'on cherche s'appelle x : une égalité, puis une équation à résoudre." },
];

export interface ReglagesResolution {
  niveau: NiveauResolution;
  /** L'énoncé, sans la question : une phrase par ligne. */
  enonce: string;
  question: string;
  /** La légende des couleurs pour travailler l'énoncé. */
  couleurs: boolean;
  /** La question sur un bandeau à part, à garder sous les yeux. */
  questionAPart: boolean;
}

/** Des énoncés écrits pour Maitrize, un par niveau. */
export const EXEMPLES_RESOLUTION: Record<NiveauResolution, { enonce: string; question: string }> = {
  ecole: {
    enonce: "Léa a 12 billes.\nTom a 5 billes de plus que Léa.",
    question: "Combien de billes Tom a-t-il ?",
  },
  college: {
    enonce: "Lina et Sami mettent de l'argent dans une cagnotte.\nSami y met 6 € de plus que Lina.\nÀ la fin, la cagnotte contient 30 €.",
    question: "Combien d'euros Lina a-t-elle mis dans la cagnotte ?",
  },
};

export const REGLAGES_RESOLUTION: ReglagesResolution = {
  niveau: "ecole", ...EXEMPLES_RESOLUTION.ecole, couleurs: true, questionAPart: true,
};

export function reglagesResolutionSurs(brut: unknown): ReglagesResolution {
  const o = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;
  const d = REGLAGES_RESOLUTION;
  return {
    niveau: parmi(o.niveau, ["ecole", "college"] as const, d.niveau),
    enonce: texteSur(o.enonce, d.enonce, 1200),
    question: texteSur(o.question, d.question, 300),
    couleurs: booleenSur(o.couleurs, d.couleurs),
    questionAPart: booleenSur(o.questionAPart, d.questionAPart),
  };
}

export function htmlResolution(r: ReglagesResolution): string {
  const college = r.niveau === "college";
  const phrases = lignesDe(r.enonce);
  const question = r.question.trim();
  const enonce = `<div class="at-enonce">${phrases.map((p) => `<p>${esc(p)}</p>`).join("")}${question ? `<p class="at-question">${esc(question)}</p>` : ""}</div>`;
  const legende = r.couleurs ? `<div class="at-legende">
      <span><i class="at-surligne"></i> Je surligne de la même couleur les phrases qui parlent de la même chose.</span>
      <span><i class="at-encadre"></i> J'encadre les personnages.</span>
      <span><i class="at-souligne"></i> Je souligne les données : les nombres et ce qu'ils disent.</span>
      <span><i class="at-entoure"></i> J'entoure la question.</span>
    </div>` : "";
  const bandeau = r.questionAPart && question
    ? `<div class="at-bandeau"><b>❓ La question, sous mes yeux</b><span>${esc(question)}</span></div>` : "";
  const etape1 = cadre(1, "Que cherche-t-on ?",
    `<div class="at-champ">On cherche : <span class="at-blanc"></span></div>`
    + (college ? `<div class="at-champ">On l'appelle <b>x</b> : x = <span class="at-blanc"></span></div>`
      : `<div class="at-champ">Je l'écris avec un <b>?</b> : ? = <span class="at-blanc"></span></div>`));
  const etape2 = cadre(2, college ? "Je traduis une phrase de l'énoncé en égalité, puis en équation" : "Je traduis une phrase de l'énoncé en calcul",
    tableauVide(["La phrase de l'énoncé", college ? "L'égalité mathématique" : "Le calcul"], 2)
    + (college ? `<div class="at-champ">Mon équation : <span class="at-blanc"></span> = <span class="at-blanc"></span></div>` : ""));
  const etape3 = cadre(3, college ? "Je résous l'équation" : "Je calcule",
    `<div class="at-aide">${college ? "Une ligne par transformation : je colorie ce qui change d'une ligne à l'autre." : "J'écris mon calcul, puis son résultat."}</div>${aEcrire(college ? 4 : 2)}`);
  const etape4 = cadre(4, "Je vérifie et je conclus",
    `<div class="at-champ">Mon résultat est-il réaliste ? <span class="at-case"></span> oui <span class="at-case"></span> non</div>`
    + `<div class="at-champ">Je vérifie par le calcul :</div>${aEcrire(1)}`
    + `<div class="at-champ">Je reprends la question pour écrire ma phrase réponse${question ? ` : <i>« ${esc(question)} »</i>` : ""}</div>${aEcrire(1)}`);
  return feuille(`<div class="page">${tete("Je résous un problème, étape par étape", SOURCES_DES_AIDES.resolution,
    "D'abord je travaille l'énoncé, ensuite je suis les quatre étapes.")}`
    + cadre(null, "📖 L'énoncé", enonce + legende) + bandeau + etape1 + etape2 + etape3 + etape4 + `</div>`, "at at-resolution");
}

// ── De la figure à l'équation ─────────────────────────────────────────────
//
// Passer de l'entendement d'une figure à la traduction algébrique de la
// question, en six phases bien balisées : lire l'énoncé en trois parts,
// l'expliciter (couleurs, flèches, mesures sur la figure), expliciter la
// consigne dans un seul cadre — la figure qu'on découpe —, chercher (les
// essais successifs sont recevables), changer de cadre (x sur la figure,
// les aires, la phrase devenue équation), contrôler — par le calcul, et
// par le découpage.

export interface ReglagesModelisation {
  /** L'énoncé, sans la consigne : une phrase par ligne. */
  enonce: string;
  consigne: string;
  /** La longueur qui varie, celle qu'on appellera x : « AE ». */
  inconnue: string;
  /** Le tableau des essais successifs. */
  essais: boolean;
  /** Vérifier aussi en découpant. */
  decoupage: boolean;
}

export const REGLAGES_MODELISATION: ReglagesModelisation = {
  enonce: "ABCD est un carré de 20 cm de côté.\nDans le coin A, on retire un carré AEFG.\nE est un point mobile du segment [AB], G un point mobile du segment [AD], et AEFG reste un carré.",
  consigne: "Où placer le point E pour que la partie qui reste ait une aire de 300 cm² ?",
  inconnue: "AE", essais: true, decoupage: true,
};

export function reglagesModelisationSurs(brut: unknown): ReglagesModelisation {
  const o = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;
  const d = REGLAGES_MODELISATION;
  return {
    enonce: texteSur(o.enonce, d.enonce, 1200),
    consigne: texteSur(o.consigne, d.consigne, 300),
    inconnue: texteSur(o.inconnue, d.inconnue, 12),
    essais: booleenSur(o.essais, d.essais),
    decoupage: booleenSur(o.decoupage, d.decoupage),
  };
}

export function htmlModelisation(r: ReglagesModelisation): string {
  const x = r.inconnue.trim() || "la longueur qui varie";
  const phase1 = cadre(1, "Je lis l'énoncé : les phrases, la figure, la consigne",
    `<div class="at-trois">
      <div><b>Les phrases</b><div class="at-enonce petit">${lignesDe(r.enonce).map((p) => `<p>${esc(p)}</p>`).join("")}</div></div>
      <div><b>La figure</b><div class="at-figure">Je la dessine, ou je la colle.</div></div>
      <div><b>La consigne</b><div class="at-enonce petit"><p class="at-question">${esc(r.consigne.trim())}</p></div></div>
    </div>`);
  const phase2 = cadre(2, "J'explique l'énoncé sur la figure",
    `<div class="at-legende">
      <span><i class="at-surligne"></i> Une couleur par élément : le même dans le texte et sur la figure.</span>
      <span><i class="at-encadre"></i> J'encadre ce qui est donné.</span>
      <span>➜ Je fléche ce qui bouge.</span>
      <span>📏 Je reporte les mesures sur la figure.</span>
    </div>`);
  const phase3 = cadre(3, "J'explique la consigne : je découpe la figure",
    `<div class="at-aide">Je reste dans les figures : qu'est-ce qu'on enlève, qu'est-ce qui reste ?</div>
     <div class="at-decoupe"><span class="at-boite">La grande figure</span><b>−</b><span class="at-boite">La petite figure</span><b>=</b><span class="at-boite">La partie cherchée</span></div>
     <div class="at-champ">L'aire de chaque morceau : <span class="at-blanc"></span></div>`);
  const phase4 = cadre(4, "Je cherche", (r.essais
    ? `<div class="at-aide">Je peux essayer des valeurs : c'est une bonne façon de commencer.</div>`
      + tableauVide([`J'essaie ${esc(x)} =`, "L'aire de la partie", "Trop petit, trop grand, juste ?"], 4) : aEcrire(3)));
  const phase5 = cadre(5, "Je passe aux calculs avec x",
    `<div class="at-champ">x, c'est <b>${esc(x)}</b>, en <span class="at-blanc court"></span> : je l'écris sur la figure.</div>
     <div class="at-champ">L'aire de la grande figure = <span class="at-blanc"></span></div>
     <div class="at-champ">L'aire de la petite figure, avec x = <span class="at-blanc"></span></div>
     <div class="at-champ">L'aire de la partie cherchée = <span class="at-blanc"></span></div>
     <div class="at-champ">La phrase de la consigne devient l'équation : <span class="at-blanc"></span> = <span class="at-blanc"></span></div>
     <div class="at-champ">Je la résous :</div>${aEcrire(3)}`);
  const phase6 = cadre(6, "Je contrôle mon résultat",
    `<div class="at-champ"><span class="at-case"></span> Par le calcul : avec x = <span class="at-blanc court"></span>, l'aire vaut <span class="at-blanc court"></span>.</div>`
    + (r.decoupage ? `<div class="at-champ"><span class="at-case"></span> En découpant : je trace la figure à la bonne mesure, je découpe, je compare.</div>` : "")
    + `<div class="at-champ">Ma réponse :</div>${aEcrire(1)}`);
  return feuille(`<div class="page">${tete("De la figure à l'équation", SOURCES_DES_AIDES.modelisation, "Six étapes, l'une après l'autre : je ne passe à la suivante que quand j'ai fini.")}`
    + phase1 + phase2 + phase3 + `</div><div class="page">` + phase4 + phase5 + phase6 + `</div>`, "at at-modelisation");
}

// ── Modéliser par une fonction ────────────────────────────────────────────
//
// Une figure à géométrie variable, décortiquée : associer le texte et la
// figure, séparer ce qui est fixe de ce qui bouge, les points qui font bouger
// des points qui suivent, isoler la partie de la figure à observer — la
// longueur qui reste en fonction de x, un morceau de la figure à la fois.

export interface ReglagesFonction {
  enonce: string;
  question: string;
  /** La longueur qui varie : « AM ». */
  variable: string;
  /** Le tableau de valeurs, puis le repère pour tracer : la suite, quand l'énoncé est compris. */
  tableau: boolean;
  repere: boolean;
}

export const REGLAGES_FONCTION: ReglagesFonction = {
  enonce: "[AB] est un segment de 10 cm.\nM est un point mobile du segment [AB].\nOn construit les carrés AMNP et MBQR, du même côté de [AB].",
  question: "On s'intéresse à la somme des aires des deux carrés. Existe-t-il une position du point M pour laquelle cette somme est la plus petite ?",
  variable: "AM", tableau: true, repere: true,
};

export function reglagesFonctionSurs(brut: unknown): ReglagesFonction {
  const o = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;
  const d = REGLAGES_FONCTION;
  return {
    enonce: texteSur(o.enonce, d.enonce, 1200),
    question: texteSur(o.question, d.question, 400),
    variable: texteSur(o.variable, d.variable, 12),
    tableau: booleenSur(o.tableau, d.tableau),
    repere: booleenSur(o.repere, d.repere),
  };
}

/** Un repère quadrillé où placer les points. */
const repereSvg = () => {
  const n = 12, c = 10;
  const lignes = Array.from({ length: n + 1 }, (_, i) =>
    `<line x1="${i * c}" y1="0" x2="${i * c}" y2="${n * c}"/><line x1="0" y1="${i * c}" x2="${n * c}" y2="${i * c}"/>`).join("");
  return `<svg class="at-repere" viewBox="-8 -4 ${n * c + 14} ${n * c + 14}" width="80mm" height="80mm">
    <g stroke="#c8cdda" stroke-width="0.4">${lignes}</g>
    <g stroke="#1c2233" stroke-width="1"><line x1="0" y1="${n * c}" x2="${n * c + 4}" y2="${n * c}"/><line x1="0" y1="${n * c}" x2="0" y2="-2"/></g>
    <text x="${n * c + 2}" y="${n * c + 8}" font-size="6">x</text><text x="2" y="4" font-size="6">f(x)</text>
  </svg>`;
};

export function htmlFonction(r: ReglagesFonction): string {
  const v = r.variable.trim() || "la longueur qui varie";
  const etape1 = cadre(1, "J'associe le texte et la figure",
    `<div class="at-enonce petit">${lignesDe(r.enonce).map((p) => `<p>${esc(p)}</p>`).join("")}<p class="at-question">${esc(r.question.trim())}</p></div>`
    + `<div class="at-aide">Une couleur pour chaque mot de l'énoncé et pour ce qu'il désigne sur la figure — je garde les mêmes couleurs toute l'année.</div>`
    + tableauVide(["Ma couleur", "Dans le texte", "Sur la figure"], 4, "at-couleurs"));
  const etape2 = cadre(2, "Ce qui est fixe, ce qui bouge", tableauVide(["Fixe — reste constant", "Mobile — varie"], 4));
  const etape3 = cadre(3, "Le rôle des points", tableauVide(["Fixes : ils ne bougent pas", "Premiers rôles : ils font bouger", "Seconds rôles : ils bougent avec eux"], 2));
  const etape4 = cadre(4, "J'isole une partie de la figure",
    `<div class="at-champ">x, c'est <b>${esc(v)}</b> : x = <span class="at-blanc"></span></div>
     <div class="at-champ">Je regarde seulement le segment qui reste : il mesure <span class="at-blanc"></span> (avec x).</div>
     <div class="at-aide">La figure est faite de plusieurs morceaux : je les étudie l'un après l'autre.</div>
     <div class="at-champ">Morceau 1 : son aire = <span class="at-blanc"></span></div>
     <div class="at-champ">Morceau 2 : son aire = <span class="at-blanc"></span></div>
     <div class="at-champ">Ensemble : f(x) = <span class="at-blanc"></span></div>`);
  const valeurs = Array.from({ length: 7 }, () => "<td></td>").join("");
  const suite = (r.tableau || r.repere) ? cadre(5, "Je calcule des valeurs, puis je les place",
    (r.tableau ? `<table class="at-tableau at-valeurs"><tr><th>x</th>${valeurs}</tr><tr><th>f(x)</th>${valeurs}</tr></table>` : "")
    + (r.repere ? `<div class="at-repere-bloc">${repereSvg()}<div class="at-aide">Je place les points (x ; f(x)), puis je réponds à la question :</div>${aEcrire(2)}</div>` : "")) : "";
  return feuille(`<div class="page">${tete("Modéliser par une fonction", SOURCES_DES_AIDES.fonction, "Je décortique l'énoncé avant de calculer.")}`
    + etape1 + etape2 + etape3 + `</div><div class="page">` + etape4 + suite + `</div>`, "at at-fonction");
}

// ── La mise en page ───────────────────────────────────────────────────────

export const STYLE_AIDES = `
  .feuille.at { font-size: 13px; line-height: 1.4; }
  .feuille.at .at-titre { font-size: 19px; font-weight: 800; margin: 0 0 1.5mm; }
  .feuille.at .at-sous { font-size: 12px; color: #4a5268; margin: 0 0 4mm; }
  .feuille.at .at-cadre { border: 1.5px solid #cfd4e2; border-radius: 3mm; padding: 3mm 4mm; margin: 0 0 3.5mm; break-inside: avoid; page-break-inside: avoid; }
  .feuille.at .at-cadre-titre { display: flex; align-items: center; gap: 2.5mm; font-weight: 800; font-size: 14px; margin: 0 0 2mm; }
  .feuille.at .at-num { display: inline-flex; align-items: center; justify-content: center; flex: none; width: 7mm; height: 7mm;
    border-radius: 50%; background: #23527c; color: #fff; font-weight: 800; font-size: 12.5px; }
  .feuille.at .at-ligne { border-bottom: 1px solid #aab1c2; height: 8.5mm; }
  .feuille.at .at-case { display: inline-block; width: 5mm; height: 5mm; border: 1.6px solid #1c2233; border-radius: 1mm; vertical-align: -1mm; flex: none; }
  .feuille.at .at-blanc { display: inline-block; min-width: 45mm; border-bottom: 1px solid #1c2233; height: 5mm; vertical-align: -1mm; }
  .feuille.at .at-blanc.court { min-width: 18mm; }
  .feuille.at .at-champ { margin: 2.5mm 0; }
  .feuille.at .at-aide { font-size: 12px; color: #4a5268; font-style: italic; margin: 1mm 0 2mm; }
  .feuille.at .at-picto { width: 14mm; height: 14mm; object-fit: contain; flex: none; margin: 0; max-height: none; }
  .feuille.at .at-picto.at-sans { display: inline-block; border: 1.2px dashed #c4c9d6; border-radius: 2mm; }
  .feuille.at table.at-tableau { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .feuille.at table.at-tableau th, .feuille.at table.at-tableau td { border: 1px solid #9aa0b4; padding: 2mm; height: 10mm; text-align: left; vertical-align: top; font-size: 12px; }
  .feuille.at table.at-tableau th { background: #f0f2f8; height: auto; }
  .feuille.at table.at-couleurs td:first-child { width: 22mm; }
  .feuille.at table.at-valeurs th { width: 14mm; }
  /* Avant de commencer : le matériel, le résultat attendu. */
  .feuille.at .at-avants { display: flex; gap: 3mm; margin: 0 0 4mm; }
  .feuille.at .at-avant { flex: 1; border: 1.5px dashed #9aa0b4; border-radius: 3mm; padding: 2.5mm 3.5mm; }
  .feuille.at .at-avant b { display: block; margin-bottom: 1mm; }
  /* Les étapes : en liste, en logigramme, sur une frise. */
  .feuille.at .at-liste { display: block; }
  .feuille.at .at-etape { display: flex; align-items: center; gap: 3.5mm; padding: 2.5mm 3mm; margin: 0 0 2.5mm; border: 1.5px solid #cfd4e2;
    border-radius: 3mm; break-inside: avoid; page-break-inside: avoid; font-size: 15px; }
  .feuille.at .at-texte { flex: 1; }
  .feuille.at .at-cachee { border-style: dashed; }
  .feuille.at .at-trou { flex: 1; color: #8a91a5; font-style: italic; }
  .feuille.at .at-logigramme { display: block; width: 140mm; margin: 0 auto; }
  .feuille.at .at-logigramme .at-etape { margin: 0; }
  .feuille.at .at-fleche { text-align: center; font-size: 20px; line-height: 1; margin: 1mm 0; color: #23527c; }
  .feuille.at table.at-frise { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 6mm; }
  .feuille.at table.at-frise td { text-align: center; vertical-align: bottom; padding: 1.5mm; font-size: 12.5px; }
  .feuille.at table.at-frise .at-frise-bas td { vertical-align: top; }
  .feuille.at table.at-frise .at-picto { display: block; margin: 0 auto 1mm; width: 16mm; height: 16mm; }
  .feuille.at .at-axe td { position: relative; height: 12mm; vertical-align: middle; }
  .feuille.at .at-axe td::before { content: ""; position: absolute; left: 0; right: 0; top: 50%; border-top: 2.5px solid #1c2233; }
  .feuille.at .at-axe td:last-child::after { content: ""; position: absolute; right: -2mm; top: 50%; margin-top: -2.4mm;
    border-left: 4mm solid #1c2233; border-top: 2.4mm solid transparent; border-bottom: 2.4mm solid transparent; }
  .feuille.at .at-axe .at-num { position: relative; z-index: 1; }
  .feuille.at .at-axe .at-case { position: relative; z-index: 1; margin-left: 1.5mm; background: #fff; }
  /* Le soliloque. */
  .feuille.at table.at-soliloque td:not(:first-child), .feuille.at table.at-soliloque th:not(:first-child) { width: 30mm; text-align: center; }
  .feuille.at table.at-soliloque td { vertical-align: middle; font-size: 13px; }
  .feuille.at .at-adulte { margin-top: 5mm; border: 1px solid #cfd4e2; background: #f7f8fc; border-radius: 3mm; padding: 3mm 4mm; font-size: 12px; }
  .feuille.at .at-adulte ol { margin: 1.5mm 0 0; padding-left: 5mm; }
  /* L'énoncé, la légende des couleurs, la question à part. */
  .feuille.at .at-enonce p { margin: 0 0 2mm; font-size: 15px; line-height: 1.7; }
  .feuille.at .at-enonce.petit p { font-size: 13px; line-height: 1.5; }
  .feuille.at .at-question { font-weight: 700; }
  .feuille.at .at-legende { display: block; margin-top: 2mm; font-size: 12px; }
  .feuille.at .at-legende span { display: block; margin: 1mm 0; }
  .feuille.at .at-legende i { display: inline-block; width: 9mm; height: 4mm; vertical-align: -0.8mm; margin-right: 2mm; }
  .feuille.at .at-surligne { background: #fff176; }
  .feuille.at .at-encadre { border: 1.6px solid #1c2233; }
  .feuille.at .at-souligne { border-bottom: 2px solid #1c2233; height: 3mm !important; }
  .feuille.at .at-entoure { border: 1.6px solid #1c2233; border-radius: 50%; }
  .feuille.at .at-bandeau { border: 2px solid #23527c; border-radius: 3mm; padding: 3mm 4mm; margin: 0 0 3.5mm; font-size: 15px; }
  .feuille.at .at-bandeau b { display: block; font-size: 12.5px; color: #23527c; margin-bottom: 1mm; }
  /* De la figure à l'équation. */
  .feuille.at .at-trois { display: flex; gap: 3mm; }
  .feuille.at .at-trois > div { flex: 1; min-width: 0; }
  .feuille.at .at-figure { height: 45mm; border: 1.2px dashed #9aa0b4; border-radius: 2mm; display: flex; align-items: center; justify-content: center; color: #8a91a5; font-size: 11px; }
  .feuille.at .at-decoupe { display: flex; align-items: center; gap: 3mm; margin: 2mm 0; }
  .feuille.at .at-boite { flex: 1; border: 1.5px solid #1c2233; border-radius: 2mm; padding: 6mm 2mm; text-align: center; font-size: 12px; }
  .feuille.at .at-repere-bloc { margin-top: 3mm; }
  /* La prise de parole. */
  .feuille.at .at-enchainements { display: block; }
  .feuille.at .at-enchainement { margin: 0 0 1.5mm; font-size: 14px; }
  .feuille.at .at-enchainement i { color: #4a5268; }
  .feuille.at .at-enchainement .at-ligne { height: 7mm; }
  .feuille.at .at-cartes { display: grid; grid-template-columns: repeat(6, 1fr); gap: 0; }
  .feuille.at .at-carte { border: 1px dashed #9aa0b4; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 1.5mm; padding: 2.5mm; height: 34mm; text-align: center; font-weight: 700; font-size: 14px; }
  .feuille.at .at-carte .at-picto { width: 20mm; height: 20mm; }
  .feuille.at .at-de-patron { text-align: center; }
  .at-reference-carte { text-align: right; }
  .feuille.at-apres-carte { break-before: page; page-break-before: always; }
`;
