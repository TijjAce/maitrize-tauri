// Les générateurs de l'enseignant : des supports qu'il fait faire à l'IA de
// Mistral, décrits en quelques phrases, puis qu'il retouche (demande de
// l'enseignant, octobre 2026 : « que les utilisateurs puissent eux aussi
// faire des supports, avec les pictos qui peuvent être placés, des images »).
//
// L'IA n'écrit pas la feuille : elle écrit une recette, faite de blocs que
// Maitrize sait dessiner et corriger — relier, trier en colonnes, compléter,
// compter, entourer, des questions, des étiquettes à découper, une planche
// où l'on place des images. Maitrize tire au sort à chaque feuille dans les
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

export type SorteDeBloc = "relier" | "trier" | "completer" | "compter" | "entourer" | "questions" | "etiquettes" | "planche";

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

export type BlocPerso = BlocRelier | BlocTrier | BlocCompleter | BlocCompter | BlocEntourer | BlocQuestions | BlocEtiquettes | BlocPlanche;

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
];
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
export const BORNES_COMBIEN: Record<Exclude<SorteDeBloc, "planche">, [number, number]> = {
  relier: [2, 8], trier: [2, 12], completer: [1, 10], compter: [1, 9], entourer: [4, 25], questions: [1, 10], etiquettes: [1, 24],
};
const combienLu = (sorte: keyof typeof BORNES_COMBIEN, v: unknown, defaut: number) => entier(v, BORNES_COMBIEN[sorte][0], BORNES_COMBIEN[sorte][1], defaut);

const VIDE: PictoPose = { id: null, mot: "" };
const plein = (e: PictoPose) => Boolean(e.mot || e.id !== null || e.photo);

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
  }
}

/** Le bloc tel qu'il va sur la feuille, sans ce qui est encore incomplet ; ou ce qui lui manque pour y aller. */
export function blocPret(b: BlocPerso): BlocPerso | string {
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
  }
}

/** Ce qui manque à un bloc pour aller sur la feuille ; rien s'il est complet. */
export const ceQuiManque = (b: BlocPerso): string | null => { const r = blocPret(b); return typeof r === "string" ? r : null; };
/** Les blocs qui vont sur la feuille, prêts. */
const blocsPrets = (g: GenerateurPerso): BlocPerso[] => g.blocs.map(blocPret).filter((b): b is BlocPerso => typeof b !== "string");

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
  }
}

// ── Les générateurs gardés ────────────────────────────────────────────────

/** Le réglage qui les garde, partagé entre les ordinateurs de l'enseignant. */
export const CLE_GENERATEURS = "generateurs:perso";
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
  const voir = (e: PictoPose) => { const c = cleImage(e); if (c !== null) cles.add(c); };
  for (const b of g.blocs) {
    switch (b.sorte) {
      case "relier": b.paires.forEach(([x, y]) => { voir(x); voir(y); }); break;
      case "trier": b.categories.forEach((c) => c.elements.forEach(voir)); break;
      case "compter": case "etiquettes": b.elements.forEach(voir); break;
      case "entourer": [...b.cibles, ...b.autres].forEach(voir); break;
      case "planche": b.objets.forEach((o) => voir(o.element)); break;
      default: break;
    }
  }
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

Règles :
- Les éléments sont des mots simples, au singulier, sans article (« chat », pas « le chat » ni « chats ») : chacun recevra le pictogramme qui porte ce nom.
- Donne nettement plus d'éléments que « combien », pour que chaque feuille soit différente : 8 à 16 paires, 6 à 10 éléments par colonne, 8 à 12 phrases, 6 à 10 questions.
- « combien » : ce qu'une feuille en montre ; adapte-le à l'âge (moins pour la maternelle).
- Les consignes commencent par « Je » ou « J' » suivi d'un verbe, en phrases courtes ; une action par phrase.
- « affichage » vaut « mot », « picto » ou « les-deux » : « picto » ou « les-deux » pour des élèves qui ne lisent pas.
- Dans « planche », x et y sont en pourcentage du cadre (de 5 à 95), « taille » en millimètres (de 15 à 40), « hauteur » en millimètres (de 60 à 200).
- Jamais de prénom d'élève ni de personne réelle ; jamais de texte d'un livre ou d'un auteur protégé.
- Des mots et des phrases du niveau de la classe, en bon français.`;

/** Le message de l'enseignant pour l'IA : sa classe, et ce qu'il veut. */
export const demandeALIA = (demande: string, classe: string) =>
  `Classe : ${classe || "non précisée"}.\nCe que veut l'enseignant : ${demande.trim()}`;

/** La retouche d'une recette : la recette telle qu'elle est, en mots seulement, et ce que l'enseignant veut changer. */
export function retoucheALIA(g: GenerateurPerso, consigne: string): string {
  const mot = (e: PictoPose) => e.mot;
  const blocs = g.blocs.map((b) => {
    switch (b.sorte) {
      case "relier": return { ...b, paires: b.paires.map(([x, y]) => [mot(x), mot(y)]) };
      case "trier": return { ...b, categories: b.categories.map((c) => ({ nom: c.nom, elements: c.elements.map(mot) })) };
      case "compter": case "etiquettes": return { ...b, elements: b.elements.map(mot) };
      case "entourer": return { ...b, cibles: b.cibles.map(mot), autres: b.autres.map(mot) };
      case "planche": return { ...b, objets: b.objets.map((o) => ({ ...o, element: mot(o.element) })) };
      default: return b;
    }
  });
  const recette = { nom: g.nom, icone: g.icone, quoi: g.quoi, classe: g.classe, moment: g.moment, blocs };
  return `Voici la recette actuelle :\n${JSON.stringify(recette)}\n\nCe que l'enseignant veut changer : ${consigne.trim()}\nRéponds par la recette entière, modifiée, au même format JSON.`;
}

/** La recette que l'IA a répondue : le premier objet JSON de sa réponse, relu ; rien s'il n'y a pas d'exercice lisible. */
export function lireRecette(reponse: string): GenerateurPerso | null {
  const debut = reponse.indexOf("{"), fin = reponse.lastIndexOf("}");
  if (debut < 0 || fin <= debut) return null;
  try {
    const g = generateurSur(JSON.parse(reponse.slice(debut, fin + 1)));
    const blocs = blocsPrets(g);
    return blocs.length ? { ...g, blocs } : null;
  } catch {
    return null;
  }
}

/** Tous les mots de la recette qui n'ont encore ni picto ni photo : ceux qu'on cherche dans la banque. */
export function motsSansImage(g: GenerateurPerso): string[] {
  const mots = new Set<string>();
  const voir = (e: PictoPose) => { if (e.id === null && !e.photo && e.mot) mots.add(e.mot.toLowerCase()); };
  for (const b of g.blocs) {
    switch (b.sorte) {
      case "relier": b.paires.forEach(([x, y]) => { voir(x); voir(y); }); break;
      case "trier": b.categories.forEach((c) => c.elements.forEach(voir)); break;
      case "compter": case "etiquettes": b.elements.forEach(voir); break;
      case "entourer": [...b.cibles, ...b.autres].forEach(voir); break;
      case "planche": b.objets.forEach((o) => voir(o.element)); break;
      default: break;
    }
  }
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

/** Le même bloc, chaque élément passé par `f`. */
export function mapElements(b: BlocPerso, f: (e: PictoPose) => PictoPose): BlocPerso {
  switch (b.sorte) {
    case "relier": return { ...b, paires: b.paires.map(([x, y]) => [f(x), f(y)] as [PictoPose, PictoPose]) };
    case "trier": return { ...b, categories: b.categories.map((c) => ({ ...c, elements: c.elements.map(f) })) };
    case "compter": case "etiquettes": return { ...b, elements: b.elements.map(f) };
    case "entourer": return { ...b, cibles: b.cibles.map(f), autres: b.autres.map(f) };
    case "planche": return { ...b, objets: b.objets.map((o) => ({ ...o, element: f(o.element) })) };
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
  .feuille.gp .gp-sans-image { display: flex; align-items: center; justify-content: center; text-align: center; font-size: 14px; font-weight: 700; overflow-wrap: anywhere; }
  .feuille.gp .gp-legende { display: inline-flex; align-items: flex-end; justify-content: center; min-width: 22mm; height: 6mm; border-bottom: 2px dotted #1c2233; font-size: 12px; }
`;
