import React from "react";
import { Page } from "../App";
import { api, Referentiel, newId, nowIso } from "../api";
import { Empty, Confirm, Input, useAsync } from "../components/ui";
import { openCtx } from "../components/ctxmenu";
import { toast } from "../components/Toaster";

interface RefComp { id: string; texte: string; niveau?: string; _ajoute?: boolean; _modifie?: boolean }
interface RefCG { id: string; titre: string; competences?: RefComp[] }
interface RefSous { id: string; titre: string; competences?: RefComp[]; competencesGenerales?: RefCG[] }
interface RefDom { id: string; titre: string; sousDomaines: RefSous[] }
interface RefData { titre: string; domaines: RefDom[] }

export default function Referentiels() {
  const { data: refs, reload } = useAsync(() => api.referentielsList(), []);
  const { data: notes, reload: reloadNotes } = useAsync(() => api.notesCompetenceList(), []);
  const [sel, setSel] = React.useState<string | null>(null);
  const [del, setDel] = React.useState<Referentiel | null>(null);
  // Domaines repliés/dépliés (comme les dossiers des Ressources).
  const [ouverts, setOuverts] = React.useState<Record<string, boolean>>({});
  const toggleDom = (id: string) => setOuverts((s) => ({ ...s, [id]: !s[id] }));
  const fileRef = React.useRef<HTMLInputElement>(null);

  const courant = refs?.find((r) => r.id === sel) ?? refs?.[0];
  const editable = courant ? !courant.estIntegre : false;

  let data: RefData | null = null;
  try { data = courant ? JSON.parse(courant.donnees) : null; } catch { data = null; }

  // ── Persistance d'une modification du contenu (référentiels éditables) ──
  const majData = async (mut: (d: RefData) => void) => {
    if (!courant || !data) return;
    const clone: RefData = JSON.parse(JSON.stringify(data));
    mut(clone);
    await api.referentielSave({ ...courant, donnees: JSON.stringify(clone) });
    reload();
  };
  const eachComp = (d: RefData, fn: (arr: RefComp[], i: number) => void) => {
    for (const dom of d.domaines) for (const sd of dom.sousDomaines) {
      (sd.competences ?? []).forEach((_, i) => fn(sd.competences!, i));
      (sd.competencesGenerales ?? []).forEach((cg) => (cg.competences ?? []).forEach((_, i) => fn(cg.competences!, i)));
    }
  };
  const updateComp = (id: string, patch: Partial<RefComp>) => majData((d) => eachComp(d, (arr, i) => { if (arr[i].id === id) arr[i] = { ...arr[i], ...patch }; }));
  const deleteComp = (id: string) => majData((d) => { for (const dom of d.domaines) for (const sd of dom.sousDomaines) {
    if (sd.competences) sd.competences = sd.competences.filter((c) => c.id !== id);
    for (const cg of sd.competencesGenerales ?? []) if (cg.competences) cg.competences = cg.competences.filter((c) => c.id !== id);
  } });
  const addComp = (domId: string, sousId: string) => majData((d) => {
    const sd = d.domaines.find((x) => x.id === domId)?.sousDomaines.find((x) => x.id === sousId);
    if (sd) { sd.competences = [...(sd.competences ?? []), { id: "c_" + newId(), texte: "Nouvelle compétence", niveau: "", _ajoute: true }]; }
  });
  const addSous = (domId: string) => majData((d) => {
    const dom = d.domaines.find((x) => x.id === domId);
    if (dom) dom.sousDomaines.push({ id: "sd_" + newId(), titre: "Nouveau sous-domaine", competences: [] });
  });
  const addDomaine = () => majData((d) => d.domaines.push({ id: "d_" + newId(), titre: "Nouveau domaine", sousDomaines: [] }));
  const renameSous = (domId: string, sousId: string, titre: string) => majData((d) => {
    const sd = d.domaines.find((x) => x.id === domId)?.sousDomaines.find((x) => x.id === sousId); if (sd) sd.titre = titre;
  });
  const renameDom = (domId: string, titre: string) => majData((d) => { const dom = d.domaines.find((x) => x.id === domId); if (dom) dom.titre = titre; });

  const importer = async (file: File) => {
    const txt = await file.text();
    try {
      const d = JSON.parse(txt) as RefData;
      await api.referentielSave({ id: newId(), nom: d.titre || file.name.replace(/\.json$/, ""), cycle: "", donnees: txt, estIntegre: false, dateAjout: nowIso(), actif: true });
      reload();
    } catch { toast("JSON invalide. Format attendu : { titre, domaines: [...] }", { icone: "⚠️" }); }
  };
  const noteDe = (id: string) => notes?.find((n) => n.competenceRefId === id);
  const setNote = async (id: string, texte: string) => {
    const ex = noteDe(id);
    await api.noteCompetenceSave(ex ? { ...ex, texte, dateModification: nowIso() } : { id: newId(), competenceRefId: id, texte, dateCreation: nowIso(), dateModification: nowIso() });
    reloadNotes();
  };
  const toggleActif = async (r: Referentiel) => { await api.referentielSave({ ...r, actif: !r.actif }); reload(); };
  const dupliquer = async (r: Referentiel) => {
    await api.referentielSave({ id: newId(), nom: r.nom + " (copie)", cycle: r.cycle, donnees: r.donnees, estIntegre: false, dateAjout: nowIso(), actif: true });
    reload();
  };

  return (
    <Page titre="Référentiels" sous="Compétences des programmes officiels — modifiables"
      actions={<>
        <input ref={fileRef} type="file" accept=".json" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importer(f); e.target.value = ""; }} />
        <button className="btn primary" onClick={() => fileRef.current?.click()}>Importer (JSON)</button>
      </>}>
      {(refs?.length ?? 0) === 0 ? (
        <Empty icone="📖" titre="Aucun référentiel" sous="Importez un référentiel au format JSON." />
      ) : (
        <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
          <div style={{ width: 240, flexShrink: 0 }}>
            {refs!.map((r) => (
              <div key={r.id} className="list-row" style={{ cursor: "pointer", borderColor: courant?.id === r.id ? "var(--accent)" : undefined }}
                onClick={() => setSel(r.id)}
                onContextMenu={(e) => openCtx(e, [
                  { label: r.actif ? "Masquer" : "Activer", icon: r.actif ? "🚫" : "👁", onClick: () => toggleActif(r) },
                  { label: "Dupliquer pour modifier", icon: "📑", onClick: () => dupliquer(r) },
                  { label: "Supprimer", icon: "🗑", danger: true, sep: true, onClick: () => setDel(r) },
                ])}>
                <div style={{ flex: 1 }}>
                  <div className="title" style={{ fontSize: 13.5 }}>{r.nom}</div>
                  <div className="meta">{r.estIntegre ? "intégré" : "modifiable"} · {r.actif ? "actif" : "masqué"}</div>
                </div>
                <button className="btn ghost sm" onClick={(e) => { e.stopPropagation(); toggleActif(r); }}>{r.actif ? "👁" : "🚫"}</button>
                <button className="btn ghost sm" onClick={(e) => { e.stopPropagation(); setDel(r); }} aria-label="Supprimer">🗑</button>
              </div>
            ))}
          </div>

          <div style={{ flex: 1 }}>
            {!editable && courant && (
              <div className="card" style={{ marginBottom: 12, background: "var(--accent-soft)", fontSize: 13 }}>
                ℹ️ Référentiel intégré (lecture seule). <b>Clic droit → « Dupliquer pour modifier »</b> pour le personnaliser.
              </div>
            )}
            {editable && (
              <div className="toolbar"><span className="chip">✏️ Modifiable</span><div className="spacer" /><button className="btn sm" onClick={addDomaine}>+ Domaine</button></div>
            )}
            {!data ? <Empty icone="⚠️" titre="Données illisibles" /> :
              data.domaines.map((dom) => {
                const ouvert = editable || !!ouverts[dom.id];
                const nbComp = dom.sousDomaines.reduce((n, sd) =>
                  n + (sd.competences?.length ?? 0) + (sd.competencesGenerales ?? []).reduce((m, cg) => m + (cg.competences?.length ?? 0), 0), 0);
                return (
                <div key={dom.id} className="card" style={{ marginBottom: 12 }}>
                  <div onClick={() => !editable && toggleDom(dom.id)}
                    style={{ display: "flex", alignItems: "center", gap: 8, cursor: editable ? "default" : "pointer", marginBottom: ouvert ? 8 : 0 }}>
                    <span onClick={(e) => { e.stopPropagation(); toggleDom(dom.id); }} style={{ cursor: "pointer", fontSize: 16 }}>{ouvert ? "📂" : "📁"}</span>
                    {editable
                      ? <Input value={dom.titre} style={{ fontWeight: 700, flex: 1 }} onChange={(e) => renameDom(dom.id, e.target.value)} />
                      : <div style={{ fontWeight: 700, flex: 1 }}>{dom.titre}</div>}
                    {!ouvert && <span className="chip">{nbComp}</span>}
                    <span onClick={(e) => { e.stopPropagation(); toggleDom(dom.id); }}
                      style={{ cursor: "pointer", color: "var(--text-2)", transform: ouvert ? "rotate(90deg)" : "none", transition: "transform .15s" }}>›</span>
                  </div>
                  {ouvert && dom.sousDomaines.map((sd) => (
                    <div key={sd.id} style={{ marginLeft: 6, marginBottom: 10 }}>
                      {editable
                        ? <Input value={sd.titre} style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }} onChange={(e) => renameSous(dom.id, sd.id, e.target.value)} />
                        : <div style={{ fontWeight: 600, color: "var(--text-2)", fontSize: 13, marginBottom: 4 }}>{sd.titre}</div>}
                      {[...(sd.competences ?? []), ...((sd.competencesGenerales ?? []).flatMap((cg) => cg.competences ?? []))].map((comp) => (
                        <CompRow key={comp.id} comp={comp} editable={editable} note={noteDe(comp.id)?.texte ?? ""}
                          onNote={(t) => setNote(comp.id, t)}
                          onText={(t) => updateComp(comp.id, { texte: t, _modifie: comp._ajoute ? undefined : true })}
                          onNiveau={(n) => updateComp(comp.id, { niveau: n, _modifie: comp._ajoute ? undefined : true })}
                          onDelete={() => deleteComp(comp.id)} />
                      ))}
                      {editable && <button className="btn ghost sm" style={{ marginTop: 4 }} onClick={() => addComp(dom.id, sd.id)}>+ compétence</button>}
                    </div>
                  ))}
                  {editable && <button className="btn ghost sm" onClick={() => addSous(dom.id)}>+ sous-domaine</button>}
                </div>
                );
              })}
          </div>
        </div>
      )}
      {del && <Confirm message={`Supprimer le référentiel « ${del.nom} » ?`} onYes={() => api.referentielDelete(del.id).then(reload)} onClose={() => setDel(null)} />}
    </Page>
  );
}

function CompRow({ comp, editable, note, onNote, onText, onNiveau, onDelete }: {
  comp: RefComp; editable: boolean; note: string;
  onNote: (t: string) => void; onText: (t: string) => void; onNiveau: (n: string) => void; onDelete: () => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [val, setVal] = React.useState(note);
  React.useEffect(() => setVal(note), [note]);
  const fond = comp._ajoute ? "color-mix(in srgb, var(--green) 12%, var(--bg))"
    : comp._modifie ? "color-mix(in srgb, var(--orange) 14%, var(--bg))" : "var(--bg)";
  const bord = comp._ajoute ? "var(--green)" : comp._modifie ? "var(--orange)" : "transparent";

  return (
    <div style={{ padding: "6px 8px", borderRadius: 8, background: fond, borderLeft: `3px solid ${bord}`, marginBottom: 5 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {editable && <Input value={comp.niveau ?? ""} placeholder="niv." style={{ width: 60, padding: "4px 6px" }} onChange={(e) => onNiveau(e.target.value)} />}
        {!editable && comp.niveau && <span className="badge">{comp.niveau}</span>}
        {editable
          ? <Input value={comp.texte} style={{ flex: 1, padding: "4px 8px" }} onChange={(e) => onText(e.target.value)} />
          : <span style={{ flex: 1, fontSize: 13 }}>{comp.texte}</span>}
        {comp._ajoute && <span className="chip" style={{ background: "var(--green)", color: "#fff", fontSize: 10 }}>🆕 Ajouté</span>}
        {comp._modifie && <span className="chip" style={{ background: "var(--orange)", color: "#fff", fontSize: 10 }}>✏️ Modifié</span>}
        <button className="btn ghost sm" onClick={() => setEditing((x) => !x)}>{note ? "📝" : "+ note"}</button>
        {editable && <button className="btn ghost sm" onClick={onDelete} aria-label="Supprimer">🗑</button>}
      </div>
      {editing && (
        <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
          <input className="input" value={val} onChange={(e) => setVal(e.target.value)} placeholder="Note personnelle…" />
          <button className="btn primary sm" onClick={() => { onNote(val); setEditing(false); }}>OK</button>
        </div>
      )}
      {!editing && note && <div style={{ marginTop: 4, fontSize: 12.5, color: "var(--accent)" }}>📝 {note}</div>}
    </div>
  );
}
