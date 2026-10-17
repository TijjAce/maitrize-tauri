import React from "react";
import { miniatureDeLaPhoto, octetsDuPdfDuManuel } from "../exercicesDesManuels";
import type { Manuel, PageManuel } from "../manuels";
import { miniaturesDuPdf, type RenduDeMiniatures } from "../pdfRendu";

// ── Les pages d'un manuel, en bande de miniatures ─────────────────────────
//
// À la place d'une grille de numéros qui prenait l'écran (demande de
// l'enseignant, octobre 2026) : une seule ligne de pages qu'on voit, au-dessus
// de la page ouverte, et qui défile. Les miniatures se rendent quand elles
// paraissent, une à la fois ; la page choisie reste au milieu de la bande.

/** Les miniatures déjà rendues, gardées le temps de la visite : un manuel rouvert les retrouve. */
const MINIATURES = new Map<string, string>();
const MAX_MINIATURES = 800;
const cleDe = (m: Manuel, p: PageManuel) => `${m.id}:${p.fichier || `pdf-${p.numero}`}`;

/** Les miniatures d'un manuel, rendues à la demande, une à la fois. */
function useMiniatures(manuel: Manuel) {
  const [, redessiner] = React.useState(0);
  const manuelCourant = React.useRef(manuel);
  manuelCourant.current = manuel;
  const file = React.useRef<PageManuel[]>([]);
  const enCours = React.useRef(false);
  const pdf = React.useRef<RenduDeMiniatures | null>(null);
  // Le PDF ouvert pour les miniatures se ferme avec le manuel.
  React.useEffect(() => () => {
    pdf.current?.fermer();
    pdf.current = null;
    file.current = [];
  }, [manuel.id]);
  const traiter = React.useCallback(async () => {
    if (enCours.current) return;
    enCours.current = true;
    try {
      while (file.current.length) {
        const m = manuelCourant.current;
        const p = file.current.shift()!;
        const cle = cleDe(m, p);
        if (MINIATURES.has(cle)) continue;
        try {
          let url: string;
          if (p.fichier) url = await miniatureDeLaPhoto(p.fichier);
          else {
            pdf.current ??= await miniaturesDuPdf(await octetsDuPdfDuManuel(m));
            url = await pdf.current.miniature(p.numero);
          }
          MINIATURES.set(cle, url);
          while (MINIATURES.size > MAX_MINIATURES) MINIATURES.delete(MINIATURES.keys().next().value as string);
          redessiner((n) => n + 1);
        } catch { /* une page qui ne se rend pas garde son numéro seul */ }
      }
    } finally {
      enCours.current = false;
    }
  }, []);
  const demander = React.useCallback((p: PageManuel) => {
    if (MINIATURES.has(cleDe(manuelCourant.current, p)) || file.current.includes(p)) return;
    file.current.push(p);
    void traiter();
  }, [traiter]);
  return { miniatureDe: (p: PageManuel) => MINIATURES.get(cleDe(manuel, p)), demander };
}

export function BandeDesPages({ manuel, pageId, onChoisir }: { manuel: Manuel; pageId: string; onChoisir: (pageId: string) => void }) {
  const { miniatureDe, demander } = useMiniatures(manuel);
  const bande = React.useRef<HTMLDivElement>(null);
  // Une miniature se rend quand elle paraît dans la bande, ou s'en approche.
  React.useEffect(() => {
    const racine = bande.current;
    if (!racine || typeof IntersectionObserver === "undefined") return;
    const parId = new Map(manuel.pages.map((p) => [p.id, p]));
    const veille = new IntersectionObserver((entrees) => {
      for (const e of entrees) {
        const p = e.isIntersecting ? parId.get((e.target as HTMLElement).dataset.page ?? "") : undefined;
        if (p) demander(p);
      }
    }, { root: racine, rootMargin: "0px 600px" });
    racine.querySelectorAll("[data-page]").forEach((el) => veille.observe(el));
    return () => veille.disconnect();
  }, [manuel.pages, demander]);
  // La page choisie vient au milieu de la bande — la bande seule défile, pas la fenêtre : en douceur vers une page voisine,
  // d'un coup pour un saut, qui ne ferait sinon défiler que des pages qu'on ne cherche pas.
  React.useEffect(() => {
    const racine = bande.current;
    const choisie = racine?.querySelector<HTMLElement>(".man-vignette.on");
    if (!racine || !choisie) return;
    const gauche = choisie.offsetLeft - racine.clientWidth / 2 + choisie.offsetWidth / 2;
    racine.scrollTo({ left: gauche, behavior: Math.abs(gauche - racine.scrollLeft) > racine.clientWidth ? "auto" : "smooth" });
  }, [pageId]);
  return (
    <div className="man-bande" ref={bande} role="listbox" aria-label="Les pages du manuel">
      {manuel.pages.map((p) => {
        const image = miniatureDe(p);
        const n = p.exercices.length;
        return (
          <button key={p.id} type="button" role="option" aria-selected={p.id === pageId} data-page={p.id}
            className={`man-vignette${p.id === pageId ? " on" : ""}`} onClick={() => onChoisir(p.id)}
            title={`Page ${p.numero} — ${n ? `${n} exercice${n > 1 ? "s" : ""} encadré${n > 1 ? "s" : ""}` : "aucun exercice encadré"}`}>
            <span className="man-vignette-image">{image && <img src={image} alt="" />}</span>
            <span className="man-vignette-num">{p.numero}</span>
            {n > 0 && <span className="man-vignette-ex" aria-hidden="true">{n}</span>}
          </button>
        );
      })}
    </div>
  );
}
