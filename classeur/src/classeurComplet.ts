// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// ── Le classeur complet, livré avec l'application ─────────────────────────
//
// « Faut qu'il soit complété, le PODD, par défaut » : au premier lancement,
// l'application pose un classeur prêt à parler, rangé comme un PODD (« regarde
// bien comment sont structurées les pages ») — la page 1 de l'essentiel, les
// débuts de phrase qui disent l'intention (je veux, je me sens, j'ai mal, ça
// ne va pas, j'ai une question…), l'index des catégories, puis des sections
// numérotées de pages de 4 × 5 que l'on tourne. Vocabulaire et mise en page
// sont les nôtres (outils/classeur-par-defaut.py les écrit) : les pages du
// PODD, protégées, ne sont pas reproduites.
//
// Les pictos voyagent avec l'application (public/pictos) et sont recopiés
// parmi les images de l'appareil : le classeur marche sans internet, et reste
// entier si une version suivante change les siens.

import modele from "./donnees/classeur-par-defaut.json";
import { imagesDuClasseur, nouvelId, ordreDesPages, type Case, type Classeur, type Page, type Suite } from "./modele";
import { dansLApplication, garderClasseur, garderImage, lirePictoLivre, supprimerClasseur } from "./pont";

export interface CaseModele {
  mot: string; fond?: string; bord?: string; arasaac?: number; dire?: string; lien?: string;
  /** Elle ouvre sa page sans rien dire (une catégorie). */
  muette?: boolean;
  /** Ce qu'elle disait dans les modèles d'avant ("" : son mot) : une case qui le dit encore prend la forme d'aujourd'hui. */
  direAvant?: string[];
  /** Ce qu'elle était avant d'être renommée (« le corps » → « j'ai mal ») : une case restée ainsi la devient. */
  avant?: { mot: string; dire?: string; arasaac?: number; fond?: string; bord?: string }[];
  /** Ses formes féminines. */
  feminin?: { mot?: string; dire?: string };
  /** Les pages où elle menait dans les modèles d'avant ("" : nulle part) : une case qui y mène encore suit le nouveau lien. */
  lienAvant?: string[];
  poids?: number;
  /** `cases` : « clé de page:rang », les pictos choisis pour cette suite. */
  suites?: { page: string; poids: number; cases?: string[] }[];
}
export interface PageModele { cle: string; nom: string; lignes: number; colonnes: number; suite?: boolean; cases: CaseModele[] }
export interface ModeleDeClasseur { nom: string; accueil: string; categories?: string; versionDesPoids?: string; pages: PageModele[] }

export const MODELE_COMPLET = modele as ModeleDeClasseur;

/** Un classeur neuf d'après le modèle : chaque page, chaque case a son identifiant ; les liens retrouvent leur page. */
/** Les suites d'une case du modèle, en identifiants : la page du thème, et les cases choisies qui existent. */
const suitesDe = (k: CaseModele, page: (cle: string) => string | undefined, caseDe: (ref: string) => string | undefined): Suite[] =>
  (k.suites ?? []).flatMap((s) => {
    const id = page(s.page);
    if (!id) return [];
    const cases = (s.cases ?? []).flatMap((r) => { const x = caseDe(r); return x ? [x] : []; });
    return [{ page: id, poids: s.poids, ...(cases.length ? { cases } : {}) }];
  });

/** Une page d'après le modèle, ses cases à leur place : `page` et `caseDe` donnent les identifiants d'une page (sa clé) et d'une case (« clé:rang »). */
function pageNeuve(p: PageModele, id: string, page: (cle: string) => string | undefined, caseDe: (ref: string) => string | undefined): Page {
  const cases: (Case | null)[] = Array(p.lignes * p.colonnes).fill(null);
  p.cases.slice(0, cases.length).forEach((k, i) => {
    const c: Case = { id: caseDe(`${p.cle}:${i}`) ?? nouvelId(), mot: k.mot };
    if (k.dire) c.dire = k.dire;
    if (k.muette) c.muette = true;
    if (k.feminin && (k.feminin.mot || k.feminin.dire)) c.feminin = { ...k.feminin };
    if (k.arasaac) c.image = `arasaac-${k.arasaac}`;
    if (k.fond) c.fond = k.fond;
    if (k.bord) c.bord = k.bord;
    const lien = k.lien ? page(k.lien) : undefined;
    if (lien) c.lien = lien;
    if (typeof k.poids === "number") c.poids = k.poids;
    const suites = suitesDe(k, page, caseDe);
    if (suites.length) c.suites = suites;
    cases[i] = c;
  });
  const r: Page = { id, nom: p.nom, lignes: p.lignes, colonnes: p.colonnes, cases };
  if (p.suite) r.suite = true;
  return r;
}

export function classeurComplet(nom = "", maintenant = new Date().toISOString(), m: ModeleDeClasseur = MODELE_COMPLET): Classeur {
  const ids = new Map(m.pages.map((p) => [p.cle, nouvelId()]));
  const idsCases = new Map<string, string>(m.pages.flatMap((p) => p.cases.map((_, i): [string, string] => [`${p.cle}:${i}`, nouvelId()])));
  const pages: Page[] = m.pages.map((p) => pageNeuve(p, ids.get(p.cle)!, (cle) => ids.get(cle), (ref) => idsCases.get(ref)));
  const categories = m.categories ? ids.get(m.categories) : undefined;
  return {
    id: nouvelId(), nom: nom.trim() || m.nom, accueil: ids.get(m.accueil) ?? pages[0].id, ...(categories ? { categories } : {}),
    ...(m.versionDesPoids ? { versionDesPoids: m.versionDesPoids } : {}),
    pages, creeLe: maintenant, modifieLe: maintenant,
  };
}

/** Les numéros des pictos du modèle. */
export const pictosDuModele = (m: ModeleDeClasseur = MODELE_COMPLET): number[] =>
  [...new Set(m.pages.flatMap((p) => p.cases.flatMap((k) => (k.arasaac ? [k.arasaac] : []))))];

/** Les pictos d'ARASAAC qu'un classeur mis à jour montre et que l'ancien ne montrait pas (cases renommées, pages neuves). */
export const nouveauxPictos = (avant: Classeur, apres: Classeur): number[] => {
  const deja = new Set(imagesDuClasseur(avant));
  return imagesDuClasseur(apres).flatMap((id) => {
    const n = deja.has(id) ? undefined : id.match(/^arasaac-(\d+)$/)?.[1];
    return n ? [Number(n)] : [];
  });
};

/** Recopie les pictos livrés parmi les images de l'appareil, quelques-uns à la fois. Rend le nombre recopié. */
export async function poserLesPictos(
  numeros: number[], garder: (id: string, donnees: string) => Promise<void>, lire: (n: number) => Promise<string | null> = lirePictoLivre,
): Promise<number> {
  let poses = 0;
  for (let i = 0; i < numeros.length; i += 8) {
    await Promise.all(numeros.slice(i, i + 8).map(async (n) => {
      const donnees = await lire(n);
      if (!donnees) return;
      try { await garder(`arasaac-${n}`, donnees); poses++; } catch { /* l'écran la relira dans l'application */ }
    }));
  }
  return poses;
}

/** Crée et garde un classeur complet (au féminin, si l'élève parle au féminin) ; ses pictos rejoignent les images de l'appareil. */
export async function creerLeClasseurComplet(nom = "", feminin = false): Promise<Classeur> {
  const c: Classeur = { ...classeurComplet(nom), ...(feminin ? { feminin: true } : {}) };
  // Dans un navigateur d'essai, les pictos se relisent dans l'application (le stockage du navigateur est trop petit).
  if (dansLApplication()) await poserLesPictos(pictosDuModele(), garderImage);
  await garderClasseur(c);
  return c;
}

/** Une case telle que le modèle la livre : son mot, ce qu'elle dit, muette ou non, au féminin, et le nom de la page où elle mène. */
const empreinte = (k: { mot: string; dire?: string; muette?: boolean; feminin?: { mot?: string; dire?: string } }, versPage: string) =>
  `${k.mot}=${k.dire ?? ""}${k.muette ? "~" : ""}/${k.feminin?.mot ?? ""}/${k.feminin?.dire ?? ""}→${versPage}`;

/** Le classeur suit-il le modèle d'aujourd'hui : mêmes pages, dans le même ordre, avec les mêmes cases, qui disent la même chose et mènent au même endroit ? */
const suitLeModele = (c: Classeur, m: ModeleDeClasseur) =>
  c.pages.length === m.pages.length && ordreDesPages(c).every((p, i) => p.nom === m.pages[i].nom
    && p.cases.filter(Boolean).map((k) => empreinte(k!, c.pages.find((x) => x.id === k!.lien)?.nom ?? "")).join("|")
      === m.pages[i].cases.map((k) => empreinte(k, m.pages.find((x) => x.cle === k.lien)?.nom ?? "")).join("|"));

/**
 * Ce qu'il faut faire au lancement : poser le classeur complet quand l'appareil n'a aucun classeur ; remplacer un
 * classeur complet d'un modèle plus ancien que personne n'a modifié (créé et jamais changé depuis). Un classeur
 * complet supprimé ne revient pas tant qu'il en reste un autre ; un classeur modifié n'est jamais touché.
 */
export function aPoser(deja: Classeur[], m: ModeleDeClasseur = MODELE_COMPLET): { poser: boolean; remplacer: string[] } {
  const remplacer = deja.filter((x) => x.nom === m.nom && x.creeLe !== "" && x.creeLe === x.modifieLe && !suitLeModele(x, m)).map((x) => x.id);
  return { poser: deja.length === 0 || remplacer.length > 0, remplacer };
}

/**
 * Un classeur complet aux poids d'une autre version (ou sans poids) reçoit ceux d'aujourd'hui : chaque page retrouve
 * celle du modèle à son nom (la deuxième « Manger » avec la deuxième), chaque case son mot. Les cases que l'enseignant
 * a ajoutées gardent les leurs. Ce qui se dit suit aussi, là où la case dit encore la forme d'un modèle d'avant
 * (« ballon » → « au ballon ») ; une catégorie devient muette si l'enseignant ne l'a jamais fait parler ; une case
 * renommée prend son nouveau nom (« le corps » → « j'ai mal ») ; une case reçoit ses formes féminines ; une case qui
 * mène encore où elle menait avant (ou nulle part) suit le nouveau lien. Les pages que le modèle a en plus (pages
 * d'activité, « Raconter ») arrivent, chacune après la section qui la précède dans le modèle. Ce que l'enseignant a
 * écrit ou choisi lui-même ne bouge pas. Rien s'il porte déjà cette version, ou si rien ne correspond. Sa date de
 * modification ne bouge pas.
 */
export function ajouterLesPoids(c: Classeur, m: ModeleDeClasseur = MODELE_COMPLET): Classeur | null {
  if (!m.versionDesPoids || c.versionDesPoids === m.versionDesPoids) return null;
  const parNom = new Map<string, Page[]>();
  for (const p of ordreDesPages(c)) parNom.set(p.nom, [...(parNom.get(p.nom) ?? []), p]);
  const vus = new Map<string, number>();
  const pageDuModele = new Map<string, Page>();
  for (const pm of m.pages) {
    const i = vus.get(pm.nom) ?? 0;
    vus.set(pm.nom, i + 1);
    const p = parNom.get(pm.nom)?.[i];
    if (p) pageDuModele.set(pm.cle, p);
  }
  const cleDePage = new Map([...pageDuModele].map(([cle, p]) => [p.id, cle]));
  // Les pages que le modèle a en plus : leurs identifiants, et ceux de leurs cases, d'abord (on peut s'y référer).
  const idsNeufs = new Map(m.pages.filter((pm) => !pageDuModele.has(pm.cle)).map((pm) => [pm.cle, nouvelId()]));
  const idsCasesNeuves = new Map<string, string>(m.pages.filter((pm) => idsNeufs.has(pm.cle))
    .flatMap((pm) => pm.cases.map((_, i): [string, string] => [`${pm.cle}:${i}`, nouvelId()])));
  const idDePage = (cle: string) => pageDuModele.get(cle)?.id ?? idsNeufs.get(cle);
  // « clé de page:rang » du modèle → la case du classeur qui a ce mot, sur la page qui correspond (ou la case neuve).
  const caseDuModele = (ref: string) => {
    if (idsCasesNeuves.has(ref)) return idsCasesNeuves.get(ref);
    const [cle, rang] = ref.split(":");
    const km = m.pages.find((x) => x.cle === cle)?.cases[Number(rang)];
    return km ? pageDuModele.get(cle)?.cases.find((k) => k?.mot === km.mot)?.id : undefined;
  };
  let change = idsNeufs.size > 0;
  const pages = c.pages.map((p) => {
    const pm = m.pages.find((x) => pageDuModele.get(x.cle)?.id === p.id);
    if (!pm) return p;
    const cases = p.cases.map((k) => {
      if (!k) return k;
      let km = pm.cases.find((x) => x.mot === k.mot);
      let n: Case = k;
      if (!km) {
        // Une case renommée depuis (« le corps » → « j'ai mal ») : son nouveau mot, et son picto, sa couleur, ce qu'elle
        // dit, là où ils sont encore ceux d'avant. Pas si la page a déjà une case à ce nom.
        const r = pm.cases.find((x) => x.avant?.some((a) => a.mot === k.mot) && !p.cases.some((y) => y?.mot === x.mot));
        const a = r?.avant?.find((x) => x.mot === k.mot);
        if (!r || !a) return k;
        km = r;
        n = { ...k, mot: r.mot };
        if ((k.dire ?? "") === (a.dire ?? "")) {
          if (r.dire) n.dire = r.dire;
          else delete n.dire;
        }
        if (r.arasaac && a.arasaac && k.image === `arasaac-${a.arasaac}`) n.image = `arasaac-${r.arasaac}`;
        if (k.fond === a.fond && k.bord === a.bord) {
          if (r.fond) n.fond = r.fond;
          if (r.bord) n.bord = r.bord;
        }
        const vers = !k.lien && r.lien ? idDePage(r.lien) : undefined;
        if (vers) n.lien = vers;
      }
      if ((km.dire ?? "") !== (n.dire ?? "") && km.direAvant?.includes(n.dire ?? "")) {
        n = { ...n };
        if (km.dire) n.dire = km.dire;
        else delete n.dire;
      }
      // Le lien : celui d'aujourd'hui, là où la case mène encore où elle menait avant (ou nulle part).
      const ici = n.lien ? cleDePage.get(n.lien) : "";
      if (ici !== undefined && ici !== (km.lien ?? "") && km.lienAvant?.includes(ici)) {
        const vers = km.lien ? idDePage(km.lien) : undefined;
        n = { ...n };
        if (vers) n.lien = vers;
        else delete n.lien;
      }
      if (km.muette && n.lien && n.muette === undefined) n = { ...n, muette: true };
      if (km.feminin && n.feminin === undefined) n = { ...n, feminin: { ...km.feminin } };
      if (typeof km.poids === "number") n = { ...n, poids: km.poids };
      // Les suites choisies par l'enseignant restent les siennes.
      const suites = suitesDe(km, idDePage, caseDuModele);
      if (suites.length && !k.suitesPerso) n = { ...n, suites };
      if (n !== k) change = true;
      return n;
    });
    return { ...p, cases };
  });
  // Les pages neuves, à leur place : après la section de la page du modèle qui les précède (une page « suite » juste après elle).
  let precedente: string | undefined;
  for (const pm of m.pages) {
    const id = idsNeufs.get(pm.cle);
    if (id) {
      const neuve = pageNeuve(pm, id, idDePage, caseDuModele);
      let i = precedente ? pages.findIndex((p) => p.id === precedente) : -1;
      if (i < 0) i = pages.length - 1;
      else if (!pm.suite) while (i + 1 < pages.length && pages[i + 1].suite) i++;
      pages.splice(i + 1, 0, neuve);
    }
    precedente = idDePage(pm.cle) ?? precedente;
  }
  return change ? { ...c, pages, versionDesPoids: m.versionDesPoids } : null;
}

let enCours: Promise<boolean> | null = null;

/**
 * Au lancement : le classeur complet se pose (ou remplace l'ancien, intact) ; un classeur complet d'avant les poids
 * les reçoit. Vrai si quelque chose a changé.
 */
export function poserAuPremierLancement(deja: Classeur[]): Promise<boolean> {
  enCours ??= (async () => {
    const { poser, remplacer } = aPoser(deja);
    for (const id of remplacer) await supprimerClasseur(id);
    if (poser) await creerLeClasseurComplet();
    let change = poser;
    for (const c of deja) {
      if (remplacer.includes(c.id) || c.nom !== MODELE_COMPLET.nom) continue;
      const avecPoids = ajouterLesPoids(c);
      if (avecPoids) {
        // Les pictos des cases renommées et des pages neuves rejoignent les images de l'appareil.
        if (dansLApplication()) await poserLesPictos(nouveauxPictos(c, avecPoids), garderImage);
        await garderClasseur(avecPoids);
        change = true;
      }
    }
    return change;
  })();
  return enCours;
}
