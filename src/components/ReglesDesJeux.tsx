import React from "react";
import { api, Jeu } from "../api";
import { useAsync } from "./ui";
import { JeuForm } from "./JeuForm";
import { infosDuJeu, jeuxCites } from "../jeuxCites";

// ── Règles des jeux cités ──────────────────────────────────────────────────
//
// Sous un prévu ou un déroulement, la règle de chaque jeu de la ludothèque
// qui y est nommé : on l'a sous les yeux au moment de lancer la partie.

/** La ludothèque, relue quand elle change sur l'autre ordinateur. */
export function useLudotheque() {
  const { data, reload } = useAsync(() => api.jeuxList(), []);
  return { jeux: data ?? [], recharger: reload };
}

/**
 * Les jeux cités dans des textes qui changent à chaque frappe : seul le texte
 * modifié est relu.
 */
export function useJeuxCites(jeux: Jeu[]): (texte: string) => Jeu[] {
  const cache = React.useMemo(() => new Map<string, Jeu[]>(), [jeux]);
  return React.useCallback((texte: string) => {
    let cites = cache.get(texte);
    if (!cites) {
      if (cache.size > 200) cache.clear();
      cites = jeuxCites(texte, jeux);
      cache.set(texte, cites);
    }
    return cites;
  }, [cache, jeux]);
}

/** Les jeux repliés, gardés pendant la séance de travail : replié ici, replié partout. */
const replies = new Set<string>();

function RegleDuJeu({ jeu, onModifier }: { jeu: Jeu; onModifier: () => void }) {
  const [replie, setReplie] = React.useState(() => replies.has(jeu.id));
  const [entiere, setEntiere] = React.useState(false);
  const regle = jeu.regles.trim();
  const longue = regle.split("\n").length > 4 || regle.length > 320;
  const basculer = () => {
    const suite = !replie;
    setReplie(suite);
    if (suite) replies.add(jeu.id); else replies.delete(jeu.id);
  };
  return (
    <div className="regle-app">
      <div className="regle-app-tete">
        <button className="regle-app-titre" onClick={basculer} aria-expanded={!replie}
          title={replie ? "Afficher la règle" : "Replier la règle"}>
          <span aria-hidden="true" className="regle-app-fleche">{replie ? "▸" : "▾"}</span> 🎲 {jeu.titre}
        </button>
        <span className="regle-app-infos">{infosDuJeu(jeu)}</span>
        <button className="btn ghost sm" onClick={onModifier} title="Modifier le jeu et sa règle dans la ludothèque"
          aria-label={`Modifier la règle de ${jeu.titre}`}>✏️</button>
      </div>
      {!replie && (regle ? (
        <>
          <div className={`regle-app-texte${longue && !entiere ? " coupee" : ""}`}>{regle}</div>
          {longue && (
            <button className="lien regle-app-suite" onClick={() => setEntiere(!entiere)}>
              {entiere ? "Réduire" : "Lire toute la règle"}
            </button>
          )}
        </>
      ) : (
        <div className="regle-app-vide">
          Pas encore de règle dans la ludothèque.{" "}
          <button className="lien" onClick={onModifier}>L'écrire, ou la chercher en ligne</button>
        </div>
      ))}
    </div>
  );
}

/** Les règles des jeux donnés ; rien s'il n'y en a pas. */
export function ReglesDesJeux({ jeux, onModifier }: { jeux: Jeu[]; onModifier: (j: Jeu) => void }) {
  if (!jeux.length) return null;
  return (
    <div className="regles-app" aria-label="Règles des jeux cités">
      {jeux.map((j) => <RegleDuJeu key={j.id} jeu={j} onModifier={() => onModifier(j)} />)}
    </div>
  );
}

/** Les règles des jeux cités dans un texte, avec de quoi les modifier sur place. */
export function ReglesCitees({ texte, jeux, onJeuModifie }: { texte: string; jeux: Jeu[]; onJeuModifie: () => void }) {
  const cites = React.useMemo(() => jeuxCites(texte, jeux), [texte, jeux]);
  const [edite, setEdite] = React.useState<Jeu | null>(null);
  return (
    <>
      <ReglesDesJeux jeux={cites} onModifier={setEdite} />
      {edite && (
        <JeuForm j={edite} onClose={() => setEdite(null)}
          onSaved={() => { setEdite(null); onJeuModifie(); }} />
      )}
    </>
  );
}
