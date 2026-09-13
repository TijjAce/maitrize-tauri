import React from "react";
import { api, Texte, texteErreur } from "../api";
import { toast } from "./Toaster";

export type EtatEnregistrement = "enregistre" | "modifie" | "enregistrement" | "erreur";

export const LIBELLE_ENREGISTREMENT: Record<EtatEnregistrement, string> = {
  enregistre: "✓ Enregistré", modifie: "Modifications…", enregistrement: "Enregistrement…", erreur: "Non enregistré",
};

/**
 * Titre et contenu d'un texte, enregistrés tout seuls peu après la frappe :
 * on écrit comme dans un carnet, sans bouton. `sauver` force l'écriture
 * (à la fermeture, avant d'imprimer).
 */
export function useTexteAutosave(texte: Texte, apres?: () => void) {
  const [titre, setTitre] = React.useState(texte.titre);
  const [contenu, setContenu] = React.useState(texte.contenu);
  const [etat, setEtat] = React.useState<EtatEnregistrement>("enregistre");
  const valeurs = React.useRef({ titre, contenu });
  valeurs.current = { titre, contenu };
  const enregistres = React.useRef({ titre: texte.titre, contenu: texte.contenu });
  const apresRef = React.useRef(apres);
  apresRef.current = apres;

  const sauver = React.useCallback(async () => {
    const { titre: ti, contenu: co } = valeurs.current;
    if (ti === enregistres.current.titre && co === enregistres.current.contenu) return;
    setEtat("enregistrement");
    try {
      await api.texteSave({ ...texte, titre: ti.trim() || "Sans titre", contenu: co, dateModification: new Date().toISOString() });
      enregistres.current = { titre: ti, contenu: co };
      setEtat(valeurs.current.titre === ti && valeurs.current.contenu === co ? "enregistre" : "modifie");
      apresRef.current?.();
    } catch (e) {
      setEtat("erreur");
      toast("Enregistrement impossible : " + texteErreur(e), { icone: "⚠️", duree: 6000 });
    }
  }, [texte]);

  React.useEffect(() => {
    if (titre === enregistres.current.titre && contenu === enregistres.current.contenu) return;
    setEtat("modifie");
    const id = window.setTimeout(sauver, 700);
    return () => window.clearTimeout(id);
  }, [titre, contenu, sauver]);

  // En quittant l'écran, rien ne se perd.
  React.useEffect(() => () => { void sauver(); }, [sauver]);

  return { titre, setTitre, contenu, setContenu, etat, sauver };
}
