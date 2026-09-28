// Les phrases en désordre.
//
// Une phrase, ses mots sur des étiquettes mélangées : on les découpe, on les
// remet dans l'ordre, on colle — ou on recopie. La majuscule du premier mot
// et le point du dernier sont les indices ; le sens fait le reste. Les
// phrases sont celles de l'enseignant : la lecture du jour, la leçon de
// grammaire, les mots de la semaine.

import { escapeHtml } from "./print";
import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";

export interface ReglagesPhrases {
  /** Les phrases, une par ligne. */
  phrases: string;
  capitales: boolean;
  /** Une ligne sous les étiquettes, pour coller ou recopier la phrase. */
  lignes: boolean;
}
export const REGLAGES_PHRASES: ReglagesPhrases = {
  phrases: "Le chat dort sur le canapé.\nMaman prépare une tarte aux pommes.\nNous allons à la piscine le mardi.\nOù est mon cartable ?",
  capitales: false, lignes: true,
};

export const phrasesSaisies = (texte: string) => (texte ?? "").split("\n").map((p) => p.trim()).filter(Boolean);

/** Les étiquettes d'une phrase : ses mots, la ponctuation collée au mot — ou seule, quand un espace la précède. */
export const etiquettesDePhrase = (phrase: string) => phrase.trim().split(/\s+/).filter(Boolean);

export interface PhraseMelee { phrase: string; etiquettes: string[] }

/** Chaque phrase avec ses étiquettes mélangées — jamais dans l'ordre, dès qu'il y a deux mots différents. */
export function phrasesEnDesordre(phrases: string[], graine: number): PhraseMelee[] {
  const alea = hasard(graine);
  return phrases.map((phrase) => {
    const mots = etiquettesDePhrase(phrase);
    let etiquettes = melanger(alea, mots);
    for (let essai = 0; essai < 20 && etiquettes.join(" ") === mots.join(" ") && new Set(mots).size > 1; essai++) etiquettes = melanger(alea, mots);
    return { phrase, etiquettes };
  });
}

export function htmlPhrasesEnDesordre(liste: PhraseMelee[], r: ReglagesPhrases): string {
  const texte = (t: string) => escapeHtml(r.capitales ? t.toLocaleUpperCase("fr") : t);
  const bloc = (p: PhraseMelee, i: number) => `<div class="pe-phrase"><div class="pe-num">${i + 1}</div>
    <div class="pe-etiquettes">${p.etiquettes.map((e) => `<span class="pe-etiquette">${texte(e)}</span>`).join("")}</div>
    ${r.lignes ? `<div class="pe-ligne"></div>` : ""}</div>`;
  const regle = `<div class="titre">Phrases en désordre</div><div class="regle"><b>La règle</b>Découpe les étiquettes d'une phrase et remets les mots dans l'ordre. La majuscule commence la phrase, le point la termine. Quand la phrase est juste, colle-la sur la ligne — ou recopie-la.</div>`;
  const pages: string[] = [];
  for (let i = 0; i < Math.max(1, liste.length); i += 6) {
    pages.push(`<div class="page">${regle}${liste.slice(i, i + 6).map((p, j) => bloc(p, i + j)).join("")}</div>`);
  }
  const corrige = `<div class="page"><div class="titre">Phrases en désordre — corrigé</div><ol class="pe-corrige">${liste.map((p) => `<li>${texte(p.phrase)}</li>`).join("")}</ol></div>`;
  return feuille(pages.join("") + corrige, "pe");
}

export const STYLE_PHRASES = `
  .feuille.pe .pe-phrase { position: relative; padding: 2mm 0 2mm 8mm; margin-bottom: 5mm; page-break-inside: avoid; }
  .feuille.pe .pe-num { position: absolute; left: 0; top: 2.5mm; font-size: 12px; font-weight: 700; color: #687087; }
  .feuille.pe .pe-etiquettes { display: flex; flex-wrap: wrap; gap: 0; }
  .feuille.pe .pe-etiquette { border: 1px dashed #1c2233; padding: 2.5mm 4mm; font-size: 18px; font-weight: 600; background: #fff; margin: 0 -1px -1px 0; }
  .feuille.pe .pe-ligne { height: 14mm; border-bottom: 1.5px solid #1c2233; margin-top: 3mm; }
  .feuille.pe .pe-corrige { font-size: 15px; line-height: 2; padding-left: 8mm; }
`;
