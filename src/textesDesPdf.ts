import { api } from "./api";
import { ouvrirPdf, textesDeLaPage, type DocumentPdf } from "./pdfRendu";
import { avecLeursNumeros, decalageImprime, nettoyerLaPage, type PageLue } from "./quizDesGuides";

// ── Le texte d'un PDF du coffre-fort, page par page ───────────────────────
//
// Lu sur l'ordinateur, comme on le lit : les mots que pdf.js coupe en
// morceaux recollés (voir texteSuivi), et chaque page avec le numéro qu'elle
// imprime quand il diffère de son rang — la 28e page du programme de
// maternelle porte « 27 ». Le quiz des guides et les questions sur un
// document de l'Assistant IA s'en servent.

export const octetsDe = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

/** Le texte de toutes les pages d'un PDF, lu une fois par visite. */
const textesLus = new Map<string, PageLue[]>();

/** Le numéro imprimé de chaque page, quand le PDF le donne et qu'il diffère de son rang. */
export async function etiquettesDuPdf(pdf: DocumentPdf): Promise<(string | undefined)[]> {
  const etiquettes = await pdf.getPageLabels().catch(() => null);
  return Array.from({ length: pdf.numPages }, (_, i) => {
    const e = etiquettes?.[i]?.trim();
    return e && e !== String(i + 1) ? e : undefined;
  });
}

/** Une page lue : son texte tel qu'on le lit, celui que voit la recherche du lecteur, son numéro imprimé. */
export async function lirePage(pdf: DocumentPdf, numero: number, etiquette?: string): Promise<PageLue> {
  const { suivi, brut } = await textesDeLaPage(pdf, numero).catch(() => ({ suivi: "", brut: "" }));
  return { numero, texte: nettoyerLaPage(suivi), brut, ...(etiquette ? { etiquette } : {}) };
}

/**
 * Toutes les pages d'un PDF de Fichiers/, chacune avec son numéro imprimé —
 * celui du PDF, sinon celui qu'on lit en tête ou en pied de ses pages.
 * `avancement` dit où en est la lecture, toutes les dix pages.
 */
export async function toutesLesPagesDuPdf(nomFichier: string, avancement?: (page: number, total: number) => void): Promise<PageLue[]> {
  const deja = textesLus.get(nomFichier);
  if (deja) return deja;
  const pdf = await ouvrirPdf(octetsDe(await api.fichierRead(nomFichier)));
  try {
    const etiquettes = await etiquettesDuPdf(pdf);
    const toutes: PageLue[] = [];
    for (let numero = 1; numero <= pdf.numPages; numero++) {
      if (numero % 10 === 1) avancement?.(numero, pdf.numPages);
      toutes.push(await lirePage(pdf, numero, etiquettes[numero - 1]));
    }
    const numerotees = avecLeursNumeros(toutes, decalageImprime(toutes));
    textesLus.set(nomFichier, numerotees);
    return numerotees;
  } finally {
    void pdf.destroy();
  }
}
