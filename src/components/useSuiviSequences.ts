import React from "react";
import { api, anneeScolaireActuelle, type Seance, type Sequence } from "../api";
import { useAsync } from "./ui";
import { isoJour } from "../dates";
import { bornesDeLAnnee, suivisDesSequences, type EtatSequence, type SuiviSequence } from "../suiviSequences";

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

// ── Ouvrir le plan de travail sur un état ──────────────────────────────────
//
// L'accueil ne liste pas les séquences en préparation : il y renvoie. La
// demande se garde ici le temps que le plan de travail la lise — tout de
// suite s'il est déjà ouvert, à son ouverture sinon —, sans compter sur un
// délai.

const EVT_ETAT_DU_PLAN = "maitrize:plan-etat";
let etatEnAttente: EtatSequence | null = null;

/** Demande au plan de travail de ne montrer que les séquences d'un état. */
export function demanderEtatDuPlan(etat: EtatSequence): void {
  etatEnAttente = etat;
  window.dispatchEvent(new Event(EVT_ETAT_DU_PLAN));
}

/** Le filtre d'état du plan de travail : celui qu'on choisit sur place, ou celui qu'on vient de lui demander. */
export function useEtatDuPlan(): [EtatSequence | "", (etat: EtatSequence | "") => void] {
  const [etat, setEtat] = React.useState<EtatSequence | "">(() => etatEnAttente ?? "");
  React.useEffect(() => {
    const prendre = () => {
      if (!etatEnAttente) return;
      setEtat(etatEnAttente);
      etatEnAttente = null;
    };
    prendre();
    window.addEventListener(EVT_ETAT_DU_PLAN, prendre);
    return () => window.removeEventListener(EVT_ETAT_DU_PLAN, prendre);
  }, []);
  return [etat, setEtat];
}
