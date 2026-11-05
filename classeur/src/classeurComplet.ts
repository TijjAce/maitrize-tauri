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
import { nouvelId, ordreDesPages, type Case, type Classeur, type Page, type Suite } from "./modele";
import { dansLApplication, garderClasseur, garderImage, lirePictoLivre, supprimerClasseur } from "./pont";

export interface CaseModele {
  mot: string; fond?: string; bord?: string; arasaac?: number; dire?: string; lien?: string;
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

export function classeurComplet(nom = "", maintenant = new Date().toISOString(), m: ModeleDeClasseur = MODELE_COMPLET): Classeur {
  const ids = new Map(m.pages.map((p) => [p.cle, nouvelId()]));
  const idsCases = new Map<string, string>(m.pages.flatMap((p) => p.cases.map((_, i): [string, string] => [`${p.cle}:${i}`, nouvelId()])));
  const pages: Page[] = m.pages.map((p) => {
    const cases: (Case | null)[] = Array(p.lignes * p.colonnes).fill(null);
    p.cases.slice(0, cases.length).forEach((k, i) => {
      const c: Case = { id: idsCases.get(`${p.cle}:${i}`)!, mot: k.mot };
      if (k.dire) c.dire = k.dire;
      if (k.arasaac) c.image = `arasaac-${k.arasaac}`;
      if (k.fond) c.fond = k.fond;
      if (k.bord) c.bord = k.bord;
      const lien = k.lien ? ids.get(k.lien) : undefined;
      if (lien) c.lien = lien;
      if (typeof k.poids === "number") c.poids = k.poids;
      const suites = suitesDe(k, (cle) => ids.get(cle), (ref) => idsCases.get(ref));
      if (suites.length) c.suites = suites;
      cases[i] = c;
    });
    const page: Page = { id: ids.get(p.cle)!, nom: p.nom, lignes: p.lignes, colonnes: p.colonnes, cases };
    if (p.suite) page.suite = true;
    return page;
  });
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

/** Crée et garde un classeur complet ; ses pictos rejoignent les images de l'appareil. */
export async function creerLeClasseurComplet(nom = ""): Promise<Classeur> {
  const c = classeurComplet(nom);
  // Dans un navigateur d'essai, les pictos se relisent dans l'application (le stockage du navigateur est trop petit).
  if (dansLApplication()) await poserLesPictos(pictosDuModele(), garderImage);
  await garderClasseur(c);
  return c;
}

/** Le classeur suit-il le modèle d'aujourd'hui (mêmes pages, dans le même ordre) ? */
const suitLeModele = (c: Classeur, m: ModeleDeClasseur) =>
  c.pages.length === m.pages.length && ordreDesPages(c).every((p, i) => p.nom === m.pages[i].nom);

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
 * Un classeur complet aux poids d'une autre version (ou sans poids) reçoit ceux d'aujourd'hui, sans rien changer
 * d'autre : chaque page retrouve celle du modèle à son nom (la deuxième « Manger » avec la deuxième), chaque case son
 * mot. Les cases que l'enseignant a ajoutées gardent les leurs. Rien s'il porte déjà cette version, ou si rien ne
 * correspond. Sa date de modification ne bouge pas.
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
  // « clé de page:rang » du modèle → la case du classeur qui a ce mot, sur la page qui correspond.
  const caseDuModele = (ref: string) => {
    const [cle, rang] = ref.split(":");
    const km = m.pages.find((x) => x.cle === cle)?.cases[Number(rang)];
    return km ? pageDuModele.get(cle)?.cases.find((k) => k?.mot === km.mot)?.id : undefined;
  };
  let change = false;
  const pages = c.pages.map((p) => {
    const pm = m.pages.find((x) => pageDuModele.get(x.cle)?.id === p.id);
    if (!pm) return p;
    const cases = p.cases.map((k) => {
      const km = k && pm.cases.find((x) => x.mot === k.mot);
      if (!k || !km) return k;
      const suites = suitesDe(km, (cle) => pageDuModele.get(cle)?.id, caseDuModele);
      if (typeof km.poids !== "number" && !suites.length) return k;
      change = true;
      return { ...k, ...(typeof km.poids === "number" ? { poids: km.poids } : {}), ...(suites.length ? { suites } : {}) };
    });
    return { ...p, cases };
  });
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
      if (avecPoids) { await garderClasseur(avecPoids); change = true; }
    }
    return change;
  })();
  return enCours;
}
