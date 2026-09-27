import { STYLE_FEUILLE } from "../cartesImprimables";

// La feuille telle qu'elle s'imprimera : même HTML, même style que le
// document envoyé à l'imprimante. Ce qu'on voit est ce qu'on aura.

export function ApercuFeuille({ html, style }: { html: string; style: string }) {
  return (
    <div className="pb-apercu-page apercu-feuille">
      <style>{STYLE_FEUILLE + style}</style>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
