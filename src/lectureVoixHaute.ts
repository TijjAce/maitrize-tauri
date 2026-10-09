// Lire à voix haute : des phrases à préparer, codées ou à coder, et la grille du binôme.
//
// Livrets Français CP (2025) et CE1 (2026), Éduscol, focus « Fluence et lecture
// à voix haute de phrases et de textes (prosodie : phrasé et expressivité) » :
// « Pour bien marquer les liaisons, je dois repérer les mots se terminant par
// une consonne qui sont suivis de mots commençant par une voyelle. Je peux
// utiliser un codage pour penser à faire la liaison » ; une progression du
// phrasé — les liaisons, articuler, la ponctuation, l'intonation, la phrase
// écrite sur plusieurs lignes, les groupes de souffle, puis des textes ; en
// binôme, un lecteur et un auditeur qui s'accordent sur des critères — « on
// entend les espaces », « on entend le retour à la ligne », « les liaisons
// sont réalisées » —, de plus en plus élaborés jusqu'au ton des dialogues
// en fin de CE2. Les phrases s'écrivent une par ligne ; une barre « | »
// sépare les groupes de souffle.

import { escapeHtml } from "./print";
import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";

export type Classe = "CP" | "CE1" | "CE2";
export type ExerciceVoixHaute = "liaisons" | "ponctuation" | "lignes" | "souffle" | "grille" | "fable";

export const EXERCICES_VOIX_HAUTE: { id: ExerciceVoixHaute; libelle: string }[] = [
  { id: "liaisons", libelle: "Les liaisons" },
  { id: "ponctuation", libelle: "La ponctuation et l'intonation" },
  { id: "lignes", libelle: "La phrase sur plusieurs lignes" },
  { id: "souffle", libelle: "Les groupes de souffle" },
  { id: "grille", libelle: "La grille d'écoute du binôme" },
  { id: "fable", libelle: "La fable à plusieurs voix (CE2)" },
];

export interface ReglagesVoixHaute {
  exercice: ExerciceVoixHaute;
  classe: Classe;
  /** Les phrases, une par ligne ; « | » entre les groupes de souffle. Vide : celles de la classe. */
  phrases: string;
  /** Les phrases déjà codées, à lire ; sinon, l'élève les code. */
  codees: boolean;
  combien: number;
}

export const REGLAGES_VOIX_HAUTE: ReglagesVoixHaute = { exercice: "liaisons", classe: "CP", phrases: "", codees: true, combien: 6 };

/** Des phrases de chaque classe, découpées en groupes de souffle ; les deux premières, celles des livrets. */
export const PHRASES_DE_LA_CLASSE: Record<Classe, string[]> = {
  CP: [
    "Les endives | sont amères.",
    "Le petit éléphant | a un gros appétit.",
    "Les enfants | jouent dans la cour.",
    "Mon ami Léo | a deux ans de plus | que moi.",
    "Ce matin, | les oiseaux | chantent dans les arbres.",
    "Nous avons vu | un âne | et trois oies.",
    "Papa lit | une histoire | à mon petit frère.",
    "Mes amis | ont un grand jardin.",
    "Où est | mon ours en peluche ?",
    "Quel beau temps !",
    "Le loup | entre dans la maison | des trois petits cochons.",
    "Les élèves | écoutent | la maîtresse.",
  ],
  CE1: [
    "Le petit éléphant | a un gros appétit.",
    "Ce soir, | nos invités | arrivent à huit heures.",
    "Les élèves de la classe | préparent un spectacle | pour la fête de l'école.",
    "Quand il pleut, | les escargots | sortent de leur cachette.",
    "Mon grand-père | a planté des arbres fruitiers | dans son jardin.",
    "Est-ce que tu as vu | mon cartable bleu ?",
    "Les petits enfants | écoutent une histoire | très amusante.",
    "Au bord de la mer, | nous avons ramassé | des coquillages.",
    "Comme il fait beau ! | Allons nous promener | dans les bois.",
    "Le vieux pêcheur | a attrapé | un énorme poisson.",
    "Pendant les vacances, | mes cousins | sont allés à la montagne.",
    "Les hirondelles | reviennent | au printemps.",
  ],
  CE2: [
    "« Où vas-tu si vite ? » | demanda le lapin | à la tortue.",
    "« Attention ! » | cria la maîtresse, | « la route est glissante ! »",
    "Le renard s'approcha doucement | et murmura : | « Bonjour, mon ami. »",
    "Quand ils ont entendu le tonnerre, | les enfants | sont rentrés en courant.",
    "« Je suis très en colère ! » | grogna l'ogre | en frappant la table.",
    "Dans un grand éclat de rire, | les deux amis | se sont embrassés.",
    "« Chut ! » | chuchota Léa, | « le bébé dort. »",
    "Les éléphants | avancent lentement | vers la rivière.",
    "« Tu es en retard ! » | s'étonna son père. | « Où étais-tu ? »",
    "Avec ses énormes oreilles, | le petit âne | entendait tout.",
  ],
};

/** Les mots après lesquels la liaison se fait : déterminants, pronoms, adjectifs placés avant le nom, quelques mots-outils. */
const AVANT_LIAISON = new Set([
  "les", "des", "mes", "tes", "ses", "ces", "nos", "vos", "leurs", "aux", "mon", "ton", "son", "un", "deux", "trois", "six", "dix", "vingt", "cent",
  "on", "nous", "vous", "ils", "elles", "en", "dans", "chez", "sans", "sous", "très", "plus", "tout", "quand", "dont",
  "petit", "petits", "grand", "grands", "gros", "bon", "bons", "mauvais", "beaux", "bel", "vieux", "est", "sont",
]);
/** Les mots à « h » muet qu'on rencontre au cycle 2 : on fait la liaison devant eux. */
const H_MUETS = /^(homme|hommes|heure|heures|herbe|herbes|hiver|hivers|histoire|histoires|hôpital|habit|habits|habitant|habitants|habitude|huile|hirondelle|hirondelles|hôtel|hôtels|horloge|horloges|humain|humains)$/i;
const VOYELLE = /^[aàâäeéèêëiîïoôöuùûüyœæ]/i;
/** Devant ces mots, pas de liaison, même s'ils commencent par une voyelle. */
const SANS_LIAISON = /^(et|oui|onze|ouate)$/i;

const nu = (mot: string) => mot.toLowerCase().replace(/^[«"(]+|[»",.;:!?)]+$/g, "");

/** Y a-t-il une liaison entre ces deux mots ? */
export function liaison(avant: string, apres: string): boolean {
  if (/[,.;:!?»]$/.test(avant)) return false;
  const a = nu(avant), b = nu(apres);
  if (!AVANT_LIAISON.has(a) || SANS_LIAISON.test(b)) return false;
  return VOYELLE.test(b) || H_MUETS.test(b);
}

/** Les phrases saisies, ou celles de la classe ; « | » garde les groupes de souffle. */
export function phrasesDe(r: Pick<ReglagesVoixHaute, "phrases" | "classe" | "combien">, graine: number): string[] {
  const saisies = (r.phrases ?? "").split("\n").map((p) => p.trim()).filter(Boolean);
  if (saisies.length) return saisies.slice(0, 16);
  return melanger(hasard(graine), PHRASES_DE_LA_CLASSE[r.classe]).slice(0, Math.max(1, Math.min(12, r.combien)));
}

/** La phrase avec ses liaisons codées : « Les‿endives sont‿amères. » */
export function avecLiaisons(phrase: string, coder: boolean): string {
  const mots = phrase.replace(/\s*\|\s*/g, " ").split(/\s+/).filter(Boolean);
  return mots.map((m, i) => escapeHtml(m) + (i < mots.length - 1 ? (coder && liaison(m, mots[i + 1]) ? '<span class="vh-liaison">‿</span>' : " ") : "")).join("");
}

/** Les liaisons d'une phrase, pour le corrigé : « petit‿éléphant ». */
export const liaisonsDe = (phrase: string) => {
  const mots = phrase.replace(/\s*\|\s*/g, " ").split(/\s+/).filter(Boolean);
  return mots.slice(0, -1).map((m, i) => (liaison(m, mots[i + 1]) ? `${nu(m)}‿${nu(mots[i + 1])}` : "")).filter(Boolean);
};

/** La ponctuation qui se voit, et ce qu'elle fait faire à la voix : une pause, un arrêt, une montée. */
function avecPonctuation(phrase: string, coder: boolean): string {
  const texte = escapeHtml(phrase.replace(/\s*\|\s*/g, " "));
  if (!coder) return texte;
  return texte
    .replace(/,/g, ',<span class="vh-pause">/</span>')
    .replace(/([.!?])(\s|$|&raquo;|»)/g, (_m, p, apres) => `${p}<span class="vh-pause">//</span>${p === "?" ? '<span class="vh-ton">↗</span>' : p === "!" ? '<span class="vh-ton">!</span>' : '<span class="vh-ton">↘</span>'}${apres}`);
}

/** Les groupes de souffle : un arc sous chaque groupe ; sinon, la phrase entière, à découper. */
function avecSouffle(phrase: string, coder: boolean): string {
  const groupes = phrase.split("|").map((g) => g.trim()).filter(Boolean);
  if (!coder) return escapeHtml(groupes.join(" "));
  return groupes.map((g) => `<span class="vh-groupe">${escapeHtml(g)}</span>`).join(" ");
}

const CONSIGNES: Record<ExerciceVoixHaute, [string, string]> = {
  liaisons: ["Les liaisons sont codées : lis en les faisant entendre — la consonne finale se lit avec la voyelle du mot suivant.",
    "Repère les mots qui se terminent par une consonne et sont suivis d'un mot qui commence par une voyelle. Code la liaison avec un arc ‿, puis lis la phrase en la faisant entendre."],
  ponctuation: ["Une barre : une petite pause ; deux barres : on s'arrête. La flèche montre l'intonation : la voix descend au point, elle monte à la question.",
    "Entoure les signes de ponctuation. Mets une barre / après chaque virgule et deux barres // après chaque point. Lis en respectant les pauses et l'intonation."],
  lignes: ["La phrase continue sur la ligne suivante : ne t'arrête pas au bout de la ligne, la flèche ↪ te le rappelle.",
    "Ces phrases sont écrites sur plusieurs lignes. Lis-les sans t'arrêter au bout de la ligne : on ne s'arrête qu'au point."],
  souffle: ["Chaque arc montre un groupe de souffle : lis chaque groupe d'un seul souffle, sans t'arrêter au milieu.",
    "Découpe chaque phrase en groupes de mots qui vont ensemble : trace une barre entre les groupes. Lis chaque groupe d'un seul souffle."],
  grille: ["", ""],
  fable: ["", ""],
};

/** Les critères de la grille, de plus en plus élaborés du CP au CE2. */
export const CRITERES: Record<Classe, string[]> = {
  CP: ["Je ne m'arrête pas à chaque syllabe.", "On entend les espaces entre les mots.", "Je respecte les points et les virgules.", "Je fais les liaisons.", "Je ne m'arrête pas au retour à la ligne."],
  CE1: ["J'articule bien chaque mot.", "Je fais les liaisons.", "Ma voix suit la ponctuation : elle monte à la question, elle descend au point.", "Je ne m'arrête pas au retour à la ligne.", "Je lis par groupes de souffle."],
  CE2: ["Je lis par groupes de souffle.", "Ma voix suit la ponctuation.", "Mon ton correspond au texte : la colère, la peur, la joie.", "Dans les dialogues, je change de voix selon le personnage et les indications de l'auteur (chuchoter, crier…).", "Je mets en valeur les mots importants.", "Je regarde mon public."],
};

function feuilleGrille(r: ReglagesVoixHaute): string {
  const lignes = CRITERES[r.classe].map((c) => `<tr><td class="vh-critere">${escapeHtml(c)}</td>${[1, 2, 3].map(() => "<td><span class=\"vh-case\"></span> oui &nbsp; <span class=\"vh-case\"></span> pas encore</td>").join("")}</tr>`).join("");
  return `<div class="page"><div class="titre">Lire à voix haute — la grille du binôme</div>
    <div class="sous">Le lecteur : ........................................ L'auditeur : ........................................ Date : ..................</div>
    <div class="regle">Le lecteur lit, l'auditeur écoute, puis on se met d'accord, critère par critère. On échange les rôles. <span class="reference">Livrets Français CP et CE1, Éduscol.</span></div>
    <table class="vh-grille"><tr><th>Ce qu'on écoute</th><th>1re lecture</th><th>2e lecture</th><th>3e lecture</th></tr>${lignes}</table>
    <div class="vh-conseil">Mon conseil pour la prochaine lecture : ........................................................................................................</div></div>`;
}

/**
 * « La Grenouille qui se veut faire aussi grosse que le Bœuf » (Jean de La
 * Fontaine, Fables, livre I, 3), la fable du livret CE2, vers par vers, chaque
 * morceau à sa voix : le narrateur, la Grenouille, sa sœur, le fabuliste.
 */
export const FABLE: { voix: "N" | "G" | "S" | "F"; texte: string }[][] = [
  [{ voix: "N", texte: "Une Grenouille vit un Bœuf" }],
  [{ voix: "N", texte: "Qui lui sembla de belle taille." }],
  [{ voix: "N", texte: "Elle, qui n'était pas grosse en tout comme un œuf," }],
  [{ voix: "N", texte: "Envieuse, s'étend, et s'enfle, et se travaille" }],
  [{ voix: "N", texte: "Pour égaler l'animal en grosseur," }],
  [{ voix: "N", texte: "Disant :" }, { voix: "G", texte: "« Regardez bien, ma sœur ;" }],
  [{ voix: "G", texte: "Est-ce assez ? dites-moi ; n'y suis-je point encore ?" }],
  [{ voix: "S", texte: "— Nenni." }, { voix: "G", texte: "— M'y voici donc ?" }, { voix: "S", texte: "— Point du tout." }, { voix: "G", texte: "— M'y voilà ?" }],
  [{ voix: "S", texte: "— Vous n'en approchez point. »" }, { voix: "N", texte: "La chétive pécore" }],
  [{ voix: "N", texte: "S'enfla si bien qu'elle creva." }],
  [{ voix: "F", texte: "Le monde est plein de gens qui ne sont pas plus sages :" }],
  [{ voix: "F", texte: "Tout bourgeois veut bâtir comme les grands seigneurs," }],
  [{ voix: "F", texte: "Tout petit prince a des ambassadeurs," }],
  [{ voix: "F", texte: "Tout marquis veut avoir des pages." }],
];
const VOIX: Record<"N" | "G" | "S" | "F", { nom: string; couleur: string }> = {
  N: { nom: "le narrateur", couleur: "#1c2233" }, G: { nom: "la Grenouille", couleur: "#2454e6" },
  S: { nom: "sa sœur", couleur: "#d33a32" }, F: { nom: "le fabuliste, la morale", couleur: "#1f9a48" },
};

/** Le texte partition de la fable : chaque voix à sa couleur, une marge pour les indications de lecture. */
function feuilleFable(): string {
  const legende = Object.values(VOIX).map((v) => `<span style="color:${v.couleur}">■ ${v.nom}</span>`).join(" ");
  const vers = FABLE.map((morceaux, i) => `<tr><td class="vh-num">${i + 1}</td><td class="vh-vers">${morceaux.map((m) => `<span style="color:${VOIX[m.voix].couleur}">${escapeHtml(m.texte)}</span>`).join(" ")}</td><td class="vh-marge"></td></tr>`).join("");
  return `<div class="page"><div class="titre">La Grenouille qui se veut faire aussi grosse que le Bœuf — le texte partition</div>
    <div class="sous">Prénom : ........................................ Date : ........................</div>
    <div class="regle">Chaque voix a sa couleur. Dans la marge, écris tes indications de lecture : plus fort, plus vite, une pause, une voix qui se moque… Code aussi les liaisons ‿ et les pauses /. <span style="color:#687087">— Jean de La Fontaine, Fables, I, 3.</span> <span class="reference">Livret Français CE2, Éduscol.</span></div>
    <div class="vh-legende">${legende}</div>
    <table class="vh-fable"><tr><th></th><th>La fable</th><th>Mes indications</th></tr>${vers}</table></div>`;
}

export function htmlVoixHaute(r: ReglagesVoixHaute, graine: number): string {
  if (r.exercice === "grille") return feuille(feuilleGrille(r), "vh");
  if (r.exercice === "fable") return feuille(feuilleFable(), "vh");
  const liste = phrasesDe(r, graine);
  const rendu = (p: string, coder: boolean) => (r.exercice === "liaisons" ? avecLiaisons(p, coder)
    : r.exercice === "ponctuation" ? avecPonctuation(p, coder)
      : r.exercice === "souffle" ? avecSouffle(p, coder)
        : escapeHtml(p.replace(/\s*\|\s*/g, " ")));
  const ligne = (p: string, i: number, coder: boolean) => (r.exercice === "lignes"
    ? `<div class="vh-etroite"><b>${i + 1}.</b> ${rendu(p, false).split(" ").map((m, k, t) => (k > 0 && k % 4 === 0 ? `${coder ? '<span class="vh-suite">↪</span>' : ""}<br>${m}` : m) + (k < t.length - 1 && (k + 1) % 4 !== 0 ? " " : "")).join("")}</div>`
    : `<div class="vh-phrase"><b>${i + 1}.</b> ${rendu(p, coder)}</div>`);
  const titre = EXERCICES_VOIX_HAUTE.find((e) => e.id === r.exercice)!.libelle;
  const [consigneCodee, consigneACoder] = CONSIGNES[r.exercice];
  const aCoder = !r.codees && r.exercice !== "lignes";
  const tete = `<div class="titre">Lire à voix haute — ${titre.toLowerCase()}</div><div class="sous">Prénom : ........................................ Date : ........................</div>
    <div class="regle">${aCoder ? consigneACoder : consigneCodee} <span class="reference">Livrets Français CP et CE1, Éduscol.</span></div>`;
  const page = `<div class="page">${tete}<div class="vh-liste">${liste.map((p, i) => ligne(p, i, !aCoder)).join("")}</div></div>`;
  const corrige = aCoder ? `<div class="page corrige"><div class="titre">Lire à voix haute — corrigé</div><div class="vh-liste">${liste.map((p, i) => ligne(p, i, true)).join("")}</div></div>` : "";
  return feuille(page + corrige, "vh");
}

export const STYLE_VOIX_HAUTE = `
  .feuille.vh .vh-liste { display: block; }
  .feuille.vh .vh-phrase { font-size: 22px; line-height: 2.3; margin-bottom: 3mm; page-break-inside: avoid; break-inside: avoid; }
  .feuille.vh .vh-phrase b, .feuille.vh .vh-etroite b { font-size: 13px; color: #687087; margin-right: 2mm; }
  .feuille.vh .vh-liaison { color: #d33a32; font-weight: 800; font-size: 26px; margin: 0 -1px; }
  .feuille.vh .vh-pause { color: #2454e6; font-weight: 800; margin: 0 1.5mm; }
  .feuille.vh .vh-ton { color: #d33a32; font-weight: 800; margin-right: 1.5mm; }
  .feuille.vh .vh-groupe { border-bottom: 2.5px solid #2454e6; border-radius: 0 0 14px 14px; padding: 0 2px 3px; margin-right: 2mm; }
  .feuille.vh .vh-etroite { width: 70mm; font-size: 20px; line-height: 1.9; margin: 0 0 6mm; page-break-inside: avoid; break-inside: avoid; border-left: 2px solid #c4c9d6; padding-left: 3mm; }
  .feuille.vh .vh-suite { color: #d33a32; font-weight: 800; margin-left: 1.5mm; }
  .feuille.vh .vh-grille { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 3mm; }
  .feuille.vh .vh-grille th, .feuille.vh .vh-grille td { border: 1px solid #1c2233; padding: 3mm 2mm; text-align: center; }
  .feuille.vh .vh-grille td.vh-critere { text-align: left; width: 42%; font-weight: 600; }
  .feuille.vh .vh-case { display: inline-block; width: 4mm; height: 4mm; border: 1.5px solid #1c2233; border-radius: 1mm; vertical-align: middle; }
  .feuille.vh .vh-conseil { margin-top: 8mm; font-size: 14px; line-height: 2.2; }
  .feuille.vh .vh-legende { display: flex; gap: 6mm; flex-wrap: wrap; font-size: 13px; font-weight: 700; margin: 0 0 3mm; }
  .feuille.vh .vh-fable { width: 100%; border-collapse: collapse; }
  .feuille.vh .vh-fable th { font-size: 12px; color: #687087; text-align: left; padding-bottom: 2mm; }
  .feuille.vh .vh-fable td { vertical-align: bottom; border-bottom: 1px dotted #c4c9d6; padding: 1.6mm 2mm; }
  .feuille.vh .vh-num { width: 9mm; font-size: 11px; color: #687087; white-space: nowrap; }
  .feuille.vh .vh-vers { font-size: 15px; line-height: 1.45; font-weight: 600; width: 66%; }
  .feuille.vh .vh-marge { border-left: 1px solid #c4c9d6; }
`;
