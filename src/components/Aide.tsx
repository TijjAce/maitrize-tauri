import React from "react";

// Un « ? » qui ouvre l'explication, à côté de ce qu'elle explique.
//
// Un réglage se lit en un coup d'œil ; ce qui le justifie — où part l'audio,
// ce que vaut chaque modèle, d'où vient une situation — ne sert qu'à qui se
// pose la question. On le range derrière ce bouton plutôt que de l'étaler
// sous le réglage. La bulle paraît au survol, le temps qu'on la lise ; un
// clic la garde ouverte, un clic ailleurs ou Échap la referme.

export function Aide({ titre, children, vers = "gauche" }: {
  titre: string; children: React.ReactNode;
  /** De quel côté s'ouvre la bulle : vers la gauche (près d'un bord droit), ou vers la droite (près d'un bord gauche). */
  vers?: "gauche" | "droite";
}) {
  const [survol, setSurvol] = React.useState(false);
  const [epinglee, setEpinglee] = React.useState(false);
  const ouvert = survol || epinglee;
  const ancre = React.useRef<HTMLSpanElement>(null);
  const minuteur = React.useRef<number | undefined>(undefined);

  // Un peu d'attente avant d'ouvrir, un peu avant de fermer : passer dessus ne l'ouvre pas, et l'on a le temps d'aller lire la bulle.
  const survoler = (oui: boolean) => {
    window.clearTimeout(minuteur.current);
    minuteur.current = window.setTimeout(() => setSurvol(oui), oui ? 150 : 250);
  };
  React.useEffect(() => () => window.clearTimeout(minuteur.current), []);

  // Se referme en cliquant ailleurs, ou par Échap.
  React.useEffect(() => {
    if (!ouvert) return;
    const fermer = () => { window.clearTimeout(minuteur.current); setSurvol(false); setEpinglee(false); };
    const ailleurs = (e: MouseEvent) => { if (!ancre.current?.contains(e.target as Node)) fermer(); };
    const echap = (e: KeyboardEvent) => { if (e.key === "Escape") fermer(); };
    document.addEventListener("mousedown", ailleurs);
    document.addEventListener("keydown", echap);
    return () => { document.removeEventListener("mousedown", ailleurs); document.removeEventListener("keydown", echap); };
  }, [ouvert]);

  return (
    <span className="aide-ancre" ref={ancre} onMouseEnter={() => survoler(true)} onMouseLeave={() => survoler(false)}>
      <button type="button" className="aide-bouton" aria-expanded={ouvert} aria-label={`En savoir plus : ${titre}`}
        onClick={() => setEpinglee(!epinglee)} onFocus={() => setSurvol(true)} onBlur={() => setSurvol(false)}>?</button>
      {ouvert && <div className={`aide-bulle${vers === "droite" ? " vers-droite" : ""}`} role="dialog" aria-label={titre}>{children}</div>}
    </span>
  );
}
