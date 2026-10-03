// Ce que l'ordinateur calcule en ce moment, pour le dire à l'écran.
//
// Une transcription sur place mobilise le processeur à plein quelques
// secondes, parfois quelques minutes : la machine chauffe, le ventilateur se
// lance. Sans un mot à l'écran, on croirait à une panne. Les appels lourds
// passent donc par `pendant`, et un indicateur les montre tant qu'ils durent.

/** Émis quand une tâche lourde commence ou finit. */
export const EVT_CALCUL = "maitrize:calcul";

let taches: string[] = [];

/** Ce qui tourne en ce moment, la plus récente en dernier. */
export const calculsEnCours = (): readonly string[] => taches;

const signaler = () => window.dispatchEvent(new Event(EVT_CALCUL));

/** Compte une tâche lourde le temps qu'elle dure ; `quoi` la nomme à l'écran : « d'une dictée du téléphone ». */
export function pendant<T>(tache: Promise<T>, quoi: string): Promise<T> {
  taches = [...taches, quoi];
  signaler();
  return tache.finally(() => {
    const i = taches.indexOf(quoi);
    taches = i < 0 ? taches : [...taches.slice(0, i), ...taches.slice(i + 1)];
    signaler();
  });
}
