// Le dossier dessiné du bureau et des onglets rangés comme lui.

/** Couleur d'un dossier sans couleur choisie : le bleu doux d'un dossier ordinaire. */
export const COULEUR_DOSSIER = "#6fa8e6";

/** Assombrit une couleur #rrggbb, pour l'onglet du dossier. */
export function assombrir(hex: string, part: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (d: number) => Math.round(((n >> d) & 255) * (1 - part)).toString(16).padStart(2, "0");
  return `#${f(16)}${f(8)}${f(0)}`;
}

/** Un dossier dessiné, pour pouvoir le teinter — un émoji ne se colore pas. */
export function IconeDossier({ couleur, ouvert }: { couleur: string; ouvert: boolean }) {
  const onglet = assombrir(couleur, 0.16);
  return (
    <svg viewBox="0 0 64 52" width="76" height="62" aria-hidden="true" style={{ display: "block", margin: "0 auto" }}>
      <path d="M3 9a5 5 0 0 1 5-5h15.2a5 5 0 0 1 3.9 1.9L30 10h26a5 5 0 0 1 5 5v5H3z" fill={onglet} />
      <path d={ouvert ? "M1 22a4 4 0 0 1 4-4h56a3 3 0 0 1 3 3.6l-3.6 24A5 5 0 0 1 55.5 50h-47a5 5 0 0 1-4.9-4.3z"
        : "M3 19a4 4 0 0 1 4-4h50a4 4 0 0 1 4 4v26a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5z"} fill={couleur} />
      <path d="M3 19a4 4 0 0 1 4-4h50a4 4 0 0 1 4 4v2H3z" fill="#fff" opacity={ouvert ? 0 : 0.22} />
    </svg>
  );
}
