import React from "react";
import { useNavigate } from "react-router-dom";
import { api, nowIso } from "../api";
import { seanceDeLaParole } from "../aidesDesSequences";
import { Aide } from "../components/Aide";
import { ApercuFeuille } from "../components/ApercuFeuille";
import type { CompetenceSelectionnee } from "../components/CompetenceTree";
import { openCtx } from "../components/ctxmenu";
import { toast } from "../components/Toaster";
import { Empty, Field, Input, Modal, useAsync } from "../components/ui";
import { useMemoire } from "../components/useMemoire";
import { resumeDuCadre } from "../demarches";
import type { ClasseC2 } from "../feuillesDesSequences";
import { graineAuHasard } from "../hasard";
import { useGraine } from "../modifierFeuille";
import { avecLaSeanceDesMots, estLaSeanceDesMots } from "../motsDesProblemes";
import { lireProfils } from "../planDeLaClasse";
import { graineDeLaFeuille } from "../sequenceSoustractionPosee";
import {
  CLE_PERIODES, COLONNES_DU_TABLEAU, PERIODES_DE_L_ANNEE, competenceDeLaDemarche, creerLaSequenceToutefaite, lirePeriodes, nomSansClasse,
  ouvreSurLeCalculMental, planToutFait, repereDeLaDemarche, sequencesToutesFaites, tableauDesSequences,
  type ContexteDeLaClasse, type PlanToutFait, type SequenceToutefaite,
} from "../sequencesToutesFaites";
import { chargerVacances, periodeDuJour } from "../vacances";
import { Colonnes } from "./AteliersMaths";

// ── Fabriquer › Séquences toutes faites › un dossier par classe ───────────
//
// Les déroulements de la fiche d'une séquence, pris tout faits (voir
// sequencesToutesFaites.ts), dans le dossier de leur classe, en tableau
// (demande de l'enseignant) : les familles en lignes, domaine par domaine,
// les périodes de l'année en colonnes. Une séquence se glisse d'une période
// à l'autre de sa ligne — ou se range au clic droit — : c'est la
// programmation de la classe. Celle qu'on choisit s'ouvre sous sa ligne :
// ses séances, leurs feuilles, et à droite la feuille choisie telle qu'elle
// s'imprimera, du même tirage que celle qu'on créera.

const lirePlis = (brut: unknown): string[] => (Array.isArray(brut) ? brut.filter((x): x is string => typeof x === "string") : []);

const finDePhrase = (s: string) => (/[.!?…»]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

/** Au survol d'une séquence du tableau : son nom entier, et la phrase du programme ou du livret qui la place. */
const titreDeLaPuce = (s: SequenceToutefaite, infos?: { periode: number | null; raison: string }) =>
  (infos?.periode ? `${s.demarche.nom}\nPériode ${infos.periode} — ${infos.raison}` : s.demarche.nom);

/** Le type de donnée d'une séquence qu'on glisse d'une période à l'autre. */
const TYPE_SEQUENCE = "text/x-maitrize-sequence";

/** Ce qu'on sait d'une séquence : la compétence qu'elle vise, et la période du programme ou du livret, avec sa phrase. */
interface Infos { competence: CompetenceSelectionnee | null; periode: number | null; raison: string }

export function SequencesToutesFaitesTab({ classe }: { classe: ClasseC2 }) {
  const toutes = React.useMemo(() => sequencesToutesFaites().filter((s) => s.classe === classe), [classe]);
  const { data: eleves } = useAsync(() => api.elevesList(), []);
  const { data: reglages } = useAsync(() => api.settingsAll(), []);
  const { data: referentiels } = useAsync(() => api.referentielsList(), []);
  const { data: periodeDuMoment } = useAsync(async () => {
    const jour = nowIso().slice(0, 10);
    const vacances = await chargerVacances(jour).catch(() => []);
    return periodeDuJour(jour, Array.isArray(vacances) ? vacances : []);
  }, []);
  // Chaque dossier garde ses disciplines repliées.
  const [plis, setPlis] = useMemoire<string[]>("sequencesToutesFaites:plis", lirePlis);
  const pli = (discipline: string) => `${classe}:${discipline}`;
  const basculer = (discipline: string) => setPlis(plis.includes(pli(discipline)) ? plis.filter((x) => x !== pli(discipline)) : [...plis, pli(discipline)]);
  // La période que l'enseignant donne à une séquence : un réglage, qui suit d'un ordinateur à l'autre.
  const { data: periodesLues } = useAsync(() => api.settingGet(CLE_PERIODES).then(lirePeriodes).catch(() => ({} as Record<string, number>)), []);
  const [periodesChoisies, setPeriodesChoisies] = React.useState<Record<string, number> | null>(null);
  const choisies = React.useMemo(() => periodesChoisies ?? periodesLues ?? {}, [periodesChoisies, periodesLues]);
  // La compétence que chaque séquence vise, et la période que le programme ou le livret lui fixe — avec sa phrase.
  const infos = React.useMemo(() => {
    const sortie = new Map<string, Infos>();
    for (const s of toutes) {
      const fixe = repereDeLaDemarche(s.demarche.id, s.classe);
      const competence = referentiels ? competenceDeLaDemarche(referentiels, s.demarche.id, s.classe, fixe?.periode ?? periodeDuMoment ?? 1) : null;
      const repere = fixe ?? repereDeLaDemarche(s.demarche.id, s.classe, competence?.competenceTitre ?? "");
      sortie.set(s.cle, { competence, periode: repere?.periode ?? null, raison: repere?.raison ?? "" });
    }
    return sortie;
  }, [toutes, referentiels, periodeDuMoment]);
  const periodeDe = React.useCallback((s: SequenceToutefaite) => choisies[s.cle] ?? infos.get(s.cle)?.periode ?? null, [choisies, infos]);
  const tableau = React.useMemo(() => tableauDesSequences(toutes, periodeDe), [toutes, periodeDe]);
  const [choisieCle, setChoisieCle] = React.useState("");
  const choisie = toutes.find((s) => s.cle === choisieCle) ?? null;
  /** Ranger une séquence dans une période ; `null` la rend à celle du programme, ou à aucune. */
  const ranger = (s: SequenceToutefaite, p: number | null) => {
    const suite = { ...choisies };
    if (p === null) delete suite[s.cle]; else suite[s.cle] = p;
    setPeriodesChoisies(suite);
    api.settingSet(CLE_PERIODES, JSON.stringify(suite)).catch((e) => toast("Période non enregistrée : " + String(e), { icone: "⚠️" }));
  };
  // La séquence qu'on glisse, et la case survolée.
  const [enVol, setEnVol] = React.useState("");
  const [survol, setSurvol] = React.useState("");
  const glissee = toutes.find((s) => s.cle === enVol);
  // Le plan de la classe et les étiquettes des maquettes de la géographie, comme la fiche d'une séquence.
  const classeDuPlan: ContexteDeLaClasse = React.useMemo(() => {
    const profil = lireProfils(reglages?.["salle:profils"])[0];
    return {
      salle: profil ? { elements: profil.elements, agencement: profil.nom } : undefined,
      prenoms: (eleves ?? []).map((e) => e.nom.trim().split(/\s+/)[0]).filter(Boolean),
    };
  }, [reglages, eleves]);
  const menu = (e: React.MouseEvent, s: SequenceToutefaite) => {
    const programme = infos.get(s.cle)?.periode ?? null;
    openCtx(e, [
      ...PERIODES_DE_L_ANNEE.map(({ periode }) => ({
        label: `Ranger en période ${periode}${periodeDe(s) === periode ? " ✓" : ""}`, icon: "🗓", onClick: () => ranger(s, periode),
      })),
      ...(choisies[s.cle] !== undefined ? [{
        label: programme ? `Revenir à la période ${programme} du programme` : "Retirer de sa période", icon: "↺", sep: true, onClick: () => ranger(s, null),
      }] : []),
    ]);
  };
  const colonnes = COLONNES_DU_TABLEAU.length + 1;
  return (
    <>
      <div className="stf-tableau-cadre">
        <table className="stf-tableau">
          <thead>
            <tr>
              <th className="stf-coin">
                <Aide titre="Le tableau des séquences" vers="droite">
                  <p>Ce sont les déroulements que propose la fiche d'une séquence : les séquences des livrets d'Éduscol, ou bâties sur le programme et sur les guides. Chacune dit sa source.</p>
                  <p>Chacune est dans la période où le programme ou le livret la place. Glissez-la dans une autre période de sa ligne, ou rangez-la au clic droit : le tableau devient la programmation de la classe.</p>
                  <p>Un clic l'ouvre : ses séances, et toutes les feuilles que les ateliers en fabriquent.</p>
                </Aide>
              </th>
              {COLONNES_DU_TABLEAU.map((c) => (
                <th key={c.titre} scope="col">{c.titre}<span className="stf-colonne-aide">{c.aide}</span></th>
              ))}
            </tr>
          </thead>
          {tableau.map((bloc) => {
            const plie = plis.includes(pli(bloc.discipline));
            return (
              <tbody key={bloc.discipline}>
                <tr className="stf-discipline">
                  <th colSpan={colonnes} scope="rowgroup">
                    <button type="button" aria-expanded={!plie} onClick={() => basculer(bloc.discipline)}>
                      <span className={`pli-chevron${plie ? "" : " ouvert"}`} aria-hidden="true">›</span>
                      {bloc.icone} {bloc.discipline}
                      <span className="pli-nombre">{bloc.nombre} séquence{bloc.nombre > 1 ? "s" : ""}</span>
                    </button>
                  </th>
                </tr>
                {!plie && bloc.lignes.map((ligne) => (
                  <React.Fragment key={ligne.domaine.id}>
                    <tr>
                      <th scope="row" className="stf-domaine">{ligne.domaine.nom}</th>
                      {COLONNES_DU_TABLEAU.map((c, j) => {
                        const cleCase = `${ligne.domaine.id}:${c.periode ?? "sans"}`;
                        // On glisse dans une période de sa ligne ; « Sans période » ne se choisit pas.
                        const accepte = c.periode !== null && glissee?.domaine === ligne.domaine;
                        return (
                          <td key={cleCase} className={`stf-case${survol === cleCase ? " survol" : ""}`}
                            onDragOver={accepte ? (e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "move";
                              if (survol !== cleCase) setSurvol(cleCase);
                            } : undefined}
                            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSurvol((x) => (x === cleCase ? "" : x)); }}
                            onDrop={accepte ? (e) => {
                              e.preventDefault();
                              const s = toutes.find((x) => x.cle === (e.dataTransfer.getData(TYPE_SEQUENCE) || enVol));
                              setSurvol("");
                              setEnVol("");
                              if (s && c.periode !== null && periodeDe(s) !== c.periode) ranger(s, c.periode);
                            } : undefined}>
                            {ligne.cases[j].map((s) => (
                              <button key={s.cle} type="button" draggable aria-pressed={s === choisie} title={titreDeLaPuce(s, infos.get(s.cle))}
                                className={`stf-puce${s === choisie ? " actif" : ""}${s.cle === enVol ? " en-vol" : ""}`}
                                onClick={() => setChoisieCle(s === choisie ? "" : s.cle)}
                                onContextMenu={(e) => menu(e, s)}
                                onDragStart={(e) => { e.dataTransfer.setData(TYPE_SEQUENCE, s.cle); e.dataTransfer.effectAllowed = "move"; setEnVol(s.cle); }}
                                onDragEnd={() => { setEnVol(""); setSurvol(""); }}>
                                <span className="stf-puce-nom">{nomSansClasse(s.demarche.nom)}</span>
                                <span className="stf-puce-meta">{avecLaSeanceDesMots(s.demarche).seances.length} séances</span>
                              </button>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                    {choisie && choisie.domaine === ligne.domaine && (
                      <tr className="stf-ligne-detail">
                        <td colSpan={colonnes}>
                          <DetailDeLaSequence key={choisie.cle} s={choisie} infos={infos.get(choisie.cle)}
                            periode={periodeDe(choisie) ?? periodeDuMoment ?? 1} onPeriode={(p) => ranger(choisie, p)}
                            classeDuPlan={classeDuPlan} competenceCherchee={Boolean(referentiels)} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            );
          })}
        </table>
      </div>
      {!tableau.length && <Empty icone="📁" titre="Aucune séquence" sous={`Au ${classe}, aucune séquence n'est toute faite.`} />}
    </>
  );
}

/** La séquence choisie : ses séances et leurs feuilles, l'aperçu, et de quoi la créer. */
function DetailDeLaSequence({ s, infos, periode, onPeriode, classeDuPlan, competenceCherchee }: {
  s: SequenceToutefaite; infos?: Infos; periode: number; onPeriode: (p: number) => void;
  classeDuPlan: ContexteDeLaClasse; competenceCherchee: boolean;
}) {
  const haut = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { haut.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, []);
  const [calculMental, setCalculMental] = React.useState(true);
  const tout = React.useMemo(() => planToutFait(s.demarche, s.classe, periode, { calculMental, competence: infos?.competence?.competenceTitre, ...classeDuPlan }),
    [s, periode, calculMental, infos, classeDuPlan]);
  const [graine, setGraine] = useGraine();
  const cleDuPlan = `${periode}:${calculMental}`;
  const [feuilleChoisie, setFeuilleChoisie] = React.useState<{ cle: string; k: number }>({ cle: "", k: 0 });
  const k = feuilleChoisie.cle === cleDuPlan ? feuilleChoisie.k : 0;
  const apercu = React.useMemo(() => {
    const f = tout.plan.feuilles[k];
    if (!f) return null;
    try { return f.fabriquer(graineDeLaFeuille(graine, k)); } catch { return null; }
  }, [tout, k, graine]);
  const [enSequence, setEnSequence] = React.useState(false);
  return (
    <div className="stf-detail" ref={haut}>
      <Colonnes
        gauche={<>
          <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <span>{nomSansClasse(s.demarche.nom)} — {s.classe}</span>
            <Aide titre="D'où vient cette séquence" vers="droite">
              <p>{finDePhrase(s.demarche.source)}</p>
              <p>{s.demarche.resume}</p>
              {infos?.periode ? <p><b>Période {infos.periode}</b> — {infos.raison}</p> : null}
            </Aide>
          </h3>
          <p className="martiniere-quand">{resumeDuCadre(tout.demarche)}{tout.calculMental ? " — chacune s'ouvre sur le calcul mental La Martinière" : ""}.</p>
          {ouvreSurLeCalculMental(s.demarche) && (
            <label className="stf-option">
              <input type="checkbox" checked={calculMental} onChange={(e) => setCalculMental(e.target.checked)} /> 🧮 Le calcul mental La Martinière en tête de chaque séance
            </label>
          )}
          <div className="stf-periode">
            <span className="meta">Période</span>
            <div className="seg" role="group" aria-label="La période de l'année">
              {[1, 2, 3, 4, 5].map((p) => (
                <button key={p} type="button" className={p === periode ? "active" : ""} onClick={() => onPeriode(p)}>P{p}</button>
              ))}
            </div>
            <Aide titre="La période" vers="droite">
              <p>Celle où vous la ferez : la séquence se range là, « par moment de l'année ». Au CP, elle choisit aussi les nombres des feuilles et du calcul mental.</p>
              {infos?.periode ? <p><b>Période {infos.periode}</b> — {infos.raison}</p> : <p>Le programme ne lui fixe pas de période.</p>}
            </Aide>
          </div>
          <ol className="sp-seances">
            {tout.demarche.seances.map((seance, i) => (
              <li key={`${i}-${seance.titre}`}>
                <b>{seance.titre}</b> <span className="meta">· {seance.duree} min</span>
                <div className="sp-feuilles">
                  {estLaSeanceDesMots(seance) && (
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
      {enSequence && (
        <CreerLaSequence tout={tout} classe={s.classe} periode={periode} graine={graine}
          competence={infos?.competence ?? null} competenceCherchee={competenceCherchee} onClose={() => setEnSequence(false)} />
      )}
    </div>
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
            ? "🎯 Aucune compétence de vos référentiels actifs n'appelle ce déroulement : la séquence n'en visera pas. Choisissez-la plus tard sur la séquence."
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
