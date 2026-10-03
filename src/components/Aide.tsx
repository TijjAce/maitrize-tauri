import React from "react";

// Un « ? » qui ouvre l'explication, à côté de ce qu'elle explique.
//
// Un réglage se lit en un coup d'œil ; ce qui le justifie — où part l'audio,
// ce que vaut chaque modèle — ne sert qu'à qui se pose la question. On le
// range derrière ce bouton plutôt que de l'étaler sous le réglage.

export function Aide({ titre, children }: { titre: string; children: React.ReactNode }) {
  const [ouvert, setOuvert] = React.useState(false);
  const ancre = React.useRef<HTMLSpanElement>(null);

  // Se referme en cliquant ailleurs, ou par Échap.
  React.useEffect(() => {
    if (!ouvert) return;
    const ailleurs = (e: MouseEvent) => { if (!ancre.current?.contains(e.target as Node)) setOuvert(false); };
    const echap = (e: KeyboardEvent) => { if (e.key === "Escape") setOuvert(false); };
    document.addEventListener("mousedown", ailleurs);
    document.addEventListener("keydown", echap);
    return () => { document.removeEventListener("mousedown", ailleurs); document.removeEventListener("keydown", echap); };
  }, [ouvert]);

  return (
    <span className="aide-ancre" ref={ancre}>
      <button type="button" className="aide-bouton" aria-expanded={ouvert} aria-label={`En savoir plus : ${titre}`}
        title="En savoir plus" onClick={() => setOuvert(!ouvert)}>?</button>
      {ouvert && <div className="aide-bulle" role="dialog" aria-label={titre}>{children}</div>}
    </span>
  );
}
