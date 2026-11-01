import React from "react";
import { chercherDansLesMorceaux, ouOnEnEst } from "../chercherDansLaPage";

// ── ⌘F partout (voir chercherDansLaPage) ──────────────────────────────────
//
// La barre s'ouvre en haut à droite, au-dessus de tout. Elle cherche dans ce
// que l'écran montre : la fenêtre ouverte au premier plan s'il y en a une,
// sinon la page — pas ce qui est replié ou caché. Les passages trouvés se
// surlignent sans que la page change (les surlignages de CSS) ; dans un champ
// — le prévu du cahier journal —, c'est le champ qui s'entoure. ↵ et ⇧↵ vont
// au suivant et au précédent, Échap ferme. Une fenêtre qui a son propre ⌘F
// — la visionneuse du coffre-fort — le garde.

/** Ce que la recherche ne regarde pas : la barre elle-même. */
const DEHORS = "data-sans-recherche";
const SURLIGNE = "maitrize-trouve";
const SURLIGNE_ACTIF = "maitrize-trouve-actif";
const CHAMP_ACTIF = "trouve-dans-le-champ";

type Champ = HTMLInputElement | HTMLTextAreaElement;
type Morceau = { noeud: Text; champ?: undefined } | { champ: Champ; noeud?: undefined };
type Cible = { range: Range; champ?: undefined } | { champ: Champ; range?: undefined };

/** Les surlignages de CSS, quand le moteur les connaît (WebKit depuis 2023). */
type Surlignages = { set: (nom: string, h: unknown) => void; delete: (nom: string) => void };
const surlignages = (): { registre: Surlignages; Highlight: new (...r: Range[]) => unknown } | null => {
  const registre = (globalThis.CSS as unknown as { highlights?: Surlignages } | undefined)?.highlights;
  const Highlight = (globalThis as unknown as { Highlight?: new (...r: Range[]) => unknown }).Highlight;
  return registre && Highlight ? { registre, Highlight } : null;
};

const aDesBoites = (n: Node) => { const r = document.createRange(); r.selectNodeContents(n); return r.getClientRects().length > 0; };

/** Où chercher : la fenêtre ouverte au premier plan, sinon la page. */
function racine(): Element {
  const fenetres = [...document.querySelectorAll(".overlay")].filter((f) => f.getClientRects().length > 0);
  return fenetres[fenetres.length - 1] ?? document.querySelector("main") ?? document.body;
}

/** Les morceaux de texte visibles, dans l'ordre de la page : les nœuds de texte, et la valeur de chaque champ. */
function morceauxDe(r: Element): Morceau[] {
  const sortie: Morceau[] = [];
  const parcourir = (n: Node) => {
    for (let c = n.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === Node.TEXT_NODE) {
        if (c.nodeValue?.trim() && aDesBoites(c)) sortie.push({ noeud: c as Text });
      } else if (c instanceof HTMLElement) {
        if (c.hasAttribute(DEHORS) || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|SELECT)$/.test(c.tagName)) continue;
        if (c instanceof HTMLTextAreaElement || (c instanceof HTMLInputElement && /^(text|search|)$/.test(c.type))) {
          if (c.value.trim() && c.getClientRects().length > 0) sortie.push({ champ: c });
          continue;
        }
        parcourir(c);
      }
    }
  };
  parcourir(r);
  return sortie;
}

/** Les passages trouvés dans ce que l'écran montre, prêts à surligner. */
function cibles(recherche: string): Cible[] {
  const morceaux = morceauxDe(racine());
  const textes = morceaux.map((m) => (m.noeud ? m.noeud.nodeValue ?? "" : m.champ.value));
  return chercherDansLesMorceaux(textes, recherche, (i) => !!morceaux[i].champ).map((t): Cible => {
    const de = morceaux[t.de], a = morceaux[t.a];
    if (de.champ) return { champ: de.champ };
    const range = document.createRange();
    range.setStart(de.noeud, t.debut);
    range.setEnd(a.noeud!, t.fin);
    return { range };
  });
}

function effacer() {
  const s = surlignages();
  s?.registre.delete(SURLIGNE);
  s?.registre.delete(SURLIGNE_ACTIF);
  document.querySelectorAll(`.${CHAMP_ACTIF}`).forEach((e) => e.classList.remove(CHAMP_ACTIF));
}

/** Surligne toutes les trouvailles, et celle où l'on est d'une autre couleur ; `montrer` la fait venir à l'écran. */
function surligner(liste: Cible[], rang: number, montrer: boolean) {
  effacer();
  const s = surlignages();
  const ranges = liste.flatMap((c) => (c.range ? [c.range] : []));
  if (s && ranges.length) s.registre.set(SURLIGNE, new s.Highlight(...ranges));
  const actif = liste[rang];
  if (!actif) return;
  if (actif.range) {
    if (s) s.registre.set(SURLIGNE_ACTIF, new s.Highlight(actif.range));
    if (montrer) actif.range.startContainer.parentElement?.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
  } else {
    // Le champ s'entoure, sans rien y sélectionner : sélectionner peut lui donner la main, et ↵ y écrirait.
    actif.champ.classList.add(CHAMP_ACTIF);
    if (montrer) actif.champ.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
  }
}

export function ChercherDansLaPage() {
  const [ouverte, setOuverte] = React.useState(false);
  const [recherche, setRecherche] = React.useState("");
  const [liste, setListe] = React.useState<Cible[]>([]);
  const [rang, setRang] = React.useState(0);
  const champ = React.useRef<HTMLInputElement>(null);
  const etat = React.useRef({ recherche, rang });
  etat.current = { recherche, rang };

  // Le champ prend la main, ce qu'on y avait tapé sélectionné, comme dans un navigateur : à l'ouverture, une fois
  // la barre affichée ; à un nouveau ⌘F, aussitôt.
  const ouvrir = React.useCallback(() => {
    if (champ.current) { champ.current.focus(); champ.current.select(); } else setOuverte(true);
  }, []);
  React.useEffect(() => { if (ouverte) { champ.current?.focus(); champ.current?.select(); } }, [ouverte]);
  const fermer = React.useCallback(() => { setOuverte(false); setListe([]); effacer(); }, []);

  // ⌘F, après les autres : une fenêtre qui a son propre ⌘F l'a déjà pris.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "f") {
        setTimeout(() => { if (!e.defaultPrevented) ouvrir(); }, 0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ouvrir]);

  // Chercher, après une courte pause : on tape « poissons » lettre à lettre.
  React.useEffect(() => {
    if (!ouverte) return;
    const t = setTimeout(() => {
      const l = cibles(recherche);
      setListe(l);
      setRang(0);
      surligner(l, 0, true);
    }, 150);
    return () => clearTimeout(t);
  }, [ouverte, recherche]);

  // La page change sous la barre — on déplie, on passe à un autre jour — : les trouvailles se refont, sans bouger l'écran.
  React.useEffect(() => {
    if (!ouverte) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const obs = new MutationObserver((mutations) => {
      if (mutations.every((m) => (m.target instanceof Element ? m.target : m.target.parentElement)?.closest(`[${DEHORS}]`))) return;
      clearTimeout(t);
      t = setTimeout(() => {
        const l = cibles(etat.current.recherche);
        const r = Math.min(etat.current.rang, Math.max(0, l.length - 1));
        setListe(l);
        setRang(r);
        surligner(l, r, false);
      }, 300);
    });
    obs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["class", "style", "hidden", "open"] });
    return () => { clearTimeout(t); obs.disconnect(); };
  }, [ouverte]);

  React.useEffect(() => () => effacer(), []);

  const aller = (pas: number) => {
    if (!liste.length) return;
    const r = (rang + pas + liste.length) % liste.length;
    setRang(r);
    surligner(liste, r, true);
  };

  if (!ouverte) return null;
  return (
    <div className="chercher-page" role="search" {...{ [DEHORS]: "" }}>
      <input ref={champ} className="input" value={recherche} placeholder="Chercher dans la page" aria-label="Chercher dans la page"
        onChange={(e) => setRecherche(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); aller(e.shiftKey ? -1 : 1); }
          else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); fermer(); }
        }} />
      <span className="chercher-page-compte" aria-live="polite">{ouOnEnEst(rang, liste.length, recherche)}</span>
      <button type="button" className="btn ghost sm" disabled={!liste.length} onClick={() => aller(-1)} aria-label="Passage précédent" title="Précédent (⇧↵)">↑</button>
      <button type="button" className="btn ghost sm" disabled={!liste.length} onClick={() => aller(1)} aria-label="Passage suivant" title="Suivant (↵)">↓</button>
      <button type="button" className="btn ghost sm" onClick={fermer} aria-label="Fermer la recherche" title="Fermer (Échap)">✕</button>
    </div>
  );
}
