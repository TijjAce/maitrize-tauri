import React from "react";
import { api } from "../api";
import { toast } from "./Toaster";
import {
  EVT_OPTIONS_FEUILLE, OPTIONS_FEUILLE, cleOptionsFeuille, ecrireOptionsFeuille, feuillesPubliees, lireOptionsFeuille, type OptionsFeuille as Options,
} from "../optionsFeuille";

// Ce qui s'imprime sur la feuille, depuis le bandeau de l'atelier : trois
// cases, les mêmes partout. Ne sont proposées que celles qui ont un effet
// sur la feuille affichée.

/** Les choix d'un atelier, et leur mise à jour d'où qu'elle vienne. */
export function useOptionsFeuille(atelier: string): { options: Options; changer: (patch: Partial<Options>) => void } {
  const [options, setOptions] = React.useState<Options>(OPTIONS_FEUILLE);
  React.useEffect(() => {
    if (!atelier) { setOptions(OPTIONS_FEUILLE); return; }
    let vivant = true;
    const lire = () => { api.settingGet(cleOptionsFeuille(atelier)).then((v) => { if (vivant) setOptions(lireOptionsFeuille(v)); }).catch(() => {}); };
    lire();
    window.addEventListener(EVT_OPTIONS_FEUILLE, lire);
    return () => { vivant = false; window.removeEventListener(EVT_OPTIONS_FEUILLE, lire); };
  }, [atelier]);
  const courant = React.useRef(options);
  courant.current = options;
  const changer = React.useCallback((patch: Partial<Options>) => {
    const suite = { ...courant.current, ...patch };
    setOptions(suite);
    api.settingSet(cleOptionsFeuille(atelier), ecrireOptionsFeuille(suite))
      .then(() => window.dispatchEvent(new Event(EVT_OPTIONS_FEUILLE)))
      .catch((e) => toast("Choix non enregistré : " + String(e), { icone: "⚠️" }));
  }, [atelier]);
  return { options, changer };
}

const CASES: { cle: keyof Options; libelle: string; aide: string }[] = [
  { cle: "consigne", libelle: "la consigne", aide: "Décochée, la feuille sort sans sa consigne ni sa règle : on la dit à l'oral." },
  { cle: "prenom", libelle: "prénom et date", aide: "Décochée, la feuille sort sans la ligne « Prénom … Date … »." },
  { cle: "corrige", libelle: "la correction", aide: "Décochée, la feuille sort sans sa correction : ni page de corrigé, ni réponses." },
];

export function OptionsFeuille({ atelier }: { atelier: string }) {
  const { options, changer } = useOptionsFeuille(atelier);
  const contenu = React.useSyncExternalStore(feuillesPubliees.abonner, () => feuillesPubliees.lire(atelier));
  const utiles = CASES.filter((c) => contenu[c.cle]);
  if (!utiles.length) return null;
  return (
    <div className="comp-atelier options-feuille" role="group" aria-label="Ce qui s'imprime sur la feuille">
      <span className="options-feuille-titre">🖨 Sur la feuille</span>
      {utiles.map((c) => (
        <label key={c.cle} className="pb-coche" title={c.aide}>
          <input type="checkbox" checked={options[c.cle]} onChange={(e) => changer({ [c.cle]: e.target.checked })} />
          <span>{c.libelle}</span>
        </label>
      ))}
    </div>
  );
}
