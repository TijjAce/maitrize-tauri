import React from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Field, Input, Modal } from "./ui";
import { toast } from "./Toaster";
import type { CompetenceSelectionnee } from "./CompetenceTree";
import { chargerImages } from "./ChoixPicto";
import { demarcheDe, resumeDuCadre } from "../demarches";
import { idsDes } from "../supportsVisuels";
import type { ReglagesSuites } from "../suitesImages";
import {
  DEMARCHE_SUITES, competenceDuProgramme, creerLaSequenceDeSuites, feuillesPour, titreDeLaFeuille, titreDeLaSequence,
} from "../sequenceSuites";

// ── Une séquence avec les images de l'atelier ─────────────────────────────
//
// La suite d'images posée, on l'installe dans une séquence : vécue ou
// entendue d'abord, puis ordonnée ensemble, en petit groupe, seul, sans
// aide, racontée à chaque fois — et dans chaque séance les feuilles qui la
// servent. On voit ce qui va se créer avant de le créer ; on arrive ensuite
// sur la séquence.

export function SequenceDeSuites({ reglages, competences, onClose }: {
  reglages: ReglagesSuites; competences: CompetenceSelectionnee[]; onClose: () => void;
}) {
  const navigate = useNavigate();
  const demarche = demarcheDe(DEMARCHE_SUITES);
  const [titre, setTitre] = React.useState(() => titreDeLaSequence(reglages));
  const [enCours, setEnCours] = React.useState(false);
  // Sans compétence choisie pour l'atelier, celle du programme à cet âge, prise dans les référentiels.
  const [duProgramme, setDuProgramme] = React.useState<CompetenceSelectionnee | null>(null);
  React.useEffect(() => {
    if (competences.length) return;
    let vivant = true;
    api.referentielsList().then((refs) => { if (vivant) setDuProgramme(competenceDuProgramme(refs, reglages.niveau)); }).catch(() => {});
    return () => { vivant = false; };
  }, [competences.length, reglages.niveau]);
  const visees = competences.length ? competences : duProgramme ? [duProgramme] : [];
  const feuilles = React.useMemo(() => feuillesPour(reglages), [reglages]);
  if (!demarche) return null;
  const creer = async () => {
    setEnCours(true);
    try {
      const images = await chargerImages(idsDes(reglages.etapes));
      const { sequence, feuilles: posees } = await creerLaSequenceDeSuites(reglages, titre, visees, images);
      toast(`Séquence créée : ${demarche.seances.length} séances, ${posees} feuilles rangées dans leurs séances.`, { icone: "📚" });
      onClose();
      navigate(`/sequences/${sequence.id}`);
    } catch (e) {
      toast("Séquence non créée : " + String(e), { icone: "⚠️" });
      setEnCours(false);
    }
  };
  return (
    <Modal large titre="Une séquence avec ces images" onClose={onClose}
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
        La démarche du programme 2025 et de la ressource Éduscol « La compréhension des récits de fiction » : la suite vécue ou entendue
        plusieurs fois, rejouée, puis ordonnée ensemble, en petit groupe, seul et sans aide, racontée à chaque fois avec les mots du temps — et
        chacun observé, à distance.
        {" "}{resumeDuCadre(demarche)}. Chaque séance reçoit ses feuilles et la note du matériel à préparer.
      </p>
      <ol style={{ margin: "0 0 10px", paddingLeft: 22, display: "grid", gap: 7 }}>
        {demarche.seances.map((s, i) => (
          <li key={s.titre}>
            <b>{s.titre}</b> <span className="meta">· {s.duree} min</span>
            {feuilles.filter((f) => f.seance === i).map((f) => (
              <span key={titreDeLaFeuille(f)} className="chip" style={{ marginLeft: 6 }}>📄 {titreDeLaFeuille(f).toLowerCase()}</span>
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
            : "🎯 La compétence de chronologie de cet âge n'est pas dans vos référentiels actifs : la séquence n'en visera pas. Choisissez-la plus tard sur la séquence."}
      </p>
    </Modal>
  );
}
