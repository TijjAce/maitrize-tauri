import React from "react";
import { api, anneeScolaireActuelle, type Seance, type Sequence } from "../api";
import { useAsync } from "./ui";
import { isoJour } from "../dates";
import { bornesDeLAnnee, suivisDesSequences, type SuiviSequence } from "../suiviSequences";

// Le suivi de toutes les séquences, à l'écran : les séquences, leurs séances
// et les créneaux de l'année, relus quand ils changent — y compris depuis
// l'autre ordinateur —, et l'état de chacune qui en découle.

export function useSuiviSequences(): {
  suivis: Map<string, SuiviSequence>;
  sequences: Sequence[];
  seances: Seance[];
  aujourdHui: string;
  chargement: boolean;
  recharger: () => void;
} {
  const [debut, fin] = bornesDeLAnnee(anneeScolaireActuelle());
  const { data: sequences, reload: r1 } = useAsync(() => api.sequencesList(), []);
  const { data: seances, reload: r2 } = useAsync(() => api.seancesList(), []);
  const { data: creneaux, reload: r3 } = useAsync(() => api.creneauxList(debut, fin), [debut, fin]);
  const aujourdHui = isoJour(new Date());
  const suivis = React.useMemo(
    () => suivisDesSequences(sequences ?? [], seances ?? [], creneaux ?? [], aujourdHui),
    [sequences, seances, creneaux, aujourdHui],
  );
  const recharger = React.useCallback(() => { r1(); r2(); r3(); }, [r1, r2, r3]);
  return { suivis, sequences: sequences ?? [], seances: seances ?? [], aujourdHui, chargement: !sequences || !seances || !creneaux, recharger };
}
