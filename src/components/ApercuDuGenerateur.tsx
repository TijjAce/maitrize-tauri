import React from "react";
import { STYLE_FEUILLE } from "../cartesImprimables";
import { STYLE_GENERATEURS_PERSO, htmlGenerateurPerso, imagesDeLaRecette, type GenerateurPerso } from "../generateursPerso";
import { usePictoImages } from "./ChoixPicto";

/**
 * La petite feuille d'un générateur fait avec l'IA, sur sa carte de Fabriquer. Aucune photo n'existe d'avance : on la
 * fabrique ici, en réduction, toujours au même tirage, et dans une ombre pour que son style n'atteigne pas le reste de l'écran.
 */
export function ApercuDuGenerateur({ g }: { g: GenerateurPerso }) {
  const images = usePictoImages(imagesDeLaRecette(g));
  const html = React.useMemo(() => htmlGenerateurPerso(g, 1, images), [g, images]);
  const hote = React.useRef<HTMLSpanElement>(null);
  React.useEffect(() => {
    const h = hote.current;
    if (h) (h.shadowRoot ?? h.attachShadow({ mode: "open" })).innerHTML = `<style>${STYLE_FEUILLE}${STYLE_GENERATEURS_PERSO}</style>${html}`;
  }, [html]);
  return <span className="atelier-apercu atelier-apercu-vif" aria-hidden="true"><span ref={hote} className="atelier-apercu-page" /></span>;
}
