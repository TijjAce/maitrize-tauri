import { TYPES_OBSERVATION } from "../api";

// Couleur de chaque nature d'observation : on repère d'un coup d'œil un axe
// de travail, un point de santé ou un souci de comportement dans une liste.

export const COULEUR_OBSERVATION: Record<string, string> = {
  "axe de travail": "#7c3aed",
  "scolaire": "#2563eb",
  "comportement": "#e0730f",
  "santé": "#dc2626",
  "divers": "#6b7280",
};

export const couleurObservation = (type: string) => COULEUR_OBSERVATION[type] ?? COULEUR_OBSERVATION.divers;

/** Étiquette colorée d'une nature d'observation. */
export function ChipObservation({ type, compte }: { type: string; compte?: number }) {
  const c = couleurObservation(type);
  return (
    <span className="chip" style={{ background: `${c}1f`, color: c, border: `1px solid ${c}55`, fontWeight: 650, whiteSpace: "nowrap" }}>
      {type}{compte != null ? ` · ${compte}` : ""}
    </span>
  );
}

/** Choix de la nature par pastilles colorées, plutôt qu'une liste déroulante. */
export function ChoixTypeObservation({ valeur, onChange }: { valeur: string; onChange: (t: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Nature de l'observation" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {TYPES_OBSERVATION.map((t) => {
        const c = couleurObservation(t);
        const actif = valeur === t;
        return (
          <button key={t} type="button" role="radio" aria-checked={actif} onClick={() => onChange(t)}
            style={{ border: `1.5px solid ${actif ? c : `${c}55`}`, background: actif ? c : `${c}14`, color: actif ? "#fff" : c,
              borderRadius: 100, padding: "4px 11px", fontSize: 12.5, fontWeight: 650, cursor: "pointer", font: "inherit" }}>
            {t}
          </button>
        );
      })}
    </div>
  );
}
