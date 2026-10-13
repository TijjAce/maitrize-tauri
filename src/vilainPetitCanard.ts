// ── Le Vilain Petit Canard : une séquence de vocabulaire, MS et GS ─────────
//
// Le guide « Pour enseigner le vocabulaire à l'école maternelle » (Éduscol)
// en donne un exemple (Focus MS-GS, p. 71-76) : à partir de l'album
// d'Attilio Cassinelli (Gallimard, 2018), travailler des réseaux de sens —
// en MS, les mots des émotions et les verbes de la naissance des poussins ;
// en GS, les expressions synonymes de « marcher à la queue leu leu ». Quatre
// phases : l'univers de référence (les animaux, leurs familles, les
// saisons), la découverte de l'album, la structuration (émotions, naissance,
// synonymots, lieux, outils pour raconter), la mémorisation et le
// réinvestissement.
//
// L'album est celui de l'enseignant : ni son texte ni ses images ne sont
// repris ici, ils sont protégés. Les fiches documentaires, les devinettes et
// le plan de l'histoire sont écrits pour Maitrize ; les « synonymots »
// reprennent le principe de Micheline Cellier (Retz, 2015), pas ses cartes.
// Les feuilles viennent des ateliers quand ils savent les faire —
// Catégoriser les mots, Images séquentielles —, les autres d'ici. Deux
// exercices de l'enseignant s'y ajoutent, en prolongement : les familles de
// canards à colorier (décomposer une quantité) et les canards à décorer
// (graphisme).

import { escapeHtml } from "./print";
import { attributionPour, feuille, imgPicto } from "./cartesImprimables";
import { STYLE_CATEGORISER, htmlCategoriser, type Categorie, type ReglagesCategoriser } from "./categoriser";
import type { Images } from "./supportsVisuels";
import { REGLAGES_SUITES, STYLE_SUITES, htmlSuites, type ReglagesSuites } from "./suitesImages";
import { POLICE_CURSIVE } from "./ecritureCursive";
import { DECORATIONS, GRIS, JAUNE, STYLE_CANARDS_DESSINES, nomDeLaDecoration, svgCane, svgCaneton, svgCanetonADecorer } from "./canardsDessines";
import { melanger } from "./hasard";

export type NiveauVpc = "MS" | "GS";
export const NIVEAUX_VPC: { id: NiveauVpc; age: string }[] = [
  { id: "MS", age: "moyenne section" },
  { id: "GS", age: "grande section" },
];

/** Les pictos de la séquence, choisis un à un dans la banque ARASAAC : la cane blanche, le caneton jaune, le poussin qui brise sa coquille… */
export const P = {
  canard: 28479, cane: 28477, caneton: 2563, cygne: 2337, coq: 2404, poule: 2403, poussin: 2533, oie: 2878, jars: 27780,
  oeuf: 2427, embryon: 31202, briser: 31158, sortir: 28409, nid: 7173,
  maison: 2317, fleuve: 2811, taniere: 7149, lac: 6022, neige: 3135, soleil: 2798, fleur: 3102, feuille: 5076,
  glace: 2420, parapluie: 2500, bonhommeNeige: 3131,
  ete: 5604, automne: 5531, hiver: 5493, printemps: 5553,
  triste: 2606, fatigue: 2314, content: 3245, joyeux: 3250, effraye: 2261, laid: 4648, seul: 39247,
  marcher: 3251, moquer: 37770, jouer: 2439, dormir: 2369, froid: 35583, envoler: 6246,
  chat: 2406, chien: 2517, lion: 2449, girafe: 2437, elephant: 2372, singe: 2477, zebre: 2324, crocodile: 2343,
} as const;

/** Tous les pictos que la séquence imprime : à charger avant de fabriquer. */
export const IDS_VPC: number[] = [...new Set(Object.values(P))];

const m = (mot: string, id: number | null) => ({ mot, id });
const famille = (nom: string, image: number, mots: { mot: string; id: number | null }[], intrus = false): Categorie =>
  ({ nom, image, appel: "", intrus, mots });

// ── Les familles d'animaux ────────────────────────────────────────────────
//
// En MS : le canard, le cygne, la poule ; en GS, l'oie en plus. Le cygne
// femelle, le cygneau et l'oison n'ont pas de dessin à eux dans la banque :
// ils prennent celui de la famille, et vos photos les remplacent.

export function famillesDAnimaux(n: NiveauVpc): Categorie[] {
  const f = [
    famille("La famille canard", P.canard, [m("le canard", P.canard), m("la cane", P.cane), m("le caneton", P.caneton)]),
    famille("La famille cygne", P.cygne, [m("le cygne", P.cygne), m("le cygne femelle", P.cygne), m("le cygneau", P.cygne)]),
    famille("La famille poule", P.poule, [m("le coq", P.coq), m("la poule", P.poule), m("le poussin", P.poussin)]),
  ];
  if (n === "GS") f.push(famille("La famille oie", P.oie, [m("le jars", P.jars), m("l'oie", P.oie), m("l'oison", P.oie)]));
  return f;
}

/** Les animaux de l'univers de l'histoire, et ceux qui n'en sont pas : les intrus (guide, phase 3). */
export function universEtIntrus(n: NiveauVpc): Categorie[] {
  return [
    famille("Les animaux de la ferme et de l'eau", P.cane, [m("la cane", P.cane), m("le canard", P.canard), m("le caneton", P.caneton), m("le cygne", P.cygne),
      m("la poule", P.poule), m("le coq", P.coq), m("le poussin", P.poussin), m("le chat", P.chat), m("le chien", P.chien), ...(n === "GS" ? [m("l'oie", P.oie)] : [])]),
    famille("Les intrus", P.lion, [m("le lion", P.lion), m("la girafe", P.girafe), m("l'éléphant", P.elephant), m("le singe", P.singe),
      m("le zèbre", P.zebre), m("le crocodile", P.crocodile)], true),
  ];
}

export const SAISONS: Categorie[] = [
  famille("L'été", P.ete, [m("le soleil", P.soleil), m("la glace", P.glace)]),
  famille("L'automne", P.automne, [m("la feuille morte", P.feuille), m("le parapluie", P.parapluie)]),
  famille("L'hiver", P.hiver, [m("la neige", P.neige), m("le bonhomme de neige", P.bonhommeNeige)]),
  famille("Le printemps", P.printemps, [m("la fleur", P.fleur), m("le nid", P.nid)]),
];

/** Les lieux du voyage du petit canard, dans l'ordre de l'album. */
export const LIEUX: { mot: string; id: number }[] = [
  { mot: "la vieille maison", id: P.maison }, { mot: "le fleuve", id: P.fleuve }, { mot: "la tanière", id: P.taniere }, { mot: "le lac", id: P.lac },
];
/** Le tapis de conte commence au nid, où les œufs éclosent. */
export const LIEUX_DU_TAPIS = [{ mot: "le nid", id: P.nid }, ...LIEUX];

/** Les verbes de l'histoire, pour dire l'action d'une image. */
export const ACTIONS: { mot: string; id: number }[] = [
  { mot: "éclore", id: P.briser }, { mot: "sortir de l'œuf", id: P.sortir }, { mot: "marcher", id: P.marcher }, { mot: "se moquer", id: P.moquer },
  { mot: "jouer", id: P.jouer }, { mot: "dormir", id: P.dormir }, { mot: "avoir froid", id: P.froid }, { mot: "s'envoler", id: P.envoler },
];

/** Les personnages de l'album : le vilain petit canard est gris, ses frères sont jaunes. */
export const PERSONNAGES: { mot: string; id: number; gris?: boolean }[] = [
  { mot: "le vilain petit canard", id: P.caneton, gris: true }, { mot: "la maman cane", id: P.cane }, { mot: "un frère", id: P.caneton },
  { mot: "le chat", id: P.chat }, { mot: "le chien de chasse", id: P.chien }, { mot: "le cygne", id: P.cygne },
];

/** Le jeu des familles de l'histoire : les personnages, les lieux, les émotions, les actions. */
export const FAMILLES_DE_L_HISTOIRE: Categorie[] = [
  famille("Les personnages", P.caneton, [m("la cane", P.cane), m("le caneton", P.caneton), m("le cygne", P.cygne), m("le chat", P.chat), m("le chien", P.chien)]),
  famille("Les lieux", P.fleuve, LIEUX.map((l) => m(l.mot, l.id))),
  famille("Les émotions", P.triste, [m("triste", P.triste), m("fatigué", P.fatigue), m("content", P.content), m("effrayé", P.effraye)]),
  famille("Les actions", P.marcher, [m("marcher", P.marcher), m("se moquer", P.moquer), m("dormir", P.dormir), m("s'envoler", P.envoler)]),
];

// ── Les émotions (MS) ─────────────────────────────────────────────────────
//
// Les mots du guide, du plus faible au plus fort, et ce qui les cause dans
// l'histoire.

export interface Emotion { nom: string; picto: number; echelle: string[]; noms: string[]; causes: { texte: string; picto: number }[] }

export const EMOTIONS: Emotion[] = [
  { nom: "La tristesse", picto: P.triste, echelle: ["peiné", "triste", "chagriné", "malheureux"], noms: ["la peine", "la tristesse", "le chagrin", "le malheur"],
    causes: [{ texte: "On se moque de lui.", picto: P.moquer }, { texte: "On le trouve laid.", picto: P.laid }, { texte: "Ses frères ne jouent pas avec lui.", picto: P.seul }] },
  { nom: "La fatigue", picto: P.fatigue, echelle: ["fatigué", "affaibli", "épuisé", "abattu"], noms: ["la fatigue", "la faiblesse", "l'épuisement", "l'abattement"],
    causes: [{ texte: "Un chat le jette dehors.", picto: P.chat }, { texte: "Des chiens de chasse l'effraient.", picto: P.chien }, { texte: "Il a froid.", picto: P.froid }] },
  { nom: "La joie", picto: P.content, echelle: ["content", "joyeux", "heureux", "ravi"], noms: ["le contentement", "la joie", "le bonheur", "le ravissement"],
    causes: [{ texte: "Il s'envole.", picto: P.envoler }, { texte: "Les cygnes l'accueillent.", picto: P.cygne }, { texte: "Il découvre qu'il est un cygne.", picto: P.lac }] },
];

// ── Les textes écrits pour la séquence ────────────────────────────────────

/** Les fiches documentaires : de courtes phrases, à lire aux élèves ; en GS, on y cherche les informations du tableau. */
export const DOCUMENTAIRES: { famille: string; animaux: { mot: string; id: number }[]; phrases: string[]; niveaux: NiveauVpc[] }[] = [
  { famille: "La famille canard", animaux: [{ mot: "le canard", id: P.canard }, { mot: "la cane", id: P.cane }, { mot: "le caneton", id: P.caneton }], niveaux: ["MS", "GS"],
    phrases: [
      "Le canard est le papa, la cane est la maman, le caneton est le petit.",
      "Ils vivent près de l'eau : la mare, l'étang, la rivière.",
      "Leurs pattes sont palmées : elles les aident à nager.",
      "Ils mangent des herbes, des graines et de petites bêtes.",
      "La cane pond ses œufs dans un nid, au bord de l'eau. Elle les couve : elle reste assise dessus pour les garder au chaud.",
      "Le caneton casse la coquille avec son bec. Très vite, il sait nager, et il suit sa maman.",
    ] },
  { famille: "La famille cygne", animaux: [{ mot: "le cygne", id: P.cygne }, { mot: "le cygne femelle", id: P.cygne }, { mot: "le cygneau", id: P.cygne }], niveaux: ["MS", "GS"],
    phrases: [
      "Le cygne est un grand oiseau blanc, au très long cou.",
      "Il vit sur les lacs et sur les rivières.",
      "Il plonge la tête et le cou dans l'eau pour manger des plantes.",
      "La femelle pond de gros œufs dans un nid de roseaux et de branches.",
      "Quand ils naissent, les cygneaux sont gris. En grandissant, leurs plumes deviennent blanches.",
    ] },
  { famille: "La famille poule", animaux: [{ mot: "le coq", id: P.coq }, { mot: "la poule", id: P.poule }, { mot: "le poussin", id: P.poussin }], niveaux: ["MS", "GS"],
    phrases: [
      "Le coq, la poule et le poussin vivent à la ferme, dans le poulailler.",
      "Le matin, le coq chante : « Cocorico ! »",
      "La poule pond des œufs. Elle les couve pour les garder au chaud.",
      "Le poussin casse la coquille avec son bec et sort de l'œuf. Il est couvert d'un duvet jaune.",
      "Les poules picorent des graines et des vers avec leur bec.",
    ] },
  { famille: "La famille oie", animaux: [{ mot: "le jars", id: P.jars }, { mot: "l'oie", id: P.oie }, { mot: "l'oison", id: P.oie }], niveaux: ["GS"],
    phrases: [
      "Le jars est le papa, l'oie est la maman, l'oison est le petit.",
      "Les oies vivent à la ferme ou près des étangs. Elles ont de grandes pattes palmées.",
      "Elles mangent surtout de l'herbe.",
      "L'oie pond ses œufs et les couve. Les oisons naissent couverts d'un duvet jaune ou gris.",
      "Quand on s'approche, le jars siffle pour protéger sa famille.",
    ] },
];

/** Les devinettes, et leur réponse parmi trois images. */
export const DEVINETTES: { texte: string; reponse: { mot: string; id: number }; autres: number[]; niveaux: NiveauVpc[] }[] = [
  { texte: "Je suis la maman des canetons. Ils marchent derrière moi, à la queue leu leu. Qui suis-je ?", reponse: { mot: "la cane", id: P.cane }, autres: [P.poule, P.cygne], niveaux: ["MS", "GS"] },
  { texte: "Je suis un grand oiseau blanc au long cou. Je nage sur le lac. Qui suis-je ?", reponse: { mot: "le cygne", id: P.cygne }, autres: [P.oie, P.canard], niveaux: ["MS", "GS"] },
  { texte: "Le matin, à la ferme, je chante « Cocorico ! ». Qui suis-je ?", reponse: { mot: "le coq", id: P.coq }, autres: [P.poule, P.poussin], niveaux: ["MS", "GS"] },
  { texte: "Je suis tout jaune et je sors de l'œuf de la poule. Qui suis-je ?", reponse: { mot: "le poussin", id: P.poussin }, autres: [P.caneton, P.coq], niveaux: ["MS", "GS"] },
  { texte: "Je suis le petit de la cane. Qui suis-je ?", reponse: { mot: "le caneton", id: P.caneton }, autres: [P.poussin, P.cygne], niveaux: ["MS", "GS"] },
  { texte: "Dans la vieille maison, j'ai jeté le petit canard dehors. Qui suis-je ?", reponse: { mot: "le chat", id: P.chat }, autres: [P.chien, P.poule], niveaux: ["MS", "GS"] },
  { texte: "Je tombe du ciel en hiver. Je suis blanche et froide. Qui suis-je ?", reponse: { mot: "la neige", id: P.neige }, autres: [P.soleil, P.fleur], niveaux: ["MS", "GS"] },
  { texte: "Je suis un trou sous la terre, où un animal se cache et dort. Qui suis-je ?", reponse: { mot: "la tanière", id: P.taniere }, autres: [P.maison, P.lac], niveaux: ["MS", "GS"] },
  { texte: "Quand on se moque de lui, comment se sent le petit canard ?", reponse: { mot: "triste", id: P.triste }, autres: [P.content, P.fatigue], niveaux: ["MS", "GS"] },
  { texte: "Je suis la saison où il fait froid et où il neige. Qui suis-je ?", reponse: { mot: "l'hiver", id: P.hiver }, autres: [P.ete, P.printemps], niveaux: ["MS", "GS"] },
  { texte: "La coquille se brise, le petit sort : que fait l'œuf ? Il…", reponse: { mot: "éclore (il éclot)", id: P.briser }, autres: [P.marcher, P.dormir], niveaux: ["GS"] },
  { texte: "Je suis une grande étendue d'eau où les cygnes accueillent le petit canard. Qui suis-je ?", reponse: { mot: "le lac", id: P.lac }, autres: [P.maison, P.taniere], niveaux: ["GS"] },
];

/** Le plan de l'histoire en cinq moments, dits avec nos mots. */
export const PLAN_DU_RECIT: { moment: string; texte: string; pictos: number[] }[] = [
  { moment: "Au début", texte: "C'est l'été. Le plus gros œuf éclot le dernier : un drôle de petit canard en sort.", pictos: [P.briser, P.caneton] },
  { moment: "Le problème", texte: "On se moque de lui, ses frères ne jouent pas avec lui. Il est triste : il part.", pictos: [P.moquer, P.triste] },
  { moment: "Le voyage", texte: "Un chat le jette dehors, des chiens de chasse l'effraient. Il a froid, il est fatigué.", pictos: [P.chat, P.chien, P.froid] },
  { moment: "L'hiver", texte: "Il s'endort dans une tanière, sous la neige.", pictos: [P.taniere, P.neige] },
  { moment: "La fin", texte: "Au printemps, ses ailes ont grandi : il s'envole. Sur le lac, les cygnes l'accueillent.", pictos: [P.envoler, P.cygne] },
];

/** Les synonymots (GS) : une image, une phrase à compléter, des étiquettes qui disent la même chose. L'image de la file : la cane, puis ses canetons. */
export const SYNONYMOTS: { id: string; images: number[]; avant: string; apres: string; etiquettes: string[]; note: string }[] = [
  { id: "queue", images: [P.cane, P.caneton, P.caneton, P.caneton], avant: "La cane et ses petits marchent", apres: ".",
    etiquettes: ["à la queue leu leu", "les uns derrière les autres", "en file indienne", "en faisant le petit train"],
    note: "« Leu », c'est l'ancien nom du loup : les loups se suivent l'un derrière l'autre, la queue de celui de devant sous le nez, comme les canetons derrière leur maman. Les élèves peuvent se mettre en file à leur tour." },
  { id: "coquille", images: [P.briser], avant: "La coquille", apres: ".",
    etiquettes: ["se brise", "se fendille", "se fissure", "se craquèle"],
    note: "Les quatre étiquettes disent la même chose : chacune peut prendre la place de l'autre, la phrase garde son sens." },
];

/** Les mots du titre (GS) : ce que le titre devient, et les étiquettes du tri. */
export const TITRE = ["LE", "VILAIN", "PETIT", "CANARD"];
export const ETIQUETTES_CANARD: { mot: string; ecriture: "capitales" | "script" | "cursive"; canard: boolean }[] = [
  { mot: "CANARD", ecriture: "capitales", canard: true }, { mot: "canard", ecriture: "script", canard: true }, { mot: "canard", ecriture: "cursive", canard: true },
  { mot: "CANARI", ecriture: "capitales", canard: false }, { mot: "canapé", ecriture: "script", canard: false }, { mot: "RENARD", ecriture: "capitales", canard: false },
  { mot: "canal", ecriture: "cursive", canard: false }, { mot: "CANARD", ecriture: "capitales", canard: true }, { mot: "canard", ecriture: "script", canard: true },
];

// ── Les feuilles d'ici ────────────────────────────────────────────────────

const titre = (t: string, sous = "") => `<div class="titre">${escapeHtml(t)}</div>${sous ? `<div class="sous">${escapeHtml(sous)}</div>` : ""}`;
const regle = (t: string) => `<div class="regle">${t}</div>`;
const rappel = (t: string) => `<div class="rappel">${t}</div>`;
const TETE = '<div class="sous">Prénom : ........................................ Date : ........................</div>';
const img = (images: Images, id: number, mot: string, classe = "") => `<span class="vp-img ${classe}">${imgPicto(images[id], mot)}</span>`;

/** Les fiches documentaires, deux par page, et en GS le tableau où l'on range ce qu'on y a appris. */
function htmlDocumentaires(n: NiveauVpc, images: Images): string {
  const fiches = DOCUMENTAIRES.filter((d) => d.niveaux.includes(n)).map((d) => `<div class="vp-fiche"><div class="vp-fiche-tete">${escapeHtml(d.famille)}</div>`
    + `<div class="vp-fiche-animaux">${d.animaux.map((a) => `<figure>${img(images, a.id, a.mot)}<figcaption>${escapeHtml(a.mot)}</figcaption></figure>`).join("")}</div>`
    + `<ul class="vp-fiche-texte">${d.phrases.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul></div>`);
  const pages: string[] = [];
  for (let i = 0; i < fiches.length; i += 2) {
    pages.push(`<div class="page">${i === 0 ? titre("Les familles d'animaux : ce que disent les documentaires", "À lire aux élèves, en montrant les images.") : ""}${fiches.slice(i, i + 2).join("")}</div>`);
  }
  if (n === "GS") {
    const colonnes = ["Où vit-elle ?", "Que mange-t-elle ?", "Comment s'appelle le petit ?", "Comment naissent les petits ?", "Dans quelle histoire ?"];
    const lignes = DOCUMENTAIRES.map((d) => `<tr><th>${img(images, d.animaux[0].id, d.famille)}<span>${escapeHtml(d.famille)}</span></th>${colonnes.map(() => "<td></td>").join("")}</tr>`).join("");
    pages.push(`<div class="page">${titre("Ce que nous avons appris")}${regle("J'écoute la fiche de chaque famille. Je dis ce que j'ai appris. Je le range dans le tableau, avec des mots ou des dessins.")}`
      + `<table class="vp-tableau"><tr><th></th>${colonnes.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr>${lignes}</table></div>`);
  }
  return pages.join("");
}

/** Les marottes : chaque personnage dans son rond, à coller sur un bâton. Le vilain petit canard est gris, ses frères sont jaunes. */
function htmlMarottes(images: Images): string {
  const cartes = PERSONNAGES.map((p) => `<div class="vp-marotte"><div class="vp-rond">${img(images, p.id, p.mot, p.gris ? "vp-gris" : "")}</div>`
    + `<div class="vp-nom">${escapeHtml(p.mot)}</div><div class="vp-baton">coller le bâton ici</div></div>`);
  const pages: string[] = [];
  for (let i = 0; i < cartes.length; i += 4) {
    pages.push(`<div class="page">${i === 0 ? titre("Les marottes des personnages", "À découper en suivant le rond, et à coller sur un bâton.") : ""}<div class="vp-marottes">${cartes.slice(i, i + 4).join("")}</div></div>`);
  }
  return pages.join("");
}

/** Les affiches des émotions (MS) : l'échelle des mots, du plus faible au plus fort, et ce qui les cause. */
function htmlEmotions(images: Images): string {
  return EMOTIONS.map((e) => `<div class="page vp-affiche"><div class="vp-affiche-tete">${img(images, e.picto, e.nom)}<span>${escapeHtml(e.nom)}</span></div>`
    + `<div class="vp-echelle">${e.echelle.map((mot, i) => `<div class="vp-marche" style="--i:${i}"><b>${escapeHtml(mot)}</b><span>${escapeHtml(e.noms[i])}</span></div>`).join("")}</div>`
    + `<div class="vp-plus-fort">du plus faible ➜ au plus fort</div>`
    + `<div class="vp-pourquoi"><b>Pourquoi ?</b>${e.causes.map((c) => `<figure>${img(images, c.picto, c.texte)}<figcaption>${escapeHtml(c.texte)}</figcaption></figure>`).join("")}</div></div>`).join("");
}

/** Les synonymots (GS) : la phrase, sa case, et les étiquettes à découper qui y vont toutes. */
function htmlSynonymots(id: string, images: Images): string {
  const s = SYNONYMOTS.find((x) => x.id === id)!;
  return `<div class="page">${titre("Les synonymots")}${TETE}${regle("Je regarde l'image. Je pose chaque étiquette dans la case, l'une après l'autre. Je dis la phrase à chaque fois. Je colle l'étiquette que je préfère.")}`
    + `<div class="vp-syno-image">${s.images.map((id, i) => img(images, id, i === 0 ? `${s.avant} ${s.etiquettes[0]}` : "", i === 0 ? "vp-grand" : "")).join("")}</div>`
    + `<div class="vp-syno-phrase">${escapeHtml(s.avant)} <span class="vp-case vp-case-syno"></span>${escapeHtml(s.apres)}</div>`
    + `<div class="vp-etiquettes vp-etiquettes-syno">${s.etiquettes.map((e) => `<span>${escapeHtml(e)}</span>`).join("")}</div>`
    + `<div class="vp-note"><b>Pour l'enseignant</b> ${escapeHtml(s.note)}</div></div>`;
}

/** Les silhouettes : chaque animal à gauche, les ombres mélangées à droite ; on les relie. Cinq formes bien distinctes : la cane et le caneton auraient la même ombre. */
function htmlSilhouettes(images: Images, alea: () => number): string {
  const animaux = [P.caneton, P.cygne, P.poule, P.chat, P.chien].map((id) => ({ id }));
  const ombres = melanger(alea, animaux);
  const lignes = animaux.map((a, i) => `<div class="vp-relier-ligne"><span class="vp-relier-case">${img(images, a.id, "")}</span><span class="vp-point"></span>`
    + `<span class="vp-espace"></span><span class="vp-point"></span><span class="vp-relier-case">${img(images, ombres[i].id, "", "vp-ombre")}</span></div>`).join("");
  return `<div class="page">${titre("Qui est-ce ?")}${TETE}${regle("Je regarde chaque animal. Je cherche son ombre. Je les relie d'un trait.")}<div class="vp-relier">${lignes}</div></div>`;
}

/** Les devinettes : la devinette à lire, trois images ; l'élève montre ou entoure la bonne. */
function htmlDevinettes(n: NiveauVpc, images: Images, alea: () => number): string {
  const liste = DEVINETTES.filter((d) => d.niveaux.includes(n));
  const cartes = liste.map((d, i) => {
    const choix = melanger(alea, [d.reponse.id, ...d.autres]);
    return `<div class="vp-devinette"><div class="vp-devinette-texte"><b>${i + 1}.</b> ${escapeHtml(d.texte)}</div>`
      + `<div class="vp-choix">${choix.map((id) => img(images, id, "")).join("")}</div></div>`;
  });
  const pages: string[] = [];
  for (let i = 0; i < cartes.length; i += 6) {
    pages.push(`<div class="page">${i === 0 ? `${titre("Les devinettes de l'histoire")}${TETE}${regle(n === "MS" ? "J'écoute la devinette. Je montre la bonne image." : "J'écoute la devinette. J'entoure la bonne image.")}` : ""}<div class="vp-devinettes">${cartes.slice(i, i + 6).join("")}</div></div>`);
  }
  const corrige = `<div class="page corrige">${titre("Les devinettes — les réponses")}<ol class="vp-corrige">${liste.map((d) => `<li>${escapeHtml(d.reponse.mot)}</li>`).join("")}</ol></div>`;
  return pages.join("") + corrige;
}

/** Le plan de l'histoire : l'affiche des cinq moments, puis les cadres vides et les images à y coller. */
function htmlPlan(images: Images, alea: () => number): string {
  const bande = (p: (typeof PLAN_DU_RECIT)[number], i: number) => `<div class="vp-bande"><div class="vp-bande-titre">${i + 1}. ${escapeHtml(p.moment)}</div>`
    + `<div class="vp-bande-images">${p.pictos.map((id) => img(images, id, "")).join("")}</div><div class="vp-bande-texte">${escapeHtml(p.texte)}</div></div>`;
  const cadre = (p: (typeof PLAN_DU_RECIT)[number], i: number) =>
    `<div class="vp-moment"><div class="vp-moment-titre">${i + 1}. ${escapeHtml(p.moment)}</div><div class="vp-moment-vide"></div></div>`;
  const affiche = `<div class="page">${titre("Le plan de l'histoire", "L'affiche de la classe : les cinq moments, dans l'ordre.")}<div class="vp-bandes">${PLAN_DU_RECIT.map(bande).join("")}</div></div>`;
  const aColler = melanger(alea, PLAN_DU_RECIT.map((p) => p.pictos[0]));
  const eleve = `<div class="page">${titre("Je remets l'histoire dans l'ordre")}${TETE}${regle("Je découpe les images. Je colle chaque image dans le bon moment de l'histoire. Je raconte l'histoire avec le plan.")}`
    + `<div class="vp-plan">${PLAN_DU_RECIT.map(cadre).join("")}</div><div class="vp-a-decouper">${aColler.map((id) => `<span class="vp-piece">${img(images, id, "")}</span>`).join("")}</div></div>`;
  return affiche + eleve;
}

/** Le tapis de conte : les lieux en grand, deux par page, et les personnages à plier pour qu'ils tiennent debout. */
function htmlTapis(images: Images): string {
  const lieux = LIEUX_DU_TAPIS.map((l) => `<div class="vp-lieu">${img(images, l.id, l.mot)}<div class="vp-nom">${escapeHtml(l.mot)}</div></div>`);
  const pages: string[] = [];
  for (let i = 0; i < lieux.length; i += 2) {
    pages.push(`<div class="page">${i === 0 ? titre("Le tapis de conte : les lieux", "À poser sur une grande table, dans l'ordre du voyage du petit canard.") : ""}${lieux.slice(i, i + 2).join("")}</div>`);
  }
  const debout = PERSONNAGES.map((p) => `<div class="vp-debout"><div class="vp-debout-haut">${img(images, p.id, p.mot, p.gris ? "vp-gris" : "")}</div><div class="vp-pli">plier ici</div><div class="vp-debout-bas"></div></div>`);
  pages.push(`<div class="page">${titre("Les personnages qui tiennent debout", "À découper, puis à plier sur le trait : la languette fait le pied.")}<div class="vp-deboutes">${debout.join("")}</div></div>`);
  return pages.join("");
}

/** Les mots du titre (GS) : le reformer, séparer ses mots, trier les étiquettes du mot « canard ». */
function htmlMotsDuTitre(alea: () => number): string {
  const melanges = melanger(alea, TITRE);
  const reformer = `<div class="page">${titre("Le titre de l'album")}${TETE}${regle("Je découpe les étiquettes. Je reforme le titre sous le modèle. Je compare, mot par mot.")}`
    + `<div class="vp-modele">${TITRE.map((t) => `<span>${t}</span>`).join("")}</div><div class="vp-cases-titre">${TITRE.map(() => '<span class="vp-case"></span>').join("")}</div>`
    + `<div class="vp-etiquettes vp-majuscules">${melanges.map((t) => `<span>${t}</span>`).join("")}</div>`
    + `<div class="titre" style="margin-top:10mm">Je sépare les mots du titre</div>${regle("Je trace un trait entre les mots du titre. Je recopie le titre, avec un espace entre les mots.")}`
    + `${[0, 1].map(() => `<div class="vp-colle">${TITRE.join("")}</div><div class="vp-ligne"></div>`).join("")}</div>`;
  const etiquettes = melanger(alea, ETIQUETTES_CANARD);
  const trier = `<div class="page">${titre("Le mot « canard » dans toutes ses écritures")}${TETE}${regle("Je découpe les étiquettes. Je pose dans la boîte « canard » toutes celles où est écrit le mot canard. Je mets les autres à côté.")}`
    + `<div class="vp-boites"><div class="vp-boite"><b>canard</b></div><div class="vp-boite"><b>pas canard</b></div></div>`
    + `<div class="vp-etiquettes">${etiquettes.map((e) => `<span class="vp-${e.ecriture}">${escapeHtml(e.mot)}</span>`).join("")}</div></div>`;
  return reformer + trier;
}

/** Comparer deux versions de l'histoire (GS) : le tableau, rempli en dictée à l'adulte. */
function htmlComparer(): string {
  const questions = ["Comment est le petit canard au début ?", "Que pense-t-il ? Que ressent-il ?", "Par quels lieux passe-t-il ?", "Comment finit l'histoire ?"];
  return `<div class="page">${titre("Deux versions de l'histoire")}${regle("J'écoute les deux histoires. Je dis ce qui est pareil et ce qui change. L'adulte écrit ce que je dis.")}`
    + `<table class="vp-tableau"><tr><th></th><th>Version 1 : ……………………</th><th>Version 2 : ……………………</th></tr>${questions.map((q) => `<tr><th>${escapeHtml(q)}</th><td></td><td></td></tr>`).join("")}</table></div>`;
}

/** Combien de petits a chaque cane : on décompose cette quantité. Le programme 2025 : jusqu'à six en MS, jusqu'à dix en GS. */
export const PETITS_PAR_FAMILLE: Record<NiveauVpc, number> = { MS: 4, GS: 5 };

const accord = (n: number, mot: string) => `${n} ${mot}${n > 1 && !mot.endsWith("s") ? "s" : ""}`;
/** « 3 jaunes et 2 gris », « 0 jaune et 4 gris ». */
export const decomposition = (jaunes: number, gris: number) => `${accord(jaunes, "jaune")} et ${accord(gris, "gris")}`;

/**
 * Les familles de canards (mathématiques) : chaque cane a ses petits — des
 * canetons jaunes, des vilains petits canards gris —, à colorier de sorte
 * qu'aucune famille ne ressemble à une autre. Avec quatre petits, il y a
 * cinq familles différentes ; avec cinq, six : toutes les décompositions.
 */
function htmlFamillesDeCanards(n: NiveauVpc): string {
  const petits = PETITS_PAR_FAMILLE[n];
  const familles = petits + 1;
  const sortes = [{ fond: JAUNE, couleur: "jaune", qui: "un caneton" }, { fond: GRIS, couleur: "gris", qui: "un vilain petit canard" }];
  const legende = `<div class="vp-legende">${sortes.map((x) => `<span class="vp-sorte">${svgCaneton(x.fond)}<span><b>${x.couleur}</b> : ${x.qui}</span></span>`).join("")}</div>`;
  const combien = n === "GS" ? '<span class="vp-combien"><span class="vp-nb"></span> jaunes<br>et <span class="vp-nb"></span> gris</span>' : "";
  // Des canards aussi grands que la page le permet : quatre petits par famille en MS, cinq et la case du nombre en GS.
  const famille = (fonds: string[], apres: string) =>
    `<div class="vp-famille" style="--petits:${petits};--case:${n === "MS" ? 27 : 21}mm">${svgCane()}${fonds.map((f) => svgCaneton(f)).join("")}${apres}</div>`;
  const vierges = Array.from({ length: familles }, () => famille(Array(petits).fill("#fff"), combien)).join("");
  const consigne = `Je colorie chaque petit en jaune ou en gris. Je fais chaque famille différente des autres. ${n === "GS" ? "J'écris" : "Je dis"} combien il y a de jaunes et de gris dans chaque famille.`;
  const eleve = `<div class="page">${titre("Les familles de canards")}${TETE}${regle(consigne)}`
    + `${rappel(`Chaque cane a ${petits} petits. Avec ${petits} petits, il y a ${familles} familles différentes : de ${decomposition(petits, 0)} à ${decomposition(0, petits)}.`)}`
    + `${legende}<div class="vp-familles">${vierges}</div></div>`;
  const solutions = Array.from({ length: familles }, (_, gris) => {
    const jaunes = petits - gris;
    return famille([...Array(jaunes).fill(JAUNE), ...Array(gris).fill(GRIS)], `<span class="vp-combien">${decomposition(jaunes, gris)}<br>${petits} = ${jaunes} + ${gris}</span>`);
  }).join("");
  const corrige = `<div class="page corrige">${titre("Les familles de canards — pour le maître")}`
    + `<div class="sous">Les ${familles} familles différentes, dans un ordre parmi d'autres : l'ordre des familles ne compte pas, ni la place des canards gris dans la famille. Faire d'abord les familles avec des jetons jaunes et gris, puis colorier.</div>`
    + `<div class="vp-familles">${solutions}</div></div>`;
  return eleve + corrige;
}

/**
 * Décorer les canards (graphisme) : sur chaque canard, le début d'une
 * décoration ; l'élève la continue jusqu'au bout de chaque bande. En MS, un
 * motif par canard (reproduire des motifs) ; en GS, trois bandes de motifs
 * qui se répondent, et le dernier canard à décorer librement.
 */
function htmlDecorer(n: NiveauVpc): string {
  const canards = DECORATIONS[n].map((motifs) => `<figure class="vp-canard-deco">${svgCanetonADecorer(motifs)}<figcaption>${escapeHtml(nomDeLaDecoration(motifs))}</figcaption></figure>`).join("");
  const consigne = n === "MS"
    ? "Je regarde le début de la décoration de chaque canard. Je continue le motif jusqu'au bout de chaque bande. Je dis le nom du motif."
    : "Je regarde le début de la décoration de chaque canard. Je continue chaque motif jusqu'au bout de sa bande. Je décore le dernier canard avec les motifs que je choisis.";
  return `<div class="page">${titre("Décorer les canards")}${TETE}${regle(consigne)}<div class="vp-canards-deco">${canards}</div></div>`;
}

/** Ce qu'on observe, d'après les objectifs du guide. */
export const OBSERVABLES: Record<NiveauVpc, string[]> = {
  MS: ["Nomme les animaux et leurs petits", "Range les animaux par famille", "Dit l'émotion du petit canard et sa cause", "Remet la naissance dans l'ordre", "Raconte avec les mots de l'histoire"],
  GS: ["Nomme les animaux et leurs petits", "Trouve une information dans un documentaire", "Emploie une expression synonyme (à la queue leu leu…)", "Explique un mot de l'histoire", "Raconte avec les mots de l'histoire"],
};

function htmlGrille(n: NiveauVpc): string {
  const colonnes = OBSERVABLES[n];
  const ligne = `<tr><td></td>${colonnes.map(() => "<td></td>").join("")}</tr>`;
  return `<div class="page">${titre(`Grille d'observation — Le Vilain Petit Canard (${n})`, "✓ réussi · ~ en cours · ✗ pas encore. En petit groupe, à distance de la séquence ; refaire l'observation un mois plus tard.")}`
    + `<table class="vp-tableau vp-grille"><tr><th>Prénom</th>${colonnes.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr>${Array.from({ length: 12 }, () => ligne).join("")}</table></div>`;
}

// ── La séquence : ses feuilles, séance par séance ─────────────────────────

export type IdFeuilleVpc = "documentaires" | "marottes" | "emotions" | "synonymots-queue" | "synonymots-coquille" | "silhouettes" | "devinettes"
  | "plan" | "tapis" | "titre" | "comparer" | "familles-canards" | "decorer" | "grille";

export interface FeuilleVpc {
  /** Son nom stable : l'atelier la retrouve par lui. */
  id: string;
  /** La séance qui la reçoit, dans l'ordre de la démarche (0 pour la première). */
  seance: number;
  titre: string;
  atelier: "categoriser" | "suites" | "vilainPetitCanard";
  /** La compétence qu'elle travaille, quand ce n'est pas celle de la séquence : décomposer une quantité, ou le graphisme. */
  competence?: "maths" | "graphisme";
  /** La feuille fabriquée, et ce qu'il faut garder pour la refaire dans son atelier. */
  fabriquer: (images: Images, alea: () => number) => { html: string; style: string; memoires: Record<string, unknown> };
}

const categoriser = (n: NiveauVpc, forme: ReglagesCategoriser["forme"], categories: Categorie[], p: Partial<ReglagesCategoriser> = {}) =>
  (images: Images, alea: () => number) => {
    const reglages: ReglagesCategoriser = {
      niveau: n, forme, categories, nommer: true, legendes: n === "GS", maisons: false, lignes: n === "MS" ? 5 : 6, parLigne: 4, ...p,
    };
    return { html: htmlCategoriser(reglages, images, alea), style: STYLE_CATEGORISER, memoires: { categoriser: reglages } };
  };

const ici = (n: NiveauVpc, id: IdFeuilleVpc) => (images: Images, alea: () => number) =>
  ({ html: htmlFeuilleVpc(n, id, images, alea), style: STYLE_VPC, memoires: { vilainPetitCanard: { niveau: n, feuille: id } } });

/** La frise de la naissance du poussin (MS) : être dans l'œuf, briser la coquille, en sortir, devenir grand. */
function frise(n: NiveauVpc) {
  return (images: Images, alea: () => number) => {
    const etapes = [
      { id: P.embryon, mot: "Le poussin est dans l'œuf." }, { id: P.briser, mot: "Il brise la coquille." },
      { id: P.sortir, mot: "Il sort de la coquille." }, { id: P.poule, mot: "Il devient grand." },
    ];
    const reglages: ReglagesSuites = { ...REGLAGES_SUITES, niveau: n, forme: "colonnes", titre: "La naissance du poussin", etapes, legendes: true };
    return { html: htmlSuites(reglages, images, alea), style: STYLE_SUITES, memoires: { suites: reglages } };
  };
}

const cartes = (nom: string, image: number, mots: { mot: string; id: number }[]) => [famille(nom, image, mots.map((x) => m(x.mot, x.id)))];
const EMOTIONS_CARTES = [
  { mot: "triste", id: P.triste }, { mot: "fatigué", id: P.fatigue }, { mot: "content", id: P.content }, { mot: "joyeux", id: P.joyeux }, { mot: "effrayé", id: P.effraye },
];

/**
 * Les feuilles de la séquence, à ce niveau, séance par séance (treize
 * séances, de 0 à 12). Les séances 5, 6 et 10 diffèrent : en MS, les
 * émotions, la naissance, la collection des émotions ; en GS, les
 * synonymots, puis comparer les versions et les mots écrits. La séance 11
 * est le prolongement de la classe, en ateliers : les familles de canards,
 * la décoration des canards.
 */
export function feuillesDeLaSequence(n: NiveauVpc): FeuilleVpc[] {
  const f = (id: string, seance: number, titre: string, atelier: FeuilleVpc["atelier"], fabriquer: FeuilleVpc["fabriquer"], competence?: FeuilleVpc["competence"]): FeuilleVpc =>
    ({ id, seance, titre, atelier, fabriquer, ...(competence ? { competence } : {}) });
  return [
    f("familles-cartes", 0, "Les familles d'animaux — les cartes", "categoriser", categoriser(n, "cartes", famillesDAnimaux(n), { legendes: true })),
    f("familles-maisons", 1, "Les maisons des familles", "categoriser", categoriser(n, "tri", famillesDAnimaux(n), { maisons: true })),
    f("documentaires", 2, "Les fiches documentaires", "vilainPetitCanard", ici(n, "documentaires")),
    f("saisons", 2, "Les saisons", "categoriser", categoriser(n, "tri", SAISONS)),
    f("marottes", 4, "Les marottes", "vilainPetitCanard", ici(n, "marottes")),
    ...(n === "MS"
      ? [
        f("emotions", 5, "Les affiches des émotions", "vilainPetitCanard", ici(n, "emotions")),
        f("emotions-cartes", 5, "Les cartes des émotions", "categoriser", categoriser(n, "cartes", cartes("Les émotions", P.triste, EMOTIONS_CARTES), { legendes: true })),
        f("naissance", 6, "La naissance du poussin", "suites", frise(n)),
      ]
      : [
        f("synonymots-queue", 5, "Synonymots : à la queue leu leu", "vilainPetitCanard", ici(n, "synonymots-queue")),
        f("synonymots-coquille", 6, "Synonymots : la coquille se brise", "vilainPetitCanard", ici(n, "synonymots-coquille")),
      ]),
    f("lieux", 7, "Les lieux de l'histoire", "categoriser", categoriser(n, "cartes", cartes("Les lieux de l'histoire", P.fleuve, LIEUX), { legendes: true })),
    f("silhouettes", 7, "Les silhouettes", "vilainPetitCanard", ici(n, "silhouettes")),
    f("intrus", 7, "L'intrus", "categoriser", categoriser(n, "intrus", universEtIntrus(n))),
    f("devinettes", 8, "Les devinettes", "vilainPetitCanard", ici(n, "devinettes")),
    f("plan", 8, "Le plan de l'histoire", "vilainPetitCanard", ici(n, "plan")),
    f("familles-histoire", 8, "Le jeu des familles de l'histoire", "categoriser", categoriser(n, "familles", FAMILLES_DE_L_HISTOIRE, { legendes: true })),
    f("actions", 8, "Les cartes des actions", "categoriser", categoriser(n, "cartes", cartes("Les actions", P.marcher, ACTIONS), { legendes: true })),
    f("tapis", 9, "Le tapis de conte", "vilainPetitCanard", ici(n, "tapis")),
    ...(n === "GS"
      ? [
        f("comparer", 10, "Deux versions de l'histoire", "vilainPetitCanard", ici(n, "comparer")),
        f("titre", 10, "Les mots du titre", "vilainPetitCanard", ici(n, "titre")),
      ]
      : []),
    f("familles-canards", 11, "Les familles de canards", "vilainPetitCanard", ici(n, "familles-canards"), "maths"),
    f("decorer", 11, "Décorer les canards", "vilainPetitCanard", ici(n, "decorer"), "graphisme"),
    f("grille", 12, "La grille d'observation", "vilainPetitCanard", ici(n, "grille")),
  ];
}

/** Ce qu'il faut préparer, séance par séance (treize séances) : la note « matériel » de chacune. */
export function materielDesSeances(n: NiveauVpc): string[] {
  return [
    "Des photos ou un imagier des animaux, un petit film documentaire ; les cartes des familles, découpées. Le cygne femelle, le cygneau et l'oison n'ont pas d'image à eux : vos photos les remplacent.",
    "Les maisons des familles et les images à découper, une enveloppe par binôme ; des animaux miniatures si la classe en a.",
    n === "GS" ? "Les fiches documentaires ; le tableau de ce que nous avons appris ; les boîtes des saisons." : "Les fiches documentaires, à lire ; les boîtes des saisons ; des albums documentaires sur les saisons.",
    "L'album, sa couverture d'abord ; un coin lecture.",
    "L'album ; les marottes des personnages, sur leurs bâtons ; un tablier à raconter, si la classe en a un.",
    n === "MS" ? "Les affiches des émotions ; des photos de visages ; les cartes des émotions." : "La carte des synonymots et ses étiquettes ; l'image de la cane et de ses petits, dans l'album.",
    n === "MS" ? "Les images de la naissance du poussin, découpées ; si possible, une vidéo d'éclosion." : "La carte « la coquille se brise » et ses étiquettes.",
    "Les cartes des lieux ; des photos de vrais lieux (fleuve, lac) ; la fiche des silhouettes ; la fiche de l'intrus.",
    "Les devinettes ; le plan de l'histoire et ses images ; le jeu des familles ; les cartes des actions.",
    "Le tapis de conte : les lieux et les personnages qui tiennent debout ; les marottes.",
    n === "GS" ? "Une autre version de l'histoire, si la classe en a ; le tableau des deux versions ; les mots du titre." : "Des images de visages, d'œuvres d'art, de masques pour la collection des émotions ; les affiches des émotions.",
    `Pour les familles de canards : des jetons ou des cubes jaunes et gris — ${PETITS_PAR_FAMILLE[n]} par élève —, ou des canards de bain, pour faire les familles avant de les colorier ; des crayons de couleur jaunes et gris ; la fiche des familles. Pour la décoration : des feutres fins ou des crayons ; la fiche des canards à décorer ; les motifs du répertoire de la classe, affichés.`,
    "La grille d'observation ; les cartes-images.",
  ];
}

/** Une feuille d'ici, par son nom. */
export function htmlFeuilleVpc(n: NiveauVpc, id: IdFeuilleVpc, images: Images, alea: () => number): string {
  const corps = {
    documentaires: () => htmlDocumentaires(n, images),
    marottes: () => htmlMarottes(images),
    emotions: () => htmlEmotions(images),
    "synonymots-queue": () => htmlSynonymots("queue", images),
    "synonymots-coquille": () => htmlSynonymots("coquille", images),
    silhouettes: () => htmlSilhouettes(images, alea),
    devinettes: () => htmlDevinettes(n, images, alea),
    plan: () => htmlPlan(images, alea),
    tapis: () => htmlTapis(images),
    titre: () => htmlMotsDuTitre(alea),
    comparer: () => htmlComparer(),
    "familles-canards": () => htmlFamillesDeCanards(n),
    decorer: () => htmlDecorer(n),
    grille: () => htmlGrille(n),
  }[id]();
  // Ces feuilles n'ont pas de pictogramme de la banque : les canards à colorier sont dessinés pour Maitrize.
  const sansImages = id === "titre" || id === "comparer" || id === "grille" || id === "familles-canards" || id === "decorer";
  return feuille(`${corps}${sansImages ? "" : attributionPour(IDS_VPC)}`, "vp");
}

export const STYLE_VPC = `
  .feuille.vp .vp-img { display: inline-flex; align-items: center; justify-content: center; }
  .feuille.vp .vp-img img, .feuille.vp .vp-img .vide { width: 100%; height: 100%; object-fit: contain; margin: 0; max-width: none; }
  .feuille.vp .vp-gris img { filter: grayscale(1) brightness(.82) contrast(1.1); }
  .feuille.vp .vp-ombre img { filter: brightness(0); }
  .feuille.vp .vp-fiche { border: 1px solid #cfd4e2; border-radius: 3mm; padding: 4mm 5mm; margin-bottom: 5mm; page-break-inside: avoid; }
  .feuille.vp .vp-fiche-tete { font-size: 18px; font-weight: 800; margin-bottom: 3mm; }
  .feuille.vp .vp-fiche-animaux { display: flex; gap: 6mm; margin-bottom: 3mm; }
  .feuille.vp .vp-fiche-animaux figure { margin: 0; text-align: center; font-size: 12px; font-weight: 700; }
  .feuille.vp .vp-fiche-animaux .vp-img { width: 26mm; height: 26mm; }
  .feuille.vp .vp-fiche-texte { margin: 0; padding-left: 5mm; font-size: 14px; line-height: 1.55; }
  .feuille.vp .vp-tableau { width: 100%; border-collapse: collapse; font-size: 12px; }
  .feuille.vp .vp-tableau th, .feuille.vp .vp-tableau td { border: 1px solid #9aa0b4; padding: 2mm; vertical-align: top; }
  .feuille.vp .vp-tableau th { background: #f2f4f8; text-align: left; }
  .feuille.vp .vp-tableau td { height: 38mm; }
  .feuille.vp .vp-tableau th .vp-img { width: 16mm; height: 16mm; display: block; margin-bottom: 1mm; }
  .feuille.vp .vp-grille td { height: 11mm; }
  .feuille.vp .vp-grille th:first-child { width: 34mm; }
  .feuille.vp .vp-marottes { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; justify-items: center; }
  .feuille.vp .vp-marotte { display: flex; flex-direction: column; align-items: center; gap: 2mm; }
  .feuille.vp .vp-rond { width: 70mm; height: 70mm; border: 1.5px dashed #687087; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
  .feuille.vp .vp-rond .vp-img { width: 52mm; height: 52mm; }
  .feuille.vp .vp-nom { font-size: 15px; font-weight: 800; text-align: center; }
  .feuille.vp .vp-baton { font-size: 10px; color: #687087; border: 1px dashed #9aa0b4; padding: 1mm 3mm; }
  .feuille.vp .vp-affiche-tete { display: flex; align-items: center; gap: 6mm; font-size: 34px; font-weight: 800; margin-bottom: 10mm; }
  .feuille.vp .vp-affiche-tete .vp-img { width: 42mm; height: 42mm; }
  .feuille.vp .vp-echelle { display: flex; align-items: flex-end; gap: 4mm; height: 92mm; }
  .feuille.vp .vp-marche { flex: 1; display: flex; flex-direction: column; justify-content: flex-start; gap: 1mm; padding: 3mm; border-radius: 3mm 3mm 0 0;
    height: calc(34mm + var(--i) * 18mm); background: hsl(220, 60%, calc(92% - var(--i) * 12%)); color: #1c2233; }
  .feuille.vp .vp-marche b { font-size: calc(20px + var(--i) * 4px); }
  .feuille.vp .vp-marche span { font-size: 14px; }
  .feuille.vp .vp-plus-fort { font-size: 15px; font-weight: 700; color: #4a5168; margin: 3mm 0 10mm; }
  .feuille.vp .vp-pourquoi { display: flex; gap: 8mm; align-items: flex-start; border-top: 1.2mm solid #cfd4e2; padding-top: 6mm; }
  .feuille.vp .vp-pourquoi > b { flex: none; white-space: nowrap; font-size: 22px; }
  .feuille.vp .vp-pourquoi figure { margin: 0; text-align: center; font-size: 14px; width: 44mm; }
  .feuille.vp .vp-pourquoi .vp-img { width: 34mm; height: 34mm; }
  .feuille.vp .vp-syno-image { display: flex; align-items: flex-end; justify-content: center; gap: 3mm; margin: 8mm 0 6mm; }
  .feuille.vp .vp-syno-image .vp-img { width: 32mm; height: 32mm; }
  .feuille.vp .vp-syno-image .vp-grand { width: 50mm; height: 50mm; }
  .feuille.vp .vp-syno-phrase { font-size: 26px; font-weight: 700; line-height: 2.2; text-align: center; }
  .feuille.vp .vp-case { display: inline-block; width: 95mm; height: 16mm; border: 2px dashed #4a5168; border-radius: 2mm; vertical-align: middle; background: #f1f3f8; }
  .feuille.vp .vp-etiquettes { display: flex; flex-wrap: wrap; gap: 4mm; margin: 6mm 0; }
  .feuille.vp .vp-etiquettes span { border: 1.5px dashed #687087; padding: 4mm 6mm; font-size: 24px; font-weight: 700; }
  .feuille.vp .vp-case-syno { width: 120mm; height: 17mm; }
  .feuille.vp .vp-etiquettes-syno { flex-direction: column; align-items: center; gap: 4mm; margin: 10mm 0 6mm; }
  .feuille.vp .vp-etiquettes-syno span { width: 120mm; height: 17mm; box-sizing: border-box; display: flex; align-items: center; justify-content: center;
    font-size: 22px; padding: 0 4mm; }
  .feuille.vp .vp-cursive { font-family: ${POLICE_CURSIVE}; font-weight: 400 !important; font-size: 30px !important; }
  .feuille.vp .vp-script { font-family: Arial, Helvetica, sans-serif; text-transform: none; }
  .feuille.vp .vp-capitales, .feuille.vp .vp-majuscules span { text-transform: uppercase; letter-spacing: .04em; }
  .feuille.vp .vp-note { font-size: 12px; color: #4a5168; border-top: 1px solid #cfd4e2; padding-top: 3mm; margin-top: 6mm; line-height: 1.5; }
  .feuille.vp .vp-note b { display: block; }
  .feuille.vp .vp-relier { display: flex; flex-direction: column; gap: 4mm; }
  .feuille.vp .vp-relier-ligne { display: grid; grid-template-columns: 34mm 4mm 1fr 4mm 34mm; align-items: center; height: 36mm; }
  .feuille.vp .vp-relier-case { width: 34mm; height: 34mm; }
  .feuille.vp .vp-relier-case .vp-img { width: 100%; height: 100%; }
  .feuille.vp .vp-point { width: 3mm; height: 3mm; border-radius: 50%; background: #1c2233; }
  .feuille.vp .vp-devinettes { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
  .feuille.vp .vp-devinette { border: 1px solid #cfd4e2; border-radius: 3mm; padding: 3mm 4mm; page-break-inside: avoid; min-height: 70mm;
    display: flex; flex-direction: column; justify-content: space-between; }
  .feuille.vp .vp-devinette-texte { font-size: 15px; line-height: 1.45; }
  .feuille.vp .vp-choix { display: flex; justify-content: space-around; margin-top: 3mm; }
  .feuille.vp .vp-choix .vp-img { width: 25mm; height: 25mm; border: 1px solid #e3e6ef; border-radius: 2mm; padding: 1mm; box-sizing: border-box; }
  .feuille.vp .vp-corrige { font-size: 14px; line-height: 1.8; }
  .feuille.vp .vp-bandes { display: flex; flex-direction: column; gap: 3mm; margin-top: 4mm; }
  .feuille.vp .vp-bande { display: grid; grid-template-columns: auto 1fr; grid-template-rows: auto 1fr; align-items: center; column-gap: 5mm; row-gap: 1mm;
    height: 45mm; box-sizing: border-box; border: 1.5px solid #1c2233; border-radius: 3mm; padding: 2mm 5mm; page-break-inside: avoid; }
  .feuille.vp .vp-bande-titre { grid-column: 1 / -1; font-size: 17px; font-weight: 800; }
  .feuille.vp .vp-bande-images { display: flex; gap: 3mm; }
  .feuille.vp .vp-bande-images .vp-img { width: 28mm; height: 28mm; }
  .feuille.vp .vp-bande-texte { font-size: 17px; line-height: 1.4; }
  .feuille.vp .vp-plan { display: grid; grid-template-columns: repeat(5, 1fr); gap: 2mm; margin: 4mm 0; }
  .feuille.vp .vp-moment { border: 1.5px solid #1c2233; border-radius: 2mm; padding: 2mm; display: flex; flex-direction: column; gap: 2mm; min-height: 135mm; }
  .feuille.vp .vp-moment-titre { font-size: 13px; font-weight: 800; }
  .feuille.vp .vp-moment-vide { flex: 1; border: 1.5px dashed #9aa0b4; border-radius: 2mm; background: #f6f7fb; }
  .feuille.vp .vp-a-decouper { display: flex; gap: 5mm; justify-content: center; margin-top: 6mm; }
  .feuille.vp .vp-piece { width: 31mm; height: 31mm; border: 1px dashed #9aa0b4; padding: 1mm; }
  .feuille.vp .vp-piece .vp-img { width: 100%; height: 100%; }
  .feuille.vp .vp-lieu { height: 112mm; border: 1.5px dashed #9aa0b4; border-radius: 4mm; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 4mm; margin-bottom: 5mm; page-break-inside: avoid; }
  .feuille.vp .vp-lieu .vp-img { width: 85mm; height: 85mm; }
  .feuille.vp .vp-lieu .vp-nom { font-size: 24px; }
  .feuille.vp .vp-deboutes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; }
  .feuille.vp .vp-debout { border: 1px dashed #9aa0b4; display: flex; flex-direction: column; align-items: center; }
  .feuille.vp .vp-debout-haut { width: 45mm; height: 45mm; padding: 2mm; }
  .feuille.vp .vp-debout-haut .vp-img { width: 100%; height: 100%; }
  .feuille.vp .vp-pli { width: 100%; border-top: 1.5px dashed #687087; font-size: 10px; color: #687087; text-align: center; }
  .feuille.vp .vp-debout-bas { height: 18mm; width: 100%; background: #f1f3f8; }
  .feuille.vp .vp-modele { display: flex; gap: 4mm; font-size: 30px; font-weight: 800; margin: 4mm 0 3mm; }
  .feuille.vp .vp-modele span { border: 1.5px solid #1c2233; padding: 2mm 4mm; }
  .feuille.vp .vp-cases-titre { display: flex; gap: 4mm; }
  .feuille.vp .vp-cases-titre .vp-case { width: 40mm; height: 18mm; }
  .feuille.vp .vp-colle { font-size: 32px; font-weight: 800; letter-spacing: .3em; margin: 6mm 0 2mm; }
  .feuille.vp .vp-ligne { border-bottom: 1.5px solid #9aa0b4; height: 16mm; margin-bottom: 4mm; }
  .feuille.vp .vp-boites { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; margin: 4mm 0; }
  .feuille.vp .vp-boite { height: 80mm; border: 2px solid #1c2233; border-radius: 3mm; padding: 3mm; font-size: 20px; }
  .feuille.vp .vp-legende { display: flex; gap: 10mm; margin: 2mm 0 4mm; font-size: 14px; }
  .feuille.vp .vp-sorte { display: inline-flex; align-items: center; gap: 2mm; }
  .feuille.vp .vp-sorte svg { width: 14mm; height: auto; }
  .feuille.vp .vp-familles { display: flex; flex-direction: column; gap: 2mm; }
  .feuille.vp .vp-famille { display: grid; grid-template-columns: var(--case) repeat(var(--petits), var(--case)) 1fr; align-items: end; column-gap: 1.5mm;
    border-bottom: 1px dashed #cfd4e2; padding-bottom: 2mm; page-break-inside: avoid; }
  .feuille.vp .vp-famille svg { width: 100%; height: auto; }
  .feuille.vp .vp-combien { font-size: 14px; line-height: 2; padding-left: 3mm; align-self: center; }
  .feuille.vp .vp-nb { display: inline-block; width: 9mm; height: 8mm; border: 1.5px solid #4a5168; border-radius: 1.5mm; vertical-align: middle; }
  .feuille.vp .vp-canards-deco { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm 8mm; margin-top: 2mm; }
  .feuille.vp .vp-canard-deco { margin: 0; text-align: center; page-break-inside: avoid; }
  .feuille.vp .vp-canard-deco svg { width: 76mm; height: auto; margin: 0 auto; }
  .feuille.vp .vp-canard-deco figcaption { font-size: 13px; font-weight: 700; color: #4a5168; }
  ${STYLE_CANARDS_DESSINES}
`;

/** La feuille d'un atelier réutilisé, son style : pour l'aperçu de l'atelier « Le Vilain Petit Canard ». */
export const STYLES_DES_ATELIERS: Record<FeuilleVpc["atelier"], string> = { categoriser: STYLE_CATEGORISER, suites: STYLE_SUITES, vilainPetitCanard: STYLE_VPC };
