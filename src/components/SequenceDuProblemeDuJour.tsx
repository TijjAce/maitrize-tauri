import React from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Field, Input, Modal } from "./ui";
import { toast } from "./Toaster";
import type { CompetenceSelectionnee } from "./CompetenceTree";
import { chargerImages } from "./ChoixPicto";
import { resumeDuCadre } from "../demarches";
import type { ReglagesProbleme } from "../problemeDuJour";
import {
  competenceDuProgramme, creerLaSequenceDuProblemeDuJour, demarcheDeLaPeriode, feuillesDeLaPeriode, idsDeLaPeriode, titreDeLaSequence,
} from "../sequenceProblemeDuJour";

// ── La période du problème du jour, en séquence ───────────────────────────
//
// On voit ce qui va se créer avant de le créer : la séance des mots, puis
// une séance par semaine — à reprendre chaque jour —, chacune avec ses
// feuilles. Les problèmes sont ceux que l'atelier montre : le même tirage.
// On arrive ensuite sur la séquence.

export function SequenceDuProblemeDuJour({ reglages, graine, competences, banque, onClose }: {
  reglages: ReglagesProbleme; graine: number; competences: CompetenceSelectionnee[]; banque: boolean; onClose: () => void;
}) {
  const navigate = useNavigate();
  const demarche = React.useMemo(() => demarcheDeLaPeriode(reglages), [reglages]);
  const feuilles = React.useMemo(() => feuillesDeLaPeriode(reglages), [reglages]);
  const [titre, setTitre] = React.useState(() => titreDeLaSequence(reglages));
  const [enCours, setEnCours] = React.useState(false);
  // Sans compétence choisie pour l'atelier, celle du programme que sert cette sorte de problème, à cet âge.
  const [duProgramme, setDuProgramme] = React.useState<CompetenceSelectionnee | null>(null);
  React.useEffect(() => {
    if (competences.length) return;
    let vivant = true;
    api.referentielsList().then((refs) => { if (vivant) setDuProgramme(competenceDuProgramme(refs, reglages)); }).catch(() => {});
    return () => { vivant = false; };
  }, [competences.length, reglages]);
  const visees = competences.length ? competences : duProgramme ? [duProgramme] : [];
  const creer = async () => {
    setEnCours(true);
    try {
      const images = banque ? await chargerImages(idsDeLaPeriode(reglages)) : {};
      const { sequence, seances, feuilles: posees } = await creerLaSequenceDuProblemeDuJour(reglages, titre, visees, images, graine);
      toast(`Séquence créée : ${seances} séances, ${posees} feuilles rangées dans leurs séances.`, { icone: "📚" });
      onClose();
      navigate(`/sequences/${sequence.id}`);
    } catch (e) {
      toast("Séquence non créée : " + String(e), { icone: "⚠️" });
      setEnCours(false);
    }
  };
  return (
    <Modal large titre="La période en séquence" onClose={onClose}
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
        La séance des mots des problèmes, puis une séance par semaine, à reprendre chaque jour en dix minutes : son déroulement porte
        le problème de chaque jour et sa réponse. {resumeDuCadre(demarche)}. Chaque séance reçoit ses feuilles et la note du matériel à préparer.
      </p>
      <ol style={{ margin: "0 0 10px", paddingLeft: 22, display: "grid", gap: 7 }}>
        {demarche.seances.map((s, i) => (
          <li key={`${i}-${s.titre}`}>
            <b>{s.titre}</b> <span className="meta">· {s.duree} min{i > 0 ? ", chaque jour" : ""}</span>
            {i === 0 && <span className="chip" style={{ marginLeft: 6 }}>📄 les mots des problèmes</span>}
            {feuilles.filter((f) => f.seance === i - 1).map((f) => (
              <span key={f.titre} className="chip" style={{ marginLeft: 6 }}>📄 {f.titre.toLowerCase()}</span>
            ))}
            <div className="meta" style={{ fontSize: 12.5, lineHeight: 1.45 }}>{s.objectifs}</div>
          </li>
        ))}
      </ol>
      <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, margin: 0 }}>
        {competences.length
          ? <>🎯 Compétence visée : <b>{competences[0].competenceTitre}</b></>
          : duProgramme
            ? <>🎯 Compétence visée : <b>{duProgramme.competenceTitre}</b> ({duProgramme.niveau ?? reglages.niveau}) — {duProgramme.referentielNom}</>
            : "🎯 La compétence du programme que sert cette sorte de problème n'est pas dans vos référentiels actifs : la séquence n'en visera pas. Choisissez-la plus tard sur la séquence."}
      </p>
    </Modal>
  );
}
