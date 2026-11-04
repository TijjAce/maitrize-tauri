// ── La fleur lexicale et la grille sémique ────────────────────────────────
//
// « Fais-les tous » (l'enseignant, 4 novembre 2026). Le guide « Pour
// enseigner la lecture et l'écriture au CP » (Éduscol, 2018) donne ces deux
// façons d'organiser un champ lexical (p. 104). La fleur lexicale récapitule
// et classe, dans ses pétales, les noms, les verbes, les adjectifs, les
// expressions qui se rattachent à un mot ; son exemple est celui de la peur,
// repris ici. La grille sémique croise des mots d'un même champ — chaise,
// fauteuil, canapé — et leurs traits — « a des pieds », « a un dossier » :
// lue en ligne, elle montre ce qui caractérise chaque mot. Le guide du
// vocabulaire en maternelle fait des fleurs lexicales d'images (p. 38 et 84) ;
// celui de la grammaire demande de ne pas saturer ces schémas (p. 273).

import { ATTRIBUTION_ARASAAC, feuille } from "./cartesImprimables";
import { escapeHtml } from "./print";

const NOIR = "#1c2233";
const POLICE_SCRIPT = `"Andika", "Andika New Basic", "Century Gothic", "Avenir Next", "Helvetica Neue", Arial, sans-serif`;
const PETALES = ["#fde2e1", "#fdebd3", "#e3f4d7", "#dbeafe", "#e6e1fb", "#fdf6c9"];
const ENCRES = ["#c0392b", "#c76b12", "#3d8b2f", "#2a6fd6", "#6b4fc4", "#9a7a00"];

/** Un mot et le mot sous lequel on cherche son dessin : « loup », ou « pig=cochon » ; « - » : aucun. */
export function motEtDessin(ecrit: string): { mot: string; picto: string } {
  const egal = ecrit.indexOf("=");
  if (egal < 0) return { mot: ecrit.trim(), picto: ecrit.trim().toLowerCase() };
  const mot = ecrit.slice(0, egal).trim();
  const picto = ecrit.slice(egal + 1).trim();
  return { mot, picto: picto === "-" ? "" : (picto || mot).toLowerCase() };
}

// ── La fleur ──

export interface ReglagesFleur {
  coeur: string;
  /** Un pétale par ligne : « Les verbes : effrayer, hurler ». */
  petales: string;
  /** Les dessins des mots : une fleur d'images, pour la maternelle. */
  pictos: boolean;
  format: "mur" | "cahier";
}

/** L'exemple du guide du CP (p. 104) : le champ lexical de la peur. */
export const PETALES_DE_LA_PEUR = [
  "Les verbes : effrayer, hurler, frissonner, terrifier",
  "Les noms : loup, monstre, terreur, sorcière, frayeur, nuit",
  "Les expressions : être vert de peur, avoir les dents qui claquent, avoir une peur bleue, flanquer les chocottes",
  "Les adjectifs : épouvantable, atroce, effrayant, dangereux",
  "Les onomatopées : au secours, bouh, agghhh",
].join("\n");

export const REGLAGES_FLEUR: ReglagesFleur = { coeur: "la peur", petales: PETALES_DE_LA_PEUR, pictos: false, format: "mur" };

export function reglagesFleurSurs(brut: Partial<ReglagesFleur> | null | undefined): ReglagesFleur {
  const o = (brut && typeof brut === "object" ? brut : {}) as Partial<ReglagesFleur>;
  const d = REGLAGES_FLEUR;
  return {
    coeur: typeof o.coeur === "string" ? o.coeur.slice(0, 40) : d.coeur,
    petales: typeof o.petales === "string" ? o.petales.slice(0, 2000) : d.petales,
    pictos: typeof o.pictos === "boolean" ? o.pictos : d.pictos,
    format: o.format === "cahier" ? "cahier" : "mur",
  };
}

/** Les pétales : six au plus, huit mots chacun — un schéma qu'on ne sature pas. */
export function lirePetales(saisie: string): { nom: string; mots: { mot: string; picto: string }[] }[] {
  return saisie.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 6).map((ligne) => {
    const deux = ligne.indexOf(":");
    const nom = (deux < 0 ? ligne : ligne.slice(0, deux)).trim();
    const mots = (deux < 0 ? "" : ligne.slice(deux + 1)).split(",").map((m) => m.trim()).filter(Boolean).slice(0, 8).map(motEtDessin);
    return { nom, mots };
  });
}

export function motsADessinerFleur(brut: Partial<ReglagesFleur>): string[] {
  const r = reglagesFleurSurs(brut);
  if (!r.pictos) return [];
  return [...new Set([r.coeur.trim().toLowerCase(), ...lirePetales(r.petales).flatMap((p) => p.mots.map((m) => m.picto))].filter(Boolean))];
}

/** La place des pétales autour du cœur, en mm, sur la page en paysage (263 × 170). */
export function placesDesPetales(n: number): { x: number; y: number; l: number; h: number }[] {
  const l = n <= 4 ? 76 : n === 5 ? 68 : 62;
  const h = n <= 4 ? 52 : n === 5 ? 48 : 46;
  const rx = 90, ry = 56;
  return Array.from({ length: n }, (_, i) => {
    const a = ((-90 + (i * 360) / n) * Math.PI) / 180;
    return { x: 131.5 + rx * Math.cos(a), y: 85 + ry * Math.sin(a), l, h };
  });
}

/** Les mots d'un pétale, aussi grands que sa place le permet : 5,2 mm pour quelques mots, jusqu'à 3,6 mm pour un pétale plein. */
export const tailleDesMots = (mots: { mot: string }[]) => {
  const lettres = mots.reduce((n, m) => n + m.mot.length + 2, 0);
  return Math.max(3.6, Math.min(5.2, 5.2 - (lettres - 45) * 0.02));
};

export function htmlFleur(brut: Partial<ReglagesFleur>, images: Record<string, string> = {}): string {
  const r = reglagesFleurSurs(brut);
  const petales = lirePetales(r.petales);
  const vues = r.pictos ? images : {};
  const places = placesDesPetales(Math.max(1, petales.length));
  const fond = places.map((p, i) => `<ellipse cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" rx="${(p.l / 2 + 6).toFixed(1)}" ry="${(p.h / 2 + 5).toFixed(1)}" `
    + `fill="${PETALES[i % 6]}" stroke="${ENCRES[i % 6]}" stroke-width="0.6"/>`).join("");
  const mot = (m: { mot: string; picto: string }) => (vues[m.picto]
    ? `<span class="flx-image"><img src="${escapeHtml(vues[m.picto])}" alt=""><span>${escapeHtml(m.mot)}</span></span>`
    : `<span class="flx-mot">${escapeHtml(m.mot)}</span>`);
  const blocs = petales.map((p, i) => {
    const pl = places[i];
    return `<div class="flx-petale" style="left: ${(pl.x - pl.l / 2).toFixed(1)}mm; top: ${(pl.y - pl.h / 2).toFixed(1)}mm; width: ${pl.l}mm; height: ${pl.h}mm; --flx-encre: ${ENCRES[i % 6]}; --flx-taille: ${tailleDesMots(p.mots).toFixed(2)}mm">`
      + `<div class="flx-nom">${escapeHtml(p.nom)}</div><div class="flx-mots">${p.mots.map(mot).join("")}</div></div>`;
  }).join("");
  const coeurImage = vues[r.coeur.trim().toLowerCase()];
  const coeur = `<div class="flx-coeur">${coeurImage ? `<img src="${escapeHtml(coeurImage)}" alt="">` : ""}<span>${escapeHtml(r.coeur.trim())}</span></div>`;
  const page = `<div class="flx-page"><svg class="flx-fond" viewBox="0 0 263 170" width="263mm" height="170mm">${fond}`
    + `<ellipse cx="131.5" cy="85" rx="33" ry="21" fill="#ffffff" stroke="${NOIR}" stroke-width="0.8"/></svg>${coeur}${blocs}</div>`;
  const credit = Object.keys(vues).length && motsADessinerFleur(r).some((m) => vues[m]) ? ATTRIBUTION_ARASAAC : "";
  if (r.format === "cahier") return feuille(`<div class="page flx-planche">${`<div class="flx-petit">${page}</div>`.repeat(2)}</div>${credit}`, "flx");
  return feuille(`<div class="page">${page}</div>${credit}`, "flx");
}

export const titreFleur = (brut: Partial<ReglagesFleur>) => `La fleur lexicale : ${reglagesFleurSurs(brut).coeur.trim() || "…"}`;

export const styleFleur = (brut: Partial<ReglagesFleur>) => STYLE_FLEUR
  + (reglagesFleurSurs(brut).format === "mur" ? "@page { size: A4 landscape; margin: 10mm; }" : "");

export const STYLE_FLEUR = `
  @media print { body { padding: 0; } }
  .feuille.flx { color: ${NOIR}; font-family: ${POLICE_SCRIPT}; }
  .feuille.flx .flx-page { position: relative; width: 263mm; height: 170mm; margin: 0 auto; }
  .feuille.flx .flx-fond { position: absolute; left: 0; top: 0; }
  .feuille.flx .flx-coeur { position: absolute; left: 98.5mm; top: 64mm; width: 66mm; height: 42mm; display: flex; flex-direction: column;
    align-items: center; justify-content: center; text-align: center; font-size: 8mm; font-weight: 800; line-height: 1.1; }
  .feuille.flx .flx-coeur img { width: 16mm; height: 16mm; object-fit: contain; margin: 0 0 1mm; }
  .feuille.flx .flx-petale { position: absolute; box-sizing: border-box; display: flex; flex-direction: column; align-items: center;
    justify-content: center; text-align: center; overflow: hidden; }
  .feuille.flx .flx-nom { font-size: 6mm; font-weight: 800; color: var(--flx-encre); margin: 0 0 1.5mm; }
  .feuille.flx .flx-mots { display: flex; flex-wrap: wrap; justify-content: center; gap: 1mm 3mm; font-size: var(--flx-taille, 4.3mm); font-weight: 600; line-height: 1.25; }
  .feuille.flx .flx-image { display: inline-flex; flex-direction: column; align-items: center; font-size: 3.6mm; }
  .feuille.flx .flx-image img { width: 12mm; height: 12mm; object-fit: contain; margin: 0; }
  .feuille.flx .flx-planche { display: flex; flex-direction: column; justify-content: space-around; align-items: center; width: 182mm; height: 250mm; margin: 0 auto; }
  .feuille.flx .flx-petit { zoom: 0.68; outline: 1mm dashed #9aa0b4; outline-offset: 1mm; }
`;

// ── La grille sémique ──

export interface ReglagesGrilleSemique {
  titre: string;
  /** Un mot par ligne, et ses traits : « chaise : a des pieds, a un dossier ». */
  lignes: string;
  /** Les croix ; sinon la grille est à remplir avec la classe. */
  croix: boolean;
  pictos: boolean;
  format: "mur" | "cahier";
}

/** L'exemple du guide du CP (p. 104) : les sièges, et ce qu'ils ont ou n'ont pas. */
export const GRILLE_DES_SIEGES = [
  "chaise : a des pieds, a un dossier, pour une personne",
  "tabouret : a des pieds, pour une personne",
  "fauteuil : a des pieds, a un dossier, a des accoudoirs, pour une personne",
  "canapé : a des pieds, a un dossier, a des accoudoirs, pour plusieurs personnes",
].join("\n");

export const REGLAGES_GRILLE_SEMIQUE: ReglagesGrilleSemique = { titre: "Les sièges", lignes: GRILLE_DES_SIEGES, croix: true, pictos: true, format: "mur" };

export function reglagesGrilleSemiqueSurs(brut: Partial<ReglagesGrilleSemique> | null | undefined): ReglagesGrilleSemique {
  const o = (brut && typeof brut === "object" ? brut : {}) as Partial<ReglagesGrilleSemique>;
  const d = REGLAGES_GRILLE_SEMIQUE;
  return {
    titre: typeof o.titre === "string" ? o.titre.slice(0, 60) : d.titre,
    lignes: typeof o.lignes === "string" ? o.lignes.slice(0, 3000) : d.lignes,
    croix: typeof o.croix === "boolean" ? o.croix : d.croix,
    pictos: typeof o.pictos === "boolean" ? o.pictos : d.pictos,
    format: o.format === "cahier" ? "cahier" : "mur",
  };
}

/** Les mots et leurs traits ; les colonnes : chaque trait, dans l'ordre où il apparaît (huit au plus). */
export function lireGrille(saisie: string): { mots: { mot: string; picto: string; traits: Set<string> }[]; traits: string[] } {
  const mots = saisie.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 12).map((ligne) => {
    const deux = ligne.indexOf(":");
    const { mot, picto } = motEtDessin(deux < 0 ? ligne : ligne.slice(0, deux));
    const traits = (deux < 0 ? "" : ligne.slice(deux + 1)).split(",").map((t) => t.trim()).filter(Boolean);
    return { mot, picto, traits: new Set(traits) };
  }).filter((m) => m.mot);
  const traits = [...new Set(mots.flatMap((m) => [...m.traits]))].slice(0, 8);
  return { mots, traits };
}

export function motsADessinerGrille(brut: Partial<ReglagesGrilleSemique>): string[] {
  const r = reglagesGrilleSemiqueSurs(brut);
  return r.pictos ? [...new Set(lireGrille(r.lignes).mots.map((m) => m.picto).filter(Boolean))] : [];
}

export function htmlGrilleSemique(brut: Partial<ReglagesGrilleSemique>, images: Record<string, string> = {}): string {
  const r = reglagesGrilleSemiqueSurs(brut);
  const { mots, traits } = lireGrille(r.lignes);
  const vues = r.pictos ? images : {};
  if (!mots.length || !traits.length) return feuille(`<div class="page sq-page"><div class="sq-vide">Écrivez un mot par ligne, puis ses traits : « chaise : a des pieds ».</div></div>`, "sq");
  const entete = `<tr><th class="sq-coin"></th>${traits.map((t) => `<th class="sq-trait">${escapeHtml(t)}</th>`).join("")}</tr>`;
  const lignes = mots.map((m) => `<tr><th class="sq-mot">${vues[m.picto] ? `<img src="${escapeHtml(vues[m.picto])}" alt="">` : ""}<span>${escapeHtml(m.mot)}</span></th>`
    + traits.map((t) => `<td>${r.croix && m.traits.has(t) ? "✕" : ""}</td>`).join("") + `</tr>`).join("");
  const page = `<div class="sq-page">${r.titre.trim() ? `<div class="sq-titre">${escapeHtml(r.titre.trim())}</div>` : ""}<table class="sq-table">${entete}${lignes}</table></div>`;
  const credit = mots.some((m) => vues[m.picto]) ? ATTRIBUTION_ARASAAC : "";
  if (r.format === "cahier") return feuille(`<div class="page sq-planche">${`<div class="sq-petit">${page}</div>`.repeat(4)}</div>${credit}`, "sq");
  return feuille(page.replace(`<div class="sq-page">`, `<div class="page sq-page">`) + credit, "sq");
}

export const titreGrilleSemique = (brut: Partial<ReglagesGrilleSemique>) => `La grille sémique : ${reglagesGrilleSemiqueSurs(brut).titre.trim() || "…"}`;

export const STYLE_GRILLE_SEMIQUE = `
  @media print { body { padding: 0; } }
  .feuille.sq { color: ${NOIR}; font-family: ${POLICE_SCRIPT}; }
  .feuille.sq .sq-page { width: 182mm; margin: 0 auto; box-sizing: border-box; }
  .feuille.sq .sq-titre { font-size: 8.5mm; font-weight: 800; text-align: center; line-height: 1.2; margin: 0 0 5mm; }
  .feuille.sq .sq-table { border-collapse: collapse; width: 100%; table-layout: fixed; }
  .feuille.sq .sq-table th, .feuille.sq .sq-table td { border: 0.5mm solid #6b7186; text-align: center; vertical-align: middle; padding: 1.5mm; }
  .feuille.sq .sq-coin { width: 46mm; border-top: none !important; border-left: none !important; }
  .feuille.sq .sq-trait { font-size: 4.4mm; font-weight: 700; line-height: 1.2; background: #e8f0fd; color: #1f4f9c; }
  .feuille.sq .sq-mot { height: 22mm; text-align: left; font-size: 6mm; font-weight: 800; background: #fdecea; }
  .feuille.sq .sq-mot img { width: 16mm; height: 16mm; object-fit: contain; vertical-align: middle; margin: 0 2mm 0 0; }
  .feuille.sq .sq-mot span { vertical-align: middle; }
  .feuille.sq .sq-table td { font-size: 9mm; font-weight: 800; color: #c0392b; }
  .feuille.sq .sq-vide { color: #687087; font-size: 5mm; padding: 10mm 0; text-align: center; }
  .feuille.sq .sq-planche { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: repeat(2, minmax(0, 1fr));
    width: 182mm; height: 250mm; margin: 0 auto; box-sizing: border-box; }
  .feuille.sq .sq-petit { zoom: 0.48; outline: 1mm dashed #9aa0b4; outline-offset: -1.5mm; box-sizing: border-box; overflow: hidden; padding-top: 6mm; }
`;
