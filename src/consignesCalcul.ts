// Les mots justes des consignes de calcul.
//
// Le programme de mathématiques du cycle 2 (BO du 31 octobre 2024) donne le
// sens des mots : « La somme de 12 et de 25 est 37. », « 12 et 25 sont les
// termes de l'addition 12 + 25. », « La différence entre 60 et 37 est 23. »,
// « Le produit de 3 et de 25 est 75. », « 3 et 25 sont les facteurs de la
// multiplication 3 × 25. » ; la division est l'opération inverse de la
// multiplication, son résultat le quotient. Et « 4 + … = 12 », « 5 + 3 = … »,
// « 10 = 7 + … » sont des « égalités à trou » : l'élève y donne l'un des trois
// nombres quand les deux autres sont connus.
//
// Une consigne dit donc ce que l'élève cherche vraiment. « Calcule les
// sommes » ne vaut que si chaque nombre qui manque est une somme ; dès que
// c'est parfois un terme — « 4 + … = 5 » —, on complète des égalités.

/** Ce que l'élève cherche dans une égalité à trou. */
export type Cherche =
  | "somme" | "difference" | "produit" | "quotient"
  | "double" | "moitie" | "decimale" | "fractionDe"
  | "terme" | "facteur" | "autre";

const TROU = "…";
/** Les opérations, entourées d'espaces comme l'application les écrit. */
const OPERATEURS: [RegExp, "+" | "−" | "×" | "÷"][] = [[/ \+ /, "+"], [/ [−–-] /, "−"], [/ [×x] /, "×"], [/ [÷:] /, "÷"]];

const operateurDe = (cote: string) => OPERATEURS.filter(([re]) => re.test(cote)).map(([, op]) => op);
/** Une fraction décimale : un dénominateur 10, 100, 1 000… */
const FRACTION_DECIMALE = /\d\s*\/\s*1[\s  ]?0+\b/;

/** Ce que cherche l'élève dans une égalité écrite par l'application (« 4 + … = 5 », « double de 6 = … »). */
export function chercheDans(ecrit: string): Cherche {
  const [gauche = "", droite = ""] = ecrit.split(" = ").map((c) => c.trim());
  if (!gauche || !droite) return "autre";
  if (droite === TROU) {
    // Le nombre qui manque est le résultat de ce qu'il y a à gauche.
    if (gauche.includes(TROU)) return "autre";
    if (/^double de /i.test(gauche)) return "double";
    if (/^moiti[ée] de /i.test(gauche)) return "moitie";
    if (/\d\s*\/\s*\d.* de /.test(gauche)) return "fractionDe";
    const ops = operateurDe(gauche);
    if (!ops.length) return gauche.includes("/") ? "decimale" : "autre";
    if (ops.length > 1) return "autre";
    // « 5 + 406/1 000 » : un entier et une fraction décimale, c'est une écriture décimale à trouver.
    if (ops[0] === "+" && FRACTION_DECIMALE.test(gauche) && !/,/.test(gauche)) return "decimale";
    return ({ "+": "somme", "−": "difference", "×": "produit", "÷": "quotient" } as const)[ops[0]];
  }
  // Le trou est ailleurs : un terme, un facteur, ou autre chose qu'un résultat.
  const avecTrou = gauche.includes(TROU) ? gauche : droite;
  if (/^(double|moiti[ée]) de /i.test(avecTrou)) return "autre";
  const ops = operateurDe(avecTrou);
  if (ops.length !== 1 || avecTrou.includes("/")) return "autre";
  return ops[0] === "+" || ops[0] === "−" ? "terme" : ops[0] === "×" ? "facteur" : "autre";
}

/** Ce que cherche une feuille : chaque calcul, une fois. */
export const cherchesDe = (ecrits: string[]): Set<Cherche> => new Set(ecrits.map(chercheDans));

/** Les cherches qui sont le résultat d'un calcul : la somme, le produit, le double… */
const RESULTATS: ReadonlySet<Cherche> = new Set(["somme", "difference", "produit", "quotient", "double", "moitie", "decimale", "fractionDe"]);
const OPERATIONS: ReadonlySet<Cherche> = new Set(["somme", "difference", "produit", "quotient"]);

const seulement = (c: Set<Cherche>, ...permis: Cherche[]) => c.size > 0 && [...c].every((x) => permis.includes(x));

/**
 * Les consignes justes pour ces calculs, la meilleure d'abord. À l'oral,
 * l'élève entend le calcul et écrit un nombre : la consigne le dit.
 */
export function consignesPour(ecrits: string[], oral = false): string[] {
  const c = cherchesDe(ecrits);
  const egalites = oral ? "Écris le nombre qui manque." : "Complète les égalités.";
  // Un seul résultat cherché partout : on le nomme — la somme d'une addition, le produit d'une multiplication.
  const parResultat = (un: string, les: string, operation: string) => oral
    ? [`Écris ${un}.`, "Écris le nombre qui manque."]
    : [`Calcule ${les}.`, `Écris le résultat de chaque ${operation}.`, "Complète les égalités."];
  if (seulement(c, "somme")) return parResultat("la somme", "les sommes", "addition");
  if (seulement(c, "difference")) return parResultat("la différence", "les différences", "soustraction");
  if (seulement(c, "produit")) return parResultat("le produit", "les produits", "multiplication");
  if (seulement(c, "quotient")) return parResultat("le quotient", "les quotients", "division");
  if (seulement(c, "somme", "difference")) return oral ? ["Écris le résultat.", "Écris le nombre qui manque."] : ["Calcule les sommes et les différences.", "Écris le résultat de chaque calcul.", "Complète les égalités."];
  if (seulement(c, "produit", "quotient")) return oral ? ["Écris le résultat.", "Écris le nombre qui manque."] : ["Calcule les produits et les quotients.", "Écris le résultat de chaque calcul.", "Complète les égalités."];
  if (seulement(c, "double")) return [oral ? "Écris le double du nombre." : "Écris le double de chaque nombre.", egalites];
  if (seulement(c, "moitie")) return [oral ? "Écris la moitié du nombre." : "Écris la moitié de chaque nombre.", egalites];
  if (seulement(c, "double", "moitie")) return [oral ? "Écris le double ou la moitié du nombre." : "Écris le double ou la moitié de chaque nombre.", egalites];
  if (seulement(c, "decimale")) return [oral ? "Écris le nombre en écriture décimale." : "Écris chaque nombre en écriture décimale.", egalites];
  if (seulement(c, "fractionDe")) return [oral ? "Écris la fraction de la quantité." : "Calcule la fraction de chaque quantité.", egalites];
  if ([...c].every((x) => RESULTATS.has(x))) return oral ? ["Écris le résultat.", "Écris le nombre qui manque."] : ["Écris le résultat de chaque calcul.", "Complète les égalités."];
  return oral ? ["Écris le nombre qui manque.", "Complète les égalités."] : ["Complète les égalités.", "Écris le nombre qui manque dans chaque égalité."];
}

/** Un mot de consigne qui ne va pas à la feuille : pourquoi, et ce qu'on dirait plutôt. */
export interface MotAReprendre { mot: string; pourquoi: string; mieux: string }

/** Ce que chaque mot suppose de la feuille : tous ses calculs en sont-ils ? */
const MOTS: { re: RegExp; convient: (c: Set<Cherche>) => boolean; sens: string }[] = [
  { re: /\badditions?\b/i, convient: (c) => seulement(c, "somme"), sens: "une addition se calcule, et son résultat est la somme" },
  { re: /\bsommes?\b/i, convient: (c) => seulement(c, "somme"), sens: "la somme est le résultat d'une addition" },
  { re: /\bsoustractions?\b/i, convient: (c) => seulement(c, "difference"), sens: "une soustraction se calcule, et son résultat est la différence" },
  { re: /\bdiff[ée]rences?\b/i, convient: (c) => seulement(c, "difference"), sens: "la différence est le résultat d'une soustraction" },
  { re: /\bmultiplications?\b/i, convient: (c) => seulement(c, "produit"), sens: "une multiplication se calcule, et son résultat est le produit" },
  { re: /\bproduits?\b/i, convient: (c) => seulement(c, "produit"), sens: "le produit est le résultat d'une multiplication" },
  { re: /\bdivisions?\b/i, convient: (c) => seulement(c, "quotient"), sens: "une division se calcule, et son résultat est le quotient" },
  { re: /\bquotients?\b/i, convient: (c) => seulement(c, "quotient"), sens: "le quotient est le résultat d'une division" },
  { re: /\br[ée]sultats?\b/i, convient: (c) => c.size > 0 && [...c].every((x) => RESULTATS.has(x)), sens: "le résultat est le nombre qu'on obtient en effectuant le calcul" },
  { re: /\bop[ée]rations?\b/i, convient: (c) => c.size > 0 && [...c].every((x) => OPERATIONS.has(x)), sens: "une opération — addition, soustraction, multiplication, division — se calcule" },
];

/** Ce que cherche l'élève, dit en mots, pour l'exemple qu'on cite. */
const DIT: Record<Cherche, string> = {
  somme: "une somme", difference: "une différence", produit: "un produit", quotient: "un quotient",
  double: "un double", moitie: "une moitié", decimale: "une écriture décimale", fractionDe: "une fraction d'une quantité",
  terme: "un terme", facteur: "un facteur", autre: "un nombre de l'égalité",
};

/**
 * Les mots d'une consigne qui ne vont pas à la feuille : « Complète les
 * additions » quand on y cherche parfois un terme. Chacun dit pourquoi, avec
 * un calcul de la feuille, et propose la consigne juste.
 */
export function motsAReprendre(consigne: string, ecrits: string[], mieux = consignesPour(ecrits)[0]): MotAReprendre[] {
  const c = cherchesDe(ecrits);
  if (!c.size || !consigne.trim()) return [];
  const sortie: MotAReprendre[] = [];
  for (const m of MOTS) {
    const trouve = consigne.match(m.re);
    if (!trouve || m.convient(c)) continue;
    const exemple = ecrits.find((e) => !m.convient(new Set([chercheDans(e)])));
    const quoi = exemple ? ` ; dans « ${exemple} », l'élève cherche ${DIT[chercheDans(exemple)]}` : "";
    sortie.push({ mot: trouve[0], pourquoi: `${m.sens}${quoi}.`, mieux });
  }
  return sortie;
}
