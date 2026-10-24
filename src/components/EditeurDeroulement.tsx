import React from "react";
import { api, raccourci, texteErreur } from "../api";
import { toast } from "./Toaster";
import { confirmer } from "./confirmer";
import { openCtx } from "./ctxmenu";
import { MenuStyles } from "./EditeurRiche";
import { PhotoTelephone } from "./PhotoTelephone";
import { chargerImage, imagesDuHtmlColle, preparerImage } from "./imagesTexte";
import { reformuler, type Style } from "../reformulation";
import {
  CHAMP_ORGANISATION, CHAMP_POSTURE, ORGANISATIONS, champDe, champsDesPhases, documentDeLaSeance, documentEnHtml, echapper, ecrireSeance,
  ICONE_CITE, iconeOrganisation, imagesDuDocument, ligneEnHtml, ligneProtegee, lireSeance, marqueDeCitation, memeNom, seanceEnCartes,
  type GenreCite, type PhaseDeSeance, type SeanceEnPhases,
} from "../documentSeance";
import { demarcheDe, demarchesParFamille, tableauDesPhases } from "../demarches";
import { CitationButton } from "./Deroulement";

// Le déroulement d'une séance (demande de l'enseignant, octobre 2026) : un
// texte libre, puis des phases en cartes — chacune son titre, sa durée, son
// organisation, son déroulement, la posture de l'enseignant et les champs
// ajoutés à toute la séance. Dans chaque case, on écrit comme dans un
// traitement de texte : gras, italique, listes, images collées, glissées ou
// prises au téléphone, supports cités d'un « @ ».
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

/** Ce que disent les cases vides. */
const INVITES: Record<string, string> = {
  [CHAMP_POSTURE]: "Ce que fait l'enseignant : questionne, observe, relance…",
  "Différenciation": "Pour qui, et comment…",
  "Matériel": "Ce qu'il faut pour cette phase…",
  "Trace écrite": "Ce qui reste dans le cahier…",
};

const plat = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** La largeur qu'il faut à la barre d'outils pour tout dire sur une ligne. */
const LARGEUR_BARRE_PLEINE = 740;

/** Les éléments qui font une ligne à eux seuls. */
const BLOCS = /^(P|DIV|H[1-6]|UL|OL|LI|FIGURE|BLOCKQUOTE|PRE|TABLE|SECTION|ARTICLE)$/;

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
    const dedans = Array.from(n.childNodes).map(enLigne).join("");
    const poids = n.style.fontWeight;
    if (n.tagName === "B" || n.tagName === "STRONG" || poids === "bold" || Number(poids) >= 600) return dedans.trim() ? `**${dedans}**` : dedans;
    if (n.tagName === "I" || n.tagName === "EM" || n.style.fontStyle === "italic") return dedans.trim() ? `*${dedans}*` : dedans;
    return dedans;
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

/** Ce que chaque case a publié : elle n'est réécrite que si son texte change d'ailleurs. */
const publies = new WeakMap<HTMLElement, string>();

/** Les images d'une case n'ont que leur nom : on les lit et on les montre. */
function afficherImages(z: HTMLElement) {
  z.querySelectorAll<HTMLImageElement>("img[data-fichier]:not([src])").forEach((img) => {
    chargerImage(img.dataset.fichier ?? "").then((src) => { img.src = src; }).catch(() => { img.alt = "Image introuvable"; });
  });
}

/** Une case où l'on écrit : le texte libre, le déroulement d'une phase, un de ses champs. */
const Case = React.memo(function Case({ chemin, valeur, invite, libelle }: { chemin: string; valeur: string; invite: string; libelle: string }) {
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
}>(function EditeurDeroulement({ valeur, onChange, citables, onOuvrirCitation, onAjouterSupport, onFabriquer }, ref) {
  const racine = React.useRef<HTMLDivElement>(null);
  const [modele, setModele] = React.useState<Modele>(() => versModele(lireSeance(valeur)));
  const courant = React.useRef(modele);
  const publie = React.useRef(valeur);
  // La séance n'est relue que si son texte change d'ailleurs (à l'ouverture, un champ ajouté, une autre machine).
  React.useEffect(() => {
    if (valeur === publie.current) return;
    publie.current = valeur;
    const m = versModele(lireSeance(valeur));
    courant.current = m;
    setModele(m);
  }, [valeur]);
  const changer = (m: Modele) => {
    courant.current = m;
    setModele(m);
    const texte = ecrireSeance(m);
    if (texte === publie.current) return;
    publie.current = texte;
    onChange(texte);
  };
  const majPhase = (cle: number, modif: (p: Phase) => Phase) => {
    const m = courant.current;
    changer({ ...m, phases: m.phases.map((p) => (p.cle === cle ? modif(p) : p)) });
  };
  const poserChamp = (cle: number, nom: string, texte: string) => majPhase(cle, (p) => ({
    ...p,
    champs: p.champs.some((c) => memeNom(c.nom, nom))
      ? p.champs.map((c) => (memeNom(c.nom, nom) ? { ...c, texte } : c))
      : [...p.champs, { nom, texte }],
  }));

  const derniere = React.useRef<Range | null>(null);
  const active = React.useRef<HTMLElement | null>(null);
  const aFocaliser = React.useRef<number | null>(null);
  const [etats, setEtats] = React.useState<Record<string, boolean>>({});
  const [envoi, setEnvoi] = React.useState(false);
  const fichiers = React.useRef<HTMLInputElement>(null);
  // Une barre trop étroite pour tout dire sur une ligne ne garde, des outils secondaires, que l'icône.
  const barre = React.useRef<HTMLDivElement>(null);
  const [compacte, setCompacte] = React.useState(false);
  React.useLayoutEffect(() => {
    const el = barre.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const suivre = new ResizeObserver(() => setCompacte(el.clientWidth < LARGEUR_BARRE_PLEINE));
    suivre.observe(el);
    return () => suivre.disconnect();
  }, []);

  React.useEffect(() => {
    try { document.execCommand("defaultParagraphSeparator", false, "p"); document.execCommand("styleWithCSS", false, "false"); } catch { /* sans effet ailleurs */ }
  }, []);
  // Une phase neuve : on écrit d'abord son titre.
  React.useEffect(() => {
    if (aFocaliser.current === null) return;
    racine.current?.querySelector<HTMLInputElement>(`[data-phase-titre="${aFocaliser.current}"]`)?.focus();
    aFocaliser.current = null;
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

  /** Une case vient de changer : la séance se réécrit. */
  const publierCase = (z: HTMLElement) => {
    reparer(z);
    const texte = versDocument(z);
    publies.set(z, texte);
    z.toggleAttribute("data-vide", !texte.trim());
    const chemin = z.dataset.zone ?? "";
    const m = courant.current;
    if (chemin === "intro") { if (m.intro !== texte) changer({ ...m, intro: texte }); return; }
    const [cle, sorte, ...nom] = chemin.split("|");
    if (sorte === "d") majPhase(Number(cle), (p) => (p.deroulement === texte ? p : { ...p, deroulement: texte }));
    else poserChamp(Number(cle), nom.join("|"), texte);
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
    <div className="doc">
      <div ref={barre} className={`doc-barre${compacte ? " compacte" : ""}`} role="toolbar" aria-label="Déroulement" onMouseDown={(e) => {
          // Les événements de la fenêtre « Citer un passage », posée sur le corps de la page, remontent quand même jusqu'ici.
          if (barre.current?.contains(e.target as Node) && (e.target as HTMLElement).closest("button")) e.preventDefault();
        }}>
        <button type="button" className="doc-outil" onClick={nouvellePhase} title="Ajouter une phase : son titre, sa durée, son déroulement, la posture de l'enseignant">¶ Phase</button>
        {!modele.phases.length && (
          // Les phases de la première séance d'une démarche (quatre temps, leçon de code, investigation…), à la suite du texte.
          <select className="doc-outil doc-demarche" value="" aria-label="Poser les phases d'une démarche"
            onChange={(e) => {
              const d = demarcheDe(e.target.value);
              const phases = d?.seances[0]?.phases ?? [];
              if (!phases.length) return;
              const m = courant.current;
              const ajout = versModele(lireSeance(documentDeLaSeance({ tableauDeroulement: JSON.stringify(tableauDesPhases(phases)) })));
              changer({ ...m, phases: [...m.phases, ...ajout.phases] });
            }}>
            <option value="">🧭 Démarche…</option>
            {demarchesParFamille().map((g) => (
              <optgroup key={g.famille} label={g.famille}>
                {g.demarches.map((d) => <option key={d.id} value={d.id}>{d.nom}</option>)}
              </optgroup>
            ))}
          </select>
        )}
        <span className="doc-sep" />
        <button type="button" className="doc-outil" aria-pressed={!!etats.bold} title={`Gras (${raccourci("B")})`} onClick={() => cmd("bold")}><b>G</b></button>
        <button type="button" className="doc-outil" aria-pressed={!!etats.italic} title={`Italique (${raccourci("I")})`} onClick={() => cmd("italic")}><i>I</i></button>
        <button type="button" className="doc-outil" aria-pressed={!!etats.insertUnorderedList} title="Liste à puces" onClick={() => cmd("insertUnorderedList")}>•<span className="doc-libelle"> Liste</span></button>
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
        onInput={(e) => { const z = caseDe(e.target as Node); if (z) { publierCase(z); suivreMention(); } }}
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
          if (!mention) {
            if (toucheAutourDUneImage(z, e.key)) { e.preventDefault(); publierCase(z); }
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
                    onChange={(e) => majPhase(p.cle, (x) => ({ ...x, titre: e.target.value }))}
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
                  <Case chemin={cheminDeroulement(p.cle)} valeur={p.deroulement} libelle={`Déroulement de la phase ${i + 1}`}
                    invite="Ce qui se passe : consignes, activité des élèves… « @ » pour citer un support" />
                </div>
                <div className="ph-col ph-posture">
                  <span className="ph-label">{CHAMP_POSTURE}</span>
                  <Case chemin={cheminChamp(p.cle, CHAMP_POSTURE)} valeur={champDe(p, CHAMP_POSTURE)} libelle={`Posture de l'enseignant, phase ${i + 1}`}
                    invite={INVITES[CHAMP_POSTURE]} />
                </div>
              </div>
              {dessous.map((nom) => (
                <div key={nom} className="ph-champ">
                  <span className="ph-label">{nom}</span>
                  <Case chemin={cheminChamp(p.cle, nom)} valeur={champDe(p, nom)} libelle={`${nom}, phase ${i + 1}`} invite={INVITES[nom] ?? "…"} />
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
