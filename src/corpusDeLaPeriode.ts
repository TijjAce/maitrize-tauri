// Les mots de la période (demande de l'enseignant, 31 octobre 2026 : « ajoute
// une case avec corpus pertinent pour travailler la compétence en fonction de
// la période »).
//
// Une carte de plus dans la question des mots de l'assistant (voir
// AssistantDesMots) : des mots choisis pour ce que l'atelier fait travailler
// — les attaques, les rimes, le nombre de syllabes, les syllabes qui
// s'enchaînent… —, à la mesure de la classe et de la période :
// - des mots plus courts en début d'année, plus longs ensuite ;
// - des attaques d'une seule consonne, puis des attaques complexes (tr, bl) ;
// - au premier son, les consonnes qu'on peut tenir (mmm, sss) avant les
//   occlusives, comme le guide de maternelle (2020) et le guide du CP ;
// - au CP, pour les mots écrits en gestes, seulement des mots qu'on sait
//   déchiffrer avec ce que la progression a fait apprendre jusqu'à la fin de
//   la période ; les lotos, les dominos, l'intrus se jouent à l'oral.
// Les mots viennent des listes de l'application — d'abord les mots des sons,
// des exemples et des syllabes, choisis à la main, puis les mots
// déchiffrables — ; seuls restent les noms que la banque illustre, groupés
// pour que le jeu marche : des attaques qui se répondent, des syllabes qui
// s'enchaînent.

import { decouper } from "./decoupageCgp";
import { MOTS_A_SYLLABES, MOTS_EXEMPLE } from "./exemplesDesAteliers";
import { coderMot, gesteDe, legendeDuGeste } from "./gestesBM";
import { melanger } from "./hasard";
import { nbSyllabes, pairesQuiSenchainent, type ModeIntrus, type MotImage } from "./jeuxSons";
import { SONS } from "./lectureSons";
import { sonDuMot, type UniteLoto } from "./lotosDesSons";
import { pictosDesMots } from "./mesPictos";
import { MOTS_DECHIFFRABLES } from "./motsDechiffrables";
import { ETAPES, dechiffrable, vuesJusqua } from "./progressionCgp";

/** Ce que l'atelier fait travailler, et donc ce que ses mots doivent permettre. */
export type CompetenceDuCorpus =
  /** `differents` : combien de sons différents il faut au moins — une planche de loto de 9 cases en demande 9. */
  | { sorte: "son"; unite: UniteLoto; differents?: number }
  | { sorte: "syllabes"; maximum: number }
  | { sorte: "enchainement" }
  | { sorte: "intrus"; mode: ModeIntrus }
  | { sorte: "geste"; son: string };

/** Ce qu'on dit de la compétence sur la carte : « pour travailler les attaques ». */
export function ceQuOnTravaille(c: CompetenceDuCorpus): string {
  if (c.sorte === "son") {
    return {
      attaque: "les attaques", rime: "les rimes", syllabeAttaque: "les syllabes d'attaque", syllabeFin: "les syllabes de fin",
      phonemeAttaque: "le premier son", phonemeFin: "le dernier son",
    }[c.unite];
  }
  if (c.sorte === "syllabes") return "le nombre de syllabes";
  if (c.sorte === "enchainement") return "les syllabes qui s'enchaînent";
  if (c.sorte === "intrus") return c.mode === "rime" ? "la dernière syllabe" : "la première syllabe";
  const g = gesteDe(c.son);
  return g ? `le son ${legendeDuGeste(g, false)}` : "les gestes des sons";
}

// ── La classe et la période ──

const NIVEAUX = ["PS", "MS", "GS", "CP", "CE1", "CE2", "CM1", "CM2"];

/** La classe dont le corpus prend la mesure : la plus jeune — une classe à plusieurs niveaux travaille d'abord pour ses plus jeunes. */
export function niveauDuCorpus(niveaux: readonly string[]): string {
  return NIVEAUX.find((n) => niveaux.includes(n)) ?? "GS";
}

/** Combien de syllabes au plus, selon la classe et la période : de courts mots à la rentrée, de plus longs ensuite. */
export function syllabesAuPlus(niveau: string, periode: number): number {
  if (niveau === "PS" || niveau === "MS") return periode <= 3 ? 2 : 3;
  if (niveau === "GS") return periode <= 1 ? 2 : periode <= 4 ? 3 : 4;
  return periode <= 1 ? 2 : periode <= 3 ? 3 : 4;
}

/** Les débuts de l'année, où l'on garde les attaques d'une seule consonne et, au premier son, celles qu'on peut tenir. */
const debutDAnnee = (niveau: string, periode: number) => periode <= (NIVEAUX.indexOf(niveau) <= 2 ? 3 : 2);

/** Les sons qu'on peut tenir en les disant — les voyelles, et mmm, lll, rrr, sss… — : on les entend mieux en tête de mot. */
const QUI_SE_TIENNENT = new Set(["a", "e", "i", "o", "u", "é", "è", "l", "r", "m", "n", "s", "f", "ch", "v", "z", "j"]);

const VUES = new Map<number, ReadonlySet<string>>();
/** Au CP, un mot qu'on sait déchiffrer à la fin de la période : il ne demande que ce que la progression a fait apprendre. */
export function dechiffrableEnPeriode(mot: string, periode: number): boolean {
  let vues = VUES.get(periode);
  if (!vues) {
    const e = ETAPES.find((x) => x.id === `p${Math.min(5, Math.max(1, periode))}-revisions`);
    vues = e ? vuesJusqua(e) : new Set<string>();
    VUES.set(periode, vues);
  }
  return dechiffrable(decouper(mot), vues);
}

// ── Les mots ──

const propres = (liste: readonly string[]) =>
  liste.map((m) => m.trim().toLowerCase()).filter((m) => m.length >= 3 && /^[a-zàâäçéèêëîïôöùûüÿœæ-]+$/.test(m));

/** Les mots choisis à la main : ceux des sons, des exemples, des syllabes — des choses qu'on dessine et qu'on nomme. */
const CHOISIS: ReadonlySet<string> = new Set(propres([
  ...SONS.flatMap((s) => s.mots),
  ...MOTS_A_SYLLABES,
  ...Object.values(MOTS_EXEMPLE).flat().map((x: unknown) => (typeof x === "string" ? x : (x as { mot?: string }).mot ?? "")),
]));

/** Tous les mots que l'application connaît : les choisis d'abord, puis les mots déchiffrables. */
const RESERVOIR: readonly string[] = [...new Set([...CHOISIS, ...propres(MOTS_DECHIFFRABLES)])];

const syllabesDe = (mot: string) => nbSyllabes({ id: null, mot }, false);

/**
 * Les mots qui conviennent à la classe et à la période, avant de chercher
 * leurs images : assez courts, porteurs de ce que l'atelier travaille — une
 * attaque, le son étudié —, et, écrits en gestes au CP, déchiffrables.
 */
export function candidatsDeLaPeriode(niveau: string, periode: number, c: CompetenceDuCorpus): string[] {
  const auPlus = c.sorte === "syllabes" ? Math.min(syllabesAuPlus(niveau, periode), c.maximum) : syllabesAuPlus(niveau, periode);
  const debut = debutDAnnee(niveau, periode);
  return RESERVOIR.filter((mot) => {
    if (syllabesDe(mot) > auPlus) return false;
    if (c.sorte === "geste" && niveau === "CP" && !dechiffrableEnPeriode(mot, periode)) return false;
    if (c.sorte === "son") {
      const son = sonDuMot(mot, c.unite);
      if (!son) return false;
      if (debut && c.unite === "attaque" && son.cle.includes(".")) return false;
      if (debut && c.unite === "phonemeAttaque" && !QUI_SE_TIENNENT.has(son.cle)) return false;
    }
    if (c.sorte === "geste") return gesteDe(c.son) ? coderMot(mot).some((p) => p.geste === c.son) : coderMot(mot).length <= 6;
    return true;
  });
}

/** Des mots rangés par une clé, chaque groupe mélangé. */
function parCle(mots: readonly MotImage[], cle: (m: MotImage) => string | null, r: () => number): MotImage[][] {
  const groupes = new Map<string, MotImage[]>();
  for (const m of melanger(r, mots)) {
    const k = cle(m);
    if (k) groupes.set(k, [...(groupes.get(k) ?? []), m]);
  }
  return [...groupes.values()];
}

/**
 * Le corpus, parmi des mots illustrés : groupé pour que le jeu marche. Des
 * attaques ou des rimes qui se répondent, deux ou trois mots chacune ; des
 * mots d'une, deux, trois syllabes en nombre égal ; des paires qui
 * s'enchaînent ; des lignes de trois mots qui se ressemblent, et des intrus.
 */
export function choisirLeCorpus(mots: readonly MotImage[], c: CompetenceDuCorpus, combien: number, r: () => number): MotImage[] {
  // D'abord les mots choisis à la main ; s'ils ne suffisent pas, tous.
  const choisis = choisirParmi(mots.filter((m) => CHOISIS.has(m.mot)), c, combien, r);
  return choisis.length >= combien ? choisis : choisirParmi(mots, c, combien, r);
}

function choisirParmi(mots: readonly MotImage[], c: CompetenceDuCorpus, combien: number, r: () => number): MotImage[] {
  if (c.sorte === "son" || c.sorte === "intrus") {
    const unite: UniteLoto = c.sorte === "son" ? c.unite : c.mode === "rime" ? "syllabeFin" : "syllabeAttaque";
    // Autant de sons différents que le jeu en demande : deux mots chacun s'il en faut beaucoup, trois sinon.
    const parSon = c.sorte === "son" ? Math.max(2, Math.min(3, Math.floor(combien / Math.max(1, c.differents ?? 6)))) : 3;
    const groupes = parCle(mots, (m) => sonDuMot(m.mot, unite)?.cle ?? null, r)
      .filter((g) => g.length >= (c.sorte === "son" ? 2 : 3))
      .sort((a, b) => b.length - a.length);
    const pris: MotImage[] = [];
    // L'intrus : trois mots qui se ressemblent par ligne, et un mot d'ailleurs.
    const lignes = c.sorte === "intrus" ? Math.floor(combien / 4) : Infinity;
    for (const g of groupes.slice(0, lignes)) {
      if (pris.length >= combien) break;
      pris.push(...g.slice(0, Math.min(parSon, combien - pris.length)));
    }
    if (c.sorte === "intrus") {
      const deja = new Set(pris.map((m) => m.mot));
      pris.push(...melanger(r, mots.filter((m) => !deja.has(m.mot))).slice(0, Math.max(0, combien - pris.length)));
    }
    return pris;
  }
  if (c.sorte === "syllabes") {
    const tas = Array.from({ length: c.maximum }, (_, k) => melanger(r, mots.filter((m) => syllabesDe(m.mot) === k + 1)));
    const pris: MotImage[] = [];
    for (let i = 0; pris.length < combien && tas.some((t) => t.length > i); i++) {
      for (const t of tas) if (t[i] && pris.length < combien) pris.push(t[i]);
    }
    return pris;
  }
  if (c.sorte === "enchainement") return pairesQuiSenchainent([...mots], r).flat().slice(0, combien);
  return melanger(r, mots).slice(0, combien);
}

/**
 * Le corpus illustré : parmi les candidats, les noms que la banque dessine —
 * pas les verbes ni les adjectifs, qu'une image ne fait pas nommer —, puis
 * groupés (voir choisirLeCorpus).
 */
export async function corpusIllustre(niveau: string, periode: number, c: CompetenceDuCorpus, combien: number, r: () => number = Math.random): Promise<MotImage[]> {
  const candidats = candidatsDeLaPeriode(niveau, periode, c);
  const [trouves] = await pictosDesMots(candidats);
  const noms = new Map(trouves.filter((p) => !p.nature || p.nature === "nom").map((p) => [p.mot.toLowerCase(), p.id]));
  return choisirLeCorpus(candidats.flatMap((mot) => (noms.has(mot) ? [{ id: noms.get(mot)!, mot }] : [])), c, combien, r);
}
