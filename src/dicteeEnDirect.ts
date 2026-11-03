import React from "react";
import { api } from "./api";
import { useEcoute } from "./ecoute";
import { ADRESSE_DU_DIRECT_MONDIAL, ouvrirLeDirect, type Direct } from "./voxtralDirect";

// ── La dictée en direct de l'Assistant IA ─────────────────────────────────
//
// « J'aimerais que l'IA Voxtral Realtime écrive en direct tous les mots que je
// dis, que je puisse voir même les mots chuchotés, comme ChatGPT live. » Puis,
// le direct n'existant pas à l'adresse européenne de Mistral : « branche ce
// service, […] mets un panneau d'avertissement […] : on laisse libre, mais que
// pour cette partie » (l'enseignant, 3 novembre 2026).
//
// La voix part donc chez Mistral à son adresse habituelle, hors garantie
// européenne — c'est la seule chose de Maitrize qui le fasse, et l'Assistant
// le dit en permanence. Elle est d'abord traitée pour qu'un chuchotement
// s'entende (voir priseDeSon.ts), puis les mots arrivent au fil de la parole.

export type EtatDicteeEnDirect = "repos" | "ecoute" | "fin";

export interface DicteeEnDirect {
  etat: EtatDicteeEnDirect;
  secondes: number;
  /** Le niveau du son entendu, de 0 à 1 : de quoi le montrer. */
  niveau: React.MutableRefObject<number>;
  /** Les secondes de parole et le silence en cours, depuis l'ouverture du micro (voir ecoute.ts). */
  activite: React.MutableRefObject<{ parole: number; silence: number }>;
  /** Ouvre le micro et le direct ; l'erreur à dire, ou null. */
  demarrer: () => Promise<string | null>;
  /** Le micro se ferme, les derniers mots arrivent, puis le direct se ferme. */
  arreter: () => Promise<void>;
  /**
   * Le micro se tait sans se fermer : c'est du silence qui part, et le direct reste ouvert pour la phrase suivante —
   * pendant que la voix de l'Assistant parle, il l'entendrait (voir conversationVocale.ts). Rendu avec `rattraper`,
   * il envoie d'abord les dernières secondes qu'il a entendues sans les envoyer : les premiers mots de qui coupe la
   * parole à la voix (voir priseDeParole.ts).
   */
  taire: (muet: boolean, rattraper?: number) => void;
}

/** Les dernières trames, jusqu'à `secondes` : ce qu'on vient d'entendre. */
export function derniersInstants<T extends { trame: Float32Array; taux: number }>(trames: readonly T[], secondes: number): T[] {
  const sortie: T[] = [];
  let duree = 0;
  for (let i = trames.length - 1; i >= 0 && duree < secondes - 1e-9; i--) {
    sortie.unshift(trames[i]);
    duree += trames[i].trame.length / trames[i].taux;
  }
  return sortie;
}

export function useDicteeEnDirect({ surMots, surPanne, surTrame }: {
  /** Des mots qui arrivent, avec leurs espaces, à mettre à la suite. */
  surMots: (morceau: string) => void;
  /** Le direct a lâché pour de bon : l'appelant reprend autrement. */
  surPanne: (raison: string) => void;
  /** Chaque trame du micro, mesurée, avant de partir : la conversation y guette qu'on coupe la parole à la voix. */
  surTrame?: (mesure: { micro: number; fond: number; duree: number }) => void;
}): DicteeEnDirect {
  const [etat, setEtat] = React.useState<EtatDicteeEnDirect>("repos");
  const direct = React.useRef<Direct | null>(null);
  // Les rappels changent à chaque rendu ; le direct, lui, vit le temps de la dictée.
  const mots = React.useRef(surMots);
  mots.current = surMots;
  const panne = React.useRef(surPanne);
  panne.current = surPanne;
  const trameMesuree = React.useRef(surTrame);
  trameMesuree.current = surTrame;
  // Le direct écrit tout : les passages coupés aux silences ne servent pas ici. Micro tu, c'est du silence qui part —
  // et l'on garde la dernière seconde entendue, pour qui coupe la parole à la voix.
  const muet = React.useRef(false);
  const tues = React.useRef<{ trame: Float32Array; taux: number }[]>([]);
  const ecoute = useEcoute({
    onTranche: () => {},
    onTrame: (trame, taux, mesure) => {
      // D'abord la mesure : elle peut rendre le micro (`taire(false, …)`), et cette trame partir telle quelle.
      trameMesuree.current?.({ micro: mesure.brut, fond: mesure.fond, duree: trame.length / taux });
      if (!muet.current) { direct.current?.envoyer(trame, taux); return; }
      tues.current = [...derniersInstants(tues.current, 1), { trame, taux }];
      direct.current?.envoyer(new Float32Array(trame.length), taux);
    },
  });

  const arreter = React.useCallback(async () => {
    ecoute.arreter();
    const d = direct.current;
    if (!d) { setEtat("repos"); return; }
    setEtat("fin");
    await d.fermer();
    if (direct.current === d) direct.current = null;
    setEtat("repos");
  }, [ecoute]);

  const demarrer = React.useCallback(async () => {
    if (direct.current) return null;
    muet.current = false;
    const d = ouvrirLeDirect({
      jeton: () => api.mistralJetonDicteeAssistant(),
      adresse: ADRESSE_DU_DIRECT_MONDIAL,
      surTexte: (m) => { if (direct.current === d) mots.current(m); },
      surPanne: (raison) => {
        if (direct.current !== d) return;
        direct.current = null;
        ecoute.arreter();
        setEtat("repos");
        panne.current(raison);
      },
    });
    direct.current = d;
    const erreur = await ecoute.demarrer();
    if (erreur) {
      direct.current = null;
      await d.fermer();
      return erreur;
    }
    setEtat("ecoute");
    return null;
  }, [ecoute]);

  // L'écran qui se ferme en pleine dictée relâche le direct (le micro, l'écoute s'en charge).
  React.useEffect(() => () => { void direct.current?.fermer(); direct.current = null; }, []);

  const taire = React.useCallback((oui: boolean, rattraper = 0) => {
    const etaitMuet = muet.current;
    muet.current = oui;
    if (oui) return;
    // Le micro rendu : on repart de zéro pour savoir quand la phrase suivante finit.
    ecoute.activite.current = { parole: 0, silence: 0 };
    // Les premiers mots de qui a coupé la parole à la voix : entendus pendant qu'il se taisait, ils partent d'abord.
    if (etaitMuet && rattraper > 0) for (const { trame, taux } of derniersInstants(tues.current, rattraper)) direct.current?.envoyer(trame, taux);
    tues.current = [];
  }, [ecoute.activite]);

  return { etat, secondes: ecoute.secondes, niveau: ecoute.niveau, activite: ecoute.activite, demarrer, arreter, taire };
}

/** Des mots qui arrivent à la suite de ce qui est écrit : un espace s'il en faut un entre les deux. */
export function aLaSuite(ecrit: string, morceau: string, premier: boolean): string {
  if (!premier || !ecrit || /\s$/.test(ecrit) || /^\s/.test(morceau)) return ecrit + morceau;
  return `${ecrit} ${morceau}`;
}
