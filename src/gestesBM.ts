// ── Les gestes Borel-Maisonny ──────────────────────────────────────────────
//
// La méthode associe un geste à chaque son, quelles que soient ses
// écritures : on « dit » un mot avec les mains avant de le lire. Ici : la
// liste des sons qui ont un geste, la façon d'écrire un mot en gestes, et les
// feuilles qu'on en tire — des cartes à découper, des mots codés à relier, à
// reconnaître ou à écrire.
//
// Les images des gestes ne sont pas dans l'application. Les photos de la
// méthode appartiennent à son éditeur, les dessins à leurs auteurs :
// l'enseignant apporte les siennes, une fois, et elles restent chez lui.

import { HAUTEUR_UTILE_MM, attributionPour, feuille, imgPicto } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";
import { escapeHtml } from "./print";

export type SorteGeste = "voyelle" | "son complexe" | "consonne";

/** Un son de la méthode : son geste, et ses façons de s'écrire. */
export interface Geste {
  id: string;
  /** Les écritures du son, la plus courante d'abord : c'est elle qu'on lit sous la carte. */
  graphies: string[];
  sorte: SorteGeste;
}

/**
 * Les trente-quatre sons qui ont un geste, dans l'ordre où on les range :
 * les voyelles, les sons qui s'écrivent à plusieurs lettres, les consonnes.
 */
export const GESTES: Geste[] = [
  { id: "a", graphies: ["a"], sorte: "voyelle" },
  { id: "e", graphies: ["e"], sorte: "voyelle" },
  { id: "i", graphies: ["i", "y"], sorte: "voyelle" },
  { id: "o", graphies: ["o", "au", "eau"], sorte: "voyelle" },
  { id: "u", graphies: ["u"], sorte: "voyelle" },
  { id: "é", graphies: ["é", "er", "ez"], sorte: "voyelle" },
  { id: "è", graphies: ["è", "ê", "ai", "ei"], sorte: "voyelle" },
  { id: "ou", graphies: ["ou"], sorte: "son complexe" },
  { id: "eu", graphies: ["eu", "œu"], sorte: "son complexe" },
  { id: "an", graphies: ["an", "en", "am", "em"], sorte: "son complexe" },
  { id: "on", graphies: ["on", "om"], sorte: "son complexe" },
  { id: "in", graphies: ["in", "ain", "ein", "im"], sorte: "son complexe" },
  { id: "un", graphies: ["un", "um"], sorte: "son complexe" },
  { id: "oi", graphies: ["oi"], sorte: "son complexe" },
  { id: "oin", graphies: ["oin"], sorte: "son complexe" },
  { id: "ill", graphies: ["ill", "y"], sorte: "son complexe" },
  { id: "l", graphies: ["l"], sorte: "consonne" },
  { id: "r", graphies: ["r"], sorte: "consonne" },
  { id: "m", graphies: ["m"], sorte: "consonne" },
  { id: "n", graphies: ["n"], sorte: "consonne" },
  { id: "s", graphies: ["s", "ss", "c", "ç"], sorte: "consonne" },
  { id: "f", graphies: ["f", "ph"], sorte: "consonne" },
  { id: "ch", graphies: ["ch"], sorte: "consonne" },
  { id: "v", graphies: ["v"], sorte: "consonne" },
  { id: "z", graphies: ["z", "s"], sorte: "consonne" },
  { id: "j", graphies: ["j", "g"], sorte: "consonne" },
  { id: "p", graphies: ["p"], sorte: "consonne" },
  { id: "t", graphies: ["t"], sorte: "consonne" },
  { id: "k", graphies: ["c", "k", "qu"], sorte: "consonne" },
  { id: "b", graphies: ["b"], sorte: "consonne" },
  { id: "d", graphies: ["d"], sorte: "consonne" },
  { id: "g", graphies: ["g", "gu"], sorte: "consonne" },
  { id: "gn", graphies: ["gn"], sorte: "consonne" },
  { id: "ks", graphies: ["x"], sorte: "consonne" },
];

const PAR_ID = new Map(GESTES.map((g) => [g.id, g]));
export const gesteDe = (id: string | null | undefined): Geste | undefined => (id ? PAR_ID.get(id) : undefined);

/** Ce qu'on écrit sous la carte d'un geste : sa graphie courante, ou toutes. */
export const legendeDuGeste = (g: Geste, toutes: boolean) => (toutes ? g.graphies.join(" · ") : g.graphies[0]);

// ── Reconnaître une image à son nom de fichier ─────────────────────────────

/** Les mots d'un nom de fichier qui ne disent pas le son : « Geste-Borel-Maisonny-Son-A ». */
const BRUIT = new Set([
  "geste", "gestes", "borel", "maisonny", "bm", "son", "sons", "by", "par", "de", "du", "le", "la", "les", "carte", "image", "img",
  "photo", "dessin", "couleur", "couleurs", "color", "nb", "noir", "blanc", "et", "copie", "copy", "scan", "final", "petit", "grand",
  "mysticlolly", "lettre", "phoneme", "phonème", "methode", "méthode", "lecture",
]);

/** D'autres façons de nommer un son dans un nom de fichier. */
const ALIAS: Record<string, string> = {
  "e aigu": "é", "e accent aigu": "é", "eaigu": "é", "é": "é", "er": "é", "ez": "é",
  "e grave": "è", "e accent grave": "è", "egrave": "è", "è": "è", "ê": "è", "e circonflexe": "è", "ai": "è", "ei": "è", "et": "è",
  "au": "o", "eau": "o", "ô": "o", "y": "i", "oeu": "eu", "œu": "eu", "en": "an", "am": "an", "em": "an", "om": "on",
  "ain": "in", "ein": "in", "im": "in", "um": "un", "ille": "ill", "il": "ill", "yod": "ill", "ail": "ill",
  "c": "k", "qu": "k", "q": "k", "ph": "f", "ss": "s", "ç": "s", "ge": "j", "gu": "g", "x": "ks", "w": "v",
};

/**
 * Le son que désigne un nom de fichier : « Geste-Borel-Maisonny-Son-CH.png »
 * → « ch », « e_accent_aigu.jpg » → « é ». Rien quand le nom ne le dit pas :
 * l'image se range alors à la main.
 */
export function gesteDuFichier(nom: string): string | null {
  const base = (nom ?? "").replace(/^.*[\\/]/, "").replace(/\.[a-z0-9]{2,5}$/i, "").normalize("NFC").toLowerCase();
  const mots = base.split(/[^a-zàâäçéèêëîïôöùûüœ]+/).filter((m) => m && !BRUIT.has(m));
  if (!mots.length) return null;
  // Tout le reste d'abord (« e accent aigu »), puis le dernier mot : le son ferme souvent le nom.
  for (const essai of [mots.join(" "), mots[mots.length - 1]]) {
    if (PAR_ID.has(essai)) return essai;
    if (ALIAS[essai]) return ALIAS[essai];
  }
  return null;
}

// ── Écrire un mot en gestes ────────────────────────────────────────────────

/** Un pas de la lecture d'un mot : des lettres, et le geste qui les dit — aucun pour des lettres muettes. */
export interface Pas {
  graphie: string;
  geste: string | null;
}

const VOYELLES = "aàâäeéèêëiîïoôöuûùüyœ";
const estVoyelle = (c: string | undefined) => !!c && VOYELLES.includes(c);
const estLettre = (c: string | undefined) => !!c && /[a-zàâäçéèêëîïôöùûüœ]/.test(c);
/** Deux consonnes qui ouvrent ensemble la syllabe suivante : devant elles, « e » reste « e » (se-cret). */
const SOUDEES = new Set(["bl", "br", "cl", "cr", "dr", "fl", "fr", "gl", "gr", "pl", "pr", "tr", "vr", "ch", "ph", "th", "gn", "qu", "gu"]);
/** Les consonnes qu'on n'entend pas en fin de mot. */
const MUETTES_FINALES = "sxtdpgz";
/** Les voyelles nasales : la voyelle écrite, puis le geste. */
const NASALES: [string, string][] = [["a", "an"], ["e", "an"], ["o", "on"], ["i", "in"], ["y", "in"], ["u", "un"]];

/**
 * Un mot, lu geste après geste.
 *
 * C'est un déchiffrage raisonnable, pas un dictionnaire : les règles
 * courantes de la lecture — les sons à plusieurs lettres, le « c » et le
 * « g » devant e et i, le « s » entre deux voyelles, les voyelles nasales,
 * les lettres finales muettes. Le français a ses exceptions (ville, fils,
 * monsieur) : l'enseignant voit le résultat et corrige chaque pas d'un clic.
 *
 * Le « e » final se code par son geste quand `eFinal` est vrai : c'est ainsi
 * que la méthode fait dire les syllabes écrites (fè-ve). Sinon il est muet.
 */
export function coderMot(mot: string, options: { eFinal?: boolean } = {}): Pas[] {
  const eFinal = options.eFinal ?? true;
  const m = (mot ?? "").normalize("NFC").toLowerCase().trim();
  const pas: Pas[] = [];
  const poser = (graphie: string, geste: string | null) => { pas.push({ graphie, geste }); };
  /** Après `k` lettres, le mot est fini — ou il ne reste que la marque du pluriel. */
  const finit = (i: number, k: number) => {
    const reste = m.slice(i + k);
    return reste === "" || reste === "s" || reste === "x" || !estLettre(reste[0]);
  };
  /** Une voyelle a-t-elle déjà été lue dans ce mot ? (« mer » n'en a qu'une, « manger » deux.) */
  const dejaUneVoyelle = (debut: number, i: number) => [...m.slice(debut, i)].some(estVoyelle);
  let debutDuMot = 0;
  let i = 0;
  while (i < m.length) {
    const c = m[i], n1 = m[i + 1], n2 = m[i + 2], n3 = m[i + 3];
    const avant = m[i - 1];
    const suite = (s: string) => m.startsWith(s, i);
    if (!estLettre(c)) {
      // Un espace, un trait d'union : le mot suivant commence.
      i += 1;
      debutDuMot = i;
      continue;
    }
    const auDebut = i === debutDuMot;

    // ── Trois lettres et plus ──
    if (suite("eau")) { poser("eau", "o"); i += 3; continue; }
    if (suite("œu") || suite("oeu")) { const n = suite("œu") ? 2 : 3; poser(m.slice(i, i + n), "eu"); i += n; continue; }
    if (suite("oin") && !estVoyelle(n3) && n3 !== "n") { poser("oin", "oin"); i += 3; continue; }
    if ((suite("ain") || suite("ein")) && !estVoyelle(n3) && n3 !== "n") { poser(m.slice(i, i + 3), "in"); i += 3; continue; }
    if (suite("aim") && finit(i, 3)) { poser("aim", "in"); i += 3; continue; }
    if (suite("ien") && !estVoyelle(n3) && n3 !== "n") { poser("i", "i"); poser("en", "in"); i += 3; continue; }
    if (suite("ill")) {
      // Après une voyelle, « ill » ne fait que mouiller (paille, feuille) ; après une consonne, on entend le i (fille).
      if (estVoyelle(avant)) { poser("ill", "ill"); i += 3; continue; }
      poser("i", "i"); poser("ll", "ill"); i += 3; continue;
    }
    if (suite("il") && estVoyelle(avant) && finit(i, 2)) { poser("il", "ill"); i += 2; continue; }
    // « tion » se dit « sion » (addition), sauf après un s (question).
    if (suite("tion") && avant !== "s") { poser("t", "s"); i += 1; continue; }

    // ── Les voyelles à deux lettres ──
    if (c === "o" && (n1 === "u" || n1 === "ù" || n1 === "û")) { poser(m.slice(i, i + 2), "ou"); i += 2; continue; }
    if (c === "o" && n1 === "y" && estVoyelle(n2)) { poser("oy", "oi"); poser("y", "ill"); i += 2; continue; }
    if (c === "o" && (n1 === "i" || n1 === "î")) { poser(m.slice(i, i + 2), "oi"); i += 2; continue; }
    if (c === "a" && n1 === "y" && estVoyelle(n2)) { poser("ay", "è"); poser("y", "ill"); i += 2; continue; }
    if (c === "u" && n1 === "y" && estVoyelle(n2)) { poser("u", "u"); poser("y", "ill"); i += 2; continue; }
    // « ail », « aill » : le a reste a, c'est la suite qui mouille (travail, paille).
    if (c === "a" && n1 === "i" && n2 === "l" && (n3 === "l" || finit(i, 3))) { poser("a", "a"); i += 1; continue; }
    // « eil », « eill » : le e s'ouvre, et la suite mouille (soleil, abeille).
    if (c === "e" && n1 === "i" && n2 === "l" && (n3 === "l" || finit(i, 3))) { poser("e", "è"); i += 1; continue; }
    if ((c === "a" || c === "e") && (n1 === "i" || n1 === "î")) { poser(m.slice(i, i + 2), "è"); i += 2; continue; }
    if (c === "a" && n1 === "u") { poser("au", "o"); i += 2; continue; }
    if (c === "e" && (n1 === "u" || n1 === "û")) { poser(m.slice(i, i + 2), "eu"); i += 2; continue; }

    // ── Les voyelles nasales : devant une consonne, ou en fin de mot ──
    const nasale = NASALES.find(([v]) => v === c);
    if (nasale && (n1 === "n" || n1 === "m")) {
      const libre = !estVoyelle(n2) && n2 !== "h";
      const devantN = n1 === "n" && libre && n2 !== "n";
      // Devant m, la nasale veut un b ou un p (jambe, timbre) — ou la fin du mot (nom, parfum).
      const devantM = n1 === "m" && (n2 === "b" || n2 === "p" || (finit(i, 2) && c !== "a" && c !== "e"));
      if (devantN || devantM) { poser(c + n1, nasale[1]); i += 2; continue; }
    }

    // ── Les consonnes à deux lettres ──
    if (suite("ch")) { poser("ch", "rln".includes(n2 ?? " ") ? "k" : "ch"); i += 2; continue; }
    if (suite("ph")) { poser("ph", "f"); i += 2; continue; }
    if (suite("th")) { poser("th", "t"); i += 2; continue; }
    if (suite("gn")) { poser("gn", "gn"); i += 2; continue; }
    if (suite("qu")) { poser("qu", "k"); i += 2; continue; }
    if (suite("ck")) { poser("ck", "k"); i += 2; continue; }
    if (suite("sh")) { poser("sh", "ch"); i += 2; continue; }
    if (suite("sc") && "eiyéèê".includes(n2 ?? " ")) { poser("sc", "s"); i += 2; continue; }
    if (c === "g" && n1 === "u" && "eiyéèê".includes(n2 ?? " ")) { poser("gu", "g"); i += 2; continue; }
    if (c === "g" && n1 === "e" && "aou".includes(n2 ?? " ")) { poser("ge", "j"); i += 2; continue; }
    if (c === n1 && "slmntprfdbz".includes(c)) { poser(c + c, c); i += 2; continue; }
    if (suite("cc") && !"eiy".includes(n2 ?? " ")) { poser("cc", "k"); i += 2; continue; }

    // ── Les fins de mot ──
    if (c === "e" && n1 === "r" && finit(i, 2) && m.slice(i + 2) === "") {
      // « manger » finit en é ; « mer », qui n'a pas d'autre voyelle, se lit jusqu'au r.
      if (dejaUneVoyelle(debutDuMot, i)) { poser("er", "é"); i += 2; continue; }
      poser("e", "è"); i += 1; continue;
    }
    if (c === "e" && n1 === "z" && m.slice(i + 2) === "") { poser("ez", "é"); i += 2; continue; }
    if (c === "e" && n1 === "t" && m.slice(i + 2) === "") { poser("et", auDebut ? "é" : "è"); i += 2; continue; }
    if (c === "e" && n1 === "s" && m.slice(i + 2) === "") {
      // « les », « des » : é. Ailleurs, la marque du pluriel ne se dit pas (tables).
      if (!dejaUneVoyelle(debutDuMot, i)) { poser("es", "é"); i += 2; continue; }
      poser("e", eFinal ? "e" : null); poser("s", null); i += 2; continue;
    }

    // ── Une lettre ──
    switch (c) {
      case "a": case "à": case "â": case "ä": poser(c, "a"); break;
      case "é": poser(c, "é"); break;
      case "è": case "ê": case "ë": poser(c, "è"); break;
      case "i": case "î": case "ï": poser(c, "i"); break;
      case "o": case "ô": case "ö": poser(c, "o"); break;
      case "u": case "û": case "ù": case "ü": poser(c, "u"); break;
      case "œ": poser(c, "eu"); break;
      case "y": poser(c, auDebut && estVoyelle(n1) ? "ill" : "i"); break;
      case "e": {
        const derniere = !estLettre(n1);
        const precedent = gesteDe(pas[pas.length - 1]?.geste);
        if (derniere && precedent && precedent.sorte !== "consonne" && precedent.id !== "ill") {
          // Après une voyelle, le e final ne se dit jamais : rue, vie, année.
          poser(c, null);
        } else if (derniere) {
          // « le », « de » : le e s'entend. Après une consonne, en fin de mot, c'est selon la méthode.
          poser(c, !dejaUneVoyelle(debutDuMot, i) || eFinal ? "e" : null);
        } else if (n1 === "d" && !estLettre(n2)) {
          poser(c, "é"); // pied
        } else if (n1 === "x") {
          poser(c, "è");
        } else if (!estVoyelle(n1) && !estVoyelle(n2) && estLettre(n2) && !SOUDEES.has(n1 + n2)) {
          // Devant deux consonnes : veste, merci, belle.
          poser(c, "è");
        } else if (!estVoyelle(n1) && !estLettre(n2) && "cflr".includes(n1)) {
          // Devant une consonne finale qu'on entend : sec, chef, sel.
          poser(c, "è");
        } else {
          poser(c, "e");
        }
        break;
      }
      case "c":
        if ("eiyéèê".includes(n1 ?? " ")) poser(c, "s");
        else if (finit(i, 1) && avant === "n") poser(c, null); // blanc, banc
        else poser(c, "k");
        break;
      case "ç": poser(c, "s"); break;
      case "g":
        if ("eiyéèê".includes(n1 ?? " ")) poser(c, "j");
        else if (finit(i, 1)) poser(c, null); // long, sang
        else poser(c, "g");
        break;
      case "s":
        if (finit(i, 1)) poser(c, null);
        else poser(c, estVoyelle(avant) && estVoyelle(n1) ? "z" : "s");
        break;
      case "x": poser(c, finit(i, 1) ? null : "ks"); break;
      case "h": poser(c, null); break;
      case "q": poser(c, "k"); break;
      case "w": poser(c, "v"); break;
      case "b": poser(c, finit(i, 1) && avant === "m" ? null : "b"); break; // plomb
      default:
        if (MUETTES_FINALES.includes(c) && finit(i, 1)) poser(c, null);
        else poser(c, PAR_ID.has(c) ? c : null);
    }
    i += 1;
  }
  return pas;
}

/** Les gestes d'un mot, dans l'ordre, sans les lettres muettes : ce qu'on montre à l'élève. */
export const gestesDuMot = (pas: Pas[]): string[] => pas.flatMap((p) => (p.geste ? [p.geste] : []));

/**
 * Le codage d'un mot, avec les corrections de l'enseignant.
 *
 * Une correction donne, pas à pas, le geste voulu (« - » pour une lettre
 * muette). Elle ne vaut que si elle a autant de pas que le codage : un mot
 * réécrit autrement retrouve le codage automatique.
 */
export function codageCorrige(mot: string, corrections: Record<string, string[]>, options: { eFinal?: boolean } = {}): Pas[] {
  const pas = coderMot(mot, options);
  const voulu = corrections[cleDuMot(mot)];
  if (!voulu || voulu.length !== pas.length) return pas;
  return pas.map((p, k) => ({ graphie: p.graphie, geste: voulu[k] === "-" ? null : PAR_ID.has(voulu[k]) ? voulu[k] : p.geste }));
}

/** Sous quel nom se garde la correction d'un mot. */
export const cleDuMot = (mot: string) => (mot ?? "").normalize("NFC").toLowerCase().trim();

/** Ce qu'on enregistre d'un codage corrigé. */
export const enCorrection = (pas: Pas[]): string[] => pas.map((p) => p.geste ?? "-");

// ── Les cartes à découper ──────────────────────────────────────────────────

export type TailleCartes = "petit" | "moyen" | "grand" | "affiche";

/** Les tailles : colonnes et lignes par page, et à quoi elles servent. */
export const TAILLES_CARTES: Record<TailleCartes, { colonnes: number; lignes: number; libelle: string }> = {
  petit: { colonnes: 5, lignes: 5, libelle: "Petites — 25 par page, à manipuler" },
  moyen: { colonnes: 3, lignes: 3, libelle: "Moyennes — 9 par page" },
  grand: { colonnes: 2, lignes: 2, libelle: "Grandes — 4 par page, pour le tableau" },
  affiche: { colonnes: 1, lignes: 1, libelle: "Affiches — une par page" },
};

export interface ReglagesCartes {
  taille: TailleCartes;
  /** Écrire le son sous l'image. */
  lettres: boolean;
  /** Toutes les écritures du son (o · au · eau), ou la plus courante seulement. */
  toutesLesGraphies: boolean;
  /** Combien de jeux de cartes : un par élève, un par groupe. */
  exemplaires: number;
  /** Les sons retenus ; vide : tous ceux qui ont une image. */
  choisis: string[];
}

export const REGLAGES_CARTES: ReglagesCartes = { taille: "petit", lettres: true, toutesLesGraphies: false, exemplaires: 1, choisis: [] };

/** Les images des gestes, par son. */
export type ImagesGestes = Record<string, string>;

/** Les gestes à imprimer : ceux qu'on a choisis, ou tous ceux qui ont une image, dans l'ordre de la méthode. */
export function gestesRetenus(r: ReglagesCartes, images: ImagesGestes): Geste[] {
  const choisis = new Set(r.choisis.filter((id) => PAR_ID.has(id)));
  return GESTES.filter((g) => (choisis.size ? choisis.has(g.id) : !!images[g.id]));
}

/** Combien de pages feront les cartes. */
export function pagesDeCartesGestes(combien: number, r: ReglagesCartes): number {
  const t = TAILLES_CARTES[r.taille];
  return Math.ceil((combien * Math.max(1, r.exemplaires)) / (t.colonnes * t.lignes));
}

/**
 * La hauteur qu'une planche de cartes peut occuper. Moins que la page : le
 * document imprimé garde une marge en tête de sa première page, et l'en-tête
 * des compétences, quand il y en a un, prend sa place. Une rangée qui
 * déborde d'un millimètre part seule sur la feuille suivante.
 */
const HAUTEUR_DES_PLANCHES_MM = HAUTEUR_UTILE_MM - 12;

/** L'image d'un geste, ou son écriture dans un cadre quand l'image manque encore. */
const imageDuGeste = (id: string, images: ImagesGestes) => {
  const g = gesteDe(id);
  return images[id]
    ? `<img src="${images[id]}" alt="${escapeHtml(g?.graphies[0] ?? id)}">`
    : `<span class="gb-manque" title="Image à ajouter">${escapeHtml(g?.graphies[0] ?? id)}</span>`;
};

/**
 * Les cartes des gestes, sur des planches prêtes à découper : les pointillés
 * se touchent, un coup de massicot par rangée suffit.
 */
export function htmlCartesGestes(gestes: Geste[], images: ImagesGestes, r: ReglagesCartes): string {
  if (!gestes.length) return feuille(`<div class="page"><div class="sous">Ajoutez les images des gestes : elles se rangent en cartes ici.</div></div>`, "gb");
  const t = TAILLES_CARTES[r.taille];
  const parPage = t.colonnes * t.lignes;
  const hauteur = Math.floor(HAUTEUR_DES_PLANCHES_MM / t.lignes);
  // Un jeu après l'autre : chaque élève reçoit ses cartes dans l'ordre de la méthode.
  const cartes = Array.from({ length: Math.max(1, r.exemplaires) }, () => gestes).flat().map((g) =>
    `<div class="gb-carte">${imageDuGeste(g.id, images)}${r.lettres ? `<div class="gb-lettre">${escapeHtml(legendeDuGeste(g, r.toutesLesGraphies))}</div>` : ""}</div>`);
  const pages: string[] = [];
  for (let i = 0; i < cartes.length; i += parPage) {
    pages.push(`<div class="page"><div class="gb-grille gb-${r.taille}" style="grid-template-columns: repeat(${t.colonnes}, 1fr); grid-auto-rows: ${hauteur}mm">`
      + cartes.slice(i, i + parPage).join("") + `</div></div>`);
  }
  return feuille(pages.join(""), "gb");
}

// ── Les mots codés en gestes ───────────────────────────────────────────────

export type FormeMotsCodes = "fiche" | "relier" | "colorier" | "ecrire";

export interface ReglagesMotsCodes {
  forme: FormeMotsCodes;
  /** Le « e » final se dit avec son geste (fè-ve), ou reste muet. */
  eFinal: boolean;
  /** Combien de mots par page, au plus. */
  parPage: number;
  /** Le son étudié : son geste et ses écritures font l'en-tête de la feuille. Vide : pas d'en-tête. */
  son: string;
}

/** Sept mots par page, trois à colorier et quatre à relier : la feuille des fichiers de la méthode. */
export const REGLAGES_MOTS_CODES: ReglagesMotsCodes = { forme: "fiche", eFinal: true, parPage: 7, son: "" };

/** Au-delà, les gestes d'un mot ne tiennent plus sur une ligne lisible. */
export const GESTES_MAX_PAR_MOT = 8;
/** Combien de mots au moins pour que relier ou choisir ait un sens. */
export const MOTS_CODES_MINIMUM = 2;

/** Un mot prêt à poser sur la feuille : ses gestes, et son image s'il en a une. */
export interface MotCode {
  mot: string;
  gestes: string[];
  /** Les lettres que chaque geste dit dans ce mot : « ê » pour le è de « bête ». */
  graphies?: string[];
  /** L'image du mot (pictogramme, photo), pour « colorie le bon dessin ». */
  image?: string;
  /** D'où vient l'image : un pictogramme de la banque doit sa mention. */
  id?: number | null;
}

/** Un mot codé, tel que la feuille le veut : ses gestes, et les lettres que chacun dit. */
export function motCode(mot: string, pas: Pas[], image?: string, id?: number | null): MotCode {
  const dits = pas.filter((p) => p.geste);
  return { mot, gestes: dits.map((p) => p.geste as string), graphies: dits.map((p) => p.graphie), image, id };
}

const CONSIGNES = {
  relier: "Dis les syllabes et relie au bon mot.",
  colorier: "Dis les syllabes et colorie le bon dessin.",
  ecrire: "Dis les syllabes et écris le mot.",
};
const TITRE = "Les mots en gestes";

const suiteDeGestes = (gestes: string[], images: ImagesGestes) =>
  `<div class="gb-suite">${gestes.map((id) => `<span class="gb-geste">${imageDuGeste(id, images)}</span>`).join("")}</div>`;

/** La place que les gestes d'un mot peuvent prendre sur la ligne, pour qu'il reste de quoi relier, dessiner ou écrire. */
const LARGEUR_DES_GESTES_MM = 100;
/** Un geste est plus haut que large : la photo d'un enfant, de la tête à la taille. */
const HAUTEUR_POUR_LARGEUR = 1.25;

/**
 * Le côté d'un geste dans la suite d'un mot : aussi grand que possible —
 * dix-huit millimètres, comme sur les feuilles de la méthode —, plus petit
 * quand le mot le plus long de la page en demande davantage, ou quand la page
 * porte trop de lignes pour leur laisser cette hauteur.
 */
export function coteDesGestes(mots: MotCode[], hauteurMm = Infinity): number {
  const plusLong = Math.max(1, ...mots.map((m) => m.gestes.length));
  const enLargeur = Math.max(11, Math.min(18, Math.floor(LARGEUR_DES_GESTES_MM / plusLong)));
  return Math.max(9, Math.min(enLargeur, Math.floor(hauteurMm / HAUTEUR_POUR_LARGEUR)));
}

/** Les mots qui tiennent sur la feuille : au moins un geste, pas plus que la ligne n'en porte. */
export const motsCodables = (mots: MotCode[]) => mots.filter((m) => m.gestes.length > 0 && m.gestes.length <= GESTES_MAX_PAR_MOT);

/** Faut-il deux dessins pour en faire choisir un : la liste en a-t-elle deux différents ? */
export const dessinsDifferents = (mots: MotCode[]) => new Set(mots.flatMap((m) => (m.image ? [m.image] : []))).size >= 2;

/**
 * Des pages de taille voisine : sept mots à cinq par page font quatre et
 * trois, pas cinq et deux — une page ne finit pas sur un mot tout seul.
 */
export function repartir<T>(liste: T[], parPage: number): T[][] {
  const pages = Math.ceil(liste.length / Math.max(1, parPage));
  const base = Math.floor(liste.length / Math.max(1, pages)), enPlus = liste.length % Math.max(1, pages);
  const sortie: T[][] = [];
  for (let k = 0, i = 0; k < pages; k += 1) {
    const taille = base + (k < enPlus ? 1 : 0);
    sortie.push(liste.slice(i, i + taille));
    i += taille;
  }
  return sortie;
}

/** Ce qu'une page fait faire : des dessins à choisir, des mots à relier, des mots à écrire. */
export interface PageDeMots { colorier: MotCode[]; relier: MotCode[]; ecrire: MotCode[] }

const motsParPage = (r: ReglagesMotsCodes) => Math.max(2, Math.min(8, Math.round(r.parPage) || REGLAGES_MOTS_CODES.parPage));

/**
 * Les pages de la feuille, et ce que chacune fait faire.
 *
 * La fiche mêle deux exercices, comme celles des fichiers de la méthode :
 * quelques dessins à colorier — parmi les mots qui ont une image —, puis les
 * autres mots à relier. Sans images, elle n'a que des mots à relier.
 */
export function planDesMotsCodes(mots: MotCode[], r: ReglagesMotsCodes): PageDeMots[] {
  const prets = motsCodables(mots);
  const parPage = motsParPage(r);
  const page = (suite: Partial<PageDeMots>): PageDeMots => ({ colorier: [], relier: [], ecrire: [], ...suite });
  if (r.forme === "ecrire") return repartir(prets, parPage).map((t) => page({ ecrire: t }));
  if (r.forme === "relier") return repartir(prets, parPage).map((t) => page({ relier: t }));
  const choisissables = dessinsDifferents(prets);
  if (r.forme === "colorier") return choisissables ? repartir(prets.filter((m) => m.image), parPage).map((t) => page({ colorier: t })) : [];
  // Trois dessins sur sept mots, comme sur le modèle — et toujours deux mots au moins à relier.
  const dessins = Math.round((parPage * 3) / 7);
  return repartir(prets, parPage).map((t) => {
    const illustres = t.filter((m) => m.image);
    const colorier = choisissables ? illustres.slice(0, Math.min(dessins, Math.max(0, t.length - 2))) : [];
    return page({ colorier, relier: t.filter((m) => !colorier.includes(m)) });
  });
}

/** Les mots que la feuille emploie vraiment : ceux de ses pages. */
export const motsDuPlan = (plan: PageDeMots[]): MotCode[] => plan.flatMap((p) => [...p.colorier, ...p.relier, ...p.ecrire]);

/** Un ordre mêlé qui ne laisse personne en face de sa réponse, quand c'est possible. */
function melerSansAligner<T>(liste: T[], graine: number): T[] {
  if (liste.length < 2) return liste;
  const mele = melanger(hasard(graine), liste);
  return mele.every((x, k) => x === liste[k]) ? [...liste.slice(1), liste[0]] : mele;
}

/**
 * Ce qu'une page peut donner de hauteur à ses lignes. Moins que la planche de
 * cartes : la consigne peut porter ses pictogrammes, et une ligne qui déborde
 * part seule sur la feuille suivante.
 */
export const HAUTEUR_DES_FEUILLES_MM = HAUTEUR_DES_PLANCHES_MM - 10;
/** Le titre et la ligne du prénom. */
export const TITRE_MM = 16;
/** L'en-tête du son étudié, à la place du titre, et la ligne du prénom. */
export const BANDEAU_MM = 37;
/** Une consigne, avec la marge qui la sépare de ce qui précède. */
export const CONSIGNE_MM = 14;
/** L'écart entre deux lignes. */
const ECART_MM = 5;
/** Le dessin à colorier, au plus grand. */
const DESSIN_MM = 26;

/** La hauteur qu'une ligne peut prendre, sur une page qui en porte `lignes` sous `consignes` consignes. */
export const hauteurDeLigne = (lignes: number, consignes: number, bandeau: boolean) =>
  (HAUTEUR_DES_FEUILLES_MM - (bandeau ? BANDEAU_MM : TITRE_MM) - consignes * CONSIGNE_MM) / Math.max(1, lignes) - ECART_MM;

/** Les écritures du son étudié qu'on rencontre dans ces mots — « è » et « ê » pour fève et bête ; à défaut, la plus courante. */
export function graphiesDuSon(son: string, mots: MotCode[]): string[] {
  const g = gesteDe(son);
  if (!g) return [];
  const vues = [...new Set(mots.flatMap((m) => (m.graphies ?? []).filter((_, k) => m.gestes[k] === son)))];
  const rang = (x: string) => { const k = g.graphies.indexOf(x); return k < 0 ? g.graphies.length : k; };
  return vues.length ? vues.sort((a, b) => rang(a) - rang(b)) : [g.graphies[0]];
}

/**
 * L'en-tête d'une feuille : le geste du son étudié, et ses écritures en grand.
 * `ecritures` est ce qu'on écrit à côté du geste, déjà mis en forme.
 */
export function bandeauDuGeste(son: string, images: ImagesGestes, ecritures: string): string {
  if (!gesteDe(son)) return "";
  return `<div class="gb-bandeau"><span class="gb-geste">${imageDuGeste(son, images)}</span><span class="gb-graphies">${ecritures}</span></div>`;
}

/** La ligne du prénom et de la date, en tête de chaque page d'élève. */
export const LIGNE_DU_PRENOM = `<div class="gb-prenom">Prénom : .................................... Date : ....................</div>`;

const bandeauDuSon = (son: string, mots: MotCode[], images: ImagesGestes) =>
  bandeauDuGeste(son, images, graphiesDuSon(son, mots).map((x) => `<b>${escapeHtml(x)}</b>`).join(""));

/** La feuille des mots codés : à relier, à reconnaître par son dessin, ou à écrire — et son corrigé. */
export function htmlMotsCodes(mots: MotCode[], images: ImagesGestes, r: ReglagesMotsCodes, graine: number): string {
  const prets = motsCodables(mots);
  if (!prets.length) return feuille(`<div class="page"><div class="sous">Ajoutez des mots : chacun s'écrira en gestes.</div></div>`, "gb");
  const plan = planDesMotsCodes(prets, r);
  if (!plan.length) {
    return feuille(`<div class="page"><div class="sous">Il faut au moins deux mots qui aient une image, pour en faire choisir une : ajoutez des mots de la banque, ou vos propres images.</div></div>`, "gb");
  }
  const employes = motsDuPlan(plan);
  const illustres = prets.filter((m) => m.image);
  const bandeau = bandeauDuSon(r.son, employes, images);
  const tirage = hasard(graine);
  const prenom = LIGNE_DU_PRENOM;
  const dessin = (x: MotCode | undefined) => `<span class="gb-dessin">${x ? imgPicto(x.image, x.mot) : ""}</span>`;
  const corriges: string[] = [];
  const reponse = (m: MotCode, precision = "") => `<div class="gb-reponse">${suiteDeGestes(m.gestes, images)}<span class="gb-fleche">→</span>`
    + `<b>${escapeHtml(m.mot)}</b>${precision ? `<span class="gb-cote">${precision}</span>` : ""}</div>`;

  const pages = plan.map((p, k) => {
    const tous = [...p.colorier, ...p.relier, ...p.ecrire];
    const exercices = [p.colorier, p.relier, p.ecrire].filter((e) => e.length).length;
    const hauteur = hauteurDeLigne(tous.length, exercices, !!bandeau);
    const cote = coteDesGestes(tous, hauteur);
    const tailles = `--gb-cote: ${cote}mm; --gb-dessin: ${Math.max(14, Math.min(DESSIN_MM, Math.floor(hauteur)))}mm`;
    const exercice = (consigne: string, contenu: string) => `<p class="consigne">${consigne}</p><div class="gb-lignes" style="${tailles}">${contenu}</div>`;
    let corps = "";
    if (p.colorier.length) {
      corps += exercice(CONSIGNES.colorier, p.colorier.map((m) => {
        // L'autre dessin : celui d'un autre mot de la liste, jamais le même.
        const autres = illustres.filter((x) => x.image !== m.image && cleDuMot(x.mot) !== cleDuMot(m.mot));
        const leurre = autres[Math.floor(tirage() * autres.length)];
        const bonAGauche = tirage() < 0.5;
        corriges.push(reponse(m, leurre ? (bonAGauche ? "dessin de gauche" : "dessin de droite") : ""));
        return `<div class="gb-ligne gb-choix">${dessin(bonAGauche ? m : leurre)}${suiteDeGestes(m.gestes, images)}${dessin(bonAGauche ? leurre : m)}</div>`;
      }).join(""));
    }
    if (p.relier.length) {
      const droite = melerSansAligner(p.relier, graine + k);
      corps += exercice(CONSIGNES.relier, p.relier.map((m, j) => `<div class="gb-ligne">${suiteDeGestes(m.gestes, images)}<span class="gb-point"></span>`
        + `<span class="gb-espace"></span><span class="gb-point"></span><span class="gb-mot">${escapeHtml(droite[j].mot)}</span></div>`).join(""));
      corriges.push(...p.relier.map((m) => reponse(m)));
    }
    if (p.ecrire.length) {
      corps += exercice(CONSIGNES.ecrire, p.ecrire.map((m) => `<div class="gb-ligne">${suiteDeGestes(m.gestes, images)}<span class="gb-trait"></span></div>`).join(""));
      corriges.push(...p.ecrire.map((m) => reponse(m)));
    }
    // Avec l'en-tête du son, pas de titre : c'est lui qui dit de quoi parle la feuille.
    return `<div class="page">${bandeau ? prenom + bandeau : `<div class="titre">${TITRE}</div>${prenom}`}${corps}</div>`;
  });
  const corrige = `<div class="page corrige"><div class="titre">${TITRE} — corrigé</div><div class="gb-corrige">${corriges.join("")}</div></div>`;
  // Les dessins de la banque ne s'impriment que là où l'on colorie le bon dessin.
  const mention = attributionPour(plan.flatMap((p) => p.colorier).map((m) => m.id));
  return feuille(`${pages.join("")}${corrige}${mention}`, "gb");
}

/** Combien de feuilles feront les mots codés, corrigé compris. */
export function feuillesDeMotsCodes(mots: MotCode[], r: ReglagesMotsCodes): number {
  const pages = planDesMotsCodes(mots, r).length;
  return pages ? pages + 1 : 0;
}

export const STYLE_GESTES = `
  .feuille.gb .gb-grille { display: grid; gap: 0; width: 100%; }
  .feuille.gb .gb-carte { border: 1px dashed #9aa0b4; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 1.5mm; padding: 2.5mm; overflow: hidden; min-width: 0; break-inside: avoid; page-break-inside: avoid; }
  .feuille.gb .gb-carte img { flex: 1 1 0; min-height: 0; max-width: 100%; object-fit: contain; margin: 0; max-height: none; }
  .feuille.gb .gb-lettre { flex: none; font-weight: 800; line-height: 1; text-align: center; }
  .feuille.gb .gb-petit .gb-lettre { font-size: 15px; }
  .feuille.gb .gb-moyen .gb-lettre { font-size: 26px; }
  .feuille.gb .gb-grand .gb-lettre { font-size: 44px; }
  .feuille.gb .gb-affiche .gb-lettre { font-size: 96px; }
  .feuille.gb .gb-affiche .gb-carte { border: none; gap: 6mm; }
  .feuille.gb .gb-manque { flex: 1 1 0; align-self: stretch; display: flex; align-items: center; justify-content: center; border: 1.5px dashed #c4c9d6;
    border-radius: 3mm; color: #9aa0b4; font-weight: 700; font-size: 14px; min-height: 8mm; }
  .feuille.gb .consigne { font-size: 14px; font-weight: 600; margin: 0 0 8px; }
  .feuille.gb .gb-lignes + .consigne { margin-top: 6mm; }
  .feuille.gb .gb-bandeau { display: flex; align-items: center; gap: 8mm; border: 2px solid #1c2233; padding: 1.5mm 2mm; margin: 0 0 4mm; }
  .feuille.gb .gb-bandeau .gb-geste { flex: none; width: 17.6mm; height: 22mm; border: none; }
  .feuille.gb .gb-graphies { flex: 1 1 auto; display: flex; justify-content: space-around; align-items: center; font-size: 46px; line-height: 1; }
  .feuille.gb .gb-graphies b { font-weight: 500; }
  .feuille.gb .gb-graphies .gb-cursive { font-family: "Écriture A", "Ecriture A", "Écriture B", "Ecriture B", "Belle Allure GS", "Belle Allure CE", "Belle Allure CM",
    "Cursive standard", "Ecolier", "ScolaCursive", "Snell Roundhand", cursive; font-size: 1.15em; }
  .feuille.gb .gb-prenom { font-size: 12px; color: #4a5065; margin: 0 0 6px; }
  .feuille.gb .gb-lignes { display: flex; flex-direction: column; gap: 5mm; }
  .feuille.gb .gb-ligne { display: flex; align-items: center; gap: 3mm; break-inside: avoid; page-break-inside: avoid; }
  .feuille.gb .gb-suite { display: flex; gap: 1mm; flex: none; }
  .feuille.gb .gb-geste { flex: none; width: var(--gb-cote, 18mm); height: calc(var(--gb-cote, 18mm) * 1.25); display: flex; align-items: center; justify-content: center;
    border: 1px solid #c4c9d6; overflow: hidden; background: #fff; }
  .feuille.gb .gb-geste img { width: 100%; height: 100%; object-fit: contain; margin: 0; max-height: none; }
  .feuille.gb .gb-geste .gb-manque { border: none; border-radius: 0; font-size: 12px; }
  .feuille.gb .gb-point { flex: none; width: 3mm; height: 3mm; border-radius: 50%; background: #1c2233; }
  .feuille.gb .gb-espace { flex: 1 1 auto; min-width: 12mm; }
  .feuille.gb .gb-mot { flex: none; min-width: 28mm; font-size: 24px; font-weight: 600; }
  .feuille.gb .gb-trait { flex: 1 1 auto; border-bottom: 1.5px solid #1c2233; height: 12mm; margin-left: 4mm; }
  .feuille.gb .gb-choix { justify-content: space-between; }
  .feuille.gb .gb-dessin { flex: none; width: var(--gb-dessin, 26mm); height: var(--gb-dessin, 26mm); border: 1.5px solid #1c2233; display: flex; align-items: center; justify-content: center; padding: 1.5mm; }
  .feuille.gb .gb-dessin img { width: 100%; height: 100%; object-fit: contain; margin: 0; max-height: none; }
  .feuille.gb .gb-corrige { display: flex; flex-direction: column; gap: 3mm; }
  .feuille.gb .gb-reponse { display: flex; align-items: center; gap: 3mm; font-size: 16px; break-inside: avoid; page-break-inside: avoid; }
  .feuille.gb .gb-reponse .gb-geste { width: 11mm; height: 14mm; }
  .feuille.gb .gb-fleche { color: #687087; }
  .feuille.gb .gb-cote { color: #687087; font-size: 12px; }
`;
