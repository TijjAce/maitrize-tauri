import React from "react";

// Un « ? » qui ouvre l'explication, à côté de ce qu'elle explique.
//
// Un réglage se lit en un coup d'œil ; ce qui le justifie — où part l'audio,
// ce que vaut chaque modèle, d'où vient une situation — ne sert qu'à qui se
// pose la question. On le range derrière ce bouton plutôt que de l'étaler
// sous le réglage. La bulle paraît au survol, le temps qu'on la lise ; un
// clic la garde ouverte, un clic ailleurs ou Échap la referme.

/** La bande où une bulle reste lisible : la fenêtre, réduite au premier conteneur qui défile ou coupe ce qui dépasse. */
function bandeVisible(depuis: HTMLElement): { gauche: number; droite: number } {
  let gauche = 0;
  let droite = window.innerWidth;
  for (let el = depuis.parentElement; el && el !== document.body; el = el.parentElement) {
    const { overflowX, overflowY } = getComputedStyle(el);
    if (overflowX === "visible" && overflowY === "visible") continue;
    const r = el.getBoundingClientRect();
    gauche = Math.max(gauche, r.left);
    droite = Math.min(droite, r.right);
    break;
  }
  return { gauche, droite };
}

export function Aide({ titre, children, vers = "gauche" }: {
  titre: string; children: React.ReactNode;
  /** De quel côté s'ouvre la bulle : vers la gauche (près d'un bord droit), ou vers la droite (près d'un bord gauche). */
  vers?: "gauche" | "droite";
}) {
  const [survol, setSurvol] = React.useState(false);
  const [epinglee, setEpinglee] = React.useState(false);
  const ouvert = survol || epinglee;
  const ancre = React.useRef<HTMLSpanElement>(null);
  const bulle = React.useRef<HTMLDivElement>(null);
  const minuteur = React.useRef<number | undefined>(undefined);

  // Un peu d'attente avant d'ouvrir, un peu avant de fermer : passer dessus ne l'ouvre pas, et l'on a le temps d'aller lire la bulle.
  const survoler = (oui: boolean) => {
    window.clearTimeout(minuteur.current);
    minuteur.current = window.setTimeout(() => setSurvol(oui), oui ? 150 : 250);
  };
  React.useEffect(() => () => window.clearTimeout(minuteur.current), []);

  // La bulle se décale pour rester entière, plutôt que d'être coupée au bord de la page.
  React.useLayoutEffect(() => {
    const b = bulle.current;
    if (!ouvert || !b) return;
    b.style.transform = "";
    const r = b.getBoundingClientRect();
    const { gauche, droite } = bandeVisible(b);
    const marge = 8;
    const decalage = r.left < gauche + marge ? gauche + marge - r.left
      : r.right > droite - marge ? Math.max(gauche + marge - r.left, droite - marge - r.right)
      : 0;
    if (decalage) b.style.transform = `translateX(${Math.round(decalage)}px)`;
  }, [ouvert]);

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
      {ouvert && <div ref={bulle} className={`aide-bulle${vers === "droite" ? " vers-droite" : ""}`} role="dialog" aria-label={titre}>{children}</div>}
    </span>
  );
}

/**
 * Un libellé « nom — explication » : le nom reste à sa place, l'explication
 * passe derrière un « ? ». Un libellé sans tiret reste tel quel.
 */
export function LibelleAvecAide({ libelle }: { libelle: string }) {
  const i = libelle.indexOf(" — ");
  if (i < 0) return <>{libelle}</>;
  const nom = libelle.slice(0, i).trim();
  const quoi = libelle.slice(i + 3).trim();
  return <>{nom} <Aide titre={nom} vers="droite"><p>{quoi.charAt(0).toUpperCase() + quoi.slice(1)}</p></Aide></>;
}

/** Une explication sur sa propre ligne : quelques mots, et le reste au survol du « ? ». */
export function AideEnLigne({ libelle, titre, children }: { libelle: React.ReactNode; titre?: string; children: React.ReactNode }) {
  return (
    <div className="aide-ligne">
      <span>{libelle}</span>
      <Aide titre={titre ?? (typeof libelle === "string" ? libelle : "En savoir plus")} vers="droite">{children}</Aide>
    </div>
  );
}
