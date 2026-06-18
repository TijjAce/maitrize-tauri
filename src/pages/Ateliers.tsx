import React from "react";
import { Page } from "../App";
import {
  api, Atelier, Espace, Eleve, ProgressionEleve, nouvelAtelier, nouvelEspace,
  MATIERES, couleurHex, couleurPourMatiere, newId,
} from "../api";
import { Modal, Field, Input, Textarea, Select, Empty, ColorPicker, Confirm, useAsync, useSegmentNav } from "../components/ui";
import { openCtx } from "../components/ctxmenu";
import { FichierImg } from "../components/Deroulement";
import { fileToBase64 } from "../components/SeanceParts";

const ATELIERS_TABS = ["ateliers", "espaces"] as const;
export default function Ateliers() {
  const [onglet, setOnglet] = React.useState<typeof ATELIERS_TABS[number]>("ateliers");
  useSegmentNav(ATELIERS_TABS, onglet, setOnglet);
  const { data: ateliers, reload: rA } = useAsync(() => api.ateliersList(), []);
  const { data: espaces, reload: rE } = useAsync(() => api.espacesList(), []);
  const { data: liens, reload: rL } = useAsync(() => api.atelierEspaceList(), []);
  const [editA, setEditA] = React.useState<Atelier | null>(null);
  const [editE, setEditE] = React.useState<Espace | null>(null);
  const [delA, setDelA] = React.useState<Atelier | null>(null);
  const [delE, setDelE] = React.useState<Espace | null>(null);
  const [suivi, setSuivi] = React.useState<Espace | null>(null);
  const [dossier, setDossier] = React.useState("");

  const dossiers = (liste: { dossier: string }[]) => Array.from(new Set(liste.map((x) => x.dossier).filter(Boolean)));
  const courant = onglet === "ateliers" ? (ateliers ?? []) : (espaces ?? []);
  const dossiersDispo = dossiers(courant);
  const filtrer = <T extends { dossier: string }>(l: T[]) => dossier ? l.filter((x) => x.dossier === dossier) : l;

  return (
    <Page titre="Ateliers & Espaces" sous="Activités en autonomie et stations de classe"
      actions={onglet === "ateliers"
        ? <button className="btn primary" onClick={() => setEditA(nouvelAtelier())}>+ Atelier</button>
        : <button className="btn primary" onClick={() => setEditE(nouvelEspace())}>+ Espace</button>}>
      <div className="toolbar">
        <div className="seg">
          <button className={onglet === "ateliers" ? "active" : ""} onClick={() => { setOnglet("ateliers"); setDossier(""); }}>Ateliers ({ateliers?.length ?? 0})</button>
          <button className={onglet === "espaces" ? "active" : ""} onClick={() => { setOnglet("espaces"); setDossier(""); }}>Espaces ({espaces?.length ?? 0})</button>
        </div>
        <div className="spacer" />
        {dossiersDispo.length > 0 && (
          <Select value={dossier} onChange={(e) => setDossier(e.target.value)} style={{ maxWidth: 180 }}>
            <option value="">Tous les dossiers</option>
            {dossiersDispo.map((d) => <option key={d}>{d}</option>)}
          </Select>
        )}
      </div>

      {onglet === "ateliers" ? (
        (ateliers?.length ?? 0) === 0 ? <Empty icone="🧩" titre="Aucun atelier" /> :
        <div className="grid cols">
          {filtrer(ateliers!).map((a) => (
            <div key={a.id} className="card" style={{ borderTop: `3px solid ${couleurHex[a.couleur]}`, cursor: "pointer" }}
              onClick={() => setEditA(a)}
              onContextMenu={(e) => openCtx(e, [
                { label: "Ouvrir", icon: "📂", onClick: () => setEditA(a) },
                { label: "Dupliquer", icon: "📑", onClick: () => api.atelierSave({ ...a, id: crypto.randomUUID(), titre: a.titre + " (copie)" }).then(rA) },
                { label: "Supprimer", icon: "🗑", danger: true, sep: true, onClick: () => setDelA(a) },
              ])}>
              {a.imageNom && <FichierImg nom={a.imageNom} style={{ width: "100%", height: 110, objectFit: "cover", marginBottom: 8 }} />}
              <div style={{ display: "flex", alignItems: "start" }}>
                <div style={{ fontWeight: 700, flex: 1 }}>{a.titre}</div>
                <button className="btn ghost sm" onClick={(e) => { e.stopPropagation(); setEditA(a); }} aria-label="Modifier">✏️</button>
                <button className="btn ghost sm" onClick={(e) => { e.stopPropagation(); setDelA(a); }} aria-label="Supprimer">🗑</button>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                <span className="chip">{a.matiere}</span>
                <span className="chip">👥 {a.nbElevesMax}</span>
                <span className="chip">⏱ {a.duree} min</span>
                {a.dossier && <span className="chip">📁 {a.dossier}</span>}
              </div>
              {a.objectifs && <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 8 }}>{a.objectifs.slice(0, 100)}</div>}
            </div>
          ))}
        </div>
      ) : (
        (espaces?.length ?? 0) === 0 ? <Empty icone="🪑" titre="Aucun espace" /> :
        <div className="grid cols">
          {filtrer(espaces!).map((e) => {
            const nbAteliers = (liens ?? []).filter((l) => l[1] === e.id).length;
            return (
              <div key={e.id} className="card" style={{ borderTop: `3px solid ${couleurHex[e.couleur]}`, cursor: "pointer" }}
                onClick={() => setEditE(e)}
                onContextMenu={(ev) => openCtx(ev, [
                  { label: "Ouvrir", icon: "📂", onClick: () => setEditE(e) },
                  { label: "Suivi des élèves", icon: "📋", onClick: () => setSuivi(e) },
                  { label: "Supprimer", icon: "🗑", danger: true, sep: true, onClick: () => setDelE(e) },
                ])}>
                <div style={{ display: "flex", alignItems: "start" }}>
                  <div style={{ fontWeight: 700, flex: 1 }}>{e.titre}</div>
                  <button className="btn ghost sm" onClick={(ev) => { ev.stopPropagation(); setEditE(e); }} aria-label="Modifier">✏️</button>
                  <button className="btn ghost sm" onClick={(ev) => { ev.stopPropagation(); setDelE(e); }} aria-label="Supprimer">🗑</button>
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                  <span className="chip">👥 {e.nbElevesMax}</span>
                  {nbAteliers > 0 && <span className="chip">🧩 {nbAteliers} atelier(s)</span>}
                  {e.dossier && <span className="chip">📁 {e.dossier}</span>}
                </div>
                {e.descriptionEspace && <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 8 }}>{e.descriptionEspace.slice(0, 90)}</div>}
                <button className="btn sm" style={{ marginTop: 10 }} onClick={(ev) => { ev.stopPropagation(); setSuivi(e); }}>📋 Suivi des élèves</button>
              </div>
            );
          })}
        </div>
      )}

      {editA && <AtelierForm a={editA} onClose={() => setEditA(null)} onSaved={() => { setEditA(null); rA(); }} />}
      {editE && <EspaceForm e={editE} ateliers={ateliers ?? []} liens={liens ?? []}
        onClose={() => setEditE(null)} onSaved={() => { setEditE(null); rE(); rL(); }} />}
      {suivi && <SuiviEspace espace={suivi} onClose={() => setSuivi(null)} />}
      {delA && <Confirm message={`Supprimer l'atelier « ${delA.titre} » ?`} onYes={() => api.atelierDelete(delA.id).then(rA)} onClose={() => setDelA(null)} />}
      {delE && <Confirm message={`Supprimer l'espace « ${delE.titre} » ?`} onYes={() => api.espaceDelete(delE.id).then(rE)} onClose={() => setDelE(null)} />}
    </Page>
  );
}

function AtelierForm({ a, onClose, onSaved }: { a: Atelier; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = React.useState<Atelier>(a);
  const up = (p: Partial<Atelier>) => setV({ ...v, ...p });
  return (
    <Modal titre={a.titre ? "Modifier l'atelier" : "Nouvel atelier"} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={!v.titre.trim()} onClick={() => api.atelierSave(v).then(onSaved)}>Enregistrer</button></>}>
      <Field label="Titre"><Input autoFocus value={v.titre} onChange={(e) => up({ titre: e.target.value })} /></Field>
      <div className="row">
        <Field label="Matière"><Select value={v.matiere} onChange={(e) => up({ matiere: e.target.value, couleur: couleurPourMatiere(e.target.value) })}>{MATIERES.map((m) => <option key={m}>{m}</option>)}</Select></Field>
        <Field label="Élèves max"><Input type="number" value={v.nbElevesMax} onChange={(e) => up({ nbElevesMax: +e.target.value })} /></Field>
        <Field label="Durée (min)"><Input type="number" value={v.duree} onChange={(e) => up({ duree: +e.target.value })} /></Field>
      </div>
      <Field label="Objectifs"><Textarea value={v.objectifs} onChange={(e) => up({ objectifs: e.target.value })} /></Field>
      <Field label="Matériel"><Textarea value={v.materiel} onChange={(e) => up({ materiel: e.target.value })} /></Field>
      <div className="field">
        <label>Vignette (image de couverture)</label>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {v.imageNom
            ? <FichierImg nom={v.imageNom} style={{ width: 96, height: 72, objectFit: "cover", border: "1px solid var(--border)" }} />
            : <div style={{ width: 96, height: 72, borderRadius: 8, background: "var(--panel-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🖼</div>}
          <VignetteUpload onUploaded={(nom) => up({ imageNom: nom })} />
          {v.imageNom && <button className="btn ghost sm" onClick={() => up({ imageNom: null })}>Retirer</button>}
        </div>
      </div>
      <div className="row">
        <Field label="Dossier (optionnel)"><Input value={v.dossier} placeholder="ex. Mathématiques" onChange={(e) => up({ dossier: e.target.value })} /></Field>
        <Field label="Couleur"><ColorPicker value={v.couleur} onChange={(c) => up({ couleur: c })} /></Field>
      </div>
    </Modal>
  );
}

function EspaceForm({ e, ateliers, liens, onClose, onSaved }: {
  e: Espace; ateliers: Atelier[]; liens: [string, string][]; onClose: () => void; onSaved: () => void;
}) {
  const [v, setV] = React.useState<Espace>(e);
  const up = (p: Partial<Espace>) => setV({ ...v, ...p });
  const [sel, setSel] = React.useState<string[]>(() => liens.filter((l) => l[1] === e.id).map((l) => l[0]));
  const toggle = (id: string) => setSel((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const save = async () => {
    await api.espaceSave(v);
    await api.atelierEspaceSet(v.id, sel);
    onSaved();
  };

  return (
    <Modal titre={e.titre ? "Modifier l'espace" : "Nouvel espace"} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={!v.titre.trim()} onClick={save}>Enregistrer</button></>}>
      <Field label="Titre"><Input autoFocus value={v.titre} onChange={(ev) => up({ titre: ev.target.value })} /></Field>
      <div className="row">
        <Field label="Élèves max"><Input type="number" value={v.nbElevesMax} onChange={(ev) => up({ nbElevesMax: +ev.target.value })} /></Field>
        <Field label="Dossier (optionnel)"><Input value={v.dossier} onChange={(ev) => up({ dossier: ev.target.value })} /></Field>
      </div>
      <Field label="Description"><Textarea value={v.descriptionEspace} onChange={(ev) => up({ descriptionEspace: ev.target.value })} /></Field>
      <div className="field">
        <label>Ateliers proposés dans cet espace</label>
        {ateliers.length === 0 ? <div style={{ fontSize: 13, color: "var(--text-2)" }}>Aucun atelier créé.</div> :
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 180, overflowY: "auto" }}>
            {ateliers.map((a) => (
              <label key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", borderRadius: 7, background: "var(--bg)", fontSize: 13 }}>
                <input type="checkbox" checked={sel.includes(a.id)} onChange={() => toggle(a.id)} />
                <span className="dot" style={{ background: couleurHex[a.couleur] }} />{a.titre}
              </label>
            ))}
          </div>}
      </div>
      <Field label="Couleur"><ColorPicker value={v.couleur} onChange={(c) => up({ couleur: c })} /></Field>
    </Modal>
  );
}

function SuiviEspace({ espace, onClose }: { espace: Espace; onClose: () => void }) {
  const { data: eleves } = useAsync(() => api.elevesList(), []);
  const { data: progs, reload } = useAsync(() => api.progressionsEleveList(espace.id), [espace.id]);

  const progDe = (eleveId: string) => progs?.find((p) => p.eleveId === eleveId);
  const toggle = async (e: Eleve) => {
    const exist = progDe(e.id);
    const p: ProgressionEleve = exist ? { ...exist, fait: !exist.fait }
      : { id: newId(), nomEleve: e.nom, eleveId: e.id, fait: true, espaceId: espace.id };
    await api.progressionEleveSave(p); reload();
  };
  const faits = (eleves ?? []).filter((e) => progDe(e.id)?.fait).length;

  return (
    <Modal titre={`Suivi — ${espace.titre}`} onClose={onClose}
      footer={<><span className="chip">{faits} / {eleves?.length ?? 0} ont fait l'atelier</span><div className="spacer" /><button className="btn primary" onClick={onClose}>Terminé</button></>}>
      {(eleves?.length ?? 0) === 0 ? <Empty icone="👧" titre="Aucun élève" /> :
        eleves!.map((e) => {
          const fait = progDe(e.id)?.fait ?? false;
          return (
            <label key={e.id} className="list-row" style={{ cursor: "pointer" }}>
              <input type="checkbox" checked={fait} onChange={() => toggle(e)} />
              <div className="title" style={{ flex: 1 }}>{e.nom}</div>
              {fait && <span className="chip" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>✓ fait</span>}
            </label>
          );
        })}
    </Modal>
  );
}

function VignetteUpload({ onUploaded }: { onUploaded: (nom: string) => void }) {
  const ref = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const up = async (file: File) => {
    setBusy(true);
    try { onUploaded(await api.fichierSave(file.name, await fileToBase64(file))); }
    finally { setBusy(false); }
  };
  return (
    <>
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) up(f); e.target.value = ""; }} />
      <button className="btn" style={{ flex: "none" }} disabled={busy} onClick={() => ref.current?.click()}>{busy ? "…" : "📷 Choisir une image"}</button>
    </>
  );
}
