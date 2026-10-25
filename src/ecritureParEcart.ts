// Les écrans qui écrivent une collection — une progression, une
// programmation, un emploi du temps — l'écrivent par écart.
//
// Ils gardaient leur propre copie et l'écrivaient d'un bloc : une ligne
// arrivée d'un autre ordinateur, ou d'un collègue sur un bureau commun,
// disparaissait à la modification suivante, parce que la copie de l'écran
// ne l'avait pas. Ici, chaque écriture n'envoie que l'écart entre ce que la
// base a déjà reçu de l'écran et ce qu'il montre ; la base le fusionne avec
// ce qu'elle a (voir `fusion_trois`, côté Rust).

import React from "react";
import { useHistorique } from "./components/ui";
import { toast } from "./components/Toaster";

/** Le JSON d'une valeur, clés rangées : deux objets égaux s'écrivent pareil, quel que soit l'ordre de leurs clés. */
export function jsonRange(v: unknown): string {
  return JSON.stringify(v, (_k, x: unknown) => (x && typeof x === "object" && !Array.isArray(x)
    ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, (x as Record<string, unknown>)[k]]))
    : x));
}

export const memeJson = (a: unknown, b: unknown) => jsonRange(a) === jsonRange(b);

/** Combien d'écritures sont en route, tous écrans confondus. */
let enRoute = 0;

/**
 * Attend que plus rien ne soit en route — avant de déplacer ce qu'on édite
 * (donner un autre niveau à un tableau) : une écriture arrivée après coup
 * recréerait le tableau là où il n'est plus.
 */
export async function ecrituresTerminees(delaiMax = 10000): Promise<void> {
  const fin = Date.now() + delaiMax;
  while (enRoute > 0 && Date.now() < fin) await new Promise((r) => setTimeout(r, 40));
}

/** Les écritures d'une clé : ce que la base a déjà reçu, ce qui reste à envoyer. */
interface Ecrivain<T> { envoye: T; aEnvoyer: T | null; actif: boolean }

export interface OptionsEcriture<T> {
  /** Ce qu'on édite : l'année, ou l'année, le niveau et la période. */
  cle: string;
  /** La liste lue de la base, ou rien tant qu'elle ne l'est pas : chaque relecture en donne une nouvelle. */
  lecture: unknown;
  /** Ce que la base a pour une clé, d'après la dernière lecture. */
  enBase: (cle: string) => T;
  /** Écrit l'écart entre `avant` et `apres` pour une clé. */
  ecrire: (cle: string, avant: T, apres: T) => Promise<unknown>;
  /** Relit la liste. */
  relire: () => void;
  vide: T;
  /** Le message d'un échec : « Programmation non enregistrée ». */
  echec: string;
  pareil?: (a: T, b: T) => boolean;
  /** Annuler/rétablir au clavier (⌘Z) ; un seul écran à la fois doit l'avoir. */
  clavier?: boolean;
}

/**
 * L'état d'un écran qui écrit une collection.
 *
 * - Annuler/rétablir, comme `useHistorique`.
 * - Une écriture à la fois par clé, et seulement la dernière version : les
 *   versions tapées entre-temps se fondent dans la suivante.
 * - Ce que la base relit (synchronisation, retour sur la fenêtre) s'affiche
 *   dès que rien n'est en route.
 * - `modifier` écrit dans une autre clé que celle affichée : l'annulation
 *   d'une suppression peut arriver après qu'on a changé de période.
 */
export function useCollectionParEcart<T>(o: OptionsEcriture<T>) {
  const opts = React.useRef(o);
  opts.current = o;
  const pareil = (a: T, b: T) => (opts.current.pareil ?? memeJson)(a, b);
  const ecrivains = React.useRef(new Map<string, Ecrivain<T>>());
  const affichee = React.useRef<string | null>(null);
  const { present, reset: afficher, commit, undo, redo } = useHistorique<T>(o.vide, (suivant) => envoyer(opts.current.cle, suivant), o.clavier ?? true);
  const presentRef = React.useRef(present);
  presentRef.current = present;

  const ecrivain = (cle: string): Ecrivain<T> => {
    let w = ecrivains.current.get(cle);
    if (!w) {
      w = { envoye: opts.current.enBase(cle), aEnvoyer: null, actif: false };
      ecrivains.current.set(cle, w);
    }
    return w;
  };
  const occupe = (w?: Ecrivain<T>) => !!w && (w.actif || w.aEnvoyer !== null);

  const vider = async (cle: string, w: Ecrivain<T>) => {
    w.actif = true;
    enRoute++;
    try {
      while (w.aEnvoyer !== null) {
        const version = w.aEnvoyer;
        if (pareil(version, w.envoye)) { w.aEnvoyer = null; break; }
        await opts.current.ecrire(cle, w.envoye, version);
        w.envoye = version;
        if (w.aEnvoyer === version) w.aEnvoyer = null;
      }
    } catch (err) {
      // Ce qui n'est pas parti reste à envoyer : la prochaine modification le reprend.
      toast(`${opts.current.echec} : ${String(err)}`, { icone: "⚠️" });
    } finally {
      w.actif = false;
      enRoute--;
    }
    if (!occupe(w)) opts.current.relire();
  };
  function envoyer(cle: string, suivant: T) {
    const w = ecrivain(cle);
    w.aEnvoyer = suivant;
    if (!w.actif) void vider(cle, w);
  }
  const modifier = (cle: string, f: (e: T) => T) => {
    if (cle === opts.current.cle) {
      // Rien à changer : rien ne s'inscrit dans l'historique, et ce qu'on pouvait rétablir le reste.
      const suite = f(presentRef.current);
      if (!pareil(suite, presentRef.current)) commit(suite);
      return;
    }
    const w = ecrivain(cle);
    envoyer(cle, f(w.aEnvoyer ?? w.envoye));
  };
  /**
   * Le bouton « Annuler » d'une suppression : si rien n'a bougé depuis, elle se défait dans l'historique — et ⌘Z
   * reprend ensuite le geste d'avant — ; sinon, ce qu'elle a retiré revient par `remettre`. Le bandeau ne s'inscrit
   * pas au clavier (`toastAnnulable(…, { clavier: false })`) : ⌘Z défait déjà la suppression par l'historique, et
   * l'inscrire deux fois faisait qu'un second ⌘Z la refaisait.
   */
  const defaireOuRemettre = (cle: string, apres: T, remettre: (e: T) => T) => {
    if (cle === opts.current.cle && pareil(presentRef.current, apres)) undo();
    else modifier(cle, remettre);
  };

  // Afficher ce que la base a pour la clé choisie, puis ce qui arrive
  // d'ailleurs — jamais pendant que nos écritures partent : la dernière
  // relira la base en finissant.
  React.useEffect(() => {
    if (o.lecture == null) return;
    const w = ecrivain(o.cle);
    const enBase = opts.current.enBase(o.cle);
    if (affichee.current !== o.cle) {
      affichee.current = o.cle;
      afficher(occupe(w) ? (w.aEnvoyer ?? w.envoye) : enBase);
      if (!occupe(w)) w.envoye = enBase;
      return;
    }
    if (occupe(w)) return;
    w.envoye = enBase;
    if (!pareil(enBase, presentRef.current)) afficher(enBase);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o.lecture, o.cle]);

  /** Vrai une fois la clé affichée relue de la base : rien ne doit s'y ajouter avant. */
  const pret = o.lecture != null && affichee.current === o.cle;
  return { present, commit, modifier, defaireOuRemettre, undo, redo, pret };
}
