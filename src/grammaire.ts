// Grammaire et conjugaison : les feuilles de l'étude de la langue du cycle 2.
//
// Programme de français du cycle 2 (2024), « Se repérer dans la phrase
// simple » et « Découvrir, comprendre et mettre en œuvre l'orthographe
// grammaticale » : la phrase et ses marqueurs, les types et les formes de
// phrases, les classes de mots, le groupe sujet, le verbe et les
// compléments, la chaîne d'accords, la relation sujet-verbe, le radical et
// la terminaison, la conjugaison. Les exemples du programme sont repris :
// « un petit garçon → une petite fille », « Le chat miaule → Les chats
// miaulent », « Je suis bleue : suis-je la mer ou l'océan ? », « La
// maitresse raconte une histoire aux enfants → Elle raconte… », « Jean,
// ferme la porte → Jean, ne ferme pas la porte », « ils plieront, tu as
// plié, vous pliez → plier ». Guide CE1 (2019), p. 95-97 : la leçon part de
// l'observation et de la manipulation d'un corpus — classer, réécrire,
// surligner, recopier dans un tableau, « démonter des phrases ».

import { escapeHtml } from "./print";
import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";
import { AU_PROGRAMME, PERSONNES, VERBES_1ER_GROUPE, tempsDe, VERBES_IRREGULIERS, avecPronom, formes, radicalEtTerminaison, type Temps } from "./conjugaison";

export type Classe = "CP" | "CE1" | "CE2";
export type ExerciceGrammaire =
  | "phrases" | "estCeUnePhrase" | "types" | "negation" | "constituants" | "classes" | "pronoms" | "discours"
  | "genreNombre" | "chaineAccords" | "sujetVerbe" | "conjuguer" | "transformerTemps" | "infinitif";

export const EXERCICES_GRAMMAIRE: { id: ExerciceGrammaire; libelle: string; famille: "La phrase" | "Les accords" | "Le verbe" }[] = [
  { id: "phrases", libelle: "Combien de phrases ? Majuscules et points", famille: "La phrase" },
  { id: "estCeUnePhrase", libelle: "Est-ce une phrase ?", famille: "La phrase" },
  { id: "types", libelle: "Les types de phrases et la ponctuation", famille: "La phrase" },
  { id: "negation", libelle: "La forme négative", famille: "La phrase" },
  { id: "constituants", libelle: "Groupe sujet, verbe, compléments", famille: "La phrase" },
  { id: "classes", libelle: "Les classes de mots", famille: "La phrase" },
  { id: "pronoms", libelle: "Le groupe sujet et le pronom", famille: "La phrase" },
  { id: "discours", libelle: "Les paroles rapportées : « … »", famille: "La phrase" },
  { id: "genreNombre", libelle: "Masculin, féminin, singulier, pluriel (CP)", famille: "Les accords" },
  { id: "chaineAccords", libelle: "La chaîne d'accords dans le groupe nominal", famille: "Les accords" },
  { id: "sujetVerbe", libelle: "Le sujet et le verbe", famille: "Les accords" },
  { id: "conjuguer", libelle: "Conjuguer : les tableaux", famille: "Le verbe" },
  { id: "transformerTemps", libelle: "Changer le temps d'une phrase", famille: "Le verbe" },
  { id: "infinitif", libelle: "L'infinitif, le radical et la terminaison", famille: "Le verbe" },
];

export interface ReglagesGrammaire {
  exercice: ExerciceGrammaire;
  classe: Classe;
  /** Le temps des tableaux de conjugaison et des transformations. */
  temps: Temps;
  /** Les verbes à conjuguer, séparés par des virgules ; vide : ceux de la classe. */
  verbes: string;
}

export const REGLAGES_GRAMMAIRE: ReglagesGrammaire = { exercice: "constituants", classe: "CE1", temps: "present", verbes: "" };

const TETE = '<div class="sous">Prénom : ........................................ Date : ........................</div>';
const titre = (t: string) => `<div class="titre">${escapeHtml(t)}</div>`;
const regle = (t: string) => `<div class="regle">${t}</div>`;
const ligne = () => '<div class="gr-ligne"></div>';
const corrige = (t: string, corps: string) => `<div class="page corrige">${titre(`${t} — corrigé`)}<div class="gr-corrige">${corps}</div></div>`;

// ── La phrase ─────────────────────────────────────────────────────────────

export const TEXTES_PHRASES = [
  "Le chien de Léo s'appelle Rex. Il aime courir dans le jardin. Le soir, il dort près de la cheminée.",
  "Lila a un vélo rouge. Elle roule dans la rue. Attention, une flaque ! Lila freine.",
  "Où est mon bonnet ? Je le cherche partout. Ah, le voici sous le lit !",
];

export const PHRASE_OU_PAS: { texte: string; phrase: boolean; pourquoi: string }[] = [
  { texte: "Le chat dort sur le lit.", phrase: true, pourquoi: "du sens, une majuscule, un point" },
  { texte: "le chien mange sa pâtée", phrase: false, pourquoi: "ni majuscule ni point" },
  { texte: "Mange chat le souris.", phrase: false, pourquoi: "les mots ne sont pas dans un ordre qui a du sens" },
  { texte: "As-tu fini ton dessin ?", phrase: true, pourquoi: "du sens, une majuscule, un point d'interrogation" },
  { texte: "Quel beau gâteau !", phrase: true, pourquoi: "du sens, une majuscule, un point d'exclamation" },
  { texte: "Tous les matins, mange avec.", phrase: false, pourquoi: "il manque des mots : on ne comprend pas" },
  { texte: "Ma sœur range sa chambre.", phrase: true, pourquoi: "du sens, une majuscule, un point" },
  { texte: "Le train maman les amis.", phrase: false, pourquoi: "pas de sens" },
];

export type TypeDePhrase = "déclarative" | "interrogative" | "impérative" | "exclamative";
export const PHRASES_A_PONCTUER: { phrase: string; type: TypeDePhrase; point: "." | "?" | "!" }[] = [
  { phrase: "Le vent souffle fort", type: "déclarative", point: "." },
  { phrase: "Où est ton manteau", type: "interrogative", point: "?" },
  { phrase: "Range ta chambre", type: "impérative", point: "." },
  { phrase: "Quelle belle journée", type: "exclamative", point: "!" },
  { phrase: "Est-ce que tu viens avec nous", type: "interrogative", point: "?" },
  { phrase: "Ferme la porte, s'il te plaît", type: "impérative", point: "." },
  { phrase: "Nous mangeons à la cantine", type: "déclarative", point: "." },
  { phrase: "Comme tu as grandi", type: "exclamative", point: "!" },
];

/** Les phrases à mettre à la forme négative ; la première, l'exemple du programme (CE2). */
export const A_NEGATIVER: { phrase: string; negative: string }[] = [
  { phrase: "Jean, ferme la porte.", negative: "Jean, ne ferme pas la porte." },
  { phrase: "Le chat dort.", negative: "Le chat ne dort pas." },
  { phrase: "Nous aimons les épinards.", negative: "Nous n'aimons pas les épinards." },
  { phrase: "Elle est contente.", negative: "Elle n'est pas contente." },
  { phrase: "Tu as faim.", negative: "Tu n'as pas faim." },
  { phrase: "Il joue dehors.", negative: "Il ne joue pas dehors." },
  { phrase: "Range ta chambre.", negative: "Ne range pas ta chambre." },
];

/** Des phrases démontées : [S:…] le groupe sujet, [V:…] le verbe, [C:…] un complément. */
export const PHRASES_DEMONTEES = [
  "[S:Le petit chat] [V:mange] [C:sa pâtée].",
  "[S:Les enfants] [V:jouent] [C:dans la cour].",
  "[S:Ma grand-mère] [V:prépare] [C:une tarte aux pommes].",
  "[C:Le matin], [S:Lucas] [V:prend] [C:le bus].",
  "[S:Le chien de Léa] [V:aboie].",
  "[S:Nous] [V:regardons] [C:les étoiles] [C:avec papa].",
  "[S:La maîtresse] [V:raconte] [C:une histoire] [C:aux enfants].",
  "[C:Tous les jours], [S:elle] [V:mange] [C:à la cantine].",
];
export const sansMarques = (p: string) => p.replace(/\[[SVC]:([^\]]+)\]/g, "$1");
export function phraseMarquee(p: string): string {
  return escapeHtml(p).replace(/\[([SVC]):([^\]]+)\]/g, (_m, k: string, g: string) => `<span class="gr-${k === "S" ? "sujet" : k === "V" ? "verbe" : "complement"}">${g}</span>`);
}

export type ClasseDeMot = "nom commun" | "nom propre" | "déterminant" | "adjectif" | "verbe" | "pronom" | "adverbe";
export const MOTS_A_CLASSER: { mot: string; classe: ClasseDeMot }[] = [
  { mot: "chat", classe: "nom commun" }, { mot: "maison", classe: "nom commun" }, { mot: "jardin", classe: "nom commun" }, { mot: "pomme", classe: "nom commun" }, { mot: "joie", classe: "nom commun" },
  { mot: "Léa", classe: "nom propre" }, { mot: "Paris", classe: "nom propre" }, { mot: "Rex", classe: "nom propre" },
  { mot: "le", classe: "déterminant" }, { mot: "une", classe: "déterminant" }, { mot: "des", classe: "déterminant" }, { mot: "mon", classe: "déterminant" }, { mot: "cette", classe: "déterminant" },
  { mot: "petit", classe: "adjectif" }, { mot: "rouge", classe: "adjectif" }, { mot: "joli", classe: "adjectif" }, { mot: "grande", classe: "adjectif" },
  { mot: "courir", classe: "verbe" }, { mot: "mange", classe: "verbe" }, { mot: "dormir", classe: "verbe" }, { mot: "chantent", classe: "verbe" },
  { mot: "il", classe: "pronom" }, { mot: "nous", classe: "pronom" }, { mot: "elles", classe: "pronom" },
  { mot: "très", classe: "adverbe" }, { mot: "bien", classe: "adverbe" }, { mot: "demain", classe: "adverbe" }, { mot: "lentement", classe: "adverbe" },
];
/** Les classes de chaque niveau : les boîtes du CP, puis les classes nommées. */
export const CLASSES_DE_LA_CLASSE: Record<Classe, ClasseDeMot[]> = {
  CP: ["nom commun", "verbe", "déterminant", "adjectif"],
  CE1: ["nom commun", "nom propre", "déterminant", "adjectif", "verbe", "pronom"],
  CE2: ["nom commun", "nom propre", "déterminant", "adjectif", "verbe", "pronom", "adverbe"],
};

/** Le groupe sujet et son pronom ; la première, l'exemple du programme (CE1). */
export const SUJETS_A_REMPLACER: { phrase: string; pronom: string }[] = [
  { phrase: "La maîtresse raconte une histoire aux enfants.", pronom: "Elle raconte une histoire aux enfants." },
  { phrase: "Les enfants jouent dans la cour.", pronom: "Ils jouent dans la cour." },
  { phrase: "Léa et Inès dessinent.", pronom: "Elles dessinent." },
  { phrase: "Mon frère et moi partons en vacances.", pronom: "Nous partons en vacances." },
  { phrase: "Le chat et la souris courent.", pronom: "Ils courent." },
  { phrase: "Toi et ta sœur êtes en retard.", pronom: "Vous êtes en retard." },
];

/** Un texte avec des paroles rapportées, et qui parle. */
export const DIALOGUE = {
  texte: "Au marché, Léa s'arrête devant les pommes. « Combien coûtent-elles ? » demande-t-elle. Le marchand sourit : « Deux euros le kilo, mademoiselle. » « Alors j'en prends un kilo ! » répond Léa. Le marchand remplit un sac et le lui tend.",
  paroles: [{ qui: "Léa", dit: "Combien coûtent-elles ?" }, { qui: "le marchand", dit: "Deux euros le kilo, mademoiselle." }, { qui: "Léa", dit: "Alors j'en prends un kilo !" }],
};

// ── Les accords ───────────────────────────────────────────────────────────

/** Les exercices du guide CP (p. 86-87) et les exemples du programme. */
export const GENRE_NOMBRE_CP = {
  unUne: [["chat", "un"], ["maison", "une"], ["vélo", "un"], ["fleur", "une"], ["lapin", "un"], ["pomme", "une"]] as [string, string][],
  pluriel: [["le chat", "les chats"], ["un ballon", "des ballons"], ["la fleur", "les fleurs"], ["mon ami", "mes amis"], ["une pomme", "des pommes"]] as [string, string][],
  feminin: [["un petit garçon", "une petite fille"], ["un grand voisin", "une grande voisine"], ["un cousin", "une cousine"], ["un boulanger", "une boulangère"]] as [string, string][],
  verbes: [["Le chat miaule.", "Les chats miaulent."], ["La voiture roule.", "Les voitures roulent."]] as [string, string][],
};

export const CHAINES_D_ACCORDS: Record<"CE1" | "CE2", { pluriel: [string, string][]; feminin: [string, string][] }> = {
  CE1: {
    pluriel: [["le petit chat", "les petits chats"], ["la grande maison", "les grandes maisons"], ["mon vieux livre", "mes vieux livres"], ["une robe bleue", "des robes bleues"], ["un chien noir", "des chiens noirs"], ["un joli vélo", "de jolis vélos"]],
    feminin: [["un petit garçon", "une petite fille"], ["un boulanger", "une boulangère"], ["un ami fidèle", "une amie fidèle"], ["le voisin curieux", "la voisine curieuse"]],
  },
  CE2: {
    pluriel: [["un cheval", "des chevaux"], ["un journal", "des journaux"], ["un animal sauvage", "des animaux sauvages"], ["un oiseau bleu", "des oiseaux bleus"], ["un jeu amusant", "des jeux amusants"], ["un beau bateau", "de beaux bateaux"]],
    feminin: [["un lecteur attentif", "une lectrice attentive"], ["un garçon joyeux", "une fille joyeuse"], ["un acteur heureux", "une actrice heureuse"], ["un chanteur célèbre", "une chanteuse célèbre"]],
  },
};
/** Les devinettes orthographiques : la première, celle du programme (CE1). */
export const DEVINETTES: { devinette: string; reponse: string }[] = [
  { devinette: "Je suis bleue : suis-je la mer ou l'océan ?", reponse: "la mer" },
  { devinette: "Je suis grande : suis-je le château ou la maison ?", reponse: "la maison" },
  { devinette: "Nous sommes petits : sommes-nous les chats ou les souris ?", reponse: "les chats" },
  { devinette: "Je suis ronde : suis-je le ballon ou la balle ?", reponse: "la balle" },
  { devinette: "Nous sommes vertes : sommes-nous les sapins ou les feuilles ?", reponse: "les feuilles" },
];

/** Le sujet et le verbe : les transformations du programme. */
export const TRANSFORMATIONS_SV: Record<Classe, [string, string, string][]> = {
  CP: [["Le chat miaule.", "Mets au pluriel : les chats…", "Les chats miaulent."], ["La voiture roule.", "Mets au pluriel : les voitures…", "Les voitures roulent."], ["Le lapin mange.", "Mets au pluriel : les lapins…", "Les lapins mangent."]],
  CE1: [["Tu parles à Léa.", "Remplace « tu » par « Léo ».", "Léo parle à Léa."], ["La voiture roule.", "Mets au pluriel : les voitures…", "Les voitures roulent."], ["Nous chantons.", "Remplace « nous » par « ils ».", "Ils chantent."], ["Le chien aboie.", "Mets au pluriel : les chiens…", "Les chiens aboient."]],
  CE2: [["Je joue au ballon.", "Remplace « je » par « les enfants ».", "Les enfants jouent au ballon."], ["Je joue au ballon.", "Remplace « je » par « nous », au passé composé.", "Nous avons joué au ballon."], ["L'enfant de la voisine joue.", "Mets « enfant » au pluriel.", "Les enfants de la voisine jouent."], ["Tu fais tes devoirs.", "Remplace « tu » par « vous ».", "Vous faites vos devoirs."]],
};
export const A_RELIER_SV: Record<Classe, [string, string][]> = {
  CP: [["Le chat", "miaule"], ["Les chats", "miaulent"], ["Tu", "joues"], ["Nous", "chantons"], ["Vous", "dansez"]],
  CE1: [["Le chat", "miaule"], ["Les chats", "miaulent"], ["Tu", "parles"], ["Nous", "jouons"], ["Vous", "chantez"], ["Léo et Lila", "dansent"]],
  CE2: [["Je", "fais"], ["Les enfants", "vont"], ["Tu", "veux"], ["Nous", "prenons"], ["Vous", "dites"], ["Ma sœur", "peut"]],
};

// ── Le verbe ──────────────────────────────────────────────────────────────

/** Des phrases au présent à changer de temps : sujet, personne (0 à 5), verbe, la suite. */
export const PHRASES_A_CONJUGUER: Record<"CE1" | "CE2", { sujet: string; personne: number; verbe: string; suite: string }[]> = {
  CE1: [
    { sujet: "Simon", personne: 2, verbe: "parler", suite: "à Nora." },
    { sujet: "Nous", personne: 3, verbe: "jouer", suite: "dans la cour." },
    { sujet: "Tu", personne: 1, verbe: "dessiner", suite: "un château." },
    { sujet: "Les enfants", personne: 5, verbe: "regarder", suite: "un film." },
    { sujet: "J'", personne: 0, verbe: "avoir", suite: "un chat." },
    { sujet: "Vous", personne: 4, verbe: "être", suite: "en avance." },
  ],
  CE2: [
    { sujet: "Je", personne: 0, verbe: "faire", suite: "un gâteau." },
    { sujet: "Nous", personne: 3, verbe: "aller", suite: "à la piscine." },
    { sujet: "Mes cousins", personne: 5, verbe: "prendre", suite: "le bus." },
    { sujet: "Tu", personne: 1, verbe: "voir", suite: "la mer." },
    { sujet: "Lina", personne: 2, verbe: "vouloir", suite: "un chien." },
    { sujet: "Vous", personne: 4, verbe: "dire", suite: "bonjour." },
    { sujet: "Le petit garçon", personne: 2, verbe: "manger", suite: "une pomme." },
  ],
};
const MARQUEURS: Record<Temps, string> = { present: "Aujourd'hui", imparfait: "Autrefois", futur: "Demain", passeCompose: "Hier" };

/** La phrase conjuguée au temps demandé : « Demain, Simon parlera à Nora. » */
export function phraseAuTemps(p: { sujet: string; personne: number; verbe: string; suite: string }, temps: Temps, marqueur = true): string {
  const forme = formes(p.verbe, temps)[p.personne];
  const groupe = p.personne === 0 ? avecPronom("je", forme) : `${p.sujet} ${forme}`;
  // Après « Demain, », un pronom ou un groupe nominal perd sa majuscule ; un prénom la garde.
  const commun = /^(le|la|les|l'|mon|ma|mes|un|une|des|je|j'|tu|il|elle|nous|vous|ils|elles)\b/i.test(groupe);
  const debut = marqueur ? `${MARQUEURS[temps]}, ${commun ? groupe.charAt(0).toLowerCase() + groupe.slice(1) : groupe}` : groupe.charAt(0).toUpperCase() + groupe.slice(1);
  return `${debut} ${p.suite}`;
}

/** Les verbes d'une feuille de conjugaison : ceux de l'enseignant s'ils sont au programme, sinon ceux de la classe. */
export function verbesDeLaFeuille(r: ReglagesGrammaire, graine: number): string[] {
  const permis = new Set(AU_PROGRAMME[r.classe].verbes);
  const saisis = r.verbes.split(/[,\n]/).map((v) => v.trim().toLowerCase()).filter((v) => permis.has(v));
  if (saisis.length) return saisis.slice(0, 4);
  if (r.classe === "CP") return ["être", "avoir"];
  const alea = hasard(graine);
  const premier = melanger(alea, VERBES_1ER_GROUPE).slice(0, 2);
  return r.classe === "CE1" ? [melanger(alea, ["être", "avoir"])[0], ...premier] : [melanger(alea, ["être", "avoir"])[0], premier[0], melanger(alea, VERBES_IRREGULIERS)[0]];
}

// ── Les feuilles ──────────────────────────────────────────────────────────

function feuillePhrases(_r: ReglagesGrammaire, graine: number): string {
  const texte = TEXTES_PHRASES[Math.floor(hasard(graine)() * TEXTES_PHRASES.length)];
  const n = (texte.match(/[.!?]/g) ?? []).length;
  return `<div class="page">${titre("Combien de phrases ?")}${TETE}${regle("Une phrase commence par une majuscule et finit par un point : . ? ou ! Entoure les majuscules en bleu et les points en rouge. Puis souligne chaque phrase d'une couleur différente.")}
    <div class="gr-texte">${escapeHtml(texte)}</div><div class="gr-q">Il y a <span class="gr-case"></span> phrases.</div></div>${corrige("Combien de phrases", `<div>${n} phrases : ${(texte.match(/[^.!?]+[.!?]/g) ?? []).map((p) => `« ${escapeHtml(p.trim())} »`).join(" ")}</div>`)}`;
}

function feuilleEstCeUnePhrase(_r: ReglagesGrammaire, graine: number): string {
  const items = melanger(hasard(graine), PHRASE_OU_PAS);
  return `<div class="page">${titre("Est-ce une phrase ?")}${TETE}${regle("Une phrase a du sens ; elle commence par une majuscule et finit par un point. Coche oui ou non, puis dis pourquoi à ton voisin.")}
    <table class="gr-tableau"><tr><th></th><th>Oui</th><th>Non</th></tr>${items.map((x) => `<tr><td class="gr-grand">${escapeHtml(x.texte)}</td><td class="gr-centre"><span class="gr-case"></span></td><td class="gr-centre"><span class="gr-case"></span></td></tr>`).join("")}</table></div>
    ${corrige("Est-ce une phrase", items.map((x) => `<div>${escapeHtml(x.texte)} — <b>${x.phrase ? "oui" : "non"}</b> : ${escapeHtml(x.pourquoi)}</div>`).join(""))}`;
}

function feuilleTypes(r: ReglagesGrammaire, graine: number): string {
  const items = melanger(hasard(graine), PHRASES_A_PONCTUER).slice(0, 6);
  const types: TypeDePhrase[] = r.classe === "CP" ? ["déclarative", "interrogative", "impérative"] : ["déclarative", "interrogative", "impérative", "exclamative"];
  const noms = r.classe === "CP" ? { "déclarative": "elle dit", "interrogative": "elle demande", "impérative": "elle ordonne", "exclamative": "elle s'exclame" } : { "déclarative": "déclarative", "interrogative": "interrogative", "impérative": "impérative", "exclamative": "exclamative (forme)" };
  const produire = r.classe === "CE2" ? `<div class="gr-sous-titre">Transforme en question, de deux façons</div><div class="gr-q">Tu aimes les pommes.</div>${ligne()}${ligne()}` : "";
  return `<div class="page">${titre("Les types de phrases")}${TETE}${regle("Ajoute le point qui convient : . ? ou ! Puis coche ce que fait la phrase.")}
    ${items.map((x, i) => `<div class="gr-item"><div class="gr-grand"><b>${i + 1}.</b> ${escapeHtml(x.phrase)} <span class="gr-case"></span></div><div class="gr-choix">${types.map((t) => `<span><span class="gr-case gr-petite"></span> ${noms[t]}</span>`).join("")}</div></div>`).join("")}${produire}</div>
    ${corrige("Les types de phrases", items.map((x, i) => `<div><b>${i + 1}.</b> ${escapeHtml(x.phrase)}${x.point} — ${noms[x.type]}</div>`).join("") + (r.classe === "CE2" ? "<div>Est-ce que tu aimes les pommes ? — Aimes-tu les pommes ?</div>" : ""))}`;
}

function feuilleNegation(r: ReglagesGrammaire, graine: number): string {
  const items = [A_NEGATIVER[0], ...melanger(hasard(graine), A_NEGATIVER.slice(1)).slice(0, 5)];
  const cp = r.classe === "CP";
  return `<div class="page">${titre("La forme négative")}${TETE}${regle(`Écris la phrase à la forme négative avec ne… pas. ${cp ? "Lis les deux phrases : qu'est-ce qui a changé dans le sens ?" : "Devant une voyelle, ne devient n'."}`)}
    ${items.map((x, i) => `<div class="gr-item"><div class="gr-grand"><b>${i + 1}.</b> ${escapeHtml(x.phrase)}</div>${ligne()}</div>`).join("")}</div>
    ${corrige("La forme négative", items.map((x, i) => `<div><b>${i + 1}.</b> ${escapeHtml(x.negative)}</div>`).join(""))}`;
}

function feuilleConstituants(_r: ReglagesGrammaire, graine: number): string {
  const items = melanger(hasard(graine), PHRASES_DEMONTEES).slice(0, 6);
  return `<div class="page">${titre("Groupe sujet, verbe, compléments")}${TETE}${regle("Souligne le groupe sujet en bleu : je peux l'encadrer par « C'est… qui ». Entoure le verbe en rouge : je peux l'encadrer par « ne… pas », et il change si je change le temps. Mets les compléments entre crochets.")}
    ${items.map((p, i) => `<div class="gr-item gr-grand"><b>${i + 1}.</b> ${escapeHtml(sansMarques(p))}</div>`).join("")}
    <div class="gr-sous-titre">Déplace un complément, puis supprime-le : la phrase a-t-elle encore du sens ?</div><div class="gr-q">${escapeHtml(sansMarques(items[0]))}</div>${ligne()}${ligne()}</div>
    ${corrige("Groupe sujet, verbe, compléments", items.map((p, i) => `<div><b>${i + 1}.</b> ${phraseMarquee(p)}</div>`).join("") + '<div class="gr-legende"><span class="gr-sujet">groupe sujet</span> <span class="gr-verbe">verbe</span> <span class="gr-complement">complément</span></div>')}`;
}

function feuilleClasses(r: ReglagesGrammaire, graine: number): string {
  const classes = CLASSES_DE_LA_CLASSE[r.classe];
  const mots = melanger(hasard(graine), MOTS_A_CLASSER.filter((m) => classes.includes(m.classe) || (r.classe === "CP" && m.classe === "nom propre")))
    .map((m) => (r.classe === "CP" && m.classe === "nom propre" ? { ...m, classe: "nom commun" as ClasseDeMot } : m)).slice(0, 18);
  const nom = (c: ClasseDeMot) => (r.classe === "CP" ? { "nom commun": "la boîte des noms", "verbe": "la boîte des verbes", "déterminant": "la boîte des petits mots devant le nom", "adjectif": "la boîte des mots qui disent comment est le nom" }[c as string] ?? c : c);
  return `<div class="page">${titre("Les classes de mots")}${TETE}${regle(r.classe === "CP"
    ? "Range chaque mot dans sa boîte. Dans la boîte des noms, on trouve des noms d'animaux, de personnes, d'objets ; dans la boîte des verbes, on trouve souvent des actions."
    : "Écris chaque mot dans la colonne de sa classe. Avant un nom commun, il y a souvent un déterminant ; un nom propre commence par une majuscule.")}
    <div class="gr-banque">${mots.map((m) => `<span>${escapeHtml(m.mot)}</span>`).join("")}</div>
    <table class="gr-tableau gr-colonnes"><tr>${classes.map((c) => `<th>${escapeHtml(nom(c))}</th>`).join("")}</tr><tr>${classes.map(() => "<td></td>").join("")}</tr></table></div>
    ${corrige("Les classes de mots", classes.map((c) => `<div><b>${escapeHtml(nom(c))}</b> : ${mots.filter((m) => m.classe === c).map((m) => escapeHtml(m.mot)).join(", ") || "—"}</div>`).join(""))}`;
}

function feuillePronoms(_r: ReglagesGrammaire, graine: number): string {
  const items = [SUJETS_A_REMPLACER[0], ...melanger(hasard(graine), SUJETS_A_REMPLACER.slice(1)).slice(0, 4)];
  return `<div class="page">${titre("Le groupe sujet et le pronom")}${TETE}${regle("Remplace le groupe sujet par un pronom : il, elle, nous, vous, ils, elles. Puis, à l'inverse, remplace le pronom par un groupe nominal de ton choix.")}
    ${items.map((x, i) => `<div class="gr-item"><div class="gr-grand"><b>${i + 1}.</b> ${escapeHtml(x.phrase)}</div>${ligne()}</div>`).join("")}
    <div class="gr-sous-titre">À l'inverse</div>${["Il aboie dans le jardin.", "Elles chantent une chanson."].map((p) => `<div class="gr-item"><div class="gr-grand">${escapeHtml(p)}</div>${ligne()}</div>`).join("")}</div>
    ${corrige("Le groupe sujet et le pronom", items.map((x, i) => `<div><b>${i + 1}.</b> ${escapeHtml(x.pronom)}</div>`).join("") + "<div>À l'inverse, par exemple : Le chien aboie dans le jardin. Les filles chantent une chanson.</div>")}`;
}

function feuilleDiscours(): string {
  const d = DIALOGUE;
  return `<div class="page">${titre("Les paroles rapportées")}${TETE}${regle("Dans un récit, les paroles des personnages sont entre guillemets « … ». Surligne les paroles, puis écris qui parle.")}
    <div class="gr-texte">${escapeHtml(d.texte)}</div>
    <table class="gr-tableau"><tr><th>Les paroles</th><th>Qui parle ?</th></tr>${d.paroles.map((_, i) => `<tr><td>${i + 1}.</td><td></td></tr>`).join("")}</table>
    <div class="gr-sous-titre">Écris ce que Léa pourrait répondre ensuite, avec les guillemets</div>${ligne()}${ligne()}</div>
    ${corrige("Les paroles rapportées", d.paroles.map((p, i) => `<div><b>${i + 1}.</b> « ${escapeHtml(p.dit)} » — ${escapeHtml(p.qui)}</div>`).join(""))}`;
}

function feuilleGenreNombre(): string {
  const g = GENRE_NOMBRE_CP;
  return `<div class="page">${titre("Masculin, féminin, singulier, pluriel")}${TETE}${regle("Un seul ou plusieurs ? Un garçon ou une fille ? Les petits mots devant le nom nous aident.")}
    <div class="gr-sous-titre">1. Écris un ou une</div><div class="gr-grille">${g.unUne.map(([m]) => `<div><span class="gr-trou"></span> ${escapeHtml(m)}</div>`).join("")}</div>
    <div class="gr-sous-titre">2. Écris au pluriel : plusieurs</div>${g.pluriel.map(([a]) => `<div class="gr-paire">${escapeHtml(a)} → <span class="gr-trait"></span></div>`).join("")}
    <div class="gr-sous-titre">3. Écris au féminin</div>${g.feminin.map(([a]) => `<div class="gr-paire">${escapeHtml(a)} → <span class="gr-trait"></span></div>`).join("")}
    <div class="gr-sous-titre">4. Écris au pluriel</div>${g.verbes.map(([a]) => `<div class="gr-paire">${escapeHtml(a)} → <span class="gr-trait"></span></div>`).join("")}</div>
    ${corrige("Masculin, féminin, singulier, pluriel", `<div>1. ${g.unUne.map(([m, d]) => `${d} ${m}`).join(", ")}</div><div>2. ${g.pluriel.map(([, b]) => b).join(", ")}</div><div>3. ${g.feminin.map(([, b]) => b).join(", ")}</div><div>4. ${g.verbes.map(([, b]) => b).join(" ")}</div>`)}`;
}

function feuilleChaineAccords(r: ReglagesGrammaire, graine: number): string {
  const niveau = r.classe === "CE2" ? "CE2" : "CE1";
  const c = CHAINES_D_ACCORDS[niveau];
  const alea = hasard(graine);
  const pluriel = melanger(alea, c.pluriel).slice(0, 5), feminin = melanger(alea, c.feminin).slice(0, 3);
  const devinettes = [DEVINETTES[0], ...melanger(alea, DEVINETTES.slice(1)).slice(0, 2)];
  return `<div class="page">${titre("La chaîne d'accords")}${TETE}${regle("Dans le groupe nominal, le déterminant, le nom et l'adjectif s'accordent : si l'un change, les autres changent aussi. Je relie les mots de la chaîne par une flèche.")}
    <div class="gr-sous-titre">1. Écris au pluriel</div>${pluriel.map(([a]) => `<div class="gr-paire">${escapeHtml(a)} → <span class="gr-trait"></span></div>`).join("")}
    <div class="gr-sous-titre">2. Écris au féminin</div>${feminin.map(([a]) => `<div class="gr-paire">${escapeHtml(a)} → <span class="gr-trait"></span></div>`).join("")}
    <div class="gr-sous-titre">3. Les devinettes : explique ton choix</div>${devinettes.map((d) => `<div class="gr-paire">${escapeHtml(d.devinette)} <span class="gr-trait gr-court"></span></div>`).join("")}</div>
    ${corrige("La chaîne d'accords", `<div>1. ${pluriel.map(([, b]) => escapeHtml(b)).join(" ; ")}</div><div>2. ${feminin.map(([, b]) => escapeHtml(b)).join(" ; ")}</div><div>3. ${devinettes.map((d) => escapeHtml(d.reponse)).join(" ; ")}</div>`)}`;
}

function feuilleSujetVerbe(r: ReglagesGrammaire, graine: number): string {
  const alea = hasard(graine);
  const paires = A_RELIER_SV[r.classe];
  const droite = melanger(alea, paires.map(([, v]) => v));
  const transfos = TRANSFORMATIONS_SV[r.classe];
  return `<div class="page">${titre("Le sujet et le verbe")}${TETE}${regle("Le verbe s'accorde avec son sujet : si le sujet change, la fin du verbe change. Avec ils, elles, ou un sujet au pluriel, le verbe se termine souvent par -nt, qu'on n'entend pas.")}
    <div class="gr-sous-titre">1. Relie chaque sujet à son verbe</div><table class="gr-relier">${paires.map(([s], i) => `<tr><td class="gr-droite">${escapeHtml(s)} ●</td><td class="gr-vide"></td><td>● ${escapeHtml(droite[i])}</td></tr>`).join("")}</table>
    <div class="gr-sous-titre">2. Transforme la phrase</div>${transfos.map(([p, c]) => `<div class="gr-item"><div class="gr-grand">${escapeHtml(p)} <span class="gr-consigne">${escapeHtml(c)}</span></div>${ligne()}</div>`).join("")}</div>
    ${corrige("Le sujet et le verbe", `<div>1. ${paires.map(([s, v]) => `${escapeHtml(s)} ${escapeHtml(v)}`).join(" ; ")}</div>${transfos.map(([, , x], i) => `<div>2.${i + 1}. ${escapeHtml(x)}</div>`).join("")}`)}`;
}

function feuilleConjuguer(r: ReglagesGrammaire, graine: number): string {
  const temps = r.classe === "CP" ? "present" : r.temps;
  const verbes = verbesDeLaFeuille(r, graine);
  const t = tempsDe(temps);
  const tableau = (v: string) => `<table class="gr-conj"><tr><th colspan="2">${escapeHtml(v)}</th></tr>${PERSONNES.map((p) => `<tr><td class="gr-pronom">${p === "je" ? "je / j'" : p}</td><td></td></tr>`).join("")}</table>`;
  return `<div class="page">${titre(`Conjuguer ${t.au}`)}${TETE}${regle(`Complète chaque tableau ${t.au}. Dis la forme à voix basse avant de l'écrire, puis vérifie la terminaison.`)}
    <div class="gr-tableaux">${verbes.map(tableau).join("")}</div></div>
    ${corrige(`Conjuguer ${t.au}`, `<div class="gr-tableaux">${verbes.map((v) => `<div><b>${escapeHtml(v)}</b><br>${formes(v, temps).map((f, i) => escapeHtml(avecPronom(PERSONNES[i], f))).join("<br>")}</div>`).join("")}</div>`)}`;
}

function feuilleTransformerTemps(r: ReglagesGrammaire, graine: number): string {
  const niveau = r.classe === "CE2" ? "CE2" : "CE1";
  const temps: Temps = r.temps === "present" ? "futur" : r.temps;
  const items = melanger(hasard(graine), PHRASES_A_CONJUGUER[niveau]).slice(0, 5);
  const t = tempsDe(temps);
  return `<div class="page">${titre(`Changer le temps : ${t.nom}`)}${TETE}${regle(`Récris chaque phrase ${t.au}, en commençant par « ${MARQUEURS[temps]}, ». Souligne le verbe et son sujet.`)}
    ${items.map((p, i) => `<div class="gr-item"><div class="gr-grand"><b>${i + 1}.</b> ${escapeHtml(phraseAuTemps(p, "present", false))}</div>${ligne()}</div>`).join("")}</div>
    ${corrige(`Changer le temps : ${t.nom}`, items.map((p, i) => `<div><b>${i + 1}.</b> ${escapeHtml(phraseAuTemps(p, temps))}</div>`).join(""))}`;
}

function feuilleInfinitif(r: ReglagesGrammaire, graine: number): string {
  const alea = hasard(graine);
  const verbes = r.classe === "CE2" ? [...VERBES_1ER_GROUPE, ...VERBES_IRREGULIERS] : VERBES_1ER_GROUPE;
  const items = Array.from({ length: 8 }, (_, k) => {
    const v = verbes[Math.floor(alea() * verbes.length)];
    const t: Temps = (["present", "imparfait", "futur", "passeCompose"] as Temps[])[k % 4];
    const p = Math.floor(alea() * 6);
    return { v, t, forme: avecPronom(PERSONNES[p], formes(v, t)[p]), simple: formes(v, t)[p] };
  });
  return `<div class="page">${titre("L'infinitif, le radical et la terminaison")}${TETE}${regle("Écris l'infinitif de chaque verbe : ils plieront, tu as plié, vous pliez → plier. Pour les temps simples, sépare le radical de la terminaison par un trait.")}
    <table class="gr-tableau"><tr><th>Le verbe conjugué</th><th>Son infinitif</th></tr>${items.map((x) => `<tr><td class="gr-grand">${escapeHtml(x.forme)}</td><td></td></tr>`).join("")}</table></div>
    ${corrige("L'infinitif", items.map((x) => {
      const rt = VERBES_1ER_GROUPE.includes(x.v) && x.t !== "passeCompose" ? radicalEtTerminaison(x.v, x.simple) : null;
      return `<div>${escapeHtml(x.forme)} → <b>${escapeHtml(x.v)}</b>${rt ? ` <span class="gr-gris">(${escapeHtml(rt.radical)} | ${escapeHtml(rt.terminaison)})</span>` : ""}</div>`;
    }).join(""))}`;
}

export function htmlGrammaire(r: ReglagesGrammaire, graine: number): string {
  const f: Record<ExerciceGrammaire, () => string> = {
    phrases: () => feuillePhrases(r, graine), estCeUnePhrase: () => feuilleEstCeUnePhrase(r, graine), types: () => feuilleTypes(r, graine),
    negation: () => feuilleNegation(r, graine), constituants: () => feuilleConstituants(r, graine), classes: () => feuilleClasses(r, graine),
    pronoms: () => feuillePronoms(r, graine), discours: () => feuilleDiscours(), genreNombre: () => feuilleGenreNombre(),
    chaineAccords: () => feuilleChaineAccords(r, graine), sujetVerbe: () => feuilleSujetVerbe(r, graine), conjuguer: () => feuilleConjuguer(r, graine),
    transformerTemps: () => feuilleTransformerTemps(r, graine), infinitif: () => feuilleInfinitif(r, graine),
  };
  return feuille(f[r.exercice](), "gr");
}

export const STYLE_GRAMMAIRE = `
  .feuille.gr .gr-ligne { border-bottom: 1px solid #9aa0b4; height: 10mm; }
  .feuille.gr .gr-texte { font-size: 19px; line-height: 2.1; margin: 3mm 0 5mm; }
  .feuille.gr .gr-q { font-size: 15px; margin: 2mm 0; line-height: 2; }
  .feuille.gr .gr-grand { font-size: 17px; line-height: 1.8; }
  .feuille.gr .gr-grand b, .feuille.gr .gr-item b { color: #687087; margin-right: 1.5mm; }
  .feuille.gr .gr-item { margin: 0 0 3.5mm; page-break-inside: avoid; break-inside: avoid; }
  .feuille.gr .gr-case { display: inline-block; width: 7mm; height: 7mm; border: 1.5px solid #1c2233; border-radius: 1mm; vertical-align: -2mm; }
  .feuille.gr .gr-case.gr-petite { width: 4.5mm; height: 4.5mm; vertical-align: -1mm; }
  .feuille.gr .gr-choix { font-size: 12.5px; line-height: 2; margin-left: 6mm; }
  .feuille.gr .gr-choix > span { display: inline-block; margin-right: 5mm; white-space: nowrap; }
  .feuille.gr .gr-sous-titre { font-size: 14px; font-weight: 800; margin: 5mm 0 2mm; }
  .feuille.gr .gr-tableau { width: 100%; border-collapse: collapse; font-size: 14px; margin: 2mm 0 5mm; }
  .feuille.gr .gr-tableau th, .feuille.gr .gr-tableau td { border: 1px solid #1c2233; padding: 2mm 3mm; text-align: left; vertical-align: middle; }
  .feuille.gr .gr-tableau th { background: #f7f8fc; font-size: 12px; }
  .feuille.gr .gr-tableau td { height: 10mm; }
  .feuille.gr .gr-colonnes td { height: 70mm; vertical-align: top; }
  .feuille.gr .gr-centre { text-align: center !important; width: 16mm; }
  .feuille.gr .gr-banque { display: block; margin: 0 0 4mm; font-size: 15px; line-height: 2.3; }
  .feuille.gr .gr-banque span { display: inline-block; border: 1px solid #9aa0b4; border-radius: 3mm; padding: 0 3mm; margin: 0 2mm 1.5mm 0; line-height: 1.7; }
  .feuille.gr .gr-grille { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3mm 4mm; font-size: 17px; line-height: 2; }
  .feuille.gr .gr-trou { display: inline-block; width: 14mm; border-bottom: 1.5px solid #1c2233; height: 6mm; vertical-align: bottom; }
  .feuille.gr .gr-paire { font-size: 16px; line-height: 2.4; }
  .feuille.gr .gr-trait { display: inline-block; width: 75mm; border-bottom: 1px solid #9aa0b4; height: 6mm; vertical-align: bottom; }
  .feuille.gr .gr-trait.gr-court { width: 40mm; }
  .feuille.gr .gr-relier { border-collapse: collapse; font-size: 16px; margin: 1mm 0 3mm; }
  .feuille.gr .gr-relier td { padding: 2mm 0; border: none; }
  .feuille.gr .gr-droite { text-align: right; width: 45mm; font-weight: 600; }
  .feuille.gr .gr-vide { width: 35mm; }
  .feuille.gr .gr-consigne { font-size: 12.5px; color: #4a5168; margin-left: 2mm; }
  .feuille.gr .gr-tableaux { display: grid; grid-template-columns: repeat(auto-fill, minmax(55mm, 1fr)); gap: 5mm; }
  .feuille.gr .gr-conj { border-collapse: collapse; width: 100%; font-size: 15px; }
  .feuille.gr .gr-conj th { border: 1px solid #1c2233; background: #f7f8fc; padding: 2mm; font-size: 15px; }
  .feuille.gr .gr-conj td { border: 1px solid #1c2233; height: 10mm; padding: 0 2mm; }
  .feuille.gr .gr-pronom { width: 18mm; color: #4a5168; font-size: 13px; }
  .feuille.gr .gr-sujet { border-bottom: 2.5px solid #2454e6; }
  .feuille.gr .gr-verbe { border: 2px solid #d33a32; border-radius: 3mm; padding: 0 1mm; }
  .feuille.gr .gr-complement::before { content: "["; color: #1f9a48; font-weight: 800; }
  .feuille.gr .gr-complement::after { content: "]"; color: #1f9a48; font-weight: 800; }
  .feuille.gr .gr-legende { margin-top: 4mm; font-size: 13px; }
  .feuille.gr .gr-legende span { margin-right: 6mm; }
  .feuille.gr .gr-corrige { font-size: 14px; line-height: 1.9; }
  .feuille.gr .gr-gris { color: #687087; font-size: 12.5px; }
`;
