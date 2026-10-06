// Jeux cités : retrouver, dans un texte libre — le prévu du cahier journal, le
// déroulement d'une séance —, les jeux de la ludothèque dont on parle, pour en
// montrer la règle à l'écran et à l'impression.
//
// On écrit vite et comme on prononce : « hali gali » pour Halli Galli,
// « mémory » pour Memory, « les dominos », « halligalli ». La comparaison se
// fait donc sans accents ni majuscules, lettres doublées réduites, « y » lu
// comme « i », pluriel retiré, mots collés ou séparés ; un nom long supporte
// une faute de frappe. Une ligne qui cite autre chose — un PDF, un manuel, une
// compétence, un rituel — ne nomme pas de jeu.

import type { Jeu } from "./api";
import { escapeHtml } from "./print";
import { sansAutresCitations } from "./lignesCitees";

/** Un mot tel qu'on le compare. */
function forme(mot: string): string {
  let m = mot.replace(/y/g, "i").replace(/(.)\1+/g, "$1");
  if (m.length > 3 && /[sx]$/.test(m)) m = m.slice(0, -1);
  return m;
}

/** Les mots d'un texte, prêts à comparer. */
export function motsCompares(texte: string): string[] {
  return (texte ?? "")
    .toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/).filter(Boolean).map(forme);
}

const ARTICLES = new Set(["le", "la", "les", "l", "un", "une", "des", "du"]);

/**
 * Les façons de nommer un jeu : son titre, sans l'article (« Le Lynx »), sans
 * ce qui suit une parenthèse ou un tiret (« Memory (animaux) »).
 */
function nomsDu(jeu: Jeu): string[][] {
  const titre = jeu.titre ?? "";
  const principal = titre.split(/\s[-–—:]\s|[(:[]/)[0];
  const vus = new Set<string>();
  const noms: string[][] = [];
  for (const mots of [titre, principal].map(motsCompares)) {
    for (const nom of [mots, mots.length > 1 && ARTICLES.has(mots[0]) ? mots.slice(1) : mots]) {
      const cle = nom.join(" ");
      // Trop court, un nom citerait le jeu à tout propos.
      if (nom.join("").length < 3 || vus.has(cle)) continue;
      vus.add(cle);
      noms.push(nom);
    }
  }
  return noms;
}

/** Une lettre de trop, de moins ou de travers. */
function aUneFautePres(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

/** Longueur à partir de laquelle un nom supporte une faute de frappe. */
const LONGUEUR_TOLERANTE = 7;

interface Trouve { jeu: Jeu; debut: number; fin: number; longueur: number }

/** Un texte de séance sans ses marqueurs d'images et de citations. */
export const sansMarqueurs = (texte: string) => (texte ?? "").replace(/\[(img|cite):[^\]]+\]/g, " ");

/** Les jeux de la ludothèque cités dans un texte, dans l'ordre où on les lit, chacun une fois. */
export function jeuxCites(texte: string, jeux: Jeu[]): Jeu[] {
  const mots = motsCompares(sansAutresCitations(texte));
  if (!mots.length || !jeux.length) return [];
  const trouves: Trouve[] = [];
  for (const jeu of jeux) {
    for (const nom of nomsDu(jeu)) {
      const cible = nom.join("");
      const tolerant = cible.length >= LONGUEUR_TOLERANTE;
      for (let i = 0; i < mots.length; i++) {
        // Le nom écrit en autant de mots, ou en un de plus ou de moins.
        let lu = "";
        for (let k = 1; k <= nom.length + 1 && i + k <= mots.length; k++) {
          lu += mots[i + k - 1];
          if (lu.length > cible.length + 1) break;
          const exact = lu === cible;
          const presque = tolerant && k === nom.length && lu[0] === cible[0] && aUneFautePres(lu, cible);
          if (exact || presque) trouves.push({ jeu, debut: i, fin: i + k, longueur: cible.length });
        }
      }
    }
  }
  // Le nom le plus long l'emporte là où deux se chevauchent : « Uno Junior » plutôt que « Uno ».
  trouves.sort((a, b) => b.longueur - a.longueur || a.debut - b.debut);
  const retenus: Trouve[] = [];
  for (const t of trouves) {
    const couvert = retenus.some((r) => r.jeu.id !== t.jeu.id && t.debut < r.fin && r.debut < t.fin);
    if (!couvert) retenus.push(t);
  }
  retenus.sort((a, b) => a.debut - b.debut);
  const vus = new Set<string>();
  return retenus.filter((t) => !vus.has(t.jeu.id) && vus.add(t.jeu.id)).map((t) => t.jeu);
}

/**
 * Le nom d'un jeu là où l'on écrit : le passage sélectionné, sinon la ligne
 * du curseur, sans puce ni ponctuation. Rien si c'est trop long pour un nom.
 */
export function nomSousLeCurseur(texte: string, debut: number, fin: number): string {
  let fragment: string;
  if (fin > debut) {
    fragment = texte.slice(debut, fin);
  } else {
    const avant = texte.lastIndexOf("\n", Math.max(0, debut - 1));
    const apres = texte.indexOf("\n", debut);
    fragment = texte.slice(avant < 0 || debut === 0 ? 0 : avant + 1, apres < 0 ? texte.length : apres);
  }
  const nom = fragment.replace(/\s+/g, " ").trim()
    .replace(/^([-–—•*·>]+|\d+\s*[.)])\s*/, "")
    .replace(/[\s.;:,!?]+$/, "")
    .trim();
  if (!nom || nom.length > 40 || nom.split(" ").length > 5) return "";
  return nom.charAt(0).toUpperCase() + nom.slice(1);
}

/** « 2 à 4 joueurs · 20 min · 📦 armoire du fond » */
export function infosDuJeu(j: Jeu): string {
  const joueurs = j.nbJoueursMin === j.nbJoueursMax
    ? `${j.nbJoueursMin} joueur${j.nbJoueursMin > 1 ? "s" : ""}`
    : `${j.nbJoueursMin} à ${j.nbJoueursMax} joueurs`;
  return [joueurs, j.duree > 0 ? `${j.duree} min` : "", j.rangement.trim() ? `📦 ${j.rangement.trim()}` : ""]
    .filter(Boolean).join(" · ");
}

// ── Le canevas d'une règle ──
//
// Une règle vide s'ouvre sur quatre lignes à compléter après les deux-points.
// Celles qu'on laisse vides ne s'affichent ni ne s'impriment ; un canevas
// laissé tel quel s'enregistre comme une règle vide.

export const LIGNES_DU_CANEVAS = [
  "Dans le jeu il y a",
  "Le but du jeu consiste à",
  "Pour gagner à chaque manche, il faut",
  "Le déroulement d'une partie est le suivant",
];
export const CANEVAS_REGLE = LIGNES_DU_CANEVAS.map((l) => `- ${l} : `).join("\n");

/** Le début de ligne du canevas qu'une ligne reprend, et ce qui le suit : « - Le but du jeu consiste à : faire des paires ». */
function ligneDuCanevas(ligne: string): { suite: string } | null {
  const t = ligne.trim().replace(/^[-–—•]\s*/, "").replace(/’/g, "'");
  const l = LIGNES_DU_CANEVAS.find((x) => t.toLowerCase().startsWith(x.toLowerCase()));
  return l ? { suite: t.slice(l.length).replace(/^\s*:/, "").trim() } : null;
}

/**
 * La règle telle qu'on la montre et l'imprime : sans les lignes du canevas
 * restées vides. Une ligne vide que suivent les étapes de la partie, elle,
 * reste : c'est leur titre.
 */
export function regleEcrite(regles: string): string {
  const lignes = (regles ?? "").split("\n");
  return lignes.filter((ligne, i) => {
    if (ligneDuCanevas(ligne)?.suite !== "") return true;
    const suivante = lignes.slice(i + 1).find((x) => x.trim());
    return suivante !== undefined && !ligneDuCanevas(suivante);
  }).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Les règles des jeux cités, pour l'impression. Un jeu sans règle écrite n'y figure pas. */
export function reglesImprimees(jeux: Jeu[]): string {
  const avecRegle = jeux.filter((j) => regleEcrite(j.regles));
  if (!avecRegle.length) return "";
  return `<div class="regles-jeux">${avecRegle.map((j) =>
    `<div class="regle-jeu"><div class="regle-jeu-titre">🎲 Règle — ${escapeHtml(j.titre)}`
    + `<span class="regle-jeu-infos"> · ${escapeHtml(infosDuJeu(j))}</span></div>`
    + `<div class="regle-jeu-texte">${escapeHtml(regleEcrite(j.regles))}</div></div>`).join("")}</div>`;
}

/** Styles des règles imprimées, à la taille du texte qui les entoure. */
export const STYLE_REGLES = `
  .regles-jeux { margin-top: 5px; display: flex; flex-direction: column; gap: 4px; }
  .regle-jeu { border: 1px solid #e0d5f5; background: #f8f5ff; border-radius: 6px; padding: 4px 8px;
    break-inside: avoid; page-break-inside: avoid; }
  .regle-jeu-titre { font-weight: 700; color: #5b3fa6; font-size: .95em; }
  .regle-jeu-infos { font-weight: 400; color: #7a7f8f; }
  .regle-jeu-texte { white-space: pre-wrap; overflow-wrap: anywhere; font-size: .95em; line-height: 1.4; margin-top: 1px; }
`;

/** La question posée à la recherche en ligne : le nom du jeu, et rien d'autre de la classe. */
export function questionRegle(titre: string): string {
  return `Quelle est la règle du jeu « ${titre.trim()} » ? Explique-la en français, simplement, pour un enseignant qui `
    + "la présente à des enfants. Complète ces quatre lignes, dans cet ordre : "
    + LIGNES_DU_CANEVAS.map((l) => `« - ${l} : »`).join(", ") + ". "
    + "Sous la dernière, une étape de la partie par ligne. Si une ligne ne convient pas au jeu, dis-le en quelques mots. "
    + "Phrases courtes, sans titre, sans gras, sans liens, en 150 mots au plus.";
}

/** Une réponse mise en forme (gras, titres, puces, renvois) devient un texte simple. */
export function texteSimple(reponse: string): string {
  return (reponse ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, "$1")
    .replace(/[ \t]*(【[^】]*】|\[\d+(,\s*\d+)*\])/g, "")
    .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (_, a, b) => a ?? b)
    .split("\n")
    .map((ligne) => ligne
      .replace(/^\s{0,3}#{1,6}\s+/, "")
      .replace(/^\s*[*•·]\s+/, "- ")
      .replace(/\s+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
