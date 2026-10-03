// La relève du téléphone, en tâche de fond.
//
// Le dictaphone dépose sur Nuage quand il a du réseau ; l'ordinateur passe
// relever de loin en loin, tant que Maitrize est ouvert. Rien à cliquer : ce
// qui est arrivé se transcrit, puis se verse de lui-même dans le bilan de son
// créneau, et c'est ce versement qui s'annonce (voir versementDesVocaux.ts).

import { api, texteErreur, type BilanReleve } from "./api";
import { attenteApres } from "./syncAuto";
import { toast } from "./components/Toaster";
import { transcrireCeQuiAttend } from "./vocauxEnFond";

/** Intervalle de fond, en millisecondes : celui de la synchronisation. */
const PERIODE = 30_000;
/** Le premier passage, peu après l'ouverture. */
const AU_DEPART = 4_000;

export { EVT_VOIR_VOCAUX } from "./versementDesVocaux";

/** Émis après chaque passage : l'écran des Réglages dit où en est le relais. */
export const EVT_RELEVE = "maitrize:releve-telephone";

/** Le dernier passage : quand, ce qu'il a rapporté, ou pourquoi il a échoué. */
export interface EtatReleve { quand: number; bilan: BilanReleve | null; erreur: string }

let dernier: EtatReleve | null = null;
export const derniereReleve = (): EtatReleve | null => dernier;

/** Ce qu'on annonce d'une relève ; rien quand rien n'est arrivé. */
export function annonceDeLaReleve(b: Pick<BilanReleve, "vocaux" | "notes">): string {
  const morceaux: string[] = [];
  if (b.vocaux > 0) morceaux.push(`${b.vocaux} dictée${b.vocaux > 1 ? "s" : ""}`);
  if (b.notes > 0) morceaux.push(`${b.notes} note${b.notes > 1 ? "s" : ""}`);
  if (!morceaux.length) return "";
  return `${morceaux.join(" et ")} reçue${b.vocaux + b.notes > 1 ? "s" : ""} du téléphone`;
}

/** Ce que l'écran dit du dernier passage, en une ligne. */
export function resumeDeLaReleve(e: EtatReleve | null): string {
  if (!e) return "Pas encore de relève depuis l'ouverture.";
  if (e.erreur) return `⚠️ ${e.erreur}`;
  const b = e.bilan;
  if (!b) return "";
  const lignes: string[] = [annonceDeLaReleve(b) || "rien de nouveau"];
  if (b.pagesEnAttente > 0) {
    lignes.push(`${b.pagesEnAttente} page${b.pagesEnAttente > 1 ? "s" : ""} scannée${b.pagesEnAttente > 1 ? "s" : ""} en attente : ouvrez « Scanner avec le compagnon » dans les manuels`);
  }
  if (b.illisibles > 0) {
    lignes.push(`${b.illisibles} dépôt${b.illisibles > 1 ? "s" : ""} illisible${b.illisibles > 1 ? "s" : ""} : le téléphone est resté sur un ancien QR code, scannez le nouveau`);
  }
  if (b.erreur) lignes.push(`un dépôt n'a pas pu se ranger (${b.erreur})`);
  return lignes.join(" · ");
}

let minuteur: ReturnType<typeof setTimeout> | null = null;
let enCours = false;
let prochainDelai = PERIODE;
let echecs = 0;
/** Un lien mort se dit une fois : il faut refaire l'appairage, pas lire dix alertes. */
let lienMortDit = false;

function noter(e: EtatReleve) {
  dernier = e;
  window.dispatchEvent(new CustomEvent<EtatReleve>(EVT_RELEVE, { detail: e }));
}

/**
 * Un passage de relève.
 *
 * Silencieux quand rien n'arrive et quand le réseau manque : l'état se lit
 * dans les Réglages. Deux choses se disent tout haut — ce qui vient d'arriver,
 * et un lien qui ne vaut plus, parce qu'alors plus rien n'arrivera.
 */
async function passage() {
  if (enCours || document.hidden) return;
  enCours = true;
  try {
    const b = await api.telephoneRelever();
    echecs = 0;
    prochainDelai = PERIODE;
    if (b.occupe) return;
    noter({ quand: Date.now(), bilan: b, erreur: "" });
    lienMortDit = false;
    // Transcrire, puis verser dans le bilan : l'indicateur de transcription et
    // l'annonce du versement disent le reste, sans une annonce de plus ici.
    if (b.vocaux > 0 || b.notes > 0) void transcrireCeQuiAttend();
  } catch (e) {
    echecs += 1;
    prochainDelai = attenteApres(echecs);
    const erreur = texteErreur(e);
    noter({ quand: Date.now(), bilan: null, erreur });
    if (erreur.includes("Reliez à nouveau") && !lienMortDit) {
      lienMortDit = true;
      toast(erreur, { icone: "⚠️", duree: 15000 });
    }
  } finally {
    enCours = false;
  }
}

function programmer(delai: number) {
  if (minuteur) clearTimeout(minuteur);
  minuteur = setTimeout(async () => { await passage(); programmer(prochainDelai); }, delai);
}

/** Démarre la boucle ; rend de quoi l'arrêter. */
export function demarrerReleveTelephone(): () => void {
  programmer(AU_DEPART);
  // Revenir sur la fenêtre, c'est souvent rentrer de classe : on relève tout de suite.
  const auRetour = () => { if (!document.hidden) { echecs = 0; programmer(800); } };
  window.addEventListener("focus", auRetour);
  document.addEventListener("visibilitychange", auRetour);
  return () => {
    if (minuteur) clearTimeout(minuteur);
    minuteur = null;
    window.removeEventListener("focus", auRetour);
    document.removeEventListener("visibilitychange", auRetour);
  };
}

/** Relève sans attendre le prochain passage : après l'appairage, ou à la demande. */
export function releverMaintenant() {
  echecs = 0;
  prochainDelai = PERIODE;
  programmer(200);
}
