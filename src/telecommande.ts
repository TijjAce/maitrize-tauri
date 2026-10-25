// La télécommande : l'enseignant parle à son téléphone, et le Mac — projeté au tableau — affiche.
//
// Le réseau, le chiffrement et la transcription sont côté Rust (telecommande.rs). Ici, la phrase entendue devient
// un geste de la fenêtre, avec le vocabulaire de ⌘K : « affiche les supports visuels », « minuteur cinq minutes »,
// « montre la carte mentale »… Ce qu'on ne connaît pas par son nom se cherche, comme dans la palette.
//
// Une règle : la voix ne montre que ce qu'on peut montrer à la classe. Ni les élèves, ni le cahier journal et ses
// bilans, ni les réglages : ces pages ne s'ouvrent pas par la télécommande, et une note sur un élève s'écrit après
// un « oui » sur le téléphone, sans jamais s'afficher au tableau.

/** Une page de ⌘K que la voix peut ouvrir. */
export interface Destination { label: string; to: string; page?: string; onglet?: string }

export interface ContexteTelecommande {
  destinations: Destination[];
  eleves: { id: string; nom: string }[];
}

export type Compris =
  | { genre: "minuteur"; secondes: number }
  | { genre: "pleinEcran"; actif: boolean }
  | { genre: "fermer" }
  | { genre: "aller"; destination: Destination }
  /** Ce qu'on cherche, en mots pleins, et la sorte nommée (« la séquence sur les fractions »). */
  | { genre: "chercher"; quoi: string; sorte: string | null }
  | { genre: "note"; eleve: { id: string; nom: string }; texte: string }
  | { genre: "rien"; pourquoi: string };

/** Les pages qu'on peut montrer à la classe ; les autres ne s'ouvrent pas à la voix. */
const PAGES_DE_LA_CLASSE = new Set(["/jeux", "/caa", "/ressources", "/projets", "/ateliers", "/plan", "/referentiels"]);

/** Ce que la recherche trouve et qu'on peut montrer : ni un élève, ni une observation, ni un cahier journal. */
export const TROUVAILLES_DE_LA_CLASSE = new Set(["sequence", "seance", "atelier", "espace", "jeu", "outil", "texte", "materiel"]);

export const pourLaClasse = (d: Destination) => PAGES_DE_LA_CLASSE.has(d.to);

/** En minuscules, sans accents ni ponctuation, les blancs resserrés. */
export function plat(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[’'`´-]/g, " ").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

const NOMBRES: Record<string, number> = {
  zero: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
  onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16, vingt: 20, trente: 30, quarante: 40,
  cinquante: 50, soixante: 60,
};

/** « vingt cinq minutes » → « 25 minutes » : les nombres dits en lettres, jusqu'à soixante, en chiffres. */
export function enChiffres(p: string): string {
  const mots = p.split(" ");
  const sortie: string[] = [];
  for (let i = 0; i < mots.length; i++) {
    const v = NOMBRES[mots[i]];
    if (v === undefined) { sortie.push(mots[i]); continue; }
    let total = v;
    // « dix sept », « vingt cinq », « trente et un ».
    let j = i + 1;
    if (v >= 20 && mots[j] === "et" && (mots[j + 1] === "un" || mots[j + 1] === "une")) { total += 1; j += 2; }
    else if (v >= 10 && v % 10 === 0 && NOMBRES[mots[j]] !== undefined && NOMBRES[mots[j]] < 10 && NOMBRES[mots[j]] > 0) { total += NOMBRES[mots[j]]; j += 1; }
    sortie.push(String(total));
    i = j - 1;
  }
  return sortie.join(" ");
}

/** La durée dite, en secondes : « 10 minutes », « deux minutes trente », « une minute et demie », « un quart d'heure ». */
export function dureeDite(phrase: string): number | null {
  const p = enChiffres(plat(phrase));
  if (/\b(1 )?quart d heure\b/.test(p)) return /\b3 quarts? d heure\b/.test(p) ? 2700 : 900;
  if (/\b(1 )?demi heure\b/.test(p)) return 1800;
  let secondes = 0;
  let vu = false;
  const h = /(\d+) ?(h|heures?)\b/.exec(p);
  if (h) { secondes += Number(h[1]) * 3600; vu = true; }
  const m = /(\d+) ?(min|mn|minutes?)\b( et demie?| (\d+))?/.exec(p);
  if (m) {
    secondes += Number(m[1]) * 60 + (m[3]?.startsWith(" et demi") ? 30 : m[4] ? Number(m[4]) : 0);
    vu = true;
  }
  const s = /(\d+) ?(s|sec|secondes?)\b/.exec(p);
  if (s && !(m && m[4] === s[1])) { secondes += Number(s[1]); vu = true; }
  if (!vu || secondes < 5) return null;
  return Math.min(secondes, 3 * 3600);
}

/** « 10 minutes », « 1 minute 30 », « 45 secondes ». */
export function dureeEnClair(secondes: number): string {
  const m = Math.floor(secondes / 60), s = secondes % 60;
  if (!m) return `${s} seconde${s > 1 ? "s" : ""}`;
  return `${m} minute${m > 1 ? "s" : ""}${s ? ` ${s}` : ""}`;
}

const VERBES = [
  "affiche", "afficher", "affiches", "affichez", "montre", "montrer", "montres", "montrez", "ouvre", "ouvrir", "ouvres",
  "ouvrez", "lance", "lancer", "mets", "met", "mettre", "va a", "va au", "va aux", "va sur", "aller a", "passe a",
  "passe au", "presente", "je veux voir", "on regarde", "fais voir", "fait voir", "on va voir", "montre moi",
  "affiche moi", "montrez moi", "fais moi voir", "montre nous", "affiche nous",
].sort((a, b) => b.length - a.length);
const DETERMINANTS = new Set(["le", "la", "les", "l", "un", "une", "des", "du", "de", "d", "au", "aux", "a", "en", "mon", "ma", "mes", "sur"]);

/** Sans le verbe d'affichage du début, s'il y en a un. */
function sansVerbe(p: string): { reste: string; verbe: boolean } {
  for (const v of VERBES) {
    if (p === v) return { reste: "", verbe: true };
    if (p.startsWith(v + " ")) return { reste: p.slice(v.length + 1), verbe: true };
  }
  return { reste: p, verbe: false };
}

/** Les sortes de la recherche, telles qu'on les nomme. */
const SORTES_DITES: Record<string, string> = {
  sequence: "sequence", seance: "seance", jeu: "jeu", atelier: "atelier", espace: "espace", outil: "outil",
  fiche: "outil", texte: "texte", materiel: "materiel",
};
const PETITS_MOTS = new Set([...DETERMINANTS, "pour", "avec", "et", "moi", "nous", "qui", "que"]);

/** Ce qu'on cherche vraiment : les mots pleins — la recherche les veut tous —, et la sorte nommée, à part. */
export function aChercher(reste: string): { quoi: string; sorte: string | null } {
  let sorte: string | null = null;
  const pleins = reste.split(" ").filter((m) => {
    const s = SORTES_DITES[m.replace(/s$/, "")];
    if (s && !sorte) { sorte = s; return false; }
    return m !== "" && !PETITS_MOTS.has(m);
  });
  return { quoi: pleins.join(" "), sorte };
}

/** Les mots qui portent le sens, au singulier. */
function motsPleins(p: string): string[] {
  return p.split(" ").filter((m) => m && !DETERMINANTS.has(m)).map((m) => (m.length > 3 ? m.replace(/[sx]$/, "") : m));
}

/** La page de ⌘K dont le nom est ce qu'on a dit : tous les mots dits y sont, et ils en font au moins la moitié. */
function destinationDite(reste: string, destinations: Destination[]): Destination | null {
  const dits = motsPleins(reste);
  if (!dits.length) return null;
  let meilleure: { d: Destination; score: number } | null = null;
  for (const d of destinations) {
    const nom = motsPleins(plat(d.label.split(" (")[0].split(" : ")[0]));
    if (!nom.length || !dits.every((m) => nom.includes(m))) continue;
    const score = dits.length / nom.length;
    if (score >= 0.5 && (!meilleure || score > meilleure.score)) meilleure = { d, score };
  }
  return meilleure?.d ?? null;
}

/** Le prénom et le texte d'une note : « note pour [prénom] : a lu douze mots seul ». */
function noteDite(phrase: string, eleves: ContexteTelecommande["eleves"]): Compris {
  const mots = phrase.trim().split(/\s+/);
  const plats = mots.map(plat);
  // Le début : « note », « note pour », « noter à propos de »…
  let i = 1;
  while (i < plats.length && ["pour", "a", "sur", "propos", "de", "d", "l", "eleve", ""].includes(plats[i])) i++;
  type Trouve = { eleve: ContexteTelecommande["eleves"][number]; fin: number };
  const trouves: Trouve[] = [];
  for (const e of eleves) {
    const nom = plat(e.nom).split(" ");
    // Le nom entier, sinon le prénom seul.
    for (const long of [nom.length, 1]) {
      if (long > nom.length) continue;
      const dit = plats.slice(i, i + long).join(" ");
      if (dit && dit === nom.slice(0, long).join(" ")) { trouves.push({ eleve: e, fin: i + long }); break; }
    }
  }
  if (!trouves.length) return { genre: "rien", pourquoi: "Je n'ai pas reconnu l'élève : dites « note pour », puis son prénom." };
  const plusLong = Math.max(...trouves.map((t) => t.fin));
  const retenus = trouves.filter((t) => t.fin === plusLong);
  if (retenus.length > 1) return { genre: "rien", pourquoi: `Plusieurs élèves s'appellent ${mots[i]} : dites aussi le nom de famille.` };
  const texte = mots.slice(plusLong).join(" ").replace(/^[:,;.\s-]+/, "").replace(/^(qu[ie]l?|que)\s+/i, "").trim();
  if (!texte) return { genre: "rien", pourquoi: "Que faut-il noter ?" };
  return { genre: "note", eleve: retenus[0].eleve, texte: texte.charAt(0).toUpperCase() + texte.slice(1) };
}

/** Ce que la phrase demande. */
export function comprendre(phrase: string, ctx: ContexteTelecommande): Compris {
  const p = plat(phrase);
  if (!p) return { genre: "rien", pourquoi: "Je n'ai rien entendu." };
  if (/\bplein ecran\b/.test(p)) return { genre: "pleinEcran", actif: !/\b(quitte|quitter|sors|sortir|ferme|fermer|enleve|arrete|sans)\b/.test(p) };
  if (/^(ferme|fermer|stop|arrete|arreter|quitte|quitter|sors|sortir|retour)\b/.test(p) && p.split(" ").length <= 4) return { genre: "fermer" };
  if (/^(note|noter|notes|observation)\b/.test(p)) return noteDite(phrase, ctx.eleves);
  const minuteur = /\b(minuteur|chrono|chronometre|sablier|timer)\b/.test(p);
  const duree = dureeDite(phrase);
  if (duree !== null && (minuteur || /^(lance|lancer|mets|met|mettre|demarre)\b/.test(p))) return { genre: "minuteur", secondes: duree };
  const { reste } = sansVerbe(p);
  if (!reste) return { genre: "rien", pourquoi: "Que faut-il afficher ?" };
  const destination = destinationDite(reste, ctx.destinations.filter(pourLaClasse));
  if (destination) return { genre: "aller", destination };
  if (minuteur) return { genre: "rien", pourquoi: "Combien de minutes ? Dites par exemple « minuteur cinq minutes »." };
  const cherche = aChercher(reste);
  if (!cherche.quoi) return { genre: "rien", pourquoi: "Que faut-il afficher ?" };
  return { genre: "chercher", ...cherche };
}
