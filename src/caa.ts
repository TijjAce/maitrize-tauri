// CAA — communication alternative et augmentée : les consignes en pictogrammes.
//
// « Écris le nombre. » ne dit rien à qui ne lit pas encore, ou lit sans
// comprendre. Le pictogramme du verbe, lui, se lit d'un coup d'œil : lire,
// écrire, colorier, entourer, découper. L'enseignant choisit une fois, pour
// chaque verbe d'action, le pictogramme qu'il veut voir — celui que ses
// élèves connaissent —, et chaque feuille de Fabriquer met ces pictogrammes
// devant ses consignes, sans qu'on ait rien à faire de plus. Ils viennent
// d'ARASAAC ; à défaut, des consignes de F. Bajard, puis de Sclera (voir
// pictosAppoint).
//
// Le lexique vit dans un réglage partagé entre les ordinateurs ; il se
// coupe d'un geste pour une feuille qui n'en veut pas.

import type { BanqueAppoint, PictoAppoint } from "./api";
import { escapeHtml } from "./print";
import { banqueDe, mentionDesPictos, parMot, type RefPicto } from "./pictosAppoint";

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
  { verbe: "retrouver", formes: ["retrouve", "retrouvez", "retrouvons"] },
  { verbe: "remettre", formes: ["remets", "remettez", "remettons"] },
  { verbe: "décomposer", formes: ["décompose", "décomposez", "décomposons"] },
  { verbe: "ajouter", formes: ["ajoute", "ajoutez", "ajoutons"] },
  { verbe: "retrancher", formes: ["retranche", "retranchez", "retranchons"] },
  { verbe: "additionner", formes: ["additionne", "additionnez", "additionnons"] },
  { verbe: "réfléchir", formes: ["réfléchis", "réfléchissez", "réfléchissons"] },
  { verbe: "glisser", formes: ["glisse", "glissez", "glissons"] },
  { verbe: "jouer", formes: ["joue", "jouez", "jouons"] },
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
  // Les consignes que dessine F. Bajard, et qui n'étaient pas encore là.
  { verbe: "corriger", formes: ["corrige", "corrigez", "corrigeons"] },
  { verbe: "numéroter", formes: ["numérote", "numérotez", "numérotons"] },
  { verbe: "raconter", formes: ["raconte", "racontez", "racontons"] },
  { verbe: "relire", formes: ["relis", "relisez", "relisons"] },
  { verbe: "repasser", formes: ["repasse", "repassez", "repassons"] },
  { verbe: "séparer", formes: ["sépare", "séparez", "séparons"] },
  { verbe: "surligner", formes: ["surligne", "surlignez", "surlignons"] },
  { verbe: "tracer", formes: ["trace", "tracez", "traçons"] },
];

/**
 * Les mots sous lesquels la banque connaît un verbe qu'elle ne nomme pas
 * ainsi : ARASAAC dit « trouver » et « chercher », pas « retrouver » ; « mettre
 * dans l'ordre » plutôt que « remettre ». Dans l'ordre où l'on préfère.
 */
export const SYNONYMES_CONSIGNE: Record<string, string[]> = {
  retrouver: ["trouver", "chercher"],
  remettre: ["mettre dans l'ordre", "ordonner", "ranger"],
  recopier: ["copier"],
  colorier: ["peindre"],
  barrer: ["rayer"],
  retrancher: ["soustraire", "ôter"],
  ajouter: ["additionner"],
  décomposer: ["décomposition"],
  vérifier: ["contrôler"],
  associer: ["relier", "apparier"],
};

/**
 * Les verbes qu'ARASAAC ne dessine que dans un autre sens que celui de la
 * classe, faute de mieux : « numéroter », c'est pour lui composer un numéro de
 * téléphone ; « poser », poser pour un portrait. Sans dessin de la classe, on
 * va chercher ailleurs.
 */
export const SENS_ETRANGERS_ARASAAC = new Set(["numéroter", "poser"]);

/** Les mots à demander à la banque pour un verbe : lui-même, puis ses synonymes. */
export const motsAChercher = (verbe: string): string[] => [verbe, ...(SYNONYMES_CONSIGNE[verbe] ?? [])];

/**
 * Le picto proposé à chaque verbe, parmi ce que la banque a trouvé : le
 * dessin de la classe d'abord (`scolaire`), sous le verbe lui-même ou sous un
 * synonyme ; sinon, sous le verbe lui-même, puis sous le premier synonyme qui
 * a une image — sauf pour un verbe qu'ARASAAC ne dessine que dans un autre sens.
 */
export function pictosProposes(verbes: string[], trouves: { id: number; mot: string; scolaire?: boolean }[]): Record<string, number> {
  const parMot = new Map(trouves.map((p) => [p.mot.toLowerCase(), p]));
  const sortie: Record<string, number> = {};
  for (const verbe of verbes) {
    const candidats = motsAChercher(verbe).map((m) => parMot.get(m.toLowerCase())).filter((p) => p !== undefined);
    const choisi = candidats.find((p) => p.scolaire) ?? (SENS_ETRANGERS_ARASAAC.has(verbe) ? undefined : candidats[0]);
    if (choisi) sortie[verbe] = choisi.id;
  }
  return sortie;
}

/**
 * Les mots à demander à une banque d'appoint pour un verbe. Les consignes de
 * F. Bajard sont nommées à l'impératif (« Colorie », « Écris ») ; Sclera, à
 * l'infinitif, comme ARASAAC.
 */
export function motsPourLaBanque(verbe: string, banque: BanqueAppoint): string[] {
  if (banque !== "bajard") return motsAChercher(verbe);
  const formes = VERBES_CONSIGNE.find((v) => v.verbe === verbe)?.formes ?? [];
  return [...formes, ...motsAChercher(verbe)];
}

/** Le picto proposé à chaque verbe dans une banque d'appoint : sous le premier de ses mots qu'elle connaît. */
export function pictosAppointProposes(verbes: string[], trouves: PictoAppoint[], banque: BanqueAppoint): Record<string, string> {
  const references = parMot(trouves);
  const sortie: Record<string, string> = {};
  for (const verbe of verbes) {
    const ref = motsPourLaBanque(verbe, banque).map((m) => references.get(m.toLowerCase())).find((x) => x !== undefined);
    if (ref !== undefined) sortie[verbe] = ref;
  }
  return sortie;
}

export const CLE_LEXIQUE = "caa:consignes";
export const CLE_ACTIF = "caa:consignes:actif";
/** Émis quand le lexique change : les ateliers ouverts se mettent à jour. */
export const EVT_LEXIQUE = "maitrize:caa-lexique";

/** Le pictogramme choisi pour chaque verbe : son numéro ARASAAC, ou sa référence dans une banque d'appoint. */
export type Lexique = Record<string, RefPicto>;

const plat = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Le lexique enregistré, tel qu'on peut s'y fier. */
export function lireLexique(brut: string | null | undefined): Lexique {
  if (!brut) return {};
  try {
    const lu = JSON.parse(brut);
    if (!lu || typeof lu !== "object" || Array.isArray(lu)) return {};
    const sortie: Lexique = {};
    for (const [verbe, id] of Object.entries(lu as Record<string, unknown>)) {
      if (!verbe.trim()) continue;
      const n = Number(id);
      if (Number.isInteger(n) && n > 0) sortie[verbe.trim()] = n;
      else if (banqueDe(id) && typeof id === "string") sortie[verbe.trim()] = id;
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

/** Les verbes d'action d'un texte, dans l'ordre, une fois chacun — qu'ils aient un picto ou non. */
export function verbesDuTexte(texte: string): string[] {
  const sortie: string[] = [];
  for (const mot of plat(texte).split(/[^a-z]+/)) {
    const verbe = FORMES.get(mot);
    if (verbe && !sortie.includes(verbe)) sortie.push(verbe);
  }
  return sortie;
}

/** Le verbe de consigne d'un mot, quelle que soit sa forme : « Découpe » → « découper » ; rien s'il n'en est pas un. */
export const verbeDeLaForme = (mot: string): string | undefined => FORMES.get(plat(mot));

/** Les verbes d'une consigne, dans l'ordre du texte, une fois chacun — ceux qui ont un picto. */
export const verbesDe = (texte: string, lexique: Lexique): string[] => verbesDuTexte(texte).filter((v) => lexique[v]);

/** Les verbes connus, pour en proposer un à ajouter. */
export const estUnVerbeConnu = (verbe: string) => VERBES_CONSIGNE.some((v) => v.verbe === verbe);

/**
 * Les classes des éléments qui portent une consigne pour l'élève, dans les
 * feuilles — la règle encadrée des jeux comprise : c'est là que la plupart
 * disent quoi faire.
 */
export const CLASSES_CONSIGNE = ["consigne", "cu-consigne", "ls-consigne", "fa-consigne", "regle"];

/** Les pictos de ces verbes, en ligne, chacun sous son mot. */
export function htmlPictosVerbes(verbes: string[], lexique: Lexique, images: Record<string, string>): string {
  const pictos = verbes
    .filter((v) => images[lexique[v]])
    .map((v) => `<span class="consigne-picto"><img src="${images[lexique[v]]}" alt="${escapeHtml(v)}"><small>${escapeHtml(v)}</small></span>`);
  return pictos.length ? `<span class="consigne-pictos">${pictos.join("")}</span>` : "";
}

/**
 * Où poser les pictos dans un élément, et le texte qui dit ses verbes.
 *
 * Une règle encadrée a des titres en gras — « Fabrication », « Jeu » — et
 * chaque section dit ses propres gestes : les pictos viennent après le titre,
 * en tête du texte qu'ils illustrent. Sans titre, une seule section, en tête.
 */
function sectionsDe(interieur: string, regle: boolean): { offset: number; fin: number; texte: string }[] {
  const texteDe = (h: string) => h.replace(/<[^>]*>/g, " ");
  const tout = [{ offset: 0, fin: interieur.length, texte: texteDe(interieur) }];
  if (!regle) return tout;
  const titre = /<b\b[^>]*>[\s\S]*?<\/b>/g;
  const titres: { debut: number; fin: number }[] = [];
  for (let m = titre.exec(interieur); m; m = titre.exec(interieur)) titres.push({ debut: m.index, fin: m.index + m[0].length });
  if (!titres.length) return tout;
  const sections: { offset: number; fin: number; texte: string }[] = [];
  const avant = interieur.slice(0, titres[0].debut);
  if (texteDe(avant).trim()) sections.push({ offset: 0, fin: titres[0].debut, texte: texteDe(avant) });
  titres.forEach((t, i) => {
    const fin = i + 1 < titres.length ? titres[i + 1].debut : interieur.length;
    sections.push({ offset: t.fin, fin, texte: texteDe(interieur.slice(t.fin, fin)) });
  });
  return sections;
}

/**
 * Les consignes d'une feuille, avec les pictos de leurs verbes devant.
 *
 * On travaille sur le HTML des feuilles telles que l'application les écrit :
 * les consignes y sont des éléments simples, sans balise imbriquée. Les
 * verbes ajoutés à la main (`supplement`) viennent devant la première
 * consigne — ou en tête de la feuille si elle n'en marque aucune. Rien ne
 * change pour une feuille sans consigne ni ajout ; celle qui gagne des
 * pictos porte la mention qu'exigent les licences de leurs banques, si elle
 * ne les cite pas déjà.
 */
export function decorerConsignesHtml(html: string, lexique: Lexique, images: Record<string, string>, supplement: string[] = []): string {
  if (!Object.keys(lexique).length) return html;
  const ouverture = /<(h[1-6]|p|div|span)\b([^>]*\bclass="([^"]*)"[^>]*)>/g;
  let sortie = "";
  let position = 0;
  let premiere = true;
  const ajoutes = supplement.filter((v) => lexique[v]);
  /** Les pictos posés, pour la mention de leurs banques. */
  const poses: RefPicto[] = [];
  const poser = (verbes: string[]) => {
    for (const v of verbes) if (images[lexique[v]]) poses.push(lexique[v]);
    return htmlPictosVerbes(verbes, lexique, images);
  };
  // Une consigne structurée (voir consignesStructurees) : chaque étape porte
  // les pictos de ses verbes, juste après son numéro — un geste par ligne.
  const etape = /(<li class="cs-etape[^"]*">)((?:<span class="cs-num[^"]*"[^>]*>[^<]*<\/span>)?)(<span class="cs-texte">)([\s\S]*?)(<\/li>)/g;
  let etapes = "";
  let depuis = 0;
  for (let m = etape.exec(html); m; m = etape.exec(html)) {
    if (m[4].includes("consigne-pictos")) { premiere = false; continue; }
    const trouves = verbesDe(m[4].replace(/<[^>]*>/g, " "), lexique);
    const verbes = premiere ? [...ajoutes, ...trouves.filter((v) => !ajoutes.includes(v))] : trouves;
    premiere = false;
    const pictos = poser(verbes);
    if (!pictos) continue;
    etapes += html.slice(depuis, m.index) + m[1] + m[2] + pictos + m[3] + m[4] + m[5];
    depuis = m.index + m[0].length;
  }
  if (depuis > 0) html = etapes + html.slice(depuis);
  for (let m = ouverture.exec(html); m; m = ouverture.exec(html)) {
    const classes = m[3].split(/\s+/);
    if (!classes.some((c) => CLASSES_CONSIGNE.includes(c)) || classes.includes("cs")) continue;
    const debut = m.index + m[0].length;
    const fin = html.indexOf(`</${m[1]}>`, debut);
    if (fin < 0) continue;
    const interieur = html.slice(debut, fin);
    if (interieur.includes("consigne-pictos")) { premiere = false; continue; }
    for (const s of sectionsDe(interieur, classes.includes("regle"))) {
      const trouves = verbesDe(s.texte, lexique);
      const verbes = premiere ? [...ajoutes, ...trouves.filter((v) => !ajoutes.includes(v))] : trouves;
      premiere = false;
      const pictos = poser(verbes);
      if (!pictos) continue;
      // Les pictos à gauche, le texte en bloc à droite : une consigne longue
      // passe à la ligne sous ses propres mots, pas sous les images.
      sortie += html.slice(position, debut + s.offset)
        + `<span class="consigne-ligne">${pictos}<span class="consigne-texte">${html.slice(debut + s.offset, debut + s.fin)}</span></span>`;
      position = debut + s.fin;
    }
  }
  if (premiere && ajoutes.length) {
    // Aucune consigne marquée : les pictos ajoutés font une ligne à eux, en tête.
    const bande = poser(ajoutes);
    if (bande) { sortie = `<div class="consigne consigne-seule">${bande}</div>` + html; position = html.length; }
  }
  if (!poses.length) return html;
  sortie += html.slice(position);
  return sortie + mentionDesPictos(poses, sortie);
}

/** Le style des pictos devant une consigne, à l'écran comme sur le papier. */
export const STYLE_CONSIGNES_PICTOS = `
  .consigne-ligne { display: flex; align-items: center; gap: 4mm; }
  .consigne-ligne > .consigne-pictos { margin: 0; flex: none; }
  .consigne-texte { flex: 1; min-width: 0; }
  .consigne-pictos { display: inline-flex; gap: 3mm; align-items: flex-end; vertical-align: middle; margin: 0 4mm 1mm 0; }
  .consigne-picto { display: inline-flex; flex-direction: column; align-items: center; gap: 0.5mm; }
  .consigne-picto img { width: 12mm; height: 12mm; object-fit: contain; margin: 0; max-height: none; border-radius: 1.5mm; }
  .consigne-picto small { font-size: 8px; color: #555; text-transform: none; letter-spacing: 0; font-weight: 500; }
  .regle .consigne-picto img { width: 10mm; height: 10mm; }
  .consigne-attribution { font-size: 8px; color: #888; margin-top: 8px; text-align: center; }
  .consigne-seule { margin: 0 0 4mm; }
`;
