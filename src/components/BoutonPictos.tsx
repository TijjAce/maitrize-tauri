import React from "react";
import { TrouverUnPicto } from "./TrouverUnPicto";

/** Ouvre « Trouver un pictogramme » d'où qu'on soit : la palette ⌘K l'envoie. */
export const EVT_OUVRIR_PICTOS = "maitrize:ouvrir-pictos";

/// Trouver un pictogramme depuis toute l'application, à côté des notes
/// rapides : par son mot ou par son numéro — celui que la liste de mots d'un
/// atelier reprend (« graine 17183 ») —, ou le faire dessiner.
export function BoutonPictos() {
  const [ouvert, setOuvert] = React.useState(false);
  React.useEffect(() => {
    const ouvrir = () => setOuvert(true);
    window.addEventListener(EVT_OUVRIR_PICTOS, ouvrir);
    return () => window.removeEventListener(EVT_OUVRIR_PICTOS, ouvrir);
  }, []);
  return (
    <>
      <button className="pictos-fab" aria-label="Trouver un pictogramme" onClick={() => setOuvert(true)}
        title="Trouver un pictogramme, par son mot ou son numéro : ARASAAC, Sclera, vos symboles Makaton et Mes pictos">🧩</button>
      {ouvert && <TrouverUnPicto onClose={() => setOuvert(false)} />}
    </>
  );
}
