import React from "react";
import { api } from "../api";
import { toast } from "./Toaster";
import { EVT_MASQUES, basculerMasque, cleMasques, ecrireMasques, masquesDesReglages } from "../journalMasques";

// Ce qu'on cite sans l'imprimer, côté écran : les masques de tous les
// créneaux, et la case qui les pose.

/** Les masques, créneau par créneau, tenus à jour d'où qu'ils changent. */
export function useMasquesDuJournal(): { masques: Record<string, string[]>; basculer: (creneauId: string, cle: string) => void } {
  const [masques, setMasques] = React.useState<Record<string, string[]>>({});
  const lire = React.useCallback(() => {
    api.settingsAll().then((r) => setMasques(masquesDesReglages(r))).catch(() => {});
  }, []);
  React.useEffect(() => {
    lire();
    window.addEventListener(EVT_MASQUES, lire);
    return () => window.removeEventListener(EVT_MASQUES, lire);
  }, [lire]);
  const courant = React.useRef(masques);
  courant.current = masques;
  const basculer = React.useCallback((creneauId: string, cle: string) => {
    const suite = basculerMasque(courant.current[creneauId] ?? [], cle);
    setMasques((m) => ({ ...m, [creneauId]: suite }));
    api.settingSet(cleMasques(creneauId), ecrireMasques(suite))
      .then(() => window.dispatchEvent(new Event(EVT_MASQUES)))
      .catch((e) => toast("Choix non enregistré : " + String(e), { icone: "⚠️" }));
  }, []);
  return { masques, basculer };
}

/** La petite case d'un bloc cité : cochée, le bloc reste à l'écran et ne s'imprime pas. */
export function CaseImpression({ masque, onChange }: { masque: boolean; onChange: () => void }) {
  return (
    <label className="case-impression" title="Coché : ce bloc reste sous les yeux à l'écran, mais ne s'imprime pas dans le cahier journal">
      <input type="checkbox" checked={masque} onChange={onChange} />
      <span>ne pas imprimer</span>
    </label>
  );
}
