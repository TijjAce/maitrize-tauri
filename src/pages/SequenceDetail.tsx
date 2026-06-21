import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Page } from "../App";
import { api, Sequence, Seance, MaterielItem, nouvelleSeance, couleurHex, nowIso, newId, DUREES, formatDuree, telechargerTexte } from "../api";
import { Modal, Field, Input, Textarea, Select, Stars, Empty, Confirm, useAsync } from "../components/ui";
import { CompetenceTree, CompetenceSelectionnee, labelCourt } from "../components/CompetenceTree";
import { TableauEditor, MaterielSeance, imageDuPresse, fileToBase64 } from "../components/SeanceParts";
import { IllustrationsEditor, DeroulementRead, CelluleContenu, FichierImg, CitationButton } from "../components/Deroulement";
import { fichierToBlobUrl } from "../components/PdfViewer";
import { printHTML, escapeHtml } from "../print";
import { openCtx } from "../components/ctxmenu";
import { PhotoTelephone } from "../components/PhotoTelephone";

export default function SequenceDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data: sequences, reload: reloadSeq } = useAsync(() => api.sequencesList(), []);
  const { data: seances, reload } = useAsync(() => api.seancesList(id), [id]);
  const { data: mats, reload: reloadMat } = useAsync(() => api.materielList().then((all) => all.filter((m) => m.sequenceId === id)), [id]);
  const [edit, setEdit] = React.useState<Seance | null>(null);
  const [voir, setVoir] = React.useState<Seance | null>(null);
  const [del, setDel] = React.useState<Seance | null>(null);

  const seq = sequences?.find((s) => s.id === id);
  if (!seq) return <Page titre="Séquence"><Empty icone="🔍" titre="Séquence introuvable" /></Page>;

  let comp: CompetenceSelectionnee | null = null;
  try { comp = seq.competenceVisee ? JSON.parse(seq.competenceVisee) : null; } catch { /* ignore */ }

  const setRating = async (champ: keyof Sequence, v: number) => {
    await api.sequenceSave({ ...seq, [champ]: v, ratingDateMaj: nowIso() } as Sequence);
    reloadSeq();
  };
  const next = (seances?.length ?? 0) + 1;

  const liste = seances ?? [];
  const deplacer = async (s: Seance, sens: -1 | 1) => {
    const ordonne = [...liste].sort((a, b) => a.numero - b.numero);
    const i = ordonne.findIndex((x) => x.id === s.id);
    const j = i + sens;
    if (j < 0 || j >= ordonne.length) return;
    const a = ordonne[i], b = ordonne[j];
    await api.seanceSave({ ...a, numero: b.numero });
    await api.seanceSave({ ...b, numero: a.numero });
    reload();
  };
  const dupliquerSeance = async (s: Seance) => {
    await api.seanceSave({ ...s, id: crypto.randomUUID(), numero: next, titre: s.titre + " (copie)" });
    reload();
  };

  // ── Matériel de la séquence (drag-drop) ──────────────────────────
  const matsSeq = (mats ?? []).filter((m) => !m.seanceId);
  const matsDeSeance = (sid: string) => (mats ?? []).filter((m) => m.seanceId === sid);

  // Déplace un matériel vers une séance (ou le renvoie à la séquence si seanceId=null).
  const assignerMat = async (mid: string, seanceId: string | null) => {
    const m = (mats ?? []).find((x) => x.id === mid);
    if (m) { await api.materielSave({ ...m, seanceId }); reloadMat(); }
  };

  // Dépôt de fichiers (PDF/images) sur la séquence → crée le matériel.
  const deposerFichiers = async (files: FileList) => {
    for (const file of Array.from(files)) {
      const b64 = await fileToBase64(file);
      const nom = await api.fichierSave(file.name, b64);
      const pdf = /\.pdf$/i.test(file.name) || file.type === "application/pdf";
      await api.materielSave({
        id: newId(), titre: file.name.replace(/\.[^.]+$/, ""), descriptionMateriel: "",
        competenceId: comp?.competenceRefId ?? "", competenceTitre: comp?.competenceTitre ?? "",
        domaineTitre: comp?.domaineTitre ?? seq.matiere ?? "", sousDomaineTitre: comp?.sousDomaineTitre ?? "",
        cycle: seq.cycle, imagesJson: pdf ? "[]" : JSON.stringify([nom]), pdfsJson: pdf ? JSON.stringify([nom]) : "[]",
        dateCreation: nowIso(), seanceId: null, sequenceId: seq.id,
      });
    }
    reloadMat();
  };

  // Photo prise depuis le téléphone → matériel image de la séquence.
  const photoVersMateriel = async (nom: string) => {
    await api.materielSave({
      id: newId(), titre: "Photo " + new Date().toLocaleDateString("fr-FR"), descriptionMateriel: "",
      competenceId: comp?.competenceRefId ?? "", competenceTitre: comp?.competenceTitre ?? "",
      domaineTitre: comp?.domaineTitre ?? seq.matiere ?? "", sousDomaineTitre: comp?.sousDomaineTitre ?? "",
      cycle: seq.cycle, imagesJson: JSON.stringify([nom]), pdfsJson: "[]",
      dateCreation: nowIso(), seanceId: null, sequenceId: seq.id,
    });
    reloadMat();
  };

  const matChip = (m: MaterielItem) => {
    let pdf = false; try { pdf = (JSON.parse(m.pdfsJson || "[]") as string[]).length > 0; } catch { /* ignore */ }
    return (
      <span key={m.id} className="chip" draggable title="Glisser vers une séance"
        onDragStart={(e) => e.dataTransfer.setData("text/materiel", m.id)} style={{ cursor: "grab" }}>
        {pdf ? "📄" : "📷"} {m.titre}
      </span>
    );
  };

  return (
    <Page titre={seq.titre} sous={[seq.matiere, seq.cycle, `Période ${seq.periode}`, seq.annee].filter(Boolean).join(" · ")}
      actions={<>
        <button className="btn" onClick={() => nav("/sequences")}>← Retour</button>
        <button className="btn" onClick={() => imprimerSequence(seq, seances ?? [])}>🖨 Imprimer / PDF</button>
        <button className="btn" onClick={() => exporterSequence(seq, seances ?? [])}>⬇️ Exporter</button>
        <button className="btn primary" onClick={() => setEdit(nouvelleSeance(seq.id, next))}>+ Séance</button>
      </>}>
      <div className="card" style={{ marginBottom: 18, borderTop: `3px solid ${couleurHex[seq.couleur]}` }}>
        {seq.imageNom && <FichierImg nom={seq.imageNom} style={{ width: "100%", maxHeight: 200, objectFit: "cover", marginBottom: 12 }} />}
        {comp && <div style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 8 }}>🎯 {labelCourt(comp)}</div>}
        {seq.objectifs && <p style={{ marginTop: 0, color: "var(--text-2)" }}>{seq.objectifs}</p>}
        {seq.video && <VideoSequence video={seq.video} />}
        <div className="row" style={{ marginTop: 6 }}>
          <RatingLine label="Engagement des élèves" value={seq.ratingEngagement} onChange={(v) => setRating("ratingEngagement", v)} />
          <RatingLine label="Facilité de mise en œuvre" value={seq.ratingFacilite} onChange={(v) => setRating("ratingFacilite", v)} />
          <RatingLine label="Apprentissage réel" value={seq.ratingApprentissage} onChange={(v) => setRating("ratingApprentissage", v)} />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18, borderStyle: "dashed" }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const mid = e.dataTransfer.getData("text/materiel");
          if (mid) { assignerMat(mid, null); return; }
          if (e.dataTransfer.files?.length) deposerFichiers(e.dataTransfer.files);
        }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: matsSeq.length ? 8 : 0 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>📎 Matériel de la séquence</h3>
          <span className="meta" style={{ flex: 1 }}>Glissez ici vos PDF / images — puis sur une séance.</span>
          <PhotoTelephone onPhoto={photoVersMateriel} />
        </div>
        {matsSeq.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{matsSeq.map(matChip)}</div>}
      </div>

      <h3 style={{ margin: "4px 2px 12px" }}>Séances</h3>
      {(seances?.length ?? 0) === 0 ? (
        <Empty icone="📝" titre="Aucune séance" sous="Ajoutez la première séance de cette séquence." />
      ) : (
        seances!.map((s) => {
          let comps: CompetenceSelectionnee[] = [];
          try { comps = s.competences ? JSON.parse(s.competences) : []; } catch { /* ignore */ }
          return (
            <div key={s.id} className="list-row"
              onDragOver={(e) => { if (e.dataTransfer.types.includes("text/materiel")) e.preventDefault(); }}
              onDrop={(e) => { const mid = e.dataTransfer.getData("text/materiel"); if (mid) { e.preventDefault(); assignerMat(mid, s.id); } }}
              onContextMenu={(e) => openCtx(e, [
                { label: "Voir", icon: "👁", onClick: () => setVoir(s) },
                { label: "Modifier", icon: "✏️", onClick: () => setEdit(s) },
                { label: "Monter", icon: "⬆️", sep: true, onClick: () => deplacer(s, -1) },
                { label: "Descendre", icon: "⬇️", onClick: () => deplacer(s, 1) },
                { label: "Dupliquer la séance", icon: "📑", onClick: () => dupliquerSeance(s) },
                { label: "Supprimer", icon: "🗑", danger: true, sep: true, onClick: () => setDel(s) },
              ])}>
              <span className="badge">{s.numero}</span>
              <div style={{ flex: 1 }}>
                <div className="title">{s.titre || "Séance sans titre"}</div>
                <div className="meta">{formatDuree(s.duree)}{s.date ? " · " + new Date(s.date).toLocaleDateString("fr-FR") : ""}{comps.length ? ` · ${comps.length} compétence(s)` : ""}</div>
                {matsDeSeance(s.id).length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>{matsDeSeance(s.id).map(matChip)}</div>
                )}
              </div>
              {s.deroulement && <span className="chip">📋 déroulement</span>}
              {s.bilan && <span className="chip">✅ bilan</span>}
              <button className="btn ghost sm" onClick={() => setVoir(s)}>Voir</button>
              <button className="btn ghost sm" onClick={() => setEdit(s)}>Modifier</button>
              <button className="btn ghost sm" onClick={() => setDel(s)} aria-label="Supprimer">🗑</button>
            </div>
          );
        })
      )}

      {voir && <SeanceReadView seance={voir} onClose={() => setVoir(null)} onEdit={() => { setEdit(voir); setVoir(null); }} />}
      {edit && <SeanceForm seance={edit} cycle={seq.cycle} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
      {del && <Confirm message={`Supprimer la séance « ${del.titre || del.numero} » ?`}
        onYes={() => api.seanceDelete(del.id).then(reload)} onClose={() => setDel(null)} />}
    </Page>
  );
}

// ── Impression / PDF d'une fiche séquence ──────────────────────────────────
// Export JSON d'une séquence + ses séances (réimportable via la liste).
async function exporterSequence(seq: Sequence, seances: Seance[]) {
  const bundle = { version: 4, type: "sequence", dateExport: nowIso(), appVersion: "tauri", sequence: seq, seances };
  const slug = (seq.titre || "sequence").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "sequence";
  await telechargerTexte(`sequence-${slug}.json`, JSON.stringify(bundle, null, 2));
}

async function imprimerSequence(seq: Sequence, seances: Seance[]) {
  // Collecte tous les fichiers image référencés, les lit en data URL.
  const noms = new Set<string>();
  const refImg = (txt: string) => { const re = /\[img:([^\]]+)\]/g; let m; while ((m = re.exec(txt))) noms.add(m[1]); };
  for (const s of seances) {
    refImg(s.deroulement);
    try { (JSON.parse(s.imagesDeroulement || "[]") as string[]).forEach((f) => noms.add(f)); } catch { /* ignore */ }
    try { (JSON.parse(s.tableauDeroulement || "[]") as string[][]).forEach((row) => row.forEach(refImg)); } catch { /* ignore */ }
  }
  // Pièces jointes images par séance.
  const pjParSeance: Record<string, string[]> = {};
  for (const s of seances) {
    const pjs = await api.piecesJointesList(s.id);
    pjParSeance[s.id] = pjs.filter((p) => p.type === "image").map((p) => p.nomFichier);
    pjs.forEach((p) => { if (p.type === "image") noms.add(p.nomFichier); });
  }
  const dataUrls: Record<string, string> = {};
  await Promise.all([...noms].map(async (n) => {
    try { dataUrls[n] = `data:image;base64,${await api.fichierRead(n)}`; } catch { /* ignore */ }
  }));

  const rendreTexte = (txt: string) => {
    const re = /\[(img|cite):([^\]]+)\]/g;
    let out = "", last = 0, m: RegExpExecArray | null;
    while ((m = re.exec(txt))) {
      out += escapeHtml(txt.slice(last, m.index));
      if (m[1] === "img" && dataUrls[m[2]]) out += `<img alt="" src="">`;
      else if (m[1] === "cite") {
        try { const c = JSON.parse(decodeURIComponent(escape(atob(m[2])))); out += `<blockquote>« ${escapeHtml(c.texte)} »${c.source || c.page ? `<div style="font-size:11px;color:#687087">— ${escapeHtml(c.source)}${c.page ? ", p. " + escapeHtml(c.page) : ""}</div>` : ""}</blockquote>`; } catch { /* ignore */ }
      }
      last = m.index + m[0].length;
    }
    out += escapeHtml(txt.slice(last));
    return `<div class="pre">${out}</div>`;
  };

  let comp = "";
  try { const c = seq.competenceVisee ? JSON.parse(seq.competenceVisee) : null; if (c) comp = labelCourt(c); } catch { /* ignore */ }

  const seancesHtml = seances.map((s) => {
    let comps: CompetenceSelectionnee[] = [];
    try { comps = s.competences ? JSON.parse(s.competences) : []; } catch { /* ignore */ }
    let grid: string[][] = [];
    try { grid = JSON.parse(s.tableauDeroulement || "[]"); } catch { /* ignore */ }
    const illus = (() => { try { return JSON.parse(s.imagesDeroulement || "[]") as string[]; } catch { return []; } })();
    const pj = pjParSeance[s.id] ?? [];
    return `<div class="seance">
      <h3>Séance ${s.numero} — ${escapeHtml(s.titre)}</h3>
      <div class="meta">${formatDuree(s.duree)}${s.date ? " · " + new Date(s.date).toLocaleDateString("fr-FR") : ""}</div>
      ${s.objectifs ? `<div class="label">Objectifs</div><div class="pre">${escapeHtml(s.objectifs)}</div>` : ""}
      ${comps.length ? `<div class="label">Compétences</div>${comps.map((c) => `<span class="chip">${escapeHtml(labelCourt(c))}</span>`).join("")}` : ""}
      ${s.deroulement ? `<div class="label">Déroulement</div>${rendreTexte(s.deroulement)}` : ""}
      ${grid.length ? `<table>${grid.map((row, r) => `<tr>${row.map((c) => r === 0 ? `<th>${escapeHtml(c)}</th>` : `<td>${rendreTexte(c)}</td>`).join("")}</tr>`).join("")}</table>` : ""}
      ${illus.map((f) => dataUrls[f] ? `<img alt="" src="">` : "").join("")}
      ${s.materiel ? `<div class="label">Matériel</div><div class="pre">${escapeHtml(s.materiel)}</div>` : ""}
      ${pj.map((f) => dataUrls[f] ? `<img alt="" src="">` : "").join("")}
      ${s.bilan ? `<div class="label">Bilan</div><div class="pre">${escapeHtml(s.bilan)}</div>` : ""}
    </div>`;
  }).join("");

  const html = `
    <h1>${escapeHtml(seq.titre)}</h1>
    <div class="meta">${[seq.matiere, seq.cycle, "Période " + seq.periode, seq.annee].filter(Boolean).map(escapeHtml).join(" · ")}</div>
    ${comp ? `<div class="chip">🎯 ${escapeHtml(comp)}</div>` : ""}
    ${seq.objectifs ? `<div class="label">Objectifs / notes</div><div class="pre">${escapeHtml(seq.objectifs)}</div>` : ""}
    <h2>Séances (${seances.length})</h2>
    ${seancesHtml || "<div class='meta'>Aucune séance.</div>"}`;
  printHTML(seq.titre || "Séquence", html);
}

// Vidéo explicative : YouTube (iframe), lien direct, ou fichier importé.
function VideoSequence({ video }: { video: string }) {
  const [src, setSrc] = React.useState("");
  const estUrl = video.startsWith("http");
  React.useEffect(() => {
    if (estUrl) return;
    let u = ""; fichierToBlobUrl(video, "video/mp4").then((x) => { u = x; setSrc(x); });
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [video, estUrl]);

  const yt = video.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
  const style: React.CSSProperties = { width: "100%", maxWidth: 560, borderRadius: 10, marginTop: 4 };

  if (yt) return <div style={{ marginTop: 8 }}><iframe style={{ ...style, aspectRatio: "16/9", border: "none" }}
    src={`https://www.youtube.com/embed/${yt[1]}`} title="Vidéo" allowFullScreen /></div>;
  if (estUrl) return <div style={{ marginTop: 8 }}><video style={style} src={video} controls /></div>;
  return <div style={{ marginTop: 8 }}>{src ? <video style={style} src={src} controls /> : <div style={{ color: "var(--text-2)" }}>Chargement de la vidéo…</div>}</div>;
}

function RatingLine({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 3 }}>{label}</div>
      <Stars value={value} onChange={onChange} />
    </div>
  );
}

function Card({ titre, children, right }: { titre: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: ".4px", color: "var(--text-2)" }}>{titre}</div>
        <div className="spacer" />{right}
      </div>
      {children}
    </div>
  );
}

function SeanceForm({ seance, cycle = "", onClose, onSaved }: { seance: Seance; cycle?: string; onClose: () => void; onSaved: () => void }) {
  const [s, setS] = React.useState<Seance>(seance);
  const up = (p: Partial<Seance>) => setS((cur) => ({ ...cur, ...p }));
  const [dateActive, setDateActive] = React.useState(!!seance.date);
  // Dernière position du curseur dans le déroulement (pour insérer une image au bon endroit).
  const curseurDer = React.useRef<number | null>(null);
  // Insère le marqueur [img:nom] à la position du curseur (ou à la fin).
  const insererImage = (nom: string) => {
    const t = s.deroulement;
    const pos = curseurDer.current ?? t.length;
    const next = (t.slice(0, pos).trimEnd() + `\n[img:${nom}]\n` + t.slice(pos).trimStart()).replace(/^\n/, "");
    up({ deroulement: next });
  };

  let comps: CompetenceSelectionnee[] = [];
  try { comps = s.competences ? JSON.parse(s.competences) : []; } catch { /* ignore */ }
  let grid: string[][] = [];
  try { grid = JSON.parse(s.tableauDeroulement || "[]"); } catch { /* ignore */ }
  let illustrations: string[] = [];
  try { illustrations = JSON.parse(s.imagesDeroulement || "[]"); } catch { /* ignore */ }

  const setComps = (next: CompetenceSelectionnee[]) => up({ competences: JSON.stringify(next) });
  const toggleComp = (c: CompetenceSelectionnee) => {
    const exists = comps.find((x) => x.competenceRefId === c.competenceRefId && x.sousDomaineTitre === c.sousDomaineTitre);
    setComps(exists ? comps.filter((x) => x !== exists) : [...comps, c]);
  };

  const save = async () => {
    const bilanDate = s.bilan && s.bilan !== seance.bilan ? nowIso() : s.bilanDate;
    await api.seanceSave({ ...s, date: dateActive ? (s.date ?? nowIso()) : null, bilanDate });
    onSaved();
  };

  return (
    <Modal large titre={`Séance ${s.numero}`} onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" onClick={save} disabled={!s.titre.trim()}>Enregistrer</button>
      </>}>
      <Card titre="Informations">
        <div className="row">
          <Field label="Titre"><Input value={s.titre} autoFocus onChange={(e) => up({ titre: e.target.value })} /></Field>
          <Field label="Durée">
            <Select value={s.duree} onChange={(e) => up({ duree: +e.target.value })} style={{ maxWidth: 130 }}>
              {DUREES.map((d) => <option key={d} value={d}>{formatDuree(d)}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Date prévue">
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input type="checkbox" checked={dateActive} onChange={(e) => setDateActive(e.target.checked)} />
            {dateActive ? <Input type="date" value={(s.date ?? nowIso()).slice(0, 10)} onChange={(e) => up({ date: e.target.value })} style={{ maxWidth: 180 }} />
              : <span style={{ color: "var(--text-2)" }}>Non définie</span>}
          </div>
        </Field>
      </Card>

      <Card titre="Objectifs">
        <Textarea value={s.objectifs} onChange={(e) => up({ objectifs: e.target.value })} placeholder="Ce que les élèves doivent apprendre…" />
      </Card>

      <Card titre="Compétences">
        {comps.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {comps.map((c, i) => (
              <span key={i} className="chip" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                {labelCourt(c)} <button className="btn ghost sm" style={{ padding: 0, marginLeft: 4 }} onClick={() => toggleComp(c)} aria-label="Retirer">✕</button>
              </span>
            ))}
          </div>
        )}
        <CompetenceTree mode="multi" selection={comps} onToggle={(c) => toggleComp(c)} />
      </Card>

      <Card titre="Déroulement">
        <Textarea style={{ minHeight: 130 }} value={s.deroulement} onChange={(e) => up({ deroulement: e.target.value })}
          onSelect={(e) => { curseurDer.current = e.currentTarget.selectionStart; }}
          onKeyUp={(e) => { curseurDer.current = e.currentTarget.selectionStart; }}
          onClick={(e) => { curseurDer.current = e.currentTarget.selectionStart; }}
          placeholder="Phases de la séance, consignes, organisation… (collez une image directement)"
          onPaste={async (e) => {
            const file = imageDuPresse(e);
            if (!file) return;
            e.preventDefault();
            const el = e.currentTarget; const pos = el.selectionStart ?? s.deroulement.length;
            const nom = await api.fichierSave(file.name || "image.png", await fileToBase64(file));
            const t = s.deroulement;
            const next = (t.slice(0, pos).trimEnd() + `\n[img:${nom}]\n` + t.slice(pos).trimStart()).replace(/^\n/, "");
            up({ deroulement: next, imagesDeroulement: JSON.stringify([...illustrations, nom]) });
          }} />
        <div style={{ marginTop: 8 }}>
          <CitationButton onInsert={(mq) => up({ deroulement: (s.deroulement.trimEnd() + "\n" + mq + "\n").trimStart() })} />
        </div>
        <div style={{ marginTop: 12 }}>
          <TableauEditor grid={grid} illustrations={illustrations} onChange={(g) => up({ tableauDeroulement: JSON.stringify(g) })} />
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 650, color: "var(--text-2)", marginBottom: 4 }}>Illustrations (insérables au fil du texte)</div>
          <IllustrationsEditor texte={s.deroulement} fichiers={illustrations}
            onChange={(f) => up({ imagesDeroulement: JSON.stringify(f) })}
            onInsert={insererImage} />
        </div>
      </Card>

      <Card titre="Notes matériel">
        <Textarea value={s.materiel} onChange={(e) => up({ materiel: e.target.value })} placeholder="Matériel nécessaire…" />
      </Card>

      <Card titre="Matériel pédagogique (PDF)">
        <MaterielSeance seanceId={s.id} cycle={cycle} />
      </Card>

      <Card titre="Bilan (après la séance)">
        <Textarea value={s.bilan} onChange={(e) => up({ bilan: e.target.value })} placeholder="Ce qui a marché, à reprendre, pour la prochaine fois…" />
      </Card>
    </Modal>
  );
}

// ── Vue lecture d'une séance ───────────────────────────────────────────────
export function SeanceReadView({ seance: s, onClose, onEdit }: { seance: Seance; onClose: () => void; onEdit: () => void }) {
  let comps: CompetenceSelectionnee[] = [];
  try { comps = s.competences ? JSON.parse(s.competences) : []; } catch { /* ignore */ }
  let grid: string[][] = [];
  try { grid = JSON.parse(s.tableauDeroulement || "[]"); } catch { /* ignore */ }
  const { data: materiels } = useAsync(() => api.materielList().then((all) => all.filter((m) => m.seanceId === s.id)), [s.id]);

  const Section = ({ titre, children }: { titre: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px", color: "var(--text-2)", marginBottom: 6 }}>{titre}</div>
      {children}
    </div>
  );

  return (
    <Modal large titre={`Séance ${s.numero} — ${s.titre}`} onClose={onClose}
      footer={<><div className="spacer" /><button className="btn" onClick={onClose}>Fermer</button><button className="btn primary" onClick={onEdit}>Modifier</button></>}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <span className="chip">{formatDuree(s.duree)}</span>
        {s.date && <span className="chip">{new Date(s.date).toLocaleDateString("fr-FR")}</span>}
      </div>
      {s.objectifs && <Section titre="Objectifs"><div style={{ whiteSpace: "pre-wrap" }}>{s.objectifs}</div></Section>}
      {comps.length > 0 && <Section titre="Compétences">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {comps.map((c, i) => <span key={i} className="chip" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>{labelCourt(c)}</span>)}
        </div>
      </Section>}
      {s.deroulement && <Section titre="Déroulement"><DeroulementRead texte={s.deroulement} /></Section>}
      {grid.length > 0 && <Section titre="Tableau">
        <div style={{ overflowX: "auto" }}>
          <table className="tbl" style={{ tableLayout: "fixed", width: "100%" }}>
            <colgroup>{grid[0]?.map((_, c) => <col key={c} style={{ width: `${100 / grid[0].length}%` }} />)}</colgroup>
            <tbody>{grid.map((row, r) => <tr key={r} style={r === 0 ? { fontWeight: 700, background: "var(--panel-2)" } : undefined}>
              {row.map((cell, c) => <td key={c} style={{ verticalAlign: "top" }}>{r === 0 ? cell : <CelluleContenu texte={cell} />}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </Section>}
      {s.materiel && <Section titre="Matériel"><div style={{ whiteSpace: "pre-wrap" }}>{s.materiel}</div></Section>}
      {(materiels?.length ?? 0) > 0 && <Section titre="Matériel pédagogique (PDF)">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {materiels!.map((m) => <span key={m.id} className="chip">📄 {m.titre}</span>)}
        </div>
      </Section>}
      {s.bilan && <Section titre="Bilan"><div style={{ whiteSpace: "pre-wrap" }}>{s.bilan}</div></Section>}
    </Modal>
  );
}
