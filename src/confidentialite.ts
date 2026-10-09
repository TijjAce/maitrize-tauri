// Noms des élèves masqués avant tout envoi d'un texte libre à l'IA.
//
// Règle de l'application : aucune donnée nominative sur les élèves ne part
// vers un service extérieur. Un texte rédigé par l'enseignant en contient
// pourtant souvent (« Apolline a lu seule »). On remplace donc chaque nom
// connu par un marqueur neutre — [P1], [P2]… — et l'on remet les vrais noms
// dans la réponse, sur la machine.
//
// Un nom se reconnaît sans tenir compte des majuscules ni des accents :
// « apolline », « Ines » pour Inès. Masquer un mot de trop ne coûte rien —
// le mot d'origine revient à sa place au retour —, en laisser passer un
// laisse partir un prénom. Deux exceptions : les particules des noms de
// famille (« Le » de Le Gall) ne sont jamais masquées seules, et un prénom
// qui est aussi un mot courant (« rose », « petit ») ne l'est qu'avec sa
// majuscule.
//
// Pas de recherche en arrière (lookbehind) dans les expressions régulières :
// les webviews de macOS 11 ne la connaissent pas, et l'appel planterait.

export interface Remplacement { marqueur: string; original: string }

const LETTRE = /[\p{L}\p{N}]/u;

/** Le texte en minuscules sans accents, lettre pour lettre : les positions restent celles du texte. */
function plier(texte: string): string {
  let sortie = "";
  for (const c of texte) {
    const p = c.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("fr");
    sortie += p.length === c.length ? p : c;
  }
  return sortie;
}

/** Les particules des noms de famille : jamais masquées seules, le nom complet l'est. */
const PARTICULES = new Set([
  "le", "la", "les", "de", "du", "des", "van", "von", "der", "den", "ter", "el", "al", "ben", "bin", "da", "di", "do", "dos", "das",
  "mac", "mc", "saint", "sainte", "st", "ste", "et",
]);

/** Des prénoms ou des noms qui sont aussi des mots de tous les jours : masqués seulement avec leur majuscule. */
const MOTS_COURANTS = new Set([
  "rose", "pierre", "jade", "ambre", "olive", "prune", "violette", "capucine", "perle", "aurore", "constance", "clemence", "victoire",
  "blanche", "celeste", "flore", "fleur", "iris", "lilas", "myrtille", "marguerite", "camelia", "dahlia", "eglantine", "garance", "lys",
  "marine", "marin", "jean", "noel", "ange", "juste", "avril", "mai", "france", "aime", "desire", "modeste", "candide", "auguste", "sage",
  "olivier", "laurier", "martin", "petit", "petite", "grand", "grande", "blanc", "noir", "brun", "roux", "bonnet", "berger",
  "boucher", "boulanger", "chevalier", "meunier", "marchand", "fontaine", "riviere", "bois", "jardin", "moulin", "pont", "lac", "roche",
  "rocher", "champ", "prince", "roi", "comte", "duc", "pape", "renard", "lapin", "mouton", "loup", "poisson", "merle", "pinson", "pigeon",
  "faucon", "lion", "bon", "bonne", "joli", "doux", "gros", "court", "long",
]);

/** Les formes sous lesquelles un élève peut être nommé : nom complet, puis chaque mot qui n'est pas une particule. */
function formes(nom: string): string[] {
  const propre = nom.trim().replace(/\s+/g, " ");
  if (!propre) return [];
  const lettres = (m: string) => m.replace(/[^\p{L}]/gu, "");
  const mots = propre.split(" ").filter((m) => lettres(m).length >= 2 && !PARTICULES.has(plier(lettres(m))));
  return [propre, ...mots];
}

/**
 * Toutes les occurrences de `mot` en mot entier, sans tenir compte des
 * majuscules ni des accents — sauf pour un mot courant, qui doit porter sa
 * majuscule : « Rose » est une élève, « rose » une couleur.
 */
function occurrences(texte: string, mot: string): number[] {
  const res: number[] = [];
  const bas = plier(texte);
  const cible = plier(mot);
  const courant = !cible.includes(" ") && MOTS_COURANTS.has(cible);
  let i = bas.indexOf(cible);
  while (i >= 0) {
    const avant = i > 0 ? texte[i - 1] : "";
    const apres = texte[i + cible.length] ?? "";
    const initiale = texte[i];
    const majuscule = initiale === initiale.toLocaleUpperCase("fr") && initiale !== initiale.toLocaleLowerCase("fr");
    if (!LETTRE.test(avant) && !LETTRE.test(apres) && (!courant || majuscule)) res.push(i);
    i = bas.indexOf(cible, i + 1);
  }
  return res;
}

/** Ce qui s'écrit avec une majuscule sans être le nom d'une personne : titres, fonctions, sigles. */
const PAS_DES_NOMS = new Set([
  "m", "mme", "mmes", "mlle", "madame", "monsieur", "mademoiselle", "docteur", "dr", "pr", "professeur", "maitre", "maitresse",
  "directeur", "directrice", "direction", "coordination", "chef", "service", "secretariat", "classe", "atelier", "bureau", "poste",
  "aesh", "atsem", "avs", "ulis", "ime", "sessad", "mdph", "cmp", "cmpp", "camsp", "ess", "pps", "pai", "pap", "ppre", "ppi", "erseh",
  "rased", "ien", "cpc", "cpd", "enseignant", "enseignante", "referent", "referente", "educateur", "educatrice", "psychologue",
  "orthophoniste", "psychomotricien", "psychomotricienne", "ergotherapeute", "infirmier", "infirmiere", "medecin", "maman", "papa",
  "mere", "pere", "famille", "parents", "parent", "grand", "grands", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche",
]);

/**
 * Les noms de personnes dans un texte libre — les contacts de l'établissement,
 * les participants d'une réunion : les mots à majuscule qui ne sont ni un
 * titre ni une fonction. Un mot de trop se masque sans dommage ; un nom oublié
 * partirait.
 */
export function nomsDansUnTexte(texte: string): string[] {
  const noms = new Set<string>();
  for (const mot of texte.normalize("NFC").match(/[\p{L}][\p{L}'’-]*/gu) ?? []) {
    const initiale = mot[0];
    const lettres = mot.replace(/[^\p{L}]/gu, "");
    if (lettres.length < 2 || initiale === initiale.toLocaleLowerCase("fr")) continue;
    if (PAS_DES_NOMS.has(plier(lettres))) continue;
    noms.add(mot.replace(/['’-]+$/u, ""));
  }
  return [...noms];
}

/** Remplace les noms des élèves par des marqueurs. */
export function pseudonymiser(texte: string, noms: string[]): { texte: string; table: Remplacement[] } {
  const variantes = [...new Set(noms.flatMap(formes))].sort((a, b) => b.length - a.length);
  const table: Remplacement[] = [];
  const parOriginal = new Map<string, string>();
  // Les lettres accentuées en un seul caractère : les positions du texte plié sont celles du texte.
  let sortie = texte.normalize("NFC");
  for (const v of variantes) {
    const pos = occurrences(sortie, v);
    if (!pos.length) continue;
    // De la fin vers le début : les positions restent valables pendant le remplacement.
    for (const p of pos.reverse()) {
      const original = sortie.slice(p, p + v.length);
      let marqueur = parOriginal.get(original);
      if (!marqueur) {
        marqueur = `[P${table.length + 1}]`;
        parOriginal.set(original, marqueur);
        table.push({ marqueur, original });
      }
      sortie = sortie.slice(0, p) + marqueur + sortie.slice(p + v.length);
    }
  }
  // Numérotation dans l'ordre de lecture : [P1] est le premier nom rencontré.
  const ordre = new Map<string, string>();
  for (const m of sortie.match(/\[P\d+\]/g) ?? []) {
    if (!ordre.has(m)) ordre.set(m, `[P${ordre.size + 1}]`);
  }
  return {
    texte: sortie.replace(/\[P\d+\]/g, (m) => ordre.get(m) ?? m),
    table: table.map((r) => ({ ...r, marqueur: ordre.get(r.marqueur) ?? r.marqueur }))
      .sort((x, y) => Number(x.marqueur.slice(2, -1)) - Number(y.marqueur.slice(2, -1))),
  };
}

/** Ce qui sépare les textes masqués ensemble : aucun nom ne le contient. */
const SEPARE = "\u0000";

/**
 * Masque plusieurs textes d'un seul tenant — les messages d'une conversation,
 * une question et son contexte : un même nom porte le même marqueur partout,
 * et la réponse se restaure avec une seule table.
 */
export function pseudonymiserTout(textes: string[], noms: string[]): { textes: string[]; table: Remplacement[] } {
  const { texte, table } = pseudonymiser(textes.join(SEPARE), noms);
  const parts = texte.split(SEPARE);
  return { textes: textes.map((t, i) => parts[i] ?? t), table };
}

/** Remet les vrais noms. `absents` : marqueurs disparus de la réponse. */
export function restaurer(texte: string, table: Remplacement[]): { texte: string; absents: string[] } {
  const absents = table.filter((r) => !texte.includes(r.marqueur)).map((r) => r.original);
  const parMarqueur = new Map(table.map((r) => [r.marqueur, r.original]));
  const sortie = texte.replace(/\[P(\d+)\]/g, (m) => parMarqueur.get(m) ?? m);
  return { texte: sortie, absents };
}
