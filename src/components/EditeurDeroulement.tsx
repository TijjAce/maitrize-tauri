import React from "react";
import { api, raccourci, texteErreur } from "../api";
import { toast } from "./Toaster";
import { confirmer } from "./confirmer";
import { openCtx, type CtxItem } from "./ctxmenu";
import { MenuStyles } from "./EditeurRiche";
import { PhotoTelephone } from "./PhotoTelephone";
import { chargerImage, imagesDuHtmlColle, preparerImage } from "./imagesTexte";
import { reformuler, type Style } from "../reformulation";
import {
  CHAMP_ORGANISATION, CHAMP_POSTURE, COULEURS_DU_TEXTE, ORGANISATIONS, SURLIGNAGES, champDe, champsDesPhases, composantes, documentDeLaSeance,
  documentEnHtml, echapper, ecrireSeance, ICONE_CITE, iconeOrganisation, imagesDuDocument, ligneDeTableau, ligneEnHtml, ligneProtegee, lireSeance,
  marqueDeCitation, memeNom, nomDeLaCouleur, seanceEnCartes, separateurDeTableau, type GenreCite, type PhaseDeSeance, type SeanceEnPhases,
} from "../documentSeance";
import { tableauDesPhases, type Demarche } from "../demarches";
import { BibliothequeDesDemarches } from "./BibliothequeDesDemarches";
import { CitationButton } from "./Deroulement";
import { inscrireAnnulable } from "../annulation";

// Le déroulement d'une séance (demande de l'enseignant, octobre 2026) : un
// texte libre, puis des phases en cartes — chacune son titre, sa durée, son
// organisation, son déroulement, la posture de l'enseignant et les champs
// ajoutés à toute la séance. Dans chaque case, on écrit comme dans un
// traitement de texte : gras, italique, couleurs, listes, tableaux, images
// collées, glissées ou prises au téléphone, supports cités d'un « @ ».
//
// Chaque case est un `contentEditable` à elle ; ce qu'on y écrit se relit en
// texte balisé (voir documentSeance.ts) à chaque frappe, et la séance entière
// se réécrit. Une case n'est réécrite que si son texte change d'ailleurs — la
// réécrire à chaque frappe ferait sauter le curseur. La mise en forme passe par
// `document.execCommand`, présent dans les webviews de macOS et de Windows :
// il garde l'historique d'annulation.

/** Ce qu'on peut citer d'un « @ » : un support de la séance, ou un élément du bureau à y poser. */
export interface Citable {
  genre: GenreCite;
  id: string;
  titre: string;
  detail: string;
  groupe: "seance" | "bureau";
  /** Un élément du bureau : le poser dans la séance, et rendre ce qu'on cite (une feuille PDF est copiée). */
  poser?: () => Promise<{ genre: GenreCite; id: string; titre: string } | null>;
}

export interface EditeurDeroulementHandle {
  /** Cite un support à l'endroit du curseur (ou au bout de la case en cours). */
  citer: (c: { genre: GenreCite; id: string; titre: string }) => void;
}

const DUREES_DE_PHASE = ["5 min", "10 min", "15 min", "20 min", "25 min", "30 min", "45 min", "1 h"];

const plat = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** La largeur qu'il faut à la barre d'outils pour tout dire sur une ligne ; plus le bouton « 🧭 Démarche… », tant qu'il n'y a pas de phase. */
const LARGEUR_BARRE_PLEINE = 810;
const LARGEUR_DEMARCHE = 120;

/** Les éléments qui font une ligne à eux seuls. */
const BLOCS = /^(P|DIV|H[1-6]|UL|OL|LI|FIGURE|BLOCKQUOTE|PRE|TABLE|SECTION|ARTICLE)$/;

/** Un texte marqué ligne à ligne : une marque ne passe jamais d'une ligne à l'autre, ni n'entoure une image. */
const marquer = (t: string, avant: string, apres: string) =>
  t.split("\n").map((l) => (l.trim() && !/^\[img:[^\]]+\]$/.test(l.trim()) ? `${avant}${l}${apres}` : l)).join("\n");

/** Ce qu'une case dit, relu en texte balisé : un bloc par ligne (voir documentSeance.ts). */
export function versDocument(racine: HTMLElement): string {
  const lignes: string[] = [];
  const enLigne = (n: Node): string => {
    if (n.nodeType === Node.TEXT_NODE) return (n.textContent ?? "").replace(/\u00a0/g, " ").replace(/\n/g, " ");
    if (!(n instanceof HTMLElement)) return "";
    if (n.dataset.ignorer) return "";
    if (n.dataset.cite) {
      const [genre, ...reste] = n.dataset.cite.split(":");
      return marqueDeCitation(genre as GenreCite, reste.join(":"), n.dataset.titre ?? n.textContent ?? "");
    }
    if (n.dataset.brut) return n.dataset.brut;
    if (n.tagName === "BR") return "\n";
    if (n.dataset.img) return `\n[img:${n.dataset.img}]\n`;
    let t = Array.from(n.childNodes).map(enLigne).join("");
    if (!t.trim()) return t;
    // Les couleurs telles que les pose la vue web : <font color>, ou un style ; celles hors de la palette s'oublient.
    const couleur = nomDeLaCouleur(n.tagName === "FONT" ? n.getAttribute("color") ?? "" : n.style.color, COULEURS_DU_TEXTE);
    if (couleur) t = marquer(t, `{${couleur}|`, "}");
    const fond = nomDeLaCouleur(n.style.backgroundColor, SURLIGNAGES);
    if (fond) t = marquer(t, `{${fond}|`, "}");
    const poids = n.style.fontWeight;
    if (n.tagName === "B" || n.tagName === "STRONG" || poids === "bold" || Number(poids) >= 600) t = marquer(t, "**", "**");
    if (n.tagName === "I" || n.tagName === "EM" || n.style.fontStyle === "italic") t = marquer(t, "*", "*");
    return t;
  };
  const pousser = (texte: string, prefixe = "") => {
    for (const l of texte.split("\n")) {
      if (/^\[img:[^\]]+\]$/.test(l.trim())) lignes.push(l.trim());
      else lignes.push(prefixe ? prefixe + l : ligneProtegee(l));
    }
  };
  /** Un élément de liste : son texte sur une ligne, puis ses sous-listes, à plat. */
  const liste = (l: HTMLElement) => {
    for (const li of Array.from(l.children)) {
      if (li.tagName !== "LI") continue;
      const sous = Array.from(li.children).filter((c): c is HTMLElement => /^(UL|OL)$/.test(c.tagName));
      pousser(Array.from(li.childNodes).filter((c) => !sous.includes(c as HTMLElement)).map(enLigne).join("").replace(/\n$/, ""), "- ");
      sous.forEach(liste);
    }
  };
  /** Un tableau : une ligne par rangée, ses cases sur une ligne ; sous la première, la marque de l'en-tête. */
  const tableau = (t: HTMLTableElement) => {
    const rangees = Array.from(t.rows);
    if (!rangees.length) return;
    const cases = (r: HTMLTableRowElement) => Array.from(r.cells).map((c) => Array.from(c.childNodes)
      .map((x) => (x instanceof HTMLElement && BLOCS.test(x.tagName) ? ` ${enLigne(x)} ` : enLigne(x))).join("")
      .replace(/\[img:[^\]]+\]/g, " ").replace(/\s+/g, " ").trim());
    const entete = !!t.tHead?.rows.length || Array.from(rangees[0].cells).every((c) => c.tagName === "TH");
    rangees.forEach((r, i) => {
      lignes.push(ligneDeTableau(cases(r)));
      if (i === 0 && entete) lignes.push(separateurDeTableau(r.cells.length));
    });
  };
  /**
   * Les blocs, ligne à ligne. Du texte ou une pastille posés hors de tout
   * paragraphe (l'éditeur en laisse après certains effacements) forment une
   * seule ligne ; une liste posée dans un paragraphe (WebKit le fait) reste
   * une liste ; un titre collé d'ailleurs n'est qu'un paragraphe.
   */
  const parcourir = (parent: Node, paragraphe: boolean) => {
    const depart = lignes.length;
    let enCours: Node[] = [];
    const finir = () => {
      // Le <br> qui finit un bloc n'est là que pour lui donner une hauteur.
      const t = enCours.map(enLigne).join("").replace(/\n$/, "");
      if (t.trim()) pousser(t);
      enCours = [];
    };
    for (const n of Array.from(parent.childNodes)) {
      if (!(n instanceof HTMLElement) || !(BLOCS.test(n.tagName) || n.dataset.img)) { enCours.push(n); continue; }
      finir();
      if (n.dataset.img) lignes.push(`[img:${n.dataset.img}]`);
      else if (n.tagName === "UL" || n.tagName === "OL") liste(n);
      else if (n instanceof HTMLTableElement) tableau(n);
      else parcourir(n, true);
    }
    finir();
    // Un paragraphe vide reste une ligne vide.
    if (paragraphe && lignes.length === depart) lignes.push("");
  };
  parcourir(racine, false);
  // Une liste vide (« - ») ou des lignes vides en fin : rien à garder.
  while (lignes.length && !lignes[lignes.length - 1].replace(/^- /, "").trim()) lignes.pop();
  return lignes.map((l) => l.replace(/\s+$/, "")).join("\n");
}

/** Ce qui ne se voit pas comme du texte mais compte comme du contenu. */
const CONTENU_SANS_TEXTE = "[data-cite],[data-img],[data-brut],img";

/** Le bloc de la case (paragraphe, liste, image) où se trouve un nœud. */
function blocDe(racine: HTMLElement, n: Node | null): HTMLElement | null {
  let x = n;
  while (x && x.parentNode !== racine) x = x.parentNode;
  return x instanceof HTMLElement ? x : null;
}

/** Le curseur est-il au début (ou à la fin) de son bloc ? */
function auBord(bloc: HTMLElement, plage: Range, cote: "debut" | "fin"): boolean {
  const r = document.createRange();
  if (cote === "debut") { r.setStart(bloc, 0); r.setEnd(plage.startContainer, plage.startOffset); }
  else { r.setStart(plage.endContainer, plage.endOffset); r.setEnd(bloc, bloc.childNodes.length); }
  return !r.toString().replace(/[\u200b\n]/g, "").length && !r.cloneContents().querySelector(CONTENU_SANS_TEXTE);
}

const poserLeCurseur = (n: Node, ou: "debut" | "fin") => {
  const r = document.createRange();
  r.selectNodeContents(n);
  r.collapse(ou === "debut");
  const sel = window.getSelection();
  sel?.removeAllRanges(); sel?.addRange(r);
};

/**
 * ⌫ et ⌦ autour d'une image. Laissés au navigateur, ils fondent le paragraphe
 * d'après dans celui d'avant ; ici, l'image s'en va seule. Rend vrai quand la
 * touche est traitée.
 */
function toucheAutourDUneImage(racine: HTMLElement, touche: string): boolean {
  if (touche !== "Backspace" && touche !== "Delete") return false;
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return false;
  const plage = sel.getRangeAt(0);
  // Une image choisie d'un clic s'en va seule.
  const choisie = racine.querySelector<HTMLElement>(".doc-image.choisie");
  if (choisie && sel.containsNode(choisie)) {
    const suite = choisie.nextElementSibling ?? choisie.previousElementSibling;
    const avant = !choisie.nextElementSibling;
    choisie.remove();
    if (!racine.firstElementChild) racine.innerHTML = "<p><br></p>";
    poserLeCurseur(suite && racine.contains(suite) ? suite : racine.firstElementChild!, avant ? "fin" : "debut");
    return true;
  }
  if (!plage.collapsed) return false;
  const ici = blocDe(racine, plage.startContainer);
  if (!ici) return false;
  if (touche === "Backspace" && auBord(ici, plage, "debut")) {
    const avant = ici.previousElementSibling;
    if (avant instanceof HTMLElement && avant.dataset.img) { avant.remove(); return true; }
  }
  if (touche === "Delete" && auBord(ici, plage, "fin")) {
    const apres = ici.nextElementSibling;
    if (apres instanceof HTMLElement && apres.dataset.img) { apres.remove(); return true; }
  }
  return false;
}

/** La case de tableau où se trouve un nœud. */
const celluleDe = (n: Node | null): HTMLTableCellElement | null =>
  (n ? (n instanceof Element ? n : n.parentElement)?.closest<HTMLTableCellElement>("td, th") ?? null : null);

const caseVide = (balise: "td" | "th") => { const c = document.createElement(balise); c.innerHTML = "<br>"; return c; };

/** Un tableau neuf : une ligne d'en-tête, puis deux rangées ; trois colonnes. */
function nouveauTableau(colonnes = 3, rangees = 3): HTMLTableElement {
  const t = document.createElement("table");
  t.className = "doc-grille";
  const tete = t.createTHead().insertRow();
  for (let i = 0; i < colonnes; i++) tete.appendChild(caseVide("th"));
  const corps = t.createTBody();
  for (let r = 1; r < rangees; r++) { const tr = corps.insertRow(); for (let i = 0; i < colonnes; i++) tr.appendChild(caseVide("td")); }
  return t;
}

/** Une rangée de plus, dessous ou dessus ; sous la ligne d'en-tête, elle ouvre le corps du tableau. Rend la case où écrire. */
function ajouterLigne(rangee: HTMLTableRowElement, ou: "avant" | "apres", colonne: number): HTMLElement {
  const t = rangee.closest("table")!;
  const n = Math.max(1, ...Array.from(t.rows).map((r) => r.cells.length));
  const neuve = document.createElement("tr");
  for (let i = 0; i < n; i++) neuve.appendChild(caseVide("td"));
  if (rangee.parentElement?.tagName === "THEAD") { const corps = t.tBodies[0] ?? t.createTBody(); corps.insertBefore(neuve, corps.firstChild); }
  else if (ou === "avant") rangee.before(neuve);
  else rangee.after(neuve);
  return neuve.cells[Math.min(colonne, n - 1)];
}

/** Une colonne de plus, à droite ou à gauche de celle-ci. Rend sa case dans la rangée où l'on était. */
function ajouterColonne(t: HTMLTableElement, colonne: number, ou: "avant" | "apres", rangee: HTMLTableRowElement): HTMLElement | null {
  let visee: HTMLElement | null = null;
  for (const r of Array.from(t.rows)) {
    const c = caseVide(r.parentElement?.tagName === "THEAD" ? "th" : "td");
    r.insertBefore(c, r.cells[ou === "avant" ? colonne : colonne + 1] ?? null);
    if (r === rangee) visee = c;
  }
  return visee;
}

function supprimerTableau(t: HTMLTableElement): HTMLElement | null {
  const voisin = (t.nextElementSibling ?? t.previousElementSibling) as HTMLElement | null;
  t.remove();
  return voisin;
}

function supprimerLigne(rangee: HTMLTableRowElement): HTMLElement | null {
  const t = rangee.closest("table")!;
  const section = rangee.parentElement!;
  const voisine = (rangee.nextElementSibling ?? rangee.previousElementSibling) as HTMLTableRowElement | null;
  rangee.remove();
  if (!section.children.length) section.remove();
  if (!t.rows.length) return supprimerTableau(t);
  return (voisine?.isConnected ? voisine : t.rows[0]).cells[0] ?? null;
}

function supprimerColonne(t: HTMLTableElement, colonne: number): HTMLElement | null {
  for (const r of Array.from(t.rows)) r.cells[colonne]?.remove();
  if (Array.from(t.rows).every((r) => !r.cells.length)) return supprimerTableau(t);
  const r = t.rows[0];
  return r.cells[Math.min(colonne, r.cells.length - 1)] ?? null;
}

/** La première rangée devient la ligne d'en-tête, ou le redevient d'une rangée. */
function basculerEntete(t: HTMLTableElement): HTMLElement | null {
  const changer = (r: HTMLTableRowElement, balise: "td" | "th", vers: HTMLTableRowElement) => {
    for (const c of Array.from(r.cells)) { const x = document.createElement(balise); x.append(...Array.from(c.childNodes)); vers.appendChild(x); }
    r.remove();
    return vers;
  };
  if (t.tHead?.rows.length) {
    const corps = t.tBodies[0] ?? t.createTBody();
    const neuve = document.createElement("tr");
    corps.insertBefore(neuve, corps.firstChild);
    changer(t.tHead.rows[0], "td", neuve);
    t.tHead.remove();
    return neuve.cells[0] ?? null;
  }
  const corps = t.tBodies[0];
  if (!corps?.rows.length) return null;
  const neuve = changer(corps.rows[0], "th", t.createTHead().insertRow());
  if (!corps.rows.length) corps.remove();
  return neuve.cells[0] ?? null;
}

/** La case d'après (ou d'avant), dans l'ordre où l'on lit le tableau. */
function caseVoisine(cellule: HTMLTableCellElement, sens: 1 | -1): HTMLTableCellElement | null {
  const toutes = Array.from(cellule.closest("table")!.rows).flatMap((r) => Array.from(r.cells));
  return toutes[toutes.indexOf(cellule) + sens] ?? null;
}

/**
 * ⌫ au début du paragraphe qui suit un tableau, ⌦ au bout de celui qui le
 * précède : laissés au navigateur, ils versent le paragraphe dans une case.
 * Ici, le curseur passe dans le tableau, et un paragraphe vide s'en va s'il
 * n'est pas le dernier. Rend vrai quand la touche est traitée.
 */
function toucheAutourDUnTableau(racine: HTMLElement, touche: string): boolean {
  if (touche !== "Backspace" && touche !== "Delete") return false;
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || !sel.isCollapsed) return false;
  const plage = sel.getRangeAt(0);
  const ici = blocDe(racine, plage.startContainer);
  if (!ici || ici instanceof HTMLTableElement) return false;
  const avant = ici.previousElementSibling, apres = ici.nextElementSibling;
  if (touche === "Backspace" && avant instanceof HTMLTableElement && auBord(ici, plage, "debut")) {
    if (apres && !ici.textContent?.replace(/\u200b/g, "").trim() && !ici.querySelector(CONTENU_SANS_TEXTE)) ici.remove();
    const derniere = avant.rows[avant.rows.length - 1];
    if (derniere?.cells.length) poserLeCurseur(derniere.cells[derniere.cells.length - 1], "fin");
    return true;
  }
  if (touche === "Delete" && apres instanceof HTMLTableElement && auBord(ici, plage, "fin")) {
    const premiere = apres.rows[0]?.cells[0];
    if (premiere) poserLeCurseur(premiere, "debut");
    return true;
  }
  return false;
}

/**
 * La couleur qu'on retire : posée comme une autre — la vue web défait alors
 * celles qu'elle recouvre —, puis ôtée de la case (`oterSansCouleur`).
 */
const SANS_COULEUR = "#010203";
const estSansCouleur = (css: string | null) => composantes(css ?? "")?.join() === "1,2,3";
function oterSansCouleur(z: HTMLElement) {
  z.querySelectorAll<HTMLElement>("font[color], [style]").forEach((el) => {
    if (el.tagName === "FONT" && estSansCouleur(el.getAttribute("color"))) el.removeAttribute("color");
    if (estSansCouleur(el.style.color)) el.style.removeProperty("color");
    if (estSansCouleur(el.style.backgroundColor)) el.style.removeProperty("background-color");
    if (el.hasAttribute("style") && !el.getAttribute("style")!.trim()) el.removeAttribute("style");
    if ((el.tagName === "FONT" || el.tagName === "SPAN") && !el.attributes.length) el.replaceWith(...Array.from(el.childNodes));
  });
}

/** Ce que chaque case a publié : elle n'est réécrite que si son texte change d'ailleurs. */
const publies = new WeakMap<HTMLElement, string>();

/** Les images d'une case n'ont que leur nom : on les lit et on les montre. */
function afficherImages(z: HTMLElement) {
  z.querySelectorAll<HTMLImageElement>("img[data-fichier]:not([src])").forEach((img) => {
    chargerImage(img.dataset.fichier ?? "").then((src) => { img.src = src; }).catch(() => { img.alt = "Image introuvable"; });
  });
}

/**
 * Une case où l'on écrit : le texte libre, le déroulement d'une phase, un de ses champs. Les cases des phases n'ont
 * pas d'invite : leur nom est au-dessus, et les exemples chargeaient la carte (demande de l'enseignant, octobre 2026).
 */
const Case = React.memo(function Case({ chemin, valeur, invite, libelle }: { chemin: string; valeur: string; invite?: string; libelle: string }) {
  const el = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    const z = el.current;
    if (!z || publies.get(z) === valeur) return;
    z.innerHTML = documentEnHtml(valeur, { edition: true });
    publies.set(z, valeur);
    z.toggleAttribute("data-vide", !valeur.trim());
    afficherImages(z);
  }, [valeur]);
  return (
    <div ref={el} className="doc-case" contentEditable suppressContentEditableWarning data-zone={chemin} data-invite={invite}
      role="textbox" aria-multiline="true" aria-label={libelle} spellCheck />
  );
});

interface Phase extends PhaseDeSeance { cle: number }
interface Modele { intro: string; phases: Phase[] }
let derniereCle = 0;
const versModele = (s: SeanceEnPhases): Modele => ({ intro: s.intro, phases: s.phases.map((p) => ({ ...p, cle: ++derniereCle })) });

const cheminDeroulement = (cle: number) => `${cle}|d`;
const cheminChamp = (cle: number, nom: string) => `${cle}|c|${nom}`;
const cheminTitre = (cle: number) => `${cle}|t`;

/** La case qu'un retour en arrière a changée : on y revient. Rien quand seule une phase est partie. */
function zoneChangee(a: Modele, b: Modele): string | null {
  if (a.intro !== b.intro) return "intro";
  for (const p of b.phases) {
    const q = a.phases.find((x) => x.cle === p.cle);
    if (!q || q.titre !== p.titre) return cheminTitre(p.cle);
    if (q.deroulement !== p.deroulement) return cheminDeroulement(p.cle);
    const champ = p.champs.find((c) => q.champs.find((d) => memeNom(d.nom, c.nom))?.texte !== c.texte);
    if (champ) return cheminChamp(p.cle, champ.nom);
  }
  return null;
}
/** Une frappe — lettres, effacement, retour à la ligne — et non une mise en forme ou une image. */
const estUneFrappe = (type: string) => /^(insert(Text|CompositionText|ReplacementText|Paragraph|LineBreak)|delete)/.test(type);
const caseDe = (n: Node | null): HTMLElement | null =>
  (n ? (n instanceof Element ? n : n.parentElement)?.closest<HTMLElement>("[data-zone]") ?? null : null);

export const EditeurDeroulement = React.forwardRef<EditeurDeroulementHandle, {
  valeur: string;
  onChange: (document: string) => void;
  citables: Citable[];
  onOuvrirCitation: (genre: GenreCite, id: string) => void;
  /** « ＋ Ajouter ou créer un support… », au bas du menu « @ ». */
  onAjouterSupport: () => void;
  onFabriquer: () => void;
  /** Les démarches de la compétence de la séquence, et sa classe : la bibliothèque des démarches s'ouvre sur elles. */
  demarches?: { proposees: Demarche[]; classe?: string | null };
}>(function EditeurDeroulement({ valeur, onChange, citables, onOuvrirCitation, onAjouterSupport, onFabriquer, demarches }, ref) {
  const racine = React.useRef<HTMLDivElement>(null);
  const [modele, setModele] = React.useState<Modele>(() => versModele(lireSeance(valeur)));
  const courant = React.useRef(modele);
  const publie = React.useRef(valeur);
  // ⌘Z défait le dernier geste de l'éditeur — une frappe, une phase, une durée, une pastille, une image —, et ⌘⇧Z
  // le refait, par l'écouteur unique de l'application (voir annulation.ts). WebKit n'y défait rien : les cases se
  // redessinent d'après la séance, et son annulation ne les suivrait pas. Les frappes d'une même case, sans autre
  // geste entre elles, ne font qu'un geste.
  const passe = React.useRef<{ m: Modele; quand: number }[]>([]);
  const futur = React.useRef<{ m: Modele; quand: number }[]>([]);
  const frappeEnCours = React.useRef("");
  const aRetrouver = React.useRef<string | null>(null);
  // La séance n'est relue que si son texte change d'ailleurs (à l'ouverture, un champ ajouté, une autre machine) :
  // ce qu'on défaisait ne s'y applique plus.
  React.useEffect(() => {
    if (valeur === publie.current) return;
    publie.current = valeur;
    const m = versModele(lireSeance(valeur));
    courant.current = m;
    setModele(m);
    passe.current = []; futur.current = []; frappeEnCours.current = "";
  }, [valeur]);
  const publier = (m: Modele) => {
    courant.current = m;
    setModele(m);
    const texte = ecrireSeance(m);
    if (texte === publie.current) return;
    publie.current = texte;
    onChange(texte);
  };
  /** Un geste : la séance change, et l'état d'avant s'empile — sauf pour une frappe qui poursuit la précédente. */
  const changer = (m: Modele, frappe = "") => {
    if (ecrireSeance(m) !== publie.current) {
      const haut = passe.current[passe.current.length - 1];
      // Une pause d'une seconde et demie ferme le geste : ⌘Z ne reprend pas tout un paragraphe d'un coup.
      if (frappe && frappe === frappeEnCours.current && haut && Date.now() - haut.quand < 1500) haut.quand = Date.now();
      else passe.current = [...passe.current.slice(-99), { m: courant.current, quand: Date.now() }];
      futur.current = [];
      frappeEnCours.current = frappe;
    }
    publier(m);
  };
  const retourner = (de: React.MutableRefObject<{ m: Modele; quand: number }[]>, vers: React.MutableRefObject<{ m: Modele; quand: number }[]>) => {
    const etat = de.current.pop();
    if (!etat) return;
    vers.current.push({ m: courant.current, quand: Date.now() });
    frappeEnCours.current = "";
    aRetrouver.current = zoneChangee(courant.current, etat.m);
    publier(etat.m);
  };
  const gestes = React.useRef({ defaire: () => {}, refaire: () => {} });
  gestes.current = { defaire: () => retourner(passe, futur), refaire: () => retourner(futur, passe) };
  React.useEffect(() => inscrireAnnulable({
    aDefaire: () => passe.current[passe.current.length - 1]?.quand ?? 0,
    defaire: () => gestes.current.defaire(),
    aRefaire: () => futur.current[futur.current.length - 1]?.quand ?? 0,
    refaire: () => gestes.current.refaire(),
    visible: () => !!racine.current?.isConnected && racine.current.getClientRects().length > 0,
  }), []);
  const majPhase = (cle: number, modif: (p: Phase) => Phase, frappe = "") => {
    const m = courant.current;
    changer({ ...m, phases: m.phases.map((p) => (p.cle === cle ? modif(p) : p)) }, frappe);
  };
  const poserChamp = (cle: number, nom: string, texte: string, frappe = "") => majPhase(cle, (p) => ({
    ...p,
    champs: p.champs.some((c) => memeNom(c.nom, nom))
      ? p.champs.map((c) => (memeNom(c.nom, nom) ? { ...c, texte } : c))
      : [...p.champs, { nom, texte }],
  }), frappe);

  const derniere = React.useRef<Range | null>(null);
  const active = React.useRef<HTMLElement | null>(null);
  const aFocaliser = React.useRef<number | null>(null);
  const [etats, setEtats] = React.useState<Record<string, boolean>>({});
  const [envoi, setEnvoi] = React.useState(false);
  const fichiers = React.useRef<HTMLInputElement>(null);
  // Une barre trop étroite pour tout dire sur une ligne ne garde, des outils secondaires, que l'icône.
  const barre = React.useRef<HTMLDivElement>(null);
  const [compacte, setCompacte] = React.useState(false);
  const seuil = React.useRef(LARGEUR_BARRE_PLEINE);
  seuil.current = LARGEUR_BARRE_PLEINE + (modele.phases.length ? 0 : LARGEUR_DEMARCHE);
  React.useLayoutEffect(() => {
    const el = barre.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const suivre = new ResizeObserver(() => setCompacte(el.clientWidth < seuil.current));
    suivre.observe(el);
    return () => suivre.disconnect();
  }, []);
  const sansPhase = !modele.phases.length;
  React.useLayoutEffect(() => { if (barre.current) setCompacte(barre.current.clientWidth < seuil.current); }, [sansPhase]);

  React.useEffect(() => {
    try { document.execCommand("defaultParagraphSeparator", false, "p"); document.execCommand("styleWithCSS", false, "false"); } catch { /* sans effet ailleurs */ }
  }, []);
  // Une phase neuve : on écrit d'abord son titre.
  React.useEffect(() => {
    if (aFocaliser.current === null) return;
    racine.current?.querySelector<HTMLInputElement>(`[data-phase-titre="${aFocaliser.current}"]`)?.focus();
    aFocaliser.current = null;
  });
  // Après ⌘Z ou ⌘⇧Z, le curseur revient là où la séance a changé.
  React.useEffect(() => {
    const chemin = aRetrouver.current;
    if (chemin === null) return;
    aRetrouver.current = null;
    if (chemin.endsWith("|t")) racine.current?.querySelector<HTMLInputElement>(`[data-phase-titre="${chemin.split("|")[0]}"]`)?.focus();
    else allerA(chemin);
  });

  const dansLEditeur = (n: Node | null) => !!n && !!racine.current?.contains(n) && !!caseDe(n);
  const caseAuChemin = (chemin: string) => racine.current?.querySelector<HTMLElement>(`[data-zone="${CSS.escape(chemin)}"]`) ?? null;
  /** La case où l'on écrivait ; à défaut, le déroulement de la dernière phase, ou le texte libre. */
  const caseActive = (): HTMLElement | null => {
    const a = active.current;
    if (a?.isConnected && racine.current?.contains(a)) return a;
    const der = courant.current.phases[courant.current.phases.length - 1];
    return caseAuChemin(der ? cheminDeroulement(der.cle) : "intro");
  };
  const allerA = (chemin: string) => {
    const z = caseAuChemin(chemin);
    if (!z) return;
    z.focus();
    poserLeCurseur(z.lastElementChild ?? z, "fin");
  };

  /**
   * WebKit ôte « contenteditable=false » des pastilles qu'une commande déplace
   * (une liste, par exemple) : on le leur rend, et ce qui aurait été tapé
   * dedans en ressort — sinon la relecture, qui ne garde d'une pastille que sa
   * marque, le perdrait.
   */
  const reparer = (z: HTMLElement) => {
    z.querySelectorAll<HTMLElement>("[data-cite],[data-brut],[data-img]").forEach((n) => {
      if (n.getAttribute("contenteditable") === "false") return;
      const attendu = n.dataset.cite ? `${ICONE_CITE[n.dataset.cite.split(":")[0] as GenreCite] ?? ""} ${n.dataset.titre ?? ""}` : null;
      const texte = n.textContent ?? "";
      if (attendu !== null && texte !== attendu) {
        const devant = !texte.startsWith(attendu) && texte.endsWith(attendu);
        const tape = texte.startsWith(attendu) ? texte.slice(attendu.length) : devant ? texte.slice(0, -attendu.length) : "";
        n.textContent = attendu;
        if (tape) {
          const t = document.createTextNode(tape);
          if (devant) n.before(t); else n.after(t);
          poserLeCurseur(t, "fin");
        }
      }
      n.setAttribute("contenteditable", "false");
    });
  };

  /** Une case vient de changer : la séance se réécrit. `frappe` : on y tape, et la frappe poursuit la précédente. */
  const publierCase = (z: HTMLElement, frappe = false) => {
    reparer(z);
    oterSansCouleur(z);
    const texte = versDocument(z);
    publies.set(z, texte);
    z.toggleAttribute("data-vide", !texte.trim());
    const chemin = z.dataset.zone ?? "";
    const geste = frappe ? chemin : "";
    const m = courant.current;
    if (chemin === "intro") { if (m.intro !== texte) changer({ ...m, intro: texte }, geste); return; }
    const [cle, sorte, ...nom] = chemin.split("|");
    if (sorte === "d") majPhase(Number(cle), (p) => (p.deroulement === texte ? p : { ...p, deroulement: texte }), geste);
    else poserChamp(Number(cle), nom.join("|"), texte, geste);
  };

  /** Rend la sélection d'avant le clic sur un outil, dans la case voulue, puis agit, puis publie. */
  const agir = (fn: (z: HTMLElement) => void, voulue?: HTMLElement | null) => {
    const z = voulue ?? caseActive();
    if (!z) return;
    const dejaLa = document.activeElement === z;
    if (!dejaLa) z.focus();
    const sel = window.getSelection();
    if (sel && (!dejaLa || !sel.rangeCount || !z.contains(sel.anchorNode))) {
      sel.removeAllRanges();
      if (derniere.current && z.contains(derniere.current.commonAncestorContainer)) sel.addRange(derniere.current);
      else { const fin = document.createRange(); fin.selectNodeContents(z); fin.collapse(false); sel.addRange(fin); }
    }
    fn(z);
    publierCase(z);
  };
  const cmd = (commande: string, v?: string) => agir(() => document.execCommand(commande, false, v));
  /**
   * Pose du HTML en ligne à la place de la sélection, le curseur juste après.
   * `insertHTML` sortirait une pastille de son paragraphe quand elle le finit
   * (Chrome comme WebKit) : elle deviendrait une ligne à elle seule.
   */
  const poserEnLigne = (z: HTMLElement, html: string) => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const plage = sel.getRangeAt(0);
    plage.deleteContents();
    const modeleHtml = document.createElement("template");
    modeleHtml.innerHTML = html;
    const noeuds = Array.from(modeleHtml.content.childNodes);
    if (!noeuds.length) return;
    // Dans une case vide, le curseur est dans la case elle-même : la pastille ouvre un paragraphe.
    if (plage.startContainer === z) {
      const p = document.createElement("p");
      plage.insertNode(p);
      plage.selectNodeContents(p);
    }
    const morceau = document.createDocumentFragment();
    noeuds.forEach((n) => morceau.appendChild(n));
    plage.insertNode(morceau);
    const apres = document.createRange();
    apres.setStartAfter(noeuds[noeuds.length - 1]);
    apres.collapse(true);
    sel.removeAllRanges(); sel.addRange(apres);
  };

  // ── Les images : collées, glissées, choisies, prises au téléphone ──
  const htmlImage = (nom: string, src = "") =>
    `<figure class="doc-image" contenteditable="false" data-img="${echapper(nom)}"><img data-fichier="${echapper(nom)}"${src ? ` src="${src}"` : ""} alt=""></figure>`;
  /** Pose des images à l'endroit du curseur ; au bout de la case, un paragraphe attend la suite. */
  const poserLesFigures = (z: HTMLElement, html: string) => {
    // Une case de tableau tient sur une ligne : l'image va dans le paragraphe qui suit le tableau.
    const sel = window.getSelection();
    const cellule = sel?.rangeCount ? celluleDe(sel.getRangeAt(0).startContainer) : null;
    if (cellule && z.contains(cellule)) {
      const t = cellule.closest("table")!;
      let p = t.nextElementSibling;
      if (!(p instanceof HTMLParagraphElement)) { p = document.createElement("p"); p.innerHTML = "<br>"; t.after(p); }
      poserLeCurseur(p, "debut");
    }
    const avant = new Set(Array.from(z.querySelectorAll("[data-img]")));
    document.execCommand("insertHTML", false, html);
    const neuves = Array.from(z.querySelectorAll("[data-img]")).filter((f) => !avant.has(f));
    const derniereFigure = neuves[neuves.length - 1];
    if (derniereFigure && !derniereFigure.nextElementSibling && derniereFigure.parentElement === z) derniereFigure.insertAdjacentHTML("afterend", "<p><br></p>");
  };
  const poserImages = async (images: Blob[], plage: Range | null, voulue: HTMLElement | null) => {
    setEnvoi(true);
    try {
      let html = "";
      for (const f of images) {
        const { base64, ext } = await preparerImage(f);
        const nom = await api.fichierSave(`photo.${ext}`, base64);
        html += htmlImage(nom, `data:image/${ext === "jpg" ? "jpeg" : ext};base64,${base64}`);
      }
      if (plage) derniere.current = plage;
      agir((z) => poserLesFigures(z, html), voulue);
    } catch (e) {
      toast("Image non ajoutée : " + texteErreur(e), { icone: "⚠️", duree: 6000 });
    } finally {
      setEnvoi(false);
    }
  };
  const poserImageDuTelephone = (nom: string) => agir((z) => { poserLesFigures(z, htmlImage(nom)); afficherImages(z); });

  // ── Les couleurs : celle du texte, le surligneur ──
  const [couleurs, setCouleurs] = React.useState<{ haut: number; gauche: number } | null>(null);
  React.useEffect(() => {
    if (!couleurs) return;
    const dehors = (e: Event) => { if (!(e.target instanceof Element) || !e.target.closest(".doc-couleurs, [data-outil-couleurs]")) setCouleurs(null); };
    const echap = (e: KeyboardEvent) => { if (e.key === "Escape") setCouleurs(null); };
    window.addEventListener("mousedown", dehors, true);
    window.addEventListener("keydown", echap);
    return () => { window.removeEventListener("mousedown", dehors, true); window.removeEventListener("keydown", echap); };
  }, [couleurs]);
  /** Colore (ou surligne) le passage choisi ; sans valeur, retire la couleur. Un curseur seul colore ce qu'on va taper. */
  const colorer = (commande: "foreColor" | "hiliteColor", valeur: string | null) => {
    setCouleurs(null);
    agir(() => {
      if (!valeur && window.getSelection()?.isCollapsed) return;
      document.execCommand(commande, false, valeur ?? SANS_COULEUR);
    });
  };

  // ── Les tableaux ──
  /** Pose un tableau neuf après le bloc du curseur (à sa place, s'il est vide), le curseur dans sa première case. */
  const insererTableau = (z: HTMLElement) => {
    const sel = window.getSelection();
    const plage = sel && sel.rangeCount && z.contains(sel.anchorNode) ? sel.getRangeAt(0) : null;
    const ici = plage ? blocDe(z, plage.startContainer) : null;
    const t = nouveauTableau();
    if (ici instanceof HTMLParagraphElement && !ici.textContent?.trim() && !ici.querySelector(CONTENU_SANS_TEXTE)) ici.replaceWith(t);
    else if (ici) ici.after(t);
    else z.appendChild(t);
    if (!t.nextElementSibling) t.insertAdjacentHTML("afterend", "<p><br></p>");
    poserLeCurseur(t.rows[0].cells[0], "debut");
  };
  /** Ce qu'on fait d'un tableau depuis une de ses cases : au clic droit, ou au bouton « Tableau » quand on y écrit. */
  const actionsDuTableau = (cellule: HTMLTableCellElement, z: HTMLElement): CtxItem[] => {
    const t = cellule.closest("table")!;
    const rangee = cellule.parentElement as HTMLTableRowElement;
    const colonne = cellule.cellIndex;
    const dansLEntete = rangee.parentElement?.tagName === "THEAD";
    const faire = (fn: () => HTMLElement | null) => () => {
      const ou = fn();
      if (!z.firstElementChild) z.innerHTML = "<p><br></p>";
      publierCase(z);
      const vise = ou?.isConnected ? ou : z.lastElementChild;
      if (vise instanceof HTMLElement) { z.focus(); poserLeCurseur(vise, "fin"); }
    };
    return [
      { label: "Ajouter une ligne dessous", icon: "⬇️", onClick: faire(() => ajouterLigne(rangee, "apres", colonne)) },
      ...(dansLEntete ? [] : [{ label: "Ajouter une ligne dessus", icon: "⬆️", onClick: faire(() => ajouterLigne(rangee, "avant", colonne)) }]),
      { label: "Ajouter une colonne à droite", icon: "➡️", onClick: faire(() => ajouterColonne(t, colonne, "apres", rangee)) },
      { label: "Ajouter une colonne à gauche", icon: "⬅️", onClick: faire(() => ajouterColonne(t, colonne, "avant", rangee)) },
      { label: t.tHead?.rows.length ? "Sans ligne d'en-tête" : "Première ligne en en-tête", icon: "🔠", sep: true, onClick: faire(() => basculerEntete(t)) },
      { label: "Supprimer la ligne", icon: "🗑", danger: true, sep: true, onClick: faire(() => supprimerLigne(rangee)) },
      { label: "Supprimer la colonne", icon: "🗑", danger: true, onClick: faire(() => supprimerColonne(t, colonne)) },
      { label: "Supprimer le tableau", icon: "🗑", danger: true, onClick: faire(() => supprimerTableau(t)) },
    ];
  };

  // ── Les phases ──
  const nouvellePhase = () => {
    const m = courant.current;
    // À la suite de la phase où l'on écrivait (son titre ou une de ses cases), sinon au bout.
    const ici = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const cleIci = ici?.dataset.phaseTitre ?? caseDe(ici)?.dataset.zone ?? active.current?.dataset.zone ?? "";
    const i = m.phases.findIndex((p) => String(p.cle) === cleIci.split("|")[0]);
    const position = cleIci === "intro" ? 0 : i >= 0 ? i + 1 : m.phases.length;
    const neuve: Phase = {
      cle: ++derniereCle, titre: "", duree: "10 min", deroulement: "",
      champs: champsDesPhases(m.phases).slice(1).map((nom) => ({ nom, texte: "" })),
    };
    aFocaliser.current = neuve.cle;
    changer({ ...m, phases: [...m.phases.slice(0, position), neuve, ...m.phases.slice(position)] });
  };
  const deplacer = (cle: number, sens: -1 | 1) => {
    const m = courant.current;
    const i = m.phases.findIndex((p) => p.cle === cle);
    const j = i + sens;
    if (i < 0 || j < 0 || j >= m.phases.length) return;
    const phases = [...m.phases];
    [phases[i], phases[j]] = [phases[j], phases[i]];
    changer({ ...m, phases });
  };
  const supprimer = async (cle: number) => {
    const p = courant.current.phases.find((x) => x.cle === cle);
    if (!p) return;
    const rien = !p.titre.trim() && !p.deroulement.trim() && p.champs.every((c) => !c.texte.trim());
    if (!rien && !(await confirmer(`Supprimer la phase « ${p.titre.trim() || "sans titre"} » et ce qu'elle contient ?`, { oui: "Supprimer", danger: true }))) return;
    const m = courant.current;
    changer({ ...m, phases: m.phases.filter((x) => x.cle !== cle) });
  };
  const [duree, setDuree] = React.useState<{ cle: number; haut: number; gauche: number } | null>(null);
  const [organisationLibre, setOrganisationLibre] = React.useState<number | null>(null);

  // ── Citer d'un « @ » ──
  const [mention, setMention] = React.useState<{ haut: number; gauche: number; requete: string; index: number; tape: boolean } | null>(null);
  const trouves = React.useMemo(() => {
    if (!mention) return [] as Citable[];
    const q = plat(mention.requete.trim());
    const ok = (c: Citable) => !q || plat(`${c.titre} ${c.detail}`).includes(q);
    return [...citables.filter((c) => c.groupe === "seance" && ok(c)).slice(0, 8), ...citables.filter((c) => c.groupe === "bureau" && ok(c)).slice(0, 8)];
  }, [mention, citables]);

  /** « @… » juste avant le curseur, dans le même morceau de texte. */
  const arobaseAvant = (): { noeud: Text; debut: number; fin: number; requete: string } | null => {
    const sel = window.getSelection();
    if (!sel || !sel.isCollapsed || !sel.rangeCount) return null;
    const n = sel.anchorNode;
    if (!n || n.nodeType !== Node.TEXT_NODE || !dansLEditeur(n)) return null;
    const avant = (n.textContent ?? "").slice(0, sel.anchorOffset);
    const m = /(?:^|[\s(«"'’])@([^\s@][^@\n]{0,30}|)$/.exec(avant);
    if (!m) return null;
    const requete = m[1];
    if (requete.split(/\s+/).length > 3) return null;
    return { noeud: n as Text, debut: sel.anchorOffset - requete.length - 1, fin: sel.anchorOffset, requete };
  };
  const ouvrirMention = (tape: boolean, requete = "") => {
    const sel = window.getSelection();
    const z = caseActive();
    const r = sel && sel.rangeCount && dansLEditeur(sel.anchorNode) ? sel.getRangeAt(0).getBoundingClientRect() : z?.getBoundingClientRect();
    if (!r) return;
    setMention({ haut: Math.min(window.innerHeight - 320, r.bottom + 6), gauche: Math.min(window.innerWidth - 380, Math.max(8, r.left - 8)), requete, index: 0, tape });
  };
  const suivreMention = () => {
    const a = arobaseAvant();
    if (a) ouvrirMention(true, a.requete);
    else setMention((m) => (m?.tape ? null : m));
  };
  const citer = (c: { genre: GenreCite; id: string; titre: string }) => {
    const html = `<span class="cite cite-${c.genre}" contenteditable="false" data-cite="${c.genre}:${echapper(c.id)}" data-titre="${echapper(c.titre)}">${ICONE_CITE[c.genre]} ${echapper(c.titre)}</span>&nbsp;`;
    agir((z) => {
      const a = mention?.tape ? arobaseAvant() : null;
      if (a) {
        const r = document.createRange();
        r.setStart(a.noeud, a.debut); r.setEnd(a.noeud, a.fin);
        const sel = window.getSelection()!;
        sel.removeAllRanges(); sel.addRange(r);
      }
      poserEnLigne(z, html);
    });
    setMention(null);
  };
  const choisir = async (c: Citable) => {
    try {
      const cible = c.poser ? await c.poser() : c;
      if (cible) citer(cible);
    } catch (e) {
      toast("Support non cité : " + texteErreur(e), { icone: "⚠️" });
    }
  };
  React.useImperativeHandle(ref, () => ({ citer }));

  // ── La reformulation d'un passage choisi ──
  const [bulle, setBulle] = React.useState<{ haut: number; gauche: number } | null>(null);
  const [menuStyles, setMenuStyles] = React.useState(false);
  const [reformulation, setReformulation] = React.useState<{ texte: string; source: string; plage: Range } | null>(null);
  const [reformule, setReformule] = React.useState(false);
  React.useEffect(() => {
    const lire = () => {
      const sel = window.getSelection();
      racine.current?.querySelectorAll(".doc-image.choisie").forEach((f) => { if (!sel?.containsNode(f)) f.classList.remove("choisie"); });
      if (!sel || !sel.rangeCount || !dansLEditeur(sel.anchorNode)) { setBulle(null); return; }
      active.current = caseDe(sel.anchorNode);
      derniere.current = sel.getRangeAt(0).cloneRange();
      const nouveaux = {
        bold: document.queryCommandState("bold"), italic: document.queryCommandState("italic"),
        insertUnorderedList: document.queryCommandState("insertUnorderedList"),
      };
      setEtats((avant) => (Object.keys(nouveaux).every((k) => avant[k] === (nouveaux as Record<string, boolean>)[k]) ? avant : nouveaux));
      if (sel.isCollapsed || sel.toString().trim().length < 3) { setBulle(null); return; }
      const r = sel.getRangeAt(0).getBoundingClientRect();
      setBulle({ haut: Math.max(8, r.top - 46), gauche: Math.min(window.innerWidth - 200, Math.max(8, r.left + r.width / 2 - 60)) });
    };
    document.addEventListener("selectionchange", lire);
    return () => document.removeEventListener("selectionchange", lire);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const proposer = async (style: Style) => {
    setMenuStyles(false);
    const sel = window.getSelection();
    const plage = sel && sel.rangeCount && dansLEditeur(sel.anchorNode) && !sel.isCollapsed ? sel.getRangeAt(0).cloneRange() : null;
    const source = plage?.toString().trim() ?? "";
    if (!plage || !source) { toast("Sélectionnez d'abord le passage à reformuler.", { icone: "✍️" }); return; }
    // Le passage revient en texte : un support cité ou une image s'y perdraient.
    if (plage.cloneContents().querySelector(CONTENU_SANS_TEXTE)) {
      toast("Choisissez du texte seul : un support cité ou une image ne se reformulent pas.", { icone: "ℹ️", duree: 6000 });
      return;
    }
    setReformule(true);
    try {
      const p = await reformuler(source, style);
      setReformulation({ texte: p.texte, source, plage });
    } catch (e) {
      toast("Reformulation impossible : " + texteErreur(e), { icone: "⚠️", duree: 7000 });
    } finally { setReformule(false); }
  };
  const remplacer = () => {
    if (!reformulation) return;
    const { plage, source, texte } = reformulation;
    const z = caseDe(plage.commonAncestorContainer);
    const intacte = !!z && dansLEditeur(plage.commonAncestorContainer) && plage.toString().trim() === source;
    if (!intacte) { toast("Le passage a changé entre-temps : rien n'est remplacé.", { icone: "ℹ️" }); setReformulation(null); return; }
    derniere.current = plage;
    agir(() => {
      const sel = window.getSelection()!;
      sel.removeAllRanges(); sel.addRange(plage);
      document.execCommand("insertText", false, texte);
    }, z);
    setReformulation(null);
  };

  const champs = champsDesPhases(modele.phases);
  const avecOrganisation = champs.some((n) => memeNom(n, CHAMP_ORGANISATION));
  const dessous = champs.slice(1).filter((n) => !memeNom(n, CHAMP_ORGANISATION));
  // Le texte d'avant les phases : toujours sans phases ; ensuite, s'il dit quelque chose — et tant qu'on l'a vu.
  const introVue = React.useRef(false);
  if (!modele.phases.length || modele.intro.trim()) introVue.current = true;

  return (
    <div className="doc" data-annulation-propre>
      <div ref={barre} className={`doc-barre${compacte ? " compacte" : ""}`} role="toolbar" aria-label="Déroulement" onMouseDown={(e) => {
          // Les événements de la fenêtre « Citer un passage », posée sur le corps de la page, remontent quand même jusqu'ici.
          if (barre.current?.contains(e.target as Node) && (e.target as HTMLElement).closest("button")) e.preventDefault();
        }}>
        <button type="button" className="doc-outil" onClick={nouvellePhase} title="Ajouter une phase : son titre, sa durée, son déroulement, la posture de l'enseignant">¶ Phase</button>
        {!modele.phases.length && (
          // Les phases de la première séance d'une démarche (quatre temps, leçon de code, investigation…), à la suite du texte.
          <BibliothequeDesDemarches label="🧭 Démarche…" className="doc-outil" title="Poser les phases d'une démarche"
            proposees={demarches?.proposees} classe={demarches?.classe} apport="phases" verbe="Poser ses phases"
            onChoisir={(d) => {
              const phases = d.seances[0]?.phases ?? [];
              if (!phases.length) return;
              const m = courant.current;
              const ajout = versModele(lireSeance(documentDeLaSeance({ tableauDeroulement: JSON.stringify(tableauDesPhases(phases)) })));
              changer({ ...m, phases: [...m.phases, ...ajout.phases] });
            }} />
        )}
        <span className="doc-sep" />
        <button type="button" className="doc-outil" aria-pressed={!!etats.bold} title={`Gras (${raccourci("B")})`} onClick={() => cmd("bold")}><b>G</b></button>
        <button type="button" className="doc-outil" aria-pressed={!!etats.italic} title={`Italique (${raccourci("I")})`} onClick={() => cmd("italic")}><i>I</i></button>
        <button type="button" className="doc-outil" aria-pressed={!!etats.insertUnorderedList} title="Liste à puces" onClick={() => cmd("insertUnorderedList")}>•<span className="doc-libelle"> Liste</span></button>
        <button type="button" className="doc-outil" data-outil-couleurs aria-expanded={!!couleurs} title="Couleur du texte, surligneur"
          onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setCouleurs((c) => (c ? null : { haut: r.bottom + 6, gauche: Math.max(8, Math.min(window.innerWidth - 230, r.left)) })); }}>
          🎨
        </button>
        <button type="button" className="doc-outil" title="Ajouter un tableau ; dans un tableau, ses lignes et ses colonnes (ou clic droit dans une case)"
          onClick={(e) => {
            const cellule = celluleDe(derniere.current?.startContainer ?? null);
            const z = cellule && racine.current?.contains(cellule) ? caseDe(cellule) : null;
            if (cellule && z) openCtx(e, actionsDuTableau(cellule, z));
            else agir(insererTableau);
          }}>▦<span className="doc-libelle"> Tableau</span></button>
        <span className="doc-sep" />
        <button type="button" className="doc-outil" title="Ajouter une image (ou collez-la, glissez-la)" onClick={() => fichiers.current?.click()}>🖼<span className="doc-libelle"> Image</span></button>
        <PhotoTelephone label={<>📱<span className="doc-libelle"> Téléphone</span></>} className="doc-outil" onPhoto={poserImageDuTelephone} />
        <span className="doc-sep" />
        <button type="button" className="doc-outil doc-outil-accent" title="Citer un support de la séance ou du plan de travail (ou tapez « @ »)"
          onClick={() => { agir(() => {}); ouvrirMention(false); }}>@ Citer<span className="doc-libelle"> un support</span></button>
        <CitationButton label="❝" className="doc-outil" onInsert={(marque) => agir((z) => poserEnLigne(z, `${ligneEnHtml(marque, true)}&nbsp;`))} />
        <button type="button" className="doc-outil" title="Fabriquer une feuille pour la séance avec un générateur" onClick={onFabriquer}>✨ Fabriquer</button>
        {envoi && <span className="doc-envoi" role="status">Image en cours d'ajout…</span>}
      </div>
      <input ref={fichiers} type="file" accept="image/*" multiple hidden
        onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ""; if (f.length) void poserImages(f, derniere.current, caseActive()); }} />

      {reformulation && (
        <div className="editeur-riche-proposition" role="region" aria-label="Proposition de l'IA">
          <div style={{ fontSize: 12.5, fontWeight: 650 }}>Proposition pour le passage choisi</div>
          <textarea className="input" value={reformulation.texte} aria-label="Proposition, modifiable"
            onChange={(e) => setReformulation({ ...reformulation, texte: e.target.value })}
            style={{ minHeight: 90, resize: "vertical", fontSize: 14.5, lineHeight: 1.55, fontFamily: "inherit" }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn primary sm" onClick={remplacer}>Remplacer le passage</button>
            <button className="btn ghost sm" onClick={() => setReformulation(null)}>Ignorer</button>
          </div>
        </div>
      )}

      <div ref={racine} className="doc-cartes"
        onFocus={(e) => { const z = caseDe(e.target as Node); if (z) active.current = z; }}
        onInput={(e) => {
          const z = caseDe(e.target as Node);
          if (z) { publierCase(z, estUneFrappe((e.nativeEvent as InputEvent).inputType ?? "")); suivreMention(); }
        }}
        onKeyDown={(e) => {
          const z = caseDe(e.target as Node);
          if (!z) return;
          // ⌘B et ⌘I : la vue web de l'application ne les connaît pas d'elle-même sur Mac.
          const lettre = e.key.toLowerCase();
          if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && (lettre === "b" || lettre === "i")) {
            e.preventDefault();
            cmd(lettre === "b" ? "bold" : "italic");
            return;
          }
          // Dans un tableau, ⇥ passe à la case suivante (⇧⇥ : la précédente) et ↩ à celle du dessous ; au bout, une rangée s'ajoute.
          const cellule = !mention && !e.nativeEvent.isComposing ? celluleDe(window.getSelection()?.anchorNode ?? null) : null;
          if (cellule && z.contains(cellule) && (e.key === "Tab" || (e.key === "Enter" && !e.metaKey && !e.ctrlKey && !e.altKey))) {
            e.preventDefault();
            const rangee = cellule.parentElement as HTMLTableRowElement;
            let visee: HTMLElement | null;
            if (e.key === "Tab") visee = caseVoisine(cellule, e.shiftKey ? -1 : 1) ?? (e.shiftKey ? null : ajouterLigne(rangee, "apres", 0));
            else {
              const dessous = cellule.closest("table")!.rows[rangee.rowIndex + 1];
              visee = dessous ? dessous.cells[Math.min(cellule.cellIndex, dessous.cells.length - 1)] ?? null : ajouterLigne(rangee, "apres", cellule.cellIndex);
            }
            if (visee) { poserLeCurseur(visee, "fin"); publierCase(z); }
            return;
          }
          if (!mention) {
            if (toucheAutourDUneImage(z, e.key) || toucheAutourDUnTableau(z, e.key)) { e.preventDefault(); publierCase(z); }
            return;
          }
          if (e.key === "ArrowDown") { e.preventDefault(); setMention({ ...mention, index: Math.min(mention.index + 1, trouves.length) }); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setMention({ ...mention, index: Math.max(mention.index - 1, 0) }); }
          else if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            if (mention.index < trouves.length) void choisir(trouves[mention.index]);
            else { setMention(null); onAjouterSupport(); }
          } else if (e.key === "Escape") { e.preventDefault(); setMention(null); }
        }}
        onBlur={() => setTimeout(() => {
          // D'une case à l'autre, on reste dans l'éditeur : le menu « @ » ne se ferme que si l'on en sort.
          const ici = document.activeElement;
          if (!ici?.closest?.(".doc-mentions") && !racine.current?.contains(ici)) setMention((m) => (m?.tape ? null : m));
        }, 150)}
        onClick={(e) => {
          if (!caseDe(e.target as Node)) return;
          // Une image se choisit d'un clic : la touche ⌫ l'enlève.
          const image = (e.target as HTMLElement).closest<HTMLElement>(".doc-image");
          if (image) {
            const r = document.createRange();
            r.selectNode(image);
            const sel = window.getSelection();
            sel?.removeAllRanges(); sel?.addRange(r);
            image.classList.add("choisie");
            return;
          }
          const cite = (e.target as HTMLElement).closest<HTMLElement>("[data-cite]");
          if (cite?.dataset.cite) { const [g, ...id] = cite.dataset.cite.split(":"); onOuvrirCitation(g as GenreCite, id.join(":")); }
        }}
        onContextMenu={(e) => {
          const z = caseDe(e.target as Node);
          const cellule = celluleDe(e.target as Node);
          if (z && cellule && z.contains(cellule)) openCtx(e, actionsDuTableau(cellule, z));
        }}
        onPaste={(e) => {
          const z = caseDe(e.target as Node);
          if (!z) return;
          const photos = Array.from(e.clipboardData.items).filter((i) => i.kind === "file" && i.type.startsWith("image/"))
            .map((i) => i.getAsFile()).filter((f): f is File => f !== null);
          const images = photos.length ? photos : imagesDuHtmlColle(e.clipboardData.getData("text/html"));
          e.preventDefault();
          if (images.length) {
            const sel = window.getSelection();
            void poserImages(images, sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null, z);
            return;
          }
          // Collé sans la mise en forme d'origine : le texte, proprement.
          document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
          publierCase(z);
        }}
        onDragOver={(e) => { if (caseDe(e.target as Node) && Array.from(e.dataTransfer.items).some((i) => i.kind === "file")) e.preventDefault(); }}
        onDrop={(e) => {
          const z = caseDe(e.target as Node);
          const images = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
          if (!z || !images.length) return;
          e.preventDefault();
          const plage = (document as Document & { caretRangeFromPoint?: (x: number, y: number) => Range | null }).caretRangeFromPoint?.(e.clientX, e.clientY) ?? null;
          void poserImages(images, plage && z.contains(plage.startContainer) ? plage : null, z);
        }}>
        {introVue.current && (
          <Case chemin="intro" valeur={modele.intro} libelle="Texte avant les phases"
            invite={modele.phases.length ? "Avant les phases…" : "Le déroulement : « ¶ Phase » pour ajouter une phase, « @ » pour citer un support…"} />
        )}
        {modele.phases.map((p, i) => {
          const organisation = champDe(p, CHAMP_ORGANISATION).replace(/\s+/g, " ").trim();
          return (
            <section key={p.cle} className="ph">
              <div className="ph-tete">
                <span className="ph-n">{i + 1}</span>
                <label className="ph-titre" data-valeur={p.titre || "Titre de la phase"}>
                  <input data-phase-titre={p.cle} value={p.titre} placeholder="Titre de la phase" size={1} aria-label={`Titre de la phase ${i + 1}`}
                    onChange={(e) => majPhase(p.cle, (x) => ({ ...x, titre: e.target.value }), cheminTitre(p.cle))}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); allerA(cheminDeroulement(p.cle)); } }} />
                </label>
                <button type="button" className={`ph-chip${p.duree ? "" : " vide"}`} aria-label={`Durée de la phase ${i + 1}`}
                  onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setDuree({ cle: p.cle, haut: r.bottom + 6, gauche: r.left }); }}>
                  {p.duree || "Durée"}
                </button>
                {avecOrganisation && (organisationLibre === p.cle ? (
                  <input className="ph-orga ph-orga-saisie" autoFocus defaultValue={organisation} aria-label="Organisation de la phase"
                    onBlur={(e) => { poserChamp(p.cle, CHAMP_ORGANISATION, e.target.value.replace(/\s+/g, " ").trim()); setOrganisationLibre(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); else if (e.key === "Escape") setOrganisationLibre(null); }} />
                ) : (
                  <button type="button" className={`ph-orga${organisation ? "" : " vide"}`} aria-label={`Organisation de la phase ${i + 1}`}
                    onClick={(e) => openCtx(e, [
                      ...ORGANISATIONS.map((o) => ({ label: o.nom, icon: o.ico, onClick: () => poserChamp(p.cle, CHAMP_ORGANISATION, o.nom) })),
                      { label: "Autre…", icon: "✏️", sep: true, onClick: () => setOrganisationLibre(p.cle) },
                      ...(organisation ? [{ label: "Effacer", icon: "✕", onClick: () => poserChamp(p.cle, CHAMP_ORGANISATION, "") }] : []),
                    ])}>
                    {iconeOrganisation(organisation)} {organisation || "Organisation"} ▾
                  </button>
                ))}
                <button type="button" className="ph-menu" title="Déplacer, supprimer" aria-label={`Phase ${i + 1} : déplacer, supprimer`}
                  onClick={(e) => openCtx(e, [
                    ...(i > 0 ? [{ label: "Monter", icon: "⬆️", onClick: () => deplacer(p.cle, -1) }] : []),
                    ...(i < modele.phases.length - 1 ? [{ label: "Descendre", icon: "⬇️", onClick: () => deplacer(p.cle, 1) }] : []),
                    { label: "Supprimer la phase", icon: "🗑", danger: true, sep: modele.phases.length > 1, onClick: () => { void supprimer(p.cle); } },
                  ])}>⋯</button>
              </div>
              <div className="ph-corps">
                <div className="ph-col">
                  <span className="ph-label">Déroulement</span>
                  <Case chemin={cheminDeroulement(p.cle)} valeur={p.deroulement} libelle={`Déroulement de la phase ${i + 1}`} />
                </div>
                <div className="ph-col ph-posture">
                  <span className="ph-label">{CHAMP_POSTURE}</span>
                  <Case chemin={cheminChamp(p.cle, CHAMP_POSTURE)} valeur={champDe(p, CHAMP_POSTURE)} libelle={`Posture de l'enseignant, phase ${i + 1}`} />
                </div>
              </div>
              {dessous.map((nom) => (
                <div key={nom} className="ph-champ">
                  <span className="ph-label">{nom}</span>
                  <Case chemin={cheminChamp(p.cle, nom)} valeur={champDe(p, nom)} libelle={`${nom}, phase ${i + 1}`} />
                </div>
              ))}
            </section>
          );
        })}
      </div>

      {mention && (
        <div className="doc-mentions" role="listbox" aria-label="Citer un support" style={{ top: mention.haut, left: mention.gauche }}
          onMouseDown={(e) => e.preventDefault()}>
          {!mention.tape && (
            <input className="input" autoFocus placeholder="Chercher un support…" value={mention.requete} aria-label="Chercher un support"
              onChange={(e) => setMention({ ...mention, requete: e.target.value, index: 0 })}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setMention({ ...mention, index: Math.min(mention.index + 1, trouves.length) }); }
                else if (e.key === "ArrowUp") { e.preventDefault(); setMention({ ...mention, index: Math.max(mention.index - 1, 0) }); }
                else if (e.key === "Enter") { e.preventDefault(); if (mention.index < trouves.length) void choisir(trouves[mention.index]); else { setMention(null); onAjouterSupport(); } }
                else if (e.key === "Escape") { e.preventDefault(); setMention(null); caseActive()?.focus(); }
              }} />
          )}
          {(["seance", "bureau"] as const).map((g) => {
            const liste = trouves.filter((c) => c.groupe === g);
            if (!liste.length) return null;
            return (
              <React.Fragment key={g}>
                <div className="doc-mentions-titre">{g === "seance" ? "Dans la séance" : "Sur le plan de travail"}</div>
                {liste.map((c) => {
                  const i = trouves.indexOf(c);
                  return (
                    <button key={`${c.genre}:${c.id}`} type="button" role="option" aria-selected={i === mention.index}
                      className={`doc-mention${i === mention.index ? " on" : ""}`} onMouseEnter={() => setMention({ ...mention, index: i })}
                      onClick={() => void choisir(c)}>
                      <span aria-hidden="true">{ICONE_CITE[c.genre]}</span>
                      <span className="doc-mention-titre">{c.titre}</span>
                      <span className="doc-mention-detail">{c.detail}</span>
                    </button>
                  );
                })}
              </React.Fragment>
            );
          })}
          {!trouves.length && <div className="doc-mentions-vide">Rien ne s'appelle ainsi.</div>}
          <button type="button" className={`doc-mention doc-mention-creer${mention.index === trouves.length ? " on" : ""}`}
            onClick={() => { setMention(null); onAjouterSupport(); }}>＋ Ajouter ou créer un support…</button>
        </div>
      )}

      {couleurs && (
        <div className="doc-mentions doc-couleurs" role="dialog" aria-label="Couleurs" style={{ top: couleurs.haut, left: couleurs.gauche }}
          onMouseDown={(e) => e.preventDefault()}>
          <div className="doc-mentions-titre">Texte</div>
          <div className="doc-couleurs-ligne">
            {COULEURS_DU_TEXTE.map((c) => (
              <button key={c.nom} type="button" className={`doc-couleur doc-c-${c.nom}`} title={c.libelle} aria-label={`Texte ${c.libelle.toLowerCase()}`}
                onClick={() => colorer("foreColor", c.valeur)}>A</button>
            ))}
            <button type="button" className="doc-couleur doc-couleur-aucune" title="Sans couleur" aria-label="Texte sans couleur" onClick={() => colorer("foreColor", null)}>A</button>
          </div>
          <div className="doc-mentions-titre">Surligner</div>
          <div className="doc-couleurs-ligne">
            {SURLIGNAGES.map((c) => (
              <button key={c.nom} type="button" className="doc-couleur doc-couleur-fond" style={{ background: c.valeur }} title={c.libelle} aria-label={`Surligner en ${c.libelle.toLowerCase()}`}
                onClick={() => colorer("hiliteColor", c.valeur)}>A</button>
            ))}
            <button type="button" className="doc-couleur doc-couleur-aucune" title="Sans surligneur" aria-label="Sans surligneur" onClick={() => colorer("hiliteColor", null)}>A</button>
          </div>
        </div>
      )}

      {duree && (
        <div className="doc-mentions doc-durees" style={{ top: duree.haut, left: duree.gauche }} onMouseDown={(e) => e.preventDefault()}>
          {DUREES_DE_PHASE.map((d) => (
            <button key={d} type="button" className="doc-mention" onClick={() => { majPhase(duree.cle, (p) => ({ ...p, duree: d })); setDuree(null); }}>{d}</button>
          ))}
          <button type="button" className="doc-mention" onClick={() => { majPhase(duree.cle, (p) => ({ ...p, duree: "" })); setDuree(null); }}>Sans durée</button>
          <button type="button" className="doc-mention doc-mention-creer" onClick={() => setDuree(null)}>Fermer</button>
        </div>
      )}

      {bulle && !reformule && !mention && (
        <div className="editeur-riche-bulle" style={{ top: bulle.haut, left: bulle.gauche }} onMouseDown={(e) => e.preventDefault()}>
          <button type="button" className="btn primary sm" onClick={() => setMenuStyles((m) => !m)}>✨ Reformuler ▾</button>
          {menuStyles && <MenuStyles onChoisir={proposer} />}
        </div>
      )}
    </div>
  );
});

/** Le déroulement à lire : le texte d'avant, puis les phases en cartes, avec leurs images et leurs supports cités. */
export function DeroulementLu({ document: doc }: { document: string }) {
  const [sources, setSources] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    let actif = true;
    for (const nom of new Set(imagesDuDocument(doc))) {
      chargerImage(nom).then((src) => { if (actif) setSources((avant) => (avant[nom] === src ? avant : { ...avant, [nom]: src })); }).catch(() => {});
    }
    return () => { actif = false; };
  }, [doc]);
  return <div className="doc-lu" dangerouslySetInnerHTML={{ __html: seanceEnCartes(doc, (n) => sources[n]) }} />;
}
