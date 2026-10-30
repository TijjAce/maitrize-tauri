// L'album à calculer de la grande section : ses pages, les oiseaux à coller,
// l'image des oiseaux sur les fils.
//
// La séquence des décompositions additives du manuel du CRPE de l'enseignant
// (« Réussir mon CRPE », Nathan, sujet n° 6, « Décomposition additive GS »,
// p. 116-118) fait fabriquer un album à calculer. Chaque page est un carré :
// quatre cases aux coins — le chiffre, le dé, les doigts, et en bas à
// droite la décomposition —, trois fils où l'on colle des oiseaux, et deux
// traits verticaux. Le dernier quart se replie, comme une porte, sur le
// quart d'avant : les oiseaux collés entre les deux traits se cachent.
// Porte fermée, combien d'oiseaux sont cachés ?
//
// L'atelier fait la page vierge, les pages faites d'avance — la page du 3,
// porte ouverte puis fermée, ou toutes les façons de partager un nombre —,
// les oiseaux à découper pour qui n'a pas de gommettes, et l'image des
// oiseaux sur les fils qui ouvre la séance. L'oiseau est un dessin de
// Maitrize ; le dé et les doigts sont ceux des cartes-nombres de
// « Construire des collections ».

import { feuille } from "./cartesImprimables";
import { doigtsSvg, pointsSvg } from "./collections";
import { hasard, melanger } from "./hasard";
import { escapeHtml } from "./print";

export type ExerciceAlbum = "vierge" | "faite" | "oiseaux" | "fils";

export const EXERCICES_ALBUM: { id: ExerciceAlbum; libelle: string }[] = [
  { id: "vierge", libelle: "La page vierge" },
  { id: "faite", libelle: "Une page faite d'avance" },
  { id: "oiseaux", libelle: "Des oiseaux à découper" },
  { id: "fils", libelle: "Des oiseaux sur les fils, à projeter" },
];

export interface ReglagesAlbum {
  exercice: ExerciceAlbum;
  /** Le nombre de la page faite, de 2 à 9. */
  nombre: number;
  /** Combien d'oiseaux se voient, porte fermée ; 0 : au hasard. */
  vus: number;
  /** Une page pour chaque façon de partager le nombre : pour 3, deux et un, puis un et deux. */
  toutes?: boolean;
  /** Les oiseaux de l'image à projeter, de 1 à 12. */
  surLesFils: number;
  titre?: string;
}

export const REGLAGES_ALBUM: ReglagesAlbum = { exercice: "vierge", nombre: 3, vus: 0, toutes: true, surLesFils: 6 };

const borne = (v: unknown, min: number, max: number, defaut: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= min ? Math.min(max, n) : defaut;
};

/** Les réglages tels que l'atelier les relit : ce qui ne se lit pas reprend sa valeur par défaut. */
export function reglagesAlbumSurs(brut: Partial<ReglagesAlbum> | null | undefined): ReglagesAlbum {
  const b = brut ?? {};
  const nombre = borne(b.nombre, 2, 9, REGLAGES_ALBUM.nombre);
  const vus = Math.round(Number(b.vus));
  return {
    ...b,
    exercice: EXERCICES_ALBUM.some((e) => e.id === b.exercice) ? b.exercice! : REGLAGES_ALBUM.exercice,
    nombre, vus: vus >= 1 && vus < nombre ? vus : 0,
    toutes: b.toutes !== false,
    surLesFils: borne(b.surLesFils, 1, 12, REGLAGES_ALBUM.surLesFils),
  };
}

/** Le titre d'une feuille qu'on n'a pas nommée. */
export function titreAlbum(r: ReglagesAlbum): string {
  if (r.exercice === "vierge") return "L'album à calculer : la page vierge";
  if (r.exercice === "oiseaux") return "Des oiseaux à découper";
  if (r.exercice === "fils") return "Des oiseaux sur les fils";
  return r.toutes ? `L'album à calculer : les pages du ${r.nombre}` : `L'album à calculer : la page du ${r.nombre}`;
}

// ── L'oiseau ──────────────────────────────────────────────────────────────

const ENCRE = "#1c2233", BLEU = "#1e88e5", BLEU_PALE = "#e8f1fd";
const n2 = (x: number) => Number(x.toFixed(2));

/** Un rouge-gorge de profil, tourné vers la droite, dans une boîte de 100 sur 90 : ses pattes touchent le bas. */
const ROUGE_GORGE = '<path d="M20 54 L3 46 L7 61 Z" fill="#5d6068"/>'
  + '<ellipse cx="45" cy="56" rx="29" ry="21" fill="#6d7079"/>'
  + '<path d="M53 41 C71 41 77 57 71 69 C63 77 51 73 49 63 Z" fill="#e8743b"/>'
  + '<circle cx="64" cy="34" r="16" fill="#6d7079"/>'
  + '<path d="M65 24 C78 26 82 38 76 46 C70 48 62 44 60 38 Z" fill="#e8743b"/>'
  + '<circle cx="70" cy="31" r="3.4" fill="#fff"/><circle cx="70.9" cy="31" r="1.9" fill="#111"/>'
  + '<path d="M79 33 L91 36 L79 39 Z" fill="#3a3a3a"/>'
  + '<path d="M26 52 C34 42 52 46 54 58 C46 66 32 66 26 52 Z" fill="#565961"/>'
  + '<path d="M41 75 L39 88 M51 75 L53 88 M34 88 L44 88 M48 88 L58 88" stroke="#3a3a3a" stroke-width="2.6" stroke-linecap="round" fill="none"/>';

/** Un oiseau de `l` millimètres de large, ses pattes au point (x, y). */
const oiseau = (x: number, y: number, l: number) => {
  const k = l / 100;
  return `<g transform="translate(${n2(x - 50 * k)} ${n2(y - 89 * k)}) scale(${n2(k)})">${ROUGE_GORGE}</g>`;
};

/** `n` oiseaux sur les fils, répartis au hasard entre eux, à égale distance sur chacun. */
function surLesFils(n: number, fils: number[], x0: number, x1: number, alea: () => number, largeurMax: number): string {
  const parFil = [0, 0, 0];
  melanger(alea, Array.from({ length: n }, (_, i) => i % 3)).forEach((f) => parFil[f]++);
  const plus = Math.max(...parFil);
  const l = Math.min(largeurMax, (x1 - x0) / Math.max(1, plus) - 2);
  return fils.map((y, f) => Array.from({ length: parFil[f] }, (_, i) => {
    const pas = (x1 - x0) / parFil[f];
    return oiseau(x0 + pas * (i + 0.5) + (alea() - 0.5) * Math.max(0, pas - l - 2) * 0.6, y, l);
  }).join("")).join("");
}

// ── La page de l'album ────────────────────────────────────────────────────

/** Le côté de la page, en millimètres : un carré, le plus grand que la feuille A4 laisse. */
export const COTE_PAGE = 180;

/** Ce que porte une page faite : son nombre, les oiseaux vus porte fermée et ceux qu'elle cache. */
interface PageFaite { nombre: number; vus: number }

/**
 * La page, vierge ou faite : le carré ; à la moitié, le trait de ce que la
 * porte cache ; aux trois quarts, son pli, en pointillés ; trois fils ;
 * quatre cases aux coins, trois bleues — le chiffre, le dé, les doigts — et
 * celle de la décomposition.
 */
function pageSvg(faite: PageFaite | null, alea: () => number): string {
  const S = COTE_PAGE, c = 0.17 * S, m = 0.04 * S;
  const fils = [0.4, 0.55, 0.7].map((k) => k * S);
  let corps = `<rect x="0.3" y="0.3" width="${S - 0.6}" height="${S - 0.6}" fill="#fff" stroke="${ENCRE}" stroke-width="0.6"/>`;
  corps += `<line x1="${S / 2}" y1="0" x2="${S / 2}" y2="${S}" stroke="#9aa0b4" stroke-width="0.5"/>`;
  corps += `<line x1="${0.75 * S}" y1="0" x2="${0.75 * S}" y2="${S}" stroke="${ENCRE}" stroke-width="0.5" stroke-dasharray="3 2"/>`;
  corps += fils.map((y) => `<line x1="${n2(0.12 * S)}" y1="${n2(y)}" x2="${n2(0.9 * S)}" y2="${n2(y)}" stroke="${ENCRE}" stroke-width="0.7" stroke-linecap="round"/>`).join("");
  const cases: { x: number; y: number; bleue: boolean }[] = [
    { x: m, y: m, bleue: true }, { x: S - m - c, y: m, bleue: true }, { x: m, y: S - m - c, bleue: true }, { x: S - m - c, y: S - m - c, bleue: false },
  ];
  corps += cases.map((k) => `<rect x="${n2(k.x)}" y="${n2(k.y)}" width="${n2(c)}" height="${n2(c)}" rx="1.5" fill="${k.bleue ? BLEU_PALE : "#fff"}"`
    + ` stroke="${k.bleue ? BLEU : ENCRE}" stroke-width="${k.bleue ? 0.9 : 0.6}"/>`).join("");
  if (faite) {
    const { nombre: n, vus } = faite;
    const dedans = (svg: string, k: { x: number; y: number }) => svg.replace(/^<svg /, `<svg x="${n2(k.x + 2)}" y="${n2(k.y + 2)}" width="${n2(c - 4)}" height="${n2(c - 4)}" `);
    corps += `<text x="${n2(m + c / 2)}" y="${n2(m + c / 2 + 7.5)}" text-anchor="middle" font-size="22" font-weight="800" fill="${ENCRE}">${n}</text>`;
    corps += dedans(pointsSvg(n), cases[1]) + dedans(doigtsSvg(n), cases[2]);
    corps += `<text x="${n2(S - m - c / 2)}" y="${n2(S - m - c / 2 + 3)}" text-anchor="middle" font-size="8.5" font-weight="800" fill="${ENCRE}">${vus} + ${n - vus}</text>`;
    // Les oiseaux qu'on voit, avant le trait de la moitié ; ceux que la porte cache, entre la moitié et le pli.
    // Tous de la même taille : au plus la place entre deux fils, moins s'ils sont nombreux sous la porte.
    const l = Math.min(26, ...[[vus, 0.12 * S + 3, S / 2 - 3], [n - vus, S / 2 + 3, 0.75 * S - 3]].map(([k, a, b]) => (b - a) / Math.max(1, Math.ceil(k / 3)) - 2));
    corps += surLesFils(vus, fils, 0.12 * S + 3, S / 2 - 3, alea, l) + surLesFils(n - vus, fils, S / 2 + 3, 0.75 * S - 3, alea, l);
  }
  return `<svg class="ac-page" viewBox="0 0 ${S} ${S}" width="${S}mm" height="${S}mm">${corps}</svg>`;
}

// ── La feuille ────────────────────────────────────────────────────────────

const consigne = (t: string) => `<div class="regle"><b>Consigne</b>${escapeHtml(t)}</div>`;

/** La feuille : la page vierge, une page faite ou toutes celles d'un nombre, les oiseaux à découper, ou les oiseaux sur les fils. */
export function htmlAlbum(r: ReglagesAlbum, graine: number): string {
  const alea = hasard(graine);
  const titre = r.titre?.trim() || titreAlbum(r);
  const page = (t: string, corps: string, avant = "") => `<div class="page ac-feuille"><div class="titre">${escapeHtml(t)}</div>${avant}${corps}</div>`;

  if (r.exercice === "vierge") {
    return feuille(page(titre, pageSvg(null, alea), consigne("Je fais la page de mon nombre. Dans les cases bleues, j'écris le chiffre, je dessine le dé et les doigts. "
      + "Je colle les oiseaux sur les fils : porte fermée, il faut que des oiseaux soient cachés. Dans la case du bas, j'écris les oiseaux qu'on voit et ceux qui sont cachés.")), "ac");
  }

  if (r.exercice === "faite") {
    // Toutes les façons : du plus d'oiseaux vus au moins — pour 3, deux et un, puis un et deux, comme les deux pages du manuel.
    const lesVus = r.toutes ? Array.from({ length: r.nombre - 1 }, (_, i) => r.nombre - 1 - i) : [r.vus || 1 + Math.floor(alea() * (r.nombre - 1))];
    return feuille(lesVus.map((vus, i) => page(lesVus.length > 1 ? `${titre} — ${i + 1}/${lesVus.length}` : titre, pageSvg({ nombre: r.nombre, vus }, alea),
      i === 0 ? consigne("Porte fermée, je dis combien d'oiseaux sont cachés. J'ouvre la porte pour vérifier.") : "")).join(""), "ac");
  }

  if (r.exercice === "oiseaux") {
    // Six colonnes, neuf rangées : de quoi faire plusieurs pages de l'album.
    const [colonnes, rangees, l, h] = [6, 9, 31, 26];
    const cases = Array.from({ length: colonnes * rangees }, (_, i) => {
      const [x, y] = [(i % colonnes) * l, Math.floor(i / colonnes) * h];
      return `<rect x="${x}" y="${y}" width="${l}" height="${h}" fill="none" stroke="#9aa0b4" stroke-width="0.3" stroke-dasharray="2 1.5"/>${oiseau(x + l / 2, y + h - 2.5, 24)}`;
    }).join("");
    return feuille(page(titre, `<svg class="ac-oiseaux" viewBox="0 0 ${colonnes * l} ${rangees * h}" width="${colonnes * l}mm" height="${rangees * h}mm">${cases}</svg>`,
      consigne("Je découpe les oiseaux en suivant les pointillés.")), "ac");
  }

  // Les oiseaux sur les fils, à projeter ou à afficher : à l'horizontale, grands.
  const [L, H] = [270, 165];
  const fils = [0.3, 0.6, 0.9].map((k) => k * H);
  const lignes = fils.map((y) => `<line x1="4" y1="${n2(y)}" x2="${L - 4}" y2="${n2(y)}" stroke="${ENCRE}" stroke-width="1.2" stroke-linecap="round"/>`).join("");
  return feuille(page(titre, `<svg class="ac-fils" viewBox="0 0 ${L} ${H}" width="${L}mm" height="${H}mm">${lignes}${surLesFils(r.surLesFils, fils, 10, L - 10, alea, 46)}</svg>`), "ac");
}

/** Les marges de la page : 10 mm, sans la marge intérieure du document ; à l'horizontale pour l'image à projeter. */
export function styleAlbum(r: ReglagesAlbum): string {
  return STYLE_ALBUM + `\n  @page { size: A4 ${r.exercice === "fils" ? "landscape" : "portrait"}; margin: 10mm; }\n  @media print { body { padding: 0; } }\n`;
}

export const STYLE_ALBUM = `
  .feuille.ac .ac-feuille { text-align: center; }
  .feuille.ac .ac-feuille .titre, .feuille.ac .ac-feuille .regle { text-align: left; }
  .feuille.ac .ac-page, .feuille.ac .ac-oiseaux, .feuille.ac .ac-fils { display: inline-block; vertical-align: top; margin-top: 2mm; }
  @media screen { .feuille.ac .ac-page, .feuille.ac .ac-oiseaux, .feuille.ac .ac-fils { max-width: 100%; height: auto; } }
`;
