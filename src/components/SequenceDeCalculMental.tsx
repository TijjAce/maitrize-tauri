import React from "react";
import { useNavigate } from "react-router-dom";
import { Field, Input, Modal } from "./ui";
import { toast } from "./Toaster";
import type { CompetenceSelectionnee } from "./CompetenceTree";
import { demarcheDe, resumeDuCadre } from "../demarches";
import { objectifsRetenus, type ReglagesMartiniere } from "../martiniere";
import { problemesAssocies } from "../problemesAssocies";
import { materielPour } from "../materielManipulation";
import {
  DEMARCHE_CALCUL_MENTAL, FEUILLES_DE_LA_SEQUENCE, SEANCE_DES_PROBLEMES, creerLaSequenceDeCalcul, titreDeLaSequence, type FeuilleDeSequence,
} from "../sequenceCalculMental";

// ── Une séquence avec la feuille du calcul mental ─────────────────────────
//
// La feuille réglée, on la met dans une séquence : le plan des guides Éduscol,
// séance par séance, et la feuille de chaque séance d'entraînement. On voit
// ce qui va se créer avant de le créer ; on arrive ensuite sur la séquence.

const ceQuiSePose = (f: FeuilleDeSequence) =>
  f.celleDeLEcran ? "la feuille à l'écran"
    : f.forme === "decouverte" ? "la fiche de découverte : chercher, expliquer, retenir"
    : f.forme === "materiel" ? "le matériel de manipulation"
    : f.forme === "evaluation" ? "l'évaluation finale et son corrigé"
    : f.forme === "ecrit" ? (f.uneSerie ? "une série écrite courte, en temps limité" : "le test de fluence et son corrigé")
    : "un autre tirage du même objectif";

export function SequenceDeCalculMental({ reglages, graine, competences, onClose }: {
  reglages: ReglagesMartiniere; graine: number; competences: CompetenceSelectionnee[]; onClose: () => void;
}) {
  const navigate = useNavigate();
  const demarche = demarcheDe(DEMARCHE_CALCUL_MENTAL);
  const [titre, setTitre] = React.useState(() => titreDeLaSequence(reglages));
  const [enCours, setEnCours] = React.useState(false);
  const objectif = objectifsRetenus(reglages)[0];
  const associes = React.useMemo(() => (objectif ? problemesAssocies(objectif, reglages.tables ?? []) : null), [objectif, reglages.tables]);
  const materiel = React.useMemo(() => (objectif ? materielPour(objectif, reglages.tables ?? []) : null), [objectif, reglages.tables]);
  if (!demarche) return null;
  const creer = async () => {
    setEnCours(true);
    try {
      const { sequence, feuilles } = await creerLaSequenceDeCalcul(reglages, graine, titre, competences);
      toast(`Séquence créée : ${demarche.seances.length} séances, ${feuilles} feuilles rangées dans leurs séances.`, { icone: "📚" });
      onClose();
      navigate(`/sequences/${sequence.id}`);
    } catch (e) {
      toast("Séquence non créée : " + String(e), { icone: "⚠️" });
      setEnCours(false);
    }
  };
  return (
    <Modal large titre="Une séquence avec cette feuille" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose} disabled={enCours}>Annuler</button>
        <button className="btn primary" onClick={() => { void creer(); }} disabled={!titre.trim() || enCours}>
          {enCours ? "Création des séances et des feuilles…" : "Créer la séquence"}
        </button>
      </>}>
      <Field label="Titre">
        <Input value={titre} autoFocus onChange={(e) => setTitre(e.target.value)} />
      </Field>
      <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
        Le plan des guides Éduscol pour le calcul mental : une découverte en séance longue, puis des séances courtes et quotidiennes,
        chacune ouverte par un échauffement — {resumeDuCadre(demarche)}. Les feuilles se rangent dans leurs séances et s'impriment
        avec le cahier journal du jour où la séance est posée.
      </p>
      <ol style={{ margin: "0 0 10px", paddingLeft: 22, display: "grid", gap: 7 }}>
        {demarche.seances.map((s, i) => {
          const feuilles = FEUILLES_DE_LA_SEQUENCE.filter((x) => x.seance === i);
          return (
            <li key={s.titre}>
              <b>{s.titre}</b> <span className="meta">· {s.duree} min</span>
              {feuilles.map((f) => (
                <span key={f.forme} className="chip" style={{ marginLeft: 6 }}>
                  {f.forme === "materiel" ? `🧱 ${materiel ? materiel.nom.toLowerCase() : ceQuiSePose(f)}` : `📄 ${ceQuiSePose(f)}`}
                </span>
              ))}
              {i === SEANCE_DES_PROBLEMES && associes && <span className="chip" style={{ marginLeft: 6 }}>🧩 {associes.nom.toLowerCase()}</span>}
              <div className="meta" style={{ fontSize: 12.5, lineHeight: 1.45 }}>{s.objectifs}</div>
            </li>
          );
        })}
      </ol>
      <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, margin: 0 }}>
        {competences.length
          ? <>🎯 Compétence visée : <b>{competences[0].competenceTitre}</b></>
          : "🎯 Aucune compétence choisie pour cet objectif : la séquence n'en visera pas. Choisissez-la d'abord dans « 🖨 La feuille », ou plus tard sur la séquence."}
      </p>
    </Modal>
  );
}
