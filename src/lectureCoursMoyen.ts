// Lire avec fluidité, lire à voix haute avec expressivité : le cours moyen.
//
// Programme de français du cycle 3 (2025) : au CM1, « lire sans effort un
// texte d'une page silencieusement ou à voix haute », « mémoriser de plus en
// plus de mots fréquents et irréguliers », « lire correctement en ciblant
// 110 mots par minute en moyenne » ; au CM2, un texte long, les liaisons et
// les unités syntaxiques, 120 mots par minute. Lire à voix haute avec
// expressivité : la ponctuation et les groupes de sens, l'intensité de la
// voix — le volume, le débit — ; au CM2, l'articulation du texte, la mise en
// voix — l'intonation, les effets. Exemples de réussite : ne pas buter, lors
// de la prestation, sur les mots travaillés pendant la préparation ; lire
// sans hésiter « second, monsieur, oignon, œufs, femme, chœur » ; marquer
// par l'intonation les points d'exclamation et d'interrogation, les pauses
// et les liaisons ; faire entendre le récit et le dialogue ; au CM2, faire
// ressortir les mots importants, s'enregistrer et s'écouter.
//
// Les textes sont ceux de « Comprendre un texte » au cours moyen (voir
// textesCoursMoyen.ts) ; les signes de la partition, ceux du code de la
// lecture de la classe (voir codeDeLaLecture.ts).

import { escapeHtml } from "./print";
import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";
import { codeLectureActuel, signe, type CodeDeLaLecture } from "./codeDeLaLecture";
import { lignesNumerotees, textesDeLaClasse, texteDe, type TexteAComprendre } from "./textesDeComprehension";

export type ExerciceLectureCM = "chronometre" | "irreguliers" | "partition" | "grille";

export const EXERCICES_LECTURE_CM: { id: ExerciceLectureCM; libelle: string }[] = [
  { id: "chronometre", libelle: "Le texte chronométré : les mots lus en une minute" },
  { id: "irreguliers", libelle: "Les mots irréguliers, lus sans hésiter" },
  { id: "partition", libelle: "Préparer sa lecture : le texte partition" },
  { id: "grille", libelle: "La grille d'écoute de la lecture à voix haute" },
];

export interface ReglagesLectureCM { classe: "CM1" | "CM2"; exercice: ExerciceLectureCM; texte: string; titre?: string }
export const REGLAGES_LECTURE_CM: ReglagesLectureCM = { classe: "CM1", exercice: "chronometre", texte: "" };

/** Les mots lus correctement en une minute que vise le programme. */
export const OBJECTIF_MCLM: Record<"CM1" | "CM2", number> = { CM1: 110, CM2: 120 };

const TETE = '<div class="sous">Prénom : ........................................ Date : ........................</div>';
const titre = (t: string) => `<div class="titre">${escapeHtml(t)}</div>`;
const regle = (t: string) => `<div class="regle">${t}</div>`;
const SOURCE = '<span class="reference">Programme de français du cycle 3, 2025.</span>';

/** Les mots d'une ligne : « l'école », « peut-être », « Saint-Aubin » comptent pour un ; la ponctuation, pour rien. */
export const motsDeLaLigne = (ligne: string) => (ligne.match(/[\p{L}\d]+(?:['’-][\p{L}\d]+)*/gu) ?? []).length;

/** Le texte choisi, ou un récit, une scène ou un documentaire de la classe, tiré au sort ; la partition préfère ceux qui ont des voix. */
function texteDeLaFeuille(r: ReglagesLectureCM, graine: number, convient: (t: TexteAComprendre) => boolean): TexteAComprendre {
  const choisi = r.texte ? texteDe(r.texte) : undefined;
  if (choisi) return choisi;
  const candidats = textesDeLaClasse(r.classe).filter(convient);
  return candidats[Math.floor(hasard(graine)() * candidats.length)];
}

/**
 * Le texte chronométré : le nombre de mots cumulé au bout de chaque ligne,
 * pour compter vite ceux qu'on a lus en une minute ; le tableau des trois
 * lectures, et l'objectif du programme.
 */
function feuilleChronometre(r: ReglagesLectureCM, graine: number): string {
  const t = texteDeLaFeuille(r, graine, (x) => x.type === "narratif" || x.type === "informatif");
  let cumul = 0;
  const lignes = lignesNumerotees(t).map(({ n, texte }) => {
    if (n === null) return '<tr class="lc-blanc"><td></td><td></td></tr>';
    cumul += motsDeLaLigne(texte);
    return `<tr><td class="lc-texte">${escapeHtml(texte)}</td><td class="lc-compte">${cumul}</td></tr>`;
  }).join("");
  const objectif = OBJECTIF_MCLM[r.classe];
  const lectures = [1, 2, 3].map((k) => `<tr><td class="lc-centre"><b>${k}</b></td><td></td><td></td><td></td><td></td></tr>`).join("");
  return `<div class="page">${titre(`${t.titre} — je lis en une minute`)}${TETE}
    ${regle(`Le jour de la mesure, je lis le texte à voix haute pendant une minute ; mon binôme suit sur sa feuille, entoure chaque mot sur lequel je me trompe et met un trait là où je m'arrête. Le nombre au bout de la ligne donne les mots lus. Les mots lus moins les erreurs : les mots correctement lus. Entre deux mesures, je relis le même texte. ${SOURCE}`)}
    <table class="lc-chrono">${lignes}</table>
    <div class="lc-total">Le texte compte ${cumul} mots. Mon objectif : ${objectif} mots correctement lus en une minute, en moyenne, au ${r.classe}.</div>
    <table class="lc-tableau"><tr><th>Lecture</th><th>Date</th><th>Mots lus en 1 minute</th><th>Erreurs</th><th>Mots correctement lus</th></tr>${lectures}</table></div>`;
}

/** Des mots fréquents qui ne se lisent pas comme ils s'écrivent — les premiers sont ceux des exemples de réussite du CM1. */
export const MOTS_IRREGULIERS = [
  "second", "monsieur", "oignon", "œufs", "femme", "chœur", "seconde", "messieurs", "bœufs", "orchestre", "chorale", "écho",
  "album", "aquarium", "automne", "sept", "compter", "baptême", "fusil", "gentil", "examen", "ville", "tranquille", "fils",
];

function feuilleIrreguliers(r: ReglagesLectureCM, graine: number): string {
  const mots = r.classe === "CM1" ? [...MOTS_IRREGULIERS.slice(0, 6), ...melanger(hasard(graine), MOTS_IRREGULIERS.slice(6)).slice(0, 14)] : melanger(hasard(graine), MOTS_IRREGULIERS).slice(0, 20);
  const ordre = melanger(hasard(graine + 1), mots);
  const grille = Array.from({ length: 5 }, (_, i) => `<tr>${ordre.slice(i * 4, i * 4 + 4).map((m) => `<td>${escapeHtml(m)}</td>`).join("")}</tr>`).join("");
  const lectures = [1, 2, 3].map((k) => `<tr><td class="lc-centre"><b>${k}</b></td><td></td><td></td><td></td></tr>`).join("");
  return `<div class="page">${titre("Les mots irréguliers")}${TETE}
    ${regle(`Ces mots ne se lisent pas comme ils s'écrivent : je les lis plusieurs fois, ligne par ligne, puis dans le désordre. Mon binôme chronomètre et note les mots sur lesquels j'hésite. ${SOURCE}`)}
    <table class="lc-mots">${grille}</table>
    <table class="lc-tableau"><tr><th>Lecture</th><th>Date</th><th>Temps</th><th>Mots sur lesquels j'ai hésité</th></tr>${lectures}</table></div>`;
}

/**
 * Le texte partition : le texte à préparer, une marge pour les indications
 * de lecture — plus fort, plus vite, une pause, une voix qui change —, les
 * signes du code de la classe. Une scène de théâtre, ou un récit avec du
 * dialogue : on y fait entendre le récit et les voix.
 */
function feuillePartition(r: ReglagesLectureCM, graine: number, code: CodeDeLaLecture): string {
  const t = texteDeLaFeuille(r, graine, (x) => x.type === "théâtral" || x.type === "narratif");
  const vers = lignesNumerotees(t).map(({ n, texte }) => (n === null ? '<tr class="lc-blanc"><td></td><td></td></tr>'
    : `<tr><td class="lc-vers">${escapeHtml(texte)}</td><td class="lc-marge"></td></tr>`)).join("");
  const legende = `${signe(code, "liaison")} la liaison · ${signe(code, "pauseCourte")} une petite pause · ${signe(code, "pauseLongue")} je m'arrête · ${signe(code, "tonMonte")} la voix monte · ${signe(code, "tonDescend")} la voix descend · ${signe(code, "exclamation")} je mets le ton`;
  const cm2 = r.classe === "CM2";
  return `<div class="page">${titre(`${t.titre} — je prépare ma lecture`)}${TETE}
    ${regle(`Je lis le texte en silence, deux fois. Je code les liaisons, les pauses et l'intonation. Dans la marge, j'écris comment lire : plus fort, plus doucement, plus vite, la voix de chaque personnage${cm2 ? ", les mots à faire ressortir" : ""}. Je m'entraîne à voix haute${cm2 ? ", je m'enregistre et je m'écoute" : ""}, puis je lis devant mon public. ${SOURCE}`)}
    <div class="lc-legende">${legende}</div>
    <table class="lc-partition"><tr><th>Le texte</th><th>Mes indications</th></tr>${vers}</table>
    ${t.source ? `<div class="lc-source">${escapeHtml(t.source)}</div>` : ""}</div>`;
}

/** Les critères de la grille, d'après les objectifs et les exemples de réussite de chaque classe. */
export const CRITERES_CM: Record<"CM1" | "CM2", string[]> = {
  CM1: ["Je ne bute pas sur les mots préparés.", "Je respecte la ponctuation et les groupes de sens.", "Je fais les liaisons.", "Ma voix monte à la question et marque l'exclamation.",
    "Ma voix est assez forte ; je ne lis pas trop vite.", "On entend le récit et les dialogues.", "Je regarde mon public."],
  CM2: ["Je lis sans hésiter, en faisant les liaisons.", "Je respecte les groupes de sens et l'articulation du texte : les paragraphes, les changements de moment.",
    "Mon intonation suit les effets du texte : la peur, la colère, l'humour.", "Je fais ressortir les mots importants.", "Je change de voix pour chaque personnage.",
    "Je règle mon volume et mon débit pour être compris.", "Je fais vivre le texte : mon public a envie d'écouter."],
};

function feuilleGrille(r: ReglagesLectureCM): string {
  const lignes = CRITERES_CM[r.classe].map((c) => `<tr><td class="lc-critere">${escapeHtml(c)}</td>${[1, 2, 3].map(() => '<td><span class="lc-case"></span> oui &nbsp; <span class="lc-case"></span> pas encore</td>').join("")}</tr>`).join("");
  return `<div class="page">${titre("Lire à voix haute — la grille d'écoute")}
    <div class="sous">Le lecteur : ........................................ L'auditeur : ........................................ Date : ..................</div>
    ${regle(`Je lis ou j'écoute lire${r.classe === "CM2" ? " — ou j'écoute mon enregistrement" : ""} ; puis nous nous mettons d'accord, mon binôme et moi, critère par critère. Nous échangeons les rôles. ${SOURCE}`)}
    <table class="lc-grille"><tr><th>Ce qu'on écoute</th><th>1re lecture</th><th>2e lecture</th><th>3e lecture</th></tr>${lignes}</table>
    <div class="lc-conseil">Mon conseil pour la prochaine lecture : ........................................................................................................</div></div>`;
}

export function htmlLectureCM(r: ReglagesLectureCM, graine: number, code: CodeDeLaLecture = codeLectureActuel()): string {
  const corps = r.exercice === "chronometre" ? feuilleChronometre(r, graine)
    : r.exercice === "irreguliers" ? feuilleIrreguliers(r, graine)
      : r.exercice === "partition" ? feuillePartition(r, graine, code)
        : feuilleGrille(r);
  return feuille(corps, "lc");
}


export const STYLE_LECTURE_CM = `
  .feuille.lc .lc-chrono { width: 100%; border-collapse: collapse; margin: 2mm 0 3mm; }
  .feuille.lc .lc-chrono td { padding: 0; border: none; vertical-align: baseline; }
  .feuille.lc .lc-texte { font-size: 14.5px; line-height: 1.75; }
  .feuille.lc .lc-compte { width: 12mm; text-align: right; font-size: 11px; color: #687087; font-variant-numeric: tabular-nums; }
  .feuille.lc .lc-blanc td { height: 2.5mm; }
  .feuille.lc .lc-total { font-size: 13px; margin: 0 0 3mm; font-weight: 600; }
  .feuille.lc .lc-tableau { width: 100%; border-collapse: collapse; font-size: 13px; }
  .feuille.lc .lc-tableau th, .feuille.lc .lc-tableau td { border: 1px solid #1c2233; padding: 2mm; height: 9mm; text-align: left; }
  .feuille.lc .lc-tableau th { font-size: 11.5px; background: #f7f8fc; }
  .feuille.lc .lc-centre { text-align: center !important; width: 16mm; }
  .feuille.lc .lc-mots { width: 100%; border-collapse: collapse; margin: 3mm 0 6mm; }
  .feuille.lc .lc-mots td { border: 1px solid #c4c9d6; padding: 3mm 2mm; text-align: center; font-size: 19px; width: 25%; }
  .feuille.lc .lc-legende { font-size: 12.5px; margin: 0 0 3mm; line-height: 1.8; }
  .feuille.lc .lc-partition { width: 100%; border-collapse: collapse; }
  .feuille.lc .lc-partition th { font-size: 11.5px; color: #687087; text-align: left; padding-bottom: 1.5mm; }
  .feuille.lc .lc-vers { font-size: 13.5px; line-height: 2; padding-right: 3mm; border-bottom: 1px dotted #c4c9d6; }
  .feuille.lc .lc-marge { width: 38mm; border-bottom: 1px dotted #c4c9d6; border-left: 1px solid #c4c9d6; }
  .feuille.lc .lc-source { font-size: 11px; color: #687087; text-align: right; margin-top: 2mm; font-style: italic; }
  .feuille.lc .lc-grille { width: 100%; border-collapse: collapse; font-size: 13px; }
  .feuille.lc .lc-grille th, .feuille.lc .lc-grille td { border: 1px solid #1c2233; padding: 2.5mm 2mm; text-align: left; }
  .feuille.lc .lc-grille th { font-size: 11.5px; background: #f7f8fc; }
  .feuille.lc .lc-critere { width: 44%; font-weight: 600; }
  .feuille.lc .lc-case { display: inline-block; width: 4mm; height: 4mm; border: 1.5px solid #1c2233; border-radius: 1mm; vertical-align: -0.8mm; }
  .feuille.lc .lc-conseil { margin-top: 6mm; font-size: 13px; }
`;
