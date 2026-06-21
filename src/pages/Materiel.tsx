import React from "react";
import { Page } from "../App";
import { api, MaterielItem, Referentiel, CYCLES, newId, nowIso, couleurPourMatiere, couleurHex } from "../api";
import { Modal, Field, Input, Textarea, Select, Empty, Confirm, useAsync } from "../components/ui";
import { CompetenceTree, CompetenceSelectionnee, labelCourt } from "../components/CompetenceTree";
import { FileListEditor } from "../components/SeanceParts";
import { openCtx } from "../components/ctxmenu";

const nouveau = (): MaterielItem => ({
  id: newId(), titre: "", descriptionMateriel: "", competenceId: "", competenceTitre: "",
  domaineTitre: "", sousDomaineTitre: "", cycle: "", imagesJson: "[]", pdfsJson: "[]", dateCreation: nowIso(), seanceId: null, sequenceId: null,
});

export default function Materiel() {
  const { data: items, reload } = useAsync(() => api.materielList(), []);
  const [edit, setEdit] = React.useState<MaterielItem | null>(null);
  const [del, setDel] = React.useState<MaterielItem | null>(null);
  const [choixPdf, setChoixPdf] = React.useState<MaterielItem | null>(null);
  const [q, setQ] = React.useState("");
  const [ouverts, setOuverts] = React.useState<Record<string, boolean>>({});
  const toggle = (k: string) => setOuverts((s) => ({ ...s, [k]: !s[k] }));

  // macOS : ouvre le PDF dans Aperçu (app native) plutôt que dans l'app.
  const ouvrirPdfs = (m: MaterielItem) => {
    const noms = liste(m.pdfsJson);
    if (noms.length === 1) api.ouvrirFichier(noms[0]);
    else if (noms.length > 1) setChoixPdf(m);
  };

  const filtres = (items ?? []).filter((m) => !q || m.titre.toLowerCase().includes(q.toLowerCase()));

  // Regroupement par domaine / matière puis sous-domaine (« Sans domaine » en dernier).
  const groupes: Record<string, Record<string, MaterielItem[]>> = {};
  filtres.forEach((m) => {
    const d = m.domaineTitre || "Sans domaine";
    const sd = m.sousDomaineTitre || "Autres";
    ((groupes[d] ??= {})[sd] ??= []).push(m);
  });
  const domaines = Object.keys(groupes).sort((a, b) => (a === "Sans domaine" ? 1 : b === "Sans domaine" ? -1 : a.localeCompare(b)));
  // Vraie couleur de la matière (définie dans Réglages → général).
  const teinte = (dom: string) => couleurHex[couleurPourMatiere(dom)] ?? couleurHex.gray;

  const carte = (m: MaterielItem) => (
    <div key={m.id} className="card"
      onContextMenu={(e) => openCtx(e, [
        { label: "Modifier", icon: "✏️", onClick: () => setEdit(m) },
        { label: "Dupliquer", icon: "📑", onClick: () => api.materielSave({ ...m, id: crypto.randomUUID(), titre: m.titre + " (copie)" }).then(reload) },
        { label: "Supprimer", icon: "🗑", danger: true, sep: true, onClick: () => setDel(m) },
      ])}>
      <div style={{ display: "flex", alignItems: "start" }}>
        <div style={{ fontWeight: 700, flex: 1 }}>{m.titre}</div>
        <button className="btn ghost sm" onClick={() => setEdit(m)} aria-label="Modifier">✏️</button>
        <button className="btn ghost sm" onClick={() => setDel(m)} aria-label="Supprimer">🗑</button>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
        {m.cycle && <span className="chip">{m.cycle}</span>}
        {m.sousDomaineTitre && <span className="chip">{m.sousDomaineTitre}</span>}
        {m.seanceId && <span className="chip" title="Ajouté depuis une séance">📎 séance</span>}
        {nb(m.imagesJson) > 0 && <span className="chip">📷 {nb(m.imagesJson)}</span>}
        {nb(m.pdfsJson) > 0 && (
          <button className="chip" title="Voir / imprimer le(s) PDF"
            style={{ cursor: "pointer", border: "none" }} onClick={() => ouvrirPdfs(m)}>
            📄 {nb(m.pdfsJson)} · voir
          </button>
        )}
      </div>
      {m.competenceTitre && <div style={{ fontSize: 12.5, color: "var(--accent)", marginTop: 6 }}>🎯 {m.competenceTitre}</div>}
      {m.descriptionMateriel && <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 8 }}>{m.descriptionMateriel.slice(0, 120)}</div>}
    </div>
  );

  return (
    <Page titre="Matériel" sous="Ressources et matériel pédagogique"
      actions={<button className="btn primary" onClick={() => setEdit(nouveau())}>+ Matériel</button>}>
      <div className="toolbar"><Input className="search" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {filtres.length === 0 ? <Empty icone="🧰" titre="Aucun matériel" /> :
        domaines.map((dom) => {
          const t = teinte(dom);
          const total = Object.values(groupes[dom]).reduce((n, l) => n + l.length, 0);
          const ouvert = q ? true : !!ouverts[dom];
          const sousDoms = Object.keys(groupes[dom]).sort((a, b) => a.localeCompare(b));
          return (
            <div key={dom} style={{ marginBottom: 12 }}>
              <button onClick={() => toggle(dom)} disabled={!!q}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", cursor: q ? "default" : "pointer",
                  background: t + "1f", border: `1px solid ${t}55`, borderLeft: `3px solid ${t}`, borderRadius: 10,
                  color: "var(--text)", font: "inherit", fontWeight: 700, fontSize: 14 }}>
                <span style={{ fontSize: 16 }}>{ouvert ? "📂" : "📁"}</span>
                <span style={{ flex: 1, textAlign: "left" }}>{dom}</span>
                <span className="chip" style={{ background: t + "33" }}>{total}</span>
                <span style={{ color: "var(--text-2)", transform: ouvert ? "rotate(90deg)" : "none", transition: "transform .15s" }}>›</span>
              </button>
              {ouvert && (
                <div style={{ paddingLeft: 14, marginTop: 8 }}>
                  {sousDoms.map((sd) => (
                    <div key={sd} style={{ marginBottom: 12 }}>
                      {(sousDoms.length > 1 || sd !== "Autres") && (
                        <h3 style={{ margin: "0 0 8px", fontSize: 13, color: "var(--text-2)", display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: t, flexShrink: 0 }} />{sd}
                        </h3>
                      )}
                      <div className="grid cols">{groupes[dom][sd].map(carte)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      {edit && <Form m={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
      {del && <Confirm message={`Supprimer « ${del.titre} » ?`} onYes={() => api.materielDelete(del.id).then(reload)} onClose={() => setDel(null)} />}
      {choixPdf && (
        <Modal titre={`PDF — ${choixPdf.titre}`} onClose={() => setChoixPdf(null)}
          footer={<button className="btn" onClick={() => setChoixPdf(null)}>Fermer</button>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {liste(choixPdf.pdfsJson).map((nom, i) => (
              <div key={nom} className="list-row">
                <span>📄</span><div style={{ flex: 1 }} className="title">{choixPdf.titre} — PDF {i + 1}</div>
                <button className="btn ghost sm" onClick={() => { api.ouvrirFichier(nom); setChoixPdf(null); }}>Ouvrir dans Aperçu</button>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </Page>
  );
}

function nb(json: string): number { try { return JSON.parse(json || "[]").length; } catch { return 0; } }
function liste(json: string): string[] { try { return JSON.parse(json || "[]"); } catch { return []; } }

function Form({ m, onClose, onSaved }: { m: MaterielItem; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = React.useState<MaterielItem>(m);
  const up = (p: Partial<MaterielItem>) => setV((cur) => ({ ...cur, ...p }));

  const compSel: CompetenceSelectionnee | null = v.competenceId
    ? { id: v.competenceId, referentielNom: "", domaineId: "", domaineTitre: v.domaineTitre,
        sousDomaineTitre: v.sousDomaineTitre, competenceTitre: v.competenceTitre, competenceRefId: v.competenceId }
    : null;
  const choisir = (c: CompetenceSelectionnee, ref: Referentiel) => up({
    competenceId: c.competenceRefId ?? "", competenceTitre: c.competenceTitre,
    domaineTitre: c.domaineTitre, sousDomaineTitre: c.sousDomaineTitre, cycle: ref.cycle || v.cycle,
  });

  return (
    <Modal large titre={m.titre ? "Modifier le matériel" : "Nouveau matériel"} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={!v.titre.trim()} onClick={() => api.materielSave(v).then(onSaved)}>Enregistrer</button></>}>
      <Field label="Titre"><Input autoFocus value={v.titre} onChange={(e) => up({ titre: e.target.value })} /></Field>
      <Field label="Cycle"><Select value={v.cycle} onChange={(e) => up({ cycle: e.target.value })}><option value="">—</option>{CYCLES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
      <Field label="Description"><Textarea value={v.descriptionMateriel} onChange={(e) => up({ descriptionMateriel: e.target.value })} /></Field>
      <div className="field">
        <label style={{ display: "flex", alignItems: "center" }}>Compétence liée
          {compSel && <button className="btn ghost sm" style={{ marginLeft: "auto", color: "var(--danger)" }}
            onClick={() => up({ competenceId: "", competenceTitre: "", domaineTitre: "", sousDomaineTitre: "" })}>Effacer</button>}
        </label>
        {compSel && <div style={{ background: "var(--accent-soft)", color: "var(--accent)", padding: "8px 12px", borderRadius: 9, marginBottom: 8, fontSize: 13 }}>🎯 {labelCourt(compSel)}</div>}
        <CompetenceTree mode="single" selection={compSel ? [compSel] : []} onPick={choisir} />
      </div>
      <div className="row">
        <Field label="Images"><FileListEditor type="image" fichiers={liste(v.imagesJson)} onChange={(f) => up({ imagesJson: JSON.stringify(f) })} /></Field>
        <Field label="PDF"><FileListEditor type="pdf" fichiers={liste(v.pdfsJson)} onChange={(f) => up({ pdfsJson: JSON.stringify(f) })} /></Field>
      </div>
    </Modal>
  );
}
