import React from "react";
import { useNavigate } from "react-router-dom";
import { api, nowIso } from "../api";
import { seanceDeLaParole } from "../aidesDesSequences";
import { Aide } from "../components/Aide";
import { ApercuFeuille } from "../components/ApercuFeuille";
import type { CompetenceSelectionnee } from "../components/CompetenceTree";
import { toast } from "../components/Toaster";
import { Field, Input, Modal, useAsync } from "../components/ui";
import { resumeDuCadre } from "../demarches";
import type { ClasseC2 } from "../feuillesDesSequences";
import { graineAuHasard } from "../hasard";
import { useGraine } from "../modifierFeuille";
import { avecLaSeanceDesMots, estLaSeanceDesMots } from "../motsDesProblemes";
import { graineDeLaFeuille } from "../sequenceSoustractionPosee";
import {
  CLASSES, classeDesEleves, competenceDeLaDemarche, creerLaSequenceToutefaite, nomSansClasse, ouvreSurLeCalculMental, periodeDeLaDemarche,
  planToutFait, sequencesDuTheme, type PlanToutFait, type ThemeToutFait,
} from "../sequencesToutesFaites";
import { chargerVacances, periodeDuJour } from "../vacances";
import { Colonnes } from "./AteliersMaths";

// ── Fabriquer › les séquences toutes faites d'un domaine ──────────────────
//
// Les déroulements de la fiche d'une séquence, pris tout faits (voir
// sequencesToutesFaites.ts) : la classe — celle des élèves d'abord —, ses
// séquences dans l'ordre de l'année, puis celle qu'on choisit, ses séances et
// leurs feuilles ; la feuille qu'on choisit se voit à droite telle qu'elle
// s'imprimera, du même tirage que celle qu'on créera.

const CLASSE_MEMORISEE = "fabriquer:classeDesSequences";

const lireClasse = (): ClasseC2 | null => {
  try {
    const lue = localStorage.getItem(CLASSE_MEMORISEE);
    return CLASSES.includes(lue as ClasseC2) ? (lue as ClasseC2) : null;
  } catch { return null; }
};

const finDePhrase = (s: string) => (/[.!?…»]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

export function SequencesToutesFaitesTab({ theme }: { theme: ThemeToutFait }) {
  const toutes = React.useMemo(() => sequencesDuTheme(theme), [theme]);
  const classes = CLASSES.filter((c) => toutes.some((s) => s.classes.includes(c)));
  const { data: eleves } = useAsync(() => api.elevesList(), []);
  const [memorisee, setMemorisee] = React.useState<ClasseC2 | null>(lireClasse);
  const classe: ClasseC2 = memorisee && classes.includes(memorisee) ? memorisee : classeDesEleves(eleves ?? [], classes) ?? classes[0] ?? "CP";
  const choisirClasse = (c: ClasseC2) => {
    setMemorisee(c);
    try { localStorage.setItem(CLASSE_MEMORISEE, c); } catch { /* stockage indisponible */ }
  };
  // La compétence que chaque séquence vise, et la période que le programme lui fixe : de quoi les ranger dans l'ordre de l'année.
  const { data: referentiels } = useAsync(() => api.referentielsList(), []);
  const { data: periodeDuMoment } = useAsync(async () => {
    const jour = nowIso().slice(0, 10);
    const vacances = await chargerVacances(jour).catch(() => []);
    return periodeDuJour(jour, Array.isArray(vacances) ? vacances : []);
  }, []);
  const infos = React.useMemo(() => {
    const sortie = new Map<string, { competence: CompetenceSelectionnee | null; periode: number | null }>();
    for (const s of toutes) {
      if (!s.classes.includes(classe)) continue;
      const fixee = periodeDeLaDemarche(s.demarche.id, classe);
      const competence = referentiels ? competenceDeLaDemarche(referentiels, s.demarche.id, classe, fixee ?? periodeDuMoment ?? 1) : null;
      sortie.set(s.demarche.id, { competence, periode: fixee ?? periodeDeLaDemarche(s.demarche.id, classe, competence?.competenceTitre ?? "") });
    }
    return sortie;
  }, [toutes, classe, referentiels, periodeDuMoment]);
  const liste = React.useMemo(() => toutes.filter((s) => s.classes.includes(classe))
    .map((s, i) => ({ s, i, p: infos.get(s.demarche.id)?.periode ?? 6 }))
    .sort((a, b) => a.p - b.p || a.i - b.i).map(({ s }) => s), [toutes, classe, infos]);
  const [choisieId, setChoisieId] = React.useState("");
  const choisie = liste.find((s) => s.demarche.id === choisieId) ?? liste[0];
  const info = choisie ? infos.get(choisie.demarche.id) : undefined;
  // La période : celle du programme, sinon celle d'aujourd'hui ; on la change pour la séquence qu'on regarde.
  const cle = choisie ? `${choisie.demarche.id}:${classe}` : "";
  const [periodes, setPeriodes] = React.useState<Record<string, number>>({});
  const periode = periodes[cle] ?? info?.periode ?? periodeDuMoment ?? 1;
  const [calculMental, setCalculMental] = React.useState(true);
  const tout = React.useMemo(() => (choisie
    ? planToutFait(choisie.demarche, classe, periode, { calculMental, competence: info?.competence?.competenceTitre })
    : null), [choisie, classe, periode, calculMental, info]);
  const [graine, setGraine] = useGraine();
  const cleDuPlan = `${cle}:${periode}:${calculMental}`;
  const [feuilleChoisie, setFeuilleChoisie] = React.useState<{ cle: string; k: number }>({ cle: "", k: 0 });
  const k = feuilleChoisie.cle === cleDuPlan ? feuilleChoisie.k : 0;
  const apercu = React.useMemo(() => {
    const f = tout?.plan.feuilles[k];
    if (!f) return null;
    try { return f.fabriquer(graineDeLaFeuille(graine, k)); } catch { return null; }
  }, [tout, k, graine]);
  const [enSequence, setEnSequence] = React.useState(false);
  return (
    <>
      <div className="card stf-choix">
        <div className="stf-tete">
          <div className="seg" role="group" aria-label="La classe">
            {classes.map((c) => (
              <button key={c} type="button" className={c === classe ? "active" : ""} onClick={() => choisirClasse(c)}>{c}</button>
            ))}
          </div>
          <Aide titre="D'où viennent ces séquences" vers="droite">
            <p>Ce sont les déroulements que propose la fiche d'une séquence : les séquences des livrets d'Éduscol, ou bâties sur le programme et sur les guides. Chacune dit sa source.</p>
            <p>Les feuilles viennent des ateliers de Fabriquer, à la classe choisie : chacune se refait dans son atelier.</p>
          </Aide>
        </div>
        <div className="deroulements-possibles" role="radiogroup" aria-label="Les séquences de cette classe">
          {liste.map((s) => {
            const p = infos.get(s.demarche.id)?.periode;
            const n = avecLaSeanceDesMots(s.demarche).seances.length;
            return (
              <button key={s.demarche.id} type="button" role="radio" aria-checked={s === choisie}
                className={`deroulement-choix${s === choisie ? " actif" : ""}`} onClick={() => setChoisieId(s.demarche.id)}>
                <b>{nomSansClasse(s.demarche.nom)}</b>
                <span className="meta">{n} séances{p ? ` · période ${p}` : ""}</span>
              </button>
            );
          })}
        </div>
      </div>
      {choisie && tout && (
        <Colonnes
          gauche={<>
            <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <span>{nomSansClasse(choisie.demarche.nom)} — {classe}</span>
              <Aide titre="D'où vient cette séquence" vers="droite">
                <p>{finDePhrase(choisie.demarche.source)}</p>
                <p>{choisie.demarche.resume}</p>
              </Aide>
            </h3>
            <p className="martiniere-quand">{resumeDuCadre(tout.demarche)}{tout.calculMental ? " — chacune s'ouvre sur le calcul mental La Martinière" : ""}.</p>
            {ouvreSurLeCalculMental(choisie.demarche) && (
              <label className="stf-option">
                <input type="checkbox" checked={calculMental} onChange={(e) => setCalculMental(e.target.checked)} /> 🧮 Le calcul mental La Martinière en tête de chaque séance
              </label>
            )}
            <div className="stf-periode">
              <span className="meta">Période</span>
              <div className="seg" role="group" aria-label="La période de l'année">
                {[1, 2, 3, 4, 5].map((p) => (
                  <button key={p} type="button" className={p === periode ? "active" : ""}
                    onClick={() => setPeriodes((avant) => ({ ...avant, [cle]: p }))}>P{p}</button>
                ))}
              </div>
            </div>
            <ol className="sp-seances">
              {tout.demarche.seances.map((s, i) => (
                <li key={`${i}-${s.titre}`}>
                  <b>{s.titre}</b> <span className="meta">· {s.duree} min</span>
                  <div className="sp-feuilles">
                    {estLaSeanceDesMots(s) && (
                      <span className="sp-feuille sp-feuille-plus" title="Ses mots sont relevés dans les énoncés des feuilles, à la création de la séquence.">📄 Les mots des problèmes</span>
                    )}
                    {tout.plan.feuilles.map((f, j) => (f.seance === i ? (
                      <button key={`${j}-${f.titre}`} type="button" className={`sp-feuille${j === k ? " choisie" : ""}`} aria-pressed={j === k}
                        onClick={() => setFeuilleChoisie({ cle: cleDuPlan, k: j })}>📄 {f.titre}</button>
                    ) : null))}
                  </div>
                </li>
              ))}
            </ol>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn" onClick={() => setGraine(graineAuHasard())}>🎲 Autre tirage</button>
              <button className="btn primary" onClick={() => setEnSequence(true)}>📚 Créer la séquence</button>
            </div>
          </>}
          droite={apercu ? <ApercuFeuille html={apercu.html} style={apercu.style} /> : null}
        />
      )}
      {enSequence && tout && (
        <CreerLaSequence tout={tout} classe={classe} periode={periode} graine={graine}
          competence={info?.competence ?? null} competenceCherchee={Boolean(referentiels)} onClose={() => setEnSequence(false)} />
      )}
    </>
  );
}

/** Avant de créer : le titre, la compétence visée — celle du programme —, et les aides à la tâche. */
function CreerLaSequence({ tout, classe, periode, graine, competence, competenceCherchee, onClose }: {
  tout: PlanToutFait; classe: ClasseC2; periode: number; graine: number;
  competence: CompetenceSelectionnee | null; competenceCherchee: boolean; onClose: () => void;
}) {
  const navigate = useNavigate();
  const [titre, setTitre] = React.useState(tout.demarche.nom);
  const [sequentiel, setSequentiel] = React.useState(true);
  const seanceParole = seanceDeLaParole(tout.demarche.seances);
  const [parole, setParole] = React.useState(true);
  const [enCours, setEnCours] = React.useState(false);
  const [progres, setProgres] = React.useState("");
  const creer = async () => {
    setEnCours(true);
    try {
      const r = await creerLaSequenceToutefaite({
        tout, classe, periode, titre, competence, graine, aides: { sequentiel, parole: parole ? seanceParole : -1 },
        onProgres: setProgres,
        onEchec: (t, e) => toast(`« ${t} » n'a pas pu être fabriquée : ${String(e)}`, { icone: "⚠️" }),
      });
      const total = r.feuilles + r.aides;
      toast(`Séquence créée : ${r.seances} séances, ${total} feuille${total > 1 ? "s" : ""} rangée${total > 1 ? "s" : ""} dans leurs séances`
        + `${r.aides ? `, dont ${r.aides} aide${r.aides > 1 ? "s" : ""} à la tâche` : ""}.`, { icone: "📚" });
      onClose();
      navigate(`/sequences/${r.sequence.id}`);
    } catch (e) {
      toast("Séquence non créée : " + String(e), { icone: "⚠️" });
      setEnCours(false);
      setProgres("");
    }
  };
  return (
    <Modal titre="Créer la séquence" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose} disabled={enCours}>Annuler</button>
        <button className="btn primary" onClick={() => { void creer(); }} disabled={!titre.trim() || enCours}>
          {enCours ? progres || "Création des séances…" : "Créer la séquence"}
        </button>
      </>}>
      <Field label="Titre">
        <Input value={titre} autoFocus onChange={(e) => setTitre(e.target.value)} />
      </Field>
      <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, margin: "0 0 10px" }}>
        {competence
          ? <>🎯 Compétence visée : <b>{competence.competenceTitre}</b> ({classe}, période {periode})</>
          : competenceCherchee
            ? "🎯 La compétence du programme n'est pas dans vos référentiels actifs : la séquence n'en visera pas. Choisissez-la plus tard sur la séquence."
            : "🎯 Recherche de la compétence du programme…"}
      </p>
      <div className="deroulement-rattache">
        <label><input type="checkbox" checked={sequentiel} onChange={(e) => setSequentiel(e.target.checked)} /> 📋 Le séquentiel de chaque séance : ce que l'élève va faire, étape par étape, à cocher</label>
      </div>
      {seanceParole >= 0 && (
        <div className="deroulement-rattache">
          <label><input type="checkbox" checked={parole} onChange={(e) => setParole(e.target.checked)} /> 🎤 Préparer sa prise de parole, dans la séance « {tout.demarche.seances[seanceParole]?.titre} »</label>
        </div>
      )}
    </Modal>
  );
}
