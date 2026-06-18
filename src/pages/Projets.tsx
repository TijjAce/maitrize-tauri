import React from "react";
import { useNavigate } from "react-router-dom";
import { Page } from "../App";
import { api, Projet, Sequence, Ami, nouveauProjet, couleurHex } from "../api";
import { Modal, Field, Input, Textarea, Empty, ColorPicker, Confirm, useAsync } from "../components/ui";
import { openCtx } from "../components/ctxmenu";
import { FichierImg } from "../components/Deroulement";
import { fileToBase64 } from "../components/SeanceParts";

export default function Projets() {
  const { data: projets, reload } = useAsync(() => api.projetsList(), []);
  const { data: sequences } = useAsync(() => api.sequencesList(), []);
  const [edit, setEdit] = React.useState<Projet | null>(null);
  const [detail, setDetail] = React.useState<Projet | null>(null);
  const [del, setDel] = React.useState<Projet | null>(null);
  const [partager, setPartager] = React.useState<Projet | null>(null);

  const compteur = (id: string) => (sequences ?? []).filter((s: Sequence) => s.projetId === id).length;

  return (
    <Page titre="Projets" sous="Regroupez vos séquences autour d'un thème"
      actions={<>
        <button className="btn primary" onClick={() => setEdit(nouveauProjet())}>+ Nouveau projet</button>
      </>}>
      {(projets?.length ?? 0) === 0 ? (
        <Empty icone="📁" titre="Aucun projet" sous="Un projet rassemble plusieurs séquences (Carnaval, Trimestre 2…)." />
      ) : (
        <div className="grid cols">
          {projets!.map((p) => (
            <div key={p.id} className="card" style={{ borderLeft: `4px solid ${couleurHex[p.couleur]}`, cursor: "pointer" }}
              onClick={() => setDetail(p)}
              onContextMenu={(e) => openCtx(e, [
                { label: "Ouvrir", icon: "📂", onClick: () => setDetail(p) },
                { label: "Modifier", icon: "✏️", onClick: () => setEdit(p) },
                { label: "Partager à un ami", icon: "🤝", onClick: () => setPartager(p) },
                { label: "Supprimer", icon: "🗑", danger: true, sep: true, onClick: () => setDel(p) },
              ])}>
              {p.imageNom && <FichierImg nom={p.imageNom} style={{ width: "100%", height: 110, objectFit: "cover", marginBottom: 8 }} />}
              <div style={{ display: "flex", alignItems: "start" }}>
                <div style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>{p.titre}</div>
                <button className="btn ghost sm" title="Partager à un ami" onClick={(e) => { e.stopPropagation(); setPartager(p); }} aria-label="Partager Ã  un ami">🤝</button>
                <button className="btn ghost sm" onClick={(e) => { e.stopPropagation(); setEdit(p); }} aria-label="Modifier">✏️</button>
                <button className="btn ghost sm" onClick={(e) => { e.stopPropagation(); setDel(p); }} aria-label="Supprimer">🗑</button>
              </div>
              {p.descriptif && <div style={{ color: "var(--text-2)", fontSize: 13, marginTop: 6 }}>{p.descriptif}</div>}
              <div style={{ marginTop: 10 }}><span className="chip">{compteur(p.id)} séquence(s)</span> <span className="chip">{p.annee}</span></div>
            </div>
          ))}
        </div>
      )}
      {detail && <ProjetDetail projet={detail} sequences={(sequences ?? []).filter((s) => s.projetId === detail.id)}
        onClose={() => setDetail(null)} onEdit={() => { setEdit(detail); setDetail(null); }} />}
      {edit && <ProjetForm projet={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
      {del && <Confirm message={`Supprimer le projet « ${del.titre} » ? (les séquences sont conservées)`}
        onYes={() => api.projetDelete(del.id).then(reload)} onClose={() => setDel(null)} />}
      {partager && (
        <EnvoyerProjetModal projet={partager} onClose={() => setPartager(null)} />
      )}
    </Page>
  );
}

// Envoi chiffré d'un projet (avec ses séquences). La réception est centralisée
// dans l'onglet Amis (« Boîte aux lettres ») + notifications.
function EnvoyerProjetModal({ projet, onClose }: { projet: Projet; onClose: () => void }) {
  const { data: amis } = useAsync(() => api.amisList(), []);
  const [msg, setMsg] = React.useState("");
  const [enCours, setEnCours] = React.useState("");
  const [envoyes, setEnvoyes] = React.useState<Record<string, boolean>>({});
  const envoyer = async (a: Ami) => {
    setEnCours(a.id); setMsg("");
    try { await api.projetPartager(a.id, projet.id); setEnvoyes((s) => ({ ...s, [a.id]: true })); setMsg(`Envoyé à ${a.nom || "cet ami"} ✅`); }
    catch (e) { setMsg(String(e)); }
    finally { setEnCours(""); }
  };
  return (
    <Modal titre={`Partager « ${projet.titre || "Projet"} »`} onClose={onClose}
      footer={<button className="btn" onClick={onClose}>Fermer</button>}>
      {(amis?.length ?? 0) === 0
        ? <Empty icone="🤝" titre="Aucun ami" sous="Ajoutez un collègue dans l'onglet Amis pour pouvoir partager." />
        : <>
            <p className="meta" style={{ marginTop: 0 }}>Chiffré de bout en bout : projet, séquences, séances et images. Il arrivera dans la boîte aux lettres du destinataire.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {amis!.map((a) => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: "var(--bg)" }}>
                  <span style={{ fontSize: 18 }} aria-hidden="true">{a.verifie ? "✅" : "👤"}</span>
                  <span style={{ flex: 1, fontWeight: 600 }}>{a.nom || "Sans nom"}</span>
                  <button className="btn primary sm" disabled={enCours === a.id} onClick={() => envoyer(a)}>
                    {enCours === a.id ? "…" : envoyes[a.id] ? "✓ Renvoyer" : "📤 Envoyer"}</button>
                </div>
              ))}
            </div>
          </>}
      {msg && <div style={{ marginTop: 10, fontSize: 13 }} role="status">{msg}</div>}
    </Modal>
  );
}

function ProjetDetail({ projet, sequences, onClose, onEdit }: {
  projet: Projet; sequences: Sequence[]; onClose: () => void; onEdit: () => void;
}) {
  const nav = useNavigate();
  return (
    <Modal titre={projet.titre} onClose={onClose}
      footer={<><button className="btn" onClick={onEdit}>✏️ Modifier le projet</button><div className="spacer" /><button className="btn primary" onClick={onClose}>Fermer</button></>}>
      {projet.descriptif && <p style={{ marginTop: 0, color: "var(--text-2)" }}>{projet.descriptif}</p>}
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px", color: "var(--text-2)", margin: "8px 0 6px" }}>Séquences ({sequences.length})</div>
      {sequences.length === 0 ? <Empty icone="📚" titre="Aucune séquence" sous="Affectez des séquences à ce projet depuis leur fiche." /> :
        sequences.map((s) => (
          <div key={s.id} className="list-row" style={{ cursor: "pointer" }} onClick={() => { onClose(); nav(`/sequences/${s.id}`); }}>
            <span className="dot" style={{ width: 10, height: 10, borderRadius: 3, background: couleurHex[s.couleur] }} />
            <div style={{ flex: 1 }}>
              <div className="title">{s.titre}</div>
              <div className="meta">{[s.matiere, s.cycle, `P${s.periode}`].filter(Boolean).join(" · ")}</div>
            </div>
            <span className="btn ghost sm">Ouvrir →</span>
          </div>
        ))}
    </Modal>
  );
}

function ProjetForm({ projet, onClose, onSaved }: { projet: Projet; onClose: () => void; onSaved: () => void }) {
  const [p, setP] = React.useState<Projet>(projet);
  const up = (x: Partial<Projet>) => setP({ ...p, ...x });
  return (
    <Modal titre={projet.titre ? "Modifier le projet" : "Nouveau projet"} onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={!p.titre.trim()} onClick={() => api.projetSave(p).then(onSaved)}>Enregistrer</button>
      </>}>
      <Field label="Titre"><Input autoFocus value={p.titre} onChange={(e) => up({ titre: e.target.value })} /></Field>
      <Field label="Description"><Textarea value={p.descriptif} onChange={(e) => up({ descriptif: e.target.value })} /></Field>
      <div className="field">
        <label>Vignette (image de couverture)</label>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {p.imageNom
            ? <FichierImg nom={p.imageNom} style={{ width: 96, height: 72, objectFit: "cover", border: "1px solid var(--border)" }} />
            : <div style={{ width: 96, height: 72, borderRadius: 8, background: "var(--panel-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🖼</div>}
          <ProjetVignetteUpload onUploaded={(nom) => up({ imageNom: nom })} />
          {p.imageNom && <button className="btn ghost sm" onClick={() => up({ imageNom: null })}>Retirer</button>}
        </div>
      </div>
      <Field label="Couleur"><ColorPicker value={p.couleur} onChange={(c) => up({ couleur: c })} /></Field>
    </Modal>
  );
}

function ProjetVignetteUpload({ onUploaded }: { onUploaded: (nom: string) => void }) {
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
