// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// ── L'affiche du problème de référence ────────────────────────────────────
//
// « Fais-en encore plus » (l'enseignant, 4 novembre 2026), après les tables
// de multiplication, la frise alphabétique et les tableaux de conjugaison.
//
// Le guide « Pour enseigner les nombres, le calcul et la résolution de
// problèmes au CP » (Éduscol, 2021) : la trace écrite d'un problème est un
// « schéma éventuel, calcul en ligne ou posé, phrase d'explicitation ou de
// conclusion » (p. 100) ; « les affiches collectives correspondent aux
// problèmes de référence rencontrés », de l'énoncé à l'écriture
// mathématique en passant par le schéma (p. 101, figure 37), et l'on s'y
// reporte quand on reconnaît « c'est comme le problème de… ». Le schéma en
// barres réunit les parties en un tout (p. 94-95) ; devant une comparaison,
// on répond d'abord à « qui en a le plus » (p. 98). Le guide « La résolution
// de problèmes mathématiques au cours moyen » (Éduscol, 2021) en donne un modèle
// (p. 102) : l'énoncé, ce que l'on compare, le schéma, le calcul, la phrase
// réponse ; ces problèmes types restent « en nombre limité ».
//
// L'affiche suit ces étapes : le problème, je comprends, je représente, je
// calcule, je réponds. Le problème vient des générateurs de Maitrize (voir
// problemesBarres.ts et problemesDesLivrets.ts), avec les nombres de la
// classe ; l'énoncé, la phrase « je comprends » et la phrase réponse se
// réécrivent à la main, pour que l'affiche dise le problème qu'on a
// vraiment résolu ensemble.

import { feuille } from "./cartesImprimables";
import { hasard } from "./hasard";
import { choisir } from "./nombres";
import { escapeHtml } from "./print";
import {
  CONTEXTES_GROUPES, CONTEXTES_PARTIES, OBJETS_COMPARES, STYLE_CLASSE, nombre, redigerMultiplicatif, redigerPartieTout, schemaSvg,
  type Probleme, type Schema, type StyleSchema,
} from "./problemesBarres";
import { HABILLAGES_CE1, HABILLAGES_CP, problemeDeComparaison, problemeParties, type Structure } from "./problemesDesLivrets";

export type CategorieProbleme =
  | "reunion" | "partie"
  | "ajout" | "retrait" | "ajoute" | "enleve" | "depart"
  | "plus" | "moins"
  | "parts-tout" | "parts-valeur" | "parts-nombre"
  | "fois-plus" | "fois-moins";

export interface DefinitionCategorie {
  id: CategorieProbleme;
  famille: string;
  nom: string;
  /** Ce que disent les deux nombres de l'énoncé. */
  donnees: [string, string];
  /** Les nombres de départ : ceux des exemples des guides quand ils en donnent. */
  defaut: [number, number];
  /** Les prénoms y servent (les transformations racontent les leurs). */
  personnages: 0 | 1 | 2;
}

export const CATEGORIES: DefinitionCategorie[] = [
  // Guide CP, p. 94 : « Léo a 7 billes rouges et 5 billes bleues. »
  { id: "reunion", famille: "Parties et tout", nom: "On cherche le tout", donnees: ["Une partie", "L'autre partie"], defaut: [7, 5], personnages: 1 },
  { id: "partie", famille: "Parties et tout", nom: "On cherche une partie", donnees: ["Le tout", "Une partie"], defaut: [12, 7], personnages: 1 },
  { id: "ajout", famille: "Transformations", nom: "On ajoute : on cherche la fin", donnees: ["Au début", "On ajoute"], defaut: [8, 5], personnages: 0 },
  { id: "retrait", famille: "Transformations", nom: "On enlève : on cherche ce qui reste", donnees: ["Au début", "On enlève"], defaut: [15, 6], personnages: 0 },
  { id: "ajoute", famille: "Transformations", nom: "On cherche ce qu'on a ajouté", donnees: ["Au début", "À la fin"], defaut: [9, 14], personnages: 0 },
  { id: "enleve", famille: "Transformations", nom: "On cherche ce qu'on a enlevé", donnees: ["Au début", "À la fin"], defaut: [14, 9], personnages: 0 },
  { id: "depart", famille: "Transformations", nom: "On cherche le début", donnees: ["On ajoute", "À la fin"], defaut: [6, 15], personnages: 0 },
  // Guide CP, p. 98 : « Lucie a 37 billes. Léo a 6 billes de plus que Lucie. »
  { id: "plus", famille: "Comparaisons", nom: "On cherche la plus grande quantité", donnees: ["La plus petite quantité", "L'écart"], defaut: [37, 6], personnages: 2 },
  { id: "moins", famille: "Comparaisons", nom: "On cherche la plus petite quantité", donnees: ["La plus grande quantité", "L'écart"], defaut: [43, 6], personnages: 2 },
  { id: "parts-tout", famille: "Parts égales", nom: "On cherche le tout", donnees: ["Le nombre de parts", "Une part"], defaut: [4, 6], personnages: 1 },
  { id: "parts-valeur", famille: "Parts égales", nom: "On cherche la valeur d'une part", donnees: ["Le tout", "Le nombre de parts"], defaut: [24, 4], personnages: 1 },
  { id: "parts-nombre", famille: "Parts égales", nom: "On cherche le nombre de parts", donnees: ["Le tout", "Une part"], defaut: [24, 6], personnages: 1 },
  { id: "fois-plus", famille: "Fois plus", nom: "On cherche la plus grande quantité", donnees: ["La plus petite quantité", "Combien de fois"], defaut: [4, 3], personnages: 2 },
  { id: "fois-moins", famille: "Fois plus", nom: "On cherche la plus petite quantité", donnees: ["La plus grande quantité", "Combien de fois"], defaut: [12, 3], personnages: 2 },
];

export const FAMILLES_DE_PROBLEMES = [...new Set(CATEGORIES.map((c) => c.famille))];

export const categorie = (id: CategorieProbleme) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];

export interface ReglagesAfficheProbleme {
  categorie: CategorieProbleme;
  /** Les deux nombres de l'énoncé, dans l'ordre des `donnees` de la catégorie. */
  nombres: [number, number];
  /** L'histoire : 0, celle des guides ; « Une autre histoire » en tire une autre. */
  graine: number;
  /** Le personnage principal, puis l'autre. */
  prenoms: [string, string];
  /** Le nom que la classe donne au problème : « le problème des billes de Léo ». */
  nom: string;
  /** Les textes de la classe ; vides, ceux de Maitrize. */
  enonce: string;
  comprendre: string;
  phrase: string;
  /** L'étape « Je comprends ». */
  etapeComprendre: boolean;
  /** TOUT et PARTIE sur le schéma. */
  mots: boolean;
  format: "portrait" | "paysage";
}

export const REGLAGES_AFFICHE_PROBLEME: ReglagesAfficheProbleme = {
  categorie: "reunion", nombres: [7, 5], graine: 0, prenoms: ["Léo", "Lucie"], nom: "",
  enonce: "", comprendre: "", phrase: "", etapeComprendre: true, mots: true, format: "portrait",
};

const MAX = 99999;
const entierSur = (v: unknown, defaut: number) => (typeof v === "number" && Number.isFinite(v) ? Math.max(1, Math.min(MAX, Math.round(v))) : defaut);
const texteSur = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

export function reglagesAfficheProblemeSurs(brut: Partial<ReglagesAfficheProbleme> | null | undefined): ReglagesAfficheProbleme {
  const o = (brut && typeof brut === "object" ? brut : {}) as Partial<ReglagesAfficheProbleme>;
  const d = REGLAGES_AFFICHE_PROBLEME;
  const cat = CATEGORIES.some((c) => c.id === o.categorie) ? o.categorie! : d.categorie;
  const defaut = categorie(cat).defaut;
  const nombres: [number, number] = Array.isArray(o.nombres)
    ? [entierSur(o.nombres[0], defaut[0]), entierSur(o.nombres[1], defaut[1])]
    : [...defaut];
  const prenoms: [string, string] = Array.isArray(o.prenoms)
    ? [texteSur(o.prenoms[0], 30).trim() || d.prenoms[0], texteSur(o.prenoms[1], 30).trim() || d.prenoms[1]]
    : [...d.prenoms];
  return {
    categorie: cat, nombres, prenoms,
    graine: typeof o.graine === "number" && Number.isFinite(o.graine) ? Math.max(0, Math.floor(o.graine)) : 0,
    nom: texteSur(o.nom, 80), enonce: texteSur(o.enonce, 600), comprendre: texteSur(o.comprendre, 300), phrase: texteSur(o.phrase, 300),
    etapeComprendre: typeof o.etapeComprendre === "boolean" ? o.etapeComprendre : d.etapeComprendre,
    mots: typeof o.mots === "boolean" ? o.mots : d.mots,
    format: o.format === "paysage" ? "paysage" : "portrait",
  };
}

/** Ce qui empêche ces nombres de faire un problème de la catégorie, ou rien. */
export function erreurDesNombres(r: Pick<ReglagesAfficheProbleme, "categorie" | "nombres">): string {
  const [a, b] = r.nombres;
  const n = nombre;
  switch (r.categorie) {
    case "partie": return b < a ? "" : "La partie doit être plus petite que le tout.";
    case "retrait": return b < a ? "" : `On ne peut pas enlever ${n(b)} quand il y en a ${n(a)} au début.`;
    case "ajoute": return b > a ? "" : "Quand on ajoute, il y en a plus à la fin qu'au début.";
    case "enleve": return b < a ? "" : "Quand on enlève, il y en a moins à la fin qu'au début.";
    case "depart": return b > a ? "" : "À la fin, il y en a plus que ce qu'on a ajouté.";
    case "moins": return b < a ? "" : "L'écart doit être plus petit que la plus grande quantité.";
    case "parts-tout": return a >= 2 ? "" : "Il faut au moins deux parts.";
    case "parts-valeur": return b < 2 ? "Il faut au moins deux parts." : a % b === 0 ? "" : `${n(a)} ne se partage pas en ${n(b)} parts égales.`;
    case "parts-nombre": return a % b === 0 && a > b ? "" : `On ne fait pas des parts égales de ${n(b)} avec ${n(a)}.`;
    case "fois-plus": return b >= 2 ? "" : "Il faut au moins deux fois plus.";
    case "fois-moins": return b < 2 ? "Il faut au moins deux fois plus." : a % b === 0 ? "" : `${n(a)} n'est pas ${n(b)} fois un nombre entier.`;
    default: return "";
  }
}

// ── Le problème ───────────────────────────────────────────────────────────

/** Une comparaison additive : deux barres, la plus grande en haut ; sous elle, la plus petite et l'écart (guide CP, p. 98). */
export interface SchemaEcart {
  forme: "ecart";
  grand: { nom: string; valeur: number; connue: boolean };
  petit: { nom: string; valeur: number; connue: boolean };
  ecart: number;
}

export interface ProblemeAffiche {
  schema: Schema | SchemaEcart;
  enonce: string;
  comprendre: string;
  calcul: string;
  phrase: string;
  reponse: number;
}

const STRUCTURES: Partial<Record<CategorieProbleme, Structure>> = {
  ajout: "final-ajout", retrait: "reste", ajoute: "ajoute", enleve: "retire", depart: "depart-ajout",
};

const COMPRENDRE: Partial<Record<CategorieProbleme, string>> = {
  reunion: "On connaît les deux parties. On cherche le tout.",
  partie: "On connaît le tout et une partie. On cherche l'autre partie.",
  ajout: "On ajoute : à la fin, il y en a plus. On cherche la fin.",
  retrait: "On enlève : il en reste moins qu'au début. On cherche ce qui reste.",
  ajoute: "Il y en a plus à la fin qu'au début : on a ajouté. On cherche ce qu'on a ajouté.",
  enleve: "Il y en a moins à la fin qu'au début : on a enlevé. On cherche ce qu'on a enlevé.",
  depart: "On a ajouté : il y en avait moins au début. On cherche le début.",
  "parts-tout": "Des parts égales : on connaît le nombre de parts et une part. On cherche le tout.",
  "parts-valeur": "On partage le tout en parts égales. On cherche la valeur d'une part.",
  "parts-nombre": "On fait des parts égales. On cherche le nombre de parts.",
};

/** Ce qu'on compare : billes, argent ou longueurs — sans pronom à accorder au prénom choisi. */
const GRANDEURS_COMPAREES = [
  { id: "billes", qui: (q: string) => `Qui a le plus de billes ? ${q}.`, quantite: "quantité" },
  { id: "monnaie", qui: (q: string) => `Qui a le plus d'argent ? ${q}.`, quantite: "somme" },
  { id: "longueurs", qui: (q: string) => `Quelle bande est la plus longue ? Celle de ${q}.`, quantite: "longueur" },
] as const;

/** Un tirage reproductible, sauf la graine 0 : la première histoire, celle des exemples des guides. */
const tirage = (graine: number) => {
  const alea = hasard(graine * 7919 + 17);
  return <T,>(liste: readonly T[]): T => (graine === 0 ? liste[0] : choisir(alea, liste));
};

/** Le problème de l'affiche, ou `null` si les nombres n'en font pas un. */
export function problemeDeLAffiche(brut: Partial<ReglagesAfficheProbleme>): ProblemeAffiche | null {
  const r = reglagesAfficheProblemeSurs(brut);
  if (erreurDesNombres(r)) return null;
  const [a, b] = r.nombres;
  const [principal, autre] = r.prenoms;
  const pris = tirage(r.graine);
  const avec = (p: Probleme, comprendre: string): ProblemeAffiche =>
    ({ schema: p.schema, enonce: p.enonce, comprendre, calcul: p.calcul, phrase: p.phrase, reponse: p.reponse });

  switch (r.categorie) {
    case "reunion": case "partie": {
      const contexte = pris(CONTEXTES_PARTIES.map((_, k) => k));
      const sorte = CONTEXTES_PARTIES[contexte].parties.length;
      const premiere = pris([...Array(sorte).keys()]);
      const situation = { forme: "parties" as const, contexte, categories: [premiere, (premiere + 1) % sorte], qui: principal };
      const p = r.categorie === "reunion"
        ? redigerPartieTout(situation, [a, b], -1, true)
        : redigerPartieTout(situation, [b, a - b], 1, true);
      return avec(p, COMPRENDRE[r.categorie]!);
    }
    case "ajout": case "retrait": case "ajoute": case "enleve": case "depart": {
      const s = STRUCTURES[r.categorie]!;
      const alea = hasard(r.graine * 104729 + 3);
      const habillages = [...Object.values(HABILLAGES_CP), ...Object.values(HABILLAGES_CE1)].map((h) => h(alea)).filter((h) => h[s]);
      const [enonce, phrase] = pris(habillages)[s]!(a, b);
      const p = problemeParties(s, a, b, enonce, phrase);
      // Le début à gauche : on cherche ce qu'il y avait avant d'ajouter.
      if (s === "depart-ajout" && p.schema.forme === "parties") p.schema = { ...p.schema, parties: [...p.schema.parties].reverse() };
      return avec(p, COMPRENDRE[r.categorie]!);
    }
    case "plus": case "moins": {
      const g = pris(GRANDEURS_COMPAREES);
      const plus = r.categorie === "plus";
      // Guide CP, p. 98 : « Lucie a 37 billes. Léo a 6 billes de plus que Lucie. » — le personnage principal est celui qu'on cherche.
      const p = problemeDeComparaison(g.id, a, b, { mot: plus ? "plus" : "moins", secondPlusGrand: plus }, false, [autre, principal]);
      const grand = plus ? principal : autre;
      return {
        ...avec(p, `${g.qui(grand)} On cherche la plus ${plus ? "grande" : "petite"} ${g.quantite}.`),
        schema: {
          forme: "ecart", ecart: b,
          grand: { nom: grand, valeur: plus ? a + b : a, connue: !plus },
          petit: { nom: plus ? autre : principal, valeur: plus ? a : a - b, connue: plus },
        },
      };
    }
    case "parts-tout": case "parts-valeur": case "parts-nombre": {
      const [parts, part] = r.categorie === "parts-tout" ? [a, b] : r.categorie === "parts-valeur" ? [b, a / b] : [a / b, b];
      const possibles = CONTEXTES_GROUPES.map((_, k) => k).filter((k) => !CONTEXTES_GROUPES[k].plafond || parts * part <= CONTEXTES_GROUPES[k].plafond!);
      const type = r.categorie === "parts-tout" ? "tout" : r.categorie === "parts-valeur" ? "part" : "nombre";
      const p = redigerMultiplicatif({ forme: "parts-egales", contexte: pris(possibles), qui: principal }, type, parts, part, true);
      return avec(p, COMPRENDRE[r.categorie]!);
    }
    case "fois-plus": case "fois-moins": {
      const objets = pris(OBJETS_COMPARES.map((_, k) => k));
      const plus = r.categorie === "fois-plus";
      // « Lucie a 4 billes. Léo a 3 fois plus de billes que Lucie. » ; « Lucie a 12 billes. C'est 3 fois plus que Léo. »
      const p = plus
        ? redigerMultiplicatif({ forme: "comparaison", objets, noms: [autre, principal] }, "grand", b, a, true)
        : redigerMultiplicatif({ forme: "comparaison", objets, noms: [principal, autre] }, "petit", b, a / b, true);
      const quoi = OBJETS_COMPARES[objets][1];
      return avec(p, `Qui a le plus ${/^[aeiouéèh]/i.test(quoi) ? "d'" : "de "}${quoi} ? ${plus ? principal : autre}, ${nombre(b)} fois plus. `
        + `On cherche la plus ${plus ? "grande" : "petite"} quantité.`);
    }
  }
}

/** Les nombres que l'énoncé de la classe doit dire, et qu'il ne dit pas. */
export function nombresAbsents(enonce: string, r: Pick<ReglagesAfficheProbleme, "nombres">): number[] {
  const chiffres = (s: string) => s.replace(/[\s  .]/g, "");
  const dit = new Set((chiffres(enonce).match(/\d+/g) ?? []).map(Number));
  return [...new Set(r.nombres)].filter((x) => !dit.has(x));
}

// ── Le schéma d'une comparaison additive ──────────────────────────────────

const LARGEUR = 520;
const arrondi = (v: number) => Math.round(v * 10) / 10;

function schemaEcart(s: SchemaEcart, st: StyleSchema, mots: boolean): string {
  const xBarres = 120, place = LARGEUR - xBarres - 10;
  const h = 54, y1 = 10, y2 = y1 + h + 26;
  const lPetit = Math.max(90, Math.min(place - 70, (place * s.petit.valeur) / Math.max(1, s.grand.valeur)));
  const police = escapeHtml(st.police);
  const texte = (x: number, y: number, valeur: string, taille: number, couleur: string, gras = false) =>
    `<text x="${arrondi(x)}" y="${arrondi(y)}" text-anchor="middle" dominant-baseline="central" font-family="${police}" font-size="${taille}" `
    + `fill="${couleur}"${gras ? ' font-weight="700"' : ""}>${escapeHtml(valeur)}</text>`;
  const boite = (x: number, y: number, l: number, trait: string, valeur: string, pointille = false) =>
    `<rect x="${arrondi(x)}" y="${y}" width="${arrondi(l)}" height="${h}" fill="#fff" stroke="${trait}" stroke-width="${st.epaisseur}"`
    + `${pointille ? ' stroke-dasharray="8 6"' : ""}/>` + texte(x + l / 2, y + h / 2 + 1, valeur, 30, trait);
  const nom = (y: number, valeur: string) =>
    `<text x="10" y="${y}" dominant-baseline="central" font-family="${police}" font-size="20" font-weight="700" fill="#222"`
    + `${valeur.length > 9 ? ' textLength="100" lengthAdjust="spacingAndGlyphs"' : ""}>${escapeHtml(valeur)}</text>`;
  const valeur = (c: SchemaEcart["grand"]) => (c.connue ? nombre(c.valeur) : "?");
  let corps = boite(xBarres, y1, place, st.trait, valeur(s.grand))
    + boite(xBarres, y2, lPetit, st.parties[0], valeur(s.petit))
    + boite(xBarres + lPetit, y2, place - lPetit, st.parties[1], nombre(s.ecart), true)
    + nom(y1 + h / 2, s.grand.nom) + nom(y2 + h / 2, s.petit.nom);
  let bas = y2 + h;
  if (mots) {
    corps += `<text x="${arrondi(xBarres + lPetit + (place - lPetit) / 2)}" y="${bas + 17}" text-anchor="middle" dominant-baseline="central" `
      + `font-family="${police}" font-size="16" font-weight="600" letter-spacing="1" fill="#222">ÉCART</text>`;
    bas += 32;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LARGEUR} ${bas + 8}" role="img" aria-label="Schéma en barres">${corps}</svg>`;
}

/** Le schéma de l'affiche : les nombres donnés, « ? » à la place de ce qu'on cherche — comme dans les guides. */
export function schemaDeLAffiche(p: ProblemeAffiche, mots: boolean): string {
  const st: StyleSchema = { ...STYLE_CLASSE, images: "non", etiquettes: true, motTout: mots ? "TOUT" : "", motPartie: mots ? "PARTIE" : "" };
  return p.schema.forme === "ecart" ? schemaEcart(p.schema, st, mots) : schemaSvg(p.schema, "nombres", st);
}

// ── L'affiche ─────────────────────────────────────────────────────────────

/** « Le problème des billes de Léo », ou à défaut la sorte du problème. */
export function titreAfficheProbleme(brut: Partial<ReglagesAfficheProbleme>): string {
  const r = reglagesAfficheProblemeSurs(brut);
  const c = categorie(r.categorie);
  return r.nom.trim() || `Problème de référence · ${c.famille} · ${c.nom}`;
}

/** Les textes de l'affiche : ceux de la classe, sinon ceux de Maitrize. */
export function textesDeLAffiche(r: ReglagesAfficheProbleme, p: ProblemeAffiche) {
  return { enonce: r.enonce.trim() || p.enonce, comprendre: r.comprendre.trim() || p.comprendre, phrase: r.phrase.trim() || p.phrase };
}

export function htmlAfficheProbleme(brut: Partial<ReglagesAfficheProbleme>): string {
  const r = reglagesAfficheProblemeSurs(brut);
  const p = problemeDeLAffiche(r);
  if (!p) return feuille("", "pa");
  const c = categorie(r.categorie);
  const t = textesDeLAffiche(r, p);
  const etapes: { cle: string; titre: string; contenu: string }[] = [
    { cle: "probleme", titre: "Le problème", contenu: `<p class="pa-enonce">${escapeHtml(t.enonce)}</p>` },
    ...(r.etapeComprendre ? [{ cle: "comprendre", titre: "Je comprends", contenu: `<p class="pa-comprendre">${escapeHtml(t.comprendre)}</p>` }] : []),
    { cle: "representer", titre: "Je représente", contenu: `<div class="pa-schema">${schemaDeLAffiche(p, r.mots)}</div>` },
    { cle: "calculer", titre: "Je calcule", contenu: `<p class="pa-calcul">${escapeHtml(p.calcul)}</p>` },
    { cle: "repondre", titre: "Je réponds", contenu: `<p class="pa-phrase">${escapeHtml(t.phrase)}</p>` },
  ];
  // En largeur : le problème à gauche, le schéma à droite, le calcul et la réponse dessous.
  const zones = r.etapeComprendre
    ? `"tete tete" "probleme representer" "comprendre representer" "calculer repondre"`
    : `"tete tete" "probleme representer" "probleme representer" "calculer repondre"`;
  return feuille(`<div class="page pa-page pa-${r.format}"${r.format === "paysage" ? ` style='grid-template-areas: ${zones}'` : ""}>`
    + `<div class="pa-tete"><div class="pa-sorte">${escapeHtml(`${c.famille} · ${c.nom}`)}</div>`
    + `<div class="pa-titre">${escapeHtml(r.nom.trim() || "Problème de référence")}</div></div>`
    + etapes.map((e, i) => `<section class="pa-etape pa-${e.cle}"><div class="pa-num">${i + 1}</div>`
      + `<div class="pa-corps"><div class="pa-nom">${e.titre}</div>${e.contenu}</div></section>`).join("")
    + `</div>`, "pa");
}

export function styleAfficheProbleme(brut: Partial<ReglagesAfficheProbleme>): string {
  return STYLE_AFFICHE_PROBLEME + (reglagesAfficheProblemeSurs(brut).format === "paysage" ? "@page { size: A4 landscape; margin: 10mm; }" : "");
}

const NOIR = "#1c2233";
const BLEU = "#2438d6";

export const STYLE_AFFICHE_PROBLEME = `
  /* La page prend toute la largeur utile : sans la marge du document (voir print.ts), qui la faisait réduire et décentrer. */
  @media print { body { padding: 0; } }
  .feuille.pa .pa-page { width: 182mm; height: 250mm; margin: 0 auto; box-sizing: border-box; display: flex; flex-direction: column; gap: 4mm; color: ${NOIR}; }
  .feuille.pa .pa-page.pa-paysage { width: 263mm; height: 170mm; display: grid; grid-template-columns: 1fr 1.2fr; grid-template-rows: auto auto 1fr auto;
    gap: 4mm 5mm; }
  .feuille.pa .pa-paysage .pa-tete { grid-area: tete; }
  .feuille.pa .pa-paysage .pa-probleme { grid-area: probleme; }
  .feuille.pa .pa-paysage .pa-comprendre { grid-area: comprendre; }
  .feuille.pa .pa-paysage .pa-representer { grid-area: representer; }
  .feuille.pa .pa-paysage .pa-calculer { grid-area: calculer; }
  .feuille.pa .pa-paysage .pa-repondre { grid-area: repondre; }
  .feuille.pa .pa-tete { text-align: center; }
  .feuille.pa .pa-sorte { display: inline-block; font-size: 4.2mm; font-weight: 700; color: ${BLEU}; background: #eef0fe; border-radius: 99px; padding: 1mm 4mm; }
  .feuille.pa .pa-titre { font-size: 10mm; font-weight: 800; line-height: 1.15; margin-top: 2mm; }
  .feuille.pa .pa-etape { display: flex; gap: 3.5mm; border: 0.8mm solid #cfd4e2; border-radius: 3mm; padding: 3mm 4mm; min-height: 0;
    break-inside: avoid; page-break-inside: avoid; }
  .feuille.pa .pa-portrait .pa-representer { flex: 1; }
  .feuille.pa .pa-num { flex: none; width: 9mm; height: 9mm; border-radius: 50%; background: ${BLEU}; color: #fff; font-weight: 800; font-size: 5mm;
    display: flex; align-items: center; justify-content: center; }
  .feuille.pa .pa-corps { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .feuille.pa .pa-nom { font-size: 5mm; font-weight: 800; color: ${BLEU}; margin: 1.2mm 0 1.5mm; }
  .feuille.pa .pa-enonce { font-size: 6.6mm; line-height: 1.4; margin: 0; }
  .feuille.pa .pa-paysage .pa-enonce, .feuille.pa .pa-paysage .pa-phrase { font-size: 6mm; }
  .feuille.pa .pa-comprendre { font-size: 5.6mm; line-height: 1.35; margin: 0; }
  .feuille.pa .pa-schema { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; }
  .feuille.pa .pa-schema svg { display: block; width: 100%; max-width: 150mm; max-height: 100%; height: auto; }
  .feuille.pa .pa-calcul { font-size: 11mm; font-weight: 800; text-align: center; margin: 0; white-space: nowrap; }
  .feuille.pa .pa-phrase { font-size: 6.6mm; line-height: 1.35; font-weight: 600; margin: 0; }
`;
