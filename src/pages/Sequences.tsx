import React from "react";
import { useNavigate } from "react-router-dom";
import { Page } from "../App";
import {
  api, Sequence, Seance, Projet, Referentiel, Ami, nouvelleSequence, CYCLES,
  couleurHex, couleurPourMatiere, anneeScolaireActuelle, nowIso, newId, telechargerTexte,
} from "../api";
import { Modal, Field, Input, Textarea, Select, Empty, Confirm, useAsync } from "../components/ui";
import { CompetenceTree, CompetenceSelectionnee, labelCourt } from "../components/CompetenceTree";
import { FichierImg } from "../components/Deroulement";
import { openCtx } from "../components/ctxmenu";
import { toast } from "../components/Toaster";

// Date de création lisible (vide si absente/invalide).
const dateFr = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
};

// Duplique une séquence + toutes ses séances.
export async function dupliquerSequence(seq: Sequence) {
  const copie: Sequence = { ...seq, id: crypto.randomUUID(), titre: seq.titre + " (copie)", dateCreation: new Date().toISOString() };
  await api.sequenceSave(copie);
  const seances = await api.seancesList(seq.id);
  for (const s of seances) await api.seanceSave({ ...s, id: crypto.randomUUID(), sequenceId: copie.id });
}

type Tri = "defaut" | "recent" | "ancien";

export default function Sequences() {
  const nav = useNavigate();
  const { data: sequences, reload } = useAsync(() => api.sequencesList(), []);
  const { data: projets } = useAsync(() => api.projetsList(), []);
  const [edit, setEdit] = React.useState<Sequence | null>(null);
  const [del, setDel] = React.useState<Sequence | null>(null);
  const [partager, setPartager] = React.useState<Sequence | null>(null);
  const [exportOuvert, setExportOuvert] = React.useState(false);
  const [q, setQ] = React.useState("");

  // Export d'une séquence en fichier .json (séances + image de couverture).
  const exporterSeq = async (s: Sequence) => {
    try {
      const seances = await api.seancesList(s.id);
      let imageB64: string | null = null;
      if (s.imageNom) { try { imageB64 = await api.fichierRead(s.imageNom); } catch { /* image absente */ } }
      const bundle = { version: 1, type: "sequence", sequence: s, seances, imageB64 };
      const nom = `Sequence_${(s.titre || "sans-titre").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.json`;
      await telechargerTexte(nom, JSON.stringify(bundle, null, 2));
    } catch (e) { toast("Export impossible : " + String(e), { icone: "⚠️" }); }
  };
  const [cycle, setCycle] = React.useState("");
  const [tri, setTri] = React.useState<Tri>("defaut");

  // Action « Nouvelle séquence » déclenchée depuis la palette ⌘K.
  React.useEffect(() => {
    const h = () => setEdit(nouvelleSequence());
    window.addEventListener("maitrize:nouvelle-sequence", h);
    return () => window.removeEventListener("maitrize:nouvelle-sequence", h);
  }, []);

  // Import d'une séquence exportée (JSON) : crée la séquence + ses séances
  // avec de nouveaux identifiants (pas d'écrasement).
  const fileRef = React.useRef<HTMLInputElement>(null);
  const importer = async (file: File) => {
    try {
      const b = JSON.parse(await file.text());
      const sq = b.sequence as Sequence | undefined;
      if (!sq || b.type !== "sequence") { toast("Fichier invalide : séquence attendue.", { icone: "⚠️" }); return; }
      // Restaure l'image de couverture si le fichier la contient, sinon neutralise
      // le nom (pas de vignette cassée).
      let imageNom: string | null = null;
      if (b.imageB64) { try { imageNom = await api.fichierSave(sq.imageNom || "image.png", b.imageB64); } catch { imageNom = null; } }
      const newSeqId = newId();
      await api.sequenceSave({ ...sq, id: newSeqId, imageNom, dateCreation: nowIso() });
      for (const s of (b.seances ?? []) as Seance[]) {
        await api.seanceSave({ ...s, id: newId(), sequenceId: newSeqId });
      }
      reload();
      toast(`Séquence « ${sq.titre} » importée (${(b.seances ?? []).length} séance(s)).`, { icone: "✅" });
    } catch (e) { toast("Import impossible : " + String(e), { icone: "⚠️" }); }
  };

  const filtres = (sequences ?? [])
    .filter((s) =>
      (!q || s.titre.toLowerCase().includes(q.toLowerCase()) || s.matiere.toLowerCase().includes(q.toLowerCase())) &&
      (!cycle || s.cycle === cycle))
    .sort((a, b) => {
      if (tri === "recent") return b.dateCreation.localeCompare(a.dateCreation);
      if (tri === "ancien") return a.dateCreation.localeCompare(b.dateCreation);
      return (b.annee.localeCompare(a.annee)) || (a.periode - b.periode);
    });

  return (
    <Page titre="Séquences" sous={`${sequences?.length ?? 0} séquence(s)`}
      actions={<>
        <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importer(f); e.target.value = ""; }} />
        <button className="btn" onClick={(e) => openCtx(e, [
          { label: "Importer (fichier)", icon: "⬆️", onClick: () => fileRef.current?.click() },
          ...((sequences?.length ?? 0) > 0 ? [{ label: "Exporter (fichier)", icon: "⬇️", onClick: () => setExportOuvert(true) }] : []),
        ])}>📄 Fichier ▾</button>
        <button className="btn primary" onClick={() => setEdit(nouvelleSequence())}>+ Nouvelle séquence</button>
      </>}>
      <div className="toolbar">
        <Input className="input search" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={cycle} onChange={(e) => setCycle(e.target.value)} style={{ maxWidth: 150 }}>
          <option value="">Tous les cycles</option>
          {CYCLES.map((c) => <option key={c}>{c}</option>)}
        </Select>
        <Select value={tri} onChange={(e) => setTri(e.target.value as Tri)} style={{ maxWidth: 170 }}>
          <option value="defaut">Année / période</option>
          <option value="recent">Plus récentes</option>
          <option value="ancien">Plus anciennes</option>
        </Select>
      </div>

      {filtres.length === 0 ? (
        <Empty icone="📚" titre="Aucune séquence" sous="Créez votre première séquence pédagogique." />
      ) : (
        <div className="grid cols">
          {filtres.map((s) => {
            const projet = projets?.find((p) => p.id === s.projetId);
            let comp: CompetenceSelectionnee | null = null;
            try { comp = s.competenceVisee ? JSON.parse(s.competenceVisee) : null; } catch { /* ignore */ }
            return (
              <div key={s.id} className="card" style={{ cursor: "pointer", borderTop: `3px solid ${couleurHex[s.couleur]}` }}
                onClick={() => nav(`/sequences/${s.id}`)}
                onContextMenu={(e) => openCtx(e, [
                  { label: "Ouvrir", icon: "📂", onClick: () => nav(`/sequences/${s.id}`) },
                  { label: "Modifier", icon: "✏️", onClick: () => setEdit(s) },
                  { label: "Dupliquer", icon: "📑", onClick: () => dupliquerSequence(s).then(reload) },
                  { label: "Partager à un ami", icon: "🤝", onClick: () => setPartager(s) },
                  { label: "Exporter (fichier)", icon: "⬇️", onClick: () => exporterSeq(s) },
                  { label: "Supprimer", icon: "🗑", danger: true, sep: true, onClick: () => setDel(s) },
                ])}>
                {s.imageNom && <FichierImg nom={s.imageNom} style={{ width: "100%", height: 110, objectFit: "cover", marginBottom: 8 }} />}
                <div style={{ display: "flex", alignItems: "start", gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>{s.titre || "Sans titre"}</div>
                  <button className="btn ghost sm" title="Partager à un ami" onClick={(e) => { e.stopPropagation(); setPartager(s); }} aria-label="Partager Ã  un ami">🤝</button>
                  <button className="btn ghost sm" onClick={(e) => { e.stopPropagation(); setEdit(s); }} aria-label="Modifier">✏️</button>
                  <button className="btn ghost sm" onClick={(e) => { e.stopPropagation(); setDel(s); }} aria-label="Supprimer">🗑</button>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  {s.matiere && <span className="chip">{s.matiere}</span>}
                  {s.cycle && <span className="chip">{s.cycle}</span>}
                  <span className="chip">P{s.periode}</span>
                  <span className="chip">{s.annee}</span>
                  {projet && <span className="chip"><span className="dot" style={{ background: couleurHex[projet.couleur] }} />{projet.titre}</span>}
                </div>
                {comp && <div style={{ color: "var(--accent)", fontSize: 12.5, marginTop: 8 }}>🎯 {labelCourt(comp)}</div>}
                {s.objectifs && <div style={{ color: "var(--text-2)", fontSize: 13, marginTop: 6 }}>{s.objectifs.slice(0, 110)}</div>}
                {dateFr(s.dateCreation) && <div className="meta" style={{ marginTop: 8, fontSize: 11.5 }}>🕓 Créée le {dateFr(s.dateCreation)}</div>}
              </div>
            );
          })}
        </div>
      )}

      {edit && (
        <SequenceForm sequence={edit} projets={projets ?? []}
          onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />
      )}
      {del && (
        <Confirm message={`Supprimer « ${del.titre} » et ses séances ?`}
          onYes={() => api.sequenceDelete(del.id).then(reload)} onClose={() => setDel(null)} />
      )}
      {partager && (
        <EnvoyerSequenceModal sequence={partager} onClose={() => setPartager(null)} />
      )}
      {exportOuvert && (
        <ExporterSequenceModal sequences={sequences ?? []}
          onExport={async (s) => { await exporterSeq(s); setExportOuvert(false); }}
          onClose={() => setExportOuvert(false)} />
      )}
    </Page>
  );
}

// Choix d'une séquence à exporter en fichier .json.
function ExporterSequenceModal({ sequences, onExport, onClose }: {
  sequences: Sequence[]; onExport: (s: Sequence) => void; onClose: () => void;
}) {
  const [seqId, setSeqId] = React.useState("");
  return (
    <Modal titre="Exporter une séquence" onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={!seqId}
          onClick={() => { const s = sequences.find((x) => x.id === seqId); if (s) onExport(s); }}>⬇️ Télécharger</button></>}>
      <Field label="Séquence à exporter">
        <Select value={seqId} onChange={(e) => setSeqId(e.target.value)}>
          <option value="">— choisir —</option>
          {sequences.map((s) => <option key={s.id} value={s.id}>{s.titre || "Sans titre"}</option>)}
        </Select>
      </Field>
      <p className="meta">Le fichier contient la séquence, ses séances et son image de couverture.</p>
    </Modal>
  );
}

// Envoi chiffré d'une séquence à un ami. La réception est centralisée dans
// l'onglet Amis (« Boîte aux lettres ») + notifications.
function EnvoyerSequenceModal({ sequence, onClose }: { sequence: Sequence; onClose: () => void }) {
  const { data: amis } = useAsync(() => api.amisList(), []);
  const [msg, setMsg] = React.useState("");
  const [enCours, setEnCours] = React.useState("");
  const [envoyes, setEnvoyes] = React.useState<Record<string, boolean>>({});
  const envoyer = async (a: Ami) => {
    setEnCours(a.id); setMsg("");
    try { await api.sequencePartager(a.id, sequence.id); setEnvoyes((s) => ({ ...s, [a.id]: true })); setMsg(`Envoyée à ${a.nom || "cet ami"} ✅`); }
    catch (e) { setMsg(String(e)); }
    finally { setEnCours(""); }
  };
  return (
    <Modal titre={`Partager « ${sequence.titre || "Sans titre"} »`} onClose={onClose}
      footer={<button className="btn" onClick={onClose}>Fermer</button>}>
      {(amis?.length ?? 0) === 0
        ? <Empty icone="🤝" titre="Aucun ami" sous="Ajoutez un collègue dans l'onglet Amis pour pouvoir partager." />
        : <>
            <p className="meta" style={{ marginTop: 0 }}>Chiffrée de bout en bout : seul le destinataire peut la lire. Elle arrivera dans sa boîte aux lettres.</p>
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

export function SequenceForm({ sequence, projets, onClose, onSaved }: {
  sequence: Sequence; projets: Projet[]; onClose: () => void; onSaved: () => void;
}) {
  const [s, setS] = React.useState<Sequence>(sequence);
  const up = (p: Partial<Sequence>) => setS((cur) => ({ ...cur, ...p }));
  const save = async () => { await api.sequenceSave({ ...s, annee: s.annee || anneeScolaireActuelle() }); onSaved(); };

  let comp: CompetenceSelectionnee | null = null;
  try { comp = s.competenceVisee ? JSON.parse(s.competenceVisee) : null; } catch { /* ignore */ }

  const choisir = (c: CompetenceSelectionnee, ref: Referentiel) => {
    up({
      competenceVisee: JSON.stringify(c),
      matiere: c.domaineTitre,
      cycle: ref.cycle || s.cycle,
      couleur: couleurPourMatiere(c.domaineTitre),
    });
  };
  const effacer = () => up({ competenceVisee: "", matiere: "", cycle: "", couleur: "blue" });

  return (
    <Modal large titre={sequence.titre ? "Modifier la séquence" : "Nouvelle séquence"} onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" onClick={save} disabled={!s.titre.trim()}>Enregistrer</button>
      </>}>
      <Field label="Titre"><Input value={s.titre} autoFocus onChange={(e) => up({ titre: e.target.value })} /></Field>
      <div className="row">
        <Field label="Période">
          <div className="seg">
            {[1, 2, 3, 4, 5].map((p) => (
              <button key={p} className={s.periode === p ? "active" : ""} onClick={() => up({ periode: p })}>P{p}</button>
            ))}
          </div>
        </Field>
        <Field label="Année"><Input value={s.annee} placeholder="2025-2026" onChange={(e) => up({ annee: e.target.value })} /></Field>
        <Field label="Projet">
          <Select value={s.projetId ?? ""} onChange={(e) => up({ projetId: e.target.value || null })}>
            <option value="">Aucun</option>{projets.map((p) => <option key={p.id} value={p.id}>{p.titre}</option>)}
          </Select>
        </Field>
      </div>

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
        <CompetenceTree mode="single" selection={comp ? [comp] : []} onPick={choisir} />
        {(s.matiere || s.cycle) && (
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {s.matiere && <span className="chip"><span className="dot" style={{ background: couleurHex[s.couleur] }} />{s.matiere}</span>}
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
          <ImageUpload onUploaded={(nom) => up({ imageNom: nom })} />
          {s.imageNom && <button className="btn ghost sm" onClick={() => up({ imageNom: null })}>Retirer</button>}
        </div>
      </div>

      <div className="field">
        <label>Vidéo explicative (lien ou fichier)</label>
        <div style={{ display: "flex", gap: 8 }}>
          <Input placeholder="https://… (YouTube, lien)" value={s.video.startsWith("http") ? s.video : ""}
            onChange={(e) => up({ video: e.target.value })} />
          <VideoUpload onUploaded={(nom) => up({ video: nom })} />
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

function ImageUpload({ onUploaded }: { onUploaded: (nom: string) => void }) {
  const ref = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const up = async (file: File) => {
    setBusy(true);
    try {
      const b64 = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1] ?? ""); r.onerror = rej; r.readAsDataURL(file); });
      const nom = await api.fichierSave(file.name, b64);
      onUploaded(nom);
    } finally { setBusy(false); }
  };
  return (
    <>
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) up(f); e.target.value = ""; }} />
      <button className="btn" style={{ flex: "none" }} disabled={busy} onClick={() => ref.current?.click()}>{busy ? "…" : "📷 Choisir une image"}</button>
    </>
  );
}

function VideoUpload({ onUploaded }: { onUploaded: (nom: string) => void }) {
  const ref = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const up = async (file: File) => {
    setBusy(true);
    try {
      const b64 = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1] ?? ""); r.onerror = rej; r.readAsDataURL(file); });
      const nom = await api.fichierSave(file.name, b64);
      onUploaded(nom);
    } finally { setBusy(false); }
  };
  return (
    <>
      <input ref={ref} type="file" accept="video/*" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) up(f); e.target.value = ""; }} />
      <button className="btn" style={{ flex: "none" }} disabled={busy} onClick={() => ref.current?.click()}>{busy ? "…" : "🎬 Importer"}</button>
    </>
  );
}
