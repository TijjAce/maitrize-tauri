import React from "react";
import { api } from "../api";
import type { MaterielReel } from "../materielDeClasse";
import { EMOJI_DE_LA_FAMILLE, PICTOS_ARASAAC_DU_MATERIEL, dessinDuMateriel } from "../pictosDuMateriel";

/** Les images déjà lues dans la banque : une carte qui monte sur la pile, une fiche qui revient à l'écran ne clignotent pas. */
const lues = new Map<number, string>();

/** Le picto d'un matériel : son dessin, ou son picto d'ARASAAC ; l'emoji de sa famille si la banque n'est pas encore installée. */
export function PictoDuMateriel({ m }: { m: MaterielReel }) {
  const dessin = dessinDuMateriel(m.id);
  const numero = PICTOS_ARASAAC_DU_MATERIEL[m.id];
  const [, relire] = React.useReducer((n: number) => n + 1, 0);
  const [manque, setManque] = React.useState(false);
  React.useEffect(() => {
    if (dessin || !numero || lues.has(numero)) return;
    let vivant = true;
    api.arasaacImage(numero)
      .then((b) => { lues.set(numero, `data:image/png;base64,${b}`); if (vivant) relire(); })
      .catch(() => { if (vivant) setManque(true); });
    return () => { vivant = false; };
  }, [dessin, numero]);
  const image = dessin ?? (numero ? lues.get(numero) : undefined);
  if (image) return <img src={image} alt="" draggable={false} />;
  return manque || !numero ? <span className="picto-emoji" aria-hidden="true">{EMOJI_DE_LA_FAMILLE[m.famille]}</span> : null;
}
