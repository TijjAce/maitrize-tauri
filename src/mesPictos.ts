// ── Mes pictos ─────────────────────────────────────────────────────────────
//
// Les pictos que l'enseignant garde pour lui : dessinés par l'IA, à la
// manière d'ARASAAC, quand ni ARASAAC ni Sclera n'ont le mot ; ou pris dans
// Sclera, que les ateliers ne savent pas chercher. On les retrouve ensuite
// partout où l'on cherche une image par son mot : les listes de mots, le
// choix d'un picto, le loto.
//
// Chacun a un numéro à lui, négatif comme les images de l'enseignant — la
// banque ARASAAC n'en a que de positifs —, mais durable : il se range dans
// une liste comme un pictogramme et revient après redémarrage. La plage du
// numéro dit d'où vient l'image sans rien relire : une feuille sait ainsi
// quoi écrire en bas, et ne prête jamais à ARASAAC un dessin de l'IA. Le
// PDF des jeux lit les mêmes plages (jeux_pdf.rs).
//
// L'image est un fichier de l'application ; sa fiche, le réglage
// « pictos:<numéro> ». L'un et l'autre voyagent d'un ordinateur à l'autre.

import type { PictoArasaac } from "./api";
import { infoBanque } from "./pictosAppoint";

export type OrigineMonPicto = "ia" | "sclera" | "bajard";

export interface MonPicto {
  id: number;
  mot: string;
  /** L'image, parmi les fichiers de l'application. */
  fichier: string;
  origine: OrigineMonPicto;
  /** « AAAA-MM-JJ ». */
  date: string;
  /** Ce qu'on a demandé à l'IA d'y voir : « un enfant debout sur une trottinette ». */
  precision?: string;
}

export const PREFIXE_MES_PICTOS = "pictos:";

/**
 * Les plages des numéros, une par origine, la première borne comprise : loin
 * sous ceux des images d'une séance de travail, et dans les entiers 32 bits.
 */
const PLAGES: [OrigineMonPicto, number, number][] = [
  ["ia", -1_000_000_000, -1_400_000_000],
  ["sclera", -1_400_000_000, -1_800_000_000],
  ["bajard", -1_800_000_000, -2_100_000_000],
];

/** D'où vient un picto gardé ; rien pour un autre numéro. */
export function origineDe(id: unknown): OrigineMonPicto | null {
  if (typeof id !== "number" || !Number.isInteger(id)) return null;
  return PLAGES.find(([, haut, bas]) => id <= haut && id > bas)?.[0] ?? null;
}
export const estMonPicto = (id: unknown): id is number => origineDe(id) !== null;

/** Un numéro neuf, dans la plage de son origine. */
export function nouvelIdMonPicto(origine: OrigineMonPicto, hasard: () => number = Math.random): number {
  const [, haut, bas] = PLAGES.find(([o]) => o === origine)!;
  return haut - Math.floor(hasard() * (haut - bas - 1));
}

/** Ce qu'on lit sur un picto gardé : une étiquette courte, et ce qu'elle veut dire. */
export const ETIQUETTES: Record<OrigineMonPicto, { court: string; long: string }> = {
  ia: { court: "IA", long: "Dessiné par l'IA à la manière d'ARASAAC — ce n'est pas un pictogramme ARASAAC" },
  sclera: { court: "Sclera", long: "Pris dans Sclera (sclera.be)" },
  bajard: { court: "Bajard", long: "Pris dans les consignes de F. Bajard" },
};

/** La clé d'un mot : sans majuscules ni accents, les espaces resserrés. */
export const cleDuMot = (mot: string) => mot.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Les fiches lues dans les réglages, par ordre alphabétique ; une fiche abîmée est écartée. */
export function lireFiches(reglages: Record<string, string>): MonPicto[] {
  const fiches: MonPicto[] = [];
  for (const [cle, brut] of Object.entries(reglages)) {
    if (!cle.startsWith(PREFIXE_MES_PICTOS) || !brut) continue;
    const id = Number(cle.slice(PREFIXE_MES_PICTOS.length));
    const origine = origineDe(id);
    if (!origine) continue;
    let o: unknown;
    try { o = JSON.parse(brut); } catch { continue; }
    if (!o || typeof o !== "object") continue;
    const f = o as Record<string, unknown>;
    const mot = typeof f.mot === "string" ? f.mot.trim() : "";
    const fichier = typeof f.fichier === "string" ? f.fichier : "";
    // Un nom de fichier, jamais un chemin.
    if (!mot || !/^[^/\\]+$/.test(fichier) || fichier.includes("..")) continue;
    const precision = typeof f.precision === "string" ? f.precision.trim() : "";
    fiches.push({ id, mot, fichier, origine, date: typeof f.date === "string" ? f.date : "", ...(precision ? { precision } : {}) });
  }
  return fiches.sort((a, b) => a.mot.localeCompare(b.mot, "fr") || b.date.localeCompare(a.date));
}

/** La fiche d'un picto, telle qu'elle s'écrit dans son réglage. */
export const ficheEcrite = (p: MonPicto) =>
  JSON.stringify({ mot: p.mot, fichier: p.fichier, date: p.date, ...(p.precision ? { precision: p.precision } : {}) });

/** Ceux dont le mot contient ce qu'on cherche, ceux qui le sont exactement d'abord ; tous si l'on ne cherche rien. */
export function chercherDans(liste: MonPicto[], q: string): MonPicto[] {
  const c = cleDuMot(q);
  if (!c) return [...liste];
  const exacts = liste.filter((p) => cleDuMot(p.mot) === c);
  return [...exacts, ...liste.filter((p) => !exacts.includes(p) && cleDuMot(p.mot).includes(c))];
}

/** Le picto gardé pour ce mot exactement : le plus récent, s'il y en a plusieurs. */
export function pourLeMot(liste: MonPicto[], mot: string): MonPicto | undefined {
  const c = cleDuMot(mot);
  return liste.filter((p) => cleDuMot(p.mot) === c).sort((a, b) => b.date.localeCompare(a.date))[0];
}

/** Un picto gardé sous la forme de ceux de la banque : il se range dans les mêmes listes. */
export const commePicto = (p: MonPicto, mot = p.mot): PictoArasaac => ({ id: p.id, mot, fichier: "" });

/** Une recherche par mots, complétée : ceux qu'ARASAAC n'a pas prennent le picto gardé pour eux. */
export function completer([trouves, absents]: [PictoArasaac[], string[]], miens: MonPicto[]): [PictoArasaac[], string[]] {
  const ajoutes: PictoArasaac[] = [];
  const encore: string[] = [];
  for (const mot of absents) {
    const p = pourLeMot(miens, mot);
    if (p) ajoutes.push(commePicto(p, mot)); else encore.push(mot);
  }
  return [[...trouves, ...ajoutes], encore];
}

const MENTION_IA = "Certains pictogrammes ont été dessinés par une intelligence artificielle (Mistral AI), "
  + "à la manière d'ARASAAC : ils n'en font pas partie.";

/** Ce que la feuille doit dire des pictos gardés qu'elle porte ; rien s'il n'y en a pas. */
export function mentionDeMesPictos(ids: Iterable<unknown>): string {
  const origines = new Set<OrigineMonPicto>();
  for (const id of ids) { const o = origineDe(id); if (o) origines.add(o); }
  const phrases: string[] = [];
  const banques = (["sclera", "bajard"] as const).filter((b) => origines.has(b)).map((b) => infoBanque(b).mention);
  if (banques.length) phrases.push(`Pictogrammes : ${banques.join(" ; ")}. Usage non commercial.`);
  if (origines.has("ia")) phrases.push(MENTION_IA);
  return phrases.join(" ");
}

// ── Lire et écrire ──
// L'API est chargée à la demande : le reste du module se teste sans elle.

/** Tous les pictos gardés, de cet ordinateur et des autres. */
export async function lireMesPictos(): Promise<MonPicto[]> {
  const { api } = await import("./api");
  return lireFiches(await api.settingsPrefixe(PREFIXE_MES_PICTOS).catch(() => ({})));
}

/** Garde une image dans Mes pictos, sous son mot. `base64` : un PNG. */
export async function garderMonPicto(o: { mot: string; base64: string; origine: OrigineMonPicto; precision?: string }): Promise<MonPicto> {
  const { api } = await import("./api");
  const mot = o.mot.trim();
  if (!mot) throw new Error("Écrivez le mot de ce picto.");
  const precision = o.precision?.trim() ?? "";
  const p: MonPicto = {
    id: nouvelIdMonPicto(o.origine), mot, fichier: await api.fichierSave("picto.png", o.base64), origine: o.origine,
    date: new Date().toISOString().slice(0, 10), ...(precision ? { precision } : {}),
  };
  await api.settingSet(PREFIXE_MES_PICTOS + p.id, ficheEcrite(p));
  return p;
}

/** Change le mot d'un picto gardé. */
export async function renommerMonPicto(p: MonPicto, mot: string): Promise<MonPicto> {
  const { api } = await import("./api");
  if (!mot.trim()) throw new Error("Écrivez le mot de ce picto.");
  const suite = { ...p, mot: mot.trim() };
  await api.settingSet(PREFIXE_MES_PICTOS + p.id, ficheEcrite(suite));
  return suite;
}

/**
 * Retire un picto de Mes pictos. Son image reste parmi les fichiers : ils
 * sont immuables et voyagent tels quels, l'effacer ici le ferait revenir de
 * l'autre ordinateur.
 */
export async function oublierMonPicto(p: MonPicto): Promise<void> {
  const { api } = await import("./api");
  await api.settingSet(PREFIXE_MES_PICTOS + p.id, "");
}

/** L'image d'un picto gardé, en data URL. */
export async function imageDeMonPicto(id: number): Promise<string> {
  const { api } = await import("./api");
  const cle = PREFIXE_MES_PICTOS + id;
  const [p] = lireFiches({ [cle]: (await api.settingGet(cle)) ?? "" });
  if (!p) throw new Error("Ce picto n'est plus dans Mes pictos.");
  return `data:image/png;base64,${await api.fichierRead(p.fichier)}`;
}

/** Les pictos de ces mots : ceux d'ARASAAC, puis, pour les mots qu'il n'a pas, ceux qu'on a gardés. */
export async function pictosDesMots(mots: string[]): Promise<[PictoArasaac[], string[]]> {
  const { api } = await import("./api");
  const r = await api.arasaacParMots(mots);
  return r[1].length ? completer(r, await lireMesPictos()) : r;
}

/** Une recherche dans la banque, précédée des pictos gardés qui répondent. */
export async function chercherPictos(q: string, limite = 40): Promise<PictoArasaac[]> {
  const { api } = await import("./api");
  // Sans la banque sur cet ordinateur, les pictos gardés répondent seuls.
  const [miens, banque] = await Promise.all([lireMesPictos(), api.arasaacChercher(q, limite).catch((): PictoArasaac[] => [])]);
  return [...(cleDuMot(q).length >= 2 ? chercherDans(miens, q).map((p) => commePicto(p)) : []), ...banque];
}
