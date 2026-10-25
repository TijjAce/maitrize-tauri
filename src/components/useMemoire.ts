import React from "react";
import { AtelierContext } from "./AtelierContext";
import { noterMemoire } from "../modifierFeuille";
import { champDe, inscrireAnnulable } from "../annulation";
import { PageVisibleContext } from "./ui";
import { lireMotsImages, type MotImage } from "../jeuxSons";

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
  const poser = React.useCallback((v: T) => {
    setValeur(v);
    try { localStorage.setItem(`fabriquer:${cle}`, JSON.stringify(v)); } catch { /* stockage indisponible */ }
  }, [cle]);

  // ⌘Z défait un réglage changé d'un geste — une catégorie, une branche, un mot, une étape retirés, une case
  // cochée — et ⌘⇧Z le refait (voir annulation.ts). La frappe dans un champ, WebKit la défait lui-même.
  const actuelle = React.useRef(valeur);
  actuelle.current = valeur;
  const passe = React.useRef<{ v: T; quand: number }[]>([]);
  const futur = React.useRef<{ v: T; quand: number }[]>([]);
  const ecrire = React.useCallback((v: T) => {
    const ev = typeof window !== "undefined" ? window.event : undefined;
    const frappe = ev?.type === "input" && !!champDe(ev.target instanceof Element ? ev.target : null);
    // Rien ne change (un réglage relu, réparé à l'ouverture) : rien à défaire.
    const pareil = (() => { try { return JSON.stringify(v) === JSON.stringify(actuelle.current); } catch { return false; } })();
    if (!frappe && !pareil) {
      passe.current = [...passe.current.slice(-49), { v: actuelle.current, quand: Date.now() }];
      futur.current = [];
    }
    actuelle.current = v;
    poser(v);
  }, [poser]);
  const pageVisible = React.useContext(PageVisibleContext);
  const aLEcran = React.useRef(pageVisible);
  aLEcran.current = pageVisible;
  React.useEffect(() => {
    const retourner = (de: typeof passe, vers: typeof passe) => {
      const etat = de.current.pop();
      if (!etat) return;
      vers.current.push({ v: actuelle.current, quand: Date.now() });
      actuelle.current = etat.v;
      poser(etat.v);
    };
    return inscrireAnnulable({
      aDefaire: () => passe.current[passe.current.length - 1]?.quand ?? 0,
      defaire: () => retourner(passe, futur),
      aRefaire: () => futur.current[futur.current.length - 1]?.quand ?? 0,
      refaire: () => retourner(futur, passe),
      visible: () => aLEcran.current,
    });
  }, [poser]);
  return [valeur, ecrire];
}

/**
 * Les mots d'un atelier — ses dessins et leurs mots —, gardés d'une visite à l'autre comme ses réglages : quitter
 * l'atelier ne perd plus la liste, il fallait la refaire à chaque fois. Se modifie comme un état de React.
 */
export function useMotsGardes(cle: string): [MotImage[], React.Dispatch<React.SetStateAction<MotImage[]>>] {
  return useEtatGarde<MotImage[]>(cle, lireMotsImages);
}

/** `useMemoire`, qui se modifie comme un état de React : une valeur, ou ce qu'en fait une fonction. */
export function useEtatGarde<T>(cle: string, lire: (brut: unknown) => T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [valeur, ecrire] = useMemoire<T>(cle, lire);
  const actuelle = React.useRef(valeur);
  actuelle.current = valeur;
  const poser = React.useCallback((v: React.SetStateAction<T>) => {
    const suite = typeof v === "function" ? (v as (avant: T) => T)(actuelle.current) : v;
    actuelle.current = suite;
    ecrire(suite);
  }, [ecrire]);
  return [valeur, poser];
}

/** Des réglages en objet, complétés par leurs valeurs par défaut, modifiés par morceaux. */
export function useReglages<T extends object>(cle: string, defaut: T): [T, (maj: Partial<T>) => void] {
  const [valeur, ecrire] = useMemoire<T>(cle, (brut) => ({ ...defaut, ...(brut && typeof brut === "object" ? brut : {}) }));
  const ref = React.useRef(valeur);
  ref.current = valeur;
  return [valeur, React.useCallback((m: Partial<T>) => ecrire({ ...ref.current, ...m }), [ecrire])];
}
