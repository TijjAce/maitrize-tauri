// ── Les pronoms personnels sujets, pour le mur ────────────────────────────
//
// « Fais-en encore plus » (l'enseignant, 4 novembre 2026), après les tables
// de multiplication, la frise alphabétique et les tableaux de conjugaison.
//
// Guide « La grammaire du français du CP à la 6e » (Éduscol, 2022) : dès le CP,
// l'élève constitue des corpus de pronoms personnels sujets — « je, tu,
// il/elle, nous, vous, ils/elles » —, qui désignent des personnes ou des
// animaux, ou remplacent des groupes nominaux sujets, « la voiture ➔ elle ;
// les jouets ➔ ils », et cela « collectivement et sous la forme d'affichage
// en classe » ; au CE1, il en indique la personne et le nombre, le singulier
// d'abord, puis le pluriel ; au CE2, il distingue les deux emplois (p. 174).
// Ce que les élèves retiennent : le pronom indique la personne qui parle,
// celle à qui l'on parle, celle de qui l'on parle (p. 173).
//
// L'affiche suit ce tableau : singulier et pluriel en colonnes, les trois
// personnes en lignes, chaque pronom avec son pictogramme et, si l'on veut,
// un verbe du programme conjugué au présent ; dessous, les groupes nominaux
// que les pronoms remplacent, avec leur dessin.

import { ATTRIBUTION_ARASAAC, feuille } from "./cartesImprimables";
import { AU_PROGRAMME, formes } from "./conjugaison";
import { escapeHtml } from "./print";

export interface ReglagesPronoms {
  /** La colonne du pluriel : au CE1, on étudie d'abord le singulier. */
  pluriel: boolean;
  /** « 1re personne », « singulier », « pluriel » : nommés au CE1, perçus sans être nommés au CP. */
  noms: boolean;
  /** Qui parle, à qui l'on parle, de qui l'on parle. */
  roles: boolean;
  /** « on », avec il et elle. */
  on: boolean;
  /** Un verbe conjugué au présent avec chaque pronom ; vide, aucun. */
  verbe: string;
  /** Les groupes nominaux remplacés : « la voiture → elle », une ligne chacun. */
  remplacants: string;
  avecRemplacants: boolean;
  pictos: boolean;
  format: "mur" | "cahier";
}

/** Les exemples du guide (p. 173-174) : la voiture, les jouets, le lapin ; et des fleurs pour « elles ». */
export const REMPLACANTS_PAR_DEFAUT = "le lapin → il\nla voiture → elle\nles jouets → ils\nles fleurs → elles";

export const REGLAGES_PRONOMS: ReglagesPronoms = {
  pluriel: true, noms: true, roles: true, on: false, verbe: "chanter", remplacants: REMPLACANTS_PAR_DEFAUT, avecRemplacants: true, pictos: true, format: "mur",
};

/** Les verbes qu'on peut conjuguer sur l'affiche : ceux du programme, jusqu'au CE2. */
export const VERBES_DES_PRONOMS = AU_PROGRAMME.CE2.verbes;

export function reglagesPronomsSurs(brut: Partial<ReglagesPronoms> | null | undefined): ReglagesPronoms {
  const o = (brut && typeof brut === "object" ? brut : {}) as Partial<ReglagesPronoms>;
  const d = REGLAGES_PRONOMS;
  const oui = (v: unknown, defaut: boolean) => (typeof v === "boolean" ? v : defaut);
  return {
    pluriel: oui(o.pluriel, d.pluriel), noms: oui(o.noms, d.noms), roles: oui(o.roles, d.roles), on: oui(o.on, d.on),
    verbe: typeof o.verbe === "string" && (o.verbe === "" || VERBES_DES_PRONOMS.includes(o.verbe)) ? o.verbe : d.verbe,
    remplacants: typeof o.remplacants === "string" ? o.remplacants.slice(0, 600) : d.remplacants,
    avecRemplacants: oui(o.avecRemplacants, d.avecRemplacants), pictos: oui(o.pictos, d.pictos),
    format: o.format === "cahier" ? "cahier" : "mur",
  };
}

/** Une personne : ses pronoms au singulier, au pluriel, et ce qu'elle est dans l'échange. */
interface Personne { rang: string; role: string; singulier: string[]; pluriel: string[] }

export function personnes(r: Pick<ReglagesPronoms, "on">): Personne[] {
  return [
    { rang: "1re personne", role: "celle qui parle", singulier: ["je"], pluriel: ["nous"] },
    { rang: "2e personne", role: "celle à qui l'on parle", singulier: ["tu"], pluriel: ["vous"] },
    { rang: "3e personne", role: "celle de qui l'on parle", singulier: r.on ? ["il", "elle", "on"] : ["il", "elle"], pluriel: ["ils", "elles"] },
  ];
}

/** « je chante », « j'aime », « elle chante » : le pronom et le verbe au présent. */
export function pronomEtVerbe(pronom: string, verbe: string): string {
  const rang = { je: 0, tu: 1, il: 2, elle: 2, on: 2, nous: 3, vous: 4, ils: 5, elles: 5 }[pronom] ?? 2;
  const forme = formes(verbe, "present")[rang];
  return pronom === "je" && /^[aeiouyéèêh]/i.test(forme) ? `j'${forme}` : `${pronom} ${forme}`;
}

export interface Remplacant { groupe: string; pronom: string; dessin: string }

/** « la voiture → elle » ; aussi « -> », « = » ou « : ». Le dessin : le nom du groupe. */
export function lireRemplacants(saisie: string): Remplacant[] {
  return saisie.split("\n").map((ligne) => ligne.split(/\s*(?:→|->|=>|=|:)\s*/)).filter((p) => p.length === 2 && p[0].trim() && p[1].trim())
    .slice(0, 8).map(([groupe, pronom]) => {
      const mots = groupe.trim().split(/\s+/);
      return { groupe: groupe.trim(), pronom: pronom.trim(), dessin: mots[mots.length - 1].toLowerCase() };
    });
}

/** Les mots dont on cherche le dessin : les pronoms, et les noms des groupes avec leur singulier. */
export function motsADessinerPronoms(brut: Partial<ReglagesPronoms>): string[] {
  const r = reglagesPronomsSurs(brut);
  const pronoms = personnes(r).flatMap((p) => [...p.singulier, ...(r.pluriel ? p.pluriel : [])]);
  const noms = r.avecRemplacants ? lireRemplacants(r.remplacants).flatMap((x) => [x.dessin, x.dessin.replace(/[sx]$/, "")]) : [];
  return [...new Set([...pronoms, ...noms])];
}

/** Le dessin d'un nom : le sien, sinon celui de son singulier. */
const dessinDe = (mot: string, images: Record<string, string>) => images[mot] ?? images[mot.replace(/[sx]$/, "")];

function pageDesPronoms(r: ReglagesPronoms, images: Record<string, string>): string {
  const avecImages = r.pictos && Object.keys(images).length > 0;
  const verbe = r.verbe;
  const cellule = (pronoms: string[], classes: string) => `<div class="pp-case ${classes}">`
    + (avecImages ? `<div class="pp-pictos">${pronoms.map((p) => (images[p] ? `<img class="pp-picto" src="${escapeHtml(images[p])}" alt="">` : "")).join("")}</div>` : "")
    + `<div class="pp-pronom">${pronoms.map(escapeHtml).join(", ")}</div>`
    + (verbe ? `<div class="pp-exemple">${pronoms.map((p) => escapeHtml(pronomEtVerbe(p, verbe))).join(", ")}</div>` : "")
    + `</div>`;
  // Une colonne pour nommer la personne, si on la nomme ou si l'on dit son rôle ; une ligne de tête si l'on nomme le nombre.
  const etiquettes = r.noms || r.roles;
  const tete = r.noms
    ? `${etiquettes ? `<div class="pp-coin"></div>` : ""}<div class="pp-nombre">singulier</div>${r.pluriel ? `<div class="pp-nombre pp-pl">pluriel</div>` : ""}`
    : "";
  const lignes = personnes(r).map((p, k) => {
    const haut = !r.noms && k === 0 ? " pp-haut" : "";
    const etiquette = etiquettes
      ? `<div class="pp-personne${haut}">${r.noms ? `<b>${escapeHtml(p.rang)}</b>` : ""}${r.roles ? `<span>${escapeHtml(p.role)}</span>` : ""}</div>`
      : "";
    return etiquette + cellule(p.singulier, haut) + (r.pluriel ? cellule(p.pluriel, `pp-pl${haut}`) : "");
  }).join("");
  const grille = `<div class="pp-grille" style="grid-template-columns: ${etiquettes ? "41mm " : ""}repeat(${r.pluriel ? 2 : 1}, 1fr); `
    + `grid-template-rows: ${r.noms ? "auto " : ""}repeat(3, 1fr)">${tete}${lignes}</div>`;
  const remplacants = r.avecRemplacants ? lireRemplacants(r.remplacants) : [];
  const bas = remplacants.length
    ? `<div class="pp-remplace"><div class="pp-sous-titre">Il remplace un groupe nominal</div><div class="pp-paires">`
      + remplacants.map((x) => {
        const img = avecImages ? dessinDe(x.dessin, images) : undefined;
        return `<div class="pp-paire">${img ? `<img class="pp-dessin" src="${escapeHtml(img)}" alt="">` : ""}`
          + `<span class="pp-groupe">${escapeHtml(x.groupe)}</span><span class="pp-fleche">→</span><span class="pp-pronom-court">${escapeHtml(x.pronom)}</span></div>`;
      }).join("")
      + `</div></div>`
    : "";
  return `<div class="pp-page"><div class="pp-titre">Les pronoms personnels sujets</div>${grille}${bas}${avecImages ? ATTRIBUTION_ARASAAC : ""}</div>`;
}

export function htmlPronoms(brut: Partial<ReglagesPronoms>, images: Record<string, string> = {}): string {
  const r = reglagesPronomsSurs(brut);
  const page = pageDesPronoms(r, images);
  return feuille(r.format === "cahier"
    ? `<div class="page pp-planche">${`<div class="pp-petit">${page}</div>`.repeat(4)}</div>`
    : `<div class="page">${page}</div>`, "pp");
}

export const titrePronoms = (brut: Partial<ReglagesPronoms>) =>
  reglagesPronomsSurs(brut).pluriel ? "Les pronoms personnels sujets" : "Les pronoms personnels sujets du singulier";

const NOIR = "#1c2233";
const BLEU = "#2a6fd6";
const POLICE_SCRIPT = `"Andika", "Andika New Basic", "Century Gothic", "Avenir Next", "Helvetica Neue", Arial, sans-serif`;

export const STYLE_PRONOMS = `
  /* La page prend toute la largeur utile : sans la marge du document (voir print.ts), qui la faisait réduire et décentrer. */
  @media print { body { padding: 0; } }
  .feuille.pp .pp-page { width: 182mm; height: 250mm; margin: 0 auto; box-sizing: border-box; display: flex; flex-direction: column; gap: 4mm;
    color: ${NOIR}; font-family: ${POLICE_SCRIPT}; }
  .feuille.pp .pp-titre { font-size: 10mm; font-weight: 800; text-align: center; line-height: 1.15; }
  .feuille.pp .pp-grille { flex: 1; display: grid; border: 1mm solid ${NOIR}; border-radius: 3mm;
    overflow: hidden; min-height: 0; }
  .feuille.pp .pp-coin, .feuille.pp .pp-nombre { background: #f1f3f8; border-bottom: 0.6mm solid ${NOIR}; }
  .feuille.pp .pp-nombre { font-size: 6mm; font-weight: 800; text-align: center; padding: 2mm; color: ${BLEU}; }
  .feuille.pp .pp-personne { display: flex; flex-direction: column; justify-content: center; gap: 1mm; padding: 2mm 3mm; background: #f8f9fc;
    border-right: 0.6mm solid ${NOIR}; font-size: 4.4mm; line-height: 1.2; }
  .feuille.pp .pp-personne b { font-size: 5mm; }
  .feuille.pp .pp-personne span { color: #4a5068; }
  .feuille.pp .pp-case { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.5mm; padding: 3mm 2mm; text-align: center; }
  .feuille.pp .pp-case, .feuille.pp .pp-personne { border-top: 0.4mm solid #d5dae6; }
  .feuille.pp .pp-haut { border-top: none; }
  .feuille.pp .pp-pl { border-left: 0.4mm solid #d5dae6; }
  .feuille.pp .pp-pictos { display: flex; gap: 2mm; }
  .feuille.pp .pp-picto { width: 16mm; height: 16mm; object-fit: contain; }
  .feuille.pp .pp-pronom { font-size: 10.5mm; font-weight: 800; line-height: 1; }
  .feuille.pp .pp-exemple { font-size: 5.2mm; color: #4a5068; line-height: 1.3; }
  .feuille.pp .pp-remplace { border: 0.8mm solid #cfd4e2; border-radius: 3mm; padding: 3mm 4mm; }
  .feuille.pp .pp-sous-titre { font-size: 5.5mm; font-weight: 800; color: ${BLEU}; margin-bottom: 2mm; }
  .feuille.pp .pp-paires { display: grid; grid-template-columns: 1fr 1fr; gap: 2.5mm 6mm; }
  .feuille.pp .pp-paire { display: flex; align-items: center; gap: 2.5mm; font-size: 6mm; font-weight: 600; min-width: 0; }
  .feuille.pp .pp-dessin { width: 12mm; height: 12mm; object-fit: contain; flex: none; }
  .feuille.pp .pp-groupe { white-space: nowrap; }
  .feuille.pp .pp-fleche { color: #8a90a2; }
  .feuille.pp .pp-pronom-court { font-weight: 800; color: ${BLEU}; }
  /* Pour le cahier : quatre par planche, dans leur pointillé de découpe. */
  .feuille.pp .pp-planche { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; height: 250mm; box-sizing: border-box; }
  .feuille.pp .pp-petit { zoom: 0.48; outline: 1mm dashed #9aa0b4; outline-offset: -1.5mm; box-sizing: border-box; overflow: hidden;
    display: flex; align-items: center; justify-content: center; }
`;
