// Ce qui s'imprime sur la feuille d'un atelier : la consigne, le prénom, la
// correction ; et ce qui va aux tablettes : la consigne.
//
// La consigne d'une feuille — sa règle, ses étapes — se montre sur les
// tablettes de la classe pendant l'activité, plus sur le papier (demande de
// l'enseignant, octobre 2026) : la feuille est posée dans une séance, et le
// téléphone montre sa consigne avec les aides du créneau. Qui n'a pas de
// tablettes la remet sur la feuille. Sa ligne « Prénom … Date … » et sa
// correction s'impriment, sauf si on les décoche : la feuille va dans un
// cahier qui porte déjà le prénom, la correction ne sert qu'au maître.
// Quatre cases, les mêmes pour tous les ateliers, gardées par atelier dans un
// réglage partagé entre les ordinateurs.
//
// On travaille sur le HTML des feuilles telles que l'application les écrit :
// la consigne porte l'une des classes des consignes, et tout ce qui relève
// de la correction — une page, une colonne — porte la classe « corrige ».

import { CLASSES_CONSIGNE_FEUILLE } from "./consigneAtelier";

export interface OptionsFeuille {
  /** La consigne sur la feuille. */
  consigne: boolean;
  prenom: boolean;
  corrige: boolean;
  /** La consigne sur les tablettes : elle part avec la feuille posée dans une séance. */
  tablettes: boolean;
}

/** La consigne va aux tablettes, pas sur le papier ; le reste s'imprime tant qu'on ne l'a pas décoché. */
export const OPTIONS_FEUILLE: OptionsFeuille = { consigne: false, prenom: true, corrige: true, tablettes: true };

/** La version des choix enregistrés : avant la 2, « consigne » était cochée d'office, et ce choix-là ne compte plus. */
const VERSION = 2;

/** Où se gardent les choix d'un atelier — préfixe « fabriquer: », donc partagé. */
export const cleOptionsFeuille = (atelier: string) => `fabriquer:feuille:${atelier}`;

/** Émis quand un choix change : l'aperçu ouvert se met à jour. */
export const EVT_OPTIONS_FEUILLE = "maitrize:options-feuille";

/** Les choix enregistrés, tels qu'on peut s'y fier : ce qui manque reste imprimé. */
export function lireOptionsFeuille(brut: string | null | undefined): OptionsFeuille {
  if (!brut) return OPTIONS_FEUILLE;
  try {
    const lu = JSON.parse(brut);
    if (!lu || typeof lu !== "object" || Array.isArray(lu)) return OPTIONS_FEUILLE;
    const o = lu as Record<string, unknown>;
    // Un choix d'avant la version 2 : la consigne passe aux tablettes, le prénom et la correction restent comme on les avait laissés.
    const recent = o.v === VERSION;
    return {
      consigne: recent ? o.consigne === true : false, prenom: o.prenom !== false, corrige: o.corrige !== false,
      tablettes: recent ? o.tablettes !== false : true,
    };
  } catch {
    return OPTIONS_FEUILLE;
  }
}

export const ecrireOptionsFeuille = (o: OptionsFeuille) => JSON.stringify({ v: VERSION, ...o });

const OUVERTURE = /<([a-z][a-z0-9]*)\b([^>]*)>/gi;

/** La fin de l'élément ouvert juste avant `debut` : après sa balise fermante, celles de même nom imbriquées comptées. */
function finDeLElement(html: string, balise: string, debut: number): number {
  const re = new RegExp(`<(/?)${balise}\\b[^>]*>`, "gi");
  re.lastIndex = debut;
  let profondeur = 1;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    if (m[0].endsWith("/>")) continue;
    profondeur += m[1] ? -1 : 1;
    if (profondeur === 0) return m.index + m[0].length;
  }
  return -1;
}

/** Le HTML sans les éléments dont les classes (et la balise) répondent à `aRetirer` — eux, et tout ce qu'ils contiennent. */
export function retirerElements(html: string, aRetirer: (classes: string[], balise: string) => boolean): string {
  let sortie = "";
  let position = 0;
  OUVERTURE.lastIndex = 0;
  for (let m = OUVERTURE.exec(html); m; m = OUVERTURE.exec(html)) {
    const classes = /\bclass="([^"]*)"/.exec(m[2])?.[1];
    if (!classes || m[0].endsWith("/>") || !aRetirer(classes.split(/\s+/), m[1].toLowerCase())) continue;
    const fin = finDeLElement(html, m[1], m.index + m[0].length);
    if (fin < 0) continue;
    sortie += html.slice(position, m.index);
    position = fin;
    OUVERTURE.lastIndex = fin;
  }
  return sortie + html.slice(position);
}

// La ligne « Prénom … Date … » d'une feuille, ou les deux mentions séparées d'une ardoise.
const LIGNE_PRENOM = /<(div|p|span)\b[^>]*>\s*(?:Prénom|Date)\s*:[^<]*<\/\1>/g;

/** Ce que la feuille contient, pour ne proposer que les cases qui ont un effet. */
export const contenuDeLaFeuille = (html: string): OptionsFeuille => {
  const consigne = new RegExp(`\\bclass="[^"]*\\b(${CLASSES_CONSIGNE_FEUILLE.join("|")})\\b`).test(html);
  return {
    consigne, tablettes: consigne,
    prenom: new RegExp(LIGNE_PRENOM.source).test(html),
    corrige: /\bclass="(?:[^"]* )?corrige(?: [^"]*)?"/.test(html),
  };
};

/**
 * Une consigne de la feuille : un bloc — une règle, une consigne en tête —,
 * pas la consigne d'un exercice écrite dans sa ligne (« 1. Écris chaque
 * nombre en lettres »), qui reste avec l'exercice.
 */
const estUneConsigne = (classes: string[], balise: string) => balise !== "span" && classes.some((c) => CLASSES_CONSIGNE_FEUILLE.includes(c));

/** Les éléments de consigne et de règle de la feuille, dans l'ordre, chacun entier : ce que les tablettes montrent. */
export function consignesDeLaFeuille(html: string): string[] {
  const trouvees: string[] = [];
  OUVERTURE.lastIndex = 0;
  for (let m = OUVERTURE.exec(html); m; m = OUVERTURE.exec(html)) {
    const classes = /\bclass="([^"]*)"/.exec(m[2])?.[1];
    if (!classes || m[0].endsWith("/>") || !estUneConsigne(classes.split(/\s+/), m[1].toLowerCase())) continue;
    const fin = finDeLElement(html, m[1], m.index + m[0].length);
    if (fin < 0) continue;
    trouvees.push(html.slice(m.index, fin));
    OUVERTURE.lastIndex = fin;
  }
  return trouvees;
}

/** La feuille telle qu'elle doit sortir : sans ce qu'on a décoché. */
export function appliquerOptionsFeuille(html: string, o: OptionsFeuille): string {
  let h = html;
  if (!o.corrige) h = retirerElements(h, (classes) => classes.includes("corrige"));
  if (!o.consigne) h = retirerElements(h, estUneConsigne);
  if (!o.prenom) h = h.replace(LIGNE_PRENOM, "");
  return h;
}

// ── Ce que les aperçus publient ────────────────────────────────────────────
//
// Les cases sont dans le bandeau de l'atelier ; c'est l'aperçu, plus bas, qui
// connaît la feuille. Il dit ici ce qu'elle contient.

const contenus: Record<string, OptionsFeuille> = {};
const abonnes = new Set<() => void>();
const RIEN: OptionsFeuille = { consigne: false, prenom: false, corrige: false, tablettes: false };

export const feuillesPubliees = {
  lire: (atelier: string): OptionsFeuille => contenus[atelier] ?? RIEN,
  /** Vrai dès que l'aperçu de l'atelier a montré une feuille : le mode dyslexique s'y propose. */
  connue: (atelier: string): boolean => atelier in contenus,
  publier(atelier: string, contenu: OptionsFeuille) {
    const avant = contenus[atelier];
    if (!atelier || (avant && avant.consigne === contenu.consigne && avant.prenom === contenu.prenom && avant.corrige === contenu.corrige
      && avant.tablettes === contenu.tablettes)) return;
    contenus[atelier] = contenu;
    abonnes.forEach((f) => f());
  },
  abonner(f: () => void) { abonnes.add(f); return () => { abonnes.delete(f); }; },
};
