import React from "react";
import { texteErreur, type Seance } from "../api";
import { useAsync, Select } from "./ui";
import { toast } from "./Toaster";
import { labelCourt, type CompetenceSelectionnee } from "./CompetenceTree";
import { memeCompetence } from "../ateliersCompetences";
import { chargerLesManuels, poserDansLaSeance } from "../exercicesDesManuels";
import { exercicesQuiTravaillent, nomExercice, type ExerciceTrouve } from "../manuels";

// ── Les exercices des manuels, dans la séquence qui vise leur compétence ───
//
// L'enseignant a mis une compétence du BO sur un exercice de manuel ; la
// séquence qui vise cette compétence le retrouve ici, et le pose d'un geste
// dans une de ses séances : son modèle simplifié en PDF, qui s'imprime avec le
// cahier journal.

export function ExercicesDesManuels({ competence, sequenceId, cycle, seances, seanceParDefaut, onAjoute }: {
  competence: CompetenceSelectionnee | null;
  sequenceId: string;
  cycle: string;
  seances: Seance[];
  /** La séance proposée d'abord : la prochaine à faire. */
  seanceParDefaut?: string;
  onAjoute: () => void;
}) {
  const { data: manuels } = useAsync(() => chargerLesManuels(), []);
  const [choix, setChoix] = React.useState<Record<string, string>>({});
  const [etats, setEtats] = React.useState<Record<string, "encours" | "fait">>({});
  if (!competence || !manuels) return null;
  const trouves = exercicesQuiTravaillent(manuels, (c) => memeCompetence(c, competence));
  if (!trouves.length) return null;
  const cle = (t: ExerciceTrouve) => `${t.manuel.id}:${t.exercice.id}`;
  const seanceDe = (t: ExerciceTrouve) => choix[cle(t)] || seanceParDefaut || seances[0]?.id || "";

  const ajouter = async (t: ExerciceTrouve) => {
    const seance = seances.find((s) => s.id === seanceDe(t));
    if (!seance) return;
    setEtats((e) => ({ ...e, [cle(t)]: "encours" }));
    try {
      await poserDansLaSeance(t, seance.id, sequenceId, cycle);
      setEtats((e) => ({ ...e, [cle(t)]: "fait" }));
      onAjoute();
      toast(`« ${nomExercice(t.exercice)} » est dans la séance ${seance.numero} : il s'imprimera avec le cahier journal.`, { icone: "📚", duree: 6000 });
    } catch (e) {
      setEtats((x) => { const { [cle(t)]: _, ...reste } = x; return reste; });
      toast("Exercice non ajouté : " + texteErreur(e), { icone: "⚠️", duree: 7000 });
    }
  };

  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>📚 Exercices des manuels</h3>
        <span className="meta">{trouves.length} qui travaille{trouves.length > 1 ? "nt" : ""} « {labelCourt(competence)} »</span>
      </div>
      <ul className="man-liste-exos" style={{ marginTop: 8 }}>
        {trouves.map((t) => {
          const etat = etats[cle(t)];
          return (
            <li key={cle(t)} className="man-liste-exo">
              <span className="meta" style={{ flex: "none", minWidth: 120, fontSize: 12.5 }}>
                {t.manuel.titre} · p. {t.page.numero}{t.exercice.numero ? ` · ${t.exercice.numero}` : ""}
              </span>
              <span className="man-liste-nom" title={t.exercice.modele ? "Avec son modèle simplifié" : "Sans modèle simplifié : l'encadré s'imprimera tel quel"}>
                {nomExercice(t.exercice)}{t.exercice.modele ? " ✨" : ""}
              </span>
              {seances.length > 0 && (
                <Select className="select man-seance" value={seanceDe(t)} onChange={(e) => setChoix((c) => ({ ...c, [cle(t)]: e.target.value }))}
                  aria-label="La séance où le poser">
                  {seances.map((s) => <option key={s.id} value={s.id}>Séance {s.numero}{s.titre ? ` · ${s.titre}` : ""}</option>)}
                </Select>
              )}
              <button type="button" className="btn sm" disabled={!seances.length || etat === "encours"} onClick={() => { void ajouter(t); }}>
                {etat === "encours" ? "⏳" : etat === "fait" ? "✓ Ajouté" : "＋ Ajouter"}
              </button>
            </li>
          );
        })}
      </ul>
      {seances.length === 0 && <p className="meta" style={{ fontSize: 12.5, margin: "8px 0 0" }}>Créez d'abord une séance pour y poser un exercice.</p>}
    </div>
  );
}
