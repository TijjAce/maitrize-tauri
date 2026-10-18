// La conjugaison du cours moyen, d'après le programme de français du cycle 3
// (2025) et ses exemples de réussite (Éduscol, 2025).
//
// Au CM1 : le présent, l'imparfait, le futur et le passé composé d'être,
// d'avoir, des verbes du premier et du deuxième groupe et des huit verbes
// irréguliers du troisième groupe — faire, aller, dire, venir, pouvoir,
// voir, vouloir, prendre — ; les variations du radical de certains verbes du
// premier groupe : un e muet ou un é à l'avant-dernière syllabe (lever,
// céder), les verbes en -yer, en -eler et -eter, en -cer et -ger. Au CM2 :
// le passé simple et le plus-que-parfait des mêmes verbes.
//
// Les verbes en -é- (céder) ne sont jamais mis au futur : l'orthographe
// rectifiée y écrit « cèdera », l'ancienne « cédera ». Pour la même raison,
// les verbes en -eler et -eter qui doublent leur consonne sont appeler et
// jeter et leurs composés, que les deux orthographes conjuguent de même.

import { formes as formesDuCycle2, PERSONNES, avecPronom } from "./conjugaison";

export type TempsCM = "present" | "imparfait" | "futur" | "passeCompose" | "passeSimple" | "plusQueParfait";
export const TEMPS_CM: { id: TempsCM; nom: string; au: string; classe: "CM1" | "CM2" }[] = [
  { id: "present", nom: "le présent", au: "au présent", classe: "CM1" },
  { id: "imparfait", nom: "l'imparfait", au: "à l'imparfait", classe: "CM1" },
  { id: "futur", nom: "le futur", au: "au futur", classe: "CM1" },
  { id: "passeCompose", nom: "le passé composé", au: "au passé composé", classe: "CM1" },
  { id: "passeSimple", nom: "le passé simple", au: "au passé simple", classe: "CM2" },
  { id: "plusQueParfait", nom: "le plus-que-parfait", au: "au plus-que-parfait", classe: "CM2" },
];
export const auTemps = (t: TempsCM) => TEMPS_CM.find((x) => x.id === t)!.au;

type Six = [string, string, string, string, string, string];

export const VERBES_IRREGULIERS_CM = ["faire", "aller", "dire", "venir", "pouvoir", "voir", "vouloir", "prendre"];
export const VERBES_2E_GROUPE = ["finir", "grandir", "choisir", "remplir", "réussir", "obéir", "rougir", "réfléchir", "bâtir", "applaudir"];
/** Les verbes du 1er groupe sans variation du radical. */
export const VERBES_1ER_GROUPE_REGULIERS = ["chanter", "jouer", "parler", "danser", "regarder", "marcher", "dessiner", "écouter", "aimer", "porter", "trouver", "arriver", "tomber", "rester", "entrer"];
/** Les verbes du 1er groupe dont le radical varie, rangés par sorte. */
export const VERBES_A_RADICAL_VARIABLE: Record<string, string[]> = {
  "e muet": ["lever", "mener", "peser", "semer", "acheter", "geler"],
  "é": ["céder", "espérer", "répéter", "compléter"],
  "-yer": ["nettoyer", "employer", "essuyer", "appuyer", "aboyer"],
  "-eler, -eter": ["appeler", "rappeler", "jeter", "rejeter"],
  "-cer": ["commencer", "lancer", "placer", "avancer"],
  "-ger": ["manger", "nager", "ranger", "partager"],
};
const SORTE_DU_VERBE = new Map(Object.entries(VERBES_A_RADICAL_VARIABLE).flatMap(([sorte, vs]) => vs.map((v) => [v, sorte] as [string, string])));
export const sorteDuRadical = (verbe: string) => SORTE_DU_VERBE.get(verbe) ?? null;

/** Les verbes conjugués avec être à la voix active : aller, venir, et quelques verbes du 1er groupe. */
export const AVEC_ETRE = new Set(["aller", "venir", "arriver", "tomber", "rester", "entrer"]);

const ETRE = {
  present: ["suis", "es", "est", "sommes", "êtes", "sont"], imparfait: ["étais", "étais", "était", "étions", "étiez", "étaient"],
  passeSimple: ["fus", "fus", "fut", "fûmes", "fûtes", "furent"],
} as const;
const AVOIR = {
  present: ["ai", "as", "a", "avons", "avez", "ont"], imparfait: ["avais", "avais", "avait", "avions", "aviez", "avaient"],
  passeSimple: ["eus", "eus", "eut", "eûmes", "eûtes", "eurent"],
} as const;

/** Le passé simple des huit verbes irréguliers. */
const PASSE_SIMPLE_IRREGULIER: Record<string, Six> = {
  faire: ["fis", "fis", "fit", "fîmes", "fîtes", "firent"], aller: ["allai", "allas", "alla", "allâmes", "allâtes", "allèrent"],
  dire: ["dis", "dis", "dit", "dîmes", "dîtes", "dirent"], venir: ["vins", "vins", "vint", "vînmes", "vîntes", "vinrent"],
  pouvoir: ["pus", "pus", "put", "pûmes", "pûtes", "purent"], voir: ["vis", "vis", "vit", "vîmes", "vîtes", "virent"],
  vouloir: ["voulus", "voulus", "voulut", "voulûmes", "voulûtes", "voulurent"], prendre: ["pris", "pris", "prit", "prîmes", "prîtes", "prirent"],
};
const PARTICIPES_IRREGULIERS: Record<string, string> = { faire: "fait", aller: "allé", dire: "dit", venir: "venu", pouvoir: "pu", voir: "vu", vouloir: "voulu", prendre: "pris", "être": "été", avoir: "eu" };

/** Le participe passé, au masculin singulier. */
export function participe(verbe: string): string {
  if (PARTICIPES_IRREGULIERS[verbe]) return PARTICIPES_IRREGULIERS[verbe];
  if (VERBES_2E_GROUPE.includes(verbe)) return verbe.slice(0, -1);
  return `${verbe.slice(0, -2)}é`;
}

/** L'accord du participe : masculin ou féminin, singulier ou pluriel. */
export const accorder = (p: string, feminin: boolean, pluriel: boolean) => `${p}${feminin ? "e" : ""}${pluriel && !/s$/.test(p) ? "s" : pluriel && feminin ? "s" : ""}`;

/** Le radical du 1er groupe devant une terminaison : le c prend une cédille, le g garde un e devant a, â et o. */
function devant(radical: string, terminaison: string): string {
  if (!/^[aâo]/.test(terminaison)) return radical;
  if (radical.endsWith("g")) return `${radical}e`;
  if (radical.endsWith("c")) return `${radical.slice(0, -1)}ç`;
  return radical;
}

/** Le radical d'un verbe du 1er groupe devant une terminaison muette (-e, -es, -ent) et au futur : il lève, j'appelle, il nettoie, il cède. */
function radicalMuet(verbe: string): string {
  const r = verbe.slice(0, -2), sorte = sorteDuRadical(verbe);
  if (sorte === "e muet") return r.replace(/e([^aeiouy]+)$/, "è$1");
  if (sorte === "é") return r.replace(/é([^aeiouyé]+)$/, "è$1");
  if (sorte === "-yer") return `${r.slice(0, -1)}i`;
  if (sorte === "-eler, -eter") return `${r}${r.slice(-1)}`;
  return r;
}

function premierGroupe(verbe: string, temps: TempsCM): Six {
  const r = verbe.slice(0, -2), muet = radicalMuet(verbe);
  const sur = (radicaux: [string, string, string, string, string, string], ts: Six) => ts.map((t, i) => devant(radicaux[i], t) + t) as Six;
  if (temps === "present") return sur([muet, muet, muet, r, r, muet], ["e", "es", "e", "ons", "ez", "ent"]);
  if (temps === "imparfait") return sur([r, r, r, r, r, r], ["ais", "ais", "ait", "ions", "iez", "aient"]);
  if (temps === "futur") {
    if (sorteDuRadical(verbe) === "é") throw new Error(`Au futur, ${verbe} s'écrit de deux façons : on ne le donne pas.`);
    const base = sorteDuRadical(verbe) ? `${muet}er` : verbe;
    return ["ai", "as", "a", "ons", "ez", "ont"].map((t) => base + t) as Six;
  }
  if (temps === "passeSimple") return sur([r, r, r, r, r, r], ["ai", "as", "a", "âmes", "âtes", "èrent"]);
  throw new Error(temps);
}

function deuxiemeGroupe(verbe: string, temps: TempsCM): Six {
  const r = verbe.slice(0, -2);
  const ts: Record<string, Six> = {
    present: ["is", "is", "it", "issons", "issez", "issent"], imparfait: ["issais", "issais", "issait", "issions", "issiez", "issaient"],
    passeSimple: ["is", "is", "it", "îmes", "îtes", "irent"],
  };
  if (temps === "futur") return ["ai", "as", "a", "ons", "ez", "ont"].map((t) => verbe + t) as Six;
  return ts[temps].map((t) => r + t) as Six;
}

/** Les six formes d'un verbe à un temps du cours moyen, sans le pronom ; au pluriel des temps composés avec être, l'accord au masculin. */
export function formesCM(verbe: string, temps: TempsCM): Six {
  if (temps === "passeCompose" || temps === "plusQueParfait") {
    const etre = AVEC_ETRE.has(verbe);
    const aux = etre ? (temps === "passeCompose" ? ETRE.present : ETRE.imparfait) : (temps === "passeCompose" ? AVOIR.present : AVOIR.imparfait);
    return aux.map((a, i) => `${a} ${etre ? accorder(participe(verbe), false, i >= 3) : participe(verbe)}`) as Six;
  }
  if (temps === "passeSimple") {
    if (verbe === "être") return [...ETRE.passeSimple] as Six;
    if (verbe === "avoir") return [...AVOIR.passeSimple] as Six;
    if (PASSE_SIMPLE_IRREGULIER[verbe]) return PASSE_SIMPLE_IRREGULIER[verbe];
    return VERBES_2E_GROUPE.includes(verbe) ? deuxiemeGroupe(verbe, temps) : premierGroupe(verbe, temps);
  }
  if (verbe === "être" || verbe === "avoir" || VERBES_IRREGULIERS_CM.includes(verbe)) return formesDuCycle2(verbe, temps);
  if (VERBES_2E_GROUPE.includes(verbe)) return deuxiemeGroupe(verbe, temps);
  return premierGroupe(verbe, temps);
}

export const conjugaisonCM = (verbe: string, temps: TempsCM) => formesCM(verbe, temps).map((f, i) => avecPronom(PERSONNES[i], f));

/**
 * Une forme décomposée : le radical, la marque de temps, la marque de
 * personne. À l'imparfait, -ai- ou -i- (je chant-ai-s, nous chant-i-ons) ;
 * au futur, -r- (je chante-r-ai, je fini-r-ai) ; au passé simple, comme les
 * exemples de réussite du CM2 les donnent : -ai, -a-, -â-, -è-, -i-, -î-,
 * -u-, -û-, -in-, -în- (je chant-ai, ils chant-è-rent, il v-in-t, nous
 * v-în-mes).
 */
export function marques(verbe: string, temps: "imparfait" | "futur" | "passeSimple", personne: number): { radical: string; temps: string; personne: string } {
  const forme = formesCM(verbe, temps)[personne];
  const PERSONNE: Record<string, string[]> = {
    imparfait: ["s", "s", "t", "ons", "ez", "ent"], futur: ["ai", "as", "a", "ons", "ez", "ont"],
    passeSimple: [/ai$/.test(forme) ? "" : "s", "s", /[aeiouâîû]$/.test(forme) ? "" : "t", "mes", "tes", "rent"],
  };
  const mp = PERSONNE[temps][personne];
  const reste = forme.slice(0, forme.length - mp.length);
  const mt = temps === "imparfait" ? (personne === 3 || personne === 4 ? "i" : "ai")
    : temps === "futur" ? "r"
      : (reste.match(/(ai|în|in|â|è|î|û|a|i|u)$/)?.[1] ?? "");
  return { radical: reste.slice(0, reste.length - mt.length), temps: mt, personne: mp };
}
