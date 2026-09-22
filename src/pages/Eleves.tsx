import React from "react";
import { Page } from "../App";
import {
  api, Eleve, CommentaireEleve, Evaluation, NoteEleve,
  nouvelEleve, nouvelleEvaluation, NIVEAUX_SCOLAIRES, MATIERES, newId, nowIso,
  NIVEAUX_MAITRISE, TYPES_OBSERVATION,
} from "../api";
import { Modal, Field, Input, Select, Empty, Confirm, useAsync, useSegmentNav, useOngletDemande } from "../components/ui";
import { CompetenceTree, CompetenceSelectionnee, labelCourt } from "../components/CompetenceTree";
import { openCtx } from "../components/ctxmenu";
import { toast, toastAnnulable } from "../components/Toaster";
import { DispositifsTab } from "./Dispositifs";
import { ProgressionsTab } from "./Progressions";
import { GevaScoTab } from "./GevaSco";
import { DicteeAtelier } from "../components/DicteeAtelier";
import { GrilleObservation } from "../components/GrilleObservation";
import { age, libelleAge } from "../dossier";

/** « 12 ans », ou rien sans date de naissance. */
const ageDe = (e: Eleve) => {
  const ans = age(e.dateNaissance);
  return ans === undefined ? "" : libelleAge(ans);
};
import { ChipObservation, ChoixTypeObservation, couleurObservation } from "../components/TypeObservation";
import { DossierTab } from "./DossierEleve";
import { EvaluationDiagnostiqueTab } from "./EvaluationDiagnostique";
import syntheseDomaines from "../data/syntheseGS.json";
import { pseudonymiser, restaurer } from "../confidentialite";
import { SyntheseEleveTab } from "./SyntheseEleve";

const ELEVES_TABS = ["liste", "dossier", "observations", "evaluations", "papiers", "dispositifs", "gevasco", "progressions"] as const;
/** Ce qu'affiche l'onglet Évaluations : le sommatif (notes, synthèse, synthèse GS) ou le diagnostique. */
type VueEvaluation = "notees" | "synthese" | "gs" | "diagnostique";
export default function Eleves() {
  const [onglet, setOnglet] = React.useState<typeof ELEVES_TABS[number]>("liste");
  const [vueEvaluation, setVueEvaluation] = React.useState<VueEvaluation>("notees");
  // Mode IME/ULIS/inclusion (Réglages → Type de structure) : ajoute les onglets
  // Dispositifs (PPS, PAP, PAI, PPRE, PPI) et GEVA-Sco.
  const { data: typeStructure } = useAsync(() => api.settingGet("typeStructure"), []);
  const ime = typeStructure === "ime";
  const tabs = React.useMemo(() => ELEVES_TABS.filter((t) => (t !== "dispositifs" && t !== "gevasco") || ime), [ime]);
  useSegmentNav(tabs, onglet, setOnglet);
  // Dispositifs et GEVA-Sco n'existent qu'en mode IME : plutôt qu'un clic sans
  // effet, on dit pourquoi l'onglet demandé n'est pas là.
  useOngletDemande("eleves", tabs, setOnglet, (demande) => {
    // Synthèse et synthèse GS vivent dans l'évaluation sommative : les liens
    // du dossier de l'élève et de ⌘K y mènent toujours.
    if (demande === "synthese") { setOnglet("evaluations"); setVueEvaluation("gs"); return; }
    if (demande === "syntheseEleve") { setOnglet("evaluations"); setVueEvaluation("synthese"); return; }
    toast("Cet onglet demande le mode IME (Réglages → Type de structure).", { icone: "⚙️" });
  });
  return (
    <Page titre="Élèves" sous="Classe, observations et évaluations">
      <div className="onglets">
        {[["liste", "Classe"], ["dossier", "Dossier"], ["observations", "Observations"], ["evaluations", "Évaluations"], ["papiers", "Papiers"], ...(ime ? [["dispositifs", "Dispositifs"], ["gevasco", "GEVA-Sco"]] : []), ["progressions", "Progressions"]]
          .map(([k, l]) => <button key={k} className={onglet === k ? "active" : ""} onClick={() => setOnglet(k as any)}>{l}</button>)}
      </div>
      {onglet === "liste" && <ListeEleves />}
      {onglet === "dossier" && <DossierTab />}
      {onglet === "observations" && <Observations />}
      {onglet === "evaluations" && <Evaluations vue={vueEvaluation} setVue={setVueEvaluation} />}
      {onglet === "papiers" && <Papiers />}
      {onglet === "dispositifs" && ime && <DispositifsTab />}
      {onglet === "gevasco" && ime && <GevaScoTab />}
      {onglet === "progressions" && <ProgressionsTab />}
    </Page>
  );
}

// ── Avatar (photo ou initiale) ─────────────────────────────────────────────
function Avatar({ eleve, size = 36 }: { eleve: Eleve; size?: number }) {
  const [src, setSrc] = React.useState("");
  React.useEffect(() => {
    if (eleve.photoFichier) api.fichierRead(eleve.photoFichier).then((b) => setSrc(`data:image;base64,${b}`)).catch(() => {});
    else setSrc("");
  }, [eleve.photoFichier]);
  if (src) return <img src={src} alt={eleve.nom} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "var(--accent-soft)", color: "var(--accent)",
      display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.4 }}>
      {eleve.nom.slice(0, 1).toUpperCase()}
    </div>
  );
}

// ── Classe ───────────────────────────────────────────────────────────────
function ListeEleves() {
  const { data: eleves, reload } = useAsync(() => api.elevesList(), []);
  const [edit, setEdit] = React.useState<Eleve | null>(null);
  const [del, setDel] = React.useState<Eleve | null>(null);
  return (
    <>
      <div className="toolbar"><div className="spacer" /><button className="btn primary" onClick={() => setEdit(nouvelEleve())}>+ Élève</button></div>
      {(eleves?.length ?? 0) === 0 ? <Empty icone="👧" titre="Aucun élève" sous="Ajoutez les élèves de votre classe." /> :
        eleves!.map((e) => (
          <div key={e.id} className="list-row"
            onContextMenu={(ev) => openCtx(ev, [
              { label: "Modifier la fiche", icon: "✏️", onClick: () => setEdit(e) },
              { label: "Supprimer l'élève", icon: "🗑", danger: true, sep: true, onClick: () => setDel(e) },
            ])}>
            <Avatar eleve={e} />
            <div style={{ flex: 1 }}>
              <div className="title">{e.nom}</div>
              <div className="meta">
                {[e.niveau, ageDe(e), e.ine && `INE ${e.ine}`].filter(Boolean).join(" · ")}
              </div>
            </div>
            <button className="btn ghost sm" onClick={() => setEdit(e)} aria-label="Modifier">✏️</button>
            <button className="btn ghost sm" onClick={() => setDel(e)} aria-label="Supprimer">🗑</button>
          </div>
        ))}
      {edit && <EleveForm e={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
      {del && <Confirm message={`Supprimer ${del.nom} ? Tout son dossier part avec : appels, commentaires, notes, papiers, photo, synthèse GS, PPI, GEVA-Sco, dispositifs, progressions, et sa place dans les créneaux et plans de salle. C'est définitif.`}
        onYes={() => api.eleveDelete(del.id).then(reload)} onClose={() => setDel(null)} />}
    </>
  );
}

function EleveForm({ e, onClose, onSaved }: { e: Eleve; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = React.useState<Eleve>(e);
  const up = (p: Partial<Eleve>) => setV({ ...v, ...p });
  const photoInput = React.useRef<HTMLInputElement>(null);

  const choisirPhoto = async (file: File) => {
    const b64 = await new Promise<string>((res, rej) => {
      const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1] ?? ""); r.onerror = rej; r.readAsDataURL(file);
    });
    if (v.photoFichier) await api.fichierDelete(v.photoFichier);
    const nom = await api.fichierSave(file.name, b64);
    up({ photoFichier: nom });
  };

  return (
    <Modal titre={e.nom ? "Modifier l'élève" : "Nouvel élève"} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={!v.nom.trim()} onClick={() => api.eleveSave(v).then(onSaved)}>Enregistrer</button></>}>
      <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 14 }}>
        <Avatar eleve={v} size={64} />
        <div>
          <input ref={photoInput} type="file" accept="image/*" style={{ display: "none" }}
            onChange={(ev) => { const f = ev.target.files?.[0]; if (f) choisirPhoto(f); ev.target.value = ""; }} />
          <button className="btn sm" onClick={() => photoInput.current?.click()}>📷 {v.photoFichier ? "Changer" : "Ajouter"} la photo</button>
          {v.photoFichier && <button className="btn ghost sm" style={{ marginLeft: 6 }}
            onClick={async () => { await api.fichierDelete(v.photoFichier!); up({ photoFichier: null }); }}>Retirer</button>}
        </div>
      </div>
      <Field label="Nom complet"><Input autoFocus value={v.nom} onChange={(ev) => up({ nom: ev.target.value })} /></Field>
      <div className="row">
        <Field label="Niveau"><Select value={v.niveau} onChange={(ev) => up({ niveau: ev.target.value })}>
          <option value="">—</option>{NIVEAUX_SCOLAIRES.map((n) => <option key={n}>{n}</option>)}</Select></Field>
        <Field label="Date de naissance"><Input type="date" value={v.dateNaissance} onChange={(ev) => up({ dateNaissance: ev.target.value })} /></Field>
      </div>
      <Field label="INE (optionnel)"><Input value={v.ine} onChange={(ev) => up({ ine: ev.target.value })} /></Field>
    </Modal>
  );
}

// ── Observations ─────────────────────────────────────────────────────────
function Observations() {
  const { data: eleves } = useAsync(() => api.elevesList(), []);
  const [eleveId, setEleveId] = React.useState<string>("");
  const { data: commentaires, reload } = useAsync(() => api.commentairesList(eleveId || undefined), [eleveId]);
  const [texte, setTexte] = React.useState("");
  const [type, setType] = React.useState("divers");
  const [dictee, setDictee] = React.useState(false);
  const [filtre, setFiltre] = React.useState<string | null>(null);
  // Deux façons de regarder un élève : les notes au fil de l'eau, et les
  // temps d'observation décidés à l'avance sur un axe.
  const [vue, setVue] = React.useState<"notes" | "grille">("notes");
  const comptes = React.useMemo(() => {
    const n: Record<string, number> = {};
    for (const c of commentaires ?? []) n[c.type] = (n[c.type] ?? 0) + 1;
    return n;
  }, [commentaires]);
  const affichees = (commentaires ?? []).filter((c) => !filtre || c.type === filtre);

  React.useEffect(() => { if (!eleveId && eleves?.length) setEleveId(eleves[0].id); }, [eleves, eleveId]);

  const ajouter = async () => {
    if (!texte.trim() || !eleveId) return;
    await api.commentaireSave({ id: newId(), date: nowIso(), texte, type, eleveId });
    setTexte(""); reload();
  };

  return (
    <>
      <div className="toolbar">
        <Select value={eleveId} onChange={(e) => setEleveId(e.target.value)} style={{ maxWidth: 240 }}>
          {eleves?.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
        </Select>
        <div className="spacer" />
        <div className="seg">
          <button className={vue === "notes" ? "active" : ""} onClick={() => setVue("notes")}>Notes</button>
          <button className={vue === "grille" ? "active" : ""} onClick={() => setVue("grille")}
            title="La grille « Observer » : réussites, difficultés, hypothèses, aménagements, réajustement">👁 Observer</button>
        </div>
        <button className="btn" disabled={!eleves?.length || vue === "grille"} onClick={() => setDictee(true)}
          title="Raconter l'atelier à voix haute et répartir les observations par élève">
          🎙 Dictée d'atelier
        </button>
      </div>
      {vue === "grille" && <GrilleObservation eleve={eleves?.find((e) => e.id === eleveId) ?? null} />}
      {vue === "notes" && <>
      {dictee && <DicteeAtelier eleves={eleves ?? []} onClose={() => setDictee(false)} onEnregistre={reload} />}
      <div className="card" style={{ marginBottom: 14 }}>
        <ChoixTypeObservation valeur={type} onChange={setType} />
        <div className="row" style={{ marginTop: 10 }}>
          <Input placeholder="Nouvelle observation…" value={texte} onChange={(e) => setTexte(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ajouter()}
            style={{ borderLeft: `4px solid ${couleurObservation(type)}` }} />
          <button className="btn primary" style={{ flex: "none" }} onClick={ajouter}>Ajouter</button>
        </div>
      </div>
      {(commentaires?.length ?? 0) > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
          <button className={`btn sm${filtre === null ? " primary" : ""}`} onClick={() => setFiltre(null)}>Toutes · {commentaires!.length}</button>
          {TYPES_OBSERVATION.filter((t) => comptes[t]).map((t) => (
            <button key={t} type="button" onClick={() => setFiltre(filtre === t ? null : t)} aria-pressed={filtre === t}
              style={{ border: "none", background: "none", padding: 0, cursor: "pointer", opacity: filtre && filtre !== t ? 0.45 : 1 }}>
              <ChipObservation type={t} compte={comptes[t]} />
            </button>
          ))}
        </div>
      )}
      {(commentaires?.length ?? 0) === 0 ? <Empty icone="📝" titre="Aucune observation" /> :
        affichees.map((c: CommentaireEleve) => (
          <div key={c.id} className="list-row" style={{ borderLeft: `4px solid ${couleurObservation(c.type)}` }}>
            <ChipObservation type={c.type} />
            <div style={{ flex: 1 }}>{c.texte}<div className="meta">{new Date(c.date).toLocaleDateString("fr-FR")}</div></div>
            <button className="btn ghost sm" aria-label="Supprimer"
              onClick={async () => {
                await api.commentaireDelete(c.id);
                reload();
                toastAnnulable("Observation supprimée.", async () => { await api.commentaireSave(c); reload(); });
              }}>🗑</button>
          </div>
        ))}
      </>}
    </>
  );
}

// ── Évaluations : sommative (notes, synthèse, synthèse GS) et diagnostique ──
// Deux natures qu'on ne mélange pas : le diagnostique décrit ce que l'élève
// sait faire en arrivant ; le sommatif fait le point sur ce qui est acquis —
// épreuves notées ou par compétences, synthèse rédigée d'après le suivi, et
// synthèse officielle des acquis de fin de GS.
function Evaluations({ vue, setVue }: { vue: VueEvaluation; setVue: (v: VueEvaluation) => void }) {
  const { data: evals, reload } = useAsync(() => api.evaluationsList(), []);
  const [edit, setEdit] = React.useState<Evaluation | null>(null);
  const [notes, setNotes] = React.useState<Evaluation | null>(null);
  const [del, setDel] = React.useState<Evaluation | null>(null);
  const sommative = vue !== "diagnostique";

  return (
    <>
      <div className="toolbar" style={{ flexWrap: "wrap" }}>
        <div className="seg" role="tablist" aria-label="Nature de l'évaluation">
          <button role="tab" aria-selected={sommative} className={sommative ? "active" : ""}
            onClick={() => { if (!sommative) setVue("notees"); }}>📊 Évaluation sommative</button>
          <button role="tab" aria-selected={!sommative} className={!sommative ? "active" : ""}
            onClick={() => setVue("diagnostique")}>🔍 Évaluation diagnostique</button>
        </div>
        {sommative && (
          <div className="seg" role="tablist" aria-label="Évaluation sommative">
            <button role="tab" aria-selected={vue === "notees"} className={vue === "notees" ? "active" : ""}
              onClick={() => setVue("notees")}>🔢 Évaluations notées</button>
            <button role="tab" aria-selected={vue === "synthese"} className={vue === "synthese" ? "active" : ""}
              onClick={() => setVue("synthese")}>📋 Synthèse</button>
            <button role="tab" aria-selected={vue === "gs"} className={vue === "gs" ? "active" : ""}
              onClick={() => setVue("gs")}>🎓 Synthèse GS</button>
          </div>
        )}
        <div className="spacer" />
        {vue === "notees" && <button className="btn primary" onClick={() => setEdit(nouvelleEvaluation())}>+ Évaluation</button>}
      </div>

      {vue === "diagnostique" && <EvaluationDiagnostiqueTab />}
      {vue === "synthese" && <SyntheseEleveTab />}
      {vue === "gs" && <SyntheseGS />}
      {vue === "notees" && ((evals?.length ?? 0) === 0 ? <Empty icone="📊" titre="Aucune évaluation" /> :
        evals!.map((ev) => (
          <div key={ev.id} className="list-row">
            <div style={{ flex: 1 }}>
              <div className="title">{ev.titre}</div>
              <div className="meta">{ev.matiere} · {new Date(ev.date).toLocaleDateString("fr-FR")} · {ev.mode === "note" ? `noté /${ev.bareme}` : "par compétences"}</div>
            </div>
            <span className="chip">{ev.mode === "note" ? "🔢 note" : "🎯 LSU"}</span>
            <button className="btn sm" onClick={() => setNotes(ev)}>Saisir</button>
            <button className="btn ghost sm" onClick={() => setEdit(ev)} aria-label="Modifier">✏️</button>
            <button className="btn ghost sm" onClick={() => setDel(ev)} aria-label="Supprimer">🗑</button>
          </div>
        )))}
      {edit && <EvalForm ev={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
      {notes && (notes.mode === "note" ? <NotesSheet ev={notes} onClose={() => setNotes(null)} /> : <LSUSheet ev={notes} onClose={() => setNotes(null)} />)}
      {del && <Confirm message={`Supprimer « ${del.titre} » ?`} onYes={() => api.evaluationDelete(del.id).then(reload)} onClose={() => setDel(null)} />}
    </>
  );
}

function EvalForm({ ev, onClose, onSaved }: { ev: Evaluation; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = React.useState<Evaluation>(ev);
  const up = (p: Partial<Evaluation>) => setV({ ...v, ...p });
  let comps: CompetenceSelectionnee[] = [];
  try { comps = v.competencesJson ? JSON.parse(v.competencesJson) : []; } catch { /* ignore */ }
  const setComps = (next: CompetenceSelectionnee[]) => up({ competencesJson: JSON.stringify(next) });
  const toggleComp = (c: CompetenceSelectionnee) => {
    const exist = comps.find((x) => x.competenceRefId === c.competenceRefId && x.sousDomaineTitre === c.sousDomaineTitre);
    setComps(exist ? comps.filter((x) => x !== exist) : [...comps, c]);
  };

  return (
    <Modal large={v.mode === "competences"} titre={ev.titre ? "Modifier l'évaluation" : "Nouvelle évaluation"} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={!v.titre.trim()} onClick={() => api.evaluationSave(v).then(onSaved)}>Enregistrer</button></>}>
      <Field label="Titre"><Input autoFocus value={v.titre} onChange={(e) => up({ titre: e.target.value })} /></Field>
      <div className="row">
        <Field label="Matière"><Select value={v.matiere} onChange={(e) => up({ matiere: e.target.value })}><option value="">—</option>{MATIERES.map((m) => <option key={m}>{m}</option>)}</Select></Field>
        <Field label="Date"><Input type="date" value={v.date.slice(0, 10)} onChange={(e) => up({ date: e.target.value })} /></Field>
        <Field label="Période"><Select value={v.periode} onChange={(e) => up({ periode: +e.target.value })}>{[1, 2, 3, 4, 5].map((p) => <option key={p} value={p}>P{p}</option>)}</Select></Field>
      </div>
      <Field label="Mode d'évaluation">
        <div className="seg">
          <button className={v.mode === "note" ? "active" : ""} onClick={() => up({ mode: "note" })}>Note chiffrée</button>
          <button className={v.mode === "competences" ? "active" : ""} onClick={() => up({ mode: "competences" })}>Compétences (LSU)</button>
        </div>
      </Field>
      {v.mode === "note" ? (
        <Field label="Barème"><Input type="number" value={v.bareme} onChange={(e) => up({ bareme: +e.target.value })} style={{ maxWidth: 120 }} /></Field>
      ) : (
        <div className="field">
          <label>Compétences évaluées</label>
          {comps.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {comps.map((c, i) => <span key={i} className="chip" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
              {labelCourt(c)} <button className="btn ghost sm" style={{ padding: 0, marginLeft: 4 }} onClick={() => toggleComp(c)} aria-label="Retirer">✕</button></span>)}
          </div>}
          <CompetenceTree mode="multi" selection={comps} onToggle={toggleComp} />
        </div>
      )}
    </Modal>
  );
}

function NotesSheet({ ev, onClose }: { ev: Evaluation; onClose: () => void }) {
  const { data: eleves } = useAsync(() => api.elevesList(), []);
  const { data: notes, reload } = useAsync(() => api.notesEleveList(ev.id), [ev.id]);
  const noteDe = (eleveId: string) => notes?.find((n) => n.eleveId === eleveId);
  const ensure = (e: Eleve): NoteEleve => noteDe(e.id) ?? { id: newId(), eleveNom: e.nom, eleveId: e.id, note: null, absent: false, commentaire: "", evaluationId: ev.id, niveauxJson: "{}" };

  const moyenne = (() => {
    const vals = (notes ?? []).filter((n) => !n.absent && n.note != null).map((n) => n.note!);
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "—";
  })();

  return (
    <Modal large titre={`Notes — ${ev.titre}`} onClose={onClose}
      footer={<><span className="chip">Moyenne classe : {moyenne}/{ev.bareme}</span><div className="spacer" /><button className="btn primary" onClick={onClose}>Terminé</button></>}>
      <table className="tbl">
        <thead><tr><th>Élève</th><th>Note /{ev.bareme}</th><th>Absent</th></tr></thead>
        <tbody>
          {eleves?.map((e) => {
            const n = noteDe(e.id);
            return (
              <tr key={e.id}>
                <td>{e.nom}</td>
                <td><Input type="number" step="0.5" max={ev.bareme} style={{ maxWidth: 90 }} value={n?.note ?? ""} disabled={n?.absent}
                  onChange={async (ev2) => { await api.noteEleveSave({ ...ensure(e), note: ev2.target.value === "" ? null : +ev2.target.value, absent: false }); reload(); }} /></td>
                <td><input type="checkbox" checked={n?.absent ?? false}
                  onChange={async (ev2) => { await api.noteEleveSave({ ...ensure(e), absent: ev2.target.checked, note: null }); reload(); }} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Modal>
  );
}

function LSUSheet({ ev, onClose }: { ev: Evaluation; onClose: () => void }) {
  const { data: eleves } = useAsync(() => api.elevesList(), []);
  const { data: notes, reload } = useAsync(() => api.notesEleveList(ev.id), [ev.id]);
  let comps: CompetenceSelectionnee[] = [];
  try { comps = ev.competencesJson ? JSON.parse(ev.competencesJson) : []; } catch { /* ignore */ }

  const noteDe = (eleveId: string) => notes?.find((n) => n.eleveId === eleveId);
  const niveau = (eleveId: string, compId: string): number | null => {
    const n = noteDe(eleveId); if (!n) return null;
    try { return (JSON.parse(n.niveauxJson || "{}") as Record<string, number>)[compId] ?? null; } catch { return null; }
  };
  const setNiveau = async (e: Eleve, compId: string, val: number) => {
    const base = noteDe(e.id) ?? { id: newId(), eleveNom: e.nom, eleveId: e.id, note: null, absent: false, commentaire: "", evaluationId: ev.id, niveauxJson: "{}" } as NoteEleve;
    let d: Record<string, number> = {};
    try { d = JSON.parse(base.niveauxJson || "{}"); } catch { /* ignore */ }
    if (d[compId] === val) delete d[compId]; else d[compId] = val;
    await api.noteEleveSave({ ...base, niveauxJson: JSON.stringify(d) }); reload();
  };

  if (comps.length === 0) return <Modal titre="Compétences" onClose={onClose}><Empty icone="🎯" titre="Aucune compétence" sous="Modifiez l'évaluation pour en choisir." /></Modal>;

  return (
    <Modal large titre={`Positionnement — ${ev.titre}`} onClose={onClose}
      footer={<><div className="spacer" /><button className="btn primary" onClick={onClose}>Terminé</button></>}>
      <div style={{ overflowX: "auto" }}>
        <table className="tbl">
          <thead><tr><th>Élève</th>{comps.map((c, i) => <th key={i} title={c.competenceTitre}>{labelCourt(c).slice(0, 28)}</th>)}</tr></thead>
          <tbody>
            {eleves?.map((e) => (
              <tr key={e.id}>
                <td>{e.nom}</td>
                {comps.map((c, i) => {
                  const cur = niveau(e.id, c.id);
                  return (
                    <td key={i}>
                      <div style={{ display: "flex", gap: 3 }}>
                        {NIVEAUX_MAITRISE.map((nv) => (
                          <button key={nv.n} title={nv.label} onClick={() => setNiveau(e, c.id, nv.n)}
                            style={{ width: 22, height: 22, borderRadius: 5, border: "none", cursor: "pointer",
                              background: cur === nv.n ? nv.couleur : "var(--panel-2)", color: cur === nv.n ? "#fff" : "var(--text-2)", fontWeight: 700, fontSize: 11 }}>
                            {nv.n}
                          </button>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-2)" }}>
        {NIVEAUX_MAITRISE.map((nv) => <span key={nv.n} style={{ marginRight: 12 }}><b style={{ color: nv.couleur }}>{nv.n}</b> {nv.label}</span>)}
      </div>
    </Modal>
  );
}

// ── Synthèse des acquis de fin de maternelle (GS) ──────────────────────────
interface SynItem { id: string; bloc: string | null; label: string }
interface SynDom { id: string; titre: string; titreObservations: string; items: SynItem[]; enonces: string[] }
interface SynData { positionnements: Record<string, number>; observations: Record<string, string>; dateVisa?: string }
const POS_GS = [
  { n: 1, label: "Ne réussit pas encore", couleur: "#d64d4d" },
  { n: 2, label: "En voie de réussite", couleur: "#eb9e33" },
  { n: 3, label: "Réussit souvent", couleur: "#57b873" },
];

function todayIso() { return new Date().toISOString().slice(0, 10); }
function fmtDateFr(iso?: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

function SyntheseGS() {
  const doms = syntheseDomaines as SynDom[];
  const { data: eleves } = useAsync(() => api.elevesList(), []);
  const [eleveId, setEleveId] = React.useState("");
  const [data, setData] = React.useState<SynData>({ positionnements: {}, observations: {} });
  const [ecole, setEcole] = React.useState("");
  const [enseignantNom, setEnseignantNom] = React.useState("");
  const [directeurNom, setDirecteurNom] = React.useState("");
  const [directeurDate, setDirecteurDate] = React.useState("");
  const [reformuleEnCours, setReformuleEnCours] = React.useState<string | null>(null);

  React.useEffect(() => {
    api.settingGet("ecole").then((v) => setEcole(v ?? ""));
    api.settingGet("enseignantNom").then((v) => setEnseignantNom(v ?? ""));
    api.settingGet("syntheseGS:directeurNom").then((v) => setDirecteurNom(v ?? ""));
    api.settingGet("syntheseGS:directeurDate").then((v) => setDirecteurDate(v ?? ""));
  }, []);

  const majDirecteurNom = (v: string) => { setDirecteurNom(v); api.settingSet("syntheseGS:directeurNom", v); };
  const majDirecteurDate = (v: string) => { setDirecteurDate(v); api.settingSet("syntheseGS:directeurDate", v); };

  React.useEffect(() => {
    const gs = (eleves ?? []).filter((e) => e.niveau === "GS");
    if (!eleveId && (gs[0] || eleves?.[0])) setEleveId((gs[0] ?? eleves![0]).id);
  }, [eleves, eleveId]);

  React.useEffect(() => {
    if (!eleveId) return;
    api.documentEleveGet(eleveId, "syntheseGS").then((v) => {
      try { setData(v ? JSON.parse(v) : { positionnements: {}, observations: {} }); }
      catch { setData({ positionnements: {}, observations: {} }); }
    });
  }, [eleveId]);

  const persister = (d: SynData) => { setData(d); if (eleveId) api.documentEleveSet(eleveId, "syntheseGS", JSON.stringify(d)); };
  const setPos = (itemId: string, n: number) => {
    const p = { ...data.positionnements };
    if (p[itemId] === n) delete p[itemId]; else p[itemId] = n;
    persister({ ...data, positionnements: p });
  };
  const setObs = (domId: string, t: string) => persister({ ...data, observations: { ...data.observations, [domId]: t } });
  const setDateVisa = (v: string) => persister({ ...data, dateVisa: v });

  const eleve = eleves?.find((e) => e.id === eleveId);

  // Reformulation IA (Mistral) d'un commentaire de domaine : transforme les
  // notes brutes de l'enseignant en un bilan rédigé, bienveillant et adapté à
  // un document officiel, en réutilisant le prénom de l'élève.
  const reformuler = async (dom: SynDom) => {
    const texte = (data.observations[dom.id] ?? "").trim();
    if (!texte) { toast("Écrivez d'abord quelques mots à reformuler.", { icone: "✍️" }); return; }
    const prenom = (eleve?.nom || "L'élève").trim().split(/\s+/)[0];
    setReformuleEnCours(dom.id);
    try {
      // Aucun nom ne part : ceux des élèves sont masqués dans le texte, et
      // l'élève concerné est désigné par [E], remplacé par son prénom au retour.
      const { texte: masque, table } = pseudonymiser(texte, (eleves ?? []).map((e) => e.nom));
      const modele = await api.modeleActif();
      const rep = await api.mistralChat([
        { role: "system", content:
          "Tu es enseignant·e de maternelle. Tu reformules les observations d'un enseignant pour la synthèse officielle des acquis de fin de Grande Section. " +
          "Rédige en français, dans un style clair, bienveillant et professionnel, à la 3e personne. L'élève est désigné par [E] : écris [E] là où tu nommerais l'élève. " +
          "Les marqueurs comme [P1] remplacent des prénoms : recopie-les exactement. " +
          "Reste fidèle au sens, ne rajoute aucune information inventée, garde une longueur similaire (2 à 4 phrases). " +
          "Réponds UNIQUEMENT par le texte reformulé, sans guillemets ni commentaire." },
        { role: "user", content: `Domaine : ${dom.titre}\n\nObservations à reformuler :\n${masque}` },
      ], modele);
      const propre = restaurer(rep.trim().replace(/^["«»\s]+|["«»\s]+$/g, ""), table).texte.replace(/\[E\]/g, prenom);
      if (propre) setObs(dom.id, propre);
    } catch (e: any) {
      toast("Reformulation impossible : " + String(e?.message ?? e), { icone: "⚠️", duree: 5000 });
    } finally {
      setReformuleEnCours(null);
    }
  };

  const [exportEnCours, setExportEnCours] = React.useState(false);
  const [exportErreur, setExportErreur] = React.useState("");

  const imprimer = async () => {
    if (!eleve) return;
    setExportErreur("");
    setExportEnCours(true);
    try {
      // Structure complète des domaines (titres, items + positions, énoncés,
      // observation) pour que le backend reconstruise le tableau.
      const domaines = doms.map((d) => ({
        titre: d.titre,
        titreObservations: d.titreObservations,
        items: d.items.map((it) => ({ bloc: it.bloc, label: it.label, position: data.positionnements[it.id] ?? 0 })),
        enonces: d.enonces,
        observation: data.observations[d.id] ?? "",
      }));
      await api.exporterSyntheseGs({
        ecole, eleveNom: eleve.nom, domaines,
        dateVisaEnseignant: fmtDateFr(data.dateVisa || todayIso()), enseignantNom,
        directeurNom, dateVisaDirecteur: fmtDateFr(directeurDate),
      });
    } catch (e: any) {
      setExportErreur(String(e));
    } finally {
      setExportEnCours(false);
    }
  };

  return (
    <>
      <div className="toolbar">
        <Select value={eleveId} onChange={(e) => setEleveId(e.target.value)} style={{ maxWidth: 240 }}>
          {eleves?.map((e) => <option key={e.id} value={e.id}>{e.nom}{e.niveau ? ` (${e.niveau})` : ""}</option>)}
        </Select>
        <div className="spacer" />
        {exportErreur && <span style={{ color: "var(--danger, #d64d4d)", fontSize: 12, marginRight: 8 }}>{exportErreur}</span>}
        <button className="btn sm" onClick={imprimer} disabled={!eleve || exportEnCours}>
          {exportEnCours ? "Export…" : "🖨 Exporter le PDF officiel"}
        </button>
      </div>
      {eleve && <div className="card" style={{ marginBottom: 14 }}>
        <h3 style={{ marginTop: 0 }}>📝 Visa (export)</h3>
        <div className="row">
          <Field label="Date de signature — enseignant">
            <Input type="date" value={data.dateVisa ?? todayIso()} onChange={(e) => setDateVisa(e.target.value)} />
          </Field>
          <Field label="Nom de la directrice / du directeur">
            <Input value={directeurNom} onChange={(e) => majDirecteurNom(e.target.value)} placeholder="(commun à tous les élèves)" />
          </Field>
          <Field label="Date de signature — direction">
            <Input type="date" value={directeurDate} onChange={(e) => majDirecteurDate(e.target.value)} />
          </Field>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-2)" }}>
          Nom enseignant repris des Réglages ({enseignantNom || "non renseigné"}) — école : {ecole || "non renseignée"}.
        </div>
      </div>}
      {!eleve ? <Empty icone="🎓" titre="Aucun élève" sous="Ajoutez vos élèves de GS dans l'onglet Classe." /> :
        doms.map((d) => (
          <div key={d.id} className="card" style={{ marginBottom: 14 }}>
            <h3 style={{ marginTop: 0 }}>{d.titre}</h3>
            {d.items.map((it) => (
              <div key={it.id} style={{ display: "flex", gap: 10, alignItems: "start", padding: "8px 0", borderTop: "1px solid var(--border)" }}>
                <div style={{ flex: 1, fontSize: 13 }}>
                  {it.bloc && <div style={{ fontWeight: 700, color: "var(--text-2)", fontSize: 12, marginBottom: 2 }}>{it.bloc}</div>}
                  {it.label}
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  {POS_GS.map((p) => {
                    const on = data.positionnements[it.id] === p.n;
                    return <button key={p.n} title={p.label} onClick={() => setPos(it.id, p.n)}
                      style={{ width: 26, height: 26, borderRadius: 6, border: "none", cursor: "pointer", fontWeight: 700,
                        background: on ? p.couleur : "var(--panel-2)", color: on ? "#fff" : "var(--text-2)" }}>{p.n}</button>;
                  })}
                </div>
              </div>
            ))}
            {d.enonces.length > 0 && <ul style={{ margin: "6px 0", paddingLeft: 18, fontSize: 13, color: "var(--text-2)" }}>
              {d.enonces.map((e, i) => <li key={i}>{e}</li>)}</ul>}
            <div className="field" style={{ marginTop: 10, marginBottom: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ flex: 1, margin: 0 }}>{d.titreObservations}</label>
                <button className="btn sm" disabled={reformuleEnCours === d.id || !(data.observations[d.id] ?? "").trim()}
                  title="Reformuler ce commentaire avec l'assistant IA"
                  onClick={() => reformuler(d)}>
                  {reformuleEnCours === d.id ? "Reformulation…" : "✨ Reformuler"}
                </button>
              </div>
              <textarea className="textarea" value={data.observations[d.id] ?? ""} onChange={(e) => setObs(d.id, e.target.value)} />
            </div>
          </div>
        ))}
      {eleve && <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 4 }}>
        {POS_GS.map((p) => <span key={p.n} style={{ marginRight: 12 }}><b style={{ color: p.couleur }}>{p.n}</b> {p.label}</span>)}
      </div>}
    </>
  );
}

// ── Papiers ──────────────────────────────────────────────────────────────
function Papiers() {
  const { data: eleves } = useAsync(() => api.elevesList(), []);
  const { data: papiers, reload } = useAsync(() => api.papiersList(), []);
  const [intitule, setIntitule] = React.useState("");
  const [colonnes, setColonnes] = React.useState<string[]>([]);

  React.useEffect(() => {
    api.settingGet("papiersIntitules").then((v) => { try { setColonnes(v ? JSON.parse(v) : []); } catch { setColonnes([]); } });
  }, []);
  const intitules = Array.from(new Set([...colonnes, ...(papiers ?? []).map((p) => p.intitule)].filter(Boolean)));

  const creerColonne = async () => {
    const t = intitule.trim();
    if (!t || intitules.includes(t)) { setIntitule(""); return; }
    const next = [...colonnes, t]; setColonnes(next);
    await api.settingSet("papiersIntitules", JSON.stringify(next)); setIntitule("");
  };
  const toggle = async (intitule: string, eleveId: string) => {
    const exist = (papiers ?? []).find((p) => p.intitule === intitule && p.eleveId === eleveId);
    if (exist) await api.papierDelete(exist.id);
    else await api.papierSave({ id: newId(), intitule, eleveId, type: "coche", nomFichier: "", note: "", dateAjout: nowIso() });
    reload();
  };
  const recu = (intitule: string, eleveId: string) => (papiers ?? []).some((p) => p.intitule === intitule && p.eleveId === eleveId);

  return (
    <>
      <div className="toolbar">
        <Input placeholder="Nouvel intitulé (ex. Autorisation de sortie)" value={intitule}
          onChange={(e) => setIntitule(e.target.value)} onKeyDown={(e) => e.key === "Enter" && creerColonne()} />
        <button className="btn primary" style={{ flex: "none" }} disabled={!intitule.trim()} onClick={creerColonne}>Créer la colonne</button>
      </div>
      {intitules.length === 0 ? <Empty icone="📄" titre="Aucun papier" sous="Créez un intitulé puis cochez qui a rendu." /> :
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead><tr><th>Élève</th>{intitules.map((i) => <th key={i}>{i}</th>)}</tr></thead>
            <tbody>
              {eleves?.map((e) => (
                <tr key={e.id}><td>{e.nom}</td>{intitules.map((i) => <td key={i}><input type="checkbox" checked={recu(i, e.id)} onChange={() => toggle(i, e.id)} /></td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>}
    </>
  );
}
