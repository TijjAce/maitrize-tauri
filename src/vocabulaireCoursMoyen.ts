// Le vocabulaire et l'orthographe des mots au cours moyen.
//
// Programme de français du cycle 3 (2025) : enrichir son vocabulaire dans
// toutes les disciplines ; établir des relations entre les mots — la
// morphologie, la synonymie et l'antonymie au CM1, la polysémie au CM2 — ;
// réemployer le vocabulaire étudié ; mémoriser l'orthographe des mots en
// s'appuyant sur les régularités et la formation. Trois étapes : la
// rencontre du mot en contexte, l'étude structurée, le réemploi. Exemples de
// réussite repris ici : lait, laiteux, allaiter ; maisonnette, fillette ;
// embarquer, biodégradable ; un monstre répugnant, terrifiant, repoussant ;
// la règle qui mesure et la règle du jeu ; une belle vue, un point de vue ;
// au CM2, insecticide et régicide, insectivore et carnivore ; le sens, la
// direction ou la signification ; jouer à, jouer sur, jouer avec ;
// l'article de dictionnaire ; industrialisation, mobilités pendulaires,
// convertisseur ; hasard et hasardeux, laid et laideur, progrès et
// progresser ; agriculteur, agricultrice.

import { escapeHtml } from "./print";
import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";

export type ExerciceVocabulaireCM = "formation" | "familles" | "synonymes" | "polysemie" | "dictionnaire" | "mots-inconnus" | "corolle" | "lettres-muettes" | "feminins" | "invariables";

export const EXERCICES_VOCABULAIRE_CM: { id: ExerciceVocabulaireCM; libelle: string }[] = [
  { id: "formation", libelle: "La formation des mots : préfixes, radical, suffixes" },
  { id: "familles", libelle: "Les familles de mots" },
  { id: "synonymes", libelle: "Synonymes et antonymes, de même classe" },
  { id: "polysemie", libelle: "Un mot, plusieurs sens" },
  { id: "dictionnaire", libelle: "Le dictionnaire : l'ordre alphabétique, l'article" },
  { id: "mots-inconnus", libelle: "Le mot inconnu : le contexte et la formation" },
  { id: "corolle", libelle: "La corolle lexicale d'un univers" },
  { id: "lettres-muettes", libelle: "La lettre muette, trouvée par un mot de la famille" },
  { id: "feminins", libelle: "Les noms de métiers : -eur, -euse, -trice" },
  { id: "invariables", libelle: "Les mots invariables fréquents" },
];

export interface ReglagesVocabulaireCM { classe: "CM1" | "CM2"; exercice: ExerciceVocabulaireCM; titre?: string }
export const REGLAGES_VOCABULAIRE_CM: ReglagesVocabulaireCM = { classe: "CM1", exercice: "formation" };

const TETE = '<div class="sous">Prénom : ........................................ Date : ........................</div>';
const titre = (t: string) => `<div class="titre">${escapeHtml(t)}</div>`;
const regle = (t: string) => `<div class="regle">${t}</div>`;
const rappel = (t: string) => `<div class="rappel">${t}</div>`;
const SOURCE = '<span class="reference">Programme de français du cycle 3, 2025.</span>';
const trait = '<span class="vc-trait"></span>';
const corrige = (t: string, items: string[]) => `<div class="page corrige">${titre(`${t} — corrigé`)}<div class="vc-corrige">${items.map((x) => `<div class="vc-c">${x}</div>`).join("")}</div></div>`;

// ── La formation des mots ─────────────────────────────────────────────────

/** Un mot, sa décomposition, son sens. */
const FORMATION: Record<"CM1" | "CM2", [string, string, string][]> = {
  CM1: [
    ["laiteux", "lait + -eux", "qui ressemble au lait, blanc comme le lait"], ["allaiter", "al- + lait + -er", "nourrir un petit de son lait"],
    ["maisonnette", "maison + -ette", "une petite maison : -ette dit la petitesse"], ["camionnette", "camion + -ette", "un petit camion"],
    ["embarquer", "em- + barque + -er", "monter à bord d'un bateau"], ["démonter", "dé- + monter", "défaire ce qui était monté : dé- dit le contraire"],
    ["impossible", "im- + possible", "qui n'est pas possible : im- dit le contraire"], ["relire", "re- + lire", "lire une nouvelle fois : re- dit la répétition"],
    ["lavable", "lav(er) + -able", "qu'on peut laver : -able dit la possibilité"], ["jardinier", "jardin + -ier", "celui qui s'occupe d'un jardin : -ier dit souvent le métier"],
    ["prévoir", "pré- + voir", "voir à l'avance : pré- veut dire avant"], ["incassable", "in- + cass(er) + -able", "qu'on ne peut pas casser"],
  ],
  CM2: [
    ["insecticide", "insect(e) + -cide", "un produit qui tue les insectes : -cide veut dire tuer"], ["herbicide", "herb(e) + -cide", "un produit qui tue les mauvaises herbes"],
    ["carnivore", "carn(i) + -vore", "qui mange de la viande : -vore veut dire qui mange"], ["insectivore", "insect(i) + -vore", "qui mange des insectes"],
    ["herbivore", "herb(i) + -vore", "qui mange des plantes"], ["omnivore", "omni + -vore", "qui mange de tout : omni- veut dire tout"],
    ["biodégradable", "bio- + dégrad(er) + -able", "que les êtres vivants du sol peuvent décomposer : bio- veut dire la vie"],
    ["convertisseur", "convert(ir) + -isseur", "un appareil qui convertit, qui transforme"], ["mécanisation", "mécanis(er) + -ation", "le remplacement du travail à la main par des machines"],
    ["transatlantique", "trans- + atlantique", "qui traverse l'océan Atlantique : trans- veut dire à travers"], ["géographie", "géo- + -graphie", "la description de la Terre : géo- veut dire la terre"],
    ["incassable", "in- + cass(er) + -able", "qu'on ne peut pas casser"],
  ],
};

function feuilleFormation(r: ReglagesVocabulaireCM, graine: number): string {
  const items = melanger(hasard(graine), FORMATION[r.classe]).slice(0, 8);
  return `<div class="page">${titre("La formation des mots")}${TETE}
    ${rappel(r.classe === "CM1"
      ? "Un mot peut se décomposer : le radical porte le sens ; le préfixe, avant, et le suffixe, après, le modifient. dé-, in-, im- disent le contraire ; re-, la répétition ; -ette, la petitesse ; -able, la possibilité."
      : "Certains éléments viennent du latin ou du grec : -cide veut dire tuer, -vore qui mange, bio- la vie, géo- la terre, trans- à travers, omni- tout. En les reconnaissant, on devine le sens d'un mot nouveau.")}
    ${regle(`Pour chaque mot, je sépare le préfixe, le radical et le suffixe. Puis j'écris ce que veut dire le mot. ${SOURCE}`)}
    <table class="vc-tableau"><tr><th>Le mot</th><th>Sa formation</th><th>Ce qu'il veut dire</th></tr>${items.map(([m]) => `<tr><td class="vc-mot">${escapeHtml(m)}</td><td></td><td></td></tr>`).join("")}</table></div>`
    + corrige("La formation des mots", items.map(([m, f, s]) => `<b>${escapeHtml(m)}</b> : ${escapeHtml(f)} — ${escapeHtml(s)}`));
}

/** Un mot et sa famille. */
const FAMILLES: [string, string[]][] = [
  ["terre", ["terrain", "terrestre", "enterrer", "atterrir", "souterrain", "territoire"]], ["dent", ["dentiste", "dentaire", "dentier", "édenté"]],
  ["mer", ["marin", "maritime", "marée", "amerrir"]], ["jour", ["journée", "journal", "aujourd'hui", "séjour", "ajourner"]],
  ["lait", ["laitier", "laiteux", "laitage", "allaiter"]], ["fleur", ["fleuriste", "fleurir", "floral", "floraison"]],
  ["lune", ["lunaire", "alunir", "lunette"]], ["dos", ["dossier", "adosser", "endosser"]],
];

function feuilleFamilles(r: ReglagesVocabulaireCM, graine: number): string {
  const items = melanger(hasard(graine), FAMILLES).slice(0, r.classe === "CM1" ? 5 : 6);
  return `<div class="page">${titre("Les familles de mots")}${TETE}
    ${rappel("Les mots d'une même famille ont le même radical et un sens proche : dent, dentiste, dentaire. Attention aux faux amis : un mot peut contenir les mêmes lettres sans être de la famille.")}
    ${regle(`Pour chaque mot, j'écris au moins trois mots de sa famille. J'entoure le radical. Je peux vérifier dans le dictionnaire. ${SOURCE}`)}
    ${items.map(([m]) => `<div class="vc-ligne"><span class="vc-mot">${escapeHtml(m)}</span> ${trait}</div>`).join("")}</div>`
    + corrige("Les familles de mots", items.map(([m, f]) => `<b>${escapeHtml(m)}</b> : ${escapeHtml(f.join(", "))}`));
}

// ── Synonymes, antonymes ──────────────────────────────────────────────────

/** Un mot dans sa phrase, sa classe, un synonyme et un antonyme de même classe. */
const SYNONYMES: [string, string, string, string, string][] = [
  ["Le monstre était effrayant.", "effrayant", "adjectif", "terrifiant, épouvantable", "rassurant"],
  ["Le chemin devient étroit.", "étroit", "adjectif", "resserré", "large"],
  ["Nous commençons la partie.", "commençons", "verbe", "débutons", "finissons, terminons"],
  ["Elle monte l'escalier.", "monte", "verbe", "gravit", "descend"],
  ["Le public applaudit la victoire.", "victoire", "nom", "le succès, le triomphe", "la défaite"],
  ["Tom est un élève attentif.", "attentif", "adjectif", "concentré", "distrait, inattentif"],
  ["Il allume la lampe.", "allume", "verbe", "éclaire", "éteint"],
  ["J'entends un bruit étrange.", "étrange", "adjectif", "bizarre, curieux", "normal, ordinaire"],
  ["Le voyage fut rapide.", "rapide", "adjectif", "court, bref", "lent, long"],
  ["Sa joie faisait plaisir à voir.", "joie", "nom", "le bonheur, la gaieté", "la tristesse, la peine"],
];

function feuilleSynonymes(r: ReglagesVocabulaireCM, graine: number): string {
  const items = melanger(hasard(graine), SYNONYMES).slice(0, r.classe === "CM1" ? 6 : 8);
  const souligne = (p: string, m: string) => escapeHtml(p).replace(escapeHtml(m), `<u>${escapeHtml(m)}</u>`);
  return `<div class="page">${titre("Synonymes et antonymes")}${TETE}
    ${rappel("Un synonyme a un sens proche ; un antonyme, un sens contraire. Ils sont de la même classe que le mot : un nom pour un nom, un verbe pour un verbe, un adjectif pour un adjectif. Je vérifie en remplaçant le mot dans la phrase.")}
    ${regle(`Pour chaque mot souligné, j'écris sa classe, un synonyme et un antonyme de la même classe. Je vérifie en remplaçant le mot dans la phrase. ${SOURCE}`)}
    <table class="vc-tableau"><tr><th>La phrase</th><th>Classe</th><th>Synonyme</th><th>Antonyme</th></tr>${items.map(([p, m]) => `<tr><td>${souligne(p, m)}</td><td></td><td></td><td></td></tr>`).join("")}</table></div>`
    + corrige("Synonymes et antonymes", items.map(([p, m, c, s, a]) => `${souligne(p, m)} — ${c} ; synonyme : <b>${escapeHtml(s)}</b> ; antonyme : <b>${escapeHtml(a)}</b>`));
}

// ── La polysémie ──────────────────────────────────────────────────────────

/** Un mot, des phrases où il prend des sens différents, et chacun de ses sens. */
const POLYSEMIE: Record<"CM1" | "CM2", { mot: string; emplois: [string, string][] }[]> = {
  CM1: [
    { mot: "règle", emplois: [["Je trace un trait avec ma règle.", "l'instrument qui sert à tracer et à mesurer"], ["Je respecte la règle du jeu.", "ce qu'il faut faire ou ne pas faire"]] },
    { mot: "vue", emplois: [["Du sommet, on a une belle vue.", "ce qu'on voit, le paysage"], ["Ma grand-mère a une bonne vue.", "la capacité de voir"], ["Chacun a son point de vue.", "son avis"]] },
    { mot: "feuille", emplois: [["Une feuille tombe de l'arbre.", "la partie verte et plate d'une plante"], ["J'écris sur une feuille.", "un morceau de papier"]] },
    { mot: "bouton", emplois: [["Il a perdu un bouton de sa chemise.", "ce qui sert à fermer un vêtement"], ["J'appuie sur le bouton de la radio.", "ce qu'on presse pour faire marcher un appareil"], ["Un bouton de rose va s'ouvrir.", "la fleur avant qu'elle s'ouvre"]] },
  ],
  CM2: [
    { mot: "sens", emplois: [["Tourne dans le sens des aiguilles d'une montre.", "la direction"], ["Je cherche le sens de ce mot.", "la signification"], ["L'ouïe est l'un des cinq sens.", "la capacité de percevoir : voir, entendre, toucher, goûter, sentir"]] },
    { mot: "milieu", emplois: [["Le ballon est au milieu de la cour.", "le centre, l'endroit à égale distance des bords"], ["La rivière est le milieu de vie du castor.", "l'environnement où il vit"]] },
    { mot: "point", emplois: [["Une phrase finit par un point.", "le signe de ponctuation"], ["Notre équipe a marqué un point.", "une unité pour compter le score"], ["La gare est notre point de départ.", "l'endroit d'où l'on part"]] },
    { mot: "jouer", emplois: [["Nous jouons au ballon.", "jouer à : pratiquer un jeu, un sport"], ["Elle joue du piano.", "jouer de : faire de la musique avec un instrument"], ["Le poète joue sur les mots.", "jouer sur : s'amuser avec le sens des mots"], ["Il joue avec son petit frère.", "jouer avec : s'amuser en compagnie de quelqu'un"]] },
  ],
};

function feuillePolysemie(r: ReglagesVocabulaireCM, graine: number): string {
  const alea = hasard(graine);
  const mots = POLYSEMIE[r.classe];
  const blocs = mots.map((m) => {
    const sens = melanger(alea, m.emplois.map(([, s]) => s));
    return { m, sens };
  });
  return `<div class="page">${titre("Un mot, plusieurs sens")}${TETE}
    ${rappel("Un mot peut avoir plusieurs sens : c'est la phrase, le contexte, qui dit lequel. Pour le trouver, je relis la phrase et je remplace le mot par une explication.")}
    ${regle(`Pour chaque phrase, j'écris la lettre du sens qui convient. Puis j'écris une phrase de mon choix avec un des mots, dans un autre sens encore si je le peux. ${SOURCE}`)}
    ${blocs.map(({ m, sens }) => `<div class="vc-bloc"><div class="vc-titre-mot">${escapeHtml(m.mot)}</div><div class="vc-sens">${sens.map((s, i) => `<div><b>${String.fromCharCode(65 + i)}</b> ${escapeHtml(s)}</div>`).join("")}</div>
      ${m.emplois.map(([p]) => `<div class="vc-ligne">${escapeHtml(p)} <span class="vc-case"></span></div>`).join("")}</div>`).join("")}
    <div class="vc-ligne">Ma phrase : ${trait}</div></div>`
    + corrige("Un mot, plusieurs sens", blocs.map(({ m, sens }) => `<b>${escapeHtml(m.mot)}</b> : ${m.emplois.map(([p, s]) => `${escapeHtml(p)} → <b>${String.fromCharCode(65 + sens.indexOf(s))}</b>`).join(" ; ")}`));
}

// ── Le dictionnaire ───────────────────────────────────────────────────────

const LISTES_ALPHABETIQUES: string[][] = [
  ["castor", "cartable", "carotte", "cascade", "caméra", "cabane"], ["montagne", "moulin", "mouton", "morceau", "monstre", "moteur"],
  ["pendule", "pente", "pensée", "pendant", "peinture", "pelote"], ["tracteur", "trapèze", "trafic", "tramway", "travail", "trace"],
];

/** Un article de dictionnaire écrit pour Maitrize : la classe, les sens numérotés, les exemples, la famille. */
const ARTICLE = {
  mot: "chaîne", classe: "n. f.",
  sens: [["Suite d'anneaux de métal passés les uns dans les autres.", "Le chien est attaché par une chaîne."], ["Suite de montagnes qui se tiennent.", "La chaîne des Pyrénées sépare la France de l'Espagne."],
    ["Ensemble des programmes d'une télévision ou d'une radio.", "Il change de chaîne."], ["Travail à la chaîne : où chaque ouvrier fait toujours la même tâche, l'un après l'autre.", "Dans cette usine, on travaille à la chaîne."]],
  famille: "chaînon, enchaîner, déchaîner",
};

function feuilleDictionnaire(r: ReglagesVocabulaireCM, graine: number): string {
  const listes = melanger(hasard(graine), LISTES_ALPHABETIQUES).slice(0, 2);
  const ranger = (l: string[]) => [...l].sort((a, b) => a.localeCompare(b, "fr"));
  const article = `<div class="vc-article"><b>${ARTICLE.mot}</b> <i>${ARTICLE.classe}</i> ${ARTICLE.sens.map(([d, e], i) => `<b>${i + 1}.</b> ${escapeHtml(d)} <i>${escapeHtml(e)}</i>`).join(" ")} ◆ Famille : ${escapeHtml(ARTICLE.famille)}.</div>`;
  const qs: [string, string][] = [
    ["Quelle est la classe du mot « chaîne » ? Que veut dire « n. f. » ?", "Un nom féminin."],
    ["Combien de sens l'article donne-t-il ?", "Quatre."],
    ["Dans « La chaîne des Alpes est enneigée », quel est le sens du mot ?", "Le sens 2 : une suite de montagnes."],
    ["Dans « Les ouvriers travaillaient à la chaîne », quel est le sens ?", "Le sens 4 : le travail où chacun fait toujours la même tâche."],
    ["Écris un mot de la famille de « chaîne », et une phrase avec lui.", "chaînon, enchaîner, déchaîner : par exemple, « Le chien s'est déchaîné. »"],
  ];
  return `<div class="page">${titre("Le dictionnaire")}${TETE}
    ${rappel("Les mots sont rangés dans l'ordre alphabétique : si la première lettre est la même, on regarde la deuxième, puis la troisième. Un article donne la classe du mot, ses sens numérotés, des exemples, parfois les mots de sa famille.")}
    ${regle(`Je range chaque liste dans l'ordre alphabétique. Puis je lis l'article et je réponds aux questions. ${SOURCE}`)}
    ${listes.map((l, i) => `<div class="vc-ligne"><b>${i + 1}.</b> ${escapeHtml(l.join(", "))}</div><div class="vc-ligne">→ ${trait}</div>`).join("")}
    ${article}
    ${qs.slice(0, r.classe === "CM1" ? 4 : 5).map(([q], i) => `<div class="vc-q"><b>${i + 3}.</b> ${escapeHtml(q)}<div class="vc-ligne">${trait}</div></div>`).join("")}
    <div class="vc-source">Article écrit pour Maitrize, à la manière d'un dictionnaire.</div></div>`
    + corrige("Le dictionnaire", [...listes.map((l, i) => `<b>${i + 1}.</b> ${escapeHtml(ranger(l).join(", "))}`), ...qs.slice(0, r.classe === "CM1" ? 4 : 5).map(([q, rep], i) => `<b>${i + 3}.</b> ${escapeHtml(q)} — <b>${escapeHtml(rep)}</b>`)]);
}

// ── Le mot inconnu ────────────────────────────────────────────────────────

const MOTS_INCONNUS: Record<"CM1" | "CM2", [string, string, string, string][]> = {
  CM1: [
    ["Les touristes admirent le panorama depuis le sommet : on voit toute la vallée.", "panorama", "« on voit toute la vallée »", "la vue large sur tout un paysage"],
    ["Avant le tournoi, le chevalier revêt son armure de métal.", "armure", "« de métal », le chevalier qui va combattre ; arme, armé", "l'ensemble des pièces de métal qui protègent le corps"],
    ["La chenille devient papillon : c'est une métamorphose.", "métamorphose", "« la chenille devient papillon »", "une transformation complète"],
    ["L'eau de la flaque s'évapore au soleil.", "s'évapore", "« au soleil » ; vapeur", "se transforme en vapeur et disparaît dans l'air"],
    ["Le castor est herbivore : il ne mange que des plantes.", "herbivore", "« il ne mange que des plantes » ; herbe", "qui se nourrit de plantes"],
    ["Le navire accoste enfin, et les passagers descendent sur le quai.", "accoste", "« les passagers descendent sur le quai » ; la côte", "s'approche du bord pour s'y arrêter"],
  ],
  CM2: [
    ["Au XIXe siècle, l'industrialisation transforme les villes : partout, on construit des usines.", "industrialisation", "« on construit des usines » ; industrie, industriel", "le développement des industries et des usines"],
    ["La mécanisation des champs permet de récolter plus vite, avec des machines.", "mécanisation", "« avec des machines » ; mécanique, mécanicien", "le remplacement du travail à la main par des machines"],
    ["Chaque jour, des milliers de personnes font des déplacements pendulaires : elles vont travailler en ville le matin et rentrent chez elles le soir.", "pendulaires", "« le matin… et le soir » ; le pendule, qui va et vient", "qui font chaque jour l'aller-retour, comme un pendule"],
    ["Le convertisseur transforme le courant de la batterie pour faire marcher la lampe.", "convertisseur", "« transforme » ; convertir", "un appareil qui convertit, qui transforme une énergie ou un courant"],
    ["Fuyant la guerre, des familles entières ont migré vers un autre pays.", "migré", "« vers un autre pays » ; migration, migrant", "quitté leur pays pour aller vivre ailleurs"],
    ["Ce plastique n'est pas biodégradable : il restera des centaines d'années dans la nature.", "biodégradable", "« il restera des centaines d'années » ; bio-, dégrader, -able", "qui peut être décomposé par les êtres vivants du sol"],
  ],
};

function feuilleMotsInconnus(r: ReglagesVocabulaireCM, graine: number): string {
  const items = melanger(hasard(graine), MOTS_INCONNUS[r.classe]).slice(0, 5);
  const souligne = (p: string, m: string) => escapeHtml(p).replace(escapeHtml(m), `<b><u>${escapeHtml(m)}</u></b>`);
  return `<div class="page">${titre("Le mot inconnu")}${TETE}
    ${rappel("Pour comprendre un mot inconnu : je relis la phrase, celle d'avant, celle d'après ; je cherche un indice ; je cherche un mot de sa famille que je connais, ou un préfixe, un suffixe ; je propose un sens, je le vérifie en remplaçant le mot ; puis je vérifie dans le dictionnaire.")}
    ${regle(`Pour chaque mot souligné, j'écris l'indice qui m'aide, puis ce que veut dire le mot, avec mes mots. ${SOURCE}`)}
    ${items.map(([p, m], i) => `<div class="vc-q"><b>${i + 1}.</b> ${souligne(p, m)}<div class="vc-ligne">L'indice : ${trait}</div><div class="vc-ligne">Le sens : ${trait}</div></div>`).join("")}</div>`
    + corrige("Le mot inconnu", items.map(([, m, ind, sens], i) => `<b>${i + 1}.</b> <b>${escapeHtml(m)}</b> — indice : ${escapeHtml(ind)} ; sens : <b>${escapeHtml(sens)}</b>`));
}

// ── La corolle lexicale ───────────────────────────────────────────────────

/** Des univers de référence et leurs mots, par classe. */
const UNIVERS: Record<"CM1" | "CM2", { theme: string; noms: string; verbes: string; adjectifs: string; expressions: string }[]> = {
  CM1: [
    { theme: "la peur", noms: "la frayeur, l'effroi, l'angoisse, la panique", verbes: "trembler, frissonner, s'effrayer, sursauter", adjectifs: "effrayé, terrifié, inquiet, angoissé", expressions: "avoir une peur bleue, avoir la chair de poule, claquer des dents" },
    { theme: "la mer", noms: "la vague, la marée, le rivage, l'écume, la houle", verbes: "naviguer, accoster, chavirer, plonger", adjectifs: "marin, agitée, calme, salée", expressions: "un vieux loup de mer, ce n'est pas la mer à boire" },
    { theme: "le conte", noms: "le royaume, la fée, l'ogre, le sortilège, la quête", verbes: "ensorceler, délivrer, métamorphoser", adjectifs: "merveilleux, enchanté, maléfique", expressions: "il était une fois, ils vécurent heureux" },
  ],
  CM2: [
    { theme: "le château fort", noms: "le donjon, le rempart, le pont-levis, les douves, le créneau", verbes: "assiéger, défendre, fortifier, surveiller", adjectifs: "fortifié, imprenable, médiéval", expressions: "bâtir des châteaux en Espagne" },
    { theme: "la révolution industrielle", noms: "l'usine, l'ouvrier, la machine à vapeur, le charbon, l'industrialisation", verbes: "produire, fabriquer, mécaniser", adjectifs: "industriel, ouvrier, mécanique", expressions: "travailler à la chaîne" },
    { theme: "l'énergie", noms: "l'électricité, l'éolienne, le panneau solaire, la centrale", verbes: "produire, consommer, convertir, économiser", adjectifs: "renouvelable, électrique, solaire", expressions: "être plein d'énergie, faire des économies d'énergie" },
  ],
};

/** « de » devant un groupe nominal : du conte, des vagues, de la peur, de l'énergie. */
const de = (gn: string) => gn.replace(/^le /, "du ").replace(/^les /, "des ").replace(/^(la |l')/, "de $1");

function feuilleCorolle(r: ReglagesVocabulaireCM, graine: number): string {
  const u = UNIVERS[r.classe][Math.floor(hasard(graine)() * UNIVERS[r.classe].length)];
  return `<div class="page">${titre(`Les mots ${de(u.theme)}`)}${TETE}
    ${regle(`Je complète la corolle avec les mots appris : des noms, des verbes, des adjectifs, des expressions. Puis j'écris trois phrases qui réemploient ces mots. ${SOURCE}`)}
    <div class="vc-corolle"><div class="vc-coeur">${escapeHtml(u.theme)}</div>${["Des noms", "Des verbes", "Des adjectifs", "Des expressions"].map((p) => `<div class="vc-petale"><b>${p}</b><div class="vc-ligne">${trait}</div><div class="vc-ligne">${trait}</div></div>`).join("")}</div>
    ${[1, 2, 3].map((k) => `<div class="vc-ligne"><b>${k}.</b> ${trait}</div>`).join("")}</div>`
    + corrige(`Les mots ${de(u.theme)}`, [`<b>Des noms</b> : ${escapeHtml(u.noms)}`, `<b>Des verbes</b> : ${escapeHtml(u.verbes)}`, `<b>Des adjectifs</b> : ${escapeHtml(u.adjectifs)}`, `<b>Des expressions</b> : ${escapeHtml(u.expressions)}`, "Toute phrase qui réemploie les mots à bon escient convient."]);
}

// ── L'orthographe des mots ────────────────────────────────────────────────

/** Des mots à la lettre finale muette, et le mot de la famille qui la fait entendre. */
const LETTRES_MUETTES: [string, string, string][] = [
  ["un ran…", "rang", "ranger"], ["le san…", "sang", "sanguin"], ["un bavar…", "bavard", "bavarder"], ["le galo…", "galop", "galoper"], ["le toi…", "toit", "toiture"],
  ["un chan…", "chant", "chanter"], ["le cham…", "champ", "champêtre"], ["le hasar…", "hasard", "hasarder, hasardeux"], ["lai…", "laid", "laideur"], ["le progrè…", "progrès", "progresser"],
  ["le repo…", "repos", "reposer"], ["le regar…", "regard", "regarder"], ["un dra…", "drap", "draper"], ["le plom…", "plomb", "plombier"], ["le bor…", "bord", "border"],
];

function feuilleLettresMuettes(r: ReglagesVocabulaireCM, graine: number): string {
  const items = melanger(hasard(graine), LETTRES_MUETTES).slice(0, r.classe === "CM1" ? 8 : 10);
  return `<div class="page">${titre("La lettre muette")}${TETE}
    ${rappel("Une lettre muette, à la fin d'un mot, s'entend souvent dans un mot de sa famille : le hasard, hasardeux ; laid, la laideur ; le progrès, progresser.")}
    ${regle(`Pour chaque mot, je cherche un mot de la même famille qui fait entendre la lettre muette. Puis j'écris le mot en entier. ${SOURCE}`)}
    <table class="vc-tableau"><tr><th>Le mot à compléter</th><th>Un mot de sa famille</th><th>Le mot écrit en entier</th></tr>${items.map(([m]) => `<tr><td class="vc-mot">${escapeHtml(m)}</td><td></td><td></td></tr>`).join("")}</table></div>`
    + corrige("La lettre muette", items.map(([m, mot, fam]) => `${escapeHtml(m)} → <b>${escapeHtml(mot)}</b>, comme ${escapeHtml(fam)}`));
}

const METIERS: [string, string, string][] = [
  ["un agriculteur", "une agricultrice", "-teur, -trice"], ["un acteur", "une actrice", "-teur, -trice"], ["un directeur", "une directrice", "-teur, -trice"],
  ["un conducteur", "une conductrice", "-teur, -trice"], ["un explorateur", "une exploratrice", "-teur, -trice"], ["un instituteur", "une institutrice", "-teur, -trice"],
  ["un chanteur", "une chanteuse", "-eur, -euse"], ["un danseur", "une danseuse", "-eur, -euse"], ["un vendeur", "une vendeuse", "-eur, -euse"], ["un coiffeur", "une coiffeuse", "-eur, -euse"],
];

function feuilleFeminins(graine: number): string {
  const items = melanger(hasard(graine), METIERS).slice(0, 8);
  return `<div class="page">${titre("Les noms de métiers")}${TETE}
    ${rappel("Au féminin, -teur devient souvent -trice : un agriculteur, une agricultrice ; -eur devient souvent -euse : un chanteur, une chanteuse. Quand j'hésite, je vérifie dans le dictionnaire.")}
    ${regle(`J'écris le nom de chaque métier au féminin. Puis je range les mots en deux colonnes : -trice et -euse. ${SOURCE}`)}
    ${items.map(([m]) => `<div class="vc-ligne">${escapeHtml(m)} → ${trait}</div>`).join("")}
    <table class="vc-tableau vc-deux"><tr><th>-teur, -trice</th><th>-eur, -euse</th></tr><tr><td></td><td></td></tr></table></div>`
    + corrige("Les noms de métiers", items.map(([m, f, r]) => `${escapeHtml(m)} → <b>${escapeHtml(f)}</b> (${escapeHtml(r)})`));
}

/** Des mots invariables fréquents, à mémoriser. */
export const INVARIABLES: string[] = ["toujours", "souvent", "beaucoup", "maintenant", "pendant", "longtemps", "aujourd'hui", "autrefois", "parfois", "ensuite",
  "déjà", "bientôt", "assez", "trop", "très", "peut-être", "quelquefois", "jamais", "avec", "sans", "chez", "depuis", "malgré", "pourtant", "cependant", "ailleurs", "dehors", "devant", "derrière", "parmi"];

function feuilleInvariables(r: ReglagesVocabulaireCM, graine: number): string {
  const mots = melanger(hasard(graine), INVARIABLES).slice(0, r.classe === "CM1" ? 10 : 12);
  return `<div class="page">${titre("Les mots invariables")}${TETE}
    ${rappel("Un mot invariable ne change jamais : ni au pluriel, ni au féminin. On l'apprend par cœur : je l'épelle, je le cache, je l'écris, je vérifie.")}
    ${regle(`J'apprends les mots de la liste. Puis, le jour de la dictée, je les écris sous la dictée, et j'écris une phrase avec deux d'entre eux. ${SOURCE}`)}
    <div class="vc-liste">${mots.map((m) => `<span>${escapeHtml(m)}</span>`).join("")}</div>
    <div class="vc-titre-mot">La dictée</div>${Array.from({ length: Math.ceil(mots.length / 2) }, () => `<div class="vc-deux-lignes"><div class="vc-ligne">${trait}</div><div class="vc-ligne">${trait}</div></div>`).join("")}
    <div class="vc-ligne">Ma phrase : ${trait}</div></div>`;
}

export function htmlVocabulaireCM(r: ReglagesVocabulaireCM, graine: number): string {
  const corps = r.exercice === "formation" ? feuilleFormation(r, graine)
    : r.exercice === "familles" ? feuilleFamilles(r, graine)
      : r.exercice === "synonymes" ? feuilleSynonymes(r, graine)
        : r.exercice === "polysemie" ? feuillePolysemie(r, graine)
          : r.exercice === "dictionnaire" ? feuilleDictionnaire(r, graine)
            : r.exercice === "mots-inconnus" ? feuilleMotsInconnus(r, graine)
              : r.exercice === "corolle" ? feuilleCorolle(r, graine)
                : r.exercice === "lettres-muettes" ? feuilleLettresMuettes(r, graine)
                  : r.exercice === "feminins" ? feuilleFeminins(graine)
                    : feuilleInvariables(r, graine);
  return feuille(corps, "vc");
}

export const STYLE_VOCABULAIRE_CM = `
  .feuille.vc .vc-tableau { width: 100%; border-collapse: collapse; font-size: 13px; margin: 0 0 4mm; }
  .feuille.vc .vc-tableau th, .feuille.vc .vc-tableau td { border: 1px solid #1c2233; padding: 2mm; text-align: left; height: 10mm; }
  .feuille.vc .vc-tableau th { background: #f7f8fc; font-size: 11.5px; }
  .feuille.vc .vc-deux td { height: 40mm; vertical-align: top; width: 50%; }
  .feuille.vc .vc-mot { font-weight: 700; font-size: 14px; }
  .feuille.vc .vc-ligne { display: flex; align-items: flex-end; gap: 2mm; font-size: 14px; margin: 0 0 2.5mm; min-height: 8mm; }
  .feuille.vc .vc-trait { flex: 1; border-bottom: 1px dotted #687087; height: 6mm; display: inline-block; min-width: 30mm; }
  .feuille.vc .vc-case { display: inline-block; width: 8mm; height: 7mm; border: 1.5px solid #1c2233; border-radius: 1mm; margin-left: auto; }
  .feuille.vc .vc-bloc { border: 1px solid #c4c9d6; border-radius: 2mm; padding: 2.5mm 3mm; margin: 0 0 3mm; break-inside: avoid; page-break-inside: avoid; }
  .feuille.vc .vc-titre-mot { font-size: 15px; font-weight: 800; margin: 0 0 1.5mm; }
  .feuille.vc .vc-sens { font-size: 12px; color: #2c3346; margin: 0 0 2mm; line-height: 1.6; }
  .feuille.vc .vc-q { font-size: 13.5px; margin: 0 0 3mm; line-height: 1.5; break-inside: avoid; page-break-inside: avoid; }
  .feuille.vc .vc-article { border: 1.5px solid #1c2233; border-radius: 2mm; padding: 3mm 4mm; font-size: 13px; line-height: 1.6; margin: 3mm 0 4mm; }
  .feuille.vc .vc-source { font-size: 10.5px; color: #687087; font-style: italic; text-align: right; }
  .feuille.vc .vc-corolle { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; margin: 0 0 4mm; position: relative; }
  .feuille.vc .vc-coeur { grid-column: 1 / span 2; text-align: center; font-weight: 800; font-size: 16px; border: 2px solid #1c2233; border-radius: 10mm; padding: 2mm; margin: 0 30mm; }
  .feuille.vc .vc-petale { border: 1px solid #c4c9d6; border-radius: 6mm; padding: 2mm 4mm; font-size: 12.5px; }
  .feuille.vc .vc-liste { display: block; margin: 0 0 4mm; }
  .feuille.vc .vc-liste span { display: inline-block; font-size: 15px; border: 1px solid #c4c9d6; border-radius: 2mm; padding: 1mm 3mm; margin: 0 2mm 2mm 0; }
  .feuille.vc .vc-deux-lignes { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; }
  .feuille.vc .vc-corrige { font-size: 13px; line-height: 1.6; }
  .feuille.vc .vc-c { margin: 0 0 2mm; }
`;
