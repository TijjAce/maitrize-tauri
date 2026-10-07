// Orthographe et dictées : les feuilles des dictées du CP au CE2, et celles
// qui font mémoriser l'orthographe des mots.
//
// Guide « Pour enseigner la lecture et l'écriture au CP » (2019), p. 86 : la
// dictée « envisagée sous un angle constructif et non évaluatif » — lire le
// texte, le comprendre, compter les phrases, les mots, les signes de
// ponctuation, le copier en prononçant, vérifier soi-même, puis la dictée des
// mots dans le désordre et celle du texte. Guide « Pour enseigner la lecture
// et l'écriture au CE1 » (2019), p. 97-106 : la dictée à choix multiples,
// négociée, dialoguée ; la dictée de syllabes et de mots (de 4 à 10 mots),
// l'autodictée, la phrase du jour ; la dictée à trous, la fausse dictée, la
// dictée segmentée ; mémoriser les mots (les cartes, l'escalier, les listes
// analogiques). Programme de français du cycle 2 (2024) : les lettres
// muettes et la famille du mot (chat/chaton, blanc/blanche), la valeur des
// lettres s, c, g, le m devant m, b, p, les accents, les chaînes d'accords.

import { escapeHtml } from "./print";
import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";

export type Classe = "CP" | "CE1" | "CE2";
export type ExerciceOrthographe =
  | "dicteeDeMots" | "dicteePreparee" | "phraseDuJour" | "choixMultiples" | "autodictee" | "aTrous" | "piegee"
  | "memoriser" | "listes" | "lettreMuette" | "valeurLettres" | "mbp" | "accents";

export const EXERCICES_ORTHOGRAPHE: { id: ExerciceOrthographe; libelle: string; famille: "Dictées" | "Mémoriser l'orthographe des mots" }[] = [
  { id: "dicteeDeMots", libelle: "La dictée de mots", famille: "Dictées" },
  { id: "dicteePreparee", libelle: "La dictée préparée : lire, compter, copier, écrire", famille: "Dictées" },
  { id: "phraseDuJour", libelle: "La phrase du jour", famille: "Dictées" },
  { id: "choixMultiples", libelle: "La dictée à choix multiples", famille: "Dictées" },
  { id: "autodictee", libelle: "L'autodictée", famille: "Dictées" },
  { id: "aTrous", libelle: "La dictée à trous", famille: "Dictées" },
  { id: "piegee", libelle: "La fausse dictée (dictée piégée)", famille: "Dictées" },
  { id: "memoriser", libelle: "Mémoriser des mots : les cartes et l'escalier", famille: "Mémoriser l'orthographe des mots" },
  { id: "listes", libelle: "Les listes analogiques", famille: "Mémoriser l'orthographe des mots" },
  { id: "lettreMuette", libelle: "La lettre muette et la famille du mot", famille: "Mémoriser l'orthographe des mots" },
  { id: "valeurLettres", libelle: "s, c, g : une lettre, deux sons", famille: "Mémoriser l'orthographe des mots" },
  { id: "mbp", libelle: "m devant m, b, p", famille: "Mémoriser l'orthographe des mots" },
  { id: "accents", libelle: "Les accents", famille: "Mémoriser l'orthographe des mots" },
];

export interface ReglagesOrthographe {
  exercice: ExerciceOrthographe;
  classe: Classe;
  /** Les mots de l'enseignant, un par ligne ; vides : ceux de la classe. */
  mots: string;
  /** Combien de mots pour la dictée de mots : de 4 à 10, selon la période. */
  combien: number;
  /** La version des plus fragiles : les mots à trous, la liste écourtée. */
  aide: boolean;
  /** La lettre étudiée pour « s, c, g ». */
  lettre: "s" | "c" | "g";
}

export const REGLAGES_ORTHOGRAPHE: ReglagesOrthographe = { exercice: "dicteeDeMots", classe: "CE1", mots: "", combien: 8, aide: false, lettre: "g" };

const TETE = '<div class="sous">Prénom : ........................................ Date : ........................</div>';
const titre = (t: string) => `<div class="titre">${escapeHtml(t)}</div>`;
const regle = (t: string) => `<div class="regle">${t}</div>`;
const lignes = (n: number, classe = "or-ligne") => Array.from({ length: n }, () => `<div class="${classe}"></div>`).join("");
const motsSaisis = (texte: string) => texte.split("\n").map((l) => l.trim()).filter(Boolean);

// ── Les mots de chaque classe ─────────────────────────────────────────────

/** Les mots fréquents de chaque classe, à mémoriser : mots-outils et mots invariables. */
export const MOTS_FREQUENTS: Record<Classe, string[]> = {
  CP: ["et", "est", "un", "une", "dans", "avec", "sur", "pour", "mais", "qui", "très", "il y a", "aussi", "voici", "beaucoup", "maman", "papa", "école"],
  CE1: ["aujourd'hui", "toujours", "maintenant", "beaucoup", "ensuite", "alors", "après", "avant", "pendant", "souvent", "parce que", "quand", "jamais", "ici", "là-bas", "loin", "près", "tôt", "aussitôt", "plutôt"],
  CE2: ["autrefois", "bientôt", "cependant", "désormais", "environ", "longtemps", "parfois", "quelquefois", "soudain", "tandis que", "vraiment", "pourtant", "lorsque", "dehors", "dessous", "dessus", "hier", "demain"],
};

/** Les listes analogiques : des mots qui partagent la même correspondance ou le même morceau. */
export const LISTES_ANALOGIQUES: Record<Classe, { tete: string; mots: string[] }[]> = {
  CP: [
    { tete: "quarante", mots: ["cinquante", "soixante"] },
    { tete: "maison", mots: ["mais", "raisin"] },
    { tete: "chaise", mots: ["fraise", "braise"] },
    { tete: "faire", mots: ["taire", "plaire"] },
    { tete: "maisonnette", mots: ["fillette", "tablette"] },
    { tete: "coiffer", mots: ["coiffeur", "coiffure"] },
  ],
  CE1: [
    { tete: "maison", mots: ["mais", "la paix", "la craie", "une saison", "du raisin"] },
    { tete: "fête", mots: ["une bête", "être", "une forêt", "prêter"] },
    { tete: "tôt", mots: ["aussitôt", "plutôt", "bientôt"] },
    { tete: "coiffeur", mots: ["danseur", "chanteur", "nageur"] },
    { tete: "ici", mots: ["là-bas", "loin", "près"] },
  ],
  CE2: [
    { tete: "bateau", mots: ["chapeau", "gâteau", "râteau"] },
    { tete: "jaune", mots: ["chaud", "autre", "aussi"] },
    { tete: "nez", mots: ["chez", "assez"] },
    { tete: "neige", mots: ["peigne", "baleine"] },
    { tete: "enfant", mots: ["dent", "vent", "souvent"] },
    { tete: "attention", mots: ["récréation", "addition", "opération"] },
  ],
};

/** Le mot à la lettre muette, et le mot de sa famille qui la fait entendre. */
export const LETTRES_MUETTES: Record<Classe, [string, string][]> = {
  CP: [["chat", "chaton"], ["gros", "grossir"], ["petit", "petite"], ["grand", "grande"], ["lait", "laitier"], ["rat", "raton"], ["dent", "dentiste"], ["froid", "froide"], ["sport", "sportif"], ["bavard", "bavarder"]],
  CE1: [["blanc", "blanche"], ["sang", "sanguin"], ["chant", "chanter"], ["surpris", "surprise"], ["camp", "camper"], ["galop", "galoper"], ["regard", "regarder"], ["retard", "retarder"], ["gris", "grise"], ["tapis", "tapisser"]],
  CE2: [["plomb", "plombier"], ["rang", "ranger"], ["long", "longue"], ["bond", "bondir"], ["début", "débuter"], ["climat", "climatiser"], ["accord", "accorder"], ["univers", "universel"], ["tricot", "tricoter"], ["respect", "respecter"]],
};

/** La valeur des lettres s, c, g : les mots de chaque son. */
export const VALEURS: Record<"s" | "c" | "g", { sons: { son: string; regle: string; mots: string[] }[] }> = {
  g: { sons: [
    { son: "[g] comme gâteau", regle: "g devant a, o, u, ou devant une consonne ; gu devant e, i", mots: ["garder", "gai", "gorille", "gamin", "élégant", "figure", "guitare", "guêpe", "glace", "gris"] },
    { son: "[ʒ] comme girafe", regle: "g devant e, i, y ; ge devant a, o", mots: ["girafe", "gendarme", "geste", "agiter", "gentiment", "page", "orange", "nageoire", "pigeon", "bougie"] },
  ] },
  c: { sons: [
    { son: "[k] comme carotte", regle: "c devant a, o, u, ou devant une consonne", mots: ["carotte", "coq", "cube", "sac", "lac", "école", "crayon", "classe", "culotte", "canard"] },
    { son: "[s] comme cinéma", regle: "c devant e, i, y ; ç devant a, o, u", mots: ["cinéma", "ceci", "glace", "lacet", "citron", "cerise", "garçon", "leçon", "reçu", "façade"] },
  ] },
  s: { sons: [
    { son: "[s] comme serpent", regle: "s au début du mot, ou à côté d'une consonne ; ss entre deux voyelles", mots: ["serpent", "sac", "poisson", "tasse", "penser", "veste", "bosse", "salade", "dessin", "sapin"] },
    { son: "[z] comme poison", regle: "s entre deux voyelles", mots: ["poison", "maison", "rose", "cousin", "oiseau", "chemise", "valise", "vase", "raisin", "désert"] },
  ] },
};

/** m devant m, b, p : des mots à compléter par m ou n. */
export const MOTS_MBP: string[] = ["lampe", "chambre", "temps", "pompier", "jambe", "tambour", "ombre", "combien", "champ", "timbre", "emmener", "simple", "compter", "manger", "tante", "vent", "monter", "dinde", "chanter", "pendule"];

/** Les accents : des mots pour chacun. */
export const MOTS_ACCENTS: { mot: string; accent: "aigu" | "grave" | "circonflexe" }[] = [
  { mot: "école", accent: "aigu" }, { mot: "bébé", accent: "aigu" }, { mot: "été", accent: "aigu" }, { mot: "café", accent: "aigu" }, { mot: "étoile", accent: "aigu" },
  { mot: "mère", accent: "grave" }, { mot: "frère", accent: "grave" }, { mot: "chèvre", accent: "grave" }, { mot: "flèche", accent: "grave" }, { mot: "là", accent: "grave" },
  { mot: "fête", accent: "circonflexe" }, { mot: "tête", accent: "circonflexe" }, { mot: "forêt", accent: "circonflexe" }, { mot: "château", accent: "circonflexe" }, { mot: "île", accent: "circonflexe" },
];

// ── Les textes des dictées ────────────────────────────────────────────────

/** La dictée préparée du CP : la phrase du guide (p. 80), puis d'autres, faites des lettres muettes apprises. */
export const DICTEES_CP = [
  "Assise sur le sable, Lisa lit le journal.",
  "Le chat de Malo dort sur le lit.",
  "Une balle ronde roule sous le banc.",
  "Papa a garé la moto devant la maison.",
  "Les petits lapins mangent des carottes.",
];

/** La phrase du jour : une phrase déclinée sur la semaine, un élément qui change chaque jour ; au CE1, l'exemple du guide (p. 102). */
export const PHRASES_DU_JOUR: Record<Classe, string[]> = {
  CP: ["Léo a un vélo.", "Léo a un vélo rouge.", "Léo et Lila ont un vélo rouge.", "Léo et Lila ont des vélos rouges.", "Léo et Lila ont des vélos rouges et un ballon."],
  CE1: ["Emma dessine une tête.", "Emma dessine une grosse tête.", "Emma dessine une grosse tête de clown avec des oreilles.", "Emma et Lucie dessinent des têtes de clown.",
    "Emma et Lucie dessinent des têtes de clown avec des oreilles.", "Emma et Lucie dessinent des oreilles rouges et un nez énorme.", "Emma et Lucie dessinent des têtes de clown énormes et amusantes."],
  CE2: ["Le petit chat de la voisine joue dans le jardin.", "Les petits chats de la voisine jouent dans le jardin.", "Les petits chats de la voisine jouaient dans le jardin.",
    "Demain, les petits chats de la voisine joueront dans le jardin.", "Hier, les petits chats de la voisine ont joué dans le jardin."],
};

/** La dictée à choix multiples : « {seau|sot|saut} », la bonne forme d'abord. */
export const CHOIX_MULTIPLES: Record<Classe, string[]> = {
  CP: ["Je lance un {ballon|ballons} rond.", "Il y a des {ballons|ballon} ronds.", "Une balle {ronde|rond} roule.", "Le chat {miaule|miaulent}.", "Les chats {miaulent|miaule}.", "La voiture {roule|roulent}.", "Les voitures {roulent|roule}."],
  CE1: ["Le {seau|sot|saut} est rempli d'eau.", "Les {élèves|élève|élèvent} écoutent la maîtresse.", "Mes cousins {jouent|joue|joues} au ballon.", "Il {a|à} un chien.", "Nous allons {à|a} l'école.",
    "Le chat {et|est} le chien dorment.", "Le chat {est|et} noir.", "Elle porte une robe {verte|vert|vertes}.", "Les {petits|petit|petite} chiens aboient."],
  CE2: ["Les {chevaux|chevals} galopent dans le pré.", "Les {journaux|journals} sont sur la table.", "Ma sœur est {joyeuse|joyeux}.", "Cette {lectrice|lecteur} aime les romans.", "Nous {jouons|jouont} dehors.",
    "Vous {faites|faisez} du vélo.", "Ils {vont|allent} à la piscine.", "Hier, il {a|à} pris le bus.", "Demain, nous {irons|allerons} au musée."],
};

/** L'autodictée : des groupes de sens, séparés par « | », pour mémoriser ; de la phrase simple à deux ou trois phrases. */
export const AUTODICTEES: Record<Classe, string[]> = {
  CP: ["Le chat de Lila | dort | sur le lit.", "Le petit lapin | mange | une carotte."],
  CE1: ["Le chien | aboie.", "Le petit chien noir | aboie.", "Le petit chien noir | aboie très fort | dans le jardin.", "Le petit chien noir | aboie | dans le jardin. | Il a vu | un chat | sur le mur."],
  CE2: ["Ce matin, | les enfants | sont partis | en classe de découverte. | Ils emportent | des sacs | et des gourdes. | Ils reviendront | vendredi soir.",
    "Hier, | les pompiers | sont venus | à l'école. | Ils nous ont montré | leur grand camion rouge. | Nous avons posé | beaucoup de questions."],
};

/** La dictée à trous : « [mot] » est la lacune ; l'adulte lit le texte entier. */
export const A_TROUS: Record<Classe, string[]> = {
  CP: ["Le chat [miaule]. Les chats [miaulent]. Un ballon [rond], une balle [ronde], des ballons [ronds].", "La voiture [roule]. Les voitures [roulent]. Une [olive], des [olives]."],
  CE1: ["Le [petit] chat [est] sur le mur. Les [enfants] [jouent] dans la cour. Lila [a] un vélo [rouge].", "Les [grosses] poules [sont] dans la cour de la ferme. Le coq [chante] [et] les poussins [picorent]."],
  CE2: ["Les [grandes] [vagues] [frappent] les [rochers] [noirs]. Une [mouette] [blanche] [plane] au-dessus [des] [bateaux].", "Les [chevaux] [galopaient] dans les prés [verts]. Demain, ils [iront] à l'écurie [avec] leurs [cavalières]."],
};

/** La fausse dictée : le texte avec les erreurs, puis le texte juste ; on dit sur quoi elles portent, pas où elles sont. */
export const PIEGEES: Record<Classe, { faux: string; juste: string; sur: string }[]> = {
  CP: [{ faux: "Les chat miaule. Une balle rond roule.", juste: "Les chats miaulent. Une balle ronde roule.", sur: "les marques du pluriel et du féminin" }],
  CE1: [
    { faux: "Les enfant jouent dans la cour. Le chien noire aboie. Mes amis mange des pommes.", juste: "Les enfants jouent dans la cour. Le chien noir aboie. Mes amis mangent des pommes.", sur: "les accords dans le groupe nominal et le -nt du verbe" },
    { faux: "Il à un chat et un chien. Le chat et gris. Les poules sont dans la cour de la ferme.", juste: "Il a un chat et un chien. Le chat est gris. Les poules sont dans la cour de la ferme.", sur: "a et à, et et est" },
  ],
  CE2: [
    { faux: "Les cheval galopent dans le pré. Ma tante est joyeux. Les petites filles regarde les journals.", juste: "Les chevaux galopent dans le pré. Ma tante est joyeuse. Les petites filles regardent les journaux.", sur: "les pluriels en -aux, le féminin des adjectifs, l'accord du verbe" },
    { faux: "Demain, nous allerons au musée. Vous faisez une maquette. Hier, ils sont allé à la piscine.", juste: "Demain, nous irons au musée. Vous faites une maquette. Hier, ils sont allés à la piscine.", sur: "les verbes aller et faire" },
  ],
};

// ── Les outils ────────────────────────────────────────────────────────────

const VOYELLES = "aeiouyàâäéèêëîïôöùûüœ";
const INSEPARABLES = ["bl", "br", "cl", "cr", "dr", "fl", "fr", "gl", "gr", "pl", "pr", "tr", "vr", "ch", "ph", "gn", "th"];
const voyelle = (c: string) => VOYELLES.includes(c.toLowerCase());

/** Les syllabes écrites d'un mot, à la manière de l'escalier du guide : es, ca, lier. */
export function syllabesEcrites(mot: string): string[] {
  const s: string[] = [];
  let debut = 0, i = 0;
  const n = mot.length;
  while (i < n) {
    // Avancer jusqu'à la fin du groupe de voyelles.
    while (i < n && !voyelle(mot[i])) i++;
    while (i < n && voyelle(mot[i])) i++;
    if (i >= n) break;
    // Les consonnes qui suivent, jusqu'à la prochaine voyelle.
    let j = i;
    while (j < n && !voyelle(mot[j])) j++;
    if (j >= n) break; // consonnes finales : elles restent à la dernière syllabe
    const consonnes = mot.slice(i, j);
    const coupe = consonnes.length <= 1 ? i : INSEPARABLES.includes(consonnes.slice(-2).toLowerCase()) ? j - 2 : j - 1;
    s.push(mot.slice(debut, coupe));
    debut = coupe;
    i = coupe;
  }
  s.push(mot.slice(debut));
  return s.filter(Boolean);
}

/** L'escalier : es, esca, escalier. */
export const escalier = (mot: string) => syllabesEcrites(mot).map((_, k, t) => t.slice(0, k + 1).join(""));

/** Les mots d'un texte, comme on les compte au CP : « l'enfant » en fait deux. */
export const motsDuTexte = (texte: string) => texte.replace(/[.,!?;:«»"—–]/g, " ").split(/[\s'’]+/).filter(Boolean);
export const signesDePonctuation = (texte: string) => (texte.match(/[.,!?;:]/g) ?? []).length;
export const phrasesDuTexte = (texte: string) => (texte.match(/[^.!?]+[.!?]+/g) ?? [texte]).map((p) => p.trim()).filter(Boolean);

/** Une phrase de dictée à choix : ses morceaux, et la bonne forme de chaque choix. */
export function choixDe(phrase: string, alea: () => number): { html: string; juste: string } {
  let juste = phrase;
  const html = escapeHtml(phrase).replace(/\{([^}]+)\}/g, (_m, liste: string) => {
    const formes = liste.split("|");
    return `<span class="or-choix">${melanger(alea, formes).map((f) => `<span>${f}</span>`).join("")}</span>`;
  });
  juste = phrase.replace(/\{([^}|]+)[^}]*\}/g, "$1");
  return { html, juste };
}

// ── Les feuilles ──────────────────────────────────────────────────────────

/** La dictée de mots : la page de l'élève (lignes numérotées, ou mots à trous), et la liste pour l'adulte. */
function feuilleDicteeDeMots(r: ReglagesOrthographe, graine: number, motsDeLaClasse: string[]): string {
  const saisis = motsSaisis(r.mots);
  const source = saisis.length ? saisis : motsDeLaClasse.length ? motsDeLaClasse : MOTS_FREQUENTS[r.classe];
  const n = Math.max(4, Math.min(10, r.combien));
  const mots = (saisis.length ? source : melanger(hasard(graine), source)).slice(0, r.aide ? Math.max(4, n - 2) : n);
  const trou = (m: string) => {
    // Les plus fragiles : une lettre sur deux à trouver, au milieu du mot.
    const k = Math.max(1, Math.floor(m.length / 2));
    return escapeHtml(m.slice(0, k - 1)) + '<span class="or-trou"></span>' + escapeHtml(m.slice(k));
  };
  const items = mots.map((m, i) => `<div class="or-num"><b>${i + 1}.</b> ${r.aide ? `<span class="or-atrous">${trou(m)}</span>` : '<span class="or-ligne-mot"></span>'}</div>`).join("");
  const consigne = r.aide
    ? "Écoute le mot, dis-le en écrivant, complète les lettres qui manquent. Relis-toi."
    : "Écoute le mot, répète-le à voix basse, écris-le en le disant. Relis-toi : chaque son est-il écrit ?";
  return `<div class="page">${titre("La dictée de mots")}${TETE}${regle(consigne)}<div class="or-liste">${items}</div></div>
    <div class="page corrige">${titre("La dictée de mots — pour l'adulte")}${regle("Dire chaque mot deux fois, dans une phrase si besoin ; laisser le temps d'écrire en prononçant. Relever les cahiers : souligner les erreurs sans les corriger, puis une séance de correction.")}
      <div class="or-corrige">${mots.map((m, i) => `<div><b>${i + 1}.</b> ${escapeHtml(m)}</div>`).join("")}</div></div>`;
}

/** La dictée préparée du CP, en quatre temps : lire et comprendre, compter, copier en prononçant, écrire sous la dictée. */
function feuilleDicteePreparee(r: ReglagesOrthographe, graine: number): string {
  const textes = r.classe === "CP" ? DICTEES_CP : AUTODICTEES[r.classe].map((t) => t.replace(/\s*\|\s*/g, " "));
  const texte = textes[Math.floor(hasard(graine)() * textes.length)];
  const mots = motsDuTexte(texte);
  const desordre = melanger(hasard(graine + 1), [...new Set(mots.filter((m) => m.length > 2))]).slice(0, 5);
  const page1 = `<div class="page">${titre("La dictée préparée — je prépare")}${TETE}${regle("1. Je lis le texte en silence, puis à voix haute. 2. Je compte. 3. Je le copie en disant tout ce que j'écris, en sautant une ligne. 4. Je vérifie : si je me suis trompé, je ne raye pas, je fais un petit trait dessous et je réécris le mot au-dessus.")}
    <div class="or-texte${r.classe === "CP" ? " or-cp" : ""}">${escapeHtml(texte)}</div>
    <div class="or-compte">Je compte : <span class="or-case"></span> phrase(s) &nbsp; <span class="or-case"></span> mots &nbsp; <span class="or-case"></span> signes de ponctuation</div>
    <div class="or-sous-titre">Je copie en disant ce que j'écris</div>${lignes(4, "or-ligne or-sautee")}</div>`;
  const page2 = `<div class="page">${titre("La dictée préparée — j'écris sous la dictée")}${TETE}${regle("J'écoute, je répète, j'écris en disant ce que j'écris. Puis je retrouve le texte caché et je vérifie.")}
    <div class="or-sous-titre">Les mots, dans le désordre</div><div class="or-liste">${desordre.map((_, i) => `<div class="or-num"><b>${i + 1}.</b> <span class="or-ligne-mot"></span></div>`).join("")}</div>
    <div class="or-sous-titre">Le texte</div>${lignes(4, "or-ligne or-sautee")}</div>`;
  const corrige = `<div class="page corrige">${titre("La dictée préparée — pour l'adulte")}<div class="or-corrige">
    <div>Le texte : <b>${escapeHtml(texte)}</b></div>
    <div>${phrasesDuTexte(texte).length} phrase(s), ${mots.length} mots (« l'enfant » en compte deux), ${signesDePonctuation(texte)} signe(s) de ponctuation.</div>
    <div>Les mots dans le désordre : ${desordre.map(escapeHtml).join(", ")}.</div>
    <div class="or-gris">Guide CP, p. 86 : s'assurer de la compréhension par un questionnement simple ; à la fin, dicter quelques mots des dictées précédentes pour réviser.</div></div></div>`;
  return page1 + page2 + corrige;
}

function feuillePhraseDuJour(r: ReglagesOrthographe): string {
  const phrases = PHRASES_DU_JOUR[r.classe];
  const jours = phrases.map((_, i) => `<div class="or-jour"><div class="or-j">Jour ${i + 1}</div>${lignes(r.classe === "CP" ? 1 : 2)}<div class="or-change">Ce qui a changé : <span class="or-pointilles"></span></div></div>`).join("");
  return `<div class="page">${titre("La phrase du jour")}${TETE}${regle("Chaque jour, une phrase dictée : la même que la veille, avec un élément qui change. J'écris, puis on compare les propositions au tableau et on se met d'accord en justifiant.")}${jours}</div>
    <div class="page corrige">${titre("La phrase du jour — la progression")}${regle("Lire la phrase, la faire reformuler ; pendant la dictée, relever les propositions sur les cahiers ; les recopier au tableau sans valider ; organiser l'échange : supprimer les propositions erronées en justifiant, avec les outils de la classe. Les mots rencontrés enrichissent les listes analogiques. — Guide CE1, p. 102-103.")}
      <div class="or-corrige">${phrases.map((p, i) => `<div><b>Jour ${i + 1}.</b> ${escapeHtml(p)}</div>`).join("")}</div></div>`;
}

function feuilleChoixMultiples(r: ReglagesOrthographe, graine: number): string {
  const alea = hasard(graine);
  const phrases = melanger(alea, CHOIX_MULTIPLES[r.classe]).slice(0, 7).map((p) => choixDe(p, alea));
  const justifier = r.classe === "CE2";
  return `<div class="page">${titre("La dictée à choix multiples")}${TETE}${regle(`L'adulte lit chaque phrase. Entoure la forme qui convient.${justifier ? " Explique ton choix pour deux d'entre elles." : ""}`)}
    <div class="or-liste">${phrases.map((p, i) => `<div class="or-phrase"><b>${i + 1}.</b> ${p.html}</div>`).join("")}</div>${justifier ? `<div class="or-sous-titre">J'explique</div>${lignes(3)}` : ""}</div>
    <div class="page corrige">${titre("La dictée à choix multiples — corrigé")}<div class="or-corrige">${phrases.map((p, i) => `<div><b>${i + 1}.</b> ${escapeHtml(p.juste)}</div>`).join("")}</div></div>`;
}

function feuilleAutodictee(r: ReglagesOrthographe, graine: number): string {
  const textes = AUTODICTEES[r.classe];
  const texte = textes[Math.min(textes.length - 1, Math.floor(hasard(graine)() * textes.length))];
  const groupes = texte.split("|").map((g) => g.trim());
  const propre = groupes.join(" ");
  const nLignes = Math.max(2, Math.ceil(propre.length / 45));
  return `<div class="page">${titre("L'autodictée — j'apprends")}${TETE}${regle("Je lis le texte. Je repère les mots difficiles et je les souligne. Je l'apprends groupe de sens par groupe de sens, en épelant les mots difficiles. Je cache, je me le redis, je vérifie.")}
    <div class="or-groupes">${groupes.map((g) => `<span>${escapeHtml(g)}</span>`).join("")}</div>
    <div class="or-sous-titre">Les mots difficiles que je dois retenir</div>${lignes(2)}</div>
    <div class="page">${titre("L'autodictée — j'écris de mémoire")}${TETE}${regle("J'écris le texte que j'ai appris, sans le modèle. Puis je relis : les majuscules et les points, les accords, les mots difficiles.")}${lignes(nLignes + 1, "or-ligne or-sautee")}
      <div class="or-verif"><span class="or-case"></span> majuscules et points &nbsp; <span class="or-case"></span> les accords &nbsp; <span class="or-case"></span> les mots difficiles</div></div>
    <div class="page corrige">${titre("L'autodictée — le texte")}<div class="or-corrige"><div><b>${escapeHtml(propre)}</b></div><div class="or-gris">Guide CE1, p. 101 : préparer le texte en classe, le découper en groupes de sens, l'apprendre, le restituer seul ; de la phrase simple à deux ou trois phrases en fin d'année.</div></div></div>`;
}

function feuilleATrous(r: ReglagesOrthographe, graine: number): string {
  const textes = A_TROUS[r.classe];
  const texte = textes[Math.floor(hasard(graine)() * textes.length)];
  const eleve = escapeHtml(texte).replace(/\[([^\]]+)\]/g, (_m, mot: string) => `<span class="or-lacune" style="width:${Math.max(16, mot.length * 4.2)}mm"></span>`);
  const juste = escapeHtml(texte).replace(/\[([^\]]+)\]/g, "<b>$1</b>");
  return `<div class="page">${titre("La dictée à trous")}${TETE}${regle("L'adulte lit tout le texte. Écris dans chaque case le mot qui manque. Relis : pense aux accords.")}<div class="or-texte or-trous">${eleve}</div></div>
    <div class="page corrige">${titre("La dictée à trous — le texte à lire")}<div class="or-texte">${juste}</div></div>`;
}

function feuillePiegee(r: ReglagesOrthographe, graine: number): string {
  const liste = PIEGEES[r.classe];
  const p = liste[Math.floor(hasard(graine)() * liste.length)];
  const fautes = p.faux.split(" ").filter((m, i) => m !== p.juste.split(" ")[i]).length;
  const corrige = p.juste.split(" ").map((m, i) => (m !== p.faux.split(" ")[i] ? `<b>${escapeHtml(m)}</b>` : escapeHtml(m))).join(" ");
  return `<div class="page">${titre("La fausse dictée")}${TETE}${regle(`Ce texte contient ${fautes} erreurs sur ${escapeHtml(p.sur)}. Trouve-les, souligne-les, puis recopie le texte sans erreur.`)}
    <div class="or-texte">${escapeHtml(p.faux)}</div>${lignes(4, "or-ligne or-sautee")}</div>
    <div class="page corrige">${titre("La fausse dictée — corrigé")}<div class="or-texte">${corrige}</div></div>`;
}

function feuilleMemoriser(r: ReglagesOrthographe, graine: number): string {
  const saisis = motsSaisis(r.mots);
  const mots = (saisis.length ? saisis : melanger(hasard(graine), MOTS_FREQUENTS[r.classe])).slice(0, 8);
  const lignesMots = mots.map((m) => `<tr><td class="or-mot">${escapeHtml(m)}</td><td></td><td class="or-centre"><span class="or-case"></span></td></tr>`).join("");
  const longs = [...mots].sort((a, b) => b.length - a.length).filter((m) => !m.includes(" ")).slice(0, 3);
  const escaliers = longs.map((m) => `<div class="or-escalier">${escalier(m).map((e, k) => `<div style="margin-left:${k * 6}mm">${escapeHtml(e)}</div>`).join("")}</div>`).join("");
  return `<div class="page">${titre("Mémoriser des mots")}${TETE}
    ${regle("J'observe le mot. Je le lis. Je l'épelle. Je ferme les yeux et j'essaie de le voir dans ma tête. Je vérifie à nouveau comment il s'écrit. Je le cache et je l'écris. — Guide CE1, p. 105.")}
    <table class="or-tableau"><tr><th>Le mot</th><th>Je l'écris sans le regarder</th><th>Juste ?</th></tr>${lignesMots}</table>
    <div class="or-sous-titre">L'escalier : j'écris le mot marche après marche</div><div class="or-escaliers">${escaliers}</div></div>`;
}

function feuilleListes(r: ReglagesOrthographe): string {
  const listes = LISTES_ANALOGIQUES[r.classe];
  const items = listes.map((l) => `<div class="or-carte-liste"><div class="or-tete">${escapeHtml(l.tete)}</div><div>${l.mots.slice(0, 2).map(escapeHtml).join(", ")}, …</div>${lignes(2)}</div>`).join("");
  return `<div class="page">${titre("Les listes analogiques")}${TETE}${regle("Ces mots s'écrivent de la même façon à un endroit. Trouve ce qu'ils ont en commun, souligne-le, et complète chaque liste avec d'autres mots.")}<div class="or-listes">${items}</div></div>
    <div class="page corrige">${titre("Les listes analogiques — des exemples")}<div class="or-corrige">${listes.map((l) => `<div><b>${escapeHtml(l.tete)}</b> : ${l.mots.map(escapeHtml).join(", ")}</div>`).join("")}</div></div>`;
}

function feuilleLettreMuette(r: ReglagesOrthographe, graine: number): string {
  const paires = melanger(hasard(graine), LETTRES_MUETTES[r.classe]).slice(0, 8);
  const cp = r.classe === "CP";
  const items = paires.map(([mot, famille], i) => `<tr><td><b>${i + 1}.</b> ${escapeHtml(mot.slice(0, -1))}<span class="or-trou"></span></td><td>${cp ? `je pense à : <i>${escapeHtml(famille)}</i>` : ""}</td><td></td></tr>`).join("");
  return `<div class="page">${titre("La lettre muette et la famille du mot")}${TETE}${regle(cp
    ? "La dernière lettre de ces mots ne s'entend pas. Le mot de la même famille la fait entendre : écris la lettre qui manque, puis le mot entier."
    : "La dernière lettre ne s'entend pas : trouve un mot de la même famille qui la fait entendre, puis écris le mot entier.")}
    <table class="or-tableau"><tr><th>Le mot</th><th>${cp ? "L'indice" : "Un mot de la même famille"}</th><th>J'écris le mot</th></tr>${items}</table></div>
    <div class="page corrige">${titre("La lettre muette — corrigé")}<div class="or-corrige">${paires.map(([m, f], i) => `<div><b>${i + 1}.</b> ${escapeHtml(m)} — ${escapeHtml(f)}</div>`).join("")}</div></div>`;
}

function feuilleValeurLettres(r: ReglagesOrthographe, graine: number): string {
  const v = VALEURS[r.lettre];
  const alea = hasard(graine);
  // Sept mots de chaque son, pris au hasard, mêlés dans la boîte.
  const pris = v.sons.map((son) => melanger(alea, son.mots).slice(0, 7));
  const tous = melanger(alea, pris.flat());
  return `<div class="page">${titre(`La lettre ${r.lettre} : une lettre, deux sons`)}${TETE}${regle(`Lis chaque mot à voix haute. Écris-le dans la colonne du son que fait la lettre ${r.lettre}. Puis entoure la lettre qui suit : c'est elle qui décide.`)}
    <div class="or-banque">${tous.map((m) => `<span>${escapeHtml(m)}</span>`).join("")}</div>
    <table class="or-tableau or-colonnes"><tr>${v.sons.map((s) => `<th>${escapeHtml(s.son)}</th>`).join("")}</tr><tr>${v.sons.map(() => `<td>${lignes(7, "or-ligne or-serree")}</td>`).join("")}</tr></table></div>
    <div class="page corrige">${titre(`La lettre ${r.lettre} — corrigé`)}<div class="or-corrige">${v.sons.map((s, k) => `<div><b>${escapeHtml(s.son)}</b> (${escapeHtml(s.regle)}) : ${pris[k].map(escapeHtml).join(", ")}</div>`).join("")}</div></div>`;
}

function feuilleMbp(_r: ReglagesOrthographe, graine: number): string {
  const mots = melanger(hasard(graine), MOTS_MBP).slice(0, 12);
  const trou = (m: string) => {
    const i = m.search(/[aeiouy][mn](?=[^aeiouyéèê])/);
    return i < 0 ? escapeHtml(m) : escapeHtml(m.slice(0, i + 1)) + '<span class="or-trou"></span>' + escapeHtml(m.slice(i + 2));
  };
  return `<div class="page">${titre("m devant m, b, p")}${TETE}${regle("Complète avec m ou n. Devant m, b, p, on écrit m : la lampe, la chambre. Regarde la lettre qui suit.")}
    <div class="or-grille">${mots.map((m, i) => `<div><b>${i + 1}.</b> ${trou(m)}</div>`).join("")}</div></div>
    <div class="page corrige">${titre("m devant m, b, p — corrigé")}<div class="or-corrige or-grille">${mots.map((m, i) => `<div><b>${i + 1}.</b> ${escapeHtml(m)}</div>`).join("")}</div></div>`;
}

function feuilleAccents(r: ReglagesOrthographe, graine: number): string {
  const mots = melanger(hasard(graine), MOTS_ACCENTS).slice(0, 12);
  if (r.classe === "CP") {
    return `<div class="page">${titre("Les accents")}${TETE}${regle("Entoure l'accent : l'accent aigu ( ´ ) en bleu, l'accent grave ( ` ) en rouge, l'accent circonflexe ( ^ ) en vert. Puis écris son nom.")}
      <table class="or-tableau"><tr><th>Le mot</th><th>L'accent</th></tr>${mots.map((m) => `<tr><td class="or-mot or-grand">${escapeHtml(m.mot)}</td><td></td></tr>`).join("")}</table></div>
      <div class="page corrige">${titre("Les accents — corrigé")}<div class="or-corrige or-grille">${mots.map((m) => `<div>${escapeHtml(m.mot)} : accent ${m.accent}</div>`).join("")}</div></div>`;
  }
  const trou = (m: string) => escapeHtml(m).replace(/[éèêâîôûà]/, '<span class="or-trou"></span>');
  return `<div class="page">${titre("Les accents")}${TETE}${regle("Complète avec la bonne lettre : é, è, ê, à, â, î, ô… Dis le mot à voix haute : l'accent change le son.")}
    <div class="or-grille">${mots.map((m, i) => `<div><b>${i + 1}.</b> ${trou(m.mot)}</div>`).join("")}</div></div>
    <div class="page corrige">${titre("Les accents — corrigé")}<div class="or-corrige or-grille">${mots.map((m, i) => `<div><b>${i + 1}.</b> ${escapeHtml(m.mot)}</div>`).join("")}</div></div>`;
}

/** La feuille ; `motsDeLaClasse` : pour la dictée de mots, ceux du graphème de la période, quand la séquence les donne. */
export function htmlOrthographe(r: ReglagesOrthographe, graine: number, motsDeLaClasse: string[] = []): string {
  const corps = r.exercice === "dicteeDeMots" ? feuilleDicteeDeMots(r, graine, motsDeLaClasse)
    : r.exercice === "dicteePreparee" ? feuilleDicteePreparee(r, graine)
      : r.exercice === "phraseDuJour" ? feuillePhraseDuJour(r)
        : r.exercice === "choixMultiples" ? feuilleChoixMultiples(r, graine)
          : r.exercice === "autodictee" ? feuilleAutodictee(r, graine)
            : r.exercice === "aTrous" ? feuilleATrous(r, graine)
              : r.exercice === "piegee" ? feuillePiegee(r, graine)
                : r.exercice === "memoriser" ? feuilleMemoriser(r, graine)
                  : r.exercice === "listes" ? feuilleListes(r)
                    : r.exercice === "lettreMuette" ? feuilleLettreMuette(r, graine)
                      : r.exercice === "valeurLettres" ? feuilleValeurLettres(r, graine)
                        : r.exercice === "mbp" ? feuilleMbp(r, graine)
                          : feuilleAccents(r, graine);
  return feuille(corps, "or");
}

export const STYLE_ORTHOGRAPHE = `
  .feuille.or .or-ligne { border-bottom: 1px solid #9aa0b4; height: 10mm; }
  .feuille.or .or-ligne.or-sautee { height: 10mm; margin-bottom: 8mm; }
  .feuille.or .or-ligne.or-serree { height: 8.5mm; }
  .feuille.or .or-liste { display: block; }
  .feuille.or .or-num { font-size: 15px; line-height: 2.6; }
  .feuille.or .or-num b, .feuille.or .or-phrase b { color: #687087; margin-right: 2mm; }
  .feuille.or .or-ligne-mot { display: inline-block; width: 90mm; border-bottom: 1px solid #9aa0b4; height: 7mm; vertical-align: bottom; }
  .feuille.or .or-atrous { font-size: 20px; letter-spacing: 1px; }
  .feuille.or .or-trou { display: inline-block; width: 7mm; height: 7mm; border-bottom: 2px solid #1c2233; margin: 0 1px; vertical-align: -1mm; }
  .feuille.or .or-texte { font-size: 19px; line-height: 2.1; margin: 3mm 0 5mm; }
  .feuille.or .or-texte.or-cp { font-size: 23px; }
  .feuille.or .or-trous { line-height: 2.6; }
  .feuille.or .or-lacune { display: inline-block; height: 8mm; border: 1.5px solid #1c2233; border-radius: 1.5mm; vertical-align: -2mm; margin: 0 1mm; }
  .feuille.or .or-compte { font-size: 14px; margin: 0 0 5mm; line-height: 2; }
  .feuille.or .or-case { display: inline-block; width: 8mm; height: 7mm; border: 1.5px solid #1c2233; border-radius: 1mm; vertical-align: -2mm; }
  .feuille.or .or-sous-titre { font-size: 14px; font-weight: 800; margin: 5mm 0 2mm; }
  .feuille.or .or-jour { margin: 0 0 2.5mm; page-break-inside: avoid; break-inside: avoid; }
  .feuille.or .or-jour .or-ligne { height: 8.5mm; }
  .feuille.or .or-j { font-size: 12px; font-weight: 800; color: #687087; }
  .feuille.or .or-change { font-size: 11.5px; color: #4a5168; margin-top: 1mm; }
  .feuille.or .or-pointilles { display: inline-block; width: 110mm; border-bottom: 1px dotted #687087; height: 4mm; }
  .feuille.or .or-phrase { font-size: 16px; line-height: 2.3; }
  .feuille.or .or-choix > span { display: inline-block; border: 1px solid #9aa0b4; border-radius: 3mm; padding: 0 2.5mm; margin: 0 1mm; line-height: 1.6; }
  .feuille.or .or-groupes { font-size: 19px; line-height: 2.4; margin: 3mm 0 6mm; }
  .feuille.or .or-groupes span { border-bottom: 2.5px solid #2454e6; border-radius: 0 0 12px 12px; padding: 0 2px 3px; margin-right: 3mm; }
  .feuille.or .or-verif { font-size: 13px; margin-top: 4mm; line-height: 2; }
  .feuille.or .or-tableau { width: 100%; border-collapse: collapse; font-size: 14px; margin: 2mm 0 5mm; }
  .feuille.or .or-tableau th, .feuille.or .or-tableau td { border: 1px solid #1c2233; padding: 2mm 3mm; text-align: left; vertical-align: middle; }
  .feuille.or .or-tableau th { background: #f7f8fc; font-size: 12px; }
  .feuille.or .or-tableau td { height: 10mm; }
  .feuille.or .or-colonnes td { vertical-align: top; width: 50%; }
  .feuille.or .or-mot { font-weight: 700; font-size: 16px; width: 32%; }
  .feuille.or .or-grand { font-size: 22px; }
  .feuille.or .or-centre { text-align: center !important; width: 16mm; }
  .feuille.or .or-escaliers { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; }
  .feuille.or .or-escalier { font-size: 16px; line-height: 1.9; font-weight: 600; }
  .feuille.or .or-listes { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm 6mm; }
  .feuille.or .or-carte-liste { border: 1px solid #c4c9d6; border-radius: 2mm; padding: 2mm 3mm; font-size: 13px; page-break-inside: avoid; break-inside: avoid; }
  .feuille.or .or-tete { font-weight: 800; font-size: 16px; margin-bottom: 1mm; }
  .feuille.or .or-banque { display: block; margin: 0 0 4mm; font-size: 15px; line-height: 2.3; }
  .feuille.or .or-banque span { display: inline-block; border: 1px solid #9aa0b4; border-radius: 3mm; padding: 0 3mm; margin: 0 2mm 1.5mm 0; line-height: 1.7; }
  .feuille.or .or-grille { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5mm 4mm; font-size: 18px; line-height: 1.8; }
  .feuille.or .or-corrige { font-size: 13.5px; line-height: 1.8; }
  .feuille.or .or-corrige.or-grille { font-size: 14px; }
  .feuille.or .or-gris { color: #687087; font-size: 12px; margin-top: 2mm; }
`;
