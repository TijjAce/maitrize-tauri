import React from "react";
import { createPortal } from "react-dom";
import { texteErreur } from "../api";
import { useAsync } from "./ui";
import { toast } from "./Toaster";
import { Aide } from "./Aide";
import { CaseImpression } from "./MasquesDuJournal";
import { useMiniatures } from "./BandeDesPages";
import { chargerLesManuels, imageDeLaPage, pagesAImprimer } from "../exercicesDesManuels";
import { masqueManuel } from "../journalMasques";
import type { Manuel, PageManuel } from "../manuels";
import {
  cleDuManuel, cliquerUnePage, htmlDesPages, memesPages, pagesAttachees, pagesEnTexte, STYLE_PAGES_DE_MANUEL, titreDesPages, type PagesAttachees,
} from "../pagesDesManuels";
import { printHTML } from "../print";

// ── Des pages de mes manuels, dans un créneau du cahier journal ───────────
//
// Le choix : un manuel d'Adapter une fiche › Manuels, ses pages en vignettes,
// un clic pour en prendre une, Maj pour toute une plage. Sous le prévu, les
// pages attachées : le manuel, leurs numéros, leurs vignettes — une vignette
// s'ouvre en grand, se retire d'une croix (« Annuler » et ⌘Z la remettent), et
// le bloc s'imprime. Ce qui est écrit, c'est la ligne du prévu (voir
// pagesDesManuels.ts) : on la retouche aussi à la main.

/** Mes manuels, relus quand la page revient à l'écran : un manuel importé entre-temps se choisit aussitôt. */
export function useMesManuels(): Manuel[] | null {
  const { data } = useAsync(() => chargerLesManuels().catch((): Manuel[] => []), []);
  return data;
}

/**
 * Les pages qu'un prévu attache, relues seulement quand il change : le
 * journal se redessine à chaque frappe, et les vignettes n'ont pas à le suivre.
 */
export function usePagesAttachees(manuels: Manuel[] | null): (prevu: string) => PagesAttachees[] {
  const cache = React.useMemo(() => new Map<string, PagesAttachees[]>(), [manuels]);
  return React.useCallback((prevu: string) => {
    let lues = cache.get(prevu);
    if (!lues) {
      if (cache.size > 200) cache.clear();
      lues = pagesAttachees(prevu, manuels ?? []);
      cache.set(prevu, lues);
    }
    return lues;
  }, [cache, manuels]);
}

/** Imprime des pages d'un manuel : elles s'ouvrent dans le navigateur, d'où l'on choisit l'imprimante ou le PDF. */
export async function imprimerLesPages(manuel: Manuel, pages: PageManuel[]): Promise<void> {
  try {
    const rendues = await pagesAImprimer(manuel, pages);
    printHTML(titreDesPages({ manuel, pages }), htmlDesPages(rendues, manuel.titre), STYLE_PAGES_DE_MANUEL);
  } catch (e) {
    toast("Pages non imprimées : " + texteErreur(e), { icone: "⚠️", duree: 6000 });
  }
}

// ── Sous le prévu ─────────────────────────────────────────────────────────

/** Les manuels repliés, gardés pendant la séance de travail : replié ici, replié partout. */
const replies = new Set<string>();

/** Les pages de chaque manuel attachées au créneau ; rien s'il n'y en a pas. */
export function PagesDesManuels({ attachees, masques, onMasquer, onRetirer, onChoisir }: {
  attachees: PagesAttachees[];
  /** Ce que ce créneau cite sans l'imprimer, et de quoi le changer. */
  masques?: readonly string[]; onMasquer?: (cle: string) => void;
  onRetirer: (manuel: Manuel, pages: PageManuel[]) => void;
  /** Rouvre le choix des pages, sur ce manuel. */
  onChoisir: (manuel: Manuel) => void;
}) {
  if (!attachees.length) return null;
  return (
    <div className="regles-app" aria-label="Pages des manuels">
      {attachees.map((x) => {
        const cle = masqueManuel(cleDuManuel(x.manuel.titre));
        return (
          <PagesDuManuel key={x.manuel.id} attachees={x} masque={!!masques?.includes(cle)}
            onMasquer={onMasquer ? () => onMasquer(cle) : undefined}
            onRetirer={(pages) => onRetirer(x.manuel, pages)} onChoisir={() => onChoisir(x.manuel)} />
        );
      })}
    </div>
  );
}

function PagesDuManuel({ attachees, masque, onMasquer, onRetirer, onChoisir }: {
  attachees: PagesAttachees; masque: boolean; onMasquer?: () => void;
  onRetirer: (pages: PageManuel[]) => void; onChoisir: () => void;
}) {
  const { manuel, pages } = attachees;
  const { miniatureDe, demander } = useMiniatures(manuel);
  React.useEffect(() => { pages.forEach(demander); }, [pages, demander]);
  const [replie, setReplie] = React.useState(() => replies.has(manuel.id));
  const [enGrand, setEnGrand] = React.useState<string | null>(null);
  const [impression, setImpression] = React.useState(false);
  const basculer = () => {
    const suite = !replie;
    setReplie(suite);
    if (suite) replies.add(manuel.id); else replies.delete(manuel.id);
  };
  const imprimer = async (lesquelles: PageManuel[]) => {
    setImpression(true);
    try { await imprimerLesPages(manuel, lesquelles); } finally { setImpression(false); }
  };
  const n = pages.length;
  return (
    <div className={masque ? "regle-app manuel-app non-imprime" : "regle-app manuel-app"}>
      <div className="regle-app-tete">
        <button className="regle-app-titre" onClick={basculer} aria-expanded={!replie} title={replie ? "Afficher les pages" : "Replier les pages"}>
          <span aria-hidden="true" className="regle-app-fleche">{replie ? "▸" : "▾"}</span> 📖 {titreDesPages(attachees)}
        </button>
        <span className="regle-app-infos">{[manuel.niveau.trim(), `${n} page${n > 1 ? "s" : ""}`].filter(Boolean).join(" · ")}</span>
        {onMasquer && (
          <CaseImpression masque={masque} onChange={onMasquer}
            titre="Coché : ces pages restent sous les yeux à l'écran, mais ne s'impriment pas à la suite du cahier journal" />
        )}
        <button className="btn ghost sm" disabled={impression} onClick={() => { void imprimer(pages); }}
          title={n > 1 ? "Imprimer ces pages" : "Imprimer cette page"} aria-label={`Imprimer ${titreDesPages(attachees)}`}>
          {impression ? "…" : "🖨"}</button>
        <button className="btn ghost sm" onClick={onChoisir} title="Choisir d'autres pages de ce manuel"
          aria-label={`Choisir d'autres pages de ${manuel.titre}`}>✏️</button>
      </div>
      {!replie && (
        <div className="manuel-app-pages">
          {pages.map((p) => {
            const image = miniatureDe(p);
            return (
              <div key={p.id} className="manuel-app-page">
                <button type="button" className="man-vignette manuel-app-vignette" onClick={() => setEnGrand(p.id)}
                  title={`Ouvrir la page ${p.numero} en grand`}>
                  <span className="man-vignette-image">{image && <img src={image} alt="" />}</span>
                  <span className="man-vignette-num">p. {p.numero}</span>
                </button>
                <button type="button" className="manuel-app-retirer" onClick={() => onRetirer([p])}
                  title="Retirer cette page du créneau" aria-label={`Retirer la page ${p.numero} du créneau`}>✕</button>
              </div>
            );
          })}
        </div>
      )}
      {enGrand && (
        <PageEnGrand manuel={manuel} pages={pages} pageId={enGrand} onPage={setEnGrand} onClose={() => setEnGrand(null)}
          onRetirer={(p) => onRetirer([p])} onImprimer={(p) => imprimer([p])} impression={impression} />
      )}
    </div>
  );
}

// ── Une page en grand ─────────────────────────────────────────────────────

/** Les pages déjà dessinées en grand, le temps de la visite : on revient sur une page sans l'attendre. */
const EN_GRAND = new Map<string, string>();
const MAX_EN_GRAND = 24;

function PageEnGrand({ manuel, pages, pageId, onPage, onClose, onRetirer, onImprimer, impression }: {
  manuel: Manuel; pages: PageManuel[]; pageId: string;
  onPage: (id: string) => void; onClose: () => void;
  onRetirer: (p: PageManuel) => void; onImprimer: (p: PageManuel) => void; impression: boolean;
}) {
  const i = pages.findIndex((p) => p.id === pageId);
  const page = i >= 0 ? pages[i] : null;
  const rang = React.useRef(Math.max(0, i));
  if (i >= 0) rang.current = i;
  // La page retirée d'ici : sa voisine prend sa place ; plus aucune, la fenêtre se ferme.
  React.useEffect(() => {
    if (i >= 0) return;
    const voisine = pages[Math.min(rang.current, pages.length - 1)];
    if (voisine) onPage(voisine.id); else onClose();
  }, [i, pages, onPage, onClose]);

  const cle = page ? `${manuel.id}:${page.fichier || `pdf-${page.numero}`}` : "";
  const [image, setImage] = React.useState(() => EN_GRAND.get(cle) ?? "");
  React.useEffect(() => {
    if (!page) return;
    const deja = EN_GRAND.get(cle);
    setImage(deja ?? "");
    if (deja) return;
    let vivant = true;
    imageDeLaPage(manuel, page).then((url) => {
      EN_GRAND.set(cle, url);
      while (EN_GRAND.size > MAX_EN_GRAND) EN_GRAND.delete(EN_GRAND.keys().next().value as string);
      if (vivant) setImage(url);
    }).catch((e) => { if (vivant) toast("Page illisible : " + texteErreur(e), { icone: "⚠️" }); });
    return () => { vivant = false; };
  }, [manuel, page, cle]);

  const boite = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { boite.current?.focus(); }, []);
  const aller = (pas: number) => { const p = pages[i + pas]; if (p) onPage(p.id); };
  const touche = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.stopPropagation(); onClose(); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); aller(e.key === "ArrowLeft" ? -1 : 1); }
  };
  if (!page) return null;
  // Posée sur le corps de la page : le journal zoomé ne la déforme pas.
  return createPortal(
    <div className="overlay" style={{ zIndex: 160 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={boite} className="modal page-en-grand" role="dialog" aria-modal="true" tabIndex={-1} onKeyDown={touche}
        aria-label={`${manuel.titre}, page ${page.numero}`}>
        <div className="modal-head">
          <h2>📖 {manuel.titre} · p. {page.numero}</h2>
          {pages.length > 1 && <span className="meta">{i + 1} / {pages.length}</span>}
          <div className="spacer" />
          <button className="btn sm" disabled={impression} onClick={() => onImprimer(page)}>{impression ? "…" : "🖨 Imprimer la page"}</button>
          <button className="btn ghost sm" onClick={() => onRetirer(page)} title="Retirer cette page du créneau">Retirer du créneau</button>
          <button className="btn ghost sm" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <div className="page-en-grand-corps">
          <button type="button" className="btn ghost page-en-grand-pas" disabled={i <= 0} onClick={() => aller(-1)}
            title="Page précédente (←)" aria-label="Page précédente">‹</button>
          <div className="page-en-grand-cadre">
            {image ? <img src={image} alt={`Page ${page.numero}`} /> : <div className="page-en-grand-attente" />}
          </div>
          <button type="button" className="btn ghost page-en-grand-pas" disabled={i >= pages.length - 1} onClick={() => aller(1)}
            title="Page suivante (→)" aria-label="Page suivante">›</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Le choix des pages ────────────────────────────────────────────────────

/** Ce que le choix attache : pour chaque manuel touché, toutes ses pages au créneau — aucune, il en part. */
export interface PagesChoisies { manuel: Manuel; numeros: number[] }

export function ChoixDesPages({ manuels, prevu, manuelId, onClose, onAttacher }: {
  /** Mes manuels ; null pendant leur lecture. */
  manuels: Manuel[] | null;
  /** Le prévu du créneau à l'ouverture : les pages qu'il attache déjà sont prises d'avance. */
  prevu: string;
  /** Le manuel à ouvrir d'abord. */
  manuelId?: string;
  onClose: () => void;
  onAttacher: (choix: PagesChoisies[]) => void;
}) {
  const liste = React.useMemo(() => manuels ?? [], [manuels]);
  // Ce que le créneau a déjà, lu une fois les manuels là : partir de rien ferait perdre ses pages à « Attacher ».
  const [depart, setDepart] = React.useState<Record<string, number[]> | null>(null);
  const [selections, setSelections] = React.useState<Record<string, number[]>>({});
  const [choisi, setChoisi] = React.useState(manuelId ?? "");
  React.useEffect(() => {
    if (depart || !manuels) return;
    const deja = pagesAttachees(prevu, manuels);
    const lues = Object.fromEntries(deja.map((x) => [x.manuel.id, x.pages.map((p) => p.numero)]));
    setDepart(lues);
    setSelections(lues);
    // Le manuel demandé, sinon le premier du créneau ; un seul manuel s'ouvre tout de suite.
    setChoisi((c) => c || deja[0]?.manuel.id || (manuels.length === 1 ? manuels[0].id : ""));
  }, [depart, manuels, prevu]);
  const manuel = liste.find((m) => m.id === choisi) ?? null;
  const [derniere, setDerniere] = React.useState<number | null>(null);
  const ouvrir = (id: string) => { setChoisi(id); setDerniere(null); };

  const selection = manuel ? selections[manuel.id] ?? [] : [];
  const cliquer = (numero: number, plage: boolean) => {
    if (!manuel) return;
    const numeros = manuel.pages.map((p) => p.numero);
    setSelections((s) => ({ ...s, [manuel.id]: cliquerUnePage(s[manuel.id] ?? [], numero, numeros, derniere, plage) }));
    setDerniere(numero);
  };
  const avant = depart ?? {};
  const touches = liste.filter((m) => !memesPages(selections[m.id] ?? [], avant[m.id] ?? []));
  const ajoute = touches.some((m) => (selections[m.id] ?? []).some((n) => !(avant[m.id] ?? []).includes(n)));
  const attacher = () => {
    onAttacher(touches.map((m) => ({ manuel: m, numeros: selections[m.id] ?? [] })));
    onClose();
  };

  // La fenêtre prend la main : Échap la ferme, même ouverte depuis un menu.
  const boite = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { boite.current?.focus(); }, []);

  const plusieurs = liste.length > 1;
  return createPortal(
    <div className="overlay" style={{ zIndex: 150 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } }}>
      <div ref={boite} className="modal citer-competences choix-pages" role="dialog" aria-modal="true" aria-label="Des pages de mes manuels" tabIndex={-1}>
        <div className="modal-head">
          <h2>📖 Des pages de mes manuels</h2>
          <Aide titre="Choisir des pages">
            <p>Un clic prend une page, un autre la rend. Maj-clic prend toute la plage depuis la page cliquée avant.</p>
            <p>Les pages se voient sous le prévu du créneau, et s'impriment à la suite du cahier journal.</p>
          </Aide>
          <div className="spacer" />
          <button className="btn ghost sm" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <div className={plusieurs ? "choix-pages-corps avec-liste" : "choix-pages-corps"}>
          {plusieurs && (
            <div className="choix-pages-manuels" role="listbox" aria-label="Mes manuels">
              {liste.map((m) => {
                const siennes = selections[m.id] ?? [];
                return (
                  <button key={m.id} type="button" role="option" aria-selected={m.id === choisi}
                    className={`choix-pages-manuel${m.id === choisi ? " on" : ""}`} onClick={() => ouvrir(m.id)}>
                    <b>{m.titre}</b>
                    <span className="meta">{siennes.length ? `p. ${pagesEnTexte(siennes)}` : [m.niveau.trim(), `${m.pages.length} page${m.pages.length > 1 ? "s" : ""}`].filter(Boolean).join(" · ")}</span>
                  </button>
                );
              })}
            </div>
          )}
          {manuels === null || !depart ? <p className="meta choix-pages-vide">Lecture des manuels…</p>
            : !liste.length ? <p className="meta choix-pages-vide">Aucun manuel pour l'instant : ils s'importent dans Adapter une fiche › 📚 Manuels.</p>
            : !manuel ? <p className="meta choix-pages-vide">Choisissez un manuel.</p>
            : <GrilleDesPages key={manuel.id} manuel={manuel} selection={selection} onCliquer={cliquer} />}
        </div>

        <div className="modal-foot">
          <span className="choix-pages-resume">
            {manuel && selection.length ? `${selection.length} page${selection.length > 1 ? "s" : ""} · p. ${pagesEnTexte(selection)}` : ""}
          </span>
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn primary" disabled={!touches.length} onClick={attacher}>{!touches.length || ajoute ? "Attacher" : "Retirer"}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Les pages d'un manuel en vignettes, rendues quand elles paraissent ; un champ pour aller à une page. */
function GrilleDesPages({ manuel, selection, onCliquer }: {
  manuel: Manuel; selection: number[]; onCliquer: (numero: number, plage: boolean) => void;
}) {
  const { miniatureDe, demander, oublier } = useMiniatures(manuel);
  const grille = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const racine = grille.current;
    if (!racine || typeof IntersectionObserver === "undefined") return;
    const parId = new Map(manuel.pages.map((p) => [p.id, p]));
    const veille = new IntersectionObserver((entrees) => {
      for (const e of entrees) {
        const p = parId.get((e.target as HTMLElement).dataset.page ?? "");
        if (p) { if (e.isIntersecting) demander(p); else oublier(p); }
      }
    }, { root: racine, rootMargin: "300px 0px" });
    racine.querySelectorAll("[data-page]").forEach((el) => veille.observe(el));
    return () => veille.disconnect();
  }, [manuel.pages, demander, oublier]);
  // La première page prise se montre à l'ouverture : on reprend là où le créneau en était.
  React.useEffect(() => {
    const premiere = manuel.pages.find((p) => selection.includes(p.numero));
    if (premiere) grille.current?.querySelector(`[data-page="${premiere.id}"]`)?.scrollIntoView({ block: "center" });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const allerA = (saisi: string) => {
    const n = Number.parseInt(saisi.trim(), 10);
    if (!Number.isFinite(n) || !manuel.pages.length) return;
    const p = manuel.pages.find((x) => x.numero === n) ?? (n < manuel.pages[0].numero ? manuel.pages[0] : manuel.pages[manuel.pages.length - 1]);
    const el = grille.current?.querySelector<HTMLElement>(`[data-page="${p.id}"]`);
    el?.scrollIntoView({ block: "center" });
    el?.focus();
  };

  if (!manuel.pages.length) return <p className="meta choix-pages-vide">Ce manuel n'a pas encore de page.</p>;
  return (
    <div className="choix-pages-principal">
      <div className="choix-pages-outils">
        <b>{manuel.titre}</b>
        <span className="meta">{manuel.pages.length} page{manuel.pages.length > 1 ? "s" : ""}</span>
        <div className="spacer" />
        <input className="input choix-pages-aller" type="text" inputMode="numeric" placeholder="Page n°" aria-label="Aller à la page — Entrée pour y aller"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); allerA(e.currentTarget.value); } }} />
      </div>
      <div className="choix-pages-grille" ref={grille} role="listbox" aria-multiselectable="true" aria-label={`Les pages de ${manuel.titre}`}>
        {manuel.pages.map((p) => {
          const on = selection.includes(p.numero);
          const image = miniatureDe(p);
          return (
            <button key={p.id} type="button" role="option" aria-selected={on} data-page={p.id}
              className={`choix-page${on ? " on" : ""}`} onClick={(e) => onCliquer(p.numero, e.shiftKey)}
              title={`Page ${p.numero}`}>
              <span className="choix-page-image">{image && <img src={image} alt="" />}</span>
              <span className="choix-page-num">{p.numero}</span>
              {on && <span className="choix-page-coche" aria-hidden="true">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
