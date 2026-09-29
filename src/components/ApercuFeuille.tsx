import React from "react";
import { STYLE_FEUILLE } from "../cartesImprimables";
import { AtelierContext } from "./AtelierContext";
import { useConsigneAtelier } from "./ConsigneAtelier";
import { useConsignesEnPictos } from "./ConsigneEnPictos";
import { usePictosAtelier } from "./PictosAtelier";
import { useOptionsFeuille } from "./OptionsFeuille";
import { appliquerOptionsFeuille, contenuDeLaFeuille, feuillesPubliees } from "../optionsFeuille";
import { consigneParDefaut, consignesParDefaut, remplacerConsigne } from "../consigneAtelier";

// La feuille telle qu'elle s'imprimera : même HTML, même style que le
// document envoyé à l'imprimante — la consigne réécrite par l'enseignant et
// les pictos de ses verbes compris. Ce qu'on voit est ce qu'on aura.

export function ApercuFeuille({ html, style }: { html: string; style: string }) {
  const atelier = React.useContext(AtelierContext);
  const consigne = useConsigneAtelier(atelier);
  // L'éditeur du bandeau propose la consigne d'origine : c'est l'aperçu qui la connaît.
  React.useEffect(() => { consignesParDefaut.publier(atelier, consigneParDefaut(html)); }, [atelier, html]);
  // Les cases du bandeau ne proposent que ce que la feuille contient : c'est l'aperçu qui le sait.
  React.useEffect(() => { feuillesPubliees.publier(atelier, contenuDeLaFeuille(html)); }, [atelier, html]);
  const { options } = useOptionsFeuille(atelier);
  const remplace = React.useMemo(() => appliquerOptionsFeuille(remplacerConsigne(html, consigne), options), [html, consigne, options]);
  const { pictos: ajoutes } = usePictosAtelier(atelier);
  const pictos = useConsignesEnPictos(remplace, ajoutes);
  return (
    <div className="pb-apercu-page apercu-feuille">
      <style>{STYLE_FEUILLE + style + pictos.style}</style>
      <div dangerouslySetInnerHTML={{ __html: pictos.html }} />
    </div>
  );
}
