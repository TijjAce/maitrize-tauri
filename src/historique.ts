// Revenir où l'on était.
//
// On quitte une séquence pour vérifier une date dans le planning, un élève
// dans son dossier, une ressource ; trois écrans plus loin, retrouver la
// séquence demande de se souvenir du chemin. L'application garde donc la
// trace des lieux visités — l'adresse de la page et son titre — et un seul
// geste ramène au précédent, puis au précédent encore, comme dans un
// navigateur. Les lieux récents se proposent aussi en liste, pour sauter
// directement à celui qu'on cherche.
//
// Les pages gardées vivantes (voir App) retrouvent leur état tel quel :
// revenir à Fabriquer, c'est retomber sur l'atelier ouvert.

export interface Lieu {
  /** Le chemin dans l'application : « /sequences/abc », « /jeux ». */
  chemin: string;
  /** Le titre de la page, tel qu'elle s'est annoncée ; vide tant qu'elle ne l'a pas fait. */
  titre: string;
  quand: number;
}

export interface Historique {
  lieux: Lieu[];
  /** Le lieu où l'on est. */
  index: number;
}

export const LIEUX_MAX = 30;
export const RECENTS_MAX = 8;

export const historiqueVide = (): Historique => ({ lieux: [], index: -1 });

/** Là où l'on est. */
export const actuel = (h: Historique): Lieu | null => h.lieux[h.index] ?? null;
/** Là où l'on était juste avant. */
export const precedent = (h: Historique): Lieu | null => h.lieux[h.index - 1] ?? null;
/** Là d'où l'on est revenu, s'il y a lieu. */
export const suivant = (h: Historique): Lieu | null => h.lieux[h.index + 1] ?? null;

/**
 * Une arrivée sur `chemin`.
 *
 * Arriver là où l'on est déjà ne change rien. Arriver ailleurs après être
 * revenu en arrière oublie ce qui était devant, comme dans un navigateur.
 * `retourVers` désigne le rang visé par un retour ou une avance : on s'y
 * place au lieu d'empiler.
 */
export function arriver(h: Historique, chemin: string, quand: number, retourVers?: number): Historique {
  if (retourVers !== undefined && h.lieux[retourVers]?.chemin === chemin) return { ...h, index: retourVers };
  if (actuel(h)?.chemin === chemin) return h;
  const lieux = [...h.lieux.slice(0, h.index + 1), { chemin, titre: "", quand }].slice(-LIEUX_MAX);
  return { lieux, index: lieux.length - 1 };
}

/** La page où l'on est s'annonce : son titre se garde avec le lieu. */
export function titrer(h: Historique, chemin: string, titre: string): Historique {
  const lieu = actuel(h);
  if (!lieu || lieu.chemin !== chemin || lieu.titre === titre) return h;
  const lieux = [...h.lieux];
  lieux[h.index] = { ...lieu, titre };
  return { ...h, lieux };
}

/**
 * Les lieux où revenir, du plus récent au plus ancien, chacun une fois et
 * sans celui où l'on est. Ce qui est devant (après un retour) compte aussi :
 * c'est de là qu'on vient.
 */
export function recents(h: Historique, max = RECENTS_MAX): Lieu[] {
  const ici = actuel(h)?.chemin;
  const vus = new Set<string>();
  const sortie: Lieu[] = [];
  const ordre = [...h.lieux.slice(0, h.index).reverse(), ...h.lieux.slice(h.index + 1)];
  for (const l of ordre) {
    if (l.chemin === ici || vus.has(l.chemin)) continue;
    vus.add(l.chemin);
    sortie.push(l);
    if (sortie.length >= max) break;
  }
  return sortie;
}

/** Le nom d'un lieu qui ne s'est pas annoncé : d'après le menu. */
export function libelleDuChemin(chemin: string, menu: { to: string; label: string }[]): string {
  if (chemin.startsWith("/sequences/")) return "Séquence";
  const exact = menu.find((m) => m.to === chemin);
  if (exact) return exact.label;
  const parent = menu.filter((m) => m.to !== "/" && chemin.startsWith(m.to)).sort((a, b) => b.to.length - a.to.length)[0];
  return parent?.label ?? (chemin === "/" ? "Tableau de bord" : chemin);
}

/** Le nom à montrer : le titre annoncé, sinon celui du menu. */
export const nomDuLieu = (lieu: Lieu, menu: { to: string; label: string }[]) =>
  lieu.titre.trim() || libelleDuChemin(lieu.chemin, menu);

// ── L'historique de l'application, un seul ─────────────────────────────────

const CLE = "historique:lieux";

function lire(): Historique {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE) || "");
    if (!brut || !Array.isArray(brut.lieux)) return historiqueVide();
    const lieux: Lieu[] = brut.lieux
      .filter((l: unknown) => l && typeof l === "object" && typeof (l as Lieu).chemin === "string")
      .map((l: Lieu) => ({ chemin: l.chemin, titre: typeof l.titre === "string" ? l.titre : "", quand: Number(l.quand) || 0 }))
      .slice(-LIEUX_MAX);
    const index = Math.min(Math.max(0, Number(brut.index) || 0), lieux.length - 1);
    return { lieux, index };
  } catch {
    return historiqueVide();
  }
}

let etat: Historique = typeof localStorage === "undefined" ? historiqueVide() : lire();
const abonnes = new Set<() => void>();
/** Le rang visé par le retour ou l'avance en cours, jusqu'à l'arrivée. */
let vise: number | undefined;

function poser(suite: Historique) {
  if (suite === etat) return;
  etat = suite;
  try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch { /* la trace ne vaut pas une erreur */ }
  abonnes.forEach((f) => f());
}

export const historique = {
  lire: () => etat,
  abonner(f: () => void) { abonnes.add(f); return () => { abonnes.delete(f); }; },
  /** L'application est arrivée sur `chemin` (appelé à chaque changement d'adresse). */
  arriver(chemin: string) {
    const cible = vise;
    vise = undefined;
    poser(arriver(etat, chemin, Date.now(), cible));
  },
  titrer(chemin: string, titre: string) { poser(titrer(etat, chemin, titre)); },
  /** Le lieu où revenir, ou `null` ; la navigation elle-même revient à l'appelant. */
  reculer(): Lieu | null {
    const lieu = precedent(etat);
    if (lieu) vise = etat.index - 1;
    return lieu;
  },
  avancer(): Lieu | null {
    const lieu = suivant(etat);
    if (lieu) vise = etat.index + 1;
    return lieu;
  },
  /** Pour les tests : repartir de rien. */
  oublier() { vise = undefined; poser(historiqueVide()); },
};
