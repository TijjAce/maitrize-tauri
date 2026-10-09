import React from "react";
import { AtelierContext } from "./AtelierContext";
import { noterMemoire } from "../modifierFeuille";

/**
 * Un réglage de Fabriquer gardé d'une visite à l'autre sur cet ordinateur.
 * `lire` répare ce qui a été enregistré par une version plus ancienne.
 */
export function useMemoire<T>(cle: string, lire: (brut: unknown) => T): [T, (v: T) => void] {
  // Dans un atelier, la clé se note : c'est ce qu'on relira pour refaire sa feuille (voir `modifierFeuille`).
  const atelier = React.useContext(AtelierContext);
  React.useEffect(() => { noterMemoire(atelier, cle); }, [atelier, cle]);
  const [valeur, setValeur] = React.useState<T>(() => {
    try {
      const brut = localStorage.getItem(`fabriquer:${cle}`);
      return lire(brut ? JSON.parse(brut) : undefined);
    } catch {
      return lire(undefined);
    }
  });
  const ecrire = React.useCallback((v: T) => {
    setValeur(v);
    try { localStorage.setItem(`fabriquer:${cle}`, JSON.stringify(v)); } catch { /* stockage indisponible */ }
  }, [cle]);
  return [valeur, ecrire];
}

/** Des réglages en objet, complétés par leurs valeurs par défaut, modifiés par morceaux. */
export function useReglages<T extends object>(cle: string, defaut: T): [T, (maj: Partial<T>) => void] {
  const [valeur, ecrire] = useMemoire<T>(cle, (brut) => ({ ...defaut, ...(brut && typeof brut === "object" ? brut : {}) }));
  const ref = React.useRef(valeur);
  ref.current = valeur;
  return [valeur, React.useCallback((m: Partial<T>) => ecrire({ ...ref.current, ...m }), [ecrire])];
}
