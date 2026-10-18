// Écrire au cours moyen : copier, écrire pour réfléchir et apprendre,
// produire des écrits variés, les préparer et les améliorer.
//
// Programme de français du cycle 3 (2025) : écrire tous les jours — copie,
// écrits courts, dictées, productions personnelles — ; copier avec des
// stratégies ; écrire pour repérer et trier, pour expliquer un point de vue,
// pour reformuler l'essentiel d'une leçon, pour appliquer une règle ou
// réemployer le lexique ; raconter et expliquer au CM1, décrire et dialoguer
// au CM2 ; le brouillon, la cohérence, les codes de l'écrit, la révision.
// Exemples de réussite : copier une quinzaine de lignes au CM1, une
// vingtaine au CM2, sans erreur, en copie différée ou au verso ; classer les
// indications de temps, de lieu, les caractéristiques d'un personnage ;
// « Que penses-tu de… ? », « Je pense que… pourtant… » ; des chaînes
// anaphoriques cohérentes ; la virgule qui énumère, qui insiste, l'apostrophe
// et l'incise ; les connecteurs ; « celui-ci, celle-là » contre les
// répétitions ; la grille de relecture, la lecture différée.
//
// Les textes sont ceux du cours moyen (voir textesCoursMoyen.ts) ; les
// photographies, celles de « Lire un paysage ». Les prénoms sont inventés.

import { escapeHtml } from "./print";
import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";
import { ATTENTE_PHOTO, creditPhoto, photoPaysage } from "./photosPaysages";
import { lignesNumerotees, texteDe, type TexteAComprendre } from "./textesDeComprehension";

export type ExerciceEcritureCM =
  | "copie" | "trier" | "point-de-vue" | "bilan" | "ecrits-courts" | "comparer"
  | "raconter" | "expliquer" | "decrire" | "dialoguer" | "suite" | "coherence" | "relecture";

export const EXERCICES_ECRITURE_CM: { id: ExerciceEcritureCM; libelle: string }[] = [
  { id: "copie", libelle: "Copier un texte : la copie différée" },
  { id: "trier", libelle: "Repérer et trier les informations d'un texte" },
  { id: "point-de-vue", libelle: "Donner son point de vue en quelques phrases" },
  { id: "bilan", libelle: "Reformuler l'essentiel d'une leçon" },
  { id: "ecrits-courts", libelle: "Des écrits courts pour appliquer une règle" },
  { id: "comparer", libelle: "Écrire pour comparer deux textes (CM2)" },
  { id: "raconter", libelle: "Raconter : préparer, puis écrire son récit" },
  { id: "expliquer", libelle: "Expliquer : la notice de fabrication" },
  { id: "decrire", libelle: "Décrire un paysage (CM2)" },
  { id: "dialoguer", libelle: "Écrire un dialogue (CM2)" },
  { id: "suite", libelle: "Imaginer la suite d'un texte" },
  { id: "coherence", libelle: "La cohérence : reprises et connecteurs" },
  { id: "relecture", libelle: "La grille de relecture" },
];

export interface ReglagesEcritureCM { classe: "CM1" | "CM2"; exercice: ExerciceEcritureCM; texte: string; titre?: string }
export const REGLAGES_ECRITURE_CM: ReglagesEcritureCM = { classe: "CM1", exercice: "copie", texte: "" };

const TETE = '<div class="sous">Prénom : ........................................ Date : ........................</div>';
const titre = (t: string) => `<div class="titre">${escapeHtml(t)}</div>`;
const regle = (t: string) => `<div class="regle">${t}</div>`;
const rappel = (t: string) => `<div class="rappel">${t}</div>`;
const SOURCE = '<span class="reference">Programme de français du cycle 3, 2025.</span>';
const lignes = (n: number) => `<div class="ew-lignes">${'<div class="ew-ligne"></div>'.repeat(n)}</div>`;
const cadre = (t: string, corps: string) => `<div class="ew-cadre"><div class="ew-cadre-titre">${escapeHtml(t)}</div>${corps}</div>`;
const corrige = (t: string, corps: string) => `<div class="page corrige">${titre(`${t} — corrigé`)}<div class="ew-corrige">${corps}</div></div>`;
const texteSeul = (t: TexteAComprendre, n?: number) => lignesNumerotees(t).filter((_l, i, tout) => n === undefined || tout.slice(0, i + 1).filter((x) => x.n !== null).length <= n)
  .map(({ n: k, texte }) => (k === null ? '<div class="ew-blanc"></div>' : `<div>${escapeHtml(texte)}</div>`)).join("");

// ── Copier ────────────────────────────────────────────────────────────────

function feuilleCopie(r: ReglagesEcritureCM): string {
  const t = texteDe(r.texte) ?? texteDe(r.classe === "CM1" ? "pommier-cm1" : "lion-rat-cm2")!;
  const n = t.lignes.filter((l) => l.trim()).length;
  return `<div class="page">${titre(`Je copie : ${t.titre}`)}${TETE}
    ${rappel("La copie différée : je lis un groupe de mots, je le dis dans ma tête, je le cache ; je l'écris de mémoire ; je vérifie, mot à mot, lettre à lettre. Je garde la ponctuation, les majuscules et les retours à la ligne.")}
    ${regle(`Je copie le texte au verso de la feuille, par groupes de mots, en copie différée. Puis je compare ma copie au modèle, mot à mot, et j'entoure mes erreurs. ${SOURCE}`)}
    <div class="ew-modele">${texteSeul(t)}</div>${t.source ? `<div class="ew-source">${escapeHtml(t.source)}</div>` : ""}
    <div class="ew-bilan">J'ai copié en ......... minutes. Après vérification : ......... erreur(s).</div></div>
    <div class="page"><div class="titre">Ma copie</div>${lignes(n + 3)}</div>`;
}

// ── Écrire pour réfléchir et apprendre ────────────────────────────────────

/** Des informations à trier dans un texte : le temps, le lieu, un personnage. */
const A_TRIER: Record<string, { personnage: string; temps: string[]; lieux: string[]; portrait: string[] }> = {
  "cross-cm1": { personnage: "Lina", temps: ["Depuis la rentrée", "Tous les soirs", "Le grand jour", "Au coup de sifflet", "Le soir"],
    lieux: ["autour du parc", "le chemin plein de flaques", "la dernière montée", "la ligne d'arrivée"],
    portrait: ["elle veut battre Jade", "elle s'entraîne tous les soirs avec son père", "elle revient aider Jade", "elle n'est pas déçue : elle a gagné autre chose"] },
  "chien-gare-cm1": { personnage: "Pilote, le chien", temps: ["Chaque matin", "Quand un train arrivait", "Un jour de pluie", "Ce soir-là", "Le samedi suivant"],
    lieux: ["la petite gare de son village", "le quai", "la gare"],
    portrait: ["un grand chien roux aux oreilles tombantes", "il attend son maître depuis presque un an", "il remue la queue quand un train arrive", "il suit Octave à la fin"] },
  "horloge-cm2": { personnage: "l'horloger", temps: ["Un soir de décembre", "Minuit", "Le lendemain", "Trois jours plus tard", "À la nuit tombée", "Au matin"],
    lieux: ["la petite ville de Saint-Aubin", "la place", "la fenêtre de sa chambre", "l'école, la cantine", "la vieille tour"],
    portrait: ["un petit homme à la barbe grise", "tout le monde le croyait parti", "il fait tourner le temps à l'envers", "il ne veut pas qu'on remplace son horloge"] },
  "match-cm2": { personnage: "Yanis", temps: ["Il reste une minute", "Trois semaines plus tôt", "un mercredi", "Le samedi suivant", "Maintenant"],
    lieux: ["le but adverse", "le banc", "le stade", "le vestiaire"],
    portrait: ["il a crié sur Nils", "il rumine sa colère sur le banc", "il aide Nils à s'entraîner", "il passe le ballon à Malik au lieu de tirer"] },
};

function feuilleTrier(r: ReglagesEcritureCM, graine: number): string {
  const ids = Object.keys(A_TRIER).filter((id) => texteDe(id)!.classe === r.classe);
  const id = A_TRIER[r.texte] ? r.texte : ids[Math.floor(hasard(graine)() * ids.length)];
  const t = texteDe(id)!, d = A_TRIER[id];
  return `<div class="page">${titre(`${t.titre} — je trie les informations`)}${TETE}
    ${regle(`Je lis le texte. Je surligne en jaune les indications de temps, en vert les lieux, en bleu ce qu'on apprend sur ${escapeHtml(d.personnage)}. Puis je les classe dans le tableau. ${SOURCE}`)}
    <div class="ew-modele ew-petit">${texteSeul(t)}</div>
    <table class="ew-tableau"><tr><th>Le temps : quand ?</th><th>Les lieux : où ?</th><th>${escapeHtml(d.personnage)} : qui est-ce ?</th></tr><tr><td></td><td></td><td></td></tr></table></div>`
    + corrige(`${t.titre} — je trie`, `<table class="ew-tableau"><tr><th>Le temps</th><th>Les lieux</th><th>${escapeHtml(d.personnage)}</th></tr><tr><td>${d.temps.map(escapeHtml).join("<br>")}</td><td>${d.lieux.map(escapeHtml).join("<br>")}</td><td>${d.portrait.map(escapeHtml).join("<br>")}</td></tr></table>`);
}

/** Des questions qui demandent une prise de position, sur les textes du cours moyen. */
const POINTS_DE_VUE: Record<"CM1" | "CM2", string[]> = {
  CM1: [
    "Que penses-tu de Lina, qui revient aider Jade au lieu de gagner ? (Le cross de l'école)",
    "Qu'as-tu aimé, ou détesté, dans l'histoire du chien de la gare ? Pourquoi ?",
    "Pourquoi as-tu l'impression que la fermière n'est pas aimable, au début de la soupe au caillou ?",
    "Le voyageur a-t-il eu raison de ruser ? Que penses-tu de sa ruse ?",
    "Préfères-tu les récits ou les documentaires ? Pourquoi ?",
  ],
  CM2: [
    "Faut-il garder la vieille horloge, ou la remplacer par un écran ? Je donne mon avis, puis je le nuance. (L'horloge de la place)",
    "Le Lion et le Rat, Le cross de l'école : ces deux textes disent-ils la même chose ? Je m'appuie sur les deux.",
    "Yanis aurait-il dû tirer au but ? Je pèse le pour et le contre. (Le dernier match)",
    "Le Loup mérite-t-il sa punition ? Je justifie avec le texte. (Le procès du loup)",
    "Un poème peut-il être triste et beau à la fois ? Je réponds avec Demain, dès l'aube…",
  ],
};

function feuillePointDeVue(r: ReglagesEcritureCM, graine: number): string {
  const cm2 = r.classe === "CM2";
  const qs = melanger(hasard(graine), POINTS_DE_VUE[r.classe]).slice(0, 3);
  const debuts = cm2 ? "Je pense que… pourtant… · D'un côté…, de l'autre… · Le texte dit que… ; le second document ajoute que… · Je ressens…"
    : "Je pense que… parce que… · J'ai aimé… parce que… · Je n'ai pas aimé… car… · Je ressens…";
  return `<div class="page">${titre("Je donne mon point de vue")}${TETE}
    ${regle(`Je choisis une question. Je réponds en deux à quatre phrases : je donne mon avis${cm2 ? ", je le nuance" : ""}, et je le justifie par le texte. ${SOURCE}`)}
    <div class="ew-debuts">Pour commencer : ${escapeHtml(debuts)}</div>
    ${qs.map((q, i) => `<div class="ew-q"><div class="ew-enonce"><b>${i + 1}.</b> ${escapeHtml(q)}</div>${lignes(4)}</div>`).join("")}</div>`;
}

function feuilleBilan(r: ReglagesEcritureCM): string {
  const cm2 = r.classe === "CM2";
  return `<div class="page">${titre("Ce que j'ai appris")}${TETE}
    ${regle(`À la fin de la leçon, j'écris l'essentiel avec mes mots. Puis je compare avec mon voisin, et nous construisons le bilan de la classe. ${SOURCE}`)}
    ${cadre("La leçon du jour", lignes(1))}
    ${cadre("L'essentiel, en une ou deux phrases", lignes(3))}
    ${cadre("Les mots importants", lignes(1))}
    ${cadre("Un exemple", lignes(2))}
    ${cm2 ? cadre("Mon schéma : la leçon en une carte", '<div class="ew-schema"></div>') : ""}
    ${cadre("Ce que je n'ai pas encore compris, ou la question que je me pose", lignes(2))}</div>`;
}

/** Des écrits courts — les gammes d'écriture — pour appliquer une règle ou réemployer le lexique. */
const ECRITS_COURTS: Record<"CM1" | "CM2", [string, string][]> = {
  CM1: [
    ["J'écris trois phrases dont le sujet est un groupe nominal. Puis je réécris chacune en remplaçant le sujet par un pronom.", "Le petit chat dort. → Il dort."],
    ["J'écris trois phrases au passé composé avec l'auxiliaire être, et j'accorde le participe passé.", "Les filles sont arrivées."],
    ["J'écris une phrase où un nom a deux adjectifs épithètes.", "Un vieux chien fidèle attend."],
    ["J'écris deux phrases avec un synonyme de « dire » : répondre, murmurer, s'écrier, demander.", "« Viens ! » s'écria Jade."],
    ["J'écris une phrase qui énumère, avec des virgules.", "Le chien, le chat, la souris arrivent."],
    ["J'écris une phrase qui répète pour insister.", "De la soupe, de la soupe, de la soupe… encore de la soupe !"],
    ["J'écris trois phrases avec un complément circonstanciel en tête, suivi d'une virgule.", "Chaque matin, Octave passe devant la gare."],
  ],
  CM2: [
    ["J'écris trois phrases dont le sujet est placé après le verbe, et j'accorde le verbe.", "Au loin se dressaient des fortifications."],
    ["J'écris deux phrases avec un attribut du sujet au féminin pluriel.", "Ces pommes semblent mûres."],
    ["J'écris une phrase avec une apostrophe.", "Grand-mère, où es-tu ?"],
    ["J'écris deux répliques avec une incise.", "« Je viens », dit-il."],
    ["J'écris deux phrases au passé simple et une à l'imparfait, pour une action et un décor.", "La nuit tombait. Le loup arriva au village."],
    ["J'écris un groupe nominal avec un complément du nom, puis je le mets au pluriel.", "un panier en osier → des paniers en osier"],
    ["J'écris une phrase complexe avec quand, si ou parce que.", "Quand la cloche sonne, les élèves rangent leurs affaires."],
  ],
};

function feuilleEcritsCourts(r: ReglagesEcritureCM, graine: number): string {
  const items = melanger(hasard(graine), ECRITS_COURTS[r.classe]).slice(0, 4);
  return `<div class="page">${titre("Les écrits courts")}${TETE}
    ${regle(`Pour chaque consigne, j'écris mes phrases sur les lignes. Je relis l'accord de chaque verbe et de chaque groupe nominal. ${SOURCE}`)}
    ${items.map(([c, ex], i) => `<div class="ew-q"><div class="ew-enonce"><b>${i + 1}.</b> ${escapeHtml(c)}</div><div class="ew-exemple">Par exemple : ${escapeHtml(ex)}</div>${lignes(3)}</div>`).join("")}</div>`;
}

function feuilleComparer(): string {
  const fable = texteDe("lion-rat-cm2")!, cross = texteDe("cross-cm1")!;
  const extraitCross = lignesNumerotees(cross).filter((l) => l.n !== null && l.n >= 13 && l.n <= 19).map((l) => `<div>${escapeHtml(l.texte)}</div>`).join("");
  return `<div class="page">${titre("Je compare deux textes")}${TETE}
    ${regle(`Je lis les deux textes. Je note leurs ressemblances et leurs différences : le genre, les personnages, ce qui arrive, la leçon. Puis j'écris ce que les deux textes m'apprennent. ${SOURCE}`)}
    <div class="ew-deux"><div class="ew-modele ew-petit"><b>Texte 1</b> — ${escapeHtml(fable.titre)}<br>${texteSeul(fable)}<div class="ew-source">${escapeHtml(fable.source ?? "")}</div></div>
    <div class="ew-modele ew-petit"><b>Texte 2</b> — ${escapeHtml(cross.titre)}, extrait<br>${extraitCross}<div class="ew-source">${escapeHtml(cross.source ?? "")}</div></div></div>
    <table class="ew-tableau"><tr><th>Ce qui les rapproche</th><th>Ce qui les distingue</th></tr><tr><td></td><td></td></tr></table>
    ${cadre("Ce que les deux textes m'apprennent", lignes(3))}</div>`
    + corrige("Je compare deux textes", `<p><b>Ce qui les rapproche :</b> dans les deux, quelqu'un aide un autre qui est en difficulté ; le plus fort ou le premier a besoin, ou fait preuve, de générosité ; une leçon sur l'entraide.</p>
      <p><b>Ce qui les distingue :</b> une fable en vers, un récit en prose ; des animaux, des enfants ; une morale écrite, une leçon à comprendre ; un narrateur extérieur, une narratrice qui dit « je ».</p>
      <p><b>Ce qu'ils m'apprennent :</b> aider l'autre compte plus que gagner, et l'on a souvent besoin d'un plus petit que soi. Toute réponse justifiée par les deux textes convient.</p>`);
}

// ── Produire des écrits variés ────────────────────────────────────────────

function feuilleRaconter(r: ReglagesEcritureCM): string {
  const cm2 = r.classe === "CM2";
  return `<div class="page">${titre("Je raconte")}${TETE}
    ${regle(`Je raconte une sortie de la classe, ou une histoire que j'invente. Au brouillon, je prépare : qui, où, quand, ce qui se passe dans l'ordre, les mots utiles. Puis j'écris mon premier jet, en sautant une ligne pour pouvoir l'améliorer. ${SOURCE}`)}
    <table class="ew-tableau ew-plan"><tr><th>Qui ?</th><td></td></tr><tr><th>Où ? Quand ?</th><td></td></tr><tr><th>D'abord…</th><td></td></tr><tr><th>Ensuite… Puis…</th><td></td></tr><tr><th>Mais…</th><td></td></tr><tr><th>Enfin…</th><td></td></tr></table>
    ${cadre("Mes mots utiles : verbes, adjectifs, mots du thème", lignes(2))}
    ${rappel(`Un récit au passé : le passé composé, ou le passé simple${cm2 ? " et l'imparfait pour le décor" : ""} ; des connecteurs de temps — d'abord, ensuite, puis, soudain, enfin — ; chaque pronom renvoie à quelqu'un qu'on connaît.`)}</div>
    <div class="page"><div class="titre">Mon premier jet</div>${lignes(18)}</div>`;
}

function feuilleExpliquer(): string {
  return `<div class="page">${titre("J'explique : la notice de fabrication")}${TETE}
    ${regle(`Je choisis ce que je sais fabriquer ou faire : un avion en papier, un moulin à vent, faire germer une graine… J'écris la notice : le matériel, puis les étapes dans l'ordre, une action par étape. Je dessine un schéma. Un camarade suit ma notice : s'il bloque, je l'améliore. ${SOURCE}`)}
    ${cadre("Ce que je fabrique", lignes(1))}${cadre("Le matériel", lignes(2))}
    <table class="ew-tableau ew-etapes">${[1, 2, 3, 4, 5, 6].map((k) => `<tr><th>${k}</th><td></td></tr>`).join("")}</table>
    ${cadre("Mon schéma", '<div class="ew-schema"></div>')}
    ${rappel("Une notice : le matériel, puis des étapes numérotées, dans l'ordre ; chacune commence par un verbe — à l'infinitif (Plier la feuille) ou à l'impératif (Plie la feuille) — ; des mots précis : le coin, le bord, au milieu, en deux.")}</div>`;
}

function feuilleDecrire(graine: number): string {
  const p = photoPaysage(melanger(hasard(graine), ["vallee", "village", "montagne", "fleuve", "centre-ville", "savane"])[0])!;
  return `<div class="page">${titre("Je décris un paysage")}${TETE}
    ${regle(`J'observe la photographie, du premier plan à l'arrière-plan. Je note mes mots. Puis j'écris ma description en cinq ou six phrases, comme si elle s'insérait dans un récit au passé : je l'écris à l'imparfait. ${SOURCE}`)}
    <figure class="ew-photo"><img src="${ATTENTE_PHOTO}${p.id}" alt="${escapeHtml(p.titre)}"><figcaption>${escapeHtml(p.titre)} — ${escapeHtml(creditPhoto(p))}</figcaption></figure>
    <table class="ew-tableau"><tr><th>Au premier plan</th><th>Au second plan</th><th>À l'arrière-plan</th></tr><tr><td></td><td></td><td></td></tr></table>
    ${rappel("Pour décrire : des noms précis, des adjectifs, des compléments du nom (un pont de pierre) ; des verbes qui situent — se dresser, s'étendre, dominer, serpenter, border — ; un ordre : de près à loin, de bas en haut ; l'imparfait dans un récit au passé.")}</div>
    <div class="page"><div class="titre">Ma description</div>${lignes(12)}</div>`;
}

function feuilleDialoguer(): string {
  const modele = ["« Basile, l'horloge tourne à l'envers ! s'écria Nour.", "— Tu as rêvé, répondit son frère en haussant les épaules.", "— Non, je l'ai vue. Et la neige remontait vers le ciel !",
    "— Bien sûr, et demain, les poissons voleront, ricana Basile. »"];
  return `<div class="page">${titre("J'écris un dialogue")}${TETE}
    ${regle(`J'écris le dialogue entre deux personnages : ce que chacun dit, et comment il le dit. Au moins six répliques. Je relis la ponctuation avec la liste. ${SOURCE}`)}
    ${cadre("Un modèle", `<div class="ew-modele ew-petit">${modele.map((l) => `<div>${escapeHtml(l)}</div>`).join("")}</div>`)}
    ${cadre("Ma situation (je coche ou j'invente)", ["Deux amis trouvent une carte au trésor.", "Un enfant demande à ses parents d'adopter un chien.", "Un voyageur demande son chemin à un habitant pressé."].map((s) => `<div><span class="ew-case"></span> ${escapeHtml(s)}</div>`).join("") + '<div><span class="ew-case"></span> ......................................................................................</div>')}
    ${lignes(10)}
    <table class="ew-tableau ew-grille"><tr><th>Ma liste</th><th>Oui</th></tr>${["J'ouvre les guillemets au début du dialogue, je les ferme à la fin.", "Je mets un tiret à chaque changement de personnage.", "Les incises disent qui parle : dit-il, répondit-elle, s'écria Nour.", "Je varie les verbes de parole : demander, répondre, murmurer, s'écrier, ricaner."].map((c) => `<tr><td>${escapeHtml(c)}</td><td class="ew-centre"><span class="ew-case"></span></td></tr>`).join("")}</table></div>`;
}

function feuilleSuite(r: ReglagesEcritureCM, graine: number): string {
  const cm2 = r.classe === "CM2";
  const ids = cm2 ? ["horloge-cm2", "match-cm2"] : ["chien-gare-cm1", "cross-cm1"];
  const t = texteDe(r.texte) ?? texteDe(ids[Math.floor(hasard(graine)() * ids.length)])!;
  const debut = Math.min(9, t.lignes.filter((l) => l.trim()).length);
  return `<div class="page">${titre(`${t.titre} — j'imagine la suite`)}${TETE}
    ${regle(`Je lis le début du texte. J'imagine la suite : ce qui arrive, comment cela finit. Je garde les mêmes personnages et le même temps.${cm2 ? " J'y mets un court dialogue et une description." : ""} ${SOURCE}`)}
    <div class="ew-modele">${texteSeul(t, debut)}<div>…</div></div>${lignes(cm2 ? 16 : 13)}</div>`;
}

/** La cohérence : les reprises contre les répétitions ; les connecteurs. */
function feuilleCoherence(r: ReglagesEcritureCM): string {
  const cm2 = r.classe === "CM2";
  const repetitions = "Le renard avait très faim. Le renard aperçut une poule près de la ferme. Le renard s'approcha doucement de la poule. La poule vit le renard, et la poule s'enfuit dans le poulailler. Le renard resta seul, le ventre vide.";
  const modeleReprises = "Le renard avait très faim. Il aperçut une poule près de la ferme. L'animal s'approcha doucement d'elle. Mais la poule le vit et s'enfuit dans le poulailler. Le rusé resta seul, le ventre vide.";
  const trous: [string, string][] = [["…, Léa sortit son matériel.", "D'abord"], ["…, elle traça le contour du bateau.", "Ensuite"], ["Elle voulait peindre la mer, … il lui manquait du bleu.", "mais"],
    ["…, elle mélangea du vert et du blanc.", "Alors"], ["…, son tableau fut prêt.", "Finalement"]];
  const demonstratifs: [string, string][] = [["Malik a appelé le facteur, mais le facteur ne l'a pas entendu.", "Malik a appelé le facteur, mais celui-ci ne l'a pas entendu."],
    ["Mon cartable est lourd, mais le cartable de ma sœur est léger.", "Mon cartable est lourd, mais celui de ma sœur est léger."],
    ["Ta bicyclette est neuve ; la bicyclette de Nour est ancienne.", "Ta bicyclette est neuve ; celle de Nour est ancienne."]];
  return `<div class="page">${titre("La cohérence du texte")}${TETE}
    ${rappel(`Pour ne pas répéter un nom, je le reprends par un pronom (il, elle, le, la, lui) ou par un autre nom (l'animal, le rusé) ; chaque reprise doit renvoyer clairement à quelqu'un.${cm2 ? " Les connecteurs relient les phrases : d'abord, ensuite, mais, alors, finalement. Les pronoms démonstratifs — celui-ci, celle-là, celui de, celle de — évitent de répéter un nom." : ""}`)}
    ${regle(`Je récris le texte sans répétitions : je remplace les noms répétés par des pronoms ou par d'autres noms.${cm2 ? " Puis je complète avec les connecteurs, et je récris les dernières phrases avec celui-ci, celui de, celle de." : ""} ${SOURCE}`)}
    ${cm2 ? '<div class="ew-sous-titre">1. Je récris le texte sans répétitions.</div>' : ""}<div class="ew-modele ew-petit">${escapeHtml(repetitions)}</div>${lignes(6)}
    ${cm2 ? `<div class="ew-sous-titre">2. Je complète chaque phrase avec un connecteur de la liste.</div><div class="ew-banque">d'abord · ensuite · mais · alors · finalement</div>${trous.map(([p], i) => `<div class="ew-trou"><b>${String.fromCharCode(97 + i)}.</b> ${escapeHtml(p).replace("…", '<span class="ew-blanc-mot"></span>')}</div>`).join("")}
      <div class="ew-sous-titre">3. Je récris chaque phrase avec celui-ci, celui de ou celle de.</div>
      ${demonstratifs.map(([p]) => `<div class="ew-q"><div class="ew-enonce">${escapeHtml(p)}</div>${lignes(1)}</div>`).join("")}` : ""}</div>`
    + corrige("La cohérence du texte", `<p>Par exemple : <b>${escapeHtml(modeleReprises)}</b> — toute récriture où chaque reprise est claire convient.</p>${cm2
      ? `<p>${trous.map(([p, c], i) => `${String.fromCharCode(97 + i)}. ${escapeHtml(p.replace("…", c))}`).join("<br>")}</p><p>${demonstratifs.map(([, rep]) => `<b>${escapeHtml(rep)}</b>`).join("<br>")}</p>` : ""}`);
}

/** Les critères de la grille de relecture, d'après les exemples de réussite. */
export const CRITERES_RELECTURE: Record<"CM1" | "CM2", string[]> = {
  CM1: ["Mon texte répond à la consigne.", "Les évènements sont dans l'ordre ; j'utilise des connecteurs : d'abord, ensuite, puis, enfin.", "Chaque pronom renvoie à quelqu'un qu'on connaît.",
    "Je garde le même temps du début à la fin.", "Chaque phrase commence par une majuscule et finit par un point : . ! ? …", "J'ai accordé chaque verbe avec son sujet.",
    "J'ai accordé chaque groupe nominal : le déterminant, le nom, l'adjectif.", "J'ai vérifié les mots dont je doutais : le dictionnaire, mon cahier."],
  CM2: ["Mon texte répond à la consigne et à son but.", "Mes phrases s'enchaînent : les connecteurs de temps et de cause.", "J'évite les répétitions : pronoms, celui-ci, synonymes.",
    "Les dialogues sont ponctués : guillemets, tirets, incises.", "La description est au bon temps : l'imparfait dans un récit au passé.", "J'ai accordé chaque verbe avec son sujet, même placé après lui.",
    "J'ai accordé l'attribut avec le sujet, et chaque groupe nominal.", "J'ai relu mon texte le lendemain, à froid."],
};

function feuilleRelecture(r: ReglagesEcritureCM): string {
  const lignesGrille = CRITERES_RELECTURE[r.classe].map((c) => `<tr><td>${escapeHtml(c)}</td><td class="ew-centre"><span class="ew-case"></span></td><td class="ew-centre"><span class="ew-case"></span></td></tr>`).join("");
  return `<div class="page">${titre("Je relis et j'améliore mon texte")}${TETE}
    ${regle(`Je relis mon texte critère par critère, puis mon binôme le relit. Nous cochons ce qui est réussi. Je choisis ce que je vais améliorer, et je récris le passage. ${SOURCE}`)}
    <table class="ew-tableau ew-grille"><tr><th>Ce que je vérifie</th><th>Moi</th><th>Mon binôme</th></tr>${lignesGrille}</table>
    ${cadre("Le conseil de mon binôme", lignes(2))}${cadre("Ce que je vais améliorer", lignes(2))}${cadre("Le passage que je récris", lignes(5))}</div>`;
}

export function htmlEcritureCM(r: ReglagesEcritureCM, graine: number): string {
  const corps = r.exercice === "copie" ? feuilleCopie(r)
    : r.exercice === "trier" ? feuilleTrier(r, graine)
      : r.exercice === "point-de-vue" ? feuillePointDeVue(r, graine)
        : r.exercice === "bilan" ? feuilleBilan(r)
          : r.exercice === "ecrits-courts" ? feuilleEcritsCourts(r, graine)
            : r.exercice === "comparer" ? feuilleComparer()
              : r.exercice === "raconter" ? feuilleRaconter(r)
                : r.exercice === "expliquer" ? feuilleExpliquer()
                  : r.exercice === "decrire" ? feuilleDecrire(graine)
                    : r.exercice === "dialoguer" ? feuilleDialoguer()
                      : r.exercice === "suite" ? feuilleSuite(r, graine)
                        : r.exercice === "coherence" ? feuilleCoherence(r)
                          : feuilleRelecture(r);
  return feuille(corps, "ew");
}

export const STYLE_ECRITURE_CM = `
  .feuille.ew .ew-modele { border: 1px solid #c4c9d6; border-radius: 2mm; padding: 3mm 4mm; font-size: 14.5px; line-height: 1.7; margin: 0 0 3mm; }
  .feuille.ew .ew-modele.ew-petit { font-size: 13px; line-height: 1.6; }
  .feuille.ew .ew-blanc { height: 2.5mm; }
  .feuille.ew .ew-source { font-size: 10.5px; color: #687087; font-style: italic; text-align: right; margin: 1mm 0 2mm; }
  .feuille.ew .ew-bilan { font-size: 13px; margin-top: 4mm; }
  .feuille.ew .ew-lignes { margin: 1mm 0 3mm; }
  .feuille.ew .ew-ligne { border-bottom: 1px solid #9aa0b4; height: 9mm; }
  .feuille.ew .ew-cadre { margin: 0 0 3mm; break-inside: avoid; page-break-inside: avoid; }
  .feuille.ew .ew-cadre-titre { font-size: 12.5px; font-weight: 700; color: #2c3346; }
  .feuille.ew .ew-schema { border: 1px dashed #9aa0b4; border-radius: 2mm; height: 50mm; margin-top: 1mm; }
  .feuille.ew .ew-tableau { width: 100%; border-collapse: collapse; font-size: 12.5px; margin: 0 0 4mm; }
  .feuille.ew .ew-tableau th, .feuille.ew .ew-tableau td { border: 1px solid #1c2233; padding: 2mm; text-align: left; vertical-align: top; }
  .feuille.ew .ew-tableau th { background: #f7f8fc; font-size: 11.5px; }
  .feuille.ew .ew-tableau td { height: 45mm; }
  .feuille.ew .ew-plan td, .feuille.ew .ew-etapes td, .feuille.ew .ew-grille td { height: 10mm; }
  .feuille.ew .ew-plan th { width: 32mm; }
  .feuille.ew .ew-etapes th { width: 8mm; text-align: center; }
  .feuille.ew .ew-centre { text-align: center !important; width: 20mm; }
  .feuille.ew .ew-case { display: inline-block; width: 4mm; height: 4mm; border: 1.5px solid #1c2233; border-radius: 1mm; vertical-align: -0.8mm; }
  .feuille.ew .ew-q { margin: 0 0 3mm; break-inside: avoid; page-break-inside: avoid; }
  .feuille.ew .ew-enonce { font-size: 13.5px; font-weight: 600; line-height: 1.5; }
  .feuille.ew .ew-exemple { font-size: 12px; color: #4a5168; font-style: italic; }
  .feuille.ew .ew-debuts { font-size: 12.5px; color: #2c3346; border: 1px dashed #9aa0b4; border-radius: 2mm; padding: 2mm 3mm; margin: 0 0 4mm; line-height: 1.6; }
  .feuille.ew .ew-deux { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
  .feuille.ew .ew-photo { margin: 0 0 3mm; }
  .feuille.ew .ew-photo img { width: 100%; max-height: 80mm; object-fit: cover; border-radius: 1.5mm; }
  .feuille.ew .ew-photo figcaption { font-size: 10.5px; color: #687087; }
  .feuille.ew .ew-banque { font-size: 13px; border: 1px solid #c4c9d6; border-radius: 2mm; padding: 1.5mm 3mm; margin: 2mm 0 3mm; }
  .feuille.ew .ew-trou { font-size: 14px; line-height: 2.2; }
  .feuille.ew .ew-blanc-mot { display: inline-block; width: 30mm; border-bottom: 1px dotted #687087; height: 5mm; }
  .feuille.ew .ew-corrige { font-size: 13px; line-height: 1.6; }
  .feuille.ew .ew-sous-titre { font-size: 13.5px; font-weight: 700; margin: 3mm 0 2mm; }
`;
