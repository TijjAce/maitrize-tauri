// ── Le répertoire graphique de la classe ──────────────────────────────────
//
// « Fais-les tous » (l'enseignant, 4 novembre 2026). Le programme de l'école
// maternelle (2025) fait réaliser aux élèves « un répertoire graphique commun
// constitué de signes simples », dont ils se servent ensuite pour s'entraîner
// à reproduire différents motifs (p. 28). Chaque carte montre un signe, tracé
// en bande comme on le reproduit, et son nom ; une case peut attendre la
// photo de l'endroit où la classe l'a trouvé — dans l'école, le quartier, une
// œuvre. Les tracés sont dessinés ici, en vectoriel : ils restent nets à
// toutes les tailles.

import { feuille } from "./cartesImprimables";
import { escapeHtml } from "./print";

export type Signe =
  | "verticales" | "horizontales" | "obliques" | "ponts" | "coupes" | "vagues" | "boucles" | "spirales"
  | "ronds" | "points" | "croix" | "zigzags" | "creneaux" | "quadrillage";

export const SIGNES: { id: Signe; nom: string }[] = [
  { id: "verticales", nom: "les lignes verticales" }, { id: "horizontales", nom: "les lignes horizontales" },
  { id: "obliques", nom: "les lignes obliques" }, { id: "points", nom: "les points" }, { id: "ronds", nom: "les ronds" },
  { id: "croix", nom: "les croix" }, { id: "ponts", nom: "les ponts" }, { id: "coupes", nom: "les coupes" },
  { id: "vagues", nom: "les vagues" }, { id: "zigzags", nom: "les zigzags" }, { id: "creneaux", nom: "les créneaux" },
  { id: "boucles", nom: "les boucles" }, { id: "spirales", nom: "les spirales" }, { id: "quadrillage", nom: "le quadrillage" },
];

export interface ReglagesRepertoire {
  signes: Signe[];
  /** Le nom en capitales, comme on l'écrit d'abord en maternelle. */
  capitales: boolean;
  /** Une case pour la photo de l'endroit où on l'a trouvé. */
  photo: boolean;
  format: "mur" | "etiquettes";
}

export const REGLAGES_REPERTOIRE: ReglagesRepertoire = {
  signes: ["verticales", "horizontales", "obliques", "ronds", "ponts", "coupes", "vagues", "zigzags", "boucles", "spirales"],
  capitales: true, photo: false, format: "mur",
};

export function reglagesRepertoireSurs(brut: Partial<ReglagesRepertoire> | null | undefined): ReglagesRepertoire {
  const o = (brut && typeof brut === "object" ? brut : {}) as Partial<ReglagesRepertoire>;
  const d = REGLAGES_REPERTOIRE;
  const connus = new Set(SIGNES.map((s) => s.id));
  const signes = Array.isArray(o.signes) ? [...new Set(o.signes.filter((s): s is Signe => connus.has(s as Signe)))] : d.signes;
  return {
    signes: signes.length ? signes : d.signes,
    capitales: typeof o.capitales === "boolean" ? o.capitales : d.capitales,
    photo: typeof o.photo === "boolean" ? o.photo : d.photo,
    format: o.format === "etiquettes" ? "etiquettes" : "mur",
  };
}

/** Les tracés d'un signe, dans une bande de 150 × 34 (unités du dessin). */
export function traceDuSigne(s: Signe): string {
  const L = 150, H = 34, m = 8;
  const chemin = (d: string) => `<path d="${d}"/>`;
  const pts = (f: (t: number) => [number, number], debut: number, fin: number, pas: number) => {
    const p: string[] = [];
    for (let t = debut; t <= fin + 1e-9; t += pas) { const [x, y] = f(t); p.push(`${x.toFixed(2)} ${y.toFixed(2)}`); }
    return `M ${p.join(" L ")}`;
  };
  switch (s) {
    case "verticales": return Array.from({ length: 12 }, (_, i) => chemin(`M ${m + i * 12} 6 L ${m + i * 12} ${H - 6}`)).join("");
    case "horizontales": return [7, 17, 27].map((y) => chemin(`M ${m} ${y} L ${L - m} ${y}`)).join("");
    case "obliques": return Array.from({ length: 11 }, (_, i) => chemin(`M ${m + i * 12} ${H - 6} L ${m + 10 + i * 12} 6`)).join("");
    case "points": return Array.from({ length: 24 }, (_, i) => `<circle cx="${m + (i % 12) * 12}" cy="${i < 12 ? 11 : 23}" r="1.6" class="rg-plein"/>`).join("");
    case "ronds": return Array.from({ length: 9 }, (_, i) => `<circle cx="${m + 6 + i * 15.5}" cy="${H / 2}" r="6.5"/>`).join("");
    case "croix": return Array.from({ length: 10 }, (_, i) => { const x = m + 5 + i * 14; return chemin(`M ${x - 5} 12 L ${x + 5} 22 M ${x + 5} 12 L ${x - 5} 22`); }).join("");
    case "ponts": return chemin(Array.from({ length: 9 }, (_, i) => `${i ? "" : `M ${m} ${H - 7} `}A 7.5 9 0 0 1 ${m + 15 * (i + 1)} ${H - 7}`).join(" "));
    case "coupes": return chemin(Array.from({ length: 9 }, (_, i) => `${i ? "" : `M ${m} 7 `}A 7.5 9 0 0 0 ${m + 15 * (i + 1)} 7`).join(" "));
    case "vagues": return chemin(pts((t) => [m + t, H / 2 - 8 * Math.sin((t / 22) * 2 * Math.PI)], 0, L - 2 * m, 1));
    case "zigzags": return chemin(`M ${m} ${H - 7} ` + Array.from({ length: 12 }, (_, i) => `L ${m + 5.6 + i * 11.2} 7 L ${m + 11.2 * (i + 1)} ${H - 7}`).join(" "));
    case "creneaux": return chemin(`M ${m} ${H - 7} ` + Array.from({ length: 7 }, (_, i) => { const x = m + i * 19; return `L ${x} 7 L ${x + 9.5} 7 L ${x + 9.5} ${H - 7} L ${x + 19} ${H - 7}`; }).join(" "));
    // Une cycloïde allongée : le trait avance, revient sur lui-même en haut, et fait sa boucle.
    case "boucles": return chemin(pts((t) => [m - 2 + 3.4 * (t - Math.PI) - 7 * Math.sin(t), H / 2 - 10 * Math.cos(t)], Math.PI, 13 * Math.PI, 0.08));
    case "spirales": return [0, 1, 2, 3].map((k) => chemin(pts((t) => [m + 15 + k * 36 + 1.25 * t * Math.cos(t), H / 2 + 1.25 * t * Math.sin(t)], 0, Math.PI * 4.2, 0.12))).join("");
    case "quadrillage": return [...Array.from({ length: 4 }, (_, i) => chemin(`M ${m} ${5 + i * 8} L ${m + 136} ${5 + i * 8}`)),
      ...Array.from({ length: 18 }, (_, i) => chemin(`M ${m + i * 8} 5 L ${m + i * 8} 29`))].join("");
  }
}

/** Le signe en bande ; trois bandes l'une sous l'autre dans une grande carte, qui est haute. */
const dessinDuSigne = (s: Signe, bandes = 1) =>
  `<svg class="rg-trace" viewBox="0 0 150 ${34 * bandes + 6 * (bandes - 1)}" preserveAspectRatio="xMidYMid meet" fill="none" stroke-linecap="round" stroke-linejoin="round">`
  + Array.from({ length: bandes }, (_, k) => `<g transform="translate(0 ${k * 40})">${traceDuSigne(s)}</g>`).join("") + `</svg>`;

export function htmlRepertoire(brut: Partial<ReglagesRepertoire>): string {
  const r = reglagesRepertoireSurs(brut);
  const cartes = r.signes.map((id) => {
    const nom = SIGNES.find((s) => s.id === id)?.nom ?? id;
    const photo = r.photo ? `<div class="rg-photo"></div>` : "";
    const ecrit = `<div class="rg-nom">${escapeHtml(r.capitales ? nom.toLocaleUpperCase("fr-FR") : nom)}</div>`;
    // Au mur, la photo à gauche du tracé ; dans une grande carte, à côté du nom, sous les bandes.
    return r.format === "etiquettes"
      ? `<div class="rg-carte">${dessinDuSigne(id, 3)}<div class="rg-pied">${photo}${ecrit}</div></div>`
      : `<div class="rg-carte">${photo}${dessinDuSigne(id)}<div class="rg-pied">${ecrit}</div></div>`;
  });
  const parPage = r.format === "etiquettes" ? 4 : 6;
  const pages: string[] = [];
  for (let i = 0; i < cartes.length; i += parPage) {
    pages.push(`<div class="page rg-page rg-${r.format}">${i === 0 && r.format === "mur" ? `<div class="rg-titre">${r.capitales ? "NOTRE RÉPERTOIRE GRAPHIQUE" : "Notre répertoire graphique"}</div>` : ""}`
      + `<div class="rg-grille">${cartes.slice(i, i + parPage).join("")}</div></div>`);
  }
  return feuille(pages.join(""), "rg");
}

export const titreRepertoire = () => "Le répertoire graphique";

const NOIR = "#1c2233";
const POLICE_SCRIPT = `"Andika", "Andika New Basic", "Century Gothic", "Avenir Next", "Helvetica Neue", Arial, sans-serif`;

export const STYLE_REPERTOIRE = `
  @media print { body { padding: 0; } }
  .feuille.rg { color: ${NOIR}; font-family: ${POLICE_SCRIPT}; }
  .feuille.rg .rg-page { width: 182mm; height: 250mm; margin: 0 auto; box-sizing: border-box; display: flex; flex-direction: column; }
  .feuille.rg .rg-titre { font-size: 8mm; font-weight: 800; text-align: center; margin: 0 0 4mm; }
  .feuille.rg .rg-grille { flex: 1; display: grid; gap: 4mm; min-height: 0; }
  .feuille.rg .rg-mur .rg-grille { grid-template-columns: 1fr; grid-template-rows: repeat(6, minmax(0, 1fr)); }
  .feuille.rg .rg-etiquettes .rg-grille { grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: repeat(2, minmax(0, 1fr)); }
  /* Au mur, le tracé prend toute la hauteur de la carte, le nom à sa droite ; une grande carte les met l'un sous l'autre. */
  .feuille.rg .rg-carte { border: 0.6mm solid #cfd4e2; border-radius: 3mm; padding: 3mm 4mm; box-sizing: border-box; display: flex; align-items: center;
    gap: 5mm; min-height: 0; overflow: hidden; }
  .feuille.rg .rg-etiquettes .rg-carte { flex-direction: column; align-items: stretch; gap: 4mm; }
  .feuille.rg .rg-etiquettes .rg-carte { border-style: dashed; }
  .feuille.rg .rg-trace { flex: 1; min-width: 0; min-height: 0; height: 100%; stroke: ${NOIR}; stroke-width: 1.8; }
  .feuille.rg .rg-etiquettes .rg-trace { width: 100%; height: auto; }
  .feuille.rg .rg-trace .rg-plein { fill: ${NOIR}; stroke: none; }
  .feuille.rg .rg-pied { flex: none; width: 52mm; display: flex; flex-direction: column; align-items: center; gap: 3mm; }
  .feuille.rg .rg-etiquettes .rg-pied { width: auto; flex-direction: row; justify-content: center; }
  .feuille.rg .rg-photo { flex: none; width: 30mm; height: 22mm; border: 0.5mm dashed #9aa0b4; border-radius: 2mm; }
  .feuille.rg .rg-nom { flex: 1; text-align: center; font-size: 6.5mm; font-weight: 800; }
  .feuille.rg .rg-etiquettes .rg-nom { font-size: 7.5mm; }
`;
