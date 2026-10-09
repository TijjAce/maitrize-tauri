import React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "./Toaster";
import { texteErreur } from "../api";
import { EVT_CHERCHER_BUREAU } from "../bureauAteliers";
import { AtelierContext } from "./AtelierContext";
import { useModification } from "../modifierFeuille";

// « Sur le bureau » : à côté d'« Imprimer », la même feuille en PDF, déposée
// sur le plan de travail — pour la retrouver, la mettre dans une séance, la
// partager. Le bouton dit ce qu'il fait pendant qu'il le fait, et ce qui
// s'est passé après. Quand on refait une feuille de cet atelier (voir
// `modifierFeuille`), il la remplace : la nouvelle prend sa place.

export function BoutonBureau({ onEnregistrer, disabled, className = "btn sm" }: {
  onEnregistrer: () => Promise<{ id: string; titre: string; sequenceId?: string | null }>;
  disabled?: boolean;
  className?: string;
}) {
  const [occupe, setOccupe] = React.useState(false);
  const navigate = useNavigate();
  const atelier = React.useContext(AtelierContext);
  const modification = useModification();
  const remplace = modification && modification.atelier === atelier ? modification : null;
  // Le bandeau ramène à la tuile : on va au plan de travail, qui la désigne.
  const voir = (m: { id: string; titre: string }) => {
    navigate("/plan");
    setTimeout(() => window.dispatchEvent(new CustomEvent(EVT_CHERCHER_BUREAU, { detail: { id: m.id, titre: m.titre } })), 140);
  };
  const agir = async () => {
    setOccupe(true);
    try {
      const m = await onEnregistrer();
      if (remplace) {
        toast(`« ${m.titre} » est refaite : la nouvelle feuille a pris sa place, ${remplace.ou}.`, {
          icone: "✏️", duree: 9000,
          action: m.sequenceId ? { label: "Voir la séquence", faire: () => navigate(`/sequences/${m.sequenceId}`) } : { label: "Voir", faire: () => voir(m) },
        });
      } else {
        toast(`« ${m.titre} » est sur le bureau, dans le plan de travail.`, { icone: "🗂", duree: 8000, action: { label: "Voir", faire: () => voir(m) } });
      }
    } catch (e) {
      toast("Pas enregistré : " + texteErreur(e), { icone: "⚠️", duree: 7000 });
    } finally {
      setOccupe(false);
    }
  };
  return (
    <button type="button" className={remplace ? `${className} primary` : className} disabled={disabled || occupe} onClick={agir}
      title={remplace ? `Mettre cette feuille à la place de « ${remplace.titre} », ${remplace.ou}` : "Enregistrer la feuille en PDF sur le plan de travail"}>
      {occupe ? "⏳ Enregistrement…" : remplace ? "✏️ Remplacer la feuille" : "🗂 Sur le bureau"}
    </button>
  );
}
