import React from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Field, Input, Modal } from "./ui";
import { toast } from "./Toaster";
import type { CompetenceSelectionnee } from "./CompetenceTree";
import { chargerImages } from "./ChoixPicto";
import { demarcheDe, resumeDuCadre } from "../demarches";
import { idsDesImages, nomDeLaForme, type ReglagesCategoriser } from "../categoriser";
import {
  DEMARCHE_CATEGORISER, competenceDuProgramme, creerLaSequenceDeCategorisation, feuillesPour, titreDeLaSequence,
} from "../sequenceCategoriser";

// ── Une séquence avec les catégories de l'atelier ─────────────────────────
//
// Les catégories composées, on les installe dans une séquence : les quatre
// étapes du programme, séance par séance, et dans chacune la feuille qui la
// sert. On voit ce qui va se créer avant de le créer ; on arrive ensuite sur
// la séquence.

export function SequenceDeCategorisation({ reglages, competences, onClose }: {
  reglages: ReglagesCategoriser; competences: CompetenceSelectionnee[]; onClose: () => void;
}) {
  const navigate = useNavigate();
  const demarche = demarcheDe(DEMARCHE_CATEGORISER);
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
      const images = await chargerImages(idsDesImages(reglages.categories));
      const { sequence, feuilles: posees } = await creerLaSequenceDeCategorisation(reglages, titre, visees, images);
      toast(`Séquence créée : ${demarche.seances.length} séances, ${posees} feuilles rangées dans leurs séances.`, { icone: "📚" });
      onClose();
      navigate(`/sequences/${sequence.id}`);
    } catch (e) {
      toast("Séquence non créée : " + String(e), { icone: "⚠️" });
      setEnCours(false);
    }
  };
  return (
    <Modal large titre="Une séquence avec ces catégories" onClose={onClose}
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
        Les quatre étapes du programme de maternelle et du guide Éduscol du vocabulaire : apporter les mots dans un univers de référence,
        les structurer en catégories, les mémoriser par des jeux courts et répétés, les réutiliser — puis observer, à distance.
        {" "}{resumeDuCadre(demarche)}. Chaque séance reçoit sa feuille et la note du matériel à préparer.
      </p>
      <ol style={{ margin: "0 0 10px", paddingLeft: 22, display: "grid", gap: 7 }}>
        {demarche.seances.map((s, i) => (
          <li key={s.titre}>
            <b>{s.titre}</b> <span className="meta">· {s.duree} min</span>
            {feuilles.filter((f) => f.seance === i).map((f) => (
              <span key={f.forme} className="chip" style={{ marginLeft: 6 }}>📄 {nomDeLaForme(f.forme).toLowerCase()}</span>
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
            : "🎯 La compétence « Organiser les mots en catégorie et en réseau » n'est pas dans vos référentiels actifs : la séquence n'en visera pas. Choisissez-la plus tard sur la séquence."}
      </p>
    </Modal>
  );
}
