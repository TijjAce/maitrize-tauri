import React from "react";
import { ChoixPicto, usePictoImage } from "./ChoixPicto";
import { cleImage, estVide, type PictoPose } from "../supportsVisuels";

/** Une case où poser un pictogramme : l'image et son mot, ou une invitation à en choisir un. */
export function CasePicto({ valeur, onChange, banque, titre, taille = 76 }: {
  valeur: PictoPose; onChange: (p: PictoPose) => void; banque: boolean; titre: string; taille?: number;
}) {
  const [ouvert, setOuvert] = React.useState(false);
  const src = usePictoImage(cleImage(valeur));
  const vide = estVide(valeur);
  return (
    <>
      <button type="button" className="sv-case-picto" onClick={() => setOuvert(true)} title={titre} aria-label={`${titre} : ${valeur.mot || "à choisir"}`}
        style={{ width: taille + 16 }}>
        {src ? <img src={src} alt="" style={{ width: taille, height: taille }} />
          : <span className="sv-case-vide" style={{ width: taille, height: taille }}>{vide ? "＋" : "🖼"}</span>}
        <span className="sv-case-mot">{valeur.mot.trim() || (vide ? "Choisir" : "")}</span>
      </button>
      {ouvert && (
        <ChoixPicto valeur={valeur} banque={banque} titre={titre} photos onClose={() => setOuvert(false)}
          onValider={(p) => { onChange(p); setOuvert(false); }} />
      )}
    </>
  );
}
