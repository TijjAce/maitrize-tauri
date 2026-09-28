// CAA — communication alternative et augmentée : les consignes en pictogrammes.
//
// « Écris le nombre. » ne dit rien à qui ne lit pas encore, ou lit sans
// comprendre. Le pictogramme du verbe, lui, se lit d'un coup d'œil : lire,
// écrire, colorier, entourer, découper. L'enseignant choisit une fois, pour
// chaque verbe d'action, le pictogramme ARASAAC qu'il veut voir — celui que
// ses élèves connaissent —, et chaque feuille de Fabriquer met ces
// pictogrammes devant ses consignes, sans qu'on ait rien à faire de plus.
//
// Le lexique vit dans un réglage partagé entre les ordinateurs ; il se
// coupe d'un geste pour une feuille qui n'en veut pas.

import { escapeHtml } from "./print";

export interface VerbeConsigne {
  verbe: string;
  /** Les formes qu'on rencontre dans une consigne : impératif, présent, infinitif. */
  formes: string[];
}

/** Les verbes d'action des consignes de classe, avec leurs formes courantes. */
export const VERBES_CONSIGNE: VerbeConsigne[] = [
  { verbe: "lire", formes: ["lis", "lisez", "lisons", "lit"] },
  { verbe: "écrire", formes: ["écris", "écrivez", "écrivons", "écrit"] },
  { verbe: "copier", formes: ["copie", "copiez", "copions"] },
  { verbe: "recopier", formes: ["recopie", "recopiez", "recopions"] },
  { verbe: "colorier", formes: ["colorie", "coloriez", "colorions"] },
  { verbe: "entourer", formes: ["entoure", "entourez", "entourons"] },
  { verbe: "barrer", formes: ["barre", "barrez", "barrons"] },
  { verbe: "souligner", formes: ["souligne", "soulignez", "soulignons"] },
  { verbe: "relier", formes: ["relie", "reliez", "relions"] },
  { verbe: "compter", formes: ["compte", "comptez", "comptons"] },
  { verbe: "calculer", formes: ["calcule", "calculez", "calculons"] },
  { verbe: "dessiner", formes: ["dessine", "dessinez", "dessinons"] },
  { verbe: "découper", formes: ["découpe", "découpez", "découpons"] },
  { verbe: "coller", formes: ["colle", "collez", "collons"] },
  { verbe: "compléter", formes: ["complète", "complétez", "complétons"] },
  { verbe: "cocher", formes: ["coche", "cochez", "cochons"] },
  { verbe: "trier", formes: ["trie", "triez", "trions"] },
  { verbe: "ranger", formes: ["range", "rangez", "rangeons"] },
  { verbe: "classer", formes: ["classe", "classez", "classons"] },
  { verbe: "écouter", formes: ["écoute", "écoutez", "écoutons"] },
  { verbe: "dire", formes: ["dis", "dites", "disons", "dit"] },
  { verbe: "nommer", formes: ["nomme", "nommez", "nommons"] },
  { verbe: "montrer", formes: ["montre", "montrez", "montrons"] },
  { verbe: "choisir", formes: ["choisis", "choisissez", "choisissons", "choisit"] },
  { verbe: "regarder", formes: ["regarde", "regardez", "regardons"] },
  { verbe: "observer", formes: ["observe", "observez", "observons"] },
  { verbe: "chercher", formes: ["cherche", "cherchez", "cherchons"] },
  { verbe: "trouver", formes: ["trouve", "trouvez", "trouvons"] },
  { verbe: "placer", formes: ["place", "placez", "plaçons"] },
  { verbe: "poser", formes: ["pose", "posez", "posons"] },
  { verbe: "mesurer", formes: ["mesure", "mesurez", "mesurons"] },
  { verbe: "comparer", formes: ["compare", "comparez", "comparons"] },
  { verbe: "associer", formes: ["associe", "associez", "associons"] },
  { verbe: "encadrer", formes: ["encadre", "encadrez", "encadrons"] },
  { verbe: "plier", formes: ["plie", "pliez", "plions"] },
  { verbe: "piocher", formes: ["pioche", "piochez", "piochons"] },
  { verbe: "retourner", formes: ["retourne", "retournez", "retournons"] },
  { verbe: "lancer", formes: ["lance", "lancez", "lançons"] },
  { verbe: "vérifier", formes: ["vérifie", "vérifiez", "vérifions"] },
  { verbe: "effacer", formes: ["efface", "effacez", "effaçons"] },
];

export const CLE_LEXIQUE = "caa:consignes";
export const CLE_ACTIF = "caa:consignes:actif";

/** Le pictogramme choisi pour chaque verbe : l'identifiant ARASAAC. */
export type Lexique = Record<string, number>;

const plat = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Le lexique enregistré, tel qu'on peut s'y fier. */
export function lireLexique(brut: string | null | undefined): Lexique {
  if (!brut) return {};
  try {
    const lu = JSON.parse(brut);
    if (!lu || typeof lu !== "object" || Array.isArray(lu)) return {};
    const sortie: Lexique = {};
    for (const [verbe, id] of Object.entries(lu as Record<string, unknown>)) {
      const n = Number(id);
      if (verbe.trim() && Number.isInteger(n) && n > 0) sortie[verbe.trim()] = n;
    }
    return sortie;
  } catch {
    return {};
  }
}

export const ecrireLexique = (lexique: Lexique) => JSON.stringify(lexique);

/** Les pictos des consignes sont en marche dès qu'un verbe a le sien, sauf si on les a coupés. */
export const consignesActives = (reglage: string | null | undefined, lexique: Lexique) =>
  reglage !== "0" && Object.keys(lexique).length > 0;

/** Chaque forme, normalisée, vers son verbe. */
const FORMES: Map<string, string> = new Map(
  VERBES_CONSIGNE.flatMap((v) => [v.verbe, ...v.formes].map((f) => [plat(f), v.verbe] as const)),
);

/** Les verbes d'une consigne, dans l'ordre du texte, une fois chacun — ceux qui ont un picto. */
export function verbesDe(texte: string, lexique: Lexique): string[] {
  const sortie: string[] = [];
  for (const mot of plat(texte).split(/[^a-z]+/)) {
    const verbe = FORMES.get(mot);
    if (verbe && lexique[verbe] && !sortie.includes(verbe)) sortie.push(verbe);
  }
  return sortie;
}

/** Les classes des éléments qui portent une consigne pour l'élève, dans les feuilles. */
export const CLASSES_CONSIGNE = ["consigne", "cu-consigne", "ls-consigne", "fa-consigne"];

/** Les pictos de ces verbes, en ligne, chacun sous son mot. */
export function htmlPictosVerbes(verbes: string[], lexique: Lexique, images: Record<number, string>): string {
  const pictos = verbes
    .filter((v) => images[lexique[v]])
    .map((v) => `<span class="consigne-picto"><img src="${images[lexique[v]]}" alt="${escapeHtml(v)}"><small>${escapeHtml(v)}</small></span>`);
  return pictos.length ? `<span class="consigne-pictos">${pictos.join("")}</span>` : "";
}

const MENTION_ARASAAC = `<div class="consigne-attribution">Pictogrammes : ARASAAC (arasaac.org) — Gouvernement d'Aragon, licence CC BY-NC-SA. Usage non commercial.</div>`;

/**
 * Les consignes d'une feuille, avec les pictos de leurs verbes devant.
 *
 * On travaille sur le HTML des feuilles telles que l'application les écrit :
 * les consignes y sont des éléments simples, sans balise imbriquée. Rien ne
 * change pour une feuille sans consigne ; celle qui en gagne porte la
 * mention exigée par la licence des pictogrammes, si elle ne l'avait pas.
 */
export function decorerConsignesHtml(html: string, lexique: Lexique, images: Record<number, string>): string {
  if (!Object.keys(lexique).length) return html;
  const ouverture = /<(h[1-6]|p|div|span)\b([^>]*\bclass="([^"]*)"[^>]*)>/g;
  let sortie = "";
  let position = 0;
  let decore = false;
  for (let m = ouverture.exec(html); m; m = ouverture.exec(html)) {
    const classes = m[3].split(/\s+/);
    if (!classes.some((c) => CLASSES_CONSIGNE.includes(c))) continue;
    const debut = m.index + m[0].length;
    const fin = html.indexOf(`</${m[1]}>`, debut);
    if (fin < 0) continue;
    const interieur = html.slice(debut, fin);
    if (interieur.includes("consigne-pictos")) continue;
    const pictos = htmlPictosVerbes(verbesDe(interieur.replace(/<[^>]*>/g, " "), lexique), lexique, images);
    if (!pictos) continue;
    sortie += html.slice(position, debut) + pictos;
    position = debut;
    decore = true;
  }
  if (!decore) return html;
  sortie += html.slice(position);
  return sortie.includes("ARASAAC") ? sortie : sortie + MENTION_ARASAAC;
}

/** Le style des pictos devant une consigne, à l'écran comme sur le papier. */
export const STYLE_CONSIGNES_PICTOS = `
  .consigne-pictos { display: inline-flex; gap: 3mm; align-items: flex-end; vertical-align: middle; margin: 0 4mm 1mm 0; }
  .consigne-picto { display: inline-flex; flex-direction: column; align-items: center; gap: 0.5mm; }
  .consigne-picto img { width: 12mm; height: 12mm; object-fit: contain; margin: 0; max-height: none; border-radius: 1.5mm; }
  .consigne-picto small { font-size: 8px; color: #555; text-transform: none; letter-spacing: 0; font-weight: 500; }
  .consigne-attribution { font-size: 8px; color: #888; margin-top: 8px; text-align: center; }
`;
