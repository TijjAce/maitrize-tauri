// ── Le classeur complet, livré avec l'application ─────────────────────────
//
// « Faut qu'il soit complété, le PODD, par défaut » : au premier lancement,
// l'application pose un classeur prêt à parler — une page d'accueil qui part
// des intentions (je veux, je me sens, j'ai mal, j'ai une question, ça ne va
// pas), douze pages liées, les petits mots de tous les jours. Vocabulaire et
// organisation sont les nôtres (outils/classeur-par-defaut.py les écrit) :
// les pages du PODD, protégées, ne sont pas reproduites.
//
// Les pictos voyagent avec l'application (public/pictos) et sont recopiés
// parmi les images de l'appareil : le classeur marche sans internet, et reste
// entier si une version suivante change les siens.

import modele from "./donnees/classeur-par-defaut.json";
import { nouvelId, type Case, type Classeur, type Page } from "./modele";
import { dansLApplication, dejaFait, garderClasseur, garderImage, lirePictoLivre, marquerFait } from "./pont";

export interface CaseModele { mot: string; fond?: string; bord?: string; arasaac?: number; dire?: string; lien?: string }
export interface PageModele { cle: string; nom: string; lignes: number; colonnes: number; cases: CaseModele[] }
export interface ModeleDeClasseur { nom: string; accueil: string; pages: PageModele[] }

export const MODELE_COMPLET = modele as ModeleDeClasseur;

/** Un classeur neuf d'après le modèle : chaque page, chaque case a son identifiant ; les liens retrouvent leur page. */
export function classeurComplet(nom = "", maintenant = new Date().toISOString(), m: ModeleDeClasseur = MODELE_COMPLET): Classeur {
  const ids = new Map(m.pages.map((p) => [p.cle, nouvelId()]));
  const pages: Page[] = m.pages.map((p) => {
    const cases: (Case | null)[] = Array(p.lignes * p.colonnes).fill(null);
    p.cases.slice(0, cases.length).forEach((k, i) => {
      const c: Case = { id: nouvelId(), mot: k.mot };
      if (k.dire) c.dire = k.dire;
      if (k.arasaac) c.image = `arasaac-${k.arasaac}`;
      if (k.fond) c.fond = k.fond;
      if (k.bord) c.bord = k.bord;
      const lien = k.lien ? ids.get(k.lien) : undefined;
      if (lien) c.lien = lien;
      cases[i] = c;
    });
    return { id: ids.get(p.cle)!, nom: p.nom, lignes: p.lignes, colonnes: p.colonnes, cases };
  });
  return {
    id: nouvelId(), nom: nom.trim() || m.nom, accueil: ids.get(m.accueil) ?? pages[0].id, pages, creeLe: maintenant, modifieLe: maintenant,
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

let enCours: Promise<Classeur | null> | null = null;

/**
 * Au premier lancement sur un appareil, le classeur complet se pose de lui-même — une fois : supprimé, il ne
 * revient pas (« ＋ Nouveau classeur » le redonne). Rien s'il y est déjà.
 */
export function poserAuPremierLancement(deja: Classeur[]): Promise<Classeur | null> {
  enCours ??= (async () => {
    if (dejaFait("classeur-complet")) return null;
    const c = deja.some((x) => x.nom === MODELE_COMPLET.nom) ? null : await creerLeClasseurComplet();
    marquerFait("classeur-complet");
    return c;
  })();
  return enCours;
}
