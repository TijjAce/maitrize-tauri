// ── Le format ouvert des tableaux (.obz), dans les deux sens ─────────────
//
// Le même que celui de Maitrize (tla_obz.rs) : un manifeste, un tableau
// `.obf` par page — ses boutons, sa grille, ses images —, les images dans
// l'archive. Les pages gardent l'ordre du classeur, la page 1 d'abord. Une
// case liée devient un bouton qui ouvre l'autre tableau (`load_board`), une
// case cachée un bouton caché. Ce que le format ne connaît pas — la suite
// d'une section, la page des catégories — passe dans des champs `ext_…`,
// que le format réserve aux extensions : les autres applications les
// laissent de côté. L'archive se fait et se défait en Rust (src-tauri/src/obz.rs).

import { COLONNES_MAX, LIGNES_MAX, nouvelId, ordreDesPages, type Case, type Classeur, type Page } from "./modele";

export interface FichiersObz {
  /** Le manifeste et les tableaux, en texte. */
  textes: Record<string, string>;
  /** Les images, en base64 (ou en adresse `data:`). */
  images: Record<string, string>;
}

export const FORMAT = "open-board-0.1";

/** « rgb(r, g, b) » ou « #rrggbb » en « #rrggbb » ; rien si la couleur est mal écrite. */
export function enHex(c: unknown): string | undefined {
  if (typeof c !== "string") return undefined;
  const t = c.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(t)) return t;
  const m = t.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/);
  if (!m) return undefined;
  return "#" + m.slice(1, 4).map((x) => Math.min(255, Number(x)).toString(16).padStart(2, "0")).join("");
}

export function enRgb(hex: string | undefined, defaut: string): string {
  const h = enHex(hex);
  if (!h) return defaut;
  return `rgb(${parseInt(h.slice(1, 3), 16)}, ${parseInt(h.slice(3, 5), 16)}, ${parseInt(h.slice(5, 7), 16)})`;
}

const typeDe = (dataUrl: string): string => dataUrl.match(/^data:([^;,]+)/)?.[1] ?? "image/png";
const extension = (type: string) => (type === "image/jpeg" ? "jpg" : type === "image/webp" ? "webp" : type === "image/svg+xml" ? "svg" : "png");
const base64De = (dataUrl: string) => dataUrl.slice(dataUrl.indexOf(",") + 1);

/** La licence d'une image, comme le format la décrit : ARASAAC en CC BY-NC-SA, le reste à l'enseignant. */
function licenceDe(imageId: string): Record<string, string> {
  if (imageId.startsWith("arasaac-")) {
    return {
      type: "CC BY-NC-SA", copyright_notice_url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
      source_url: "https://arasaac.org", author_name: "Sergio Palao (ARASAAC, Gouvernement d'Aragon)", author_url: "https://arasaac.org",
    };
  }
  return { type: "private" };
}

/** Le classeur en fichiers d'archive : l'accueil d'abord, puis les autres pages dans leur ordre. */
export function versObz(c: Classeur, images: Record<string, string>): FichiersObz {
  const ordre = ordreDesPages(c);
  const numero = new Map(ordre.map((p, i) => [p.id, i + 1]));
  const textes: Record<string, string> = {};
  const fichiersImages: Record<string, string> = {};
  const cheminsImages: Record<string, string> = {};
  const cheminsTableaux: Record<string, string> = {};
  const decrites = new Map<string, Record<string, unknown>>();

  for (const p of ordre) {
    const n = numero.get(p.id)!;
    const boutons: Record<string, unknown>[] = [];
    const imagesDuTableau: Record<string, unknown>[] = [];
    const grille: (string | null)[][] = Array.from({ length: p.lignes }, () => []);
    p.cases.forEach((k, i) => {
      const rang = Math.floor(i / p.colonnes);
      if (!k || (!k.mot.trim() && !k.image)) { grille[rang].push(null); return; }
      const id = `${n}-${i + 1}`;
      const b: Record<string, unknown> = {
        id, label: k.mot.trim(),
        background_color: enRgb(k.fond, "rgb(255, 255, 255)"), border_color: enRgb(k.bord, "rgb(140, 140, 150)"),
      };
      if (k.dire?.trim() && k.dire.trim() !== k.mot.trim()) b.vocalization = k.dire.trim();
      if (k.masquee) b.hidden = true;
      // Les poids des ensembles par thème, calculés à l'avance : des champs d'extension, que les autres applications ignorent.
      if (typeof k.poids === "number") b.ext_maitrize_poids = k.poids;
      const suites = (k.suites ?? []).flatMap((s) => { const n = numero.get(s.page); return n ? [{ id: `page${n}`, poids: s.poids }] : []; });
      if (suites.length) b.ext_maitrize_suites = suites;
      const cible = k.lien ? numero.get(k.lien) : undefined;
      if (cible) b.load_board = { id: `page${cible}`, path: `boards/page${cible}.obf` };
      const donnee = k.image ? images[k.image] : undefined;
      if (k.image && donnee) {
        let decrite = decrites.get(k.image);
        if (!decrite) {
          const m = decrites.size + 1;
          const type = typeDe(donnee);
          const chemin = `images/image${m}.${extension(type)}`;
          decrite = { id: `image${m}`, path: chemin, content_type: type, license: licenceDe(k.image) };
          // Un picto d'ARASAAC dit son numéro (le champ « symbol » du format) : Maitrize, qui a la banque, le reprend tel quel.
          const arasaac = k.image.match(/^arasaac-(\d+)$/);
          if (arasaac) decrite.symbol = { set: "arasaac", filename: `${arasaac[1]}.png` };
          decrites.set(k.image, decrite);
          cheminsImages[`image${m}`] = chemin;
          fichiersImages[chemin] = base64De(donnee);
        }
        b.image_id = decrite.id;
        if (!imagesDuTableau.some((x) => x.id === decrite!.id)) imagesDuTableau.push(decrite);
      }
      boutons.push(b);
      grille[rang].push(id);
    });
    const chemin = `boards/page${n}.obf`;
    cheminsTableaux[`page${n}`] = chemin;
    textes[chemin] = JSON.stringify({
      format: FORMAT, id: `page${n}`, locale: "fr", name: p.nom, buttons: boutons,
      grid: { rows: p.lignes, columns: p.colonnes, order: grille }, images: imagesDuTableau, sounds: [], license: { type: "private" },
      ...(p.suite && n > 1 ? { ext_maitrize_suite: true } : {}),
      ...(c.categories === p.id ? { ext_maitrize_categories: true } : {}),
    }, null, 2);
  }
  textes["manifest.json"] = JSON.stringify({
    format: FORMAT, root: "boards/page1.obf", paths: { boards: cheminsTableaux, images: cheminsImages, sounds: {} },
  }, null, 2);
  return { textes, images: fichiersImages };
}

interface BoutonObf {
  id?: unknown; label?: unknown; vocalization?: unknown; image_id?: unknown; background_color?: unknown; border_color?: unknown;
  hidden?: unknown; load_board?: { id?: unknown; path?: unknown };
  ext_maitrize_poids?: unknown; ext_maitrize_suites?: unknown;
}
interface TableauObf {
  id?: unknown; name?: unknown; buttons?: BoutonObf[]; grid?: { rows?: unknown; columns?: unknown; order?: unknown[][] };
  images?: { id?: unknown; path?: unknown; data?: unknown; url?: unknown; symbol?: { set?: unknown; filename?: unknown } }[];
  ext_maitrize_suite?: unknown; ext_maitrize_categories?: unknown;
}

const texte = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
const normalise = (chemin: string) => chemin.replace(/^\.?\//, "");

/**
 * Un classeur relu d'une archive : chaque tableau devient une page, ses liens retrouvent leur page, ses images
 * prennent un identifiant neuf (rendu avec leurs données, à garder). Une image absente laisse la case avec son mot.
 */
export function depuisObz(f: FichiersObz, nom: string, maintenant = new Date().toISOString()): { classeur: Classeur; images: Record<string, string> } {
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
    return { chemin, t, pageId: nouvelId() };
  });
  const parChemin = new Map(tableaux.map((x) => [x.chemin, x.pageId]));
  const parId = new Map(tableaux.filter((x) => texte(x.t.id)).map((x) => [texte(x.t.id), x.pageId]));
  const images: Record<string, string> = {};
  const imageDuChemin = new Map<string, string>();

  const pages: Page[] = tableaux.map(({ chemin, t, pageId }) => {
    const boutons = Array.isArray(t.buttons) ? t.buttons : [];
    const parBouton = new Map(boutons.map((b) => [texte(b.id), b]));
    const order = Array.isArray(t.grid?.order) ? t.grid!.order : null;
    const lignes = Math.min(LIGNES_MAX, Math.max(1, Number(t.grid?.rows) || order?.length || Math.ceil(boutons.length / 6) || 1));
    const colonnes = Math.min(COLONNES_MAX, Math.max(1, Number(t.grid?.columns) || order?.[0]?.length || Math.min(6, boutons.length) || 1));
    const placesDeBoutons: (BoutonObf | undefined)[] = order
      ? Array.from({ length: lignes * colonnes }, (_, i) => {
        const id = order[Math.floor(i / colonnes)]?.[i % colonnes];
        return id === null || id === undefined ? undefined : parBouton.get(texte(id));
      })
      : Array.from({ length: lignes * colonnes }, (_, i) => boutons[i]);
    const imagesDuTableau = Array.isArray(t.images) ? t.images : [];
    const cases = placesDeBoutons.map((b): Case | null => {
      if (!b) return null;
      const mot = texte(b.label).trim();
      const k: Case = { id: nouvelId(), mot };
      const dire = texte(b.vocalization).trim();
      if (dire && dire !== mot) k.dire = dire;
      const fond = enHex(b.background_color), bord = enHex(b.border_color);
      if (fond && fond !== "#ffffff") k.fond = fond;
      if (bord && bord !== "#8c8c96") k.bord = bord;
      if (b.hidden === true) k.masquee = true;
      if (typeof b.ext_maitrize_poids === "number" && Number.isFinite(b.ext_maitrize_poids)) k.poids = b.ext_maitrize_poids;
      if (Array.isArray(b.ext_maitrize_suites)) {
        const suites = (b.ext_maitrize_suites as { id?: unknown; poids?: unknown }[]).flatMap((x) => {
          const page = x && parId.get(texte(x.id));
          return page && typeof x.poids === "number" ? [{ page, poids: x.poids }] : [];
        });
        if (suites.length) k.suites = suites;
      }
      const vers = b.load_board;
      if (vers) {
        const cible = (typeof vers.path === "string" && parChemin.get(normalise(vers.path))) || parId.get(texte(vers.id));
        if (cible) k.lien = cible;
      }
      const decrite = imagesDuTableau.find((x) => texte(x.id) === texte(b.image_id) && texte(b.image_id));
      if (decrite) {
        const chemin = typeof decrite.path === "string" ? normalise(decrite.path) : "";
        const donnees = chemin && f.images[chemin] ? f.images[chemin] : typeof decrite.data === "string" ? decrite.data : "";
        // Un picto d'ARASAAC garde son numéro : le même picto, déjà pris, n'est pas gardé deux fois.
        const numero = texte(decrite.symbol?.set).toLowerCase() === "arasaac" ? texte(decrite.symbol?.filename).match(/^(\d+)/)?.[1] : undefined;
        if (donnees) {
          const cle = chemin || `${chemin}#${texte(decrite.id)}`;
          let imageId = imageDuChemin.get(cle);
          if (!imageId) {
            imageId = numero ? `arasaac-${numero}` : `image-${nouvelId()}`;
            imageDuChemin.set(cle, imageId);
            images[imageId] = donnees;
          }
          k.image = imageId;
        }
      }
      return mot || k.image ? k : null;
    });
    const page: Page = { id: pageId, nom: texte(t.name).trim() || chemin.replace(/^boards\//, "").replace(/\.obf$/i, ""), lignes, colonnes, cases };
    if (t.ext_maitrize_suite === true) page.suite = true;
    return page;
  });
  if (pages[0]) delete pages[0].suite;
  const categories = tableaux.find((x) => x.t.ext_maitrize_categories === true)?.pageId;
  const classeur: Classeur = {
    id: nouvelId(), nom: nom.trim() || pages[0].nom || "Classeur importé", accueil: pages[0].id, ...(categories ? { categories } : {}),
    pages, creeLe: maintenant, modifieLe: maintenant,
  };
  return { classeur, images };
}
