import React from "react";
import { CompetencesAtelier, useCompetencesAtelier, useCompetencesParObjectif } from "./CompetencesAtelier";
import { ConsigneAtelier, useConsigneAtelier } from "./ConsigneAtelier";
import { OptionsFeuille, useOptionsFeuille } from "./OptionsFeuille";
import { PictosAtelier, useEtatDesPictos } from "./PictosAtelier";
import { objectifsDesAteliers, unionDesCompetences } from "../ateliersCompetences";
import { feuillesPubliees } from "../optionsFeuille";

// ── La feuille de l'atelier, en une ligne ──────────────────────────────────
//
// Tout ce qui touche à la feuille imprimée — ce qu'on y met, sa consigne,
// les pictos de la consigne, les compétences en marge — se réglait en quatre
// bandeaux empilés au-dessus de chaque atelier : on ne voyait plus l'atelier.
// Ils tiennent ici dans un seul bloc replié, dont la ligne dit l'essentiel ;
// on l'ouvre le jour où l'on veut changer quelque chose.

const SANS: Record<"consigne" | "prenom" | "corrige", string> = {
  consigne: "sans la consigne", prenom: "sans prénom ni date", corrige: "sans la correction",
};

/** Ce que la ligne repliée résume : la consigne, les pictos, ce qui manque sur la feuille, les compétences. */
export function useResumeDeLaFeuille(atelier: string): string {
  const consigne = useConsigneAtelier(atelier);
  const { montres, sansPicto } = useEtatDesPictos(atelier);
  const { options } = useOptionsFeuille(atelier);
  const contenu = React.useSyncExternalStore(feuillesPubliees.abonner, () => feuillesPubliees.lire(atelier));
  // Un atelier qui travaille par objectif : les compétences de la feuille sont celles des objectifs retenus.
  const objectifs = React.useSyncExternalStore(objectifsDesAteliers.abonner, () => objectifsDesAteliers.lire(atelier));
  const [deLAtelier] = useCompetencesAtelier(atelier);
  const parObjectif = useCompetencesParObjectif(atelier);
  const competences = objectifs.length ? unionDesCompetences(objectifs.map((o) => parObjectif[o.id] ?? [])) : deLAtelier;
  const avecPicto = montres.length - sansPicto.length;
  return [
    consigne.trim() ? "consigne réécrite" : "consigne de l'atelier",
    !montres.length ? "" : sansPicto.length ? `pictos : ${avecPicto} sur ${montres.length}` : `${montres.length} picto${montres.length > 1 ? "s" : ""}`,
    ...(Object.keys(SANS) as (keyof typeof SANS)[]).filter((c) => contenu[c] && !options[c]).map((c) => SANS[c]),
    competences.length ? `${competences.length} compétence${competences.length > 1 ? "s" : ""}`
      : objectifs.length ? "compétences à choisir pour cet objectif" : "compétences à choisir",
  ].filter(Boolean).join(" · ");
}

/** Le bloc replié, et ses quatre réglages une fois ouvert. */
export function FeuilleDeLAtelier({ atelier, nom }: { atelier: string; nom: string }) {
  const resume = useResumeDeLaFeuille(atelier);
  const objectifs = React.useSyncExternalStore(objectifsDesAteliers.abonner, () => objectifsDesAteliers.lire(atelier));
  return (
    <details className="comp-atelier feuille-atelier">
      <summary>
        🖨 La feuille
        <span className="meta">{resume}</span>
      </summary>
      <div className="feuille-atelier-corps">
        <OptionsFeuille atelier={atelier} />
        <ConsigneAtelier atelier={atelier} />
        <PictosAtelier atelier={atelier} />
        <CompetencesAtelier atelier={atelier} nom={nom} objectifs={objectifs} />
      </div>
    </details>
  );
}
