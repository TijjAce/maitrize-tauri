import React from "react";
import { createPortal } from "react-dom";
import { texteErreur } from "../api";
import { toast } from "./Toaster";
import { BoutonBureau } from "./BoutonBureau";
import { printHTML } from "../print";
import {
  AIRS_TABLEAU, STYLE_DOCUMENT_IA, feuilleDuDocument, nettoyerMiseEnPage, titreDuDocument, type DensiteDocument,
} from "../documentIa";
import { enregistrerEnPdf, enregistrerEnWord } from "../exportsDocument";

// ── Retoucher une réponse avant de l'imprimer ou de l'exporter ─────────────
//
// La feuille s'affiche comme elle s'imprimera, et se corrige à même la
// page : on efface un passage, on reformule une ligne, on aère le tableau
// où se trouve le curseur ou on le resserre, on choisit la taille du texte.
// ⌘Z défait. Ce qu'on garde reste avec la réponse dans la conversation, et
// c'est cette version qui s'imprime, part en PDF ou en Word.

const DENSITES: { id: DensiteDocument; nom: string }[] = [
  { id: "aere", nom: "Aéré" }, { id: "normal", nom: "Normal" }, { id: "serre", nom: "Serré" }, { id: "dense", nom: "Dense" },
];

/** Le degré d'aération d'un tableau, dans AIRS_TABLEAU. */
const niveauDAir = (t: HTMLTableElement) => {
  const i = AIRS_TABLEAU.findIndex((a) => a && t.classList.contains(a));
  return i >= 0 ? i : AIRS_TABLEAU.indexOf("");
};

export function MiseEnPageReponse({ markdown, mise, onFermer, onGarder, onBureau }: {
  markdown: string;
  /** La version déjà retouchée, s'il y en a une. */
  mise?: string;
  onFermer: () => void;
  /** Garde la version retouchée avec la réponse ; null : on revient à la réponse telle que l'IA l'a écrite. */
  onGarder: (html: string | null) => void;
  /** Dépose la feuille sur le bureau, en PDF. */
  onBureau: (titre: string, corps: string) => Promise<{ id: string; titre: string }>;
}) {
  const page = React.useRef<HTMLDivElement>(null);
  const [tableau, setTableau] = React.useState<HTMLTableElement | null>(null);
  const [air, setAir] = React.useState(AIRS_TABLEAU.indexOf(""));
  const [densite, setDensite] = React.useState<DensiteDocument>("normal");
  const [occupe, setOccupe] = React.useState("");
  const titre = titreDuDocument(markdown);
  const origine = React.useMemo(() => feuilleDuDocument(markdown).corps, [markdown]);

  const racine = () => page.current?.querySelector<HTMLElement>(".doc-ia") ?? null;
  const charger = (html: string) => {
    if (!page.current) return;
    page.current.innerHTML = nettoyerMiseEnPage(html);
    const r = racine();
    if (!r) return;
    r.contentEditable = "true";
    r.spellcheck = true;
    setDensite(DENSITES.find((d) => r.classList.contains(`doc-${d.id}`))?.id ?? "normal");
    setTableau(null);
  };
  React.useLayoutEffect(() => { charger(mise ?? origine); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Le tableau où se trouve le curseur : c'est lui qu'on aère, qu'on resserre ou qu'on retire.
  React.useEffect(() => {
    const suivre = () => {
      const n = window.getSelection()?.anchorNode ?? null;
      const el = n instanceof Element ? n : n?.parentElement ?? null;
      const t = el?.closest("table") as HTMLTableElement | null;
      const dedans = t && page.current?.contains(t) ? t : null;
      setTableau(dedans);
      if (dedans) setAir(niveauDAir(dedans));
    };
    document.addEventListener("selectionchange", suivre);
    return () => document.removeEventListener("selectionchange", suivre);
  }, []);

  /** La feuille telle qu'elle est maintenant, prête à garder ou à exporter. */
  const html = () => { const r = racine(); return r ? nettoyerMiseEnPage(r.outerHTML) : origine; };
  const garderSansFermer = () => { const h = html(); onGarder(h === origine ? null : h); return h; };

  const changerDensite = (d: DensiteDocument) => {
    const r = racine();
    if (!r) return;
    DENSITES.forEach((x) => r.classList.remove(`doc-${x.id}`));
    r.classList.add(`doc-${d}`);
    setDensite(d);
  };
  const changerAir = (pas: number) => {
    if (!tableau) return;
    const j = Math.max(0, Math.min(AIRS_TABLEAU.length - 1, niveauDAir(tableau) + pas));
    AIRS_TABLEAU.forEach((a) => a && tableau.classList.remove(a));
    if (AIRS_TABLEAU[j]) tableau.classList.add(AIRS_TABLEAU[j]);
    setAir(j);
  };
  const retirerTableau = () => {
    if (!tableau) return;
    // Retiré comme une sélection qu'on efface : ⌘Z le fait revenir.
    const plage = document.createRange();
    plage.selectNode(tableau);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(plage);
    document.execCommand("delete");
    setTableau(null);
  };
  // Le collage arrive en texte seul : la feuille garde sa mise en forme, et rien d'étranger n'y entre.
  const surCollage = (e: React.ClipboardEvent) => {
    e.preventDefault();
    document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
  };

  const exporter = async (quoi: "pdf" | "word") => {
    const corps = garderSansFermer();
    setOccupe(quoi === "pdf" ? "Le PDF se fabrique…" : "Le document Word s'écrit…");
    try {
      const ok = quoi === "pdf" ? await enregistrerEnPdf(titre, corps, STYLE_DOCUMENT_IA) : await enregistrerEnWord(titre, corps);
      if (ok) toast(quoi === "pdf" ? `« ${titre} » est enregistré en PDF.` : `« ${titre} » est enregistré en Word : il s'ouvre dans Word, Pages ou LibreOffice.`, { icone: quoi === "pdf" ? "📄" : "📝" });
    } catch (e) {
      toast("Non enregistré : " + texteErreur(e), { icone: "⚠️", duree: 8000 });
    } finally { setOccupe(""); }
  };

  return createPortal(
    // Échap ou un clic à côté gardent les retouches, comme on referme un traitement de texte : rien ne se perd par mégarde.
    <div className="overlay" style={{ zIndex: 120 }} onMouseDown={(e) => { if (e.target === e.currentTarget) { garderSansFermer(); onFermer(); } }}
      onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); garderSansFermer(); onFermer(); } }}>
      <div className="modal editeur-plein" role="dialog" aria-modal="true" aria-label="Retoucher et exporter la réponse">
        <div className="modal-head" style={{ gap: 8, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: 17 }}>✏️ Retoucher et exporter</h2>
          <div className="spacer" />
          <button className="btn sm" onClick={() => printHTML(titre, garderSansFermer(), STYLE_DOCUMENT_IA)}>🖨 Imprimer</button>
          <button className="btn sm" disabled={!!occupe} onClick={() => { void exporter("pdf"); }}>📄 PDF…</button>
          <button className="btn sm" disabled={!!occupe} onClick={() => { void exporter("word"); }}
            title="Un document Word (.docx), à retoucher dans Word, Pages ou LibreOffice">📝 Word…</button>
          <BoutonBureau onEnregistrer={() => onBureau(titre, garderSansFermer())} />
        </div>
        <div className="mep-barre">
          <span className="meta">Taille du texte</span>
          <div className="seg" role="group" aria-label="Taille du texte">
            {DENSITES.map((d) => (
              <button key={d.id} type="button" className={densite === d.id ? "active" : ""}
                onMouseDown={(e) => e.preventDefault()} onClick={() => changerDensite(d.id)}>{d.nom}</button>
            ))}
          </div>
          <span className="mep-separateur" />
          <span className="meta">{tableau ? "Ce tableau" : "Cliquez dans un tableau pour le régler"}</span>
          <button type="button" className="btn sm" disabled={!tableau || air <= 0} onMouseDown={(e) => e.preventDefault()}
            onClick={() => changerAir(-1)}>− Resserrer</button>
          <button type="button" className="btn sm" disabled={!tableau || air >= AIRS_TABLEAU.length - 1} onMouseDown={(e) => e.preventDefault()}
            onClick={() => changerAir(1)}>＋ Aérer</button>
          <button type="button" className="btn ghost sm" disabled={!tableau} onMouseDown={(e) => e.preventDefault()}
            onClick={retirerTableau}>🗑 Retirer le tableau</button>
          {occupe && <span className="meta">⏳ {occupe}</span>}
        </div>
        <div className="editeur-plein-corps mep-fond">
          <style>{STYLE_DOCUMENT_IA}</style>
          <div ref={page} className="mep-page" onPaste={surCollage} />
          <p className="meta mep-aide">
            Écrivez, effacez, déplacez à même la feuille : sélectionnez un passage et effacez-le, ⌘Z le fait revenir.
          </p>
        </div>
        <div className="modal-foot">
          <button className="btn ghost sm" onClick={() => charger(origine)} title="La réponse telle que l'IA l'a écrite ; « Annuler » garde la version d'avant">↺ Réponse d'origine</button>
          <div className="spacer" />
          <button className="btn" onClick={onFermer} title="Ferme sans garder les retouches faites depuis l'ouverture">Annuler</button>
          <button className="btn primary" onClick={() => { garderSansFermer(); onFermer(); }}>✓ Garder et fermer</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
