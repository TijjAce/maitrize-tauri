// Les nombres en lettres, jusqu'à quatre-vingt-dix-neuf : ce que les cartes
// des nombres et des fractions écrivent sous le chiffre.

const UNITES = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize"];
const DIZAINES = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];

export function nombreEnLettres(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 99) return String(n);
  if (n <= 16) return UNITES[n];
  if (n < 20) return `dix-${UNITES[n - 10]}`;
  const d = Math.floor(n / 10), u = n % 10;
  if (d === 7 || d === 9) {
    // soixante-dix-sept, quatre-vingt-onze : la dizaine précédente et la suite de dix.
    const reste = n - (d - 1) * 10; // 10..19
    const fin = reste <= 16 ? UNITES[reste] : `dix-${UNITES[reste - 10]}`;
    if (d === 7 && reste === 11) return "soixante et onze";
    return `${DIZAINES[d - 1]}-${fin}`;
  }
  if (u === 0) return d === 8 ? "quatre-vingts" : DIZAINES[d];
  if (u === 1 && d !== 8) return `${DIZAINES[d]} et un`;
  return `${DIZAINES[d]}-${UNITES[u]}`;
}

const ORDINAUX: Record<number, [string, string]> = {
  2: ["demi", "demis"], 3: ["tiers", "tiers"], 4: ["quart", "quarts"], 5: ["cinquième", "cinquièmes"],
  6: ["sixième", "sixièmes"], 7: ["septième", "septièmes"], 8: ["huitième", "huitièmes"], 9: ["neuvième", "neuvièmes"],
  10: ["dixième", "dixièmes"], 12: ["douzième", "douzièmes"], 100: ["centième", "centièmes"],
};

/** « trois quarts », « un demi », « cinq dixièmes ». */
export function fractionEnLettres(k: number, n: number): string {
  const part = ORDINAUX[n] ?? [`${nombreEnLettres(n)}ième`, `${nombreEnLettres(n)}ièmes`];
  return `${nombreEnLettres(k)} ${k > 1 ? part[1] : part[0]}`;
}
