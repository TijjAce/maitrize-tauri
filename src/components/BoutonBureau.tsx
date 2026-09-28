import React from "react";
import { toast } from "./Toaster";
import { texteErreur } from "../api";

// « Sur le bureau » : à côté d'« Imprimer », la même feuille en PDF, déposée
// sur le plan de travail — pour la retrouver, la mettre dans une séance, la
// partager. Le bouton dit ce qu'il fait pendant qu'il le fait, et ce qui
// s'est passé après.

export function BoutonBureau({ onEnregistrer, disabled, className = "btn sm" }: {
  onEnregistrer: () => Promise<{ titre: string }>;
  disabled?: boolean;
  className?: string;
}) {
  const [occupe, setOccupe] = React.useState(false);
  const agir = async () => {
    setOccupe(true);
    try {
      const m = await onEnregistrer();
      toast(`« ${m.titre} » est sur le bureau, dans le plan de travail.`, { icone: "🗂", duree: 5000 });
    } catch (e) {
      toast("Pas enregistré : " + texteErreur(e), { icone: "⚠️", duree: 7000 });
    } finally {
      setOccupe(false);
    }
  };
  return (
    <button type="button" className={className} disabled={disabled || occupe} onClick={agir}
      title="Enregistrer la feuille en PDF sur le plan de travail">
      {occupe ? "⏳ Enregistrement…" : "🗂 Sur le bureau"}
    </button>
  );
}
