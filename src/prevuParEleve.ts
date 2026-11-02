// ── Le prévu d'un créneau de groupe, élève par élève ──────────────────────
//
// Demandes de l'enseignant (2026-11-02) : « il faudrait sur le planning
// pouvoir distinguer les élèves pour que chaque élève ait son picto — son
// planning de créneaux », puis : « un bouton qui permet de surligner l'élève
// et ce qu'il doit faire, et après ça suit dans l'ordre chronologique : deux
// élèves peuvent faire la même chose, mais pas au même moment », et : « je
// veux une sélection multiligne pour la même chose » — son prénom une fois.
//
// Dans un créneau à plusieurs élèves, une ligne qui commence par des prénoms
// d'élèves du créneau — « Lina : la frise », « Pour Lina et Tom : », ou le
// prénom seul — ouvre leur partie : elle court, lignes vides comprises,
// jusqu'à la prochaine ligne qui nomme d'autres élèves, ou « Tout le groupe : »
// qui revient à ce qui est à tous. Ce qui précède la première est à tous.
// Chacun suit ce qui est à tous et ses parties dans l'ordre où c'est écrit :
// le loto peut venir en premier pour l'un, en dernier pour l'autre. Seuls
// comptent les prénoms des élèves du créneau : « Pour la séance : » n'ouvre
// rien. Le bouton « 🖍 Surligner » du prévu écrit ces têtes (`surlignerPour`) ;
// le cahier journal surligne chaque partie de la couleur de son élève
// (`segmentsDuPrevu`).

import type { Segment } from "./surlignage";

const sansAccents = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
/** « Pour » facultatif, les prénoms, puis « : » et la suite — ou rien d'autre sur la ligne. */
const TETE = /^(\s*(?:pour\s+)?)([^:\n]+?)\s*(?::\s*(.*))?$/i;
/** Ce qui suit est à tous. */
const A_TOUS = /^(?:tout le groupe|tout le monde|tous|toutes|ensemble)$/;
const TETE_A_TOUS = "Tout le groupe";

interface Tete {
  /** Les élèves nommés, dans l'ordre du groupe ; aucun : « Tout le groupe ». */
  qui: string[];
  /** Chaque prénom tel qu'il est écrit, et où — ou « Tout le groupe » (`prenom` nul). */
  noms: { prenom: string | null; debut: number; fin: number }[];
  /** Où commence la suite, après « : » ; la fin de la ligne, s'il n'y en a pas. */
  debutDuReste: number;
}

/** Une ligne qui commence par des prénoms du créneau — tous, sinon ce n'en est pas une — ou par « Tout le groupe ». */
function lireLaTete(ligne: string, prenoms: string[]): Tete | null {
  const m = TETE.exec(ligne);
  if (!m) return null;
  const debutDuReste = m[3] === undefined ? ligne.length : ligne.length - m[3].length;
  if (A_TOUS.test(sansAccents(m[2]))) return { qui: [], noms: [{ prenom: null, debut: m[1].length, fin: m[1].length + m[2].length }], debutDuReste };
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
  return noms.length ? { qui: prenoms.filter((p) => noms.some((n) => n.prenom === p)), noms, debutDuReste } : null;
}

/** Chaque ligne, sa tête s'il en a une, et les élèves de la partie où elle est ; aucun : à tous. */
function lignesDuPrevu(prevu: string, prenoms: string[]): { ligne: string; tete: Tete | null; qui: string[] }[] {
  let qui: string[] = [];
  return prevu.split("\n").map((ligne) => {
    const tete = prenoms.length ? lireLaTete(ligne, prenoms) : null;
    if (tete) qui = tete.qui;
    return { ligne, tete, qui };
  });
}

/** « Lina », « Lina et Tom », « Lina, Tom et Zoé ». */
const nommer = (qui: string[]) => (qui.length < 2 ? qui.join("") : `${qui.slice(0, -1).join(", ")} et ${qui[qui.length - 1]}`);
const memes = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
/** La tête d'une partie : ses prénoms, ou « Tout le groupe ». */
const teteDe = (qui: string[]) => `${qui.length ? nommer(qui) : TETE_A_TOUS} : `;
/** Ce qu'une ligne dit, sans sa tête. */
const sansTete = (l: { ligne: string; tete: Tete | null }) => (l.tete ? l.ligne.slice(l.tete.debutDuReste) : l.ligne);

/** Les élèves de chacune de ces lignes — une ligne vide n'en dit rien. */
function deToutes(lignes: { ligne: string; qui: string[] }[], prenoms: string[]): string[] {
  const pleines = lignes.filter((l) => l.ligne.trim());
  return pleines.length ? prenoms.filter((x) => pleines.every((l) => l.qui.includes(x))) : [];
}

/** Le prévu donne-t-il une partie à l'un des élèves ? */
export const estPartage = (prevu: string, prenoms: string[]): boolean => lignesDuPrevu(prevu, prenoms).some((l) => l.qui.length);

/**
 * Le prévu tel qu'un élève le vit, dans l'ordre où il est écrit : ce qui est
 * à tous et ses parties, sans les têtes ni les parties des autres. Le prévu
 * entier, s'il n'est pas partagé.
 */
export function prevuDeLEleve(prevu: string, prenom: string, prenoms: string[]): string {
  const lignes = lignesDuPrevu(prevu, prenoms);
  if (!lignes.some((l) => l.qui.length)) return prevu;
  const sien = sansAccents(prenom);
  return lignes
    .filter((l) => !l.qui.length || l.qui.some((p) => sansAccents(p) === sien))
    .flatMap((l) => (l.tete && !sansTete(l).trim() ? [] : [sansTete(l).replace(/\s+$/, "")]))
    .join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Le prévu découpé pour le cahier journal : la partie d'un élève surlignée de
 * sa couleur — son rang dans le groupe —, son prénom un ton plus fort ; celle
 * de plusieurs en gris, chaque prénom de sa couleur ; « Tout le groupe » en
 * gris, la suite telle quelle. Mis bout à bout, les segments redonnent le
 * texte au caractère près.
 */
export function segmentsDuPrevu(prevu: string, prenoms: string[]): Segment[] {
  const sortie: Segment[] = [];
  const pousser = (texte: string, genre: Segment["genre"], couleur?: number) => {
    if (!texte) return;
    const dernier = sortie[sortie.length - 1];
    if (dernier && dernier.genre === genre && dernier.couleur === couleur) dernier.texte += texte;
    else sortie.push(couleur === undefined ? { texte, genre } : { texte, genre, couleur });
  };
  lignesDuPrevu(prevu, prenoms).forEach(({ ligne, tete, qui }, i) => {
    if (i) pousser("\n", "");
    const seul = qui.length === 1;
    const fond = (texte: string) => (qui.length ? pousser(texte, seul ? "eleve" : "eleves", seul ? prenoms.indexOf(qui[0]) : undefined) : pousser(texte, ""));
    let fait = 0;
    for (const n of tete?.noms ?? []) {
      fond(ligne.slice(fait, n.debut));
      if (n.prenom === null) pousser(ligne.slice(n.debut, n.fin), "eleves");
      else pousser(ligne.slice(n.debut, n.fin), "eleve-nom", prenoms.indexOf(n.prenom));
      fait = n.fin;
    }
    fond(ligne.slice(fait));
  });
  return sortie;
}

/**
 * Le passage d'une sélection, sur ses propres lignes : ce qui le précédait ou
 * le suivait sur la même ligne y reste. Sans rien de sélectionné, la ligne du
 * curseur ; jamais la moitié d'une tête : une sélection qui commence ou finit
 * dans les prénoms d'une ligne la prend entière ; les prénoms seuls, ou une
 * tête seule sur sa ligne, toute sa partie. Rend les lignes du texte ainsi
 * coupé, et celles du passage (`premiere` à `derniere`) ; null, sans rien à
 * surligner.
 */
function passageDe(prevu: string, debut: number, fin: number, prenoms: string[]) {
  const debutDeLigne = (i: number) => prevu.lastIndexOf("\n", i - 1) + 1;
  const finDeLigne = (i: number) => { const n = prevu.indexOf("\n", i); return n < 0 ? prevu.length : n; };
  const dansLaTete = (i: number) => {
    const d = debutDeLigne(i);
    const tete = lireLaTete(prevu.slice(d, finDeLigne(i)), prenoms);
    return tete !== null && i - d <= tete.debutDuReste;
  };
  let a = Math.max(0, Math.min(debut, fin, prevu.length)), b = Math.min(prevu.length, Math.max(debut, fin));
  const queLesPrenoms = a < b && debutDeLigne(a) === debutDeLigne(b) && dansLaTete(a) && dansLaTete(b);
  if (a === b) { a = debutDeLigne(a); b = finDeLigne(b); }
  if (dansLaTete(a)) a = debutDeLigne(a);
  if (b > debutDeLigne(b) && dansLaTete(b)) b = finDeLigne(b);
  while (a < b && /\s/.test(prevu[a])) a++;
  while (b > a && /\s/.test(prevu[b - 1])) b--;
  if (a === b) return null;
  const avantNu = prevu.slice(0, a).replace(/[ \t,;]+$/, "");
  const apresNu = prevu.slice(b).replace(/^[ \t,;]+/, "");
  const avant = !avantNu || avantNu.endsWith("\n") ? avantNu : `${avantNu}\n`;
  const apres = !apresNu || apresNu.startsWith("\n") ? apresNu : `\n${apresNu}`;
  const texte = avant + prevu.slice(a, b) + apres;
  const lignes = lignesDuPrevu(texte, prenoms);
  const premiere = avant.split("\n").length - 1;
  let derniere = premiere + prevu.slice(a, b).split("\n").length - 1;
  // Les prénoms, ou une tête sans rien à sa suite : la partie entière, jusqu'à la tête suivante.
  if (queLesPrenoms || lignes.slice(premiere, derniere + 1).every((l) => !l.ligne.trim() || (l.tete && !sansTete(l).trim()))) {
    while (derniere + 1 < lignes.length && !lignes[derniere + 1].tete) derniere++;
    while (derniere > premiere && !lignes[derniere].ligne.trim()) derniere--;
  }
  return { lignes, premiere, derniere };
}

/** Les élèves de la partie où est le passage sélectionné, sur chacune de ses lignes : ceux que le menu coche. */
export function elevesDuPassage(prevu: string, debut: number, fin: number, prenoms: string[]): string[] {
  const p = passageDe(prevu, debut, fin, prenoms);
  return p ? deToutes(p.lignes.slice(p.premiere, p.derniere + 1), prenoms) : [];
}

/**
 * Le bouton « 🖍 Surligner » : le passage sélectionné, sur une ou plusieurs
 * lignes, devient la partie d'un élève — son prénom une fois, en tête ;
 * `ajouter` : d'un élève de plus que ceux qu'il a déjà ; `prenom` nul : il
 * redevient à tous. Les têtes qu'il avait s'effacent ; ce qui le suit garde sa
 * partie, par sa tête redite au besoin. Rend le texte et le passage tel qu'il
 * est devenu ; null, sans rien à surligner.
 */
export function surlignerPour(
  prevu: string, debut: number, fin: number, prenom: string | null, prenoms: string[], ajouter = false,
): { texte: string; debut: number; fin: number } | null {
  const p = passageDe(prevu, debut, fin, prenoms);
  if (!p) return null;
  const { lignes, premiere, derniere } = p;
  const deja = ajouter ? deToutes(lignes.slice(premiere, derniere + 1), prenoms) : [];
  const leurs = prenom === null ? [] : prenoms.filter((x) => x === prenom || deja.includes(x));
  // Le passage, sans ses têtes ; une seule en haut, s'il ne continue pas la partie d'avant.
  const passage = lignes.slice(premiere, derniere + 1)
    .flatMap((l) => (l.tete && !sansTete(l).trim() ? [] : [sansTete(l)]));
  const avant = premiere > 0 ? lignes[premiere - 1].qui : [];
  if (!memes(leurs, avant)) {
    const k = passage.findIndex((l) => l.trim());
    if (k < 0) passage.push(teteDe(leurs).trimEnd());
    else passage[k] = teteDe(leurs) + passage[k].replace(/^\s+/, "");
  }
  // Ce qui suit : une tête qui redit les mêmes élèves s'efface ; une ligne qui était d'une autre partie redit la sienne.
  const suite = lignes.slice(derniere + 1).map((l) => l.ligne);
  const k = lignes.findIndex((l, i) => i > derniere && l.ligne.trim()) - derniere - 1;
  if (k >= 0) {
    const l = lignes[derniere + 1 + k];
    if (l.tete && memes(l.tete.qui, leurs)) {
      if (sansTete(l).trim()) suite[k] = sansTete(l); else suite.splice(k, 1);
    } else if (!l.tete && !memes(l.qui, leurs)) suite[k] = teteDe(l.qui) + l.ligne.replace(/^\s+/, "");
  }
  const debutDuPassage = premiere ? lignes.slice(0, premiere).map((l) => l.ligne).join("\n").length + 1 : 0;
  return {
    texte: [...lignes.slice(0, premiere).map((l) => l.ligne), ...passage, ...suite].join("\n"),
    debut: debutDuPassage, fin: debutDuPassage + passage.join("\n").length,
  };
}
