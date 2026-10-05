// Les faits numériques et les procédures de calcul mental, niveau par niveau.
//
// Le catalogue suit les programmes de mathématiques : celui du cycle 2 (BO
// du 31 octobre 2024) et celui du cycle 3 (2025). Ils rangent le calcul
// mental en trois rubriques — mémoriser des faits numériques, s'appuyer sur
// la numération, apprendre des procédures — et donnent, classe par classe,
// ce que l'élève doit savoir. Chaque ligne d'ici est l'un de ces objectifs,
// avec de quoi en tirer des calculs.
//
// On en travaille un seul à la fois : c'est ainsi qu'un fait se mémorise et
// qu'une procédure s'automatise. La révision, qui en mêle plusieurs, vient
// après. Les nombres restent dans le champ de la classe — jusqu'à 100 au CP,
// 1 000 au CE1, 10 000 au CE2.
//
// Pour le cours moyen, le programme nomme les objectifs sans toujours lister
// les faits : les listes d'ici reprennent alors celles du CE2 et les
// automatismes attendus en sixième.

import { choisir, entier, fr } from "./nombres";

export type Niveau = "CP" | "CE1" | "CE2" | "CM1" | "CM2" | "6e";
export type Rubrique = "faits" | "numeration" | "procedures";

export const NIVEAUX: { id: Niveau; cycle: 2 | 3; champ: string; procedures: string }[] = [
  { id: "CP", cycle: 2, champ: "nombres jusqu'à 100", procedures: "9 résultats en trois minutes" },
  { id: "CE1", cycle: 2, champ: "nombres jusqu'à 1 000", procedures: "12 résultats en trois minutes" },
  { id: "CE2", cycle: 2, champ: "nombres jusqu'à 10 000", procedures: "15 résultats en trois minutes" },
  { id: "CM1", cycle: 3, champ: "entiers et décimaux", procedures: "" },
  { id: "CM2", cycle: 3, champ: "entiers et décimaux", procedures: "" },
  { id: "6e", cycle: 3, champ: "entiers, décimaux et fractions", procedures: "" },
];

export const RUBRIQUES: { id: Rubrique; libelle: string }[] = [
  { id: "faits", libelle: "Mémoriser des faits numériques" },
  { id: "numeration", libelle: "S'appuyer sur la numération" },
  { id: "procedures", libelle: "Apprendre des procédures" },
];

export interface Calcul {
  objectif: string;
  /** Ce que le maître dit. */
  dire: string;
  /** L'égalité à trou : « … » marque ce que l'élève cherche. */
  ecrit: string;
  reponse: string;
}

type Tire = Omit<Calcul, "objectif">;
type Alea = () => number;

export interface Objectif {
  id: string;
  niveau: Niveau;
  rubrique: Rubrique;
  libelle: string;
  /** Un objectif « au choix » : on dit quelles tables on travaille. */
  tables?: number[];
  /** Ce que le programme attend en fin d'année, quand il le chiffre. */
  fluence?: string;
  tirer: (alea: Alea, tables: number[]) => Tire;
}

// ── Écrire les nombres ────────────────────────────────────────────────────

/** Le nom des parts d'une fraction, au singulier et au pluriel. */
const PARTS: Record<number, [string, string]> = {
  2: ["demi", "demis"], 3: ["tiers", "tiers"], 4: ["quart", "quarts"], 5: ["cinquième", "cinquièmes"],
  10: ["dixième", "dixièmes"], 100: ["centième", "centièmes"], 1000: ["millième", "millièmes"],
};

/** Une fraction comme on la dit : « un tiers », « 3 dixièmes », « 45 centièmes ». */
export function fractionDite(n: number, d: number): string {
  const [un, plusieurs] = PARTS[d] ?? [`sur ${fr(d)}`, `sur ${fr(d)}`];
  return n === 1 ? `un ${un}` : `${fr(n)} ${plusieurs}`;
}

/** Un nombre donné en dixièmes, centièmes ou millièmes : 345 centièmes → « 3,45 », sans zéro qui traîne. */
export function virgule(m: number, echelle: number): string {
  const a = Math.abs(Math.round(m));
  const chiffres = String(echelle).length - 1;
  const decimales = String(a % echelle).padStart(chiffres, "0").replace(/0+$/, "");
  return `${m < 0 ? "−" : ""}${fr(Math.floor(a / echelle))}${decimales ? `,${decimales}` : ""}`;
}

const plage = (de: number, a: number, pas = 1) => Array.from({ length: Math.floor((a - de) / pas) + 1 }, (_, i) => de + i * pas);

// ── Les formes d'un calcul ────────────────────────────────────────────────

const direct = (dire: string, ecrit: string, reponse: string): Tire => ({ dire, ecrit: `${ecrit} = …`, reponse });
const somme = (a: number, b: number) => direct(`${fr(a)} plus ${fr(b)}`, `${fr(a)} + ${fr(b)}`, fr(a + b));
const difference = (a: number, b: number) => direct(`${fr(a)} moins ${fr(b)}`, `${fr(a)} − ${fr(b)}`, fr(a - b));
const produit = (a: number, b: number) => direct(`${fr(a)} fois ${fr(b)}`, `${fr(a)} × ${fr(b)}`, fr(a * b));
const quotient = (a: number, b: number) => direct(`${fr(a)} divisé par ${fr(b)}`, `${fr(a)} ÷ ${fr(b)}`, fr(a / b));
const plusOuMoins = (alea: Alea, a: number, b: number) => (alea() < 0.5 ? somme(a, b) : difference(a + b, b));

/** Une égalité à trou, « dans les deux sens » : on cherche le résultat, ou l'un des deux nombres. */
function aTrou(alea: Alea, a: number, b: number, signe: "+" | "×"): Tire {
  const c = signe === "+" ? a + b : a * b;
  const mot = signe === "+" ? "plus" : "fois";
  const forme = entier(alea, 0, 2);
  if (forme === 0) return { dire: `${fr(a)} ${mot} ${fr(b)}`, ecrit: `${fr(a)} ${signe} ${fr(b)} = …`, reponse: fr(c) };
  if (forme === 1) return { dire: `${fr(a)} ${mot} combien égale ${fr(c)} ?`, ecrit: `${fr(a)} ${signe} … = ${fr(c)}`, reponse: fr(b) };
  return { dire: `${fr(c)}, c'est ${fr(a)} ${mot} combien ?`, ecrit: `${fr(c)} = ${fr(a)} ${signe} …`, reponse: fr(b) };
}

const doubleDe = (alea: Alea, n: number, enMots: boolean): Tire => (alea() < 0.5
  ? { dire: `Le double de ${fr(n)}`, ecrit: enMots ? `double de ${fr(n)} = …` : `2 × ${fr(n)} = …`, reponse: fr(2 * n) }
  : { dire: `Le double de quel nombre fait ${fr(2 * n)} ?`, ecrit: enMots ? `double de … = ${fr(2 * n)}` : `2 × … = ${fr(2 * n)}`, reponse: fr(n) });

/** Le double à trouver, sans l'égalité à l'envers : la forme du CP. */
const leDouble = (n: number): Tire => ({ dire: `Le double de ${fr(n)}`, ecrit: `double de ${fr(n)} = …`, reponse: fr(2 * n) });

/** La moitié d'un entier : juste aussi pour un impair — la moitié de 7 est 3,5. */
const moitieDe = (alea: Alea, n: number): Tire => (alea() < 0.5
  ? { dire: `La moitié de ${fr(n)}`, ecrit: `moitié de ${fr(n)} = …`, reponse: virgule(n * 5, 10) }
  : { dire: `La moitié de quel nombre fait ${virgule(n * 5, 10)} ?`, ecrit: `moitié de … = ${virgule(n * 5, 10)}`, reponse: fr(n) });

/** La moitié à trouver, sans l'égalité à l'envers : la forme du CP. */
const laMoitie = (n: number): Tire => ({ dire: `La moitié de ${fr(n)}`, ecrit: `moitié de ${fr(n)} = …`, reponse: virgule(n * 5, 10) });

/** Une liste d'égalités toutes faites — les fractions usuelles, par exemple. */
const parmi = (liste: [dire: string, ecrit: string, reponse: string][]) => (alea: Alea): Tire => {
  const [dire, ecrit, reponse] = choisir(alea, liste);
  return { dire, ecrit, reponse };
};

/** Une table au choix ; la première de la liste si rien n'est choisi. */
const table = (alea: Alea, choisies: number[], possibles: number[]) => {
  const retenues = choisies.filter((t) => possibles.includes(t));
  return choisir(alea, retenues.length ? retenues : [possibles[0]]);
};

// ── Les listes que le programme donne ─────────────────────────────────────

const DOUBLES: Record<"CE1" | "CE2", number[]> = {
  CE1: [...plage(1, 15), 20, 25, 30, 35, 40, 45, 50, 100, 150, 200, 250, 300, 500],
  CE2: [...plage(1, 20), 25, 30, 35, 40, 45, 50, 60, 75, 100, 150, 200, 250, 300, 400, 500, 600],
};
const MOITIES: Record<"CE1" | "CE2", number[]> = {
  CE1: [...plage(2, 30, 2), 40, 50, 60, 70, 80, 90, 100, 200, 300, 400, 500, 600, 1000],
  CE2: [...plage(2, 40, 2), 50, 60, 70, 80, 90, 100, 120, 150, 200, 300, 400, 500, 600, 800, 1000, 1200],
};
const TABLES_ADDITION = plage(1, 10);
const TABLES_MULTIPLICATION = plage(2, 10);

const RELATIONS_FRACTIONS: [string, string, string][] = [
  ["un demi plus un demi", "1/2 + 1/2 = …", "1"], ["un quart plus un quart", "1/4 + 1/4 = …", "1/2"],
  ["un demi plus un quart", "1/2 + 1/4 = …", "3/4"], ["trois quarts plus un quart", "3/4 + 1/4 = …", "1"],
  ["un moins un quart", "1 − 1/4 = …", "3/4"], ["un moins un demi", "1 − 1/2 = …", "1/2"],
  ["un moins trois quarts", "1 − 3/4 = …", "1/4"], ["trois quarts moins un demi", "3/4 − 1/2 = …", "1/4"],
  ["trois quarts moins un quart", "3/4 − 1/4 = …", "1/2"], ["un demi moins un quart", "1/2 − 1/4 = …", "1/4"],
  ["un demi, c'est combien de quarts ?", "1/2 = …/4", "2"], ["un demi, c'est combien de dixièmes ?", "1/2 = …/10", "5"],
  ["un dixième, c'est combien de centièmes ?", "1/10 = …/100", "10"], ["dix dixièmes", "10/10 = …", "1"],
];
const ECRITURES_DECIMALES: [string, string, string][] = [
  ["un demi en écriture décimale", "1/2 = …", "0,5"], ["un quart en écriture décimale", "1/4 = …", "0,25"],
  ["trois quarts en écriture décimale", "3/4 = …", "0,75"], ["un dixième en écriture décimale", "1/10 = …", "0,1"],
  ["un centième en écriture décimale", "1/100 = …", "0,01"], ["trois dixièmes en écriture décimale", "3/10 = …", "0,3"],
  ["sept dixièmes en écriture décimale", "7/10 = …", "0,7"], ["zéro virgule cinq en fraction", "0,5 = 1/…", "2"],
  ["zéro virgule vingt-cinq en fraction", "0,25 = 1/…", "4"], ["zéro virgule un en fraction", "0,1 = 1/…", "10"],
  ["zéro virgule soixante-quinze, c'est combien de quarts ?", "0,75 = …/4", "3"],
];
const ECRITURES_SIXIEME: [string, string, string][] = [
  ["un quart en écriture décimale", "1/4 = …", "0,25"], ["un demi en écriture décimale", "1/2 = …", "0,5"],
  ["trois quarts en écriture décimale", "3/4 = …", "0,75"], ["trois demis en écriture décimale", "3/2 = …", "1,5"],
  ["quatre demis", "4/2 = …", "2"], ["cinq demis en écriture décimale", "5/2 = …", "2,5"],
  ["zéro virgule vingt-cinq en fraction", "0,25 = 1/…", "4"], ["un virgule cinq, c'est combien de demis ?", "1,5 = …/2", "3"],
  ["deux virgule cinq, c'est combien de demis ?", "2,5 = …/2", "5"],
];
const UNITES_DECIMALES: [string, string, string][] = [
  ["un dixième en écriture décimale", "1/10 = …", "0,1"], ["un centième en écriture décimale", "1/100 = …", "0,01"],
  ["un millième en écriture décimale", "1/1\u202f000 = …", "0,001"], ["un, c'est combien de dixièmes ?", "1 = …/10", "10"],
  ["un, c'est combien de centièmes ?", "1 = …/100", "100"], ["un dixième, c'est combien de centièmes ?", "1/10 = …/100", "10"],
  ["un centième, c'est combien de millièmes ?", "1/100 = …/1\u202f000", "10"], ["dix fois un dixième", "10 × 1/10 = …", "1"],
  ["dix fois un centième", "10 × 1/100 = …", "1/10"], ["cent fois un centième", "100 × 1/100 = …", "1"],
];

// ── Les tirages qui reviennent d'une classe à l'autre ─────────────────────

const tablesAddition = (alea: Alea) => aTrou(alea, entier(alea, 2, 10), entier(alea, 2, 10), "+");
const tableMultiplication = (alea: Alea, tables: number[]) => aTrou(alea, table(alea, tables, TABLES_MULTIPLICATION), entier(alea, 1, 10), "×");
const tableALEnvers = (alea: Alea, tables: number[]) => {
  const t = table(alea, tables, TABLES_MULTIPLICATION), k = entier(alea, 1, 10);
  return quotient(t * k, t);
};
const multiplesDe25 = (alea: Alea) => aTrou(alea, entier(alea, 1, 4), 25, "×");

/** Ajouter ou retirer un nombre « presque rond » : on passe par la dizaine, puis on ajuste. */
const presqueRond = (unites: number[], dizainesMax: number, ajouter: boolean, soustraire: boolean, de: number, a: number) => (alea: Alea): Tire => {
  const b = 10 * entier(alea, 0, dizainesMax) + choisir(alea, unites);
  const plus = ajouter && (!soustraire || alea() < 0.5);
  return plus ? somme(entier(alea, de, a), b) : difference(entier(alea, Math.max(de, b + 3), a + b), b);
};

/** Multiplier par 4 ou par 8 : le double, puis le double du double. */
const fois4ou8 = (de: number, a: number) => (alea: Alea) => produit(choisir(alea, [4, 8]), entier(alea, de, a));

/** Le produit d'un nombre à deux chiffres par un nombre à un chiffre, en décomposant le plus grand. */
const produitDecompose = (de: number, a: number) => (alea: Alea) => produit(entier(alea, de, a), entier(alea, 2, 9));

/** Un nombre décimal, en centièmes, et son produit ou son quotient par 10, 100 ou 1 000. */
const decimalFois = (facteurs: number[]) => (alea: Alea): Tire => {
  const f = choisir(alea, facteurs), m = entier(alea, 12, 9999);
  return direct(`${virgule(m, 100)} fois ${fr(f)}`, `${virgule(m, 100)} × ${fr(f)}`, virgule(m * f, 100));
};
/** On part du quotient : il ne descend pas plus bas que les centièmes au CM1, les millièmes ensuite. */
const decimalDivise = (diviseurs: number[], echelle: 100 | 1000) => (alea: Alea): Tire => {
  const d = choisir(alea, diviseurs), q = entier(alea, 12, 9999);
  return direct(`${virgule(q * d, echelle)} divisé par ${fr(d)}`, `${virgule(q * d, echelle)} ÷ ${fr(d)}`, virgule(q, echelle));
};

/** Un entier ajouté ou retiré à un décimal : sans retenue, les chiffres s'ajoutent rang par rang. */
const entierEtDecimal = (retenue: boolean) => (alea: Alea): Tire => {
  const dec = entier(alea, 1, 99);
  if (retenue) {
    const u = entier(alea, 2, 9), n = entier(alea, 10 - u, 9), d = entier(alea, 1, 8);
    const a = (10 * d + u) * 100 + dec;
    return direct(`${virgule(a, 100)} plus ${fr(n)}`, `${virgule(a, 100)} + ${fr(n)}`, virgule(a + 100 * n, 100));
  }
  const u = entier(alea, 1, 8), d = entier(alea, 1, 8), a = (10 * d + u) * 100 + dec;
  if (alea() < 0.5) {
    const n = entier(alea, 1, 9 - u);
    return direct(`${virgule(a, 100)} plus ${fr(n)}`, `${virgule(a, 100)} + ${fr(n)}`, virgule(a + 100 * n, 100));
  }
  const n = entier(alea, 1, u);
  return direct(`${virgule(a, 100)} moins ${fr(n)}`, `${virgule(a, 100)} − ${fr(n)}`, virgule(a - 100 * n, 100));
};

const distributivite = (alea: Alea) => produit(entier(alea, 3, 9), choisir(alea, [11, 12, 13, 14, 15, 19, 21, 22, 29, 31, 101, 102]));

// ── Le catalogue ──────────────────────────────────────────────────────────

const UNE_MINUTE = (n: number) => `${n} égalités à trou en une minute`;

const CATALOGUE: Objectif[] = [
  // ── CP : nombres jusqu'à 100 ──
  // Au CP, l'élève cherche le résultat : « 5 + 2 = … », le trou à la fin. Le
  // nombre manquant (« 2 + … = 6 ») et l'égalité à l'envers (« 9 = 8 + … »)
  // viennent au CE1. Seul le complément à 10 se cherche au milieu : c'est
  // lui, le résultat — « 7 et combien font 10 ? ».
  { id: "cp-complements-10", niveau: "CP", rubrique: "faits", libelle: "Compléments à 10", fluence: UNE_MINUTE(8),
    tirer: (alea) => {
      const a = entier(alea, 1, 9);
      return { dire: `Combien pour aller de ${a} à 10 ?`, ecrit: `${a} + … = 10`, reponse: String(10 - a) };
    } },
  { id: "cp-sommes-10", niveau: "CP", rubrique: "faits", libelle: "Tables d'addition : sommes jusqu'à 10", fluence: UNE_MINUTE(8),
    tirer: (alea) => { const a = entier(alea, 1, 8); return somme(a, entier(alea, 1, 9 - a)); } },
  { id: "cp-table-addition", niveau: "CP", rubrique: "faits", libelle: "Une table d'addition, au choix", tables: TABLES_ADDITION, fluence: UNE_MINUTE(8),
    tirer: (alea, tables) => somme(table(alea, tables, TABLES_ADDITION), entier(alea, 1, 10)) },
  { id: "cp-tables-addition", niveau: "CP", rubrique: "faits", libelle: "Toutes les tables d'addition : sommes jusqu'à 20", fluence: UNE_MINUTE(8),
    tirer: (alea) => somme(entier(alea, 2, 10), entier(alea, 2, 10)) },
  { id: "cp-doubles", niveau: "CP", rubrique: "faits", libelle: "Doubles des nombres de 1 à 10", fluence: UNE_MINUTE(8),
    tirer: (alea) => leDouble(entier(alea, 1, 10)) },
  { id: "cp-doubles-dizaines", niveau: "CP", rubrique: "faits", libelle: "Doubles de 20, 30, 40 et 50", fluence: UNE_MINUTE(8),
    tirer: (alea) => leDouble(choisir(alea, [20, 30, 40, 50])) },
  { id: "cp-moities", niveau: "CP", rubrique: "faits", libelle: "Moitiés des nombres pairs de 2 à 20", fluence: UNE_MINUTE(8),
    tirer: (alea) => laMoitie(2 * entier(alea, 1, 10)) },
  { id: "cp-moities-dizaines", niveau: "CP", rubrique: "faits", libelle: "Moitiés de 40, 60, 80 et 100", fluence: UNE_MINUTE(8),
    tirer: (alea) => laMoitie(choisir(alea, [40, 60, 80, 100])) },
  { id: "cp-un-ou-deux", niveau: "CP", rubrique: "numeration", libelle: "Ajouter ou soustraire 1 ou 2",
    tirer: (alea) => plusOuMoins(alea, entier(alea, 3, 97), choisir(alea, [1, 2])) },
  { id: "cp-dix", niveau: "CP", rubrique: "numeration", libelle: "Ajouter ou soustraire 10",
    tirer: (alea) => plusOuMoins(alea, entier(alea, 1, 90), 10) },
  { id: "cp-dizaines", niveau: "CP", rubrique: "numeration", libelle: "Ajouter ou soustraire 20, 30, … 90",
    tirer: (alea) => { const d = 10 * entier(alea, 2, 9); return plusOuMoins(alea, entier(alea, 1, 100 - d), d); } },
  { id: "cp-dizaine-superieure", niveau: "CP", rubrique: "procedures", libelle: "Complément à la dizaine supérieure",
    tirer: (alea) => {
      const a = 10 * entier(alea, 1, 9) + entier(alea, 1, 9), dizaine = 10 * Math.ceil(a / 10);
      return { dire: `Combien pour aller de ${a} à ${dizaine} ?`, ecrit: `${a} + … = ${dizaine}`, reponse: String(dizaine - a) };
    } },
  { id: "cp-ajouter-unites", niveau: "CP", rubrique: "procedures", libelle: "Ajouter un nombre à un chiffre",
    tirer: (alea) => somme(entier(alea, 11, 91), entier(alea, 2, 8)) },
  { id: "cp-ajouter-9", niveau: "CP", rubrique: "procedures", libelle: "Ajouter 9 : ajouter 10, retirer 1",
    tirer: (alea) => somme(10 * entier(alea, 1, 8) + entier(alea, 2, 9), 9) },
  { id: "cp-deux-nombres", niveau: "CP", rubrique: "procedures", libelle: "Ajouter deux nombres inférieurs à 100",
    tirer: (alea) => { const a = entier(alea, 11, 78); return somme(a, entier(alea, 11, 100 - a)); } },
  { id: "cp-moitie-pair", niveau: "CP", rubrique: "procedures", libelle: "Moitié d'un nombre pair, en le décomposant",
    tirer: (alea) => { const n = 10 * choisir(alea, [2, 4, 6, 8]) + choisir(alea, [2, 4, 6, 8]); return direct(`La moitié de ${n}`, `moitié de ${n}`, String(n / 2)); } },
  { id: "cp-dizaines-moins", niveau: "CP", rubrique: "procedures", libelle: "Retirer un nombre à un chiffre d'une dizaine entière",
    tirer: (alea) => difference(10 * entier(alea, 2, 10), entier(alea, 1, 9)) },

  // ── CE1 : nombres jusqu'à 1 000 ──
  { id: "ce1-tables-addition", niveau: "CE1", rubrique: "faits", libelle: "Tables d'addition, dans les deux sens", fluence: UNE_MINUTE(12), tirer: tablesAddition },
  { id: "ce1-table-multiplication", niveau: "CE1", rubrique: "faits", libelle: "Une table de multiplication, au choix", tables: TABLES_MULTIPLICATION, fluence: UNE_MINUTE(8), tirer: tableMultiplication },
  { id: "ce1-doubles", niveau: "CE1", rubrique: "faits", libelle: "Doubles : jusqu'à 15, de 20 à 50, de 100 à 500", fluence: UNE_MINUTE(8),
    tirer: (alea) => doubleDe(alea, choisir(alea, DOUBLES.CE1), false) },
  { id: "ce1-moities", niveau: "CE1", rubrique: "faits", libelle: "Moitiés : jusqu'à 30, des dizaines, des centaines", fluence: UNE_MINUTE(8),
    tirer: (alea) => moitieDe(alea, choisir(alea, MOITIES.CE1)) },
  { id: "ce1-multiples-25", niveau: "CE1", rubrique: "faits", libelle: "Multiples de 25 : 25, 50, 75, 100", fluence: UNE_MINUTE(8), tirer: multiplesDe25 },
  { id: "ce1-dizaines-centaines", niveau: "CE1", rubrique: "numeration", libelle: "Ajouter ou soustraire des dizaines, des centaines entières",
    tirer: (alea) => {
      const pas = choisir(alea, [10, 100]), b = pas * entier(alea, 2, 9);
      // Le nombre de départ laisse la place d'ajouter : on reste sous 1 000.
      return plusOuMoins(alea, entier(alea, Math.max(1, Math.min(101, 999 - b)), 999 - b), b);
    } },
  { id: "ce1-fois-10", niveau: "CE1", rubrique: "numeration", libelle: "Multiplier par 10 un nombre inférieur à 100",
    tirer: (alea) => produit(10, entier(alea, 2, 99)) },
  { id: "ce1-ajouter-9-19-29", niveau: "CE1", rubrique: "procedures", libelle: "Ajouter 9, 19 ou 29", tirer: presqueRond([9], 2, true, false, 12, 900) },
  { id: "ce1-soustraire-9", niveau: "CE1", rubrique: "procedures", libelle: "Soustraire 9 : retirer 10, ajouter 1", tirer: presqueRond([9], 0, false, true, 12, 900) },
  { id: "ce1-soustraire-unites", niveau: "CE1", rubrique: "procedures", libelle: "Soustraire un nombre à un chiffre",
    tirer: (alea) => difference(entier(alea, 21, 990), entier(alea, 2, 8)) },
  { id: "ce1-moitie-pair", niveau: "CE1", rubrique: "procedures", libelle: "Moitié d'un nombre pair, en le décomposant",
    tirer: (alea) => {
      const n = choisir(alea, [0, 200, 300, 400, 500, 600]) + choisir(alea, [20, 40, 50, 60, 70, 80, 90]) + choisir(alea, [0, 2, 4, 6, 8]);
      return direct(`La moitié de ${fr(n)}`, `moitié de ${fr(n)}`, fr(n / 2));
    } },
  { id: "ce1-produit-11-19", niveau: "CE1", rubrique: "procedures", libelle: "Produit d'un nombre de 11 à 19 par un nombre à un chiffre", tirer: produitDecompose(11, 19) },

  // ── CE2 : nombres jusqu'à 10 000 ──
  { id: "ce2-tables-addition", niveau: "CE2", rubrique: "faits", libelle: "Tables d'addition, dans les deux sens", fluence: UNE_MINUTE(15), tirer: tablesAddition },
  { id: "ce2-table-multiplication", niveau: "CE2", rubrique: "faits", libelle: "Une table de multiplication, au choix", tables: TABLES_MULTIPLICATION, fluence: UNE_MINUTE(12), tirer: tableMultiplication },
  { id: "ce2-doubles", niveau: "CE2", rubrique: "faits", libelle: "Doubles : jusqu'à 20, de 25 à 75, de 100 à 600", fluence: UNE_MINUTE(12),
    tirer: (alea) => doubleDe(alea, choisir(alea, DOUBLES.CE2), false) },
  { id: "ce2-moities", niveau: "CE2", rubrique: "faits", libelle: "Moitiés : jusqu'à 40, des dizaines, des centaines", fluence: UNE_MINUTE(12),
    tirer: (alea) => moitieDe(alea, choisir(alea, MOITIES.CE2)) },
  { id: "ce2-multiples-25", niveau: "CE2", rubrique: "faits", libelle: "Multiples de 25 : 25, 50, 75, 100", fluence: UNE_MINUTE(12), tirer: multiplesDe25 },
  { id: "ce2-produits-60", niveau: "CE2", rubrique: "faits", libelle: "Décompositions de 60 en produits", fluence: UNE_MINUTE(12),
    tirer: (alea) => {
      const [a, b] = choisir(alea, [[1, 60], [2, 30], [3, 20], [4, 15], [5, 12], [6, 10]]);
      return alea() < 0.5
        ? { dire: `60, c'est ${a} fois combien ?`, ecrit: `60 = ${a} × …`, reponse: String(b) }
        : { dire: `60, c'est ${b} fois combien ?`, ecrit: `60 = ${b} × …`, reponse: String(a) };
    } },
  { id: "ce2-fois-10-100", niveau: "CE2", rubrique: "numeration", libelle: "Multiplier un nombre entier par 10 ou par 100",
    tirer: (alea) => (alea() < 0.5 ? produit(10, entier(alea, 11, 999)) : produit(100, entier(alea, 2, 99))) },
  { id: "ce2-ajouter-8-9", niveau: "CE2", rubrique: "procedures", libelle: "Ajouter 8, 9, 18, 19, 28, 29, 38 ou 39", tirer: presqueRond([8, 9], 3, true, false, 13, 900) },
  { id: "ce2-soustraire-9", niveau: "CE2", rubrique: "procedures", libelle: "Soustraire 9, 19, 29 ou 39", tirer: presqueRond([9], 3, false, true, 13, 900) },
  { id: "ce2-fois-4-8", niveau: "CE2", rubrique: "procedures", libelle: "Multiplier par 4 ou par 8 : doubler, et doubler encore", tirer: fois4ou8(11, 60) },
  { id: "ce2-fois-dizaines", niveau: "CE2", rubrique: "procedures", libelle: "Multiplier un nombre à un chiffre par des dizaines entières",
    tirer: (alea) => produit(entier(alea, 2, 9), 10 * entier(alea, 2, 9)) },
  { id: "ce2-produit-11-99", niveau: "CE2", rubrique: "procedures", libelle: "Produit d'un nombre de 11 à 99 par un nombre à un chiffre", tirer: produitDecompose(11, 99) },

  // ── CM1 ──
  { id: "cm1-table-multiplication", niveau: "CM1", rubrique: "faits", libelle: "Une table de multiplication, au choix", tables: TABLES_MULTIPLICATION, tirer: tableMultiplication },
  { id: "cm1-tables-envers", niveau: "CM1", rubrique: "faits", libelle: "Une table à l'envers : les divisions", tables: TABLES_MULTIPLICATION, tirer: tableALEnvers },
  { id: "cm1-doubles-moities", niveau: "CM1", rubrique: "faits", libelle: "Doubles et moitiés usuels",
    tirer: (alea) => (alea() < 0.5 ? doubleDe(alea, choisir(alea, DOUBLES.CE2), false) : moitieDe(alea, choisir(alea, MOITIES.CE2))) },
  { id: "cm1-multiples-25", niveau: "CM1", rubrique: "faits", libelle: "Multiples de 25 et de 50",
    tirer: (alea) => (alea() < 0.5 ? aTrou(alea, entier(alea, 1, 8), 25, "×") : aTrou(alea, entier(alea, 1, 10), 50, "×")) },
  { id: "cm1-fractions", niveau: "CM1", rubrique: "faits", libelle: "Relations entre fractions usuelles : demis, quarts, dixièmes", tirer: parmi(RELATIONS_FRACTIONS) },
  { id: "cm1-ecritures-decimales", niveau: "CM1", rubrique: "faits", libelle: "Écriture décimale des fractions usuelles", tirer: parmi(ECRITURES_DECIMALES) },
  { id: "cm1-rang-par-rang", niveau: "CM1", rubrique: "numeration", libelle: "Ajouter ou retirer des unités, dizaines, dixièmes, centièmes à un décimal",
    tirer: (alea) => {
      // Cinq chiffres — centaines, dizaines, unités, dixièmes, centièmes — et un rang où l'on ajoute sans retenue.
      const chiffres = Array.from({ length: 5 }, () => entier(alea, 1, 8));
      const poids = [10000, 1000, 100, 10, 1];
      const a = chiffres.reduce((s, c, i) => s + c * poids[i], 0);
      const rang = entier(alea, 0, 4);
      if (alea() < 0.5) {
        const k = entier(alea, 1, 9 - chiffres[rang]);
        return direct(`${virgule(a, 100)} plus ${virgule(k * poids[rang], 100)}`, `${virgule(a, 100)} + ${virgule(k * poids[rang], 100)}`, virgule(a + k * poids[rang], 100));
      }
      const k = entier(alea, 1, chiffres[rang]);
      return direct(`${virgule(a, 100)} moins ${virgule(k * poids[rang], 100)}`, `${virgule(a, 100)} − ${virgule(k * poids[rang], 100)}`, virgule(a - k * poids[rang], 100));
    } },
  { id: "cm1-fois-10-100-1000", niveau: "CM1", rubrique: "numeration", libelle: "Multiplier un nombre entier par 10, 100 ou 1 000",
    tirer: (alea) => produit(choisir(alea, [10, 100, 1000]), entier(alea, 2, 999)) },
  { id: "cm1-decimal-fois-10", niveau: "CM1", rubrique: "numeration", libelle: "Multiplier un nombre décimal par 10", tirer: decimalFois([10]) },
  { id: "cm1-decimal-divise-10", niveau: "CM1", rubrique: "numeration", libelle: "Diviser un nombre décimal par 10", tirer: decimalDivise([10], 100) },
  { id: "cm1-presque-ronds", niveau: "CM1", rubrique: "procedures", libelle: "Ajouter ou soustraire 8, 9, 18, 19, … 38 ou 39", tirer: presqueRond([8, 9], 3, true, true, 41, 900) },
  { id: "cm1-fois-dizaines-centaines", niveau: "CM1", rubrique: "procedures", libelle: "Multiplier un nombre à un chiffre par des dizaines ou des centaines",
    tirer: (alea) => produit(entier(alea, 2, 9), choisir(alea, [10, 100]) * entier(alea, 2, 9)) },
  { id: "cm1-fois-4-8", niveau: "CM1", rubrique: "procedures", libelle: "Multiplier par 4 ou par 8", tirer: fois4ou8(12, 125) },
  { id: "cm1-fois-5", niveau: "CM1", rubrique: "procedures", libelle: "Multiplier par 5 : multiplier par 10, prendre la moitié",
    tirer: (alea) => produit(5, entier(alea, 12, 199)) },
  { id: "cm1-distributivite", niveau: "CM1", rubrique: "procedures", libelle: "Décomposer pour multiplier : 7 × 12, 6 × 19", tirer: distributivite },

  // ── CM2 ──
  { id: "cm2-table-multiplication", niveau: "CM2", rubrique: "faits", libelle: "Une table de multiplication, au choix", tables: TABLES_MULTIPLICATION, tirer: tableMultiplication },
  { id: "cm2-tables-envers", niveau: "CM2", rubrique: "faits", libelle: "Une table à l'envers : les divisions", tables: TABLES_MULTIPLICATION, tirer: tableALEnvers },
  { id: "cm2-moities-impairs", niveau: "CM2", rubrique: "faits", libelle: "Moitiés des nombres impairs jusqu'à 15",
    tirer: (alea) => moitieDe(alea, 2 * entier(alea, 0, 7) + 1) },
  { id: "cm2-fractions", niveau: "CM2", rubrique: "faits", libelle: "Relations entre fractions usuelles : demis, quarts, dixièmes", tirer: parmi(RELATIONS_FRACTIONS) },
  { id: "cm2-ecritures-decimales", niveau: "CM2", rubrique: "faits", libelle: "Écriture décimale des fractions usuelles", tirer: parmi(ECRITURES_DECIMALES) },
  { id: "cm2-entier-decimal", niveau: "CM2", rubrique: "numeration", libelle: "Ajouter ou soustraire un entier à un décimal, sans retenue", tirer: entierEtDecimal(false) },
  { id: "cm2-entier-decimal-retenue", niveau: "CM2", rubrique: "numeration", libelle: "Ajouter un entier à un décimal, avec retenue", tirer: entierEtDecimal(true) },
  { id: "cm2-decimal-fois", niveau: "CM2", rubrique: "numeration", libelle: "Multiplier un décimal par 10, 100 ou 1 000", tirer: decimalFois([10, 100, 1000]) },
  { id: "cm2-decimal-divise", niveau: "CM2", rubrique: "numeration", libelle: "Diviser un décimal par 10, 100 ou 1 000", tirer: decimalDivise([10, 100, 1000], 1000) },
  { id: "cm2-somme-decimaux", niveau: "CM2", rubrique: "procedures", libelle: "Ajouter deux décimaux inférieurs à 10, à un chiffre après la virgule",
    tirer: (alea) => {
      const a = entier(alea, 11, 99), b = entier(alea, 11, 99);
      return direct(`${virgule(a, 10)} plus ${virgule(b, 10)}`, `${virgule(a, 10)} + ${virgule(b, 10)}`, virgule(a + b, 10));
    } },
  { id: "cm2-presque-ronds", niveau: "CM2", rubrique: "procedures", libelle: "Ajouter ou soustraire 8, 9, 18, 19, … 98 ou 99", tirer: presqueRond([8, 9], 9, true, true, 101, 900) },
  { id: "cm2-produits-ronds", niveau: "CM2", rubrique: "procedures", libelle: "Multiplier entre eux des dizaines, des centaines, des milliers",
    tirer: (alea) => produit(entier(alea, 2, 9) * choisir(alea, [10, 100, 1000]), entier(alea, 2, 9) * choisir(alea, [10, 100])) },
  { id: "cm2-distributivite", niveau: "CM2", rubrique: "procedures", libelle: "Décomposer pour multiplier : 7 × 12, 6 × 19", tirer: distributivite },
  { id: "cm2-double-decimal", niveau: "CM2", rubrique: "procedures", libelle: "Double d'un nombre décimal",
    tirer: (alea) => { const m = 10 * entier(alea, 1, 20) + entier(alea, 1, 5); return direct(`Le double de ${virgule(m, 10)}`, `2 × ${virgule(m, 10)}`, virgule(2 * m, 10)); } },
  { id: "cm2-moitie-decimal", niveau: "CM2", rubrique: "procedures", libelle: "Moitié d'un nombre décimal",
    tirer: (alea) => { const m = 20 * entier(alea, 0, 10) + 2 * entier(alea, 1, 4); return direct(`La moitié de ${virgule(m, 10)}`, `moitié de ${virgule(m, 10)}`, virgule(m / 2, 10)); } },
  { id: "cm2-diviser-4-8", niveau: "CM2", rubrique: "procedures", libelle: "Diviser par 4 ou par 8 : la moitié, et encore la moitié",
    tirer: (alea) => { const d = choisir(alea, [4, 8]); return quotient(d * entier(alea, 6, 50), d); } },
  { id: "cm2-decimal-fois-5", niveau: "CM2", rubrique: "procedures", libelle: "Multiplier un décimal par 5",
    tirer: (alea) => { const m = entier(alea, 12, 199); return direct(`${virgule(m, 10)} fois 5`, `${virgule(m, 10)} × 5`, virgule(m * 5, 10)); } },
  { id: "cm2-decimal-fois-50", niveau: "CM2", rubrique: "procedures", libelle: "Multiplier un décimal par 50",
    tirer: (alea) => { const m = entier(alea, 12, 199); return direct(`${virgule(m, 10)} fois 50`, `${virgule(m, 10)} × 50`, virgule(m * 50, 10)); } },

  // ── Sixième : les automatismes ──
  { id: "6e-unites-decimales", niveau: "6e", rubrique: "faits", libelle: "Dixièmes, centièmes, millièmes : relations et écritures", tirer: parmi(UNITES_DECIMALES) },
  { id: "6e-quarts-demis", niveau: "6e", rubrique: "faits", libelle: "Égalités à trou avec un quart, un demi, trois quarts", tirer: parmi(RELATIONS_FRACTIONS.slice(0, 10)) },
  { id: "6e-fractions-decimales", niveau: "6e", rubrique: "faits", libelle: "D'une fraction à l'écriture décimale, et retour", tirer: parmi(ECRITURES_SIXIEME) },
  { id: "6e-fraction-decimale", niveau: "6e", rubrique: "numeration", libelle: "D'une fraction décimale à l'écriture à virgule",
    tirer: (alea) => {
      // Une fraction se lit par le nom de ses parts : « 45 centièmes », pas « 45 sur 100 ».
      const echelle = choisir(alea, [10, 100, 1000]), ent = entier(alea, 0, 9), n = entier(alea, 1, echelle - 1);
      const fraction = `${fr(n)}/${fr(echelle)}`;
      return ent
        ? direct(`${ent} plus ${fractionDite(n, echelle)}`, `${ent} + ${fraction}`, virgule(ent * echelle + n, echelle))
        : direct(`${fractionDite(n, echelle)} en écriture décimale`, fraction, virgule(n, echelle));
    } },
  { id: "6e-decimal-fois-divise", niveau: "6e", rubrique: "numeration", libelle: "Multiplier ou diviser un décimal par 10, 100 ou 1 000",
    tirer: (alea) => (alea() < 0.5 ? decimalFois([10, 100, 1000])(alea) : decimalDivise([10, 100, 1000], 1000)(alea)) },
  { id: "6e-fraction-quantite", niveau: "6e", rubrique: "procedures", libelle: "Prendre une fraction d'une quantité : 2/3 de 12",
    tirer: (alea) => {
      const [n, d] = choisir(alea, [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [1, 10], [3, 10]]);
      const q = d * entier(alea, 2, 10);
      return direct(`${fractionDite(n, d)} de ${q}`, `${n}/${d} de ${q}`, fr((q / d) * n));
    } },
];

export const OBJECTIFS: readonly Objectif[] = CATALOGUE;

/** Les objectifs d'une classe, rangés par rubrique, dans l'ordre du programme. */
export const objectifsDuNiveau = (niveau: Niveau): Objectif[] => CATALOGUE.filter((o) => o.niveau === niveau);

export const objectifParId = (id: string): Objectif | undefined => CATALOGUE.find((o) => o.id === id);

/** Un calcul de cet objectif. */
export const tirerCalcul = (o: Objectif, alea: Alea, tables: number[]): Calcul => ({ objectif: o.id, ...o.tirer(alea, tables) });
