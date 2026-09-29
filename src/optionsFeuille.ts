// Ce qui s'imprime sur la feuille d'un atelier : la consigne, le prénom, la
// correction.
//
// Une feuille sort avec sa consigne, sa ligne « Prénom … Date … » et, quand
// l'atelier en fabrique une, sa correction. Ce n'est pas toujours voulu : la
// consigne se dit à l'oral, la correction ne sert qu'au maître, la feuille va
// dans un cahier qui porte déjà le prénom. Trois cases, les mêmes pour tous
// les ateliers, gardées par atelier dans un réglage partagé entre les
// ordinateurs.
//
// On travaille sur le HTML des feuilles telles que l'application les écrit :
// la consigne porte l'une des classes des consignes, et tout ce qui relève
// de la correction — une page, une colonne — porte la classe « corrige ».

import { CLASSES_CONSIGNE_FEUILLE } from "./consigneAtelier";

export interface OptionsFeuille { consigne: boolean; prenom: boolean; corrige: boolean }

/** Tout s'imprime tant qu'on n'a rien décoché. */
export const OPTIONS_FEUILLE: OptionsFeuille = { consigne: true, prenom: true, corrige: true };

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
    return { consigne: o.consigne !== false, prenom: o.prenom !== false, corrige: o.corrige !== false };
  } catch {
    return OPTIONS_FEUILLE;
  }
}

export const ecrireOptionsFeuille = (o: OptionsFeuille) => JSON.stringify(o);

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

/** Le HTML sans les éléments dont les classes répondent à `aRetirer` — eux, et tout ce qu'ils contiennent. */
export function retirerElements(html: string, aRetirer: (classes: string[]) => boolean): string {
  let sortie = "";
  let position = 0;
  OUVERTURE.lastIndex = 0;
  for (let m = OUVERTURE.exec(html); m; m = OUVERTURE.exec(html)) {
    const classes = /\bclass="([^"]*)"/.exec(m[2])?.[1];
    if (!classes || m[0].endsWith("/>") || !aRetirer(classes.split(/\s+/))) continue;
    const fin = finDeLElement(html, m[1], m.index + m[0].length);
    if (fin < 0) continue;
    sortie += html.slice(position, m.index);
    position = fin;
    OUVERTURE.lastIndex = fin;
  }
  return sortie + html.slice(position);
}

const LIGNE_PRENOM = /<(div|p)\b[^>]*>\s*Prénom\s*:[^<]*<\/\1>/g;

/** Ce que la feuille contient, pour ne proposer que les cases qui ont un effet. */
export const contenuDeLaFeuille = (html: string): OptionsFeuille => ({
  consigne: new RegExp(`\\bclass="[^"]*\\b(${CLASSES_CONSIGNE_FEUILLE.join("|")})\\b`).test(html),
  prenom: new RegExp(LIGNE_PRENOM.source).test(html),
  corrige: /\bclass="(?:[^"]* )?corrige(?: [^"]*)?"/.test(html),
});

/** La feuille telle qu'elle doit sortir : sans ce qu'on a décoché. */
export function appliquerOptionsFeuille(html: string, o: OptionsFeuille): string {
  let h = html;
  if (!o.corrige) h = retirerElements(h, (classes) => classes.includes("corrige"));
  if (!o.consigne) h = retirerElements(h, (classes) => classes.some((c) => CLASSES_CONSIGNE_FEUILLE.includes(c)));
  if (!o.prenom) h = h.replace(LIGNE_PRENOM, "");
  return h;
}

// ── Ce que les aperçus publient ────────────────────────────────────────────
//
// Les cases sont dans le bandeau de l'atelier ; c'est l'aperçu, plus bas, qui
// connaît la feuille. Il dit ici ce qu'elle contient.

const contenus: Record<string, OptionsFeuille> = {};
const abonnes = new Set<() => void>();
const RIEN: OptionsFeuille = { consigne: false, prenom: false, corrige: false };

export const feuillesPubliees = {
  lire: (atelier: string): OptionsFeuille => contenus[atelier] ?? RIEN,
  publier(atelier: string, contenu: OptionsFeuille) {
    const avant = contenus[atelier];
    if (!atelier || (avant && avant.consigne === contenu.consigne && avant.prenom === contenu.prenom && avant.corrige === contenu.corrige)) return;
    contenus[atelier] = contenu;
    abonnes.forEach((f) => f());
  },
  abonner(f: () => void) { abonnes.add(f); return () => { abonnes.delete(f); }; },
};
