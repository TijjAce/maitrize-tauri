// Supports visuels : tableau d'économie de jetons, « d'abord / ensuite »,
// scénario social, et le minuteur visuel.
//
// Ce sont des outils de structuration pour les élèves qui ont besoin de voir
// ce qu'on attend d'eux et ce qui vient ensuite — notamment les élèves
// autistes. Chaque support s'imprime (pour être plastifié) à partir de
// pictogrammes ARASAAC que l'enseignant choisit ; sans la banque, les cases
// portent simplement le mot.

import { escapeHtml } from "./print";

/** Un pictogramme posé sur un support : l'image ARASAAC et le mot écrit dessous. */
export interface PictoPose { id: number | null; mot: string }
/** Images des pictogrammes, par identifiant ARASAAC, en data URL. */
export type Images = Record<number, string>;

export const ATTRIBUTION_ARASAAC =
  "Pictogrammes : Sergio Palao, ARASAAC (arasaac.org), propriété du Gouvernement d'Aragon, licence CC BY-NC-SA. Usage non commercial.";

export const pictoVide = (): PictoPose => ({ id: null, mot: "" });

/** « de Tom », « d'Adam » : l'élision devant une voyelle. */
export const dePrenom = (prenom: string) => {
  const p = prenom.trim();
  return /^[aeiouyàâäéèêëîïôöûüæœ]/i.test(p) ? `d'${p}` : `de ${p}`;
};

// Les réglages reviennent du stockage de l'ordinateur ou de l'autre poste,
// parfois d'une version plus ancienne : chaque champ est vérifié.
const objet = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {});
const texte = (v: unknown, defaut = "") => (typeof v === "string" ? v : defaut);
const booleen = (v: unknown, defaut: boolean) => (typeof v === "boolean" ? v : defaut);
const entier = (v: unknown, min: number, max: number, defaut: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : defaut;
const parmi = <T extends string>(v: unknown, valeurs: readonly T[], defaut: T): T =>
  (valeurs.includes(v as T) ? (v as T) : defaut);
export const couleurValide = (v: unknown, defaut: string) =>
  (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : defaut);

export function normaliserPicto(v: unknown): PictoPose {
  const o = objet(v);
  return { id: typeof o.id === "number" && Number.isInteger(o.id) && o.id >= 0 ? o.id : null, mot: texte(o.mot) };
}

/** Les identifiants à charger pour imprimer. */
export const idsDes = (pictos: (PictoPose | null | undefined)[]) =>
  [...new Set(pictos.map((p) => p?.id).filter((id): id is number => typeof id === "number"))];

function image(p: PictoPose | null | undefined, images: Images, classe = "sv-image"): string {
  const src = p?.id != null ? images[p.id] : undefined;
  return src
    ? `<img class="${classe}" src="${src}" alt="${escapeHtml(p?.mot ?? "")}"/>`
    : `<div class="${classe} sv-image-vide"></div>`;
}

const mot = (p: PictoPose | null | undefined) => (p?.mot.trim() ? `<div class="sv-mot">${escapeHtml(p.mot.trim())}</div>` : "");
const attribution = (pictos: (PictoPose | null | undefined)[]) =>
  idsDes(pictos).length ? `<div class="sv-attribution">${ATTRIBUTION_ARASAAC}</div>` : "";

// ── Économie de jetons ─────────────────────────────────────────────────────

export const FORMES_JETON = ["etoile", "rond", "sourire", "picto"] as const;
export type FormeJeton = typeof FORMES_JETON[number];
/** Jetons à gagner, au plus. */
export const JETONS_MAX = 10;
/** Pictogrammes qui illustrent la règle, au plus. */
export const COMPORTEMENTS_MAX = 3;

export interface ReglagesJetons {
  prenom: string;
  /** Jetons à gagner avant la récompense. */
  nombre: number;
  recompense: PictoPose;
  forme: FormeJeton;
  /** Le pictogramme des jetons, quand la forme est « picto ». */
  jeton: PictoPose;
  couleur: string;
  /** Ce qui fait gagner un jeton, en mots et en images. */
  regle: string;
  comportements: PictoPose[];
  decouper: boolean;
  capitales: boolean;
}

export const JETONS_PAR_DEFAUT: ReglagesJetons = {
  prenom: "", nombre: 5, recompense: { id: null, mot: "" }, forme: "etoile", jeton: pictoVide(), couleur: "#f5b301",
  regle: "Je gagne un jeton quand je travaille bien.", comportements: [], decouper: true, capitales: false,
};

export function normaliserJetons(brut: unknown): ReglagesJetons {
  const o = objet(brut), d = JETONS_PAR_DEFAUT;
  return {
    prenom: texte(o.prenom, d.prenom),
    nombre: entier(o.nombre, 1, JETONS_MAX, d.nombre),
    recompense: normaliserPicto(o.recompense),
    forme: parmi(o.forme, FORMES_JETON, d.forme),
    jeton: normaliserPicto(o.jeton),
    couleur: couleurValide(o.couleur, d.couleur),
    regle: texte(o.regle, d.regle),
    comportements: Array.isArray(o.comportements) ? o.comportements.slice(0, COMPORTEMENTS_MAX).map(normaliserPicto) : [],
    decouper: booleen(o.decouper, d.decouper),
    capitales: booleen(o.capitales, d.capitales),
  };
}

/** Un jeton dessiné : étoile, rond, sourire — ou le pictogramme choisi. */
function jeton(r: ReglagesJetons, images: Images): string {
  if (r.forme === "picto") return image(r.jeton, images, "sv-jeton-image");
  const c = couleurValide(r.couleur, JETONS_PAR_DEFAUT.couleur);
  const trait = `stroke="#3a3a3a" stroke-width="2" stroke-linejoin="round"`;
  const dessin = r.forme === "rond"
    ? `<circle cx="50" cy="50" r="44" fill="${c}" ${trait}/>`
    : r.forme === "sourire"
      ? `<circle cx="50" cy="50" r="44" fill="${c}" ${trait}/><circle cx="35" cy="40" r="6" fill="#3a3a3a"/><circle cx="65" cy="40" r="6" fill="#3a3a3a"/>`
        + `<path d="M30 60 Q50 80 70 60" fill="none" stroke="#3a3a3a" stroke-width="5" stroke-linecap="round"/>`
      : `<path d="M50 5 62 37 96 38 69 59 79 92 50 72 21 92 31 59 4 38 38 37Z" fill="${c}" ${trait}/>`;
  return `<svg class="sv-jeton-dessin" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${dessin}</svg>`;
}

export function feuilleJetons(r: ReglagesJetons, images: Images): string {
  const n = Math.min(JETONS_MAX, Math.max(1, Math.round(r.nombre) || 5));
  const colonnes = n <= 5 ? n : Math.ceil(n / 2);
  const classes = ["sv-feuille", "sv-jetons", r.capitales && "sv-majuscules"].filter(Boolean).join(" ");
  const cases = Array.from({ length: n }, (_, i) => `<div class="sv-j-case"><span>${i + 1}</span></div>`).join("");
  const regle = r.regle.trim() || r.comportements.some((c) => c.id != null || c.mot.trim())
    ? `<div class="sv-j-regle">${r.comportements.filter((c) => c.id != null || c.mot.trim())
      .map((c) => `<div class="sv-carte sv-petite">${image(c, images)}${mot(c)}</div>`).join("")}`
      + (r.regle.trim() ? `<div class="sv-j-phrase">${escapeHtml(r.regle.trim())}</div>` : "") + `</div>`
    : "";
  const planche = `<div class="${classes}">`
    + (r.prenom.trim() ? `<div class="sv-titre">Le tableau ${escapeHtml(dePrenom(r.prenom))}</div>` : "")
    + `<div class="sv-j-corps">`
    + `<div class="sv-j-recompense"><div class="sv-j-label">Je travaille pour</div><div class="sv-carte sv-grande">${image(r.recompense, images)}${mot(r.recompense)}</div></div>`
    + `<div class="sv-j-cases" style="grid-template-columns: repeat(${colonnes}, 1fr)">${cases}</div>`
    + `</div>${regle}${attribution([r.recompense, ...r.comportements])}</div>`;
  if (!r.decouper) return planche;
  // Deux jetons de plus : il en tombe toujours un derrière un meuble.
  const aDecouper = Array.from({ length: n + 2 }, () => `<div class="sv-j-jeton">${jeton(r, images)}</div>`).join("");
  return planche
    + `<div class="sv-feuille sv-decouper"><div class="sv-titre sv-petit-titre">Jetons à découper</div>`
    + `<div class="sv-j-jetons">${aDecouper}</div>${attribution([r.forme === "picto" ? r.jeton : null])}</div>`;
}

// ── D'abord / ensuite ──────────────────────────────────────────────────────

export interface ReglagesDabord {
  /** Deux étapes, ou trois avec « puis ». */
  etapes: PictoPose[];
  titres: boolean;
  /** Planches par page : une grande, ou deux plus petites. */
  exemplaires: number;
  capitales: boolean;
}

export const DABORD_PAR_DEFAUT: ReglagesDabord = {
  etapes: [pictoVide(), pictoVide()], titres: true, exemplaires: 1, capitales: false,
};

export const TITRES_ETAPES = ["D'abord", "Ensuite", "Puis"];

export function normaliserDabord(brut: unknown): ReglagesDabord {
  const o = objet(brut), d = DABORD_PAR_DEFAUT;
  const etapes = Array.isArray(o.etapes) ? o.etapes.slice(0, 3).map(normaliserPicto) : [];
  while (etapes.length < 2) etapes.push(pictoVide());
  return {
    etapes,
    titres: booleen(o.titres, d.titres),
    exemplaires: entier(o.exemplaires, 1, 2, d.exemplaires),
    capitales: booleen(o.capitales, d.capitales),
  };
}

const fleche = `<svg class="sv-fleche" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><path d="M4 20H46M34 8 50 20 34 32" fill="none" stroke="#3a3a3a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export function feuilleDabord(r: ReglagesDabord, images: Images): string {
  const etapes = r.etapes.slice(0, 3);
  const planche = `<div class="sv-d-planche sv-d-${etapes.length}">`
    + etapes.map((e, i) => (i ? fleche : "")
      + `<div class="sv-d-etape">${r.titres ? `<div class="sv-d-titre">${TITRES_ETAPES[i]}</div>` : ""}`
      + `<div class="sv-carte">${image(e, images)}${mot(e)}</div></div>`).join("")
    + `</div>`;
  const n = r.exemplaires >= 2 ? 2 : 1;
  const classes = ["sv-feuille", "sv-dabord", `sv-ex-${n}`, r.capitales && "sv-majuscules"].filter(Boolean).join(" ");
  return `<div class="${classes}">${Array.from({ length: n }, () => planche).join("")}${attribution(etapes)}</div>`;
}

// ── Scénario social ────────────────────────────────────────────────────────

export interface EtapeScenario { picto: PictoPose; texte: string }
export const DISPOSITIONS_SCENARIO = ["liste", "grille", "livret"] as const;
export type DispositionScenario = typeof DISPOSITIONS_SCENARIO[number];
export const ETAPES_SCENARIO_MAX = 12;

export interface ReglagesScenario {
  titre: string;
  etapes: EtapeScenario[];
  disposition: DispositionScenario;
  grandTexte: boolean;
  capitales: boolean;
}

export const SCENARIO_PAR_DEFAUT: ReglagesScenario = {
  titre: "Quand la sonnerie retentit",
  etapes: [
    { picto: pictoVide(), texte: "J'entends la sonnerie." },
    { picto: pictoVide(), texte: "Je range mes affaires." },
    { picto: pictoVide(), texte: "Je me mets en rang calmement." },
    { picto: pictoVide(), texte: "Je suis fier de moi." },
  ],
  disposition: "liste", grandTexte: true, capitales: false,
};

export function normaliserScenario(brut: unknown): ReglagesScenario {
  const o = objet(brut), d = SCENARIO_PAR_DEFAUT;
  const etapes = Array.isArray(o.etapes)
    ? o.etapes.slice(0, ETAPES_SCENARIO_MAX).map((e) => ({ picto: normaliserPicto(objet(e).picto), texte: texte(objet(e).texte) }))
    : d.etapes.map((e) => ({ ...e, picto: { ...e.picto } }));
  return {
    titre: texte(o.titre, d.titre),
    etapes: etapes.length ? etapes : [{ picto: pictoVide(), texte: "" }],
    disposition: parmi(o.disposition, DISPOSITIONS_SCENARIO, d.disposition),
    grandTexte: booleen(o.grandTexte, d.grandTexte),
    capitales: booleen(o.capitales, d.capitales),
  };
}

/** Le livret se lit une étape par page, en grand : à l'italienne. La liste et la grille tiennent en hauteur. */
export const pageDuScenario = (r: Pick<ReglagesScenario, "disposition">) => (r.disposition === "livret" ? PAGE_PAYSAGE : PAGE_PORTRAIT);

export function feuilleScenario(r: ReglagesScenario, images: Images): string {
  const etapes = r.etapes.filter((e) => e.texte.trim() || e.picto.id != null);
  const classes = ["sv-feuille", "sv-scenario", `sv-s-${r.disposition}`, r.grandTexte && "sv-s-grand", r.capitales && "sv-majuscules"]
    .filter(Boolean).join(" ");
  const titre = r.titre.trim() ? `<div class="sv-titre">${escapeHtml(r.titre.trim())}</div>` : "";
  const etape = (e: EtapeScenario, i: number) =>
    `<div class="sv-s-etape"><div class="sv-s-numero">${i + 1}</div>${image(e.picto, images)}`
    + `<div class="sv-s-texte">${escapeHtml(e.texte.trim())}</div></div>`;
  const pied = attribution(etapes.map((e) => e.picto));
  if (r.disposition === "livret") {
    // Une étape par page, le titre en couverture.
    return `<div class="${classes}">${titre ? `<div class="sv-s-page sv-s-couverture">${titre}</div>` : ""}`
      + etapes.map((e, i) => `<div class="sv-s-page">${etape(e, i)}${i === etapes.length - 1 ? pied : ""}</div>`).join("")
      + `</div>`;
  }
  return `<div class="${classes}">${titre}<div class="sv-s-etapes">${etapes.map(etape).join("")}</div>${pied}</div>`;
}

/** Styles des supports, pour l'impression comme pour l'aperçu. */
export const STYLE_SUPPORTS = `
  .sv-feuille { color: #1c2233; font-family: Arial, Helvetica, sans-serif; background: #fff; }
  .sv-feuille img { margin: 0; max-height: none; }
  .sv-majuscules .sv-mot, .sv-majuscules .sv-s-texte, .sv-majuscules .sv-j-phrase, .sv-majuscules .sv-titre,
  .sv-majuscules .sv-j-label, .sv-majuscules .sv-d-titre { text-transform: uppercase; }
  .sv-titre { font-size: 26px; font-weight: 800; text-align: center; margin: 0 0 12px; }
  .sv-petit-titre { font-size: 14px; font-weight: 600; color: #666; }
  .sv-attribution { font-size: 8px; color: #888; margin-top: 10px; text-align: center; }
  .sv-carte { border: 3px solid #3a3a3a; border-radius: 14px; background: #fff; padding: 10px; display: flex;
    flex-direction: column; align-items: center; justify-content: center; gap: 6px; }
  .sv-image { width: 100%; max-width: 180px; aspect-ratio: 1; object-fit: contain; }
  .sv-image-vide { width: 100%; max-width: 180px; aspect-ratio: 1; border: 2px dashed #c4c9d6; border-radius: 10px; }
  .sv-mot { font-size: 22px; font-weight: 700; text-align: center; }
  .sv-grande .sv-image, .sv-grande .sv-image-vide { max-width: 200px; }
  .sv-petite { padding: 4px; border-width: 2px; }
  .sv-petite .sv-image, .sv-petite .sv-image-vide { max-width: 70px; }
  .sv-petite .sv-mot { font-size: 13px; }

  .sv-j-corps { display: grid; grid-template-columns: minmax(180px, 30%) 1fr; gap: 22px; align-items: center; }
  .sv-j-label { font-size: 18px; font-weight: 700; text-align: center; margin-bottom: 6px; }
  .sv-j-cases { display: grid; gap: 14px; }
  .sv-j-case { aspect-ratio: 1; border: 3px dashed #7a8194; border-radius: 50%; display: flex; align-items: center;
    justify-content: center; max-width: 130px; width: 100%; justify-self: center; }
  .sv-j-case span { font-size: 18px; color: #b3b9c7; font-weight: 700; }
  .sv-j-regle { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 18px; flex-wrap: wrap; }
  .sv-j-phrase { font-size: 20px; font-weight: 600; }
  .sv-j-jetons { display: grid; grid-template-columns: repeat(auto-fill, 38mm); gap: 6mm; justify-content: center; }
  .sv-j-jeton { width: 38mm; height: 38mm; border: 1px dashed #aaa; display: flex; align-items: center; justify-content: center; padding: 3mm; }
  .sv-jeton-dessin, .sv-jeton-image { width: 100%; height: 100%; object-fit: contain; }
  .sv-decouper { break-before: page; page-break-before: always; margin-top: 20px; }

  .sv-d-planche { display: flex; align-items: center; justify-content: center; gap: 12px; margin: 0 auto 18px; }
  .sv-d-etape { flex: 1 1 0; min-width: 0; max-width: 42%; display: flex; flex-direction: column; gap: 8px; }
  .sv-d-3 .sv-d-etape { max-width: 30%; }
  .sv-d-titre { font-size: 26px; font-weight: 800; text-align: center; }
  .sv-dabord .sv-image, .sv-dabord .sv-image-vide { max-width: 240px; }
  .sv-ex-2 .sv-image, .sv-ex-2 .sv-image-vide { max-width: 130px; }
  .sv-ex-2 .sv-d-titre { font-size: 20px; }
  .sv-ex-2 .sv-d-planche { border-bottom: 1px dashed #bbb; padding-bottom: 14px; }
  .sv-fleche { width: 56px; flex: none; }

  .sv-s-etapes { display: flex; flex-direction: column; gap: 10px; }
  .sv-s-etape { display: flex; align-items: center; gap: 14px; border: 2px solid #3a3a3a; border-radius: 12px; padding: 8px 12px;
    break-inside: avoid; page-break-inside: avoid; background: #fff; }
  .sv-s-numero { flex: none; width: 30px; height: 30px; border-radius: 50%; background: #eef0fe; color: #4338ca; font-weight: 700;
    display: flex; align-items: center; justify-content: center; }
  .sv-s-etape .sv-image, .sv-s-etape .sv-image-vide { width: 110px; max-width: 110px; flex: none; }
  .sv-s-texte { font-size: 20px; font-weight: 600; line-height: 1.35; }
  .sv-s-grand .sv-s-texte { font-size: 26px; }
  .sv-s-grille .sv-s-etapes { display: grid; grid-template-columns: 1fr 1fr; }
  .sv-s-grille .sv-s-etape { flex-direction: column; text-align: center; position: relative; }
  .sv-s-grille .sv-s-numero { position: absolute; top: 8px; left: 8px; }
  .sv-s-grille .sv-image, .sv-s-grille .sv-image-vide { width: 150px; max-width: 150px; }
  .sv-s-page { break-after: page; page-break-after: always; min-height: 60vh; display: flex; flex-direction: column; justify-content: center; }
  .sv-s-page:last-child { break-after: auto; page-break-after: auto; }
  .sv-s-livret .sv-s-etape { flex-direction: column; border: none; text-align: center; }
  .sv-s-livret .sv-image, .sv-s-livret .sv-image-vide { width: 320px; max-width: 70%; }
  .sv-s-livret .sv-s-texte { font-size: 34px; }
  .sv-s-couverture .sv-titre { font-size: 40px; }
`;

/** L'orientation de la page à l'impression ; les marges de la page suffisent. */
export const PAGE_PAYSAGE = "@page { size: A4 landscape; margin: 10mm; } @media print { body { padding: 0; } } @media screen { body { max-width: 1100px; } }";
export const PAGE_PORTRAIT = "@page { size: A4 portrait; margin: 12mm; } @media print { body { padding: 0; } }";

// ── Minuteur visuel ────────────────────────────────────────────────────────

/** Le sens dans lequel le disque se vide : « horaire » comme le Time Timer. */
export type SensMinuteur = "horaire" | "antihoraire";
/** Un tour de cadran vaut la durée choisie (disque plein au départ), ou une heure. */
export type CadranMinuteur = "duree" | "heure";

export interface ReglagesMinuteur {
  minutes: number;
  secondes: number;
  couleur: string;
  cadran: CadranMinuteur;
  sens: SensMinuteur;
  /** Le temps restant écrit en chiffres sous le disque. */
  chiffres: boolean;
  son: boolean;
  /** Ce qu'on fait pendant le minuteur, et ce qui vient après. */
  maintenant: PictoPose;
  ensuite: PictoPose;
}

export const MINUTEUR_PAR_DEFAUT: ReglagesMinuteur = {
  minutes: 5, secondes: 0, couleur: "#e53935", cadran: "duree", sens: "horaire",
  chiffres: true, son: true, maintenant: pictoVide(), ensuite: pictoVide(),
};

export const DUREES_MINUTEUR = [1, 2, 3, 5, 10, 15, 20, 30, 45, 60];
export const MINUTES_MAX = 180;

export function normaliserMinuteur(brut: unknown): ReglagesMinuteur {
  const o = objet(brut), d = MINUTEUR_PAR_DEFAUT;
  let minutes = entier(o.minutes, 0, MINUTES_MAX, d.minutes);
  const secondes = minutes === MINUTES_MAX ? 0 : entier(o.secondes, 0, 59, d.secondes);
  if (minutes * 60 + secondes < 1) minutes = 1;
  return {
    minutes, secondes,
    couleur: couleurValide(o.couleur, d.couleur),
    cadran: parmi(o.cadran, ["duree", "heure"] as const, d.cadran),
    sens: parmi(o.sens, ["horaire", "antihoraire"] as const, d.sens),
    chiffres: booleen(o.chiffres, d.chiffres),
    son: booleen(o.son, d.son),
    maintenant: normaliserPicto(o.maintenant),
    ensuite: normaliserPicto(o.ensuite),
  };
}

export const dureeMs = (r: Pick<ReglagesMinuteur, "minutes" | "secondes">) => (r.minutes * 60 + r.secondes) * 1000;

/**
 * Le secteur coloré : la part restante du temps, depuis midi, dans un cercle
 * de rayon `r` centré en (50, 50). Dans le sens horaire, le coloré se tient à
 * gauche de midi et son bord avance comme une aiguille. Disque plein au
 * départ, rien à la fin.
 */
export function secteurRestant(fraction: number, r = 46, sens: SensMinuteur = "horaire"): string {
  const f = Math.min(1, Math.max(0, fraction));
  if (!(f > 0)) return "";
  if (f >= 0.9999) return `M 50 ${50 - r} A ${r} ${r} 0 1 1 50 ${50 + r} A ${r} ${r} 0 1 1 50 ${50 - r} Z`;
  const angle = f * 2 * Math.PI;
  const x = 50 + (sens === "horaire" ? -1 : 1) * r * Math.sin(angle);
  const y = 50 - r * Math.cos(angle);
  return `M 50 50 L 50 ${50 - r} A ${r} ${r} 0 ${f > 0.5 ? 1 : 0} ${sens === "horaire" ? 0 : 1} ${x.toFixed(2)} ${y.toFixed(2)} Z`;
}

/** La part du cadran encore colorée. */
export function fractionAffichee(restantMs: number, totalMs: number, cadran: CadranMinuteur): number {
  const tour = cadran === "heure" ? 3_600_000 : totalMs;
  return tour > 0 ? Math.min(1, Math.max(0, restantMs / tour)) : 0;
}

export interface Graduation {
  /** Angle depuis midi, en radians, dans le sens horaire. */
  angle: number;
  majeure: boolean;
  /** Les minutes restantes quand le bord du disque passe là. */
  texte: string | null;
}

/**
 * Les graduations du cadran. Sur une heure : 60 traits, un chiffre toutes les
 * 5 minutes. Sur la durée choisie : un chiffre par pas rond (1, 2, 5, 10, 15
 * ou 30 minutes), 12 au plus ; douze traits sans chiffre si la durée ne
 * tombe pas juste.
 */
export function graduations(cadran: CadranMinuteur, totalMs: number, sens: SensMinuteur): Graduation[] {
  const minutes = cadran === "heure" ? 60 : totalMs / 60_000;
  const position = (m: number) => {
    const a = (m / minutes) * 2 * Math.PI;
    return sens === "horaire" ? (2 * Math.PI - a) % (2 * Math.PI) : a;
  };
  if (cadran === "heure") {
    return Array.from({ length: 60 }, (_, m) => ({
      angle: position(m), majeure: m % 5 === 0, texte: m % 5 === 0 ? String(m) : null,
    }));
  }
  const pas = Number.isInteger(minutes) && minutes >= 2
    ? [1, 2, 5, 10, 15, 30].find((p) => minutes % p === 0 && minutes / p <= 12)
    : undefined;
  if (!pas) return Array.from({ length: 12 }, (_, i) => ({ angle: (i / 12) * 2 * Math.PI, majeure: i % 3 === 0, texte: null }));
  return Array.from({ length: minutes / pas }, (_, i) => ({ angle: position(i * pas), majeure: true, texte: String(i * pas) }));
}

/** 125 000 ms → « 2:05 ». */
export function tempsLisible(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

/**
 * L'état d'un minuteur : en marche, il connaît l'heure de fin ; arrêté ou en
 * pause, le temps qui reste. Rien ne dépend d'un compteur qui dériverait.
 */
export interface EtatMinuteur { total: number; restant: number; fin: number | null }

export const minuteurPret = (total: number): EtatMinuteur => ({ total, restant: total, fin: null });
export const restantA = (e: EtatMinuteur, maintenant: number) =>
  (e.fin === null ? e.restant : Math.max(0, e.fin - maintenant));
export const estEnMarche = (e: EtatMinuteur, maintenant: number) => e.fin !== null && e.fin > maintenant;
export const estFini = (e: EtatMinuteur, maintenant: number) => restantA(e, maintenant) <= 0;

/** Lance ou relance ; un minuteur arrivé au bout repart de sa durée. */
export function demarrer(e: EtatMinuteur, maintenant: number): EtatMinuteur {
  if (estEnMarche(e, maintenant)) return e;
  const restant = restantA(e, maintenant) > 0 ? restantA(e, maintenant) : e.total;
  return { ...e, restant, fin: maintenant + restant };
}

export function mettreEnPause(e: EtatMinuteur, maintenant: number): EtatMinuteur {
  return e.fin === null ? e : { ...e, restant: restantA(e, maintenant), fin: null };
}

/** Du temps en plus, sans que le disque déborde : le tour s'allonge s'il le faut. */
export function prolonger(e: EtatMinuteur, ms: number, maintenant: number): EtatMinuteur {
  const restant = restantA(e, maintenant) + ms;
  return { total: Math.max(e.total, restant), restant, fin: e.fin === null ? null : maintenant + restant };
}
