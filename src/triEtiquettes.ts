// Les maisons du tri : des étiquettes à découper, et où les ranger.
//
// Être ou avoir, phrase ou pas une phrase, nom ou verbe : on apprend une
// notion en triant. La feuille donne les étiquettes à découper, puis le
// tableau des « maisons » — une colonne par catégorie — où les poser, les
// coller, ou les recopier. L'enseignant écrit ses catégories et ses
// étiquettes, ou part d'un modèle.
//
// Deux aides pour différencier, qu'on met ou non :
// - le mot marqué en couleur : on entoure d'astérisques ce qui fait la
//   différence — « Je *suis* content. » —, le verbe le plus souvent ;
// - la majuscule et la ponctuation en couleur, pour le tri des phrases.
// Les deux versions, avec et sans aide, peuvent sortir à la suite : la même
// séance, deux feuilles, chacun la sienne.

import { escapeHtml } from "./print";
import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";

export interface CategorieTri {
  titre: string;
  /** Les étiquettes, une par ligne ; « *mot* » marque ce qui se colore. */
  etiquettes: string;
}

export interface ReglagesTri {
  titre: string;
  consigne: string;
  categories: CategorieTri[];
  /** Le mot marqué d'astérisques sort en couleur. */
  aideMots: boolean;
  couleurMots: string;
  /** La majuscule du début et la ponctuation de la fin sortent en couleur. */
  aidePonctuation: boolean;
  couleurPonctuation: string;
  /** Les deux versions à la suite : avec l'aide, puis sans. */
  deuxVersions: boolean;
  parLigne: number;
  taille: "normale" | "grande";
  capitales: boolean;
  melanger: boolean;
  /** La fiche d'aide : une ligne par vérification, « titre : question ». */
  aide: string;
  aRetenir: string;
  /**
   * D'où vient le tri : « projet », il suit le projet du moment ; « theme »,
   * un modèle réécrit par l'IA dans le thème du projet ; « modele », on l'a
   * choisi parmi les modèles. Ces deux-là restent. Absent : jamais choisi.
   */
  origine?: "projet" | "theme" | "modele";
}

export const COULEURS_TRI: { nom: string; hex: string }[] = [
  { nom: "rouge", hex: "#d94033" }, { nom: "bleu", hex: "#2454e6" }, { nom: "vert", hex: "#1f9a48" },
  { nom: "orange", hex: "#e07b00" }, { nom: "violet", hex: "#8e44ad" }, { nom: "noir", hex: "#1c2233" },
];
const NOIR = "#1c2233";
const couleurSure = (c: string | undefined, defaut: string) => (c && /^#[0-9a-fA-F]{6}$/.test(c) ? c : defaut);

export const CATEGORIES_MAX = 4;

// ── Les modèles ───────────────────────────────────────────────────────────

/** Ce que tous les tris partagent, avant leurs maisons. */
export const BASE_TRI = {
  aideMots: true, couleurMots: "#d94033", aidePonctuation: false, couleurPonctuation: "#2454e6", deuxVersions: false,
  parLigne: 4, taille: "normale" as const, capitales: false, melanger: true, aide: "", aRetenir: "",
};
const BASE = BASE_TRI;

export const MODELES_TRI: { id: string; nom: string; reglages: ReglagesTri }[] = [
  { id: "etre-avoir", nom: "Être ou avoir", reglages: { ...BASE,
    titre: "ÊTRE ou AVOIR ?",
    consigne: "Découpe les étiquettes. Lis chaque phrase et place-la dans la bonne maison.",
    categories: [
      { titre: "Verbe être", etiquettes: "Je *suis* content.\nTu *es* à l'école.\nIl *est* dans la classe.\nElle *est* fatiguée.\nNous *sommes* prêts.\nVous *êtes* en retard.\nIls *sont* dans le jardin.\nElles *sont* heureuses." },
      { titre: "Verbe avoir", etiquettes: "J'*ai* un cartable.\nTu *as* un crayon.\nIl *a* un vélo.\nElle *a* une poupée.\nNous *avons* des livres.\nVous *avez* une gomme.\nIls *ont* des ballons.\nElles *ont* des fleurs." },
    ] } },
  { id: "phrase", nom: "Phrase, ou pas une phrase", reglages: { ...BASE,
    titre: "Qu'est-ce qu'une phrase ?", aideMots: false, aidePonctuation: true, parLigne: 2,
    consigne: "Découpe les étiquettes, lis-les, puis forme deux groupes : ce qui est une phrase, ce qui n'en est pas une.",
    aide: "Le sens : Est-ce que la suite de mots veut dire quelque chose ?\nLes mots : Sont-ils rangés dans un ordre qui se comprend ?\nLa majuscule : Est-ce que cela commence par une majuscule ?\nLa ponctuation : Est-ce que cela finit par un point, un point d'interrogation ou un point d'exclamation ?",
    aRetenir: "Une phrase est une suite de mots qui a du sens. Elle commence par une majuscule et finit par un point. La majuscule et le point ne suffisent pas : je vérifie aussi le sens.",
    categories: [
      { titre: "C'est une phrase", etiquettes: "Le chat dort sur le lit.\nAujourd'hui, nous allons à la piscine.\nAs-tu fini ton dessin ?\nQuel beau gâteau !\nMa sœur range sa chambre.\nIl pleut depuis ce matin.\nJe ne trouve pas mon cartable.\nDemain, papa viendra me chercher." },
      { titre: "Ce n'est pas une phrase", etiquettes: "Rue chat ma partir.\nles enfants jouent dans la cour\nTous les matins, mange avec.\nHier.\ntu viens avec moi !\nLe train maman les amis.\nPeux-tu me prêter ton stylo\nDix pas et campagne tu." },
    ] } },
  { id: "types", nom: "Les types de phrases", reglages: { ...BASE,
    titre: "Les types de phrases", aideMots: false, aidePonctuation: true, parLigne: 3,
    consigne: "Découpe les étiquettes. Lis chaque phrase et range-la dans sa maison.",
    categories: [
      { titre: "Elle raconte, elle dit", etiquettes: "Le vent souffle fort.\nNous mangeons à la cantine.\nMon frère a huit ans.\nLa maîtresse lit une histoire." },
      { titre: "Elle pose une question", etiquettes: "Où est ton manteau ?\nVeux-tu jouer avec moi ?\nQuelle heure est-il ?\nEst-ce que tu viens ?" },
      { titre: "Elle s'exclame", etiquettes: "Quelle belle journée !\nComme tu as grandi !\nBravo, tu as réussi !\nQue ce gâteau est bon !" },
    ] } },
  { id: "temps", nom: "Passé, présent, futur", reglages: { ...BASE,
    titre: "Passé, présent ou futur ?", parLigne: 3,
    consigne: "Découpe les étiquettes. Lis chaque phrase : est-ce déjà passé, est-ce maintenant, est-ce plus tard ?",
    categories: [
      { titre: "Passé", etiquettes: "Hier, j'*ai joué* au ballon.\nLa semaine dernière, nous *avons visité* un musée.\nCe matin, tu *as rangé* ta chambre.\nL'an dernier, il *était* au CP." },
      { titre: "Présent", etiquettes: "En ce moment, je *lis* un livre.\nAujourd'hui, il *fait* beau.\nMaintenant, nous *écrivons* la date.\nTu *manges* une pomme." },
      { titre: "Futur", etiquettes: "Demain, j'*irai* à la piscine.\nPlus tard, elle *sera* vétérinaire.\nLa semaine prochaine, nous *partirons* en vacances.\nCe soir, tu *regarderas* un film." },
    ] } },
  { id: "nom-verbe", nom: "Nom ou verbe", reglages: { ...BASE,
    titre: "NOM ou VERBE ?", aideMots: false, taille: "grande",
    consigne: "Découpe les étiquettes. Lis chaque mot et place-le dans la bonne maison.",
    categories: [
      { titre: "Un nom", etiquettes: "un chat\nla maison\nune pomme\nle jardin\ndes livres\nla maîtresse\nun vélo\nl'école" },
      { titre: "Un verbe", etiquettes: "manger\ncourir\ndormir\nchanter\nlire\nécrire\nsauter\ndessiner" },
    ] } },
  { id: "nombre", nom: "Singulier ou pluriel", reglages: { ...BASE,
    titre: "SINGULIER ou PLURIEL ?", taille: "grande",
    consigne: "Découpe les étiquettes. Un seul, ou plusieurs ? Place chaque étiquette dans la bonne maison.",
    categories: [
      { titre: "Singulier : un seul", etiquettes: "*le* chat\n*une* fleur\n*mon* cartable\n*la* voiture\n*un* enfant\n*ta* chaussure\n*ce* livre\n*l'*arbre" },
      { titre: "Pluriel : plusieurs", etiquettes: "*les* chats\n*des* fleurs\n*mes* cartables\n*les* voitures\n*des* enfants\n*tes* chaussures\n*ces* livres\n*les* arbres" },
    ] } },
];

export const REGLAGES_TRI: ReglagesTri = MODELES_TRI[0].reglages;

// ── Les étiquettes ────────────────────────────────────────────────────────

const MARQUE = /\*([^*\n]+)\*/g;

/** L'étiquette telle qu'elle se lit, sans ses astérisques. */
export const sansMarques = (texte: string) => (texte ?? "").replace(MARQUE, "$1");

/** Les étiquettes d'une maison : une par ligne, les vides écartées. */
export const etiquettesSaisies = (texte: string) => (texte ?? "").split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter((l) => sansMarques(l).trim());

export interface EtiquetteTri { texte: string; maison: number }

/** Les maisons qui ont un titre ou des étiquettes, quatre au plus. */
export const maisonsDuTri = (r: Pick<ReglagesTri, "categories">): CategorieTri[] =>
  (r.categories ?? []).filter((c) => c && (c.titre.trim() || etiquettesSaisies(c.etiquettes).length)).slice(0, CATEGORIES_MAX);

/** Toutes les étiquettes, mêlées si on le demande — rejouables. */
export function etiquettesDuTri(r: Pick<ReglagesTri, "categories" | "melanger">, graine: number): EtiquetteTri[] {
  const toutes = maisonsDuTri(r).flatMap((c, maison) => etiquettesSaisies(c.etiquettes).map((texte) => ({ texte, maison })));
  return r.melanger ? melanger(hasard(graine), toutes) : toutes;
}

interface Morceau { texte: string; mot: boolean; ponctuation: boolean }

/** L'étiquette en morceaux : ce qui est marqué, la majuscule du début, la ponctuation de la fin. */
export function morceaux(texte: string): Morceau[] {
  const sortie: Morceau[] = [];
  let position = 0;
  MARQUE.lastIndex = 0;
  for (let m = MARQUE.exec(texte); m; m = MARQUE.exec(texte)) {
    if (m.index > position) sortie.push({ texte: texte.slice(position, m.index), mot: false, ponctuation: false });
    sortie.push({ texte: m[1], mot: true, ponctuation: false });
    position = m.index + m[0].length;
  }
  if (position < texte.length) sortie.push({ texte: texte.slice(position), mot: false, ponctuation: false });
  if (!sortie.length) return sortie;
  // La majuscule du début, si c'en est une.
  const tete = sortie[0];
  if (tete.texte.length > 1 && /^\p{Lu}/u.test(tete.texte)) {
    sortie.splice(0, 1, { ...tete, texte: tete.texte[0], ponctuation: true }, { ...tete, texte: tete.texte.slice(1) });
  }
  // La ponctuation de la fin : point, point d'interrogation, d'exclamation, de suspension.
  const queue = sortie[sortie.length - 1];
  const fin = /\s*[.!?…]+\s*$/.exec(queue.texte);
  if (fin && fin.index > 0) {
    sortie.splice(sortie.length - 1, 1, { ...queue, texte: queue.texte.slice(0, fin.index) }, { ...queue, texte: queue.texte.slice(fin.index), ponctuation: true });
  } else if (fin) {
    queue.ponctuation = true;
  }
  return sortie;
}

type Aides = Pick<ReglagesTri, "aideMots" | "couleurMots" | "aidePonctuation" | "couleurPonctuation" | "capitales">;

/** L'étiquette imprimée : avec l'aide, le mot marqué et la ponctuation sortent en couleur. */
export function htmlEtiquette(texte: string, r: Aides, aide: boolean): string {
  const mots = aide && r.aideMots, ponctuation = aide && r.aidePonctuation;
  return morceaux(texte).map((m) => {
    const lu = escapeHtml(r.capitales ? m.texte.toLocaleUpperCase("fr") : m.texte);
    // En capitales, la majuscule du début ne dit plus rien : seule la ponctuation garde sa couleur.
    if (ponctuation && m.ponctuation && !(r.capitales && /\p{L}/u.test(m.texte))) return `<span class="tr-ponctuation" style="color:${couleurSure(r.couleurPonctuation, "#2454e6")}">${lu}</span>`;
    if (mots && m.mot) return `<span class="tr-mot" style="color:${couleurSure(r.couleurMots, "#d94033")}">${lu}</span>`;
    return lu;
  }).join("");
}

/** Vrai si une aide est demandée et qu'elle a de quoi s'appliquer. */
export const avecAide = (r: ReglagesTri): boolean =>
  (r.aidePonctuation && etiquettesDuTri(r, 1).length > 0) || (r.aideMots && maisonsDuTri(r).some((c) => new RegExp(MARQUE.source).test(c.etiquettes)));

/** La fiche d'aide : une vérification par ligne, « titre : question ». */
export function lignesDAide(texte: string): { titre: string; question: string }[] {
  return (texte ?? "").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const i = l.indexOf(":");
    return i > 0 ? { titre: l.slice(0, i).trim(), question: l.slice(i + 1).trim() } : { titre: "", question: l };
  });
}

// ── La feuille ────────────────────────────────────────────────────────────

const NUMEROS = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧"];

export function htmlTri(r: ReglagesTri, graine: number): string {
  const maisons = maisonsDuTri(r);
  const etiquettes = etiquettesDuTri(r, graine);
  const titre = r.titre.trim();
  const aide = avecAide(r);
  // Une étiquette doit tenir dans sa maison : pas plus large qu'une colonne du tableau.
  const parLigne = Math.max(2, Math.min(4, Math.max(Math.round(r.parLigne) || 4, maisons.length)));
  const texte = (t: string) => escapeHtml(r.capitales ? t.toLocaleUpperCase("fr") : t);
  // Le texte est enveloppé : posés à même la case en flex, ses morceaux perdraient les espaces qui les séparent.
  const page = (avec: boolean, repere: string) => `<div class="page">${repere ? `<div class="tr-repere">${repere}</div>` : ""}
    <div class="titre">Étiquettes à manipuler${titre ? ` — ${escapeHtml(titre)}` : ""}</div>
    ${r.consigne.trim() ? `<div class="consigne">${escapeHtml(r.consigne.trim())}</div>` : ""}
    <div class="tr-etiquettes" style="grid-template-columns: repeat(${parLigne}, 1fr)">${etiquettes.map((e) => `<div class="tr-etiquette"><span class="tr-texte">${htmlEtiquette(e.texte, r, avec)}</span></div>`).join("")}</div></div>`;
  const pages = aide && r.deuxVersions ? page(true, "avec l'aide") + page(false, "sans l'aide") : page(aide, "");

  const lignes = Math.max(3, ...maisons.map((c) => etiquettesSaisies(c.etiquettes).length));
  const entetes = maisons.map((c) => `<th>${texte(c.titre.trim() || "…")}</th>`).join("");
  const tableau = (rempli: boolean) => `<table class="tr-maisons"><thead><tr>${entetes}</tr></thead><tbody>${Array.from({ length: lignes }, (_, i) =>
    `<tr>${maisons.map((c) => `<td>${rempli ? htmlEtiquette(etiquettesSaisies(c.etiquettes)[i] ?? "", r, true) : ""}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  const verifications = lignesDAide(r.aide);
  const ficheDAide = verifications.length || r.aRetenir.trim()
    ? `<div class="tr-aide"><div class="tr-aide-titre">Je vérifie</div>`
      + (verifications.length ? `<table class="tr-verifications">${verifications.map((v, i) => `<tr><th>${NUMEROS[i] ?? "•"} ${escapeHtml(v.titre)}</th><td>${escapeHtml(v.question)}</td></tr>`).join("")}</table>` : "")
      + (r.aRetenir.trim() ? `<div class="tr-retenir"><b>À retenir.</b> ${escapeHtml(r.aRetenir.trim())}</div>` : "") + `</div>`
    : "";
  const maison = `<div class="page"><div class="titre">Les maisons du tri${titre ? ` — ${escapeHtml(titre)}` : ""}</div>
    <div class="sous">Prénom : ........................................ Date : ........................</div>
    ${ficheDAide}${tableau(false)}</div>`;
  const corrige = `<div class="page corrige"><div class="titre">Les maisons du tri — corrigé</div>${tableau(true)}</div>`;
  return feuille(pages + maison + corrige, `tr tr-${r.taille === "grande" ? "grande" : "normale"}`);
}

export const STYLE_TRI = `
  .feuille.tr .consigne { font-size: 14px; font-weight: 600; color: ${NOIR}; margin: 0 0 4mm; line-height: 1.45; }
  .feuille.tr .tr-repere { float: right; font-size: 9px; color: #9aa0b4; }
  .feuille.tr .tr-etiquettes { display: grid; }
  .feuille.tr .tr-etiquette { border: 1.5px solid ${NOIR}; margin: 0 -1.5px -1.5px 0; min-height: 19mm; padding: 2mm 3mm; display: flex; align-items: center;
    justify-content: center; text-align: center; font-size: 15px; line-height: 1.3; page-break-inside: avoid; }
  .feuille.tr-grande .tr-etiquette { min-height: 24mm; font-size: 20px; }
  .feuille.tr .tr-mot, .feuille.tr .tr-ponctuation { font-weight: 800; }
  .feuille.tr .tr-maisons { border-collapse: collapse; width: 100%; table-layout: fixed; margin-top: 3mm; }
  .feuille.tr .tr-maisons th { border: 1.5px solid ${NOIR}; background: #d9dbe3; padding: 3mm 2mm; font-size: 13px; text-transform: uppercase; letter-spacing: .3px; }
  .feuille.tr .tr-maisons td { border: 1.5px solid ${NOIR}; height: 21mm; padding: 1mm 2mm; text-align: center; font-size: 14px; line-height: 1.3; }
  .feuille.tr-grande .tr-maisons td { height: 26mm; font-size: 18px; }
  .feuille.tr .tr-aide { margin: 0 0 5mm; }
  .feuille.tr .tr-aide-titre { font-size: 13px; font-weight: 800; margin-bottom: 1.5mm; }
  .feuille.tr .tr-verifications { border-collapse: collapse; width: 100%; font-size: 12.5px; }
  .feuille.tr .tr-verifications th, .feuille.tr .tr-verifications td { border: 1px solid #9aa0b4; padding: 1.8mm 2.5mm; text-align: left; vertical-align: top; }
  .feuille.tr .tr-verifications th { width: 38mm; background: #f0f2f8; font-weight: 700; }
  .feuille.tr .tr-retenir { margin-top: 2.5mm; font-size: 12.5px; line-height: 1.5; border: 1px solid #cfd4e2; border-radius: 8px; padding: 2.5mm 3.5mm; background: #f7f8fc; }
`;
