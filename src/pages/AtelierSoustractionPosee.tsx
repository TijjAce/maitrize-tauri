import React from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Aide } from "../components/Aide";
import { ApercuFeuille } from "../components/ApercuFeuille";
import type { CompetenceSelectionnee } from "../components/CompetenceTree";
import { useCompetencesAtelier } from "../components/CompetencesAtelier";
import { toast } from "../components/Toaster";
import { Field, Input, Modal } from "../components/ui";
import { resumeDuCadre } from "../demarches";
import { graineAuHasard } from "../hasard";
import { useGraine } from "../modifierFeuille";
import {
  ATELIER_SOUSTRACTION_POSEE, DEMARCHE_SOUSTRACTION_POSEE, FEUILLES_SOUSTRACTION_POSEE, competenceDeLaSoustraction, creerLaSequenceDeLaSoustraction,
  graineDeLaFeuille,
} from "../sequenceSoustractionPosee";
import { Colonnes } from "./AteliersMaths";

// ── Fabriquer › La soustraction posée — CE1 ───────────────────────────────
//
// Une séquence toute faite (voir sequenceSoustractionPosee) : ses dix
// séances, chacune avec ses feuilles — le calcul mental La Martinière
// d'abord ; la feuille qu'on choisit se voit à droite telle qu'elle
// s'imprimera, du même tirage que celle qu'on créera ; la séquence se crée
// d'un clic, séances et feuilles comprises.

export function SoustractionPoseeTab() {
  const [graine, setGraine] = useGraine();
  const [choisie, setChoisie] = React.useState(0);
  const [enSequence, setEnSequence] = React.useState(false);
  const [competences] = useCompetencesAtelier(ATELIER_SOUSTRACTION_POSEE);
  const demarche = DEMARCHE_SOUSTRACTION_POSEE;
  const feuille = FEUILLES_SOUSTRACTION_POSEE[choisie] ?? FEUILLES_SOUSTRACTION_POSEE[0];
  const apercu = React.useMemo(() => feuille.fabriquer(graineDeLaFeuille(graine, choisie)), [feuille, graine, choisie]);
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          La soustraction posée — CE1
          <Aide titre="D'où vient cette séquence" vers="droite">
            <p>{demarche.source}.</p>
            <p>{demarche.resume}</p>
          </Aide>
        </h3>
        <p className="martiniere-quand">{resumeDuCadre(demarche)} — chacune s'ouvre sur le calcul mental La Martinière.</p>
        <ol className="sp-seances">
          {demarche.seances.map((s, i) => (
            <li key={s.titre}>
              <b>{s.titre}</b> <span className="meta">· {s.duree} min</span>
              <div className="sp-feuilles">
                {FEUILLES_SOUSTRACTION_POSEE.map((f, k) => (f.seance === i ? (
                  <button key={`${k}-${f.titre}`} type="button" className={`sp-feuille${k === choisie ? " choisie" : ""}`} aria-pressed={k === choisie}
                    onClick={() => setChoisie(k)}>📄 {f.titre}</button>
                ) : null))}
              </div>
            </li>
          ))}
        </ol>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn" onClick={() => setGraine(graineAuHasard())}>🎲 Autre tirage</button>
          <button className="btn primary" onClick={() => setEnSequence(true)}>📚 Créer la séquence</button>
        </div>
        {enSequence && <CreerLaSequence graine={graine} competences={competences} onClose={() => setEnSequence(false)} />}
      </>}
      droite={<ApercuFeuille html={apercu.html} style={apercu.style} />}
    />
  );
}

/** Avant de créer : le titre, et la compétence visée — celle de l'atelier, sinon celle du programme. */
function CreerLaSequence({ graine, competences, onClose }: { graine: number; competences: CompetenceSelectionnee[]; onClose: () => void }) {
  const navigate = useNavigate();
  const [titre, setTitre] = React.useState(DEMARCHE_SOUSTRACTION_POSEE.nom);
  const [enCours, setEnCours] = React.useState(false);
  const [duProgramme, setDuProgramme] = React.useState<CompetenceSelectionnee | null>(null);
  React.useEffect(() => {
    if (competences.length) return;
    let vivant = true;
    api.referentielsList().then((refs) => { if (vivant) setDuProgramme(competenceDeLaSoustraction(refs)); }).catch(() => {});
    return () => { vivant = false; };
  }, [competences.length]);
  const visees = competences.length ? competences : duProgramme ? [duProgramme] : [];
  const creer = async () => {
    setEnCours(true);
    try {
      const { sequence, seances, feuilles } = await creerLaSequenceDeLaSoustraction(titre, visees, graine);
      toast(`Séquence créée : ${seances} séances, ${feuilles} feuilles rangées dans leurs séances.`, { icone: "📚" });
      onClose();
      navigate(`/sequences/${sequence.id}`);
    } catch (e) {
      toast("Séquence non créée : " + String(e), { icone: "⚠️" });
      setEnCours(false);
    }
  };
  return (
    <Modal titre="La soustraction posée, en séquence" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose} disabled={enCours}>Annuler</button>
        <button className="btn primary" onClick={() => { void creer(); }} disabled={!titre.trim() || enCours}>
          {enCours ? "Création des séances et des feuilles…" : "Créer la séquence"}
        </button>
      </>}>
      <Field label="Titre">
        <Input value={titre} autoFocus onChange={(e) => setTitre(e.target.value)} />
      </Field>
      <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, margin: 0 }}>
        {visees.length
          ? <>🎯 Compétence visée : <b>{visees[0].competenceTitre}</b>{visees[0].niveau ? ` (${visees[0].niveau})` : ""}</>
          : "🎯 La compétence du programme n'est pas dans vos référentiels actifs : la séquence n'en visera pas. Choisissez-la plus tard sur la séquence."}
      </p>
    </Modal>
  );
}
