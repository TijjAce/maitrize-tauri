import React from "react";
import { api } from "../api";
import { imageDeLaPage, ouvrirPdf, proportionPdf, rendrePageSelectionnable, textePage, type DocumentPdf } from "../pdfRendu";
import { correspond, nettoyerExtrait, normaliser } from "../competencesTravaillees";

// Lecteur d'un PDF du coffre-fort où l'on surligne à la souris le passage à
// citer, comme dans un lecteur PDF.
//
// L'ancienne citation affichait le PDF dans un cadre du système : impossible
// d'y lire la sélection, il fallait recopier le passage et sa page à la main.
// Ici pdf.js pose le texte de chaque page, transparent, sur son image : la
// sélection se lit directement, avec le numéro de la page où elle commence.
//
// Avec `onImage`, un second mode : on trace un cadre sur la page et l'on en
// prend l'image — l'exercice du manuel part alors dans le cahier journal, où
// il s'affiche et s'imprime.

const octetsDe = (b64: string) => {
  const bin = atob(b64);
  const o = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) o[i] = bin.charCodeAt(i);
  return o;
};

interface Resultat { page: number; extrait: string; nombre: number }

/** Un cadre tracé sur une page, en fractions de la page (0 à 1). */
export interface ZonePage { page: number; x: number; y: number; l: number; h: number }

export function LecteurPdfCitable({ nomFichier, onCiter, onImage }: {
  nomFichier: string;
  onCiter: (texte: string, page: number) => void;
  /** Quand elle est là, on peut aussi prendre l'image d'une page ou d'un cadre. */
  onImage?: (image: { base64: string; page: number }) => void | Promise<void>;
}) {
  const [doc, setDoc] = React.useState<DocumentPdf | null>(null);
  const [erreur, setErreur] = React.useState("");
  const [proportion, setProportion] = React.useState(1.414);
  const [largeur, setLargeur] = React.useState(0);
  const [selection, setSelection] = React.useState<{ texte: string; page: number } | null>(null);
  const [recherche, setRecherche] = React.useState("");
  const [cherchee, setCherchee] = React.useState("");
  const [resultats, setResultats] = React.useState<Resultat[] | null>(null);
  const [recherchant, setRecherchant] = React.useState(false);
  const [mode, setMode] = React.useState<"texte" | "image">("texte");
  const [cadre, setCadre] = React.useState<ZonePage | null>(null);
  const [prise, setPrise] = React.useState(false);
  const zone = React.useRef<HTMLDivElement>(null);
  const textes = React.useRef(new Map<number, string>());

  React.useEffect(() => {
    let annule = false;
    let ouvert: DocumentPdf | null = null;
    setDoc(null); setErreur(""); setResultats(null); setCherchee(""); textes.current.clear();
    api.fichierRead(nomFichier)
      .then((b64) => ouvrirPdf(octetsDe(b64)))
      .then(async (d) => {
        if (annule) { d.destroy(); return; }
        ouvert = d;
        setProportion(await proportionPdf(d));
        setDoc(d);
      })
      .catch((e) => { if (!annule) setErreur(String(e?.message ?? e)); });
    return () => { annule = true; ouvert?.destroy(); };
  }, [nomFichier]);

  // Pages à la largeur du panneau, par paliers : redessiner tout un programme
  // à chaque pixel de redimensionnement figerait l'écran.
  React.useLayoutEffect(() => {
    const el = zone.current;
    if (!el) return;
    const mesurer = () => setLargeur(Math.max(320, Math.min(900, Math.floor((el.clientWidth - 48) / 50) * 50)));
    mesurer();
    const obs = new ResizeObserver(mesurer);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  React.useEffect(() => {
    const lire = () => {
      const sel = window.getSelection();
      const el = zone.current;
      if (!sel || sel.isCollapsed || !el || !sel.anchorNode || !el.contains(sel.anchorNode)) { setSelection(null); return; }
      const noeud = sel.anchorNode instanceof Element ? sel.anchorNode : sel.anchorNode.parentElement;
      const page = Number(noeud?.closest<HTMLElement>("[data-page]")?.dataset.page ?? 0);
      const texte = nettoyerExtrait(sel.toString());
      setSelection(texte ? { texte, page } : null);
    };
    document.addEventListener("selectionchange", lire);
    return () => document.removeEventListener("selectionchange", lire);
  }, []);

  const citer = () => {
    if (!selection) return;
    onCiter(selection.texte, selection.page);
    window.getSelection()?.removeAllRanges();
    setSelection(null);
  };

  // ── Prendre l'image d'un cadre, ou d'une page entière ──
  const prendre = async (z: ZonePage) => {
    if (!doc || !onImage || prise) return;
    setPrise(true);
    try {
      const { base64 } = await imageDeLaPage(doc, z.page, z);
      await onImage({ base64, page: z.page });
      setCadre(null);
    } catch (e) {
      setErreur(String((e as Error)?.message ?? e));
    } finally {
      setPrise(false);
    }
  };

  const chercher = async () => {
    const q = recherche.trim();
    if (!doc || q.length < 2) { setResultats(null); setCherchee(""); return; }
    setRecherchant(true);
    const trouves: Resultat[] = [];
    const phrase = normaliser(q);
    for (let n = 1; n <= doc.numPages; n++) {
      let t = textes.current.get(n);
      if (t === undefined) {
        t = await textePage(doc, n).catch(() => "");
        textes.current.set(n, t);
      }
      const lignes = t.split("\n").filter((l) => correspond(l, q));
      if (lignes.length) trouves.push({ page: n, extrait: lignes[0].trim(), nombre: lignes.length });
      else if (normaliser(t).includes(phrase)) trouves.push({ page: n, extrait: q, nombre: 1 });
    }
    setResultats(trouves);
    setCherchee(q);
    setRecherchant(false);
  };

  const allerA = (page: number) =>
    zone.current?.querySelector(`[data-page="${page}"]`)?.scrollIntoView({ block: "start", behavior: "smooth" });

  return (
    <div className="lecteur-citable">
      <div className="lecteur-citable-barre">
        <input className="input" value={recherche} placeholder="Chercher dans le document (ex. : lire à voix haute)"
          onChange={(e) => setRecherche(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") chercher(); }}
          style={{ flex: "1 1 220px", minWidth: 0 }} aria-label="Chercher dans le document" />
        <button className="btn sm" onClick={chercher} disabled={!doc || recherchant || recherche.trim().length < 2}>
          {recherchant ? "Recherche…" : "🔍 Chercher"}
        </button>
        <div className="spacer" />
        {onImage && (
          <div className="seg" role="group" aria-label="Ce que l'on prend dans le document">
            <button className={mode === "texte" ? "active" : ""} onClick={() => { setMode("texte"); setCadre(null); }}>❝ Texte</button>
            <button className={mode === "image" ? "active" : ""}
              onClick={() => { setMode("image"); window.getSelection()?.removeAllRanges(); setSelection(null); }}>🖼 Image</button>
          </div>
        )}
        {mode === "image" ? (
          cadre
            ? <button className="btn primary sm" disabled={prise} onClick={() => { void prendre(cadre); }}>
                {prise ? "Découpe…" : `🖼 Prendre cette image (p. ${cadre.page})`}</button>
            : <span style={{ fontSize: 12, color: "var(--text-2)" }}>Tracez un cadre sur la page, ou prenez-la entière.</span>
        ) : selection
          ? <button className="btn primary sm" onMouseDown={(e) => e.preventDefault()} onClick={citer}
              title={selection.texte}>❝ Citer la sélection{selection.page ? ` (p. ${selection.page})` : ""}</button>
          : <span style={{ fontSize: 12, color: "var(--text-2)" }}>Surlignez à la souris le passage à citer.</span>}
      </div>

      {resultats && (
        <div className="lecteur-citable-resultats" role="list" aria-label="Résultats de la recherche">
          {resultats.length === 0
            ? <span style={{ color: "var(--text-2)" }}>« {cherchee} » ne figure pas dans le texte du document.</span>
            : resultats.map((r) => (
                <button key={r.page} role="listitem" className="lecteur-citable-resultat" onClick={() => allerA(r.page)}>
                  <b>p. {r.page}</b> {r.extrait.length > 140 ? r.extrait.slice(0, 140) + "…" : r.extrait}
                  {r.nombre > 1 && <span style={{ color: "var(--text-2)" }}> · {r.nombre} passages</span>}
                </button>
              ))}
        </div>
      )}

      <div ref={zone} className={`pdf-citable${mode === "image" ? " en-image" : ""}`}>
        {erreur && <div style={{ color: "#fff", padding: 20 }}>Lecture du PDF impossible : {erreur}</div>}
        {!erreur && !doc && <div style={{ color: "#fff", padding: 20 }}>Chargement du document…</div>}
        {doc && largeur > 0 && Array.from({ length: doc.numPages }, (_, i) => (
          <PageCitable key={`${i + 1}-${largeur}`} doc={doc} numero={i + 1} largeur={largeur}
            proportion={proportion} racine={zone} surligne={cherchee}
            image={mode === "image"} cadre={cadre?.page === i + 1 ? cadre : null} onCadre={setCadre}
            onPage={() => { void prendre({ page: i + 1, x: 0, y: 0, l: 1, h: 1 }); }} />
        ))}
      </div>
    </div>
  );
}

function PageCitable({ doc, numero, largeur, proportion, racine, surligne, image = false, cadre = null, onCadre, onPage }: {
  doc: DocumentPdf; numero: number; largeur: number; proportion: number;
  racine: React.RefObject<HTMLDivElement | null>; surligne: string;
  /** Mode image : on trace un cadre au lieu de surligner du texte. */
  image?: boolean;
  cadre?: ZonePage | null;
  onCadre?: (z: ZonePage | null) => void;
  onPage?: () => void;
}) {
  const boite = React.useRef<HTMLDivElement>(null);
  const toile = React.useRef<HTMLCanvasElement>(null);
  const calque = React.useRef<HTMLDivElement>(null);
  const [etat, setEtat] = React.useState<"attente" | "rendu" | "fait" | "erreur">("attente");
  const [hauteur, setHauteur] = React.useState(Math.round(largeur * proportion));
  const [sansTexte, setSansTexte] = React.useState(false);

  // Une page ne se dessine qu'à l'approche : un programme compte cent pages.
  React.useEffect(() => {
    const el = boite.current;
    if (!el) return;
    const obs = new IntersectionObserver((entrees) => {
      if (entrees.some((e) => e.isIntersecting)) { obs.disconnect(); setEtat((s) => (s === "attente" ? "rendu" : s)); }
    }, { root: racine.current, rootMargin: "900px 0px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [racine]);

  React.useEffect(() => {
    if (etat !== "rendu" || !toile.current || !calque.current) return;
    let annule = false;
    rendrePageSelectionnable(doc, numero, largeur, toile.current, calque.current)
      .then((r) => { if (annule) return; setHauteur(r.hauteur); setSansTexte(r.morceaux === 0); setEtat("fait"); })
      .catch(() => { if (!annule) setEtat("erreur"); });
    return () => { annule = true; };
  }, [etat, doc, numero, largeur]);

  React.useEffect(() => {
    if (etat !== "fait" || !calque.current) return;
    for (const span of calque.current.querySelectorAll("span")) {
      span.classList.toggle("pdf-trouve", !!surligne && !!span.textContent?.trim() && correspond(span.textContent ?? "", surligne));
    }
  }, [etat, surligne]);

  // Le cadre se trace à la souris, en fractions de la page : le zoom de
  // l'affichage ne change rien à ce qui sera découpé.
  const depart = React.useRef<{ x: number; y: number } | null>(null);
  const fractions = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };
  const borne = (v: number) => Math.min(Math.max(v, 0), 1);
  const tracer = (e: React.PointerEvent) => {
    if (!depart.current) return;
    const p = fractions(e);
    const x = borne(Math.min(depart.current.x, p.x)), y = borne(Math.min(depart.current.y, p.y));
    onCadre?.({ page: numero, x, y, l: borne(Math.max(depart.current.x, p.x)) - x, h: borne(Math.max(depart.current.y, p.y)) - y });
  };

  return (
    <div ref={boite} className="pdf-page" data-page={numero} style={{ width: largeur, height: hauteur }}>
      <canvas ref={toile} aria-label={`Page ${numero}`} />
      <div ref={calque} className="textLayer" />
      {image && (
        <div className="pdf-page-cadreur"
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            depart.current = fractions(e);
            onCadre?.({ page: numero, ...depart.current, l: 0, h: 0 });
          }}
          onPointerMove={(e) => { if (depart.current) tracer(e); }}
          onPointerUp={(e) => {
            if (!depart.current) return;
            tracer(e);
            depart.current = null;
            // Un simple clic n'est pas un cadre : il n'en reste rien.
            if (cadre && (cadre.l < 0.02 || cadre.h < 0.02)) onCadre?.(null);
          }}>
          {cadre && cadre.l > 0 && cadre.h > 0 && (
            <div className="pdf-page-zone" style={{
              left: `${cadre.x * 100}%`, top: `${cadre.y * 100}%`,
              width: `${cadre.l * 100}%`, height: `${cadre.h * 100}%`,
            }} />
          )}
          <button className="btn sm pdf-page-entiere" onPointerDown={(e) => e.stopPropagation()} onClick={onPage}>⬚ Toute la page</button>
        </div>
      )}
      <span className="pdf-page-num">{numero}</span>
      {etat === "erreur" && <div className="pdf-page-image">Cette page n’a pas pu être affichée.</div>}
      {sansTexte && (
        <div className="pdf-page-image">
          Page scannée : son texte ne se sélectionne pas. Cherchez la compétence dans « Programmes officiels », ou recopiez-la.
        </div>
      )}
    </div>
  );
}
