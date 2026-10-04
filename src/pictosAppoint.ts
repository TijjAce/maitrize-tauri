// Les banques d'appoint des consignes en pictos.
//
// ARASAAC ne dessine pas tous les verbes des consignes. Quand il en manque un,
// on le cherche dans les consignes de François Bajard, puis dans Sclera — deux
// banques d'usage libre en classe, que l'ordinateur télécharge depuis leur
// site (voir pictos_appoint.rs). Un picto d'ARASAAC se désigne par son numéro ;
// celui d'une banque d'appoint, par sa banque et son fichier :
// « bajard:Colorie01.png », « sclera:compter.png ».
//
// Le lexique des verbes passe d'un ordinateur à l'autre, pas les banques : on
// garde donc, avec lui, une copie de chaque image d'appoint qu'il emploie. Le
// second ordinateur imprime ainsi la feuille sans avoir rien téléchargé.

import type { BanqueAppoint, PictoAppoint } from "./api";

/** Un pictogramme : son numéro dans ARASAAC, ou « banque:fichier » dans une banque d'appoint. */
export type RefPicto = number | string;

export interface InfoBanque {
  cle: BanqueAppoint;
  /** Le nom qu'on lit à l'écran. */
  nom: string;
  /** Ce que pèse son téléchargement. */
  taille: string;
  /** Ce que sa licence demande d'écrire sur la feuille. */
  mention: string;
}

/** Les banques d'appoint, dans l'ordre où l'on y cherche. */
export const BANQUES_APPOINT: InfoBanque[] = [
  { cle: "bajard", nom: "Consignes de F. Bajard", taille: "0,8 Mo", mention: "François Bajard (ressources-ecole-inclusive.org), licence CC BY-NC-SA 4.0" },
  { cle: "sclera", nom: "Sclera", taille: "77 Mo", mention: "Sclera (www.sclera.be), licence CC BY-NC 2.0 BE" },
];

const REF_APPOINT = /^(bajard|sclera):[^/\\]+$/;

/** La banque d'un picto : « arasaac » pour un numéro, sinon celle de sa référence ; rien pour ce qui n'en est pas un. */
export function banqueDe(ref: unknown): "arasaac" | BanqueAppoint | null {
  if (typeof ref === "number") return Number.isInteger(ref) && ref > 0 ? "arasaac" : null;
  if (typeof ref === "string" && REF_APPOINT.test(ref)) return ref.slice(0, ref.indexOf(":")) as BanqueAppoint;
  return null;
}

export const infoBanque = (cle: BanqueAppoint): InfoBanque => BANQUES_APPOINT.find((b) => b.cle === cle)!;

/** Où se garde la copie d'une image d'appoint : un réglage partagé, comme le lexique. */
export const cleImageAppoint = (ref: string) => `caa:picto:${ref}`;

/** L'image d'un picto d'appoint, en data URL : sa copie gardée, sinon la banque de cet ordinateur. */
export async function chargerImageAppoint(ref: string): Promise<string> {
  const { api } = await import("./api");
  const gardee = await api.settingGet(cleImageAppoint(ref)).catch(() => null);
  return `data:image/png;base64,${gardee || await api.pictosAppointImage(ref)}`;
}

/** Garde avec le lexique la copie d'une image d'appoint qu'il vient de prendre. Rien à faire pour ARASAAC. */
export async function garderImageAppoint(ref: RefPicto): Promise<void> {
  if (typeof ref !== "string") return;
  const { api } = await import("./api");
  if (await api.settingGet(cleImageAppoint(ref)).catch(() => null)) return;
  await api.settingSet(cleImageAppoint(ref), await api.pictosAppointImage(ref));
}

const MENTION_ARASAAC = "ARASAAC (arasaac.org) — Gouvernement d'Aragon, licence CC BY-NC-SA";
/** Le mot qui dit qu'une feuille cite déjà une banque. */
const CITEE: Record<"arasaac" | BanqueAppoint, string> = { arasaac: "ARASAAC", bajard: "Bajard", sclera: "Sclera" };

/**
 * La mention qu'exigent les licences des pictos posés sur une feuille, pour
 * les banques qu'elle ne cite pas déjà ; rien s'il n'y a rien à dire. La
 * classe est celle du style de la feuille qui la porte.
 */
export function mentionDesPictos(refs: RefPicto[], feuille = "", classe = "consigne-attribution"): string {
  const banques = (["arasaac", "bajard", "sclera"] as const)
    .filter((b) => refs.some((r) => banqueDe(r) === b))
    .filter((b) => !feuille.includes(CITEE[b]));
  if (!banques.length) return "";
  const qui = banques.map((b) => (b === "arasaac" ? MENTION_ARASAAC : infoBanque(b).mention));
  return `<div class="${classe}">Pictogrammes : ${qui.join(" ; ")}. Usage non commercial.</div>`;
}

/** Les pictos trouvés dans une banque d'appoint, par mot : le premier qui répond l'emporte. */
export function parMot(trouves: PictoAppoint[]): Map<string, string> {
  const sortie = new Map<string, string>();
  for (const p of trouves) {
    const cle = p.mot.trim().toLowerCase();
    if (!sortie.has(cle)) sortie.set(cle, p.reference);
  }
  return sortie;
}
