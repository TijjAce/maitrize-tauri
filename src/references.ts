// Les références d'une feuille : le programme, le livret, le guide, la page
// d'où vient ce qu'elle fait faire.
//
// Elles ne s'impriment pas : l'élève n'en a que faire, et la feuille
// s'allège d'autant. Dans l'application, elles restent à portée de main :
// un « ? » à l'endroit où elles étaient, qui les montre au survol — pour la
// préparation, une visite, un remplaçant qui se demande d'où vient l'exercice.
//
// Une référence s'écrit dans la feuille avec `reference(texte)`. Rien ne
// s'importe ici : l'impression (`print`) et la consigne réécrite
// (`consigneAtelier`) s'en servent, et ce module ne doit dépendre d'aucun
// des deux.

export const CLASSE_REFERENCE = "reference";

const echapper = (s: string) => (s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/** Une référence à poser dans la feuille, en texte : « Livret Français CP, Éduscol 2025 ». */
export const reference = (texte: string) => `<span class="${CLASSE_REFERENCE}">${echapper(texte.trim())}</span>`;

/** Toutes les références d'un morceau de feuille, telles qu'elles y sont écrites. Elles ne contiennent que du texte. */
const REFERENCES = /<span class="reference">[^<]*<\/span>/g;

/** Les références d'un morceau de HTML, pour les reposer ailleurs. */
export const referencesDe = (html: string): string[] => html.match(REFERENCES) ?? [];

/** Le HTML sans ses références : ce que la feuille imprime. */
export const sansReferences = (html: string) => html.replace(REFERENCES, "").replace(/ +(<\/(div|p|li)>)/g, "$1");

/** Le texte d'une référence, ses entités gardées : il va tel quel dans un attribut. */
const texteDe = (span: string) => span.replace(/<[^>]*>/g, "").trim().replace(/"/g, "&quot;");

/**
 * La feuille telle que l'application la montre : chaque référence devient un
 * « ? » qui la dit au survol, ou au clavier. Le texte est dans un attribut,
 * pas dans la page : les pictos des consignes ne le décorent pas, et la
 * consigne qu'on réécrit ne le reprend pas.
 */
export const referencesEnAide = (html: string) => html.replace(REFERENCES, (span) => {
  const t = texteDe(span);
  return `<span class="reference-aide" tabindex="0" role="note" aria-label="Référence : ${t}" data-reference="${t}"></span>`;
});

/** Le « ? », dans l'aperçu seulement ; sa bulle s'ouvre au-dessus de la page (voir `ApercuFeuille`). */
export const STYLE_REFERENCES = `
  .reference-aide { display: inline-flex; align-items: center; justify-content: center; vertical-align: 1px;
    width: 15px; height: 15px; margin-left: 4px; border-radius: 50%; background: #e7eaf3; color: #46506a; cursor: help;
    font: 700 10.5px/1 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-style: normal; text-transform: none; }
  .reference-aide::before { content: "?"; }
  .reference-aide:hover, .reference-aide:focus { background: #2c5f9e; color: #fff; outline: none; }
`;
