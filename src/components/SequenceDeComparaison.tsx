import React from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Field, Input, Modal } from "./ui";
import { toast } from "./Toaster";
import type { CompetenceSelectionnee } from "./CompetenceTree";
import { demarcheDe, resumeDuCadre } from "../demarches";
import { exempleDuSavoir, niveauDe, type ReglagesComparer } from "../comparerNombres";
import { fr } from "../nombres";
import {
  DEMARCHE_COMPARER, FEUILLES_DE_LA_SEQUENCE, competenceDuProgramme, creerLaSequenceDeComparaison, titreDeLaSequence,
} from "../sequenceComparer";

// ── Une séquence avec le jeu de l'atelier ─────────────────────────────────
//
// La séquence du guide CP, ses séances et, dans chacune, les feuilles qui la
// servent — aux nombres de l'atelier. On voit ce qui va se créer avant de le
// créer ; on arrive ensuite sur la séquence.

export function SequenceDeComparaison({ reglages, competences, onClose }: {
  reglages: ReglagesComparer; competences: CompetenceSelectionnee[]; onClose: () => void;
}) {
  const navigate = useNavigate();
  const demarche = demarcheDe(DEMARCHE_COMPARER);
  const [titre, setTitre] = React.useState(() => titreDeLaSequence(reglages));
  const [enCours, setEnCours] = React.useState(false);
  // Sans compétence choisie pour l'atelier, celle du programme au CP, prise dans les référentiels.
  const [duProgramme, setDuProgramme] = React.useState<CompetenceSelectionnee | null>(null);
  React.useEffect(() => {
    if (competences.length) return;
    let vivant = true;
    api.referentielsList().then((refs) => { if (vivant) setDuProgramme(competenceDuProgramme(refs, niveauDe(reglages))); }).catch(() => {});
    return () => { vivant = false; };
  }, [competences.length, reglages]);
  const visees = competences.length ? competences : duProgramme ? [duProgramme] : [];
  if (!demarche) return null;
  const niv = niveauDe(reglages);
  const [a, b] = exempleDuSavoir(niv);
  const creer = async () => {
    setEnCours(true);
    try {
      const { sequence, feuilles } = await creerLaSequenceDeComparaison(reglages, titre, visees);
      toast(`Séquence créée : ${demarche.seances.length} séances, ${feuilles} feuilles rangées dans leurs séances.`, { icone: "📚" });
      onClose();
      navigate(`/sequences/${sequence.id}`);
    } catch (e) {
      toast("Séquence non créée : " + String(e), { icone: "⚠️" });
      setEnCours(false);
    }
  };
  return (
    <Modal large titre="Une séquence avec ce jeu, d'après le guide CP" onClose={onClose}
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
        La séquence du guide « Pour enseigner les nombres, le calcul et la résolution de problèmes au CP » (p. 40-46) : deux collections
        qu'on ne voit pas ensemble, la comparaison par l'écriture chiffrée, puis toutes les écritures, et ordonner, intercaler, encadrer
        par le jeu. Chaque séance en quatre temps. {resumeDuCadre(demarche)}.
      </p>
      <ol style={{ margin: "0 0 10px", paddingLeft: 22, display: "grid", gap: 7 }}>
        {demarche.seances.map((s, i) => (
          <li key={s.titre}>
            <b>{s.titre}</b> <span className="meta">· {s.duree} min</span>
            {FEUILLES_DE_LA_SEQUENCE.filter((f) => f.seance === i).map((f) => (
              <span key={f.titre} className="chip" style={{ marginLeft: 6 }}>📄 {f.titre.toLowerCase()}</span>
            ))}
            <div className="meta" style={{ fontSize: 12.5, lineHeight: 1.45 }}>{s.objectifs}</div>
          </li>
        ))}
      </ol>
      <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, margin: "0 0 6px" }}>
        Les séances citent les exemples du guide (71 et 68) ; les feuilles prennent les nombres de l'atelier, {niv.libelle} :
        {" "}{fr(a)} et {fr(b)} pour les deux collections.
      </p>
      <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, margin: 0 }}>
        {competences.length
          ? <>🎯 Compétence visée : <b>{competences[0].competenceTitre}</b></>
          : duProgramme
            ? <>🎯 Compétence visée : <b>{duProgramme.competenceTitre}</b> ({duProgramme.niveau ?? niv.classe}) — {duProgramme.referentielNom}</>
            : "🎯 La compétence « Comparer, encadrer, intercaler des nombres entiers » n'est pas dans vos référentiels actifs : la séquence n'en visera pas. Choisissez-la plus tard sur la séquence."}
      </p>
    </Modal>
  );
}
