import React from "react";
import { api, texteErreur } from "../api";
import { toast } from "./Toaster";
import { ouvrirPdf, proportionPdf, rendrePageSelectionnable, textePage, type DocumentPdf } from "../pdfRendu";
import { aplatir, morceauxCouverts, occurrences, type TexteAplati } from "../rechercheDansPdf";

// Visionneuse d'un PDF du coffre-fort, avec ⌘F.
//
// Le document s'affichait dans un cadre du système : rapide, mais muet —
// pas de recherche, et un guide de cent pages se parcourt alors à la molette.
// pdf.js dessine ici chaque page et pose son texte dessus, ce qui permet de
// chercher, de surligner, et d'aller d'une trouvaille à la suivante.
//
// Les pages ne se dessinent qu'à l'approche : ouvrir un programme entier
// d'un coup figerait la fenêtre.

/** Lit un fichier (base64) et renvoie une URL blob pour l'affichage PDF. */
export async function fichierToBlobUrl(nomFichier: string, mime = "application/pdf"): Promise<string> {
  const b64 = await api.fichierRead(nomFichier);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

const octetsDe = (b64: string) => {
  const bin = atob(b64);
  const o = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) o[i] = bin.charCodeAt(i);
  return o;
};

/** Une trouvaille dans le document : sa page, et son rang dans cette page. */
interface Trouvaille { page: number; rang: number }

export function PdfViewer({ nomFichier, titre, onClose }: { nomFichier: string; titre: string; onClose: () => void }) {
  const [doc, setDoc] = React.useState<DocumentPdf | null>(null);
  const [erreur, setErreur] = React.useState("");
  const [proportion, setProportion] = React.useState(1.414);
  const [largeur, setLargeur] = React.useState(0);
  const [barre, setBarre] = React.useState(false);
  const [recherche, setRecherche] = React.useState("");
  const [trouvailles, setTrouvailles] = React.useState<Trouvaille[]>([]);
  const [courante, setCourante] = React.useState(0);
  const [cherchant, setCherchant] = React.useState(false);
  const zone = React.useRef<HTMLDivElement>(null);
  const champ = React.useRef<HTMLInputElement>(null);
  const textes = React.useRef(new Map<number, string>());

  React.useEffect(() => {
    let annule = false;
    let ouvert: DocumentPdf | null = null;
    setDoc(null); setErreur(""); textes.current.clear();
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

  // Pages à la largeur du panneau, par paliers : redessiner tout un guide à
  // chaque pixel de redimensionnement figerait l'écran.
  React.useLayoutEffect(() => {
    const el = zone.current;
    if (!el) return;
    const mesurer = () => setLargeur(Math.max(320, Math.min(1100, Math.floor((el.clientWidth - 56) / 50) * 50)));
    mesurer();
    const obs = new ResizeObserver(mesurer);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ⌘F ouvre la barre et sélectionne ce qui s'y trouve, comme partout ailleurs.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setBarre(true);
        setTimeout(() => { champ.current?.focus(); champ.current?.select(); }, 0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /** Le texte d'une page, lu une fois puis gardé. */
  const texteDe = React.useCallback(async (d: DocumentPdf, n: number) => {
    const garde = textes.current.get(n);
    if (garde !== undefined) return garde;
    const t = aplatir([await textePage(d, n).catch(() => "")]).texte;
    textes.current.set(n, t);
    return t;
  }, []);

  // La recherche parcourt tout le document, page par page, après une pause :
  // on tape « vocabulaire » lettre à lettre, pas onze fois le document.
  React.useEffect(() => {
    const q = recherche.trim();
    if (!doc || q.length < 2) { setTrouvailles([]); setCourante(0); setCherchant(false); return; }
    let annule = false;
    setCherchant(true);
    const t = setTimeout(async () => {
      const toutes: Trouvaille[] = [];
      for (let n = 1; n <= doc.numPages && !annule; n++) {
        const texte = await texteDe(doc, n);
        occurrences(texte, q).forEach((_, rang) => toutes.push({ page: n, rang }));
      }
      if (annule) return;
      setTrouvailles(toutes);
      setCourante(0);
      setCherchant(false);
    }, 250);
    return () => { annule = true; clearTimeout(t); };
  }, [recherche, doc, texteDe]);

  const allerA = React.useCallback((i: number) => {
    const t = trouvailles[i];
    if (!t) return;
    const page = zone.current?.querySelector<HTMLElement>(`[data-page="${t.page}"]`);
    page?.scrollIntoView({ block: "start", behavior: "smooth" });
    // La page n'est peut-être pas encore dessinée : le surlignage la
    // rattrapera, mais on vise déjà le bon passage quand il est là.
    setTimeout(() => page?.querySelector(".pdf-trouve-actif")?.scrollIntoView({ block: "center", behavior: "smooth" }), 400);
  }, [trouvailles]);

  const bouger = (pas: number) => {
    if (!trouvailles.length) return;
    const i = (courante + pas + trouvailles.length) % trouvailles.length;
    setCourante(i);
    allerA(i);
  };

  // La première trouvaille se montre d'elle-même : sans cela, on cherche un
  // mot et rien ne bouge à l'écran.
  React.useEffect(() => { if (trouvailles.length) allerA(0); }, [trouvailles, allerA]);

  const fermerLaBarre = () => { setBarre(false); setRecherche(""); setTrouvailles([]); };

  // « Imprimer » confie le fichier au système : c'est là qu'on choisit
  // l'imprimante, ou « Enregistrer en PDF ».
  const imprimer = async () => {
    try { await api.imprimerPdf(nomFichier); }
    catch (e) { toast("Impression impossible : " + texteErreur(e), { icone: "⚠️" }); }
  };

  const active = trouvailles[courante];

  return (
    <div className="overlay" style={{ zIndex: 160 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: "92vw", width: 1020, height: "90vh", display: "flex", flexDirection: "column" }}>
        <div className="modal-head"><h2>{titre}</h2><div className="spacer" />
          <button className="btn sm" onClick={() => { setBarre(true); setTimeout(() => champ.current?.focus(), 0); }}
            title="Chercher dans le document (⌘F)">🔍 Chercher</button>
          <button className="btn sm" onClick={imprimer} disabled={!doc}>🖨 Imprimer</button>
          <button className="btn ghost sm" onClick={onClose} aria-label="Fermer">✕</button></div>

        {barre && (
          <div className="pdf-chercher">
            <input ref={champ} className="input" value={recherche} aria-label="Chercher dans le document"
              placeholder="Chercher dans le document…"
              onChange={(e) => setRecherche(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); bouger(e.shiftKey ? -1 : 1); }
                // La touche ne doit fermer que la barre, pas le document.
                if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); fermerLaBarre(); }
              }} />
            <span className="meta" style={{ fontSize: 12, minWidth: 92, textAlign: "right" }}>
              {cherchant ? "…"
                : recherche.trim().length < 2 ? ""
                : trouvailles.length ? `${courante + 1} sur ${trouvailles.length}`
                : "aucun résultat"}
            </span>
            <button className="btn ghost sm" onClick={() => bouger(-1)} disabled={!trouvailles.length} aria-label="Trouvaille précédente">↑</button>
            <button className="btn ghost sm" onClick={() => bouger(1)} disabled={!trouvailles.length} aria-label="Trouvaille suivante">↓</button>
            <button className="btn ghost sm" onClick={fermerLaBarre} aria-label="Fermer la recherche">✕</button>
          </div>
        )}

        <div ref={zone} className="pdf-citable">
          {erreur && <div style={{ color: "#fff", padding: 20 }}>Lecture du PDF impossible : {erreur}</div>}
          {!erreur && !doc && <div style={{ color: "#fff", padding: 20 }}>Chargement du document…</div>}
          {doc && largeur > 0 && Array.from({ length: doc.numPages }, (_, i) => (
            <PagePdf key={`${i + 1}-${largeur}`} doc={doc} numero={i + 1} largeur={largeur} proportion={proportion}
              racine={zone} recherche={trouvailles.length ? recherche.trim() : ""}
              rangActif={active?.page === i + 1 ? active.rang : -1} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Une page dessinée, son texte posé dessus, et les trouvailles surlignées.
 *
 * Le surlignage ne colore pas des caractères mais les morceaux qui les
 * portent : pdf.js pose le texte par blocs, et c'est le bloc entier qui se
 * signale — comme dans un lecteur PDF.
 */
function PagePdf({ doc, numero, largeur, proportion, racine, recherche, rangActif }: {
  doc: DocumentPdf; numero: number; largeur: number; proportion: number;
  racine: React.RefObject<HTMLDivElement | null>; recherche: string; rangActif: number;
}) {
  const boite = React.useRef<HTMLDivElement>(null);
  const toile = React.useRef<HTMLCanvasElement>(null);
  const calque = React.useRef<HTMLDivElement>(null);
  const [etat, setEtat] = React.useState<"attente" | "rendu" | "fait" | "erreur">("attente");
  const [hauteur, setHauteur] = React.useState(Math.round(largeur * proportion));

  // Une page ne se dessine qu'à l'approche : un guide compte cent pages.
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
      .then((r) => { if (!annule) { setHauteur(r.hauteur); setEtat("fait"); } })
      .catch(() => { if (!annule) setEtat("erreur"); });
    return () => { annule = true; };
  }, [etat, doc, numero, largeur]);

  React.useEffect(() => {
    const el = calque.current;
    if (etat !== "fait" || !el) return;
    const spans = [...el.querySelectorAll("span")];
    for (const s of spans) s.classList.remove("pdf-trouve", "pdf-trouve-actif");
    if (!recherche) return;
    const plat: TexteAplati = aplatir(spans.map((s) => s.textContent ?? ""));
    occurrences(plat.texte, recherche).forEach((o, rang) => {
      for (const i of morceauxCouverts(o, plat.origine)) {
        spans[i]?.classList.add("pdf-trouve");
        if (rang === rangActif) spans[i]?.classList.add("pdf-trouve-actif");
      }
    });
  }, [etat, recherche, rangActif]);

  return (
    <div ref={boite} className="pdf-page" data-page={numero} style={{ width: largeur, height: hauteur }}>
      <canvas ref={toile} aria-label={`Page ${numero}`} />
      <div ref={calque} className="textLayer" />
      <span className="pdf-page-num">{numero}</span>
      {etat === "erreur" && <div className="pdf-page-image">Cette page n’a pas pu être affichée.</div>}
    </div>
  );
}
