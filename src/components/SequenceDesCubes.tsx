import React from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Field, Input, Modal } from "./ui";
import { toast } from "./Toaster";
import type { CompetenceSelectionnee } from "./CompetenceTree";
import { demarcheDe, resumeDuCadre } from "../demarches";
import { niveauCubes, type ReglagesCubes } from "../cubesNumeration";
import {
  DEMARCHE_CUBES, FEUILLES_DE_LA_SEQUENCE_CUBES, competenceDuProgrammeCubes, creerLaSequenceDesCubes, titreDeLaSequenceCubes,
} from "../sequenceCubes";

// ── Une séquence avec les feuilles de l'atelier ───────────────────────────
//
// Le chemin du guide CP — la dizaine, l'écriture chiffrée, les collections à
// regrouper, les unités de numération, toutes les représentations —, ses
// séances et, dans chacune, les feuilles qui la servent, aux nombres de
// l'atelier. On voit ce qui va se créer avant de le créer ; on arrive
// ensuite sur la séquence.

export function SequenceDesCubes({ reglages, competences, onClose }: {
  reglages: ReglagesCubes; competences: CompetenceSelectionnee[]; onClose: () => void;
}) {
  const navigate = useNavigate();
  const demarche = demarcheDe(DEMARCHE_CUBES);
  const [titre, setTitre] = React.useState(() => titreDeLaSequenceCubes(reglages));
  const [enCours, setEnCours] = React.useState(false);
  const niv = niveauCubes(reglages.niveau);
  // Sans compétence choisie pour l'atelier, celle du programme à la classe du niveau, prise dans les référentiels.
  const [duProgramme, setDuProgramme] = React.useState<CompetenceSelectionnee | null>(null);
  React.useEffect(() => {
    if (competences.length) return;
    let vivant = true;
    api.referentielsList().then((refs) => { if (vivant) setDuProgramme(competenceDuProgrammeCubes(refs, niveauCubes(reglages.niveau))); }).catch(() => {});
    return () => { vivant = false; };
  }, [competences.length, reglages.niveau]);
  const visees = competences.length ? competences : duProgramme ? [duProgramme] : [];
  if (!demarche) return null;
  const creer = async () => {
    setEnCours(true);
    try {
      const { sequence, feuilles } = await creerLaSequenceDesCubes(reglages, titre, visees);
      toast(`Séquence créée : ${demarche.seances.length} séances, ${feuilles} feuilles rangées dans leurs séances.`, { icone: "📚" });
      onClose();
      navigate(`/sequences/${sequence.id}`);
    } catch (e) {
      toast("Séquence non créée : " + String(e), { icone: "⚠️" });
      setEnCours(false);
    }
  };
  return (
    <Modal large titre="Une séquence avec cet atelier, d'après le guide CP" onClose={onClose}
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
        Le chemin du guide « Pour enseigner les nombres, le calcul et la résolution de problèmes au CP » (chapitres 1 et 4) : la dizaine par le jeu,
        l'écriture chiffrée, les collections à regrouper, les unités de numération dans tous les sens, puis toutes les représentations.
        Chaque séance en quatre temps. {resumeDuCadre(demarche)}.
      </p>
      <ol style={{ margin: "0 0 10px", paddingLeft: 22, display: "grid", gap: 7 }}>
        {demarche.seances.map((s, i) => (
          <li key={s.titre}>
            <b>{s.titre}</b> <span className="meta">· {s.duree} min</span>
            {FEUILLES_DE_LA_SEQUENCE_CUBES.filter((f) => f.seance === i).map((f) => (
              <span key={f.titre} className="chip" style={{ marginLeft: 6 }}>📄 {f.titre.toLowerCase()}</span>
            ))}
            <div className="meta" style={{ fontSize: 12.5, lineHeight: 1.45 }}>{s.objectifs}</div>
          </li>
        ))}
      </ol>
      <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, margin: "0 0 6px" }}>
        Les séances citent les exemples du guide, au CP (34, 5 dizaines et 18 unités) ; les feuilles prennent les nombres de l'atelier :
        {" "}{niv.classe}, {niv.libelle}{niv.classe === "CP" ? "" : ", avec les centaines" + (niv.classe === "CE2" ? " et les milliers" : "")}.
      </p>
      <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, margin: 0 }}>
        {competences.length
          ? <>🎯 Compétence visée : <b>{competences[0].competenceTitre}</b></>
          : duProgramme
            ? <>🎯 Compétence visée : <b>{duProgramme.competenceTitre}</b> ({duProgramme.niveau ?? niv.classe}) — {duProgramme.referentielNom}</>
            : "🎯 La compétence « Connaitre et utiliser diverses représentations d'un nombre » n'est pas dans vos référentiels actifs : la séquence n'en visera pas. Choisissez-la plus tard sur la séquence."}
      </p>
    </Modal>
  );
}
