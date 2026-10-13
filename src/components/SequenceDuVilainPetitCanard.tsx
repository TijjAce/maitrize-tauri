import React from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Field, Input, Modal } from "./ui";
import { toast } from "./Toaster";
import type { CompetenceSelectionnee } from "./CompetenceTree";
import { chargerImages } from "./ChoixPicto";
import { demarcheDe, resumeDuCadre } from "../demarches";
import { DEMARCHE_VPC } from "../demarchesVilainPetitCanard";
import { competenceDuProgramme } from "../sequenceCategoriser";
import { creerLaSequenceDuVilainPetitCanard, titreDeLaSequence } from "../sequenceVilainPetitCanard";
import { IDS_VPC, feuillesDeLaSequence, type NiveauVpc } from "../vilainPetitCanard";

// ── La séquence du Vilain Petit Canard, d'un clic ─────────────────────────
//
// Les douze séances de la démarche du guide, et dans chacune ses feuilles :
// on voit ce qui va se créer avant de le créer ; on arrive ensuite sur la
// séquence.

export function SequenceDuVilainPetitCanard({ niveau, competences, onClose }: {
  niveau: NiveauVpc; competences: CompetenceSelectionnee[]; onClose: () => void;
}) {
  const navigate = useNavigate();
  const demarche = demarcheDe(DEMARCHE_VPC[niveau]);
  const [titre, setTitre] = React.useState(() => titreDeLaSequence(niveau));
  const [enCours, setEnCours] = React.useState(false);
  // Sans compétence choisie pour l'atelier, celle du programme à cet âge, prise dans les référentiels.
  const [duProgramme, setDuProgramme] = React.useState<CompetenceSelectionnee | null>(null);
  React.useEffect(() => {
    if (competences.length) return;
    let vivant = true;
    api.referentielsList().then((refs) => { if (vivant) setDuProgramme(competenceDuProgramme(refs, niveau)); }).catch(() => {});
    return () => { vivant = false; };
  }, [competences.length, niveau]);
  const visees = competences.length ? competences : duProgramme ? [duProgramme] : [];
  const feuilles = React.useMemo(() => feuillesDeLaSequence(niveau), [niveau]);
  if (!demarche) return null;
  const creer = async () => {
    setEnCours(true);
    try {
      const images = await chargerImages(IDS_VPC);
      const { sequence, feuilles: posees } = await creerLaSequenceDuVilainPetitCanard(niveau, titre, visees, images);
      toast(`Séquence créée : ${demarche.seances.length} séances, ${posees} feuilles rangées dans leurs séances.`, { icone: "📚" });
      onClose();
      navigate(`/sequences/${sequence.id}`);
    } catch (e) {
      toast("Séquence non créée : " + String(e), { icone: "⚠️" });
      setEnCours(false);
    }
  };
  return (
    <Modal large titre={`La séquence du Vilain Petit Canard (${niveau})`} onClose={onClose}
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
        Les quatre phases du guide Éduscol du vocabulaire en maternelle : l'univers de référence, la découverte de l'album, la structuration,
        la mémorisation et le réinvestissement — puis l'observation, à distance. {resumeDuCadre(demarche)}. Chaque séance reçoit ses feuilles
        et la note du matériel à préparer. L'album reste le vôtre : ni son texte ni ses images ne sont dans l'application.
      </p>
      <ol style={{ margin: "0 0 10px", paddingLeft: 22, display: "grid", gap: 7 }}>
        {demarche.seances.map((s, i) => (
          <li key={s.titre}>
            <b>{s.titre}</b> <span className="meta">· {s.duree} min</span>
            {feuilles.filter((f) => f.seance === i).map((f) => (
              <span key={f.id} className="chip" style={{ marginLeft: 6 }}>📄 {f.titre.toLowerCase()}</span>
            ))}
            <div className="meta" style={{ fontSize: 12.5, lineHeight: 1.45 }}>{s.objectifs}</div>
          </li>
        ))}
      </ol>
      <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, margin: 0 }}>
        {competences.length
          ? <>🎯 Compétence visée : <b>{competences[0].competenceTitre}</b></>
          : duProgramme
            ? <>🎯 Compétence visée : <b>{duProgramme.competenceTitre}</b> ({duProgramme.niveau ?? niveau}) — {duProgramme.referentielNom}</>
            : "🎯 La compétence « Organiser les mots en catégorie et en réseau » n'est pas dans vos référentiels actifs : la séquence n'en visera pas. Choisissez-la plus tard sur la séquence."}
      </p>
    </Modal>
  );
}
