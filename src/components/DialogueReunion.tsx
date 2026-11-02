import React from "react";
import { lireLeDialogue } from "../dialogueReunion";

// La réunion comme une conversation (voir dialogueReunion.ts) : une bulle par
// tour de parole, le nom de la personne au-dessus, d'une couleur à elle. Un
// clic sur le nom le change. Pendant l'écoute, la conversation suit le bas,
// tant qu'on n'est pas remonté la relire ; les mots qui viennent d'être dits
// attendent, en gris, sous la dernière bulle, que leur personne soit reconnue.

export function DialogueReunion({ dialogue, enCours, onRenommer, enAttente = "" }: {
  dialogue: string;
  enCours: boolean;
  onRenommer: (nom: string) => void;
  /** Les mots écrits à l'instant, pas encore dans la bulle de leur personne. */
  enAttente?: string;
}) {
  const tours = lireLeDialogue(dialogue);
  const voix = [...new Set(tours.map((t) => t.nom).filter(Boolean))];
  const boite = React.useRef<HTMLDivElement>(null);
  const enBas = React.useRef(true);
  React.useEffect(() => {
    const b = boite.current;
    if (b && enCours && enBas.current) b.scrollTop = b.scrollHeight;
  }, [dialogue, enAttente, enCours]);
  return (
    <div className="dialogue" ref={boite} aria-live="polite"
      onScroll={(e) => { const b = e.currentTarget; enBas.current = b.scrollHeight - b.scrollTop - b.clientHeight < 60; }}>
      {!tours.length && !enAttente && <p className="dialogue-vide">{enCours ? "Ce qui se dit s'écrira ici, au fil de la parole." : "Rien n'a été dit."}</p>}
      {tours.map((t, i) => {
        const k = voix.indexOf(t.nom);
        return (
          <div key={i} className={`dialogue-tour${k >= 0 ? ` voix-${k % 8}` : ""}`}>
            {t.nom && (
              <button type="button" className="dialogue-nom" onClick={() => onRenommer(t.nom)} title={`Renommer « ${t.nom} »`}>{t.nom}</button>
            )}
            <div className="dialogue-bulle">{t.texte}</div>
          </div>
        );
      })}
      {enAttente && (
        <div className="dialogue-tour en-attente" aria-label="En train d'être dit">
          <span className="dialogue-nom">…</span>
          <div className="dialogue-bulle">{enAttente}</div>
        </div>
      )}
    </div>
  );
}
