// Écrire : les feuilles de la production d'écrits, du CP au CE2.
//
// Programme de français du cycle 2 (2024), « Produire des écrits » : au CP,
// composer des phrases avec des étiquettes, « des gammes d'écriture : J'ai
// un chat./J'ai un … », modifier un passage d'un texte lu (« Jacques a un
// canari jaune. »), écrire un nouvel épisode d'un récit à structure
// répétitive ; au CE1, rédiger une phrase à partir d'une phrase
// prototypique, insérer des connecteurs, retravailler un texte selon une ou
// deux contraintes ; au CE2, écrire pour un destinataire, relire son texte
// méthodiquement. Guide « Pour enseigner la lecture et l'écriture au CE1 »
// (2019), « La rédaction », p. 77-89 : déplacer, ajouter, remplacer,
// supprimer ; les gammes d'écriture ; le jogging d'écriture et ses lanceurs ;
// planifier, écrire, réviser avec une grille de relecture.

import { escapeHtml } from "./print";
import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";
import { reference } from "./references";

export type Classe = "CP" | "CE1" | "CE2";
export type ExerciceEcrire = "motsImposes" | "gammes" | "manipulations" | "oralEcrit" | "lanceurs" | "transformer" | "episode" | "connecteurs" | "planifier" | "relecture" | "message";

export const EXERCICES_ECRIRE: { id: ExerciceEcrire; libelle: string }[] = [
  { id: "motsImposes", libelle: "Une phrase avec des mots imposés" },
  { id: "gammes", libelle: "Les gammes : la phrase modèle, un mot qui change" },
  { id: "manipulations", libelle: "Déplacer, ajouter, remplacer, supprimer" },
  { id: "oralEcrit", libelle: "De l'oral à l'écrit : les gammes du guide CE1" },
  { id: "lanceurs", libelle: "Le jogging d'écriture : les lanceurs" },
  { id: "transformer", libelle: "Transformer un texte lu" },
  { id: "episode", libelle: "Ajouter un épisode à un récit répétitif" },
  { id: "connecteurs", libelle: "Enchaîner les phrases : les connecteurs" },
  { id: "planifier", libelle: "Planifier son écrit : le brouillon" },
  { id: "relecture", libelle: "La grille de relecture" },
  { id: "message", libelle: "Écrire à un destinataire" },
];

export interface ReglagesEcrire { exercice: ExerciceEcrire; classe: Classe }
export const REGLAGES_ECRIRE: ReglagesEcrire = { exercice: "gammes", classe: "CE1" };

const TETE = '<div class="sous">Prénom : ........................................ Date : ........................</div>';
const titre = (t: string) => `<div class="titre">${escapeHtml(t)}</div>`;
const regle = (t: string) => `<div class="regle">${t}</div>`;
const lignes = (n: number) => Array.from({ length: n }, () => '<div class="ec-ligne"></div>').join("");

// ── Les données ───────────────────────────────────────────────────────────

/** Des mots à placer dans une phrase : au CP, des mots simples ; ensuite, des boîtes à mots plus riches. */
export const MOTS_IMPOSES: Record<Classe, string[][]> = {
  CP: [["chat", "lit"], ["moto", "rue"], ["papa", "tarte"], ["lune", "nuit"], ["vélo", "parc"], ["ami", "ballon"]],
  CE1: [["forêt", "renard", "courir"], ["neige", "bonnet", "froid"], ["gâteau", "four", "délicieux"], ["bateau", "vague", "tempête"], ["clé", "porte", "ouvrir"], ["oiseau", "nid", "branche"]],
  CE2: [["château", "secret", "escalier", "nuit"], ["marché", "panier", "acheter", "frais"], ["orage", "éclair", "soudain", "abri"], ["dragon", "trésor", "garder", "grotte"], ["robot", "inventer", "bouton", "drôle"], ["voyage", "valise", "train", "impatient"]],
};

/** Les gammes : une phrase modèle, ce qu'on change, des mots pour le faire ; les exemples du programme. */
export const GAMMES: Record<Classe, { modele: string; consigne: string; mots: string[]; exemples: string[] }[]> = {
  CP: [
    { modele: "J'ai un chat.", consigne: "Change le nom : écris d'autres phrases sur le même modèle.", mots: ["chien", "vélo", "ballon", "lapin", "livre"], exemples: ["J'ai un chien.", "J'ai un vélo."] },
    { modele: "Le chat dort sur le lit.", consigne: "Change l'animal, puis l'endroit.", mots: ["le lapin", "la poule", "le tapis", "la chaise", "le banc"], exemples: ["Le lapin dort sur le tapis.", "La poule dort sur le banc."] },
  ],
  CE1: [
    { modele: "Simon parle à Nora.", consigne: "Écris la phrase au passé, puis au futur ; puis change les personnages.", mots: ["parlait", "parlera", "Léa", "son frère", "la maîtresse"], exemples: ["Simon parlait à Nora.", "Simon parlera à Nora.", "Léa parle à son frère."] },
    { modele: "Le petit chat est dans la cour de la ferme.", consigne: "Change un mot, puis plusieurs, avec les mots de la boîte : poules, grosses, maison, cour.", mots: ["poules", "grosses", "maison", "cour"], exemples: ["Les grosses poules sont dans la cour de la maison."] },
  ],
  CE2: [
    { modele: "La petite fille veut boire un chocolat.", consigne: "Change le sujet, puis le temps : accorde ce qui doit l'être.", mots: ["Les petits garçons", "J'", "Nous", "hier", "demain"], exemples: ["Les petits garçons veulent boire un chocolat.", "J'ai voulu boire un chocolat.", "Demain, nous voudrons boire un chocolat."] },
    { modele: "Le vieux pêcheur répare son filet sur le port.", consigne: "Remplace chaque groupe par un autre, puis mets la phrase au pluriel.", mots: ["la jeune marchande", "range", "ses paniers", "au marché"], exemples: ["La jeune marchande range ses paniers au marché.", "Les vieux pêcheurs réparent leurs filets sur le port."] },
  ],
};

/** Déplacer, ajouter, remplacer, supprimer : la phrase de base du guide CE1 (p. 83) et ses transformations. */
export const MANIPULATIONS = {
  base: "L'élève trace un cercle dans la cour.",
  etapes: [
    { consigne: "Déplace « dans la cour » au début de la phrase.", reponse: "Dans la cour, l'élève trace un cercle." },
    { consigne: "Ajoute un mot pour dire comment est le cercle.", reponse: "L'élève, dans la cour, trace un grand cercle." },
    { consigne: "Remplace « trace » par un autre verbe.", reponse: "Dans la cour, l'élève dessine un grand cercle." },
    { consigne: "Remplace « l'élève » par un prénom et ajoute deux informations.", reponse: "Sans s'arrêter, dans la cour de l'école, Lucie trace un grand cercle rouge." },
    { consigne: "Supprime tout ce qu'on peut supprimer : la phrase doit encore avoir du sens.", reponse: "L'élève trace un cercle." },
  ],
};

/** De l'oral à l'écrit : les gammes du guide CE1 (p. 84), avec la phrase attendue. */
export const ORAL_ECRIT: { consigne: string; phrase: string; ecrit: string }[] = [
  { consigne: "Supprime le pronom en trop.", phrase: "Le petit garçon, il court.", ecrit: "Le petit garçon court." },
  { consigne: "Supprime le pronom en trop.", phrase: "Le chat, il est sur le mur.", ecrit: "Le chat est sur le mur." },
  { consigne: "Écris sans « il y a ».", phrase: "Il y a un escargot sur la tige.", ecrit: "Un escargot se balance sur la tige." },
  { consigne: "Écris sans « il y a… qui ».", phrase: "Il y a des feuilles qui tombent.", ecrit: "Les feuilles tombent lentement." },
  { consigne: "Écris sans « je vois… qui ».", phrase: "Je vois une fille qui joue.", ecrit: "Une fille joue." },
  { consigne: "Écris sans « c'est quand ».", phrase: "Je vais chez le docteur, c'est quand je suis malade.", ecrit: "Je vais chez le docteur quand je suis malade." },
  { consigne: "Écris une seule phrase au lieu de deux.", phrase: "Emma court. Lucie court.", ecrit: "Emma et Lucie courent." },
  { consigne: "Écris une seule phrase au lieu de trois.", phrase: "Luc enfile son manteau. Luc prend son bonnet. Luc attrape ses gants.", ecrit: "Luc enfile son manteau, prend son bonnet et attrape ses gants." },
  { consigne: "Écris comme on écrit, pas comme on parle.", phrase: "Pierre il m'a pris ma balle.", ecrit: "Pierre m'a pris ma balle." },
  { consigne: "Écris comme on écrit, pas comme on parle.", phrase: "J'y vais à la piscine.", ecrit: "Je vais à la piscine." },
];

/** Les lanceurs d'écriture du guide CE1 (p. 84-85). */
export const LANCEURS = [
  "Je rêve de…", "J'aime… parce que…", "Je n'aime pas quand…", "Et si j'étais… je…", "Ma saison préférée est… parce que…", "Ce qui me fait le plus peur, c'est… parce que…",
  "Ce qui me rend heureux, c'est… parce que…", "Ce qui me fait rire, c'est… parce que…", "Le cadeau que je rêve de recevoir est… parce que…", "Mon animal préféré est… parce que…",
  "Ce que j'aime faire à l'école, c'est… parce que…", "Où aimerais-je vivre ?", "Écris un gage pour le jeu de « Jacques a dit ».", "Écris une phrase qui contient trois mots : lune, chat, chanter.",
  "Écris le contraire de : « Le géant est content et marche lentement. »",
];

/** Transformer un texte lu : le passage, les mots à utiliser, une réponse possible ; au CP et au CE1, les exemples du programme. */
export const A_TRANSFORMER: Record<Classe, { texte: string; mots: string[]; consigne: string; exemple: string }[]> = {
  CP: [
    { texte: "Jacques a un canari jaune.", mots: ["Léa", "Malo", "lapin", "chat", "blanc", "gris", "vélo", "rouge"], consigne: "Écris une nouvelle phrase : remplace le prénom, l'animal et la couleur.", exemple: "Léa a un lapin blanc." },
    { texte: "Le loup a vu une chèvre dans le pré.", mots: ["Le renard", "Le chat", "une poule", "une souris", "la cour", "le jardin"], consigne: "Écris une nouvelle phrase : remplace l'animal qui voit, l'animal qu'il voit, l'endroit.", exemple: "Le renard a vu une poule dans la cour." },
  ],
  CE1: [
    { texte: "Le petit chat est dans la cour de la ferme.", mots: ["poules", "grosses", "maison", "cour"], consigne: "Transforme la phrase avec tous les mots de la boîte.", exemple: "Les grosses poules sont dans la cour de la maison." },
    { texte: "Chaque matin, le boulanger prépare le pain. Il allume son four et pétrit la pâte.", mots: ["la pâtissière", "les gâteaux", "elle", "mélange"], consigne: "Réécris le texte avec un autre personnage : change ce qui doit changer.", exemple: "Chaque matin, la pâtissière prépare les gâteaux. Elle allume son four et mélange la pâte." },
  ],
  CE2: [
    { texte: "Le petit renard sort de son terrier. Il renifle l'air frais du matin et part chercher à manger.", mots: ["Les petits renards", "leur", "ils"], consigne: "Réécris le texte avec plusieurs personnages : accorde ce qui doit l'être.", exemple: "Les petits renards sortent de leur terrier. Ils reniflent l'air frais du matin et partent chercher à manger." },
    { texte: "Aujourd'hui, Hugo prend le train. Il regarde le paysage et mange une pomme.", mots: ["Hier", "demain"], consigne: "Réécris le texte au passé (Hier, …), puis au futur (Demain, …).", exemple: "Hier, Hugo a pris le train. Il a regardé le paysage et a mangé une pomme. — Demain, Hugo prendra le train. Il regardera le paysage et mangera une pomme." },
  ],
};

/** Un récit à structure répétitive, écrit pour Maitrize, et le cadre d'un nouvel épisode. */
export const RECIT_REPETITIF = {
  titre: "Le chapeau de Monsieur Lapin",
  texte: [
    "Monsieur Lapin a perdu son chapeau.",
    "« Qui a vu mon chapeau ? » demande-t-il.",
    "« Pas moi, dit la poule. J'étais dans le poulailler. »",
    "« Pas moi, dit le chien. J'étais dans ma niche. »",
    "« Pas moi, dit le chat. J'étais sur le toit. »",
    "Soudain, le chapeau bouge tout seul…",
    "Une petite souris sort de dessous : « Moi, je dormais dedans ! »",
  ],
  cadre: "« Pas moi, dit ……………………… . J'étais ……………………………………… . »",
};

/** Des étapes à remettre dans l'ordre et à enchaîner avec des connecteurs. */
export const ETAPES_A_ENCHAINER: { titre: string; etapes: string[] }[] = [
  { titre: "Préparer un bol de chocolat", etapes: ["Je verse le lait dans le bol.", "Je fais chauffer le bol une minute.", "J'ajoute deux cuillères de chocolat en poudre.", "Je mélange et je déguste."] },
  { titre: "Planter une graine", etapes: ["Je remplis un pot de terre.", "Je fais un petit trou avec le doigt.", "Je pose la graine dans le trou et je la recouvre.", "J'arrose doucement."] },
  { titre: "Se préparer pour la piscine", etapes: ["Je prépare mon sac.", "J'enfile mon maillot de bain dans la cabine.", "Je prends une douche.", "Je plonge dans le bassin."] },
];

/** Deux phrases à relier : le connecteur qui convient. */
export const A_RELIER: { a: string; b: string; connecteur: string }[] = [
  { a: "Il pleut.", b: "Je prends mon parapluie.", connecteur: "alors" },
  { a: "Je voulais jouer dehors.", b: "il pleuvait.", connecteur: "mais" },
  { a: "Léo est content.", b: "il a gagné la course.", connecteur: "parce que" },
  { a: "Le magasin était fermé.", b: "nous sommes rentrés.", connecteur: "donc" },
  { a: "Le chat s'approche doucement.", b: "il bondit sur la balle.", connecteur: "puis" },
];

/** Les critères de la grille de relecture, de plus en plus nombreux du CP au CE2. */
export const CRITERES_RELECTURE: Record<Classe, string[]> = {
  CP: ["Chaque phrase commence par une majuscule.", "Chaque phrase finit par un point.", "J'ai laissé un espace entre les mots.", "J'ai relu à voix haute : on comprend ce que j'ai écrit.", "J'ai vérifié les mots avec les outils de la classe."],
  CE1: ["Chaque phrase commence par une majuscule et finit par un point.", "J'ai relu à voix haute : il ne manque pas de mot.", "Il n'y a pas de répétition : j'ai utilisé il, elle, un autre nom.", "J'ai lié mes phrases : d'abord, puis, ensuite, enfin.", "Les mots fréquents sont bien écrits.", "J'ai accordé dans le groupe nominal ; le verbe prend -nt avec un sujet pluriel."],
  CE2: ["J'ai respecté la consigne et le type de texte.", "Mon lecteur comprend tout, même s'il n'était pas là.", "Mes phrases sont ponctuées ; les paroles sont entre guillemets.", "J'ai varié les connecteurs et évité les répétitions.", "J'ai utilisé des mots précis.", "J'ai vérifié les accords dans les groupes nominaux et entre le sujet et le verbe.", "J'ai relu une fois pour le sens, une fois pour l'orthographe."],
};

// ── Les feuilles ──────────────────────────────────────────────────────────

function feuilleMotsImposes(r: ReglagesEcrire, graine: number): string {
  const series = melanger(hasard(graine), MOTS_IMPOSES[r.classe]).slice(0, r.classe === "CP" ? 4 : 5);
  const items = series.map((mots, i) => `<div class="ec-q"><div class="ec-enonce"><b>${i + 1}.</b> ${mots.map((m) => `<span class="ec-etiquette">${escapeHtml(m)}</span>`).join(" ")}</div>${lignes(r.classe === "CP" ? 1 : 2)}</div>`).join("");
  return `<div class="page">${titre("Une phrase avec des mots imposés")}${TETE}${regle(`Écris une phrase qui contient tous les mots de la ligne. Elle commence par une majuscule et finit par un point.${r.classe === "CP" ? " Cherche les mots dans les leçons de lecture." : ""}`)}${items}</div>`;
}

function feuilleGammes(r: ReglagesEcrire, graine: number): string {
  const g = GAMMES[r.classe][Math.floor(hasard(graine)() * GAMMES[r.classe].length)];
  return `<div class="page">${titre("Les gammes d'écriture")}${TETE}${regle(escapeHtml(g.consigne))}
    <div class="ec-modele">${escapeHtml(g.modele)}</div><div class="ec-boite">${g.mots.map((m) => `<span class="ec-etiquette">${escapeHtml(m)}</span>`).join(" ")}</div>${lignes(r.classe === "CP" ? 5 : 6)}</div>
    <div class="page corrige">${titre("Les gammes — des réponses possibles")}<div class="ec-corrige">${g.exemples.map((e) => `<div>${escapeHtml(e)}</div>`).join("")}</div></div>`;
}

function feuilleManipulations(): string {
  const m = MANIPULATIONS;
  return `<div class="page">${titre("Déplacer, ajouter, remplacer, supprimer")}${TETE}${regle(`Transforme la phrase de base comme on te le demande, d'abord à l'oral, puis à l'écrit. Chaque nouvelle phrase doit avoir du sens. ${reference("Guide CE1, p. 83.")}`)}
    <div class="ec-modele">${escapeHtml(m.base)}</div>${m.etapes.map((e, i) => `<div class="ec-q"><div class="ec-enonce"><b>${i + 1}.</b> ${escapeHtml(e.consigne)}</div>${lignes(1)}</div>`).join("")}</div>
    <div class="page corrige">${titre("Déplacer, ajouter, remplacer, supprimer — des réponses")}<div class="ec-corrige">${m.etapes.map((e, i) => `<div><b>${i + 1}.</b> ${escapeHtml(e.reponse)}</div>`).join("")}</div></div>`;
}

function feuilleOralEcrit(_r: ReglagesEcrire, graine: number): string {
  const items = melanger(hasard(graine), ORAL_ECRIT).slice(0, 6);
  return `<div class="page">${titre("De l'oral à l'écrit")}${TETE}${regle(`On le dit souvent ainsi à l'oral, mais on ne l'écrit pas comme ça. Réécris chaque phrase comme on l'écrit. ${reference("Guide CE1, p. 84.")}`)}
    ${items.map((x, i) => `<div class="ec-q"><div class="ec-enonce"><b>${i + 1}.</b> ${escapeHtml(x.consigne)} <i>« ${escapeHtml(x.phrase)} »</i></div>${lignes(1)}</div>`).join("")}</div>
    <div class="page corrige">${titre("De l'oral à l'écrit — corrigé")}<div class="ec-corrige">${items.map((x, i) => `<div><b>${i + 1}.</b> ${escapeHtml(x.ecrit)}</div>`).join("")}</div></div>`;
}

function feuilleLanceurs(r: ReglagesEcrire, graine: number): string {
  const choisis = melanger(hasard(graine), LANCEURS).slice(0, 5);
  return `<div class="page">${titre("Le jogging d'écriture")}${TETE}${regle(`Chaque matin, une ou deux phrases avec le lanceur du jour. Lis ta phrase à voix haute, puis corrige-la avec l'aide du professeur. ${reference("Guide CE1, p. 84.")}`)}
    ${choisis.map((l, i) => `<div class="ec-q"><div class="ec-enonce"><b>Jour ${i + 1}.</b> ${escapeHtml(l)}</div>${lignes(r.classe === "CE2" ? 3 : 2)}</div>`).join("")}</div>`;
}

function feuilleTransformer(r: ReglagesEcrire, graine: number): string {
  const t = A_TRANSFORMER[r.classe][Math.floor(hasard(graine)() * A_TRANSFORMER[r.classe].length)];
  const nLignes = Math.max(2, Math.ceil(t.texte.length / 40) + 1);
  return `<div class="page">${titre("Transformer un texte")}${TETE}${regle(escapeHtml(t.consigne))}
    <div class="ec-modele">${escapeHtml(t.texte)}</div><div class="ec-boite">${t.mots.map((m) => `<span class="ec-etiquette">${escapeHtml(m)}</span>`).join(" ")}</div>${lignes(nLignes)}
    <div class="ec-sous-titre">Une autre transformation, avec tes mots</div>${lignes(nLignes)}</div>
    <div class="page corrige">${titre("Transformer un texte — une réponse possible")}<div class="ec-corrige"><div>${escapeHtml(t.exemple)}</div></div></div>`;
}

function feuilleEpisode(r: ReglagesEcrire): string {
  const x = RECIT_REPETITIF;
  return `<div class="page">${titre(x.titre)}${TETE}${regle("Lis l'histoire. Repère ce qui se répète. Écris un nouvel épisode : un autre animal répond, et dit où il était.")}
    <div class="ec-texte">${x.texte.map(escapeHtml).join("<br>")}</div>
    <div class="ec-sous-titre">Mon épisode</div><div class="ec-cadre">${escapeHtml(x.cadre)}</div>${lignes(r.classe === "CP" ? 3 : 4)}
    <div class="ec-sous-titre">J'illustre mon épisode</div><div class="ec-dessin"></div></div>`;
}

/** « parce que » + « il a gagné » → « parce qu'il a gagné ». */
export function relie(connecteur: string, suite: string): string {
  const b = suite.charAt(0).toLowerCase() + suite.slice(1);
  return /que$/.test(connecteur) && /^[aeiouyéèêh]/i.test(b) ? `<b>${connecteur.slice(0, -1)}'</b>${escapeHtml(b)}` : `<b>${connecteur}</b> ${escapeHtml(b)}`;
}

function feuilleConnecteurs(r: ReglagesEcrire, graine: number): string {
  const alea = hasard(graine);
  const sujet = ETAPES_A_ENCHAINER[Math.floor(alea() * ETAPES_A_ENCHAINER.length)];
  const ordre = melanger(alea, sujet.etapes.map((e, i) => ({ e, i })));
  const relier = r.classe === "CP" ? [] : melanger(alea, A_RELIER).slice(0, 4);
  const page = `<div class="page">${titre(`Enchaîner les phrases — ${sujet.titre.toLowerCase()}`)}${TETE}${regle("Une suite de phrases n'est pas encore un texte. Numérote les étapes dans l'ordre, puis écris le texte en les reliant avec : d'abord, puis, ensuite, enfin.")}
    ${ordre.map(({ e }) => `<div class="ec-etape"><span class="ec-case"></span> ${escapeHtml(e)}</div>`).join("")}
    <div class="ec-boite">${["D'abord", "Puis", "Ensuite", "Enfin"].map((c) => `<span class="ec-etiquette">${c}</span>`).join(" ")}</div>${lignes(5)}
    ${relier.length ? `<div class="ec-sous-titre">Relie les deux phrases avec : alors, mais, parce que, donc, puis</div>${relier.map((x, i) => `<div class="ec-q"><div class="ec-enonce"><b>${i + 1}.</b> ${escapeHtml(x.a)} / ${escapeHtml(x.b)}</div>${lignes(1)}</div>`).join("")}` : ""}</div>`;
  const corrige = `<div class="page corrige">${titre("Enchaîner les phrases — corrigé")}<div class="ec-corrige"><div>${sujet.etapes.map((e, i) => `${["D'abord", "Puis", "Ensuite", "Enfin"][i]}, ${escapeHtml(e.charAt(0).toLowerCase() + e.slice(1))}`).join(" ")}</div>${
    relier.map((x, i) => `<div><b>${i + 1}.</b> ${escapeHtml(x.a.replace(/\.$/, ""))}, ${relie(x.connecteur, x.b)}</div>`).join("")}</div></div>`;
  return page + corrige;
}

function feuillePlanifier(r: ReglagesEcrire): string {
  const recit = ["Le début : qui ? où ? quand ?", "Le problème, ce qui arrive", "La fin : comment ça se termine ?"];
  return `<div class="page">${titre("Je prépare mon écrit")}${TETE}${regle("Avant d'écrire, je réfléchis : que dois-je écrire ? pour qui ? pour quoi faire ? Je note mes idées en quelques mots, pas en phrases.")}
    <div class="ec-deux"><div class="ec-champ"><b>Pour qui ?</b>${lignes(1)}</div><div class="ec-champ"><b>Pour quoi faire ?</b>${lignes(1)}</div></div>
    <div class="ec-champ"><b>Quel type d'écrit ?</b> ${["un récit", "une description", "une lettre", "une recette ou une règle", "un poème"].map((t) => `<span class="ec-option"><span class="ec-case"></span> ${t}</span>`).join(" ")}</div>
    <div class="ec-sous-titre">Mes idées</div><div class="ec-carte"><div class="ec-centre-carte">le sujet</div></div>
    <div class="ec-sous-titre">Les mots que je veux utiliser</div>${lignes(r.classe === "CP" ? 1 : 2)}
    <div class="ec-sous-titre">Le plan (pour un récit)</div>${recit.map((x) => `<div class="ec-champ"><b>${escapeHtml(x)}</b>${lignes(1)}</div>`).join("")}</div>`;
}

function feuilleRelecture(r: ReglagesEcrire): string {
  const lignesGrille = CRITERES_RELECTURE[r.classe].map((c) => `<tr><td>${escapeHtml(c)}</td><td class="ec-centre"><span class="ec-case"></span></td><td class="ec-centre"><span class="ec-case"></span></td></tr>`).join("");
  return `<div class="page">${titre("Je relis mon texte")}${TETE}${regle("Je relis mon texte à voix haute, ou je le fais relire. Je vérifie une chose à la fois. Je corrige au crayon, puis je recopie au propre.")}
    <table class="ec-tableau"><tr><th>Ce que je vérifie</th><th>Moi</th><th>Un camarade</th></tr>${lignesGrille}</table>
    <div class="ec-champ"><b>Ce que je vais améliorer</b>${lignes(2)}</div></div>`;
}

function feuilleMessage(r: ReglagesEcrire): string {
  return `<div class="page">${titre("Écrire à un destinataire")}${TETE}${regle("Ton lecteur n'est pas là pour te poser des questions : ton message doit tout lui dire. Pense à la formule du début et à celle de la fin.")}
    <div class="ec-lettre"><div class="ec-droite">À ……………………………, le ……………………………</div>
      <div class="ec-champ"><b>Cher… / Chère…</b>${lignes(1)}</div>${lignes(r.classe === "CE2" ? 8 : 6)}
      <div class="ec-champ"><b>La formule de fin</b> (À bientôt, Je t'embrasse, Bien amicalement…)${lignes(1)}</div><div class="ec-droite">Ma signature : ……………………………</div></div>
    <div class="ec-verif"><span class="ec-case"></span> Mon lecteur sait qui écrit et pourquoi. &nbsp; <span class="ec-case"></span> J'ai relu avec la grille.</div></div>`;
}

export function htmlEcrire(r: ReglagesEcrire, graine: number): string {
  const corps = r.exercice === "motsImposes" ? feuilleMotsImposes(r, graine)
    : r.exercice === "gammes" ? feuilleGammes(r, graine)
      : r.exercice === "manipulations" ? feuilleManipulations()
        : r.exercice === "oralEcrit" ? feuilleOralEcrit(r, graine)
          : r.exercice === "lanceurs" ? feuilleLanceurs(r, graine)
            : r.exercice === "transformer" ? feuilleTransformer(r, graine)
              : r.exercice === "episode" ? feuilleEpisode(r)
                : r.exercice === "connecteurs" ? feuilleConnecteurs(r, graine)
                  : r.exercice === "planifier" ? feuillePlanifier(r)
                    : r.exercice === "relecture" ? feuilleRelecture(r)
                      : feuilleMessage(r);
  return feuille(corps, "ec");
}

export const STYLE_ECRIRE = `
  .feuille.ec .ec-ligne { border-bottom: 1px solid #9aa0b4; height: 10mm; }
  .feuille.ec .ec-q { margin: 0 0 4mm; page-break-inside: avoid; break-inside: avoid; }
  .feuille.ec .ec-enonce { font-size: 14px; line-height: 1.6; }
  .feuille.ec .ec-enonce b { color: #687087; margin-right: 1.5mm; }
  .feuille.ec .ec-etiquette { display: inline-block; border: 1.5px solid #1c2233; border-radius: 2mm; padding: 0.5mm 3mm; margin: 0 1.5mm 1.5mm 0; font-size: 15px; font-weight: 600; background: #fff; }
  .feuille.ec .ec-modele { font-size: 20px; font-weight: 700; margin: 3mm 0 3mm; padding: 3mm 4mm; border-left: 4px solid #2454e6; background: #f4f6fd; }
  .feuille.ec .ec-boite { margin: 2mm 0 3mm; }
  .feuille.ec .ec-texte { font-size: 17px; line-height: 1.9; margin: 2mm 0 4mm; }
  .feuille.ec .ec-cadre { font-size: 15px; color: #4a5168; margin: 1mm 0 2mm; }
  .feuille.ec .ec-dessin { border: 1.5px dashed #9aa0b4; border-radius: 3mm; height: 60mm; }
  .feuille.ec .ec-sous-titre { font-size: 14px; font-weight: 800; margin: 5mm 0 2mm; }
  .feuille.ec .ec-etape { font-size: 15px; line-height: 1.5; margin: 0 0 2.5mm; padding: 2mm 3mm; border: 1px dashed #9aa0b4; border-radius: 2mm; }
  .feuille.ec .ec-case { display: inline-block; width: 6mm; height: 6mm; border: 1.5px solid #1c2233; border-radius: 1mm; vertical-align: -1.5mm; margin: 0 1mm 0 2mm; }
  .feuille.ec .ec-champ { font-size: 13.5px; margin: 0 0 3mm; line-height: 1.9; }
  .feuille.ec .ec-option { white-space: nowrap; }
  .feuille.ec .ec-deux { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; }
  .feuille.ec .ec-carte { border: 1.5px dashed #9aa0b4; border-radius: 3mm; height: 60mm; position: relative; }
  .feuille.ec .ec-centre-carte { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); border: 1.5px solid #1c2233; border-radius: 50%; padding: 5mm 8mm; font-size: 12px; color: #687087; }
  .feuille.ec .ec-tableau { width: 100%; border-collapse: collapse; font-size: 13.5px; margin: 2mm 0 5mm; }
  .feuille.ec .ec-tableau th, .feuille.ec .ec-tableau td { border: 1px solid #1c2233; padding: 2.5mm 3mm; text-align: left; vertical-align: middle; }
  .feuille.ec .ec-tableau th { background: #f7f8fc; font-size: 12px; }
  .feuille.ec .ec-centre { text-align: center !important; width: 20mm; }
  .feuille.ec .ec-lettre { border: 1px solid #c4c9d6; border-radius: 3mm; padding: 4mm 5mm; margin-top: 2mm; }
  .feuille.ec .ec-droite { text-align: right; font-size: 13px; margin: 0 0 3mm; }
  .feuille.ec .ec-verif { font-size: 13px; margin-top: 4mm; }
  .feuille.ec .ec-corrige { font-size: 14px; line-height: 1.8; }
  .feuille.ec .ec-corrige > div { margin-bottom: 2mm; }
`;
