// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// ── Les espaces de la classe dans le plan de classe ───────────────────────
//
// « Quand j'ajoute un nouvel espace de classe, il se met dans aménagement
// dans plan de classe » (l'enseignant, 5 novembre 2026). Un espace de la
// classe — l'armoire, le coin lecture —, créé d'après une photo ou au plan de
// travail, prend sa place dans chaque agencement de la salle, à son nom, là
// où il y a de la place : le long des murs d'abord. L'enseignant le glisse
// ensuite où il est vraiment.
//
// Un espace posé est retenu (réglage « salle:espacesConnus ») : retiré d'un
// agencement, il n'y revient pas tout seul. Les espaces qu'un agencement n'a
// pas se proposent dans « Ajouter », en mode Aménagement. À la première
// ouverture, seuls les espaces de la semaine se posent : les plus anciens
// ne couvrent pas d'un coup un plan déjà fait, ils attendent dans « Ajouter ».

export interface EspaceDeLaClasse { id: string; titre: string; dateCreation?: string }

/** Un élément du plan de salle ; `espaceId` : l'espace de la classe qu'il représente. */
export interface ElementDeSalle { id: string; type: string; x: number; y: number; w: number; h: number; label: string; espaceId?: string }

export interface AgencementDeSalle<E extends ElementDeSalle = ElementDeSalle> { id: string; nom: string; elements: E[] }

/** La salle du plan : une toile de 900 sur 560, une grille de 10. */
const LARGEUR = 900, HAUTEUR = 560, PAS = 10, MARGE = 10;

/** Les espaces créés depuis moins de tant de jours se posent à la première ouverture. */
export const JOURS_RECENTS = 7;

const plier = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Un coin, une zone, un atelier : une surface au sol ; le reste — armoire, étagère, bac — : un meuble. */
export const estUneZone = (titre: string) => /^(coin|espace|zone|atelier|tapis)\b|regroupement/.test(plier(titre));

/** La sorte et la taille d'un espace sur le plan, comme le coin regroupement ou le meuble d'« Ajouter ». */
export const formeDeLEspace = (titre: string): { type: "tapis" | "meuble"; w: number; h: number } =>
  (estUneZone(titre) ? { type: "tapis", w: 200, h: 130 } : { type: "meuble", w: 130, h: 40 });

const chevauche = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  !(a.x + a.w + MARGE <= b.x || b.x + b.w + MARGE <= a.x || a.y + a.h + MARGE <= b.y || b.y + b.h + MARGE <= a.y);

/**
 * Une place libre pour un rectangle w × h : le long des murs d'abord — en haut, en bas, à gauche, à droite —,
 * puis n'importe où ; sans place, en haut à gauche, décalé pour ne pas cacher un autre ajout.
 */
export function placeLibre(elements: Pick<ElementDeSalle, "x" | "y" | "w" | "h">[], w: number, h: number): { x: number; y: number } {
  const xMax = LARGEUR - w - 20, yMax = HAUTEUR - h - 20;
  const xs: number[] = [], ys: number[] = [];
  for (let x = 20; x <= xMax; x += PAS) xs.push(x);
  for (let y = 20; y <= yMax; y += PAS) ys.push(y);
  const candidats = [
    ...xs.map((x) => ({ x, y: 20 })), ...xs.map((x) => ({ x, y: yMax })),
    ...ys.map((y) => ({ x: 20, y })), ...ys.map((y) => ({ x: xMax, y })),
    ...ys.flatMap((y) => xs.map((x) => ({ x, y }))),
  ];
  const libre = candidats.find((c) => !elements.some((e) => chevauche({ ...c, w, h }, e)));
  if (libre) return libre;
  const decalage = (elements.length % 10) * PAS;
  return { x: 20 + decalage, y: 20 + decalage };
}

/**
 * L'élément d'un espace dans un agencement : celui qui porte déjà son nom sans représenter d'espace — le coin
 * regroupement posé à la main devient celui de l'espace « Coin regroupement » —, sinon un nouveau, à une place libre.
 */
export function elementDeLEspace<E extends ElementDeSalle>(espace: EspaceDeLaClasse, agencement: AgencementDeSalle<E>): { elements: E[]; element: E } {
  const homonyme = agencement.elements.find((e) => !e.espaceId && plier(e.label) === plier(espace.titre));
  if (homonyme) {
    const lie = { ...homonyme, espaceId: espace.id };
    return { elements: agencement.elements.map((e) => (e === homonyme ? lie : e)), element: lie };
  }
  const forme = formeDeLEspace(espace.titre);
  const element = {
    id: `espace-${espace.id}-${agencement.id}`, type: forme.type, ...placeLibre(agencement.elements, forme.w, forme.h),
    w: forme.w, h: forme.h, label: espace.titre.trim().slice(0, 40), espaceId: espace.id,
  } as unknown as E;
  return { elements: [...agencement.elements, element], element };
}

/** Les espaces qu'un agencement n'a pas encore, à proposer dans « Ajouter » : par ordre alphabétique, ceux qui ont un nom. */
export const espacesAPlacer = (espaces: EspaceDeLaClasse[], agencement: AgencementDeSalle | undefined): EspaceDeLaClasse[] => {
  const poses = new Set((agencement?.elements ?? []).flatMap((e) => (e.espaceId ? [e.espaceId] : [])));
  return espaces.filter((e) => e.titre.trim() && !poses.has(e.id)).sort((a, b) => a.titre.localeCompare(b.titre, "fr", { sensitivity: "base", numeric: true }));
};

/** Le jour, AAAA-MM-JJ, tant de jours avant un autre. */
const joursAvant = (jour: string, n: number) => {
  const d = new Date(`${jour}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

/**
 * Les agencements, une fois les espaces nouveaux posés dans chacun. `connus` : les espaces déjà posés (ou trop
 * anciens pour l'être à la première ouverture) ; `null` à la première ouverture. Sans agencement, rien ne se pose
 * ni ne se retient : les espaces attendront la première salle.
 */
export function poserLesEspacesNouveaux<E extends ElementDeSalle>(
  agencements: AgencementDeSalle<E>[], espaces: EspaceDeLaClasse[], connus: string[] | null, aujourdhui: string,
): { agencements: AgencementDeSalle<E>[]; connus: string[]; poses: EspaceDeLaClasse[] } {
  const avecNom = espaces.filter((e) => e.titre.trim());
  if (!agencements.length) return { agencements, connus: connus ?? [], poses: [] };
  const limite = joursAvant(aujourdhui, JOURS_RECENTS);
  const deja = new Set(connus ?? avecNom.filter((e) => (e.dateCreation ?? "").slice(0, 10) < limite).map((e) => e.id));
  const nouveaux = avecNom.filter((e) => !deja.has(e.id));
  let suite = agencements;
  for (const espace of nouveaux) {
    suite = suite.map((a) => (a.elements.some((e) => e.espaceId === espace.id) ? a : { ...a, elements: elementDeLEspace(espace, a).elements }));
  }
  return { agencements: suite, connus: [...deja, ...nouveaux.map((e) => e.id)], poses: nouveaux };
}

/** Le réglage qui retient les espaces déjà posés dans le plan. */
export const CLE_ESPACES_CONNUS = "salle:espacesConnus";

const lireListe = <T,>(brut: string | null | undefined): T[] | null => {
  if (!brut) return null;
  try { const v = JSON.parse(brut); return Array.isArray(v) ? (v as T[]) : null; } catch { return null; }
};

/**
 * Pose dans le plan de classe les espaces nouveaux — d'où qu'ils viennent : une photo, le plan de travail, l'autre
 * ordinateur —, et rend ceux qui ont été posés. Les deux réglages s'écrivent par écart : ce que l'autre ordinateur
 * a changé entre-temps reste.
 */
export async function poserLesEspacesDansLaSalle(): Promise<EspaceDeLaClasse[]> {
  const { api } = await import("./api");
  const { isoJour } = await import("./dates");
  const [brutProfils, brutConnus, espaces] = await Promise.all([
    api.settingGet("salle:profils"), api.settingGet(CLE_ESPACES_CONNUS), api.espacesList(),
  ]);
  const agencements = lireListe<AgencementDeSalle>(brutProfils) ?? [];
  const connus = lireListe<string>(brutConnus);
  const r = poserLesEspacesNouveaux(agencements, espaces, connus, isoJour(new Date()));
  if (r.poses.length) await api.settingEcart("salle:profils", JSON.stringify(agencements), JSON.stringify(r.agencements));
  if (agencements.length && JSON.stringify(r.connus) !== JSON.stringify(connus)) {
    await api.settingEcart(CLE_ESPACES_CONNUS, JSON.stringify(connus ?? []), JSON.stringify(r.connus));
  }
  return r.poses;
}
