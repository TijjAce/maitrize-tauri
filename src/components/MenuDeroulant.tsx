import React from "react";

/**
 * Un bouton qui s'ouvre sur ses choix — des `ctx-item` —, et se referme en
 * cliquant ailleurs ou par Échap. Il dit sur lui-même ce qui est actif. Le
 * bureau s'en sert (chercher, trier, partager), le prévu du cahier journal
 * aussi (écrire, ajouter).
 */
export function MenuDeroulant({ libelle, actif = false, titre, petit = false, cote = "droite", children }: {
  libelle: React.ReactNode; actif?: boolean; titre: string;
  /** Un petit bouton discret, dans une barre d'outils. */
  petit?: boolean;
  /** Le côté où le menu s'aligne sous son bouton. */
  cote?: "droite" | "gauche";
  children: (fermer: () => void) => React.ReactNode;
}) {
  const [ouvert, setOuvert] = React.useState(false);
  const ancre = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!ouvert) return;
    const ailleurs = (e: MouseEvent) => { if (!ancre.current?.contains(e.target as Node)) setOuvert(false); };
    const echap = (e: KeyboardEvent) => { if (e.key === "Escape") setOuvert(false); };
    document.addEventListener("mousedown", ailleurs);
    document.addEventListener("keydown", echap);
    return () => { document.removeEventListener("mousedown", ailleurs); document.removeEventListener("keydown", echap); };
  }, [ouvert]);
  const classes = ["btn", petit ? "sm" : "", actif ? "primary" : petit ? "ghost" : ""].filter(Boolean).join(" ");
  return (
    <div className="menu-bureau-ancre" ref={ancre}>
      <button type="button" className={classes} aria-haspopup="dialog" aria-expanded={ouvert} onClick={() => setOuvert(!ouvert)}>
        {libelle} <span aria-hidden="true">▾</span>
      </button>
      {ouvert && (
        <div className={`menu-bureau${cote === "gauche" ? " a-gauche" : ""}${petit ? " menu-petit" : ""}`} role="dialog" aria-label={titre}>
          {children(() => setOuvert(false))}
        </div>
      )}
    </div>
  );
}
