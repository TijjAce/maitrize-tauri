import React from "react";
import { api, type MaterielItem } from "../api";
import { toast } from "./Toaster";
import { ECHELLE_MAX, ECHELLE_MIN, ECHELLE_PAS, cleEchelle, lireEchelle } from "../materielAImprimer";

// La molette d'échelle d'une feuille jointe au cahier journal.
//
// Une feuille scannée trop grande sort rognée, une fiche trop petite ne se
// lit pas. Le réglage vit avec le matériel, en pourcentage ; le journal
// l'applique à l'impression du jour comme au PDF de la semaine. La même
// molette se retrouve dans la séance et sous le créneau du journal.

export function MoletteEchelle({ materiel, compact = false }: { materiel: MaterielItem; compact?: boolean }) {
  const [pourcent, setPourcent] = React.useState<number | null>(null);
  React.useEffect(() => {
    let vivant = true;
    api.settingGet(cleEchelle(materiel.id))
      .then((v) => { if (vivant) setPourcent(Math.round(lireEchelle(v) * 100)); })
      .catch(() => { if (vivant) setPourcent(100); });
    return () => { vivant = false; };
  }, [materiel.id]);
  const regler = (valeur: number) => {
    const borne = Math.max(ECHELLE_MIN, Math.min(ECHELLE_MAX, valeur));
    setPourcent(borne);
    api.settingSet(cleEchelle(materiel.id), String(borne))
      .catch((e) => toast("Échelle non enregistrée : " + String(e), { icone: "⚠️" }));
  };
  const valeur = pourcent ?? 100;
  return (
    <label className={`echelle-impression${compact ? " compacte" : ""}`}
      title="L'échelle de cette feuille à l'impression du cahier journal : réduite pour qu'elle rentre, agrandie pour qu'elle se lise">
      <span aria-hidden="true">🔍</span>
      <button type="button" className="echelle-pas" aria-label="Réduire" onClick={() => regler(valeur - ECHELLE_PAS)}>−</button>
      <input type="range" min={ECHELLE_MIN} max={ECHELLE_MAX} step={ECHELLE_PAS} value={valeur}
        aria-label={`Échelle à l'impression de ${materiel.titre}`} onChange={(e) => regler(Number(e.target.value))} />
      <button type="button" className="echelle-pas" aria-label="Agrandir" onClick={() => regler(valeur + ECHELLE_PAS)}>+</button>
      <span className="echelle-valeur">{valeur} %</span>
    </label>
  );
}
