import React from "react";
import { CompetenceTree, labelCourt, type CompetenceSelectionnee } from "./CompetenceTree";

// Des compétences des programmes officiels (BO), cochées dans les
// référentiels, pour un jeu, un outil ou un affichage. Rangées en JSON dans
// une colonne de la fiche.

/** Les compétences lues dans leur JSON ; une valeur abîmée n'en donne aucune. */
export function lireCompetencesBo(json: string | null | undefined): CompetenceSelectionnee[] {
  try {
    const v = JSON.parse(json || "[]");
    return Array.isArray(v) ? v.filter((c) => c && typeof c.competenceTitre === "string") : [];
  } catch {
    return [];
  }
}

export const memeCompetence = (a: CompetenceSelectionnee, b: CompetenceSelectionnee) =>
  a.referentielNom === b.referentielNom && a.sousDomaineTitre === b.sousDomaineTitre
  && (a.competenceRefId ?? a.competenceTitre) === (b.competenceRefId ?? b.competenceTitre);

/** Coche ou décoche une compétence dans un JSON de compétences. */
export function basculerCompetence(json: string, c: CompetenceSelectionnee): string {
  const liste = lireCompetencesBo(json);
  const suite = liste.some((x) => memeCompetence(x, c)) ? liste.filter((x) => !memeCompetence(x, c)) : [...liste, c];
  return JSON.stringify(suite);
}

/** Les compétences choisies en étiquettes, et la liste des programmes à ouvrir. */
export function ChoixCompetencesBo({ valeur, onChange, bouton = "🎯 Choisir des compétences du BO" }: {
  valeur: string; onChange: (json: string) => void;
  /** Ce que dit le bouton : une évaluation en vise une, un jeu en travaille plusieurs. */
  bouton?: string;
}) {
  const choisies = lireCompetencesBo(valeur);
  const [ouvert, setOuvert] = React.useState(false);
  const [filtre, setFiltre] = React.useState("");
  // La valeur la plus récente : deux coches rapprochées ne s'écrasent pas.
  const courante = React.useRef(valeur);
  courante.current = valeur;
  const basculer = (c: CompetenceSelectionnee) => {
    courante.current = basculerCompetence(courante.current, c);
    onChange(courante.current);
  };
  return (
    <>
      {choisies.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {choisies.map((c) => (
            <span key={`${c.referentielNom}|${c.sousDomaineTitre}|${c.competenceRefId ?? c.competenceTitre}`} className="chip"
              title={[c.referentielNom, c.domaineTitre, c.sousDomaineTitre].filter(Boolean).join(" › ")}
              style={{ background: "var(--accent-soft)", color: "var(--accent)", maxWidth: "100%" }}>
              🎯 {labelCourt(c)}
              <button className="btn ghost sm" style={{ padding: 0, marginLeft: 4 }} onClick={() => basculer(c)}
                aria-label={`Retirer « ${labelCourt(c)} »`}>✕</button>
            </span>
          ))}
        </div>
      )}
      <button type="button" className="btn sm" style={{ marginTop: 8 }} onClick={() => setOuvert((x) => !x)} aria-expanded={ouvert}>
        {ouvert ? "Fermer les programmes" : `${bouton}${choisies.length ? ` (${choisies.length})` : ""}`}
      </button>
      {ouvert && (
        <div className="jeu-choix-bo">
          <input className="input" value={filtre} onChange={(e) => setFiltre(e.target.value)} autoFocus
            placeholder="Chercher une compétence (ex. : nombres jusqu'à 30, attendre son tour…)" aria-label="Chercher une compétence du BO" />
          <div className="jeu-choix-bo-liste">
            <CompetenceTree mode="multi" selection={choisies} onToggle={basculer} recherche={filtre} />
          </div>
        </div>
      )}
    </>
  );
}

/** Les premières compétences d'une fiche, en étiquettes courtes sur sa carte. */
export function EtiquettesBo({ valeur, max = 3 }: { valeur: string; max?: number }) {
  const liste = lireCompetencesBo(valeur);
  if (!liste.length) return null;
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
      {liste.slice(0, max).map((c, i) => (
        <span key={i} className="chip" title={`${c.referentielNom} › ${labelCourt(c)}`}
          style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-block" }}>
          📘 {labelCourt(c)}
        </span>
      ))}
      {liste.length > max && <span className="chip">+{liste.length - max}</span>}
    </div>
  );
}
