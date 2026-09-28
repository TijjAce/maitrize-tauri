// Les nombres en lettres, jusqu'aux milliards : ce que les cartes des
// nombres, les fractions, les cubes et la numération du cycle 3 écrivent.
//
// Orthographe d'usage : « deux cents », « deux cent un », « mille » invariable,
// « quatre-vingts » avec son s quand rien ne suit — et sans devant « mille »
// (« quatre-vingt mille »), mais avec devant « millions », qui est un nom.

const UNITES = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize"];
const DIZAINES = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];

/** « quatre-vingts », « deux cents » perdent leur s devant « mille ». */
const sansS = (t: string) => t.replace(/(vingt|cent)s$/, "$1");

/** Les millions et les milliards : des noms, qui prennent le pluriel et gardent le s de ce qui précède. */
function grand(n: number, base: number, un: string, plusieurs: string): string {
  const q = Math.floor(n / base), reste = n % base;
  const tete = q === 1 ? `un ${un}` : `${nombreEnLettres(q)} ${plusieurs}`;
  return reste ? `${tete} ${nombreEnLettres(reste)}` : tete;
}

export function nombreEnLettres(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 999_999_999_999) return String(n);
  if (n >= 1_000_000_000) return grand(n, 1_000_000_000, "milliard", "milliards");
  if (n >= 1_000_000) return grand(n, 1_000_000, "million", "millions");
  if (n >= 1000) {
    const milliers = Math.floor(n / 1000), reste = n % 1000;
    const tete = milliers === 1 ? "mille" : `${sansS(nombreEnLettres(milliers))} mille`;
    return reste ? `${tete} ${nombreEnLettres(reste)}` : tete;
  }
  if (n >= 100) {
    const centaines = Math.floor(n / 100), reste = n % 100;
    const tete = centaines === 1 ? "cent" : `${UNITES[centaines]} cent`;
    if (reste) return `${tete} ${nombreEnLettres(reste)}`;
    return centaines === 1 ? tete : `${tete}s`;
  }
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
