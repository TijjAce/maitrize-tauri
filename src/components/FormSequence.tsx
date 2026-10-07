import React from "react";
import { api, Sequence, Referentiel, couleurPourMatiere, anneeScolaireActuelle, teinteSequence, type Seance } from "../api";
import { Modal, Field, Input, Select, Textarea, useAsync } from "./ui";
import { CompetenceTree, CompetenceSelectionnee, labelCourt } from "./CompetenceTree";
import { FichierImg } from "./Deroulement";
import { PhotoTelephone } from "./PhotoTelephone";
import { demarcheDe, demarcheSuggeree, demarchesParFamille, resumeDuCadre, seancesDuCadre } from "../demarches";
import { sequencesParCompetence, titresVisant } from "../sequencesVisees";
import { ateliersRattaches, classeDe, feuilleRattachee, planDesFeuilles, type ContexteFeuilles, type FeuilleAFabriquer } from "../feuillesDesSequences";
import { nomDeLAtelier } from "../catalogueAteliers";
import { poserDansUneSeance } from "../impressionAtelier";
import { graineAuHasard } from "../hasard";
import { toast } from "./Toaster";
import { NIVEAUX_DE_PROGRAMMATION, libelleDeProgrammation, niveauDeProgrammation, programmationProposee } from "../programmation";

// Fiche d'une séquence : titre, période, compétence visée, objectifs, vignette,
// vidéo. Elle vivait dans l'ancien onglet Séquences et avait disparu avec lui :
// une séquence ne pouvait plus être renommée.

export function FormSequence({ sequence, nouvelle = false, onClose, onSaved }: {
  sequence: Sequence; nouvelle?: boolean; onClose: () => void; onSaved: (s: Sequence) => void;
}) {
  const [s, setS] = React.useState<Sequence>(sequence);
  const up = (p: Partial<Sequence>) => setS((cur) => ({ ...cur, ...p }));
  const [enCours, setEnCours] = React.useState(false);
  // Ce que les autres séquences visent déjà : l'arbre le montre, pour ne pas
  // refaire une séquence sur une compétence couverte sans le savoir.
  const { data: toutes } = useAsync(() => api.sequencesList(), []);
  const visees = React.useMemo(() => sequencesParCompetence(toutes ?? [], sequence.id), [toutes, sequence.id]);
  // Le déroulement : une démarche d'un guide, proposée dès que la compétence
  // est là — c'est elle qui dit ce qu'on va enseigner —, à la création comme
  // à la modification d'une séquence encore sans séance. On décide de le
  // suivre ou non ; tant qu'on n'a pas décidé, rien n'est posé. Une séquence
  // qui a déjà ses séances peut encore en recevoir un, à la suite des
  // siennes : on le demande alors, il ne s'impose pas.
  let comp: CompetenceSelectionnee | null = null;
  try { comp = s.competenceVisee ? JSON.parse(s.competenceVisee) : null; } catch { /* ignore */ }
  const [cadre, setCadre] = React.useState(() => {
    try {
      const c = sequence.competenceVisee ? (JSON.parse(sequence.competenceVisee) as CompetenceSelectionnee) : null;
      return c ? demarcheSuggeree(c, c.referentielNom, sequence.periode).id : "";
    } catch { return ""; }
  });
  const [suivi, setSuivi] = React.useState<"" | "oui" | "non">("");
  const { data: existantes } = useAsync(() => (nouvelle ? Promise.resolve([] as Seance[]) : api.seancesList(sequence.id)), [sequence.id, nouvelle]);
  const nbExistantes = existantes?.length ?? 0;
  const [ajouterCadre, setAjouterCadre] = React.useState(false);
  const demarche = demarcheDe(cadre);
  const proposeLeCadre = !!comp && !!demarche && !!existantes && (nbExistantes === 0 || ajouterCadre);
  const poseLesSeances = proposeLeCadre && suivi === "oui" && !!demarche;

  // Les feuilles : la démarche pioche dans les ateliers de Fabriquer, aux nombres de la classe de la compétence et de la
  // période de la séquence. Chacune se décoche ; les jeux qu'on a rattachés soi-même à la compétence s'y ajoutent.
  const { data: reglages } = useAsync(() => api.settingsAll(), []);
  const classe = classeDe(comp?.niveau);
  // Un objectif de calcul mental qu'on a rattaché soi-même à la compétence : la séquence La Martinière le prend.
  const objectifRattache = React.useMemo(() => (comp && reglages
    ? ateliersRattaches(reglages, comp).find((a) => a.atelier === "martiniere" && a.objectif)?.objectif : undefined),
  [reglages, s.competenceVisee]); // eslint-disable-line react-hooks/exhaustive-deps
  const ctx: ContexteFeuilles | null = classe ? { classe, periode: s.periode, competence: comp?.competenceTitre ?? "", objectifRattache } : null;
  const plan = React.useMemo(() => (demarche && ctx ? planDesFeuilles(demarche.id, ctx) : null),
    [demarche?.id, ctx?.classe, ctx?.periode, ctx?.competence, objectifRattache]); // eslint-disable-line react-hooks/exhaustive-deps
  const [retirees, setRetirees] = React.useState<ReadonlySet<number>>(() => new Set());
  React.useEffect(() => { setRetirees(new Set()); }, [cadre, plan]);
  const basculer = (k: number) => setRetirees((avant) => {
    const suite = new Set(avant);
    if (suite.has(k)) suite.delete(k); else suite.add(k);
    return suite;
  });
  const rattaches = React.useMemo(() => (comp && reglages
    ? ateliersRattaches(reglages, comp).filter((a) => !plan?.feuilles.some((f) => f.atelier === a.atelier))
    : []), [reglages, s.competenceVisee, plan]); // eslint-disable-line react-hooks/exhaustive-deps
  // Un jeu rattaché va, par défaut, dans la dernière séance avant l'évaluation : celle où l'on s'entraîne et réinvestit.
  const derniere = demarche ? demarche.seances.length - 1 : 0;
  const seanceParDefaut = demarche && /évaluation/i.test(demarche.seances[derniere]?.titre ?? "") ? Math.max(0, derniere - 1) : derniere;
  const [ajouts, setAjouts] = React.useState<Record<string, number>>({});
  const seanceDuJeu = (atelier: string) => ajouts[atelier] ?? seanceParDefaut;
  const aFabriquer: FeuilleAFabriquer[] = [
    ...(plan?.feuilles.filter((_, k) => !retirees.has(k)) ?? []),
    ...rattaches.flatMap((a) => {
      const f = seanceDuJeu(a.atelier) >= 0 ? feuilleRattachee(a.atelier, seanceDuJeu(a.atelier), ctx) : null;
      return f ? [f] : [];
    }),
  ];
  const [progres, setProgres] = React.useState("");

  const save = async () => {
    setEnCours(true);
    try {
      const propre = {
        ...s, titre: s.titre.trim(), annee: s.annee || anneeScolaireActuelle(),
        nbSeancesPrevu: poseLesSeances ? nbExistantes + demarche.seances.length : s.nbSeancesPrevu,
      };
      await api.sequenceSave(propre);
      if (poseLesSeances) {
        // À la suite des séances qui existent : numérotées après elles, avec la note du matériel et la compétence visée.
        const seances = seancesDuCadre(demarche, propre.id, nbExistantes + 1).map((sc, i) => ({
          ...sc, materiel: plan?.materiel[i] || sc.materiel, competences: comp ? JSON.stringify([comp]) : sc.competences,
        }));
        for (const seance of seances) await api.seanceSave(seance);
        // Puis les feuilles, chacune dans sa séance, en PDF, avec la compétence de la séquence en tête.
        let faites = 0;
        for (const f of aFabriquer) {
          const seance = seances[f.seance];
          if (!seance) continue;
          setProgres(`Feuilles : ${faites + 1} sur ${aFabriquer.length}…`);
          try {
            const { html, style } = f.fabriquer(graineAuHasard());
            await poserDansUneSeance(f.atelier, f.titre, html, style, seance.id, propre.id, { competences: comp ? [comp] : undefined });
            faites++;
          } catch (e) {
            toast(`« ${f.titre} » n'a pas pu être fabriquée : ${String(e)}`, { icone: "⚠️" });
          }
        }
        if (aFabriquer.length) {
          toast(`${seances.length} séances créées, ${faites} feuille${faites > 1 ? "s" : ""} rangée${faites > 1 ? "s" : ""} dans leurs séances.`, { icone: "📚" });
        }
      }
      onSaved(propre);
    } finally { setEnCours(false); setProgres(""); }
  };

  // La programmation : le niveau et la période pour lesquels la séquence est pensée. À la création, la compétence les
  // propose — son niveau, et la période que le programme fixe pour sa démarche ; dès qu'on les règle soi-même, ils restent.
  const [programmationTouchee, setProgrammationTouchee] = React.useState(!nouvelle);
  const proposition = React.useMemo(() => programmationProposee(comp, cadre), [s.competenceVisee, cadre]); // eslint-disable-line react-hooks/exhaustive-deps
  const niveau = niveauDeProgrammation(s.niveau);
  const suitLaProposition = !!proposition && (!proposition.niveau || proposition.niveau === niveau)
    && (!proposition.periode || proposition.periode === s.periode);

  const choisir = (c: CompetenceSelectionnee, ref: Referentiel) => {
    // La compétence appelle un déroulement : on le propose, on ne l'impose pas. Sa période proposée peut changer le
    // déroulement lui-même — au CP, jusqu'à 59 ou jusqu'à 100 — : on le choisit à la période retenue.
    const premier = demarcheSuggeree(c, ref.nom, s.periode);
    const prog = programmationProposee(c, premier.id);
    const periode = !programmationTouchee && prog?.periode ? prog.periode : s.periode;
    const demarche = periode === s.periode ? premier : demarcheSuggeree(c, ref.nom, periode);
    up({
      competenceVisee: JSON.stringify(c), matiere: c.domaineTitre, cycle: ref.cycle || s.cycle, couleur: couleurPourMatiere(c.domaineTitre),
      ...(programmationTouchee ? {} : { niveau: prog?.niveau || niveau, periode }),
    });
    setCadre(demarche.id); setSuivi(""); setCadreChoisi(false);
  };
  // La période peut choisir la séquence — au CP, les nombres jusqu'à 59 ou jusqu'à 100 ; au CE1, la table de 7 en
  // période 3, La Martinière aux autres — : tant qu'on n'a pas choisi soi-même le déroulement, il suit la période.
  const [cadreChoisi, setCadreChoisi] = React.useState(false);
  React.useEffect(() => {
    if (comp && !cadreChoisi) setCadre(demarcheSuggeree(comp, comp.referentielNom, s.periode).id);
  }, [s.periode]); // eslint-disable-line react-hooks/exhaustive-deps
  const effacer = () => { up({ competenceVisee: "", matiere: "", cycle: "", couleur: "blue" }); setCadre(""); setSuivi(""); setCadreChoisi(false); };

  return (
    <Modal large titre={sequence.titre && sequence.titre !== "Nouvelle séquence" ? "Modifier la séquence" : "Nouvelle séquence"} onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" onClick={save} disabled={!s.titre.trim() || enCours}>{progres || (enCours ? "Enregistrement…" : "Enregistrer")}</button>
      </>}>
      <Field label="Titre">
        <Input value={s.titre} autoFocus onChange={(e) => up({ titre: e.target.value })}
          onFocus={(e) => { if (s.titre === "Nouvelle séquence") e.currentTarget.select(); }} />
      </Field>
      <div className="row">
        <Field label="Programmation — pensée pour">
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Select value={niveau} aria-label="Le niveau pour lequel la séquence est pensée" style={{ width: 110 }}
              onChange={(e) => { setProgrammationTouchee(true); up({ niveau: e.target.value }); }}>
              <option value="">Niveau…</option>
              {NIVEAUX_DE_PROGRAMMATION.map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
            <div className="seg" role="group" aria-label="La période de l'année">
              {[1, 2, 3, 4, 5].map((p) => (
                <button key={p} type="button" className={s.periode === p ? "active" : ""}
                  onClick={() => { setProgrammationTouchee(true); up({ periode: p }); }}>P{p}</button>
              ))}
            </div>
          </div>
        </Field>
        <Field label="Année"><Input value={s.annee} placeholder="2026-2027" onChange={(e) => up({ annee: e.target.value })} /></Field>
        <Field label="Séances prévues">
          <Input type="number" min={0} max={99} value={s.nbSeancesPrevu || ""} placeholder="—"
            title="Combien de séances la séquence prévoit : le cahier journal écrira « séance 3/6 »."
            onChange={(e) => up({ nbSeancesPrevu: Math.max(0, Math.min(99, Math.round(Number(e.target.value) || 0))) })} />
        </Field>
      </div>

      {proposition && (proposition.raison || !suitLaProposition) && (
        <div className="meta programmation-proposee">
          📅 {suitLaProposition ? (proposition.raison.startsWith("Livret") ? "D'après le livret" : "D'après le programme") : `Proposé : ${libelleDeProgrammation(proposition)}`}
          {proposition.raison && <> — {proposition.raison}</>}
          {!suitLaProposition && (
            <button type="button" className="btn ghost sm" style={{ marginLeft: 6 }}
              onClick={() => up({ niveau: proposition.niveau || niveau, periode: proposition.periode ?? s.periode })}>Appliquer</button>
          )}
        </div>
      )}

      <div className="field">
        <label style={{ display: "flex", alignItems: "center" }}>
          Compétence visée
          {comp && <button className="btn ghost sm" style={{ marginLeft: "auto", color: "var(--danger)" }} onClick={effacer}>Effacer</button>}
        </label>
        {comp && (
          <div style={{ background: "var(--accent-soft)", color: "var(--accent)", padding: "8px 12px", borderRadius: 9, marginBottom: 8, fontSize: 13 }}>
            🎯 {labelCourt(comp)} <span style={{ color: "var(--text-2)" }}>· {comp.domaineTitre}</span>
          </div>
        )}
        {comp && demarche && existantes && nbExistantes > 0 && !ajouterCadre && (
          <button type="button" className="lien" style={{ margin: "0 0 8px" }} onClick={() => setAjouterCadre(true)}>
            🧭 Ajouter un déroulement à la suite des {nbExistantes} séance{nbExistantes > 1 ? "s" : ""}
          </button>
        )}
        {proposeLeCadre && demarche && (
          <div className={`deroulement-propose${suivi === "non" ? " ecarte" : ""}`}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <b>🧭 {nbExistantes > 0 ? "Un déroulement peut être ajouté à la suite" : "Un déroulement peut être suivi"}</b>
              <span className="meta">{resumeDuCadre(demarche)}</span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", margin: "8px 0 6px" }}>
              <Select value={cadre} onChange={(e) => { setCadre(e.target.value); setSuivi(""); setCadreChoisi(true); }} style={{ maxWidth: 460 }}>
                {demarchesParFamille().map((g) => (
                  <optgroup key={g.famille} label={g.famille}>
                    {g.demarches.map((d) => <option key={d.id} value={d.id}>{d.nom}</option>)}
                  </optgroup>
                ))}
              </Select>
            </div>
            <div className="meta" style={{ fontSize: 12.5, lineHeight: 1.5 }}>{demarche.resume}</div>
            <div className="meta" style={{ fontSize: 12, lineHeight: 1.4, opacity: .85 }}>📖 {demarche.source}</div>
            <ol className="deroulement-seances">
              {demarche.seances.map((sc, i) => (
                <li key={i}>
                  <b>{sc.titre}</b> <span className="meta">· {sc.duree} min · {sc.phases.map((p) => p.phase.replace(/^Temps \d – /, "")).join(" › ")}</span>
                  {plan && plan.feuilles.some((f) => f.seance === i) && (
                    <div className="deroulement-feuilles">
                      {plan.feuilles.map((f, k) => (f.seance !== i ? null : (
                        <label key={k} className={`chip${retirees.has(k) ? " ecartee" : ""}`} title={`Fabriquée par l'atelier ${nomDeLAtelier(f.atelier)}`}>
                          <input type="checkbox" checked={!retirees.has(k)} onChange={() => basculer(k)} /> 📄 {f.titre}
                        </label>
                      )))}
                    </div>
                  )}
                </li>
              ))}
            </ol>
            {plan && ctx && plan.feuilles.length > 0 && (
              <div className="meta" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                📄 Les feuilles viennent {(() => {
                  const ateliers = [...new Set(plan.feuilles.map((f) => nomDeLAtelier(f.atelier)))];
                  return ateliers.length > 1 ? `des ateliers ${ateliers.join(" et ")}` : `de l'atelier ${ateliers[0]}`;
                })()}, pour le {ctx.classe}
                {ctx.classe === "CP" ? `, en période ${ctx.periode}` : ""} ; chaque séance reçoit aussi la note de son matériel. Décochez ce que vous ne voulez pas.
              </div>
            )}
            {rattaches.length > 0 && (
              <div className="deroulement-rattaches">
                <div className="meta" style={{ fontSize: 12.5 }}>🎲 Rattachés à cette compétence dans Fabriquer, « Ce que cela travaille » :</div>
                {rattaches.map((a) => (a.fabricable ? (
                  <div key={a.atelier} className="deroulement-rattache">
                    <label><input type="checkbox" checked={seanceDuJeu(a.atelier) >= 0}
                      onChange={(e) => setAjouts((avant) => ({ ...avant, [a.atelier]: e.target.checked ? seanceParDefaut : -1 }))} /> {nomDeLAtelier(a.atelier)}, tel que réglé</label>
                    {seanceDuJeu(a.atelier) >= 0 && (
                      <Select value={seanceDuJeu(a.atelier)} onChange={(e) => setAjouts((avant) => ({ ...avant, [a.atelier]: Number(e.target.value) }))}
                        aria-label={`La séance qui reçoit ${nomDeLAtelier(a.atelier)}`} style={{ maxWidth: 300 }}>
                        {demarche.seances.map((sc, i) => <option key={i} value={i}>Séance {i + 1} — {sc.titre}</option>)}
                      </Select>
                    )}
                  </div>
                ) : (
                  <div key={a.atelier} className="meta" style={{ fontSize: 12.5 }}>{nomDeLAtelier(a.atelier)} — à imprimer depuis son atelier, la séance ouverte.</div>
                )))}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <button type="button" className={`btn sm${suivi === "oui" ? " primary" : ""}`} onClick={() => setSuivi("oui")}>
                ✓ Suivre ce déroulement
              </button>
              <button type="button" className={`btn sm${suivi === "non" ? " active" : " ghost"}`} onClick={() => setSuivi("non")}>
                Ne pas le suivre
              </button>
              <span className="meta" style={{ alignSelf: "center", fontSize: 12.5 }}>
                {suivi === "oui"
                  ? nbExistantes > 0
                    ? `Vos ${nbExistantes} séance${nbExistantes > 1 ? "s" : ""} restent ; celles du déroulement viennent à la suite, numérotées à partir de ${nbExistantes + 1}.`
                    : "Les séances seront créées avec leurs phases, à compléter."
                  : suivi === "non"
                    ? nbExistantes > 0 ? "Rien n'est ajouté." : "La séquence restera vide : vous construirez les séances vous-même."
                    : "À décider avant d'enregistrer — sans réponse, rien n'est posé."}
              </span>
            </div>
          </div>
        )}
        <CompetenceTree mode="single" selection={comp ? [comp] : []} onPick={choisir}
          dejaVisee={(c) => titresVisant(visees, c)} />
        {(s.matiere || s.cycle) && (
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {s.matiere && <span className="chip"><span className="dot" style={{ background: teinteSequence(s) }} />{s.matiere}</span>}
            {s.cycle && <span className="chip">{s.cycle}</span>}
          </div>
        )}
      </div>

      <Field label="Objectifs / notes"><Textarea value={s.objectifs} onChange={(e) => up({ objectifs: e.target.value })} /></Field>

      <div className="field">
        <label>Vignette (image de couverture)</label>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {s.imageNom
            ? <FichierImg nom={s.imageNom} style={{ width: 96, height: 72, objectFit: "cover", border: "1px solid var(--border)" }} />
            : <div style={{ width: 96, height: 72, borderRadius: 8, background: "var(--panel-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🖼</div>}
          <ChoixFichier accept="image/*" libelle="📷 Choisir une image" onUploaded={(nom) => up({ imageNom: nom })} />
          <PhotoTelephone onPhoto={(nom) => up({ imageNom: nom })} />
          {s.imageNom && <button className="btn ghost sm" onClick={() => up({ imageNom: null })}>Retirer</button>}
        </div>
      </div>

      <div className="field">
        <label>Vidéo explicative (lien ou fichier)</label>
        <div style={{ display: "flex", gap: 8 }}>
          <Input placeholder="https://… (YouTube, lien)" value={s.video.startsWith("http") ? s.video : ""}
            onChange={(e) => up({ video: e.target.value })} />
          <ChoixFichier accept="video/*" libelle="🎬 Importer" onUploaded={(nom) => up({ video: nom })} />
        </div>
        {s.video && !s.video.startsWith("http") && (
          <div style={{ marginTop: 6, fontSize: 12.5, color: "var(--text-2)" }}>
            🎬 Vidéo importée <button className="btn ghost sm" onClick={() => up({ video: "" })}>retirer</button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function ChoixFichier({ accept, libelle, onUploaded }: { accept: string; libelle: string; onUploaded: (nom: string) => void }) {
  const ref = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const envoyer = async (file: File) => {
    setBusy(true);
    try {
      const b64 = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1] ?? ""); r.onerror = rej; r.readAsDataURL(file); });
      onUploaded(await api.fichierSave(file.name, b64));
    } finally { setBusy(false); }
  };
  return (
    <>
      <input ref={ref} type="file" accept={accept} style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) envoyer(f); e.target.value = ""; }} />
      <button className="btn" style={{ flex: "none" }} disabled={busy} onClick={() => ref.current?.click()}>{busy ? "…" : libelle}</button>
    </>
  );
}
