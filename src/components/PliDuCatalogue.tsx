import React from "react";

/** L'icône et le nom d'une famille : « 🗣 Langage ». */
export const iconeEtNom = (libelle: string): [string, string] => {
  const i = libelle.indexOf(" ");
  return i > 0 ? [libelle.slice(0, i), libelle.slice(i + 1)] : ["", libelle];
};

/**
 * Une famille, un moment de la séquence ou un domaine du programme, qui se
 * plie : le catalogue est long, on referme ce qu'on n'ouvre jamais. Pliée,
 * c'est une carte — son icône, son nom, ce qu'elle fait sur une ligne,
 * combien d'ateliers elle garde.
 */
export function PliDuCatalogue({ ouvert, onBasculer, icone, titre, aide, nombre, compte, children }: {
  ouvert: boolean; onBasculer: (ouvert: boolean) => void; icone: string; titre: string; aide: string; nombre: number;
  /** Ce que la pastille dit, quand ce ne sont pas des ateliers qu'on compte. */
  compte?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="pli-catalogue" open={ouvert}
      onToggle={(e) => { const o = e.currentTarget.open; if (o !== ouvert) onBasculer(o); }}>
      <summary title={ouvert ? undefined : aide}>
        <span className="pli-icone" aria-hidden="true">{icone}</span>
        <span className="pli-texte">
          <b className="pli-titre">{titre}</b>
          <span className="pli-aide">{aide}</span>
        </span>
        <span className="pli-nombre">{compte ?? `${nombre} atelier${nombre > 1 ? "s" : ""}`}</span>
        <span className="pli-chevron" aria-hidden="true">›</span>
      </summary>
      {children}
    </details>
  );
}

/**
 * Une partie d'une famille — un domaine du programme —, qui se plie aussi, plus discrète : une ligne sous la
 * carte de sa famille, son nom aligné sur celui de la famille, son nombre d'ateliers et sa flèche à la même
 * place que ceux de la carte.
 */
export function SousPliDuCatalogue({ ouvert, onBasculer, titre, nombre, children }: {
  ouvert: boolean; onBasculer: (ouvert: boolean) => void; titre: string; nombre: number; children: React.ReactNode;
}) {
  return (
    <details className="sous-pli-catalogue" open={ouvert}
      onToggle={(e) => { const o = e.currentTarget.open; if (o !== ouvert) onBasculer(o); }}>
      <summary>
        <b>{titre}</b>
        <span className="pli-nombre">{`${nombre} atelier${nombre > 1 ? "s" : ""}`}</span>
        <span className="pli-chevron" aria-hidden="true">›</span>
      </summary>
      {children}
    </details>
  );
}
