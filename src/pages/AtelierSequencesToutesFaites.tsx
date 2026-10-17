import React from "react";
import { useNavigate } from "react-router-dom";
import { api, nowIso } from "../api";
import { seanceDeLaParole } from "../aidesDesSequences";
import { Aide } from "../components/Aide";
import { ApercuFeuille } from "../components/ApercuFeuille";
import type { CompetenceSelectionnee } from "../components/CompetenceTree";
import { PliDuCatalogue } from "../components/PliDuCatalogue";
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
  CLASSES, CLE_PERIODES, DISCIPLINES, classeDesEleves, competenceDeLaDemarche, creerLaSequenceToutefaite, lirePeriodes, nomSansClasse,
  ouvreSurLeCalculMental, periodeDeLaDemarche, planToutFait, rangerLesSequences, sequencesToutesFaites,
  type ContexteDeLaClasse, type Discipline, type PlanToutFait, type Rangement, type SequenceToutefaite,
} from "../sequencesToutesFaites";
import { chargerVacances, periodeDuJour } from "../vacances";
import { Colonnes } from "./AteliersMaths";

// ── Fabriquer › les séquences toutes faites ───────────────────────────────
//
// Les déroulements de la fiche d'une séquence, pris tout faits (voir
// sequencesToutesFaites.ts), dans un seul onglet : rangés par famille, par
// niveau ou par moment de l'année, comme le catalogue l'est par famille ou
// par moment de la séquence ; la classe des élèves d'abord. La séquence
// qu'on choisit s'ouvre sous son groupe : ses séances, leurs feuilles, et à
// droite la feuille choisie telle qu'elle s'imprimera, du même tirage que
// celle qu'on créera.

const lireRangement = (brut: unknown): Rangement => (brut === "niveau" || brut === "moment" ? brut : "famille");
const lireNiveau = (brut: unknown): ClasseC2 | "tous" | "" => (brut === "tous" || CLASSES.includes(brut as ClasseC2) ? (brut as ClasseC2 | "tous") : "");
const lireDiscipline = (brut: unknown): Discipline | "toutes" => (DISCIPLINES.some((d) => d.nom === brut) ? (brut as Discipline) : "toutes");
const lirePlis = (brut: unknown): string[] => (Array.isArray(brut) ? brut.filter((x): x is string => typeof x === "string") : []);

const finDePhrase = (s: string) => (/[.!?…»]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

interface Infos { competence: CompetenceSelectionnee | null; periode: number | null }

export function SequencesToutesFaitesTab() {
  const toutes = React.useMemo(() => sequencesToutesFaites(), []);
  const { data: eleves } = useAsync(() => api.elevesList(), []);
  const { data: reglages } = useAsync(() => api.settingsAll(), []);
  const { data: referentiels } = useAsync(() => api.referentielsList(), []);
  const { data: periodeDuMoment } = useAsync(async () => {
    const jour = nowIso().slice(0, 10);
    const vacances = await chargerVacances(jour).catch(() => []);
    return periodeDuJour(jour, Array.isArray(vacances) ? vacances : []);
  }, []);
  const [rangement, setRangement] = useMemoire<Rangement>("sequencesToutesFaites:rangement", lireRangement);
  const [niveauChoisi, setNiveau] = useMemoire<ClasseC2 | "tous" | "">("sequencesToutesFaites:niveau", lireNiveau);
  const niveau = niveauChoisi || classeDesEleves(eleves ?? [], CLASSES) || "tous";
  const [discipline, setDiscipline] = useMemoire<Discipline | "toutes">("sequencesToutesFaites:discipline", lireDiscipline);
  const [plis, setPlis] = useMemoire<string[]>("sequencesToutesFaites:plis", lirePlis);
  const plier = (cle: string, plie: boolean) => setPlis(plie ? [...new Set([...plis, cle])] : plis.filter((x) => x !== cle));
  // La période que l'enseignant donne à une séquence : un réglage, qui suit d'un ordinateur à l'autre.
  const { data: periodesLues } = useAsync(() => api.settingGet(CLE_PERIODES).then(lirePeriodes).catch(() => ({} as Record<string, number>)), []);
  const [periodesChoisies, setPeriodesChoisies] = React.useState<Record<string, number> | null>(null);
  const choisies = React.useMemo(() => periodesChoisies ?? periodesLues ?? {}, [periodesChoisies, periodesLues]);
  // La compétence que chaque séquence vise, et la période que le programme ou le livret lui fixe.
  const infos = React.useMemo(() => {
    const sortie = new Map<string, Infos>();
    for (const s of toutes) {
      const fixee = periodeDeLaDemarche(s.demarche.id, s.classe);
      const competence = referentiels ? competenceDeLaDemarche(referentiels, s.demarche.id, s.classe, fixee ?? periodeDuMoment ?? 1) : null;
      sortie.set(s.cle, { competence, periode: fixee ?? periodeDeLaDemarche(s.demarche.id, s.classe, competence?.competenceTitre ?? "") });
    }
    return sortie;
  }, [toutes, referentiels, periodeDuMoment]);
  const periodeDe = React.useCallback((s: SequenceToutefaite) => choisies[s.cle] ?? infos.get(s.cle)?.periode ?? null, [choisies, infos]);
  // Ce qu'on range ne se filtre pas : par niveau, toutes les classes ; par famille, toutes les disciplines.
  const visibles = React.useMemo(() => toutes.filter((s) => (rangement === "niveau" || niveau === "tous" || s.classe === niveau)
    && (rangement === "famille" || discipline === "toutes" || s.domaine.discipline === discipline)), [toutes, rangement, niveau, discipline]);
  const sections = React.useMemo(() => rangerLesSequences(visibles, rangement, periodeDe), [visibles, rangement, periodeDe]);
  const [choisieCle, setChoisieCle] = React.useState("");
  const choisie = visibles.find((s) => s.cle === choisieCle) ?? null;
  const choisirPeriode = (s: SequenceToutefaite, p: number) => {
    const suite = { ...choisies, [s.cle]: p };
    setPeriodesChoisies(suite);
    api.settingSet(CLE_PERIODES, JSON.stringify(suite)).catch((e) => toast("Période non enregistrée : " + String(e), { icone: "⚠️" }));
  };
  // Le plan de la classe et les étiquettes des maquettes de la géographie, comme la fiche d'une séquence.
  const classeDuPlan: ContexteDeLaClasse = React.useMemo(() => {
    const profil = lireProfils(reglages?.["salle:profils"])[0];
    return {
      salle: profil ? { elements: profil.elements, agencement: profil.nom } : undefined,
      prenoms: (eleves ?? []).map((e) => e.nom.trim().split(/\s+/)[0]).filter(Boolean),
    };
  }, [reglages, eleves]);
  const meta = (s: SequenceToutefaite) => {
    const p = periodeDe(s);
    return [
      rangement !== "niveau" && niveau === "tous" ? s.classe : "",
      rangement !== "moment" && p ? `période ${p}` : "",
      `${avecLaSeanceDesMots(s.demarche).seances.length} séances`,
    ].filter(Boolean).join(" · ");
  };
  return (
    <>
      <div className="stf-barre">
        <div className="seg" role="group" aria-label="Ranger les séquences">
          <button type="button" className={rangement === "famille" ? "active" : ""} onClick={() => setRangement("famille")}>Par famille</button>
          <button type="button" className={rangement === "niveau" ? "active" : ""} onClick={() => setRangement("niveau")}>Par niveau</button>
          <button type="button" className={rangement === "moment" ? "active" : ""} onClick={() => setRangement("moment")}>Par moment de l'année</button>
        </div>
        {rangement !== "niveau" && (
          <div className="seg" role="group" aria-label="La classe">
            {(["tous", ...CLASSES] as const).map((c) => (
              <button key={c} type="button" className={c === niveau ? "active" : ""} onClick={() => setNiveau(c)}>{c === "tous" ? "Tous" : c}</button>
            ))}
          </div>
        )}
        {rangement !== "famille" && (
          <div className="seg" role="group" aria-label="La discipline">
            <button type="button" className={discipline === "toutes" ? "active" : ""} onClick={() => setDiscipline("toutes")}>Toutes</button>
            {DISCIPLINES.map((d) => (
              <button key={d.nom} type="button" className={d.nom === discipline ? "active" : ""} onClick={() => setDiscipline(d.nom)}>{d.icone} {d.court}</button>
            ))}
          </div>
        )}
        <Aide titre="D'où viennent ces séquences" vers="droite">
          <p>Ce sont les déroulements que propose la fiche d'une séquence : les séquences des livrets d'Éduscol, ou bâties sur le programme et sur les guides. Chacune dit sa source.</p>
          <p>La période vient du programme ou du livret quand ils la fixent ; sinon, choisissez-la dans la séquence : elle s'y range.</p>
          <p>Les feuilles viennent des ateliers de Fabriquer, à la classe de la séquence : chacune se refait dans son atelier.</p>
        </Aide>
      </div>
      {sections.map((section) => (
        <section key={section.cle} className="famille-catalogue">
          <PliDuCatalogue ouvert={!plis.includes(section.cle)} onBasculer={(o) => plier(section.cle, !o)}
            icone={section.icone} titre={section.titre} aide={section.aide} nombre={section.nombre}
            compte={`${section.nombre} séquence${section.nombre > 1 ? "s" : ""}`}>
            {section.groupes.map((g) => (
              <div key={g.titre} className="stf-groupe">
                <div className="stf-groupe-titre">{g.titre}</div>
                <div className="deroulements-possibles stf-liste" role="radiogroup" aria-label={g.titre}>
                  {g.sequences.map((s) => (
                    <button key={s.cle} type="button" role="radio" aria-checked={s === choisie}
                      className={`deroulement-choix${s === choisie ? " actif" : ""}`} onClick={() => setChoisieCle(s === choisie ? "" : s.cle)}>
                      <b>{nomSansClasse(s.demarche.nom)}</b>
                      <span className="meta">{meta(s)}</span>
                    </button>
                  ))}
                </div>
                {choisie && g.sequences.includes(choisie) && (
                  <DetailDeLaSequence key={`${choisie.cle}:${section.cle}`} s={choisie} infos={infos.get(choisie.cle)}
                    periode={periodeDe(choisie) ?? periodeDuMoment ?? 1} onPeriode={(p) => choisirPeriode(choisie, p)}
                    classeDuPlan={classeDuPlan} competenceCherchee={Boolean(referentiels)} />
                )}
              </div>
            ))}
          </PliDuCatalogue>
        </section>
      ))}
      {!sections.length && <Empty icone="📚" titre="Aucune séquence" sous="Pour cette classe et cette discipline, aucune séquence n'est toute faite." />}
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
              {infos?.periode ? <p>Le programme ou le livret la place en période {infos.periode}.</p> : <p>Le programme ne lui fixe pas de période.</p>}
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
