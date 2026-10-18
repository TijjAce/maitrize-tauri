// Lire et comprendre des documents pour apprendre dans toutes les disciplines :
// le cours moyen.
//
// Programme de français du cycle 3 (2025), au CM1 : « donner la nature et la
// source d'un document », « identifier les différents genres représentés et
// repérer leurs caractéristiques majeures », « trouver dans des documents
// simples les réponses à des questions », « découvrir des documents
// composites et y repérer des informations grâce à un questionnement » ; au
// CM2 : « reconnaître et nommer les caractéristiques des différents éléments
// d'un document composite », « rapprocher deux documents convergents, de
// genres différents, pour repérer et compléter les informations », prélever
// des informations, en faisant des inférences, pour donner un sens global
// aux documents. Exemples de réussite : la nature et la source d'un
// document de géographie ; le sommaire d'un ouvrage pour chercher une
// réponse ; texte, image, tableau, graphique, dessin, photographie ; au
// CM2, lire un tableau à double entrée.
//
// Les photographies sont celles de « Lire un paysage » (Wikimedia Commons,
// licences libres, voir photosPaysages.ts) ; les autres documents sont
// écrits pour Maitrize, les données des tableaux imaginées pour l'exercice.

import { escapeHtml } from "./print";
import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";
import { ATTENTE_PHOTO, creditPhoto, photoPaysage } from "./photosPaysages";

export type ExerciceDocumentsCM = "nature-source" | "sommaire" | "composite" | "deux-documents" | "double-entree";

export const EXERCICES_DOCUMENTS_CM: { id: ExerciceDocumentsCM; libelle: string }[] = [
  { id: "nature-source", libelle: "La nature et la source d'un document" },
  { id: "sommaire", libelle: "Chercher dans un livre : le sommaire, le lexique, l'index" },
  { id: "composite", libelle: "Un document composite : y chercher des informations" },
  { id: "deux-documents", libelle: "Rapprocher deux documents (CM2)" },
  { id: "double-entree", libelle: "Lire un tableau à double entrée (CM2)" },
];

export interface ReglagesDocumentsCM { classe: "CM1" | "CM2"; exercice: ExerciceDocumentsCM; titre?: string }
export const REGLAGES_DOCUMENTS_CM: ReglagesDocumentsCM = { classe: "CM1", exercice: "nature-source" };

const TETE = '<div class="sous">Prénom : ........................................ Date : ........................</div>';
const titre = (t: string) => `<div class="titre">${escapeHtml(t)}</div>`;
const regle = (t: string) => `<div class="regle">${t}</div>`;
const rappel = (t: string) => `<div class="rappel">${t}</div>`;
const SOURCE = '<span class="reference">Programme de français du cycle 3, 2025.</span>';
const ligne = (etiquette = "") => `<div class="dc-ligne">${etiquette ? `<span>${escapeHtml(etiquette)}</span>` : ""}<span class="dc-trait"></span></div>`;
const question = (n: number, q: string, lignes = 1) => `<div class="dc-q"><div class="dc-enonce"><b>${n}.</b> ${escapeHtml(q)}</div>${Array.from({ length: lignes }, () => ligne()).join("")}</div>`;
const corrige = (t: string, items: string[]) => `<div class="page corrige">${titre(`${t} — corrigé`)}<div class="dc-corrige">${items.map((x) => `<div class="dc-c">${x}</div>`).join("")}</div></div>`;

// ── Les documents ─────────────────────────────────────────────────────────

/** Un diagramme en barres : les températures du matin, une semaine d'octobre. */
function diagrammeTemperatures(): string {
  const valeurs: [string, number][] = [["lundi", 8], ["mardi", 6], ["mercredi", 9], ["jeudi", 11], ["vendredi", 10]];
  const h = 44, base = 50, x0 = 14;
  const barres = valeurs.map(([j, v], i) => `<rect x="${x0 + 4 + i * 16}" y="${base - v * 3.5}" width="9" height="${v * 3.5}" fill="#9db7f5" stroke="#1c2233" stroke-width="0.3"/>`
    + `<text x="${x0 + 8.5 + i * 16}" y="${base + 5}" font-size="3.4" text-anchor="middle">${j}</text>`).join("");
  const graduations = [0, 2, 4, 6, 8, 10, 12].map((v) => `<line x1="${x0 - 1}" x2="${x0 + 82}" y1="${base - v * 3.5}" y2="${base - v * 3.5}" stroke="#c4c9d6" stroke-width="0.2"/><text x="${x0 - 2}" y="${base - v * 3.5 + 1.2}" font-size="3.2" text-anchor="end">${v}</text>`).join("");
  return `<svg viewBox="0 0 100 ${h + 14}" width="100%" style="max-width:90mm">${graduations}<line x1="${x0}" x2="${x0}" y1="${base - 44}" y2="${base}" stroke="#1c2233" stroke-width="0.4"/>${barres}`
    + `<text x="2" y="4" font-size="3.2">°C</text></svg>`;
}

/** Un plan de quartier, avec sa légende, son nord et son échelle. */
function planDuQuartier(): string {
  const rue = (x1: number, y1: number, x2: number, y2: number) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#c4c9d6" stroke-width="5"/>`;
  const bat = (x: number, y: number, w: number, hh: number, c: string, n: string) => `<rect x="${x}" y="${y}" width="${w}" height="${hh}" fill="${c}" stroke="#1c2233" stroke-width="0.3"/><text x="${x + w / 2}" y="${y + hh / 2 + 1.2}" font-size="3.3" text-anchor="middle">${n}</text>`;
  return `<svg viewBox="0 0 100 62" width="100%" style="max-width:90mm">${rue(0, 20, 100, 20)}${rue(50, 0, 50, 62)}${rue(0, 46, 100, 46)}
    ${bat(6, 4, 30, 11, "#fde68a", "1")}${bat(58, 4, 18, 11, "#fecaca", "2")}${bat(6, 26, 36, 14, "#bbf7d0", "3")}${bat(58, 26, 14, 14, "#c7d2fe", "4")}${bat(78, 50, 18, 9, "#e9d5ff", "5")}
    <text x="20" y="22" font-size="2.8">rue des Écoles</text><text x="52" y="58" font-size="2.8">avenue de la Gare</text>
    <path d="M92 4 L94 10 L92 8.5 L90 10 Z" fill="#1c2233"/><text x="92" y="14" font-size="3" text-anchor="middle">N</text>
    <line x1="4" y1="58" x2="24" y2="58" stroke="#1c2233" stroke-width="0.6"/><text x="14" y="56" font-size="2.8" text-anchor="middle">100 m</text></svg>
    <div class="dc-legende">1 l'école · 2 la mairie · 3 le parc · 4 la boulangerie · 5 la gare</div>`;
}

const TRANSPORTS = '<table class="dc-mini"><tr><th>Moyen de transport</th><th>Nombre d\'élèves</th></tr><tr><td>À pied</td><td>9</td></tr><tr><td>À vélo</td><td>4</td></tr><tr><td>En voiture</td><td>8</td></tr><tr><td>En bus</td><td>5</td></tr></table>';

interface Document { contenu: string; source: string; nature: string; indice: string }

function documentsANommer(graine: number): Document[] {
  const photo = photoPaysage(melanger(hasard(graine), ["fleuve", "montagne", "village", "savane", "vallee"])[0])!;
  return [
    { contenu: `<figure class="dc-photo"><img src="${ATTENTE_PHOTO}${photo.id}" alt="${escapeHtml(photo.titre)}"><figcaption>${escapeHtml(photo.titre)}</figcaption></figure>`,
      source: creditPhoto(photo), nature: "une photographie", indice: "une image prise avec un appareil photo ; le nom du photographe et la licence sont donnés" },
    { contenu: '<div class="dc-vers">Entre les pattes d\'un Lion<br>Un Rat sortit de terre assez à l\'étourdie.<br>Le Roi des animaux, en cette occasion,<br>Montra ce qu\'il était, et lui donna la vie.</div>',
      source: "Jean de La Fontaine, Fables, livre II, fable 11 (1668).", nature: "un extrait de fable, un texte littéraire en vers", indice: "des vers, des animaux qui agissent comme des personnes ; l'auteur et le titre de l'œuvre" },
    { contenu: TRANSPORTS, source: "Enquête de la classe de CM1, en septembre.", nature: "un tableau", indice: "des lignes et des colonnes, avec des nombres" },
    { contenu: diagrammeTemperatures(), source: "Relevés de la classe : la température de la cour, chaque matin à 9 h, une semaine d'octobre.", nature: "un graphique, un diagramme en barres", indice: "des barres dont la hauteur donne une valeur, un axe gradué" },
    { contenu: planDuQuartier(), source: "Plan dessiné par la classe.", nature: "un plan", indice: "le quartier vu de dessus, une légende, le nord et une échelle" },
    { contenu: '<div class="dc-texte"><b>Un grand rongeur</b><br>Le castor est le plus gros rongeur d\'Europe. Il peut peser plus de vingt kilos. Son corps est couvert d\'une fourrure épaisse et imperméable.</div>',
      source: "Texte écrit pour Maitrize.", nature: "un texte documentaire", indice: "des informations vraies, un intertitre, pas d'histoire" },
  ];
}

function feuilleNatureSource(_r: ReglagesDocumentsCM, graine: number): string {
  const docs = documentsANommer(graine);
  const lettres = "ABCDEF";
  const cases = docs.map((d, i) => `<div class="dc-doc"><div class="dc-lettre">Document ${lettres[i]}</div><div class="dc-contenu">${d.contenu}</div><div class="dc-source">${escapeHtml(d.source)}</div>
    ${ligne("Sa nature :")}${ligne("Sa source :")}${ligne("Ce qui le montre :")}</div>`).join("");
  return `<div class="page">${titre("La nature et la source d'un document")}${TETE}
    ${rappel("La nature d'un document, c'est ce qu'il est : un texte documentaire, un extrait de roman, de fable ou de poème, une photographie, un dessin, un tableau, un graphique, un plan, une carte. Sa source, c'est d'où il vient : son auteur, son titre, sa date, qui l'a fait.")}
    ${regle(`J'observe chaque document. J'écris sa nature et sa source. J'écris ce qui m'a permis de reconnaître sa nature. ${SOURCE}`)}
    <div class="dc-grille">${cases}</div></div>`
    + corrige("La nature et la source d'un document", docs.map((d, i) => `<b>Document ${lettres[i]}</b> : <b>${escapeHtml(d.nature)}</b> ; source : ${escapeHtml(d.source)} <span class="dc-gris">— ${escapeHtml(d.indice)}.</span>`));
}

// ── Le sommaire ───────────────────────────────────────────────────────────

const SOMMAIRE: [string, number][] = [
  ["Introduction : qu'est-ce qu'une rivière ?", 4], ["1. De la source à l'embouchure", 6], ["2. Les poissons de la rivière", 12], ["3. Les oiseaux des berges", 18],
  ["4. Le castor et la loutre", 24], ["5. Les insectes de l'eau", 30], ["6. La rivière en danger", 36], ["Lexique", 42], ["Index", 46],
];
const QUESTIONS_SOMMAIRE: [string, string][] = [
  ["Je cherche ce que mange le martin-pêcheur, un oiseau qui vit au bord de l'eau. À quelle page commencer ?", "Page 18 : le chapitre 3, « Les oiseaux des berges »."],
  ["Je veux savoir comment le castor construit son barrage. Quel chapitre lire ?", "Le chapitre 4, « Le castor et la loutre », page 24."],
  ["Je ne connais pas le mot « affluent ». Où chercher son sens ?", "Dans le lexique, page 42 : il explique les mots difficiles."],
  ["Je fais un exposé sur la pollution de l'eau. Quel chapitre m'aidera ?", "Le chapitre 6, « La rivière en danger », page 36."],
  ["Combien de pages compte le chapitre sur les poissons ?", "Six pages : de la page 12 à la page 17 ; le chapitre suivant commence page 18."],
  ["Je veux trouver toutes les pages qui parlent de la truite. Où chercher ?", "Dans l'index, page 46 : il donne les mots dans l'ordre alphabétique, avec leurs pages."],
];

function feuilleSommaire(r: ReglagesDocumentsCM, graine: number): string {
  const qs = r.classe === "CM1" ? QUESTIONS_SOMMAIRE.slice(0, 5) : melanger(hasard(graine), QUESTIONS_SOMMAIRE);
  const sommaire = SOMMAIRE.map(([c, p]) => `<tr><td>${escapeHtml(c)}</td><td class="dc-points"></td><td class="dc-page">${p}</td></tr>`).join("");
  return `<div class="page">${titre("Chercher dans un livre documentaire")}${TETE}
    ${rappel("Le sommaire, au début du livre, donne les chapitres dans l'ordre des pages. Le lexique, à la fin, explique les mots difficiles. L'index, à la fin, donne les mots dans l'ordre alphabétique, avec les pages où l'on en parle.")}
    ${regle(`Je lis le sommaire du livre. Pour chaque recherche, j'écris où chercher, et à quelle page. ${SOURCE}`)}
    <div class="dc-livre"><div class="dc-livre-titre">La vie de la rivière — sommaire</div><table class="dc-sommaire">${sommaire}</table></div>
    <div class="dc-questions">${qs.map(([q], i) => question(i + 1, q)).join("")}</div></div>`
    + corrige("Chercher dans un livre documentaire", qs.map(([q, rep], i) => `<b>${i + 1}.</b> ${escapeHtml(q)} — <b>${escapeHtml(rep)}</b>`));
}

// ── Le document composite ─────────────────────────────────────────────────

/** Le schéma du cycle de l'eau : le soleil, la mer, le nuage, la montagne, les flèches nommées. */
function schemaDuCycle(): string {
  const fleche = (d: string) => `<path d="${d}" fill="none" stroke="#2454e6" stroke-width="0.7" marker-end="url(#dc-pointe)"/>`;
  const mot = (x: number, y: number, t: string) => `<text x="${x}" y="${y}" font-size="3.4" fill="#1c2233">${t}</text>`;
  return `<svg viewBox="0 0 160 78" width="100%" style="max-width:150mm"><defs><marker id="dc-pointe" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill="#2454e6"/></marker></defs>
    <circle cx="14" cy="12" r="7" fill="#fde68a" stroke="#d9a400" stroke-width="0.5"/>
    <path d="M0 62 L70 62 L70 78 L0 78 Z" fill="#bfdbfe"/><path d="M0 62 q5 -2 10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0" fill="none" stroke="#2454e6" stroke-width="0.4"/>
    <path d="M70 62 L100 40 L118 22 L136 38 L160 50 L160 78 L70 78 Z" fill="#d6c7a1" stroke="#8a7650" stroke-width="0.4"/>
    <path d="M70 70 L160 70" stroke="#93c5fd" stroke-width="2.5" stroke-dasharray="3 1.5"/>
    <ellipse cx="84" cy="14" rx="15" ry="6" fill="#e5e7eb" stroke="#9aa0b4" stroke-width="0.4"/><ellipse cx="96" cy="12" rx="10" ry="5" fill="#e5e7eb" stroke="#9aa0b4" stroke-width="0.4"/>
    ${[104, 108, 112, 116].map((x) => `<line x1="${x}" y1="20" x2="${x - 3}" y2="30" stroke="#2454e6" stroke-width="0.4"/>`).join("")}
    ${fleche("M30 58 C 34 40, 50 24, 66 16")}${mot(18, 40, "évaporation")}
    ${mot(66, 6, "condensation : les nuages")}
    ${mot(118, 16, "précipitations")}
    ${fleche("M112 34 C 100 44, 86 54, 74 60")}${mot(56, 50, "ruissellement")}
    ${fleche("M128 44 L 130 66")}${mot(132, 58, "infiltration")}
    ${mot(118, 76, "nappe souterraine")}</svg>`;
}

function feuilleComposite(r: ReglagesDocumentsCM): string {
  const cm2 = r.classe === "CM2";
  const marque = (l: string) => (cm2 ? `<span class="dc-marque">${l}</span>` : "");
  const doc = `<div class="dc-composite">
    <div class="dc-c-titre">${marque("A")} Le cycle de l'eau</div>
    <div class="dc-chapeau">${marque("B")} Sur la Terre, l'eau ne disparaît pas : elle voyage sans cesse entre la mer, le ciel et le sol.</div>
    <div class="dc-schema">${marque("C")} ${schemaDuCycle()}<div class="dc-legende-schema">${marque("D")} Le cycle de l'eau, schéma simplifié.</div></div>
    <div class="dc-deux"><div class="dc-encadre">${marque("E")} <b>Le savais-tu ?</b> Un nuage, qui paraît si léger, peut contenir plusieurs centaines de tonnes d'eau, en minuscules gouttelettes.</div>
    <div>${marque("F")} <table class="dc-mini"><tr><th colspan="2">Où se trouve l'eau de la Terre ?</th></tr><tr><td>Dans les mers et les océans (eau salée)</td><td>environ 97 %</td></tr><tr><td>Eau douce, dont la plus grande partie est gelée : glaciers, banquises</td><td>environ 3 %</td></tr></table></div></div>
    <div class="dc-source">${marque("G")} Document composé pour Maitrize.</div></div>`;
  const qs: [string, string][] = [
    ["Comment s'appelle le passage de l'eau de la mer vers l'air ? Dans quelle partie du document l'as-tu trouvé ?", "L'évaporation ; sur le schéma."],
    ["Quelle part de l'eau de la Terre est salée ? Où l'as-tu trouvé ?", "Environ 97 % ; dans le tableau."],
    ["Combien d'eau un nuage peut-il contenir ? Où l'as-tu trouvé ?", "Plusieurs centaines de tonnes ; dans l'encadré « Le savais-tu ? »."],
    ["Que devient l'eau de pluie qui s'infiltre dans le sol ?", "Elle rejoint la nappe souterraine ; on le voit sur le schéma."],
    ["Quelle phrase dit, en tête du document, de quoi il parle ?", "Le chapeau : « Sur la Terre, l'eau ne disparaît pas : elle voyage sans cesse entre la mer, le ciel et le sol. »"],
    ...(cm2 ? [["D'après le tableau, pourquoi faut-il économiser l'eau douce ?", "L'eau douce ne fait qu'environ 3 % de l'eau de la Terre, et la plus grande partie est gelée : il en reste peu pour boire."] as [string, string]] : []),
  ];
  const elements = cm2 ? `<div class="dc-q"><div class="dc-enonce"><b>${qs.length + 1}.</b> J'écris le nom de chaque partie du document, repérée par sa lettre : le titre, le chapeau, le schéma, la légende, l'encadré, le tableau, la source.</div>
    <table class="dc-lettres"><tr>${"ABCDEFG".split("").map((l) => `<td><b>${l}</b><span class="dc-trait"></span></td>`).join("")}</tr></table></div>` : "";
  const elementsCorriges = cm2 ? [`<b>${qs.length + 1}.</b> A le titre ; B le chapeau ; C le schéma ; D la légende ; E l'encadré ; F le tableau ; G la source.`] : [];
  return `<div class="page">${titre("Un document composite")}${TETE}
    ${rappel("Un document composite réunit plusieurs documents sur une même page : un titre, un chapeau qui résume, du texte, un schéma ou une image avec sa légende, un encadré, un tableau, la source. Pour répondre, je cherche dans la bonne partie, puis je combine les informations.")}
    ${regle(`Je regarde d'abord tout le document : le titre, le chapeau, le schéma, l'encadré, le tableau. Pour chaque question, je cherche dans la bonne partie et je réponds. ${SOURCE}`)}
    ${doc}</div><div class="page"><div class="titre">Un document composite — je cherche</div><div class="dc-questions">${qs.map(([q], i) => question(i + 1, q, 2)).join("")}${elements}</div></div>`
    + corrige("Un document composite", [...qs.map(([q, rep], i) => `<b>${i + 1}.</b> ${escapeHtml(q)} — <b>${escapeHtml(rep)}</b>`), ...elementsCorriges]);
}

// ── Deux documents ────────────────────────────────────────────────────────

const FICHE_CASTOR: [string, string][] = [
  ["Classe", "mammifère rongeur"], ["Longueur", "de 80 cm à 1 m, sans la queue"], ["Poids", "de 20 à 30 kg"], ["Nourriture", "écorce, feuilles, plantes d'eau"],
  ["Habitat", "rivières et étangs bordés d'arbres"], ["Les petits", "de 1 à 4 castoreaux par portée, nés au printemps"], ["Statut", "espèce protégée en France"],
];
const QUESTIONS_DEUX: [string, string][] = [
  ["Que mange le castor ? Les deux documents le disent-ils ?", "De l'écorce, des feuilles et des plantes d'eau ; oui, les deux documents le disent."],
  ["Combien de petits a une femelle castor ? Quel document le dit ?", "De 1 à 4 castoreaux par portée ; seulement la fiche d'identité."],
  ["Pourquoi le castor a-t-il failli disparaître de France ? Quel document le dit ?", "On l'a chassé pour sa fourrure ; seulement le texte."],
  ["Le castor est-il herbivore ? Je le prouve avec les deux documents.", "Oui : le texte dit qu'il est herbivore ; la fiche donne sa nourriture, uniquement des plantes."],
  ["Un castor de 25 kg est-il sans doute un adulte ou un petit ? Je combine les deux documents.", "Sans doute un adulte : la fiche donne de 20 à 30 kg, et le texte dit qu'il peut peser plus de vingt kilos."],
];

function feuilleDeuxDocuments(): string {
  const texte = '<div class="dc-texte">Le castor est le plus gros rongeur d\'Europe. Il peut peser plus de vingt kilos. Ses quatre grandes incisives, de couleur orange, poussent toute sa vie. Il se nourrit d\'écorce, de feuilles et de plantes d\'eau : c\'est un animal herbivore. Avec des branches, des pierres et de la boue, il construit un barrage en travers de la rivière. Chassé pendant des siècles pour sa fourrure, il a failli disparaître de France. Aujourd\'hui, il est protégé par la loi.</div>';
  const fiche = `<table class="dc-mini">${FICHE_CASTOR.map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join("")}</table>`;
  return `<div class="page">${titre("Deux documents sur le castor")}${TETE}
    ${rappel("Deux documents de genres différents peuvent parler du même sujet : l'un dit ce que l'autre ne dit pas. Pour répondre, je cherche dans les deux, puis je combine ce que j'ai trouvé.")}
    ${regle(`Je lis les deux documents. Pour chaque question, je cherche dans l'un, dans l'autre, ou dans les deux. Puis je remplis le tableau. ${SOURCE}`)}
    <div class="dc-deux"><div class="dc-doc"><div class="dc-lettre">Document 1 — un texte documentaire</div>${texte}<div class="dc-source">Texte écrit pour Maitrize.</div></div>
    <div class="dc-doc"><div class="dc-lettre">Document 2 — une fiche d'identité</div><div class="dc-c-titre">Le castor d'Europe</div>${fiche}<div class="dc-source">Fiche écrite pour Maitrize.</div></div></div>
    <div class="dc-questions">${QUESTIONS_DEUX.map(([q], i) => question(i + 1, q, 2)).join("")}
    <div class="dc-q"><div class="dc-enonce"><b>${QUESTIONS_DEUX.length + 1}.</b> Je classe ce que j'ai appris.</div><table class="dc-mini dc-classer"><tr><th>Seulement dans le texte</th><th>Seulement dans la fiche</th><th>Dans les deux</th></tr><tr><td></td><td></td><td></td></tr></table></div></div></div>`
    + corrige("Deux documents sur le castor", [...QUESTIONS_DEUX.map(([q, rep], i) => `<b>${i + 1}.</b> ${escapeHtml(q)} — <b>${escapeHtml(rep)}</b>`),
      `<b>${QUESTIONS_DEUX.length + 1}.</b> Seulement dans le texte : les incisives orange qui poussent toute sa vie, le barrage, la chasse pour sa fourrure. Seulement dans la fiche : sa longueur, son habitat, ses petits. Dans les deux : son poids, sa nourriture, sa protection.`]);
}

// ── Le tableau à double entrée ────────────────────────────────────────────

const EMPRUNTS: { classe: string; romans: number; bd: number; documentaires: number; poesie: number }[] = [
  { classe: "CM1", romans: 34, bd: 41, documentaires: 18, poesie: 7 },
  { classe: "CM2", romans: 45, bd: 38, documentaires: 22, poesie: 5 },
];
const total = (x: (typeof EMPRUNTS)[number]) => x.romans + x.bd + x.documentaires + x.poesie;
const QUESTIONS_EMPRUNTS: [string, string][] = [
  ["Combien de documentaires les CM2 ont-ils empruntés ?", "22."],
  ["Quelle classe a emprunté le plus de bandes dessinées ?", "Le CM1 : 41, contre 38 pour le CM2."],
  ["Combien de livres de poésie ont été empruntés en tout ?", "12 : 7 au CM1 et 5 au CM2."],
  ["Quel genre les CM2 ont-ils le plus emprunté ?", "Les romans : 45."],
  ["Combien de livres les deux classes ont-elles empruntés en tout ?", `${EMPRUNTS.reduce((t, x) => t + total(x), 0)} : ${EMPRUNTS.map((x) => total(x)).join(" + ")}.`],
];

function feuilleDoubleEntree(): string {
  const lignes = EMPRUNTS.map((x) => `<tr><th>${x.classe}</th><td>${x.romans}</td><td>${x.bd}</td><td>${x.documentaires}</td><td>${x.poesie}</td></tr>`).join("");
  return `<div class="page">${titre("Lire un tableau à double entrée")}${TETE}
    ${rappel("Dans un tableau à double entrée, chaque case est au croisement d'une ligne et d'une colonne : pour la lire, je suis la ligne et la colonne jusqu'à ce qu'elles se croisent.")}
    ${regle(`Je lis le titre du tableau, puis ses lignes et ses colonnes. Pour chaque question, je trouve la bonne case, puis je calcule s'il le faut. ${SOURCE}`)}
    <div class="dc-c-titre">Les livres empruntés à la bibliothèque de l'école en novembre</div>
    <table class="dc-mini dc-double"><tr><th></th><th>Romans</th><th>Bandes dessinées</th><th>Documentaires</th><th>Poésie</th></tr>${lignes}</table>
    <div class="dc-source">Relevé de la bibliothèque de l'école ; données imaginées pour l'exercice.</div>
    <div class="dc-questions">${QUESTIONS_EMPRUNTS.map(([q], i) => question(i + 1, q)).join("")}</div></div>`
    + corrige("Lire un tableau à double entrée", QUESTIONS_EMPRUNTS.map(([q, rep], i) => `<b>${i + 1}.</b> ${escapeHtml(q)} — <b>${escapeHtml(rep)}</b>`));
}

export function htmlDocumentsCM(r: ReglagesDocumentsCM, graine: number): string {
  const corps = r.exercice === "nature-source" ? feuilleNatureSource(r, graine)
    : r.exercice === "sommaire" ? feuilleSommaire(r, graine)
      : r.exercice === "composite" ? feuilleComposite(r)
        : r.exercice === "deux-documents" ? feuilleDeuxDocuments()
          : feuilleDoubleEntree();
  return feuille(corps, "dc");
}

export const STYLE_DOCUMENTS_CM = `
  .feuille.dc .dc-grille { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
  .feuille.dc .dc-doc { border: 1px solid #c4c9d6; border-radius: 2mm; padding: 2.5mm 3mm; break-inside: avoid; page-break-inside: avoid; font-size: 12.5px; }
  .feuille.dc .dc-lettre { font-weight: 800; font-size: 12px; color: #4a5168; margin-bottom: 1.5mm; }
  .feuille.dc .dc-contenu { min-height: 22mm; }
  .feuille.dc .dc-photo { margin: 0; }
  .feuille.dc .dc-photo img { width: 100%; max-height: 42mm; object-fit: cover; border-radius: 1mm; }
  .feuille.dc .dc-photo figcaption { font-size: 11px; color: #4a5168; }
  .feuille.dc .dc-vers { font-size: 12.5px; line-height: 1.6; font-style: italic; }
  .feuille.dc .dc-texte { font-size: 13px; line-height: 1.6; }
  .feuille.dc .dc-source { font-size: 10.5px; color: #687087; font-style: italic; margin: 1.5mm 0; }
  .feuille.dc .dc-legende { font-size: 10.5px; color: #4a5168; }
  .feuille.dc .dc-ligne { display: flex; align-items: flex-end; gap: 1.5mm; font-size: 11.5px; color: #4a5168; margin-top: 1mm; }
  .feuille.dc .dc-trait { flex: 1; border-bottom: 1px dotted #9aa0b4; height: 6mm; min-width: 20mm; display: inline-block; }
  .feuille.dc .dc-mini { border-collapse: collapse; font-size: 12px; width: 100%; }
  .feuille.dc .dc-mini th, .feuille.dc .dc-mini td { border: 1px solid #9aa0b4; padding: 1.2mm 2mm; text-align: left; }
  .feuille.dc .dc-mini th { background: #f7f8fc; font-size: 11.5px; }
  .feuille.dc .dc-double td { text-align: center; font-size: 13px; }
  .feuille.dc .dc-classer td { height: 30mm; vertical-align: top; width: 33%; }
  .feuille.dc .dc-livre { border: 1.5px solid #1c2233; border-radius: 2mm; padding: 3mm 4mm; margin: 0 0 5mm; }
  .feuille.dc .dc-livre-titre { font-weight: 800; font-size: 14px; margin-bottom: 2mm; text-align: center; }
  .feuille.dc .dc-sommaire { width: 100%; border-collapse: collapse; font-size: 13.5px; }
  .feuille.dc .dc-sommaire td { padding: 1mm 0; }
  .feuille.dc .dc-points { border-bottom: 1px dotted #687087; width: 30%; }
  .feuille.dc .dc-page { width: 10mm; text-align: right; font-weight: 700; }
  .feuille.dc .dc-questions { display: block; margin-top: 4mm; }
  .feuille.dc .dc-q { margin: 0 0 3.5mm; break-inside: avoid; page-break-inside: avoid; }
  .feuille.dc .dc-enonce { font-size: 13.5px; font-weight: 600; line-height: 1.5; }
  .feuille.dc .dc-composite { border: 1.5px solid #1c2233; border-radius: 2mm; padding: 4mm; }
  .feuille.dc .dc-c-titre { font-size: 17px; font-weight: 800; margin: 0 0 2mm; }
  .feuille.dc .dc-chapeau { font-size: 13.5px; font-weight: 600; font-style: italic; margin: 0 0 3mm; }
  .feuille.dc .dc-legende-schema { font-size: 11px; color: #4a5168; text-align: center; margin: 1mm 0 3mm; }
  .feuille.dc .dc-deux { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; align-items: start; }
  .feuille.dc .dc-encadre { border: 1.5px dashed #b45309; background: #fffbeb; border-radius: 2mm; padding: 2.5mm 3mm; font-size: 12.5px; line-height: 1.5; }
  .feuille.dc .dc-marque { display: inline-block; min-width: 5mm; text-align: center; font-weight: 800; font-size: 11px; color: #fff; background: #d33a32; border-radius: 1mm; margin-right: 1mm; font-style: normal; }
  .feuille.dc .dc-lettres { width: 100%; border-collapse: collapse; }
  .feuille.dc .dc-lettres td { font-size: 12px; padding: 1mm; }
  .feuille.dc .dc-lettres .dc-trait { display: block; }
  .feuille.dc .dc-corrige { font-size: 13px; line-height: 1.6; }
  .feuille.dc .dc-c { margin: 0 0 2.5mm; }
  .feuille.dc .dc-gris { color: #687087; font-size: 12px; }
`;
