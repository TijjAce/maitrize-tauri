import React from "react";
import { api } from "../api";
import { useAsync } from "./ui";
import { competencesDeLAtelier } from "../ateliersCompetences";

// Ce que l'atelier travaille, d'après les référentiels installés.
//
// On l'écrivait à la main dans chaque bandeau — « Programmes : résoudre des
// problèmes additifs… » —, une phrase recopiée qui vieillit et qui ne se cite
// nulle part. Les compétences arrivent maintenant avec leur intitulé exact,
// leur domaine et leur niveau : de quoi les recopier dans un cahier journal ou
// les retrouver dans une programmation.
//
// Replié par défaut : c'est une vérification qu'on fait une fois, pas une
// bande qui doit manger le haut de l'écran à chaque ouverture.

export function CompetencesAtelier({ termes }: { termes: readonly string[] }) {
  const { data: refs } = useAsync(() => api.referentielsList(), []);
  const [ouvert, setOuvert] = React.useState(false);
  const trouvees = React.useMemo(
    () => competencesDeLAtelier(refs ?? [], termes), [refs, termes]);

  if (!trouvees.length) return null;

  return (
    <details className="comp-atelier" open={ouvert}
      onToggle={(e) => setOuvert((e.currentTarget as HTMLDetailsElement).open)}>
      <summary>
        🎯 Ce que cela travaille
        <span className="meta" style={{ fontWeight: 400, marginLeft: 8 }}>
          {trouvees.length} compétence{trouvees.length > 1 ? "s" : ""} des référentiels
        </span>
      </summary>
      <ul className="comp-atelier-liste">
        {trouvees.map((c) => (
          <li key={c.id}>
            {c.niveau && <span className="badge">{c.niveau}</span>}
            <span>{c.competenceTitre}</span>
            <span className="meta">{[c.referentielNom, c.domaineTitre].filter(Boolean).join(" › ")}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
