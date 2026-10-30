// ⌘Z partout : défaire l'action qui vient d'être faite (demande de l'enseignant, octobre 2026).
//
// Plusieurs choses savent défaire leur dernier geste : la frappe dans un champ, que WebKit
// défait lui-même ; les tableaux d'Organisation et l'emploi du temps (useHistorique) ; le
// tableau de la TLA ; l'éditeur du déroulement d'une séance ; les bandeaux « Annuler » qui
// suivent une suppression. Chacune écoutait ⌘Z de son côté : une page gardée en vie mais
// cachée défaisait son tableau en silence, une suppression ne se défaisait qu'au bouton du
// bandeau, et dans un champ ⌘Z défaisait la frappe d'avant le geste qu'on voulait défaire.
//
// Un seul écouteur, désormais : chaque source s'inscrit avec le moment de son dernier geste,
// et ⌘Z défait le plus récent de ceux qu'on voit, la frappe comprise. ⌘⇧Z (Ctrl+Y) refait
// le dernier geste défait. Une fenêtre ouverte garde ⌘Z pour ses champs et pour les bandeaux.

export interface SourceAnnulable {
  /** Le moment de son dernier geste qu'elle sait défaire ; 0 s'il n'y en a pas. */
  aDefaire: () => number;
  defaire: () => void;
  /** Le moment où elle a défait le geste qu'elle sait refaire ; 0 s'il n'y en a pas. */
  aRefaire?: () => number;
  refaire?: () => void;
  /** À l'écran : une page cachée, un onglet replié ne défont rien. */
  visible: () => boolean;
  /** Vaut aussi quand une fenêtre est ouverte : un bandeau « Annuler » est au-dessus de tout. */
  partout?: boolean;
}

const sources = new Set<SourceAnnulable>();

/** Inscrit une source ; la fonction rendue la retire. */
export function inscrireAnnulable(s: SourceAnnulable): () => void {
  sources.add(s);
  return () => { sources.delete(s); };
}

/** Un éditeur qui défait lui-même sa frappe (le déroulement d'une séance) : WebKit n'y défait rien. */
export const ANNULATION_PROPRE = "data-annulation-propre";

const TEXTES = new Set(["text", "search", "email", "url", "tel", "password", "number", ""]);

/** Le champ de saisie d'un élément : lui-même, ou la zone éditable qui le contient ; rien pour une case à cocher. */
export function champDe(el: Element | null): HTMLElement | null {
  if (el instanceof HTMLTextAreaElement) return el;
  if (el instanceof HTMLInputElement) return TEXTES.has(el.type) ? el : null;
  if (!(el instanceof HTMLElement) || !el.isContentEditable) return null;
  let hote: HTMLElement = el;
  while (hote.parentElement?.isContentEditable) hote = hote.parentElement;
  return hote;
}

// La frappe, champ par champ : son dernier moment. WebKit garde une seule pile pour la page ;
// on retient seulement quand on a écrit, et où.
const frappes = new WeakMap<HTMLElement, number>();
let derniere: { champ: HTMLElement; quand: number } | null = null;
let frappeDefaiteLe = 0;

/** Ce qui se défait au choix : une source, ou la frappe (WebKit). */
export type Choix = { source: SourceAnnulable } | "frappe" | null;

/**
 * Le geste le plus récent, à défaire (ou à refaire) : celui d'une source qu'on voit, ou la
 * frappe — dans le champ où l'on est, sinon la dernière, tant que son champ est là.
 * `natif` : WebKit a-t-il de quoi défaire (refaire) ?
 */
export function choisir(refaire: boolean, o: { dansUnChamp: HTMLElement | null; propre: boolean; natif: boolean; fenetre?: boolean }): Choix {
  let choisie: SourceAnnulable | null = null;
  let t = 0;
  for (const s of sources) {
    if (!s.visible() || (o.fenetre && !s.partout)) continue;
    const q = refaire ? s.aRefaire?.() ?? 0 : s.aDefaire();
    if (q > t) { t = q; choisie = s; }
  }
  let frappe = 0;
  if (!o.propre && o.natif) {
    if (refaire) frappe = frappeDefaiteLe;
    else if (o.dansUnChamp) frappe = frappes.get(o.dansUnChamp) ?? 0;
    else if (derniere?.champ.isConnected) frappe = derniere.quand;
  }
  if (choisie && t > frappe) return { source: choisie };
  return frappe > 0 || (!choisie && o.natif && !o.propre) ? "frappe" : null;
}

/** Le moment de la frappe, pour les essais. */
export function noterFrappe(champ: HTMLElement, quand = Date.now()) {
  frappes.set(champ, quand);
  derniere = { champ, quand };
}

function surSaisie(e: Event) {
  const champ = champDe(e.target instanceof Element ? e.target : null);
  if (!champ || champ.closest(`[${ANNULATION_PROPRE}]`)) return;
  const type = (e as InputEvent).inputType ?? "";
  if (type === "historyUndo") { frappeDefaiteLe = Date.now(); return; }
  if (type !== "historyRedo") noterFrappe(champ);
}

const fenetreOuverte = () => !!document.querySelector(".overlay, [aria-modal='true']");
const natifPeut = (commande: "undo" | "redo") => { try { return document.queryCommandEnabled(commande); } catch { return false; } };

function surTouche(e: KeyboardEvent) {
  if (e.defaultPrevented || !(e.metaKey || e.ctrlKey) || e.altKey) return;
  const k = e.key.toLowerCase();
  const refaire = (k === "z" && e.shiftKey) || (k === "y" && e.ctrlKey && !e.metaKey && !e.shiftKey);
  if (!refaire && !(k === "z" && !e.shiftKey)) return;
  const cible = e.target instanceof Element ? e.target : null;
  const propre = !!cible?.closest(`[${ANNULATION_PROPRE}]`);
  const fenetre = !propre && fenetreOuverte();
  const choix = choisir(refaire, { dansUnChamp: champDe(cible), propre, natif: natifPeut(refaire ? "redo" : "undo"), fenetre });
  if (choix === "frappe") return;
  // Dans un éditeur qui défait lui-même, WebKit ne défait jamais rien : ses cases ne suivraient plus.
  if (choix === null) { if (propre) e.preventDefault(); return; }
  e.preventDefault();
  if (refaire) choix.source.refaire?.(); else choix.source.defaire();
}

/** « Édition › Annuler » au menu, dans un éditeur qui défait lui-même : la même chose que ⌘Z. */
function surAvantSaisie(e: Event) {
  const type = (e as InputEvent).inputType;
  if (type !== "historyUndo" && type !== "historyRedo") return;
  if (!(e.target instanceof Element) || !e.target.closest(`[${ANNULATION_PROPRE}]`)) return;
  e.preventDefault();
  const choix = choisir(type === "historyRedo", { dansUnChamp: null, propre: true, natif: false });
  if (choix && choix !== "frappe") { if (type === "historyRedo") choix.source.refaire?.(); else choix.source.defaire(); }
}

/**
 * « Annule », dit à la télécommande : comme ⌘Z, le geste le plus récent de ce qu'on voit — une création, une
 * suppression —, sans la frappe. Faux s'il n'y a rien à défaire.
 */
export function annulerDeLoin(): boolean {
  const choix = choisir(false, { dansUnChamp: null, propre: true, natif: false });
  if (!choix || choix === "frappe") return false;
  choix.source.defaire();
  return true;
}

let installee = false;

/** Pose l'écouteur unique, une fois, au démarrage. */
export function installerAnnulation() {
  if (installee) return;
  installee = true;
  // Sur la fenêtre, à la remontée : un écran qui garde une touche pour lui l'a déjà arrêtée.
  window.addEventListener("keydown", surTouche);
  document.addEventListener("input", surSaisie, true);
  document.addEventListener("beforeinput", surAvantSaisie, true);
}
