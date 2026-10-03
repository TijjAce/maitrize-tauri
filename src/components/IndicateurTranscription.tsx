import React from "react";
import { calculsEnCours, EVT_CALCUL } from "../calculEnCours";

// Une transcription en cours, en bas de l'écran, où que l'on soit.
//
// L'ordinateur transcrit une dictée arrivée du téléphone pendant qu'on fait
// autre chose : le processeur tourne à plein, la machine chauffe et souffle.
// On le dit, pour que personne ne s'en inquiète.

export function IndicateurTranscription() {
  const [taches, setTaches] = React.useState(calculsEnCours());
  React.useEffect(() => {
    const suivre = () => setTaches(calculsEnCours());
    window.addEventListener(EVT_CALCUL, suivre);
    return () => window.removeEventListener(EVT_CALCUL, suivre);
  }, []);
  if (!taches.length) return null;
  const quoi = taches[taches.length - 1];
  return (
    <div className="indicateur-calcul" role="status" aria-live="polite">
      <span className="indicateur-calcul-pastille" aria-hidden="true" />
      <div>
        <b>🎙 Transcription {quoi}…</b>
        <div className="indicateur-calcul-sous">L'ordinateur travaille fort quelques instants : il peut chauffer ou ventiler, c'est normal.</div>
      </div>
    </div>
  );
}
