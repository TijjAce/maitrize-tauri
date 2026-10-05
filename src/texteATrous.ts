// Le texte à trous et ses étiquettes.
//
// Des phrases dont on a retiré un mot — le verbe conjugué, le plus souvent :
// être et avoir au présent, au CE1. Les mots retirés sont sur des étiquettes
// à découper, mélangées, de la taille exacte des cases : on cherche, on
// essaie, on vérifie — en remplaçant le sujet par un pronom, en relisant la
// phrase à voix basse — puis on colle. La manipulation vient avant la copie.
//
// Toutes les cases ont la même largeur, celle du mot le plus long : la taille
// d'une case ne trahit pas son mot. Le mot à retirer s'écrit entre
// astérisques, comme dans les maisons du tri : « Nous *sommes* en classe. » ;
// un indice peut suivre une barre : « *sommes|être* ». Pour être et avoir,
// l'infinitif se trouve tout seul.

import { escapeHtml } from "./print";
import { HAUTEUR_UTILE_MM, LARGEUR_CONTENU_MM, feuille } from "./cartesImprimables";
import { hasard, melanger, piocher } from "./hasard";

export type TailleTrous = "normale" | "grande";

export interface ReglagesTrous {
  /** Le modèle d'où viennent les phrases ; vide pour les siennes. */
  modele: string;
  titre: string;
  /** Les phrases, une par ligne, le mot à retirer entre astérisques. */
  phrases: string;
  /** Dans chaque case, l'infinitif ou l'indice, en gris : l'étiquette collée le cache. */
  indices: boolean;
  /** Des étiquettes d'être et d'avoir qui ne vont nulle part : il faut choisir. */
  intrus: number;
  /** D'autres étiquettes en plus, séparées par des virgules. */
  autres: string;
  /** Le rappel de la façon de vérifier, en tête de la feuille. */
  methode: boolean;
  texteMethode: string;
  /** Une ligne sous chaque phrase, pour la recopier complétée. */
  lignes: boolean;
  taille: TailleTrous;
  capitales: boolean;
}

export const METHODE_PRONOM = "Pour vérifier, je remplace le sujet par un pronom — il, elle, ils, elles, nous, vous — et je relis la phrase à voix basse : est-ce qu'elle se dit ?";

export const MODELES_TROUS: { id: string; nom: string; titre: string; phrases: string; methode: string }[] = [
  {
    id: "etre", nom: "Être au présent", titre: "Le verbe être au présent", methode: METHODE_PRONOM,
    phrases: "Je *suis* dans la classe de CE1.\nTu *es* en retard ce matin.\nIl *est* au tableau.\nElle *est* contente de son dessin.\nOn *est* dans la cour.\n"
      + "Nous *sommes* à la bibliothèque.\nVous *êtes* très gentils.\nIls *sont* sous le préau.\nElles *sont* dans le bus.\nLe chat *est* sur le muret.",
  },
  {
    id: "avoir", nom: "Avoir au présent", titre: "Le verbe avoir au présent", methode: METHODE_PRONOM,
    phrases: "J'*ai* un cartable rouge.\nTu *as* une nouvelle trousse.\nIl *a* faim avant la cantine.\nElle *a* les cheveux longs.\nOn *a* piscine le mardi.\n"
      + "Nous *avons* une grande cour.\nVous *avez* de beaux dessins.\nIls *ont* un chien et deux chats.\nElles *ont* des bottes de pluie.\nLe maître *a* une voix douce.",
  },
  {
    id: "etre-avoir", nom: "Être et avoir mélangés", titre: "Être ou avoir au présent ?", methode: METHODE_PRONOM,
    phrases: "Je *suis* à l'école et j'*ai* faim.\nTu *as* un vélo bleu.\nLe bébé *est* dans son lit.\nNous *avons* une sortie au musée.\nVous *êtes* dans la cour.\n"
      + "Mes parents *ont* une voiture grise.\nElle *est* malade : elle *a* de la fièvre.\nLes fleurs *sont* jolies.\nTu *es* le premier de la file.\nIls *ont* peur de l'orage.",
  },
  {
    id: "gn", nom: "Être et avoir, sujets à remplacer", titre: "Être et avoir : je vérifie avec le pronom",
    methode: "Le sujet n'est pas un pronom ? Je le remplace par il, elle, ils, elles, nous ou vous : « Les enfants sont… » devient « Ils sont… ». Je relis : est-ce que la phrase se dit ?",
    phrases: "Le chien *a* un os.\nMa cousine *est* au CE2.\nLes enfants *sont* dans la cour.\nLes filles *ont* des bonnets.\nPaul et moi *sommes* voisins.\n"
      + "Léa et toi *êtes* dans la même équipe.\nLe directeur *a* une réunion.\nLes arbres *ont* des feuilles rouges.\nLa porte *est* fermée.\nMes amis *sont* à la fête.",
  },
];

export const REGLAGES_TROUS: ReglagesTrous = {
  modele: "etre-avoir", titre: MODELES_TROUS[2].titre, phrases: MODELES_TROUS[2].phrases,
  indices: false, intrus: 0, autres: "", methode: true, texteMethode: MODELES_TROUS[2].methode,
  lignes: false, taille: "normale", capitales: false,
};

/** Les réglages tels qu'on peut s'y fier, d'où qu'ils viennent. */
export function reglagesTrousSurs(brut: Partial<ReglagesTrous>): ReglagesTrous {
  const b = { ...REGLAGES_TROUS, ...brut };
  const texte = (v: unknown, defaut: string) => (typeof v === "string" ? v : defaut);
  return {
    modele: texte(b.modele, ""), titre: texte(b.titre, ""), phrases: texte(b.phrases, ""),
    indices: b.indices === true, methode: b.methode !== false, texteMethode: texte(b.texteMethode, METHODE_PRONOM),
    intrus: typeof b.intrus === "number" && Number.isFinite(b.intrus) ? Math.max(0, Math.min(6, Math.round(b.intrus))) : 0,
    autres: texte(b.autres, ""), lignes: b.lignes === true, taille: b.taille === "grande" ? "grande" : "normale", capitales: b.capitales === true,
  };
}

// ── Les phrases et leurs trous ────────────────────────────────────────────

export interface Trou { mot: string; indice: string }
export type Morceau = { texte: string } | { trou: Trou };
export const estUnTrou = (m: Morceau): m is { trou: Trou } => "trou" in m;

/** Les formes d'être et d'avoir au présent, et leur infinitif. */
const INFINITIFS: Record<string, string> = {
  suis: "être", es: "être", est: "être", sommes: "être", "êtes": "être", sont: "être",
  ai: "avoir", as: "avoir", a: "avoir", avons: "avoir", avez: "avoir", ont: "avoir",
};
const FORMES_ETRE_AVOIR = Object.keys(INFINITIFS);

const MARQUE = /\*([^*|\n]+?)(?:\|([^*\n]*))?\*/g;

/** Une phrase en morceaux : du texte, et des trous. */
export function morceauxDe(phrase: string): Morceau[] {
  const sortie: Morceau[] = [];
  let position = 0;
  for (const m of phrase.matchAll(MARQUE)) {
    if (m.index > position) sortie.push({ texte: phrase.slice(position, m.index) });
    const mot = m[1].trim();
    sortie.push({ trou: { mot, indice: (m[2] ?? "").trim() || INFINITIFS[mot.toLowerCase()] || "" } });
    position = m.index + m[0].length;
  }
  if (position < phrase.length) sortie.push({ texte: phrase.slice(position) });
  return sortie;
}

/** Les phrases écrites, une par ligne, en morceaux. */
export const phrasesATrous = (texte: string): Morceau[][] =>
  (texte ?? "").split("\n").map((l) => l.trim()).filter(Boolean).map(morceauxDe);

export const trousDe = (phrase: Morceau[]): Trou[] => phrase.filter(estUnTrou).map((m) => m.trou);

/** Les rangs (à partir de 1) des phrases où rien n'est retiré. */
export const phrasesSansTrou = (phrases: Morceau[][]) => phrases.map((p, i) => (trousDe(p).length ? 0 : i + 1)).filter(Boolean);

/** Vrai si tous les mots retirés sont des formes d'être ou d'avoir : on sait alors quoi proposer en plus. */
export const queDesFormesEtreAvoir = (phrases: Morceau[][]) => {
  const mots = phrases.flatMap(trousDe).map((t) => t.mot.toLowerCase());
  return mots.length > 0 && mots.every((m) => m in INFINITIFS);
};

/** Les étiquettes en plus : celles qu'on a écrites, puis des formes d'être et d'avoir que les phrases n'emploient pas. */
export function etiquettesEnPlus(phrases: Morceau[][], r: Pick<ReglagesTrous, "intrus" | "autres">, graine: number): string[] {
  const autres = r.autres.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
  if (!r.intrus || !queDesFormesEtreAvoir(phrases)) return autres;
  const employees = new Set(phrases.flatMap(trousDe).map((t) => t.mot.toLowerCase()));
  const libres = FORMES_ETRE_AVOIR.filter((f) => !employees.has(f) && !autres.some((a) => a.toLowerCase() === f));
  return [...autres, ...piocher(hasard(graine + 7), libres, r.intrus)];
}

// ── La mise en page ───────────────────────────────────────────────────────
//
// En millimètres, d'après le corps du texte : de quoi savoir combien de
// phrases tiennent sur une page avec leurs étiquettes, qui restent en bas de
// la page de leurs phrases — on découpe et on colle sans tourner la feuille.

const MM_PAR_PX = 25.4 / 96;
const DIMENSIONS: Record<TailleTrous, { police: number; hauteur: number; marge: number }> = {
  normale: { police: 17, hauteur: 10, marge: 4 },
  grande: { police: 22, hauteur: 13, marge: 5 },
};

/** La largeur commune des cases et des étiquettes : celle du plus long mot. */
export function largeurDesCases(mots: string[], r: Pick<ReglagesTrous, "taille" | "capitales">): number {
  const d = DIMENSIONS[r.taille];
  const lettres = Math.max(3, ...mots.map((m) => [...m].length));
  return Math.ceil(lettres * d.police * MM_PAR_PX * (r.capitales ? 0.78 : 0.64) + 2 * d.marge);
}

/** Ce qu'une phrase occupe : ses lignes, et celle où on la recopie. */
function hauteurDePhrase(p: Morceau[], largeur: number, r: ReglagesTrous): number {
  const d = DIMENSIONS[r.taille];
  const parLettre = d.police * MM_PAR_PX * (r.capitales ? 0.7 : 0.55);
  const longueur = p.reduce((s, m) => s + (estUnTrou(m) ? largeur + 2 : [...m.texte].length * parLettre), 0);
  const lignes = Math.max(1, Math.ceil(longueur / (LARGEUR_CONTENU_MM - 10)));
  return lignes * (d.hauteur + 3.5) + 3 + (r.lignes ? d.hauteur + 4 : 0);
}

/** Ce que le bloc des étiquettes occupe en bas de page. */
function hauteurDesEtiquettes(n: number, largeur: number, r: ReglagesTrous): number {
  if (!n) return 0;
  const parRangee = Math.max(1, Math.floor((LARGEUR_CONTENU_MM - 6) / largeur));
  return 13 + Math.ceil(n / parRangee) * DIMENSIONS[r.taille].hauteur;
}

export interface PageTrous { debut: number; phrases: Morceau[][]; etiquettes: string[] }

/**
 * Les pages : autant de phrases que la page en tient avec leurs étiquettes,
 * mélangées ; les étiquettes en plus vont avec la dernière.
 */
export function pagesATrous(phrases: Morceau[][], r: ReglagesTrous, graine: number): PageTrous[] {
  const enPlus = etiquettesEnPlus(phrases, r, graine);
  const largeur = largeurDesCases([...phrases.flatMap(trousDe).map((t) => t.mot), ...enPlus], r);
  const alea = hasard(graine);
  // Le titre et la consigne ; le rappel pour vérifier, sur deux ou trois lignes.
  const entete = (premiere: boolean) => (premiere ? 32 + (r.methode && r.texteMethode.trim() ? 20 : 0) : 12);
  const pages: PageTrous[] = [];
  let courante: Morceau[][] = [];
  let debut = 0;
  let hauteur = entete(true);
  const mots = (liste: Morceau[][]) => liste.flatMap(trousDe).length;
  phrases.forEach((p, i) => {
    const h = hauteurDePhrase(p, largeur, r);
    const avec = hauteur + h + hauteurDesEtiquettes(mots([...courante, p]) + enPlus.length, largeur, r);
    if (courante.length && avec > HAUTEUR_UTILE_MM - 8) {
      pages.push({ debut, phrases: courante, etiquettes: [] });
      courante = [];
      debut = i;
      hauteur = entete(false);
    }
    courante.push(p);
    hauteur += h;
  });
  pages.push({ debut, phrases: courante, etiquettes: [] });
  pages.forEach((page, k) => {
    const siennes = page.phrases.flatMap(trousDe).map((t) => t.mot);
    page.etiquettes = melanger(alea, k === pages.length - 1 ? [...siennes, ...enPlus] : siennes);
  });
  return pages;
}

// ── La feuille ────────────────────────────────────────────────────────────

const CONSIGNE = "Découpe les étiquettes. Lis chaque phrase et essaie les étiquettes dans les cases. Quand tu as vérifié, colle la bonne étiquette.";

export function htmlTexteATrous(r: ReglagesTrous, graine: number): string {
  const phrases = phrasesATrous(r.phrases);
  const pages = pagesATrous(phrases, r, graine);
  const largeur = largeurDesCases([...phrases.flatMap(trousDe).map((t) => t.mot), ...etiquettesEnPlus(phrases, r, graine)], r);
  const titre = escapeHtml(r.titre.trim() || "Texte à trous");
  const methode = r.methode && r.texteMethode.trim() ? `<div class="tt-methode"><b>🔎 Je vérifie</b>${escapeHtml(r.texteMethode.trim())}</div>` : "";
  const morceau = (m: Morceau) => (estUnTrou(m)
    ? `<span class="tt-trou">${r.indices && m.trou.indice ? `<span class="tt-indice">${escapeHtml(m.trou.indice)}</span>` : ""}</span>`
    : escapeHtml(m.texte));
  const corps = pages.map((page, k) => `<div class="page">`
    + (k === 0 ? `<div class="titre">${titre}</div><div class="regle"><b>La consigne</b>${CONSIGNE}</div>${methode}` : `<div class="titre">${titre} (suite)</div>`)
    + `<ol class="tt-phrases" start="${page.debut + 1}">${page.phrases.map((p) => `<li class="tt-phrase"><div class="tt-texte">${p.map(morceau).join("")}</div>`
      + `${r.lignes ? `<div class="tt-ligne"></div>` : ""}</li>`).join("")}</ol>`
    + (page.etiquettes.length ? `<div class="tt-etiquettes"><div class="tt-etiquettes-titre">✂ Les étiquettes à découper</div>`
      + `<div class="tt-grille">${page.etiquettes.map((e) => `<span class="tt-etiquette">${escapeHtml(e)}</span>`).join("")}</div></div>` : "")
    + `</div>`).join("");
  const corrige = `<div class="page corrige"><div class="titre">${titre} — corrigé</div><ol class="tt-corrige">`
    + phrases.map((p) => `<li>${p.map((m) => (estUnTrou(m) ? `<b>${escapeHtml(m.trou.mot)}</b>` : escapeHtml(m.texte))).join("")}</li>`).join("")
    + `</ol></div>`;
  const classes = ["tt", r.taille === "grande" ? "tt-grande" : "", r.capitales ? "tt-capitales" : ""].filter(Boolean).join(" ");
  return feuille(`<div class="tt-cadre" style="--l:${largeur}mm">${corps}${corrige}</div>`, classes);
}

export const STYLE_TROUS = `
  .feuille.tt .tt-cadre { --h: 10mm; --police: 17px; }
  .feuille.tt-grande .tt-cadre { --h: 13mm; --police: 22px; }
  .feuille.tt-capitales .tt-texte, .feuille.tt-capitales .tt-etiquette, .feuille.tt-capitales .tt-corrige { text-transform: uppercase; }
  .feuille.tt .tt-methode { border: 1.5px solid #2454e6; border-radius: 8px; background: #eef3ff; padding: 6px 12px; font-size: 13px; line-height: 1.45; margin: 0 0 10px; }
  .feuille.tt .tt-methode b { display: block; color: #2454e6; margin-bottom: 2px; }
  .feuille.tt .tt-phrases { margin: 0; padding-left: 8mm; }
  .feuille.tt .tt-phrase { font-size: var(--police); margin: 0 0 3mm; page-break-inside: avoid; break-inside: avoid; }
  .feuille.tt .tt-phrase::marker { font-size: 12px; font-weight: 700; color: #687087; }
  .feuille.tt .tt-texte { line-height: calc(var(--h) + 3.5mm); }
  .feuille.tt .tt-trou { display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; width: var(--l); height: var(--h);
    border: 1.5px dashed #1c2233; border-radius: 1.5mm; vertical-align: middle; margin: 0 1mm; background: #fff; }
  .feuille.tt .tt-indice { font-size: 10px; font-style: italic; color: #9aa0b4; line-height: 1; }
  .feuille.tt .tt-ligne { height: var(--h); border-bottom: 1.5px solid #1c2233; margin: 1mm 0 0; }
  .feuille.tt .tt-etiquettes { margin-top: 6mm; page-break-inside: avoid; break-inside: avoid; }
  .feuille.tt .tt-etiquettes-titre { font-size: 12px; font-weight: 700; color: #687087; margin-bottom: 2mm; }
  .feuille.tt .tt-grille { display: flex; flex-wrap: wrap; }
  .feuille.tt .tt-etiquette { display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; width: var(--l); height: var(--h);
    border: 1px dashed #1c2233; margin: 0 -1px -1px 0; font-size: var(--police); font-weight: 700; background: #fff; }
  .feuille.tt .tt-corrige { font-size: 15px; line-height: 2; padding-left: 8mm; }
  .feuille.tt .tt-corrige b { color: #2454e6; }
`;
