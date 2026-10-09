// ── Frises et calendriers : se repérer dans le temps ──────────────────────
//
// Le programme d'histoire-géographie du cycle 2 (BO n° 22 du 28 mai 2026)
// fait de la frise « un instrument de repérage et de compréhension du temps
// long », construite peu à peu en classe : la journée, la semaine, l'année
// et ses saisons au CP, le calendrier où l'on situe hier et demain, la vie
// de l'élève et ses générations ; au CE1, le passé proche et le passé
// lointain, puis les grandes périodes et leurs figures ; au CE2, les repères
// de la Préhistoire, de Rome et du royaume de France. Chaque frise s'imprime
// complétée, pour l'affichage, ou à compléter, avec ses étiquettes à
// découper.

import { escapeHtml } from "./print";
import { reference } from "./references";
import { feuille } from "./cartesImprimables";

const esc = escapeHtml;
const PROGRAMME = "Programme d'histoire-géographie du cycle 2, BO n° 22 du 28 mai 2026 (annexe 3) : histoire, CP, CE1 et CE2.";

export type ModeleFrise =
  | "journee" | "semaine" | "annee" | "calendrier" | "vie" | "generations" | "tempsLong" | "periodes" | "prehistoire" | "rome" | "royaume";

export const MODELES_FRISE: { id: ModeleFrise; nom: string; classe: string; quoi: string }[] = [
  { id: "journee", nom: "La journée", classe: "CP", quoi: "Le matin, le midi, l'après-midi, le soir, la nuit — et ce qu'on y fait." },
  { id: "semaine", nom: "La semaine", classe: "CP", quoi: "Les sept jours dans l'ordre, sur une frise et sur la roue des jours." },
  { id: "annee", nom: "L'année et les saisons", classe: "CP", quoi: "La roue des douze mois et des quatre saisons." },
  { id: "calendrier", nom: "Le calendrier du mois", classe: "CP", quoi: "Le mois à remplir, et les étiquettes hier, aujourd'hui, demain, il y a, dans." },
  { id: "vie", nom: "La frise de ma vie", classe: "CP", quoi: "Une case par année, de la naissance à aujourd'hui." },
  { id: "generations", nom: "Les générations", classe: "CP", quoi: "L'arbre d'une famille, à partir d'un exemple : les grands-parents, les parents, l'enfant." },
  { id: "tempsLong", nom: "Du passé proche au passé lointain", classe: "CE1", quoi: "Une frise de cent ans graduée en décennies, et les mots du temps." },
  { id: "periodes", nom: "Les grandes périodes", classe: "CE1", quoi: "Les cinq périodes, leurs dates, et des figures de chacune à placer." },
  { id: "prehistoire", nom: "La Préhistoire", classe: "CE2", quoi: "Paléolithique et Néolithique, l'agriculture, Ötzi, l'écriture." },
  { id: "rome", nom: "Rome et la Gaule romaine", classe: "CE2", quoi: "Alésia, le règne d'Auguste, l'empire à son apogée." },
  { id: "royaume", nom: "Le royaume de France", classe: "CE2", quoi: "Capétiens et Valois, Hugues Capet, la guerre de Cent Ans, quelques rois et reines." },
];

export interface ReglagesFrise {
  modele: ModeleFrise;
  /** À compléter : des cases vides et les étiquettes à découper ; sinon, complétée pour l'affichage. */
  aCompleter: boolean;
  /** Le calendrier : le mois (0 à 11) et l'année. */
  mois: number;
  annee: number;
  /** La frise de ma vie : l'année de naissance. */
  naissance: number;
  /** Les figures de chaque grande période, une par ligne : « Moyen Âge : Jeanne d'Arc (1429) ». */
  figures: string;
}

export const FIGURES_PAR_DEFAUT = [
  "Préhistoire : Ötzi (vers 3200 av. J.-C.)",
  "Antiquité : Vercingétorix (52 av. J.-C.)",
  "Antiquité : Cléopâtre (vers 69 – 30 av. J.-C.)",
  "Moyen Âge : Charlemagne (sacré empereur en 800)",
  "Moyen Âge : Jeanne d'Arc (vers 1412 – 1431)",
  "Temps modernes : Louis XIV (roi de 1643 à 1715)",
  "Époque contemporaine : Marie Curie (prix Nobel en 1903 et 1911)",
  "Époque contemporaine : Victor Hugo (1802 – 1885)",
].join("\n");

export const REGLAGES_FRISE: ReglagesFrise = {
  modele: "semaine", aCompleter: true, mois: 8, annee: 2026, naissance: 2020, figures: FIGURES_PAR_DEFAUT,
};

export function reglagesFriseSurs(brut: unknown): ReglagesFrise {
  const o = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;
  const d = REGLAGES_FRISE;
  const entier = (v: unknown, min: number, max: number, defaut: number) =>
    (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : defaut);
  return {
    modele: MODELES_FRISE.some((m) => m.id === o.modele) ? (o.modele as ModeleFrise) : d.modele,
    aCompleter: typeof o.aCompleter === "boolean" ? o.aCompleter : d.aCompleter,
    mois: entier(o.mois, 0, 11, d.mois),
    annee: entier(o.annee, 1900, 2100, d.annee),
    naissance: entier(o.naissance, 1900, 2100, d.naissance),
    figures: typeof o.figures === "string" ? o.figures.slice(0, 1500) : d.figures,
  };
}

// ── Ce que disent les frises ──────────────────────────────────────────────

export const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
export const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
/** Les saisons, et les mois où elles commencent (dans l'hémisphère nord, en France hexagonale). */
export const SAISONS = [
  { nom: "le printemps", debut: 2, couleur: "#cdebc4" },
  { nom: "l'été", debut: 5, couleur: "#ffe9a8" },
  { nom: "l'automne", debut: 8, couleur: "#f7cfa6" },
  { nom: "l'hiver", debut: 11, couleur: "#cfe3f5" },
];
export const MOMENTS = [
  { nom: "le matin", faits: ["Je me réveille.", "Je prends mon petit-déjeuner.", "Je vais à l'école."] },
  { nom: "le midi", faits: ["Je déjeune."] },
  { nom: "l'après-midi", faits: ["Je travaille en classe.", "Je goûte."] },
  { nom: "le soir", faits: ["Je dîne.", "Je me brosse les dents."] },
  { nom: "la nuit", faits: ["Je dors."] },
];
export const MARQUEURS = ["avant-hier", "hier", "aujourd'hui", "demain", "après-demain", "il y a une semaine", "dans une semaine", "il y a un mois", "dans un mois"];
export const MOTS_DU_TEMPS = ["hier", "autrefois", "aujourd'hui", "il y a dix jours", "il y a dix ans", "il y a cent ans", "une année", "une décennie", "un siècle", "un millénaire"];

/** Les grandes périodes, par convention en Europe. */
export const PERIODES = [
  { nom: "Préhistoire", debut: "vers 3 millions d'années", fin: "3000 av. J.-C.", couleur: "#e9d8c4" },
  { nom: "Antiquité", debut: "3000 av. J.-C.", fin: "476", couleur: "#f6e3a1" },
  { nom: "Moyen Âge", debut: "476", fin: "1492", couleur: "#cfe0f3" },
  { nom: "Temps modernes", debut: "1492", fin: "1789", couleur: "#d8ecd0" },
  { nom: "Époque contemporaine", debut: "1789", fin: "aujourd'hui", couleur: "#f3d1d6" },
];

interface Repere { quand: string; quoi: string }
interface Bande { nom: string; debut: string; fin: string; couleur: string }
const REPERES_CE2: Record<"prehistoire" | "rome" | "royaume", { titre: string; bandes: Bande[]; reperes: Repere[] }> = {
  prehistoire: {
    titre: "La Préhistoire",
    bandes: [
      { nom: "Paléolithique : des chasseurs-cueilleurs nomades", debut: "vers 3 millions d'années", fin: "vers 10 000 av. J.-C.", couleur: "#e9d8c4" },
      { nom: "Néolithique : des agriculteurs sédentaires", debut: "vers 10 000 av. J.-C.", fin: "3000 av. J.-C.", couleur: "#d8ecd0" },
    ],
    reperes: [
      { quand: "vers 10 000 – 9000 av. J.-C.", quoi: "La naissance de l'agriculture" },
      { quand: "3200 av. J.-C.", quoi: "Ötzi" },
      { quand: "vers 3000 av. J.-C.", quoi: "L'apparition de l'écriture" },
    ],
  },
  rome: {
    titre: "Rome et la Gaule romaine",
    bandes: [
      { nom: "La Gaule avant la conquête", debut: "", fin: "52 av. J.-C.", couleur: "#e9d8c4" },
      { nom: "La Gaule romaine", debut: "52 av. J.-C.", fin: "IIe siècle après J.-C.", couleur: "#f6e3a1" },
    ],
    reperes: [
      { quand: "52 av. J.-C.", quoi: "Le siège d'Alésia, la défaite de Vercingétorix" },
      { quand: "27 av. J.-C. – 14 après J.-C.", quoi: "Le règne de l'empereur Auguste" },
      { quand: "IIe siècle après J.-C.", quoi: "L'empire romain à son apogée" },
    ],
  },
  royaume: {
    titre: "Le royaume de France (Xe – XVe siècles)",
    bandes: [
      { nom: "Les Capétiens", debut: "987", fin: "1328", couleur: "#cfe0f3" },
      { nom: "Les Valois", debut: "1328", fin: "fin du XVe siècle", couleur: "#d8ecd0" },
    ],
    reperes: [
      { quand: "987", quoi: "L'élection d'Hugues Capet" },
      { quand: "1180 – 1223", quoi: "Le règne de Philippe Auguste" },
      { quand: "vers 1122 – 1204", quoi: "Aliénor d'Aquitaine" },
      { quand: "1188 – 1252", quoi: "Blanche de Castille" },
      { quand: "XIVe – XVe siècles", quoi: "La guerre de Cent Ans" },
    ],
  },
};

/** Les figures des grandes périodes, lues ligne à ligne : « Période : nom ». */
export function figuresDesPeriodes(texte: string): { periode: string; figure: string }[] {
  return texte.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
    const i = l.indexOf(":");
    return i > 0 ? { periode: l.slice(0, i).trim(), figure: l.slice(i + 1).trim() } : { periode: "", figure: l };
  }).filter((f) => f.figure).slice(0, 15);
}

// ── Le rendu ──────────────────────────────────────────────────────────────

const titre = (t: string, sous = "") => `<div class="titre">${esc(t)} ${reference(PROGRAMME)}</div>${sous ? `<div class="sous">${sous}</div>` : ""}`;
const prenomDate = `<div class="sous">Prénom : ………………………… Date : ……………</div>`;
const etiquettes = (mots: string[], classe = "") =>
  `<div class="page"><div class="titre">Les étiquettes à découper</div><div class="fr-etiquettes ${classe}">${mots.map((m) => `<div class="fr-etiquette">${esc(m)}</div>`).join("")}</div></div>`;

/** Une frise de cases égales, dans l'ordre, une flèche au bout. */
function friseDeCases(cases: { tete: string; corps: string; couleur?: string }[]): string {
  return `<div class="fr-frise">${cases.map((c) => `<div class="fr-case"${c.couleur ? ` style="background:${c.couleur}"` : ""}>`
    + `<div class="fr-tete">${c.tete}</div><div class="fr-corps">${c.corps}</div></div>`).join("")}<div class="fr-fleche"></div></div>`;
}

/** Une roue : des parts égales autour d'un centre. */
function roue(parts: { nom: string; couleur: string }[], centre: string, vide: boolean): string {
  const n = parts.length, R = 140, c = 150;
  const point = (a: number, r: number) => [c + r * Math.cos(a), c + r * Math.sin(a)];
  const secteurs = parts.map((p, i) => {
    const a0 = (i / n) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
    const [x0, y0] = point(a0, R), [x1, y1] = point(a1, R), [tx, ty] = point((a0 + a1) / 2, R * 0.66);
    return `<path d="M${c} ${c} L${x0.toFixed(1)} ${y0.toFixed(1)} A${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z" fill="${vide ? "#fff" : p.couleur}" stroke="#1c2233" stroke-width="1.5"/>`
      + (vide ? "" : `<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="${n > 8 ? 11 : 14}" font-weight="700" font-family="Helvetica, Arial, sans-serif">${esc(p.nom)}</text>`);
  }).join("");
  return `<svg class="fr-roue" viewBox="0 0 300 300" width="120mm" height="120mm">${secteurs}<circle cx="${c}" cy="${c}" r="34" fill="#fff" stroke="#1c2233" stroke-width="1.5"/>`
    + `<text x="${c}" y="${c}" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="800" font-family="Helvetica, Arial, sans-serif">${esc(centre)}</text></svg>`;
}

const couleurDuMois = (m: number) => SAISONS[(Math.floor(((m - 2 + 12) % 12) / 3))].couleur;

/** Le mois en grille : une colonne par jour de la semaine, du lundi au dimanche. */
function grilleDuMois(mois: number, annee: number): string {
  const premier = (new Date(annee, mois, 1).getDay() + 6) % 7;
  const jours = new Date(annee, mois + 1, 0).getDate();
  const cases = [...Array.from({ length: premier }, () => ""), ...Array.from({ length: jours }, (_, i) => String(i + 1))];
  while (cases.length % 7) cases.push("");
  const rangees = Array.from({ length: cases.length / 7 }, (_, r) => `<tr>${cases.slice(r * 7, r * 7 + 7).map((d) => `<td>${d ? `<span>${d}</span>` : ""}</td>`).join("")}</tr>`);
  return `<table class="fr-calendrier"><tr>${JOURS.map((j) => `<th>${j}</th>`).join("")}</tr>${rangees.join("")}</table>`;
}

/** Les bandes d'une frise de périodes, d'égale largeur — la Préhistoire, proportionnelle, ne tiendrait pas — et leurs dates aux limites. */
function friseDeBandes(bandes: Bande[], vide: boolean, avecDates = true): string {
  // Sous chaque période, sa date de début, au bord gauche ; la dernière porte aussi sa date de fin, au bord droit.
  const dates = bandes.map((b, i) => `<div><span>${esc(b.debut)}</span>${i === bandes.length - 1 ? `<span class="fr-fin">${esc(b.fin)}</span>` : ""}</div>`);
  return `<div class="fr-bandes">${bandes.map((b) => `<div class="fr-bande" style="background:${b.couleur}">${vide ? "" : esc(b.nom)}</div>`).join("")}</div>`
    + (avecDates ? `<div class="fr-limites">${dates.join("")}</div>` : "");
}

export function htmlFrise(r: ReglagesFrise): string {
  const vide = r.aCompleter;
  switch (r.modele) {
    case "journee": {
      const cases = MOMENTS.map((m) => ({ tete: esc(m.nom), corps: vide ? "" : m.faits.map((f) => `<div>${esc(f)}</div>`).join("") }));
      return feuille(`<div class="page">${titre("Ma journée", vide ? "Je colle chaque étiquette sous le bon moment de la journée." : "")}${vide ? prenomDate : ""}`
        + `${friseDeCases(cases)}</div>${vide ? etiquettes(MOMENTS.flatMap((m) => m.faits)) : ""}`, "fr");
    }
    case "semaine": {
      const cases = JOURS.map((j, i) => ({ tete: vide ? "" : esc(j), corps: `<span class="fr-numero">${i + 1}</span>` }));
      return feuille(`<div class="page">${titre("La semaine", vide ? "Je colle les jours dans l'ordre, sur la frise puis sur la roue." : "Les sept jours de la semaine, dans l'ordre : la semaine recommence.")}`
        + `${vide ? prenomDate : ""}${friseDeCases(cases)}<div class="fr-centre">${roue(JOURS.map((j, i) => ({ nom: j, couleur: i < 5 ? "#e8edf8" : "#fde9c8" })), "la semaine", vide)}</div></div>`
        + `${vide ? etiquettes([...JOURS, ...JOURS]) : ""}`, "fr");
    }
    case "annee": {
      const parts = MOIS.map((m, i) => ({ nom: m, couleur: couleurDuMois(i) }));
      const legende = `<div class="fr-legende">${SAISONS.map((s) => `<span><i style="background:${s.couleur}"></i>${esc(s.nom)}</span>`).join("")}</div>`;
      return feuille(`<div class="page">${titre("L'année : douze mois, quatre saisons", vide ? "Je colle les mois dans l'ordre, puis je colorie les saisons." : "")}`
        + `${vide ? prenomDate : ""}<div class="fr-centre">${roue(parts, "l'année", vide)}</div>${vide ? "" : legende}</div>`
        + `${vide ? etiquettes([...MOIS, ...SAISONS.map((s) => s.nom)]) : ""}`, "fr");
    }
    case "calendrier":
      return feuille(`<div class="page">${titre(`${MOIS[r.mois].charAt(0).toUpperCase()}${MOIS[r.mois].slice(1)} ${r.annee}`, "J'écris les évènements de la classe : anniversaires, fêtes, sorties, projets.")}`
        + `${grilleDuMois(r.mois, r.annee)}</div>${vide ? etiquettes(MARQUEURS, "petites") : ""}`, "fr");
    case "vie": {
      const annees = Array.from({ length: Math.max(1, Math.min(12, r.annee - r.naissance + 1)) }, (_, i) => r.naissance + i);
      const cases = annees.map((a, i) => ({ tete: `${a}`, corps: `<div class="fr-age">${i === 0 ? "Je suis né(e)." : `J'ai ${i} an${i > 1 ? "s" : ""}.`}</div><div class="fr-dessin"></div>` }));
      return feuille(`<div class="page">${titre("La frise de ma vie", "Dans chaque case, je colle une photo ou je dessine ce qui s'est passé cette année-là.")}${prenomDate}`
        + `${friseDeCases(cases)}</div>`, "fr");
    }
    case "generations": {
      // Le programme part d'exemples d'arbres généalogiques : l'arbre d'une famille, pas forcément celle de l'élève.
      const boite = (qui: string) => `<div class="fr-personne"><b>${esc(qui)}</b><div>Prénom : …………………</div><div>Né(e) en : ………</div></div>`;
      return feuille(`<div class="page">${titre("Les générations d'une famille", "Je complète l'arbre de la famille étudiée : les plus anciens en haut, les plus jeunes en bas.")}${prenomDate}`
        + `<div class="fr-arbre">`
        + `<div class="fr-generation"><span>Les grands-parents</span>${boite("Grand-parent")}${boite("Grand-parent")}${boite("Grand-parent")}${boite("Grand-parent")}</div>`
        + `<div class="fr-generation"><span>Les parents</span>${boite("Parent")}${boite("Parent")}</div>`
        + `<div class="fr-generation"><span>L'enfant</span>${boite("Enfant")}</div></div></div>`, "fr");
    }
    case "tempsLong": {
      const fin = r.annee, debut = fin - 100;
      const ticks = Array.from({ length: 11 }, (_, i) => debut + i * 10);
      const axe = `<div class="fr-axe">${ticks.map((t, i) => `<span style="left:${i * 10}%">${t}</span>`).join("")}</div>`;
      return feuille(`<div class="page">${titre("Du passé proche au passé lointain", `Cent ans, de ${debut} à ${fin} : une graduation tous les dix ans, une décennie.`)}`
        + `${vide ? prenomDate : ""}<div class="fr-temps-long"><div class="fr-regle"></div>${axe}</div>`
        + `<div class="fr-aide">Je place : ma naissance ; la naissance d'un parent ; la naissance d'un grand-parent ; il y a dix ans ; il y a cent ans.</div></div>`
        + `${vide ? etiquettes(["ma naissance", "la naissance d'un parent", "la naissance d'un grand-parent", "il y a dix ans", "il y a cent ans", ...MOTS_DU_TEMPS], "petites") : ""}`, "fr");
    }
    case "periodes": {
      const figures = figuresDesPeriodes(r.figures);
      const sousLaFrise = vide ? "" : `<div class="fr-figures">${PERIODES.map((p) => `<div>${figures.filter((f) => f.periode.toLowerCase() === p.nom.toLowerCase())
        .map((f) => `<span>${esc(f.figure)}</span>`).join("")}</div>`).join("")}</div>`;
      return feuille(`<div class="page">${titre("Les grandes périodes de l'histoire", "Par convention, en Europe.")}${vide ? prenomDate : ""}`
        + `${friseDeBandes(PERIODES, vide)}${sousLaFrise}</div>`
        + `${vide ? etiquettes([...PERIODES.map((p) => p.nom), ...figures.map((f) => f.figure)]) : ""}`, "fr");
    }
    default: {
      const ce2 = REPERES_CE2[r.modele as "prehistoire" | "rome" | "royaume"];
      const reperes = `<div class="fr-reperes">${ce2.reperes.map((x) => `<div class="fr-repere"><b>${esc(x.quand)}</b><span>${vide ? "……………………………………" : esc(x.quoi)}</span></div>`).join("")}</div>`;
      return feuille(`<div class="page">${titre(ce2.titre)}${vide ? prenomDate : ""}${friseDeBandes(ce2.bandes, vide)}${reperes}</div>`
        + `${vide ? etiquettes([...ce2.bandes.map((b) => b.nom), ...ce2.reperes.map((x) => x.quoi)]) : ""}`, "fr");
    }
  }
}

export const STYLE_FRISE = `
  @page { size: A4 landscape; margin: 10mm; }
  .feuille.fr .fr-frise { display: flex; align-items: stretch; margin: 6mm 0; position: relative; padding-right: 8mm; }
  .feuille.fr .fr-case { flex: 1; min-width: 0; border: 1.5px solid #1c2233; border-right: none; display: flex; flex-direction: column; }
  .feuille.fr .fr-case:last-of-type { border-right: 1.5px solid #1c2233; }
  .feuille.fr .fr-tete { min-height: 10mm; border-bottom: 1.5px solid #1c2233; display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 14px; text-align: center; padding: 1mm; }
  .feuille.fr .fr-corps { min-height: 40mm; padding: 2mm; font-size: 12px; line-height: 1.4; }
  .feuille.fr .fr-fleche { position: absolute; right: 0; top: 50%; margin-top: -5mm; border-left: 8mm solid #1c2233;
    border-top: 5mm solid transparent; border-bottom: 5mm solid transparent; }
  .feuille.fr .fr-numero { display: inline-block; font-size: 11px; color: #687087; }
  .feuille.fr .fr-age { font-size: 11px; font-weight: 700; }
  .feuille.fr .fr-dessin { height: 30mm; }
  .feuille.fr .fr-centre { text-align: center; }
  .feuille.fr .fr-legende { display: flex; gap: 6mm; justify-content: center; font-size: 13px; margin-top: 3mm; }
  .feuille.fr .fr-legende i { display: inline-block; width: 8mm; height: 4.5mm; border: 1px solid #1c2233; vertical-align: -1mm; margin-right: 2mm; }
  .feuille.fr .fr-etiquettes { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; }
  .feuille.fr .fr-etiquettes.petites { grid-template-columns: repeat(5, 1fr); }
  .feuille.fr .fr-etiquette { border: 1px dashed #9aa0b4; height: 16mm; display: flex; align-items: center; justify-content: center;
    text-align: center; font-weight: 700; font-size: 14px; padding: 1.5mm; }
  .feuille.fr table.fr-calendrier { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 3mm; }
  .feuille.fr table.fr-calendrier th { border: 1.5px solid #1c2233; padding: 1.5mm; font-size: 13px; background: #f0f2f8; }
  .feuille.fr table.fr-calendrier td { border: 1.5px solid #1c2233; height: 24mm; vertical-align: top; padding: 1mm 1.5mm; }
  .feuille.fr table.fr-calendrier td span { font-weight: 800; font-size: 14px; }
  .feuille.fr .fr-arbre { display: block; margin-top: 4mm; }
  .feuille.fr .fr-generation { display: flex; gap: 4mm; justify-content: center; align-items: center; margin: 5mm 0; }
  .feuille.fr .fr-generation > span { width: 34mm; font-weight: 800; text-align: right; }
  .feuille.fr .fr-personne { border: 1.5px solid #1c2233; border-radius: 3mm; padding: 2.5mm 3mm; width: 48mm; font-size: 12px; line-height: 1.8; }
  .feuille.fr .fr-temps-long { position: relative; margin: 14mm 6mm 10mm; }
  .feuille.fr .fr-regle { height: 10mm; border: 1.5px solid #1c2233;
    background: repeating-linear-gradient(90deg, transparent 0 calc(10% - 1.5px), #1c2233 calc(10% - 1.5px) 10%); }
  .feuille.fr .fr-axe { position: relative; height: 8mm; }
  .feuille.fr .fr-axe span { position: absolute; transform: translateX(-50%); font-size: 11px; font-weight: 700; top: 1mm; }
  .feuille.fr .fr-aide { font-size: 13px; color: #4a5268; margin-top: 4mm; }
  .feuille.fr .fr-bandes { display: flex; margin: 10mm 0 0; }
  .feuille.fr .fr-bande { flex: 1; min-height: 22mm; border: 1.5px solid #1c2233; border-right: none; display: flex; align-items: center;
    justify-content: center; text-align: center; font-weight: 800; font-size: 14px; padding: 2mm; }
  .feuille.fr .fr-bande:last-child { border-right: 1.5px solid #1c2233; }
  .feuille.fr .fr-limites { display: flex; font-size: 11px; font-weight: 700; margin-top: 1.5mm; }
  .feuille.fr .fr-limites > div { flex: 1; min-width: 0; display: flex; justify-content: space-between; gap: 2mm; padding-right: 1mm; }
  .feuille.fr .fr-limites span { border-left: 1.5px solid #1c2233; padding-left: 1mm; }
  .feuille.fr .fr-limites span.fr-fin { border-left: none; border-right: 1.5px solid #1c2233; padding: 0 1mm 0 0; text-align: right; }
  .feuille.fr .fr-figures { display: flex; margin-top: 5mm; }
  .feuille.fr .fr-figures > div { flex: 1; display: flex; flex-direction: column; gap: 1.5mm; padding: 0 1.5mm; font-size: 12px; }
  .feuille.fr .fr-figures span { border: 1px solid #9aa0b4; border-radius: 2mm; padding: 1.5mm; text-align: center; }
  .feuille.fr .fr-reperes { display: block; margin-top: 8mm; }
  .feuille.fr .fr-repere { display: flex; gap: 4mm; align-items: baseline; margin: 2.5mm 0; font-size: 14px; }
  .feuille.fr .fr-repere b { width: 60mm; flex: none; }
`;
