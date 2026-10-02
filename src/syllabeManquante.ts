// ── La syllabe qui manque ──────────────────────────────────────────────────
//
// Sous chaque dessin, le mot avec un trou : « four…… ». L'élève dit le mot,
// entend la syllabe, l'écrit. Les syllabes à retrouver sont celles qu'on
// travaille — ma, mi, mu. Le trou tombe là où on entend l'une d'elles :
// « main » s'écrit avec « ma » et ne se dit pas ainsi, il n'a pas de trou.
//
// Puis quelques mots à écrire en entier, sous leur dessin, derrière « Un » ou
// « Une ». C'est la fiche des fichiers de lecture, avec en tête le geste
// Borel-Maisonny du son étudié quand l'enseignant en a l'image.

import { attributionPour, feuille, imgPicto } from "./cartesImprimables";
import { articleEcrit, type Article } from "./articles";
import {
  BANDEAU_MM, CONSIGNE_MM, HAUTEUR_DES_FEUILLES_MM, LIGNE_DU_PRENOM, TITRE_MM, bandeauDuGeste, coderMot, gesteDe, repartir,
  type ImagesGestes, type Pas,
} from "./gestesBM";
import { hasard, melanger } from "./hasard";
import { escapeHtml } from "./print";

const LETTRE = /[a-zàâäçéèêëîïôöùûüœ]/;

/** Le mot tel qu'on l'écrit sur la feuille : en minuscules, sans espaces autour. */
export const ecritureDuMot = (mot: string) => (mot ?? "").normalize("NFC").toLowerCase().trim();

/** Au-delà, la consigne ne tient plus sur sa ligne. */
export const SYLLABES_MAX = 8;

/**
 * Les syllabes à retrouver, telles que l'enseignant les écrit : « ma, mi,
 * mu », « ma mi mu », « ma, mi ou mu ». Un « ou » entre deux syllabes est le
 * mot de liaison ; seul, c'est le son.
 */
export function syllabesCibles(saisie: string): string[] {
  const sortie: string[] = [];
  for (const morceau of (saisie ?? "").normalize("NFC").toLowerCase().split(/[,;\n/]+/)) {
    for (const partie of morceau.split(/\s+ou\s+/)) {
      for (const s of partie.split(/\s+/)) {
        const propre = [...s].filter((c) => LETTRE.test(c)).join("");
        if (propre && !sortie.includes(propre)) sortie.push(propre);
      }
    }
  }
  return sortie.slice(0, SYLLABES_MAX);
}

/** Un son du mot, à sa place : de quelle lettre à quelle lettre, et le geste qui le dit — aucun s'il est muet. */
interface SonSitue {
  debut: number;
  fin: number;
  geste: string | null;
}

/** Les sons d'un mot, chacun à sa place dans ses lettres. */
function sonsSitues(texte: string): SonSitue[] {
  const sons: SonSitue[] = [];
  let i = 0;
  for (const p of coderMot(texte)) {
    // Un espace, un trait d'union : on les saute, ils n'appartiennent à aucun son.
    let j = i;
    while (j < texte.length && !LETTRE.test(texte[j])) j += 1;
    // Un son sans lettres à lui — le « y » de « voyage », déjà compté dans « oy » — n'a pas de place.
    if (!texte.startsWith(p.graphie, j)) continue;
    sons.push({ debut: j, fin: j + p.graphie.length, geste: p.geste });
    i = j + p.graphie.length;
  }
  return sons;
}

/** Les voyelles qui se fondent dans la voyelle suivante : le i de « camion », le u de « nuage », le ou de « mouette ». */
const SE_FONDENT = new Set(["i", "u", "ou"]);
const estUneVoyelle = (geste: string | null) => { const g = gesteDe(geste); return !!g && g.sorte !== "consonne" && g.id !== "ill"; };

/** Un trou dans un mot : les lettres qu'on retire, de `debut` à `fin`, et la syllabe qu'elles écrivent. */
export interface Trou {
  debut: number;
  fin: number;
  syllabe: string;
}

/**
 * Les endroits d'un mot où l'on peut retirer l'une des syllabes : dans
 * l'ordre du mot. La syllabe doit s'y entendre — ses lettres font des sons
 * entiers : « ma » dans « lama » et « marteau », pas dans « main » (m-ain),
 * « maison » (m-ai) ni « manteau » (m-an) ; et sa voyelle ne se fond pas dans
 * la suivante : pas de « mi » dans « camion ».
 */
export function trousPossibles(mot: string, cibles: string[]): Trou[] {
  const texte = ecritureDuMot(mot);
  const sons = sonsSitues(texte);
  const trous: Trou[] = [];
  for (const syllabe of cibles) {
    if (!syllabe) continue;
    for (let debut = texte.indexOf(syllabe); debut >= 0; debut = texte.indexOf(syllabe, debut + 1)) {
      const fin = debut + syllabe.length;
      const dernier = sons.find((s) => s.fin === fin);
      // Des sons entiers, du premier au dernier.
      if (!dernier || !sons.some((s) => s.debut === debut)) continue;
      // « mi » ne s'entend pas dans « camion », ni « nu » dans « nuage » : la voyelle s'y fond dans la suivante.
      const suivant = sons.find((s) => s.debut === fin);
      if (dernier.geste && SE_FONDENT.has(dernier.geste) && suivant && estUneVoyelle(suivant.geste)) continue;
      if (!trous.some((t) => t.debut === debut && t.fin === fin)) trous.push({ debut, fin, syllabe });
    }
  }
  // À la même place, la plus longue d'abord : « mou » avant « mo ».
  return trous.sort((a, b) => a.debut - b.debut || b.fin - a.fin);
}

/** Un mot prêt à poser sur la feuille : son dessin, et le trou qu'on y fait. */
export interface MotATrou {
  mot: string;
  /** Le mot tel qu'il s'écrit sur la feuille. */
  texte: string;
  trou: Trou;
  /** Le dessin du mot : sans lui, rien ne dit quel mot compléter. */
  image: string;
  /** D'où vient le dessin : un pictogramme de la banque doit sa mention. */
  id: number | null;
}

/** Le trou d'un mot : celui que l'enseignant a choisi, sinon le premier. Rien si aucune syllabe ne s'y entend. */
export function trouDuMot(mot: string, cibles: string[], choix = 0): Trou | null {
  const trous = trousPossibles(mot, cibles);
  return trous[choix] ?? trous[0] ?? null;
}

/** La consigne, avec les syllabes telles qu'on les dit : « ma, mi ou mu ». */
export function consigneDesSyllabes(cibles: string[]): string {
  if (!cibles.length) return "Écris la syllabe qui manque.";
  const dites = cibles.length > 1 ? `${cibles.slice(0, -1).join(", ")} ou ${cibles[cibles.length - 1]}` : cibles[0];
  return `Écris la syllabe qui manque : ${dites}.`;
}

const CONSIGNE_ECRIRE = "Écris les mots qui correspondent aux dessins.";
const TITRE = "La syllabe qui manque";

/** Combien de mots, au plus, s'écrivent en entier : deux rangées de trois. */
export const MOTS_A_ECRIRE_MAX = 6;
const ECRITS_PAR_RANG = 3;

/**
 * Les mots qu'on fait écrire en entier : les plus courts — ce sont ceux
 * dont l'élève connaît toutes les lettres —, dans l'ordre de la liste.
 */
export function motsAEcrire<T extends { texte: string }>(mots: T[], combien: number): T[] {
  const n = Math.max(0, Math.min(MOTS_A_ECRIRE_MAX, Math.round(combien) || 0));
  const uniques = mots.filter((m, k) => mots.findIndex((x) => x.texte === m.texte) === k);
  const retenus = new Set(uniques.map((m, k) => ({ m, k })).sort((a, b) => a.m.texte.length - b.m.texte.length || a.k - b.k).slice(0, n).map((x) => x.m));
  return uniques.filter((m) => retenus.has(m));
}

// ── L'en-tête : le son étudié ──────────────────────────────────────────────

/** Le son que les syllabes ont en commun, et les lettres qui l'y écrivent : « m » pour ma, mi, mu. */
export interface SonEtudie {
  son: string;
  graphies: string[];
}

/**
 * Le son étudié, deviné des syllabes : celui qu'elles partagent toutes, au
 * début (ma, mi, mu) ou à la fin (la, ma, ra). Rien quand elles n'en
 * partagent pas, ou qu'une syllabe seule ne permet pas de trancher.
 */
export function sonDesSyllabes(cibles: string[]): SonEtudie | null {
  const codes = cibles.map((c) => coderMot(c).filter((p) => p.geste));
  if (!codes.length || codes.some((c) => !c.length)) return null;
  if (codes.length === 1 && codes[0].length > 1) return null;
  for (const prendre of [(c: Pas[]) => c[0], (c: Pas[]) => c[c.length - 1]]) {
    const pas = codes.map(prendre);
    if (pas.every((p) => p.geste === pas[0].geste)) return { son: pas[0].geste as string, graphies: [...new Set(pas.map((p) => p.graphie))] };
  }
  return null;
}

export type LettresEnTete = "minuscule" | "majuscule" | "cursive";

export const LETTRES_EN_TETE: { id: LettresEnTete; libelle: string }[] = [
  { id: "minuscule", libelle: "La minuscule : m" },
  { id: "majuscule", libelle: "Minuscule et majuscule : m M" },
  { id: "cursive", libelle: "En script et en cursive : m M m M" },
];

/**
 * Ce qu'on écrit à côté du geste : la lettre, sa majuscule, et les deux en
 * cursive — comme sur les fiches de la méthode. Un son à plusieurs lettres
 * (ou, ch) n'a pas de majuscule à montrer.
 */
export function ecrituresEnTete(graphies: string[], lettres: LettresEnTete): string {
  const formes = (g: string) => (lettres !== "minuscule" && [...g].length === 1 ? [g, g.toUpperCase()] : [g]);
  const script = graphies.flatMap(formes).map((x) => `<b>${escapeHtml(x)}</b>`);
  const cursive = lettres === "cursive" ? graphies.flatMap(formes).map((x) => `<b class="gb-cursive">${escapeHtml(x)}</b>`) : [];
  return [...script, ...cursive].join("");
}

export interface ReglagesSyllabes {
  /** Les syllabes à retrouver, comme on les écrit : « ma, mi, mu ». */
  syllabes: string;
  /** Combien de dessins par rangée : trois ou quatre. */
  colonnes: number;
  /** Combien de mots à écrire en entier sous leur dessin ; zéro : pas de second exercice. */
  aEcrire: number;
  /** L'en-tête : « auto » (le son commun aux syllabes, si son geste a une image), vide (aucun), ou un son. */
  son: string;
  lettres: LettresEnTete;
}

export const REGLAGES_SYLLABES: ReglagesSyllabes = { syllabes: "ma, mi, mu", colonnes: 4, aEcrire: 3, son: "auto", lettres: "majuscule" };

/** Le son que la feuille porte en tête, d'après les réglages : rien, celui qu'on a choisi, ou celui des syllabes. */
export function enTeteDesSyllabes(r: ReglagesSyllabes, cibles: string[], gestes: ImagesGestes): SonEtudie | null {
  if (!r.son) return null;
  const commun = sonDesSyllabes(cibles);
  // De lui-même, l'en-tête ne vient que si l'enseignant a l'image du geste : sinon la feuille garde son titre.
  if (r.son === "auto") return commun && gestes[commun.son] ? commun : null;
  const g = gesteDe(r.son);
  if (!g) return null;
  if (commun?.son === g.id) return commun;
  // Les lettres qui écrivent ce son dans les syllabes ; à défaut, son écriture la plus courante.
  const vues = [...new Set(cibles.flatMap((c) => coderMot(c).filter((p) => p.geste === g.id).map((p) => p.graphie)))];
  return { son: g.id, graphies: vues.length ? vues : [g.graphies[0]] };
}

// ── La feuille ─────────────────────────────────────────────────────────────

/** La largeur que la feuille offre vraiment à ses grilles. */
const LARGEUR_MM = 165;
/** Sous le dessin d'un mot à trou : le mot, les marges de la case, son trait. */
const RANG_MM = 17;
/** Sous le dessin d'un mot à écrire : l'article, deux lignes, les marges. */
const RANG_ECRIT_MM = 36;
const DESSIN_MIN_MM = 20;
const DESSIN_MAX_MM = 30;

/** Le côté des dessins d'une page qui porte `rangs` rangées de mots à trou et `ecrits` rangées de mots à écrire. */
export function coteDesDessins(rangs: number, ecrits: number, bandeau: boolean): number {
  const consignes = (rangs ? 1 : 0) + (ecrits ? 1 : 0);
  const place = HAUTEUR_DES_FEUILLES_MM - (bandeau ? BANDEAU_MM : TITRE_MM) - consignes * CONSIGNE_MM;
  return Math.floor((place - RANG_MM * rangs - RANG_ECRIT_MM * ecrits) / Math.max(1, rangs + ecrits));
}

/** Ce qu'une page porte : des mots à trou, des mots à écrire, et le côté de ses dessins. */
export interface PageDeSyllabes {
  trous: MotATrou[];
  ecrire: MotATrou[];
  dessin: number;
}

/**
 * Les pages de la feuille. Les mots à trou se rangent par rangées, autant
 * par page que les dessins le permettent sans devenir illisibles ; les mots
 * à écrire suivent sur la dernière page s'ils y tiennent, sinon sur la leur.
 */
export function pagesDeSyllabes(mots: MotATrou[], ecrits: MotATrou[], colonnes: number, bandeau: boolean): PageDeSyllabes[] {
  const rangs: MotATrou[][] = [];
  for (let i = 0; i < mots.length; i += colonnes) rangs.push(mots.slice(i, i + colonnes));
  let parPage = 1;
  while (coteDesDessins(parPage + 1, 0, bandeau) >= DESSIN_MIN_MM) parPage += 1;
  const pages = repartir(rangs, parPage).map((r) => ({ trous: r.flat(), ecrire: [] as MotATrou[], rangs: r.length }));
  const rangsEcrits = Math.ceil(ecrits.length / ECRITS_PAR_RANG);
  if (rangsEcrits) {
    const derniere = pages[pages.length - 1];
    if (derniere && coteDesDessins(derniere.rangs, rangsEcrits, bandeau) >= DESSIN_MIN_MM) derniere.ecrire = ecrits;
    else pages.push({ trous: [], ecrire: ecrits, rangs: 0 });
  }
  return pages.map((p) => ({
    trous: p.trous, ecrire: p.ecrire,
    dessin: Math.max(DESSIN_MIN_MM, Math.min(DESSIN_MAX_MM, coteDesDessins(p.rangs, Math.ceil(p.ecrire.length / ECRITS_PAR_RANG), bandeau))),
  }));
}

const colonnesDe = (r: ReglagesSyllabes) => (Math.round(r.colonnes) === 3 ? 3 : 4);

/** Une grille aux rangées complètes : les cases qui manquent restent vides, le tableau garde son cadre. */
function grille(cases: string[], colonnes: number, dessin: number): string {
  const vides = (colonnes - (cases.length % colonnes)) % colonnes;
  return `<div class="sm-grille" style="grid-template-columns: repeat(${colonnes}, 1fr); --sm-dessin: ${dessin}mm">`
    + cases.join("") + `<div class="sm-case"></div>`.repeat(vides) + `</div>`;
}

/** Le mot, son trou à la place de la syllabe : un trait pointillé assez long pour l'écrire à la main. */
function caseATrou(m: MotATrou, colonnes: number): string {
  const lettres = m.trou.fin - m.trou.debut;
  const trou = Math.max(12, Math.min(27, lettres * (colonnes === 3 ? 9 : 7)));
  const visibles = Math.max(1, m.texte.length - lettres);
  // Une lettre d'imprimerie prend à peu près la moitié de son corps en largeur : le mot long rapetisse pour tenir dans sa case.
  const corps = Math.max(13, Math.min(22, Math.floor((LARGEUR_MM / colonnes - 5 - trou) / (visibles * 0.56 * 0.2646))));
  return `<div class="sm-case"><span class="sm-dessin">${imgPicto(m.image, m.mot)}</span>`
    + `<div class="sm-mot" style="font-size: ${corps}px">${escapeHtml(m.texte.slice(0, m.trou.debut))}<span class="sm-trou" style="width: ${trou}mm"></span>`
    + `${escapeHtml(m.texte.slice(m.trou.fin))}</div></div>`;
}

const caseAEcrire = (m: MotATrou, article: Article) => `<div class="sm-case"><span class="sm-dessin">${imgPicto(m.image, m.mot)}</span>`
  + (article ? `<div class="sm-article">${articleEcrit(article)}</div>` : "") + `<div class="sm-ligne"></div><div class="sm-ligne"></div></div>`;

/**
 * La feuille : sous l'en-tête du son, les dessins et leurs mots à trou, puis
 * les mots à écrire en entier — `ecrits`, pris parmi eux —, et le corrigé.
 * `articles` donne « un » ou « une » à chaque mot à écrire, par son écriture.
 */
export function htmlSyllabes(
  mots: MotATrou[], ecrits: MotATrou[], cibles: string[], r: ReglagesSyllabes, articles: Record<string, Article>, entete: SonEtudie | null,
  gestes: ImagesGestes, graine: number,
): string {
  if (!cibles.length) return feuille(`<div class="page"><div class="sous">Écrivez les syllabes à retrouver : ma, mi, mu.</div></div>`, "gb sm");
  if (!mots.length) {
    return feuille(`<div class="page"><div class="sous">Ajoutez des mots qui ont un dessin et où l'on entend ${escapeHtml(cibles.join(", "))} : chacun s'écrira avec un trou à la place de sa syllabe.</div></div>`, "gb sm");
  }
  const colonnes = colonnesDe(r);
  // Mêlés : les mots en « ma » ne se suivent pas tous, la réponse ne se devine pas à la place.
  const meles = melanger(hasard(graine), mots);
  const bandeau = entete ? bandeauDuGeste(entete.son, gestes, ecrituresEnTete(entete.graphies, r.lettres)) : "";
  const consigne = escapeHtml(consigneDesSyllabes(cibles));
  const pages = pagesDeSyllabes(meles, ecrits, colonnes, !!bandeau).map((p) =>
    // Avec l'en-tête du son, pas de titre : c'est lui qui dit de quoi parle la feuille.
    `<div class="page">${bandeau ? LIGNE_DU_PRENOM + bandeau : `<div class="titre">${TITRE}</div>${LIGNE_DU_PRENOM}`}`
    + (p.trous.length ? `<p class="consigne">${consigne}</p>${grille(p.trous.map((m) => caseATrou(m, colonnes)), colonnes, p.dessin)}` : "")
    + (p.ecrire.length ? `<p class="consigne">${CONSIGNE_ECRIRE}</p>${grille(p.ecrire.map((m) => caseAEcrire(m, articles[m.texte] ?? "")), ECRITS_PAR_RANG, p.dessin)}` : "")
    + `</div>`);
  const complets = meles.map((m) => `<span>${escapeHtml(m.texte.slice(0, m.trou.debut))}<b>${escapeHtml(m.texte.slice(m.trou.debut, m.trou.fin))}</b>${escapeHtml(m.texte.slice(m.trou.fin))}</span>`);
  const corrige = `<div class="page corrige"><div class="titre">${TITRE} — corrigé</div><div class="sm-corrige">${complets.join("")}</div>`
    + (ecrits.length ? `<div class="sm-corrige sm-corrige-mots">${ecrits.map((m) => `<span>${escapeHtml(`${articles[m.texte] ?? ""} ${m.texte}`.trim())}</span>`).join("")}</div>` : "")
    + `</div>`;
  return feuille(`${pages.join("")}${corrige}${attributionPour(mots.map((m) => m.id))}`, "gb sm");
}

/** Combien de feuilles feront les mots, corrigé compris. */
export function feuillesDeSyllabes(mots: MotATrou[], ecrits: MotATrou[], r: ReglagesSyllabes, bandeau: boolean): number {
  if (!mots.length) return 0;
  return pagesDeSyllabes(mots, ecrits, colonnesDe(r), bandeau).length + 1;
}

export const STYLE_SYLLABES = `
  .feuille.sm .sm-grille { display: grid; border-top: 1px solid #1c2233; border-left: 1px solid #1c2233; margin: 0 0 4mm; }
  .feuille.sm .sm-case { border-right: 1px solid #1c2233; border-bottom: 1px solid #1c2233; padding: 2mm 1.5mm 2.5mm; display: flex; flex-direction: column;
    align-items: center; gap: 1.5mm; min-width: 0; break-inside: avoid; page-break-inside: avoid; }
  .feuille.sm .sm-dessin { flex: none; width: var(--sm-dessin, 26mm); height: var(--sm-dessin, 26mm); display: flex; align-items: center; justify-content: center; }
  .feuille.sm .sm-dessin img { width: 100%; height: 100%; object-fit: contain; margin: 0; max-height: none; }
  .feuille.sm .sm-dessin .vide { width: 100%; height: 100%; border: 1.5px dashed #c4c9d6; border-radius: 3mm; }
  .feuille.sm .sm-mot { font-size: 22px; line-height: 10mm; height: 10mm; white-space: nowrap; letter-spacing: 0.2px; }
  .feuille.sm .sm-trou { display: inline-block; height: 7mm; border-bottom: 2px dotted #1c2233; margin: 0 0.6mm; vertical-align: baseline; }
  .feuille.sm .sm-article { font-size: 20px; line-height: 8mm; height: 8mm; }
  .feuille.sm .sm-ligne { align-self: stretch; height: 8mm; border-bottom: 2px dotted #1c2233; margin: 0 3mm 1mm; }
  .feuille.sm .sm-corrige { display: flex; flex-wrap: wrap; gap: 3mm 9mm; font-size: 17px; }
  .feuille.sm .sm-corrige b { text-decoration: underline; }
  .feuille.sm .sm-corrige-mots { margin-top: 6mm; padding-top: 4mm; border-top: 1px solid #cfd4e2; }
`;
