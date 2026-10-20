// Les générateurs de l'enseignant : des supports qu'il fait faire à l'IA de
// Mistral, décrits en quelques phrases, puis qu'il retouche (demande de
// l'enseignant, octobre 2026 : « que les utilisateurs puissent eux aussi
// faire des supports, avec les pictos qui peuvent être placés, des images »).
//
// L'IA n'écrit pas la feuille : elle écrit une recette, faite de blocs que
// Maitrize sait dessiner et corriger — relier, trier en colonnes, compléter,
// compter, entourer, des questions, des étiquettes à découper, une planche
// où l'on place des images, coller le mot sous l'image, remettre dans
// l'ordre, cocher la bonne image. Maitrize tire au sort à chaque feuille dans les
// listes de la recette, fait le corrigé, et la feuille prend le chemin des
// autres : consignes en étapes, mode dys, options d'impression. Chaque mot
// reçoit le picto de la banque qui porte exactement ce nom ; l'enseignant le
// change, ou met sa photo.
//
// Ce qui part chez Mistral : la demande de l'enseignant, dont les prénoms de
// la classe sont masqués avant l'envoi (voir confidentialite.ts), et la
// recette elle-même quand on demande une retouche. Rien d'autre.

import { attributionPour, feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";
import { escapeHtml } from "./print";
import { cleImage, type Images, type PictoPose } from "./supportsVisuels";
import { estUnUsage, type Usage } from "./usageAtelier";

// ── La recette ────────────────────────────────────────────────────────────

/** Ce qu'un élément montre : son mot, son picto, ou les deux. */
export type Affichage = "mot" | "picto" | "les-deux";

export type SorteDeBloc = "relier" | "trier" | "completer" | "compter" | "entourer" | "questions" | "etiquettes" | "planche" | "associer" | "ordre" | "choisir";

export interface BlocRelier { sorte: "relier"; consigne: string; paires: [PictoPose, PictoPose][]; combien: number; affichage: Affichage }
export interface BlocTrier { sorte: "trier"; consigne: string; categories: { nom: string; elements: PictoPose[] }[]; combien: number; affichage: Affichage }
/** Des phrases dont un mot, ou plusieurs, est entre crochets : « Le [chat] dort. » */
export interface BlocCompleter { sorte: "completer"; consigne: string; phrases: string[]; combien: number; banque: boolean }
export interface BlocCompter { sorte: "compter"; consigne: string; elements: PictoPose[]; min: number; max: number; combien: number }
export interface BlocEntourer { sorte: "entourer"; consigne: string; cibles: PictoPose[]; autres: PictoPose[]; combien: number; affichage: Affichage }
export interface QuestionPerso { question: string; reponse: string; choix: string[] }
export interface BlocQuestions { sorte: "questions"; consigne: string; questions: QuestionPerso[]; combien: number }
export interface BlocEtiquettes { sorte: "etiquettes"; consigne: string; elements: PictoPose[]; combien: number; affichage: Affichage }
/** Une image placée sur la planche : son centre en pourcentage du cadre, sa largeur en millimètres. */
export interface ObjetPlace { element: PictoPose; x: number; y: number; taille: number }
export interface BlocPlanche { sorte: "planche"; consigne: string; objets: ObjetPlace[]; hauteur: number; legendes: boolean }
/** Des images, chacune avec sa case vide ; les mots à découper, à coller dessous. */
export interface BlocAssocier { sorte: "associer"; consigne: string; elements: PictoPose[]; combien: number }
/** Des étapes dans leur ordre — une histoire, une recette, une routine — que la feuille mélange ; à numéroter, ou à découper et coller. */
export interface BlocOrdre { sorte: "ordre"; consigne: string; etapes: PictoPose[]; affichage: Affichage; decouper: boolean }
export interface ItemChoisir { question: string; bonne: PictoPose; autres: PictoPose[] }
/** Pour chaque question, la bonne image parmi d'autres, à cocher. */
export interface BlocChoisir { sorte: "choisir"; consigne: string; items: ItemChoisir[]; combien: number; affichage: Affichage }

export type BlocPerso = BlocRelier | BlocTrier | BlocCompleter | BlocCompter | BlocEntourer | BlocQuestions | BlocEtiquettes | BlocPlanche
  | BlocAssocier | BlocOrdre | BlocChoisir;
/** Les exercices dont une feuille montre une partie, tirée au sort. */
export type SorteAvecCombien = Extract<BlocPerso, { combien: number }>["sorte"];

export interface GenerateurPerso {
  id: string;
  nom: string;
  /** Un emoji, pour sa carte dans Fabriquer. */
  icone: string;
  /** Ce qu'il fabrique, en une phrase : le texte de sa carte. */
  quoi: string;
  /** La classe pour laquelle il est pensé ; vide pour toutes. */
  classe: string;
  /** Le moment de la séquence qu'il sert : il se range là dans Fabriquer. */
  moment: Usage;
  /** Ce que l'enseignant a demandé à l'IA. */
  demande: string;
  blocs: BlocPerso[];
  cree: string;
  modifie: string;
}

export const CLASSES_PERSO = ["PS", "MS", "GS", "CP", "CE1", "CE2", "CM1", "CM2"] as const;

/** Les blocs, leur nom à l'écran, et ce qu'ils font : l'IA les choisit dans cette liste, l'enseignant aussi. */
export const BLOCS_PERSO: { sorte: SorteDeBloc; nom: string; consigne: string }[] = [
  { sorte: "relier", nom: "Relier", consigne: "Je relie ce qui va ensemble." },
  { sorte: "trier", nom: "Trier en colonnes", consigne: "Je découpe les étiquettes. Je colle chacune dans la bonne colonne." },
  { sorte: "completer", nom: "Compléter des phrases", consigne: "J'écris le mot qui manque dans chaque phrase." },
  { sorte: "compter", nom: "Compter", consigne: "Je compte les images. J'écris combien il y en a." },
  { sorte: "entourer", nom: "Entourer", consigne: "J'entoure les bonnes images." },
  { sorte: "questions", nom: "Questions", consigne: "Je réponds à chaque question." },
  { sorte: "etiquettes", nom: "Étiquettes à découper", consigne: "Je découpe les étiquettes." },
  { sorte: "planche", nom: "Planche d'images", consigne: "J'écris le nom de chaque image." },
  { sorte: "associer", nom: "Coller le mot sous l'image", consigne: "Je découpe les mots. Je colle chaque mot sous son image." },
  { sorte: "ordre", nom: "Remettre dans l'ordre", consigne: "J'écris le numéro de chaque image, dans l'ordre." },
  { sorte: "choisir", nom: "Cocher la bonne image", consigne: "Je coche la bonne image." },
];
/** La consigne de l'ordre quand les images se découpent. */
export const CONSIGNE_ORDRE_A_DECOUPER = "Je découpe les images. Je les colle dans l'ordre.";
export const nomDuBloc = (s: SorteDeBloc) => BLOCS_PERSO.find((b) => b.sorte === s)!.nom;

// ── Relire une recette, d'où qu'elle vienne ───────────────────────────────

const objet = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {});
const liste = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const texte = (v: unknown, max = 200) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const entier = (v: unknown, min: number, max: number, defaut: number) => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : defaut;
};
const affichageLu = (v: unknown): Affichage => (v === "mot" || v === "picto" || v === "les-deux" ? v : "les-deux");

/** Un élément : un mot seul (« chat »), ou un mot avec son picto ou sa photo. */
export function elementSur(v: unknown): PictoPose | null {
  if (typeof v === "string") return texte(v, 60) ? { id: null, mot: texte(v, 60) } : null;
  const o = objet(v);
  const mot = texte(o.mot, 60);
  const id = typeof o.id === "number" && Number.isFinite(o.id) ? Math.round(o.id) : null;
  // Une photo : un nom de fichier de l'application, sans chemin.
  const photo = typeof o.photo === "string" && /^[\w.-]{1,120}$/.test(o.photo) && !o.photo.includes("..") ? o.photo : undefined;
  if (!mot && id === null && !photo) return null;
  return photo ? { id, mot, photo } : { id, mot };
}
const elements = (v: unknown, max = 40) => liste(v).map(elementSur).filter((e): e is PictoPose => !!e).slice(0, max);

/** Un emoji, pour la carte ; ✨ sinon. */
const iconeLue = (v: unknown) => (typeof v === "string" && v.trim().length <= 8 && /\p{Extended_Pictographic}/u.test(v) ? v.trim() : "✨");

/** Combien une feuille en montre, au moins et au plus, selon l'exercice. */
export const BORNES_COMBIEN: Record<SorteAvecCombien, [number, number]> = {
  relier: [2, 8], trier: [2, 12], completer: [1, 10], compter: [1, 9], entourer: [4, 25], questions: [1, 10], etiquettes: [1, 24],
  associer: [2, 12], choisir: [1, 8],
};
const combienLu = (sorte: keyof typeof BORNES_COMBIEN, v: unknown, defaut: number) => entier(v, BORNES_COMBIEN[sorte][0], BORNES_COMBIEN[sorte][1], defaut);

const VIDE: PictoPose = { id: null, mot: "" };
const plein = (e: PictoPose) => Boolean(e.mot || e.id !== null || e.photo);
const aUneImage = (e: PictoPose) => e.id !== null || Boolean(e.photo);

/** Une question et ses choix : la bonne réponse en est, quand il y en a ; un seul choix n'en est pas un, la question reste ouverte. */
function avecLaReponse(q: QuestionPerso): QuestionPerso {
  const choix = q.choix.length && q.reponse && !q.choix.includes(q.reponse) ? [q.reponse, ...q.choix].slice(0, 4) : q.choix;
  return { ...q, choix: choix.length >= 2 ? choix : [] };
}

/**
 * Un bloc de la recette, lisible et dans ses bornes ; rien quand ce n'en est
 * pas un. Il se garde même incomplet — une seule paire, une question sans
 * réponse : l'enseignant est en train de l'écrire ; il ne va sur la feuille
 * que complet (voir `blocPret`).
 */
export function blocSur(v: unknown): BlocPerso | null {
  const o = objet(v);
  const defaut = BLOCS_PERSO.find((b) => b.sorte === o.sorte);
  if (!defaut) return null;
  const consigne = texte(o.consigne, 240) || defaut.consigne;
  switch (defaut.sorte) {
    case "relier": {
      const paires = liste(o.paires).map(liste).filter((p) => p.length >= 2)
        .map((p) => [elementSur(p[0]) ?? VIDE, elementSur(p[1]) ?? VIDE] as [PictoPose, PictoPose]).filter(([x, y]) => plein(x) || plein(y)).slice(0, 30);
      return { sorte: "relier", consigne, paires, combien: combienLu("relier", o.combien, 6), affichage: affichageLu(o.affichage) };
    }
    case "trier": {
      const categories = liste(o.categories).map((c) => ({ nom: texte(objet(c).nom, 40), elements: elements(objet(c).elements, 20) }))
        .filter((c) => c.nom || c.elements.length).slice(0, 4);
      return { sorte: "trier", consigne, categories, combien: combienLu("trier", o.combien, 8), affichage: affichageLu(o.affichage) };
    }
    case "completer": {
      const phrases = liste(o.phrases).map((p) => texte(p, 200)).filter(Boolean).slice(0, 30);
      return { sorte: "completer", consigne, phrases, combien: combienLu("completer", o.combien, 6), banque: o.banque !== false };
    }
    case "compter": {
      const min = entier(o.min, 1, 20, 1);
      return { sorte: "compter", consigne, elements: elements(o.elements), min, max: Math.max(min, entier(o.max, 1, 20, 10)), combien: combienLu("compter", o.combien, 6) };
    }
    case "entourer":
      return { sorte: "entourer", consigne, cibles: elements(o.cibles), autres: elements(o.autres), combien: combienLu("entourer", o.combien, 15), affichage: affichageLu(o.affichage) };
    case "questions": {
      const questions = liste(o.questions).map((q) => {
        const x = objet(q);
        return avecLaReponse({ question: texte(x.question, 240), reponse: texte(x.reponse, 120), choix: liste(x.choix).map((c) => texte(c, 80)).filter(Boolean).slice(0, 4) });
      }).filter((q) => q.question || q.reponse).slice(0, 30);
      return { sorte: "questions", consigne, questions, combien: combienLu("questions", o.combien, 5) };
    }
    case "etiquettes":
      return { sorte: "etiquettes", consigne, elements: elements(o.elements), combien: combienLu("etiquettes", o.combien, 12), affichage: affichageLu(o.affichage) };
    case "planche": {
      const objets = liste(o.objets).map((x) => {
        const p = objet(x);
        const element = elementSur(p.element ?? p);
        return element ? { element, x: entier(p.x, 0, 100, 50), y: entier(p.y, 0, 100, 50), taille: entier(p.taille, 8, 60, 24) } : null;
      }).filter((p): p is ObjetPlace => !!p).slice(0, 30);
      return { sorte: "planche", consigne, objets, hauteur: entier(o.hauteur, 40, 230, 120), legendes: o.legendes !== false };
    }
    case "associer":
      return { sorte: "associer", consigne, elements: elements(o.elements), combien: combienLu("associer", o.combien, 6) };
    case "ordre": {
      const decouper = o.decouper === true;
      return {
        sorte: "ordre", consigne: texte(o.consigne, 240) || (decouper ? CONSIGNE_ORDRE_A_DECOUPER : defaut.consigne),
        etapes: elements(o.etapes, 8), affichage: affichageLu(o.affichage), decouper,
      };
    }
    case "choisir": {
      const items = liste(o.items).map((x) => {
        const it = objet(x);
        return { question: texte(it.question, 240), bonne: elementSur(it.bonne) ?? VIDE, autres: elements(it.autres, 3) };
      }).filter((it) => it.question || plein(it.bonne) || it.autres.length).slice(0, 30);
      return { sorte: "choisir", consigne, items, combien: combienLu("choisir", o.combien, 5), affichage: affichageLu(o.affichage) };
    }
  }
}

/**
 * Le bloc tel qu'il va sur la feuille, sans ce qui est encore incomplet ; ou
 * ce qui lui manque pour y aller. `images` faux : la recette que l'IA vient
 * d'écrire, dont les mots n'ont pas encore cherché leur image.
 */
export function blocPret(b: BlocPerso, images = true): BlocPerso | string {
  switch (b.sorte) {
    case "relier": {
      const paires = b.paires.filter(([x, y]) => plein(x) && plein(y));
      return paires.length >= 2 ? { ...b, paires } : "il faut au moins deux paires complètes.";
    }
    case "trier": {
      const categories = b.categories.filter((c) => c.nom && c.elements.length);
      return categories.length >= 2 ? { ...b, categories } : "il faut au moins deux colonnes, chacune avec son nom et une image.";
    }
    case "completer": {
      const phrases = b.phrases.filter((p) => /\[[^\]]+\]/.test(p));
      return phrases.length ? { ...b, phrases } : "il faut une phrase, avec le mot à trouver entre crochets.";
    }
    case "compter": return b.elements.length ? b : "il faut une image à compter.";
    case "entourer": return b.cibles.length && b.autres.length ? b : "il faut une image à entourer, et une autre.";
    case "questions": {
      const questions = b.questions.filter((q) => q.question && q.reponse).map(avecLaReponse);
      return questions.length ? { ...b, questions } : "il faut une question et sa réponse.";
    }
    case "etiquettes": return b.elements.length ? b : "il faut une étiquette.";
    case "planche": return b.objets.length ? b : "il faut une image.";
    case "associer": {
      const elements = b.elements.filter(images ? aUneImage : plein);
      return elements.length >= 2 ? { ...b, elements } : "il faut au moins deux mots, chacun avec son image.";
    }
    case "ordre": {
      const etapes = b.etapes.filter(plein);
      return etapes.length >= 2 ? { ...b, etapes } : "il faut au moins deux étapes.";
    }
    case "choisir": {
      const items = b.items.map((it) => ({ ...it, autres: it.autres.filter(plein) })).filter((it) => it.question && plein(it.bonne) && it.autres.length);
      return items.length ? { ...b, items } : "il faut une question, sa bonne image et une autre.";
    }
  }
}

/** Ce qui manque à un bloc pour aller sur la feuille ; rien s'il est complet. */
export const ceQuiManque = (b: BlocPerso): string | null => { const r = blocPret(b); return typeof r === "string" ? r : null; };
/** Les blocs qui vont sur la feuille, prêts. */
const blocsPrets = (g: GenerateurPerso, images = true): BlocPerso[] =>
  g.blocs.map((b) => blocPret(b, images)).filter((b): b is BlocPerso => typeof b !== "string");

/** Un générateur lisible, quoi qu'on ait gardé ou que l'IA ait répondu. */
export function generateurSur(v: unknown): GenerateurPerso {
  const o = objet(v);
  const classe = CLASSES_PERSO.find((c) => c === o.classe) ?? "";
  return {
    id: texte(o.id, 64),
    nom: texte(o.nom, 80) || "Mon générateur",
    icone: iconeLue(o.icone),
    quoi: texte(o.quoi, 300),
    classe,
    moment: estUnUsage(o.moment) ? o.moment : "entrainement",
    demande: texte(o.demande, 2000),
    blocs: liste(o.blocs).map(blocSur).filter((b): b is BlocPerso => !!b).slice(0, 6),
    cree: texte(o.cree, 40),
    modifie: texte(o.modifie, 40),
  };
}

/** Un bloc vide, pour l'ajouter à la main : de quoi commencer, à compléter. */
export function blocVide(sorte: SorteDeBloc): BlocPerso {
  const consigne = BLOCS_PERSO.find((b) => b.sorte === sorte)!.consigne;
  const e = (mot: string): PictoPose => ({ id: null, mot });
  switch (sorte) {
    case "relier": return { sorte, consigne, paires: [[e("chat"), e("chaton")], [e("chien"), e("chiot")]], combien: 6, affichage: "les-deux" };
    case "trier": return { sorte, consigne, categories: [{ nom: "Première colonne", elements: [e("pomme")] }, { nom: "Deuxième colonne", elements: [e("carotte")] }], combien: 8, affichage: "les-deux" };
    case "completer": return { sorte, consigne, phrases: ["Le [chat] dort sur le lit."], combien: 6, banque: true };
    case "compter": return { sorte, consigne, elements: [e("pomme")], min: 1, max: 10, combien: 6 };
    case "entourer": return { sorte, consigne, cibles: [e("chat")], autres: [e("pomme")], combien: 15, affichage: "les-deux" };
    case "questions": return { sorte, consigne, questions: [{ question: "Quel animal miaule ?", reponse: "le chat", choix: ["le chat", "le chien"] }], combien: 5 };
    case "etiquettes": return { sorte, consigne, elements: [e("chat")], combien: 12, affichage: "les-deux" };
    case "planche": return { sorte, consigne, objets: [{ element: e("chat"), x: 30, y: 50, taille: 26 }, { element: e("chien"), x: 70, y: 50, taille: 26 }], hauteur: 120, legendes: true };
    case "associer": return { sorte, consigne, elements: [e("chat"), e("chien"), e("vache"), e("poule")], combien: 4 };
    case "ordre": return { sorte, consigne, etapes: [e("graine"), e("plante"), e("fleur")], affichage: "les-deux", decouper: false };
    case "choisir": return { sorte, consigne, items: [{ question: "Qui pond des œufs ?", bonne: e("poule"), autres: [e("chat"), e("chien")] }], combien: 5, affichage: "les-deux" };
  }
}

// ── L'exemple ─────────────────────────────────────────────────────────────

/**
 * Le générateur d'exemple : ce que donne une recette avant qu'on ait rien
 * demandé (voir exemplesDesAteliers.ts). Il se prend sans l'IA.
 */
export const EXEMPLE_DE_GENERATEUR = {
  nom: "Les animaux de la ferme", icone: "🐣", quoi: "Relier chaque animal à son petit, compter, cocher la bonne image.", classe: "GS", moment: "entrainement",
  blocs: [
    { sorte: "relier", consigne: "Je relie chaque animal à son petit.", paires: [["chat", "chaton"], ["vache", "veau"], ["poule", "poussin"], ["chien", "chiot"], ["cheval", "poulain"], ["mouton", "agneau"]], combien: 4, affichage: "les-deux" },
    { sorte: "compter", consigne: "Je compte les animaux. J'écris combien il y en a.", elements: ["poule", "canard", "lapin"], min: 2, max: 8, combien: 3 },
    { sorte: "choisir", consigne: "Je coche la bonne image.", items: [
      { question: "Qui pond des œufs ?", bonne: "poule", autres: ["chat", "chien"] },
      { question: "Qui donne du lait ?", bonne: "vache", autres: ["cheval", "lapin"] }], combien: 2, affichage: "les-deux" },
  ],
};

// ── Les générateurs gardés ────────────────────────────────────────────────

/** Le réglage qui les garde, partagé entre les ordinateurs de l'enseignant. */
export const CLE_GENERATEURS = "generateurs:perso";
/** Un générateur parmi les ateliers — rattaché à une compétence, proposé à une séquence — : « perso: » et son numéro. */
export const PREFIXE_GENERATEUR = "perso:";
export const EVT_GENERATEURS = "maitrize:generateurs-perso";

export function lireGenerateurs(brut: string | null | undefined): GenerateurPerso[] {
  try {
    return liste(JSON.parse(brut ?? "[]")).map(generateurSur).filter((g) => g.id);
  } catch {
    return [];
  }
}

// ── Les éléments, sur la feuille ──────────────────────────────────────────

const esc = escapeHtml;

/** Un élément : son picto ou sa photo, son mot, selon l'affichage ; le mot seul quand l'image manque. */
function el(e: PictoPose, aff: Affichage, images: Images, taille = 16): string {
  const cle = cleImage(e);
  const src = cle !== null ? images[cle] : "";
  const img = aff !== "mot" && src ? `<img src="${src}" alt="" style="width:${taille}mm;height:${taille}mm">` : "";
  const mot = aff !== "picto" || !img ? `<span class="gp-mot">${esc(e.mot)}</span>` : "";
  return `<span class="gp-el">${img}${mot}</span>`;
}

/** L'image seule d'un élément, sans son mot — c'est lui qu'on cherche — ; une case vide si elle manque. */
function imageSeule(e: PictoPose, images: Images, taille: number): string {
  const cle = cleImage(e);
  const src = cle !== null ? images[cle] : "";
  const carre = `width:${taille}mm;height:${taille}mm`;
  return src ? `<img src="${src}" alt="" style="${carre}">` : `<span class="gp-image-manque" style="${carre}"></span>`;
}

/** `combien` éléments de la liste, différents tant qu'il y en a assez, puis repris. */
function tirer<T>(alea: () => number, l: readonly T[], combien: number): T[] {
  const sortie: T[] = [];
  while (l.length && sortie.length < combien) sortie.push(...melanger(alea, l).slice(0, combien - sortie.length));
  return sortie;
}
const entre = (alea: () => number, a: number, b: number) => a + Math.floor(alea() * (b - a + 1));

/** Des places au hasard, en millimètres, sans qu'une image en cache une autre. */
function disperser(alea: () => number, n: number, l: number, h: number, taille: number): [number, number][] {
  const ecart = taille * 1.15;
  for (let essai = 0; essai < 30; essai++) {
    const pts: [number, number][] = [];
    for (let k = 0; k < 400 && pts.length < n; k++) {
      const p: [number, number] = [alea() * (l - taille), alea() * (h - taille)];
      if (pts.every((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) >= ecart)) pts.push(p);
    }
    if (pts.length === n) return pts;
  }
  const cols = Math.ceil(Math.sqrt(n));
  return Array.from({ length: n }, (_, i) => [(i % cols) * (l - taille) / Math.max(1, cols - 1), Math.floor(i / cols) * taille * 1.1]);
}

// ── Les blocs, tirés puis dessinés ────────────────────────────────────────

/** Un bloc tiré au sort : ce que la feuille montre, et ce que le corrigé dit. */
type Tirage = { bloc: BlocPerso; dessin: (corr: boolean, images: Images) => string; corrige: boolean };

const BLANC = '<span class="gp-blanc"></span>';

function tirerLeBloc(b: BlocPerso, alea: () => number): Tirage {
  switch (b.sorte) {
    case "relier": {
      const paires = tirer(alea, b.paires, Math.min(b.combien, b.paires.length));
      const droite = melanger(alea, paires.map((p) => p[1]));
      return {
        bloc: b, corrige: true,
        dessin: (corr, images) => `<div class="gp-relier">${paires.map(([g, d], i) => `<div class="gp-relier-g">${el(g, b.affichage, images, 14)}<span class="gp-point"></span></div>`
          + `<div class="${corr ? "gp-relie" : ""}"></div><div class="gp-relier-d"><span class="gp-point"></span>${el(corr ? d : droite[i], b.affichage, images, 14)}</div>`).join("")}</div>`,
      };
    }
    case "trier": {
      // Autant de chaque colonne, à peu près ; puis mélangés.
      const parColonne = Math.ceil(b.combien / b.categories.length);
      const tires = b.categories.map((c) => ({ c, els: tirer(alea, c.elements, Math.min(parColonne, c.elements.length)) }));
      const etiquettes = melanger(alea, tires.flatMap((t) => t.els));
      // Les étiquettes collées tiennent à deux ou trois par ligne dans une colonne : la hauteur suit.
      const parLigne = Math.max(1, Math.floor(165 / tires.length / 32));
      const hauteur = Math.max(30, Math.ceil(Math.max(...tires.map((t) => t.els.length)) / parLigne) * 24 + 6);
      return {
        bloc: b, corrige: true,
        dessin: (corr, images) => (corr ? "" : `<div class="gp-etiquettes">${etiquettes.map((e) => `<div class="gp-etiquette">${el(e, b.affichage, images, 14)}</div>`).join("")}</div>`)
          + `<table class="gp-tri"><tr>${tires.map((t) => `<th>${esc(t.c.nom)}</th>`).join("")}</tr><tr>${tires.map((t) => `<td style="height:${hauteur}mm">`
            + (corr ? `<div class="gp-tri-rangees">${t.els.map((e) => el(e, b.affichage, images, 12)).join("")}</div>` : "") + "</td>").join("")}</tr></table>`,
      };
    }
    case "completer": {
      const phrases = tirer(alea, b.phrases, Math.min(b.combien, b.phrases.length));
      const mots = melanger(alea, phrases.flatMap((p) => [...p.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1])));
      return {
        bloc: b, corrige: true,
        dessin: (corr) => (b.banque && !corr ? `<div class="gp-banque">${mots.map((m) => `<span>${esc(m)}</span>`).join("")}</div>` : "")
          + `<ol class="gp-phrases">${phrases.map((p) => `<li>${esc(p).replace(/\[([^\]]+)\]/g, (_, m: string) => (corr ? `<b class="gp-rep">${m}</b>` : '<span class="gp-trou"></span>'))}</li>`).join("")}</ol>`,
      };
    }
    case "compter": {
      const cases = Array.from({ length: b.combien }, () => {
        const e = b.elements[Math.floor(alea() * b.elements.length)];
        const n = entre(alea, b.min, b.max);
        const taille = n > 12 ? 7 : 9;
        return { e, n, taille, places: disperser(alea, n, 50, 34, taille) };
      });
      return {
        bloc: b, corrige: true,
        dessin: (corr, images) => `<div class="gp-comptes">${cases.map((c) => {
          const cle = cleImage(c.e);
          const src = cle !== null ? images[cle] : "";
          const dessins = c.places.map(([x, y]) => (src ? `<img src="${src}" alt="" style="left:${x.toFixed(1)}mm;top:${y.toFixed(1)}mm;width:${c.taille}mm;height:${c.taille}mm">`
            : `<span class="gp-rond" style="left:${x.toFixed(1)}mm;top:${y.toFixed(1)}mm;width:${c.taille}mm;height:${c.taille}mm"></span>`)).join("");
          return `<div class="gp-compte"><div class="gp-compte-mot">${esc(c.e.mot)}</div><div class="gp-boite">${dessins}</div>`
            + `<div class="gp-ligne">Il y en a ${corr ? `<b class="gp-rep">${c.n}</b>` : BLANC}.</div></div>`;
        }).join("")}</div>`,
      };
    }
    case "entourer": {
      const k = Math.max(1, Math.round(b.combien * 0.4));
      const cases = melanger(alea, [...tirer(alea, b.cibles, k).map((e) => ({ e, cible: true })), ...tirer(alea, b.autres, b.combien - k).map((e) => ({ e, cible: false }))]);
      return {
        bloc: b, corrige: true,
        dessin: (corr, images) => `<div class="gp-grille">${cases.map((c) => `<div class="gp-case${corr && c.cible ? " gp-entoure" : ""}">${el(c.e, b.affichage, images, 16)}</div>`).join("")}</div>`,
      };
    }
    case "questions": {
      const questions = tirer(alea, b.questions, Math.min(b.combien, b.questions.length)).map((q) => ({ ...q, choix: melanger(alea, q.choix) }));
      return {
        bloc: b, corrige: true,
        dessin: (corr) => `<ol class="gp-questions">${questions.map((q) => `<li>${esc(q.question)}`
          + (q.choix.length
            ? `<div class="gp-choix">${q.choix.map((c) => `<span><span class="gp-case-a-cocher${corr && c === q.reponse ? " gp-coche" : ""}"></span>${esc(c)}</span>`).join("")}</div>`
            : `<div class="gp-reponse">${corr ? `<b class="gp-rep">${esc(q.reponse)}</b>` : ""}</div>`) + "</li>").join("")}</ol>`,
      };
    }
    case "etiquettes": {
      const els = tirer(alea, b.elements, b.combien);
      return {
        bloc: b, corrige: false,
        dessin: (_corr, images) => `<div class="gp-cartes">${els.map((e) => `<div class="gp-carte">${el(e, b.affichage, images, 26)}</div>`).join("")}</div>`,
      };
    }
    case "planche":
      return {
        bloc: b, corrige: b.legendes,
        dessin: (corr, images) => `<div class="gp-planche" style="height:${b.hauteur}mm">${b.objets.map((o) => {
          const cle = cleImage(o.element);
          const src = cle !== null ? images[cle] : "";
          const carre = `width:${o.taille}mm;height:${o.taille}mm`;
          const image = src ? `<img src="${src}" alt="" style="${carre}">` : `<span class="gp-sans-image" style="${carre}">${esc(o.element.mot)}</span>`;
          const legende = b.legendes ? `<span class="gp-legende">${corr ? `<b class="gp-rep">${esc(o.element.mot)}</b>` : ""}</span>` : "";
          // L'image reste dans son cadre, sa légende comprise : le centre ne va pas plus près du bord que la moitié de l'image.
          // Placée sans transform : à l'impression, la page se coupe d'après la place d'avant le transform, et la légende passait à la page suivante.
          const [x, y] = placeDansLaPlanche(o, b);
          const l = largeurSurLaPlanche(o, b);
          return `<div class="gp-objet" style="left:calc(${x}% - ${l / 2}mm);top:calc(${y}% - ${o.taille / 2}mm);width:${l}mm">${image}${legende}</div>`;
        }).join("")}</div>`,
      };
    case "associer": {
      const els = tirer(alea, b.elements, Math.min(b.combien, b.elements.length));
      const mots = melanger(alea, els.map((e) => e.mot));
      return {
        bloc: b, corrige: true,
        dessin: (corr, images) => `<div class="gp-associer">${els.map((e) => `<div class="gp-associer-case">${imageSeule(e, images, 22)}`
          + `<div class="gp-associer-boite">${corr ? `<b class="gp-rep">${esc(e.mot)}</b>` : ""}</div></div>`).join("")}</div>`
          + (corr ? "" : `<div class="gp-a-couper">${mots.map((m) => `<div class="gp-mot-a-couper">${esc(m)}</div>`).join("")}</div>`),
      };
    }
    case "ordre": {
      let ordre = melanger(alea, b.etapes.map((_, i) => i));
      // Jamais déjà rangées.
      if (ordre.every((v, i) => v === i)) ordre = [...ordre.slice(1), ordre[0]];
      const image = (e: PictoPose, images: Images) => el(e, b.affichage, images, 22);
      return {
        bloc: b, corrige: true,
        dessin: (corr, images) => (b.decouper
          ? `<div class="gp-ordre-places">${b.etapes.map((e, k) => `<div class="gp-ordre-place"><span class="gp-ordre-rang">${k + 1}</span>${corr ? image(e, images) : ""}</div>`).join("")}</div>`
            + (corr ? "" : `<div class="gp-a-couper">${ordre.map((i) => `<div class="gp-ordre-image">${image(b.etapes[i], images)}</div>`).join("")}</div>`)
          : `<div class="gp-ordre">${ordre.map((i) => `<div class="gp-ordre-case">${image(b.etapes[i], images)}`
            + `<div class="gp-ordre-numero">${corr ? `<b class="gp-rep">${i + 1}</b>` : ""}</div></div>`).join("")}</div>`),
      };
    }
    case "choisir": {
      const items = tirer(alea, b.items, Math.min(b.combien, b.items.length)).map((it) => ({
        question: it.question,
        options: melanger(alea, [{ e: it.bonne, bonne: true }, ...it.autres.map((e) => ({ e, bonne: false }))]),
      }));
      return {
        bloc: b, corrige: true,
        // Deux questions par ligne ; chacune en bloc en ligne, que WebKit ne coupe jamais entre deux pages.
        dessin: (corr, images) => `<div class="gp-choisir">${items.map((it, k) => `<div class="gp-choisir-item"><div class="gp-choisir-question"><b>${k + 1}.</b> ${esc(it.question)}</div>`
          + `<div class="gp-choisir-options">${it.options.map((o) => `<div class="gp-choisir-option${corr && o.bonne ? " gp-bonne" : ""}">${el(o.e, b.affichage, images, 16)}`
            + `<span class="gp-case-a-cocher${corr && o.bonne ? " gp-coche" : ""}"></span></div>`).join("")}</div></div>`).join("")}</div>`,
      };
    }
  }
}

/** La largeur d'une planche sur la feuille, en millimètres : celle de la page. */
export const LARGEUR_PLANCHE = 165;

/** La ligne où l'on écrit le nom d'une image : sa largeur au moins, en millimètres. */
const LEGENDE = 22;
/** La largeur d'une image de la planche avec sa légende, en millimètres. */
export const largeurSurLaPlanche = (o: ObjetPlace, b: Pick<BlocPlanche, "legendes">) => Math.max(o.taille, b.legendes ? LEGENDE : 0);

/** Le centre d'une image de la planche, en pourcentage, ramené pour que l'image et sa légende restent dans le cadre. */
export function placeDansLaPlanche(o: ObjetPlace, b: Pick<BlocPlanche, "hauteur" | "legendes">): [number, number] {
  const demiL = (largeurSurLaPlanche(o, b) / 2 + 1) / LARGEUR_PLANCHE * 100;
  const haut = (o.taille / 2 + 1) / b.hauteur * 100, bas = (o.taille / 2 + (b.legendes ? 8 : 1)) / b.hauteur * 100;
  const borne = (v: number, a: number, z: number) => Math.round(Math.max(a, Math.min(Math.max(a, z), v)) * 10) / 10;
  return [borne(o.x, demiL, 100 - demiL), borne(o.y, haut, 100 - bas)];
}

/** Les images dont la feuille a besoin : les pictos et les photos de la recette. */
export function imagesDeLaRecette(g: GenerateurPerso): (number | string)[] {
  const cles = new Set<number | string>();
  for (const b of g.blocs) for (const e of elementsDu(b)) { const c = cleImage(e); if (c !== null) cles.add(c); }
  return [...cles];
}

/**
 * La feuille d'un générateur de l'enseignant, et son corrigé quand un de ses
 * blocs en a un. `images` : les pictos et les photos, déjà chargés.
 */
export function htmlGenerateurPerso(brut: GenerateurPerso, graine: number, images: Images = {}): string {
  const lu = generateurSur(brut);
  const g = { ...lu, blocs: blocsPrets(lu) };
  const alea = hasard(graine);
  const tirages = g.blocs.map((b) => tirerLeBloc(b, alea));
  const titre = esc(g.nom);
  const plusieurs = tirages.length > 1;
  const corps = (corr: boolean) => tirages.map((t, i) => (plusieurs
    ? `<div class="gp-exo"><div class="gp-consigne"><b>${i + 1}.</b> ${esc(t.bloc.consigne)}</div>${t.dessin(corr, images)}</div>`
    : `<div class="gp-exo">${t.dessin(corr, images)}</div>`)).join("");
  const consigne = plusieurs ? "Je fais les exercices dans l'ordre." : tirages.length ? esc(tirages[0].bloc.consigne) : "";
  const entete = `<div class="titre">${titre}</div>
  <div class="sous">Prénom : ........................................ Date : ........................</div>
  ${consigne ? `<div class="regle">${consigne}</div>` : ""}`;
  const pages = `<div class="page">${entete}${tirages.length ? corps(false) : '<p class="gp-vide">Ce générateur n\'a pas encore d\'exercice complet.</p>'}</div>`
    + (tirages.some((t) => t.corrige) ? `<div class="page corrige"><div class="titre">${titre} — corrigé</div>${corps(true)}</div>` : "");
  const pictos = imagesDeLaRecette(g).filter((c): c is number => typeof c === "number");
  return feuille(pages + attributionPour(pictos), "gp");
}

// ── Ce qu'on demande à l'IA ───────────────────────────────────────────────

/**
 * Ce que l'IA doit savoir : la forme de la recette, les blocs, et les règles
 * de la classe — des mots simples qui ont un picto, des consignes à la
 * première personne, assez d'éléments pour tirer au sort.
 */
export const CONSIGNE_DE_L_IA = `Tu aides un enseignant d'école primaire française (de la maternelle au CM2, avec des élèves parfois non lecteurs, dys ou à besoins particuliers) à fabriquer un générateur de feuilles d'exercices. Tu ne réponds QUE par un objet JSON, sans aucun texte autour, de cette forme :
{"nom": "titre court de la feuille", "icone": "un seul emoji", "quoi": "ce que fabrique le générateur, en une phrase", "classe": "PS|MS|GS|CP|CE1|CE2|CM1|CM2", "moment": "manipulation|entrainement|reinvestissement|rituel", "blocs": [ ...1 à 4 blocs... ]}

Les blocs possibles, avec leur forme exacte :
- relier : {"sorte": "relier", "consigne": "Je relie chaque animal à son petit.", "paires": [["chat", "chaton"], ["vache", "veau"]], "combien": 6, "affichage": "les-deux"}
- trier : {"sorte": "trier", "consigne": "Je découpe les étiquettes. Je colle chacune dans la bonne colonne.", "categories": [{"nom": "Fruits", "elements": ["pomme", "poire"]}, {"nom": "Légumes", "elements": ["carotte", "poireau"]}], "combien": 8, "affichage": "les-deux"}
- completer : {"sorte": "completer", "consigne": "J'écris le mot qui manque.", "phrases": ["Le [chat] boit du lait."], "combien": 6, "banque": true}
- compter : {"sorte": "compter", "consigne": "Je compte les images. J'écris combien il y en a.", "elements": ["pomme", "ballon"], "min": 1, "max": 10, "combien": 6}
- entourer : {"sorte": "entourer", "consigne": "J'entoure les animaux qui volent.", "cibles": ["oiseau", "papillon"], "autres": ["chien", "poisson"], "combien": 15, "affichage": "les-deux"}
- questions : {"sorte": "questions", "consigne": "Je réponds aux questions.", "questions": [{"question": "Quel animal donne du lait ?", "reponse": "la vache", "choix": ["la vache", "le chat", "la poule"]}], "combien": 5}
- etiquettes : {"sorte": "etiquettes", "consigne": "Je découpe les étiquettes.", "elements": ["chat", "chien"], "combien": 12, "affichage": "les-deux"}
- planche : {"sorte": "planche", "consigne": "J'écris le nom de chaque image.", "objets": [{"element": "soleil", "x": 20, "y": 25, "taille": 26}], "hauteur": 120, "legendes": true}
- associer (coller chaque mot sous son image) : {"sorte": "associer", "consigne": "Je découpe les mots. Je colle chaque mot sous son image.", "elements": ["chat", "vache", "poule"], "combien": 6}
- ordre (remettre des images dans l'ordre : une histoire, une recette, une routine, une croissance) : {"sorte": "ordre", "consigne": "J'écris le numéro de chaque image, dans l'ordre.", "etapes": ["graine", "plante", "fleur"], "decouper": false, "affichage": "les-deux"}
- choisir (cocher la bonne image) : {"sorte": "choisir", "consigne": "Je coche la bonne image.", "items": [{"question": "Qui pond des œufs ?", "bonne": "poule", "autres": ["chat", "chien"]}], "combien": 5, "affichage": "les-deux"}

Règles :
- Les éléments sont des mots simples, au singulier, sans article (« chat », pas « le chat » ni « chats ») : chacun recevra le pictogramme qui porte ce nom.
- Donne nettement plus d'éléments que « combien », pour que chaque feuille soit différente : 8 à 16 paires, 6 à 10 éléments par colonne, 8 à 12 phrases, 6 à 10 questions.
- « ordre » : les étapes dans le bon ordre, de 3 à 8 ; « decouper » vaut true pour découper et coller. « choisir » : 2 ou 3 « autres » par question.
- Pour des élèves qui ne lisent pas, préfère relier, trier, compter, entourer, associer, ordre, choisir et étiquettes, avec « affichage » à « picto » ou « les-deux ».
- « combien » : ce qu'une feuille en montre ; adapte-le à l'âge (moins pour la maternelle).
- Les consignes commencent par « Je » ou « J' » suivi d'un verbe, en phrases courtes ; une action par phrase.
- « affichage » vaut « mot », « picto » ou « les-deux » : « picto » ou « les-deux » pour des élèves qui ne lisent pas.
- Dans « planche », x et y sont en pourcentage du cadre (de 5 à 95), « taille » en millimètres (de 15 à 40), « hauteur » en millimètres (de 60 à 200).
- Jamais de prénom d'élève ni de personne réelle ; jamais de texte d'un livre ou d'un auteur protégé.
- Des mots et des phrases du niveau de la classe, en bon français.`;

/** Le message de l'enseignant pour l'IA : sa classe, et ce qu'il veut. */
export const demandeALIA = (demande: string, classe: string) =>
  `Classe : ${classe || "non précisée"}.\nCe que veut l'enseignant : ${demande.trim()}`;

// ── Les questions de l'IA, avant la recette ──────────────────────────────
//
// Une demande trop courte donne une feuille à côté (« des animaux » : pour
// lire, compter, trier ?). Avant d'écrire la recette, l'IA dit si elle en
// sait assez ; sinon elle pose la question qui manque le plus, avec des
// réponses à toucher — une à la fois, quatre au plus (demande de
// l'enseignant, octobre 2026).

/** Une question de l'IA, et ce que l'enseignant a répondu ; vide : il l'a passée. */
export interface Echange { question: string; reponse: string }

/** La question que l'IA pose, et les réponses qu'elle propose. */
export interface QuestionDeLIA { question: string; choix: string[] }

/** Au plus tant de questions : au-delà, la recette s'écrit avec ce qu'on sait. */
export const QUESTIONS_MAX = 4;

export const CONSIGNE_DES_QUESTIONS = `Tu aides un enseignant d'école primaire française (de la maternelle au CM2, avec des élèves parfois non lecteurs, dys ou à besoins particuliers) à préparer un générateur de feuilles d'exercices : relier, trier en colonnes, compléter des phrases, compter, entourer, répondre à des questions, des étiquettes, une planche d'images, coller le mot sous l'image, remettre dans l'ordre, cocher la bonne image. Avant de l'écrire, tu vérifies que tu en sais assez pour une feuille juste et utile. Tu ne réponds QUE par un objet JSON, sans aucun texte autour, de l'une de ces deux formes :
{"pret": true}
{"pret": false, "question": "une seule question, courte", "choix": ["de 2 à 4 réponses courtes"]}

Ce qu'il faut savoir, par ordre d'importance :
1. ce que les élèves travaillent : la notion ou la compétence, ou le thème et ses mots ;
2. s'ils lisent : non lecteurs, lecteurs débutants ou lecteurs (la maternelle ne lit pas : ne le demande pas) ;
3. la forme de l'exercice, si l'enseignant en a une en tête ;
4. la difficulté : combien d'éléments, jusqu'à quel nombre, quels sons…
Règles :
- Une seule question à la fois, sur ce qui manque le plus ; jamais sur ce que l'enseignant a déjà dit ou précisé.
- Les choix sont des réponses concrètes, adaptées à la classe et au thème, qu'on n'a qu'à toucher.
- Dès que tu en sais assez, réponds {"pret": true} : une demande claire n'appelle aucune question.
- Vouvoie l'enseignant. Jamais de prénom d'élève.`;

/** Le message pour l'IA qui questionne : la classe, la demande, et ce qui s'est déjà dit. */
export function questionsALIA(demande: string, classe: string, echanges: Echange[]): string {
  const deja = echanges.map((e) => `- ${e.question} → ${e.reponse.trim() || "(pas de préférence)"}`).join("\n");
  return `${demandeALIA(demande, classe)}${deja ? `\nDéjà précisé :\n${deja}` : ""}\nQuestions déjà posées : ${echanges.length}, ${QUESTIONS_MAX} au plus.`;
}

/** La question que l'IA a répondue ; rien quand elle en sait assez, ou que sa réponse ne se lit pas. */
export function lireQuestion(reponse: string): QuestionDeLIA | null {
  const debut = reponse.indexOf("{"), fin = reponse.lastIndexOf("}");
  if (debut < 0 || fin <= debut) return null;
  try {
    const o: unknown = JSON.parse(reponse.slice(debut, fin + 1));
    if (!o || typeof o !== "object") return null;
    const { pret, question, choix } = o as { pret?: unknown; question?: unknown; choix?: unknown };
    if (pret === true || typeof question !== "string" || !question.trim()) return null;
    const lus = Array.isArray(choix) ? choix.filter((c): c is string => typeof c === "string").map((c) => c.trim().slice(0, 80)).filter(Boolean) : [];
    return { question: question.trim().slice(0, 200), choix: [...new Set(lus)].slice(0, 4) };
  } catch {
    return null;
  }
}

/** Ce que l'enseignant veut, avec ce qu'il a précisé en répondant : c'est ce que la recette lira, et ce qu'on gardera. */
export function demandeAvecPrecisions(demande: string, echanges: Echange[]): string {
  const precisions = echanges.filter((e) => e.reponse.trim()).map((e) => `${e.question.trim()} ${e.reponse.trim()}`);
  return precisions.length ? `${demande.trim()}\nPrécisions : ${precisions.join(" ; ")}` : demande.trim();
}

/** La retouche d'une recette : la recette telle qu'elle est, en mots seulement, et ce que l'enseignant veut changer. */
export function retoucheALIA(g: GenerateurPerso, consigne: string): string {
  const recette = { nom: g.nom, icone: g.icone, quoi: g.quoi, classe: g.classe, moment: g.moment, blocs: g.blocs };
  // Chaque élément n'y est que son mot : l'IA ne connaît pas les numéros des pictos.
  const enMots = (_cle: string, v: unknown) => (v && typeof v === "object" && "mot" in v && "id" in v ? (v as PictoPose).mot : v);
  return `Voici la recette actuelle :\n${JSON.stringify(recette, enMots)}\n\nCe que l'enseignant veut changer : ${consigne.trim()}\nRéponds par la recette entière, modifiée, au même format JSON.`;
}

/** La recette que l'IA a répondue : le premier objet JSON de sa réponse, relu ; rien s'il n'y a pas d'exercice lisible. */
export function lireRecette(reponse: string): GenerateurPerso | null {
  const debut = reponse.indexOf("{"), fin = reponse.lastIndexOf("}");
  if (debut < 0 || fin <= debut) return null;
  try {
    const g = generateurSur(JSON.parse(reponse.slice(debut, fin + 1)));
    const blocs = blocsPrets(g, false);
    return blocs.length ? { ...g, blocs } : null;
  } catch {
    return null;
  }
}

const ARTICLES = /^(?:l'|l’|le |la |les |un |une |des |du |de la |de l'|de l’|de |d'|d’)/;

/**
 * Les autres écritures d'un mot que la banque connaît peut-être, quand elle
 * n'a pas le mot tel quel : sans article (« le chat »), au singulier
 * (« chevaux », « oiseaux », « choux »), « oeuf » ou « œuf ».
 */
export function variantesDuMot(brut: string): string[] {
  const mot = brut.trim().toLowerCase().replace(/\s+/g, " ");
  const sans = mot.replace(ARTICLES, "").trim();
  const sortie = new Set<string>([sans]);
  for (const m of [...sortie]) {
    if (m.length < 4 || m.includes(" ")) continue;
    if (m.endsWith("eaux") || m.endsWith("eux")) sortie.add(m.slice(0, -1));
    else if (m.endsWith("aux")) { sortie.add(`${m.slice(0, -3)}al`); sortie.add(m.slice(0, -1)); }
    else if (m.endsWith("s") || m.endsWith("x")) sortie.add(m.slice(0, -1));
  }
  for (const m of [...sortie]) {
    if (m.includes("oe")) sortie.add(m.replace(/oe/g, "œ"));
    if (m.includes("œ")) sortie.add(m.replace(/œ/g, "oe"));
  }
  sortie.delete(mot);
  sortie.delete("");
  return [...sortie];
}

/** Tous les mots de la recette qui n'ont encore ni picto ni photo : ceux qu'on cherche dans la banque. */
export function motsSansImage(g: GenerateurPerso): string[] {
  const mots = new Set<string>();
  for (const b of g.blocs) for (const e of elementsDu(b)) if (e.id === null && !e.photo && e.mot) mots.add(e.mot.toLowerCase());
  return [...mots];
}

/** Pose sur chaque élément sans image le picto trouvé pour son mot ; `garder` : les images d'une version d'avant, mot pour mot. */
export function poserLesPictos(g: GenerateurPerso, trouves: { id: number; mot: string }[], garder: GenerateurPerso | null = null): GenerateurPerso {
  const avant = new Map<string, PictoPose>();
  const noter = (e: PictoPose) => { if (e.mot && (e.id !== null || e.photo)) avant.set(e.mot.toLowerCase(), e); };
  if (garder) for (const b of garder.blocs) mapElements(b, (e) => { noter(e); return e; });
  const parMot = new Map(trouves.map((p) => [p.mot.toLowerCase(), p.id]));
  const poser = (e: PictoPose): PictoPose => {
    if (e.id !== null || e.photo || !e.mot) return e;
    const ancien = avant.get(e.mot.toLowerCase());
    if (ancien) return { ...ancien, mot: e.mot };
    const id = parMot.get(e.mot.toLowerCase());
    return id !== undefined ? { ...e, id } : e;
  };
  return { ...g, blocs: g.blocs.map((b) => mapElements(b, poser)) };
}

/** Les éléments d'un bloc, dans l'ordre. */
function elementsDu(b: BlocPerso): PictoPose[] {
  const sortie: PictoPose[] = [];
  mapElements(b, (e) => { sortie.push(e); return e; });
  return sortie;
}
const memeImage = (a: PictoPose, b: PictoPose) => a.id === b.id && (a.photo ?? "") === (b.photo ?? "");
const cleMot = (mot: string) => mot.trim().toLowerCase();

/**
 * Un mot, une image : celle qu'on donne à un mot va à chaque fois qu'il
 * revient dans la recette ; le mot aussi, si on l'a changé en la choisissant.
 */
export function poserPartout(g: GenerateurPerso, mot: string, image: PictoPose): GenerateurPerso {
  const cle = cleMot(mot);
  const poser = (e: PictoPose): PictoPose => {
    if (cleMot(e.mot) !== cle) return e;
    const nouveau = image.mot.trim() || e.mot;
    return image.photo ? { id: null, mot: nouveau, photo: image.photo } : { id: image.id, mot: nouveau };
  };
  return { ...g, blocs: g.blocs.map((b) => mapElements(b, poser)) };
}

/**
 * Les blocs après qu'on a changé l'image d'un élément sans changer son mot :
 * ses semblables, ailleurs dans la recette, prennent la même.
 */
export function memeImagePartout(blocs: BlocPerso[], avant: BlocPerso, apres: BlocPerso): BlocPerso[] {
  const a = elementsDu(avant), b = elementsDu(apres);
  if (a.length !== b.length) return blocs;
  const changes = b.filter((e, i) => cleMot(e.mot) && cleMot(e.mot) === cleMot(a[i].mot) && !memeImage(e, a[i]));
  if (!changes.length) return blocs;
  const parMot = new Map(changes.map((e) => [cleMot(e.mot), e]));
  return blocs.map((x) => mapElements(x, (e) => {
    const n = parMot.get(cleMot(e.mot));
    return n && !memeImage(e, n) ? (n.photo ? { id: null, mot: e.mot, photo: n.photo } : { id: n.id, mot: e.mot }) : e;
  }));
}

/** Le même bloc, chaque élément passé par `f`. */
export function mapElements(b: BlocPerso, f: (e: PictoPose) => PictoPose): BlocPerso {
  switch (b.sorte) {
    case "relier": return { ...b, paires: b.paires.map(([x, y]) => [f(x), f(y)] as [PictoPose, PictoPose]) };
    case "trier": return { ...b, categories: b.categories.map((c) => ({ ...c, elements: c.elements.map(f) })) };
    case "compter": case "etiquettes": case "associer": return { ...b, elements: b.elements.map(f) };
    case "entourer": return { ...b, cibles: b.cibles.map(f), autres: b.autres.map(f) };
    case "planche": return { ...b, objets: b.objets.map((o) => ({ ...o, element: f(o.element) })) };
    case "ordre": return { ...b, etapes: b.etapes.map(f) };
    case "choisir": return { ...b, items: b.items.map((it) => ({ ...it, bonne: f(it.bonne), autres: it.autres.map(f) })) };
    default: return b;
  }
}

export const STYLE_GENERATEURS_PERSO = `
  .feuille.gp .gp-exo { break-inside: avoid; page-break-inside: avoid; margin: 0 0 3mm; }
  .feuille.gp .gp-consigne { font-size: 13.5px; font-weight: 700; margin: 5mm 0 2mm; }
  .feuille.gp .gp-vide { color: #687087; font-size: 13px; }
  .feuille.gp .gp-el { display: inline-flex; flex-direction: column; align-items: center; gap: 1mm; }
  .feuille.gp img { margin: 0; max-height: none; }
  .feuille.gp .gp-el img { object-fit: contain; display: block; }
  .feuille.gp .gp-mot { font-size: 14px; font-weight: 700; text-align: center; line-height: 1.2; }
  .feuille.gp .gp-rep { color: #2f6fd1; }
  .feuille.gp .gp-blanc { display: inline-block; width: 16mm; height: 1.1em; border-bottom: 2px dotted #1c2233; vertical-align: baseline; }
  .feuille.gp .gp-ligne { font-size: 13px; margin: 1mm 0 0; }
  .feuille.gp .gp-relier { display: grid; grid-template-columns: max-content 34mm max-content; row-gap: 3mm; align-items: center; margin: 1mm 0 2mm 8mm; }
  .feuille.gp .gp-relier-g { justify-self: end; display: flex; align-items: center; gap: 2mm; }
  .feuille.gp .gp-relier-d { display: flex; align-items: center; gap: 2mm; }
  .feuille.gp .gp-point { display: inline-block; width: 2.4mm; height: 2.4mm; border-radius: 50%; background: #1c2233; flex: none; }
  .feuille.gp .gp-relie { border-top: 1.6px solid #2f6fd1; margin: 0 1mm; }
  .feuille.gp .gp-etiquettes { display: grid; grid-template-columns: repeat(auto-fill, minmax(30mm, 1fr)); margin: 0 0 4mm; }
  .feuille.gp .gp-etiquette { border: 1px dashed #9aa0b4; padding: 2mm; display: flex; align-items: center; justify-content: center; min-height: 22mm; }
  .feuille.gp table.gp-tri { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .feuille.gp .gp-tri th { border: 1.2px solid #1c2233; background: #f0f2f8; padding: 2mm; font-size: 14px; }
  .feuille.gp .gp-tri td { border: 1.2px solid #1c2233; vertical-align: top; padding: 2mm; }
  .feuille.gp .gp-tri-rangees { display: flex; flex-wrap: wrap; gap: 2mm 4mm; justify-content: center; }
  .feuille.gp .gp-banque { display: flex; flex-wrap: wrap; gap: 2mm 6mm; border: 1.2px solid #c4c9d6; border-radius: 3mm; padding: 2mm 3mm; margin: 0 0 3mm; font-size: 14px; font-weight: 700; }
  .feuille.gp .gp-phrases { font-size: 15px; line-height: 2.4; margin: 0; padding-left: 7mm; }
  .feuille.gp .gp-trou { display: inline-block; min-width: 26mm; border-bottom: 2px dotted #1c2233; height: 1.1em; vertical-align: baseline; }
  .feuille.gp .gp-comptes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; }
  .feuille.gp .gp-compte { border: 1.2px solid #c4c9d6; border-radius: 3mm; padding: 2mm; break-inside: avoid; page-break-inside: avoid; }
  .feuille.gp .gp-compte-mot { font-size: 12px; font-weight: 700; color: #687087; text-align: center; }
  .feuille.gp .gp-boite { position: relative; width: 50mm; height: 34mm; margin: 1mm auto; }
  .feuille.gp .gp-boite img, .feuille.gp .gp-boite .gp-rond { position: absolute; object-fit: contain; }
  .feuille.gp .gp-rond { border: 1.4px solid #1c2233; border-radius: 50%; }
  .feuille.gp .gp-grille { display: grid; grid-template-columns: repeat(5, 1fr); gap: 3mm; }
  .feuille.gp .gp-case { display: flex; justify-content: center; align-items: center; padding: 2mm; border: 2.4px solid transparent; border-radius: 50%; }
  .feuille.gp .gp-case.gp-entoure { border-color: #d64545; }
  .feuille.gp .gp-questions { margin: 0; padding-left: 7mm; font-size: 14px; line-height: 1.7; }
  .feuille.gp .gp-questions li { margin: 0 0 2mm; break-inside: avoid; page-break-inside: avoid; }
  .feuille.gp .gp-choix { display: flex; flex-wrap: wrap; gap: 2mm 8mm; margin: 1mm 0 0; }
  .feuille.gp .gp-case-a-cocher { display: inline-block; width: 4mm; height: 4mm; border: 1.4px solid #1c2233; margin-right: 1.5mm; vertical-align: -0.6mm; }
  .feuille.gp .gp-case-a-cocher.gp-coche { background: #2f6fd1; }
  .feuille.gp .gp-reponse { border-bottom: 2px dotted #1c2233; min-height: 7mm; }
  .feuille.gp .gp-cartes { display: grid; grid-template-columns: repeat(4, 1fr); }
  .feuille.gp .gp-carte { border: 1px dashed #9aa0b4; min-height: 38mm; display: flex; align-items: center; justify-content: center; padding: 2mm; break-inside: avoid; page-break-inside: avoid; }
  .feuille.gp .gp-planche { position: relative; width: ${LARGEUR_PLANCHE}mm; max-width: 100%; border: 1.2px solid #c4c9d6; border-radius: 3mm; }
  .feuille.gp .gp-objet { position: absolute; display: flex; flex-direction: column; align-items: center; gap: 1mm; }
  .feuille.gp .gp-objet img { object-fit: contain; display: block; }
  .feuille.gp .gp-image-manque { display: inline-block; border: 1.2px dashed #c4c9d6; border-radius: 2mm; }
  .feuille.gp .gp-associer { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm 3mm; margin: 1mm 0 4mm; }
  .feuille.gp .gp-associer-case { display: flex; flex-direction: column; align-items: center; gap: 2mm; }
  .feuille.gp .gp-associer-boite { width: 36mm; height: 12mm; border: 1.4px solid #1c2233; border-radius: 1.5mm; display: flex; align-items: center; justify-content: center; font-size: 15px; }
  .feuille.gp .gp-a-couper { display: flex; flex-wrap: wrap; justify-content: center; border-top: 1.2px dashed #9aa0b4; padding-top: 3mm; }
  .feuille.gp .gp-mot-a-couper { width: 34mm; height: 11mm; border: 1px dashed #9aa0b4; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 700; }
  .feuille.gp .gp-ordre { display: flex; flex-wrap: wrap; gap: 4mm; justify-content: center; margin: 1mm 0 3mm; }
  .feuille.gp .gp-ordre-case { display: flex; flex-direction: column; align-items: center; gap: 2mm; width: 36mm; }
  .feuille.gp .gp-ordre-numero { width: 11mm; height: 11mm; border: 1.6px solid #1c2233; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; }
  .feuille.gp .gp-ordre-places { display: flex; flex-wrap: wrap; gap: 3mm; justify-content: center; margin: 1mm 0 4mm; }
  .feuille.gp .gp-ordre-place { position: relative; width: 36mm; height: 36mm; border: 1.4px solid #1c2233; border-radius: 2mm; display: flex; align-items: center; justify-content: center; }
  .feuille.gp .gp-ordre-rang { position: absolute; top: 1mm; left: 1.5mm; font-size: 13px; font-weight: 700; color: #687087; }
  .feuille.gp .gp-ordre-image { width: 34mm; height: 34mm; border: 1px dashed #9aa0b4; display: flex; align-items: center; justify-content: center; }
  .feuille.gp .gp-choisir { font-size: 14px; }
  .feuille.gp .gp-choisir-item { display: inline-block; vertical-align: top; width: calc(50% - 4mm); margin: 0 3mm 4mm 0; }
  .feuille.gp .gp-choisir-question { font-weight: 700; margin: 0 0 1.5mm; }
  .feuille.gp .gp-choisir-options { display: flex; flex-wrap: wrap; gap: 2mm 3mm; }
  .feuille.gp .gp-choisir-option { display: flex; flex-direction: column; align-items: center; gap: 1.5mm; padding: 1mm 1.5mm; border: 2.4px solid transparent; border-radius: 3mm; }
  .feuille.gp .gp-choisir-option.gp-bonne { border-color: #d64545; }
  .feuille.gp .gp-sans-image { display: flex; align-items: center; justify-content: center; text-align: center; font-size: 14px; font-weight: 700; overflow-wrap: anywhere; }
  .feuille.gp .gp-legende { display: inline-flex; align-items: flex-end; justify-content: center; min-width: 22mm; height: 6mm; border-bottom: 2px dotted #1c2233; font-size: 12px; }
`;
