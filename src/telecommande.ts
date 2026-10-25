// La télécommande : l'enseignant parle à son téléphone, et le Mac — projeté au tableau — affiche.
//
// Le réseau, le chiffrement et la transcription sont côté Rust (telecommande.rs). Ici, la phrase entendue devient
// un geste de la fenêtre, avec le vocabulaire de ⌘K : « affiche les supports visuels », « minuteur cinq minutes »,
// « montre la carte mentale »… Ce qu'on ne connaît pas par son nom se cherche, comme dans la palette. On parle
// comme on parle en classe : « tu peux mettre cinq minutes, s'il te plaît ? » se comprend comme « minuteur cinq
// minutes ». Et ce qui est compris se montre sur le téléphone (`ceQuIlComprend`) : sans cela, on ne sait pas quoi
// dire.
//
// Une règle : la voix ne montre que ce qu'on peut montrer à la classe. Ni les élèves, ni le cahier journal et ses
// bilans, ni les réglages : ces pages ne s'ouvrent pas par la télécommande, et une note sur un élève s'écrit après
// un « oui » sur le téléphone, sans jamais s'afficher au tableau.

/** Une page de ⌘K que la voix peut ouvrir ; `rayon` : où « Que dire ? » la range (« CAA », « Fabriquer »). */
export interface Destination { label: string; to: string; page?: string; onglet?: string; rayon?: string }

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
  /** « Que dire ? », « aide » : ce que la télécommande comprend, en réponse. */
  | { genre: "aide" }
  /** Le minuteur en cours : en pause, repris, arrêté (remis à sa durée, l'affichage fermé), allongé ou raccourci. */
  | { genre: "minuteurPause" }
  | { genre: "minuteurReprendre" }
  | { genre: "minuteurArreter" }
  | { genre: "minuteurAjouter"; secondes: number }
  /** Ce qui est affiché : plus grand ou plus petit, plus bas ou plus haut ; et la page d'avant. */
  | { genre: "zoom"; sens: "plus" | "moins" | "normal" }
  | { genre: "defiler"; sens: "bas" | "haut" }
  | { genre: "retour" }
  /** Un élément de la classe — séquence, séance, jeu, outil, texte —, choisi par Mistral dans le catalogue. */
  | { genre: "ouvrir"; element: ElementDeLaClasse }
  | { genre: "rien"; pourquoi: string };

/**
 * Les pages de ⌘K telles que la voix les nomme : celles de la barre d'abord — à égalité, elles l'emportent —, puis
 * les sous-onglets, rangés comme dans la palette (« CAA », « Fabriquer »).
 */
export function destinationsDe(
  nav: { label: string; to: string }[],
  sousOnglets: { label: string; to: string; page: string; onglet: string; sous: string }[],
): Destination[] {
  return [
    ...nav.map((n) => ({ label: n.label, to: n.to })),
    ...sousOnglets.map((s) => ({ label: s.label, to: s.to, page: s.page, onglet: s.onglet, rayon: s.sous.split(" · ")[0] })),
  ];
}

/** Les pages qu'on peut montrer à la classe ; les autres ne s'ouvrent pas à la voix. */
const PAGES_DE_LA_CLASSE = new Set(["/jeux", "/caa", "/ressources", "/projets", "/ateliers", "/plan", "/referentiels"]);

/** Ce que la recherche trouve et qu'on peut montrer : ni un élève, ni une observation, ni un cahier journal. */
export const TROUVAILLES_DE_LA_CLASSE = new Set(["sequence", "seance", "atelier", "espace", "jeu", "outil", "texte", "materiel"]);

export const pourLaClasse = (d: Destination) => PAGES_DE_LA_CLASSE.has(d.to);

/** Le nom d'une page, tel qu'on le dit : sans ce qu'ajoutent la parenthèse ou les deux-points. */
export const nomDeLaPage = (label: string) => label.split(" (")[0].split(" : ")[0];

/** En minuscules, sans accents ni ponctuation, les blancs resserrés. */
export function plat(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[’'`´-]/g, " ").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Ce qu'on dit avant la commande, et qui ne la change pas : « alors », « tu peux », « je voudrais »… */
const AVANT = [
  "alors", "bon", "ok", "okay", "d accord", "euh", "heu", "eh", "et", "donc", "maintenant", "voila", "allez", "bien",
  "maitrize", "maitrise", "dis", "dis moi", "c est bon", "merci", "s il te plait", "s il vous plait", "stp", "svp",
  "tu peux", "tu pourrais", "tu veux bien", "peux tu", "pourrais tu", "vous pouvez", "pouvez vous", "vous pourriez",
  "pourriez vous", "est ce que tu peux", "est ce que tu pourrais", "est ce que vous pouvez", "est ce qu on peut",
  "je voudrais", "je veux", "j aimerais", "je souhaite", "on voudrait", "on veut", "on va", "on peut", "il faut",
  "il faudrait", "nous allons", "je vous", "on", "me", "m", "nous",
].sort((a, b) => b.length - a.length);
/** … et après : « s'il te plaît », « au tableau ». */
const APRES = [
  "s il te plait", "s il vous plait", "stp", "svp", "merci", "maintenant", "tout de suite", "voila",
  "au tableau", "sur le tableau", "a l ecran", "sur l ecran", "pour la classe", "pour les eleves", "pour tout le monde",
].sort((a, b) => b.length - a.length);

/**
 * La commande seule, d'une phrase déjà mise à plat : sans « alors », « tu peux », « s'il te plaît », et les sigles
 * épelés recollés — Whisper écrit « C.A.A. » aussi bien que « CAA ».
 */
export function epurer(p: string): string {
  let s = p.replace(/\b[a-z](?: [a-z]\b){2,}/g, (sigle) => sigle.replace(/ /g, ""));
  for (let encore = true; encore;) {
    encore = false;
    const avant = AVANT.find((f) => s === f || s.startsWith(f + " "));
    if (avant) { s = s.slice(avant.length).trim(); encore = true; }
    const apres = APRES.find((f) => s.endsWith(" " + f));
    if (apres) { s = s.slice(0, -apres.length).trim(); encore = true; }
  }
  return s;
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

/** La phrase n'est qu'une durée — « cinq minutes », « un quart d'heure » — : c'est le minuteur qu'on demande. */
function rienQuUneDuree(p: string): boolean {
  return enChiffres(p)
    .replace(/\b(\d+ )?quarts? d heure\b|\b(\d+ )?demi heure\b/g, " ")
    .replace(/\b\d+ ?(h|heures?|min|mn|minutes?|s|sec|secondes?)\b( et demie?)?( \d+\b)?/g, " ")
    .split(" ")
    .every((m) => !m || ["et", "de", "d", "pour", "pendant"].includes(m));
}

/** « 10 minutes », « 1 minute 30 », « 45 secondes ». */
export function dureeEnClair(secondes: number): string {
  const m = Math.floor(secondes / 60), s = secondes % 60;
  if (!m) return `${s} seconde${s > 1 ? "s" : ""}`;
  return `${m} minute${m > 1 ? "s" : ""}${s ? ` ${s}` : ""}`;
}

const VERBES = [
  "affiche", "afficher", "affiches", "affichez", "affichent", "la fiche", "l affiche", "montre", "montrer", "montres", "montrez", "ouvre", "ouvrir", "ouvres",
  "ouvrez", "lance", "lancer", "mets", "met", "mettre", "mettez", "remets", "remet", "va a", "va au", "va aux",
  "va sur", "va dans", "va voir", "aller a", "aller au", "aller sur", "passe a", "passe au", "passe aux", "passe sur",
  "passer a", "passer au", "passons a", "passons au", "retourne a", "retourne au", "retourne aux", "reviens a",
  "reviens au", "reviens aux", "revenir a", "retour a", "retour au", "retour aux", "presente", "fais voir",
  "fait voir", "voir", "regarde", "regarder", "regardez", "cherche", "chercher", "recherche", "trouve", "trouver",
  "fais apparaitre", "fait apparaitre", "projette", "projeter", "montre moi", "affiche moi", "montrez moi",
  "fais moi voir", "montre nous", "affiche nous", "ouvre moi", "mets moi", "mets nous", "lance moi", "demarre",
  "demarrer",
].sort((a, b) => b.length - a.length);
const DETERMINANTS = new Set([
  "le", "la", "les", "l", "un", "une", "des", "du", "de", "d", "au", "aux", "a", "en", "mon", "ma", "mes", "sur", "ce",
  "cet", "cette", "ces", "notre", "nos",
]);
/** Ce qui ne compte pas dans le nom d'une page, ni dans ce qu'on en dit : « la page des supports visuels ». */
const LIENS = new Set([...DETERMINANTS, "et", "ou", "pour", "avec", "par", "page", "pages", "onglet", "fenetre"]);

/** Sans le verbe d'affichage du début, s'il y en a un. */
function sansVerbe(p: string): { reste: string; verbe: boolean } {
  for (const v of VERBES) {
    if (p === v) return { reste: "", verbe: true };
    if (p.startsWith(v + " ")) return { reste: p.slice(v.length + 1), verbe: true };
  }
  // Un verbe à une lettre près : Whisper écrit « Alfiche », « Affriche ».
  const [premier, ...suite] = p.split(" ");
  if (suite.length && VERBES.some((v) => !v.includes(" ") && memeMot(premier, v))) return { reste: suite.join(" "), verbe: true };
  return { reste: p, verbe: false };
}

/** Les sortes de la recherche, telles qu'on les nomme. */
const SORTES_DITES: Record<string, string> = {
  sequence: "sequence", seance: "seance", jeu: "jeu", atelier: "atelier", espace: "espace", outil: "outil",
  fiche: "outil", texte: "texte", materiel: "materiel",
};
const PETITS_MOTS = new Set([...LIENS, "moi", "nous", "qui", "que"]);

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
  return p.split(" ").filter((m) => m && !LIENS.has(m)).map((m) => (m.length > 3 ? m.replace(/[sx]$/, "") : m));
}

/**
 * Un mot dit est-il ce mot du nom ? Le même, ou, pour un mot d'au moins cinq lettres, à une lettre près : Whisper
 * écrit « la prise » pour « la frise ».
 */
function memeMot(dit: string, mot: string): boolean {
  if (dit === mot) return true;
  if (dit.length < 5 || mot.length < 5 || Math.abs(dit.length - mot.length) > 1) return false;
  // Une lettre changée, ajoutée ou ôtée, pas plus.
  let i = 0;
  while (i < dit.length && dit[i] === mot[i]) i++;
  return dit.slice(i + 1) === mot.slice(i + 1) || dit.slice(i) === mot.slice(i + 1) || dit.slice(i + 1) === mot.slice(i);
}

/** Les noms d'une page : le sien, et ses sigles — « Tableaux de langage (TLA) » s'ouvre aussi par « TLA ». */
function nomsDeLaPage(label: string): string[] {
  const sigles = (/\(([^)]*)\)/.exec(label)?.[1] ?? "").split(/[\s,]+/).filter((m) => /^[A-Z]{2,6}$/.test(m));
  return [nomDeLaPage(label), ...sigles];
}

/** La page de ⌘K dont le nom est ce qu'on a dit : tous les mots dits y sont, et ils en font au moins la moitié. */
function destinationDite(reste: string, destinations: Destination[]): Destination | null {
  const dits = motsPleins(reste);
  if (!dits.length) return null;
  let meilleure: { d: Destination; score: number } | null = null;
  for (const d of destinations) {
    for (const [k, n] of nomsDeLaPage(d.label).entries()) {
      const nom = motsPleins(plat(n));
      if (!nom.length || !dits.every((m) => nom.some((n) => memeMot(m, n)))) continue;
      // À égalité, la page qui porte ce nom passe avant celle qui l'a pour sigle : « CAA » ouvre la CAA.
      const score = (dits.length / nom.length) * (k === 0 ? 1 : 0.99);
      if (score >= 0.5 && (!meilleure || score > meilleure.score)) meilleure = { d, score };
    }
  }
  return meilleure?.d ?? null;
}

const MOTS_DE_NOTE = new Set(["note", "noter", "notez", "notes", "observation", "observations"]);

/** Le prénom et le texte d'une note : « note pour [prénom] : a lu douze mots seul », « note que [prénom] a fini ». */
function noteDite(phrase: string, eleves: ContexteTelecommande["eleves"]): Compris {
  // Les mots, et où chacun finit : le texte de la note se reprend tel qu'il a été dit.
  const mots = [...phrase.matchAll(/[^\s'’-]+['’]?/g)].map((m) => ({ plat: plat(m[0]), fin: m.index + m[0].length }));
  // Le début : « alors », puis « note », « note pour », « noter à propos de », « note que »…
  let i = mots.findIndex((m) => MOTS_DE_NOTE.has(m.plat)) + 1;
  while (i < mots.length && ["pour", "a", "sur", "propos", "de", "d", "l", "eleve", "que", "qu", ""].includes(mots[i].plat)) i++;
  type Trouve = { eleve: ContexteTelecommande["eleves"][number]; fin: number };
  const trouves: Trouve[] = [];
  for (const e of eleves) {
    const nom = plat(e.nom).split(" ");
    // Le nom entier, sinon son début : « Marie-Paule », le prénom seul.
    for (let long = nom.length; long >= 1; long--) {
      const dit = mots.slice(i, i + long).map((m) => m.plat).join(" ");
      if (dit && dit === nom.slice(0, long).join(" ")) { trouves.push({ eleve: e, fin: i + long }); break; }
    }
  }
  if (!trouves.length) return { genre: "rien", pourquoi: "Je n'ai pas reconnu l'élève : dites « note pour », puis son prénom." };
  const plusLong = Math.max(...trouves.map((t) => t.fin));
  const retenus = trouves.filter((t) => t.fin === plusLong);
  if (retenus.length > 1) return { genre: "rien", pourquoi: `Plusieurs élèves s'appellent ${phrase.slice(mots[i - 1]?.fin ?? 0, mots[plusLong - 1].fin).trim()} : dites aussi le nom de famille.` };
  const texte = phrase.slice(mots[plusLong - 1].fin).replace(/^[:,;.\s–—-]+/, "").replace(/^(qu[ie]l?|que)\s+/i, "").trim();
  if (!texte) return { genre: "rien", pourquoi: "Que faut-il noter ?" };
  return { genre: "note", eleve: retenus[0].eleve, texte: texte.charAt(0).toUpperCase() + texte.slice(1) };
}

const QUE_DIRE = new RegExp("^(aide|aide moi|que dire|quoi dire|je dis quoi|qu est ce que (je|on) (peux|peut) dire|"
  + "qu est ce que je dis|qu est ce que tu (comprends|sais faire)|que sais tu faire|commandes|les commandes|liste|"
  + "la liste|liste des commandes)$");
const FERMER = /^(ferme|fermer|fermez|stop|stoppe|arrete|arreter|arretez|quitte|quitter|quittez|sors|sortir|sortez|enleve|enlever|enlevez|cache|cacher|termine|terminer|fini|c est fini|ca suffit)\b/;
const PAUSE = /^(pause|mets? (le minuteur |le chrono )?en pause|pause (le |du )?(minuteur|chrono))$|^(le )?(minuteur|chrono) en pause$/;
const REPRENDRE = /^(reprends?|reprendre|reprenez|continue|continuer|relance|relancer)( (le )?(minuteur|chrono))?$/;
const ARRETER = /^(arrete|arreter|arretez|stop|stoppe) (le |du )?(minuteur|chrono)$|^remets? (le )?(minuteur|chrono) a zero$/;
const PLUS = /^(ajoute|ajouter|rajoute|rajouter|encore|plus|prolonge|prolonger)\b|\bde plus$/;
const MOINS = /^(enleve|enlever|retire|retirer|moins|raccourcis|raccourcir)\b|\bde moins$/;
const ZOOM_PLUS = /^(zoom|zoome|zoomer|agrandis|agrandir|grossis|grossir|plus grand|en plus grand|en grand)$/;
const ZOOM_MOINS = /^(dezoom|dezoome|dezoomer|reduis|reduire|retrecis|plus petit|en plus petit|en petit)$/;
const ZOOM_NORMAL = /^(taille normale|zoom normal|taille reelle|(a la )?taille normale)$/;
const DESCENDRE = /^(descends|descend|descendre|descendez|defile|defiler|plus bas|vers le bas|en bas|page suivante|suivant)$/;
const MONTER = /^(monte|monter|remonte|remonter|montez|plus haut|vers le haut|en haut|page precedente)$/;
const RETOUR = /^(retour|reviens|revenir|reviens en arriere|retourne en arriere|en arriere|precedent|page d avant)$/;
const MINUTEUR = /\b(minuteur|chrono|chronometre|sablier|timer|compte a rebours|decompte)\b/;

/** Ce que la phrase demande. */
export function comprendre(phrase: string, ctx: ContexteTelecommande): Compris {
  const brut = plat(phrase);
  if (!brut) return { genre: "rien", pourquoi: "Je n'ai rien entendu." };
  const p = epurer(brut);
  if (!p) return { genre: "rien", pourquoi: "Que faut-il afficher ?" };
  if (QUE_DIRE.test(p)) return { genre: "aide" };
  // Une note d'abord : son texte peut dire une durée (« a travaillé dix minutes seul »).
  if (MOTS_DE_NOTE.has(p.split(" ")[0])) return noteDite(phrase, ctx.eleves);
  // Le minuteur en cours, ce qui est affiché, la page d'avant : des commandes brèves, comprises ici, sans attendre.
  if (PAUSE.test(p)) return { genre: "minuteurPause" };
  if (REPRENDRE.test(p)) return { genre: "minuteurReprendre" };
  if (ARRETER.test(p)) return { genre: "minuteurArreter" };
  const apresLeVerbe = sansVerbe(p).reste || p;
  if (ZOOM_PLUS.test(p) || ZOOM_PLUS.test(apresLeVerbe)) return { genre: "zoom", sens: "plus" };
  if (ZOOM_MOINS.test(p) || ZOOM_MOINS.test(apresLeVerbe)) return { genre: "zoom", sens: "moins" };
  if (ZOOM_NORMAL.test(p) || ZOOM_NORMAL.test(apresLeVerbe)) return { genre: "zoom", sens: "normal" };
  if (DESCENDRE.test(p)) return { genre: "defiler", sens: "bas" };
  if (MONTER.test(p)) return { genre: "defiler", sens: "haut" };
  if (RETOUR.test(p)) return { genre: "retour" };
  const minuteur = MINUTEUR.test(p);
  let duree = dureeDite(p);
  // « Ajoute deux minutes », « deux minutes de moins » : le minuteur en cours.
  if (duree !== null && PLUS.test(p)) return { genre: "minuteurAjouter", secondes: duree };
  if (duree !== null && MOINS.test(p)) return { genre: "minuteurAjouter", secondes: -duree };
  // « Minuteur dix » : des minutes.
  const nombre = minuteur && duree === null ? /\b(\d+)\b/.exec(enChiffres(p)) : null;
  if (nombre && Number(nombre[1]) >= 1 && Number(nombre[1]) <= 180) duree = Number(nombre[1]) * 60;
  if (duree !== null && (minuteur || /^(lance|lancer|mets|met|mettre|remets|demarre|demarrer)\b/.test(p) || rienQuUneDuree(p))) {
    return { genre: "minuteur", secondes: duree };
  }
  if (/\bplein ecran\b/.test(p)) return { genre: "pleinEcran", actif: !/\b(quitte|quitter|sors|sortir|ferme|fermer|enleve|enlever|arrete|arreter|sans|plus)\b/.test(p) };
  const { reste, verbe } = sansVerbe(p);
  if (!reste) return { genre: "rien", pourquoi: "Que faut-il afficher ?" };
  const destination = destinationDite(reste, ctx.destinations.filter(pourLaClasse));
  if (destination) return { genre: "aller", destination };
  if (!verbe && FERMER.test(p) && p.split(" ").length <= 5) return { genre: "fermer" };
  // Un seul mot, à une lettre de « ferme » ou d'« arrête » : « Femme ».
  if (!p.includes(" ") && ["ferme", "fermer", "arrete", "quitte", "termine", "enleve"].some((f) => memeMot(p, f))) return { genre: "fermer" };
  if (minuteur) return { genre: "rien", pourquoi: "Combien de minutes ? Dites par exemple « minuteur cinq minutes »." };
  const cherche = aChercher(reste);
  if (!cherche.quoi) return { genre: "rien", pourquoi: "Que faut-il afficher ?" };
  return { genre: "chercher", ...cherche };
}

/** Le réglage : « oui », le téléphone écoute d'abord en direct chez Mistral (Voxtral Realtime), puis sur le Mac. */
export const CLE_TEMPS_REEL = "telecommande:realtime";

/** Le modèle qui lit les phrases complexes et celles que la télécommande n'a pas comprises (essai du 25 octobre). */
export const MODELE_DE_SECOURS = "ministral-14b-latest";

/** Le réglage : « oui », Mistral lit les phrases complexes et celles qui ne sont pas comprises. */
export const CLE_SECOURS = "telecommande:mistral";

/** Ce que la voix peut ouvrir par son titre ; `ref` : son nom court (« s12 »), que Mistral rend au lieu du titre. */
export interface ElementDeLaClasse {
  ref: string;
  sorte: "sequence" | "seance" | "jeu" | "outil" | "texte";
  id: string;
  titre: string;
  /** Ce que Mistral en lit : sa sorte, son titre — prénoms masqués —, sa séquence, « aujourd'hui ». */
  libelle: string;
}

export interface ListesDeLaClasse {
  sequences: { id: string; titre: string }[];
  seances: { id: string; titre: string; numero: number; date: string | null; sequenceId: string | null }[];
  jeux: { id: string; titre: string }[];
  outils: { id: string; titre: string }[];
  textes: { id: string; titre: string }[];
}

/** Les prénoms de la classe, masqués : un titre qui en porte un ne le donne pas à Mistral. */
export function masquerLesPrenoms(texte: string, eleves: { nom: string }[]): string {
  const prenoms = new Set(eleves.flatMap((e) => plat(e.nom).split(" ")).filter((m) => m.length >= 2));
  return texte.replace(/[\p{L}][\p{L}'’-]*/gu, (mot) => (prenoms.has(plat(mot)) ? "[élève]" : mot));
}

/**
 * Ce que la voix peut ouvrir, pour Mistral : les séquences, leurs séances (« aujourd'hui » pour celles du jour), les
 * jeux, les outils et les textes de la classe, chacun avec un nom court. Ni élève, ni cahier journal : rien de ce
 * qu'on ne montre pas au tableau.
 */
export function catalogue(listes: ListesDeLaClasse, eleves: { nom: string }[], aujourdhui: string): ElementDeLaClasse[] {
  const m = (t: string) => masquerLesPrenoms(t.trim() || "sans titre", eleves);
  const sequences = new Map(listes.sequences.map((q) => [q.id, q.titre]));
  const elements: ElementDeLaClasse[] = [];
  listes.sequences.forEach((q, i) => elements.push({ ref: `q${i + 1}`, sorte: "sequence", id: q.id, titre: q.titre, libelle: `séquence « ${m(q.titre)} »` }));
  listes.seances.forEach((s, i) => {
    const seq = s.sequenceId ? sequences.get(s.sequenceId) : undefined;
    const libelle = `séance ${s.numero || ""} « ${m(s.titre)} »${seq ? ` (séquence « ${m(seq)} »)` : ""}${s.date?.startsWith(aujourdhui) ? " — aujourd'hui" : ""}`;
    elements.push({ ref: `s${i + 1}`, sorte: "seance", id: s.id, titre: s.titre, libelle: libelle.replace("séance  ", "séance ") });
  });
  listes.jeux.forEach((j, i) => elements.push({ ref: `j${i + 1}`, sorte: "jeu", id: j.id, titre: j.titre, libelle: `jeu « ${m(j.titre)} »` }));
  listes.outils.forEach((o, i) => elements.push({ ref: `o${i + 1}`, sorte: "outil", id: o.id, titre: o.titre, libelle: `outil « ${m(o.titre)} »` }));
  listes.textes.forEach((t, i) => elements.push({ ref: `t${i + 1}`, sorte: "texte", id: t.id, titre: t.titre, libelle: `texte « ${m(t.titre)} »` }));
  return elements;
}

/**
 * Une phrase qui demande plusieurs choses ou les relie (« lance dix minutes et affiche la carte mentale ») : Mistral la
 * lit d'abord, avec le catalogue entier. Le « et » d'une durée (« et demie ») ou d'un nom de page ne compte pas.
 */
export function estComplexe(phrase: string, destinations: Destination[]): boolean {
  let p = ` ${epurer(plat(phrase))} `;
  for (const d of destinations) for (const n of nomsDeLaPage(d.label)) p = p.replace(` ${plat(n)} `, " page ");
  p = p.replace(/ et (demie?|quart|un|une) /g, " ");
  return / (et|puis|ensuite|apres|avant|pendant|en meme temps|aussi) /.test(p) && p.trim().split(" ").length >= 4;
}

/**
 * Ce qu'on dit à Mistral : toutes les actions possibles, chacune avec sa forme exacte ; les pages de la classe ; ce
 * que la voix peut ouvrir (`catalogue`) ; et ce qui est en cours. Rien d'autre de la classe. Sa réponse ne vaut
 * qu'une fois relue par `lireLesActions`.
 */
export function consigneDeMistral(destinations: Destination[], elements: ElementDeLaClasse[], etat: string): string {
  const pages = [...new Set(destinations.filter(pourLaClasse).map((d) => nomDeLaPage(d.label)))];
  return `Tu es la télécommande vocale d'une classe : l'enseignant parle à son téléphone, et le Mac, projeté au tableau, affiche. Tu reçois la transcription de ce qu'il a dit ; elle peut contenir des fautes d'écoute. Réponds uniquement par un objet JSON {"actions":[…]} : les actions demandées, dans l'ordre où les faire — une seule, le plus souvent.

Actions possibles, et aucune autre :
- {"action":"minuteur","secondes":N} — lancer un minuteur et l'afficher en grand. « deux minutes trente » = 150 ; « un quart d'heure » = 900.
- {"action":"minuteur_pause"}, {"action":"minuteur_reprendre"}, {"action":"minuteur_arreter"} — le minuteur en cours.
- {"action":"minuteur_ajouter","secondes":N} — du temps en plus au minuteur en cours ; N négatif pour en enlever.
- {"action":"page","page":"NOM"} — afficher une page de la liste PAGES, par son nom exact.
- {"action":"ouvrir","ref":"RÉF"} — afficher un élément de la liste ÉLÉMENTS, par sa référence.
- {"action":"chercher","quoi":"MOTS"} — afficher ce qui n'est dans aucune des deux listes, par les mots qui le nomment.
- {"action":"plein_ecran","actif":true} ou {"action":"plein_ecran","actif":false}
- {"action":"fermer"} — fermer ce qui est affiché en grand.
- {"action":"zoom","sens":"plus"}, {"action":"zoom","sens":"moins"}, {"action":"zoom","sens":"normal"} — tout afficher plus grand, plus petit, ou à la taille normale.
- {"action":"defiler","sens":"bas"} ou {"action":"defiler","sens":"haut"} — faire défiler la page affichée.
- {"action":"retour"} — revenir à la page d'avant.
- {"action":"note","eleve":"PRÉNOM","texte":"TEXTE"} — noter une observation sur un élève ; rien ne s'affiche.
- {"action":"aide"} — l'enseignant demande ce qu'il peut dire.
Si la phrase ne demande rien de tout cela : {"actions":[]}.

En ce moment : ${etat}

PAGES : ${pages.join(" ; ")}.

ÉLÉMENTS :
${elements.map((e) => `${e.ref} : ${e.libelle}`).join("\n") || "(aucun)"}

Règles :
- Fais les actions dans l'ordre de la phrase.
- « Minuteur N minutes », « lance N minutes », « un sablier de N minutes » : un nouveau minuteur, qui remplace celui en cours (pas de minuteur_arreter avant). minuteur_ajouter seulement si l'enseignant dit d'ajouter ou d'enlever du temps : « ajoute », « rajoute », « encore », « de plus », « enlève », « de moins ».
- « Zoome », « agrandis », « plus grand », « en grand » : zoom plus ; « plus petit », « réduis » : zoom moins ; « taille normale » : zoom normal.
- Un mot peut être mal entendu : « Calfiche » pour « Affiche », « la prise » pour « la frise ». Choisis ce qui ressemble à l'oreille à un nom des listes.
- N'ouvre un élément que si son titre correspond vraiment à ce qui est dit ; sinon, « chercher » avec les mots dits. N'invente jamais une page ni une référence absente des listes.
- « La séance d'aujourd'hui » : celle marquée « aujourd'hui ». ${elements.some((e) => e.libelle.endsWith("aujourd'hui")) ? "" : "Aujourd'hui, aucune séance n'est prévue : n'en choisis aucune pour elle."}

Exemples :
- « Lance dix minutes et affiche la carte mentale » → {"actions":[{"action":"minuteur","secondes":600},{"action":"page","page":"Carte mentale"}]}
- « Reviens en arrière et zoome » → {"actions":[{"action":"retour"},{"action":"zoom","sens":"plus"}]}
- « Encore deux minutes » → {"actions":[{"action":"minuteur_ajouter","secondes":120}]}
- « Ouvre la séquence sur les volcans », absente des ÉLÉMENTS → {"actions":[{"action":"chercher","quoi":"volcans"}]}`;
}

/** L'élève que Mistral a nommé : son nom entier ou son prénom, et un seul élève de la classe. */
function eleveNomme(nom: string, eleves: ContexteTelecommande["eleves"]): ContexteTelecommande["eleves"][number] | null {
  const dit = plat(nom);
  if (!dit) return null;
  const entiers = eleves.filter((e) => plat(e.nom) === dit);
  const retenus = entiers.length ? entiers : eleves.filter((e) => plat(e.nom).split(" ")[0] === dit);
  return retenus.length === 1 ? retenus[0] : null;
}

/** Une action de Mistral, relue ; rien si elle sort de ce qui est permis. */
function lireUneAction(j: Record<string, unknown>, ctx: ContexteTelecommande, elements: ElementDeLaClasse[]): Compris | null {
  const secondes = Math.round(Number(j.secondes));
  switch (j?.action) {
    case "minuteur":
      return secondes >= 5 && secondes <= 3 * 3600 ? { genre: "minuteur", secondes } : null;
    case "minuteur_pause": return { genre: "minuteurPause" };
    case "minuteur_reprendre": return { genre: "minuteurReprendre" };
    case "minuteur_arreter": return { genre: "minuteurArreter" };
    case "minuteur_ajouter":
      return secondes !== 0 && Math.abs(secondes) <= 3 * 3600 ? { genre: "minuteurAjouter", secondes } : null;
    case "page": {
      const d = ctx.destinations.filter(pourLaClasse).find((x) => nomDeLaPage(x.label) === j.page);
      return d ? { genre: "aller", destination: d } : null;
    }
    case "ouvrir": {
      const e = elements.find((x) => x.ref === j.ref);
      return e ? { genre: "ouvrir", element: e } : null;
    }
    case "plein_ecran":
      return { genre: "pleinEcran", actif: j.actif !== false };
    case "fermer":
      return { genre: "fermer" };
    case "zoom":
      return j.sens === "plus" || j.sens === "moins" || j.sens === "normal" ? { genre: "zoom", sens: j.sens } : null;
    case "defiler":
      return j.sens === "bas" || j.sens === "haut" ? { genre: "defiler", sens: j.sens } : null;
    case "retour":
      return { genre: "retour" };
    case "chercher": {
      // Des mots qui nomment une page de la classe — « frise » — l'ouvrent, comme dits à la télécommande.
      const quoi = plat(String(j.quoi ?? ""));
      const d = quoi ? destinationDite(quoi, ctx.destinations.filter(pourLaClasse)) : null;
      if (d) return { genre: "aller", destination: d };
      const c = aChercher(quoi);
      return c.quoi ? { genre: "chercher", ...c } : null;
    }
    case "note": {
      const eleve = eleveNomme(String(j.eleve ?? ""), ctx.eleves);
      const texte = String(j.texte ?? "").trim();
      return eleve && texte ? { genre: "note", eleve, texte: texte.charAt(0).toUpperCase() + texte.slice(1) } : null;
    }
    case "aide":
      return { genre: "aide" };
    default:
      return null;
  }
}

/** Les mots qui ne nomment rien : la sorte, les verbes, les rangs. Un élément ne s'ouvre pas sur eux seuls. */
const MOTS_QUI_NE_NOMMENT_RIEN = new Set([
  "sequence", "seance", "seances", "sequences", "jeu", "jeux", "outil", "outils", "texte", "textes", "fiche", "page",
  "ouvre", "ouvrir", "affiche", "afficher", "montre", "montrer", "lance", "mets", "premiere", "premier", "deuxieme",
  "second", "seconde", "troisieme", "quatrieme", "cinquieme", "derniere", "dernier", "suivante", "classe", "ecran", "plein",
]);

/**
 * La phrase nomme-t-elle bien cet élément ? Un de ses mots pleins — à une lettre près — est dans ce que Mistral en a
 * lu. Sans cela, Mistral aurait pris ce qui ressemblait le moins mal : mieux vaut ne rien ouvrir.
 */
function phraseNomme(phrase: string, e: ElementDeLaClasse): boolean {
  const dits = plat(phrase).split(" ").filter((m) => m.length >= 4 && !MOTS_QUI_NE_NOMMENT_RIEN.has(m)).map((m) => m.replace(/[sx]$/, ""));
  const libelle = plat(e.libelle).split(" ").map((m) => m.replace(/[sx]$/, ""));
  return dits.some((d) => libelle.some((l) => d === l || memeMot(d, l)));
}

/** Au plus quatre actions d'une phrase : au-delà, ce n'est plus une commande. */
const ACTIONS_MAX = 4;

/**
 * La réponse de Mistral, relue : des actions connues, des pages de la classe — jamais une autre —, des éléments du
 * catalogue, un élève de la classe, des durées possibles. Ce qui sort de là tombe ; rien de valable, rien du tout.
 * La règle du tableau se tient ici, et non dans la consigne.
 */
export function lireLesActions(reponse: string, ctx: ContexteTelecommande, elements: ElementDeLaClasse[], phrase: string): Compris[] | null {
  let j: unknown;
  try {
    j = JSON.parse(reponse.trim().replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    return null;
  }
  const brutes = Array.isArray((j as { actions?: unknown })?.actions) ? (j as { actions: unknown[] }).actions
    : (j as { action?: unknown })?.action ? [j] : [];
  const lues = brutes.slice(0, ACTIONS_MAX)
    .map((a) => (a && typeof a === "object" ? lireUneAction(a as Record<string, unknown>, ctx, elements) : null))
    .filter((c): c is Compris => c !== null && (c.genre !== "ouvrir" || phraseNomme(phrase, c.element)));
  return lues.length ? lues : null;
}

/**
 * Ce que Whisper lit avant chaque commande, comme s'il venait de l'entendre : des commandes, les pages qu'on nomme le
 * plus, puis les prénoms de la classe pour « note pour… ». Sans cela, il invente sur deux mots (« Plein écran »
 * devenait « Médical »). L'ordinateur n'en garde que les premières phrases qui tiennent (whisper_embarque.rs) : le
 * plus utile d'abord, et les prénoms par petits groupes, pour qu'une grande classe ne les perde pas tous.
 */
export function inviteDeLaVoix(eleves: { nom: string }[]): string {
  const prenoms = [...new Set(eleves.map((e) => e.nom.trim().split(/\s+/)[0]).filter(Boolean))];
  const groupes: string[] = [];
  for (let i = 0; i < prenoms.length; i += 6) {
    const g = prenoms.slice(i, i + 6);
    groupes.push(`Note pour ${g.length > 1 ? `${g.slice(0, -1).join(", ")} et ${g[g.length - 1]}` : g[0]}.`);
  }
  return [
    "Minuteur cinq minutes.", "Plein écran.", "Ferme.", "Affiche les supports visuels.", "Montre la carte mentale.",
    "Ouvre le tableau de jetons, le d'abord ensuite, les TLA, la CAA.", ...groupes,
  ].join(" ");
}

/** Une sorte de phrases que la télécommande comprend, avec des exemples ; `aToucher` : toucher un exemple l'envoie. */
export interface Groupe { titre: string; exemples: string[]; aToucher: boolean }

/** Les rayons montrés d'abord : ce qu'on affiche le plus à la classe ; les pages elles-mêmes, à la fin. */
const RAYONS_D_ABORD = ["CAA", "Fabriquer"];
const PAGES = "Les pages";
const rang = (rayon: string) => (rayon === PAGES ? 99 : RAYONS_D_ABORD.includes(rayon) ? RAYONS_D_ABORD.indexOf(rayon) : 50);

/**
 * Ce que la télécommande comprend, pour le montrer sur le téléphone : des phrases à dire, et toutes les pages qu'on
 * peut ouvrir, par leur nom. Chaque exemple à toucher se comprend tel quel (essai dans telecommande.test.ts).
 */
export function ceQuIlComprend(destinations: Destination[]): Groupe[] {
  const rayons = new Map<string, string[]>();
  for (const d of destinations.filter(pourLaClasse)) {
    const rayon = d.rayon ?? PAGES;
    const noms = rayons.get(rayon) ?? [];
    const nom = nomDeLaPage(d.label);
    if (!noms.includes(nom)) noms.push(nom);
    rayons.set(rayon, noms);
  }
  return [
    { titre: "Minuteur", exemples: ["Minuteur cinq minutes", "Un quart d'heure", "Pause", "Reprends", "Ajoute deux minutes", "Enlève une minute", "Arrête le minuteur"], aToucher: true },
    { titre: "Écran", exemples: ["Plein écran", "Quitte le plein écran", "Ferme", "Plus grand", "Plus petit", "Taille normale", "Descends", "Remonte", "Retour"], aToucher: true },
    ...[...rayons.keys()].sort((a, b) => rang(a) - rang(b)).map((titre) => ({ titre, exemples: rayons.get(titre)!, aToucher: true })),
    { titre: "Chercher par son nom", exemples: ["Affiche la séquence sur les fractions", "Montre le jeu des animaux de la ferme"], aToucher: false },
    { titre: "Noter, sans rien afficher", exemples: ["Note pour [prénom] : a lu douze mots seul"], aToucher: false },
    {
      titre: "Plusieurs choses à la fois (avec Mistral)",
      exemples: ["Lance dix minutes et affiche la carte mentale", "Ouvre la séance d'aujourd'hui en plein écran", "Montre la frise, puis plus grand"],
      aToucher: false,
    },
  ];
}
