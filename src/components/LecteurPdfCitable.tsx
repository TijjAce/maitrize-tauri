import React from "react";
import { api } from "../api";
import { ouvrirPdf, proportionPdf, rendrePageSelectionnable, textePage, type DocumentPdf } from "../pdfRendu";
import { correspond, nettoyerExtrait, normaliser } from "../competencesTravaillees";

// Lecteur d'un PDF du coffre-fort où l'on surligne à la souris le passage à
// citer, comme dans un lecteur PDF.
//
// L'ancienne citation affichait le PDF dans un cadre du système : impossible
// d'y lire la sélection, il fallait recopier le passage et sa page à la main.
// Ici pdf.js pose le texte de chaque page, transparent, sur son image : la
// sélection se lit directement, avec le numéro de la page où elle commence.

const octetsDe = (b64: string) => {
  const bin = atob(b64);
  const o = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) o[i] = bin.charCodeAt(i);
  return o;
};

interface Resultat { page: number; extrait: string; nombre: number }

export function LecteurPdfCitable({ nomFichier, onCiter }: {
  nomFichier: string;
  onCiter: (texte: string, page: number) => void;
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
        {selection
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

      <div ref={zone} className="pdf-citable">
        {erreur && <div style={{ color: "#fff", padding: 20 }}>Lecture du PDF impossible : {erreur}</div>}
        {!erreur && !doc && <div style={{ color: "#fff", padding: 20 }}>Chargement du document…</div>}
        {doc && largeur > 0 && Array.from({ length: doc.numPages }, (_, i) => (
          <PageCitable key={`${i + 1}-${largeur}`} doc={doc} numero={i + 1} largeur={largeur}
            proportion={proportion} racine={zone} surligne={cherchee} />
        ))}
      </div>
    </div>
  );
}

function PageCitable({ doc, numero, largeur, proportion, racine, surligne }: {
  doc: DocumentPdf; numero: number; largeur: number; proportion: number;
  racine: React.RefObject<HTMLDivElement | null>; surligne: string;
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

  return (
    <div ref={boite} className="pdf-page" data-page={numero} style={{ width: largeur, height: hauteur }}>
      <canvas ref={toile} aria-label={`Page ${numero}`} />
      <div ref={calque} className="textLayer" />
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
