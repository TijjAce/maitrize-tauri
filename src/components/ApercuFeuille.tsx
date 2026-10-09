import React from "react";
import { createPortal } from "react-dom";
import { STYLE_FEUILLE } from "../cartesImprimables";
import { AtelierContext } from "./AtelierContext";
import { useConsigneAtelier } from "./ConsigneAtelier";
import { useConsignesEnPictos } from "./ConsigneEnPictos";
import { usePictosAtelier } from "./PictosAtelier";
import { useOptionsFeuille } from "./OptionsFeuille";
import { appliquerOptionsFeuille, contenuDeLaFeuille, feuillesPubliees } from "../optionsFeuille";
import { consigneParDefaut, consignesParDefaut, remplacerConsigne } from "../consigneAtelier";
import { STYLE_REFERENCES, referencesEnAide } from "../references";

// La feuille telle qu'elle s'imprimera : même HTML, même style que le
// document envoyé à l'imprimante — la consigne réécrite par l'enseignant et
// les pictos de ses verbes compris. Ce qu'on voit est ce qu'on aura, à un
// détail près : les références, qui ne s'impriment pas, sont ici derrière
// un « ? » (voir `references`).

export function ApercuFeuille({ html, style }: { html: string; style: string }) {
  const atelier = React.useContext(AtelierContext);
  const consigne = useConsigneAtelier(atelier);
  // L'éditeur du bandeau propose la consigne d'origine : c'est l'aperçu qui la connaît.
  React.useEffect(() => { consignesParDefaut.publier(atelier, consigneParDefaut(html)); }, [atelier, html]);
  // Les cases du bandeau ne proposent que ce que la feuille contient : c'est l'aperçu qui le sait.
  React.useEffect(() => { feuillesPubliees.publier(atelier, contenuDeLaFeuille(html)); }, [atelier, html]);
  const { options } = useOptionsFeuille(atelier);
  const remplace = React.useMemo(() => referencesEnAide(appliquerOptionsFeuille(remplacerConsigne(html, consigne), options)), [html, consigne, options]);
  const { pictos: ajoutes } = usePictosAtelier(atelier);
  const pictos = useConsignesEnPictos(remplace, ajoutes);
  const { bulle, montrer, cacher } = useBulleDeReference();
  return (
    <div className="pb-apercu-page apercu-feuille" onMouseOver={montrer} onFocus={montrer} onMouseOut={cacher} onBlur={cacher} onClick={montrer}>
      <style>{STYLE_FEUILLE + style + pictos.style + STYLE_REFERENCES}</style>
      <div dangerouslySetInnerHTML={{ __html: pictos.html }} />
      {bulle && createPortal(
        <div role="tooltip" style={{
          position: "fixed", left: bulle.x, top: bulle.y, transform: bulle.dessous ? undefined : "translateY(-100%)", zIndex: 1000,
          width: "max-content", maxWidth: LARGEUR_BULLE, padding: "7px 10px", borderRadius: 8, background: "#1c2233", color: "#fff",
          fontSize: 12, lineHeight: 1.45, boxShadow: "0 4px 14px rgba(0,0,0,.2)", pointerEvents: "none",
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px", opacity: 0.7, display: "block" }}>Référence · ne s'imprime pas</span>
          {bulle.texte}
        </div>, document.body)}
    </div>
  );
}

const LARGEUR_BULLE = 320;

/**
 * La bulle d'une référence : posée au-dessus de la page, près de son « ? »,
 * et toujours entière dans la fenêtre — une bulle dessinée dans l'aperçu se
 * coupait à son bord. Elle s'ouvre au survol, au clavier ou d'un clic, et se
 * ferme dès qu'on fait défiler.
 */
function useBulleDeReference() {
  const [bulle, setBulle] = React.useState<{ texte: string; x: number; y: number; dessous: boolean } | null>(null);
  const montrer = React.useCallback((e: React.SyntheticEvent) => {
    const cible = (e.target as HTMLElement).closest?.(".reference-aide") as HTMLElement | null;
    if (!cible) return;
    const r = cible.getBoundingClientRect();
    const x = Math.max(8, Math.min(window.innerWidth - LARGEUR_BULLE - 8, r.right - LARGEUR_BULLE + 14));
    const dessous = r.bottom + 140 < window.innerHeight;
    setBulle({ texte: cible.dataset.reference ?? "", x, y: dessous ? r.bottom + 6 : r.top - 6, dessous });
  }, []);
  const cacher = React.useCallback((e: React.SyntheticEvent) => {
    if ((e.target as HTMLElement).closest?.(".reference-aide")) setBulle(null);
  }, []);
  React.useEffect(() => {
    if (!bulle) return;
    const fermer = () => setBulle(null);
    window.addEventListener("scroll", fermer, true);
    return () => window.removeEventListener("scroll", fermer, true);
  }, [bulle]);
  return { bulle, montrer, cacher };
}
