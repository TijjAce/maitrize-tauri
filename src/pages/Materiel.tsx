import React from "react";
import { Page } from "../App";
import { api, MaterielItem, Referentiel, CYCLES, newId, nowIso, couleurPourMatiere, couleurHex } from "../api";
import { Modal, Field, Input, Textarea, Select, Empty, Confirm, useAsync } from "../components/ui";
import { CompetenceTree, CompetenceSelectionnee, labelCourt } from "../components/CompetenceTree";
import { FileListEditor } from "../components/SeanceParts";
import { openCtx } from "../components/ctxmenu";
import { openUrl } from "@tauri-apps/plugin-opener";
import { lireVideos, lireLien, vignetteYoutube, integrationYoutube, nomVideo, Video } from "../videos";

const nouveau = (): MaterielItem => ({
  id: newId(), titre: "", descriptionMateriel: "", competenceId: "", competenceTitre: "",
  domaineTitre: "", sousDomaineTitre: "", cycle: "", imagesJson: "[]", pdfsJson: "[]", dateCreation: nowIso(), seanceId: null, sequenceId: null,
  dossier: "", videosJson: "[]", coffreJson: "[]",
});

export default function Materiel() {
  const { data: items, reload } = useAsync(() => api.materielList(), []);
  const [edit, setEdit] = React.useState<MaterielItem | null>(null);
  const [del, setDel] = React.useState<MaterielItem | null>(null);
  const [choixPdf, setChoixPdf] = React.useState<MaterielItem | null>(null);
  const [q, setQ] = React.useState("");
  const [dossier, setDossier] = React.useState("");
  const [ouverts, setOuverts] = React.useState<Record<string, boolean>>({});
  const toggle = (k: string) => setOuverts((s) => ({ ...s, [k]: !s[k] }));

  // macOS : ouvre le PDF dans Aperçu (app native) plutôt que dans l'app.
  const ouvrirPdfs = (m: MaterielItem) => {
    const noms = liste(m.pdfsJson);
    if (noms.length === 1) api.ouvrirFichier(noms[0]);
    else if (noms.length > 1) setChoixPdf(m);
  };

  // Les dossiers rangent le matériel comme les ateliers et les jeux : une
  // étiquette libre, pas une arborescence à entretenir.
  const dossiers = Array.from(new Set((items ?? []).map((m) => m.dossier).filter(Boolean))).sort();
  const filtres = (items ?? [])
    .filter((m) => !dossier || m.dossier === dossier)
    .filter((m) => !q || m.titre.toLowerCase().includes(q.toLowerCase()));

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
        {m.dossier && <span className="chip" title="Dossier">📁 {m.dossier}</span>}
        {nb(m.coffreJson) > 0 && <span className="chip" title="Documents du coffre-fort rattachés">🔐 {nb(m.coffreJson)}</span>}
      </div>
      <Vignettes videos={lireVideos(m.videosJson)} />
      {m.competenceTitre && <div style={{ fontSize: 12.5, color: "var(--accent)", marginTop: 6 }}>🎯 {m.competenceTitre}</div>}
      {m.descriptionMateriel && <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 8 }}>{m.descriptionMateriel.slice(0, 120)}</div>}
    </div>
  );

  return (
    <Page titre="Matériel" sous="Ressources et matériel pédagogique"
      actions={<button className="btn primary" onClick={() => setEdit(nouveau())}>+ Matériel</button>}>
      <div className="toolbar">
        <Input className="search" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
        {dossiers.length > 0 && (
          <Select value={dossier} onChange={(e) => setDossier(e.target.value)} style={{ maxWidth: 200 }}
            title="Ne montrer qu'un dossier">
            <option value="">Tous les dossiers</option>
            {dossiers.map((d) => <option key={d} value={d}>📁 {d}</option>)}
          </Select>
        )}
      </div>
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
      {edit && <FormMateriel m={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
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

/**
 * Fiche d'édition d'un matériel.
 *
 * Exportée parce que le plan de travail l'ouvre directement : depuis qu'il n'y
 * a plus d'onglet Matériel, un double-clic doit éditer sur place plutôt que
 * renvoyer vers un écran disparu.
 */
export function FormMateriel({ m, onClose, onSaved }: { m: MaterielItem; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = React.useState<MaterielItem>(m);
  // Les dossiers déjà employés sont proposés à la saisie : sans cela, on écrit
  // « Lecture » puis « lecture » et le rangement se dédouble.
  const { data: tous } = useAsync(() => api.materielList(), []);
  const dossiersConnus = Array.from(new Set((tous ?? []).map((x) => x.dossier).filter(Boolean))).sort();
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
      <Field label="Dossier">
        <Input list="dossiers-materiel" placeholder="Lecture, Manipulation, Rituels…"
          value={v.dossier} onChange={(e) => up({ dossier: e.target.value })} />
        <datalist id="dossiers-materiel">
          {dossiersConnus.map((d) => <option key={d} value={d} />)}
        </datalist>
      </Field>
      <Field label="Vidéos">
        <EditeurVideos videos={lireVideos(v.videosJson)}
          onChange={(vids) => up({ videosJson: JSON.stringify(vids) })} />
      </Field>
      <Field label="Documents du coffre-fort">
        <LienCoffre ids={liste(v.coffreJson)}
          onChange={(ids) => up({ coffreJson: JSON.stringify(ids) })} />
      </Field>
    </Modal>
  );
}


// ── Vidéos ─────────────────────────────────────────────────────────────────
//
// Les vignettes viennent de YouTube et demandent donc le réseau. Hors ligne,
// la case affiche le nom plutôt qu'un cadre cassé : le lien reste utilisable,
// c'est lui qui compte.

function Vignettes({ videos }: { videos: Video[] }) {
  const [lecture, setLecture] = React.useState<Video | null>(null);
  if (!videos.length) return null;
  return (
    <>
      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
        {videos.map((v, i) => (
          <button key={i} onClick={() => setLecture(v)} title={nomVideo(v)}
            style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 0, cursor: "pointer",
              background: "var(--panel-2)", width: 104, overflow: "hidden", textAlign: "left" }}>
            {v.youtubeId ? (
              <img src={vignetteYoutube(v.youtubeId)} alt="" loading="lazy"
                style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <div style={{ width: "100%", aspectRatio: "16/9", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 20 }}>🎬</div>
            )}
            <div style={{ fontSize: 10.5, padding: "3px 5px", color: "var(--text-2)",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {nomVideo(v)}
            </div>
          </button>
        ))}
      </div>
      {lecture && (
        <Modal titre={nomVideo(lecture)} onClose={() => setLecture(null)} large
          footer={<>
            <button className="btn" onClick={() => openUrl(lecture.url).catch(() => window.open(lecture.url, "_blank"))}>
              ↗ Ouvrir dans le navigateur
            </button>
            <button className="btn primary" onClick={() => setLecture(null)}>Fermer</button>
          </>}>
          {lecture.youtubeId ? (
            <iframe src={integrationYoutube(lecture.youtubeId)} title="Vidéo" allowFullScreen
              style={{ width: "100%", aspectRatio: "16/9", border: "none", borderRadius: 8 }} />
          ) : (
            <p style={{ fontSize: 13, wordBreak: "break-all" }}>{lecture.url}</p>
          )}
        </Modal>
      )}
    </>
  );
}

/**
 * Ajout de liens vidéo : collés, ou déposés depuis le navigateur.
 *
 * Un lien qui n'en est pas un est refusé plutôt qu'ajouté : une ligne vide
 * dans la liste devrait ensuite être retrouvée et supprimée.
 */
function EditeurVideos({ videos, onChange }: { videos: Video[]; onChange: (v: Video[]) => void }) {
  const [saisie, setSaisie] = React.useState("");
  const [erreur, setErreur] = React.useState("");

  const ajouter = (texte: string) => {
    const v = lireLien(texte);
    if (!v) { setErreur("Ce n'est pas une adresse web (elle doit commencer par http)."); return; }
    if (videos.some((x) => x.url === v.url)) { setErreur("Cette vidéo est déjà dans la liste."); return; }
    onChange([...videos, v]); setSaisie(""); setErreur("");
  };

  return (
    <div
      onDrop={(e) => { e.preventDefault(); ajouter(e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain")); }}
      onDragOver={(e) => e.preventDefault()}
      style={{ border: "1px dashed var(--border)", borderRadius: 8, padding: 8 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <Input placeholder="Coller un lien YouTube, ou le déposer ici…" value={saisie}
          onChange={(e) => { setSaisie(e.target.value); setErreur(""); }}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), ajouter(saisie))} />
        <button className="btn" style={{ flex: "none" }} onClick={() => ajouter(saisie)}>Ajouter</button>
      </div>
      {erreur && <div style={{ fontSize: 12, color: "var(--danger, #b03030)", marginTop: 5 }}>{erreur}</div>}
      {videos.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {videos.map((v, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0",
              borderTop: "1px solid var(--border)", fontSize: 13 }}>
              <span style={{ fontSize: 15 }}>{v.youtubeId ? "▶️" : "🎬"}</span>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {nomVideo(v)}
              </span>
              <button className="btn ghost sm" aria-label="Retirer"
                onClick={() => onChange(videos.filter((_, j) => j !== i))}>🗑</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Rattache des documents du coffre-fort à un matériel. */
function LienCoffre({ ids, onChange }: { ids: string[]; onChange: (v: string[]) => void }) {
  const { data: docs } = useAsync(() => api.coffreList(), []);
  const tous = docs ?? [];
  const basculer = (id: string) =>
    onChange(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);

  if (!tous.length) {
    return (
      <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0 }}>
        Le coffre-fort est vide. Déposez-y des documents depuis Ressources → Coffre.
      </p>
    );
  }
  return (
    <div style={{ maxHeight: 160, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
      {tous.map((d) => (
        <label key={d.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "5px 8px",
          fontSize: 13, cursor: "pointer", background: ids.includes(d.id) ? "var(--panel-2)" : undefined }}>
          <input type="checkbox" checked={ids.includes(d.id)} onChange={() => basculer(d.id)} />
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>🔐 {d.nom}</span>
        </label>
      ))}
    </div>
  );
}
