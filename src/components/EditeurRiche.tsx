import React from "react";
import { texteErreur } from "../api";
import { toast } from "./Toaster";
import { reformuler, STYLES, Style } from "../reformulation";
import { nettoyerHtml, versHtml, texteVersHtmlEnLigne } from "../texteRiche";

// Éditeur de texte mis en forme, façon traitement de texte : titres, gras,
// listes, alignement, surlignage — et reformulation par l'IA du seul passage
// sélectionné.
//
// On sélectionne à la souris : une bulle « ✨ Reformuler » apparaît au-dessus
// du passage. La proposition s'affiche à part, retouchable ; elle ne remplace
// le passage que sur demande, et ⌘Z la défait comme une frappe.
//
// Mise en forme par `document.execCommand` : ancienne mais présente dans les
// webviews de macOS et de Windows, et elle garde l'historique d'annulation.

export interface EditeurRicheHandle {
  /** Insère du HTML à l'endroit du curseur (ou à la fin). */
  inserer: (html: string) => void;
  focus: () => void;
}

interface Proposition {
  texte: string;
  source: string;
  plage: Range;
  style: Style;
  nomsAbsents: string[];
}

const normaliserEspaces = (t: string) => t.replace(/\s+/g, " ").trim();

/** Petites icônes dessinées : les symboles Unicode d'alignement ne s'affichent pas partout. */
const TRACES: Record<string, React.ReactNode> = {
  annuler: <><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></>,
  retablir: <><path d="m15 14 5-5-5-5" /><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" /></>,
  puces: <><circle cx="5" cy="7" r="1.2" /><circle cx="5" cy="12" r="1.2" /><circle cx="5" cy="17" r="1.2" /><path d="M9 7h11M9 12h11M9 17h11" /></>,
  numeros: <><path d="M10 7h10M10 12h10M10 17h10" /><path d="M4 5.5 5.5 5v4" /><path d="M3.8 12.2c.4-.9 2.6-.9 2.6.3 0 .9-2.6 1.4-2.6 2.5h2.7" /></>,
  gauche: <path d="M4 6h16M4 10h10M4 14h16M4 18h10" />,
  centre: <path d="M4 6h16M7 10h10M4 14h16M7 18h10" />,
  effacer: <><path d="M6 5h12M12 5 9.5 17" /><path d="m15 15 5 5M20 15l-5 5" /></>,
};
const Icone = ({ nom }: { nom: string }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
    strokeLinejoin="round" aria-hidden="true" style={{ display: "block", margin: "0 auto" }}>{TRACES[nom]}</svg>
);

/** Le texte d'une plage, retours à la ligne des paragraphes compris. */
function texteDeLaPlage(plage: Range): string {
  const tampon = document.createElement("div");
  tampon.style.cssText = "position:fixed;left:-99999px;top:0;white-space:pre-wrap;";
  tampon.appendChild(plage.cloneContents());
  document.body.appendChild(tampon);
  const texte = tampon.innerText;
  tampon.remove();
  return texte.replace(/\n{3,}/g, "\n\n").trim();
}

export const EditeurRiche = React.forwardRef<EditeurRicheHandle, {
  valeur: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Outils ajoutés au bout de la barre (insertion de blocs…). */
  outils?: React.ReactNode;
  minHauteur?: string;
}>(function EditeurRiche({ valeur, onChange, placeholder = "Écrivez ici…", outils, minHauteur = "55vh" }, ref) {
  const zone = React.useRef<HTMLDivElement>(null);
  const derniere = React.useRef<Range | null>(null);
  const [vide, setVide] = React.useState(!valeur.trim());
  const [bulle, setBulle] = React.useState<{ haut: number; gauche: number } | null>(null);
  const [menu, setMenu] = React.useState<null | "barre" | "bulle">(null);
  const [enCours, setEnCours] = React.useState(false);
  const [proposition, setProposition] = React.useState<Proposition | null>(null);
  const [etats, setEtats] = React.useState<Record<string, boolean>>({});
  const [mots, setMots] = React.useState(0);

  // Le contenu n'est posé qu'au montage : le réécrire à chaque frappe ferait
  // sauter le curseur. Changer de document, c'est remonter l'éditeur (key).
  React.useLayoutEffect(() => {
    if (zone.current) zone.current.innerHTML = versHtml(valeur);
    compter();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const compter = () => {
    const t = zone.current?.innerText ?? "";
    setVide(!t.trim());
    setMots(t.trim() ? t.trim().split(/\s+/).length : 0);
  };

  const publier = () => {
    compter();
    onChange(nettoyerHtml(zone.current?.innerHTML ?? ""));
  };

  const dansLaZone = (n: Node | null) => !!n && !!zone.current && zone.current.contains(n);

  React.useEffect(() => {
    const lire = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || !dansLaZone(sel.anchorNode)) { setBulle(null); setMenu((m) => (m === "bulle" ? null : m)); return; }
      const plage = sel.getRangeAt(0);
      derniere.current = plage.cloneRange();
      const nouveaux: Record<string, boolean> = {
        bold: document.queryCommandState("bold"), italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"), insertUnorderedList: document.queryCommandState("insertUnorderedList"),
        insertOrderedList: document.queryCommandState("insertOrderedList"),
      };
      // Pas de nouveau rendu à chaque déplacement du curseur si rien n'a changé.
      setEtats((avant) => (Object.keys(nouveaux).every((k) => avant[k] === nouveaux[k]) ? avant : nouveaux));
      if (sel.isCollapsed || !sel.toString().trim()) { setBulle(null); setMenu((m) => (m === "bulle" ? null : m)); return; }
      const r = plage.getBoundingClientRect();
      setBulle({ haut: Math.max(8, r.top - 46), gauche: Math.min(window.innerWidth - 220, Math.max(8, r.left + r.width / 2 - 70)) });
    };
    document.addEventListener("selectionchange", lire);
    return () => document.removeEventListener("selectionchange", lire);
  }, []);

  /** Rend la sélection d'avant le clic sur un outil, puis agit. */
  const agir = (fn: () => void) => {
    const el = zone.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (derniere.current && sel && !dansLaZone(sel.anchorNode)) {
      sel.removeAllRanges();
      sel.addRange(derniere.current);
    }
    fn();
    publier();
  };
  const cmd = (commande: string, valeurCmd?: string) => agir(() => document.execCommand(commande, false, valeurCmd));

  React.useImperativeHandle(ref, () => ({
    inserer: (html: string) => agir(() => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || !dansLaZone(sel.anchorNode)) {
        const fin = document.createRange();
        fin.selectNodeContents(zone.current!);
        fin.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(fin);
      }
      document.execCommand("insertHTML", false, nettoyerHtml(html));
    }),
    focus: () => zone.current?.focus(),
  }));

  const proposer = async (style: Style) => {
    setMenu(null);
    const sel = window.getSelection();
    const plage = sel && sel.rangeCount > 0 && dansLaZone(sel.anchorNode) && !sel.isCollapsed ? sel.getRangeAt(0).cloneRange() : null;
    if (!plage) { toast("Sélectionnez d'abord le passage à reformuler.", { icone: "✍️" }); return; }
    const source = texteDeLaPlage(plage);
    if (!source.trim()) { toast("Le passage sélectionné est vide.", { icone: "✍️" }); return; }
    setEnCours(true);
    setProposition(null);
    try {
      const p = await reformuler(source, style);
      setProposition({ texte: p.texte, source, plage, style, nomsAbsents: p.nomsAbsents });
    } catch (e) {
      toast("Reformulation impossible : " + texteErreur(e), { icone: "⚠️", duree: 7000 });
    } finally {
      setEnCours(false);
    }
  };

  const appliquer = (mode: "remplacer" | "inserer") => {
    if (!proposition) return;
    const { plage, source, texte } = proposition;
    const intacte = dansLaZone(plage.commonAncestorContainer) && normaliserEspaces(texteDeLaPlage(plage)) === normaliserEspaces(source);
    agir(() => {
      const sel = window.getSelection()!;
      if (intacte) {
        sel.removeAllRanges();
        sel.addRange(plage);
        if (mode === "inserer") sel.collapseToEnd();
        document.execCommand("insertHTML", false, (mode === "inserer" ? "<br><br>" : "") + texteVersHtmlEnLigne(texte));
      } else {
        // Le passage a changé pendant la reformulation : on ne devine pas où la mettre.
        const fin = document.createRange();
        fin.selectNodeContents(zone.current!);
        fin.collapse(false);
        sel.removeAllRanges();
        sel.addRange(fin);
        document.execCommand("insertHTML", false, `<p>${texteVersHtmlEnLigne(texte)}</p>`);
        toast("Le passage a changé entre-temps : la proposition est ajoutée à la fin.", { icone: "ℹ️" });
      }
    });
    setProposition(null);
  };

  return (
    <div className="editeur-riche">
      <div className="editeur-riche-barre" role="toolbar" aria-label="Mise en forme">
        <Outil titre="Annuler (⌘Z)" onClick={() => cmd("undo")}><Icone nom="annuler" /></Outil>
        <Outil titre="Rétablir (⌘⇧Z)" onClick={() => cmd("redo")}><Icone nom="retablir" /></Outil>
        <span className="editeur-riche-sep" />
        <select className="outil-select" aria-label="Style du paragraphe" defaultValue=""
          onMouseDown={() => { const s = window.getSelection(); if (s && s.rangeCount && dansLaZone(s.anchorNode)) derniere.current = s.getRangeAt(0).cloneRange(); }}
          onChange={(e) => { const v = e.target.value; e.target.value = ""; if (v) cmd("formatBlock", v); }}>
          <option value="" disabled>Style…</option>
          <option value="p">Texte</option>
          <option value="h1">Titre</option>
          <option value="h2">Sous-titre</option>
          <option value="h3">Petit titre</option>
          <option value="blockquote">Encadré</option>
        </select>
        <Outil titre="Gras (⌘B)" actif={etats.bold} onClick={() => cmd("bold")}><b>G</b></Outil>
        <Outil titre="Italique (⌘I)" actif={etats.italic} onClick={() => cmd("italic")}><i>I</i></Outil>
        <Outil titre="Souligné (⌘U)" actif={etats.underline} onClick={() => cmd("underline")}><u>S</u></Outil>
        <Outil titre="Surligner" onClick={() => cmd("hiliteColor", "#fff1a8")}>🖍</Outil>
        <span className="editeur-riche-sep" />
        <Outil titre="Liste à puces" actif={etats.insertUnorderedList} onClick={() => cmd("insertUnorderedList")}><Icone nom="puces" /></Outil>
        <Outil titre="Liste numérotée" actif={etats.insertOrderedList} onClick={() => cmd("insertOrderedList")}><Icone nom="numeros" /></Outil>
        <Outil titre="Aligner à gauche" onClick={() => cmd("justifyLeft")}><Icone nom="gauche" /></Outil>
        <Outil titre="Centrer" onClick={() => cmd("justifyCenter")}><Icone nom="centre" /></Outil>
        <Outil titre="Effacer la mise en forme" onClick={() => cmd("removeFormat")}><Icone nom="effacer" /></Outil>
        <span className="editeur-riche-sep" />
        <div style={{ position: "relative" }}>
          <button type="button" className="btn sm" onMouseDown={(e) => e.preventDefault()} disabled={enCours}
            onClick={() => setMenu((m) => (m === "barre" ? null : "barre"))} title="Reformuler le passage sélectionné">
            {enCours ? "✨ Reformulation…" : "✨ Reformuler la sélection ▾"}
          </button>
          {menu === "barre" && <MenuStyles onChoisir={proposer} />}
        </div>
        {outils}
        <span className="editeur-riche-mots">{mots} mot{mots > 1 ? "s" : ""}</span>
      </div>

      {proposition && (
        <div className="editeur-riche-proposition" role="region" aria-label="Proposition de l'IA">
          <div style={{ fontSize: 12.5, fontWeight: 650 }}>
            Proposition — {STYLES.find((s) => s.id === proposition.style)?.libelle.toLowerCase()} du passage sélectionné
          </div>
          <div className="editeur-riche-source">« {proposition.source.length > 220 ? proposition.source.slice(0, 217) + "…" : proposition.source} »</div>
          <textarea className="input" value={proposition.texte} aria-label="Proposition, modifiable"
            onChange={(e) => setProposition({ ...proposition, texte: e.target.value })}
            style={{ minHeight: 110, resize: "vertical", fontSize: 14.5, lineHeight: 1.55, fontFamily: "inherit" }} />
          {proposition.nomsAbsents.length > 0 && (
            <div style={{ fontSize: 12, color: "var(--text-2)" }}>Absents de la proposition : {proposition.nomsAbsents.join(", ")}.</div>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn primary sm" onClick={() => appliquer("remplacer")}>Remplacer le passage</button>
            <button className="btn sm" onClick={() => appliquer("inserer")}>Insérer après</button>
            <button className="btn ghost sm" onClick={() => setProposition(null)}>Ignorer</button>
          </div>
        </div>
      )}

      <div style={{ position: "relative" }}>
        {vide && <div className="editeur-riche-placeholder" aria-hidden="true">{placeholder}</div>}
        <div ref={zone} className="editeur-riche-feuille" contentEditable suppressContentEditableWarning
          role="textbox" aria-multiline="true" aria-label="Texte" spellCheck
          style={{ minHeight: minHauteur }}
          onInput={publier}
          onPaste={(e) => {
            // Collé sans la mise en forme d'origine (polices, couleurs, liens) : le texte, proprement.
            e.preventDefault();
            const t = e.clipboardData.getData("text/plain");
            document.execCommand("insertHTML", false, texteVersHtmlEnLigne(t));
          }} />
      </div>

      {bulle && !enCours && (
        <div className="editeur-riche-bulle" style={{ top: bulle.haut, left: bulle.gauche }} onMouseDown={(e) => e.preventDefault()}>
          <button type="button" className="btn primary sm" onClick={() => setMenu((m) => (m === "bulle" ? null : "bulle"))}>✨ Reformuler ▾</button>
          {menu === "bulle" && <MenuStyles onChoisir={proposer} />}
        </div>
      )}
    </div>
  );
});

/**
 * Bouton de la barre. Déclaré hors de l'éditeur : recréé à chaque rendu, il
 * serait remplacé dans la page à chaque frappe, et un clic tombant pendant un
 * enregistrement automatique pourrait se perdre.
 */
function Outil({ titre, children, onClick, actif }: { titre: string; children: React.ReactNode; onClick: () => void; actif?: boolean }) {
  return (
    <button type="button" className="outil" title={titre} aria-label={titre} aria-pressed={actif}
      onMouseDown={(e) => e.preventDefault()} onClick={onClick}>{children}</button>
  );
}

function MenuStyles({ onChoisir }: { onChoisir: (s: Style) => void }) {
  return (
    <div className="editeur-riche-menu" role="menu" onMouseDown={(e) => e.preventDefault()}>
      {STYLES.map((s) => (
        <button key={s.id} type="button" role="menuitem" onClick={() => onChoisir(s.id)}>
          <b>{s.libelle}</b><span>{s.aide}</span>
        </button>
      ))}
      <div className="editeur-riche-menu-note">🔒 Les noms des élèves sont masqués avant l'envoi.</div>
    </div>
  );
}
