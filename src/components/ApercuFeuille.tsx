import React from "react";
import { STYLE_FEUILLE } from "../cartesImprimables";
import { AtelierContext } from "./AtelierContext";
import { useConsigneAtelier } from "./ConsigneAtelier";
import { useConsignesEnPictos } from "./ConsigneEnPictos";
import { usePictosAtelier } from "./PictosAtelier";
import { consigneParDefaut, consignesParDefaut, remplacerConsigne } from "../consigneAtelier";

// La feuille telle qu'elle s'imprimera : même HTML, même style que le
// document envoyé à l'imprimante — la consigne réécrite par l'enseignant et
// les pictos de ses verbes compris. Ce qu'on voit est ce qu'on aura.

export function ApercuFeuille({ html, style }: { html: string; style: string }) {
  const atelier = React.useContext(AtelierContext);
  const consigne = useConsigneAtelier(atelier);
  // L'éditeur du bandeau propose la consigne d'origine : c'est l'aperçu qui la connaît.
  React.useEffect(() => { consignesParDefaut.publier(atelier, consigneParDefaut(html)); }, [atelier, html]);
  const remplace = React.useMemo(() => remplacerConsigne(html, consigne), [html, consigne]);
  const { pictos: ajoutes } = usePictosAtelier(atelier);
  const pictos = useConsignesEnPictos(remplace, ajoutes);
  return (
    <div className="pb-apercu-page apercu-feuille">
      <style>{STYLE_FEUILLE + style + pictos.style}</style>
      <div dangerouslySetInnerHTML={{ __html: pictos.html }} />
    </div>
  );
}
