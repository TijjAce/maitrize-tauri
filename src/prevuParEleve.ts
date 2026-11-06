// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// ── Le prévu d'un créneau de groupe, élève par élève ──────────────────────
//
// Demandes de l'enseignant (2026-11-02) : « il faudrait sur le planning
// pouvoir distinguer les élèves pour que chaque élève ait son picto — son
// planning de créneaux », puis : « un bouton qui permet de surligner l'élève
// et ce qu'il doit faire, et après ça suit dans l'ordre chronologique : deux
// élèves peuvent faire la même chose, mais pas au même moment », et : « je
// veux une sélection multiligne pour la même chose » — son prénom une fois ;
// enfin (2026-11-03) : « au lieu de surligner, il faudrait pouvoir encadrer.
// Même pour un élève unique. »
//
// Dans un créneau qui nomme ses élèves, un ou plusieurs, une ligne qui commence par des prénoms
// d'élèves du créneau — « Lina : la frise », « Pour Lina et Tom : », ou le
// prénom seul — ouvre leur partie : elle court, lignes vides comprises,
// jusqu'à la prochaine ligne qui nomme d'autres élèves, ou « Tout le groupe : »
// qui revient à ce qui est à tous. Ce qui précède la première est à tous.
// Chacun suit ce qui est à tous et ses parties dans l'ordre où c'est écrit :
// le loto peut venir en premier pour l'un, en dernier pour l'autre. Seuls
// comptent les prénoms des élèves du créneau : « Pour la séance : » n'ouvre
// rien. Le bouton « 🔲 Encadrer » du prévu écrit ces têtes (`encadrerPour`) ;
// le cahier journal met chaque partie dans un cadre de la couleur de son élève
// (`segmentsDuPrevu`) : un cadre par tête, si bien que deux passages encadrés
// l'un après l'autre pour le même élève — deux temps — restent deux cadres.

import type { Creneau } from "./api";
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
/** La tête d'une partie : ses prénoms, ou « Tout le groupe ». */
const teteDe = (qui: string[]) => `${qui.length ? nommer(qui) : TETE_A_TOUS} : `;
/** Ce qu'une ligne dit, sans sa tête. */
const sansTete = (l: { ligne: string; tete: Tete | null }) => (l.tete ? l.ligne.slice(l.tete.debutDuReste) : l.ligne);
/**
 * Une ligne avec la tête de sa partie ; la tête seule au-dessus d'une ligne qui commence par un signe — 📚, 🔁, 📄,
 * ⏰… — : on ne les reconnaît qu'en tête de ligne.
 */
const avecSaTete = (qui: string[], ligne: string): string[] =>
  (/^\s*\p{Extended_Pictographic}/u.test(ligne) ? [teteDe(qui).trimEnd(), ligne] : [teteDe(qui) + ligne.replace(/^\s+/, "")]);

/** Les élèves de chacune de ces lignes — une ligne vide n'en dit rien. */
function deToutes(lignes: { ligne: string; qui: string[] }[], prenoms: string[]): string[] {
  const pleines = lignes.filter((l) => l.ligne.trim());
  return pleines.length ? prenoms.filter((x) => pleines.every((l) => l.qui.includes(x))) : [];
}

/** Le prévu sans ses têtes, pour qui le lit en entier — la classe : « Lina : 📚 … » y cite sa séance comme « 📚 … ». */
export const prevuSansTetes = (prevu: string, prenoms: string[]): string =>
  lignesDuPrevu(prevu, prenoms).flatMap((l) => (l.tete && !sansTete(l).trim() ? [] : [sansTete(l)])).join("\n");

/** Le prévu donne-t-il une partie à l'un des élèves ? */
export const estPartage = (prevu: string, prenoms: string[]): boolean => lignesDuPrevu(prevu, prenoms).some((l) => l.qui.length);

/** Les élèves qu'un créneau nomme, par leur identifiant ; aucun : toute la classe. */
function elevesNommes(c: Pick<Creneau, "elevesJson">): string[] {
  try {
    const ids: unknown = JSON.parse(c.elevesJson || "[]");
    return Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string") : [];
  } catch { return []; }
}

/** Les prénoms du groupe d'un créneau, dans l'ordre où il les nomme. */
export const prenomsDuGroupe = (c: Pick<Creneau, "elevesJson">, eleves: { id: string; prenom: string }[]): string[] =>
  elevesNommes(c).map((id) => eleves.find((e) => e.id === id)?.prenom.trim() ?? "").filter(Boolean);

/**
 * Les élèves qui ont chacun leur prévu au créneau — leur bande au planning,
 * leur déroulement sur leur tablette : ceux de son groupe, si le prévu donne
 * une partie à l'un d'eux ; sinon aucun, tout est à tous.
 */
export function elevesDesParties(c: Pick<Creneau, "elevesJson" | "prevu">, eleves: { id: string; prenom: string }[]): string[] {
  const groupe = prenomsDuGroupe(c, eleves);
  return groupe.length && estPartage(c.prevu ?? "", groupe) ? groupe : [];
}

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
 * Le prévu découpé pour le cahier journal : chaque partie dans un cadre — de
 * sa tête à sa dernière ligne pleine —, de la couleur de son élève, son rang
 * dans le groupe ; celle de plusieurs en gris. Les prénoms des têtes gardent
 * leur couleur, « Tout le groupe » le gris, et la suite reste telle quelle.
 * Le retour à la ligne qui clôt un cadre est dans le cadre : c'est ce qui
 * garde les lignes du calque à la hauteur de celles du texte. Mis bout à
 * bout, les segments redonnent le texte au caractère près.
 */
export function segmentsDuPrevu(prevu: string, prenoms: string[]): Segment[] {
  const lignes = lignesDuPrevu(prevu, prenoms);
  // Chaque tête d'élèves ouvre un cadre, que la tête suivante ferme ; les lignes vides de son bout restent dehors.
  const cadres: (Segment["cadre"] | undefined)[] = lignes.map(() => undefined);
  let ouvert: Segment["cadre"] | undefined;
  lignes.forEach((l, i) => {
    if (l.tete) ouvert = l.qui.length ? { id: i, ...(l.qui.length === 1 ? { couleur: prenoms.indexOf(l.qui[0]) } : {}) } : undefined;
    cadres[i] = l.qui.length ? ouvert : undefined;
  });
  for (let i = lignes.length - 1; i >= 0; i--) {
    if (cadres[i] && !lignes[i].ligne.trim() && cadres[i + 1] !== cadres[i]) cadres[i] = undefined;
  }
  const sortie: Segment[] = [];
  const pousser = (texte: string, genre: Segment["genre"], cadre: Segment["cadre"] | undefined, couleur?: number) => {
    if (!texte) return;
    const dernier = sortie[sortie.length - 1];
    if (dernier && dernier.genre === genre && dernier.couleur === couleur && dernier.cadre === cadre) { dernier.texte += texte; return; }
    sortie.push({ texte, genre, ...(couleur === undefined ? {} : { couleur }), ...(cadre ? { cadre } : {}) });
  };
  lignes.forEach(({ ligne, tete }, i) => {
    if (i) pousser("\n", "", cadres[i - 1]);
    let fait = 0;
    for (const n of tete?.noms ?? []) {
      pousser(ligne.slice(fait, n.debut), "", cadres[i]);
      if (n.prenom === null) pousser(ligne.slice(n.debut, n.fin), "eleves", cadres[i]);
      else pousser(ligne.slice(n.debut, n.fin), "eleve-nom", cadres[i], prenoms.indexOf(n.prenom));
      fait = n.fin;
    }
    pousser(ligne.slice(fait), "", cadres[i]);
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
 * Le bouton « 🔲 Encadrer » : le passage sélectionné, sur une ou plusieurs
 * lignes, devient un temps d'un élève, dans son propre cadre — son prénom une
 * fois, en tête, même s'il suit un autre temps du même élève ; `ajouter` :
 * d'un élève de plus que ceux qu'il a déjà ; `prenom` nul : il redevient à
 * tous. Les têtes qu'il avait s'effacent ; ce qui le suit garde sa partie, par
 * sa tête redite au besoin, si bien que le cadre finit avec le passage. Rend
 * le texte et le passage tel qu'il est devenu ; null, sans rien à encadrer.
 */
export function encadrerPour(
  prevu: string, debut: number, fin: number, prenom: string | null, prenoms: string[], ajouter = false,
): { texte: string; debut: number; fin: number } | null {
  const p = passageDe(prevu, debut, fin, prenoms);
  if (!p) return null;
  const { lignes, premiere, derniere } = p;
  const deja = ajouter ? deToutes(lignes.slice(premiere, derniere + 1), prenoms) : [];
  const leurs = prenom === null ? [] : prenoms.filter((x) => x === prenom || deja.includes(x));
  // Le passage, sans ses têtes ; une seule en haut — à tous, seulement après la partie d'un élève.
  const passage = lignes.slice(premiere, derniere + 1)
    .flatMap((l) => (l.tete && !sansTete(l).trim() ? [] : [sansTete(l)]));
  const avant = premiere > 0 ? lignes[premiere - 1].qui : [];
  if (leurs.length || avant.length) {
    const k = passage.findIndex((l) => l.trim());
    if (k < 0) passage.push(teteDe(leurs).trimEnd());
    else passage.splice(k, 1, ...avecSaTete(leurs, passage[k]));
  }
  // Ce qui suit : « Tout le groupe » après un passage rendu à tous s'efface ; une ligne qui était d'une partie
  // — même celle de ces élèves : le cadre finit avec le passage —, ou à tous après lui, redit la sienne.
  const suite = lignes.slice(derniere + 1).map((l) => l.ligne);
  const k = lignes.findIndex((l, i) => i > derniere && l.ligne.trim()) - derniere - 1;
  if (k >= 0) {
    const l = lignes[derniere + 1 + k];
    if (l.tete && !l.tete.qui.length && !leurs.length) {
      if (sansTete(l).trim()) suite[k] = sansTete(l); else suite.splice(k, 1);
    } else if (!l.tete && (l.qui.length || leurs.length)) suite.splice(k, 1, ...avecSaTete(l.qui, l.ligne));
  }
  const debutDuPassage = premiere ? lignes.slice(0, premiere).map((l) => l.ligne).join("\n").length + 1 : 0;
  return {
    texte: [...lignes.slice(0, premiere).map((l) => l.ligne), ...passage, ...suite].join("\n"),
    debut: debutDuPassage, fin: debutDuPassage + passage.join("\n").length,
  };
}
