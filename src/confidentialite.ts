// Noms des élèves masqués avant tout envoi d'un texte libre à l'IA.
//
// Règle de l'application : aucune donnée nominative sur les élèves ne part
// vers un service extérieur. Un texte rédigé par l'enseignant en contient
// pourtant souvent (« Apolline a lu seule »). On remplace donc chaque nom
// connu par un marqueur neutre — [P1], [P2]… — et l'on remet les vrais noms
// dans la réponse, sur la machine.
//
// Pas de recherche en arrière (lookbehind) dans les expressions régulières :
// les webviews de macOS 11 ne la connaissent pas, et l'appel planterait.

export interface Remplacement { marqueur: string; original: string }

const LETTRE = /[\p{L}\p{N}]/u;

/** Les formes sous lesquelles un élève peut être nommé : nom complet, puis chaque mot. */
function formes(nom: string): string[] {
  const propre = nom.trim().replace(/\s+/g, " ");
  if (!propre) return [];
  const mots = propre.split(" ").filter((m) => m.replace(/[^\p{L}]/gu, "").length >= 2);
  return [propre, ...mots];
}

/** Toutes les occurrences de `mot` en mot entier, commençant par une majuscule. */
function occurrences(texte: string, mot: string): number[] {
  const res: number[] = [];
  const bas = texte.toLocaleLowerCase("fr");
  const cible = mot.toLocaleLowerCase("fr");
  let i = bas.indexOf(cible);
  while (i >= 0) {
    const avant = i > 0 ? texte[i - 1] : "";
    const apres = texte[i + cible.length] ?? "";
    const initiale = texte[i];
    // Mot entier, et initiale en majuscule : « Rose » est une élève, « rose » une couleur.
    if (!LETTRE.test(avant) && !LETTRE.test(apres) && initiale === initiale.toLocaleUpperCase("fr")
        && initiale !== initiale.toLocaleLowerCase("fr")) {
      res.push(i);
    }
    i = bas.indexOf(cible, i + 1);
  }
  return res;
}

/** Remplace les noms des élèves par des marqueurs. */
export function pseudonymiser(texte: string, noms: string[]): { texte: string; table: Remplacement[] } {
  const variantes = [...new Set(noms.flatMap(formes))].sort((a, b) => b.length - a.length);
  const table: Remplacement[] = [];
  const parOriginal = new Map<string, string>();
  let sortie = texte;
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

/** Remet les vrais noms. `absents` : marqueurs disparus de la réponse. */
export function restaurer(texte: string, table: Remplacement[]): { texte: string; absents: string[] } {
  const absents = table.filter((r) => !texte.includes(r.marqueur)).map((r) => r.original);
  const parMarqueur = new Map(table.map((r) => [r.marqueur, r.original]));
  const sortie = texte.replace(/\[P(\d+)\]/g, (m) => parMarqueur.get(m) ?? m);
  return { texte: sortie, absents };
}
