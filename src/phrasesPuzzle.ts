// ── Les phrases en puzzle ──────────────────────────────────────────────────
//
// Demande de l'enseignant (31 octobre 2026), photo de sa classe à l'appui :
// des pièces de puzzle — sujet, verbe, complément —, chacune avec son image
// et son groupe de mots, rangées dans un sachet par sorte. Elles ne
// s'emboîtent que dans l'ordre de la phrase : le sujet a un tenon à droite,
// le verbe une encoche à gauche et un tenon à droite, le complément une
// encoche à gauche. En changeant une pièce, on fait une autre phrase : « Le
// fermier / nourrit / une vache », « Le chien / regarde / une vache »…
//
// Les pièces prennent les couleurs et les marques du code de la phrase de la
// classe (voir codeDeLaPhrase.ts) ; sujet, verbe et complément sont les mots
// du programme de français du cycle 2 (2024) — le sujet et le verbe au CP, les
// compléments au CE1.

import { attributionPour, imgPicto } from "./cartesImprimables";
import { hexDe, marquer, type CodeDeLaPhrase } from "./codeDeLaPhrase";
import type { Images, MotImage } from "./jeuxSons";
import { escapeHtml } from "./print";

export type SortePiece = "sujet" | "verbe" | "complement";

export const SORTES: { id: SortePiece; nom: string; pluriel: string; sachet: string }[] = [
  { id: "sujet", nom: "le sujet", pluriel: "Les sujets", sachet: "SUJET" },
  { id: "verbe", nom: "le verbe", pluriel: "Les verbes", sachet: "VERBE" },
  { id: "complement", nom: "le complément", pluriel: "Les compléments", sachet: "COMPLÉMENT" },
];

export type PiecesDuPuzzle = Record<SortePiece, MotImage[]>;

export interface ReglagesPuzzle {
  taille: "grandes" | "petites";
  /** Les mots en capitales, comme en maternelle, ou en script. */
  ecriture: "capitales" | "script";
  /** Les couleurs et les marques du code de la phrase de la classe. */
  code: boolean;
  images: boolean;
  /** Les étiquettes des sachets : SUJET, VERBE, COMPLÉMENT. */
  sachets: boolean;
}

export const REGLAGES_PUZZLE: ReglagesPuzzle = { taille: "grandes", ecriture: "capitales", code: true, images: true, sachets: true };

/** Les réglages relus, réparés. */
export const reglagesPuzzle = (brut: Partial<ReglagesPuzzle>): ReglagesPuzzle => ({
  taille: brut.taille === "petites" ? "petites" : "grandes",
  ecriture: brut.ecriture === "script" ? "script" : "capitales",
  code: brut.code !== false,
  images: brut.images !== false,
  sachets: brut.sachets !== false,
});

/** Combien de phrases différentes : une pièce de chaque sorte. */
export const combienDePhrases = (p: PiecesDuPuzzle) => p.sujet.length * p.verbe.length * p.complement.length;

const avecMajuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Quelques phrases qu'on peut faire, chaque pièce prise à son tour : les exemples de la règle. */
export function quelquesPhrases(p: PiecesDuPuzzle, combien = 3): string[] {
  const n = Math.min(combien, combienDePhrases(p));
  return Array.from({ length: n }, (_, i) =>
    `${avecMajuscule(p.sujet[i % p.sujet.length].mot)} ${p.verbe[(i + 1) % p.verbe.length].mot} ${p.complement[(i + 2) % p.complement.length].mot}.`);
}

// ── Des pièces toutes prêtes ───────────────────────────────────────────────

/** Un thème : des sujets au singulier et des verbes au présent, pour que chaque phrase se tienne, qu'elle soit sage ou drôle. */
export interface ThemeDePuzzle { id: string; nom: string; icone: string; pieces: Record<SortePiece, string[]> }

export const THEMES_DE_PUZZLE: ThemeDePuzzle[] = [
  { id: "ferme", nom: "La ferme", icone: "🐮", pieces: {
    sujet: ["le fermier", "la fermière", "le chien", "le chat"],
    verbe: ["nourrit", "regarde", "caresse", "lave"],
    complement: ["une vache", "le cochon", "les poules", "le cheval", "un mouton"],
  } },
  { id: "ecole", nom: "L'école", icone: "🏫", pieces: {
    sujet: ["la maîtresse", "le maître", "le garçon", "la fille"],
    verbe: ["lit", "dessine", "regarde", "range"],
    complement: ["un livre", "une maison", "le tableau", "la trousse", "les crayons"],
  } },
  { id: "maison", nom: "La maison", icone: "🏠", pieces: {
    sujet: ["maman", "papa", "le bébé", "la petite fille"],
    verbe: ["mange", "prend", "lave", "cherche"],
    complement: ["une pomme", "le gâteau", "la tasse", "le doudou", "les chaussures"],
  } },
  { id: "animaux", nom: "Les animaux", icone: "🦁", pieces: {
    sujet: ["le lion", "le singe", "l'éléphant", "la girafe"],
    verbe: ["mange", "regarde", "attrape", "porte"],
    complement: ["une banane", "une feuille", "le ballon", "un oiseau"],
  } },
];

// ── Le mot qui donne l'image ───────────────────────────────────────────────

const DETERMINANTS = new Set(["le", "la", "les", "l", "un", "une", "des", "du", "de", "d", "au", "aux", "mon", "ma", "mes", "ton", "ta", "tes",
  "son", "sa", "ses", "notre", "nos", "votre", "vos", "leur", "leurs", "ce", "cet", "cette", "ces"]);
const ADJECTIFS_AVANT = new Set(["petit", "petite", "petits", "petites", "grand", "grande", "grands", "grandes", "gros", "grosse", "beau", "belle",
  "joli", "jolie", "vieux", "vieille", "jeune", "bon", "bonne", "nouveau", "nouvelle"]);
/** Les verbes courants dont l'infinitif ne se devine pas de la forme : la banque range ses images à l'infinitif. */
const INFINITIFS: Record<string, string> = {
  lit: "lire", écrit: "écrire", dit: "dire", fait: "faire", boit: "boire", prend: "prendre", met: "mettre", voit: "voir", va: "aller",
  a: "avoir", est: "être", court: "courir", dort: "dormir", sort: "sortir", part: "partir", attend: "attendre", entend: "entendre",
  vend: "vendre", tient: "tenir", vient: "venir", ouvre: "ouvrir", cueille: "cueillir", appelle: "appeler", jette: "jeter",
  achète: "acheter", coud: "coudre", peint: "peindre", rit: "rire", suit: "suivre", conduit: "conduire", construit: "construire",
};

/**
 * Le mot qu'on cherche dans la banque d'images pour une pièce : le nom du
 * groupe — sans déterminant, ni adjectif devant, ni marque du pluriel —, ou
 * l'infinitif du verbe. L'enseignant change l'image d'un clic si elle ne va pas.
 */
export function motDeLImage(texte: string, sorte: SortePiece): string {
  const mots = texte.toLowerCase().replace(/['’]/g, " ").split(/\s+/).filter(Boolean);
  if (sorte === "verbe") {
    const v = mots[0] ?? "";
    if (INFINITIFS[v]) return INFINITIFS[v];
    if (/(it)$/.test(v)) return v.replace(/it$/, "ir");
    if (/e$/.test(v)) return `${v}r`;
    return v;
  }
  const nom = mots.find((m) => !DETERMINANTS.has(m) && !ADJECTIFS_AVANT.has(m)) ?? mots[mots.length - 1] ?? "";
  // Les poules, les crayons : la banque a le nom au singulier.
  return mots.some((m) => m === "les" || m === "des" || m === "mes" || m === "ses") && /[sx]$/.test(nom) ? nom.slice(0, -1) : nom;
}

// ── La forme des pièces ────────────────────────────────────────────────────

/** Les mesures d'une pièce, en mm : le corps, et ce que le tenon dépasse. */
export interface MesuresDePiece { largeur: number; hauteur: number; demiCol: number; col: number; tete: number; tenon: number }

export function mesures(taille: ReglagesPuzzle["taille"]): MesuresDePiece {
  const [largeur, hauteur, demiCol, col, tete] = taille === "petites" ? [44, 34, 3, 2, 4] : [62, 46, 4, 2.5, 5.5];
  // Le tenon : le col, puis la tête ronde, dont le centre s'écarte du col autant qu'il faut pour que l'arc rejoigne ses deux bords.
  const tenon = col + Math.sqrt(tete * tete - demiCol * demiCol) + tete;
  return { largeur, hauteur, demiCol, col, tete, tenon: Math.ceil(tenon * 10) / 10 };
}

const f = (n: number) => String(Math.round(n * 100) / 100);

/**
 * Le contour d'une pièce, en mm : un rectangle aux coins arrondis, une encoche
 * au milieu du bord gauche — sauf le sujet, qui ouvre la phrase —, un tenon au
 * milieu du bord droit — sauf le complément, qui la ferme. L'encoche a la forme
 * exacte du tenon : les pièces s'emboîtent.
 */
export function contourDePiece(sorte: SortePiece, m: MesuresDePiece): string {
  const { largeur: l, hauteur: h, demiCol: d, col: c, tete: r } = m;
  const cy = h / 2;
  const k = 2; // le rayon des coins
  const tenon = sorte !== "complement";
  const encoche = sorte !== "sujet";
  const p: string[] = [`M ${f(k)} 0`, `H ${f(l - k)}`, `Q ${f(l)} 0 ${f(l)} ${f(k)}`];
  if (tenon) p.push(`V ${f(cy - d)}`, `H ${f(l + c)}`, `A ${f(r)} ${f(r)} 0 1 1 ${f(l + c)} ${f(cy + d)}`, `H ${f(l)}`);
  p.push(`V ${f(h - k)}`, `Q ${f(l)} ${f(h)} ${f(l - k)} ${f(h)}`, `H ${f(k)}`, `Q 0 ${f(h)} 0 ${f(h - k)}`);
  if (encoche) p.push(`V ${f(cy + d)}`, `H ${f(c)}`, `A ${f(r)} ${f(r)} 0 1 0 ${f(c)} ${f(cy - d)}`, `H 0`);
  p.push(`V ${f(k)}`, `Q 0 0 ${f(k)} 0`, "Z");
  return p.join(" ");
}

// ── La feuille ─────────────────────────────────────────────────────────────

/** La teinte du code, très claire, pour le fond de la pièce. */
const teinte = (hex: string) => `${hex}24`;

function piece(m: MotImage, sorte: SortePiece, mes: MesuresDePiece, images: Images, r: ReglagesPuzzle, code: CodeDeLaPhrase): string {
  const largeurCase = mes.largeur + mes.tenon;
  const couleur = r.code ? hexDe(code, sorte) : "#1c2233";
  const fond = r.code ? teinte(couleur) : "#ffffff";
  // Le contenu évite l'encoche : il commence après elle.
  const gauche = sorte === "sujet" ? 3 : mes.tenon + 1.5;
  const texte = r.ecriture === "capitales" ? m.mot.toLocaleUpperCase("fr") : m.mot;
  const ecrit = r.code ? marquer(code, sorte, texte) : escapeHtml(texte);
  const src = m.id != null ? images[m.id] : undefined;
  return `<div class="pz-piece" style="width:${f(largeurCase)}mm;height:${f(mes.hauteur)}mm">`
    + `<svg class="pz-contour" viewBox="0 0 ${f(largeurCase)} ${f(mes.hauteur)}" width="${f(largeurCase)}mm" height="${f(mes.hauteur)}mm">`
    + `<path d="${contourDePiece(sorte, mes)}" fill="${fond}" stroke="#1c2233" stroke-width="0.45"/></svg>`
    + `<div class="pz-contenu" style="left:${f(gauche)}mm;width:${f(mes.largeur - gauche - 3)}mm">`
    + `${r.images ? `<div class="pz-image">${imgPicto(src, m.mot)}</div>` : ""}<div class="pz-texte${r.images ? "" : " seul"}">${ecrit}</div></div></div>`;
}

/**
 * Les pièces, un groupe de pages par sorte — un sachet chacun —, la règle
 * en tête avec quelques phrases qu'on peut faire, puis les étiquettes des
 * sachets.
 */
export function htmlPuzzle(p: PiecesDuPuzzle, images: Images, r: ReglagesPuzzle, code: CodeDeLaPhrase): string {
  const mes = mesures(r.taille);
  const largeurCase = mes.largeur + mes.tenon;
  const colonnes = r.taille === "petites" ? 3 : 2;
  const lignes = r.taille === "petites" ? 6 : 5;
  const n = combienDePhrases(p);
  const regle = `<div class="regle"><b>Les phrases en puzzle</b>On prend une pièce dans chaque sachet : un sujet, un verbe, un complément. `
    + `Les pièces ne s'emboîtent que dans l'ordre de la phrase. On lit sa phrase ; on change une pièce, et c'est une autre phrase.`
    + (n ? ` Avec ces pièces : ${p.sujet.length} × ${p.verbe.length} × ${p.complement.length} = ${n} phrases. Par exemple : ${quelquesPhrases(p).map(escapeHtml).join(" ")}` : "")
    + `</div>`;
  const pages: string[] = [];
  let premiere = true;
  for (const s of SORTES) {
    const liste = p[s.id];
    // La première page porte la règle : une rangée de moins.
    for (let i = 0; i < liste.length;) {
      const parPage = colonnes * (premiere ? lignes - 1 : lignes);
      const tranche = liste.slice(i, i + parPage);
      pages.push(`<div class="page">${premiere ? regle : ""}<div class="sous">${escapeHtml(s.pluriel)} — à découper (${liste.length})</div>`
        + `<div class="pz-grille" style="grid-template-columns: repeat(${colonnes}, ${f(largeurCase)}mm)">`
        + `${tranche.map((m) => piece(m, s.id, mes, images, r, code)).join("")}</div></div>`);
      premiere = false;
      i += parPage;
    }
  }
  const sachets = r.sachets
    ? `<div class="page"><div class="sous">Les étiquettes des sachets</div><div class="pz-sachets">${SORTES.map((s) => {
      const couleur = r.code ? hexDe(code, s.id) : "#1c2233";
      return `<div class="pz-sachet" style="border-color:${couleur};color:${couleur}">${escapeHtml(s.sachet)}</div>`;
    }).join("")}</div></div>`
    : "";
  const tout = [...p.sujet, ...p.verbe, ...p.complement];
  return `<div class="feuille pz">${pages.join("")}${sachets}${r.images ? attributionPour(tout.map((m) => m.id)) : ""}</div>`;
}

export const STYLE_PUZZLE = `
  .feuille.pz .pz-grille { display: grid; grid-auto-rows: auto; gap: 4mm 3mm; justify-content: center; margin-top: 3mm; }
  .feuille.pz .pz-piece { position: relative; break-inside: avoid; page-break-inside: avoid; }
  .feuille.pz .pz-contour { position: absolute; inset: 0; overflow: visible; }
  .feuille.pz .pz-contenu { position: absolute; top: 2mm; bottom: 2mm; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.5mm; text-align: center; }
  .feuille.pz .pz-image { flex: 1 1 auto; min-height: 0; display: flex; align-items: center; justify-content: center; }
  .feuille.pz .pz-image img, .feuille.pz .pz-image .vide { max-width: 100%; max-height: 100%; object-fit: contain; }
  .feuille.pz .pz-texte { font-weight: 700; font-size: 13px; line-height: 1.15; letter-spacing: .02em; }
  .feuille.pz .pz-texte.seul { font-size: 18px; }
  .feuille.pz .pz-sachets { display: grid; gap: 8mm; justify-items: center; margin-top: 8mm; }
  .feuille.pz .pz-sachet { width: 120mm; padding: 6mm 0; border: 1.2mm solid; border-radius: 4mm; text-align: center; font-size: 34px; font-weight: 800; letter-spacing: .06em; }
`;
