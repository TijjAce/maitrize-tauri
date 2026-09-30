import React from "react";
import { api } from "../api";
import { toast } from "./Toaster";
import { ConsigneEnPictos, useLexique } from "./ConsigneEnPictos";
import { useConsigneAtelier } from "./ConsigneAtelier";
import { EVT_PICTOS, clePictos, consignesParDefaut, ecrirePictosAjoutes, lirePictosAjoutes } from "../consigneAtelier";
import { verbesDuTexte } from "../caa";

// Les pictos de la consigne, pour tous les ateliers, depuis le bandeau.
//
// La feuille de chaque atelier s'imprime avec les pictos des verbes de sa
// consigne : c'est ici qu'on le voit, qu'on donne un picto à un verbe qui
// n'en a pas, et qu'on en ajoute un que la consigne ne dit pas. Ce qui
// s'ajoute se garde par atelier, partagé entre les ordinateurs.

/** Les verbes ajoutés à la main pour un atelier, et leur mise à jour d'où qu'elle vienne. */
export function usePictosAtelier(atelier: string): { pictos: string[]; enregistrer: (v: string[]) => void } {
  const [pictos, setPictos] = React.useState<string[]>([]);
  React.useEffect(() => {
    if (!atelier) { setPictos([]); return; }
    let vivant = true;
    const lire = () => { api.settingGet(clePictos(atelier)).then((v) => { if (vivant) setPictos(lirePictosAjoutes(v)); }).catch(() => {}); };
    lire();
    window.addEventListener(EVT_PICTOS, lire);
    return () => { vivant = false; window.removeEventListener(EVT_PICTOS, lire); };
  }, [atelier]);
  const enregistrer = React.useCallback((v: string[]) => {
    setPictos(v);
    api.settingSet(clePictos(atelier), ecrirePictosAjoutes(v))
      .then(() => window.dispatchEvent(new Event(EVT_PICTOS)))
      .catch((e) => toast("Pictos non enregistrés : " + String(e), { icone: "⚠️" }));
  }, [atelier]);
  return { pictos, enregistrer };
}

/** La consigne telle qu'elle s'imprime, ses verbes montrés en pictos, et ceux qui n'en ont pas encore. */
export function useEtatDesPictos(atelier: string): {
  texte: string; pictos: string[]; enregistrer: (v: string[]) => void; montres: string[]; sansPicto: string[]; resume: string;
} {
  const { pictos, enregistrer } = usePictosAtelier(atelier);
  const reecrite = useConsigneAtelier(atelier);
  // La consigne d'origine, que l'aperçu publie ; ou celle que l'enseignant a réécrite.
  const defaut = React.useSyncExternalStore(consignesParDefaut.abonner, () => consignesParDefaut.lire(atelier));
  const texte = reecrite.trim() || defaut;
  const { lexique } = useLexique();
  const verbes = React.useMemo(() => verbesDuTexte(texte), [texte]);
  const montres = React.useMemo(() => [...pictos, ...verbes.filter((v) => !pictos.includes(v))], [pictos, verbes]);
  const sansPicto = React.useMemo(() => montres.filter((v) => !lexique[v]), [montres, lexique]);
  const resume = !montres.length
    ? "aucun verbe reconnu dans la consigne"
    : montres.map((v) => (lexique[v] ? v : `${v} (sans picto)`)).join(", ");
  return { texte, pictos, enregistrer, montres, sansPicto, resume };
}

export function PictosAtelier({ atelier }: { atelier: string }) {
  const { texte, pictos, enregistrer, resume } = useEtatDesPictos(atelier);
  return (
    <details className="comp-atelier pictos-atelier">
      <summary>
        🔤 Les pictos de la consigne
        <span className="meta" style={{ fontWeight: 400, marginLeft: 8 }}>{resume}</span>
      </summary>
      <p className="meta" style={{ fontSize: 12.5, margin: "8px 0 0", lineHeight: 1.5 }}>
        Chaque verbe de la consigne s'imprime avec son picto ARASAAC, pour l'élève qui lit mieux l'image que le mot.
        Donnez un picto à un verbe qui n'en a pas encore, ou ajoutez-en un que la consigne ne dit pas.
      </p>
      <ConsigneEnPictos consignes={[texte]} pictos={pictos} onChange={enregistrer} compact />
    </details>
  );
}
