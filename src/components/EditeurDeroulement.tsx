import React from "react";
import { api, raccourci, texteErreur } from "../api";
import { toast } from "./Toaster";
import { MenuStyles } from "./EditeurRiche";
import { PhotoTelephone } from "./PhotoTelephone";
import { chargerImage, imagesDuHtmlColle, preparerImage } from "./imagesTexte";
import { reformuler, type Style } from "../reformulation";
import {
  aDesPhases, documentDeLaSeance, documentEnHtml, echapper, ICONE_CITE, imagesDuDocument, ligneEnHtml, marqueDeCitation, type GenreCite,
} from "../documentSeance";
import { demarcheDe, demarchesParFamille, tableauDesPhases } from "../demarches";
import { CitationButton } from "./Deroulement";

// Le déroulement d'une séance, écrit comme dans un traitement de texte
// (demande de l'enseignant, octobre 2026) : des phases numérotées et leur
// durée, du gras, de l'italique, des listes ; des images collées, glissées
// ou prises au téléphone ; les supports de la séance cités d'un « @ ».
//
// La page est un `contentEditable` ; ce qu'on y écrit se relit en document
// (voir documentSeance.ts) à chaque frappe. Le contenu n'est réécrit que s'il
// change d'ailleurs — le réécrire à chaque frappe ferait sauter le curseur.
// La mise en forme passe par `document.execCommand`, présent dans les
// webviews de macOS et de Windows : il garde l'historique d'annulation.

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
  /** Cite un support à l'endroit du curseur (ou à la fin). */
  citer: (c: { genre: GenreCite; id: string; titre: string }) => void;
}

const DUREES_DE_PHASE = ["5 min", "10 min", "15 min", "20 min", "25 min", "30 min", "45 min", "1 h"];

const plat = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** La largeur qu'il faut à la barre d'outils pour tout dire sur une ligne. */
const LARGEUR_BARRE_PLEINE = 740;

/** Les éléments qui font une ligne à eux seuls. */
const BLOCS = /^(P|DIV|H[1-6]|UL|OL|LI|FIGURE|BLOCKQUOTE|PRE|TABLE|SECTION|ARTICLE)$/;

/** Ce que la page dit, relu en document : un bloc par ligne (voir documentSeance.ts). */
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
      else lignes.push(prefixe + l);
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
   * une liste.
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
      if (!(n instanceof HTMLElement) || !(BLOCS.test(n.tagName) || n.dataset.bloc || n.dataset.img)) { enCours.push(n); continue; }
      finir();
      if (n.dataset.bloc === "phase" || /^H[1-6]$/.test(n.tagName)) {
        const titre = Array.from(n.childNodes).map(enLigne).join("").replace(/\s+/g, " ").trim();
        const duree = (n.dataset.duree ?? "").trim();
        lignes.push(`## ${titre || "Phase"}${duree ? ` (${duree})` : ""}`);
      } else if (n.dataset.img) {
        lignes.push(`[img:${n.dataset.img}]`);
      } else if (n.tagName === "UL" || n.tagName === "OL") {
        liste(n);
      } else {
        parcourir(n, true);
      }
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

const estUnePhase = (n: Element | null): n is HTMLElement => n instanceof HTMLElement && (n.dataset.bloc === "phase" || n.tagName === "H3");
/** Ce qui ne se voit pas comme du texte mais compte comme du contenu. */
const CONTENU_SANS_TEXTE = "[data-cite],[data-img],[data-brut],img";

/** Le bloc de la page (paragraphe, phase, liste, image) où se trouve un nœud. */
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

/** Une phase qui redevient un paragraphe : son titre reste, en texte. */
function phaseEnParagraphe(h: HTMLElement): HTMLParagraphElement {
  const p = document.createElement("p");
  for (const n of Array.from(h.childNodes)) if (!(n instanceof HTMLElement && n.dataset.ignorer)) p.appendChild(n);
  if (!p.textContent?.trim() && !p.querySelector(CONTENU_SANS_TEXTE)) p.replaceChildren(document.createElement("br"));
  h.replaceWith(p);
  return p;
}

const poserLeCurseur = (n: Node, ou: "debut" | "fin") => {
  const r = document.createRange();
  r.selectNodeContents(n);
  r.collapse(ou === "debut");
  const sel = window.getSelection();
  sel?.removeAllRanges(); sel?.addRange(r);
};

/**
 * ⌫, ⌦ et Entrée autour d'une image ou d'une phase. Laissés au navigateur,
 * ils fondent un bloc dans l'autre : effacer une image collait le titre de la
 * phase suivante, en gras, au paragraphe d'avant ; Entrée après un titre en
 * faisait une seconde phase vide. Rend vrai quand la touche est traitée.
 */
export function toucheSansFondre(racine: HTMLElement, touche: string, majuscule: boolean): boolean {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return false;
  const plage = sel.getRangeAt(0);
  if (touche === "Backspace" || touche === "Delete") {
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
      if (estUnePhase(ici)) { poserLeCurseur(phaseEnParagraphe(ici), "debut"); return true; }
    }
    if (touche === "Delete" && auBord(ici, plage, "fin")) {
      const apres = ici.nextElementSibling;
      if (apres instanceof HTMLElement && apres.dataset.img) { apres.remove(); return true; }
      if (estUnePhase(apres)) { phaseEnParagraphe(apres); sel.removeAllRanges(); sel.addRange(plage); return true; }
    }
    return false;
  }
  if (touche === "Enter" && !majuscule && plage.collapsed) {
    const ici = blocDe(racine, plage.startContainer);
    if (!estUnePhase(ici)) return false;
    // Au début du titre, une ligne s'ouvre au-dessus ; ailleurs, le texte de la phase commence dessous.
    const p = document.createElement("p");
    p.appendChild(document.createElement("br"));
    if (auBord(ici, plage, "debut") && ici.textContent?.trim()) { ici.before(p); return true; }
    const suite = ici.nextElementSibling;
    if (suite?.tagName === "P" && !suite.textContent?.trim() && !suite.querySelector(CONTENU_SANS_TEXTE)) { poserLeCurseur(suite, "debut"); return true; }
    ici.after(p);
    poserLeCurseur(p, "debut");
    return true;
  }
  return false;
}

export const EditeurDeroulement = React.forwardRef<EditeurDeroulementHandle, {
  valeur: string;
  onChange: (document: string) => void;
  citables: Citable[];
  onOuvrirCitation: (genre: GenreCite, id: string) => void;
  /** « ＋ Ajouter ou créer un support… », au bas du menu « @ ». */
  onAjouterSupport: () => void;
  onFabriquer: () => void;
}>(function EditeurDeroulement({ valeur, onChange, citables, onOuvrirCitation, onAjouterSupport, onFabriquer }, ref) {
  const zone = React.useRef<HTMLDivElement>(null);
  const publie = React.useRef<string | null>(null);
  const derniere = React.useRef<Range | null>(null);
  const [vide, setVide] = React.useState(!valeur.trim());
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

  const dansLaZone = (n: Node | null) => !!n && !!zone.current && zone.current.contains(n);

  /** Les images de la page n'ont que leur nom : on les lit et on les montre. */
  const afficherImages = () => {
    zone.current?.querySelectorAll<HTMLImageElement>("img[data-fichier]:not([src])").forEach((img) => {
      chargerImage(img.dataset.fichier ?? "").then((src) => { img.src = src; }).catch(() => { img.alt = "Image introuvable"; });
    });
  };

  // Le document n'est posé que s'il change d'ailleurs (à l'ouverture, une conversion, une autre machine).
  React.useLayoutEffect(() => {
    if (!zone.current || valeur === publie.current) return;
    zone.current.innerHTML = documentEnHtml(valeur, { edition: true });
    publie.current = valeur;
    setVide(!valeur.trim());
    afficherImages();
  }, [valeur]);

  React.useEffect(() => {
    try { document.execCommand("defaultParagraphSeparator", false, "p"); document.execCommand("styleWithCSS", false, "false"); } catch { /* sans effet ailleurs */ }
  }, []);

  /**
   * WebKit ôte « contenteditable=false » des pastilles qu'une commande déplace
   * (une liste, une phase posée) : on le leur rend, et ce qui aurait été tapé
   * dedans en ressort — sinon la relecture, qui ne garde d'une pastille que sa
   * marque, le perdrait.
   */
  const reparer = () => {
    zone.current?.querySelectorAll<HTMLElement>("[data-cite],[data-ignorer],[data-brut],[data-img]").forEach((n) => {
      if (n.getAttribute("contenteditable") === "false") return;
      const attendu = n.dataset.cite ? `${ICONE_CITE[n.dataset.cite.split(":")[0] as GenreCite] ?? ""} ${n.dataset.titre ?? ""}`
        : n.dataset.ignorer ? (n.closest<HTMLElement>("[data-duree]")?.dataset.duree || "durée") : null;
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

  const publier = () => {
    if (!zone.current) return;
    reparer();
    const doc = versDocument(zone.current);
    setVide(!zone.current.innerText.trim() && !zone.current.querySelector("[data-img],[data-cite]"));
    if (doc === publie.current) return;
    publie.current = doc;
    onChange(doc);
  };

  /** Rend la sélection d'avant le clic sur un outil, puis agit, puis publie. */
  const agir = (fn: () => void) => {
    const el = zone.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (sel && (!sel.rangeCount || !dansLaZone(sel.anchorNode))) {
      sel.removeAllRanges();
      if (derniere.current && dansLaZone(derniere.current.commonAncestorContainer)) sel.addRange(derniere.current);
      else { const fin = document.createRange(); fin.selectNodeContents(el); fin.collapse(false); sel.addRange(fin); }
    }
    fn();
    publier();
  };
  const cmd = (commande: string, v?: string) => agir(() => document.execCommand(commande, false, v));
  /**
   * Pose du HTML en ligne à la place de la sélection, le curseur juste après.
   * `insertHTML` sortirait une pastille de son paragraphe quand elle le finit
   * (Chrome comme WebKit) : elle deviendrait une ligne à elle seule.
   */
  const poserEnLigne = (html: string) => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const plage = sel.getRangeAt(0);
    plage.deleteContents();
    const modele = document.createElement("template");
    modele.innerHTML = html;
    const noeuds = Array.from(modele.content.childNodes);
    if (!noeuds.length) return;
    // Dans un éditeur vide, le curseur est dans la racine : la pastille ouvre un paragraphe.
    if (plage.startContainer === zone.current) {
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
  /** Pose des images à l'endroit du curseur ; au bout du document, un paragraphe attend la suite. */
  const poserLesFigures = (html: string) => {
    const avant = new Set(Array.from(zone.current?.querySelectorAll("[data-img]") ?? []));
    document.execCommand("insertHTML", false, html);
    const neuves = Array.from(zone.current?.querySelectorAll("[data-img]") ?? []).filter((f) => !avant.has(f));
    const derniere = neuves[neuves.length - 1];
    if (derniere && !derniere.nextElementSibling && derniere.parentElement === zone.current) derniere.insertAdjacentHTML("afterend", "<p><br></p>");
  };
  const poserImages = async (images: Blob[], plage: Range | null) => {
    setEnvoi(true);
    try {
      let html = "";
      for (const f of images) {
        const { base64, ext } = await preparerImage(f);
        const nom = await api.fichierSave(`photo.${ext}`, base64);
        html += htmlImage(nom, `data:image/${ext === "jpg" ? "jpeg" : ext};base64,${base64}`);
      }
      if (plage) derniere.current = plage;
      agir(() => poserLesFigures(html));
    } catch (e) {
      toast("Image non ajoutée : " + texteErreur(e), { icone: "⚠️", duree: 6000 });
    } finally {
      setEnvoi(false);
    }
  };
  const poserImageDuTelephone = (nom: string) => {
    agir(() => poserLesFigures(htmlImage(nom)));
    afficherImages();
  };

  // ── Les phases ──
  const nouvellePhase = () => {
    const avant = new Set(Array.from(zone.current?.querySelectorAll("h3") ?? []));
    agir(() => {
      document.execCommand("insertHTML", false,
        `<h3 class="doc-phase" data-bloc="phase" data-duree="10 min">Nouvelle phase<span class="doc-duree" contenteditable="false" data-ignorer="1">10 min</span></h3>`);
      const neuve = Array.from(zone.current?.querySelectorAll("h3") ?? []).find((h) => !avant.has(h));
      if (!neuve) return;
      // Au bout du document, un paragraphe attend le texte de la phase ; au milieu d'un paragraphe, la suite
      // passe sous la phase, sans l'espace qui la séparait de la phrase d'avant.
      const suite = neuve.nextElementSibling;
      if (!suite) neuve.insertAdjacentHTML("afterend", "<p><br></p>");
      else if (suite.firstChild?.nodeType === Node.TEXT_NODE) suite.firstChild.textContent = (suite.firstChild.textContent ?? "").replace(/^\s+/, "");
      // Le titre de la nouvelle phase, sélectionné : on l'écrit par-dessus.
      const texte = neuve.firstChild;
      if (texte?.nodeType === Node.TEXT_NODE) {
        const r = document.createRange();
        r.selectNodeContents(texte);
        const sel = window.getSelection();
        sel?.removeAllRanges(); sel?.addRange(r);
      }
    });
  };
  const [duree, setDuree] = React.useState<{ phase: HTMLElement; haut: number; gauche: number } | null>(null);
  const poserDuree = (d: string) => {
    if (!duree) return;
    duree.phase.dataset.duree = d;
    const chip = duree.phase.querySelector<HTMLElement>(".doc-duree");
    if (chip) chip.textContent = d || "durée";
    setDuree(null);
    publier();
  };

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
    if (!n || n.nodeType !== Node.TEXT_NODE || !dansLaZone(n)) return null;
    const avant = (n.textContent ?? "").slice(0, sel.anchorOffset);
    const m = /(?:^|[\s(«"'’])@([^\s@][^@\n]{0,30}|)$/.exec(avant);
    if (!m) return null;
    const requete = m[1];
    if (requete.split(/\s+/).length > 3) return null;
    return { noeud: n as Text, debut: sel.anchorOffset - requete.length - 1, fin: sel.anchorOffset, requete };
  };
  const ouvrirMention = (tape: boolean, requete = "") => {
    const sel = window.getSelection();
    const r = sel && sel.rangeCount ? sel.getRangeAt(0).getBoundingClientRect() : zone.current!.getBoundingClientRect();
    setMention({ haut: Math.min(window.innerHeight - 320, r.bottom + 6), gauche: Math.min(window.innerWidth - 380, Math.max(8, r.left - 8)), requete, index: 0, tape });
  };
  const suivreMention = () => {
    const a = arobaseAvant();
    if (a) ouvrirMention(true, a.requete);
    else setMention((m) => (m?.tape ? null : m));
  };
  const citer = (c: { genre: GenreCite; id: string; titre: string }) => {
    const html = `<span class="cite cite-${c.genre}" contenteditable="false" data-cite="${c.genre}:${echapper(c.id)}" data-titre="${echapper(c.titre)}">${ICONE_CITE[c.genre]} ${echapper(c.titre)}</span>&nbsp;`;
    agir(() => {
      const a = mention?.tape ? arobaseAvant() : null;
      if (a) {
        const r = document.createRange();
        r.setStart(a.noeud, a.debut); r.setEnd(a.noeud, a.fin);
        const sel = window.getSelection()!;
        sel.removeAllRanges(); sel.addRange(r);
      }
      poserEnLigne(html);
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
      zone.current?.querySelectorAll(".doc-image.choisie").forEach((f) => { if (!sel?.containsNode(f)) f.classList.remove("choisie"); });
      if (!sel || !sel.rangeCount || !dansLaZone(sel.anchorNode)) { setBulle(null); return; }
      derniere.current = sel.getRangeAt(0).cloneRange();
      const nouveaux = { bold: document.queryCommandState("bold"), italic: document.queryCommandState("italic"), insertUnorderedList: document.queryCommandState("insertUnorderedList") };
      setEtats((avant) => (Object.keys(nouveaux).every((k) => avant[k] === (nouveaux as Record<string, boolean>)[k]) ? avant : nouveaux));
      if (sel.isCollapsed || sel.toString().trim().length < 3) { setBulle(null); return; }
      const r = sel.getRangeAt(0).getBoundingClientRect();
      setBulle({ haut: Math.max(8, r.top - 46), gauche: Math.min(window.innerWidth - 200, Math.max(8, r.left + r.width / 2 - 60)) });
    };
    document.addEventListener("selectionchange", lire);
    return () => document.removeEventListener("selectionchange", lire);
  }, []);
  const proposer = async (style: Style) => {
    setMenuStyles(false);
    const sel = window.getSelection();
    const plage = sel && sel.rangeCount && dansLaZone(sel.anchorNode) && !sel.isCollapsed ? sel.getRangeAt(0).cloneRange() : null;
    const source = plage?.toString().trim() ?? "";
    if (!plage || !source) { toast("Sélectionnez d'abord le passage à reformuler.", { icone: "✍️" }); return; }
    // Le passage revient en texte : un support cité, une image ou un titre de phase s'y perdraient.
    if (plage.cloneContents().querySelector("[data-cite],[data-img],[data-brut],h3")) {
      toast("Choisissez du texte seul : un support cité, une image ou un titre de phase ne se reformulent pas.", { icone: "ℹ️", duree: 6000 });
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
    const intacte = dansLaZone(plage.commonAncestorContainer) && plage.toString().trim() === source;
    if (!intacte) { toast("Le passage a changé entre-temps : rien n'est remplacé.", { icone: "ℹ️" }); setReformulation(null); return; }
    derniere.current = plage;
    agir(() => {
      const sel = window.getSelection()!;
      sel.removeAllRanges(); sel.addRange(plage);
      document.execCommand("insertText", false, texte);
    });
    setReformulation(null);
  };

  return (
    <div className="doc">
      <div ref={barre} className={`doc-barre${compacte ? " compacte" : ""}`} role="toolbar" aria-label="Déroulement" onMouseDown={(e) => { if ((e.target as HTMLElement).closest("button")) e.preventDefault(); }}>
        <button type="button" className="doc-outil" onClick={nouvellePhase} title="Commencer une phase : son titre, sa durée">¶ Phase</button>
        {!aDesPhases(valeur) && (
          // Les phases de la première séance d'une démarche (quatre temps, leçon de code, investigation…), à la suite du texte.
          <select className="doc-outil doc-demarche" value="" aria-label="Poser les phases d'une démarche"
            onChange={(e) => {
              const d = demarcheDe(e.target.value);
              const phases = d?.seances[0]?.phases ?? [];
              if (!phases.length) return;
              onChange([valeur.trimEnd(), documentDeLaSeance({ tableauDeroulement: JSON.stringify(tableauDesPhases(phases)) })].filter(Boolean).join("\n"));
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
        <CitationButton label="❝" className="doc-outil" onInsert={(marque) => agir(() => poserEnLigne(`${ligneEnHtml(marque, true)}&nbsp;`))} />
        <button type="button" className="doc-outil" title="Fabriquer une feuille pour la séance avec un générateur" onClick={onFabriquer}>✨ Fabriquer</button>
        {envoi && <span className="doc-envoi" role="status">Image en cours d'ajout…</span>}
      </div>
      <input ref={fichiers} type="file" accept="image/*" multiple hidden
        onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ""; if (f.length) void poserImages(f, derniere.current); }} />

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

      <div className="doc-page">
        {vide && <div className="doc-placeholder" aria-hidden="true">Le déroulement : « ¶ Phase » pour commencer une phase, « @ » pour citer un support…</div>}
        <div ref={zone} className="doc-editeur" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true"
          aria-label="Déroulement de la séance" spellCheck
          onInput={() => { publier(); suivreMention(); }}
          onKeyDown={(e) => {
            // ⌘B et ⌘I : la vue web de l'application ne les connaît pas d'elle-même sur Mac.
            const lettre = e.key.toLowerCase();
            if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && (lettre === "b" || lettre === "i")) {
              e.preventDefault();
              cmd(lettre === "b" ? "bold" : "italic");
              return;
            }
            if (!mention) {
              if (zone.current && toucheSansFondre(zone.current, e.key, e.shiftKey)) { e.preventDefault(); publier(); }
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
          onBlur={() => setTimeout(() => { if (!document.activeElement?.closest?.(".doc-mentions")) setMention((m) => (m?.tape ? null : m)); }, 150)}
          onClick={(e) => {
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
            if (cite?.dataset.cite) { const [g, ...id] = cite.dataset.cite.split(":"); onOuvrirCitation(g as GenreCite, id.join(":")); return; }
            const chip = (e.target as HTMLElement).closest<HTMLElement>(".doc-duree");
            const phase = chip?.closest<HTMLElement>("[data-bloc='phase'], h3");
            if (chip && phase) { const r = chip.getBoundingClientRect(); setDuree({ phase, haut: r.bottom + 6, gauche: r.left }); }
          }}
          onPaste={(e) => {
            const photos = Array.from(e.clipboardData.items).filter((i) => i.kind === "file" && i.type.startsWith("image/"))
              .map((i) => i.getAsFile()).filter((f): f is File => f !== null);
            const images = photos.length ? photos : imagesDuHtmlColle(e.clipboardData.getData("text/html"));
            e.preventDefault();
            if (images.length) {
              const sel = window.getSelection();
              void poserImages(images, sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null);
              return;
            }
            // Collé sans la mise en forme d'origine : le texte, proprement.
            document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
            publier();
          }}
          onDragOver={(e) => { if (Array.from(e.dataTransfer.items).some((i) => i.kind === "file")) e.preventDefault(); }}
          onDrop={(e) => {
            const images = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
            if (!images.length) return;
            e.preventDefault();
            const plage = (document as Document & { caretRangeFromPoint?: (x: number, y: number) => Range | null }).caretRangeFromPoint?.(e.clientX, e.clientY) ?? null;
            void poserImages(images, plage && dansLaZone(plage.startContainer) ? plage : null);
          }} />
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
                else if (e.key === "Escape") { e.preventDefault(); setMention(null); zone.current?.focus(); }
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
          {DUREES_DE_PHASE.map((d) => <button key={d} type="button" className="doc-mention" onClick={() => poserDuree(d)}>{d}</button>)}
          <button type="button" className="doc-mention" onClick={() => poserDuree("")}>Sans durée</button>
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

/** Le déroulement à lire : ses phases numérotées, ses images, ses supports cités. */
export function DeroulementLu({ document: doc }: { document: string }) {
  const [sources, setSources] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    let actif = true;
    for (const nom of new Set(imagesDuDocument(doc))) {
      chargerImage(nom).then((src) => { if (actif) setSources((avant) => (avant[nom] === src ? avant : { ...avant, [nom]: src })); }).catch(() => {});
    }
    return () => { actif = false; };
  }, [doc]);
  return <div className="doc-lu" dangerouslySetInnerHTML={{ __html: documentEnHtml(doc, { image: (n) => sources[n] }) }} />;
}
