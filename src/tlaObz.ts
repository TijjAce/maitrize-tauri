// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// ── Un classeur reçu au format ouvert (.obz), en tableaux de langage ──────
//
// Le retour du classeur de l'iPad (« classeur/ ») : l'enseignant l'a modifié
// sur la tablette, l'a exporté, envoyé par AirDrop ; ici, il redevient des
// tableaux de langage à pages liées (TLA › Importer). Chaque tableau devient
// une page ; une case garde son mot, sa page liée, sa case cachée ; sa nature
// se retrouve à sa couleur (une autre couleur reste la sienne) ; un picto
// d'ARASAAC se retrouve à son numéro (le champ « symbol » du format), dans la
// banque de Maitrize ; une autre image — une photo prise sur la tablette —
// rejoint Mes photos, et la case la montre.

import { caseVide, type CaseTla, type Gabarit, type NatureMot } from "./api";
import { NATURES, nouveauGabarit } from "./tla";

export interface FichiersObz { textes: Record<string, string>; images: Record<string, string> }

const LIGNES_MAX = 12;
const COLONNES_MAX = 12;

interface BoutonObf {
  id?: unknown; label?: unknown; image_id?: unknown; background_color?: unknown; hidden?: unknown; load_board?: { id?: unknown; path?: unknown };
}
interface TableauObf {
  id?: unknown; name?: unknown; buttons?: BoutonObf[]; grid?: { rows?: unknown; columns?: unknown; order?: unknown[][] };
  images?: { id?: unknown; path?: unknown; data?: unknown; symbol?: { set?: unknown; filename?: unknown } }[];
}

const texte = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
const normalise = (chemin: string) => chemin.replace(/^\.?\//, "");

/** « rgb(r, g, b) » ou « #rrggbb » en « #rrggbb ». */
export function enHex(c: unknown): string | undefined {
  if (typeof c !== "string") return undefined;
  const t = c.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(t)) return t;
  const m = t.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/);
  return m ? "#" + m.slice(1, 4).map((x) => Math.min(255, Number(x)).toString(16).padStart(2, "0")).join("") : undefined;
}

/**
 * Les tableaux d'un classeur reçu, l'accueil d'abord. `garderPhoto` range une image qui n'est pas un picto
 * d'ARASAAC dans Mes photos et rend son numéro (rien si elle n'a pas pu l'être : la case garde son mot).
 */
export async function gabaritsDepuisObz(
  f: FichiersObz, garderPhoto: (mot: string, base64: string, ext: "png" | "jpg") => Promise<number | null>,
): Promise<Gabarit[]> {
  let manifeste: { root?: unknown; paths?: { boards?: Record<string, unknown> } } = {};
  try { manifeste = JSON.parse(f.textes["manifest.json"] ?? "{}"); } catch { manifeste = {}; }
  const chemins = [
    ...(typeof manifeste.root === "string" ? [normalise(manifeste.root)] : []),
    ...Object.values(manifeste.paths?.boards ?? {}).filter((x): x is string => typeof x === "string").map(normalise),
    ...Object.keys(f.textes).filter((k) => k.toLowerCase().endsWith(".obf")).map(normalise),
  ].filter((x, i, a) => a.indexOf(x) === i && f.textes[x] !== undefined);
  if (!chemins.length) throw new Error("Cette archive n'a aucun tableau.");

  const tableaux = chemins.map((chemin) => {
    let t: TableauObf = {};
    try { t = JSON.parse(f.textes[chemin]); } catch { t = {}; }
    const order = Array.isArray(t.grid?.order) ? t.grid!.order : null;
    const boutons = Array.isArray(t.buttons) ? t.buttons : [];
    const lignes = Math.min(LIGNES_MAX, Math.max(1, Number(t.grid?.rows) || order?.length || Math.ceil(boutons.length / 5) || 1));
    const colonnes = Math.min(COLONNES_MAX, Math.max(1, Number(t.grid?.columns) || order?.[0]?.length || Math.min(5, boutons.length) || 1));
    return { chemin, t, order, boutons, gabarit: { ...nouveauGabarit(colonnes, lignes), nom: texte(t.name).trim() || "Page" } };
  });
  const parChemin = new Map(tableaux.map((x) => [x.chemin, x.gabarit.id]));
  const parId = new Map(tableaux.filter((x) => texte(x.t.id)).map((x) => [texte(x.t.id), x.gabarit.id]));
  const photos = new Map<string, number | null>();

  for (const { t, order, boutons, gabarit } of tableaux) {
    const parBouton = new Map(boutons.map((b) => [texte(b.id), b]));
    const images = Array.isArray(t.images) ? t.images : [];
    const cases: CaseTla[] = [];
    for (let i = 0; i < gabarit.lignes * gabarit.colonnes; i++) {
      const id = order ? order[Math.floor(i / gabarit.colonnes)]?.[i % gabarit.colonnes] : undefined;
      const b = order ? (id === null || id === undefined ? undefined : parBouton.get(texte(id))) : boutons[i];
      if (!b) { cases.push(caseVide()); continue; }
      const mot = texte(b.label).trim();
      const fond = enHex(b.background_color);
      const nature = NATURES.find((n) => n.couleur === fond)?.id;
      const k: CaseTla = { ...caseVide(), mot, nature: (nature ?? "nom") as NatureMot };
      if (!nature && fond && fond !== "#ffffff") k.couleur = fond;
      if (b.hidden === true) k.masquee = true;
      const vers = b.load_board;
      const cible = vers && ((typeof vers.path === "string" && parChemin.get(normalise(vers.path))) || parId.get(texte(vers.id)));
      if (cible && cible !== gabarit.id) k.lien = cible;
      const decrite = images.find((x) => texte(b.image_id) && texte(x.id) === texte(b.image_id));
      if (decrite) {
        const arasaac = texte(decrite.symbol?.set).toLowerCase() === "arasaac" ? Number(texte(decrite.symbol?.filename).match(/^(\d+)/)?.[1]) : NaN;
        if (Number.isInteger(arasaac) && arasaac > 0) {
          k.pictoId = arasaac;
        } else {
          const chemin = typeof decrite.path === "string" ? normalise(decrite.path) : "";
          const donnees = chemin && f.images[chemin] ? f.images[chemin] : typeof decrite.data === "string" ? decrite.data.slice(decrite.data.indexOf(",") + 1) : "";
          if (donnees) {
            const cle = chemin || donnees.slice(0, 64);
            if (!photos.has(cle)) photos.set(cle, await garderPhoto(mot || "Image du classeur", donnees, /\.jpe?g$/i.test(chemin) ? "jpg" : "png"));
            const numero = photos.get(cle);
            if (numero != null) k.pictoId = numero;
          }
        }
      }
      cases.push(k);
    }
    gabarit.cases = cases;
  }
  return tableaux.map((x) => x.gabarit);
}
