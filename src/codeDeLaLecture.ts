// ── Le code de la lecture à voix haute : les signes et leurs couleurs ───────
//
// Comme le code de la phrase pour la grammaire (voir codeDeLaPhrase.ts) :
// l'élève qui prépare sa lecture code les liaisons, les pauses, l'intonation,
// les groupes de souffle, et il doit retrouver les mêmes signes d'une feuille
// à l'autre. L'enseignant choisit les siens une fois, dans Aides à la tâche ;
// la carte du code et les feuilles « Lire à voix haute » les reprennent.
//
// Les livrets de français CP (2025) et CE1 (2026), Éduscol, focus « Fluence
// et lecture à voix haute de phrases et de textes (prosodie : phrasé et
// expressivité) », demandent qu'on code pour penser à faire la liaison, et
// font travailler, dans cet ordre, les liaisons, la ponctuation et
// l'intonation, la phrase écrite sur plusieurs lignes, les groupes de
// souffle. Ils ne fixent ni signe ni couleur : le code proposé reprend les
// signes de nos feuilles — l'arc de la liaison, une barre pour la petite
// pause, deux pour l'arrêt, la flèche de l'intonation.
//
// La couleur n'est jamais seule : chaque signe a sa forme, qui se lit
// photocopiée en noir et blanc. Les signes portent leur style en ligne :
// l'aperçu, l'impression, le PDF et les tablettes les montrent pareil.

import { escapeHtml } from "./print";
import { COULEURS } from "./codeDeLaPhrase";

export type IdSigne = "liaison" | "pauseCourte" | "pauseLongue" | "tonDescend" | "tonMonte" | "exclamation" | "groupeSouffle" | "suite";

export interface Signe {
  id: IdSigne;
  /** Sur la carte : « La liaison ». */
  libelle: string;
  /** Ce que fait la voix : « Je lie les deux mots. » */
  voix: string;
  /** Les formes qu'on peut lui donner : un caractère, ou, pour le groupe de souffle, une façon de le marquer. */
  formes: { id: string; nom: string }[];
  /** Un exemple court, en balises : ‿ / // ↗ ↘ ! [groupe] ↪. */
  exemple: string;
  defaut: { couleur: string; forme: string };
}

export const SIGNES: Signe[] = [
  { id: "liaison", libelle: "La liaison", voix: "Je lie les deux mots : la consonne de la fin se lit avec la voyelle du mot suivant.",
    formes: [{ id: "‿", nom: "un arc sous les mots ‿" }, { id: "⁀", nom: "un arc au-dessus ⁀" }, { id: "_", nom: "un trait _" }],
    exemple: "les‿enfants", defaut: { couleur: "rouge", forme: "‿" } },
  { id: "pauseCourte", libelle: "La petite pause", voix: "Je fais une petite pause.",
    formes: [{ id: "/", nom: "une barre /" }, { id: "|", nom: "un trait |" }, { id: "•", nom: "un point •" }],
    exemple: "Ce matin,/ il pleut.", defaut: { couleur: "bleu", forme: "/" } },
  { id: "pauseLongue", libelle: "L'arrêt", voix: "Je m'arrête et je respire.",
    formes: [{ id: "//", nom: "deux barres //" }, { id: "||", nom: "deux traits ||" }, { id: "■", nom: "un carré ■" }],
    exemple: "Il pleut.//", defaut: { couleur: "bleu", forme: "//" } },
  { id: "tonDescend", libelle: "La voix descend", voix: "Ma voix descend : la phrase est finie.",
    formes: [{ id: "↘", nom: "une flèche qui descend ↘" }, { id: "⤵", nom: "une flèche courbe ⤵" }, { id: "▼", nom: "un triangle ▼" }],
    exemple: "Il fait beau.↘", defaut: { couleur: "rouge", forme: "↘" } },
  { id: "tonMonte", libelle: "La voix monte", voix: "Ma voix monte : c'est une question.",
    formes: [{ id: "↗", nom: "une flèche qui monte ↗" }, { id: "⤴", nom: "une flèche courbe ⤴" }, { id: "▲", nom: "un triangle ▲" }],
    exemple: "Où vas-tu ?↗", defaut: { couleur: "rouge", forme: "↗" } },
  { id: "exclamation", libelle: "Le ton", voix: "Je mets le ton : la surprise, la joie, la colère, la peur.",
    formes: [{ id: "!", nom: "un point d'exclamation !" }, { id: "‼", nom: "deux points d'exclamation ‼" }],
    exemple: "Quel beau temps !!", defaut: { couleur: "rouge", forme: "!" } },
  { id: "groupeSouffle", libelle: "Le groupe de souffle", voix: "Je lis le groupe d'un seul souffle, sans m'arrêter au milieu.",
    formes: [{ id: "arc", nom: "un arc sous le groupe" }, { id: "souligne", nom: "souligné" }, { id: "crochets", nom: "entre crochets [ ]" }, { id: "entoure", nom: "entouré" }],
    exemple: "[Le petit chat] [boit son lait].", defaut: { couleur: "bleu", forme: "arc" } },
  { id: "suite", libelle: "La phrase continue", voix: "La phrase continue à la ligne : je ne m'arrête pas.",
    formes: [{ id: "↪", nom: "une flèche ↪" }, { id: "→", nom: "une flèche →" }, { id: "…", nom: "des points …" }],
    exemple: "Le loup entre↪", defaut: { couleur: "rouge", forme: "↪" } },
];

export const signeDe = (id: IdSigne) => SIGNES.find((s) => s.id === id)!;

export type CodeDeLaLecture = Record<IdSigne, { couleur: string; forme: string }>;

export const CODE_LECTURE_PAR_DEFAUT: CodeDeLaLecture = Object.fromEntries(SIGNES.map((s) => [s.id, s.defaut])) as CodeDeLaLecture;

/** La clé du réglage, sous « fabriquer: » comme ceux des ateliers (voir useReglages). */
export const CLE_CODE_LECTURE = "codeLecture";

const couleurDe = (id: string) => COULEURS.find((c) => c.id === id) ?? COULEURS[COULEURS.length - 1];

/** Le code enregistré, réparé : ce qui manque ou ne se connaît pas reprend le code proposé. */
export function lireCodeLecture(brut: unknown): CodeDeLaLecture {
  const o = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;
  const code = {} as CodeDeLaLecture;
  for (const s of SIGNES) {
    const x = (o[s.id] && typeof o[s.id] === "object" ? o[s.id] : {}) as Record<string, unknown>;
    code[s.id] = {
      couleur: COULEURS.some((k) => k.id === x.couleur) ? String(x.couleur) : s.defaut.couleur,
      forme: s.formes.some((f) => f.id === x.forme) ? String(x.forme) : s.defaut.forme,
    };
  }
  return code;
}

/** Le code de cet ordinateur, tel que l'atelier l'a gardé ; le code proposé s'il n'y en a pas. */
export function codeLectureActuel(): CodeDeLaLecture {
  try {
    const brut = localStorage.getItem(`fabriquer:${CLE_CODE_LECTURE}`);
    return lireCodeLecture(brut ? JSON.parse(brut) : undefined);
  } catch {
    return CODE_LECTURE_PAR_DEFAUT;
  }
}

/** La couleur d'un signe, pour l'écran et les styles en ligne. */
export const hexDuSigne = (code: CodeDeLaLecture, id: IdSigne) => couleurDe(code[id].couleur).hex;

/** Le signe, en ligne : sa forme, à sa couleur. La classe garde son espacement dans la feuille. */
export function signe(code: CodeDeLaLecture, id: Exclude<IdSigne, "groupeSouffle">, classe = ""): string {
  return `<span class="${classe || `cl-${id}`}" style="color:${hexDuSigne(code, id)};font-weight:800">${escapeHtml(code[id].forme)}</span>`;
}

/** Un groupe de souffle, marqué selon le code : le texte est à échapper, ou déjà en HTML. */
export function groupeMarque(code: CodeDeLaLecture, texte: string, dejaEchappe = false): string {
  const hex = hexDuSigne(code, "groupeSouffle");
  const t = dejaEchappe ? texte : escapeHtml(texte);
  switch (code.groupeSouffle.forme) {
    case "souligne": return `<span class="vh-groupe" style="border-bottom:2.5px solid ${hex};padding:0 2px 2px">${t}</span>`;
    case "crochets": return `<span class="vh-groupe"><b style="color:${hex}">[</b>${t}<b style="color:${hex}">]</b></span>`;
    case "entoure": return `<span class="vh-groupe" style="border:2px solid ${hex};border-radius:12px;padding:0 4px">${t}</span>`;
    default: return `<span class="vh-groupe" style="border-bottom:2.5px solid ${hex};border-radius:0 0 14px 14px;padding:0 2px 3px">${t}</span>`;
  }
}

/** « en bleu », pour une consigne ; rien pour le noir. */
export function enCouleur(code: CodeDeLaLecture, id: IdSigne): string {
  const couleur = couleurDe(code[id].couleur);
  return couleur.id === "noir" ? "" : ` en ${couleur.nom}`;
}

/** Comment la consigne nomme le signe : « une barre / en bleu », « un arc sous les mots ‿ en rouge ». */
export function nomDuSigne(code: CodeDeLaLecture, id: IdSigne): string {
  const s = signeDe(id);
  const forme = s.formes.find((f) => f.id === code[id].forme)?.nom ?? code[id].forme;
  return `${forme}${enCouleur(code, id)}`;
}

/**
 * Un exemple codé : ses balises — ‿ pour la liaison, / et // pour les
 * pauses, ↘ ↗ ! pour l'intonation, [ ] pour un groupe, ↪ pour la suite —
 * dessinées selon le code.
 */
export function exempleCode(code: CodeDeLaLecture, exemple: string): string {
  const morceaux = exemple.split(/(\[[^\]]+\]|‿|\/\/|\/|↘|↗|↪|!!)/).filter((x) => x !== "");
  return morceaux.map((m) => {
    if (m.startsWith("[")) return groupeMarque(code, exempleCode(code, m.slice(1, -1)), true);
    if (m === "‿") return signe(code, "liaison");
    if (m === "//") return signe(code, "pauseLongue");
    if (m === "/") return signe(code, "pauseCourte");
    if (m === "↘") return signe(code, "tonDescend");
    if (m === "↗") return signe(code, "tonMonte");
    if (m === "↪") return signe(code, "suite");
    if (m === "!!") return `!${signe(code, "exclamation")}`;
    return escapeHtml(m);
  }).join("");
}

// ── La carte du code ──────────────────────────────────────────────────────

export type FormatCarteLecture = "cartes" | "bandeau" | "affiche";

export const FORMATS_CARTE_LECTURE: { id: FormatCarteLecture; nom: string; quoi: string }[] = [
  { id: "cartes", nom: "Les cartes", quoi: "une par élève, à garder dans le cahier ou la trousse : deux par page" },
  { id: "bandeau", nom: "Le bandeau de la table", quoi: "des bandes à coller sur la table : deux par page" },
  { id: "affiche", nom: "L'affiche", quoi: "une page entière, pour le mur de la classe" },
];

export interface ReglagesCarteLecture {
  format: FormatCarteLecture;
  /** Ce que fait la voix, sous chaque signe. */
  voix: boolean;
  /** Les signes qu'on laisse hors de la carte. */
  caches: IdSigne[];
}

export const REGLAGES_CARTE_LECTURE: ReglagesCarteLecture = { format: "cartes", voix: true, caches: [] };

export function reglagesCarteLectureSurs(brut: Partial<ReglagesCarteLecture>): ReglagesCarteLecture {
  return {
    format: FORMATS_CARTE_LECTURE.some((f) => f.id === brut.format) ? brut.format! : "cartes",
    voix: brut.voix !== false,
    caches: Array.isArray(brut.caches) ? brut.caches.filter((id): id is IdSigne => SIGNES.some((s) => s.id === id)) : [],
  };
}

/** Les phrases d'exemple de la carte, tout codées : une affirmation, une question. */
export const EXEMPLES_DE_LA_CARTE = ["[Ce matin,/] [les‿enfants] [jouent dans la cour.//↘]", "[Où est] [mon‿ours ?//↗]"];

function carte(code: CodeDeLaLecture, r: ReglagesCarteLecture): string {
  const lignes = SIGNES.filter((s) => !r.caches.includes(s.id)).map((s) => `<div class="cl-ligne"><div class="cl-tete">`
    + `<span class="cl-echantillon">${s.id === "groupeSouffle" ? groupeMarque(code, "le groupe") : signe(code, s.id, "cl-signe")}</span>`
    + `<b>${escapeHtml(s.libelle)}</b></div>`
    + `<div class="cl-exemple">${exempleCode(code, s.exemple)}</div>${r.voix ? `<div class="cl-voix">${escapeHtml(s.voix)}</div>` : ""}</div>`).join("");
  return `<div class="cl-carte"><div class="cl-titre">Le code pour lire à voix haute</div>`
    + `<div class="cl-phrase">${EXEMPLES_DE_LA_CARTE.map((e) => exempleCode(code, e)).join("<br>")}</div><div class="cl-lignes">${lignes}</div></div>`;
}

/** La carte du code, au format choisi : la feuille à imprimer. */
export function htmlCodeDeLaLecture(code: CodeDeLaLecture, r: ReglagesCarteLecture): string {
  const n = r.format === "affiche" ? 1 : 2;
  return `<div class="feuille cl cl-${r.format}"><div class="page"><div class="cl-planche">${Array.from({ length: n }, () => carte(code, r)).join("")}</div></div></div>`;
}

export const STYLE_CODE_LECTURE = `
  .feuille.cl .cl-planche { display: grid; gap: 0; grid-template-columns: 1fr; }
  .feuille.cl .cl-carte { border: 1px dashed #9aa0b4; padding: 5mm 6mm; display: flex; flex-direction: column; gap: 3mm; box-sizing: border-box; overflow: hidden; }
  .feuille.cl .cl-titre { font-weight: 800; color: #1c2233; }
  .feuille.cl .cl-phrase { line-height: 2.3; }
  .feuille.cl .cl-lignes { display: grid; grid-template-columns: 1fr 1fr; gap: 2.5mm 6mm; }
  .feuille.cl .cl-ligne { break-inside: avoid; }
  .feuille.cl .cl-tete { display: flex; align-items: baseline; gap: 2.5mm; }
  .feuille.cl .cl-echantillon { min-width: 9mm; text-align: center; }
  .feuille.cl .cl-exemple { line-height: 2; }
  .feuille.cl .cl-voix { color: #4a5168; line-height: 1.35; }
  .feuille.cl .vh-groupe { margin-right: 1mm; }
  /* Deux cartes par page, ou deux bandeaux : la moitié de la page chacun. */
  .feuille.cl-cartes .cl-planche, .feuille.cl-bandeau .cl-planche { grid-auto-rows: 124mm; }
  .feuille.cl-cartes .cl-titre, .feuille.cl-bandeau .cl-titre { font-size: 16px; }
  .feuille.cl-cartes .cl-phrase, .feuille.cl-bandeau .cl-phrase { font-size: 16px; }
  .feuille.cl-cartes .cl-tete, .feuille.cl-bandeau .cl-tete { font-size: 13px; }
  .feuille.cl-cartes .cl-signe, .feuille.cl-bandeau .cl-signe { font-size: 18px; }
  .feuille.cl-cartes .cl-exemple, .feuille.cl-bandeau .cl-exemple { font-size: 13px; }
  .feuille.cl-cartes .cl-voix, .feuille.cl-bandeau .cl-voix { font-size: 11px; }
  .feuille.cl-bandeau .cl-lignes { grid-template-columns: repeat(4, 1fr); }
  .feuille.cl-bandeau .cl-carte { padding: 4mm 5mm; }
  /* L'affiche : la page entière. */
  .feuille.cl-affiche .cl-planche { grid-auto-rows: 250mm; }
  .feuille.cl-affiche .cl-carte { border: none; padding: 2mm; gap: 7mm; }
  .feuille.cl-affiche .cl-titre { font-size: 28px; }
  .feuille.cl-affiche .cl-phrase { font-size: 24px; line-height: 2.1; }
  .feuille.cl-affiche .cl-lignes { gap: 6mm 10mm; }
  .feuille.cl-affiche .cl-tete { font-size: 17px; }
  .feuille.cl-affiche .cl-signe { font-size: 26px; }
  .feuille.cl-affiche .cl-exemple { font-size: 18px; }
  .feuille.cl-affiche .cl-voix { font-size: 13px; }
`;
