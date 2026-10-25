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
const FERMER = /^(ferme|fermer|fermez|stop|stoppe|arrete|arreter|arretez|quitte|quitter|quittez|sors|sortir|sortez|enleve|enlever|enlevez|cache|cacher|termine|terminer|fini|c est fini|ca suffit|retour)\b/;
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
  const minuteur = MINUTEUR.test(p);
  let duree = dureeDite(p);
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

/** Le modèle qui lit, en secours, une phrase que la télécommande n'a pas comprise (essai du 25 octobre : le plus juste). */
export const MODELE_DE_SECOURS = "ministral-14b-latest";

/** Le réglage : « oui », Mistral lit les phrases incomprises. */
export const CLE_SECOURS = "telecommande:mistral";

/**
 * Ce qu'on dit à Mistral quand la télécommande n'a pas compris : les actions possibles et les pages de la classe,
 * par leur nom — ni les élèves, ni rien d'autre de la classe. Sa réponse ne vaut qu'une fois relue par `lireLeSecours`.
 */
export function consigneDuSecours(destinations: Destination[]): string {
  const pages = [...new Set(destinations.filter(pourLaClasse).map((d) => nomDeLaPage(d.label)))];
  return `Tu es la télécommande vocale d'une classe : l'enseignant parle à son téléphone, et le Mac, projeté au tableau, affiche. Tu reçois la transcription de ce qu'il a dit ; elle peut contenir des fautes d'écoute. Choisis l'action demandée et réponds uniquement par un objet JSON, sans texte autour.

Actions :
- {"action":"minuteur","secondes":N} — lancer un minuteur. « deux minutes trente » = 150 ; « un quart d'heure » = 900.
- {"action":"page","page":"NOM"} — afficher une page ; NOM est exactement un nom de la liste ci-dessous.
- {"action":"plein_ecran","actif":true} ou {"action":"plein_ecran","actif":false}
- {"action":"fermer"} — fermer ce qui est affiché.
- {"action":"chercher","quoi":"MOTS"} — afficher une séquence, une séance, un jeu, un atelier ou un texte nommés dans la phrase et absents de la liste ; MOTS : les mots qui le nomment.
- {"action":"note","eleve":"PRÉNOM","texte":"TEXTE"} — noter une observation sur un élève, sans rien afficher.
- {"action":"aide"} — l'enseignant demande ce qu'il peut dire.
- {"action":"rien","pourquoi":"…"} — la phrase ne demande rien de tout cela.

Pages : ${pages.join(" ; ")}.

Si un mot ressemble à l'oreille au nom d'une page (« la prise » pour « la frise »), choisis cette page. N'invente jamais une page hors de la liste.`;
}

/** L'élève que Mistral a nommé : son nom entier ou son prénom, et un seul élève de la classe. */
function eleveNomme(nom: string, eleves: ContexteTelecommande["eleves"]): ContexteTelecommande["eleves"][number] | null {
  const dit = plat(nom);
  if (!dit) return null;
  const entiers = eleves.filter((e) => plat(e.nom) === dit);
  const retenus = entiers.length ? entiers : eleves.filter((e) => plat(e.nom).split(" ")[0] === dit);
  return retenus.length === 1 ? retenus[0] : null;
}

/**
 * La réponse de Mistral, relue : une action connue, une page de la classe — jamais une autre —, un élève de la
 * classe, une durée possible ; sinon rien. La règle du tableau se tient ici, et non dans la consigne.
 */
export function lireLeSecours(reponse: string, ctx: ContexteTelecommande): Compris | null {
  let j: { action?: string; secondes?: unknown; page?: unknown; actif?: unknown; quoi?: unknown; eleve?: unknown; texte?: unknown };
  try {
    j = JSON.parse(reponse.trim().replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    return null;
  }
  switch (j?.action) {
    case "minuteur": {
      const secondes = Math.round(Number(j.secondes));
      return secondes >= 5 && secondes <= 3 * 3600 ? { genre: "minuteur", secondes } : null;
    }
    case "page": {
      const d = ctx.destinations.filter(pourLaClasse).find((x) => nomDeLaPage(x.label) === j.page);
      return d ? { genre: "aller", destination: d } : null;
    }
    case "plein_ecran":
      return { genre: "pleinEcran", actif: j.actif !== false };
    case "fermer":
      return { genre: "fermer" };
    case "chercher": {
      const c = aChercher(plat(String(j.quoi ?? "")));
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
    { titre: "Minuteur", exemples: ["Minuteur cinq minutes", "Minuteur deux minutes trente", "Un quart d'heure"], aToucher: true },
    { titre: "Écran", exemples: ["Plein écran", "Quitte le plein écran", "Ferme"], aToucher: true },
    ...[...rayons.keys()].sort((a, b) => rang(a) - rang(b)).map((titre) => ({ titre, exemples: rayons.get(titre)!, aToucher: true })),
    { titre: "Chercher par son nom", exemples: ["Affiche la séquence sur les fractions", "Montre le jeu des animaux de la ferme"], aToucher: false },
    { titre: "Noter, sans rien afficher", exemples: ["Note pour [prénom] : a lu douze mots seul"], aToucher: false },
  ];
}
