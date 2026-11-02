// ── Le prévu d'un créneau de groupe, élève par élève ──────────────────────
//
// Demandes de l'enseignant (2026-11-02) : « il faudrait sur le planning
// pouvoir distinguer les élèves pour que chaque élève ait son picto — son
// planning de créneaux », puis : « un bouton qui permet de surligner l'élève
// et ce qu'il doit faire, et après ça suit dans l'ordre chronologique : deux
// élèves peuvent faire la même chose, mais pas au même moment ».
//
// Dans un créneau à plusieurs élèves, une ligne qui commence par des prénoms
// d'élèves du créneau — « Lina : la frise », « Pour Lina et Tom : le loto » —
// est une étape à eux ; les autres lignes sont à tous. Chacun suit ses étapes
// et ce qui est à tous dans l'ordre où c'est écrit : le loto peut venir en
// premier pour l'un, en dernier pour l'autre. Seuls comptent les prénoms des
// élèves du créneau : « Pour la séance : » n'est à personne. Le bouton
// « 🖍 Surligner » du prévu écrit ces prénoms (`surlignerPour`) ; le cahier
// journal surligne chaque étape de la couleur de son élève (`segmentsDuPrevu`).

import type { Segment } from "./surlignage";

const sansAccents = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
/** « Pour » facultatif, les prénoms, puis « : » et l'étape — ou rien d'autre sur la ligne. */
const TETE = /^(\s*(?:pour\s+)?)([^:\n]+?)\s*(?::\s*(.*))?$/i;

interface Tete {
  /** Les élèves nommés, dans l'ordre du groupe. */
  qui: string[];
  /** Chaque prénom tel qu'il est écrit, et où : il prend la couleur de son élève. */
  noms: { prenom: string; debut: number; fin: number }[];
  /** Où commence l'étape, après « : » ; la fin de la ligne, s'il n'y en a pas. */
  debutDeLEtape: number;
}

/** Une ligne qui commence par des prénoms du créneau — tous, sinon ce n'en est pas une : lesquels, et où. */
function lireLaTete(ligne: string, prenoms: string[]): Tete | null {
  const m = TETE.exec(ligne);
  if (!m) return null;
  const noms: Tete["noms"] = [];
  let i = m[1].length;
  for (const [k, morceau] of m[2].split(/(\s*(?:,|&|\bet\b)\s*)/i).entries()) {
    if (k % 2 === 0 && morceau.trim()) {
      const prenom = prenoms.find((p) => sansAccents(p) === sansAccents(morceau));
      if (!prenom) return null;
      noms.push({ prenom, debut: i, fin: i + morceau.length });
    }
    i += morceau.length;
  }
  if (!noms.length) return null;
  return {
    qui: prenoms.filter((p) => noms.some((n) => n.prenom === p)), noms,
    debutDeLEtape: m[3] === undefined ? ligne.length : ligne.length - m[3].length,
  };
}

const lignesDuPrevu = (prevu: string, prenoms: string[]) =>
  prevu.split("\n").map((ligne) => ({ ligne, tete: prenoms.length ? lireLaTete(ligne, prenoms) : null }));

/** « Lina », « Lina et Tom », « Lina, Tom et Zoé ». */
const nommer = (qui: string[]) => (qui.length < 2 ? qui.join("") : `${qui.slice(0, -1).join(", ")} et ${qui[qui.length - 1]}`);

/** Le prévu donne-t-il une étape à l'un des élèves ? */
export const estPartage = (prevu: string, prenoms: string[]): boolean => lignesDuPrevu(prevu, prenoms).some((l) => l.tete);

/**
 * Le prévu tel qu'un élève le vit, dans l'ordre où il est écrit : ce qui est
 * à tous et ses étapes, sans les prénoms ni les étapes des autres ; et le rang
 * de ses étapes parmi ces lignes. Le prévu entier, s'il n'est pas partagé.
 */
export function prevuDeLEleve(prevu: string, prenom: string, prenoms: string[]): { texte: string; etapes: number[] } {
  const lignes = lignesDuPrevu(prevu, prenoms);
  if (!lignes.some((l) => l.tete)) return { texte: prevu, etapes: [] };
  const sortie: string[] = [];
  const etapes: number[] = [];
  for (const { ligne, tete } of lignes) {
    if (!tete) sortie.push(ligne);
    else if (tete.qui.some((p) => sansAccents(p) === sansAccents(prenom))) {
      const etape = ligne.slice(tete.debutDeLEtape).trim();
      if (etape) { etapes.push(sortie.length); sortie.push(etape); }
    }
  }
  return { texte: sortie.join("\n"), etapes };
}

/**
 * Le prévu découpé pour le cahier journal : l'étape d'un élève surlignée de sa
 * couleur — son rang dans le groupe —, son prénom un ton plus fort ; celle de
 * plusieurs en gris, chaque prénom de sa couleur. Mis bout à bout, les
 * segments redonnent le texte au caractère près.
 */
export function segmentsDuPrevu(prevu: string, prenoms: string[]): Segment[] {
  const sortie: Segment[] = [];
  const pousser = (texte: string, genre: Segment["genre"], couleur?: number) => {
    if (!texte) return;
    const dernier = sortie[sortie.length - 1];
    if (dernier && dernier.genre === genre && dernier.couleur === couleur) dernier.texte += texte;
    else sortie.push(couleur === undefined ? { texte, genre } : { texte, genre, couleur });
  };
  lignesDuPrevu(prevu, prenoms).forEach(({ ligne, tete }, i) => {
    if (i) pousser("\n", "");
    if (!tete) { pousser(ligne, ""); return; }
    const seul = tete.qui.length === 1;
    const fond = (texte: string) => pousser(texte, seul ? "eleve" : "eleves", seul ? prenoms.indexOf(tete.qui[0]) : undefined);
    let fait = 0;
    for (const n of tete.noms) {
      fond(ligne.slice(fait, n.debut));
      pousser(ligne.slice(n.debut, n.fin), "eleve-nom", prenoms.indexOf(n.prenom));
      fait = n.fin;
    }
    fond(ligne.slice(fait));
  });
  return sortie;
}

/**
 * Le passage d'une sélection, ligne par ligne : à qui chaque ligne était, et
 * ce qu'elle dit sans prénoms. Sans rien de sélectionné, la ligne du curseur ;
 * jamais la moitié d'un prénom : une sélection qui commence ou finit dans les
 * prénoms d'une ligne la prend entière. Rien à surligner : null.
 */
function passageDe(prevu: string, debut: number, fin: number, prenoms: string[]) {
  const debutDeLigne = (i: number) => prevu.lastIndexOf("\n", i - 1) + 1;
  const finDeLigne = (i: number) => { const n = prevu.indexOf("\n", i); return n < 0 ? prevu.length : n; };
  const dansLesPrenoms = (i: number) => {
    const d = debutDeLigne(i);
    const tete = lireLaTete(prevu.slice(d, finDeLigne(i)), prenoms);
    return tete !== null && i - d <= tete.debutDeLEtape;
  };
  let a = Math.max(0, Math.min(debut, fin, prevu.length)), b = Math.min(prevu.length, Math.max(debut, fin));
  if (a === b) { a = debutDeLigne(a); b = finDeLigne(b); }
  if (dansLesPrenoms(a)) a = debutDeLigne(a);
  if (b > debutDeLigne(b) && dansLesPrenoms(b)) b = finDeLigne(b);
  while (a < b && /\s/.test(prevu[a])) a++;
  while (b > a && /\s/.test(prevu[b - 1])) b--;
  if (a === b) return null;
  const lignes = lignesDuPrevu(prevu, prenoms);
  const premiere = prevu.slice(0, a).split("\n").length - 1;
  const morceaux = prevu.slice(a, b).split("\n").map((m, j) => {
    const tete = lireLaTete(m, prenoms);
    const etape = (tete ? m.slice(tete.debutDeLEtape) : m).replace(/^[\s,;]+|[\s,;]+$/g, "");
    return { vide: !m.trim(), qui: lignes[premiere + j].tete?.qui ?? [], etape };
  });
  return { a, b, morceaux, derniere: lignes[premiere + morceaux.length - 1].tete };
}

/** Les élèves dont le passage sélectionné est l'étape, sur chacune de ses lignes : ceux que le menu coche. */
export function elevesDuPassage(prevu: string, debut: number, fin: number, prenoms: string[]): string[] {
  const etapes = passageDe(prevu, debut, fin, prenoms)?.morceaux.filter((m) => m.etape) ?? [];
  return etapes.length ? prenoms.filter((p) => etapes.every((m) => m.qui.includes(p))) : [];
}

/**
 * Le bouton « 🖍 Surligner » : le passage sélectionné devient l'étape d'un
 * élève de plus, ou cesse d'être la sienne s'il l'était déjà ; `prenom` nul,
 * il redevient à tous. Chaque ligne du passage se pose sur sa propre ligne,
 * ses prénoms en tête — « Lina et Tom : … » ; ce qui la précédait ou la
 * suivait sur la même ligne y reste, avec ses prénoms. Rend le texte et le
 * passage tel qu'il est devenu ; null, sans rien à surligner.
 */
export function surlignerPour(
  prevu: string, debut: number, fin: number, prenom: string | null, prenoms: string[],
): { texte: string; debut: number; fin: number } | null {
  const passage = passageDe(prevu, debut, fin, prenoms);
  if (!passage) return null;
  const { a, b, morceaux, derniere } = passage;
  const lesSiennes = prenom !== null && morceaux.every((m) => !m.etape || m.qui.includes(prenom));
  const texte = morceaux.flatMap(({ vide, qui, etape }) => {
    // Une ligne vide reste ; des prénoms sans étape s'en vont.
    if (!etape) return vide ? [""] : [];
    const leurs = prenom === null ? [] : lesSiennes ? qui.filter((p) => p !== prenom) : prenoms.filter((p) => p === prenom || qui.includes(p));
    return [leurs.length ? `${nommer(leurs)} : ${etape}` : etape];
  }).join("\n");
  let avant = prevu.slice(0, a).replace(/[ \t,;]+$/, "");
  if (avant && !avant.endsWith("\n")) avant += "\n";
  let apres = prevu.slice(b).replace(/^[ \t,;]+/, "");
  if (apres && !apres.startsWith("\n")) apres = `\n${derniere ? `${nommer(derniere.qui)} : ` : ""}${apres}`;
  if (!texte && (!avant || avant.endsWith("\n")) && apres.startsWith("\n")) apres = apres.slice(1);
  return { texte: avant + texte + apres, debut: avant.length, fin: avant.length + texte.length };
}
